/**
 * @file JSLAB command window input/history submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { shell } = require('electron');
const { PRDC_JSLAB_CODE_DOC_HOVER } = require('../code/doc-hover');

class PRDC_JSLAB_COMMAND_WINDOW_INPUT {

  /**
   * Creates input submodule and binds methods to parent command window.
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
    Object.getOwnPropertyNames(PRDC_JSLAB_COMMAND_WINDOW_INPUT.prototype).forEach(function(name) {
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

Object.assign(PRDC_JSLAB_COMMAND_WINDOW_INPUT.prototype, {

  /**
   * Initializes command-history dialog interactions.
   */
  initHistoryDialog() {
    var obj = this;
    this.terminal_history_cont =
      $('#right-panel .history-cont');
    $('#right-panel .history-close').click(function() {
      obj.closeTerminalDialog(obj.terminal_history_cont);
    });
    this.terminal_history_cont.on('keydown', function(e) {
      // https://keycode.info/
      function activateCommand() {
        var el_a = $('#right-panel .history-cont .history-panel li.active');
        var el = $('#right-panel .history-cont .history-panel li[i="'+obj.i_history+'"]');
        el_a.removeClass('active');
        el.addClass('active');
        el[0].scrollIntoView({block: 'center', inline: 'center'});
        obj.code_input.setValue(obj.win.command_history.history[obj.i_history]);
        obj.code_input.setCursor(obj.code_input.lineCount(), 0);
      }

      if(e.key == 'Enter' && !e.shiftKey) {
        // Enter
        var el_a = $('#right-panel .history-cont .history-panel li.active');
        var cmd = el_a.html();
        obj.win.eval.evalCommand(cmd);
        obj.closeTerminalDialog(obj.terminal_history_cont);
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'Escape') {
        // ESC
        obj.closeTerminalDialog(obj.terminal_history_cont);
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'ArrowUp') {
        // Arrow up
        if(obj.i_history > 0) {
          obj.i_history -= 1;
          activateCommand();
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'ArrowDown') {
        // Arrow down
        if(obj.i_history < (obj.win.command_history.history.length-1)) {
          obj.i_history += 1;
          activateCommand();
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'PageUp') {
        // Page up
        if(obj.win.command_history.history.length) {
          obj.i_history = 0;
          activateCommand();
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'PageDown') {
        // Page down
        if(obj.win.command_history.history.length) {
          obj.i_history = obj.win.command_history.history.length - 1;
          activateCommand();
        }
        e.stopPropagation();
        e.preventDefault();
      }
    });
  },

  /**
   * Initializes settings dialog interactions.
   */
  initSettingsDialog() {
    var obj = this;
    this.settings_dialog =
      $('#right-panel .terminal-settings');
    this.settings_dialog.on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.closeTerminalDialog(obj.settings_dialog);
        e.stopPropagation();
        e.preventDefault();
      }
    });
    $('#right-panel .terminal-settings .options-close').click(function() {
      obj.closeTerminalDialog(obj.settings_dialog);
    });
    this.setNMessagesMax();
    $('#right-panel .terminal-settings .change-settings').click(function() {
      obj.closeTerminalDialog(obj.settings_dialog);
      obj.N_messages_max =
        Number($('#right-panel .terminal-settings .N-messages-max').val());
      obj.setNMessagesMax();
    });
  },

  /**
   * Initializes log dialog interactions.
   */
  initLogDialog() {
    var obj = this;
    this.log_dialog = $('#right-panel .terminal-log');
    this.log_dialog.on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.closeTerminalDialog(obj.log_dialog);
        e.stopPropagation();
        e.preventDefault();
      }
    });
    $('#right-panel .terminal-log .options-close').click(function() {
      obj.closeTerminalDialog(obj.log_dialog);
    });
    $('#right-panel .terminal-log .write-timestamps').click(function() {
      obj.write_timestamps = this.checked;
      obj.setWriteTimestamps();
    });
    this.setWriteTimestamps();
    $('#right-panel .terminal-log .save-log').click(function() {
      obj.closeTerminalDialog(obj.log_dialog);
      obj.saveLog();
    });
  },

  /**
   * Binds global document shortcuts for command window.
   */
  bindDocumentShortcuts() {
    var obj = this;
    $(document).on('keydown', function(e) {
      if(e.key.toLowerCase() == 'f' && e.ctrlKey) {
        // Ctrl + F
        obj.scrollToBottom();
        obj.code_input.focus();
        obj.code_input.setCursor(obj.code_input.lineCount(), 0);
        e.stopPropagation();
        e.preventDefault();
      }
    });
  },

  /**
   * Initializes CodeMirror input and command-history keybindings.
   */
  initCodeInput() {
    var obj = this;
    this.code_input = CodeMirror.fromTextArea(
        document.getElementById('command-window-input'), {
      mode: 'javascript',
      theme: 'notepadpp',
      indentUnit: 2,
      tabSize: 2,
      lineWrapping: true,
      matchBrackets: true,
      gutter: true,
      gutters: ['CodeMirror-lint-markers'],
      lint: {
        getAnnotations: async function(text, callback) {
          var results = await obj.eslint.lintText(text);
          callback(results[0].messages.map(message => ({
            from: CodeMirror.Pos(message.line - 1, message.column - 1),
            to: CodeMirror.Pos(
              message.endLine ? message.endLine - 1 : message.line - 1,
              message.endColumn ? message.endColumn - 1 : message.column
            ),
            severity: message.severity === 2 ? "error" : "warning",
            message: message.message,
          })));
        },
        async: true
      },
      highlightSelectionMatches: {annotateScrollbar: true},
      viewportMargin: Infinity,
      extraKeys: { Enter: function() {
        sendCommand();
      } }
    });

    $('#command-window-input-submit-cont').click(function() {
      sendCommand();
    });

    CodeMirror.keyMap.default['Shift-Tab'] = 'indentLess';
    CodeMirror.keyMap.default['Tab'] = 'indentMore';

    this.code_input.on('keypress', function(cm, event) {
      if(!cm.state.completionActive && !event.ctrlKey &&
          event.key != 'Enter' &&
          event.key != ';' && event.key != ' ' &&
          event.key != '{' & event.key != '}') {
        CodeMirror.commands.autocomplete(cm, null,
          {completeSingle: false});
      }
    });

    // Hover documentation for tokens in command input
    this.code_doc_hover = new PRDC_JSLAB_CODE_DOC_HOVER({
      on_print_doc: function(entry) {
        var query = entry && entry.doc_query ? entry.doc_query : '';
        if(!query.length) {
          return;
        }
        obj.evalCommandPreserveInput('documentation(' + JSON.stringify(query) + ')');
      }
    });
    this.code_doc_hover.attach(this.code_input);

    // Code input keydown callbacks
    function historyUp() {
      if(obj.i_history < (obj.win.command_history.history.length - 1)) {
        obj.i_history += 1;
        obj.code_input.setValue(obj.win.command_history.history[obj.i_history]);
        obj.code_input.setCursor(obj.code_input.lineCount(), 0);
        obj.scrollToBottom();
      }
    }

    function historyDown() {
      if(obj.i_history > 0) {
        obj.i_history -= 1;
        obj.code_input.setValue(obj.win.command_history.history[obj.i_history]);
        obj.code_input.setCursor(obj.code_input.lineCount(), 0);
      }
    }

    function sendCommand() {
      var cmd = obj.code_input.getValue();
      obj.win.eval.evalCommand(cmd);
    }

    this.code_input.on('keydown', function(cm, e) {
      // https://keycode.info/
      if(e.key == 'Escape' &&
          !obj.code_input.state.completionActive) {
        // ESC
        obj.code_input.setValue('');
        obj.resetHistoryIndex();
        obj.scrollToBottom();
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'ArrowUp' &&
          !obj.code_input.state.completionActive) {
        // Arrow up

        var cursor = obj.code_input.getCursor();
        var line = obj.code_input.lineCount()-1;
        var position = obj.code_input.getLine(line).length;
        if(cursor.line == 0 && (cursor.ch == position || cursor.ch == 0)) {
          historyUp(e);
          e.stopPropagation();
          e.preventDefault();
        }
      } else if(e.key == 'ArrowDown' &&
          !obj.code_input.state.completionActive) {
        // Arrow down

        var cursor = obj.code_input.getCursor();
        var line = obj.code_input.lineCount()-1;
        var position = obj.code_input.getLine(line).length;
        if(cursor.line == line && (cursor.ch == position || cursor.ch == 0)) {
          historyDown(e);
          e.stopPropagation();
          e.preventDefault();
        }
      } else if(e.key == 'PageUp') {
        // Page up
        if(obj.win.command_history.history.length) {
          obj.i_history = obj.win.command_history.history.length-1;
          obj.code_input.setValue(obj.win.command_history.history[obj.win.command_history.history.length-1]);
          obj.code_input.setCursor(obj.code_input.lineCount(), 0);
          obj.scrollToBottom();
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'PageDown') {
        // Page down
        if(obj.win.command_history.history.length) {
          obj.i_history = 0;
          obj.code_input.setValue(obj.win.command_history.history[0]);
          obj.code_input.setCursor(obj.code_input.lineCount(), 0);
          obj.scrollToBottom();
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'F3') {
        // F3
        if(obj.win.command_history.history.length) {
          var new_cmd = obj.win.command_history.history[0];
          obj.win.eval.evalCommand(new_cmd);
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'F7' && e.altKey) {
        // Alt + F7
        obj.resetHistoryIndex();
        obj.win.command_history.history = [];
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'F7') {
        // F7
        obj.openTerminalDialog(obj.terminal_history_cont);
        var cmds_cont = $('#right-panel .history-cont .history-panel');
        cmds_cont.html('');
        if(obj.win.command_history.history.length) {
          obj.win.command_history.history.forEach(function(e, i) {
            if(i == obj.i_history) {
              cmds_cont
                .append('<li i="' + i + '" class="active">' + e + '</li>');
            } else {
              cmds_cont.append('<li i="' + i + '">' + e + '</li>');
            }
          });
          var el_a = $('#right-panel .history-cont .history-panel li.active');
          if(el_a.length > 0) {
            el_a[0].scrollIntoView({block: 'center', inline: 'center'});
          }
          var cmds = cmds_cont.find('li');
          cmds.on('click', function() {
            cmds.removeClass('active');
            $(this).addClass('active');
            obj.i_history = Number($(this).attr('i'));
          });
        } else {
          cmds_cont
            .append('<div class="history-empty">'+language.string(346)+'</div>');
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'F8') {
        // F8
        var cursor = obj.code_input.getCursor();
        var line = cursor.line;
        var position = cursor.ch;
        var cmd = obj.code_input.getLine(line).substring(0, position);
        var j = -1;
        for(var i = 0; i < obj.win.command_history.history.length; i++) {
          if(obj.win.command_history.history[i].startsWith(cmd)) {
            if(j > -1) {
              if(i > obj.i_history) {
                j = i;
                break;
              }
            } else {
              j = i;
              if(obj.i_history == -1) {
                break;
              }
            }
          }
        }
        if(j > -1) {
          obj.i_history = j;
          obj.code_input.setValue(obj.win.command_history.history[obj.i_history]);
          if(obj.win.command_history.history[obj.i_history].length > position) {
            obj.code_input.focus();
            obj.code_input.setCursor(cursor);
          }
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key.toLowerCase() == 's' && e.ctrlKey) {
        // Ctrl + S
        obj.openTerminalDialog(obj.settings_dialog);
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key.toLowerCase() == 'l' && e.ctrlKey) {
        // Ctrl + L
        obj.openTerminalDialog(obj.log_dialog);
        e.stopPropagation();
        e.preventDefault();
      }
    });
  },

  /**
   * Binds focus behavior to panel containers.
   */
  bindFocusHandlers() {
    var obj = this;
    // Focus code input
    $('#right-panel .terminal-panel').click(function(e) {
      if(e.target != this) return;
      obj.code_input.focus();
      obj.code_input.setCursor(obj.code_input.lineCount(), 0);
    });

    $('#command-window-input-container').click(function(e) {
      if(e.target != this) return;
      obj.code_input.focus();
      obj.code_input.setCursor(obj.code_input.lineCount(), 0);
    });
  },

  /**
   * Binds terminal toolbar option handlers.
   */
  bindTerminalOptionHandlers() {
    var obj = this;
    // Terminal options cont
    this.terminal_options_cont = $('#right-panel .options');

    // Terminal settings button click
    $('#right-panel .options .settings').click(function() {
      obj.openTerminalDialog(obj.settings_dialog);
    });

    // Terminal timestamp button click
    $('#right-panel .options .timestamp').click(function() {
      if(obj.show_timestamp) {
        obj.show_timestamp = false;
      } else {
        obj.show_timestamp = true;
      }
      obj.setTimestamp();
    });
    this.setTimestamp();

    // Terminal auto scroll button click
    $('#right-panel .options .autoscroll').click(function() {
      if(obj.autoscroll) {
        obj.autoscroll = false;
      } else {
        obj.autoscroll = true;
      }
      obj.setAutoscroll();
    });
    this.setAutoscroll();

    // Terminal clear button click
    $('#right-panel .options .clear').click(function() {
      obj.clear();
    });

    // Terminal save log button click
    $('#right-panel .options .log').click(function() {
      obj.openTerminalDialog(obj.log_dialog);
    });

    // Terminal scroll to bottom button click
    $('#right-panel .options .to-bottom').click(function() {
      obj.scrollToBottom(true);
      obj.code_input.focus();
      obj.code_input.setCursor(obj.code_input.lineCount(), 0);
    });
  },

  /**
   * Binds message output interactions such as links and eval snippets.
   */
  bindMessageInteractionHandlers() {
    var obj = this;
    // Prevent all redirects
    $(document.body).on('click', '#command-window-messages a', function(e) {
      if(e.target.href) {
        e.preventDefault();
        shell.openExternal(e.target.href);
        return false;
      }
      return true;
    });

    // Commands for evaluation
    $(document.body).on('click', '#command-window-messages span.eval-code', function() {
      obj.win.eval.evalCommand(this.innerText);
    });

    // Open script in editor
    $(document.body).on('click', '#command-window-messages span.open-editor', function() {
      ipcRenderer.send('EditorWindow', 'open-script', [$(this).attr('file_path'), $(this).attr('line_number'), $(this).attr('char_pos')]);
    });

    // Inspector interactions
    this.bindInspectorHandlers();
  },

  /**
   * Resets the index used for navigating through command history to its default state.
   */
  resetHistoryIndex() {
    this.i_history = -1;
  },

  /**
   * Evaluates a command while preserving current code input content and cursor.
   * @param {string} cmd The command to evaluate.
   * @param {boolean} [show_output=true] Specifies whether output should be shown.
   * @param {string} [jsl_file_name='jslcmdwindow'] Context file name for evaluation.
   */
  evalCommandPreserveInput(cmd, show_output = true, jsl_file_name = 'jslcmdwindow') {
    var previous_value = this.code_input.getValue();
    var previous_cursor = this.code_input.getCursor();
    var scroll = this.code_input.getScrollInfo();
    var had_focus = this.code_input.hasFocus();

    this.win.eval.evalCommand(cmd, show_output, jsl_file_name);

    this.code_input.setValue(previous_value);

    var line_count = this.code_input.lineCount();
    var line = Math.max(0, Math.min(previous_cursor.line, line_count - 1));
    var line_text = this.code_input.getLine(line) || '';
    var ch = Math.max(0, Math.min(previous_cursor.ch, line_text.length));
    this.code_input.setCursor({ line: line, ch: ch });

    if(scroll && isFinite(scroll.left) && isFinite(scroll.top)) {
      this.code_input.scrollTo(scroll.left, scroll.top);
    }
    if(had_focus) {
      this.code_input.focus();
    }
  }
});

exports.PRDC_JSLAB_COMMAND_WINDOW_INPUT = PRDC_JSLAB_COMMAND_WINDOW_INPUT;
