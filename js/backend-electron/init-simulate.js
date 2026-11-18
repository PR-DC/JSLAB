/**
 * @file JSLAB Electron init-simulate services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER } = require('../js/backend-electron/renderer');
const platform = new PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER();

// Modules
// --------------------
const { ipcRenderer } = require('electron');
require('../js/backend-electron/renderer-startup.js');
require('../js/other-shared/init-config.js');

const { PRDC_JSLAB_SIMULATE_COMPILER } = require('../js/simulate/compiler');
PRDC_JSLAB_SIMULATE_COMPILER.configure(require('../js/backend-electron/simulate-assets').PRDC_JSLAB_SIMULATE_ASSETS);
const { PRDC_JSLAB_WIN_SIMULATE } = require('../js/simulate/simulate');

global.app_path = ipcRenderer.sendSync('sync-message', 'get-app-path');


// Global variables
var language = platform.createLanguage(undefined, PRDC_JSLAB_SIMULATE_COMPILER.getLanguageStrings());

var win_simulate = new PRDC_JSLAB_WIN_SIMULATE(platform);

// When document is ready
// --------------------
ready(function() {
  win_simulate.onReady();
});
