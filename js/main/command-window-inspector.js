/**
 * @file JSLAB command window inspector submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

class PRDC_JSLAB_COMMAND_WINDOW_INSPECTOR {

  /**
   * Creates inspector submodule and binds methods to parent command window.
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
    Object.getOwnPropertyNames(PRDC_JSLAB_COMMAND_WINDOW_INSPECTOR.prototype).forEach(function(name) {
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

Object.assign(PRDC_JSLAB_COMMAND_WINDOW_INSPECTOR.prototype, {

  /**
   * Initializes inspector input dialog DOM references and events.
   */
  initInspectorDialog() {
    var obj = this;
    this.inspector_input_dialog = $('#inspector-input-container');
    this.inspector_input_title = $('#inspector-input-title');
    this.inspector_input_message = $('#inspector-input-message');
    this.inspector_input_label_1 = $('#inspector-input-label-1');
    this.inspector_input_label_2 = $('#inspector-input-label-2');
    this.inspector_input_field_1 = $('#inspector-input-field-1');
    this.inspector_input_field_2 = $('#inspector-input-field-2');
    this.inspector_input_row_2 = $('#inspector-input-row-2');
    this.inspector_input_submit = $('#inspector-input-submit');
    this.inspector_dialog_resolver = undefined;

    this.inspector_input_dialog.on('keydown', function(e) {
      if(e.key === 'Escape') {
        obj.closeInspectorInputDialog(null);
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key === 'Enter' && !e.shiftKey) {
        obj.submitInspectorInputDialog();
        e.stopPropagation();
        e.preventDefault();
      }
    });

    $('#inspector-input-close').click(function() {
      obj.closeInspectorInputDialog(null);
    });

    $('#inspector-input-cancel').click(function() {
      obj.closeInspectorInputDialog(null);
    });

    $('#inspector-input-submit').click(function() {
      obj.submitInspectorInputDialog();
    });
  },

  /**
   * Binds inspector action handlers to message output container.
   */
  bindInspectorHandlers() {
    var obj = this;

    // Inspector toolbar actions
    $(document.body).on('click', '#command-window-messages .jslab-inspector-action', function(e) {
      e.preventDefault();
      e.stopPropagation();
      obj.handleInspectorAction(this).catch(function(err) {
        var msg = err && err.stack ? err.stack : String(err);
        obj.errorInternal('@inspector/action: ' + msg);
      });
    });

    // Inspector cell editing (double-click)
    $(document.body).on('dblclick', '#command-window-messages .jslab-inspector-cell-editable', function(e) {
      e.preventDefault();
      e.stopPropagation();
      obj.editInspectorCell(this).catch(function(err) {
        var msg = err && err.stack ? err.stack : String(err);
        obj.errorInternal('@inspector/edit: ' + msg);
      });
    });
  },

  /**
   * Opens inspector input dialog and resolves user-entered values.
   * @param {Object} options Dialog options.
   * @param {string} [options.title] Dialog title.
   * @param {string} [options.message] Dialog message.
   * @param {string} [options.submit_label] Submit button label.
   * @param {Array<Object>} [options.fields] Input fields.
   * @returns {Promise<Object|null>} Resolved values or null when canceled.
   */
  openInspectorInputDialog(options = {}) {
    var obj = this;
    return new Promise(function(resolve) {
      if(obj.inspector_dialog_resolver) {
        obj.closeInspectorInputDialog(null);
      }

      var fields = Array.isArray(options.fields) ? options.fields : [];
      var field_1 = fields[0] || {};
      var field_2 = fields[1] || undefined;

      var title = typeof options.title === 'string' ? options.title : language.string(388);
      obj.inspector_input_title.html(title);
      obj.inspector_input_message.html(options.message || '');

      obj.inspector_input_label_1.html(field_1.label || '');
      obj.inspector_input_field_1.val(typeof field_1.value === 'string' ? field_1.value : '');
      obj.inspector_input_field_1.attr('placeholder', field_1.placeholder || '');

      if(field_2) {
        obj.inspector_input_label_2.html(field_2.label || '');
        obj.inspector_input_field_2.val(typeof field_2.value === 'string' ? field_2.value : '');
        obj.inspector_input_field_2.attr('placeholder', field_2.placeholder || '');
        obj.inspector_input_row_2.show();
      } else {
        obj.inspector_input_label_2.html('');
        obj.inspector_input_field_2.val('');
        obj.inspector_input_field_2.attr('placeholder', '');
        obj.inspector_input_row_2.hide();
      }

      var submit_label = typeof options.submit_label === 'string' ? options.submit_label : language.string(391);
      obj.inspector_input_submit.html(submit_label);
      obj.inspector_dialog_resolver = resolve;
      obj.win.gui.openDialog(obj.inspector_input_dialog);
      setTimeout(function() {
        obj.inspector_input_field_1.trigger('focus');
        obj.inspector_input_field_1.select();
      }, 0);
    });
  },

  /**
   * Submits the currently open inspector input dialog.
   */
  submitInspectorInputDialog() {
    if(!this.inspector_dialog_resolver) {
      return;
    }

    var values = [String(this.inspector_input_field_1.val() || '')];
    if(this.inspector_input_row_2.is(':visible')) {
      values.push(String(this.inspector_input_field_2.val() || ''));
    }
    this.closeInspectorInputDialog({ values: values });
  },

  /**
   * Closes inspector input dialog and resolves pending promise.
   * @param {Object|null} result Dialog result payload.
   */
  closeInspectorInputDialog(result) {
    if(!this.inspector_dialog_resolver) {
      return;
    }

    var resolve = this.inspector_dialog_resolver;
    this.inspector_dialog_resolver = undefined;
    this.win.gui.closeDialog(this.inspector_input_dialog);
    resolve(result || null);
  },

  /**
   * Escapes text for safe HTML rendering in inspector UI.
   * @param {*} value Input value.
   * @returns {string}
   */
  escapeInspectorHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Escapes text for safe HTML attribute rendering in inspector UI.
   * @param {*} value Input value.
   * @returns {string}
   */
  escapeInspectorAttr(value) {
    return this.escapeInspectorHtml(value)
      .replace(/\r/g, '&#13;')
      .replace(/\n/g, '&#10;');
  },

  /**
   * Escapes text while preserving language wrappers produced by language.string().
   * Only <lang class="..."> and </lang> tags are restored; all other markup stays escaped.
   * @param {*} value Input value.
   * @returns {string}
   */
  escapeInspectorLocalizedHtml(value) {
    return this.escapeInspectorHtml(value)
      .replace(/&lt;lang class=&quot;([a-zA-Z0-9_-]+)&quot;&gt;/g, '<lang class="$1">')
      .replace(/&lt;lang class=&#39;([a-zA-Z0-9_-]+)&#39;&gt;/g, '<lang class="$1">')
      .replace(/&lt;\/lang&gt;/g, '</lang>');
  },

  /**
   * Resolves localized HTML wrappers to plain text in the active language.
   * Used for HTML attributes where markup cannot be rendered.
   * @param {*} value Input value.
   * @returns {string}
   */
  resolveInspectorLocalizedText(value) {
    var container = document.createElement('div');
    container.innerHTML = this.escapeInspectorLocalizedHtml(value);

    var active_lang = '';
    if(typeof language !== 'undefined' &&
        language &&
        typeof language.lang === 'string') {
      active_lang = language.lang.replace(/[^a-zA-Z0-9_-]/g, '');
    }

    if(active_lang.length) {
      var active_node = container.querySelector('lang.' + active_lang);
      if(active_node) {
        return active_node.textContent || '';
      }
    }

    var first_lang_node = container.querySelector('lang');
    if(first_lang_node) {
      return first_lang_node.textContent || '';
    }

    return container.textContent || '';
  },

  /**
   * Builds state attributes used by inspector action handlers.
   * @param {Object} state Inspector state payload.
   * @returns {string}
   */
  buildInspectorStateAttrs(state) {
    var variable = state && typeof state.variable === 'string' ? state.variable : '';
    var view = state && typeof state.view === 'string' ? state.view : '';
    var state_sort_by = state && typeof state.state_sort_by === 'string' ? state.state_sort_by : '';
    var state_sort_dir = state && state.state_sort_dir === 'desc' ? 'desc' : 'asc';
    var state_filter = state && typeof state.state_filter === 'string' ? state.state_filter : '';
    var state_filter_expr = state && typeof state.state_filter_expr === 'string' ? state.state_filter_expr : '';
    return ' data-variable="' + this.escapeInspectorAttr(variable) + '"' +
      ' data-view="' + this.escapeInspectorAttr(view) + '"' +
      ' data-state-sort-by="' + this.escapeInspectorAttr(state_sort_by) + '"' +
      ' data-state-sort-dir="' + this.escapeInspectorAttr(state_sort_dir) + '"' +
      ' data-state-filter="' + this.escapeInspectorAttr(state_filter) + '"' +
      ' data-state-filter-expr="' + this.escapeInspectorAttr(state_filter_expr) + '"';
  },

  /**
   * Builds inspector table column header label from structural column metadata.
   * @param {Object} column Column model.
   * @returns {string}
   */
  getInspectorColumnLabel(column) {
    if(!column || typeof column !== 'object') {
      return '';
    }

    var header_kind = typeof column.header_kind === 'string' ? column.header_kind : '';
    if(header_kind === 'row-name') {
      return language.string(503);
    }
    if(header_kind === 'row-time') {
      var time_name = typeof column.name === 'string' && column.name.length ?
        column.name :
        language.string(504);
      var time_type = typeof column.type === 'string' && column.type.length ?
        column.type :
        '';
      return time_type.length ? (time_name + ' (' + time_type + ')') : time_name;
    }
    if(header_kind === 'variable') {
      var variable_name = typeof column.name === 'string' && column.name.length ?
        column.name :
        String(column.key || '');
      var variable_type = typeof column.type === 'string' && column.type.length ?
        column.type :
        '';
      return variable_type.length ? (variable_name + ' (' + variable_type + ')') : variable_name;
    }
    if(typeof column.label === 'string') {
      return column.label;
    }
    return String(column.key || '');
  },

  /**
   * Renders inspector toolbar from model data.
   * @param {Object} toolbar Toolbar model.
   * @returns {string}
   */
  renderInspectorToolbar(toolbar) {
    if(!toolbar || typeof toolbar !== 'object') {
      return '';
    }
    var attrs = this.buildInspectorStateAttrs(toolbar);
    var html = '<div class="jslab-inspector-toolbar">' +
      '<button class="jslab-inspector-action" data-action="filter"' + attrs + '>' +
      this.escapeInspectorLocalizedHtml(toolbar.filter_label || '') + '</button>';
    if(toolbar.show_clear_filter) {
      html += '<button class="jslab-inspector-action" data-action="clear-filter"' + attrs + '>' +
        this.escapeInspectorLocalizedHtml(toolbar.clear_filter_label || '') + '</button>';
    }
    html += '<button class="jslab-inspector-action" data-action="table-filter-expr"' + attrs + '>' +
      this.escapeInspectorLocalizedHtml(toolbar.filter_expr_label || '') + '</button>';
    if(toolbar.show_clear_expr) {
      html += '<button class="jslab-inspector-action" data-action="table-clear-filter-expr"' + attrs + '>' +
        this.escapeInspectorLocalizedHtml(toolbar.clear_expr_label || '') + '</button>';
    }
    if(Array.isArray(toolbar.extra_actions)) {
      toolbar.extra_actions.forEach((extra) => {
        if(extra && typeof extra.action === 'string') {
          html += '<button class="jslab-inspector-action" data-action="' +
            this.escapeInspectorAttr(extra.action) + '"' + attrs + '>' +
            this.escapeInspectorLocalizedHtml(extra.label || '') + '</button>';
        }
      });
    }
    html += '<button class="jslab-inspector-action" data-action="refresh"' + attrs + '>' +
      this.escapeInspectorLocalizedHtml(toolbar.refresh_label || '') + '</button>' +
      '<span class="jslab-inspector-hint">' + this.escapeInspectorLocalizedHtml(toolbar.hint_label || '') + '</span>' +
      '</div>';
    return html;
  },

  /**
   * Renders inspector table content from model data.
   * @param {Object} content Table content model.
   * @returns {string}
   */
  renderInspectorTable(content) {
    var attrs = this.buildInspectorStateAttrs(content);
    var html = this.renderInspectorToolbar(content.toolbar);
    html += '<div class="jslab-inspector-table-wrap"><table class="jslab-inspector-table"><thead><tr>';
    var columns = Array.isArray(content.columns) ? content.columns : [];
    var rows = Array.isArray(content.rows) ? content.rows : [];
    columns.forEach((column) => {
      var header_label = this.getInspectorColumnLabel(column);
      if(column && column.sortable) {
        if(column.indicator && String(column.indicator).length) {
          header_label += ' (' + String(column.indicator) + ')';
        }
        var next_sort_dir = column.next_sort_dir === 'desc' ? 'desc' : 'asc';
        html += '<th><button class="jslab-inspector-action jslab-inspector-sort" data-action="sort"' +
          attrs +
          ' data-next-sort-by="' + this.escapeInspectorAttr(column.key || '') + '"' +
          ' data-next-sort-dir="' + this.escapeInspectorAttr(next_sort_dir) + '">' +
          this.escapeInspectorLocalizedHtml(header_label) + '</button></th>';
      } else {
        html += '<th>' + this.escapeInspectorLocalizedHtml(header_label) + '</th>';
      }
    });
    html += '</tr></thead><tbody>';
    rows.forEach((row) => {
      html += '<tr>';
      var cells = row && Array.isArray(row.cells) ? row.cells : [];
      cells.forEach((cell) => {
        var preview_html = this.escapeInspectorHtml(
          cell && cell.preview_text !== undefined ? cell.preview_text : ''
        );
        if(cell && cell.editable) {
          var path_text = JSON.stringify(Array.isArray(cell.path) ? cell.path : []);
          var default_expr = typeof cell.default_expr === 'string' ? cell.default_expr : '';
          html += '<td class="jslab-inspector-cell-editable"' +
            attrs +
            ' data-path="' + this.escapeInspectorAttr(path_text) + '"' +
            ' data-default="' + this.escapeInspectorAttr(default_expr) + '"' +
            ' title="' + this.escapeInspectorAttr(this.resolveInspectorLocalizedText(content.edit_cell_title || '')) + '">' +
            preview_html + '</td>';
        } else {
          html += '<td>' + preview_html + '</td>';
        }
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  },

  /**
   * Renders inspector content section from model data.
   * @param {Object} content Content model.
   * @returns {string}
   */
  renderInspectorContent(content) {
    if(!content || typeof content !== 'object') {
      return '';
    }
    if(content.type === 'table') {
      return this.renderInspectorTable(content);
    }
    if(content.type === 'empty') {
      return this.renderInspectorToolbar(content.toolbar) +
        '<div class="jslab-inspector-empty">' + this.escapeInspectorLocalizedHtml(content.empty_text || '') + '</div>';
    }
    if(content.type === 'scalar') {
      var attrs = this.buildInspectorStateAttrs({
        variable: content.variable || '',
        view: content.view || 'scalar',
        state_sort_by: '',
        state_sort_dir: 'asc',
        state_filter: '',
        state_filter_expr: ''
      });
      var scalar_preview = this.escapeInspectorHtml(content.preview_text || '');
      var default_expr = typeof content.default_expr === 'string' ? content.default_expr : '';
      return '<div class="jslab-inspector-toolbar">' +
        '<button class="jslab-inspector-action" data-action="edit"' +
        attrs +
        ' data-path="[]"' +
        ' data-default="' + this.escapeInspectorAttr(default_expr) + '">' +
        this.escapeInspectorLocalizedHtml(content.edit_label || '') + '</button>' +
        '</div><div class="jslab-inspector-scalar">' + scalar_preview + '</div>';
    }
    return '';
  },

  /**
   * Renders full inspector HTML from model payload.
   * @param {Object} model Inspector model.
   * @returns {string}
   */
  renderInspector(model) {
    var variable = model && typeof model.variable === 'string' ? model.variable : '';
    var title = model && typeof model.title === 'string' ? model.title : '';
    var meta_parts = model && Array.isArray(model.meta_parts) ? model.meta_parts : [];
    var note_parts = model && Array.isArray(model.note_parts) ? model.note_parts : [];
    var content_html = this.renderInspectorContent(model ? model.content : undefined);

    var html = '<div class="jslab-inspector">' +
      '<div class="jslab-inspector-header">' +
      '<div class="jslab-inspector-title">' + this.escapeInspectorLocalizedHtml(title) + ': <code>' +
      this.escapeInspectorHtml(variable) + '</code></div>' +
      '<div class="jslab-inspector-meta">' + this.escapeInspectorLocalizedHtml(meta_parts.join(' | ')) + '</div>' +
      '</div>' +
      content_html;

    if(note_parts.length) {
      html += '<div class="jslab-inspector-note">' +
        this.escapeInspectorLocalizedHtml(note_parts.join('; ')) + '</div>';
    }
    html += '</div>';
    return html;
  },

  /**
   * Displays inspector message from sandbox-provided model payload.
   * @param {Object} model Inspector model.
   */
  showInspector(model) {
    if(!model || typeof model !== 'object') {
      this.errorInternal('@inspector: invalid payload.');
      return;
    }
    this.win.workspace.updateWorkspace();
    this.addMessage('data-in', this.renderInspector(model));
  },

  /**
   * Builds normalized inspector options object from element attributes.
   * @param {HTMLElement} el Source element with inspector state data-* attributes.
   * @returns {Object} Inspector options object.
   */
  getInspectorStateFromElement(el) {
    var state = {};
    if(!el || !el.getAttribute) {
      return state;
    }

    var view = el.getAttribute('data-view');
    if(view) {
      state.view = view;
    }

    var filter = el.getAttribute('data-state-filter');
    if(filter && filter.trim().length) {
      state.filter = filter;
    }

    var filter_expr = el.getAttribute('data-state-filter-expr');
    if(filter_expr && filter_expr.trim().length) {
      state.filter_expr = filter_expr;
    }

    var sort_by = el.getAttribute('data-state-sort-by');
    if(sort_by && sort_by.trim().length) {
      state.sort_by = sort_by;
    }

    var sort_dir = el.getAttribute('data-state-sort-dir');
    if(sort_dir === 'asc' || sort_dir === 'desc') {
      state.sort_dir = sort_dir;
    }
    return state;
  },

  /**
   * Removes empty inspector options to keep command payload compact.
   * @param {Object} options Inspector options.
   * @returns {Object} Clean options object.
   */
  normalizeInspectorState(options) {
    var normalized = {};
    if(!options || typeof options !== 'object') {
      return normalized;
    }

    if(typeof options.view === 'string' && options.view.length) {
      normalized.view = options.view;
    }
    if(typeof options.filter === 'string' && options.filter.trim().length) {
      normalized.filter = options.filter.trim();
    }
    if(typeof options.filter_expr === 'string' && options.filter_expr.trim().length) {
      normalized.filter_expr = options.filter_expr.trim();
    }
    if(typeof options.sort_by === 'string' && options.sort_by.length) {
      normalized.sort_by = options.sort_by;
      normalized.sort_dir = options.sort_dir === 'desc' ? 'desc' : 'asc';
    }
    return normalized;
  },

  /**
   * Constructs inspectVariable command from variable and state options.
   * @param {string} variable Variable name.
   * @param {Object} state Inspector options.
   * @returns {string} Command string.
   */
  buildInspectCommand(variable, state) {
    var cmd = 'inspectVariable(' + JSON.stringify(variable);
    var normalized = this.normalizeInspectorState(state);
    if(Object.keys(normalized).length) {
      cmd += ', ' + JSON.stringify(normalized);
    }
    cmd += ')';
    return cmd;
  },

  /**
   * Executes inspector command while preserving the current command input.
   * @param {string} variable Variable name.
   * @param {Object} state Inspector options.
   */
  runInspectCommand(variable, state) {
    if(!variable || !variable.length) {
      return;
    }
    this.evalCommandPreserveInput(this.buildInspectCommand(variable, state));
  },

  /**
   * Executes table action and refreshes inspector view.
   * @param {string} variable Variable name.
   * @param {Object} state Inspector state.
   * @param {string} action Table action key.
   * @param {Object} payload Table action payload.
   */
  runTableInspectorAction(variable, state, action, payload) {
    var action_cmd = 'inspectTableAction(' +
      JSON.stringify(variable) + ', ' +
      JSON.stringify(action) + ', ' +
      JSON.stringify(payload || {}) + ')';
    var inspect_cmd = this.buildInspectCommand(variable, state);
    this.evalCommandPreserveInput(action_cmd + '; ' + inspect_cmd);
  },

  /**
   * Handles table-specific inspector actions.
   * @param {string} action Action id.
   * @param {HTMLElement} el Action element.
   * @param {string} variable Inspector variable.
   * @param {Object} state Inspector state.
   * @returns {Promise<boolean>} True if action was handled.
   */
  async handleTableInspectorAction(action, el, variable, state) {
    if(action === 'table-filter-expr') {
      var current_expr = state.filter_expr || '';
      var expr_result = await this.openInspectorInputDialog({
        title: language.string(394),
        message: language.string(424),
        submit_label: language.string(391),
        fields: [
          {
            label: language.string(430),
            value: current_expr
          }
        ]
      });
      if(!expr_result) {
        return true;
      }
      var next_expr = expr_result.values[0];
      next_expr = next_expr.trim();
      if(next_expr.length) {
        state.filter_expr = next_expr;
      } else {
        delete state.filter_expr;
      }
      this.runInspectCommand(variable, state);
      return true;
    }

    if(action === 'table-clear-filter-expr') {
      delete state.filter_expr;
      this.runInspectCommand(variable, state);
      return true;
    }

    if(action === 'sort') {
      var next_sort_by = el.getAttribute('data-next-sort-by');
      var next_sort_dir = el.getAttribute('data-next-sort-dir');
      if(next_sort_by && next_sort_by.length) {
        state.sort_by = next_sort_by;
        state.sort_dir = next_sort_dir === 'desc' ? 'desc' : 'asc';
      }
      this.runInspectCommand(variable, state);
      return true;
    }

    if(action === 'table-addvar') {
      var add_result = await this.openInspectorInputDialog({
        title: language.string(398),
        submit_label: language.string(391),
        fields: [
          {
            label: language.string(425),
            value: ''
          },
          {
            label: language.string(426),
            value: ''
          }
        ]
      });
      if(!add_result) {
        return true;
      }
      var new_name = add_result.values[0];
      new_name = new_name.trim();
      if(!new_name.length) {
        return true;
      }

      var expression = add_result.values[1];
      expression = expression.trim();
      if(!expression.length) {
        return true;
      }

      this.runTableInspectorAction(variable, state, 'addvar', {
        name: new_name,
        expression: expression
      });
      return true;
    }

    if(action === 'table-renamevar') {
      var rename_result = await this.openInspectorInputDialog({
        title: language.string(399),
        submit_label: language.string(391),
        fields: [
          {
            label: language.string(427),
            value: ''
          },
          {
            label: language.string(425),
            value: ''
          }
        ]
      });
      if(!rename_result) {
        return true;
      }
      var old_name = rename_result.values[0];
      old_name = old_name.trim();
      if(!old_name.length) {
        return true;
      }

      var renamed_name = rename_result.values[1];
      renamed_name = renamed_name.trim();
      if(!renamed_name.length) {
        return true;
      }

      this.runTableInspectorAction(variable, state, 'renamevar', {
        old_name: old_name,
        new_name: renamed_name
      });
      return true;
    }

    if(action === 'table-removevar') {
      var remove_result = await this.openInspectorInputDialog({
        title: language.string(400),
        submit_label: language.string(391),
        fields: [
          {
            label: language.string(428),
            value: ''
          }
        ]
      });
      if(!remove_result) {
        return true;
      }
      var remove_names = remove_result.values[0];
      remove_names = remove_names.trim();
      if(!remove_names.length) {
        return true;
      }

      this.runTableInspectorAction(variable, state, 'removevar', {
        names: remove_names
      });
      return true;
    }

    if(action === 'table-copy-csv') {
      this.runTableInspectorAction(variable, state, 'copycsv', {});
      return true;
    }

    return false;
  },

  /**
   * Handles inspector toolbar action buttons.
   * @param {HTMLElement} el Action element.
   */
  async handleInspectorAction(el) {
    if(!el || !el.getAttribute) {
      return;
    }

    var variable = el.getAttribute('data-variable');
    if(!variable || !variable.length) {
      return;
    }

    var action = el.getAttribute('data-action');
    var state = this.getInspectorStateFromElement(el);

    if(action === 'refresh') {
      this.runInspectCommand(variable, state);
      return;
    }

    if(action === 'filter') {
      var current_filter = state.filter || '';
      var filter_result = await this.openInspectorInputDialog({
        title: language.string(392),
        message: language.string(423),
        submit_label: language.string(391),
        fields: [
          {
            label: language.string(390),
            value: current_filter
          }
        ]
      });
      if(!filter_result) {
        return;
      }
      var next_filter = filter_result.values[0];
      next_filter = next_filter.trim();
      if(next_filter.length) {
        state.filter = next_filter;
      } else {
        delete state.filter;
      }
      this.runInspectCommand(variable, state);
      return;
    }

    if(action === 'clear-filter') {
      delete state.filter;
      this.runInspectCommand(variable, state);
      return;
    }

    if(action === 'edit') {
      await this.editInspectorCell(el);
      return;
    }

    if(typeof this.handleTableInspectorAction === 'function') {
      if(await this.handleTableInspectorAction(action, el, variable, state)) {
        return;
      }
    }
  },

  /**
   * Opens editor prompt for a selected inspector cell and writes value back.
   * @param {HTMLElement} el Cell element with data-path and data-default attributes.
   */
  async editInspectorCell(el) {
    if(!el || !el.getAttribute) {
      return;
    }

    var variable = el.getAttribute('data-variable');
    if(!variable || !variable.length) {
      return;
    }

    var path_raw = el.getAttribute('data-path') || '[]';
    var path;
    try {
      path = JSON.parse(path_raw);
    } catch(err) {
      this.errorInternal('@inspector: ' + language.string(446));
      return;
    }

    var default_expr = el.getAttribute('data-default') || '';
    var edit_message = language.formatLang(429, {
      variable: this.escapeInspectorHtml(variable),
      path: this.escapeInspectorHtml(JSON.stringify(path))
    });
    var edit_result = await this.openInspectorInputDialog({
      title: language.string(412),
      message: edit_message,
      submit_label: language.string(391),
      fields: [
        {
          label: language.string(430),
          value: default_expr
        }
      ]
    });
    if(!edit_result) {
      return;
    }
    var expression = edit_result.values[0];
    expression = expression.trim();
    if(!expression.length) {
      return;
    }

    var state = this.getInspectorStateFromElement(el);
    var set_cmd = 'inspectSetVariable(' + JSON.stringify(variable) + ', ' +
      JSON.stringify(path) + ', ' + JSON.stringify(expression) + ')';
    var inspect_cmd = this.buildInspectCommand(variable, state);
    this.evalCommandPreserveInput(set_cmd + '; ' + inspect_cmd);
  }
});

exports.PRDC_JSLAB_COMMAND_WINDOW_INSPECTOR = PRDC_JSLAB_COMMAND_WINDOW_INSPECTOR;

