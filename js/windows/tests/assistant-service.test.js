/**
 * @file JSLAB Assistant service tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_ASSISTANT } = require('../assistant');
var tests = new PRDC_JSLAB_TESTS();

/**
 * Creates isolated provider, storage and tool fixtures for the Assistant service.
 */
class PRDC_JSLAB_ASSISTANT_TEST_HELPER {
  /**
   * Connects captured requests and queued provider responses.
   * @param {Array<Object>} responses Queued responses.
   * @returns {Object} Service, storage and captured calls.
   */
  static harness(responses) {
    const values = new Map(), requests = [], tools = [];
    const service = new PRDC_JSLAB_ASSISTANT({
      storage: { hasSecret: key => values.has(key), getSecret: key => values.get(key),
        setSecret: (key, value) => values.set(key, value), deleteSecret: key => values.delete(key) },
      fetch: PRDC_JSLAB_TESTS.responseFetch(responses, requests),
      call_tool: async (name, args) => { tools.push([name, args]); return { answer: 5 }; }
    });
    return { service, values, requests, tools };
  }
}

tests.add('Assistant validates, reports and clears the host API key', function(assert) {
  var h = PRDC_JSLAB_ASSISTANT_TEST_HELPER.harness([]);
  assert.equal(h.service.hasApiKey(), false);
  h.service.setApiKey('sk-test');
  assert.equal(h.service.hasApiKey(), true);
  assert.equal(h.values.get('openai-api-key'), 'sk-test');
  assert.throws(() => h.service.setApiKey('  '), /required/);
  h.service.clearApiKey();
  assert.equal(h.service.hasApiKey(), false);
}, { tags: ['unit', 'assistant'] });

tests.add('Assistant resolves tool calls and continues the same response conversation', async function(assert) {
  var h = PRDC_JSLAB_ASSISTANT_TEST_HELPER.harness([
    { id: 'resp-1', output: [{ type: 'function_call', call_id: 'call-1',
      name: 'evaluate_code', arguments: '{"code":"2+3"}' }] },
    { id: 'resp-2', model: 'test-model', output_text: 'The result is 5.', output: [] }
  ]);
  h.service.setApiKey('sk-test');
  var result = await h.service.chat('Calculate 2+3.');
  assert.equal(result.text, 'The result is 5.');
  assert.deepEqual(h.tools, [['evaluate_code', { code: '2+3' }]]);
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].previous_response_id, 'resp-1');
  assert.equal(h.requests[1].input[0].type, 'function_call_output');
}, { tags: ['unit', 'backend', 'assistant'] });

tests.add('Assistant reports API errors without exposing the key', async function(assert) {
  var h = PRDC_JSLAB_ASSISTANT_TEST_HELPER.harness([]);
  h.service.setApiKey('sk-secret');
  h.service.fetch = async function() {
    return { ok: false, status: 401, json: async () => ({ error: { message: 'Invalid key.' } }) };
  };
  var error;
  try {
    await h.service.chat('Hello');
  } catch(err) {
    error = err;
  }
  assert.equal(error.message, 'Invalid key.');
  assert.equal(error.message.includes('sk-secret'), false);
}, { tags: ['unit', 'backend', 'assistant'] });

tests.add('Assistant snapshots bound main and Editor content consistently for both hosts', function(assert) {
  const context = PRDC_JSLAB_ASSISTANT.mainContext({ folder_navigation: { current_path: '/workspace/' },
    command_window: { code_input: { getValue: () => 'a'.repeat(9000) } },
    workspace: { data: Array.from({ length: 205 }, (_, index) => [String(index), 'number']) } });
  assert.equal(context.command_input.length, 8000);
  assert.equal(context.workspace.length, 200);
  const edits = [];
  const editor = { script_manager: { active_tab: {}, getScriptByTab: () => [{ path: '/workspace/example.jsl',
    code_editor: { getSelection: () => 's'.repeat(17000), getValue: () => 'c'.repeat(33000),
      getCursor: () => ({ line: 2, ch: 3 }), replaceSelection: (...args) => edits.push(args), focus: () => {} } }] } };
  const document = PRDC_JSLAB_ASSISTANT.editorContext(editor);
  assert.equal(document.selection.length, 16000);
  assert.equal(document.code.length, 32000);
  PRDC_JSLAB_ASSISTANT.replaceSelection(editor, 'new text');
  assert.deepEqual(edits, [['new text', 'around', '+assistant']]);
  editor.script_manager.getScriptByTab = () => [];
  assert.equal(PRDC_JSLAB_ASSISTANT.editorContext(editor), null);
  assert.throws(() => PRDC_JSLAB_ASSISTANT.replaceSelection(editor, 'text'), /No active/);
}, { tags: ['unit', 'assistant'] });

exports.MODULE_TESTS = tests;
