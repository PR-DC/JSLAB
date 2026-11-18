/**
 * @file Shared debugger dispatcher contract tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require("../tester");
const { PRDC_JSLAB_DEBUGGER_DISPATCHER } = require("../debugger-dispatcher");
var tests = new PRDC_JSLAB_TESTS();

tests.add('runtime routes inspection and execution through the configured host API', function(assert) {
  const calls = [];
  const debugger_service = {
    properties: id => calls.push(['object', id]),
    evaluate: (...args) => calls.push(['expression', ...args]),
    resume: action => calls.push(['resume', action]),
    setBreakpoint: (...args) => calls.push(['breakpoint', ...args])
  };
  const runtime = new PRDC_JSLAB_DEBUGGER_DISPATCHER({ getDebugger: () => debugger_service }, {
    inspect: 'properties', evaluate: 'evaluate', resume: 'resume'
  });
  runtime.dispatch('inspect_debug_object', { object_id: 'locals-1' });
  runtime.dispatch('evaluate_debug_expression', { expression: 'x', frame_index: 2 });
  runtime.dispatch('evaluate_debug_expression', { expression: 'x = 3', frame_index: 2, allow_side_effects: true });
  runtime.dispatch('resume_execution', { action: 'stepOver' });
  runtime.dispatch('set_breakpoint', { path: 'script.jsl', line: 7, condition: 'x > 3', enabled: false });
  assert.deepEqual(calls, [['object', 'locals-1'], ['expression', 'x', 2, false],
    ['expression', 'x = 3', 2, true], ['resume', 'stepOver'], ['breakpoint', 'script.jsl', 7, 'x > 3', false]]);
  assert.throws(() => runtime.dispatch('missing'), /Unknown/);
}, { tags: ['unit', 'runtime'] });

tests.add('runtime rejects stale frame selections before publishing host view state', function(assert) {
  const snapshot = { state: 'paused', revision: 9, frames: [{ name: 'caller' }] };
  let selected = null;
  const runtime = new PRDC_JSLAB_DEBUGGER_DISPATCHER({ getDebugger: () => ({ status: () => snapshot }),
    selectFrame: args => {
      selected = args.frame_index;
    } });
  runtime.dispatch('select_debug_frame', { frame_index: 0, revision: 9 });
  assert.equal(selected, 0);
  selected = null;
  assert.throws(() => runtime.dispatch('select_debug_frame', { frame_index: 0, revision: 8 }), /Expired/);
  snapshot.state = 'running';
  assert.throws(() => runtime.dispatch('select_debug_frame', { frame_index: 0 }), /Expired/);
  assert.equal(selected, null);
}, { tags: ['unit', 'runtime'] });


tests.add('debugger requests normalize asynchronous host results and non-Error rejections', async function(assert) {
  assert.deepEqual(await PRDC_JSLAB_DEBUGGER_DISPATCHER.request(async () => ({ state: 'idle' })),
    { success: true, value: { state: 'idle' } });
  assert.deepEqual(await PRDC_JSLAB_DEBUGGER_DISPATCHER.request(async () => { throw Error('Unavailable'); }),
    { success: false, error: 'Unavailable' });
  assert.deepEqual(await PRDC_JSLAB_DEBUGGER_DISPATCHER.request(async () => { throw null; }),
    { success: false, error: 'null' });
}, { tags: ['unit', 'debugger'] });

exports.MODULE_TESTS = tests;
