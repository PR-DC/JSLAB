/**
 * @file Numerical worker bridge and debugger descriptor tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { PRDC_JSLAB_WEB_WORKER_UI, FIGURE_COMMANDS, PLOT_COMMANDS } = require('../worker-ui');
const { PRDC_JSLAB_WEB_WORKER_DEBUGGER } = require('../worker-debugger-runtime');
const tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;

tests.add('worker figure facades preserve synchronous handles and dispatch every supported method', async assert => {
  const sent = [];
  const jsl = { _Promise: Promise, context: {}, inter: { figures: {} } };
  let ui;
  ui = new PRDC_JSLAB_WEB_WORKER_UI(jsl, new Map(), message => {
    sent.push(message); queueMicrotask(() => ui.response({ id: message.id, value: true }));
  });
  ui.install();
  assert.equal(jsl.context.figure(3), 3);
  const plot = jsl.context.plot([{ y: [1, 2] }]);
  assert.equal(plot.fid, 3); assert.equal(await plot.ready, true);
  assert.equal(jsl.context.getFigure(3).plot, plot); assert.equal(jsl.context.getPlot(3), plot);
  assert.equal(jsl.context.getFigure(999), false);
  for(const method of FIGURE_COMMANDS) await jsl.context[method]('argument');
  for(const method of PLOT_COMMANDS) await plot[method]('argument');
  assert.equal(sent.filter(message => message.operation.kind === 'figure-method').length, FIGURE_COMMANDS.length);
  assert.equal(sent.filter(message => message.operation.kind === 'plot-method').length, PLOT_COMMANDS.length);
  assert.throws(() => jsl.context.close(3, 'window'));
  await jsl.context.close(3); assert.equal(jsl.context.getFigure(3), false);
  jsl.context.figure(); await jsl.context.close('all'); assert.equal(ui.figures.size, 0);
  await ui.flush(); assert.equal(ui.pending.size, 0); assert.equal(ui.tasks.length, 0);
}, { tags: ['unit', 'web', 'debugger'] });

tests.add('worker bridge reports asynchronous UI failures through flush and ignores expired responses', async assert => {
  const jsl = { _Promise: Promise, context: {}, inter: { figures: {} } };
  let ui;
  ui = new PRDC_JSLAB_WEB_WORKER_UI(jsl, new Map(), message => queueMicrotask(() => ui.response({ id: message.id, error: 'render failed' })));
  const pending = ui.request({ kind: 'plot' });
  await assert.rejects(pending, /render failed/);
  await assert.rejects(ui.flush(), /render failed/);
  assert.equal(ui.pending.size, 0);
  ui.response({ id: 'expired', value: true });
  await ui.flush();
}, { tags: ['unit', 'web', 'debugger'] });

tests.add('worker object descriptors do not invoke getters and bound large arrays', assert => {
  const runtime = new PRDC_JSLAB_WEB_WORKER_DEBUGGER({ inter: { execution: {} } }, new SharedArrayBuffer(65536));
  let calls = 0;
  const object = { answer: 42, get unsafe() { calls++; return 9; } };
  const value = runtime._value(object);
  const result = runtime.properties(value.object_id);
  assert.equal(result.properties.find(property => property.name === 'unsafe').accessor, true);
  assert.equal(calls, 0);
  const array = runtime._value(new Array(1000000).fill(1));
  const expanded = runtime.properties(array.object_id);
  assert.equal(expanded.truncated, true); assert.equal(expanded.properties.length, 1000);
  runtime.handles.clear(); assert.throws(() => runtime.properties(value.object_id), /expired/);
  runtime.configure({ breakpoints: [{ path: 'file.jsl', line: 2, condition: 'x > 1' }], pause_on_exceptions: 'all' });
  assert.equal(runtime.breakpoints.get('file.jsl:2').condition, 'x > 1');
  const id = runtime.enter(JSON.stringify({ path: 'file.jsl', line: 1 }), () => 42);
  assert.equal(runtime.live.has(id), true); runtime.leave(id); assert.equal(runtime.live.has(id), false);
  runtime.pause(); assert.equal(Atomics.load(runtime.control, 0), 1);
  runtime.interrupt(); assert.equal(Atomics.load(runtime.control, 0), 4);
  runtime.resetControl(); assert.equal(Atomics.load(runtime.control, 0), 0);
  runtime.begin(); assert.equal(runtime.breakpoints.size, 0); assert.equal(runtime.pause_on_exceptions, 'none');
}, { tags: ['unit', 'web', 'debugger'] });
