/**
 * @file Editor tab selection, dragging, dirty state and close lifecycle
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

guiTest(tests, 'editor', 'switching tabs preserves each document and shows only the active editor', ['.tab-drag-handle'], function(assert, f, c) {
  var m = c.script_manager, first = m.scripts[0];
  first.code_editor.setValue('first document'); f.click('#new-tab');
  var second = m.scripts[1]; second.code_editor.setValue('second document');
  var rect = first.tab.getBoundingClientRect();
  f.pointer(first.tab.querySelector('.tab-drag-handle'), 'pointerdown', rect.left + 10, rect.top + 10);
  f.pointer(f.document, 'pointerup', rect.left + 10, rect.top + 10);
  assert.equal(m.active_tab, first.tab);
  assert.equal(first.code_editor.getValue(), 'first document');
  assert.equal(second.code, 'second document');
  assert.equal(f.window.$(first.code_editor.getWrapperElement()).is(':visible'), true);
  assert.equal(f.window.$(second.code_editor.getWrapperElement()).is(':visible'), false);
});

guiTest(tests, 'editor', 'dragging an editor tab reorders it and preserves its document', ['.tab-drag-handle'], async function(assert, f, c) {
  var m = c.script_manager;
  f.click('#new-tab'); f.click('#new-tab');
  var first = m.scripts[0]; first.code_editor.setValue('dragged document');
  var handle = first.tab.querySelector('.tab-drag-handle'), rect = handle.getBoundingClientRect();
  var x = rect.left + 10, y = rect.top + 10;
  f.pointer(handle, 'pointerdown', x, y);
  f.pointer(f.document, 'pointermove', x + 20, y);
  f.pointer(f.document, 'pointermove', x + 500, y);
  await f.frames();
  f.pointer(f.document, 'pointerup', x + 500, y);
  await f.frames(5);
  assert.equal(m.tabs.tabEls.at(-1), first.tab);
  assert.equal(m.active_tab, first.tab);
  assert.equal(first.code_editor.getValue(), 'dragged document');
  assert.equal(m.tabs.isDragging, false);
  assert.equal(f.query('.tabs').classList.contains('tabs-is-sorting'), false);
});

for(const mode of ['close-button', 'middle-button', 'shortcut']) {
  guiTest(tests, 'editor', 'clean tab closes via ' + mode, ['.tab-close'], function(assert, f, c) {
    f.click('#new-tab'); var m = c.script_manager, tab = m.active_tab;
    if(mode === 'close-button') tab.querySelector('.tab-close').click();
    else if(mode === 'middle-button') f.mouse(tab, 'mousedown', 0, 0, { button: 1, buttons: 4 });
    else f.key(null, 'F4', { ctrlKey: true });
    assert.equal(m.scripts.length, 1);
    assert.equal(tab.isConnected, false);
  });
}

guiTest(tests, 'editor', 'closing the final clean tab creates a usable replacement', ['.tab-close'], function(assert, f, c) {
  var previous = c.script_manager.active_tab;
  previous.querySelector('.tab-close').click();
  assert.equal(c.script_manager.scripts.length, 1);
  assert.ok(c.script_manager.active_tab !== previous);
  assert.equal(c.script_manager.active_tab.isConnected, true);
});

for(const choice of ['save', 'discard', 'cancel']) {
  guiTest(tests, 'editor', 'dirty tab close dialog ' + choice + ' preserves the expected document state',
    ['#close-dialog-' + choice], function(assert, f, c) {
      var m = c.script_manager, script = m.scripts[0];
      var file = path.join(root, 'gui-close.jsl');
      script.path = file;
      script.code_editor.setValue('unsaved changes');
      assert.equal(script.tab.classList.contains('changed'), true);
      script.tab.querySelector('.tab-close').click();
      assert.equal(f.visible('#close-dialog-cont'), true);
      assert.equal(script.tab.isConnected, true);
      f.click('#close-dialog-' + choice);
      if(choice === 'cancel') {
        assert.equal(script.tab.isConnected, true);
        assert.equal(script.closing, false);
        assert.equal(script.code_editor.getValue(), 'unsaved changes');
      } else {
        assert.equal(script.tab.isConnected, false);
        assert.equal(f.files.has(file), choice === 'save');
        if(choice === 'save') assert.equal(f.files.get(file), 'unsaved changes');
      }
      assert.equal(f.visible('#close-dialog-cont'), false);
    });
}

guiTest(tests, 'editor', 'close-all persists tabs and closes without creating a replacement', [], function(assert, f, c) {
  f.click('#new-tab'); f.emit('EditorWindow', 'close-all');
  assert.equal(c.script_manager.scripts.length, 0);
  assert.equal(f.document.querySelectorAll('.tab').length, 0);
  sent(assert, f, 'MainProcess', 'close-editor');
  assert.ok(Array.isArray(f.data.get('last_script_paths')));
});

exports.MODULE_TESTS = tests;
