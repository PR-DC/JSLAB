/**
 * @file JSLAB automation bridge and MCP tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { PRDC_JSLAB_AUTOMATION } = require('../automation');
const { PRDC_JSLAB_BRIDGE_CLIENT } = require('../../mcp/bridge-client');
const { createServer, parseArguments } = require('../../mcp/server');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

/**
 * Creates a bridge with controllable desktop replies.
 * @returns {Object} Test bridge and recorded messages.
 */
function createBridge() {
  var sent = [];
  var main = {
    automation_version: 'test',
    win_main: { isDestroyed: function() { return false; }, send: function() {} },
    win_sandbox: { send: function(...args) { sent.push(args); } }
  };
  var bridge = new PRDC_JSLAB_AUTOMATION(main);
  bridge.session_file = path.join(os.tmpdir(), 'jslab-automation-test-' + crypto.randomUUID() + '.json');
  bridge.ready = true;
  return { bridge: bridge, main: main, sent: sent };
}

tests.add('automation serializes jobs, ignores stale replies and interrupts cooperatively', function(assert) {
  var harness = createBridge();
  var bridge = harness.bridge;
  var job = bridge.dispatch('evaluate_code', { code: '1 + 2' });
  assert.equal(job.status, 'running');
  assert.throws(function() { bridge.dispatch('list_workspace'); }, /busy/);
  bridge.complete({ id: 'wrong', result: { success: true } });
  assert.equal(bridge.active_id, job.execution_id);
  assert.equal(bridge.dispatch('interrupt_execution').requested, true);
  assert.equal(harness.main.stop_loop_in, true);
  assert.equal(harness.sent[1][1], 'stop-loop');
  assert.equal(bridge.busy, true);
  bridge.complete({ id: job.execution_id, result: { success: true, value: 3 } });
  assert.equal(bridge.dispatch('get_execution', { execution_id: job.execution_id }).result.value, 3);
  assert.equal(bridge.busy, false);
  bridge.dispatch('list_workspace');
  bridge.reset();
  assert.equal(bridge.ready, false);
  assert.equal(bridge.jobs.get(Array.from(bridge.jobs.keys())[1]).result.success, false);
}, { tags: ['unit', 'automation'] });

tests.add('automation retains only twenty jobs and rejects operations before readiness', function(assert) {
  var bridge = createBridge().bridge;
  var first_id;
  for(var i = 0; i < 21; i++) {
    var job = bridge.dispatch('list_workspace');
    if(i === 0) first_id = job.execution_id;
    bridge.complete({ id: job.execution_id, result: { success: true } });
  }
  assert.equal(bridge.jobs.size, 20);
  assert.throws(function() { bridge.dispatch('get_execution', { execution_id: first_id }); }, /expired/);
  bridge.reset();
  assert.throws(function() { bridge.dispatch('evaluate_code', { code: '1' }); }, /not ready/);
}, { tags: ['unit', 'automation'] });

tests.add('automation HTTP authenticates, rejects browser origins and cleans session credentials', async function(assert) {
  var harness = createBridge();
  var bridge = harness.bridge;
  fs.writeFileSync(bridge.session_file, '{"stale":true}');
  await bridge.start();
  try {
    var client = new PRDC_JSLAB_BRIDGE_CLIENT({ session_file: bridge.session_file });
    var sessions = await client.listSessions();
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].token, undefined);
    assert.equal((await client.call('get_session_status')).ready, true);
    var state = client.readSession(bridge.session_file);
    var denied = false;
    try { await client.request(Object.assign({}, state, { token: '0'.repeat(64) }), 'get_session_status'); }
    catch(err) { denied = /Unauthorized/.test(err.message); }
    assert.ok(denied);
    var status = await new Promise(function(resolve, reject) {
      var req = http.request({ hostname: '127.0.0.1', port: state.port, method: 'POST',
        path: '/request', headers: { Authorization: 'Bearer ' + state.token,
          Origin: 'http://example.test' } }, function(res) { res.resume(); resolve(res.statusCode); });
      req.on('error', reject);
      req.end('{}');
    });
    assert.equal(status, 403);
    var running = await client.call('evaluate_code', { code: '1', wait_ms: 0 });
    assert.equal(running.status, 'running');
    bridge.complete({ id: running.execution_id, result: { success: false, error: 'test error' } });
    var completed = await client.call('get_execution', { execution_id: running.execution_id });
    assert.equal(completed.result.error, 'test error');
  } finally {
    bridge.stop();
  }
  assert.equal(fs.existsSync(bridge.session_file), false);
}, { tags: ['integration', 'automation'] });

tests.add('MCP discovers tools and resources, validates arguments and reports execution failures', async function(assert) {
  var harness = createBridge();
  var bridge = harness.bridge;
  harness.main.win_sandbox.send = function(channel, action, request) {
    if(action === 'automation-request') {
      setTimeout(function() {
        bridge.complete({ id: request.id, result: { success: false, error: 'script failed' } });
      }, 5);
    }
  };
  await bridge.start();
  var server = createServer({ session_file: bridge.session_file });
  var client = new Client({ name: 'jslab-test', version: '1.0' });
  var transports = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(transports[0]);
    await client.connect(transports[1]);
    var tools = await client.listTools();
    assert.equal(tools.tools.length, 14);
    assert.ok(tools.tools.some(function(tool) { return tool.name === 'export_figure'; }));
    var guide = await client.readResource({ uri: 'jslab://agent-guide' });
    assert.ok(guide.contents[0].text.includes('get_session_status'));
    var mcp_guide = await client.readResource({ uri: 'jslab://mcp-guide' });
    assert.ok(mcp_guide.contents[0].text.startsWith('## MCP server'));
    assert.ok(mcp_guide.contents[0].text.includes('### Connect an agent'));
    assert.equal(mcp_guide.contents[0].text.includes('## Code references'), false);
    var status = await client.callTool({ name: 'get_session_status', arguments: {} });
    assert.equal(JSON.parse(status.content[0].text).ready, true);
    var result = await client.callTool({ name: 'evaluate_code', arguments: { code: 'throw Error()' } });
    assert.equal(result.isError, true);
    assert.equal(JSON.parse(result.content[0].text).result.error, 'script failed');
    var invalid = await client.callTool({ name: 'evaluate_code', arguments: { code: 123 } });
    assert.equal(invalid.isError, true);
    assert.throws(function() { parseArguments(['--pid', 'abc']); }, /Usage/);
    assert.throws(function() { parseArguments(['--pid', '1', '--session-file', 'x']); }, /Choose/);
  } finally {
    await client.close();
    await server.close();
    bridge.stop();
  }
}, { tags: ['integration', 'automation'] });

exports.MODULE_TESTS = tests;
