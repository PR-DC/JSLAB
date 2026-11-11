/**
 * @file Terminal keyboard history, message actions and focus behavior
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest, sent } = require('../../dev/gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }

function key(f, cm, name, options = {}) {
  var event = new f.window.KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options });
  cm.getInputField().dispatchEvent(event);
  return event;
}
function setup(c) {
  c.command_history.clearHistory();
  c.command_history.updateHistory('older'); c.command_history.updateHistory('newer');
  c.command_window.code_input.setValue(''); c.command_window.code_input.focus();
  return c.command_window.code_input;
}

guiTest(tests, 'main', 'terminal history preserves drafts and Escape clears input', ['.CodeMirror textarea'], function(assert, f, c) {
  var cm = setup(c);
  cm.setValue('draft'); cm.setCursor(0, 2);
  key(f, cm, 'ArrowUp'); assert.equal(cm.getValue(), 'newer');
  key(f, cm, 'ArrowUp'); assert.equal(cm.getValue(), 'older');
  key(f, cm, 'ArrowDown'); assert.equal(cm.getValue(), 'newer');
  key(f, cm, 'ArrowDown'); assert.equal(cm.getValue(), 'draft');
  key(f, cm, 'PageUp'); assert.equal(cm.getValue(), 'older');
  key(f, cm, 'PageDown'); assert.equal(cm.getValue(), 'newer');
  key(f, cm, 'Escape'); assert.equal(cm.getValue(), '');
  assert.equal(c.command_window.i_history, -1);
});
guiTest(tests, 'main', 'terminal Ctrl+p and Ctrl+n navigate history and restore the draft', [], function(assert, f, c) {
  var cm = setup(c); cm.setValue('draft');
  key(f, cm, 'p', { ctrlKey: true }); assert.equal(cm.getValue(), 'newer');
  key(f, cm, 'p', { ctrlKey: true }); assert.equal(cm.getValue(), 'older');
  key(f, cm, 'n', { ctrlKey: true }); assert.equal(cm.getValue(), 'newer');
  key(f, cm, 'n', { ctrlKey: true }); assert.equal(cm.getValue(), 'draft');
});
for(const close of ['button', 'escape', 'enter']) {
  guiTest(tests, 'main', 'F7 history dialog selection and ' + close, ['#command-window-history .history-close'], function(assert, f, c) {
    var cm = setup(c); key(f, cm, 'F7');
    assert.equal(f.visible('#command-window-history'), true);
    assert.equal(f.document.querySelectorAll('#command-window-history li').length, 2);
    f.click('#command-window-history li');
    if(close === 'button') f.click('#command-window-history .history-close');
    if(close === 'escape') f.key('#command-window-history', 'Escape');
    if(close === 'enter') {
      f.key('#command-window-history', 'Enter');
      assert.equal(sent(assert, f, 'SandboxWindow', 'eval-code')[0], 'newer');
    }
    assert.equal(f.visible('#command-window-history'), false);
  });
}
guiTest(tests, 'main', 'F7 history navigation updates selection and command input', [], function(assert, f, c) {
  var cm = setup(c); key(f, cm, 'F7');
  f.key('#command-window-history', 'PageDown'); assert.equal(cm.getValue(), 'older');
  f.key('#command-window-history', 'PageUp'); assert.equal(cm.getValue(), 'newer');
  f.key('#command-window-history', 'ArrowDown'); assert.equal(cm.getValue(), 'older');
  f.key('#command-window-history', 'ArrowUp'); assert.equal(cm.getValue(), 'newer');
});
guiTest(tests, 'main', 'F3 repeats the newest command and Alt+F7 clears recall history', [], function(assert, f, c) {
  var cm = setup(c); key(f, cm, 'F3');
  assert.equal(sent(assert, f, 'SandboxWindow', 'eval-code')[0], 'newer');
  key(f, cm, 'F7', { altKey: true }); assert.equal(c.command_history.history.length, 0);
});
for(const [name, container, options] of [['s', 'settings', {}], ['l', 'log', { shiftKey: true }]]) {
  guiTest(tests, 'main', 'terminal Ctrl+' + name + ' opens its dialog', [], function(assert, f, c) {
    var cm = setup(c); key(f, cm, name, { ctrlKey: true, ...options });
    assert.equal(f.visible('#command-window-' + container), true);
  });
}
for(const name of ['l', 'k']) {
  guiTest(tests, 'main', 'terminal Ctrl+' + name + ' clears output without clearing input', [], function(assert, f, c) {
    var cm = setup(c); cm.setValue('draft'); c.command_window.message('remove me');
    key(f, cm, name, { ctrlKey: true });
    assert.equal(f.query('#command-window-messages').textContent.includes('remove me'), false);
    assert.equal(cm.getValue(), 'draft');
  });
}
guiTest(tests, 'main', 'message snippets and script links dispatch their actions', [], function(assert, f, c) {
  var messages = f.query('#command-window-messages');
  var command = f.document.createElement('span'); command.className = 'eval-code'; command.textContent = 'snippet()';
  messages.appendChild(command); command.click();
  assert.equal(sent(assert, f, 'SandboxWindow', 'eval-code')[0], 'snippet()');
  var link = f.document.createElement('a'); link.href = 'https://example.com/gui-test';
  messages.appendChild(link); link.click();
  assert.deepEqual(f.calls.at(-1), ['external', link.href]);
});

exports.MODULE_TESTS = tests;
