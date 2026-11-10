/**
 * @file Real browser bootstrap and storage integration checks
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) { exports.MODULE_TESTS = tests; return; }
tests.add('web boots without Node integration and uses persistent browser storage', async function(assert) {
  var result = await gui_browser.evaluate(() => ({
    require: typeof require, node: !!(globalThis.process && globalThis.process.versions && globalThis.process.versions.node),
    ready: document.body.dataset.jslabWebReady, mode: jslab_web.fs.mode,
    sandbox: !!jslab_web.sandbox_api, version: jslab_web.getRuntimeInfo()
  }));
  assert.equal(result.require, 'undefined'); assert.equal(result.node, false);
  assert.equal(result.ready, 'true'); assert.equal(result.mode, 'opfs'); assert.equal(result.sandbox, true);
}, { tags: ['gui', 'web', 'integration'] });
exports.MODULE_TESTS = tests;
