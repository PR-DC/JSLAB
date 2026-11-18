/**
 * @file JSLAB backend instance router tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for instance router test fixtures.
 */
class PRDC_JSLAB_BACKEND_TESTS_INSTANCE_ROUTER_TEST_HELPER {

  /**
   * Creates router harness.
   */
  static createRouterHarness() {
    var opened = [];
    var prefix = 'jslab-router-test-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    var state_file = prefix + '.json';
    var router = new PRDC_JSLAB_INSTANCE_ROUTER({
      state_filename: state_file,
      endpoint_prefix: prefix,
      is_script_path: function(candidate) {
        return typeof candidate === 'string' && candidate.toLowerCase().endsWith('.jsl');
      },
      on_open_scripts: function(paths) {
        opened.push(paths.slice());
      }
    });
    return { router, opened };
  }
}


const fs = require('fs');
const os = require('os');
const path = require('path');
const { PRDC_JSLAB_INSTANCE_ROUTER } = require('../instance-router');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();


tests.add('getStartupScriptPaths filters non-script startup arguments', function(assert) {
  var harness = PRDC_JSLAB_BACKEND_TESTS_INSTANCE_ROUTER_TEST_HELPER.createRouterHarness();
  var out = harness.router.getStartupScriptPaths(['node', 'a.jsl', 'b.txt', 'c.JSL']);
  assert.deepEqual(out, ['a.jsl', 'c.JSL']);
}, { tags: ['unit', 'backend', 'instance-router'] });

tests.add('message handling parses valid payloads and ignores invalid ones', function(assert) {
  var harness = PRDC_JSLAB_BACKEND_TESTS_INSTANCE_ROUTER_TEST_HELPER.createRouterHarness();
  harness.router._handleOpenRequestMessage('not-json');
  harness.router._handleOpenRequestMessage(JSON.stringify({ action: 'noop', paths: ['a.jsl'] }));
  harness.router._handleOpenRequestMessage(JSON.stringify({ action: 'open-script', paths: ['a.jsl', 'b.jsl'] }));
  assert.equal(harness.opened.length, 1);
  assert.deepEqual(harness.opened[0], ['a.jsl', 'b.jsl']);
}, { tags: ['unit', 'backend', 'instance-router'] });

tests.add('last-active state is written, read and cleared for matching endpoint', function(assert) {
  var harness = PRDC_JSLAB_BACKEND_TESTS_INSTANCE_ROUTER_TEST_HELPER.createRouterHarness();
  try {
    harness.router.markAsLastActive();
    var state = harness.router._readLastActiveInstance();
    assert.ok(state && state.endpoint === harness.router.instance_endpoint);
    assert.equal(typeof state.pid, 'number');

    harness.router._clearLastActiveInstance(harness.router.instance_endpoint);
    assert.equal(harness.router._readLastActiveInstance(), false);
  } finally {
    try {
      fs.unlinkSync(harness.router.last_active_instance_file);
    } catch(err) {}
    if(os.platform() !== 'win32') {
      try {
        fs.unlinkSync(harness.router.instance_endpoint);
      } catch(err) {}
    }
  }
}, { tags: ['unit', 'backend', 'instance-router'] });

tests.add('forwardScriptsToLastActive returns false without valid target state', async function(assert) {
  var harness = PRDC_JSLAB_BACKEND_TESTS_INSTANCE_ROUTER_TEST_HELPER.createRouterHarness();
  var out = await harness.router.forwardScriptsToLastActive(['a.jsl']);
  assert.equal(out, false);
}, { tags: ['unit', 'backend', 'instance-router'] });

exports.MODULE_TESTS = tests;
