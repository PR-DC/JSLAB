/**
 * @file Browser presentation editor frame for in-page JSLAB windows
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var { createCodeMirrorLintOptions } = require('../eslint');
var { PRDC_JSLAB_CODE_DOC_HOVER } = require('../../code/doc-hover');

function getBridge() {
  if(typeof globalThis.__JSLAB_WEB_getBridge == 'function') {
    return globalThis.__JSLAB_WEB_getBridge();
  }
  return null;
}

function currentString(id, fallback) {
  var bridge = getBridge();
  var text = bridge && typeof bridge.currentString == 'function'
    ? bridge.currentString(id)
    : '';
  if(typeof text == 'string' && text.length) {
    return text;
  }
  return fallback || '';
}

function normalizePath(file_path) {
  var value = String(file_path || '').replace(/\\/g, '/').trim();
  if(!value.length) {
    return '';
  }
  if(!value.startsWith('/workspace/')) {
    value = '/workspace/' + value.replace(/^\/+/, '');
  }
  return value.replace(/\/+/g, '/').replace(/\/$/, '');
}

function getBaseName(file_path) {
  var normalized = normalizePath(file_path);
  if(!normalized.length) {
    return '';
  }
  var parts = normalized.split('/');
  return parts[parts.length - 1] || '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  var text = String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ');
  var tmp = document.createElement('div');
  tmp.innerHTML = text;
  return (tmp.textContent || tmp.innerText || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLocalReference(url_text) {
  var value = String(url_text || '').trim();
  if(!value.length || value.startsWith('#')) {
    return false;
  }
  if(/^(?:[a-z]+:)?\/\//i.test(value)) {
    return false;
  }
  if(value.startsWith('data:') || value.startsWith('blob:') ||
      value.startsWith('javascript:') || value.startsWith('mailto:')) {
    return false;
  }
  return true;
}

function dirname(virtual_path) {
  var normalized = normalizePath(virtual_path);
  var idx = normalized.lastIndexOf('/');
  if(idx <= 0) {
    return '/workspace';
  }
  return normalized.slice(0, idx);
}

function joinPath(base_path, relative_path) {
  var rel = String(relative_path || '').replace(/\\/g, '/').trim();
  var base = normalizePath(base_path || '/workspace');
  var parts;
  if(!rel.length) {
    return base;
  }
  if(rel.startsWith('/workspace/')) {
    return normalizePath(rel);
  }
  if(rel.startsWith('/')) {
    return normalizePath('/workspace' + rel);
  }
  parts = base.split('/');
  rel.split('/').forEach(function(part) {
    if(!part.length || part == '.') {
      return;
    }
    if(part == '..') {
      if(parts.length > 2) {
        parts.pop();
      }
      return;
    }
    parts.push(part);
  });
  return normalizePath(parts.join('/'));
}

function getExtension(file_path) {
  var name = getBaseName(file_path);
  var idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

function getMimeType(file_path) {
  var ext = getExtension(file_path);
  if(ext == '.html' || ext == '.htm') return 'text/html;charset=utf-8';
  if(ext == '.css') return 'text/css;charset=utf-8';
  if(ext == '.js') return 'text/javascript;charset=utf-8';
  if(ext == '.json') return 'application/json;charset=utf-8';
  if(ext == '.svg') return 'image/svg+xml';
  if(ext == '.png') return 'image/png';
  if(ext == '.jpg' || ext == '.jpeg') return 'image/jpeg';
  if(ext == '.webp') return 'image/webp';
  if(ext == '.gif') return 'image/gif';
  if(ext == '.pdf') return 'application/pdf';
  if(ext == '.woff') return 'font/woff';
  if(ext == '.woff2') return 'font/woff2';
  if(ext == '.ttf') return 'font/ttf';
  return 'application/octet-stream';
}

function collectSlides(source) {
  var slides = [];
  var regex = /<\s*slide\b[^>]*>([\s\S]*?)<\/\s*slide\s*>/gi;
  var match;
  while((match = regex.exec(String(source || '')))) {
    slides.push({
      index: slides.length,
      start: match.index,
      end: regex.lastIndex,
      full: match[0],
      inner: match[1] || ''
    });
  }
  return slides;
}

function buildBlankSlideHtml() {
  return [
    '<slide>',
    '  <h1>New Slide</h1>',
    '</slide>'
  ].join('\n');
}

function getSlideSummary(slide_html, index) {
  var tmp = document.createElement('div');
  var heading;
  var text;
  tmp.innerHTML = String(slide_html || '');
  heading = tmp.querySelector('h1,h2,h3,h4,h5,h6');
  if(heading && heading.textContent && heading.textContent.trim().length) {
    return heading.textContent.trim();
  }
  text = stripHtml(slide_html);
  if(text.length) {
    return text.length > 80 ? text.slice(0, 77) + '...' : text;
  }
  return currentString(242, 'Slide') + ' ' + String(index + 1);
}

class PRDC_JSLAB_WEB_PRESENTATION_EDITOR_CODE_TAB {

  constructor(editor, key, label) {
    var obj = this;
    this.editor = editor;
    this.key = key;
    this.label = label;
    this.file_path = '';
    this.saved_code = '';
    this.tab = this.editor.tabs.addTab({
      title: label,
      favicon: false
    });
    this.tab.tab_obj = this;
    this.code_editor = CodeMirror(document.getElementById('code'), {
      theme: 'notepadpp',
      rulers: [{ color: '#aff', column: 75, lineStyle: 'solid' }],
      indentUnit: 2,
      tabSize: 2,
      lineNumbers: true,
      lineWrapping: true,
      styleActiveLine: true,
      matchBrackets: true,
      gutter: true,
      gutters: [
        'CodeMirror-linenumbers',
        'CodeMirror-foldgutter',
        'CodeMirror-lint-markers'
      ],
      foldGutter: true,
      searchDialog: true,
      highlightSelectionMatches: { annotateScrollbar: true }
    });

    CodeMirror.keyMap.default['Shift-Tab'] = 'indentLess';
    CodeMirror.keyMap.default['Tab'] = 'indentMore';
    CodeMirror.keyMap.default['Ctrl-F'] = 'showSearchDialog';
    CodeMirror.keyMap.default['Ctrl-G'] = 'findNext';
    CodeMirror.keyMap.default['Shift-Ctrl-G'] = 'findPrev';
    CodeMirror.keyMap.default['Shift-Ctrl-F'] = 'replace';
    CodeMirror.keyMap.default['Shift-Ctrl-R'] = 'replaceAll';
    CodeMirror.keyMap.default['Ctrl-/'] = 'toggleComment';

    this.code_editor.on('keypress', function(cm, event) {
      if(!cm.state.completionActive &&
          !event.ctrlKey &&
          event.key != 'Enter' &&
          event.key != ';' &&
          event.key != ' ' &&
          event.key != '{' &&
          event.key != '}') {
        if(typeof CodeMirror.commands.autocomplete == 'function') {
          CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
        }
      }
    });

    this.code_editor.on('change', function() {
      obj.codeChanged();
    });

    this.code_doc_hover = new PRDC_JSLAB_CODE_DOC_HOVER({
      on_print_doc: function(entry) {
        var bridge = getBridge();
        var query = entry && entry.doc_query ? entry.doc_query : '';
        if(query.length && bridge && typeof bridge.showDocumentation == 'function') {
          bridge.showDocumentation(query);
        }
      }
    });

    if(this.key == 'html') {
      this.code_editor.setOption('mode', 'htmlmixed');
      this.code_editor.setOption('lint', {});
    } else if(this.key == 'css') {
      this.code_editor.setOption('mode', 'css');
      this.code_editor.setOption('lint', {});
    } else {
      this.code_editor.setOption('mode', 'javascript');
      this.code_editor.setOption('lint', createCodeMirrorLintOptions(CodeMirror));
      this.code_doc_hover.attach(this.code_editor);
    }
  }

  setPath(file_path, code) {
    this.file_path = normalizePath(file_path);
    this.saved_code = String(code || '');
    this.code_editor.setValue(this.saved_code);
    this.code_editor.clearHistory();
    this.tab.classList.remove('changed');
  }

  getValue() {
    return this.code_editor.getValue();
  }

  setSlide(index) {
    var source;
    var slides;
    var slide;
    var offset;
    var pos;
    if(this.key != 'html') {
      return;
    }
    source = this.getValue();
    slides = collectSlides(source);
    index = Number(index);
    if(!Number.isFinite(index) || index < 0 || index >= slides.length) {
      return;
    }
    slide = slides[index];
    offset = source.indexOf('>', slide.start);
    if(offset < 0 || offset >= slide.end) {
      offset = slide.start;
    } else {
      offset += 1;
    }
    pos = this.code_editor.posFromIndex(offset);
    this.code_editor.setCursor(pos);
    this.code_editor.scrollIntoView({ line: pos.line, ch: pos.ch }, 80);
  }

  save() {
    var code = this.getValue();
    this.editor.bridge.writeWorkspaceTextSync(this.file_path, code);
    this.saved_code = code;
    this.tab.classList.remove('changed');
  }

  isDirty() {
    return this.getValue().replace(/\r/g, '') != this.saved_code.replace(/\r/g, '');
  }

  codeChanged() {
    this.tab.classList.add('changed');
    this.editor.onTabCodeChanged(this);
  }

  show() {
    document.querySelectorAll('#code .CodeMirror').forEach(function(el) {
      el.style.display = 'none';
    });
    this.editor.tabs.setCurrentTab(this.tab);
    this.code_editor.getWrapperElement().style.display = 'block';
    this.code_editor.refresh();
    this.code_editor.focus();
  }
}

class PRDC_JSLAB_WEB_PRESENTATION_EDITOR {

  constructor() {
    var obj = this;
    this.bridge = getBridge();
    this.root_path = '';
    this.current_slide = 0;
    this.slide_entries = [];
    this.resource_urls = {};
    this.close_requested = false;
    this.force_close = false;
    this.preview_timer = undefined;

    this.preview = document.getElementById('preview');
    this.slide_thumbnails = document.getElementById('slide-thumbnails');
    this.presentation_title = document.getElementById('presentation-title');
    this.set_slide = document.getElementById('set-slide');
    this.total_slides = document.getElementById('total-slides');
    this.close_dialog_cont = document.getElementById('close-dialog-cont');
    this.close_file = document.getElementById('close-file');
    this.tab_save = document.getElementById('tab-save');
    this.thumb_render_token = 0;
    this.drag_slide_index = undefined;
    this.drop_slide_index = undefined;
    this.drop_slide_after = false;
    this.slide_context_index = undefined;
    this.slide_context_menu = this._createSlideContextMenu();

    this.tabs_cont = document.querySelector('.tabs');
    this.tabs = new PRDC_TABS();
    this.tabs.init(this.tabs_cont);
    this.tabs_cont.addEventListener('activeTabChange', function(event) {
      obj.active_tab = event.detail.tabEl;
      if(obj.active_tab && obj.active_tab.tab_obj) {
        obj.active_tab.tab_obj.show();
      }
    });

    this.html_editor = new PRDC_JSLAB_WEB_PRESENTATION_EDITOR_CODE_TAB(this, 'html', 'html');
    this.js_editor = new PRDC_JSLAB_WEB_PRESENTATION_EDITOR_CODE_TAB(this, 'js', 'js');
    this.css_editor = new PRDC_JSLAB_WEB_PRESENTATION_EDITOR_CODE_TAB(this, 'css', 'css');
    this.html_editor.show();

    document.getElementById('first-slide').addEventListener('click', function() {
      obj.setSlide(0);
    });
    document.getElementById('prev-slide').addEventListener('click', function() {
      obj.setSlide(obj.current_slide - 1);
    });
    document.getElementById('next-slide').addEventListener('click', function() {
      obj.setSlide(obj.current_slide + 1);
    });
    document.getElementById('last-slide').addEventListener('click', function() {
      obj.setSlide(obj.slide_entries.length - 1);
    });
    this.set_slide.addEventListener('change', function() {
      obj.setSlide(Number(obj.set_slide.value) - 1);
    });
    this.tab_save.addEventListener('click', function() {
      obj.saveCode();
    });
    document.getElementById('close-dialog-save').addEventListener('click', function() {
      obj._resolveCloseDialog('save');
    });
    document.getElementById('close-dialog-discard').addEventListener('click', function() {
      obj._resolveCloseDialog('discard');
    });
    document.getElementById('close-dialog-cancel').addEventListener('click', function() {
      obj._resolveCloseDialog('cancel');
    });

    this.slide_thumbnails.addEventListener('contextmenu', function(event) {
      var item = event.target.closest('.slide-thumb');
      if(!item) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      obj._openSlideContextMenu(Number(item.dataset.index), event.clientX, event.clientY);
    });
    this.slide_thumbnails.addEventListener('dragover', function(event) {
      obj._handleThumbnailDragOver(event);
    });
    this.slide_thumbnails.addEventListener('drop', function(event) {
      obj._handleThumbnailDrop(event);
    });
    this.slide_thumbnails.addEventListener('dragend', function() {
      obj._clearThumbnailDropIndicator();
      obj.drag_slide_index = undefined;
    });

    document.addEventListener('keydown', function(event) {
      if(event.ctrlKey && !event.shiftKey && event.key.toLowerCase() == 's') {
        event.preventDefault();
        obj.saveCode();
        return;
      }
      if(event.key == 'Escape' && obj.close_requested) {
        obj._resolveCloseDialog('cancel');
      } else if(event.key == 'Escape') {
        obj._hideSlideContextMenu();
      }
    });
    document.addEventListener('click', function(event) {
      if(obj.slide_context_menu &&
          obj.slide_context_menu.style.display != 'none' &&
          !obj.slide_context_menu.contains(event.target)) {
        obj._hideSlideContextMenu();
      }
    });

    globalThis.presentation_editor = this;
    globalThis.__JSLAB_WEB_PRESENTATION_EDITOR__ = this;
    globalThis.__JSLAB_WEB_BEFORE_CLOSE__ = function() {
      return obj.beforeClose();
    };
  }

  setPath(root_path) {
    var normalized = normalizePath(root_path);
    var title = getBaseName(normalized) || 'Presentation';
    this.root_path = normalized;
    this.presentation_title.textContent = title;
    if(typeof globalThis.__JSLAB_WEB_setFrameTitle == 'function') {
      globalThis.__JSLAB_WEB_setFrameTitle(title + ' - ' + currentString(516, 'Presentation editor'));
    }

    this.html_editor.setPath(joinPath(this.root_path, 'index.html'),
      this.bridge.readWorkspaceTextSync(joinPath(this.root_path, 'index.html')));
    this.js_editor.setPath(joinPath(this.root_path, 'main.js'),
      this.bridge.readWorkspaceTextSync(joinPath(this.root_path, 'main.js')));
    this.css_editor.setPath(joinPath(this.root_path, 'main.css'),
      this.bridge.readWorkspaceTextSync(joinPath(this.root_path, 'main.css')));

    this.refreshSlides();
    this.schedulePreviewRefresh();
  }

  onTabCodeChanged(tab) {
    if(tab && tab.key == 'html') {
      this.refreshSlides();
    }
    this.schedulePreviewRefresh();
  }

  _createSlideContextMenu() {
    var obj = this;
    var menu = document.createElement('div');
    var actions = [
      { action: 'go-to-code', label: currentString(321, 'Go To Code') },
      { action: 'insert-after', label: currentString(537, 'Insert Slide After') },
      { action: 'duplicate', label: currentString(538, 'Duplicate Slide') },
      { action: 'move-up', label: 'Move Slide Up' },
      { action: 'move-down', label: 'Move Slide Down' },
      { action: 'delete', label: 'Delete Slide' }
    ];
    menu.className = 'presentation-slide-menu app-context-menu';
    menu.style.display = 'none';
    actions.forEach(function(item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = item.action;
      button.textContent = item.label;
      button.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        obj._handleSlideContextAction(item.action);
      });
      menu.appendChild(button);
    });
    document.body.appendChild(menu);
    return menu;
  }

  _openSlideContextMenu(index, left, top) {
    var rect;
    var x = left;
    var y = top;
    var margin = 4;
    if(!this.slide_context_menu) {
      return;
    }
    this.slide_context_index = index;
    this.slide_context_menu.style.display = 'block';
    this.slide_context_menu.style.left = '0px';
    this.slide_context_menu.style.top = '0px';
    rect = this.slide_context_menu.getBoundingClientRect();
    if((x + rect.width) > globalThis.innerWidth - margin) {
      x = Math.max(margin, globalThis.innerWidth - rect.width - margin);
    }
    if((y + rect.height) > globalThis.innerHeight - margin) {
      y = Math.max(margin, globalThis.innerHeight - rect.height - margin);
    }
    this.slide_context_menu.style.left = x + 'px';
    this.slide_context_menu.style.top = y + 'px';
  }

  _hideSlideContextMenu() {
    if(this.slide_context_menu) {
      this.slide_context_menu.style.display = 'none';
    }
    this.slide_context_index = undefined;
  }

  _handleSlideContextAction(action) {
    var index = this.slide_context_index;
    this._hideSlideContextMenu();
    if(typeof index != 'number') {
      return;
    }
    if(action == 'go-to-code') {
      this.html_editor.show();
      this.html_editor.setSlide(index);
    } else if(action == 'insert-after') {
      this.insertSlideAfter(index);
    } else if(action == 'duplicate') {
      this.duplicateSlide(index);
    } else if(action == 'move-up') {
      this.moveSlide(index, index - 1);
    } else if(action == 'move-down') {
      this.moveSlide(index, index + 1);
    } else if(action == 'delete') {
      this.deleteSlide(index);
    }
  }

  getCurrentCode(key) {
    if(key == 'html') return this.html_editor.getValue();
    if(key == 'js') return this.js_editor.getValue();
    if(key == 'css') return this.css_editor.getValue();
    return '';
  }

  hasUnsavedChanges() {
    return this.html_editor.isDirty() || this.js_editor.isDirty() || this.css_editor.isDirty();
  }

  beforeClose() {
    if(this.force_close || !this.hasUnsavedChanges()) {
      return true;
    }
    this.close_requested = true;
    this.close_file.textContent = this.presentation_title.textContent || getBaseName(this.root_path);
    this.close_dialog_cont.style.display = 'block';
    return false;
  }

  async _resolveCloseDialog(action) {
    this.close_requested = false;
    this.close_dialog_cont.style.display = 'none';
    if(action == 'cancel') {
      return;
    }
    if(action == 'save') {
      this.saveCode();
    }
    this.force_close = true;
    if(this.bridge && typeof this.bridge.closeFrameWindow == 'function') {
      this.bridge.closeFrameWindow(globalThis);
    }
  }

  saveCode() {
    this.html_editor.save();
    this.js_editor.save();
    this.css_editor.save();
    if(this.bridge && typeof this.bridge.refreshWorkspaceList == 'function') {
      Promise.resolve(this.bridge.refreshWorkspaceList()).catch(function(err) {
        console.error(err);
      });
    }
    this.refreshSlides();
    this.schedulePreviewRefresh();
  }

  refreshSlides() {
    var obj = this;
    var render_token;
    if(this.root_path.length) {
      this._buildResourceUrlMap();
    }
    this.slide_entries = collectSlides(this.getCurrentCode('html'));
    if(this.current_slide >= this.slide_entries.length) {
      this.current_slide = Math.max(0, this.slide_entries.length - 1);
    }
    this.total_slides.textContent = '/ ' + String(this.slide_entries.length);
    this.set_slide.value = this.slide_entries.length ? String(this.current_slide + 1) : '0';
    this.slide_thumbnails.innerHTML = '';
    render_token = ++this.thumb_render_token;
    this.slide_entries.forEach(function(entry) {
      var thumb = document.createElement('div');
      var preview = document.createElement('div');
      var preview_frame = document.createElement('iframe');
      var number = document.createElement('div');
      thumb.className = 'slide-thumb' + (entry.index == obj.current_slide ? ' active' : '');
      thumb.draggable = true;
      thumb.dataset.index = String(entry.index);
      preview.className = 'slide-thumb-preview';
      preview_frame.className = 'slide-thumb-frame';
      preview_frame.loading = 'lazy';
      preview_frame.tabIndex = -1;
      number.className = 'slide-thumb-number';
      number.textContent = String(entry.index + 1);
      preview.appendChild(preview_frame);
      thumb.appendChild(preview);
      thumb.appendChild(number);
      thumb.addEventListener('click', function() {
        obj.setSlide(entry.index);
      });
      thumb.addEventListener('dragstart', function(event) {
        obj.drag_slide_index = entry.index;
        thumb.classList.add('dragging');
        if(event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', String(entry.index));
        }
      });
      thumb.addEventListener('dragend', function() {
        thumb.classList.remove('dragging');
      });
      obj.slide_thumbnails.appendChild(thumb);
      obj._renderSlideThumbnail(thumb, entry.index, render_token);
    });
  }

  setSlide(index) {
    if(!this.slide_entries.length) {
      this.current_slide = 0;
      this.set_slide.value = '0';
      return;
    }
    this.current_slide = Math.max(0, Math.min(this.slide_entries.length - 1, Number(index) || 0));
    this.set_slide.value = String(this.current_slide + 1);
    this.slide_thumbnails.querySelectorAll('.slide-thumb').forEach(function(node, node_index) {
      node.classList.toggle('active', node_index == index);
    });
    this.schedulePreviewRefresh();
  }

  _renderSlideThumbnail(thumb, slide_index, render_token) {
    var obj = this;
    var preview_frame = thumb.querySelector('.slide-thumb-frame');
    if(!preview_frame) {
      return;
    }
    thumb.classList.add('loading');
    preview_frame.onload = function() {
      if(render_token != obj.thumb_render_token) {
        return;
      }
      thumb.classList.remove('loading');
    };
    preview_frame.srcdoc = this._buildPreviewDocument(slide_index, true);
  }

  _getDropTargetInfo(client_y) {
    var items = [...this.slide_thumbnails.querySelectorAll('.slide-thumb')].filter(function(item) {
      return !item.classList.contains('dragging');
    });
    var fallback_index = this.slide_entries.length - 1;
    var info = {
      index: fallback_index,
      after: true,
      line_y: 0
    };
    var item;
    var rect;
    var midpoint;
    var i;
    if(!items.length) {
      return info;
    }
    for(i = 0; i < items.length; i++) {
      item = items[i];
      rect = item.getBoundingClientRect();
      midpoint = rect.top + rect.height / 2;
      if(client_y < midpoint) {
        info.index = Number(item.dataset.index);
        info.after = false;
        info.line_y = item.offsetTop;
        return info;
      }
      if(client_y <= rect.bottom) {
        info.index = Number(item.dataset.index);
        info.after = true;
        info.line_y = item.offsetTop + item.offsetHeight + 5;
        return info;
      }
    }
    item = items[items.length - 1];
    info.index = Number(item.dataset.index);
    info.after = true;
    info.line_y = item.offsetTop + item.offsetHeight + 5;
    return info;
  }

  _handleThumbnailDragOver(event) {
    var info;
    if(typeof this.drag_slide_index != 'number') {
      return;
    }
    event.preventDefault();
    info = this._getDropTargetInfo(event.clientY);
    this.drop_slide_index = info.index;
    this.drop_slide_after = info.after;
    this.slide_thumbnails.style.setProperty('--slide-thumbnail-drop-y', info.line_y + 'px');
    this.slide_thumbnails.classList.add('drop-active');
  }

  _handleThumbnailDrop(event) {
    var target_index;
    var from_index = this.drag_slide_index;
    if(typeof from_index != 'number') {
      return;
    }
    event.preventDefault();
    if(typeof this.drop_slide_index != 'number') {
      this._clearThumbnailDropIndicator();
      return;
    }
    target_index = this.drop_slide_after ? this.drop_slide_index + 1 : this.drop_slide_index;
    if(target_index > from_index) {
      target_index -= 1;
    }
    this._clearThumbnailDropIndicator();
    this.drag_slide_index = undefined;
    if(target_index == from_index) {
      return;
    }
    this.moveSlide(from_index, target_index);
  }

  _clearThumbnailDropIndicator() {
    this.drop_slide_index = undefined;
    this.drop_slide_after = false;
    this.slide_thumbnails.classList.remove('drop-active');
  }

  schedulePreviewRefresh() {
    var obj = this;
    if(this.preview_timer) {
      clearTimeout(this.preview_timer);
    }
    this.preview_timer = setTimeout(function() {
      obj.preview_timer = undefined;
      obj.refreshPreview();
    }, 120);
  }

  _rebuildHtmlWithSlides(slides) {
    var source = this.getCurrentCode('html');
    var ranges = collectSlides(source);
    if(!ranges.length) {
      return String(source || '') + '\n\n' + slides.join('\n\n');
    }
    return source.slice(0, ranges[0].start) +
      slides.join('\n\n') +
      source.slice(ranges[ranges.length - 1].end);
  }

  _replaceHtmlSlides(next_slides, active_slide) {
    var next_html = this._rebuildHtmlWithSlides(next_slides);
    this.html_editor.code_editor.setValue(next_html);
    this.refreshSlides();
    this.setSlide(active_slide);
  }

  insertSlideAfter(index) {
    var slides = collectSlides(this.getCurrentCode('html')).map(function(entry) {
      return entry.full;
    });
    var insert_at = Math.max(0, Math.min(slides.length, Number(index) + 1));
    slides.splice(insert_at, 0, buildBlankSlideHtml());
    this._replaceHtmlSlides(slides, insert_at);
  }

  duplicateSlide(index) {
    var slides = collectSlides(this.getCurrentCode('html')).map(function(entry) {
      return entry.full;
    });
    var source_index = Math.max(0, Math.min(slides.length - 1, Number(index) || 0));
    if(!slides.length) {
      return;
    }
    slides.splice(source_index + 1, 0, slides[source_index]);
    this._replaceHtmlSlides(slides, source_index + 1);
  }

  deleteSlide(index) {
    var slides = collectSlides(this.getCurrentCode('html')).map(function(entry) {
      return entry.full;
    });
    var source_index = Math.max(0, Math.min(slides.length - 1, Number(index) || 0));
    if(!slides.length) {
      return;
    }
    if(slides.length == 1) {
      slides[0] = buildBlankSlideHtml();
      this._replaceHtmlSlides(slides, 0);
      return;
    }
    slides.splice(source_index, 1);
    this._replaceHtmlSlides(slides, Math.max(0, source_index - 1));
  }

  moveSlide(from_index, to_index) {
    var slides = collectSlides(this.getCurrentCode('html')).map(function(entry) {
      return entry.full;
    });
    var source_index = Math.max(0, Math.min(slides.length - 1, Number(from_index) || 0));
    var target_index = Math.max(0, Math.min(slides.length - 1, Number(to_index) || 0));
    var moved;
    if(!slides.length || source_index == target_index) {
      return;
    }
    moved = slides.splice(source_index, 1)[0];
    slides.splice(target_index, 0, moved);
    this._replaceHtmlSlides(slides, target_index);
  }

  _revokeResourceUrls() {
    Object.keys(this.resource_urls).forEach((key) => {
      try {
        URL.revokeObjectURL(this.resource_urls[key]);
      } catch {}
    });
    this.resource_urls = {};
  }

  _collectWorkspaceFiles(dir_path, out) {
    var obj = this;
    var entries = this.bridge.readWorkspaceDirSync(dir_path, { withFileTypes: true });
    entries.forEach(function(entry) {
      var next_path = joinPath(dir_path, entry.name);
      if(entry.isDirectory()) {
        obj._collectWorkspaceFiles(next_path, out);
      } else {
        out.push(next_path);
      }
    });
  }

  _getAppAssetText(asset_path) {
    if(this.bridge && typeof this.bridge.getAppAssetSync == 'function') {
      return String(this.bridge.getAppAssetSync(asset_path) || '');
    }
    return '';
  }

  _buildPresentationRuntimeSource(config) {
    var js_template = this._getAppAssetText('/js/windows/presentation.js');
    if(!js_template.length) {
      return false;
    }
    return js_template.replace('%presentation_config%', JSON.stringify(config || {}, false, 2));
  }

  _buildPresentationGlobalsSource() {
    var strings = {
      '315': currentString(315, ''),
      '316': currentString(316, ''),
      '317': currentString(317, ''),
      '318': currentString(318, ''),
      '363': currentString(363, ''),
      '542': currentString(542, '')
    };
    return [
      'window._standalone = window.location.protocol == "file:";',
      'window.presentation_resources = {"pdfjs":false,"plotly":false,"mathjax":false,"three":false,"ui":false};',
      'window.__standalone_modules = window.__standalone_modules || {};',
      'window.__presentation_script_promises = window.__presentation_script_promises || {};',
      'window.__getPresentationStandaloneModulePath = function(module_path) {',
      '  if(module_path.endsWith(".module.js")) return module_path.replace(/\\.module\\.js$/, ".standalone.js");',
      '  if(module_path.endsWith(".js")) return module_path.replace(/\\.js$/, ".standalone.js");',
      '  if(module_path.endsWith(".mjs")) return module_path.replace(/\\.mjs$/, ".standalone.mjs");',
      '  return module_path + ".standalone.js";',
      '};',
      'window.__loadPresentationScript = function(script_path) {',
      '  if(typeof script_path != "string" || !/\\.(?:js|mjs)(?:[?#].*)?$/i.test(script_path)) {',
      '    return Promise.reject(new Error("Invalid presentation script path: " + script_path));',
      '  }',
      '  var resolved = new URL(script_path, window.location.href).href;',
      '  if(/\\/index\\.html?(?:[#?].*)?$/i.test(resolved.replace(/\\\\/g, "/"))) {',
      '    return Promise.reject(new Error("Refusing to load presentation page as script: " + resolved));',
      '  }',
      '  if(window.__presentation_script_promises[resolved]) return window.__presentation_script_promises[resolved];',
      '  window.__presentation_script_promises[resolved] = new Promise(function(resolve, reject) {',
      '    var script = document.createElement("script");',
      '    script.type = "text/javascript";',
      '    script.src = resolved;',
      '    script.onload = function() { resolve(true); };',
      '    script.onerror = function() { reject(new Error("Failed to load script: " + resolved)); };',
      '    document.head.appendChild(script);',
      '  });',
      '  return window.__presentation_script_promises[resolved];',
      '};',
      'window.__importPresentationModule = async function(module_path) {',
      '  if(window._standalone) {',
      '    if(Object.prototype.hasOwnProperty.call(window.__standalone_modules, module_path)) return window.__standalone_modules[module_path];',
      '    var standalone_path = window.__getPresentationStandaloneModulePath(module_path);',
      '    await window.__loadPresentationScript(standalone_path);',
      '    return window.__standalone_modules[module_path];',
      '  }',
      '  return import(new URL(module_path, window.location.href).href);',
      '};',
      'window.language = {',
      '  currentString: function(id) {',
      '    var strings = ' + JSON.stringify(strings) + ';',
      '    var key = String(id);',
      '    if(Object.prototype.hasOwnProperty.call(strings, key)) return strings[key];',
      '    return "";',
      '  }',
      '};'
    ].join('\n');
  }

  _buildResourceUrlMap() {
    var files = [];
    var obj = this;
    this._revokeResourceUrls();
    this._collectWorkspaceFiles(this.root_path, files);
    files.forEach(function(file_path) {
      var relative = file_path.slice(obj.root_path.length + 1).replace(/\\/g, '/');
      var bytes = obj.bridge.readWorkspaceBytesSync(file_path);
      if(bytes === false || typeof bytes == 'undefined' || bytes === null) {
        return;
      }
      var blob = new Blob([bytes], { type: getMimeType(file_path) });
      obj.resource_urls[relative] = URL.createObjectURL(blob);
      if(relative.toLowerCase() != relative) {
        obj.resource_urls[relative.toLowerCase()] = obj.resource_urls[relative];
      }
    });
  }

  _resolveResourceUrl(relative_path) {
    var normalized = String(relative_path || '').replace(/\\/g, '/').replace(/^\.?\//, '');
    if(Object.prototype.hasOwnProperty.call(this.resource_urls, normalized)) {
      return this.resource_urls[normalized];
    }
    normalized = normalized.toLowerCase();
    if(Object.prototype.hasOwnProperty.call(this.resource_urls, normalized)) {
      return this.resource_urls[normalized];
    }
    return '';
  }

  _rewriteCssText(css_text, base_dir) {
    var obj = this;
    return String(css_text || '').replace(/url\(([^)]+)\)/g, function(match, raw_url) {
      var value = String(raw_url || '').trim().replace(/^['"]|['"]$/g, '');
      var resolved;
      if(!isLocalReference(value)) {
        return match;
      }
      resolved = obj._resolveResourceUrl(joinPath(base_dir, value).slice(obj.root_path.length + 1));
      if(!resolved.length) {
        return match;
      }
      return 'url("' + resolved + '")';
    });
  }

  _rewriteElementResource(element, attribute, base_dir) {
    var value = element.getAttribute(attribute);
    var resolved;
    if(!value || !isLocalReference(value)) {
      return;
    }
    if(this.presentation_config &&
        this.presentation_config.presentation_mode == 'standalone' &&
        attribute == 'src' &&
        element && element.tagName) {
      var tag_name = String(element.tagName || '').toLowerCase();
      if(tag_name == 'img-pdf' || tag_name == 'plot-json' || tag_name == 'scene-3d-json') {
        return;
      }
    }
    resolved = this._resolveResourceUrl(joinPath(base_dir, value).slice(this.root_path.length + 1));
    if(resolved.length) {
      element.setAttribute(attribute, resolved);
    }
  }

  _buildPreviewDocument(slide_index, thumbnail_mode) {
    var html_text = this.getCurrentCode('html');
    var css_text = this.getCurrentCode('css');
    var presentation_css = '';
    var config_text = '';
    var config = {};
    var parser = new DOMParser();
    var doc;
    var obj = this;
    var target_slide_index = typeof slide_index == 'number' ? slide_index : this.current_slide;
    var current_slide = this.slide_entries[target_slide_index];
    var slide_bootstrap;
    var embedded_loader_override;
    var csp_meta;

    if(!current_slide) {
      return '<!DOCTYPE html><html><body></body></html>';
    }

    try {
      presentation_css = this.bridge.readWorkspaceTextSync(joinPath(this.root_path, 'res/internal/presentation.css'));
    } catch {}
    try {
      config_text = this.bridge.readWorkspaceTextSync(joinPath(this.root_path, 'res/internal/config.json'));
      config = JSON.parse(String(config_text || '{}'));
    } catch {}
    this.presentation_config = config;

    embedded_loader_override = [
      '(function(){',
      '  var standalone_mode = ' + JSON.stringify(config.presentation_mode == 'standalone') + ';',
      '  function normalize(p){ return String(p || "").replace(/\\\\/g,"/").replace(/^\\.\\//,"").replace(/^\\//,""); }',
      '  function resolve(resource){',
      '    if(typeof resource != "string"){ return resource; }',
      '    var text = resource.trim();',
      '    var map;',
      '    if(!text.length || /^(?:[a-z]+:)?\\/\\//i.test(text) || text.startsWith("data:") || text.startsWith("blob:")){ return resource; }',
      '    map = window.__JSLAB_PRESENTATION_RESOURCE_MAP__ || {};',
      '    var key = normalize(text);',
      '    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : resource;',
      '  }',
      '  window._standalone = standalone_mode;',
      '  window.__presentation_script_promises = window.__presentation_script_promises || {};',
      '  window.__loadPresentationScript = function(script_path) {',
      '    if(typeof script_path != "string" || !/\\.(?:js|mjs)(?:[?#].*)?$/i.test(script_path)) {',
      '      return Promise.reject(new Error("Invalid presentation script path: " + script_path));',
      '    }',
      '    var resolved = resolve(script_path);',
      '    if(typeof resolved != "string" || !resolved.length) {',
      '      return Promise.reject(new Error("Failed to resolve presentation script: " + script_path));',
      '    }',
      '    if(window.__presentation_script_promises[resolved]) {',
      '      return window.__presentation_script_promises[resolved];',
      '    }',
      '    window.__presentation_script_promises[resolved] = new Promise(function(resolveScript, rejectScript) {',
      '      var script = document.createElement("script");',
      '      script.type = "text/javascript";',
      '      script.src = resolved;',
      '      script.onload = function() { resolveScript(true); };',
      '      script.onerror = function() { rejectScript(new Error("Failed to load script: " + resolved)); };',
      '      document.head.appendChild(script);',
      '    });',
      '    return window.__presentation_script_promises[resolved];',
      '  };',
      '  window.__importPresentationModule = async function(module_path) {',
      '    if(window._standalone) {',
      '      if(Object.prototype.hasOwnProperty.call(window.__standalone_modules, module_path)) {',
      '        return window.__standalone_modules[module_path];',
      '      }',
      '      var standalone_path = window.__getPresentationStandaloneModulePath(module_path);',
      '      await window.__loadPresentationScript(standalone_path);',
      '      return window.__standalone_modules[module_path];',
      '    }',
      '    var resolved = resolve(module_path);',
      '    if(typeof resolved == "string" && /^blob:/i.test(resolved)) {',
      '      return import(resolved);',
      '    }',
      '    if(typeof resolved == "string" && /^(?:[a-z]+:)?\\/\\//i.test(resolved)) {',
      '      return import(resolved);',
      '    }',
      '    return import(new URL(module_path, window.location.href).href);',
      '  };',
      '})();'
    ].join('\n');

    doc = parser.parseFromString(String(html_text || ''), 'text/html');
    csp_meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if(csp_meta) {
      csp_meta.setAttribute('content',
        String(csp_meta.getAttribute('content') || '').replace(/script-src([^;]*)/i, function(match) {
          return /\bblob:\b/i.test(match) ? match : match + ' blob:';
        }));
    }
    doc.head.querySelectorAll('link[rel="stylesheet"][href]').forEach(function(link) {
      var href = link.getAttribute('href');
      var resolved_path;
      var style;
      var css_value;
      if(!isLocalReference(href)) {
        return;
      }
      resolved_path = joinPath(obj.root_path, href);
      try {
        css_value = obj.bridge.readWorkspaceTextSync(resolved_path);
      } catch {
        css_value = false;
      }
      if(typeof css_value != 'string') {
        obj._rewriteElementResource(link, 'href', obj.root_path);
        return;
      }
      style = doc.createElement('style');
      style.textContent = obj._rewriteCssText(css_value, dirname(resolved_path));
      link.replaceWith(style);
    });

    doc.querySelectorAll('script[src]').forEach(function(script) {
      var src = script.getAttribute('src');
      var resolved_path;
      var js_value;
      var inline_script;
      if(!isLocalReference(src)) {
        return;
      }
      resolved_path = joinPath(obj.root_path, src);
      if(/\/res\/internal\/presentation\.js$/i.test(resolved_path.replace(/\\/g, '/'))) {
        js_value = obj._buildPresentationRuntimeSource(config);
      } else if(/\/res\/internal\/globals\.js$/i.test(resolved_path.replace(/\\/g, '/'))) {
        js_value = obj._buildPresentationGlobalsSource();
      } else {
        try {
          js_value = obj.bridge.readWorkspaceTextSync(resolved_path);
        } catch {
          js_value = false;
        }
      }
      if(typeof js_value != 'string') {
        obj._rewriteElementResource(script, 'src', obj.root_path);
        return;
      }
      if(/\/res\/internal\/globals\.js$/i.test(resolved_path.replace(/\\/g, '/'))) {
        js_value += '\n' + embedded_loader_override;
      }
      inline_script = doc.createElement('script');
      inline_script.textContent = String(js_value || '');
      script.replaceWith(inline_script);
    });

    doc.querySelectorAll('[src]').forEach(function(node) {
      obj._rewriteElementResource(node, 'src', obj.root_path);
    });
    doc.querySelectorAll('[href]').forEach(function(node) {
      if(node.tagName && node.tagName.toLowerCase() == 'a') {
        return;
      }
      obj._rewriteElementResource(node, 'href', obj.root_path);
    });

    doc.querySelectorAll('slide').forEach(function(node, index) {
      if(index == target_slide_index) {
        node.style.display = 'block';
      } else {
        node.style.display = 'none';
      }
    });

    var icon_link = doc.createElement('link');
    icon_link.rel = 'icon';
    icon_link.href = 'data:,';
    doc.head.appendChild(icon_link);

    doc.head.appendChild(doc.createElement('style')).textContent = [
      'html, body {',
      '  width: 100%;',
      '  height: 100%;',
      '  margin: 0;',
      '  padding: 0;',
      '  overflow: hidden;',
      '}'
    ].join('\n');

    slide_bootstrap = doc.createElement('script');
    slide_bootstrap.textContent = [
      '(function(){',
      '  window.__JSLAB_PRESENTATION_RESOURCE_MAP__ = ' + JSON.stringify(this.resource_urls) + ';',
      '  window.__JSLAB_PRESENTATION_EMBEDDED__ = true;',
      '  window.__JSLAB_PRESENTATION_BASE_URL__ = "";',
      '  var original_fetch = typeof window.fetch == "function" ? window.fetch.bind(window) : null;',
      '  function normalize(p){ return String(p || "").replace(/\\\\/g,"/").replace(/^\\.\\//,"").replace(/^\\//,""); }',
      '  function resolve(resource){',
      '    if(typeof resource != "string"){ return resource; }',
      '    var text = resource.trim();',
      '    var map;',
      '    if(!text.length || /^(?:[a-z]+:)?\\/\\//i.test(text) || text.startsWith("data:") || text.startsWith("blob:")){ return resource; }',
      '    map = window.__JSLAB_PRESENTATION_RESOURCE_MAP__ || {};',
      '    var key = normalize(text);',
      '    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : resource;',
      '  }',
      '  if(original_fetch){',
      '    window.fetch = function(resource, init){',
      '      if(typeof resource == "string"){',
      '        return original_fetch(resolve(resource), init);',
      '      }',
      '      if(resource && typeof resource.url == "string"){',
      '        return original_fetch(new Request(resolve(resource.url), resource), init);',
      '      }',
      '      return original_fetch(resource, init);',
      '    };',
      '  }',
      '})();'
    ].join('\n');
    doc.head.insertBefore(slide_bootstrap, doc.head.firstChild);

    if(presentation_css.length) {
      var style = doc.createElement('style');
      style.textContent = this._rewriteCssText(presentation_css, joinPath(this.root_path, 'res/internal'));
      doc.head.appendChild(style);
    }
    if(css_text.length) {
      var custom_style = doc.createElement('style');
      custom_style.textContent = this._rewriteCssText(css_text, this.root_path);
      doc.head.appendChild(custom_style);
    }
    if(thumbnail_mode) {
      var thumbnail_style = doc.createElement('style');
      thumbnail_style.textContent = [
        'html, body { overflow: hidden !important; }',
        'body { pointer-events: none !important; user-select: none !important; }'
      ].join('\n');
      doc.head.appendChild(thumbnail_style);
    }

    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  refreshPreview() {
    if(!this.root_path.length) {
      return;
    }
    this._buildResourceUrlMap();
    this.preview.srcdoc = this._buildPreviewDocument(this.current_slide, false);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  globalThis.presentation_editor = new PRDC_JSLAB_WEB_PRESENTATION_EDITOR();
});
