/**
 * @file Shared text encoding contracts for UI, serializer and search consumers
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../tester');
const { PRDC_JSLAB_TEXT } = require('../text');
const { safeStringify } = require('../value-serializer');
var tests = new PRDC_JSLAB_TESTS();

tests.add('shared HTML encoding preserves the distinct text and attribute contracts', function(assert) {
  const input = '<tag title="x">&\'`=/';
  assert.equal(PRDC_JSLAB_TEXT.escapeHTML(input), '&lt;tag title=&quot;x&quot;&gt;&amp;&#39;`=/');
  assert.equal(PRDC_JSLAB_TEXT.escapeHTML(input, 'text'), '&lt;tag title="x"&gt;&amp;\'`=/');
  assert.equal(PRDC_JSLAB_TEXT.escapeHTML(input, 'attribute'), '&lt;tag title&#x3D;&quot;x&quot;&gt;&amp;&#39;&#x60;&#x3D;&#x2F;');
  assert.equal(PRDC_JSLAB_TEXT.escapeHTML(0), '0');
  assert.equal(PRDC_JSLAB_TEXT.escapeHTML(null), 'null');
  assert.ok(safeStringify('<x>', { escape_html: true }).includes('&lt;x&gt;'));
}, { tags: ['unit', 'shared', 'text'] });

tests.add('literal regex escaping matches metacharacters and Unicode without broadening a search', function(assert) {
  const text = 'a[b].*+?^${x}()|\\Č';
  const pattern = new RegExp('^' + PRDC_JSLAB_TEXT.escapeRegExp(text) + '$');
  assert.equal(pattern.test(text), true);
  assert.equal(pattern.test(text + 'x'), false);
  assert.equal(pattern.test('ab'), false);
}, { tags: ['unit', 'shared', 'text'] });

exports.MODULE_TESTS = tests;
