/**
 * @file JSLAB library basic submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WORKSPACE_SERIALIZER } = require('./workspace-serializer');
 
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
    this.workspace_serializer = new PRDC_JSLAB_WORKSPACE_SERIALIZER(this.jsl);
    
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
    
    var [line, column, script] = this.jsl.inter.eval.getExpressionPosition();
    var ret = this.jsl.inter.env.showMessageBox({title: this.jsl.inter.lang.currentString(15), message: this.jsl.inter.lang.currentString(216)+': '+line+', '+this.jsl.inter.lang.currentString(113)+': '+column+' ('+script+'). '+this.jsl.inter.lang.currentString(213), buttons: [this.jsl.inter.lang.currentString(214), this.jsl.inter.lang.currentString(215)], cancelId: 0});
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
    
    var [line, column, script] = this.jsl.inter.eval.getExpressionPosition();
    var ret = this.jsl.inter.env.showMessageBox({title: this.jsl.inter.lang.currentString(15), message: this.jsl.inter.lang.currentString(217)+': '+line+', '+this.jsl.inter.lang.currentString(113)+': '+column+' ('+script+'). '+this.jsl.inter.lang.currentString(213), buttons: [this.jsl.inter.lang.currentString(214), this.jsl.inter.lang.currentString(215)], cancelId: 0});
    
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
    var [line, column, script] = this.jsl.inter.eval.getExpressionPosition();
    throw {name: 'JslabError', message: this.jsl.inter.lang.string(116)+': '+line+', '+this.jsl.inter.lang.string(113)+': '+column+' ('+script+').'};
  }
  
  /**
   * Verifies if a loop within the script execution should be terminated, typically used to avoid infinite or lengthy unnecessary execution.
   */
  checkStopLoop() {
    if(!this.jsl.stop_loop) {
      this.jsl.stop_loop = this.jsl.inter.env.checkStopLoop();
    }
    return this.jsl.stop_loop;
  }
  
  /**
   * Opens a specified file in an editor or opens the editor to a default or previously specified file.
   * @param {string} [filepath] - Path to the file to be opened in the editor.
   */
  edit(filepath) {
    this._editor(filepath);
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
    return this.workspace_serializer.serializeObject(value, options);
  }

  /**
   * Restores a single serialized value payload.
   * @param {Object} payload - Serialized object payload.
   * @param {Object} [options={}] - Deserialization options.
   * @returns {Promise<*>} Restored value.
   */
  async loadObject(payload, options = {}) {
    var result = await this.workspace_serializer.deserializeObject(payload, options);
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
    var loaded = await this.workspace_serializer.loadClass(
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
    
    var payload = this.workspace_serializer.serializeWorkspace(vars, {
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
        if(this.workspace_serializer.isSerializedPayload(parsed)) {
          deserialize_result = await this.workspace_serializer.deserializeWorkspace(parsed, {
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
    var start = data[0];
    var context = data[1];
    var keywords = data[2];  
    var found = [];
    var root_scope = this.jsl.context;
    var seen = Object.create(null);
    var start_str = String(start || "");
    var start_lower = start_str.toLowerCase();
    
    function getMatchScore(str) {
      var candidate = String(str);
      if(!start_str.length) {
        // No query: keep deterministic order by length and alphabet later.
        return 1000;
      }

      var candidate_lower = candidate.toLowerCase();
      var idx_ci = candidate_lower.indexOf(start_lower);
      if(idx_ci < 0) {
        return Infinity;
      }

      var idx_cs = candidate.indexOf(start_str);
      var is_exact_cs = candidate === start_str;
      var is_exact_ci = !is_exact_cs && candidate_lower === start_lower;
      var is_prefix_cs = idx_cs === 0;
      var is_prefix_ci = idx_ci === 0;
      var boundary_ci = idx_ci > 0 && /[\._\$]/.test(candidate.charAt(idx_ci - 1));
      var boundary_cs = idx_cs > 0 && /[\._\$]/.test(candidate.charAt(idx_cs - 1));

      if(is_exact_cs) return 0;
      if(is_exact_ci) return 1;
      if(is_prefix_cs) return 2;
      if(is_prefix_ci) return 3;
      if(boundary_cs) return 10 + idx_cs;
      if(boundary_ci) return 20 + idx_ci;
      if(idx_cs >= 0) return 30 + idx_cs;
      return 40 + idx_ci;
    }

    function maybeAdd(str) {
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
      found.push({ value: str, score: score });
    }
    function gatherCompletions(obj) {
      if(typeof obj == "string") ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
        "toUpperCase toLowerCase split concat match replace search").split(" ").forEach(maybeAdd);
      else if(obj instanceof Array) ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
        "lastIndexOf every some filter forEach map reduce reduceRight ").split(" ").forEach(maybeAdd);
      else if(obj instanceof Function) "prototype apply call bind".split(" ").forEach(maybeAdd);
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
        base = base || root_scope[obj.string];
      } else if(obj.type == "string") {
        base = "";
      } else if(obj.type == "atom") {
        base = 1;
      } else if(obj.type == "function") {
        if(root_scope.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
            (typeof root_scope.jQuery == 'function')) {
            base = root_scope.jQuery();
          } else if(root_scope._ != null && (obj.string == '_') && (typeof root_scope._ == 'function')) {
            base = root_scope._();
          }
      }
      while(base != null && context.length)
        base = base[context.pop().string]; // switch base to variable
      if(base != null) gatherCompletions(base);
    } else {
      gatherCompletions(root_scope);
      keywords.forEach(maybeAdd);
    }
    if(found.length) {
      found.sort(function(a, b) {
        return a.score - b.score ||
          a.value.length - b.value.length ||
          a.value.localeCompare(b.value);
      });
    }
    return found.map(function(entry) {
      return entry.value;
    });
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

exports.PRDC_JSLAB_LIB_BASIC = PRDC_JSLAB_LIB_BASIC;
