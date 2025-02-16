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
      var i = x.indexOf(xqi);
      if(i >= 0) {
        return y[i];
      }

      var x1 = [...x].reverse().find(v => v <= xqi);
      var x2 = x.find(v => v >= xqi);

      // Handle extrapolation if mode is 'extrap'
      if(mode === 'extrap') {
        if(xqi < x[0]) {
          // Left-side extrapolation
          const gradient = (y[1] - y[0]) / (x[1] - x[0]);
          return y[0] + (xqi - x[0]) * gradient;
        } else if(xqi > x[x.length - 1]) {
          // Right-side extrapolation
          const lastIdx = x.length - 1;
          const gradient = (y[lastIdx] - y[lastIdx - 1]) / (x[lastIdx] - x[lastIdx - 1]);
          return y[lastIdx] + (xqi - x[lastIdx]) * gradient;
        }
      }

      // Handle interpolation inside the data range
      if(x1 !== undefined && x2 !== undefined && x1 !== x2) {
        var y1 = y[x.indexOf(x1)];
        var y2 = y[x.indexOf(x2)];
        return y1 + (xqi - x1) * (y2 - y1) / (x2 - x1);
      }

      // Return NaN if no valid interpolation point is found
      return NaN;
    };

    // Check if xq is an array
    if(Array.isArray(xq)) {
      return xq.map(interpolate);
    } else {
      return interpolate(xq);
    }
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