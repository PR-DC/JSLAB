/**
 * @file JSLAB editor module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_DOM } = require('../other-shared/dom');


/**
 * Class for JSLAB editor.
 */
class PRDC_JSLAB_EDITOR {

  /**
   * Initializes the editor, setting up event listeners for UI interactions and window controls.
   * @param {object} win The window object representing the owning window controller.
   */
  constructor(win) {
    const { clipboard, host } = win.platform;
    var obj = this;
    this.win = win;

    this.fullscreen = false;
    this.context_menu = document.getElementById('editor-context-menu');
    this.context_menu_run_line = document.getElementById('editor-context-run-line');
    this.context_menu_run_section = document.getElementById('editor-context-run-section');
    this.context_menu_toggle_comment = document.getElementById('editor-context-toggle-comment');
    this.context_menu_undo = document.getElementById('editor-context-undo');
    this.context_menu_redo = document.getElementById('editor-context-redo');
    this.context_menu_cut = document.getElementById('editor-context-cut');
    this.context_menu_copy = document.getElementById('editor-context-copy');
    this.context_menu_paste = document.getElementById('editor-context-paste');
    this.context_menu_select_all = document.getElementById('editor-context-select-all');

    // On menu click
    $("#save-menu").click(function() {
      obj.win.script_manager.saveScript();
    });
    $("#save-as-menu").click(function() {
      obj.win.script_manager.saveAsScript();
    });
    $("#open-menu").click(function() {
      obj.win.script_manager.openScriptFile();
    });

    $("#run-menu").click(function() {
      if(!obj.win.debugger_toolbar?.handleRun()) {
        obj.win.script_manager.runScript();
      }
    });
    $("#new-tab").click(function() {
      obj.win.script_manager.createScript();
    });
    $("#new-script").click(function() {
      obj.win.script_manager.createScript();
    });

    $("#search-dialog-menu").click(function() {
      obj.win.script_manager.openSearchDialog();
      obj.win.editor_more_popup.close();
    });
    $("#search-all-menu").click(function() {
      obj.win.editor_search_all.open();
      obj.win.editor_more_popup.close();
    });
    $("#symbol-input-menu").click(function() {
      obj.win.editor_more_popup.close();
    });
    $("#compile-dialog-menu").click(function() {
      obj.win.script_manager.compileArduino();
      obj.win.editor_more_popup.close();
    });
    $("#upload-dialog-menu").click(function() {
      obj.win.script_manager.uploadArduino();
      obj.win.editor_more_popup.close();
    });

    function getActiveCodeEditor() {
      var [script] = obj.win.script_manager.getScriptByTab(obj.win.script_manager.active_tab);
      if(script && script.code_editor) {
        return script.code_editor;
      }
      return undefined;
    }

    function bindContextAction(element, action) {
      if(!element) {
        return;
      }
      element.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        Promise.resolve(action()).catch(function(error) {
          obj.errorInternal(error.stack || String(error));
        });
        obj.hideContextMenu();
      });
    }

    bindContextAction(this.context_menu_run_line, function() {
      obj.win.script_manager.runCurrentLine();
    });

    bindContextAction(this.context_menu_run_section, function() {
      obj.win.script_manager.runCurrentSection();
    });

    bindContextAction(this.context_menu_toggle_comment, function() {
      obj.win.script_manager.toggleComment();
    });

    bindContextAction(this.context_menu_undo, function() {
      var cm = getActiveCodeEditor();
      if(cm) {
        cm.execCommand('undo');
      }
    });

    bindContextAction(this.context_menu_redo, function() {
      var cm = getActiveCodeEditor();
      if(cm) {
        cm.execCommand('redo');
      }
    });

    bindContextAction(this.context_menu_cut, async function() {
      var cm = getActiveCodeEditor();
      if(!cm) {
        return;
      }
      cm.focus();
      var selection = cm.getSelection();
      if(selection && selection.length) {
        await clipboard.writeText(selection);
        cm.replaceSelection('', 'start', '+delete');
      }
    });

    bindContextAction(this.context_menu_copy, async function() {
      var cm = getActiveCodeEditor();
      if(!cm) {
        return;
      }
      var selection = cm.getSelection();
      if(selection && selection.length) {
        await clipboard.writeText(selection);
      }
    });

    bindContextAction(this.context_menu_paste, async function() {
      var cm = getActiveCodeEditor();
      if(!cm) {
        return;
      }
      var text = await clipboard.readText();
      if(typeof text === 'string' && text.length) {
        cm.focus();
        cm.replaceSelection(text, 'end', '+input');
      }
    });

    bindContextAction(this.context_menu_select_all, function() {
      var cm = getActiveCodeEditor();
      if(cm) {
        cm.execCommand('selectAll');
      }
    });

    document.addEventListener('click', event => PRDC_JSLAB_DOM.dismissContextMenu(obj, event));

    document.addEventListener('scroll', function() {
      obj.hideContextMenu();
    }, true);

    // Keydown actions
    document.addEventListener("keydown", function(e) {
      if(e.key == 'F11') {
        obj.toggleFullscreen();
      }
      if(e.key == 'F12') {
        host.send('MainProcess', 'show-dev-tools');
      } else if(e.ctrlKey && e.key.toLowerCase() === "n") {
        obj.win.script_manager.createScript();
      } else if(e.ctrlKey && e.key === "F4") {
        obj.win.script_manager.removeScriptByTab(obj.win.script_manager.active_tab);
      } else if(e.key === 'Escape') {
        obj.hideContextMenu();
      } else if(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        var selected_text = '';
        var [script] = obj.win.script_manager.getScriptByTab(obj.win.script_manager.active_tab);
        if(script && script.code_editor) {
          selected_text = script.code_editor.getSelection();
        }
        obj.win.editor_search_all.open(selected_text);
        e.stopPropagation();
        e.preventDefault();
      } else if((e.ctrlKey && e.key === "Enter") || (e.shiftKey && e.key === "F5")) {
        obj.win.script_manager.runCurrentSection();
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key === "F5") {
        if(!obj.win.debugger_toolbar?.handleRun()) {
          obj.win.script_manager.runScript();
        }
      } else if(e.ctrlKey && e.key.toLowerCase() === "o") {
        obj.win.script_manager.openScriptFile();
      } else if(e.ctrlKey && e.key.toLowerCase() === "s" && !e.shiftKey) {
        obj.win.script_manager.saveScript();
      } else if(e.ctrlKey && e.key.toLowerCase() === "s" && e.shiftKey) {
        obj.win.script_manager.saveAsScript();
      }
    });

    this.win.platform.bindWindowControls(this);

    window.dispatchEvent(new Event('resize'));
  }

  /**
   * Opens editor context menu at cursor position.
   * @param {number} left Cursor X in viewport.
   * @param {number} top Cursor Y in viewport.
   */
  openContextMenu(left, top) {
    if(this.context_menu) {
      PRDC_JSLAB_DOM.openContextMenu(this.context_menu, left, top);
    }
  }

  /**
   * Hides editor context menu.
   */
  hideContextMenu() {
    if(this.context_menu) {
      this.context_menu.style.display = 'none';
    }
  }

  /**
   * Toggles the fullscreen state of the editor window, or sets it explicitly if a parameter is provided.
   * @param {boolean} [fullscreen] Optional. If specified, sets the fullscreen state to the provided value. If omitted, toggles the current state.
   */
  toggleFullscreen(fullscreen) {
    const { host } = this.win.platform;
    if(fullscreen == null) {
      fullscreen = !this.fullscreen;
    }
    if(fullscreen) {
      host.send('MainProcess', 'set-fullscreen', true);
    } else {
      host.send('MainProcess', 'set-fullscreen', false);
    }
    this.fullscreen = fullscreen;
  }

  /**
   * Displays a message to the user through the application's main window. Can optionally request to focus the window.
   * @param {string} msg The message to display.
   * @param {boolean} [focus=true] Optional. Whether to focus the application window when displaying the message. Defaults to true.
   */
  disp(msg, focus = true) {
    const { host } = this.win.platform;
    host.send("MainWindow", "editor-disp", [msg, focus]);
  }

  /**
   * Displays an internal message within the application's main window. Can optionally request to focus the window.
   * @param {string} msg - The internal message to display.
   * @param {boolean} [focus=true] - Optional. Whether to focus the application window when displaying the message. Defaults to true.
   */
  dispInternal(msg, focus = true) {
    const { host } = this.win.platform;
    host.send("MainWindow", "disp-internal", [msg, focus]);
  }

  /**
   * Displays an error message through the application's main window. Typically used for internal errors.
   * @param {string} msg The error message to display.
   */
  errorInternal(msg) {
    const { host } = this.win.platform;
    host.send("MainWindow", "internal-error", msg);
  }
}

exports.PRDC_JSLAB_EDITOR = PRDC_JSLAB_EDITOR;
