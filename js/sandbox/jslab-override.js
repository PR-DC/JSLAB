/**
 * @file JSLAB library override submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB override submodule.
 */
class PRDC_JSLAB_OVERRIDE {
  
  /**
   * Initializes the override submodule, setting up a secure execution environment by deleting or overriding global properties and methods.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    
    this.jsl.builtin_workspace = Object.getOwnPropertyNames(this.jsl.context);
    this._Module = require('module');
    
    // Overrides
    this.jsl._console = this.jsl.context.console;
    this.jsl._eval = this.jsl.context.eval;
    this.jsl._require = this._Module.prototype.require;
    this.jsl._requestAnimationFrame = this.jsl.context.requestAnimationFrame.bind(this.context);
    this.jsl._cancelAnimationFrame = this.jsl.context.cancelAnimationFrame.bind(this.context);
    this.jsl._setInterval = setInterval.bind(this.jsl.context);
    this.jsl._clearInterval = clearInterval.bind(this.jsl.context);
    this.jsl._setTimeout = setTimeout.bind(this.jsl.context);
    this.jsl._clearTimeout = clearTimeout.bind(this.jsl.context);
    this.jsl._setImmediate = this.jsl.env.setImmediate;
    this.jsl._clearImmediate = this.jsl.env.clearImmediate;
    this.jsl._Promise = this.jsl.context.Promise;
    if(!global.is_worker) {
      this.jsl._requestIdleCallback = this.jsl.context.requestIdleCallback.bind(this.context);
      this.jsl._cancelIdleCallback = this.jsl.context.cancelIdleCallback.bind(this.context);
    }
    this.jsl._isNaN = this.jsl.context.isNaN;
    
    // Add toJSON methods to some classes
    if(!Gamepad.prototype.toJSON) {
      Gamepad.prototype.toJSON = function() {
        return {
          id: this.id,
          index: this.index,
          connected: this.connected,
          timestamp: this.timestamp,
          mapping: this.mapping,
          axes: Array.from(this.axes),
          buttons: this.buttons.map(button => ({
            pressed: button.pressed,
            value: button.value
          }))
        };
      };
    }
    if(!MediaDeviceInfo.prototype.toJSON) {
      MediaDeviceInfo.prototype.toJSON = function() {
        return {
          deviceId: this.deviceId,
          kind: this.kind,
          label: this.label,
          groupId: this.groupId
        };
      };
    }

    // Assign environment properties to context
    this.jsl.env.exports.forEach(function(prop) {
      if(config.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
        obj.jsl._console.log('Shadowing function/property: ' + prop + ' with env');
      } else if(config.DEBUG_NEW_FUN) {
        obj.jsl._console.log('Adding function/property to context: ' + prop + ' from env');
      }
      obj.jsl.context[prop] = obj.jsl.env.prop;
    });

    // Assign libraries properties and methods to context
    if(this.jsl.env.math) {
      Object.getOwnPropertyNames(this.jsl.env.math).forEach(function(prop) {
        if(config.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
          obj.jsl._console.log('Shadowing function/property: ' + prop + ' with math lib');
        } else if(config.DEBUG_NEW_FUN) {
          obj.jsl._console.log('Adding function/property to context: ' + prop + ' from math lib');
        }
        
        var prop_out = prop;
        if(config.MATHJS_PREVENT_OVERRIDE.includes(prop)) {
          prop_out = 'mathjs_'+prop;
        }
        obj.jsl.context[prop_out] = obj.jsl.env.math[prop];
      });
    }
    
    // Construct objects of submodules
    var submodules = {};
    config.SUBMODULES['builtin'].forEach(function(module) {  
      var exp = require('./'+module.file);
      submodules[module.name] = new exp[module.class_name](obj.jsl);
    });

    config.SUBMODULES['lib'].forEach(function(lib) {  
      var exp = require('./'+lib.file);
      obj.jsl.context[lib.name] = new exp[lib.class_name](obj.jsl);
      obj.jsl[lib.name] = obj.jsl.context[lib.name];
    });

    // Assign submodule properties and methods to context
    Object.getOwnPropertyNames(submodules).forEach(function(submodule) {
      obj.jsl[submodule] = submodules[submodule]; // Assign submodules
      Object.getOwnPropertyNames(submodules[submodule]).forEach(function(prop) {
        if(!['jsl'].includes(prop) || !prop.startsWith('_')) {
          if(config.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
            obj.jsl._console.log('Shadowing property: ' + prop + ' with submodule ' + submodule);
          } else if(config.DEBUG_NEW_FUN) {
            obj.jsl._console.log('Adding property to context: ' + prop + ' from submodule ' + submodule);
          } 
          obj.jsl.context[prop] = submodules[submodule][prop];
        }
      });
      
      Object.getOwnPropertyNames(Object.getPrototypeOf(submodules[submodule])).forEach(function(prop) {
        if(!['constructor'].includes(prop)) {
          if(config.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
            obj.jsl._console.log('Shadowing function: ' + prop + ' with submodule ' + submodule);
          } else if(config.DEBUG_NEW_FUN) {
            obj.jsl._console.log('Adding function to context: ' + prop + ' from submodule ' + submodule);
          } 
          obj.jsl.context[prop] = submodules[submodule][prop].bind(submodules[submodule]);
        }
      });
    });
    
    this.jsl.initial_workspace = Object.getOwnPropertyNames(this.jsl.context);

    // Execute override submodule
    this.execute();
    Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach(function(prop) {
      if(!['constructor', 'execute'].includes(prop)) {
        if(config.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
          obj.jsl._console.log('Shadowing function: ' + prop + ' with submodule override');
        } else if(config.DEBUG_NEW_FUN) {
          obj.jsl._console.log('Adding function to context: ' + prop + ' from submodule override');
        } 
        obj.jsl.context[prop] = obj[prop].bind(obj);
      }
    });

    setTimeout(function() {
      obj.jsl.context.Promise = obj.Promise;
      obj.jsl.context.console = obj.console;
    }, 500);
  }
  
  /**
   * Executes overrides
   */
  execute() {
    var obj = this;
    
    this.deleted = {};
    this.delete_globals = [
      'eval', 'name', 'closed', 'length', 'frameElement', 'navigator', 'styleMedia', 'onsearch', 'isSeureContext', 'trustedTypes', 'onappinstalled', 'onbeforeinstallprompt', 'customElements', 'history', 'navigation', 'locationbar', 'menubar', 'personalbar', 'onunload', 'scheduler', 'chrome',  'scrollbars', 'clientInformation', 'onstorage', 'launchQueue', 'originAgentCluster', 'isSecureContext', 'statusbar', 'toolbar', 'status', 'origin', 'credentialless', 'external', 'screen', 'innerWidth', 'innerHeight', 'scrollX', 'pageXOffset', 'scrollY', 'pageYOffset', 'visualViewport', 'screenX', 'screenY', 'outerWidth', 'outerHeight', 'screenLeft', 'screenTop', 'onbeforexrselect', 'onabort', 'onbeforeinput', 'onblur', 'oncancel', 'oncanplay', 'oncanplaythrough', 'onchange', 'onclick', 'onclose', 'oncontextlost', 'oncontextmenu', 'oncontextrestored', 'oncuechange', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'ondurationchange', 'onemptied', 'onended', 'onfocus', 'onformdata', 'oninput', 'oninvalid', 'onload', 'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onpause', 'onplay', 'onplaying', 'onprogress', 'onratechange', 'onreset', 'onresize', 'onscroll', 'onsecuritypolicyviolation', 'onseeked', 'onseeking', 'onselect', 'onslotchange', 'onstalled', 'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle', 'onvolumechange', 'onwaiting', 'onwebkitanimationend', 'onwebkitanimationiteration', 'onwebkitanimationstart', 'onwebkittransitionend', 'onwheel', 'onauxclick', 'ongotpointercapture', 'onlostpointercapture', 'onpointerdown', 'onpointermove', 'onpointerrawupdate', 'onpointerup', 'onpointercancel', 'onpointerover', 'onpointerout', 'onpointerenter', 'onpointerleave', 'onselectstart', 'onselectionchange', 'onanimationend', 'onanimationiteration', 'onanimationstart', 'ontransitionrun', 'ontransitionstart', 'ontransitionend', 'ontransitioncancel', 'onafterprint', 'onbeforeprint', 'onbeforeunload', 'onhashchange', 'onlanguagechange', 'onmessage', 'onmessageerror', 'onoffline', 'ononline', 'onpagehide', 'onpageshow', 'onpopstate', 'ondevicemotion', 'ondeviceorientation', 'ondeviceorientationabsolute', 'onbeforematch', 'onbeforetoggle', 'onscrollend', 'oncontentvisibilityautostatechange', 'cookieStore', 'caches'
    ];
    
    // Delete globals
    this.delete_globals.forEach(function(prop) {
      obj.deleted[prop] = obj.jsl.env.context[prop];
      delete obj.jsl.env.context[prop];
    });
    
    /**
     * Custom implementation of console methods to integrate with JSLAB's display and logging mechanisms.
     */
    this.console = {
      log: function(...arg) {
        obj.jsl.env.disp(...arg);
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      warn: function(...arg) {
        obj.jsl.env.warn(...arg);
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      info: function(...arg) {
        obj.jsl.env.disp(...arg);
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      error: function(...arg) {
        obj.jsl.env.error(...arg);
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      trace: function() {
        obj.jsl.notImplemented();
      },
      assert: function(expression, msg) {
        if(!expression) {
          obj.jsl.env.error(msg);
          obj.jsl.no_ans = true;
          obj.jsl.ignore_output = true;
        }
      },
      table: function(...arg) {
        obj.jsl.notImplemented();
      },
      clear: function() {
        obj.jsl.basic._clear();
      },
      debug: function() {
        obj.jsl.notImplemented();
      },
      dir: function() {
        obj.jsl.notImplemented();
      },
      dirxml: function() {
        obj.jsl.notImplemented();
      },
      time: function() {
        obj.jsl.notImplemented();
      },
      timeLog: function() {
        obj.jsl.notImplemented();
      },
      timeEnd: function() {
        obj.jsl.notImplemented();
      },
      timeStamp: function() {
        obj.jsl.notImplemented();
      },
      count: function() {
        obj.jsl.notImplemented();
      },
      countreset: function() {
        obj.jsl.notImplemented();
      },
      group: function() {
        obj.jsl.notImplemented();
      },
      groupCollapsed: function() {
        obj.jsl.notImplemented();
      },
      groupEnd: function() {
        obj.jsl.notImplemented();
      },
      profile: function() {
        obj.jsl.notImplemented();
      },
      profileEnd: function() {
        obj.jsl.notImplemented();
      }
    };
    
    /**
     * Provides a custom Promise implementation with enhanced functionality to integrate with JSLAB's execution flow.
     */
    this.Promise = class extends this.jsl._Promise {
      constructor(executor) {
        if(obj.jsl.basic.checkStopLoop() || !obj.jsl.basic.checkStopLoop()) {
          obj.jsl.promises_number += 1;
          obj.jsl.last_promise_id += 1;
          let promises_id = obj.jsl.last_promise_id;
          obj.jsl.onStatsChange();
          let data = super(function(_resolve, _reject) {
             return executor(function(...args) {
               obj.jsl.clearPromise(promises_id);
               _resolve(...args);
             }, function(...args) {
               obj.jsl.clearPromise(promises_id);
               _reject(...args);
             });
          });
          data.loop_stoped = false;
          obj.jsl.started_promises[promises_id] = data;
          return data;
        } else {
          let data = super(function(resolve, reject) {
            reject();
          });
          return data;
        }
      }

      // Override the `then` method
      then(...args) {
        if(!this.loop_stoped) {
          let newPromise = super.then(...args);
          return newPromise;
        }
        return false;
      }

      // Override the `catch` method
      catch(...args) {
        if(!this.loop_stoped) {
          let newPromise = super.catch(...args);          
          return newPromise;
        }
        return false;
      }
      
      // Override the `finally` method
      finally(...args) {
        if(!this.loop_stoped) {
          let newPromise = super.finally(...args);
          return newPromise;
        }
        return false;
      }
    };
    
    this._Module.prototype.require = function(...args) {
      var name = obj.jsl.pathResolve(args[0], this);
      if(name) {
        if(!obj.jsl.required_modules.includes(name)) {
          obj.jsl.required_modules.push(name);
        }
        args[0] = name;
        return obj.jsl._require.apply(this, args);
      }
      return false;
    };
  }
  
  /**
   * Schedules a function to be called on the next animation frame in a non-blocking manner.
   * @param {Function} fun The function to call on the next animation frame.
   * @returns {number} The request ID of the animation frame request.
   */
  requestAnimationFrame(fun) {
    var obj = this;
    var request_id = this.jsl._requestAnimationFrame(function() {
      fun();
      obj.jsl.array.removeElementByValue(obj.jsl.started_animation_frames, request_id);
      obj.jsl.onStatsChange();
    });
    this.jsl.started_animation_frames.push(request_id);
    this.jsl.onStatsChange();
    return request_id;
  }
  
  /**
   * Cancels an animation frame request.
   * @param {number} request_id The ID of the request to cancel.
   */
  cancelAnimationFrame(request_id) {
    this.jsl._cancelAnimationFrame(request_id);
    this.jsl.array.removeElementByValue(this.jsl.started_animation_frames, request_id);
    this.jsl.onStatsChange();
  }
  
  /**
   * Schedules a function to run during the browser's idle periods in a non-blocking manner.
   * @param {Function} fun The function to execute during idle time.
   * @param {Object} options Optional settings for the idle callback.
   * @returns {number} The request ID of the idle callback request.
   */
  requestIdleCallback(fun, options) {
    var obj = this;
    var request_id = this.jsl.requestIdleCallback(function() {
      fun(options);
      obj.jsl.array.removeElementByValue(obj.jsl.started_idle_callbacks, request_id);
      obj.jsl.onStatsChange();
    });
    this.jsl.started_idle_callbacks.push(request_id);
    this.jsl.onStatsChange();
    return request_id;
  }
  
  /**
   * Cancels an idle callback request.
   * @param {number} request_id The ID of the request to cancel.
   */
  cancelIdleCallback(request_id) {
    this.jsl._cancelIdleCallback(request_id);
    this.jsl.array.removeElementByValue(this.jsl.started_idle_callbacks, request_id);
    this.jsl.onStatsChange();
  }
  
  /**
   * Sets a repeated interval in a non-blocking manner.
   * @param {Function} fun The function to execute at each interval.
   * @param {number} delay The number of milliseconds between each execution of the function.
   * @returns {number} The interval ID.
   */
  setInterval(...arg) {
    var request_id = this.jsl._setInterval(...arg);
    this.jsl.started_intervals.push(request_id);
    this.jsl.onStatsChange();
    return request_id;
  }

  /**
   * Clears a repeated interval.
   * @param {number} request_id The ID of the interval to clear.
   */
  clearInterval(request_id) {
    this.jsl._clearInterval(request_id);
    this.jsl.array.removeElementByValue(this.jsl.started_intervals, request_id);
    this.jsl.onStatsChange();
  }
  
  /**
   * Sets a timeout to execute a function once after a delay in a non-blocking manner.
   * @param {Function} fun The function to execute after the delay.
   * @param {number} delay The delay in milliseconds before the function is executed.
   * @returns {number} The timeout ID.
   */
  setTimeout(fun, delay, ...arg) {
    var obj = this;
    var request_id = this.jsl._setTimeout(function() {
      fun(...arg);
      obj.jsl.array.removeElementByValue(obj.jsl.started_timeouts, request_id); 
      obj.jsl.onStatsChange();      
    }, delay);
    this.jsl.started_timeouts.push(request_id);
    this.jsl.onStatsChange(); 
    return request_id;
  }
  
  /**
   * Clears a timeout.
   * @param {number} request_id The ID of the timeout to clear.
   */
  clearTimeout(request_id) {
    this.jsl._clearTimeout(request_id);
    this.jsl.array.removeElementByValue(this.jsl.started_timeouts, request_id);
    this.jsl.onStatsChange();
  }
  
  /**
   * Schedules a function to be executed immediately in a non-blocking manner.
   * @param {Function} fun The function to execute.
   * @returns {number} The immediate ID.
   */
  setImmediate(fun) {
    var obj = this;
    var request_id = this.jsl._setImmediate(function() {
      fun();
      obj.jsl.array.removeElementByValue(obj.jsl.started_immediates, request_id);
      obj.jsl.onStatsChange();
    });
    this.jsl.started_immediates.push(request_id);
    this.jsl.onStatsChange(); 
    return request_id;
  }
  
  /**
   * Clears an immediate.
   * @param {number} request_id The ID of the immediate to clear.
   */
  clearImmediate(request_id) {
    this.jsl._clearImmediate(request_id);
    this.jsl.array.removeElementByValue(this.jsl.started_immediates, request_id);
    this.jsl.onStatsChange();
  }
}

exports.PRDC_JSLAB_OVERRIDE = PRDC_JSLAB_OVERRIDE;