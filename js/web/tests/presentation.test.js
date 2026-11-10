/**
 * @file Real web presentation editor and generated preview interactions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { webTest } = require('./gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) { exports.MODULE_TESTS = tests; return; }

webTest(tests, 'web presentation source tabs and notes update the correct document', async function() {
  var t = GUI, w = await t.presentation(), doc = w.document, c = w.presentation_editor;
  for(var tab of [c.js_editor, c.css_editor, c.html_editor]) {
    tab.show(); t.eq(c.active_tab, tab.tab); t.eq(w.getComputedStyle(tab.code_editor.getWrapperElement()).display, 'block');
  }
  c.html_editor.code_editor.setCursor(0, 40);
  t.input('#slide-notes-body', 'Changed notes', doc); t.ok(c.html_editor.code_editor.getValue().includes('Changed notes'));
  t.click('#tab-save', doc); t.ok(t.app.fs.readTextFileSync('/workspace/gui-presentation/index.html').includes('Changed notes'));
});

webTest(tests, 'web presentation first/previous/next/last/number and thumbnail controls navigate', async function() {
  var t = GUI, w = await t.presentation(), doc = w.document, c = w.presentation_editor;
  t.click('#last-slide', doc); t.eq(c.current_slide, 1);
  t.click('#prev-slide', doc); t.eq(c.current_slide, 0);
  t.click('#next-slide', doc); t.eq(c.current_slide, 1);
  t.click('#first-slide', doc); t.eq(c.current_slide, 0);
  t.input('#set-slide', '2', doc, 'change'); t.eq(c.current_slide, 1);
  t.click('.slide-thumb', doc); t.eq(c.current_slide, 0);
  await t.wait(() => !doc.querySelector('.slide-thumb.loading'), 'real thumbnail iframe load');
});

for(const [action, expected] of [['insert-after', 3], ['duplicate', 3], ['delete', 1], ['move-up', 2], ['move-down', 2], ['go-to-code', 2]]) {
  webTest(tests, 'web presentation thumbnail menu ' + action + ' edits or selects source', async function(action, expected) {
    var t = GUI, w = await t.presentation(), doc = w.document, c = w.presentation_editor;
    var thumb = doc.querySelector('.slide-thumb:last-child');
    thumb.dispatchEvent(new w.MouseEvent('contextmenu', { clientX: 30, clientY: 30, bubbles: true, cancelable: true }));
    t.eq(c.slide_context_menu.style.display, 'block');
    c.slide_context_menu.querySelector('[data-action="' + action + '"]').click();
    t.eq(c.slide_entries.length, expected);
    t.eq(c.slide_context_menu.style.display, 'none');
  }, action, expected);
}

webTest(tests, 'web presentation drag/drop reorders slides and cleans visual state', async function() {
  var t = GUI, w = await t.presentation(), doc = w.document, c = w.presentation_editor;
  var thumb = doc.querySelector('.slide-thumb'), transfer = new w.DataTransfer();
  thumb.dispatchEvent(new w.DragEvent('dragstart', { dataTransfer: transfer, bubbles: true }));
  t.eq(c.drag_slide_index, 0);
  c.slide_thumbnails.dispatchEvent(new w.DragEvent('dragover', { dataTransfer: transfer, clientY: 10000, bubbles: true, cancelable: true }));
  c.slide_thumbnails.dispatchEvent(new w.DragEvent('drop', { dataTransfer: transfer, clientY: 10000, bubbles: true, cancelable: true }));
  thumb.dispatchEvent(new w.DragEvent('dragend', { bubbles: true }));
  c.slide_thumbnails.dispatchEvent(new w.DragEvent('dragend', { bubbles: true }));
  t.eq(c.drag_slide_index, undefined);
  t.ok(c.html_editor.code_editor.getValue().indexOf('Second') < c.html_editor.code_editor.getValue().indexOf('First'));
});

for(const choice of ['cancel', 'discard', 'save']) {
  webTest(tests, 'web presentation dirty close ' + choice + ' preserves the expected stored source', async function(choice) {
    var t = GUI, w = await t.presentation(), doc = w.document, c = w.presentation_editor;
    c.js_editor.code_editor.setValue('// dirty ' + choice);
    t.eq(c.beforeClose(), false); t.eq(t.visible('#close-dialog-cont', doc), true);
    t.click('#close-dialog-' + choice, doc);
    await new Promise(resolve => setTimeout(resolve, 30));
    if(choice === 'cancel') t.eq(t.app.window_manager.windows.has('gui-presentation'), true);
    else await t.wait(() => !t.app.window_manager.windows.has('gui-presentation'));
    t.eq(t.app.fs.readTextFileSync('/workspace/gui-presentation/main.js'), choice === 'save' ? '// dirty save' : '');
  }, choice);
}

webTest(tests, 'web presentation keyboard save, close cancellation and outside menu dismissal work', async function() {
  var t = GUI, w = await t.presentation(), doc = w.document, c = w.presentation_editor;
  c.js_editor.code_editor.setValue('// keyboard save'); t.key(doc, 's', { ctrlKey: true });
  t.eq(t.app.fs.readTextFileSync('/workspace/gui-presentation/main.js'), '// keyboard save');
  c.js_editor.code_editor.setValue('// dirty'); c.beforeClose(); t.key(doc, 'Escape'); t.eq(c.close_requested, false);
  c._openSlideContextMenu(0, 10, 10); doc.body.click(); t.eq(c.slide_context_menu.style.display, 'none');
  c._openSlideContextMenu(0, 10, 10); t.key(doc, 'Escape'); t.eq(c.slide_context_menu.style.display, 'none');
  w.CodeMirror.signal(c.html_editor.code_editor, 'keypress', c.html_editor.code_editor, new w.KeyboardEvent('keypress', { key: ';' }));
});
exports.MODULE_TESTS = tests;
