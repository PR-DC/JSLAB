/**
 * @file Browser debugger instrumentation semantics
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for jslab web debug instrument test fixtures.
 */
class PRDC_JSLAB_WEB_TESTS_DEBUG_INSTRUMENT_HELPER {

  /**
   * Executes.
   * @param {string} code Code.
   * @param {*} [on_point] On point.
   */
  static execute(code, on_point = () => {}) {
    const ast = recast.parse(code, { parser: { parse: source => parser.parse(source, { sourceType: 'script', tokens: true }) } });
    instrumentWebDebug(ast, recast, '__runtime', 'test.jsl');
    const runtime = { inter: { execution: { debugger_runtime: {
      rememberFunction(fn) {
        return fn;
      }, enter() {}, leave() {}, exception() {}, caught() {}, raise(value) {
        return value;
      },
      checkpoint: (location, evaluate) => on_point(JSON.parse(location), evaluate)
    } } } };
    const body = ast.program.body;
    if(body[body.length - 1]?.type === 'ExpressionStatement') {
      body[body.length - 1] = recast.types.builders.returnStatement(body[body.length - 1].expression);
    }
    if(process.versions.electron && typeof jsl === 'object') {
      // Electron forbids eval in synthetic node:vm contexts. A function compiled
      // by the real sandbox's original eval has the same realm as real user code.
      runtime._eval = jsl._eval;
      const run = jsl._eval('(function(__runtime, eval) { ' + recast.print(ast).code + '\n})');
      return { value: run(runtime, runtime._eval) };
    }
    const context = vm.createContext({ __runtime: runtime });
    vm.runInContext('__runtime._eval = eval;', context);
    return { value: vm.runInContext('(function(eval) { ' + recast.print(ast).code + '\n})(__runtime._eval)', context), context };
  }
}

const vm = require('vm');
const recast = require('recast');
const parser = require('@babel/parser');
const { instrumentWebDebug } = require("../debug-instrument");
const { PRDC_JSLAB_TESTS } = require("../../other-shared/tester");
var tests = new PRDC_JSLAB_TESTS();


tests.add('browser checkpoints preserve synchronous callbacks, function signatures and generators', function(assert) {
  const result = PRDC_JSLAB_WEB_TESTS_DEBUG_INSTRUMENT_HELPER.execute(`function twice(x) { return x * 2; }
    function* values() { yield 2; yield 3; }
    [twice.length, twice(4), [1,2].map(twice), Array.from(values()), twice(4) instanceof Promise];`);
  assert.equal(JSON.stringify(result.value), '[1,8,[2,4],[2,3],false]');
}, { tags: ['unit', 'web', 'debugger'] });

tests.add('browser checkpoints retain actual local lexical values without a global eval binding', function(assert) {
  const values = [];
  const result = PRDC_JSLAB_WEB_TESTS_DEBUG_INSTRUMENT_HELPER.execute(`delete globalThis.eval;
    function calculate(input) { let local = input + 1; local *= 2; return local; }
    calculate(3);`, (point, evaluate) => {
    if(point.names.includes('local')) {
      try {
        values.push(evaluate('local'));
      } catch(error) {}
    }
  });
  assert.equal(result.value, 8);
  assert.ok(values.includes(4));
  assert.ok(values.includes(8));
}, { tags: ['unit', 'web', 'debugger'] });

tests.add('instrumentation preserves labels, continue, break and unbraced branches', function(assert) {
  const result = PRDC_JSLAB_WEB_TESTS_DEBUG_INSTRUMENT_HELPER.execute(`let total = 0;
    outer: for(let i = 0; i < 4; i++) {
      for(let j = 0; j < 4; j++) {
        if(j === 2) continue outer;
        total++;
      }
    }
    function branch(x) { if(x) return 7; else return 9; }
    [total, branch(true), branch(false)];`);
  assert.equal(JSON.stringify(result.value), '[8,7,9]');
}, { tags: ['unit', 'web', 'debugger'] });

tests.add('an empty infinite loop receives an automatic cancellation checkpoint', function(assert) {
  let points = 0;
  assert.throws(() => PRDC_JSLAB_WEB_TESTS_DEBUG_INSTRUMENT_HELPER.execute('while(true) {}', () => {
    if(++points === 3) {
      throw Error('cancelled automatically');
    }
  }), /cancelled automatically/);
  assert.equal(points, 3);
}, { tags: ['unit', 'web', 'debugger'] });
exports.MODULE_TESTS = tests;

tests.add('instrumentation keeps class methods fields and accessors valid inside workspace modules', function(assert) {
  const result = PRDC_JSLAB_WEB_TESTS_DEBUG_INSTRUMENT_HELPER.execute(`class Counter {
    static factor = 2;
    #value = 1;
    increment(value) { this.#value += value; return this.#value; }
    get value() { return this.#value; }
    static double(value) { return value * this.factor; }
  }
  const counter = new Counter();
  [counter.increment(3), counter.value, Counter.double(4)];`);
  assert.equal(JSON.stringify(result.value), '[4,4,8]');
}, { tags: ['unit', 'web', 'debugger'] });
