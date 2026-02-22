/**
 * @file JSLAB init-worker smoke tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function executeInitWorker() {
  var source = fs.readFileSync(path.join(__dirname, '..', 'init-worker.js'), 'utf8');
  var message_handler = null;
  var calls = [];

  var context = {
    console: console,
    self: {
      addEventListener: function(type, handler) {
        if(type === 'message') {
          message_handler = handler;
        }
      }
    },
    require: function(module_path) {
      if(module_path === 'fs') return require('fs');
      if(module_path === 'path') return require('path');
      if(module_path === '/mock/worker-module.js') {
        return {
          PRDC_WORKER: class {
            ping(data) {
              calls.push(['ping', data.value]);
            }
          }
        };
      }
      throw new Error('Unexpected require path: ' + module_path);
    }
  };
  context.globalThis = context;

  vm.runInNewContext(source, context, { filename: 'init-worker.js' });
  return { context, message_handler, calls };
}

tests.add('init-worker registers message handler and configures worker module', function(assert) {
  var run = executeInitWorker();
  assert.ok(typeof run.message_handler === 'function');
  assert.equal(run.context.win, run.context.self);
  assert.equal(typeof run.context.worker_module, 'undefined');

  run.message_handler({
    data: {
      type: 'configureWorker',
      module_path: '/mock/worker-module.js'
    }
  });
  assert.ok(run.context.worker_module);
}, { tags: ['unit', 'init'] });

tests.add('init-worker dispatches method calls to configured worker instance', function(assert) {
  var run = executeInitWorker();
  run.message_handler({
    data: {
      type: 'configureWorker',
      module_path: '/mock/worker-module.js'
    }
  });
  run.message_handler({
    data: {
      method: 'ping',
      value: 123
    }
  });

  assert.deepEqual(run.calls, [['ping', 123]]);
}, { tags: ['unit', 'init'] });

exports.MODULE_TESTS = tests;
