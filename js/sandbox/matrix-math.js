/**
 * @file JSLAB library matrix math submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB matrix math submodule.
 */
class PRDC_JSLAB_MATRIX_MATH {

  /**
   * Constructs a matrix math submodule object with access to JSLAB's math functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    this.jsl = jsl;
  }
  
  /**
   * Creates a new matrix.
   * @param {Array} A - The matrix data.
   * @param {number} rows - Number of rows.
   * @param {number} cols - Number of columns.
   * @returns {PRDC_JSLAB_MATRIX} A new matrix instance.
   */
  new(A, rows, cols) {
    return new PRDC_JSLAB_MATRIX(this.jsl, A, rows, cols);
  }

  /**
   * Creates a matrix filled with a specific value.
   * @param {number} v - The value to fill the matrix with.
   * @param {number} rows - Number of rows.
   * @param {number} [cols=rows] - Number of columns.
   * @returns {PRDC_JSLAB_MATRIX} The filled matrix.
   */
  fill(v, rows, cols) {
    if(!cols) {
      cols = rows;
    }
    return new PRDC_JSLAB_MATRIX(this.jsl, 
      this.jsl.array.createFilledArray(rows * cols, v), rows, cols);
  }
  
  /**
   * Creates a matrix filled with NaN values.
   * @param {number} rows - Number of rows.
   * @param {number} [cols=rows] - Number of columns.
   * @returns {PRDC_JSLAB_MATRIX} The NaN-filled matrix.
   */
  NaNs(rows, cols) {
    if(!cols) {
      cols = rows;
    }
    return this.fill(NaN, rows, cols);
  }
  
  /**
   * Creates a matrix filled with ones.
   * @param {number} rows - Number of rows.
   * @param {number} [cols=rows] - Number of columns.
   * @returns {PRDC_JSLAB_MATRIX} The ones-filled matrix.
   */
  ones(rows, cols) {
    if(!cols) {
      cols = rows;
    }
    return this.fill(1, rows, cols);
  }
  
  /**
   * Creates a matrix filled with zeros.
   * @param {number} rows - Number of rows.
   * @param {number} [cols=rows] - Number of columns.
   * @returns {PRDC_JSLAB_MATRIX} The zeros-filled matrix.
   */
  zeros(rows, cols) {
    if(!cols) {
      cols = rows;
    }
    return this.fill(0, rows, cols);
  }
  
  /**
   * Creates a diagonal matrix from an array.
   * @param {Array} A - The array to create the diagonal matrix from.
   * @returns {PRDC_JSLAB_MATRIX} The diagonal matrix.
   */
  diag(A) {
    return new PRDC_JSLAB_MATRIX(this.jsl, 
      this.jsl.array.diag(A, A.length), A.length, A.length);
  }
  
  /**
   * Creates an identity matrix of a given size.
   * @param {number} size - The size of the identity matrix.
   * @returns {PRDC_JSLAB_MATRIX} The identity matrix.
   */
  eye(size) {
    return new PRDC_JSLAB_MATRIX(this.jsl, 
      this.jsl.array.diag(this.jsl.array.ones(size), size), size, size);
  }
  
  /**
   * Concatenates multiple matrices vertically (row-wise).
   * @param {...PRDC_JSLAB_MATRIX} args - Matrices to concatenate.
   * @returns {PRDC_JSLAB_MATRIX} The concatenated matrix.
   */
  concatRow(...args) {
    var N = args.length;
    var cols = args[0].cols;
    var rows = args.reduce((a, e) => a += e.rows, 0);
    var A = new Array(cols * rows).fill(0);
    
    var p = 0;
    for(var j = 0; j < cols; j++) {
      for(var k = 0; k < N; k++) {  
        var P = args[k].data.length / cols;
        for(var i = 0; i < P; i++) {
          A[p++] = args[k].data[j*P+i];
        }
      }
    }
    return this.new(A, rows, cols);
  }

  /**
   * Concatenates multiple matrices horizontally (column-wise).
   * @param {...PRDC_JSLAB_MATRIX} args - Matrices to concatenate.
   * @returns {PRDC_JSLAB_MATRIX} The concatenated matrix.
   */
  concatCol(...args) {
    var rows = args[0].rows;
    var A = args.map((a) => a.data).flat();
    return this.new(A, rows, A.length / rows);
  }

  /**
   * Checks if the provided object is a matrix.
   * @param {Object} A - The object to check.
   * @returns {boolean} True if A is a matrix, else false.
   */
  isMatrix(A) {
    return A instanceof PRDC_JSLAB_MATRIX;
  }
}

exports.PRDC_JSLAB_MATRIX_MATH = PRDC_JSLAB_MATRIX_MATH;

/**
 * Class for JSLAB matrix.
 */
class PRDC_JSLAB_MATRIX {
  
  #jsl;
  #rows;
  #cols;
  
  /**
   * Constructs a JSLAB matrix.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   * @param {Array} A - The matrix data.
   * @param {number} rows - Number of rows.
   * @param {number} cols - Number of columns.
   */
  constructor(jsl, A, rows, cols) {
    this.#jsl = jsl;
    this._set(A, rows, cols);
  }
  
  /**
   * Sets the matrix data and dimensions.
   * @param {Array} A - The matrix data.
   * @param {number} rows - Number of rows.
   * @param {number} cols - Number of columns.
   */
  _set(A, rows, cols) {
    this.rows = rows;
    this.cols = cols;
    if(!rows) {
      this.rows = A.length;
    }
    if(!cols) {
      this.cols = A[0].length;
    }
    if(Array.isArray(A[0])) {
      this.data = this.#jsl.array.transpose(A.flat(), this.rows, this.cols);
    } else {
      this.data = [...A];
    }
  }

  /**
   * Extracts a specific column from a matrix.
   * @param {number} index - The index of the column to extract.
   * @returns {Array} The extracted column as an array.
   */
  column(index) {
    return this.#jsl.array.column(this.toArray(), index);
  }

  /**
   * Extracts a specific row from a matrix.
   * @param {number} index - The index of the row to extract.
   * @returns {Array} The extracted row as an array.
   */
  row(index) {
    return this.#jsl.array.row(this.toArray(), index);
  }
  
  /**
   * Gets the length of the matrix along a specified dimension.
   * @param {number} dim - The dimension (0 for rows, 1 for columns).
   * @returns {number} The length along the specified dimension.
   */
  length(dim) {
    return this.size(dim);
  }
  
  /**
   * Gets the number of elements in the matrix.
   * @returns {number} The number of elements.
   */
  numel() {
    return this.rows * this.cols;
  }
  
  /**
   * Gets the size of the matrix along a specified dimension.
   * @param {number} dim - The dimension (0 for rows, 1 for columns).
   * @returns {number} The size along the specified dimension.
   */
  size(dim) {
    var s = [this.rows, this.cols];
    if(typeof dim == 'undefined') {
      return s;
    }
    return s[dim];
  }
  
  /**
   * Reshapes the matrix to the specified dimensions.
   * @param {number} rows - New number of rows.
   * @param {number} cols - New number of columns.
   * @returns {PRDC_JSLAB_MATRIX} The reshaped matrix.
   */
  reshape(rows, cols) {
    return this.#jsl.mat.new(this.#jsl.array.reshape(this.data, 
      rows, cols), rows, cols);
  }
  
  /**
   * Replicates the matrix a specified number of times.
   * @param {number} rowReps - Number of row repetitions.
   * @param {number} colReps - Number of column repetitions.
   * @returns {PRDC_JSLAB_MATRIX} The replicated matrix.
   */
  repmat(rowReps, colReps) {
    var cols;
    if(colReps > 1) {
      cols = this.#jsl.array.createFilledArray(colReps, this);
      cols = this.#jsl.mat.concatCol(...cols);
    } else {
      cols = this;
    }
    
    var A;
    if(rowReps > 1) {
      var rows = this.#jsl.array.createFilledArray(rowReps, cols);
      A = this.#jsl.mat.concatRow(...rows);
    } else {
      A = cols;
    }

    return A;
  }

  /**
   * Transposes the matrix.
   * @returns {PRDC_JSLAB_MATRIX} The transposed matrix.
   */
  transpose() {
    return this.#jsl.mat.new(this.#jsl.array.transpose(this.data, this.rows, this.cols), 
      this.cols, this.rows);
  }

  /**
   * Computes the inverse of the matrix.
   * @returns {PRDC_JSLAB_MATRIX} The inverse matrix.
   */
  inv() {
    return this.#jsl.mat.new(this.#jsl.env.math.inv(this.toArray()));
  }
  
  /**
   * Computes the determinant of the matrix.
   * @returns {number} The determinant.
   */
  det() {
    return this.#jsl.env.math.det(this.toArray());
  }

  /**
   * Computes the trace of the matrix (sum of diagonal elements).
   * @returns {number} The trace of the matrix.
   */
  trace() {
    return this.#jsl.env.math.trace(this.toArray());
  }

  /**
   * Computes the Frobenius norm of the matrix.
   * @returns {number} The Frobenius norm.
   */
  norm(p = 2) {
    return this.#jsl.env.math.norm(this.toArray(), p);
  }

  /**
   * Raises the matrix to a power.
   * @param {number} p - The exponent.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  powm(p) {
    return this.#jsl.mat.new(this.#jsl.env.math.pow(this.toArray(), p));
  }

  /**
   * Computes the matrix exponential.
   * @returns {PRDC_JSLAB_MATRIX} The exponential matrix.
   */
  expm() {
    return this.#jsl.mat.new(this.#jsl.env.math.expm(this.toArray())._data);
  }
  
  /**
   * Adds two matrices.
   * @param {PRDC_JSLAB_MATRIX} A - The matrix to add.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  add(A) {
    return this.#jsl.mat.new(this.#jsl.array.plus(this.data, A.data), 
      this.rows, this.cols);
  }

  /**
   * Adds two matrices (alias for add).
   * @param {PRDC_JSLAB_MATRIX} A - The matrix to add.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  plus(A) {
    return this.add(A);
  }

  /**
   * Subtracts matrix A from the current matrix.
   * @param {PRDC_JSLAB_MATRIX} A - The matrix to subtract.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  subtract(A) {
    return this.#jsl.mat.new(this.#jsl.array.minus(this.data, A.data), 
      this.rows, this.cols);
  }

  /**
   * Subtracts matrix A from the current matrix (alias for subtract).
   * @param {PRDC_JSLAB_MATRIX} A - The matrix to subtract.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  minus(A) {
    return this.subtract(A);
  }

  /**
   * Multiplies two matrices.
   * @param {PRDC_JSLAB_MATRIX} A - The matrix to multiply with.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  multiply(A) {
    return this.#jsl.mat.new(this.#jsl.array.multiply(this.data, A.data, this.rows, this.cols, A.cols), this.rows, A.cols);
  }
  
  /**
   * Solves a linear system.
   * @param {PRDC_JSLAB_MATRIX} B - The right-hand side matrix.
   * @returns {PRDC_JSLAB_MATRIX} The solution matrix.
   */
  linsolve(B) {
    return this.#jsl.mat.new(this.#jsl.array.linsolve(this.data, B.data, this.cols), this.rows, 1);
  }
  
  /**
   * Divides each element by another matrix or scalar.
   * @param {PRDC_JSLAB_MATRIX|number} A - The matrix or scalar to divide by.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  divideEl(A) {
    if(this.#jsl.mat.isMatrix(A)) {
      return this.#jsl.mat.new(this.#jsl.array.divideEl(this.data, A.data), 
        this.rows, this.cols);
    } else {
      return this.#jsl.mat.new(this.#jsl.array.scale(this.data, 1 / A), 
        this.rows, this.cols);
    }
  }

  /**
   * Multiplies each element by another matrix or scalar.
   * @param {PRDC_JSLAB_MATRIX|number} A - The matrix or scalar to multiply by.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  multiplyEl(A) {
    if(this.#jsl.mat.isMatrix(A)) {
      return this.#jsl.mat.new(this.#jsl.array.multiplyEl(this.data, A.data), 
        this.rows, this.cols);
    } else {
      return this.#jsl.mat.new(this.#jsl.array.scale(this.data, A), 
        this.rows, this.cols);
    }
  }

  /**
   * Raises each element to a power.
   * @param {number} p - The exponent.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  powEl(p) {
    return this.#jsl.mat.new(this.#jsl.array.powEl(this.data, p), 
      this.rows, this.cols);
  }

  /**
   * Applies a function to each element of the matrix.
   * @param {function} func - The function to apply.
   * @returns {PRDC_JSLAB_MATRIX} The resulting matrix.
   */
  elementWise(func) {
    return this.#jsl.mat.new(this.#jsl.array.elementWise((a) => func(a), this.data), 
      this.rows, this.cols);
  }
  
  /**
   * Computes the reciprocal of each element in the matrix.
   * @returns {PRDC_JSLAB_MATRIX} The matrix with reciprocals.
   */
  reciprocal() {
    return this.#jsl.mat.new(this.#jsl.array.reciprocal(this.data, this.rows * this.cols), 
      this.rows, this.cols);
  }
  
  /**
   * Computes the sum of all elements in the matrix.
   * @returns {number} The sum of all elements.
   */
  sum() {
    return this.#jsl.env.math.sum(this.toArray());
  }

  /**
   * Sorts the elements of the matrix.
   * @param {string} [order='asc'] - The order of sorting ('asc' or 'desc').
   * @returns {PRDC_JSLAB_MATRIX} The sorted matrix.
   */
  sort() {
    return this.#jsl.env.math.sort(this.data);
  }

  /**
   * Finds the minimum element in the matrix.
   * @returns {number} The minimum value.
   */
  min() {
    return this.#jsl.env.math.min(this.toArray());
  }

  /**
   * Finds the maximum element in the matrix.
   * @returns {number} The maximum value.
   */
  max() {
    return this.#jsl.env.math.max(this.toArray());
  }
  
  /**
   * Creates a clone of the current matrix.
   * @returns {PRDC_JSLAB_MATRIX} A cloned matrix instance.
   */
  clone() {
    return this.#jsl.mat.new(this.data, this.rows, this.cols);
  }

  /**
   * Retrieves elements based on row and column indices.
   * @param {...(number|_)} args - Row and column indices.
   * @returns {Array} The selected elements.
   */
  index(rows_in, cols_in) {
    var rows;
    var cols;
    if(rows_in === _) {
      rows = range(0, this.rows - 1);
    } else {
      rows = rows_in;
    }
    if(cols_in === _) {
      cols = range(0, this.cols - 1);
    } else {
      cols = cols_in;
    }
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
        A[k++] = rows[i] + cols[j] * this.rows;
      }
    }
    
    return A;
  }
  
  /**
   * Sets a subset of the matrix elements.
   * @param {...*} args - Indices and values to set.
   */
  setSub(...args) {
    var A = args.map(function(a) {
      if(!Array.isArray(a) && a !== _) {
        a = [a];
      }
      return a;
    });
    
    var indices;
    var B;
    if(A.length == 3) {
      indices = this.index(A[0], A[1]);
      B = A[2];
    } else {
      indices = A[0];
      if(indices == _) {
        indices = range(0, this.rows * this.cols - 1);
      }
      B = A[1];
    }
    
    var j = 0;
    for(var i = 0; i < indices.length; i++) {
      if(this.#jsl.mat.isMatrix(B[0])) {
        this.data[indices[i]] = B[0].data[j++];
      } else if(Array.isArray(B) && B.length == indices.length) {
        this.data[indices[i]] = B[j++];
      } else {
        this.data[indices[i]] = B[0];
      }
    }
  }

  /**
   * Gets a subset of the matrix elements.
   * @param {...*} args - Indices to retrieve.
   * @returns {PRDC_JSLAB_MATRIX} The subset matrix.
   */
  getSub(...args) {
    var indices;
    var rows;
    var cols;
    var A = args.map(function(a) {
      if(!Array.isArray(a) && a !== _) {
        a = [a];
      }
      return a;
    });
    
    if(A.length == 1) {
      indices = A[0];
      rows = indices.length;
      cols = 1;
    } else {
      if(A[0] === _) {
        rows = this.rows;
      } else {
        rows = A[0].length;
      }
      if(A[1] === _) {
        cols = this.cols;
      } else {
        cols = A[1].length;
      }
      indices = this.index(A[0], A[1]);
    }
    
    var B = this.#jsl.array.createFilledArray(indices.length, 0);
    var j = 0;
    for(var i = 0; i < indices.length; i++) {
      B[j++] = this.data[indices[i]];
    }
    return this.#jsl.mat.new(B, rows, cols);
  }
  
  /**
   * Converts the matrix to a two-dimensional array.
   * @returns {Array} The matrix data as a two-dimensional array.
   */
  toArray() {
    return this.#jsl.array.reshape(this.data, this.rows, this.cols);
  }
  
  /**
   * Converts the matrix to a one-dimensional array.
   * @returns {Array} The matrix data as a one-dimensional array.
   */
  toFlatArray() {
    return this.data;
  }
  
  /**
   * Returns a string representation of the matrix.
   * @returns {string} The string representation of the matrix.
   */
  toString() {
    var str = 'Matrix([ \n';
    for(var i = 0; i < this.rows; i++) {
      str += '  [';
      for(var j = 0; j < this.cols; j++) {
        str += this.data[j * this.rows + i] + ', ';
      }
      str = str.slice(0, -2);
      str += '],\n';
    }
    str = str.slice(0, -2);
    str += '\n])';    
    return str;
  }
  
  /**
   * Returns a JSON representation of the matrix.
   * @returns {Array} The matrix data as a two-dimensional array.
   */
  toJSON() {
    return this.toArray();
  }
  
  /**
   * Returns a safe JSON representation of the matrix.
   * @returns {Array} The matrix data as a two-dimensional array.
   */
  toSafeJSON() {
    return this.toJSON();
  }
  
  /**
   * Returns a pretty string representation of the matrix.
   * @returns {string} The pretty string representation of the matrix.
   */
  toPrettyString() {
    return this.toString();
  }
}
