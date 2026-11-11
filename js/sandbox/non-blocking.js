/**
 * @file JSLAB library non blocking functions submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB non blocking functions submodule.
 */
class PRDC_JSLAB_LIB_NON_BLOCKING {
  
  /**
   * Initializes a new instance of the non-blocking functions submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }

  /**
   * Runs scientific/native work outside the persistent workspace so it can be stopped safely.
   * The function receives copied arguments and must not depend on caller closures.
   * @param {Function} work_function Function to execute in an isolated scientific runtime.
   * @param {Array} [args=[]] Structured-cloneable arguments.
   * @param {Object} [options={}] Optional timeout_ms and AbortSignal signal.
   * @returns {Promise<*>} Copied result; parent variables survive task interruption.
   */
  runInterruptible(work_function, args = [], options = {}) {
    if(typeof work_function !== 'function' || !Array.isArray(args)) throw Error('Expected a function and an argument array.');
    if(options.timeout_ms !== undefined && (!Number.isFinite(options.timeout_ms) || options.timeout_ms <= 0)) throw Error('Expected a positive timeout_ms.');
    const source = this.jsl.inter.execution.web_debugger?.originalFunctionSource(work_function) || Function.prototype.toString.call(work_function);
    const signal = options.signal || this.jsl.inter.execution.signal();
    const NativePromise = this.jsl._Promise || Promise;
    const id = 'native-task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    let worker, worker_url, timer, settled = false, reject_task;
    const cleanup = () => {
      if(timer) this.jsl.inter.clearTimeout(timer);
      if(worker_url) URL.revokeObjectURL(worker_url);
      signal?.removeEventListener('abort', abort);
      const index = this.jsl.cleanup_registry.findIndex(entry => entry.obj === token);
      if(index >= 0) this.jsl.cleanup_registry.splice(index, 1);
    };
    const stop = async () => {
      if(worker) worker.terminate();
      else if(this.jsl.inter.env.cancelInterruptibleTask) await this.jsl.inter.env.cancelInterruptibleTask(id);
    };
    const abort = () => {
      if(settled) return;
      settled = true;
      stop().catch(() => {}).then(() => {
        cleanup();
        reject_task(Object.assign(Error('Isolated task aborted.'), { name: 'AbortError' }));
      });
    };
    const token = {};
    const promise = new NativePromise((resolve, reject) => {
      reject_task = reject;
      const finish = result => {
        if(settled) return;
        settled = true; cleanup(); if(worker) worker.terminate();
        if(result.success) resolve(result.value);
        else reject(Object.assign(Error(result.error || 'Isolated task failed.'), { jslab_error_details: result.error_details }));
      };
      if(signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      this.jsl.addForCleanup(token, async () => { await stop(); abort(); });
      if(options.timeout_ms) timer = this.jsl.inter.setTimeout(() => {
        if(settled) return;
        settled = true; stop().catch(() => {}).then(() => {
          cleanup();
          reject(Object.assign(Error('Isolated task timed out.'), { name: 'TimeoutError' }));
        });
      }, options.timeout_ms);
      try {
        if(typeof this.jsl.inter.env.runInterruptibleTask === 'function') {
          this.jsl.inter.env.runInterruptibleTask(id, source, args).then(finish, error => finish({ success: false, error: error.message }));
        } else {
          const body = 'self.addEventListener("message", async event => { try { const value = await (' + source + ')(...event.data.args); self.postMessage({ type: "task-result", success: true, value }); } catch(error) { self.postMessage({ type: "task-result", success: false, error: String(error.message || error), error_details: await jsl.inter.eval.source_errors.describe(error) }); } }); self.postMessage({ type: "task-ready" });';
          const url = worker_url = URL.createObjectURL(new Blob([body], { type: 'application/javascript' }));
          worker = new Worker(url, { name: options.name || id });
          worker.onmessage = event => {
            if(event.data?.type === 'task-ready') {
              try { URL.revokeObjectURL(url); worker.postMessage({ args }); }
              catch(error) { finish({ success: false, error: error.message }); }
            }
            else if(event.data?.type === 'task-result') finish(event.data);
          };
          worker.onerror = event => { URL.revokeObjectURL(url); finish({ success: false, error: event.message }); };
        }
      } catch(error) { finish({ success: false, error: error.message }); }
    });
    return promise;
  }

  /**
   * Executes a given function in a non-blocking while loop.
   * @param {Function} fn A function that returns a boolean value; when false, the loop exits.
   */
  nbwhile(fn) {
    const schedule = () => this.jsl.inter.setImmediate(() => {
      if(!fn()) schedule();
    });
    schedule();
  }

  /** @param {Function} fn Function to schedule once. */
  nbrun(fn) {
    return this.jsl.inter.setImmediate(fn);
  }

  /** @param {Function} fn Next callback. */
  nbnext(fn) {
    return this.jsl.inter.setImmediate(fn);
  }

  /** @param {number} ms Delay in milliseconds. @returns {Promise<void>} Delay. */
  waitMSeconds(ms) {
    return new this.jsl._Promise(resolve => this.jsl.inter.setTimeout(resolve, ms));
  }

  /** @param {number} seconds Delay. @returns {Promise<void>} Delay. */
  waitSeconds(seconds) {
    return this.waitMSeconds(seconds * 1000);
  }

  /** @param {number} minutes Delay. @returns {Promise<void>} Delay. */
  waitMinutes(minutes) {
    return this.waitMSeconds(minutes * 60000);
  }

  /**
   * Clears the specified interval if it exists.
   * @param {number|undefined} timeout - The interval ID to be cleared.
   * @returns {boolean} Always returns false.
   */
  clearIntervalIf(timeout) {
    if(timeout) {
      this.jsl.inter.clearInterval(timeout);
    }
    return false;
  }
  
  /**
   * Clears the specified timeout if it exists.
   * @param {number|undefined} timeout - The timeout ID to be cleared.
   * @returns {boolean} Always returns false.
   */
  clearTimeoutIf(timeout) {
    if(timeout) {
      this.jsl.inter.clearTimeout(timeout);
    }
    return false;
  }
  
  /**
   * Reset timeout
   * @param {number} id - timeout id.
   * @param {number} fun - timeout function.
   * @param {number} dt - timeout dt.
   * @return {number} timeout id.
   */
  resetTimeout(id, fun, dt) {
    if(id) this.jsl.inter.clearTimeout(id);
    id = this.jsl.inter.setTimeout(fun, dt);
    return id;
  }
  
  /**
   * Initializes a new worker with the specified module path.
   * @param {string} path - The path to the module to configure the worker.
   * @returns {Worker} The initialized Worker instance.
   */
  initWorker(path) {
    var worker = new Worker(this.jsl.app_path + "/js/sandbox/init-worker.js");
    worker.postMessage({
      type: 'configureWorker', 
      module_path: path
    });
    return this.jsl.inter.execution.trackWorker(worker);
  }
}

exports.PRDC_JSLAB_LIB_NON_BLOCKING = PRDC_JSLAB_LIB_NON_BLOCKING;
