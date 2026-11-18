/**
 * @file JSLAB Electron init-main services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER } = require('../js/backend-electron/renderer');
const platform = new PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER();

// Modules
// --------------------
const { ipcRenderer } = require('electron');

const { PRDC_JSLAB_ELECTRON_RENDERER_STARTUP } = require("../js/backend-electron/renderer-startup.js");
require("../js/other-shared/init-config.js");

global.app_path = process.argv.find(e => e.startsWith('--app-path=')).split('=')[1].replace(/\\js\\?$/, '');

const { PRDC_JSLAB_MAIN } = require('../js/main/main');

// Start log
const log_file = ipcRenderer.sendSync('sync-message', 'get-log-file');


const { PRDC_APP_LOGGER } = require('../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER');
const app_logger = new PRDC_APP_LOGGER(log_file);

// Global variables
var language = platform.createLanguage(app_logger);

var win_main = new PRDC_JSLAB_MAIN(platform);

if(config.TEST) {
  try {
    const { PRDC_JSLAB_TESTER } = require("../js/other-shared/tester.js");
    const tester = new PRDC_JSLAB_TESTER('main');
    tester.runTests()
      .then(function(summary) {
        PRDC_JSLAB_ELECTRON_RENDERER_STARTUP.reportTestSuiteResult('main', summary, null);
      })
      .catch(function(err) {
        console.error(err && err.stack ? err.stack : err);
        PRDC_JSLAB_ELECTRON_RENDERER_STARTUP.reportTestSuiteResult('main', null, err);
      });
  } catch(err) {
    console.error(err && err.stack ? err.stack : err);
    PRDC_JSLAB_ELECTRON_RENDERER_STARTUP.reportTestSuiteResult('main', null, err);
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
