/**
 * @file JSLAB shared numerical WebAssembly bindings
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Creates the numerical backend from an initialized WebAssembly module.
 * @param {Object} wasm Initialized Emscripten module.
 * @returns {Object} Numerical operations.
 */
function createNativeModule(wasm) {
  var required = ['_malloc', '_free', '_nm_roots', '_nm_trapz', '_nm_cumtrapz'];
  if(!wasm || !wasm.HEAPF64 || required.some(function(name) {
    return typeof wasm[name] !== 'function';
  })) {
    throw new Error('Numerical WebAssembly module is unavailable. Run npm run build-native-wasm.');
  }

  /**
   * Validates a real numeric array without creating an intermediate copy.
   * @param {string} name Argument name.
   * @param {*} values Input array.
   * @returns {Array<number>|TypedArray} Validated input.
   */
  function numericArray(name, values) {
    if(!Array.isArray(values) && !(ArrayBuffer.isView(values) && !(values instanceof DataView))) {
      throw new TypeError(name + ' must be a numeric array.');
    }
    for(var i = 0; i < values.length; i++) {
      if(typeof values[i] !== 'number' || !Number.isFinite(values[i])) {
        throw new TypeError(name + ' must contain finite numbers.');
      }
    }
    return values;
  }

  /**
   * Allocates temporary arrays and releases every successful allocation.
   * @param {Array<number>} lengths Buffer lengths in doubles.
   * @param {Function} operation Operation receiving buffer pointers.
   * @returns {*} Operation result.
   */
  function withBuffers(lengths, operation) {
    var pointers = [];
    try {
      lengths.forEach(function(length) {
        var pointer = wasm._malloc(length * Float64Array.BYTES_PER_ELEMENT);
        if(!pointer) throw new RangeError('WebAssembly memory allocation failed.');
        pointers.push(pointer);
      });
      return operation(pointers);
    } finally {
      pointers.forEach(function(pointer) { wasm._free(pointer); });
    }
  }

  /**
   * Validates integration arguments.
   * @param {*} y Input values.
   * @param {*} x Optional coordinates.
   */
  function integrationArguments(y, x) {
    numericArray('y', y);
    if(x !== undefined) {
      numericArray('x', x);
      if(x.length !== y.length) throw new RangeError('x and y arrays must have the same length.');
    }
  }

  return {
    wasm: true,
    minDisksDistance3D: function(O1, n1, r1, O2, n2, r2) {
      [O1, n1, O2, n2].forEach(function(vector) {
        numericArray('Disk vector', vector);
        if(vector.length !== 3) throw new RangeError('Disk vectors must have three components.');
      });
      if(typeof r1 !== 'number' || !Number.isFinite(r1) || r1 < 0 ||
          typeof r2 !== 'number' || !Number.isFinite(r2) || r2 < 0) {
        throw new RangeError('Disk radii must be finite nonnegative numbers.');
      }
      if(typeof wasm._nm_min_disks_distance_3d !== 'function') {
        throw new Error('Disk distance backend is unavailable. Run npm run build-native-wasm.');
      }
      return withBuffers([14, 9], function(pointers) {
        wasm.HEAPF64.set([...O1, ...n1, r1, ...O2, ...n2, r2], pointers[0] / 8);
        var status = wasm._nm_min_disks_distance_3d(pointers[0], pointers[1]);
        if(status === 0) throw new RangeError('Invalid disk geometry; normals must be nonzero.');
        if(status !== 1) throw new Error('Disk distance did not converge within its error bound.');
        var values = Array.from(wasm.HEAPF64.subarray(pointers[1] / 8, pointers[1] / 8 + 9));
        return { L: values[0], lower_bound: values[1], P1: values.slice(2, 5),
          P2: values.slice(5, 8), iterations: values[8] };
      });
    },
    roots: function(coefficients) {
      numericArray('Coefficients', coefficients);
      var start = 0;
      while(start < coefficients.length && coefficients[start] === 0) start++;
      var count = coefficients.length - start;
      if(count < 2) return [];
      var degree = count - 1;
      return withBuffers([count, degree, degree], function(pointers) {
        for(var i = 0; i < count; i++) wasm.HEAPF64[pointers[0] / 8 + i] = coefficients[start + i];
        var returned = wasm._nm_roots(pointers[0], count, pointers[1], pointers[2]);
        if(returned !== degree) throw new Error('Polynomial root calculation did not converge.');
        var result = [];
        for(var j = 0; j < degree; j++) {
          var real = wasm.HEAPF64[pointers[1] / 8 + j];
          var imag = wasm.HEAPF64[pointers[2] / 8 + j];
          result.push(imag === 0 ? real : { real: real, imag: imag });
        }
        return result;
      });
    },
    cumtrapz: function(y, x) {
      integrationArguments(y, x);
      if(!y.length) return [];
      return withBuffers(x === undefined ? [y.length, y.length] : [y.length, y.length, x.length], function(pointers) {
        wasm.HEAPF64.set(y, pointers[0] / 8);
        if(x !== undefined) wasm.HEAPF64.set(x, pointers[2] / 8);
        var returned = wasm._nm_cumtrapz(pointers[0], y.length,
          x === undefined ? 0 : pointers[2], x === undefined ? 0 : 1, pointers[1]);
        if(returned !== y.length) throw new Error('Cumulative integration failed.');
        return Array.from(wasm.HEAPF64.subarray(pointers[1] / 8, pointers[1] / 8 + returned));
      });
    },
    trapz: function(y, x) {
      integrationArguments(y, x);
      if(y.length < 2) throw new RangeError('trapz requires at least two data points.');
      return withBuffers(x === undefined ? [y.length] : [y.length, x.length], function(pointers) {
        wasm.HEAPF64.set(y, pointers[0] / 8);
        if(x !== undefined) wasm.HEAPF64.set(x, pointers[1] / 8);
        return wasm._nm_trapz(pointers[0], y.length,
          x === undefined ? 0 : pointers[1], x === undefined ? 0 : 1);
      });
    }
  };
}

exports.createNativeModule = createNativeModule;
