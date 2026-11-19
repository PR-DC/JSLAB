/**
 * @file JSLAB editor script manager module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_CODE_LINT } = require('../code/lint');
const { PRDC_JSLAB_UI_CLOSE_DIALOG } = require('../windows/ui');

const { PRDC_JSLAB_EDITOR_SCRIPT } = require('./script');


/**
 * Class for JSLAB editor script.
 */
class PRDC_JSLAB_EDITOR_SCRIPT_MANAGER {

  /**
   * Initializes the script manager with references to the application window and sets up event listeners for tab interactions.
   * @param {object} win The application window where the editor is hosted.
   */
  constructor(win) {
    const { fs, store, host } = win.platform;
    var obj = this;
    this.win = win;

    this.scripts = [];
    this.last_script_paths = [];
    this.last_active_script;
    this.active_tab;
    this.close_window = false;
    this.close_dialog = new PRDC_JSLAB_UI_CLOSE_DIALOG(document, choice => this.closingDialogButton(choice));
    this.tabs = new PRDC_TABS();

    this.eslint = new PRDC_JSLAB_CODE_LINT();

    // Tabs
    this.tabs_cont = document.querySelector(".tabs");
    this.tabs.init(this.tabs_cont);
    this.tabs_cont.addEventListener('tabNew', function(event) {
      event.preventDefault();
      obj.createScript();
    });

    // On tab add
    this.tabs_cont.addEventListener("tabAdd", function({ detail }) {
      obj.close_dialog.hide();
      detail.tabEl.onmousedown = function(e) {
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
          host.send("MainProcess", "close-editor");
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
          obj.close_dialog.hide();
        }
        script.show();
      }
      obj.updateActiveExtension(script);
    });


    // On start up
    var argv = win.platform.getArguments();
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
    return this.getScriptByTab(this.active_tab)[0].save();
  }

  /**
   * Saves the currently active script under a new file name.
   */
  saveAsScript() {
    return this.getScriptByTab(this.active_tab)[0].saveAs();
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
    const { host } = this.win.platform;
    var obj = this;
    let options = {
      title: language.currentString(146),
      buttonLabel: language.currentString(147),
      filters: [
        { name: language.currentString(345), extensions: ["*"] },
      ],
    };

    host.invoke("dialog", "showOpenDialog", options)
      .then(function(result) {
        if(result.canceled) {
          return obj.win.editor.disp("@editor/openScriptFile: " + language.string(132));
        }
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
    const { fs } = this.win.platform;
    var script_path = data[0];
    var script_lineno = data[1];
    var script_charpos = data[2];
    var lstat = fs.lstatSync(script_path, {throwIfNoEntry: false});
    if(lstat && lstat.isFile()) {
      var [script, i] = this.getScriptByPath(script_path);
      if(script == undefined) {
        this.createScript(script_path, script_lineno, script_charpos);
      } else {
        this.win.editor.disp("@editor/openScript: " + language.string(133) + " " + script_path + " " + language.string(134) + "!", false);
        script.activate();
        script.setLine(script_lineno, script_charpos);
      }
    }
  }

  /**
   * Executes the currently active script.
   */
  runScript() {
    var [script] = this.getScriptByTab(this.active_tab);
    if(script !== undefined) {
      script.run();
    }
  }

  /**
   * Executes only the current section in the active script.
   */
  runCurrentSection() {
    var [script] = this.getScriptByTab(this.active_tab);
    if(script !== undefined) {
      script.runCurrentSection();
    }
  }

  /**
   * Executes only the current line in the active script.
   */
  runCurrentLine() {
    var [script] = this.getScriptByTab(this.active_tab);
    if(script !== undefined) {
      script.runCurrentLine();
    }
  }

  /**
   * Creates a new script tab and editor instance, loading the script from the given path.
   * @param {string} path - The file path of the script to load.
   * @param {number} lineno - The line number to navigate to in the newly created script.
   * @param {number} charpos - The char position to navigate to in the newly created script.
   */
  createScript(path, lineno, charpos) {
    if(path === undefined) {
      path = this.win.platform.createScriptPath();
    }
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
   * Inserts text in the currently active script editor.
   * @param {string} text Text to insert.
   */
  insertTextInActiveScript(text) {
    var [script] = this.getScriptByTab(this.active_tab);
    if(script !== undefined) {
      script.insertText(text);
    }
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
    const { pathEqual } = this.win.platform;
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

    this.close_dialog.cancel.hidden = true;
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
   * Prompts for modified scripts before an application reload.
   * @param {Function} focus Focuses the owning window.
   * @returns {Promise<boolean>} Whether the reload can proceed.
   */
  async confirmReload(focus) {
    if(!this.close_dialog.element.hidden) return false;
    for(const script of this.scripts) {
      if(script.code_editor.getValue().replace(/\r/g, '') === script.saved_code.replace(/\r/g, '')) continue;
      focus();
      script.activate();
      this.close_dialog.cancel.hidden = false;
      let choice;
      try {
        choice = await new Promise(resolve => {
          this.reload_answer = resolve;
          this.close_dialog.show(script.name);
        });
      } finally {
        this.reload_answer = null;
        this.close_dialog.hide();
      }
      if(choice === 'cancel' || (choice === 'save' && !await script.save())) return false;
    }
    return true;
  }

  /**
   * Handles user interaction with the script closing dialog, determining whether to save changes, discard them, or cancel the closure.
   * @param {string} choice Selected dialog action.
   */
  async closingDialogButton(choice) {
    if(this.reload_answer) {
      this.reload_answer(choice);
      return;
    }
    var [script, i] = this.getScriptByTab(this.active_tab);
    var tab = this.scripts[i].tab;
    var script_path = this.scripts[i].path;
    if(choice === 'save' || choice === 'discard') {
      if(choice === 'save') {
        if(!await this.scripts[i].save()) {
          return;
        }
        script_path = this.scripts[i].path;
      }
      this.scripts[i].removeCodeEditor();
      this.scripts.splice(i, 1);
      this.tabs.removeTab(tab);
    } else {
      this.scripts[i].closing = false;
      this.close_dialog.hide();
      script.code_editor.focus();
    }
    if(this.close_window && script_path !== undefined) {
      this.last_script_paths.push(script_path);
    }
  }

  /**
   * Updates body class based on active extension of script
   */
  updateActiveExtension(script) {
    const { path } = this.win.platform;
    if(script && (typeof script.path === 'string' || script.path instanceof String)) {
      $(document.body).attr("class", 'file-' + path.extname(script.path).substring(1));
    } else {
      $(document.body).attr("class", '');
    }
  }
}

exports.PRDC_JSLAB_EDITOR_SCRIPT_MANAGER = PRDC_JSLAB_EDITOR_SCRIPT_MANAGER;
