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

tests.add('disk separation has feasible points and certified bounds', async function(assert) {
  var native = await backend;
  var cases = [
    [[0, 0, 0], [0, 0, 1], 5, [6, 0, 6], [1, 0, 0], 4, Math.sqrt(5)],
    [[0, 0, 0], [0, 0, 2], 5, [2, 1, 5.5], [3, 0, 0], 4, 1.5],
    [[0, 0, 0], [0, 0, 1], 5, [5, 1, 2], [1, 0, 0], 4, 0],
    [[0, 0, 0], [0, 0, 1], 5, [2, 1, 3], [0, 0, -2], 4, 3],
    [[0, 0, 0], [0, 0, 1], 5, [0, 0, 0], [0, 0, 1], 4, 0],
    [[0, 0, 0], [0, 0, 1], 0, [3, 4, 0], [0, 0, 1], 0, 5]
  ];
  for(var c of cases) {
    var result = native.minDisksDistance3D(...c.slice(0, 6));
    var reversed = native.minDisksDistance3D(...c.slice(3, 6), ...c.slice(0, 3));
    assert.approx(result.L, c[6], 1e-8);
    assert.approx(reversed.L, result.L, 1e-8);
    // A rigid transform must preserve distance; translated inputs also test
    // that the returned witnesses are in world coordinates.
    var rotate = function(v) { return [-v[1], v[0], v[2]]; };
    var translate = function(v) { return rotate(v).map(function(x, i) { return x + [1000, -200, 30][i]; }); };
    var moved = native.minDisksDistance3D(translate(c[0]), rotate(c[1]), c[2],
      translate(c[3]), rotate(c[4]), c[5]);
    assert.approx(moved.L, result.L, 1e-8);
    assert.ok(Math.hypot(...moved.P1.map(function(v, i) { return v - translate(c[0])[i]; })) <= c[2] + 1e-8);
    assert.ok(result.L - result.lower_bound < 1e-8);
    assert.approx(Math.hypot(...result.P1.map((v, i) => v - result.P2[i])), result.L, 1e-9);
    [0, 1].forEach(function(index) {
      var center = c[index * 3], normal = c[index * 3 + 1], radius = c[index * 3 + 2];
      var point = index === 0 ? result.P1 : result.P2;
      var delta = point.map((v, i) => v - center[i]);
      assert.ok(Math.hypot(...delta) <= radius + 1e-8);
      assert.ok(Math.abs(delta.reduce((s, v, i) => s + v * normal[i], 0)) < 1e-8);
    });
  }
  assert.throws(function() { native.minDisksDistance3D([0, 0, 0], [0, 0, 0], 1, [0, 0, 0], [0, 0, 1], 1); }, /normal/);
  assert.throws(function() { native.minDisksDistance3D([0, 0, 0], [0, 0, 1], -1, [0, 0, 0], [0, 0, 1], 1); }, /radii/);
}, { tags: ['unit', 'wasm'] });
