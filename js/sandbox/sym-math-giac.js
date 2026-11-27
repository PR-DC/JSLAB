/**
 * @file JSLAB Giac symbolic backend
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL } = require('./sym-math-sympy');

/**
 * Implements the symbolic API using Giac.
 */
class PRDC_JSLAB_SYMBOLIC_MATH_GIAC {

  /**
   * Creates a Giac symbolic-math backend for a workspace.
   * @param {Object} jsl JSLAB workspace.
   */
  constructor(jsl) {
    this.jsl = jsl;
    this.loaded = false;
    this._loading = null;
    this._var_counter = 0;
  }

  /**
   * Initializes Giac once, retrying on a subsequent call after a failure.
   */
  async load() {
    if(!this.loaded && !this._loading) {
      this._loading = this.jsl.inter.env._loadGiac().then(module => {
        this._evaluate = module.cwrap('caseval', 'string', ['string']);
        this._evaluate('shell off');
        this.loaded = true;
      }).finally(() => {
        this._loading = null;
      });
    }
    await this._loading;
  }

  /**
   * Ensures the Giac runtime has been initialized.
   * @throws {Error} When the runtime has not been loaded.
   */
  checkLoaded() {
    if(!this.loaded) {
      const message = '@sym: ' + this.jsl.inter.lang.string(175);
      this.jsl.inter.env.error(message);
      throw new Error(message);
    }
  }

  /**
   * Evaluates a Giac expression or command in this workspace's CAS context.
   * @param {string} code Giac source code.
   * @returns {string} Giac result text.
   * @throws {Error} When Giac reports an evaluation error.
   */
  eval(code) {
    this.checkLoaded();
    const result = this._evaluate(code);
    if(result.startsWith('GIAC_ERROR:')) {
      throw new Error('@sym: ' + result.slice('GIAC_ERROR:'.length).trim());
    }
    return result;
  }

  /**
   * Resolves a symbolic wrapper to its Giac variable name.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} symbol Symbol or literal value.
   * @returns {string|number} Giac variable name or unchanged literal value.
   */
  getSymbolName(symbol) {
    return symbol instanceof PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL ? symbol.name : symbol;
  }

  /**
   * Creates a symbolic variable after validating that Giac accepts its name.
   * @param {string} name Symbol name.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Created symbolic variable.
   */
  sym(name) {
    this.checkLoaded();
    if(typeof name !== 'string' || !/^[\p{L}_][\p{L}\p{N}_]*$/u.test(name)) {
      throw new Error('Invalid symbolic identifier: ' + name);
    }
    this.eval(this._expression('purge', [name]));
    if(this.eval(this._expression('type', [name])) !== 'identifier') {
      throw new Error('Giac reserves this symbolic identifier: ' + name);
    }
    return new PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL(this.jsl, name, name);
  }

  /**
   * Creates multiple symbolic variables.
   * @param {string[]} names Symbol names.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL[]} Created symbolic variables.
   */
  syms(names) {
    return names.map(name => this.sym(name));
  }

  /**
   * Creates a symbolic matrix from nested row values.
   * @param {Array<Array<PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number>>} rows Matrix rows.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored symbolic matrix.
   */
  mat(rows) {
    return this._store(this._source(rows));
  }

  /**
   * Multiplies symbolic expressions.
   * @param {...PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} args Factors.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored product.
   */
  mul(...args) {
    return this._arithmetic('*', args);
  }

  /**
   * Divides symbolic expressions from left to right.
   * @param {...PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} args Dividend and divisors.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored quotient.
   */
  div(...args) {
    return this._arithmetic('/', args);
  }

  /**
   * Adds symbolic expressions.
   * @param {...PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} args Terms.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored sum.
   */
  plus(...args) {
    return this._arithmetic('+', args);
  }

  /**
   * Subtracts symbolic expressions from left to right.
   * @param {...PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} args Initial term and subtrahends.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored difference.
   */
  minus(...args) {
    return this._arithmetic('-', args);
  }

  /**
   * Raises a symbolic expression to a power.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} expr Base expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number} n Exponent.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored power expression.
   */
  pow(expr, n) {
    return this._arithmetic('^', [expr, n]);
  }

  /**
   * Transposes a symbolic matrix.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Matrix expression.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored transposed matrix.
   */
  transp(expr) {
    return this._call('tran', [expr]);
  }

  /**
   * Computes the inverse of a symbolic matrix.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Matrix expression.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored inverse matrix.
   */
  inv(expr) {
    return this._call('inv', [expr]);
  }

  /**
   * Computes the determinant of a symbolic matrix.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Matrix expression.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored determinant.
   */
  det(expr) {
    return this._call('det', [expr]);
  }

  /**
   * Differentiates a symbolic expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Expression to differentiate.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} x Differentiation variable.
   * @param {number} [n=1] Derivative order.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored derivative.
   */
  diff(expr, x, n = 1) {
    return this._call('diff', [expr, x, n]);
  }

  /**
   * Integrates a symbolic expression, optionally between two limits.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Integrand.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} x Integration variable.
   * @param {Array<PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number>} [limits] Lower and upper limits.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored integral.
   */
  intg(expr, x, limits) {
    return this._call('integrate', [expr, x, ...(limits || [])]);
  }

  /**
   * Substitutes one or more values into a symbolic expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Source expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} x Variable to replace.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string|number|Array} val Replacement value or sample values.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored substituted expression or sample vector.
   */
  subs(expr, x, val) {
    const substitute = value => this._expression('subst', [expr, x, value]);
    if(Array.isArray(val)) {
      const samples = val.map(value => 'evalf(' + substitute(value) + ')');
      return this._store('[' + samples.join(',') + ']');
    }
    const result = substitute(val);
    return this._store(typeof val === 'number' ? 'evalf(' + result + ')' : result);
  }

  /**
   * Simplifies a symbolic expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Expression to simplify.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored simplified expression.
   */
  simplify(expr) {
    return this._call('simplify', [expr]);
  }

  /**
   * Renders a symbolic expression as formatted LaTeX output.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Expression to render.
   */
  showLatex(expr) {
    this.jsl.inter.env.dispLatex(this._latex(expr));
  }

  /**
   * Displays the LaTeX source for a symbolic expression.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Expression to convert.
   */
  dispLatex(expr) {
    this.jsl.inter.env.disp(this._latex(expr));
  }

  /**
   * Restarts Giac and clears the stored-symbol counter.
   */
  clear() {
    if(this.loaded) {
      this.eval('restart');
      this._var_counter = 0;
    }
  }

  /**
   * Converts wrapper objects and nested arrays to Giac argument syntax.
   * @param {*} value Symbolic wrapper, nested values or literal value.
   * @returns {string} Giac source representation.
   */
  _source(value) {
    if(Array.isArray(value)) {
      return '[' + value.map(entry => this._source(entry)).join(',') + ']';
    }
    return String(this.getSymbolName(value));
  }

  /**
   * Stores an arithmetic expression assembled with an infix operator.
   * @param {string} operator Giac infix operator.
   * @param {Array} args Expression operands.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored arithmetic result.
   */
  _arithmetic(operator, args) {
    return this._store(args.map(arg => '(' + this._source(arg) + ')').join(operator));
  }

  /**
   * Formats a Giac function call without evaluating it.
   * @param {string} name Giac function name.
   * @param {Array} args Function arguments.
   * @returns {string} Giac call expression.
   */
  _expression(name, args) {
    return name + '(' + args.map(arg => this._source(arg)).join(',') + ')';
  }

  /**
   * Evaluates and stores a Giac function call.
   * @param {string} name Giac function name.
   * @param {Array} args Function arguments.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored call result.
   */
  _call(name, args) {
    return this._store(this._expression(name, args));
  }

  /**
   * Converts a symbolic expression to unquoted LaTeX source.
   * @param {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL|string} expr Expression to convert.
   * @returns {string} LaTeX source.
   */
  _latex(expr) {
    const result = this.eval(this._expression('latex', [expr]));
    return result.slice(1, -1);
  }

  /**
   * Stores the CAS expression for subsequent operations and captures its display value.
   * @param {string} expression Giac expression to assign.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL} Stored symbolic wrapper.
   */
  _store(expression) {
    const name = 'jslabVar' + (++this._var_counter);
    const result = this.eval(name + ':=(' + expression + ')');
    const symbol = new PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL(this.jsl, name);
    symbol.setValue(result);
    return symbol;
  }
}

exports.PRDC_JSLAB_SYMBOLIC_MATH_GIAC = PRDC_JSLAB_SYMBOLIC_MATH_GIAC;
