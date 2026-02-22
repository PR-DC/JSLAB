/**
 * @file JSLAB system submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_SYSTEM } = require('../system');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createSystemMock() {
  var calls = [];
  var mock = {
    inter: {
      env: {
        sendPty: function(action, data) {
          calls.push({ action: action, data: data });
          if(action === 'create') {
            return 7;
          }
          return true;
        },
        execSync: function() {
          return Buffer.from('ok');
        },
        exec: function() {
          return { pid: 11 };
        },
        spawn: function() {
          return { pid: 22 };
        },
        error: function() {}
      },
      format: {
        isFunction: function(value) {
          return typeof value === 'function';
        }
      }
    }
  };
  return {
    calls: calls,
    mock: mock,
    system: new PRDC_JSLAB_LIB_SYSTEM(mock)
  };
}

tests.add('system/exec/spawn delegate to environment API', function(assert) {
  var setup = createSystemMock();
  assert.equal(setup.system.system('echo ok'), 'ok');
  assert.equal(setup.system.exec('dummy').pid, 11);
  assert.equal(setup.system.spawn('dummy').pid, 22);
}, { tags: ['unit', 'system'] });

tests.add('spawnTerminal registers terminal and sends create action', function(assert) {
  var setup = createSystemMock();
  var terminal = setup.system.spawnTerminal(['cmd.exe', ['/c', 'echo hi']], function() {}, function() {});
  assert.equal(terminal.id, 7);
  assert.ok(setup.system.open_terminals.hasOwnProperty(7));
  assert.equal(setup.calls[0].action, 'create');
}, { tags: ['unit', 'system'] });

tests.add('terminal.write sends base64 payload through pty bridge', function(assert) {
  var setup = createSystemMock();
  var terminal = setup.system.spawnTerminal(['cmd.exe'], function() {}, function() {});
  terminal.write('abc');
  var write_call = setup.calls.find(function(call) {
    return call.action === 'write';
  });
  assert.ok(!!write_call);
  assert.equal(write_call.data.id, 7);
  assert.equal(Buffer.from(write_call.data.buffer, 'base64').toString('utf8'), 'abc');
}, { tags: ['unit', 'system'] });

tests.add('pty data events are forwarded and decoded', function(assert) {
  var setup = createSystemMock();
  var received = '';
  setup.system.spawnTerminal(['cmd.exe'], function(chunk) {
    received += chunk;
  }, function() {});

  setup.system._onPtyData({
    type: 'data',
    id: 7,
    buffer: Buffer.from('hello', 'utf8').toString('base64')
  });

  assert.equal(received, 'hello');
}, { tags: ['unit', 'system'] });

tests.add('pty exit event removes terminal and calls onExit', function(assert) {
  var setup = createSystemMock();
  var exited = 0;
  setup.system.spawnTerminal(['cmd.exe'], function() {}, function() {
    exited += 1;
  });

  setup.system._onPtyData({
    type: 'exit',
    id: 7
  });

  assert.equal(exited, 1);
  assert.equal(setup.system.open_terminals.hasOwnProperty(7), false);
}, { tags: ['unit', 'system'] });

tests.add('clear kills all terminals through pty bridge', function(assert) {
  var setup = createSystemMock();
  setup.system.spawnTerminal(['cmd.exe'], function() {}, function() {});
  setup.system._clear();
  assert.deepEqual(setup.system.open_terminals, {});
  var kill_all_call = setup.calls.find(function(call) {
    return call.action === 'killAll';
  });
  assert.ok(!!kill_all_call);
}, { tags: ['unit', 'system'] });

exports.MODULE_TESTS = tests;
