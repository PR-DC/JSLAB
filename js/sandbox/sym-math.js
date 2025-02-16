/**
 * @file JSLAB library symbolic submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB symbolic submodule.
 */
class PRDC_JSLAB_SYMBOLIC_MATH {
  
  /**
   * Constructs a symbolic submodule object with access to JSLAB's symbolic functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    
    this.loaded = false;
    
    this._var_counter = 0;
    this._symbols = [];
  }
  
  /**
   * Loads the symbolic math libraries (SymPy and NumPy) using Pyodide.
   * Initializes the Python environment for symbolic computations.
   * @returns {Promise<void>} A promise that resolves when the libraries are loaded.
   */
  async load() {
    if(!this.loaded) {
      this.pyodide = await loadPyodide({ 
        indexURL: app_path+'/lib/sympy-0.26.2/'
      });
      await this.pyodide.loadPackage(['sympy', 'numpy'], { messageCallback: () => {}});
      this.loaded = true;
      this.pyodide.runPython('globals().clear()');
      this.pyodide.runPython(`
        from sympy import *
        import numpy as np
      `);
    }
  }
  
  /**
   * Generates the next unique variable name for symbolic expressions.
   * @returns {string} The next unique variable name (e.g., 'jslabVar1').
   */
  _nextVar() {
    this._var_counter += 1;
    return 'jslabVar'+this._var_counter;
  }
  
  /**
   * Creates a new symbolic variable with an optional name and value.
   * @param {string} [name] - The name of the symbolic variable. If undefined, a unique name is generated.
   * @param {*} [value] - The initial value of the symbolic variable.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The newly created symbolic variable.
   */
  _newSymbol(name, value) {
    if(typeof name == 'undefined') {
      name = this._nextVar();
    }
    var symbol = new PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL(name, value);
    this._symbols.push(symbol);
    return symbol;
  }
  
  /**
   * Retrieves the name of a symbolic variable.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} symbol - The symbolic variable or its name.
   * @returns {string} The name of the symbolic variable.
   */
  getSymbolName(symbol) {
    if(typeof symbol == 'object' && symbol.constructor.name === 'PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL') {
      return symbol.name;
    } else {
      return symbol;
    }
  }
  
  /**
   * Checks if the symbolic libraries are loaded. Throws an error if not.
   * @throws {Error} If the symbolic libraries are not loaded.
   */
  checkLoaded() {
    if(!this.loaded) {
      this.jsl.env.error('@sym: '+language.string(175));
    }
  }
  
  /**
   * Evaluates a Python code string within the symbolic math environment.
   * @param {string} code - The Python code to evaluate.
   * @returns {*} The result of the evaluated code.
   * @throws {Error} If there is an error during code evaluation.
   */
  eval(code) {
    this.checkLoaded();
    if(this.jsl.config.DEBUG_SYM_PYTHON_EVAL_CODE) {
      this.jsl._console.log('@sym: eval: ' + code);
    }
    try {
      return this.pyodide.runPython(code);
    } catch(err) {
      this.jsl.env.error('@sym: ' + err);
    }
    return false;
  }
  
  /**
   * Creates a single symbolic variable.
   * @param {string} name - The name of the symbolic variable.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The created symbolic variable.
   */
  sym(name) {
    this.checkLoaded();
    
    this.eval(`${name} = Symbol('${name}')`);
    return this._newSymbol(name, name);
  }
  
  /**
   * Creates multiple symbolic variables.
   * @param {string[]} names - An array of names for the symbolic variables.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL[]} An array of created symbolic variables.
   */
  syms(names) {
    var obj = this;
    this.checkLoaded();
    
    this.eval(`${names.join(', ')} = symbols('${names.join(' ')}')`);
    
    var symbols = [];
    names.forEach(function(name) {
      symbols.push(obj._newSymbol(name, name));
    });
    return symbols;
  }
  
  /**
   * Creates a symbolic matrix from a nested array expression.
   * @param {Array<Array<PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number>>} expr - The nested array representing the matrix.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The symbolic matrix.
   */
  mat(expr) {
    this.checkLoaded();
    
    expr = JSON.stringify(expr.map(row => row.map(el => this.getSymbolName(el)))).replaceAll('"', '');
    
    var symbol = this._newSymbol();
    symbol.setValue(this.eval(`
      ${symbol.name} = Matrix(${expr})
      ${symbol.name}
    `));
    return symbol;
  }
  
  /**
   * Multiplies multiple symbolic expressions.
   * @param {...PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} args - The symbolic expressions to multiply.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The resulting symbolic expression after multiplication.
   */
  mul(...args) {
    var obj = this;
    this.checkLoaded();
    
    var expr = args
      .map(function(item) {
        return obj.getSymbolName(item);
      }).join(' * '); 
      
    var symbol = this._newSymbol();
    symbol.setValue(this.eval(`
      ${symbol.name} = ${expr}
      ${symbol.name}
    `));
    return symbol;
  }

  /**
   * Divides multiple symbolic expressions.
   * @param {...PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} args - The symbolic expressions to divide.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The resulting symbolic expression after division.
   */
  div(...args) {
    var obj = this;
    this.checkLoaded();
    
    var expr = args
      .map(function(item) {
        return obj.getSymbolName(item);
      }).join(' / '); 
      
    var symbol = this._newSymbol();
    symbol.setValue(this.eval(`
      ${symbol.name} = ${expr}
      ${symbol.name}
    `));
    return symbol;
  }

  /**
   * Adds multiple symbolic expressions.
   * @param {...PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} args - The symbolic expressions to add.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The resulting symbolic expression after addition.
   */
  plus(...args) {
    var obj = this;
    this.checkLoaded();
    
    var expr = args
      .map(function(item) {
        return obj.getSymbolName(item);
      }).join(' + '); 
      
    var symbol = this._newSymbol();
    symbol.setValue(this.eval(`
      ${symbol.name} = ${expr}
      ${symbol.name}
    `));
    return symbol;
  }

  /**
   * Subtracts multiple symbolic expressions.
   * @param {...PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} args - The symbolic expressions to subtract.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The resulting symbolic expression after subtraction.
   */
  minus(...args) {
    var obj = this;
    this.checkLoaded();
    
    var expr = args
      .map(function(item) {
        return obj.getSymbolName(item);
      }).join(' - '); 
      
    var symbol = this._newSymbol();
    symbol.setValue(this.eval(`
      ${symbol.name} = ${expr}
      ${symbol.name}
    `));
    return symbol;
  }
  
  /**
   * Raises a symbolic expression to a power.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} expr - The base expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} n - The exponent.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The resulting symbolic expression after exponentiation.
   */
  pow(expr, n) {
    this.checkLoaded();
    
    expr = this.getSymbolName(expr);
    n = this.getSymbolName(n);
        
    var symbol = this._newSymbol();
    symbol.setValue(this.eval(`
      ${symbol.name} = ${expr}**${n}
      ${symbol.name}
    `));
    return symbol;
  }

  /**
   * Transposes a symbolic matrix expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr - The matrix expression to transpose.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The transposed matrix expression.
   */
  transp(expr) {
    this.checkLoaded();
    
    expr = this.getSymbolName(expr);
    
    var symbol = this._newSymbol();  
    symbol.setValue(this.eval(`
      ${symbol.name} = ${expr}.T
      ${symbol.name}
    `));
    return symbol;
  }
  
  /**
   * Computes the inverse of a symbolic matrix expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr - The matrix expression to invert.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The inverse of the matrix expression.
   */
  inv(expr) {
    this.checkLoaded();
    
    expr = this.getSymbolName(expr);
        
    var symbol = this._newSymbol();
    symbol.setValue(this.eval(`
      ${symbol.name} = ${expr}.inv()
      ${symbol.name}
    `));
    return symbol;
  }
  
  /**
   * Computes the determinant of a symbolic matrix expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr - The matrix expression whose determinant is to be computed.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The determinant of the matrix expression.
   */
  det(expr) {
    this.checkLoaded();
    
    expr = this.getSymbolName(expr);
        
    var symbol = this._newSymbol();
    symbol.setValue(this.eval(`
      ${symbol.name} = ${expr}.det()
      ${symbol.name}
    `));
    return symbol;
  }
  
  /**
   * Differentiates a symbolic expression with respect to a variable.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr - The expression to differentiate.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} x - The variable with respect to which differentiation is performed.
   * @param {number} [n=1] - The order of differentiation.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The differentiated expression.
   */
  diff(expr, x, n = 1) {
    this.checkLoaded();
    
    expr = this.getSymbolName(expr);
    
    var symbol = this._newSymbol();
    symbol.setValue(this.eval(`
      ${symbol.name} = diff(${expr}, ${x}, ${n})
      ${symbol.name}
    `));
    return symbol;
  }

  /**
   * Integrates a symbolic expression with respect to a variable.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr - The expression to integrate.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} x - The variable with respect to which integration is performed.
   * @param {Array<PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string>|undefined} lims - The limits of integration as [lower, upper]. If undefined, indefinite integration is performed.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The integrated expression.
   */
  intg(expr, x, lims) {
    this.checkLoaded();
    
    expr = this.getSymbolName(expr);
    x = this.getSymbolName(x);
    
    var symbol = this._newSymbol();
    if(lims) {
      lims[0] = this.getSymbolName(lims[0]);
      lims[1] = this.getSymbolName(lims[1]);
      symbol.setValue(this.eval(`
        ${symbol.name} = integrate(${expr}, (${x}, ${lims[0]}, ${lims[1]}))
        ${symbol.name}
      `));
    } else {
      symbol.setValue(this.eval(`
        ${symbol.name} = integrate(${expr}, ${x})
        ${symbol.name}
      `));
    }
    return symbol;
  }

  /**
   * Substitutes a value into a symbolic expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr - The expression in which to substitute.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} x - The variable to substitute.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number|Array} val - The value or array of values to substitute.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The expression after substitution.
   */
  subs(expr, x, val) {
    this.checkLoaded();
    
    expr = this.getSymbolName(expr);
    x = this.getSymbolName(x);
    
    var symbol = this._newSymbol();
    if(Array.isArray(val)) {
      val = JSON.stringify(val);
      symbol.setValue(this.eval(`
        ${symbol.name} = [${expr}.subs(${x}, val).evalf() for val in ${val}]
        ${symbol.name}
      `));
    } else {
      val = this.getSymbolName(val);
      if(isNumber(val)) {
        symbol.setValue(this.eval(`
          ${symbol.name} = ${expr}.subs(${x}, ${val}).evalf()
          ${symbol.name}
        `));
      } else {
        symbol.setValue(this.eval(`
          ${symbol.name} = ${expr}.subs(${x}, ${val})
          ${symbol.name}
        `));
      }
    }
    return symbol;
  }
  
  /**
   * Simplifies a symbolic expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr - The expression to simplify.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} The simplified expression.
   */
  simplify(expr) {
    this.checkLoaded();
    
    expr = this.getSymbolName(expr);
    
    var symbol = this._newSymbol();  
    symbol.setValue(this.eval(`
      ${symbol.name} = simplify(${expr})
      ${symbol.name}
    `));
    return symbol;
  }
  
  /**
   * Displays the LaTeX representation of a symbolic expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr - The expression to display in LaTeX format.
   */
  showLatex(expr) {
    expr = this.getSymbolName(expr);
    this.jsl.env.dispLatex(this.eval(`latex(${expr})`));
  }
  
  /**
   * Displays the LaTeX string of a symbolic expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr - The expression to convert to a LaTeX string.
   */
  dispLatex(expr) {
    expr = this.getSymbolName(expr);
    this.jsl.env.disp(this.eval(`latex(${expr})`));
  }
  
  /**
   * Clears all symbolic variables and resets the symbolic math environment.
   */
  clear() {
    if(this.loaded) {
      this.pyodide.runPython('globals().clear()');
      this.pyodide.runPython(`
        from sympy import *
        import numpy as np
      `);
      this._var_counter = 0;
      this._symbols = [];
    }
  }
}

exports.PRDC_JSLAB_SYMBOLIC_MATH = PRDC_JSLAB_SYMBOLIC_MATH;

/**
 * Class for JSLAB symbolic math symbol.
 */
class PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL {
  
  /**
   * Constructs a symbolic math symbol with a name and initial value.
   * @constructor
   * @param {string} name - The name of the symbolic variable.
   * @param {*} value - The initial value of the symbolic variable.
   */
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
  
  /**
   * Sets the value of the symbolic variable.
   * @param {*} value - The new value to assign to the symbolic variable.
   */
  setValue(value) {
    this.value = value;
    this.parsed_value = parseString(value.toString());
  }

  /**
   * Returns a string representation of the vector.
   * @returns {string} The string representation in the format 'Vector(x:, y:, z:)'.
   */
  toString() {
    return 'Symbolic(' + JSON.stringify(this.toJSON(), null, 2) + ')';
  }

  /**
   * Converts the symbolic value to a numeric value.
   * @returns {*} The numeric representation of the symbolic value.
   */
  toNumeric() {
    return this.parsed_value;
  }
  
  /**
   * Converts the symbolic value to a JSON string.
   * @returns {string} The JSON string representation of the symbolic value.
   */
  toJSON() {
    if(typeof this.parsed_value == undefined) {
      return this.name;
    }
    return this.parsed_value;
  }
  
  /**
   * Converts the object to a safe JSON representation.
   * @returns {Object} The safe JSON representation of the object.
   */
  toSafeJSON() {
    return this.toJSON();
  }
  
  /**
   * Converts the object to a pretty string representation.
   * @returns {string} The pretty string representation of the object.
   */
  toPrettyString() {
    return this.toString();
  }
}

/**
 * Parses a string representation of Python objects into JavaScript objects.
 * Specifically handles conversion of SymPy Matrix objects to nested arrays.
 * @param {string} str - The string to parse.
 * @returns {Array<Array<*>>|Array<Array<Array<*>>>} The parsed JavaScript representation of the input string.
 */
function parseString(str) {
  // Remove any leading or trailing square brackets if the input is a list
  const trimmed_str = str.trim().replace(/^\[|\]$/g, '');

  // Find all occurrences of "Matrix([[...]])" using regex
  const matrix_regex = /Matrix\(\[\[(.*?)\]\]\)/g;
  const matrices = [];
  let match;

  // Iterate over all matches of the regex
  while((match = matrix_regex.exec(trimmed_str)) !== null) {
    // Each match's first capture group contains the matrix content
    const matrix_content = match[1];

    // Split rows by detecting "],[" pattern
    const rows = matrix_content.split(/\],\s*\[/);

    // For each row, split by commas while ignoring any spaces
    const parsed_rows = rows.map(row => row.split(',').map(entry => {
      const trimmed_entry = entry.trim();
      // Convert numeric strings to numbers
      return isNaN(trimmed_entry) ? trimmed_entry : Number(trimmed_entry);
    }));

    // Push the parsed rows (matrix) into the matrices array
    matrices.push(parsed_rows);
  }

  // If only one Matrix(...) was found, return the array directly instead of wrapping in another array
  return matrices.length === 1 ? matrices[0] : matrices;
}