/**
 * @file JSLAB main window init file
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

// Modules
// --------------------
const { ipcRenderer } = require('electron');


const helper = require("../js/helper.js");
const { PRDC_APP_CONFIG } = require('../config/config');
const { PRDC_APP_LOGGER } = require('../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER');
const { PRDC_JSLAB_LANGUAGE } = require('../js/language');

global.app_path = process.argv.find(e => e.startsWith('--app-path=')).split('=')[1].replace(/\\js\\?$/, '');

const { PRDC_JSLAB_WIN_MAIN } = require('../js/main/win-main');

// Start log
const log_file = ipcRenderer.sendSync('sync-message', 'get-log-file');
const app_logger = new PRDC_APP_LOGGER(log_file);

// Global variables
const config = new PRDC_APP_CONFIG();
var language = new PRDC_JSLAB_LANGUAGE();
var win_main = new PRDC_JSLAB_WIN_MAIN();

// When document is ready
// --------------------
ready(function() {
  // Jquery ready
  $(document).ready(function() {
    win_main.onReady();
  });
});