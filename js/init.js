/**
 * @file JSLAB init app
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
"use strict";

const fs = require('fs');
const path = require('path');
const { app, ipcMain } = require('electron');
global.app_path = app.getAppPath().replace(/\\js\\?$/, '');

const helper = require("./shared/helper.js");
require("./shared/init-config.js");

/**
 * Formats unknown errors into strings.
 * @param {*} err
 * @returns {string}
 */
function formatError(err) {
  if(!err) {
    return '';
  }
  if(typeof err === 'string') {
    return err;
  }
  if(err && err.stack) {
    return String(err.stack);
  }
  if(err && err.message) {
    return String(err.message);
  }
  return String(err);
}

/**
 * Converts summary into a normalized structure.
 * @param {*} summary
 * @returns {Object}
 */
function normalizeSummary(summary) {
  var src = summary && typeof summary === 'object' ? summary : {};
  var toInt = function(value) {
    var n = Number(value);
    if(!isFinite(n)) {
      return 0;
    }
    return Math.max(0, Math.floor(n));
  };
  return {
    total: toInt(src.total),
    passed: toInt(src.passed),
    failed: toInt(src.failed),
    skipped: toInt(src.skipped),
    report_latest: typeof src.report_latest === 'string' ? src.report_latest : '',
    report_history: typeof src.report_history === 'string' ? src.report_history : ''
  };
}

/**
 * Creates electron test coordinator that waits for all suites and exits app.
 * @returns {Object}
 */
function createTestCoordinator() {
  var expected_suites = ['backend', 'shared', 'main', 'editor', 'code', 'sandbox'];
  var timeout_ms = 5 * 60 * 1000;
  var report_path = path.join(global.app_path, 'temp', 'test-report-full.json');
  var state = {
    started_at_ms: Date.now(),
    done: false,
    results: Object.create(null),
    timer: null
  };

  var finalize = function(timed_out) {
    if(state.done) {
      return;
    }
    state.done = true;
    if(state.timer) {
      clearTimeout(state.timer);
    }

    var suites = expected_suites.map(function(folder) {
      if(state.results[folder]) {
        return state.results[folder];
      }
      return {
        folder: folder,
        ok: false,
        summary: normalizeSummary(null),
        error: timed_out ? 'Timed out waiting for suite result.' : 'Suite result missing.',
        finished_at: new Date().toISOString()
      };
    });
    var passed_suites = suites.filter(function(entry) { return entry.ok; }).length;
    var failed_suites = suites.filter(function(entry) { return !entry.ok; }).map(function(entry) {
      return entry.folder;
    });

    var report = {
      runner: 'JSLAB_ELECTRON_TEST',
      app_path: global.app_path,
      generated_at: new Date().toISOString(),
      started_at_ms: state.started_at_ms,
      ended_at_ms: Date.now(),
      duration_ms: Date.now() - state.started_at_ms,
      timeout_ms: timeout_ms,
      expected_suites: expected_suites.slice(),
      suites: suites,
      summary: {
        total_suites: expected_suites.length,
        passed_suites: passed_suites,
        failed_suites: failed_suites.length
      },
      failed_suite_names: failed_suites
    };

    try {
      fs.mkdirSync(path.dirname(report_path), { recursive: true });
      fs.writeFileSync(report_path, JSON.stringify(report, null, 2), 'utf8');
    } catch(err) {
      console.error('[tester] [test-report-error] ' + formatError(err));
    }

    var exit_code = failed_suites.length ? 1 : 0;
    var reason = timed_out ? 'timeout' : 'complete';
    console.log('[tester] Finalized (' + reason + '). Passed suites: ' +
      passed_suites + '/' + expected_suites.length + '.');
    if(failed_suites.length) {
      console.log('[tester] Failed suites: ' + failed_suites.join(', '));
    }
    console.log('[tester] Aggregate report: ' + report_path);
    process.exitCode = exit_code;
    app.exit(exit_code);
  };

  var reportResult = function(folder, summary, err) {
    var suite = String(folder || '').trim();
    if(!suite.length || !expected_suites.includes(suite)) {
      return;
    }
    if(state.results[suite]) {
      return;
    }

    var normalized_summary = normalizeSummary(summary);
    var error_text = formatError(err);
    state.results[suite] = {
      folder: suite,
      ok: !error_text && normalized_summary.failed === 0,
      summary: normalized_summary,
      error: error_text,
      finished_at: new Date().toISOString()
    };

    var completed = Object.keys(state.results).length;
    console.log('[tester] Suite "' + suite + '" completed (' + completed + '/' +
      expected_suites.length + ').');
    if(completed >= expected_suites.length) {
      finalize(false);
    }
  };

  state.timer = setTimeout(function() {
    console.error('[tester] Timed out after ' + timeout_ms + ' ms.');
    finalize(true);
  }, timeout_ms);

  return {
    reportResult: reportResult
  };
}

if(global.config && global.config.TEST) {
  const { PRDC_JSLAB_TESTER } = require("./shared/tester.js");
  var args = Array.isArray(global.process_arguments) ? global.process_arguments : [];
  var auto_exit_enabled = args.some(function(arg_raw) {
    var arg = String(arg_raw || '').toLowerCase();
    return arg === '--test-auto-exit' || arg === '--auto-test-app';
  });
  var coordinator = auto_exit_enabled ? createTestCoordinator() : null;

  if(coordinator) {
    ipcMain.on('JSLAB_TEST_RESULT', function(e, payload) {
      if(!payload || typeof payload !== 'object') {
        return;
      }
      coordinator.reportResult(payload.folder, payload.summary, payload.error);
    });
  }

  ['backend', 'shared'].forEach(function(folder) {
    const tester = new PRDC_JSLAB_TESTER(folder);
    tester.runTests()
      .then(function(summary) {
        if(coordinator) {
          coordinator.reportResult(folder, summary, null);
        }
      })
      .catch(function(err) {
        console.error(err && err.stack ? err.stack : err);
        if(coordinator) {
          coordinator.reportResult(folder, null, err);
        }
      });
  });
}

const { PRDC_JSLAB_MAIN } = require("./backend/main");

// Start main
const main = new PRDC_JSLAB_MAIN();
