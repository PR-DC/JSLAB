/**
 * @file JSLAB code doc-hover tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_CODE_DOC_HOVER } = require('./doc-hover');
const { PRDC_JSLAB_TESTS } = require('../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('_extractIdentifierFromLine returns identifier and parent around dot access', function(assert) {
  var hover = Object.create(PRDC_JSLAB_CODE_DOC_HOVER.prototype);
  var out = hover._extractIdentifierFromLine('math.sin(angle)', 12, 6);

  assert.equal(out.identifier, 'sin');
  assert.equal(out.parent, 'math');
  assert.equal(out.start, 5);
  assert.equal(out.end, 8);
  assert.equal(out.line, 12);
}, { tags: ['unit', 'code', 'doc-hover'] });

tests.add('_extractIdentifierFromLine returns false for invalid hover positions', function(assert) {
  var hover = Object.create(PRDC_JSLAB_CODE_DOC_HOVER.prototype);
  assert.equal(hover._extractIdentifierFromLine('x + y', 0, 2), false);
  assert.equal(hover._extractIdentifierFromLine('', 0, 0), false);
}, { tags: ['unit', 'code', 'doc-hover'] });

tests.add('_findEntries prioritizes parent category and function kind', function(assert) {
  var old_by_name = PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name;
  var old_by_name_lower = PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name_lower;
  try {
    PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name = {
      sin: [
        { name: 'sin', category: 'math', kind: 'function', scope: 'lib' },
        { name: 'sin', category: 'math', kind: 'member', scope: 'lib' },
        { name: 'sin', category: 'geometry', kind: 'function', scope: 'lib' }
      ]
    };
    PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name_lower = {
      sin: PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name.sin
    };

    var hover = Object.create(PRDC_JSLAB_CODE_DOC_HOVER.prototype);
    hover.max_entries = 2;
    var entries = hover._findEntries('SIN', 'math');

    assert.equal(entries.length, 2);
    assert.equal(entries[0].category, 'math');
    assert.equal(entries[0].kind, 'function');
    assert.equal(entries[1].category, 'math');
  } finally {
    PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name = old_by_name;
    PRDC_JSLAB_CODE_DOC_HOVER.docs_by_name_lower = old_by_name_lower;
  }
}, { tags: ['unit', 'code', 'doc-hover'] });

tests.add('_signature and _formatType produce expected display strings', function(assert) {
  var hover = Object.create(PRDC_JSLAB_CODE_DOC_HOVER.prototype);
  assert.equal(
    hover._signature({
      params: [{ name: 'x' }, { name: 'y', optional: true }]
    }),
    '(x, [y])'
  );
  assert.equal(
    PRDC_JSLAB_CODE_DOC_HOVER._formatType({ names: ['number', 'string'] }),
    'number | string'
  );
  assert.equal(PRDC_JSLAB_CODE_DOC_HOVER._formatType({}), '');
}, { tags: ['unit', 'code', 'doc-hover'] });

exports.MODULE_TESTS = tests;
