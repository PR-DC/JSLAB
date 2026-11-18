/**
 * @file JSLAB main renderer entry point tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE } = require('../../dev/renderer-entry-test-fixture');
var tests = new PRDC_JSLAB_TESTS();

tests.add('init-main creates language/main window and runs onReady callback', function(assert) {
  var run = PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE.run('main', false);
  assert.equal(run.records.language_ctor, 1);
  assert.equal(run.records.win_ctor, 1);
  assert.equal(run.records.on_ready, 1);
  assert.equal(run.records.logger_file, 'test.log');
  assert.equal(run.records.tester_runs, 0);
}, { tags: ['unit', 'main', 'init'] });

tests.add('init-main launches tester when TEST mode is enabled', async function(assert) {
  var run = PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE.run('main', true);
  await PRDC_JSLAB_RENDERER_ENTRY_TEST_FIXTURE.waitTick();
  assert.equal(run.records.tester_ctor_arg, 'main');
  assert.equal(run.records.tester_runs, 1);
  assert.equal(run.records.suite_reports.length, 1);
  assert.equal(run.records.suite_reports[0].channel, 'JSLAB_TEST_RESULT');
  assert.equal(run.records.suite_reports[0].payload.folder, 'main');
}, { tags: ['unit', 'main', 'init'] });

exports.MODULE_TESTS = tests;
