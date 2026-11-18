/**
 * @file JSLAB native renderer entry point test fixture
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../other-shared/tester');

/**
 * Runs main and Editor entry points against the same isolated host contracts.
 */
class PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE {
  /**
   * Runs one renderer entry without native windows or persistent settings.
   * @param {string} feature Window feature name.
   * @param {boolean} test_mode Whether application tests are enabled.
   * @returns {Object} Captured calls and renderer globals.
   */
  static run(feature, test_mode) {
    const records = { language_ctor: 0, win_ctor: 0, on_ready: 0, tester_ctor_arg: null,
      tester_ctor_args: [], tester_runs: 0, logger_file: null, suite_reports: [] };
    const report = PRDC_JSLAB_TESTS.suiteReporter(records);
    const context = { module: { exports: {} }, exports: {}, console,
      process: { argv: ['node', '--app-path=C:\\Electron\\JSLAB\\js', '--packed=false'] }, document: {},
      ready: callback => callback(), $: () => ({ ready: callback => callback() }),
      require: module_path => {
        if(module_path === '../js/backend-electron/renderer') {
          return { PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER: class {
            /**
             * Captures the language initialization requested by the entry point.
             */
            createLanguage() {
              records.language_ctor++;
              return {};
            }
          } };
        }
        if(module_path === 'electron') {
          return { ipcRenderer: { sendSync: () => 'test.log', send: (channel, payload) => {
            records.suite_reports.push({ channel, payload });
          } } };
        }
        if(module_path === '../js/backend-electron/renderer-startup.js') {
          return { PRDC_JSLAB_ELECTRON_RENDERER_STARTUP: { reportTestSuiteResult: report } };
        }
        if(module_path === '../js/other-shared/init-config.js') {
          context.config = { TEST: !!test_mode };
          return {};
        }
        if(module_path === '../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER') {
          return { PRDC_APP_LOGGER: class {
            /**
             * Captures the renderer log destination.
             * @param {string} filename Log destination.
             */
            constructor(filename) {
              records.logger_file = filename;
            }
          } };
        }
        if(module_path === '../js/main/main' || module_path === '../js/editor/win-editor') {
          return { [feature === 'main' ? 'PRDC_JSLAB_MAIN' : 'PRDC_JSLAB_WIN_EDITOR']: class {
            /**
             * Captures construction of the common window controller.
             */
            constructor() {
              records.win_ctor++;
            }
            /**
             * Captures document readiness notification.
             */
            onReady() {
              records.on_ready++;
            }
          } };
        }
        if(module_path === '../js/other-shared/tester.js') {
          return { PRDC_JSLAB_TESTER: class {
            /**
             * Captures the selected module test folder.
             * @param {string} folder Test folder.
             */
            constructor(folder) {
              records.tester_ctor_arg = folder;
              records.tester_ctor_args.push(folder);
            }
            /**
             * Returns a completed module test run.
             * @returns {Promise<Object>} Test summary.
             */
            async runTests() {
              records.tester_runs++;
              return { total: 1, passed: 1, failed: 0, skipped: 0 };
            }
          } };
        }
        throw Error('Unexpected renderer fixture dependency: ' + module_path);
      }
    };
    context.global = context;
    const filename = path.resolve(__dirname, '../backend-electron/init-' + feature + '.js');
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
    return { records, context };
  }

  /**
   * Waits for asynchronous suite completion callbacks.
   * @returns {Promise<void>} Next event loop turn.
   */
  static waitTick() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}

exports.PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE = PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE;
