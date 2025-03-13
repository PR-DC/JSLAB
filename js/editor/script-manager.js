/**
 * @file JSLAB editor script manager module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_EDITOR_SCRIPT } = require('./script');

const fs = require('fs');
const { pathEqual } = require('path-equal');
const Store = require('electron-store');
const { ESLint } = require("eslint");
const path = require("path");

const store = new Store();

/**
 * Class for JSLAB editor script.
 */
class PRDC_JSLAB_EDITOR_SCRIPT_MANAGER {

  /**
   * Initializes the script manager with references to the application window and sets up event listeners for tab interactions.
   * @param {object} win The application window where the editor is hosted.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    this.scripts = [];
    this.last_script_paths = [];
    this.last_active_script;
    this.active_tab;
    this.close_window = false;
    this.tabs = new PRDC_TABS();
    
    this.eslint = new ESLint(config.LINT_OPTIONS);
    
    // Tabs
    this.tabs_cont = document.querySelector(".tabs");
    this.tabs.init(this.tabs_cont);
    
    // On tab add
    this.tabs_cont.addEventListener("tabAdd", function({ detail }) {
      $("#close-dialog-cont").hide();
      detail.tabEl.onmousedown = function (e) {
        if(e && (e.which == 2 || e.button == 4)) {
          obj.removeScriptByTab(detail.tabEl);
        }
      };
    });

    // On tab remove
    this.tabs_cont.addEventListener("tabRemove", function() {
      if(obj.scripts.length == 0) {
        if(obj.close_window) {
          store.set("last_script_paths", obj.last_script_paths);
          store.set("last_active_script", obj.last_active_script);
          ipcRenderer.send("MainProcess", "close-editor");
        } else {
          obj.createScript();
        }
      }
    });

    // On tab close
    this.tabs_cont.addEventListener("tabClose", function({ detail }) {
      obj.removeScriptByTab(detail.tabEl);
    });

    // On tab change
    this.tabs_cont.addEventListener("activeTabChange", function({ detail }) {
      if(obj.active_tab !== undefined) {
        // Update code to last active_tab
        var [script] = obj.getScriptByTab(obj.active_tab);
        if(script !== undefined) {
          script.update();
        }
      }
      obj.active_tab = detail.tabEl;
      var [script] = obj.getScriptByTab(obj.active_tab);
      if(script !== undefined) {
        if(!script.closing) {
          $("#close-dialog-cont").hide();
        }
        script.show();
      }
      obj.updateActiveExtension(script);
    });

    
    // On start up
    var argv = ipcRenderer.sendSync('sync-message', 'get-process-arguments');
    var file_path = argv.find(arg => arg.endsWith('.jsl')); // path as argument
    var script_paths = store.get("last_script_paths"); // last opened scripts
    if(file_path) {
      if(script_paths) {
        script_paths.push(file_path);
      } else {
        script_paths = [file_path];
      }
    }
    if(script_paths) {
      script_paths.forEach(function(script_path) {
        var lstat = fs.lstatSync(script_path, {throwIfNoEntry: false});
        if(lstat && lstat.isFile()) {
          var [script, i] = obj.getScriptByPath(script_path);
          if(script == undefined) {
            obj.createScript(script_path);
          } else {
            script.activate();
          }
        }
      });
    }
    
    if(this.scripts.length > 0) {
      if(file_path) {
        this.activateScriptByPath(file_path);
      } else {
        var last_active_script = store.get("last_active_script");
        if(last_active_script) {
          this.activateScriptByPath(last_active_script);
        }
      }
      this.win.showEditor();
    } else {
      // New tab
      this.createScript();
    }
  }
  
  /**
   * Saves the currently active script.
   */
  saveScript() {
    this.getScriptByTab(this.active_tab)[0].save();
  }
  
  /**
   * Saves the currently active script under a new file name.
   */
  saveAsScript() {
    this.getScriptByTab(this.active_tab)[0].saveAs();
  }
  
  /**
   * Opens search dialog for currently active script.
   */
  openSearchDialog() {
    this.getScriptByTab(this.active_tab)[0].openSearchDialog();
  }
  
  /**
   * Compiles arduino code.
   */
  compileArduino() {
    this.getScriptByTab(this.active_tab)[0].compileArduino();
  }
  
  /**
   * Uploads arduino code.
   */
  uploadArduino() {
    this.getScriptByTab(this.active_tab)[0].uploadArduino();
  }
  
  /**
   * Opens a script file from the filesystem into the editor.
   */
  openScriptFile() {
    var obj = this;
    let options = {
      title: language.currentString(146),
      buttonLabel: language.currentString(147),
      filters: [
        { name: "All Files", extensions: ["*"] },
      ],
    };

    ipcRenderer.invoke("dialog", "showOpenDialog", options)
      .then(function(result) {
        if(result.canceled) return obj.win.editor.disp("@editor/openScriptFile: "+language.string(132));
        var open_path = result.filePaths[0];
        var [script, i] = obj.getScriptByPath(open_path);
        if(script == undefined) {
          obj.createScript(open_path);
        } else {
          script.activate();
        }
      }).catch(function(err) {
        obj.win.editor.errorInternal(err);
      });
  }
  
  /**
   * Opens a script by its path if not already open, or activates it if it is already open.
   * @param {Array<string, number>} data - An array where the first element is the script path and the second is the line number.
   */
  openScript(data) {
    var script_path = data[0];
    var script_lineno = data[1];
    var script_charpos = data[2];
    var lstat = fs.lstatSync(script_path, {throwIfNoEntry: false});
    if(lstat && lstat.isFile()) {
      var [script, i] = this.getScriptByPath(script_path);
      if(script == undefined) {
        this.createScript(script_path, script_lineno, script_charpos);
      } else {
        this.win.editor.disp("@editor/openScript: "+language.string(133)+" "+script_path+" "+language.string(134)+"!", false);
        script.activate();
        script.setLine(script_lineno, script_charpos);
      }
    }
  }
  
  /**
   * Executes the currently active script.
   */
  runScript() {
    this.getScriptByTab(this.active_tab)[0].run();
  }

  /**
   * Creates a new script tab and editor instance, loading the script from the given path.
   * @param {string} path - The file path of the script to load.
   * @param {number} lineno - The line number to navigate to in the newly created script.
   * @param {number} charpos - The char position to navigate to in the newly created script.
   */
  createScript(path, lineno, charpos) {
    this.tab = this.tabs.addTab();
    var script = new PRDC_JSLAB_EDITOR_SCRIPT(this.win, this, path, this.tab);
    script.setLine(lineno, charpos);
    this.scripts.push(script);
  }
  
  /**
   * Toggles the comment state of the selected lines in the currently active script tab.
   * This action uses the active tab's associated script editor to apply or remove comments.
   */
  toggleComment() {
    this.getScriptByTab(this.active_tab)[0].toggleComment();
  }
  
  /**
   * Activates the script associated with the given tab element.
   * @param {HTMLElement} tab The tab element associated with the script to activate.
   */
  activateScriptByTab(tab) {
    this.tabs.setCurrentTab(tab);
  }

  /**
   * Activates the script associated with the given filesystem path.
   * @param {string} script_path The path to the script to activate.
   */
  activateScriptByPath(script_path) {
    var [script, i] = this.getScriptByPath(script_path);
    if(script != undefined) {
      this.activateScriptByTab(script.tab);
    }
  }
  
  /**
   * Retrieves the script object and its index associated with the given tab element.
   * @param {HTMLElement} tab The tab element associated with the script.
   * @returns {Array} An array containing the script object and its index in the scripts array.
   */
  getScriptByTab(tab) {
    var i = this.scripts.findIndex(function(script) {
      return script.tab == tab;
    });
    if(i > -1) {
      return [this.scripts[i], i];
    } else {
      return [undefined, -1];
    }
  }

  /**
   * Retrieves the script object and its index associated with the given filesystem path.
   * @param {string} script_path The path to the script.
   * @returns {Array} An array containing the script object and its index in the scripts array.
   */
  getScriptByPath(script_path) {
    var i = this.scripts.findIndex(function(script) {
      return pathEqual(script.path, script_path);
    });
    if(i > -1) {
      return [this.scripts[i], i];
    } else {
      return [undefined, -1];
    }
  }
  
  /**
   * Updates the name displayed on a script's tab.
   * @param {HTMLElement} tab The tab element associated with the script.
   * @param {string} name The new name to display on the tab.
   */
  setScriptNameByTab(tab, name) {
    this.tabs.updateTab(tab, {
      title: name,
      favicon: false
    }); 
  }
  
  /**
   * Removes the script associated with the given tab element from the manager and UI.
   * @param {HTMLElement} tab The tab element associated with the script to remove.
   */
  removeScriptByTab(tab) {
    var [script, i] = this.getScriptByTab(tab);
    script.activate();
    if(script.remove()) {
      this.scripts[i].removeCodeEditor();
      this.scripts.splice(i, 1);
      this.tabs.removeTab(tab);
    }
  }
  
  /**
   * Initiates the closure of all open scripts, optionally persisting their state for future sessions.
   */
  closeAllScripts() {
    var obj = this;
    this.close_window = true;
    this.last_script_paths = [];
    this.last_active_script = this.active_tab.getAttribute('title');

    this.tabs_cont.querySelectorAll('.tabs-content .tab').forEach(function(tab) {
      var path = tab.getAttribute('title');
      if(path) {
        obj.last_script_paths.push(path);
      }
    });
    
    ipcRenderer.send("MainProcess", "focus-win");
    $("#close-dialog-cancel").hide();
    for(var i = this.scripts.length - 1; i >= 0; i--) {
      var tab = this.scripts[i].tab;
      if(this.scripts[i].remove()) {
        this.scripts[i].removeCodeEditor();
        this.scripts.splice(i, 1);
        this.tabs.removeTab(tab);
      }
    }
  }

  /**
   * Checks if a script with the given filesystem path is already open in the editor.
   * @param {string} script_path The path to the script to check.
   * @returns {boolean} True if the script is already open, false otherwise.
   */
  checkScriptOpenByPath(script_path) {
    var [script, i] = this.getScriptByPath(script_path);
    return !(script == undefined);
  }
  
  /**
   * Handles user interaction with the script closing dialog, determining whether to save changes, discard them, or cancel the closure.
   * @param {number} s - button state
   */
  closingDialogButton(s) {
    var [script, i] = this.getScriptByTab(this.active_tab);
    var tab = this.scripts[i].tab;
    var script_path = this.scripts[i].path;
    if(s == 2 || s == 1) {
      if(s == 2) {
        this.scripts[i].save();
        script_path = this.scripts[i].path;
      }
      this.scripts[i].removeCodeEditor();
      this.scripts.splice(i, 1);
      this.tabs.removeTab(tab);
    } else {
      this.scripts[i].closing = false;
      $("#close-dialog-cont").hide();
    }
    if(this.close_window && script_path !== undefined) {
      this.last_script_paths.push(script_path);
    }
  }
  
  /**
   * Updates body class based on active extension of script 
   */
  updateActiveExtension(script) {
    if(script && (typeof script.path === 'string' || script.path instanceof String)) {
      $(document.body).attr("class", 'file-' + path.extname(script.path).substring(1));
    } else {
      $(document.body).attr("class", '');
    }
  }
}

exports.PRDC_JSLAB_EDITOR_SCRIPT_MANAGER = PRDC_JSLAB_EDITOR_SCRIPT_MANAGER