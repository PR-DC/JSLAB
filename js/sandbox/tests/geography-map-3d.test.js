/**
 * @file JSLAB geography map 3D submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_GEOGRAPHY_MAP_3D } = require('../geography-map-3d');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createMap3DHarness() {
  var jsl = {
    inter: {
      format: {
        hasKey: function(obj, key) {
          return Object.prototype.hasOwnProperty.call(obj, key);
        }
      }
    }
  };
  var map_3d = new PRDC_JSLAB_GEOGRAPHY_MAP_3D(jsl, 'TOKEN');
  return { map_3d };
}

tests.add('setView updates camera state and calls viewer camera when ready', function(assert) {
  var harness = createMap3DHarness();
  var records = {};
  harness.map_3d.ready = true;
  harness.map_3d.context = {
    Cesium: {
      Cartesian3: {
        fromDegrees: function(lon, lat, height) {
          return { lon: lon, lat: lat, height: height };
        }
      },
      Math: {
        toRadians: function(deg) {
          return deg * Math.PI / 180;
        }
      }
    }
  };
  harness.map_3d.viewer = {
    camera: {
      flyTo: function(options) {
        records.camera = options;
      }
    }
  };

  harness.map_3d.setView(44.8, 20.4, 1200, 90, -20);
  assert.equal(harness.map_3d.latitude, 44.8);
  assert.equal(harness.map_3d.longitude, 20.4);
  assert.equal(harness.map_3d.height, 1200);
  assert.equal(records.camera.destination.lon, 20.4);
  assert.equal(records.camera.destination.lat, 44.8);
  assert.approx(records.camera.orientation.heading, Math.PI / 2, 1e-12);
}, { tags: ['unit', 'geography-map-3d'] });

tests.add('entity helpers add, remove and fly to wrapped entities', function(assert) {
  var harness = createMap3DHarness();
  var records = {};
  harness.map_3d.viewer = {
    entities: {
      add: function(data) {
        records.entity_data = data;
        return { id: 'entity-1' };
      },
      removeAll: function() {
        records.removed = true;
      }
    },
    flyTo: function(entity) {
      records.fly_to = entity;
    }
  };

  var wrapped = harness.map_3d.addEntity({ label: 'A' });
  wrapped.flyTo();
  harness.map_3d.flyTo(wrapped);
  harness.map_3d.removeAllEntities();

  assert.equal(records.entity_data.label, 'A');
  assert.equal(records.fly_to.id, 'entity-1');
  assert.equal(records.removed, true);
}, { tags: ['unit', 'geography-map-3d'] });

exports.MODULE_TESTS = tests;

