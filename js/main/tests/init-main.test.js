/**
 * @file JSLAB main init tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function waitTick() {
  return new Promise(function(resolve) {
    setTimeout(resolve, 0);
  });
}

function runInitMain(test_mode) {
  var source = fs.readFileSync(path.join(__dirname, '..', 'init-main.js'), 'utf8');
  var records = {
    language_ctor: 0,
    win_ctor: 0,
    on_ready: 0,
    tester_ctor_arg: null,
    tester_runs: 0,
    logger_file: null,
    suite_reports: []
  };

  var context = {
    module: { exports: {} },
    exports: {},
    process: {
      argv: ['node', '--app-path=C:\\Electron\\JSLAB\\js', '--packed=false']
    },
    document: {},
    console: console,
    ready: function(cb) { cb(); },
    $: function(arg) {
      return {
        ready: function(cb) {
          cb();
        }
      };
    },
    require: function(module_path) {
      if(module_path === 'electron') {
        return {
          ipcRenderer: {
            sendSync: function() {
              return 'test.log';
            },
            send: function(channel, payload) {
              records.suite_reports.push({
                channel: channel,
                payload: payload
              });
            }
          }
        };
      }
      if(module_path === '../js/shared/helper.js') {
        return {};
      }
      if(module_path === '../js/shared/init-config.js') {
        context.config = { TEST: !!test_mode };
        return {};
      }
      if(module_path === '../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER') {
        return {
          PRDC_APP_LOGGER: class {
            constructor(file) {
              records.logger_file = file;
            }
          }
        };
      }
      if(module_path === '../js/shared/language') {
        return {
          PRDC_JSLAB_LANGUAGE: class {
            constructor() {
              records.language_ctor += 1;
            }
          }
        };
      }
      if(module_path === '../js/main/win-main') {
        return {
          PRDC_JSLAB_WIN_MAIN: class {
            constructor() {
              records.win_ctor += 1;
            }
            onReady() {
              records.on_ready += 1;
            }
          }
        };
      }
      if(module_path === '../js/shared/tester.js') {
        return {
          PRDC_JSLAB_TESTER: class {
            constructor(folder) {
              records.tester_ctor_arg = folder;
            }
            runTests() {
              records.tester_runs += 1;
              return Promise.resolve({ total: 0, failed: 0 });
            }
          }
        };
      }
      throw new Error('Unexpected require path: ' + module_path);
    }
  };

  context.global = context;
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: 'init-main.js' });
  return { records, context };
}

tests.add('init-main creates language/main window and runs onReady callback', function(assert) {
  var run = runInitMain(false);
  assert.equal(run.records.language_ctor, 1);
  assert.equal(run.records.win_ctor, 1);
  assert.equal(run.records.on_ready, 1);
  assert.equal(run.records.logger_file, 'test.log');
  assert.equal(run.records.tester_runs, 0);
}, { tags: ['unit', 'main', 'init'] });

tests.add('init-main launches tester when TEST mode is enabled', async function(assert) {
  var run = runInitMain(true);
  await waitTick();
  assert.equal(run.records.tester_ctor_arg, 'main');
  assert.equal(run.records.tester_runs, 1);
  assert.equal(run.records.suite_reports.length, 1);
  assert.equal(run.records.suite_reports[0].channel, 'JSLAB_TEST_RESULT');
  assert.equal(run.records.suite_reports[0].payload.folder, 'main');
}, { tags: ['unit', 'main', 'init'] });

exports.MODULE_TESTS = tests;
