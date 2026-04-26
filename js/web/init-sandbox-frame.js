/**
 * @file Browser iframe bootstrap for the shared JSLAB web sandbox
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

globalThis.global = globalThis;

function ensureBrowserProcess() {
  if(typeof globalThis.process == 'undefined' || !globalThis.process) {
    globalThis.process = {};
  }
  if(typeof globalThis.process.env == 'undefined' || !globalThis.process.env) {
    globalThis.process.env = {};
  }
  if(!Array.isArray(globalThis.process.argv)) {
    globalThis.process.argv = [];
  }
  if(typeof globalThis.process.cwd != 'function') {
    globalThis.process.cwd = function() {
      return '/';
    };
  }
  if(typeof globalThis.process.type == 'undefined') {
    globalThis.process.type = 'browser';
  }
  if(typeof globalThis.process.platform == 'undefined') {
    globalThis.process.platform = 'browser';
  }
  if(typeof globalThis.process.arch == 'undefined') {
    globalThis.process.arch = 'browser';
  }
}

ensureBrowserProcess();

if(typeof globalThis.process_arguments == 'undefined') {
  globalThis.process_arguments = [];
}
globalThis.process.argv = globalThis.process_arguments.slice();
globalThis.__JSLAB_RUNTIME__ = 'web';

require('../shared/init-config');

var strings = require('../../config/lang.json');
var { PRDC_JSLAB_LIB } = require('../sandbox/jslab');

function previewValue(value) {
  if(value === undefined) {
    return 'undefined';
  }
  if(value === null) {
    return 'null';
  }
  if(typeof value == 'string') {
    return JSON.stringify(value.length > 200 ? value.slice(0, 197) + '...' : value);
  }
  if(typeof value == 'number' || typeof value == 'boolean' || typeof value == 'bigint') {
    return String(value);
  }
  if(typeof value == 'function') {
    return '[Function ' + (value.name || 'anonymous') + ']';
  }
  if(Array.isArray(value)) {
    return 'Array(' + value.length + ')';
  }
  if(value instanceof Promise) {
    return '[Promise]';
  }
  var ctor = value && value.constructor && value.constructor.name
    ? value.constructor.name
    : 'Object';
  var keys = Object.keys(value || {});
  return ctor + (keys.length ? ' {' + keys.slice(0, 5).join(', ') + (keys.length > 5 ? ', ...' : '') + '}' : '');
}

function getBridge() {
  try {
    if(globalThis.parent && globalThis.parent.__JSLAB_WEB_BRIDGE__) {
      return globalThis.parent.__JSLAB_WEB_BRIDGE__;
    }
  } catch {}
  return null;
}

class PRDC_JSLAB_WEB_SANDBOX_LANGUAGE {

  constructor(lang) {
    this.s = strings;
    this.lang = ['en', 'rs', 'rsc'].includes(lang) ? lang : 'en';
  }

  set(lang) {
    if(['en', 'rs', 'rsc'].includes(lang)) {
      this.lang = lang;
    }
  }

  currentString(id) {
    var key = String(id);
    if(!(key in this.s) || !(this.lang in this.s[key])) {
      return '';
    }
    return this.s[key][this.lang];
  }

  string(id) {
    return this.currentString(id);
  }

  formatLang(id, values) {
    var text = this.currentString(id);
    if(!values || typeof values != 'object') {
      return text;
    }
    Object.keys(values).forEach(function(key) {
      text = text.replaceAll('{' + key + '}', String(values[key]));
    });
    return text;
  }
}

async function initializeNativeModuleWasm() {
  var factory = globalThis.PRDC_JSLAB_NATIVE_MODULE_FACTORY;

  if(typeof factory != 'function') {
    globalThis.__JSLAB_NATIVE_MODULE_WASM_INSTANCE__ = null;
    return null;
  }

  try {
    var module_instance = factory();
    if(module_instance && typeof module_instance.then == 'function') {
      module_instance = await module_instance;
    }
    globalThis.__JSLAB_NATIVE_MODULE_WASM_INSTANCE__ = module_instance || null;
    return globalThis.__JSLAB_NATIVE_MODULE_WASM_INSTANCE__;
  } catch(err) {
    console.warn('Failed to initialize native_module wasm bundle.', err);
    globalThis.__JSLAB_NATIVE_MODULE_WASM_INSTANCE__ = null;
    return null;
  }
}

async function initializeAlphaShape3DWasm() {
  var factory = globalThis.PRDC_JSLAB_ALPHA_SHAPE_3D_FACTORY;

  if(typeof factory != 'function') {
    globalThis.__JSLAB_ALPHA_SHAPE_3D_WASM_INSTANCE__ = null;
    return null;
  }

  try {
    var module_instance = factory();
    if(module_instance && typeof module_instance.then == 'function') {
      module_instance = await module_instance;
    }
    globalThis.__JSLAB_ALPHA_SHAPE_3D_WASM_INSTANCE__ = module_instance || null;
    return globalThis.__JSLAB_ALPHA_SHAPE_3D_WASM_INSTANCE__;
  } catch(err) {
    console.warn('Failed to initialize alpha_shape_3d wasm bundle.', err);
    globalThis.__JSLAB_ALPHA_SHAPE_3D_WASM_INSTANCE__ = null;
    return null;
  }
}

async function bootSandbox() {
  await initializeNativeModuleWasm();
  await initializeAlphaShape3DWasm();
  var bridge = getBridge();
  var language = bridge && typeof bridge.getLanguage == 'function'
    ? bridge.getLanguage()
    : null;
  var lang = new PRDC_JSLAB_WEB_SANDBOX_LANGUAGE(language ? language.lang : 'en');

  globalThis.language = lang;

  var jsl = new PRDC_JSLAB_LIB('', false);
  jsl.current_path = '/workspace/';
  jsl.includes_path = '/includes/';
  jsl.saved_paths = ['/workspace/'];

  jsl.emitRuntimeMessage = function(message, level) {
    var current_bridge = getBridge();
    if(current_bridge && typeof current_bridge.emitSandboxRuntimeLog == 'function') {
      current_bridge.emitSandboxRuntimeLog(message, level || 'info');
    }
  };
  jsl.emitUnavailable = function(message) {
    jsl.emitRuntimeMessage(message, 'warn');
  };
  jsl.onWorkspaceUpdated = function() {
    var current_bridge = getBridge();
    if(current_bridge && typeof current_bridge.emitSandboxWorkspaceUpdated == 'function') {
      current_bridge.emitSandboxWorkspaceUpdated(snapshotWorkspace());
    }
  };
  jsl.onStatsUpdated = function(stats) {
    var current_bridge = getBridge();
    if(current_bridge && typeof current_bridge.emitSandboxStatsUpdated == 'function') {
      current_bridge.emitSandboxStatsUpdated(stats || {});
    }
  };
  jsl.onStatusUpdated = function(state, text) {
    var current_bridge = getBridge();
    if(current_bridge && typeof current_bridge.emitSandboxStatusUpdated == 'function') {
      current_bridge.emitSandboxStatusUpdated(state, text);
    }
  };

  var bootstrap_workspace = new Set(jsl.getWorkspaceProperties());

  function snapshotWorkspace() {
    var snapshot = [];
    jsl.getWorkspace().forEach(function(row) {
      if(row && row.length &&
          !bootstrap_workspace.has(row[0]) &&
          typeof row[0] == 'string' &&
          !row[0].startsWith('__JSLAB_') &&
          !row[0].startsWith('__jsl_')) {
        snapshot.push(row);
      }
    });
    snapshot.sort(function(a, b) {
      return String(a[0]).localeCompare(String(b[0]));
    });
    return snapshot;
  }

  async function evaluate(code) {
    var eval_runtime = jsl.eval;
    jsl.onEvaluating();
    jsl.jsl_file_name = 'jslcmdwindow';
    jsl.current_script = 'jslcmdwindow';

    eval_runtime.source_codes = [];
    eval_runtime.transformed_codes = [];
    eval_runtime.source_maps = [];
    eval_runtime.source_map_scripts = [];
    eval_runtime.current_source_code = undefined;
    eval_runtime.current_source_map = undefined;
    eval_runtime.current_source_script = undefined;

    jsl.savePreviousWorkspace();
    jsl.loadPreviousWorkspace();

    try {
      var value = await jsl.eval.evalString(String(code || ''));
      if(jsl.no_ans === false) {
        jsl.context.ans = value;
      }
      if(jsl.ignore_output === false) {
        jsl.inter.env.showAns(jsl.inter.prettyPrint(value));
      }
      jsl.onEvaluated();
      return {
        ok: true,
        value: value,
        preview: previewValue(value),
        workspace: snapshotWorkspace()
      };
    } catch(err) {
      jsl.eval.onEvalError(err);
      throw err;
    }
  }

  function setLanguage(next_lang) {
    lang.set(next_lang);
    try {
      if(jsl.inter.figures && typeof jsl.inter.figures._updateLanguage == 'function') {
        jsl.inter.figures._updateLanguage();
      }
      if(jsl.inter.windows && typeof jsl.inter.windows._updateLanguage == 'function') {
        jsl.inter.windows._updateLanguage();
      }
    } catch {}
    jsl.onStatusUpdated('ready', lang.currentString(87));
    return true;
  }

  function notifyWindowClosed(wid) {
    if(jsl.inter.windows && typeof jsl.inter.windows._closedWindow == 'function') {
      jsl.inter.windows._closedWindow(wid);
    }
    return true;
  }

  function clearWorkspace() {
    jsl.getWorkspaceProperties().forEach(function(name) {
      if(typeof name == 'string' &&
          !name.startsWith('__JSLAB_') &&
          !name.startsWith('__jsl_')) {
        try {
          delete jsl.context[name];
        } catch {}
      }
    });
    jsl.previous_properties = [];
    jsl.previous_workspace = {};
    jsl.no_ans = true;
    jsl.ignore_output = true;
    if(typeof jsl.onWorkspaceUpdated == 'function') {
      jsl.onWorkspaceUpdated();
    }
    return snapshotWorkspace();
  }

  function getCompletions(data) {
    if(jsl.inter &&
        jsl.inter.basic &&
        typeof jsl.inter.basic.getCompletions == 'function') {
      return jsl.inter.basic.getCompletions(data);
    }
    return [];
  }

  globalThis.__JSLAB_WEB_SANDBOX__ = {
    jsl: jsl,
    handshake: function() {
      return {
        runtime: 'shared-web-sandbox-frame',
        note: '',
        workspace: snapshotWorkspace(),
        capabilities: jsl.env.getCapabilities(),
        runtime_info: typeof jsl.env.getRuntimeInfo == 'function'
          ? jsl.env.getRuntimeInfo()
          : {}
      };
    },
    evaluate: evaluate,
    setLanguage: setLanguage,
    clearWorkspace: clearWorkspace,
    getCompletions: getCompletions,
    notifyWindowClosed: notifyWindowClosed
  };
}

bootSandbox().catch(function(err) {
  globalThis.__JSLAB_WEB_SANDBOX_BOOT_ERROR__ = err && err.stack
    ? String(err.stack)
    : String(err);
  console.error(err && err.stack ? err.stack : err);
});
