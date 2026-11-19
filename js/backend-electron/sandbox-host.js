/**
 * @file JSLAB Electron runtime services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_DEBUGGER_DISPATCHER } = require("../other-shared/debugger-dispatcher");
const { PRDC_JSLAB_CLI_SESSION } = require('../cli/session');
const cp = require('child_process');
const v8 = require('v8');
const path = require('path');
const fs = require('fs');

const { app, BrowserWindow, MenuItem } = require('electron');
const { PRDC_JSLAB_ELECTRON_CHROMIUM_DEBUGGER } = require('./chromium-debugger');

/**
 * Implements runtime services for the application host.
 */
class PRDC_JSLAB_ELECTRON_SANDBOX_HOST {
  /**
   * Connects host services to the owning application.
   * @param {Object} application Application host controller.
   */
  constructor(application) {
    this.application = application;
    this._debugger_commands = new PRDC_JSLAB_DEBUGGER_DISPATCHER({
      getDebugger: () => application.debugger,
      selectFrame: (args, state) => this._selectDebugFrame(args, state)
    }, { inspect: 'properties', evaluate: 'evaluate', resume: 'resume' });
    this.jobs = new Map();
    this.owners = new WeakSet();
  }

  /**
   * Create sandbox window
   */
  createSandboxWindow() {
    const contextMenu = require('electron-context-menu');
    var obj = this;
    this.application.win_sandbox = new BrowserWindow({
      title: this.application.currentString(512),
      minWidth: 720,
      minHeight: 500,
      icon: this.application.app_icon, // png to ico https://icoconvert.com/
      show: false,
      backgroundColor: '#ffffff',
      opacity: this.application.win_opacity,
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInWorker: true,
        contextIsolation: false,
        backgroundThrottling: false
      }
    });
    this.application.debugger = new PRDC_JSLAB_ELECTRON_CHROMIUM_DEBUGGER(this.application.win_sandbox.webContents, {
      state: state => {
        if(this.application.win_main && !this.application.win_main.isDestroyed()) {
          this.application.win_main.send('MainWindow', 'debugger-state', state);
        }
        if(this.application.win_editor && !this.application.win_editor.isDestroyed()) {
          this.application.win_editor.send('EditorWindow', 'debugger-state', state);
        }
      },
      settings: settings => this.application.store.set('debugger-settings', settings),
      interrupted: (_id, result) => {
        if(this.application.automation && this.application.automation.active_id) {
          this.application.automation.complete({ id: this.application.automation.active_id,
            result: { success: false, interrupted: true, error: 'Execution interrupted.',
              cleanup_errors: result.cleanup_errors, output: [] } });
        } else if(this.application.automation) {
          this.application.automation.busy = false;
        }
        if(this.application.win_main && !this.application.win_main.isDestroyed()) {
          this.application.win_main.send('MainWindow', 'code-evaluated', { interrupted: true });
          this.application.win_main.send('MainWindow', 'disp', 'Execution interrupted.');
          for(const error of result.cleanup_errors || []) {
            this.application.win_main.send('MainWindow', 'warn', 'Cleanup: ' + error);
          }
        }
      },
      error: error => {
        if(this.application.win_main && !this.application.win_main.isDestroyed()) {
          this.application.win_main.send('MainWindow', 'warn', error.message);
        }
        console.error('[debugger] ' + error.message);
      }
    });
    const saved_debugger = this.application.store.get('debugger-settings', {});
    this.application.debugger.ready.then(async () => {
      for(const point of saved_debugger.breakpoints || []) {
        await this.application.debugger.setBreakpoint(point.path, point.line, point.condition || '', point.enabled !== false);
      }
      if(saved_debugger.pause_on_exceptions) {
        await this.application.debugger.setExceptionPause(saved_debugger.pause_on_exceptions);
      }
    }).catch(error => console.error('[debugger settings] ' + error.message));
    this.application.windows.bindAttentionReset(this.application.win_sandbox);

    // Hide menu
    this.application.win_sandbox.setMenu(null);
    if(!this.application.cli_mode) {
      this.application.instance_router.trackWindowActivity(this.application.win_sandbox);
    }

    // and load the index.html of the app
    this.application.win_sandbox.loadFile(app_path + '/html/sandbox.html');
    if(this.application.automation) {
      this.application.win_sandbox.webContents.on('console-message', function(event, level, message) {
        obj.application.automation.captureConsole(level, message);
        if(obj.application.cli_mode && level >= 2) {
          console.error('[sandbox console] ' + message);
        }
      });
      this.application.win_sandbox.webContents.on('did-start-loading', function() {
        obj.application.automation.reset();
      });
      this.application.win_sandbox.webContents.on('destroyed', function() {
        obj.application.automation.reset();
      });
    }

    if(config.DEBUG) {
      // Show dev tools
      this.application.windows.openDevTools(this.application.win_sandbox);
    }

    // Sub windows
    this.application.win_sandbox.webContents.setWindowOpenHandler(function(handler) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          minWidth: 250,
          minHeight: 50,
          icon: obj.application.app_icon, // png to ico https://icoconvert.com/
          show: false,
          backgroundColor: '#ffffff',
          opacity: obj.application.win_opacity,
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

    this.application.sandbox_sub_wins = {};
    this.application.win_sandbox.webContents.on('did-create-window', function(sub_win, details) {
      var wid = details.frameName;
      obj.application.sandbox_sub_wins[wid] = sub_win;
      if(!obj.application.cli_mode) {
        obj.application.instance_router.trackWindowActivity(sub_win);
      }
      obj.application.windows.bindAttentionReset(sub_win);

      // Hide menu
      sub_win.setMenu(null);

      // Show window
      sub_win.once('ready-to-show', function() {
        if(sub_win.isDestroyed() || sub_win.forClose) {
          return;
        }
        if(obj.application.cli_mode) {
          sub_win.showInactive();
        } else {
          sub_win.show();
          sub_win.focus();
        }
        obj.application.windows.fadeWindowIn(sub_win, 0.1, 10);

        if(config.DEBUG) {
          obj.application.windows.openDevTools(sub_win);
        }
      });
      if(obj.application.cli_mode) {
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
                  label: obj.application.currentString(321),
                  click: function() {
                    sub_win.webContents.send('PresentationEditorWindow', 'go-to-code');
                  },
                  visible: true
                }),
                new MenuItem({
                  label: obj.application.currentString(536),
                  click: function() {
                    sub_win.webContents.send('PresentationEditorWindow',
                      'insert-slide-after', { source: 'preview' });
                  },
                  visible: true
                }),
                new MenuItem({
                  label: obj.application.currentString(537),
                  click: function() {
                    sub_win.webContents.send('PresentationEditorWindow',
                      'duplicate-slide', { source: 'preview' });
                  },
                  visible: true
                }),
                new MenuItem({
                  label: obj.application.currentString(387),
                  click: function() {
                    sub_win.webContents.send('PresentationEditorWindow',
                      'delete-slide', { source: 'preview' });
                  },
                  visible: true
                })
              ];
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
        if(is_presentation_editor) sub_win.emit('presentation-close-accepted');
        e.preventDefault();
        obj.application.win_sandbox.webContents.send('SandboxWindow', 'window-closed', wid);
        sub_win.hide();
        sub_win.forClose = true;
        sub_win.presentation_editor_close_ready = false;
        setTimeout(function() {
          obj._destroyClosedSandboxWindow(wid, sub_win);
        }, 500);
      });

    });

    this.application.win_sandbox.webContents.on('render-process-gone', function(event, details) {
      if(obj.application.automation) {
        obj.application.automation.reset();
      }
      obj.application.app_logger.logMessage(config.DEBUG_RENDER_GONE_ERROR, config.LOG_RENDER_GONE_ERROR, config.LOG_CODES['render-gone-error'], 'Render gone error', 'Sandbox window render gone error:' + JSON.stringify(event) + ' ' + JSON.stringify(details));
      app.exit();
      app.relaunch();
    });

    this.application._on_sandbox_ready = async function() {
      await obj.application.debugger.ready;
      if(obj.application.automation) {
        obj.application.automation.ready = true;
      }
      if(!obj.application.cli_mode && !obj.application.store.get('shown-getting-started')) {
        obj.application.store.set('shown-getting-started', 1);
        obj.application.win_sandbox.webContents.executeJavaScript('openDocumentation("about");');
      }
      if(obj.application.sandbox_reload_active) {
        obj.application.win_main.webContents.executeJavaScript('win_main.onSandboxReset();');
        obj.application.sandbox_reload_active = false;
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
    if(!win.forClose) {
      return;
    }
    if(!win.isDestroyed()) {
      win.destroy();
    }
    if(this.application.sandbox_sub_wins[wid] === win) {
      delete this.application.sandbox_sub_wins[wid];
    }
  }

  /**
   * Runs the normal close confirmation for each open Presentation Editor before app shutdown.
   * @returns {Promise<boolean>} Whether all Presentation Editors accepted closure.
   */
  async closePresentationEditors() {
    for(const win of Object.values(this.application.sandbox_sub_wins || {})) {
      if(win.isDestroyed() || win.forClose ||
          !win.webContents.getURL().endsWith('/presentation-editor.html')) continue;
      const accepted = await new Promise(resolve => {
        const finish = result => {
          win.removeListener('presentation-close-accepted', accept);
          win.removeListener('closed', accept);
          win.removeListener('presentation-close-cancelled', cancel);
          resolve(result);
        };
        const accept = () => finish(true);
        const cancel = () => finish(false);
        win.once('presentation-close-accepted', accept);
        win.once('closed', accept);
        win.once('presentation-close-cancelled', cancel);
        win.close();
      });
      if(!accepted) return false;
    }
    return true;
  }

  /**
   * Confirms relaunch in each Presentation Editor without closing any of them.
   * @returns {Promise<boolean>} Whether all Presentation Editors approved the restart.
   */
  async confirmPresentationReload() {
    for(const win of Object.values(this.application.sandbox_sub_wins || {})) {
      if(win.isDestroyed() || win.forClose || !win.webContents.getURL().endsWith('/presentation-editor.html')) continue;
      if(!await win.webContents.executeJavaScript('presentation_editor.confirmReload()', true)) return false;
    }
    return true;
  }

  /**
   * Publishes a frame selection validated by the common runtime coordinator.
   */
  _selectDebugFrame(args, state) {
    this.application.debugger_view_state = { ...state, frame_index: args.frame_index };
    this.application.win_main.send('MainWindow', 'debugger-select-frame', { frame_index: args.frame_index, revision: state.revision });
    if(this.application.win_editor && !this.application.win_editor.isDestroyed()) {
      this.application.win_editor.send('EditorWindow', 'debugger-view-state', this.application.debugger_view_state);
    }
    return this.application.debugger_view_state;
  }

  /**
   * Starts a fresh scientific runtime and returns structured-cloneable task data.
   */
  async runTask(owner, request) {
    if(typeof request.id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(request.id) || this.jobs.has(request.id)) {
      throw Error('Invalid isolated task identity.');
    }
    if(typeof request.source !== 'string' || Buffer.byteLength(request.source) > 512000 || !Array.isArray(request.args)) {
      throw Error('Invalid isolated task source or arguments.');
    }
    if(this.jobs.size >= 4) {
      throw Error('At most four isolated native tasks may run at once.');
    }
    const input = v8.serialize(request.args);
    const session = new PRDC_JSLAB_CLI_SESSION({ cwd: request.cwd, timeout: 0, detached: process.platform !== 'win32', headless: true });
    const job = { session, owner: owner.id, cancelled: false, stopping: null };
    this.jobs.set(request.id, job);
    if(!this.owners.has(owner)) {
      this.owners.add(owner);
      owner.once('destroyed', () => this.cancelOwnerTasks(owner.id));
    }
    try {
      await session.start();
      if(job.cancelled) {
        throw Error('Isolated task interrupted.');
      }
      const input_file = path.join(session.profile, 'native-task-input.bin');
      const output_file = path.join(session.profile, 'native-task-output.bin');
      fs.writeFileSync(input_file, input);
      const source = 'var isolated_args = require("v8").deserialize(require("fs").readFileSync(' + JSON.stringify(input_file) + '));\n' +
        'var isolated_result = await (' + request.source + ')(...isolated_args);\n' +
        'require("fs").writeFileSync(' + JSON.stringify(output_file) + ', require("v8").serialize(isolated_result));';
      const result = await session.execute('evaluate_code', { code: source });
      if(job.cancelled) {
        throw Error('Isolated task interrupted.');
      }
      if(!result.success) {
        return { success: false, error: result.error, error_details: result.error_details };
      }
      return { success: true, value: v8.deserialize(fs.readFileSync(output_file)) };
    } catch(error) {
      return { success: false, error: job.cancelled ? 'Isolated task interrupted.' : String(error.message || error), interrupted: job.cancelled };
    } finally {
      if(job.stopping) {
        await job.stopping;
      }
      await session.close();
      this.jobs.delete(request.id);
    }
  }

  /**
   * Force-stops only the process tree belonging to the requesting sandbox's job.
   */
  async cancelTask(owner_id, id) {
    const job = this.jobs.get(id);
    if(!job || job.owner !== owner_id) {
      return { stopped: false };
    }
    job.cancelled = true;
    if(job.stopping) {
      return job.stopping;
    }
    job.stopping = (async () => {
      const child = job.session.child;
      if(child && child.exitCode === null && child.signalCode === null) {
        if(process.platform === 'win32') {
          await new Promise(resolve => cp.execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => resolve()));
        } else {
          try {
            process.kill(-child.pid, 'SIGKILL');
          } catch(error) {
            child.kill('SIGKILL');
          }
        }
        if(child.exitCode === null && child.signalCode === null) {
          await new Promise(resolve => {
            const timer = setTimeout(resolve, 5000);
            child.once('exit', () => {
              clearTimeout(timer);
              resolve();
            });
          });
        }
      }
      return { stopped: true };
    })();
    return job.stopping;
  }

  /**
   * Stops isolated jobs when their owning sandbox is reset or closed.
   */
  cancelOwnerTasks(owner_id) {
    return Promise.all(Array.from(this.jobs).filter(([, job]) => job.owner === owner_id).map(([id]) => this.cancelTask(owner_id, id)));
  }

  /**
 * Dispatches structured requests through the shared debugger command router.
 */
  debugCommand(method, args = {}) {
    return this._debugger_commands.dispatch(method, args);
  }
}

exports.PRDC_JSLAB_ELECTRON_SANDBOX_HOST = PRDC_JSLAB_ELECTRON_SANDBOX_HOST;
