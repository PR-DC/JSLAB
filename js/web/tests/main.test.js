/**
 * @file Web shell buttons, inputs, dialogs, history, workspace and imports
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { webTest } = require('./gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) { exports.MODULE_TESTS = tests; return; }

for(const name of ['help', 'info', 'settings']) {
  webTest(tests, 'web ' + name + ' dialog opens, closes by button and Escape', async function(name) {
    var t = GUI; t.click('#' + name + '-menu'); t.eq(t.visible('#' + name + '-container'), true);
    t.click('#' + name + '-close'); t.eq(t.visible('#' + name + '-container'), false);
    t.click('#' + name + '-menu'); t.key(t.q('#' + name + '-container'), 'Escape'); t.eq(t.visible('#' + name + '-container'), false);
  }, name);
}

webTest(tests, 'web settings language and history input persist in localStorage', async function() {
  var t = GUI; t.click('#settings-menu');
  t.input('#language-select', 'rs', document, 'change'); t.eq(t.app.language.lang, 'rs');
  t.input('#history-max-input', '7'); t.click('#settings-apply-button'); t.eq(t.app.history_max, 7);
  t.input('#language-select', 'en', document, 'change'); t.eq(t.app.language.lang, 'en');
  t.eq(t.app.metadata.get('lang_index'), 0);
});

webTest(tests, 'web timestamp and autoscroll controls persist both states', async function() {
  var t = GUI;
  for(var name of ['timestamp', 'autoscroll']) {
    var property = name === 'timestamp' ? 'show_timestamp' : 'autoscroll', before = t.app[property];
    t.click('#command-window-' + name + '-button'); t.eq(t.app[property], !before);
    t.eq(t.app.metadata.get(property), !before);
    t.click('#command-window-' + name + '-button'); t.eq(t.app[property], before);
  }
});

webTest(tests, 'web terminal settings input clamps low values and closes with button/Escape', async function() {
  var t = GUI; t.click('#command-window-settings-button');
  t.input('#command-window-settings .N-messages-max', '1'); t.click('#command-window-settings-apply');
  t.eq(t.app.N_messages_max, 5); t.eq(t.visible('#command-window-settings'), false);
  t.click('#command-window-settings-button'); t.click('#command-window-settings .options-close');
  t.eq(t.visible('#command-window-settings'), false);
  t.click('#command-window-settings-button'); t.key(t.q('#command-window-settings'), 'Escape');
  t.eq(t.visible('#command-window-settings'), false);
});

webTest(tests, 'web log timestamp checkbox and dialog close/Escape work', async function() {
  var t = GUI; t.click('#command-window-log-button');
  var before = t.app.write_timestamps; t.click('#command-window-write-timestamps'); t.eq(t.app.write_timestamps, !before);
  t.click('#command-window-log .options-close'); t.eq(t.visible('#command-window-log'), false);
  t.click('#command-window-log-button'); t.key(t.q('#command-window-log'), 'Escape'); t.eq(t.visible('#command-window-log'), false);
});

webTest(tests, 'web stats popup opens and outside click closes it', async function() {
  var t = GUI; t.click('#sandbox-stats-icon'); t.eq(t.app.status_popup_visible, true);
  document.body.click(); t.eq(t.app.status_popup_visible, false);
});

webTest(tests, 'web command submit uses the real evaluator and updates workspace/history', async function() {
  var t = GUI; t.app.code_input.setValue('var gui_web_value = 17;'); t.click('#command-window-input-submit-cont');
  await t.wait(() => t.app.workspace_state.some(row => row[0] === 'gui_web_value'), 'real evaluator workspace');
  t.eq(t.app.code_input.getValue(), ''); t.ok(t.app.history.includes('var gui_web_value = 17;'));
});

webTest(tests, 'web workspace filter, row selection, inspect and dismissal work', async function() {
  var t = GUI; t.input('#workspace-search', 'gui_web_value');
  t.eq(document.querySelectorAll('#workspace-variable-table .row').length, 1);
  var row = t.q('#workspace-variable-table .row'); row.click(); t.eq(t.app.code_input.getValue(), 'gui_web_value');
  row.dispatchEvent(new MouseEvent('contextmenu', { clientX: 100, clientY: 100, bubbles: true, cancelable: true }));
  t.eq(t.visible('#workspace-context-menu'), true);
  t.click('#workspace-context-inspect'); await t.wait(() => document.querySelector('.jslab-inspector'));
  t.eq(t.visible('#workspace-context-menu'), false);
  t.key(t.q('#workspace-search'), 'Escape'); t.eq(t.q('#workspace-search').value, '');
  t.input('#workspace-search', 'not-a-variable'); t.eq(document.querySelectorAll('#workspace-variable-table .row').length, 0);
  t.key(t.q('#workspace-search'), 'Escape');
});

webTest(tests, 'web inspector input fields submit and all cancellation controls resolve', async function() {
  var t = GUI;
  for(var method of ['submit', 'enter', 'close', 'cancel', 'escape']) {
    var promise = t.app.openInspectorInputDialog({ fields: [{ value: 'old' }, { value: 'old2' }] });
    t.input('#inspector-input-field-1', 'first'); t.input('#inspector-input-field-2', 'second');
    if(method === 'enter' || method === 'escape') t.key(t.q('#inspector-input-field-1'), method === 'enter' ? 'Enter' : 'Escape');
    else t.click('#inspector-input-' + method);
    var result = await promise;
    if(['submit', 'enter'].includes(method)) t.eq(JSON.stringify(result.values), '["first","second"]');
    else t.eq(result, null);
  }
});

webTest(tests, 'web browser imports actual File objects and folder entries into OPFS', async function() {
  var t = GUI;
  t.click('#file-browser-import-button'); t.eq(t.visible('#file-browser-import-menu'), true);
  document.body.click(); t.eq(t.visible('#file-browser-import-menu'), false);
  var transfer = new DataTransfer(); transfer.items.add(new File(['// imported'], 'gui-import.jsl', { type: 'text/javascript' }));
  t.q('#file-picker').files = transfer.files; t.q('#file-picker').dispatchEvent(new Event('change', { bubbles: true }));
  await t.wait(() => t.app.fs.existsFileSync('/workspace/gui-import.jsl'));
  t.eq(t.app.fs.readTextFileSync('/workspace/gui-import.jsl'), '// imported');
  var folder = new DataTransfer(), file = new File(['folder text'], 'nested.txt');
  Object.defineProperty(file, 'webkitRelativePath', { value: 'gui-folder/nested.txt' }); folder.items.add(file);
  t.q('#folder-picker').files = folder.files; t.q('#folder-picker').dispatchEvent(new Event('change', { bubbles: true }));
  await t.wait(() => t.app.fs.existsFileSync('/workspace/gui-folder/nested.txt'));
  t.eq(t.app.fs.readTextFileSync('/workspace/gui-folder/nested.txt'), 'folder text');
});

webTest(tests, 'web imported file tree expands, opens files and removes selected entries', async function() {
  var t = GUI; await t.app._refreshWorkspaceList();
  var item = document.querySelector('[data-path="/workspace/gui-folder"]') || [...document.querySelectorAll('#file-browser-cont li')].find(el => el.textContent.includes('gui-folder'));
  t.ok(item, 'imported folder tree node');
  var expand = item.querySelector('.expend'); t.ok(expand); expand.click(); t.ok(item.querySelector('ul')); expand.click(); t.eq(item.querySelector('ul'), null);
  var file = [...document.querySelectorAll('#file-browser-cont li')].find(el => el.textContent.trim() === 'gui-import.jsl'); t.ok(file);
  file.querySelector('span').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  var editor = await t.editor(); t.ok(editor.__JSLAB_WEB_EDITOR__);
  file.querySelector('span').dispatchEvent(new MouseEvent('contextmenu', { clientX: 20, clientY: 20, bubbles: true, cancelable: true }));
  t.eq(t.visible('#file-browser-context-menu'), true);
  t.click('#file-browser-context-remove'); await t.wait(() => !t.app.fs.existsFileSync('/workspace/gui-import.jsl'));
});

webTest(tests, 'web console clear and to-bottom act on output and focus', async function() {
  var t = GUI; t.app.handleSandboxRuntimeLog('transient web message', 'info'); t.click('#clear-console-button');
  t.eq(t.q('#command-window-messages').textContent.includes('transient web message'), false);
  t.click('#to-bottom-button'); t.ok(t.app.code_input.hasFocus());
  t.q('#command-window').click(); t.ok(t.app.code_input.hasFocus());
  t.q('#command-window-input-container').click(); t.ok(t.app.code_input.hasFocus());
});

webTest(tests, 'web clear workspace control clears runtime variables', async function() {
  var t = GUI; t.click('#clear-workspace-search');
  await t.wait(() => !t.app.workspace_state.some(row => row[0] === 'gui_web_value'));
});
exports.MODULE_TESTS = tests;
