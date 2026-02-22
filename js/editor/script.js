/**
 * @file JSLAB editor script module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const { PRDC_JSLAB_CODE_DOC_HOVER } = require('../code/doc-hover');

const SECTION_MARKER_REGEX = /^\s*\/\/\/(?!\/).*$/;

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
    this.code_doc_hover;
    this.code = "";
    this.path;
    this.name;
    this.saved_code = "";
    this.closing = false;
    this.section_line_handles = [];
    this.section_refresh_timer = undefined;

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
      searchDialog: true,
      highlightSelectionMatches: { annotateScrollbar: true },
    });

    this.code_editor.setOption("foldOptions", {
      rangeFinder: CodeMirror.fold.combine(
        function(cm, start_pos) {
          return obj.getSectionFoldRange(cm, start_pos);
        },
        CodeMirror.fold.auto
      ),
      scanUp: true,
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

    this.code_editor.getWrapperElement().addEventListener('contextmenu', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var pos = obj.code_editor.coordsChar({ left: e.clientX, top: e.clientY });
      if(pos && isFinite(pos.line)) {
        obj.code_editor.setCursor(pos);
      }
      if(obj.win &&
        obj.win.editor &&
        typeof obj.win.editor.openContextMenu === 'function') {
        obj.win.editor.openContextMenu(e.clientX, e.clientY);
      }
    });

    this.code_editor.on('scroll', function() {
      if(obj.win &&
        obj.win.editor &&
        typeof obj.win.editor.hideContextMenu === 'function') {
        obj.win.editor.hideContextMenu();
      }
    });

    this.code_editor.setValue(this.code);
    this.code_editor.clearHistory();
    this.refreshSectionDecorations();
    this.code_editor.on("change", function() {
      obj.codeChanged();
      obj.scheduleSectionDecorationsRefresh();
    });

    // Hover documentation for tokens in editor
    this.code_doc_hover = new PRDC_JSLAB_CODE_DOC_HOVER({
      on_print_doc: function(entry) {
        var query = entry && entry.doc_query ? entry.doc_query : '';
        if(!query.length) {
          return;
        }
        ipcRenderer.send("MainWindow", "eval-command-preserve-input",
          ['documentation(' + JSON.stringify(query) + ')']);
      }
    });
    this.code_doc_hover.attach(this.code_editor);
    
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
    if(this.win &&
      this.win.editor &&
      typeof this.win.editor.hideContextMenu === 'function') {
      this.win.editor.hideContextMenu();
    }
    if(this.closing) {
      $("#close-file").text(this.name);
      $("#close-dialog-cont").fadeIn(300, "linear");
    }
    $(this.code_editor.display.wrapper).show();
    this.code_editor.focus();
    this.updateEditorMode();
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
        { name: language.currentString(345), extensions: ["*"] },
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
        this.updateEditorMode();
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
    if(this.section_refresh_timer) {
      clearTimeout(this.section_refresh_timer);
      this.section_refresh_timer = undefined;
    }
    if(this.win &&
      this.win.editor &&
      typeof this.win.editor.hideContextMenu === 'function') {
      this.win.editor.hideContextMenu();
    }
    if(this.code_doc_hover) {
      this.code_doc_hover.destroy();
      this.code_doc_hover = undefined;
    }
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
   * Sets the cursor in the code editor to the specified line number.
   * @param {number} lineno - The line number to navigate to (1-based index).
   * @param {number} charpos - The char position to navigate to in the newly created script.
   */
  setLine(lineno, charpos = 0) {
    if(isFinite(lineno)) {
      this.code_editor.setCursor({ line: lineno - 1, ch: charpos - 1 });
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
   * Runs only the current code section delimited by lines that start with "///".
   * @returns {boolean} True when a runnable section was found and sent for execution.
   */
  runCurrentSection() {
    var lines = this.getCurrentSectionLines();
    if(lines === undefined) {
      this.win.editor.disp('@editor/runCurrentSection: ' + language.string(380));
      return false;
    }
    this.run(lines);
    return true;
  }

  /**
   * Runs only the line under the current cursor.
   * @returns {boolean} True when line run is dispatched.
   */
  runCurrentLine() {
    var doc = this.code_editor.getDoc();
    var line = doc.getCursor().line + 1;
    this.run(line);
    return true;
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
   * Inserts text at the current cursor or selection in the code editor.
   * @param {string} text Text to insert.
   */
  insertText(text) {
    if(typeof text !== 'string' || !text.length) {
      return;
    }
    this.code_editor.replaceSelection(text, 'end', '+input');
    this.code_editor.focus();
  }
  
  /**
   * Update editor mode based on script extension
   */
  updateEditorMode() {
    var obj = this;
    this.script_manager.updateActiveExtension(this);
    if(typeof this.name === 'string' || this.name instanceof String) {
      var file_extension = path.extname(this.name);
      if(['.cpp', '.c', '.ino', '.h', '.hpp'].includes(file_extension.toLowerCase())) {
        this.code_editor.setOption("mode", "text/x-csrc");
        this.code_editor.setOption("lint", {});
        return;
      }
    }
    this.code_editor.setOption("mode", "javascript");
    this.code_editor.setOption("lint", {
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
    });
  }
  
  /**
   * Opens search dialog in the code editor.
   */
  openSearchDialog() {
    this.code_editor.execCommand('showSearchDialog');
  }
  
  /**
   * Compiles arduino code.
   */
  compileArduino() {
    if(typeof this.path === 'string' || this.path instanceof String) {
      ipcRenderer.send("MainWindow", "eval-command", [`compileArduino('${path.dirname(this.path).replace(/\\(?!\\)/g, "\\\\")}')`]);
    } else {
      this.win.editor.disp("@editor/compileArduino: "+language.string(229));
    }
  }
  
  /**
   * Uploads arduino code.
   */
  uploadArduino() {
    if(typeof this.path === 'string' || this.path instanceof String) {
      ipcRenderer.send("MainWindow", "eval-command", [`uploadArduino('${path.dirname(this.path).replace(/\\(?!\\)/g, "\\\\")}')`]);
    } else {
      this.win.editor.disp("@editor/uploadArduino: "+language.string(229));
    }
  }

  /**
   * Checks whether a given line is a section marker.
   * @param {string} line_text Line content.
   * @returns {boolean}
   */
  isSectionMarkerLine(line_text) {
    return SECTION_MARKER_REGEX.test(String(line_text || ""));
  }

  /**
   * Fold range finder for sections delimited by lines that start with "///".
   * @param {object} cm CodeMirror instance.
   * @param {{line:number, ch:number}} start_pos Fold start position.
   * @returns {{from:{line:number,ch:number},to:{line:number,ch:number}}|undefined}
   */
  getSectionFoldRange(cm, start_pos) {
    var start_line = start_pos.line;
    if(!this.isSectionMarkerLine(cm.getLine(start_line))) {
      return undefined;
    }

    var line_count = cm.lineCount();
    var end_line = line_count - 1;
    for(var i = start_line + 1; i < line_count; i++) {
      if(this.isSectionMarkerLine(cm.getLine(i))) {
        end_line = i - 1;
        break;
      }
    }

    if(end_line <= start_line) {
      return undefined;
    }

    return {
      from: CodeMirror.Pos(start_line, cm.getLine(start_line).length),
      to: CodeMirror.Pos(end_line, cm.getLine(end_line).length)
    };
  }

  /**
   * Resolves 1-based [startLine, endLine] for the section at the current cursor.
   * @returns {Array<number>|undefined} Inclusive line bounds, or undefined when empty.
   */
  getCurrentSectionLines() {
    var doc = this.code_editor.getDoc();
    var line_count = doc.lineCount();
    if(line_count < 1) {
      return undefined;
    }

    var cursor_line = doc.getCursor().line;
    var is_marker = (line_index) => {
      return this.isSectionMarkerLine(doc.getLine(line_index));
    };

    var prev_marker = -1;
    for(var i = cursor_line; i >= 0; i--) {
      if(is_marker(i)) {
        prev_marker = i;
        break;
      }
    }

    var next_marker = line_count;
    for(var j = cursor_line + 1; j < line_count; j++) {
      if(is_marker(j)) {
        next_marker = j;
        break;
      }
    }

    var start_line = prev_marker >= 0 ? prev_marker + 1 : 0;
    if(is_marker(cursor_line)) {
      start_line = cursor_line + 1;
    }
    var end_line = next_marker - 1;

    while(start_line <= end_line && !doc.getLine(start_line).trim().length) {
      start_line++;
    }
    while(end_line >= start_line && !doc.getLine(end_line).trim().length) {
      end_line--;
    }

    if(start_line > end_line) {
      return undefined;
    }

    return [start_line + 1, end_line + 1];
  }

  /**
   * Schedules section marker styling refresh (debounced).
   */
  scheduleSectionDecorationsRefresh() {
    if(this.section_refresh_timer) {
      clearTimeout(this.section_refresh_timer);
    }
    var obj = this;
    this.section_refresh_timer = setTimeout(function() {
      obj.section_refresh_timer = undefined;
      obj.refreshSectionDecorations();
    }, 40);
  }

  /**
   * Applies visual styling to section marker lines.
   */
  refreshSectionDecorations() {
    if(!this.code_editor) {
      return;
    }

    var cm = this.code_editor;
    for(var i = 0; i < this.section_line_handles.length; i++) {
      var handle = this.section_line_handles[i];
      cm.removeLineClass(handle, 'text', 'jslab-section-marker-line');
      cm.removeLineClass(handle, 'background', 'jslab-section-marker-bg');
    }
    this.section_line_handles = [];

    var line_count = cm.lineCount();
    for(var line_i = 0; line_i < line_count; line_i++) {
      var line_text = cm.getLine(line_i);
      if(!this.isSectionMarkerLine(line_text)) {
        continue;
      }
      var line_handle = cm.getLineHandle(line_i);
      cm.addLineClass(line_handle, 'text', 'jslab-section-marker-line');
      cm.addLineClass(line_handle, 'background', 'jslab-section-marker-bg');
      this.section_line_handles.push(line_handle);
    }
  }
}

exports.PRDC_JSLAB_EDITOR_SCRIPT = PRDC_JSLAB_EDITOR_SCRIPT;
