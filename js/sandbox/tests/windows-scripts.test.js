/**
 * @file JSLAB windows scripts tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function readWindowScript(name) {
  return fs.readFileSync(path.join(__dirname, '..', '..', 'windows', name), 'utf8');
}

function readHtmlFile(name) {
  return fs.readFileSync(path.join(__dirname, '..', '..', '..', 'html', name), 'utf8');
}

function createClassList() {
  var classes = new Set();
  return {
    add: function(cls) { classes.add(cls); },
    remove: function(cls) { classes.delete(cls); },
    contains: function(cls) { return classes.has(cls); },
    toggle: function(cls, on) {
      if(on) {
        classes.add(cls);
      } else {
        classes.delete(cls);
      }
    }
  };
}

function createSimpleElement(id) {
  return {
    id: id,
    style: { display: 'none', height: '' },
    value: '',
    checked: false,
    scrollHeight: 20,
    classList: createClassList(),
    addEventListener: function() {},
    setAttribute: function(key, value) { this[key] = value; },
    focus: function() { this.focused = true; },
    setSelectionRange: function() {}
  };
}

tests.add('all js/windows scripts parse (presentation template after config substitution)', function(assert) {
  var files = [
    'mathjax-config.js',
    'plot.js',
    'presentation-editor.js',
    'presentation.js',
    'terminal.js',
    'ui.js'
  ];

  files.forEach(function(file_name) {
    var source = readWindowScript(file_name);
    if(file_name === 'presentation.js') {
      assert.ok(source.includes('%presentation_config%'));
      source = source.replace('%presentation_config%', '{}');
    }
    try {
      new vm.Script(source, { filename: file_name });
    } catch(err) {
      assert.fail(file_name + ' should parse: ' + (err && err.message ? err.message : String(err)));
    }
  });
}, { tags: ['unit', 'windows', 'sandbox'] });

tests.add('mathjax-config registers expected macros on window.MathJax', function(assert) {
  var source = readWindowScript('mathjax-config.js');
  var context = { window: {} };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'mathjax-config.js' });

  assert.equal(typeof context.window.MathJax, 'object');
  assert.equal(context.window.MathJax.startup.typeset, false);
  assert.equal(Array.isArray(context.window.MathJax.tex.macros.bm), true);
  assert.ok(String(context.window.MathJax.tex.macros.norm[0]).includes('lVert'));
}, { tags: ['unit', 'windows', 'sandbox'] });

tests.add('ui script initializes global ui instance without tabs container', function(assert) {
  var source = readWindowScript('ui.js');
  var context = {
    window: {},
    document: {
      querySelector: function() { return null; }
    }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'ui.js' });

  assert.equal(typeof context.ui, 'object');
}, { tags: ['unit', 'windows', 'sandbox'] });

tests.add('plot script creates global plot and batches restyle updates', function(assert) {
  var source = readWindowScript('plot.js');
  var records = {
    restyle: [],
    relayout: [],
    resized: 0
  };
  var figure_content = {
    appendChild: function(node) {
      this.last_child = node;
    }
  };

  var context = {
    document: {
      getElementById: function(id) {
        if(id === 'figure-content') {
          return figure_content;
        }
        return null;
      },
      createElement: function() {
        return {
          className: '',
          data: [],
          clientWidth: 640,
          clientHeight: 480
        };
      }
    },
    requestAnimationFrame: function(cb) {
      cb();
      return 1;
    },
    Plotly: {
      newPlot: async function() {},
      restyle: function(plot_cont, props, idxs) {
        records.restyle.push({ plot_cont, props, idxs });
      },
      relayout: function(plot_cont, layout) {
        records.relayout.push({ plot_cont, layout });
      },
      toImage: async function() { return 'data:image/png;base64,AA=='; },
      Plots: {
        resize: function() {
          records.resized += 1;
        },
        graphJson: function() {
          return { ok: true };
        }
      }
    }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'plot.js' });

  context.plot.setCont();
  context.plot.plot_cont.data = [{ id: 'a' }, { id: 'b' }];
  context.plot.updateData({ y: [1] }, 0);
  context.plot.updateDataById({ id: 'b', marker: { color: 'red' } });

  assert.equal(records.restyle.length >= 2, true);
  assert.equal(records.restyle[0].idxs[0], 0);
  assert.equal(records.restyle[1].idxs[0], 1);
  assert.equal(records.restyle[1].props['marker.color'][0], 'red');
}, { tags: ['unit', 'windows', 'sandbox'] });

tests.add('terminal script initializes terminal and updates UI state toggles', function(assert) {
  var source = readWindowScript('terminal.js');
  var els = {};
  var ids = [
    'messages-container',
    'message-input',
    'log-dialog',
    'settings-dialog',
    'settings',
    'timestamp',
    'autoscroll',
    'clear',
    'log',
    'to-bottom',
    'N-messages-max',
    'write-timestamps'
  ];
  ids.forEach(function(id) {
    els[id] = createSimpleElement(id);
  });

  els['message-input'].value = 'abc';
  els['log-dialog'].style.display = 'none';
  els['settings-dialog'].style.display = 'none';

  var q_settings_close = createSimpleElement('q-settings-close');
  var q_settings_change = createSimpleElement('q-settings-change');
  var q_log_close = createSimpleElement('q-log-close');

  class FakeTerminalBuffer {
    constructor() {
      this.log = [];
      this.last_class = undefined;
      this.last_tic = undefined;
      this.N_messages = 0;
    }
    clear() {
      this.log = [];
      this.last_class = undefined;
      this.last_tic = undefined;
      this.N_messages = 0;
    }
    scrollToBottom() {}
    enforceRenderedMessagesLimit() {}
    addMessage(msg_class, data) {
      this.N_messages += 1;
      this.last_class = msg_class;
      this.log.push({ class: msg_class, data: data, timestamp: '00:00:00.000' });
      return {};
    }
  }

  var context = {
    window: {
      PRDC_TERMINAL_BUFFER: FakeTerminalBuffer,
      getComputedStyle: function(el) {
        return { display: el.style.display || 'none' };
      }
    },
    document: {
      getElementById: function(id) {
        return els[id];
      },
      querySelector: function(selector) {
        if(selector === '#settings-dialog .options-close') return q_settings_close;
        if(selector === '#settings-dialog .change-settings') return q_settings_change;
        if(selector === '#log-dialog .options-close') return q_log_close;
        return createSimpleElement('query-miss');
      },
      querySelectorAll: function(selector) {
        if(selector === '.terminal-dialog') {
          return [els['settings-dialog'], els['log-dialog']];
        }
        return [];
      }
    },
    config: {},
    language: {
      currentString: function() { return 'missing buffer'; }
    }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'terminal.js' });

  assert.equal(typeof context.terminal, 'object');
  context.terminal.addMessage('info', 'hello');
  context.terminal.setTimestamp(false);
  context.terminal.setAutoscroll(false);
  context.terminal.setNMessagesMax(2);
  context.terminal.setWriteTimestamps(false);

  assert.equal(els['messages-container'].classList.contains('no-timestamp'), true);
  assert.equal(els['autoscroll'].classList.contains('active'), false);
  assert.equal(context.terminal.N_messages_max, context.terminal.min_messages_max);
  assert.equal(els['write-timestamps'].checked, false);
}, { tags: ['unit', 'windows', 'sandbox'] });

tests.add('presentation and editor window scripts retain expected runtime markers', function(assert) {
  var presentation_source = readWindowScript('presentation.js');
  var editor_source = readWindowScript('presentation-editor.js');
  var presentation_css = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'css', 'presentation.css'),
    'utf8'
  );
  var presentation_editor_css = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'css', 'presentation-editor.css'),
    'utf8'
  );
  var presentation_html = readHtmlFile('presentation.html');
  var presentation_editor_html = readHtmlFile('presentation-editor.html');

  assert.ok(presentation_source.includes('class PRDC_JSLAB_PRESENTATION'));
  assert.ok(presentation_source.includes("customElements.define('img-pdf'"));
  assert.ok(presentation_source.includes("customElements.define('plot-json'"));
  assert.ok(presentation_source.includes("customElements.define('scene-3d-json'"));
  assert.ok(presentation_source.includes('%presentation_config%'));
  assert.ok(presentation_source.includes('class PRDC_JSLAB_PRESENTATION_STOPWATCH'));
  assert.ok(presentation_source.includes("event.ctrlKey && !event.altKey && !event.shiftKey"));
  assert.ok(presentation_source.includes("event.key == 'F9'"));
  assert.ok(presentation_source.includes('ensurePdfJs()'));
  assert.ok(presentation_source.includes('ensurePlotly()'));
  assert.ok(presentation_source.includes('ensureMathJax()'));
  assert.ok(presentation_source.includes('ensureThree()'));
  assert.ok(presentation_source.includes('_getStandaloneModulePath(module_path)'));
  assert.ok(presentation_source.includes('_importBundledResourceModule(module_path)'));
  assert.ok(presentation_source.includes("_getAutoGlobalModulePath(prop)"));
  assert.ok(presentation_source.includes('_importResourceModule(module_path)'));
  assert.ok(presentation_source.includes('__standalone_modules'));
  assert.ok(presentation_source.includes('__importPresentationModule'));
  assert.ok(presentation_source.includes('_loadScriptOnce('));
  assert.ok(presentation_source.includes('_scheduleNextSlidePreload()'));
  assert.ok(presentation_source.includes('_preloadSlide(index'));
  assert.ok(presentation_source.includes('explicit_lazy'));
  assert.ok(presentation_source.includes("var is_lazy = !url_search_params.has('eager');"));
  assert.ok(presentation_source.includes('allow_lazy_preload'));
  assert.ok(presentation_source.includes('_withTimeout(promise'));
  assert.ok(presentation_source.includes('_shouldRenderElementNow(el)'));
  assert.ok(presentation_source.includes('if(!is_lazy) return true;'));
  assert.ok(presentation_source.includes('prepareSlideForCapture'));
  assert.ok(presentation_source.includes('_ensureSlideMath(slide)'));
  assert.ok(presentation_source.includes('_typesetMath(root)'));
  assert.ok(presentation_source.includes('_render_failed = true'));
  assert.ok(presentation_source.includes('video.error'));
  assert.ok(presentation_source.includes('logPresentationRenderError'));
  assert.ok(presentation_source.includes("var has_hash_sync = window.location.protocol != 'file:' && !is_embedded_web;"));
  assert.ok(presentation_source.includes('_getOpenModeError()'));
  assert.ok(presentation_source.includes('_showOpenModeError('));
  assert.ok(presentation_source.includes("this.config.presentation_mode == 'online'"));
  assert.ok(presentation_source.includes('_prepareSlideNotes'));
  assert.ok(presentation_source.includes('_isInsideSlideNotes'));
  assert.ok(presentation_source.includes('getSlideNotes(index'));
  assert.ok(presentation_source.includes('replaceSlide(index, slide_html)'));
  assert.ok(presentation_source.includes('replaceSlides(slides_html, active_index)'));
  assert.ok(presentation_source.includes("'contextmenu'"));
  assert.ok(presentation_css.includes('.presentation-line {'));
  assert.ok(presentation_css.includes(".presentation-line::after"));
  assert.ok(presentation_css.includes('slide notes'));
  assert.ok(presentation_css.includes('#presentation-open-error'));
  assert.ok(presentation_source.includes('_normalizeLayoutHelpers'));
  assert.ok(presentation_html.includes('<notes></notes>'));

  assert.ok(editor_source.includes('class PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB'));
  assert.ok(editor_source.includes('class PRDC_JSLAB_PRESENTATION_EDITOR'));
  assert.ok(editor_source.includes('writeFileWithTimeout'));
  assert.ok(editor_source.includes('fs.promises.writeFile'));
  assert.ok(editor_source.includes('insertSlideAfter'));
  assert.ok(editor_source.includes('duplicateSlide'));
  assert.ok(editor_source.includes('deleteSlide'));
  assert.ok(editor_source.includes('moveSlide'));
  assert.ok(editor_source.includes('getChangedSlideIndexes'));
  assert.ok(editor_source.includes('thumbnail_cache'));
  assert.ok(editor_source.includes('applyCachedThumbnailImages'));
  assert.ok(editor_source.includes('captureActiveThumbnailFromMainPreview'));
  assert.ok(editor_source.includes('render_indexes = this.getThumbnailRange(0);'));
  assert.ok(editor_source.includes('this.pending_thumb_render_indexes = render_indexes;'));
  assert.ok(editor_source.includes('syncSlidesToMainView(changed_slide_indexes'));
  assert.ok(editor_source.includes('syncSlidesToThumbnailViews(changed_slide_indexes'));
  assert.ok(editor_source.includes('syncAllSlidesToViews'));
  assert.ok(editor_source.includes('syncCurrentSlideToViews'));
  assert.ok(editor_source.includes('updateSlideHighlight'));
  assert.ok(editor_source.includes('CodeMirror-presentation-slide-line'));
  assert.ok(editor_source.includes("this.addUrlParams(url, ['lazy', 'preload'])"));
  assert.ok(editor_source.includes('prepareSlideForCapture(${index}, 15000)'));
  assert.ok(editor_source.includes('getSlideNotesHtml'));
  assert.ok(editor_source.includes('getSlideNotesText'));
  assert.ok(editor_source.includes('setSlideNotesText'));
  assert.ok(editor_source.includes('updateSlideNotesFromInput'));
  assert.ok(editor_source.includes('escapeSlideNotesText'));
  assert.ok(editor_source.includes('updateSlideNotes'));
  assert.ok(editor_source.includes('slide_notes_body'));
  assert.ok(editor_source.includes('requestThumbnailRender'));
  assert.ok(editor_source.includes('request-close'));
  assert.ok(editor_source.includes('closeDialogButton'));
  assert.ok(editor_source.includes('obj.html_editor.setSlide(obj.getActionSlideIndex(data));'));
  assert.ok(editor_source.includes('renderSlideThumbnails'));
  assert.ok(editor_source.includes('capturePage()'));
  assert.ok(editor_source.includes('captureThumbnailFallback'));
  assert.ok(editor_source.includes('__JSLAB_PRESENTATION_THUMBNAIL_MODE__'));
  assert.ok(editor_source.includes("document.getElementById('thumbnail-preview')"));
  assert.ok(editor_source.includes('removeThumbnail'));
  assert.ok(editor_source.includes('thumb_worker_count = 2'));
  assert.ok(editor_source.includes('initThumbnailWorkers()'));
  assert.ok(editor_source.includes('getReadyThumbnailWorkers()'));
  assert.ok(editor_source.includes('show-presentation-editor-slide-context-menu'));
  assert.ok(editor_source.includes('getThumbnailDropData'));
  assert.ok(editor_source.includes("slide_thumbnails.addEventListener('contextmenu'"));
  assert.ok(editor_source.includes("--slide-thumbnail-drop-y"));
  assert.ok(presentation_editor_css.includes('#slide-thumbnails::before'));
  assert.ok(presentation_editor_css.includes('#slide-notes'));
  assert.ok(presentation_editor_css.includes('border: 1px dashed #d7d7d7;'));
  assert.ok(presentation_editor_css.includes('#slide-notes::-webkit-scrollbar-thumb'));
  assert.ok(presentation_editor_css.includes('#slide-notes-body::-webkit-scrollbar-thumb'));
  assert.ok(presentation_editor_css.includes('resize: none;'));
  assert.ok(presentation_editor_css.includes('top: 54px;'));
  assert.ok(presentation_editor_css.includes('.CodeMirror-presentation-slide-line'));
  assert.ok(presentation_editor_html.includes('id="tab-save" src="../img/tab-save.svg" title-str="50" alt="Save"'));
  assert.ok(presentation_editor_html.includes('id="slide-notes"'));
  assert.ok(presentation_editor_html.includes('<textarea id="slide-notes-body"'));
  assert.ok(presentation_editor_html.includes('<str sid="554"></str>'));
  assert.ok(editor_source.includes('var presentation_editor = new PRDC_JSLAB_PRESENTATION_EDITOR();'));
}, { tags: ['unit', 'windows', 'sandbox'] });

tests.add('language workflow is explicit for editor and presentation-editor windows', function(assert) {
  var editor_init_source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'editor', 'init-editor.js'),
    'utf8'
  );
  var presentation_editor_source = readWindowScript('presentation-editor.js');
  var editor_html = readHtmlFile('editor.html');
  var presentation_editor_html = readHtmlFile('presentation-editor.html');
  var presentation_html = readHtmlFile('presentation.html');

  assert.ok(editor_init_source.includes('var language = new PRDC_JSLAB_LANGUAGE();'));
  assert.ok(presentation_editor_source.includes('var language = window.opener.jsl.inter.lang;'));
  assert.ok(presentation_editor_source.includes("require('../js/editor/search-all')"));

  var editor_dialog_idx = editor_html.indexOf('../js/code/dialog-search.js');
  var editor_init_idx = editor_html.indexOf('../js/editor/init-editor.js');
  assert.ok(editor_dialog_idx > -1);
  assert.ok(editor_init_idx > -1);
  assert.ok(editor_dialog_idx < editor_init_idx);

  var pe_dialog_idx = presentation_editor_html.indexOf('../js/code/dialog-search.js');
  var pe_window_idx = presentation_editor_html.indexOf('../js/windows/presentation-editor.js');
  assert.ok(pe_dialog_idx > -1);
  assert.ok(pe_window_idx > -1);
  assert.ok(pe_dialog_idx < pe_window_idx);
  assert.ok(presentation_editor_html.includes('id="slide-thumbnails"'));
  assert.ok(presentation_editor_html.includes('id="thumbnail-preview"'));
  assert.ok(presentation_editor_html.includes('id="close-dialog-cont"'));
  assert.ok(presentation_editor_html.includes('id="close-dialog-save"'));

  var globals_idx = presentation_html.indexOf('./res/internal/globals.js');
  var presentation_js_idx = presentation_html.indexOf('./res/internal/presentation.js');
  assert.ok(globals_idx > -1);
  assert.ok(presentation_js_idx > -1);
  assert.ok(globals_idx < presentation_js_idx);
}, { tags: ['unit', 'windows', 'sandbox', 'language'] });

exports.MODULE_TESTS = tests;
