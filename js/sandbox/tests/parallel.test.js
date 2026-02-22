/**
 * @file JSLAB parallel submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_PARALLEL } = require('../parallel');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createParallel(processors_number) {
  return new PRDC_JSLAB_PARALLEL({
    getWorkerInit: function() {
      return '// worker init';
    },
    inter: {
      env: {
        processors_number: processors_number
      },
      config: {
        DEBUG_PARALLEL_WORKER_SETUP_FUN: false,
        DEBUG_PARALLEL_WORKER_WORK_FUN: false
      },
      eval: {
        rewriteCode: function(code) {
          return { code: code };
        },
        getFunctionBody: function(fun) {
          return fun ? fun.toString() : '';
        }
      }
    },
    _console: {
      log: function() {}
    }
  });
}

tests.add('getProcessorsNum returns configured processor count', function(assert) {
  var parallel = createParallel(12);
  assert.equal(parallel.getProcessorsNum(), 12);
}, { tags: ['unit', 'parallel'] });

tests.add('getProcessorsNum falls back to 4 when unavailable', function(assert) {
  var parallel = createParallel(undefined);
  assert.equal(parallel.getProcessorsNum(), 4);
}, { tags: ['unit', 'parallel'] });

tests.add('workerFunction contains context and ready signal', function(assert) {
  var parallel = createParallel(4);
  var script = parallel.workerFunction({ alpha: 3 }, 'null');
  assert.ok(script.includes('Object.assign(self'));
  assert.ok(script.includes('"alpha":3'));
  assert.ok(script.includes("self.postMessage({ type: 'ready' })"));
}, { tags: ['unit', 'parallel'] });

tests.add('terminate clears worker pool and queue flags', function(assert) {
  var parallel = createParallel(4);
  parallel.worker_pool = [{ terminate: function() {} }, { terminate: function() {} }];
  parallel.task_queue = [{}, {}];
  parallel.is_initialized = true;
  parallel.terminate();
  assert.deepEqual(parallel.worker_pool, []);
  assert.deepEqual(parallel.task_queue, []);
  assert.equal(parallel.is_initialized, false);
}, { tags: ['unit', 'parallel'] });

exports.MODULE_TESTS = tests;
