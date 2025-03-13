/**
 * @file JSLAB GUI script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
// Modules
// --------------------
const { ipcRenderer } = require('electron');

const { PRDC_JSLAB_HELP } = require('./help');
const { PRDC_JSLAB_INFO } = require('./info');
const { PRDC_JSLAB_SETTINGS } = require('./settings');
const { PRDC_JSLAB_EVAL } = require('./eval');
const { PRDC_JSLAB_COMMAND_WINDOW } = require('./command-window');
const { PRDC_JSLAB_COMMAND_HISTORY } = require('./command-history');
const { PRDC_JSLAB_WORKSPACE } = require('./workspace');
const { PRDC_JSLAB_FOLDER_NAVIGATION } = require('./folder-navigation');
const { PRDC_JSLAB_FILE_BROWSER } = require('./file-browser');
const { PRDC_JSLAB_PANELS } = require('./panels');
const { PRDC_JSLAB_GUI } = require('./gui');
const { PRDC_JSLAB_APP } = require('./app');

const { PRDC_POPUP } = require('./../../lib/PRDC_POPUP/PRDC_POPUP');

const fs = require('fs');
const path = require('path');
const Store = require('electron-store');

const store = new Store();

/**
 * Class for JSLAB main win.
 */
class PRDC_JSLAB_WIN_MAIN {  

  /**
   * Create main win.
   */
  constructor() {
    var obj = this;

    // Classes
    this.eval = new PRDC_JSLAB_EVAL(this);
    this.workspace = new PRDC_JSLAB_WORKSPACE(this);
    this.file_browser = new PRDC_JSLAB_FILE_BROWSER(this);
    this.panels = new PRDC_JSLAB_PANELS(this);
    this.gui = new PRDC_JSLAB_GUI(this);
    this.help = new PRDC_JSLAB_HELP(this);
    this.app = new PRDC_JSLAB_APP(this);
    this.command_history = new PRDC_JSLAB_COMMAND_HISTORY(this);
    this.command_window = new PRDC_JSLAB_COMMAND_WINDOW(this);
    this.info = new PRDC_JSLAB_INFO(this);
    this.settings = new PRDC_JSLAB_SETTINGS(this);
    this.folder_navigation = new PRDC_JSLAB_FOLDER_NAVIGATION(this);
    
    this.flight_commands_popup = new PRDC_POPUP(document.getElementById('sandbox-stats-icon'),
      document.getElementById('sandbox-stats-popup'));
      
    // Prevent redirects
    preventRedirect();

    // Events
    // --------------------
    // Catch errors
    window.addEventListener('unhandledrejection', function(e) {
      obj.command_window.errorInternal(e.reason.stack);
      e.preventDefault();
    });

    window.addEventListener('error', function(e) {
      obj.command_window.errorInternal(e.error.stack);
      e.preventDefault();
    });

    // On IPC message
    ipcRenderer.on('MainWindow', function(event, action, data) {
      switch(action) {
        case 'editor-disp':
          var msg = data[0];
          var focus = data[1];
          obj.command_window.messageEditor(msg);
          if(focus) {
            ipcRenderer.send('MainProcess', 'focus-win');
          }
          break;
        case 'disp':
          obj.command_window.message(data);
          break;
        case 'disp-monospaced':
          obj.command_window.messageMonospaced(data);
          break;
        case 'disp-latex':
          obj.command_window.messageLatex(data);
          break;
        case 'error':
          obj.command_window.error(data);
          ipcRenderer.send('MainProcess', 'focus-win');
          break;
        case 'warn':
          obj.command_window.warn(data);
          ipcRenderer.send('MainProcess', 'focus-win');
          break;
        case 'internal-error':
          obj.command_window.errorInternal(data);
          ipcRenderer.send('MainProcess', 'focus-win');
          break;
        case 'run':
          var script_path = data[0];
          var lines = data[1];
          obj.eval.evalScript(script_path, lines);
          ipcRenderer.send('MainProcess', 'focus-win');
          break;
        case 'eval-command':
          obj.eval.evalCommand(data[0]);
          ipcRenderer.send('MainProcess', 'focus-win');
          break;
        case 'help':
          obj.gui.help();
          break;
        case 'info':
          obj.gui.info();
          break;
        case 'settings':
          obj.gui.settings();
          break;
        case 'clear':
          obj.command_window.clear();
          break;
        case 'save-path':
          var new_path = data;
          obj.folder_navigation.savePath(new_path, false);
          break;
        case 'remove-path':
          var saved_path = data;
          obj.folder_navigation.removePath(saved_path, false);
          break;
        case 'set-workspace':
          obj.workspace.setWorkspace(data);
          break;
        case 'update-workspace':
          obj.workspace.updateWorkspace();
          break;
        case 'update-file-browser':
          obj.file_browser.updateFileBrowser();
          break;
        case 'code-evaluating':
          obj.evaluating = true;
          break; 
        case 'code-evaluated':
          obj.evaluating = false;
          break; 
        case 'show-ans':
          obj.command_window.highlightAnsMessage(data);
          break;
        case 'set-status':
          var state = data[0];
          var txt = data[1];
          obj.gui.setStatus(state, txt);
          break;
        case 'set-stats':
          var stats = data;
          obj.gui.setStats(stats);
          break;
        case 'clear-storage':
          store.clear();
          break;
        case 'unknown-script-dir':
          obj.folder_navigation.unknownScriptDir();
          break;
        case 'set-current-path':
          obj.folder_navigation.setPath(data);
          break;
      }
    });

    // Keyboard events
    document.addEventListener('keydown', function(e) {
      // Show Dev Tools
      if(e.key == 'F12') {
        ipcRenderer.send('MainProcess', 'show-dev-tools');
        ipcRenderer.send('MainProcess', 'show-sandbox-dev-tools');
        e.stopPropagation();
        e.preventDefault();
      } else if(e.ctrlKey && e.key.toLowerCase() == 'c') {
        if(obj.getSelectionText() == "") {
          // No selected text
          obj.command_window.messageInternal(language.string(89));
          ipcRenderer.send('SandboxWindow', 'stop-loop', true);
          e.stopPropagation();
          e.preventDefault();
        }
      } else if(e.key.toLowerCase() == 'h' && e.ctrlKey) {
        // Ctrl + H
        obj.gui.help();
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key.toLowerCase() == 'i' && e.ctrlKey) {
        // Ctrl + I
        obj.gui.info();
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key.toLowerCase() == 's' && e.ctrlKey) {
        // Ctrl + S
        obj.gui.settings();
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key.toLowerCase() == 'd' && e.ctrlKey) {
        // Ctrl + D
        obj.eval.evalCommand('openDoc()');
        e.stopPropagation();
        e.preventDefault();
      }
    });
  }
  
  /**
   * Method called when the program is ready to start.
   */
  onReady() {
    var obj = this;
    obj.processArguments();
    obj.panels.onReady();
    
    // Fade in window
    ipcRenderer.send('MainProcess', 'fade-in-win');
    
    // Focus code input
    obj.command_window.code_input.focus();
    obj.command_window.code_input.setCursor(
    obj.command_window.code_input.lineCount(), 0);
  }

  /**
   * Processes startup arguments, opening files or setting the workspace as needed.
   */
  processArguments() {
    // Process arguments
    if(process.argv.length > 0) {
      var arg = process.argv[1];
      
      // Check if there is scripts in argument
      if(arg && this.folder_navigation.checkFile(arg)) {
        // Open script in editor
        ipcRenderer.send('EditorWindow', 'open-script', [arg]);
        var dir = path.dirname(arg);
        if(dir !== undefined) {
          this.folder_navigation.setPath(dir);
        }
      }
    }
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
   * Resets the sandbox and updates paths and settings.
   */
  onSandboxReset() {
    ipcRenderer.send('SandboxWindow', 'set-language', language.lang);
    ipcRenderer.send('SandboxWindow', 'set-saved-paths', this.folder_navigation.saved_paths);
    ipcRenderer.send('SandboxWindow', 'set-current-path', this.folder_navigation.current_path);
    this.command_window.clear();
    this.workspace.updateWorkspace();
    this.gui.resetStats();
    this.evaluating = false;
  }
   
  /**
   * Gracefully closes the application after performing necessary cleanup operations.
   */
  close() {
    store.set('full_history', this.command_history.full_history);
    store.set('current_path', this.folder_navigation.current_path);
    store.set('saved_paths', this.folder_navigation.saved_paths);
    ipcRenderer.send('MainProcess', 'close-app');
  }
}

exports.PRDC_JSLAB_WIN_MAIN = PRDC_JSLAB_WIN_MAIN;