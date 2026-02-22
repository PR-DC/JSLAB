/**
 * @file JSLAB docs submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const { PRDC_JSLAB_LIB_DOCS } = require('../docs');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');

var tests = new PRDC_JSLAB_TESTS();

function createDocsHarness() {
  var errors = [];
  var editor_calls = [];
  var disp_calls = [];
  var disp_monospaced_calls = [];
  var docs_payload = {
    global: {
      basic: {
        disp: {
          kind: 'function',
          source_filename: 'basic.js',
          source_lineno: 10,
          description: 'display'
        }
      }
    },
    lib: {
      path: {
        pathJoin: {
          kind: 'function',
          source_filename: 'path.js',
          source_lineno: 20,
          description: 'join path'
        }
      }
    }
  };

  var jsl = {
    app_path: path.join('C:', 'Electron', 'JSLAB'),
    no_ans: false,
    ignore_output: false,
    setDepthSafeStringify: function(value) {
      return JSON.stringify(value);
    },
    inter: {
      lang: {
        string: function(id) {
          return 'LANG_' + id + ': ';
        }
      },
      env: {
        readFileSync: function() {
          return JSON.stringify(docs_payload);
        },
        error: function(msg) {
          errors.push(msg);
        },
        disp: function(msg) {
          disp_calls.push(msg);
        },
        dispMonospaced: function(msg) {
          disp_monospaced_calls.push(msg);
        },
        editor: function(file_path, line_no) {
          editor_calls.push([file_path, line_no]);
        }
      }
    }
  };

  var docs = new PRDC_JSLAB_LIB_DOCS(jsl);
  return {
    docs,
    errors,
    editor_calls,
    disp_calls,
    disp_monospaced_calls,
    jsl
  };
}

tests.add('helpToJSON returns full docs payload for empty name', function(assert) {
  var harness = createDocsHarness();
  var out = harness.docs.helpToJSON();
  var parsed = JSON.parse(out);
  assert.ok(parsed.global.basic.disp);
  assert.ok(parsed.lib.path.pathJoin);
}, { tags: ['unit', 'docs'] });

tests.add('help/doc aliases resolve global and library members', function(assert) {
  var harness = createDocsHarness();

  var global_out = JSON.parse(harness.docs.help('disp'));
  assert.equal(global_out.type, 'global');
  assert.equal(global_out.category, 'basic');

  var lib_out = JSON.parse(harness.docs.doc('path.pathJoin'));
  assert.equal(lib_out.type, 'lib');
  assert.equal(lib_out.category, 'path');
}, { tags: ['unit', 'docs'] });

tests.add('documentationSearch filters by query text', function(assert) {
  var harness = createDocsHarness();
  var out = harness.docs.documentationSearch('join path');
  assert.ok(out.hasOwnProperty('pathJoin'));
}, { tags: ['unit', 'docs'] });

tests.add('source opens editor for known symbol and errors on missing symbol', function(assert) {
  var harness = createDocsHarness();

  harness.docs.source('disp');
  assert.equal(harness.editor_calls.length, 1);
  assert.equal(
    path.normalize(harness.editor_calls[0][0]),
    path.normalize(path.join('C:', 'Electron', 'JSLAB', 'js', 'sandbox', 'basic.js'))
  );
  assert.equal(harness.editor_calls[0][1], 10);

  harness.docs.source('missing_fn_name');
  assert.equal(harness.errors.length, 1);
  assert.ok(harness.errors[0].includes('@source:'));
}, { tags: ['unit', 'docs'] });

tests.add('lookfor returns sorted display lines and updates output flags', function(assert) {
  var harness = createDocsHarness();

  var out = harness.docs.lookfor('join');

  assert.deepEqual(out, ['pathJoin - join path']);
  assert.equal(harness.disp_monospaced_calls.length, 1);
  assert.ok(harness.disp_monospaced_calls[0].includes('pathJoin - join path'));
  assert.equal(harness.jsl.no_ans, true);
  assert.equal(harness.jsl.ignore_output, true);
}, { tags: ['unit', 'docs'] });

tests.add('lookfor validates empty query', function(assert) {
  var harness = createDocsHarness();

  var out = harness.docs.lookfor('');

  assert.deepEqual(out, []);
  assert.equal(harness.errors.length, 1);
  assert.ok(harness.errors[0].includes('@lookfor:'));
}, { tags: ['unit', 'docs'] });

exports.MODULE_TESTS = tests;
