/**
 * @file JSLAB main window module tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();


var MODULE_EXPORTS = [
  ['../command-history', 'PRDC_JSLAB_COMMAND_HISTORY'],
  ['../command-window-diary', 'PRDC_JSLAB_COMMAND_WINDOW_DIARY'],
  ['../command-window-input', 'PRDC_JSLAB_COMMAND_WINDOW_INPUT'],
  ['../command-window-inspector', 'PRDC_JSLAB_COMMAND_WINDOW_INSPECTOR'],
  ['../command-window-messages', 'PRDC_JSLAB_COMMAND_WINDOW_MESSAGES'],
  ['../command-window-settings', 'PRDC_JSLAB_COMMAND_WINDOW_SETTINGS'],
  ['../command-window', 'PRDC_JSLAB_COMMAND_WINDOW'],
  ['../eval', 'PRDC_JSLAB_MAIN_EVAL'],
  ['../file-browser', 'PRDC_JSLAB_FILE_BROWSER'],
  ['../folder-navigation', 'PRDC_JSLAB_FOLDER_NAVIGATION'],
  ['../window-ui', 'PRDC_JSLAB_MAIN_WINDOW_UI'],
  ['../settings', 'PRDC_JSLAB_SETTINGS'],
  ['../main', 'PRDC_JSLAB_MAIN'],
  ['../workspace', 'PRDC_JSLAB_WORKSPACE']
];

tests.add('all main modules export their expected classes', function(assert) {
  PRDC_JSLAB_TESTS.ensureWritableAppData('main');
  PRDC_JSLAB_TESTS.assertModuleExports(assert, MODULE_EXPORTS, require);
}, { tags: ['unit', 'main', 'smoke'] });

exports.MODULE_TESTS = tests;
