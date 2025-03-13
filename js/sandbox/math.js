
/**
 * @file JSLAB library math submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB math submodule.
 */
class PRDC_JSLAB_LIB_MATH {
  
  /**
   * Constructs the math submodule, initializing mathematical constants and functions.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    
    // Additional math constants
    if(this.jsl.env.math) {
      /**
       * Pi number.
       * @type {number}
       */
      this.Pi = this.jsl.env.math.pi; 
      
      /**
       * Coefficient for converting degrees to radians.
       * @type {number}
       */
      this.d2r = this.jsl.env.math.pi/180; 
      
      /**
       * Coefficient for converting radians to degrees.
       * @type {number}
       */
      this.r2d = 1/this.d2r; 
    }
    
    /**
     * Floating-point relative accuracy
     * @type {number}
     */
    this.eps = 1E-7; 
    
    /**
     * Floating-point relative accuracy
     * @type {number}
     */
    this.EPS = this.eps; 
  }
  
  /**
   * Seeds the random number generator with the provided arguments.
   * @param {...any} args - Arguments used to seed the random generator.
   * @returns {any} The result from the seeded random generator.
   */
  seedRandom(...args) {
    return this.jsl.env.seedRandom(...args);
  }
    
  /**
   * Performs linear interpolation on a set of data points.
   * @param {Array} x The x-values of the data points.
   * @param {Array} y The y-values of the data points, corresponding to each x-value.
   * @param {Number|Array} xq The x-value(s) for which to interpolate a y-value.
   * @param {String} mode The mode of interpolation. Use 'extrap' for extrapolation.
   * @returns {Number|Array} The interpolated y-value(s) at xq.
   */
  interp(x, y, xq, mode = 'none') {
    // Helper function for scalar interpolation
    const interpolate = (xqi) => {
      // Use lastIndexOf to get the last occurrence of an exact match.
      const i = x.lastIndexOf(xqi);
      if(i >= 0) {
        return y[i];
      }

      // Find the closest points for interpolation
      let x1 = null, x2 = null;
      for(let v of x) {
        if(v < xqi && (x1 === null || v > x1)) {
          x1 = v;
        }
        if(v > xqi && (x2 === null || v < x2)) {
          x2 = v;
        }
      }

      // Handle extrapolation if mode is 'extrap'
      if(mode === 'extrap') {
        if(xqi < x[0]) {
          const gradient = (y[1] - y[0]) / (x[1] - x[0]);
          return y[0] + (xqi - x[0]) * gradient;
        } else if(xqi > x[x.length - 1]) {
          const lastIdx = x.length - 1;
          const gradient = (y[lastIdx] - y[lastIdx - 1]) / (x[lastIdx] - x[lastIdx - 1]);
          return y[lastIdx] + (xqi - x[lastIdx]) * gradient;
        }
      }

      // Interpolate between x1 and x2
      if(x1 !== null && x2 !== null && x1 !== x2) {
        // Use the last occurrence for x1 and the first occurrence for x2
        const idx1 = x.lastIndexOf(x1);
        const idx2 = x.indexOf(x2);
        const y1 = y[idx1];
        const y2 = y[idx2];
        return y1 + (xqi - x1) * (y2 - y1) / (x2 - x1);
      }

      // Return NaN if no valid interpolation point is found
      return NaN;
    };

    // If xq is an array, map over each element
    return Array.isArray(xq) ? xq.map(interpolate) : interpolate(xq);
  }

  /**
   * Computes the gradient of a 2D grid.
   * @param {Array} x - X coordinates.
   * @param {Array} y - Y coordinates.
   * @param {Array[]} z - 2D data array.
   * @param {number} [N_a=11] - Neighborhood size.
   * @returns {Array[]} Gradient components [dz_x, dz_y].
   */
  gridGradient(x, y, z, N_a = 11) {
    var obj = this;
    var hx = x[1]-x[0]; 
    var hy = y[1]-y[0];
    var N_a_c = Math.floor(N_a / 2); 
    
    var n = z.length;
    var m = z[0].length;
        
    var dz_x = zeros(n, m);
    var dz_y = zeros(n, m);
    var dz_x_m = zeros(n, m);
    var dz_y_m = zeros(n, m);

    // Compute the gradient at a single point (x,y)
    // In our function, x is the horizontal index and y is the vertical index.
    function pointGradient(x, y) {
      if(x < 0 || x >= m || y < 0 || y >= n) return;
      // Check if gradients are already calculated
      if(dz_x[y][x] !== 0 || dz_y[y][x] !== 0) return;

      if(obj.jsl._isNaN(z[y][x])) {
        // If the current value is NaN or Inf, try using central differences if available
        // x component:
        if(x === 0 || x === m - 1) {
          dz_x[y][x] = 0;
        } else if(!obj.jsl._isNaN(z[y][x - 1]) && !obj.jsl._isNaN(z[y][x + 1])) {
          dz_x[y][x] = (z[y][x + 1] - z[y][x - 1]) / 2;
        } else {
          dz_x[y][x] = 0;
        }
        // y component:
        if(y === 0 || y === n - 1) {
          dz_y[y][x] = 0;
        } else if(!obj.jsl._isNaN(z[y - 1][x]) && !obj.jsl._isNaN(z[y + 1][x])) {
          dz_y[y][x] = (z[y + 1][x] - z[y - 1][x]) / 2;
        } else {
          dz_y[y][x] = 0;
        }
      } else {
        // If the value is valid, use one-sided differences on the boundaries
        // x component:
        if(x === 0 || x === m - 1) {
          if(x === 0 && !obj.jsl._isNaN(z[y][x + 1])) {
            dz_x[y][x] = z[y][x + 1] - z[y][x];
          } else if(x === m - 1 && !obj.jsl._isNaN(z[y][x - 1])) {
            dz_x[y][x] = z[y][x] - z[y][x - 1];
          } else {
            dz_x[y][x] = 0;
          }
        } else {
          if(!obj.jsl._isNaN(z[y][x - 1]) && !obj.jsl._isNaN(z[y][x + 1])) {
            dz_x[y][x] = (z[y][x + 1] - z[y][x - 1]) / 2;
          } else if(!obj.jsl._isNaN(z[y][x + 1])) {
            dz_x[y][x] = z[y][x + 1] - z[y][x];
          } else if(!obj.jsl._isNaN(z[y][x - 1])) {
            dz_x[y][x] = z[y][x] - z[y][x - 1];
          } else {
            dz_x[y][x] = 0;
          }
        }
        // y component:
        if(y === 0 || y === n - 1) {
          if(y === 0 && !obj.jsl._isNaN(z[y + 1][x])) {
            dz_y[y][x] = z[y + 1][x] - z[y][x];
          } else if(y === n - 1 && !obj.jsl._isNaN(z[y - 1][x])) {
            dz_y[y][x] = z[y][x] - z[y - 1][x];
          } else {
            dz_y[y][x] = 0;
          }
        } else {
          if(!obj.jsl._isNaN(z[y - 1][x]) && !obj.jsl._isNaN(z[y + 1][x])) {
            dz_y[y][x] = (z[y + 1][x] - z[y - 1][x]) / 2;
          } else if(!obj.jsl._isNaN(z[y + 1][x])) {
            dz_y[y][x] = z[y + 1][x] - z[y][x];
          } else if(!obj.jsl._isNaN(z[y - 1][x])) {
            dz_y[y][x] = z[y][x] - z[y - 1][x];
          } else {
            dz_y[y][x] = 0;
          }
        }
      }
      // Scale the gradients by the grid spacing
      dz_x[y][x] /= hx;
      dz_y[y][x] /= hy;
    }
    

    // Compute the mean gradient at a point using its neighborhood
    function meanGradient(x, y) {
      // Check if already calculated
      if(dz_x_m[y][x] !== 0 || dz_y_m[y][x] !== 0) return;
      var sum_x = 0, sum_y = 0, count_x = 0, count_y = 0;
      for(var p = 0; p < N_a; p++) {
        for(var q = 0; q < N_a; q++) {
          var nx = x + q - N_a_c;
          var ny = y + p - N_a_c;
          if(!(nx < 0 || nx >= m || ny < 0 || ny >= n)) {
            if(dz_x[ny][nx] !== 0) {
              sum_x += dz_x[ny][nx];
              count_x++;
            }
            if(dz_y[ny][nx] !== 0) {
              sum_y += dz_y[ny][nx];
              count_y++;
            }
          }
        }
      }
      dz_x_m[y][x] = count_x > 1 ? sum_x / count_x : sum_x;
      dz_y_m[y][x] = count_y > 1 ? sum_y / count_y : sum_y;
    }

    for(var y = 0; y < n; y++) {
      for(var x = 0; x < m; x++) {
        pointGradient(x, y);
      }
    }
    // Calculate mean gradient for all points
    for(var y = 0; y < n; y++) {
      for(var x = 0; x < m; x++) {
        meanGradient(x, y);
      }
    }
    
    return [dz_x_m, dz_y_m];
  }
  
  /**
   * Interpolates grid data using the specified method.
   * @param {Array} x - X coordinates.
   * @param {Array} y - Y coordinates.
   * @param {Array} z - Data values.
   * @param {Array} xq - Query X coordinates.
   * @param {Array} yq - Query Y coordinates.
   * @param {string} [method="linear"] - Interpolation method.
   * @param {Object} [opts_in] - Optional settings.
   * @returns {Array[]} Interpolated grid [xq, yq, zq].
   */
  gridData(x, y, z, xq, yq, method = "linear", opts_in) {
    var opts = {
      N_a: 11,
      k_e: 0.05,
      Ngx: 5,
      Ngy: 1,
      extrap: true,
      ...opts_in
    };
    
    function isBetween(A, a, b){
      var B = [];
      for(var i = 0; i < A.length; i += 1){
        if(A[i] >= (a - (b - a) * opts.k_e) && 
           A[i] <= (b + (b - a) * opts.k_e)) B.push(i);
      }
      return B;
    }

    var q_ids = [];
    var i_ids = [];

    var limits_x = linspace(xq[0], end(xq), opts.Ngx + 1);
    var limits_y = linspace(yq[0], end(yq), opts.Ngy + 1);
    
    for(var i = 0; i < opts.Ngx; i++){
      var i_idx = isBetween(x, limits_x[i], limits_x[i + 1]);
      for(var j = 0; j < opts.Ngy; j++){
        var i_idy = isBetween(y, limits_y[j], limits_y[j + 1]);
        var i_id = this.jsl.array.arrayIntersect(i_idx, i_idy);
        i_ids.push(structuredClone(i_id));
        
        var q_ids_ij = [];
        for(var k = 0; k < xq.length; k++){
          for(var m = 0; m < yq.length; m++){
            if(limits_x[i] <= xq[k] && 
                 xq[k] <= limits_x[i + 1] &&
                 limits_y[j] <= yq[m] && 
                 yq[m] <= limits_y[j + 1]){
              q_ids_ij.push([k, m]);
            } 
          }
        }
        q_ids.push([...q_ids_ij]);
      }
    }
    
    // Interpolation
    var zq = this.jsl.array.NaNs(yq.length, xq.length);
    if(method == 'nearest') {
      for(var i = 0; i < q_ids.length; i++) {
        var gc_q_ids = q_ids[i];
        var gc_i_ids = i_ids[i];
        for(var j = 0; j < gc_q_ids.length; j++) {
          var L_min;
          for(var k = 0; k < gc_i_ids.length; k++) {
            var L = Math.sqrt(Math.pow(x[gc_i_ids[k]] - xq[gc_q_ids[j][0]], 2) + 
                              Math.pow(y[gc_i_ids[k]] - yq[gc_q_ids[j][1]], 2));
            if(k == 0 || L < L_min){
              L_min = L;
              zq[gc_q_ids[j][1]][gc_q_ids[j][0]] = z[gc_i_ids[k]];
            }
          }
        }
      }
    } else if(method == 'linear') {
      for(var i = 0; i < q_ids.length; i++) {
        var gc_q_ids = q_ids[i];
        var gc_i_ids = i_ids[i];
        
        // Delaunay triangulation
        var points = [];
        for(var j = 0; j < gc_i_ids.length; j++) {
          points.push([x[gc_i_ids[j]], y[gc_i_ids[j]], z[gc_i_ids[j]]]);
        }
        var triangles = this.jsl.geometry.delaunayTriangulation(points);
        
        // Locate point (xq, yq) in triangle and calculate zq
        for(var j = 0; j < gc_q_ids.length; j++) {
          var point = [xq[gc_q_ids[j][0]], yq[gc_q_ids[j][1]], 0];
          for(var k = 0; k < triangles.length; k++) {
           if(triangles[k].contains(point)) {
             zq[gc_q_ids[j][1]][gc_q_ids[j][0]] = triangles[k].valueAt(point);
             break; 
           }
          }
        }        
      }

      if(opts.extrap) {
        // Extrapolation
        var zq0 = structuredClone(zq);
        
        // Calculate dz/dx and dz/dy for grid
        var [dz_x, dz_y] = this.gridGradient(xq, yq, zq, opts.N_a);
        
        for(var i = 0; i < q_ids.length; i++) {
          var gc_q_ids = q_ids[i];
          
          // Find nearest point with dz/dx and dz/dy
          for(var j = 0; j < gc_q_ids.length; j++) {
            var point = [
              xq[gc_q_ids[j][0]], 
              yq[gc_q_ids[j][1]], 
              zq[gc_q_ids[j][1]][gc_q_ids[j][0]]
             ];
            if(this.jsl._isNaN(point[2])) {
              var L_min;
              var k_min = -1;
              for(var k = 0; k < gc_q_ids.length; k++) {
                if(!this.jsl._isNaN(zq0[gc_q_ids[k][1]][gc_q_ids[k][0]])) {
                  var L = Math.sqrt(Math.pow(point[0] - xq[gc_q_ids[k][0]], 2) + 
                                   Math.pow(point[1] - yq[gc_q_ids[k][1]], 2));
                  if(k_min == -1 || L < L_min){
                    L_min = L;
                    k_min = k;
                  }
                }
              }
              if(k_min >= 0) {
                // Calculate dz and z
                var dz_x_i = dz_x[gc_q_ids[k_min][1]][gc_q_ids[k_min][0]];
                var dz_y_i = dz_y[gc_q_ids[k_min][1]][gc_q_ids[k_min][0]];
                
                var dx = xq[gc_q_ids[k_min][0]] - point[0];
                var dy = yq[gc_q_ids[k_min][1]] - point[1];
                zq[gc_q_ids[j][1]][gc_q_ids[j][0]] = 
                  zq[gc_q_ids[k_min][1]][gc_q_ids[k_min][0]] - 
                  dx * dz_x_i - dy * dz_y_i;
              }
            }
          }
        }
      }
    } else {
      this.jsl.env.error('@gridData: '+language.string(235));
    }
    return [xq, yq, zq];
  }
  
  /**
   * Calculates the output of a bilinear function based on input value, midpoint, and mid-value.
   * @param {number} x - The input value for the function.
   * @param {number} midPoint - The midpoint of the function where the slope changes.
   * @param {number} midValue - The value of the function at the midpoint.
   * @returns {number} The output value of the bilinear function.
   */
  bilinearFunction(x, midPoint, midValue) {
    var sign = 1;
    if(x < 0) {
      sign = -1;
    }
    x = Math.abs(x);
    if(x <= midPoint) {
      return sign*(midValue / midPoint) * x;
    } else {
      return sign*(((1 - midValue) / (1 - midPoint)) * (x - midPoint) + midValue);
    }
  }

  /**
   * Generates a random number between a specified range.
   * @param {Number} [min=0] The lower bound of the range.
   * @param {Number} [max] The upper bound of the range.
   * @returns {Number} A random number within the specified range.
   */
  random(min, max) {
    if(isNaN(Number(max))) return Math.random();
    if(isNaN(Number(min))) min = 0;
    return Math.random() * (max - min) + min;
  }

  /**
   * Generates a random integer within a specified range.
   * @param {Number} [min=0] The lower bound of the range.
   * @param {Number} [max] The upper bound of the range.
   * @returns {Number} A random integer within the specified range.
   */
  randInt(min, max) {
    if(isNaN(Number(max))) return NaN;
    if(isNaN(Number(min))) min = 0;
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  /**
   * Computes the arc cosine of x, with the result in degrees.
   * @param {Number} x The value to compute the arc cosine for.
   * @returns {Number} The arc cosine of x in degrees.
   */
  acosd(x) {
    return this.jsl.env.math.dotMultiply(this.jsl.env.math.acos(x), this.r2d);
  }

  /**
   * Computes the arc cotangent of x, with the result in degrees.
   * @param {Number} x The value to compute the arc cotangent for.
   * @returns {Number} The arc cotangent of x in degrees.
   */
  acotd(x) {
    return this.jsl.env.math.dotMultiply(this.jsl.env.math.acot(x), this.r2d);
  }

  /**
   * Computes the arc cosecant of x, with the result in degrees.
   * @param {Number} x The value to compute the arc cosecant for.
   * @returns {Number} The arc cosecant of x in degrees.
   */
  acscd(x) {
    return this.jsl.env.math.dotMultiply(this.jsl.env.math.acsc(x), this.r2d);
  }

  /**
   * Computes the arc secant of x, with the result in degrees.
   * @param {Number} x The value to compute the arc secant for.
   * @returns {Number} The arc secant of x in degrees.
   */
  asecd(x) {
    return this.jsl.env.math.dotMultiply(this.jsl.env.math.asec(x), this.r2d);
  }

  /**
   * Computes the arc sine of x, with the result in degrees.
   * @param {Number} x The value to compute the arc sine for.
   * @returns {Number} The arc sine of x in degrees.
   */
  asind(x) {
    return this.jsl.env.math.dotMultiply(this.jsl.env.math.asin(x), this.r2d);
  }

  /**
   * Computes the arc tangent of x, with the result in degrees.
   * @param {Number} x The value to compute the arc tangent for.
   * @returns {Number} The arc tangent of x in degrees.
   */
  atand(x) {
    return this.jsl.env.math.dotMultiply(this.jsl.env.math.atan(x), this.r2d);
  }

  /**
   * Computes the arc tangent of the quotient of its arguments, with the result in degrees.
   * @param {Number} y The y coordinate.
   * @param {Number} x The x coordinate.
   * @returns {Number} The arc tangent of y/x in degrees.
   */
  atan2d(y, x) {
    return this.jsl.env.math.dotMultiply(this.jsl.env.math.atan2(y, x), this.r2d);
  }

  /**
   * Computes the cosine of x, where x is in degrees.
   * @param {Number} x The angle in degrees.
   * @returns {Number} The cosine of x in degrees.
   */
  cosd(x) {
    return this.jsl.env.math.cos(this.jsl.env.math.dotMultiply(x, this.d2r));
  }

  /**
   * Computes the cotangent of x, where x is in degrees.
   * @param {Number} x The angle in degrees.
   * @returns {Number} The cotangent of x.
   */
  cotd(x) {
    return this.jsl.env.math.cot(this.jsl.env.math.dotMultiply(x, this.d2r));
  }

  /**
   * Computes the cosecant of x, where x is in degrees.
   * @param {Number} x The angle in degrees.
   * @returns {Number} The cosecant of x.
   */
  cscd(x) {
    return this.jsl.env.math.csc(this.jsl.env.math.dotMultiply(x, this.d2r));
  }

  /**
   * Computes the secant of x, where x is in degrees.
   * @param {Number} x The angle in degrees.
   * @returns {Number} The secant of x.
   */
  secd(x) {
    return this.jsl.env.math.sec(this.jsl.env.math.dotMultiply(x, this.d2r));
  }

  /**
   * Computes the sine of x, where x is in degrees.
   * @param {Number} x The angle in degrees.
   * @returns {Number} The sine of x.
   */
  sind(x) {
    return this.jsl.env.math.sin(this.jsl.env.math.dotMultiply(x, this.d2r));
  }

  /**
   * Computes the tangent of x, where x is in degrees.
   * @param {Number} x The angle in degrees.
   * @returns {Number} The tangent of x.
   */
  tand(x) {
    return this.jsl.env.math.tan(this.jsl.env.math.dotMultiply(x, this.d2r));
  }
  
  /**
   * Computes the characteristic polynomial of a matrix or the polynomial from roots.
   * @param {Array} A - If `A` is a matrix (2D array), computes its characteristic polynomial.
   *                    If `A` is an array of roots, computes the polynomial with those roots.
   * @returns {Array} - Coefficients of the resulting polynomial.
   */
  poly(A) {
    if(A[0].length) {
      return charpoly(A);
    }
    
    let p = [1];
    
    for(const root of A) {
      p = p.map((coef) => coef * -root)
        .concat(0)
        .map((coef, index, arr) => coef + (arr[index + 1] || 0));
    }
    
    return p;
  }

  /**
   * Fits a polynomial of degree n to the given data points and returns the coefficients (highest degree first).
   * @param {number[]} x - The array of x-values.
   * @param {number[]} y - The array of y-values corresponding to each x-value.
   * @param {number} n - The degree of the polynomial to fit.
   * @returns {number[]} The coefficients of the fitted polynomial in descending order.
   */
  polyfit(x, y, n) {
    var p = new this.jsl.env.PolynomialRegression(x, y, n);
    return p.coefficients.reverse(); // Reverse to match MATLAB's coefficient order
  }

  /**
   * Evaluates a polynomial with given coefficients at specified x-values.
   * @param {number[]} p - The coefficients of the polynomial in descending order.
   * @param {number[]} x_in - The array of x-values at which to evaluate the polynomial.
   * @returns {number[]} The resulting y-values after evaluating the polynomial at x_in.
   */
  polyval(p, x_in) {
    var y_out = [];
    y_out.length = x_in.length;
    for(var k = 0; k < x_in.length; k++) {
      var y = p[0];
      for(var i = 1; i < p.length; i++) {
        y = y * x_in[k] + p[i];
      }
      y_out[k] = y;
    }
    return y_out;
  }

  /**
   * Computes the roots of a polynomial with the given coefficients.
   * @param {number[]} p - Array of polynomial coefficients, ordered from highest degree to constant term.
   * @returns {number[]} Array of roots (real or complex) of the polynomial.
   */
  roots(p) {
    return this.jsl.env.native_module.roots(p);
  }

  /**
   * Generates a string representation of a polynomial based on the provided coefficients and options.
   * @param {number[]} p - An array of polynomial coefficients, ordered from highest degree to constant term.
   * @param {Object} [opts] - Optional settings for the polynomial string.
   * @param {string} [opts.x_symbol='x'] - The symbol to use for the variable x.
   * @param {string} [opts.y_symbol='y'] - The symbol to use for the variable y.
   * @param {number} [opts.precision=7] - The number of decimal places for coefficients.
   * @param {string} [opts.lang] - The language format for the output ('tex', 'c', etc.).
   * @returns {string} The formatted polynomial string.
   */
  polystr(p, opts) {
    let degree = p.length - 1;
    let x_symbol = 'x';
    let y_symbol = 'y';
    let precision = 7;
    let lang;
    if(opts) {
      if(opts.hasOwnProperty('x_symbol')) {
        x_symbol = opts.x_symbol;
      }
      if(opts.hasOwnProperty('y_symbol')) {
        y_symbol = opts.y_symbol;
      }
      if(opts.hasOwnProperty('precision')) {
        precision = opts.precision;
      }
      if(opts.hasOwnProperty('lang')) {
        lang = opts.lang;
      }
    }
    let str = y_symbol+' = ';

    for(let i = 0; i < p.length; i++) {
      let current_power = degree - i;
      let coef = p[i];

      // Skip terms with zero coefficient
      if(coef === 0) {
        continue;
      }

      // Handle the sign
      let sign_str = '';
      if(coef > 0 && i !== 0) {
        sign_str = ' + ';
      } else if(coef < 0) {
        sign_str = ' - ';
        coef = -coef; // Convert to positive for display
      }

      // Form the term based on the power of x
      let term_str;
      if(current_power > 1) {
        if(lang == 'tex') {
          term_str = `${sign_str}\\num\{${coef.toExponential(precision)}\}\\, ${x_symbol}^\{${current_power}\}`;
        } else if(lang == 'c') {
          term_str = `${sign_str}${coef.toExponential(precision)}*pow(${x_symbol}, ${current_power})`;
        } else {
          term_str = `${sign_str}${coef.toExponential(precision)}*${x_symbol}^${current_power}`;
        }
      } else if(current_power === 1) {
        if(lang == 'tex') {
          term_str = `${sign_str}\\num\{${coef.toExponential(precision)}\}\\, ${x_symbol}`;
        } else {
          term_str = `${sign_str}${coef.toExponential(precision)}*${x_symbol}`;
        }
        
      } else {
        if(lang == 'tex') {
          term_str = `${sign_str}\\num\{${coef.toExponential(precision)}\}`;
        } else {
          term_str = `${sign_str}${coef.toExponential(precision)}`;
        }
      }

      // Append the term to the polynomial string
      str += term_str;
    }

    return str;
  }
  
  /**
   * Generates a C language formatted string representation of a polynomial.
   * @param {number[]} p - An array of polynomial coefficients, ordered from highest degree to constant term.
   * @param {Object} [opts] - Optional settings for the polynomial string.
   * @returns {string} The polynomial string formatted for C language.
   */
  polystrc(p, opts) {
    if(opts) {
      opts.lang = 'c';
    } else {
      opts = {lang: 'c'};
    }
    return polystr(p, opts);
  }

  /**
   * Generates a LaTeX formatted string representation of a polynomial.
   * @param {number[]} p - An array of polynomial coefficients, ordered from highest degree to constant term.
   * @param {Object} [opts] - Optional settings for the polynomial string.
   * @returns {string} The polynomial string formatted for LaTeX.
   */
  polystrtex(p, opts) {
    if(opts) {
      opts.lang = 'tex';
    } else {
      opts = {lang: 'tex'};
    }
    return polystr(p, opts);
  }

  /**
   * Filters out spikes in a sequence by replacing sudden large changes with the previous value.
   * @param {number[]} x - The input sequence of numbers.
   * @param {number} dx_max - The maximum allowed difference between consecutive elements before considering it a spike.
   * @param {number} n - The maximum number of consecutive spikes to correct.
   * @returns {number[]} The filtered sequence with spikes removed.
   */
  spikeFilter(x, dx_max, n) {
    var c = 0;
    if(x.length > 1) {
      for(var i = 1; i < x.length; i++) {
        if(Math.abs(x[i]-x[i-1]) > dx_max && c < n){
          c = c+1;
          x[i] = x[i-1];
        } else {
          c = 0;
        }
      }
    }
    return x;
  }

  /**
   * Calculates the magnitude (absolute value) of a complex number or a real number.
   *
   * @param {number|Object} num - A real number or an object with 'real' and 'imag' properties.
   * @returns {number} The magnitude of the number.
   */
  magnitude(num) {
    if(typeof num === 'object' && num.real !== undefined && num.imag !== undefined) {
      return Math.hypot(num.real, num.imag);
    } else {
      return Math.abs(num);
    }
  }

  /**
   * Compares two numbers (real or complex) according to Octave's rules.
   *
   * @param {number|Object} a - First number to compare.
   * @param {number|Object} b - Second number to compare.
   * @returns {number} -1 if a < b, 1 if a > b, 0 if equal.
   */
  compareComplex(a, b) {
    const mag_A = magnitude(a);
    const mag_B = magnitude(b);

    if(mag_A < mag_B) return -1;
    if(mag_A > mag_B) return 1;

    // Magnitudes are equal; compare real parts
    const real_A = (typeof a === 'object') ? a.real : a;
    const real_B = (typeof b === 'object') ? b.real : b;

    if(real_A < real_B) return -1;
    if(real_A > real_B) return 1;

    // Real parts are equal; compare imaginary parts
    const imag_A = (typeof a === 'object') ? a.imag : 0;
    const imag_B = (typeof b === 'object') ? b.imag : 0;

    if(imag_A < imag_B) return -1;
    if(imag_A > imag_B) return 1;

    // Numbers are equal
    return 0;
  }
  
  /**
   * Finds the minimum value in an array of numbers, which can include both real numbers and complex numbers.
   * Complex numbers are represented as objects with 'real' and 'imag' properties.
   * The comparison follows Octave's rules:
   * 1. Compare magnitudes (absolute values) of the numbers.
   * 2. If magnitudes are equal, compare real parts.
   * 3. If real parts are equal, compare imaginary parts.
   *
   * @param {Array<number|Object>} arr - An array of numbers or complex number objects.
   * @returns {number|Object} The minimum value found in the array.
   * @throws {TypeError} If the input is not an array.
   */
  min(arr) {
    if(!Array.isArray(arr)) {
      this.jsl.env.error('@min: '+language.string(190));
      return;
    }
    arr = arr.filter(num => !isNaN(num));
    
    // Separate real numbers and complex numbers
    const real_numbers = [];
    const complex_numbers = [];
    for(const num of arr) {
      if(typeof num === 'object' && num.real !== undefined && num.imag !== undefined) {
        complex_numbers.push(num);
      } else {
        real_numbers.push(num);
      }
    }

    // Find min among real numbers using existing function
    let min_real = real_numbers.length > 0 ? this.jsl.env.math.min(real_numbers) : null;

    // Find min among complex numbers
    let min_complex = complex_numbers.length > 0 ? complex_numbers[0] : null;
    for(let i = 1; i < complex_numbers.length; i++) {
      if(compareComplex(complex_numbers[i], min_complex) < 0) {
        min_complex = complex_numbers[i];
      }
    }

    // Compare min_real and min_complex
    if(min_real !== null && min_complex !== null) {
      return compareComplex(min_real, min_complex) < 0 ? min_real : min_complex;
    } else if(min_real !== null) {
      return min_real;
    } else {
      return min_complex;
    }
  }
    
  /**
   * Finds the maximum value in an array of numbers, which can include both real numbers and complex numbers.
   * Complex numbers are represented as objects with 'real' and 'imag' properties.
   * The comparison follows Octave's rules:
   * 1. Compare magnitudes (absolute values) of the numbers.
   * 2. If magnitudes are equal, compare real parts.
   * 3. If real parts are equal, compare imaginary parts.
   *
   * @param {Array<number|Object>} arr - An array of numbers or complex number objects.
   * @returns {number|Object} The maximum value found in the array.
   * @throws {TypeError} If the input is not an array.
   */
  max(arr) {
    if(!Array.isArray(arr)) {
      this.jsl.env.error('@max: '+language.string(190));
      return;
    }
    arr = arr.filter(num => !isNaN(num));
    
    // Separate real numbers and complex numbers
    const real_numbers = [];
    const complex_numbers = [];
    for(const num of arr) {
      if(typeof num === 'object' && num.real !== undefined && num.imag !== undefined) {
        complex_numbers.push(num);
      } else {
        real_numbers.push(num);
      }
    }

    // Find max among real numbers using existing function
    let max_real = real_numbers.length > 0 ? this.jsl.env.math.max(real_numbers) : null;

    // Find max among complex numbers
    let max_complex = complex_numbers.length > 0 ? complex_numbers[0] : null;
    for(let i = 1; i < complex_numbers.length; i++) {
      if(compareComplex(complex_numbers[i], max_complex) > 0) {
        max_complex = complex_numbers[i];
      }
    }

    // Compare max_real and max_complex
    if(max_real !== null && max_complex !== null) {
      return compareComplex(max_real, max_complex) > 0 ? max_real : max_complex;
    } else if(max_real !== null) {
      return max_real;
    } else {
      return max_complex;
    }
  }
  
  /**
   * Extracts the real part of a number or an array of numbers.
   * Handles mixed inputs containing both real numbers and complex numbers.
   *
   * @param {number|Object|Array<number|Object>} input - A number, complex number object, or array thereof.
   * @returns {number|Array<number>} The real part(s) of the input.
   * @throws {TypeError} If the input is not a number, complex number object, or array.
   */
  real(input) {
    if(Array.isArray(input)) {
      return input.map(real);
    } else if(typeof input === 'object' && input !== null && 'real' in input && 'imag' in input) {
      return real(input.real);
    } else if(typeof input === 'number') {
      return input;
    } else {
      this.jsl.env.error('@real: '+language.string(192));
    }
  }

  /**
   * Extracts the imaginary part of a number or an array of numbers.
   * Handles mixed inputs containing both real numbers and complex numbers.
   *
   * @param {number|Object|Array<number|Object>} input - A number, complex number object, or array thereof.
   * @returns {number|Array<number>} The imaginary part(s) of the input.
   * @throws {TypeError} If the input is not a number, complex number object, or array.
   */
  imag(input) {
    if(Array.isArray(input)) {
      return input.map(imag);
    } else if(typeof input === 'object' && input !== null && 'real' in input && 'imag' in input) {
      return imag(input.imag);
    } else if(typeof input === 'number') {
      return 0;
    } else {
      this.jsl.env.error('@imag: '+language.string(192));
    }
    return false;
  }
  
  /**
   * Performs cumulative trapezoidal integration on the provided data.
   * @param {...any} args - Arguments required for cumulative trapezoidal integration.
   * @returns {any} The result of the cumulative trapezoidal integration.
   */
  cumtrapz(...args) {
    return this.jsl.env.native_module.cumtrapz(...args);
  }
  
  /**
   * Performs trapezoidal integration on the provided data.
   * @param {...any} args - Arguments required for trapezoidal integration.
   * @returns {any} The result of the trapezoidal integration.
   */
  trapz(...args) {
    return this.jsl.env.native_module.trapz(...args);
  }
  
  /**
   * Compute the mean squared error (MSE) between two arrays.
   * @param {Array<number>} A - The first array.
   * @param {Array<number>} B - The second array.
   * @returns {number} - The mean squared error between A and B.
   * @throws {Error} - If A and B have different lengths or are not arrays.
   */
  mse(A, B) {
    if(!Array.isArray(A) || !Array.isArray(B)) {
      throw new Error("Both inputs must be arrays.");
    }

    if(A.length !== B.length) {
      throw new Error("Input arrays must have the same length.");
    }

    const n = A.length;
    const mse = A.reduce((sum, a, i) => {
      const diff = a - B[i];
      return sum + diff * diff;
    }, 0) / n;

    return mse;
  }
  
  /**
   * Calculates the coefficients of the characteristic polynomial of a square matrix.
   * @param {number[][]} matrix - A square matrix (2D array) for which the characteristic polynomial is computed.
   * @returns {number[]} - An array of coefficients of the characteristic polynomial.
   * @throws {Error} - Throws an error if the input is not a square matrix or has less than 2 rows/columns.
   */
  charpoly(matrix) {
    const n = matrix.length;
    const m = matrix[0].length;

    if(n !== m || n < 1) {
      throw new Error("Argument 'matrix' must be a square matrix.");
    }
    
    if(n == 1) {
      return [1, -matrix[0][0]];
    }
    
    let p = ones(n+1);
    let a1 = [...matrix];
    for(let k = 2; k <= n; k++) {
      p[k-1] = -1 * sum(this.jsl.env.math.diag(a1)) / (k - 1);
      a1 = this.jsl.env.math.multiply(matrix, plus(a1, 
        this.jsl.env.math.multiply(p[k-1], 
        this.jsl.env.math.diag(ones(n)))));
    }

    p[n] = -1 * sum(this.jsl.env.math.diag(a1)) / n;

    return p;
  }
}

exports.PRDC_JSLAB_LIB_MATH = PRDC_JSLAB_LIB_MATH;