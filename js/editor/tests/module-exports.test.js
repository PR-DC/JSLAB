/**
 * @file JSLAB Editor module tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();


var MODULE_EXPORTS = [
  ['../editor', 'PRDC_JSLAB_EDITOR'],
  ['../script-manager', 'PRDC_JSLAB_EDITOR_SCRIPT_MANAGER'],
  ['../script', 'PRDC_JSLAB_EDITOR_SCRIPT'],
  ['../search-all', 'PRDC_JSLAB_EDITOR_SEARCH_ALL'],
  ['../symbol-input', 'PRDC_JSLAB_EDITOR_SYMBOL_INPUT'],
  ['../win-editor', 'PRDC_JSLAB_WIN_EDITOR']
];

tests.add('all editor modules export their expected classes', function(assert) {
  PRDC_JSLAB_TESTS.ensureWritableAppData('editor');
  PRDC_JSLAB_TESTS.assertModuleExports(assert, MODULE_EXPORTS, require);
}, { tags: ['unit', 'editor', 'smoke'] });

exports.MODULE_TESTS = tests;
