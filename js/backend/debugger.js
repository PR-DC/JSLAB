/**
 * @file JSLAB execution debugger and interruption controller
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { SourceMapConsumer } = require('source-map');
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { isInternalDebugFrame } = require('../shared/debugger-frames');

/** Normalizes Chromium file URLs to the paths used by V8 error stacks. */
function normalizeScriptURL(url = '') {
  try { if(url.startsWith('file:')) url = fileURLToPath(url); } catch(error) {}
  return path.isAbsolute(url) ? path.normalize(url) : url;
}

/**
 * Controls the sandbox through Chromium, independently of its JavaScript loop.
 * The renderer owns resource cleanup; this controller owns execution completion.
 */
class PRDC_JSLAB_DEBUGGER {
  /**
   * @param {Object} contents Sandbox webContents.
   * @param {Object} [callbacks={}] State, interruption and error callbacks.
   */
  constructor(contents, callbacks = {}) {
    this.contents = contents;
    this.transport = contents.debugger;
    this.callbacks = callbacks;
    this.state = 'idle';
    this.execution_id = null;
    this.frames = [];
    this.object_handles = new Set();
    this.sources = new Map();
    this.breakpoints = new Map();
    this.workers = new Map();
    this.async_stack = [];
    this.pause_on_exceptions = 'none';
    this.selected_target = null;
    this.object_targets = new Map();
    this.module_catches = new Map();
    this.script_offsets = new Map();
    this.module_prefixes = new Set();
    this.es_modules = new Set();
    this.revision = 0;
    this.closed = false;
    this.stopping = null;
    this.transport.on('message', (_event, method, params, session_id) => {
      this._message(method, params, session_id).catch(error => this._error(error));
    });
    this.transport.on('detach', (_event, reason) => {
      this.frames = [];
      this.workers.clear();
      if(!this.closed) {
        this.state = 'unavailable';
        this._publish({ error: 'Debugger detached: ' + reason });
      }
    });
    contents.on('destroyed', () => this.dispose());
    this.ready = this.attach();
    // Readiness is also awaited by the sandbox-ready handler.
    this.ready.catch(error => this._error(error));
  }

  /** Attaches before user code can start. */
  async attach() {
    if(this.closed) throw new Error('Sandbox is closed.');
    if(!this.transport.isAttached()) this.transport.attach('1.3');
    await this._command('Runtime.enable');
    await this._command('Debugger.enable');
    await this._command('Debugger.setAsyncCallStackDepth', { maxDepth: 128 });
    await this._command('Debugger.setBlackboxPatterns', { patterns: [
      '^node:', '[\\\\/]js[\\\\/](sandbox[\\\\/](?!basic\\.js)|shared[\\\\/])', '[\\\\/]node_modules[\\\\/]', '[\\\\/]lib[\\\\/]'
    ] });
    await this._command('Target.setAutoAttach', {
      autoAttach: true, waitForDebuggerOnStart: true, flatten: true
    });
    await this._command('Debugger.setPauseOnExceptions', { state: this.pause_on_exceptions === 'none' ? 'none' : 'all' });
    for(const point of this.breakpoints.values()) {
      point.bindings = [];
      for(const [url, source] of this.sources) if(source.path === point.path) await this._bindBreakpoint(point, url);
    }
    this.state = this.execution_id ? 'running' : 'idle';
    this._publish();
  }

  /** @returns {Object} Serializable debugger status. */
  status() {
    return { state: this.state, execution_id: this.execution_id,
      revision: this.revision, frames: this.frames, async_stack: this.async_stack,
      selected_target: this.selected_target, pause_on_exceptions: this.pause_on_exceptions,
      breakpoints: Array.from(this.breakpoints.values()).map(({ bindings, ...value }) => value),
      last_interruption: this.last_interruption,
      workers: Array.from(this.workers.values()).map(worker => ({
        session_id: worker.session_id, url: worker.url, paused: worker.paused
      })) };
  }

  /** @param {string} id Execution identity supplied by the sandbox. */
  begin(id) {
    if(!['idle', 'starting'].includes(this.state)) {
      throw new Error('Sandbox execution is ' + this.state + '.');
    }
    this.execution_id = id;
    this.state = 'running';
    this._publish();
  }

  /** Reserves the sandbox before delivering an evaluation over ordinary IPC. */
  reserve() {
    if(this.state !== 'idle') throw new Error('Sandbox execution is ' + this.state + '.');
    this.state = 'starting';
    this._publish();
  }

  /** @param {string} id Completed execution identity. */
  finish(id) {
    if(id !== this.execution_id || this.state === 'stopping') return;
    this.execution_id = null;
    this.step_action = null;
    this.state = 'idle';
    this.frames = [];
    this._publish();
  }

  /** Requests a pause without requiring an application checkpoint. */
  async pause() {
    await this.ready;
    if(this.state === 'stopping') throw new Error('Execution is stopping.');
    if(this.state !== 'paused') await this._command('Debugger.pause');
    return this.status();
  }

  /** @param {string} [action='continue'] Continue, stepInto, stepOver or stepOut. */
  async resume(action = 'continue') {
    const methods = { continue: 'Debugger.resume', stepInto: 'Debugger.stepInto',
      stepOver: 'Debugger.stepOver', stepOut: 'Debugger.stepOut' };
    if(!methods[action]) throw new Error('Unknown debugger action.');
    this._requirePaused();
    if(!this.selected_target || action === 'continue') this.step_action = action === 'continue' ? null : action;
    if(action !== 'continue' && this.selected_target) {
      await this._command(methods[action], {}, this.selected_target);
    } else {
      for(const worker of this.workers.values()) {
        if(worker.paused) await this._command('Debugger.resume', {}, worker.session_id);
      }
      await this._command(methods[action]);
    }
    return this.status();
  }

  /**
   * Reads a scope/object without executing accessors or custom formatters.
   * @param {string} object_id Object handle from the current pause.
   * @returns {Promise<Object>} Bounded descriptors and preview values.
   */
  async properties(object_id) {
    this._requirePaused();
    if(typeof object_id !== 'string' || !object_id.length) throw new Error('Expected an object handle.');
    if(!this.object_handles.has(object_id)) throw new Error('Paused object handle has expired.');
    const revision = this.revision;
    const result = await this._command('Runtime.getProperties', {
      objectId: object_id, ownProperties: true, generatePreview: true
    }, this.object_targets.get(object_id));
    this._checkRevision(revision);
    return { properties: (result.result || []).slice(0, 1000).map(property => ({
      name: property.name, enumerable: property.enumerable,
      writable: property.writable, value: this._preview(property.value, this.object_targets.get(object_id)),
      accessor: !!(property.get || property.set)
    })), truncated: (result.result || []).length > 1000 };
  }

  /**
   * Evaluates a bounded expression in the selected paused function scope.
   * @param {string} expression Expression, optionally allowing explicit mutations.
   * @param {number} [frame_index=0] Selected call frame.
   * @param {boolean} [allow_side_effects=false] Permit deliberate debug commands.
   */
  async evaluate(expression, frame_index, allow_side_effects = false) {
    this._requirePaused();
    if(typeof expression !== 'string' || expression.length > 16000) throw new Error('Invalid debug expression.');
    if(frame_index === undefined) {
      const paths = new Set(Array.from(this.sources.values()).map(source => source.path));
      frame_index = Math.max(0, this.frames.findIndex(frame => paths.has(frame.path) ||
        path.isAbsolute(frame.path || '') && !/[\\/](?:node_modules|js[\\/]sandbox)[\\/]/.test(frame.path)));
    }
    const frame = this.frames[frame_index];
    if(!frame) throw new Error('Unknown call frame.');
    const revision = this.revision;
    const result = await this._command('Debugger.evaluateOnCallFrame', {
      callFrameId: frame.id, expression: expression, objectGroup: 'jslab-debug',
      generatePreview: true, throwOnSideEffect: !allow_side_effects, timeout: 1000
    }, this.selected_target || undefined);
    this._checkRevision(revision);
    return { value: this._preview(result.result, this.selected_target || undefined),
      error: result.exceptionDetails ? result.exceptionDetails.text + ': ' +
        (result.exceptionDetails.exception?.description || '') : null };
  }

  /**
   * Registers original source mappings before the renderer evaluates the script.
   * @param {Object} source Generated URL, original path and source map.
   */
  async registerSource(source) {
    await this.ready;
    if(this.sources.has(source.url)) return;
    const consumer = await new SourceMapConsumer(source.map);
    this.sources.set(source.url, { path: source.path, consumer: consumer, catches: source.catches || [] });
    for(const breakpoint of this.breakpoints.values()) {
      if(breakpoint.path === source.path) await this._bindBreakpoint(breakpoint, source.url);
    }
  }

  /** @param {string} path Original .jsl path. @param {number} line One-based line. */
  async setBreakpoint(path, line, condition = '', enabled = true) {
    await this.ready;
    if(typeof path !== 'string' || !path.length || !Number.isInteger(line) || line < 1) {
      throw new Error('Expected a script path and positive line number.');
    }
    if(typeof condition !== 'string' || condition.length > 16000 || typeof enabled !== 'boolean') throw Error('Invalid breakpoint condition or enabled state.');
    if(condition.trim()) require('@babel/parser').parseExpression(condition);
    path = await this.resolveSourcePath(path);
    const key = path + ':' + line;
    if(this.breakpoints.has(key)) await this.removeBreakpoint(key);
    const breakpoint = { id: key, path: path, line: line, condition, enabled, bindings: [] };
    this.breakpoints.set(key, breakpoint);
    for(const [url, source] of this.sources) {
      if(source.path === path && enabled) await this._bindBreakpoint(breakpoint, url);
    }
    this._settingsChanged();
    return { id: key };
  }

  /** @param {string} id Logical breakpoint ID. */
  async removeBreakpoint(id) {
    if(!this.breakpoints.has(id) && typeof id === 'string') {
      const separator = id.lastIndexOf(':');
      if(separator > 0) id = await this.resolveSourcePath(id.slice(0, separator)) + id.slice(separator);
    }
    const breakpoint = this.breakpoints.get(id);
    if(!breakpoint) throw new Error('Unknown breakpoint.');
    for(const binding of breakpoint.bindings) {
      await this._command('Debugger.removeBreakpoint', { breakpointId: binding });
    }
    this.breakpoints.delete(id);
    this._settingsChanged();
    return { removed: true };
  }

  /** Resolves console script names using the persistent workspace's search paths. */
  async resolveSourcePath(request) {
    if(path.isAbsolute(request)) return path.normalize(request);
    try {
      const response = await this._command('Runtime.evaluate', {
        expression: 'globalThis.__jsl_internal__.pathResolve(' + JSON.stringify(request) + ')',
        returnByValue: true, silent: true, timeout: 1000
      });
      const resolved = response.result?.value;
      if(typeof resolved === 'string' && path.isAbsolute(resolved)) return path.normalize(resolved);
    } catch(error) {}
    const matches = Array.from(this.sources.values()).map(source => source.path).filter(file =>
      path.basename(file) === request || path.basename(file) === request + '.jsl' || path.basename(file) === request + '.js');
    return matches.length ? matches.at(-1) : request;
  }

  /** Configures exception stops; uncaught means uncaught by user code. */
  async setExceptionPause(state) {
    if(!['none', 'uncaught', 'all'].includes(state)) throw Error('Invalid exception pause mode.');
    await this.ready;
    this.pause_on_exceptions = state;
    // The evaluator catches user errors to report them, so Chromium's uncaught
    // mode alone would miss them. User catch ranges are filtered on pause.
    await this._command('Debugger.setPauseOnExceptions', { state: state === 'none' ? 'none' : 'all' });
    for(const worker of this.workers.values()) await this._command('Debugger.setPauseOnExceptions', { state }, worker.session_id);
    this._settingsChanged();
    return this.status();
  }

  /** Clears configured breakpoints, optionally including exception stops. */
  async clearBreakpoints() {
    for(const id of Array.from(this.breakpoints.keys())) await this.removeBreakpoint(id);
    await this.setExceptionPause('none');
    return this.status();
  }

  /** Selects a paused worker or the main sandbox for frame inspection/stepping. */
  selectTarget(session_id = null) {
    const worker = session_id && this.workers.get(session_id);
    if(session_id && (!worker || !worker.paused)) throw Error('Worker is not paused.');
    this._requirePaused();
    this.selected_target = session_id;
    this.frames = session_id ? worker.frames || [] : this.main_frames || [];
    this.async_stack = session_id ? worker.async_stack || [] : this.main_async_stack || this.async_stack;
    this.revision++;
    this._publish();
    return this.status();
  }

  /** @private */
  _settingsChanged() {
    const settings = { breakpoints: this.status().breakpoints, pause_on_exceptions: this.pause_on_exceptions };
    this.callbacks.settings?.(settings);
    this._publish();
  }

  /**
   * Terminates current JavaScript, then starts cleanup in a fresh debugger call.
   * Calls are coalesced so repeated Ctrl+C cannot terminate cleanup or new work.
   * @returns {Promise<Object>} Completed cleanup acknowledgement.
   */
  interrupt() {
    if(this.stopping) return this.stopping;
    this.stopping = this._interrupt().finally(() => { this.stopping = null; });
    return this.stopping;
  }

  /** @private */
  async _interrupt() {
    await this.ready;
    const id = this.execution_id;
    const was_paused = !!this.main_paused;
    this.state = 'stopping';
    this._publish();
    try {
      let wake;
      if(!was_paused) {
        // Pause before invalidation so an awaiting script cannot start between
        // termination and cleanup. The wake script also covers an idle target.
        let timer;
        const paused = new Promise((resolve, reject) => {
          this.stop_pause = { resolve: resolve, reject: reject };
          timer = setTimeout(() => reject(new Error('Sandbox did not pause for interruption; a native operation may be blocking.')), 5000);
        });
        this._command('Debugger.pause').catch(error => this.stop_pause?.reject(error));
        wake = this._command('Runtime.evaluate', { expression: 'void 0' }).catch(() => {});
        try { await paused; }
        finally { clearTimeout(timer); this.stop_pause = null; }
      }
      const cancelled = await this._command('Runtime.evaluate', {
        expression: 'globalThis.__jsl_internal__.inter.execution.cancel(' + JSON.stringify(id) + ')',
        silent: true, returnByValue: true, timeout: 1000
      });
      if(cancelled.exceptionDetails) throw new Error('Could not invalidate interrupted execution.');
      await this._command('Debugger.resume', { terminateOnResume: true });
      if(wake) await wake;
      // A paused inspector session can keep a terminated worker target alive.
      // Release those sessions before the runtime terminates its owned Workers.
      await this._command('Target.setAutoAttach', {
        autoAttach: false, waitForDebuggerOnStart: false, flatten: true
      });
      for(const worker of Array.from(this.workers.values())) {
        await this._command('Target.detachFromTarget', { sessionId: worker.session_id }).catch(() => {});
      }
      this.workers.clear();
      const result = await this._command('Runtime.evaluate', {
        expression: 'globalThis.__jsl_internal__.inter.execution.interrupt(' + JSON.stringify(id) + ')',
        awaitPromise: true, returnByValue: true, timeout: 5000
      });
      if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'Interruption cleanup failed.');
      const value = result.result?.value;
      if(!value || value.success !== true) throw new Error('Sandbox did not acknowledge interruption cleanup.');
      this.last_interruption = value;
      await this._command('Target.setAutoAttach', {
        autoAttach: true, waitForDebuggerOnStart: true, flatten: true
      });
      this.execution_id = null;
      this.frames = [];
      this.state = 'idle';
      this.revision++;
      await this._command('Runtime.releaseObjectGroup', { objectGroup: 'jslab-debug' });
      if(this.callbacks.interrupted) this.callbacks.interrupted(id, value);
      this._publish();
      return value;
    } catch(error) {
      // Do not advertise readiness after failed native calls or cleanup.
      this.state = 'stopping';
      this._error(error);
      throw error;
    }
  }

  /** Releases mappings when the sandbox is replaced. */
  dispose() {
    if(this.closed) return;
    this.closed = true;
    for(const source of this.sources.values()) source.consumer.destroy();
    this.sources.clear();
    this.frames = [];
    this.object_handles.clear();
    this.workers.clear();
    this.state = 'closed';
    this._publish();
  }

  /** @private */
  async _bindBreakpoint(breakpoint, url) {
    if(breakpoint.enabled === false) return;
    const source = this.sources.get(url);
    const position = source.consumer.generatedPositionFor({ source: source.consumer.sources[0],
      line: breakpoint.line, column: 0, bias: SourceMapConsumer.LEAST_UPPER_BOUND });
    if(position.line === null) return;
    const result = await this._command('Debugger.setBreakpointByUrl', {
      url: url, lineNumber: position.line - 1, columnNumber: 0, condition: breakpoint.condition || ''
    });
    breakpoint.bindings.push(result.breakpointId);
  }

  /** @private */
  async _message(method, params, session_id) {
    if(this.closed) return;
    if(method === 'Target.attachedToTarget' && params.targetInfo.type === 'worker') {
      this.workers.set(params.sessionId, { session_id: params.sessionId,
        url: params.targetInfo.url, paused: false });
      await this._command('Debugger.enable', {}, params.sessionId);
      await this._command('Debugger.setAsyncCallStackDepth', { maxDepth: 128 }, params.sessionId);
      await this._command('Debugger.setPauseOnExceptions', { state: this.pause_on_exceptions }, params.sessionId);
      if(this.state === 'paused') await this._command('Debugger.pause', {}, params.sessionId);
      await this._command('Runtime.runIfWaitingForDebugger', {}, params.sessionId);
    } else if(method === 'Target.attachedToTarget') {
      await this._command('Runtime.runIfWaitingForDebugger', {}, params.sessionId);
    } else if(method === 'Target.detachedFromTarget') {
      this.workers.delete(params.sessionId);
    } else if(session_id && method === 'Debugger.scriptParsed') {
      if(!this.script_urls) this.script_urls = new Map();
      this.script_urls.set(session_id + ':' + params.scriptId, normalizeScriptURL(params.url));
      if(params.isModule) this.es_modules.add(session_id + ':' + params.scriptId);
    } else if(session_id) {
      const worker = this.workers.get(session_id);
      if(worker && (method === 'Debugger.paused' || method === 'Debugger.resumed')) {
        worker.paused = method === 'Debugger.paused';
        if(worker.paused) {
          if(this.state !== 'paused') {
            this.object_handles.clear(); this.object_targets.clear();
          }
          await this._prepareFrames(params.callFrames, session_id);
          worker.frames = this._mapFrames(params.callFrames, session_id);
          worker.async_stack = await this._asyncStack(params, session_id);
          if(params.reason !== 'other' || !this.main_paused) this.selected_target = session_id;
          if(this.state !== 'stopping') {
            this.state = 'paused';
            this.revision++;
            if(this.selected_target === session_id) this.frames = worker.frames;
            if(!this.main_paused) {
              await this._command('Debugger.pause');
              this._command('Runtime.evaluate', { expression: 'void 0' }).catch(() => {});
            }
          }
        } else {
          worker.frames = [];
          if(this.selected_target === session_id) {
            this.frames = []; this.revision++; this.state = 'running';
          }
        }
        this._publish();
      }
    } else if(method === 'Debugger.paused') {
      this.main_paused = true;
      if(this.state === 'stopping') {
        if(this.stop_pause) this.stop_pause.resolve(params);
        else await this._command('Debugger.resume', { terminateOnResume: true });
        return;
      }
      if(this.state !== 'paused') {
        this.object_handles.clear(); this.object_targets.clear();
      }
      await this._prepareFrames(params.callFrames);
      const frames = this._mapFrames(params.callFrames);
      if(!this.execution_id && !this.selected_target && !frames.some(frame => !isInternalDebugFrame(frame))) {
        this.step_action = null;
        await this._command('Debugger.resume');
        return;
      }
      if(this.step_action && isInternalDebugFrame(frames[0]) && !(params.hitBreakpoints || []).length &&
          !['exception', 'promiseRejection'].includes(params.reason)) {
        const user_frame = frames.some(frame => !isInternalDebugFrame(frame));
        if(!user_frame) this.step_action = null;
        await this._command(user_frame ? 'Debugger.stepOut' : 'Debugger.resume');
        return;
      }
      if(['exception', 'promiseRejection'].includes(params.reason)) {
        const internal = /[\\/]js[\\/]sandbox[\\/]/.test(frames[0]?.path || '');
        const user = frames.some(frame => Array.from(this.sources.values()).some(source => source.path === frame.path));
        const caught = frames.some(frame => frame.caught_by_user);
        if(!user || internal || this.pause_on_exceptions === 'none' ||
            this.pause_on_exceptions === 'uncaught' && caught) {
          await this._command('Debugger.resume');
          return;
        }
      }
      this.state = 'paused';
      this.step_action = null;
      this.revision++;
      this.main_frames = frames;
      this.main_async_stack = this.async_stack = await this._asyncStack(params);
      this.frames = this.selected_target && this.workers.get(this.selected_target)?.paused ?
        this.workers.get(this.selected_target).frames : frames;
      this._publish({ reason: params.reason, exception: params.data?.description });
      for(const worker of this.workers.values()) {
        if(!worker.paused) this._command('Debugger.pause', {}, worker.session_id).catch(error => this._error(error));
      }
    } else if(method === 'Debugger.resumed') {
      this.main_paused = false;
      this.frames = [];
      this.main_frames = [];
      this.selected_target = null;
      this.object_handles.clear();
      this.object_targets.clear();
      this.revision++;
      if(this.state !== 'stopping') this.state = this.execution_id ? 'running' : 'idle';
      this._publish();
    } else if(method === 'Debugger.scriptParsed') {
      if(!this.script_urls) this.script_urls = new Map();
      this.script_urls.set(params.scriptId, normalizeScriptURL(params.url));
      if(params.isModule) this.es_modules.add(':' + params.scriptId);
    }
  }

  /** Captures bounded historical async ancestry separately from inspectable live scopes. */
  async _asyncStack(params, target) {
    const history = [];
    let stack = params.asyncStackTrace;
    let id = params.asyncStackTraceId;
    const seen = new Set();
    while(history.length < 128 && (stack || id)) {
      if(!stack) {
        const key = JSON.stringify(id);
        if(seen.has(key)) break;
        seen.add(key);
        try { stack = (await this._command('Debugger.getStackTrace', { stackTraceId: id }, target)).stackTrace; }
        catch(error) { history.push({ description: 'Async ancestry expired', frames: [], expired: true }); break; }
      }
      if(!stack) break;
      const frames = (stack.callFrames || []).slice(0, 128).map(frame => {
        const url = frame.url || this.script_urls?.get(frame.scriptId) || '';
        const source = this.sources.get(url);
        const original = source?.consumer.originalPositionFor({ line: frame.lineNumber + 1, column: frame.columnNumber });
        return { name: frame.functionName || '(async)', path: source?.path || url,
          line: original?.line || frame.lineNumber + 1, column: (original?.column ?? frame.columnNumber) + 1, inspectable: false };
      });
      history.push({ description: stack.description || 'Async call', frames });
      id = stack.parentId; stack = stack.parent;
    }
    return history;
  }

  /** Applies a native V8 live edit; rejected edits leave the executable source unchanged. */
  async updateScript(request, code, options = {}) {
    this._requirePaused();
    request = await this.resolveSourcePath(request);
    if(code === undefined) code = fs.readFileSync(request, 'utf8');
    if(typeof code !== 'string' || Buffer.byteLength(code) > 512000) throw Error('Live edit source must be at most 512000 bytes.');
    const url = Array.from(this.sources.entries()).reverse().find(([url, source]) => source.path === request)?.[0];
    if(!url) throw Error('Live editing requires a registered JSLAB source file.');
    const entry = Array.from(this.script_urls || []).reverse().find(([id, source]) => !id.includes(':') && source === url);
    if(!entry) throw Error('The script has not been compiled yet.');
    const expression = '(() => { const j = globalThis.__jsl_internal__; const old = j.current_script; j.current_script = ' + JSON.stringify(request) +
      '; try { return { success: true, value: j.inter.eval.rewriteCode(' + JSON.stringify(code) + ') }; } catch(error) { return { success: false, error: error.message }; } finally { j.current_script = old; } })()';
    const transformed = await this._command('Runtime.evaluate', { expression, returnByValue: true, silent: true });
    const reply = transformed.result?.value;
    if(!reply?.success) throw Error(reply?.error || 'Source rewriting failed.');
    const rewritten = reply.value;
    const source = rewritten.code.replace('//# sourceURL=' + rewritten.debug_source.url, '//# sourceURL=' + url);
    const result = await this._command('Debugger.setScriptSource', { scriptId: entry[0], scriptSource: source,
      dryRun: options.dry_run === true, allowTopFrameEditing: options.allow_top_frame_editing === true });
    if(result.exceptionDetails || result.status && result.status !== 'Ok') return { applied: false, status: result.status || 'CompileError', details: result.exceptionDetails };
    if(options.dry_run) return { applied: false, status: 'Validated' };
    const consumer = await new SourceMapConsumer(rewritten.debug_source.map);
    this.sources.get(url).consumer.destroy();
    this.sources.set(url, { path: request, consumer, catches: rewritten.debug_source.catches || [] });
    await this._command('Runtime.evaluate', { expression: 'globalThis.__jsl_internal__.inter.eval.debug_sources.set(' +
      JSON.stringify(url) + ', ' + JSON.stringify({ path: request, map: rewritten.debug_source.map }) + ')', silent: true });
    if(result.callFrames?.length) {
      this.main_frames = this.frames = this._mapFrames(result.callFrames);
    }
    this.revision++; this._publish({ live_edit: { path: request, status: 'Applied' } });
    return { applied: true, status: 'Applied', path: request };
  }

  /** Explicitly restarts a selected frame; preceding side effects may execute again. */
  async restartFrame(index = 0) {
    this._requirePaused();
    if(!this.frames[index]) throw Error('Unknown call frame.');
    await this._command('Debugger.restartFrame', { callFrameId: this.frames[index].id, mode: 'StepInto' }, this.selected_target || undefined);
    return { requested: true };
  }

  /** Resolves Electron's first-line CommonJS wrapper prefix from compiled source. */
  async _prepareFrames(frames = [], target) {
    for(const frame of frames) {
      if(frame.location.lineNumber !== 0) continue;
      const key = (target || '') + ':' + frame.location.scriptId;
      if(this.script_offsets.has(key)) continue;
      if(this.es_modules.has(key)) { this.script_offsets.set(key, 0); continue; }
      const url = frame.url || this.script_urls?.get(key) || this.script_urls?.get(frame.location.scriptId) || '';
      if(this.sources.has(url) || !path.isAbsolute(url) || /[\\/](?:node_modules|js[\\/]sandbox)[\\/]/.test(url)) continue;
      try {
        const stat = fs.statSync(url);
        if(!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;
        const original = fs.readFileSync(url, 'utf8').replace(/^\uFEFF/, '');
        const result = await this._command('Debugger.getScriptSource', { scriptId: frame.location.scriptId }, target);
        let offset = result.scriptSource?.indexOf(original) ?? -1;
        if(offset > 0) this.module_prefixes.add(result.scriptSource.slice(0, offset));
        if(offset < 0) {
          // A cached module can outlive edits to its file. Its compiled wrapper
          // still describes the prefix even when the current file no longer matches.
          const prefix = result.scriptSource?.match(/^\(?function\s*[^\(]*\([^)]*\bexports\b[^)]*\brequire\b[^)]*\b__filename\b[^)]*\)\s*\{ ?/);
          if(prefix && !prefix[0].includes('\n')) {
            offset = prefix[0].length;
            // Electron can nest Node's CommonJS wrapper inside its own wrapper.
            const inner = result.scriptSource.slice(offset).match(/^\s*return\s+function\s*[^\(]*\([^)]*\bexports\b[^)]*\brequire\b[^)]*\b__filename\b[^)]*\)\s*\{ ?/);
            if(inner && !inner[0].includes('\n')) offset += inner[0].length;
          }
          for(const known of this.module_prefixes) {
            if(result.scriptSource?.startsWith(known)) offset = Math.max(offset, known.length);
          }
        }
        this.script_offsets.set(key, offset >= 0 && !result.scriptSource.slice(0, offset).includes('\n') ? offset : 0);
      } catch(error) { this.script_offsets.set(key, 0); }
    }
  }

  /** Maps an ordinary module error's first-line column using its actual compiled script. */
  async originalModulePosition(frame) {
    if(frame.line !== 1 || !path.isAbsolute(frame.path || '')) return frame;
    const find = () => Array.from(this.script_urls || []).reverse().find(([id, url]) => !id.includes(':') && normalizeScriptURL(url) === normalizeScriptURL(frame.path));
    let entry = find();
    if(!entry) {
      // Renderer IPC can overtake the debugger's scriptParsed notification.
      await new Promise(resolve => {
        const finish = () => { clearTimeout(timer); this.transport.removeListener('message', listener); resolve(); };
        const listener = (_event, method, params, target) => {
          if(!target && method === 'Debugger.scriptParsed' && normalizeScriptURL(params.url) === normalizeScriptURL(frame.path)) finish();
        };
        const timer = setTimeout(finish, 500);
        this.transport.on('message', listener);
        if(find()) finish();
      });
      entry = find();
    }
    if(!entry) return frame;
    await this._prepareFrames([{ url: frame.path, location: { scriptId: entry[0], lineNumber: 0, columnNumber: frame.column - 1 } }]);
    const offset = this.script_offsets.get(':' + entry[0]) || 0;
    return { ...frame, column: Math.max(1, frame.column - offset) };
  }

  /** Maps main/worker scopes and remembers the inspector target owning each handle. */
  _mapFrames(frames = [], target) {
    return frames.map(frame => {
      const url = frame.url || this.script_urls?.get((target || '') + ':' + frame.location.scriptId) ||
        this.script_urls?.get(frame.location.scriptId) || '';
      const source = this.sources.get(url);
      const offset = this.script_offsets.get((target || '') + ':' + frame.location.scriptId) || 0;
      const generated_column = Math.max(0, frame.location.columnNumber - (frame.location.lineNumber === 0 ? offset : 0));
      const catches = source?.catches || this._moduleCatchRanges(url);
      const original = source?.consumer.originalPositionFor({ line: frame.location.lineNumber + 1,
        column: generated_column, bias: SourceMapConsumer.LEAST_UPPER_BOUND });
      return { id: frame.callFrameId, name: frame.functionName || '(script)', path: source?.path || url,
        internal: !!source && !original?.line,
        line: original?.line || frame.location.lineNumber + 1,
        column: (original?.column ?? generated_column) + 1,
        caught_by_user: catches.some(range => {
          const line = original?.line || frame.location.lineNumber + 1;
          const column = original?.column ?? generated_column;
          const contains = range => (line > range.start.line || line === range.start.line && column >= range.start.column) &&
            (line < range.end.line || line === range.end.line && column < range.end.column);
          return contains(range) && !(range.excluded || []).some(contains);
        }),
        scopes: frame.scopeChain.map(scope => {
          if(scope.object.objectId) {
            this.object_handles.add(scope.object.objectId);
            this.object_targets.set(scope.object.objectId, target);
          }
          return { type: scope.type, name: scope.name, object_id: scope.object.objectId };
        }) };
    });
  }

  /** Reads catch ranges for ordinary CommonJS modules that do not need rewriting. */
  _moduleCatchRanges(url) {
    if(!path.isAbsolute(url) || /[\\/](?:node_modules|js[\\/]sandbox)[\\/]/.test(url)) return [];
    try {
      const stat = fs.statSync(url);
      if(!stat.isFile() || stat.size > 2 * 1024 * 1024) return [];
      const cached = this.module_catches.get(url);
      if(cached?.mtime === stat.mtimeMs) return cached.ranges;
      const ast = require('@babel/parser').parse(fs.readFileSync(url, 'utf8'), { sourceType: 'unambiguous', allowReturnOutsideFunction: true });
      const ranges = [];
      const children = (node, visitor) => {
        for(const value of Object.values(node)) {
          if(Array.isArray(value)) value.forEach(item => { if(item?.type) visitor(item); });
          else if(value?.type) visitor(value);
        }
      };
      const visit = node => {
        if(node.type === 'TryStatement' && node.handler && node.block.loc) {
          const excluded = [];
          const exclude = inner => {
            if(/Function|Method/.test(inner.type) && inner.loc) { excluded.push(inner.loc); return; }
            children(inner, exclude);
          };
          children(node.block, exclude);
          ranges.push({ ...node.block.loc, excluded });
        }
        children(node, visit);
      };
      visit(ast);
      this.module_catches.set(url, { mtime: stat.mtimeMs, ranges });
      return ranges;
    } catch(error) { return []; }
  }

  /** @private */
  _command(method, params = {}, session_id) {
    if(this.closed) return Promise.reject(new Error('Sandbox is closed.'));
    return this.transport.sendCommand(method, params, session_id);
  }

  /** @private */
  _requirePaused() {
    if(this.state !== 'paused') throw new Error('Debugger is not paused.');
  }

  /** @private */
  _checkRevision(revision) {
    this._requirePaused();
    if(revision !== this.revision) throw new Error('Paused frame has expired.');
  }

  /** @private */
  _preview(value, target) {
    if(!value) return undefined;
    if(value.objectId) {
      this.object_handles.add(value.objectId);
      this.object_targets.set(value.objectId, target);
    }
    return { type: value.type, subtype: value.subtype,
      value: typeof value.value === 'string' ? value.value.slice(0, 16000) : value.value,
      description: value.description?.slice(0, 16000), object_id: value.objectId,
      unserializable_value: value.unserializableValue };
  }

  /** @private */
  _publish(extra = {}) {
    if(this.callbacks.state) this.callbacks.state(Object.assign(this.status(), extra));
  }

  /** @private */
  _error(error) {
    if(this.callbacks.error) this.callbacks.error(error);
  }
}

exports.PRDC_JSLAB_DEBUGGER = PRDC_JSLAB_DEBUGGER;
