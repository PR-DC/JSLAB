/**
 * @file Editor toolbar, context menu, clipboard, shortcuts and file dialogs
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest, sent } = require('../../dev/gui-test-utils');
const { root } = require('../../dev/gui-test-fixture');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }
function active(c) { return c.script_manager.getScriptByTab(c.script_manager.active_tab)[0]; }

for(const selector of ['#new-tab', '#new-script']) {
  guiTest(tests, 'editor', selector + ' creates an active editor tab', [selector], function(assert, f, c) {
    var previous = active(c); previous.code_editor.setValue('previous tab');
    f.click(selector);
    assert.equal(c.script_manager.scripts.length, 2);
    assert.ok(active(c) !== previous);
    assert.equal(previous.code, 'previous tab');
    assert.equal(active(c).code_editor.getValue(), '');
  });
}
for(const selector of ['#save-menu', '#save-as-menu']) {
  guiTest(tests, 'editor', selector + ' writes the active document and clears dirty state', [selector], function(assert, f, c) {
    var file = path.join(root, 'gui-fixture-save.jsl');
    var script = active(c); script.code_editor.setValue('saved content');
    f.setSyncResult('showSaveDialogSync', file);
    f.click(selector);
    assert.equal(f.files.get(file), 'saved content');
    assert.equal(script.path, file);
    assert.equal(script.tab.classList.contains('changed'), false);
  });
}
guiTest(tests, 'editor', 'canceling Save As preserves the unsaved document', ['#save-as-menu'], function(assert, f, c) {
  active(c).code_editor.setValue('keep changes');
  f.click('#save-as-menu');
  assert.equal(active(c).path, undefined);
  assert.equal(active(c).code_editor.getValue(), 'keep changes');
  assert.equal(f.files.size, 0);
});

guiTest(tests, 'editor', 'open menu loads a file and reopening activates the existing tab', ['#open-menu'], async function(assert, f, c) {
  var file = path.join(root, 'gui-open.jsl'); f.files.set(file, 'opened content');
  f.setDialogResult({ canceled: false, filePaths: [file] });
  f.click('#open-menu'); await f.tick();
  assert.equal(active(c).code_editor.getValue(), 'opened content');
  assert.equal(c.script_manager.scripts.length, 2);
  f.click('#open-menu'); await f.tick();
  assert.equal(c.script_manager.scripts.length, 2);
  assert.equal(active(c).path, file);
});
guiTest(tests, 'editor', 'canceling Open leaves tabs unchanged', ['#open-menu'], async function(assert, f, c) {
  f.click('#open-menu'); await f.tick(); assert.equal(c.script_manager.scripts.length, 1);
});

guiTest(tests, 'editor', 'run toolbar saves the script and requests execution', ['#run-menu'], function(assert, f, c) {
  var file = path.join(root, 'gui-run.jsl');
  active(c).code_editor.setValue('run this'); f.setSyncResult('showSaveDialogSync', file);
  f.click('#run-menu');
  assert.equal(f.files.get(file), 'run this');
  assert.equal(sent(assert, f, 'MainWindow', 'run')[0], file);
});

for(const [selector, command] of [
  ['#editor-context-run-line', 'line'], ['#editor-context-run-section', 'section']
]) {
  guiTest(tests, 'editor', selector + ' requests the selected code', [selector], function(assert, f, c) {
    active(c).code_editor.setValue('/// first\nfirst();\n/// second\nsecond();');
    active(c).code_editor.setCursor(3, 0);
    f.setSyncResult('showSaveDialogSync', path.join(root, 'gui-selection.jsl'));
    c.editor.openContextMenu(20, 20); f.click(selector);
    var payload = sent(assert, f, 'MainWindow', 'run');
    assert.equal(payload[0], path.join(root, 'gui-selection.jsl'));
    if(command === 'line') assert.equal(payload[1], 4);
    else assert.deepEqual(Array.from(payload[1]), [4, 4]);
    assert.equal(f.visible('#editor-context-menu'), false);
  });
}
guiTest(tests, 'editor', 'context comment button toggles comments in the active script', ['#editor-context-toggle-comment'], function(assert, f, c) {
  var cm = active(c).code_editor; cm.setValue('value = 1;');
  f.click('#editor-context-toggle-comment'); assert.ok(cm.getValue().includes('//'));
  f.click('#editor-context-toggle-comment'); assert.equal(cm.getValue(), 'value = 1;');
});

for(const action of ['cut', 'copy', 'paste', 'select-all', 'undo', 'redo']) {
  guiTest(tests, 'editor', 'context ' + action + ' updates the real CodeMirror document', ['#editor-context-' + action], function(assert, f, c) {
    var cm = active(c).code_editor;
    cm.setValue('alpha beta'); cm.clearHistory();
    cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 5 });
    f.setClipboard('PASTED');
    if(action === 'undo' || action === 'redo') {
      cm.replaceSelection('changed', 'end', '+input');
      if(action === 'redo') cm.undo();
    }
    f.click('#editor-context-' + action);
    if(action === 'cut') { assert.equal(cm.getValue(), ' beta'); assert.equal(f.getClipboard(), 'alpha'); }
    if(action === 'copy') { assert.equal(cm.getValue(), 'alpha beta'); assert.equal(f.getClipboard(), 'alpha'); }
    if(action === 'paste') assert.equal(cm.getValue(), 'PASTED beta');
    if(action === 'select-all') assert.equal(cm.getSelection(), 'alpha beta');
    if(action === 'undo') assert.equal(cm.getValue(), 'alpha beta');
    if(action === 'redo') assert.equal(cm.getValue(), 'changed beta');
  });
}

for(const [selector, action] of [['#win-close', 'close-editor'], ['#win-minimize', 'minimize-win']]) {
  guiTest(tests, 'editor', selector + ' requests ' + action, [selector], function(assert, f) {
    f.click(selector); sent(assert, f, 'MainProcess', action);
  });
}
guiTest(tests, 'editor', 'editor restore button toggles maximize and restore', ['#win-restore'], function(assert, f) {
  f.click('#win-restore'); sent(assert, f, 'MainProcess', 'maximize-win');
  f.click('#win-restore'); sent(assert, f, 'MainProcess', 'restore-win');
});

guiTest(tests, 'editor', 'more menu opens and closes on an outside click', ['#editor-more-icon'], async function(assert, f) {
  f.click('#editor-more-icon'); await f.tick();
  assert.equal(f.visible('#editor-more-popup'), true);
  f.document.body.click(); await f.tick();
  assert.equal(f.visible('#editor-more-popup'), false);
});
guiTest(tests, 'editor', 'symbol keyboard inserts every rendered key at the active cursor', ['#symbol-input-menu', '.editor-symbol-key'], async function(assert, f, c) {
  f.click('#symbol-input-menu'); await f.tick();
  assert.equal(f.visible('#editor-symbol-popup'), true);
  var cm = active(c).code_editor;
  var expected = '';
  for(const key of f.document.querySelectorAll('.editor-symbol-key')) {
    f.mouse(key, 'mousedown', 0, 0);
    key.click(); expected += key.getAttribute('data-symbol');
    assert.equal(cm.getValue(), expected);
  }
});

for(const [selector, action] of [['#compile-dialog-menu', 'compile'], ['#upload-dialog-menu', 'upload']]) {
  guiTest(tests, 'editor', action + ' menu dispatches the Arduino action', [selector], function(assert, f, c) {
    active(c).path = path.join(root, 'fixture.ino');
    f.click(selector);
    var calls = f.calls.filter(call => call[0] === 'MainWindow');
    assert.ok(calls.some(call => JSON.stringify(call).includes(action)), 'Expected Arduino ' + action + ' request');
  });
}

for(const [key, options, action] of [
  ['F11', {}, 'set-fullscreen'], ['F12', {}, 'show-dev-tools'], ['c', { ctrlKey: true }, 'stop-loop']
]) {
  guiTest(tests, 'editor', 'editor shortcut ' + key + ' sends ' + action, [], function(assert, f) {
    f.key(null, key, options);
    sent(assert, f, action === 'stop-loop' ? 'SandboxWindow' : 'MainProcess', action);
  });
}
guiTest(tests, 'editor', 'Ctrl+N creates a tab and Ctrl+F4 closes it', [], function(assert, f, c) {
  f.key(null, 'n', { ctrlKey: true }); assert.equal(c.script_manager.scripts.length, 2);
  f.key(null, 'F4', { ctrlKey: true }); assert.equal(c.script_manager.scripts.length, 1);
});
guiTest(tests, 'editor', 'Escape and outside clicks dismiss the context menu', [], function(assert, f, c) {
  c.editor.openContextMenu(9999, 9999);
  var rect = f.query('#editor-context-menu').getBoundingClientRect();
  assert.ok(rect.right <= f.window.innerWidth);
  assert.ok(rect.bottom <= f.window.innerHeight);
  f.key(null, 'Escape'); assert.equal(f.visible('#editor-context-menu'), false);
  c.editor.openContextMenu(10, 10); f.document.body.click();
  assert.equal(f.visible('#editor-context-menu'), false);
});

exports.MODULE_TESTS = tests;
