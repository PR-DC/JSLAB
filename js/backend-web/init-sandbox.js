/**
 * @file Browser iframe startup for the shared JSLAB web sandbox
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_ENV } = require('../sandbox/jslab-env-web');

const { PRDC_JSLAB_LANGUAGE } = require('../other-shared/language');

const { PRDC_JSLAB_WEB_BROWSER } = require("./browser");

const { PRDC_JSLAB_WEB_SANDBOX_STARTUP } = require("./sandbox-startup");

/**
 * Starts the shared scientific runtime inside a browser document.
 */
class PRDC_JSLAB_WEB_INIT_SANDBOX {



  /**
   * Returns bridge.
   */
  static getBridge() {
    return PRDC_JSLAB_WEB_BROWSER.getBridge();
  }

  /**
   * Initializes the scientific sandbox and its host bridge.
   */
  static async bootSandbox() {
    const { configureWasm } = require("../sandbox/jslab-wasm-loader");
    var wasm_info = globalThis.parent && globalThis.parent.__JSLAB_WEB_NATIVE_WASM__
      ? globalThis.parent.__JSLAB_WEB_NATIVE_WASM__
      : {};
    function lazyWasmFactory(global_name, entry) {
      return async function() {
        if(typeof globalThis[global_name] != 'function') {
          var base_url = globalThis.parent && globalThis.parent.location
            ? globalThis.parent.location.href
            : globalThis.document.baseURI;
          var version = wasm_info.version ? '?v=' + encodeURIComponent(wasm_info.version) : '';
          var url = new URL('./lib/native-wasm/' + entry + version, base_url).href;
          await new Promise(function(resolve, reject) {
            var script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = function() {
              reject(new Error('Unable to load WebAssembly backend: ' + url));
            };
            document.head.appendChild(script);
          });
        }
        if(typeof globalThis[global_name] != 'function') {
          throw new Error('WebAssembly backend factory is unavailable: ' + global_name);
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
    var bridge = PRDC_JSLAB_WEB_INIT_SANDBOX.getBridge();
    var language = bridge && typeof bridge.getLanguage == 'function'
      ? bridge.getLanguage()
      : null;
    var lang = new PRDC_JSLAB_LANGUAGE(undefined, {}, { document: null });
    lang.set(language ? language.lang : 'en');

    globalThis.language = lang;

    var jsl = new PRDC_JSLAB_LIB('', false, PRDC_JSLAB_ENV);
    jsl.current_path = '/workspace/';
    jsl.includes_path = '/includes/';
    jsl.saved_paths = ['/workspace/'];

    jsl.emitRuntimeMessage = function(message, level) {
      var current_bridge = PRDC_JSLAB_WEB_INIT_SANDBOX.getBridge();
      if(current_bridge && typeof current_bridge.emitSandboxRuntimeLog == 'function') {
        current_bridge.emitSandboxRuntimeLog(message, level || 'info');
      }
    };
    jsl.emitUnavailable = function(message) {
      jsl.emitRuntimeMessage(message, 'warn');
    };
    jsl.onWorkspaceUpdated = function() {
      var current_bridge = PRDC_JSLAB_WEB_INIT_SANDBOX.getBridge();
      if(current_bridge && typeof current_bridge.emitSandboxWorkspaceUpdated == 'function') {
        current_bridge.emitSandboxWorkspaceUpdated(snapshotWorkspace());
      }
    };
    jsl.onStatsUpdated = function(stats) {
      var current_bridge = PRDC_JSLAB_WEB_INIT_SANDBOX.getBridge();
      if(current_bridge && typeof current_bridge.emitSandboxStatsUpdated == 'function') {
        current_bridge.emitSandboxStatsUpdated(stats || {});
      }
    };
    jsl.onStatusUpdated = function(state, text) {
      var current_bridge = PRDC_JSLAB_WEB_INIT_SANDBOX.getBridge();
      if(current_bridge && typeof current_bridge.emitSandboxStatusUpdated == 'function') {
        current_bridge.emitSandboxStatusUpdated(state, text);
      }
    };

    var startup_workspace = new Set(jsl.getWorkspaceProperties());

    function snapshotWorkspace() {
      var snapshot = [];
      jsl.getWorkspace().forEach(function(row) {
        if(row && row.length &&
            !startup_workspace.has(row[0]) &&
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
      const result = await jsl.inter.eval.evalCodeFromMain(String(code || ''), true, 'jslcmdwindow');
      if(!result.success) {
        throw Object.assign(new Error(result.error), { error_details: result.error_details });
      }
      return { ok: true, value: result.value, preview: PRDC_JSLAB_WEB_SANDBOX_STARTUP.previewValue(result.value), workspace: snapshotWorkspace() };
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
      } catch{}
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
          } catch{}
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
    const { FIGURE_COMMANDS, PLOT_COMMANDS } = require("./worker-ui");
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
        if(!plot || !PLOT_COMMANDS.includes(operation.method) || typeof plot[operation.method] !== 'function') {
          throw Error('Unknown remote plot or method.');
        }
        await plot[operation.method](...operation.args);
        if(operation.method === 'update') {
          const context = figures.getFigure(plot.fid)?.context;
          if(context) {
            await new Promise(resolve => context.requestAnimationFrame(resolve));
          }
        }
      } else if(operation.kind === 'figure-method') {
        if(!FIGURE_COMMANDS.includes(operation.method)) {
          throw Error('Unsupported worker figure operation.');
        }
        figures.figure(operation.fid);
        if(operation.method === 'print') {
          await figures.getPlot(operation.fid).print(...operation.args);
        } else {
          await figures[operation.method](...operation.args);
        }
      } else if(operation.kind === 'close') {
        if(operation.fid === 'all') {
          await Promise.all(Object.keys(figures.open_figures).map(fid => figures.closeFigure(fid)));
        } else {
          await figures.closeFigure(operation.fid);
        }
        for(const [id, plot] of worker_plots) {
          if(operation.fid === 'all' || plot.fid === operation.fid) {
            worker_plots.delete(id);
          }
        }
      } else {
        throw Error('Unsupported worker UI operation.');
      }
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
      buildPresentationDocument: root_path => jsl.inter.presentation._host._buildPresentationDocument(root_path),
      resolveSimulateValue: expression => jsl.inter.env._resolveSimulateValue(expression),
      publishSimulation: data => Boolean(jsl.inter.env._publishSimulateResult(data)),
      openSimulationAnimation: data => jsl.inter.env._openSimulateAnimation(data),
      stopAnimations: () => jsl.inter.gui?._stopAnimations(),
      setLanguage: setLanguage,
      clearWorkspace: clearWorkspace,
      getHelp: (name, type) => String(jsl.inter.docs.helpToJSON(name, type)).slice(0, 64000),
      getCompletions: getCompletions,
      getConsoleProperties: getConsoleProperties,
      getConsoleAccessor: getConsoleAccessor,
      getConsolePreview: getConsolePreview,
      isConsoleExpressionComplete: isConsoleExpressionComplete,
      notifyWindowClosed: notifyWindowClosed
    };
  }
}


globalThis.global = globalThis;


PRDC_JSLAB_WEB_SANDBOX_STARTUP.ensureBrowserProcess();

if(typeof globalThis.process_arguments == 'undefined') {
  globalThis.process_arguments = [];
}
globalThis.process.argv = globalThis.process_arguments.slice();
globalThis.__JSLAB_RUNTIME__ = 'web';

require("../other-shared/init-config");

var strings = require("../../config/lang.json");
var { PRDC_JSLAB_LIB } = require("../sandbox/jslab");

PRDC_JSLAB_WEB_INIT_SANDBOX.bootSandbox().catch(function(err) {
  globalThis.__JSLAB_WEB_SANDBOX_BOOT_ERROR__ = err && err.stack
    ? String(err.stack)
    : String(err);
  console.error(err && err.stack ? err.stack : err);
});
