/**
 * @file Original-source diagnostics in the normal browser iframe runtime
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TEST, PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_GUI_TESTER } = require('../../dev/gui-test-lifecycle');
const { webTestWithCommandErrors } = require('./browser-test-utils');
var tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;
if(!global.gui_browser) {
  return;
}

webTestWithCommandErrors(tests, 'normal browser runtime reports nested script runtime and selected-line syntax errors', [
  /^Error: iframe failure\n  at child \(\/workspace\/error-child\.jsl:3:9\)/,
  /^SyntaxError: Unexpected token \(3:13\)\n  at \(\/workspace\/error-syntax\.jsl:3:14\)/
], async () => {
  GUI.app.fs.writeTextFileSync('/workspace/error-child.jsl', '\nfunction child() {\n  throw new Error("iframe failure");\n}\nchild();');
  GUI.app.fs.writeTextFileSync('/workspace/error-parent.jsl', 'await run("/workspace/error-child.jsl", undefined, true, true);');
  try {
    await GUI.app.sandbox_api.evaluate('await run("/workspace/error-parent.jsl", undefined, true, true);');
    throw Error('Expected failure');
  } catch(error) {
    GUI.eq(error.error_details.location.path, '/workspace/error-child.jsl');
    GUI.eq(error.error_details.location.line, 3);
    GUI.ok(error.error_details.frames.some(frame => frame.path === '/workspace/error-parent.jsl'));
  }
  GUI.app.fs.writeTextFileSync('/workspace/error-syntax.jsl', '// line one\n// line two\nvar broken = ;');
  try {
    await GUI.app.sandbox_api.evaluate('await run("/workspace/error-syntax.jsl", [3,3], true, true);');
    throw Error('Expected syntax failure');
  } catch(error) {
    GUI.eq(error.error_details.kind, 'syntax');
    GUI.eq(error.error_details.location.line, 3);
    GUI.eq(error.error_details.location.column, 14);
  }
  return true;
});

webTestWithCommandErrors(tests, 'normal browser primitive and async errors have structured diagnostics and recover cleanly', [
  /^ThrownValue: 0\n  at \(jslcmdwindow:2:1\)/,
  /^ThrownValue: null\n  at \(jslcmdwindow:2:1\)/,
  /^TypeError: async browser failure\n/
], async () => {
  for(const code of ['\nthrow 0;', '\nthrow null;', '\nawait Promise.reject(new TypeError("async browser failure"));']) {
    try {
      await GUI.app.sandbox_api.evaluate(code);
      throw Error('Expected failure');
    } catch(error) {
      GUI.eq(error.error_details.location.line, 2);
      GUI.ok(error.error_details.message.length > 0);
    }
  }
  GUI.eq((await GUI.app.sandbox_api.evaluate('2 + 3')).value, 5);
  return true;
});

tests.add('GUI runner fails on sandbox errors even when the scenario passed and the Command Window was cleared', async function(assert) {
  const expected = /^Error: sandbox cleanup error probe\n/;
  const probe = new PRDC_JSLAB_GUI_TESTER('backend-web/tests', {}, {
    clients: () => [gui_browser],
    command_window: gui_browser,
    after: async () => {
      await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate(
        'setTimeout(() => { throw Error("sandbox cleanup error probe"); }, 0); void 0;'));
      await gui_browser.waitFor(() => [...document.querySelectorAll('#command-window-messages .error')]
        .some(message => message.textContent.includes('sandbox cleanup error probe')), 'async error in the Command Window');
      await gui_browser.evaluate(() => jslab_web.main.command_window.clear());
    }
  });
  probe.command_window_errors_seen = gui_browser.command_window_errors.length;
  const unexpected = await probe._runSingleTest(new PRDC_JSLAB_TEST('passing assertions', () => true));
  assert.equal(unexpected.status, 'failed');
  assert.ok(/^Unexpected Command Window error:\nError: sandbox cleanup error probe\n/.test(unexpected.error.message), unexpected.error.message);
  const allowed = await probe._runSingleTest(new PRDC_JSLAB_TEST('expected cleanup error', () => true,
    { expected_command_errors: [expected] }));
  assert.equal(allowed.status, 'passed');
  const missing = await probe._runSingleTest(new PRDC_JSLAB_TEST('missing expected error', () => true,
    { expected_command_errors: [expected, /^Error: missing error probe$/] }));
  assert.equal(missing.status, 'failed');
  assert.ok(missing.error.message.startsWith('Missing expected Command Window errors:'), missing.error.message);
}, { tags: ['gui', 'web', 'integration'], expected_command_errors: Array(3).fill(/^Error: sandbox cleanup error probe\n/) });
