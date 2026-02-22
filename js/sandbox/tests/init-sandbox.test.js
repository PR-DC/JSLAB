/**
 * @file JSLAB init-sandbox smoke tests
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

function executeInitSandbox(options = {}) {
  var source = fs.readFileSync(path.join(__dirname, '..', 'init-sandbox.js'), 'utf8');
  var records = {
    language_ctor_arg: null,
    jsl_ctor_args: null,
    tester_ctor_arg: null,
    tester_runs: 0,
    console_errors: [],
    suite_reports: []
  };

  var context = {
    console: {
      error: function(err) {
        records.console_errors.push(err);
      }
    },
    process: {
      argv: [
        'node',
        'sandbox',
        '--app-path=C:\\Electron\\JSLAB\\js',
        '--packed=' + (options.packed === false ? 'false' : 'true')
      ]
    },
    require: function(module_path) {
      if(module_path === 'electron') {
        return {
          ipcRenderer: {
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
        return {};
      }
      if(module_path === '../js/shared/language') {
        return {
          PRDC_JSLAB_LANGUAGE: class {
            constructor(app_path) {
              records.language_ctor_arg = app_path;
            }
          }
        };
      }
      if(module_path === '../js/sandbox/jslab') {
        return {
          PRDC_JSLAB_LIB: class {
            constructor(app_path, packed) {
              records.jsl_ctor_args = [app_path, packed];
              this.config = { TEST: !!options.test_mode };
              this._console = {
                error: function(err) {
                  records.console_errors.push(err);
                }
              };
            }
          }
        };
      }
      if(module_path === '../js/shared/tester.js' ||
          /[\\/]js[\\/]shared[\\/]tester\.js$/i.test(module_path)) {
        return {
          PRDC_JSLAB_TESTER: class {
            constructor(folder) {
              records.tester_ctor_arg = folder;
            }

            runTests() {
              records.tester_runs += 1;
              if(options.reject_tests) {
                return Promise.reject(new Error('test failure'));
              }
              return Promise.resolve({ passed: 1 });
            }
          }
        };
      }
      throw new Error('Unexpected require path: ' + module_path);
    }
  };
  context.globalThis = context;

  vm.runInNewContext(source, context, { filename: 'init-sandbox.js' });
  return { context, records };
}

tests.add('init-sandbox builds language and jsl with parsed app-path/packed args', function(assert) {
  var run = executeInitSandbox({ test_mode: false, packed: true });

  assert.equal(run.records.language_ctor_arg, 'C:\\Electron\\JSLAB');
  assert.deepEqual(run.records.jsl_ctor_args, ['C:\\Electron\\JSLAB', true]);
  assert.equal(run.records.tester_runs, 0);
  assert.ok(run.context.language);
}, { tags: ['unit', 'init'] });

tests.add('init-sandbox launches tester when TEST mode is enabled', async function(assert) {
  var run = executeInitSandbox({ test_mode: true, packed: false });
  await waitTick();

  assert.equal(run.records.tester_ctor_arg, 'sandbox');
  assert.equal(run.records.tester_runs, 1);
  assert.deepEqual(run.records.jsl_ctor_args, ['C:\\Electron\\JSLAB', false]);
  assert.equal(run.records.suite_reports.length, 1);
  assert.equal(run.records.suite_reports[0].channel, 'JSLAB_TEST_RESULT');
  assert.equal(run.records.suite_reports[0].payload.folder, 'sandbox');
}, { tags: ['unit', 'init'] });

tests.add('init-sandbox reports tester failures through jsl console', async function(assert) {
  var run = executeInitSandbox({ test_mode: true, reject_tests: true });
  await waitTick();

  assert.equal(run.records.tester_runs, 1);
  assert.ok(run.records.console_errors.length > 0);
  assert.ok(String(run.records.console_errors[0]).toLowerCase().includes('test failure'));
  assert.equal(run.records.suite_reports.length, 1);
  assert.equal(run.records.suite_reports[0].payload.folder, 'sandbox');
  assert.ok(String(run.records.suite_reports[0].payload.error).toLowerCase().includes('test failure'));
}, { tags: ['unit', 'init'] });

exports.MODULE_TESTS = tests;
