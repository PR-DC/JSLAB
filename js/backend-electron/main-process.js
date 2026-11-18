/**
 * @file JSLAB Electron main services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_ELECTRON_FILES } = require('./files');
const { PRDC_JSLAB_ELECTRON_WINDOW_MANAGER } = require('./window-manager');
const { PRDC_JSLAB_ELECTRON_SANDBOX_HOST } = require('./sandbox-host');

const { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker, shell, Menu, MenuItem, desktopCapturer } = require('electron');

const contextMenu = require('electron-context-menu');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PRDC_JSLAB_ELECTRON_STORAGE: Store } = require('./storage');

const { PRDC_APP_LOGGER } = require('../../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER');

const { PRDC_JSLAB_PTY } = require('./pty.js');
const { PRDC_JSLAB_INSTANCE_ROUTER } = require('./instance-router');
const { PRDC_JSLAB_DEBUGGER_DISPATCHER } = require("../other-shared/debugger-dispatcher");
const { PRDC_JSLAB_LANGUAGE } = require('../other-shared/language');
const { PRDC_JSLAB_ASSISTANT } = require('../windows/assistant');
const { PRDC_JSLAB_AUTOMATION } = require('./automation');

/**
 * Class for Electron main-process services and desktop windows.
 */
class PRDC_JSLAB_ELECTRON_MAIN_PROCESS {

  /**
   * Initializes process configuration and starts the Electron application.
   * @returns {PRDC_JSLAB_ELECTRON_MAIN_PROCESS} Application services.
   */
  static start() {
    global.app_path = app.getAppPath().replace(/\\js\\?$/, '');
    global.process_arguments = process.argv.slice();
    require('../other-shared/init-config');
    if(config.TEST) {
      const { PRDC_JSLAB_DEV_APP_TEST_RUNNER } = require('../dev/run-app-tests');
      new PRDC_JSLAB_DEV_APP_TEST_RUNNER(app, ipcMain, app_path, process_arguments).start();
    }
    return new this();
  }

  /**
   * Creates native services and registers the application lifecycle handlers.
   */
  constructor() {
    const store = new Store();

    var obj = this;

    this.store = store;
    this.assistant = new PRDC_JSLAB_ASSISTANT({ storage: store, host: this });
    this.runtime = new PRDC_JSLAB_ELECTRON_SANDBOX_HOST(this);
    this.windows = new PRDC_JSLAB_ELECTRON_WINDOW_MANAGER(this);
    this.files = new PRDC_JSLAB_ELECTRON_FILES(this);
    this.language = new PRDC_JSLAB_LANGUAGE(this.store, {}, { langs: config.langs });
    this.debounce_save_win_time = config.WIN_SAVE_DEBOUNCE_TIME;
    this.debounce_save_win_bounds = [];

    this.heartbeat_interval;
    this.win_main;
    this.win_editor;
    this.win_assistant;
    this.win_simulate;
    this.terminal_windows = new Map();
    this.terminal_window_id = 0;
    this.win_sandbox;
    this.win_opacity = 0;
    this.editor_close_ready = false;
    this.attention_flash_active = false;
    this.pending_open_scripts = [];
    this.instance_router = new PRDC_JSLAB_INSTANCE_ROUTER({
      on_open_scripts: function(script_paths) {
        return obj.files.openScriptsInEditor(script_paths);
      },
      is_script_path: function(script_path) {
        return obj.files.isJslScriptPath(script_path);
      }
    });
    this.startup_script_paths = this.instance_router.getStartupScriptPaths(process.argv);
    this.startup_model_path = process.argv.map(function(argument) {
      try {
        return path.resolve(String(argument));
      } catch(_error) {
        return '';
      }
    }).find(function(argument) {
      return /\.(?:jslmo|mo)$/i.test(argument) && fs.existsSync(argument);
    }) || '';
    this.cli_mode = process.argv.includes('--cli-runtime');
    this.automation_external = process.argv.includes('--mcp') || this.cli_mode;
    this.automation = new PRDC_JSLAB_AUTOMATION(this);
    this.automation_version = app.getVersion();
    this.simulate = null;

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
    this.app_folder = this.cli_mode ? app.getPath('userData') : app.getPath('documents') + '\\' + app.getName();
    if(!fs.existsSync(this.app_folder)) {
      fs.mkdirSync(this.app_folder);
    }

    // Start log
    this.log_file = this.app_folder + '\\' + app.getName() + '.log';
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
            label: obj.currentString(320),
            click: function() {
              obj.win_editor.send('EditorWindow', 'toggle-comment');
            },
            visible: p.formControlType == 'text-area' &&
              p.pageURL.endsWith('/editor.html')
          }),
          new MenuItem({
            label: obj.currentString(321),
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'go-to-code');
            },
            visible: p.pageURL.endsWith('/presentation-editor.html') &&
              p.frameURL != p.pageURL
          }),
          new MenuItem({
            label: obj.currentString(322),
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'go-to-slide');
            },
            visible: p.formControlType == 'text-area' &&
              p.titleText == 'html' &&
              p.pageURL.endsWith('/presentation-editor.html')
          }),
          new MenuItem({
            label: obj.currentString(536),
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'insert-slide-after',
                { source: 'code' });
            },
            visible: p.formControlType == 'text-area' &&
              p.titleText == 'html' &&
              p.pageURL.endsWith('/presentation-editor.html')
          }),
          new MenuItem({
            label: obj.currentString(537),
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'duplicate-slide',
                { source: 'code' });
            },
            visible: p.formControlType == 'text-area' &&
              p.titleText == 'html' &&
              p.pageURL.endsWith('/presentation-editor.html')
          }),
          new MenuItem({
            label: obj.currentString(387),
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
            label: obj.currentString(323),
            visible: p.editFlags.canSelectAll
          }),
          new MenuItem({
            role: 'delete',
            label: obj.currentString(387),
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
    app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer,SharedArrayBufferOnDesktop');
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
      obj.windows.createWindows();

      app.on('activate', function() {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if(BrowserWindow.getAllWindows().length === 0) {
          obj.windows.createWindows();
        }
      });
    });

    app.on('before-quit', function() {
      obj.is_app_quitting = true;
      obj.instance_router.stop();
      if(obj.assistant) {
        obj.assistant.cancel();
      }
      if(obj.automation) {
        obj.automation.stop();
      }
    });
    if(this.cli_mode) {
      var parent_arg = process.argv.find(function(arg) {
        return arg.startsWith('--cli-parent-pid=');
      });
      var parent_pid = Number(parent_arg && parent_arg.split('=')[1]);
      if(!Number.isInteger(parent_pid) || parent_pid <= 0) {
        throw new Error('CLI runtime requires an owning process.');
      }
      this.cli_parent_timer = setInterval(function() {
        try {
          process.kill(parent_pid, 0);
        } catch(err) {
          obj.closeCLI();
        }
      }, 1000);
      this.cli_parent_timer.unref();
    }

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', function() {
      if(process.platform !== 'darwin') {
        app.quit();
      }
    });
    app.allowRendererProcessReuse = false;
  }

  /**
   * Closes the runtime owned by a terminal session.
   */
  closeCLI() {
    if(!this.cli_mode) {
      return;
    }
    clearInterval(this.cli_parent_timer);
    if(this.automation) {
      this.automation.stop();
    }
    app.exit(0);
  }

  /**
   * Handle IPC messages
   */
  handleMessages() {
    this.files.bindFileRequests();
    var obj = this;

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
        ipcMain.once('console-accessor-' + request_id, function(event, result) {
          resolve(result);
        });
      });
    });

    ipcMain.handle('get-console-preview', function(e, expression) {
      var request_id = String(Date.now()) + '-' + (++console_request_serial);
      obj.win_sandbox.send('SandboxWindow', 'get-console-preview', {
        request_id: request_id, expression: expression
      });
      return new Promise(function(resolve) {
        ipcMain.once('console-preview-' + request_id, function(event, result) {
          resolve(result);
        });
      });
    });

    ipcMain.handle('is-console-expression-complete', function(e, code) {
      var request_id = String(Date.now()) + '-' + (++console_request_serial);
      obj.win_sandbox.send('SandboxWindow', 'is-console-expression-complete', {
        request_id: request_id, code: code
      });
      return new Promise(function(resolve) {
        ipcMain.once('console-expression-complete-' + request_id, function(event, result) {
          resolve(result);
        });
      });
    });

    ipcMain.on('get-desktop-sources', async function(e) {
      e.returnValue = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    });

    ipcMain.handle('JSLAB_ASSISTANT_SETTINGS_GET', function() {
      return obj.assistant.request('JSLAB_ASSISTANT_SETTINGS_GET');
    });
    ipcMain.handle('JSLAB_ASSISTANT_SETTINGS_SET', function(event, settings) {
      if(event.sender !== obj.win_main.webContents) {
        throw new Error('Expected the main window.');
      }
      return obj.assistant.request('JSLAB_ASSISTANT_SETTINGS_SET', settings);
    });
    ipcMain.handle('JSLAB_ASSISTANT_CHAT', async function(event, message) {
      if(event.sender !== obj.win_assistant.webContents) {
        throw new Error('Expected the Assistant window.');
      }
      return obj.assistant.request('JSLAB_ASSISTANT_CHAT', message);
    });
    ipcMain.on('JSLAB_ASSISTANT_CANCEL', function(event) {
      if(event.sender === obj.win_assistant.webContents) {
        obj.assistant.request('JSLAB_ASSISTANT_CANCEL');
      }
    });
    ipcMain.on('JSLAB_ASSISTANT_RESET', function(event) {
      if(event.sender === obj.win_assistant.webContents) {
        obj.assistant.request('JSLAB_ASSISTANT_RESET');
      }
    });

    ipcMain.handle('JSLAB_SIMULATE_PARSE', function(event, source) {
      if(event.sender !== obj.win_simulate.webContents) {
        throw new Error('Expected the Simulate window.');
      }
      return obj._getSimulateProject().parse(source);
    });
    ipcMain.handle('JSLAB_SIMULATE_OPEN', async function(event, file_path) {
      if(event.sender !== obj.win_simulate.webContents) {
        throw new Error('Expected the Simulate window.');
      }
      return obj._getSimulateProject().openFile(file_path);
    });
    ipcMain.handle('JSLAB_SIMULATE_SAVE', async function(event, request) {
      if(event.sender !== obj.win_simulate.webContents) {
        throw new Error('Expected the Simulate window.');
      }
      return obj._getSimulateProject().saveFile(request);
    });
    obj.simulate_resolve_pending = new Map();
    obj.simulate_resolve_id = 0;
    ipcMain.handle('JSLAB_SIMULATE_RESOLVE', function(event, expression) {
      if(event.sender !== obj.win_simulate.webContents) {
        throw new Error('Expected the Simulate window.');
      }
      if(!obj.win_sandbox || obj.win_sandbox.isDestroyed()) {
        throw new Error('The JSLAB workspace is unavailable.');
      }
      var id = ++obj.simulate_resolve_id;
      return new Promise(function(resolve) {
        var timer = setTimeout(function() {
          obj.simulate_resolve_pending.delete(id);
          resolve({ success: false, error: 'JSLAB expression evaluation timed out.' });
        }, 10000);
        obj.simulate_resolve_pending.set(id, { resolve: resolve, timer: timer });
        obj.win_sandbox.send('SandboxWindow', 'simulate-resolve', { id: id, expression: String(expression || '') });
      });
    });
    ipcMain.on('JSLAB_SIMULATE_RESOLVE_RESULT', function(event, response) {
      if(event.sender !== obj.win_sandbox.webContents || !response) {
        return;
      }
      var pending = obj.simulate_resolve_pending.get(Number(response.id));
      if(!pending) {
        return;
      }
      clearTimeout(pending.timer);
      obj.simulate_resolve_pending.delete(Number(response.id));
      pending.resolve(response);
    });
    obj.simulate_automation_pending = new Map();
    obj.simulate_automation_id = 0;
    ipcMain.handle('JSLAB_SIMULATE_AUTOMATION', function(event, request) {
      if(event.sender !== obj.win_sandbox.webContents) {
        throw new Error('Expected the JSLAB sandbox.');
      }
      var id = ++obj.simulate_automation_id;
      obj.windows.showSimulate();
      return new Promise(function(resolve) {
        obj.simulate_automation_pending.set(id, { resolve: resolve });
        obj.win_simulate.send('SimulateWindow', 'automation', {
          id: id,
          filepath: request && request.filepath || '',
          options: request && request.options || {}
        });
      });
    });
    ipcMain.on('JSLAB_SIMULATE_AUTOMATION_RESULT', function(event, response) {
      if(event.sender !== obj.win_simulate.webContents || !response) {
        return;
      }
      var pending = obj.simulate_automation_pending.get(Number(response.id));
      if(!pending) {
        return;
      }
      obj.simulate_automation_pending.delete(Number(response.id));
      pending.resolve(response);
    });
    ipcMain.on('JSLAB_SIMULATE_RESULT', function(event, data) {
      if(event.sender !== obj.win_simulate.webContents) {
        return;
      }
      if(obj.win_sandbox && !obj.win_sandbox.isDestroyed()) {
        obj.win_sandbox.send('SandboxWindow', 'simulate-result', data);
      }
    });
    ipcMain.on('JSLAB_SIMULATE_ANIMATION', function(event, data) {
      if(event.sender !== obj.win_simulate.webContents) {
        return;
      }
      if(obj.win_sandbox && !obj.win_sandbox.isDestroyed()) {
        obj.win_sandbox.send('SandboxWindow', 'simulate-animation', data);
      }
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
          try {
            obj.debugger.begin(data);
            retval = true;
          } catch(error) {
            retval = { error: error.message };
          }
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
            obj.windows.openDevTools(obj.sandbox_sub_wins[data]);
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
          if(obj.automation) {
            obj.automation.reset();
          }
          obj.sandbox_reload_active = true;
          obj.win_sandbox.destroy();
          Object.keys(obj.sandbox_sub_wins).forEach(function(wid) {
            obj.sandbox_sub_wins[wid].destroy();
            delete obj.sandbox_sub_wins[wid];
          });
          obj.runtime.createSandboxWindow();
          break;
        case 'pty':
          retval = obj.pty[data.action](e, data.data);
          break;
        case 'terminal-window':
          retval = obj.windows.controlTerminalWindow(data.action, data.data);
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
          obj.windows.openDevTools(BrowserWindow.fromWebContents(e.sender));
          break;
        case 'show-sandbox-dev-tools':
          // Show Sandbox DevTools
          obj.windows.openDevTools(obj.win_sandbox);
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
          obj.windows.fadeWindowIn(BrowserWindow.fromWebContents(e.sender), 0.1, 10);
          break;
        case 'fade-out-win':
          obj.windows.fadeWindowIn(BrowserWindow.fromWebContents(e.sender), 0.1, 10);
          break;
        case 'close-win':
          BrowserWindow.fromWebContents(e.sender).close();
          if(!e.sender.isDestroyed()) {
            e.sender.destroy();
          }
          break;
        case 'close-app':
          obj.is_app_quitting = true;
          if(obj.win_main !== undefined && !obj.win_main.isDestroyed()) {
            obj.win_main.destroy();
          }
          if(obj.win_editor !== undefined && !obj.win_editor.isDestroyed()) {
            obj.win_editor.send('EditorWindow', 'close-all');
          }
          if(obj.win_assistant !== undefined && !obj.win_assistant.isDestroyed()) {
            obj.win_assistant.destroy();
          }
          if(obj.win_simulate !== undefined && !obj.win_simulate.isDestroyed()) {
            obj.win_simulate.destroy();
          }
          for(const record of obj.terminal_windows.values()) {
            if(!record.win.isDestroyed()) {
              record.win.destroy();
            }
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
          if(target_win.isMaximized()) {
            target_win.restore();
          } else {
            target_win.maximize();
          }
          break;
        }
        case 'show-editor':
          // Show editor
          obj.windows.showEditor();
          break;
        case 'show-assistant':
          obj.windows.showAssistant();
          break;
        case 'show-simulate':
          obj.windows.showSimulate(data);
          break;
        case 'hide-simulate':
          if(obj.win_simulate && !obj.win_simulate.isDestroyed()) {
            obj.win_simulate.hide();
          }
          break;
        case 'hide-assistant':
          if(obj.win_assistant && !obj.win_assistant.isDestroyed()) {
            obj.win_assistant.hide();
          }
          break;
        case 'show-terminal':
          obj.windows.showTerminal();
          break;
        case 'hide-terminal':
          var terminal_win = BrowserWindow.fromWebContents(e.sender);
          if(terminal_win) {
            terminal_win.close();
          }
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
                label: obj.currentString(321),
                click: function() {
                  sub_win.webContents.send('PresentationEditorWindow',
                    'go-to-code', { source: 'thumbnail', index: data.index });
                }
              },
              {
                label: obj.currentString(536),
                click: function() {
                  sub_win.webContents.send('PresentationEditorWindow',
                    'insert-slide-after', { source: 'thumbnail', index: data.index });
                }
              },
              {
                label: obj.currentString(537),
                click: function() {
                  sub_win.webContents.send('PresentationEditorWindow',
                    'duplicate-slide', { source: 'thumbnail', index: data.index });
                }
              },
              {
                label: obj.currentString(387),
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
                obj.runtime._destroyClosedSandboxWindow(wid, win);
              }, 500);
            }
          });
          if(data && data.top_level_script_finished) {
            obj.windows.requestScriptFinishedAttention();
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
        if(action === 'code-evaluating') {
          obj.automation.busy = true;
        }
        if(action === 'code-evaluated' && obj.automation.active_id) {
          return;
        }
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
          if(data?.path && fs.existsSync(data.path)) {
            obj.windows.showEditor();
          }
          obj.win_editor.send('EditorWindow', action, data);
          break;
        case 'open-script':
          // Open file in editor
          obj.windows.showEditor();
          obj.win_editor.send('EditorWindow', 'open-script', data);
          break;
        default:
          // Other actions
          obj.win_editor.send('EditorWindow', action, data);
          break;
      }
    });

    ipcMain.on('AssistantWindow', function(e, action, data) {
      if(action === 'show') {
        obj.windows.showAssistant();
      } else if(obj.win_assistant && !obj.win_assistant.isDestroyed()) {
        obj.win_assistant.send('AssistantWindow', action, data);
      }
    });

    ipcMain.on('SimulateWindow', function(e, action, data) {
      if(action === 'show') {
        obj.windows.showSimulate(data);
      } else if(obj.win_simulate && !obj.win_simulate.isDestroyed()) {
        obj.win_simulate.send('SimulateWindow', action, data);
      }
    });

    ipcMain.on('TerminalWindow', function(e, action, data) {
      if(action === 'show') {
        obj.windows.showTerminal();
      } else {
        for(const record of obj.terminal_windows.values()) {
          if(record.ready && !record.win.isDestroyed()) {
            record.win.send('TerminalWindow', action, data);
          }
        }
      }
    });

    ipcMain.on('TerminalWindowEvent', function(e, data) {
      var record = data && obj.terminal_windows.get(Number(data.id));
      if(!record || record.win.isDestroyed() || e.sender !== record.win.webContents) {
        return;
      }
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
        if(obj.debugger.state === 'unavailable') {
          obj.win_main.send('MainWindow', 'code-evaluated', {});
        }
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
      if(obj.debugger.state === 'stopping') {
        return;
      }
      if(action === 'eval-code' || action === 'run-last-script') {
        obj.debugger.reserve();
      }
      switch(action) {
        default:
          obj.win_sandbox.send('SandboxWindow', action, data);
          break;
      }
    });
    ipcMain.handle('JSLAB_DEBUG_SOURCE', async (event, source) => {
      if(event.sender !== obj.win_sandbox.webContents) {
        throw new Error('Expected sandbox source registration.');
      }
      await obj.debugger.registerSource(source);
      return true;
    });
    ipcMain.handle('JSLAB_MODULE_POSITION', async (event, frame) => {
      if(event.sender !== obj.win_sandbox.webContents) {
        throw Error('Expected sandbox module location.');
      }
      return obj.debugger.originalModulePosition(frame);
    });
    ipcMain.handle('JSLAB_TASK_START', async (event, request) => {
      if(event.sender !== obj.win_sandbox.webContents) {
        throw Error('Expected the scientific sandbox.');
      }
      return obj.runtime.runTask(event.sender, request);
    });
    ipcMain.handle('JSLAB_TASK_CANCEL', async (event, id) => obj.runtime.cancelTask(event.sender.id, id));

    ipcMain.handle('JSLAB_DEBUGGER_OPEN', async event => {
      if(![obj.win_main.webContents, obj.win_editor?.webContents].includes(event.sender)) {
        throw Error('Expected an application editor or main window.');
      }
      return obj.windows.openEditorDebugger();
    });
    ipcMain.handle('JSLAB_DEBUGGER_VIEW_STATE', async event => {
      if(event.sender !== obj.win_editor?.webContents) {
        throw Error('Expected the Editor window.');
      }
      return obj.debugger_view_state || { ...obj.debugger.status(), frame_index: 0 };
    });
    ipcMain.on('DebuggerPane', (event, action, data) => {
      if(event.sender !== obj.win_main.webContents) {
        return;
      }
      if(action === 'state') {
        obj.debugger_view_state = data;
      }
      if(obj.win_editor && !obj.win_editor.isDestroyed() && action === 'state') {
        obj.win_editor.send('EditorWindow', 'debugger-view-state', data);
      }
    });
    ipcMain.handle('JSLAB_DEBUGGER', async (_event, method, args = {}) => {
      return PRDC_JSLAB_DEBUGGER_DISPATCHER.request(() => obj.runtime.debugCommand(method, args));
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
        if(obj.automation) {
          obj.automation.reset();
        }
        if(obj.cli_mode) {
          console.error('[sandbox] ' + error);
        }
        obj.win_main.send('MainWindow', 'error', error);
      }
    });
  }

  /**
   * Waits for a sandbox automation job used by Assistant tools.
   */
  async runAssistantAutomation(method, args) {
    var job = await this.automation.dispatch(method, args || {});
    if(!job || job.status !== 'running') {
      return job;
    }
    this.assistant_execution_id = job.execution_id;
    try {
      var deadline = Date.now() + 120000;
      while(job.status === 'running' && Date.now() < deadline) {
        await new Promise(function(resolve) {
          setTimeout(resolve, 25);
        });
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
      if(this.assistant_execution_id === job.execution_id) {
        this.assistant_execution_id = null;
      }
    }
  }

  /**
 * Reads main-window context through the native renderer transport.
 */
  _readMainAssistantContext() {
    return this.win_main.webContents.executeJavaScript('win_main.getAssistantContext()');
  }

  /**
 * Reads Editor context through the native renderer transport.
 */
  _readEditorAssistantContext() {
    return this.win_editor.webContents.executeJavaScript('win_editor.getAssistantContext()');
  }

  /**
 * Runs Assistant code through the existing isolated automation bridge.
 */
  _evaluateAssistantCode(code) {
    return this.runAssistantAutomation('evaluate_code', { code });
  }

  /**
 * Reads help through the same native automation bridge.
 */
  _readAssistantHelp(query, type) {
    return this.runAssistantAutomation('get_help', { name: query, type });
  }

  /**
 * Opens or focuses the native Editor and validates a requested local file.
 */
  _openAssistantEditor(file_path) {
    this.windows.showEditor();
    if(file_path) {
      if(typeof file_path !== 'string' || !fs.existsSync(file_path)) {
        throw Error('Editor file does not exist.');
      }
      this.win_editor.send('EditorWindow', 'open-script', [file_path]);
    }
    return true;
  }

  /**
 * Applies an approved selection edit through the native renderer transport.
 */
  async _replaceAssistantSelection(text) {
    const confirmation = await dialog.showMessageBox(this.win_assistant, {
      type: 'question', buttons: [this.currentString(661), this.currentString(52)],
      defaultId: 1, cancelId: 1, message: this.currentString(660)
    });
    if(confirmation.response !== 0) {
      return { applied: false };
    }
    await this.win_editor.webContents.executeJavaScript(
      'win_editor.replaceAssistantSelection(' + JSON.stringify(text) + ')');
    this.windows.showEditor();
    return { applied: true };
  }

  /**
 * Interrupts only the native scientific execution owned by Assistant.
 */
  _interruptAssistantExecution() {
    if(this.assistant_execution_id && this.automation.active_id === this.assistant_execution_id) {
      return this.debugger.interrupt().catch(() => false);
    }
    return false;
  }

  /**
   * Returns the current localized string from the language catalog.
   * @param {number|string} id The string ID.
   * @returns {string} The localized string.
   */
  currentString(id) {
    return this.language.currentString(id);
  }

  /**
   * Returns a localized string from the language catalog with placeholder formatting.
   * If called with one argument, this is equivalent to currentString(id).
   * @param {number|string} id The string ID.
   * @param {Object} [values={}] Placeholder values.
   * @returns {string} The localized string.
   */
  formatLang(id, values) {
    return this.language.formatLang(id, values);
  }

  /**
   * Loads native Simulate project services when a project operation first needs them.
   * @returns {Object} Cached project parser and file workflow.
   */
  _getSimulateProject() {
    if(!this.simulate) {
      const { PRDC_JSLAB_SIMULATE_COMPILER } = require('../simulate/compiler');
      const { PRDC_JSLAB_SIMULATE_ASSETS } = require('./simulate-assets');
      PRDC_JSLAB_SIMULATE_COMPILER.configure(PRDC_JSLAB_SIMULATE_ASSETS);
      const { PRDC_JSLAB_SIMULATE_PROJECT } = require('../simulate/project');
      this.simulate = new PRDC_JSLAB_SIMULATE_PROJECT({
        store: this.store,
        language: this.language,
        files: { path, normalizePath: file => path.resolve(String(file)), exists: file => fs.existsSync(file),
          read: file => fs.readFileSync(file, 'utf8'), write: (file, text) => fs.writeFileSync(file, text, 'utf8'),
          showOpenDialog: options => dialog.showOpenDialog(this.win_simulate, options),
          showSaveDialog: options => dialog.showSaveDialog(this.win_simulate, options) }
      });

    }
    return this.simulate;
  }

}

exports.PRDC_JSLAB_ELECTRON_MAIN_PROCESS = PRDC_JSLAB_ELECTRON_MAIN_PROCESS;

// Electron loads its entry without assigning require.main or module.parent.
if(require.main === module || (!module.parent && process.type === 'browser')) {
  PRDC_JSLAB_ELECTRON_MAIN_PROCESS.start();
}
