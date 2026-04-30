/**
 * @file JSLAB library presentation editor script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
const { ipcRenderer } = require('electron');
 
const fs = require('fs');
const path = require('path');
const { ESLint } = require("eslint");
require("../js/shared/init-config.js");
var language = window.opener.jsl.inter.lang;
const { PRDC_JSLAB_EDITOR_SEARCH_ALL } = require('../js/editor/search-all');

const { PRDC_POPUP } = require('../lib/PRDC_POPUP/PRDC_POPUP');
const { PRDC_PANEL } = require('../lib/PRDC_PANEL/PRDC_PANEL');

/**
 * Class for JSLAB presentation editor code tab.
 */
class PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_PRESENTATION_EDITOR class.
   */
  constructor(editor, name, file) {
    var obj = this;
    this.editor = editor;
    
    this.tab = this.editor.tabs.addTab({
      title: name,
      favicon: false
    });
    this.tab.tab_obj = this;

    this.code_editor = CodeMirror(document.getElementById("code"), {
      theme: "notepadpp",
      rulers: [{ color: "#aff", column: 75, lineStyle: "solid" }],
      indentUnit: 2,
      tabSize: 2,
      lineNumbers: true,
      lineWrapping: true,
      styleActiveLine: true,
      matchBrackets: true,
      gutter: true,
      gutters: [
        "CodeMirror-linenumbers",
        "CodeMirror-foldgutter",
        "CodeMirror-lint-markers",
      ],
      foldGutter: true,
      searchDialog: true,
      highlightSelectionMatches: { annotateScrollbar: true },
    });
    
    CodeMirror.keyMap.default["Shift-Tab"] = "indentLess";
    CodeMirror.keyMap.default["Tab"] = "indentMore";
    CodeMirror.keyMap.default["Ctrl-F"] = "showSearchDialog";
    CodeMirror.keyMap.default['Ctrl-G'] = 'findNext';
    CodeMirror.keyMap.default['Shift-Ctrl-G'] = 'findPrev';
    CodeMirror.keyMap.default['Shift-Ctrl-F'] = 'replace';
    CodeMirror.keyMap.default['Shift-Ctrl-R'] = 'replaceAll';
    CodeMirror.keyMap.default['Ctrl-/'] = 'toggleComment';
    
    // Keypress events
    this.code_editor.on("keypress", function (cm, event) {
      if(
        !cm.state.completionActive &&
        !event.ctrlKey &&
        event.key != "Enter" &&
        event.key != ";" &&
        event.key != " " &&
        (event.key != "{") & (event.key != "}")
      ) {
        CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
      }
    });
    
    this.code_editor.getInputField().setAttribute('title', name);
    
    if(name == 'html') {
      this.code_editor.setOption("mode", "htmlmixed");
      this.code_editor.setOption("lint", {});

      function collectSlideRanges(source) {
        const ranges = [];
        const re = /<\s*slide\b[^>]*>([\s\S]*?)<\/\s*slide\s*>/gi;
        let m;
        while ((m = re.exec(source))) ranges.push({ start: m.index, end: re.lastIndex });
        return ranges;
      }

      function cursorSlideIndex(pos, ranges) {
        for(let i = 0; i < ranges.length; i++)
          if(pos >= ranges[i].start && pos <= ranges[i].end) return i;
        return -1;
      }
      
      this.getSlide = function() {
        var pos = obj.code_editor.indexFromPos(obj.code_editor.getCursor());
        var txt = obj.code_editor.getValue();
        return cursorSlideIndex(pos, collectSlideRanges(txt));
      }
      this.setSlide = function(index) {
        var txt = obj.code_editor.getValue();
        var rngs = collectSlideRanges(txt);
        if(index >= 0 && index < rngs.length) {
          var r = rngs[index];
          var gt = txt.indexOf('>', r.start);
          var offset = gt !== -1 && gt < r.end ? gt + 1 : r.start;
          var pos = obj.code_editor.posFromIndex(offset);
          obj.code_editor.setCursor(pos);
          obj.code_editor.scrollIntoView({ line: pos.line, ch: pos.ch }, 80)
        }
      }
      this.foldSlides = function() {
        var cursor = obj.code_editor.getSearchCursor(/<\s*slide\b[^>]*>/ig, CodeMirror.Pos(0, 0));
        obj.code_editor.operation(() => {
          while(cursor.findNext()) {
            const pos = cursor.from();
            obj.code_editor.foldCode(pos, null, 'fold');
          }
        });
      }
      this.unfoldSlides = function() {
        var cursor = obj.code_editor.getSearchCursor(/<\s*slide\b[^>]*>/ig, CodeMirror.Pos(0, 0));
        obj.code_editor.operation(() => {
          while(cursor.findNext()) {
            const pos = cursor.from();
            obj.code_editor.foldCode(pos, null, 'unfold');
          }
        });
      }
    } else if(name == 'css') {
      this.code_editor.setOption("mode", "css");
      this.code_editor.setOption("lint", {});
    } else if(name == 'js') {
      this.code_editor.setOption("mode", "javascript");
      this.code_editor.setOption("lint", {
        getAnnotations: async function(text, callback) {
          var results = await obj.editor.eslint.lintText(text);
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
      });
    }
  }
  
  /**
   * On code changed
   */ 
  codeChanged() {
    this.tab.classList.add("changed");
  }
  
  /**
   * Activates this tab and shows code
   */
  show() {
    $(".CodeMirror").hide();
    this.editor.tabs.setCurrentTab(this.tab);
    $(this.code_editor.display.wrapper).show();
    this.code_editor.focus();
    this.code_editor.refresh();
  }
  
  /**
   * Save code
   * @param {Number} timeout_ms
   */
  async save(timeout_ms = 10000) {
    var code = this.code_editor.getValue();
    if(this.tab.classList.contains("changed")) {
      await this.writeFileWithTimeout(this.file_path, code, timeout_ms);
      this.tab.classList.remove("changed");
    }
    this.code = code;
  }

  /**
   * Writes a file without blocking the renderer indefinitely.
   * @param {String} file_path
   * @param {String} code
   * @param {Number} timeout_ms
   * @returns {Promise<void>}
   */
  writeFileWithTimeout(file_path, code, timeout_ms) {
    return new Promise(function(resolve, reject) {
      var settled = false;
      var timer = setTimeout(function() {
        if(settled) return;
        settled = true;
        reject(new Error('Save timed out: ' + file_path));
      }, timeout_ms);

      fs.promises.writeFile(file_path, code).then(function() {
        if(settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      }).catch(function(err) {
        if(settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Opens search dialog in the code editor.
   */
  openSearchDialog() {
    this.code_editor.execCommand('showSearchDialog');
  }
  
  /**
   * Sets file path for code
   * @param {String} file_path - Absolute path to the code file
   */
  setPath(file_path) {
    var obj = this;
    this.file_path = file_path;
    this.code = fs.readFileSync(file_path).toString();
    this.code_editor.setValue(this.code);
    this.code_editor.clearHistory();
    
    this.code_editor.on("change", function() {
      obj.codeChanged();   
    });
  }
}

/**
 * Class for JSLAB presentation editor.
 */
class PRDC_JSLAB_PRESENTATION_EDITOR {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_PRESENTATION_EDITOR class.
   */
  constructor() {
    var obj = this;
    
    this.webview = document.getElementById('preview');
    this.thumbnail_preview_host = document.getElementById('thumbnail-preview-host');
    this.thumbview = document.getElementById('thumbnail-preview');
    this.webview_wrap = document.getElementById('webview-wrap');
    this.preview_panel = document.getElementById('preview-panel');
    this.preview_stage = document.getElementById('preview-stage');
    this.presentation_title = document.getElementById('presentation-title');
    this.slide_controls = document.getElementById('slide-controls');
    this.slide_thumbnails = document.getElementById('slide-thumbnails');
    this.close_dialog_cont = document.getElementById('close-dialog-cont');
    this.close_file = document.getElementById('close-file');
    this.left = document.getElementById('left-panel-cont');
    
    // Use a plain object copy so ESLint does not probe optional keys on the config proxy.
    var lint_options = {
      overrideConfigFile: config.LINT_OPTIONS.overrideConfigFile,
      overrideConfig: {
        languageOptions: config.LINT_OPTIONS.overrideConfig.languageOptions,
        rules: config.LINT_OPTIONS.overrideConfig.rules,
      },
    };
    this.eslint = new ESLint(lint_options);
    this.editor_more_popup = new PRDC_POPUP(document.getElementById('editor-more-icon'),
      document.getElementById('editor-more-popup'));
    this.current_slide = 0;
    this.total_slides = 0;
    this.pending_slide_after_reload = undefined;
    this.thumb_worker_count = 2;
    this.thumb_workers = [];
    this.thumb_ready = false;
    this.thumb_render_token = 0;
    this.thumb_render_timer = undefined;
    this.thumb_render_in_flight = false;
    this.thumb_rerun_requested = false;
    this.thumb_dirty_indexes = new Set();
    this.full_thumb_refresh_on_ready = true;
    this.pending_thumb_render_indexes = undefined;
    this.pending_thumb_slide_after_reload = undefined;
    this.drag_slide_index = undefined;
    this.drop_slide_index = undefined;
    this.drop_slide_after = false;
    this.close_requested = false;
    this.initThumbnailWorkers();

    this.columns = new PRDC_PANEL('presentation-editor-columns', 'vertical', document.body, [document.getElementById('left-panel'), document.getElementById('right-panel')], [60, 40], function() {
      obj.scaleSlide();
    });    
    
    // Initialize panels
    window.addEventListener('resize', function() {
      obj.columns.onResize();
    });
    
    // Tabs
    this.tabs_cont = document.querySelector(".tabs");
    this.tabs = new PRDC_TABS();
    this.tabs.init(this.tabs_cont);

    // On tab change
    this.tabs_cont.addEventListener("activeTabChange", function({ detail }) {
      obj.active_tab = detail.tabEl;
      if(obj.script_manager) {
        obj.script_manager.active_tab = detail.tabEl;
      }
      if(obj.active_tab.hasOwnProperty('tab_obj')) {
        obj.active_tab.tab_obj.show();
      }
    });
    
    this.html_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB(this, 'html');
    this.js_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB(this, 'js');
    this.css_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB(this, 'css');
    
    this.html_editor.show();
    this.script_manager = this.createSearchAllScriptManager();
    this.editor_search_all = new PRDC_JSLAB_EDITOR_SEARCH_ALL(this);
    if(this.editor_search_all) {
      this.editor_search_all.layout_offset = 100;
      this.editor_search_all.setPanelHeight(
        this.editor_search_all.percentToPanelHeight(this.editor_search_all.panel_height_percent),
        false
      );
    }

    document.addEventListener("keydown", function(e) {
      if(obj.close_requested) {
        if(e.key == 'Escape') {
          obj.closeDialogButton(0);
          e.stopPropagation();
          e.preventDefault();
        }
        return;
      }
      if(e.ctrlKey && e.key.toLowerCase() === "s" && !e.shiftKey) {
        obj.saveCode().catch(function(err) {
          console.error(err);
        });
      } else if(e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        var selected_text = '';
        if(obj.active_tab &&
            obj.active_tab.tab_obj &&
            obj.active_tab.tab_obj.code_editor) {
          selected_text = obj.active_tab.tab_obj.code_editor.getSelection();
        }
        if(obj.editor_search_all) {
          obj.editor_search_all.open(selected_text);
        }
        e.stopPropagation();
        e.preventDefault();
      }
    });

    this.webview.addEventListener('ipc-message', function(e) {
      if(e.args[0].ready !== undefined) {
        obj.updateSlidesCount(e.args[0].ready);
        if(typeof obj.pending_slide_after_reload == 'number') {
          var target_slide = Math.max(0, Math.min(obj.pending_slide_after_reload,
            Math.max(0, obj.total_slides - 1)));
          obj.pending_slide_after_reload = undefined;
          obj.current_slide = target_slide;
          document.getElementById('set-slide').value = target_slide + 1;
          obj.setActiveThumbnail(target_slide);
          obj.webview.send('data', { show: target_slide });
        }
      } else if(e.args[0].slide !== undefined) {
        obj.current_slide = e.args[0].slide;
        document.getElementById('set-slide').value = obj.current_slide + 1;
        obj.setActiveThumbnail(obj.current_slide);
      }
    });
    $("#tab-save").click(function() {
      obj.saveCode().catch(function(err) {
        console.error(err);
      });
    });
    $("#close-dialog-save").click(function() { obj.closeDialogButton(2); });
    $("#close-dialog-discard").click(function() { obj.closeDialogButton(1); });
    $("#close-dialog-cancel").click(function() { obj.closeDialogButton(0); });
    $("#search-dialog-menu").click(function() { 
      obj.active_tab.tab_obj.openSearchDialog();
      obj.editor_more_popup.close();
    });
    $("#search-all-menu").click(function() {
      var selected_text = '';
      if(obj.active_tab &&
          obj.active_tab.tab_obj &&
          obj.active_tab.tab_obj.code_editor) {
        selected_text = obj.active_tab.tab_obj.code_editor.getSelection();
      }
      if(obj.editor_search_all) {
        obj.editor_search_all.open(selected_text);
      }
      obj.editor_more_popup.close();
    });
    $("#fold-slides").click(function() { 
      obj.html_editor.show();
      obj.html_editor.foldSlides() 
      obj.editor_more_popup.close();
    });
    $("#unfold-slides").click(function() { 
      obj.html_editor.show();
      obj.html_editor.unfoldSlides() 
      obj.editor_more_popup.close();
    });
    
    $("#first-slide").click(function() {
      obj.webview.send('data',{ show: 0 });
    }); 
    $("#prev-slide").click(function() {
      obj.webview.send('data',{ show: obj.current_slide - 1 });
    });
    $("#next-slide").click(function() {
      obj.webview.send('data',{ show: obj.current_slide + 1 });
    });
    $("#last-slide").click(function() {
      obj.webview.send('data',{ show: obj.total_slides - 1 });
    });
    $("#set-slide").on( "change", function() {
      obj.webview.send('data',{ show: $(this).val() - 1 });
    });
    this.slide_thumbnails.addEventListener('click', function(e) {
      var item = e.target.closest('.slide-thumb');
      if(!item) return;
      obj.webview.send('data', { show: Number(item.dataset.index) });
    });
    this.slide_thumbnails.addEventListener('contextmenu', function(e) {
      var item = e.target.closest('.slide-thumb');
      if(!item) return;
      e.preventDefault();
      ipcRenderer.send('MainProcess', 'show-presentation-editor-slide-context-menu', {
        index: Number(item.dataset.index),
        x: Math.round(e.clientX),
        y: Math.round(e.clientY)
      });
    });
    this.slide_thumbnails.addEventListener('dragstart', function(e) {
      var item = e.target.closest('.slide-thumb');
      if(!item) return;
      obj.drag_slide_index = Number(item.dataset.index);
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(obj.drag_slide_index));
    });
    this.slide_thumbnails.addEventListener('dragover', function(e) {
      if(typeof obj.drag_slide_index != 'number') return;
      e.preventDefault();
      var drop_data = obj.getThumbnailDropData(e.clientY);
      if(!drop_data) {
        obj.clearThumbnailDropState();
        return;
      }
      obj.setThumbnailDropState(drop_data);
    });
    this.slide_thumbnails.addEventListener('drop', function(e) {
      if(typeof obj.drag_slide_index != 'number') return;
      e.preventDefault();
      var item = e.target.closest('.slide-thumb');
      var has_drop_target = typeof obj.drop_slide_index == 'number';
      var target_index = has_drop_target ?
        obj.drop_slide_index :
        item ? Number(item.dataset.index) : obj.total_slides - 1;
      var place_after = has_drop_target ? obj.drop_slide_after : true;
      obj.moveSlide(obj.drag_slide_index, target_index, place_after);
      obj.clearThumbnailDropState();
    });
    this.slide_thumbnails.addEventListener('dragend', function() {
      obj.clearThumbnailDropState();
    });
    this.slide_thumbnails.addEventListener('scroll', function() {
      obj.scheduleThumbnailRender();
    });

    // On IPC message
    ipcRenderer.on("PresentationEditorWindow", function(event, action, data) {
      switch(action) {
        case "request-close":
          obj.requestClose();
          break;
        case "go-to-code":
          obj.html_editor.show();
          obj.html_editor.setSlide(obj.getActionSlideIndex(data));
          break;
        case "go-to-slide":
          obj.webview.send('data', { show: obj.html_editor.getSlide() });
          break;
        case "insert-slide-after":
          obj.insertSlideAfter(obj.getActionSlideIndex(data));
          break;
        case "duplicate-slide":
          obj.duplicateSlide(obj.getActionSlideIndex(data));
          break;
      }
    });
  }

  /**
   * Initializes hidden webviews used for parallel thumbnail capture.
   */
  initThumbnailWorkers() {
    this.thumb_workers = [{
      id: 0,
      view: this.thumbview,
      ready: false,
      current_slide: undefined
    }];
    this.thumbview.classList.add('thumbnail-preview-worker');
    for(var i = 1; i < this.thumb_worker_count; i++) {
      var view = document.createElement('webview');
      view.id = 'thumbnail-preview-' + i;
      view.className = 'thumbnail-preview-worker';
      view.setAttribute('useragent', 'presentation-editor-thumbnail');
      view.setAttribute('nodeintegration', '');
      view.setAttribute('webpreferences',
        'backgroundThrottling=no, contextIsolation=no');
      this.thumbnail_preview_host.appendChild(view);
      this.thumb_workers.push({
        id: i,
        view: view,
        ready: false,
        current_slide: undefined
      });
    }
    this.thumb_workers.forEach((worker) => this.bindThumbnailWorker(worker));
  }

  /**
   * Binds runtime events for a hidden thumbnail worker.
   * @param {Object} worker
   */
  bindThumbnailWorker(worker) {
    worker.view.addEventListener('ipc-message', (e) => {
      if(e.args[0].ready !== undefined) {
        worker.ready = true;
        this.thumb_ready = this.getReadyThumbnailWorkers().length > 0;
        if(this.total_slides != e.args[0].ready) {
          this.updateSlidesCount(e.args[0].ready);
        }
        if(typeof this.pending_thumb_slide_after_reload == 'number') {
          worker.view.send('data', { show: this.pending_thumb_slide_after_reload });
        }
      } else if(e.args[0].slide !== undefined) {
        worker.current_slide = e.args[0].slide;
        this.thumb_ready = this.getReadyThumbnailWorkers().length > 0;
        if(Array.isArray(this.pending_thumb_render_indexes) &&
            this.pending_thumb_render_indexes.length) {
          var indexes = this.pending_thumb_render_indexes;
          this.pending_thumb_render_indexes = undefined;
          this.pending_thumb_slide_after_reload = undefined;
          this.requestThumbnailRender(indexes);
        } else if(this.full_thumb_refresh_on_ready) {
          this.full_thumb_refresh_on_ready = false;
          this.requestAllThumbnailRender();
        } else if(this.thumb_dirty_indexes.size) {
          this.scheduleThumbnailRender();
        }
      }
    });
  }

  /**
   * Returns every hidden thumbnail worker.
   * @returns {Object[]}
   */
  getThumbnailWorkers() {
    return this.thumb_workers;
  }

  /**
   * Returns thumbnail workers whose runtimes are ready.
   * @returns {Object[]}
   */
  getReadyThumbnailWorkers() {
    return this.thumb_workers.filter(function(worker) {
      return worker.ready;
    });
  }

  /**
   * Returns all hidden thumbnail webviews.
   * @returns {Electron.WebviewTag[]}
   */
  getThumbnailViews() {
    return this.thumb_workers.map(function(worker) {
      return worker.view;
    });
  }
  
  /**
   * Returns whether the editor contains unsaved changes.
   * @returns {Boolean}
   */
  hasUnsavedChanges() {
    return this.isTabChanged(this.html_editor) ||
      this.isTabChanged(this.js_editor) ||
      this.isTabChanged(this.css_editor);
  }

  /**
   * Shows close confirmation dialog.
   */
  showCloseDialog() {
    this.close_requested = true;
    this.close_file.innerText = this.presentation_title.innerText || '';
    this.close_dialog_cont.style.display = 'flex';
  }

  /**
   * Hides close confirmation dialog.
   */
  hideCloseDialog() {
    this.close_requested = false;
    this.close_dialog_cont.style.display = 'none';
  }

  /**
   * Requests presentation editor close.
   */
  requestClose() {
    if(this.hasUnsavedChanges()) {
      this.showCloseDialog();
    } else {
      this.confirmCloseWindow();
    }
  }

  /**
   * Completes close request in the main process.
   */
  confirmCloseWindow() {
    this.hideCloseDialog();
    ipcRenderer.send("MainProcess", "close-presentation-editor");
  }

  /**
   * Handles close dialog buttons.
   * @param {Number} state
   */
  async closeDialogButton(state) {
    if(state == 2) {
      try {
        await this.saveCode(this.current_slide);
      } catch(err) {
        console.error(err);
        return;
      }
      this.confirmCloseWindow();
    } else if(state == 1) {
      this.confirmCloseWindow();
    } else {
      this.hideCloseDialog();
    }
  }
  
  /**
   * Sets file path for presentation editor
   * @param {String} file_path - Absolute path to the presentation directory.
   */
  setPath(file_path, url) {
    this.file_path = file_path;
    this.url = url;
    var name = path.basename(file_path);;
    
    this.exe_file = name;
    this.html_editor.setPath(path.join(file_path, 'index.html'));
    this.js_editor.setPath(path.join(file_path, 'main.js'));
    this.css_editor.setPath(path.join(file_path, 'main.css'));
    this.updateSearchAllScriptPaths();
    
    document.getElementById('presentation-title').innerText = name;
    this.presentation_config = JSON.parse(fs.readFileSync(path.join(file_path, 'res/internal/config.json')).toString());
    this.slide_thumbnails.style.setProperty('--slide-thumbnail-aspect-ratio',
      this.presentation_config.slide_width + ' / ' + this.presentation_config.slide_height);
    var thumb_height = Math.max(1, Math.round(
      this.presentation_config.slide_height / this.presentation_config.slide_width * 320
    )) + 'px';
    this.getThumbnailViews().forEach(function(view) {
      view.style.width = '320px';
      view.style.height = thumb_height;
    });
    this.resetThumbnails(true);
    this.webview.src = url+'?lazy';
    this.getThumbnailViews().forEach(function(view) {
      view.src = url + '?lazy';
    });
    
    // Slide scale
    this.scaleSlide();
  }
  
  /**
   * Saves code and triggers frame update
   */
  async saveCode(target_slide = this.current_slide) {
    var html_changed = this.isTabChanged(this.html_editor);
    var js_changed = this.isTabChanged(this.js_editor);
    var css_changed = this.isTabChanged(this.css_editor);
    var previous_html_data;
    var html_data;
    var render_indexes = [];
    if(!html_changed && !js_changed && !css_changed) {
      return;
    }

    if(target_slide < 0) {
      target_slide = 0;
    }

    if(html_changed) {
      previous_html_data = this.getSlideSourceData(this.html_editor.code || '');
      html_data = this.getSlideSourceData();
    }
    if(html_changed || css_changed) {
      this.cancelThumbnailRenderWork();
    }

    await Promise.all([
      this.html_editor.save(),
      this.js_editor.save(),
      this.css_editor.save()
    ]);

    if(js_changed) {
      this.reloadViews(target_slide);
      return;
    }

    if(html_changed) {
      var data = html_data || this.getSlideSourceData();
      target_slide = Math.max(0, Math.min(target_slide, Math.max(0, data.blocks.length - 1)));
      if(data.blocks.length != this.total_slides) {
        this.updateSlidesCount(data.blocks.length);
        this.cancelThumbnailRenderWork();
        render_indexes = this.getThumbnailRange(0);
        await this.syncAllSlidesToMainView(target_slide, data);
        this.syncAllSlidesToThumbnailViews(target_slide, data)
          .then(() => this.requestThumbnailRender(render_indexes))
          .catch((err) => console.warn('thumbnail sync:', err));
      } else {
        var changed_slide_indexes = this.getChangedSlideIndexes(previous_html_data, data);
        if(changed_slide_indexes.length) {
          render_indexes = changed_slide_indexes;
          await this.syncSlidesToMainView(changed_slide_indexes, target_slide, data);
          this.syncSlidesToThumbnailViews(changed_slide_indexes, target_slide, data)
            .then(() => this.requestThumbnailRender(render_indexes))
            .catch((err) => console.warn('thumbnail sync:', err));
        }
      }
    }
    if(css_changed) {
      await this.applyCssToMainView();
      if(!render_indexes.length) {
        render_indexes = [target_slide];
      }
      this.applyCssToThumbnailViews()
        .then(() => this.requestThumbnailRender(render_indexes))
        .catch((err) => console.warn('thumbnail css sync:', err));
    }
    if(render_indexes.length && !html_changed && !css_changed) {
      this.requestThumbnailRender(render_indexes);
    }
  }
  
  /**
   * Resets thumbnail rendering state.
   */
  resetThumbnails(clear_list = false) {
    this.thumb_ready = false;
    this.thumb_render_token += 1;
    if(this.thumb_render_timer) {
      clearTimeout(this.thumb_render_timer);
      this.thumb_render_timer = undefined;
    }
    this.thumb_render_in_flight = false;
    this.thumb_rerun_requested = false;
    this.thumb_dirty_indexes = new Set();
    this.full_thumb_refresh_on_ready = true;
    this.pending_thumb_render_indexes = undefined;
    this.pending_thumb_slide_after_reload = undefined;
    this.thumb_workers.forEach(function(worker) {
      worker.ready = false;
      worker.current_slide = undefined;
    });
    if(clear_list) {
      this.slide_thumbnails.innerHTML = '';
    }
  }

  /**
   * Updates slide count UI and thumbnail placeholders.
   * @param {Number} total_slides
   */
  updateSlidesCount(total_slides) {
    this.setSlidesCount(total_slides);
    this.buildThumbnails();
  }

  /**
   * Updates slide count UI without rebuilding thumbnails.
   * @param {Number} total_slides
   */
  setSlidesCount(total_slides) {
    this.total_slides = total_slides;
    document.getElementById('total-slides').innerText = '/ ' + total_slides;
    document.getElementById('set-slide').max = Math.max(total_slides, 1);
  }

  /**
   * Returns whether the supplied tab contains unsaved changes.
   * @param {PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB} tab_obj
   * @returns {Boolean}
   */
  isTabChanged(tab_obj) {
    return !!(tab_obj && tab_obj.tab && tab_obj.tab.classList.contains('changed'));
  }

  /**
   * Creates a thumbnail DOM item.
   * @param {Number} index
   * @param {String} data_url
   * @returns {HTMLDivElement}
   */
  createThumbnailItem(index, data_url = '') {
    var item = document.createElement('div');
    item.className = 'slide-thumb';
    if(!data_url) {
      item.classList.add('loading');
    }
    item.draggable = true;
    item.dataset.index = index;
    item.innerHTML = '<div class="slide-thumb-preview"><img alt="" draggable="false"></div>' +
      '<span class="slide-thumb-number">' + (index + 1) + '</span>';
    if(data_url) {
      item.querySelector('img').src = data_url;
    }
    return item;
  }

  /**
   * Builds the thumbnail list.
   */
  buildThumbnails() {
    if(this.slide_thumbnails.childElementCount == this.total_slides) {
      this.renumberThumbnails();
      this.markAllThumbnailsDirty();
      this.scheduleThumbnailRender(true);
      return;
    }
    this.slide_thumbnails.innerHTML = '';
    for(var i = 0; i < this.total_slides; i++) {
      this.slide_thumbnails.appendChild(this.createThumbnailItem(i));
    }
    this.markAllThumbnailsDirty();
    this.setActiveThumbnail(this.current_slide);
    this.scheduleThumbnailRender(true);
  }

  /**
   * Renumbers thumbnail indices and labels.
   */
  renumberThumbnails() {
    this.slide_thumbnails.querySelectorAll('.slide-thumb').forEach(function(item, index) {
      item.dataset.index = index;
      item.querySelector('.slide-thumb-number').innerText = index + 1;
    });
    this.setActiveThumbnail(this.current_slide);
  }

  /**
   * Returns thumbnail DOM item by slide index.
   * @param {Number} index
   * @returns {HTMLDivElement|null}
   */
  getThumbnailItem(index) {
    return this.slide_thumbnails.querySelector('.slide-thumb[data-index="' + index + '"]');
  }

  /**
   * Sets a thumbnail loading state.
   * @param {Number} index
   * @param {Boolean} loading
   */
  setThumbnailLoading(index, loading) {
    var item = this.getThumbnailItem(index);
    if(item) {
      item.classList.toggle('loading', !!loading);
    }
  }

  /**
   * Marks supplied thumbnails as dirty and pending re-render.
   * @param {Number|Number[]} indexes
   * @param {Boolean} clear_image
   */
  markThumbnailDirty(indexes, clear_image = false) {
    indexes = this.normalizeThumbnailIndexes(indexes);
    indexes.forEach((index) => {
      this.thumb_dirty_indexes.add(index);
      var item = this.getThumbnailItem(index);
      if(item) {
        item.classList.add('loading');
        if(clear_image) {
          item.querySelector('img').removeAttribute('src');
        }
      }
    });
  }

  /**
   * Marks every thumbnail as dirty.
   * @param {Boolean} clear_image
   */
  markAllThumbnailsDirty(clear_image = false) {
    this.markThumbnailDirty(this.getThumbnailRange(0), clear_image);
  }

  /**
   * Returns a normalized thumbnail index list.
   * @param {Number|Number[]} indexes
   * @returns {Number[]}
   */
  normalizeThumbnailIndexes(indexes) {
    if(!Array.isArray(indexes)) {
      indexes = [indexes];
    }
    var out = [];
    var seen = new Set();
    indexes.forEach((index) => {
      index = Number(index);
      if(!Number.isFinite(index) || index < 0 || index >= this.total_slides ||
          seen.has(index)) {
        return;
      }
      seen.add(index);
      out.push(index);
    });
    return out;
  }

  /**
   * Returns thumbnail indices from start to the last slide.
   * @param {Number} start_index
   * @returns {Number[]}
   */
  getThumbnailRange(start_index = 0) {
    var indexes = [];
    start_index = Math.max(0, start_index);
    for(var i = start_index; i < this.total_slides; i++) {
      indexes.push(i);
    }
    return indexes;
  }

  /**
   * Requests full thumbnail rendering.
   */
  requestAllThumbnailRender() {
    this.markAllThumbnailsDirty();
    this.scheduleThumbnailRender(true);
  }

  /**
   * Requests thumbnail rendering for the supplied slide indices.
   * @param {Number|Number[]} indexes
   */
  requestThumbnailRender(indexes) {
    indexes = this.normalizeThumbnailIndexes(indexes);
    if(!indexes.length) {
      return;
    }
    this.markThumbnailDirty(indexes);
    if(!this.getReadyThumbnailWorkers().length) {
      this.pending_thumb_render_indexes = indexes;
      return;
    }
    this.pending_thumb_render_indexes = undefined;
    this.scheduleThumbnailRender(true);
  }

  /**
   * Sets active thumbnail styling.
   * @param {Number} index
   */
  setActiveThumbnail(index) {
    var items = this.slide_thumbnails.querySelectorAll('.slide-thumb');
    var active_item;
    items.forEach(function(item) {
      var is_active = Number(item.dataset.index) == index;
      item.classList.toggle('active', is_active);
      if(is_active) {
        active_item = item;
      }
    });
    if(active_item) {
      active_item.scrollIntoView({ block: 'nearest' });
    }
    if(Number.isFinite(index) && index >= 0 && active_item) {
      var img = active_item.querySelector('img');
      var has_image = !!(img && img.getAttribute('src'));
      if(has_image && !this.thumb_dirty_indexes.has(index)) {
        return;
      }
      this.markThumbnailDirty([index]);
      this.scheduleThumbnailRender(true);
    }
  }

  /**
   * Returns thumbnail indices that are currently visible.
   * Includes a small overscan so scrolling does not immediately show blanks.
   * @param {Number} overscan_items
   * @returns {Number[]}
   */
  getVisibleThumbnailIndexes(overscan_items = 1) {
    var indexes = [];
    var view_top = this.slide_thumbnails.scrollTop;
    var view_bottom = view_top + this.slide_thumbnails.clientHeight;
    this.slide_thumbnails.querySelectorAll('.slide-thumb').forEach(function(item) {
      var item_top = item.offsetTop;
      var item_bottom = item_top + item.offsetHeight;
      var overscan = item.offsetHeight * overscan_items;
      if(item_bottom >= view_top - overscan && item_top <= view_bottom + overscan) {
        indexes.push(Number(item.dataset.index));
      }
    });
    return indexes;
  }

  /**
   * Returns dirty thumbnail indices ordered by UI priority.
   * Active slide is first, then currently visible thumbnails, then the rest.
   * @returns {Number[]}
   */
  getThumbnailRenderQueue() {
    var queue = [];
    var seen = new Set();
    var add = (index) => {
      if(!this.thumb_dirty_indexes.has(index) || seen.has(index)) {
        return;
      }
      seen.add(index);
      queue.push(index);
    };

    add(this.current_slide);
    this.getVisibleThumbnailIndexes(1).forEach(add);
    this.slide_thumbnails.querySelectorAll('.slide-thumb').forEach(function(item) {
      add(Number(item.dataset.index));
    });
    return queue;
  }

  /**
   * Schedules throttled thumbnail rendering.
   * @param {Boolean} immediate
   */
  scheduleThumbnailRender(immediate = false) {
    if(this.thumb_render_timer) {
      clearTimeout(this.thumb_render_timer);
    }
    if(this.thumb_render_in_flight) {
      this.thumb_render_token += 1;
      this.thumb_rerun_requested = true;
    }
    var delay = immediate ? 0 : 120;
    this.thumb_render_timer = setTimeout(() => {
      this.thumb_render_timer = undefined;
      this.runThumbnailRenderLoop();
    }, delay);
  }

  /**
   * Cancels scheduled or in-flight thumbnail render work.
   */
  cancelThumbnailRenderWork() {
    this.thumb_render_token += 1;
    if(this.thumb_render_timer) {
      clearTimeout(this.thumb_render_timer);
      this.thumb_render_timer = undefined;
    }
    this.thumb_rerun_requested = false;
  }

  /**
   * Runs thumbnail rendering for dirty items in UI-priority order.
   */
  async runThumbnailRenderLoop() {
    if(!this.getReadyThumbnailWorkers().length) {
      return;
    }
    if(this.thumb_render_in_flight) {
      this.thumb_rerun_requested = true;
      return;
    }
    this.thumb_render_in_flight = true;
    try {
      do {
        this.thumb_rerun_requested = false;
        var indexes = this.getThumbnailRenderQueue();
        if(!indexes.length) {
          break;
        }
        var token = ++this.thumb_render_token;
        await this.renderSlideThumbnails(token, indexes);
      } while(this.thumb_rerun_requested);
    } finally {
      this.thumb_render_in_flight = false;
    }
  }

  /**
   * Renders slide thumbnails from the hidden preview webview.
   * @param {Number} token
   * @param {Number[]} indexes
   */
  async renderSlideThumbnails(token, indexes) {
    var workers = this.getReadyThumbnailWorkers();
    if(!workers.length) {
      return;
    }
    var next_index = 0;
    await Promise.all(workers.map(async(worker) => {
      while(next_index < indexes.length) {
        if(token != this.thumb_render_token) {
          return;
        }
        var slide_index = indexes[next_index++];
        this.setThumbnailLoading(slide_index, true);
        try {
          var image = await this.captureThumbnailImage(slide_index, token, worker);
          if(token != this.thumb_render_token) {
            return;
          }
          this.setThumbnailImage(slide_index, image.toDataURL());
        } catch(err) {
          if(token != this.thumb_render_token) {
            return;
          }
          console.warn('thumbnail:', err);
          try {
            var fallback_image = await this.captureThumbnailFallback(slide_index,
              token, worker);
            if(token != this.thumb_render_token) {
              return;
            }
            if(fallback_image) {
              this.setThumbnailImage(slide_index, fallback_image.toDataURL());
              continue;
            }
          } catch(fallback_err) {
            if(token != this.thumb_render_token) {
              return;
            }
            console.warn('thumbnail fallback:', fallback_err);
          }
          this.setThumbnailLoading(slide_index, false);
          this.thumb_dirty_indexes.delete(slide_index);
        }
      }
    }));
  }

  /**
   * Captures one thumbnail image with a retry when the first capture is empty
   * or the runtime has not settled on the requested slide yet.
   * @param {Number} index
   * @param {Number} token
   * @returns {Promise<Electron.NativeImage>}
   */
  async captureThumbnailImage(index, token, worker) {
    var last_image;
    for(var attempt = 0; attempt < 6; attempt++) {
      var prepared = await this.prepareThumbnailCapture(index, worker);
      var prepared_index = prepared.current_slide;
      worker.current_slide = prepared_index;
      if(token != this.thumb_render_token) {
        throw new Error('Thumbnail capture canceled.');
      }
      if(prepared_index != index) {
        await new Promise(resolve => setTimeout(resolve, 40));
        continue;
      }
      if(!prepared.ready) {
        await new Promise(resolve => setTimeout(resolve, 120));
        continue;
      }

      var image = await worker.view.capturePage();
      if(token != this.thumb_render_token) {
        throw new Error('Thumbnail capture canceled.');
      }
      if(typeof image.isEmpty == 'function' && image.isEmpty()) {
        await new Promise(resolve => setTimeout(resolve, 60));
        continue;
      }
      last_image = image;

      await this.waitForThumbnailStability(worker);
      var stable_image = await worker.view.capturePage();
      if(token != this.thumb_render_token) {
        throw new Error('Thumbnail capture canceled.');
      }
      if(typeof stable_image.isEmpty == 'function' && stable_image.isEmpty()) {
        await new Promise(resolve => setTimeout(resolve, 60));
        continue;
      }
      last_image = stable_image;
      await this.waitForThumbnailStability(worker);
      var final_image = await worker.view.capturePage();
      if(token != this.thumb_render_token) {
        throw new Error('Thumbnail capture canceled.');
      }
      if(typeof final_image.isEmpty == 'function' && final_image.isEmpty()) {
        await new Promise(resolve => setTimeout(resolve, 60));
        continue;
      }
      last_image = final_image;
      if(this.sameThumbnailImage(image, stable_image) &&
          this.sameThumbnailImage(stable_image, final_image)) {
        return final_image;
      }
      await new Promise(resolve => setTimeout(resolve, 120));
    }
    if(last_image) return last_image;
    throw new Error('Thumbnail capture failed.');
  }

  /**
   * Captures the thumbnail webview even when readiness checks fail.
   * @param {Number} index
   * @param {Number} token
   * @param {Object} worker
   * @returns {Promise<Electron.NativeImage|undefined>}
   */
  async captureThumbnailFallback(index, token, worker) {
    try {
      var prepared = await this.prepareThumbnailCapture(index, worker);
      if(prepared && typeof prepared.current_slide == 'number') {
        worker.current_slide = prepared.current_slide;
      }
    } catch(err) {}
    if(token != this.thumb_render_token) {
      throw new Error('Thumbnail capture canceled.');
    }
    try {
      await this.waitForThumbnailStability(worker);
    } catch(err) {}
    if(token != this.thumb_render_token) {
      throw new Error('Thumbnail capture canceled.');
    }
    var image = await worker.view.capturePage();
    if(typeof image.isEmpty == 'function' && image.isEmpty()) {
      return undefined;
    }
    return image;
  }

  /**
   * Waits for the hidden thumbnail webview to settle before another capture.
   * @returns {Promise<void>}
   */
  async waitForThumbnailStability(worker) {
    await new Promise(resolve => setTimeout(resolve, 80));
    await worker.view.executeJavaScript(`new Promise(resolve => {
      requestAnimationFrame(function() {
        requestAnimationFrame(resolve);
      });
    });`);
  }

  /**
   * Returns whether two captured thumbnail bitmaps match exactly.
   * @param {Electron.NativeImage} image_a
   * @param {Electron.NativeImage} image_b
   * @returns {Boolean}
   */
  sameThumbnailImage(image_a, image_b) {
    if(!image_a || !image_b) {
      return false;
    }
    var size_a = image_a.getSize();
    var size_b = image_b.getSize();
    if(size_a.width != size_b.width || size_a.height != size_b.height) {
      return false;
    }
    return image_a.toBitmap().equals(image_b.toBitmap());
  }

  /**
   * Prepares the thumbnail webview for slide capture.
   * Falls back to legacy presentation runtimes that do not expose
   * prepareSlideForCapture().
   * @param {Number} index
   * @returns {Promise<number>}
   */
  async prepareThumbnailCapture(index, worker) {
    return await worker.view.executeJavaScript(`(async function() {
      if(typeof presentation == 'undefined') {
        throw new Error('Presentation runtime is not ready.');
      }
      window.__JSLAB_PRESENTATION_THUMBNAIL_MODE__ = true;
      if(!window.__JSLAB_PRESENTATION_THUMBNAIL_CONSOLE_PATCHED__) {
        window.__JSLAB_PRESENTATION_THUMBNAIL_CONSOLE_PATCHED__ = true;
        var original_error = console.error.bind(console);
        var original_warn = console.warn.bind(console);
        var suppress = function(args) {
          var label = args && args.length ? String(args[0] || '') : '';
          return label == 'img-pdf:' ||
            label == 'plot-json:' ||
            label == 'scene-3d-json:';
        };
        console.error = function() {
          if(suppress(arguments)) return;
          original_error.apply(console, arguments);
        };
        console.warn = function() {
          if(suppress(arguments)) return;
          original_warn.apply(console, arguments);
        };
      }
      var withTimeout = function(promise, timeout_ms) {
        return new Promise(function(resolve) {
          var done = false;
          var timer = setTimeout(function() {
            if(done) return;
            done = true;
            resolve(false);
          }, timeout_ms);
          Promise.resolve(promise).then(function(value) {
            if(done) return;
            done = true;
            clearTimeout(timer);
            resolve(value);
          }).catch(function() {
            if(done) return;
            done = true;
            clearTimeout(timer);
            resolve(false);
          });
        });
      };
      var settleFailedAsyncElements = function(slide) {
        if(!slide || typeof slide.querySelectorAll != 'function') return;
        slide.querySelectorAll('img-pdf, plot-json, scene-3d-json').forEach(function(el) {
          if(el._render_promise) return;
          if(!el._finished_loading) {
            el._render_failed = true;
            el._finished_loading = true;
          }
        });
      };
      if(typeof presentation.setSlide == 'function') {
        presentation.setSlide(${index});
      } else if(typeof presentation.showSlide == 'function') {
        presentation.showSlide(${index});
      } else {
        throw new Error('Presentation runtime does not support slide capture.');
      }
      if(presentation.slides && presentation.slides[${index}] &&
          typeof presentation._lazyRender == 'function') {
        try {
          await withTimeout(presentation._lazyRender(presentation.slides[${index}]), 1500);
        } catch(err) {}
      }
      if(presentation.slides && presentation.slides[${index}]) {
        settleFailedAsyncElements(presentation.slides[${index}]);
      }
      if(presentation.slides && presentation.slides[${index}] &&
          typeof presentation._waitForSlideAssets == 'function') {
        try {
          await withTimeout(presentation._waitForSlideAssets(presentation.slides[${index}]), 1500);
        } catch(err) {}
      }
      await new Promise(resolve => {
        requestAnimationFrame(function() {
          requestAnimationFrame(resolve);
        });
      });
      return {
        current_slide: presentation.current_slide,
        ready: true
      };
    })();`);
  }

  /**
   * Stores rendered thumbnail image.
   * @param {Number} index
   * @param {String} data_url
   */
  setThumbnailImage(index, data_url) {
    var item = this.getThumbnailItem(index);
    if(!item) {
      return;
    }
    var img = item.querySelector('img');
    if(data_url) {
      img.src = data_url;
    }
    item.classList.remove('loading');
    this.thumb_dirty_indexes.delete(index);
  }

  /**
   * Inserts a thumbnail placeholder.
   * @param {Number} index
   * @param {String} data_url
   */
  insertThumbnail(index, data_url = '') {
    var item = this.createThumbnailItem(index, data_url);
    var before = this.slide_thumbnails.children[index] || null;
    this.slide_thumbnails.insertBefore(item, before);
    this.renumberThumbnails();
  }

  /**
   * Duplicates a thumbnail item.
   * @param {Number} source_index
   * @param {Number} insert_index
   */
  duplicateThumbnail(source_index, insert_index) {
    var source_item = this.getThumbnailItem(source_index);
    var source_image = '';
    if(source_item) {
      source_image = source_item.querySelector('img').getAttribute('src') || '';
    }
    this.insertThumbnail(insert_index, source_image);
  }

  /**
   * Moves a thumbnail item.
   * @param {Number} from_index
   * @param {Number} to_index
   */
  moveThumbnail(from_index, to_index) {
    var item = this.slide_thumbnails.querySelector('.slide-thumb[data-index="' + from_index + '"]');
    if(!item) {
      return;
    }
    item.remove();
    var before = this.slide_thumbnails.children[to_index] || null;
    this.slide_thumbnails.insertBefore(item, before);
    this.renumberThumbnails();
  }

  /**
   * Clears drag-and-drop thumbnail state.
   */
  clearThumbnailDropState() {
    this.drag_slide_index = undefined;
    this.drop_slide_index = undefined;
    this.drop_slide_after = false;
    this.slide_thumbnails.classList.remove('drop-active');
    this.slide_thumbnails.style.removeProperty('--slide-thumbnail-drop-y');
    this.slide_thumbnails.querySelectorAll('.slide-thumb').forEach(function(item) {
      item.classList.remove('dragging');
    });
  }

  /**
   * Returns thumbnail drag target data for the current pointer position.
   * @param {Number} client_y
   * @returns {Object|undefined}
   */
  getThumbnailDropData(client_y) {
    var items = Array.from(this.slide_thumbnails.querySelectorAll('.slide-thumb'));
    if(!items.length) {
      return;
    }

    var rect = this.slide_thumbnails.getBoundingClientRect();
    var local_y = client_y - rect.top + this.slide_thumbnails.scrollTop;
    var insert_index = items.length;
    for(var i = 0; i < items.length; i++) {
      var item = items[i];
      if(local_y < item.offsetTop + item.offsetHeight / 2) {
        insert_index = i;
        break;
      }
    }

    var previous_item = insert_index > 0 ? items[insert_index - 1] : undefined;
    var next_item = insert_index < items.length ? items[insert_index] : undefined;
    var indicator_y;
    if(previous_item && next_item) {
      indicator_y = previous_item.offsetTop + previous_item.offsetHeight +
        (next_item.offsetTop - previous_item.offsetTop - previous_item.offsetHeight) / 2;
    } else if(next_item) {
      indicator_y = Math.max(4, next_item.offsetTop / 2);
    } else {
      indicator_y = previous_item.offsetTop + previous_item.offsetHeight +
        Math.max(6, (this.slide_thumbnails.scrollHeight - previous_item.offsetTop -
          previous_item.offsetHeight) / 2);
    }

    if(insert_index <= 0) {
      return { index: 0, after: false, y: indicator_y };
    }
    if(insert_index >= items.length) {
      return { index: items.length - 1, after: true, y: indicator_y };
    }
    return { index: insert_index, after: false, y: indicator_y };
  }

  /**
   * Sets current thumbnail drop target.
   * @param {Object} data
   */
  setThumbnailDropState(data) {
    this.drop_slide_index = data.index;
    this.drop_slide_after = data.after;
    this.slide_thumbnails.style.setProperty('--slide-thumbnail-drop-y',
      Math.round(data.y) + 'px');
    this.slide_thumbnails.classList.add('drop-active');
  }

  /**
   * Returns current slide index for an editor action.
   * @param {Object} data
   * @returns {Number}
   */
  getActionSlideIndex(data) {
    var index;
    if(data && data.source == 'code') {
      index = this.html_editor.getSlide();
    } else if(data && typeof data.index == 'number') {
      index = data.index;
    } else {
      index = this.current_slide;
    }
    if(index < 0 || !Number.isFinite(index)) {
      index = this.current_slide;
    }
    return Math.max(0, Math.min(index, Math.max(0, this.total_slides - 1)));
  }

  /**
   * Collects slide blocks from the HTML editor.
   * @param {String} [source]
   * @returns {Object}
   */
  getSlideSourceData(source) {
    source = arguments.length ?
      String(source) :
      this.html_editor.code_editor.getValue();
    var ranges = [];
    var re = /<\s*slide\b[^>]*>[\s\S]*?<\/\s*slide\s*>/gi;
    var match;
    while((match = re.exec(source))) {
      ranges.push({ start: match.index, end: re.lastIndex });
    }
    var eol = source.includes('\r\n') ? '\r\n' : '\n';
    var separator = ranges.length > 1 ? source.slice(ranges[0].end, ranges[1].start) : eol + eol;
    if(!separator) {
      separator = eol + eol;
    }
    return {
      source: source,
      prefix: ranges.length ? source.slice(0, ranges[0].start) : source,
      suffix: ranges.length ? source.slice(ranges[ranges.length - 1].end) : '',
      blocks: ranges.map(function(range) {
        return source.slice(range.start, range.end);
      }),
      separator: separator,
      eol: eol
    };
  }

  /**
   * Returns slide indexes whose source changed between two editor snapshots.
   * @param {Object} previous_data
   * @param {Object} data
   * @returns {Number[]}
   */
  getChangedSlideIndexes(previous_data, data) {
    if(!previous_data || !data ||
        previous_data.blocks.length != data.blocks.length) {
      return [];
    }
    var indexes = [];
    for(var i = 0; i < data.blocks.length; i++) {
      if(previous_data.blocks[i] != data.blocks[i]) {
        indexes.push(i);
      }
    }
    return indexes;
  }

  /**
   * Returns slide HTML joined with the editor separator.
   * @param {Object} data
   * @returns {String}
   */
  getSlidesHtml(data) {
    if(!data.blocks.length) {
      return '';
    }
    return data.blocks.join(data.separator);
  }

  /**
   * Creates a new blank slide block.
   * @param {Object} data
   * @returns {String}
   */
  createSlideBlock(data) {
    return '<slide>' + data.eol + '</slide>';
  }

  /**
   * Replaces all slides in a view without reloading the page.
   * @param {Electron.WebviewTag} view
   * @param {String} slides_html
   * @param {Number} active_index
   * @returns {Promise<void>}
   */
  async syncAllSlidesToView(view, slides_html, active_index) {
    await view.executeJavaScript('presentation.replaceSlides(' +
      JSON.stringify(slides_html) + ', ' + active_index + ');');
  }

  /**
   * Syncs the full slide list to the main preview webview.
   * @param {Number} active_index
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async syncAllSlidesToMainView(active_index, data = this.getSlideSourceData()) {
    var slides_html = this.getSlidesHtml(data);
    await this.syncAllSlidesToView(this.webview, slides_html, active_index);
  }

  /**
   * Syncs the full slide list to the thumbnail worker webviews.
   * @param {Number} active_index
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async syncAllSlidesToThumbnailViews(active_index, data = this.getSlideSourceData()) {
    var slides_html = this.getSlidesHtml(data);
    await Promise.all(this.getThumbnailViews().map((view) =>
      this.syncAllSlidesToView(view, slides_html, active_index)));
    this.thumb_workers.forEach(function(worker) {
      worker.current_slide = active_index;
    });
  }

  /**
   * Replaces one slide in a view without reloading the page.
   * @param {Electron.WebviewTag} view
   * @param {Number} index
   * @param {String} slide_html
   * @returns {Promise<void>}
   */
  async syncSlideToView(view, index, slide_html) {
    await view.executeJavaScript('presentation.replaceSlide(' +
      index + ', ' + JSON.stringify(slide_html) + ');');
  }

  /**
   * Replaces changed slides in a view without reloading the page.
   * @param {Electron.WebviewTag} view
   * @param {Number[]} indexes
   * @param {Object} data
   * @param {Number} active_index
   * @returns {Promise<void>}
   */
  async syncSlidesToView(view, indexes, data, active_index) {
    var slide_map = {};
    indexes.forEach(function(index) {
      slide_map[index] = data.blocks[index];
    });
    await view.executeJavaScript('(function() {' +
      'var slide_map = ' + JSON.stringify(slide_map) + ';' +
      'Object.keys(slide_map).map(function(key) {' +
      'return Number(key);' +
      '}).sort(function(a, b) {' +
      'return a - b;' +
      '}).forEach(function(index) {' +
      'presentation.replaceSlide(index, slide_map[index]);' +
      '});' +
      'presentation.setSlide(' + JSON.stringify(active_index) + ');' +
      'return presentation.current_slide;' +
      '})();');
  }

  /**
   * Syncs the full slide list to the loaded preview and thumbnail views.
   * @param {Number} active_index
   * @returns {Promise<void>}
   */
  async syncAllSlidesToViews(active_index) {
    var data = this.getSlideSourceData();
    await this.syncAllSlidesToMainView(active_index, data);
    await this.syncAllSlidesToThumbnailViews(active_index, data);
  }

  /**
   * Syncs selected slides to the loaded preview and thumbnail views.
   * @param {Number[]} indexes
   * @param {Number} active_index
   * @param {Object} data
   * @returns {Promise<void>}
   */
  normalizeSyncSlideIndexes(indexes, active_index, data = this.getSlideSourceData()) {
    indexes = this.normalizeSlideIndexes(indexes, data.blocks.length);
    if(!indexes.length) {
      return { indexes: [], active_index: active_index, data: data };
    }
    active_index = Math.max(0, Math.min(active_index, Math.max(0, data.blocks.length - 1)));
    return { indexes: indexes, active_index: active_index, data: data };
  }

  /**
   * Syncs selected slides to the main preview webview.
   * @param {Number[]} indexes
   * @param {Number} active_index
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async syncSlidesToMainView(indexes, active_index, data = this.getSlideSourceData()) {
    var sync = this.normalizeSyncSlideIndexes(indexes, active_index, data);
    if(!sync.indexes.length) {
      return;
    }
    await this.syncSlidesToView(this.webview, sync.indexes, sync.data,
      sync.active_index);
  }

  /**
   * Syncs selected slides to the thumbnail worker webviews.
   * @param {Number[]} indexes
   * @param {Number} active_index
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async syncSlidesToThumbnailViews(indexes, active_index, data = this.getSlideSourceData()) {
    var sync = this.normalizeSyncSlideIndexes(indexes, active_index, data);
    if(!sync.indexes.length) {
      return;
    }
    await Promise.all(this.getThumbnailViews().map((view) =>
      this.syncSlidesToView(view, sync.indexes, sync.data, sync.active_index)));
    this.thumb_workers.forEach(function(worker) {
      worker.current_slide = sync.active_index;
    });
  }

  /**
   * Syncs selected slides to the loaded preview and thumbnail views.
   * @param {Number[]} indexes
   * @param {Number} active_index
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async syncSlidesToViews(indexes, active_index, data = this.getSlideSourceData()) {
    await this.syncSlidesToMainView(indexes, active_index, data);
    await this.syncSlidesToThumbnailViews(indexes, active_index, data);
  }

  /**
   * Syncs the currently edited slide to the loaded preview and thumbnail views.
   * @param {Number} index
   * @returns {Promise<void>}
   */
  async syncCurrentSlideToViews(index) {
    await this.syncSlidesToViews([index], index);
  }

  /**
   * Returns a normalized slide index list.
   * @param {Number|Number[]} indexes
   * @param {Number} slide_count
   * @returns {Number[]}
   */
  normalizeSlideIndexes(indexes, slide_count = this.total_slides) {
    if(!Array.isArray(indexes)) {
      indexes = [indexes];
    }
    var out = [];
    var seen = new Set();
    indexes.forEach((index) => {
      index = Number(index);
      if(!Number.isFinite(index) || index < 0 || index >= slide_count ||
          seen.has(index)) {
        return;
      }
      seen.add(index);
      out.push(index);
    });
    return out;
  }

  /**
   * Applies CSS overrides to a loaded view.
   * @param {Electron.WebviewTag} view
   * @param {String} css_text
   * @returns {Promise<void>}
   */
  async applyCssToView(view, css_text) {
    await view.executeJavaScript(
      'document.getElementById("dynamic-style-rules").textContent = ' +
      JSON.stringify(css_text) + ';'
    );
  }

  /**
   * Applies editor CSS to the main preview webview.
   * @returns {Promise<void>}
   */
  async applyCssToMainView() {
    var css_text = this.css_editor.code_editor.getValue();
    await this.applyCssToView(this.webview, css_text);
  }

  /**
   * Applies editor CSS to thumbnail worker webviews.
   * @returns {Promise<void>}
   */
  async applyCssToThumbnailViews() {
    var css_text = this.css_editor.code_editor.getValue();
    await Promise.all(this.getThumbnailViews().map((view) =>
      this.applyCssToView(view, css_text)));
  }

  /**
   * Applies editor CSS to both loaded views.
   * @returns {Promise<void>}
   */
  async applyCssToViews() {
    await this.applyCssToMainView();
    await this.applyCssToThumbnailViews();
  }

  /**
   * Reloads both views and restores the current slide afterwards.
   * @param {Number} target_slide
   */
  reloadViews(target_slide) {
    this.pending_slide_after_reload = target_slide;
    this.pending_thumb_slide_after_reload = target_slide;
    this.pending_thumb_render_indexes = [target_slide];
    this.thumb_ready = false;
    this.thumb_render_token += 1;
    this.full_thumb_refresh_on_ready = false;
    this.thumb_workers.forEach(function(worker) {
      worker.ready = false;
      worker.current_slide = undefined;
    });
    this.webview.reload();
    this.getThumbnailViews().forEach(function(view) {
      view.reload();
    });
  }

  /**
   * Applies updated slide blocks to the HTML editor.
   * @param {Object} data
   * @param {String[]} blocks
   * @param {Number} active_index
   */
  applySlideBlocks(data, blocks, active_index) {
    var new_source;
    if(blocks.length) {
      new_source = data.prefix + blocks[0];
      for(var i = 1; i < blocks.length; i++) {
        new_source += data.separator + blocks[i];
      }
      new_source += data.suffix;
    } else {
      new_source = data.source;
    }
    this.html_editor.code_editor.setValue(new_source);
    this.current_slide = Math.max(0, Math.min(active_index, blocks.length - 1));
    this.setSlidesCount(blocks.length);
    document.getElementById('set-slide').value = this.current_slide + 1;
    this.setActiveThumbnail(this.current_slide);
    this.html_editor.setSlide(this.current_slide);
  }

  /**
   * Inserts a new slide after the supplied index.
   * @param {Number} index
   */
  async insertSlideAfter(index) {
    this.cancelThumbnailRenderWork();
    var data = this.getSlideSourceData();
    var insert_index = Math.max(0, Math.min(index + 1, data.blocks.length));
    data.blocks.splice(insert_index, 0, this.createSlideBlock(data));
    this.applySlideBlocks(data, data.blocks, insert_index);
    this.insertThumbnail(insert_index);
    this.markThumbnailDirty([insert_index]);
    this.setActiveThumbnail(this.current_slide);
    await this.syncAllSlidesToViews(this.current_slide);
    this.scheduleThumbnailRender(true);
  }

  /**
   * Duplicates the slide at the supplied index.
   * @param {Number} index
   */
  async duplicateSlide(index) {
    this.cancelThumbnailRenderWork();
    var data = this.getSlideSourceData();
    if(index < 0 || index >= data.blocks.length) {
      return;
    }
    var insert_index = index + 1;
    data.blocks.splice(insert_index, 0, data.blocks[index]);
    this.applySlideBlocks(data, data.blocks, insert_index);
    this.duplicateThumbnail(index, insert_index);
    this.markThumbnailDirty([insert_index]);
    this.setActiveThumbnail(this.current_slide);
    await this.syncAllSlidesToViews(this.current_slide);
    this.scheduleThumbnailRender(true);
  }

  /**
   * Moves a slide to a new position.
   * @param {Number} from_index
   * @param {Number} target_index
   * @param {Boolean} place_after
   */
  async moveSlide(from_index, target_index, place_after) {
    this.cancelThumbnailRenderWork();
    var data = this.getSlideSourceData();
    if(from_index < 0 || from_index >= data.blocks.length ||
        target_index < 0 || target_index >= data.blocks.length) {
      return;
    }
    var insert_index = target_index + (place_after ? 1 : 0);
    if(insert_index > from_index) {
      insert_index -= 1;
    }
    if(insert_index == from_index) {
      return;
    }
    var block = data.blocks.splice(from_index, 1)[0];
    data.blocks.splice(insert_index, 0, block);
    this.applySlideBlocks(data, data.blocks, insert_index);
    this.moveThumbnail(from_index, insert_index);
    this.setActiveThumbnail(this.current_slide);
    await this.syncAllSlidesToViews(this.current_slide);
  }
  
  /**
   * Scale slide
   */
  scaleSlide() {
    if(!this.presentation_config || !this.preview_panel) {
      return;
    }
    const width = this.preview_panel.clientWidth - 20;
    const reserved_height = this.presentation_title.offsetHeight +
      this.slide_controls.offsetHeight + 30;
    const height = this.preview_panel.clientHeight - reserved_height;
    if(width <= 0 || height <= 0) {
      return;
    }
    const scale = Math.min(width / this.presentation_config.slide_width,
      height / this.presentation_config.slide_height);
    this.webview_wrap.style.width = `${this.presentation_config.slide_width * scale}px`;
    this.webview_wrap.style.height = `${this.presentation_config.slide_height * scale}px`;
  }

  /**
   * Creates adapter expected by editor search-all module.
   * @returns {object}
   */
  createSearchAllScriptManager() {
    var obj = this;
    var manager = {
      scripts: [],
      active_tab: this.active_tab,
      getScriptByTab: function(tab) {
        var i = this.scripts.findIndex(function(script) {
          return script.tab == tab;
        });
        if(i > -1) {
          return [this.scripts[i], i];
        }
        return [undefined, -1];
      },
      getScriptByPath: function(script_path) {
        var i = this.scripts.findIndex(function(script) {
          return script.path == script_path;
        });
        if(i > -1) {
          return [this.scripts[i], i];
        }
        return [undefined, -1];
      }
    };

    function makeScript(tab_obj, name) {
      return {
        tab: tab_obj.tab,
        path: '',
        name: name,
        code_editor: tab_obj.code_editor,
        activate: function() {
          tab_obj.show();
        }
      };
    }

    manager.scripts = [
      makeScript(this.html_editor, 'index.html'),
      makeScript(this.js_editor, 'main.js'),
      makeScript(this.css_editor, 'main.css')
    ];

    manager.active_tab = obj.active_tab;
    return manager;
  }

  /**
   * Updates search-all script paths after files are opened.
   */
  updateSearchAllScriptPaths() {
    if(!this.script_manager || !this.script_manager.scripts) {
      return;
    }
    if(this.script_manager.scripts[0]) {
      this.script_manager.scripts[0].path = this.html_editor.file_path || '';
    }
    if(this.script_manager.scripts[1]) {
      this.script_manager.scripts[1].path = this.js_editor.file_path || '';
    }
    if(this.script_manager.scripts[2]) {
      this.script_manager.scripts[2].path = this.css_editor.file_path || '';
    }
  }
}

var presentation_editor = new PRDC_JSLAB_PRESENTATION_EDITOR();
