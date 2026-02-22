/**
 * @file JSLAB inspector submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_INSPECTOR } = require('../inspector');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');

var tests = new PRDC_JSLAB_TESTS();

function createInspectorHarness() {
  var errors = [];
  var warns = [];
  var monospace = [];
  var workspace_sets = 0;

  var jsl = {
    context: {},
    no_ans: false,
    ignore_output: false,
    _eval: function(expression) {
      return Function('"use strict"; return (' + expression + ');')();
    },
    formatLang: function(_id, data) {
      return JSON.stringify(data || {});
    },
    inter: {
      lang: {
        string: function(id) {
          return 'LANG_' + id;
        }
      },
      format: {
        isTypedArray: function(value) {
          return ArrayBuffer.isView(value) && !(value instanceof DataView);
        }
      },
      env: {
        error: function(message) {
          errors.push(message);
        },
        warn: function(message) {
          warns.push(message);
        },
        dispMonospaced: function(message) {
          monospace.push(message);
        },
        setWorkspace: function() {
          workspace_sets += 1;
        },
        showInspector: function() {}
      },
      table: {
        table2csv: function() {
          return 'a,b\n1,2';
        }
      }
    }
  };

  var inspector = new PRDC_JSLAB_LIB_INSPECTOR(jsl);

  return {
    inspector,
    jsl,
    errors,
    warns,
    monospace,
    workspace_sets_ref: function() {
      return workspace_sets;
    }
  };
}

tests.add('inspectSetVariable updates root and nested values', function(assert) {
  var harness = createInspectorHarness();
  harness.jsl.context.value = 1;
  harness.jsl.context.obj = { child: { x: 2 }, map: new Map([['k', 3]]) };

  assert.equal(harness.inspector.inspectSetVariable('value', [], '2 + 3'), true);
  assert.equal(harness.jsl.context.value, 5);

  assert.equal(harness.inspector.inspectSetVariable('obj', ['child', 'x'], '11'), true);
  assert.equal(harness.jsl.context.obj.child.x, 11);

  assert.equal(harness.inspector.inspectSetVariable('obj', ['map', 'k'], '99'), true);
  assert.equal(harness.jsl.context.obj.map.get('k'), 99);
  assert.ok(harness.workspace_sets_ref() >= 3);
}, { tags: ['unit', 'inspector'] });

tests.add('inspectSetVariable supports custom setCell branch', function(assert) {
  var harness = createInspectorHarness();
  var calls = [];
  harness.jsl.context.tbl = {
    setCell: function(row, col, value) {
      calls.push([row, col, value]);
    }
  };

  var ok = harness.inspector.inspectSetVariable('tbl', [2, 'name'], '"abc"');
  assert.equal(ok, true);
  assert.deepEqual(calls, [[2, 'name', 'abc']]);
}, { tags: ['unit', 'inspector'] });

tests.add('inspectTableAction handles add/rename/remove/copy actions', function(assert) {
  var harness = createInspectorHarness();
  var added = null;
  var renamed_table = { marker: 'renamed' };
  var removed_table = { marker: 'removed' };

  harness.jsl.context.T = {
    VariableNames: ['a'],
    getVariable: function() {
      return [1, 2, 3];
    },
    height: function() {
      return 3;
    },
    setVariable: function(name, values) {
      added = [name, values];
    },
    renamevars: function() {
      return renamed_table;
    },
    removevars: function() {
      return removed_table;
    }
  };

  assert.equal(harness.inspector.inspectTableAction('T', 'addvar', {
    name: 'new_col',
    expression: '5'
  }), true);
  assert.deepEqual(added, ['new_col', [5, 5, 5]]);

  assert.equal(harness.inspector.inspectTableAction('T', 'renamevar', {
    old_name: 'a',
    new_name: 'b'
  }), true);
  assert.equal(harness.jsl.context.T, renamed_table);

  harness.jsl.context.T = {
    VariableNames: ['a'],
    getVariable: function() { return [1]; },
    setVariable: function() {},
    removevars: function() { return removed_table; }
  };
  assert.equal(harness.inspector.inspectTableAction('T', 'removevar', {
    names: 'a'
  }), true);
  assert.equal(harness.jsl.context.T, removed_table);

  harness.jsl.context.T = {
    VariableNames: ['a'],
    getVariable: function() { return [1]; },
    setVariable: function() {}
  };
  assert.equal(harness.inspector.inspectTableAction('T', 'copycsv'), true);
  assert.deepEqual(harness.monospace, ['a,b\n1,2']);
}, { tags: ['unit', 'inspector'] });

tests.add('inspectTableAction returns false on unsupported action', function(assert) {
  var harness = createInspectorHarness();
  harness.jsl.context.T = {
    VariableNames: ['a'],
    getVariable: function() { return [1]; },
    setVariable: function() {}
  };

  assert.equal(harness.inspector.inspectTableAction('T', 'unknown-action'), false);
  assert.ok(harness.errors.length > 0);
}, { tags: ['unit', 'inspector'] });

exports.MODULE_TESTS = tests;
