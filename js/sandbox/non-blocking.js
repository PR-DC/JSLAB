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
   * Executes a given function in a non-blocking while loop.
   * @param {Function} fn A function that returns a boolean value; when false, the loop exits.
   */
  nbwhile(fn) {
    var obj = this;
    function fnw() {
      if(!obj.jsl.inter.basic.checkStopLoop()) {
        if(!fn()) {
          obj.jsl.inter.env.setImmediate(fnw);
        }
      } else {
        obj.jsl.inter.env.error('@nbwhile: '+obj.jsl.inter.lang.string(125));
      }
    }
    this.jsl.inter.env.setImmediate(fnw);
  }

  /**
   * Executes a given function once in a non-blocking manner.
   * @param {Function} fn The function to be executed.
   */
  nbrun(fn) {
    if(!this.jsl.inter.basic.checkStopLoop()) {
      this.jsl.inter.env.setImmediate(fn);
    } else {
      this.jsl.inter.env.error('@nbrun: '+this.jsl.inter.lang.string(125));
    }
  }

  /**
   * Schedules the next block of code to be executed in a non-blocking manner.
   * @param {Function} fn The function to execute next.
   */
  nbnext(fn) {
    var obj = this;
    function fnw() {
      if(!obj.jsl.inter.basic.checkStopLoop()) {
        fn();
      } else {
        obj.jsl.inter.env.error('@nbnext: '+obj.jsl.inter.lang.string(125));
      }
    }
    this.jsl.inter.env.setImmediate(fnw);
  }

  /**
   * Waits for a specified number of milliseconds in a non-blocking manner.
   * @param {Number} ms The number of milliseconds to wait.
   * @returns {Promise<void>} A promise that resolves after the specified time has elapsed.
   */
  waitMSeconds(ms) {
    if(!this.jsl.inter.basic.checkStopLoop()) {
      return new Promise(function(resolve, reject) { setTimeout(resolve, ms) });
    } else {
      this.jsl.inter.env.error('@waitMSeconds: '+this.jsl.inter.lang.string(125), true);
    }
    return false;
  }
  
  /**
   * Waits for a specified number of seconds in a non-blocking manner.
   * @param {Number} s The number of seconds to wait.
   * @returns {Promise<void>} A promise that resolves after the specified time has elapsed.
   */
  waitSeconds(s) {
    if(!this.jsl.inter.basic.checkStopLoop()) {
      return this.jsl.inter.waitMSeconds(s*1000);
    } else {
      this.jsl.inter.env.error('@waitSeconds: '+this.jsl.inter.lang.string(125), true);
    }
    return false;
  }

  /**
   * Waits for a specified number of minutes in a non-blocking manner.
   * @param {Number} min The number of minutes to wait.
   * @returns {Promise<void>} A promise that resolves after the specified time has elapsed.
   */
  waitMinutes(min) {
    if(!this.jsl.inter.basic.checkStopLoop()) {
      return this.jsl.inter.waitMSeconds(min*60*1000);
    } else {
      this.jsl.inter.env.error('@waitMinutes: '+this.jsl.inter.lang.string(125), true);
    }
    return false;
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
    return worker;
  }
}

exports.PRDC_JSLAB_LIB_NON_BLOCKING = PRDC_JSLAB_LIB_NON_BLOCKING;
