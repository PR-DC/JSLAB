/**
 * @file JSLAB geography submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_GEOGRAPHY } = require('../geography');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createGeographyHarness() {
  var jsl = {
    inter: {
      format: {
        isUndefined: function(value) {
          return typeof value === 'undefined';
        },
        normalizeAngle: function(angle) {
          var out = angle % 360;
          if(out < 0) out += 360;
          return out;
        }
      },
      env: {
        egm96: {
          egm96ToEllipsoid: function(lat, lon, h) {
            return h + lat * 0 + lon * 0 + 10;
          },
          ellipsoidToEgm96: function(lat, lon, h) {
            return h + lat * 0 + lon * 0 - 10;
          }
        }
      },
      lang: {
        currentString: function(id) {
          return 'LANG_' + id;
        }
      }
    }
  };

  var geography = new PRDC_JSLAB_LIB_GEOGRAPHY(jsl);
  return { geography };
}

tests.add('calculateTilesBoundingBox returns expected world bounds at zoom 0', function(assert) {
  var harness = createGeographyHarness();
  var out = harness.geography.calculateTilesBoundingBox([{ x: 0, y: 0, z: 0 }]);

  assert.approx(out.center[0], 0, 1e-9);
  assert.approx(out.center[1], 0, 1e-9);
  assert.approx(out.bounds[0][0], -85.0511287798, 1e-6);
  assert.approx(out.bounds[1][0], 85.0511287798, 1e-6);
  assert.approx(out.bounds[0][1], -180, 1e-9);
  assert.approx(out.bounds[1][1], 180, 1e-9);
}, { tags: ['unit', 'geography'] });

tests.add('offset and distance functions are internally consistent', function(assert) {
  var harness = createGeographyHarness();
  var start = [44.8, 20.4];
  var moved_north = harness.geography.offsetLatLon(start[0], start[1], 1000, 0);
  var moved_east_north = harness.geography.offsetLatLonEastNorth(start[0], start[1], 500, 500);

  var dist_north = harness.geography.latLonDistance(start[0], start[1], moved_north[0], moved_north[1]);
  var dist_east_north = harness.geography.latLonDistance(start[0], start[1], moved_east_north[0], moved_east_north[1]);

  assert.approx(dist_north, 1000, 2.5);
  assert.approx(dist_east_north, Math.sqrt(500 * 500 + 500 * 500), 2.5);
}, { tags: ['unit', 'geography'] });

tests.add('latLonAltDistance and checkNewLatLon handle edge conditions', function(assert) {
  var harness = createGeographyHarness();
  var d3 = harness.geography.latLonAltDistance(0, 0, 100, 0, 0, 50);
  assert.approx(d3, 50, 1e-9);

  assert.equal(harness.geography.checkNewLatLon({}), false);
  assert.equal(harness.geography.checkNewLatLon({ value: [1, 2] }), true);
  assert.equal(
    harness.geography.checkNewLatLon({ value: [1, 2], last_value: [1, 2] }),
    false
  );
  assert.equal(
    harness.geography.checkNewLatLon({ value: [1, 3], last_value: [1, 2] }),
    true
  );
}, { tags: ['unit', 'geography'] });

tests.add('MSL and ellipsoid conversion wrappers support scalar and array inputs', function(assert) {
  var harness = createGeographyHarness();
  var scalar = harness.geography.mslToEllipsoidAlt(44, 20, 100);
  var arr = harness.geography.ellipsoidToMslAlt([44, 45], [20, 21], [110, 120]);

  assert.equal(scalar, 110);
  assert.deepEqual(arr, [100, 110]);
}, { tags: ['unit', 'geography'] });

exports.MODULE_TESTS = tests;
