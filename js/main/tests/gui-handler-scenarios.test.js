/**
 * @file Desktop GUI event paths missing from the initial interaction suite
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

guiTest(tests, 'figure', 'figure hover timers, leave cleanup and resize callbacks work', [], async function(assert, f) {
  var figure = await require('../../windows/tests/gui-auxiliary-windows.test').figure(f), resized = 0;
  figure.plot = { _onResize() { resized++; } };
  f.window.dispatchEvent(new f.window.Event('resize')); assert.equal(resized, 1);
  // Resize is ignored once the figure has been removed from the figure registry.
  delete f.figure_runtime.inter.figures.open_figures[1];
  f.window.dispatchEvent(new f.window.Event('resize')); assert.equal(resized, 1);
  var menu = f.query('#figure-menu-container');
  menu.dispatchEvent(new f.window.MouseEvent('mouseenter'));
  assert.equal(menu.classList.contains('hovered'), true);
  menu.dispatchEvent(new f.window.MouseEvent('mouseleave'));
  await f.waitFor(() => !menu.classList.contains('hovered'), 'figure hover timeout');
});

for(const type of ['main', 'editor']) {
  guiTest(tests, type, type + ' runtime error handlers report errors without crashing the window', [], function(assert, f, c) {
    var rejection = new f.window.Event('unhandledrejection', { cancelable: true });
    Object.defineProperty(rejection, 'reason', { value: new Error('GUI rejection sentinel') });
    f.window.dispatchEvent(rejection);
    f.window.dispatchEvent(new f.window.ErrorEvent('error', { error: new Error('GUI error sentinel'), cancelable: true }));
    if(type === 'editor') {
      assert.ok(f.calls.filter(call => call[1] === 'internal-error').length >= 2);
    } else assert.ok(f.query('#command-window-messages').textContent.includes('GUI error sentinel'));
    f.errors.length = 0;
  });
}

guiTest(tests, 'main', 'main IPC status/workspace updates and generated editor links are handled', [], function(assert, f, c) {
  f.emit('MainWindow', 'set-workspace', [['ipc_variable', 'number', '3']]);
  assert.ok(f.query('#workspace').textContent.includes('ipc_variable'));
  var link = f.document.createElement('span'); link.className = 'open-editor';
  link.setAttribute('file_path', 'fixture.jsl'); link.setAttribute('line_number', '2');
  f.query('#command-window-messages').appendChild(link); link.click();
  assert.equal(sent(assert, f, 'EditorWindow', 'open-script')[0], 'fixture.jsl');
});

guiTest(tests, 'main', 'optional developer-tools menu binds its expected action', [], function(assert, f, c) {
  var menu = f.document.createElement('button'); menu.id = 'devtools-menu'; f.document.body.appendChild(menu);
  var { PRDC_JSLAB_GUI } = f.load(path.join(root, 'js/main/gui.js'));
  new PRDC_JSLAB_GUI(c); menu.click(); sent(assert, f, 'MainProcess', 'show-dev-tools');
});

for(const type of ['main', 'editor']) {
  guiTest(tests, type, type + ' CodeMirror input/drop/scroll events retain usable input', [], function(assert, f, c) {
    var cm = type === 'main' ? c.command_window.code_input : c.script_manager.scripts[0].code_editor;
    cm.setValue('value'); cm.setCursor(0, 5);
    f.window.CodeMirror.signal(cm, 'inputRead', cm, { origin: '+input', text: [';'] });
    if(type === 'editor') {
      var drop = new f.window.Event('drop', { cancelable: true });
      f.window.CodeMirror.signal(cm, 'drop', cm, drop); assert.equal(drop.defaultPrevented, true);
      f.mouse(cm.getWrapperElement(), 'contextmenu', 10, 10); assert.equal(f.visible('#editor-context-menu'), true);
      f.window.CodeMirror.signal(cm, 'scroll', cm); assert.equal(f.visible('#editor-context-menu'), false);
      cm.getWrapperElement().dispatchEvent(new f.window.Event('scroll', { bubbles: true }));
      var document_drop = new f.window.Event('drop', { cancelable: true });
      Object.defineProperty(document_drop, 'dataTransfer', { value: { files: [{ path: 'missing-drop.jsl' }] } });
      f.document.dispatchEvent(document_drop); assert.equal(document_drop.defaultPrevented, true);
    }
    assert.equal(cm.getValue(), 'value');
  });
}

guiTest(tests, 'editor', 'document find supports live keyup and Enter replacement/history navigation', [], function(assert, f, c) {
  var cm = c.script_manager.scripts[0].code_editor; cm.setValue('needle needle');
  f.click('#search-dialog-menu'); f.input('.CodeMirror-search-find', 'needle');
  f.query('.CodeMirror-search-find').dispatchEvent(new f.window.KeyboardEvent('keyup', { key: 'e', bubbles: true }));
  assert.equal(cm.getSelection(), 'needle');
  f.key('.CodeMirror-search-find', 'Enter');
  f.key('.CodeMirror-search-find', 'ArrowUp', { altKey: true }); assert.equal(f.query('.CodeMirror-search-find').value, 'needle');
  f.input('.CodeMirror-search-replace', 'replacement'); f.key('.CodeMirror-search-replace', 'Enter');
  assert.ok(cm.getValue().includes('replacement'));
});

guiTest(tests, 'main', 'documentation hover buttons and hover lifecycle show documentation', [], async function(assert, f, c) {
  var hover = c.command_window.code_doc_hover;
  hover._showTooltip('test', [{ name: 'test', doc_query: 'test', description: 'Tooltip' }], 10, 10);
  var tooltip = f.query('.jslab-doc-hover-tooltip');
  tooltip.dispatchEvent(new f.window.MouseEvent('mouseenter'));
  tooltip.querySelector('button').click();
  tooltip.dispatchEvent(new f.window.MouseEvent('mouseleave'));
  await f.waitFor(() => !tooltip.isConnected, 'tooltip hides after mouse leave');
  assert.equal(tooltip.isConnected, false);
});

guiTest(tests, 'main', 'inspector editable cell double-click opens a value prompt', [], function(assert, f, c) {
  var cell = f.document.createElement('td'); cell.className = 'jslab-inspector-cell-editable';
  cell.setAttribute('data-variable', 'fixture'); cell.setAttribute('data-path', '[0]'); cell.setAttribute('data-default', '1');
  f.query('#command-window-messages').appendChild(cell);
  f.mouse(cell, 'dblclick', 10, 10); assert.equal(f.visible('#inspector-input-container'), true);
  f.click('#inspector-input-cancel');
});

guiTest(tests, 'blank', 'serial chooser port, baudrate and selection controls resolve the selected values', [], async function(assert, f) {
  f.window.setTitle = function() {}; f.window.setSize = function() {}; f.window.close = function() {};
  f.window.wid = 1;
  var host = { addUI() {}, _updateLanguage() {} };
  var jsl = { inter: { lang: f.window.language, windows: { openWindowBlank: async() => f.window, open_windows: { 1: host } }, non_blocking: { waitMSeconds: async() => {} } } };
  var { PRDC_JSLAB_LIB_SERIAL_DEVICE } = f.load(path.join(root, 'js/sandbox/serial-device.js'));
  var device = new PRDC_JSLAB_LIB_SERIAL_DEVICE(jsl);
  device.listSerialPorts = async() => [{ path: 'TEST_PORT', friendlyName: 'Test port' }];
  var promise = device.chooseSerialPort(); await f.tick(); f.click('li'); assert.equal(await promise, 'TEST_PORT');
  promise = device.chooseSerialOptions(); await f.tick(); f.input('#port', 'TEST_PORT', 'change'); f.input('#baudrate', '115200'); f.click('#choose');
  assert.deepEqual(Array.from(await promise), ['TEST_PORT', 115200]);
});

exports.MODULE_TESTS = tests;
