/**
 * @file JSLAB debugger GUI interaction tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;
if(!globalThis.__JSLAB_GUI_COMPONENT__) return;
const { guiTest, sent } = require('../../dev/gui-test-utils');

guiTest(tests, 'main', 'Command Window has no debugger button while paused console integration remains active', [], async (assert, fixture, controller) => {
  assert.equal(fixture.document.querySelector('#debugger-toggle'), null);
  assert.equal(fixture.document.querySelector('#debugger-panel'), null);
  controller.debugger.update({ state: 'paused', revision: 1, frames: [] });
  assert.equal(controller.debug_paused, true);
});

guiTest(tests, 'main', 'Command Window evaluates and edits locals in the frame selected by the Editor call stack', [], async (assert, fixture, controller) => {
  controller.debugger.ipc = { send: (...args) => fixture.calls.push(args), async invoke(...args) {
    fixture.calls.push(args);
    return { success: true, value: { value: { type: 'number', value: 42 } } };
  } };
  const frames = [{ name: 'callee', path: 'test.jsl', line: 4 }, { name: 'caller', path: 'test.jsl', line: 1 }];
  controller.debugger.update({ state: 'paused', revision: 7, frames });
  fixture.emit('MainWindow', 'debugger-select-frame', { frame_index: 1, revision: 7 });
  controller.evaluating = true;
  controller.eval.evalCommand('local_value = 42'); await fixture.tick();
  const call = fixture.calls.find(call => call[1] === 'evaluate_debug_expression');
  assert.equal(call[2].expression, 'local_value = 42'); assert.equal(call[2].frame_index, 1);
  assert.equal(call[2].allow_side_effects, true); assert.equal(controller.evaluating, true);
  assert.equal(sent(assert, fixture, 'EditorWindow', 'debug-location').name, 'caller');
  assert.equal(sent(assert, fixture, 'DebuggerPane', 'state').frame_index, 1);
  controller.debugger.selectFrame(0, 6); assert.equal(controller.debugger.frame_index, 1);
  controller.debugger.selectFrame(99, 7); assert.equal(controller.debugger.frame_index, 1);
  controller.debugger.update({ state: 'running', revision: 8, frames: [] });
  assert.equal(controller.debugger.selectFrame(1, 7), undefined); assert.equal(controller.debug_paused, false);
});

guiTest(tests, 'main', 'debugger console commands run on the host while the numerical runtime is paused', [], async (assert, fixture, controller) => {
  const calls = [];
  controller.debugger.ipc = { send: (...args) => fixture.calls.push(args), invoke: async (channel, method, args) => {
    calls.push({ method, args });
    return { success: true, value: method === 'get_debug_state' ? { state: 'paused', breakpoints: [], frames: [] } : {} };
  } };
  controller.evaluating = true; controller.debug_paused = true;
  controller.eval.evalCommand('dbstep in'); await fixture.tick();
  assert.equal(calls.at(-1).method, 'resume_execution'); assert.equal(calls.at(-1).args.action, 'stepInto');
  await controller.debugger.executeCommand('dbstatus'); assert.equal(calls.at(-1).method, 'get_debug_state');
  await controller.debugger.executeCommand('dbstop if error'); assert.equal(calls.at(-1).args.state, 'uncaught');
});

guiTest(tests, 'main', 'Workspace previews render local strings as text', [], async (assert, fixture, controller) => {
  controller.workspace.setWorkspace([['local', 'string', '<img src=x onerror="throw Error(1)">']]);
  assert.equal(fixture.query('#workspace .table').querySelector('img'), null);
  assert.ok(fixture.query('#workspace .table').textContent.includes('<img'));
});

guiTest(tests, 'main', 'internal-only pauses never fall back to opening basic.js', [], async (assert, fixture, controller) => {
  const before = fixture.calls.filter(call => call[0] === 'EditorWindow' && call[1] === 'debug-location').length;
  controller.debugger.update({state:'paused',revision:22,frames:[{name:'_debug',path:'C:/github/JSLAB/js/sandbox/basic.js',line:1}]});
  assert.equal(controller.debugger.frame_index, -1);
  assert.equal(controller.debugger.selectFrame(0), undefined);
  assert.equal(fixture.calls.filter(call => call[0] === 'EditorWindow' && call[1] === 'debug-location').length, before);
  controller.debugger.update({state:'idle',revision:23,frames:[]});
  assert.equal(controller.debugger.scopeToken(), '');
});
