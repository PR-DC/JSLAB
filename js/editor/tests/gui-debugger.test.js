/**
 * @file Debugger editor interaction regression tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest } = require('../../dev/gui-test-utils');
const { root } = require('../../dev/gui-test-fixture');
const tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;
if(!globalThis.__JSLAB_GUI_COMPONENT__) return;

guiTest(tests, 'editor', 'debugger gutter adds removes edits and disables original-source breakpoints', [], async (assert, fixture, controller) => {
  const script = controller.script_manager.scripts[0];
  script.path = path.join(root, 'examples/exampleDebugger.jsl');
  script.code_editor.setValue('let value = 1;\nvalue++;\nvalue;');
  const calls = [];
  script.debugger.host.request = async (method, args) => { calls.push({ method, args }); return {}; };
  assert.equal(script.code_editor.getOption('gutters').includes('jslab-breakpoints'), false);
  const initialWidth = fixture.query('.CodeMirror-gutters').getBoundingClientRect().width;
  fixture.window.CodeMirror.signal(script.code_editor, 'gutterClick', script.code_editor, 1, 'CodeMirror-foldgutter', {});
  assert.equal(calls.length, 0);
  fixture.window.CodeMirror.signal(script.code_editor, 'gutterClick', script.code_editor, 1, 'CodeMirror-linenumbers', {});
  await fixture.tick(); assert.equal(calls.at(-1).method, 'set_breakpoint');
  const state = { state: 'paused', breakpoints: [{ id: script.path + ':2', path: script.path, line: 2, condition: 'value > 1', enabled: true }],
    frames: [{ path: script.path, line: 2, column: 1 }] };
  fixture.emit('EditorWindow', 'debugger-state', state);
  assert.ok(script.code_editor.lineInfo(1).gutterMarkers['jslab-breakpoints'].title.includes('value > 1'));
  assert.equal(script.code_editor.getOption('gutters')[0], 'jslab-breakpoints');
  const marker = script.code_editor.lineInfo(1).gutterMarkers['jslab-breakpoints'];
  assert.equal(marker.textContent, '');
  assert.ok(marker.getBoundingClientRect().left < fixture.query('.CodeMirror-linenumber').getBoundingClientRect().left);
  const expandedWidth = fixture.query('.CodeMirror-gutters').getBoundingClientRect().width;
  assert.ok(expandedWidth > initialWidth && expandedWidth <= initialWidth + 15);
  assert.ok(script.code_editor.lineInfo(1).bgClass.includes('jslab-debug-line'));
  fixture.window.CodeMirror.signal(script.code_editor, 'gutterClick', script.code_editor, 1, 'jslab-breakpoints', {});
  await fixture.tick(); assert.equal(calls.at(-1).method, 'remove_breakpoint');
  script.debugger.update({ state: 'idle', breakpoints: [] });
  assert.equal(script.code_editor.getOption('gutters').includes('jslab-breakpoints'), false);
  assert.equal(fixture.query('.CodeMirror-gutters').getBoundingClientRect().width, initialWidth);
  script.debugger.update({ ...state, breakpoints: [{...state.breakpoints[0], enabled:false}] });
  assert.equal(script.code_editor.lineInfo(1).gutterMarkers['jslab-breakpoints'].classList.contains('disabled'), true);
  script.debugger.update({ state: 'idle', breakpoints: [{path:'another.jsl',line:1},{path:script.path,line:999}] });
  assert.equal(script.code_editor.getOption('gutters').includes('jslab-breakpoints'), false);
  await script.debugger.toggle(1); assert.equal(calls.at(-1).method, 'set_breakpoint');
  await script.debugger.toggle(1, true);
  const dialog = fixture.query('.jslab-breakpoint-dialog');
  dialog.querySelector('input[type=text]').value = 'value === 3';
  dialog.querySelector('input[type=checkbox]').checked = false;
  dialog.querySelector('button').click(); await fixture.tick();
  assert.equal(calls.at(-1).args.condition, 'value === 3'); assert.equal(calls.at(-1).args.enabled, false);
  await script.debugger.toggle(1, true);
  fixture.query('.jslab-breakpoint-dialog button:last-child').click();
  assert.equal(fixture.document.querySelector('.jslab-breakpoint-dialog'), null);
  script.path = undefined;
  await assert.rejects(() => script.debugger.toggle(1), new RegExp(fixture.window.language.currentString(586)));
});

for(const action of ['stepOver','stepInto','stepOut','stop']) {
  const selector = '[data-editor-debug-action="' + action + '"]';
  guiTest(tests, 'editor', 'Editor icon toolbar dispatches ' + action, [selector], async (assert, fixture, controller) => {
    const calls = []; controller.debugger_toolbar.host.request = async (...args) => { calls.push(args); };
    fixture.emit('EditorWindow','debugger-state',{state:'paused',revision:1,frames:[{name:'calculate',path:'test.jsl',line:1}]});
    const button = fixture.query(selector); assert.equal(button.textContent, '');
    assert.equal(fixture.window.getComputedStyle(button).width, '25px');
    fixture.click(selector); await fixture.tick();
    assert.equal(calls[0][0], action === 'stop' ? 'interrupt_execution' : 'resume_execution');
    if(action !== 'stop') assert.equal(calls[0][1].action, action);
  });
}

guiTest(tests, 'editor', 'Editor reuses Run for Pause and Continue and toggles the debugger split', ['#editor-debugger-open'], async (assert, fixture, controller) => {
  const toolbar = controller.debugger_toolbar; const calls = [];
  toolbar.host.request = async (...args) => { calls.push(args); };
  toolbar.host.open = async () => { calls.push(['open']); };
  toolbar.update({state:'running',frames:[]}); fixture.click('#run-menu'); await fixture.tick();
  assert.equal(calls.at(-1)[0], 'pause_execution');
  assert.equal(fixture.query('#run-menu str').getAttribute('sid'), '562');
  toolbar.update({state:'paused',frames:[{path:'test.jsl',line:1}]});
  fixture.click('#run-menu'); await fixture.tick();
  assert.equal(calls.at(-1)[0], 'resume_execution'); assert.equal(calls.at(-1)[1].action, 'continue');
  fixture.key(null,'F10'); await fixture.tick(); assert.equal(calls.at(-1)[1].action, 'stepOver');
  fixture.key(null,'F11'); await fixture.tick(); assert.equal(calls.at(-1)[1].action, 'stepInto');
  fixture.key(null,'F11',{shiftKey:true}); await fixture.tick(); assert.equal(calls.at(-1)[1].action, 'stepOut');
  assert.equal(fixture.document.querySelector('#editor-debugger-controls #editor-debugger-open'), null);
  assert.ok(fixture.query('#editor-more-popup #editor-debugger-open'));
  fixture.click('#editor-more-icon'); await fixture.tick();
  assert.notEqual(fixture.window.getComputedStyle(fixture.query('#editor-more-popup')).display, 'none');
  fixture.click('#editor-debugger-open'); await fixture.tick(); assert.equal(calls.at(-1)[0], 'open');
  assert.equal(fixture.window.getComputedStyle(fixture.query('#editor-more-popup')).display, 'none');
  const icon = fixture.query('#editor-debugger-open img');
  assert.equal(fixture.window.getComputedStyle(icon).width, '20px');
  assert.equal(fixture.window.getComputedStyle(icon).opacity, '0.3');
  toolbar.update({state:'idle'});
  assert.equal(fixture.query('#editor-debugger-actions').hidden,true);
  assert.equal(fixture.query('#run-menu str').getAttribute('sid'), '14');
});
