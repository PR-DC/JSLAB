/**
 * @file Renderer entry for GUI interaction tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for dev run gui tests renderer.
 */
class PRDC_JSLAB_DEV_RUN_GUI_TESTS_RENDERER {
  /**
   * Runs.
   * @param {*} args Args.
   */
  static async run(args) {
    var output = [];
    var original_log = console.log;
    console.log = function(...items) {
      const message = items.join(' ');
      output.push(message);
      if(/^\s*(Running|\[\d*0\/|Summary)/.test(message)) {
        ipcRenderer.send('gui-test-progress', message);
      }
    };
    try {
      global.app_path = require('path').resolve(__dirname, '..', '..');
      global.process_arguments = ['gui-tests', ...args];
      global.__JSLAB_GUI_COMPONENT__ = true;
      require('./gui-test-coverage').inventoryDesktop();
      const { PRDC_JSLAB_TESTER } = require('../other-shared/tester');
      // Select GUI modules before requiring them; ordinary unit modules may initialize native services.
      /**
       * Class for gui tester.
       */
      class PRDC_JSLAB_GUI_TESTER extends PRDC_JSLAB_TESTER {
      /**
       * Handles scan for test modules.
       * @param {*} folder Folder.
       */
        _scanForTestModules(folder) {
          return super._scanForTestModules(folder).filter(filename => require('path').basename(filename).startsWith('gui-'));
        }
      }
      var summary = { total: 0, passed: 0, failed: 0, skipped: 0 };
      for(const folder of ['main/tests', 'editor/tests', 'simulate/tests', 'windows/tests', 'latex-editor/tests', 'presentation-editor/tests']) {
        var result = await new PRDC_JSLAB_GUI_TESTER(folder, { include_tags: ['gui'], exclude_tags: ['unit'] }).runTests();
        for(const key of ['total', 'passed', 'failed', 'skipped']) {
          summary[key] += Number(result[key] || 0);
        }
      }
      var handlers = require('./gui-test-coverage');
      handlers.writeReport(require('path').join(global.app_path, 'temp/gui-handler-coverage-electron.json'));
      var report = handlers.snapshot();
      console.log('Component handlers invoked: ' + report.covered + '/' + report.total);
      if(!args.some(arg => arg.startsWith('--test-')) && report.missing.length) {
        throw new Error('Uncovered Electron handlers: ' + report.missing.map(row => row.id).join(', '));
      }
      if(summary.total === 0) {
        throw new Error('No GUI tests matched the requested filters.');
      }
      ipcRenderer.send('gui-test-result', { ...summary, output: output.join('\n') });
    } catch(err) {
      ipcRenderer.send('gui-test-result', { error: String(err.stack || err),
        output: output.join('\n') + '\n' + String(err.stack || err) });
    } finally {
      console.log = original_log;
    }
  }
}


const { ipcRenderer } = require('electron');

exports.run = PRDC_JSLAB_DEV_RUN_GUI_TESTS_RENDERER.run;
