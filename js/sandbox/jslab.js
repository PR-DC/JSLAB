/**
 * @file JSLAB library
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_EVAL } = require('./jslab-eval');
const { PRDC_JSLAB_OVERRIDE } = require('./jslab-override');
const { PRDC_JSLAB_ENV } = require('./jslab-env-electron');
const { CORE_INTERNAL_MODULE_NAMES } = require('./internal-protected-modules');

/**
 * Class for JSLAB library.
 */
class PRDC_JSLAB_LIB {
  
  /**
   * Constructs the JSLAB library environment, initializing submodules and setting up the execution context.
   * @param {string} app_path_in - Absolute application root path.
   * @param {boolean} [packed_in=false] - Whether the app is running in packed mode.
   */
  constructor(app_path_in, packed_in = false) {
    var obj = this;
    this.ready = false;
    this.config = global.config;
    this.lang = global.language;
    this.language = this.lang;
    this.app_path = app_path_in;
    this.packed = packed_in;
    
    // Library built in properties
    this.previous_workspace = {};
    this.previous_properties = [];

    this.stop_loop = false;
    this.no_stats = false;
    this.last_script_path;
    this.last_script_lines;
    this.last_script_silent;
    
    this.current_script;
    this.class_registry = {};
    
    this.required_modules = [];
    this.started_timeouts = [];
    this.started_intervals = [];
    this.started_animation_frames = [];
    this.started_idle_callbacks = [];
    this.started_immediates = [];
    this.cleanup_registry = [];
    this.started_promises = {};
    this.promises_number = 0;
    this.last_promise_id = 0;
    
    this.env = new PRDC_JSLAB_ENV(this);
    this.context = this.env.context;
    this.internal_jsl_identifier = '__jsl_internal__';
    try {
      Object.defineProperty(this.context, this.internal_jsl_identifier, {
        value: this,
        writable: false,
        configurable: false,
        enumerable: false
      });
    } catch {
      this.context[this.internal_jsl_identifier] = this;
    }
    this.setDepthSafeStringify(this.context, 1);
    this.context._ = Symbol('_');
    this.eval = new PRDC_JSLAB_EVAL(this);
    this.inter = this._createBootstrapInter();
    
    this.debug = this.env.debug;
    this.includes_path = this.env.getDefaultPath('includes');
    
    if(this.config.PLOTTER == 'plotly') {
      var { PRDC_JSLAB_PLOTTER } = require('./jslab-plotter-plotly');
    } else if(this.config.PLOTTER == 'echarts') {
      var { PRDC_JSLAB_PLOTTER } = require('./jslab-plotter-echarts');
    }
    this.plotter = new PRDC_JSLAB_PLOTTER(this);
    
    this.override = new PRDC_JSLAB_OVERRIDE(this);
    this._createInternalReferences();
    
    this.ready = true;
  }

  /**
   * Returns localized text without placeholder formatting for sandbox use.
   * @param {number} id Language string id.
   * @returns {string}
   */
  currentString(id) {
    return this.lang.currentString(id);
  }

  /**
   * Returns localized text formatted with placeholders for sandbox use.
   * @param {number} id Language string id.
   * @param {Object} [values={}] Placeholder values.
   * @returns {string}
   */
  formatLang(id, values) {
    if(typeof values === 'undefined') {
      return this.lang.currentString(id);
    }
    return this.lang.formatLang(id, values);
  }

  /**
   * Creates a temporary inter proxy used while submodules are constructing.
   * It resolves properties from the live JSL instance until the final
   * immutable inter snapshot is created.
   * @returns {Proxy}
   */
  _createBootstrapInter() {
    const obj = this;
    return new Proxy(Object.create(null), {
      get(_target, prop) {
        return obj[prop];
      },
      has(_target, prop) {
        return prop in obj;
      },
      ownKeys() {
        return Reflect.ownKeys(obj);
      },
      getOwnPropertyDescriptor(_target, prop) {
        if(!(prop in obj)) {
          return undefined;
        }
        return {
          configurable: true,
          enumerable: false,
          writable: false,
          value: obj[prop]
        };
      },
      set() {
        return false;
      }
    });
  }

  /**
   * Snapshots initial sandbox globals for stable internal usage.
   * Internal modules should use `this.jsl.inter.*` to avoid user overrides.
   */
  _createInternalReferences() {
    const inter = Object.create(null);
    const raw_module_names = new Set(['figures']);
    const snapshot_names = Array.isArray(this.initial_workspace)
      ? this.initial_workspace
      : Object.getOwnPropertyNames(this.context);

    for(const name of snapshot_names) {
      if(name === this.internal_jsl_identifier) {
        continue;
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(this.context, name);
      } catch {
        continue;
      }
      if(!descriptor) {
        continue;
      }
      // Avoid triggering accessor getters (e.g. command aliases like clc/cmd_help)
      // while building the internal snapshot.
      if(descriptor.get || descriptor.set) {
        continue;
      }
      inter[name] = descriptor.value;
    }

    // Keep core references on inter so sandbox internals can avoid mutable jsl slots.
    inter.config = this.config;
    inter.lang = this.lang;
    inter.language = this.lang;
    inter.app_path = this.app_path;
    inter.packed = this.packed;

    const internal_module_names = this._getInternalModuleNames();
    for(const module_name of internal_module_names) {
      if(module_name === 'inter') {
        continue;
      }
      try {
        const module_ref = this[module_name];
        if(module_ref !== undefined && module_ref !== null &&
            (typeof module_ref === 'object' || typeof module_ref === 'function')) {
          if(raw_module_names.has(module_name)) {
            inter[module_name] = module_ref;
          } else {
            inter[module_name] = this._createInternalModuleView(module_ref);
          }
        } else if(module_ref !== undefined) {
          inter[module_name] = module_ref;
        }
      } catch {
        // Ignore inaccessible references.
      }
    }

    Object.freeze(inter);
    try {
      Object.defineProperty(this, 'inter', {
        value: inter,
        writable: false,
        configurable: false,
        enumerable: false
      });
    } catch {
      this.inter = inter;
    }

    this._lockInternalSlots([
      ...internal_module_names,
      'config',
      'lang',
      'language',
      'app_path',
      'packed',
      'context',
      'inter',
      'internal_jsl_identifier'
    ]);
  }

  /**
   * Returns JSL slot names that should be protected for internal use.
   * @returns {Array<string>}
   */
  _getInternalModuleNames() {
    const names = new Set(CORE_INTERNAL_MODULE_NAMES);

    if(this.config && this.config.SUBMODULES) {
      const builtin = Array.isArray(this.config.SUBMODULES.builtin)
        ? this.config.SUBMODULES.builtin
        : [];
      const lib = Array.isArray(this.config.SUBMODULES.lib)
        ? this.config.SUBMODULES.lib
        : [];
      for(const module_data of builtin.concat(lib)) {
        if(module_data && typeof module_data.name === 'string' && module_data.name.length) {
          names.add(module_data.name);
        }
      }
    }

    return [...names];
  }

  /**
   * Creates a proxy view that snapshots function members and binds them to original receivers.
   * Non-function members are forwarded, preserving mutable runtime state where needed.
   * @param {Object|Function} target - Internal target object.
   * @returns {Proxy}
   */
  _createInternalModuleView(target) {
    const proxy_cache = new WeakMap();

    const createView = (module_target) => {
      if(module_target === null ||
          (typeof module_target !== 'object' && typeof module_target !== 'function')) {
        return module_target;
      }

      if(proxy_cache.has(module_target)) {
        return proxy_cache.get(module_target);
      }

      // Some host/native objects expose non-configurable, non-writable
      // function-valued own properties. Wrapping them in a proxy can break
      // required invocation semantics ("Illegal invocation").
      // Keep such objects unwrapped.
      let own_descriptors;
      try {
        own_descriptors = Object.getOwnPropertyDescriptors(module_target);
      } catch {
        proxy_cache.set(module_target, module_target);
        return module_target;
      }
      for(const key of Reflect.ownKeys(own_descriptors)) {
        const descriptor = own_descriptors[key];
        if(!descriptor || descriptor.configurable !== false) {
          continue;
        }
        if(Object.prototype.hasOwnProperty.call(descriptor, 'value') &&
            descriptor.writable === false &&
            typeof descriptor.value === 'function') {
          proxy_cache.set(module_target, module_target);
          return module_target;
        }
      }

      const bound_methods = new Map();
      const snapshotFunctions = (source, receiver) => {
        if(!source) {
          return;
        }
        for(const key of Reflect.ownKeys(source)) {
          if(key === 'constructor' || bound_methods.has(key)) {
            continue;
          }
          let descriptor;
          try {
            descriptor = Object.getOwnPropertyDescriptor(source, key);
          } catch {
            continue;
          }
          if(descriptor && typeof descriptor.value === 'function') {
            bound_methods.set(key, descriptor.value.bind(receiver));
          }
        }
      };

      snapshotFunctions(module_target, module_target);
      let proto = Object.getPrototypeOf(module_target);
      while(proto && proto !== Object.prototype && proto !== Function.prototype) {
        snapshotFunctions(proto, module_target);
        proto = Object.getPrototypeOf(proto);
      }

      const module_view = new Proxy(module_target, {
        get(target_obj, prop) {
          // Respect proxy invariants for non-configurable own properties.
          // For non-writable data properties the exact value must be returned.
          // For accessor properties without getter, undefined must be returned.
          let own_descriptor;
          try {
            own_descriptor = Reflect.getOwnPropertyDescriptor(target_obj, prop);
          } catch {
            own_descriptor = undefined;
          }
          if(own_descriptor && own_descriptor.configurable === false) {
            if(Object.prototype.hasOwnProperty.call(own_descriptor, 'value') &&
                own_descriptor.writable === false) {
              return own_descriptor.value;
            }
            // Only accessor descriptors without a getter must resolve to undefined.
            // For writable data descriptors (e.g. window globals created via `var`),
            // continue with normal property access.
            if(!Object.prototype.hasOwnProperty.call(own_descriptor, 'value') &&
                typeof own_descriptor.get === 'undefined') {
              return undefined;
            }
          }

          if(bound_methods.has(prop)) {
            return bound_methods.get(prop);
          }
          let value;
          try {
            value = Reflect.get(target_obj, prop, target_obj);
          } catch {
            return undefined;
          }
          if(typeof value === 'function') {
            const bound_value = value.bind(target_obj);
            bound_methods.set(prop, bound_value);
            return bound_value;
          }
          if(value !== null && (typeof value === 'object' || typeof value === 'function')) {
            return createView(value);
          }
          return value;
        },
        set(target_obj, prop, value) {
          try {
            return Reflect.set(target_obj, prop, value, target_obj);
          } catch {
            return false;
          }
        },
        has(target_obj, prop) {
          return Reflect.has(target_obj, prop);
        },
        ownKeys(target_obj) {
          return Reflect.ownKeys(target_obj);
        },
        getOwnPropertyDescriptor(target_obj, prop) {
          return Reflect.getOwnPropertyDescriptor(target_obj, prop);
        },
        defineProperty(target_obj, prop, descriptor) {
          try {
            return Reflect.defineProperty(target_obj, prop, descriptor);
          } catch {
            return false;
          }
        },
        deleteProperty(target_obj, prop) {
          try {
            return Reflect.deleteProperty(target_obj, prop);
          } catch {
            return false;
          }
        },
        getPrototypeOf(target_obj) {
          return Reflect.getPrototypeOf(target_obj);
        }
      });

      proxy_cache.set(module_target, module_view);
      return module_view;
    };

    return createView(target);
  }

  /**
   * Prevents reassignment of selected internal slots on the JSL object.
   * @param {Array<string>} names - Slot names to lock.
   */
  _lockInternalSlots(names) {
    for(const name of names) {
      if(!Object.prototype.hasOwnProperty.call(this, name)) {
        continue;
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(this, name);
      } catch {
        continue;
      }
      if(!descriptor || descriptor.get || descriptor.set ||
          descriptor.writable === false && descriptor.configurable === false) {
        continue;
      }
      try {
        Object.defineProperty(this, name, {
          value: this[name],
          writable: false,
          configurable: false,
          enumerable: descriptor.enumerable
        });
      } catch {
        // Ignore slots that cannot be redefined in this environment.
      }
    }
  }
  
  /**
   * Invoked at the beginning of a code evaluation to set up necessary flags and state.
   */
  onEvaluating() {
    this.env.codeEvaluating();
    this.ignore_output = false;
    this.no_ans = false;
    this.stop_loop = false;
    this.no_stats = false;
    this.env.resetStopLoop();
    this.env.setStatus('busy', this.lang.string(88));
  }
  
  /**
   * Invoked after code evaluation to finalize the state and update the environment accordingly.
   */
  onEvaluated() {
    this.env.setWorkspace();
    this.env.codeEvaluated();
    this.env.setStatus('ready', this.lang.string(87));
  }

  /**
   * Triggers when there are changes in the stats, such as the number of promises or timeouts, and updates the environment state.
   */
  onStatsChange() {
    if(!this.no_stats) {
      this.env.setWorkspace();
      this.env.setStats({
        'required_modules': this.required_modules.length, 
        'promises': this.promises_number, 
        'timeouts': this.started_timeouts.length, 
        'immediates': this.started_immediates.length, 
        'intervals': this.started_intervals.length, 
        'animation_frames': this.started_animation_frames.length, 
        'idle_callbacks': this.started_idle_callbacks.length
      });
    }
  }
  
  /**
   * Clears the current workspace, stopping any ongoing operations and removing any dynamic properties.
   */
  clear() {
    this.doCleanup();
    this.context.sym.clear();
    this.context.parallel.terminate();
    this.system._clear();
    
    this.clearEventListeners();
    this.clearImmediates();
    this.clearAnimationFrames();
    this.clearIntervals();
    this.clearTimeouts();
    this.clearIdleCallbacks();
    this.stopPromises();
    this.stopSubprocesses();
    this.unrequireAll();
    this.onStatsChange();

    var obj = this;
    this.previous_properties.forEach(function(property) {
      if(typeof obj.context[property] != 'function' || (typeof obj.context[property] == 'function' && obj.context[property]._jsl_saved)) {
        delete obj.context[property];
      }
    });
    this.previous_properties = [];
    this.previous_workspace = {};
    this.no_ans = true;
    this.ignore_output = true;
  }
  
  /**
   * Sets the current path in the environment, adjusting how file paths are resolved.
   * @param {String} new_path The new path to set as the current working directory.
   */
  setPath(new_path) {
    this.current_path = this.env.addPathSep(new_path);
  }
  
  /**
   * Saves the properties of the current workspace to restore them later if needed.
   */
  savePreviousWorkspace() {
    var obj = this;
    this.previous_properties = this.getWorkspaceProperties();
    this.previous_properties.forEach(function(property) {
      if(typeof obj.context[property] == 'function') {
        obj.context[property]._jsl_saved = true;
      }
      obj.previous_workspace[property] = obj.context[property];
      delete obj.context[property];
    });
  }

  /**
   * Restores the properties of the workspace that were saved by `savePreviousWorkspace`.
   */
  loadPreviousWorkspace() {
    var obj = this;
    var workspace = this.getWorkspaceProperties();
    workspace.forEach(function(property) {
      if(obj.previous_properties.includes(property)) {
        // This property is defined again in new code
        obj.previous_properties.splice(
          obj.previous_properties.indexOf(property), 1);
      }
    });

    // Add saved properties back to global scope
    this.previous_properties.forEach(function(property) {
      obj.context[property] = obj.previous_workspace[property];
    });
  }
  
  /**
   * Retrieves a list of custom properties added to the global context since the initial load of the library.
   * @returns {Array} A list of property names that have been added to the global context.
   */
  getWorkspaceProperties() {
    var initial_props = this.initial_workspace;
    var current_prop_list = Object.getOwnPropertyNames(this.context);
    var workspace = [];

    for(var i = 0, l = current_prop_list.length; i < l; ++i) {
      var prop_name = current_prop_list[i];
      if(initial_props.indexOf(prop_name) === -1) {
        workspace.push(prop_name);
      }
    }
    return workspace;
  }

  /**
   * Constructs a detailed view of the current workspace, including the types and names of properties.
   * @returns {Array} An array of arrays, each containing the name, type, and constructor name (if applicable) of each property.
   */
  getWorkspace() {
    var initial_props = this.initial_workspace;
    var current_prop_list = Object.getOwnPropertyNames(this.context);
    var workspace = [];

    for(var i = 0, l = current_prop_list.length; i < l; ++i) {
      var prop_name = current_prop_list[i];
      if(initial_props && initial_props.indexOf(prop_name) === -1) {
        var prop = this.context[prop_name];
        var type = typeof prop;
        var name = 'none';

        if(type !== 'undefined') {
          if(prop && prop.constructor) {
            name = prop.constructor.name;
          } else {
            name = '/';
          }
        }
        workspace.push([prop_name, type, name]);
      }
    }

    return workspace;
  }
  
  /**
   * Generates the initialization script for the worker environment.
   * @returns {string} - The worker initialization script as a string.
   */
  getWorkerInit() {
    return `
      global.is_worker = true;
      global.debug = ${this.env.debug};
      global.version = '${this.env.version}';
      global.platform = '${this.env.platform}';
      
      const internal_app_path = ${JSON.stringify(this.app_path)};
      const internal_packed = ${JSON.stringify(this.packed)};
      
      const helper = require(internal_app_path + "/js/shared/helper.js");
      require(internal_app_path + "/js/shared/init-config.js");

      importScripts(internal_app_path + '/lib/luxon-3.4.4/luxon-3.4.4.min.js');
      importScripts(internal_app_path + '/lib/math-11.8.2/math-11.8.2.min.js');
      importScripts(internal_app_path + '/lib/sprintf-1.1.3/sprintf-1.1.3.min.js');
      importScripts(internal_app_path + '/lib/sympy-0.26.2/pyodide.js');

      const { PRDC_JSLAB_LIB } = require(internal_app_path + '/js/sandbox/jslab');

      // Global variables
      var jsl = new PRDC_JSLAB_LIB(internal_app_path, internal_packed);
      jsl.current_path = ${JSON.stringify(this.current_path)};
      jsl.includes_path = ${JSON.stringify(this.includes_path)};
      jsl.saved_paths = JSON.parse('${JSON.stringify(this.saved_paths)}');
    `;
  }
  
  /**
   * Resolves the absolute path for a file, searching through predefined directories and optionally using module context.
   * @param {string} file_path - The file path to resolve.
   * @param {object} [this_module] - Optional module context for resolution.
   * @returns {string|boolean} - The resolved path, or `false` if not found.
   */
  pathResolve(file_path, this_module) {
    var obj = this;
    if(typeof file_path == 'string') {
      if(!this.env.pathIsAbsolute(file_path)) {
        if(this_module) {
          var module_base_path;
          if(typeof this_module.path == 'string' && this_module.path.length) {
            module_base_path = this_module.path;
          } else if(typeof this_module.filename == 'string' &&
              this_module.filename.length) {
            module_base_path = this.env.pathDirName(this_module.filename);
          }
          if(typeof module_base_path == 'string' && module_base_path.length) {
            var module_path_temp = this.env.pathJoin(module_base_path, file_path);
            if(this.env.checkFile(module_path_temp)) {
              return module_path_temp;
            }
          }
        }
        
        var file_paths = [];
        var file_path_temp;
        if(typeof this.current_path == 'string' && this.current_path.length) {
          file_path_temp = this.env.pathJoin(this.current_path, file_path);
          if(this.env.checkFile(file_path_temp)) {
            file_paths.push(file_path_temp);
          }
        }
        if(typeof this.includes_path == 'string' && this.includes_path.length) {
          file_path_temp = this.env.pathJoin(this.includes_path, file_path);
          if(this.env.checkFile(file_path_temp)) {
            file_paths.push(file_path_temp);
          }
        }
        if(Array.isArray(this.saved_paths)) {
          this.saved_paths.forEach(function(saved_path) {
            if(typeof saved_path != 'string' || !saved_path.length) {
              return;
            }
            file_path_temp = obj.env.pathJoin(saved_path, file_path);
            if(obj.env.checkFile(file_path_temp)) {
              file_paths.push(file_path_temp);
            }
          });
        }
        if(file_paths.length > 2) {
          var N = file_paths.length;
          var str = '@pathResolve: '+this.lang.string(106)+' ' + file_paths[0] + ' '+this.lang.string(107)+': [\n';
          for(var i = 1; i < N-1; i++) {
            str += '  '+ file_paths[i] + ',\n';
          }
          str += '  ' + file_paths[N-1] + '\n]'; 
          this.env.disp(str); 
        } else if(file_paths.length > 1) {
          this.env.disp('@pathResolve: '+this.lang.string(106)+' ' + file_paths[0] + ' '+this.lang.string(108)+': [\n  ' + file_paths[1] + '\n]');
        } else if(file_paths.length == 0) {
          try {
            if(this_module) {
              return this.override._Module._resolveFilename(file_path, this_module, false);
            } else {
              return require.resolve(file_path);
            }
          } catch(err) {
            this._console.log(err);
            this.env.error('@pathResolve: '+this.lang.string(109)+' ' + file_path + ' '+this.lang.string(110)+'.');
            return false;
          }
        }
        file_path = file_paths[0];
      }
    } else {
      this.env.error('@pathResolve: '+this.lang.string(111)+'.');
      return false;
    }
    return file_path;
  }
  
  /**
   * Loads a WebAssembly module via the configured environment.
   * @param {string} module_path - Path to the `.wasm` module.
   * @param {Object} [import_object] - Optional import object to provide to the module.
   * @returns {WebAssembly.Instance|boolean}
   */
  requireWasm(module_path, import_object) {
    return this.env.requireWasm(module_path, import_object);
  }
  
  /**
   * Sets the flag to stop loop execution within the JSLAB environment.
   * @param {Boolean} data The flag indicating whether to stop loop execution.
   */
  setStopLoop(data) {
    this.stop_loop = data;
    this.onStopLoop(true);
    this.onEvaluated();
    this.env.disp(this.lang.string(90));
  }

  /**
   * Disables workspace stats tracking
   */
  disableWorkspaceStats() {
    this.no_stats = true;
  }
  
  /**
   * Enables workspace stats tracking
   */
  enableWorkspaceStats() {
    this.no_stats = false;
    this.onStatsChange();
  }
  
  /**
   * Handles the process of stopping loop execution and cleaning up asynchronous operations.
   * @param {Boolean} [throw_error=true] Indicates whether to throw an error when stopping the loop.
   * @throws {Object} An error object with a custom message if `throw_error` is true and the loop needs to be stopped.
   */
  onStopLoop(throw_error = true) {
    if(this.stop_loop) {
      this.context.parallel.terminate();
      this.system._clear();
      
      this.clearEventListeners();
      this.clearImmediates();
      this.clearAnimationFrames();
      this.clearIntervals();
      this.clearTimeouts();
      this.clearIdleCallbacks();
      this.stopPromises();
      this.stopSubprocesses();
      this.doCleanup();
      this.onStatsChange();
      if(throw_error) {
        throw {name: 'JslabError', message: this.lang.string(90)};
      }
    }
  }
  
  /**
   * Sets the paths saved in the environment for easier access to files and modules.
   * @param {Array} data An array of paths to be saved for future use.
   */
  setSavedPaths(data) {
    this.saved_paths = data;
  }
  
  /**
   * Registers a class definition and its source location for later restoration.
   * @param {string} class_name - The class name.
   * @param {Function} class_ref - The class constructor reference.
   * @param {string} [class_path=this.current_script] - Source script path.
   */
  registerClassDefinition(class_name, class_ref, class_path = this.current_script) {
    if(typeof class_name !== 'string' || !class_name.length) {
      return false;
    }
    if(typeof class_ref !== 'function') {
      return false;
    }
    
    // Keep class reachable from sandbox global scope.
    try {
      this.context[class_name] = class_ref;
    } catch {}
    
    var resolved_path = class_path;
    if(typeof resolved_path === 'string' && this.env.pathIsAbsolute(resolved_path)) {
      resolved_path = this.env.pathNormalize(resolved_path);
    }
    
    try {
      Object.defineProperty(class_ref, '__jslab_class_name', {
        value: class_name,
        configurable: true
      });
      Object.defineProperty(class_ref, '__jslab_class_path', {
        value: resolved_path,
        configurable: true
      });
    } catch {
      class_ref.__jslab_class_name = class_name;
      class_ref.__jslab_class_path = resolved_path;
    }
    
    this.class_registry[class_name] = {
      name: class_name,
      path: resolved_path,
      updated_at: Date.now()
    };
    return true;
  }
  
  /**
   * Gets the latest known source path for a class.
   * @param {string} class_name - The class name.
   * @returns {string|undefined} Latest known class path.
   */
  getClassDefinitionPath(class_name) {
    if(typeof class_name !== 'string' || !class_name.length) {
      return undefined;
    }
    
    if(this.class_registry.hasOwnProperty(class_name)) {
      return this.class_registry[class_name].path;
    }
    
    var ctor = this.context[class_name];
    if(typeof ctor === 'function' && typeof ctor.__jslab_class_path === 'string') {
      return ctor.__jslab_class_path;
    }
    return undefined;
  }
  
  /**
   * Placeholder function for features that have not been implemented.
   */
  notImplemented() {
    this.env.error(this.lang.string(115));
  }
  
  /**
   * Clears all modules that have been required during the session.
   */
  unrequireAll() {
    var obj = this;
    this.required_modules.forEach(function(module) {
      try {
        var name = require.resolve(module);
        if(name) {
          delete require.cache[name];    
        }
      } catch(err) {
        obj._console.log(err);
      }
    });
    this.required_modules = [];
    Object.keys(require.cache).forEach(function(key) { delete require.cache[key]; });
  }
  
  /**
   * Stops all promises that have been started within the environment.
   */
  stopPromises() {
    var obj = this;
    Object.keys(this.started_promises).forEach(function(key) {
      obj.started_promises[key].loop_stoped = true;
      delete obj.started_promises[key];
    });  
    this.promises_number = 0;
  }
  
  /**
   * Registers an object for cleanup with a specified cleanup function.
   * @param {Object} obj - The object to be registered for cleanup.
   * @param {Function} fun - The function to execute during cleanup.
   */
  addForCleanup(obj, fun) {
    this.cleanup_registry.push({obj: obj, fun: fun});
  }
  
  /**
   * Do cleanup on all registred objects;
   */
  doCleanup() {
    for(var entry of this.cleanup_registry) {
      if(this.inter.isFunction(entry.fun)) {
        try {
          entry.fun();
        } catch {};
      } else if(this.inter.isFunction(entry.obj._jslabCleanup)) {
        try {
          entry.obj._jslabCleanup();
        } catch {};
      }
    }
    this.cleanup_registry = [];
  }
  
  /**
   * Removes a specific promise from the tracking list based on its ID.
   * @param {Number} id The ID of the promise to remove.
   */
  clearPromise(id) {
   this.promises_number -= 1;
   if(this.promises_number < 0) {
     this.promises_number = 0;
   }
   this.onStatsChange();
   delete this.started_promises[id];
  }
          
  /**
   * Clears all timeouts that have been set within the environment.
   */
  clearTimeouts() {
    var obj = this;
    this.started_timeouts.forEach(function(timeout) {
      obj._clearTimeout(timeout);
    });
    this.started_timeouts = [];
  }

  /**
   * Clears all intervals that have been set within the environment.
   */
  clearIntervals() {
    var obj = this;
    this.started_intervals.forEach(function(interval) {
      obj._clearInterval(interval);
    });
    this.started_intervals = [];
  }
  
  /**
   * Cancels all animation frames that have been requested within the environment.
   */
  clearAnimationFrames() {
    var obj = this;
    this.started_animation_frames.forEach(function(animation_frames) {
      obj._cancelAnimationFrame(animation_frames);
    });
    this.started_animation_frames = [];
  }

  /**
   * Cancels all idle callbacks that have been requested within the environment.
   */
  clearIdleCallbacks() {
    var obj = this;
    this.started_idle_callbacks.forEach(function(idle_callback) {
      obj._cancelIdleCallback(idle_callback);
    });
    this.started_idle_callbacks = [];
  }

  /**
   * Clears all immediate executions that have been set within the environment.
   */
  clearImmediates() {
    var obj = this;
    this.started_immediates.forEach(function(immediate) {
      obj._clearImmediate(immediate);
    });
    this.started_immediates = [];
  }

  /**
   * Removes all event listeners that have been added to the document body, effectively clearing any remaining event bindings.
   */
  clearEventListeners() {
    document.body.parentNode.replaceChild(document.body.cloneNode(true), document.body);
  }

  /**
   * Lists all subprocesses.
   */
  stopSubprocesses() {
    var pids = this.listSubprocesses();
    pids.forEach((pid) => {
      this.inter.killProcess(pid);
    });
  }
  
  /**
   * Sets the safe stringify depth for the given data.
   * @param {Object} data - The data object to modify.
   * @param {number} depth - The depth level for safe stringification.
   * @returns {Object} The modified data object with the set depth.
   */
  setDepthSafeStringify(data, depth) {
    data._safeStringifyDepth = depth;
    return data;
  }

  /**
   * Lists all subprocesses.
   */
  listSubprocesses() {
    return this.env.native_module.listSubprocesses(this.env.process_pid);
  }
  
  /**
   * Gets properties missing documentation.
   * @param {Array|string} [workspace=this.initial_workspace] - Workspace to check.
   * @param {boolean} [without_builtin=true] - Exclude built-in properties.
   * @returns {Array<string>} Missing property names.
   */
  _getMissingDocs(workspace = this.initial_workspace, without_builtin = true) {
    var missing = [];
    for(var prop of workspace) {
      if(!prop.startsWith('_') && 
          (!without_builtin || 
           !this.builtin_workspace.includes(prop))) {
        try {
          this.inter.help(prop);
        } catch {
          missing.push(prop);
        }
      }
    }
    return missing;
  }
  
  /**
   * Writes templates for missing docs to a file.
   * @param {string} path - File path for missing docs.
   * @param {Array|string} [workspace=this.initial_workspace] - Workspace to check.
   */
  _writeMissingDocsToFile(path, workspace = this.initial_workspace) {
    var workspace_array = workspace;
    if(!Array.isArray(workspace)) {
      workspace_array = Object.keys(workspace);
    }
     
    var missing = this._getMissingDocs(workspace_array);
    var str = '';
    for(var prop of missing) {
      var kind = 'function member';
      if(!Array.isArray(workspace)) {
        kind = typeof workspace[prop] === 'function' ? 'function' : 'member';
      }
      str += `
  /**
   * Description
   * @name ${prop}
   * @kind ${kind}
   * @param {}
   * @returns {}
   * @memberof PRDC_JSLAB_LIB_
   */
   
`;
    }
    this.env.writeFileSync(path, str);
  }
  
  /**
   * Awaits the provided promise if the loop has not been stopped.
   * @param {Promise} p - The promise to await.
   * @returns {Promise|undefined} - Resolves if `p` is awaited; does nothing if the loop is stopped.
   */
  async promiseOrStoped(p) {
    if(!p.loop_stoped) {
      await p;
    }
  }
}

exports.PRDC_JSLAB_LIB = PRDC_JSLAB_LIB;
