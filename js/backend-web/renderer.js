/**
 * @file JSLAB browser renderer adapter services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_DEBUGGER_DISPATCHER } = require("../other-shared/debugger-dispatcher");
const { PRDC_JSLAB_WEB_STORAGE } = require('./storage');
const { PRDC_JSLAB_WEB_NODE_COMPATIBILITY } = require('./node-compatibility');
const { PRDC_JSLAB_WEB_FILES } = require('./files');
const browser_path = require('./node-compatibility');

/**
 * Class for delivering window requests to the browser application host.
 */
class PRDC_JSLAB_WEB_RENDERER_HOST {

  /**
   * Creates a host endpoint for one managed window.
   * @param {Object} platform Browser window adapter.
   */
  constructor(platform) {
    this.platform = platform;
    this._listeners = new Map();
  }

  /**
   * Registers a controller event listener.
   * @param {string} channel Feature event channel.
   * @param {Function} callback Event listener.
   */
  on(channel, callback) {
    if(!this._listeners.has(channel)) {
      this._listeners.set(channel, new Set());
    }
    this._listeners.get(channel).add(callback);
  }

  /**
   * Delivers a host event to the controller.
   * @param {string} channel Feature event channel.
   * @param {...*} args Event arguments.
   */
  emit(channel, ...args) {
    let result;
    for(const callback of this._listeners.get(channel) || []) {
      result = callback({}, ...args);
    }
    return result;
  }

  /**
   * Runs a request whose result is needed by the controller.
   * @param {string} channel Service channel.
   * @param {string} method Operation name.
   * @param {*} args Operation arguments.
   * @returns {Promise<*>} Host response.
   */
  async invoke(channel, method, args) {
    const bridge = this.platform.bridge;
    if(channel == 'JSLAB_ASSISTANT_CHAT') {
      return bridge.assistantRequest(channel, method);
    }
    if(channel == 'dialog' && method == 'showSaveDialog') {
      const target = await bridge.showSaveDialog(args);
      return target && !target.canceled ? { canceled: false, filePath: { browser_target: target } } : { canceled: true };
    }
    if(channel == 'JSLAB_DEBUGGER_VIEW_STATE') {
      return bridge.getDebugState();
    }
    if(channel == 'JSLAB_DEBUGGER') {
      return PRDC_JSLAB_DEBUGGER_DISPATCHER.request(() => bridge.debugCommand(method, args));
    }
    if(channel == 'dialog' && method == 'showOpenDialog') {
      const paths = await bridge.showOpenDialog(args);
      return { canceled: !Array.isArray(paths) || !paths.length, filePaths: Array.isArray(paths) ? paths : [] };
    }
    throw new Error('Unsupported window request: ' + channel);
  }

  /**
   * Supplies synchronous window state used during controller initialization.
   * @param {string} channel Service channel.
   * @param {string} method Operation name.
   * @returns {*} Host response.
   */
  sendSync(channel, method) {
    if(channel == 'sync-message' && method == 'get-path') {
      return '/workspace/';
    }
    if(channel == 'sync-message' && method == 'get-process-arguments') {
      return [];
    }
    if(channel == 'sync-message' && method == 'is-maximized-win') {
      return false;
    }
    throw new Error('Unsupported synchronous window request: ' + channel + '/' + method);
  }

  /**
   * Routes a controller notification to the browser application.
   * @param {string} channel Feature channel.
   * @param {string} action Operation name.
   * @param {*} data Operation data.
   */
  send(channel, action, data) {
    const bridge = this.platform.bridge;
    let pending;
    if(['JSLAB_ASSISTANT_CANCEL', 'JSLAB_ASSISTANT_RESET'].includes(channel)) {
      pending = bridge.assistantRequest(channel);
    } else if(channel == 'MainWindow') {
      pending = bridge.sendMainWindow(action, data);
    } else if(channel == 'SandboxWindow' && action == 'interrupt-execution') {
      pending = bridge.debugCommand('interrupt_execution');
    } else if(channel == 'MainProcess') {
      if(action == 'close-editor' || action == 'close-win') {
        bridge.closeFrameWindow(globalThis);
      } else if(action == 'minimize-win') {
        bridge.minimizeWindow(this.platform.window_id);
      } else if(action == 'show-editor' || action == 'fade-in-win' || action == 'focus-win') {
        bridge.focusWindow(this.platform.window_id);
      }
    }
    if(pending && typeof pending.catch == 'function') {
      pending.catch(error => bridge.appendConsoleMessage(String(error.message || error), 'error'));
    }
  }
}

/**
 * Class for browser implementations of a window controller's platform services.
 */
class PRDC_JSLAB_WEB_RENDERER_ADAPTER {

  /**
   * Creates services for one feature window.
   * @param {Object} bridge Browser application bridge.
   * @param {string} feature Feature name.
   */
  constructor(bridge, feature) {
    PRDC_JSLAB_WEB_NODE_COMPATIBILITY.ensure();
    this.bridge = bridge;
    this.kind = 'web';
    this.window_id = feature + '-window';
    this.host = new PRDC_JSLAB_WEB_RENDERER_HOST(this);
    this.path = browser_path;
    this.pathEqual = (left, right) => browser_path.normalize(left) == browser_path.normalize(right);

    const namespace = 'jslab-' + feature;
    this.store = new PRDC_JSLAB_WEB_STORAGE(namespace);
    this.panel_store = new PRDC_JSLAB_WEB_STORAGE();

    this.clipboard = {
      readText: async () => navigator.clipboard ? navigator.clipboard.readText() : '',
      writeText: async value => {
        if(navigator.clipboard) {
          await navigator.clipboard.writeText(value);
        }
      }
    };
    this.webUtils = { getPathForFile: file => file.path || file.name };
    this.fs = {
      readFileSync: filename => bridge.readWorkspaceTextSync(filename),
      writeFileSync: (filename, text) => filename?.browser_target ? bridge.saveLocalFile(filename.browser_target, text, { mimeType: 'text/plain;charset=utf-8' }) : bridge.writeWorkspaceTextSync(filename, text),
      existsSync: filename => bridge.existsWorkspaceFileSync(filename) || bridge.existsWorkspaceDirectorySync(filename),
      lstatSync: filename => bridge.existsWorkspaceFileSync(filename) || bridge.existsWorkspaceDirectorySync(filename) ? {
        isFile: () => bridge.existsWorkspaceFileSync(filename),
        isDirectory: () => bridge.existsWorkspaceDirectorySync(filename)
      } : undefined
    };
  }

  /**
   * Creates a persistent workspace path for a new browser editor tab.
   * @returns {string} New workspace file path.
   */
  createScriptPath() {
    let index = 1;
    while(this.bridge.existsWorkspaceFileSync('/workspace/script-' + index + '.jsl')) {
      index++;
    }
    const filename = '/workspace/script-' + index + '.jsl';
    this.bridge.writeWorkspaceTextSync(filename, '');
    return filename;
  }

  /**
   * Selects a local browser save destination without changing workspace identity.
   * @param {Object} options Save-dialog options.
   * @returns {Promise<Object|false>} Local save target or cancellation.
   */
  async chooseSaveTarget(options) {
    const target = await this.bridge.showSaveDialog(options);
    return target && !target.canceled ? { local: target } : false;
  }

  /**
   * Writes an exported file through the browser's picker or download service.
   * @param {Object} target Selected save target.
   * @param {string} code Script text.
   * @returns {Promise<*>} Save result.
   */
  writeSaveTarget(target, code) {
    return this.bridge.saveLocalFile(target.local, code, { mimeType: 'text/plain;charset=utf-8' });
  }

  /**
   * Returns the documentation catalogue embedded in the browser application.
   * @returns {Object} Documentation entries by scope and category.
   */
  getDocumentation() {
    return globalThis.__JSLAB_WEB_DOCS__ || globalThis.parent.__JSLAB_WEB_DOCS__;
  }

  /**
   * Returns startup file arguments for managed browser windows.
   * @returns {string[]} No operating-system launch arguments.
   */
  getArguments() {
    return [];
  }

  /**
   * Opens external links without replacing a feature window.
   */
  preventRedirect() {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if(link) {
        event.preventDefault();
        globalThis.open(link.href, '_blank', 'noopener');
      }
    });
  }

  /**
   * Leaves browser window controls with the enclosing window manager.
   */
  bindWindowControls() {}

  /**
 * Resolves a Presentation workspace path using the browser path adapter.
 */
  normalizePresentationPath(filename) {
    const value = String(filename || '').trim().replace(/\\/g, '/');
    if(!value) {
      return '';
    }
    return this.path.normalize((value == '/workspace' || value.startsWith('/workspace/')) ? value : '/workspace/' + value.replace(/^\/+/, ''));
  }

  /**
 * Joins a presentation resource path without escaping its workspace root.
 */
  joinPresentationPath(base, relative) {
    const value = String(relative || '').trim().replace(/\\/g, '/');
    const joined = value.startsWith('/') ? this.normalizePresentationPath(value) :
      this.path.join(this.normalizePresentationPath(base || '/workspace'), value);
    return joined === '/workspace' || joined.startsWith('/workspace/') ? joined : '/workspace';
  }

  /**
 * Publishes the document title through its managed window.
 */
  setPresentationTitle(title) {
    this.bridge.setFrameWindowTitle(globalThis, title);
  }

  /**
 * Closes the Presentation surface through its owning application.
 */
  closePresentationWindow() {
    return this.bridge.closeFrameWindow(globalThis);
  }
}

exports.PRDC_JSLAB_WEB_RENDERER_ADAPTER = PRDC_JSLAB_WEB_RENDERER_ADAPTER;
exports.PRDC_JSLAB_WEB_RENDERER_HOST = PRDC_JSLAB_WEB_RENDERER_HOST;

/**
 * Connects common controller messages to browser runtime services.
 */
class PRDC_JSLAB_WEB_MAIN_HOST extends PRDC_JSLAB_WEB_RENDERER_HOST {

  /**
   * Dispatches an asynchronous runtime or operating-system request.
   * @param {string} channel Service channel.
   * @param {*} method Service operation or request data.
   * @param {*} args Operation arguments.
   * @returns {Promise<*>} Service response.
   */
  async invoke(channel, method, args) {
    const shell = this.platform.application;
    const operations = {
      'get-completions': 'getCompletions',
      'get-console-preview': 'getConsolePreview',
      'get-console-properties': 'getConsoleProperties',
      'get-console-accessor': 'getConsoleAccessor',
      'is-console-expression-complete': 'isConsoleExpressionComplete'
    };
    if(Object.hasOwn(operations, channel)) {
      return shell.bridge[operations[channel]](method);
    }
    if(channel == 'JSLAB_ASSISTANT_SETTINGS_GET') {
      return shell.assistant.request(channel, method);
    }
    if(channel == 'JSLAB_ASSISTANT_SETTINGS_SET') {
      return shell.assistant.request(channel, method);
    }
    if(channel == 'dialog') {
      if(method == 'showSaveDialog') {
        const target = await shell.files._showSaveDialog(args);
        if(!target || target.canceled) {
          return { canceled: true };
        }
        return { canceled: false, filePath: { browser_target: target } };
      }
    }
    return super.invoke(channel, method, args);
  }

  /**
   * Routes controller notifications to the worker, editor, or browser host.
   * @param {string} channel Destination channel.
   * @param {string} action Operation name.
   * @param {*} data Operation data.
   * @returns {*} Pending operation when execution is asynchronous.
   */
  send(channel, action, data) {
    const shell = this.platform.application;
    if(channel == 'SandboxWindow') {
      switch(action) {
        case 'eval-code': return shell.runtime._executeCode(data[0], { show_output: data[1], path: data[2] });
        case 'interrupt-execution': return shell.worker_debugger?.interrupt();
        case 'set-language': return shell.sandbox_api?.setLanguage(data);
        case 'set-current-path': shell.storage.set('current_path', data); return;
        case 'set-saved-paths': shell.storage.set('saved_paths', data); return;
        case 'run-last-script': return shell.runtime._executeCode('', { run_last: true });
      }
    }
    if(channel == 'MainProcess') {
      switch(action) {
        case 'show-editor': return shell.windows._openNewEditorWindow();
        case 'show-assistant': return shell.windows._openAssistantWindow();
        case 'show-simulate': return data === undefined ?
          shell.windows._openSimulateWindow() : shell.windows._openSimulateProject(data);
        case 'set-fullscreen':
          if(data) {
            return document.documentElement.requestFullscreen?.();
          }
          return document.fullscreenElement && document.exitFullscreen?.();
        case 'focus-win': return window.focus();
        case 'close-app': shell.storage.set('full_history', shell.main.command_history.full_history); return;
        default: return;
      }
    }
    if(channel == 'EditorWindow') {
      if(action == 'open-script') {
        return shell.windows._openEditorWindow(data[0], data[1], data[2]);
      }
      if(action == 'debug-location') {
        return shell.runtime._showWorkerDebugSource(data);
      }
      return;
    }
    if(channel == 'DebuggerPane') {
      return shell.runtime._publishWorkerEditor();
    }
    if(['AssistantWindow', 'SimulateWindow', 'TerminalWindow'].includes(channel)) {
      return;
    }
    return super.send(channel, action, data);
  }
}

/**
 * Supplies browser storage, metadata and host requests to the main window.
 */
class PRDC_JSLAB_WEB_MAIN_ADAPTER extends PRDC_JSLAB_WEB_RENDERER_ADAPTER {

  /**
   * Adapts one browser application host to the common controllers.
   * @param {Object} shell Browser application services.
   */
  constructor(shell) {
    super(shell.bridge, 'main');
    this.application = shell;
    this.store = shell.storage;
    this.animation_duration = 0;
    this.host = new PRDC_JSLAB_WEB_MAIN_HOST(this);
    const browser_fs = shell.fs;
    this.fs.createWriteStream = filename => browser_fs.createAppendTextStream(filename);
    this.fs.readdir = (filename, options, callback) => {
      try {
        const entries = browser_fs.readDirSync(filename, options);
        for(const entry of entries) {
          entry.isSymbolicLink = () => false;
        }
        callback(null, entries);
      } catch(error) {
        callback(error);
      }
    };
    this.fs.writeFile = (filename, text, callback) => {
      const pending = filename?.browser_target ? shell.files._saveLocalFile(filename.browser_target, text, { mimeType: 'text/plain;charset=utf-8' }) : browser_fs.writeTextFile(filename, text);
      pending.then(() => callback(null), callback);
    };
    this.shell = { openExternal: url => globalThis.open(url, '_blank', 'noopener') };
  }

  /**
   * Returns application identity and the persistent browser workspace root.
   * @returns {Object} Main-window application metadata.
   */
  getApplicationInfo() {
    return { version: globalThis.__JSLAB_WEB_APP_VERSION__ || '', user: 'browser@local',
      computer_name: 'browser', documents_path: '/workspace/', exe_path: '' };
  }

  /**
   * Resolves an application asset within the browser deployment root.
   * @param {string} relative_path Asset path within the application.
   * @returns {string} Absolute asset URL.
   */
  getAssetURL(relative_path) {
    return new URL(relative_path, document.baseURI).href;
  }

  /**
   * Removes a file or directory from browser workspace storage.
   * @param {string} filename Selected workspace entry.
   */
  removePath(filename) {
    this.application.fs.removeSync(filename);
  }

  /**
   * Loads the browser math renderer when common console output needs it.
   * @param {HTMLElement[]} elements Output nodes to typeset.
   * @returns {Promise<void>} Completion of math rendering.
   */
  async typesetMath(elements) {
    const assets = globalThis.__JSLAB_WEB_OPTIONAL_ASSETS__ || {};
    await PRDC_JSLAB_WEB_FILES.loadScripts([
      { source: assets.mathjax_config || './js/windows/mathjax-config.js' },
      { source: assets.mathjax || './lib/MathJax-3.2.0/tex-mml-chtml.js',
        available: () => typeof globalThis.MathJax?.typesetPromise == 'function' }
    ]);
    await globalThis.MathJax.typesetPromise(elements);
  }
}

exports.PRDC_JSLAB_WEB_MAIN_ADAPTER = PRDC_JSLAB_WEB_MAIN_ADAPTER;
