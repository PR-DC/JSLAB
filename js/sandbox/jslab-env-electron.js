/**
 * @file JSLAB electron environment
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
  
if(!global.is_worker) {
  var { ipcRenderer } = require('electron');  
}

const { PRDC_JSLAB_FREECAD_LINK } = require('./freecad-link');
const { PRDC_JSLAB_OPENMODELICA_LINK } = require('./om-link');

const fs = require("fs");
const os = require('os');
const net = require('net');
const udp = require('dgram');
const cp = require("child_process");
const path = require("path");
const tcpPortUsed = require('tcp-port-used');
const { pathEqual } = require('path-equal');
const { Readable, Writable } = require('stream');
const { NativeModule } = require(getUnpackedPath('build/Release/native_module'));
const { AlphaShape3D } = require(getUnpackedPath('build/Release/alpha_shape_3d'));
const { extractFull } = require('node-7z');
const seedrandom = require('seedrandom');
const bin7zip = require('7zip-bin').path7za;
const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const { PolynomialRegression } = require('ml-regression-polynomial');
const recast = require('recast');
const babel_parser = require('@babel/parser');
var SourceMapConsumer = require("source-map").SourceMapConsumer;

/**
 * Class for JSLAB electron environment.
 */
class PRDC_JSLAB_ENV {

  /**
   * Constructs a electron environment submodule object with access to JSLAB's electron environment functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;

    if(!global.is_worker) {
      this.context = window;
      this.debug = ipcRenderer.sendSync("sync-message", "get-debug-flag");
      this.version = ipcRenderer.sendSync("sync-message", "get-app-version");
      this.platform = ipcRenderer.sendSync("sync-message", "get-platform");
      this.speech = new SpeechSynthesisUtterance();
      this.speech.voice = speechSynthesis.getVoices()[0];
      this.processors_number = navigator.hardwareConcurrency;
    } else {
      this.context = global;
      this.debug = global.debug;
      this.version = global.version;
      this.platform = global.platform;
      this.processors_number = undefined;
    }
    this.native_module = new NativeModule();
    this.AlphaShape3D = AlphaShape3D;
    this.bin7zip = bin7zip;
    this.seedRandom = seedrandom;
    
    this.math = this.context.math;
    this.PDFDocument = PDFDocument;
    this.SVGtoPDF = SVGtoPDF;
    this.PolynomialRegression = PolynomialRegression;
    this.os = os;
    this.net = net;
    this.udp = udp;
    this.tcpPortUsed = tcpPortUsed;
    this.recast = recast;
    this.babel_parser = babel_parser;
    this.SourceMapConsumer = SourceMapConsumer;
    this.SourceMapConsumer.initialize({
      "lib/mappings.wasm": app_path+'/node_modules/source-map/lib/mappings.wasm',
    });

    this.context.freecad_link = new PRDC_JSLAB_FREECAD_LINK(this.jsl);
    this.context.om_link = new PRDC_JSLAB_OPENMODELICA_LINK(this.jsl);
    
    // On IPC message
    if(!global.is_worker) {
      ipcRenderer.on("SandboxWindow", function(event, action, data) {
        switch(action) {
          case "eval-code":
            obj.jsl.eval.evalCodeFromMain(...data);
            break;
          case "get-completions":
            ipcRenderer.send("completions-" + data[0], obj.jsl.basic.getCompletions(data));
            break;
          case "stop-loop":
            obj.jsl.setStopLoop(data);
            break;
          case "run-last-script":
            obj.jsl.eval.runLast();
            break;
          case "set-current-path":
            obj.jsl.setPath(data);
            break;
          case "set-saved-paths":
            obj.jsl.setSavedPaths(data);
            break;
          case "set-language":
            language.set(data);
            obj.jsl.figures._updateLanguage();
            obj.jsl.windows._updateLanguage();
            break;
        }
      });
    }
    
    // Functions
    this.setImmediate = this.context.setImmediate;
    this.clearImmediate = this.context.clearImmediate;
    this.pathEqual = pathEqual;
    this.Readable = Readable;
    this.Writable = Writable;
    
    // Which properties and methods to export to context
    this.exports = ['debug', 'version', 'platform'];
  }

  /**
   * Opens a window based on the provided ID.
   * @param {number} id - The ID of the window to open.
   * @returns {(boolean|BrowserWindow)} - The opened window or false if the window does not exist.
   */
  openWindow(wid, file = "blank.html") {
    if(!global.is_worker) {
      var obj = this;
      var win = this.context.open(file, wid);
      var win_id = ipcRenderer.sendSync("sync-message", "get-last-window-id");
      win.addEventListener("error", function(err) {
        obj.error(err.error.stack);
      });
      
      var loadCheckInterval = setInterval(function() {
        try {
          if(isFinite(win.wid)) {
            clearInterval(loadCheckInterval);
          }
        } catch {
          win.close();
          obj.jsl.windows._closedWindow(wid);
          clearInterval(loadCheckInterval);
          obj.error('@openWindow: '+language.string(174));
        }
      }, 10);

      return [win, win_id, new Promise(function(resolve, reject) {
        win.addEventListener("DOMContentLoaded", function() {
          win.wid = wid;
          var script = win.document.createElement('script');
          script.textContent = obj.jsl.windows._bridge_code;
          win.document.body.appendChild(script);
          resolve([win, win_id])
        }, false);
      })];
    }
  };
  
  /**
   * Closes a window or all windows based on the provided ID.
   * @param {number} id - The ID of the window to close, or "all" to close all windows.
   */
  closeWindow(wid) {
    if(!global.is_worker) {
      var obj = this;
      if(wid == "all") {
        Object.keys(this.jsl.windows.open_windows).forEach(function(key) {
          if(obj.jsl.windows.open_windows[key].win.jsl_bridge) {
            obj.jsl.windows.open_windows[key].win.jsl_bridge.close();
          } else {
            obj.jsl.windows.open_windows[key].win.close();
          }
          obj.jsl.windows._closedWindow(key);
        });
      } else if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        if(obj.jsl.windows.open_windows[key].win.jsl_bridge) {
          obj.jsl.windows.open_windows[wid].win.jsl_bridge.close();
        } else {
          obj.jsl.windows.open_windows[key].win.close();
        }
        this.jsl.windows._closedWindow(wid);
      } else {
        return false;
      }
    }
  }

  /**
   * Brings a window into focus.
   * @param {number} id - The ID of the window to focus on.
   */
  focusWindow(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        ipcRenderer.sendSync("sync-message", "focus-win-by-id", this.jsl.windows.open_windows[wid].win_id);
      } else {
        return false;
      }
    }
  }
  
  /**
   * Clears local storage.
   */
  clearStorage(id) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "clear-storage");
    }
  }
  
  /**
   * Creates a directory at the specified path. If the directory already exists, no action is taken.
   * @param {string} directory - The path where the directory will be created.
   * @returns {boolean} True if the directory was created or already exists, false if an error occurred.
   */
  makeDirectory(directory) {
    try {
      fs.mkdirSync(directory, { recursive: true });
      return true
    } catch(err) {
      if(err.code === 'EEXIST') {
        return true;
      } else {
        return false;
      }
    }
  }
  
  /**
   * Checks if a directory exists at the specified path.
   * @param {string} directory - The path to the directory.
   * @returns {boolean} - True if the directory exists, false otherwise.
   */
  checkDirectory(directory) {
    var lstat = fs.lstatSync(directory, {throwIfNoEntry: false});
    if(lstat != undefined && lstat.isDirectory()) {
      return true;
    } else {
      return false;
    }
  }
  
  /**
   * Checks if a file exists at the specified path.
   * @param {string} file_path - The path to the file.
   * @returns {boolean} - True if the file exists, false otherwise.
   */
  checkFile(file_path) {
    var lstat = fs.lstatSync(file_path, {throwIfNoEntry: false});
    if(lstat != undefined && lstat.isFile()) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Checks if the provided path is an absolute path.
   * @param {string} file_path The file path to check.
   * @returns {boolean} True if the path is absolute, false otherwise.
   */
  isAbsolutePath(file_path) {
    if(typeof file_path === 'string') {
      return path.isAbsolute(file_path);
    } else {
      return false;
    }
  }

  /**
   * Joins all given path segments together using the platform-specific separator as a delimiter.
   * @param {...string} paths The path segments to join.
   * @returns {string} The combined path.
   */
  joinPath(...arg) {
    return path.join(...arg);
  }

  /**
   * Retrieves the platform-specific path separator.
   * @returns {string} The path separator.
   */
  getPathSep() {
    return path.sep;
  }
  
  /**
   * Extracts the basename of a path, possibly removing the specified extension.
   * @param {...string} paths The path to extract the basename from, followed by an optional extension to remove.
   * @returns {string} The basename of the path.
   */
  basenamePath(...arg) {
    return path.basename(...arg);
  }

  /**
   * Retrieves the file name without its extension from the given file path.
   * @param {string} file_path - The path to the file.
   * @returns {string} - The file name without the extension.
   */
  pathFileName(file_path) {
    return path.parse(file_path).name;
  }

  /**
   * Extracts the directory of file.
   * @param {String} path The filesystem path from which to extract the directory.
   * @returns {String} The directory from the given path.
   */
  pathDirName(file_path) {
    return path.dirname(file_path);
  }
  
  /**
   * Retrieves the file extension from the given file path.
   * @param {string} file_path - The path to the file.
   * @returns {string} - The file extension.
   */
  pathFileExt(file_path) {
    return path.extname(file_path);
  }

  /**
   * Reads the content of a file synchronously.
   * @param {string} file_path The path to the file.
   * @returns {(Buffer|string|false)} The file content or false in case of an error.
   */
  readFileSync(...arg) {
    try {
      return fs.readFileSync(...arg);
    } catch(err) {
      return false;
    }
  }

  /**
   * Copies a file synchronously with the given arguments.
   * @param {...any} arg - Arguments to pass to fs.copyFileSync.
   * @returns {boolean} - Returns true if the copy was successful, false otherwise.
   */
  copyFileSync(...arg) {
    try {
      return fs.copyFileSync(...arg);
    } catch(err) {
      return false;
    }
  }
  
  /**
   * Writes data to a file synchronously.
   * @param {string} file_path - The path to the file.
   * @param {any} data - The data to write.
   * @param {boolean} throw_flag - Whether to throw an error on failure.
   * @returns {boolean} - Returns true if the write was successful, false otherwise.
   */
	writeFileSync(file_path, data, throw_flag) {
    try {
      return fs.writeFileSync(file_path, data);
    } catch(err) {
      if(throw_flag) {
        this.error('@writeFileSync: '+err);
      }
      return false;
    }
  }

  /**
   * Removes a file or directory synchronously.
   * @param {string} path - The path to remove.
   * @param {boolean} [throw_flag=true] - Whether to throw an error on failure.
   * @returns {boolean} - Returns true if the removal was successful, false otherwise.
   */
  rmSync(path, throw_flag = true) {
    try {
      return fs.rmSync(path, { recursive: true, force: true });
    } catch(err) {
      if(throw_flag) {
        this.error('@rmSync: '+err);
      }
      return false;
    }
  }

  /**
   * Reads the contents of a directory synchronously.
   * @param {string} folder The path to the directory.
   * @returns {string[]|false} An array of filenames or false in case of an error.
   */
	readdirSync(...args) {
    try {
      return fs.readdirSync(...args);
    } catch(err) {
      this.error('@readdirSync: '+err);
      return false;
    }
  }

  /**
   * Displays a dialog to open files, asynchronously returning the selected files' paths.
   * @param {Object} options The options for the dialog.
   * @returns {Promise<string[]>} A promise that resolves to the paths of selected files.
   */
  showOpenDialog(options) {
    if(!global.is_worker) {
      return ipcRenderer.invoke("dialog", "showOpenDialog", options);
    }
  }

  /**
   * Displays a dialog to open files, synchronously returning the selected files' paths.
   * @param {Object} options The options for the dialog.
   * @returns {string[]} The paths of selected files.
   */
  showOpenDialogSync(options) {
    if(!global.is_worker) {
      return ipcRenderer.sendSync("dialog", "showOpenDialogSync", options);
    }
  }

  
  /**
   * Displays a dialog to save file, asynchronously returning the selected files' paths.
   * @param {Object} options The options for the dialog.
   * @returns {Promise<string[]>} A promise that resolves to the paths of selected files.
   */
  showSaveDialog(options) {
    if(!global.is_worker) {
      return ipcRenderer.invoke("dialog", "showSaveDialog", options);
    }
  }
  
  /**
   * Displays a dialog to save file, synchronously returning the selected files' paths.
   * @param {Object} options The options for the dialog.
   * @returns {string[]} The paths of selected files.
   */
  showSaveDialogSync(options) {
    if(!global.is_worker) {
      return ipcRenderer.sendSync("dialog", "showSaveDialogSync", options);
    }
  }

  /**
   * Displays a message box, synchronously returning the index of the clicked button.
   * @param {Object} options The options for the message box.
   * @returns {number} The index of the clicked button.
   */
  showMessageBox(options) {
    if(!global.is_worker) {
      return ipcRenderer.sendSync("dialog", "showMessageBoxSync", options);
    }
  }

  /**
   * Checks if a loop stop flag has been set, indicating whether to halt execution.
   * @returns {boolean} True if the loop should stop, false otherwise.
   */
  checkStopLoop() {
    if(!global.is_worker) {
      return ipcRenderer.sendSync("sync-message", "check-stop-loop");
    }
  }

  /**
   * Resets the loop stop flag to allow continued execution.
   * @returns {undefined} No return value.
   */
  resetStopLoop() {
    if(!global.is_worker) {
      return ipcRenderer.sendSync("sync-message", "reset-stop-loop");
    }
  }
  
  /**
   * Opens the editor window and optionally loads a script.
   * @param {string} filename - The path to the script file to open.
   */
  editor(filename) {
    if(!global.is_worker) {
      ipcRenderer.send("MainProcess", "show-editor");
      if(typeof filename == "string") {
        ipcRenderer.send("EditorWindow", "open-script", filename);
      }
    }
  }

  /**
   * Sends a message to display in the main window of the application.
   * @param {string} msg The message to be displayed.
   */
  disp(msg) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "disp", this.jsl.format.safeStringify(msg));
    }
  }

  /**
   * Sends a message to display latex in the main window of the application.
   * @param {string} expr The expression to be displayed.
   */
  dispLatex(expr) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "disp-latex", expr);
    }
  }
  
  /**
   * Triggers the display of CMD help content in the main window.
   */
  cmd_help() {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "help");
    }
  }

  /**
   * Triggers the display of informational content in the main window.
   */
  info() {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "info");
    }
  }

  /**
   * Opens the settings interface in the main window.
   */
  settings() {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "settings");
    }
  }

  /**
   * Sends an error message to be displayed in the main window.
   * @param {string} msg The error message to be displayed.
   */
  error(msg, throw_flag = true) {
    if(!global.is_worker) {
      if(throw_flag) {
        throw new Error(msg);
      } else {
        ipcRenderer.send("MainWindow", "error", this.jsl.format.safeStringify(msg));
      }
      this.jsl.stop_loop = true;
      this.jsl.onStopLoop(false);
      this.jsl.no_ans = true;
      this.jsl.ignore_output = true;
    }
  }

  /**
   * Sends an internal error message to be displayed, indicating an error within the application's internals.
   * @param {string} msg The internal error message.
   */
  errorInternal(msg) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "internal-error", msg);
    }
  }

  /**
   * Sends a warning message to be displayed in the main window.
   * @param {string} msg The warning message.
   */
  warn(msg) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "warn", msg);
    }
  }
  
  /**
   * Clears the command window, removing all current content.
   */
  clc() {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "clear");
    }
  }

  /**
   * Lists the contents of the current directory and returns them.
   * @returns {string[]} The contents of the current directory.
   */
  listFolderContents() {
    return fs.readdirSync(this.jsl.current_path);
  }
  
  /**
   * Requests an update of the file browser to reflect current directory or file changes.
   */
  updateFileBrowser() {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "update-file-browser");
    }
  }

  /**
   * Displays the result of an operation in the workspace area of the main window.
   * @param {string} data The data or result to display.
   */
  showAns(data) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "show-ans", data);
    }
  }

  /**
   * Requests an update of the workspace to reflect changes in variables or state.
   */
  updateWorkspace() {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "update-workspace");
    }
  }

  /**
   * Sets the workspace with the provided data, replacing the current state.
   */
  setWorkspace() {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "set-workspace", this.jsl.getWorkspace());
    }
  }
  
  /**
   * Saves a new path to the application's memory for quick access.
   * @param {string} new_path The path to save.
   */
  savePath(new_path) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "save-path", new_path);
    }
  }

  /**
   * Removes a previously saved path from the application's memory.
   * @param {string} saved_path The path to remove.
   */
  removePath(saved_path) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "remove-path", saved_path);
    }
  }

  /**
   * Sets the application's status message.
   * @param {string} state The current state of the application.
   * @param {string} txt The text message to display as status.
   */
  setStatus(state, txt) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "set-status", [state, txt]);
    }
  }

  /**
   * Updates the application's statistics, typically displayed in the status bar or a similar area.
   * @param {object} stats The statistical data to set.
   */
  setStats(stats) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "set-stats", stats);
    }
  }
  
  /**
   * Notifies the main window that code evaluation has started.
   */
  codeEvaluating() {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "code-evaluating");
    }
  }
  
  /**
   * Notifies the main window that code evaluation has finished.
   */
  codeEvaluated() {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "code-evaluated");
    }
  }

  /**
   * Checks if a script resides within the current active directory or a saved directory, and if not, prompts to find the script.
   * @param {string} script_path The path of the script to check.
   * @returns {boolean} Returns true if the script directory is unknown, prompting for location; otherwise false.
   */
  checkScriptDir(script_path) {
    var script_dir = this.addPathSep(path.dirname(this.jsl.last_script_path));
    if(pathEqual(script_dir, this.jsl.current_path) ||
        this.jsl.saved_paths.includes(script_dir)) {
      return false;
    } else {
      ipcRenderer.send("MainWindow", "unknown-script-dir");
      return true;
    }
  }

  /**
   * Ensures a path string ends with a path separator, appending one if necessary.
   * @param {string} path_str The path string to modify.
   * @returns {string} The modified path string with a trailing separator.
   */
  addPathSep(path_str) {
    if(path_str && path_str[path_str.length-1] != path.sep) {
      path_str += path.sep;
    }
    return path_str;
  }
  
  /**
   * Changes the current working directory to the specified path.
   * @param {string} new_path The path to set as the current working directory.
   */
  cd(new_path) {
    if(!global.is_worker) {
      ipcRenderer.send("MainWindow", "set-current-path", new_path,
        undefined, false);
    }
  }

  /**
   * Retrieves a default path based on a specified type, e.g., documents, downloads.
   * @param {string} type The type of default path to retrieve.
   * @returns {string} The default path for the specified type.
   */
  getDefaultPath(type) {
    if(!global.is_worker) {
      return ipcRenderer.sendSync("sync-message", "get-path", type) + path.sep;
    }
  }

  /**
   * Opens the specified folder in the file manager.
   * @param {string} file_path The path of the folder to open.
   */
  openFolder(file_path) {
    if(!global.is_worker) {
      return ipcRenderer.send("MainProcess", "open-folder", file_path);
    }
  }

  /**
   * Opens the specified directory in the file manager. This method is similar to `openFolder`.
   * @param {string} file_path The path of the directory to open.
   */
  openDir(file_path) {
    if(!global.is_worker) {
      return ipcRenderer.send("MainProcess", "open-dir", file_path);
    }
  }

  /**
   * Shows the specified file in the folder using the file manager.
   * @param {string} file_path The path of the file to show.
   */
  showFileInFolder(file_path) {
    if(!global.is_worker) {
      return ipcRenderer.send("MainProcess", "show-file-in-folder", file_path);
    }
  }

  /**
   * Shows the specified file in the directory using the file manager. This is similar to `showFileInFolder`.
   * @param {string} file_path The path of the file to highlight.
   */
  showFileInDir(file_path) {
    if(!global.is_worker) {
      return ipcRenderer.send("MainProcess", "show-file-in-dir", file_path);
    }
  }
  
  /**
   * Executes a system command assynchronously.
   * @param {...*} args Command arguments.
   */
  exec(...args){
    return cp.exec(...args);
  }
  
  /**
   * Executes a system command synchronously and returns the result.
   * @param {...*} args Command arguments.
   * @returns {*} The result of the command execution.
   */
  execSync(...args){
    return cp.execSync(...args);
  }
  
  /**
   * Spawns child process assynchronously.
   * @param {...*} args Command arguments.
   */
  spawn(...args){
    return cp.spawn(...args);
  }
  
  /**
   * Resets the sandbox environment by sending a synchronous IPC message if not in a worker.
   * @returns {void}
   */
  resetSandbox() {
    if(!global.is_worker) {
      ipcRenderer.sendSync("sync-message", "reset-sandbox");
    }
  }
}

exports.PRDC_JSLAB_ENV = PRDC_JSLAB_ENV;