/**
 * @file JSLAB main script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker, shell, 
  MenuItem , desktopCapturer, screen, webContents } = require('electron');

const contextMenu = require('electron-context-menu');
const fs = require('fs');
const os = require('os');
const Store = require('electron-store');

const { PRDC_APP_LOGGER } = require('./../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER');

/**
 * Class for flight control app.
 */
class PRDC_JSLAB_MAIN {

  /**
   * Create app.
   */
  constructor() {
    var obj = this;

    this.store = new Store();
    this.debounce_save_win_time = config.WIN_SAVE_DEBOUNCE_TIME;
    this.debounce_save_win_bounds = [];

    this.heartbeat_interval;
    this.win_main;
    this.win_editor;
    this.win_sandbox;
    this.win_opacity = 0;
    this.editor_close_ready = false;
    this.stop_loop_in = false;
    
    this.app_icon = app_path + '/icons/icon.ico'; // png to ico https://icoconvert.com/
    this.is_app_quitting = false;
    this.known_paths = ['home', 'appData', 'userDat', 'sessionData', 
      'temp', 'exe', 'module', 'desktop', 'documents', 'downloads', 
      'music', 'pictures', 'videos', 'recent', 'logs', 'crashDumps'];
                
    if(os.platform() == 'linux') {
      this.app_icon = app_path + '/icons/icon.png';
    }

    // Create folder for app
    this.app_folder = app.getPath('documents')+'\\'+app.getName();
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
            label: 'Toggle Comment',
            click: function() {
              obj.win_editor.send('EditorWindow', 'toggle-comment');
            },
            visible: p.formControlType == 'text-area' &&
              p.pageURL.endsWith('/editor.html')
          }),
          new MenuItem({
            label: 'Go To Code',
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'go-to-code');
            },
            visible: p.pageURL.endsWith('/presentation-editor.html') && 
              p.frameURL != p.pageURL
          }),
          new MenuItem({
            label: 'Go To Slide',
            click: function() {
              win.webContents.send('PresentationEditorWindow', 'go-to-slide');
            },
            visible: p.formControlType == 'text-area' &&
              p.titleText == 'html' &&
              p.pageURL.endsWith('/presentation-editor.html')
          }),
          new MenuItem({
            role: 'selectAll',
            label: 'Select All',
            visible: p.editFlags.canSelectAll
          }),
          new MenuItem({
            role: 'delete',
            label: 'Delete',
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
    app.commandLine.appendSwitch('max-active-webgl-contexts', config.MAX_ACTIVE_WEBGL_CONTEXTS);
    
    // Prevent sleep
    powerSaveBlocker.start('prevent-app-suspension');
  
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.whenReady().then(function(){
      obj.createWindows();

      app.on('activate', function() {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if(BrowserWindow.getAllWindows().length === 0) obj.createWindows();
      });
    });

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', function () {
      if(process.platform !== 'darwin') app.quit();
    });
    app.allowRendererProcessReuse = false;
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

    // Set handlers
    this.setHandlers();
    
    // Handle IPC messages
    this.handleMessages();
  }

  /**
   * Create main window
   */
  creatMainWindow() {
    var obj = this;
    var options = {
      title: 'JSLAB',
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
    
    // Show window when ready
    this.win_main.once('ready-to-show', function() {
      obj.win_main.show();
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
      title: 'Sandbox | JSLAB',
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

    // Hide menu
    this.win_sandbox.setMenu(null);

    // and load the index.html of the app
    this.win_sandbox.loadFile(app_path + '/html/sandbox.html');
    
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
      
      // Hide menu
      sub_win.setMenu(null);
      
      // Show window
      sub_win.once('ready-to-show', function() {
        sub_win.show();
        sub_win.focus();
        obj.fadeWindowIn(sub_win, 0.1, 10);

        if(config.DEBUG) {
          obj.openDevTools(sub_win);
        }
      });
     
      sub_win.webContents.on('did-attach-webview', (_e, wc) => {
        if(wc.getUserAgent() == 'presentation-editor-preview') {
          contextMenu({ 
            window: wc,
            append: function(default_actions, p, win) {
              return [
                new MenuItem({
                  label: 'Go To Slide',
                  click: function() {
                    sub_win.webContents.send('PresentationEditorWindow', 'go-to-code');
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
        e.preventDefault();
        obj.win_sandbox.webContents.executeJavaScript('jsl.windows._closedWindow('+wid+');');
        sub_win.hide();
        sub_win.forClose = true;
      });
      
    });
    
    this.win_sandbox.webContents.on('render-process-gone', function(event, details) {
      obj.app_logger.logMessage(config.DEBUG_RENDER_GONE_ERROR, config.LOG_RENDER_GONE_ERROR, config.LOG_CODES['render-gone-error'], 'Render gone error', 'Sandbox window render gone error:' + JSON.stringify(event) + ' ' + JSON.stringify(details));
      app.exit();
      app.relaunch();
    });
    
    this.win_sandbox.webContents.on('did-finish-load', function() {
      if(!obj.store.get('shown-getting-started')) {
        obj.store.set('shown-getting-started', 1);
        obj.win_sandbox.webContents.executeJavaScript('openDocumentation("about");');
      }
      if(obj.sandbox_reload_active) {
        obj.win_main.webContents.executeJavaScript('win_main.onSandboxReset();');
        obj.sandbox_reload_active = false;
      }
    });
  }

  /**
   * Create editor window
   */
  createEditorWindow() {
    var obj = this;
    var options = {
      title: 'Editor | JSLAB',
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

    // Hide window when ready
    this.win_editor.hide();
   
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

  /**
   * Handle IPC messages
   */
  handleMessages() {
    var obj = this;
    
    // For MainProcess 
    ipcMain.handle('get-completions', function(e, data) {
      obj.win_sandbox.send('SandboxWindow', 'get-completions', data);
      return new Promise(function(resolve) {
        ipcMain.once('completions-'+data[0], function(e, data) {
          resolve(data);
        });
      });
    });
    
    ipcMain.handle('dialog', function(e, method, params) {       
      if(!params || params && !params.hasOwnProperty('icon')) {
        if(!params) {
          params = {};
        }
        params.icon = obj.app_icon;
      }
      return dialog[method](params);
    });

    ipcMain.on('get-desktop-sources', async function(e) {
      e.returnValue = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    });

    ipcMain.handle('print-to-pdf', async function(e, options) {
      return await e.sender.printToPDF(options);
    });
    
    ipcMain.handle('print-sub-win-to-pdf', async function(e, wid, options) {
      return await obj.sandbox_sub_wins[wid].webContents.printToPDF(options);
    });
    
    ipcMain.on('dialog', function(e, method, params) {
      if(!params || params && !params.hasOwnProperty('icon')) {
        if(!params) {
          params = {};
        }
        params.icon = obj.app_icon;
      }
      e.returnValue = dialog[method](params);
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
        case 'check-stop-loop':
          retval = obj.stop_loop_in;
          break;
        case 'reset-stop-loop':
          obj.stop_loop_in = false;
          retval = true;
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
          obj.sandbox_reload_active = true;
          obj.win_sandbox.destroy();
          Object.keys(obj.sandbox_sub_wins).forEach(function(wid) {
            obj.sandbox_sub_wins[wid].destroy();
            delete obj.sandbox_sub_wins[wid];
          });
          obj.createSandboxWindow();
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
          e.sender.destroy();
          break;
        case 'close-app':
          if(obj.win_main !== undefined && !obj.win_main.isDestroyed()) {
            obj.win_main.destroy();
          }
          if(obj.win_editor !== undefined && !obj.win_editor.isDestroyed()) {
            obj.is_app_quitting = true;
            obj.win_editor.send('EditorWindow','close-all');
          }
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
        case 'show-editor':
          // Show editor
          obj.showEditor();
          break;
        case 'close-editor':
          // Close editor
          obj.editor_close_ready = true;
          obj.win_editor.close();
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
                win.destroy();
                delete obj.sandbox_sub_wins[wid];
              }, 500);
            }
          });
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
    
    // For SandboxWindow
    ipcMain.on('SandboxWindow', function(e, action, data) {
      if(action == 'stop-loop') {
        obj.stop_loop_in = data;
      }
      switch(action) {
        default:
          obj.win_sandbox.send('SandboxWindow', action, data);
          break;
      }
    });
  }

  /**
   * Show editor window
   */
  showEditor() {
    this.win_editor.show();
    this.win_editor.focus();
    this.fadeWindowIn(this.win_editor, 0.1, 10);
   
    if(config.DEBUG) {
      if(!this.win_editor.devtools_win || !this.win_editor.devtools_win.isVisible()) {
        this.openDevTools(this.win_editor);
      }
    }
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
   * @param {BrowserWindow} win - broweser window.
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
   * Opens the Developer Tools for the specified Electron BrowserWindow in a detached window.
   * @param {BrowserWindow} win - The Electron `BrowserWindow` instance for which to open the Developer Tools.
   */
  openDevTools(win) {
    if(win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
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