/**
 * @file JSLAB command window input/history submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { shell, clipboard } = require('electron');
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
        obj.openConsoleTools();
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
      extraKeys: {
        Enter: function() { sendCommand(false); },
        'Ctrl-Enter': function() { sendCommand(true); },
        'Shift-Enter': 'newlineAndIndent'
      }
    });

    $('#command-window-input-submit-cont').click(function() {
      sendCommand();
    });

    CodeMirror.keyMap.default['Shift-Tab'] = 'indentLess';
    CodeMirror.keyMap.default['Tab'] = 'indentMore';

    this.code_input.on('inputRead', function(cm, change) {
      var inserted = change && Array.isArray(change.text) ? change.text.join('\n') : '';
      if(!cm.state.completionActive && change.origin === '+input' &&
          inserted.length && !/[;\s{}]$/.test(inserted)) {
        CodeMirror.commands.autocomplete(cm, null,
          {completeSingle: false, history: obj.win.command_history.history.slice()});
      }
    });
    this.code_input.on('change', function() { obj.scheduleConsolePreview(); });

    this.console_preview = document.createElement('div');
    this.console_preview.className = 'jslab-console-eager-preview';
    document.getElementById('command-window-input-container').appendChild(this.console_preview);
    this.initLiveExpressions();
    this.initConsoleTools();

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
        if(obj.i_history === -1) obj.console_history_draft = obj.code_input.getValue();
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
      } else if(obj.i_history === 0) {
        obj.i_history = -1;
        obj.code_input.setValue(obj.console_history_draft || '');
        obj.code_input.setCursor(obj.code_input.lineCount(), 0);
      }
    }

    async function sendCommand(force) {
      var cmd = obj.code_input.getValue();
      if(!force && cmd.trim()) {
        var complete = await ipcRenderer.invoke('is-console-expression-complete', cmd);
        if(!complete) {
          obj.code_input.replaceSelection('\n', 'end', '+input');
          obj.code_input.execCommand('indentAuto');
          return;
        }
      }
      obj.win.eval.evalCommand(cmd);
    }

    this.code_input.on('keydown', function(cm, e) {
      // https://keycode.info/
      if(e.key == 'Escape') {
        // ESC clears the command input, matching the shortcut documented in Help.
        obj.code_input.setValue('');
        obj.resetHistoryIndex();
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key == 'ArrowUp' &&
          !obj.code_input.state.completionActive) {
        // Arrow up

        var cursor = obj.code_input.getCursor();
        if(!obj.code_input.somethingSelected() && cursor.line == 0) {
          historyUp(e);
          e.stopPropagation();
          e.preventDefault();
        }
      } else if(e.key == 'ArrowDown' &&
          !obj.code_input.state.completionActive) {
        // Arrow down

        var cursor = obj.code_input.getCursor();
        var line = obj.code_input.lineCount()-1;
        if(!obj.code_input.somethingSelected() && cursor.line == line) {
          historyDown(e);
          e.stopPropagation();
          e.preventDefault();
        }
      } else if(e.ctrlKey && !e.altKey && !e.metaKey &&
          (e.key.toLowerCase() == 'p' || e.key.toLowerCase() == 'n')) {
        if(e.key.toLowerCase() == 'p') historyUp();
        else historyDown();
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
      } else if(e.key.toLowerCase() == 'l' && e.ctrlKey && e.shiftKey) {
        // Ctrl + Shift + L
        obj.openTerminalDialog(obj.log_dialog);
        e.stopPropagation();
        e.preventDefault();
      } else if(e.ctrlKey && !e.shiftKey &&
          ['l', 'k'].includes(e.key.toLowerCase())) {
        // DevTools: Ctrl + L clears the Console. Ctrl + K is a common alias.
        obj.clear();
        obj.code_input.focus();
        e.stopPropagation();
        e.preventDefault();
      } else if(e.ctrlKey && e.key == ' ') {
        CodeMirror.commands.autocomplete(obj.code_input, null, {
          completeSingle: false,
          history: obj.win.command_history.history.slice()
        });
        e.stopPropagation();
        e.preventDefault();
      }
    });
  },

  /** Schedules a side-effect-free eager result preview. */
  scheduleConsolePreview() {
    clearTimeout(this.console_preview_timer);
    var obj = this;
    var request_id = this.console_preview_request_id =
      (this.console_preview_request_id || 0) + 1;
    if(this.console_preview) this.console_preview.replaceChildren();
    if(!this.code_input || !this.code_input.getValue().trim()) return;
    this.console_preview_timer = setTimeout(async function() {
      if(!obj.console_preview || !obj.code_input) return;
      if(obj.win && obj.win.evaluating) return;
      var expression = obj.code_input.getValue().trim();
      if(!expression) return;
      var result = await ipcRenderer.invoke('get-console-preview', expression);
      if(request_id !== obj.console_preview_request_id) return;
      if(!result || !result.success) return;
      obj.console_preview.appendChild(obj.createConsoleValueElement(result.value));
    }, 150);
  },

  /** Initializes persistent, side-effect-free live expressions. */
  initLiveExpressions() {
    var obj = this;
    this.live_expressions = [];
    try {
      var saved = JSON.parse(localStorage.getItem('jslab-live-expressions') || '[]');
      if(Array.isArray(saved)) this.live_expressions = saved.filter(value => typeof value === 'string');
    } catch(err) {}
    this.live_expressions_el = document.createElement('div');
    this.live_expressions_el.className = 'jslab-live-expressions';
    this.live_expressions_el.setAttribute('aria-label', language.currentString(637));
    var messages_el = this.messages && this.messages.jquery ? this.messages[0] : this.messages;
    messages_el.parentNode.insertBefore(this.live_expressions_el, messages_el);
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'jslab-live-expression-add';
    add.textContent = '+';
    add.title = language.currentString(635);
    add.addEventListener('click', function() {
      obj.live_expressions.push(obj.code_input.getValue().trim());
      obj.renderLiveExpressions();
    });
    document.querySelector('#command-window-options .options-right').prepend(add);
    this.renderLiveExpressions();
    this.live_expression_timer = setInterval(function() { obj.updateLiveExpressions(); }, 500);
  },

  /** Renders editable live-expression rows. */
  renderLiveExpressions() {
    var obj = this;
    this.live_expressions_el.replaceChildren();
    this.live_expressions.forEach(function(expression, index) {
      var row = document.createElement('div');
      row.className = 'jslab-live-expression';
      var input = document.createElement('input');
      input.type = 'text';
      input.value = expression;
      input.spellcheck = false;
      input.addEventListener('input', function() {
        obj.live_expressions[index] = input.value;
        obj.saveLiveExpressions();
        obj.updateLiveExpressions();
      });
      var output = document.createElement('span');
      output.className = 'jslab-live-expression-value';
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '\u00D7';
      remove.title = language.currentString(636);
      remove.addEventListener('click', function() {
        obj.live_expressions.splice(index, 1);
        obj.renderLiveExpressions();
      });
      row.append(input, output, remove);
      obj.live_expressions_el.appendChild(row);
    });
    this.saveLiveExpressions();
    this.updateLiveExpressions();
  },

  /** Persists live expressions. */
  saveLiveExpressions() {
    try { localStorage.setItem('jslab-live-expressions', JSON.stringify(this.live_expressions)); } catch(err) {}
  },

  /** Refreshes all live expressions without running side-effectful code. */
  async updateLiveExpressions() {
    if(this.live_expression_updating || (this.win && this.win.evaluating)) return;
    this.live_expression_updating = true;
    try {
      var rows = this.live_expressions_el.querySelectorAll('.jslab-live-expression');
      for(var i = 0; i < rows.length; i++) {
        var output = rows[i].querySelector('.jslab-live-expression-value');
        var expression = this.live_expressions[i].trim();
        output.replaceChildren();
        if(!expression) continue;
        var result = await ipcRenderer.invoke('get-console-preview', expression);
        if(result?.success) output.appendChild(this.createConsoleValueElement(result.value));
        else output.textContent = result?.reason || '';
      }
    } finally {
      this.live_expression_updating = false;
    }
  },

  /** Adds text/severity filtering and bulk object actions. */
  initConsoleTools() {
    var obj = this;
    var tools = document.createElement('div');
    tools.className = 'jslab-console-tools';
    tools.hidden = true;
    tools.setAttribute('role', 'search');
    var filter = document.createElement('input');
    filter.type = 'text'; filter.className = 'CodeMirror-search-find';
    filter.placeholder = language.currentString(336);
    filter.title = language.currentString(336);
    filter.autocomplete = 'off'; filter.spellcheck = false;
    var previous = document.createElement('i');
    previous.className = 'CodeMirror-search-find-prev-btn';
    previous.title = language.currentString(337);
    var next = document.createElement('i');
    next.className = 'CodeMirror-search-find-next-btn';
    next.title = language.currentString(338);
    var clear_top = document.createElement('br'); clear_top.className = 'clear';
    var match_case = document.createElement('i');
    match_case.className = 'CodeMirror-search-case-btn';
    match_case.title = language.currentString(341);
    var regex = document.createElement('i');
    regex.className = 'CodeMirror-search-regex-btn';
    regex.title = language.currentString(342);
    var counter = document.createElement('div');
    counter.className = 'CodeMirror-search-bottom-right';
    var current = document.createElement('span'); current.className = 'CodeMirror-search-current-match';
    current.textContent = '0';
    var total = document.createElement('span'); total.className = 'CodeMirror-search-total-matchs';
    total.textContent = '0';
    var close = document.createElement('i');
    close.className = 'CodeMirror-search-close-btn';
    close.title = language.currentString(344);
    counter.append(current, ' ' + language.currentString(343) + ' ', total, close);
    var clear_bottom = document.createElement('br'); clear_bottom.className = 'clear';
    tools.append(filter, previous, next, clear_top, match_case, regex, counter, clear_bottom);
    var messages_el = this.messages && this.messages.jquery ? this.messages[0] : this.messages;
    messages_el.parentNode.insertBefore(tools, messages_el);
    this.console_filter_input = filter;
    this.console_filter_current = current;
    this.console_filter_total = total;
    this.console_filter_match_case = false;
    this.console_filter_regex = false;
    this.console_filter_index = -1;
    this.console_tools = tools;
    document.querySelector('#command-window-options .console-filter').addEventListener('click',
      function() { obj.toggleConsoleTools(); });
    close.addEventListener('click', function() { obj.closeConsoleTools(); });
    filter.addEventListener('keydown', function(e) {
      if(e.key === 'Escape') {
        obj.closeConsoleTools();
      } else if(e.key === 'Enter') {
        obj.navigateConsoleFilter(e.shiftKey ? -1 : 1);
        e.stopPropagation();
        e.preventDefault();
      }
    });
    document.addEventListener('mousedown', function(e) {
      var button = document.querySelector('#command-window-options .console-filter');
      if(!tools.hidden && !tools.contains(e.target) && e.target !== button) {
        obj.closeConsoleTools();
      }
    });
    filter.addEventListener('input', function() { obj.applyConsoleFilter(true); });
    previous.addEventListener('click', function() { obj.navigateConsoleFilter(-1); });
    next.addEventListener('click', function() { obj.navigateConsoleFilter(1); });
    match_case.addEventListener('click', function() {
      obj.console_filter_match_case = !obj.console_filter_match_case;
      match_case.classList.toggle('active', obj.console_filter_match_case);
      obj.applyConsoleFilter(true);
    });
    regex.addEventListener('click', function() {
      obj.console_filter_regex = !obj.console_filter_regex;
      regex.classList.toggle('active', obj.console_filter_regex);
      obj.applyConsoleFilter(true);
    });
  },

  /** Opens the console filter popup and selects its current query. */
  openConsoleTools() {
    if(!this.console_tools) return;
    this.console_tools.hidden = false;
    this.console_filter_input.focus();
    this.console_filter_input.select();
  },

  /** Closes the console filter popup and returns focus to the prompt. */
  closeConsoleTools() {
    if(!this.console_tools) return;
    this.console_tools.hidden = true;
    if(this.code_input) this.code_input.focus();
  },

  /** Toggles the console filter popup. */
  toggleConsoleTools() {
    if(this.console_tools && this.console_tools.hidden) this.openConsoleTools();
    else this.closeConsoleTools();
  },

  /** Applies the editor-style text search to rendered console messages. */
  applyConsoleFilter(reset_index) {
    if(!this.console_filter_input) return;
    var query = this.console_filter_input.value;
    var expression = null;
    var invalid = false;
    if(query && this.console_filter_regex) {
      try {
        expression = new RegExp(query, this.console_filter_match_case ? '' : 'i');
      } catch(err) {
        invalid = true;
      }
    }
    this.console_filter_input.classList.toggle('invalid', invalid);
    var messages_el = this.messages && this.messages.jquery ? this.messages[0] : this.messages;
    var matches = [];
    var obj = this;
    messages_el.querySelectorAll(':scope > div').forEach(function(node) {
      node.classList.remove('jslab-console-filter-current');
      var text = node.textContent;
      var matches_text = !query || (!invalid && (expression ? expression.test(text) :
        (obj.console_filter_match_case ? text.includes(query) :
          text.toLowerCase().includes(query.toLowerCase()))));
      node.style.display = matches_text ? '' : 'none';
      if(query && matches_text) matches.push(node);
    });
    this.console_filter_matches = matches;
    if(reset_index) this.console_filter_index = matches.length ? 0 : -1;
    else if(this.console_filter_index >= matches.length) this.console_filter_index = matches.length - 1;
    this.focusConsoleFilterMatch();
  },

  /** Moves to the previous or next filtered console message. */
  navigateConsoleFilter(direction) {
    var matches = this.console_filter_matches || [];
    if(!matches.length) return;
    this.console_filter_index = (this.console_filter_index + direction + matches.length) % matches.length;
    this.focusConsoleFilterMatch();
  },

  /** Updates the match counter and reveals the selected console message. */
  focusConsoleFilterMatch() {
    var matches = this.console_filter_matches || [];
    matches.forEach(function(node) { node.classList.remove('jslab-console-filter-current'); });
    var selected = this.console_filter_index >= 0 ? matches[this.console_filter_index] : null;
    if(selected) {
      selected.classList.add('jslab-console-filter-current');
      if(typeof selected.scrollIntoView === 'function') selected.scrollIntoView({ block: 'nearest' });
    }
    if(this.console_filter_current) this.console_filter_current.textContent = selected ? this.console_filter_index + 1 : 0;
    if(this.console_filter_total) this.console_filter_total.textContent = matches.length;
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
    this.console_history_draft = '';
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
