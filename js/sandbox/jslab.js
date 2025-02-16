/**
 * @file JSLAB library
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_EVAL } = require('./jslab-eval');
const { PRDC_JSLAB_OVERRIDE } = require('./jslab-override');
const { PRDC_JSLAB_ENV } = require('./jslab-env-electron');

/**
 * Class for JSLAB library.
 */
class PRDC_JSLAB_LIB {
  
  /**
   * Constructs the JSLAB library environment, initializing submodules and setting up the execution context.
   * @param {Object} config Configuration options for the JSLAB library.
   */
  constructor(config) {
    var obj = this;
    this.ready = false;
    this.config = config;
    
    // Library built in properties
    this.previous_workspace = {};
    this.previous_properties = [];
    
    this.stop_loop = false;
    this.last_script_path;
    this.last_script_lines;
    this.last_script_silent;
    
    this.current_script;
    
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
    this.setDepthSafeStringify(this.context, 1);
    this.context._ = Symbol('_');
    this.eval = new PRDC_JSLAB_EVAL(this);
    
    this.debug = this.env.debug;
    this.includes_path = this.env.getDefaultPath('includes');
    
    if(this.config.PLOTER == 'plotly') {
      var { PRDC_JSLAB_PLOTER } = require('./jslab-ploter-plotly');
    } else if(this.config.PLOTER == 'echarts') {
      var { PRDC_JSLAB_PLOTER } = require('./jslab-ploter-echarts');
    }
    this.ploter = new PRDC_JSLAB_PLOTER(this);
    
    this.override = new PRDC_JSLAB_OVERRIDE(this);
    
    this.ready = true;
  }
  
  /**
   * Invoked at the beginning of a code evaluation to set up necessary flags and state.
   */
  onEvaluating() {
    this.env.codeEvaluating();
    this.ignore_output = false;
    this.no_ans = false;
    this.stop_loop = false;
    this.env.resetStopLoop();
    this.env.setStatus('busy', language.string(88));
  }
  
  /**
   * Invoked after code evaluation to finalize the state and update the environment accordingly.
   */
  onEvaluated() {
    this.env.setWorkspace();
    this.env.codeEvaluated();
    this.env.setStatus('ready', language.string(87));
  }

  /**
   * Triggers when there are changes in the stats, such as the number of promises or timeouts, and updates the environment state.
   */
  onStatsChange() {
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
  
  /**
   * Clears the current workspace, stopping any ongoing operations and removing any dynamic properties.
   */
  clear() {
    this.doCleanup();
    this.context.sym.clear();
    this.context.parallel.terminate();

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
      global.app_path = ${JSON.stringify(app_path)};
      global.is_worker = true;
      global.debug = ${this.env.debug};
      global.version = '${this.env.version}';
      global.platform = '${this.env.platform}';
      
      
      const helper = require(app_path + "/js/helper.js");
      const { PRDC_APP_CONFIG } = require(app_path + '/config/config');

      importScripts(app_path + '/lib/luxon-3.4.4/luxon-3.4.4.min.js');
      importScripts(app_path + '/lib/math-11.8.2/math-11.8.2.min.js');
      importScripts(app_path + '/lib/sprintf-1.1.3/sprintf-1.1.3.min.js');
      importScripts(app_path + '/lib/sympy-0.26.2/pyodide.js');

      const { PRDC_JSLAB_LIB } = require(app_path + '/js/sandbox/jslab');

      // Global variables
      var config = new PRDC_APP_CONFIG();
      var jsl = new PRDC_JSLAB_LIB(config);
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
          var file_path_temp = this.env.pathJoin(this_module.path, file_path);
          if(this.env.checkFile(file_path_temp)) {
            return file_path_temp;
          }
        }
        
        var file_paths = [];
        var file_path_temp = this.env.pathJoin(this.current_path, file_path);
        if(this.env.checkFile(file_path_temp)) {
          file_paths.push(file_path_temp);
        }
        file_path_temp = this.env.pathJoin(this.includes_path, file_path);
        if(this.env.checkFile(file_path_temp)) {
          file_paths.push(file_path_temp);
        }
        this.saved_paths.forEach(function(saved_path) {
          file_path_temp = obj.env.pathJoin(saved_path, file_path);
          if(obj.env.checkFile(file_path_temp)) {
            file_paths.push(file_path_temp);
          }
        });
        if(file_paths.length > 2) {
          var N = file_paths.length;
          var str = '@pathResolve: '+language.string(106)+' ' + file_paths[0] + ' '+language.string(107)+': [\n';
          for(var i = 1; i < N-1; i++) {
            str += '  '+ file_paths[i] + ',\n';
          }
          str += '  ' + file_paths[N-1] + '\n]'; 
          this.env.disp(str); 
        } else if(file_paths.length > 1) {
          this.env.disp('@pathResolve: '+language.string(106)+' ' + file_paths[0] + ' '+language.string(108)+': [\n  ' + file_paths[1] + '\n]');
        } else if(file_paths.length == 0) {
          try {
            if(this_module) {
              return this.override._Module._resolveFilename(file_path, this_module, false);
            } else {
              return require.resolve(file_path);
            }
          } catch(err) {
            this._console.log(err);
            this.env.error('@pathResolve: '+language.string(109)+' ' + file_path + ' '+language.string(110)+'.');
            return false;
          }
        }
        file_path = file_paths[0];
      }
    } else {
      this.env.error('@pathResolve: '+language.string(111)+'.');
      return false;
    }
    return file_path;
  }
  
  /**
   * Sets the flag to stop loop execution within the JSLAB environment.
   * @param {Boolean} data The flag indicating whether to stop loop execution.
   */
  setStopLoop(data) {
    this.stop_loop = data;
    this.onStopLoop(false);
    this.onEvaluated();
    this.env.disp(language.string(90));
  }
  
  /**
   * Handles the process of stopping loop execution and cleaning up asynchronous operations.
   * @param {Boolean} [throw_error=true] Indicates whether to throw an error when stopping the loop.
   * @throws {Object} An error object with a custom message if `throw_error` is true and the loop needs to be stopped.
   */
  onStopLoop(throw_error = true) {
    if(this.stop_loop) {
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
        throw {name: 'JslabError', message: language.string(90)};
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
   * Placeholder function for features that have not been implemented.
   */
  notImplemented() {
    obj.env.error(language.string(115));
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
      if(isFunction(entry.fun)) {
        try {
          entry.fun();
        } catch {};
      } else if(isFunction(entry.obj._jslabCleanup)) {
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
    pids.forEach(function(pid) {
      killProcess(pid);
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
    var output = this.env.execSync(`wmic process where (ParentProcessId=${this.env.process_pid}) get ProcessId,CommandLine`).toString();
    var pids = output.match(/(?<=\s)\d+(?=\s*$)/gm);
    pids.pop();
    return pids.map((pid) => Number(pid));
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
          help(prop);
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