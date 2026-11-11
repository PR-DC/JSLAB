/**
 * @file Original-source diagnostics in the normal browser iframe runtime
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { webTest } = require('./gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;
if(!global.gui_browser) return;

webTest(tests, 'normal browser runtime reports nested script runtime and selected-line syntax errors', async () => {
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

webTest(tests, 'normal browser primitive and async errors have structured diagnostics and recover cleanly', async () => {
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
