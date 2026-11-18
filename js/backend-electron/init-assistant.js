/**
 * @file JSLAB Electron init-assistant services
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

const { PRDC_JSLAB_WIN_ASSISTANT } = require('../js/windows/assistant');

global.app_path = ipcRenderer.sendSync('sync-message', 'get-app-path');


// Global variables
var language = platform.createLanguage();

var win_assistant = new PRDC_JSLAB_WIN_ASSISTANT(platform);

// When document is ready
// --------------------
ready(function() {
  win_assistant.onReady();
});
