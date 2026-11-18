/**
 * @file Common editor lint engine and source diagnostic tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_CODE_LINT } = require('../lint');
const tests = new PRDC_JSLAB_TESTS();

tests.add('portable lint engine applies application rules and reports syntax errors', async function(assert) {
  const lint = new PRDC_JSLAB_CODE_LINT();
  const warnings = (await lint.lintText('var unused = 1\n'))[0].messages;
  assert.ok(warnings.some(message => message.ruleId == 'semi' && message.severity == 1));
  assert.ok(warnings.some(message => message.ruleId == 'no-unused-vars'));
  const errors = (await lint.lintText('const broken = ;'))[0].messages;
  assert.ok(errors.some(message => message.fatal && message.severity == 2 && message.line == 1));
});

tests.add('common CodeMirror provider preserves source ranges and exposes lint failures', async function(assert) {
  const positions = { Pos: (line, ch) => ({ line, ch }) };
  const options = PRDC_JSLAB_CODE_LINT.createCodeMirrorLintOptions(positions, {
    lintText: async () => [{ messages: [{ line: 3, column: 2, endLine: 4, endColumn: 6, severity: 1, message: 'range' }] }]
  });
  let annotations;
  await options.getAnnotations('source', result => {
    annotations = result;
  });
  assert.deepEqual(annotations[0].from, { line: 2, ch: 1 });
  assert.deepEqual(annotations[0].to, { line: 3, ch: 5 });
  assert.equal(annotations[0].severity, 'warning');
  const failure = PRDC_JSLAB_CODE_LINT.createCodeMirrorLintOptions(positions, {
    lintText: async () => {
      throw new Error('lint unavailable');
    }
  });
  await failure.getAnnotations('source', result => {
    annotations = result;
  });
  assert.equal(annotations[0].severity, 'error');
  assert.equal(annotations[0].message, 'lint unavailable');
});

exports.MODULE_TESTS = tests;
