/**
 * @file JSLAB Assistant service tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { PRDC_JSLAB_ASSISTANT } = require('../assistant');
var tests = new PRDC_JSLAB_TESTS();

function harness(responses) {
  var values = new Map();
  var requests = [];
  var tools = [];
  var service = new PRDC_JSLAB_ASSISTANT({
    store: {
      get: key => values.get(key), set: (key, value) => values.set(key, value),
      delete: key => values.delete(key)
    },
    safe_storage: {
      isEncryptionAvailable: () => true,
      encryptString: value => Buffer.from('encrypted:'+value),
      decryptString: value => value.toString().replace(/^encrypted:/, '')
    },
    fetch: async function(_url, options) {
      requests.push(JSON.parse(options.body));
      return { ok: true, json: async () => responses.shift() };
    },
    call_tool: async function(name, args) {
      tools.push([name, args]);
      return { answer: 5 };
    }
  });
  return { service, values, requests, tools };
}

tests.add('Assistant encrypts, reports and clears the API key', function(assert) {
  var h = harness([]);
  assert.equal(h.service.hasApiKey(), false);
  h.service.setApiKey('sk-test');
  assert.equal(h.service.hasApiKey(), true);
  assert.equal(h.values.get(h.service.storage_key), Buffer.from('encrypted:sk-test').toString('base64'));
  h.service.clearApiKey();
  assert.equal(h.service.hasApiKey(), false);
}, { tags: ['unit', 'backend', 'assistant'] });

tests.add('Assistant resolves tool calls and continues the same response conversation', async function(assert) {
  var h = harness([
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
  var h = harness([]);
  h.service.setApiKey('sk-secret');
  h.service.fetch = async function() {
    return { ok: false, status: 401, json: async () => ({ error: { message: 'Invalid key.' } }) };
  };
  var error;
  try { await h.service.chat('Hello'); } catch(err) { error = err; }
  assert.equal(error.message, 'Invalid key.');
  assert.equal(error.message.includes('sk-secret'), false);
}, { tags: ['unit', 'backend', 'assistant'] });

exports.MODULE_TESTS = tests;
