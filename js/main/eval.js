/**
 * @file JSLAB eval
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


/**
 * Class for JSLAB eval.
 */
class PRDC_JSLAB_MAIN_EVAL {

  /**
   * Initializes the script evaluation functionality, setting up the necessary environment and variables.
   * @param {object} win The window object representing the owning window controller.
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
      const command = 'run(' + JSON.stringify(script_path) +
        (lines === undefined ? '' : ', ' + JSON.stringify(lines)) + ')';
      return this.evalCommand(command);
    } else {
      this.win.command_window.message('@evalScript: ' + language.string(347));
    }
  }

  /**
   * Evaluates a given command, optionally displaying the output in the application's command window. Manages the command evaluation process to prevent overlap with ongoing evaluations.
   * @param {string} cmd The command to be evaluated.
   * @param {boolean} [show_output=true] Specifies whether the output of the command should be displayed in the command window.
   * @param {string} [jsl_file_name='jslcmdwindow'] Specifies the file name context for the command evaluation.
   */
  evalCommand(cmd, show_output = true, jsl_file_name = 'jslcmdwindow') {
    try {
      if(this.win.debugger?.isCommand(cmd)) {
        this.win.command_window.addMessageCmd(cmd);
        this.win.command_history.updateHistory(cmd);
        this.win.command_window.code_input.setValue('');
        return this.win.debugger.executeCommand(cmd);
      }
    } catch(error) {
      this.win.command_window.error(error.message);
      return;
    }
    if(this.win.debug_paused && cmd.length) {
      this.win.command_window.addMessageCmd(cmd);
      this.win.command_history.updateHistory(cmd);
      this.win.command_window.code_input.setValue('');
      return this.win.debugger.evaluate(cmd);
    }
    if(!this.win.evaluating) {
      if(cmd.length) {
        this.win.command_window.addMessageCmd(cmd);
        this.win.command_history.updateHistory(cmd);
        this.win.command_window.code_input.setValue('');
        this.win.command_window.scrollToBottom();
        this.win.command_window.resetHistoryIndex();
        return this.evalCode(cmd, show_output, jsl_file_name);
      }
    } else {
      this.win.command_window.message('@evalCommand: ' + language.string(348));
    }
  }

  /**
   * Directly evaluates code, interacting with the sandbox environment for execution. Ensures that only one evaluation is happening at any time.
   * @param {string} code The code snippet to be evaluated.
   * @param {boolean} [show_output=true] Specifies whether the output of the code evaluation should be shown.
   * @param {string} [jsl_file_name='jslcmdwindow'] The context file name for the code evaluation.
   */
  evalCode(code, show_output = true, jsl_file_name = 'jslcmdwindow') {
    const host = this.win.platform.host;
    if(!this.win.evaluating) {
      this.win.evaluating = true;
      var ipc = host;
      if(ipc && typeof ipc.send === 'function') {
        return ipc.send('SandboxWindow', 'eval-code',
          [code, show_output, jsl_file_name]);
      }
    } else {
      this.win.command_window.message('@evalCode: ' + language.string(349));
    }
  }

  /**
   * Handles actions for the script directory dialog buttons, including changing the active directory, saving the directory to paths, and running the last script.
   * @param {number} s The button state indicating the action to be performed.
   */
  scriptDirDialogButton(s) {
    const host = this.win.platform.host;
    const { path } = this.win.platform;
    if(typeof this.last_script_path != 'string' || !this.last_script_path.length) {
      return false;
    }
    this.win.gui.closeDialog($('#script-path-container'));
    var script_dir = path.dirname(this.last_script_path);
    if(s == 2) {
      // Change active directory
      this.win.folder_navigation.setPath(script_dir);
    } else if(s == 1) {
      // Add directory to saved paths
      this.win.folder_navigation.savePath(script_dir);
    }

    var ipc = host;
    if(ipc && typeof ipc.send === 'function') {
      ipc.send('SandboxWindow', 'run-last-script');
    }
    return true;
  }

}

exports.PRDC_JSLAB_MAIN_EVAL = PRDC_JSLAB_MAIN_EVAL;
