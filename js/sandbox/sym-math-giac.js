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

  checkLoaded() {
    if(!this.loaded) {
      const message = '@sym: ' + this.jsl.inter.lang.string(175);
      this.jsl.inter.env.error(message);
      throw new Error(message);
    }
  }

  /**
   * Evaluates a Giac expression or command in this workspace's CAS context.
   */
  eval(code) {
    this.checkLoaded();
    const result = this._evaluate(code);
    if(result.startsWith('GIAC_ERROR:')) {
      throw new Error('@sym: ' + result.slice('GIAC_ERROR:'.length).trim());
    }
    return result;
  }

  getSymbolName(symbol) {
    return symbol instanceof PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL ? symbol.name : symbol;
  }

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

  syms(names) {
    return names.map(name => this.sym(name));
  }

  mat(rows) {
    return this._store(this._source(rows));
  }

  mul(...args) {
    return this._arithmetic('*', args);
  }

  div(...args) {
    return this._arithmetic('/', args);
  }

  plus(...args) {
    return this._arithmetic('+', args);
  }

  minus(...args) {
    return this._arithmetic('-', args);
  }

  pow(expr, n) {
    return this._arithmetic('^', [expr, n]);
  }

  transp(expr) {
    return this._call('tran', [expr]);
  }

  inv(expr) {
    return this._call('inv', [expr]);
  }

  det(expr) {
    return this._call('det', [expr]);
  }

  diff(expr, x, n = 1) {
    return this._call('diff', [expr, x, n]);
  }

  intg(expr, x, limits) {
    return this._call('integrate', [expr, x, ...(limits || [])]);
  }

  subs(expr, x, val) {
    const substitute = value => this._expression('subst', [expr, x, value]);
    if(Array.isArray(val)) {
      const samples = val.map(value => 'evalf(' + substitute(value) + ')');
      return this._store('[' + samples.join(',') + ']');
    }
    const result = substitute(val);
    return this._store(typeof val === 'number' ? 'evalf(' + result + ')' : result);
  }

  simplify(expr) {
    return this._call('simplify', [expr]);
  }

  showLatex(expr) {
    this.jsl.inter.env.dispLatex(this._latex(expr));
  }

  dispLatex(expr) {
    this.jsl.inter.env.disp(this._latex(expr));
  }

  clear() {
    if(this.loaded) {
      this.eval('restart');
      this._var_counter = 0;
    }
  }

  /**
   * Converts wrapper objects and nested arrays to Giac argument syntax.
   */
  _source(value) {
    if(Array.isArray(value)) {
      return '[' + value.map(entry => this._source(entry)).join(',') + ']';
    }
    return String(this.getSymbolName(value));
  }

  _arithmetic(operator, args) {
    return this._store(args.map(arg => '(' + this._source(arg) + ')').join(operator));
  }

  _expression(name, args) {
    return name + '(' + args.map(arg => this._source(arg)).join(',') + ')';
  }

  _call(name, args) {
    return this._store(this._expression(name, args));
  }

  _latex(expr) {
    const result = this.eval(this._expression('latex', [expr]));
    return result.slice(1, -1);
  }

  /**
   * Stores the CAS expression for subsequent operations and captures its display value.
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
