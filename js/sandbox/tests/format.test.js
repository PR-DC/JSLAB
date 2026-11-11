/**
 * @file JSLAB format submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { PRDC_JSLAB_LIB_FORMAT } = require('../format');
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

tests.add('console values preserve cyclic and repeated object identities without invoking getters', function(assert) {
  var format = new PRDC_JSLAB_LIB_FORMAT({});
  var getter_calls = 0;
  var shared = { value: 42 };
  var root = { first: shared, second: shared };
  root.self = root;
  Object.defineProperty(root, 'computed', {
    enumerable: true,
    get: function() {
      getter_calls++;
      return 7;
    }
  });

  var remote = format._consoleValue(root);
  var page = format._consoleProperties(remote.object_id);
  var by_name = Object.fromEntries(page.properties.map(function(property) {
    return [property.name, property];
  }));

  assert.equal(page.success, true);
  assert.equal(by_name.first.value.object_id, by_name.second.value.object_id);
  assert.equal(by_name.self.value.object_id, remote.object_id);
  assert.equal(by_name.computed.accessor, true);
  assert.equal(getter_calls, 0);
}, { tags: ['unit', 'format'] });

tests.add('console property expansion pages large objects instead of serializing them recursively', function(assert) {
  var format = new PRDC_JSLAB_LIB_FORMAT({});
  var value = Array.from({ length: 250 }, function(_item, index) { return index; });
  var remote = format._consoleValue(value);
  var first = format._consoleProperties(remote.object_id, 0, 100);
  var second = format._consoleProperties(remote.object_id, first.next_offset, 100);

  assert.equal(first.properties.length, 100);
  assert.equal(first.next_offset, 100);
  assert.equal(second.properties[0].name, '100');
  assert.equal(second.next_offset, 200);
}, { tags: ['unit', 'format'] });

tests.add('console accessors run only after an explicit accessor request', function(assert) {
  var calls = 0;
  var value = {};
  Object.defineProperty(value, 'answer', {
    enumerable: true,
    get: function() { calls++; return 42; }
  });
  var format = new PRDC_JSLAB_LIB_FORMAT({});
  var remote = format._consoleValue(value);
  var page = format._consoleProperties(remote.object_id);
  assert.equal(calls, 0);
  assert.equal(page.properties[0].accessor, true);
  var result = format._consoleAccessor(remote.object_id, 'answer');
  assert.equal(result.success, true);
  assert.equal(result.value.description, '42');
  assert.equal(calls, 1);
}, { tags: ['unit', 'format'] });

tests.add('safeStringify distinguishes repeated references from cycles and does not mutate depth metadata', function(assert) {
  var format = new PRDC_JSLAB_LIB_FORMAT({});
  var shared = { value: 1 };
  var root = { first: shared, second: shared };
  root.self = root;
  format._setSafeStringifyDepth(root, 4);

  var text = format.safeStringify(root);
  var parsed = JSON.parse(text);

  assert.equal(parsed.first.value, 1);
  assert.equal(parsed.second.value, 1);
  assert.equal(parsed.self, '[Circular *$]');
  assert.equal(Object.prototype.hasOwnProperty.call(root, '_safeStringifyDepth'), false);
}, { tags: ['unit', 'format'] });

tests.add('stringify uses the shared safe serializer for cyclic values and BigInt', function(assert) {
  var format = new PRDC_JSLAB_LIB_FORMAT({});
  var value = { count: 3n };
  value.self = value;
  var parsed = JSON.parse(format.stringify(value));

  assert.equal(parsed.count, '3n');
  assert.equal(parsed.self, '[Circular *$]');
}, { tags: ['unit', 'format'] });

tests.add('safeStringify does not invoke accessor-based custom formatters', function(assert) {
  var format = new PRDC_JSLAB_LIB_FORMAT({});
  var calls = 0;
  var value = { normal: 1 };
  Object.defineProperty(value, 'toPrettyString', {
    get: function() { calls++; return function() { return 'unsafe'; }; }
  });

  var parsed = JSON.parse(format.safeStringify(value, 3, false));

  assert.equal(calls, 0);
  assert.equal(parsed.normal, 1);
  assert.equal(parsed.toPrettyString, '[Getter]');
}, { tags: ['unit', 'format'] });

exports.MODULE_TESTS = tests;
