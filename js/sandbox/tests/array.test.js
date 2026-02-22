/**
 * @file JSLAB array submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('linspace creates expected number of points', function(assert) {
  var out = jsl.array.linspace(0, 1, 5);
  assert.equal(out.length, 5);
  assert.approx(out[0], 0);
  assert.approx(out[4], 1);
}, { tags: ['unit', 'array'] });

tests.add('colon creates inclusive sequence', function(assert) {
  assert.deepEqual(jsl.array.colon(1, 5, 2), [1, 3, 5]);
  assert.deepEqual(jsl.array.colon(5, 1, -2), [5, 3, 1]);
}, { tags: ['unit', 'array'] });

tests.add('plus adds arrays and scalars', function(assert) {
  assert.deepEqual(jsl.array.plus([1, 2, 3], [4, 5, 6]), [5, 7, 9]);
  assert.deepEqual(jsl.array.plus([1, 2], 3), [4, 5]);
}, { tags: ['unit', 'array'] });

tests.add('minus subtracts arrays and scalars', function(assert) {
  assert.deepEqual(jsl.array.minus([10, 8, 6], [1, 2, 3]), [9, 6, 3]);
  assert.deepEqual(jsl.array.minus([10, 8], 3), [7, 5]);
}, { tags: ['unit', 'array'] });

tests.add('multiplyEl and divideEl are elementwise', function(assert) {
  assert.deepEqual(jsl.array.multiplyEl([1, 2, 3], [2, 3, 4]), [2, 6, 12]);
  assert.deepEqual(jsl.array.divideEl([8, 9], [2, 3]), [4, 3]);
}, { tags: ['unit', 'array'] });

tests.add('indexOf helpers find elements', function(assert) {
  assert.equal(jsl.array.indexOf([1, 2, 3, 2], 2), 1);
  assert.deepEqual(jsl.array.indexOfAll([1, 2, 3, 2], 2), [1, 3]);
}, { tags: ['unit', 'array'] });

tests.add('removeDuplicates removes repeated entries', function(assert) {
  assert.deepEqual(jsl.array.removeDuplicates([1, 1, 2, 3, 2]), [1, 2, 3]);
}, { tags: ['unit', 'array'] });

tests.add('normalizeVector returns unit-length vector', function(assert) {
  var out = jsl.array.normalizeVector([3, 4, 0]);
  var norm = Math.sqrt(out[0] * out[0] + out[1] * out[1] + out[2] * out[2]);
  assert.approx(norm, 1, 1e-12);
}, { tags: ['unit', 'array'] });

tests.add('dotVector computes scalar product', function(assert) {
  assert.equal(jsl.array.dotVector([1, 2, 3], [4, 5, 6]), 32);
}, { tags: ['unit', 'array'] });

tests.add('transpose2D transposes row-major matrix', function(assert) {
  var out = jsl.array.transpose2D([[1, 2, 3], [4, 5, 6]]);
  assert.deepEqual(out, [[1, 4], [2, 5], [3, 6]]);
}, { tags: ['unit', 'array'] });

tests.add('arrayIntersect returns common values', function(assert) {
  assert.deepEqual(jsl.array.arrayIntersect([1, 2, 3], [2, 3, 4]), [2, 3]);
}, { tags: ['unit', 'array'] });

exports.MODULE_TESTS = tests;
