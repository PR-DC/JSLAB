/**
 * @file JSLAB command-line option and input tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const { parseOptions } = require('../options');
const { isIncomplete } = require('../terminal');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('CLI separates script arguments and preserves quoted code and paths', function(assert) {
  var options = parseOptions(['--cwd', 'temp', 'test script.jsl', '--', '--flag', 'two words']);
  assert.equal(options.cwd, path.resolve('temp'));
  assert.equal(options.file, path.resolve('test script.jsl'));
  assert.deepEqual(options.argv, ['--flag', 'two words']);
  assert.equal(parseOptions(['-e', "disp('hello'); 6 * 7", '--json']).code, "disp('hello'); 6 * 7");
  assert.equal(parseOptions(['-']).file, '-');
  assert.equal(parseOptions(['trapz([0,1,2])']).file, path.resolve('trapz([0,1,2])'));
  assert.equal(parseOptions(['analysis.JSL']).file, path.resolve('analysis.JSL'));
  assert.equal(parseOptions(['--batch', 'analysis.jsl']).batch, true);
  assert.throws(function() { parseOptions(['one.jsl', 'two.jsl']); }, /one script/);
  assert.throws(function() { parseOptions(['-e']); }, /Missing value/);
  assert.throws(function() { parseOptions(['--timeout', '0']); }, /positive/);
  assert.throws(function() { parseOptions(['--timeout', 'NaN']); }, /positive/);
  assert.throws(function() { parseOptions(['script.jsl', '-e', '1']); }, /Choose/);
  assert.throws(function() { parseOptions(['--unknown']); }, /Unknown option/);
}, { tags: ['unit', 'cli'] });

tests.add('CLI multiline detection distinguishes unfinished input and syntax errors', function(assert) {
  assert.equal(isIncomplete('for(var i = 0; i < 2; i++) {\n'), true);
  assert.equal(isIncomplete('var value =\n'), true);
  assert.equal(isIncomplete('`unfinished'), true);
  assert.equal(isIncomplete('/* unfinished'), true);
  assert.equal(isIncomplete('var = ;'), false);
  assert.equal(isIncomplete('await Promise.resolve(42)'), false);
  assert.equal(isIncomplete('for(var i = 0; i < 2; i++) {\n disp(i);\n}'), false);
}, { tags: ['unit', 'cli'] });

exports.MODULE_TESTS = tests;
