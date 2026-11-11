/**
 * @file JSLAB Editor
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { isInternalDebugFrame } = require('../shared/debugger-frames');

// Modules
// --------------------
const { ipcRenderer, webUtils } = require('electron');

const { PRDC_PANEL } = require('../../lib/PRDC_PANEL/PRDC_PANEL');
const { PRDC_JSLAB_EDITOR_DEBUGGER_PANE } = require('../code/editor-debugger-pane');
const { PRDC_JSLAB_DEBUGGER_TOOLBAR } = require('../code/debugger-toolbar');
const { PRDC_JSLAB_EDITOR } = require('./editor');
const { PRDC_JSLAB_EDITOR_SCRIPT_MANAGER } = require('./script-manager');
const { PRDC_JSLAB_EDITOR_SYMBOL_INPUT } = require('./symbol-input');
const { PRDC_JSLAB_EDITOR_SEARCH_ALL } = require('./search-all');

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
    const debugger_host = {
      closeMenu:() => this.editor_more_popup?.close(),
      platform:'desktop', currentString:id => language.currentString(id),
      open:() => this.debugger_pane.toggle(), error:message => this.editor.errorInternal(message),
      request:async (method,args) => {
        const reply = await ipcRenderer.invoke('JSLAB_DEBUGGER',method,args);
        if(!reply.success) throw Error(reply.error);
        return reply.value;
      },
      createPanel:(container,cells,refresh) => new PRDC_PANEL('editor-debugger','horizontal',container,cells,[70,30],refresh),
      refresh:() => { for(const script of this.script_manager.scripts) script.code_editor.refresh(); },
    };
    this.debugger_toolbar = new PRDC_JSLAB_DEBUGGER_TOOLBAR(document,debugger_host);
    this.debugger_pane = new PRDC_JSLAB_EDITOR_DEBUGGER_PANE(document,debugger_host);
    ipcRenderer.invoke('JSLAB_DEBUGGER_VIEW_STATE').then(state => {
      if(state?.state) { this.debugger_toolbar.update(state); this.debugger_pane.update(state); }
    }).catch(error => this.editor.errorInternal(error.message));
    this.editor_symbol_input = new PRDC_JSLAB_EDITOR_SYMBOL_INPUT(this);
    this.editor_search_all = new PRDC_JSLAB_EDITOR_SEARCH_ALL(this);
    this.editor_more_popup = new PRDC_POPUP(document.getElementById('editor-more-icon'),
      document.getElementById('editor-more-popup'),
      function() {
        if(obj.editor_symbol_popup) {
          obj.editor_symbol_popup.close();
        }
      });
    this.editor_symbol_popup = new PRDC_POPUP(document.getElementById('symbol-input-menu'),
      document.getElementById('editor-symbol-popup'));
      
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
          ipcRenderer.send('SandboxWindow', 'interrupt-execution', true);
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
      switch(action) {
        case 'debugger-state':
          obj.debugger_state = data;
          obj.debugger_toolbar.update(data);
          obj.debugger_pane.update(data);
          for(const script of obj.script_manager.scripts) script.debugger?.update(data);
          break;
        case 'debugger-view-state':
          obj.debugger_pane.update(data);
          for(const script of obj.script_manager.scripts) script.debugger?.update(data,data.frames?.[data.frame_index]);
          break;
        case 'open-debugger':
          obj.debugger_pane.update(data); obj.debugger_pane.show();
          break;
        case 'debug-location':
          if(data && !isInternalDebugFrame(data) && fs.existsSync(data.path)) {
            obj.script_manager.openScript([data.path, data.line, data.column || 1]);
            for(const script of obj.script_manager.scripts) script.debugger?.update(obj.debugger_state || { state: 'paused' }, data);
          }
          break;
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
          obj.debugger_pane.view.update(obj.debugger_pane.view.state);
          for(const script of obj.script_manager.scripts) {
            if(script.debugger) script.debugger.update(script.debugger.state, script.debugger.selected_frame);
          }
          if(obj.editor_symbol_input) {
            obj.editor_symbol_input.render();
          }
          if(obj.editor_search_all) {
            obj.editor_search_all.refreshLanguage();
          }
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
      console.log(e);
      
      for(const f of e.dataTransfer.files) {
        obj.script_manager.openScript([webUtils.getPathForFile(f)]);
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
