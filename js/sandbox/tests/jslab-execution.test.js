/**
 * @file JSLAB execution cancellation and cleanup tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_EXECUTION } = require('../jslab-execution');
const { PRDC_JSLAB_OVERRIDE } = require('../jslab-override');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function harness() {
  const calls = [];
  const jsl = { _Promise: Promise, context: { saved: 42 }, pending_top_level_script_finish: true,
    inter: { parallel: { terminate() { calls.push('workers'); } }, system: { _clear() { calls.push('system'); } },
      lang: { string() { return 'Ready'; } }, env: {
        setWorkspace() { calls.push('workspace'); }, codeEvaluated() { calls.push('completed'); },
        setStatus() { calls.push('ready'); }
      } }, onStatsChange() { calls.push('stats'); } };
  for(const name of ['clearEventListeners', 'clearImmediates', 'clearAnimationFrames', 'clearIntervals',
    'clearTimeouts', 'clearIdleCallbacks', 'stopPromises', 'stopSubprocesses', 'doCleanup']) {
    jsl[name] = () => { calls.push(name); };
  }
  const execution = new PRDC_JSLAB_EXECUTION(jsl);
  jsl.inter.execution = execution;
  return { execution, jsl, calls };
}

tests.add('interruption releases pending await, aborts resources and preserves workspace', async function(assert) {
  const h = harness();
  const token = h.execution.begin();
  const signal = h.execution.signal();
  const pending = h.execution.wait(new Promise(() => {}), token);
  const rejected = assert.rejects(pending, /interrupted/);
  const result = await h.execution.interrupt(token.id);
  await rejected;
  assert.equal(result.success, true);
  assert.equal(h.execution.valid(token), false);
  assert.equal(signal.aborted, true);
  assert.equal(h.execution.signal().aborted, false);
  assert.equal(h.jsl.context.saved, 42);
  assert.equal(h.calls[h.calls.length - 1], 'ready');
}, { tags: ['unit', 'execution'] });

tests.add('cleanup failures are collected while every other resource still gets released', async function(assert) {
  const h = harness();
  h.jsl.clearIntervals = () => { throw new Error('interval cleanup failed'); };
  let completed = false;
  h.jsl.doCleanup = async () => { await Promise.resolve(); completed = true; };
  const result = await h.execution.interrupt(null);
  assert.equal(result.cleanup_errors.length, 1);
  assert.equal(completed, true);
  assert.ok(h.calls.includes('stopSubprocesses'));
  assert.ok(h.calls.includes('completed'));
}, { tags: ['unit', 'execution'] });

tests.add('concurrent interruption requests await the same resource cleanup', async function(assert) {
  const h = harness();
  let release, cleanups = 0;
  h.jsl.doCleanup = () => { cleanups++; return new Promise(resolve => { release = resolve; }); };
  const first = h.execution.interrupt(null);
  const second = h.execution.interrupt(null);
  while(!release) await Promise.resolve();
  assert.equal(cleanups, 1);
  release(); await Promise.all([first, second]);
  assert.equal(h.calls.filter(call => call === 'completed').length, 1);
}, { tags: ['unit', 'execution'] });

tests.add('cancelled callbacks cannot write after a new evaluation starts', async function(assert) {
  const h = harness();
  const old = h.execution.begin();
  let value = 0;
  const callback = h.execution.wrap(function(delta) { value += delta + this.offset; });
  callback.call({ offset: 2 }, 3);
  assert.equal(value, 5);
  await h.execution.interrupt(old.id);
  h.execution.begin();
  callback.call({ offset: 2 }, 100);
  assert.equal(value, 5);
  const fresh = h.execution.wrap(() => { value++; });
  fresh();
  assert.equal(value, 6);
}, { tags: ['unit', 'execution'] });

tests.add('stale cancellation cannot cancel a newer execution', async function(assert) {
  const h = harness();
  const old = h.execution.begin();
  h.execution.finish(old);
  const current = h.execution.begin();
  await assert.rejects(h.execution.interrupt(old.id), /Stale/);
  h.execution.finish(old);
  assert.equal(h.execution.current, current);
  assert.equal(h.execution.valid(current), true);
}, { tags: ['unit', 'execution'] });

tests.add('tracked timeout callback is guarded even if it was already queued when cancelled', async function(assert) {
  const h = harness();
  let queued;
  let writes = 0;
  h.jsl._setTimeout = callback => { queued = callback; return 1; };
  h.jsl.started_timeouts = [];
  h.jsl.inter.array = { removeElementByValue(array, value) { array.splice(array.indexOf(value), 1); } };
  const override = Object.create(PRDC_JSLAB_OVERRIDE.prototype);
  override.jsl = h.jsl;
  override.setTimeout(() => { writes++; }, 1);
  await h.execution.interrupt(null);
  queued();
  assert.equal(writes, 0);
}, { tags: ['unit', 'execution'] });

exports.MODULE_TESTS = tests;
