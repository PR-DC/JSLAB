/**
 * @file JSLAB CodeMirror hover docs module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');

/**
 * Provides hover tooltips for CodeMirror identifiers backed by documentation.
 */
class PRDC_JSLAB_CODE_DOC_HOVER {

  /**
   * @param {object} [options] - Hover options.
   * @param {number} [options.show_delay=220] - Delay before showing tooltip.
   * @param {number} [options.max_entries=4] - Maximum matched docs to show.
   */
  constructor(options = {}) {
    this.show_delay = isFinite(options.show_delay) ? options.show_delay : 220;
    this.hide_delay = isFinite(options.hide_delay) ? options.hide_delay : 320;
    this.max_entries = isFinite(options.max_entries) ? options.max_entries : 4;
    this.on_print_doc = typeof options.on_print_doc === 'function'
      ? options.on_print_doc
      : function() {};

    this.cm = undefined;
    this.wrapper = undefined;
    this.tooltip = undefined;
    this.pending_timeout = undefined;
    this.hide_timeout = undefined;
    this.pending_hover_key = '';
    this.active_hover_key = '';
    this.last_mouse = { x: 0, y: 0 };

    this.on_mouse_move = this._onMouseMove.bind(this);
    this.on_mouse_leave = this._onMouseLeave.bind(this);
    this.on_mouse_down = this._onMouseDown.bind(this);
    this.on_cm_scroll = this._onCmScroll.bind(this);
    this.on_cm_blur = this._onCmBlur.bind(this);

    this._ensureStyle();
    this._ensureIndex();
  }

  /**
   * Attaches hover docs to a CodeMirror instance.
   * @param {object} cm - CodeMirror instance.
   */
  attach(cm) {
    if(!cm || typeof cm.getWrapperElement !== 'function') {
      return;
    }

    this.detach();
    this.cm = cm;
    this.wrapper = cm.getWrapperElement();
    if(!this.wrapper) {
      return;
    }

    this.wrapper.addEventListener('mousemove', this.on_mouse_move);
    this.wrapper.addEventListener('mouseleave', this.on_mouse_leave);
    this.wrapper.addEventListener('mousedown', this.on_mouse_down);

    this.cm.on('scroll', this.on_cm_scroll);
    this.cm.on('blur', this.on_cm_blur);
  }

  /**
   * Detaches hover docs from CodeMirror and removes tooltip.
   */
  detach() {
    this._clearPending();
    this._cancelHide();
    this._hideTooltip();

    if(this.wrapper) {
      this.wrapper.removeEventListener('mousemove', this.on_mouse_move);
      this.wrapper.removeEventListener('mouseleave', this.on_mouse_leave);
      this.wrapper.removeEventListener('mousedown', this.on_mouse_down);
    }

    if(this.cm && typeof this.cm.off === 'function') {
      this.cm.off('scroll', this.on_cm_scroll);
      this.cm.off('blur', this.on_cm_blur);
    }

    this.cm = undefined;
    this.wrapper = undefined;
    this.pending_hover_key = '';
    this.active_hover_key = '';
  }

  /**
   * Alias for detach.
   */
  destroy() {
    this.detach();
  }

  /**
   * Handles mouse move and schedules tooltip display.
   * @param {MouseEvent} event - Mouse event.
   */
  _onMouseMove(event) {
    if(!this.cm) return;

    this.last_mouse.x = event.clientX;
    this.last_mouse.y = event.clientY;

    var hover = this._getHoverIdentifier(event);
    if(!hover) {
      this.pending_hover_key = '';
      this._clearPending();
      if(this.tooltip) {
        this._scheduleHide();
      } else {
        this._hideTooltip();
      }
      return;
    }
    this._cancelHide();

    var hover_key = hover.line + ':' + hover.start + ':' + hover.end + ':' +
      hover.identifier + ':' + (hover.parent || '');

    if(this.active_hover_key === hover_key && this.tooltip) {
      return;
    }

    if(this.pending_hover_key === hover_key) {
      return;
    }

    this.pending_hover_key = hover_key;
    this._clearPending();
    var obj = this;
    this.pending_timeout = setTimeout(function() {
      obj.pending_timeout = undefined;
      var entries = obj._findEntries(hover.identifier, hover.parent);
      if(!entries.length) {
        obj._hideTooltip();
        return;
      }
      obj.active_hover_key = hover_key;
      obj._showTooltip(hover.identifier, entries, obj.last_mouse.x, obj.last_mouse.y);
    }, this.show_delay);
  }

  /**
   * Hides tooltip on mouse leave.
   */
  _onMouseLeave(event) {
    if(this.tooltip && event && event.relatedTarget &&
       this.tooltip.contains(event.relatedTarget)) {
      return;
    }
    this.pending_hover_key = '';
    this._clearPending();
    this._scheduleHide();
  }

  /**
   * Hides tooltip on mouse down.
   */
  _onMouseDown() {
    this.pending_hover_key = '';
    this._clearPending();
    this._cancelHide();
    this._hideTooltip();
  }

  /**
   * Hides tooltip on editor scroll.
   */
  _onCmScroll() {
    this.pending_hover_key = '';
    this._clearPending();
    this._cancelHide();
    this._hideTooltip();
  }

  /**
   * Hides tooltip on editor blur.
   */
  _onCmBlur() {
    this.pending_hover_key = '';
    this._clearPending();
    this._cancelHide();
    this._hideTooltip();
  }

  /**
   * Clears pending tooltip timer.
   */
  _clearPending() {
    if(this.pending_timeout) {
      clearTimeout(this.pending_timeout);
      this.pending_timeout = undefined;
    }
  }

  /**
   * Schedules tooltip hide with delay.
   */
  _scheduleHide() {
    this._cancelHide();
    var obj = this;
    this.hide_timeout = setTimeout(function() {
      obj.hide_timeout = undefined;
      obj.pending_hover_key = '';
      obj._hideTooltip();
    }, this.hide_delay);
  }

  /**
   * Cancels delayed tooltip hide.
   */
  _cancelHide() {
    if(this.hide_timeout) {
      clearTimeout(this.hide_timeout);
      this.hide_timeout = undefined;
    }
  }

  /**
   * Gets identifier info under mouse cursor.
   * @param {MouseEvent} event - Mouse event.
   * @returns {(object|false)} Hover info.
   */
  _getHoverIdentifier(event) {
    if(!this.cm) return false;
    var pos = this.cm.coordsChar({ left: event.clientX, top: event.clientY }, 'window');
    if(!pos || !isFinite(pos.line)) {
      return false;
    }
    var token = this.cm.getTokenAt(pos);
    if(token && typeof token.type === 'string') {
      if(token.type.indexOf('comment') >= 0 || token.type.indexOf('string') >= 0) {
        return false;
      }
    }
    var line = this.cm.getLine(pos.line);
    if(typeof line !== 'string' || !line.length) {
      return false;
    }
    return this._extractIdentifierFromLine(line, pos.line, pos.ch);
  }

  /**
   * Extracts identifier and parent identifier from a line/char position.
   * @param {string} line - Source line.
   * @param {number} line_no - Line number.
   * @param {number} ch - Character position.
   * @returns {(object|false)} Identifier data.
   */
  _extractIdentifierFromLine(line, line_no, ch) {
    var is_ident_char = function(c) {
      return /[A-Za-z0-9_$]/.test(c);
    };
    var is_ident_start = function(c) {
      return /[A-Za-z_$]/.test(c);
    };

    if(ch >= line.length) {
      ch = line.length - 1;
    }
    if(ch < 0) {
      return false;
    }

    if(!is_ident_char(line[ch]) && ch > 0 && is_ident_char(line[ch - 1])) {
      ch = ch - 1;
    }
    if(!is_ident_char(line[ch])) {
      return false;
    }

    var start = ch;
    while(start > 0 && is_ident_char(line[start - 1])) {
      start -= 1;
    }

    var end = ch + 1;
    while(end < line.length && is_ident_char(line[end])) {
      end += 1;
    }

    var identifier = line.slice(start, end);
    if(!identifier.length || !is_ident_start(identifier[0])) {
      return false;
    }

    var parent = '';
    var dot_index = start - 1;
    while(dot_index >= 0 && /\s/.test(line[dot_index])) {
      dot_index -= 1;
    }
    if(dot_index >= 0 && line[dot_index] === '.') {
      var parent_end = dot_index - 1;
      while(parent_end >= 0 && /\s/.test(line[parent_end])) {
        parent_end -= 1;
      }
      if(parent_end >= 0 && is_ident_char(line[parent_end])) {
        var parent_start = parent_end;
        while(parent_start > 0 && is_ident_char(line[parent_start - 1])) {
          parent_start -= 1;
        }
        var parent_candidate = line.slice(parent_start, parent_end + 1);
        if(parent_candidate.length && is_ident_start(parent_candidate[0])) {
          parent = parent_candidate;
        }
      }
    }

    return {
      line: line_no,
      ch: ch,
      start: start,
      end: end,
      identifier: identifier,
      parent: parent
    };
  }

  /**
   * Finds matching documentation entries for identifier.
   * @param {string} identifier - Identifier.
   * @param {string} parent - Parent identifier.
   * @returns {Array<object>} Matching entries.
   */
  _findEntries(identifier, parent) {
    if(!identifier || !PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name) {
      return [];
    }

    var entries = PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name[identifier] || [];
    if(!entries.length) {
      entries = PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name_lower[identifier.toLowerCase()] || [];
    }
    if(!entries.length) {
      return [];
    }

    var sorted = entries.slice();
    var parent_lower = (parent || '').toLowerCase();
    sorted.sort(function(a, b) {
      var a_score = 0;
      var b_score = 0;
      if(parent_lower.length) {
        if(a.category.toLowerCase() === parent_lower) a_score += 2;
        if(b.category.toLowerCase() === parent_lower) b_score += 2;
      }
      if(a.kind === 'function') a_score += 1;
      if(b.kind === 'function') b_score += 1;
      if(a_score !== b_score) return b_score - a_score;
      return a.category.localeCompare(b.category);
    });

    return sorted.slice(0, this.max_entries);
  }

  /**
   * Shows tooltip with entries.
   * @param {string} identifier - Hovered identifier.
   * @param {Array<object>} entries - Matched entries.
   * @param {number} x - Mouse x.
   * @param {number} y - Mouse y.
   */
  _showTooltip(identifier, entries, x, y) {
    this._hideTooltip();

    var tooltip = document.createElement('div');
    tooltip.className = 'jslab-doc-hover-tooltip';

    var header = document.createElement('div');
    header.className = 'jslab-doc-hover-header';
    header.textContent = identifier;
    tooltip.appendChild(header);

    for(var i = 0; i < entries.length; i++) {
      var item = entries[i];
      var entry = document.createElement('div');
      entry.className = 'jslab-doc-hover-entry';

      var title = document.createElement('div');
      title.className = 'jslab-doc-hover-title';
      title.textContent = this._entryTitle(item);
      entry.appendChild(title);

      var meta = document.createElement('div');
      meta.className = 'jslab-doc-hover-meta';
      meta.textContent = item.scope + ' / ' + item.category;
      entry.appendChild(meta);

      if(item.description && item.description.length) {
        var desc = document.createElement('div');
        desc.className = 'jslab-doc-hover-desc';
        desc.textContent = item.description;
        entry.appendChild(desc);
      }

      var params_block = this._buildParamsBlock(item);
      if(params_block) {
        entry.appendChild(params_block);
      }

      var returns_block = this._buildReturnsBlock(item);
      if(returns_block) {
        entry.appendChild(returns_block);
      }

      var action_bar = document.createElement('div');
      action_bar.className = 'jslab-doc-hover-actions';

      var print_button = document.createElement('button');
      print_button.className = 'jslab-doc-hover-btn';
      print_button.type = 'button';
      print_button.tabIndex = -1;
      print_button.textContent = 'See More';
      var obj = this;
      var on_print = function(item_ref) {
        return function(e) {
          e.preventDefault();
          e.stopPropagation();
          obj.on_print_doc(item_ref);
          obj.pending_hover_key = '';
          obj._clearPending();
          obj._hideTooltip();
        };
      }(item);
      print_button.addEventListener('mousedown', on_print);
      print_button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
      });
      action_bar.appendChild(print_button);
      entry.appendChild(action_bar);

      tooltip.appendChild(entry);
    }

    document.body.appendChild(tooltip);
    var obj = this;
    tooltip.addEventListener('mouseenter', function() {
      obj._cancelHide();
    });
    tooltip.addEventListener('mouseleave', function(e) {
      if(obj.wrapper && e.relatedTarget && obj.wrapper.contains(e.relatedTarget)) {
        return;
      }
      obj.pending_hover_key = '';
      obj._clearPending();
      obj._scheduleHide();
    });
    this.tooltip = tooltip;
    this._positionTooltip(x, y);
  }

  /**
   * Hides and removes tooltip if visible.
   */
  _hideTooltip() {
    this._cancelHide();
    this.active_hover_key = '';
    if(this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    this.tooltip = undefined;
  }

  /**
   * Positions tooltip near mouse cursor.
   * @param {number} x - Mouse x.
   * @param {number} y - Mouse y.
   */
  _positionTooltip(x, y) {
    if(!this.tooltip) return;
    var pad = 14;
    var left = x + pad;
    var top = y + pad;
    this.tooltip.style.left = left + 'px';
    this.tooltip.style.top = top + 'px';

    var rect = this.tooltip.getBoundingClientRect();
    if(rect.right > window.innerWidth - 8) {
      left = Math.max(8, x - rect.width - pad);
    }
    if(rect.bottom > window.innerHeight - 8) {
      top = Math.max(8, y - rect.height - pad);
    }
    this.tooltip.style.left = left + 'px';
    this.tooltip.style.top = top + 'px';
  }

  /**
   * Builds display title for one docs entry.
   * @param {object} entry - Docs entry.
   * @returns {string} Title line.
   */
  _entryTitle(entry) {
    var title = entry.name;
    if(entry.kind === 'function') {
      title += this._signature(entry);
    }
    title += ' (' + entry.kind + ')';
    return title;
  }

  /**
   * Builds params section for one docs entry.
   * @param {object} entry - Docs entry.
   * @returns {(HTMLElement|false)} Params block.
   */
  _buildParamsBlock(entry) {
    if(!Array.isArray(entry.params) || !entry.params.length) {
      return false;
    }
    var section = document.createElement('div');
    section.className = 'jslab-doc-hover-section';

    var title = document.createElement('div');
    title.className = 'jslab-doc-hover-section-title';
    title.textContent = 'Parameters';
    section.appendChild(title);

    entry.params.forEach(function(param) {
      var line = document.createElement('div');
      line.className = 'jslab-doc-hover-line';

      var name = (param && typeof param.name === 'string' && param.name.length)
        ? param.name
        : 'arg';
      var types = PRDC_JSLAB_CODE_DOC_HOVER._formatType(param ? param.type : undefined);
      var optional = (param && param.optional) ? ' optional' : '';
      var default_value = '';
      if(param && param.hasOwnProperty('defaultvalue')) {
        default_value = ' default=' + String(param.defaultvalue);
      }
      var head = '- ' + name;
      if(types.length) {
        head += ' : ' + types;
      }
      if(optional.length || default_value.length) {
        head += ' (' + (optional + default_value).trim() + ')';
      }
      var desc = (param && typeof param.description === 'string') ? param.description : '';
      if(desc.length) {
        head += ' - ' + desc;
      }
      line.textContent = head;
      section.appendChild(line);
    });

    return section;
  }

  /**
   * Builds returns section for one docs entry.
   * @param {object} entry - Docs entry.
   * @returns {(HTMLElement|false)} Returns block.
   */
  _buildReturnsBlock(entry) {
    if(!Array.isArray(entry.returns) || !entry.returns.length) {
      return false;
    }
    var section = document.createElement('div');
    section.className = 'jslab-doc-hover-section';

    var title = document.createElement('div');
    title.className = 'jslab-doc-hover-section-title';
    title.textContent = 'Returns';
    section.appendChild(title);

    entry.returns.forEach(function(ret) {
      var line = document.createElement('div');
      line.className = 'jslab-doc-hover-line';
      var types = PRDC_JSLAB_CODE_DOC_HOVER._formatType(ret ? ret.type : undefined);
      var text = '- ';
      if(types.length) {
        text += types;
      } else {
        text += 'unknown';
      }
      var desc = (ret && typeof ret.description === 'string') ? ret.description : '';
      if(desc.length) {
        text += ' - ' + desc;
      }
      line.textContent = text;
      section.appendChild(line);
    });

    return section;
  }

  /**
   * Builds function signature from params.
   * @param {object} entry - Docs entry.
   * @returns {string} Signature string.
   */
  _signature(entry) {
    if(!Array.isArray(entry.params) || !entry.params.length) {
      return '()';
    }
    var params = entry.params.map(function(param) {
      var name = param && typeof param.name === 'string' ? param.name : 'arg';
      if(param && param.optional) {
        return '[' + name + ']';
      }
      return name;
    });
    return '(' + params.join(', ') + ')';
  }

  /**
   * Formats a JSDoc type object to printable string.
   * @param {object} type_obj - JSDoc type object.
   * @returns {string} Formatted type.
   */
  static _formatType(type_obj) {
    if(!type_obj || !Array.isArray(type_obj.names) || !type_obj.names.length) {
      return '';
    }
    return type_obj.names.join(' | ');
  }

  /**
   * Ensures static docs index is loaded.
   */
  _ensureIndex() {
    if(PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name) {
      return;
    }
    PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name = Object.create(null);
    PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name_lower = Object.create(null);

    var docs_path;
    if(typeof app_path !== 'undefined') {
      docs_path = path.join(app_path, 'docs', 'documentation.json');
    } else {
      docs_path = path.join(process.cwd(), 'docs', 'documentation.json');
    }

    if(!fs.existsSync(docs_path)) {
      return;
    }

    var docs;
    try {
      docs = JSON.parse(fs.readFileSync(docs_path, 'utf8'));
    } catch(err) {
      return;
    }

    Object.keys(docs).forEach(function(scope) {
      var scope_obj = docs[scope];
      if(!scope_obj || typeof scope_obj !== 'object') {
        return;
      }
      Object.keys(scope_obj).forEach(function(category) {
        var category_obj = scope_obj[category];
        if(!category_obj || typeof category_obj !== 'object') {
          return;
        }
        Object.keys(category_obj).forEach(function(key) {
          var item = category_obj[key];
          if(!item || typeof item !== 'object') {
            return;
          }
          var name = (typeof item.name === 'string' && item.name.length) ? item.name : key;
          if(!name || typeof name !== 'string') {
            return;
          }
          var entry = {
            name: name,
            kind: item.kind || 'member',
            description: item.description || '',
            params: Array.isArray(item.params) ? item.params : [],
            returns: Array.isArray(item.returns) ? item.returns : [],
            category: category,
            scope: scope,
            doc_query: scope === 'lib' ? (category + '.' + name) : name,
            key: key
          };
          PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name[name] =
            PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name[name] || [];
          PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name[name].push(entry);

          var lower = name.toLowerCase();
          PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name_lower[lower] =
            PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name_lower[lower] || [];
          PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name_lower[lower].push(entry);
        });
      });
    });
  }

  /**
   * Ensures tooltip styles are injected once.
   */
  _ensureStyle() {
    if(document.getElementById('jslab-doc-hover-style')) {
      return;
    }
    var style = document.createElement('style');
    style.id = 'jslab-doc-hover-style';
    style.textContent = `
      .jslab-doc-hover-tooltip {
        position: fixed;
        z-index: 30000;
        pointer-events: auto;
        max-width: 420px;
        min-width: 220px;
        color: #222;
        background: #fff;
        border: 1px solid #bbb;
        border-radius: 6px;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.22);
        font-size: 12px;
        line-height: 1.35;
        overflow: hidden;
      }
      .jslab-doc-hover-header {
        padding: 6px 10px;
        font-weight: 700;
        border-bottom: 1px solid #e7e7e7;
        background: #f8f8f8;
      }
      .jslab-doc-hover-entry {
        padding: 7px 10px;
        border-top: 1px solid #f0f0f0;
      }
      .jslab-doc-hover-entry:first-of-type {
        border-top: 0;
      }
      .jslab-doc-hover-title {
        font-weight: 600;
        color: #1f2d3d;
        margin-bottom: 2px;
      }
      .jslab-doc-hover-meta {
        color: #666;
        margin-bottom: 3px;
      }
      .jslab-doc-hover-desc {
        color: #333;
        white-space: normal;
      }
      .jslab-doc-hover-section {
        margin-top: 6px;
      }
      .jslab-doc-hover-section-title {
        font-weight: 600;
        color: #2f4f6f;
        margin-bottom: 2px;
      }
      .jslab-doc-hover-line {
        color: #303030;
        white-space: normal;
        margin-bottom: 1px;
      }
      .jslab-doc-hover-actions {
        margin-top: 6px;
      }
      .jslab-doc-hover-btn {
        pointer-events: auto;
        background: #2e85c7;
        color: #fff;
        border: 1px solid #2e85c7;
        border-radius: 3px;
        padding: 4px 10px;
        font-size: 12px;
        cursor: pointer;
      }
      .jslab-doc-hover-btn:hover {
        background: #ffffff;
        color: #2e85c7;
      }
    `;
    document.head.appendChild(style);
  }
}

exports.PRDC_JSLAB_CODE_DOC_HOVER = PRDC_JSLAB_CODE_DOC_HOVER;
