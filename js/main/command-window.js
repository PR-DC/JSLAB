/**
 * @file JSLAB command window module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { shell } = require('electron');
const { BigJsonViewerDom } = require('big-json-viewer');
const Store = require('electron-store');
const { ESLint } = require("eslint");

const store = new Store();

/**
 * Class for JSLAB command window.
 */
class PRDC_JSLAB_COMMAND_WINDOW {

  /**
   * Initializes the command window, setting up the UI components, event listeners, and loading settings from storage.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;

    this.terminal_cont = document.getElementById('right-panel');
    
    this.terminal_history_cont;
    this.terminal_options_cont;
    this.messages;
    this.autoscroll = true;
    this.show_timestamp = false;
    this.write_timestamps = true;
    this.log = [];
    this.log_dialog;
    this.settings_dialog;
    this.N_messages = 1;
    this.N_messages_max = Infinity;
    this.code_input;
    this.textarea;
    this.ignore_output = false;
    this.no_ans = false;
    this.i_history = -1;
    
    this.last_class;
    this.last_tic;

    this.eslint = new ESLint(config.LINT_OPTIONS);
    
    // Load settings
    this.autoscroll = store.get('autoscroll');
    if(!this.autoscroll) {
      this.autoscroll = true;
    }
    this.show_timestamp = store.get('show_timestamp');
    if(!this.show_timestamp) {
      this.show_timestamp = false;
    }
    this.N_messages_max = Number(store.get('N_messages_max'));
    if(this.N_messages_max == 0) {
      this.N_messages_max = Infinity;
    }
    this.write_timestamps = store.get('write_timestamps');
    if(!this.write_timestamps) {
      this.write_timestamps = true;
    }

    // Create terminal DOM
    this.messages = $('#right-panel .messages');

    // Welcome message
    var ts = this.getTimestamp();
    $(this.messages).html('<div class="welcome-message system-in message"><span class="timestamp">' + ts + '</span><img class="app-logo" src="../img/JSLAB.svg"><img class="company-logo" src="../img/PR-DC_icon.svg"><div class="clear"></div><p><span>JSLAB</span>, '+language.string(8)+' ' + this.win.app.version + '</p><p>'+language.string(136)+' ' + new Date().getFullYear() + ' © <span>PR-DC</span> info@pr-dc.com</p><p>'+language.string(137)+'</p><p>'+language.string(138)+'</p><p>'+language.string(139)+' <span>cmd_help</span></p><p>'+language.string(135)+' <a href="https://pr-dc.com/jslab">pr-dc.com/jslab</a></p></div>');

    // Command history
    this.terminal_history_cont = 
      $('#right-panel .history-cont');
    $('#right-panel .history-close').click(function(e){
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

    // Create settings dialog
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
    $('#right-panel .terminal-settings .options-close').click(function(e){
      obj.closeTerminalDialog(obj.settings_dialog);
    });
    this.setNMessagesMax();
    $('#right-panel .terminal-settings .change-settings').click(function(e){
      obj.closeTerminalDialog(obj.settings_dialog);
      obj.N_messages_max =
        Number($('#right-panel .terminal-settings .N-messages-max').val());
      obj.setNMessagesMax();
      if(obj.N_messages > obj.N_messages_max) {
        while(obj.N_messages > obj.N_messages_max) {
          obj.messages[0].firstChild.remove();
          obj.N_messages -= 1;
        }
      }
    });

    // Create log save dialog
    this.log_dialog = $('#right-panel .terminal-log');
    this.log_dialog.on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.closeTerminalDialog(obj.log_dialog);
        e.stopPropagation();
        e.preventDefault();
      }
    });
    $('#right-panel .terminal-log .options-close').click(function(e){
      obj.closeTerminalDialog(obj.log_dialog);
    });
    $('#right-panel .terminal-log .write-timestamps').click(function(e){
      obj.write_timestamps = this.checked;
      obj.setWriteTimestamps();
    });
    this.setWriteTimestamps();
    $('#right-panel .terminal-log .save-log').click(function(e){
      obj.closeTerminalDialog(obj.log_dialog);
      obj.saveLog();
    });

    // Document keydown callbacks
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

    // Create code input
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
      extraKeys: { Enter: function(){
        sendCommand();
      } }
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

    // Code input keydown callbacks
    function historyUp(e) {
      if(obj.i_history < (obj.win.command_history.history.length - 1)) {
        obj.i_history += 1;
        obj.code_input.setValue(obj.win.command_history.history[obj.i_history]);
        obj.code_input.setCursor(obj.code_input.lineCount(), 0);
        obj.scrollToBottom();
      }
    }
    
    function historyDown(e) {
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
        if(cursor.line == 0 && cursor.ch == 0) {
          historyUp(e);
        } else {
          requestAnimationFrame(function() {
            var cursor = obj.code_input.getCursor();
            if(cursor.line == 0 && cursor.ch == 0) {
              historyUp(e);
            }
          });
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'ArrowDown' &&
          !obj.code_input.state.completionActive) {
        // Arrow down

        var cursor = obj.code_input.getCursor();
        var line = obj.code_input.lineCount()-1;
        var position = obj.code_input.getLine(line).length;
        if(cursor.line == line && cursor.ch == position) {
          historyDown(e);
        } else {
          requestAnimationFrame(function() {
            var cursor = obj.code_input.getCursor();
            var line = obj.code_input.lineCount()-1;
            var position = obj.code_input.getLine(line).length;
            if(cursor.line == line && cursor.ch == position) {
              historyDown(e);
            }
          });
        }
        e.stopPropagation();
        e.preventDefault();
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
            .append('<div class="history-empty">History is empty!</div>');
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
     
    // Focus code input
    $('#right-panel .terminal-panel').click(function(e){
      if(e.target != this) return;
      obj.code_input.focus();
      obj.code_input.setCursor(obj.code_input.lineCount(), 0);
    });
    
    $('#command-window-input-container').click(function(e){
      if(e.target != this) return;
      obj.code_input.focus();
      obj.code_input.setCursor(obj.code_input.lineCount(), 0);
    });

    // Terminal options cont
    this.terminal_options_cont = $('#right-panel .options');

    // Terminal settings button click
    $('#right-panel .options .settings').click(function(e){
      obj.openTerminalDialog(obj.settings_dialog);
    });

    // Terminal timestamp button click
    $('#right-panel .options .timestamp').click(function(){
      if(obj.show_timestamp) {
        obj.show_timestamp = false;
      } else {
        obj.show_timestamp = true;
      }
      obj.setTimestamp();
    });
    this.setTimestamp();

    // Terminal auto scroll button click
    $('#right-panel .options .autoscroll').click(function(){
      if(obj.autoscroll) {
        obj.autoscroll = false;
      } else {
        obj.autoscroll = true;
      }
      obj.setAutoscroll();
    });
    this.setAutoscroll();

    // Terminal clear button click
    $('#right-panel .options .clear').click(function(){
      obj.clear();
    });

    // Terminal save log button click
    $('#right-panel .options .log').click(function(e){
      obj.openTerminalDialog(obj.log_dialog);
    });
    
    // Terminal scroll to bottom button click
    $('#right-panel .options .to-bottom').click(function(e){
      obj.scrollToBottom();
      obj.code_input.focus();
      obj.code_input.setCursor(obj.code_input.lineCount(), 0);
    });
    
    // Prevent all redirects
    $(document.body).on('click', '#command-window-messages a', function(e) {
      if(e.target.href) {
        e.preventDefault();
        shell.openExternal(e.target.href);
        return false;
      }
    });
    
    // Commands for evaluation
    $(document.body).on('click', '#command-window-messages span.eval-code', function(e) {
      obj.win.eval.evalCommand(this.innerText);
    });
  }

  /**
   * Resets the index used for navigating through command history to its default state.
   */
  resetHistoryIndex() {
    this.i_history = -1;
  }
  
  /**
   * Applies syntax highlighting to a given snippet of code, returning HTML markup with syntax highlighting styles applied.
   * @param {string} data The code snippet to which syntax highlighting should be applied.
   * @returns {string} HTML string representing the highlighted code. Special HTML characters like '<' and '>' are properly escaped.
   */
  highlightCode(data) {
    return hljs.highlight(data, 
      {language: 'javascript'}).value
      .replaceAll('&lt;', '<').replaceAll('&gt;', '>');  // Return < and >
  }
  
  /**
   * Clears all messages from the command window.
   */
  clear() {
    this.N_messages = 0;
    $(this.messages).html('');
  }

  /**
   * Displays an error message in the command window.
   * @param {string} msg The error message to display.
   */
  error(msg) {
    this.win.workspace.updateWorkspace();
    return this.addMessage('data-in', '<span class="error">' +
      this.prettyPrint(msg) + '<span>');
  }

  /**
   * Displays a warning message in the command window.
   * @param {string} msg The warning message to display.
   */
  warn(msg) {
    this.win.workspace.updateWorkspace();
    return this.addMessage('data-in', '<span class="warn">' +
      this.prettyPrint(msg) + '<span>');
  }
  
  /**
   * Highlights and displays a response message in the command window, particularly used for 'ans' variable responses.
   * @param {Array|string} data The data to be highlighted and displayed.
   */
  highlightAnsMessage(data) {
    if(data[1]) {
      var el = this.message('ans = ', 'ans = '+data[0]);
      BigJsonViewerDom.fromData(data[0]).then(function(viewer) {
        const node = viewer.getRootElement();
        el[0].appendChild(node);
        node.openAll(1);
      });
    } else {
      this.message(this.highlightCode('ans = ' + data[0]), 'ans = ' + data[0]);
    }
  }
  
  /**
   * Displays a general message in the command window.
   * @param {string} msg The message to display.
   */
  message(msg, raw) {
    this.win.workspace.updateWorkspace();
    return this.addMessage('data-in', this.prettyPrint(msg), raw);
  }

  /**
   * Displays a general message in the command window.
   * @param {string} msg The message to display.
   */
  messageLatex(msg) {
    this.win.workspace.updateWorkspace();
    var el = this.addMessage('data-in', '\\('+msg+'\\)');
    MathJax.typeset(el);
    return el;
  }
  
  /**
   * Displays a message from internal operations in the command window.
   * @param {string} msg The internal message to display.
   */
  messageInternal(msg) {
    this.addMessage('system-in', this.prettyPrint(msg));
  }
  
  /**
   * Displays an error message originating from internal operations or system errors.
   * @param {string} msg The error message to display.
   */
  errorInternal(msg) {
    this.addMessage('system-in', '<span class="error">' +
      this.prettyPrint(msg) + '<span>');
  }
  
  /**
   * Displays a message related to editor operations in the command window.
   * @param {string} msg The editor message to display.
   */
  messageEditor(msg) {
    this.addMessage('system-in', '<span class="log">Editor: ' +
      this.prettyPrint(msg) + '</span>');
  }
  
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
  }

  /**
   * Closes a specified dialog related to the terminal.
   * @param {jQuery} e The jQuery object representing the dialog to close.
   */
  closeTerminalDialog(e) {
    e.fadeOut(300, 'linear');
    this.code_input.focus();
    this.code_input.setCursor(this.code_input.lineCount(), 0);
  } 

  /**
   * Adds a command as a message to the terminal, applying syntax highlighting and pretty printing.
   * @param {string} cmd The command to add to the terminal output.
   */
  addMessageCmd(cmd) {
    var txt = this.prettyPrint(cmd);
    this.addMessage('data-out', this.highlightCode(txt), txt);
  }

  /**
   * Adds a message to the terminal output. Supports merging messages for continuous output scenarios.
   * @param {string} msg_class The CSS class to apply to the message, defining its type (e.g., 'system-in', 'data-out').
   * @param {string} data The message content, which can include HTML markup.
   * @param {boolean} [merge_messages=false] Whether to merge this message with the previous one if they are of the same class.
   * @returns {Object} A jQuery object representing the created message element.
   */
  addMessage(msg_class, data, raw, merge_messages = false) {
    if(typeof raw == 'undefined') {
      raw = data;
    }
    var t = performance.now();
    var el;
    if(msg_class != this.last_class) {
      this.last_class = msg_class;
      this.last_tic = t;
      var ts = this.getTimestamp();
      if(this.N_messages < this.N_messages_max) {
        this.N_messages += 1;
      } else {
        this.messages[0].firstChild.remove();
      }
      el = $('<div class="' + msg_class +
        '"><span class="timestamp">' +
        ts + '</span>' + data + '</div>');
      $(this.messages).append(el);
      this.log.push({'class': msg_class, 'timestamp': ts, 'data': raw});
    } else {
      if(!merge_messages || t-this.last_tic > 1) {
        this.last_tic = t;
        var ts = this.getTimestamp();
        if(this.N_messages < this.N_messages_max) {
          this.N_messages += 1;
        } else {
          this.messages[0].firstChild.remove();
        }
        el = $('<div class="' + msg_class + 
          '"><span class="timestamp">' + 
          ts +'</span>' + data + '</div>');
        $(this.messages).append(el);
        this.log.push({'class': msg_class, 'timestamp': ts, 'data': raw});
      } else {
        el = $(this.messages).find('div').last();
        el.append(data);
        this.log[this.log.length-1].data += raw;
      }
    }
    if(this.autoscroll) {
      this.scrollToBottom();
    }
    return el;
  }
  
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
  }

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
  }

  /**
   * Sets the maximum number of messages to display in the command window before older messages are removed.
   */
  setNMessagesMax() {
    var N_messages_max_input =
      $('#right-panel .terminal-settings .N-messages-max');
    if(this.N_messages_max < 5) {
      this.N_messages_max = 5;
    }
    if($(N_messages_max_input).val() != this.N_messages_max) {
      $(N_messages_max_input).val(this.N_messages_max);
    }
    store.set('N_messages_max', this.N_messages_max);
  }

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
  }

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
      {name: 'All Files', extensions: ['*']}
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

        const fs = require('fs');
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

  /**
   * Scrolls the command window to the bottom, ensuring the latest messages are visible.
   */
  scrollToBottom() {
    var bcr = this.messages[0].getBoundingClientRect();
    $(this.messages).parent()[0].scrollTop = bcr.height;
  }

  /**
   * Generates a timestamp for use in the command window.
   * @returns {string} A string representing the current timestamp.
   */
  getTimestamp() {
    var date = new Date();
    var pad = function(num, size) {
      return('000' + num).slice(size * -1);
    };
    var time = parseFloat(date.getTime()/1000).toFixed(3);
    var hours = date.getHours();
    var minutes = Math.floor(time / 60) % 60;
    var seconds = Math.floor(time - minutes * 60);
    var milliseconds = time.slice(-3);

    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' +
      pad(seconds, 2) + '.' + pad(milliseconds, 3);
  }

  /**
   * Provides a function to replace circular references while stringifying an object. Useful for logging objects with circular references.
   * @returns {Function} A replacer function for JSON.stringify.
   */
  getCircularReplacer() {
    const seen = new WeakSet();
    return function(key, value) {
      if(typeof value === 'object' && value !== null) {
        if(seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    };
  }

  /**
   * Formats and pretty-prints data for display in the command window.
   * @param {object|string} data The data to format.
   * @returns {string} The formatted data as a string.
   */
  prettyPrint(data) {
    if(typeof data == 'string') {
      return data.replace(/\n/g, '<br/>');
    } else if(typeof data == 'object') {
      if(!Object.keys(data).length){
        if(data.constructor.name == 'Error') {
          return data.stack.toString();
        } else {
          return data.toString();
        }
      } else {
        return JSON.stringify(data, this.getCircularReplacer(), 2);
      }
    } else {
      return String(data);
    }
  }
}

exports.PRDC_JSLAB_COMMAND_WINDOW = PRDC_JSLAB_COMMAND_WINDOW;