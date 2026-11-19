/**
 * @file Presentation editor for inline document and thumbnail surfaces
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_CODE_EDITOR } = require('../code/editor');
const { PRDC_JSLAB_UI_CLOSE_DIALOG } = require('../windows/ui');
const { PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES } = require('./presentation-editor-slides');

const { PRDC_JSLAB_PRESENTATION_CONTENT } = require('../windows/presentation-content');


const { PRDC_JSLAB_PRESENTATION_EDITOR_NOTES } = require('./presentation-editor-notes');

/**
 * Utilities for inline presentation documents and resources.
 */
class PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER {

  /**
   * Returns bridge.
   */
  static getBridge() {
    return this.platform.bridge;
  }

  /**
   * Returns the translation for the requested identifier.
   * @param {*} id Id.
   * @param {*} fallback Fallback.
   */
  static currentString(id, fallback) {
    var bridge = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.getBridge();
    var text = bridge && typeof bridge.currentString == 'function'
      ? bridge.currentString(id)
      : '';
    if(typeof text == 'string' && text.length) {
      return text;
    }
    return fallback || '';
  }

  /**
   * Normalizes path.
   * @param {*} file_path File path.
   */
  static normalizePath(file_path) {
    return this.platform.normalizePresentationPath(file_path);
  }

  /**
   * Returns base name.
   * @param {*} file_path File path.
   */
  static getBaseName(file_path) {
    return this.platform.path.basename(this.normalizePath(file_path));
  }

  /**
   * Strips html.
   * @param {*} value Value.
   */
  static stripHtml(value) {
    var text = String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ');
    var tmp = document.createElement('div');
    tmp.innerHTML = text;
    return (tmp.textContent || tmp.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Checks whether local reference.
   * @param {*} url_text Url text.
   */
  static isLocalReference(url_text) {
    return PRDC_JSLAB_PRESENTATION_CONTENT.isLocalReference(url_text);
  }

  /**
   * Returns the directory containing the path.
   * @param {*} virtual_path Virtual path.
   */
  static dirname(virtual_path) {
    return this.platform.path.dirname(this.normalizePath(virtual_path)) || this.platform.workspace_root;
  }

  /**
   * Joins a relative path to its base directory.
   * @param {*} base_path Base path.
   * @param {*} relative_path Relative path.
   */
  static joinPath(base_path, relative_path) {
    return this.platform.joinPresentationPath(base_path, relative_path);
  }

  /**
   * Returns extension.
   * @param {*} file_path File path.
   */
  static getExtension(file_path) {
    var name = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.getBaseName(file_path);
    var idx = name.lastIndexOf('.');
    return idx >= 0 ? name.slice(idx).toLowerCase() : '';
  }

  /**
   * Returns mime type.
   * @param {*} file_path File path.
   */
  static getMimeType(file_path) {
    var ext = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.getExtension(file_path);
    if(ext == '.html' || ext == '.htm') {
      return 'text/html;charset=utf-8';
    }
    if(ext == '.css') {
      return 'text/css;charset=utf-8';
    }
    if(ext == '.js') {
      return 'text/javascript;charset=utf-8';
    }
    if(ext == '.json') {
      return 'application/json;charset=utf-8';
    }
    if(ext == '.svg') {
      return 'image/svg+xml';
    }
    if(ext == '.png') {
      return 'image/png';
    }
    if(ext == '.jpg' || ext == '.jpeg') {
      return 'image/jpeg';
    }
    if(ext == '.webp') {
      return 'image/webp';
    }
    if(ext == '.gif') {
      return 'image/gif';
    }
    if(ext == '.pdf') {
      return 'application/pdf';
    }
    if(ext == '.woff') {
      return 'font/woff';
    }
    if(ext == '.woff2') {
      return 'font/woff2';
    }
    if(ext == '.ttf') {
      return 'font/ttf';
    }
    return 'application/octet-stream';
  }

  /**
   * Collects slides.
   * @param {string} source Source.
   */
  static collectSlides(source) {
    return PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES.collect(source);
  }

  /**
   * Builds blank slide html.
   */
  static buildBlankSlideHtml() {
    return [
      '<slide>',
      '  <h1>New Slide</h1>',
      '  <notes></notes>',
      '</slide>'
    ].join('\n');
  }

  /**
   * Returns slide summary.
   * @param {*} slide_html Slide html.
   * @param {number} index Index.
   */
  static getSlideSummary(slide_html, index) {
    var tmp = document.createElement('div');
    var heading;
    var text;
    tmp.innerHTML = String(slide_html || '');
    heading = tmp.querySelector('h1,h2,h3,h4,h5,h6');
    if(heading && heading.textContent && heading.textContent.trim().length) {
      return heading.textContent.trim();
    }
    text = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.stripHtml(slide_html);
    if(text.length) {
      return text.length > 80 ? text.slice(0, 77) + '...' : text;
    }
    return PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.currentString(242, 'Slide') + ' ' + String(index + 1);
  }
}

var { createCodeMirrorLintOptions } = require('../code/lint');
var { PRDC_JSLAB_CODE_DOC_HOVER } = require('../code/doc-hover');

/**
 * Code tab for an inline presentation document.
 */
class PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_CODE_TAB {

  /**
   * Initializes the inline presentation editor code tab instance.
   * @param {*} editor Editor.
   * @param {string} key Key.
   * @param {string} label Label.
   */
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
    this.code_editor = CodeMirror(document.getElementById('code'), PRDC_JSLAB_CODE_EDITOR.options());
    this.code_editor.setOption('hintOptions', {
      includeBrowserCompletions: true,
      requestCompletions: request => editor.platform.bridge.getCompletions(request)
    });

    PRDC_JSLAB_CODE_EDITOR.bindShortcuts(CodeMirror);

    PRDC_JSLAB_CODE_EDITOR.bindCompletion(CodeMirror, this.code_editor);

    this.code_editor.on('change', function() {
      obj.codeChanged();
    });

    this.code_doc_hover = new PRDC_JSLAB_CODE_DOC_HOVER({
      get_docs: () => this.editor.platform.getDocumentation(),
      on_print_doc: function(entry) {
        var bridge = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.getBridge();
        var query = entry && entry.doc_query ? entry.doc_query : '';
        if(query.length && bridge && typeof bridge.showDocumentation == 'function') {
          bridge.showDocumentation(query);
        }
      }
    });

    if(this.key == 'html') {
      this.code_editor.setOption('mode', 'htmlmixed');
      this.code_editor.setOption('lint', {});
      this.slide_highlight_lines = [];
      this.slide_highlight_key = '';
      this.code_editor.on('cursorActivity', function() {
        obj.updateSlideHighlight();
      });
      this.code_editor.on('change', function() {
        obj.updateSlideHighlight();
      });
    } else if(this.key == 'css') {
      this.code_editor.setOption('mode', 'css');
      this.code_editor.setOption('lint', {});
    } else {
      this.code_editor.setOption('mode', 'javascript');
      this.code_editor.setOption('lint', createCodeMirrorLintOptions(CodeMirror));
      this.code_doc_hover.attach(this.code_editor);
    }
  }

  /**
   * Sets path.
   * @param {*} file_path File path.
   * @param {string} code Code.
   */
  setPath(file_path, code) {
    this.file_path = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.normalizePath(file_path);
    this.saved_code = String(code || '');
    this.code_editor.setValue(this.saved_code);
    this.code_editor.clearHistory();
    this.tab.classList.remove('changed');
  }

  /**
   * Clears slide highlight.
   */
  clearSlideHighlight() {
    if(!this.slide_highlight_lines) {
      return;
    }
    this.slide_highlight_lines.forEach((line) => {
      this.code_editor.removeLineClass(line, 'background', 'CodeMirror-presentation-slide-line');
    });
    this.slide_highlight_lines = [];
    this.slide_highlight_key = '';
  }

  /**
   * Updates slide highlight.
   */
  updateSlideHighlight() {
    var source;
    var slides;
    var cursor_index;
    var slide;
    var start;
    var end;
    var key;
    if(this.key != 'html') {
      return;
    }

    source = this.getValue();
    slides = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(source);
    cursor_index = this.code_editor.indexFromPos(this.code_editor.getCursor());
    const active_index = PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES.indexAtOffset(slides, cursor_index);
    if(active_index < 0) {
      this.clearSlideHighlight();
      return;
    }

    slide = slides[active_index];
    start = this.code_editor.posFromIndex(slide.start);
    end = this.code_editor.posFromIndex(slide.end);
    key = active_index + ':' + slide.start + ':' + slide.end + ':' + start.line + ':' + end.line;
    if(this.slide_highlight_key == key) {
      return;
    }

    this.code_editor.operation(() => {
      this.clearSlideHighlight();
      for(var line = start.line; line <= end.line; line++) {
        var handle = this.code_editor.getLineHandle(line);
        if(handle) {
          this.code_editor.addLineClass(handle, 'background', 'CodeMirror-presentation-slide-line');
          this.slide_highlight_lines.push(handle);
        }
      }
    });
    this.slide_highlight_key = key;
  }

  /**
   * Returns value.
   */
  getValue() {
    return this.code_editor.getValue();
  }

  /**
   * Sets slide.
   * @param {number} index Index.
   */
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
    slides = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(source);
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
    this.updateSlideHighlight();
  }

  /**
   * Saves.
   */
  save() {
    var code = this.getValue();
    this.editor.bridge.writeWorkspaceTextSync(this.file_path, code);
    this.saved_code = code;
    this.tab.classList.remove('changed');
  }

  /**
   * Checks whether dirty.
   */
  isDirty() {
    return this.getValue().replace(/\r/g, '') != this.saved_code.replace(/\r/g, '');
  }

  /**
   * Marks the edited source as having unsaved changes.
   */
  codeChanged() {
    this.tab.classList.add('changed');
    this.editor.onTabCodeChanged(this);
  }

  /**
   * Shows.
   */
  show() {
    document.querySelectorAll('#code .CodeMirror').forEach(function(el) {
      el.style.display = 'none';
    });
    this.editor.tabs.setCurrentTab(this.tab);
    this.code_editor.getWrapperElement().style.display = 'block';
    this.code_editor.refresh();
    this.code_editor.focus();
    this.updateSlideHighlight();
  }
}

/**
 * Presentation editor for inline document surfaces.
 */
class PRDC_JSLAB_PRESENTATION_EDITOR_INLINE extends PRDC_JSLAB_PRESENTATION_EDITOR_NOTES {

  /**
   * Initializes the inline presentation editor instance.
   */
  constructor(platform) {
    super();
    var obj = this;
    this.platform = platform;
    PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.platform = platform;
    this.bridge = platform.bridge;
    this.root_path = '';
    this.current_slide = 0;
    this.slide_entries = [];
    this.resource_urls = {};
    this.close_requested = false;
    this.force_close = false;
    this.preview_timer = undefined;
    this.updating_slide_notes_from_input = false;

    this.preview = document.getElementById('preview');
    this.slide_thumbnails = document.getElementById('slide-thumbnails');
    this.presentation_title = document.getElementById('presentation-title');
    this.slide_notes = document.getElementById('slide-notes');
    this.slide_notes_body = document.getElementById('slide-notes-body');
    this.set_slide = document.getElementById('set-slide');
    this.total_slides = document.getElementById('total-slides');
    this.close_dialog = new PRDC_JSLAB_UI_CLOSE_DIALOG(document, choice => this._resolveCloseDialog(choice));
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
    this.tabs_cont.addEventListener('tabNew', function(event) {
      event.preventDefault();
    });
    this.tabs_cont.addEventListener('activeTabChange', function(event) {
      obj.active_tab = event.detail.tabEl;
      if(obj.active_tab && obj.active_tab.tab_obj) {
        obj.active_tab.tab_obj.show();
      }
    });

    this.html_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_CODE_TAB(this, 'html', 'html');
    this.js_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_CODE_TAB(this, 'js', 'js');
    this.css_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_CODE_TAB(this, 'css', 'css');
    this.html_editor.show();

    if(this.slide_notes_body) {
      this.slide_notes_body.addEventListener('input', function() {
        obj.updateSlideNotesFromInput();
      });
    }

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
      if(event.key == 'Escape') {
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

  }

  /**
   * Sets path.
   * @param {*} root_path Root path.
   */
  setPath(root_path) {
    var normalized = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.normalizePath(root_path);
    var title = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.getBaseName(normalized) || 'Presentation';
    this.root_path = normalized;
    this.presentation_title.textContent = title;
    this.platform.setPresentationTitle(title + ' - ' + PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.currentString(515, 'Presentation editor'));

    this.html_editor.setPath(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(this.root_path, 'index.html'),
      this.bridge.readWorkspaceTextSync(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(this.root_path, 'index.html')));
    this.js_editor.setPath(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(this.root_path, 'main.js'),
      this.bridge.readWorkspaceTextSync(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(this.root_path, 'main.js')));
    this.css_editor.setPath(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(this.root_path, 'main.css'),
      this.bridge.readWorkspaceTextSync(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(this.root_path, 'main.css')));

    this.refreshSlides();
    this.schedulePreviewRefresh();
  }

  /**
   * Handles tab code changed.
   * @param {*} tab Tab.
   */
  onTabCodeChanged(tab) {
    if(tab && tab.key == 'html') {
      if(this.updating_slide_notes_from_input) {
        this.slide_entries = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(this.getCurrentCode('html'));
        return;
      }
      this.refreshSlides();
    }
    this.schedulePreviewRefresh();
  }

  /**
   * Creates slide context menu.
   */
  _createSlideContextMenu() {
    var obj = this;
    var menu = document.createElement('div');
    var actions = [
      { action: 'go-to-code', label: PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.currentString(321, 'Go To Code') },
      { action: 'insert-after', label: PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.currentString(536, 'Insert Slide After') },
      { action: 'duplicate', label: PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.currentString(537, 'Duplicate Slide') },
      { action: 'move-up', label: PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.currentString(616) },
      { action: 'move-down', label: PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.currentString(617) },
      { action: 'delete', label: PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.currentString(618) }
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

  /**
   * Opens slide context menu.
   * @param {number} index Index.
   * @param {*} left Left.
   * @param {*} top Top.
   */
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

  /**
   * Hides slide context menu.
   */
  _hideSlideContextMenu() {
    if(this.slide_context_menu) {
      this.slide_context_menu.style.display = 'none';
    }
    this.slide_context_index = undefined;
  }

  /**
   * Handles slide context action.
   * @param {*} action Action.
   */
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

  /**
   * Returns current code.
   * @param {string} key Key.
   */
  getCurrentCode(key) {
    if(key == 'html') {
      return this.html_editor.getValue();
    }
    if(key == 'js') {
      return this.js_editor.getValue();
    }
    if(key == 'css') {
      return this.css_editor.getValue();
    }
    return '';
  }

  /**
   * Checks for unsaved changes.
   */
  hasUnsavedChanges() {
    return this.html_editor.isDirty() || this.js_editor.isDirty() || this.css_editor.isDirty();
  }

  /**
   * Checks for unsaved changes before closing the window.
   */
  beforeClose() {
    if(this.force_close || !this.hasUnsavedChanges()) {
      return true;
    }
    if(!this.close_requested) {
      this.confirmClose().then(approved => {
        if(approved) {
          this.force_close = true;
          this.platform.closePresentationWindow();
        }
      }).catch(console.error);
    }
    return false;
  }

  /**
   * Prompts for modified presentation sources.
   * @param {Function} [focus] Focuses the owning window for an application reload.
   * @returns {Promise<boolean>} Whether the close can proceed.
   */
  async confirmClose(focus) {
    if(!this.hasUnsavedChanges()) return true;
    if(this.close_requested) return false;
    focus?.();
    this.close_requested = true;
    const action = await new Promise(resolve => {
      this.close_answer = resolve;
      this.close_dialog.show(this.presentation_title.textContent ||
        PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.getBaseName(this.root_path));
    });
    if(action === 'save') this.saveCode();
    return action === 'save' || action === 'discard';
  }

  /**
   * Resolves close dialog.
   * @param {*} action Action.
   */
  _resolveCloseDialog(action) {
    const answer = this.close_answer;
    this.close_answer = null;
    this.close_requested = false;
    this.close_dialog.hide();
    answer?.(action);
  }

  /**
   * Saves code.
   */
  saveCode() {
    PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES.save(this);
    if(this.bridge && typeof this.bridge.refreshWorkspaceList == 'function') {
      Promise.resolve(this.bridge.refreshWorkspaceList()).catch(function(err) {
        console.error(err);
      });
    }
    this.refreshSlides();
    this.schedulePreviewRefresh();
  }

  /**
   * Refreshes slides.
   */
  refreshSlides() {
    var obj = this;
    var render_token;
    if(this.root_path.length) {
      this._buildResourceUrlMap();
    }
    this.slide_entries = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(this.getCurrentCode('html'));
    if(this.current_slide >= this.slide_entries.length) {
      this.current_slide = Math.max(0, this.slide_entries.length - 1);
    }
    this.total_slides.textContent = '/ ' + String(this.slide_entries.length);
    this.set_slide.value = this.slide_entries.length ? String(this.current_slide + 1) : '0';
    this.slide_thumbnails.innerHTML = '';
    this.updateSlideNotes(this.current_slide);
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

  /**
   * Sets slide.
   * @param {number} index Index.
   */
  setSlide(index) {
    if(!this.slide_entries.length) {
      this.current_slide = 0;
      this.set_slide.value = '0';
      this.updateSlideNotes(this.current_slide);
      return;
    }
    this.current_slide = Math.max(0, Math.min(this.slide_entries.length - 1, Number(index) || 0));
    this.set_slide.value = String(this.current_slide + 1);
    this.slide_thumbnails.querySelectorAll('.slide-thumb').forEach(function(node, node_index) {
      node.classList.toggle('active', node_index == index);
    });
    this.updateSlideNotes(this.current_slide);
    this.schedulePreviewRefresh();
  }

  /**
   * Returns slide notes html.
   * @param {number} [index] Index.
   */
  getSlideNotesHtml(index = this.current_slide) {
    return this.getSlideBlockNotes(this.slide_entries[index]?.full) ?? '';
  }

  /**
   * Returns slide notes text.
   * @param {number} [index] Index.
   */
  getSlideNotesText(index = this.current_slide) {
    return this.decodeSlideNotesHtml(this.getSlideNotesHtml(index));
  }

  /**
   * Checks for slide notes.
   * @param {number} [index] Index.
   */
  hasSlideNotes(index = this.current_slide) {
    return this.getSlideBlockNotes(this.slide_entries[index]?.full) !== null;
  }

  /**
   * Sets slide notes text.
   * @param {number} [index] Index.
   * @param {*} [notes_text] Notes text.
   */
  setSlideNotesText(index = this.current_slide, notes_text = '') {
    var source = this.getCurrentCode('html');
    var slides = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(source);
    var eol = source.includes('\r\n') ? '\r\n' : '\n';
    index = Number(index);
    if(!Number.isFinite(index) || index < 0 || index >= slides.length) {
      return false;
    }
    var next_block = this.setSlideBlockNotesText(slides[index].full,
      notes_text, eol);
    if(next_block == slides[index].full) {
      return false;
    }
    this.updating_slide_notes_from_input = true;
    try {
      this.html_editor.code_editor.replaceRange(next_block,
        this.html_editor.code_editor.posFromIndex(slides[index].start),
        this.html_editor.code_editor.posFromIndex(slides[index].end));
    } finally {
      this.updating_slide_notes_from_input = false;
    }
    this.slide_entries = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(this.getCurrentCode('html'));
    return true;
  }

  /**
   * Updates slide notes.
   * @param {number} [index] Index.
   */
  updateSlideNotes(index = this.current_slide) {
    var notes_html;
    if(!this.slide_notes || !this.slide_notes_body) {
      return;
    }
    notes_html = this.getSlideNotesHtml(index);
    this.slide_notes_body.dataset.slideIndex = String(index);
    this.slide_notes_body.value = this.decodeSlideNotesHtml(notes_html);
    this.slide_notes.classList.remove('empty');
  }

  /**
   * Renders slide thumbnail.
   * @param {*} thumb Thumb.
   * @param {*} slide_index Slide index.
   * @param {*} render_token Render token.
   */
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

  /**
   * Returns drop target info.
   * @param {*} client_y Client y.
   */
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

  /**
   * Handles thumbnail drag over.
   * @param {Object} event Event.
   */
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

  /**
   * Handles thumbnail drop.
   * @param {Object} event Event.
   */
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

  /**
   * Clears thumbnail drop indicator.
   */
  _clearThumbnailDropIndicator() {
    this.drop_slide_index = undefined;
    this.drop_slide_after = false;
    this.slide_thumbnails.classList.remove('drop-active');
  }

  /**
   * Schedules preview refresh.
   */
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

  /**
   * Rebuilds html with slides.
   * @param {*} slides Slides.
   */
  _rebuildHtmlWithSlides(slides) {
    var source = this.getCurrentCode('html');
    var ranges = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(source);
    if(!ranges.length) {
      return String(source || '') + '\n\n' + slides.join('\n\n');
    }
    return source.slice(0, ranges[0].start) +
      slides.join('\n\n') +
      source.slice(ranges[ranges.length - 1].end);
  }

  /**
   * Replaces html slides.
   * @param {*} next_slides Next slides.
   * @param {*} active_slide Active slide.
   */
  _replaceHtmlSlides(next_slides, active_slide) {
    var next_html = this._rebuildHtmlWithSlides(next_slides);
    this.html_editor.code_editor.setValue(next_html);
    this.refreshSlides();
    this.setSlide(active_slide);
  }

  /**
   * Inserts slide after.
   * @param {number} index Index.
   */
  insertSlideAfter(index) {
    var slides = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(this.getCurrentCode('html')).map(function(entry) {
      return entry.full;
    });
    var insert_at = PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES.insert(slides, Number(index),
      PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.buildBlankSlideHtml());
    this._replaceHtmlSlides(slides, insert_at);
  }

  /**
   * Duplicates slide.
   * @param {number} index Index.
   */
  duplicateSlide(index) {
    var slides = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(this.getCurrentCode('html')).map(function(entry) {
      return entry.full;
    });
    var source_index = Math.max(0, Math.min(slides.length - 1, Number(index) || 0));
    var target = PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES.duplicate(slides, source_index);
    if(target !== null) this._replaceHtmlSlides(slides, target);
  }

  /**
   * Deletes slide.
   * @param {number} index Index.
   */
  deleteSlide(index) {
    var slides = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(this.getCurrentCode('html')).map(function(entry) {
      return entry.full;
    });
    var source_index = Math.max(0, Math.min(slides.length - 1, Number(index) || 0));
    if(PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES.remove(slides, source_index,
        PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.buildBlankSlideHtml)) {
      this._replaceHtmlSlides(slides, Math.max(0, source_index - 1));
    }
  }

  /**
   * Moves slide.
   * @param {*} from_index From index.
   * @param {*} to_index To index.
   */
  moveSlide(from_index, to_index) {
    var slides = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.collectSlides(this.getCurrentCode('html')).map(function(entry) {
      return entry.full;
    });
    var source_index = Math.max(0, Math.min(slides.length - 1, Number(from_index) || 0));
    var target_index = Math.max(0, Math.min(slides.length - 1, Number(to_index) || 0));
    if(PRDC_JSLAB_PRESENTATION_EDITOR_SLIDES.move(slides, source_index, target_index)) {
      this._replaceHtmlSlides(slides, target_index);
    }
  }

  /**
   * Revokes resource urls.
   */
  _revokeResourceUrls() {
    Object.keys(this.resource_urls).forEach((key) => {
      try {
        URL.revokeObjectURL(this.resource_urls[key]);
      } catch{}
    });
    this.resource_urls = {};
  }

  /**
   * Collects workspace files.
   * @param {*} dir_path Dir path.
   * @param {*} out Out.
   */
  _collectWorkspaceFiles(dir_path, out) {
    var obj = this;
    var entries = this.bridge.readWorkspaceDirSync(dir_path, { withFileTypes: true });
    entries.forEach(function(entry) {
      var next_path = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(dir_path, entry.name);
      if(entry.isDirectory()) {
        obj._collectWorkspaceFiles(next_path, out);
      } else {
        out.push(next_path);
      }
    });
  }

  /**
   * Returns app asset text.
   * @param {*} asset_path Asset path.
   */
  _getAppAssetText(asset_path) {
    if(this.bridge && typeof this.bridge.getAppAssetSync == 'function') {
      return String(this.bridge.getAppAssetSync(asset_path) || '');
    }
    return '';
  }

  /**
   * Builds presentation runtime source.
   * @param {Object} config Config.
   */
  _buildPresentationRuntimeSource(config) {
    var js_template = this._getAppAssetText('/js/windows/presentation-viewer.js');
    if(!js_template.length) {
      return false;
    }
    return PRDC_JSLAB_PRESENTATION_CONTENT.runtimeSource(js_template,
      this._getAppAssetText('/js/windows/presentation-content.js'), config);
  }

  /**
   * Builds presentation globals source.
   */
  _buildPresentationGlobalsSource() {
    return PRDC_JSLAB_PRESENTATION_CONTENT.globalsSource(id => PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.currentString(id, ''));
  }

  /**
   * Builds resource url map.
   */
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
      var blob = new Blob([bytes], { type: PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.getMimeType(file_path) });
      obj.resource_urls[relative] = URL.createObjectURL(blob);
      if(relative.toLowerCase() != relative) {
        obj.resource_urls[relative.toLowerCase()] = obj.resource_urls[relative];
      }
    });
  }

  /**
   * Resolves resource url.
   * @param {*} relative_path Relative path.
   */
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

  /**
   * Rewrites css text.
   * @param {*} css_text Css text.
   * @param {*} base_dir Base dir.
   */
  _rewriteCssText(css_text, base_dir) {
    var obj = this;
    return String(css_text || '').replace(/url\(([^)]+)\)/g, function(match, raw_url) {
      var value = String(raw_url || '').trim().replace(/^['"]|['"]$/g, '');
      var resolved;
      if(!PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.isLocalReference(value)) {
        return match;
      }
      resolved = obj._resolveResourceUrl(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(base_dir, value).slice(obj.root_path.length + 1));
      if(!resolved.length) {
        return match;
      }
      return 'url("' + resolved + '")';
    });
  }

  /**
   * Rewrites element resource.
   * @param {*} element Element.
   * @param {*} attribute Attribute.
   * @param {*} base_dir Base dir.
   */
  _rewriteElementResource(element, attribute, base_dir) {
    var value = element.getAttribute(attribute);
    var resolved;
    if(!value || !PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.isLocalReference(value)) {
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
    resolved = this._resolveResourceUrl(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(base_dir, value).slice(this.root_path.length + 1));
    if(resolved.length) {
      element.setAttribute(attribute, resolved);
    }
  }

  /**
   * Builds preview document.
   * @param {*} slide_index Slide index.
   * @param {*} thumbnail_mode Thumbnail mode.
   */
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
    var slide_startup;
    var embedded_loader_override;
    var csp_meta;

    if(!current_slide) {
      return '<!DOCTYPE html><html><body></body></html>';
    }

    try {
      presentation_css = this.bridge.readWorkspaceTextSync(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(this.root_path, 'res/internal/presentation.css'));
    } catch{}
    try {
      config_text = this.bridge.readWorkspaceTextSync(PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(this.root_path, 'res/internal/config.json'));
      config = JSON.parse(String(config_text || '{}'));
    } catch{}
    this.presentation_config = config;

    embedded_loader_override = PRDC_JSLAB_PRESENTATION_CONTENT.embeddedLoaderSource(config.presentation_mode == 'standalone');

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
      if(!PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.isLocalReference(href)) {
        return;
      }
      resolved_path = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(obj.root_path, href);
      try {
        css_value = obj.bridge.readWorkspaceTextSync(resolved_path);
      } catch{
        css_value = false;
      }
      if(typeof css_value != 'string') {
        obj._rewriteElementResource(link, 'href', obj.root_path);
        return;
      }
      style = doc.createElement('style');
      style.textContent = obj._rewriteCssText(css_value, PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.dirname(resolved_path));
      link.replaceWith(style);
    });

    doc.querySelectorAll('script[src]').forEach(function(script) {
      var src = script.getAttribute('src');
      var resolved_path;
      var js_value;
      var inline_script;
      if(!PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.isLocalReference(src)) {
        return;
      }
      resolved_path = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(obj.root_path, src);
      if(/\/res\/internal\/presentation\.js$/i.test(resolved_path.replace(/\\/g, '/'))) {
        js_value = obj._buildPresentationRuntimeSource(config);
      } else if(/\/res\/internal\/globals\.js$/i.test(resolved_path.replace(/\\/g, '/'))) {
        js_value = obj._buildPresentationGlobalsSource();
      } else {
        try {
          js_value = obj.bridge.readWorkspaceTextSync(resolved_path);
        } catch{
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

    slide_startup = doc.createElement('script');
    slide_startup.textContent = [
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
    doc.head.insertBefore(slide_startup, doc.head.firstChild);

    if(presentation_css.length) {
      var style = doc.createElement('style');
      style.textContent = this._rewriteCssText(presentation_css, PRDC_JSLAB_PRESENTATION_EDITOR_INLINE_HELPER.joinPath(this.root_path, 'res/internal'));
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

  /**
   * Refreshes preview.
   */
  refreshPreview() {
    if(!this.root_path.length) {
      return;
    }
    this._buildResourceUrlMap();
    this.preview.srcdoc = this._buildPreviewDocument(this.current_slide, false);
  }
}

exports.PRDC_JSLAB_PRESENTATION_EDITOR_INLINE = PRDC_JSLAB_PRESENTATION_EDITOR_INLINE;
