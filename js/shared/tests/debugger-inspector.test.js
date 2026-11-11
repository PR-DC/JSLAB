/**
 * @file Paused Workspace and inspector descriptor adapter tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../tester');
const { PRDC_JSLAB_DEBUGGER_INSPECTOR } = require('../debugger-inspector');
const tests = new PRDC_JSLAB_TESTS(); exports.MODULE_TESTS = tests;
function fixture() {
  const calls = [], models = [];
  const host = { token: () => 'pause-1', currentString: id => String(id), showInspector: model => models.push(model),
    request: async (method, args) => { calls.push([method, args]); return method === 'evaluate_debug_expression' ?
      { value: { type: 'object', object_id: 'object' } } : { properties: [
        { name: 'answer', writable: true, value: { type: 'number', value: 42 } },
        { name: 'unsafe', accessor: true }, { name: 'constant', writable: false, value: { preview: '7' } }
      ] }; } };
  return { host, calls, models, inspector: new PRDC_JSLAB_DEBUGGER_INSPECTOR(host) };
}
tests.add('paused inspector uses descriptors and existing table model without evaluating getters', async assert => {
  const { inspector, calls } = fixture(); const model = await inspector.inspect('local');
  assert.equal(model.content.type, 'table'); assert.equal(model.debug_context, 'pause-1');
  assert.equal(model.content.rows[0].cells[1].preview_text, '42');
  assert.equal(model.content.rows[1].cells[1].preview_text, '594');
  assert.equal(model.content.rows[1].cells[1].editable, false);
  assert.equal(model.content.rows[2].cells[1].editable, false);
  assert.equal(calls.filter(call => call[0] === 'evaluate_debug_expression').length, 1);
}, { tags: ['unit'] });
tests.add('paused inspector reuses filtering sorting bounds and scalar editing', async assert => {
  const { inspector, host } = fixture();
  const model = await inspector.inspect('local', { filter: 'answer', sort_by: 'key', sort_dir: 'desc', max_rows: 1 });
  assert.equal(model.content.rows.length, 1); assert.equal(model.content.rows[0].cells[0].preview_text, 'answer');
  assert.equal(model.content.columns[0].next_sort_dir, 'asc');
  assert.equal((await inspector.inspect('local', null)).content.rows.length, 3);
  host.request = async () => ({ value: { preview: '12' } });
  const scalar = await inspector.inspect('callerLocal'); assert.equal(scalar.content.type, 'scalar');
  assert.equal(scalar.content.default_expr, '12');
}, { tags: ['unit'] });
tests.add('paused inspector handles generated edits and inspection without executing argument code', async assert => {
  const { inspector, calls } = fixture();
  assert.equal(await inspector.handle('inspectSetVariable("local", ["answer"], "7"); inspectVariable("local", {filter:"answer"});'), true);
  assert.equal(calls[0][1].expression, '(local)["answer"] = (7)');
  assert.equal(await inspector.handle('inspectVariable(runSomething())'), false);
  assert.equal(await inspector.handle('inspectVariable("local"); otherFunction();'), false);
  assert.equal(await inspector.handle('local + 1'), false);
}, { tags: ['unit'] });
tests.add('paused inspector rejects stale data arriving after a frame switch or resume', async assert => {
  const { inspector, host, models } = fixture(); let finish;
  host.request = () => new Promise(resolve => { finish = resolve; });
  const pending = inspector.inspect('local'); host.token = () => ''; finish({ value: { preview: '42' } });
  let error; try { await pending; } catch(e) { error = e.message; }
  assert.equal(error, '620'); assert.equal(models.length, 0);
}, { tags: ['unit'] });
tests.add('paused inspector reports engine errors and validates edit syntax', async assert => {
  const { inspector, host } = fixture(); host.request = async () => ({ success: false, error: 'expired handle' });
  let error; try { await inspector.inspect('local'); } catch(e) { error = e.message; }
  assert.equal(error, 'expired handle');
  error = null; try { await inspector.handle('inspectSetVariable("local", [], "1; unexpected()");'); } catch(e) { error = e.message; }
  assert.ok(error);
}, { tags: ['unit'] });
tests.add('paused Workspace rows support desktop and browser values without interpreting markup', assert => {
  const { inspector } = fixture(); const rows = inspector.rows([{ name: 'local', value: { type: 'number', value: 12 } },
    { name: 'web', type: 'string', preview: '"<str>"' }, { name: 'unsafe', accessor: true }]);
  assert.deepEqual(rows, [['local','number','12'],['web','string','"<str>"'],['unsafe','','594']]);
}, { tags: ['unit'] });
