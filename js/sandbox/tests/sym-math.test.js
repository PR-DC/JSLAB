/**
 * @file JSLAB symbolic math submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for sym math test fixtures.
 */
class PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER {

  /**
   * Creates sym harness.
   */
  static createSymHarness() {
    var pyodide_run_calls = [];
    var load_calls = [];
    var errors = [];

    var pyodide = {
      loadPackage: async function(packages) {
        load_calls.push(packages);
      },
      runPython: function(code) {
        pyodide_run_calls.push(code);
        return 'PY:' + code;
      }
    };

    var jsl = {
      app_path: 'C:/Electron/JSLAB',
      inter: {
        env: {
          error: function(message) {
            errors.push(message);
          },
          disp: function() {},
          _loadGiac: async function() {
            load_calls.push('giac');
            return { cwrap: () => () => '' };
          }
        },
        loadPyodide: async function(options) {
          pyodide.indexURL = options.indexURL;
          return pyodide;
        },
        lang: {
          string: function(id) {
            return 'LANG_' + id;
          }
        },
        config: {
          DEBUG_SYM_PYTHON_EVAL_CODE: false
        },
        format: {
          safeStringify: function(value) {
            return JSON.stringify(value);
          }
        }
      },
      _console: {
        log: function() {}
      }
    };

    var sym = new PRDC_JSLAB_SYMBOLIC_MATH(jsl);
    return { sym, jsl, errors, pyodide, pyodide_run_calls, load_calls };
  }
}


const { PRDC_JSLAB_SYMBOLIC_MATH } = require('../sym-math');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();


tests.add('load initializes pyodide once and imports sympy/numpy', async function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER.createSymHarness();
  assert.deepEqual(harness.load_calls, []);
  await Promise.all([harness.sym.load(), harness.sym.load()]);
  await harness.sym.load();

  assert.equal(harness.sym.loaded, true);
  assert.ok(harness.pyodide.indexURL.endsWith('/lib/sympy-0.26.2/'));
  assert.equal(harness.load_calls.length, 1);
  assert.deepEqual(harness.load_calls[0], ['sympy', 'numpy']);
  assert.ok(harness.pyodide_run_calls.some(function(code) {
    return code.includes('from sympy import *');
  }));
}, { tags: ['unit', 'sym'] });

tests.add('Giac selection initializes only Giac on concurrent first use', async function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER.createSymHarness();
  harness.jsl.inter.config.SYMBOLIC_MATH_BACKEND = 'giac';
  var sym = new PRDC_JSLAB_SYMBOLIC_MATH(harness.jsl);
  assert.equal(sym.loaded, false);
  assert.deepEqual(harness.load_calls, []);
  await Promise.all([sym.load(), sym.load()]);
  assert.equal(sym.loaded, true);
  assert.deepEqual(harness.load_calls, ['giac']);
  assert.equal(harness.pyodide.indexURL, undefined);
}, { tags: ['unit', 'sym'] });

tests.add('symbol naming helpers generate sequential internal names', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER.createSymHarness();
  assert.equal(harness.sym._nextVar(), 'jslabVar1');
  assert.equal(harness.sym._nextVar(), 'jslabVar2');
}, { tags: ['unit', 'sym'] });

tests.add('new symbols are tracked and expose name/json helpers', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER.createSymHarness();
  var symbol = harness.sym._newSymbol('x', 'x');

  assert.equal(harness.sym._symbols.length, 1);
  assert.equal(harness.sym.getSymbolName(symbol), 'x');
  assert.equal(harness.sym.getSymbolName('y'), 'y');
  assert.equal(symbol.toJSON(), 'x');
  assert.ok(symbol.toString().includes('Symbolic'));
}, { tags: ['unit', 'sym'] });

tests.add('symbol setValue parses matrix text to nested numeric arrays', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER.createSymHarness();
  var symbol = harness.sym._newSymbol('M', 'M');
  symbol.setValue('Matrix([[1, 2], [3, 4]])');

  assert.deepEqual(symbol.toNumeric(), [[1, 2], [3, 4]]);
  assert.deepEqual(symbol.toSafeJSON(), [[1, 2], [3, 4]]);
}, { tags: ['unit', 'sym'] });

tests.add('checkLoaded reports error when symbolic backend is not loaded', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER.createSymHarness();
  harness.sym.checkLoaded();
  assert.ok(harness.errors.length > 0);
}, { tags: ['unit', 'sym'] });

tests.add('eval delegates to pyodide.runPython when loaded', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER.createSymHarness();
  harness.sym.loaded = true;
  harness.sym.pyodide = {
    runPython: function(code) {
      return 'RESULT:' + code;
    }
  };

  var out = harness.sym.eval('1 + 1');
  assert.equal(out, 'RESULT:1 + 1');
}, { tags: ['unit', 'sym'] });

tests.add('sym and syms create tracked symbol wrappers', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER.createSymHarness();
  harness.sym.loaded = true;
  var eval_calls = [];
  harness.sym.eval = function(code) {
    eval_calls.push(code);
    return 'ok';
  };

  var sx = harness.sym.sym('x');
  var sxy = harness.sym.syms(['y', 'z']);

  assert.equal(sx.name, 'x');
  assert.deepEqual(sxy.map(function(item) {
    return item.name;
  }), ['y', 'z']);
  assert.ok(eval_calls[0].includes("x = Symbol('x')"));
  assert.ok(eval_calls[1].includes("y, z = symbols('y z')"));
  assert.equal(harness.sym._symbols.length, 3);
}, { tags: ['unit', 'sym'] });

tests.add('clear resets symbol state and reinitializes python globals when loaded', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SYM_MATH_TEST_HELPER.createSymHarness();
  harness.sym.loaded = true;
  harness.sym._var_counter = 3;
  harness.sym._symbols = [1, 2, 3];
  harness.sym.pyodide = {
    runPython: function(code) {
      harness.pyodide_run_calls.push(code);
    }
  };

  harness.sym.clear();
  assert.equal(harness.sym._var_counter, 0);
  assert.deepEqual(harness.sym._symbols, []);
  assert.ok(harness.pyodide_run_calls.some(function(code) {
    return code.includes('globals().clear()');
  }));
}, { tags: ['unit', 'sym'] });

exports.MODULE_TESTS = tests;
