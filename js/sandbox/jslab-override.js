/**
 * @file JSLAB library override submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var getWebSubmoduleConstructor;
var getWebUnavailableSubmodule;
if(typeof globalThis != 'undefined' && globalThis.__JSLAB_RUNTIME__ == 'web') {
  ({ getWebSubmoduleConstructor, getWebUnavailableSubmodule } = require('./jslab-web-submodules'));
}
 
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
    this.is_web_runtime = typeof globalThis != 'undefined' &&
      globalThis.__JSLAB_RUNTIME__ == 'web';
    var cfg = this.jsl.inter.config;
    
    this.jsl.builtin_workspace = Object.getOwnPropertyNames(this.jsl.context);
    this._Module = this._getModuleRuntime();
    
    // Overrides
    this.jsl._console = this.jsl.context.console;
    this.jsl._eval = this.jsl.context.eval;
    this.jsl._require = this._Module.prototype.require;
    this.jsl._requestAnimationFrame = this.jsl.context.requestAnimationFrame.bind(this.jsl.context);
    this.jsl._cancelAnimationFrame = this.jsl.context.cancelAnimationFrame.bind(this.jsl.context);
    this.jsl._setInterval = setInterval.bind(this.jsl.context);
    this.jsl._clearInterval = clearInterval.bind(this.jsl.context);
    this.jsl._setTimeout = setTimeout.bind(this.jsl.context);
    this.jsl._clearTimeout = clearTimeout.bind(this.jsl.context);
    this.jsl._setImmediate = this.jsl.inter.env.setImmediate;
    this.jsl._clearImmediate = this.jsl.inter.env.clearImmediate;
    this.jsl._Promise = this.jsl.context.Promise;
    if(!this.jsl.inter.env.is_worker) {
      this.jsl._requestIdleCallback = this.jsl.context.requestIdleCallback.bind(this.jsl.context);
      this.jsl._cancelIdleCallback = this.jsl.context.cancelIdleCallback.bind(this.jsl.context);
    }
    this.jsl._isNaN = this.jsl.context.isNaN;
    
    // Add toJSON methods to some classes
    var GamepadCtor = this.jsl.context.Gamepad;
    if(typeof GamepadCtor != 'undefined' && GamepadCtor && !GamepadCtor.prototype.toJSON) {
      GamepadCtor.prototype.toJSON = function() {
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
    var MediaDeviceInfoCtor = this.jsl.context.MediaDeviceInfo;
    if(typeof MediaDeviceInfoCtor != 'undefined' && MediaDeviceInfoCtor && !MediaDeviceInfoCtor.prototype.toJSON) {
      MediaDeviceInfoCtor.prototype.toJSON = function() {
        return {
          deviceId: this.deviceId,
          kind: this.kind,
          label: this.label,
          groupId: this.groupId
        };
      };
    }

    // Assign environment properties to context
    this.jsl.inter.env.exports.forEach(function(prop) {
      if(cfg.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
        obj.jsl._console.log('Shadowing function/property: ' + prop + ' with env');
      } else if(cfg.DEBUG_NEW_FUN) {
        obj.jsl._console.log('Adding function/property to context: ' + prop + ' from env');
      }
      obj.jsl.context[prop] = obj.jsl.inter.env[prop];
    });

    // Assign libraries properties and methods to context
    if(this.jsl.inter.env.math) {
      Object.getOwnPropertyNames(this.jsl.inter.env.math).forEach(function(prop) {
        if(cfg.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
          obj.jsl._console.log('Shadowing function/property: ' + prop + ' with math lib');
        } else if(cfg.DEBUG_NEW_FUN) {
          obj.jsl._console.log('Adding function/property to context: ' + prop + ' from math lib');
        }
        
        var prop_out = prop;
        if(cfg.MATHJS_PREVENT_OVERRIDE.includes(prop)) {
          prop_out = 'mathjs_'+prop;
        }
        obj.jsl.context[prop_out] = obj.jsl.inter.env.math[prop];
      });
    }
    
    // Construct objects of submodules
    var submodules = {};
    cfg.SUBMODULES['builtin'].forEach(function(module) {  
      submodules[module.name] = obj._constructSubmodule('builtin', module);
    });

    cfg.SUBMODULES['lib'].forEach(function(lib) {  
      obj.jsl.context[lib.name] = obj._constructSubmodule('lib', lib);
      obj.jsl[lib.name] = obj.jsl.context[lib.name];
    });

    // Assign submodule properties and methods to context
    Object.getOwnPropertyNames(submodules).forEach(function(submodule) {
      obj.jsl[submodule] = submodules[submodule]; // Assign submodules
      Object.getOwnPropertyNames(submodules[submodule]).forEach(function(prop) {
        if(!['jsl'].includes(prop) && !prop.startsWith('_')) {
          if(cfg.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
            obj.jsl._console.log('Shadowing property: ' + prop + ' with submodule ' + submodule);
          } else if(cfg.DEBUG_NEW_FUN) {
            obj.jsl._console.log('Adding property to context: ' + prop + ' from submodule ' + submodule);
          } 
          obj.jsl.context[prop] = submodules[submodule][prop];
        }
      });
      
      Object.getOwnPropertyNames(Object.getPrototypeOf(submodules[submodule])).forEach(function(prop) {
        if(!['constructor'].includes(prop) && !prop.startsWith('_')) {
          if(cfg.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
            obj.jsl._console.log('Shadowing function: ' + prop + ' with submodule ' + submodule);
          } else if(cfg.DEBUG_NEW_FUN) {
            obj.jsl._console.log('Adding function to context: ' + prop + ' from submodule ' + submodule);
          } 
          obj.jsl.context[prop] = submodules[submodule][prop].bind(submodules[submodule]);
        }
      });
    });
    
    // Execute override submodule
    this.execute();
    const NativeWorker = this.jsl.context.Worker;
    if(typeof NativeWorker === 'function') {
      this.jsl.context.Worker = class extends NativeWorker {
        constructor(...args) {
          super(...args);
          obj.jsl.inter.execution.trackWorker(this);
        }
      };
    }
    Object.getOwnPropertyNames(Object.getPrototypeOf(this)).forEach(function(prop) {
      if(!['constructor', 'execute'].includes(prop) && !prop.startsWith('_')) {
        if(cfg.DEBUG_FUN_SHADOW && obj.jsl.context.hasOwnProperty(prop)) {
          obj.jsl._console.log('Shadowing function: ' + prop + ' with submodule override');
        } else if(cfg.DEBUG_NEW_FUN) {
          obj.jsl._console.log('Adding function to context: ' + prop + ' from submodule override');
        } 
        obj.jsl.context[prop] = obj[prop].bind(obj);
      }
    });

    setTimeout(function() {
      obj.jsl.context.Promise = obj.Promise;
      obj.jsl.context.console = obj.console;
    }, 500);

    if(this.is_web_runtime && typeof this.jsl.context.require != 'function') {
      this.jsl.context.require = function(module_name) {
        return obj.jsl.inter.env.reportUnavailable('Module "' + module_name + '"');
      };
    }

    this.jsl.initial_workspace = Object.getOwnPropertyNames(this.jsl.context);
  }

  /**
   * Returns the module runtime object appropriate for the current environment.
   * @returns {Object}
   */
  _getModuleRuntime() {
    var obj = this;
    if(this.is_web_runtime) {
      function BrowserModule() {}
      BrowserModule.prototype.require = function(module_name) {
        return obj.jsl.inter.env.reportUnavailable('Module "' + module_name + '"');
      };
      BrowserModule._resolveFilename = function(module_name) {
        throw new Error('Module "' + module_name + '" is not available in web mode.');
      };
      return BrowserModule;
    }
    return eval('require')('module');
  }

  /**
   * Loads and constructs a configured submodule.
   * @param {string} group
   * @param {Object} module_data
   * @returns {Object}
   */
  _constructSubmodule(group, module_data) {
    var ctor = this._getSubmoduleConstructor(group, module_data);
    if(typeof ctor == 'function') {
      return new ctor(this.jsl);
    }
    return this._createUnavailableSubmodule(group, module_data);
  }

  /**
   * Resolves the constructor for a submodule.
   * @param {string} group
   * @param {Object} module_data
   * @returns {Function|undefined}
   */
  _getSubmoduleConstructor(group, module_data) {
    if(this.is_web_runtime) {
      return getWebSubmoduleConstructor(module_data);
    }
    var exp = eval('require')('./' + module_data.file);
    return exp[module_data.class_name];
  }

  /**
   * Creates a stub module that reports the feature as unavailable.
   * @param {string} group
   * @param {Object} module_data
   * @returns {Object}
   */
  _createUnavailableSubmodule(group, module_data) {
    var obj = this;
    var unavailable = getWebUnavailableSubmodule(module_data) || {};
    var methods = Array.isArray(unavailable.methods) ? unavailable.methods : [];
    var label = module_data.name.replaceAll('_', ' ');
    var message = label.charAt(0).toUpperCase() + label.slice(1);

    function UnavailableSubmodule(jsl) {
      this.jsl = jsl;
      this.name = module_data.name;
      this.unavailable_in_web = true;
    }

    methods.forEach(function(method_name) {
      UnavailableSubmodule.prototype[method_name] = function() {
        return obj.jsl.inter.env.reportUnavailable(message);
      };
    });

    return new UnavailableSubmodule(this.jsl);
  }
  
  /**
   * Executes overrides
   */
  execute() {
    var obj = this;
    
    this.deleted = {};
    this.delete_globals = [
      'eval', 'name', 'closed', 'length', 'frameElement', 'navigator', 'styleMedia', 'onsearch', 'isSecureContext', 'trustedTypes', 'onappinstalled', 'onbeforeinstallprompt', 'customElements', 'history', 'navigation', 'locationbar', 'menubar', 'personalbar', 'onunload', 'scheduler', 'chrome',  'scrollbars', 'clientInformation', 'onstorage', 'launchQueue', 'originAgentCluster', 'isSecureContext', 'statusbar', 'toolbar', 'status', 'origin', 'credentialless', 'external', 'screen', 'innerWidth', 'innerHeight', 'scrollX', 'pageXOffset', 'scrollY', 'pageYOffset', 'visualViewport', 'screenX', 'screenY', 'outerWidth', 'outerHeight', 'screenLeft', 'screenTop', 'onbeforexrselect', 'onabort', 'onbeforeinput', 'onblur', 'oncancel', 'oncanplay', 'oncanplaythrough', 'onchange', 'onclick', 'onclose', 'oncontextlost', 'oncontextmenu', 'oncontextrestored', 'oncuechange', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'ondurationchange', 'onemptied', 'onended', 'onfocus', 'onformdata', 'oninput', 'oninvalid', 'onload', 'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onpause', 'onplay', 'onplaying', 'onprogress', 'onratechange', 'onreset', 'onresize', 'onscroll', 'onsecuritypolicyviolation', 'onseeked', 'onseeking', 'onselect', 'onslotchange', 'onstalled', 'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle', 'onvolumechange', 'onwaiting', 'onwebkitanimationend', 'onwebkitanimationiteration', 'onwebkitanimationstart', 'onwebkittransitionend', 'onwheel', 'onauxclick', 'ongotpointercapture', 'onlostpointercapture', 'onpointerdown', 'onpointermove', 'onpointerrawupdate', 'onpointerup', 'onpointercancel', 'onpointerover', 'onpointerout', 'onpointerenter', 'onpointerleave', 'onselectstart', 'onselectionchange', 'onanimationend', 'onanimationiteration', 'onanimationstart', 'ontransitionrun', 'ontransitionstart', 'ontransitionend', 'ontransitioncancel', 'onafterprint', 'onbeforeprint', 'onbeforeunload', 'onhashchange', 'onlanguagechange', 'onmessage', 'onmessageerror', 'onoffline', 'ononline', 'onpagehide', 'onpageshow', 'onpopstate', 'ondevicemotion', 'ondeviceorientation', 'ondeviceorientationabsolute', 'onbeforematch', 'onbeforetoggle', 'onscrollend', 'oncontentvisibilityautostatechange', 'cookieStore', 'caches'
    ];
    
    // Delete globals
    this.delete_globals.forEach(function(prop) {
      var context = obj.jsl.inter.env.context;
      if(obj.is_web_runtime && obj.jsl.inter.env.is_worker && ['onmessage', 'onmessageerror'].includes(prop)) return;
      try {
        obj.deleted[prop] = context[prop];
      } catch {
        obj.deleted[prop] = undefined;
      }

      try {
        var descriptor = Object.getOwnPropertyDescriptor(context, prop);
        if(descriptor && descriptor.configurable) {
          delete context[prop];
        }
      } catch {}
    });
    
    /**
     * Custom implementation of console methods to integrate with JSLAB's display and logging mechanisms.
     */
    this._console_counts = new Map();
    this._console_timers = new Map();
    this._console_group_depth = 0;
    this.console = {
      log: function(...arg) {
        obj._consoleOutput(arg);
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      warn: function(...arg) {
        obj.jsl.inter.env.warn(obj._consoleFormat(arg));
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      info: function(...arg) {
        obj._consoleOutput(arg);
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      error: function(...arg) {
        obj.jsl.inter.env.error(obj._consoleFormat(arg), false);
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      trace: function(...arg) {
        var stack = new Error(obj._consoleFormat(arg) || 'console.trace').stack;
        obj.jsl.inter.env.dispMonospaced(stack);
      },
      assert: function(expression, ...arg) {
        if(!expression) {
          obj.jsl.inter.env.error('Assertion failed' + (arg.length ? ': ' + obj._consoleFormat(arg) : ''), false);
          obj.jsl.no_ans = true;
          obj.jsl.ignore_output = true;
        }
      },
      table: function(data, columns) {
        obj.jsl.inter.env.dispMonospaced(obj._consoleTable(data, columns));
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      clear: function() {
        obj.jsl.inter.env.clc();
      },
      debug: function(...arg) {
        obj._consoleOutput(arg);
      },
      dir: function(value) {
        obj.jsl.inter.env.disp(value);
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      dirxml: function(value) {
        obj.jsl.inter.env.disp(value && value.outerHTML ? value.outerHTML : value);
        obj.jsl.no_ans = true;
        obj.jsl.ignore_output = true;
      },
      time: function(label = 'default') {
        obj._console_timers.set(String(label), performance.now());
      },
      timeLog: function(label = 'default', ...arg) {
        obj._consoleTimer(String(label), false, arg);
      },
      timeEnd: function(label = 'default') {
        obj._consoleTimer(String(label), true, []);
      },
      timeStamp: function(label = '') {
        obj.jsl.inter.env.disp('Timestamp' + (label ? ': ' + label : '') + ' ' + new Date().toISOString());
      },
      count: function(label = 'default') {
        label = String(label);
        var count = (obj._console_counts.get(label) || 0) + 1;
        obj._console_counts.set(label, count);
        obj.jsl.inter.env.disp(label + ': ' + count);
      },
      countReset: function(label = 'default') {
        obj._console_counts.delete(String(label));
      },
      group: function(...arg) {
        if(arg.length) obj._consoleOutput(arg);
        obj._console_group_depth++;
      },
      groupCollapsed: function(...arg) {
        if(arg.length) obj._consoleOutput(arg);
        obj._console_group_depth++;
      },
      groupEnd: function() {
        obj._console_group_depth = Math.max(0, obj._console_group_depth - 1);
      },
      profile: function(label = 'default') {
        if(typeof obj.jsl._console.profile === 'function') obj.jsl._console.profile(label);
        else obj.jsl.inter.env.warn('CPU profiling is not available in this runtime.');
      },
      profileEnd: function(label = 'default') {
        if(typeof obj.jsl._console.profileEnd === 'function') obj.jsl._console.profileEnd(label);
        else obj.jsl.inter.env.warn('CPU profiling is not available in this runtime.');
      }
    };
    
    // Preserve Promise semantics; cancelled continuations never enter user code.
    const NativePromise = this.jsl._Promise;
    this.Promise = class extends NativePromise {
      constructor(executor) {
        const id = ++obj.jsl.last_promise_id;
        const generation = obj.jsl.inter.execution.generation;
        let settled = false;
        const settle = () => {
          settled = true;
          if(obj.jsl.started_promises[id]) obj.jsl.clearPromise(id);
        };
        super((resolve, reject) => executor(value => { settle(); resolve(value); },
          error => { settle(); reject(error); }));
        this._generation = generation;
        if(!settled) {
          obj.jsl.started_promises[id] = this;
          obj.jsl.promises_number++;
          obj.jsl.onStatsChange();
        }
      }

      then(on_fulfilled, on_rejected) {
        const generation = this._generation;
        if(typeof on_fulfilled === 'function') on_fulfilled = obj.jsl.inter.execution.wrap(on_fulfilled);
        if(typeof on_rejected === 'function') on_rejected = obj.jsl.inter.execution.wrap(on_rejected);
        const guard = (callback, rejected) => value => {
          if(generation !== obj.jsl.inter.execution.generation) return new NativePromise(() => {});
          if(typeof callback === 'function') return callback(value);
          if(rejected) throw value;
          return value;
        };
        const result = super.then(guard(on_fulfilled, false), guard(on_rejected, true));
        result._generation = generation;
        return result;
      }
    };

    if(this.is_web_runtime) {
      this._Module.prototype.require = function(module_name) {
        return obj.jsl.inter.env.reportUnavailable('Module "' + module_name + '"');
      };
    } else {
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
  }
  
  /** @private Guards callbacks without exposing execution machinery as commands. */
  /** Formats Console API substitutions without invoking object hooks. @private */
  _consoleFormat(args) {
    args = Array.from(args || []);
    var format = typeof args[0] === 'string' ? args.shift() : '';
    if(!format) {
      if(args.length === 0) return '';
      format = '%o' + Array(Math.max(0, args.length - 1)).fill(' %o').join('');
    }
    var index = 0;
    var text = format.replace(/%([%sdifoOc])/g, (match, type) => {
      if(type === '%') return '%';
      if(index >= args.length) return match;
      var value = args[index++];
      if(type === 'c') return '';
      if(type === 's') return String(value);
      if(type === 'd' || type === 'i') return String(parseInt(value));
      if(type === 'f') return String(parseFloat(value));
      return this.jsl.inter.format.safeStringify(value, 4, false);
    });
    while(index < args.length) {
      var value = args[index++];
      text += ' ' + (typeof value === 'string' ? value : this.jsl.inter.format.safeStringify(value, 4, false));
    }
    return text;
  }

  /** Emits one indented Console API line. @private */
  _consoleOutput(args) {
    args = Array.from(args || []);
    var indent = '  '.repeat(this._console_group_depth);
    if((args[0] === '%o' || args[0] === '%O') && args.length === 2) {
      this.jsl.inter.env.disp(args[1]);
      return;
    }
    if(typeof args[0] === 'string' && /%[%sdifoOc]/.test(args[0])) {
      this.jsl.inter.env.disp(indent + this._consoleFormat(args));
      return;
    }
    if(indent && typeof args[0] === 'string') args[0] = indent + args[0];
    else if(indent) args.unshift(indent);
    this.jsl.inter.env.disp(...args);
  }

  /** Emits or completes a Console API timer. @private */
  _consoleTimer(label, remove, args) {
    if(!this._console_timers.has(label)) {
      this.jsl.inter.env.warn("Timer '" + label + "' does not exist.");
      return;
    }
    var elapsed = performance.now() - this._console_timers.get(label);
    this._consoleOutput([label + ': ' + elapsed.toFixed(3) + ' ms' +
      (args.length ? ' ' + this._consoleFormat(args) : '')]);
    if(remove) this._console_timers.delete(label);
  }

  /** Builds a bounded plain-text table for console.table(). @private */
  _consoleTable(data, columns) {
    var rows;
    if(Array.isArray(data)) rows = data.map((value, index) => [index, value]);
    else if(data && typeof data === 'object') rows = Object.keys(data).map(key => [key, data[key]]);
    else return this._consoleFormat([data]);
    var column_names = Array.isArray(columns) ? columns.map(String) :
      (typeof columns === 'string' ? [columns] : []);
    if(!column_names.length) {
      var names = new Set();
      rows.slice(0, 100).forEach(([, value]) => {
        if(value && typeof value === 'object') Object.keys(value).forEach(key => names.add(key));
      });
      column_names = names.size ? [...names] : ['Value'];
    }
    var header = ['(index)', ...column_names];
    var matrix = [header];
    rows.slice(0, 100).forEach(([index, value]) => {
      matrix.push([String(index), ...column_names.map(name => {
        var cell = name === 'Value' ? value : value?.[name];
        var text = typeof cell === 'string' ? cell : this.jsl.inter.format.safeStringify(cell, 2, false);
        return text.length > 40 ? text.slice(0, 37) + '...' : text;
      })]);
    });
    var widths = header.map((name, index) => Math.min(40,
      Math.max(...matrix.map(row => String(row[index] ?? '').length))));
    return matrix.map((row, row_index) => {
      var line = row.map((cell, index) => String(cell ?? '').padEnd(widths[index])).join(' | ');
      return row_index === 0 ? line + '\n' + widths.map(width => '-'.repeat(width)).join('-|-') : line;
    }).join('\n') + (rows.length > 100 ? '\n... ' + (rows.length - 100) + ' more rows' : '');
  }

  _guardCallback(callback) {
    return this.jsl.inter.execution ? this.jsl.inter.execution.wrap(callback) : callback;
  }

  /**
   * Schedules a function to be called on the next animation frame in a non-blocking manner.
   * @param {Function} fun The function to call on the next animation frame.
   * @returns {number} The request ID of the animation frame request.
   */
  requestAnimationFrame(fun) {
    var obj = this;
    fun = this._guardCallback(fun);
    var request_id = this.jsl._requestAnimationFrame(function(timestamp) {
      fun(timestamp);
      obj.jsl.inter.array.removeElementByValue(obj.jsl.started_animation_frames, request_id);
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
    this.jsl.inter.array.removeElementByValue(this.jsl.started_animation_frames, request_id);
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
    fun = this._guardCallback(fun);
    var request_id = this.jsl._requestIdleCallback(function(deadline) {
      fun(deadline);
      obj.jsl.inter.array.removeElementByValue(obj.jsl.started_idle_callbacks, request_id);
      obj.jsl.onStatsChange();
    }, options);
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
    this.jsl.inter.array.removeElementByValue(this.jsl.started_idle_callbacks, request_id);
    this.jsl.onStatsChange();
  }
  
  /**
   * Sets a repeated interval in a non-blocking manner.
   * @param {Function} fun The function to execute at each interval.
   * @param {number} delay The number of milliseconds between each execution of the function.
   * @returns {number} The interval ID.
   */
  setInterval(...arg) {
    arg[0] = this._guardCallback(arg[0]);
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
    this.jsl.inter.array.removeElementByValue(this.jsl.started_intervals, request_id);
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
    fun = this._guardCallback(fun);
    var request_id = this.jsl._setTimeout(function() {
      fun(...arg);
      obj.jsl.inter.array.removeElementByValue(obj.jsl.started_timeouts, request_id); 
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
    this.jsl.inter.array.removeElementByValue(this.jsl.started_timeouts, request_id);
    this.jsl.onStatsChange();
  }
  
  /**
   * Schedules a function to be executed immediately in a non-blocking manner.
   * @param {Function} fun The function to execute.
   * @returns {number} The immediate ID.
   */
  setImmediate(fun, ...args) {
    var obj = this;
    fun = this._guardCallback(fun);
    var request_id = this.jsl._setImmediate(function() {
      fun(...args);
      obj.jsl.inter.array.removeElementByValue(obj.jsl.started_immediates, request_id);
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
    this.jsl.inter.array.removeElementByValue(this.jsl.started_immediates, request_id);
    this.jsl.onStatsChange();
  }
}

exports.PRDC_JSLAB_OVERRIDE = PRDC_JSLAB_OVERRIDE;
