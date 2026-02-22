/**
 * @file JSLAB geography map submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_GEOGRAPHY_MAP } = require('../geography-map');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createMapHarness(tileset) {
  var jsl = {
    inter: {
      format: {
        hasKey: function(obj, key) {
          return Object.prototype.hasOwnProperty.call(obj, key);
        }
      }
    }
  };
  var map = new PRDC_JSLAB_GEOGRAPHY_MAP(jsl, tileset);
  return { map };
}

tests.add('constructor resolves known tile source and keeps custom URL', function(assert) {
  var known = createMapHarness('OpenStreetMap').map;
  var custom = createMapHarness('https://tiles/{z}/{x}/{y}.png').map;
  assert.ok(String(known.tileset_url).includes('openstreetmap.org'));
  assert.equal(custom.tileset_url, 'https://tiles/{z}/{x}/{y}.png');
}, { tags: ['unit', 'geography-map'] });

tests.add('setCenter/setZoom update state and delegate to leaflet object when ready', function(assert) {
  var harness = createMapHarness('OpenStreetMap');
  var records = {};
  harness.map.ready = true;
  harness.map.leaflet_obj = {
    setView: function(latlon, zoom) {
      records.view = [latlon, zoom];
    },
    setZoom: function(zoom) {
      records.zoom = zoom;
    }
  };

  harness.map.setCenter(44.1, 20.2);
  harness.map.setZoom(9);

  assert.deepEqual(records.view[0], [44.1, 20.2]);
  assert.equal(records.view[1], 12);
  assert.equal(records.zoom, 9);
  assert.equal(harness.map.lat, 44.1);
  assert.equal(harness.map.lon, 20.2);
  assert.equal(harness.map.zoom, 9);
}, { tags: ['unit', 'geography-map'] });

tests.add('addMarker returns marker object and marker methods call leaflet APIs', function(assert) {
  var harness = createMapHarness('OpenStreetMap');
  var records = {};
  harness.map.ready = true;
  harness.map.leaflet_obj = {};
  harness.map.context = {
    L: {
      marker: function(latlon) {
        records.created_at = latlon;
        return {
          addTo: function() {
            return {
              setIcon: function(icon) {
                records.icon = icon;
              },
              setRotationOrigin: function(origin) {
                records.origin = origin;
              },
              setLatLng: function(latlon_out) {
                records.position = latlon_out;
              },
              setRotationAngle: function(angle) {
                records.rotation = angle;
              }
            };
          }
        };
      },
      icon: function(options) {
        return { type: 'icon', options: options };
      },
      divIcon: function(options) {
        return { type: 'divIcon', options: options };
      }
    }
  };

  var marker = harness.map.addMarker(45, 21);
  marker.setIcon({ iconUrl: '/a.png' });
  marker.setDivIcon({ html: '<b>x</b>' });
  marker.setPosition(46, 22);
  marker.setRotation(33);

  assert.deepEqual(records.created_at, [45, 21]);
  assert.equal(records.icon.type, 'divIcon');
  assert.equal(records.origin, 'center center');
  assert.deepEqual(records.position, [46, 22]);
  assert.equal(records.rotation, 33);
}, { tags: ['unit', 'geography-map'] });

exports.MODULE_TESTS = tests;

