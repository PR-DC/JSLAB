/**
 * @file JSLAB compiled AlphaShape WebAssembly tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { createAlphaShape3DClass } = require('../jslab-wasm-alpha-shape');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const factory = require('../../../lib/native-wasm/alpha_shape_3d.js');
var tests = new PRDC_JSLAB_TESTS();
var compiled = factory();
var corners = [[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,1,0],[1,0,1],[0,1,1],[1,1,1]];

tests.add('compiled AlphaShape implements geometry queries and explicit disposal', async function(assert) {
  var Shape = createAlphaShape3DClass(await compiled, {});
  var shape = new Shape();
  try {
    shape.newShape(corners);
    shape.setAlpha(100);
    assert.approx(shape.getVolume(), 1, 1e-10);
    assert.approx(shape.getSurfaceArea(), 6, 1e-10);
    assert.ok(shape.getAlphaSpectrum().length > 0);
    assert.ok(shape.getTriangulation().length > 0);
    assert.deepEqual(shape.checkInShape([[0.5,0.5,0.5],[2,2,2]]), [true, false]);
    var neighbors = shape.getNearestNeighbor([[0,0,0]]);
    assert.approx(neighbors.distances[0], 0);
    assert.equal(neighbors.indices[0], 0);
    var mesh = shape.getSimplifiedShape(0.8);
    assert.ok(mesh.points.length > 0);
    assert.ok(mesh.facets.length <= shape.getBoundaryFacets().length);
  } finally { shape.dispose(); }
  shape.dispose();
  assert.throws(function() { shape.getAlpha(); }, /released/);
}, { tags: ['unit', 'wasm', 'geometry'] });

tests.add('compiled AlphaShape preserves a cube boundary around a large point cloud', async function(assert) {
  var Shape = createAlphaShape3DClass(await compiled, {});
  var shape = new Shape();
  var seed = 19;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return 0.01 + 0.98 * seed / 4294967296;
  }
  var points = corners.concat(Array.from({ length: 500 }, function() { return [random(), random(), random()]; }));
  try {
    shape.newShape(points);
    var spectrum = shape.getAlphaSpectrum();
    shape.setAlpha(spectrum[spectrum.length - 1] * 2);
    assert.approx(shape.getVolume(), 1, 1e-9);
    assert.approx(shape.getSurfaceArea(), 6, 1e-9);
    assert.ok(shape.getBoundaryFacets().every(function(face) {
      return face.every(function(index) { return Number.isInteger(index) && index >= 0 && index < points.length; });
    }));
  } finally { shape.dispose(); }
}, { tags: ['unit', 'wasm', 'geometry'] });

tests.add('AlphaShape exports through the host, remaps indices and rejects degenerate input', async function(assert) {
  var saved = [];
  var Shape = createAlphaShape3DClass(await compiled, { writeFileSync: function(filename, data) {
    saved.push({ filename: filename, data: data });
    return true;
  } });
  var shape = new Shape();
  try {
    assert.throws(function() { shape.newShape([[0,0,0],[1,0,0],[0,1,0],[1,1,0]]); }, /noncoplanar/);
    shape.newShape(corners);
    shape.setAlpha(100);
    shape.writeBoundaryFacets('boundary.off');
    var compact = shape.removeUnusedPoints([[0,0,0],[1,0,0],[0,1,0],[9,9,9]], [[0,1,2]]);
    assert.equal(compact.points.length, 3);
    shape.writeOff('mesh.off', compact.points, compact.facets);
    shape.getSimplifiedShape(0.8, 'simplified.off');
    assert.equal(saved.length, 3);
    assert.ok(saved.every(function(file) { return file.data.startsWith('OFF\n'); }));
    assert.throws(function() { shape.writeOff('bad.off', corners, [[0,1,99]]); }, /indices/);
  } finally { shape.dispose(); }
}, { tags: ['unit', 'wasm', 'geometry'] });

tests.add('AlphaShape rejects sparse rows and invalid native node counts without losing the current shape', async function(assert) {
  var Shape = createAlphaShape3DClass(await compiled, {});
  var shape = new Shape();
  try {
    shape.newShape(corners);
    shape.setAlpha(100);
    var hole = corners.map(function(row) { return row.slice(); });
    delete hole[0][0];
    assert.throws(function() { shape.newShape(hole); }, /finite/);
    assert.throws(function() { shape.newShape(new Array(4)); }, /three coordinates/);
    var invalid = [[], corners.slice(0, 3), new Array(4), hole,
      [[0,0,0],[1,0,0],[0,1,0],[1,1,0]],
      [[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
      [[NaN,0,0],[1,0,0],[0,1,0],[0,0,1]],
      {length: -1}, {length: 4.5}, new Array(0x40000000)];
    var overflow_count = new Array(0x55555556);
    overflow_count[0] = [0, 0, 0];
    invalid.push(overflow_count);
    invalid.forEach(function(points) {
      assert.throws(function() { shape._call('newShape', [points]); },
        /noncoplanar|coordinates|finite|Array|node count/);
      assert.approx(shape.getVolume(), 1, 1e-10);
    });
    assert.throws(function() { shape._call('checkInShape', [new Array(0x40000000)]); }, /node count/);
    assert.throws(function() { shape._call('checkInShape', [overflow_count]); }, /node count/);
    assert.deepEqual(shape.checkInShape([[0.5,0.5,0.5],[2,2,2]]), [true, false]);
    shape.newShape(corners);
    shape.setAlpha(100);
    assert.approx(shape.getVolume(), 1, 1e-10);
  } finally { shape.dispose(); }
}, { tags: ['unit', 'wasm', 'geometry'] });

tests.add('AlphaShape queries existing boundary vertices when most input nodes are isolated', async function(assert) {
  var Shape = createAlphaShape3DClass(await compiled, {});
  var shape = new Shape();
  var points = [[0.5,0.5,0.5]].concat(corners, [[0.4,0.4,0.4], [0.6,0.6,0.6]], corners);
  var queries = [[0.02,0.03,0.04], [0.98,0.97,0.96], [3,2,4], [0.5,0.5,0.5]];
  try {
    shape.newShape(points);
    shape.setAlpha(100);
    var before = shape.getBoundaryFacets();
    var boundary = new Set(before.flat());
    for(var pass = 0; pass < 3; pass++) {
      var result = shape.getNearestNeighbor(queries);
      queries.forEach(function(query, index) {
        assert.ok(boundary.has(result.indices[index]));
        var distance = Math.min(...Array.from(boundary, function(vertex) {
          return Math.hypot(...points[vertex].map(function(value, coordinate) { return value - query[coordinate]; }));
        }));
        assert.approx(result.distances[index], distance, 1e-10);
      });
      assert.deepEqual(shape.getBoundaryFacets(), before);
      assert.approx(shape.getVolume(), 1, 1e-10);
    }
    assert.deepEqual(shape._call('getPoints'), points);
    assert.ok(shape.getTriangulation().every(function(face) {
      return face.length === 3 && face.every(function(index) {
        return Number.isInteger(index) && index >= 0 && index < points.length;
      });
    }));
  } finally { shape.dispose(); }
}, { tags: ['unit', 'wasm', 'geometry'] });

tests.add('AlphaShape constructs a noncoplanar sliver whose inexact radius denominator is zero', async function(assert) {
  var Shape = createAlphaShape3DClass(await compiled, {});
  var shape = new Shape();
  var delta = Math.pow(2, -27);
  try {
    shape.newShape([[0,0,0], [1 + delta,1 + 2 * delta,0], [0,0,1], [1,1 + delta,0]]);
    var spectrum = shape.getAlphaSpectrum();
    assert.ok(spectrum.length > 0);
    assert.ok(spectrum.every(function(alpha) { return Number.isFinite(alpha) && alpha >= 0; }));
    shape.setAlpha(spectrum[spectrum.length - 1] * 2);
    assert.equal(shape.getBoundaryFacets().length, 4);
    shape.newShape(corners);
    shape.setAlpha(100);
    assert.approx(shape.getVolume(), 1, 1e-10);
  } finally { shape.dispose(); }
}, { tags: ['unit', 'wasm', 'geometry'] });

exports.MODULE_TESTS = tests;
