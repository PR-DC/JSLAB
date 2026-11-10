/**
 * @file JSLAB sandbox window init file
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
// Modules
// --------------------
const { ipcRenderer } = require('electron');
const helper = require("../js/shared/helper.js");
require("../js/shared/init-config.js");
const { PRDC_JSLAB_LANGUAGE } = require('../js/shared/language');

const sandbox_app_path = process.argv.find(e => e.startsWith('--app-path=')).split('=')[1].replace(/\\js\\?$/, '');
const sandbox_packed = process.argv
  .find(e => e.startsWith('--packed='))
  ?.split('=')[1]
  ?.toLowerCase() === 'true';

const { PRDC_JSLAB_LIB } = require('../js/sandbox/jslab');

// Global variables
const sandbox_scope = globalThis;
sandbox_scope.language = new PRDC_JSLAB_LANGUAGE(sandbox_app_path);
var jsl;
const { initializeWasm } = require('../js/sandbox/jslab-wasm-loader');
var startup_messages = [];
function queueStartupMessage(...args) { startup_messages.push(args); }
ipcRenderer.on('SandboxWindow', queueStartupMessage);

/**
 * Logs tester errors through sandbox-aware console.
 * @param {*} err
 */
function logSandboxTestError(err) {
  if(jsl && jsl._console && typeof jsl._console.error === 'function') {
    jsl._console.error(err && err.stack ? err.stack : err);
  } else {
    console.error(err);
  }
}

/**
 * Sends test-suite completion to main process.
 * @param {Object|null} summary
 * @param {*} err
 */
function reportSandboxTestResult(summary, err) {
  try {
    ipcRenderer.send('JSLAB_TEST_RESULT', {
      folder: 'sandbox',
      summary: summary || null,
      error: err ? String(err && err.stack ? err.stack : err) : ''
    });
  } catch(send_err) {
    logSandboxTestError(send_err);
  }
}

/**
 * Constructs the runtime after compiled backends are ready.
 */
function startSandbox() {
  jsl = new PRDC_JSLAB_LIB(sandbox_app_path, sandbox_packed);
  ipcRenderer.removeListener('SandboxWindow', queueStartupMessage);
  startup_messages.forEach(function(args) { ipcRenderer.emit('SandboxWindow', ...args); });
  startup_messages = [];
  ipcRenderer.send('JSLAB_SANDBOX_READY');
  if(jsl.config.TEST) {
    try {
      const { PRDC_JSLAB_TESTER } = require(sandbox_app_path + "/js/shared/tester.js");
      const tester = new PRDC_JSLAB_TESTER('sandbox');
      tester.runTests()
        .then(function(summary) {
          reportSandboxTestResult(summary, null);
        })
        .catch(function(err) {
          logSandboxTestError(err);
          reportSandboxTestResult(null, err);
        });
    } catch(err) {
      logSandboxTestError(err);
      reportSandboxTestResult(null, err);
    }
  }
}

Promise.resolve().then(function() {
  return initializeWasm(
    require(sandbox_app_path + '/lib/native-wasm/native_module.js'),
    require(sandbox_app_path + '/lib/native-wasm/alpha_shape_3d.js'));
}).then(startSandbox).catch(function(err) {
  ipcRenderer.removeListener('SandboxWindow', queueStartupMessage);
  logSandboxTestError(err);
  ipcRenderer.send('JSLAB_SANDBOX_FAILED', String(err && err.stack || err));
  if(config.TEST) reportSandboxTestResult(null, err);
});
