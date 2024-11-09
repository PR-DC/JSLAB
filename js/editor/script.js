/**
 * @file JSLAB editor script module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');

/**
 * Class for JSLAB editor script.
 */
class PRDC_JSLAB_EDITOR_SCRIPT {

  /**
   * Initializes a new instance of the editor script, setting up the code editor and loading any specified script.
   * @param {object} win The window object where the editor is embedded.
   * @param {object} script_manager The script manager handling multiple scripts.
   * @param {string} script_path The path to the script file to be loaded into the editor.
   * @param {HTMLElement} tab The tab element associated with this script in the UI.
   */
  constructor(win, script_manager, script_path, tab) {
    var obj = this;
    this.win = win;
    this.script_manager = script_manager;
    this.tab = tab;
    
    this.code_editor;
    this.code = "";
    this.path;
    this.name;
    this.saved_code = "";
    this.closing = false;

    if(script_path !== undefined) {
      this.path = script_path;
      this.name = path.basename(this.path);
      this.loadCode(script_path);
    } else {
      this.path = undefined;
      this.name = "Unknown";
    }
    
    this.tab.setAttribute("title", this.path);
    this.script_manager.setScriptNameByTab(this.tab, this.name);

    this.code_editor = CodeMirror(document.getElementById("code"), {
      mode: "javascript",
      theme: "notepadpp",
      rulers: [{ color: "#aff", column: 75, lineStyle: "solid" }],
      indentUnit: 2,
      tabSize: 2,
      lineNumbers: true,
      lineWrapping: true,
      styleActiveLine: true,
      matchBrackets: true,
      gutter: true,
      gutters: [
        "CodeMirror-linenumbers",
        "CodeMirror-foldgutter",
        "CodeMirror-lint-markers",
      ],
      foldGutter: true,
      lint: {
        getAnnotations: async function(text, callback) {
          var results = await obj.script_manager.eslint.lintText(text);
          callback(results[0].messages.map(message => ({
            from: CodeMirror.Pos(message.line - 1, message.column - 1),
            to: CodeMirror.Pos(
              message.endLine ? message.endLine - 1 : message.line - 1,
              message.endColumn ? message.endColumn - 1 : message.column
            ),
            severity: message.severity === 2 ? "error" : "warning",
            message: message.message,
          })));
        },
        async: true
      },
      searchDialog: true,
      highlightSelectionMatches: { annotateScrollbar: true },
    });

    CodeMirror.keyMap.default["Shift-Tab"] = "indentLess";
    CodeMirror.keyMap.default["Tab"] = "indentMore";
    CodeMirror.keyMap.default["Ctrl-F"] = "showSearchDialog";
    CodeMirror.keyMap.default['Ctrl-G'] = 'findNext';
    CodeMirror.keyMap.default['Shift-Ctrl-G'] = 'findPrev';
    CodeMirror.keyMap.default['Shift-Ctrl-F'] = 'replace';
    CodeMirror.keyMap.default['Shift-Ctrl-R'] = 'replaceAll';
    CodeMirror.keyMap.default['Ctrl-/'] = 'toggleComment';
    
    // Keypress events
    this.code_editor.on("keypress", function (cm, event) {
      if(
        !cm.state.completionActive &&
        !event.ctrlKey &&
        event.key != "Enter" &&
        event.key != ";" &&
        event.key != " " &&
        (event.key != "{") & (event.key != "}")
      ) {
        CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
      }
    });

    // Drop events
    this.code_editor.on("drop", function (data, e) {
      e.preventDefault();
    });

    this.code_editor.setValue(this.code);
    this.code_editor.clearHistory();
    this.code_editor.on("change", function() {
      obj.codeChanged();
    });
    this.show();
  }

  /**
   * Loads the code from the specified script path into the editor.
   * @param {string} script_path The path to the script file to be loaded.
   */
  loadCode(script_path) {
    try {
      var data = fs.readFileSync(script_path);
      this.code = data.toString();
    } catch (err) {
      this.win.editor.errorInternal(err.stack);
    }
    this.saved_code = this.code;
  }

  /**
   * Displays the editor for this script, focusing it and hiding other scripts' editors.
   */
  show() {
    $(".CodeMirror").hide();
    if(this.closing) {
      $("#close-file").text(this.name);
      $("#close-dialog-cont").fadeIn(300, "linear");
    }
    $(this.code_editor.display.wrapper).show();
    this.code_editor.focus();
  }

  /**
   * Updates the editor's stored code value based on the current content in the editor.
   */
  update() {
    this.code = this.code_editor.getValue();
  }

  /**
   * Saves the current script to its associated file path. If the script does not have a path, prompts for one.
   * @returns {boolean} True if the save operation was successful, false otherwise.
   */
  save() {
    if(this.path !== undefined) {
      if(this.isActive()) {
        this.update();
      }
      this.tab.classList.remove("changed");
      if(this.code != this.saved_code) {
        try {
          fs.writeFileSync(this.path, this.code);
        } catch (err) {
          this.win.editor.errorInternal(err.stack);
          return false;
        }
        this.saved_code = this.code;
        this.tab.classList.remove("changed");
        return true;
      } else {
        return true;
      }
    } else {
      return this.saveAs();
    }
  }

  /**
   * Saves the current script to a new file, prompting the user for the file path.
   * @returns {boolean} True if the save operation was successful, false otherwise.
   */
  saveAs() {
    var script_path;
    if(this.path === undefined) {
      script_path = "script.jsl";
    } else {
      script_path = this.path;
    }
    let options = {
      title: language.currentString(144),
      defaultPath: script_path,
      buttonLabel: language.currentString(145),
      filters: [
        { name: "jsl", extensions: ["jsl", "txt"] },
        { name: "All Files", extensions: ["*"] },
      ],
    };

    if(this.isActive()) {
      this.update();
    }

    script_path = ipcRenderer.sendSync("dialog", "showSaveDialogSync", options);
    if(script_path === undefined) {
      this.win.editor.disp("@editor/saveAs: "+language.string(129));
      return false;
    }
    
    if(script_path != this.path) {
      if(!this.script_manager.checkScriptOpenByPath(script_path)) {
        try {
          fs.writeFileSync(script_path, this.code);
        } catch (err) {
          this.win.editor.errorInternal(err.stack);
          return false;
        }
        this.path = script_path;
        this.name = this.path.replace(/^.*[\\\/]/, "");
        this.tab.setAttribute("title", this.path);
        this.tab.querySelector(".tab-title").innerHTML = this.name;
        this.saved_code = this.code;
        this.tab.classList.remove("changed");
        return true;
      } else {
        this.win.editor.errorInternal(language.string(130));
        return false;
      }
    } else {
      return false;
    }
  }

  /**
   * Prepares the script for removal, checking if changes are unsaved and potentially prompting the user.
   * @returns {boolean} True if the script can be safely removed, false if there are unsaved changes.
   */
  remove() {
    this.closing = true;
    if(this.isActive()) {
      this.update();
    }
    if(this.code.replace(/[\r]/g, '') != this.saved_code.replace(/[\r]/g, '')) {
      // Fade in window
      ipcRenderer.send("MainProcess", "fade-in-win");
      if(this.isActive()) {
        $("#close-file").text(this.name);
        $("#close-dialog-cont").fadeIn(300, "linear");
      }
      return false;
    } else {
      return true;
    }
  }

  /**
   * Removes the code editor associated with this script from the DOM.
   */
  removeCodeEditor() {
    $(this.code_editor.display.wrapper).remove();
  }

  /**
   * Checks if the script's tab is currently active in the UI.
   * @returns {boolean} True if this script's tab is active, false otherwise.
   */
  isActive() {
    return this.tab == this.script_manager.active_tab;
  }

  /**
   * Activates this script's tab in the UI, showing its editor and hiding others.
   */
  activate() {
    if(!this.isActive()) {
      this.script_manager.activateScriptByTab(this.tab);
      this.show();
    }
  }

  /**
   * Saves the script and then runs it, typically in an external execution environment.
   * @param {array} lines The specific lines or sections of the script to execute, if applicable.
   */
  run(lines) {
    if(this.save()) {
      ipcRenderer.send("MainWindow", "run", [this.path, lines]);
    } else {
      this.win.editor.disp("@editor/run: "+language.string(131));
    }
  }
  
  /**
   * Marks the script as having unsaved changes, updating the UI accordingly.
   */
  codeChanged() {
    this.tab.classList.add("changed");
  }
  
  /**
   * Toggles the comment state of the currently selected lines in the code editor.
   */
  toggleComment() {
    this.code_editor.execCommand('toggleComment');
  }
  
  /**
   * Opens search dialog in the code editor.
   */
  openSearchDialog() {
    this.code_editor.execCommand('showSearchDialog');
  }
}

exports.PRDC_JSLAB_EDITOR_SCRIPT = PRDC_JSLAB_EDITOR_SCRIPT