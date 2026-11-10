/**
 * @file Workspace rows, file navigation, saved paths and command history
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

guiTest(tests, 'main', 'workspace search filters names, types and values and Escape restores rows', ['#workspace-search'], function(assert, f, c) {
  c.workspace.setWorkspace([['alpha', 'number', '42'], ['beta', 'string', 'sample']]);
  f.input('#workspace-search', '  ALPHA  ');
  assert.equal(f.document.querySelectorAll('#workspace .row').length, 1);
  assert.equal(f.query('#workspace .row').getAttribute('variable'), 'alpha');
  f.input('#workspace-search', 'sample');
  assert.equal(f.query('#workspace .row').getAttribute('variable'), 'beta');
  f.input('#workspace-search', 'missing'); assert.equal(f.document.querySelectorAll('#workspace .row').length, 0);
  f.key('#workspace-search', 'Escape');
  assert.equal(f.document.querySelectorAll('#workspace .row').length, 2);
  assert.equal(f.query('#workspace-search').value, '');
});

guiTest(tests, 'main', 'workspace single click fills input and double click evaluates the variable', [], function(assert, f, c) {
  c.workspace.setWorkspace([['alpha', 'number', '42']]);
  var row = f.query('#workspace .row'); row.click();
  assert.equal(c.command_window.code_input.getValue(), 'alpha');
  f.mouse(row, 'dblclick', 10, 10);
  assert.equal(sent(assert, f, 'SandboxWindow', 'eval-code')[0], 'alpha');
});
guiTest(tests, 'main', 'workspace clear requests workspace clearing', ['#workspace-options .clear'], function(assert, f) {
  f.click('#workspace-options .clear'); assert.equal(sent(assert, f, 'SandboxWindow', 'eval-code')[0], 'clear');
});
guiTest(tests, 'main', 'workspace inspect preserves command input and dismisses the context menu', ['#workspace-context-inspect'], function(assert, f, c) {
  c.workspace.setWorkspace([['alpha', 'number', '42']]);
  c.command_window.code_input.setValue('unfinished command');
  f.mouse(f.query('#workspace .row'), 'contextmenu', 10, 10);
  assert.equal(f.visible('#workspace-context-menu'), true);
  f.click('#workspace-context-inspect');
  assert.equal(sent(assert, f, 'SandboxWindow', 'eval-code')[0], 'inspectVariable("alpha")');
  assert.equal(c.command_window.code_input.getValue(), 'unfinished command');
  assert.equal(f.visible('#workspace-context-menu'), false);
});
for(const method of ['escape', 'outside', 'scroll']) {
  guiTest(tests, 'main', 'workspace context menu dismisses on ' + method, [], function(assert, f, c) {
    c.workspace.openContextMenu('alpha', 10, 10);
    if(method === 'escape') f.key(null, 'Escape');
    if(method === 'outside') f.document.body.click();
    if(method === 'scroll') f.query('#workspace').dispatchEvent(new f.window.Event('scroll'));
    assert.equal(f.visible('#workspace-context-menu'), false);
  });
}

guiTest(tests, 'main', 'history select, execute and clear affect input and persistence', ['#command-history-options .clear'], function(assert, f, c) {
  c.command_history.updateHistory('history_command');
  var item = f.query('#command-history > div:last-child'); item.click();
  assert.equal(c.command_window.code_input.getValue(), 'history_command');
  f.mouse(item, 'dblclick', 10, 10);
  assert.equal(sent(assert, f, 'SandboxWindow', 'eval-code')[0], 'history_command');
  f.click('#command-history-options .clear');
  assert.equal(f.query('#command-history').children.length, 0);
  assert.equal(c.command_history.history.length, 0);
  assert.equal(f.data.get('full_history').length, 0);
});

guiTest(tests, 'main', 'address Enter and blur navigate and select the full address on focus', ['#folder-navigation-container .address-line'], async function(assert, f, c) {
  var selector = '#folder-navigation-container .address-line', input = f.query(selector);
  f.input(selector, path.join(root, 'js')); f.key(selector, 'Enter');
  assert.equal(c.folder_navigation.current_path, path.join(root, 'js') + path.sep);
  assert.equal(sent(assert, f, 'SandboxWindow', 'set-current-path'), c.folder_navigation.current_path);
  f.input(selector, root); f.window.$(input).trigger('blur');
  assert.equal(c.folder_navigation.current_path, root + path.sep);
  c.command_window.code_input.focus(); input.focus();
  // Hidden Electron windows update activeElement without native OS focus events.
  input.dispatchEvent(new f.window.FocusEvent('focus'));
  assert.equal(input.selectionStart, 0, 'Address focus: ' + f.document.activeElement.outerHTML.slice(0, 100)); assert.equal(input.selectionEnd, input.value.length);
});
guiTest(tests, 'main', 'previous, next and parent folder controls navigate history',
  ['#folder-navigation-container .previous-folder', '#folder-navigation-container .next-folder', '#folder-navigation-container .up-folder'], function(assert, f, c) {
    var nav = c.folder_navigation;
    nav.setPath(path.join(root, 'js')); nav.setPath(path.join(root, 'js', 'main'));
    f.click('#folder-navigation-container .previous-folder'); assert.equal(nav.current_path, path.join(root, 'js') + path.sep);
    f.click('#folder-navigation-container .next-folder'); assert.equal(nav.current_path, path.join(root, 'js', 'main') + path.sep);
    f.click('#folder-navigation-container .up-folder'); assert.equal(nav.current_path, path.join(root, 'js') + path.sep);
  });
for(const canceled of [false, true]) {
  guiTest(tests, 'main', 'folder picker ' + (canceled ? 'cancel retains location' : 'selection navigates'), ['#folder-navigation-container .open-folder'], async function(assert, f, c) {
    var before = c.folder_navigation.current_path;
    f.setDialogResult({ canceled, filePaths: [path.join(root, 'js')] });
    f.click('#folder-navigation-container .open-folder'); await f.tick();
    assert.equal(c.folder_navigation.current_path, canceled ? before : path.join(root, 'js') + path.sep);
  });
}
guiTest(tests, 'main', 'save path toggles bookmark and saved list removal persists', ['#save-path'], function(assert, f, c) {
  f.click('#save-path'); assert.equal(c.folder_navigation.saved_paths.length, 1);
  assert.equal(f.query('#save-path').classList.contains('saved'), true);
  f.click('#save-path'); assert.equal(c.folder_navigation.saved_paths.length, 0);
  f.click('#save-path'); f.click('#paths-menu'); f.click('#paths-container .remove-path');
  assert.equal(c.folder_navigation.saved_paths.length, 0);
  c.close();
  assert.equal(f.data.get('saved_paths').length, 0);
  assert.equal(f.query('#paths-container .no-paths').isConnected, true);
});
guiTest(tests, 'main', 'saved path row and address breadcrumb navigate to their directory', [], function(assert, f, c) {
  var nav = c.folder_navigation;
  nav.setPath(path.join(root, 'js')); nav.savePath(nav.current_path);
  nav.setPath(root); f.click('#paths-menu'); f.click('#paths-container li');
  assert.equal(nav.current_path, path.join(root, 'js') + path.sep);
  assert.equal(f.visible('#paths-container'), false);
  var breadcrumb = f.document.querySelectorAll('.current-address .folder');
  var parent = breadcrumb[breadcrumb.length - 2]; parent.click();
  assert.equal(nav.current_path, root + path.sep);
});
guiTest(tests, 'main', 'file browser refresh requests the current directory', ['#file-browser-options .refresh'], function(assert, f, c) {
  f.calls.length = 0; f.click('#file-browser-options .refresh');
  assert.equal(sent(assert, f, 'SandboxWindow', 'set-current-path'), c.folder_navigation.current_path);
});
guiTest(tests, 'main', 'file and folder rows open, expand, collapse and navigate', [], function(assert, f, c) {
  var ul = f.document.createElement('ul'); f.query('#file-browser-cont').appendChild(ul);
  var browser = c.file_browser;
  browser.addFileBrowserItem(path.join(root, 'sample.jsl'), { isDirectory: () => false, isSymbolicLink: () => false }, ul);
  f.mouse(ul.firstChild, 'dblclick', 10, 10);
  assert.equal(sent(assert, f, 'EditorWindow', 'open-script')[0], path.join(root, 'sample.jsl'));
  browser.addFileBrowserItem(path.join(root, 'js'), { isDirectory: () => true }, ul);
  var folder = ul.lastChild, expand = folder.querySelector('.expend'); expand.click();
  assert.equal(expand.classList.contains('expended'), true);
  assert.ok(folder.querySelector('ul')); expand.click();
  assert.equal(folder.querySelector('ul'), null);
  f.mouse(folder, 'dblclick', 10, 10);
  assert.equal(c.folder_navigation.current_path, path.join(root, 'js') + path.sep);
});

exports.MODULE_TESTS = tests;
