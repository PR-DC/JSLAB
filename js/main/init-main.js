/**
 * @file JSLAB main window init file
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

const { PRDC_JSLAB_WIN_MAIN } = require('../js/main/win-main');

// Start log
const log_file = ipcRenderer.sendSync('sync-message', 'get-log-file');
const app_logger = new PRDC_APP_LOGGER(log_file);

// Global variables
var language = new PRDC_JSLAB_LANGUAGE();
var win_main = new PRDC_JSLAB_WIN_MAIN();

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
  try {
    const { PRDC_JSLAB_TESTER } = require("../js/shared/tester.js");
    const tester = new PRDC_JSLAB_TESTER('main');
    tester.runTests()
      .then(function(summary) {
        reportTestSuiteResult('main', summary, null);
      })
      .catch(function(err) {
        console.error(err && err.stack ? err.stack : err);
        reportTestSuiteResult('main', null, err);
      });
  } catch(err) {
    console.error(err && err.stack ? err.stack : err);
    reportTestSuiteResult('main', null, err);
  }
}

// When document is ready
// --------------------
ready(function() {
  // Jquery ready
  $(document).ready(function() {
    win_main.onReady();
  });
});
