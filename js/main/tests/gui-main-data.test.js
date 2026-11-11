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
guiTest(tests, 'main', 'command output renders remote object previews without JSON serialization', [], function(assert, f, c) {
  c.command_window.highlightAnsMessage([{
    __jslab_console_value__: true,
    type: 'object',
    object_id: 'fixture-object',
    description: 'Object',
    preview: { properties: ['self: Object'], overflow: false }
  }, true]);
  var value = f.query('#command-window-messages .jslab-console-value');
  assert.ok(!!value);
  assert.equal(value.dataset.objectId, 'fixture-object');
  assert.ok(value.textContent.includes('self: Object'));
  var toggle = value.querySelector('.jslab-console-toggle');
  assert.equal(toggle.textContent, '');
  assert.equal(f.window.getComputedStyle(toggle).width, '12px');
});
guiTest(tests, 'main', 'console live expressions and editor-style find controls update their views',
  ['.jslab-live-expression-add', '.jslab-console-tools', '.console-filter'], async function(assert, f, c) {
    assert.equal(c.command_window.console_tools.hidden, true);
    f.click('#command-window-options .console-filter');
    assert.equal(c.command_window.console_tools.hidden, false);
    assert.equal(c.command_window.console_filter_input.placeholder, f.window.language.currentString(336));
    assert.equal(c.command_window.console_filter_input.placeholder.includes('<lang'), false);
    assert.equal(f.document.querySelectorAll('.jslab-console-tools select, .jslab-console-tools button').length, 0);
    c.command_window.code_input.setValue('alpha');
    f.click('.jslab-live-expression-add');
    assert.equal(f.document.querySelectorAll('.jslab-live-expression').length, 1);
    f.input('.jslab-live-expression input', 'beta');
    assert.equal(c.command_window.live_expressions[0], 'beta');
    c.command_window.message('visible value');
    c.command_window.message('visible value again');
    f.input('.jslab-console-tools input', 'missing value');
    assert.equal(f.query('#command-window-messages .data-in').style.display, 'none');
    f.input('.jslab-console-tools input', 'visible');
    assert.equal(f.query('#command-window-messages .data-in').style.display, '');
    assert.equal(c.command_window.console_filter_total.textContent, '2');
    f.click('.CodeMirror-search-find-next-btn');
    assert.equal(c.command_window.console_filter_current.textContent, '2');
    f.click('.CodeMirror-search-find-prev-btn');
    assert.equal(c.command_window.console_filter_current.textContent, '1');
    f.input('.jslab-console-tools input', 'VISIBLE');
    f.click('.jslab-console-tools .CodeMirror-search-case-btn');
    assert.equal(c.command_window.console_filter_total.textContent, '0');
    f.click('.jslab-console-tools .CodeMirror-search-case-btn');
    f.input('.jslab-console-tools input', 'visible.*value');
    f.click('.jslab-console-tools .CodeMirror-search-regex-btn');
    assert.equal(c.command_window.console_filter_total.textContent, '2');
    f.click('.jslab-console-tools .CodeMirror-search-regex-btn');
    f.input('.jslab-console-tools input', 'visible');
    f.click('.jslab-console-tools .CodeMirror-search-close-btn');
    assert.equal(c.command_window.console_tools.hidden, true);
    f.key(null, 'f', { ctrlKey: true });
    assert.equal(c.command_window.console_tools.hidden, false);
    f.key('.jslab-console-tools input', 'Escape');
    assert.equal(c.command_window.console_tools.hidden, true);
    f.click('#command-window-options .console-filter');
    f.document.body.dispatchEvent(new f.window.MouseEvent('mousedown', { bubbles: true }));
    assert.equal(c.command_window.console_tools.hidden, true);
    f.click('.jslab-live-expression button');
    assert.equal(f.document.querySelectorAll('.jslab-live-expression').length, 0);
    await f.tick();
  });
guiTest(tests, 'main', 'console preview clears immediately and ignores a late result', [], async function(assert, f, c) {
  var original = f.window.ipcRenderer.invoke;
  var release;
  f.window.ipcRenderer.invoke = function(channel) {
    if(channel === 'get-console-preview') {
      return new Promise(function(resolve) { release = resolve; });
    }
    return original.apply(this, arguments);
  };
  try {
    c.command_window.code_input.setValue('1 + 2');
    await new Promise(function(resolve) { setTimeout(resolve, 180); });
    assert.equal(typeof release, 'function');
    c.command_window.code_input.setValue('');
    assert.equal(c.command_window.console_preview.childElementCount, 0);
    release({ success: true, value: { type: 'number', description: '3' } });
    await f.tick();
    assert.equal(c.command_window.console_preview.childElementCount, 0);
  } finally {
    f.window.ipcRenderer.invoke = original;
  }
});
guiTest(tests, 'main', 'welcome quick links match the README destinations and order', [], function(assert, f) {
  var links = Array.from(f.document.querySelectorAll('.welcome-message p:last-child a'));
  var expected = [
    'https://pr-dc.com/jslab/',
    'https://pr-dc.com/jslab/web/',
    'https://discourse.jsl.pr-dc.com/',
    'https://pr-dc.com/jslab/doc/',
    'https://pr-dc.com/jslab/doc/#command-line-interface',
    'https://pr-dc.com/jslab/doc/#mcp-server',
    'https://github.com/PR-DC/JSLAB/releases',
    'https://github.com/PR-DC/JSLAB/tree/master/examples'
  ];
  assert.deepEqual(links.map(function(link) { return link.href; }), expected);
});
guiTest(tests, 'main', 'remote console values lazily expand page and evaluate accessors', [], async function(assert, f, c) {
  var property_page = 0;
  f.window.ipcRenderer.invoke = async function(channel, request) {
    f.calls.push([channel, request]);
    if(channel === 'get-console-properties' && property_page++ === 0) {
      return {
        success: true,
        properties: [{ name: 'lazy', accessor: true, getter: true, property: 'lazy' }],
        next_offset: 1,
        total: 2
      };
    }
    if(channel === 'get-console-properties') {
      return {
        success: true,
        properties: [{ name: 'tail', value: { type: 'number', description: '2' } }],
        total: 2
      };
    }
    if(channel === 'get-console-accessor') {
      return { success: true, value: { type: 'number', description: '7' } };
    }
    if(channel === 'get-console-preview') return { success: false, reason: '' };
    if(channel === 'is-console-expression-complete') return true;
    return { canceled: true, filePaths: [] };
  };
  c.command_window.highlightAnsMessage([{
    __jslab_console_value__: true,
    type: 'object',
    object_id: 'lazy-object',
    description: 'Object',
    preview: { properties: [], overflow: false }
  }, true]);
  f.click('#command-window-messages .jslab-console-toggle');
  await f.tick();
  assert.equal(f.document.querySelectorAll('.jslab-console-property').length, 1);
  f.click('#command-window-messages .jslab-console-more');
  await f.tick();
  assert.equal(f.document.querySelectorAll('.jslab-console-property').length, 2);
  f.click('#command-window-messages .jslab-console-accessor');
  await f.tick();
  assert.ok(f.query('#command-window-messages').textContent.includes('7'));
});
guiTest(tests, 'main', 'Alt-click recursively expands remote console values without cycling', [], async function(assert, f, c) {
  f.window.ipcRenderer.invoke = async function(channel, request) {
    f.calls.push([channel, request]);
    if(channel === 'get-console-properties' && request.object_id === 'recursive-root') {
      return { success: true, properties: [{ name: 'child', value: {
        type: 'object', object_id: 'recursive-child', description: 'Object',
        preview: { properties: [], overflow: false }
      } }], total: 1 };
    }
    if(channel === 'get-console-properties' && request.object_id === 'recursive-child') {
      return { success: true, properties: [
        { name: 'parent', value: { type: 'object', object_id: 'recursive-root', description: 'Object' } },
        { name: 'leaf', value: { type: 'number', description: '42' } }
      ], total: 2 };
    }
    return { success: false };
  };
  c.command_window.highlightAnsMessage([{
    __jslab_console_value__: true, type: 'object', object_id: 'recursive-root',
    description: 'Object', preview: { properties: [], overflow: false }
  }, true]);
  f.mouse(f.query('#command-window-messages .jslab-console-toggle'), 'click', 1, 1, { altKey: true });
  await f.tick(); await f.tick();
  assert.equal(f.document.querySelectorAll('#command-window-messages .jslab-console-value.open').length, 2);
  assert.ok(f.query('#command-window-messages').textContent.includes('42'));
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
