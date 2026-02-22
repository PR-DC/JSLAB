/**
 * @file JSLAB main process script opener helpers
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');

/**
 * Script-opening helper for the Electron main process.
 */
class PRDC_JSLAB_SCRIPT_OPENER {

  /**
   * Creates a script opener bound to the main process controller.
   * @param {Object} main Main process controller instance.
   */
  constructor(main) {
    this.main = main;
    this.pending_open_scripts = [];
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
   * Opens scripts in the current editor window.
   * @param {Array<string>} script_paths - Paths to open.
   * @returns {boolean} True if opened immediately.
   */
  openScriptsInEditor(script_paths) {
    var obj = this.main;
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

    if(!obj.win_editor || obj.win_editor.isDestroyed() ||
       !obj.win_editor.webContents || obj.win_editor.webContents.isLoading()) {
      this.pending_open_scripts = Array.from(new Set(
        this.pending_open_scripts.concat(valid_scripts)
      ));
      return false;
    }

    obj.showEditor();
    valid_scripts.forEach(function(script_path) {
      obj.win_editor.send('EditorWindow', 'open-script', [script_path]);
    });

    if(obj.win_main && !obj.win_main.isDestroyed()) {
      var dir = path.dirname(valid_scripts[0]);
      if(dir && dir.length) {
        obj.win_main.send('MainWindow', 'set-current-path', dir);
      }
    }

    obj.instance_router.markAsLastActive();
    return true;
  }

  /**
   * Flushes queued open-script requests after editor load.
   */
  flushPendingOpenScripts() {
    if(!this.pending_open_scripts.length) {
      return;
    }
    var script_paths = this.pending_open_scripts.slice();
    this.pending_open_scripts = [];
    this.openScriptsInEditor(script_paths);
  }
}

exports.PRDC_JSLAB_SCRIPT_OPENER = PRDC_JSLAB_SCRIPT_OPENER;
