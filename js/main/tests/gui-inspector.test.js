/**
 * @file Inspector input dialog submission, keyboard handling and cancellation
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest, sent } = require('../../dev/gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }

for(const count of [1, 2]) {
  for(const method of ['button', 'enter']) {
    guiTest(tests, 'main', 'inspector submits ' + count + ' fields with ' + method,
      ['#inspector-input-field-1', '#inspector-input-field-2', '#inspector-input-submit'], async function(assert, f, c) {
        var promise = c.command_window.openInspectorInputDialog({
          fields: Array.from({ length: count }, () => ({ label: 'field', value: 'old' }))
        });
        f.input('#inspector-input-field-1', 'first');
        if(count === 2) f.input('#inspector-input-field-2', 'second');
        assert.equal(f.visible('#inspector-input-row-2'), count === 2);
        if(method === 'button') f.click('#inspector-input-submit');
        else f.key('#inspector-input-field-1', 'Enter');
        var result = await promise;
        assert.deepEqual(Array.from(result.values), count === 1 ? ['first'] : ['first', 'second']);
        assert.equal(f.visible('#inspector-input-container'), false);
      });
  }
}
for(const method of ['close', 'cancel', 'escape']) {
  guiTest(tests, 'main', 'inspector dialog ' + method + ' resolves cancellation',
    method === 'escape' ? [] : ['#inspector-input-' + method], async function(assert, f, c) {
      var promise = c.command_window.openInspectorInputDialog({ fields: [{ value: 'old' }] });
      if(method === 'escape') f.key('#inspector-input-field-1', 'Escape');
      else f.click('#inspector-input-' + method);
      assert.equal(await promise, null);
      assert.equal(f.visible('#inspector-input-container'), false);
    });
}
guiTest(tests, 'main', 'opening another inspector dialog resolves the previous one', [], async function(assert, f, c) {
  var first = c.command_window.openInspectorInputDialog();
  var second = c.command_window.openInspectorInputDialog();
  assert.equal(await first, null); f.click('#inspector-input-cancel'); assert.equal(await second, null);
});

/**
 * Renders a real inspector toolbar with all supported table actions.
 * @param {Object} f Fixture.
 * @param {Object} c Main window controller.
 */
function renderTable(f, c) {
  var state = { variable: 'table_data', view: 'table', state_filter: 'old',
    state_filter_expr: 'row.value > 0', state_sort_by: 'value', state_sort_dir: 'asc' };
  c.command_window.showInspector({ variable: 'table_data', title: 'Test table', content: {
    ...state, type: 'table', toolbar: {
      ...state, show_clear_filter: true, show_clear_expr: true,
      extra_actions: ['table-addvar', 'table-renamevar', 'table-removevar', 'table-copy-csv'].map(action => ({ action, label: action }))
    },
    columns: [{ key: 'value', label: 'value', sortable: true, next_sort_dir: 'desc' }], rows: []
  } });
}

for(const [action, values, fragment] of [
  ['refresh', null, 'inspectVariable("table_data"'],
  ['filter', ['new filter'], '"filter":"new filter"'],
  ['clear-filter', null, 'inspectVariable("table_data"'],
  ['table-filter-expr', ['row.value > 5'], '"filter_expr":"row.value > 5"'],
  ['table-clear-filter-expr', null, 'inspectVariable("table_data"'],
  ['sort', null, '"sort_dir":"desc"'],
  ['table-addvar', ['new_column', '[1,2]'], '"addvar"'],
  ['table-renamevar', ['value', 'new_name'], '"renamevar"'],
  ['table-removevar', ['value'], '"removevar"'],
  ['table-copy-csv', null, '"copycsv"']
]) {
  guiTest(tests, 'main', 'rendered inspector action ' + action + ' sends the expected command', [], async function(assert, f, c) {
    renderTable(f, c);
    c.command_window.code_input.setValue('preserved draft');
    f.click('.jslab-inspector-action[data-action="' + action + '"]');
    if(values) {
      values.forEach((value, i) => f.input('#inspector-input-field-' + (i + 1), value));
      f.click('#inspector-input-submit');
    }
    await f.tick();
    var command = sent(assert, f, 'SandboxWindow', 'eval-code')[0];
    assert.ok(command.includes(fragment), command);
    if(action === 'clear-filter') assert.equal(command.includes('"filter":'), false);
    if(action === 'table-clear-filter-expr') assert.equal(command.includes('"filter_expr":'), false);
    assert.equal(c.command_window.code_input.getValue(), 'preserved draft');
  });
}

guiTest(tests, 'main', 'scalar inspector edit submits a value expression and refreshes', [], async function(assert, f, c) {
  c.command_window.showInspector({ variable: 'scalar', content: {
    type: 'scalar', variable: 'scalar', default_expr: '1', preview_text: '1', edit_label: 'Edit'
  } });
  f.click('.jslab-inspector-action[data-action="edit"]');
  assert.equal(f.query('#inspector-input-field-1').value, '1');
  f.input('#inspector-input-field-1', '2 + 3'); f.click('#inspector-input-submit');
  await f.tick();
  assert.ok(sent(assert, f, 'SandboxWindow', 'eval-code')[0].includes('inspectSetVariable("scalar", [], "2 + 3")'));
});

exports.MODULE_TESTS = tests;
