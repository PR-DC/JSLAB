/**
 * @file System Terminal window controller interaction tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { guiTest } = require('../../dev/component-test-utils');
var tests = new PRDC_JSLAB_TESTS();
if(!globalThis.__JSLAB_GUI_COMPONENT__) {
  exports.MODULE_TESTS = tests;
  return;
}

guiTest(tests, 'terminal', 'System Terminal starts its shell lazily and routes named-window writes',
  [], async function(assert, fixture, controller) {
    try {
      assert.equal(controller.pty_id, null);
      assert.ok(fixture.query('.xterm'));
      fixture.setSyncResult('pty', 42);
      fixture.emit('TerminalWindow', 'set-name', 'Build terminal');
      assert.equal(fixture.document.title, 'Build terminal');
      fixture.emit('TerminalWindow', 'write', 'echo JSLAB\r');
      assert.equal(controller.pty_id, 42);
      var requests = fixture.calls.filter(call => call[0] == 'sync-message' && call[1] == 'pty');
      assert.equal(requests.filter(call => call[2].action == 'create').length, 1);
      var write = requests.find(call => call[2].action == 'write')[2].data;
      assert.equal(write.id, 42);
      assert.equal(Buffer.from(write.buffer, 'base64').toString(), 'echo JSLAB\r');
      fixture.emit('TerminalWindow', 'focus');
      await fixture.tick();
      assert.equal(fixture.calls.filter(call => call[1] == 'pty' && call[2].action == 'create').length, 1);
    } finally {
      clearTimeout(controller.resize_timer);
      controller.terminal.dispose();
    }
  });

exports.MODULE_TESTS = tests;
