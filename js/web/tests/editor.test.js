/**
 * @file Real browser editor frame document and control scenarios
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { webTest } = require('./gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) { exports.MODULE_TESTS = tests; return; }

webTest(tests, 'web editor creates tabs and saves real workspace files', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  w.$.fx.off = true;
  var count = doc.querySelectorAll('.tab').length;
  for(var selector of ['#new-tab', '#new-script']) {
    t.click(selector, doc); await t.wait(() => doc.querySelectorAll('.tab').length > count);
    count++; t.eq(doc.querySelectorAll('.tab').length, count);
  }
  var wrapper = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none');
  wrapper.CodeMirror.setValue('// browser saved content');
  var file = doc.querySelector('.tab[active]').title;
  t.click('#save-menu', doc); await t.wait(() => t.app.fs.readTextFileSync(file) === '// browser saved content');
  t.eq(doc.querySelector('.tab[active]').classList.contains('changed'), false);
});

webTest(tests, 'web editor dirty close supports cancel, discard and save', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  for(var choice of ['cancel', 'discard', 'save']) {
    t.click('#new-tab', doc); await new Promise(resolve => setTimeout(resolve, 30));
    var tab = doc.querySelector('.tab[active]'), file = tab.title;
    var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
    cm.setValue('dirty ' + choice); tab.querySelector('.tab-close').click();
    t.eq(t.visible('#close-dialog-cont', doc), true);
    t.click('#close-dialog-' + choice, doc); await new Promise(resolve => setTimeout(resolve, 30));
    t.eq(tab.isConnected, choice === 'cancel');
    if(choice === 'save') t.eq(t.app.fs.readTextFileSync(file), 'dirty save');
    if(choice === 'cancel') { tab.querySelector('.tab-close').click(); t.click('#close-dialog-discard', doc); }
  }
});

webTest(tests, 'web editor context actions comment, select, undo and redo real text', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
  cm.setValue('value = 1;'); cm.clearHistory();
  t.click('#editor-context-toggle-comment', doc); t.ok(cm.getValue().includes('//'));
  t.click('#editor-context-undo', doc); t.eq(cm.getValue(), 'value = 1;');
  t.click('#editor-context-redo', doc); t.ok(cm.getValue().includes('//'));
  t.click('#editor-context-select-all', doc); t.eq(cm.getSelection(), cm.getValue());
  cm.getWrapperElement().dispatchEvent(new w.MouseEvent('contextmenu', { clientX: 30, clientY: 30, bubbles: true, cancelable: true }));
  t.eq(t.visible('#editor-context-menu', doc), true);
  doc.dispatchEvent(new w.Event('scroll')); t.eq(t.visible('#editor-context-menu', doc), false);
});

webTest(tests, 'web editor clipboard actions handle read/write permissions and empty selections', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
  var original = Object.getOwnPropertyDescriptor(w.navigator, 'clipboard'), text = '';
  Object.defineProperty(w.navigator, 'clipboard', { configurable: true, value: { async writeText(value) { text = value; }, async readText() { return text; } } });
  try {
    cm.setValue('alpha beta'); cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 5 });
    t.click('#editor-context-copy', doc); await t.wait(() => text === 'alpha'); t.eq(cm.getValue(), 'alpha beta');
    t.click('#editor-context-cut', doc); await t.wait(() => cm.getValue() === ' beta');
    text = 'pasted'; t.click('#editor-context-paste', doc); await t.wait(() => cm.getValue() === 'pasted beta');
  } finally { if(original) Object.defineProperty(w.navigator, 'clipboard', original); else delete w.navigator.clipboard; }
});

webTest(tests, 'web editor runs document, current line and current section through the real sandbox', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
  cm.setValue('/// section\nvar gui_editor_value = 29;'); cm.setCursor(1, 0);
  for(var selector of ['#run-menu', '#editor-context-run-line', '#editor-context-run-section']) {
    t.click(selector, doc); await t.wait(() => t.app.workspace_state.some(row => row[0] === 'gui_editor_value'));
  }
  t.ok(t.app.workspace_state.some(row => row[0] === 'gui_editor_value'));
});

webTest(tests, 'web editor search, replace, case/regex options and symbol buttons work', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
  cm.setValue('uniqueText uniqueText'); cm.setCursor(0, 0);
  t.click('#search-dialog-menu', doc); t.input('.CodeMirror:not([style*="display: none"]) .CodeMirror-search-find', 'uniqueText', doc);
  var wrap = cm.getWrapperElement();
  for(var selector of ['.CodeMirror-search-find-next-btn', '.CodeMirror-search-find-prev-btn']) { wrap.querySelector(selector).click(); t.eq(cm.getSelection(), 'uniqueText'); }
  for(var selector of ['.CodeMirror-search-case-btn', '.CodeMirror-search-regex-btn']) { wrap.querySelector(selector).click(); t.ok(wrap.querySelector(selector).classList.contains('active')); }
  wrap.querySelector('.CodeMirror-search-replace').value = 'replaced'; wrap.querySelector('.CodeMirror-search-replace-all-btn').click(); t.eq(cm.getValue(), 'replaced replaced');
  wrap.querySelector('.CodeMirror-search-close-btn').click();
  t.click('#search-all-menu', doc); t.input('#editor-search-all-input', 'replaced', doc); t.click('#editor-search-all-run', doc);
  t.ok(doc.querySelectorAll('.editor-search-all-item').length > 0);
  for(var selector of ['#editor-search-all-case-btn', '#editor-search-all-regex-btn']) { t.click(selector, doc); t.ok(t.q(selector, doc).classList.contains('active')); }
  t.input('#editor-search-all-replace-input', 'final', doc); t.click('#editor-search-all-replace-btn', doc); t.ok(cm.getValue().includes('final'));
  t.click('#editor-search-all-replace-all-btn', doc); t.eq(cm.getValue(), 'final final');
  t.click('#editor-search-all-close', doc); t.eq(t.visible('#editor-search-all-panel', doc), false);
  t.click('#symbol-input-menu', doc);
  var key = t.q('.editor-symbol-key', doc), before = cm.getValue(); key.click(); t.ok(cm.getValue().length > before.length);
});

webTest(tests, 'web editor open action opens workspace dialog and Save As cancellation retains text', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var before_picker = t.app.runtime_info.supports_open_picker, picker_clicks = 0;
  t.app.runtime_info.supports_open_picker = false;
  var on_picker = event => { picker_clicks++; event.preventDefault(); };
  t.app.file_picker.addEventListener('click', on_picker);
  t.click('#open-menu', doc); t.eq(picker_clicks, 1);
  t.app.file_picker.removeEventListener('click', on_picker); t.app.runtime_info.supports_open_picker = before_picker;
  var original = window.showSaveFilePicker;
  window.showSaveFilePicker = async() => { throw new DOMException('Canceled by test', 'AbortError'); };
  try {
    var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
    var before = cm.getValue(); t.click('#save-as-menu', doc); await new Promise(resolve => setTimeout(resolve, 30)); t.eq(cm.getValue(), before);
  } finally { window.showSaveFilePicker = original; }
});

webTest(tests, 'web editor key, drop, scroll and more-menu handlers keep usable documents', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  var count = doc.querySelectorAll('.tab').length;
  t.key(doc, 'n', { ctrlKey: true }); await t.wait(() => doc.querySelectorAll('.tab').length > count);
  t.key(doc, 'F4', { ctrlKey: true }); await t.wait(() => doc.querySelectorAll('.tab').length === count);
  var event = new w.Event('drop', { bubbles: true, cancelable: true }); doc.dispatchEvent(event); t.eq(event.defaultPrevented, true);
  event = new w.Event('dragover', { bubbles: true, cancelable: true }); doc.dispatchEvent(event); t.eq(event.defaultPrevented, true);
  t.click('#editor-more-icon', doc); await t.wait(() => t.visible('#editor-more-popup', doc));
  await new Promise(resolve => setTimeout(resolve, 30)); doc.body.click(); await t.wait(() => !t.visible('#editor-more-popup', doc));
});
exports.MODULE_TESTS = tests;
