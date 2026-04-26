/**
 * @file JSLAB browser environment
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var recast = require('recast');
var babel_parser = require('@babel/parser');
var seedrandom = require('seedrandom');
var { PolynomialRegression } = require('ml-regression-polynomial');
var egm96 = require('egm96-universal');
var { PRDC_JSLAB_WEB_SERIAL_PORT } = require('../web/web-serial-port');
var { createWebNativeModule, createWebAlphaShape3DClass } = require('./native-module-web');

class IdentitySourceMapConsumer {

  constructor() {}

  originalPositionFor(position) {
    return {
      line: position && position.line != null ? position.line : null,
      column: position && position.column != null ? position.column : null
    };
  }

  destroy() {}
}

class PRDC_JSLAB_ENV {

  /**
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
    this.SourceMapConsumer = IdentitySourceMapConsumer;
    this.math = null;
    this.fmin = null;
    this.exports = ['debug', 'version', 'platform', 'web', 'buildShareLink'];
    this.bridge = null;
    if(!this.is_worker) {
      try {
        if(globalThis.parent && globalThis.parent !== globalThis &&
            globalThis.parent.__JSLAB_WEB_BRIDGE__) {
          this.bridge = globalThis.parent.__JSLAB_WEB_BRIDGE__;
        } else if(globalThis.__JSLAB_WEB_BRIDGE__) {
          this.bridge = globalThis.__JSLAB_WEB_BRIDGE__;
        }
      } catch {}
    }
    this.runtime_info = this._getRuntimeInfo();
    this.web = Object.freeze(Object.assign({}, this.runtime_info));
    this.native_module = createWebNativeModule(this);
    this.AlphaShape3D = createWebAlphaShape3DClass(this);
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
   * @returns {Object}
   */
  getCapabilities() {
    return Object.assign({}, this.capabilities, {
      web: this.getRuntimeInfo()
    });
  }

  /**
   * Detects browser runtime mode and available capabilities locally.
   * @returns {Object}
   */
  _detectRuntimeInfo() {
    var protocol = '';
    var origin = '';
    var supports_local_storage = false;

    try {
      protocol = globalThis.location && globalThis.location.protocol ? globalThis.location.protocol : '';
      origin = globalThis.location && typeof globalThis.location.origin == 'string'
        ? globalThis.location.origin
        : '';
    } catch {}

    try {
      supports_local_storage = !!globalThis.localStorage;
    } catch {}

    return {
      protocol: protocol,
      origin: origin,
      is_local_file: protocol == 'file:',
      is_served: protocol == 'http:' || protocol == 'https:',
      is_secure_context: !!globalThis.isSecureContext,
      supports_opfs: !!(globalThis.navigator &&
        globalThis.navigator.storage &&
        typeof globalThis.navigator.storage.getDirectory == 'function'),
      supports_save_picker: typeof globalThis.showSaveFilePicker == 'function',
      supports_open_picker: typeof globalThis.showOpenFilePicker == 'function',
      supports_directory_picker: typeof globalThis.showDirectoryPicker == 'function',
      supports_web_serial: !!(globalThis.navigator &&
        globalThis.navigator.serial &&
        typeof globalThis.navigator.serial.getPorts == 'function'),
      supports_local_storage: supports_local_storage,
      supports_download_fallback: !!(typeof Blob != 'undefined' &&
        globalThis.URL &&
        typeof globalThis.URL.createObjectURL == 'function'),
      workspace_storage_mode: 'memory',
      workspace_storage_label: 'Ephemeral memory storage'
    };
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
      } catch {}
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
   * @param {...*} args
   */
  disp(...args) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(args.join(' '), 'info');
    }
  }

  /**
   * @param {...*} args
   */
  warn(...args) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(args.join(' '), 'warn');
    }
  }

  dispMonospaced(text) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(String(text), 'monospaced');
    }
  }

  dispLatex(text) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(String(text), 'latex');
    }
  }

  clc() {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage('', 'clear');
    }
  }

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
        } catch {}
      };
      return true;
    } catch {}
    return false;
  }

  /**
   * @param {string} text
   */
  showAns(text) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(text, 'ans');
    }
  }

  setWorkspace() {
    if(this.jsl && typeof this.jsl.onWorkspaceUpdated == 'function') {
      this.jsl.onWorkspaceUpdated();
    }
  }

  setStats(stats) {
    if(this.jsl && typeof this.jsl.onStatsUpdated == 'function') {
      this.jsl.onStatsUpdated(stats);
    }
  }

  setStatus(state, txt) {
    if(this.jsl && typeof this.jsl.onStatusUpdated == 'function') {
      this.jsl.onStatusUpdated(state, txt);
    }
  }

  codeEvaluating() {}
  codeEvaluated() {}
  resetStopLoop() {}

  checkStopLoop() {
    return false;
  }

  addPathSep(path_in) {
    var out = String(path_in || '');
    return out.endsWith('/') ? out : out + '/';
  }

  pathIsAbsolute(path_in) {
    return String(path_in || '').startsWith('/');
  }

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

  pathJoin() {
    return this.pathNormalize([].slice.call(arguments).join('/'));
  }

  pathSep() {
    return '/';
  }

  pathDirName(path_in) {
    var normalized = this.pathNormalize(path_in);
    var idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.slice(0, idx) || '/' : '.';
  }

  pathBaseName(path_in) {
    var normalized = this.pathNormalize(path_in);
    var idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.slice(idx + 1) : normalized;
  }

  pathFileName(path_in) {
    return this.pathBaseName(path_in);
  }

  pathExtName(path_in) {
    var name = this.pathBaseName(path_in);
    var idx = name.lastIndexOf('.');
    return idx >= 0 ? name.slice(idx) : '';
  }

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

  pathRelative(from_path, to_path) {
    var from_parts = this.pathResolve(from_path).split('/').filter(Boolean);
    var to_parts = this.pathResolve(to_path).split('/').filter(Boolean);
    while(from_parts.length && to_parts.length && from_parts[0] == to_parts[0]) {
      from_parts.shift();
      to_parts.shift();
    }
    return this.pathNormalize(
      [].concat(
        new Array(Math.max(0, from_parts.length)).fill('..'),
        to_parts
      ).join('/')
    ) || '.';
  }

  savePath() {
    return true;
  }

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

  checkScriptDir() {
    return false;
  }

  cd(new_path) {
    if(this.jsl && typeof this.jsl.setPath == 'function') {
      this.jsl.setPath(this.pathResolve(new_path));
      return true;
    }
    return false;
  }

  editor() {
    if(this.bridge && typeof this.bridge.openEditorFile == 'function') {
      return this.bridge.openEditorFile(...arguments);
    }
    return this.reportUnavailable('Desktop editor integration');
  }

  info() {
    if(this.bridge && typeof this.bridge.openMainDialog == 'function') {
      this.bridge.openMainDialog('info-container');
      return true;
    }
    return this.reportUnavailable('Desktop info dialog');
  }

  settings() {
    if(this.bridge && typeof this.bridge.openMainDialog == 'function') {
      this.bridge.openMainDialog('settings-container');
      return true;
    }
    return this.reportUnavailable('Desktop settings dialog');
  }

  cmd_help() {
    if(this.bridge && typeof this.bridge.openMainDialog == 'function') {
      this.bridge.openMainDialog('help-container');
      return true;
    }
    return this.reportUnavailable('Desktop help dialog');
  }

  showInspector(model) {
    if(this.bridge && typeof this.bridge.showInspector == 'function') {
      this.bridge.showInspector(model);
      return true;
    }
    return this.reportUnavailable('Inspector');
  }

  openSandboxDevTools() {
    return this.reportUnavailable('Sandbox DevTools');
  }

  error(message, throw_flag = true) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(String(message || 'Unknown browser-mode error'), 'error');
    }
    if(throw_flag) {
      throw new Error(String(message || 'Unknown browser-mode error'));
    }
    return false;
  }

  errorInternal(message) {
    if(this.jsl && typeof this.jsl.emitRuntimeMessage == 'function') {
      this.jsl.emitRuntimeMessage(String(message || 'Internal browser-mode error'), 'error');
    }
  }

  readFileSync() {
    var file_path = this.pathNormalize(this.pathResolve(arguments[0]));
    var encoding = arguments[1];

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

  copyFileSync() {
    if(this.bridge && typeof this.bridge.copyWorkspaceFileSync == 'function') {
      return this.bridge.copyWorkspaceFileSync(arguments[0], arguments[1]);
    }
    return this.reportUnavailable('Direct filesystem copies');
  }

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

  readDir() {
    var dir_path = this.pathNormalize(this.pathResolve(arguments[0]));
    var options = arguments[1];
    if(this._isWorkspacePath(dir_path) && this.bridge &&
        typeof this.bridge.readWorkspaceDirSync == 'function') {
      return this.bridge.readWorkspaceDirSync(dir_path, options);
    }
    return false;
  }

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

  showOpenDialog() {
    if(this.bridge && typeof this.bridge.showOpenDialog == 'function') {
      return this.bridge.showOpenDialog(arguments[0]);
    }
    return false;
  }

  showOpenDialogSync() {
    return false;
  }

  buildShareLink() {
    if(this.bridge && typeof this.bridge.buildShareLink == 'function') {
      return this.bridge.buildShareLink(arguments[0]);
    }
    return false;
  }

  showSaveDialog() {
    if(this.bridge && typeof this.bridge.showSaveDialog == 'function') {
      return this.bridge.showSaveDialog(arguments[0]);
    }
    return false;
  }

  showSaveDialogSync() {
    return false;
  }

  saveLocalFile() {
    if(this.bridge && typeof this.bridge.saveLocalFile == 'function') {
      return this.bridge.saveLocalFile(arguments[0], arguments[1], arguments[2]);
    }
    return false;
  }

  svgToPdf() {
    if(this.bridge && typeof this.bridge.svgToPdf == 'function') {
      return this.bridge.svgToPdf(arguments[0], arguments[1], arguments[2], arguments[3]);
    }
    return false;
  }

  showMessageBox() {
    return this.reportUnavailable('Native message boxes');
  }

  exec() {
    return this.reportUnavailable('Child process execution');
  }

  execSync() {
    return this.reportUnavailable('Child process execution');
  }

  spawn() {
    return this.reportUnavailable('Child process execution');
  }

  spawnSync() {
    return this.reportUnavailable('Child process execution');
  }

  sendPty() {
    return this.reportUnavailable('PTY support');
  }

  getDefaultPath(type) {
    if(type == 'root') {
      return '/';
    }
    if(type == 'includes') {
      return '/includes/';
    }
    return '/workspace/';
  }

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

  openWindow(wid, file = 'blank.html') {
    if(this.is_worker || !this.bridge || typeof this.bridge.openManagedWindow != 'function') {
      return [false, Promise.resolve(false)];
    }
    var opened = this.bridge.openManagedWindow(wid, file);
    if(!opened || !opened.context) {
      return [false, Promise.resolve(false)];
    }
    return [opened.context, opened.ready || Promise.resolve(opened.context)];
  }

  closeWindow(wid) {
    if(!this.bridge || typeof this.bridge.closeManagedWindow != 'function') {
      return false;
    }
    return this.bridge.closeManagedWindow(wid, { notifySandbox: false });
  }

  closeWindows(wid) {
    return this.closeWindow(wid);
  }

  showWindow(wid) {
    return this.bridge && typeof this.bridge.showWindow == 'function'
      ? this.bridge.showWindow(wid)
      : false;
  }

  hideWindow(wid) {
    return this.bridge && typeof this.bridge.hideWindow == 'function'
      ? this.bridge.hideWindow(wid)
      : false;
  }

  focusWindow(wid) {
    return this.bridge && typeof this.bridge.focusWindow == 'function'
      ? this.bridge.focusWindow(wid)
      : false;
  }

  minimizeWindow(wid) {
    return this.bridge && typeof this.bridge.minimizeWindow == 'function'
      ? this.bridge.minimizeWindow(wid)
      : false;
  }

  centerWindow(wid) {
    return this.bridge && typeof this.bridge.centerWindow == 'function'
      ? this.bridge.centerWindow(wid)
      : false;
  }

  moveTopWindow(wid) {
    return this.bridge && typeof this.bridge.moveTopWindow == 'function'
      ? this.bridge.moveTopWindow(wid)
      : false;
  }

  setWindowSize(wid, width, height) {
    return this.bridge && typeof this.bridge.setWindowSize == 'function'
      ? this.bridge.setWindowSize(wid, width, height)
      : false;
  }

  setWindowPos(wid, left, top) {
    return this.bridge && typeof this.bridge.setWindowPos == 'function'
      ? this.bridge.setWindowPos(wid, left, top)
      : false;
  }

  setWindowResizable(wid, state) {
    return this.bridge && typeof this.bridge.setWindowResizable == 'function'
      ? this.bridge.setWindowResizable(wid, state)
      : false;
  }

  setWindowMovable(wid, state) {
    return this.bridge && typeof this.bridge.setWindowMovable == 'function'
      ? this.bridge.setWindowMovable(wid, state)
      : false;
  }

  setWindowAspectRatio(wid, aspect_ratio) {
    return this.bridge && typeof this.bridge.setWindowAspectRatio == 'function'
      ? this.bridge.setWindowAspectRatio(wid, aspect_ratio)
      : false;
  }

  setWindowOpacity(wid, opacity) {
    return this.bridge && typeof this.bridge.setWindowOpacity == 'function'
      ? this.bridge.setWindowOpacity(wid, opacity)
      : false;
  }

  setWindowFullscreen(wid, state) {
    return this.bridge && typeof this.bridge.setWindowFullscreen == 'function'
      ? this.bridge.setWindowFullscreen(wid, state)
      : false;
  }

  setWindowTitle(wid, title) {
    return this.bridge && typeof this.bridge.setWindowTitle == 'function'
      ? this.bridge.setWindowTitle(wid, title)
      : false;
  }

  getWindowSize(wid) {
    return this.bridge && typeof this.bridge.getWindowSize == 'function'
      ? this.bridge.getWindowSize(wid)
      : false;
  }

  getWindowPos(wid) {
    return this.bridge && typeof this.bridge.getWindowPos == 'function'
      ? this.bridge.getWindowPos(wid)
      : false;
  }

  openWindowDevTools() {
    return this.reportUnavailable('Window DevTools', false);
  }

  getWindowMediaSourceId() {
    return false;
  }

  printWindowToPdf() {
    return this.reportUnavailable('Window PDF printing', false);
  }

  openFolder() {
    return this.reportUnavailable('Open folder in host system', false);
  }

  openDir() {
    return this.reportUnavailable('Open directory in host system', false);
  }

  showFileInFolder() {
    return this.reportUnavailable('Reveal file in host system', false);
  }

  showFileInDir() {
    return this.reportUnavailable('Reveal file in host system', false);
  }

  getDesktopSources() {
    return false;
  }

  _isWorkspacePath(path_in) {
    return typeof path_in == 'string' &&
      (path_in == '/workspace' || path_in == '/workspace/' || path_in.startsWith('/workspace/'));
  }

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

  _getAppAssetSync(path_in) {
    if(this.bridge && typeof this.bridge.getAppAssetSync == 'function') {
      return this.bridge.getAppAssetSync(path_in);
    }
    return false;
  }

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
}

exports.PRDC_JSLAB_ENV = PRDC_JSLAB_ENV;
