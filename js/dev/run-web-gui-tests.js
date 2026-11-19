/**
 * @file Runs JSLAB Web GUI tests in an isolated Electron window
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for dev run web gui tests operations.
 */
class PRDC_JSLAB_DEV_RUN_WEB_GUI_TESTS_HELPER {

  /**
   * Runs.
   */
  static async run() {
    var build = cp.spawnSync(process.execPath, [path.join(__dirname, 'build-web.js'), '--gui-test-build'], { cwd: root, encoding: 'utf8', windowsHide: true });
    if(build.status !== 0) {
      throw new Error(build.stderr || build.stdout);
    }
    var session = await startBrowser(path.join(root, 'temp/gui-web-build'));
    global.gui_browser = session.browser;
    global.gui_base = session.base;
    global.gui_requests = session.requests;
    global.gui_hit_archive = [];
    global.app_path = root;
    global.process_arguments = ['gui-web-tests', ...process.argv.slice(2).filter(arg => arg.startsWith('--test-'))];
    try {
      await gui_browser.watchCommandWindowErrors();
      await gui_browser.navigate(gui_base);
      await gui_browser.waitFor(() => document.body && (document.body.dataset.jslabWebReady === 'true' || document.body.dataset.jslabWebReady === 'false'), 'web startup');
      var boot = await gui_browser.evaluate(() => ({ ...document.body.dataset }));
      if(boot.jslabWebReady !== 'true') {
        throw new Error('Web startup failed: ' + JSON.stringify(boot));
      }
      const { PRDC_JSLAB_GUI_TESTER } = require('./gui-test-lifecycle');
      let previous_module;
      const tester = new PRDC_JSLAB_GUI_TESTER('backend-web/tests', {}, {
        clients: () => [gui_browser],
        command_window: gui_browser,
        before: async test => {
          if(previous_module && test.module_path !== previous_module) await this.closeScenarioWindows(true);
          previous_module = test.module_path;
        },
        after: async () => {
          try {
            await this.closeScenarioWindows(false);
          } finally {
            await gui_browser.restoreViewport();
          }
        }
      });
      var summary = await tester.runTests();
      var report = JSON.parse(fs.readFileSync(path.join(root, 'temp/gui-handler-inventory-web.json'), 'utf8'));
      var hits = new Set([...gui_hit_archive, ...await gui_browser.evaluate(() => globalThis.__JSLAB_GUI_HITS__)]);
      report.handlers.forEach(row => {
        row.covered = hits.has(row.id);
      });
      report.covered = report.handlers.filter(row => row.covered).length;
      report.missing = report.handlers.filter(row => !row.covered);
      // The component suite covers common controllers; this suite gates browser host adapters and inline document surfaces.
      report.adapter_handlers = report.handlers.filter(row => row.file.startsWith('js/backend-web/') || row.file === 'js/presentation-editor/presentation-editor-inline.js');
      report.adapter_missing = report.adapter_handlers.filter(row => !row.covered);
      report.adapter_covered = report.adapter_handlers.length - report.adapter_missing.length;
      fs.writeFileSync(path.join(root, 'temp/gui-handler-coverage-web.json'), JSON.stringify(report, null, 2));
      console.log('Browser adapter handlers invoked: ' + report.adapter_covered + '/' + report.adapter_handlers.length);
      console.log('Common UI handlers exercised in the browser: ' + (report.covered - report.adapter_covered));
      tester.checkRemainingCommandErrors();
      if(gui_browser.errors.length) {
        throw new Error('Unexpected browser exceptions: ' + JSON.stringify(gui_browser.errors));
      }
      if(!process.argv.some(arg => arg.startsWith('--test-')) && report.adapter_missing.length) {
        console.error('Uncovered browser adapter handlers: ' + report.adapter_missing.map(row => row.id).join(', '));
        process.exitCode = 1;
      }
      if(!summary.total || summary.failed) {
        process.exitCode = 1;
      }
    } finally {
      await session.cleanup();
    }
  }

  /**
   * Releases script windows between scenarios and feature windows between suites.
   * @param {boolean} all Whether the next test belongs to another suite.
   */
  static async closeScenarioWindows(all) {
    await gui_browser.waitFor(() => !jslab_web.main.evaluating && jslab_web.worker_debugger?.state !== 'running',
      'sandbox worker idle after the scenario', 20000);
    await gui_browser.evaluate(async all => {
      const app = jslab_web;
      const windows = app.window_manager;
      app.ui_sandbox_api?.stopAnimations();
      let removed = false;
      for(const [id, win] of windows.windows) {
        if(id === app.editor_window_id) {
          if(all) windows.minimize(id);
          continue;
        }
        if(!all && !/^(?:\d+|gui-figure.*|gui-serial)$/.test(id)) continue;
        removed = true;
        if(windows.close(id)) continue;
        const deadline = Date.now() + 5000;
        while(windows.windows.has(id)) {
          const document = win.iframe.contentDocument;
          if(document?.getElementById('close-dialog-cont')?.hidden === false) {
            document.getElementById('close-dialog-discard').click();
          }
          if(Date.now() >= deadline) throw Error('Test window did not close: ' + id);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }
      if(removed) await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, all);
  }
}

const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const { startBrowser } = require('./gui-test-browser');
const root = path.resolve(__dirname, '..', '..');


PRDC_JSLAB_DEV_RUN_WEB_GUI_TESTS_HELPER.run().catch(err => {
  console.error(err.stack || err);
  process.exitCode = 1;
});
