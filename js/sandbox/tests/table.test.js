/**
 * @file JSLAB table submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function makeSampleTable() {
  return jsl.table.table(
    [1, 2, 3],
    ['c', 'a', 'b'],
    { VariableNames: ['id', 'label'] }
  );
}

tests.add('table constructor creates correct shape and names', function(assert) {
  var T = makeSampleTable();
  assert.equal(T.height(), 3);
  assert.equal(T.width(), 2);
  assert.deepEqual(T.VariableNames, ['id', 'label']);
  assert.deepEqual(T.getVariable('id'), [1, 2, 3]);
}, { tags: ['unit', 'table'] });

tests.add('setVariable and hasVariable update table columns', function(assert) {
  var T = makeSampleTable();
  T.setVariable('score', [10, 20, 30]);
  assert.equal(T.hasVariable('score'), true);
  assert.deepEqual(T.getVariable('score'), [10, 20, 30]);
}, { tags: ['unit', 'table'] });

tests.add('selectvars and removevars return projected tables', function(assert) {
  var T = makeSampleTable();
  var selected = T.selectvars(['label']);
  assert.deepEqual(selected.VariableNames, ['label']);
  assert.equal(selected.width(), 1);

  var removed = T.removevars(['label']);
  assert.deepEqual(removed.VariableNames, ['id']);
  assert.equal(removed.width(), 1);
}, { tags: ['unit', 'table'] });

tests.add('renamevars renames columns', function(assert) {
  var T = makeSampleTable();
  var R = T.renamevars(['label'], ['name']);
  assert.equal(R.hasVariable('name'), true);
  assert.equal(R.hasVariable('label'), false);
}, { tags: ['unit', 'table'] });

tests.add('sortrows sorts by selected variable', function(assert) {
  var T = makeSampleTable();
  var S = T.sortrows('label', 'asc');
  assert.deepEqual(S.getVariable('label'), ['a', 'b', 'c']);
  assert.deepEqual(S.getVariable('id'), [2, 3, 1]);
}, { tags: ['unit', 'table'] });

tests.add('filter and rows return subsets', function(assert) {
  var T = makeSampleTable();
  var F = T.filter(function(row) {
    return row.id >= 2;
  });
  assert.equal(F.height(), 2);
  assert.deepEqual(F.getVariable('id'), [2, 3]);

  var R = T.rows([0, 2]);
  assert.equal(R.height(), 2);
  assert.deepEqual(R.getVariable('id'), [1, 3]);
}, { tags: ['unit', 'table'] });

tests.add('table2array and array2table are consistent', function(assert) {
  var T = makeSampleTable();
  var A = jsl.table.table2array(T);
  var T2 = jsl.table.array2table(A, { VariableNames: ['id', 'label'] });
  assert.deepEqual(T2.toArray(), T.toArray());
}, { tags: ['unit', 'table'] });

tests.add('groupsummary aggregates grouped values', function(assert) {
  var T = jsl.table.table(
    ['A', 'A', 'B', 'B'],
    [1, 2, 10, 20],
    { VariableNames: ['grp', 'val'] }
  );
  var G = T.groupsummary(['grp'], 'sum', ['val']);
  assert.equal(G.height(), 2);
  assert.ok(G.getVariable('val_sum').includes(3));
  assert.ok(G.getVariable('val_sum').includes(30));
}, { tags: ['unit', 'table'] });

tests.add('fillmissing handles scalar arrays and table columns', function(assert) {
  var scalar = jsl.table.fillmissing([1, null, 3], 'constant', 0);
  assert.deepEqual(scalar, [1, 0, 3]);

  var T = jsl.table.table([1, null, 3], { VariableNames: ['v'] });
  var F = T.fillmissing('constant', 0);
  assert.deepEqual(F.getVariable('v'), [1, 0, 3]);
}, { tags: ['unit', 'table'] });

tests.add('join merges two tables on common key', function(assert) {
  var L = jsl.table.table([1, 2], ['a', 'b'], { VariableNames: ['id', 'left'] });
  var R = jsl.table.table([2, 1], ['B', 'A'], { VariableNames: ['id', 'right'] });
  var J = jsl.table.innerjoin(L, R, { Keys: ['id'] });
  assert.equal(J.height(), 2);
  assert.equal(J.hasVariable('left'), true);
  assert.equal(J.hasVariable('right'), true);
}, { tags: ['unit', 'table'] });

exports.MODULE_TESTS = tests;
