/**
 * @file JSLAB compiled numerical WebAssembly tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { createNativeModule } = require('../jslab-wasm-native');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const factory = require('../../../lib/native-wasm/native_module.js');
var tests = new PRDC_JSLAB_TESTS();
var backend = factory().then(createNativeModule);

tests.add('compiled numerical backend integrates arrays and typed arrays', async function(assert) {
  var native = await backend;
  assert.equal(native.wasm, true);
  assert.approx(native.trapz([0, 1, 2]), 2);
  assert.approx(native.trapz(new Float64Array([1, 2, 3]), [0, 2, 5]), 10.5);
  assert.deepEqual(native.cumtrapz([0, 1, 2], [0, 2, 5]), [0, 1, 5.5]);
  assert.deepEqual(native.cumtrapz([]), []);
  assert.throws(function() { native.trapz([1]); }, /two data points/);
  assert.throws(function() { native.cumtrapz([1, 2], [0]); }, /same length/);
  assert.throws(function() { native.roots([1, Infinity]); }, /finite/);
}, { tags: ['unit', 'wasm'] });

tests.add('compiled root solver handles real, complex and leading-zero polynomials', async function(assert) {
  var native = await backend;
  var roots = native.roots([0, 1, -6, 11, -6]).sort(function(a, b) { return a - b; });
  [1, 2, 3].forEach(function(value, index) { assert.approx(roots[index], value, 1e-9); });
  var complex = native.roots([1, 0, 1]).sort(function(a, b) { return a.imag - b.imag; });
  assert.approx(complex[0].real, 0, 1e-10);
  assert.approx(complex[0].imag, -1, 1e-10);
  assert.approx(complex[1].imag, 1, 1e-10);
  assert.deepEqual(native.roots([5]), []);
  assert.deepEqual(native.roots([0, 0]), []);
}, { tags: ['unit', 'wasm'] });

tests.add('numerical bindings follow memory growth and free partial allocations', async function(assert) {
  var native = await backend;
  var data = new Float64Array(1500000).fill(2);
  assert.approx(native.trapz(data), 2 * (data.length - 1));
  var freed = [];
  var allocations = 0;
  var fixture = {
    HEAPF64: new Float64Array(32),
    _malloc: function() { return ++allocations === 1 ? 8 : 0; },
    _free: function(pointer) { freed.push(pointer); },
    _nm_roots: function() {}, _nm_trapz: function() {}, _nm_cumtrapz: function() {}
  };
  assert.throws(function() { createNativeModule(fixture).cumtrapz([1, 2]); }, /allocation/);
  assert.deepEqual(freed, [8]);
  assert.throws(function() { createNativeModule(null); }, /unavailable/);
}, { tags: ['unit', 'wasm'] });

exports.MODULE_TESTS = tests;
