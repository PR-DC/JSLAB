/**
 * @file JSLAB main workspace tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WORKSPACE } = require('../workspace');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('openContextMenu and hideContextMenu update menu state and selected variable', function(assert) {
  var ws = Object.create(PRDC_JSLAB_WORKSPACE.prototype);
  ws.context_menu = {
    style: { display: 'none', left: '0px', top: '0px' },
    getBoundingClientRect: function() {
      return { width: 120, height: 80 };
    }
  };
  global.window = { innerWidth: 1000, innerHeight: 700 };

  ws.openContextMenu('my_var', 10, 20);
  assert.equal(ws.context_variable, 'my_var');
  assert.equal(ws.context_menu.style.display, 'block');
  assert.equal(ws.context_menu.style.left, '10px');
  assert.equal(ws.context_menu.style.top, '20px');

  ws.hideContextMenu();
  assert.equal(ws.context_variable, undefined);
  assert.equal(ws.context_menu.style.display, 'none');
}, { tags: ['unit', 'main', 'workspace'] });

tests.add('inspectSelectedVariable emits eval command and closes context menu', function(assert) {
  var eval_commands = [];
  var ws = Object.create(PRDC_JSLAB_WORKSPACE.prototype);
  ws.context_menu = { style: { display: 'block' } };
  ws.context_variable = 'abc';
  ws.win = {
    eval: {
      evalCommand: function(cmd) {
        eval_commands.push(cmd);
      }
    }
  };

  ws.inspectSelectedVariable();
  assert.equal(eval_commands.length, 1);
  assert.equal(eval_commands[0], 'inspectVariable("abc")');
  assert.equal(ws.context_menu.style.display, 'none');
}, { tags: ['unit', 'main', 'workspace'] });

exports.MODULE_TESTS = tests;
