/**
 * @file JSLAB geometry submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_GEOMETRY } = require('../geometry');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function vecMinus(a, b) {
  return a.map(function(v, i) { return v - b[i]; });
}

function vecPlus(a, b) {
  return a.map(function(v, i) { return v + b[i]; });
}

function vecScale(a, s) {
  return a.map(function(v) { return v * s; });
}

function vecDot(a, b) {
  var sum = 0;
  for(var i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function vecNorm(a) {
  return Math.sqrt(vecDot(a, a));
}

function vecCross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function createGeometryHarness() {
  var jsl = {
    inter: {
      EPS: 1e-9,
      minus: vecMinus,
      plus: vecPlus,
      scale: vecScale,
      dot: vecDot,
      norm: vecNorm,
      cross3D: vecCross3,
      array: {
        createFilledArray: function(n, value) {
          return Array(Math.max(0, n)).fill(value);
        }
      },
      math: {
        clamp: function(value, min, max) {
          return Math.min(max, Math.max(min, value));
        }
      }
    }
  };

  var geometry = new PRDC_JSLAB_LIB_GEOMETRY(jsl);
  return { geometry };
}

tests.add('findNearestPoints returns nearest index for each input point', function(assert) {
  var harness = createGeometryHarness();
  var indices = harness.geometry.findNearestPoints(
    [[0, 0], [2, 2], [10, 10]],
    [[0.1, -0.1], [3, 3], [100, 100]]
  );
  assert.deepEqual(indices, [0, 1, 1]);
}, { tags: ['unit', 'geometry'] });

tests.add('pointLineDistance and pointSegmentDistance compute expected distances', function(assert) {
  var harness = createGeometryHarness();
  var d_line = harness.geometry.pointLineDistance([1, 1, 0], [0, 0, 0], [1, 0, 0]);
  assert.approx(d_line.d, 1, 1e-9);
  assert.deepEqual(d_line.P1, [1, 0, 0]);

  var d_seg_mid = harness.geometry.pointSegmentDistance(
    { x: 1, y: 2 },
    { x: 0, y: 0 },
    { x: 2, y: 0 }
  );
  assert.approx(d_seg_mid, 2, 1e-9);

  var d_seg_end = harness.geometry.pointSegmentDistance(
    { x: 3, y: 4 },
    { x: 0, y: 0 },
    { x: 2, y: 0 }
  );
  assert.approx(d_seg_end, Math.sqrt(17), 1e-9);
}, { tags: ['unit', 'geometry'] });

tests.add('lineCircleIntersection handles intersect, tangent and miss cases', function(assert) {
  var harness = createGeometryHarness();

  var hit = harness.geometry.lineCircleIntersection([-2, 0, 0], [1, 0, 0], [0, 0, 0], 1);
  assert.equal(hit.flag, 0);
  assert.ok(hit.P1 && hit.P2);
  assert.approx(Math.abs(hit.P1[0]), 1, 1e-9);
  assert.approx(Math.abs(hit.P2[0]), 1, 1e-9);

  var tangent = harness.geometry.lineCircleIntersection([0, 1, 0], [1, 0, 0], [0, 0, 0], 1);
  assert.equal(tangent.flag, 1);
  assert.deepEqual(tangent.P1, [0, 1, 0]);

  var miss = harness.geometry.lineCircleIntersection([0, 2, 0], [1, 0, 0], [0, 0, 0], 1);
  assert.equal(miss.flag, 2);
  assert.equal(miss.P1, null);
  assert.equal(miss.P2, null);
}, { tags: ['unit', 'geometry'] });

tests.add('planesIntersection distinguishes intersecting, same and parallel planes', function(assert) {
  var harness = createGeometryHarness();

  var cross = harness.geometry.planesIntersection(
    [0, 0, 0], [0, 0, 1],
    [0, 0, 0], [1, 0, 0]
  );
  assert.equal(cross.flag, 0);
  assert.ok(Array.isArray(cross.P));
  assert.ok(Array.isArray(cross.i));
  assert.approx(cross.i[0], 0, 1e-9);
  assert.approx(Math.abs(cross.i[1]), 1, 1e-9);
  assert.approx(cross.i[2], 0, 1e-9);

  var same = harness.geometry.planesIntersection(
    [0, 0, 0], [0, 0, 1],
    [1, 1, 0], [0, 0, 1]
  );
  assert.equal(same.flag, 1);

  var parallel = harness.geometry.planesIntersection(
    [0, 0, 0], [0, 0, 1],
    [0, 0, 1], [0, 0, 1]
  );
  assert.equal(parallel.flag, 2);
}, { tags: ['unit', 'geometry'] });

tests.add('line overlap and minimum point distance utilities behave correctly', function(assert) {
  var harness = createGeometryHarness();

  var overlap = harness.geometry.linesOverlap(
    [0, 0, 0], [2, 0, 0],
    [1, 0, 0], [3, 0, 0]
  );
  assert.equal(overlap.flag, 0);
  assert.deepEqual(overlap.A, [1, 0, 0]);
  assert.deepEqual(overlap.B, [2, 0, 0]);

  var no_overlap = harness.geometry.linesOverlap(
    [0, 0, 0], [2, 0, 0],
    [3, 0, 0], [4, 0, 0]
  );
  assert.equal(no_overlap.flag, 1);

  var min_dist = harness.geometry.minPointsDistance3D(
    [[0, 0, 0], [10, 10, 10]],
    [[1, 0, 0], [20, 20, 20]]
  );
  assert.approx(min_dist.L, 1, 1e-9);
  assert.deepEqual(min_dist.P1, [0, 0, 0]);
  assert.deepEqual(min_dist.P2, [1, 0, 0]);
}, { tags: ['unit', 'geometry'] });

exports.MODULE_TESTS = tests;
