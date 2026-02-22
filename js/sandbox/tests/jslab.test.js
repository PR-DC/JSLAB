/**
 * @file JSLAB core tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('JSLAB instance is initialized', function(assert) {
  assert.ok(jsl && typeof jsl === 'object');
  assert.equal(jsl.ready, true);
}, { tags: ['unit', 'core'] });

tests.add('Core submodules are available', function(assert) {
  var expected = ['array', 'math', 'format', 'path', 'table', 'mat', 'vec', 'basic', 'system'];
  expected.forEach(function(name) {
    assert.ok(typeof jsl[name] !== 'undefined', 'Missing submodule: ' + name);
  });
}, { tags: ['unit', 'core'] });

tests.add('Expect tic to be equal to last tic', function(assert) {
  assert.equal(tic, jsl.context.last_tic);
}, { tags: ['unit', 'core'] });

tests.add('Joining two paths with path separator', function(assert) {
  assert.equal('a' + pathSep() + 'b', jsl.env.pathJoin('a', 'b'));
}, { tags: ['unit', 'core'] });

tests.add('formatLang replaces placeholders', function(assert) {
  var message = jsl.formatLang(429, { variable: 'x', path: '[0]' });
  assert.ok(typeof message === 'string' && message.length > 0);
  assert.ok(message.indexOf('x') >= 0);
}, { tags: ['unit', 'core'] });

tests.add('Class registry stores registered class path', function(assert) {
  class TestClassForRegistry {}
  var ok = jsl.registerClassDefinition('TestClassForRegistry', TestClassForRegistry, 'C:/tmp/test-class.js');
  assert.equal(ok, true);
  assert.equal(jsl.getClassDefinitionPath('TestClassForRegistry'), jsl.env.pathNormalize('C:/tmp/test-class.js'));
}, { tags: ['unit', 'core'] });

tests.add('Workspace property scan tracks newly added globals', function(assert) {
  var key = '__test_workspace_flag__';
  jsl.context[key] = 42;
  var props = jsl.getWorkspaceProperties();
  assert.ok(Array.isArray(props));
  assert.ok(props.includes(key));
  delete jsl.context[key];
}, { tags: ['unit', 'core'] });

exports.MODULE_TESTS = tests;
