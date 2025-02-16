/**
 * @file JSLAB library geometry Space Search submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */

/**
 * Class for N-dimensional Space Search.
 */
class PRDC_JSLAB_GEOMETRY_SPACE_SERACH {
  
  /**
   * Displays the size of elements based on bounds and subdivisions.
   * @param {Array} bounds - Array of [min, max] for each dimension.
   * @param {Array} subdivisionPerDepth - Subdivision factors per depth and dimension.
   */
  dispElementSize(bounds, subdivisionPerDepth) {
    var numDimensions = bounds.length;
    // Calculate the initial differences between bounds for each dimension
    var dq = bounds.map((bound, index) => (bound[1] - bound[0]) / subdivisionPerDepth[0][index]);
    
    // Copy dq to dqmin for further subdivision calculations
    var dqmin = [...dq];

    // Iterate through subdivisionPerDepth starting from the second depth level
    for(var i = 1; i < subdivisionPerDepth.length; i++) {
      for(var j = 0; j < numDimensions; j++) {
        dqmin[j] /= subdivisionPerDepth[i][j];
      }
    }

    // Display the results for initial and minimal element dimensions
    disp(` Dimenzije inicijalnih elemenata: ${dq.map(val => val.toFixed(2)).join('x')}`);
    disp(` Dimenzije najmanjih elemenata: ${dqmin.map(val => val.toFixed(2)).join('x')}`);
  }
  
  /**
   * Splits the search space into smaller intervals for parallel processing.
   * @param {Array.<Array.<number>>} x_lim - The limits of the search space, where each sub-array represents [start, end] for a dimension.
   * @param {Array.<Array.<number>>} k - The parameters to optimize.
   * @param {number} N_proc - The number of processors to divide the work among.
   * @returns {Array.<Array.<number>>} An array containing the split search spaces and the adjusted parameters.
   */
  splitSearchSpace(x_lim, k, N_proc) {
    const [start, end] = x_lim[0];
    const interval = (end - start) / N_proc;
    
    var k_out = [...k];
    k_out[0][0] = k_out[0][0]/N_proc;
      
    return [Array.from({ length: N_proc }, (_, i) => [
      [start + i * interval, start + (i + 1) * interval],
      ...x_lim.slice(1)
    ]), k_out];
  }
  
  /**
   * Executes a provided function in parallel across the split search spaces.
   * @param {Array.<Array.<number>>} x_lim - The limits of the search space, where each sub-array represents [start, end] for a dimension.
   * @param {Array.<Array.<number>>} k - The parameters to optimize.
   * @param {Object} context - The execution context containing necessary configurations and states.
   * @param {Function} setup - The setup function to initialize the parallel environment.
   * @param {Function} fun - The function to execute in parallel on each split of the search space.
   * @returns {Promise<Array.<Array.<number>>>} A promise that resolves to arrays of input and output results from the parallel execution.
   */
  async runParallel(x_lim, k, context, setup, fun) {
    var N_proc = parallel.getProcessorsNum();
    
    var funStr = fun.toString();
    var funBody = funStr.slice(funStr.indexOf("{") + 1, funStr.lastIndexOf("}"));
    var funArgs = funStr.slice(funStr.indexOf("(") + 1, funStr.indexOf(")"));
    
    var [x_lim_parallel, k_parallel] = this.splitSearchSpace(x_lim, k, N_proc);
    
    var res = await parallel.parfor(0, N_proc-1, 1, N_proc, 
        Object.assign(context, {x_lim_parallel, k_parallel, 
        funArgs, funBody}), setup, function(i) {
      var new_fun = new Function(funArgs, funBody);
      return crawler.run(x_lim_parallel[i], k_parallel, new_fun);
    });
    var Nin = res.map(pair => pair[0]).flat();
    var Nout = res.map(pair => pair[1]).flat();
    return [Nin, Nout];
  }
  
  /**
   * Executes the space search algorithm.
   * @param {number[][]} bounds - Array of [min, max] for each dimension.
   * @param {number[][]} subdivisionPerDepth - Subdivision factors for each depth and dimension.
   * @param {function} conditionFunction - Function that determines if a point satisfies the condition.
   * @returns {Array<Array<number>>} - Arrays of points inside and outside the condition.
   */
  run(bounds, subdivisionPerDepth, conditionFunction) {
    var numDimensions = bounds.length;
    var maxDepth = subdivisionPerDepth.length;

    // Initial starting point
    var startCoordinates = bounds.map(([min]) => min);
    
    // Calculate initial step sizes (dq)
    var initialStepSizes = bounds.map(
      ([min, max], idx) => (max - min) / subdivisionPerDepth[0][idx]
    );
    
    // Generate step sizes for each depth
    var stepSizesPerDepth = [initialStepSizes];
    for(var depth = 1; depth < maxDepth; depth++) {
      var previousStepSizes = stepSizesPerDepth[depth - 1];
      var newStepSizes = previousStepSizes.map(
        (size, idx) => size / subdivisionPerDepth[depth][idx]
      );
      stepSizesPerDepth.push(newStepSizes);
    }

    // Compute the values at the boundary points
    var cornerShifts = this.generateCornerShifts(numDimensions);
    var boundaryPoints = cornerShifts.map(shift => {
      return shift.map((s, idx) => startCoordinates[idx] + s * (bounds[idx][1] - bounds[idx][0]));
    });
    var boundaryValues = boundaryPoints.map(point => (conditionFunction(point) ? 1 : 0));
    
    // Call makeNodesND
    var [Nin, Nout] = this.makeNodesND(
      startCoordinates,
      boundaryValues,
      0,
      stepSizesPerDepth,
      subdivisionPerDepth,
      conditionFunction
    );

    return [Nin, Nout];
  }

  /**
   * Recursively creates nodes in N dimensions based on subdivisions.
   * @param {number[]} startCoordinates - Starting coordinates for the current grid.
   * @param {number[]} boundaryValues - Values at the boundary points of the current hypercube.
   * @param {number} currentDepth - Current depth of the recursion.
   * @param {number[][]} stepSizesPerDepth - Step sizes for each depth.
   * @param {number[][]} subdivisionPerDepth - Subdivision factors for each depth.
   * @param {function} conditionFunction - User-defined condition function.
   * @returns {Array<Array<number>>} - Arrays of points inside and outside the condition.
   */
  makeNodesND(
    startCoordinates,
    boundaryValues,
    currentDepth,
    stepSizesPerDepth,
    subdivisionPerDepth,
    conditionFunction
  ) {
    var numDimensions = startCoordinates.length;
    var maxDepth = subdivisionPerDepth.length; // maximum depth
    var Nin = [];
    var Nout = [];
      
    // Generate coordinate arrays for each dimension
    var stepSizes = stepSizesPerDepth[currentDepth];
    var numSteps = subdivisionPerDepth[currentDepth];
    var coordsArray = [];
    for(var idx = 0; idx < numDimensions; idx++) {
      var steps = numSteps[idx];
      var stepSize = stepSizes[idx];
      var start = startCoordinates[idx];
      var arr = Array.from(
        { length: steps + 1 },
        (_, i) => start + i * stepSize
      );
      coordsArray.push(arr);
    }

    // Initialize N-dimensional grid
    var gridShape = coordsArray.map(A => A.length);
    var N = createFilledArray(...gridShape, null);
      
    // Mark whether a node needs to be calculated
    var nf = createFilledArray(...gridShape, 1);
      
    // Set nf to 0 for corner points (boundary points)
    var cornerIndices = this.getCornerIndices(gridShape);
    cornerIndices.forEach(indices => {
      setValueAt(nf, indices, 0);
    });

    // Set the values at the corner points and add them to Nin or Nout
    cornerIndices.forEach((indices, idx) => {
      var coords = indices.map((index, dim) => coordsArray[dim][index]);
      var value = boundaryValues[idx];
      setValueAt(N, indices, [...coords, value]);

      // On first level, add corner points to Nin or Nout
      if(currentDepth == 0) {
        if(value) {
          Nin.push(coords);
        } else {
          Nout.push(coords);
        }
      }
    });

    // Now compute the values at all nodes where nf is 1
    var indicesList = this.generateIndicesList(gridShape, nf);
    for(var indices of indicesList) {
      var coords = indices.map((index, dim) => coordsArray[dim][index]);
      var e = conditionFunction(coords) ? 1 : 0;
      setValueAt(N, indices, [...coords, e]);

      if(e) {
        Nin.push(coords);
      } else {
        Nout.push(coords);
      }
    }

    // Check for further subdivision
    if(currentDepth < maxDepth - 1) {
      var innerCubeIndicesList = this.generateInnerCubeIndicesList(gridShape);
      for(var indices of innerCubeIndicesList) {
        var cubeCorners = this.getCubeCorners(N, indices);
        var boundaryValues_sub = cubeCorners.map(corner => corner[corner.length - 1]);

        var allSame = boundaryValues_sub.every(val => val === boundaryValues_sub[0]);
        if(!allSame) {
          var startCoords_sub = cubeCorners[0].slice(0, numDimensions);
          var [Nin_sub, Nout_sub] = this.makeNodesND(
            startCoords_sub,
            boundaryValues_sub,
            currentDepth + 1,
            stepSizesPerDepth,
            subdivisionPerDepth,
            conditionFunction
          );
          Nin = Nin.concat(Nin_sub);
          Nout = Nout.concat(Nout_sub);
        }
      }
    }

    return [Nin, Nout];
  }

  /**
   * Generates all corner shifts for a hypercube in N dimensions.
   * @param {number} numDimensions - Number of dimensions.
   * @returns {number[][]} - Array of shifts for each corner.
   */
  generateCornerShifts(numDimensions) {
    var shifts = [];
    var totalCorners = 1 << numDimensions;
    for(var i = 0; i < totalCorners; i++) {
      var shift = [];
      for(var j = 0; j < numDimensions; j++) {
        shift.push((i >> j) & 1);
      }
      shifts.push(shift);
    }
    return shifts;
  }

  /**
   * Retrieves the indices of corner points in the grid.
   * @param {number[]} gridShape - Shape of the grid.
   * @returns {number[][]} - List of corner indices.
   */
  getCornerIndices(gridShape) {
    var numDimensions = gridShape.length;
    var cornerShifts = this.generateCornerShifts(numDimensions);
    return cornerShifts.map(shift => shift.map((s, idx) => s * (gridShape[idx] - 1)));
  }

  /**
   * Generates a list of indices for nodes that need to be calculated.
   * @param {number[]} gridShape - Shape of the grid.
   * @param {Array} nf - N-dimensional array indicating nodes to compute.
   * @returns {number[][]} - List of node indices where nf is 1.
   */
  generateIndicesList(gridShape, nf) {
    var indicesList = [];

    var generateIndices = (indices, dim) => {
      if(dim === gridShape.length) {
        if(getValueAt(nf, indices) === 1) {
          indicesList.push([...indices]);
        }
        return;
      }
      for(var i = 0; i < gridShape[dim]; i++) {
        indices[dim] = i;
        generateIndices(indices, dim + 1);
      }
    };
    generateIndices(new Array(gridShape.length).fill(0), 0);
    return indicesList;
  }

  /**
   * Generates a list of starting indices for inner hypercubes.
   * @param {number[]} gridShape - Shape of the grid.
   * @returns {number[][]} - List of inner cube starting indices.
   */
  generateInnerCubeIndicesList(gridShape) {
    var indicesList = [];

    var generateIndices = (indices, dim) => {
      if(dim === gridShape.length) {
        indicesList.push([...indices]);
        return;
      }
      if(gridShape[dim] <= 1) {
        // No cubes along this dimension
        return;
      }
      for(var i = 0; i < gridShape[dim] - 1; i++) {
        indices[dim] = i;
        generateIndices(indices, dim + 1);
      }
    };
    generateIndices(new Array(gridShape.length).fill(0), 0);
    return indicesList;
  }

  /**
   * Retrieves the corner coordinates and values of a hypercube.
   * @param {Array} N - N-dimensional grid.
   * @param {number[]} indices - Starting indices of the hypercube.
   * @returns {Array} - Array of corner coordinates and values.
   */
  getCubeCorners(N, indices) {
    var numDimensions = indices.length;
    var cornerShifts = this.generateCornerShifts(numDimensions);
    var cubeCorners = cornerShifts.map(shift => {
      var cornerIndices = indices.map((idx, dim) => idx + shift[dim]);
      return getValueAt(N, cornerIndices);
    });
    return cubeCorners;
  }
}

exports.PRDC_JSLAB_GEOMETRY_SPACE_SERACH = PRDC_JSLAB_GEOMETRY_SPACE_SERACH;
