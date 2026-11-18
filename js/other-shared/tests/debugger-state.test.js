/**
 * @file Common debugger policy tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require("../tester");
const { PRDC_JSLAB_DEBUGGER_STATE } = require("../debugger-state");
var tests = new PRDC_JSLAB_TESTS();

tests.add('debugger settings exclude transport bindings and belong to one session', function(assert) {
  const first = new PRDC_JSLAB_DEBUGGER_STATE();
  const second = new PRDC_JSLAB_DEBUGGER_STATE();
  first.breakpoints.set('script.jsl:4', { id: 'script.jsl:4', path: 'script.jsl', line: 4,
    condition: 'x > 2', enabled: false, bindings: ['chromium-private-id'] });
  first.pause_on_exceptions = 'uncaught';
  assert.deepEqual(first.settings(), { breakpoints: [{ id: 'script.jsl:4', path: 'script.jsl', line: 4,
    condition: 'x > 2', enabled: false }], pause_on_exceptions: 'uncaught' });
  assert.equal(second.settings().breakpoints.length, 0);
  assert.equal(first.breakpoints.get('script.jsl:4').bindings[0], 'chromium-private-id');
}, { tags: ['unit', 'debugger'] });

tests.add('debugger validates breakpoints and pause modes before transport work', function(assert) {
  const service = new PRDC_JSLAB_DEBUGGER_STATE();
  service._validateBreakpoint('script.jsl', 4, 'x > 2', true);
  assert.throws(() => service._validateBreakpoint('', 4, '', true), /path/);
  assert.throws(() => service._validateBreakpoint('script.jsl', 0, '', true), /positive/);
  assert.throws(() => service._validateBreakpoint('script.jsl', 4, 'x >', true));
  assert.throws(() => service._validateBreakpoint('script.jsl', 4, '', 'yes'), /enabled/);
  assert.throws(() => service._validateExceptionPause('sometimes'), /pause mode/);
  assert.throws(() => service._validateResumeAction('skip'), /action/);
}, { tags: ['unit', 'debugger'] });

tests.add('debugger handles and frame selections expire when their pause changes', function(assert) {
  const service = new PRDC_JSLAB_DEBUGGER_STATE();
  service.state = 'paused';
  service.revision = 3;
  service._checkRevision(3);
  assert.throws(() => service._checkRevision(2), /expired/);
  const snapshot = { state: 'paused', revision: 3, frames: [{ name: 'user' }] };
  PRDC_JSLAB_DEBUGGER_STATE.validateFrameSelection(snapshot, { frame_index: 0, revision: 3 });
  assert.throws(() => PRDC_JSLAB_DEBUGGER_STATE.validateFrameSelection(snapshot, { frame_index: '0' }), /Expired/);
  assert.throws(() => PRDC_JSLAB_DEBUGGER_STATE.validateFrameSelection(snapshot, { frame_index: 1 }), /Expired/);
  assert.throws(() => PRDC_JSLAB_DEBUGGER_STATE.validateFrameSelection(snapshot, { frame_index: 0, revision: 2 }), /Expired/);
  service.state = 'running';
  assert.throws(() => service._checkRevision(3), /not paused/);
}, { tags: ['unit', 'debugger'] });

exports.MODULE_TESTS = tests;
