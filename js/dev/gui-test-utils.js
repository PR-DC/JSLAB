/**
 * @file Shared GUI assertions and control coverage registry
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { createFixture } = require('./gui-test-fixture');
const coverage = { main: new Set(), editor: new Set(), figure: new Set(), serial_terminal: new Set(), 'presentation-editor': new Set(), presentation: new Set(), blank: new Set() };

/**
 * Registers an interaction test with guaranteed fixture cleanup.
 * @param {Object} tests Test collection.
 * @param {string} type Window type.
 * @param {string} name Behavior under test.
 * @param {string[]} selectors Controls whose behavior is asserted.
 * @param {Function} callback Test body.
 */
function guiTest(tests, type, name, selectors, callback) {
  selectors.forEach(selector => coverage[type].add(selector));
  tests.add(name, async function(assert) {
    var fixture = await createFixture(type);
    try {
      await callback(assert, fixture, fixture.controller);
      await fixture.tick();
      assert.deepEqual(fixture.errors, [], 'Unexpected renderer errors: ' + fixture.errors.join('\n'));
    } finally { fixture.dispose(); }
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
function sent(assert, fixture, channel, action) {
  var call = fixture.calls.filter(call => call[0] === channel && call[1] === action).pop();
  assert.ok(call, 'Expected IPC action: ' + channel + '/' + action);
  return call[2];
}

exports.guiTest = guiTest;
exports.sent = sent;
exports.coverage = coverage;
