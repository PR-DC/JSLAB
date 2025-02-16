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
   * Initializes the command history.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    this.history_cont = document.getElementById('command-history');
    this.full_history = store.get('full_history') || [];
    this.history = [];
    
    this.N_history_max = Number(store.get('N_history_max'));
    if(!isFinite(this.N_history_max)) {
      this.setMaxSize(20);
    }

    this.renderHistory();

    // Append initialization command
    const init_cmd = `// JSLAB ${this.win.app.version}, ${new Date()} [${this.win.app.user}]`;
    this.updateHistory(init_cmd);

    // History clear button click
    const clear_button = document.querySelector('#command-history-options .clear');
    if(clear_button) {
      clear_button.addEventListener('click', function() {
        obj.clearHistory()
      });
    }

    // Event delegation for command interactions
    this.history_cont.addEventListener('click', function(e) {
      if(e.target && !e.target.classList.contains('comment')) {
        obj.selectCommand(e.target.textContent);
      }
    });

    this.history_cont.addEventListener('dblclick', function(e) {
      if(e.target && !e.target.classList.contains('comment')) {
        obj.evalSelectedCommand(e.target.textContent);
      }
    });
  }

  /**
   * Renders the entire history efficiently using DocumentFragment.
   */
  renderHistory() {
    const fragment = document.createDocumentFragment();

    this.full_history.forEach((cmd) => {
      const div = document.createElement('div');
      if(cmd.startsWith('//')) {
        div.classList.add('comment');
      }
      div.textContent = cmd.replace(/\\/g, '\\\\');
      fragment.appendChild(div);
    });

    this.history_cont.appendChild(fragment);
    this.scrollToBottom();
  }

  /**
   * Adds a command to the history, updating the UI and internal storage accordingly.
   * @param {string} cmd The command to be added to the history.
   */
  updateHistory(cmd) {
    if(this.full_history.length >= this.N_history_max) {
      this.full_history.shift();
      if(this.history_cont.firstChild) {
        this.history_cont.removeChild(this.history_cont.firstChild);
      }
    }

    const div = document.createElement('div');
    if(cmd.startsWith('//')) {
      div.classList.add('comment');
    } else {
      this.history.unshift(cmd)
    }
    div.textContent = cmd;
    this.history_cont.appendChild(div);
    this.full_history.push(cmd);

    this.scrollToBottom();
    this.saveHistory();
  }

  /**
   * Scrolls the history container to the bottom.
   */
  scrollToBottom() {
    this.history_cont.scrollTop = this.history_cont.scrollHeight;
  }

  /**
   * Selects a command from the history, placing it in the command input for potential modification and re-execution.
   * @param {string} cmd The command to select.
   */
  selectCommand(cmd) {
    const code_input = this.win.command_window.code_input;
    code_input.setValue(cmd);
    code_input.focus();
    code_input.setCursor(code_input.lineCount(), 0);
  }

  /**
   * Evaluates a selected command from the history, directly executing it without modification.
   * @param {string} cmd The command to evaluate.
   */
  evalSelectedCommand(cmd) {
    this.win.eval.evalCommand(cmd);
  }

  /**
   * Clears the command history.
   */
  clearHistory() {
    this.full_history = [];
    this.history_cont.innerHTML = '';
    this.saveHistory();
  }

  /**
   * Saves the current history to storage asynchronously.
   */
  saveHistory() {
    store.set('full_history', this.full_history);
  }

  /**
   * Sets the maximum number of commands to retain in the history.
   * @param {number} N - The desired maximum number of history entries
   */
  setMaxSize(N) {
    if(N < 5) {
      N = 5;
    }
    this.N_history_max = N;
    $('#settings-container .N-history-max').val(N);
    while(this.full_history.length >= this.N_history_max) {
      this.full_history.shift();
      if(this.history_cont.firstChild) {
        this.history_cont.removeChild(this.history_cont.firstChild);
      }
    }
    store.set('N_history_max', this.N_history_max);
    this.saveHistory();
  }
}

exports.PRDC_JSLAB_COMMAND_HISTORY = PRDC_JSLAB_COMMAND_HISTORY;