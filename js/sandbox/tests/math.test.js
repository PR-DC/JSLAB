/**
 * @file JSLAB math submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('degree-based trig helpers match expected values', function(assert) {
  assert.approx(jsl.math.sind(30), 0.5, 1e-12);
  assert.approx(jsl.math.cosd(60), 0.5, 1e-12);
  assert.approx(jsl.math.tand(45), 1, 1e-12);
  assert.approx(jsl.math.atan2d(1, 1), 45, 1e-12);
}, { tags: ['unit', 'math'] });

tests.add('poly builds polynomial from roots', function(assert) {
  // (x - 1)(x - 2) = x^2 - 3x + 2
  var p = jsl.math.poly([1, 2]);
  assert.deepEqual(p, [1, -3, 2]);
}, { tags: ['unit', 'math'] });

tests.add('polyval evaluates polynomial coefficients', function(assert) {
  var y = jsl.math.polyval([2, -3, 1], [0, 1, 2]); // 2x^2 - 3x + 1
  assert.deepEqual(y, [1, 0, 3]);
}, { tags: ['unit', 'math'] });

tests.add('magnitude returns absolute magnitude', function(assert) {
  assert.equal(jsl.math.magnitude(-1234), 1234);
  assert.equal(jsl.math.magnitude({ real: 3, imag: 4 }), 5);
}, { tags: ['unit', 'math'] });

tests.add('clamp constrains value into range', function(assert) {
  assert.equal(jsl.math.clamp(5, 0, 3), 3);
  assert.equal(jsl.math.clamp(-2, 0, 3), 0);
  assert.equal(jsl.math.clamp(2, 0, 3), 2);
}, { tags: ['unit', 'math'] });

tests.add('real and imag extract complex components', function(assert) {
  var c = { real: 3, imag: -4 };
  assert.equal(jsl.math.real(c), 3);
  assert.equal(jsl.math.imag(c), -4);
}, { tags: ['unit', 'math'] });

tests.add('mse computes mean squared error', function(assert) {
  assert.approx(jsl.math.mse([1, 2, 3], [1, 3, 2]), 2 / 3, 1e-12);
}, { tags: ['unit', 'math'] });

exports.MODULE_TESTS = tests;
