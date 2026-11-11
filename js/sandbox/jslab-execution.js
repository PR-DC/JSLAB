/**
 * @file JSLAB execution lifetime and interruption cleanup
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Keeps application cancellation separate from V8 stack termination.
 * No loop instrumentation or polling is needed to interrupt JavaScript.
 */
class PRDC_JSLAB_EXECUTION {
  /** @param {Object} jsl Persistent runtime. */
  constructor(jsl) {
    this.jsl = jsl;
    this.generation = 0;
    this.sequence = 0;
    this.workers = new Set();
    this.current = null;
    this.abort_controller = new AbortController();
  }

  /** @returns {Object} Identity and cancellation promise for one evaluation. */
  begin() {
    const NativePromise = this.jsl._Promise || Promise;
    const token = { id: String(++this.sequence), generation: this.generation, cancelled: false };
    token.cancellation = new NativePromise(resolve => { token.cancel = resolve; });
    this.current = token;
    return token;
  }

  /** @param {Object} token Execution identity. @returns {boolean} Still valid. */
  valid(token) {
    return !token || (!token.cancelled && token.generation === this.generation);
  }

  /**
   * Lets a suspended top-level await finish without waiting for its old producer.
   * @param {Promise} promise Running evaluation.
   * @param {Object} token Evaluation token.
   */
  wait(promise, token = this.current) {
    if(!token) return promise;
    const NativePromise = this.jsl._Promise || Promise;
    return NativePromise.race([promise, token.cancellation.then(() => {
      throw Object.assign(new Error('Execution interrupted.'), { name: 'JslabInterrupted' });
    })]);
  }

  /** @param {Object} token Completed evaluation. */
  finish(token) {
    if(this.current?.id === token?.id) this.current = null;
  }

  /**
   * Guards registered asynchronous callbacks against a cancelled generation.
   * @param {Function} callback Scheduled user callback.
   * @returns {Function} Callback preserving receiver and arguments.
   */
  wrap(callback) {
    const execution = this;
    const generation = this.generation;
    const debugger_runtime = this.jsl.inter.execution?.web_debugger;
    const history = debugger_runtime?.captureAsync();
    return function(...args) {
      if(generation !== execution.generation) return;
      if(debugger_runtime) return debugger_runtime.withAsync(history, callback, this, args);
      return callback.apply(this, args);
    };
  }

  /** @param {Worker} worker Worker owned by this runtime. @returns {Worker} Worker. */
  trackWorker(worker) {
    if(this.workers.has(worker)) return worker;
    this.workers.add(worker);
    const terminate = worker.terminate.bind(worker);
    worker.terminate = () => {
      this.workers.delete(worker);
      return terminate();
    };
    return worker;
  }

  /** Stops explicitly registered workers, including workers outside the pool. */
  stopWorkers() {
    for(const worker of Array.from(this.workers)) worker.terminate();
  }

  /** @returns {AbortSignal} Signal for explicitly cancellable operations. */
  signal() {
    return this.abort_controller.signal;
  }

  /**
   * Invalidates continuations while V8 is paused, before its stack is discarded.
   * This synchronous barrier must not invoke user cleanup or abort listeners.
   * @param {string|null} id Expected execution identity.
   */
  cancel(id) {
    const token = this.current;
    if(id !== null && token && id !== token.id) throw new Error('Stale interruption request.');
    if(token?.cancelled) return;
    this.generation++;
    if(token) {
      token.cancelled = true;
      token.cancel();
    }
  }

  /** Releases registered resources after an error or an explicit interruption. */
  async cleanupResources() {
    this.abort_controller.abort();
    this.abort_controller = new AbortController();
    const errors = [];
    // A failing cleanup must not prevent the remaining resources being released.
    const operations = [
      () => this.stopWorkers(),
      () => this.jsl.inter.parallel.terminate(),
      () => this.jsl.inter.system._clear(),
      () => this.jsl.clearEventListeners(),
      () => this.jsl.clearImmediates(),
      () => this.jsl.clearAnimationFrames(),
      () => this.jsl.clearIntervals(),
      () => this.jsl.clearTimeouts(),
      () => this.jsl.clearIdleCallbacks(),
      () => this.jsl.stopPromises(),
      () => this.jsl.stopSubprocesses(),
      () => this.jsl.doCleanup()
    ];
    for(const operation of operations) {
      try { await operation(); } catch(error) { errors.push(String(error.message || error)); }
    }
    return errors;
  }

  /**
   * Runs from a fresh CDP evaluation after the user stack has been terminated.
   * @param {string|null} id Expected execution; null also stops idle background work.
   * @returns {Promise<Object>} Cleanup result, without clearing workspace variables.
   */
  interrupt(id) {
    if(this._interruption) return this._interruption;
    this._interruption = this._interrupt(id).finally(() => { this._interruption = null; });
    return this._interruption;
  }

  /** @private Releases resources once even when multiple transports request a stop. */
  async _interrupt(id) {
    const token = this.current;
    if(id !== null && token && id !== token.id) throw new Error('Stale interruption request.');
    this.cancel(id);
    this.current = null;
    const errors = await this.cleanupResources();
    // Capturing evaluation promises may never run their finally blocks after V8 termination.
    this.jsl.inter.env._automation_output = null;
    this.jsl.pending_top_level_script_finish = false;
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    this.jsl.inter.env.setWorkspace();
    this.jsl.onStatsChange();
    this.jsl.inter.env.codeEvaluated({ execution_id: id, interrupted: true });
    this.jsl.inter.env.setStatus('ready', this.jsl.inter.lang.string(87));
    return { success: true, interrupted: true, cleanup_errors: errors };
  }
}

exports.PRDC_JSLAB_EXECUTION = PRDC_JSLAB_EXECUTION;
