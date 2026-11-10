/**
 * @file Web-specific keyboard, document, tree and lifecycle interactions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { webTest } = require('./gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) { exports.MODULE_TESTS = tests; return; }

webTest(tests, 'web tab-strip double-click creates a usable document and presentation tabs stay fixed', async function() {
  var t = GUI, w = await t.editor(), doc = w.document, before = doc.querySelectorAll('.tab').length;
  doc.querySelector('.tabs-content').dispatchEvent(new w.MouseEvent('dblclick', { bubbles: true }));
  t.eq(doc.querySelectorAll('.tab').length, before + 1);
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
  cm.setValue('tab strip document'); t.eq(cm.getValue(), 'tab strip document');
  var pw = await t.presentation(), pd = pw.document, total = pd.querySelectorAll('.tab').length;
  pd.querySelector('.tabs-content').dispatchEvent(new pw.MouseEvent('dblclick', { bubbles: true }));
  t.eq(pd.querySelectorAll('.tab').length, total);
});

webTest(tests, 'web CodeMirror keypress, drop and scrolling invoke editor and terminal handlers', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
  w.CodeMirror.signal(cm, 'keypress', cm, new w.KeyboardEvent('keypress', { key: ';' }));
  var drop = new w.Event('drop', { cancelable: true }); w.CodeMirror.signal(cm, 'drop', cm, drop); t.eq(drop.defaultPrevented, true);
  cm.getWrapperElement().dispatchEvent(new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }));
  w.CodeMirror.signal(cm, 'scroll', cm); t.eq(t.visible('#editor-context-menu', doc), false);
  CodeMirror.signal(t.app.code_input, 'keypress', t.app.code_input, new KeyboardEvent('keypress', { key: ';' }));
  CodeMirror.signal(t.app.code_input, 'keydown', t.app.code_input, new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
  t.eq(t.app.code_input.getValue(), '');
  w.dispatchEvent(new w.Event('resize'));
});

webTest(tests, 'web directory double-click/context menu and workspace double-click act on selected entries', async function() {
  var t = GUI; t.app.fs.writeTextFileSync('/workspace/gui-tree-actions/item.jsl', '1'); await t.app._refreshWorkspaceList();
  var item = [...document.querySelectorAll('#file-browser-cont li')].find(el => el.getAttribute('path') === '/workspace/gui-tree-actions'); t.ok(item);
  var span = item.querySelector('span');
  span.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); t.ok(t.app.file_tree_expanded_paths.has('/workspace/gui-tree-actions'));
  span.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }));
  t.eq(t.visible('#file-browser-context-menu'), true); document.body.click();
  await t.app._evaluateCommand('gui_double_click = 123');
  var row = document.querySelector('#workspace .row[variable="gui_double_click"]'); t.ok(row);
  row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await t.wait(() => t.app.history.at(-1) === 'gui_double_click');
});

webTest(tests, 'web documentation hover See More routes main and presentation help requests', async function() {
  var t = GUI;
  for(var hover of [t.app.code_doc_hover, (await t.presentation()).presentation_editor.js_editor.code_doc_hover]) {
    var doc = hover.wrapper.ownerDocument, w = doc.defaultView;
    hover.wrapper.dispatchEvent(new w.MouseEvent('mousemove', { clientX: 1, clientY: 1 }));
    hover.wrapper.dispatchEvent(new w.MouseEvent('mouseleave'));
    function show() { hover._showTooltip('sin', [{ name: 'sin', doc_query: 'sin', description: 'Sine' }], 10, 10); }
    show(); hover.tooltip.dispatchEvent(new w.MouseEvent('mouseenter')); hover.tooltip.querySelector('button').click();
    hover.tooltip.dispatchEvent(new w.MouseEvent('mouseleave')); hover.wrapper.dispatchEvent(new w.MouseEvent('mousedown')); t.eq(hover.tooltip, undefined);
    show(); w.CodeMirror.signal(hover.cm, 'scroll', hover.cm); t.eq(hover.tooltip, undefined);
    show(); w.CodeMirror.signal(hover.cm, 'blur', hover.cm); t.eq(hover.tooltip, undefined);
    show(); hover.tooltip.querySelector('button').dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true })); t.eq(hover.tooltip, undefined);
  }
  t.ok(t.app.window_manager.windows.size > 0);
});

webTest(tests, 'web editor unavailable Arduino actions report their result without losing text', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror, before = cm.getValue();
  t.click('#compile-dialog-menu', doc); t.click('#upload-dialog-menu', doc);
  t.eq(cm.getValue(), before);
});

webTest(tests, 'web editor managed-window close and reopen retain a usable editor', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  while(w.__JSLAB_WEB_EDITOR__.hasDirtyTabs()) {
    w.__JSLAB_WEB_EDITOR__.closeActiveTab();
    if(t.visible('#close-dialog-cont', doc)) t.click('#close-dialog-discard', doc);
    else break;
  }
  t.app.window_manager.close(t.app.editor_window_id);
  await t.wait(() => !t.app.window_manager.windows.has(t.app.editor_window_id));
  t.ok((await t.editor()).__JSLAB_WEB_EDITOR__);
});
webTest(tests, 'web editor find keyboard replacement, symbols and search panel drag preserve input', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
  cm.setValue('needle needle'); cm.setCursor(0, 0); t.click('#search-dialog-menu', doc);
  var wrapper = cm.getWrapperElement(), find = wrapper.querySelector('.CodeMirror-search-find'), replace = wrapper.querySelector('.CodeMirror-search-replace');
  find.value = 'needle'; find.dispatchEvent(new w.KeyboardEvent('keyup', { key: 'e', bubbles: true })); t.eq(cm.getSelection(), 'needle');
  t.key(find, 'Enter'); t.key(find, 'ArrowUp', { altKey: true }); t.eq(find.value, 'needle');
  replace.value = 'changed'; t.key(replace, 'Enter'); t.ok(cm.getValue().includes('changed'));
  cm.setValue('needle needle'); find.value = 'needle'; replace.value = 'button'; wrapper.querySelector('.CodeMirror-search-replace-btn').click(); t.ok(cm.getValue().includes('button'));
  t.key(find, 'Escape'); await t.wait(() => w.getComputedStyle(wrapper.querySelector('.CodeMirror-search-dialog')).display === 'none');
  var symbol = doc.querySelector('.editor-symbol-key'), event = new w.MouseEvent('mousedown', { bubbles: true, cancelable: true }); symbol.dispatchEvent(event); t.eq(event.defaultPrevented, true);
  t.click('#search-all-menu', doc);
  var panel = doc.getElementById('editor-search-all-panel'), before = panel.getBoundingClientRect().height;
  doc.getElementById('editor-search-all-resizer').dispatchEvent(new w.MouseEvent('mousedown', { clientY: 300, button: 0, bubbles: true, cancelable: true }));
  doc.dispatchEvent(new w.MouseEvent('mousemove', { clientY: 260, bubbles: true }));
  doc.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  t.ok(panel.getBoundingClientRect().height >= before); t.eq(doc.body.classList.contains('dragging'), false);
  t.click('#editor-search-all-close', doc);
});

webTest(tests, 'web editor identifier hover opens documentation through See More', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
  cm.setValue('sin(1)'); cm.setCursor(0, 1); cm.focus(); cm.refresh();
  var pos = cm.charCoords({ line: 0, ch: 1 }, 'window');
  cm.getWrapperElement().dispatchEvent(new w.MouseEvent('mousemove', { clientX: pos.left + 1, clientY: pos.top + 2, bubbles: true }));
  await t.wait(() => doc.querySelector('.jslab-doc-hover-tooltip'), 'editor documentation tooltip');
  doc.querySelector('.jslab-doc-hover-tooltip button').dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  t.eq(doc.querySelector('.jslab-doc-hover-tooltip'), null);
});
exports.MODULE_TESTS = tests;
