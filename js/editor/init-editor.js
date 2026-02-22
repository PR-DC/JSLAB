/**
 * @file JSLAB editor window init file
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

// Modules
// --------------------
const { ipcRenderer } = require('electron');

const helper = require("../js/shared/helper.js");
require("../js/shared/init-config.js");
const { PRDC_APP_LOGGER } = require('../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER');
const { PRDC_JSLAB_LANGUAGE } = require('../js/shared/language');

global.app_path = process.argv.find(e => e.startsWith('--app-path=')).split('=')[1].replace(/\\js\\?$/, '');

const { PRDC_JSLAB_WIN_EDITOR } = require('../js/editor/win-editor');

// Start log
const log_file = ipcRenderer.sendSync('sync-message', 'get-log-file');
const app_logger = new PRDC_APP_LOGGER(log_file);

// Global variables
var language = new PRDC_JSLAB_LANGUAGE();
var win_editor = new PRDC_JSLAB_WIN_EDITOR();

/**
 * Sends test-suite completion to the main process.
 * @param {string} folder
 * @param {Object|null} summary
 * @param {*} err
 */
function reportTestSuiteResult(folder, summary, err) {
  try {
    ipcRenderer.send('JSLAB_TEST_RESULT', {
      folder: folder,
      summary: summary || null,
      error: err ? String(err && err.stack ? err.stack : err) : ''
    });
  } catch(send_err) {
    console.error(send_err && send_err.stack ? send_err.stack : send_err);
  }
}

if(config.TEST) {
  var test_folders = ['editor', 'code'];
  try {
    const { PRDC_JSLAB_TESTER } = require("../js/shared/tester.js");
    test_folders.forEach(function(folder) {
      const tester = new PRDC_JSLAB_TESTER(folder);
      tester.runTests()
        .then(function(summary) {
          reportTestSuiteResult(folder, summary, null);
        })
        .catch(function(err) {
          console.error(err && err.stack ? err.stack : err);
          reportTestSuiteResult(folder, null, err);
        });
    });
  } catch(err) {
    console.error(err && err.stack ? err.stack : err);
    test_folders.forEach(function(folder) {
      reportTestSuiteResult(folder, null, err);
    });
  }
}

// When document is ready
// --------------------
ready(function() {
  // Jquery ready
  $(document).ready(function() {
    win_editor.onReady();
  });
});
