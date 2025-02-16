/**
 * @file JSLAB Editor
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

// Modules
// --------------------
const { ipcRenderer } = require('electron');

const { PRDC_JSLAB_EDITOR } = require('./editor');
const { PRDC_JSLAB_EDITOR_SCRIPT_MANAGER } = require('./script-manager');

const { PRDC_POPUP } = require('./../../lib/PRDC_POPUP/PRDC_POPUP');

const fs = require("fs");

/**
 * Class for JSLAB editor win.
 */
class PRDC_JSLAB_WIN_EDITOR {  

  /**
   * Create editor win.
   */
  constructor() {
    var obj = this;

    // Classes
    this.editor = new PRDC_JSLAB_EDITOR(this);
    this.script_manager = new PRDC_JSLAB_EDITOR_SCRIPT_MANAGER(this);
    this.editor_more_popup = new PRDC_POPUP(document.getElementById('editor-more-icon'),
      document.getElementById('editor-more-popup'));
      
    // Prevent redirects
    preventRedirect();

    // Events
    // --------------------
    // Toggle DevTools
    document.addEventListener("keydown", function (e) {
      if(e.key == "F12") {
        ipcRenderer.send("MainProcess", "toggle-dev-tools");
      } else if(e.ctrlKey && e.key.toLowerCase() == 'c') {
        if(obj.getSelectionText() == "") {
          // No selected text
          obj.editor.dispInternal(language.string(89));
          ipcRenderer.send('SandboxWindow', 'stop-loop', true);
          e.stopPropagation();
          e.preventDefault();
        }
      }
    });

    // Error handle
    // --------------------
    window.addEventListener("unhandledrejection", function (e) {
      obj.editor.errorInternal(e.reason.stack);
      e.preventDefault();
    });

    window.addEventListener("error", function (e) {
      obj.editor.errorInternal(e.error.stack);
      e.preventDefault();
    });
    
    // On IPC message
    ipcRenderer.on("EditorWindow", function(event, action, data) {
      switch (action) {
        case "open-script":
          // On open script
          obj.script_manager.openScript(data);
          break;
        case "close-all":
          // On close all
          obj.script_manager.closeAllScripts();
          break;
        case "set-language":
          language.set(data);
          break;
        case "toggle-comment":
          obj.script_manager.toggleComment();
          break;
      }
    });

    // On file drop
    document.addEventListener("drop", function(e) {
      e.stopPropagation();
      e.preventDefault();
      console.log(e.dataTransfer.files);
      
      for(const f of e.dataTransfer.files) {
        obj.script_manager.openScript([f.path]);
      }
    }, false);
  }
  
  /**
   * Retrieves selected text within the application, if any.
   * @return {string} The currently selected text.
   */
  getSelectionText() {
    var text = "";
    if(window.getSelection) {
        text = window.getSelection().toString();
    } else if(document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }
    return text;
  }
  
  /**
   * Method used to execute code when gui is ready.
   */
  onReady() {
    // Fade in window
    ipcRenderer.send('MainProcess', 'fade-in-win');
  }
  
  /**
   * Show editor
   */
  showEditor() {
    ipcRenderer.send("MainProcess", "show-editor");
  }
}
exports.PRDC_JSLAB_WIN_EDITOR = PRDC_JSLAB_WIN_EDITOR;