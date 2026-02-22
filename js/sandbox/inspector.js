/**
 * @file JSLAB library inspector submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Returns a human-readable type name.
 * @param {Object} jsl JSL context.
 * @param {*} value Input value.
 * @returns {string}
 */
function inspectorTypeName(jsl, value) {
  if(value === null) {
    return 'null';
  }
  if(Array.isArray(value)) {
    return 'Array';
  }
  if(jsl.inter.format.isTypedArray(value)) {
    return value.constructor ? value.constructor.name : 'TypedArray';
  }
  if(typeof value === 'object') {
    if(value.constructor && value.constructor.name) {
      return value.constructor.name;
    }
    return 'Object';
  }
  return typeof value;
}

/**
 * Trims text to the desired display width.
 * @param {*} text Input text.
 * @param {number} limit Maximum number of characters.
 * @returns {string}
 */
function inspectorTrimText(text, limit) {
  var out = String(text);
  if(out.length <= limit) {
    return out;
  }
  return out.slice(0, Math.max(0, limit - 3)) + '...';
}

/**
 * Builds one-line preview text for a value.
 * @param {Object} jsl JSL context.
 * @param {*} value Input value.
 * @param {number} [max_chars=120] Maximum output width.
 * @returns {string}
 */
function inspectorPreviewValue(jsl, value, max_chars = 120) {
  var text;
  var value_type = typeof value;

  if(value === null) {
    text = 'null';
  } else if(value_type === 'undefined') {
    text = 'undefined';
  } else if(value_type === 'string') {
    text = '"' + value.replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
  } else if(value_type === 'number' || value_type === 'boolean' || value_type === 'bigint') {
    text = String(value);
  } else if(value_type === 'function') {
    text = '[Function ' + (value.name || 'anonymous') + ']';
  } else if(Array.isArray(value)) {
    text = 'Array(' + value.length + ')';
  } else if(jsl.inter.format.isTypedArray(value)) {
    text = inspectorTypeName(jsl, value) + '(' + value.length + ')';
  } else if(value_type === 'object') {
    if(value instanceof Date) {
      text = value.toISOString();
    } else if(value instanceof Map) {
      text = 'Map(' + value.size + ')';
    } else if(value instanceof Set) {
      text = 'Set(' + value.size + ')';
    } else {
      var keys = Object.keys(value);
      var shown = keys.slice(0, 3);
      text = inspectorTypeName(jsl, value) + ' {' + shown.join(', ');
      if(keys.length > shown.length) {
        text += ', ...';
      }
      text += '}';
    }
  } else {
    text = String(value);
  }

  return inspectorTrimText(String(text), max_chars);
}

/**
 * Converts value to lowercase searchable text.
 * @param {*} value Input value.
 * @returns {string}
 */
function inspectorSearchValue(value) {
  if(value === null) {
    return 'null';
  }
  if(typeof value === 'undefined') {
    return 'undefined';
  }
  if(typeof value === 'object') {
    try {
      return JSON.stringify(value).toLowerCase();
    } catch(err) {
      return String(value).toLowerCase();
    }
  }
  return String(value).toLowerCase();
}

/**
 * Converts known wrappers to structures that inspector can render.
 * @param {Object} jsl JSL context.
 * @param {*} value Input value.
 * @returns {*}
 */
function inspectorToInspectable(jsl, value) {
  var inspectable = value;
  if(inspectable &&
    typeof inspectable.getInspectorColumns === 'function' &&
    typeof inspectable.getInspectorRows === 'function') {
    return inspectable;
  }
  if(inspectable && typeof inspectable.toArray === 'function') {
    try {
      inspectable = inspectable.toArray();
    } catch(err) {
      // Keep original value when conversion fails.
    }
  }
  if(jsl.inter.format.isTypedArray(inspectable)) {
    inspectable = Array.from(inspectable);
  }
  return inspectable;
}

/**
 * Returns true if value can be rendered as row-array.
 * @param {Object} jsl JSL context.
 * @param {*} value Input value.
 * @returns {boolean}
 */
function inspectorIsRowArray(jsl, value) {
  return Array.isArray(value) || jsl.inter.format.isTypedArray(value);
}

/**
 * Converts value into expression text usable in inspector editing.
 * @param {*} value Input value.
 * @returns {string}
 */
function inspectorToExpression(value) {
  if(value === null) {
    return 'null';
  }
  if(typeof value === 'undefined') {
    return 'undefined';
  }
  if(typeof value === 'string') {
    return JSON.stringify(value);
  }
  if(typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if(typeof value === 'bigint') {
    return String(value) + 'n';
  }
  try {
    return JSON.stringify(value);
  } catch(err) {
    return '';
  }
}

/**
 * Compares scalar values for table sorting in inspector.
 * @param {*} a First value.
 * @param {*} b Second value.
 * @returns {number}
 */
function inspectorCompareValues(a, b) {
  if(a === b) {
    return 0;
  }

  var a_num = typeof a === 'number' && isFinite(a);
  var b_num = typeof b === 'number' && isFinite(b);
  if(a_num && b_num) {
    return a - b;
  }

  var a_str = String(a).toLowerCase();
  var b_str = String(b).toLowerCase();
  if(a_str < b_str) {
    return -1;
  }
  if(a_str > b_str) {
    return 1;
  }
  return 0;
}

/**
 * Class for JSLAB inspector submodule.
 */
class PRDC_JSLAB_LIB_INSPECTOR {

  /**
   * Initializes inspector submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    this.jsl = jsl;
  }

  /**
   * Displays a spreadsheet-like inspector for a workspace variable in the command window.
   * @param {string} variable_name Variable name in workspace.
   * @param {Object} [options={}] Optional rendering options.
   * @param {number} [options.max_rows=200] Maximum rows to render.
   * @param {number} [options.max_cols=30] Maximum columns to render.
   * @param {number} [options.max_chars=120] Maximum characters shown in a single cell.
   * @param {string} [options.filter] Case-insensitive substring row filter.
   * @param {string} [options.filter_expr] JavaScript expression filter using row object.
   * @param {string} [options.sort_by] Sort column key.
   * @param {string} [options.sort_dir='asc'] Sort direction.
   * @returns {boolean} True when rendered.
   */
  inspectVariable(variable_name, options = {}) {
    if(typeof variable_name !== 'string' || !variable_name.trim().length) {
      this.jsl.inter.env.error('@inspectVariable: ' + this.jsl.inter.lang.string(431));
      return false;
    }

    var name = variable_name.trim();
    if(!(name in this.jsl.context)) {
      this.jsl.inter.env.error('@inspectVariable: ' + this.jsl.formatLang(432, {
        name: name
      }));
      return false;
    }

    if(!options || typeof options !== 'object' || Array.isArray(options)) {
      options = {};
    }

    var max_rows = Number(options.max_rows);
    if(!isFinite(max_rows) || max_rows < 1) {
      max_rows = 200;
    }

    var max_cols = Number(options.max_cols);
    if(!isFinite(max_cols) || max_cols < 1) {
      max_cols = 30;
    }

    var max_chars = Number(options.max_chars);
    if(!isFinite(max_chars) || max_chars < 8) {
      max_chars = 120;
    }

    var filter_text = '';
    if(typeof options.filter === 'string') {
      filter_text = options.filter.trim();
    }
    var filter_text_lc = filter_text.toLowerCase();

    var filter_expr = '';
    if(typeof options.filter_expr === 'string') {
      filter_expr = options.filter_expr.trim();
    }

    var sort_by = '';
    if(typeof options.sort_by === 'string') {
      sort_by = options.sort_by;
    }
    var sort_dir = options.sort_dir === 'desc' ? 'desc' : 'asc';

    var preferred_view = '';
    if(typeof options.view === 'string') {
      preferred_view = options.view;
    }

    var formatLang = this.jsl.formatLang.bind(this.jsl);
    var txt_filter = this.jsl.inter.lang.string(392);
    var txt_clear_filter = this.jsl.inter.lang.string(393);
    var txt_filter_expr = this.jsl.inter.lang.string(394);
    var txt_clear_expr = this.jsl.inter.lang.string(395);
    var txt_refresh = this.jsl.inter.lang.string(396);
    var txt_edit_hint = this.jsl.inter.lang.string(397);
    var txt_add_var = this.jsl.inter.lang.string(398);
    var txt_rename_var = this.jsl.inter.lang.string(399);
    var txt_remove_var = this.jsl.inter.lang.string(400);
    var txt_copy_csv = this.jsl.inter.lang.string(401);
    var txt_inspect = this.jsl.inter.lang.string(402);
    var txt_meta_type = this.jsl.inter.lang.string(403);
    var txt_meta_size = this.jsl.inter.lang.string(404);
    var txt_meta_row_times = this.jsl.inter.lang.string(405);
    var txt_meta_types = this.jsl.inter.lang.string(406);
    var txt_meta_rows = this.jsl.inter.lang.string(407);
    var txt_meta_fields = this.jsl.inter.lang.string(408);
    var txt_meta_length = this.jsl.inter.lang.string(409);
    var txt_meta_entries = this.jsl.inter.lang.string(410);
    var txt_meta_keys = this.jsl.inter.lang.string(447);
    var txt_no_props = this.jsl.inter.lang.string(411);
    var txt_edit_value = this.jsl.inter.lang.string(412);
    var txt_sort_asc = this.jsl.inter.lang.string(413);
    var txt_sort_desc = this.jsl.inter.lang.string(414);
    var txt_double_click_to_edit = this.jsl.inter.lang.string(420);
    var txt_col_key = this.jsl.inter.lang.string(421);
    var txt_col_value = this.jsl.inter.lang.string(422);

    var getTypeName = (value) => inspectorTypeName(this.jsl, value);
    var previewValue = (value) => inspectorPreviewValue(this.jsl, value, max_chars);
    var searchValue = inspectorSearchValue;
    var toInspectable = (value) => inspectorToInspectable(this.jsl, value);
    var isRowArray = (value) => inspectorIsRowArray(this.jsl, value);
    var toExpression = inspectorToExpression;
    var compareValues = inspectorCompareValues;

    var toolbar_extra_actions = [];

    function buildToolbarModel(variable, view, state_sort_by, state_sort_dir, state_filter) {
      return {
        variable: variable,
        view: view,
        state_sort_by: state_sort_by,
        state_sort_dir: state_sort_dir,
        state_filter: state_filter,
        state_filter_expr: filter_expr,
        filter_label: txt_filter,
        clear_filter_label: txt_clear_filter,
        filter_expr_label: txt_filter_expr,
        clear_expr_label: txt_clear_expr,
        refresh_label: txt_refresh,
        hint_label: txt_edit_hint,
        show_clear_filter: state_filter.length > 0,
        show_clear_expr: filter_expr.length > 0,
        extra_actions: toolbar_extra_actions.slice()
      };
    }

    function renderTableModel(columns, rows, note_parts, variable, view) {
      var total_rows = rows.length;
      var filtered_rows = rows;
      if(filter_text_lc.length) {
        filtered_rows = rows.filter(function(row) {
          for(var i = 0; i < row.values.length; i++) {
            if(searchValue(row.values[i]).indexOf(filter_text_lc) >= 0) {
              return true;
            }
          }
          return false;
        });
        note_parts.push(formatLang(417, {
          filter: filter_text,
          matched: filtered_rows.length,
          total: total_rows
        }));
      }

      if(filter_expr.length) {
        var expr_fun;
        try {
          expr_fun = new Function('row', 'index', 'values', 'return (' + filter_expr + ');');
        } catch(err) {
          note_parts.push(formatLang(418, {
            error: err.message
          }));
          expr_fun = undefined;
        }

        if(expr_fun) {
          var before_expr = filtered_rows.length;
          filtered_rows = filtered_rows.filter(function(row, index) {
            try {
              return !!expr_fun(row.record || {}, index, row.values);
            } catch(err) {
              return false;
            }
          });
          note_parts.push(formatLang(419, {
            matched: filtered_rows.length,
            total: before_expr
          }));
        }
      }

      var sorted_rows = filtered_rows.slice();
      var sort_col_index = -1;
      if(sort_by.length) {
        sort_col_index = columns.findIndex(function(col) {
          return col.key === sort_by;
        });
      }

      if(sort_col_index >= 0) {
        var sort_factor = sort_dir === 'desc' ? -1 : 1;
        sorted_rows = sorted_rows.map(function(row, index) {
          return { row: row, index: index };
        }).sort(function(a, b) {
          var cmp = compareValues(a.row.values[sort_col_index], b.row.values[sort_col_index]);
          if(cmp === 0) {
            cmp = a.index - b.index;
          }
          return cmp * sort_factor;
        }).map(function(item) {
          return item.row;
        });
      }

      var total_cols = columns.length;
      var shown_rows = Math.min(sorted_rows.length, max_rows);
      var shown_cols = Math.min(total_cols, max_cols);
      var trimmed_rows = sorted_rows.slice(0, shown_rows);
      var trimmed_columns = columns.slice(0, shown_cols);

      if(sorted_rows.length > shown_rows) {
        note_parts.push(formatLang(415, {
          shown: shown_rows,
          total: sorted_rows.length
        }));
      }
      if(total_cols > shown_cols) {
        note_parts.push(formatLang(416, {
          shown: shown_cols,
          total: total_cols
        }));
      }

      var state_sort_by = sort_col_index >= 0 ? sort_by : '';
      var state_sort_dir = sort_col_index >= 0 ? sort_dir : 'asc';
      var model_columns = [];
      for(var col_i = 0; col_i < trimmed_columns.length; col_i++) {
        var column = trimmed_columns[col_i];
        var column_model = {
          key: column.key,
          label: column.label
        };
        if(typeof column.header_kind === 'string' && column.header_kind.length) {
          column_model.header_kind = column.header_kind;
        }
        if(typeof column.name === 'string' && column.name.length) {
          column_model.name = column.name;
        }
        if(typeof column.type === 'string' && column.type.length) {
          column_model.type = column.type;
        }
        if(column.sortable) {
          var next_sort_dir = 'asc';
          if(state_sort_by === column.key) {
            next_sort_dir = state_sort_dir === 'asc' ? 'desc' : 'asc';
          }
          var indicator = '';
          if(state_sort_by === column.key) {
            indicator = state_sort_dir === 'asc' ? txt_sort_asc : txt_sort_desc;
          }
          column_model.sortable = true;
          column_model.next_sort_dir = next_sort_dir;
          column_model.indicator = indicator;
        } else {
          column_model.sortable = false;
        }
        model_columns.push(column_model);
      }
      var model_rows = [];
      for(var i = 0; i < trimmed_rows.length; i++) {
        var row_cells = [];
        for(var j = 0; j < shown_cols; j++) {
          var cell_value = trimmed_rows[i].values[j];
          var cell_path = trimmed_rows[i].paths[j];
          var column_cfg = trimmed_columns[j];
          var cell_model = {
            preview_text: previewValue(cell_value),
            editable: false
          };
          if(column_cfg.editable && Array.isArray(cell_path)) {
            cell_model.editable = true;
            cell_model.path = cell_path;
            cell_model.default_expr = toExpression(cell_value);
          }
          row_cells.push(cell_model);
        }
        model_rows.push({ cells: row_cells });
      }
      return {
        type: 'table',
        variable: variable,
        view: view,
        state_sort_by: state_sort_by,
        state_sort_dir: state_sort_dir,
        state_filter: filter_text,
        state_filter_expr: filter_expr,
        toolbar: buildToolbarModel(variable, view, state_sort_by, state_sort_dir, filter_text),
        columns: model_columns,
        rows: model_rows,
        edit_cell_title: txt_double_click_to_edit
      };
    }

    var raw_value = this.jsl.context[name];
    var inspectable = toInspectable(raw_value);
    var inspector_type = getTypeName(raw_value);
    var summary_parts = [txt_meta_type + ': ' + inspector_type];
    var note_parts = [];
    var content_model = undefined;
    var resolved_view = '';

    if(inspectable &&
      typeof inspectable.getInspectorColumns === 'function' &&
      typeof inspectable.getInspectorRows === 'function') {
      resolved_view = 'table';
      if(inspectable.constructor &&
        inspectable.constructor.name === 'PRDC_JSLAB_TIMETABLE') {
        resolved_view = 'timetable';
      }

      toolbar_extra_actions = [
        { action: 'table-addvar', label: txt_add_var },
        { action: 'table-renamevar', label: txt_rename_var },
        { action: 'table-removevar', label: txt_remove_var },
        { action: 'table-copy-csv', label: txt_copy_csv }
      ];

      var table_columns = inspectable.getInspectorColumns();
      var table_rows = inspectable.getInspectorRows();
      var table_height = table_rows.length;
      var table_width;
      if(typeof inspectable.width === 'function') {
        table_width = inspectable.width();
      } else {
        table_width = Math.max(0, table_columns.length - 1);
      }
      summary_parts.push(txt_meta_size + ': ' + table_height + ' x ' + table_width);

      if(resolved_view === 'timetable' &&
        typeof inspectable.RowTimesName === 'string' &&
        inspectable.RowTimesName.length) {
        summary_parts.push(txt_meta_row_times + ': ' + inspectable.RowTimesName);
      }

      if(typeof inspectable.variableTypes === 'function') {
        var table_types = inspectable.variableTypes();
        if(table_types && typeof table_types === 'object') {
          var type_pairs = [];
          Object.keys(table_types).forEach(function(type_key) {
            type_pairs.push(type_key + ':' + table_types[type_key]);
          });
          if(type_pairs.length) {
            summary_parts.push(txt_meta_types + ': ' + type_pairs.join(', '));
          }
        }
      }

      content_model = renderTableModel(table_columns, table_rows, note_parts, name, resolved_view);
    } else if(Array.isArray(inspectable)) {
      var is_matrix = inspectable.length > 0 && inspectable.every(isRowArray);
      var is_object_rows = inspectable.length > 0 && inspectable.every((entry) => {
        return entry !== null &&
          typeof entry === 'object' &&
          !Array.isArray(entry) &&
          !this.jsl.inter.format.isTypedArray(entry);
      });

      if(preferred_view === 'matrix' && is_matrix) {
        resolved_view = 'matrix';
      } else if(preferred_view === 'objectRows' && is_object_rows) {
        resolved_view = 'objectRows';
      } else if(preferred_view === 'array') {
        resolved_view = 'array';
      } else if(is_matrix) {
        resolved_view = 'matrix';
      } else if(is_object_rows) {
        resolved_view = 'objectRows';
      } else {
        resolved_view = 'array';
      }

      if(resolved_view === 'matrix') {
        var normalized_rows = inspectable.map(function(row) {
          return Array.isArray(row) ? row : Array.from(row);
        });
        var n_rows = normalized_rows.length;
        var n_cols = normalized_rows.reduce(function(max_len, row) {
          return Math.max(max_len, row.length);
        }, 0);
        summary_parts.push(txt_meta_size + ': ' + n_rows + ' x ' + n_cols);

        var matrix_columns = [{ key: '__row', label: '#', sortable: true, editable: false }];
        for(var col_i = 0; col_i < n_cols; col_i++) {
          matrix_columns.push({ key: 'c' + col_i, label: String(col_i), sortable: true, editable: true });
        }
        var matrix_rows = [];
        for(var row_i = 0; row_i < n_rows; row_i++) {
          var values = [row_i];
          var paths = [null];
          var record = {};
          for(var col_j = 0; col_j < n_cols; col_j++) {
            var matrix_value = normalized_rows[row_i][col_j];
            values.push(matrix_value);
            paths.push([row_i, col_j]);
            record['c' + col_j] = matrix_value;
          }
          matrix_rows.push({ values: values, paths: paths, record: record });
        }
        content_model = renderTableModel(matrix_columns, matrix_rows, note_parts, name, resolved_view);
      } else if(resolved_view === 'objectRows') {
        summary_parts.push(txt_meta_rows + ': ' + inspectable.length);
        var key_set = new Set();
        var key_order = [];
        var key_scan_rows = Math.min(inspectable.length, max_rows);
        for(var key_i = 0; key_i < key_scan_rows; key_i++) {
          Object.keys(inspectable[key_i]).forEach(function(key) {
            if(!key_set.has(key)) {
              key_set.add(key);
              key_order.push(key);
            }
          });
        }
        summary_parts.push(txt_meta_fields + ': ' + key_order.length);

        var object_columns = [{ key: '__row', label: '#', sortable: true, editable: false }];
        for(var col_k = 0; col_k < key_order.length; col_k++) {
          object_columns.push({ key: key_order[col_k], label: key_order[col_k], sortable: true, editable: true });
        }

        var object_rows = inspectable.map(function(row, idx) {
          var values = [idx];
          var paths = [null];
          var record = {};
          for(var j = 0; j < key_order.length; j++) {
            var row_value = row[key_order[j]];
            values.push(row_value);
            paths.push([idx, key_order[j]]);
            record[key_order[j]] = row_value;
          }
          return { values: values, paths: paths, record: record };
        });
        content_model = renderTableModel(object_columns, object_rows, note_parts, name, resolved_view);
      } else {
        summary_parts.push(txt_meta_length + ': ' + inspectable.length);
        var vector_columns = [
          { key: '__row', label: '#', sortable: true, editable: false },
          { key: 'value', label: txt_col_value, sortable: true, editable: true }
        ];
        var vector_rows = inspectable.map(function(value, index) {
          return {
            values: [index, value],
            paths: [null, [index]],
            record: { value: value }
          };
        });
        content_model = renderTableModel(vector_columns, vector_rows, note_parts, name, resolved_view);
      }
    } else if(inspectable instanceof Map) {
      resolved_view = 'map';
      summary_parts.push(txt_meta_entries + ': ' + inspectable.size);
      var map_rows = [];
      var map_index = 0;
      inspectable.forEach(function(value, key) {
        map_rows.push({
          values: [map_index, key, value],
          paths: [null, null, null],
          record: { key: key, value: value }
        });
        map_index += 1;
      });
      content_model = renderTableModel([
        { key: '__row', label: '#', sortable: true, editable: false },
        { key: 'key', label: txt_col_key, sortable: true, editable: false },
        { key: 'value', label: txt_col_value, sortable: true, editable: false }
      ], map_rows, note_parts, name, resolved_view);
    } else if(inspectable instanceof Set) {
      resolved_view = 'set';
      summary_parts.push(txt_meta_entries + ': ' + inspectable.size);
      var set_rows = [];
      var set_index = 0;
      inspectable.forEach(function(value) {
        set_rows.push({
          values: [set_index, value],
          paths: [null, null],
          record: { value: value }
        });
        set_index += 1;
      });
      content_model = renderTableModel([
        { key: '__row', label: '#', sortable: true, editable: false },
        { key: 'value', label: txt_col_value, sortable: true, editable: false }
      ], set_rows, note_parts, name, resolved_view);
    } else if(inspectable && typeof inspectable === 'object') {
      resolved_view = 'object';
      var keys = Object.keys(inspectable);
      summary_parts.push(txt_meta_keys + ': ' + keys.length);
      if(keys.length) {
        var rows = keys.map(function(key) {
          var object_value = inspectable[key];
          return {
            values: [key, getTypeName(object_value), object_value],
            paths: [null, null, [key]],
            record: { key: key, value: object_value }
          };
        });
        content_model = renderTableModel([
          { key: 'key', label: txt_col_key, sortable: true, editable: false },
          { key: 'type', label: txt_meta_type, sortable: true, editable: false },
          { key: 'value', label: txt_col_value, sortable: true, editable: true }
        ], rows, note_parts, name, resolved_view);
      } else {
        content_model = {
          type: 'empty',
          toolbar: buildToolbarModel(name, resolved_view, '', 'asc', filter_text),
          empty_text: txt_no_props
        };
      }
    } else {
      resolved_view = 'scalar';
      content_model = {
        type: 'scalar',
        variable: name,
        view: resolved_view,
        edit_label: txt_edit_value,
        default_expr: toExpression(inspectable),
        preview_text: previewValue(inspectable)
      };
    }

    var inspector_model = {
      variable: name,
      title: txt_inspect,
      meta_parts: summary_parts,
      note_parts: note_parts,
      content: content_model
    };
    this.jsl.inter.env.showInspector(inspector_model);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return true;
  }

  /**
   * Sets variable value at path using a JavaScript expression from inspector.
   * @param {string} variable_name Workspace variable name.
   * @param {Array} path Property/index path.
   * @param {string} expression JavaScript expression representing new value.
   * @returns {boolean} True if updated.
   */
  inspectSetVariable(variable_name, path, expression) {
    if(typeof variable_name !== 'string' || !variable_name.trim().length) {
      this.jsl.inter.env.error('@inspectSetVariable: ' + this.jsl.inter.lang.string(431));
      return false;
    }
    if(!Array.isArray(path)) {
      this.jsl.inter.env.error('@inspectSetVariable: ' + this.jsl.inter.lang.string(433));
      return false;
    }
    if(typeof expression !== 'string') {
      this.jsl.inter.env.error('@inspectSetVariable: ' + this.jsl.inter.lang.string(434));
      return false;
    }

    var name = variable_name.trim();
    if(!(name in this.jsl.context)) {
      this.jsl.inter.env.error('@inspectSetVariable: ' + this.jsl.formatLang(432, {
        name: name
      }));
      return false;
    }

    var new_value;
    try {
      new_value = this.jsl._eval(expression);
    } catch(err) {
      this.jsl.inter.env.error('@inspectSetVariable: ' + this.jsl.formatLang(435, {
        error: err.message
      }));
      return false;
    }

    if(path.length === 0) {
      this.jsl.context[name] = new_value;
      this.jsl.inter.env.setWorkspace();
      this.jsl.no_ans = true;
      this.jsl.ignore_output = true;
      return true;
    }

    var root = this.jsl.context[name];
    if(root && typeof root.setCell === 'function' &&
      path.length === 2 &&
      typeof path[0] === 'number') {
      try {
        root.setCell(path[0], path[1], new_value);
      } catch(err) {
        this.jsl.inter.env.error('@inspectSetVariable: ' + err.message);
        return false;
      }
      this.jsl.inter.env.setWorkspace();
      this.jsl.no_ans = true;
      this.jsl.ignore_output = true;
      return true;
    }

    if(root && typeof root.setSub === 'function' &&
      path.length === 2 &&
      typeof path[0] === 'number' &&
      typeof path[1] === 'number') {
      root.setSub(path[0], path[1], [new_value]);
      this.jsl.inter.env.setWorkspace();
      this.jsl.no_ans = true;
      this.jsl.ignore_output = true;
      return true;
    }

    var target = root;
    for(var i = 0; i < path.length - 1; i++) {
      if(target === null || typeof target === 'undefined') {
        this.jsl.inter.env.error('@inspectSetVariable: ' + this.jsl.inter.lang.string(436));
        return false;
      }
      target = target[path[i]];
    }

    if(target === null || typeof target === 'undefined') {
      this.jsl.inter.env.error('@inspectSetVariable: ' + this.jsl.inter.lang.string(437));
      return false;
    }

    var last_key = path[path.length - 1];
    if(target instanceof Map) {
      target.set(last_key, new_value);
    } else {
      target[last_key] = new_value;
    }

    this.jsl.inter.env.setWorkspace();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return true;
  }

  /**
   * Executes table inspector actions that change table structure/content.
   * @param {string} variable_name Workspace variable name.
   * @param {string} action Action name.
   * @param {Object} [payload={}] Action payload.
   * @returns {boolean} True when action is completed.
   */
  inspectTableAction(variable_name, action, payload = {}) {
    if(typeof variable_name !== 'string' || !variable_name.trim().length) {
      this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.inter.lang.string(431));
      return false;
    }
    if(typeof action !== 'string' || !action.trim().length) {
      this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.inter.lang.string(438));
      return false;
    }
    if(!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      payload = {};
    }

    var name = variable_name.trim();
    if(!(name in this.jsl.context)) {
      this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.formatLang(432, {
        name: name
      }));
      return false;
    }

    var target = this.jsl.context[name];
    if(!target ||
      typeof target.getVariable !== 'function' ||
      typeof target.setVariable !== 'function' ||
      !Array.isArray(target.VariableNames)) {
      this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.formatLang(439, {
        name: name
      }));
      return false;
    }

    var action_name = action.trim().toLowerCase();

    if(action_name === 'addvar') {
      var new_name = typeof payload.name === 'string' ? payload.name.trim() : '';
      if(!new_name.length) {
        this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.inter.lang.string(440));
        return false;
      }

      var expression = typeof payload.expression === 'string' ? payload.expression : '';
      if(!expression.trim().length) {
        this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.inter.lang.string(441));
        return false;
      }

      var new_values;
      try {
        new_values = this.jsl._eval(expression);
      } catch(err) {
        this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.formatLang(435, {
          error: err.message
        }));
        return false;
      }

      if(!Array.isArray(new_values) &&
        !this.jsl.inter.format.isTypedArray(new_values)) {
        var height = typeof target.height === 'function' ? target.height() : 0;
        if(height > 0) {
          new_values = Array.from({ length: height }, function() {
            return new_values;
          });
        } else {
          new_values = [new_values];
        }
      }

      try {
        target.setVariable(new_name, new_values);
      } catch(err) {
        this.jsl.inter.env.error('@inspectTableAction: ' + err.message);
        return false;
      }
    } else if(action_name === 'renamevar') {
      var old_name = typeof payload.old_name === 'string' ? payload.old_name.trim() : '';
      var renamed = typeof payload.new_name === 'string' ? payload.new_name.trim() : '';
      if(!old_name.length || !renamed.length) {
        this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.inter.lang.string(442));
        return false;
      }

      try {
        this.jsl.context[name] = target.renamevars([old_name], [renamed]);
      } catch(err) {
        this.jsl.inter.env.error('@inspectTableAction: ' + err.message);
        return false;
      }
    } else if(action_name === 'removevar') {
      var names = payload.names;
      if(typeof names === 'string') {
        names = names.split(',').map(function(item) {
          return item.trim();
        }).filter(function(item) {
          return item.length > 0;
        });
      }
      if(!Array.isArray(names) || names.length === 0) {
        this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.inter.lang.string(443));
        return false;
      }

      try {
        this.jsl.context[name] = target.removevars(names);
      } catch(err) {
        this.jsl.inter.env.error('@inspectTableAction: ' + err.message);
        return false;
      }
    } else if(action_name === 'copycsv') {
      try {
        var csv_text = this.jsl.inter.table.table2csv(target);
        this.jsl.inter.env.dispMonospaced(csv_text);
      } catch(err) {
        this.jsl.inter.env.error('@inspectTableAction: ' + err.message);
        return false;
      }
    } else {
      this.jsl.inter.env.error('@inspectTableAction: ' + this.jsl.formatLang(445, {
        action: action
      }));
      return false;
    }

    this.jsl.inter.env.setWorkspace();
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return true;
  }

}

exports.PRDC_JSLAB_LIB_INSPECTOR = PRDC_JSLAB_LIB_INSPECTOR;
