/**
 * @file JSLAB browser main services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_ASSISTANT } = require('../windows/assistant');
const { PRDC_JSLAB_MAIN } = require('../main/main');
const { PRDC_JSLAB_WEB_MAIN_ADAPTER } = require('./renderer');

var { PRDC_JSLAB_WEB_FS } = require('./files');
var { PRDC_JSLAB_WEB_WINDOW_MANAGER } = require('./window-manager');
const { PRDC_JSLAB_WEB_FILES } = require('./files');
const { PRDC_JSLAB_WEB_SANDBOX_HOST } = require('./sandbox-host');
var { PRDC_JSLAB_WEB_STORAGE } = require('./storage');
var { PRDC_JSLAB_LANGUAGE } = require('../other-shared/language');

var { PRDC_APP_CONFIG } = require('../../config/config');

var app_config = new PRDC_APP_CONFIG();

/**
 * Owns browser runtime, filesystem, downloads and managed window services.
 */

class PRDC_JSLAB_WEB_APP_HOST {

  /**
   * Initializes the web app shell instance.
   */
  constructor() {
    this.files = new PRDC_JSLAB_WEB_FILES(this);
    this.runtime = new PRDC_JSLAB_WEB_SANDBOX_HOST(this);
    this.fs = new PRDC_JSLAB_WEB_FS();
    this.storage = new PRDC_JSLAB_WEB_STORAGE('jslab-web');
    this.assistant = new PRDC_JSLAB_ASSISTANT({ storage: this.storage, host: this, credential_status: 678 });
    this.language = new PRDC_JSLAB_LANGUAGE(this.storage);
    this.sandbox_frame = null;
    this.sandbox_frame_url = null;
    this.sandbox_api = null;
    this.window_manager = null;
    this.bridge = null;
    this.local_save_targets = {};
    this.local_save_target_id = 0;
    this.editor_window_id = 'jslab-web-editor';
    this.session_user = 'browser@local';
    this.status_text_id = 87;
    this.stats = { required_modules: 0, promises: 0, timeouts: 0, immediates: 0, intervals: 0, animation_frames: 0, idle_callbacks: 0 };
    this.runtime_info = this.runtime._detectRuntimeInfo();
    this.file_picker = document.getElementById('file-picker');
    this.folder_picker = document.getElementById('folder-picker');
    this.file_browser_cont = document.getElementById('file-browser-cont');
    this.console_messages = document.getElementById('command-window-messages');
    this.command_panel = document.getElementById('command-window');
    this.command_input = document.getElementById('command-window-input');
    this.history_cont = document.getElementById('command-history');
    this.workspace_search = document.getElementById('workspace-search');
    this.status_cont = document.getElementById('status');
    this.stats_icon = document.getElementById('sandbox-stats-icon');
    this.command_settings_dialog = document.getElementById('command-window-settings');
    this.command_log_dialog = document.getElementById('command-window-log');
    this.command_history_dialog = document.getElementById('command-window-history');
    this.command_history_list = document.getElementById('command-window-history-list');
    this.file_browser_context_menu = document.getElementById('file-browser-context-menu');
    this.file_browser_import_menu = document.getElementById('file-browser-import-menu');
    this.file_tree_expanded_paths = new Set();
    globalThis.language = this.language;
    globalThis.config = app_config;
    this.language.setOnLanguageChange(() => this._onLanguageChange());
  }

  /**
   * Starts the browser shell.
   */
  async start() {
    await this.runtime._registerLibraryCache();
    this.bridge = this._createBridge();
    globalThis.__JSLAB_WEB_BRIDGE__ = this.bridge;
    globalThis.__JSLAB_WEB_RUNTIME_INFO__ = this.runtime.getRuntimeInfo();
    await this.fs.init();
    const taskbar = document.getElementById('taskbar');
    this.window_manager = new PRDC_JSLAB_WEB_WINDOW_MANAGER({ application: this, container: document.getElementById('window-layer'), taskbar,
      onStateChange: windows => this.storage.set('window-state', windows) });
    this.windows = this.window_manager;
    this.platform = new PRDC_JSLAB_WEB_MAIN_ADAPTER(this);
    this.main = new PRDC_JSLAB_MAIN(this.platform);
    globalThis.win_main = this.main;
    this._connectMainControllers();
    this.main.gui.resetStats();
    this.language.update('html');
    this.main.onReady();
    this._bindHeaderActions();
    this.files._bindImportActions();
    this.files._bindBrowserFileActions();
    this.runtime._refreshRuntimeInfo();
    await this.runtime._startSandbox();
    await this.files._handleStartupOpenUrls();
  }

  /**
   * Creates the explicit same-origin bridge used by web frames and sandbox.
   * @returns {Object}
   */
  _createBridge() {
    var obj = this;
    return {
      assistantRequest: (channel, data) => obj.assistant.request(channel, data),
      currentString: function(id) {
        return obj.language.currentString(id);
      },
      formatLang: function(id, values) {
        return obj.language.formatLang(id, values);
      },
      getLanguage: function() {
        return obj.language;
      },
      getRuntimeInfo: function() {
        return obj.runtime.getRuntimeInfo();
      },
      getRuntimeCapability: function(name) {
        return obj.runtime.getRuntimeCapability(name);
      },
      buildShareLink: function(file_url) {
        return obj.files._buildShareLink(file_url);
      },
      openMainDialog: function(id) {
        obj.openMainDialog(id);
        return true;
      },
      showInspector: function(model) {
        obj.showInspector(model);
        return true;
      },
      closeMainDialog: function(id) {
        obj._closeDialog(id);
        return true;
      },
      appendConsoleMessage: function(message, kind) {
        obj.handleSandboxRuntimeLog(message, kind || 'info');
        return true;
      },
      debugCommand: (method, args) => obj.runtime._debugCommand(method, args),
      getDebugState: () => obj.runtime._workerDebugState(),
      openDebugger: () => obj.windows._openEditorDebugger(),
      runEditorCode: function(code, label) {
        return obj.runtime.runEditorCode(code, label);
      },
      showDocumentation: function(query) {
        return obj.showDocumentation(query);
      },
      getCompletions: function(data) {
        if(obj.sandbox_api && typeof obj.sandbox_api.getCompletions == 'function') {
          return obj.sandbox_api.getCompletions(data);
        }
        return [];
      },
      getConsoleProperties: function(request) {
        if(obj.sandbox_api && typeof obj.sandbox_api.getConsoleProperties == 'function') {
          return obj.sandbox_api.getConsoleProperties(request);
        }
        return { success: false, error: obj.language.string(631) };
      },
      getConsoleAccessor: function(request) {
        if(obj.sandbox_api && typeof obj.sandbox_api.getConsoleAccessor == 'function') {
          return obj.sandbox_api.getConsoleAccessor(request);
        }
        return { success: false, error: obj.language.string(631) };
      },
      getConsolePreview: function(expression) {
        if(obj.sandbox_api && typeof obj.sandbox_api.getConsolePreview == 'function') {
          return obj.sandbox_api.getConsolePreview(expression);
        }
        return { success: false };
      },
      isConsoleExpressionComplete: function(code) {
        if(obj.sandbox_api && typeof obj.sandbox_api.isConsoleExpressionComplete == 'function') {
          return obj.sandbox_api.isConsoleExpressionComplete(code);
        }
        return true;
      },
      openEditorFile: function(file_path, lineno) {
        return obj.windows._openEditorWindow(file_path, lineno);
      },
      openSimulate: function(filepath, options, request_id) {
        return obj.windows._openSimulateWindow(filepath, options, request_id);
      },
      cancelSimulate: function(request_id) {
        const frame = obj.window_manager.windows.get('simulate-window')?.iframe.contentWindow;
        return frame?.__JSLAB_WEB_SIMULATE_READY__?.then(api => api.host.cancel(request_id)) || false;
      },
      getSimulateLibraryURL: function() {
        return obj.windows._getSimulateLibraryURL();
      },
      resolveSimulateValue: function(expression) {
        if(obj.worker_debugger?.state === 'paused') {
          return Promise.resolve({ success: false, error: obj.language.currentString(631) });
        }
        return obj.sandbox_api.resolveSimulateValue(expression);
      },
      publishSimulation: function(data) {
        obj._simulation_result = data;
        return obj.sandbox_api.publishSimulation(data);
      },
      openSimulationAnimation: async function(data) {
        if(!obj._simulation_result) {
          return false;
        }
        obj.ui_sandbox_api.publishSimulation(obj._simulation_result);
        return obj.ui_sandbox_api.openSimulationAnimation(data);
      },
      toggleSimulateMaximize: function() {
        return obj.window_manager.toggleMaximize('simulate-window');
      },
      createUntitledEditorFile: function() {
        return obj.windows._openNewEditorWindow();
      },
      refreshWorkspaceList: function() {
        return obj._refreshWorkspaceList();
      },
      clearWorkspaceStorage: function() {
        obj.fs.removeSync('/workspace/');
        obj._refreshWorkspaceList();
        if(obj.sandbox_api && typeof obj.sandbox_api.handshake == 'function') {
          obj.handleSandboxWorkspaceUpdated(obj.sandbox_api.handshake().workspace || []);
        }
        return true;
      },
      readWorkspaceText: function(file_path) {
        return obj.fs.readTextFile(file_path);
      },
      buildPresentationDocument: function(root_path) {
        return obj.ui_sandbox_api.buildPresentationDocument(root_path);
      },
      readWorkspaceTextSync: function(file_path) {
        return obj.fs.readTextFileSync(file_path);
      },
      readWorkspaceBytesSync: function(file_path) {
        return obj.fs.readBytesSync(file_path);
      },
      writeWorkspaceTextSync: function(file_path, data) {
        obj.fs.writeTextFileSync(file_path, data);
        obj._refreshWorkspaceList();
        return true;
      },
      writeWorkspaceBytesSync: function(file_path, data) {
        obj.fs.writeBytesSync(file_path, data);
        obj._refreshWorkspaceList();
        return true;
      },
      copyWorkspaceFileSync: function(from_path, to_path) {
        return obj.fs.copyFileSync(from_path, to_path);
      },
      removeWorkspacePathSync: function(file_path) {
        obj.fs.removeSync(file_path);
        obj._refreshWorkspaceList();
        return true;
      },
      makeWorkspaceDirectorySync: function(dir_path) {
        obj.fs.makeDirectorySync(dir_path);
        obj._refreshWorkspaceList();
        return true;
      },
      readWorkspaceDirSync: function(dir_path, options) {
        return obj.fs.readDirSync(dir_path, options);
      },
      existsWorkspaceFileSync: function(file_path) {
        return obj.fs.existsFileSync(file_path);
      },
      existsWorkspaceDirectorySync: function(dir_path) {
        return obj.fs.existsDirectorySync(dir_path);
      },
      showSaveDialog: function(options) {
        return obj.files._showSaveDialog(options);
      },
      showOpenDialog: function(options) {
        return obj.files._showOpenDialog(options);
      },
      showSaveDialogSync: function() {
        return false;
      },
      saveLocalFile: function(target, data, options) {
        return obj.files._saveLocalFile(target, data, options);
      },
      svgToPdf: function(svg_data, width, height, fonts) {
        return obj.files._svgToPdf(svg_data, width, height, fonts);
      },
      downloadLocalFileSync: function(file_path, data, options) {
        return obj.files._downloadLocalFileSync(file_path, data, options);
      },
      getAppAssetSync: function(asset_path) {
        return obj.windows.getAppAssetSync(asset_path);
      },
      openManagedWindow: function(wid, file) {
        return obj.windows.openManagedWindow(wid, file);
      },
      closeManagedWindow: function(wid, options) {
        return obj.windows.closeManagedWindow(wid, options);
      },
      showWindow: function(wid) {
        return obj.window_manager ? obj.window_manager.show(String(wid)) : false;
      },
      hideWindow: function(wid) {
        return obj.window_manager ? obj.window_manager.hide(String(wid)) : false;
      },
      focusWindow: function(wid) {
        return obj.window_manager ? obj.window_manager.focus(String(wid)) : false;
      },
      minimizeWindow: function(wid) {
        return obj.window_manager ? obj.window_manager.minimize(String(wid)) : false;
      },
      centerWindow: function(wid) {
        return obj.window_manager ? obj.window_manager.center(String(wid)) : false;
      },
      moveTopWindow: function(wid) {
        return obj.window_manager ? obj.window_manager.moveTop(String(wid)) : false;
      },
      setWindowSize: function(wid, width, height) {
        return obj.window_manager ? obj.window_manager.setSize(String(wid), width, height) : false;
      },
      setWindowPos: function(wid, left, top) {
        return obj.window_manager ? obj.window_manager.setPos(String(wid), left, top) : false;
      },
      setWindowResizable: function(wid, state) {
        return obj.window_manager ? obj.window_manager.setResizable(String(wid), state) : false;
      },
      setWindowMovable: function(wid, state) {
        return obj.window_manager ? obj.window_manager.setMovable(String(wid), state) : false;
      },
      setWindowAspectRatio: function(wid, aspect_ratio) {
        return obj.window_manager ? obj.window_manager.setAspectRatio(String(wid), aspect_ratio) : false;
      },
      setWindowOpacity: function(wid, opacity) {
        return obj.window_manager ? obj.window_manager.setOpacity(String(wid), opacity) : false;
      },
      setWindowFullscreen: function(wid, state) {
        return obj.window_manager ? obj.window_manager.setFullscreen(String(wid), state) : false;
      },
      setWindowTitle: function(wid, title) {
        return obj.window_manager ? obj.window_manager.setTitle(String(wid), title) : false;
      },
      getWindowSize: function(wid) {
        return obj.window_manager ? obj.window_manager.getSize(String(wid)) : false;
      },
      getWindowPos: function(wid) {
        return obj.window_manager ? obj.window_manager.getPos(String(wid)) : false;
      },
      setFrameWindowTitle: function(frame_window, title) {
        var frame_win = obj.windows._findManagedWindowByContentWindow(frame_window);
        if(!frame_win) {
          return false;
        }
        frame_win.setTitle(String(title || ''));
        return true;
      },
      closeFrameWindow: function(frame_window, options) {
        var frame_win = obj.windows._findManagedWindowByContentWindow(frame_window);
        if(!frame_win) {
          return false;
        }
        return obj.windows.closeManagedWindow(frame_win.id, options);
      },
      emitSandboxRuntimeLog: function(message, level) {
        obj.handleSandboxRuntimeLog(message, level);
        return true;
      },
      emitSandboxWorkspaceUpdated: function(workspace) {
        obj.handleSandboxWorkspaceUpdated(workspace);
        return true;
      },
      emitSandboxStatusUpdated: function(state, text) {
        obj.handleSandboxStatusUpdated(state, text);
        return true;
      },
      emitSandboxStatsUpdated: function(stats) {
        obj.handleSandboxStatsUpdated(stats);
        return true;
      }
    };
  }

  /**
   * Wires the header and footer actions.
   */
  _bindHeaderActions() {
    document.getElementById('github-button').addEventListener('click', () => this.platform.shell.openExternal('https://github.com/PR-DC/JSLAB'));
    document.getElementById('download-button').addEventListener('click', () => this.platform.shell.openExternal('https://github.com/PR-DC/JSLAB/releases'));
  }

  /**
   * Opens a modal dialog.
   * @param {string} id
   */
  _openDialog(id) {
    if(id == 'paths-container') {
      return this.files._showOpenDialog({ properties: ['openFile', 'multiSelections'] });
    }
    this.main.gui.openDialog($('#' + id));
  }

  /**
   * Public dialog opener used by the web sandbox env.
   * @param {string} id
   */
  openMainDialog(id) {
    this._openDialog(id);
  }

  /**
   * Closes a modal dialog.
   * @param {string} id
   */
  _closeDialog(id) {
    this.main.gui.closeDialog($('#' + id));
  }

  /**
   * Changes the shell language immediately.
   * @param {string} lang
   */
  changeLanguage(lang) {
    this.main.gui.changeLangauge(lang);
  }

  /**
   * Shows documentation output while preserving command input.
   * @param {string} query
   * @returns {Promise<boolean>}
   */
  async showDocumentation(query) {
    var safe_query = String(query || '');
    if(!safe_query.length) {
      return false;
    }
    await this.runtime._evaluateCommand('documentation(' + JSON.stringify(safe_query) + ')', {
      preserve_input: true
    });
    return true;
  }

  /**
   * Refreshes the workspace file list.
   */
  async _refreshWorkspaceList() {
    this.main.file_browser.updateFileBrowser();
  }

  /**
   * Renders workspace values in the existing main-window table style.
   * @param {Object} workspace
   */
  _renderWorkspaceVariables(workspace) {
    this.platform.host.emit('MainWindow', 'set-workspace', Array.isArray(workspace) ? workspace : []);
  }

  /**
   * Sets the virtual current path display.
   * @param {string} path
   */
  _setCurrentPath(path) {
    this.main.folder_navigation.setPath(path);
  }

  /**
   * Adds a command to history.
   * @param {string} cmd
   */
  _pushHistoryCommand(command) {
    this.main.command_history.updateHistory(command);
  }

  /**
   * Handles runtime log messages emitted by the sandbox iframe.
   * @param {string} message
   * @param {string} [level]
   */
  handleSandboxRuntimeLog(message, level) {
    const actions = { clear: 'clear', warn: 'warn', error: 'error', ans: 'show-ans',
      latex: 'disp-latex', monospaced: 'disp-monospaced', muted: 'disp-internal', internal: 'disp-internal' };
    const action = Object.hasOwn(actions, level) ? actions[level] : 'disp';
    this.platform.host.emit('MainWindow', action, message);
  }

  /**
   * Handles workspace updates emitted by the sandbox iframe.
   * @param {Object} workspace
   */
  handleSandboxWorkspaceUpdated(workspace) {
    this._renderWorkspaceVariables(workspace || []);
  }

  /**
   * Handles status updates emitted by the sandbox iframe.
   * @param {string} state
   * @param {string} text
   */
  handleSandboxStatusUpdated(state, text) {
    this._setStatus(state || 'ready', text || '');
  }

  /**
   * Handles stats updates emitted by the sandbox iframe.
   * @param {Object} stats
   */
  handleSandboxStatsUpdated(stats) {
    this._setStats(stats || {});
  }

  /**
   * Returns non-comment history commands in desktop order.
   * @returns {Array<string>}
   */
  _getCommandHistory() {
    return this.main.command_history.history;
  }

  /**
   * Sets command input value and focuses the editor.
   * @param {string} value
   */
  _setCommandInputValue(value) {
    this.code_input.setValue(value);
    this.code_input.focus();
  }

  /**
   * Focuses the command input editor.
   */
  _focusCommandInput() {
    this.code_input.focus();
  }

  /**
   * Opens a terminal dialog panel.
   * @param {HTMLElement} dialog
   */
  _openTerminalDialog(dialog) {
    return this.main.command_window.openTerminalDialog($(dialog));
  }

  /**
   * Closes a terminal dialog panel.
   * @param {HTMLElement} dialog
   */
  _closeTerminalDialog(dialog) {
    return this.main.command_window.closeTerminalDialog($(dialog));
  }

  /**
   * Adds a terminal message entry.
   * @param {string} message_class
   * @param {string} html
   * @param {string} [raw]
   */
  _appendCommandWindowMessage(type, html, raw) {
    return this.main.command_window.addMessage(type, html, raw)[0];
  }

  /**
   * Opens the workspace context menu.
   * @param {string} variable
   * @param {number} left
   * @param {number} top
   */
  _openWorkspaceContextMenu(name, x, y) {
    this.main.workspace.openContextMenu(name, x, y);
  }

  /**
   * Hides the workspace context menu.
   */
  _hideWorkspaceContextMenu() {
    this.main.workspace.hideContextMenu();
  }

  /**
   * Opens the file browser context menu.
   * @param {string} file_path
   * @param {string} kind
   * @param {number} left
   * @param {number} top
   */
  _openFileBrowserContextMenu(path, kind, x, y) {
    this.files._hideFileBrowserImportMenu();
    return this.main.file_browser.openContextMenu(path, kind, x, y);
  }

  /**
   * Hides the file browser context menu.
   */
  _hideFileBrowserContextMenu() {
    return this.main.file_browser.hideContextMenu();
  }

  /**
   * Removes the selected file browser item from workspace storage.
   */
  _removeSelectedWorkspaceFile() {
    return this.main.file_browser.removeSelectedEntry();
  }

  /**
   * Evaluates inspectVariable for the selected workspace symbol.
   */
  _inspectWorkspaceVariable() {
    this.main.workspace.inspectSelectedVariable();
  }

  /**
   * Updates bottom status bar and icon.
   * @param {string} state
   * @param {string} text
   */
  _setStatus(state, text, text_id) {
    this.status_text_id = Number.isInteger(text_id) ? text_id : null;
    this.main.gui.setStatus(state, this.status_text_id ? this.language.string(this.status_text_id) : text);
  }

  /**
   * Updates sandbox stats popup values.
   * @param {Object} stats
   */
  _setStats(stats) {
    this.stats = { ...this.stats, ...stats };
    this.main.gui.setStats(this.stats);
  }

  /**
   * Refreshes shell strings after a language change.
   */
  _onLanguageChange() {
    this.language.update('html');
    this._setCurrentPath(this.current_path || '/workspace/');
    var language_select = document.getElementById('language-select');
    if(language_select) {
      language_select.value = this.language.lang;
    }
    if(this.status_text_id) {
      this.status_cont.textContent = this.language.currentString(this.status_text_id);
    }
    this._setTimestamp();
    this._setAutoscroll();
    this._setWriteTimestamps();
    if(this.window_manager) {
      this.window_manager.windows.forEach(function(win) {
        if(win.iframe && win.iframe.contentWindow &&
            typeof win.iframe.contentWindow.__JSLAB_WEB_FRAME_onLanguageChange == 'function') {
          win.iframe.contentWindow.__JSLAB_WEB_FRAME_onLanguageChange();
          try {
            if(win.iframe.contentDocument && win.iframe.contentDocument.title) {
              win.setTitle(win.iframe.contentDocument.title);
            }
          } catch{}
        }
      });
    }
  }

  /**
   * Exposes common controllers through the existing browser bridge interface.
   */
  _connectMainControllers() {
    const terminal = this.main.command_window;
    const methods = {
      "openInspectorInputDialog": "openInspectorInputDialog",
      "submitInspectorInputDialog": "submitInspectorInputDialog",
      "closeInspectorInputDialog": "closeInspectorInputDialog",
      "escapeInspectorHtml": "escapeInspectorHtml",
      "escapeInspectorAttr": "escapeInspectorAttr",
      "escapeInspectorLocalizedHtml": "escapeInspectorLocalizedHtml",
      "resolveInspectorLocalizedText": "resolveInspectorLocalizedText",
      "buildInspectorStateAttrs": "buildInspectorStateAttrs",
      "getInspectorColumnLabel": "getInspectorColumnLabel",
      "renderInspectorToolbar": "renderInspectorToolbar",
      "renderInspectorTable": "renderInspectorTable",
      "renderInspectorContent": "renderInspectorContent",
      "renderInspector": "renderInspector",
      "showInspector": "showInspector",
      "getInspectorStateFromElement": "getInspectorStateFromElement",
      "normalizeInspectorState": "normalizeInspectorState",
      "buildInspectCommand": "buildInspectCommand",
      "runInspectCommand": "runInspectCommand",
      "runTableInspectorAction": "runTableInspectorAction",
      "handleTableInspectorAction": "handleTableInspectorAction",
      "handleInspectorAction": "handleInspectorAction",
      "editInspectorCell": "editInspectorCell",
      "_scheduleConsolePreview": "scheduleConsolePreview",
      "_initLiveExpressions": "initLiveExpressions",
      "_renderLiveExpressions": "renderLiveExpressions",
      "_saveLiveExpressions": "saveLiveExpressions",
      "_updateLiveExpressions": "updateLiveExpressions",
      "_initConsoleTools": "initConsoleTools",
      "_openConsoleTools": "openConsoleTools",
      "_closeConsoleTools": "closeConsoleTools",
      "_toggleConsoleTools": "toggleConsoleTools",
      "_applyConsoleFilter": "applyConsoleFilter",
      "_navigateConsoleFilter": "navigateConsoleFilter",
      "_focusConsoleFilterMatch": "focusConsoleFilterMatch",
      "_resetHistoryIndex": "resetHistoryIndex",
      "_setTimestamp": "setTimestamp",
      "_setAutoscroll": "setAutoscroll",
      "_setNMessagesMax": "setNMessagesMax",
      "_setWriteTimestamps": "setWriteTimestamps",
      "_saveLog": "saveLog",
      "_scrollToBottom": "scrollToBottom",
      "_getTimestamp": "getTimestamp",
      "_prettyPrint": "prettyPrint",
      "_highlightCode": "highlightCode",
      "_truncateStrings": "truncateStrings",
      "_isAnsScalarValue": "isAnsScalarValue",
      "_formatAnsScalarValue": "formatAnsScalarValue",
      "_getAnsVectorValues": "getAnsVectorValues",
      "_getAnsMatrixValues": "getAnsMatrixValues",
      "_renderHorizontalVectorAns": "renderHorizontalVectorAns",
      "_renderSmallMatrixAns": "renderSmallMatrixAns",
      "_createConsoleValueElement": "createConsoleValueElement",
      "_renderConsolePropertyPage": "renderConsolePropertyPage",
      "_expandConsoleDescendants": "expandConsoleDescendants",
      "_clearConsole": "clear",
      "_appendLatexMessage": "messageLatex",
      "_renderWelcomeMessage": "renderWelcomeMessage"
    };
    for(const [alias, name] of Object.entries(methods)) {
      Object.defineProperty(this, alias, { configurable: true, get: () => terminal[name], set: value => {
        terminal[name] = value;
      } });
    }
    const fields = {
      "code_input": "code_input",
      "code_doc_hover": "code_doc_hover",
      "command_log": "log",
      "autoscroll": "autoscroll",
      "show_timestamp": "show_timestamp",
      "write_timestamps": "write_timestamps",
      "N_messages_max": "N_messages_max",
      "min_messages_max": "min_messages_max",
      "command_history_index": "i_history",
      "console_preview": "console_preview",
      "live_expressions": "live_expressions",
      "console_filter": "console_filter",
      "inspector_dialog_resolver": "inspector_dialog_resolver"
    };
    for(const [alias, name] of Object.entries(fields)) {
      Object.defineProperty(this, alias, { configurable: true, get: () => terminal[name], set: value => {
        terminal[name] = value;
      } });
    }
    for(const [alias, owner, name] of [
      ['workspace_state', this.main.workspace, 'data'], ['history', this.main.command_history, 'full_history'],
      ['history_max', this.main.command_history, 'N_history_max'], ['current_path', this.main.folder_navigation, 'current_path'],
      ['workspace_context_variable', this.main.workspace, 'context_variable'], ['stats', this.main.gui, 'stats'], ['file_tree_expanded_paths', this.main.file_browser, 'expanded_paths'], ['file_browser_context_path', this.main.file_browser, 'context_path'], ['file_browser_context_kind', this.main.file_browser, 'context_kind']]) {
      Object.defineProperty(this, alias, { configurable: true, get: () => owner[name], set: value => {
        owner[name] = value;
      } });
    }
    for(const name of Object.keys(terminal).filter(name => /^(console_|live_)/.test(name))) {
      if(!Object.getOwnPropertyDescriptor(this, name)?.get) {
        Object.defineProperty(this, name, { configurable: true, get: () => terminal[name], set: value => {
          terminal[name] = value;
        } });
      }
    }
    Object.defineProperty(this, 'status_popup_visible', { get: () => !!this.main.flight_commands_popup.visible });
    this.panels = this.main.panels;
  }


  /**
 * Interrupts only a browser scientific execution owned by Assistant.
 */
  async _interruptAssistantExecution() {
    if(this.assistant_execution && this.worker_debugger?.state === 'running') {
      await this.worker_debugger.interrupt();
    }
  }

  /**
 * Reads main-window context directly from its common controller.
 */
  _readMainAssistantContext() {
    return this.main.getAssistantContext();
  }

  /**
 * Reads Editor context from the managed document's common controller.
 */
  _readEditorAssistantContext() {
    return this._getAssistantEditor()?.getAssistantContext() || null;
  }

  /**
 * Returns the common Editor controller within its browser surface.
 */
  _getAssistantEditor() {
    return this.window_manager.windows.get(this.editor_window_id)?.iframe.contentWindow?.win_editor;
  }

  /**
 * Runs Assistant code on the existing browser scientific worker.
 */
  async _evaluateAssistantCode(code) {
    if(this.main.evaluating) {
      throw Error(this.language.currentString(631));
    }
    this.assistant_execution = true;
    try {
      const result = await this.runtime._executeCode(code);
      if(!result.success) {
        throw Error(result.error || 'JSLAB operation failed.');
      }
      return result;
    } finally {
      this.assistant_execution = false;
    }
  }

  /**
 * Reads the shared runtime's documentation without starting an execution.
 */
  _readAssistantHelp(query, type) {
    return this.ui_sandbox_api.getHelp(query, type);
  }

  /**
 * Opens or focuses the browser Editor and validates workspace paths.
 */
  async _openAssistantEditor(file_path) {
    if(file_path) {
      if(!this.fs.existsFileSync(file_path)) {
        throw Error('Editor file does not exist.');
      }
      await this.windows._openEditorWindow(file_path);
    } else {
      this.windows.focusFeatureWindow(this.windows._ensureEditorWindow());
    }
    return true;
  }

  /**
 * Applies an approved edit through the common Editor controller.
 */
  _replaceAssistantSelection(text) {
    const editor = this._getAssistantEditor();
    if(!editor) {
      throw Error('No active Editor document.');
    }
    if(!globalThis.confirm(this.language.currentString(660))) {
      return { applied: false };
    }
    editor.replaceAssistantSelection(text);
    this.window_manager.focus(this.editor_window_id);
    return { applied: true };
  }
}

exports.PRDC_JSLAB_WEB_APP_HOST = PRDC_JSLAB_WEB_APP_HOST;
