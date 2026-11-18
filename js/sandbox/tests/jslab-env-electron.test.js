/**
 * @file JSLAB electron environment tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for jslab env electron test fixtures.
 */
class PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER {

  /**
   * Loads env class.
   * @param {*} runtime_scope Runtime scope.
   * @param {Object} [records] Records.
   */
  static loadEnvClass(runtime_scope, records = {}) {
    var source = fs.readFileSync(path.join(__dirname, '..', 'jslab-env-electron.js'), 'utf8');
    var context = {
      module: { exports: {} },
      exports: null,
      self: runtime_scope,
      globalThis: runtime_scope,
      process: records.real_process ? process : { pid: 321 },
      console: console,
      SpeechSynthesisUtterance: class {},
      speechSynthesis: { getVoices: function() {
        return [];
      } },
      navigator: { hardwareConcurrency: 1, onLine: true },
      setInterval: () => {
        throw Error('Window readiness must not use workspace timers.');
      },
      Cesium: {},
      require: function(module_path) {
        if(records.block_loads) {
          throw new Error('Unexpected runtime module load: ' + module_path);
        }
        if(module_path === '../backend-electron/presentation-transport') {
          return require('../../backend-electron/presentation-transport');
        }
        if(module_path === './jslab-wasm-native') {
          return { createNativeModule: function() {
            return { wasm: true };
          } };
        }
        if(module_path === './jslab-wasm-alpha-shape') {
          return { createAlphaShape3DClass: function() {
            return class {};
          } };
        }
        if(module_path === './jslab-wasm-loader') {
          return { getWasmModules: function() {
            return { native: {}, alpha: {} };
          } };
        }
        if(module_path === '../backend-electron/simulate-assets') {
          return require('../../backend-electron/simulate-assets');
        }
        if(module_path === '../simulate/compiler') {
          return require('../../simulate/compiler');
        }
        if(module_path === './jslab-simulate') {
          return require('../jslab-simulate');
        }
        if(module_path === '../backend-electron/freecad-link') {
          return { PRDC_JSLAB_FREECAD_LINK: class { /**
 * Initializes the instance.
 * @param {*} jsl Jsl.
 */
            constructor(jsl) {
              this.jsl = jsl;
            }
          } };
        }
        if(module_path === '../backend-electron/openmodelica-link') {
          return { PRDC_JSLAB_OPENMODELICA_LINK: class { /**
 * Initializes the instance.
 * @param {*} jsl Jsl.
 */
            constructor(jsl) {
              this.jsl = jsl;
            }
          } };
        }
        if(module_path === '../backend-electron/excel-link') {
          return { PRDC_JSLAB_EXCEL_LINK: class { /**
 * Initializes the instance.
 * @param {*} jsl Jsl.
 */
            constructor(jsl) {
              this.jsl = jsl;
            }
          } };
        }
        if(module_path === '../backend-electron/calc-link') {
          return { PRDC_JSLAB_CALC_LINK: class { /**
 * Initializes the instance.
 * @param {*} jsl Jsl.
 */
            constructor(jsl) {
              this.jsl = jsl;
            }
          } };
        }
        if(module_path === '../backend-electron/sandbox-automation') {
          records.automation_loads = (records.automation_loads || 0) + 1;
          return { PRDC_JSLAB_SANDBOX_AUTOMATION: class {
            /**
             * Initializes the instance.
             * @param {*} jsl Jsl.
             */
            constructor(jsl) {
              this.jsl = jsl;
              records.automation_instances = (records.automation_instances || 0) + 1;
            }
            /**
             * Executes.
             * @param {string} method Method.
             * @param {*} args Args.
             */
            async execute(method, args) {
              records.requests.push({ method: method, args: args });
              return { success: true };
            }
          } };
        }
        if(module_path === 'fs') {
          return require('fs');
        }
        if(module_path === 'os') {
          return require('os');
        }
        if(module_path === 'net') {
          return {};
        }
        if(module_path === 'dgram') {
          return {};
        }
        if(module_path === 'child_process') {
          return records.real_process ? require('child_process') : {};
        }
        if(module_path === 'path') {
          return require('path');
        }
        if(module_path === 'timers') {
          return {
            setInterval: callback => {
              records.poll_ready = callback;
              records.interval_id = (records.interval_id || 0) + 1;
              return records.interval_id;
            },
            clearInterval: id => {
              records.cleared_interval = id;
              records.cleared_intervals = (records.cleared_intervals || []).concat(id);
            }
          };
        }
        if(module_path === 'tcp-port-used') {
          return {};
        }
        if(module_path === 'path-equal') {
          return { pathEqual: function(a, b) {
            return a === b;
          } };
        }
        if(module_path === 'stream') {
          return { Readable: class {}, Writable: class {} };
        }
        if(module_path === 'node-7z') {
          return { extractFull: function() {} };
        }
        if(module_path === 'seedrandom') {
          return function() {};
        }
        if(module_path === '7zip-bin') {
          return { path7za: '7za' };
        }
        if(module_path === 'pdfkit') {
          return class {};
        }
        if(module_path === 'svg-to-pdfkit') {
          return function() {};
        }
        if(module_path === 'ml-regression-polynomial') {
          return { PolynomialRegression: class {} };
        }
        if(module_path === 'recast') {
          return {};
        }
        if(module_path === '@babel/parser') {
          return {};
        }
        if(module_path === 'source-map') {
          return { SourceMapConsumer: { initialize: function() {} } };
        }
        if(module_path === 'serialport') {
          return { SerialPort: class {} };
        }
        if(module_path === 'jsdoc-api') {
          return {};
        }
        if(module_path === 'egm96-universal') {
          return {};
        }
        if(module_path === 'electron') {
          return {
            ipcRenderer: {
              sendSync: function() {
                return null;
              },
              on: function(channel, callback) {
                if(records.handlers) {
                  records.handlers[channel] = callback;
                }
              },
              send: function(channel, data) {
                if(records.replies) {
                  records.replies.push({ channel: channel, data: data });
                }
              },
              invoke: function(channel, data) {
                if(records.invocations) {
                  records.invocations.push({ channel: channel, data: data });
                }
                return Promise.resolve({ success: true });
              }
            }
          };
        }
        throw new Error('Unexpected require path: ' + module_path);
      }
    };

    context.exports = context.module.exports;
    vm.runInNewContext(source, context, { filename: 'jslab-env-electron.js' });
    return context.module.exports.PRDC_JSLAB_ENV;
  }
}


const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();


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
  var EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass(runtime_scope);
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
  var EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass(runtime_scope);
  var jsl = { app_path: '/app', inter: {} };
  var env = new EnvClass(jsl);

  assert.equal(env.is_worker, true);
  assert.equal(env._automation, null);
  assert.equal(env.version, '9.9.9');
  assert.equal(env.platform, 'linux');
  assert.equal(env.process_pid, 321);
  assert.ok(runtime_scope.freecad_link);
  assert.ok(runtime_scope.om_link);
  assert.ok(runtime_scope.excel_link);
  assert.ok(runtime_scope.calc_link);
  assert.deepEqual(env.exports, ['debug', 'version', 'platform', 'buildShareLink']);
}, { tags: ['unit', 'jslab-env-electron'] });

tests.add('bound environment output methods capture automation messages', function(assert) {
  var EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: true });
  var records = [];
  var env = { is_worker: true };
  var display = EnvClass.prototype.disp.bind(env);
  var warning = EnvClass.prototype.warn.bind(env);
  var error = EnvClass.prototype.error.bind(env);
  env._automation_output = function(type, values) {
    records.push({ type: type, values: values });
  };
  display('display');
  warning('warning');
  error('failure', false);
  assert.deepEqual(records.map(function(entry) {
    return entry.type;
  }), ['disp', 'warn', 'error']);
  assert.equal(records[2].values[0], 'failure');
}, { tags: ['unit', 'jslab-env-electron', 'automation'] });

tests.add('desktop automation loads before runtime overrides and reuses its private instance', async function(assert) {
  var records = { handlers: {}, requests: [], replies: [] };
  var runtime_scope = { addEventListener: function() {},
    setImmediate: setImmediate, clearImmediate: clearImmediate };
  var EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass(runtime_scope, records);
  assert.equal(records.automation_loads, 1);
  var env = new EnvClass({ app_path: '/app', inter: {} });
  assert.ok(env._automation);
  assert.equal(records.automation_instances, 1);
  assert.equal(env.exports.includes('_automation'), false);
  records.block_loads = true;
  records.handlers.SandboxWindow({}, 'automation-request', {
    id: 'first', method: 'list_workspace', args: {}
  });
  records.handlers.SandboxWindow({}, 'automation-request', {
    id: 'second', method: 'get_help', args: { name: 'plot' }
  });
  await Promise.resolve();
  assert.equal(records.automation_instances, 1);
  assert.equal(records.requests.length, 2);
  assert.equal(records.replies[0].data.id, 'first');
  assert.equal(records.replies[1].data.result.success, true);
}, { tags: ['unit', 'jslab-env-electron', 'automation'] });

tests.add('Simulate resolver transfers record data and reports cyclic values without a clone failure', async function(assert) {
  var records = { handlers: {}, requests: [], replies: [] };
  var runtime_scope = { addEventListener: function() {}, setImmediate: setImmediate, clearImmediate: clearImmediate };
  var EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass(runtime_scope, records);
  var value = { rate: 9, samples: new Float64Array([1, 2]) };
  var expressions = [];
  new EnvClass({ app_path: '/app', inter: { eval: { evalString: async function(expression) {
    expressions.push(expression);
    return value;
  } } } });
  records.block_loads = true;
  records.handlers.SandboxWindow({}, 'simulate-resolve', { id: 1, expression: 'settings' });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(records.replies[0].data.success, true);
  assert.equal(JSON.stringify(records.replies[0].data.js_value), '{"rate":9,"samples":[1,2]}');
  assert.equal(expressions[0], '(settings)');
  value.self = value;
  records.handlers.SandboxWindow({}, 'simulate-resolve', { id: 2, expression: 'settings' });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(records.replies[1].data.success, false);
  assert.equal(records.replies[1].data.value_code, 'cycle');
  assert.equal(records.replies[1].data.value_path, 'value.self');
}, { tags: ['unit', 'jslab-env-electron', 'modelica'] });

tests.add('desktop environment tracks only subprocesses it launches and forgets exits', function(assert) {
  const { EventEmitter } = require('events');
  const EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: true });
  const env = Object.create(EnvClass.prototype);
  env.process_pid = 321;
  env._subprocesses = new Set();
  const child = new EventEmitter();
  child.pid = 123;
  child.exitCode = null;
  env._trackSubprocess(child);
  assert.deepEqual(env.listSubprocesses(), [123]);
  assert.throws(() => env.listSubprocesses(-1), /positive process ID/);
  assert.throws(() => env.listSubprocesses(987), /owned/);
  child.emit('exit', 0);
  assert.deepEqual(env.listSubprocesses(), []);
}, { tags: ['unit', 'jslab-env-electron'] });

tests.add('file reads and writes follow workspace cwd without changing process cwd', function(assert) {
  const os = require('os');
  const { pathToFileURL } = require('url');
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-file-cwd-'));
  const EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: true });
  const env = Object.create(EnvClass.prototype);
  env.jsl = { current_path: folder, _console: { log: error => {
    throw error;
  } } };
  const original_cwd = process.cwd();
  try {
    fs.writeFileSync(path.join(folder, 'input.txt'), 'workspace data');
    assert.equal(env.readFileSync('input.txt', 'utf8'), 'workspace data');
    env.writeFileSync('output.txt', 'relative output');
    assert.equal(fs.readFileSync(path.join(folder, 'output.txt'), 'utf8'), 'relative output');
    assert.equal(env.readFileSync(pathToFileURL(path.join(folder, 'input.txt')), 'utf8'), 'workspace data');
    const descriptor = fs.openSync(path.join(folder, 'input.txt'), 'r');
    try {
      assert.equal(env.readFileSync(descriptor, 'utf8'), 'workspace data');
    } finally {
      fs.closeSync(descriptor);
    }
    assert.equal(process.cwd(), original_cwd);
  } finally {
    fs.unlinkSync(path.join(folder, 'input.txt'));
    if(fs.existsSync(path.join(folder, 'output.txt'))) {
      fs.unlinkSync(path.join(folder, 'output.txt'));
    }
    fs.rmdirSync(folder);
  }
}, { tags: ['unit', 'jslab-env-electron', 'filesystem'] });

tests.add('desktop window-close notifications use the private windows module', function(assert) {
  const records = { handlers: {}, requests: [], replies: [] };
  const EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: false, addEventListener: function() {} }, records);
  const closed = [];
  new EnvClass({ app_path: '/app', inter: { windows: {
    _closedWindow: wid => closed.push(wid)
  } } });
  records.handlers.SandboxWindow({}, 'window-closed', 42);
  assert.deepEqual(closed, [42]);
}, { tags: ['unit', 'jslab-env-electron', 'windows'] });

tests.add('Modelica results publish complete workspace data and retain compiler scene references', function(assert) {
  const EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: true });
  const env = Object.create(EnvClass.prototype);
  env.jsl = { inter: {} };
  env.context = {};
  env.setWorkspace = function() {
    env.workspace_updated = true;
  };
  env._publishSimulateResult({ model_name: 'Mechanism', result: {
    columns: ['time', 'a.frame_a.r_0[1]', 'a.frame_a.r_0[2]', 'a.frame_a.r_0[3]',
      'b.frame_b.r_0[1]', 'b.frame_b.r_0[2]', 'b.frame_b.r_0[3]'],
    rows: [[0, 0, 0, 0, 1, 0, 0], [1, 0, 1, 0, 1, 1, 0]], units: { time: 's' },
    scene: { xml: '<visualization><shape></shape></visualization>' }
  }, components: [], connections: [{ from: 'a.frame_a', to: 'b.frame_b' }],
  visualization: { joint: { color: [255, 0, 0] } } });
  assert.equal(env.workspace_updated, true);
  assert.equal(env.context.simulation.model, 'Mechanism');
  assert.deepEqual(env.context.simulation.get('a.frame_a.r_0[2]'), [0, 1]);
  assert.equal(env.context.simulation.names.length, 7);
  var animation = env._simulateAnimationData({ components: [],
    connections: [{ from: 'a.frame_a', to: 'b.frame_b' }],
    visualization: env._getSimulate()._simulate_diagram.visualization });
  assert.equal(animation.length, 2);
  assert.equal(animation.xml, env.context.simulation.scene.xml);
  assert.equal(animation.variables, env.context.simulation.variables);
  delete env.context.simulation.scene;
  assert.equal(env._simulateAnimationData({}), null);
}, { tags: ['unit', 'jslab-env-electron', 'figures', 'modelica'] });

tests.add('Modelica animation camera snapshot ignores Plotly managed object state', function(assert) {
  const EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: true });
  const env = Object.create(EnvClass.prototype);
  env.jsl = { inter: {} };
  var camera = {
    eye: { x: 2.2, y: -1.1, z: .7 },
    up: { x: 0, y: 0, z: 1 },
    center: { x: 0, y: 0, z: 0 },
    projection: { type: 'orthographic' },
    managed: function() {}
  };
  camera.cycle = camera;
  assert.deepEqual(env._simulateCameraSnapshot(camera), {
    eye: { x: 2.2, y: -1.1, z: .7 },
    up: { x: 0, y: 0, z: 1 },
    center: { x: 0, y: 0, z: 0 },
    projection: { type: 'orthographic' }
  });
}, { tags: ['unit', 'jslab-env-electron', 'figures', 'modelica'] });

tests.add('Modelica animation wheel zoom changes orthographic scale without fixed limits', function(assert) {
  const EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: true });
  const env = Object.create(EnvClass.prototype);
  env.jsl = { inter: {} };
  assert.ok(env._simulateZoomScale(1, -120) > 1);
  assert.ok(env._simulateZoomScale(1, 120) < 1);
  assert.ok(env._simulateZoomScale(100, -240) > 100);
  assert.ok(env._simulateZoomScale(0.01, 240) < 0.01);
  assert.equal(env._simulateZoomScale(0, 120), null);
}, { tags: ['unit', 'jslab-env-electron', 'figures', 'modelica'] });

tests.add('Modelica property bindings serialize only safe workspace values', function(assert) {
  const EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: true });
  const env = Object.create(EnvClass.prototype);
  assert.equal(env._modelicaLiteral(2.5), '2.5');
  assert.equal(env._modelicaLiteral(true), 'true');
  assert.equal(env._modelicaLiteral('a"b'), '"a\\"b"');
  assert.equal(env._modelicaLiteral([1, new Float64Array([2, 3])]), '{1, {2, 3}}');
  assert.throws(function() {
    env._modelicaLiteral(Infinity);
  });
  assert.throws(function() {
    env._modelicaLiteral({ value: 1 });
  });
}, { tags: ['unit', 'jslab-env-electron', 'modelica'] });

tests.add('Modelica automation copies evaluated record and array parameters without reevaluation', async function(assert) {
  const records = { invocations: [] };
  const EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: false }, records);
  const env = Object.create(EnvClass.prototype);
  env.is_worker = false;
  await env.simulate('mechanism.jslmo', { run: true,
    parameters: { mass: 200, vector: new Float64Array([1, 2, 3]), settings: { rate: 9 } } });
  assert.equal(records.invocations.length, 1);
  assert.equal(records.invocations[0].channel, 'JSLAB_SIMULATE_AUTOMATION');
  assert.equal(JSON.stringify(records.invocations[0].data.options.parameters),
    JSON.stringify({ mass: 200, vector: [1, 2, 3], settings: { rate: 9 } }));
}, { tags: ['unit', 'jslab-env-electron', 'modelica', 'automation'] });

tests.add('window readiness survives a missed DOMContentLoaded event after navigation', async function(assert) {
  const records = {};
  const EnvClass = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_ENV_ELECTRON_TEST_HELPER.loadEnvClass({ is_worker: true }, records);
  const env = Object.create(EnvClass.prototype);
  const child = { closed: false, location: { href: 'about:blank' },
    document: { readyState: 'complete', addEventListener: function() {} },
    addEventListener: function() {} };
  env.is_worker = false;
  env.context = { open: () => child };
  env.jsl = { inter: { windows: { open_windows: { 1: {} } } } };
  const [context, ready] = env.openWindow(1, '/figure.html');
  let resolved = false;
  ready.then(() => {
    resolved = true;
  });
  records.poll_ready();
  await Promise.resolve();
  assert.equal(resolved, false);
  // No DOMContentLoaded callback reaches the opener after the new document loads.
  child.location.href = 'file:///figure.html';
  records.poll_ready();
  assert.equal(await ready, child);
  assert.equal(context.wid, 1);
  assert.equal(records.cleared_interval, 1);
}, { tags: ['unit', 'jslab-env-electron', 'windows'] });

exports.MODULE_TESTS = tests;
