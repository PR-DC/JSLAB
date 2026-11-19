/**
 * @file JSLAB browser runtime services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WEB_BROWSER } = require('./browser');

const { PRDC_JSLAB_DEBUGGER_DISPATCHER } = require("../other-shared/debugger-dispatcher");
const { isInternalDebugFrame } = require('../other-shared/debugger-frames');
var { PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT } = require('./worker-debugger-client');

/**
 * Implements runtime services for the application host.
 */
class PRDC_JSLAB_WEB_SANDBOX_HOST {
  /**
   * Connects host services to the owning application.
   * @param {Object} application Application host controller.
   */
  constructor(application) {
    this.application = application;
    this._debugger_commands = new PRDC_JSLAB_DEBUGGER_DISPATCHER({
      getDebugger: () => application.worker_debugger.selectedClient(),
      getRootDebugger: () => application.worker_debugger,
      getState: () => this._workerDebugState(),
      selectFrame: args => this._selectDebugFrame(args),
      selectTarget: id => {
        application.worker_debugger.selectTarget(id);
        this._updateWorkerEditor();
        return this._workerDebugState();
      },
      reset: async () => {
        await this._resetSandbox();
        return this._workerDebugState();
      }
    });
  }

  /**
   * Handles a reset request from the owning sandbox.
   * @param {string} action Requested scope.
   */
  requestReset(action) {
    const reset = action === 'sandbox' ? this._resetSandbox(true) :
      action === 'app' ? this._resetApp() : null;
    reset?.catch(error => this.application.main.command_window.error(error.message));
  }

  /**
   * Replaces the sandbox worker and its children while preserving the application.
   * @param {boolean} [requested=false] Whether the sandbox requested the reset.
   */
  async _resetSandbox(requested = false) {
    const app = this.application;
    app.ui_sandbox_api?.stopAnimations();
    app.worker_debugger?.dispose(requested);
    app._renderWorkspaceVariables([]);
    await this._startWorkerDebugger();
  }

  /**
   * Reloads the application after open editors resolve unsaved changes.
   */
  async _resetApp() {
    if(this.resetting_app) return;
    this.resetting_app = true;
    try {
      const app = this.application;
      await app.window_manager.confirmReload(async () => {
        await app.fs.flushWrites();
        app.main.command_history.saveHistory();
        window.location.reload();
      });
    } finally {
      this.resetting_app = false;
    }
  }

  /**
   * Starts the shared sandbox inside a hidden same-origin iframe.
   */
  async _startSandbox() {
    var obj = this;
    this.application._setStatus('busy', 'Starting sandbox...');

    if(this.application.sandbox_frame) {
      this.application.sandbox_frame.remove();
      this.application.sandbox_frame = null;
      this.application.sandbox_api = null;
    }
    this.application.sandbox_frame_url = null;

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
          obj.application.sandbox_api = frame.contentWindow && frame.contentWindow.__JSLAB_WEB_SANDBOX__;
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
        if(obj.application.sandbox_api) {
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

    this.application.sandbox_frame = frame;
    if(document && document.body) {
      document.body.dataset.jslabWebSandboxReady = 'true';
      delete document.body.dataset.jslabWebSandboxError;
    }

    this.application.ui_sandbox_api = this.application.sandbox_api;
    if(globalThis.crossOriginIsolated && typeof SharedArrayBuffer === 'function') {
      await this._startWorkerDebugger();
      const shell = this;
      this.application.sandbox_api = {
        handshake: () => ({ ...shell.application.ui_sandbox_api.handshake(), runtime: 'sandbox-worker', workspace: shell.application.worker_debugger?.workspace || [] }),
        evaluate: async code => {
          await shell._startWorkerDebugger();
          const result = await shell.application.worker_debugger.evaluate(String(code), shell._workerEvaluationOptions());
          if(!result.success) {
            throw Object.assign(Error(result.error), { error_details: result.error_details, interrupted: result.interrupted });
          }
          return { ...result, ok: true };
        },
        getCompletions: async data => {
          await shell._startWorkerDebugger();
          return shell.application.worker_debugger.operation('completions', { data });
        },
        getConsoleProperties: async request => {
          await shell._startWorkerDebugger();
          return shell.application.worker_debugger.operation('console-properties', request);
        },
        getConsoleAccessor: async request => {
          await shell._startWorkerDebugger();
          return shell.application.worker_debugger.operation('console-accessor', request);
        },
        getConsolePreview: async expression => {
          await shell._startWorkerDebugger();
          return shell.application.worker_debugger.operation('console-preview', { expression });
        },
        isConsoleExpressionComplete: async code => {
          await shell._startWorkerDebugger();
          return shell.application.worker_debugger.operation('console-expression-complete', { code });
        },
        clearWorkspace: async () => {
          await shell._startWorkerDebugger();
          return shell.application.worker_debugger.operation('clear');
        },
        setLanguage: lang => shell.application.worker_debugger?.operation('language', { lang }),
        notifyWindowClosed: wid => shell._notifyWindowClosed(wid),
        resolveSimulateValue: expression => shell.application.worker_debugger.operation('simulate-resolve', { expression }),
        publishSimulation: data => shell.application.worker_debugger.operation('simulate-result', { data }),
        workerUI: operation => shell.application.ui_sandbox_api.workerUI(operation)
      };
    }
    var handshake = this.application.sandbox_api.handshake();
    this.application._setStatus('ready', '', 87);
    this.application._renderWorkspaceVariables(handshake.workspace || []);
  }

  /**
   * Delivers a close notification only while its sandbox worker can process it.
   * @param {number|string} wid Window identifier.
   * @returns {Promise<boolean>} Whether the worker received the notification.
   */
  async _notifyWindowClosed(wid) {
    const worker = this.application.worker_debugger;
    if(!worker || ['starting', 'closed', 'unavailable'].includes(worker.state)) return false;
    try {
      await worker.operation('window-closed', { wid });
      return true;
    } catch(error) {
      if(worker !== this.application.worker_debugger || ['closed', 'unavailable'].includes(worker.state)) return false;
      throw error;
    }
  }

  /**
   * Runs the current command input in the worker.
   */
  async _runCommand(force) {
    var code = this.application.code_input ? this.application.code_input.getValue() : '';
    if(!force && code.trim() && !await this.application.bridge.isConsoleExpressionComplete(code)) {
      this.application.code_input.replaceSelection('\n', 'end', '+input');
      this.application.code_input.execCommand('indentAuto');
      return;
    }
    return this._evaluateCommand(code);
  }

  /**
   * Detects the current browser runtime mode and capabilities.
   * @returns {Object}
   */
  _detectRuntimeInfo() {
    return PRDC_JSLAB_WEB_BROWSER.runtimeInfo();
  }

  /**
   * Refreshes runtime info with current storage/backend state.
   */
  _refreshRuntimeInfo() {
    this.application.runtime_info = Object.assign({}, this.application.runtime_info, {
      workspace_storage_mode: this.application.fs && this.application.fs.mode ? this.application.fs.mode : 'memory',
      workspace_storage_label: this.application.fs && typeof this.application.fs.getModeLabel == 'function'
        ? this.application.fs.getModeLabel()
        : 'Ephemeral memory storage'
    });
  }

  /**
   * Returns a copy of the current runtime descriptor.
   * @returns {Object}
   */
  getRuntimeInfo() {
    return Object.assign({}, this.application.runtime_info);
  }

  /**
   * Returns one runtime capability flag.
   * @param {string} name
   * @returns {*}
   */
  getRuntimeCapability(name) {
    if(typeof name == 'string' && Object.prototype.hasOwnProperty.call(this.application.runtime_info, name)) {
      return this.application.runtime_info[name];
    }
  }

  /**
   * Starts the existing scientific runtime and publishes state to its tool window.
   */
  async _startWorkerDebugger() {
    if(this.application.worker_debugger && !['closed', 'unavailable'].includes(this.application.worker_debugger.state)) {
      await this.application.worker_debugger_start;
      return this.application.worker_debugger;
    }
    this.application.debug_inspection_epoch = (this.application.debug_inspection_epoch || 0) + 1;
    this.application.worker_debugger = new PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT({
      state: state => {
        this.application.worker_debug_state = state;
        if(state.state == 'stopping') {
          this.application.ui_sandbox_api?.stopAnimations();
        }
        if(state.state === 'paused') {
          this.application._setStatus('busy', '', 582);
        } else if(state.state === 'idle') {
          this.application._setStatus('ready', '', 87);
        }
        this._updateWorkerEditor();
      },
      targets: () => this._updateWorkerEditor(),
      resetRuntime: action => this.requestReset(action),
      remoteRoots: () => ({ window: globalThis, document, bridge: this.application.bridge }),
      ui: operation => {
        if(operation.kind === 'print-window-pdf') {
          return this.application.bridge.printWindowToPdf(operation.wid, operation.options);
        }
        if(operation.kind === 'read-workspace-selection') {
          return this._workerDebugFiles(operation.paths);
        }
        if(operation.kind === 'write-bytes') {
          this.application.fs.writeBytesSync(operation.path, operation.bytes);
          return true;
        }
        if(operation.kind === 'write-text') {
          this.application.fs.writeTextFileSync(operation.path, operation.text);
          return true;
        }
        if(operation.kind === 'clipboard-write') {
          return this.application.files._copyText(operation.text);
        }
        return this.application.sandbox_api.workerUI(operation);
      },
      settings: settings => {
        try {
          this.application.storage.set('jslab.web.debugger-settings', settings);
        } catch(error) {}
        this._updateWorkerEditor();
      },
      log: message => this.application.handleSandboxRuntimeLog(message.message, message.level),
      workspace: workspace => {
        if(this._activeWorkerDebugger()?.state === 'paused') {
          this.application.main.debugger.global_workspace = workspace;
        } else {
          this.application._renderWorkspaceVariables(workspace);
        }
      },
      variables: variables => {
        if(this.application.worker_debug_state) {
          this.application.worker_debug_state.variables = variables;
        }
        if(this._activeWorkerDebugger()?.state === 'paused') {
          this._updateWorkerEditor();
        }
      }
    });
    const client = this.application.worker_debugger;
    try {
      const settings = this.application.storage.get('jslab.web.debugger-settings', {});
      for(const point of settings.breakpoints || []) {
        client.breakpoints.set(point.path + ':' + point.line, point);
      }
      client.pause_on_exceptions = settings.pause_on_exceptions || 'none';
    } catch(error) {}
    try {
      this.application.worker_debugger_start = client.start({ lang: this.application.language.lang });
      await this.application.worker_debugger_start;
    } catch(error) {
      client.dispose();
      if(this.application.worker_debugger === client) {
        this.application.worker_debugger = null;
      }
      this.application.worker_debug_state = { state: 'unavailable', frames: [], error: this.application.language.currentString(580) };
      this._updateWorkerEditor();
      throw error;
    }
    return client;
  }

  /**
   * Returns the selected child or main scientific execution target.
   */
  _activeWorkerDebugger() {
    return this.application.worker_debugger?.selectedClient();
  }

  /**
   * Returns the selected debugger's current stack and persisted breakpoints.
   */
  _workerDebugState() {
    const client = this._activeWorkerDebugger();
    return { ...this.application.worker_debug_state, ...client?.last_state, state: client?.state || this.application.worker_debug_state?.state || 'unavailable',
      frames: client?.frames || [], variables: client?.variables,
      ...client?.settings(), frame_index: client?.frame_index || 0,
      selected_target: this.application.worker_debugger?.selected_target,
      workers: Array.from(this.application.worker_debugger?.targets || [], ([id, target]) => ({ session_id: id, name: target.name || id, paused: target.state === 'paused' })) };
  }

  /**
   * Dispatches the same debugger operations used by desktop consoles/editors.
   */
  async _debugCommand(method, args = {}) {
    if(!this.application.worker_debugger) {
      await this._startWorkerDebugger();
    }
    if(method === 'update_debug_script' && args.code == null) {
      args = { ...args, code: this.application.fs.readTextFileSync(args.path) };
    }
    return this._debugger_commands.dispatch(method, args);
  }

  /**
   * Opens the paused source and decorates its original line.
   */
  async _showWorkerDebugSource(frame) {
    if(isInternalDebugFrame(frame) || !this.application.fs.existsFileSync(frame.path)) {
      return;
    }
    await this.application.windows._openEditorWindow(frame.path, frame.line);
    this._updateWorkerEditor(frame);
  }

  /**
   * Updates existing browser editor gutters without moving the active tab.
   */
  _updateWorkerEditor(frame) {
    const state = this._workerDebugState();
    this.application.main.evaluating = state.state == 'running';
    this.application.main.debugger.frame_index = state.frame_index || 0;
    this.application.main.debugger.update(state);
    this._publishWorkerEditor(frame);
  }

  /**
   * Publishes worker state to the managed Editor surface.
   * @param {Object} [frame] Selected source frame.
   */
  _publishWorkerEditor(frame) {
    const window = this.application.window_manager.windows.get(this.application.editor_window_id);
    window?.iframe?.contentWindow?.__JSLAB_WEB_EDITOR__?.updateDebugState?.(this._workerDebugState(), frame);
  }

  /**
   * Collects workspace files for the numerical worker.
   * @param {Array<string>} [paths] Files and directories to collect.
   * @returns {Object} File contents keyed by workspace path.
   */
  _workerDebugFiles(paths = ['/workspace/']) {
    const files = {};
    const fs = this.application.fs;
    const visit = path => {
      if(fs.existsDirectorySync(path)) {
        for(const name of fs.readDirSync(path)) visit(fs.join(path, name));
      } else if(fs.existsFileSync(path)) {
        files[path] = /\.(jsl|js|json|txt|csv)$/i.test(path) ? fs.readTextFileSync(path) : fs.readBytesSync(path);
      }
    };
    paths.forEach(visit);
    return files;
  }

  /**
   * Evaluates JSLAB code while optionally preserving current input.
   * @param {string} code
   * @param {Object} [options]
   * @returns {Promise<void>}
   */
  async _evaluateCommand(code, options = {}) {
    return options.preserve_input ? this.application.main.command_window.evalCommandPreserveInput(code) : this.application.main.eval.evalCommand(String(code || ''));
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
   * Executes code in the browser worker and delivers lifecycle notifications.
   * @param {string} code User code.
   * @param {Object} [options] Source coordinates.
   * @returns {Promise<Object>} Worker result.
   */
  async _executeCode(code, options = {}) {
    this.application.main.evaluating = true;
    this.application._setStatus('busy', '', 88);
    try {
      await this._startWorkerDebugger();
      const result = await this.application.worker_debugger.evaluate(String(code), this._workerEvaluationOptions(options));
      this.application._renderWorkspaceVariables(result.workspace || []);
      if(!result.success && !result.interrupted) {
        this.application.main.command_window.error(result.error);
      }
      return result;
    } finally {
      this.application.main.evaluating = false;
      if(this._activeWorkerDebugger()?.state === 'idle') {
        this.application._setStatus('ready', '', 87);
      }
    }
  }

  /**
   * Supplies the current workspace state for worker execution.
   * @param {Object} [options] Evaluation options supplied by the caller.
   * @returns {Object} Worker evaluation options.
   */
  _workerEvaluationOptions(options = {}) {
    return { ...options, files: this._workerDebugFiles(), cwd: this.application.current_path,
      saved_paths: this.application.main.folder_navigation.saved_paths };
  }

  /**
   * Registers persistent caching for versioned browser libraries.
   */
  async _registerLibraryCache() {
    if(!globalThis.navigator || !globalThis.navigator.serviceWorker ||
        !globalThis.location || !/^https?:$/.test(globalThis.location.protocol)) {
      return false;
    }
    try {
      await globalThis.navigator.serviceWorker.register('./service-worker.js', { scope: './' });
      await globalThis.navigator.serviceWorker.ready;
      return true;
    } catch(error) {
      console.warn('Unable to enable the JSLAB web library cache.', error);
      return false;
    }
  }


  /**
 * Publishes a validated frame selection after the worker accepts it.
 */
  async _selectDebugFrame(args) {
    const client = this.application.worker_debugger.selectedClient();
    const result = await client.selectFrame(args.frame_index);
    if(result.success === false) {
      throw Error(result.error);
    }
    this._showWorkerDebugSource(client.frames[args.frame_index]);
    this._updateWorkerEditor();
    return this._workerDebugState();
  }


}

exports.PRDC_JSLAB_WEB_SANDBOX_HOST = PRDC_JSLAB_WEB_SANDBOX_HOST;
