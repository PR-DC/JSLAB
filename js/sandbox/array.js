/**
 * @file JSLAB library array submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB array submodule.
 * Column-major order for matrix operation
 */
class PRDC_JSLAB_LIB_ARRAY {
  
  /**
   * Constructs an array submodule object for JSLAB.
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }
  
  /**
   * Converts an iterable or array-like object into a standard array.
   * @param {Iterable|ArrayLike} A - The iterable or array-like object to convert.
   * @returns {Array} A new array containing the elements from the input.
   */
  array(A) {
    return Array.from(A);
  }
  
  /**
   * Retrieves the last element from the provided array.
   * @param {Array} A - The array from which the last element is to be retrieved.
   * @returns {*} The last element of the array. If the array is empty, returns undefined.
   */
  end(A) {
    return A[A.length-1];
  }
  
  /**
   * Returns the index of the last element in the array.
   * @param {Array} A - The array to evaluate.
   * @returns {number} The index of the last element.
   */
  endi(A) {
    return A.length-1;
  }
  
  /**
   * Retrieves a specific column from the provided matrix.
   * @param {Array} A - The matrix array.
   * @param {number} col - The column index to retrieve.
   * @returns {Array} The specified column as an array.
   */
  column(A, col) {
    return A.map(function(x) { return x[col]; });
  }

  /**
   * Retrieves a specific row from the provided matrix.
   * @param {Array} A - The matrix array.
   * @param {number} row - The row index to retrieve.
   * @returns {Array} The specified row as an array.
   */
  row(A, row) {
    return A[row];
  }
  
  /**
   * Generates an array of indices based on rows and columns.
   * @param {number|number[]} rows - The row index or array of row indices.
   * @param {number|number[]} cols - The column index or array of column indices.
   * @param {number} rows_max - The maximum number of rows.
   * @returns {number[]} An array of calculated indices.
   */
  index(rows, cols, rows_max) {
    if(!Array.isArray(rows)) {
      rows = [rows];
    }
    if(!Array.isArray(cols)) {
      cols = [cols];
    }
    var A = zeros(rows.length * cols.length);
    
    var k = 0;
    for(var j = 0; j < cols.length; j++) {
      for(var i = 0; i < rows.length; i++) {
        A[k++] = rows[i] + cols[j] * rows_max;
      }
    }
    
    return A;
  }
  
  /**
   * Finds all indices of a specified value in the array.
   * @param {Array} A - The array to search.
   * @param {*} value - The value to find.
   * @returns {number[]} An array of indices where the value is found.
   */
  indexOfAll(A, value) {
    return A.reduce(function(a, e, i) {
        if(e === value) {
          a.push(i);
        }
        return a;
    }, []);
  }
  
  /**
   * Finds the index of a sequence of elements in the array.
   * @param {Array} A - The array to search.
   * @param {Array} search_elements - The sequence of elements to find.
   * @param {number} [from_index=0] - The index to start the search from.
   * @returns {number} The starting index of the found sequence, or -1 if not found.
   */
  indexOfMulti(A, search_elements, from_index) {
    from_index = from_index || 0;

    var index = Array.prototype.indexOf.call(A, search_elements[0],
      from_index);
    if(search_elements.length === 1 || index === -1) {
      // Not found or no other elements to check
      return index;
    }

    for(var i = index, j = 0;
      j < search_elements.length && i < A.length; i++, j++) {
      if(A[i] !== search_elements[j]) {
        return indexOfMulti(A, search_elements, index + 1);
      }
    }

    return (i === index + search_elements.length) ? index : -1;
  }
  
  /**
   * Sets a subset of array elements based on provided indices.
   * @param {Array} A - The target array.
   * @param {number[]} indices - The indices at which to set values.
   * @param {Array} B - The array of values to set.
   */
  setSub(A, indices, B) {
    var j = 0;
    for(var i = 0; i < indices.length; i++) {
      A[indices[i]] = B[j++];
    }
  }

  /**
   * Retrieves a subset of array elements based on provided indices.
   * @param {Array} A - The source array.
   * @param {number[]} indices - The indices of elements to retrieve.
   * @returns {Array} An array containing the retrieved elements.
   */
  getSub(A, indices) {
    var B = zeros(indices.length);
    var j = 0;
    for(var i = 0; i < indices.length; i++) {
      B[j++] = A[indices[i]];
    }
    return B;
  }
  
  /**
   * Moves an element within the array from one index to another.
   * @param {Array} A - The array to modify.
   * @param {number} from_index - The index of the element to move.
   * @param {number} to_index - The target index where the element should be moved.
   * @returns {Array} The modified array with the element moved.
   */
  moveElement(A, from_index, to_index) {
    const start_index = from_index < 0 ? A.length + from_index : from_index;

    if(start_index >= 0 && start_index < A.length) {
      const end_index = to_index < 0 ? A.length + to_index : to_index;

      const [item] = A.splice(from_index, 1);
      A.splice(end_index, 0, item);
    }
    return A;
  }

  /**
   * Removes an element from the array at the specified index.
   * @param {Array} A - The array to modify.
   * @param {number} index - The index of the element to remove.
   * @returns {Array} The array after the element has been removed.
   */
  removeElement(A, index) {
    return A.splice(index, 1);
  }

  /**
   * Removes the first occurrence of a specified value from the array.
   * @param {Array} A - The array to modify.
   * @param {*} value - The value to remove.
   * @returns {Array} The array after the value has been removed.
   */
  removeElementByValue(A, value) {
    var index = A.indexOf(value);
    if(index !== -1) {
      A.splice(index, 1);
    }
    return A;
  }
  
  /**
   * Removes elements from array A that have properties listed in array B.
   * @param {Array<Object>} A - The array to filter.
   * @param {Array} B - The array of properties or values to remove.
   * @param {string} [prop] - The property name to check in objects within A.
   * @returns {Array} The filtered array.
   */
  removeElementProp(A, B, prop) {
    if(prop) {
      return A.filter(function(e) { return !B.includes(e[prop]); });
    } else {
      return A.filter(function(e) { return !B.includes(e); });
    }
  }
  
  /**
   * Finds the index of the first object in the array where the specified property matches the given value.
   * @param {Array<Object>} A - The array to search.
   * @param {string} property - The property name to compare.
   * @param {*} value - The value to match.
   * @returns {number} The index of the matching object, or -1 if not found.
   */
  findIndexProp(A, property, value) {
    return A.findIndex(function(object) {
      return object[property] == value;
    });
  }

  /**
   * Sets a value at the specified multi-dimensional indices in the array.
   * @param {Array} A - The target array.
   * @param {number[]} indices - An array of indices representing the position.
   * @param {*} value - The value to set.
   * @returns {*} The value that was set.
   */
  setValueAt(A, indices, value) {
    var reference = A;
    for(var i = 0; i < indices.length - 1; i++) {
      reference = reference[indices[i]];
    }
    reference[indices[indices.length - 1]] = value;
    return reference;
  }

  /**
   * Retrieves a value from the array at the specified multi-dimensional indices.
   * @param {Array} A - The source array.
   * @param {number[]} indices - An array of indices representing the position.
   * @returns {*} The value at the specified indices, or undefined if out of bounds.
   */
  getValueAt(A, indices) {
    if(Array.isArray(A)) {
      var reference = A;
      for(var i = 0; i < indices.length; i++) {
        if(indices[i] < reference.length) {
          reference = reference[indices[i]];
        } else {
          return undefined;
        }
      }
      return reference;
    } else {
      return undefined;
    }
  }
  
  /**
   * Alias for setValueAt.
   * @param {Array} A - The target array.
   * @param {number[]} indices - An array of indices representing the position.
   * @param {*} value - The value to set.
   * @returns {*} The value that was set.
   */
  setVal(A, indices, value) {
    return this.setValueAt(A, indices, value);
  }
  
  /**
   * Alias for getValueAt.
   * @param {Array} A - The source array.
   * @param {number[]} indices - An array of indices representing the position.
   * @returns {*} The value at the specified indices, or undefined if out of bounds.
   */
  getVal(A, indices) {
    return this.getValueAt(A, indices);
  }

  /**
   * Creates an n-dimensional array.
   * @param {number} length - The size of the first dimension.
   * @param {...number} [dimensions] - Sizes of subsequent dimensions.
   * @returns {Array} The newly created n-dimensional array.
   */
  createArray(length) {
    var A = new Array(length || 0);
    var i = length;

    if(arguments.length > 1) {
      var args = Array.prototype.slice.call(arguments, 1);
      while(i--) A[(length-1)-i] = createArray.apply(this, args);
    }

    return A;
  }

  /**
   * Creates an n-dimensional array filled with a specific value.
   * @param {number} length - The size of the first dimension.
   * @param {*} val - The value to fill the array with.
   * @param {...number} [dimensions] - Sizes of subsequent dimensions.
   * @returns {Array} The filled n-dimensional array.
   */
  createFilledArray(length, val) {
    var A = new Array(length || 0);
    var i = length;

    if(arguments.length > 2) {
      var args = Array.prototype.slice.call(arguments, 1);
      while(i--) A[(length-1)-i] = this.createFilledArray.apply(this, args);
    } else {
      A.fill(val);
    }

    return A;
  }
  
  /**
   * Fills the array with a specific value.
   * @param {*} val - The value to fill the array with.
   * @param {Array} A - The array to fill.
   * @param {number} length - The number of elements to fill.
   */
  fill(val, A, length) {
    for(var i = 0; i < length; i++) {
      A[i] = val;
    }
  }
  
  /**
   * Creates an n-dimensional array filled with NaN.
   * @param {...number} size - The size of each dimension.
   * @returns {Array} The NaN-filled n-dimensional array.
   */
  NaNs(...size) {
    return this.createFilledArray(...size, NaN);
  }

  /**
   * Creates an n-dimensional array filled with zeros.
   * @param {...number} size - The size of each dimension.
   * @returns {Array} The zero-filled n-dimensional array.
   */
  zeros(...size) {
    return this.createFilledArray(...size, 0);
  }

  /**
   * Creates an n-dimensional array filled with ones.
   * @param {...number} size - The size of each dimension.
   * @returns {Array} The one-filled n-dimensional array.
   */
  ones(...size) {
    return this.createFilledArray(...size, 1);
  }
  
  /**
   * Creates a 2-dimensional identity matrix.
   * @param {number} size - The size of the identity matrix.
   * @returns {Array} The identity matrix as a 2D array.
   */
  eye(size) {
    return this.diag(this.ones(size), size);
  }
  
  /**
   * Scales an array by a scalar.
   * @param {Array<number>} A - The array to scale.
   * @param {number} s - The scalar value.
   * @returns {Array<number>} The scaled array.
   */
  scale(A, s) {
    var obj = this;
    return A.map(function(x) {
      if(Array.isArray(x)) {
        return obj.scale(x, s);
      } else {
        return x * s;
      }
    });
  }
  
  /**
   * Creates a linearly spaced vector.
   * @param {number} x1 - The start value.
   * @param {number} x2 - The end value.
   * @param {number} [N=100] - The number of points.
   * @returns {Array<number>} The linearly spaced vector.
   */
  linspace(x1, x2, rows = 100) {
    var A = new Array(rows);
    var dx = (x2-x1)/(rows-1);
    for(var i = 0; i < rows; i++) {
      A[i] = x1+dx*i;
    }
    return A;
  }

  /**
   * Generates an array of numbers within a specified range.
   * @param {...*} args - The start, end, and optional step for the range.
   * @returns {Array<number>} An array containing numbers within the specified range.
   */
  range(...args) {
    return [...this.jsl.env.math.range(...args, true).toArray()];
  }
  
  /**
   * Generates a sequence of numbers from `x1` to `x2` with increments of `dx`.
   * @param {number} x1 - The starting value of the sequence.
   * @param {number} x2 - The ending value of the sequence.
   * @param {number} dx - The increment between values in the sequence.
   * @returns {number[]} An array of numbers from `x1` to `x2` with step size `dx`.
   */
  colon(x1, x2, dx) {
    if(dx === 0) {
      this.jsl.env.error('@colon: '+language.string(189));
    }
    const x = [];
    const tolerance = 1e-14; // Tolerance for floating-point comparisons
    let n = 0;
    let xi = x1;
    const increasing = dx > 0;

    while(
      (increasing && xi <= x2 + tolerance) ||
      (!increasing && xi >= x2 - tolerance)
    ) {
      x.push(xi);
      xi = x1 + dx * ++n;
    }

    return x;
  }

  /**
   * Applies a function to corresponding elements of one or more arrays.
   * @param {Function} func - The function to apply to the elements.
   * @param {...Array} arrays - One or more arrays to process.
   * @returns {Array} A new array with the function applied to each corresponding element.
   */
  elementWise(func, ...arrays) {
    // Ensure all arrays have the same length
    const length = arrays[0].length;

    // Initialize the result array
    const result = [];

    // Apply the function element-wise
    for(let i = 0; i < length; i++) {
      // Get the corresponding elements from all arrays
      const values = arrays.map(array => array[i]);

      // Apply the function to the values and store in the result array
      result.push(func(...values));
    }

    return result;
  }
  
  /**
   * Applies a function to each element of an array or matrix along a specified dimension.
   * @param {Array|Matrix} A - The array or matrix to process.
   * @param {number} dim - The dimension along which to apply the function.
   * @param {Function} fun - The function to apply to each element.
   * @returns {Array|Matrix} The result of applying the function to A.
   */
  arrayfun(A, dim, fun) {
    return this.jsl.env.math.apply(A, dim, fun);
  }

  /**
   * Performs element-wise division on two arrays or matrices.
   * @param {Array|Matrix} x - The numerator array or matrix.
   * @param {Array|Matrix} y - The denominator array or matrix.
   * @returns {Array|Matrix} The result of the element-wise division.
   */
  divideEl(x, y) {
    return this.jsl.env.math.dotDivide(x, y);
  }

  /**
   * Performs element-wise multiplication on two arrays or matrices.
   * @param {Array|Matrix} x - The first array or matrix.
   * @param {Array|Matrix} y - The second array or matrix.
   * @returns {Array|Matrix} The result of the element-wise multiplication.
   */
  multiplyEl(x, y) {
    return this.jsl.env.math.dotMultiply(x, y);
  }
  
  /**
   * Raises elements of an array or matrix to the power of elements in another array or matrix, element-wise.
   * @param {Array|Matrix} x - The base array or matrix.
   * @param {Array|Matrix|number} y - The exponent array, matrix, or scalar.
   * @returns {Array|Matrix} The result of the element-wise exponentiation.
   */
  powEl(x, y) {
    return this.jsl.env.math.dotPow(x, y);
  }

  /**
   * Performs element-wise multiplication on two arrays or matrices.
   * @param {Array|Matrix} x - The first array or matrix.
   * @param {Array|Matrix} y - The second array or matrix.
   * @returns {Array|Matrix} The result of the element-wise multiplication.
   */
  dot(x, y) {
    return this.jsl.env.math.dot(x, y);
  }
  
  /**
   * Determines if the element is greater than zero.
   * @param {number} e - The element to check.
   * @returns {boolean} True if greater than zero, otherwise false.
   */
  lZero(e) { 
    return e > 0; 
  }

  /**
   * Calculates the average value of an array.
   * @param {Array<number>} arr - The array to average.
   * @returns {number} The average value.
   */
  average(arr) { 
    return arr.reduce(function(p, c) { 
      return p + c; 
    }, 0) / arr.length;
  }

  /**
   * Calculates the Exponential Moving Average of the data.
   * @param {number[]} data - The data array.
   * @param {number} alpha - The smoothing factor between 0 and 1.
   * @returns {number[]} The Exponential Moving Average of the data.
   */
  averageEM(data, alpha) {
    var result = [];
    var ema = data[0];
    result.push(ema);
    for(var i = 1; i < data.length; i++) {
      ema = alpha * data[i] + (1 - alpha) * ema;
      result.push(ema);
    }
    return result;
  }
  
  /**
   * Determines if two arrays are equal.
   * @param {Array} A1 - The first array.
   * @param {Array} A2 - The second array.
   * @returns {boolean} True if arrays are equal, otherwise false.
   */
  isequal(A1, A2) {
    let n;
    if((n = A1.length) != A2.length) return false;
    for(let i = 0; i < n; i++) if(A1[i] !== A2[i]) return false;
    return true;
  }

  /**
   * Negates the boolean values in an array.
   * @param {Array<boolean>} A - The array to negate.
   * @returns {Array<boolean>} The negated array.
   */
  neg(A) {
    var B = new Array(A.length);
    for(var i = 0; i < A.length; i++) {
      B[i] = !A[i];
    }
    return B;
  }
  
  /**
   * Determines if all elements in an array evaluate to true.
   * @param {Array<boolean>} A - The array to check.
   * @returns {boolean} True if all elements are true, otherwise false.
   */
  all(A) {
    let n = A.length;
    for(let i = 0; i < n; i++) {
      if(!A[i]) {
        return false;
      }
    }
    return true;
  }
 
  /**
   * Determines if any element in an array evaluates to true.
   * @param {Array<boolean>} A - The array to check.
   * @returns {boolean} True if any element is true, otherwise false.
   */
  any(A) {
    let n = A.length;
    for(let i = 0; i < n; i++) {
      if(A[i]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if the array contains a specified item.
   * @param {Array} arr - The array to search.
   * @param {*} item - The item to search for.
   * @returns {boolean} True if the item is found, otherwise false.
   */
  arrayContains(arr, item) {
    if(!Array.prototype.indexOf) {
      var i = arr.length;
      while(i--) {
        if(arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }
  
  /**
   * Checks if an array contains any duplicate elements.
   * @param {Array} array - The array to check for duplicates.
   * @returns {boolean} True if duplicates are found, false otherwise.
   */
  hasDuplicates(array) {
    return new Set(array).size !== array.length;
  }

  /**
   * Removes duplicate values from an array.
   * @param {Array} arr - The array from which duplicates are to be removed.
   * @returns {Array} An array containing only unique elements from the original array.
   */
  removeDuplicates(arr) {
    return arr.filter(function(item, index) { return arr.indexOf(item) === index; });
  }
  
  /**
   * Reverses the order of elements in each row of a matrix.
   * @param {Array} array - The matrix array to flip horizontally.
   * @returns {Array} The horizontally flipped matrix.
   */
  fliplr(array) {
    return array.reverse();
  }

  /**
   * Moves the first `n` elements of the array to the end.
   * @param {Array} array - The array to be modified.
   * @param {number} n - The number of elements to move from the start to the end.
   * @returns {Array} The modified array with the first `n` elements moved to the end.
   */
  movelr(array, n) {
    var A = [...array];
    if(A.length === 0 || n <= 0) return array;
    n = n % A.length;
    const elements_to_move = A.splice(0, n);
    A.push(...elements_to_move);
    return A;
  }
  
  /**
   * Adds two operands, which can be either scalars or arrays.
   * If both operands are arrays, they must be of the same length.
   * @param {number|Array<number>} a - The first operand, scalar or array.
   * @param {number|Array<number>} b - The second operand, scalar or array.
   * @returns {number|Array<number>} The result of adding `a` and `b`.
   * @throws {Error} If input types are invalid or arrays have different lengths.
   */
  plus(a, b) {
    if(Array.isArray(a) && Array.isArray(b)) {
      // Both are arrays
      if(a.length !== b.length) {
        this.jsl.env.error('@plus: '+language.string(176));
      }
      return a.map((val, idx) => this.plus(val, b[idx]));
    } else if(Array.isArray(a) && typeof b === 'number') {
      // 'a' is array, 'b' is scalar
      return a.map(val => this.plus(val, b));
    } else if(typeof a === 'number' && Array.isArray(b)) {
      // 'a' is scalar, 'b' is array
      return b.map(val => this.plus(a, val));
    } else if(typeof a === 'number' && typeof b === 'number') {
      // Both are scalars
      return a + b;
    } else {
      this.jsl.env.error('@plus: '+language.string(177));
    }
  }

  /**
   * Adds two operands, which can be either scalars or arrays.
   * If both operands are arrays, they must be of the same length.
   * @param {number|Array<number>} a - The first operand, scalar or array.
   * @param {number|Array<number>} b - The second operand, scalar or array.
   * @returns {number|Array<number>} The result of adding `a` and `b`.
   * @throws {Error} If input types are invalid or arrays have different lengths.
   */
  add(a, b) {
    return this.plus(a, b);
  }
  
  /**
   * Subtracts the second operand from the first, which can be either scalars or arrays.
   * If both operands are arrays, they must be of the same length.
   * @param {number|Array<number>} a - The first operand, scalar or array.
   * @param {number|Array<number>} b - The second operand, scalar or array.
   * @returns {number|Array<number>} The result of subtracting `b` from `a`.
   * @throws {Error} If input types are invalid or arrays have different lengths.
   */
  minus(a, b) {
    if(Array.isArray(a) && Array.isArray(b)) {
      // Both are arrays
      if(a.length !== b.length) {
        this.jsl.env.error('@minus: '+language.string(176));
      }
      return a.map((val, idx) => this.minus(val, b[idx]));
    } else if(Array.isArray(a) && typeof b === 'number') {
      // 'a' is array, 'b' is scalar
      return a.map(val => this.minus(val, b));
    } else if(typeof a === 'number' && Array.isArray(b)) {
      // 'a' is scalar, 'b' is array
      return b.map(val => this.minus(a, val));
    } else if(typeof a === 'number' && typeof b === 'number') {
      // Both are scalars
      return a - b;
    } else {
      this.jsl.env.error('@minus: '+language.string(177));
    }
  }
  
  /**
   * Subtracts the second operand from the first, which can be either scalars or arrays.
   * If both operands are arrays, they must be of the same length.
   * @param {number|Array<number>} a - The first operand, scalar or array.
   * @param {number|Array<number>} b - The second operand, scalar or array.
   * @returns {number|Array<number>} The result of subtracting `b` from `a`.
   * @throws {Error} If input types are invalid or arrays have different lengths.
   */
  subtract(a, b) {
    return this.minus(a, b);
  }
  
  /**
   * Computes the cross product of two 3D vectors.
   * @param {number[]} A - The first 3D vector.
   * @param {number[]} B - The second 3D vector.
   * @param {number} cols - The number of columns (typically 1 for single vectors).
   * @returns {number[]} The cross product vector.
   */
  cross3D(A, B, cols) {
    var C = new Array(3 * cols).fill(0);
    for(var j = 0; j < cols; j++) {
      C[j * 3] = A[j * 3 + 1] * B[j * 3 + 2] - A[j * 3 + 2] * B[j * 3 + 1];
      C[j * 3 + 1] = A[j * 3 + 2] * B[j * 3] - A[j * 3] * B[j * 3 + 2];
      C[j * 3 + 2] = A[j * 3] * B[j * 3 + 1] - A[j * 3 + 1] * B[j * 3];
    }
    return C;
  }

  /**
   * Concatenates multiple matrices row-wise.
   * @param {number} cols_C - The number of columns in the concatenated matrix.
   * @param {...Array} args - The matrices to concatenate.
   * @returns {Array} The concatenated matrix.
   */
  concatRow(cols_C, ...args) {
    var N = args.length;
    var rows_C = args.reduce((a, e) => a += e.length, 0) / cols_C;
    
    var C = new Array(rows_C * cols_C).fill(0);
    
    var p = 0;
    for(var j = 0; j < cols_C; j++) {
      for(var k = 0; k < N; k++) {  
        var P = args[k].length / cols_C;
        for(var i = 0; i < P; i++) {
          C[p++] = args[k][j*P+i];
        }
      }
    }
    return C;
  }

  /**
   * Concatenates multiple matrices column-wise.
   * @param {number} rows_C - The number of rows in the concatenated matrix.
   * @param {...Array} args - The matrices to concatenate.
   * @returns {Array} The concatenated matrix.
   */
  concatCol(rows_C, ...args) {
    return args.flat();
  }
  
  /**
   * Repeats a row vector multiple times.
   * @param {Array} A - The row vector to repeat.
   * @param {number} rows - The number of times to repeat the row.
   * @returns {Array} The repeated row matrix.
   */
  repRow(A, rows) {
    var cols = A.length;
    var C = new Array(cols * rows).fill(0);
    for(var i = 0; i < cols; i++) {
      for(var j = 0; j < rows; j++) {
        C[i*rows+j] = A[i];
      }
    }
    return C;
  }

  /**
   * Repeats a column vector multiple times.
   * @param {Array} A - The column vector to repeat.
   * @param {number} cols - The number of times to repeat the column.
   * @returns {Array} The repeated column matrix.
   */
  repCol(A, cols) {
    var rows = A.length;
    var C = new Array(cols * rows).fill(0);
    for(var i = 0; i < cols; i++) {
      for(var j = 0; j < rows; j++) {
        C[i*rows+j] = A[j];
      }
    }
    return C;
  }

  /**
   * Sums the elements of each row in a matrix.
   * @param {Array<number>} A - The matrix array.
   * @param {number} rows - The number of rows in the matrix.
   * @param {number} cols - The number of columns in the matrix.
   * @returns {number[]} An array containing the sum of each row.
   */
  sumRow(A, rows, cols) {
    var C = new Array(rows).fill(0);
    for(var i = 0; i < rows; i++) {
      for(var j = 0; j < cols; j++) {
        C[i] += A[i*cols+j];
      }
    }
    return C;
  }
  
  /**
   * Sums the elements of each column in a matrix.
   * @param {Array<number>} A - The matrix array.
   * @param {number} rows - The number of rows in the matrix.
   * @param {number} cols - The number of columns in the matrix.
   * @returns {number[]} An array containing the sum of each column.
   */
  sumCol(A, rows, cols) {
    var C = new Array(cols).fill(0);
    for(var j = 0; j < cols; j++) {
      for(var i = 0; i < rows; i++) {
        C[j] += A[j*rows+i];
      }
    }
    return C;
  }

  /**
   * Calculates the Euclidean norm of each row in a matrix.
   * @param {Array<number>} A - The matrix array.
   * @param {number} rows - The number of rows in the matrix.
   * @param {number} cols - The number of columns in the matrix.
   * @returns {number[]} An array containing the norm of each row.
   */
  normRow(A, rows, cols) {
    var C = new Array(rows).fill(0);
    for(var i = 0; i < rows; i++) {
      for(var j = 0; j < cols; j++) {
        C[i] += pow(A[i*cols+j], 2);
      }
      C[i] = sqrt(C[i]);
    }
    return C;
  }
  
  /**
   * Calculates the Euclidean norm of each column in a matrix.
   * @param {Array<number>} A - The matrix array.
   * @param {number} rows - The number of rows in the matrix.
   * @param {number} cols - The number of columns in the matrix.
   * @returns {number[]} An array containing the norm of each column.
   */
  normCol(A, rows, cols) {
    var C = new Array(cols).fill(0);
    for(var j = 0; j < cols; j++) {
      for(var i = 0; i < rows; i++) {
        C[j] += pow(A[j*rows+i], 2);
      }
      C[j] = sqrt(C[j]);
    }
    return C;
  }

  /**
   * Transposes a matrix.
   * @param {Array<number>} A - The matrix array to transpose.
   * @param {number} rows - The number of rows in the original matrix.
   * @param {number} cols - The number of columns in the original matrix.
   * @returns {Array<number>} The transposed matrix array.
   */
  transpose(A, rows, cols) {
    var C = new Array(rows * cols).fill(0);
    for(var i = 0; i < rows; i++) {
      for(var j = 0; j < cols; j++) {
        C[j * rows + i] = A[i * cols + j];
      }
    }
    return C;
  }
  
  /**
   * Multiplies two matrices.
   * @param {Array<number>} A - The first matrix array.
   * @param {Array<number>} B - The second matrix array.
   * @param {number} rows_A - The number of rows in matrix A.
   * @param {number} cols_A - The number of columns in matrix A.
   * @param {number} cols_B - The number of columns in matrix B.
   * @returns {Array<number>} The resulting matrix array after multiplication.
   */
  multiply(A, B, rows_A, cols_A, cols_B) {
    var C = new Array(rows_A * cols_B).fill(0);
    for(var i = 0; i < rows_A; i++) {
      for(var j = 0; j < cols_A; j++) {
        for(var k = 0; k < cols_B; k++) {
          C[k * rows_A + i] += A[j * rows_A + i] * B[k * cols_A + j];
        }
      }
    }
    return C;
  }

  /**
   * Performs element-wise dot product on columns of two matrices.
   * @param {Array<number>} A - The first matrix array.
   * @param {Array<number>} B - The second matrix array.
   * @param {number} rows - The number of rows in each matrix.
   * @param {number} cols - The number of columns in each matrix.
   * @returns {Array<number>} An array containing the dot product of each column.
   */
  dotColumn(A, B, rows, cols) {
    var C = new Array(cols).fill(0);
    for(var j = 0; j < cols; j++) {
      for(var i = 0; i < rows; i++) {
        C[j] += A[j * rows + i] * B[j * rows + i];
      }
    }
    return C;
  }

  /**
   * Creates a diagonal matrix from a given array.
   * @param {number[]} A - The array to form the diagonal.
   * @param {number} length - The size of the square matrix.
   * @returns {Array<number>} The diagonal matrix as a 1D array.
   */
  diag(A, length) {
    var B = new Array(length*length).fill(0);
    for(var i = 0; i < length; i++) {
      B[i * length + i] = A[i];
    }
    return B;
  }
  
  /**
   * Solves a linear system of equations using LU decomposition.
   * @param {Array<number>} A - The coefficient matrix.
   * @param {Array<number>} B - The constant terms.
   * @param {number} N - The size of the matrix (NxN).
   * @returns {Array<number>} The solution vector.
   */
  linsolve(A, B, N) {
    return this.reshape(this.jsl.env.math.lusolve(this.reshape(A, N, N), B), 1, N);
  }
  
  /**
   * Computes the reciprocal of each element in the array.
   * @param {Array<number>} A - The array of numbers.
   * @param {number} length - The number of elements in the array.
   * @returns {Array<number>} An array containing the reciprocals of the original elements.
   */
  reciprocal(A, length) {
    var B = new Array(length).fill(0);
    for(var i = 0; i < length; i++) {
      B[i] = 1 / A[i];
    }
    return B;
  }

  /**
   * Reshapes an array into a new dimension.
   * @param {Array} A - The array to reshape.
   * @param {number} rows - The number of rows in the new shape.
   * @param {number} cols - The number of columns in the new shape.
   * @returns {Array} The reshaped array.
   * @throws {Error} If the total number of elements does not match.
   */
  reshape(A, rows, cols) {
    let flat_arr = [];

    if(Array.isArray(A[0])) {
      var numRows = A.length;
      var numCols = A[0].length;

      for(let j = 0; j < numCols; j++) {
        for(let i = 0; i < numRows; i++) {
          flat_arr.push(A[i][j]);
        }
      }
    } else {
      flat_arr = A.slice();
    }

    if(flat_arr.length !== rows * cols) {
      this.jsl.env.error('@reshape: '+language.string(178));
    }

    var reshaped = Array.from({ length: rows }, () => Array(cols));

    for(let j = 0; j < cols; j++) {
      for(let i = 0; i < rows; i++) {
        var index = j * rows + i;
        reshaped[i][j] = flat_arr[index];
      }
    }

    if(rows == 1 || cols == 1) {
      reshaped = reshaped.flat();
    }
    return reshaped;
  }

  /**
   * Finds the maximum element in the array and its index, excluding NaN values.
   * @param {number[]} A - The array to search.
   * @returns {Array} An array containing the max value and its index.
   * @throws {TypeError} If the input is not an array.
   * @throws {Error} If the array is empty or only contains NaN values.
   */
  maxi(A) {
    if(!Array.isArray(A)) {
      this.jsl.env.error('@maxi: '+language.string(190));
    }

    const filtered_A = A.filter(num => !isNaN(num));
    if(filtered_A.length === 0) {
      this.jsl.env.error('@maxi: '+language.string(191));
    }

    let max = filtered_A[0];
    let index = A.indexOf(max);

    for(let i = 1; i < A.length; i++) {
      const current = A[i];
      if(!isNaN(current) && current > max) {
        max = current;
        index = i;
      }
    }

    return [max, index];
  }

  /**
   * Finds the minimum element in the array and its index, excluding NaN values.
   * @param {number[]} A - The array to search.
   * @returns {Array} An array containing the min value and its index.
   * @throws {TypeError} If the input is not an array.
   * @throws {Error} If the array is empty or only contains NaN values.
   */
  mini(A) {
    if(!Array.isArray(A)) {
      this.jsl.env.error('@mini: '+language.string(190));
    }

    const filtered_A = A.filter(num => !isNaN(num));
    if(filtered_A.length === 0) {
      this.jsl.env.error('@mini: '+language.string(191));
    }

    let min = filtered_A[0];
    let index = A.indexOf(min);

    for(let i = 1; i < A.length; i++) {
      const current = A[i];
      if(!isNaN(current) && current < min) {
        min = current;
        index = i;
      }
    }

    return [min, index];
  }

  /**
   * Sorts the array in ascending order with indices, excluding NaN values.
   * @param {number[]} A - The array to sort.
   * @returns {Array} An array containing the sorted values and their original indices.
   * @throws {TypeError} If the input is not an array.
   */
  sorti(A) {
    if(!Array.isArray(A)) {
      this.jsl.env.error('@sorti: '+language.string(190));
    }

    // Create an array of indices and sort based on values in A,
    // with NaNs sorted to the end.
    const indices = A.map((_, idx) => idx);
    indices.sort((i, j) => {
      if(isNaN(A[i]) && isNaN(A[j])) return 0;
      if(isNaN(A[i])) return 1;
      if(isNaN(A[j])) return -1;
      return A[i] - A[j];
    });

    // Map the sorted indices to the sorted values
    const sorted_scores = indices.map(i => A[i]);
    return [sorted_scores, indices];
  }

  /**
   * Generates an array with random floating-point numbers within a specified range.
   * @param {number} l - The lower bound of the range.
   * @param {number} u - The upper bound of the range.
   * @param {number} rows - The number of rows.
   * @param {number} cols - The number of columns.
   * @param {Function} [randFun=Math.random] - The random function to use.
   * @returns {Array<number>} An array filled with random numbers within the specified range.
   */
  arrayRand(l, u, rows, cols, randFun) {
    if(!this.jsl.format.isFunction(randFun)) {
      randFun = Math.random;
    }
    return this.plus(this.repCol(l, cols), this.multiplyEl(repCol(minus(u, l), cols), Array.from({ length: rows * cols }, () => randFun())));
  }
  
  /**
   * Generates an array with random integer numbers within a specified range.
   * @param {number[]} lu - An array containing the lower and upper bounds [lower, upper].
   * @param {number} rows - The number of rows.
   * @param {number} cols - The number of columns.
   * @param {Function} [randFun=Math.random] - The random function to use.
   * @returns {Array<number>} An array filled with random integers within the specified range.
   */
  arrayRandi(lu, rows, cols, randFun) {
    if(!this.jsl.format.isFunction(randFun)) {
      randFun = Math.random;
    }
    return Array.from({ length: rows * cols }, () => Math.floor(randFun() * (lu[1] - lu[0] + 1) + lu[0]));
  }
  
  /**
   * Normalizes a 3D vector.
   * @param {number[]} v - The vector to normalize.
   * @returns {number[]} The normalized vector.
   */
  normalizeVector(v) {
    var len = this.jsl.env.math.norm(v);
    if(len === 0) return [0, 0, 0];
    return [v[0]/len, v[1]/len, v[2]/len];
  }

  /**
   * Computes the dot product of two 3D vectors.
   * @param {number[]} a - The first vector.
   * @param {number[]} b - The second vector.
   * @returns {number} The dot product of the vectors.
   */
  dotVector(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  }
  
  /**
   * Creates a skew-symmetric matrix from a 3D vector.
   * @param {number[]} v - The vector to skew.
   * @returns {number[]} The skew-symmetric matrix as a 1D array.
   */
  skewVector(v) {
    return [
      0, v[2], -v[1],
      -v[2], 0, v[0],
      v[1], -v[0], 0
    ];
  }

  /**
   * Generates coordinate matrices from coordinate vectors.
   * @param {number[]} x - The x-coordinates.
   * @param {number[]} y - The y-coordinates.
   * @returns {Array} The meshgrid arrays [X, Y].
   */
  meshgrid(x, y) {
    // Create X array where each row is a copy of x
    const X = Array.from({ length: y.length }, () => Array.from(x));

    // Create Y array where each column is a copy of y
    const Y = Array.from({ length: y.length }, (_, i) => 
      Array.from({ length: x.length }, () => y[i])
    );

    return [ X, Y ];
  }
  
  /**
   * Displays a matrix with a variable name.
   * @param {string} varname - The name of the variable.
   * @param {number[]} A - The matrix array.
   * @param {number} rows - The number of rows in the matrix.
   * @param {number} cols - The number of columns in the matrix.
   * @returns {string} The string representation of the matrix.
   */
  dispMatrix(varname, A, rows, cols) {
    var str = ' ' + varname + ' = [\n';
    for(var i = 0; i < rows; i++) {
      str += '  ';
      for(var j = 0; j < cols; j++) {
        str += num2str(A[j * rows + i], 8) + ' ';
      }
      str += '\n';
    }
    str += ' ]';
    this.jsl.env.disp(str);
    return str+"\n";
  }

  /**
   * Displays a row vector with a variable name.
   * @param {string} varname - The name of the variable.
   * @param {number[]} A - The row vector array.
   * @param {number} length - The length of the row vector.
   * @returns {string} The string representation of the row vector.
   */
  dispRowVector(varname, A, length) {
    var str = ' ' + varname + ' = [ ';
    for(var i = 0; i < length; i++) {
      str += num2str(A[i], 8) + ' ';
    }
    str += ']';
    this.jsl.env.disp(str);
    return str+"\n";
  }

  /**
   * Displays a column vector with a variable name.
   * @param {string} varname - The name of the variable.
   * @param {number[]} A - The column vector array.
   * @param {number} length - The length of the column vector.
   * @returns {string} The string representation of the column vector.
   */
  dispColumnVector(varname, A, length) {
    var str = ' ' + varname + ' = [\n';
    for(var j = 0; j < length; j++) {
      str += '  ' + num2str(A[j], 8) + '\n';
    }
    str += ' ]';
    this.jsl.env.disp(str);
    return str+"\n";
  }
}

exports.PRDC_JSLAB_LIB_ARRAY = PRDC_JSLAB_LIB_ARRAY;