/**
 * @file JSLAB Electron files services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Implements files services for the application host.
 */
class PRDC_JSLAB_ELECTRON_FILES {
  /**
   * Connects host services to the owning application.
   * @param {Object} application Application host controller.
   */
  constructor(application) {
    this.application = application;
  }

  /**
   * Checks whether the given path is an existing .jsl file.
   * @param {string} file_path - Candidate file path.
   * @returns {boolean} True if valid .jsl file.
   */
  isJslScriptPath(file_path) {
    if(typeof file_path !== 'string' || !file_path.length) {
      return false;
    }
    if(path.extname(file_path).toLowerCase() !== '.jsl') {
      return false;
    }
    var lstat = fs.lstatSync(file_path, { throwIfNoEntry: false });
    return !!(lstat && lstat.isFile());
  }

  /**
   * Checks for an existing Simulate project or an explicitly imported model.
   * @param {string} file_path Candidate file path.
   * @param {boolean} [allow_modelica] Whether a .mo source is accepted.
   * @returns {boolean} Whether the path is a model file.
   */
  isSimulateProjectPath(file_path, allow_modelica = false) {
    const { PRDC_JSLAB_SIMULATE_PROJECT } = require('../simulate/project');
    if(!PRDC_JSLAB_SIMULATE_PROJECT.acceptsProjectPath(file_path, allow_modelica)) return false;
    return Boolean(fs.statSync(file_path, { throwIfNoEntry: false })?.isFile());
  }

  /**
   * Resolves a project using native file and picker services.
   * @param {string} [file] Explicit project path.
   * @param {Object} [options] Supported input types and open-document policy.
   * @returns {Promise<Object>} Selected path or localized error.
   */
  resolveSimulateProject(file, options) {
    const { PRDC_JSLAB_SIMULATE_PROJECT } = require('../simulate/project');
    return PRDC_JSLAB_SIMULATE_PROJECT.resolveProject(file, {
      choose: async settings => {
        const { canceled, filePaths } = await dialog.showOpenDialog(this.application.win_main, settings);
        if(!canceled) return filePaths[0];
      },
      existsFile: file => Boolean(fs.statSync(file, { throwIfNoEntry: false })?.isFile()),
      currentString: id => this.application.currentString(id)
    }, options);
  }

  /**
   * Opens scripts in the current editor window.
   * @param {Array<string>} script_paths - Paths to open.
   * @returns {boolean} True if opened immediately.
   */
  openScriptsInEditor(script_paths) {
    var obj = this;
    var opener = this;
    if(!Array.isArray(script_paths)) {
      script_paths = [];
    }

    var valid_scripts = script_paths.filter(function(script_path) {
      return opener.isJslScriptPath(script_path);
    });

    if(valid_scripts.length === 0) {
      return false;
    }

    if(!obj.application.win_editor || obj.application.win_editor.isDestroyed() ||
       !obj.application.win_editor.webContents || obj.application.win_editor.webContents.isLoading()) {
      this.application.pending_open_scripts = Array.from(new Set(
        this.application.pending_open_scripts.concat(valid_scripts)
      ));
      return false;
    }

    obj.application.windows.showEditor();
    valid_scripts.forEach(function(script_path) {
      obj.application.win_editor.send('EditorWindow', 'open-script', [script_path]);
    });

    if(obj.application.win_main && !obj.application.win_main.isDestroyed()) {
      var dir = path.dirname(valid_scripts[0]);
      if(dir && dir.length) {
        obj.application.win_main.send('MainWindow', 'set-current-path', dir);
      }
    }

    obj.application.instance_router.markAsLastActive();
    return true;
  }

  /**
   * Flushes queued open-script requests after editor load.
   */
  flushPendingOpenScripts() {
    if(!this.application.pending_open_scripts.length) {
      return;
    }
    var script_paths = this.application.pending_open_scripts.slice();
    this.application.pending_open_scripts = [];
    this.openScriptsInEditor(script_paths);
  }

  /**
 * Normalizes native file-dialog options with the application icon.
 */
  _normalizeDialogParams(params) {
    var obj = this;

    if(!params) {
      params = {};
    }
    if(!params.hasOwnProperty('icon')) {
      params.icon = obj.application.app_icon;
    }
    return params;

  }

  /**
 * Opens a native dialog with its originating application window as owner.
 */
  _callDialogForSender(sender, method, params) {
    var obj = this;

    params = this._normalizeDialogParams(params);
    var sender_win = null;
    try {
      sender_win = BrowserWindow.fromWebContents(sender);
    } catch(err) {}
    if(sender_win) {
      return dialog[method](sender_win, params);
    }
    return dialog[method](params);

  }

  /**
 * Connects file dialogs and PDF export to renderer requests.
 */
  bindFileRequests() {
    var obj = this;
    ipcMain.handle('dialog', function(e, method, params) {
      return obj._callDialogForSender(e.sender, method, params);
    });

    ipcMain.handle('print-to-pdf', async function(e, options) {
      return await e.sender.printToPDF(options);
    });

    ipcMain.handle('print-sub-win-to-pdf', async function(e, wid, options) {
      return await obj.application.sandbox_sub_wins[wid].webContents.printToPDF(options);
    });

    ipcMain.on('dialog', function(e, method, params) {
      e.returnValue = obj._callDialogForSender(e.sender, method, params);
    });
  }
}

exports.PRDC_JSLAB_ELECTRON_FILES = PRDC_JSLAB_ELECTRON_FILES;
