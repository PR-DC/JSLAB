/**
 * @file JSLAB web native-module bridge tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { createWebNativeModule, createWebAlphaShape3DClass, PRDC_JSLAB_WEB_ALPHA_SHAPE_3D } = require('../native-module-web');

var tests = new PRDC_JSLAB_TESTS();

tests.add('fallback native module computes trapezoidal integral', function(assert) {
  delete global.__JSLAB_NATIVE_MODULE_WASM_INSTANCE__;
  delete global.__JSLAB_WEB_NATIVE_WASM__;

  var native_module = createWebNativeModule();
  var integral = native_module.trapz([0, 1, 2], [0, 1, 2]);
  assert.equal(integral, 2);
}, { tags: ['unit', 'native-module-web'] });

tests.add('fallback native module computes cumulative trapezoidal integral', function(assert) {
  delete global.__JSLAB_NATIVE_MODULE_WASM_INSTANCE__;
  delete global.__JSLAB_WEB_NATIVE_WASM__;

  var native_module = createWebNativeModule();
  var cumulative = native_module.cumtrapz([0, 1, 2], [0, 1, 2]);
  assert.deepEqual(cumulative, [0, 0.5, 2]);
}, { tags: ['unit', 'native-module-web'] });

tests.add('fallback native module computes polynomial roots', function(assert) {
  delete global.__JSLAB_NATIVE_MODULE_WASM_INSTANCE__;
  delete global.__JSLAB_WEB_NATIVE_WASM__;

  var native_module = createWebNativeModule();
  var roots = native_module.roots([1, 0, -1]);
  roots.sort(function(a, b) {
    return Number(a) - Number(b);
  });
  assert.equal(roots.length, 2);
  assert.ok(Math.abs(roots[0] + 1) < 1e-7);
  assert.ok(Math.abs(roots[1] - 1) < 1e-7);
}, { tags: ['unit', 'native-module-web'] });

tests.add('web AlphaShape3D placeholder throws explicit error', function(assert) {
  assert.throws(function() {
    return new PRDC_JSLAB_WEB_ALPHA_SHAPE_3D();
  }, /AlphaShape3D/);
}, { tags: ['unit', 'native-module-web'] });

tests.add('web AlphaShape3D wasm wrapper builds boundary facets when bundle exists', async function(assert) {
  var factory_path = path.join(__dirname, '..', '..', '..', 'lib', 'native-wasm', 'alpha_shape_3d.js');
  var factory;
  var module_instance;
  var AlphaShape3D;
  var shp;
  var saved = [];
  var critical;
  var facets;

  if(!fs.existsSync(factory_path)) {
    assert.skip('alpha_shape_3d wasm bundle is not built.');
  }

  factory = require(factory_path);
  module_instance = factory();
  if(module_instance && typeof module_instance.then == 'function') {
    module_instance = await module_instance;
  }

  global.__JSLAB_ALPHA_SHAPE_3D_WASM_INSTANCE__ = module_instance;
  global.__JSLAB_WEB_NATIVE_WASM__ = {
    alpha_shape_3d: {
      available: true,
      entry: 'alpha_shape_3d.js'
    }
  };

  AlphaShape3D = createWebAlphaShape3DClass({
    writeFileSync: function(file_path, data) {
      saved.push({
        file_path: file_path,
        data: data
      });
      return true;
    }
  });

  shp = new AlphaShape3D();
  shp.newShape([
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 1, 1]
  ]);

  critical = shp.getCriticalAlpha('one-region');
  shp.setAlpha(critical);
  facets = shp.getBoundaryFacets();
  shp.writeOff('/tmp/test.off', [[0, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 1, 2]]);
  shp.delete();

  assert.equal(AlphaShape3D.available, true);
  assert.ok(Number.isFinite(critical));
  assert.equal(facets.length > 0, true);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].data.startsWith('OFF\n'), true);
}, { tags: ['unit', 'native-module-web'] });

exports.MODULE_TESTS = tests;
