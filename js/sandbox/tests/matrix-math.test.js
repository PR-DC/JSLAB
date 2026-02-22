/**
 * @file JSLAB matrix math submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('matrix constructor and size accessors work', function(assert) {
  var A = jsl.mat.new([[1, 2], [3, 4]]);
  assert.deepEqual(A.size(), [2, 2]);
  assert.equal(A.numel(), 4);
  assert.deepEqual(A.toArray(), [[1, 2], [3, 4]]);
}, { tags: ['unit', 'matrix'] });

tests.add('transpose swaps rows and columns', function(assert) {
  var A = jsl.mat.new([[1, 2, 3], [4, 5, 6]]);
  var T = A.transpose();
  assert.deepEqual(T.size(), [3, 2]);
  assert.deepEqual(T.toArray(), [[1, 4], [2, 5], [3, 6]]);
}, { tags: ['unit', 'matrix'] });

tests.add('identity matrix behaves as multiplicative identity', function(assert) {
  var A = jsl.mat.new([[2, 0], [1, 3]]);
  var I = jsl.mat.eye(2);
  assert.deepEqual(A.multiply(I).toArray(), A.toArray());
  assert.deepEqual(I.multiply(A).toArray(), A.toArray());
}, { tags: ['unit', 'matrix'] });

tests.add('det computes determinant of 2x2 matrix', function(assert) {
  var A = jsl.mat.new([[1, 2], [3, 4]]);
  assert.approx(A.det(), -2, 1e-12);
}, { tags: ['unit', 'matrix'] });

tests.add('inv computes matrix inverse', function(assert) {
  var A = jsl.mat.new([[4, 7], [2, 6]]);
  var A_inv = A.inv();
  var prod = A.multiply(A_inv).toArray();
  assert.approx(prod[0][0], 1, 1e-10);
  assert.approx(prod[0][1], 0, 1e-10);
  assert.approx(prod[1][0], 0, 1e-10);
  assert.approx(prod[1][1], 1, 1e-10);
}, { tags: ['unit', 'matrix'] });

tests.add('linsolve solves linear system', function(assert) {
  // [2 1; 1 3] * [x;y] = [8;13] => x=2.2, y=3.6
  var A = jsl.mat.new([[2, 1], [1, 3]]);
  var B = jsl.mat.new([8, 13], 2, 1);
  var X = A.linsolve(B).toArray();
  assert.approx(X[0], 2.2, 1e-10);
  assert.approx(X[1], 3.6, 1e-10);
}, { tags: ['unit', 'matrix'] });

tests.add('element-wise operations work with scalars and matrices', function(assert) {
  var A = jsl.mat.new([[1, 2], [3, 4]]);
  var B = jsl.mat.new([[2, 2], [2, 2]]);
  assert.deepEqual(A.multiplyEl(2).toArray(), [[2, 4], [6, 8]]);
  assert.deepEqual(A.divideEl(2).toArray(), [[0.5, 1], [1.5, 2]]);
  assert.deepEqual(A.multiplyEl(B).toArray(), [[2, 4], [6, 8]]);
}, { tags: ['unit', 'matrix'] });

tests.add('reshape preserves element order in column-major layout', function(assert) {
  var A = jsl.mat.new([[1, 2], [3, 4]]);
  var B = A.reshape(1, 4);
  assert.deepEqual(B.toArray(), [1, 3, 2, 4]);
}, { tags: ['unit', 'matrix'] });

exports.MODULE_TESTS = tests;
