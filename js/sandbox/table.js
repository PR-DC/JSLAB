/**
 * @file JSLAB library table/timetable submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Clones column data into a plain array.
 * @param {*} value Column-like value.
 * @param {string} [label='column'] Error label.
 * @returns {Array}
 */
function normalizeColumnData(jsl, value, label = 'column') {
  var out = value;
  if(out && typeof out.toArray === 'function') {
    out = out.toArray();
  }

  if(jsl.inter.format.isTypedArray(out)) {
    out = Array.from(out);
  }

  if(!Array.isArray(out)) {
    throw new Error(jsl.formatLang(448, { label: label }));
  }

  out = out.slice();
  var is_single_column_matrix = out.length > 0 && out.every(function(entry) {
    return Array.isArray(entry) && entry.length === 1;
  });

  if(is_single_column_matrix) {
    out = out.map(function(entry) {
      return entry[0];
    });
  }
  return out;
}

/**
 * Normalizes a name list (array or CSV string).
 * @param {(Array|string)} names Name list input.
 * @param {string} error_label Error label.
 * @returns {Array<string>}
 */
function normalizeNameList(jsl, names, error_label) {
  var out = names;
  if(typeof out === 'string') {
    out = out.split(',').map(function(name) {
      return name.trim();
    }).filter(function(name) {
      return name.length > 0;
    });
  }

  if(!Array.isArray(out)) {
    throw new Error(jsl.formatLang(449, { error_label: error_label }));
  }

  out = out.map(function(name, i) {
    var normalized = String(name).trim();
    if(!normalized.length) {
      throw new Error(jsl.formatLang(450, { index: i }));
    }
    return normalized;
  });

  return out;
}

/**
 * Ensures name list contains unique values.
 * @param {Array<string>} names Name list.
 */
function ensureUniqueNames(jsl, names) {
  jsl.inter.format.ensureUniqueNames(names, function(name) {
    return new Error(jsl.formatLang(451, { name: name }));
  });
}

/**
 * Parses step expression into milliseconds.
 * @param {(number|string)} step Step value.
 * @returns {number}
 */
function parseStepToMs(jsl, step) {
  if(typeof step === 'number' && isFinite(step) && step > 0) {
    return step;
  }

  var s = String(step || '').trim().toLowerCase();
  var known = {
    ms: 1,
    s: 1000,
    sec: 1000,
    second: 1000,
    seconds: 1000,
    m: 60000,
    min: 60000,
    minute: 60000,
    minutes: 60000,
    h: 3600000,
    hour: 3600000,
    hours: 3600000,
    d: 86400000,
    day: 86400000,
    days: 86400000
  };

  if(known.hasOwnProperty(s)) {
    return known[s];
  }

  var match = s.match(/^(\d+(?:\.\d+)?)\s*(ms|s|sec|second|seconds|m|min|minute|minutes|h|hour|hours|d|day|days)$/);
  if(match) {
    return Number(match[1]) * known[match[2]];
  }

  throw new Error(jsl.formatLang(452, { step: String(step) }));
}

/**
 * Class for JSLAB table/timetable submodule.
 */
class PRDC_JSLAB_LIB_TABLE {

  /**
   * Constructs table submodule object.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    this.jsl = jsl;

    // Expose constructors to workspace.
    this.Table = PRDC_JSLAB_TABLE;
    this.Timetable = PRDC_JSLAB_TIMETABLE;

    // Track class source for workspace serializer.
    var class_path = this.jsl.app_path + '/js/sandbox/table.js';
    this.jsl.registerClassDefinition('PRDC_JSLAB_TABLE', PRDC_JSLAB_TABLE, class_path);
    this.jsl.registerClassDefinition('PRDC_JSLAB_TIMETABLE', PRDC_JSLAB_TIMETABLE, class_path);
  }

  /**
   * Creates a table from columns.
   * Usage examples:
   * table(colA, colB, { VariableNames: ['A', 'B'] })
   * table({ A: colA, B: colB })
   * table(colA, colB, 'VariableNames', ['A', 'B'])
   * @param {...*} args Columns and options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  table(...args) {
    var parsed = this._parseColumnsAndOptions(args);
    return new PRDC_JSLAB_TABLE(this.jsl, parsed.columns, parsed.options);
  }

  /**
   * Creates a timetable from row times and columns.
   * Usage examples:
   * timetable(times, colA, colB, { VariableNames: ['A', 'B'] })
   * timetable(times, { A: colA, B: colB })
   * @param {Array|TypedArray} row_times Row times.
   * @param {...*} args Columns and options.
   * @returns {PRDC_JSLAB_TIMETABLE}
   */
  timetable(row_times, ...args) {
    var parsed = this._parseColumnsAndOptions(args);
    return new PRDC_JSLAB_TIMETABLE(this.jsl, row_times, parsed.columns, parsed.options);
  }

  /**
   * Creates a table from a 2D array.
   * @param {Array} A 2D row-major array.
   * @param {Object} [options={}] Table options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  array2table(A, options = {}) {
    var matrix = A;
    if(matrix && typeof matrix.toArray === 'function') {
      matrix = matrix.toArray();
    }
    if(!Array.isArray(matrix)) {
      throw new Error(this.jsl.currentString(453));
    }

    var jsl = this.jsl;
    var rows = matrix.map(function(row) {
      if(jsl.inter.format.isTypedArray(row)) {
        return Array.from(row);
      }
      if(Array.isArray(row)) {
        return row.slice();
      }
      throw new Error(jsl.currentString(454));
    });

    var width = rows.length ? rows.reduce(function(max_width, row) {
      return Math.max(max_width, row.length);
    }, 0) : 0;

    var variable_names;
    if(Object.prototype.hasOwnProperty.call(options, 'VariableNames')) {
      variable_names = normalizeNameList(this.jsl, options.VariableNames, 'VariableNames');
      if(variable_names.length !== width) {
        throw new Error(this.jsl.currentString(455));
      }
    } else {
      variable_names = Array.from({ length: width }, function(_, i) {
        return 'Var' + (i + 1);
      });
    }

    var columns = {};
    for(var j = 0; j < width; j++) {
      columns[variable_names[j]] = rows.map(function(row) {
        return row[j];
      });
    }

    var merged_options = Object.assign({}, options, {
      VariableNames: variable_names
    });
    return new PRDC_JSLAB_TABLE(this.jsl, columns, merged_options);
  }

  /**
   * Creates a table from an array of objects.
   * @param {Array<Object>} rows Array of row objects.
   * @param {Object} [options={}] Table options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  struct2table(rows, options = {}) {
    if(!Array.isArray(rows)) {
      throw new Error(this.jsl.currentString(456));
    }

    var key_set = new Set();
    var jsl = this.jsl;
    rows.forEach(function(row, i) {
      if(row === null || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(jsl.formatLang(457, { index: i }));
      }
      Object.keys(row).forEach(function(key) {
        key_set.add(key);
      });
    });

    var variable_names;
    if(Object.prototype.hasOwnProperty.call(options, 'VariableNames')) {
      variable_names = normalizeNameList(this.jsl, options.VariableNames, 'VariableNames');
    } else {
      variable_names = Array.from(key_set);
    }
    ensureUniqueNames(this.jsl, variable_names);

    var columns = {};
    variable_names.forEach(function(name) {
      columns[name] = rows.map(function(row) {
        return row[name];
      });
    });

    var merged_options = Object.assign({}, options, {
      VariableNames: variable_names
    });
    return new PRDC_JSLAB_TABLE(this.jsl, columns, merged_options);
  }

  /**
   * Converts a table/timetable into a 2D array.
   * @param {(PRDC_JSLAB_TABLE|PRDC_JSLAB_TIMETABLE)} T Table-like object.
   * @returns {Array<Array>}
   */
  table2array(T) {
    if(T && typeof T.toArray === 'function') {
      return T.toArray();
    }
    throw new Error(this.jsl.currentString(458));
  }

  /**
   * Checks whether value is a table.
   * @param {*} value Candidate value.
   * @returns {boolean}
   */
  istable(value) {
    return value instanceof PRDC_JSLAB_TABLE;
  }

  /**
   * Checks whether value is a timetable.
   * @param {*} value Candidate value.
   * @returns {boolean}
   */
  istimetable(value) {
    return value instanceof PRDC_JSLAB_TIMETABLE;
  }

  /**
   * Reads a delimited text file into a table.
   * @param {string} file_path File path.
   * @param {Object} [options={}] Read options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  readtable(file_path, options = {}) {
    if(typeof file_path !== 'string' || !file_path.length) {
      throw new Error(this.jsl.currentString(459));
    }
    if(!this.jsl.inter.env.checkFile(file_path)) {
      throw new Error(this.jsl.formatLang(460, { file_path: file_path }));
    }

    var text = this.jsl.inter.env.readFileSync(file_path, 'utf8');
    var delimiter = typeof options.Delimiter === 'string' && options.Delimiter.length ?
      options.Delimiter : this.jsl.inter.format.detectDelimiter(text, ',');
    var read_variable_names = options.ReadVariableNames !== false;
    var convert = options.Convert !== false;
    var parse_dates = options.ParseDates !== false;

    var rows = this.jsl.inter.format.parseCsvText(text, delimiter);
    if(!rows.length) {
      return new PRDC_JSLAB_TABLE(this.jsl, {}, { VariableNames: [] });
    }

    var header = [];
    var first_data_row_index = 0;
    if(read_variable_names) {
      header = rows[0].map(function(name, i) {
        var normalized = String(name || '').trim();
        return normalized.length ? normalized : ('Var' + (i + 1));
      });
      first_data_row_index = 1;
    } else if(options.VariableNames) {
      header = normalizeNameList(this.jsl, options.VariableNames, 'VariableNames');
    } else {
      var width = rows.reduce(function(max_width, row) {
        return Math.max(max_width, row.length);
      }, 0);
      header = Array.from({ length: width }, function(_, i) {
        return 'Var' + (i + 1);
      });
    }
    ensureUniqueNames(this.jsl, header);

    var width_all = Math.max(header.length, rows.reduce(function(max_width, row) {
      return Math.max(max_width, row.length);
    }, 0));
    if(width_all > header.length) {
      for(var add_i = header.length; add_i < width_all; add_i++) {
        header.push('Var' + (add_i + 1));
      }
    }
    ensureUniqueNames(this.jsl, header);

    var columns = {};
    header.forEach(function(name) {
      columns[name] = [];
    });

    var parse_options = {
      convert: convert,
      parse_dates: parse_dates,
      missing_tokens: Array.isArray(options.TreatAsMissing) ? options.TreatAsMissing : undefined
    };

    for(var row_i = first_data_row_index; row_i < rows.length; row_i++) {
      var row = rows[row_i];
      for(var col_i = 0; col_i < header.length; col_i++) {
        var raw = col_i < row.length ? row[col_i] : '';
        columns[header[col_i]].push(this.jsl.inter.format.parseCsvScalar(raw, parse_options));
      }
    }

    var out_options = {
      VariableNames: header
    };
    return new PRDC_JSLAB_TABLE(this.jsl, columns, out_options);
  }

  /**
   * Reads a delimited text file into a timetable.
   * @param {string} file_path File path.
   * @param {Object} [options={}] Read options.
   * @returns {PRDC_JSLAB_TIMETABLE}
   */
  readtimetable(file_path, options = {}) {
    var table_value = this.readtable(file_path, options);
    if(!table_value.width()) {
      return new PRDC_JSLAB_TIMETABLE(this.jsl, [], {}, {
        VariableNames: [],
        RowTimesName: typeof options.RowTimesName === 'string' && options.RowTimesName.length ?
          options.RowTimesName : 'Time'
      });
    }

    var row_time_name;
    if(typeof options.RowTimesVariableName === 'string' && options.RowTimesVariableName.length) {
      row_time_name = options.RowTimesVariableName;
    } else if(typeof options.RowTimesName === 'string' && table_value.hasVariable(options.RowTimesName)) {
      row_time_name = options.RowTimesName;
    } else {
      row_time_name = table_value.VariableNames[0];
    }

    if(!table_value.hasVariable(row_time_name)) {
      throw new Error(this.jsl.formatLang(461, { name: row_time_name }));
    }

    var row_times_raw = table_value.getVariable(row_time_name);
    var row_times = row_times_raw.map(function(value) {
      if(value instanceof Date) {
        return value;
      }
      if(typeof value === 'number' && isFinite(value)) {
        return new Date(value);
      }
      var parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    });

    var data_names = table_value.VariableNames.filter(function(name) {
      return name !== row_time_name;
    });
    var data_columns = {};
    data_names.forEach(function(name) {
      data_columns[name] = table_value.getVariable(name).slice();
    });

    var row_times_name = typeof options.RowTimesName === 'string' &&
      options.RowTimesName.length ? options.RowTimesName : row_time_name;

    return new PRDC_JSLAB_TIMETABLE(this.jsl, row_times, data_columns, {
      VariableNames: data_names,
      RowTimesName: row_times_name
    });
  }

  /**
   * Serializes table/timetable into CSV text.
   * @param {(PRDC_JSLAB_TABLE|PRDC_JSLAB_TIMETABLE)} T Table-like value.
   * @param {Object} [options={}] CSV options.
   * @returns {string}
   */
  table2csv(T, options = {}) {
    var value = this._ensureTableInput(T);
    var delimiter = typeof options.Delimiter === 'string' && options.Delimiter.length ?
      options.Delimiter : ',';
    var include_variable_names = options.WriteVariableNames !== false;
    var include_row_names = options.WriteRowNames === true;
    var row_name_label = this.jsl.currentString(503);
    var time_label = this.jsl.currentString(504);

    var header = [];
    if(value instanceof PRDC_JSLAB_TIMETABLE) {
      header.push(value.RowTimesName || time_label);
    }
    if(include_row_names && value.RowNames.length === value.height() && value.height() > 0) {
      header.push(row_name_label);
    }
    header = header.concat(value.VariableNames.slice());

    var format = this.jsl.inter.format;
    var lines = [];
    if(include_variable_names) {
      lines.push(header.map((cell) => {
        return format.csvEscapeCell(cell, delimiter);
      }).join(delimiter));
    }

    for(var i = 0; i < value.height(); i++) {
      var row = [];
      if(value instanceof PRDC_JSLAB_TIMETABLE) {
        row.push(value.RowTimes[i]);
      }
      if(include_row_names && value.RowNames.length === value.height() && value.height() > 0) {
        row.push(value.RowNames[i]);
      }
      for(var j = 0; j < value.VariableNames.length; j++) {
        var var_name = value.VariableNames[j];
        row.push(value.getCell(i, var_name));
      }
      lines.push(row.map((cell) => {
        return format.csvEscapeCell(cell, delimiter);
      }).join(delimiter));
    }

    return lines.join('\n');
  }

  /**
   * Writes table/timetable to CSV/TSV file.
   * @param {(PRDC_JSLAB_TABLE|PRDC_JSLAB_TIMETABLE)} T Table-like value.
   * @param {string} file_path Output file path.
   * @param {Object} [options={}] Write options.
   * @returns {boolean}
   */
  writetable(T, file_path, options = {}) {
    if(typeof file_path !== 'string' || !file_path.length) {
      throw new Error(this.jsl.currentString(462));
    }
    var write_options = Object.assign({}, options);
    if(typeof write_options.Delimiter !== 'string' || !write_options.Delimiter.length) {
      var ext = String(this.jsl.inter.env.pathExtName(file_path) || '').toLowerCase();
      write_options.Delimiter = ext === '.tsv' ? '\t' : ',';
    }
    var csv = this.table2csv(T, write_options);
    this.jsl.inter.env.writeFileSync(file_path, csv, true);
    return true;
  }

  /**
   * Retime timetable using fixed bucket step.
   * @param {PRDC_JSLAB_TIMETABLE} TT Input timetable.
   * @param {(number|string)} step Bucket step.
   * @param {string} [method='mean'] Aggregation method.
   * @param {Object} [options={}] Additional options.
   * @returns {PRDC_JSLAB_TIMETABLE}
   */
  retime(TT, step, method = 'mean', options = {}) {
    var timetable_value = this._ensureTimetableInput(TT);
    if(!timetable_value.height()) {
      return timetable_value.subsetRows([]);
    }

    var jsl = this.jsl;
    var format = this.jsl.inter.format;
    var step_ms = parseStepToMs(this.jsl, step);
    var time_values = timetable_value.RowTimes.map(function(value) {
      if(value instanceof Date) {
        return value.getTime();
      }
      if(typeof value === 'number' && isFinite(value)) {
        return value;
      }
      var parsed = new Date(value);
      if(Number.isNaN(parsed.getTime())) {
        throw new Error(jsl.currentString(463));
      }
      return parsed.getTime();
    });

    var origin = typeof options.Origin === 'number' && isFinite(options.Origin) ?
      options.Origin : Math.min.apply(null, time_values);

    var bucket_map = new Map();
    for(var i = 0; i < time_values.length; i++) {
      var bucket_index = Math.floor((time_values[i] - origin) / step_ms);
      if(!bucket_map.has(bucket_index)) {
        bucket_map.set(bucket_index, []);
      }
      bucket_map.get(bucket_index).push(i);
    }

    var bucket_keys = Array.from(bucket_map.keys()).sort(function(a, b) {
      return a - b;
    });
    var out_row_times = bucket_keys.map(function(bucket_index) {
      return new Date(origin + bucket_index * step_ms);
    });

    var methods = Array.isArray(method) ? method.map(String) : [String(method)];
    var out_columns = {};
    var out_names = [];

    timetable_value.VariableNames.forEach((name) => {
      var source = timetable_value.getVariable(name);
      methods.forEach(function(m) {
        var method_lc = m.toLowerCase();
        var out_name = method_lc === 'mean' ? name : (method_lc + '_' + name);
        out_names.push(out_name);
        out_columns[out_name] = bucket_keys.map(function(bucket_key) {
          var rows = bucket_map.get(bucket_key);
          var values = rows.map(function(row_index) {
            return source[row_index];
          });
          return format.aggregateValues(values, method_lc);
        });
      });
    });

    return new PRDC_JSLAB_TIMETABLE(this.jsl, out_row_times, out_columns, {
      VariableNames: out_names,
      RowTimesName: timetable_value.RowTimesName
    });
  }

  /**
   * Alias for innerjoin.
   * @param {PRDC_JSLAB_TABLE} left Left table.
   * @param {PRDC_JSLAB_TABLE} right Right table.
   * @param {Object} [options={}] Join options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  join(left, right, options = {}) {
    return this.innerjoin(left, right, options);
  }

  /**
   * Performs inner join.
   * @param {PRDC_JSLAB_TABLE} left Left table.
   * @param {PRDC_JSLAB_TABLE} right Right table.
   * @param {Object} [options={}] Join options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  innerjoin(left, right, options = {}) {
    return this._joinTables(left, right, options, 'inner');
  }

  /**
   * Performs outer join.
   * @param {PRDC_JSLAB_TABLE} left Left table.
   * @param {PRDC_JSLAB_TABLE} right Right table.
   * @param {Object} [options={}] Join options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  outerjoin(left, right, options = {}) {
    return this._joinTables(left, right, options, 'outer');
  }

  /**
   * Groups rows and computes aggregates.
   * @param {PRDC_JSLAB_TABLE} T Input table.
   * @param {(Array|string)} groupvars Grouping variables.
   * @param {(Array|string)} [method='mean'] Aggregation method(s).
   * @param {(Array|string)} [datavars] Variables to aggregate.
   * @returns {PRDC_JSLAB_TABLE}
   */
  groupsummary(T, groupvars, method = 'mean', datavars) {
    var table_value = this._ensureTableInput(T);
    var format = this.jsl.inter.format;
    var group_names = normalizeNameList(this.jsl, groupvars, 'groupvars');
    group_names.forEach((name) => {
      if(!table_value.hasVariable(name)) {
        throw new Error(this.jsl.formatLang(464, { name: name }));
      }
    });

    var data_names;
    if(typeof datavars === 'undefined') {
      data_names = table_value.VariableNames.filter(function(name) {
        if(group_names.includes(name)) {
          return false;
        }
        var column = table_value.getVariable(name);
        return column.some(function(value) {
          return typeof value === 'number' && !Number.isNaN(value);
        });
      });
    } else {
      data_names = normalizeNameList(this.jsl, datavars, 'datavars');
      data_names.forEach((name) => {
        if(!table_value.hasVariable(name)) {
          throw new Error(this.jsl.formatLang(465, { name: name }));
        }
      });
    }

    var methods = Array.isArray(method) ? method.map(String) : [String(method)];
    var group_map = new Map();
    for(var i = 0; i < table_value.height(); i++) {
      var key_values = group_names.map(function(name) {
        return table_value.getCell(i, name);
      });
      var key = JSON.stringify(key_values);
      if(!group_map.has(key)) {
        group_map.set(key, {
          rows: [],
          key_values: key_values
        });
      }
      group_map.get(key).rows.push(i);
    }

    var out_rows = [];
    group_map.forEach((entry) => {
      var row = {};
      group_names.forEach(function(name, idx) {
        row[name] = entry.key_values[idx];
      });
      row.GroupCount = entry.rows.length;
      data_names.forEach((name) => {
        var values = entry.rows.map(function(row_index) {
          return table_value.getCell(row_index, name);
        });
        methods.forEach(function(m) {
          var m_lc = m.toLowerCase();
          var out_name = name + '_' + m_lc;
          row[out_name] = format.aggregateValues(values, m_lc);
        });
      });
      out_rows.push(row);
    });

    return this.struct2table(out_rows);
  }

  /**
   * Applies a function to selected table variables.
   * @param {(Function|string)} fun Function or aggregator name.
   * @param {PRDC_JSLAB_TABLE} T Input table.
   * @param {Object} [options={}] Options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  varfun(fun, T, options = {}) {
    var table_value = this._ensureTableInput(T);
    var input_variables;
    if(Object.prototype.hasOwnProperty.call(options, 'InputVariables')) {
      input_variables = normalizeNameList(this.jsl, options.InputVariables, 'InputVariables');
      input_variables.forEach((name) => {
        if(!table_value.hasVariable(name)) {
          throw new Error(this.jsl.formatLang(466, { name: name }));
        }
      });
    } else {
      input_variables = table_value.VariableNames.slice();
    }

    var output_names = [];
    var output_columns = {};
    var fun_name = typeof fun === 'string' ? fun : (fun && fun.name ? fun.name : 'fun');
    var prefix = typeof options.OutputPrefix === 'string' ? options.OutputPrefix : (fun_name + '_');

    input_variables.forEach((name) => {
      var values = table_value.getVariable(name).slice();
      var result;
      if(typeof fun === 'function') {
        result = fun(values, name, table_value);
      } else if(typeof fun === 'string') {
        result = this.jsl.inter.format.aggregateValues(values, fun);
      } else {
        throw new Error(this.jsl.currentString(467));
      }
      var out_name = prefix + name;
      output_names.push(out_name);
      output_columns[out_name] = [result];
    });

    return new PRDC_JSLAB_TABLE(this.jsl, output_columns, {
      VariableNames: output_names
    });
  }

  /**
   * Missing-value mask for scalar/array/table.
   * @param {*} value Input value.
   * @returns {*}
   */
  ismissing(value) {
    var format = this.jsl.inter.format;
    if(this.istable(value) || this.istimetable(value)) {
      var table_value = this._ensureTableInput(value);
      var mask_columns = {};
      table_value.VariableNames.forEach((name) => {
        mask_columns[name] = table_value.getVariable(name).map(function(cell) {
          return format.isMissingValue(cell);
        });
      });
      var row_names = Array.isArray(table_value.RowNames) &&
        table_value.RowNames.length === table_value.height() &&
        table_value.height() > 0 ? table_value.RowNames.slice() : undefined;
      if(this.istimetable(value)) {
        var tt_options = {
          VariableNames: table_value.VariableNames.slice(),
          RowTimesName: value.RowTimesName
        };
        if(row_names) {
          tt_options.RowNames = row_names;
        }
        return new PRDC_JSLAB_TIMETABLE(this.jsl, value.RowTimes.slice(), mask_columns, tt_options);
      }
      var t_options = {
        VariableNames: table_value.VariableNames.slice()
      };
      if(row_names) {
        t_options.RowNames = row_names;
      }
      return new PRDC_JSLAB_TABLE(this.jsl, mask_columns, t_options);
    }

    if(this.jsl.inter.format.isTypedArray(value)) {
      value = Array.from(value);
    }
    if(Array.isArray(value)) {
      return value.map(function(item) {
        return format.isMissingValue(item);
      });
    }
    return format.isMissingValue(value);
  }

  /**
   * Fills missing values for scalar/array/table.
   * @param {*} value Input value.
   * @param {string} [method='constant'] Fill method.
   * @param {*} [fill_value=null] Constant replacement value.
   * @returns {*}
   */
  fillmissing(value, method = 'constant', fill_value = null) {
    var m = String(method || 'constant').toLowerCase();

    if(this.istable(value) || this.istimetable(value)) {
      var table_value = this._ensureTableInput(value);
      var out_columns = {};
      table_value.VariableNames.forEach((name) => {
        out_columns[name] = this._fillMissingColumn(table_value.getVariable(name), m, fill_value);
      });
      var row_names = Array.isArray(table_value.RowNames) &&
        table_value.RowNames.length === table_value.height() &&
        table_value.height() > 0 ? table_value.RowNames.slice() : undefined;
      if(this.istimetable(value)) {
        var tt_fill_options = {
          VariableNames: table_value.VariableNames.slice(),
          RowTimesName: value.RowTimesName
        };
        if(row_names) {
          tt_fill_options.RowNames = row_names;
        }
        return new PRDC_JSLAB_TIMETABLE(this.jsl, value.RowTimes.slice(), out_columns, tt_fill_options);
      }
      var t_fill_options = {
        VariableNames: table_value.VariableNames.slice()
      };
      if(row_names) {
        t_fill_options.RowNames = row_names;
      }
      return new PRDC_JSLAB_TABLE(this.jsl, out_columns, t_fill_options);
    }

    if(this.jsl.inter.format.isTypedArray(value)) {
      value = Array.from(value);
    }
    if(Array.isArray(value)) {
      return this._fillMissingColumn(value, m, fill_value);
    }
    return this.jsl.inter.format.isMissingValue(value) ? fill_value : value;
  }

  /**
   * Parses table column arguments and options.
   * @param {Array} args Raw arguments.
   * @returns {{columns: Object, options: Object}}
   */
  _parseColumnsAndOptions(args) {
    var parsed = this._splitColumnsAndOptions(args);
    var columns_args = parsed.columns_args;
    var options = parsed.options;

    // table({A: ..., B: ...}) form
    if(columns_args.length === 1 &&
      this.jsl.inter.format.isPlainObject(columns_args[0]) &&
      !this._isOptionsObject(columns_args[0])) {
      return {
        columns: columns_args[0],
        options: options
      };
    }

    var variable_names;
    if(Object.prototype.hasOwnProperty.call(options, 'VariableNames')) {
      variable_names = normalizeNameList(this.jsl, options.VariableNames, 'VariableNames');
      if(variable_names.length !== columns_args.length) {
        throw new Error(this.jsl.currentString(468));
      }
    } else {
      variable_names = Array.from({ length: columns_args.length }, function(_, i) {
        return 'Var' + (i + 1);
      });
    }

    var columns = {};
    for(var i = 0; i < columns_args.length; i++) {
      columns[variable_names[i]] = normalizeColumnData(this.jsl, columns_args[i], 'column ' + (i + 1));
    }

    options = Object.assign({}, options, {
      VariableNames: variable_names
    });

    return {
      columns: columns,
      options: options
    };
  }

  /**
   * Splits arguments into columns and options.
   * Supports final options object or name/value pairs.
   * @param {Array} args Raw arguments.
   * @returns {{columns_args: Array, options: Object}}
   */
  _splitColumnsAndOptions(args) {
    var columns_args = args.slice();
    var options = {};
    var allowed_keys = this._getAllowedOptionKeys();

    if(columns_args.length > 0) {
      var last_arg = columns_args[columns_args.length - 1];
      if(this.jsl.inter.format.isPlainObject(last_arg) && this._isOptionsObject(last_arg)) {
        options = Object.assign({}, last_arg);
        columns_args.pop();
        return { columns_args: columns_args, options: options };
      }
    }

    var options_start = -1;
    for(var i = 0; i < columns_args.length; i++) {
      if(typeof columns_args[i] === 'string' && allowed_keys.has(columns_args[i])) {
        options_start = i;
        break;
      }
    }

    if(options_start >= 0) {
      var option_args = columns_args.slice(options_start);
      columns_args = columns_args.slice(0, options_start);

      if(option_args.length % 2 !== 0) {
        throw new Error(this.jsl.currentString(469));
      }

      for(var j = 0; j < option_args.length; j += 2) {
        var key = option_args[j];
        var value = option_args[j + 1];
        if(typeof key !== 'string' || !allowed_keys.has(key)) {
          throw new Error(this.jsl.formatLang(470, { key: key }));
        }
        options[key] = value;
      }
    }

    return { columns_args: columns_args, options: options };
  }

  /**
   * Checks whether object contains table option keys.
   * @param {*} value Candidate object.
   * @returns {boolean}
   */
  _isOptionsObject(value) {
    if(!this.jsl.inter.format.isPlainObject(value)) {
      return false;
    }
    var allowed_keys = this._getAllowedOptionKeys();
    return Object.keys(value).some(function(key) {
      return allowed_keys.has(key);
    });
  }

  /**
   * Returns supported options keys.
   * @returns {Set<string>}
   */
  _getAllowedOptionKeys() {
    return new Set([
      'VariableNames',
      'RowNames',
      'RowTimesName'
    ]);
  }

  /**
   * Ensures value is table-like input.
   * @param {*} value Candidate value.
   * @returns {(PRDC_JSLAB_TABLE|PRDC_JSLAB_TIMETABLE)}
   */
  _ensureTableInput(value) {
    if(this.istable(value) || this.istimetable(value)) {
      return value;
    }
    throw new Error(this.jsl.currentString(471));
  }

  /**
   * Ensures value is timetable input.
   * @param {*} value Candidate value.
   * @returns {PRDC_JSLAB_TIMETABLE}
   */
  _ensureTimetableInput(value) {
    if(this.istimetable(value)) {
      return value;
    }
    throw new Error(this.jsl.currentString(472));
  }

  /**
   * Fills missing values in a single column.
   * @param {Array} column Source column.
   * @param {string} method Fill method.
   * @param {*} fill_value Constant replacement.
   * @returns {Array}
   */
  _fillMissingColumn(column, method, fill_value) {
    var format = this.jsl.inter.format;
    var out = column.slice();
    if(method === 'constant') {
      for(var i = 0; i < out.length; i++) {
        if(format.isMissingValue(out[i])) {
          out[i] = fill_value;
        }
      }
      return out;
    }

    if(method === 'previous') {
      var last;
      for(var j = 0; j < out.length; j++) {
        if(format.isMissingValue(out[j])) {
          if(typeof last !== 'undefined') {
            out[j] = last;
          }
        } else {
          last = out[j];
        }
      }
      return out;
    }

    if(method === 'next') {
      var next;
      for(var k = out.length - 1; k >= 0; k--) {
        if(format.isMissingValue(out[k])) {
          if(typeof next !== 'undefined') {
            out[k] = next;
          }
        } else {
          next = out[k];
        }
      }
      return out;
    }

    throw new Error(this.jsl.formatLang(473, { method: method }));
  }

  /**
   * Normalizes join keys from options.
   * @param {PRDC_JSLAB_TABLE} left Left table.
   * @param {PRDC_JSLAB_TABLE} right Right table.
   * @param {Object} options Join options.
   * @returns {{left_keys: Array<string>, right_keys: Array<string>}}
   */
  _resolveJoinKeys(left, right, options) {
    var jsl = this.jsl;
    var left_keys;
    var right_keys;

    if(Object.prototype.hasOwnProperty.call(options, 'Keys')) {
      left_keys = normalizeNameList(this.jsl, options.Keys, 'Keys');
      right_keys = left_keys.slice();
    } else if(Object.prototype.hasOwnProperty.call(options, 'LeftKeys') &&
      Object.prototype.hasOwnProperty.call(options, 'RightKeys')) {
      left_keys = normalizeNameList(this.jsl, options.LeftKeys, 'LeftKeys');
      right_keys = normalizeNameList(this.jsl, options.RightKeys, 'RightKeys');
      if(left_keys.length !== right_keys.length) {
        throw new Error(this.jsl.currentString(474));
      }
    } else {
      left_keys = left.VariableNames.filter(function(name) {
        return right.hasVariable(name);
      });
      right_keys = left_keys.slice();
    }

    if(!left_keys.length) {
      throw new Error(this.jsl.currentString(475));
    }
    left_keys.forEach(function(name) {
      if(!left.hasVariable(name)) {
        throw new Error(jsl.formatLang(476, { name: name }));
      }
    });
    right_keys.forEach(function(name) {
      if(!right.hasVariable(name)) {
        throw new Error(jsl.formatLang(477, { name: name }));
      }
    });

    return { left_keys: left_keys, right_keys: right_keys };
  }

  /**
   * Joins two tables.
   * @param {*} left Left input.
   * @param {*} right Right input.
   * @param {Object} options Join options.
   * @param {string} join_type Join type.
   * @returns {PRDC_JSLAB_TABLE}
   */
  _joinTables(left, right, options, join_type) {
    var left_table = this._ensureTableInput(left);
    var right_table = this._ensureTableInput(right);
    var keys = this._resolveJoinKeys(left_table, right_table, options || {});
    var left_keys = keys.left_keys;
    var right_keys = keys.right_keys;

    var right_index = new Map();
    for(var i = 0; i < right_table.height(); i++) {
      var key_values = right_keys.map(function(name) {
        return right_table.getCell(i, name);
      });
      var key = JSON.stringify(key_values);
      if(!right_index.has(key)) {
        right_index.set(key, []);
      }
      right_index.get(key).push(i);
    }

    var right_non_key_vars = right_table.VariableNames.filter(function(name) {
      return !right_keys.includes(name);
    });
    var right_output_names = [];
    var right_name_map = {};
    right_non_key_vars.forEach((name) => {
      var out_name = name;
      if(left_table.hasVariable(out_name)) {
        out_name = out_name + '_right';
      }
      right_output_names.push(out_name);
      right_name_map[name] = out_name;
    });

    var left_output_names = left_table.VariableNames.slice();
    var all_names = left_output_names.concat(right_output_names);
    var out_rows = [];
    var matched_right_rows = new Set();

    for(var li = 0; li < left_table.height(); li++) {
      var left_key_values = left_keys.map(function(name) {
        return left_table.getCell(li, name);
      });
      var left_key = JSON.stringify(left_key_values);
      var matches = right_index.get(left_key) || [];

      if(matches.length) {
        matches.forEach((ri) => {
          matched_right_rows.add(ri);
          var row = {};
          left_output_names.forEach(function(name) {
            row[name] = left_table.getCell(li, name);
          });
          right_non_key_vars.forEach(function(name) {
            row[right_name_map[name]] = right_table.getCell(ri, name);
          });
          out_rows.push(row);
        });
      } else if(join_type === 'outer') {
        var left_only = {};
        left_output_names.forEach(function(name) {
          left_only[name] = left_table.getCell(li, name);
        });
        right_output_names.forEach(function(name) {
          left_only[name] = null;
        });
        out_rows.push(left_only);
      }
    }

    if(join_type === 'outer') {
      for(var ri = 0; ri < right_table.height(); ri++) {
        if(matched_right_rows.has(ri)) {
          continue;
        }
        var right_only = {};
        left_output_names.forEach(function(name) {
          var key_idx = left_keys.indexOf(name);
          if(key_idx >= 0) {
            right_only[name] = right_table.getCell(ri, right_keys[key_idx]);
          } else {
            right_only[name] = null;
          }
        });
        right_non_key_vars.forEach(function(name) {
          right_only[right_name_map[name]] = right_table.getCell(ri, name);
        });
        out_rows.push(right_only);
      }
    }

    if(out_rows.length) {
      return this.struct2table(out_rows, {
        VariableNames: all_names
      });
    }

    var empty_columns = {};
    all_names.forEach(function(name) {
      empty_columns[name] = [];
    });
    return new PRDC_JSLAB_TABLE(this.jsl, empty_columns, {
      VariableNames: all_names
    });
  }
}

exports.PRDC_JSLAB_LIB_TABLE = PRDC_JSLAB_LIB_TABLE;

/**
 * Class for JSLAB table.
 */
class PRDC_JSLAB_TABLE {

  /**
   * Constructs a table object.
   * @param {Object} jsl JSLAB object.
   * @param {(Array|Object)} [columns={}] Table columns.
   * @param {Object} [options={}] Table options.
   */
  constructor(jsl, columns = {}, options = {}) {
    this._jsl = jsl;
    try {
      Object.defineProperty(this, 'jsl', {
        value: jsl,
        writable: false,
        configurable: false,
        enumerable: false
      });
    } catch {
      this.jsl = jsl;
    }
    this._columns = {};
    this._height = 0;
    this.VariableNames = [];
    this.RowNames = [];
    this._dynamic_variable_properties = new Set();
    this._setColumns(columns, options);
  }

  /**
   * Gets table height (number of rows).
   * @returns {number}
   */
  height() {
    if(this.VariableNames.length > 0) {
      var first_name = this.VariableNames[0];
      if(Array.isArray(this._columns[first_name])) {
        return this._columns[first_name].length;
      }
    }
    if(this.RowNames.length > 0) {
      return this.RowNames.length;
    }
    return this._height;
  }

  /**
   * Gets table width (number of variables).
   * @returns {number}
   */
  width() {
    return this.VariableNames.length;
  }

  /**
   * Gets size tuple [height, width] or one dimension.
   * @param {number} [dim] Dimension index (0 or 1).
   * @returns {(Array<number>|number)}
   */
  size(dim) {
    var s = [this.height(), this.width()];
    if(typeof dim === 'undefined') {
      return s;
    }
    return s[dim];
  }

  /**
   * Checks whether variable name exists.
   * @param {string} name Variable name.
   * @returns {boolean}
   */
  hasVariable(name) {
    return this.VariableNames.includes(String(name));
  }

  /**
   * Gets variable column.
   * @param {string} name Variable name.
   * @returns {Array}
   */
  getVariable(name) {
    var key = String(name);
    if(!this.hasVariable(key)) {
      throw new Error(this.jsl.formatLang(478, { key: key }));
    }
    return this._columns[key];
  }

  /**
   * Sets or creates a variable column.
   * @param {string} name Variable name.
   * @param {*} values Column values.
   * @returns {PRDC_JSLAB_TABLE}
   */
  setVariable(name, values) {
    var key = String(name).trim();
    if(!key.length) {
      throw new Error(this.jsl.currentString(479));
    }

    var column = normalizeColumnData(this.jsl, values, 'variable "' + key + '"');
    var current_height = this.height();
    if(this.width() === 0 && current_height === 0) {
      current_height = column.length;
      this._height = current_height;
    }
    if(current_height !== column.length) {
      throw new Error(this.jsl.formatLang(480, { key: key }));
    }

    var old_names = this.VariableNames.slice();
    var existed = this.hasVariable(key);
    if(!existed) {
      this.VariableNames.push(key);
      ensureUniqueNames(this.jsl, this.VariableNames);
    }
    this._columns[key] = column;
    this._syncVariableProperties(old_names);
    return this;
  }

  /**
   * Returns selected variables as a new table.
   * @param {(Array|string)} names Variable names.
   * @returns {PRDC_JSLAB_TABLE}
   */
  selectvars(names) {
    var selected = normalizeNameList(this.jsl, names, 'selectvars names');
    selected.forEach((name) => {
      if(!this.hasVariable(name)) {
        throw new Error(this.jsl.formatLang(481, { name: name }));
      }
    });

    var columns = {};
    selected.forEach((name) => {
      columns[name] = this._columns[name].slice();
    });

    return new PRDC_JSLAB_TABLE(this._jsl, columns, {
      VariableNames: selected,
      RowNames: this._subsetRowNames(this.jsl.inter.format.rangeIndices(this.height()))
    });
  }

  /**
   * Removes variables and returns a new table.
   * @param {(Array|string)} names Variable names to remove.
   * @returns {PRDC_JSLAB_TABLE}
   */
  removevars(names) {
    var remove_list = normalizeNameList(this.jsl, names, 'removevars names');
    var remove_set = new Set(remove_list);
    var kept = this.VariableNames.filter(function(name) {
      return !remove_set.has(name);
    });

    var columns = {};
    kept.forEach((name) => {
      columns[name] = this._columns[name].slice();
    });

    return new PRDC_JSLAB_TABLE(this._jsl, columns, {
      VariableNames: kept,
      RowNames: this._subsetRowNames(this.jsl.inter.format.rangeIndices(this.height()))
    });
  }

  /**
   * Renames variables and returns a new table.
   * @param {(Array|string)} old_names Existing variable names.
   * @param {(Array|string)} new_names New variable names.
   * @returns {PRDC_JSLAB_TABLE}
   */
  renamevars(old_names, new_names) {
    var old_list = normalizeNameList(this.jsl, old_names, 'old_names');
    var new_list = normalizeNameList(this.jsl, new_names, 'new_names');
    if(old_list.length !== new_list.length) {
      throw new Error(this.jsl.currentString(482));
    }

    var renamed = this.VariableNames.slice();
    for(var i = 0; i < old_list.length; i++) {
      var old_name = old_list[i];
      var new_name = new_list[i];
      var idx = renamed.indexOf(old_name);
      if(idx < 0) {
        throw new Error(this.jsl.formatLang(483, { name: old_name }));
      }
      renamed[idx] = String(new_name).trim();
    }
    ensureUniqueNames(this.jsl, renamed);

    var columns = {};
    for(var j = 0; j < this.VariableNames.length; j++) {
      columns[renamed[j]] = this._columns[this.VariableNames[j]].slice();
    }

    return new PRDC_JSLAB_TABLE(this._jsl, columns, {
      VariableNames: renamed,
      RowNames: this._subsetRowNames(this.jsl.inter.format.rangeIndices(this.height()))
    });
  }

  /**
   * Appends variables and returns a new table.
   * @param {...*} args Variables and optional { NewVariableNames: [] }.
   * @returns {PRDC_JSLAB_TABLE}
   */
  addvars(...args) {
    var inputs = args.slice();
    var options = {};
    if(inputs.length > 0 && this.jsl.inter.format.isPlainObject(inputs[inputs.length - 1]) &&
      Object.prototype.hasOwnProperty.call(inputs[inputs.length - 1], 'NewVariableNames')) {
      options = Object.assign({}, inputs.pop());
    }

    var added_columns = {};
    var added_names = [];
    if(inputs.length === 1 &&
      this.jsl.inter.format.isPlainObject(inputs[0]) &&
      !this.jsl.inter.format.isColumnLike(inputs[0])) {
      var object_columns = inputs[0];
      added_names = Object.keys(object_columns);
      added_names.forEach((name) => {
        added_columns[name] = normalizeColumnData(this.jsl, object_columns[name], 'variable "' + name + '"');
      });
    } else {
      if(Object.prototype.hasOwnProperty.call(options, 'NewVariableNames')) {
        added_names = normalizeNameList(this.jsl, options.NewVariableNames, 'NewVariableNames');
        if(added_names.length !== inputs.length) {
          throw new Error(this.jsl.currentString(484));
        }
      } else {
        added_names = [];
        var next_index = 1;
        while(added_names.length < inputs.length) {
          var candidate = 'Var' + next_index;
          next_index += 1;
          if(this.VariableNames.includes(candidate) || added_names.includes(candidate)) {
            continue;
          }
          added_names.push(candidate);
        }
      }
      for(var i = 0; i < inputs.length; i++) {
        added_columns[added_names[i]] = normalizeColumnData(this.jsl, inputs[i], 'variable "' + added_names[i] + '"');
      }
    }

    var all_names = this.VariableNames.concat(added_names);
    ensureUniqueNames(this.jsl, all_names);

    var columns = this.toColumns();
    var height = this.height();
    added_names.forEach((name) => {
      if(height !== 0 && added_columns[name].length !== height) {
        throw new Error(this.jsl.formatLang(485, { name: name }));
      }
      columns[name] = added_columns[name].slice();
    });

    return new PRDC_JSLAB_TABLE(this._jsl, columns, {
      VariableNames: all_names,
      RowNames: this._subsetRowNames(this.jsl.inter.format.rangeIndices(this.height()))
    });
  }

  /**
   * Returns a row subset as a new table.
   * @param {(number|Array|TypedArray|Function)} row_selector Row selector.
   * @returns {PRDC_JSLAB_TABLE}
   */
  subsetRows(row_selector) {
    var indices = this._resolveRowIndices(row_selector);
    var columns = {};
    this.VariableNames.forEach((name) => {
      columns[name] = indices.map((row_index) => this._columns[name][row_index]);
    });

    return new PRDC_JSLAB_TABLE(this._jsl, columns, {
      VariableNames: this.VariableNames.slice(),
      RowNames: this._subsetRowNames(indices)
    });
  }

  /**
   * Alias for subsetRows.
   * @param {(number|Array|TypedArray|Function)} row_selector Row selector.
   * @returns {PRDC_JSLAB_TABLE}
   */
  rows(row_selector) {
    return this.subsetRows(row_selector);
  }

  /**
   * Returns first N rows.
   * @param {number} [n=8] Rows count.
   * @returns {PRDC_JSLAB_TABLE}
   */
  head(n = 8) {
    n = Number(n);
    if(!isFinite(n) || n < 0) {
      n = 8;
    }
    var indices = this.jsl.inter.format.rangeIndices(Math.min(this.height(), Math.floor(n)));
    return this.subsetRows(indices);
  }

  /**
   * Returns last N rows.
   * @param {number} [n=8] Rows count.
   * @returns {PRDC_JSLAB_TABLE}
   */
  tail(n = 8) {
    n = Number(n);
    if(!isFinite(n) || n < 0) {
      n = 8;
    }
    n = Math.min(this.height(), Math.floor(n));
    var start = this.height() - n;
    var indices = Array.from({ length: n }, function(_, i) {
      return start + i;
    });
    return this.subsetRows(indices);
  }

  /**
   * Filters rows using predicate.
   * @param {Function} predicate Row predicate.
   * @returns {PRDC_JSLAB_TABLE}
   */
  filter(predicate) {
    if(typeof predicate !== 'function') {
      throw new Error(this.jsl.currentString(486));
    }
    return this.subsetRows(predicate);
  }

  /**
   * Sorts rows by variable.
   * @param {(string|number)} by Variable name or column index.
   * @param {string} [direction='asc'] Sort direction.
   * @returns {PRDC_JSLAB_TABLE}
   */
  sortrows(by, direction = 'asc') {
    if(this.height() === 0) {
      return this.subsetRows([]);
    }

    var key_name;
    if(typeof by === 'undefined' || by === null) {
      key_name = this.VariableNames[0];
    } else if(typeof by === 'number') {
      key_name = this.VariableNames[by];
    } else {
      key_name = String(by);
    }

    if(!key_name || !this.hasVariable(key_name)) {
      throw new Error(this.jsl.currentString(487));
    }

    var indices = this.jsl.inter.format.buildSortedIndices(this.height(), (row_index) => {
      return this._columns[key_name][row_index];
    }, direction);

    return this.subsetRows(indices);
  }

  /**
   * Inner join with another table.
   * @param {PRDC_JSLAB_TABLE} right Right table.
   * @param {Object} [options={}] Join options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  innerjoin(right, options = {}) {
    return this._jsl.table.innerjoin(this, right, options);
  }

  /**
   * Outer join with another table.
   * @param {PRDC_JSLAB_TABLE} right Right table.
   * @param {Object} [options={}] Join options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  outerjoin(right, options = {}) {
    return this._jsl.table.outerjoin(this, right, options);
  }

  /**
   * Alias for inner join.
   * @param {PRDC_JSLAB_TABLE} right Right table.
   * @param {Object} [options={}] Join options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  join(right, options = {}) {
    return this._jsl.table.join(this, right, options);
  }

  /**
   * Group summary for this table.
   * @param {(Array|string)} groupvars Grouping variables.
   * @param {(Array|string)} [method='mean'] Aggregation method(s).
   * @param {(Array|string)} [datavars] Data variable names.
   * @returns {PRDC_JSLAB_TABLE}
   */
  groupsummary(groupvars, method = 'mean', datavars) {
    return this._jsl.table.groupsummary(this, groupvars, method, datavars);
  }

  /**
   * Applies a function to table variables.
   * @param {(Function|string)} fun Function or aggregate name.
   * @param {Object} [options={}] varfun options.
   * @returns {PRDC_JSLAB_TABLE}
   */
  varfun(fun, options = {}) {
    return this._jsl.table.varfun(fun, this, options);
  }

  /**
   * Missing-value mask table.
   * @returns {PRDC_JSLAB_TABLE}
   */
  ismissing() {
    return this._jsl.table.ismissing(this);
  }

  /**
   * Filled table copy.
   * @param {string} [method='constant'] Fill method.
   * @param {*} [fill_value=null] Fill value.
   * @returns {PRDC_JSLAB_TABLE}
   */
  fillmissing(method = 'constant', fill_value = null) {
    return this._jsl.table.fillmissing(this, method, fill_value);
  }

  /**
   * Returns inferred variable types.
   * @param {number} [max_scan_rows=200] Max rows to inspect per variable.
   * @returns {Object<string,string>}
   */
  variableTypes(max_scan_rows = 200) {
    var types = {};
    var scan_rows = Math.max(1, Math.min(this.height(), Number(max_scan_rows) || 200));
    this.VariableNames.forEach((name) => {
      var column = this._columns[name] || [];
      types[name] = this._inferColumnType(column, scan_rows);
    });
    return types;
  }

  /**
   * Converts table to row objects.
   * @returns {Array<Object>}
   */
  toObjectRows() {
    var out = [];
    for(var i = 0; i < this.height(); i++) {
      var row = {};
      for(var j = 0; j < this.VariableNames.length; j++) {
        var name = this.VariableNames[j];
        row[name] = this._columns[name][i];
      }
      out.push(row);
    }
    return out;
  }

  /**
   * Converts table to 2D array.
   * @returns {Array<Array>}
   */
  toArray() {
    var out = [];
    for(var i = 0; i < this.height(); i++) {
      var row = [];
      for(var j = 0; j < this.VariableNames.length; j++) {
        row.push(this._columns[this.VariableNames[j]][i]);
      }
      out.push(row);
    }
    return out;
  }

  /**
   * Returns plain object with cloned columns.
   * @returns {Object<string, Array>}
   */
  toColumns() {
    var out = {};
    this.VariableNames.forEach((name) => {
      out[name] = this._columns[name].slice();
    });
    return out;
  }

  /**
   * Returns summary object.
   * @returns {Object}
   */
  summary() {
    var variable_types = this.variableTypes();
    return {
      type: 'table',
      height: this.height(),
      width: this.width(),
      VariableNames: this.VariableNames.slice(),
      VariableTypes: variable_types,
      hasRowNames: this.RowNames.length === this.height() && this.height() > 0
    };
  }

  /**
   * Returns inspector column definitions.
   * @returns {Array<Object>}
   */
  getInspectorColumns() {
    var variable_types = this.variableTypes();
    var columns = [{
      key: '__row',
      label: '#',
      header_kind: 'row-index',
      sortable: true,
      editable: false
    }];
    if(this.RowNames.length === this.height() && this.height() > 0) {
      columns.push({
        key: '__rowname',
        header_kind: 'row-name',
        sortable: true,
        editable: false
      });
    }
    this.VariableNames.forEach((name) => {
      var type_label = variable_types[name] || 'mixed';
      columns.push({
        key: name,
        header_kind: 'variable',
        name: name,
        sortable: true,
        editable: true,
        type: type_label
      });
    });
    return columns;
  }

  /**
   * Returns inspector row payload.
   * @returns {Array<Object>}
   */
  getInspectorRows() {
    var has_row_names = this.RowNames.length === this.height() && this.height() > 0;
    var rows = [];
    for(var i = 0; i < this.height(); i++) {
      var values = [i];
      var paths = [null];
      var record = {};
      if(has_row_names) {
        values.push(this.RowNames[i]);
        paths.push(null);
      }
      for(var j = 0; j < this.VariableNames.length; j++) {
        var name = this.VariableNames[j];
        var cell = this._columns[name][i];
        values.push(cell);
        paths.push([i, name]);
        record[name] = cell;
      }
      rows.push({ values: values, paths: paths, record: record });
    }
    return rows;
  }

  /**
   * Sets cell value.
   * @param {number} row_index Row index.
   * @param {(string|number)} column_name Column name or index.
   * @param {*} value New value.
   * @returns {boolean}
   */
  setCell(row_index, column_name, value) {
    var row = Number(row_index);
    if(!Number.isInteger(row) || row < 0 || row >= this.height()) {
      throw new Error(this.jsl.currentString(488));
    }

    var col_name = column_name;
    if(typeof col_name === 'number') {
      col_name = this.VariableNames[col_name];
    }
    col_name = String(col_name);
    if(!this.hasVariable(col_name)) {
      throw new Error(this.jsl.formatLang(489, { col: col_name }));
    }

    this._columns[col_name][row] = value;
    return true;
  }

  /**
   * Gets cell value.
   * @param {number} row_index Row index.
   * @param {(string|number)} column_name Column name or index.
   * @returns {*}
   */
  getCell(row_index, column_name) {
    var row = Number(row_index);
    if(!Number.isInteger(row) || row < 0 || row >= this.height()) {
      throw new Error(this.jsl.currentString(490));
    }

    var col_name = column_name;
    if(typeof col_name === 'number') {
      col_name = this.VariableNames[col_name];
    }
    col_name = String(col_name);
    if(!this.hasVariable(col_name)) {
      throw new Error(this.jsl.formatLang(491, { col: col_name }));
    }
    return this._columns[col_name][row];
  }

  /**
   * String representation.
   * @returns {string}
   */
  toString() {
    var preview = this.VariableNames.slice(0, 6).join(', ');
    if(this.VariableNames.length > 6) {
      preview += ', ...';
    }
    return 'Table(' + this.height() + 'x' + this.width() + ') [' + preview + ']';
  }

  /**
   * JSON representation.
   * @returns {Object}
   */
  toJSON() {
    return {
      type: 'table',
      height: this.height(),
      width: this.width(),
      VariableNames: this.VariableNames.slice(),
      RowNames: this.RowNames.slice(),
      columns: this.toColumns()
    };
  }

  /**
   * Safe JSON representation.
   * @returns {Object}
   */
  toSafeJSON() {
    return this.toJSON();
  }

  /**
   * Pretty string representation.
   * @returns {string}
   */
  toPrettyString() {
    return this.toString();
  }

  /**
   * Infers column type from sample values.
   * @param {Array} column Column values.
   * @param {number} scan_rows Number of rows to scan.
   * @returns {string}
   */
  _inferColumnType(column, scan_rows) {
    var format = this.jsl.inter.format;
    var observed = new Set();
    for(var i = 0; i < scan_rows && i < column.length; i++) {
      var value = column[i];
      if(format.isMissingValue(value)) {
        continue;
      }
      observed.add(format.valueTypeLabel(value));
      if(observed.size > 2) {
        break;
      }
    }
    if(!observed.size) {
      return 'missing';
    }
    if(observed.size === 1) {
      return observed.values().next().value;
    }
    return 'mixed';
  }

  /**
   * Sets/normalizes table columns.
   * @param {(Array|Object)} columns Column data.
   * @param {Object} options Options.
   */
  _setColumns(columns, options) {
    var opts = options;
    if(!opts || typeof opts !== 'object' || Array.isArray(opts)) {
      opts = {};
    }

    var normalized = this._normalizeColumns(columns, opts.VariableNames);
    var old_names = this.VariableNames.slice();
    this._columns = normalized.columns;
    this.VariableNames = normalized.variable_names;
    this._height = normalized.height;

    this._syncVariableProperties(old_names);

    if(Object.prototype.hasOwnProperty.call(opts, 'RowNames')) {
      this._setRowNames(opts.RowNames);
    } else {
      this.RowNames = [];
    }
  }

  /**
   * Normalizes column input into internal representation.
   * @param {(Array|Object)} columns Columns input.
   * @param {(Array|string)} variable_names Optional names.
   * @returns {{columns: Object, variable_names: Array<string>, height: number}}
   */
  _normalizeColumns(columns, variable_names) {
    var source = columns;
    if(typeof source === 'undefined' || source === null) {
      source = {};
    }

    var out_columns = {};
    var out_names = [];
    var height;

    if(Array.isArray(source)) {
      out_names = this._resolveVariableNames(variable_names, source.length);
      for(var i = 0; i < source.length; i++) {
        var name = out_names[i];
        var col = normalizeColumnData(this.jsl, source[i], 'column ' + (i + 1));
        if(typeof height === 'undefined') {
          height = col.length;
        } else if(col.length !== height) {
          throw new Error(this.jsl.currentString(492));
        }
        out_columns[name] = col;
      }
    } else if(this.jsl.inter.format.isPlainObject(source)) {
      var source_names = Object.keys(source);
      if(typeof variable_names === 'undefined') {
        out_names = source_names.slice();
      } else {
        out_names = this._resolveVariableNames(variable_names, source_names.length);
      }

      for(var j = 0; j < source_names.length; j++) {
        var source_name = source_names[j];
        var target_name = out_names[j];
        var target_col = normalizeColumnData(this.jsl, source[source_name], 'variable "' + target_name + '"');
        if(typeof height === 'undefined') {
          height = target_col.length;
        } else if(target_col.length !== height) {
          throw new Error(this.jsl.currentString(492));
        }
        out_columns[target_name] = target_col;
      }
    } else {
      throw new Error(this.jsl.currentString(493));
    }

    ensureUniqueNames(this.jsl, out_names);
    if(typeof height === 'undefined') {
      height = 0;
    }

    return {
      columns: out_columns,
      variable_names: out_names,
      height: height
    };
  }

  /**
   * Resolves variable names.
   * @param {(Array|string|undefined)} variable_names Names input.
   * @param {number} count Required count.
   * @returns {Array<string>}
   */
  _resolveVariableNames(variable_names, count) {
    var out;
    if(typeof variable_names === 'undefined') {
      out = Array.from({ length: count }, function(_, i) {
        return 'Var' + (i + 1);
      });
    } else {
      out = normalizeNameList(this.jsl, variable_names, 'VariableNames');
      if(out.length !== count) {
        throw new Error(this.jsl.currentString(468));
      }
    }
    ensureUniqueNames(this.jsl, out);
    return out;
  }

  /**
   * Sets row names.
   * @param {(Array|string)} row_names Row names.
   */
  _setRowNames(row_names) {
    if(typeof row_names === 'undefined' || row_names === null) {
      this.RowNames = [];
      return;
    }
    var names = normalizeNameList(this.jsl, row_names, 'RowNames');
    if(names.length !== this.height()) {
      throw new Error(this.jsl.currentString(494));
    }
    this.RowNames = names;
  }

  /**
   * Returns subset of row names for given indices.
   * @param {Array<number>} indices Row indices.
   * @returns {Array<string>}
   */
  _subsetRowNames(indices) {
    if(this.RowNames.length !== this.height() || this.height() === 0) {
      return undefined;
    }
    return indices.map((i) => this.RowNames[i]);
  }

  /**
   * Resolves row selector to row indices.
   * @param {(number|Array|TypedArray|Function)} row_selector Row selector.
   * @returns {Array<number>}
   */
  _resolveRowIndices(row_selector) {
    var height = this.height();
    var jsl = this.jsl;

    if(typeof row_selector === 'undefined') {
      return this.jsl.inter.format.rangeIndices(height);
    }

    if(typeof row_selector === 'number') {
      if(!Number.isInteger(row_selector) || row_selector < 0 || row_selector >= height) {
        throw new Error(this.jsl.currentString(495));
      }
      return [row_selector];
    }

    if(typeof row_selector === 'function') {
      var indices = [];
      for(var i = 0; i < height; i++) {
        if(row_selector(this._rowObjectAt(i), i, this)) {
          indices.push(i);
        }
      }
      return indices;
    }

    if(this.jsl.inter.format.isTypedArray(row_selector)) {
      row_selector = Array.from(row_selector);
    }

    if(Array.isArray(row_selector)) {
      if(row_selector.length === height && row_selector.every(function(value) {
        return typeof value === 'boolean';
      })) {
        return row_selector.reduce(function(acc, value, i) {
          if(value) {
            acc.push(i);
          }
          return acc;
        }, []);
      }

      return row_selector.map(function(value) {
        var index = Number(value);
        if(!Number.isInteger(index) || index < 0 || index >= height) {
          throw new Error(jsl.currentString(495));
        }
        return index;
      });
    }

    throw new Error(this.jsl.currentString(496));
  }

  /**
   * Builds row object at index.
   * @param {number} row_index Row index.
   * @returns {Object}
   */
  _rowObjectAt(row_index) {
    var row = {};
    for(var j = 0; j < this.VariableNames.length; j++) {
      var name = this.VariableNames[j];
      row[name] = this._columns[name][row_index];
    }
    return row;
  }

  /**
   * Re-syncs dynamic variable properties.
   * @param {Array<string>} old_names Old names.
   */
  _syncVariableProperties(old_names) {
    var obj = this;

    old_names.forEach(function(name) {
      if(obj._dynamic_variable_properties.has(name)) {
        delete obj[name];
      }
    });
    this._dynamic_variable_properties.clear();

    this.VariableNames.forEach(function(name) {
      if(!obj._canExposeVariableAsProperty(name)) {
        return;
      }
      Object.defineProperty(obj, name, {
        enumerable: true,
        configurable: true,
        get: function() {
          return obj._columns[name];
        },
        set: function(values) {
          obj.setVariable(name, values);
        }
      });
      obj._dynamic_variable_properties.add(name);
    });
  }

  /**
   * Checks whether variable can be exposed as direct property.
   * @param {string} name Variable name.
   * @returns {boolean}
   */
  _canExposeVariableAsProperty(name) {
    if(typeof name !== 'string' || !name.length) {
      return false;
    }
    if(['__proto__', 'prototype', 'constructor'].includes(name)) {
      return false;
    }
    if(Object.getOwnPropertyDescriptor(PRDC_JSLAB_TABLE.prototype, name)) {
      return false;
    }
    if(typeof PRDC_JSLAB_TIMETABLE !== 'undefined' &&
      Object.getOwnPropertyDescriptor(PRDC_JSLAB_TIMETABLE.prototype, name)) {
      return false;
    }
    if(['_jsl', '_columns', '_height', 'VariableNames', 'RowNames',
      'RowTimes', 'RowTimesName', '_dynamic_variable_properties'].includes(name)) {
      return false;
    }
    return true;
  }
}

exports.PRDC_JSLAB_TABLE = PRDC_JSLAB_TABLE;

/**
 * Class for JSLAB timetable.
 */
class PRDC_JSLAB_TIMETABLE extends PRDC_JSLAB_TABLE {

  /**
   * Constructs a timetable object.
   * @param {Object} jsl JSLAB object.
   * @param {Array|TypedArray} row_times Row times.
   * @param {(Array|Object)} [columns={}] Data columns.
   * @param {Object} [options={}] Timetable options.
   */
  constructor(jsl, row_times, columns = {}, options = {}) {
    var base_options = Object.assign({}, options);
    delete base_options.RowTimesName;
    super(jsl, columns, base_options);

    this.RowTimesName = 'Time';
    this.RowTimes = [];
    if(typeof options.RowTimesName === 'string' && options.RowTimesName.trim().length) {
      this.RowTimesName = options.RowTimesName.trim();
    }
    this.setRowTimes(row_times);
  }

  /**
   * Gets timetable height.
   * @returns {number}
   */
  height() {
    if(Array.isArray(this.RowTimes) && this.RowTimes.length > 0) {
      return this.RowTimes.length;
    }
    return super.height();
  }

  /**
   * Sets row times.
   * @param {*} row_times Row times column.
   * @returns {PRDC_JSLAB_TIMETABLE}
   */
  setRowTimes(row_times) {
    var times = normalizeColumnData(this.jsl, row_times, 'row_times');
    var base_height = super.height();
    if(base_height !== 0 && times.length !== base_height) {
      throw new Error(this.jsl.currentString(497));
    }
    if(base_height === 0) {
      this._height = times.length;
    }
    this.RowTimes = times.slice();

    if(this.RowNames.length > 0 && this.RowNames.length !== this.RowTimes.length) {
      throw new Error(this.jsl.currentString(498));
    }
    return this;
  }

  /**
   * Returns row subset as new timetable.
   * @param {(number|Array|TypedArray|Function)} row_selector Row selector.
   * @returns {PRDC_JSLAB_TIMETABLE}
   */
  subsetRows(row_selector) {
    var indices = this._resolveRowIndices(row_selector);
    var columns = {};
    this.VariableNames.forEach((name) => {
      columns[name] = indices.map((row_index) => this._columns[name][row_index]);
    });

    return new PRDC_JSLAB_TIMETABLE(this._jsl,
      indices.map((i) => this.RowTimes[i]),
      columns,
      {
        VariableNames: this.VariableNames.slice(),
        RowNames: this._subsetRowNames(indices),
        RowTimesName: this.RowTimesName
      });
  }

  /**
   * Sorts rows by row times or variable.
   * @param {(string|number)} [by='RowTimes'] Sort key.
   * @param {string} [direction='asc'] Sort direction.
   * @returns {PRDC_JSLAB_TIMETABLE}
   */
  sortrows(by = 'RowTimes', direction = 'asc') {
    var use_row_times = false;
    if(typeof by === 'undefined' || by === null) {
      use_row_times = true;
    } else if(typeof by === 'string') {
      var by_lc = by.toLowerCase();
      use_row_times = by_lc === 'rowtimes' ||
        by_lc === String(this.RowTimesName).toLowerCase() ||
        by_lc === 'time';
    }

    if(use_row_times) {
      var row_indices = this.jsl.inter.format.buildSortedIndices(this.height(), (row_index) => {
        return this.RowTimes[row_index];
      }, direction);
      return this.subsetRows(row_indices);
    }

    var key_name;
    if(typeof by === 'number') {
      key_name = this.VariableNames[by];
    } else {
      key_name = String(by);
    }
    if(!key_name || !this.hasVariable(key_name)) {
      throw new Error(this.jsl.currentString(499));
    }

    var indices = this.jsl.inter.format.buildSortedIndices(this.height(), (row_index) => {
      return this._columns[key_name][row_index];
    }, direction);
    return this.subsetRows(indices);
  }

  /**
   * Retimes timetable with fixed bucket size.
   * @param {(number|string)} step Bucket step.
   * @param {string} [method='mean'] Aggregation method.
   * @param {Object} [options={}] Additional options.
   * @returns {PRDC_JSLAB_TIMETABLE}
   */
  retime(step, method = 'mean', options = {}) {
    return this._jsl.table.retime(this, step, method, options);
  }

  /**
   * Selects rows within [start_time, end_time].
   * @param {*} start_time Inclusive lower bound.
   * @param {*} end_time Inclusive upper bound.
   * @returns {PRDC_JSLAB_TIMETABLE}
   */
  timerange(start_time, end_time) {
    var format = this.jsl.inter.format;
    var indices = [];
    for(var i = 0; i < this.height(); i++) {
      var value = this.RowTimes[i];
      if(format.compareMixedValues(value, start_time) >= 0 &&
        format.compareMixedValues(value, end_time) <= 0) {
        indices.push(i);
      }
    }
    return this.subsetRows(indices);
  }

  /**
   * Converts timetable to row objects.
   * @returns {Array<Object>}
   */
  toObjectRows() {
    var out = [];
    for(var i = 0; i < this.height(); i++) {
      var row = {};
      row[this.RowTimesName] = this.RowTimes[i];
      for(var j = 0; j < this.VariableNames.length; j++) {
        var name = this.VariableNames[j];
        row[name] = this._columns[name][i];
      }
      out.push(row);
    }
    return out;
  }

  /**
   * Returns inspector column definitions.
   * @returns {Array<Object>}
   */
  getInspectorColumns() {
    var variable_types = this.variableTypes();
    var row_time_type = this._inferColumnType(this.RowTimes || [], Math.min(200, this.height()));
    var columns = [{
      key: '__row',
      label: '#',
      header_kind: 'row-index',
      sortable: true,
      editable: false
    }];
    columns.push({
      key: '__rowtime__',
      header_kind: 'row-time',
      name: this.RowTimesName || '',
      sortable: true,
      editable: true,
      type: row_time_type
    });
    if(this.RowNames.length === this.height() && this.height() > 0) {
      columns.push({
        key: '__rowname',
        header_kind: 'row-name',
        sortable: true,
        editable: false
      });
    }
    this.VariableNames.forEach((name) => {
      var type_label = variable_types[name] || 'mixed';
      columns.push({
        key: name,
        header_kind: 'variable',
        name: name,
        sortable: true,
        editable: true,
        type: type_label
      });
    });
    return columns;
  }

  /**
   * Returns inspector row payload.
   * @returns {Array<Object>}
   */
  getInspectorRows() {
    var has_row_names = this.RowNames.length === this.height() && this.height() > 0;
    var rows = [];
    for(var i = 0; i < this.height(); i++) {
      var values = [i, this.RowTimes[i]];
      var paths = [null, [i, '__rowtime__']];
      var record = {};
      record.__rowtime__ = this.RowTimes[i];
      record[this.RowTimesName || 'Time'] = this.RowTimes[i];
      if(has_row_names) {
        values.push(this.RowNames[i]);
        paths.push(null);
      }
      for(var j = 0; j < this.VariableNames.length; j++) {
        var name = this.VariableNames[j];
        var cell = this._columns[name][i];
        values.push(cell);
        paths.push([i, name]);
        record[name] = cell;
      }
      rows.push({ values: values, paths: paths, record: record });
    }
    return rows;
  }

  /**
   * Sets cell value (supports row times through "__rowtime__").
   * @param {number} row_index Row index.
   * @param {(string|number)} column_name Column name.
   * @param {*} value New value.
   * @returns {boolean}
   */
  setCell(row_index, column_name, value) {
    var row = Number(row_index);
    if(!Number.isInteger(row) || row < 0 || row >= this.height()) {
      throw new Error(this.jsl.currentString(500));
    }

    var col_name = String(column_name);
    if(col_name === '__rowtime__' || col_name === this.RowTimesName) {
      if(typeof value === 'string') {
        var parsed = new Date(value);
        if(!Number.isNaN(parsed.getTime())) {
          value = parsed;
        }
      }
      this.RowTimes[row] = value;
      return true;
    }

    return super.setCell(row, col_name, value);
  }

  /**
   * String representation.
   * @returns {string}
   */
  toString() {
    var preview = this.VariableNames.slice(0, 6).join(', ');
    if(this.VariableNames.length > 6) {
      preview += ', ...';
    }
    return 'Timetable(' + this.height() + 'x' + this.width() + ') [' +
      this.RowTimesName + ', ' + preview + ']';
  }

  /**
   * JSON representation.
   * @returns {Object}
   */
  toJSON() {
    return {
      type: 'timetable',
      height: this.height(),
      width: this.width(),
      RowTimesName: this.RowTimesName,
      RowTimes: this.RowTimes.slice(),
      VariableNames: this.VariableNames.slice(),
      RowNames: this.RowNames.slice(),
      columns: this.toColumns()
    };
  }
}

exports.PRDC_JSLAB_TIMETABLE = PRDC_JSLAB_TIMETABLE;








