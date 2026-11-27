/**
 * @file JSLAB browser environment
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_EXECUTION } = require('./jslab-execution');

const { PRDC_JSLAB_WEB_PRESENTATION_TRANSPORT } = require('../backend-web/presentation-transport');

const { getWebSubmoduleConstructor, getWebUnavailableSubmodule } = require('../backend-web/sandbox-modules');
const { instrumentWebDebug } = require('../backend-web/debug-instrument');

const { PRDC_JSLAB_WEB_BROWSER } = require('../backend-web/browser');
const { PRDC_JSLAB_WEB_NODE_PATH } = require('../backend-web/node-compatibility');

const { PRDC_JSLAB_SIMULATE_ASSETS } = require('../backend-web/simulate-assets');
const { PRDC_JSLAB_SANDBOX_SIMULATE } = require('./jslab-simulate');
var recast = require('recast');
var babel_parser = require('@babel/parser');
var math = require('../../lib/math-11.8.2/math-11.8.2.min.js');
var fmin = require('fmin/index.js');
var seedrandom = require('seedrandom');
var { PolynomialRegression } = require('ml-regression-polynomial');
var egm96 = require('egm96-universal');
var { PRDC_JSLAB_WEB_SERIAL_PORT } = require('../backend-web/serial-port');
var { createLazyNativeModule } = require('./jslab-wasm-native');
var { createLazyAlphaShape3DClass } = require('./jslab-wasm-alpha-shape');
var { getWasmModule, prepareWasmForCode } = require('./jslab-wasm-loader');
const { PRDC_JSLAB_SYMBOLIC_MATH } = require('./sym-math');
const { folder: giac_folder } = require('../../config/giac.json');

const { TraceMap, originalPositionFor } = require('@jridgewell/trace-mapping');
/**
 * Class for web source map.
 */
class PRDC_JSLAB_WEB_SOURCE_MAP {
  /**
   * Initializes the web source map instance.
   * @param {*} map Map.
   */
  constructor(map) {
    this.map = new TraceMap(map);
  }
  /**
   * Maps a generated source location to the original source.
   * @param {*} position Position.
   */
  originalPositionFor(position) {
    return originalPositionFor(this.map, position);
  }
  /**
   * Releases resources owned by the instance.
   */
  destroy() {}

}

/**
 * Class for env.
 */
class PRDC_JSLAB_ENV {

  /**
   * Returns an empty child-process list for the browser host.
   * @returns {Array<number>} No operating-system subprocesses.
   */
  listSubprocesses() {
    return [];
  }

  /**
   * Initializes the env instance.
   * @param {Object} jsl
   */
  constructor(jsl) {
    this.jsl = jsl;
    this.context = globalThis;
    this.runtime_scope = globalThis;
    this.is_worker = typeof WorkerGlobalScope != 'undefined' &&
      globalThis instanceof WorkerGlobalScope;
    this.debug = false;
    this.version = 'web';
    this.platform = 'web';
    this.process_pid = 0;
    this.recast = recast;
    this.babel_parser = babel_parser;
    this.SourceMapConsumer = PRDC_JSLAB_WEB_SOURCE_MAP;
    this.math = math;
    this.fmin = fmin;
    this.exports = ['debug', 'version', 'platform', 'web', 'buildShareLink', 'loadPyodide'];
    this.loadPyodide = this._loadPyodide.bind(this);
    this.bridge = this.is_worker ? globalThis.__JSLAB_WEB_BRIDGE__ || null : null;
    if(!this.is_worker) {
      try {
        if(globalThis.parent && globalThis.parent !== globalThis &&
            globalThis.parent.__JSLAB_WEB_BRIDGE__) {
          this.bridge = globalThis.parent.__JSLAB_WEB_BRIDGE__;
        } else if(globalThis.__JSLAB_WEB_BRIDGE__) {
          this.bridge = globalThis.__JSLAB_WEB_BRIDGE__;
        }
      } catch{}
    }
    this.runtime_info = this._getRuntimeInfo();
    const media = this.is_worker && globalThis.__JSLAB_WEB_MEDIA__;
    this.navigator = media ? { getGamepads: () => JSON.parse(this.bridge.getGamepads()), mediaDevices: {
      enumerateDevices: async () => JSON.parse(await media.enumerateDevices()),
      getUserMedia: constraints => media.getUserMedia(constraints)
    } } : globalThis.navigator;
    if(media) {
      this.onGamepadConnection = callback => this._bindUIEvent(globalThis.window, 'gamepadconnected', callback);
      this.createAudioContext = () => media.createAudioContext();
      this.drawAudioWaveform = (analyser, context, width, height) => media.drawWaveform(analyser, context, width, height);
      this.createVideoReader = async track => {
        const reader = await media.openVideoReader(track);
        return { read: () => this.jsl.inter.execution.web_ui.request({ kind: 'media-frame', reader }, false),
          cancel: () => media.closeVideoReader(reader), releaseLock: () => media.closeVideoReader(reader) };
      };
      this.isRecordingTypeSupported = type => media.isRecordingTypeSupported(type);
      this.createMediaRecorder = (stream, options) => media.createRecorder(stream, options);
      this.stopMediaRecorder = recorder => media.stopRecorder(recorder.jslab_recording_id);
      this.saveMediaRecording = (recorder, target, options) => media.saveRecording(recorder.jslab_recording_id, target, options);
    }
    this.web = Object.freeze(Object.assign({}, this.runtime_info));
    this.native_module = createLazyNativeModule(function() {
      return getWasmModule('native');
    });
    this.AlphaShape3D = createLazyAlphaShape3DClass(function() {
      return getWasmModule('alpha');
    }, this);
    this.Cesium = this.context.Cesium || {};
    this.egm96 = egm96;
    this.seedRandom = seedrandom;
    this.PolynomialRegression = PolynomialRegression;
    this.SerialPort = PRDC_JSLAB_WEB_SERIAL_PORT;
    this.capabilities = {
      dialogs: false,
      filesystem_paths: true,
      child_process: false,
      pty: false,
      native_addons: false,
      native_module_wasm: !!(this.native_module && this.native_module.wasm === true),
      alpha_shape_3d_wasm: !!(this.AlphaShape3D && this.AlphaShape3D.available === true),
      desktop_windows: true,
      local_file: this.runtime_info.is_local_file,
      served: this.runtime_info.is_served,
      secure_context: this.runtime_info.is_secure_context,
      opfs: this.runtime_info.supports_opfs,
      save_picker: this.runtime_info.supports_save_picker,
      open_picker: this.runtime_info.supports_open_picker,
      directory_picker: this.runtime_info.supports_directory_picker,
      web_serial: this.runtime_info.supports_web_serial,
      local_storage: this.runtime_info.supports_local_storage,
      download_fallback: this.runtime_info.supports_download_fallback,
      workspace_storage_mode: this.runtime_info.workspace_storage_mode
    };
    this.processors_number = (typeof navigator != 'undefined' && navigator.hardwareConcurrency) || 4;
    this.online = typeof navigator == 'undefined' || typeof navigator.onLine == 'undefined'
      ? true
      : navigator.onLine;
    this.speech = typeof SpeechSynthesisUtterance != 'undefined'
      ? new SpeechSynthesisUtterance()
      : { text: '' };

    if(typeof this.context.requestAnimationFrame != 'function') {
      this.context.requestAnimationFrame = function(callback) {
        return setTimeout(function() {
          callback(Date.now());
        }, 16);
      };
    }
    if(typeof this.context.cancelAnimationFrame != 'function') {
      this.context.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
    }
    if(typeof this.context.requestIdleCallback != 'function') {
      this.context.requestIdleCallback = function(callback) {
        return setTimeout(function() {
          callback({
            didTimeout: false,
            timeRemaining: function() {
              return 0;
            }
          });
        }, 1);
      };
    }
    if(typeof this.context.cancelIdleCallback != 'function') {
      this.context.cancelIdleCallback = function(id) {
        clearTimeout(id);
      };
    }

    this.setImmediate = function(callback) {
      return setTimeout(callback, 0);
    };
    this.clearImmediate = function(id) {
      clearTimeout(id);
    };
  }

  /**
   * Returns the capabilities.
   * @returns {Object}
   */
  getCapabilities() {
    return Object.assign({}, this.capabilities, {
      web: this.getRuntimeInfo()
    });
  }

  /**
   * Opens Assistant when the browser host provides a secure server integration.
   */
  assistant() {
    if(this.bridge && typeof this.bridge.openAssistant == 'function') {
      return this.bridge.openAssistant();
    }
    return false;
  }

  /**
   * Opens Simulate when the browser host provides an integration.
   */
  async simulate(filepath, options) {
    if(this.bridge && typeof this.bridge.openSimulate == 'function') {
      return PRDC_JSLAB_SANDBOX_SIMULATE._runRequest(this.jsl, options, async parameters => {
        const library = await this._getSimulateValues();
        return library.safeWorkspaceValue(parameters);
      }, (options, id) => this.bridge.openSimulate(filepath, options, id), id => this.bridge.cancelSimulate(id));
    }
    return false;
  }

  /**
   * Loads compiler-owned value helpers only when Simulate uses the workspace.
   * @returns {Promise<Object>} Compiler value conversion API.
   */
  async _getSimulateValues() {
    if(!this._simulate_values) {
      this._simulate_values = (async () => {
        const url = await this.bridge.getSimulateLibraryURL();
        const module = await import(url);
        return module.default;
      })().catch(error => {
        this._simulate_values = null;
        throw error;
      });
    }
    return this._simulate_values;
  }

  /**
   * Resolves a model expression without beginning a second user execution.
   * @param {string} expression Workspace expression.
   * @returns {Promise<Object>} Safe value or structured expression error.
   */
  _resolveSimulateValue(expression) {
    return PRDC_JSLAB_SANDBOX_SIMULATE._resolveWorkspaceValue(this.jsl, expression,
      async () => (await this._getSimulateValues()).safeWorkspaceValue);
  }

  /**
   * Loads a figure-owned native scene without downloading compiler catalogs.
   * @param {string} xml Compiler scene description.
   * @param {Array} time Simulation times.
   * @param {Object} variables Referenced simulation series.
   * @param {Object} [resources={}] Referenced CAD and material bytes.
   * @returns {Promise<Object>} Native scene instance.
   */
  async _createSimulateScene(xml, time, variables, resources = {}) {
    const module = await import(new URL('scene.js', PRDC_JSLAB_SIMULATE_ASSETS.getCodeRoot()).href);
    // The sandbox workspace removes browser globals, including caches.
    // Keep persistence in the owning application rather than exposing it as a
    // workspace variable or downloading the same scene core in another worker.
    var owner = globalThis.parent && globalThis.parent.__JSLAB_WEB_BRIDGE__ ? globalThis.parent : globalThis;
    return module.PRDC_OMJSL_SCENE.create(xml, time, variables, resources,
      { cacheStorage: owner.caches });
  }

  /**
   * Keeps component-owned window controls available after workspace interruption.
   * @returns {Function|undefined} Listener disposal callback when using the worker bridge.
   */
  _bindUIEvent(target, type, callback, options) {
    return this.jsl.inter.execution.remote_ui?.listenPersistent(target, type, callback, options);
  }

  /**
   * Returns the private simulation services shared by all platform environments.
   * @returns {Object} Sandbox simulation helper.
   */
  _getSimulate() {
    if(!this._simulate) {
      this._simulate = new PRDC_JSLAB_SANDBOX_SIMULATE(this);
    }
    return this._simulate;
  }

  /**
   * Publishes a complete simulation result as one lossless workspace value.
   */
  _publishSimulateResult(...args) {
    return this._getSimulate()._publishSimulateResult(...args);
  }

  /**
   * Extracts moving MultiBody frame coordinates from the last simulation.
   */
  _simulateAnimationData(...args) {
    return this._getSimulate()._simulateAnimationData(...args);
  }

  /**
   * Copies only serializable numeric fields from Plotly's managed camera object.
   */
  _simulateCameraSnapshot(...args) {
    return this._getSimulate()._simulateCameraSnapshot(...args);
  }

  /**
   * Calculates a bounded orthographic scene scale for wheel zoom.
   */
  _simulateZoomScale(...args) {
    return this._getSimulate()._simulateZoomScale(...args);
  }

  /**
   * Opens a shared JSLAB 3D mechanism figure with a time slider.
   */
  _openSimulateAnimation(...args) {
    return this._getSimulate()._openSimulateAnimation(...args);
  }

  /**
   * System terminals are available only in the desktop application.
   */
  terminal(action, data) {
    return false;
  }

  /**
   * Handles terminal on.
   * @param {*} id Id.
   * @param {*} type Type.
   * @param {Function} callback Callback.
   */
  terminalOn(id, type, callback) {
    return false;
  }

  /**
   * Handles terminal off.
   * @param {*} id Id.
   * @param {*} type Type.
   * @param {Function} callback Callback.
   */
  terminalOff(id, type, callback) {
    return false;
  }

  /**
   * Loads the Pyodide startup only when symbolic math is requested.
   * @param {Object} [options] Pyodide initialization options.
   * @returns {Promise<Object>} Initialized Pyodide runtime.
   */
  async _loadPyodide(options = {}) {
    var normalized_options = Object.assign({}, options);
    var app_location = this._getAppLocation();
    var index_url = String(normalized_options.indexURL || './lib/sympy-0.26.2/');
    if(index_url.startsWith('/lib/')) {
      index_url = '.' + index_url;
    }
    index_url = new URL(index_url, app_location).href;
    if(!index_url.endsWith('/')) {
      index_url += '/';
    }
    normalized_options.indexURL = index_url;
    const factory = await PRDC_JSLAB_SYMBOLIC_MATH._loadSymbolicFactory(new URL('pyodide.js', index_url), 'loadPyodide');
    return factory(normalized_options);
  }

  /**
   * Resolves the application URL when running in a sandbox frame or worker.
   */
  _getAppLocation() {
    var app_location;
    try {
      app_location = typeof globalThis.importScripts == 'function'
        ? new URL('../', globalThis.location.href).href
        : globalThis.parent && globalThis.parent.location
          ? globalThis.parent.location.href
          : globalThis.location.href;
    } catch{
      app_location = globalThis.location.href;
    }
    return app_location;
  }

  /**
   * Initializes Giac from the web distribution on first use.
   */
  async _loadGiac() {
    const folder = new URL('lib/' + giac_folder + '/', this._getAppLocation());
    const factory = await PRDC_JSLAB_SYMBOLIC_MATH._loadSymbolicFactory(new URL('giac.js', folder), 'createJslabGiac');
    return factory({ locateFile: file => new URL(file, folder).href });
  }

  /**
   * Detects browser runtime mode and available capabilities locally.
   * @returns {Object}
   */
  _detectRuntimeInfo() {
    return PRDC_JSLAB_WEB_BROWSER.runtimeInfo();
  }

  /**
   * Resolves runtime info from the shell bridge when available.
   * @returns {Object}
   */
  _getRuntimeInfo() {
    var runtime_info;

    if(this.bridge && typeof this.bridge.getRuntimeInfo == 'function') {
      try {
        runtime_info = this.bridge.getRuntimeInfo();
      } catch{}
    }

    if(!runtime_info || typeof runtime_info != 'object') {
      runtime_info = this._detectRuntimeInfo();
    }

    return Object.assign({}, runtime_info);
  }

  /**
   * Returns a copy of the browser runtime descriptor.
   * @returns {Object}
   */
  getRuntimeInfo() {
    return Object.assign({}, this.runtime_info);
  }

  /**
   * Handles report unavailable.
   * @param {string} feature
   * @param {boolean} [throw_flag=true]
   * @returns {false}
   */
  reportUnavailable(feature, throw_flag = true) {
    var message = String(feature || 'This feature') + ' is not available in web mode.';
    if(this.jsl && typeof this.jsl.emitUnavailable == 'function') {
      this.jsl.emitUnavailable(message);
    }
    if(throw_flag) {
      throw new Error(message);
    }
    return false;
  }

  /**
   * Handles disp.
   * @param {...*} args
   */
  disp(...args) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      args.forEach((value) => {
        var structured = value !== null && (typeof value === 'object' || typeof value === 'function');
        this.jsl.emitRuntimeMessage(structured ? this.jsl.inter.format._consoleValue(value) : String(value),
          structured ? 'console-value' : 'info');
      });
    }
  }

  /**
   * Writes text through the browser or worker UI clipboard bridge.
   */
  async copyText(text) {
    var value = String(text);
    if(this.jsl.inter.execution?.web_ui) {
      return this.jsl.inter.execution.web_ui.request({ kind: 'clipboard-write', text: value });
    }
    if(globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(value);
      return true;
    }
    throw new Error('Clipboard is not available in this context.');
  }

  /**
   * Handles warn.
   * @param {...*} args
   */
  warn(...args) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(args.join(' '), 'warn');
    }
  }

  /**
   * Handles disp monospaced.
   * @param {string} text Text.
   */
  dispMonospaced(text) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(String(text), 'monospaced');
    }
  }

  /**
   * Handles disp latex.
   * @param {string} text Text.
   */
  dispLatex(text) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(String(text), 'latex');
    }
  }

  /**
   * Handles clc.
   */
  clc() {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage('', 'clear');
    }
  }

  /**
   * Handles beep.
   */
  beep() {
    var context;
    var oscillator;
    var gain;
    if(typeof globalThis.AudioContext != 'function' &&
        typeof globalThis.webkitAudioContext != 'function') {
      return false;
    }
    try {
      context = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      oscillator = context.createOscillator();
      gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.05;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
      oscillator.onended = function() {
        try {
          context.close();
        } catch{}
      };
      return true;
    } catch{}
    return false;
  }

  /**
   * Handles show ans.
   * @param {string} text
   */
  showAns(text) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(text, 'ans');
    }
  }

  /**
   * Sets workspace.
   */
  setWorkspace() {
    if(this.jsl && typeof this.jsl.onWorkspaceUpdated == 'function') {
      this.jsl.onWorkspaceUpdated();
    }
  }

  /**
   * Sets stats.
   * @param {*} stats Stats.
   */
  setStats(stats) {
    if(this.jsl && typeof this.jsl.onStatsUpdated == 'function') {
      this.jsl.onStatsUpdated(stats);
    }
  }

  /**
   * Sets status.
   * @param {*} state State.
   * @param {*} txt Txt.
   */
  setStatus(state, txt) {
    if(this.jsl && typeof this.jsl.onStatusUpdated == 'function') {
      this.jsl.onStatusUpdated(state, txt);
    }
  }

  /**
   * Handles code evaluating.
   */
  codeEvaluating() {}
  /**
   * Handles code evaluated.
   */
  codeEvaluated() {}
  /**
   * Stops subprocesses.
   */
  stopSubprocesses() {}

  /**
   * Handles interrupt execution.
   */
  interruptExecution() {
    if(this.jsl.inter.execution.debugger_runtime) {
      this.jsl.inter.execution.debugger_runtime.interrupt();
      return;
    }
    throw new Error('Use the isolated worker debugger to interrupt browser execution.');
  }

  /**
   * Applies debugger configuration from numerical worker scripts.
   */
  debugCommand(method, args = {}) {
    const debugger_runtime = this.jsl.inter.execution.debugger_runtime;
    if(!debugger_runtime) {
      throw Error('Enable the Worker debugger for debugger commands.');
    }
    switch(method) {
      case 'get_debug_state': return { state: debugger_runtime.active ? 'running' : 'idle',
        breakpoints: Array.from(debugger_runtime.breakpoints.values()), pause_on_exceptions: debugger_runtime.pause_on_exceptions };
      case 'set_breakpoint': {
        const id = args.path + ':' + args.line;
        debugger_runtime.breakpoints.set(id, { ...args, id, enabled: args.enabled !== false });
        break;
      }
      case 'remove_breakpoint': debugger_runtime.breakpoints.delete(args.id); break;
      case 'clear_breakpoints': debugger_runtime.breakpoints.clear(); debugger_runtime.pause_on_exceptions = 'none'; break;
      case 'set_exception_pause': debugger_runtime.pause_on_exceptions = args.state; break;
      default: throw Error('This command must run in the debugger console.');
    }
    (this.jsl.inter.execution._send || globalThis.postMessage.bind(globalThis))({ type: 'debug-settings', settings: {
      breakpoints: Array.from(debugger_runtime.breakpoints.values()), pause_on_exceptions: debugger_runtime.pause_on_exceptions
    } });
    return { success: true };
  }

  /**
   * Adds path sep.
   * @param {*} path_in Path in.
   */
  addPathSep(path_in) {
    var out = String(path_in || '');
    return out.endsWith('/') ? out : out + '/';
  }

  /**
   * Requests a restart of the browser sandbox worker.
   */
  resetSandbox() {
    this._requestReset('sandbox');
  }

  /**
   * Requests a reload of the browser application.
   */
  resetApp() {
    this._requestReset('app');
  }

  /**
   * Routes a reset command to the browser host.
   * @param {string} action Requested reset scope.
   */
  _requestReset(action) {
    if(this.is_worker) {
      this.jsl.inter.execution._send?.({ type: 'runtime-reset', action });
    } else {
      this.bridge?.resetRuntime(action);
    }
  }

  /**
   * Handles path is absolute.
   * @param {*} path_in Path in.
   */
  pathIsAbsolute(path_in) {
    return String(path_in || '').startsWith('/');
  }

  /**
   * Handles path normalize.
   * @param {*} path_in Path in.
   */
  pathNormalize(path_in) {
    var path_value = String(path_in || '').replace(/\\/g, '/').replace(/\/+/g, '/');
    var is_absolute = path_value.startsWith('/');
    var parts = path_value.split('/');
    var normalized = [];
    parts.forEach(function(part) {
      if(!part || part == '.') {
        return;
      }
      if(part == '..') {
        if(normalized.length && normalized[normalized.length - 1] != '..') {
          normalized.pop();
        } else if(!is_absolute) {
          normalized.push(part);
        }
      } else {
        normalized.push(part);
      }
    });
    return (is_absolute ? '/' : '') + normalized.join('/');
  }

  /**
   * Handles path join.
   */
  pathJoin() {
    return this.pathNormalize([].slice.call(arguments).join('/'));
  }

  /**
   * Handles path sep.
   */
  pathSep() {
    return '/';
  }

  /**
   * Handles path dir name.
   * @param {*} path_in Path in.
   */
  pathDirName(path_in) {
    var normalized = this.pathNormalize(path_in);
    var idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.slice(0, idx) || '/' : '.';
  }

  /**
   * Returns the final path component, including its extension.
   * @param {string} path_in Input path.
   * @returns {string} Final path component.
   */
  pathBaseName(path_in) {
    return PRDC_JSLAB_WEB_NODE_PATH.basename(path_in);
  }

  /**
   * Returns the final filename without its extension.
   * @param {string} path_in Input path.
   * @returns {string} Filename without its extension.
   */
  pathFileName(path_in) {
    return PRDC_JSLAB_WEB_NODE_PATH.basename(path_in, this.pathExtName(path_in));
  }

  /**
   * Returns the final filename extension, including the leading dot.
   * @param {string} path_in Input path.
   * @returns {string} Filename extension.
   */
  pathExtName(path_in) {
    return PRDC_JSLAB_WEB_NODE_PATH.extname(path_in);
  }

  /**
   * Handles path resolve.
   * @param {*} path_in Path in.
   */
  pathResolve(path_in) {
    var path_value = String(path_in || '');
    if(!path_value.length) {
      return this.pathNormalize(this.jsl && this.jsl.current_path ? this.jsl.current_path : '/workspace/');
    }
    if(this.pathIsAbsolute(path_value)) {
      return this.pathNormalize(path_value);
    }
    var base_path = this.jsl && typeof this.jsl.current_path == 'string' && this.jsl.current_path.length
      ? this.jsl.current_path
      : '/workspace/';
    return this.pathNormalize(this.pathJoin(base_path, path_value));
  }

  /**
   * Handles path relative.
   * @param {*} from_path From path.
   * @param {*} to_path To path.
   */
  pathRelative(from_path, to_path) {
    return PRDC_JSLAB_WEB_NODE_PATH.relative(this.pathResolve(from_path), this.pathResolve(to_path));
  }

  /**
   * Saves a directory in the application search paths.
   * @param {string} path Directory to save.
   */
  savePath(path) {
    const saved_paths = this.bridge?.updateWorkspaceSearchPath?.('add', this.pathResolve(path));
    if(saved_paths) this.jsl.setSavedPaths(Array.from(saved_paths));
  }

  /**
   * Removes a directory from the application search paths.
   * @param {string} path Directory to remove.
   */
  removePath(path) {
    const saved_paths = this.bridge?.updateWorkspaceSearchPath?.('remove', this.pathResolve(path));
    if(saved_paths) this.jsl.setSavedPaths(Array.from(saved_paths));
  }

  /**
   * Sends diary control to the common Command Window.
   * @param {string} action Diary mode.
   * @param {string} [file_path] Workspace transcript path.
   */
  diary(action, file_path) {
    this.bridge?.sendMainWindow?.('diary', { action, file_path });
  }

  /**
   * Clears storage.
   */
  clearStorage() {
    if(this.bridge && typeof this.bridge.clearWorkspaceStorage == 'function') {
      var result = this.bridge.clearWorkspaceStorage();
      if(this.jsl && typeof this.jsl.onWorkspaceUpdated == 'function') {
        this.jsl.onWorkspaceUpdated();
      }
      return result;
    }
    return this.reportUnavailable('Workspace storage reset');
  }

  /**
   * Checks directory.
   * @param {*} path_in Path in.
   */
  checkDirectory(path_in) {
    var normalized = this.pathNormalize(this.pathResolve(path_in));
    if(normalized == '/workspace' || normalized == '/workspace/' ||
        normalized == '/html' || normalized == '/html/' ||
        normalized == '/docs' || normalized == '/docs/' ||
        normalized == '/font' || normalized == '/font/' ||
        normalized == '/img' || normalized == '/img/' ||
        normalized == '/css' || normalized == '/css/' ||
        normalized == '/lib' || normalized == '/lib/' ||
        normalized == '/js' || normalized == '/js/' ||
        normalized == '/includes' || normalized == '/includes/') {
      return true;
    }
    if(this.bridge && typeof this.bridge.existsWorkspaceDirectorySync == 'function') {
      return this.bridge.existsWorkspaceDirectorySync(normalized);
    }
    return false;
  }

  /**
   * Opens the shared directory prompt for a script outside the active search paths.
   * @param {string} script_path Script path.
   * @returns {boolean} Whether execution is waiting for a directory choice.
   */
  checkScriptDir(script_path) {
    const dir = this.addPathSep(this.pathDirName(script_path));
    if(!this.bridge?.sendMainWindow || dir === this.jsl.current_path || this.jsl.saved_paths.includes(dir)) return false;
    this.bridge.sendMainWindow('unknown-script-dir', script_path);
    return true;
  }

  /**
   * Handles cd.
   * @param {*} new_path New path.
   */
  cd(new_path) {
    if(this.jsl && typeof this.jsl.setPath == 'function') {
      new_path = this.pathResolve(new_path);
      const selected = this.bridge?.changeWorkspaceDirectory ? this.bridge.changeWorkspaceDirectory(new_path) : new_path;
      if(selected) this.jsl.setPath(selected);
      return Boolean(selected);
    }
    return false;
  }

  /**
   * Provides the bundled examples in the workspace and optionally navigates to them.
   * @param {boolean} show Whether to show the examples in the file browser.
   * @returns {Promise<string>} Virtual examples path.
   */
  async prepareExamples(show) {
    const folder = await this.bridge.prepareExamples(show);
    if(show) this.cd(folder);
    return folder;
  }

  /**
   * Handles editor.
   */
  editor() {
    if(this.bridge && typeof this.bridge.openEditorFile == 'function') {
      return this.bridge.openEditorFile(...arguments);
    }
    return this.reportUnavailable('Desktop editor integration');
  }

  /**
   * Compiles a TeX source through the browser host.
   * @param {string} file Workspace source path.
   * @returns {Promise<Object|boolean>} Build result.
   */
  compileLatex(file) {
    if(typeof file !== 'string' || !file.trim()) return Promise.resolve(false);
    return this.bridge?.compileLatex?.(this.pathResolve(file)) ?? this.reportUnavailable('compileLatex');
  }

  /**
   * Opens the browser LaTeX Editor with a path in the workspace.
   * @param {string} [file] Workspace folder or source document.
   * @param {string} [main] Main source relative to the project.
   * @returns {Promise<boolean>} Whether the editor opened.
   */
  editLatex(file, main) {
    if(file != null && (typeof file !== 'string' || !file.trim())) return Promise.resolve(false);
    return this.bridge?.openLatexEditor?.(file == null ? undefined : this.pathResolve(file), main) ??
      this.reportUnavailable('editLatex');
  }

  /**
   * Handles info.
   */
  info() {
    if(this.bridge && typeof this.bridge.openMainDialog == 'function') {
      this.bridge.openMainDialog('info-container');
      return true;
    }
    return this.reportUnavailable('Desktop info dialog');
  }

  /**
   * Handles settings.
   */
  settings() {
    if(this.bridge && typeof this.bridge.openMainDialog == 'function') {
      this.bridge.openMainDialog('settings-container');
      return true;
    }
    return this.reportUnavailable('Desktop settings dialog');
  }

  /**
   * Handles cmd help.
   */
  cmd_help() {
    if(this.bridge && typeof this.bridge.openMainDialog == 'function') {
      this.bridge.openMainDialog('help-container');
      return true;
    }
    return this.reportUnavailable('Desktop help dialog');
  }

  /**
   * Shows inspector.
   * @param {*} model Model.
   */
  showInspector(model) {
    if(this.bridge && typeof this.bridge.showInspector == 'function') {
      this.bridge.showInspector(model);
      return true;
    }
    return this.reportUnavailable('Inspector');
  }

  /**
   * Opens sandbox dev tools.
   */
  openSandboxDevTools() {
    return this.reportUnavailable('Sandbox DevTools');
  }

  /**
   * Handles error.
   * @param {Object} message Message.
   * @param {*} [throw_flag] Throw flag.
   */
  error(message, throw_flag = true) {
    if(!this._formatting_error && this.jsl?.inter?.execution?.current) {
      const error = new Error(String(message));
      if(throw_flag) {
        throw error;
      }
      this._reported_error = error;
      return;
    }
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(String(message || 'Unknown browser-mode error'), 'error');
    }
    if(throw_flag) {
      throw new Error(String(message || 'Unknown browser-mode error'));
    }
    return false;
  }

  /**
   * Displays an internal error message.
   * @param {Object} message Message.
   */
  errorInternal(message) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(String(message || 'Internal browser-mode error'), 'error');
    }
  }

  /**
   * Reads file sync.
   */
  readFileSync() {
    var file_path = this.pathNormalize(this.pathResolve(arguments[0]));
    var encoding = typeof arguments[1] === 'object' ? arguments[1]?.encoding : arguments[1];

    if(this._isAppAssetPath(file_path)) {
      var asset_data = this._getAppAssetSync(file_path);
      if(asset_data === false) {
        return false;
      }
      if(encoding == 'utf8' || encoding == 'utf-8') {
        return asset_data;
      }
      return this._toBinaryBlob(new TextEncoder().encode(asset_data));
    }

    if(this._isWorkspacePath(file_path) && this.bridge) {
      try {
        if(encoding == 'utf8' || encoding == 'utf-8') {
          return this.bridge.readWorkspaceTextSync(file_path);
        }
        return this._toBinaryBlob(this.bridge.readWorkspaceBytesSync(file_path));
      } catch(err) {
        this.jsl._console.log(err);
      }
    }
    return false;
  }

  /**
   * Copies file sync.
   */
  copyFileSync() {
    if(this._isAppAssetPath(this.pathNormalize(arguments[0]))) {
      var data = this.readFileSync(arguments[0]);
      return data === false ? false : this.writeFileSync(arguments[1], data);
    }

    if(this.bridge && typeof this.bridge.copyWorkspaceFileSync == 'function') {
      return this.bridge.copyWorkspaceFileSync(arguments[0], arguments[1]);
    }
    return this.reportUnavailable('Direct filesystem copies');
    }

  /**
   * Writes file sync.
   */
  writeFileSync() {
    var file_path = this.pathNormalize(this.pathResolve(arguments[0]));
    var data = arguments[1];
    if(this._isWorkspacePath(file_path) && this.bridge) {
      try {
        if(typeof data == 'string') {
          this.bridge.writeWorkspaceTextSync(file_path, data);
        } else {
          this.bridge.writeWorkspaceBytesSync(file_path, data);
        }
        if(this.jsl && typeof this.jsl.onWorkspaceUpdated == 'function') {
          this.jsl.onWorkspaceUpdated();
        }
        return true;
      } catch(err) {
        this.jsl._console.log(err);
      }
    }
    if(this.bridge && typeof this.bridge.downloadLocalFileSync == 'function') {
      try {
        return this.bridge.downloadLocalFileSync(file_path, data, {
          filePath: file_path
        });
      } catch(err) {
        this.jsl._console.log(err);
      }
    }
    return false;
  }

  /**
   * Handles rm sync.
   */
  rmSync() {
    var file_path = this.pathNormalize(this.pathResolve(arguments[0]));
    if(this._isWorkspacePath(file_path) && this.bridge &&
        typeof this.bridge.removeWorkspacePathSync == 'function') {
      try {
        this.bridge.removeWorkspacePathSync(file_path);
        if(this.jsl && typeof this.jsl.onWorkspaceUpdated == 'function') {
          this.jsl.onWorkspaceUpdated();
        }
        return true;
      } catch(err) {
        this.jsl._console.log(err);
      }
    }
    return false;
  }

  /**
   * Reads dir.
   */
  readDir() {
    var dir_path = this.pathNormalize(this.pathResolve(arguments[0]));
    var options = arguments[1];
    if(this._isWorkspacePath(dir_path) && this.bridge &&
        typeof this.bridge.readWorkspaceDirSync == 'function') {
      return this.bridge.readWorkspaceDirSync(dir_path, options);
    }
    return false;
  }

  /**
   * Lists the current workspace directory for the shared shell commands.
   * @returns {Array<string>} Entries in the current directory.
   */
  listFolderContents() {
    return Array.from(this.readDir(this.jsl.current_path) || []);
  }

  /**
   * Refreshes the shared file browser after workspace changes.
   */
  updateFileBrowser() {
    this.bridge?.sendMainWindow?.('update-file-browser');
  }

  /**
   * Refreshes the shared workspace view.
   */
  updateWorkspace() {
    this.bridge?.sendMainWindow?.('update-workspace');
  }

  /**
   * Checks file.
   */
  checkFile() {
    var file_path = this.pathNormalize(this.pathResolve(arguments[0]));
    if(this._isAppAssetPath(file_path)) {
      return this._getAppAssetSync(file_path) !== false;
    }
    if(this._isWorkspacePath(file_path) && this.bridge &&
        typeof this.bridge.existsWorkspaceFileSync == 'function') {
      return this.bridge.existsWorkspaceFileSync(file_path);
    }
    return false;
  }

  /**
   * Selects workspace paths using the host picker.
   * @param {Object} options Picker options.
   * @returns {Promise<Array<string>|false>} Selected paths or cancellation.
   */
  async showOpenDialog(options) {
    if(this.bridge && typeof this.bridge.showOpenDialog == 'function') {
      const paths = await this.bridge.showOpenDialog(options);
      return paths ? Array.from(paths) : false;
    }
    return false;
  }

  /**
   * Lazily prepares the backends used by the source about to run.
   * @param {string} code Command or script source.
   * @returns {Promise<void>} Preparation completion.
   */
  _prepareSource(code) {
    return prepareWasmForCode(code);
  }

  /**
   * Shows open dialog sync.
   */
  showOpenDialogSync() {
    return false;
  }

  /**
   * Builds share link.
   */
  buildShareLink() {
    if(this.bridge && typeof this.bridge.buildShareLink == 'function') {
      return this.bridge.buildShareLink(arguments[0]);
    }
    return false;
  }

  /**
   * Shows save dialog.
   */
  showSaveDialog() {
    if(this.bridge && typeof this.bridge.showSaveDialog == 'function') {
      return this.bridge.showSaveDialog(arguments[0]);
    }
    return false;
  }

  /**
   * Shows save dialog sync.
   */
  showSaveDialogSync() {
    return false;
  }

  /**
   * Saves local file.
   */
  saveLocalFile() {
    if(this.bridge && typeof this.bridge.saveLocalFile == 'function') {
      return this.bridge.saveLocalFile(arguments[0], arguments[1], arguments[2]);
    }
    return false;
  }

  /**
   * Converts SVG markup into PDF bytes through the browser host.
   * @param {string} svg_data SVG markup.
   * @param {number} width Output width.
   * @param {number} height Output height.
   * @param {Object} fonts Registered figure fonts.
   * @returns {Promise<Uint8Array>|false} Generated PDF bytes or false when unavailable.
   */
  svgToPdf(svg_data, width, height, fonts) {
    if(this.bridge && typeof this.bridge.svgToPdf == 'function') {
      return this.bridge.svgToPdf(svg_data, width, height, fonts);
    }
    return false;
  }

  /**
   * Shows message box.
   */
  showMessageBox() {
    return this.reportUnavailable('Native message boxes');
  }

  /**
   * Handles exec.
   */
  exec() {
    return this.reportUnavailable('Child process execution');
  }

  /**
   * Handles exec sync.
   */
  execSync() {
    return this.reportUnavailable('Child process execution');
  }

  /**
   * Handles spawn.
   */
  spawn() {
    return this.reportUnavailable('Child process execution');
  }

  /**
   * Handles spawn sync.
   */
  spawnSync() {
    return this.reportUnavailable('Child process execution');
  }

  /**
   * Sends pty.
   */
  sendPty() {
    if(arguments[0] === 'killAll') {
      return true;
    }
    return this.reportUnavailable('PTY support');
  }

  /**
   * Returns default path.
   * @param {*} type Type.
   */
  getDefaultPath(type) {
    if(type == 'root') {
      return '/';
    }
    if(type == 'includes') {
      return '/includes/';
    }
    return '/workspace/';
  }

  /**
   * Creates directory.
   * @param {*} directory Directory.
   */
  makeDirectory(directory) {
    var dir_path = this.pathNormalize(this.pathResolve(directory));
    if(this._isWorkspacePath(dir_path) && this.bridge &&
        typeof this.bridge.makeWorkspaceDirectorySync == 'function') {
      this.bridge.makeWorkspaceDirectorySync(dir_path);
      if(this.jsl && typeof this.jsl.onWorkspaceUpdated == 'function') {
        this.jsl.onWorkspaceUpdated();
      }
      return true;
    }
    return false;
  }

  /**
   * Reserves a window ID shared by the browser sandbox and its workers.
   * @returns {number|undefined} Managed window ID when a browser host is available.
   */
  allocateWindowId() {
    return this.bridge?.allocateWindowId?.();
  }

  /**
   * Opens window.
   * @param {*} wid Wid.
   * @param {*} [file] File.
   */
  openWindow(wid, file = 'blank.html') {
    if(!this.bridge || typeof this.bridge.openManagedWindow != 'function') {
      return [false, Promise.resolve(false)];
    }
    var opened = this.bridge.openManagedWindow(wid, file);
    if(!opened || !opened.context) {
      return [false, Promise.resolve(false)];
    }
    return [opened.context, opened.ready || Promise.resolve(opened.context)];
  }

  /**
   * Registers a window method that returns its result to the sandbox worker.
   */
  _setRemoteMethod(target, name, method) {
    target[name] = method;
    this.jsl.inter.execution.remote_ui?.setLocalMethod(target, name, method);
  }

  /**
   * Closes windows belonging to this scientific runtime.
   * @param {number|string} wid Window identifier or 'all'.
   * @returns {boolean} Whether the window or group was closed.
   */
  closeWindow(wid) {
    if(wid === 'all') {
      Object.keys(this.jsl.inter.windows.open_windows).forEach(id => this.closeWindow(id));
      return true;
    }
    if(!Object.hasOwn(this.jsl.inter.windows.open_windows, wid) || !this.bridge) {
      return false;
    }
    const closed = this.bridge.closeManagedWindow?.(wid, { notifySandbox: false });
    if(closed) {
      this.jsl.inter.windows._closedWindow(wid);
    }
    return closed;
  }

  /**
   * Closes windows.
   * @param {*} wid Wid.
   */
  closeWindows(wid) {
    return this.closeWindow(wid);
  }

  /**
   * Shows window.
   * @param {*} wid Wid.
   */
  showWindow(wid) {
    return this.bridge && typeof this.bridge.showWindow == 'function'
      ? this.bridge.showWindow(wid)
      : false;
  }

  /**
   * Hides window.
   * @param {*} wid Wid.
   */
  hideWindow(wid) {
    return this.bridge && typeof this.bridge.hideWindow == 'function'
      ? this.bridge.hideWindow(wid)
      : false;
  }

  /**
   * Focuses window.
   * @param {*} wid Wid.
   */
  focusWindow(wid) {
    return this.bridge && typeof this.bridge.focusWindow == 'function'
      ? this.bridge.focusWindow(wid)
      : false;
  }

  /**
   * Handles minimize window.
   * @param {*} wid Wid.
   */
  minimizeWindow(wid) {
    return this.bridge && typeof this.bridge.minimizeWindow == 'function'
      ? this.bridge.minimizeWindow(wid)
      : false;
  }

  /**
   * Handles center window.
   * @param {*} wid Wid.
   */
  centerWindow(wid) {
    return this.bridge && typeof this.bridge.centerWindow == 'function'
      ? this.bridge.centerWindow(wid)
      : false;
  }

  /**
   * Moves top window.
   * @param {*} wid Wid.
   */
  moveTopWindow(wid) {
    return this.bridge && typeof this.bridge.moveTopWindow == 'function'
      ? this.bridge.moveTopWindow(wid)
      : false;
  }

  /**
   * Sets window size.
   * @param {*} wid Wid.
   * @param {number} width Width.
   * @param {number} height Height.
   */
  setWindowSize(wid, width, height) {
    return this.bridge && typeof this.bridge.setWindowSize == 'function'
      ? this.bridge.setWindowSize(wid, width, height)
      : false;
  }

  /**
   * Sets window pos.
   * @param {*} wid Wid.
   * @param {*} left Left.
   * @param {*} top Top.
   */
  setWindowPos(wid, left, top) {
    return this.bridge && typeof this.bridge.setWindowPos == 'function'
      ? this.bridge.setWindowPos(wid, left, top)
      : false;
  }

  /**
   * Sets window resizable.
   * @param {*} wid Wid.
   * @param {*} state State.
   */
  setWindowResizable(wid, state) {
    return this.bridge && typeof this.bridge.setWindowResizable == 'function'
      ? this.bridge.setWindowResizable(wid, state)
      : false;
  }

  /**
   * Sets window movable.
   * @param {*} wid Wid.
   * @param {*} state State.
   */
  setWindowMovable(wid, state) {
    return this.bridge && typeof this.bridge.setWindowMovable == 'function'
      ? this.bridge.setWindowMovable(wid, state)
      : false;
  }

  /**
   * Sets window aspect ratio.
   * @param {*} wid Wid.
   * @param {*} aspect_ratio Aspect ratio.
   */
  setWindowAspectRatio(wid, aspect_ratio) {
    return this.bridge && typeof this.bridge.setWindowAspectRatio == 'function'
      ? this.bridge.setWindowAspectRatio(wid, aspect_ratio)
      : false;
  }

  /**
   * Sets window opacity.
   * @param {*} wid Wid.
   * @param {*} opacity Opacity.
   */
  setWindowOpacity(wid, opacity) {
    return this.bridge && typeof this.bridge.setWindowOpacity == 'function'
      ? this.bridge.setWindowOpacity(wid, opacity)
      : false;
  }

  /**
   * Sets window fullscreen.
   * @param {*} wid Wid.
   * @param {*} state State.
   */
  setWindowFullscreen(wid, state) {
    return this.bridge && typeof this.bridge.setWindowFullscreen == 'function'
      ? this.bridge.setWindowFullscreen(wid, state)
      : false;
  }

  /**
   * Sets window title.
   * @param {*} wid Wid.
   * @param {string} title Title.
   */
  setWindowTitle(wid, title) {
    return this.bridge && typeof this.bridge.setWindowTitle == 'function'
      ? this.bridge.setWindowTitle(wid, title)
      : false;
  }

  /**
   * Returns window size.
   * @param {*} wid Wid.
   */
  getWindowSize(wid) {
    return this.bridge && typeof this.bridge.getWindowSize == 'function'
      ? this.bridge.getWindowSize(wid)
      : false;
  }

  /**
   * Returns window pos.
   * @param {*} wid Wid.
   */
  getWindowPos(wid) {
    return this.bridge && typeof this.bridge.getWindowPos == 'function'
      ? this.bridge.getWindowPos(wid)
      : false;
  }

  /**
   * Opens window dev tools.
   */
  openWindowDevTools() {
    return this.reportUnavailable('Window DevTools', false);
  }

  /**
   * Returns window media source id.
   */
  getWindowMediaSourceId() {
    return false;
  }

  /**
   * Prints window to pdf.
   */
  printWindowToPdf(wid, options) {
    const ui = this.jsl.inter.execution.web_ui;
    if(ui) return ui.request({ kind: 'print-window-pdf', wid, options });
    return this.bridge?.printWindowToPdf(wid, options) ?? false;
  }

  /**
   * Opens folder.
   */
  openFolder() {
    return this.reportUnavailable('Open folder in host system', false);
  }

  /**
   * Opens dir.
   */
  openDir() {
    return this.reportUnavailable('Open directory in host system', false);
  }

  /**
   * Shows file in folder.
   */
  showFileInFolder() {
    return this.reportUnavailable('Reveal file in host system', false);
  }

  /**
   * Shows file in dir.
   */
  showFileInDir() {
    return this.reportUnavailable('Reveal file in host system', false);
  }

  /**
   * Returns desktop sources.
   */
  getDesktopSources() {
    return false;
  }

  /**
   * Checks whether workspace path.
   * @param {*} path_in Path in.
   */
  _isWorkspacePath(path_in) {
    return typeof path_in == 'string' &&
      (path_in == '/workspace' || path_in == '/workspace/' || path_in.startsWith('/workspace/'));
  }

  /**
   * Checks whether app asset path.
   * @param {*} path_in Path in.
   */
  _isAppAssetPath(path_in) {
    return typeof path_in == 'string' &&
      !this._isWorkspacePath(path_in) &&
      (path_in.startsWith('/html/') ||
        path_in.startsWith('/css/') ||
        path_in.startsWith('/font/') ||
        path_in.startsWith('/img/') ||
        path_in.startsWith('/js/') ||
        path_in.startsWith('/lib/') ||
        path_in.startsWith('/docs/'));
  }

  /**
   * Returns app asset sync.
   * @param {*} path_in Path in.
   */
  _getAppAssetSync(path_in) {
    if(this.bridge && typeof this.bridge.getAppAssetSync == 'function') {
      return this.bridge.getAppAssetSync(path_in);
    }
    return false;
  }

  /**
   * Converts to binary blob.
   * @param {*} bytes Bytes.
   */
  _toBinaryBlob(bytes) {
    if(typeof Buffer != 'undefined' && typeof Buffer.from == 'function') {
      return Buffer.from(bytes);
    }
    var data = bytes instanceof Uint8Array ? Uint8Array.from(bytes) : new Uint8Array(bytes);
    data.toString = function() {
      return new TextDecoder().decode(data);
    };
    return data;
  }
  /**
   * Returns the browser module adapter used before workspace require is installed.
   * @returns {Function} Module constructor.
   */
  _getModuleRuntime() {
    const env = this;
    class PRDC_JSLAB_BROWSER_MODULE {}
    PRDC_JSLAB_BROWSER_MODULE.prototype.require = name => env.reportUnavailable('Module "' + name + '"');
    PRDC_JSLAB_BROWSER_MODULE._resolveFilename = name => {
      throw Error('Module "' + name + '" is not available in this environment.');
    };
    return PRDC_JSLAB_BROWSER_MODULE;
  }

  /**
   * Resolves statically bundled scientific modules.
   * @param {Object} module_data Configured module.
   * @returns {Function|undefined} Module constructor.
   */
  _getSubmoduleConstructor(module_data) {
    return getWebSubmoduleConstructor(module_data);
  }

  /**
   * Returns a configured unavailable-module descriptor.
   * @param {Object} module_data Configured module.
   * @returns {Object|undefined} Availability descriptor.
   */
  _getUnavailableSubmodule(module_data) {
    return getWebUnavailableSubmodule(module_data);
  }

  /**
   * Installs browser module loading until the worker workspace supplies require.
   * @param {Function} Module Module constructor.
   */
  _configureModuleRequire(Module) {
    Module.prototype.require = name => this.reportUnavailable('Module "' + name + '"');
  }

  /**
   * Ensures the browser context has an explicit module-loading result.
   */
  _initializeContextRequire() {
    if(typeof this.context.require != 'function') {
      this.context.require = name => this.reportUnavailable('Module "' + name + '"');
    }
  }

  /**
   * Keeps worker dispatchers and lazily loaded libraries during workspace cleanup.
   * @param {string} name Global name.
   * @returns {boolean} Whether the host owns this global.
   */
  _preserveContextGlobal(name) {
    return this.is_worker && ['onmessage', 'onmessageerror', 'PRDC_JSLAB_NATIVE_MODULE_FACTORY',
      'PRDC_JSLAB_ALPHA_SHAPE_3D_FACTORY'].includes(name);
  }

  /**
   * Instruments browser code through the debugger backend.
   * @param {Object} ast Source AST.
   * @param {string} identifier Runtime identifier.
   * @param {string} path Source path.
   */
  _instrumentDebug(ast, identifier, path) {
    if(this.jsl.inter.execution.debugger_runtime?.enabled) {
      instrumentWebDebug(ast, this.recast, identifier, path);
    }
  }

  /**
   * Settles interrupted detached callbacks and resets the worker control buffer.
   * @param {*} error Detached callback failure.
   * @returns {Promise<boolean>} Whether interruption consumed the failure.
   */
  async _handleDetachedInterruption(error) {
    const execution = this.jsl.inter.execution;
    const runtime = execution?.debugger_runtime;
    if(error?.name !== 'JslabInterrupted' || !runtime || runtime.active) {
      return false;
    }
    await execution.interrupt(null);
    runtime.resetControl();
    (execution._send || globalThis.postMessage.bind(globalThis))({ type: 'debug-state', state: 'idle' });
    return true;
  }

  /**
   * Resolves application scripts relative to a managed browser window.
   * @param {string} script_path Requested script path.
   * @returns {string} Window-relative script path.
   */
  _windowScriptPath(script_path) {
    return script_path.replace(/^(\.\.\/)?js\/(windows|other-shared)\//, '../js/$2/');
  }

  /**
   * Builds the initialization source for a child sandbox worker.
   * @returns {string} Worker initialization source.
   */
  _getWorkerInit() {
    return `
      global.is_worker = true;
      global.debug = ${this.debug};
      global.version = '${this.version}';
      global.platform = 'web';

      const internal_app_path = ${JSON.stringify(this.jsl.app_path)};
      const internal_packed = ${JSON.stringify(this.jsl.packed)};
    `;
  }

  /**
   * Connects presentation behavior to the host's storage and preview transport.
   * @param {Object} presentation Shared presentation controller.
   * @returns {Object} Presentation transport.
   */
  _createPresentationTransport(presentation) {
    return new PRDC_JSLAB_WEB_PRESENTATION_TRANSPORT(presentation);
  }

  /**
   * Wraps source with a lexical evaluator outside strict class and function bodies.
   * @param {string} code Rewritten scientific source.
   * @param {string} identifier Runtime identifier.
   * @returns {string} Executable source with an async entry point.
   */
  _wrapCompiledSource(code, identifier) {
    return '((eval) => (async () => {\n' + code + '\n})())(' + identifier + '._eval);';
  }

  /**
   * Creates a module worker through the browser's owned worker transport.
   * @returns {Worker} Module worker.
   */
  _createModuleWorker() {
    const source = '(function ' + PRDC_JSLAB_EXECUTION.initializeModuleWorker.toString() + ')(globalThis, require);';
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const worker = new this.context.Worker(url);
    const terminate = worker.terminate.bind(worker);
    worker.terminate = () => {
      URL.revokeObjectURL(url);
      return terminate();
    };
    return worker;
  }

}

exports.PRDC_JSLAB_ENV = PRDC_JSLAB_ENV;
