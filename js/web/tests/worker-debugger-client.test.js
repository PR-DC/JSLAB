/**
 * @file Browser debugger transport and lifecycle unit tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT } = require('../worker-debugger');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('web debugger requires isolated hosting and rejects execution before startup', async function(assert) {
  const client = new PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT();
  await assert.rejects(client.evaluate('1'), /not started/);
  if(!globalThis.crossOriginIsolated) await assert.rejects(client.start(), /Cross-Origin-Opener-Policy/);
}, { tags: ['unit', 'web', 'debugger'] });

tests.add('shared control encodes Unicode commands, rejects oversized payloads and validates breakpoints', function(assert) {
  const client = new PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT();
  const buffer = new SharedArrayBuffer(256);
  client.control = new Int32Array(buffer, 0, 8);
  client.payload = new Uint8Array(buffer, 32);
  client._write(5, { expression: 'č + λ' });
  assert.equal(Atomics.load(client.control, 0), 5);
  const value = JSON.parse(new TextDecoder().decode(client.payload.slice(0, Atomics.load(client.control, 1))));
  assert.equal(value.expression, 'č + λ');
  assert.throws(() => client._write(5, { expression: 'x'.repeat(1000) }), /too large/);
  assert.throws(() => client.setBreakpoint('file.jsl', 0), /positive/);
  client.setBreakpoint('file.jsl', 2);
  client.removeBreakpoint('file.jsl', 2);
  assert.equal(client.breakpoints.size, 0);
}, { tags: ['unit', 'web', 'debugger'] });

tests.add('reset rejects pending requests and ignores late responses from the terminated worker', async function(assert) {
  const client = new PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT();
  let terminated = false;
  client.worker = { terminate() { terminated = true; }, postMessage() {} };
  client.control = new Int32Array(new SharedArrayBuffer(32));
  const pending = client.evaluate('await pending_work');
  const rejected = assert.rejects(pending, /discarded/);
  client.dispose();
  await rejected;
  assert.equal(terminated, true);
  client._message({ type: 'ready' });
  assert.equal(client.state, 'closed');
}, { tags: ['unit', 'web', 'debugger'] });
tests.add('debugger client validates conditions, exception modes, frame access and oversized expression recovery', async assert => {
  const client = new PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT();
  assert.throws(() => client.setBreakpoint('a', 1, 'invalid +'));
  assert.throws(() => client.setExceptionPause('invalid'));
  client.setBreakpoint('a', 1, 'true', false);
  assert.equal(client.settings().breakpoints[0].enabled, false);
  await client.setExceptionPause('all'); assert.equal(client.settings().pause_on_exceptions, 'all');
  await client.clearBreakpoints(); assert.equal(client.settings().breakpoints.length, 0);
  await assert.rejects(client.selectFrame(0), /not paused/);
  await assert.rejects(client.inspectObject('old'), /not paused/);
  client.state = 'paused'; client.control = new Int32Array(new SharedArrayBuffer(256));
  client.payload = new Uint8Array(32);
  await assert.rejects(client.evaluatePaused('x'.repeat(1000)), /too large/);
  assert.equal(client.debug_pending, false); assert.equal(client.pending.size, 0);
  assert.throws(() => client.resume('invalid'));
}, { tags: ['unit', 'web', 'debugger'] });
exports.MODULE_TESTS = tests;

tests.add('worker settings propagate to existing children and async errors retain structured details', async assert => {
  let received;
  const root = new PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT({ userError: details => { received = details; } });
  const child = new PRDC_JSLAB_WEB_WORKER_DEBUGGER_CLIENT();
  root.targets.set('child', child);
  root.setBreakpoint('task.jsl', 4, 'x > 2');
  await root.setExceptionPause('all');
  assert.equal(child.settings().breakpoints[0].line, 4);
  assert.equal(child.pause_on_exceptions, 'all');
  await root.clearBreakpoints(); assert.equal(child.breakpoints.size, 0);
  const details = { name: 'Error', message: 'callback failed', location: { path: 'child.jsl', line: 2, column: 3 } };
  root._message({ type: 'target-user-error', details }); assert.equal(received, details);
}, { tags: ['unit', 'web', 'debugger'] });
