/**
 * @file Runs JSLAB web GUI tests in a real isolated Chrome/Chromium instance
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const { startBrowser } = require('./gui-test-browser');
const root = path.resolve(__dirname, '..', '..');

async function run() {
  var build = cp.spawnSync(process.execPath, [path.join(__dirname, 'build-web.js'), '--gui-test-build'], { cwd: root, encoding: 'utf8', windowsHide: true });
  if(build.status !== 0) throw new Error(build.stderr || build.stdout);
  var session = await startBrowser(path.join(root, 'temp/gui-web-build'));
  global.gui_browser = session.browser;
  global.gui_base = session.base;
  global.gui_hit_archive = [];
  global.app_path = root;
  global.process_arguments = ['gui-web-tests', ...process.argv.slice(2).filter(arg => arg.startsWith('--test-'))];
  try {
    await gui_browser.navigate(gui_base);
    await gui_browser.waitFor(() => document.body.dataset.jslabWebReady === 'true' || document.body.dataset.jslabWebReady === 'false', 'web bootstrap');
    var boot = await gui_browser.evaluate(() => ({ ...document.body.dataset }));
    if(boot.jslabWebReady !== 'true') throw new Error('Web bootstrap failed: ' + JSON.stringify(boot));
    const { PRDC_JSLAB_TESTER } = require('../shared/tester');
    var summary = await new PRDC_JSLAB_TESTER('web/tests').runTests();
    var report = JSON.parse(fs.readFileSync(path.join(root, 'temp/gui-handler-inventory-web.json'), 'utf8'));
    var hits = new Set([...gui_hit_archive, ...await gui_browser.evaluate(() => globalThis.__JSLAB_GUI_HITS__)]);
    report.handlers.forEach(row => { row.covered = hits.has(row.id); });
    report.covered = report.handlers.filter(row => row.covered).length;
    report.missing = report.handlers.filter(row => !row.covered);
    fs.writeFileSync(path.join(root, 'temp/gui-handler-coverage-web.json'), JSON.stringify(report, null, 2));
    console.log('Web handlers invoked: ' + report.covered + '/' + report.total);
    if(gui_browser.errors.length) throw new Error('Unexpected browser exceptions: ' + JSON.stringify(gui_browser.errors));
    if(!process.argv.some(arg => arg.startsWith('--test-')) && report.missing.length) {
      console.error('Uncovered web handlers: ' + report.missing.map(row => row.id).join(', '));
      process.exitCode = 1;
    }
    if(!summary.total || summary.failed) process.exitCode = 1;
  } finally { await session.cleanup(); }
}
run().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
