/**
 * @file Browser settings and OPFS persistence across a real page reload
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) { exports.MODULE_TESTS = tests; return; }
tests.add('web page reload restores settings and actual OPFS document content', async function(assert) {
  await gui_browser.evaluate(async() => {
    document.getElementById('settings-menu').click();
    document.getElementById('history-max-input').value = '41';
    document.getElementById('settings-apply-button').click();
    jslab_web.fs.writeTextFileSync('/workspace/gui-persistence.jsl', '// survives browser reload');
  });
  gui_hit_archive.push(...await gui_browser.evaluate(() => globalThis.__JSLAB_GUI_HITS__));
  await gui_browser.send('Page.reload', { ignoreCache: true });
  await gui_browser.waitFor(() => document.body &&
    document.body.dataset.jslabWebReady === 'true', 'reload bootstrap');
  var state = await gui_browser.evaluate(() => ({
    history: jslab_web.history_max,
    text: jslab_web.fs.readTextFileSync('/workspace/gui-persistence.jsl')
  }));
  assert.equal(state.history, 41);
  assert.equal(state.text, '// survives browser reload');
}, { tags: ['gui', 'web', 'integration'], timeout_ms: 20000 });
exports.MODULE_TESTS = tests;
