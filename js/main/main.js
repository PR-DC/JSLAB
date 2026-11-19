/**
 * @file JSLAB GUI script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_PANEL } = require('../../lib/PRDC_PANEL/PRDC_PANEL');

const { PRDC_JSLAB_ASSISTANT } = require('../windows/assistant');

// Modules
// --------------------


const { PRDC_JSLAB_COMMAND_WINDOW_DEBUGGER } = require("./command-window-debugger");
const { PRDC_JSLAB_SETTINGS } = require('./settings');
const { PRDC_JSLAB_MAIN_EVAL } = require('./eval');
const { PRDC_JSLAB_COMMAND_WINDOW } = require('./command-window');
const { PRDC_JSLAB_COMMAND_HISTORY } = require('./command-history');
const { PRDC_JSLAB_WORKSPACE } = require('./workspace');
const { PRDC_JSLAB_FOLDER_NAVIGATION } = require('./folder-navigation');
const { PRDC_JSLAB_FILE_BROWSER } = require('./file-browser');
const { PRDC_JSLAB_MAIN_WINDOW_UI } = require('./window-ui');

const { PRDC_POPUP } = require('../../lib/PRDC_POPUP/PRDC_POPUP');


/**
 * Class for JSLAB main win.
 */
class PRDC_JSLAB_MAIN {

  /**
   * Create main win.
   */
  constructor(platform) {
    this.platform = platform;
    const { host, store } = this.platform;
    var obj = this;

    this.app = this.platform.getApplicationInfo();
    this._createPanels();

    // Classes
    this.eval = new PRDC_JSLAB_MAIN_EVAL(this);
    this.workspace = new PRDC_JSLAB_WORKSPACE(this);
    this.file_browser = new PRDC_JSLAB_FILE_BROWSER(this);
    this.gui = new PRDC_JSLAB_MAIN_WINDOW_UI(this);
    this.command_history = new PRDC_JSLAB_COMMAND_HISTORY(this);
    this.command_window = new PRDC_JSLAB_COMMAND_WINDOW(this);
    this.debugger = new PRDC_JSLAB_COMMAND_WINDOW_DEBUGGER(this, host);
    this.settings = new PRDC_JSLAB_SETTINGS(this);
    this.folder_navigation = new PRDC_JSLAB_FOLDER_NAVIGATION(this);

    this.flight_commands_popup = new PRDC_POPUP(document.getElementById('sandbox-stats-icon'),
      document.getElementById('sandbox-stats-popup'));

    // Prevent redirects
    this.platform.preventRedirect();

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
    host.on('MainWindow', function(event, action, data) {
      switch(action) {
        case 'editor-disp':
          var msg = data[0];
          var focus = data[1];
          obj.command_window.messageEditor(msg);
          if(focus) {
            host.send('MainProcess', 'focus-win');
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
        case 'disp-internal':
          obj.command_window.messageInternal(Array.isArray(data) && typeof data[1] === 'boolean' ? data[0] : data);
          break;
        case 'show-inspector':
          obj.command_window.showInspector(data);
          break;
        case 'error':
          obj.command_window.error(data);
          host.send('MainProcess', 'focus-win');
          break;
        case 'warn':
          obj.command_window.warn(data);
          host.send('MainProcess', 'focus-win');
          break;
        case 'internal-error':
          obj.command_window.errorInternal(data);
          host.send('MainProcess', 'focus-win');
          break;
        case 'run':
          var script_path = data[0];
          var lines = data[1];
          var script_result = obj.eval.evalScript(script_path, lines);
          host.send('MainProcess', 'focus-win');
          return script_result;
        case 'eval-command':
          var command_result = obj.eval.evalCommand(data[0]);
          host.send('MainProcess', 'focus-win');
          return command_result;
        case 'eval-command-preserve-input':
          var preserved_result = obj.command_window.evalCommandPreserveInput(data[0]);
          host.send('MainProcess', 'focus-win');
          return preserved_result;
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
        case 'diary':
          obj.command_window.diary(data);
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
          if(obj.debug_paused) {
            obj.debugger.global_workspace = data;
          } else {
            obj.workspace.setWorkspace(data);
          }
          break;
        case 'update-workspace':
          obj.workspace.updateWorkspace();
          break;
        case 'update-file-browser':
          obj.file_browser.updateFileBrowser();
          break;
        case 'debugger-state':
          obj.debugger.update(data);
          break;
        case 'debugger-select-frame':
          obj.debugger.selectFrame(data.frame_index, data.revision);
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
          if(typeof data === 'string') obj.eval.last_script_path = data;
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
        host.send('MainProcess', 'show-dev-tools');
        host.send('MainProcess', 'show-sandbox-dev-tools');
        e.stopPropagation();
        e.preventDefault();
      } else if(e.ctrlKey && e.key.toLowerCase() == 'c') {
        if(obj.getSelectionText() == "") {
          // No selected text
          obj.command_window.messageInternal(language.string(89));
          host.send('SandboxWindow', 'interrupt-execution', true);
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
    const { host } = this.platform;
    var obj = this;
    obj.processArguments();
    obj.panels.columns.onResize();

    // Fade in window
    host.send('MainProcess', 'fade-in-win');

    // Focus code input
    obj.command_window.code_input.focus();
    obj.command_window.code_input.setCursor(
      obj.command_window.code_input.lineCount(), 0);
  }

  /**
   * Processes startup arguments, opening files or setting the workspace as needed.
   */
  processArguments() {
    const { host, path } = this.platform;
    // Process arguments
    var args = this.platform.getArguments();
    if(args.length > 0) {
      var arg = args[1];

      // Check if there is scripts in argument
      if(arg && this.folder_navigation.checkFile(arg)) {
        // Open script in editor
        host.send('EditorWindow', 'open-script', [arg]);
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
    const selection = this.command_window.code_input?.getSelection();
    if(selection) {
      return selection;
    }
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
    const { host } = this.platform;
    host.send('SandboxWindow', 'set-language', language.lang);
    host.send('SandboxWindow', 'set-saved-paths', this.folder_navigation.saved_paths);
    host.send('SandboxWindow', 'set-current-path', this.folder_navigation.current_path);
    this.command_window.clear();
    this.workspace.updateWorkspace();
    this.gui.resetStats();
    this.evaluating = false;
  }

  /**
   * Gracefully closes the application after performing necessary cleanup operations.
   */
  close() {
    const { host, store } = this.platform;
    store.set('full_history', this.command_history.full_history);
    store.set('current_path', this.folder_navigation.current_path);
    store.set('saved_paths', this.folder_navigation.saved_paths);
    host.send('MainProcess', 'close-app');
  }

  /**
   * Generates a formatted string representing the current date and time, suitable for timestamps and logging.
   * @param {number} [t=Date.now()] Optional timestamp to format, defaults to the current time if not provided.
   * @returns {string} A string formatted to represent a date and time, structured as DD_MM_YYYY. HH_MM_SS_mmm.
   */
  getDateTimeFullStr(t = Date.now()) {
    var d = new Date(t);
    return ('0' + d.getDate()).slice(-2) + "_" +
      ('0' + (d.getMonth() + 1)).slice(-2) + "_" +
      d.getFullYear() + '. ' + ('0' + d.getHours()).slice(-2) + "_" +
      ('0' + d.getMinutes()).slice(-2) + "_" +
      ('0' + d.getSeconds()).slice(-2) + "_" +
      ('00' + d.getMilliseconds()).slice(-3);
  }

  /**
   * Creates the main window panels and connects their resize handling.
   */
  _createPanels() {

    const panels = this.panels = {};

    panels.columns = new PRDC_PANEL('columns', 'vertical', document.getElementById('panels-container'), [document.getElementById('left-panel'), document.getElementById('right-panel')], config.PANEL_DEFAULT_COLUMNS, undefined, this.platform.panel_store);

    panels.left_rows = new PRDC_PANEL('left-rows', 'horizontal', document.getElementById('left-panel'), [document.getElementById('left-top-panel'), document.getElementById('left-middle-panel'), document.getElementById('left-bottom-panel')], config.PANEL_DEFAULT_LEFT_ROWS, undefined, this.platform.panel_store);

    panels.workspace_columns = new PRDC_PANEL('workspace-columns', 'vertical', document.getElementById('workspace'), ['#left-middle-panel .col-1', '#left-middle-panel .col-2', '#left-middle-panel .col-3'], config.PANEL_DEFAULT_WORKSPACE_COLUMNS, undefined, this.platform.panel_store);

    panels.columns.addSubPanel(panels.left_rows);
    panels.left_rows.addSubPanel(panels.workspace_columns);

    // Initialize panels
    window.addEventListener('resize', function() {
      panels.columns.onResize();
    });
  }


  /**
 * Returns this controller's bounded context for Assistant tools.
 */
  getAssistantContext() {
    return PRDC_JSLAB_ASSISTANT.mainContext(this);
  }
}

exports.PRDC_JSLAB_MAIN = PRDC_JSLAB_MAIN;
