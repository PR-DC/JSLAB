/**
 * @file Coordinates test suites across the Electron application processes
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { PRDC_JSLAB_TESTER } = require('../other-shared/tester');

/**
 * Collects main-process and renderer test results for development test launches.
 */
class PRDC_JSLAB_DEV_APP_TEST_RUNNER {
  /**
   * Connects the development runner to the owning application and its arguments.
   * @param {Object} app Electron application.
   * @param {Object} ipc Main-process IPC.
   * @param {string} app_path Application root.
   * @param {Array<string>} args Startup arguments.
   * @param {number} [timeout_ms=300000] Aggregate test timeout.
   */
  constructor(app, ipc, app_path, args, timeout_ms = 300000) {
    this.app = app;
    this.ipc = ipc;
    this.app_path = app_path;
    this.timeout_ms = timeout_ms;
    this.expected_suites = ['backend-electron', 'other-shared', 'main', 'editor', 'code', 'sandbox'];
    this.auto_exit = args.some(arg => ['--test-auto-exit', '--auto-test-app'].includes(String(arg).toLowerCase()));
    this.report_path = path.join(app_path, 'temp', 'test-report-full.json');
    this.results = new Map();
    this.started_at_ms = Date.now();
    this.done = false;
    this.timer = null;
  }

  /**
   * Starts local suites and, when requested, waits for renderer suite reports.
   */
  start() {
    if(this.auto_exit) {
      this.ipc.on('JSLAB_TEST_RESULT', (_event, payload) => {
        if(payload && typeof payload === 'object') {
          this.reportResult(payload.folder, payload.summary, payload.error);
        }
      });
      this.timer = setTimeout(() => this.finalize(true), this.timeout_ms);
    }
    for(const folder of ['backend-electron', 'other-shared']) {
      this._runSuite(folder);
    }
  }

  /**
   * Runs one suite in the main process and reports its completion or failure.
   * @param {string} folder Suite folder.
   * @returns {Promise<void>} Suite completion.
   */
  async _runSuite(folder) {
    try {
      const summary = await new PRDC_JSLAB_TESTER(folder).runTests();
      if(this.auto_exit) {
        this.reportResult(folder, summary, null);
      }
    } catch(error) {
      console.error(PRDC_JSLAB_DEV_APP_TEST_RUNNER._formatError(error));
      if(this.auto_exit) {
        this.reportResult(folder, null, error);
      }
    }
  }

  /**
   * Records the first completion for an expected application suite.
   * @param {string} folder Suite folder.
   * @param {Object|null} summary Test results.
   * @param {*} error Suite failure, if any.
   */
  reportResult(folder, summary, error) {
    const suite = String(folder || '').trim();
    if(this.done || !this.expected_suites.includes(suite) || this.results.has(suite)) {
      return;
    }
    const normalized = PRDC_JSLAB_DEV_APP_TEST_RUNNER._normalizeSummary(summary);
    const error_text = PRDC_JSLAB_DEV_APP_TEST_RUNNER._formatError(error);
    this.results.set(suite, {
      folder: suite,
      ok: !error_text && normalized.failed === 0,
      summary: normalized,
      error: error_text,
      finished_at: new Date().toISOString()
    });
    console.log('[tester] Suite "' + suite + '" completed (' + this.results.size + '/' + this.expected_suites.length + ').');
    if(this.results.size === this.expected_suites.length) {
      this.finalize(false);
    }
  }

  /**
   * Writes the aggregate report and exits the test application exactly once.
   * @param {boolean} timed_out Whether the test deadline expired.
   */
  finalize(timed_out) {
    if(this.done) {
      return;
    }
    this.done = true;
    clearTimeout(this.timer);
    const suites = this.expected_suites.map(folder => this.results.get(folder) || {
      folder,
      ok: false,
      summary: PRDC_JSLAB_DEV_APP_TEST_RUNNER._normalizeSummary(null),
      error: timed_out ? 'Timed out waiting for suite result.' : 'Suite result missing.',
      finished_at: new Date().toISOString()
    });
    const failed = suites.filter(suite => !suite.ok).map(suite => suite.folder);
    const ended_at_ms = Date.now();
    const report = {
      runner: 'JSLAB_ELECTRON_TEST',
      app_path: this.app_path,
      generated_at: new Date().toISOString(),
      started_at_ms: this.started_at_ms,
      ended_at_ms,
      duration_ms: ended_at_ms - this.started_at_ms,
      timeout_ms: this.timeout_ms,
      expected_suites: this.expected_suites.slice(),
      suites,
      summary: { total_suites: suites.length, passed_suites: suites.length - failed.length, failed_suites: failed.length },
      failed_suite_names: failed
    };
    try {
      fs.mkdirSync(path.dirname(this.report_path), { recursive: true });
      fs.writeFileSync(this.report_path, JSON.stringify(report, null, 2), 'utf8');
    } catch(error) {
      console.error('[tester] [test-report-error] ' + PRDC_JSLAB_DEV_APP_TEST_RUNNER._formatError(error));
    }
    console.log('[tester] Finalized (' + (timed_out ? 'timeout' : 'complete') + '). Passed suites: ' +
      (suites.length - failed.length) + '/' + suites.length + '.');
    if(failed.length) {
      console.log('[tester] Failed suites: ' + failed.join(', '));
    }
    console.log('[tester] Aggregate report: ' + this.report_path);
    this.app.exit(failed.length ? 1 : 0);
  }

  /**
   * Normalizes counts and report paths returned by different application suites.
   * @param {Object|null} summary Suite results.
   * @returns {Object} Serializable summary.
   */
  static _normalizeSummary(summary) {
    const source = summary && typeof summary === 'object' ? summary : {};
    const result = {};
    for(const key of ['total', 'passed', 'failed', 'skipped']) {
      const value = Number(source[key]);
      result[key] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    }
    for(const key of ['report_latest', 'report_history']) {
      result[key] = typeof source[key] === 'string' ? source[key] : '';
    }
    return result;
  }

  /**
   * Formats errors received locally or through renderer IPC.
   * @param {*} error Error or serialized error text.
   * @returns {string} Error description, or an empty string after success.
   */
  static _formatError(error) {
    return error ? String(error.stack || error.message || error) : '';
  }
}

exports.PRDC_JSLAB_DEV_APP_TEST_RUNNER = PRDC_JSLAB_DEV_APP_TEST_RUNNER;
