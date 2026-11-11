/**
 * @file JSLAB command window messages submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { safeStringify } = require('../shared/value-serializer');

class PRDC_JSLAB_COMMAND_WINDOW_MESSAGES {

  /**
   * Creates messages submodule and binds methods to parent command window.
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
    Object.getOwnPropertyNames(PRDC_JSLAB_COMMAND_WINDOW_MESSAGES.prototype).forEach(function(name) {
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

Object.assign(PRDC_JSLAB_COMMAND_WINDOW_MESSAGES.prototype, {

  /**
   * Applies syntax highlighting to a given snippet of code, returning HTML markup with syntax highlighting styles applied.
   * @param {string} data The code snippet to which syntax highlighting should be applied.
   * @returns {string} HTML string representing the highlighted code. Special HTML characters like '<' and '>' are properly escaped.
   */
  highlightCode(data) {
    return hljs.highlight(data,
      {language: 'javascript'}).value
      .replaceAll('&lt;', '<').replaceAll('&gt;', '>');  // Return < and >
  },

  /**
   * Renders the startup welcome message.
   */
  renderWelcomeMessage() {
    var ts = this.getTimestamp();
    var html =
      '<div class="welcome-message system-in message">' +
        '<span class="timestamp">' + ts + '</span>' +
        '<img class="app-logo" src="../img/JSLAB.svg">' +
        '<img class="company-logo" src="../img/PR-DC_icon.svg">' +
        '<div class="clear"></div>' +
        '<p><span>JSLAB</span>, ' + language.string(8) + ' ' + this.win.app.version + '</p>' +
        '<p>' + language.string(136) + ' ' + new Date().getFullYear() + ' &copy; <span>PR-DC</span> info@pr-dc.com</p>' +
        '<p>' + language.string(137) + '</p>' +
        '<p>' + language.string(138) + '</p>' +
        '<p>' + language.string(139) + ' <span>cmd_help</span></p>' +
        '<p>' + language.string(135) + ' <a href="https://pr-dc.com/jslab">pr-dc.com/jslab</a></p>' +
        '<p>' + language.string(249) + ': ' +
          '<a href="https://pr-dc.com/jslab/">' + language.string(250) + '</a> &bull; ' +
          '<a href="https://pr-dc.com/jslab/web/">' + language.string(646) + '</a> &bull; ' +
          '<a href="https://discourse.jsl.pr-dc.com/">' + language.string(251) + '</a> &bull; ' +
          '<a href="https://pr-dc.com/jslab/doc/">' + language.string(252) + '</a> &bull; ' +
          '<a href="https://pr-dc.com/jslab/doc/#command-line-interface">' + language.string(647) + '</a> &bull; ' +
          '<a href="https://pr-dc.com/jslab/doc/#mcp-server">' + language.string(648) + '</a> &bull; ' +
          '<a href="https://github.com/PR-DC/JSLAB/releases">' + language.string(254) + '</a> &bull; ' +
          '<a href="https://github.com/PR-DC/JSLAB/tree/master/examples">' + language.string(255) + '</a>' +
        '</p>' +
      '</div>';
    $(this.messages).html(html);
  },

  /**
   * Clears all messages from the command window.
   */
  clear() {
    this.message_buffer.clear();
    this.log = this.message_buffer.log;
    this.last_class = this.message_buffer.last_class;
    this.last_tic = this.message_buffer.last_tic;
    this.N_messages = this.message_buffer.N_messages;
  },

  /**
   * Gets the effective max number of message DOM nodes to keep rendered.
   * @returns {number}
   */
  getEffectiveDomLimit() {
    return this.message_buffer.getEffectiveDomLimit();
  },

  /**
   * Returns the currently rendered message nodes (virtualized entries only).
   * @returns {Array<HTMLElement>}
   */
  getRenderedMessageNodes() {
    return this.message_buffer.getRenderedMessageNodes();
  },

  /**
   * Returns count of currently rendered message nodes.
   * @returns {number}
   */
  getRenderedMessagesCount() {
    return this.message_buffer.getRenderedMessagesCount();
  },

  /**
   * Captures a scroll anchor so we can restore viewport after rerender.
   * @returns {object|undefined}
   */
  captureScrollAnchor() {
    return this.message_buffer.captureScrollAnchor();
  },

  /**
   * Creates a single DOM element for a log entry.
   * @param {object} entry
   * @param {number} index
   * @returns {HTMLElement}
   */
  createLogEntryElement(entry, index) {
    return this.message_buffer.createLogEntryElement(entry, index);
  },

  /**
   * Re-renders the current virtual window of log entries.
   * @param {object} [anchor] Optional scroll anchor to restore.
   */
  renderMessageWindow(anchor) {
    this.message_buffer.renderMessageWindow(anchor);
    this.N_messages = this.message_buffer.N_messages;
  },

  /**
   * Syncs rendered element HTML back to log memory entry.
   * @param {Object} el jQuery element for a rendered message.
   */
  syncLogEntryHtmlFromElement(el) {
    this.message_buffer.syncLogEntryHtmlFromElement(el);
  },

  /**
   * Enforces current DOM message limit by shrinking rendered window.
   */
  enforceRenderedMessagesLimit() {
    this.message_buffer.enforceRenderedMessagesLimit();
    this.N_messages = this.message_buffer.N_messages;
  },

  /**
   * Handles scroll updates and loads older/newer chunks into the virtual window.
   */
  handleMessagesScroll() {
    this.message_buffer.handleMessagesScroll();
    this.N_messages = this.message_buffer.N_messages;
  },

  /**
   * Displays an error message in the command window.
   * @param {string} msg The error message to display.
   */
  error(msg) {
    this.win.workspace.updateWorkspace();
    return this.addMessage('data-in', '<span class="error">' +
      this.prettyPrint(msg) + '<span>');
  },

  /**
   * Displays a warning message in the command window.
   * @param {string} msg The warning message to display.
   */
  warn(msg) {
    this.win.workspace.updateWorkspace();
    return this.addMessage('data-in', '<span class="warn">' +
      this.prettyPrint(msg) + '<span>');
  },

  /**
   * Highlights and displays a response message in the command window, particularly used for 'ans' variable responses.
   * @param {Array|string} data The data to be highlighted and displayed.
   */
  highlightAnsMessage(data) {
    if(data[1]) {
      if(data[0] && data[0].__jslab_console_value__) {
        var remote_raw = 'ans = ' + data[0].description;
        var remote_el = this.message('ans = ', remote_raw);
        if(remote_el && remote_el.length) {
          remote_el[0].appendChild(this.createConsoleValueElement(data[0]));
          this.syncLogEntryHtmlFromElement(remote_el);
        }
        return;
      }
      var raw = 'ans = ' + data[0];
      try {
        var parsed_data = typeof data[0] === 'string' ? JSON.parse(data[0]) : data[0];
        var json_data = this.truncateStrings(parsed_data);
        if(this.renderHorizontalVectorAns(json_data, raw)) {
          return;
        }
        if(this.renderSmallMatrixAns(json_data, raw)) {
          return;
        }

        this.message(this.highlightCode('ans = ' + JSON.stringify(json_data, null, 2)), raw);
      } catch(err) {
        console.log(err);
        this.message(this.highlightCode(raw), raw);
      }
    } else {
      this.message(this.highlightCode('ans = ' + data[0]), 'ans = ' + data[0]);
    }
  },

  /** Binds lazy remote-object expansion in the command window. */
  initConsoleValueHandlers() {
    var obj = this;
    $(document.body).on('click', '#command-window .jslab-console-toggle', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      var recursive = !!e.altKey;
      var value_el = this.closest('.jslab-console-value');
      if(!value_el) return;
      var children = value_el.querySelector(':scope > .jslab-console-children');
      if(!children) return;
      if(value_el.classList.contains('open')) {
        value_el.classList.remove('open');
        this.setAttribute('aria-expanded', 'false');
        return;
      }
      value_el.classList.add('open');
      this.setAttribute('aria-expanded', 'true');
      if(recursive && !value_el.dataset.consoleExpandPath) {
        value_el.dataset.consoleExpandPath = JSON.stringify([value_el.dataset.objectId]);
      }
      if(children.dataset.loaded === 'true') {
        if(recursive) obj.expandConsoleDescendants(value_el);
        return;
      }
      children.textContent = '...';
      var result = await ipcRenderer.invoke('get-console-properties', {
        object_id: value_el.dataset.objectId,
        offset: 0,
        limit: 100
      });
      obj.renderConsolePropertyPage(children, result, false);
      obj.syncConsoleValueLog(value_el);
      if(recursive) obj.expandConsoleDescendants(value_el);
    });
    $(document.body).on('click', '#command-window .jslab-console-more', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      var button = this;
      var children = button.closest('.jslab-console-children');
      var value_el = button.closest('.jslab-console-value');
      if(!children || !value_el) return;
      button.disabled = true;
      var result = await ipcRenderer.invoke('get-console-properties', {
        object_id: value_el.dataset.objectId,
        offset: Number(button.dataset.offset) || 0,
        limit: 100
      });
      button.remove();
      obj.renderConsolePropertyPage(children, result, true);
      obj.syncConsoleValueLog(value_el);
    });
    $(document.body).on('click', '#command-window .jslab-console-accessor', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      var button = this;
      var value_el = button.closest('.jslab-console-value');
      if(!value_el || button.dataset.loading === 'true') return;
      button.dataset.loading = 'true';
      var result = await ipcRenderer.invoke('get-console-accessor', {
        object_id: value_el.dataset.objectId,
        property: button.dataset.property
      });
      button.dataset.loading = 'false';
      if(result && result.success) button.replaceWith(obj.createConsoleValueElement(result.value));
      else button.textContent = result?.error || language.string(631);
      obj.syncConsoleValueLog(value_el);
    });
  },

  /** Recursively expands loaded descendants for DevTools-style Alt-click. */
  expandConsoleDescendants(value_el) {
    var path;
    try { path = JSON.parse(value_el.dataset.consoleExpandPath || '[]'); }
    catch(err) { path = []; }
    if(path.length >= 8) return;
    var children = value_el.querySelector(':scope > .jslab-console-children');
    if(!children) return;
    children.querySelectorAll('.jslab-console-value').forEach(function(child) {
      if(child.closest('.jslab-console-children') !== children) return;
      var object_id = child.dataset.objectId;
      var toggle = child.querySelector(':scope > .jslab-console-toggle');
      if(!object_id || !toggle || path.includes(object_id)) return;
      child.dataset.consoleExpandPath = JSON.stringify(path.concat(object_id));
      if(!child.classList.contains('open')) {
        toggle.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
      }
    });
  },

  /** Creates one safe DOM representation of a remote console value. */
  createConsoleValueElement(value) {
    var root = document.createElement('span');
    root.className = 'jslab-console-value jslab-console-type-' + String(value.type || 'object');
    if(value.object_id) {
      root.dataset.objectId = value.object_id;
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'jslab-console-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.title = language.currentString(640);
      root.appendChild(toggle);
    }
    var label = document.createElement('span');
    label.className = 'jslab-console-description';
    var description = value.description || '';
    if(value.preview && value.preview.properties && value.preview.properties.length) {
      var left = value.subtype === 'array' || value.subtype === 'typedarray' ? ' [' : ' {';
      var right = value.subtype === 'array' || value.subtype === 'typedarray' ? ']' : '}';
      description += left + value.preview.properties.join(', ') +
        (value.preview.overflow ? ', …' : '') + right;
    }
    label.textContent = description;
    root.appendChild(label);
    if(value.object_id) {
      var children = document.createElement('span');
      children.className = 'jslab-console-children';
      root.appendChild(children);
    }
    return root;
  },

  /** Appends a lazy property page without evaluating accessors. */
  renderConsolePropertyPage(container, result, append) {
    if(!append) container.replaceChildren();
    container.dataset.loaded = 'true';
    if(!result || result.success === false) {
      var error = document.createElement('span');
      error.className = 'jslab-console-error';
      error.textContent = result?.error || language.string(631);
      container.appendChild(error);
      return;
    }
    var items = result.properties || result.entries || [];
    items.forEach((property) => {
      var row = document.createElement('span');
      row.className = 'jslab-console-property' + (property.internal ? ' internal' : '');
      var name = document.createElement('span');
      name.className = 'jslab-console-property-name';
      name.textContent = property.name;
      row.appendChild(name);
      row.appendChild(document.createTextNode(': '));
      if(property.key) {
        row.appendChild(this.createConsoleValueElement(property.key));
        row.appendChild(document.createTextNode(' => '));
      }
      if(property.accessor) {
        var accessor = document.createElement(property.getter && property.property !== undefined ? 'button' : 'span');
        accessor.className = 'jslab-console-accessor';
        accessor.textContent = '(...)';
        if(property.property !== undefined) accessor.dataset.property = property.property;
        row.appendChild(accessor);
      } else {
        row.appendChild(this.createConsoleValueElement(property.value));
      }
      container.appendChild(row);
    });
    if(result.next_offset !== undefined) {
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'jslab-console-more';
      more.dataset.offset = result.next_offset;
      more.textContent = '… ' + language.formatLang(633, {
        count: Math.max(0, result.total - result.next_offset)
      });
      container.appendChild(more);
    }
  },

  /** Persists expanded markup in the virtualized terminal log. */
  syncConsoleValueLog(value_el) {
    var message_el = value_el.closest('.message');
    if(message_el) this.syncLogEntryHtmlFromElement($(message_el));
  },

  /**
   * Checks if value is scalar-like for vector ans output formatting.
   * @param {*} value Value to inspect.
   * @returns {boolean}
   */
  isAnsScalarValue(value) {
    return value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean';
  },

  /**
   * Formats scalar value for compact ans rendering.
   * @param {*} value Scalar-like value.
   * @returns {string}
   */
  formatAnsScalarValue(value) {
    if(typeof value === 'string') {
      return JSON.stringify(value);
    }
    return String(value);
  },

  /**
   * Extracts vector values from parsed JSON ans payload if possible.
   * Supports [a,b,c] and [[a],[b],[c]] forms.
   * @param {*} json_data Parsed/truncated JSON ans payload.
   * @returns {Array|undefined}
   */
  getAnsVectorValues(json_data) {
    if(!Array.isArray(json_data) || !json_data.length) {
      return;
    }
    if(json_data.every(value => this.isAnsScalarValue(value))) {
      return json_data;
    }
    if(json_data.every(value =>
      Array.isArray(value) &&
      value.length === 1 &&
      this.isAnsScalarValue(value[0]))) {
      return json_data.map(function(value) {
        return value[0];
      });
    }
  },

  /**
   * Extracts 2D matrix values from parsed JSON ans payload if possible.
   * Supports rectangular arrays with scalar-like cells.
   * @param {*} json_data Parsed/truncated JSON ans payload.
   * @returns {Array|undefined}
   */
  getAnsMatrixValues(json_data) {
    if(!Array.isArray(json_data) || !json_data.length) {
      return;
    }

    var cols = undefined;
    for(var i = 0; i < json_data.length; i++) {
      var row = json_data[i];
      if(!Array.isArray(row) || !row.length) {
        return;
      }
      if(cols === undefined) {
        cols = row.length;
      } else if(row.length !== cols) {
        return;
      }
      if(!row.every(value => this.isAnsScalarValue(value))) {
        return;
      }
    }

    return json_data;
  },

  /**
   * Tries to render ans as a horizontal vector.
   * Returns true if the vector view was rendered.
   * @param {*} json_data Parsed/truncated JSON ans payload.
   * @param {string} raw Raw ans text for logs.
   * @returns {boolean}
   */
  renderHorizontalVectorAns(json_data, raw) {
    var vector_values = this.getAnsVectorValues(json_data);
    if(!vector_values) {
      return false;
    }

    var max_items = Number(config.ANS_VECTOR_HORIZONTAL_MAX_ITEMS);
    if(!isFinite(max_items) || max_items < 1) {
      max_items = 50;
    }
    if(vector_values.length > max_items) {
      return false;
    }

    var values_text = [];
    for(var i = 0; i < vector_values.length; i++) {
      values_text.push(this.formatAnsScalarValue(vector_values[i]));
    }

    var horizontal_code = 'ans = [' + values_text.join(', ') + ']';
    this.message(this.highlightCode(horizontal_code), raw);
    return true;
  },

  /**
   * Tries to render ans as a small 2D matrix.
   * Returns true if matrix view was rendered.
   * @param {*} json_data Parsed/truncated JSON ans payload.
   * @param {string} raw Raw ans text for logs.
   * @returns {boolean}
   */
  renderSmallMatrixAns(json_data, raw) {
    var matrix_values = this.getAnsMatrixValues(json_data);
    if(!matrix_values) {
      return false;
    }

    var rows = matrix_values.length;
    var cols = matrix_values[0].length;

    var max_rows = Number(config.ANS_MATRIX_PRETTY_MAX_ROWS);
    if(!isFinite(max_rows) || max_rows < 1) {
      max_rows = 10;
    }
    var max_cols = Number(config.ANS_MATRIX_PRETTY_MAX_COLS);
    if(!isFinite(max_cols) || max_cols < 1) {
      max_cols = 10;
    }
    var max_items = Number(config.ANS_MATRIX_PRETTY_MAX_ITEMS);
    if(!isFinite(max_items) || max_items < 1) {
      max_items = 100;
    }

    if(rows > max_rows || cols > max_cols || rows * cols > max_items) {
      return false;
    }

    var row_strings = [];
    for(var i = 0; i < rows; i++) {
      var values_text = [];
      for(var j = 0; j < cols; j++) {
        values_text.push(this.formatAnsScalarValue(matrix_values[i][j]));
      }
      row_strings.push('[' + values_text.join(', ') + ']');
    }

    var matrix_code = 'ans = [\n  ' + row_strings.join(',\n  ') + '\n]';
    this.message(this.highlightCode(matrix_code), raw);
    return true;
  },

  /**
   * Displays a general message in the command window.
   * @param {string} msg The message to display.
   * @param {string} raw Raw message to log.
   */
  message(msg, raw) {
    this.win.workspace.updateWorkspace();
    if(msg && msg.__jslab_console_value__) {
      var remote_el = this.addMessage('data-in', '', msg.description);
      if(remote_el && remote_el.length) {
        remote_el[0].appendChild(this.createConsoleValueElement(msg));
        this.syncLogEntryHtmlFromElement(remote_el);
      }
      return remote_el;
    }
    return this.addMessage('data-in', this.prettyPrint(msg), raw);
  },

  /**
   * Displays a general message in the command window with monospaced font.
   * @param {string} msg The message to display.
   * @param {string} raw Raw message to log.
   */
  messageMonospaced(msg, raw) {
    this.win.workspace.updateWorkspace();
    return this.addMessage('data-in', '<div class="monospaced">'+this.prettyPrint(msg)+"</div>", raw);
  },

  /**
   * Displays a general message in the command window.
   * @param {string} msg The message to display.
   */
  messageLatex(msg) {
    this.win.workspace.updateWorkspace();
    var el = this.addMessage('data-in', '\\('+msg+'\\)');
    if(this.log.length) {
      this.log[this.log.length - 1].needs_mathjax = true;
    }
    if(el && el.length && typeof MathJax !== 'undefined' && MathJax.typeset) {
      MathJax.typeset(el);
      this.syncLogEntryHtmlFromElement(el);
    }
    return el;
  },

  /**
   * Displays a message from internal operations in the command window.
   * @param {string} msg The internal message to display.
   */
  messageInternal(msg) {
    this.addMessage('system-in', this.prettyPrint(msg));
  },

  /**
   * Displays an error message originating from internal operations or system errors.
   * @param {string} msg The error message to display.
   */
  errorInternal(msg) {
    this.addMessage('system-in', '<span class="error">' +
      this.prettyPrint(msg) + '<span>');
  },

  /**
   * Displays a message related to editor operations in the command window.
   * @param {string} msg The editor message to display.
   */
  messageEditor(msg) {
    this.addMessage('system-in', '<span class="log">Editor: ' +
      this.prettyPrint(msg) + '</span>');
  },

  /**
   * Adds a command as a message to the terminal, applying syntax highlighting and pretty printing.
   * @param {string} cmd The command to add to the terminal output.
   */
  addMessageCmd(cmd) {
    var txt = this.prettyPrint(cmd);
    this.addMessage('data-out', this.highlightCode(txt), txt);
  },

  /**
   * Adds a message to the terminal output. Supports merging messages for continuous output scenarios.
   * @param {string} msg_class The CSS class to apply to the message, defining its type (e.g., 'system-in', 'data-out').
   * @param {string} data The message content, which can include HTML markup.
   * @param {boolean} [merge_messages=false] Whether to merge this message with the previous one if they are of the same class.
   * @returns {Object} A jQuery object representing the created message element.
   */
  addMessage(msg_class, data, raw, merge_messages = false) {
    var merge_interval_ms = Number(config.TERMINAL_MERGE_INTERVAL_MS_COMMAND);
    if(!isFinite(merge_interval_ms) || merge_interval_ms < 0) {
      merge_interval_ms = 1;
    }
    var el = this.message_buffer.addMessage(msg_class, data, raw, {
      merge_messages: merge_messages,
      merge_interval_ms: merge_interval_ms
    });
    this.log = this.message_buffer.log;
    this.last_class = this.message_buffer.last_class;
    this.last_tic = this.message_buffer.last_tic;
    this.N_messages = this.message_buffer.N_messages;
    var entry_timestamp = this.log.length ?
      this.log[this.log.length - 1].timestamp :
      this.getTimestamp();
    this.writeDiaryEntry(msg_class, raw, entry_timestamp);
    if(typeof this.applyConsoleFilter === 'function') this.applyConsoleFilter();
    return el ? $(el) : $();
  },

  /**
   * Scrolls the command window to the bottom, ensuring the latest messages are visible.
   * @param {boolean} [show_latest=false] If true, first shift the virtual window to newest entries.
   */
  scrollToBottom(show_latest = false) {
    this.message_buffer.scrollToBottom(show_latest);
  },

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
  },

  /**
   * Formats and pretty-prints data for display in the command window.
   * @param {object|string} data The data to format.
   * @returns {string} The formatted data as a string.
   */
  prettyPrint(data) {
    if(typeof data == 'string') {
      return data.replace(/\n/g, '<br/>');
    }
    if(data instanceof Error) return String(data.stack || data).replace(/\n/g, '<br/>');
    if(data !== null && (typeof data === 'object' || typeof data === 'function')) {
      return safeStringify(data, {
        max_depth: 5,
        max_properties: 1000,
        max_array_length: 1000,
        max_string_length: Number(config.MAX_JSON_STRING_LENGTH) || 1000,
        escape_html: true,
        indent: 2
      });
    }
    return String(data);
  },

  /**
   * Truncates strings in data to config.MAX_JSON_STRING_LENGTH.
   * @param {any} data - Data to be processed.
   * @returns {any} Truncated data.
   */
  truncateStrings(data) {
    if(typeof data === 'string') {
      if(data.length <= config.MAX_JSON_STRING_LENGTH) return data;

      const suffix_prefix = " ... [truncated | full size: ";
      const suffix_suffix = "]";

      let prefix_length = config.MAX_JSON_STRING_LENGTH;
      while(true) {
        const full_size_digits = String(data.length).length;
        const suffix_length = suffix_prefix.length + full_size_digits + suffix_suffix.length;
        const new_prefix_length = config.MAX_JSON_STRING_LENGTH - suffix_length;
        if(new_prefix_length >= prefix_length) {
          prefix_length = new_prefix_length;
          break;
        }
        if(new_prefix_length === prefix_length) break;
        prefix_length = new_prefix_length;
      }
      const suffix = suffix_prefix + data.length + suffix_suffix;
      return data.slice(0, prefix_length) + suffix;
    } else if(Array.isArray(data)) {
      return data.map(item => this.truncateStrings(item));
    } else if(data !== null && typeof data === 'object') {
      const new_obj = {};
      for(const key in data) {
        if(Object.prototype.hasOwnProperty.call(data, key)) {
          new_obj[key] = this.truncateStrings(data[key]);
        }
      }
      return new_obj;
    }
    return data;
  }
});

exports.PRDC_JSLAB_COMMAND_WINDOW_MESSAGES = PRDC_JSLAB_COMMAND_WINDOW_MESSAGES;
