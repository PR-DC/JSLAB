/**
 * @file JSLAB render submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_RENDER } = require('../render');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function waitMs(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

tests.add('debounceIn executes immediately and suppresses repeated calls in window', async function(assert) {
  var render = new PRDC_JSLAB_LIB_RENDER({});
  var calls = [];
  var debounced = render.debounceIn(function(value) {
    calls.push(value);
  }, 20);

  debounced(1);
  debounced(2);
  assert.deepEqual(calls, [1]);

  await waitMs(30);
  debounced(3);
  assert.deepEqual(calls, [1, 3]);
}, { tags: ['unit', 'render'] });

tests.add('debounceOut executes once at end of window using latest args', async function(assert) {
  var render = new PRDC_JSLAB_LIB_RENDER({});
  var calls = [];
  var debounced = render.debounceOut(function(value) {
    calls.push(value);
  }, 20);

  debounced('a');
  debounced('b');
  assert.deepEqual(calls, []);
  await waitMs(30);
  assert.deepEqual(calls, ['b']);
}, { tags: ['unit', 'render'] });

tests.add('debounceInOut executes on leading and trailing edges', async function(assert) {
  var render = new PRDC_JSLAB_LIB_RENDER({});
  var calls = [];
  var debounced = render.debounceInOut(function(value) {
    calls.push(value);
  }, 20);

  debounced(10);
  debounced(20);
  assert.deepEqual(calls, [10]);

  await waitMs(50);
  assert.deepEqual(calls, [10, 20]);
}, { tags: ['unit', 'render'] });

exports.MODULE_TESTS = tests;
