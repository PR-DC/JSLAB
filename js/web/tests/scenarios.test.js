/**
 * @file Browser keyboard, import/export, failure and delegated control scenarios
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { webTest } = require('./gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) { exports.MODULE_TESTS = tests; return; }

webTest(tests, 'web header external links request the expected destinations', async function() {
  var t = GUI, original = window.open, urls = [];
  window.open = url => { urls.push(url); return null; };
  try { t.click('#github-button'); t.click('#download-button'); t.eq(urls.length, 2); t.ok(urls.every(url => String(url).startsWith('https://'))); }
  finally { window.open = original; }
});

webTest(tests, 'web history rows and dialog support selection, navigation, execution and clearing', async function() {
  var t = GUI, app = t.app;
  app._pushHistoryCommand('var gui_history_old = 1;'); app._pushHistoryCommand('var gui_history_new = 2;');
  var row = t.q('#command-history > div:last-child'); row.click(); t.eq(app.code_input.getValue(), row.textContent);
  row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); await t.wait(() => app.workspace_state.some(row => row[0] === 'gui_history_new'));
  var cm = app.code_input; cm.setValue(''); cm.focus();
  for(var key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'F8', 'Escape']) {
    t.key(cm.getInputField(), key);
  }
  t.eq(cm.getValue(), '');
  t.key(cm.getInputField(), 'F7'); t.eq(t.visible('#command-window-history'), true);
  var list = t.q('#command-window-history-list'); list.querySelector('li').click();
  for(var key of ['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp']) t.key(list, key);
  t.key(list, 'Enter'); await new Promise(resolve => setTimeout(resolve, 30)); t.eq(t.visible('#command-window-history'), false);
  cm.focus(); t.key(cm.getInputField(), 'F7'); t.click('#command-window-history .history-close'); t.eq(t.visible('#command-window-history'), false);
  cm.focus(); t.key(cm.getInputField(), 'F7'); t.key(t.q('#command-window-history'), 'Escape');
  t.click('#clear-command-history-button'); t.eq(app.history.length, 0); t.eq(app.metadata.get('full_history').length, 0);
});

webTest(tests, 'web file/workspace/import menus close on Escape, outside click and scrolling', async function() {
  var t = GUI;
  t.app.code_input.setValue('unfinished draft');
  for(var event of ['escape', 'scroll', 'outside']) {
    t.app._openWorkspaceContextMenu('gui_history_new', 10, 10);
    if(event === 'escape') t.key(document, 'Escape');
    else if(event === 'scroll') t.q('#workspace').dispatchEvent(new Event('scroll')); else document.body.click();
    t.eq(t.visible('#workspace-context-menu'), false);
    t.app._openFileBrowserContextMenu('/workspace/untested-file.txt', 'file', 10, 10);
    if(event === 'escape') t.key(document, 'Escape');
    else if(event === 'scroll') t.q('#file-browser').dispatchEvent(new Event('scroll')); else document.body.click();
    t.eq(t.visible('#file-browser-context-menu'), false);
    t.click('#file-browser-import-button');
    if(event === 'escape') t.key(document, 'Escape');
    else if(event === 'scroll') t.q('#file-browser').dispatchEvent(new Event('scroll')); else document.body.click();
    t.eq(t.visible('#file-browser-import-menu'), false);
  }
  t.eq(t.app.code_input.getValue(), 'unfinished draft');
});

webTest(tests, 'web import-menu file and folder actions activate the corresponding inputs', async function() {
  var t = GUI, counts = { file: 0, folder: 0 };
  var open = t.app.runtime_info.supports_open_picker, directory = t.app.runtime_info.supports_directory_picker;
  t.app.runtime_info.supports_open_picker = false; t.app.runtime_info.supports_directory_picker = false;
  var file = event => { event.preventDefault(); counts.file++; }, folder = event => { event.preventDefault(); counts.folder++; };
  t.app.file_picker.addEventListener('click', file); t.app.folder_picker.addEventListener('click', folder);
  try {
    t.click('#file-browser-import-files-action'); t.click('#file-browser-import-folder-action');
    t.eq(counts.file, 1); t.eq(counts.folder, 1);
  } finally {
    t.app.file_picker.removeEventListener('click', file); t.app.folder_picker.removeEventListener('click', folder);
    t.app.runtime_info.supports_open_picker = open; t.app.runtime_info.supports_directory_picker = directory;
  }
});

webTest(tests, 'web URL import handles cancellation and imports a real HTTP resource', async function() {
  var t = GUI;
  t.click('#file-browser-import-url-button'); t.click('#inspector-input-close');
  t.click('#file-browser-import-url-button'); t.input('#inspector-input-field-1', location.origin + '/js/windows/mathjax-config.js');
  t.click('#inspector-input-submit');
  await t.wait(() => t.app.fs.existsFileSync('/workspace/mathjax-config.js'), 'HTTP import');
  t.ok(t.app.fs.readTextFileSync('/workspace/mathjax-config.js').includes('MathJax'));
});

webTest(tests, 'web log save handles native picker success and cancellation', async function() {
  var t = GUI, original = window.showSaveFilePicker, saved = '';
  try {
    window.showSaveFilePicker = async() => ({ name: 'test.log', async createWritable() { return { async write(blob) { saved = typeof blob === 'string' ? blob : await blob.text(); }, async close() {} }; } });
    t.app.handleSandboxRuntimeLog('GUI log exported', 'info'); t.click('#command-window-save-log');
    await t.wait(() => saved.includes('GUI log exported'));
    saved = ''; window.showSaveFilePicker = async() => { throw new DOMException('Canceled', 'AbortError'); };
    t.click('#command-window-save-log'); await new Promise(resolve => setTimeout(resolve, 30)); t.eq(saved, '');
  } finally { window.showSaveFilePicker = original; }
});

webTest(tests, 'web inspector delegated table and editable-cell actions use their inputs', async function() {
  var t = GUI;
  // Cancel paths exercise all generated prompts without mutating arbitrary user values.
  var state = { variable: 'gui_history_new', view: 'table' };
  for(var action of ['filter', 'table-filter-expr', 'table-addvar', 'table-renamevar', 'table-removevar']) {
    var button = document.createElement('button'); button.className = 'jslab-inspector-action'; button.dataset.variable = state.variable; button.dataset.action = action;
    t.q('#command-window-messages').appendChild(button); button.click();
    t.eq(t.visible('#inspector-input-container'), true); t.click('#inspector-input-cancel'); button.remove();
  }
  var cell = document.createElement('span'); cell.className = 'jslab-inspector-cell-editable'; cell.dataset.variable = 'gui_history_new'; cell.dataset.path = '[]';
  t.q('#command-window-messages').appendChild(cell); cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  t.eq(t.visible('#inspector-input-container'), true); t.click('#inspector-input-cancel'); cell.remove();
});

webTest(tests, 'web editor tab drag, middle-close and search keyboard paths preserve documents', async function() {
  var t = GUI, w = await t.editor(), doc = w.document;
  for(var i = 0; i < 3; i++) { t.click('#new-tab', doc); await new Promise(resolve => setTimeout(resolve, 20)); }
  var first = doc.querySelector('.tab');
  first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  await new Promise(resolve => w.requestAnimationFrame(() => w.requestAnimationFrame(resolve)));
  var handle = first.querySelector('.tab-drag-handle'), rect = handle.getBoundingClientRect();
  function pointer(target, type, x) { target.dispatchEvent(new w.PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: rect.top + 5, bubbles: true, cancelable: true })); }
  pointer(handle, 'pointerdown', rect.left + 5); pointer(doc, 'pointermove', rect.left + 30); pointer(doc, 'pointermove', rect.left + 700);
  await new Promise(resolve => setTimeout(resolve, 40)); pointer(doc, 'pointerup', rect.left + 700);
  await new Promise(resolve => setTimeout(resolve, 100)); t.eq(first.hasAttribute('active'), true);
  var tab = doc.querySelector('.tab[active]');
  var cm = [...doc.querySelectorAll('.CodeMirror')].find(el => w.getComputedStyle(el).display !== 'none').CodeMirror;
  cm.setValue('browserSearch browserSearch');
  t.click('#search-all-menu', doc); t.input('#editor-search-all-input', 'browserSearch', doc); t.key(t.q('#editor-search-all-input', doc), 'Enter');
  var result = t.q('.editor-search-all-item', doc); result.click(); t.ok(result.classList.contains('active'));
  t.key(result, 'Enter'); t.input('#editor-search-all-replace-input', 'changed', doc); t.key(t.q('#editor-search-all-replace-input', doc), 'Enter');
  t.ok(cm.getValue().includes('changed')); t.key(t.q('#editor-search-all-replace-input', doc), 'Escape');
  t.click('#search-all-menu', doc); t.key(t.q('#editor-search-all-close', doc), ' '); t.eq(t.visible('#editor-search-all-panel', doc), false);
  cm.setValue(''); t.click('#save-menu', doc); tab.dispatchEvent(new w.MouseEvent('mousedown', { button: 1, buttons: 4, bubbles: true }));
  t.eq(tab.isConnected, false);
});
exports.MODULE_TESTS = tests;
