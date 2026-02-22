/**
 * @file JSLAB shared init-config tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('./tester');
var tests = new PRDC_JSLAB_TESTS();

function runInitConfig(args) {
  var source = fs.readFileSync(path.join(__dirname, 'init-config.js'), 'utf8');
  var logs = [];

  class TEST_APP_CONFIG {
    constructor() {
      this.DEBUG = false;
      this.TEST = false;
      this.SIGN_BUILD = false;
      this.NESTED = { VALUE: 1 };
    }
  }

  var context = {
    module: { exports: {} },
    exports: {},
    require: function(module_path) {
      if(module_path === '../../config/config.js') {
        return { PRDC_APP_CONFIG: TEST_APP_CONFIG };
      }
      throw new Error('Unexpected require path: ' + module_path);
    },
    console: {
      error: function(msg) {
        logs.push(String(msg));
      }
    }
  };
  context.global = context;
  context.globalThis = context;
  context.global.process_arguments = args || [];

  vm.runInNewContext(source, context, { filename: 'init-config.js' });

  return {
    config: context.global.config,
    logs: logs
  };
}

tests.add('init-config applies command-line switches onto config proxy', function(assert) {
  var run = runInitConfig(['node', '--debug-app', '--test-app', '--sign-build']);
  assert.equal(run.config.DEBUG, true);
  assert.equal(run.config.TEST, true);
  assert.equal(run.config.SIGN_BUILD, true);
}, { tags: ['unit', 'shared', 'config'] });

tests.add('init-config enables TEST flag for --auto-test-app', function(assert) {
  var run = runInitConfig(['node', '--auto-test-app']);
  assert.equal(run.config.TEST, true);
}, { tags: ['unit', 'shared', 'config'] });

tests.add('config proxy logs unknown reads and writes once per property', function(assert) {
  var run = runInitConfig(['node']);
  void run.config.UNKNOWN_FLAG;
  void run.config.UNKNOWN_FLAG;
  run.config.NEW_FLAG = 1;
  run.config.NEW_FLAG = 2;
  void run.config.NESTED.UNKNOWN_NESTED;
  void run.config.NESTED.UNKNOWN_NESTED;

  var read_unknown = run.logs.filter(function(msg) {
    return msg.includes("READ unknown property 'UNKNOWN_FLAG'");
  }).length;
  var write_unknown = run.logs.filter(function(msg) {
    return msg.includes("WRITE unknown property 'NEW_FLAG'");
  }).length;
  var read_nested = run.logs.filter(function(msg) {
    return msg.includes("READ unknown property 'NESTED.UNKNOWN_NESTED'");
  }).length;

  assert.equal(read_unknown, 1);
  assert.equal(write_unknown, 1);
  assert.equal(read_nested, 1);
}, { tags: ['unit', 'shared', 'config'] });

exports.MODULE_TESTS = tests;
