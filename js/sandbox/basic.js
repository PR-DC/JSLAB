/**
 * @file JSLAB library basic submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB basic submodule.
 */
class PRDC_JSLAB_LIB_BASIC {
  
  /**
   * Initializes a new instance of the PRDC_JSLAB_LIB_BASIC class.
   * @param {Object} jsl The JSLAB application instance this submodule is part of.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;

    this._docs = JSON.parse(this.jsl.env.readFileSync(app_path + '/documentation.json', 'utf8'));
    
    /**
     * Stores the result of the last evaluated expression.
     * @type {any}
     */
    this.ans;
    
    /**
     * Clears all defined variables in the current context.
     * @name clear
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'clear', { configurable: true, get: this._clear });

    /**
     * Clears the console screen.
     * @name clc
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'clc', { configurable: true, get: this._clc });

    /**
     * Clears the console screen. Alias for `clc`.
     * @name cls
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'cls', { configurable: true, get: this._clc });

    /**
     * Returns the current version of the JSLAB.
     * @name version
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'version', { configurable: true, get: this._version });

    /**
     * Returns the platform on which JSLAB is running.
     * @name platform
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'platform', { configurable: true, get: this._platform });

    /**
     * Returns the file name of the current JSLAB script.
     * @name jsl_file_name
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'jsl_file_name', { configurable: true, get: this.jslFileName });

    /**
     * Provides information about the current environment.
     * @name info
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'info', { configurable: true, get: this._info });

    /**
     * Accesses or modifies the user settings for JSLAB.
     * @name settings
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'settings', { configurable: true, get: this._settings });

    /**
     * Provides help information for JSLAB commands.
     * @name cmd_help
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'cmd_help', { configurable: true, get: this._cmd_help });

    /**
     * Accesses the code editor interface within JSLAB.
     * @name editor
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'editor', { configurable: true, get: this._editor });

    /**
     * Returns the current working directory.
     * @name pwd
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'pwd', { configurable: true, get: this._pwd });

    /**
     * Sets a breakpoint in the code for debugging.
     * @name breakpoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'breakpoint', { configurable: true, get: this._breakpoint });

    /**
     * Returns the current debug flag status.
     * @name debug_flag
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'debug_flag', { configurable: true, get: this._debug_flag });

    /**
     * Enables or disables debug mode.
     * @name debug
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'debug', { configurable: true, get: this._debug });

    /**
     * Pauses the execution of the current script.
     * @name pause
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'pause', { configurable: true, get: this._pause });

    /**
     * Sets a stop point in the script execution.
     * @name stoppoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'stoppoint', { configurable: true, get: this._stoppoint });

    /**
     * Sets a log point to record information during execution.
     * @name logpoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'logpoint', { configurable: true, get: this._logpoint });

    /**
     * Updates specific points in the script during execution.
     * @name updatepoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'updatepoint', { configurable: true, get: this._updatepoint });

    /**
     * Checks if the execution should stop based on conditions.
     * @name checkStop
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'checkStop', { configurable: true, get: this._checkStop });

    /**
     * Marks the endpoint of a script or process.
     * @name endPoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'endPoint', { configurable: true, get: this._endPoint });
  }

  /**
   * Runs a script from a specified path, optionally focusing on specific lines and controlling output visibility.
   * @param {string} script_path The path to the script to run.
   * @param {Array<number>} lines An array of line numbers to run or focus on within the script.
   * @param {boolean} [silent=false] Whether to suppress output from the script execution.
   * @param {Boolean} [force_run=false] If true, forces the script to run even if stop conditions are met.
   */
  async run(script_path, lines, silent = false, force_run = false) {
    if(this.jsl.env.isAbsolutePath(script_path)) {
      this.jsl.last_script_path = script_path;
      this.jsl.last_script_lines = lines;
      this.jsl.last_script_silent = silent;
      if(!force_run && this.jsl.env.checkScriptDir(script_path)) {
        return;
      }
    }
    await this.jsl.eval.runScript(script_path, lines, silent, force_run);
  }
  
  /**
   * Retrieves documentation in JSON format based on the provided name and type.
   * @param {string} [name] - The name of the documentation item.
   * @param {string} [type] - The type of the documentation (e.g., 'category').
   * @returns {string|undefined} The JSON string of the documentation or undefined if not found.
   */
  helpToJSON(name, type) {
    if(!name) {
      return this.jsl.setDepthSafeStringify(this._docs, 4);
    }
    
    const parts = name.split(".");
    if(parts.length === 2) {
      const [libName, itemName] = parts;
      const data = this._docs.lib[libName];
      if(data.hasOwnProperty(itemName)) {
        const result = data[itemName];
        if(result) {
          result.type = 'lib';
          result.lib = libName;
          return this.jsl.setDepthSafeStringify(result, Infinity);
        }
      }
    } else {
      if(type == 'category') {
        for(const category in this._docs) {
          const categoryData = this._docs[category];
          if(categoryData.hasOwnProperty(name)) {
            return this.jsl.setDepthSafeStringify(categoryData[name], 4);
          }
        }
      } else {
        for(const category in this._docs.global) {
          const categoryData = this._docs.global[category];
          if(categoryData.hasOwnProperty(name)) {
            const result = categoryData[name];
            if(result) {
              result.type = 'global';
              result.category = category;
              return this.jsl.setDepthSafeStringify(result, Infinity);
            }
          }
        }
      }
    }
    this.jsl.env.error('@help: ' + language.string(218) + name);
  }
  
  /**
   * Retrieves documentation based on the provided name and type.
   * @param {string} name - The name of the documentation item.
   * @param {string} type - The type of the documentation.
   * @returns {string|undefined} The JSON string of the documentation or undefined if not found.
   */
  help(name, type) {
    return helpToJSON(name, type);
  }

  /**
   * Retrieves the file name of the currently active JSL script.
   * @returns {string} The file name of the JSL script.
   */
  jslFileName() {
    return this.jsl.jsl_file_name;
  }

  /**
   * Clears the application's local storage.
   */
  clearStorage() {
    return this.jsl.env.clearStorage();
  }

  /**
   * Saves a path to the application's list of saved paths.
   * @param {string} new_path The path to save.
   */
  savePath(new_path) {
    new_path = this.jsl.env.addPathSep(new_path);
    var i = this.jsl.saved_paths.indexOf(new_path);
    if(i < 0) {
      this.jsl.saved_paths.push(new_path);
    }
    this.jsl.env.savePath(new_path);
  }

  /**
   * Removes a previously saved path from the application's list of saved paths.
   * @param {string} saved_path The path to remove.
   */
  removePath(saved_path) {
    saved_path = this.jsl.env.addPathSep(saved_path);
    var i = this.jsl.saved_paths.indexOf(saved_path);
    if(i >= 0) {
      this.jsl.saved_paths.splice(i, 1);
    }
    this.jsl.env.removePath(saved_path);
  }

  /**
   * Opens the help documentation for CMD window.
   */
  _cmd_help() {
    this.jsl.env.cmd_help();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Displays application info.
   */
  _info() {
    this.jsl.env.info();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Opens the settings menu.
   */
  _settings() {
    this.jsl.env.settings();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Retrieves the current working directory.
   * @returns {string} The current working directory.
   */
  _pwd() {
    return this.jsl.current_path;
  }

  /**
   * Changes the current working directory to the specified path.
   * @param {string} new_path The new path to set as the current working directory.
   */
  cd(new_path) {
    this.jsl.setPath(new_path);
    this.jsl.env.cd(new_path);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Lists the contents of the current directory.
   * @returns {Array<string>} An array of filenames in the current directory.
   */
  _ls() {
    return this.jsl.env.listFolderContents();
  }

  /**
   * Retrieves the application version.
   * @returns {string} The application version.
   */
  _version() {
    return this.jsl.env.version;
  }
  
  /**
   * Retrieves the operating system platform.
   * @returns {string} The OS platform.
   */
  _platform() {
    return this.jsl.env.platform;
  }
  
  /**
   * Retrieves if the JSLAB application is currently in debug mode.
   * @returns {boolean} True if the application is in debug mode; otherwise, false.
   */
  _debug_flag() {
    return this.jsl.env.debug;
  }
  
  /**
   * Retrieves the current workspace.
   * @returns {Object} The current workspace object.
   */
  workspace() {
    return this.jsl.getWorkspace();
  }

  /**
   * Updates the workspace display based on the current state.
   */
  updateWorkspace() {
    this.jsl.env.updateWorkspace();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Updates the file browser display based on the current state.
   */
  updateFileBrowser() {
    this.jsl.env.updateFileBrowser();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Clears the workspace.
   */
  _clear() {
    this.jsl.clear();
  }

  /**
   * Clears the command window.
   */
  _clc() {
    this.jsl.env.clc();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Displays an error message.
   * @param {string} msg The error message to display.
   */
  error(msg) {
    this.jsl.env.error(msg);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Displays a general message.
   * @param {string} msg The message to display.
   */
  disp(msg) {
    this.jsl.env.disp(msg);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return msg+"\n";
  }
  
  /**
   * Displays a warning message.
   * @param {string} msg The warning message to display.
   */
  warn(msg) {
    this.jsl.env.warn(msg);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Opens a specified file in the editor or just opens the editor if no file is specified.
   * @param {string} [filepath] The path to the file to open in the editor.
   */
  _editor(filepath) {
    this.jsl.env.editor(filepath);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Logs a point in the script for debugging purposes.
   */
  _logpoint() {
    this.jsl.env.setWorkspace();
    this.checkStopLoop();
    this.jsl.onStopLoop();
  }

  /**
   * Updates the workspace or environment at a specific point during script execution.
   */
  _updatepoint() {
    this._logpoint();
  } 

  /**
   * Checks whether script execution should be stopped at the current point.
   */
  _checkStop() {
    this._logpoint();
  }
  
  /**
   * Introduces a breakpoint in the script, pausing execution and potentially allowing the user to continue based on their input.
   */
  _breakpoint() {
    this._logpoint();
    
    var [line, column, script] = this.jsl.eval.getExpressionPosition();
    var ret = this.jsl.env.showMessageBox({title: language.currentString(15), message: language.currentString(216)+': '+line+', '+language.currentString(113)+': '+column+' ('+script+'). '+language.currentString(213), buttons: [language.currentString(214), language.currentString(215)], cancelId: 0});
    if(ret == 1) {
      this.jsl.stop_loop = true;
      this.jsl.onStopLoop();
    }
  }
  
  /**
   * Introduces a breakpoint in the script, pausing execution and potentially allowing the user to continue based on their input.
   */
  _debug() {
    this._breakpoint();
  }

  /**
   * Pauses script execution, providing an opportunity to inspect the current state or continue execution based on user input.
   */
  _pause() {
    this._logpoint();
    
    var [line, column, script] = this.jsl.eval.getExpressionPosition();
    var ret = this.jsl.env.showMessageBox({title: language.currentString(15), message: language.currentString(217)+': '+line+', '+language.currentString(113)+': '+column+' ('+script+'). '+language.currentString(213), buttons: [language.currentString(214), language.currentString(215)], cancelId: 0});
    
    if(ret == 1) {
      this.jsl.stop_loop = true;
      this.jsl.onStopLoop();
    }
  }
  
  /**
   * Forces the script execution to stop at a designated point.
   */
  _stoppoint() {
    this.jsl.stop_loop = true;
    this.jsl.onStopLoop();
  }
  
  /**
   * Marks an endpoint in the script, throwing an error to signify a critical stop or exit point in execution.
   */
  _endPoint() {
    var [line, column, script] = this.jsl.eval.getExpressionPosition();
    throw {name: 'JslabError', message: language.string(116)+': '+line+', '+language.string(113)+': '+column+' ('+script+').'};
  }
  
  /**
   * Verifies if a loop within the script execution should be terminated, typically used to avoid infinite or lengthy unnecessary execution.
   */
  checkStopLoop() {
    if(!this.jsl.stop_loop) {
      this.jsl.stop_loop = this.jsl.env.checkStopLoop()
    }
    return this.jsl.stop_loop;
  }
  
  /**
   * Opens a specified file in an editor or opens the editor to a default or previously specified file.
   * @param {string} [filepath] - Path to the file to be opened in the editor.
   */
  edit(filepath) {
    _editor(filepath);
  }

  /**
   * Returns a list of all example scripts available within a predefined directory.
   * @return {Array<string>} An array of paths to the example scripts.
   */
  getExamples() {
    var obj = this;
    return this.jsl.env.readdirSync(app_path +'\\examples')
        .filter(function(file) { return file.match(new RegExp('\.jsl$')); }).map(function(i) { return app_path + '\\examples\\' + i; });
  }

  /**
   * Opens a specified example script in the editor window.
   * @param {string} filename - Name of the example file to open.
   */
  openExample(filename) {
    if(!this.jsl.env.isAbsolutePath(filename)) {
      filename = app_path + '\\examples\\' + filename;
    }
    this.edit(filename);
  }

  /**
   * Displays a synchronous message box to the user and waits for their response.
   * @param {Object} options - Configuration options for the message box.
   * @return {number} The index of the button clicked by the user.
   */
  showMessageBox(options) {
    return this.jsl.env.showMessageBox(options);
  }

  /**
   * Saves specified variables to a JSON file.
   * @param {string} file_path - Path where the JSON file will be saved.
   * @param {...string} args - Variables to save. If 'all' is specified, saves all available variables.
   */
  save(file_path, ...args) {
    var obj = this;
    var vars = {};
    if(args.length == 0 || (args.length == 1 && args[0] == 'all')) {
      var properties = this.jsl.getWorkspaceProperties();
      properties.forEach(function(property) {
        vars[property] = obj.jsl.context[property];
      });
    } else {
      args.forEach(function(property) {
        if(obj.jsl.context.hasOwnProperty(property)) {
          vars[property] = obj.jsl.context[property];
        }
      });
    }
    if(!this.jsl.env.isAbsolutePath(file_path)) {
      file_path = this.jsl.env.joinPath(this.jsl.current_path, file_path);
    }
    var flag = this.jsl.env.writeFileSync(file_path, JSON.stringify(vars));
    if(flag === false) {
      this.jsl.env.error('@save: '+language.string(117)+': ' + file_path);
    }
  }

  /**
   * Loads variables from a specified JSON file into the specified scope or the default script context.
   * If an error occurs during file reading or parsing, it logs an error message.
   * @param {...*} args - A single filename or a scope and filename to specify where to load the variables.
   */
  load(...args) {
    var obj = this;
    var scope = obj.jsl.context;
    var file_path;
    if(args.length > 1) {
      scope = args[0];
      file_path = args[1];
    } else {
      file_path = args[0];
    }
    
    file_path = this.jsl.pathResolve(file_path);
    if(file_path) {
      try {
        var vars = JSON.parse(readFile(file_path));
        Object.keys(vars).forEach(function(property) {
          scope[property] = vars[property];
        });
      } catch(e) {
        this.jsl.env.error('@load: '+language.string(118)+'.');
      }
    }
  }

  /**
   * Executes a system shell command.
   * @param {...*} arg - The command and its arguments to be executed.
   * @return {string} The output of the executed command.
   */
  system(...arg) {
    try {
      return this.jsl.env.execSync(...arg).toString();
    } catch(err) {
      return err.message + ', command output: \n' + err.stdout.toString();
    }
  }

  /**
   * Retrieves completion suggestions based on the current context and input.
   * @param {Array} data - Data containing the start of the string to complete, context, and keywords.
   * @return {Array<string>} An array of completion suggestions.
   */
  getCompletions(data) {
    var start = data[0];
    var context = data[1];
    var keywords = data[2];  
    var found = [], global = window;
    
    function maybeAdd(str) {
      if(str.lastIndexOf(start, 0) == 0 && !arrayContains(found, str)) found.push(str);
    }
    function gatherCompletions(obj) {
      if(typeof obj == "string") forEach(("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
                     "toUpperCase toLowerCase split concat match replace search").split(" "), maybeAdd);
      else if(obj instanceof Array) forEach(("length concat join splice push pop shift unshift slice reverse sort indexOf " +
                    "lastIndexOf every some filter forEach map reduce reduceRight ").split(" "), maybeAdd);
      else if(obj instanceof Function) forEach("prototype apply call bind".split(" "), maybeAdd);
      if(!Object.getOwnPropertyNames || !Object.getPrototypeOf) {
        for(var name in obj) maybeAdd(name);
      } else {
        for(var o = obj; o; o = Object.getPrototypeOf(o))
          Object.getOwnPropertyNames(o).forEach(maybeAdd);
      }
    }

    if(context && context.length) {
      context = JSON.parse(context);
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;
      if(obj.type && obj.type.indexOf("variable") === 0) {
        base = base || global[obj.string];
      } else if(obj.type == "string") {
        base = "";
      } else if(obj.type == "atom") {
        base = 1;
      } else if(obj.type == "function") {
        if(global.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
            (typeof global.jQuery == 'function')) {
            base = global.jQuery();
          } else if(global._ != null && (obj.string == '_') && (typeof global._ == 'function')) {
            base = global._();
          }
      }
      while(base != null && context.length)
        base = base[context.pop().string]; // switch base to variable
      if(base != null) gatherCompletions(base);
    } else {
       gatherCompletions(global);
      forEach(keywords, maybeAdd);
    }
    if(found.length) {
      found.sort(function(a, b) {
        return a.length - b.length || a.localeCompare(b);
      });
    }
    return found;
  }    

  /**
   * Retrieves an object by matching a specific property value.
   * @param {Object} obj - The object to search through.
   * @param {string} prop - The property name to match.
   * @param {*} val - The value to match against the property.
   * @returns {Object|null} The found object with key and value, or null if not found.
   */
  getObjectByProp(obj, prop, val) {
    const key = Object.keys(obj).find(function(key) { return obj[key][prop] === val; });
    return key ? { key, value: obj[key] } : null;
  }

  /**
   * Retrieves multiple objects from a parent object by matching a specific property value.
   * @param {Object} obj - The parent object to search through.
   * @param {string} prop - The property name to match.
   * @param {*} val - The value to match against the property.
   * @returns {Object} An object containing all matched key-value pairs.
   */
  getObjectsByProp(obj, prop, val) {
    return Object.fromEntries(Object.entries(obj)
      .filter(function([key, value]) { return value[prop] === val; }));
  }

  /**
   * Compares two strings lexicographically.
   * @param {string} x - The first string.
   * @param {string} y - The second string.
   * @return {number} The result of the comparison.
   */
  strcmp(x, y) {
    return this.jsl.env.math.compareText(x, y);
  }

  /**
   * Unloads a previously required module from the cache.
   * @param {string} module - The module to unrequire.
   */
  unrequire(module) {
    module = this.jsl.pathResolve(module);
    if(this.jsl.required_modules.includes(module)) {
      var name = require.resolve(module);
      if(name) {
        delete require.cache[name];    
      }
      this.jsl.array.removeElementByValue(this.jsl.required_modules, module);
    }
  }
  
  /**
   * Resets the sandbox environment to its initial state.
   */
  resetSandbox() {
    this.jsl.env.resetSandbox();
  }
  
  /**
   * Compiles a N-API module located at the specified path.
   * @param {string} path - The path to the N-API module.
   * @param {boolean} [show_output=true] - Whether to show output in the command window.
   * @return {Array} An array containing the result of the compilation and targets.
   */
  compileNapi(path, show_output = false) {
    var result = false;
    var obj = this;
    if(typeof path == 'string') {
      path = this.jsl.pathResolve(path);
    }
    if(!path) {
      var options = {
        title: language.currentString(141),
        buttonLabel: language.currentString(142),
        properties: ['openDirectory'],
      }
      path = this.jsl.env.showOpenDialogSync(options);
      if(path === undefined) {
        this.jsl.env.error('@compileNapi: '+language.string(119)+'.');
        return false;
      } else {
        path = path[0];
      }
    }
    var path = this.jsl.env.addPathSep(path);
 
    if(this.jsl.env.rmSync(path+'build/Release/', false) === false) {
      this.jsl.env.error('@compileNapi: '+language.string(171));
    }
    
    var binding_file_path = path + 'binding.gyp';
    if(this.jsl.env.checkFile(binding_file_path)) {
      var targets = [];
      try {
        var binding_file_data = JSON.parse(this.jsl.env.readFileSync(binding_file_path).toString());
      } catch(e) {
        this.jsl.env.error('@compileNapi: '+language.string(120)+'.');
        return false;
      }
      binding_file_data.targets.forEach(function(target) {
        targets.push(path + 'build/Release/' + target.target_name + '.node');
      });
      if(targets.length > 0) {
        var node_gyp_path = this.jsl.env.joinPath(app_path, 'node_modules', '.bin', 'node-gyp');
        var npm_path = this.jsl.env.joinPath(app_path, 'node_modules', '.bin', 'npm');
        var msg = this.system(npm_path + ' cache clean --force & ' +npm_path + ' install & ' + node_gyp_path + ' rebuild --target='+process.version+' 2>&1', 
          {cwd: path, shell: true});

        if(msg.endsWith('gyp info ok \n')) {
          if(show_output) {
            this.jsl.env.disp(msg);
          }
          result = true;
        } else if(!msg.endsWith('gyp ERR! not ok \n')) {
          this.jsl.env.error('@compileNapi: '+language.string(121)+'.');
        } else {
          this.jsl.env.disp(msg);
          this.jsl.env.error('@compileNapi: '+language.string(170)+'.');
        }

        if(result) {
          return [result, targets];
        } else {
          return [result, undefined];
        }
      } else {
        this.jsl.env.error('@compileNapi: '+language.string(122)+'.');
        return [result, undefined];
      }
    } else {
      this.jsl.env.error('@compileNapi: '+language.string(123)+'.');
      return [result, undefined];
    }
  }
}

exports.PRDC_JSLAB_LIB_BASIC = PRDC_JSLAB_LIB_BASIC;