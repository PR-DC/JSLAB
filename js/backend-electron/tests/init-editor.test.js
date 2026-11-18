/**
 * @file JSLAB editor renderer entry point tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE } = require('../../dev/renderer-entry-test-fixture');
var tests = new PRDC_JSLAB_TESTS();

tests.add('init-editor creates language/editor window and runs onReady callback', function(assert) {
  var run = PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE.run('editor', false);
  assert.equal(run.records.language_ctor, 1);
  assert.equal(run.records.win_ctor, 1);
  assert.equal(run.records.on_ready, 1);
  assert.equal(run.records.logger_file, 'test.log');
  assert.equal(run.records.tester_runs, 0);
}, { tags: ['unit', 'editor', 'init'] });

tests.add('init-editor launches tester when TEST mode is enabled', async function(assert) {
  var run = PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE.run('editor', true);
  await PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE.waitTick();
  assert.deepEqual(run.records.tester_ctor_args, ['editor', 'code']);
  assert.equal(run.records.tester_runs, 2);
  assert.equal(run.records.suite_reports.length, 2);
  assert.equal(run.records.suite_reports[0].channel, 'JSLAB_TEST_RESULT');
  assert.equal(run.records.suite_reports[1].channel, 'JSLAB_TEST_RESULT');
  var reported = run.records.suite_reports.map(function(entry) {
    return entry.payload.folder;
  }).sort();
  assert.deepEqual(reported, ['code', 'editor']);
}, { tags: ['unit', 'editor', 'init'] });

exports.MODULE_TESTS = tests;
