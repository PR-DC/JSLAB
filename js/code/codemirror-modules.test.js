/**
 * @file JSLAB code CodeMirror integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function runCodeMirrorModule(file_name, options) {
  options = options || {};
  var source = fs.readFileSync(path.join(__dirname, file_name), 'utf8');
  var records = {
    helpers: [],
    options: [],
    ipc_calls: []
  };

  var fake_codemirror = {
    Pos: function(line, ch) {
      return { line: line, ch: ch };
    },
    commands: {},
    keyMap: { default: {} },
    innerMode: function() {
      return { mode: { helperType: 'javascript' }, state: {} };
    },
    registerHelper: function(kind, name, fn) {
      records.helpers.push({ kind: kind, name: name, fn: fn });
    },
    defineOption: function(name, default_value, fn) {
      records.options.push({ name: name, default_value: default_value, fn: fn });
    },
    e_stop: function() {},
    keyName: function() { return ''; }
  };

  var context = {
    module: { exports: {} },
    exports: {},
    CodeMirror: fake_codemirror,
    language: {
      currentString: function() {
        return 'LANG';
      }
    },
    window: {
      jQuery: undefined
    },
    document: {
      querySelector: function() { return null; }
    },
    ipcRenderer: {
      invoke: function(channel, payload) {
        records.ipc_calls.push({ channel: channel, payload: payload });
        return Promise.resolve(['alpha', 'beta']);
      }
    },
    require: function(module_path) {
      if(module_path === '../../lib/codemirror') {
        return fake_codemirror;
      }
      if(module_path === './searchcursor') {
        return {};
      }
      throw new Error('Unexpected require path: ' + module_path);
    }
  };
  context.global = context;
  context.globalThis = context;

  vm.runInNewContext(source, context, { filename: file_name });
  return {
    context: context,
    CodeMirror: fake_codemirror,
    records: records
  };
}

tests.add('custom-javascript-hint registers javascript helper and requests completions', async function(assert) {
  var run = runCodeMirrorModule('custom-javascript-hint.js');
  var helper = run.records.helpers.find(function(entry) {
    return entry.kind === 'hint' && entry.name === 'javascript';
  });
  assert.ok(!!helper);

  var editor = {
    getCursor: function() {
      return { line: 2, ch: 3 };
    },
    getTokenAt: function() {
      return {
        start: 0,
        end: 3,
        string: 'abc',
        state: {},
        type: 'variable'
      };
    },
    getMode: function() {
      return {};
    }
  };

  var out = await helper.fn(editor, null, {});
  assert.equal(Array.isArray(out.list), true);
  assert.equal(out.list.length, 2);
  assert.equal(run.records.ipc_calls[0].channel, 'get-completions');
}, { tags: ['unit', 'code', 'codemirror'] });

tests.add('custom-search registers expected search commands', function(assert) {
  var run = runCodeMirrorModule('custom-search.js');
  var expected = [
    'showSearchDialog',
    'hideSearchDialog',
    'find',
    'findPersistent',
    'findPersistentNext',
    'findPersistentPrev',
    'findNext',
    'findPrev',
    'clearSearch',
    'replace',
    'replaceAll'
  ];

  expected.forEach(function(name) {
    assert.equal(typeof run.CodeMirror.commands[name], 'function', name + ' command');
  });
}, { tags: ['unit', 'code', 'codemirror'] });

tests.add('dialog-search defines searchDialog option on CodeMirror', function(assert) {
  var run = runCodeMirrorModule('dialog-search.js');
  var option = run.records.options.find(function(entry) {
    return entry.name === 'searchDialog';
  });

  assert.ok(!!option);
  assert.equal(option.default_value, false);
  assert.equal(typeof option.fn, 'function');
}, { tags: ['unit', 'code', 'codemirror'] });

tests.add('all code scripts parse as valid JavaScript modules', function(assert) {
  var files = [
    'custom-javascript-hint.js',
    'custom-search.js',
    'dialog-search.js',
    'doc-hover.js'
  ];

  files.forEach(function(file_name) {
    var source = fs.readFileSync(path.join(__dirname, file_name), 'utf8');
    try {
      new vm.Script(source, { filename: file_name });
    } catch(err) {
      assert.fail(file_name + ' should parse: ' + (err && err.message ? err.message : String(err)));
    }
  });
}, { tags: ['unit', 'code', 'codemirror'] });

exports.MODULE_TESTS = tests;
