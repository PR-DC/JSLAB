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

async function bootSandbox() {
  const { configureWasm, prepareWasmForCode } = require('../sandbox/jslab-wasm-loader');
  var wasm_info = globalThis.parent && globalThis.parent.__JSLAB_WEB_NATIVE_WASM__
    ? globalThis.parent.__JSLAB_WEB_NATIVE_WASM__
    : {};
  function lazyWasmFactory(global_name, entry) {
    return async function() {
      if(typeof globalThis[global_name] != 'function') {
        var base_url = globalThis.parent && globalThis.parent.location
          ? globalThis.parent.location.href
          : globalThis.document.baseURI;
        var version = wasm_info.version ? '?v='+encodeURIComponent(wasm_info.version) : '';
        var url = new URL('./lib/native-wasm/'+entry+version, base_url).href;
        await new Promise(function(resolve, reject) {
          var script = document.createElement('script');
          script.src = url;
          script.onload = resolve;
          script.onerror = function() { reject(new Error('Unable to load WebAssembly backend: '+url)); };
          document.head.appendChild(script);
        });
      }
      if(typeof globalThis[global_name] != 'function') {
        throw new Error('WebAssembly backend factory is unavailable: '+global_name);
      }
      return await globalThis[global_name]();
    };
  }
  configureWasm(
    lazyWasmFactory('PRDC_JSLAB_NATIVE_MODULE_FACTORY',
      wasm_info.native_module && wasm_info.native_module.entry || 'native_module.js'),
    lazyWasmFactory('PRDC_JSLAB_ALPHA_SHAPE_3D_FACTORY',
      wasm_info.alpha_shape_3d && wasm_info.alpha_shape_3d.entry || 'alpha_shape_3d.js')
  );
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
    await prepareWasmForCode(code);
    const result = await jsl.inter.eval.evalCodeFromMain(String(code || ''), true, 'jslcmdwindow');
    if(!result.success) throw Object.assign(new Error(result.error), { error_details: result.error_details });
    return { ok: true, value: result.value, preview: previewValue(result.value), workspace: snapshotWorkspace() };
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

  function getConsoleProperties(request) {
    return jsl.inter.format._consoleProperties(request.object_id, request.offset, request.limit);
  }

  function getConsoleAccessor(request) {
    return jsl.inter.format._consoleAccessor(request.object_id, request.property);
  }

  function getConsolePreview(expression) {
    return jsl.inter.basic._getConsolePreview(expression);
  }

  function isConsoleExpressionComplete(code) {
    return jsl.inter.basic._isConsoleExpressionComplete(code);
  }

  const worker_plots = new Map();
  const { FIGURE_COMMANDS, PLOT_COMMANDS } = require('./worker-ui');
  async function workerUI(operation) {
    const figures = jsl.inter.figures;
    if(operation.kind === 'figure') {
      figures.figure(operation.fid);
      await figures.getFigure(operation.fid).ready;
    } else if(operation.kind === 'plot') {
      figures.figure(operation.fid);
      const plot = figures.plot(...operation.args);
      worker_plots.set(operation.handle, plot);
      await plot.ready;
    } else if(operation.kind === 'plot-method') {
      const plot = worker_plots.get(operation.handle);
      if(!plot || !PLOT_COMMANDS.includes(operation.method) || typeof plot[operation.method] !== 'function') throw Error('Unknown remote plot or method.');
      await plot[operation.method](...operation.args);
      if(operation.method === 'update') {
        const context = figures.getFigure(plot.fid)?.context;
        if(context) await new Promise(resolve => context.requestAnimationFrame(resolve));
      }
    } else if(operation.kind === 'figure-method') {
      if(!FIGURE_COMMANDS.includes(operation.method)) throw Error('Unsupported worker figure operation.');
      figures.figure(operation.fid);
      if(operation.method === 'print') await figures.getPlot(operation.fid).print(...operation.args);
      else await figures[operation.method](...operation.args);
    } else if(operation.kind === 'close') {
      if(operation.fid === 'all') {
        await Promise.all(Object.keys(figures.open_figures).map(fid => figures.closeFigure(fid)));
      } else await figures.closeFigure(operation.fid);
      for(const [id, plot] of worker_plots) if(operation.fid === 'all' || plot.fid === operation.fid) worker_plots.delete(id);
    }
    else throw Error('Unsupported worker UI operation.');
    return true;
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
    workerUI,
    setLanguage: setLanguage,
    clearWorkspace: clearWorkspace,
    getCompletions: getCompletions,
    getConsoleProperties: getConsoleProperties,
    getConsoleAccessor: getConsoleAccessor,
    getConsolePreview: getConsolePreview,
    isConsoleExpressionComplete: isConsoleExpressionComplete,
    notifyWindowClosed: notifyWindowClosed
  };
}

bootSandbox().catch(function(err) {
  globalThis.__JSLAB_WEB_SANDBOX_BOOT_ERROR__ = err && err.stack
    ? String(err.stack)
    : String(err);
  console.error(err && err.stack ? err.stack : err);
});
