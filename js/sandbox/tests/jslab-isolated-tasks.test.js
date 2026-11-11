/**
 * @file Isolated scientific task lifecycle tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { PRDC_JSLAB_LIB_NON_BLOCKING } = require('../non-blocking');
const tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;

function harness() {
  const calls = [];
  const jsl = { _Promise: Promise, cleanup_registry: [], inter: { execution: { signal: () => new AbortController().signal },
    setTimeout, clearTimeout, env: {
      runInterruptibleTask(id, source, args) { calls.push({ id, source, args }); return new Promise(resolve => { calls.resolve = resolve; }); },
      async cancelInterruptibleTask(id) { calls.push({ cancelled: id }); }
    } }, addForCleanup(obj, fun) { this.cleanup_registry.push({ obj, fun }); } };
  return { jsl, calls, lib: new PRDC_JSLAB_LIB_NON_BLOCKING(jsl) };
}

tests.add('isolated tasks return copied results structured errors and release cleanup registrations', async assert => {
  const h = harness();
  let pending = h.lib.runInterruptible(x => x + 1, [41]);
  assert.equal(h.calls[0].args[0], 41); assert.equal(h.jsl.cleanup_registry.length, 1);
  h.calls.resolve({ success: true, value: 42 }); assert.equal(await pending, 42);
  assert.equal(h.jsl.cleanup_registry.length, 0);
  pending = h.lib.runInterruptible(() => {});
  const failure = assert.rejects(pending, /task error/);
  h.calls.resolve({ success: false, error: 'task error', error_details: { path: 'child.jsl', line: 3 } });
  await failure;
  assert.equal(h.jsl.cleanup_registry.length, 0);
  assert.throws(() => h.lib.runInterruptible(null), /function/);
  assert.throws(() => h.lib.runInterruptible(() => {}, [], { timeout_ms: -1 }), /positive/);
  h.jsl.inter.env.runInterruptibleTask = () => { throw Error('transport unavailable'); };
  await assert.rejects(h.lib.runInterruptible(() => {}), /transport unavailable/);
  assert.equal(h.jsl.cleanup_registry.length, 0);
}, { tags: ['unit', 'execution'] });

tests.add('isolated task timeout and AbortSignal stop the owned job before rejecting', async assert => {
  const h = harness();
  const controller = new AbortController();
  const pending = h.lib.runInterruptible(() => {}, [], { signal: controller.signal });
  const rejected = assert.rejects(pending, /aborted/);
  controller.abort(); await rejected;
  assert.equal(h.calls[1].cancelled, h.calls[0].id);
  h.calls.resolve({ success: true, value: 'late result' });
  assert.equal(h.jsl.cleanup_registry.length, 0);
  await assert.rejects(h.lib.runInterruptible(() => {}, [], { timeout_ms: 10 }), /timed out/);
  assert.equal(h.calls[3].cancelled, h.calls[2].id);
  assert.equal(h.jsl.cleanup_registry.length, 0);
}, { tags: ['unit', 'execution'] });
