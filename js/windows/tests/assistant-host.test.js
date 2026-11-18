/**
 * @file Shared Assistant host request tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_ASSISTANT } = require('../assistant');
var tests = new PRDC_JSLAB_TESTS();

tests.add('application Assistant requests share credentials, responses and conversation reset', async function(assert) {
  let token = '';
  const app = new PRDC_JSLAB_ASSISTANT({ storage: { hasSecret: () => !!token, getSecret: () => token,
    setSecret: (key, value) => {
      token = value;
    }, deleteSecret: () => {
      token = '';
    } }, credential_status: 678 });
  await app.request('JSLAB_ASSISTANT_SETTINGS_SET', { api_key: 'sk-test' });
  assert.deepEqual(await app.request('JSLAB_ASSISTANT_SETTINGS_GET'), { has_api_key: true, status_string: 678 });
  app.fetch = async () => ({ ok: true, json: async () => ({ id: 'response-test', output_text: 'Ready.', output: [] }) });
  const reply = await app.request('JSLAB_ASSISTANT_CHAT', 'Hello');
  assert.equal(reply.result.text, 'Ready.');
  assert.equal(app.previous_response_id, 'response-test');
  await app.request('JSLAB_ASSISTANT_RESET');
  assert.equal(app.previous_response_id, null);
  await app.request('JSLAB_ASSISTANT_SETTINGS_SET', { clear: true });
  assert.equal((await app.request('JSLAB_ASSISTANT_SETTINGS_GET')).has_api_key, false);
  assert.ok((await app.request('JSLAB_ASSISTANT_CHAT', 'Hello')).error.includes('Configure'));
}, { tags: ['unit', 'application', 'assistant'] });

tests.add('application tools normalize arguments and collect context through host operations', async function(assert) {
  const app = new PRDC_JSLAB_ASSISTANT({ storage: {}, host: {} });
  const calls = [];
  app._host._readMainAssistantContext = async () => ({ current_path: '/workspace' });
  app._host._readEditorAssistantContext = async () => null;
  app._host._evaluateAssistantCode = code => calls.push(['code', code]);
  app._host._readAssistantHelp = (query, type) => calls.push(['help', query, type]);
  app._host._openAssistantEditor = filename => calls.push(['editor', filename]);
  app._host._replaceAssistantSelection = text => calls.push(['replace', text]);
  assert.deepEqual(await app.callTool('get_application_context', {}), { main: { current_path: '/workspace' }, editor: null });
  await app.callTool('evaluate_code', { code: '2 + 3' });
  await app.callTool('get_help', { query: 'math', type: 'category' });
  await app.callTool('get_help', { query: 'trapz', type: 'function' });
  await app.callTool('open_editor', { path: '/workspace/example.jsl' });
  await app.callTool('replace_editor_selection', { text: 12 });
  assert.deepEqual(calls, [['code', '2 + 3'], ['help', 'math', 'category'], ['help', 'trapz', undefined],
    ['editor', '/workspace/example.jsl'], ['replace', '12']]);
  await assert.rejects(() => app.callTool('unknown', {}), /Unknown/);
}, { tags: ['unit', 'application', 'assistant'] });

tests.add('application cancellation aborts the provider and invokes the host ownership check', async function(assert) {
  const app = new PRDC_JSLAB_ASSISTANT({ storage: {}, host: {} });
  let interruptions = 0;
  app._host._interruptAssistantExecution = async () => {
    interruptions++;
  };
  const controller = new AbortController();
  app.abort_controller = controller;
  await app.request('JSLAB_ASSISTANT_CANCEL');
  assert.equal(controller.signal.aborted, true);
  assert.equal(interruptions, 1);
  await assert.rejects(() => app.request('unknown'), /Unsupported/);
}, { tags: ['unit', 'application', 'assistant'] });

exports.MODULE_TESTS = tests;
