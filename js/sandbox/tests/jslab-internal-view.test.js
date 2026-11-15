/**
 * @file JSLAB internal module view tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

/** Loads the core view implementation without starting a desktop runtime. */
function createView(target) {
  var context = { exports: {}, require: () => ({}) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'jslab.js'), 'utf8'), context);
  return context.exports.PRDC_JSLAB_LIB.prototype._createInternalModuleView(target);
}

tests.add('Internal views preserve constructor static methods and instances', function(assert) {
  function Cartesian3(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  Cartesian3.fromDegrees = function(lon, lat, alt) {
    return new Cartesian3(lon, lat, alt);
  };
  var view = createView({ Cesium: { Cartesian3 } });
  var point = view.Cesium.Cartesian3.fromDegrees(20, 44, 100);
  assert.equal(point.x, 20);
  assert.equal(point.y, 44);
  assert.equal(point.z, 100);
  assert.ok(point instanceof view.Cesium.Cartesian3);
  assert.equal(view.Cesium.Cartesian3.prototype, Cartesian3.prototype);
  assert.ok(new view.Cesium.Cartesian3(1, 2, 3) instanceof Cartesian3);
}, { tags: ['unit', 'core'] });

tests.add('Internal views retain method receivers and snapshots', function(assert) {
  var target = { value: 7, read() { return this.value; } };
  var view = createView(target);
  var read = view.read;
  target.read = () => -1;
  assert.equal(read(), 7);
  assert.equal(view.read, read);
  target.value = 8;
  assert.equal(view.read(), 8);
  target.later = function() { return this.value; };
  target.later.marker = 'static';
  var later = view.later;
  assert.equal(later(), 8);
  assert.equal(later.marker, 'static');
}, { tags: ['unit', 'core'] });

exports.MODULE_TESTS = tests;
