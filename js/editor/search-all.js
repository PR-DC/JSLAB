/**
 * @file JSLAB editor search all module
 */

/**
 * Class for editor-wide search in open files.
 */
class PRDC_JSLAB_EDITOR_SEARCH_ALL {

  /**
   * Create search all panel.
   * @param {object} win Editor window object.
   */
  constructor(win) {
    this.win = win;
    this.root = document.documentElement;

    this.panel = document.getElementById('editor-search-all-panel');
    this.resizer = document.getElementById('editor-search-all-resizer');
    this.input = document.getElementById('editor-search-all-input');
    this.replace_input = document.getElementById('editor-search-all-replace-input');
    this.case_btn = document.getElementById('editor-search-all-case-btn');
    this.regex_btn = document.getElementById('editor-search-all-regex-btn');
    this.run_btn = document.getElementById('editor-search-all-run');
    this.replace_btn = document.getElementById('editor-search-all-replace-btn');
    this.replace_all_btn = document.getElementById('editor-search-all-replace-all-btn');
    this.close_btn = document.getElementById('editor-search-all-close');
    this.summary_el = document.getElementById('editor-search-all-summary');
    this.results_el = document.getElementById('editor-search-all-results');

    this.search_timer = undefined;
    this.case_sensitive = false;
    this.use_regex = false;
    this.active_result_item = undefined;

    this.storage_height_percent_key = 'editor-search-all-panel-height-percent';
    this.default_panel_height = this.getConfigNumber('EDITOR_SEARCH_ALL_DEFAULT_HEIGHT', 240);
    this.min_panel_height = this.getConfigNumber('EDITOR_SEARCH_ALL_MIN_HEIGHT', 120);
    this.min_code_height = this.getConfigNumber('EDITOR_SEARCH_ALL_MIN_CODE_HEIGHT', 120);
    this.layout_offset = this.getConfigNumber('EDITOR_SEARCH_ALL_LAYOUT_OFFSET', 91);
    this.max_rendered_lines = this.getConfigNumber('EDITOR_SEARCH_ALL_MAX_RENDERED_LINES', 2000);
    this.max_replace_matches = 200000;

    if(!this.panel || !this.input || !this.replace_input || !this.results_el) {
      return;
    }

    this.panel_height_percent = this.loadPanelHeightPercent();
    this.setPanelHeight(this.percentToPanelHeight(this.panel_height_percent), false);
    this.updateOptionButtons();

    this.bindEvents();
  }

  /**
   * Bind panel events.
   */
  bindEvents() {
    var obj = this;

    this.run_btn.addEventListener('click', function() {
      obj.search();
    });

    if(this.replace_btn) {
      this.replace_btn.addEventListener('click', function() {
        obj.replaceNext();
      });
    }

    if(this.replace_all_btn) {
      this.replace_all_btn.addEventListener('click', function() {
        obj.replaceAll();
      });
    }

    this.close_btn.addEventListener('click', function() {
      obj.close();
    });

    this.close_btn.addEventListener('keydown', function(e) {
      if(e.key === 'Enter' || e.key === ' ') {
        obj.close();
        e.stopPropagation();
        e.preventDefault();
      }
    });

    this.input.addEventListener('keydown', function(e) {
      if(e.key === 'Enter') {
        obj.search();
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key === 'Escape') {
        obj.close();
        e.stopPropagation();
        e.preventDefault();
      }
    });

    this.replace_input.addEventListener('keydown', function(e) {
      if(e.key === 'Enter') {
        if(e.shiftKey) {
          obj.replaceAll();
        } else {
          obj.replaceNext();
        }
        e.stopPropagation();
        e.preventDefault();
      } else if(e.key === 'Escape') {
        obj.close();
        e.stopPropagation();
        e.preventDefault();
      }
    });

    this.case_btn.addEventListener('click', function() {
      obj.case_sensitive = !obj.case_sensitive;
      obj.updateOptionButtons();
      obj.search();
    });

    this.regex_btn.addEventListener('click', function() {
      obj.use_regex = !obj.use_regex;
      obj.updateOptionButtons();
      obj.search();
    });

    if(this.resizer) {
      this.resizer.addEventListener('mousedown', function(e) {
        obj.startResize(e);
      });
    }

    this.results_el.addEventListener('click', function(e) {
      obj.activateResultFromEvent(e);
    });

    this.results_el.addEventListener('keydown', function(e) {
      if(e.key === 'Enter') {
        if(obj.activateResultFromEvent(e)) {
          e.stopPropagation();
          e.preventDefault();
        }
      }
    });

    window.addEventListener('resize', function() {
      obj.setPanelHeight(obj.percentToPanelHeight(obj.panel_height_percent), false);
    });
  }

  /**
   * Open search panel and optionally preload query.
   * @param {string} [query] Optional query.
   */
  open(query) {
    if(!this.panel) {
      return;
    }

    this.panel.style.display = 'flex';
    this.root.classList.add('editor-search-all-open');
    this.setPanelHeight(this.percentToPanelHeight(this.panel_height_percent), false);

    if(typeof query === 'string' && query.length) {
      this.input.value = query;
    }

    this.input.focus();
    this.input.setSelectionRange(this.input.value.length, this.input.value.length);

    if(this.input.value.length) {
      this.search();
    } else {
      this.clearResults();
    }
  }

  /**
   * Close search panel.
   */
  close() {
    if(!this.panel) {
      return;
    }

    if(this.search_timer) {
      clearTimeout(this.search_timer);
      this.search_timer = undefined;
    }

    this.panel.style.display = 'none';
    this.root.classList.remove('editor-search-all-open');
    this.clearActiveResultItem();

    var active_tab = this.win.script_manager.active_tab;
    var script = this.win.script_manager.getScriptByTab(active_tab)[0];
    if(script && script.code_editor) {
      script.code_editor.focus();
    }
  }

  /**
   * Refresh panel language-dependent content.
   */
  refreshLanguage() {
    if(this.panel && this.panel.style.display !== 'none' && this.input.value.length) {
      this.search();
    }
  }

  /**
   * Executes search across all open scripts.
   */
  search() {
    if(this.search_timer) {
      clearTimeout(this.search_timer);
      this.search_timer = undefined;
    }

    var regex_data = this.getSearchRegexData();
    if(!regex_data) {
      return;
    }

    var scripts = this.win.script_manager.scripts || [];
    var grouped_results = [];
    var total_matches = 0;
    var total_files = 0;
    var rendered_lines = 0;
    var truncated = false;

    for(var script_index = 0; script_index < scripts.length; script_index++) {
      var script = scripts[script_index];
      if(!script) {
        continue;
      }

      var text = this.getScriptText(script);
      var line_results = this.searchScriptLines(text, regex_data.regex);
      if(!line_results.length) {
        continue;
      }

      total_files += 1;
      for(var i = 0; i < line_results.length; i++) {
        total_matches += line_results[i].match_count;
      }

      grouped_results.push({
        script_index: script_index,
        script: script,
        lines: line_results
      });

      rendered_lines += line_results.length;
      if(rendered_lines >= this.max_rendered_lines) {
        truncated = true;
        break;
      }
    }

    this.renderResults(grouped_results, total_matches, total_files, truncated);
  }

  /**
   * Replaces first match in open files.
   */
  replaceNext() {
    var regex_data = this.getSearchRegexData();
    if(!regex_data) {
      return;
    }

    var replacement_template = this.parseEscapedString(this.replace_input.value);
    var scripts = this.win.script_manager.scripts || [];

    for(var script_index = 0; script_index < scripts.length; script_index++) {
      var script = scripts[script_index];
      if(!script || !script.code_editor) {
        continue;
      }

      var text = this.getScriptText(script);
      var regex = this.cloneRegex(regex_data.regex);
      regex.lastIndex = 0;
      var match = regex.exec(text);
      if(!match || !match[0] || !match[0].length) {
        continue;
      }

      var replacement = this.formatReplacement(replacement_template, match, text);
      var from = script.code_editor.posFromIndex(match.index);
      var to = script.code_editor.posFromIndex(match.index + match[0].length);

      script.activate();
      script.code_editor.focus();
      script.code_editor.replaceRange(replacement, from, to, '+input');
      script.code_editor.setCursor(from);
      script.code_editor.scrollIntoView({ line: from.line, ch: from.ch }, 80);

      this.search();
      return;
    }
  }

  /**
   * Replaces all matches in all open files.
   */
  replaceAll() {
    var regex_data = this.getSearchRegexData();
    if(!regex_data) {
      return;
    }

    var replacement_template = this.parseEscapedString(this.replace_input.value);
    var scripts = this.win.script_manager.scripts || [];
    var has_changes = false;

    for(var script_index = 0; script_index < scripts.length; script_index++) {
      var script = scripts[script_index];
      if(!script || !script.code_editor) {
        continue;
      }

      var text = this.getScriptText(script);
      var matches = this.collectMatches(text, regex_data.regex);
      if(!matches.length) {
        continue;
      }

      has_changes = true;
      this.replaceMatchesInScript(script, text, matches, replacement_template);
    }

    if(has_changes) {
      this.search();
    }
  }

  /**
   * Search individual script lines using provided regex.
   * @param {string} text Script text.
   * @param {RegExp} regex Search regex.
   * @returns {Array<object>}
   */
  searchScriptLines(text, regex) {
    var lines = String(text || '').split(/\r\n|\r|\n/g);
    var results = [];

    for(var line_index = 0; line_index < lines.length; line_index++) {
      var line = lines[line_index];
      var marks = [];
      var first_ch = -1;
      var match_count = 0;
      var match;

      regex.lastIndex = 0;
      while((match = regex.exec(line)) !== null) {
        var match_text = match[0];
        if(!match_text.length) {
          regex.lastIndex += 1;
          continue;
        }

        if(first_ch < 0) {
          first_ch = match.index;
        }

        marks.push({
          start: match.index,
          end: match.index + match_text.length
        });
        match_count += 1;

        if(marks.length >= 128) {
          break;
        }
      }

      if(first_ch >= 0) {
        results.push({
          line: line_index + 1,
          ch: first_ch,
          text: line,
          marks: marks,
          match_count: match_count
        });
      }
    }

    return results;
  }

  /**
   * Build search regex from user query/options.
   * @param {string} query Search text.
   * @param {boolean} case_sensitive Case-sensitive flag.
   * @param {boolean} use_regex Regex mode flag.
   * @returns {{regex: RegExp}|{error: string}}
   */
  createSearchRegex(query, case_sensitive, use_regex) {
    var flags = case_sensitive ? 'g' : 'gi';

    if(use_regex) {
      try {
        return { regex: new RegExp(query, flags) };
      } catch(err) {
        return { error: err.message };
      }
    }

    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return { regex: new RegExp(escaped, flags) };
  }

  /**
   * Returns compiled regex for current query.
   * @returns {{regex: RegExp}|null}
   */
  getSearchRegexData() {
    var query = this.input.value;
    if(!query.length) {
      this.clearResults();
      return null;
    }

    var regex_data = this.createSearchRegex(query, this.case_sensitive, this.use_regex);
    if(regex_data.error) {
      this.renderError(regex_data.error);
      return null;
    }

    return regex_data;
  }

  /**
   * Activates result item from click or key event.
   * @param {Event} e Event object.
   * @returns {boolean}
   */
  activateResultFromEvent(e) {
    var item = e.target.closest('.editor-search-all-item');
    if(!item) {
      return false;
    }

    return this.activateResultItem(item);
  }

  /**
   * Activates selected search result in editor.
   * @param {HTMLElement} item Result item.
   * @returns {boolean}
   */
  activateResultItem(item) {
    var script_index = Number(item.getAttribute('data-script-index'));
    var line = Number(item.getAttribute('data-line'));
    var ch = Number(item.getAttribute('data-ch'));
    var script_path = item.getAttribute('data-script-path');

    if(!isFinite(script_index) || !isFinite(line)) {
      return false;
    }

    var script;
    if(script_path) {
      script = this.win.script_manager.getScriptByPath(script_path)[0];
    }
    if(!script) {
      script = this.win.script_manager.scripts[script_index];
    }
    if(!script || !script.code_editor) {
      return false;
    }

    script.activate();

    var line_zero = Math.max(0, line - 1);
    var ch_zero = Math.max(0, isFinite(ch) ? ch : 0);

    script.code_editor.focus();
    script.code_editor.setCursor({ line: line_zero, ch: ch_zero });
    script.code_editor.scrollIntoView({ line: line_zero, ch: ch_zero }, 80);
    this.setActiveResultItem(item);

    return true;
  }

  /**
   * Marks the active result row.
   * @param {HTMLElement} item Result row.
   */
  setActiveResultItem(item) {
    this.clearActiveResultItem();
    this.active_result_item = item;
    this.active_result_item.classList.add('active');
  }

  /**
   * Clears active result row state.
   */
  clearActiveResultItem() {
    if(this.active_result_item && this.active_result_item.classList) {
      this.active_result_item.classList.remove('active');
    }
    this.active_result_item = undefined;
  }

  /**
   * Clears current results and summary.
   */
  clearResults() {
    this.summary_el.textContent = '';
    this.summary_el.style.color = '#999';
    this.results_el.innerHTML = '';
    this.clearActiveResultItem();
  }

  /**
   * Renders regex/search errors.
   * @param {string} msg Error text.
   */
  renderError(msg) {
    this.summary_el.textContent = msg || '';
    this.summary_el.style.color = '#cf000f';
    this.results_el.innerHTML = '';
    this.clearActiveResultItem();
  }

  /**
   * Render grouped search results.
   * @param {Array<object>} grouped_results Grouped results by file.
   * @param {number} total_matches Total number of matches.
   * @param {number} total_files Number of files with matches.
   * @param {boolean} truncated Whether rendering was truncated.
   */
  renderResults(grouped_results, total_matches, total_files, truncated) {
    this.summary_el.style.color = '#999';
    this.summary_el.textContent =
      total_matches + ' / ' + total_files + (truncated ? ' +' : '');

    this.results_el.innerHTML = '';
    this.clearActiveResultItem();

    var fragment = document.createDocumentFragment();

    if(!grouped_results.length) {
      var empty = document.createElement('div');
      empty.className = 'editor-search-all-empty';
      empty.innerHTML = language.currentString(377);
      fragment.appendChild(empty);
      this.results_el.appendChild(fragment);
      return;
    }

    for(var i = 0; i < grouped_results.length; i++) {
      var file_group = document.createElement('div');
      file_group.className = 'editor-search-all-file';

      var file_header = document.createElement('div');
      file_header.className = 'editor-search-all-file-header';
      file_header.innerHTML = this.escapeHtml(this.getScriptLabel(grouped_results[i].script)) +
        '<span class="count">(' + grouped_results[i].lines.length + ')</span>';
      file_group.appendChild(file_header);

      for(var j = 0; j < grouped_results[i].lines.length; j++) {
        var line_data = grouped_results[i].lines[j];
        var item = document.createElement('div');
        item.className = 'editor-search-all-item';
        item.setAttribute('tabindex', '0');
        item.setAttribute('data-script-index', grouped_results[i].script_index);
        item.setAttribute('data-script-path', grouped_results[i].script.path || '');
        item.setAttribute('data-line', line_data.line);
        item.setAttribute('data-ch', line_data.ch);
        item.innerHTML =
          '<span class="line">' + line_data.line + ':</span>' +
          '<code>' + this.highlightLine(line_data.text, line_data.marks) + '</code>';
        file_group.appendChild(item);
      }

      fragment.appendChild(file_group);
    }

    this.results_el.appendChild(fragment);
  }

  /**
   * Starts mouse resize for the search panel.
   * @param {MouseEvent} e Mouse event.
   */
  startResize(e) {
    if(e.button !== 0) {
      return;
    }

    var obj = this;
    var start_y = e.clientY;
    var start_height = this.panel_height;

    document.body.classList.add('dragging');

    var onMove = function(ev) {
      var delta = start_y - ev.clientY;
      obj.setPanelHeight(start_height + delta, false);
    };

    var onUp = function() {
      document.body.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove, false);
      document.removeEventListener('mouseup', onUp, false);
      obj.persistPanelHeight();
    };

    document.addEventListener('mousemove', onMove, false);
    document.addEventListener('mouseup', onUp, false);

    e.stopPropagation();
    e.preventDefault();
  }

  /**
   * Updates search option buttons.
   */
  updateOptionButtons() {
    this.setButtonState(this.case_btn, this.case_sensitive);
    this.setButtonState(this.regex_btn, this.use_regex);
  }

  /**
   * Set button active state.
   * @param {HTMLElement} btn Button element.
   * @param {boolean} active Active flag.
   */
  setButtonState(btn, active) {
    if(!btn) {
      return;
    }

    if(active) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  /**
   * Collect all non-empty regex matches from source text.
   * @param {string} text Source text.
   * @param {RegExp} regex Global regex.
   * @returns {Array<object>}
   */
  collectMatches(text, regex) {
    var source = String(text || '');
    var local_regex = this.cloneRegex(regex);
    var matches = [];
    var match;

    local_regex.lastIndex = 0;
    while((match = local_regex.exec(source)) !== null) {
      if(!match[0] || !match[0].length) {
        local_regex.lastIndex += 1;
        continue;
      }

      matches.push({
        index: match.index,
        text: match[0],
        groups: match.slice(1),
        named_groups: match.groups || {}
      });

      if(matches.length >= this.max_replace_matches) {
        break;
      }
    }

    return matches;
  }

  /**
   * Apply match replacements to a script editor.
   * @param {object} script Script object.
   * @param {string} source_text Original source text.
   * @param {Array<object>} matches Match descriptors.
   * @param {string} replacement_template Raw replacement template.
   */
  replaceMatchesInScript(script, source_text, matches, replacement_template) {
    var editor = script.code_editor;
    if(!editor || !matches.length) {
      return;
    }

    editor.operation(function() {
      for(var i = matches.length - 1; i >= 0; i--) {
        var match_data = matches[i];
        var replacement = replacement_template;
        if(this.use_regex) {
          replacement = this.formatReplacementFromData(
            replacement_template, source_text, match_data
          );
        }

        var from = editor.posFromIndex(match_data.index);
        var to = editor.posFromIndex(match_data.index + match_data.text.length);
        editor.replaceRange(replacement, from, to, '+input');
      }
    }.bind(this));
  }

  /**
   * Format replacement string for regex match.
   * @param {string} replacement_template Replacement template.
   * @param {Array} match Regex match result.
   * @param {string} source_text Source text.
   * @returns {string}
   */
  formatReplacement(replacement_template, match, source_text) {
    if(!this.use_regex) {
      return replacement_template;
    }

    return this.formatReplacementFromData(replacement_template, source_text, {
      index: match.index,
      text: match[0],
      groups: match.slice(1),
      named_groups: match.groups || {}
    });
  }

  /**
   * Format replacement using normalized match data.
   * @param {string} replacement_template Replacement template.
   * @param {string} source_text Source text.
   * @param {object} match_data Match data.
   * @returns {string}
   */
  formatReplacementFromData(replacement_template, source_text, match_data) {
    var result = String(replacement_template);
    var groups = match_data.groups || [];
    var named_groups = match_data.named_groups || {};
    var match_text = match_data.text || '';
    var start_index = match_data.index || 0;
    var end_index = start_index + match_text.length;

    result = result.replace(/\$<([^>]+)>/g, function(token, name) {
      if(Object.prototype.hasOwnProperty.call(named_groups, name)) {
        var value = named_groups[name];
        return value == null ? '' : String(value);
      }
      return token;
    });

    result = result.replace(/\$(\$|&|`|'|\d{1,2})/g, function(token, part) {
      if(part === '$') {
        return '$';
      }
      if(part === '&') {
        return match_text;
      }
      if(part === '`') {
        return source_text.slice(0, start_index);
      }
      if(part === "'") {
        return source_text.slice(end_index);
      }

      var index = Number(part);
      if(isFinite(index) && index > 0 && index <= groups.length) {
        return groups[index - 1] == null ? '' : String(groups[index - 1]);
      }

      return token;
    });

    return result;
  }

  /**
   * Parse escaped sequences from replacement input.
   * @param {string} value Replacement input.
   * @returns {string}
   */
  parseEscapedString(value) {
    return String(value == null ? '' : value).replace(/\\([nrt\\])/g,
      function(match, ch) {
        if(ch === 'n') return '\n';
        if(ch === 'r') return '\r';
        if(ch === 't') return '\t';
        if(ch === '\\') return '\\';
        return match;
      });
  }

  /**
   * Returns script text from editor or cached code.
   * @param {object} script Script object.
   * @returns {string}
   */
  getScriptText(script) {
    if(script && script.code_editor && script.code_editor.getValue) {
      return script.code_editor.getValue();
    }
    if(script && typeof script.code === 'string') {
      return script.code;
    }
    return '';
  }

  /**
   * Clone regex with same source and flags.
   * @param {RegExp} regex Source regex.
   * @returns {RegExp}
   */
  cloneRegex(regex) {
    return new RegExp(regex.source, regex.flags);
  }

  /**
   * Loads panel height percent from local storage.
   * @returns {number}
   */
  loadPanelHeightPercent() {
    var stored_percent = undefined;
    try {
      stored_percent = window.localStorage.getItem(this.storage_height_percent_key);
    } catch(err) {
      return this.panelHeightToPercent(this.default_panel_height);
    }

    var percent_value = Number(stored_percent);
    if(isFinite(percent_value)) {
      // Compatibility with ratio style values in [0, 1].
      if(percent_value >= 0 && percent_value <= 1) {
        percent_value *= 100;
      }
      return this.clampPanelHeightPercent(percent_value);
    }

    return this.panelHeightToPercent(this.default_panel_height);
  }

  /**
   * Persists panel height.
   */
  persistPanelHeight() {
    try {
      window.localStorage.setItem(this.storage_height_percent_key,
        String(this.panel_height_percent));
    } catch(err) {
      // Ignore persistence failures.
    }
  }

  /**
   * Sets current panel height and updates css variable.
   * @param {number} height Height in px.
   * @param {boolean} persist Persist value.
   */
  setPanelHeight(height, persist) {
    var clamped = this.clampPanelHeight(height);
    this.panel_height = clamped;
    this.panel_height_percent = this.panelHeightToPercent(clamped);
    this.root.style.setProperty('--editor-search-all-panel-height', clamped + 'px');

    if(persist) {
      this.persistPanelHeight();
    }
  }

  /**
   * Returns valid panel bounds for current window size.
   * @returns {{min: number, max: number}}
   */
  getPanelHeightBounds() {
    var min_height = Math.max(0, this.min_panel_height);
    var max_height = Math.max(min_height,
      window.innerHeight - this.layout_offset - this.min_code_height);
    return { min: min_height, max: max_height };
  }

  /**
   * Converts panel height in px to percentage within current bounds.
   * @param {number} height Height in px.
   * @returns {number}
   */
  panelHeightToPercent(height) {
    var bounds = this.getPanelHeightBounds();
    if(bounds.max <= bounds.min) {
      return 100;
    }
    var clamped_height = this.clampPanelHeight(height);
    var percent = ((clamped_height - bounds.min) / (bounds.max - bounds.min)) * 100;
    return this.clampPanelHeightPercent(percent);
  }

  /**
   * Converts panel height percentage to px within current bounds.
   * @param {number} percent Height percentage.
   * @returns {number}
   */
  percentToPanelHeight(percent) {
    var bounds = this.getPanelHeightBounds();
    if(bounds.max <= bounds.min) {
      return bounds.min;
    }
    var p = this.clampPanelHeightPercent(percent);
    var height = bounds.min + ((bounds.max - bounds.min) * p / 100);
    return this.clampPanelHeight(height);
  }

  /**
   * Clamps panel height percent to valid range.
   * @param {number} percent Height percentage.
   * @returns {number}
   */
  clampPanelHeightPercent(percent) {
    var value = Number(percent);
    if(!isFinite(value)) {
      return this.panelHeightToPercent(this.default_panel_height);
    }
    return Math.min(100, Math.max(0, value));
  }

  /**
   * Clamps panel height to valid range.
   * @param {number} height Height in px.
   * @returns {number}
   */
  clampPanelHeight(height) {
    var bounds = this.getPanelHeightBounds();
    var value = Number(height);
    if(!isFinite(value)) {
      value = this.default_panel_height;
    }
    return Math.min(bounds.max, Math.max(bounds.min, Math.round(value)));
  }

  /**
   * Builds display label for script in results.
   * @param {object} script Script object.
   * @returns {string}
   */
  getScriptLabel(script) {
    if(script && typeof script.path === 'string' && script.path.length) {
      return script.path;
    }
    if(script && typeof script.name === 'string' && script.name.length) {
      return script.name;
    }
    return 'Unknown';
  }

  /**
   * Highlights matches in a single line.
   * @param {string} line Raw line.
   * @param {Array<object>} marks Match ranges.
   * @returns {string}
   */
  highlightLine(line, marks) {
    var text = String(line || '');
    if(!marks || !marks.length) {
      return this.escapeHtml(text);
    }

    var html = '';
    var last = 0;
    for(var i = 0; i < marks.length; i++) {
      var start = Math.max(last, marks[i].start);
      var end = Math.max(start, marks[i].end);
      html += this.escapeHtml(text.slice(last, start));
      html += '<mark>' + this.escapeHtml(text.slice(start, end)) + '</mark>';
      last = end;
      if(last >= text.length) {
        break;
      }
    }
    html += this.escapeHtml(text.slice(last));
    return html;
  }

  /**
   * Escapes HTML entities.
   * @param {string} value Raw text.
   * @returns {string}
   */
  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Returns numeric configuration value.
   * @param {string} key Config key.
   * @param {number} fallback Fallback value.
   * @returns {number}
   */
  getConfigNumber(key, fallback) {
    if(typeof config !== 'undefined') {
      var value = Number(config[key]);
      if(isFinite(value) && value > 0) {
        return value;
      }
    }
    return fallback;
  }
}

exports.PRDC_JSLAB_EDITOR_SEARCH_ALL = PRDC_JSLAB_EDITOR_SEARCH_ALL;
