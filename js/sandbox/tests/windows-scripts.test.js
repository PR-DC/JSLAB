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

  assert.ok(presentation_source.includes('class PRDC_JSLAB_PRESENTATION'));
  assert.ok(presentation_source.includes("customElements.define('img-pdf'"));
  assert.ok(presentation_source.includes("customElements.define('plot-json'"));
  assert.ok(presentation_source.includes("customElements.define('scene-3d-json'"));
  assert.ok(presentation_source.includes('%presentation_config%'));

  assert.ok(editor_source.includes('class PRDC_JSLAB_PRESENTATION_EDITOR_CODE_TAB'));
  assert.ok(editor_source.includes('class PRDC_JSLAB_PRESENTATION_EDITOR'));
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

  var globals_idx = presentation_html.indexOf('./res/internal/globals.js');
  var presentation_js_idx = presentation_html.indexOf('./res/internal/presentation.js');
  assert.ok(globals_idx > -1);
  assert.ok(presentation_js_idx > -1);
  assert.ok(globals_idx < presentation_js_idx);
}, { tags: ['unit', 'windows', 'sandbox', 'language'] });

exports.MODULE_TESTS = tests;
