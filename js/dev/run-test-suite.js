/**
 * @file Runs one JSLAB test suite folder in a standalone Node process
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

"use strict";

/**
 * Class for dev run test suite operations.
 */
class PRDC_JSLAB_DEV_RUN_TEST_SUITE_HELPER {

  /**
   * Returns arg value.
   * @param {string} name Name.
   * @param {*} fallback Fallback.
   */
  static getArgValue(name, fallback) {
    var prefix = '--' + name + '=';
    var found = process.argv.find(function(arg) {
      return String(arg).startsWith(prefix);
    });
    if(!found) {
      return fallback;
    }
    return found.slice(prefix.length);
  }

  /**
   * Runs.
   */
  static async run() {
    var app_root = path.resolve(__dirname, '..', '..');
    var folder = PRDC_JSLAB_DEV_RUN_TEST_SUITE_HELPER.getArgValue('folder', '');
    if(!folder.length) {
      throw new Error('Missing --folder=<suite>');
    }

    global.app_path = app_root;
    global.process_arguments = ['node'].concat(process.argv.slice(2).filter(function(arg) {
      return String(arg).startsWith('--test-');
    }));

    const { PRDC_JSLAB_TESTER } = require(path.join(app_root, 'js', 'other-shared', 'tester.js'));
    var tester = new PRDC_JSLAB_TESTER(folder);
    var summary = await tester.runTests();

    var failed = Number(summary && summary.failed);
    if(!isFinite(failed)) {
      failed = 0;
    }
    process.exitCode = failed > 0 ? 1 : 0;
  }
}


const path = require('path');


PRDC_JSLAB_DEV_RUN_TEST_SUITE_HELPER.run().catch(function(err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
