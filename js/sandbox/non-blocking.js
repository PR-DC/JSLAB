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
      if(!obj.jsl.basic.checkStopLoop()) {
        if(!fn()) {
          obj.jsl.env.setImmediate(fnw);
        }
      } else {
        obj.jsl.env.error('@nbwhile: '+language.string(125));
      }
    }
    this.jsl.env.setImmediate(fnw);
  }

  /**
   * Executes a given function once in a non-blocking manner.
   * @param {Function} fn The function to be executed.
   */
  nbrun(fn) {
    if(!this.jsl.basic.checkStopLoop()) {
      this.jsl.env.setImmediate(fn);
    } else {
      this.jsl.env.error('@nbrun: '+language.string(125));
    }
  }

  /**
   * Schedules the next block of code to be executed in a non-blocking manner.
   * @param {Function} fn The function to execute next.
   */
  nbnext(fn) {
    var obj = this;
    function fnw() {
      if(!obj.jsl.basic.checkStopLoop()) {
        fn();
      } else {
        obj.jsl.env.error('@nbnext: '+language.string(125));
      }
    }
    this.jsl.env.setImmediate(fnw);
  }

  /**
   * Waits for a specified number of milliseconds in a non-blocking manner.
   * @param {Number} ms The number of milliseconds to wait.
   * @returns {Promise<void>} A promise that resolves after the specified time has elapsed.
   */
  waitMSeconds(ms) {
    if(!this.jsl.basic.checkStopLoop()) {
      return new Promise(function(resolve, reject) { setTimeout(resolve, ms) });
    } else {
      this.jsl.env.error('@waitMSeconds: '+language.string(125), true);
    }
    return false;
  }
  
  /**
   * Waits for a specified number of seconds in a non-blocking manner.
   * @param {Number} s The number of seconds to wait.
   * @returns {Promise<void>} A promise that resolves after the specified time has elapsed.
   */
  waitSeconds(s) {
    if(!this.jsl.basic.checkStopLoop()) {
      return waitMSeconds(s*1000); 
    } else {
      this.jsl.env.error('@waitSeconds: '+language.string(125), true);
    }
    return false;
  }

  /**
   * Waits for a specified number of minutes in a non-blocking manner.
   * @param {Number} min The number of minutes to wait.
   * @returns {Promise<void>} A promise that resolves after the specified time has elapsed.
   */
  waitMinutes(min) {
    if(!this.jsl.basic.checkStopLoop()) {
      return waitMSeconds(min*60*1000);
    } else {
      this.jsl.env.error('@waitMinutes: '+language.string(125), true);
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
      clearInterval(timeout);
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
      clearTimeout(timeout);
    }
    return false;
  }
  
  /**
   * Initializes a new worker with the specified module path.
   * @param {string} path - The path to the module to configure the worker.
   * @returns {Worker} The initialized Worker instance.
   */
  initWorker(path) {
    var worker = new Worker(app_path + "/js/sandbox/init-worker.js");
    worker.postMessage({
      type: 'configureWorker', 
      module_path: path
    });
    return worker;
  }
}

exports.PRDC_JSLAB_LIB_NON_BLOCKING = PRDC_JSLAB_LIB_NON_BLOCKING;