/**
 * @file JSLAB sandbox automation tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { PRDC_JSLAB_SANDBOX_AUTOMATION } = require('../automation');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

/**
 * Creates an environment with observable output and evaluation calls.
 * @returns {Object} Test runtime and automation handler.
 */
function createHarness() {
  var env = {};
  ['disp', 'dispMonospaced', 'dispLatex', 'warn', 'error', 'errorInternal', 'cd'].forEach(function(name) {
    env[name] = function(...args) {
      if(env._automation_output) env._automation_output(name, args);
    };
  });
  var context = { sample: [1, NaN, Infinity, 3n] };
  context.sample.push(context.sample);
  var jsl = { ready: true, context: context, current_path: os.tmpdir(),
    setPath: function(value) { this.current_path = value; },
    getWorkspaceProperties: function() { return Object.keys(context); },
    getWorkspace: function() { return [['sample', 'object', 'Array']]; },
    inter: { env: env, eval: { evalCodeFromMain: async function(code, show_output, filename) {
      jsl.executed = { code: code, filename: filename };
      env.disp('visible output');
      return { success: true, value: 6 };
    } } }
  };
  return { jsl: jsl, automation: new PRDC_JSLAB_SANDBOX_AUTOMATION(jsl) };
}

tests.add('automation captures output, preserves special previews and restores environment on errors', async function(assert) {
  var harness = createHarness();
  var original_disp = harness.jsl.inter.env.disp;
  var result = await harness.automation.execute('evaluate_code', { code: '1 + 2 + 3' });
  assert.equal(result.success, true);
  assert.equal(result.value.preview, '6');
  assert.equal(result.output[0].text, 'visible output');
  assert.equal(harness.jsl.inter.env.disp, original_disp);
  var variable = await harness.automation.execute('read_variable', { name: 'sample' });
  assert.ok(variable.value.preview.includes('NaN'));
  assert.ok(variable.value.preview.includes('3n'));
  assert.ok(variable.value.preview.includes('Circular'));
  harness.jsl.inter.eval.evalCodeFromMain = async function() { throw new Error('failure'); };
  result = await harness.automation.execute('evaluate_code', { code: 'bad' });
  assert.equal(result.success, false);
  assert.ok(result.error.includes('failure'));
  assert.equal(harness.jsl.inter.env.disp, original_disp);
}, { tags: ['unit', 'automation'] });

tests.add('automation refuses getters and bounds captured output', async function(assert) {
  var harness = createHarness();
  Object.defineProperty(harness.jsl.context, 'accessor', { enumerable: true,
    get: function() { throw new Error('Getter must not run'); } });
  var result = await harness.automation.execute('read_variable', { name: 'accessor' });
  assert.equal(result.success, false);
  assert.ok(result.error.includes('Accessor'));
  harness.jsl.inter.eval.evalCodeFromMain = async function() {
    for(var i = 0; i < 250; i++) harness.jsl.inter.env.disp('x'.repeat(2000));
    return { success: true, value: 1 };
  };
  result = await harness.automation.execute('evaluate_code', { code: 'output' });
  assert.equal(result.output_truncated, true);
  assert.ok(result.output.length <= 200);
  assert.ok(result.output.reduce(function(size, entry) { return size + entry.text.length; }, 0) <= 64000);
}, { tags: ['unit', 'automation'] });

tests.add('automation analyzes scripts without evaluation and runs files with their source name', async function(assert) {
  var harness = createHarness();
  var directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-automation-'));
  var filename = path.join(directory, 'test.jsl');
  try {
    fs.writeFileSync(filename, 'function broken( {');
    var analysis = await harness.automation.execute('check_code', { path: filename });
    assert.equal(analysis.success, true);
    assert.ok(analysis.value.diagnostics.some(function(item) { return item.fatal; }));
    assert.equal(harness.jsl.executed, undefined);
    fs.writeFileSync(filename, '1 + 2 + 3');
    var result = await harness.automation.execute('run_test_file', { path: filename, cwd: directory });
    assert.equal(result.success, true);
    assert.equal(harness.jsl.executed.filename, filename);
    assert.equal(harness.jsl.current_path, directory);
    result = await harness.automation.execute('run_file', { path: 'relative.jsl' });
    assert.equal(result.success, false);
  } finally {
    fs.unlinkSync(filename);
    fs.rmdirSync(directory);
  }
}, { tags: ['unit', 'automation'] });

tests.add('automation treats nonthrowing reported errors as failures', async function(assert) {
  var harness = createHarness();
  harness.jsl.inter.eval.evalCodeFromMain = async function() {
    harness.jsl.inter.env.error('reported failure', false);
    return { success: true, value: undefined };
  };
  var result = await harness.automation.execute('evaluate_code', { code: 'reported' });
  assert.equal(result.success, false);
  assert.ok(result.error.includes('reported failure'));
}, { tags: ['unit', 'automation'] });

exports.MODULE_TESTS = tests;
