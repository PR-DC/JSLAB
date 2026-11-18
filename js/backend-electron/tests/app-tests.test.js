/**
 * @file Electron application test coordination contracts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_DEV_APP_TEST_RUNNER } = require('../../dev/run-app-tests');
const tests = new PRDC_JSLAB_TESTS();

/**
 * Provides an isolated aggregate report location without starting application suites.
 */
class PRDC_JSLAB_ELECTRON_APP_TEST_FIXTURE {
  /**
   * Captures exits and creates a task-specific report directory.
   */
  constructor() {
    this.root = fs.mkdtempSync(path.resolve(__dirname, '../../../temp/app-test-coordinator-'));
    this.exits = [];
    this.runner = new PRDC_JSLAB_DEV_APP_TEST_RUNNER({ exit: code => this.exits.push(code) }, {}, this.root, ['--auto-test-app']);
  }

  /**
   * Reads the coordinator's aggregate JSON output.
   * @returns {Object} Recorded report.
   */
  report() {
    return JSON.parse(fs.readFileSync(this.runner.report_path, 'utf8'));
  }

  /**
   * Removes only the report and the two directories created by this fixture.
   */
  dispose() {
    clearTimeout(this.runner.timer);
    fs.rmSync(this.runner.report_path, { force: true });
    const report_folder = path.dirname(this.runner.report_path);
    if(fs.existsSync(report_folder)) {
      fs.rmdirSync(report_folder);
    }
    fs.rmdirSync(this.root);
  }
}

tests.add('application test coordination normalizes results, ignores duplicate suites and exits once', function(assert) {
  const fixture = new PRDC_JSLAB_ELECTRON_APP_TEST_FIXTURE();
  try {
    const runner = fixture.runner;
    runner.reportResult('unknown', { failed: 1 }, 'ignored');
    runner.reportResult('backend-electron', { total: '3.9', passed: '2.9', failed: -1, skipped: Infinity }, null);
    runner.reportResult('backend-electron', null, 'duplicate');
    assert.equal(fixture.exits.length, 0);
    for(const folder of runner.expected_suites.slice(1)) {
      runner.reportResult(folder, { total: 1, passed: 1 }, null);
    }
    runner.reportResult('main', null, 'late');
    runner.finalize(true);
    assert.deepEqual(fixture.exits, [0]);
    const report = fixture.report();
    assert.equal(report.summary.passed_suites, 6);
    assert.equal(report.suites[0].summary.total, 3);
    assert.equal(report.suites[0].summary.passed, 2);
    assert.equal(report.suites[0].summary.failed, 0);
    assert.equal(report.suites[0].summary.skipped, 0);
  } finally {
    fixture.dispose();
  }
}, { tags: ['unit', 'backend', 'startup'] });

tests.add('application test timeout reports missing suites and preserves completed failures', function(assert) {
  const fixture = new PRDC_JSLAB_ELECTRON_APP_TEST_FIXTURE();
  try {
    fixture.runner.reportResult('backend-electron', { total: 2, failed: 1 }, null);
    fixture.runner.finalize(true);
    const report = fixture.report();
    assert.deepEqual(fixture.exits, [1]);
    assert.equal(report.summary.failed_suites, 6);
    assert.equal(report.suites[0].summary.failed, 1);
    assert.equal(report.suites[1].error, 'Timed out waiting for suite result.');
  } finally {
    fixture.dispose();
  }
}, { tags: ['unit', 'backend', 'startup'] });

exports.MODULE_TESTS = tests;
