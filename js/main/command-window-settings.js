/**
 * @file JSLAB command window settings submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const Store = require('electron-store');

const store = new Store();

class PRDC_JSLAB_COMMAND_WINDOW_SETTINGS {

  /**
   * Creates settings submodule and binds methods to parent command window.
   * @param {Object} command_window Parent command window instance.
   */
  constructor(command_window) {
    this.command_window = command_window;
    this._bindToCommandWindow();
  }

  /**
   * Binds all submodule methods to command window and exposes them on parent.
   */
  _bindToCommandWindow() {
    var obj = this;
    Object.getOwnPropertyNames(PRDC_JSLAB_COMMAND_WINDOW_SETTINGS.prototype).forEach(function(name) {
      if(name === 'constructor' || name === '_bindToCommandWindow') {
        return;
      }
      if(typeof obj[name] !== 'function') {
        return;
      }
      var bound = obj[name].bind(obj.command_window);
      obj[name] = bound;
      obj.command_window[name] = bound;
    });
  }
}

Object.assign(PRDC_JSLAB_COMMAND_WINDOW_SETTINGS.prototype, {

  /**
   * Opens a specified dialog related to the terminal, like settings or history.
   * @param {jQuery} e The jQuery object representing the dialog to open.
   */
  openTerminalDialog(e) {
    if(!e.is(':visible')) {
      $('.terminal-dialog').fadeOut(300, 'linear');
      e.fadeIn(300, 'linear', function() {
        e.focus();
      });
    }
  },

  /**
   * Closes a specified dialog related to the terminal.
   * @param {jQuery} e The jQuery object representing the dialog to close.
   */
  closeTerminalDialog(e) {
    e.fadeOut(300, 'linear');
    this.code_input.focus();
    this.code_input.setCursor(this.code_input.lineCount(), 0);
  },

  /**
   * Toggles the visibility of timestamps in the command window.
   */
  setTimestamp() {
    var timestamp_button =
      $('#right-panel .options .timestamp');
    if(this.show_timestamp) {
      if($(this.messages).hasClass('no-timestamp')) {
        $(this.messages).removeClass('no-timestamp');
        $(timestamp_button).addClass('active');
        $(timestamp_button).attr('title', language.currentString(41));
        $(timestamp_button).attr('title-str', 41);
      }
    } else {
      if(!$(this.messages).hasClass('no-timestamp')) {
        $(this.messages).addClass('no-timestamp');
        $(timestamp_button).removeClass('active');
        $(timestamp_button).attr('title', language.currentString(166));
        $(timestamp_button).attr('title-str', 166);
      }
    }
    store.set('show_timestamp', this.show_timestamp);
  },

  /**
   * Toggles the autoscroll feature of the command window, ensuring the latest messages are always in view.
   */
  setAutoscroll() {
    var autoscroll_button =
      $('#right-panel .options .autoscroll');
    if(this.autoscroll) {
      if(!$(autoscroll_button).hasClass('active')) {
        $(autoscroll_button).addClass('active');
        $(autoscroll_button).attr('title', language.currentString(42));
        $(autoscroll_button).attr('title-str', 42);
      }
    } else {
      if($(autoscroll_button).hasClass('active')) {
        $(autoscroll_button).removeClass('active');
        $(autoscroll_button).attr('title', language.currentString(167));
        $(autoscroll_button).attr('title-str', 167);
      }
    }
    store.set('autoscroll', this.autoscroll);
  },

  /**
   * Sets the maximum number of messages to display in the command window before older messages are removed.
   */
  setNMessagesMax() {
    var N_messages_max_input =
      $('#right-panel .terminal-settings .N-messages-max');
    if(isFinite(this.N_messages_max) && this.N_messages_max < this.min_messages_max) {
      this.N_messages_max = this.min_messages_max;
    }
    if($(N_messages_max_input).val() != this.N_messages_max) {
      $(N_messages_max_input).val(this.N_messages_max);
    }
    store.set('N_messages_max', this.N_messages_max);
    this.enforceRenderedMessagesLimit();
  },

  /**
   * Toggles whether timestamps are written to the log file.
   */
  setWriteTimestamps() {
    var write_timestamps_input =
      $('#right-panel .terminal-log .write-timestamps')[0];
    if(this.write_timestamps) {
      if(!write_timestamps_input.checked) {
        write_timestamps_input.checked = true;
      }
    } else {
      if(write_timestamps_input.checked) {
        write_timestamps_input.checked = false;
      }
    }
    store.set('write_timestamps', this.write_timestamps);
  },

  /**
   * Saves the current log of the command window to a file.
   */
  saveLog() {
    let options = {
     title: language.currentString(150),
     defaultPath : 'jslab_'+ this.win.app.getDateTimeFullStr() + '.log',
     buttonLabel: language.currentString(151),
      filters: [
        {name: 'Log', extensions: ['log', 'txt']},
        {name: language.currentString(345), extensions: ['*']}
       ]
    };

    var obj = this;
    ipcRenderer.invoke('dialog', 'showSaveDialog', options).then(function(result) {
      if(!result.canceled) {
        var data = '';
        obj.log.forEach(function(x) {
          data += x.class + ': ';
          if(obj.write_timestamps) {
            data += '[' + x.timestamp + '] ';
          }
          data += x.data + '\r\n';
        });

        fs.writeFile(result.filePath, data, function(err) {
          if(err) {
            obj.errorInternal(err);
          }
        });
      }
    }).catch(function(err) {
      obj.errorInternal(err);
    });
  }
});

exports.PRDC_JSLAB_COMMAND_WINDOW_SETTINGS = PRDC_JSLAB_COMMAND_WINDOW_SETTINGS;
