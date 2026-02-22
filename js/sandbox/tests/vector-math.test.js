/**
 * @file JSLAB vector math submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('vector constructor and toArray work', function(assert) {
  var v = jsl.vec.new(1, 2, 3);
  assert.deepEqual(v.toArray(), [1, 2, 3]);
}, { tags: ['unit', 'vector'] });

tests.add('length and norm match Euclidean magnitude', function(assert) {
  var v = jsl.vec.new(3, 4, 0);
  assert.approx(v.length(), 5, 1e-12);
  assert.approx(v.norm(), 5, 1e-12);
}, { tags: ['unit', 'vector'] });

tests.add('dot and cross products are correct', function(assert) {
  var a = jsl.vec.new(1, 0, 0);
  var b = jsl.vec.new(0, 1, 0);
  assert.equal(a.dot(b), 0);
  assert.deepEqual(a.cross(b).toArray(), [0, 0, 1]);
}, { tags: ['unit', 'vector'] });

tests.add('add and subtract produce expected vectors', function(assert) {
  var a = jsl.vec.new(1, 2, 3);
  var b = jsl.vec.new(3, 2, 1);
  assert.deepEqual(a.add(b).toArray(), [4, 4, 4]);
  assert.deepEqual(a.subtract(b).toArray(), [-2, 0, 2]);
}, { tags: ['unit', 'vector'] });

tests.add('normalize returns unit vector', function(assert) {
  var out = jsl.vec.new(5, 0, 0).normalize();
  assert.approx(out.length(), 1, 1e-12);
  assert.deepEqual(out.toArray(), [1, 0, 0]);
}, { tags: ['unit', 'vector'] });

tests.add('angleTo returns angle in degrees', function(assert) {
  var x = jsl.vec.new(1, 0, 0);
  var y = jsl.vec.new(0, 1, 0);
  assert.approx(x.angleTo(y), 90, 1e-10);
}, { tags: ['unit', 'vector'] });

tests.add('projectTo projects vector onto target axis', function(assert) {
  var v = jsl.vec.new(3, 4, 0);
  var x = jsl.vec.new(1, 0, 0);
  assert.deepEqual(v.projectTo(x).toArray(), [3, 0, 0]);
}, { tags: ['unit', 'vector'] });

tests.add('polar and spherical constructors produce expected vectors', function(assert) {
  var polar = jsl.vec.polar(2, Math.PI / 2);
  assert.approx(polar.x, 0, 1e-12);
  assert.approx(polar.y, 2, 1e-12);
  var spherical = jsl.vec.spherical(1, 0, Math.PI / 2);
  assert.approx(spherical.x, 0, 1e-12);
  assert.approx(spherical.y, 0, 1e-12);
  assert.approx(spherical.z, 1, 1e-12);
}, { tags: ['unit', 'vector'] });

exports.MODULE_TESTS = tests;
