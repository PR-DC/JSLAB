/**
 * @file JSLAB Electron windows services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WINDOW_MANAGER } = require('../windows/window-manager');
const { app, BrowserWindow, screen } = require('electron');

/**
 * Implements windows services for the application host.
 */
class PRDC_JSLAB_ELECTRON_WINDOW_MANAGER extends PRDC_JSLAB_WINDOW_MANAGER {
  /**
   * Connects host services to the owning application.
   * @param {Object} application Application host controller.
   */
  constructor(application) {
    super(application, id => application.currentString(id));
  }

  /**
   * Opens the local LaTeX Editor on demand.
   * @param {string} [file] Project folder or TeX source path.
   * @param {string} [main] Main source file under the project folder.
   */
  showLatex(file, main) {
    if(!this.latex_window) {
      const { PRDC_JSLAB_LATEX_EDITOR_WINDOW } = require('./latex-editor-window');
      this.latex_window = new PRDC_JSLAB_LATEX_EDITOR_WINDOW(this.application);
    }
    this.latex_window.show(file, main);
  }

  /**
   * Create all windows
   */
  createWindows() {
    // Create the main  window
    this.creatMainWindow();

    // Create the sandbox window
    this.application.runtime.createSandboxWindow();

    // Create the editor window
    this.createEditorWindow();

    // Create the Assistant window
    this.createAssistantWindow();

    // Start inter-instance bridge
    if(!this.application.cli_mode) {
      this.application.instance_router.start();
      this.application.instance_router.markAsLastActive();
    }

    // Set handlers
    this.setHandlers();

    // Handle IPC messages
    this.application.handleMessages();
    if(this.application.automation_external && this.application.automation && !this.application.automation.server) {
      this.application.automation.start().catch(function(err) {
        console.error('[automation] ' + err.message);
      });
    }
  }

  /**
   * Create main window
   */
  creatMainWindow() {
    var obj = this;
    var options = {
      title: this.application.currentString(511),
      minWidth: 720,
      minHeight: 500,
      icon: this.application.app_icon, // png to ico https://icoconvert.com/
      show: false,
      frame: false,
      backgroundColor: '#ffffff',
      opacity: this.application.win_opacity,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    };
    options = this.getWindowBounds('mainWinBounds', options);
    this.application.win_main = new BrowserWindow(options);
    this.bindAttentionReset(this.application.win_main);

    // Hide menu
    this.application.win_main.setMenu(null);

    // Maximize
    if(options.maximize) {
      this.application.win_main.maximize();
    }

    // and load the main.html of the app
    this.application.win_main.loadFile(app_path + '/html/main.html');

    // Events
    this.application.win_main.on("resize", function() {
      obj.saveWindowBounds(obj.application.win_main, 'mainWinBounds');
    });
    this.application.win_main.on("move", function() {
      obj.saveWindowBounds(obj.application.win_main, 'mainWinBounds');
    });
    this.application.win_main.on("maximize", function() {
      obj.saveWindowBounds(obj.application.win_main, 'mainWinBounds');
    });
    this.application.win_main.on("unmaximize", function() {
      obj.saveWindowBounds(obj.application.win_main, 'mainWinBounds');
    });
    if(!this.application.cli_mode) {
      this.application.instance_router.trackWindowActivity(this.application.win_main);
    }

    // Show window when ready
    this.application.win_main.once('ready-to-show', function() {
      if(!obj.application.cli_mode) {
        obj.application.win_main.show();
      }
      if(config.DEBUG) {
        obj.openDevTools(obj.application.win_main);
      }
    });

    this.application.win_main.webContents.on('render-process-gone', function(event, details) {
      obj.application.app_logger.logMessage(config.DEBUG_RENDER_GONE_ERROR, config.LOG_RENDER_GONE_ERROR, config.LOG_CODES['render-gone-error'], 'Render gone error', 'Main window render gone error:' + JSON.stringify(event) + ' ' + JSON.stringify(details));
      app.exit();
      app.relaunch();
    });

    // Close all windows
    this.application.win_main.on('close', function(e) {
      e.preventDefault();
      obj.application.win_main.webContents.executeJavaScript('win_main.close();');
    });
  }

  /**
   * Opens debugging in the existing Editor, preserving the selected frame.
   */
  openEditorDebugger() {
    this.showEditor();
    this.application.win_editor.send('EditorWindow', 'open-debugger', this.application.debugger_view_state || {...this.application.debugger.status(), frame_index: 0});
    return true;
  }

  /**
   * Creates the existing Editor window.
   */
  createEditorWindow() {
    var obj = this;
    this._createNativeFeatureWindow('editor');

    // Hide window when ready
    this.application.win_editor.hide();

    this.application.win_editor.webContents.on('did-finish-load', function() {
      obj.application.files.flushPendingOpenScripts();
    });

    this.application.win_editor.on('close', function(e) {
      if(!obj.application.is_app_quitting) {
        e.preventDefault();
        clearInterval(obj.editor_hide_fade);
        clearTimeout(obj.editor_hide_timer);
        obj.editor_hide_fade = obj.fadeWindowOut(obj.application.win_editor, 0.1, 10);
        obj.editor_hide_timer = setTimeout(function() {
          obj.application.win_editor.hide();
        }, 100);
      } else if(!obj.application.editor_close_ready) {
        e.preventDefault();
      }
    });

    this.application.win_editor.webContents.on('render-process-gone', function(event, details) {
      obj.application.app_logger.logMessage(config.DEBUG_RENDER_GONE_ERROR, config.LOG_RENDER_GONE_ERROR, config.LOG_CODES['render-gone-error'], 'Render gone error', 'Editor window render gone error:' + JSON.stringify(event) + ' ' + JSON.stringify(details));
    });
  }

  /**
   * Creates the Assistant chat window.
   */
  createAssistantWindow() {
    return this._createNativeFeatureWindow('assistant');
  }

  /**
   * Loads the modeling window on the first request for a project.
   * @returns {Promise<Object>} Loaded native window.
   */
  async getSimulateWindow() {
    const current = this.application.win_simulate;
    if(!current || current.isDestroyed()) {
      this._createNativeFeatureWindow('simulate');
    }
    return this.simulate_ready;
  }

  /**
   * Waits for the current Simulate window's answer to a close request.
   * @param {BrowserWindow} win Simulate window.
   * @returns {Promise<boolean>} Whether the window may close.
   */
  confirmSimulateClose(win) {
    if(!win || win.isDestroyed()) return Promise.resolve(true);
    win.simulate_close_confirmation ??= this.simulate_ready.then(() => win.isDestroyed() ||
      win.webContents.executeJavaScript('win_simulate.confirmProjectClose()')).finally(() => {
      win.simulate_close_confirmation = null;
    });
    return win.simulate_close_confirmation;
  }

  /**
   * Creates the PTY-backed system Terminal window.
   */
  createTerminalWindow(params = {}) {
    var obj = this;
    var id = ++this.application.terminal_window_id;
    var name = typeof params.name === 'string' && params.name.trim().length ?
      params.name.trim().slice(0, 200) : this.application.currentString(666);
    var terminal_options = params.options && typeof params.options === 'object' ? params.options : {};
    var options = {
      title: name,
      width: 900,
      height: 620,
      minWidth: 520,
      minHeight: 320,
      icon: this.application.app_icon,
      show: false,
      backgroundColor: '#0c0c0c',
      opacity: this.application.win_opacity,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false,
        additionalArguments: [
          '--terminal-window-id=' + id,
          '--terminal-window-options=' + Buffer.from(JSON.stringify({
            name: name,
            shell: terminal_options.shell,
            args: terminal_options.args,
            cwd: terminal_options.cwd,
            env: terminal_options.env
          }), 'utf8').toString('base64')
        ]
      }
    };
    options = this.getWindowBounds('terminalWinBounds', options);
    if(Number.isFinite(options.x)) {
      options.x += (id - 1) % 8 * 24;
    }
    if(Number.isFinite(options.y)) {
      options.y += (id - 1) % 8 * 24;
    }
    var win = new BrowserWindow(options);
    var record = {
      id: id,
      name: name,
      win: win,
      ready: false,
      pending: [],
      output: '',
      read_offset: 0,
      running: true,
      exit_code: null,
      signal: null
    };
    this.application.terminal_windows.set(id, record);
    this.bindAttentionReset(win);
    win.setMenu(null);
    win.loadFile(app_path + '/html/terminal.html');
    if(options.maximize) {
      win.maximize();
    }
    ['resize', 'move', 'maximize', 'unmaximize'].forEach(function(event_name) {
      win.on(event_name, function() {
        obj.saveWindowBounds(win, 'terminalWinBounds');
      });
    });
    win.webContents.on('did-finish-load', function() {
      if(win.isDestroyed()) {
        return;
      }
      record.ready = true;
      win.setTitle(record.name);
      win.show();
      win.focus();
      obj.fadeWindowIn(win, 0.1, 10);
      win.send('TerminalWindow', 'focus');
      record.pending.splice(0).forEach(function(entry) {
        win.send('TerminalWindow', entry.action, entry.data);
      });
    });
    if(!this.application.cli_mode) {
      this.application.instance_router.trackWindowActivity(win);
    }
    win.on('closed', function() {
      var current = obj.application.terminal_windows.get(id);
      if(current && current.win === win) {
        obj.application.terminal_windows.delete(id);
      }
    });
    return { id: id, name: name };
  }

  /**
   * Controls one of the independently owned system Terminal windows.
   */
  controlTerminalWindow(action, data = {}) {
    if(action === 'create') {
      return this.createTerminalWindow(data);
    }
    if(action === 'list') {
      return Array.from(this.application.terminal_windows.values()).map(function(record) {
        return { id: record.id, name: record.name };
      });
    }
    var id = Number(data.id);
    var record = this.application.terminal_windows.get(id);
    if(!record || record.win.isDestroyed()) {
      return false;
    }
    if(action === 'is-open') {
      return true;
    }
    if(action === 'read') {
      return record.output;
    }
    if(action === 'read-new') {
      var output = record.output.slice(record.read_offset);
      record.read_offset = record.output.length;
      return output;
    }
    if(action === 'status') {
      return {
        id: record.id,
        name: record.name,
        open: true,
        running: record.running,
        exitCode: record.exit_code,
        signal: record.signal,
        outputLength: record.output.length
      };
    }
    if(action === 'clear-output') {
      record.output = '';
      record.read_offset = 0;
      return true;
    }
    if(action === 'set-name') {
      var name = String(data.name || '').trim().slice(0, 200);
      if(!name.length) {
        return false;
      }
      record.name = name;
      record.win.setTitle(name);
      if(record.ready) {
        record.win.send('TerminalWindow', 'set-name', name);
      } else {
        record.pending.push({ action: 'set-name', data: name });
      }
      return true;
    }
    if(action === 'close') {
      record.win.destroy();
      return true;
    }
    if(action === 'focus') {
      record.win.show();
      record.win.focus();
    }
    if(action === 'hide') {
      record.win.hide();
      return true;
    }
    if(!['write', 'clear', 'restart', 'focus'].includes(action)) {
      return false;
    }
    if(action === 'clear') {
      record.output = '';
      record.read_offset = 0;
    }
    if(record.ready) {
      record.win.send('TerminalWindow', action, data.value);
    } else {
      record.pending.push({ action: action, data: data.value });
    }
    return true;
  }

  /**
   * Show editor window
   */
  showEditor() {
    if(!this.focusFeatureWindow(this.application.win_editor)) {
      return;
    }

    if(config.DEBUG) {
      if(!this.application.win_editor.devtools_win || !this.application.win_editor.devtools_win.isVisible()) {
        this.openDevTools(this.application.win_editor);
      }
    }
  }

  /**
   * Shows and focuses the Assistant window.
   */
  showAssistant() {
    if(!this.focusFeatureWindow(this.application.win_assistant)) {
      return false;
    }
    this.application.win_assistant.send('AssistantWindow', 'focus-input');
    return true;
  }

  /**
   * Opens a new Simulate window or loads an explicitly selected project.
   * @param {string} [file_path] Explicit project path.
   * @returns {Promise<boolean>} Whether the Simulate window was shown.
   */
  async showSimulate(file_path) {
    if(this.application.cli_mode) return false;
    if(file_path === undefined) {
      const win = await this.getSimulateWindow();
      return this.focusFeatureWindow(win);
    }
    const project = await this.application.files.resolveSimulateProject(file_path);
    if(!project.success || this.application.is_app_quitting) return false;
    const win = await this.getSimulateWindow();
    if(!this.focusFeatureWindow(win)) return false;
    win.send('SimulateWindow', 'open-file', project.file);
    return true;
  }

  /**
   * Shows and focuses the system Terminal window.
   */
  showTerminal(name, options) {
    if(this.application.cli_mode) {
      return false;
    }
    return this.createTerminalWindow({ name: name, options: options });
  }

  /**
   * Get window bounds
   * @param {string} store_key - key used for storage.
   * @param {object} options - options for window.
   * @returns {object} window bounds.
   */
  getWindowBounds(store_key, options) {
    var stored_options = this.application.store.get(store_key);
    if(stored_options) {
      var bounds = stored_options.bounds;
      var area = screen.getDisplayMatching(bounds).workArea;
      options.maximize = stored_options.maximize;
      if(
        bounds.x >= area.x &&
        bounds.y >= area.y &&
        bounds.x + bounds.width <= area.x + area.width &&
        bounds.y + bounds.height <= area.y + area.height
      ) {
        options.x = bounds.x;
        options.y = bounds.y;
      }
      if(bounds.width <= area.width || bounds.height <= area.height) {
        options.width = bounds.width;
        options.height = bounds.height;
      }
    }

    return options;
  }

  /**
   * Save window bounds
   * @param {BrowserWindow} win - browser window.
   * @param {string} store_key - key used for storage.
   */
  saveWindowBounds(win, store_key) {
    var obj = this;
    if(this.application.debounce_save_win_bounds[store_key]) {
      clearTimeout(this.application.debounce_save_win_bounds[store_key]);
    }
    this.application.debounce_save_win_bounds[store_key] = setTimeout(function() {
      obj.application.debounce_save_win_bounds[store_key] = undefined;
      var options = {};
      options.bounds = win.getNormalBounds();
      options.maximize = win.isMaximized();
      obj.application.store.set(store_key, options);
    }, this.application.debounce_save_win_time);
  }

  /**
   * Configures session-wide handlers for certificate verification, permission checks,
   * device permission handling, and USB protected classes handling. These handlers ensure
   * the application's security and user privacy.
   */
  setHandlers() {
    this.application.win_main.webContents.session.setCertificateVerifyProc(function(request, callback) {
      callback(0);
    });

    this.application.win_main.webContents.session.setPermissionCheckHandler(function() {
      return true;
    });

    this.application.win_main.webContents.session.setDevicePermissionHandler(function() {
      return true;
    });

    this.application.win_main.webContents.session.setUSBProtectedClassesHandler(function() {
      return [];
    });
  }

  /**
   * Clears any active taskbar attention flash when a tracked window regains focus.
   * @param {BrowserWindow} win - Window that should clear the flash on focus.
   */
  bindAttentionReset(win) {
    if(win && typeof win.on === 'function') {
      win.on('focus', this.clearAttentionFlash.bind(this));
    }
  }

  /**
   * Returns all currently tracked application windows.
   * @returns {BrowserWindow[]} Active application windows.
   */
  getAppWindows() {
    var sub_windows = Object.values(this.application.sandbox_sub_wins || {});
    var terminal_windows = Array.from((this.application.terminal_windows || new Map()).values()).map(function(record) {
      return record.win;
    });
    return [this.application.win_main, this.application.win_editor, this.application.win_assistant, this.application.win_simulate, this.application.win_sandbox]
      .concat(terminal_windows, sub_windows)
      .filter(function(win) {
        return win && typeof win.isDestroyed === 'function' && !win.isDestroyed();
      });
  }

  /**
   * Reports whether any visible application window currently has focus.
   * @returns {boolean} True when any application window is focused.
   */
  isAnyAppWindowFocused() {
    return this.getAppWindows().some(function(win) {
      return typeof win.isFocused === 'function' && win.isFocused();
    });
  }

  /**
   * Starts flashing the main taskbar button on Windows to indicate script completion.
   * @returns {boolean} True when flashing was started.
   */
  requestScriptFinishedAttention() {
    if(process.platform !== 'win32' || this.isAnyAppWindowFocused()) {
      return false;
    }
    if(!this.application.win_main ||
        typeof this.application.win_main.isDestroyed !== 'function' ||
        this.application.win_main.isDestroyed() ||
        typeof this.application.win_main.flashFrame !== 'function') {
      return false;
    }
    this.application.attention_flash_active = true;
    this.application.win_main.flashFrame(true);
    return true;
  }

  /**
   * Stops any active taskbar attention flash.
   * @returns {boolean} True when flashing was cleared.
   */
  clearAttentionFlash() {
    if(!this.application.attention_flash_active) {
      return false;
    }
    this.application.attention_flash_active = false;
    if(this.application.win_main &&
        typeof this.application.win_main.isDestroyed === 'function' &&
        !this.application.win_main.isDestroyed() &&
        typeof this.application.win_main.flashFrame === 'function') {
      this.application.win_main.flashFrame(false);
    }
    return true;
  }

  /**
   * Opens the Developer Tools for the specified Electron BrowserWindow in a detached window.
   * @param {BrowserWindow} win - The Electron `BrowserWindow` instance for which to open the Developer Tools.
   */
  openDevTools(win) {
    if(win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
    }
    if(win === this.application.win_sandbox && this.application.debugger) {
      if(this.application.debugger.state !== 'idle' && this.application.debugger.state !== 'unavailable') {
        this.application.win_main.send('MainWindow', 'warn', 'Stop execution before opening sandbox DevTools.');
        return;
      }
      win.webContents.once('devtools-closed', () => {
        this.application.debugger.ready = this.application.debugger.attach();
        this.application.debugger.ready.catch(error => console.error('[debugger] ' + error.message));
      });
    }
    win.webContents.openDevTools({mode: 'undocked'});
    win.webContents.once('devtools-opened', function() {
      win.devToolsWebContents.focus();
    });
  }

  /**
   * Gradually increases the opacity of a given window until it is fully opaque.
   * @param {BrowserWindow} win - The browser window to fade in.
   * @param {number} step - The incremental step of opacity change. Default is 0.1.
   * @param {number} dt - The time interval in milliseconds between opacity changes. Default is 10.
   * @returns {number} The interval identifier for the fade-in operation.
   */
  fadeWindowIn(win, step = 0.1, dt = 10) {
    if(win) {
      // Get the opacity of the window.
      var opacity = win.getOpacity();
      var interval = [];

      if(opacity != 1) {
        // Increase the opacity of the window by `step` every `dt` ms
        interval = setInterval(function() {
          if(win.isDestroyed()) {
            clearInterval(interval);
            return;
          }
          // Stop fading if window's opacity is 1 or greater.
          if(opacity >= 1) {
            clearInterval(interval);
            opacity = 1;
          }
          win.setOpacity(opacity);
          opacity += step;
        }, dt);
      }

      // Return the interval. Useful if we want to stop fading at will.
      return interval;
    }
    return false;
  }

  /**
   * Gradually decreases the opacity of a given window until it is fully transparent.
   * @param {BrowserWindow} win - The browser window to fade out.
   * @param {number} step - The decremental step of opacity change. Default is 0.1.
   * @param {number} dt - The time interval in milliseconds between opacity changes. Default is 10.
   * @returns {number} The interval identifier for the fade-out operation.
   */
  fadeWindowOut(win, step = 0.1, dt = 10) {
    if(win) {
      // Get the opacity of the window.
      var opacity = win.getOpacity();
      var interval = [];

      if(opacity != 0) {
        // Reduce the opacity of the window by `step` every `dt` ms
        interval = setInterval(function() {
          // Stop fading if window's opacity is 0 or lesser.
          if(opacity <= 0) {
            clearInterval(interval);
            opacity = 0;
          }
          win.setOpacity(opacity);
          opacity -= step;
        }, dt);
      }

      // Return the interval. Useful if we want to stop fading at will.
      return interval;
    }
    return false;
  }

  /**
 * Creates a native surface using common feature metadata and Electron services.
 */
  _createNativeFeatureWindow(feature) {
    const definition = this.getFeatureDefinition(feature);
    let options = {
      title: definition.title, width: definition.width, height: definition.height,
      minWidth: definition.minWidth, minHeight: definition.minHeight,
      icon: this.application.app_icon, show: false, backgroundColor: '#ffffff',
      opacity: this.application.win_opacity,
      webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false }
    };
    if(feature !== 'assistant') {
      options.frame = false;
    }
    if(feature === 'editor') {
      delete options.width;
      delete options.height;
      options.webPreferences.nodeIntegrationInWorker = true;
    }
    options = this.getWindowBounds(definition.bounds_key, options);
    const win = new BrowserWindow(options);
    this.application['win_' + feature] = win;
    this.bindAttentionReset(win);
    win.setMenu(null);
    const loading = win.loadFile(app_path + '/html/' + definition.file);
    if(feature === 'simulate') {
      this.simulate_ready = loading.then(() => win, error => {
        if(!win.isDestroyed()) win.destroy();
        throw error;
      });
      win.on('close', event => {
        if(win.simulate_close_approved || this.application.is_app_quitting) return;
        event.preventDefault();
        void this.confirmSimulateClose(win).then(approved => {
          if(approved && !win.isDestroyed()) {
            win.simulate_close_approved = true;
            win.close();
          }
        }).catch(console.error);
      });
    }
    if(options.maximize) {
      win.maximize();
    }
    for(const event of ['resize', 'move', 'maximize', 'unmaximize']) {
      win.on(event, () => this.saveWindowBounds(win, definition.bounds_key));
    }
    if(!this.application.cli_mode) {
      this.application.instance_router.trackWindowActivity(win);
    }
    if(feature === 'assistant') {
      win.on('close', event => {
        if(!this.application.is_app_quitting) {
          event.preventDefault();
          win.hide();
        }
      });
    }
    return win;
  }

  /**
 * Checks whether Electron has destroyed a feature's native window.
 */
  _isWindowClosed(win) {
    return win.isDestroyed();
  }

  /**
 * Shows and focuses a native window with the desktop fade behavior.
 */
  _showWindowSurface(win) {
    if(win === this.application.win_editor) {
      clearInterval(this.editor_hide_fade);
      clearTimeout(this.editor_hide_timer);
    }
    if(win.isMinimized()) {
      win.restore();
    }
    win.show();
    win.focus();
    this.fadeWindowIn(win, 0.1, 10);
  }
}

exports.PRDC_JSLAB_ELECTRON_WINDOW_MANAGER = PRDC_JSLAB_ELECTRON_WINDOW_MANAGER;
