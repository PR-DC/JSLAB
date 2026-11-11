/**
 * @file Browser-side control for the isolated numerical worker debugger
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_REMOTE_UI_HOST } = require('./remote-ui');

/** Communicates with a paused worker without depending on its event loop. */
class PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT {
  /** @param {Object} [callbacks={}] State, workspace and log notifications. */
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.pending = new Map();
    this.sequence = 0;
    this.state = 'idle';
    this.breakpoints = new Map();
    this.pause_on_exceptions = 'none';
    this.frame_index = 0;
    this.targets = new Map();
    this.selected_target = null;
  }

  /** Starts the scientific workspace; shared memory requires isolated hosting. */
  async start(options = {}) {
    if(!globalThis.crossOriginIsolated || typeof SharedArrayBuffer !== 'function') {
      throw new Error('The worker debugger requires HTTPS (or localhost) with Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp.');
    }
    this._state('starting');
    this.buffer = new SharedArrayBuffer(1024 * 1024 + 32);
    this.control = new Int32Array(this.buffer, 0, 8);
    this.payload = new Uint8Array(this.buffer, 32);
    this.worker = new Worker(new URL('js/debug-worker.js', document.baseURI), { name: options.name || 'JSLAB workspace' });
    const ready = new Promise((resolve, reject) => { this.ready_resolve = resolve; this.ready_reject = reject; });
    this.worker.addEventListener('message', event => this._message(event.data));
    this.worker.addEventListener('error', event => {
      if(this.state === 'closed') return;
      const error = new Error(event.message || 'Worker debugger failed.');
      this.ready_reject(error);
      for(const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
      this._state('unavailable');
    });
    if(this.callbacks.remoteRoots) this.remote = new PRDC_JSLAB_REMOTE_UI_HOST(this.callbacks.remoteRoots(), message => this.worker.postMessage(message));
    this.worker.postMessage({ type: 'initialize', buffer: this.buffer, ...options, remote_ui: !!this.remote });
    await ready;
    return this;
  }

  /** @param {string} code Source. @param {Object} [options={}] Path and files. */
  evaluate(code, options = {}) {
    if(!this.worker) return Promise.reject(new Error('Worker debugger has not started.'));
    if(this.state !== 'idle') return Promise.reject(new Error('Worker debugger is ' + this.state + '.'));
    this.selected_target = null;
    Atomics.store(this.control, 0, 0);
    this._state('running');
    const id = ++this.sequence;
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.worker.postMessage({ type: 'evaluate', id, code, path: options.path,
      files: options.files, cwd: options.cwd, breakpoints: Array.from(this.breakpoints.values()), pause_on_exceptions: this.pause_on_exceptions });
    return result;
  }

  /** Returns the selected execution target without moving its live variables. */
  selectedClient() { return this.selected_target ? this.targets.get(this.selected_target) || this : this; }

  /** Selects a root or child worker for pause/step/scope operations. */
  selectTarget(id = null) {
    if(id && !this.targets.has(id)) throw Error('Unknown child worker.');
    this.selected_target = id;
    this._publishTargets();
    return this.selectedClient();
  }

  /** Publishes child state separately from the parent evaluation's completion. */
  _publishTargets() {
    const targets = Array.from(this.targets, ([id, target]) => ({ id, name: target.name || id, state: target.state }));
    this.callbacks.targets?.(targets, this.selected_target);
    const selected = this.selectedClient();
    this.callbacks.state?.({ ...(selected.last_state || { state: selected.state }), target_id: this.selected_target, targets });
  }

  /** Starts a fully initialized, independently interruptible scientific child runtime. */
  async _spawnTarget(message) {
    if(this.targets.has(message.id)) throw Error('Duplicate child worker identity.');
    const target = new PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT({
      remoteRoots: this.callbacks.remoteRoots,
      log: this.callbacks.log,
      state: state => {
        if(state.state === 'paused') this.selected_target = message.id;
        this._publishTargets();
      },
      variables: variables => { if(this.selected_target === message.id) this.callbacks.variables?.(variables); },
      userMessage: data => this.worker.postMessage({ type: 'target-event', id: message.id, event: 'message', data }),
      userError: details => this.worker.postMessage({ type: 'target-event', id: message.id, event: 'error', data: details })
    });
    target.name = message.name;
    target.breakpoints = new Map(this.breakpoints); target.pause_on_exceptions = this.pause_on_exceptions;
    this.targets.set(message.id, target); this._publishTargets();
    try {
      await target.start({ child_source: message.source, path: message.path, files: message.files, cwd: message.cwd,
        name: message.name, breakpoints: Array.from(this.breakpoints.values()), pause_on_exceptions: this.pause_on_exceptions });
      if(this.state !== 'closed') this.worker.postMessage({ type: 'target-event', id: message.id, event: 'ready' });
    } catch(error) {
      if(this.state !== 'closed') this.worker.postMessage({ type: 'target-event', id: message.id, event: 'error', data: { message: error.message } });
      target.dispose(); this.targets.delete(message.id); this._publishTargets();
    }
  }

  /** Continues all suspended targets; stepping applies only to the selected target. */
  resumeTargets(action = 'continue') {
    if(action !== 'continue') return this.selectedClient().resume(action);
    for(const target of [this, ...this.targets.values()]) {
      if(target.state === 'paused') target.resume();
      else if(target.control && Atomics.load(target.control, 0) === 1) Atomics.store(target.control, 0, 0);
    }
  }

  /** Runs a runtime service without evaluating another user program. */
  operation(method, args = {}) {
    if(this.state === 'closed' || this.state === 'unavailable') return Promise.reject(Error('Scientific workspace is unavailable.'));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ type: 'operation', id, method, args });
    });
  }

  /** Requests a pause at the next automatically inserted source checkpoint. */
  pause() { this._write(1); for(const target of this.targets.values()) target.pause(); }

  /** @param {string} [action='continue'] Continue or step action. */
  resume(action = 'continue') {
    if(this.state !== 'paused') throw Error('Worker debugger is not paused.');
    if(!['continue', 'stepInto', 'stepOver', 'stepOut'].includes(action)) throw Error('Unknown step action.');
    if(this.settings_queue) return this.settings_queue.then(() => this.resume(action));
    if(this.debug_request) return this.debug_request.then(() => this._write(3, { action }));
    this._write(3, { action });
  }

  /** Cancels instrumented JavaScript while preserving this worker's workspace. */
  interrupt() {
    if(this.state === 'closed' || this.state === 'unavailable') return;
    for(const target of this.targets.values()) target.interrupt();
    this._write(4);
    this.worker?.postMessage({ type: 'interrupt-background' });
    this._state('stopping');
  }

  /** @param {string} expression Deliberate debug expression in the current frame. */
  evaluatePaused(expression, frame_index = this.frame_index) {
    return this._request({ expression, frame_index });
  }

  /** Applies validated function-only browser edits while keeping current frame scopes alive. */
  updateScript(path, code, options = {}) {
    return this._request({ kind: 'edit', path, code, dry_run: options.dry_run === true });
  }

  /** Selects any retained synchronous/async caller scope in the current pause. */
  async selectFrame(frame_index) {
    const result = await this._request({ kind: 'frame', frame_index });
    if(result.success) this.frame_index = frame_index;
    return result;
  }

  /** Expands an object using bounded own descriptors without invoking getters. */
  inspectObject(object_id) { return this._request({ kind: 'properties', object_id }); }

  /** Configures a conditional, enabled or disabled original-source breakpoint. */
  setBreakpoint(path, line, condition = '', enabled = true) {
    if(typeof path !== 'string' || !path.length || !Number.isInteger(line) || line < 1) throw Error('Expected a script path and positive line number.');
    if(typeof condition !== 'string' || condition.length > 16000 || typeof enabled !== 'boolean') throw Error('Invalid breakpoint condition or enabled state.');
    if(condition.trim()) require('@babel/parser').parseExpression(condition);
    if(!path.startsWith('/')) path = '/workspace/' + path.replace(/^\.\//, '');
    const id = path + ':' + line;
    this.breakpoints.set(id, { id, path, line, condition, enabled });
    this._settingsChanged();
    return { id };
  }

  /** Removes a logical source breakpoint. */
  removeBreakpoint(path, line) {
    let id = line === undefined ? path : path + ':' + line;
    if(!id.startsWith('/')) id = '/workspace/' + id.replace(/^\.\//, '');
    this.breakpoints.delete(id);
    return this._settingsChanged();
  }

  /** Sets none, uncaught-by-user, or all exception stops. */
  setExceptionPause(state) {
    if(!['none', 'uncaught', 'all'].includes(state)) throw Error('Invalid exception pause mode.');
    this.pause_on_exceptions = state;
    return this._settingsChanged();
  }

  /** Removes all line and exception breakpoints. */
  clearBreakpoints() {
    this.breakpoints.clear(); this.pause_on_exceptions = 'none';
    return this._settingsChanged();
  }

  /** @returns {Object} Serializable settings suitable for persistence. */
  settings() { return { breakpoints: Array.from(this.breakpoints.values()), pause_on_exceptions: this.pause_on_exceptions }; }

  /** @private */
  _settingsChanged() {
    const settings = this.settings();
    const children = Array.from(this.targets.values(), target => {
      target.breakpoints = new Map(this.breakpoints);
      target.pause_on_exceptions = this.pause_on_exceptions;
      return target._settingsChanged();
    });
    this.callbacks.settings?.(settings);
    if(this.state === 'paused' || this.state === 'running') {
      const previous = this.settings_queue || this.debug_request || Promise.resolve();
      const update = previous.then(() => {
        if(this.state === 'paused') return this._request({ kind: 'settings', settings });
        if(this.state === 'running') return this._request({ kind: 'settings', settings }, 6);
        return { success: true };
      });
      const queued = update.finally(() => { if(this.settings_queue === queued) this.settings_queue = null; });
      this.settings_queue = queued;
      queued.catch(() => {});
      return Promise.all([queued, ...children]).then(results => results[0]);
    }
    return Promise.all(children).then(() => ({ success: true }));
  }

  /** @private */
  _request(command, action = 5) {
    if(action === 5 && this.state !== 'paused') return Promise.reject(new Error('Worker debugger is not paused.'));
    if(this.debug_pending) return Promise.reject(new Error('A debugger command is already running.'));
    const id = ++this.sequence;
    this.debug_pending = true;
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      try { this._write(action, { ...command, id }); }
      catch(error) { this.pending.delete(id); reject(error); }
    });
    this.debug_request = result.finally(() => { this.debug_pending = false; this.debug_request = null; });
    return this.debug_request;
  }

  /** Hard stop for native blocking calls; this deliberately discards the worker workspace. */
  dispose() {
    this.ready_reject?.(new Error('Worker reset before initialization completed.'));
    for(const target of this.targets.values()) target.dispose();
    this.targets.clear();
    this.remote?.dispose();
    this.worker?.terminate();
    for(const pending of this.pending.values()) pending.reject(new Error('Worker reset; its live workspace was discarded.'));
    this.pending.clear();
    this._state('closed');
  }

  /** @private */
  _write(action, value) {
    if(value) {
      const encoded = new TextEncoder().encode(JSON.stringify(value));
      if(encoded.length > this.payload.length) throw Error('Debugger command is too large.');
      this.payload.set(encoded);
      Atomics.store(this.control, 1, encoded.length);
    }
    Atomics.store(this.control, 0, action);
    Atomics.notify(this.control, 0);
  }

  /** @private */
  _message(message) {
    if(this.state === 'closed') return;
    if(message?.type === 'target-create') { this._spawnTarget(message).catch(error => this.callbacks.log?.({ level: 'error', message: error.message })); return; }
    if(message?.type === 'target-post') {
      this.targets.get(message.id)?.worker.postMessage({ type: 'target-user-post', data: message.data }, message.transfer || []); return;
    }
    if(message?.type === 'target-terminate') {
      this.targets.get(message.id)?.dispose(); this.targets.delete(message.id);
      if(this.selected_target === message.id) this.selected_target = null;
      this._publishTargets(); return;
    }
    if(message?.type === 'target-user-message') { this.callbacks.userMessage?.(message.data); return; }
    if(message?.type === 'target-user-error') { this.callbacks.userError?.(message.details); return; }
    if(message?.type === 'remote-request') { this.remote?.handle(message); return; }
    if(message.type === 'ready') { this._state('idle'); this.ready_resolve(); }
    else if(message.type === 'boot-error') this.ready_reject(new Error(message.error));
    else if(message.type === 'debug-paused') { this.frame_index = 0; this.frames = message.frames; this._state('paused', message); }
    else if(message.type === 'debug-state') this._state(message.state, message);
    else if(message.type === 'runtime-log') this.callbacks.log?.(message);
    else if(message.type === 'debug-settings') {
      this.breakpoints = new Map(message.settings.breakpoints.map(point => [point.path + ':' + point.line, point]));
      this.pause_on_exceptions = message.settings.pause_on_exceptions;
      this.callbacks.settings?.(this.settings());
    }
    else if(message.type === 'ui-request') {
      this.ui_queue = (this.ui_queue || Promise.resolve()).then(async () => {
        try {
          if(!this.callbacks.ui) throw Error('Browser UI bridge is not connected.');
          const value = await this.callbacks.ui(message.operation);
          if(this.state !== 'closed') this.worker.postMessage({ type: 'ui-response', id: message.id, value });
        } catch(error) {
          if(this.state !== 'closed') this.worker.postMessage({ type: 'ui-response', id: message.id, error: error.message });
        }
      });
    }
    else if(message.type === 'workspace') { this.workspace = message.workspace; this.callbacks.workspace?.(message.workspace); }
    else if(message.type === 'operation-result') {
      const pending = this.pending.get(message.id); this.pending.delete(message.id);
      if(message.error) pending?.reject(Object.assign(Error(message.error), { error_details: message.error_details }));
      else pending?.resolve(message.result);
    }
    else if(message.type === 'evaluated' || message.type === 'debug-result') {
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if(message.type === 'evaluated') { this.workspace = message.result.workspace || []; this.last_result = message.result; this._state('idle'); }
      else this.callbacks.variables?.(message.variables);
      pending?.resolve(message.result);
    }
  }

  /** @private */
  _state(state, details = {}) {
    this.state = state;
    this.last_state = Object.assign({ state }, details);
    if(this.selected_target) this._publishTargets();
    else this.callbacks.state?.(Object.assign({ state, targets: Array.from(this.targets, ([id, target]) => ({ id, name: target.name || id, state: target.state })) }, details));
  }
}
exports.PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT = PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT;
