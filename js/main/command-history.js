/**
 * @file JSLAB command history module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const Store = require('electron-store');

const store = new Store();

/**
 * Class for JSLAB command history.
 */
class PRDC_JSLAB_COMMAND_HISTORY {

  /**
   * Initializes the command history, loading previous commands from storage and setting up the UI component for displaying the history.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    this.history_cont = document.getElementById('command-history');
    this.history = [];
    this.full_history = [];    
    
    // Load full command history
    this.full_history = store.get('full_history');
    if(!this.full_history) {
      this.full_history = [];
    }
    this.full_history.forEach(function(cmd) {
      var div = document.createElement('div');
      if(cmd.startsWith('//')) {
        div.classList.add('comment');
      } else {
        $(div).click(function() {
          obj.selectCommand(this.innerText);
        });
        $(div).dblclick(function() {
          obj.evalSelectedCommand(this.innerText);
        });
      }
      div.innerText = cmd;
      $(obj.history_cont).append(div);
    });
    $(this.history_cont)[0].scrollTop = 
      $(this.history_cont)[0].scrollHeight;
    
    var cmd = '// JSLAB ' + this.win.app.version + ', ' + 
      new Date() + ' [' + this.win.app.user + ']';
    this.updateHistory(cmd);
    
    // History clear button click
    $('#command-history-options .clear').click(function(e){
      obj.full_history = [];
      $(obj.history_cont).html('');
    });
  }

  /**
   * Adds a command to the history, updating the UI and internal storage accordingly.
   * @param {string} cmd The command to be added to the history.
   */
  updateHistory(cmd) {
    var obj = this;
    var div = document.createElement('div');
    if(cmd.startsWith('//')) {
      div.classList.add('comment');
    } else {
      this.history.unshift(cmd);
      div.onclick = function() {
        obj.selectCommand(this.innerHTML);
      }
      div.ondblclick = function() {
        obj.evalSelectedCommand(this.innerHTML);
      };
    }
    div.innerHTML = cmd;
    $(this.history_cont).append(div);
    this.full_history.push(cmd);

    // Scroll to bottom
    $(this.history_cont)[0].scrollTop = 
      $(this.history_cont)[0].scrollHeight;
  }
  
  /**
   * Selects a command from the history, placing it in the command input for potential modification and re-execution.
   * @param {string} cmd The command to select.
   */
  selectCommand(cmd) {
    this.win.command_window.code_input.setValue(cmd);
    this.win.command_window.code_input.focus();
    this.win.command_window.code_input.setCursor(this.win.command_window.code_input.lineCount(), 0);
  }

  /**
   * Evaluates a selected command from the history, directly executing it without modification.
   * @param {string} cmd The command to evaluate.
   */
  evalSelectedCommand(cmd) {
    this.win.eval.evalCommand(cmd);
  }
}

exports.PRDC_JSLAB_COMMAND_HISTORY = PRDC_JSLAB_COMMAND_HISTORY