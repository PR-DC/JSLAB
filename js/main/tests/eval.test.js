/**
 * @file JSLAB main eval tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_EVAL } = require('../eval');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createEvalHarness() {
  var sent = [];
  global.ipcRenderer = {
    send: function(channel, action, payload) {
      sent.push({ channel, action, payload });
    }
  };
  global.language = {
    string: function(id) {
      return 'LANG_' + id;
    }
  };

  var messages = [];
  var win = {
    evaluating: false,
    command_window: {
      addMessageCmd: function() {},
      scrollToBottom: function() {},
      resetHistoryIndex: function() {},
      code_input: { setValue: function() {} },
      message: function(message) {
        messages.push(message);
      }
    },
    command_history: {
      updateHistory: function() {}
    }
  };

  return {
    eval_obj: new PRDC_JSLAB_EVAL(win),
    sent: sent,
    messages: messages,
    win: win
  };
}

tests.add('evalScript builds run command and stores last script path', function(assert) {
  var harness = createEvalHarness();
  harness.eval_obj.evalScript('C:\\temp\\a.jsl', [1, 3]);

  assert.equal(harness.eval_obj.last_script_path, 'C:\\temp\\a.jsl');
  assert.equal(harness.sent.length, 1);
  assert.equal(harness.sent[0].channel, 'SandboxWindow');
  assert.equal(harness.sent[0].action, 'eval-code');
  assert.ok(String(harness.sent[0].payload[0]).includes('run("C:\\\\temp\\\\a.jsl", [1,3])'));
}, { tags: ['unit', 'main', 'eval'] });

tests.add('evalCommand updates UI and ignores empty command text', function(assert) {
  var harness = createEvalHarness();
  var cmd_log = [];
  harness.win.command_window.addMessageCmd = function(cmd) {
    cmd_log.push(cmd);
  };

  harness.eval_obj.evalCommand('');
  assert.equal(cmd_log.length, 0);
  assert.equal(harness.sent.length, 0);

  harness.eval_obj.evalCommand('1+1');
  assert.equal(cmd_log.length, 1);
  assert.equal(cmd_log[0], '1+1');
  assert.equal(harness.sent.length, 1);
}, { tags: ['unit', 'main', 'eval'] });

tests.add('evalScript reports busy state when evaluation is already running', function(assert) {
  var harness = createEvalHarness();
  harness.win.evaluating = true;
  harness.eval_obj.evalScript('x.jsl');
  assert.equal(harness.sent.length, 0);
  assert.ok(harness.messages[0].includes('LANG_347'));
}, { tags: ['unit', 'main', 'eval'] });

tests.add('scriptDirDialogButton returns false when last script path is missing', function(assert) {
  var harness = createEvalHarness();
  harness.eval_obj.last_script_path = undefined;
  var out = harness.eval_obj.scriptDirDialogButton(0);
  assert.equal(out, false);
  assert.equal(harness.sent.length, 0);
}, { tags: ['unit', 'main', 'eval'] });

exports.MODULE_TESTS = tests;
