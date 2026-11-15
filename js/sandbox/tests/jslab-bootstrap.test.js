/**
 * @file JSLAB runtime publication and submodule export tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

/**
 * Runs the real core and override constructors with isolated host dependencies.
 * @param {boolean} web Whether to select the browser loading path.
 * @param {number} count Number of configured builtin fixture modules.
 * @param {boolean} refresh_during_startup Refresh workspace when a timer is registered.
 * @returns {Object} Runtime and captured global publication events.
 */
function createBootstrapHarness(web, count, refresh_during_startup = false) {
  var timers = [];
  var startup_workspaces = [];
  var publications = [];
  var constructor_runtimes = [];
  var context = new Proxy({
    console: {}, eval: function() {}, Promise: Promise,
    requestAnimationFrame: function() {}, cancelAnimationFrame: function() {},
    requestIdleCallback: function() {}, cancelIdleCallback: function() {}
  }, {
    set(target, prop, value) {
      if(prop === 'jsl') publications.push(value);
      return Reflect.set(target, prop, value);
    }
  });
  class FixtureModule {
    constructor(jsl) {
      this.jsl = jsl;
      this._private_value = 1;
      this.public_value = 2;
      constructor_runtimes.push(context.jsl);
    }
    publicMethod() { return this.jsl; }
    _privateMethod() { return 7; }
  }
  class FixtureEnv {
    constructor(jsl) {
      this.jsl = jsl;
      this.context = context;
      this.exports = [];
      this.math = { parser: function parser() {} };
      this.is_worker = web;
    }
    getDefaultPath() { return '/includes/'; }
    setWorkspace() { startup_workspaces.push(this.jsl.getWorkspace()); }
    setStats() {}
  }
  function FixtureNodeModule() {}
  FixtureNodeModule.prototype.require = function() {};
  var config = {
    PLOTTER: 'plotly',
    MATHJS_PREVENT_OVERRIDE: [],
    SUBMODULES: {
      builtin: Array.from({ length: count }, (_, i) => ({
        name: 'fixture' + i, file: 'fixture', class_name: 'FixtureModule'
      })),
      lib: []
    }
  };
  var scope = {
    global: { config: config, language: {} },
    __JSLAB_RUNTIME__: web ? 'web' : undefined,
    setTimeout: function(callback) {
      timers.push(callback);
      if(refresh_during_startup) context.jsl.onStatsChange();
    }, clearTimeout: function() {},
    setInterval: function() {}, clearInterval: function() {}
  };
  var modules = {
    './jslab-env-web': { PRDC_JSLAB_ENV: FixtureEnv },
    './jslab-env-electron': { PRDC_JSLAB_ENV: FixtureEnv },
    './jslab-execution': require('../jslab-execution'),
    './jslab-eval': { PRDC_JSLAB_EVAL: class {} },
    './jslab-plotter-plotly': { PRDC_JSLAB_PLOTTER: class {} },
    './jslab-internal-protected-modules': require('../jslab-internal-protected-modules'),
    './jslab-web-submodules': {
      getWebSubmoduleConstructor: function() { return FixtureModule; },
      getWebUnavailableSubmodule: function() {}
    },
    './fixture': { FixtureModule: FixtureModule },
    module: FixtureNodeModule
  };
  scope.require = function(name) {
    if(!web && name === './jslab-web-submodules') {
      throw new Error('Desktop packages must not load the browser constructor map.');
    }
    if(!Object.prototype.hasOwnProperty.call(modules, name)) {
      throw new Error('Unexpected fixture dependency: ' + name);
    }
    return modules[name];
  };
  // Electron disallows string compilation in some synthetic VM contexts.
  // Bootstrap uses eval only to hide the host require from browser bundlers.
  scope.eval = function(expression) {
    if(expression === 'require') return scope.require;
    throw new Error('Unexpected fixture evaluation: ' + expression);
  };
  vm.createContext(scope, { codeGeneration: { strings: true, wasm: true } });
  function load(name) {
    var source = fs.readFileSync(path.join(__dirname, '..', name + '.js'), 'utf8');
    return vm.runInContext('(function() { var exports = {};\n' + source +
      '\nreturn exports; })()', scope, { filename: name + '.js' });
  }
  modules['./jslab-override'] = load('jslab-override');
  var { PRDC_JSLAB_LIB } = load('jslab');
  var jsl = new PRDC_JSLAB_LIB('/fixture', false);
  return { jsl, context, publications, constructor_runtimes, timers, startup_workspaces };
}

for(const web of [false, true]) {
  tests.add('Workspace refresh is safe during ' + (web ? 'web' : 'desktop') + ' startup', function(assert) {
    var harness = createBootstrapHarness(web, 1, true);
    assert.equal(harness.jsl.ready, true);
    assert.ok(harness.startup_workspaces.length > 0);
    assert.ok(harness.startup_workspaces.every(rows => rows.length === 0));
    harness.context.parser = { messages: {} };
    assert.ok(harness.jsl.getWorkspaceProperties().includes('parser'));
  }, { tags: ['unit', 'core'] });

  tests.add('runtime is published once before submodules in ' + (web ? 'web' : 'desktop') + ' mode', function(assert) {
    var harness = createBootstrapHarness(web, 2);
    assert.equal(harness.jsl.ready, true);
    assert.equal(harness.context.jsl, harness.jsl);
    assert.equal(harness.publications.length, 1);
    assert.ok(harness.constructor_runtimes.every(runtime => runtime === harness.jsl));
    assert.ok(harness.jsl.initial_workspace.includes('jsl'));
    assert.equal(harness.context.public_value, 2);
    assert.equal(harness.context.publicMethod(), harness.jsl);
    assert.equal(Object.hasOwn(harness.context, '_private_value'), false);
    assert.equal(Object.hasOwn(harness.context, '_privateMethod'), false);
    assert.equal(Object.hasOwn(harness.context, '_constructSubmodule'), false);
    assert.equal(harness.jsl.inter.fixture0._privateMethod(), 7);
    assert.equal(harness.jsl.fixture0._private_value, 1);
  }, { tags: ['unit', 'core'] });
}

tests.add('runtime is published without builtin submodules', function(assert) {
  var harness = createBootstrapHarness(true, 0);
  assert.equal(harness.context.jsl, harness.jsl);
  assert.equal(harness.publications.length, 1);
  assert.ok(harness.jsl.initial_workspace.includes('jsl'));
}, { tags: ['unit', 'core'] });

for(const web of [false, true]) {
  tests.add('Workspace detects shadowed functions in ' + (web ? 'web' : 'desktop'), function(assert) {
    var { jsl, context, timers } = createBootstrapHarness(web, 1);
    var original = context.parser;
    assert.ok(!jsl.getWorkspaceProperties().includes('parser'));
    class DataflashParser {}
    context.parser = new DataflashParser();
    assert.ok(jsl.getWorkspaceProperties().includes('parser'));
    var row = jsl.getWorkspace().find(row => row[0] === 'parser');
    assert.equal(row[1], 'object');
    assert.equal(row[2], 'DataflashParser');
    assert.equal(jsl.inter.parser, original);
    for(const value of [() => 42, undefined, null, 0]) {
      context.parser = value;
      assert.ok(jsl.getWorkspaceProperties().includes('parser'));
    }
    Object.defineProperty(context, 'parser', {
      configurable: true, get() { throw Error('Workspace must not invoke getters.'); }
    });
    assert.equal(jsl.getWorkspace().find(row => row[0] === 'parser')[1], 'accessor');
    Object.defineProperty(context, 'parser', jsl._initial_function_descriptors.get('parser'));
    assert.ok(!jsl.getWorkspaceProperties().includes('parser'));
    timers.forEach(callback => callback());
    assert.ok(!jsl.getWorkspaceProperties().includes('Promise'));
  }, { tags: ['unit', 'core'] });
}

tests.add('Clear restores shadowed functions and removes user variables', function(assert) {
  var { jsl, context } = createBootstrapHarness(false, 1);
  var original = context.parser;
  context.parser = { messages: {} };
  context.flight_data = [1, 2];
  // Isolate resource cleanup while exercising the real workspace clear logic.
  var runtime = {
    context: context,
    _initial_function_descriptors: jsl._initial_function_descriptors,
    getWorkspaceProperties: jsl.getWorkspaceProperties.bind(jsl),
    doCleanup: () => Promise.resolve(),
    system: { _clear() {} }
  };
  context.sym = { clear() {} };
  context.parallel = { terminate() {} };
  for(const name of ['clearEventListeners', 'clearImmediates', 'clearAnimationFrames',
    'clearIntervals', 'clearTimeouts', 'clearIdleCallbacks', 'stopPromises',
    'stopSubprocesses', 'unrequireAll', 'onStatsChange']) {
    runtime[name] = () => {};
  }
  jsl.clear.call(runtime);
  assert.equal(context.parser, original);
  assert.ok(!Object.hasOwn(context, 'flight_data'));
  assert.ok(!jsl.getWorkspaceProperties().includes('parser'));
}, { tags: ['unit', 'core'] });

exports.MODULE_TESTS = tests;
