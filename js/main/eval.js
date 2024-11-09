/**
 * @file JSLAB eval module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');

/**
 * Class for JSLAB eval.
 */
class PRDC_JSLAB_EVAL {

  /**
   * Initializes the script evaluation functionality, setting up the necessary environment and variables.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    this.last_script_path;
    this.jslfilename = 'jslcmdwindow';
  }

  /**
   * Evaluates a script from the specified path, optionally focusing on specific lines. Manages the evaluation process to prevent overlap with ongoing evaluations.
   * @param {string} script_path The path to the script file to be evaluated.
   * @param {Array<number>} [lines] Optional. Specifies the lines of the script to focus the evaluation on.
   */
  evalScript(script_path, lines) {
    if(!this.win.evaluating) {
      this.last_script_path = script_path;
      script_path = script_path.replace(/\\/g, '\\\\');
      var cmd;
      if(lines !== undefined) {
        cmd = 'run("' + script_path + ', ' + lines.toString() + '")';
      } else {
        cmd = 'run("' + script_path + '")';
      }
      this.evalCommand(cmd, false);
    } else {
      this.win.command_window.message('@evalScript: Sandbox is busy...');
    }
  }

  /**
   * Evaluates a given command, optionally displaying the output in the application's command window. Manages the command evaluation process to prevent overlap with ongoing evaluations.
   * @param {string} cmd The command to be evaluated.
   * @param {boolean} [show_output=true] Specifies whether the output of the command should be displayed in the command window.
   * @param {string} [jsl_file_name='jslcmdwindow'] Specifies the file name context for the command evaluation.
   */
  evalCommand(cmd, show_output = true, jsl_file_name = 'jslcmdwindow') {
    if(!this.win.evaluating) {
      if(cmd.length) {
        this.win.command_window.addMessageCmd(cmd);
        this.win.command_history.updateHistory(cmd);
        this.win.command_window.code_input.setValue('');
        this.win.command_window.scrollToBottom();
        this.win.command_window.resetHistoryIndex();
        this.evalCode(cmd, show_output, jsl_file_name);
      }
    } else {
      this.win.command_window.message('@evalCommand: Sandbox is busy...');
    }
  }

  /**
   * Directly evaluates code, interacting with the sandbox environment for execution. Ensures that only one evaluation is happening at any time.
   * @param {string} code The code snippet to be evaluated.
   * @param {boolean} [show_output=true] Specifies whether the output of the code evaluation should be shown.
   * @param {string} [jsl_file_name='jslcmdwindow'] The context file name for the code evaluation.
   */
  evalCode(code, show_output = true, jsl_file_name = 'jslcmdwindow') {
    if(!this.win.evaluating) {
      this.win.evaluating = true;
      ipcRenderer.send('SandboxWindow', 'eval-code', 
        [code, show_output, jsl_file_name]);
    } else {
      this.win.command_window.message('@evalCode: Sandbox is busy...');
    }
  }

  /**
   * Handles actions for the script directory dialog buttons, including changing the active directory, saving the directory to paths, and running the last script.
   * @param {number} s The button state indicating the action to be performed.
   */
  scriptDirDialogButton(s) {
    this.win.gui.closeDialog($('#script-path-container'));
    var script_dir = path.dirname(this.last_script_path);
    if(s == 2) {
      // Change active directory
      this.win.folder_navigation.setPath(script_dir);
    } else if(s == 1) {
      // Add directory to saved paths
      this.win.folder_navigation.savePath(script_dir);
    }
    
    ipcRenderer.send('SandboxWindow', 'run-last-script'); 
  }

}

exports.PRDC_JSLAB_EVAL = PRDC_JSLAB_EVAL;