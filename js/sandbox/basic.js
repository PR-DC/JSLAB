/**
 * @file JSLAB library basic submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WORKSPACE_SERIALIZER } = require('./jslab-workspace-serializer');
 
/**
 * Class for JSLAB basic submodule.
 */
class PRDC_JSLAB_LIB_BASIC {

  /** Sets a conditional source breakpoint or enables an error breakpoint.
   * @param {string} path Script path, 'error', or 'caught error'.
   * @param {number} [line] One-based line.
   * @param {string} [condition=''] Condition evaluated in the paused scope.
   * @param {boolean} [enabled=true] Breakpoint enabled state.
   * @returns {Promise<Object>|Object} Updated debugger configuration.
   */
  dbstop(path, line = 1, condition = '', enabled = true) {
    if(path === 'error' || path === 'caught error') return this.jsl.inter.env.debugCommand('set_exception_pause', { state: path === 'error' ? 'uncaught' : 'all' });
    if(typeof path !== 'string' || !Number.isInteger(line) || line < 1 || typeof condition !== 'string' || typeof enabled !== 'boolean') throw Error('Invalid breakpoint arguments.');
    return this.jsl.inter.env.debugCommand('set_breakpoint', { path: this.jsl.pathResolve(path) || path, line, condition, enabled });
  }

  /** Clears one breakpoint or all line/error breakpoints.
   * @param {string} [path='all'] Script path or 'all'.
   * @param {number} [line] One-based line.
   * @returns {Promise<Object>|Object} Updated debugger configuration.
   */
  dbclear(path = 'all', line) {
    if(path === 'all') return this.jsl.inter.env.debugCommand('clear_breakpoints');
    if(path === 'error' || path === 'caught error') return this.jsl.inter.env.debugCommand('set_exception_pause', { state: 'none' });
    if(!Number.isInteger(line) || line < 1) throw Error('Expected a positive line number.');
    return this.jsl.inter.env.debugCommand('remove_breakpoint', { id: (this.jsl.pathResolve(path) || path) + ':' + line });
  }

  /** Returns current line and exception breakpoint settings.
   * @returns {Promise<Object>|Object} Debugger state and breakpoint configuration.
   */
  dbstatus() { return this.jsl.inter.env.debugCommand('get_debug_state'); }
  
  /**
   * Initializes a new instance of the PRDC_JSLAB_LIB_BASIC class.
   * @param {Object} jsl The JSLAB application instance this submodule is part of.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    this._workspace_serializer = new PRDC_JSLAB_WORKSPACE_SERIALIZER(this.jsl);
    
    /**
     * Stores the result of the last evaluated expression.
     * @type {any}
     */
    this.ans;
    this._monitored_functions = new WeakMap();
    this._monitored_events = new WeakMap();
    this._inspected_objects = [];
    Object.defineProperty(this.jsl.context, '$_', {
      configurable: true,
      get: function() { return obj.jsl.context.ans; }
    });
    var document_ref = this.jsl.context.document;
    if(document_ref && typeof document_ref.querySelector === 'function') {
      if(typeof this.jsl.context.$ === 'undefined') this.jsl.context.$ =
        function(selector, start = document_ref) { return start.querySelector(selector); };
      if(typeof this.jsl.context.$$ === 'undefined') this.jsl.context.$$ =
        function(selector, start = document_ref) { return Array.from(start.querySelectorAll(selector)); };
      if(typeof this.jsl.context.$x === 'undefined') this.jsl.context.$x = function(path, start = document_ref) {
        var result = document_ref.evaluate(path, start, null,
          document_ref.defaultView.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        return Array.from({ length: result.snapshotLength }, function(_value, index) {
          return result.snapshotItem(index);
        });
      };
    }
    for(let inspected_index = 0; inspected_index < 5; inspected_index++) {
      Object.defineProperty(this.jsl.context, '$' + inspected_index, {
        configurable: true,
        get: function() { return obj._inspected_objects[inspected_index]; }
      });
    }
    if(Array.isArray(this.jsl.builtin_workspace)) {
      ['$_', '$0', '$1', '$2', '$3', '$4', '$', '$$', '$x'].forEach(function(name) {
        if(Object.prototype.hasOwnProperty.call(obj.jsl.context, name) &&
            !obj.jsl.builtin_workspace.includes(name)) obj.jsl.builtin_workspace.push(name);
      });
    }
    
    /**
     * Clears all defined variables in the current context.
     * @name clear
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'clear', { configurable: true, get: this._clear.bind(this) });

    /**
     * Clears the console screen.
     * @name clc
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'clc', { configurable: true, get: this._clc.bind(this) });

    /**
     * Clears the console screen. Alias for `clc`.
     * @name cls
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'cls', { configurable: true, get: this._clc.bind(this) });

    /**
     * Plays the system beep sound.
     * @name beep
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    this.jsl.context.beep = this.beep.bind(this);

    /**
     * Returns the current version of the JSLAB.
     * @name version
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'version', { configurable: true, get: this._version.bind(this) });

    /**
     * Returns the platform on which JSLAB is running.
     * @name platform
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'platform', { configurable: true, get: this._platform.bind(this) });

    /**
     * Returns the file name of the current JSLAB script.
     * @name jsl_file_name
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'jsl_file_name', { configurable: true, get: this.jslFileName.bind(this) });

    /**
     * Provides information about the current environment.
     * @name info
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'info', { configurable: true, get: this._info.bind(this) });

    /**
     * Accesses or modifies the user settings for JSLAB.
     * @name settings
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'settings', { configurable: true, get: this._settings.bind(this) });

    /**
     * Provides help information for JSLAB commands.
     * @name cmd_help
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'cmd_help', { configurable: true, get: this._cmd_help.bind(this) });

    /**
     * Accesses the code editor interface within JSLAB.
     * @name editor
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'editor', { configurable: true, get: this._editor.bind(this) });

    /**
     * Returns the current working directory.
     * @name pwd
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'pwd', { configurable: true, get: this._pwd.bind(this) });

    /**
     * Sets a breakpoint in the code for debugging.
     * @name breakpoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'breakpoint', { configurable: true, get: this._breakpoint.bind(this) });
    Object.defineProperty(this.jsl.context, 'keyboard', { configurable: true, get: this._breakpoint.bind(this) });

    /**
     * Returns the current debug flag status.
     * @name debug_flag
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'debug_flag', { configurable: true, get: this._debug_flag.bind(this) });

    /**
     * Enables or disables debug mode.
     * @name debug
     * @kind member
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'debug', { configurable: true, get: this._debug.bind(this) });

    /**
     * Pauses the execution of the current script.
     * @name pause
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'pause', { configurable: true, get: this._pause.bind(this) });

    /**
     * Sets a stop point in the script execution.
     * @name stoppoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'stoppoint', { configurable: true, get: this._stoppoint.bind(this) });

    /**
     * Sets a log point to record information during execution.
     * @name logpoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'logpoint', { configurable: true, get: this._logpoint.bind(this) });

    /**
     * Updates specific points in the script during execution.
     * @name updatepoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'updatepoint', { configurable: true, get: this._updatepoint.bind(this) });

    /**
     * Marks the endpoint of a script or process.
     * @name endPoint
     * @kind function
     * @memberof PRDC_JSLAB_LIB_BASIC
     */
    Object.defineProperty(this.jsl.context, 'endPoint', { configurable: true, get: this._endPoint.bind(this) });
  }

  /**
   * Runs a script from a specified path, optionally focusing on specific lines and controlling output visibility.
   * @param {string} script_path The path to the script to run.
   * @param {Array<number>} lines An array of line numbers to run or focus on within the script.
   * @param {boolean} [silent=false] Whether to suppress output from the script execution.
   * @param {Boolean} [force_run=false] If true, forces the script to run even if stop conditions are met.
   */
  async run(script_path, lines, silent = false, force_run = false) {
    var is_top_level_run =
      this.jsl.current_script === 'jslcmdwindow' ||
      this.jsl.jsl_file_name === 'jslcmdwindow';

    if(this.jsl.inter.env.pathIsAbsolute(script_path)) {
      this.jsl.last_script_path = script_path;
      this.jsl.last_script_lines = lines;
      this.jsl.last_script_silent = silent;
      if(is_top_level_run && !force_run && this.jsl.inter.env.checkScriptDir(script_path)) {
        return;
      }
    }
    if(is_top_level_run) {
      this.jsl.pending_top_level_script_finish = true;
    }
    return await this.jsl.inter.eval.runScript(script_path, lines, silent);
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
    return this.jsl.inter.env.clearStorage();
  }

  /**
   * Saves a path to the application's list of saved paths.
   * @param {string} new_path The path to save.
   */
  savePath(new_path) {
    new_path = this.jsl.inter.env.addPathSep(new_path);
    var i = this.jsl.saved_paths.indexOf(new_path);
    if(i < 0) {
      this.jsl.saved_paths.push(new_path);
    }
    this.jsl.inter.env.savePath(new_path);
  }

  /**
   * Removes a previously saved path from the application's list of saved paths.
   * @param {string} saved_path The path to remove.
   */
  removePath(saved_path) {
    saved_path = this.jsl.inter.env.addPathSep(saved_path);
    var i = this.jsl.saved_paths.indexOf(saved_path);
    if(i >= 0) {
      this.jsl.saved_paths.splice(i, 1);
    }
    this.jsl.inter.env.removePath(saved_path);
  }

  /**
   * Converts a wildcard pattern (`*`, `?`) to a regular expression.
   * @param {string} pattern Pattern containing optional wildcards.
   * @returns {RegExp}
   */
  _wildcardToRegExp(pattern) {
    var escaped = String(pattern || '')
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp('^' + escaped + '$');
  }

  /**
   * Checks whether a value matches at least one provided wildcard filter.
   * @param {string} value Value to check.
   * @param {Array<string>} filters Wildcard filters.
   * @returns {boolean}
   */
  _matchesWildcardFilters(value, filters) {
    if(!Array.isArray(filters) || filters.length === 0) {
      return true;
    }
    var name = String(value || '');
    return filters.some((filter) => this._wildcardToRegExp(filter).test(name));
  }

  /**
   * Returns search roots used by file-resolution commands.
   * @returns {Array<string>} Unique search roots.
   */
  _getSearchRoots() {
    var roots = [];
    function pushUnique(path_in) {
      if(typeof path_in === 'string' && path_in.length && !roots.includes(path_in)) {
        roots.push(path_in);
      }
    }
    pushUnique(this.jsl.current_path);
    pushUnique(this.jsl.includes_path);
    if(Array.isArray(this.jsl.saved_paths)) {
      this.jsl.saved_paths.forEach(pushUnique);
    }
    return roots;
  }

  /**
   * Resolves user-provided file/folder input against current path when relative.
   * @param {string} path_in Input path.
   * @returns {(string|false)} Absolute/normalized path or false for invalid input.
   */
  _resolveInputPath(path_in) {
    if(typeof path_in !== 'string') {
      return false;
    }
    var trimmed = path_in.trim();
    if(!trimmed.length) {
      return false;
    }
    var out = trimmed;
    if(typeof this.jsl.inter.env.pathIsAbsolute === 'function' &&
        typeof this.jsl.inter.env.pathJoin === 'function' &&
        !this.jsl.inter.env.pathIsAbsolute(out)) {
      out = this.jsl.inter.env.pathJoin(this.jsl.current_path, out);
    }
    if(typeof this.jsl.inter.env.pathNormalize === 'function') {
      out = this.jsl.inter.env.pathNormalize(out);
    }
    return out;
  }

  /**
   * Collects all file matches for a symbol/path across search roots.
   * @param {string} name File/module name.
   * @returns {Array<string>} Matching absolute file paths.
   */
  _collectFileMatches(name) {
    if(typeof name !== 'string' || !name.trim().length) {
      return [];
    }
    var obj = this;
    var trimmed = name.trim();
    var matches = [];

    function pushUnique(path_in) {
      if(typeof path_in !== 'string' || !path_in.length) {
        return;
      }
      var out = path_in;
      if(typeof obj.jsl.inter.env.pathNormalize === 'function') {
        out = obj.jsl.inter.env.pathNormalize(out);
      }
      if(!matches.includes(out)) {
        matches.push(out);
      }
    }

    var check_file = typeof this.jsl.inter.env.checkFile === 'function'
      ? this.jsl.inter.env.checkFile.bind(this.jsl.inter.env)
      : function() { return false; };

    if(typeof this.jsl.inter.env.pathIsAbsolute === 'function' &&
        this.jsl.inter.env.pathIsAbsolute(trimmed)) {
      if(check_file(trimmed)) {
        pushUnique(trimmed);
      }
      return matches;
    }

    this._getSearchRoots().forEach((root) => {
      if(typeof this.jsl.inter.env.pathJoin !== 'function') {
        return;
      }
      var candidate = this.jsl.inter.env.pathJoin(root, trimmed);
      if(check_file(candidate)) {
        pushUnique(candidate);
      }
    });

    // Fallback to Node module resolution when filesystem search roots miss.
    if(matches.length === 0) {
      try {
        var resolved = require.resolve(trimmed);
        if(check_file(resolved) ||
            (typeof this.jsl.inter.env.pathIsAbsolute === 'function' &&
              this.jsl.inter.env.pathIsAbsolute(resolved))) {
          pushUnique(resolved);
        }
      } catch {
        // Ignore unresolved modules.
      }
    }

    return matches;
  }

  /**
   * Collects all directory matches for an input path across search roots.
   * @param {string} name Folder path/name.
   * @returns {Array<string>} Matching absolute folder paths.
   */
  _collectDirectoryMatches(name) {
    if(typeof name !== 'string' || !name.trim().length) {
      return [];
    }
    var obj = this;
    var trimmed = name.trim();
    var matches = [];

    function pushUnique(path_in) {
      if(typeof path_in !== 'string' || !path_in.length) {
        return;
      }
      var out = path_in;
      if(typeof obj.jsl.inter.env.pathNormalize === 'function') {
        out = obj.jsl.inter.env.pathNormalize(out);
      }
      if(!matches.includes(out)) {
        matches.push(out);
      }
    }

    var check_dir = typeof this.jsl.inter.env.checkDirectory === 'function'
      ? this.jsl.inter.env.checkDirectory.bind(this.jsl.inter.env)
      : function() { return false; };

    if(typeof this.jsl.inter.env.pathIsAbsolute === 'function' &&
        this.jsl.inter.env.pathIsAbsolute(trimmed)) {
      if(check_dir(trimmed)) {
        pushUnique(trimmed);
      }
      return matches;
    }

    this._getSearchRoots().forEach((root) => {
      if(typeof this.jsl.inter.env.pathJoin !== 'function') {
        return;
      }
      var candidate = this.jsl.inter.env.pathJoin(root, trimmed);
      if(check_dir(candidate)) {
        pushUnique(candidate);
      }
    });

    return matches;
  }

  /**
   * Builds a directory listing entry similar to MATLAB `dir` output.
   * @param {string} full_path Absolute file/folder path.
   * @returns {(Object|false)} Directory entry object or false when stat fails.
   */
  _makeDirEntry(full_path) {
    if(!this.jsl.inter.fs || typeof this.jsl.inter.fs.lstatSync !== 'function') {
      return false;
    }
    var stats = this.jsl.inter.fs.lstatSync(full_path, { throwIfNoEntry: false });
    if(!stats) {
      return false;
    }
    var folder = typeof this.jsl.inter.env.pathDirName === 'function'
      ? this.jsl.inter.env.pathDirName(full_path)
      : '';
    var name = typeof this.jsl.inter.env.pathBaseName === 'function'
      ? this.jsl.inter.env.pathBaseName(full_path)
      : full_path;
    return {
      name: name,
      folder: folder,
      date: stats.mtime,
      bytes: stats.size,
      isdir: stats.isDirectory()
    };
  }

  /**
   * Resolves `dir` target input and optional wildcard pattern.
   * @param {string} [target] Input path, file, folder, or wildcard pattern.
   * @returns {(Object|false)} Resolution descriptor or false if not found.
   */
  _resolveDirTarget(target) {
    var check_dir = typeof this.jsl.inter.env.checkDirectory === 'function'
      ? this.jsl.inter.env.checkDirectory.bind(this.jsl.inter.env)
      : function() { return false; };
    var check_file = typeof this.jsl.inter.env.checkFile === 'function'
      ? this.jsl.inter.env.checkFile.bind(this.jsl.inter.env)
      : function() { return false; };

    if(typeof target === 'undefined' || target === null || target === '') {
      return { type: 'directory', directory: this.jsl.current_path };
    }
    if(typeof target !== 'string') {
      return false;
    }

    var trimmed = target.trim();
    if(!trimmed.length) {
      return { type: 'directory', directory: this.jsl.current_path };
    }

    var has_wildcard = /[*?]/.test(trimmed);
    if(has_wildcard) {
      var directory_part = trimmed;
      var pattern = trimmed;
      if(typeof this.jsl.inter.env.pathDirName === 'function' &&
          typeof this.jsl.inter.env.pathBaseName === 'function') {
        directory_part = this.jsl.inter.env.pathDirName(trimmed);
        pattern = this.jsl.inter.env.pathBaseName(trimmed);
      }
      if(!directory_part || directory_part === '.' || directory_part === '') {
        directory_part = this.jsl.current_path;
      }
      var wildcard_dir = this._resolveInputPath(directory_part);
      if(!wildcard_dir || !check_dir(wildcard_dir)) {
        return false;
      }
      return {
        type: 'wildcard',
        directory: wildcard_dir,
        pattern: pattern
      };
    }

    var absolute_target = this._resolveInputPath(trimmed);
    if(absolute_target && check_dir(absolute_target)) {
      return { type: 'directory', directory: absolute_target };
    }
    if(absolute_target && check_file(absolute_target)) {
      return { type: 'file', file: absolute_target };
    }

    var first_file_match = this._collectFileMatches(trimmed)[0];
    if(first_file_match) {
      return { type: 'file', file: first_file_match };
    }

    var first_dir_match = this._collectDirectoryMatches(trimmed)[0];
    if(first_dir_match) {
      return { type: 'directory', directory: first_dir_match };
    }

    return false;
  }

  /**
   * Adds one or more paths to the search path list.
   * Alias compatible with MATLAB/Octave `addpath`.
   * @param {...(string|string[])} args Path entries to add.
   * @returns {Array<string>} Updated search path entries.
   */
  addpath(...args) {
    var obj = this;
    var values = [];

    function pushValue(value) {
      if(typeof value === 'string') {
        var trimmed = value.trim();
        if(trimmed.length) {
          values.push(trimmed);
        }
      } else if(Array.isArray(value)) {
        value.forEach(pushValue);
      }
    }

    args.forEach(pushValue);
    values.forEach(function(value) {
      var target_path = value;
      if(typeof obj.jsl.inter.env.pathIsAbsolute === 'function' &&
          typeof obj.jsl.inter.env.pathJoin === 'function' &&
          !obj.jsl.inter.env.pathIsAbsolute(target_path)) {
        target_path = obj.jsl.inter.env.pathJoin(obj.jsl.current_path, target_path);
      }
      if(typeof obj.jsl.inter.env.pathNormalize === 'function') {
        target_path = obj.jsl.inter.env.pathNormalize(target_path);
      }
      obj.savePath(target_path);
    });

    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return this.path();
  }

  /**
   * Removes one or more paths from the search path list.
   * Alias compatible with MATLAB/Octave `rmpath`.
   * @param {...(string|string[])} args Path entries to remove.
   * @returns {Array<string>} Updated search path entries.
   */
  rmpath(...args) {
    var obj = this;
    var values = [];

    function pushValue(value) {
      if(typeof value === 'string') {
        var trimmed = value.trim();
        if(trimmed.length) {
          values.push(trimmed);
        }
      } else if(Array.isArray(value)) {
        value.forEach(pushValue);
      }
    }

    args.forEach(pushValue);
    values.forEach(function(value) {
      var target_path = value;
      if(typeof obj.jsl.inter.env.pathIsAbsolute === 'function' &&
          typeof obj.jsl.inter.env.pathJoin === 'function' &&
          !obj.jsl.inter.env.pathIsAbsolute(target_path)) {
        target_path = obj.jsl.inter.env.pathJoin(obj.jsl.current_path, target_path);
      }
      if(typeof obj.jsl.inter.env.pathNormalize === 'function') {
        target_path = obj.jsl.inter.env.pathNormalize(target_path);
      }
      obj.removePath(target_path);
    });

    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return this.path();
  }

  /**
   * Retrieves or sets the active search path list.
   * Compatible with MATLAB/Octave `path`.
   * @param {...(string|string[])} args Path entries to set.
   * @returns {Array<string>} Active search path entries.
   */
  path(...args) {
    var obj = this;
    if(args.length) {
      var old_saved_paths = Array.isArray(this.jsl.saved_paths) ? this.jsl.saved_paths.slice() : [];
      old_saved_paths.forEach(function(saved_path) {
        obj.removePath(saved_path);
      });
      this.addpath(...args);
    }

    var out = [];
    function pushUnique(value) {
      if(typeof value === 'string' && value.length && !out.includes(value)) {
        out.push(value);
      }
    }

    pushUnique(this.jsl.current_path);
    pushUnique(this.jsl.includes_path);
    if(Array.isArray(this.jsl.saved_paths)) {
      this.jsl.saved_paths.forEach(pushUnique);
    }
    return out;
  }

  /**
   * Lists contents of a folder or wildcard target.
   * Compatible with MATLAB/Octave `ls`.
   * @param {string} [target] Folder, file, or wildcard.
   * @returns {Array<string>} Entry names.
   */
  ls(target) {
    if(typeof target === 'undefined') {
      return this.jsl.inter.env.listFolderContents();
    }
    var entries = this.dir(target);
    if(!Array.isArray(entries)) {
      return [];
    }
    return entries.map(function(entry) {
      return entry.name;
    });
  }

  /**
   * Lists directory entries with metadata.
   * Compatible with MATLAB/Octave `dir`.
   * @param {string} [target] Folder, file, or wildcard.
   * @returns {Array<Object>} Directory entries.
   */
  dir(target) {
    var resolved = this._resolveDirTarget(target);
    if(!resolved) {
      return [];
    }
    if(resolved.type === 'file') {
      var file_entry = this._makeDirEntry(resolved.file);
      return file_entry ? [file_entry] : [];
    }
    if(typeof this.jsl.inter.env.readDir !== 'function') {
      return [];
    }

    var items = this.jsl.inter.env.readDir(resolved.directory);
    if(!Array.isArray(items)) {
      return [];
    }
    var out = [];
    var wildcard_re = null;
    if(resolved.type === 'wildcard') {
      wildcard_re = this._wildcardToRegExp(resolved.pattern);
    }

    items.forEach((name) => {
      if(wildcard_re && !wildcard_re.test(name)) {
        return;
      }
      if(typeof this.jsl.inter.env.pathJoin !== 'function') {
        return;
      }
      var full_path = this.jsl.inter.env.pathJoin(resolved.directory, name);
      var entry = this._makeDirEntry(full_path);
      if(entry) {
        out.push(entry);
      }
    });
    return out;
  }

  /**
   * Returns true when the path resolves to a file.
   * Compatible with MATLAB `isfile`.
   * @param {string} path_in Path or symbol.
   * @returns {boolean}
   */
  isfile(path_in) {
    return this._collectFileMatches(path_in).length > 0;
  }

  /**
   * Returns true when the path resolves to a folder.
   * Compatible with MATLAB `isfolder`.
   * @param {string} path_in Path or folder symbol.
   * @returns {boolean}
   */
  isfolder(path_in) {
    return this._collectDirectoryMatches(path_in).length > 0;
  }

  /**
   * Checks existence with MATLAB-compatible return codes.
   * `1` variable, `2` file, `5` built-in, `7` directory, `0` missing.
   * Supports typed queries: `'var'`, `'file'`, `'dir'|'folder'`, `'builtin'`.
   * @param {string} name Symbol or path.
   * @param {string} [kind] Optional query kind.
   * @returns {number} Existence code.
   */
  exist(name, kind) {
    if(typeof name !== 'string' || !name.trim().length) {
      return 0;
    }
    var symbol = name.trim();
    var mode = typeof kind === 'string' ? kind.trim().toLowerCase() : '';

    var var_exists = Object.prototype.hasOwnProperty.call(this.jsl.context, symbol);
    var file_exists = this.isfile(symbol);
    var dir_exists = this.isfolder(symbol);
    var builtin_exists = (
      Array.isArray(this.jsl.initial_workspace) &&
      this.jsl.initial_workspace.includes(symbol) &&
      typeof this.jsl.context[symbol] === 'function'
    );

    if(mode === 'var') return var_exists ? 1 : 0;
    if(mode === 'file') return file_exists ? 2 : 0;
    if(mode === 'dir' || mode === 'folder') return dir_exists ? 7 : 0;
    if(mode === 'builtin') return builtin_exists ? 5 : 0;

    if(var_exists) return 1;
    if(file_exists) return 2;
    if(builtin_exists) return 5;
    if(dir_exists) return 7;
    return 0;
  }

  /**
   * Resolves a file/module using the active search path.
   * Compatible with MATLAB/Octave `which`.
   * @param {string} name File/module name.
   * @returns {(string|boolean)} Resolved absolute path, or false if not found.
   */
  which(name, option) {
    var all_mode = false;
    if(typeof name === 'string' &&
        (name.trim().toLowerCase() === '-all' || name.trim().toLowerCase() === 'all')) {
      all_mode = true;
      name = option;
    } else if(typeof option === 'string' &&
        (option.trim().toLowerCase() === '-all' || option.trim().toLowerCase() === 'all')) {
      all_mode = true;
    } else if(option === true) {
      all_mode = true;
    }

    if(typeof name !== 'string' || !name.trim().length) {
      this.jsl.inter.env.error('@which: expected a file or module name.');
      this.jsl.no_ans = true;
      this.jsl.ignore_output = true;
      return false;
    }
    var symbol = name.trim();

    if(all_mode) {
      var matches = this._collectFileMatches(symbol);
      return matches.length ? matches : false;
    }
    return this.jsl.pathResolve(symbol);
  }

  /**
   * Lists workspace variable names.
   * Compatible with MATLAB/Octave `who`.
   * @param {...string} names Optional names to filter.
   * @returns {Array<string>} Variable names.
   */
  who(...names) {
    var filters = [];
    names.forEach(function(name) {
      if(typeof name === 'string' && name.length) {
        filters.push(name);
      } else if(Array.isArray(name)) {
        name.forEach(function(sub_name) {
          if(typeof sub_name === 'string' && sub_name.length) {
            filters.push(sub_name);
          }
        });
      }
    });
    var vars = this.jsl.getWorkspaceProperties();
    if(!Array.isArray(vars)) {
      return [];
    }
    if(filters.length === 0) {
      return vars;
    }
    return vars.filter((name) => this._matchesWildcardFilters(name, filters));
  }

  /**
   * Lists workspace variable descriptors (name/type/class).
   * Compatible with MATLAB/Octave `whos`.
   * @param {...string} names Optional names to filter.
   * @returns {Array<Array<string>>} Workspace descriptor rows.
   */
  whos(...names) {
    var filters = [];
    names.forEach(function(name) {
      if(typeof name === 'string' && name.length) {
        filters.push(name);
      } else if(Array.isArray(name)) {
        name.forEach(function(sub_name) {
          if(typeof sub_name === 'string' && sub_name.length) {
            filters.push(sub_name);
          }
        });
      }
    });
    var rows = this.jsl.getWorkspace();
    if(!Array.isArray(rows)) {
      return [];
    }
    if(filters.length === 0) {
      return rows;
    }
    return rows.filter((row) => {
      return Array.isArray(row) && this._matchesWildcardFilters(row[0], filters);
    });
  }

  _cmd_help() {
    this.jsl.inter.env.cmd_help();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Displays application info.
   */
  _info() {
    this.jsl.inter.env.info();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Opens the settings menu.
   */
  _settings() {
    this.jsl.inter.env.settings();
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
    this.jsl.inter.env.cd(new_path);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Lists the contents of the current directory.
   * @returns {Array<string>} An array of filenames in the current directory.
   */
  _ls() {
    return this.jsl.inter.env.listFolderContents();
  }

  /**
   * Retrieves the application version.
   * @returns {string} The application version.
   */
  _version() {
    return this.jsl.inter.env.version;
  }
  
  /**
   * Retrieves the operating system platform.
   * @returns {string} The OS platform.
   */
  _platform() {
    return this.jsl.inter.env.platform;
  }
  
  /**
   * Retrieves if the JSLAB application is currently in debug mode.
   * @returns {boolean} True if the application is in debug mode; otherwise, false.
   */
  _debug_flag() {
    return this.jsl.inter.env.debug;
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
    this.jsl.inter.env.updateWorkspace();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Updates the file browser display based on the current state.
   */
  updateFileBrowser() {
    this.jsl.inter.env.updateFileBrowser();
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
    this.jsl.inter.env.clc();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Plays the operating system beep sound.
   * @returns {boolean} True when the beep request was accepted.
   */
  beep() {
    var out = this.jsl.inter.env.beep();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return out;
  }

  /**
   * Controls command window transcript logging.
   * `diary()` toggles logging, `diary('on')` enables, `diary('off')` disables,
   * and `diary('<file>')` enables logging to the specified file (append mode).
   * @param {(string|boolean)} [mode_or_file] Mode token or log file path.
   * @returns {boolean} True when command was accepted.
   */
  diary(mode_or_file) {
    var action = 'toggle';
    var file_path;

    if(typeof mode_or_file === 'undefined' || mode_or_file === null) {
      action = 'toggle';
    } else if(typeof mode_or_file === 'boolean') {
      action = mode_or_file ? 'on' : 'off';
    } else if(typeof mode_or_file === 'string') {
      var value = mode_or_file.trim();
      if(!value.length) {
        action = 'toggle';
      } else {
        var mode = value.toLowerCase();
        if(mode === 'on' || mode === 'off' || mode === 'toggle') {
          action = mode;
        } else {
          action = 'on';
          file_path = value;
        }
      }
    } else {
      this.jsl.inter.env.error('@diary: expected string or boolean argument.', false);
      this.jsl.no_ans = true;
      this.jsl.ignore_output = true;
      return false;
    }

    if(typeof file_path === 'string') {
      if(!this.jsl.inter.env.pathIsAbsolute(file_path)) {
        var base_path = this.jsl.current_path || this.jsl.inter.env.pathResolve('.');
        file_path = this.jsl.inter.env.pathJoin(base_path, file_path);
      }
      file_path = this.jsl.inter.env.pathNormalize(file_path);
    }

    this.jsl.inter.env.diary(action, file_path);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return true;
  }

  /**
   * Displays an error message.
   * @param {string} msg The error message to display.
   */
  error(msg) {
    this.jsl.inter.env.error(msg);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Displays a general message.
   * @param {string} msg The message to display.
   */
  disp(msg) {
    this.jsl.inter.env.disp(msg);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return msg+"\n";
  }

  /**
   * Displays a general message with monospaced font.
   * @param {string} msg The message to display.
   */
  dispMonospaced(msg) {
    this.jsl.inter.env.dispMonospaced(msg);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return msg+"\n";
  }
  
  /**
   * Displays a warning message.
   * @param {string} msg The warning message to display.
   */
  warn(msg) {
    this.jsl.inter.env.warn(msg);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Opens a specified file in the editor or just opens the editor if no file is specified.
   * @param {string} [filepath] The path to the file to open in the editor.
   */
  _editor(filepath) {
    this.jsl.inter.env.editor(filepath);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Logs a point in the script for debugging purposes.
   */
  _logpoint() {
    this.jsl.inter.env.setWorkspace();
  }

  /**
   * Updates the workspace or environment at a specific point during script execution.
   */
  _updatepoint() {
    this._logpoint();
  } 

  /** Pauses at a real debugger frame, preserving the user's call stack. */
  _breakpoint() {
    debugger;
  }

  /** Alias for a debugger breakpoint. */
  _debug() {
    debugger;
  }

  /** Pauses execution for variable inspection and stepping. */
  _pause() {
    debugger;
  }

  /**
   * Forces the script execution to stop at a designated point.
   */
  _stoppoint() {
    this.jsl.inter.env.interruptExecution();
    debugger;
  }
  
  /**
   * Marks an endpoint in the script, throwing an error to signify a critical stop or exit point in execution.
   */
  _endPoint() {
    throw new Error(this.jsl.inter.lang.string(116));
  }
  
  /**
   * Opens a specified file in an editor or opens the editor to a default or previously specified file.
   * @param {string} [filepath] - Path to the file to be opened in the editor.
   */
  edit(filepath) {
    this._editor(filepath);
  }

  /**
   * Opens the Assistant chat window.
   */
  assistant() {
    this.jsl.inter.env.assistant();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Opens an independently controllable PTY-backed system Terminal window.
   * @param {string|Object} [name] Window name or options object.
   * @param {Object} [options] Shell, arguments, working directory and environment.
   * @returns {PRDC_JSLAB_TERMINAL_WINDOW|false} Terminal control handle.
   */
  terminal(name, options) {
    if(name && typeof name === 'object') {
      options = name;
      name = options.name;
    }
    options = options && typeof options === 'object' ? options : {};
    var info = this.jsl.inter.env.terminal('create', {
      name: typeof name === 'string' ? name : options.name,
      options: options
    });
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    if(!info || !info.id) return false;
    return new PRDC_JSLAB_TERMINAL_WINDOW(this.jsl, info);
  }

  /**
   * Returns a list of all example scripts available within a predefined directory.
   * @return {Array<string>} An array of paths to the example scripts.
   */
  getExamples() {
    var obj = this;
    return this.jsl.inter.env.readDir(this.jsl.app_path + '/examples')
      .filter(function(file) { return file.match(new RegExp('\.jsl$')); })
      .map(function(i) { return obj.jsl.app_path + '\\examples\\' + i; });
  }

  /**
   * Opens a specified example script in the editor window.
   * @param {string} filename - Name of the example file to open.
   */
  openExample(filename) {
    if(!this.jsl.inter.env.pathIsAbsolute(filename)) {
      filename = this.jsl.app_path + '\\examples\\' + filename;
    }
    this.edit(filename);
  }

  /**
   * Opens examples folder in File Explorer
   */
  openExamplesFolder() {
    this.jsl.inter.env.openFolder(this.jsl.app_path + '\\examples');
  }

  /**
   * Opens examples folder in File Explorer
   */
  goToExamplesFolder() {
    this.jsl.inter.env.cd(this.jsl.app_path + '\\examples');
  }
  
  /**
   * Displays a synchronous message box to the user and waits for their response.
   * @param {Object} options - Configuration options for the message box.
   * @return {number} The index of the button clicked by the user.
   */
  showMessageBox(options) {
    return this.jsl.inter.env.showMessageBox(options);
  }

  /**
   * Serializes a single value with class/reference metadata.
   * @param {*} value - Value to serialize.
   * @param {Object} [options={}] - Serialization options.
   * @returns {Object} Serialized payload.
   */
  saveObject(value, options = {}) {
    return this._workspace_serializer.serializeObject(value, options);
  }

  /**
   * Restores a single serialized value payload.
   * @param {Object} payload - Serialized object payload.
   * @param {Object} [options={}] - Deserialization options.
   * @returns {Promise<*>} Restored value.
   */
  async loadObject(payload, options = {}) {
    var result = await this._workspace_serializer.deserializeObject(payload, options);
    if(result.warnings && result.warnings.length) {
      this.jsl.inter.env.warn('@loadObject: ' + result.warnings.join(' '));
    }
    return result.value;
  }

  /**
   * Attempts to load a class definition into the workspace.
   * @param {string} class_name - Class name.
   * @param {string} class_path - Class source path.
   * @returns {Promise<boolean>} True if class was loaded.
   */
  async loadClass(class_name, class_path) {
    var loaded = await this._workspace_serializer.loadClass(
      class_name,
      class_path,
      { save_dir: this.jsl.current_path }
    );
    
    if(!loaded) {
      var load_class_msg = this.jsl.formatLang(501, {
        class_name: class_name,
        class_path: class_path
      });
      this.jsl.inter.env.warn('@loadClass: ' + load_class_msg);
    }
    return loaded;
  }

  /**
   * Saves specified variables to a file using workspace serializer.
   * @param {string} file_path - Path where variables will be saved.
   * @param {...string} args - Variables to save. If omitted or 'all', saves all workspace variables.
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
    if(!this.jsl.inter.env.pathIsAbsolute(file_path)) {
      file_path = this.jsl.inter.env.pathJoin(this.jsl.current_path, file_path);
    }
    
    var payload = this._workspace_serializer.serializeWorkspace(vars, {
      save_file_path: file_path
    });
    var flag = this.jsl.inter.env.writeFileSync(file_path, JSON.stringify(payload, null, 2));
    if(flag === false) {
      this.jsl.inter.env.error('@save: '+this.jsl.inter.lang.string(117)+': ' + file_path);
    } else if(payload.warnings && payload.warnings.length) {
      this.jsl.inter.env.warn('@save: ' + payload.warnings.join(' '));
    }
  }

  /**
   * Loads variables from a specified file into the specified scope or the default script context.
   * Supports current JSLAB workspace format and legacy plain JSON object files.
   * @param {...*} args - A single filename or a scope and filename to specify where to load the variables.
   */
  async load(...args) {
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
        var raw = this.jsl.inter.env.readFileSync(file_path, 'utf8');
        if(raw === false) {
          this.jsl.inter.env.error('@load: '+this.jsl.inter.lang.string(118)+'.');
          return false;
        }
        
        var parsed = JSON.parse(raw);
        var deserialize_result;
        if(this._workspace_serializer.isSerializedPayload(parsed)) {
          deserialize_result = await this._workspace_serializer.deserializeWorkspace(parsed, {
            save_file_path: file_path
          });
          if(deserialize_result.warnings && deserialize_result.warnings.length) {
            this.jsl.inter.env.warn('@load: ' + deserialize_result.warnings.join(' '));
          }
        } else {
          deserialize_result = { workspace: parsed, warnings: [] };
        }
        
        var vars = deserialize_result.workspace || {};
        if(typeof vars !== 'object' || vars === null || Array.isArray(vars)) {
          this.jsl.inter.env.error('@load: '+this.jsl.inter.lang.string(118)+'.');
          return false;
        }
        Object.keys(vars).forEach(function(property) {
          scope[property] = vars[property];
        });
        return true;
      } catch(err) {
        this.jsl.inter.env.error('@load: '+this.jsl.inter.lang.string(118)+'.');
        return false;
      }
    }
    return false;
  }

  /**
   * Retrieves completion suggestions based on the current context and input.
   * @param {Array} data - Data containing the start of the string to complete, context, and keywords.
   * @return {Array<string>} An array of completion suggestions.
   */
  getCompletions(data) {
    var request = Array.isArray(data) ? {
      start: data[0], context: data[1], keywords: data[2]
    } : (data || {});
    var start = request.start;
    var context = request.context;
    var keywords = request.keywords || [];
    var found = [];
    var root_scope = this.jsl.context;
    var seen = Object.create(null);
    var start_str = String(start || "");
    var start_lower = start_str.toLowerCase();
    
    function getMatchScore(str) {
      var candidate = String(str);
      if(!start_str.length) {
        return 10;
      }

      var candidate_lower = candidate.toLowerCase();
      if(candidate === start_str) return 0;
      if(candidate_lower === start_lower) return 1;
      if(candidate.startsWith(start_str)) return 2;
      if(candidate_lower.startsWith(start_lower)) return 3;
      return Infinity;
    }

    function maybeAdd(str, inherited) {
      if(str == null) {
        return;
      }
      str = String(str);
      if(seen[str]) {
        return;
      }
      var score = getMatchScore(str);
      if(!isFinite(score)) {
        return;
      }
      seen[str] = true;
      found.push({ value: str, score: score, inherited: !!inherited });
    }
    function gatherCompletions(obj) {
      if(obj === null || obj === undefined) return;
      if(typeof obj !== 'object' && typeof obj !== 'function') obj = Object(obj);
      if(!Object.getOwnPropertyNames || !Object.getPrototypeOf) {
        for(var name in obj) maybeAdd(name);
      } else {
        var inherited = false;
        for(var o = obj; o; o = Object.getPrototypeOf(o)) {
          Object.getOwnPropertyNames(o).forEach(function(name) {
            maybeAdd(name, inherited);
          });
          inherited = true;
        }
      }
    }

    if(request.expression) {
      var expression_result = this._resolveConsoleExpression(request.expression);
      if(expression_result.success) gatherCompletions(expression_result.value);
    } else if(context && context.length) {
      context = typeof context === 'string' ? JSON.parse(context) : context;
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;
      if(obj.type && obj.type.indexOf("variable") === 0) {
        var root_property = this._getConsoleDataProperty(root_scope, obj.string);
        if(root_property.success) base = root_property.value;
      } else if(obj.type == "string") {
        base = "";
      } else if(obj.type == "atom") {
        base = 1;
      } else if(obj.type == "function") {
        var function_property = this._getConsoleDataProperty(root_scope, obj.string);
        if(function_property.success) base = function_property.value;
      }
      while(base != null && context.length) {
        var resolved = this._getConsoleDataProperty(base, context.pop().string);
        if(!resolved.success) {
          base = undefined;
          break;
        }
        base = resolved.value;
      }
      if(base != null) gatherCompletions(base);
    } else {
      gatherCompletions(root_scope);
      keywords.forEach(maybeAdd);
    }
    if(found.length) {
      var natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'variant' });
      found.sort(function(a, b) {
        return a.score - b.score ||
          Number(a.inherited) - Number(b.inherited) ||
          Number(a.value.startsWith('_')) - Number(b.value.startsWith('_')) ||
          natural.compare(a.value, b.value);
      });
    }
    var items = found.map(function(entry) {
      return entry.value;
    });
    var map_match = /([A-Za-z_$][\w$]*(?:\s*(?:\.\s*[A-Za-z_$][\w$]*|\[\s*(?:"[^"]*"|'[^']*'|\d+)\s*\]))*)\s*\.\s*(?:get|set|delete)\s*\(\s*$/.exec(String(request.input || ''));
    if(map_match) {
      var map_result = this._resolveConsoleExpression(map_match[1]);
      if(map_result.success && map_result.value instanceof Map) {
        items = Array.from(map_result.value.keys()).slice(0, 1000).map(function(key) {
          if(typeof key === 'string') return JSON.stringify(key);
          if(['number', 'bigint', 'boolean'].includes(typeof key) || key === null) return String(key);
          return null;
        }).filter(function(key) { return key !== null; });
      }
    }
    if(Array.isArray(request.history) && request.input) {
      var input = String(request.input).trimStart();
      var history_seen = new Set();
      request.history.slice(0, 1000).forEach(function(command) {
        command = String(command || '');
        if(command && command.startsWith(input) && command !== input &&
            !history_seen.has(command) && history_seen.size < 50) {
          history_seen.add(command);
          items.push({ text: command, displayText: '> ' + command,
            className: 'jslab-console-history-hint', history: true });
        }
      });
    }
    if(Array.isArray(data)) return items;
    return { items: items, argument_hint: this._getConsoleArgumentHint(request.input || '') };
  }    

  /** Returns enumerable own property names, matching the DevTools helper. */
  keys(object) {
    return Object.keys(Object(object));
  }

  /** Returns enumerable own property values, matching the DevTools helper. */
  values(object) {
    return Object.values(Object(object));
  }

  /** Copies a bounded textual representation to the system clipboard. */
  async copy(object) {
    var text = typeof object === 'string' ? object : this.jsl.inter.format.safeStringify(object, 20, false);
    await this.jsl.inter.env.copyText(text);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return undefined;
  }

  /** Displays a value as an expandable console object. */
  inspect(object) {
    this._inspected_objects.unshift(object);
    this._inspected_objects.length = Math.min(5, this._inspected_objects.length);
    this.jsl.inter.env.disp(object);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return object;
  }

  /** Finds reachable workspace objects constructed by the supplied class. */
  queryObjects(constructor) {
    if(typeof constructor !== 'function') throw new TypeError('Expected a constructor.');
    var found = [];
    var seen = new WeakSet();
    var queue = [this.jsl.context];
    var remaining = 10000;
    while(queue.length && remaining-- > 0) {
      var value = queue.shift();
      if(value === null || (typeof value !== 'object' && typeof value !== 'function') || seen.has(value)) continue;
      seen.add(value);
      try { if(value instanceof constructor && value !== constructor.prototype) found.push(value); } catch(err) {}
      var descriptors;
      try { descriptors = Object.getOwnPropertyDescriptors(value); } catch(err) { continue; }
      Reflect.ownKeys(descriptors).forEach(function(key) {
        var descriptor = descriptors[key];
        if(descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')) queue.push(descriptor.value);
      });
    }
    return found;
  }

  /** Returns listeners installed through monitorEvents(). */
  getEventListeners(object) {
    var listeners = this._monitored_events.get(object) || [];
    return listeners.reduce(function(result, listener) {
      (result[listener.type] ||= []).push({ listener: listener.handler, useCapture: false,
        passive: false, once: false });
      return result;
    }, {});
  }

  /** Logs selected EventTarget events until unmonitorEvents() is called. */
  monitorEvents(object, events) {
    if(!object || typeof object.addEventListener !== 'function') throw new TypeError('Expected an EventTarget.');
    var groups = {
      mouse: ['mousedown', 'mouseup', 'click', 'dblclick', 'mousemove', 'mouseover', 'mouseout', 'wheel'],
      key: ['keydown', 'keyup', 'keypress', 'input'],
      touch: ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
      control: ['resize', 'scroll', 'focus', 'blur', 'select', 'change', 'submit', 'reset']
    };
    var types = events === undefined ? Object.values(groups).flat() :
      (Array.isArray(events) ? events : [events]).flatMap(type => groups[type] || [type]);
    var records = this._monitored_events.get(object) || [];
    types.forEach((type) => {
      if(records.some(record => record.type === type)) return;
      var handler = event => this.jsl.inter.env.disp(event);
      object.addEventListener(type, handler);
      records.push({ type: type, handler: handler });
    });
    this._monitored_events.set(object, records);
    return object;
  }

  /** Stops event logging installed by monitorEvents(). */
  unmonitorEvents(object, events) {
    var records = this._monitored_events.get(object) || [];
    var types = events === undefined ? null : new Set(Array.isArray(events) ? events : [events]);
    records = records.filter(function(record) {
      if(types && !types.has(record.type)) return true;
      object.removeEventListener(record.type, record.handler);
      return false;
    });
    if(records.length) this._monitored_events.set(object, records);
    else this._monitored_events.delete(object);
    return object;
  }

  /** Displays XML/HTML markup when available. */
  dirxml(object) {
    return this.inspect(object && object.outerHTML ? object.outerHTML : object);
  }

  /** Logs calls to a function referenced directly by a workspace variable. */
  monitor(func) {
    return this._setFunctionMonitor(func, false);
  }

  /** Stops call logging installed by monitor(). */
  unmonitor(func) {
    return this._removeFunctionMonitor(func);
  }

  /** Breaks when a workspace function is called; `debug` remains JSLAB's debug flag. */
  debugFunction(func) {
    return this._setFunctionMonitor(func, true);
  }

  /** Removes a breakpoint wrapper installed by debugFunction(). */
  undebug(func) {
    return this._removeFunctionMonitor(func);
  }

  /** @private */
  _setFunctionMonitor(func, break_on_call) {
    if(typeof func !== 'function') throw new TypeError('Expected a function.');
    if(this._monitored_functions.has(func)) return func;
    var obj = this;
    var wrapper = function(...args) {
      if(break_on_call) debugger;
      else obj.jsl.inter.env.disp((func.name || 'function') + ' called with', args);
      if(new.target) return Reflect.construct(func, args, new.target);
      return Reflect.apply(func, this, args);
    };
    var replaced = [];
    var descriptors = Object.getOwnPropertyDescriptors(this.jsl.context);
    Reflect.ownKeys(descriptors).forEach((key) => {
      var descriptor = descriptors[key];
      if(descriptor && descriptor.value === func && descriptor.writable) {
        this.jsl.context[key] = wrapper;
        replaced.push(key);
      }
    });
    if(!replaced.length) throw new Error('Function must be assigned to a writable workspace variable.');
    var record = { original: func, wrapper: wrapper, properties: replaced };
    this._monitored_functions.set(func, record);
    this._monitored_functions.set(wrapper, record);
    return wrapper;
  }

  /** @private */
  _removeFunctionMonitor(func) {
    var record = this._monitored_functions.get(func);
    if(!record) return false;
    record.properties.forEach((key) => {
      if(this.jsl.context[key] === record.wrapper) this.jsl.context[key] = record.original;
    });
    this._monitored_functions.delete(record.original);
    this._monitored_functions.delete(record.wrapper);
    return true;
  }

  /**
   * Resolves a console expression without invoking functions, getters or proxy
   * traps. This is intentionally conservative and is shared by completion and
   * eager preview.
   * @param {string} expression Expression text.
   * @returns {Object} Resolution result with success, value and reason fields.
   * @private
   */
  _resolveConsoleExpression(expression) {
    var ast;
    try {
      ast = this.jsl.inter.env.babel_parser.parseExpression(String(expression).trim().replace(/;+\s*$/, ''), {
        sourceType: 'script', allowAwaitOutsideFunction: true
      });
    } catch(err) {
      return { success: false, reason: 'syntax' };
    }
    var obj = this;
    function evaluate(node) {
      if(!node) return { success: false, reason: 'unsupported' };
      if(['StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'BigIntLiteral'].includes(node.type)) {
        return { success: true, value: node.type === 'BigIntLiteral' ? BigInt(node.value) : node.value };
      }
      if(node.type === 'NullLiteral') return { success: true, value: null };
      if(node.type === 'Identifier') {
        if(node.name === 'undefined') return { success: true, value: undefined };
        return obj._getConsoleDataProperty(obj.jsl.context, node.name);
      }
      if(node.type === 'ThisExpression') return { success: true, value: obj.jsl.context };
      if(node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
        var owner = evaluate(node.object);
        if(!owner.success || owner.value == null) return { success: false, reason: 'unresolved' };
        var property;
        if(node.computed) {
          var key = evaluate(node.property);
          if(!key.success || !['string', 'number', 'symbol'].includes(typeof key.value)) {
            return { success: false, reason: 'computed' };
          }
          property = key.value;
        } else {
          property = node.property.name;
        }
        return obj._getConsoleDataProperty(owner.value, property);
      }
      if(node.type === 'UnaryExpression' && ['+', '-', '!', '~', 'typeof', 'void'].includes(node.operator)) {
        var argument = evaluate(node.argument);
        if(!argument.success) return argument;
        try {
          switch(node.operator) {
            case '+': return { success: true, value: +argument.value };
            case '-': return { success: true, value: -argument.value };
            case '!': return { success: true, value: !argument.value };
            case '~': return { success: true, value: ~argument.value };
            case 'typeof': return { success: true, value: typeof argument.value };
            case 'void': return { success: true, value: undefined };
          }
        } catch(err) { return { success: false, reason: 'operation' }; }
      }
      if(node.type === 'ArrayExpression') {
        var array = [];
        for(const element of node.elements) {
          if(element === null) { array.length++; continue; }
          var array_value = evaluate(element);
          if(!array_value.success) return array_value;
          array.push(array_value.value);
        }
        return { success: true, value: array };
      }
      if(node.type === 'ObjectExpression') {
        var result = Object.create(null);
        for(const property_node of node.properties) {
          if(property_node.type !== 'ObjectProperty' || property_node.computed || property_node.method) {
            return { success: false, reason: 'object-property' };
          }
          var object_value = evaluate(property_node.value);
          if(!object_value.success) return object_value;
          var object_key = property_node.key.name !== undefined ? property_node.key.name : property_node.key.value;
          Object.defineProperty(result, object_key, { value: object_value.value, enumerable: true,
            configurable: true, writable: true });
        }
        return { success: true, value: result };
      }
      if(node.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return { success: true, value: node.quasis[0]?.value?.cooked || '' };
      }
      if(node.type === 'TemplateLiteral') {
        var template = node.quasis[0]?.value?.cooked || '';
        for(var template_i = 0; template_i < node.expressions.length; template_i++) {
          var template_value = evaluate(node.expressions[template_i]);
          if(!template_value.success || (template_value.value !== null &&
              !['undefined', 'string', 'number', 'bigint', 'boolean'].includes(typeof template_value.value))) {
            return { success: false, reason: 'template-expression' };
          }
          template += String(template_value.value) +
            (node.quasis[template_i + 1]?.value?.cooked || '');
        }
        return { success: true, value: template };
      }
      if(node.type === 'RegExpLiteral') {
        try { return { success: true, value: new RegExp(node.pattern, node.flags) }; }
        catch(err) { return { success: false, reason: 'regexp' }; }
      }
      if(node.type === 'BinaryExpression') {
        var left = evaluate(node.left);
        var right = evaluate(node.right);
        if(!left.success || !right.success) return { success: false, reason: 'operand' };
        var allowed_types = ['undefined', 'string', 'number', 'bigint', 'boolean'];
        if((left.value !== null && !allowed_types.includes(typeof left.value)) ||
            (right.value !== null && !allowed_types.includes(typeof right.value))) {
          return { success: false, reason: 'object-operation' };
        }
        try {
          switch(node.operator) {
            case '+': return { success: true, value: left.value + right.value };
            case '-': return { success: true, value: left.value - right.value };
            case '*': return { success: true, value: left.value * right.value };
            case '/': return { success: true, value: left.value / right.value };
            case '%': return { success: true, value: left.value % right.value };
            case '**': return { success: true, value: left.value ** right.value };
            case '<<': return { success: true, value: left.value << right.value };
            case '>>': return { success: true, value: left.value >> right.value };
            case '>>>': return { success: true, value: left.value >>> right.value };
            case '|': return { success: true, value: left.value | right.value };
            case '&': return { success: true, value: left.value & right.value };
            case '^': return { success: true, value: left.value ^ right.value };
            case '==': return { success: true, value: left.value == right.value };
            case '!=': return { success: true, value: left.value != right.value };
            case '===': return { success: true, value: left.value === right.value };
            case '!==': return { success: true, value: left.value !== right.value };
            case '<': return { success: true, value: left.value < right.value };
            case '<=': return { success: true, value: left.value <= right.value };
            case '>': return { success: true, value: left.value > right.value };
            case '>=': return { success: true, value: left.value >= right.value };
          }
        } catch(err) { return { success: false, reason: 'operation' }; }
      }
      if(node.type === 'LogicalExpression') {
        var logical_left = evaluate(node.left);
        if(!logical_left.success) return logical_left;
        if(node.operator === '&&' && !logical_left.value) return logical_left;
        if(node.operator === '||' && logical_left.value) return logical_left;
        if(node.operator === '??' && logical_left.value !== null && logical_left.value !== undefined) return logical_left;
        return evaluate(node.right);
      }
      if(node.type === 'ConditionalExpression') {
        var test = evaluate(node.test);
        if(!test.success) return test;
        return evaluate(test.value ? node.consequent : node.alternate);
      }
      if(node.type === 'SequenceExpression') {
        var sequence_value = { success: true, value: undefined };
        for(const expression_node of node.expressions) {
          sequence_value = evaluate(expression_node);
          if(!sequence_value.success) return sequence_value;
        }
        return sequence_value;
      }
      return { success: false, reason: 'side-effect' };
    }
    return evaluate(ast);
  }

  /** Returns a data property without invoking an accessor. @private */
  _getConsoleDataProperty(value, property) {
    if(value == null) return { success: false, reason: 'null' };
    var target;
    try { target = Object(value); } catch(err) { return { success: false, reason: 'object' }; }
    try {
      for(var current = target; current; current = Object.getPrototypeOf(current)) {
        var descriptor = Object.getOwnPropertyDescriptor(current, property);
        if(!descriptor) continue;
        if(!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
          return { success: false, reason: 'accessor' };
        }
        return { success: true, value: descriptor.value };
      }
    } catch(err) {}
    return { success: false, reason: 'missing' };
  }

  /** Returns a side-effect-free eager preview descriptor. @private */
  _getConsolePreview(expression) {
    var result = this._resolveConsoleExpression(expression);
    if(!result.success) return { success: false, reason: result.reason };
    return { success: true, value: this.jsl.inter.format._consoleValue(result.value) };
  }

  /** Reports whether Enter should execute the current prompt. @private */
  _isConsoleExpressionComplete(code) {
    var source = String(code || '');
    if(!source.trim()) return true;
    try {
      this.jsl.inter.env.babel_parser.parse(source, { sourceType: 'script',
        allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true });
      return true;
    } catch(err) {
      return !(err.pos >= source.trimEnd().length ||
        ['UnterminatedTemplate', 'UnterminatedComment'].includes(err.reasonCode));
    }
  }

  /** Builds a conservative function signature for the active call. @private */
  _getConsoleArgumentHint(input) {
    var text = String(input || '');
    var depth = 0;
    var open = -1;
    for(var i = text.length - 1; i >= 0; i--) {
      if(text[i] === ')') depth++;
      else if(text[i] === '(') {
        if(depth === 0) { open = i; break; }
        depth--;
      }
    }
    if(open < 0) return null;
    var match = /([A-Za-z_$][\w$]*(?:\s*(?:\.\s*[A-Za-z_$][\w$]*|\[\s*(?:"[^"]*"|'[^']*')\s*\]))*)\s*$/.exec(text.slice(0, open));
    if(!match) return null;
    var resolved = this._resolveConsoleExpression(match[1]);
    if(!resolved.success || typeof resolved.value !== 'function') return null;
    var source;
    try { source = Function.prototype.toString.call(resolved.value); } catch(err) { return null; }
    var params = /^\s*(?:async\s*)?(?:function\s*)?[^\(]*\(([^)]*)\)/.exec(source) ||
      /^\s*(?:async\s*)?([^=()]*)=>/.exec(source);
    if(!params) return resolved.value.name ? resolved.value.name + '(...)' : null;
    var name = resolved.value.name || match[1].split('.').pop();
    var arguments_text = params[1].trim();
    if(!arguments_text && resolved.value.length > 0 && source.includes('[native code]')) {
      arguments_text = Array.from({ length: resolved.value.length }, function(_value, index) {
        return 'arg' + (index + 1);
      }).join(', ');
    }
    return name + '(' + arguments_text + ')';
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
    return this.jsl.inter.env.math.compareText(x, y);
  }
    
  /**
   * Compare two version strings (e.g. "1.4.2", "v2.0.0-beta.1").
   * @param {string} a First version.
   * @param {string} b Second version.
   * @returns {number} -1 if a < b, 0 if equal, 1 if a > b.
   */
  compareVersions(a, b) {
    var clean = v => v.replace(/^v/i, '').split(/[-+]/)[0];
    var toNums = v => clean(v).split('.').map(Number);

    var x = toNums(a);
    var y = toNums(b);
    const len = Math.max(x.length, y.length);

    for(let i = 0; i < len; i++) {
      var xi = x[i] ?? 0;
      var yi = y[i] ?? 0;
      if(xi > yi) return 1;
      if(xi < yi) return -1;
    }
    return 0;
  }
  
  /**
   * Checks if there is available update
   * @returns {boolean} True if there is available update; otherwise, false.
   */
  async checkForUpdate() {
    if(this.jsl.inter.networking.isOnline()) {
      try {
        var api_base = 'https://api.github.com/repos/PR-DC/JSLAB';

        const rel = await fetch(`${api_base}/releases/latest`, {
          headers: { 'Accept': 'application/vnd.github+json' }
        });
        
        var latest_version;
        if(rel.ok) {
          const { tag_name } = await rel.json();   // e.g. "v1.5.0"
          latest_version = tag_name;
        } else if(rel.status === 404) {
          const tagRes = await fetch(`${api_base}/tags?per_page=1`);
          const [ { name } ] = await tagRes.json(); // e.g. "v1.5.0-beta.1"
          latest_version = name;
        } else {
          this.jsl._console.log(rel);
          this.jsl.inter.env.error('@checkForUpdate: '+this.jsl.inter.lang.string(237));
        }

        var check = this.compareVersions(this.jsl.inter.env.version, latest_version) === -1;
        if(check) {
          this.jsl.inter.env.disp('@checkForUpdate: '+this.jsl.inter.lang.string(238) + '<a href="https://github.com/PR-DC/JSLAB/releases" class="external-link">https://github.com/PR-DC/JSLAB/releases</a>');
        }
        return check;
      } catch(err) {
        this.jsl._console.log(err);
        this.jsl.inter.env.error('@checkForUpdate: '+this.jsl.inter.lang.string(237));
      }
    } else {
      this.jsl.inter.env.error('@checkForUpdate: '+this.jsl.inter.lang.string(237));
    }
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
      this.jsl.inter.array.removeElementByValue(this.jsl.required_modules, module);
    }
  }
  
  /**
   * Resets app.
   */
  resetApp() {
    this.jsl.inter.env.resetApp();
  }
  
  /**
   * Resets the sandbox environment to its initial state.
   */
  resetSandbox() {
    this.jsl.inter.env.resetSandbox();
  }

  /**
   * Opens the developer tools for the sandbox environment in the current context.
   * @returns {void}
   */
  openDevTools() {
    this.jsl.inter.env.openSandboxDevTools();
  }

  /**
   * Installs a module located at the specified path.
   * @param {string} path - The path to the module.
   * @param {boolean} [show_output=true] - Whether to show output in the command window.
   */
  installModule(path, show_output = false) {
    if(typeof path == 'string') {
      path = this.jsl.pathResolve(path);
    }
    if(!path) {
      var options = {
        title: this.jsl.inter.lang.currentString(141),
        buttonLabel: this.jsl.inter.lang.currentString(142),
        properties: ['openDirectory'],
      };
      path = this.jsl.inter.env.showOpenDialogSync(options);
      if(path === undefined) {
        this.jsl.inter.env.error('@installModule: '+this.jsl.inter.lang.string(119)+'.');
      } else {
        path = path[0];
      }
    }
    path = this.jsl.inter.env.addPathSep(path);
    
    var exe = this.jsl.inter.env.exe_path;
    var npm_path = this.jsl.inter.env.pathJoin(this.jsl.app_path, 'node_modules', 'npm', 'bin', 'npm-cli.js');
    var command = 'set ELECTRON_RUN_AS_NODE=1 & "' + exe + '" "' + npm_path + '" install 2>&1';
    var command_options = {cwd: path, shell: false};
    var msg;
    try {
      var system_out;
      if(typeof this.system === 'function') {
        system_out = this.system(command, command_options);
      } else {
        system_out = this.jsl.inter.env.execSync(command, command_options);
      }
      if(typeof system_out === 'string') {
        msg = system_out;
      } else if(system_out != null && typeof system_out.toString === 'function') {
        msg = system_out.toString();
      } else {
        msg = '';
      }
    } catch(err) {
      var err_msg = err && err.message ? err.message : String(err);
      var err_out = '';
      if(err && typeof err.stdout !== 'undefined' && err.stdout !== null) {
        if(typeof err.stdout === 'string') {
          err_out = err.stdout;
        } else if(typeof err.stdout.toString === 'function') {
          err_out = err.stdout.toString();
        } else {
          err_out = String(err.stdout);
        }
      }
      msg = err_msg;
      if(err_out.length) {
        msg += ', command output: \n' + err_out;
      }
    }
    
    if(!msg.includes('\nnpm error')) {
      if(show_output) {
        this.jsl.inter.env.disp(msg);
      }
    } else {
      this.jsl.inter.env.error('@installModule: '+msg.replaceAll('\n', '<br>'));
    }
  }
  
  /**
   * Registers an object for cleanup with a specified cleanup function.
   * @param {Object} obj - The object to be registered for cleanup.
   * @param {Function} fun - The function to execute during cleanup.
   */
  addForCleanup(...args) {
    this.jsl.addForCleanup(...args);
  }
}

/** Controllable handle for one visible system Terminal window. */
class PRDC_JSLAB_TERMINAL_WINDOW {
  constructor(jsl, info) {
    Object.defineProperty(this, '_jsl', { value: jsl, enumerable: false });
    Object.defineProperty(this, '_listeners', {
      value: { data: new Map(), exit: new Map() }, enumerable: false
    });
    this.id = info.id;
    this.name = info.name;
  }

  /** Writes text exactly as if it were typed into the terminal. */
  write(data) {
    this._jsl.inter.env.terminal('write', { id: this.id, value: String(data) });
    return this;
  }

  /** Writes text followed by Enter. */
  writeln(data = '') {
    return this.write(String(data) + '\r');
  }

  /** Returns the bounded output currently captured for this terminal. */
  read() {
    var output = this._jsl.inter.env.terminal('read', { id: this.id });
    return output === false ? '' : output;
  }

  /** Returns only output received since the previous readNew call. */
  readNew() {
    var output = this._jsl.inter.env.terminal('read-new', { id: this.id });
    return output === false ? '' : output;
  }

  /** Clears captured output without changing the visible terminal screen. */
  clearOutput() {
    this._jsl.inter.env.terminal('clear-output', { id: this.id });
    return this;
  }

  /** Returns window and shell lifecycle information. */
  status() {
    return this._jsl.inter.env.terminal('status', { id: this.id }) || {
      id: this.id, name: this.name, open: false, running: false
    };
  }

  /** Registers a callback invoked for every new raw output chunk. */
  onData(callback) {
    if(typeof callback !== 'function') return this;
    var wrapped = this._jsl.inter.env.terminalOn(this.id, 'data', callback);
    if(wrapped) this._listeners.data.set(callback, wrapped);
    return this;
  }

  /** Removes a data callback registered with onData. */
  offData(callback) {
    var wrapped = this._listeners.data.get(callback);
    if(wrapped) {
      this._jsl.inter.env.terminalOff(this.id, 'data', wrapped);
      this._listeners.data.delete(callback);
    }
    return this;
  }

  /** Registers a callback invoked when the shell exits. */
  onExit(callback) {
    if(typeof callback !== 'function') return this;
    var wrapped = this._jsl.inter.env.terminalOn(this.id, 'exit', callback);
    if(wrapped) this._listeners.exit.set(callback, wrapped);
    return this;
  }

  /** Removes an exit callback registered with onExit. */
  offExit(callback) {
    var wrapped = this._listeners.exit.get(callback);
    if(wrapped) {
      this._jsl.inter.env.terminalOff(this.id, 'exit', wrapped);
      this._listeners.exit.delete(callback);
    }
    return this;
  }

  /** Waits until captured output contains a string or matches a RegExp. */
  waitFor(pattern, timeout = 10000) {
    var obj = this;
    return new Promise(function(resolve, reject) {
      var matches = function(output) {
        if(pattern instanceof RegExp) {
          pattern.lastIndex = 0;
          return pattern.test(output);
        }
        return output.includes(String(pattern));
      };
      var output = obj.read();
      if(matches(output)) { resolve(output); return; }
      var timer;
      var listener = function(chunk) {
        output += chunk;
        if(matches(output)) {
          obj.offData(listener);
          obj._jsl.context.clearTimeout(timer);
          resolve(output);
        }
      };
      obj.onData(listener);
      timer = obj._jsl.context.setTimeout(function() {
        obj.offData(listener);
        reject(new Error('Terminal output wait timed out.'));
      }, Math.max(0, Number(timeout) || 0));
    });
  }

  /** Waits for the current shell process to exit. */
  waitForExit(timeout = 10000) {
    var obj = this;
    var state = this.status();
    if(!state.running) return Promise.resolve(state);
    return new Promise(function(resolve, reject) {
      var timer;
      var listener = function(event) {
        obj.offExit(listener);
        obj._jsl.context.clearTimeout(timer);
        resolve(event);
      };
      obj.onExit(listener);
      timer = obj._jsl.context.setTimeout(function() {
        obj.offExit(listener);
        reject(new Error('Terminal exit wait timed out.'));
      }, Math.max(0, Number(timeout) || 0));
    });
  }

  /** Clears the visible terminal scrollback. */
  clear() {
    this._jsl.inter.env.terminal('clear', { id: this.id });
    return this;
  }

  /** Brings the terminal window to the foreground. */
  focus() {
    this._jsl.inter.env.terminal('focus', { id: this.id });
    return this;
  }

  /** Restarts the configured shell in this window. */
  restart() {
    this._jsl.inter.env.terminal('restart', { id: this.id });
    return this;
  }

  /** Changes the native window title. */
  setName(name) {
    if(this._jsl.inter.env.terminal('set-name', { id: this.id, name: name })) {
      this.name = String(name);
    }
    return this;
  }

  /** Alias for setName, matching native window terminology. */
  setTitle(name) {
    return this.setName(name);
  }

  /** Hides the window without terminating its shell. */
  hide() {
    this._jsl.inter.env.terminal('hide', { id: this.id });
    return this;
  }

  /** Reports whether the window still exists. */
  isOpen() {
    return this._jsl.inter.env.terminal('is-open', { id: this.id });
  }

  /** Closes the window and its owned shell process. */
  close() {
    for(const callback of this._listeners.data.keys()) this.offData(callback);
    for(const callback of this._listeners.exit.keys()) this.offExit(callback);
    return this._jsl.inter.env.terminal('close', { id: this.id });
  }
}

exports.PRDC_JSLAB_LIB_BASIC = PRDC_JSLAB_LIB_BASIC;
