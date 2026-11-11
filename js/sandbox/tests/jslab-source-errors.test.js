/**
 * @file JSLAB source error parsing and mapping tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_SOURCE_ERRORS } = require('../jslab-source-errors');
const { SourceMapGenerator, SourceMapConsumer } = require('source-map');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
function harness() {
  return new PRDC_JSLAB_SOURCE_ERRORS({ debug_sources: new Map(),
    async getOriginalPosition(map, line, column) {
      const consumer = await new SourceMapConsumer(map);
      try { return consumer.originalPositionFor({ line, column }); }
      finally { consumer.destroy(); }
    }
  });
}

tests.add('errors copied from isolated runtimes retain their mapped source details', async function(assert) {
  const details = { name: 'TypeError', message: 'child failure', kind: 'runtime',
    location: { path: 'child.jsl', line: 8, column: 3 },
    frames: [{ path: 'child.jsl', line: 8, column: 3 }], stack: 'TypeError: child failure\n  at child.jsl:8:3' };
  const result = await harness().describe(Object.assign(Error('transport error'), { jslab_error_details: details }));
  assert.deepEqual(result, details);
}, { tags: ['unit', 'errors'] });

tests.add('stack parser supports Windows, POSIX, file URLs, Firefox and async frames', function(assert) {
  const errors = harness();
  for(const [line, path, number, column] of [
    ['    at fail (C:\\folder with spaces\\test (copy).js:12:7)', 'C:\\folder with spaces\\test (copy).js', 12, 7],
    [' at async /tmp/test.js:4:9', '/tmp/test.js', 4, 9],
    [' at fail (file:///C:/test.js:2:3)', 'file:///C:/test.js', 2, 3],
    ['fail@https://example.org/test.js:20:5', 'https://example.org/test.js', 20, 5]
  ]) {
    const frame = errors.parseFrame(line);
    assert.equal(frame.path, path);
    assert.equal(frame.line, number);
    assert.equal(frame.column, column);
  }
  assert.equal(errors.parseFrame('unrelated message'), null);
}, { tags: ['unit', 'errors'] });

tests.add('nested generated frames map to their own immutable source records', async function(assert) {
  const errors = harness();
  for(const [url, path, generated, original] of [['jslab://scripts/1.js', 'parent.jsl', 3, 10], ['jslab://scripts/2.js', 'child.jsl', 8, 4]]) {
    const map = new SourceMapGenerator();
    map.addMapping({ source: path, generated: { line: generated, column: 6 }, original: { line: original, column: 2 } });
    errors.evaluator.debug_sources.set(url, { path, map: map.toJSON() });
  }
  const details = await errors.describe({ name: 'Error', message: 'nested failure',
    stack: 'Error: nested failure\n at leaf (jslab://scripts/2.js:8:7)\n at async run (jslab://scripts/1.js:3:7)' });
  assert.equal(details.location.path, 'child.jsl');
  assert.equal(details.location.line, 4);
  assert.equal(details.location.column, 3);
  assert.equal(details.frames[1].path, 'parent.jsl');
  assert.equal(details.frames[1].line, 10);
  assert.equal(details.stack.includes('jslab://'), false);
}, { tags: ['unit', 'errors'] });

tests.add('module syntax errors use the source header and caret instead of loader internals', async function(assert) {
  const details = await harness().describe({ name: 'SyntaxError', message: 'Unexpected token',
    stack: 'C:\\modules\\bad.js:3\nvar value = ;\n            ^\n\nSyntaxError: Unexpected token\n at node:internal/modules/cjs/loader:10:2' });
  assert.equal(details.kind, 'syntax');
  assert.equal(details.location.path, 'C:\\modules\\bad.js');
  assert.equal(details.location.line, 3);
  assert.equal(details.location.column, 13);
}, { tags: ['unit', 'errors'] });

tests.add('frozen errors and primitive throws are reported without changing catch values', async function(assert) {
  const errors = harness();
  const frozen = Object.freeze(new Error('frozen'));
  assert.equal(errors.capture(frozen, { path: 'test.jsl', line: 4, column: 1 }), frozen);
  assert.equal((await errors.describe(frozen)).message, 'frozen');
  for(const value of [undefined, null, 0, false, 'failure']) {
    assert.equal(errors.capture(value, { path: 'one.jsl', line: 3, column: 1 }), value);
    errors.capture(value, { path: 'two.jsl', line: 8, column: 1 });
    const details = await errors.describe(value);
    assert.equal(details.kind, 'runtime');
    assert.equal(details.location.path, 'two.jsl');
    assert.equal(details.location.line, 8);
  }
}, { tags: ['unit', 'errors'] });

tests.add('a broken map never hides the exception being reported', async function(assert) {
  const errors = harness();
  errors.evaluator.debug_sources.set('jslab://scripts/1.js', { path: 'broken-map.jsl', map: {} });
  errors.evaluator.getOriginalPosition = async () => { throw Error('Invalid map'); };
  const details = await errors.describe({ name: 'TypeError', message: 'actual failure', stack: 'TypeError: actual failure\n at jslab://scripts/1.js:9:2' });
  assert.equal(details.message, 'actual failure');
  assert.equal(details.location.path, 'broken-map.jsl');
  assert.equal(details.location.line, 9);
}, { tags: ['unit', 'errors'] });
exports.MODULE_TESTS = tests;
