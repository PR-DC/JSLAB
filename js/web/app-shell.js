/**
 * @file Browser shell scaffold for JSLAB web
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var { PRDC_JSLAB_WEB_FS } = require('./storage/opfs-fs');
var { PRDC_JSLAB_WEB_TASKBAR } = require('./taskbar');
var { PRDC_JSLAB_WEB_WINDOW_MANAGER } = require('./window-manager');
var { PRDC_JSLAB_WEB_METADATA_STORE } = require('./storage/metadata-store');
var { PRDC_JSLAB_WEB_IMPORT_EXPORT } = require('./storage/import-export');
var { PRDC_JSLAB_WEB_PANELS } = require('./panels');
var { PRDC_JSLAB_WEB_LANGUAGE } = require('./language');
var { createCodeMirrorLintOptions } = require('./eslint');
var { PRDC_JSLAB_CODE_DOC_HOVER } = require('../code/doc-hover');
var { BigJsonViewerDom } = require('big-json-viewer');
var { PRDC_APP_CONFIG } = require('../../config/config');

var app_config = new PRDC_APP_CONFIG();

/**
 * Escapes text for HTML insertion.
 * @param {*} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class PRDC_JSLAB_WEB_APP_SHELL {

  constructor() {
    this.fs = new PRDC_JSLAB_WEB_FS();
    this.metadata = new PRDC_JSLAB_WEB_METADATA_STORE('jslab-web');
    this.language = new PRDC_JSLAB_WEB_LANGUAGE(this.metadata);
    this.panels = new PRDC_JSLAB_WEB_PANELS(this.metadata);
    this.sandbox_frame = null;
    this.sandbox_frame_url = null;
    this.sandbox_api = null;
    this.window_manager = null;
    this.bridge = null;
    this.local_save_targets = {};
    this.local_save_target_id = 0;
    this.workspace_state = [];
    this.current_path = '/workspace/';
    this.editor_window_id = 'jslab-web-editor';
    this.history = this.metadata.get('full_history', []);
    if(!Array.isArray(this.history)) {
      this.history = [];
    }
    this.history_max = Number(this.metadata.get('N_history_max', 20));
    if(!isFinite(this.history_max) || this.history_max < 5) {
      this.history_max = 20;
    }
    this.command_history_index = -1;
    this.session_user = 'browser@local';
    this.autoscroll = this.metadata.get('autoscroll', true) !== false;
    this.show_timestamp = this.metadata.get('show_timestamp', false) === true;
    this.write_timestamps = this.metadata.get('write_timestamps', true) !== false;
    this.N_messages_max = this.metadata.get('N_messages_max', 'Infinity');
    if(this.N_messages_max === 'Infinity') {
      this.N_messages_max = Infinity;
    } else {
      this.N_messages_max = Number(this.N_messages_max);
      if(!isFinite(this.N_messages_max) || this.N_messages_max < 5) {
        this.N_messages_max = Infinity;
      }
    }
    this.min_messages_max = 5;
    this.command_log = [];
    this.stats = {
      required_modules: 0,
      promises: 0,
      timeouts: 0,
      immediates: 0,
      intervals: 0,
      animation_frames: 0,
      idle_callbacks: 0
    };
    this.status_popup_visible = false;
    this.status_text_id = 87;
    this.runtime_info = this._detectRuntimeInfo();

    this.status_cont = document.getElementById('status');
    this.stats_icon = document.getElementById('sandbox-stats-icon');
    this.file_browser_cont = document.getElementById('file-browser-cont');
    this.variable_table = document.getElementById('workspace-variable-table');
    this.console_messages = document.getElementById('command-window-messages');
    this.command_panel = document.getElementById('command-window');
    this.command_input = document.getElementById('command-window-input');
    this.code_input = null;
    this.code_doc_hover = null;
    this.file_picker = document.getElementById('file-picker');
    this.folder_picker = document.getElementById('folder-picker');
    this.history_cont = document.getElementById('command-history');
    this.workspace_search = document.getElementById('workspace-search');
    this.workspace_path_input = document.getElementById('workspace-path-input');
    this.current_address = document.getElementById('workspace-current-address');
    this.command_settings_dialog = document.getElementById('command-window-settings');
    this.command_log_dialog = document.getElementById('command-window-log');
    this.command_history_dialog = document.getElementById('command-window-history');
    this.command_history_list = document.getElementById('command-window-history-list');
    this.inspector_input_dialog = document.getElementById('inspector-input-container');
    this.inspector_input_title = document.getElementById('inspector-input-title');
    this.inspector_input_message = document.getElementById('inspector-input-message');
    this.inspector_input_label_1 = document.getElementById('inspector-input-label-1');
    this.inspector_input_label_2 = document.getElementById('inspector-input-label-2');
    this.inspector_input_field_1 = document.getElementById('inspector-input-field-1');
    this.inspector_input_field_2 = document.getElementById('inspector-input-field-2');
    this.inspector_input_row_2 = document.getElementById('inspector-input-row-2');
    this.inspector_input_cancel = document.getElementById('inspector-input-cancel');
    this.inspector_input_submit = document.getElementById('inspector-input-submit');
    this.inspector_dialog_resolver = undefined;
    this.workspace_context_menu = document.getElementById('workspace-context-menu');
    this.workspace_context_variable = undefined;
    this.file_browser_context_menu = document.getElementById('file-browser-context-menu');
    this.file_browser_context_path = undefined;
    this.file_browser_context_kind = undefined;
    this.file_browser_import_menu = document.getElementById('file-browser-import-menu');
    this.file_tree_expanded_paths = new Set();

    globalThis.language = this.language;
    this.language.setOnLanguageChange(() => {
      this._onLanguageChange();
    });
  }

  /**
   * Starts the browser shell.
   */
  async start() {
    this.bridge = this._createBridge();
    globalThis.__JSLAB_WEB_BRIDGE__ = this.bridge;
    globalThis.__JSLAB_WEB_RUNTIME_INFO__ = this.getRuntimeInfo();
    this.language.update('html');
    this._initCommandWindow();
    this._bindHeaderActions();
    this._bindImportActions();
    this._bindCommandActions();
    this._bindGlobalShortcuts();
    this._bindWorkspaceFilter();
    this._bindDialogs();
    this._bindInspectorHandlers();
    this._bindStatusPopup();
    this._bindHistory();

    var taskbar = new PRDC_JSLAB_WEB_TASKBAR(document.getElementById('taskbar'));
    this.window_manager = new PRDC_JSLAB_WEB_WINDOW_MANAGER({
      container: document.getElementById('window-layer'),
      taskbar: taskbar,
      onStateChange: (windows) => {
        this.metadata.set('window-state', windows);
      }
    });
    this.panels.attach();

    await this.fs.init();
    this._refreshRuntimeInfo();
    globalThis.__JSLAB_WEB_RUNTIME_INFO__ = this.getRuntimeInfo();
    this._setCurrentPath('/workspace/');
    this._setStatus('ready', '', 87);
    this._setStats(this.stats);
    this._renderHistory();
    this._renderWelcomeMessage();
    this._pushHistoryComment('// JSLAB ' + (globalThis.__JSLAB_WEB_APP_VERSION__ || '') + ', ' + new Date() + ' [' + this.session_user + ']');
    await this._refreshWorkspaceList();
    await this._startSandbox();
    await this._handleStartupOpenUrls();
  }

  /**
   * Creates the explicit same-origin bridge used by web frames and sandbox.
   * @returns {Object}
   */
  _createBridge() {
    var obj = this;
    return {
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
        return obj.getRuntimeInfo();
      },
      getRuntimeCapability: function(name) {
        return obj.getRuntimeCapability(name);
      },
      buildShareLink: function(file_url) {
        return obj._buildShareLink(file_url);
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
      runEditorCode: function(code, label) {
        return obj.runEditorCode(code, label);
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
      openEditorFile: function(file_path, lineno) {
        return obj._openEditorWindow(file_path, lineno);
      },
      createUntitledEditorFile: function() {
        return obj._openNewEditorWindow();
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
        return obj._showSaveDialog(options);
      },
      showOpenDialog: function(options) {
        return obj._showOpenDialog(options);
      },
      showSaveDialogSync: function() {
        return false;
      },
      saveLocalFile: function(target, data, options) {
        return obj._saveLocalFile(target, data, options);
      },
      svgToPdf: function(svg_data, width, height, fonts) {
        return obj._svgToPdf(svg_data, width, height, fonts);
      },
      downloadLocalFileSync: function(file_path, data, options) {
        return obj._downloadLocalFileSync(file_path, data, options);
      },
      getAppAssetSync: function(asset_path) {
        return obj.getAppAssetSync(asset_path);
      },
      openManagedWindow: function(wid, file) {
        return obj.openManagedWindow(wid, file);
      },
      closeManagedWindow: function(wid, options) {
        return obj.closeManagedWindow(wid, options);
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
        var frame_win = obj._findManagedWindowByContentWindow(frame_window);
        if(!frame_win) {
          return false;
        }
        frame_win.setTitle(String(title || ''));
        return true;
      },
      closeFrameWindow: function(frame_window, options) {
        var frame_win = obj._findManagedWindowByContentWindow(frame_window);
        if(!frame_win) {
          return false;
        }
        return obj.closeManagedWindow(frame_win.id, options);
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
   * Starts the shared sandbox inside a hidden same-origin iframe.
   */
  async _startSandbox() {
    var obj = this;
    this._setStatus('busy', 'Starting sandbox...');

    if(this.sandbox_frame) {
      this.sandbox_frame.remove();
      this.sandbox_frame = null;
      this.sandbox_api = null;
    }
    this.sandbox_frame_url = null;

    var frame = document.getElementById('sandbox-frame');
    if(!frame) {
      frame = document.createElement('iframe');
      frame.id = 'sandbox-frame';
      frame.className = 'web-hidden-frame';
      document.body.appendChild(frame);
    }

    await new Promise(function(resolve, reject) {
      var attempts = 0;
      frame.removeAttribute('src');
      frame.srcdoc = obj._createSandboxHtml();
      (function waitForSandboxApi() {
        attempts += 1;
        try {
          obj.sandbox_api = frame.contentWindow && frame.contentWindow.__JSLAB_WEB_SANDBOX__;
        } catch(err) {
          if(attempts >= 80) {
            reject(err);
            return;
          }
          setTimeout(waitForSandboxApi, 25);
          return;
        }
        try {
          if(frame.contentWindow &&
              frame.contentWindow.__JSLAB_WEB_SANDBOX_BOOT_ERROR__) {
            reject(new Error(String(frame.contentWindow.__JSLAB_WEB_SANDBOX_BOOT_ERROR__)));
            return;
          }
        } catch(err) {
          if(attempts >= 80) {
            reject(err);
            return;
          }
        }
        if(obj.sandbox_api) {
          resolve();
          return;
        }
        if(attempts >= 80) {
          reject(new Error('Sandbox frame API is not available.'));
          return;
        }
        setTimeout(waitForSandboxApi, 25);
      })();
    });

    this.sandbox_frame = frame;
    if(document && document.body) {
      document.body.dataset.jslabWebSandboxReady = 'true';
      delete document.body.dataset.jslabWebSandboxError;
    }

    var handshake = this.sandbox_api.handshake();
    this._setStatus('ready', '', 87);
    this._renderWorkspaceVariables(handshake.workspace || []);
  }

  /**
   * Wires the header and footer actions.
   */
  _bindHeaderActions() {
    document.getElementById('editor-menu').addEventListener('click', async () => {
      await this._openNewEditorWindow();
    });

    document.getElementById('help-menu').addEventListener('click', () => {
      this._openDialog('help-container');
    });

    document.getElementById('info-menu').addEventListener('click', () => {
      this._openDialog('info-container');
    });

    document.getElementById('settings-menu').addEventListener('click', () => {
      this._openDialog('settings-container');
    });

    document.getElementById('github-button').addEventListener('click', function() {
      globalThis.open('https://github.com/PR-DC/JSLAB', '_blank', 'noopener');
    });

    document.getElementById('download-button').addEventListener('click', function() {
      globalThis.open('https://github.com/PR-DC/JSLAB/releases', '_blank', 'noopener');
    });

    document.addEventListener('keydown', (e) => {
      if(e.ctrlKey && e.key.toLowerCase() == 'h') {
        this._openDialog('help-container');
        e.preventDefault();
      } else if(e.ctrlKey && e.key.toLowerCase() == 'i') {
        this._openDialog('info-container');
        e.preventDefault();
      } else if(e.ctrlKey && e.key.toLowerCase() == 's') {
        this._openDialog('settings-container');
        e.preventDefault();
      }
    });
  }

  /**
   * Wires import pickers.
   */
  _bindImportActions() {
    document.getElementById('file-browser-import-button').addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this._openFileBrowserImportMenu(event.currentTarget);
    });
    document.getElementById('file-browser-import-url-button').addEventListener('click', async() => {
      await this._promptImportUrl();
    });

    this.file_picker.addEventListener('change', async () => {
      await this._importSelection(this.file_picker.files);
    });

    this.folder_picker.addEventListener('change', async () => {
      await this._importSelection(this.folder_picker.files);
    });
  }

  /**
   * Wires command panel actions.
   */
  _bindCommandActions() {
    document.getElementById('command-window-input-submit-cont').addEventListener('click', async () => {
      await this._runCommand();
    });

    document.getElementById('clear-console-button').addEventListener('click', () => {
      this._clearConsole();
    });

    document.getElementById('to-bottom-button').addEventListener('click', () => {
      this._scrollConsoleToBottom(true);
      this._focusCommandInput();
    });

    document.getElementById('command-window-settings-button').addEventListener('click', () => {
      this._openTerminalDialog(this.command_settings_dialog);
    });

    document.getElementById('command-window-timestamp-button').addEventListener('click', () => {
      this.show_timestamp = !this.show_timestamp;
      this._setTimestamp();
    });

    document.getElementById('command-window-autoscroll-button').addEventListener('click', () => {
      this.autoscroll = !this.autoscroll;
      this._setAutoscroll();
    });

    document.getElementById('command-window-log-button').addEventListener('click', () => {
      this._openTerminalDialog(this.command_log_dialog);
    });

    this.command_panel.addEventListener('click', (event) => {
      if(event.target === this.command_panel) {
        this._focusCommandInput();
      }
    });

    document.getElementById('command-window-input-container').addEventListener('click', (event) => {
      if(event.target === event.currentTarget) {
        this._focusCommandInput();
      }
    });

    document.addEventListener('keydown', (event) => {
      if(event.ctrlKey && event.key.toLowerCase() == 'f') {
        this._scrollConsoleToBottom();
        this._focusCommandInput();
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }

  /**
   * Wires capture-level keyboard shortcuts so the browser does not steal them.
   */
  _bindGlobalShortcuts() {
    document.addEventListener('keydown', async(event) => {
      await this._handleGlobalShortcut(event);
    }, true);
  }

  /**
   * Handles top-level shell shortcuts before the browser default action runs.
   * @param {KeyboardEvent} event
   */
  async _handleGlobalShortcut(event) {
    var key = String(event.key || '').toLowerCase();
    var command_input_focused = this._isCommandInputFocused();

    if(command_input_focused && this._isCommandWindowShortcutEvent(event)) {
      await this._handleCommandInputKeyDown(event);
      if(event.defaultPrevented) {
        event.stopImmediatePropagation();
      }
      return;
    }

    if(event.ctrlKey && !event.altKey && !event.shiftKey) {
      if(key == 'f') {
        this._scrollConsoleToBottom();
        this._focusCommandInput();
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if(key == 'h') {
        this._openDialog('help-container');
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if(key == 'd') {
        event.preventDefault();
        event.stopImmediatePropagation();
        await this._evaluateCommand('openDoc()');
        return;
      }
      if(key == 'l') {
        this._openTerminalDialog(this.command_log_dialog);
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if(key == 's') {
        this._openDialog('settings-container');
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if(key == 'i') {
        this._openDialog('info-container');
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
  }

  /**
   * Returns true when the command input currently owns focus.
   * @returns {boolean}
   */
  _isCommandInputFocused() {
    return Boolean(this.code_input &&
      typeof this.code_input.hasFocus == 'function' &&
      this.code_input.hasFocus());
  }

  /**
   * Returns true for command-window shortcuts handled by the CodeMirror input.
   * @param {KeyboardEvent} event
   * @returns {boolean}
   */
  _isCommandWindowShortcutEvent(event) {
    var key = String(event.key || '').toLowerCase();
    if(key == 'escape' || key == 'arrowup' || key == 'arrowdown' ||
        key == 'pageup' || key == 'pagedown' ||
        key == 'f3' || key == 'f7' || key == 'f8') {
      return true;
    }
    return event.ctrlKey && !event.altKey && !event.shiftKey &&
      (key == 's' || key == 'l');
  }

  /**
   * Wires workspace filtering.
   */
  _bindWorkspaceFilter() {
    this.workspace_search.addEventListener('input', () => {
      this._renderWorkspaceVariables(this.workspace_state);
    });

    this.workspace_search.addEventListener('keydown', (event) => {
      if(event.key == 'Escape' && this.workspace_search.value.length) {
        this.workspace_search.value = '';
        this._renderWorkspaceVariables(this.workspace_state);
        event.preventDefault();
      }
    });

    document.getElementById('clear-workspace-search').addEventListener('click', async () => {
      if(this.sandbox_api && typeof this.sandbox_api.clearWorkspace == 'function') {
        this._renderWorkspaceVariables(await this.sandbox_api.clearWorkspace());
      }
    });
  }

  /**
   * Wires modal dialog behavior.
   */
  _bindDialogs() {
    var obj = this;
    [
      ['help-close', 'help-container'],
      ['info-close', 'info-container'],
      ['settings-close', 'settings-container']
    ].forEach(function(entry) {
      var button = document.getElementById(entry[0]);
      if(button) {
        button.addEventListener('click', function() {
          obj._closeDialog(entry[1]);
        });
      }
      var dialog = document.getElementById(entry[1]);
      if(dialog) {
        dialog.addEventListener('keydown', function(e) {
          if(e.key == 'Escape') {
            obj._closeDialog(entry[1]);
            e.preventDefault();
            e.stopPropagation();
          }
        });
      }
    });

    document.getElementById('settings-apply-button').addEventListener('click', () => {
      this._applySettings();
    });
    document.getElementById('language-select').addEventListener('change', (event) => {
      this.changeLanguage(event.target.value);
    });
    document.getElementById('language-select').value = this.language.lang;
    document.getElementById('history-max-input').value = String(this.history_max);

    if(this.command_settings_dialog) {
      this.command_settings_dialog.addEventListener('keydown', function(e) {
        if(e.key == 'Escape') {
          obj._closeTerminalDialog(obj.command_settings_dialog);
          e.preventDefault();
          e.stopPropagation();
        }
      });
      var settings_close = this.command_settings_dialog.querySelector('.options-close');
      if(settings_close) {
        settings_close.addEventListener('click', function() {
          obj._closeTerminalDialog(obj.command_settings_dialog);
        });
      }
      document.getElementById('command-window-settings-apply').addEventListener('click', function() {
        obj._closeTerminalDialog(obj.command_settings_dialog);
        var value = document.getElementById('command-window-messages-max-input').value.trim();
        obj.N_messages_max = /^inf(?:inity)?$/i.test(value) || !value.length ? Infinity : Number(value);
        obj._setNMessagesMax();
      });
    }

    if(this.command_log_dialog) {
      this.command_log_dialog.addEventListener('keydown', function(e) {
        if(e.key == 'Escape') {
          obj._closeTerminalDialog(obj.command_log_dialog);
          e.preventDefault();
          e.stopPropagation();
        }
      });
      var log_close = this.command_log_dialog.querySelector('.options-close');
      if(log_close) {
        log_close.addEventListener('click', function() {
          obj._closeTerminalDialog(obj.command_log_dialog);
        });
      }
      document.getElementById('command-window-write-timestamps').addEventListener('click', function() {
        obj.write_timestamps = this.checked;
        obj._setWriteTimestamps();
      });
      document.getElementById('command-window-save-log').addEventListener('click', function() {
        obj._closeTerminalDialog(obj.command_log_dialog);
        obj._saveLog();
      });
    }

    if(this.command_history_dialog) {
      this.command_history_dialog.addEventListener('keydown', function(e) {
        obj._handleHistoryDialogKeyDown(e);
      });
      var history_close = this.command_history_dialog.querySelector('.history-close');
      if(history_close) {
        history_close.addEventListener('click', function() {
          obj._closeTerminalDialog(obj.command_history_dialog);
        });
      }
    }

    if(this.inspector_input_dialog) {
      this.inspector_input_dialog.addEventListener('keydown', function(e) {
        if(e.key == 'Escape') {
          obj.closeInspectorInputDialog(null);
          e.preventDefault();
          e.stopPropagation();
        } else if(e.key == 'Enter' && !e.shiftKey) {
          obj.submitInspectorInputDialog();
          e.preventDefault();
          e.stopPropagation();
        }
      });
      var inspector_close = document.getElementById('inspector-input-close');
      if(inspector_close) {
        inspector_close.addEventListener('click', function() {
          obj.closeInspectorInputDialog(null);
        });
      }
      var inspector_cancel = document.getElementById('inspector-input-cancel');
      if(inspector_cancel) {
        inspector_cancel.addEventListener('click', function() {
          obj.closeInspectorInputDialog(null);
        });
      }
      if(this.inspector_input_submit) {
        this.inspector_input_submit.addEventListener('click', function() {
          obj.submitInspectorInputDialog();
        });
      }
    }

    if(this.workspace_context_menu) {
      document.getElementById('workspace-context-inspect').addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        await obj._inspectWorkspaceVariable();
      });
      document.addEventListener('click', function(e) {
        if(obj.workspace_context_menu.style.display === 'none') {
          return;
        }
        if(!obj.workspace_context_menu.contains(e.target)) {
          obj._hideWorkspaceContextMenu();
        }
      });
      document.addEventListener('keydown', function(e) {
        if(e.key == 'Escape') {
          obj._hideWorkspaceContextMenu();
        }
      });
      document.getElementById('workspace').addEventListener('scroll', function() {
        obj._hideWorkspaceContextMenu();
      });
    }

    if(this.file_browser_context_menu) {
      document.getElementById('file-browser-context-remove').addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        await obj._removeSelectedWorkspaceFile();
      });
      document.addEventListener('click', function(e) {
        if(obj.file_browser_context_menu.style.display === 'none') {
          return;
        }
        if(!obj.file_browser_context_menu.contains(e.target)) {
          obj._hideFileBrowserContextMenu();
        }
      });
      document.addEventListener('keydown', function(e) {
        if(e.key == 'Escape') {
          obj._hideFileBrowserContextMenu();
        }
      });
      document.getElementById('file-browser').addEventListener('scroll', function() {
        obj._hideFileBrowserContextMenu();
      });
    }

    if(this.file_browser_import_menu) {
      document.getElementById('file-browser-import-files-action').addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        await obj._importFilesFromPicker();
      });
      document.getElementById('file-browser-import-folder-action').addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        await obj._importFolderFromPicker();
      });
      document.addEventListener('click', function(e) {
        if(obj.file_browser_import_menu.style.display === 'none') {
          return;
        }
        if(!obj.file_browser_import_menu.contains(e.target) &&
            e.target.id != 'file-browser-import-button') {
          obj._hideFileBrowserImportMenu();
        }
      });
      document.addEventListener('keydown', function(e) {
        if(e.key == 'Escape') {
          obj._hideFileBrowserImportMenu();
        }
      });
      document.getElementById('file-browser').addEventListener('scroll', function() {
        obj._hideFileBrowserImportMenu();
      });
    }
  }

  /**
   * Opens a modal dialog.
   * @param {string} id
   */
  _openDialog(id) {
    document.querySelectorAll('.main-dialog').forEach(function(dialog) {
      dialog.style.display = 'none';
    });
    var dialog = document.getElementById(id);
    if(dialog) {
      dialog.style.display = 'block';
      dialog.focus();
    }
    if(id == 'paths-container') {
      if(this.runtime_info.supports_open_picker) {
        this._showOpenDialog({
          title: this.language.currentString(141),
          buttonLabel: this.language.currentString(142),
          properties: ['openFile', 'multiSelections']
        }).catch(function(err) {
          console.error(err);
        });
      } else {
        PRDC_JSLAB_WEB_IMPORT_EXPORT.openPicker(this.file_picker);
      }
      return;
    } else if(id == 'settings-container') {
      document.getElementById('language-select').value = this.language.lang;
      document.getElementById('history-max-input').value = String(this.history_max);
    }
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
    var dialog = document.getElementById(id);
    if(dialog) {
      dialog.style.display = 'none';
    }
  }

  /**
   * Binds inspector toolbar and cell handlers inside command output.
   */
  _bindInspectorHandlers() {
    var obj = this;
    this.console_messages.addEventListener('click', function(e) {
      var action_el = e.target.closest('.jslab-inspector-action');
      if(action_el && obj.console_messages.contains(action_el)) {
        e.preventDefault();
        e.stopPropagation();
        obj.handleInspectorAction(action_el).catch(function(err) {
          var msg = err && err.stack ? err.stack : String(err);
          obj.handleSandboxRuntimeLog('@inspector/action: ' + msg, 'error');
        });
      }
    });

    this.console_messages.addEventListener('dblclick', function(e) {
      var cell_el = e.target.closest('.jslab-inspector-cell-editable');
      if(cell_el && obj.console_messages.contains(cell_el)) {
        e.preventDefault();
        e.stopPropagation();
        obj.editInspectorCell(cell_el).catch(function(err) {
          var msg = err && err.stack ? err.stack : String(err);
          obj.handleSandboxRuntimeLog('@inspector/edit: ' + msg, 'error');
        });
      }
    });
  }

  /**
   * Opens inspector input dialog and resolves entered values.
   * @param {Object} [options]
   * @returns {Promise<Object|null>}
   */
  openInspectorInputDialog(options) {
    var obj = this;
    return new Promise(function(resolve) {
      var fields = options && Array.isArray(options.fields) ? options.fields : [];
      var field_1 = fields[0] || {};
      var field_2 = fields[1];
      var hide_cancel = options && options.hide_cancel === true;
      var has_message = !!(options && options.message);

      if(obj.inspector_dialog_resolver) {
        obj.closeInspectorInputDialog(null);
      }

      obj.inspector_input_title.innerHTML = typeof options.title == 'string'
        ? options.title
        : obj.language.currentString(388);
      obj.inspector_input_message.innerHTML = options && options.message ? options.message : '';
      obj.inspector_input_message.style.display = has_message ? '' : 'none';

      obj.inspector_input_label_1.innerHTML = field_1.label || '';
      obj.inspector_input_field_1.value = typeof field_1.value == 'string' ? field_1.value : '';
      obj.inspector_input_field_1.setAttribute('placeholder', ' ');
      obj.inspector_input_field_1.setAttribute('title', field_1.placeholder || '');

      if(field_2) {
        obj.inspector_input_label_2.innerHTML = field_2.label || '';
        obj.inspector_input_field_2.value = typeof field_2.value == 'string' ? field_2.value : '';
        obj.inspector_input_field_2.setAttribute('placeholder', ' ');
        obj.inspector_input_field_2.setAttribute('title', field_2.placeholder || '');
        obj.inspector_input_row_2.style.display = '';
      } else {
        obj.inspector_input_label_2.innerHTML = '';
        obj.inspector_input_field_2.value = '';
        obj.inspector_input_field_2.setAttribute('placeholder', ' ');
        obj.inspector_input_field_2.setAttribute('title', '');
        obj.inspector_input_row_2.style.display = 'none';
      }

      obj.inspector_input_submit.innerHTML = typeof options.submit_label == 'string'
        ? options.submit_label
        : obj.language.currentString(391);
      obj.inspector_input_cancel.style.display = hide_cancel ? 'none' : '';
      obj.inspector_dialog_resolver = resolve;
      obj._openDialog('inspector-input-container');
      setTimeout(function() {
        obj.inspector_input_field_1.focus();
        obj.inspector_input_field_1.select();
      }, 0);
    });
  }

  /**
   * Submits the open inspector input dialog.
   */
  submitInspectorInputDialog() {
    var values = [];
    if(!this.inspector_dialog_resolver) {
      return;
    }
    values.push(String(this.inspector_input_field_1.value || ''));
    if(this.inspector_input_row_2.style.display != 'none') {
      values.push(String(this.inspector_input_field_2.value || ''));
    }
    this.closeInspectorInputDialog({ values: values });
  }

  /**
   * Closes inspector input dialog and resolves pending promise.
   * @param {Object|null} result
   */
  closeInspectorInputDialog(result) {
    var resolve = this.inspector_dialog_resolver;
    if(!resolve) {
      return;
    }
    this.inspector_dialog_resolver = undefined;
    this._closeDialog('inspector-input-container');
    this._focusCommandInput();
    resolve(result || null);
  }

  /**
   * Escapes text for safe inspector HTML rendering.
   * @param {*} value
   * @returns {string}
   */
  escapeInspectorHtml(value) {
    return escapeHtml(value);
  }

  /**
   * Escapes text for safe inspector attribute rendering.
   * @param {*} value
   * @returns {string}
   */
  escapeInspectorAttr(value) {
    return this.escapeInspectorHtml(value)
      .replace(/\r/g, '&#13;')
      .replace(/\n/g, '&#10;');
  }

  /**
   * Preserves language wrappers produced by translated HTML strings.
   * @param {*} value
   * @returns {string}
   */
  escapeInspectorLocalizedHtml(value) {
    return this.escapeInspectorHtml(value)
      .replace(/&lt;lang class=&quot;([a-zA-Z0-9_-]+)&quot;&gt;/g, '<lang class="$1">')
      .replace(/&lt;lang class=&#39;([a-zA-Z0-9_-]+)&#39;&gt;/g, '<lang class="$1">')
      .replace(/&lt;\/lang&gt;/g, '</lang>');
  }

  /**
   * Resolves localized HTML wrappers to plain text.
   * @param {*} value
   * @returns {string}
   */
  resolveInspectorLocalizedText(value) {
    var container = document.createElement('div');
    container.innerHTML = this.escapeInspectorLocalizedHtml(value);
    var active_node = container.querySelector('lang.' + this.language.lang);
    if(active_node) {
      return active_node.textContent || '';
    }
    var first_node = container.querySelector('lang');
    if(first_node) {
      return first_node.textContent || '';
    }
    return container.textContent || '';
  }

  /**
   * Builds inspector state data attributes.
   * @param {Object} state
   * @returns {string}
   */
  buildInspectorStateAttrs(state) {
    var variable = state && typeof state.variable == 'string' ? state.variable : '';
    var view = state && typeof state.view == 'string' ? state.view : '';
    var state_sort_by = state && typeof state.state_sort_by == 'string' ? state.state_sort_by : '';
    var state_sort_dir = state && state.state_sort_dir == 'desc' ? 'desc' : 'asc';
    var state_filter = state && typeof state.state_filter == 'string' ? state.state_filter : '';
    var state_filter_expr = state && typeof state.state_filter_expr == 'string' ? state.state_filter_expr : '';
    return ' data-variable="' + this.escapeInspectorAttr(variable) + '"' +
      ' data-view="' + this.escapeInspectorAttr(view) + '"' +
      ' data-state-sort-by="' + this.escapeInspectorAttr(state_sort_by) + '"' +
      ' data-state-sort-dir="' + this.escapeInspectorAttr(state_sort_dir) + '"' +
      ' data-state-filter="' + this.escapeInspectorAttr(state_filter) + '"' +
      ' data-state-filter-expr="' + this.escapeInspectorAttr(state_filter_expr) + '"';
  }

  /**
   * Returns inspector column label.
   * @param {Object} column
   * @returns {string}
   */
  getInspectorColumnLabel(column) {
    var header_kind = column && typeof column.header_kind == 'string' ? column.header_kind : '';
    if(header_kind == 'row-name') {
      return this.language.currentString(503);
    }
    if(header_kind == 'row-time') {
      var time_name = column && typeof column.name == 'string' && column.name.length
        ? column.name
        : this.language.currentString(504);
      var time_type = column && typeof column.type == 'string' && column.type.length
        ? column.type
        : '';
      return time_type.length ? (time_name + ' (' + time_type + ')') : time_name;
    }
    if(header_kind == 'variable') {
      var variable_name = column && typeof column.name == 'string' && column.name.length
        ? column.name
        : String(column && column.key ? column.key : '');
      var variable_type = column && typeof column.type == 'string' && column.type.length
        ? column.type
        : '';
      return variable_type.length ? (variable_name + ' (' + variable_type + ')') : variable_name;
    }
    return column && typeof column.label == 'string' ? column.label : String(column && column.key ? column.key : '');
  }

  /**
   * Renders inspector toolbar.
   * @param {Object} toolbar
   * @returns {string}
   */
  renderInspectorToolbar(toolbar) {
    var attrs = this.buildInspectorStateAttrs(toolbar);
    var html = '<div class="jslab-inspector-toolbar">' +
      '<button class="jslab-inspector-action" data-action="filter"' + attrs + '>' +
      this.escapeInspectorLocalizedHtml(toolbar.filter_label || '') + '</button>';
    if(toolbar.show_clear_filter) {
      html += '<button class="jslab-inspector-action" data-action="clear-filter"' + attrs + '>' +
        this.escapeInspectorLocalizedHtml(toolbar.clear_filter_label || '') + '</button>';
    }
    html += '<button class="jslab-inspector-action" data-action="table-filter-expr"' + attrs + '>' +
      this.escapeInspectorLocalizedHtml(toolbar.filter_expr_label || '') + '</button>';
    if(toolbar.show_clear_expr) {
      html += '<button class="jslab-inspector-action" data-action="table-clear-filter-expr"' + attrs + '>' +
        this.escapeInspectorLocalizedHtml(toolbar.clear_expr_label || '') + '</button>';
    }
    if(Array.isArray(toolbar.extra_actions)) {
      toolbar.extra_actions.forEach((extra) => {
        if(extra && typeof extra.action == 'string') {
          html += '<button class="jslab-inspector-action" data-action="' +
            this.escapeInspectorAttr(extra.action) + '"' + attrs + '>' +
            this.escapeInspectorLocalizedHtml(extra.label || '') + '</button>';
        }
      });
    }
    html += '<button class="jslab-inspector-action" data-action="refresh"' + attrs + '>' +
      this.escapeInspectorLocalizedHtml(toolbar.refresh_label || '') + '</button>' +
      '<span class="jslab-inspector-hint">' + this.escapeInspectorLocalizedHtml(toolbar.hint_label || '') + '</span>' +
      '</div>';
    return html;
  }

  /**
   * Renders inspector table content.
   * @param {Object} content
   * @returns {string}
   */
  renderInspectorTable(content) {
    var attrs = this.buildInspectorStateAttrs(content);
    var html = this.renderInspectorToolbar(content.toolbar);
    html += '<div class="jslab-inspector-table-wrap"><table class="jslab-inspector-table"><thead><tr>';
    (content.columns || []).forEach((column) => {
      var header_label = this.getInspectorColumnLabel(column);
      if(column && column.sortable) {
        if(column.indicator && String(column.indicator).length) {
          header_label += ' (' + String(column.indicator) + ')';
        }
        html += '<th><button class="jslab-inspector-action jslab-inspector-sort" data-action="sort"' +
          attrs +
          ' data-next-sort-by="' + this.escapeInspectorAttr(column.key || '') + '"' +
          ' data-next-sort-dir="' + this.escapeInspectorAttr(column.next_sort_dir == 'desc' ? 'desc' : 'asc') + '">' +
          this.escapeInspectorLocalizedHtml(header_label) + '</button></th>';
      } else {
        html += '<th>' + this.escapeInspectorLocalizedHtml(header_label) + '</th>';
      }
    });
    html += '</tr></thead><tbody>';
    (content.rows || []).forEach((row) => {
      html += '<tr>';
      (row.cells || []).forEach((cell) => {
        var preview_html = this.escapeInspectorHtml(cell && cell.preview_text !== undefined ? cell.preview_text : '');
        if(cell && cell.editable) {
          html += '<td class="jslab-inspector-cell-editable"' +
            attrs +
            ' data-path="' + this.escapeInspectorAttr(JSON.stringify(Array.isArray(cell.path) ? cell.path : [])) + '"' +
            ' data-default="' + this.escapeInspectorAttr(typeof cell.default_expr == 'string' ? cell.default_expr : '') + '"' +
            ' title="' + this.escapeInspectorAttr(this.resolveInspectorLocalizedText(content.edit_cell_title || '')) + '">' +
            preview_html + '</td>';
        } else {
          html += '<td>' + preview_html + '</td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  /**
   * Renders inspector content block.
   * @param {Object} content
   * @returns {string}
   */
  renderInspectorContent(content) {
    if(!content || typeof content != 'object') {
      return '';
    }
    if(content.type == 'table') {
      return this.renderInspectorTable(content);
    }
    if(content.type == 'empty') {
      return this.renderInspectorToolbar(content.toolbar) +
        '<div class="jslab-inspector-empty">' + this.escapeInspectorLocalizedHtml(content.empty_text || '') + '</div>';
    }
    if(content.type == 'scalar') {
      var attrs = this.buildInspectorStateAttrs({
        variable: content.variable || '',
        view: content.view || 'scalar',
        state_sort_by: '',
        state_sort_dir: 'asc',
        state_filter: '',
        state_filter_expr: ''
      });
      return '<div class="jslab-inspector-toolbar">' +
        '<button class="jslab-inspector-action" data-action="edit"' +
        attrs +
        ' data-path="[]"' +
        ' data-default="' + this.escapeInspectorAttr(content.default_expr || '') + '">' +
        this.escapeInspectorLocalizedHtml(content.edit_label || '') + '</button>' +
        '</div><div class="jslab-inspector-scalar">' + this.escapeInspectorHtml(content.preview_text || '') + '</div>';
    }
    return '';
  }

  /**
   * Renders full inspector output.
   * @param {Object} model
   * @returns {string}
   */
  renderInspector(model) {
    var meta_parts = model && Array.isArray(model.meta_parts) ? model.meta_parts : [];
    var note_parts = model && Array.isArray(model.note_parts) ? model.note_parts : [];
    var html = '<div class="jslab-inspector">' +
      '<div class="jslab-inspector-header">' +
      '<div class="jslab-inspector-title">' + this.escapeInspectorLocalizedHtml(model.title || '') + ': <code>' +
      this.escapeInspectorHtml(model.variable || '') + '</code></div>' +
      '<div class="jslab-inspector-meta">' + this.escapeInspectorLocalizedHtml(meta_parts.join(' | ')) + '</div>' +
      '</div>' +
      this.renderInspectorContent(model.content);
    if(note_parts.length) {
      html += '<div class="jslab-inspector-note">' +
        this.escapeInspectorLocalizedHtml(note_parts.join('; ')) + '</div>';
    }
    html += '</div>';
    return html;
  }

  /**
   * Displays inspector payload in command output.
   * @param {Object} model
   */
  showInspector(model) {
    if(!model || typeof model != 'object') {
      this.handleSandboxRuntimeLog('@inspector: invalid payload.', 'error');
      return;
    }
    this._appendCommandWindowMessage('data-in', this.renderInspector(model), '@inspector');
  }

  /**
   * Reads normalized inspector state from an element.
   * @param {HTMLElement} el
   * @returns {Object}
   */
  getInspectorStateFromElement(el) {
    var state = {};
    var view = el.getAttribute('data-view');
    var filter = el.getAttribute('data-state-filter');
    var filter_expr = el.getAttribute('data-state-filter-expr');
    var sort_by = el.getAttribute('data-state-sort-by');
    var sort_dir = el.getAttribute('data-state-sort-dir');
    if(view) {
      state.view = view;
    }
    if(filter && filter.trim().length) {
      state.filter = filter;
    }
    if(filter_expr && filter_expr.trim().length) {
      state.filter_expr = filter_expr;
    }
    if(sort_by && sort_by.trim().length) {
      state.sort_by = sort_by;
    }
    if(sort_dir == 'asc' || sort_dir == 'desc') {
      state.sort_dir = sort_dir;
    }
    return state;
  }

  /**
   * Removes empty inspector state keys.
   * @param {Object} options
   * @returns {Object}
   */
  normalizeInspectorState(options) {
    var normalized = {};
    if(options && typeof options == 'object') {
      if(typeof options.view == 'string' && options.view.length) {
        normalized.view = options.view;
      }
      if(typeof options.filter == 'string' && options.filter.trim().length) {
        normalized.filter = options.filter.trim();
      }
      if(typeof options.filter_expr == 'string' && options.filter_expr.trim().length) {
        normalized.filter_expr = options.filter_expr.trim();
      }
      if(typeof options.sort_by == 'string' && options.sort_by.length) {
        normalized.sort_by = options.sort_by;
        normalized.sort_dir = options.sort_dir == 'desc' ? 'desc' : 'asc';
      }
    }
    return normalized;
  }

  /**
   * Builds inspectVariable command.
   * @param {string} variable
   * @param {Object} state
   * @returns {string}
   */
  buildInspectCommand(variable, state) {
    var cmd = 'inspectVariable(' + JSON.stringify(variable);
    var normalized = this.normalizeInspectorState(state);
    if(Object.keys(normalized).length) {
      cmd += ', ' + JSON.stringify(normalized);
    }
    cmd += ')';
    return cmd;
  }

  /**
   * Runs inspectVariable preserving current input.
   * @param {string} variable
   * @param {Object} state
   */
  async runInspectCommand(variable, state) {
    if(variable && variable.length) {
      await this._evaluateCommand(this.buildInspectCommand(variable, state), { preserve_input: true });
    }
  }

  /**
   * Runs table action and refreshes inspector.
   * @param {string} variable
   * @param {Object} state
   * @param {string} action
   * @param {Object} payload
   */
  async runTableInspectorAction(variable, state, action, payload) {
    var action_cmd = 'inspectTableAction(' +
      JSON.stringify(variable) + ', ' +
      JSON.stringify(action) + ', ' +
      JSON.stringify(payload || {}) + ')';
    await this._evaluateCommand(action_cmd + '; ' + this.buildInspectCommand(variable, state), { preserve_input: true });
  }

  /**
   * Handles table inspector actions.
   * @param {string} action
   * @param {HTMLElement} el
   * @param {string} variable
   * @param {Object} state
   * @returns {Promise<boolean>}
   */
  async handleTableInspectorAction(action, el, variable, state) {
    var result;
    if(action == 'table-filter-expr') {
      result = await this.openInspectorInputDialog({
        title: this.language.currentString(394),
        message: this.language.currentString(424),
        submit_label: this.language.currentString(391),
        fields: [{ label: this.language.currentString(430), value: state.filter_expr || '' }]
      });
      if(!result) {
        return true;
      }
      if(result.values[0].trim().length) {
        state.filter_expr = result.values[0].trim();
      } else {
        delete state.filter_expr;
      }
      await this.runInspectCommand(variable, state);
      return true;
    }
    if(action == 'table-clear-filter-expr') {
      delete state.filter_expr;
      await this.runInspectCommand(variable, state);
      return true;
    }
    if(action == 'sort') {
      state.sort_by = el.getAttribute('data-next-sort-by') || '';
      state.sort_dir = el.getAttribute('data-next-sort-dir') == 'desc' ? 'desc' : 'asc';
      await this.runInspectCommand(variable, state);
      return true;
    }
    if(action == 'table-addvar') {
      result = await this.openInspectorInputDialog({
        title: this.language.currentString(398),
        submit_label: this.language.currentString(391),
        fields: [
          { label: this.language.currentString(425), value: '' },
          { label: this.language.currentString(426), value: '' }
        ]
      });
      if(!result || !result.values[0].trim().length || !result.values[1].trim().length) {
        return true;
      }
      await this.runTableInspectorAction(variable, state, 'addvar', {
        name: result.values[0].trim(),
        expression: result.values[1].trim()
      });
      return true;
    }
    if(action == 'table-renamevar') {
      result = await this.openInspectorInputDialog({
        title: this.language.currentString(399),
        submit_label: this.language.currentString(391),
        fields: [
          { label: this.language.currentString(427), value: '' },
          { label: this.language.currentString(425), value: '' }
        ]
      });
      if(!result || !result.values[0].trim().length || !result.values[1].trim().length) {
        return true;
      }
      await this.runTableInspectorAction(variable, state, 'renamevar', {
        old_name: result.values[0].trim(),
        new_name: result.values[1].trim()
      });
      return true;
    }
    if(action == 'table-removevar') {
      result = await this.openInspectorInputDialog({
        title: this.language.currentString(400),
        submit_label: this.language.currentString(391),
        fields: [{ label: this.language.currentString(428), value: '' }]
      });
      if(!result || !result.values[0].trim().length) {
        return true;
      }
      await this.runTableInspectorAction(variable, state, 'removevar', {
        names: result.values[0].trim()
      });
      return true;
    }
    if(action == 'table-copy-csv') {
      await this.runTableInspectorAction(variable, state, 'copycsv', {});
      return true;
    }
    return false;
  }

  /**
   * Handles inspector toolbar actions.
   * @param {HTMLElement} el
   */
  async handleInspectorAction(el) {
    var variable = el.getAttribute('data-variable');
    var action = el.getAttribute('data-action');
    var state = this.getInspectorStateFromElement(el);
    var result;

    if(!variable || !variable.length) {
      return;
    }
    if(action == 'refresh') {
      await this.runInspectCommand(variable, state);
      return;
    }
    if(action == 'filter') {
      result = await this.openInspectorInputDialog({
        title: this.language.currentString(392),
        message: this.language.currentString(423),
        submit_label: this.language.currentString(391),
        fields: [{ label: this.language.currentString(390), value: state.filter || '' }]
      });
      if(!result) {
        return;
      }
      if(result.values[0].trim().length) {
        state.filter = result.values[0].trim();
      } else {
        delete state.filter;
      }
      await this.runInspectCommand(variable, state);
      return;
    }
    if(action == 'clear-filter') {
      delete state.filter;
      await this.runInspectCommand(variable, state);
      return;
    }
    if(action == 'edit') {
      await this.editInspectorCell(el);
      return;
    }
    if(await this.handleTableInspectorAction(action, el, variable, state)) {
      return;
    }
  }

  /**
   * Opens editor prompt for selected inspector cell and writes value back.
   * @param {HTMLElement} el
   */
  async editInspectorCell(el) {
    var variable = el.getAttribute('data-variable');
    var path_raw = el.getAttribute('data-path') || '[]';
    var path;
    var state = this.getInspectorStateFromElement(el);
    var result;
    var expression;

    try {
      path = JSON.parse(path_raw);
    } catch(err) {
      this.handleSandboxRuntimeLog('@inspector: ' + this.language.currentString(446), 'error');
      return;
    }

    result = await this.openInspectorInputDialog({
      title: this.language.currentString(412),
      message: this.language.formatLang(429, {
        variable: this.escapeInspectorHtml(variable),
        path: this.escapeInspectorHtml(JSON.stringify(path))
      }),
      submit_label: this.language.currentString(391),
      fields: [{
        label: this.language.currentString(430),
        value: el.getAttribute('data-default') || ''
      }]
    });
    if(!result) {
      return;
    }
    expression = result.values[0].trim();
    if(!expression.length) {
      return;
    }

    await this._evaluateCommand(
      'inspectSetVariable(' + JSON.stringify(variable) + ', ' +
      JSON.stringify(path) + ', ' + JSON.stringify(expression) + '); ' +
      this.buildInspectCommand(variable, state),
      { preserve_input: true }
    );
  }

  /**
   * Applies settings dialog values.
   */
  _applySettings() {
    var input = document.getElementById('history-max-input');
    var value = Number(input.value);
    if(!isFinite(value) || value < 5) {
      value = 20;
    }
    this.history_max = value;
    this.metadata.set('N_history_max', this.history_max);
    while(this.history.length > this.history_max) {
      this.history.shift();
    }
    this.metadata.set('full_history', this.history);
    this._renderHistory();
    this._closeDialog('settings-container');
  }

  /**
   * Changes the shell language immediately.
   * @param {string} lang
   */
  changeLanguage(lang) {
    this.language.set(lang);
    if(this.sandbox_api && typeof this.sandbox_api.setLanguage == 'function') {
      this.sandbox_api.setLanguage(lang);
    }
  }

  /**
   * Wires the sandbox status popup.
   */
  _bindStatusPopup() {
    this.stats_icon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.status_popup_visible = !this.status_popup_visible;
      document.getElementById('sandbox-stats-popup').style.display = this.status_popup_visible ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
      var popup = document.getElementById('sandbox-stats-popup');
      if(this.status_popup_visible &&
          !popup.contains(e.target) &&
          e.target !== this.stats_icon) {
        this.status_popup_visible = false;
        popup.style.display = 'none';
      }
    });
  }

  /**
   * Wires command history interactions.
   */
  _bindHistory() {
    var obj = this;
    document.getElementById('clear-command-history-button').addEventListener('click', function() {
      obj.history = [];
      obj.metadata.set('full_history', obj.history);
      obj._resetHistoryIndex();
      obj._renderHistory();
    });

    this.history_cont.addEventListener('click', function(e) {
      if(e.target && e.target.matches('div') && !e.target.classList.contains('comment')) {
        obj._setCommandInputValue(e.target.textContent);
      }
    });

    this.history_cont.addEventListener('dblclick', async function(e) {
      if(e.target && e.target.matches('div') && !e.target.classList.contains('comment')) {
        await obj._evaluateCommand(e.target.textContent);
      }
    });
  }

  /**
   * Runs the current command input in the worker.
   */
  async _runCommand() {
    return this._evaluateCommand(this.code_input ? this.code_input.getValue() : '');
  }

  /**
   * Runs editor text through the shared command worker.
   * @param {string} code
   * @param {string} [label]
   */
  async runEditorCode(code, label) {
    if(label) {
      this._appendCommandWindowMessage('system-in', '<span class="log">Running: ' + escapeHtml(label) + '</span>', 'Running: ' + label);
    }
    await this._evaluateCommand(String(code || ''));
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
    await this._evaluateCommand('documentation(' + JSON.stringify(safe_query) + ')', {
      preserve_input: true
    });
    return true;
  }

  /**
   * Imports files into the workspace.
   * @param {FileList|Array<File>} files
   */
  async _importSelection(files) {
    var imported = await this.fs.importFiles(files, '/workspace');
    this._appendCommandWindowMessage('system-in', '<span class="log">' + escapeHtml('Imported ' + imported.length + ' file(s) into browser storage.') + '</span>', 'Imported ' + imported.length + ' file(s) into browser storage.');
    await this._refreshWorkspaceList();
  }

  /**
   * Opens a prompt for importing one direct URL into the workspace.
   * @returns {Promise<boolean>}
   */
  async _promptImportUrl() {
    var result = await this.openInspectorInputDialog({
      title: this.language.currentString(543),
      fields: [{
        label: this.language.currentString(545),
        value: ''
      }],
      submit_label: this.language.currentString(553),
      hide_cancel: true
    });

    if(!result || !Array.isArray(result.values)) {
      return false;
    }

    if(!String(result.values[0] || '').trim().length) {
      return false;
    }

    await this._importFromUrl(result.values[0], {
      open_in_editor: false
    });
    return true;
  }

  /**
   * Builds a ready-to-use ?open=... share URL for the current web app.
   * @param {string} file_url
   * @returns {string}
   */
  _buildShareLink(file_url) {
    var url_text = String(file_url || '').trim();
    var base_url;
    var absolute_url;
    var share_url;

    if(!url_text.length) {
      return '';
    }

    absolute_url = new URL(url_text, globalThis.location.href).href;
    base_url = new URL(globalThis.location.href);
    base_url.search = '';
    base_url.hash = '';
    share_url = new URL(base_url.href);
    share_url.searchParams.append('open', absolute_url);
    return share_url.href;
  }

  /**
   * Copies text to the system clipboard with a DOM fallback for file:// mode.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async _copyText(text) {
    var value = String(text || '');
    var textarea;
    var copied = false;

    if(!value.length) {
      return false;
    }

    if(globalThis.navigator &&
        globalThis.navigator.clipboard &&
        typeof globalThis.navigator.clipboard.writeText == 'function') {
      try {
        await globalThis.navigator.clipboard.writeText(value);
        return true;
      } catch {}
    }

    textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-10000px';
    textarea.style.top = '-10000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }

    document.body.removeChild(textarea);
    return copied === true;
  }

  /**
   * Imports a remote file URL into the workspace.
   * @param {string} file_url
   * @param {Object} [options]
   * @returns {Promise<(string|false)>}
   */
  async _importFromUrl(file_url, options) {
    var url_text = String(file_url || '').trim();
    var absolute_url;
    var response;
    var content_type;
    var content_disposition;
    var filename;
    var target_path;
    var bytes;
    var raw_error;
    var message;

    if(!url_text.length) {
      return false;
    }

    try {
      absolute_url = new URL(url_text, globalThis.location.href).href;
      response = await fetch(absolute_url, {
        mode: 'cors',
        credentials: 'omit'
      });

      if(!response.ok) {
        throw new Error('HTTP ' + response.status + ' ' + response.statusText);
      }

      content_type = String(response.headers.get('content-type') || '');
      content_disposition = String(response.headers.get('content-disposition') || '');
      filename = this._resolveImportedUrlFileName(absolute_url, content_disposition, content_type);
      target_path = this.fs.normalizePath('/workspace/' + filename);
      bytes = new Uint8Array(await response.arrayBuffer());

      await this.fs.writeBytes(target_path, bytes);
      await this._refreshWorkspaceList();

      this._appendCommandWindowMessage(
        'system-in',
        '<span class="log">' + escapeHtml(this.language.currentString(546) + ' ' + target_path) + '</span>',
        this.language.currentString(546) + ' ' + target_path
      );

      if(options && options.open_in_editor &&
          this._shouldOpenImportedFileInEditor(target_path, content_type)) {
        await this._openEditorWindow(target_path);
      }

      return target_path;
    } catch(err) {
      raw_error = err && err.message ? err.message : String(err);
      message = this.language.currentString(547) + ' ' + raw_error;
      this.handleSandboxRuntimeLog(message, 'error');
      return false;
    }
  }

  /**
   * Infers a workspace filename for a remote import.
   * @param {string} file_url
   * @param {string} content_disposition
   * @param {string} content_type
   * @returns {string}
   */
  _resolveImportedUrlFileName(file_url, content_disposition, content_type) {
    var filename = '';
    var parsed_url;
    var path_parts;
    var match;

    if(typeof content_disposition == 'string' && content_disposition.length) {
      match = /filename\*=UTF-8''([^;]+)/i.exec(content_disposition);
      if(match && match[1]) {
        try {
          filename = decodeURIComponent(match[1]);
        } catch {
          filename = match[1];
        }
      }
      if(!filename.length) {
        match = /filename=\"?([^\";]+)\"?/i.exec(content_disposition);
        if(match && match[1]) {
          filename = match[1];
        }
      }
    }

    if(!filename.length) {
      try {
        parsed_url = new URL(file_url);
        path_parts = parsed_url.pathname.split('/').filter(function(part) {
          return part.length > 0;
        });
        filename = path_parts.length ? path_parts[path_parts.length - 1] : '';
      } catch {}
    }

    if(!filename.length) {
      filename = 'remote-file';
    }

    filename = filename.replace(/[?#].*$/, '').trim();
    filename = filename.replace(/[<>:\"/\\\\|?*]+/g, '-');
    if(!filename.length) {
      filename = 'remote-file';
    }

    if(filename.indexOf('.') < 0) {
      if(content_type.indexOf('javascript') > -1) {
        filename += '.js';
      } else if(content_type.indexOf('json') > -1) {
        filename += '.json';
      } else if(content_type.indexOf('html') > -1) {
        filename += '.html';
      } else if(content_type.indexOf('css') > -1) {
        filename += '.css';
      } else if(content_type.indexOf('markdown') > -1) {
        filename += '.md';
      } else if(content_type.indexOf('text/plain') > -1) {
        filename += '.txt';
      }
    }

    return filename;
  }

  /**
   * Returns true if an imported file should open in the editor automatically.
   * @param {string} file_path
   * @param {string} content_type
   * @returns {boolean}
   */
  _shouldOpenImportedFileInEditor(file_path, content_type) {
    var lower_path = String(file_path || '').toLowerCase();
    var allowed_extensions = [
      '.jsl', '.js', '.json', '.txt', '.md', '.html', '.css',
      '.xml', '.csv', '.ts', '.mjs', '.cjs', '.c', '.cpp', '.h', '.hpp', '.py'
    ];

    if(allowed_extensions.some(function(extension) {
      return lower_path.endsWith(extension);
    })) {
      return true;
    }

    return typeof content_type == 'string' && (
      content_type.startsWith('text/') ||
      content_type.indexOf('json') > -1 ||
      content_type.indexOf('javascript') > -1 ||
      content_type.indexOf('xml') > -1
    );
  }

  /**
   * Imports files requested through ?open=... query parameters.
   * @returns {Promise<void>}
   */
  async _handleStartupOpenUrls() {
    var params;
    var urls;
    var i;

    try {
      params = new URLSearchParams(globalThis.location.search || '');
    } catch {
      return;
    }

    urls = params.getAll('open').map(function(value) {
      return String(value || '').trim();
    }).filter(function(value) {
      return value.length > 0;
    });

    for(i = 0; i < urls.length; i++) {
      await this._importFromUrl(urls[i], {
        open_in_editor: true
      });
    }
  }

  /**
   * Refreshes the workspace file list.
   */
  async _refreshWorkspaceList() {
    if(!this.file_browser_cont) {
      return;
    }
    this.file_browser_cont.innerHTML = '';
    this._renderWorkspaceDirectory('/workspace', this.file_browser_cont, true);
  }

  /**
   * Renders one workspace directory subtree using the desktop file-browser structure.
   * @param {string} dir_path
   * @param {HTMLElement} element
   * @param {boolean} [root]
   */
  _renderWorkspaceDirectory(dir_path, element, root) {
    var obj = this;
    var ul = document.createElement('ul');
    var dirents = this.fs.readDirSync(dir_path, { withFileTypes: true });

    dirents.sort(function(a, b) {
      if(a.isDirectory() && !b.isDirectory()) {
        return -1;
      }
      if(!a.isDirectory() && b.isDirectory()) {
        return 1;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    ul.setAttribute('path', dir_path.replace(/\\/g, '/'));
    if(root) {
      element.innerHTML = '';
    } else {
      var old_ul = element.querySelector(':scope > ul');
      if(old_ul) {
        old_ul.remove();
      }
    }

    dirents.forEach(function(dirent) {
      obj._addWorkspaceBrowserItem(dir_path, dirent, ul);
    });

    element.appendChild(ul);
  }

  /**
   * Adds one file-browser item for the web workspace tree.
   * @param {string} parent_dir
   * @param {Object} dirent
   * @param {HTMLElement} ul
   */
  _addWorkspaceBrowserItem(parent_dir, dirent, ul) {
    var obj = this;
    var absolute_path = this.fs.join(parent_dir, dirent.name);
    var li = document.createElement('li');
    var span = document.createElement('span');
    var extension = '';
    var match = /\.([^.\/]+)$/.exec(dirent.name);

    li.setAttribute('path', absolute_path.replace(/\\/g, '/'));
    span.textContent = dirent.name;
    li.appendChild(span);

    if(dirent.isDirectory()) {
      li.className = 'folder';
      span.title = absolute_path;
      span.addEventListener('dblclick', function(event) {
        event.stopPropagation();
        event.preventDefault();
        obj._toggleWorkspaceDirectory(absolute_path);
      });
      span.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        event.stopPropagation();
        obj._openFileBrowserContextMenu(absolute_path, 'directory', event.clientX, event.clientY);
      });

      var expand = document.createElement('i');
      expand.className = 'expend';
      expand.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        obj._toggleWorkspaceDirectory(absolute_path, li, expand);
      });
      li.appendChild(expand);

      if(this.file_tree_expanded_paths.has(absolute_path)) {
        expand.classList.add('expended');
        this._renderWorkspaceDirectory(absolute_path, li, false);
      }
    } else {
      if(match) {
        extension = match[1].toLowerCase();
      }
      li.className = 'file';
      if(extension) {
        li.classList.add(extension);
      }
      span.title = absolute_path;
      span.addEventListener('dblclick', async function(event) {
        event.stopPropagation();
        event.preventDefault();
        await obj._openEditorWindow(absolute_path);
      });
      span.addEventListener('contextmenu', function(event) {
        event.preventDefault();
        event.stopPropagation();
        obj._openFileBrowserContextMenu(absolute_path, 'file', event.clientX, event.clientY);
      });
    }

    ul.appendChild(li);
  }

  /**
   * Toggles one workspace directory subtree.
   * @param {string} dir_path
   * @param {HTMLElement} [li]
   * @param {HTMLElement} [expand]
   */
  _toggleWorkspaceDirectory(dir_path, li, expand) {
    var node = li || this._findWorkspaceTreeNode(dir_path);
    var icon = expand || (node ? node.querySelector(':scope > i.expend') : null);
    var child_ul;

    if(!node || !icon) {
      return;
    }

    child_ul = node.querySelector(':scope > ul');
    if(child_ul) {
      child_ul.remove();
      icon.classList.remove('expended');
      this.file_tree_expanded_paths.delete(dir_path);
    } else {
      icon.classList.add('expended');
      this.file_tree_expanded_paths.add(dir_path);
      this._renderWorkspaceDirectory(dir_path, node, false);
    }
  }

  /**
   * Finds one rendered workspace tree node by its path attribute.
   * @param {string} file_path
   * @returns {HTMLElement|undefined}
   */
  _findWorkspaceTreeNode(file_path) {
    var node;
    if(!this.file_browser_cont) {
      return undefined;
    }
    node = [...this.file_browser_cont.querySelectorAll('li[path]')].find(function(item) {
      return item.getAttribute('path') == file_path;
    });
    return node;
  }

  /**
   * Opens the merged import menu under the import icon.
   * @param {HTMLElement} anchor
   */
  _openFileBrowserImportMenu(anchor) {
    if(!this.file_browser_import_menu || !anchor) {
      return;
    }
    this._hideFileBrowserContextMenu();
    this._hideWorkspaceContextMenu();
    var rect = anchor.getBoundingClientRect();
    this.file_browser_import_menu.style.left = Math.round(rect.left) + 'px';
    this.file_browser_import_menu.style.top = Math.round(rect.bottom + 4) + 'px';
    this.file_browser_import_menu.style.display = 'block';
  }

  /**
   * Hides the merged import menu.
   */
  _hideFileBrowserImportMenu() {
    if(this.file_browser_import_menu) {
      this.file_browser_import_menu.style.display = 'none';
    }
  }

  /**
   * Imports files through the browser picker.
   * @returns {Promise<void>}
   */
  async _importFilesFromPicker() {
    var result = false;
    this._hideFileBrowserImportMenu();
    if(this.runtime_info.supports_open_picker) {
      result = await this._showOpenDialog({
        title: 'Import files',
        buttonLabel: 'Import files',
        properties: ['openFile', 'multiSelections']
      });
    }
    if(!result) {
      PRDC_JSLAB_WEB_IMPORT_EXPORT.openPicker(document.getElementById('file-picker'));
    }
  }

  /**
   * Imports one folder through the browser picker.
   * @returns {Promise<void>}
   */
  async _importFolderFromPicker() {
    var result = false;
    this._hideFileBrowserImportMenu();
    if(this.runtime_info.supports_directory_picker) {
      result = await this._showOpenDialog({
        title: 'Import folder',
        buttonLabel: 'Import folder',
        properties: ['openDirectory']
      });
    }
    if(!result) {
      PRDC_JSLAB_WEB_IMPORT_EXPORT.openPicker(document.getElementById('folder-picker'));
    }
  }

  /**
   * Renders workspace values in the existing main-window table style.
   * @param {Object} workspace
   */
  _renderWorkspaceVariables(workspace) {
    var filter = this.workspace_search.value.trim().toLowerCase();
    this.workspace_state = Array.isArray(workspace) ? workspace.slice() : [];
    this.variable_table.innerHTML = '';

    var rows = this.workspace_state.filter(function(row) {
      var variable = row && row[0] !== undefined && row[0] !== null ? String(row[0]) : '';
      var type = row && row[1] !== undefined && row[1] !== null ? String(row[1]) : '';
      var value = row && row[2] !== undefined && row[2] !== null ? String(row[2]) : '';
      if(!filter.length) {
        return true;
      }
      return (variable + ' ' + type + ' ' + value).toLowerCase().indexOf(filter) > -1;
    });

    if(!rows.length) {
      return;
    }

    rows.forEach((row_data) => {
      var variable = row_data && row_data[0] !== undefined && row_data[0] !== null ? String(row_data[0]) : '';
      var type = row_data && row_data[1] !== undefined && row_data[1] !== null ? String(row_data[1]) : '';
      var value = row_data && row_data[2] !== undefined && row_data[2] !== null ? String(row_data[2]) : '';
      var row = document.createElement('div');
      row.className = 'row';
      row.setAttribute('variable', variable);
      row.addEventListener('click', () => {
        this._setCommandInputValue(variable);
      });
      row.addEventListener('dblclick', async () => {
        await this._evaluateCommand(variable);
      });
      row.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this._openWorkspaceContextMenu(variable, event.clientX, event.clientY);
      });
      row.innerHTML =
        '<div class="col col-1">' + escapeHtml(variable) + '</div>' +
        '<div class="col col-2">' + escapeHtml(type) + '</div>' +
        '<div class="col col-3">' + escapeHtml(value) + '</div>';
      this.variable_table.appendChild(row);
    });
  }

  /**
   * Sets the virtual current path display.
   * @param {string} path
   */
  _setCurrentPath(path) {
    this.current_path = path;
    if(this.workspace_path_input) {
      this.workspace_path_input.value = path;
    }
    if(this.current_address) {
      this.current_address.innerHTML = '<span class="folder">' +
        escapeHtml(this.language.currentString(5) || 'Workspace') +
        '</span>';
    }
  }

  /**
   * Resolves a default save extension from dialog options.
   * @param {Object} options
   * @param {string} default_path
   * @returns {string}
   */
  _getSaveDialogDefaultExtension(options, default_path) {
    var path_value = String(default_path || '');
    if(path_value.endsWith('.i.html')) {
      return '.i.html';
    }
    if(path_value.endsWith('.io.html')) {
      return '.io.html';
    }
    var base_name = path_value.split('/').pop() || '';
    var last_dot = base_name.lastIndexOf('.');
    if(last_dot > 0) {
      return base_name.slice(last_dot);
    }
    var filters = options && Array.isArray(options.filters) ? options.filters : [];
    for(var i = 0; i < filters.length; i++) {
      var extensions = filters[i] && Array.isArray(filters[i].extensions) ? filters[i].extensions : [];
      if(extensions.length && typeof extensions[0] == 'string' && extensions[0].length) {
        return '.' + extensions[0];
      }
    }
    return '';
  }

  /**
   * Resolves a local file name suggestion for browser save flows.
   * @param {string} file_path
   * @param {Object} [options]
   * @returns {string}
   */
  _sanitizeSaveDialogFileName(file_path, options) {
    var value = String(file_path || '').trim().replace(/\\/g, '/');
    if(value.includes('/')) {
      value = value.split('/').pop();
    }
    value = value.replace(/[:*?"<>|]/g, '_');
    if(!value.length) {
      value = 'file';
    }
    var ext = this._getSaveDialogDefaultExtension(options, file_path || value);
    if(ext && value.indexOf('.') < 0) {
      value += ext;
    }
    return value;
  }

  /**
   * Builds browser file picker types from dialog filters.
   * @param {Object} [options]
   * @returns {Array}
   */
  _getSaveDialogFileTypes(options) {
    var types = [];
    var filters = options && Array.isArray(options.filters) ? options.filters : [];
    filters.forEach(function(filter) {
      var extensions = filter && Array.isArray(filter.extensions) ? filter.extensions : [];
      var accept_extensions = [];
      extensions.forEach(function(extension) {
        var value = String(extension || '').trim();
        if(!value.length || value == '*') {
          return;
        }
        if(!value.startsWith('.')) {
          value = '.' + value;
        }
        accept_extensions.push(value);
      });
      if(accept_extensions.length) {
        types.push({
          description: filter && filter.name ? String(filter.name) : 'Files',
          accept: {
            'application/octet-stream': accept_extensions
          }
        });
      }
    });
    return types;
  }

  /**
   * Builds browser file picker types from open-dialog filters.
   * @param {Object} [options]
   * @returns {Array}
   */
  _getOpenDialogFileTypes(options) {
    return this._getSaveDialogFileTypes(options);
  }

  /**
   * Stores a pending local save target for later file writes.
   * @param {string} file_name
   * @param {FileSystemFileHandle|null} handle
   * @returns {Object}
   */
  _rememberLocalSaveTarget(file_name, handle) {
    var name = this._sanitizeSaveDialogFileName(file_name);
    var token = 'local-save-' + (++this.local_save_target_id);
    this.local_save_targets[token] = {
      name: name,
      handle: handle || null
    };
    return {
      canceled: false,
      filePath: name,
      token: token
    };
  }

  /**
   * Detects the current browser runtime mode and capabilities.
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
   * Refreshes runtime info with current storage/backend state.
   */
  _refreshRuntimeInfo() {
    this.runtime_info = Object.assign({}, this.runtime_info, {
      workspace_storage_mode: this.fs && this.fs.mode ? this.fs.mode : 'memory',
      workspace_storage_label: this.fs && typeof this.fs.getModeLabel == 'function'
        ? this.fs.getModeLabel()
        : 'Ephemeral memory storage'
    });
  }

  /**
   * Returns a copy of the current runtime descriptor.
   * @returns {Object}
   */
  getRuntimeInfo() {
    return Object.assign({}, this.runtime_info);
  }

  /**
   * Returns one runtime capability flag.
   * @param {string} name
   * @returns {*}
   */
  getRuntimeCapability(name) {
    if(typeof name == 'string' && Object.prototype.hasOwnProperty.call(this.runtime_info, name)) {
      return this.runtime_info[name];
    }
  }

  /**
   * Displays the browser save dialog and returns a local save target.
   * @param {Object} [options]
   * @returns {Promise<Object|false>}
   */
  async _showSaveDialog(options) {
    var default_name = this._sanitizeSaveDialogFileName(
      options && options.defaultPath ? options.defaultPath : 'file.txt',
      options
    );

    if(this.runtime_info.supports_save_picker) {
      try {
        var picker_options = {
          suggestedName: default_name
        };
        var picker_types = this._getSaveDialogFileTypes(options);
        if(picker_types.length) {
          picker_options.types = picker_types;
        }
        var handle = await globalThis.showSaveFilePicker(picker_options);
        return this._rememberLocalSaveTarget(handle && handle.name ? handle.name : default_name, handle);
      } catch(err) {
        if(err && err.name == 'AbortError') {
          return false;
        }
        if(!err || (err.name != 'SecurityError' && err.name != 'NotAllowedError')) {
          console.warn(err);
        }
      }
    }

    return this._rememberLocalSaveTarget(default_name, null);
  }

  /**
   * Resolves a stored local save target entry.
   * @param {Object|string} target
   * @param {Object} [options]
   * @returns {Object|false}
   */
  _resolveLocalSaveTarget(target, options) {
    if(target && typeof target == 'object') {
      if(typeof target.token == 'string' && this.local_save_targets[target.token]) {
        return this.local_save_targets[target.token];
      }
      if(typeof target.filePath == 'string' && target.filePath.length) {
        return {
          name: this._sanitizeSaveDialogFileName(target.filePath, options),
          handle: null
        };
      }
    }
    if(typeof target == 'string' && target.length) {
      return {
        name: this._sanitizeSaveDialogFileName(target, options),
        handle: null
      };
    }
    return false;
  }

  /**
   * Displays the browser open dialog and imports the selected entries into workspace storage.
   * Returned paths point to workspace files/directories, not original OS paths.
   * @param {Object} [options]
   * @returns {Promise<Array|false>}
   */
  async _showOpenDialog(options) {
    var props = options && Array.isArray(options.properties) ? options.properties : ['openFile'];
    var allow_directory = props.includes('openDirectory');
    var allow_file = props.includes('openFile') || !allow_directory;
    var allow_multi = props.includes('multiSelections');
    var imported = [];
    var result = [];
    var dir_handle;
    var file_handles;
    var imported_root_path = '';

    try {
      if(allow_directory && !allow_file && this.runtime_info.supports_directory_picker) {
        dir_handle = await globalThis.showDirectoryPicker({
          id: 'jslab-open-directory',
          mode: 'read'
        });
        imported = await this.fs.importDirectoryHandle(dir_handle, '/workspace');
        imported_root_path = this.fs.join('/workspace', dir_handle && dir_handle.name ? dir_handle.name : 'folder');
      } else if(this.runtime_info.supports_open_picker) {
        file_handles = await globalThis.showOpenFilePicker({
          id: 'jslab-open-file',
          multiple: !!allow_multi,
          excludeAcceptAllOption: false,
          types: this._getOpenDialogFileTypes(options)
        });
        imported = await this.fs.importFileHandles(file_handles, '/workspace');
      } else if(allow_directory && this.runtime_info.supports_directory_picker) {
        dir_handle = await globalThis.showDirectoryPicker({
          id: 'jslab-open-directory',
          mode: 'read'
        });
        imported = await this.fs.importDirectoryHandle(dir_handle, '/workspace');
        imported_root_path = this.fs.join('/workspace', dir_handle && dir_handle.name ? dir_handle.name : 'folder');
      } else {
        return false;
      }
    } catch(err) {
      if(err && err.name == 'AbortError') {
        return false;
      }
      if(!err || (err.name != 'SecurityError' && err.name != 'NotAllowedError')) {
        console.warn(err);
      }
      return false;
    }

    if(!imported.length) {
      return false;
    }

    await this._refreshWorkspaceList();
    if(imported_root_path.length) {
      return [imported_root_path];
    }
    imported.forEach(function(entry) {
      if(entry && entry.path) {
        result.push(entry.path);
      }
    });
    return result;
  }

  /**
   * Converts file payloads to a browser Blob.
   * @param {*} data
   * @param {Object} [options]
   * @returns {Blob}
   */
  _createSaveBlob(data, options) {
    var mime_type = options && typeof options.mimeType == 'string' && options.mimeType.length
      ? options.mimeType
      : 'application/octet-stream';
    if(typeof Blob != 'undefined' && data instanceof Blob) {
      return data;
    }
    if(typeof data == 'string') {
      return new Blob([data], { type: mime_type || 'text/plain;charset=utf-8' });
    }
    if(typeof ArrayBuffer != 'undefined' && data instanceof ArrayBuffer) {
      return new Blob([data], { type: mime_type });
    }
    if(typeof ArrayBuffer != 'undefined' && ArrayBuffer.isView(data)) {
      return new Blob([data], { type: mime_type });
    }
    return new Blob([String(data == null ? '' : data)], { type: mime_type });
  }

  /**
   * Triggers a browser download for the provided Blob.
   * @param {string} file_name
   * @param {Blob} blob
   * @returns {boolean}
   */
  _downloadBlob(file_name, blob) {
    var link = document.createElement('a');
    var url = globalThis.URL.createObjectURL(blob);
    link.href = url;
    link.download = this._sanitizeSaveDialogFileName(file_name);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function() {
      globalThis.URL.revokeObjectURL(url);
    }, 1000);
    return true;
  }

  /**
   * Saves a payload to local disk using a picker handle or download fallback.
   * @param {Object|string} target
   * @param {*} data
   * @param {Object} [options]
   * @returns {Promise<boolean>}
   */
  async _saveLocalFile(target, data, options) {
    var entry = this._resolveLocalSaveTarget(target, options);
    if(!entry) {
      return false;
    }
    var blob = this._createSaveBlob(data, options);
    if(entry.handle && typeof entry.handle.createWritable == 'function') {
      try {
        var writable = await entry.handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch(err) {
        console.warn(err);
      }
    }
    return this._downloadBlob(entry.name, blob);
  }

  /**
   * Saves a payload to local disk without opening a picker.
   * @param {string} file_path
   * @param {*} data
   * @param {Object} [options]
   * @returns {boolean}
   */
  _downloadLocalFileSync(file_path, data, options) {
    var entry = this._resolveLocalSaveTarget(file_path, options);
    if(!entry) {
      return false;
    }
    return this._downloadBlob(entry.name, this._createSaveBlob(data, options));
  }

  /**
   * Merges streamed binary chunks into a single Uint8Array.
   * @param {Array} chunks
   * @returns {Uint8Array}
   */
  _mergeBinaryChunks(chunks) {
    var normalized = (chunks || []).map((chunk) => {
      if(chunk instanceof Uint8Array) {
        return chunk;
      }
      if(typeof ArrayBuffer != 'undefined' && chunk instanceof ArrayBuffer) {
        return new Uint8Array(chunk);
      }
      if(typeof ArrayBuffer != 'undefined' && ArrayBuffer.isView(chunk)) {
        return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      }
      return new Uint8Array(0);
    });
    var total = normalized.reduce(function(sum, chunk) {
      return sum + chunk.byteLength;
    }, 0);
    var data = new Uint8Array(total);
    var offset = 0;
    normalized.forEach(function(chunk) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    });
    return data;
  }

  /**
   * Converts SVG data to PDF in the browser runtime.
   * @param {string} svg_data
   * @param {number} width
   * @param {number} height
   * @param {Array} [fonts]
   * @returns {Promise<Uint8Array|false>}
   */
  async _svgToPdf(svg_data, width, height, fonts) {
    if(typeof globalThis.PDFDocument != 'function' ||
        typeof globalThis.SVGtoPDF != 'function') {
      return false;
    }
    var obj = this;
    return await new Promise(function(resolve, reject) {
      try {
        var doc = new globalThis.PDFDocument({
          size: [width, height]
        });
        if(Array.isArray(fonts) && fonts[0]) {
          doc.registerFont('Roboto', fonts[0]);
        }
        if(Array.isArray(fonts) && fonts[1]) {
          doc.registerFont('LatinModernMath', fonts[1]);
        }
        var chunks = [];
        doc.on('data', function(chunk) {
          chunks.push(chunk);
        });
        doc.on('end', function() {
          resolve(obj._mergeBinaryChunks(chunks));
        });
        globalThis.SVGtoPDF(doc, svg_data, 0, 0, {
          width: width,
          height: height,
          assumePt: true
        });
        doc.end();
      } catch(err) {
        reject(err);
      }
    }).then((result) => {
      if(result instanceof Uint8Array && result.byteLength) {
        return result;
      }
      return false;
    }).catch((err) => {
      console.warn(err);
      return false;
    });
  }

  /**
   * Renders command history.
   */
  _renderHistory() {
    this.history_cont.innerHTML = '';
    this.history.forEach((cmd) => {
      var div = document.createElement('div');
      if(cmd.startsWith('//')) {
        div.classList.add('comment');
      }
      div.textContent = cmd;
      this.history_cont.appendChild(div);
    });
    this.history_cont.scrollTop = this.history_cont.scrollHeight;
  }

  /**
   * Adds a command to history.
   * @param {string} cmd
   */
  _pushHistoryCommand(cmd) {
    this.history.push(cmd);
    while(this.history.length > this.history_max) {
      this.history.shift();
    }
    this.metadata.set('full_history', this.history);
    this._renderHistory();
  }

  /**
   * Adds a comment entry to history.
   * @param {string} cmd
   */
  _pushHistoryComment(cmd) {
    this._pushHistoryCommand(cmd);
  }

  /**
   * Opens a new untitled editor file and window.
   */
  async _openNewEditorWindow() {
    var index = 1;
    var file_path;
    do {
      file_path = '/workspace/Untitled-' + index + '.jsl';
      index += 1;
    } while(await this.fs.existsFile(file_path));

    await this.fs.writeTextFile(file_path, '');
    await this._refreshWorkspaceList();
    await this._openEditorWindow(file_path);
  }

  /**
   * Opens an editor window for a workspace file.
   * @param {string} file_path
   * @param {number} [lineno]
   */
  async _openEditorWindow(file_path, lineno) {
    var win = this._ensureEditorWindow();
    this.window_manager.show(this.editor_window_id);
    this.window_manager.focus(this.editor_window_id);

    if(typeof file_path == 'string' && file_path.length) {
      var editor_api = await this._getEditorWindowApi(win);
      await editor_api.openFile(String(file_path), Number.isFinite(lineno) ? Number(lineno) : 0);
    }
    return win;
  }

  /**
   * Opens the editor from sandbox code.
   * @param {string} file_path
   * @param {number} [lineno]
   */
  async openEditorFromSandbox(file_path, lineno) {
    if(typeof file_path == 'string' && file_path.length) {
      await this._openEditorWindow(file_path, lineno);
      return true;
    }
    await this._openNewEditorWindow();
    return true;
  }

  /**
   * Returns the shared editor window, creating it if needed.
   * @returns {Object}
   */
  _ensureEditorWindow() {
    var existing = this.window_manager.windows.get(this.editor_window_id);
    if(existing) {
      return existing;
    }

    return this.window_manager.createWindow({
      id: this.editor_window_id,
      title: 'Editor',
      width: 920,
      height: 640,
      minWidth: 720,
      minHeight: 500,
      srcdoc: this._renderWindowTemplate('editor-web.html', {
        '%WEB_EDITOR_FILE%': '""',
        '%WEB_EDITOR_LINE%': '0'
      }),
      onClose: () => {}
    });
  }

  /**
   * Waits for the shared editor window API.
   * @param {Object} win
   * @returns {Promise<Object>}
   */
  async _getEditorWindowApi(win) {
    await win.ready;
    for(var i = 0; i < 20; i++) {
      try {
        var api = win.iframe.contentWindow && win.iframe.contentWindow.__JSLAB_WEB_EDITOR__;
        if(api && typeof api.openFile == 'function') {
          return api;
        }
      } catch {}
      await new Promise(function(resolve) {
        setTimeout(resolve, 50);
      });
    }
    throw new Error('Editor window API is not available.');
  }

  /**
   * Handles runtime log messages emitted by the sandbox iframe.
   * @param {string} message
   * @param {string} [level]
   */
  handleSandboxRuntimeLog(message, level) {
    if(level == 'clear') {
      this._clearConsole();
      return;
    }
    if(level == 'warn') {
      var warn_text = String(message || '');
      this._appendCommandWindowMessage('data-in', '<span class="warn">' + this._prettyPrint(warn_text) + '</span>', warn_text);
      return;
    }
    if(level == 'error') {
      var error_text = String(message || '');
      this._appendCommandWindowMessage('data-in', '<span class="error">' + this._prettyPrint(error_text) + '</span>', error_text);
      return;
    }
    if(level == 'ans') {
      this._appendAnsMessage(message);
      return;
    }
    var text = String(message || '');
    if(level == 'latex') {
      this._appendLatexMessage(text);
      return;
    }
    if(level == 'monospaced') {
      this._appendCommandWindowMessage('data-in', '<div class="monospaced">' + this._prettyPrint(text) + '</div>', text);
      return;
    }
    if(level == 'result') {
      this._appendCommandWindowMessage('data-in', this._prettyPrint(text), text);
      return;
    }
    if(level == 'muted' || level == 'internal') {
      this._appendCommandWindowMessage('system-in', '<span class="log">' + this._prettyPrint(text) + '</span>', text);
      return;
    }
    this._appendCommandWindowMessage('data-in', this._prettyPrint(text), text);
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
   * Finds a managed window by its iframe contentWindow.
   * @param {Window} content_window
   * @returns {Object|false}
   */
  _findManagedWindowByContentWindow(content_window) {
    if(!this.window_manager || !content_window) {
      return false;
    }
    for(var win of this.window_manager.windows.values()) {
      if(win.iframe && win.iframe.contentWindow === content_window) {
        return win;
      }
    }
    return false;
  }

  /**
   * Returns a built-in app asset from the generated web asset map.
   * @param {string} asset_path
   * @returns {string|false}
   */
  getAppAssetSync(asset_path) {
    var normalized = String(asset_path || '').replace(/\\/g, '/').replace(/\/+/g, '/');
    var assets = globalThis.__JSLAB_WEB_APP_ASSETS__ || {};
    if(!Object.prototype.hasOwnProperty.call(assets, normalized)) {
      return false;
    }
    return String(assets[normalized]).split('%WEB_HTML_BASE%').join(this._getWindowHtmlBaseHref());
  }

  /**
   * Opens a managed JSLAB window for the sandbox env.
   * @param {number|string} wid
   * @param {string} file
   * @returns {Object|false}
   */
  openManagedWindow(wid, file) {
    var file_name = this._getWindowTemplateName(file);
    if(!file_name) {
      return false;
    }

    if(file_name == 'editor-web.html') {
      var editor_win = this._ensureEditorWindow();
      this.window_manager.show(this.editor_window_id);
      this.window_manager.focus(this.editor_window_id);
      return {
        win: editor_win,
        context: editor_win.iframe.contentWindow,
        ready: editor_win.ready.then(function() {
          return editor_win.iframe.contentWindow;
        })
      };
    }

    var template = this._renderWindowTemplate(file_name, file_name == 'editor-web.html' ? {
      '%WEB_EDITOR_FILE%': '""',
      '%WEB_EDITOR_LINE%': '0'
    } : undefined);
    if(!template) {
      return false;
    }

    var defaults = this._getWindowDefaults(file_name);
    var id = String(wid);
    var win = this.window_manager.createWindow({
      id: id,
      title: defaults.title,
      width: defaults.width,
      height: defaults.height,
      minWidth: defaults.minWidth,
      minHeight: defaults.minHeight,
      srcdoc: template,
      onClose: () => {
        if(this.sandbox_api && typeof this.sandbox_api.notifyWindowClosed == 'function') {
          this.sandbox_api.notifyWindowClosed(wid);
        }
      }
    });

    win.ready.then(() => {
      try {
        var content_title = win.iframe.contentDocument && win.iframe.contentDocument.title;
        if(content_title) {
          win.setTitle(content_title);
        }
      } catch {}
      return win.iframe.contentWindow;
    });

    return {
      win: win,
      context: win.iframe.contentWindow,
      ready: win.ready.then(function() {
        return win.iframe.contentWindow;
      })
    };
  }

  /**
   * Closes a managed JSLAB window.
   * @param {number|string} wid
   * @param {Object} [options]
   * @returns {boolean}
   */
  closeManagedWindow(wid, options) {
    var opts = options || {};
    if(wid == 'all') {
      var ids = [...this.window_manager.windows.keys()];
      ids.forEach((id) => {
        this.closeManagedWindow(id, opts);
      });
      return true;
    }

    var target = this.window_manager.windows.get(String(wid));
    if(!target) {
      return false;
    }
    if(opts.notifySandbox === false) {
      target.onClose = function() {};
    }
    return this.window_manager.close(String(wid));
  }

  /**
   * Resolves the browser template name for a requested window file.
   * @param {string} file
   * @returns {string|false}
   */
  _getWindowTemplateName(file) {
    var normalized = String(file || '').replace(/\\/g, '/');
    if(/^https?:\/\//i.test(normalized)) {
      globalThis.open(normalized, '_blank', 'noopener');
      return false;
    }

    var base_name = normalized.split('/').pop();
    if(base_name == 'editor.html') {
      return 'editor-web.html';
    }
    var templates = globalThis.__JSLAB_WEB_WINDOW_TEMPLATES__ || {};
    return Object.prototype.hasOwnProperty.call(templates, base_name) ? base_name : false;
  }

  /**
   * Returns default managed-window dimensions for a template.
   * @param {string} file_name
   * @returns {Object}
   */
  _getWindowDefaults(file_name) {
    var defaults = {
      'blank.html': { title: 'Window', width: 720, height: 520, minWidth: 250, minHeight: 50 },
      'plotlyjs.html': { title: 'Plotlyjs Plot', width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'd3.html': { title: 'D3 Canvas', width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'leaflet.html': { title: 'Leaflet Plot', width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'cesium.html': { title: 'Cesium Plot', width: 980, height: 720, minWidth: 250, minHeight: 50 },
      'three.html': { title: 'THREE', width: 980, height: 720, minWidth: 250, minHeight: 50 },
      'figure.html': { title: 'Figure', width: 900, height: 640, minWidth: 250, minHeight: 50 },
      'mermaid_graph.html': { title: 'Graph', width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'serial_terminal.html': { title: 'Serial Terminal', width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'url.html': { title: 'URL', width: 980, height: 720, minWidth: 250, minHeight: 50 },
      'documentation.html': { title: 'Documentation', width: 1120, height: 760, minWidth: 250, minHeight: 50 },
      'presentation-editor.html': { title: 'Presentation Editor', width: 920, height: 640, minWidth: 720, minHeight: 500 },
      'editor-web.html': { title: 'Editor', width: 920, height: 640, minWidth: 720, minHeight: 500 }
    };
    return defaults[file_name] || { title: 'Window', width: 720, height: 520, minWidth: 250, minHeight: 50 };
  }

  /**
   * Renders a generated window template.
   * @param {string} template_name
   * @param {Object} [replacements]
   * @returns {string}
   */
  _renderWindowTemplate(template_name, replacements) {
    var templates = globalThis.__JSLAB_WEB_WINDOW_TEMPLATES__ || {};
    var html = Object.prototype.hasOwnProperty.call(templates, template_name)
      ? templates[template_name]
      : '';
    if(!html) {
      return '';
    }
    html = html.split('%WEB_HTML_BASE%').join(this._getWindowHtmlBaseHref());
    html = html.split('%WEB_DOCS_BASE%').join(this._getDocsBaseHref());
    Object.keys(replacements || {}).forEach(function(key) {
      html = html.split(key).join(replacements[key]);
    });
    return html;
  }

  /**
   * Returns the absolute base href used by srcdoc subwindows.
   * @returns {string}
   */
  _getWindowHtmlBaseHref() {
    try {
      return new URL('./html/', globalThis.location.href).href;
    } catch {
      return './html/';
    }
  }

  /**
   * Returns the absolute base href used by documentation srcdoc windows.
   * @returns {string}
   */
  _getDocsBaseHref() {
    try {
      return new URL('./docs/', globalThis.location.href).href;
    } catch {
      return './docs/';
    }
  }

  /**
   * Initializes the command window controller.
   */
  _initCommandWindow() {
    if(typeof globalThis.CodeMirror != 'function') {
      return;
    }

    this.code_input = globalThis.CodeMirror.fromTextArea(this.command_input, {
      mode: 'javascript',
      theme: 'notepadpp',
      indentUnit: 2,
      tabSize: 2,
      lineWrapping: true,
      matchBrackets: true,
      gutter: true,
      gutters: ['CodeMirror-lint-markers'],
      lint: this._createJavascriptLintOptions(),
      highlightSelectionMatches: { annotateScrollbar: true },
      viewportMargin: Infinity,
      extraKeys: {
        Enter: () => {
          this._runCommand();
        }
      }
    });

    globalThis.CodeMirror.keyMap.default['Shift-Tab'] = 'indentLess';
    globalThis.CodeMirror.keyMap.default.Tab = 'indentMore';

    this.code_input.on('keypress', function(cm, event) {
      if(!cm.state.completionActive &&
          !event.ctrlKey &&
          event.key != 'Enter' &&
          event.key != ';' &&
          event.key != ' ' &&
          event.key != '{' &&
          event.key != '}') {
        if(typeof globalThis.CodeMirror.commands.autocomplete == 'function') {
          globalThis.CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
        }
      }
    });

    this.code_input.on('keydown', async (_cm, event) => {
      await this._handleCommandInputKeyDown(event);
    });

    this.code_doc_hover = new PRDC_JSLAB_CODE_DOC_HOVER({
      on_print_doc: (entry) => {
        var query = entry && entry.doc_query ? entry.doc_query : '';
        if(query.length) {
          this.showDocumentation(query);
        }
      }
    });
    this.code_doc_hover.attach(this.code_input);

    this._setTimestamp();
    this._setAutoscroll();
    this._setNMessagesMax();
    this._setWriteTimestamps();
  }

  /**
   * Creates browser lint settings matching the Electron CodeMirror config shape.
   * @returns {Object}
   */
  _createJavascriptLintOptions() {
    return createCodeMirrorLintOptions(globalThis.CodeMirror);
  }

  /**
   * Handles command window key bindings.
   * @param {KeyboardEvent} event
   */
  async _handleCommandInputKeyDown(event) {
    var commands = this._getCommandHistory();
    if(event.key == 'Escape' && !this.code_input.state.completionActive) {
      this.code_input.setValue('');
      this._resetHistoryIndex();
      this._scrollConsoleToBottom();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'ArrowUp' && !this.code_input.state.completionActive) {
      var cursor_up = this.code_input.getCursor();
      var last_line_up = this.code_input.lineCount() - 1;
      var last_pos_up = this.code_input.getLine(last_line_up).length;
      if(cursor_up.line == 0 && (cursor_up.ch == last_pos_up || cursor_up.ch == 0)) {
        if(this.command_history_index < commands.length - 1) {
          this.command_history_index += 1;
          this._setCommandInputValue(commands[this.command_history_index]);
          this._scrollConsoleToBottom();
        }
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if(event.key == 'ArrowDown' && !this.code_input.state.completionActive) {
      var cursor_down = this.code_input.getCursor();
      var last_line_down = this.code_input.lineCount() - 1;
      var last_pos_down = this.code_input.getLine(last_line_down).length;
      if(cursor_down.line == last_line_down && (cursor_down.ch == last_pos_down || cursor_down.ch == 0)) {
        if(this.command_history_index > 0) {
          this.command_history_index -= 1;
          this._setCommandInputValue(commands[this.command_history_index]);
        }
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if(event.key == 'PageUp') {
      if(commands.length) {
        this.command_history_index = commands.length - 1;
        this._setCommandInputValue(commands[commands.length - 1]);
        this._scrollConsoleToBottom();
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'PageDown') {
      if(commands.length) {
        this.command_history_index = 0;
        this._setCommandInputValue(commands[0]);
        this._scrollConsoleToBottom();
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'F3') {
      event.preventDefault();
      event.stopPropagation();
      if(commands.length) {
        await this._evaluateCommand(commands[0]);
      }
      return;
    }

    if(event.key == 'F7' && event.altKey) {
      this._resetHistoryIndex();
      this.history = this.history.filter(function(cmd) {
        return cmd.startsWith('//');
      });
      this.metadata.set('full_history', this.history);
      this._renderHistory();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'F7') {
      this._renderHistoryDialog();
      this._openTerminalDialog(this.command_history_dialog);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'F8') {
      var cursor = this.code_input.getCursor();
      var prefix = this.code_input.getLine(cursor.line).substring(0, cursor.ch);
      var match_index = -1;
      for(var i = 0; i < commands.length; i++) {
        if(commands[i].startsWith(prefix)) {
          if(match_index > -1) {
            if(i > this.command_history_index) {
              match_index = i;
              break;
            }
          } else {
            match_index = i;
            if(this.command_history_index == -1) {
              break;
            }
          }
        }
      }
      if(match_index > -1) {
        this.command_history_index = match_index;
        this._setCommandInputValue(commands[this.command_history_index]);
        if(commands[this.command_history_index].length > cursor.ch) {
          this.code_input.focus();
          this.code_input.setCursor(cursor);
        }
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.ctrlKey && event.key.toLowerCase() == 's') {
      this._openTerminalDialog(this.command_settings_dialog);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.ctrlKey && event.key.toLowerCase() == 'l') {
      this._openTerminalDialog(this.command_log_dialog);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  /**
   * Returns non-comment history commands in desktop order.
   * @returns {Array<string>}
   */
  _getCommandHistory() {
    return this.history.filter(function(cmd) {
      return !cmd.startsWith('//');
    }).slice().reverse();
  }

  /**
   * Resets the command history cursor.
   */
  _resetHistoryIndex() {
    this.command_history_index = -1;
  }

  /**
   * Sets command input value and focuses the editor.
   * @param {string} value
   */
  _setCommandInputValue(value) {
    if(!this.code_input) {
      this.command_input.value = String(value || '');
      this.command_input.focus();
      return;
    }
    this.code_input.setValue(String(value || ''));
    this.code_input.focus();
    this.code_input.setCursor(this.code_input.lineCount(), 0);
  }

  /**
   * Focuses the command input editor.
   */
  _focusCommandInput() {
    if(!this.code_input) {
      this.command_input.focus();
      return;
    }
    this.code_input.focus();
    this.code_input.setCursor(this.code_input.lineCount(), 0);
  }

  /**
   * Opens a terminal dialog panel.
   * @param {HTMLElement} dialog
   */
  _openTerminalDialog(dialog) {
    if(!dialog || dialog.style.display == 'block') {
      return;
    }
    document.querySelectorAll('.terminal-dialog').forEach(function(node) {
      node.style.display = 'none';
    });
    dialog.style.display = 'block';
    dialog.focus();
  }

  /**
   * Closes a terminal dialog panel.
   * @param {HTMLElement} dialog
   */
  _closeTerminalDialog(dialog) {
    if(dialog) {
      dialog.style.display = 'none';
    }
    this._focusCommandInput();
  }

  /**
   * Updates terminal timestamp display state.
   */
  _setTimestamp() {
    var button = document.getElementById('command-window-timestamp-button');
    if(this.show_timestamp) {
      this.console_messages.classList.remove('no-timestamp');
      button.classList.add('active');
      button.setAttribute('title', this.language.currentString(41));
      button.setAttribute('title-str', '41');
    } else {
      this.console_messages.classList.add('no-timestamp');
      button.classList.remove('active');
      button.setAttribute('title', this.language.currentString(166));
      button.setAttribute('title-str', '166');
    }
    this.metadata.set('show_timestamp', this.show_timestamp);
  }

  /**
   * Updates terminal autoscroll state.
   */
  _setAutoscroll() {
    var button = document.getElementById('command-window-autoscroll-button');
    if(this.autoscroll) {
      button.classList.add('active');
      button.setAttribute('title', this.language.currentString(42));
      button.setAttribute('title-str', '42');
    } else {
      button.classList.remove('active');
      button.setAttribute('title', this.language.currentString(167));
      button.setAttribute('title-str', '167');
    }
    this.metadata.set('autoscroll', this.autoscroll);
  }

  /**
   * Updates terminal message-limit setting.
   */
  _setNMessagesMax() {
    if(isFinite(this.N_messages_max) && this.N_messages_max < this.min_messages_max) {
      this.N_messages_max = this.min_messages_max;
    }
    document.getElementById('command-window-messages-max-input').value = isFinite(this.N_messages_max)
      ? String(this.N_messages_max)
      : 'Infinity';
    this.metadata.set('N_messages_max', isFinite(this.N_messages_max) ? this.N_messages_max : 'Infinity');
    this._trimConsoleLog();
  }

  /**
   * Updates write-timestamps state for saved logs.
   */
  _setWriteTimestamps() {
    var input = document.getElementById('command-window-write-timestamps');
    if(input) {
      input.checked = this.write_timestamps;
    }
    this.metadata.set('write_timestamps', this.write_timestamps);
  }

  /**
   * Saves terminal log through the shared web save dialog.
   */
  async _saveLog() {
    var lines = [];
    this.command_log.forEach((entry) => {
      var line = entry.class + ': ';
      if(this.write_timestamps) {
        line += '[' + entry.timestamp + '] ';
      }
      line += entry.raw;
      lines.push(line);
    });
    var file_name = 'jslab_' + new Date().toISOString().replace(/[:T]/g, '_').replace(/\..+$/, '') + '.log';
    var save_target = await this._showSaveDialog({
      title: this.language.currentString(150) || 'Save log as',
      defaultPath: file_name,
      buttonLabel: this.language.currentString(151) || 'Save',
      filters: [{ name: 'log', extensions: ['log'] }]
    });
    if(!save_target) {
      return false;
    }
    return this._saveLocalFile(save_target, lines.join('\r\n'), {
      mimeType: 'text/plain;charset=utf-8',
      filePath: file_name
    });
  }

  /**
   * Clears rendered console output and the saved log buffer.
   */
  _clearConsole() {
    this.console_messages.innerHTML = '';
    this.command_log = [];
  }

  /**
   * Scrolls the command window to the bottom.
   * @param {boolean} [focus_input=false]
   */
  _scrollConsoleToBottom(focus_input = false) {
    this.command_panel.scrollTop = this.command_panel.scrollHeight;
    if(focus_input) {
      this._focusCommandInput();
    }
  }

  /**
   * Builds timestamp text identical to the desktop command window.
   * @returns {string}
   */
  _getTimestamp() {
    var date = new Date();
    var pad = function(num, size) {
      return ('000' + num).slice(size * -1);
    };
    var time = parseFloat(date.getTime() / 1000).toFixed(3);
    var hours = date.getHours();
    var minutes = Math.floor(time / 60) % 60;
    var seconds = Math.floor(time - minutes * 60);
    var milliseconds = time.slice(-3);
    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' + pad(seconds, 2) + '.' + pad(milliseconds, 3);
  }

  /**
   * Applies desktop-like formatting for terminal text.
   * @param {*} data
   * @returns {string}
   */
  _prettyPrint(data) {
    if(typeof data == 'string') {
      return data.replace(/\n/g, '<br/>');
    }
    if(typeof data == 'object' && data !== null) {
      try {
        if(!Object.keys(data).length) {
          if(data.constructor && data.constructor.name == 'Error' && data.stack) {
            return String(data.stack).replace(/\n/g, '<br/>');
          }
          return String(data);
        }
        return JSON.stringify(data, this._getCircularReplacer(), 2);
      } catch {}
    }
    return String(data);
  }

  /**
   * Provides a JSON.stringify replacer that drops circular references.
   * @returns {Function}
   */
  _getCircularReplacer() {
    var seen = new WeakSet();
    return function(_key, value) {
      if(typeof value == 'object' && value !== null) {
        if(seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    };
  }

  /**
   * Highlights command text when highlight.js is available.
   * @param {string} code
   * @returns {string}
   */
  _highlightCode(code) {
    if(globalThis.hljs && typeof globalThis.hljs.highlight == 'function') {
      return globalThis.hljs.highlight(String(code), { language: 'javascript' }).value
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
    }
    return escapeHtml(String(code)).replace(/\n/g, '<br/>');
  }

  /**
   * Adds a terminal message entry.
   * @param {string} message_class
   * @param {string} html
   * @param {string} [raw]
   */
  _appendCommandWindowMessage(message_class, html, raw) {
    var entry = document.createElement('div');
    entry.className = message_class;
    entry.innerHTML = '<span class="timestamp">' + this._getTimestamp() + '</span>' + html;
    this.console_messages.appendChild(entry);
    this.command_log.push({
      class: message_class,
      raw: typeof raw == 'string' ? raw : String(raw || ''),
      timestamp: this._getTimestamp()
    });
    this._trimConsoleLog();
    if(this.autoscroll) {
      this._scrollConsoleToBottom();
    }
    return entry;
  }

  /**
   * Renders one LaTeX output entry using MathJax, matching the desktop path.
   * @param {string} text
   */
  _appendLatexMessage(text) {
    var entry = this._appendCommandWindowMessage('data-in', '\\(' + text + '\\)', text);
    if(typeof MathJax != 'undefined' && typeof MathJax.typesetPromise == 'function') {
      MathJax.typesetPromise([entry]).catch(function(err) {
        console.error(err);
      });
    } else if(typeof MathJax != 'undefined' && typeof MathJax.typeset == 'function') {
      try {
        MathJax.typeset([entry]);
      } catch(err) {
        console.error(err);
      }
    }
  }

  /**
   * Truncates nested strings for large ans JSON output.
   * @param {*} data
   * @returns {*}
   */
  _truncateStrings(data) {
    var max_length = Number(app_config.MAX_JSON_STRING_LENGTH);
    if(!isFinite(max_length) || max_length < 1) {
      max_length = 1000;
    }
    if(typeof data === 'string') {
      if(data.length <= max_length) {
        return data;
      }
      var suffix_prefix = ' ... [truncated | full size: ';
      var suffix_suffix = ']';
      var prefix_length = max_length;
      while(true) {
        var full_size_digits = String(data.length).length;
        var suffix_length = suffix_prefix.length + full_size_digits + suffix_suffix.length;
        var new_prefix_length = max_length - suffix_length;
        if(new_prefix_length >= prefix_length) {
          prefix_length = new_prefix_length;
          break;
        }
        if(new_prefix_length === prefix_length) {
          break;
        }
        prefix_length = new_prefix_length;
      }
      return data.slice(0, Math.max(0, prefix_length)) +
        suffix_prefix + data.length + suffix_suffix;
    }
    if(Array.isArray(data)) {
      return data.map((value) => this._truncateStrings(value));
    }
    if(data && typeof data === 'object') {
      var output = {};
      Object.keys(data).forEach((key) => {
        output[key] = this._truncateStrings(data[key]);
      });
      return output;
    }
    return data;
  }

  /**
   * Returns true for scalar-like ans values.
   * @param {*} value
   * @returns {boolean}
   */
  _isAnsScalarValue(value) {
    return value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean';
  }

  /**
   * Formats scalar ans values.
   * @param {*} value
   * @returns {string}
   */
  _formatAnsScalarValue(value) {
    if(typeof value === 'string') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Extracts vector values from parsed ans payload.
   * @param {*} json_data
   * @returns {Array|undefined}
   */
  _getAnsVectorValues(json_data) {
    if(!Array.isArray(json_data) || !json_data.length) {
      return;
    }
    if(json_data.every((value) => this._isAnsScalarValue(value))) {
      return json_data;
    }
    if(json_data.every((value) =>
      Array.isArray(value) &&
      value.length === 1 &&
      this._isAnsScalarValue(value[0]))) {
      return json_data.map(function(value) {
        return value[0];
      });
    }
  }

  /**
   * Extracts matrix values from parsed ans payload.
   * @param {*} json_data
   * @returns {Array|undefined}
   */
  _getAnsMatrixValues(json_data) {
    if(!Array.isArray(json_data) || !json_data.length) {
      return;
    }
    var cols = undefined;
    for(var i = 0; i < json_data.length; i++) {
      var row = json_data[i];
      if(!Array.isArray(row) || !row.length) {
        return;
      }
      if(cols === undefined) {
        cols = row.length;
      } else if(row.length !== cols) {
        return;
      }
      if(!row.every((value) => this._isAnsScalarValue(value))) {
        return;
      }
    }
    return json_data;
  }

  /**
   * Tries to render ans as a horizontal vector.
   * @param {*} json_data
   * @param {string} raw
   * @returns {boolean}
   */
  _renderHorizontalVectorAns(json_data, raw) {
    var vector_values = this._getAnsVectorValues(json_data);
    var max_items = Number(app_config.ANS_VECTOR_HORIZONTAL_MAX_ITEMS);
    if(!vector_values) {
      return false;
    }
    if(!isFinite(max_items) || max_items < 1) {
      max_items = 50;
    }
    if(vector_values.length > max_items) {
      return false;
    }
    var values_text = [];
    for(var i = 0; i < vector_values.length; i++) {
      values_text.push(this._formatAnsScalarValue(vector_values[i]));
    }
    var horizontal_code = 'ans = [' + values_text.join(', ') + ']';
    this._appendCommandWindowMessage('data-in', this._highlightCode(horizontal_code), raw);
    return true;
  }

  /**
   * Tries to render ans as a small 2D matrix.
   * @param {*} json_data
   * @param {string} raw
   * @returns {boolean}
   */
  _renderSmallMatrixAns(json_data, raw) {
    var matrix_values = this._getAnsMatrixValues(json_data);
    var max_rows = Number(app_config.ANS_MATRIX_PRETTY_MAX_ROWS);
    var max_cols = Number(app_config.ANS_MATRIX_PRETTY_MAX_COLS);
    var max_items = Number(app_config.ANS_MATRIX_PRETTY_MAX_ITEMS);
    if(!matrix_values) {
      return false;
    }
    var rows = matrix_values.length;
    var cols = matrix_values[0].length;
    if(!isFinite(max_rows) || max_rows < 1) {
      max_rows = 10;
    }
    if(!isFinite(max_cols) || max_cols < 1) {
      max_cols = 10;
    }
    if(!isFinite(max_items) || max_items < 1) {
      max_items = 100;
    }
    if(rows > max_rows || cols > max_cols || (rows * cols) > max_items) {
      return false;
    }
    var row_strings = [];
    for(var i = 0; i < rows; i++) {
      var values_text = [];
      for(var j = 0; j < cols; j++) {
        values_text.push(this._formatAnsScalarValue(matrix_values[i][j]));
      }
      row_strings.push('[' + values_text.join(', ') + ']');
    }
    var matrix_code = 'ans = [\n  ' + row_strings.join(',\n  ') + '\n]';
    this._appendCommandWindowMessage('data-in', this._highlightCode(matrix_code), raw);
    return true;
  }

  /**
   * Renders ans output closer to the Electron command window.
   * @param {*} data
   */
  _appendAnsMessage(data) {
    if(Array.isArray(data) && data.length >= 2) {
      var raw = 'ans = ' + data[0];
      if(data[1]) {
        try {
          var parsed_data = typeof data[0] === 'string' ? JSON.parse(data[0]) : data[0];
          var json_data = this._truncateStrings(parsed_data);
          if(this._renderHorizontalVectorAns(json_data, raw)) {
            return;
          }
          if(this._renderSmallMatrixAns(json_data, raw)) {
            return;
          }
          var structured_entry = this._appendCommandWindowMessage('data-in', 'ans = ', raw);
          BigJsonViewerDom.fromObject(json_data).then(function(viewer) {
            if(!structured_entry || !structured_entry.parentNode) {
              return;
            }
            var node = viewer.getRootElement();
            structured_entry.appendChild(node);
            node.openAll(1);
          }).catch(function(err) {
            console.error(err);
          });
          return;
        } catch(err) {
          console.error(err);
        }
      }
      this._appendCommandWindowMessage('data-in', this._highlightCode(raw), raw);
      return;
    }

    var text = String(data || '');
    var raw = 'ans = ' + text;
    try {
      var parsed_data = JSON.parse(text);
      var json_data = this._truncateStrings(parsed_data);
      if(this._renderHorizontalVectorAns(json_data, raw)) {
        return;
      }
      if(this._renderSmallMatrixAns(json_data, raw)) {
        return;
      }
      var entry = this._appendCommandWindowMessage('data-in', 'ans = ', raw);
      BigJsonViewerDom.fromObject(json_data).then(function(viewer) {
        if(!entry || !entry.parentNode) {
          return;
        }
        var node = viewer.getRootElement();
        entry.appendChild(node);
        node.openAll(1);
      }).catch(function(err) {
        console.error(err);
      });
      return;
    } catch {}
    this._appendCommandWindowMessage('data-in', this._highlightCode(raw), raw);
  }

  /**
   * Enforces the configured message limit.
   */
  _trimConsoleLog() {
    if(!isFinite(this.N_messages_max)) {
      return;
    }
    while(this.command_log.length > this.N_messages_max) {
      this.command_log.shift();
      var first_logged = this.console_messages.querySelector(':scope > div:not([data-static-entry="true"])');
      if(first_logged && first_logged.parentNode === this.console_messages) {
        this.console_messages.removeChild(first_logged);
      }
    }
  }

  /**
   * Renders the desktop welcome message.
   */
  _renderWelcomeMessage() {
    var version = globalThis.__JSLAB_WEB_APP_VERSION__ || '';
    this.console_messages.innerHTML =
      '<div class="welcome-message system-in message" data-static-entry="true">' +
        '<span class="timestamp">' + this._getTimestamp() + '</span>' +
        '<img class="app-logo" src="./img/JSLAB.svg">' +
        '<img class="company-logo" src="./img/PR-DC_icon.svg">' +
        '<div class="clear"></div>' +
        '<p><span>JSLAB</span>, ' + escapeHtml(this.language.string(8)) + ' ' + escapeHtml(version) + '</p>' +
        '<p>' + escapeHtml(this.language.string(136)) + ' ' + new Date().getFullYear() + ' &copy; <span>PR-DC</span> info@pr-dc.com</p>' +
        '<p>' + escapeHtml(this.language.string(137)) + '</p>' +
        '<p>' + escapeHtml(this.language.string(138)) + '</p>' +
        '<p>' + escapeHtml(this.language.string(139)) + ' <span>cmd_help</span></p>' +
        '<p>' + escapeHtml(this.language.string(135)) + ' <a href="https://pr-dc.com/jslab" target="_blank" rel="noopener">pr-dc.com/jslab</a></p>' +
        '<p>' + escapeHtml(this.language.string(249)) + ': ' +
          '<a href="https://pr-dc.com/jslab/" target="_blank" rel="noopener">' + escapeHtml(this.language.string(250)) + '</a> &bull; ' +
          '<a href="https://discourse.jsl.pr-dc.com/" target="_blank" rel="noopener">' + escapeHtml(this.language.string(251)) + '</a> &bull; ' +
          '<a href="https://pr-dc.com/jslab/doc/" target="_blank" rel="noopener">' + escapeHtml(this.language.string(252)) + '</a> &bull; ' +
          '<a href="https://github.com/PR-DC/JSLAB/" target="_blank" rel="noopener">' + escapeHtml(this.language.string(253)) + '</a> &bull; ' +
          '<a href="https://github.com/PR-DC/JSLAB/releases" target="_blank" rel="noopener">' + escapeHtml(this.language.string(254)) + '</a> &bull; ' +
          '<a href="https://github.com/PR-DC/JSLAB/tree/master/examples" target="_blank" rel="noopener">' + escapeHtml(this.language.string(255)) + '</a>' +
        '</p>' +
      '</div>';
  }

  /**
   * Evaluates JSLAB code while optionally preserving current input.
   * @param {string} code
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async _evaluateCommand(code, options) {
    if(!this.sandbox_api) {
      return;
    }

    var opts = options || {};
    var command = String(code || '').trim();
    if(!command.length) {
      return;
    }

    var previous_input = opts.preserve_input && this.code_input
      ? this.code_input.getValue()
      : undefined;
    var previous_cursor = opts.preserve_input && this.code_input
      ? this.code_input.getCursor()
      : undefined;

    this._pushHistoryCommand(command);
    this._appendCommandWindowMessage('data-out', this._highlightCode(command), command);
    if(opts.preserve_input && this.code_input) {
      // Keep input restoration logic below.
    } else if(this.code_input) {
      this.code_input.setValue('');
      this._scrollConsoleToBottom();
      this._resetHistoryIndex();
    }
    this._setStatus('busy', 'Evaluating...');

    try {
      var result = await this.sandbox_api.evaluate(command);
      this._renderWorkspaceVariables(result.workspace || []);
      this._setStatus('ready', '', 87);
    } catch(_err) {
      this._setStatus('ready', '', 87);
    }

    if(opts.preserve_input && this.code_input) {
      this.code_input.setValue(previous_input || '');
      this.code_input.focus();
      if(previous_cursor) {
        this.code_input.setCursor(previous_cursor);
      }
    } else if(this.code_input) {
      this.code_input.focus();
      this.code_input.setCursor(this.code_input.lineCount(), 0);
    }
  }

  /**
   * Renders the history dialog contents.
   */
  _renderHistoryDialog() {
    var obj = this;
    var commands = this._getCommandHistory();
    this.command_history_list.innerHTML = '';
    if(!commands.length) {
      this.command_history_list.innerHTML = '<div class="history-empty">' + escapeHtml(this.language.currentString(346)) + '</div>';
      return;
    }

    commands.forEach(function(cmd, index) {
      var row = document.createElement('li');
      row.setAttribute('i', String(index));
      row.textContent = cmd;
      if(index == obj.command_history_index) {
        row.classList.add('active');
      }
      row.addEventListener('click', function() {
        obj.command_history_list.querySelectorAll('li').forEach(function(node) {
          node.classList.remove('active');
        });
        row.classList.add('active');
        obj.command_history_index = index;
      });
      obj.command_history_list.appendChild(row);
    });
  }

  /**
   * Handles keyboard navigation inside the history dialog.
   * @param {KeyboardEvent} event
   */
  async _handleHistoryDialogKeyDown(event) {
    var commands = this._getCommandHistory();
    var activateCommand = () => {
      var active = this.command_history_list.querySelector('li.active');
      if(active) {
        active.classList.remove('active');
      }
      var next = this.command_history_list.querySelector('li[i="' + this.command_history_index + '"]');
      if(next) {
        next.classList.add('active');
        next.scrollIntoView({ block: 'center', inline: 'center' });
        this._setCommandInputValue(commands[this.command_history_index]);
      }
    };

    if(event.key == 'Enter' && !event.shiftKey) {
      var active = this.command_history_list.querySelector('li.active');
      if(active) {
        await this._evaluateCommand(active.textContent, { preserve_input: true });
      }
      this._closeTerminalDialog(this.command_history_dialog);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'Escape') {
      this._closeTerminalDialog(this.command_history_dialog);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'ArrowUp') {
      if(this.command_history_index > 0) {
        this.command_history_index -= 1;
        activateCommand();
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'ArrowDown') {
      if(this.command_history_index < commands.length - 1) {
        this.command_history_index += 1;
        activateCommand();
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'PageUp') {
      if(commands.length) {
        this.command_history_index = 0;
        activateCommand();
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if(event.key == 'PageDown') {
      if(commands.length) {
        this.command_history_index = commands.length - 1;
        activateCommand();
      }
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Opens the workspace context menu.
   * @param {string} variable
   * @param {number} left
   * @param {number} top
   */
  _openWorkspaceContextMenu(variable, left, top) {
    if(!this.workspace_context_menu || !variable) {
      return;
    }
    this._hideFileBrowserImportMenu();
    this.workspace_context_variable = variable;
    this.workspace_context_menu.style.display = 'block';
    this.workspace_context_menu.style.left = '0px';
    this.workspace_context_menu.style.top = '0px';

    var rect = this.workspace_context_menu.getBoundingClientRect();
    var x = left;
    var y = top;
    var margin = 4;

    if((x + rect.width) > globalThis.innerWidth - margin) {
      x = Math.max(margin, globalThis.innerWidth - rect.width - margin);
    }
    if((y + rect.height) > globalThis.innerHeight - margin) {
      y = Math.max(margin, globalThis.innerHeight - rect.height - margin);
    }

    this.workspace_context_menu.style.left = x + 'px';
    this.workspace_context_menu.style.top = y + 'px';
  }

  /**
   * Hides the workspace context menu.
   */
  _hideWorkspaceContextMenu() {
    if(this.workspace_context_menu) {
      this.workspace_context_menu.style.display = 'none';
    }
    this.workspace_context_variable = undefined;
  }

  /**
   * Opens the file browser context menu.
   * @param {string} file_path
   * @param {string} kind
   * @param {number} left
   * @param {number} top
   */
  _openFileBrowserContextMenu(file_path, kind, left, top) {
    if(!this.file_browser_context_menu || !file_path) {
      return;
    }
    this._hideFileBrowserImportMenu();
    this._hideWorkspaceContextMenu();
    this.file_browser_context_path = file_path;
    this.file_browser_context_kind = kind || 'file';
    this.file_browser_context_menu.style.display = 'block';
    this.file_browser_context_menu.style.left = '0px';
    this.file_browser_context_menu.style.top = '0px';

    var rect = this.file_browser_context_menu.getBoundingClientRect();
    var x = left;
    var y = top;
    var margin = 4;

    if((x + rect.width) > globalThis.innerWidth - margin) {
      x = Math.max(margin, globalThis.innerWidth - rect.width - margin);
    }
    if((y + rect.height) > globalThis.innerHeight - margin) {
      y = Math.max(margin, globalThis.innerHeight - rect.height - margin);
    }

    this.file_browser_context_menu.style.left = x + 'px';
    this.file_browser_context_menu.style.top = y + 'px';
  }

  /**
   * Hides the file browser context menu.
   */
  _hideFileBrowserContextMenu() {
    if(this.file_browser_context_menu) {
      this.file_browser_context_menu.style.display = 'none';
    }
    this.file_browser_context_path = undefined;
    this.file_browser_context_kind = undefined;
  }

  /**
   * Removes the selected file browser item from workspace storage.
   */
  async _removeSelectedWorkspaceFile() {
    if(!this.file_browser_context_path) {
      this._hideFileBrowserContextMenu();
      return;
    }
    var file_path = this.file_browser_context_path;
    this._hideFileBrowserContextMenu();
    this.fs.removeSync(file_path);
    [...this.file_tree_expanded_paths].forEach((expanded_path) => {
      if(expanded_path == file_path || expanded_path.startsWith(file_path + '/')) {
        this.file_tree_expanded_paths.delete(expanded_path);
      }
    });
    await this._refreshWorkspaceList();
  }

  /**
   * Evaluates inspectVariable for the selected workspace symbol.
   */
  async _inspectWorkspaceVariable() {
    if(!this.workspace_context_variable) {
      this._hideWorkspaceContextMenu();
      return;
    }
    var command = 'inspectVariable(' + JSON.stringify(this.workspace_context_variable) + ')';
    this._hideWorkspaceContextMenu();
    await this._evaluateCommand(command, { preserve_input: true });
  }

  /**
   * Builds the hidden sandbox iframe source.
   * @returns {string}
   */
  _createSandboxHtml() {
    var sandbox_source = String(globalThis.__JSLAB_WEB_SANDBOX_FRAME_SOURCE__ || '')
      .replace(/<\/script/gi, '<\\/script');
    return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="script-src * 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:;" />
        </head>
        <body>
          <script type="text/javascript">${sandbox_source}</script>
        </body>
      </html>
    `;
  }

  /**
   * Updates bottom status bar and icon.
   * @param {string} state
   * @param {string} text
   */
  _setStatus(state, text, text_id) {
    var stats_num = this.stats.promises + this.stats.timeouts + this.stats.immediates +
      this.stats.intervals + this.stats.animation_frames + this.stats.idle_callbacks;
    this.status_text_id = Number.isInteger(text_id) ? text_id : null;
    this.status_cont.textContent = this.status_text_id ? this.language.currentString(this.status_text_id) : text;
    this.stats_icon.className = '';
    if(state == 'ready') {
      if(stats_num > 0) {
        this.stats_icon.classList.add('async-busy');
      } else {
        this.stats_icon.classList.add('ready');
      }
    } else {
      this.stats_icon.classList.add('busy');
    }
  }

  /**
   * Updates sandbox stats popup values.
   * @param {Object} stats
   */
  _setStats(stats) {
    this.stats = Object.assign({}, this.stats, stats || {});
    document.getElementById('sandbox-required-modules-num').textContent = String(this.stats.required_modules);
    document.getElementById('sandbox-promises-num').textContent = String(this.stats.promises);
    document.getElementById('sandbox-timeouts-num').textContent = String(this.stats.timeouts);
    document.getElementById('sandbox-immediates-num').textContent = String(this.stats.immediates);
    document.getElementById('sandbox-intervals-num').textContent = String(this.stats.intervals);
    document.getElementById('sandbox-animation-frames-num').textContent = String(this.stats.animation_frames);
    document.getElementById('sandbox-idle-callbacks-num').textContent = String(this.stats.idle_callbacks);
    this._setStatus('ready', this.status_cont.textContent || this.language.currentString(87), this.status_text_id);
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
          } catch {}
        }
      });
    }
  }

}

exports.PRDC_JSLAB_WEB_APP_SHELL = PRDC_JSLAB_WEB_APP_SHELL;
