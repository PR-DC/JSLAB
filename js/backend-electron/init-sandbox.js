/**
 * @file JSLAB sandbox window init file
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_ENV } = require('../js/sandbox/jslab-env-electron');

/**
 * Class for sandbox init sandbox operations.
 */
class PRDC_JSLAB_ELECTRON_INIT_SANDBOX {

  /**
   * Handles queue startup message.
   * @param {*} args Args.
   */
  static queueStartupMessage(...args) {
    startup_messages.push(args);
  }

  /**
   * Logs tester errors through sandbox-aware console.
   * @param {*} err
   */
  static logSandboxTestError(err) {
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
  static reportSandboxTestResult(summary, err) {
    try {
      ipcRenderer.send('JSLAB_TEST_RESULT', {
        folder: 'sandbox',
        summary: summary || null,
        error: err ? String(err && err.stack ? err.stack : err) : ''
      });
    } catch(send_err) {
      PRDC_JSLAB_ELECTRON_INIT_SANDBOX.logSandboxTestError(send_err);
    }
  }

  /**
   * Constructs the runtime after compiled backends are ready.
   */
  static startSandbox() {
    jsl = new PRDC_JSLAB_LIB(sandbox_app_path, sandbox_packed, PRDC_JSLAB_ENV);
    ipcRenderer.removeListener('SandboxWindow', PRDC_JSLAB_ELECTRON_INIT_SANDBOX.queueStartupMessage);
    startup_messages.forEach(function(args) {
      ipcRenderer.emit('SandboxWindow', ...args);
    });
    startup_messages = [];
    ipcRenderer.send('JSLAB_SANDBOX_READY');
    if(jsl.config.TEST) {
      try {
        const { PRDC_JSLAB_TESTER } = require(sandbox_app_path + "/js/other-shared/tester.js");
        const tester = new PRDC_JSLAB_TESTER('sandbox');
        tester.runTests()
          .then(function(summary) {
            PRDC_JSLAB_ELECTRON_INIT_SANDBOX.reportSandboxTestResult(summary, null);
          })
          .catch(function(err) {
            PRDC_JSLAB_ELECTRON_INIT_SANDBOX.logSandboxTestError(err);
            PRDC_JSLAB_ELECTRON_INIT_SANDBOX.reportSandboxTestResult(null, err);
          });
      } catch(err) {
        PRDC_JSLAB_ELECTRON_INIT_SANDBOX.logSandboxTestError(err);
        PRDC_JSLAB_ELECTRON_INIT_SANDBOX.reportSandboxTestResult(null, err);
      }
    }
  }
}


// Modules
// --------------------
const { ipcRenderer } = require('electron');
const helper = require("../js/backend-electron/renderer-startup.js");
require("../js/other-shared/init-config.js");
const { PRDC_JSLAB_LANGUAGE } = require("../js/other-shared/language");
const { PRDC_JSLAB_ELECTRON_STORAGE } = require("../js/backend-electron/storage");

const sandbox_app_path = process.argv.find(e => e.startsWith('--app-path=')).split('=')[1].replace(/\\js\\?$/, '');
const sandbox_packed = process.argv
  .find(e => e.startsWith('--packed='))
  ?.split('=')[1]
  ?.toLowerCase() === 'true';

const { PRDC_JSLAB_LIB } = require("../js/sandbox/jslab");

// Global variables
const sandbox_scope = globalThis;
sandbox_scope.language = new PRDC_JSLAB_LANGUAGE(new PRDC_JSLAB_ELECTRON_STORAGE(), {},
  { html_strings: true, langs: config.langs });
var jsl;
const { initializeWasm } = require("../js/sandbox/jslab-wasm-loader");
var startup_messages = [];

ipcRenderer.on('SandboxWindow', PRDC_JSLAB_ELECTRON_INIT_SANDBOX.queueStartupMessage);


Promise.resolve().then(function() {
  return initializeWasm(
    require(sandbox_app_path + '/build/wasm/native/native_module.js'),
    require(sandbox_app_path + '/build/wasm/native/alpha_shape_3d.js'));
}).then(PRDC_JSLAB_ELECTRON_INIT_SANDBOX.startSandbox).catch(function(err) {
  ipcRenderer.removeListener('SandboxWindow', PRDC_JSLAB_ELECTRON_INIT_SANDBOX.queueStartupMessage);
  PRDC_JSLAB_ELECTRON_INIT_SANDBOX.logSandboxTestError(err);
  ipcRenderer.send('JSLAB_SANDBOX_FAILED', String(err && err.stack || err));
  if(config.TEST) {
    PRDC_JSLAB_ELECTRON_INIT_SANDBOX.reportSandboxTestResult(null, err);
  }
});
