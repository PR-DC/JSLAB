/**
 * @file Shared safe value serializer tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../tester');
const { normalizeValue, safeStringify } = require('../value-serializer');
const webUtil = require('../../web/shims/util');
var tests = new PRDC_JSLAB_TESTS();

tests.add('value serializer distinguishes repeated references from ancestor cycles', function(assert) {
  var shared = { value: 42 };
  var root = { first: shared, second: shared };
  root.self = root;
  var parsed = JSON.parse(safeStringify(root));

  assert.equal(parsed.first.value, 42);
  assert.equal(parsed.second.value, 42);
  assert.equal(parsed.self, '[Circular *$]');
}, { tags: ['unit', 'shared', 'serializer'] });

tests.add('value serializer reports accessors without invoking getters', function(assert) {
  var calls = 0;
  var value = {};
  Object.defineProperty(value, 'computed', {
    enumerable: true,
    get: function() { calls++; return 7; },
    set: function() {}
  });
  Object.defineProperty(value, 'writeOnly', { set: function() {} });

  var parsed = JSON.parse(safeStringify(value));

  assert.equal(parsed.computed, '[Getter/Setter]');
  assert.equal(parsed.writeOnly, '[Setter]');
  assert.equal(calls, 0);
}, { tags: ['unit', 'shared', 'serializer'] });

tests.add('value serializer preserves unsupported JSON primitives as readable values', function(assert) {
  var parsed = JSON.parse(safeStringify({
    bigint: 12n,
    missing: undefined,
    nan: NaN,
    infinite: Infinity,
    symbol: Symbol('sample'),
    fun: function named() {}
  }));

  assert.equal(parsed.bigint, '12n');
  assert.equal(parsed.missing, '[undefined]');
  assert.equal(parsed.nan, 'NaN');
  assert.equal(parsed.infinite, 'Infinity');
  assert.equal(parsed.symbol, 'Symbol(sample)');
  assert.equal(parsed.fun, '[Function: named]');
}, { tags: ['unit', 'shared', 'serializer'] });

tests.add('value serializer bounds arrays properties strings and depth', function(assert) {
  var value = { text: 'abcdefghij', nested: { child: { value: 1 } }, a: 1, b: 2, c: 3 };
  var normalized = normalizeValue(value, {
    max_depth: 1,
    max_properties: 4,
    max_string_length: 8,
    max_array_length: 2
  });
  var array = normalizeValue([1, 2, 3, 4], { max_array_length: 2 });

  assert.ok(normalized.text.includes('truncated'));
  assert.ok(String(normalized.nested.child).includes('Object'));
  assert.ok(Object.prototype.hasOwnProperty.call(normalized, '…'));
  assert.equal(array.length, 3);
  assert.ok(array[2].includes('2 more items'));
}, { tags: ['unit', 'shared', 'serializer'] });

tests.add('value serializer escapes the final HTML output only when requested', function(assert) {
  var plain = safeStringify({ html: '<script>' });
  var escaped = safeStringify({ html: '<script>' }, { escape_html: true });

  assert.ok(plain.includes('<script>'));
  assert.ok(escaped.includes('&lt;script&gt;'));
  assert.equal(escaped.includes('<script>'), false);
}, { tags: ['unit', 'shared', 'serializer'] });

tests.add('web util.inspect uses the shared serializer for cyclic objects', function(assert) {
  var value = { count: 1n };
  value.self = value;
  var text = webUtil.inspect(value, { compact: true });

  assert.ok(text.includes('1n'));
  assert.ok(text.includes('[Circular *$]'));
}, { tags: ['unit', 'shared', 'serializer'] });

exports.MODULE_TESTS = tests;
