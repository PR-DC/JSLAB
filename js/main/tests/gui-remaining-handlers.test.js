/**
 * @file Documentation, tab creation and resource failure regression tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest, sent } = require('../../dev/gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }

for(const type of ['main', 'editor']) {
  guiTest(tests, type, type + ' documentation mouse and blur handlers hide tooltips and See More prints help', [], function(assert, f, c) {
    var owner = type === 'main' ? c.command_window : c.script_manager.scripts[0];
    var hover = owner.code_doc_hover, cm = hover.cm, wrapper = cm.getWrapperElement();
    function show() { hover._showTooltip('sin', [{ name: 'sin', doc_query: 'sin', description: 'Sine' }], 10, 10); }
    wrapper.dispatchEvent(new f.window.MouseEvent('mousemove', { clientX: 1, clientY: 1 }));
    wrapper.dispatchEvent(new f.window.MouseEvent('mouseleave'));
    show(); wrapper.dispatchEvent(new f.window.MouseEvent('mousedown')); assert.equal(hover.tooltip, undefined);
    show(); f.window.CodeMirror.signal(cm, 'blur', cm); assert.equal(hover.tooltip, undefined);
    show(); hover.tooltip.querySelector('button').dispatchEvent(new f.window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    assert.equal(hover.tooltip, undefined);
    assert.ok(f.calls.some(call => JSON.stringify(call).includes('sin')));
  });
}

guiTest(tests, 'editor', 'double-clicking empty tab strip creates a document associated with the new tab', [], function(assert, f, c) {
  var manager = c.script_manager, before = manager.scripts.length;
  f.query('.tabs-content').dispatchEvent(new f.window.MouseEvent('dblclick', { bubbles: true }));
  assert.equal(manager.scripts.length, before + 1);
  assert.equal(manager.tabs.tabEls.length, manager.scripts.length);
  var script = manager.getScriptByTab(manager.active_tab)[0];
  script.code_editor.setValue('usable new document'); assert.equal(script.code_editor.getValue(), 'usable new document');
});

guiTest(tests, 'presentation-editor', 'double-clicking presentation tabs preserves the fixed source documents', [], function(assert, f) {
  var c = require('../../windows/tests/gui-presentation-editor.test').setup(f), before = c.tabs.tabEls.length;
  f.query('.tabs-content').dispatchEvent(new f.window.MouseEvent('dblclick', { bubbles: true }));
  assert.equal(c.tabs.tabEls.length, before);
});

guiTest(tests, 'main', 'diary write failure disables logging and reports the error', [], function(assert, f, c) {
  var stream = new (require('events').EventEmitter)();
  stream.end = function() { this.writableEnded = true; }; stream.destroy = function() { this.destroyed = true; };
  f.fs.createWriteStream = () => stream;
  var terminal = c.command_window;
  assert.equal(terminal.openDiaryStream('memory-diary.txt'), true); terminal.diary_enabled = true;
  stream.emit('error', new Error('Diary failure sentinel'));
  assert.equal(terminal.diary_enabled, false);
  assert.ok(f.query('#command-window-messages').textContent.includes('Diary failure sentinel'));
});

guiTest(tests, 'presentation', 'standalone viewer hash navigation and buffered-file success/failure settle', [], async function(assert, f) {
  var c = require('../../windows/tests/gui-presentation-viewer.test').setup(f, false);
  f.window.history.replaceState(null, '', '#s2'); f.window.dispatchEvent(new f.window.HashChangeEvent('hashchange'));
  assert.equal(c.current_slide, 1);
  var promise = f.window.loadFileBuf('gui-buffer');
  var script = f.document.head.querySelector('script:last-of-type'); script.removeAttribute('src');
  f.window.file_buffers[encodeURIComponent('gui-buffer')] = [1, 2, 3]; script.dispatchEvent(new f.window.Event('load'));
  assert.deepEqual(Array.from(await promise), [1, 2, 3]);
  promise = f.window.loadFileBuf('gui-buffer-error');
  var rejected = promise.then(() => false, err => err.message.includes('Failed to load buffered file'));
  script = f.document.head.querySelector('script:last-of-type'); script.removeAttribute('src'); script.dispatchEvent(new f.window.Event('error'));
  assert.equal(await rejected, true);
});
exports.MODULE_TESTS = tests;
