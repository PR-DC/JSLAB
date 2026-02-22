/**
 * @file JSLAB shared helper tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('./tester');
var tests = new PRDC_JSLAB_TESTS();

function runHelperInContext(options) {
  options = options || {};
  var source = fs.readFileSync(path.join(__dirname, 'helper.js'), 'utf8');
  var document_handlers = {};

  var context = {
    module: { exports: {} },
    exports: {},
    process: {
      type: options.process_type,
      argv: options.argv || []
    },
    is_worker: !!options.is_worker,
    document: options.document || {
      readyState: 'loading',
      addEventListener: function(name, cb) {
        document_handlers[name] = cb;
      }
    },
    console: console,
    $: options.$ || function() {
      return {
        each: function() {},
        hasClass: function() { return false; },
        addClass: function() {},
        click: function() {}
      };
    },
    require: function(module_path) {
      if(module_path === 'electron') {
        return options.electron || {
          shell: { openExternal: function() {} },
          ipcRenderer: {
            sendSync: function() {
              return options.ipc_return || [];
            }
          }
        };
      }
      throw new Error('Unexpected require path: ' + module_path);
    }
  };

  context.global = context;
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'helper.js' });
  return {
    context: context,
    document_handlers: document_handlers
  };
}

tests.add('helper sets process arguments from process.argv in browser context', function(assert) {
  var run = runHelperInContext({
    process_type: 'browser',
    argv: ['node', 'a', 'b']
  });

  assert.deepEqual(run.context.process_arguments, ['node', 'a', 'b']);
}, { tags: ['unit', 'shared', 'helper'] });

tests.add('helper sets process arguments from ipcRenderer in renderer context', function(assert) {
  var run = runHelperInContext({
    process_type: 'renderer',
    argv: ['node'],
    electron: {
      shell: { openExternal: function() {} },
      ipcRenderer: {
        sendSync: function(channel, action) {
          assert.equal(channel, 'sync-message');
          assert.equal(action, 'get-process-arguments');
          return ['electron', '--test-app'];
        }
      }
    }
  });

  assert.deepEqual(run.context.process_arguments, ['electron', '--test-app']);
}, { tags: ['unit', 'shared', 'helper'] });

tests.add('ready helper runs callback immediately or on DOMContentLoaded', function(assert) {
  var immediate_called = 0;
  var delayed_called = 0;

  var immediate = runHelperInContext({
    process_type: 'browser',
    document: {
      readyState: 'complete',
      addEventListener: function() {}
    }
  });
  immediate.context.ready(function() {
    immediate_called += 1;
  });
  assert.equal(immediate_called, 1);

  var delayed_handlers = {};
  var delayed = runHelperInContext({
    process_type: 'browser',
    document: {
      readyState: 'loading',
      addEventListener: function(name, cb) {
        delayed_handlers[name] = cb;
      }
    }
  });

  delayed.context.ready(function() {
    delayed_called += 1;
  });
  assert.equal(delayed_called, 0);
  delayed_handlers.DOMContentLoaded();
  assert.equal(delayed_called, 1);
}, { tags: ['unit', 'shared', 'helper'] });

tests.add('preventRedirect marks non-external links and forwards click to shell.openExternal', function(assert) {
  var opened = [];
  var links = [
    { href: 'https://a.example', _classes: {}, _click: null },
    { href: 'https://b.example', _classes: { 'external-link': true }, _click: null }
  ];

  function wrapLink(link) {
    return {
      hasClass: function(cls) {
        return !!link._classes[cls];
      },
      addClass: function(cls) {
        link._classes[cls] = true;
      },
      click: function(fn) {
        link._click = fn;
      }
    };
  }

  var run = runHelperInContext({
    process_type: 'browser',
    electron: {
      shell: {
        openExternal: function(url) {
          opened.push(url);
        }
      }
    },
    $: function(selector_or_link) {
      if(selector_or_link === 'a') {
        return {
          each: function(cb) {
            links.forEach(function(link) {
              cb.call(link);
            });
          }
        };
      }
      return wrapLink(selector_or_link);
    }
  });

  run.context.preventRedirect();

  assert.equal(!!links[0]._classes['external-link'], true);
  assert.equal(typeof links[0]._click, 'function');
  assert.equal(!!links[1]._classes['external-link'], true);
  assert.equal(links[1]._click, null);

  var prevent_default_calls = 0;
  links[0]._click({
    preventDefault: function() {
      prevent_default_calls += 1;
    }
  });
  assert.equal(prevent_default_calls, 1);
  assert.deepEqual(opened, ['https://a.example']);
}, { tags: ['unit', 'shared', 'helper'] });

exports.MODULE_TESTS = tests;
