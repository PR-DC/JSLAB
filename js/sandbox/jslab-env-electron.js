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
const { NativeModule } = require(app_path + '/build/Release/native_module');
const { AlphaShape3D } = require(app_path + '/build/Release/alpha_shape_3d');
const { extractFull } = require('node-7z');
const seedrandom = require('seedrandom');
const bin7zip = require('7zip-bin').path7za;
const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const { PolynomialRegression } = require('ml-regression-polynomial');
const recast = require('recast');
const babel_parser = require('@babel/parser');
var SourceMapConsumer = require("source-map").SourceMapConsumer;
var { SerialPort } = require('serialport');

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
      this.exe_path = ipcRenderer.sendSync("sync-message", "get-path", "exe");
      this.platform = ipcRenderer.sendSync("sync-message", "get-platform");
      this.speech = new SpeechSynthesisUtterance();
      this.speech.voice = speechSynthesis.getVoices()[0];
      this.navigator = navigator;
      this.processors_number = navigator.hardwareConcurrency;
    } else {
      this.context = global;
      this.debug = global.debug;
      this.version = global.version;
      this.exe_path = undefined;
      this.platform = global.platform;
      this.processors_number = undefined;
    }
    this.native_module = new NativeModule();
    this.AlphaShape3D = AlphaShape3D;
    this.bin7zip = bin7zip;
    this.seedRandom = seedrandom;
    this.extractFull = extractFull;
    
    this.Cesium = Cesium;
    this.process_pid = process.pid;
    this.math = this.context.math;
    this.fmin = this.context.fmin;
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
    this.SerialPort = SerialPort;

    this.online = this.navigator.onLine;
    function onOnlineChange() {
      obj.online = obj.navigator.onLine;
    }
    this.context.addEventListener('online', onOnlineChange);
    this.context.addEventListener('offline', onOnlineChange);
    
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
      var sub_context = this.context.open(file, wid);
      sub_context.addEventListener("error", function(err) {
        if(err && err.hasOwnProperty('error')) {
          obj.error(err.error.stack);
        } else {
          obj.error(err.message);
        }
      });
      
      var loadCheckInterval = setInterval(function() {
        try {
          if(isFinite(sub_context.wid)) {
            clearInterval(loadCheckInterval);
          }
        } catch {
          sub_context.close();
          obj.jsl.windows._closedWindow(wid);
          clearInterval(loadCheckInterval);
          obj.error('@openWindow: '+language.string(174));
        }
      }, 10);

      return [sub_context, new Promise(function(resolve) {
        sub_context.addEventListener("DOMContentLoaded", function() {
          sub_context.wid = wid;
          
          sub_context.show = function() {
            return obj.jsl.windows.open_windows[wid].show();
          };
          sub_context.hide = function() {
            return obj.jsl.windows.open_windows[wid].hide();
          };
          sub_context.focus = function() {
            return obj.jsl.windows.open_windows[wid].focus();
          };
          sub_context.minimize = function() {
            return obj.jsl.windows.open_windows[wid].minimize();
          };
          sub_context.center = function() {
            return obj.jsl.windows.open_windows[wid].center();
          };
          sub_context.moveTop = function() {
            return obj.jsl.windows.open_windows[wid].moveTop();
          };
          
          
          sub_context.setSize = function(width, height) {
            return obj.jsl.windows.open_windows[wid].setSize(width, height);
          };
          sub_context.setPos = function(left, top) {
            return obj.jsl.windows.open_windows[wid].setPos(left, top);
          };
          sub_context.setResizable = function(state) {
            return obj.jsl.windows.open_windows[wid].setResizable(state);
          };
          sub_context.setMovable = function(state) {
            return obj.jsl.windows.open_windows[wid].setMovable(state);
          };
          sub_context.setAspectRatio = function(aspect_ratio) {
            return obj.jsl.windows.open_windows[wid].setMovable(aspect_ratio);
          };
          sub_context.setOpacity = function(opacity) {
            return obj.jsl.windows.open_windows[wid].setOpacity(opacity);
          };
          sub_context.setTitle = function(title) {
            return obj.jsl.windows.open_windows[wid].setTitle(title);
          };
          
          sub_context.getSize = function() {
            return obj.jsl.windows.open_windows[wid].getSize();
          };
          sub_context.getPos = function() {
            return obj.jsl.windows.open_windows[wid].getPos();
          };
          
          sub_context.openDevTools = function() {
            return obj.jsl.windows.open_windows[wid].openDevTools();
          };
          
          sub_context.document.addEventListener("keydown", function (e) {
            if(e.ctrlKey && e.key.toLowerCase() == 'c') {
              if(obj.getWinSelectionText(sub_context) == "") {
                // No selected text
                obj.jsl.setStopLoop(true);
                e.stopPropagation();
                e.preventDefault();
              }
            }
          });
          resolve(sub_context);
        }, false);
      })];
    }
  }

  /**
   * Retrieves the selected text from a given window.
   * @param {Window} context - The window context to get the selection text from.
   * @returns {string} - The selected text.
   */
  getWinSelectionText(context) {
    var text = "";
    if(context.getSelection) {
        text = context.getSelection().toString();
    } else if(context.document.selection && context.document.selection.type != "Control") {
        text = context.document.selection.createRange().text;
    }
    return text;
  }
  
  /**
   * Closes a window or all windows based on the provided ID.
   * @param {number} id - The ID of the window to close, or "all" to close all windows.
   */
  closeWindow(wid) {
    if(!global.is_worker) {
      var obj = this;
      if(wid == "all") {
        Object.keys(this.jsl.windows.open_windows).forEach(function(key) {
          obj.jsl.windows.open_windows[key].context.close();
          obj.jsl.windows._closedWindow(key);
        });
        return true;
      } else if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        obj.jsl.windows.open_windows[key].context.close();
        obj.jsl.windows._closedWindow(key);
        return true;
      }
    }
    return false;
  }

  /**
   * Shows the specified window.
   * @param {number} wid - The ID of the window to show.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  showWindow(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, 'show']);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Hides the specified window.
   * @param {number} wid - The ID of the window to hide.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  hideWindow(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, 'hide']);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Brings the specified window to the foreground.
   * @param {number} wid - The ID of the window to focus.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  focusWindow(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, 'focus']);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Minimizes the specified window.
   * @param {number} wid - The ID of the window to minimize.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  minimizeWindow(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, 'minimize']);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Centers the specified window on the screen.
   * @param {number} wid - The ID of the window to center.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  centerWindow(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, 'center']);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Moves the specified window to the top.
   * @param {number} wid - The ID of the window to move to top.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  moveTopWindow(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, 'moveTop']);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Sets the size of a specified window.
   * @param {number} wid - The ID of the window.
   * @param {number} width - The new width of the window.
   * @param {number} height - The new height of the window.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  setWindowSize(wid, width, height) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        return ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, "setSize", width, height]);
      }
    }
    return false;
  }
  
  /**
   * Sets the position of a specified window.
   * @param {number} wid - The ID of the window.
   * @param {number} left - The new left position of the window.
   * @param {number} top - The new top position of the window.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  setWindowPos(wid, left, top) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        return ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, "setPosition", left, top]);
      }
    }
    return false;
  }
  
  /**
   * Sets whether the specified window is resizable.
   * @param {number} wid - The ID of the window.
   * @param {boolean} state - The resizable state to set.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  setWindowResizable(wid, state) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        return ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, "setResizable", state]);
      }
    }
    return false;
  }
  
  /**
   * Sets whether the specified window is movable.
   * @param {number} wid - The ID of the window.
   * @param {boolean} state - The movable state to set.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  setWindowMovable(wid, state) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        return ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, "setMovable", state]);
      } else {
        return false;
      }
    }
  }
  
  /**
   * Sets the aspect ratio of the specified window.
   * @param {number} wid - The ID of the window.
   * @param {number} aspect_ratio - The aspect ratio to set (width/height).
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  setWindowAspectRatio(wid, aspect_ratio) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        return ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, "setAspectRatio", aspect_ratio]);
      }
    }
    return false;
  }
  
  /**
   * Sets the opacity of the specified window.
   * @param {number} wid - The ID of the window.
   * @param {number} opacity - The opacity level to set (0.0 to 1.0).
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  setWindowOpacity(wid, opacity) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        return ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, "setOpacity", opacity]);
      }
    }
    return false;
  }
  
  /**
   * Sets the title of the specified window if not running in a worker thread.
   * @param {string} wid - The window ID.
   * @param {string} title - The new title for the window.
   * @returns {boolean|undefined} False if the window does not exist, undefined if in a worker thread.
   */
  setWindowTitle(wid, title) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        this.jsl.windows.open_windows[wid].context.document.title = title;
      }
    }
    return false;
  }
  
  /**
   * Retrieves the size of a specified window.
   * @param {number} wid - The ID of the window.
   * @returns {Array|boolean} - Returns an array [width, height] or false if the window ID is invalid.
   */
  getWindowSize(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        return ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, "getSize"]);
      }
    }
    return false;
  }
  
  /**
   * Retrieves the position of a specified window.
   * @param {number} wid - The ID of the window.
   * @returns {Array|boolean} - Returns an array [left, top] or false if the window ID is invalid.
   */
  getWindowPos(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        return ipcRenderer.sendSync("sync-message", "call-sub-win-method", 
          [wid, "getPosition"]);
      }
    }
    return false;
  }
  
  /**
   * Opens the developer tools for a specified window in the renderer process.
   * Only available if not in a worker context.
   * @param {string} wid - The window ID.
   * @returns {boolean} True if the developer tools were opened; otherwise, false.
   */
  openWindowDevTools(wid) {
    if(!global.is_worker) {
      if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
        return ipcRenderer.sendSync("sync-message", "open-sub-win-devtools", wid);
      }
    }
    return false;
  }
  
  /**
   * Opens the developer tools for the sandbox environment.
   */
  openSandboxDevTools() {
    ipcRenderer.send("MainProcess", "show-sandbox-dev-tools");
  }
  
  /**
   * Clears local storage.
   */
  clearStorage() {
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
      return true;
    } catch(err) {
      this.jsl._console.log(err);
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
  pathIsAbsolute(file_path) {
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
  pathJoin(...arg) {
    return path.join(...arg);
  }

  /**
   * Retrieves the platform-specific path separator.
   * @returns {string} The path separator.
   */
  pathGetSep() {
    return path.sep;
  }
  
  /**
   * Extracts the basename of a path, possibly removing the specified extension.
   * @param {...string} paths The path to extract the basename from, followed by an optional extension to remove.
   * @returns {string} The basename of the path.
   */
  pathBaseName(...arg) {
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
  pathExtName(file_path) {
    return path.extname(file_path);
  }
  
  /**
   * Resolves a sequence of path segments into an absolute path.
   * @param {string} path_in - The path or sequence of paths to resolve.
   * @returns {string} - The resolved absolute path.
   */
  pathResolve(path_in) {
    return path.resolve(path_in);
  }
    
  /**
   * Normalizes a given path, resolving '..' and '.' segments.
   * @param {string} path - The path to normalize.
   * @returns {string} - The normalized path.
   */
  pathNormalize(path_in) {
    return path.normalize(path_in);
  }
    
  /**
   * Parses a file path into its component parts.
   * @param {string} path - The file path to parse.
   * @returns {Object} An object containing properties like `root`, `dir`, `base`, `ext`, and `name`.
   */
  pathParse(path_in) {
    return path.parse(path_in);
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
      this.jsl._console.log(err);
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
      this.jsl._console.log(err);
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
      this.jsl._console.log(err);
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
  rmSync(path_in, throw_flag = true) {
    try {
      return fs.rmSync(path_in, { recursive: true, force: true });
    } catch(err) {
      this.jsl._console.log(err);
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
      this.jsl._console.log(err);
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
    return false;
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
    return false;
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
    return false;
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
    return false;
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
    return false;
  }

  /**
   * Checks if a loop stop flag has been set, indicating whether to halt execution.
   * @returns {boolean} True if the loop should stop, false otherwise.
   */
  checkStopLoop() {
    if(!global.is_worker) {
      return ipcRenderer.sendSync("sync-message", "check-stop-loop");
    }
    return false;
  }

  /**
   * Resets the loop stop flag to allow continued execution.
   * @returns {undefined} No return value.
   */
  resetStopLoop() {
    if(!global.is_worker) {
      return ipcRenderer.sendSync("sync-message", "reset-stop-loop");
    }
    return false;
  }
  
  /**
   * Opens the editor window and optionally loads a script.
   * @param {string} filename - The path to the script file to open.
   * @param {number} lineno - Line number to highlight.
   */
  editor(filename, lineno) {
    if(!global.is_worker) {
      ipcRenderer.send("MainProcess", "show-editor");
      if(typeof filename == "string") {
        ipcRenderer.send("EditorWindow", "open-script", [filename, lineno]);
      }
    }
  }

  /**
   * Sends a message to display in the main window of the application.
   * @param {...any} args - The messages to send for display in the main window.
   */
  disp(...args) {
    if(!global.is_worker) {
      var obj = this;
      args.forEach(function(msg) {
        ipcRenderer.send("MainWindow", "disp", obj.jsl.format.safeStringify(msg));
      });
    }
  }

  /**
   * Sends a message to display in the main window of the application with monospaced font.
   * @param {...any} args - The messages to send for display in the main window with monospaced font.
   */
  dispMonospaced(...args) {
    if(!global.is_worker) {
      var obj = this;
      args.forEach(function(msg) {
        ipcRenderer.send("MainWindow", "disp-monospaced", obj.jsl.format.safeStringify(msg));
      });
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
      this.jsl.stop_loop = true;
      this.jsl.onStopLoop(false);
      this.jsl.no_ans = true;
      this.jsl.ignore_output = true;
      this.jsl.onEvaluated();
      if(throw_flag) {
        throw new Error(msg);
      } else {
        ipcRenderer.send("MainWindow", "error", this.jsl.format.safeStringify(msg));
      }
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
      ipcRenderer.send("MainProcess", "code-evaluated");
    }
  }

  /**
   * Checks if a script resides within the current active directory or a saved directory, and if not, prompts to find the script.
   * @param {string} script_path The path of the script to check.
   * @returns {boolean} Returns true if the script directory is unknown, prompting for location; otherwise false.
   */
  checkScriptDir(script_path) {
    var script_dir = this.addPathSep(path.dirname(script_path));
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
    return false;
  }

  /**
   * Opens the specified folder in the file manager.
   * @param {string} file_path The path of the folder to open.
   */
  openFolder(file_path) {
    if(!global.is_worker) {
      return ipcRenderer.send("MainProcess", "open-folder", file_path);
    }
    return false;
  }

  /**
   * Opens the specified directory in the file manager. This method is similar to `openFolder`.
   * @param {string} file_path The path of the directory to open.
   */
  openDir(file_path) {
    if(!global.is_worker) {
      return ipcRenderer.send("MainProcess", "open-dir", file_path);
    }
    return false;
  }

  /**
   * Shows the specified file in the folder using the file manager.
   * @param {string} file_path The path of the file to show.
   */
  showFileInFolder(file_path) {
    if(!global.is_worker) {
      return ipcRenderer.send("MainProcess", "show-file-in-folder", file_path);
    }
    return false;
  }

  /**
   * Shows the specified file in the directory using the file manager. This is similar to `showFileInFolder`.
   * @param {string} file_path The path of the file to highlight.
   */
  showFileInDir(file_path) {
    if(!global.is_worker) {
      return ipcRenderer.send("MainProcess", "show-file-in-dir", file_path);
    }
    return false;
  }
  
  /**
   * Retrieves desktop sources synchronously by sending an IPC message.
   * @returns {DesktopSource[]|undefined} An array of desktop sources if not in a worker, otherwise undefined.
   */
  getDesktopSources() {
    if(!global.is_worker) {
      return ipcRenderer.sendSync("get-desktop-sources");
    }
    return false;
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
   * Spawns child process synchronously.
   * @param {...*} args Command arguments.
   */
  spawnSync(...args){
    return cp.spawnSync(...args);
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
  
  /**
   * Resets the app.
   * @returns {void}
   */
  resetApp() {
    if(!global.is_worker) {
      ipcRenderer.sendSync("sync-message", "reset-app");
    }
  }
}

exports.PRDC_JSLAB_ENV = PRDC_JSLAB_ENV;