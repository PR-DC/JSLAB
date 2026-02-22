/**
 * @file JSLAB format submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('ensureUniqueNames accepts unique values', function(assert) {
  assert.equal(jsl.format.ensureUniqueNames(['A', 'B', 'C']), true);
}, { tags: ['unit', 'format'] });

tests.add('ensureUniqueNames throws on duplicate values', function(assert) {
  assert.throws(function() {
    jsl.format.ensureUniqueNames(['A', 'B', 'A']);
  }, /Duplicate name/);
}, { tags: ['unit', 'format'] });

tests.add('compareMixedValues handles null and numbers', function(assert) {
  assert.ok(jsl.format.compareMixedValues(null, 10) < 0);
  assert.ok(jsl.format.compareMixedValues(3, 2) > 0);
  assert.equal(jsl.format.compareMixedValues(5, 5), 0);
}, { tags: ['unit', 'format'] });

tests.add('buildSortedIndices returns stable order', function(assert) {
  var values = ['b', 'a', 'a', 'c'];
  var idx = jsl.format.buildSortedIndices(values.length, function(i) {
    return values[i];
  }, 'asc');
  assert.deepEqual(idx, [1, 2, 0, 3]);
}, { tags: ['unit', 'format'] });

tests.add('csvEscapeCell escapes quote and delimiter', function(assert) {
  assert.equal(jsl.format.csvEscapeCell('a,b'), '"a,b"');
  assert.equal(jsl.format.csvEscapeCell('a"b'), '"a""b"');
}, { tags: ['unit', 'format'] });

tests.add('parseCsvLine parses quoted delimiters', function(assert) {
  var out = jsl.format.parseCsvLine('1,"a,b",3');
  assert.deepEqual(out, ['1', 'a,b', '3']);
}, { tags: ['unit', 'format'] });

tests.add('parseCsvText parses CRLF text into rows', function(assert) {
  var out = jsl.format.parseCsvText('A,B\r\n1,2\r\n3,4\r\n');
  assert.deepEqual(out, [['A', 'B'], ['1', '2'], ['3', '4']]);
}, { tags: ['unit', 'format'] });

tests.add('detectDelimiter finds semicolon delimiter', function(assert) {
  var d = jsl.format.detectDelimiter('A;B;C\n1;2;3\n');
  assert.equal(d, ';');
}, { tags: ['unit', 'format'] });

tests.add('parseCsvScalar converts numbers booleans and missing tokens', function(assert) {
  assert.equal(jsl.format.parseCsvScalar('42'), 42);
  assert.equal(jsl.format.parseCsvScalar('true'), true);
  assert.equal(jsl.format.parseCsvScalar('N/A'), null);
}, { tags: ['unit', 'format'] });

tests.add('parseCsvScalar converts date strings when enabled', function(assert) {
  var out = jsl.format.parseCsvScalar('2024-01-20T10:30:00Z');
  assert.ok(out instanceof Date);
  assert.equal(Number.isNaN(out.getTime()), false);
}, { tags: ['unit', 'format'] });

tests.add('aggregateValues supports numeric aggregations', function(assert) {
  var values = [1, 2, null, NaN, 3];
  assert.equal(jsl.format.aggregateValues(values, 'count'), 3);
  assert.equal(jsl.format.aggregateValues(values, 'sum'), 6);
  assert.equal(jsl.format.aggregateValues(values, 'mean'), 2);
  assert.equal(jsl.format.aggregateValues(values, 'min'), 1);
  assert.equal(jsl.format.aggregateValues(values, 'max'), 3);
}, { tags: ['unit', 'format'] });

tests.add('isMissingValue identifies null undefined NaN and empty string', function(assert) {
  assert.equal(jsl.format.isMissingValue(null), true);
  assert.equal(jsl.format.isMissingValue(undefined), true);
  assert.equal(jsl.format.isMissingValue(NaN), true);
  assert.equal(jsl.format.isMissingValue(''), true);
  assert.equal(jsl.format.isMissingValue(0), false);
}, { tags: ['unit', 'format'] });

exports.MODULE_TESTS = tests;
