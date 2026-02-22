/**
 * @file JSLAB non-blocking submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('waitMSeconds resolves asynchronously', async function(assert) {
  var t0 = Date.now();
  await jsl.non_blocking.waitMSeconds(15);
  var elapsed = Date.now() - t0;
  assert.ok(elapsed >= 10);
}, { tags: ['unit', 'async', 'non-blocking'], timeout_ms: 5000 });

tests.add('waitSeconds delegates to millisecond wait', async function(assert) {
  var t0 = Date.now();
  await jsl.non_blocking.waitSeconds(0.02);
  var elapsed = Date.now() - t0;
  assert.ok(elapsed >= 10);
}, { tags: ['unit', 'async', 'non-blocking'], timeout_ms: 5000 });

tests.add('clearTimeoutIf cancels timeout when provided', async function(assert) {
  var triggered = false;
  var id = setTimeout(function() {
    triggered = true;
  }, 25);
  var ret = jsl.non_blocking.clearTimeoutIf(id);
  assert.equal(ret, false);
  await new Promise(function(resolve) { setTimeout(resolve, 40); });
  assert.equal(triggered, false);
}, { tags: ['unit', 'async', 'non-blocking'], timeout_ms: 5000 });

tests.add('resetTimeout re-schedules callback', async function(assert) {
  var counter = 0;
  var id = undefined;
  id = jsl.non_blocking.resetTimeout(id, function() { counter += 1; }, 50);
  id = jsl.non_blocking.resetTimeout(id, function() { counter += 1; }, 15);
  await new Promise(function(resolve) { setTimeout(resolve, 40); });
  assert.equal(counter, 1);
}, { tags: ['unit', 'async', 'non-blocking'], timeout_ms: 5000 });

exports.MODULE_TESTS = tests;
