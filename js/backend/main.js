/**
 * @file JSLAB main script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker, shell,
  Menu, MenuItem, desktopCapturer, screen, webContents, safeStorage } = require('electron');

const contextMenu = require('electron-context-menu');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');

const { PRDC_APP_LOGGER } = require('./../../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER');
const { PRDC_JSLAB_TASKS } = require('./tasks');
const { PRDC_JSLAB_DEBUGGER } = require('./debugger');
const { PRDC_JSLAB_PTY } = require('./pty.js');
const { PRDC_JSLAB_BACKEND_LANGUAGE } = require('./backend-language');
const { PRDC_JSLAB_SCRIPT_OPENER } = require('./script-opener');
const { PRDC_JSLAB_INSTANCE_ROUTER } = require('./instance-router');
const { PRDC_JSLAB_ASSISTANT } = require('./assistant');
const { PRDC_JSLAB_AUTOMATION } = require('./automation');

/**
 * Class for main app.
 */
class PRDC_JSLAB_MAIN {

  /**
   * Create app.
   */
  constructor() {
    var obj = this;

    this.store = new Store();
    this.native_tasks = new PRDC_JSLAB_TASKS();
    this.lang_index = this.store.get('lang_index');
    if(this.lang_index === undefined || this.lang_index === null) {
      this.lang_index = 0;
    }
    this.lang = config.langs[this.lang_index] || (config.langs ? config.langs[0] : 'en');
    this.backend_language = new PRDC_JSLAB_BACKEND_LANGUAGE({
      app_path: app_path,
      lang: this.lang
    });
    this.debounce_save_win_time = config.WIN_SAVE_DEBOUNCE_TIME;
    this.debounce_save_win_bounds = [];

    this.heartbeat_interval;
    this.win_main;
    this.win_editor;
    this.win_assistant;
    this.terminal_windows = new Map();
    this.terminal_window_id = 0;
    this.win_sandbox;
    this.win_opacity = 0;
    this.editor_close_ready = false;
    this.attention_flash_active = false;
    this.script_opener = new PRDC_JSLAB_SCRIPT_OPENER(this);
    this.instance_router = new PRDC_JSLAB_INSTANCE_ROUTER({
      on_open_scripts: function(script_paths) {
        return obj.script_opener.openScriptsInEditor(script_paths);
      },
      is_script_path: function(script_path) {
        return obj.script_opener.isJslScriptPath(script_path);
      }
    });
    this.startup_script_paths = this.instance_router.getStartupScriptPaths(process.argv);
    this.cli_mode = process.argv.includes('--cli-runtime');
    this.automation_external = process.argv.includes('--mcp') || this.cli_mode;
    this.automation = new PRDC_JSLAB_AUTOMATION(this);
    this.automation_version = app.getVersion();
    this.assistant = new PRDC_JSLAB_ASSISTANT({
      store: this.store,
      safe_storage: safeStorage,
      call_tool: this.callAssistantTool.bind(this)
    });
    
    this.app_icon = app_path + '/icons/icon.ico'; // png to ico https://icoconvert.com/
    this.is_app_quitting = false;
    this.known_paths = ['home', 'appData', 'userDat', 'sessionData', 
      'temp', 'exe', 'module', 'desktop', 'documents', 'downloads', 
      'music', 'pictures', 'videos', 'recent', 'logs', 'crashDumps'];
                
    if(os.platform() == 'linux') {
      this.app_icon = app_path + '/icons/icon.png';
    }
    
    this.pty = new PRDC_JSLAB_PTY();
    
    // Create folder for app
    this.app_folder = this.cli_mode ? app.getPath('userData') : app.getPath('documents')+'\\'+app.getName();
    if(!fs.existsSync(this.app_folder)) {
      fs.mkdirSync(this.app_folder);
    }
    
    // Start log
    this.log_file = this.app_folder+'\\'+app.getName()+'.log';
    this.app_logger = new PRDC_APP_LOGGER(this.log_file);

    if(config.REPORT_CRASH) {
      const Bugsnag = require('@bugsnag/electron');
      Bugsnag.start({ apiKey: config.BUGSNAG_API_KEY });
    }
    
    // Context menu
    contextMenu({
      append: function(default_actions, p, win) {
        return [
          new MenuItem({
            label: obj.backend_language.currentString(320),
            click: function() {
              obj.win_editor.send('EditorWindow', 'toggle-comment');
            },
            visible: p.formControlType == 'text-area' &&
              p.pageURL.endsWith('/editor.html')
          }),
          new MenuItem({
            label: obj.backend_language.currentString(321),
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'go-to-code');
            },
            visible: p.pageURL.endsWith('/presentation-editor.html') && 
              p.frameURL != p.pageURL
          }),
          new MenuItem({
            label: obj.backend_language.currentString(322),
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'go-to-slide');
            },
            visible: p.formControlType == 'text-area' &&
              p.titleText == 'html' &&
              p.pageURL.endsWith('/presentation-editor.html')
          }),
          new MenuItem({
            label: obj.backend_language.currentString(537),
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'insert-slide-after',
                { source: 'code' });
            },
            visible: p.formControlType == 'text-area' &&
              p.titleText == 'html' &&
              p.pageURL.endsWith('/presentation-editor.html')
          }),
          new MenuItem({
            label: obj.backend_language.currentString(538),
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'duplicate-slide',
                { source: 'code' });
            },
            visible: p.formControlType == 'text-area' &&
              p.titleText == 'html' &&
              p.pageURL.endsWith('/presentation-editor.html')
          }),
          new MenuItem({
            label: obj.backend_language.currentString(387),
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'delete-slide',
                { source: 'code' });
            },
            visible: p.formControlType == 'text-area' &&
              p.titleText == 'html' &&
              p.pageURL.endsWith('/presentation-editor.html')
          }),
          new MenuItem({
            role: 'selectAll',
            label: obj.backend_language.currentString(323),
            visible: p.editFlags.canSelectAll
          }),
          new MenuItem({
            role: 'delete',
            label: obj.backend_language.currentString(387),
            visible: p.editFlags.canDelete
          })
        ];
      },
      showLookUpSelection: false,
      showSearchWithGoogle: false,
      showCopyImage: false,
      showInspectElement: false
    });
  
    // Comand line switches
    app.commandLine.appendSwitch('disable-renderer-backgrounding');
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
    app.commandLine.appendSwitch("disable-http-cache");
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
    app.commandLine.appendSwitch('max-active-webgl-contexts', config.MAX_ACTIVE_WEBGL_CONTEXTS);
    
    // Prevent sleep
    powerSaveBlocker.start('prevent-app-suspension');
  
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.whenReady().then(async function() {
      if(!obj.cli_mode && obj.startup_script_paths.length > 0) {
        var forwarded = await obj.instance_router.forwardScriptsToLastActive(
          obj.startup_script_paths
        );
        if(forwarded) {
          app.quit();
          return;
        }
      }
      obj.createWindows();

      app.on('activate', function() {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if(BrowserWindow.getAllWindows().length === 0) obj.createWindows();
      });
    });

    app.on('before-quit', function() {
      obj.is_app_quitting = true;
      obj.instance_router.stop();
      if(obj.assistant) obj.assistant.cancel();
      if(obj.automation) obj.automation.stop();
    });
    if(this.cli_mode) {
      var parent_arg = process.argv.find(function(arg) { return arg.startsWith('--cli-parent-pid='); });
      var parent_pid = Number(parent_arg && parent_arg.split('=')[1]);
      if(!Number.isInteger(parent_pid) || parent_pid <= 0) throw new Error('CLI runtime requires an owning process.');
      this.cli_parent_timer = setInterval(function() {
        try { process.kill(parent_pid, 0); } catch(err) { obj.closeCLI(); }
      }, 1000);
      this.cli_parent_timer.unref();
    }

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', function () {
      if(process.platform !== 'darwin') app.quit();
    });
    app.allowRendererProcessReuse = false;
  }

  /**
   * Closes the runtime owned by a terminal session.
   */
  closeCLI() {
    if(!this.cli_mode) return;
    clearInterval(this.cli_parent_timer);
    if(this.automation) this.automation.stop();
    app.exit(0);
  }

  /**
   * Create all windows
   */
  createWindows() { 
    // Create the main  window
    this.creatMainWindow();

    // Create the sandbox window
    this.createSandboxWindow();
    
    // Create the editor window
    this.createEditorWindow();

    // Create the Assistant window
    this.createAssistantWindow();

    // Start inter-instance bridge
    if(!this.cli_mode) {
      this.instance_router.start();
      this.instance_router.markAsLastActive();
    }

    // Set handlers
    this.setHandlers();
    
    // Handle IPC messages
    this.handleMessages();
    if(this.automation_external && this.automation && !this.automation.server) {
      this.automation.start().catch(function(err) {
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
      title: this.backend_language.currentString(512),
      minWidth: 720,
      minHeight: 500,
      icon: this.app_icon, // png to ico https://icoconvert.com/
      show: false,
      frame: false,
      backgroundColor: '#ffffff',
      opacity: this.win_opacity,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    };
    options = this.getWindowBounds('mainWinBounds', options);
    this.win_main = new BrowserWindow(options);
    this.bindAttentionReset(this.win_main);
    
    // Hide menu
    this.win_main.setMenu(null);

    // Maximize
    if(options.maximize) {
      this.win_main.maximize();
    }

    // and load the main.html of the app
    this.win_main.loadFile(app_path + '/html/main.html');

    // Events
    this.win_main.on("resize", function() { obj.saveWindowBounds(obj.win_main, 'mainWinBounds'); });
    this.win_main.on("move", function() { obj.saveWindowBounds(obj.win_main, 'mainWinBounds'); });
    this.win_main.on("maximize", function() { obj.saveWindowBounds(obj.win_main, 'mainWinBounds'); });
    this.win_main.on("unmaximize", function() { obj.saveWindowBounds(obj.win_main, 'mainWinBounds'); });
    if(!this.cli_mode) this.instance_router.trackWindowActivity(this.win_main);
    
    // Show window when ready
    this.win_main.once('ready-to-show', function() {
      if(!obj.cli_mode) obj.win_main.show();
      if(config.DEBUG) {
        obj.openDevTools(obj.win_main);
      }
    });

    this.win_main.webContents.on('render-process-gone', function(event , details) {
      obj.app_logger.logMessage(config.DEBUG_RENDER_GONE_ERROR, config.LOG_RENDER_GONE_ERROR, config.LOG_CODES['render-gone-error'], 'Render gone error', 'Main window render gone error:' + JSON.stringify(event) + ' ' + JSON.stringify(details));
      app.exit();
      app.relaunch();
    });
    
    // Close all windows
    this.win_main.on('close', function(e) {
      e.preventDefault();
      obj.win_main.webContents.executeJavaScript('win_main.close();');
    });
  }

  /**
   * Create sandbox window
   */
  createSandboxWindow() {
    var obj = this;
    this.win_sandbox = new BrowserWindow({
      title: this.backend_language.currentString(513),
      minWidth: 720,
      minHeight: 500,
      icon: this.app_icon, // png to ico https://icoconvert.com/
      show: false,
      backgroundColor: '#ffffff',
      opacity: this.win_opacity,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    });
    this.debugger = new PRDC_JSLAB_DEBUGGER(this.win_sandbox.webContents, {
      state: state => {
        if(this.win_main && !this.win_main.isDestroyed()) this.win_main.send('MainWindow', 'debugger-state', state);
        if(this.win_editor && !this.win_editor.isDestroyed()) this.win_editor.send('EditorWindow', 'debugger-state', state);
      },
      settings: settings => this.store.set('debugger-settings', settings),
      interrupted: (_id, result) => {
        if(this.automation && this.automation.active_id) {
          this.automation.complete({ id: this.automation.active_id,
            result: { success: false, interrupted: true, error: 'Execution interrupted.',
              cleanup_errors: result.cleanup_errors, output: [] } });
        } else if(this.automation) this.automation.busy = false;
        if(this.win_main && !this.win_main.isDestroyed()) {
          this.win_main.send('MainWindow', 'code-evaluated', { interrupted: true });
          this.win_main.send('MainWindow', 'disp', 'Execution interrupted.');
          for(const error of result.cleanup_errors || []) this.win_main.send('MainWindow', 'warn', 'Cleanup: ' + error);
        }
      },
      error: error => {
        if(this.win_main && !this.win_main.isDestroyed()) this.win_main.send('MainWindow', 'warn', error.message);
        console.error('[debugger] ' + error.message);
      }
    });
    const saved_debugger = this.store.get('debugger-settings', {});
    this.debugger.ready.then(async () => {
      for(const point of saved_debugger.breakpoints || []) {
        await this.debugger.setBreakpoint(point.path, point.line, point.condition || '', point.enabled !== false);
      }
      if(saved_debugger.pause_on_exceptions) await this.debugger.setExceptionPause(saved_debugger.pause_on_exceptions);
    }).catch(error => console.error('[debugger settings] ' + error.message));
    this.bindAttentionReset(this.win_sandbox);

    // Hide menu
    this.win_sandbox.setMenu(null);
    if(!this.cli_mode) this.instance_router.trackWindowActivity(this.win_sandbox);

    // and load the index.html of the app
    this.win_sandbox.loadFile(app_path + '/html/sandbox.html');
    if(this.automation) {
      this.win_sandbox.webContents.on('console-message', function(event, level, message) {
        obj.automation.captureConsole(level, message);
        if(obj.cli_mode && level >= 2) console.error('[sandbox console] ' + message);
      });
      this.win_sandbox.webContents.on('did-start-loading', function() {
        obj.automation.reset();
      });
      this.win_sandbox.webContents.on('destroyed', function() {
        obj.automation.reset();
      });
    }
    
    if(config.DEBUG) {
      // Show dev tools
      this.openDevTools(this.win_sandbox);
    }
    
    // Sub windows
    this.win_sandbox.webContents.setWindowOpenHandler(function(handler) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          minWidth: 250,
          minHeight: 50,
          icon: obj.app_icon, // png to ico https://icoconvert.com/
          show: false,
          backgroundColor: '#ffffff',
          opacity: obj.win_opacity,
          webPreferences: {
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            contextIsolation: false,
            backgroundThrottling: false,
            webviewTag: true
          }
        }
      };
    }); 
    
    this.sandbox_sub_wins = {};
    this.win_sandbox.webContents.on('did-create-window', function(sub_win, details) {
      var wid = details.frameName;
      obj.sandbox_sub_wins[wid] = sub_win;
      if(!obj.cli_mode) obj.instance_router.trackWindowActivity(sub_win);
      obj.bindAttentionReset(sub_win);
      
      // Hide menu
      sub_win.setMenu(null);
      
      // Show window
      sub_win.once('ready-to-show', function() {
        if(sub_win.isDestroyed() || sub_win.forClose) return;
        if(obj.cli_mode) {
          sub_win.showInactive();
        } else {
          sub_win.show();
          sub_win.focus();
        }
        obj.fadeWindowIn(sub_win, 0.1, 10);

        if(config.DEBUG) {
          obj.openDevTools(sub_win);
        }
      });
      if(obj.cli_mode) {
        sub_win.webContents.on('did-finish-load', function() {
          if(!sub_win.isDestroyed() && !sub_win.forClose &&
              sub_win.webContents.getURL().endsWith('/figure.html')) {
            sub_win.setOpacity(1);
            sub_win.showInactive();
          }
        });
      }
     
      sub_win.webContents.on('did-attach-webview', (_e, wc) => {
        if(wc.getUserAgent() == 'presentation-editor-preview') {
          contextMenu({ 
            window: wc,
            append: function(default_actions, p, win) {
              return [
                new MenuItem({
                  label: obj.backend_language.currentString(321),
                  click: function() {
                    sub_win.webContents.send('PresentationEditorWindow', 'go-to-code');
                  },
                  visible: true
                }),
                new MenuItem({
                  label: obj.backend_language.currentString(537),
                  click: function() {
                    sub_win.webContents.send('PresentationEditorWindow',
                      'insert-slide-after', { source: 'preview' });
                  },
                  visible: true
                }),
                new MenuItem({
                  label: obj.backend_language.currentString(538),
                  click: function() {
                    sub_win.webContents.send('PresentationEditorWindow',
                      'duplicate-slide', { source: 'preview' });
                  },
                  visible: true
                }),
                new MenuItem({
                  label: obj.backend_language.currentString(387),
                  click: function() {
                    sub_win.webContents.send('PresentationEditorWindow',
                      'delete-slide', { source: 'preview' });
                  },
                  visible: true
                })
              ]
            }
          });
        }
      });
  
      // Close all windows
      sub_win.on('close', function(e) {
        var is_presentation_editor = false;
        try {
          is_presentation_editor = sub_win.webContents.getURL().endsWith('/presentation-editor.html');
        } catch(err) {}
        if(is_presentation_editor && !sub_win.presentation_editor_close_ready) {
          e.preventDefault();
          sub_win.webContents.send('PresentationEditorWindow', 'request-close');
          return;
        }
        e.preventDefault();
        obj.win_sandbox.webContents.send('SandboxWindow', 'window-closed', wid);
        sub_win.hide();
        sub_win.forClose = true;
        sub_win.presentation_editor_close_ready = false;
        setTimeout(function() {
          obj._destroyClosedSandboxWindow(wid, sub_win);
        }, 500);
      });
      
    });
    
    this.win_sandbox.webContents.on('render-process-gone', function(event, details) {
      if(obj.automation) obj.automation.reset();
      obj.app_logger.logMessage(config.DEBUG_RENDER_GONE_ERROR, config.LOG_RENDER_GONE_ERROR, config.LOG_CODES['render-gone-error'], 'Render gone error', 'Sandbox window render gone error:' + JSON.stringify(event) + ' ' + JSON.stringify(details));
      app.exit();
      app.relaunch();
    });
    
    this._on_sandbox_ready = async function() {
      await obj.debugger.ready;
      if(obj.automation) obj.automation.ready = true;
      if(!obj.cli_mode && !obj.store.get('shown-getting-started')) {
        obj.store.set('shown-getting-started', 1);
        obj.win_sandbox.webContents.executeJavaScript('openDocumentation("about");');
      }
      if(obj.sandbox_reload_active) {
        obj.win_main.webContents.executeJavaScript('win_main.onSandboxReset();');
        obj.sandbox_reload_active = false;
      }
    };
  }

  /**
   * Releases a closed sandbox window even while a script is still running.
   * Delayed cleanup must not remove a replacement window using the same ID.
   * @private
   * @param {string|number} wid Window identifier.
   * @param {BrowserWindow} win Window scheduled for destruction.
   */
  _destroyClosedSandboxWindow(wid, win) {
    if(!win.forClose) return;
    if(!win.isDestroyed()) win.destroy();
    if(this.sandbox_sub_wins[wid] === win) delete this.sandbox_sub_wins[wid];
  }

  /** Opens debugging in the existing Editor, preserving the selected frame. */
  openEditorDebugger() {
    this.showEditor();
    this.win_editor.send('EditorWindow','open-debugger',this.debugger_view_state || {...this.debugger.status(),frame_index:0});
    return true;
  }

  /** Creates the existing Editor window. */
  createEditorWindow() {
    var obj = this;
    var options = {
      title: this.backend_language.currentString(514),
      minWidth: 720,
      minHeight: 500,
      icon: this.app_icon, // png to ico https://icoconvert.com/
      show: false,
      frame: false,
      backgroundColor: '#ffffff',
      opacity: this.win_opacity,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    };
    options = this.getWindowBounds('editorWinBounds', options);
    this.win_editor = new BrowserWindow(options);
    this.bindAttentionReset(this.win_editor);
    
    // Hide menu
    this.win_editor.setMenu(null);

    // Maximize
    if(options.maximize) {
      this.win_editor.maximize();
    }
    
    // Hide menu
    this.win_editor.setMenu(null);

    // and load the index.html of the app
    this.win_editor.loadFile(app_path + '/html/editor.html');

    // Maximize
    if(options.maximize) {
      this.win_editor.maximize();
    }

    // Events
    this.win_editor.on("resize", function() { obj.saveWindowBounds(obj.win_editor, 'editorWinBounds'); });
    this.win_editor.on("move", function() { obj.saveWindowBounds(obj.win_editor, 'editorWinBounds'); });
    this.win_editor.on("maximize", function() { obj.saveWindowBounds(obj.win_editor, 'editorWinBounds'); });
    this.win_editor.on("unmaximize", function() { obj.saveWindowBounds(obj.win_editor, 'editorWinBounds'); });
    if(!this.cli_mode) this.instance_router.trackWindowActivity(this.win_editor);

    // Hide window when ready
    this.win_editor.hide();

    this.win_editor.webContents.on('did-finish-load', function() {
      obj.script_opener.flushPendingOpenScripts();
    });
   
    this.win_editor.on('close', function(e) {
      if(!obj.is_app_quitting) {
        e.preventDefault();
        obj.fadeWindowOut(obj.win_editor, 0.1, 10);
        setTimeout(function() {
          obj.win_editor.hide();
        }, 100);
      } else if(!obj.editor_close_ready) {
        e.preventDefault();
      }
    });
    
    this.win_editor.webContents.on('render-process-gone', function(event , details) {
      obj.app_logger.logMessage(config.DEBUG_RENDER_GONE_ERROR, config.LOG_RENDER_GONE_ERROR, config.LOG_CODES['render-gone-error'], 'Render gone error', 'Editor window render gone error:' + JSON.stringify(event) + ' ' + JSON.stringify(details));
    });
  }

  /** Creates the Assistant chat window. */
  createAssistantWindow() {
    var obj = this;
    var options = {
      title: this.backend_language.currentString(651),
      width: 760,
      height: 680,
      minWidth: 520,
      minHeight: 420,
      icon: this.app_icon,
      show: false,
      backgroundColor: '#ffffff',
      opacity: this.win_opacity,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    };
    options = this.getWindowBounds('assistantWinBounds', options);
    this.win_assistant = new BrowserWindow(options);
    this.bindAttentionReset(this.win_assistant);
    this.win_assistant.setMenu(null);
    this.win_assistant.loadFile(app_path + '/html/assistant.html');
    if(options.maximize) this.win_assistant.maximize();
    this.win_assistant.on('resize', function() {
      obj.saveWindowBounds(obj.win_assistant, 'assistantWinBounds');
    });
    this.win_assistant.on('move', function() {
      obj.saveWindowBounds(obj.win_assistant, 'assistantWinBounds');
    });
    this.win_assistant.on('maximize', function() {
      obj.saveWindowBounds(obj.win_assistant, 'assistantWinBounds');
    });
    this.win_assistant.on('unmaximize', function() {
      obj.saveWindowBounds(obj.win_assistant, 'assistantWinBounds');
    });
    if(!this.cli_mode) this.instance_router.trackWindowActivity(this.win_assistant);
    this.win_assistant.on('close', function(event) {
      if(!obj.is_app_quitting) {
        event.preventDefault();
        obj.win_assistant.hide();
      }
    });
  }

  /** Creates the PTY-backed system Terminal window. */
  createTerminalWindow(params = {}) {
    var obj = this;
    var id = ++this.terminal_window_id;
    var name = typeof params.name === 'string' && params.name.trim().length ?
      params.name.trim().slice(0, 200) : this.backend_language.currentString(667);
    var terminal_options = params.options && typeof params.options === 'object' ? params.options : {};
    var options = {
      title: name,
      width: 900,
      height: 620,
      minWidth: 520,
      minHeight: 320,
      icon: this.app_icon,
      show: false,
      backgroundColor: '#0c0c0c',
      opacity: this.win_opacity,
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
    if(Number.isFinite(options.x)) options.x += (id - 1) % 8 * 24;
    if(Number.isFinite(options.y)) options.y += (id - 1) % 8 * 24;
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
    this.terminal_windows.set(id, record);
    this.bindAttentionReset(win);
    win.setMenu(null);
    win.loadFile(app_path + '/html/terminal.html');
    if(options.maximize) win.maximize();
    ['resize', 'move', 'maximize', 'unmaximize'].forEach(function(event_name) {
      win.on(event_name, function() {
        obj.saveWindowBounds(win, 'terminalWinBounds');
      });
    });
    win.webContents.on('did-finish-load', function() {
      if(win.isDestroyed()) return;
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
    if(!this.cli_mode) this.instance_router.trackWindowActivity(win);
    win.on('closed', function() {
      var current = obj.terminal_windows.get(id);
      if(current && current.win === win) {
        obj.terminal_windows.delete(id);
      }
    });
    return { id: id, name: name };
  }

  /** Controls one of the independently owned system Terminal windows. */
  controlTerminalWindow(action, data = {}) {
    if(action === 'create') return this.createTerminalWindow(data);
    if(action === 'list') {
      return Array.from(this.terminal_windows.values()).map(function(record) {
        return { id: record.id, name: record.name };
      });
    }
    var id = Number(data.id);
    var record = this.terminal_windows.get(id);
    if(!record || record.win.isDestroyed()) return false;
    if(action === 'is-open') return true;
    if(action === 'read') return record.output;
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
      if(!name.length) return false;
      record.name = name;
      record.win.setTitle(name);
      if(record.ready) record.win.send('TerminalWindow', 'set-name', name);
      else record.pending.push({ action: 'set-name', data: name });
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
    if(!['write', 'clear', 'restart', 'focus'].includes(action)) return false;
    if(action === 'clear') {
      record.output = '';
      record.read_offset = 0;
    }
    if(record.ready) record.win.send('TerminalWindow', action, data.value);
    else record.pending.push({ action: action, data: data.value });
    return true;
  }

  /**
   * Handle IPC messages
   */
  handleMessages() {
    var obj = this;
    var normalizeDialogParams = function(params) {
      if(!params) {
        params = {};
      }
      if(!params.hasOwnProperty('icon')) {
        params.icon = obj.app_icon;
      }
      return params;
    };
    var callDialogForSender = function(sender, method, params) {
      params = normalizeDialogParams(params);
      var sender_win = null;
      try {
        sender_win = BrowserWindow.fromWebContents(sender);
      } catch(err) {}
      if(sender_win) {
        return dialog[method](sender_win, params);
      }
      return dialog[method](params);
    };
    
    // For MainProcess 
    var console_request_serial = 0;
    ipcMain.handle('get-completions', function(e, data) {
      var request_id = String(Date.now()) + '-' + (++console_request_serial);
      obj.win_sandbox.send('SandboxWindow', 'get-completions', {
        request_id: request_id,
        data: data
      });
      return new Promise(function(resolve) {
        ipcMain.once('completions-' + request_id, function(event, result) {
          resolve(result);
        });
      });
    });

    var console_properties_serial = 0;
    ipcMain.handle('get-console-properties', function(e, request) {
      var request_id = String(Date.now()) + '-' + (++console_properties_serial);
      obj.win_sandbox.send('SandboxWindow', 'get-console-properties', {
        request_id: request_id,
        object_id: request.object_id,
        offset: request.offset,
        limit: request.limit
      });
      return new Promise(function(resolve) {
        ipcMain.once('console-properties-' + request_id, function(event, result) {
          resolve(result);
        });
      });
    });

    ipcMain.handle('get-console-accessor', function(e, request) {
      var request_id = String(Date.now()) + '-' + (++console_request_serial);
      obj.win_sandbox.send('SandboxWindow', 'get-console-accessor', Object.assign({}, request, {
        request_id: request_id
      }));
      return new Promise(function(resolve) {
        ipcMain.once('console-accessor-' + request_id, function(event, result) { resolve(result); });
      });
    });

    ipcMain.handle('get-console-preview', function(e, expression) {
      var request_id = String(Date.now()) + '-' + (++console_request_serial);
      obj.win_sandbox.send('SandboxWindow', 'get-console-preview', {
        request_id: request_id, expression: expression
      });
      return new Promise(function(resolve) {
        ipcMain.once('console-preview-' + request_id, function(event, result) { resolve(result); });
      });
    });

    ipcMain.handle('is-console-expression-complete', function(e, code) {
      var request_id = String(Date.now()) + '-' + (++console_request_serial);
      obj.win_sandbox.send('SandboxWindow', 'is-console-expression-complete', {
        request_id: request_id, code: code
      });
      return new Promise(function(resolve) {
        ipcMain.once('console-expression-complete-' + request_id, function(event, result) { resolve(result); });
      });
    });
    
    ipcMain.handle('dialog', function(e, method, params) {
      return callDialogForSender(e.sender, method, params);
    });

    ipcMain.on('get-desktop-sources', async function(e) {
      e.returnValue = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    });

    ipcMain.handle('print-to-pdf', async function(e, options) {
      return await e.sender.printToPDF(options);
    });

    ipcMain.handle('JSLAB_ASSISTANT_SETTINGS_GET', function() {
      return { has_api_key: obj.assistant.hasApiKey() };
    });
    ipcMain.handle('JSLAB_ASSISTANT_SETTINGS_SET', function(event, settings) {
      if(event.sender !== obj.win_main.webContents) throw new Error('Expected the main window.');
      if(settings && settings.clear) return obj.assistant.clearApiKey();
      return obj.assistant.setApiKey(settings && settings.api_key);
    });
    ipcMain.handle('JSLAB_ASSISTANT_CHAT', async function(event, message) {
      if(event.sender !== obj.win_assistant.webContents) throw new Error('Expected the Assistant window.');
      try {
        return { result: await obj.assistant.chat(message) };
      } catch(error) {
        return { error: error && error.message ? error.message : String(error) };
      }
    });
    ipcMain.on('JSLAB_ASSISTANT_CANCEL', function(event) {
      if(event.sender === obj.win_assistant.webContents) {
        obj.assistant.cancel();
        if(obj.assistant_execution_id && obj.automation.active_id === obj.assistant_execution_id) {
          obj.debugger.interrupt().catch(function() {});
        }
      }
    });
    ipcMain.on('JSLAB_ASSISTANT_RESET', function(event) {
      if(event.sender === obj.win_assistant.webContents) obj.assistant.resetConversation();
    });
    
    ipcMain.handle('print-sub-win-to-pdf', async function(e, wid, options) {
      return await obj.sandbox_sub_wins[wid].webContents.printToPDF(options);
    });
    
    ipcMain.on('dialog', function(e, method, params) {
      e.returnValue = callDialogForSender(e.sender, method, params);
    });
    
    ipcMain.on('sync-message', function(e, action, data) {
      var retval;
      switch(action) {
        case 'get-app':
          retval = {'name': app.getName(), 'version': app.getVersion(), 'path': app_path, 'exe_path': app.getPath('exe')};
          break;
        case 'get-app-name':
          retval = app.getName();
          break;
        case 'get-app-path':
          retval = app_path;
          break;
        case 'get-app-version':
          retval = app.getVersion();
          break;
        case 'get-platform':
          retval = os.platform();
          break;
        case 'get-debug-flag':
          retval = config.DEBUG;
          break;
        case 'get-path':
          if(obj.known_paths.includes(data)) {
            retval = app.getPath(data);
          } else if(data == 'root') {
            retval = app_path;
          } else if(data == 'includes') {
            retval = app_path + '\\includes';
          } else {
            retval = true;
          }
          break;
        case 'get-log-file':
          retval = obj.log_file;
          break;
        case 'is-maximized-win':
          retval = BrowserWindow.fromWebContents(e.sender).isMaximized();
          break;
        case 'execution-started':
          try { obj.debugger.begin(data); retval = true; }
          catch(error) { retval = { error: error.message }; }
          break;
        case 'get-process-arguments':
          retval = process.argv;
          break;
        case 'call-sub-win-method':
          var [id, method, ...args] = data;
          if(obj.sandbox_sub_wins.hasOwnProperty(id)) {
            retval = obj.sandbox_sub_wins[id][method](...args);
          } else {
            retval = false;
          }
          break;
        case 'open-sub-win-devtools':
          if(obj.sandbox_sub_wins.hasOwnProperty(data)) {
            obj.openDevTools(obj.sandbox_sub_wins[data]);
            retval = true;
          } else {
            retval = false;
          }
          break;
        case 'get-sub-win-source-id':
          if(obj.sandbox_sub_wins.hasOwnProperty(data)) {
            retval = obj.sandbox_sub_wins[data].getMediaSourceId();
          } else {
            retval = false;
          }
          break;
        case 'reset-app':
          app.exit();
          app.relaunch();
          break;
        case 'reset-sandbox':
          if(obj.automation) obj.automation.reset();
          obj.sandbox_reload_active = true;
          obj.win_sandbox.destroy();
          Object.keys(obj.sandbox_sub_wins).forEach(function(wid) {
            obj.sandbox_sub_wins[wid].destroy();
            delete obj.sandbox_sub_wins[wid];
          });
          obj.createSandboxWindow();
          break;
        case 'pty':
          retval = obj.pty[data.action](e, data.data);
          break;
        case 'terminal-window':
          retval = obj.controlTerminalWindow(data.action, data.data);
          break;
        default:
          retval = true;
          break;
      }
      e.returnValue = retval;
    });
    
    ipcMain.on('MainProcess', function(e, action, data) {
      switch(action) {
        case 'show-dev-tools':
          // Show DevTools
          obj.openDevTools(BrowserWindow.fromWebContents(e.sender));
          break;
        case 'show-sandbox-dev-tools':
          // Show Sandbox DevTools
          obj.openDevTools(obj.win_sandbox);
          break;
        case 'open-dir':
        case 'open-folder':
        case 'show-dir':
        case 'show-folder':
          shell.openPath(data);
          break;
        case 'show-file-in-folder':
        case 'show-file-in-dir':
          shell.showItemInFolder(data);
          break;
        case 'focus-win':
          e.sender.focus();
          break;
        case 'fade-in-win':
          obj.fadeWindowIn(BrowserWindow.fromWebContents(e.sender), 0.1, 10);
          break;
        case 'fade-out-win':
          obj.fadeWindowIn(BrowserWindow.fromWebContents(e.sender), 0.1, 10);
          break;
        case 'close-win':
          BrowserWindow.fromWebContents(e.sender).close();
          if(!e.sender.isDestroyed()) e.sender.destroy();
          break;
        case 'close-app':
          obj.is_app_quitting = true;
          if(obj.win_main !== undefined && !obj.win_main.isDestroyed()) {
            obj.win_main.destroy();
          }
          if(obj.win_editor !== undefined && !obj.win_editor.isDestroyed()) {
            obj.win_editor.send('EditorWindow','close-all');
          }
          if(obj.win_assistant !== undefined && !obj.win_assistant.isDestroyed()) {
            obj.win_assistant.destroy();
          }
          for(const record of obj.terminal_windows.values()) {
            if(!record.win.isDestroyed()) record.win.destroy();
          }
          obj.terminal_windows.clear();
          if(obj.win_sandbox !== undefined && !obj.win_sandbox.isDestroyed()) {
            obj.win_sandbox.destroy();
          }
          break;
        case 'set-fullscreen':
          BrowserWindow.fromWebContents(e.sender).setFullScreen(data);
          BrowserWindow.fromWebContents(e.sender).maximize();
          break;
        case 'maximize-win':
          BrowserWindow.fromWebContents(e.sender).maximize();
          break;
        case 'restore-win':
          BrowserWindow.fromWebContents(e.sender).restore();
          break;
        case 'minimize-win':
          BrowserWindow.fromWebContents(e.sender).minimize();
          break;
        case 'toggle-maximize-win': {
          var target_win = BrowserWindow.fromWebContents(e.sender);
          if(target_win.isMaximized()) target_win.restore();
          else target_win.maximize();
          break;
        }
        case 'show-editor':
          // Show editor
          obj.showEditor();
          break;
        case 'show-assistant':
          obj.showAssistant();
          break;
        case 'hide-assistant':
          if(obj.win_assistant && !obj.win_assistant.isDestroyed()) obj.win_assistant.hide();
          break;
        case 'show-terminal':
          obj.showTerminal();
          break;
        case 'hide-terminal':
          var terminal_win = BrowserWindow.fromWebContents(e.sender);
          if(terminal_win) terminal_win.close();
          break;
        case 'close-editor':
          // Close editor
          obj.editor_close_ready = true;
          obj.win_editor.close();
          break;  
        case 'close-presentation-editor':
          var sub_win = BrowserWindow.fromWebContents(e.sender);
          if(sub_win) {
            sub_win.presentation_editor_close_ready = true;
            sub_win.close();
          }
          break;
        case 'show-presentation-editor-slide-context-menu':
          var sub_win = BrowserWindow.fromWebContents(e.sender);
          if(sub_win) {
            Menu.buildFromTemplate([
              {
                label: obj.backend_language.currentString(321),
                click: function() {
                  sub_win.webContents.send('PresentationEditorWindow',
                    'go-to-code', { source: 'thumbnail', index: data.index });
                }
              },
              {
                label: obj.backend_language.currentString(537),
                click: function() {
                  sub_win.webContents.send('PresentationEditorWindow',
                    'insert-slide-after', { source: 'thumbnail', index: data.index });
                }
              },
              {
                label: obj.backend_language.currentString(538),
                click: function() {
                  sub_win.webContents.send('PresentationEditorWindow',
                    'duplicate-slide', { source: 'thumbnail', index: data.index });
                }
              },
              {
                label: obj.backend_language.currentString(387),
                click: function() {
                  sub_win.webContents.send('PresentationEditorWindow',
                    'delete-slide', { source: 'thumbnail', index: data.index });
                }
              }
            ]).popup({
              window: sub_win,
              x: Number.isFinite(data && data.x) ? data.x : undefined,
              y: Number.isFinite(data && data.y) ? data.y : undefined
            });
          }
          break;
        case 'capture-page':
          obj.win_main.webContents.capturePage(undefined, {
            stayHidden: true, 
            stayAwake: true
          }).then(function(img) {
            var size = img.getSize();
            obj.win_main.webContents.send('streamer', 'captured-page', {buffer: img.toBitmap().buffer, width: size.width, height: size.height});
          });
          break;
        case 'take-screenshot':
          obj.win_main.webContents.capturePage(undefined, {
            stayHidden: true, 
            stayAwake: true
          }).then(function(img) {
            if(data) {
              img = img.crop(data);
            }
            obj.win_main.webContents.send('gui', 'screenshot', {buffer: img.toPNG()});
          });
          break;
        case 'close-log':
          obj.app_logger.closeLog();
          break;
        case 'code-evaluated':
          Object.keys(obj.sandbox_sub_wins).forEach(function(wid) {
            var win = obj.sandbox_sub_wins[wid];
            if(win.forClose) {
              setTimeout(function() {
                obj._destroyClosedSandboxWindow(wid, win);
              }, 500);
            }
          });
          if(data && data.top_level_script_finished) {
            obj.requestScriptFinishedAttention();
          }
          break;
        case 'set-win-size':
          obj.win_main.setSize(data[0], data[1]);
          break;
        case 'app-relaunch':
          app.exit();
          app.relaunch();
          break;
      }
    });
    
    // For MainWindow
    ipcMain.on('MainWindow', function(e, action, data) {
      if(e.sender === obj.win_sandbox.webContents && action === 'code-evaluated') {
        obj.debugger.finish(data && data.execution_id);
      }
      if(obj.automation && obj.automation_external && e.sender === obj.win_sandbox.webContents) {
        if(action === 'code-evaluating') obj.automation.busy = true;
        if(action === 'code-evaluated' && obj.automation.active_id) return;
        if(action === 'code-evaluated' && !obj.automation.active_id) {
          obj.automation.busy = false;
        }
      }
      if(!obj.win_main.isDestroyed()) {
        switch(action) {
          default:
            obj.win_main.send('MainWindow', action, data);
            break;
        }
      }
    });
    
    // For EditorWindow
    ipcMain.on('EditorWindow', function(e, action, data) {
      switch(action) {
        case 'debug-location':
          if(data?.path && fs.existsSync(data.path)) obj.showEditor();
          obj.win_editor.send('EditorWindow', action, data);
          break;
        case 'open-script':
          // Open file in editor
          obj.showEditor();
          obj.win_editor.send('EditorWindow', 'open-script', data);
          break;
        default:
          // Other actions
          obj.win_editor.send('EditorWindow', action, data);
          break;
      }
    });

    ipcMain.on('AssistantWindow', function(e, action, data) {
      if(action === 'show') obj.showAssistant();
      else if(obj.win_assistant && !obj.win_assistant.isDestroyed()) {
        obj.win_assistant.send('AssistantWindow', action, data);
      }
    });

    ipcMain.on('TerminalWindow', function(e, action, data) {
      if(action === 'show') obj.showTerminal();
      else {
        for(const record of obj.terminal_windows.values()) {
          if(record.ready && !record.win.isDestroyed()) {
            record.win.send('TerminalWindow', action, data);
          }
        }
      }
    });

    ipcMain.on('TerminalWindowEvent', function(e, data) {
      var record = data && obj.terminal_windows.get(Number(data.id));
      if(!record || record.win.isDestroyed() || e.sender !== record.win.webContents) return;
      var event_data = { id: record.id, type: data.type };
      if(data.type === 'data') {
        var chunk = String(data.data || '');
        record.output += chunk;
        var max_output = 1024 * 1024;
        if(record.output.length > max_output) {
          var removed = record.output.length - max_output;
          record.output = record.output.slice(removed);
          record.read_offset = Math.max(0, record.read_offset - removed);
        }
        event_data.data = chunk;
      } else if(data.type === 'started') {
        record.running = true;
        record.exit_code = null;
        record.signal = null;
      } else if(data.type === 'exit') {
        record.running = false;
        record.exit_code = typeof data.exitCode === 'number' ? data.exitCode : null;
        record.signal = data.signal;
        event_data.exitCode = record.exit_code;
        event_data.signal = record.signal;
      } else {
        return;
      }
      if(obj.win_sandbox && !obj.win_sandbox.isDestroyed()) {
        obj.win_sandbox.send('TerminalWindowEvent', event_data);
      }
    });
    
    // For SandboxWindow
    ipcMain.on('SandboxWindow', function(e, action, data) {
      if((action === 'eval-code' || action === 'run-last-script') && obj.debugger.state !== 'idle') {
        obj.win_main.send('MainWindow', 'warn', 'Sandbox execution is ' + obj.debugger.state + '.');
        if(obj.debugger.state === 'unavailable') obj.win_main.send('MainWindow', 'code-evaluated', {});
        return;
      }
      if(obj.automation && (obj.automation_external || obj.automation.active_id) &&
          (action === 'eval-code' || action === 'run-last-script')) {
        if(obj.automation.busy || obj.automation.active_id) {
          obj.win_main.send('MainWindow', 'code-evaluating');
          obj.win_main.send('MainWindow', 'warn', 'JSLAB is busy. Wait for the active execution to finish.');
          return;
        }
        obj.automation.busy = true;
      }
      if(action === 'interrupt-execution') {
        obj.debugger.interrupt().catch(() => {});
        return;
      }
      if(obj.debugger.state === 'stopping') return;
      if(action === 'eval-code' || action === 'run-last-script') obj.debugger.reserve();
      switch(action) {
        default:
          obj.win_sandbox.send('SandboxWindow', action, data);
          break;
      }
    });
    ipcMain.handle('JSLAB_DEBUG_SOURCE', async (event, source) => {
      if(event.sender !== obj.win_sandbox.webContents) throw new Error('Expected sandbox source registration.');
      await obj.debugger.registerSource(source);
      return true;
    });
    ipcMain.handle('JSLAB_MODULE_POSITION', async (event, frame) => {
      if(event.sender !== obj.win_sandbox.webContents) throw Error('Expected sandbox module location.');
      return obj.debugger.originalModulePosition(frame);
    });
    ipcMain.handle('JSLAB_TASK_START', async (event, request) => {
      if(event.sender !== obj.win_sandbox.webContents) throw Error('Expected the scientific sandbox.');
      return obj.native_tasks.run(event.sender, request);
    });
    ipcMain.handle('JSLAB_TASK_CANCEL', async (event, id) => obj.native_tasks.cancel(event.sender.id, id));

    ipcMain.handle('JSLAB_DEBUGGER_OPEN', async event => {
      if(![obj.win_main.webContents, obj.win_editor?.webContents].includes(event.sender)) throw Error('Expected an application editor or main window.');
      return obj.openEditorDebugger();
    });
    ipcMain.handle('JSLAB_DEBUGGER_VIEW_STATE', async event => {
      if(event.sender !== obj.win_editor?.webContents) throw Error('Expected the Editor window.');
      return obj.debugger_view_state || { ...obj.debugger.status(), frame_index: 0 };
    });
    ipcMain.on('DebuggerPane', (event, action, data) => {
      if(event.sender !== obj.win_main.webContents) return;
      if(action === 'state') obj.debugger_view_state = data;
      if(obj.win_editor && !obj.win_editor.isDestroyed() && action === 'state') obj.win_editor.send('EditorWindow','debugger-view-state',data);
    });
    ipcMain.handle('JSLAB_DEBUGGER', async (_event, method, args = {}) => {
      try { return { success: true, value: await obj.debugCommand(method, args) }; }
      catch(error) { return { success: false, error: error.message }; }
    });
    ipcMain.on('JSLAB_AUTOMATION_RESULT', function(e, data) {
      if(obj.automation && e.sender === obj.win_sandbox.webContents && obj.debugger.state !== 'stopping') {
        obj.automation.complete(data);
      }
    });
    ipcMain.on('JSLAB_SANDBOX_READY', function(e) {
      if(e.sender === obj.win_sandbox.webContents && obj._on_sandbox_ready) {
        obj._on_sandbox_ready().catch(error => {
          obj.win_main.send("MainWindow", "error", error.message);
        });
      }
    });
    ipcMain.on('JSLAB_SANDBOX_FAILED', function(e, error) {
      if(e.sender === obj.win_sandbox.webContents) {
        if(obj.automation) obj.automation.reset();
        if(obj.cli_mode) console.error('[sandbox] ' + error);
        obj.win_main.send('MainWindow', 'error', error);
      }
    });
  }

  /** Dispatches the same debugger commands for GUI and automation clients. */
  debugCommand(method, args = {}) {
    switch(method) {
      case 'get_debug_state': return this.debugger.status();
      case 'select_debug_frame': {
        const state = this.debugger.status();
        if(state.state !== 'paused' || !Number.isInteger(args.frame_index) || !state.frames[args.frame_index] ||
            args.revision !== undefined && args.revision !== state.revision) throw Error('Expired debugger frame.');
        this.debugger_view_state = { ...state, frame_index: args.frame_index };
        this.win_main.send('MainWindow', 'debugger-select-frame', { frame_index: args.frame_index, revision: state.revision });
        if(this.win_editor && !this.win_editor.isDestroyed()) this.win_editor.send('EditorWindow','debugger-view-state',this.debugger_view_state);
        return this.debugger_view_state;
      }
      case 'interrupt_execution': return this.debugger.interrupt();
      case 'pause_execution': return this.debugger.pause();
      case 'resume_execution': return this.debugger.resume(args.action);
      case 'inspect_debug_object': return this.debugger.properties(args.object_id);
      case 'evaluate_debug_expression': return this.debugger.evaluate(args.expression, args.frame_index, args.allow_side_effects === true);
      case 'set_breakpoint': return this.debugger.setBreakpoint(args.path, args.line, args.condition, args.enabled);
      case 'remove_breakpoint': return this.debugger.removeBreakpoint(args.id);
      case 'update_debug_script': return this.debugger.updateScript(args.path, args.code, args);
      case 'restart_debug_frame': return this.debugger.restartFrame(args.frame_index);
      case 'clear_breakpoints': return this.debugger.clearBreakpoints();
      case 'set_exception_pause': return this.debugger.setExceptionPause(args.state);
      case 'select_debug_target': return this.debugger.selectTarget(args.session_id || null);
      default: throw new Error('Unknown debugger command.');
    }
  }

  /**
   * Show editor window
   */
  showEditor() {
    if(this.cli_mode) return;
    this.win_editor.show();
    this.win_editor.focus();
    this.fadeWindowIn(this.win_editor, 0.1, 10);
   
    if(config.DEBUG) {
      if(!this.win_editor.devtools_win || !this.win_editor.devtools_win.isVisible()) {
        this.openDevTools(this.win_editor);
      }
    }
  }

  /** Shows and focuses the Assistant window. */
  showAssistant() {
    if(this.cli_mode || !this.win_assistant || this.win_assistant.isDestroyed()) return false;
    this.win_assistant.show();
    this.win_assistant.focus();
    this.fadeWindowIn(this.win_assistant, 0.1, 10);
    this.win_assistant.send('AssistantWindow', 'focus-input');
    return true;
  }

  /** Shows and focuses the system Terminal window. */
  showTerminal(name, options) {
    if(this.cli_mode) return false;
    return this.createTerminalWindow({ name: name, options: options });
  }

  /** Waits for a sandbox automation job used by Assistant tools. */
  async runAssistantAutomation(method, args) {
    var job = await this.automation.dispatch(method, args || {});
    if(!job || job.status !== 'running') return job;
    this.assistant_execution_id = job.execution_id;
    try {
      var deadline = Date.now() + 120000;
      while(job.status === 'running' && Date.now() < deadline) {
        await new Promise(function(resolve) { setTimeout(resolve, 25); });
      }
      if(job.status === 'running') {
        this.debugger.interrupt().catch(function() {});
        throw new Error('JSLAB operation timed out.');
      }
      if(!job.result || job.result.success === false) {
        throw new Error(job.result && job.result.error || 'JSLAB operation failed.');
      }
      return job.result;
    } finally {
      if(this.assistant_execution_id === job.execution_id) this.assistant_execution_id = null;
    }
  }

  /** Collects bounded main-window and Editor context for Assistant. */
  async getAssistantContext() {
    var main_context = await this.win_main.webContents.executeJavaScript(`(() => ({
      current_path: win_main.folder_navigation.current_path,
      command_input: win_main.command_window.code_input.getValue().slice(0, 8000),
      workspace: win_main.workspace.data.slice(0, 200)
    }))()`);
    var editor_context = await this.win_editor.webContents.executeJavaScript(`(() => {
      var manager = win_editor.script_manager;
      var pair = manager.getScriptByTab(manager.active_tab);
      var script = pair && pair[0];
      if(!script) return null;
      return {
        path: script.path || null,
        selection: script.code_editor.getSelection().slice(0, 16000),
        code: script.code_editor.getValue().slice(0, 32000),
        cursor: script.code_editor.getCursor()
      };
    })()`);
    return { main: main_context, editor: editor_context };
  }

  /** Executes one model-requested Assistant tool. */
  async callAssistantTool(name, args) {
    if(name === 'get_application_context') return await this.getAssistantContext();
    if(name === 'evaluate_code') {
      return await this.runAssistantAutomation('evaluate_code', { code: args.code });
    }
    if(name === 'get_help') {
      return await this.runAssistantAutomation('get_help', {
        name: args.query, type: args.type === 'category' ? 'category' : undefined
      });
    }
    if(name === 'open_editor') {
      this.showEditor();
      if(args.path) {
        if(typeof args.path !== 'string' || !fs.existsSync(args.path)) throw new Error('Editor file does not exist.');
        this.win_editor.send('EditorWindow', 'open-script', [args.path]);
      }
      return true;
    }
    if(name === 'replace_editor_selection') {
      var confirmation = await dialog.showMessageBox(this.win_assistant, {
        type: 'question', buttons: [this.backend_language.currentString(662),
          this.backend_language.currentString(52)], defaultId: 1, cancelId: 1,
        message: this.backend_language.currentString(661)
      });
      if(confirmation.response !== 0) return { applied: false };
      var text = JSON.stringify(String(args.text || ''));
      await this.win_editor.webContents.executeJavaScript(`(() => {
        var manager = win_editor.script_manager;
        var script = manager.getScriptByTab(manager.active_tab)[0];
        if(!script) throw new Error('No active Editor document.');
        script.code_editor.replaceSelection(${text}, 'around', '+assistant');
        script.code_editor.focus();
      })()`);
      this.showEditor();
      return { applied: true };
    }
    throw new Error('Unknown Assistant tool.');
  }

  /**
   * Get window bounds
   * @param {string} store_key - key used for storage.
   * @param {object} options - options for window.
   * @returns {object} window bounds.
   */
  getWindowBounds(store_key, options) {
    var stored_options = this.store.get(store_key);
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
    if(this.debounce_save_win_bounds[store_key]) {
      clearTimeout(this.debounce_save_win_bounds[store_key]);
    }
    this.debounce_save_win_bounds[store_key] = setTimeout(function() {
      obj.debounce_save_win_bounds[store_key] = undefined;
      var options = {};
      options.bounds = win.getNormalBounds();
      options.maximize = win.isMaximized();
      obj.store.set(store_key, options);
    }, this.debounce_save_win_time);
  }

  /**
   * Configures session-wide handlers for certificate verification, permission checks,
   * device permission handling, and USB protected classes handling. These handlers ensure
   * the application's security and user privacy.
   */
  setHandlers() {
    this.win_main.webContents.session.setCertificateVerifyProc(function(request, callback) {
      callback(0);
    });
    
    this.win_main.webContents.session.setPermissionCheckHandler(function() {
      return true;
    });

    this.win_main.webContents.session.setDevicePermissionHandler(function() {
      return true;
    });

    this.win_main.webContents.session.setUSBProtectedClassesHandler(function() {
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
    var sub_windows = Object.values(this.sandbox_sub_wins || {});
    var terminal_windows = Array.from((this.terminal_windows || new Map()).values()).map(function(record) {
      return record.win;
    });
    return [this.win_main, this.win_editor, this.win_assistant, this.win_sandbox]
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
    if(!this.win_main ||
        typeof this.win_main.isDestroyed !== 'function' ||
        this.win_main.isDestroyed() ||
        typeof this.win_main.flashFrame !== 'function') {
      return false;
    }
    this.attention_flash_active = true;
    this.win_main.flashFrame(true);
    return true;
  }

  /**
   * Stops any active taskbar attention flash.
   * @returns {boolean} True when flashing was cleared.
   */
  clearAttentionFlash() {
    if(!this.attention_flash_active) {
      return false;
    }
    this.attention_flash_active = false;
    if(this.win_main &&
        typeof this.win_main.isDestroyed === 'function' &&
        !this.win_main.isDestroyed() &&
        typeof this.win_main.flashFrame === 'function') {
      this.win_main.flashFrame(false);
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
    if(win === this.win_sandbox && this.debugger) {
      if(this.debugger.state !== 'idle' && this.debugger.state !== 'unavailable') {
        this.win_main.send('MainWindow', 'warn', 'Stop execution before opening sandbox DevTools.');
        return;
      }
      win.webContents.once('devtools-closed', () => {
        this.debugger.ready = this.debugger.attach();
        this.debugger.ready.catch(error => console.error('[debugger] ' + error.message));
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
}

exports.PRDC_JSLAB_MAIN = PRDC_JSLAB_MAIN;


