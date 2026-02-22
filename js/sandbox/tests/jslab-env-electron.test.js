/**
 * @file JSLAB electron environment tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function loadEnvClass(runtime_scope) {
  var source = fs.readFileSync(path.join(__dirname, '..', 'jslab-env-electron.js'), 'utf8');
  var context = {
    module: { exports: {} },
    exports: null,
    self: runtime_scope,
    globalThis: runtime_scope,
    process: { pid: 321 },
    console: console,
    require: function(module_path) {
      if(module_path === './freecad-link') {
        return { PRDC_JSLAB_FREECAD_LINK: class { constructor(jsl) { this.jsl = jsl; } } };
      }
      if(module_path === './om-link') {
        return { PRDC_JSLAB_OPENMODELICA_LINK: class { constructor(jsl) { this.jsl = jsl; } } };
      }
      if(module_path === 'fs') return require('fs');
      if(module_path === 'os') return require('os');
      if(module_path === 'net') return {};
      if(module_path === 'dgram') return {};
      if(module_path === 'child_process') return {};
      if(module_path === 'path') return require('path');
      if(module_path === 'tcp-port-used') return {};
      if(module_path === 'path-equal') return { pathEqual: function(a, b) { return a === b; } };
      if(module_path === 'stream') return { Readable: class {}, Writable: class {} };
      if(module_path === 'node-7z') return { extractFull: function() {} };
      if(module_path === 'seedrandom') return function() {};
      if(module_path === '7zip-bin') return { path7za: '7za' };
      if(module_path === 'pdfkit') return class {};
      if(module_path === 'svg-to-pdfkit') return function() {};
      if(module_path === 'ml-regression-polynomial') return { PolynomialRegression: class {} };
      if(module_path === 'recast') return {};
      if(module_path === '@babel/parser') return {};
      if(module_path === 'source-map') {
        return { SourceMapConsumer: { initialize: function() {} } };
      }
      if(module_path === 'serialport') return { SerialPort: class {} };
      if(module_path === 'jsdoc-api') return {};
      if(module_path === 'egm96-universal') return {};
      if(module_path === 'electron') {
        return {
          ipcRenderer: {
            sendSync: function() { return null; },
            on: function() {}
          }
        };
      }
      if(module_path.endsWith('/build/Release/native_module')) {
        return { NativeModule: class {} };
      }
      if(module_path.endsWith('/build/Release/alpha_shape_3d')) {
        return { AlphaShape3D: class {} };
      }
      throw new Error('Unexpected require path: ' + module_path);
    }
  };

  context.exports = context.module.exports;
  vm.runInNewContext(source, context, { filename: 'jslab-env-electron.js' });
  return context.module.exports.PRDC_JSLAB_ENV;
}

tests.add('module exports PRDC_JSLAB_ENV class in worker context', function(assert) {
  var runtime_scope = {
    is_worker: true,
    debug: true,
    version: '1.2.3',
    platform: 'win32',
    math: {},
    fmin: {},
    setImmediate: setImmediate,
    clearImmediate: clearImmediate
  };
  var EnvClass = loadEnvClass(runtime_scope);
  assert.equal(typeof EnvClass, 'function');
}, { tags: ['unit', 'jslab-env-electron'] });

tests.add('constructor initializes worker-side fields and shared context links', function(assert) {
  var runtime_scope = {
    is_worker: true,
    debug: false,
    version: '9.9.9',
    platform: 'linux',
    math: { id: 'math' },
    fmin: { id: 'fmin' },
    setImmediate: setImmediate,
    clearImmediate: clearImmediate
  };
  var EnvClass = loadEnvClass(runtime_scope);
  var jsl = { app_path: '/app', inter: {} };
  var env = new EnvClass(jsl);

  assert.equal(env.is_worker, true);
  assert.equal(env.version, '9.9.9');
  assert.equal(env.platform, 'linux');
  assert.equal(env.process_pid, 321);
  assert.ok(runtime_scope.freecad_link);
  assert.ok(runtime_scope.om_link);
  assert.deepEqual(env.exports, ['debug', 'version', 'platform']);
}, { tags: ['unit', 'jslab-env-electron'] });

exports.MODULE_TESTS = tests;

