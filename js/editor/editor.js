/**
 * @file JSLAB editor module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

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
    $("#compile-dialog-menu").click(function() { 
      obj.win.script_manager.compileArduino();
      obj.win.editor_more_popup.close();
    });
    $("#upload-dialog-menu").click(function() { 
      obj.win.script_manager.uploadArduino();
      obj.win.editor_more_popup.close();
    });
    
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