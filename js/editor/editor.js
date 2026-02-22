/**
 * @file JSLAB editor module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { clipboard } = require('electron');

/**
 * Class for JSLAB editor.
 */
class PRDC_JSLAB_EDITOR {

  /**
   * Initializes the editor, setting up event listeners for UI interactions and window controls.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
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
    $("#save-menu").click(function() { obj.win.script_manager.saveScript(); });
    $("#save-as-menu").click(function() { obj.win.script_manager.saveAsScript(); });
    $("#open-menu").click(function() { obj.win.script_manager.openScriptFile(); });

    $("#run-menu").click(function() { obj.win.script_manager.runScript(); });
    $("#new-tab").click(function() { obj.win.script_manager.createScript(); });
    $("#new-script").click(function() { obj.win.script_manager.createScript(); });
    
    $("#close-dialog-save").click(function() { obj.win.script_manager.closingDialogButton(2); });
    $("#close-dialog-discard").click(function() { obj.win.script_manager.closingDialogButton(1); });
    $("#close-dialog-cancel").click(function() { obj.win.script_manager.closingDialogButton(0); });

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
        action();
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

    bindContextAction(this.context_menu_cut, function() {
      var cm = getActiveCodeEditor();
      if(!cm) {
        return;
      }
      cm.focus();
      var selection = cm.getSelection();
      if(selection && selection.length) {
        clipboard.writeText(selection);
        cm.replaceSelection('', 'start', '+delete');
      }
    });

    bindContextAction(this.context_menu_copy, function() {
      var cm = getActiveCodeEditor();
      if(!cm) {
        return;
      }
      var selection = cm.getSelection();
      if(selection && selection.length) {
        clipboard.writeText(selection);
      }
    });

    bindContextAction(this.context_menu_paste, function() {
      var cm = getActiveCodeEditor();
      if(!cm) {
        return;
      }
      var text = clipboard.readText();
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

    document.addEventListener('click', function(e) {
      if(!obj.context_menu || obj.context_menu.style.display === 'none') {
        return;
      }
      if(!obj.context_menu.contains(e.target)) {
        obj.hideContextMenu();
      }
    });

    document.addEventListener('scroll', function() {
      obj.hideContextMenu();
    }, true);
    
    // Keydown actions
    document.addEventListener("keydown", function(e) {
      if(e.key == 'F11') {
        obj.toggleFullscreen();
      } if(e.key == 'F12') {
        ipcRenderer.send('MainProcess', 'show-dev-tools');
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
        obj.win.script_manager.runScript();
      } else if(e.ctrlKey && e.key.toLowerCase() === "o") {
        obj.win.script_manager.openScriptFile();
      } else if(e.ctrlKey && e.key.toLowerCase() === "s" && !e.shiftKey) {
        obj.win.script_manager.saveScript();
      } else if(e.ctrlKey && e.key.toLowerCase() === "s" && e.shiftKey) {
        obj.win.script_manager.saveAsScript();
      }
    });
    
    // Window controls    
    window.addEventListener('resize', function() {
      // Detect change of maximize
      obj.maximized = ipcRenderer.sendSync('sync-message', 'is-maximized-win');
      if(obj.maximized) {
       $("#win-restore img").attr('src', '../img/win-restore.svg');
      } else {
       $("#win-restore img").attr('src', '../img/win-maximize.svg');
      }
    }, true);
    
    $("#win-close").click(function() {
      ipcRenderer.send('MainProcess', 'close-editor');
    });
    
    $("#win-restore").click(function() {
      obj.toggleFullscreen(false);
      obj.maximized = !obj.maximized;
      if(obj.maximized) {
       ipcRenderer.send('MainProcess', 'maximize-win');
      } else {
       ipcRenderer.send('MainProcess', 'restore-win');
      }
    });
    
    $("#win-minimize").click(function() {
      obj.toggleFullscreen(false);
      ipcRenderer.send('MainProcess', 'minimize-win');
    });
    
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * Opens editor context menu at cursor position.
   * @param {number} left Cursor X in viewport.
   * @param {number} top Cursor Y in viewport.
   */
  openContextMenu(left, top) {
    if(!this.context_menu) {
      return;
    }

    this.context_menu.style.display = 'block';
    this.context_menu.style.left = '0px';
    this.context_menu.style.top = '0px';

    var rect = this.context_menu.getBoundingClientRect();
    var x = left;
    var y = top;
    var margin = 4;

    if((x + rect.width) > window.innerWidth - margin) {
      x = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if((y + rect.height) > window.innerHeight - margin) {
      y = Math.max(margin, window.innerHeight - rect.height - margin);
    }

    this.context_menu.style.left = x + 'px';
    this.context_menu.style.top = y + 'px';
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
    if(fullscreen == null) {
      fullscreen = !this.fullscreen;
    }
    if(fullscreen) {
      ipcRenderer.send('MainProcess', 'set-fullscreen', true);
    } else {
      ipcRenderer.send('MainProcess', 'set-fullscreen', false);
    }
    this.fullscreen = fullscreen;
  }
  
  /**
   * Displays a message to the user through the application's main window. Can optionally request to focus the window.
   * @param {string} msg The message to display.
   * @param {boolean} [focus=true] Optional. Whether to focus the application window when displaying the message. Defaults to true.
   */
  disp(msg, focus = true) {
    ipcRenderer.send("MainWindow", "editor-disp", [msg, focus]);
  }

  /**
   * Displays an internal message within the application's main window. Can optionally request to focus the window.
   * @param {string} msg - The internal message to display.
   * @param {boolean} [focus=true] - Optional. Whether to focus the application window when displaying the message. Defaults to true.
   */
  dispInternal(msg, focus = true) {
    ipcRenderer.send("MainWindow", "disp-internal", [msg, focus]);
  }
  
  /**
   * Displays an error message through the application's main window. Typically used for internal errors.
   * @param {string} msg The error message to display.
   */
  errorInternal(msg) {
    ipcRenderer.send("MainWindow", "internal-error", msg);
  }
}

exports.PRDC_JSLAB_EDITOR = PRDC_JSLAB_EDITOR;
