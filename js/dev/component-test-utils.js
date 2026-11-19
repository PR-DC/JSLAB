/**
 * @file Shared GUI assertions and control coverage registry
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for dev gui test utils operations.
 */
class PRDC_JSLAB_COMPONENT_TEST_UTILS {

  /**
   * Registers an interaction test with guaranteed fixture cleanup.
   * @param {Object} tests Test collection.
   * @param {string} type Window type.
   * @param {string} name Behavior under test.
   * @param {string[]} selectors Controls whose behavior is asserted.
   * @param {Function} callback Test body.
   */
  static guiTest(tests, type, name, selectors, callback) {
    selectors.forEach(selector => coverage[type].add(selector));
    tests.add(name, async function(assert) {
      var fixture = await createFixture(type);
      try {
        await callback(assert, fixture, fixture.controller);
        await fixture.tick();
        assert.deepEqual(fixture.errors, [], 'Unexpected renderer errors: ' + fixture.errors.join('\n'));
      } finally {
        fixture.dispose();
      }
    }, { tags: ['gui', type], timeout_ms: 15000 });
  }

  /**
   * Checks the last matching IPC action and returns its payload.
   * @param {Object} assert Assertion helpers.
   * @param {Object} fixture GUI fixture.
   * @param {string} channel IPC channel.
   * @param {string} action IPC action.
   * @returns {*} Action payload.
   */
  static sent(assert, fixture, channel, action) {
    var call = fixture.calls.filter(call => call[0] === channel && call[1] === action).pop();
    assert.ok(call, 'Expected IPC action: ' + channel + '/' + action);
    return call[2];
  }

  /**
   * Verifies a common window shortcut's transport action.
   * @param {Object} assert Assertion service.
   * @param {Object} fixture Renderer fixture.
   * @param {string} key Shortcut key.
   * @param {Object} options Modifier keys.
   * @param {string} action Expected host action.
   */
  static shortcut(assert, fixture, key, options, action) {
    fixture.key(null, key, options);
    PRDC_JSLAB_COMPONENT_TEST_UTILS.sent(assert, fixture, action === 'interrupt-execution' ? 'SandboxWindow' : 'MainProcess', action);
  }

}


const { createFixture } = require('./gui-test-fixture');
const coverage = { main: new Set(), editor: new Set(), simulate: new Set(), assistant: new Set(), terminal: new Set(), figure: new Set(), serial_terminal: new Set(), 'presentation-editor': new Set(), 'latex-editor': new Set(), presentation: new Set(), blank: new Set() };


exports.guiTest = PRDC_JSLAB_COMPONENT_TEST_UTILS.guiTest;
exports.sent = PRDC_JSLAB_COMPONENT_TEST_UTILS.sent;
exports.coverage = coverage;

exports.shortcut = PRDC_JSLAB_COMPONENT_TEST_UTILS.shortcut;
