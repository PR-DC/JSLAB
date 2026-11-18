/**
 * @file JSLAB Electron init-terminal services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_ELECTRON_TERMINAL_SHELL } = require('../js/backend-electron/terminal-shell');
const platform = new PRDC_JSLAB_ELECTRON_TERMINAL_SHELL();

// Modules
// --------------------
const { ipcRenderer } = require('electron');
require('../js/backend-electron/renderer-startup.js');
require('../js/other-shared/init-config.js');

const { PRDC_JSLAB_WIN_SYSTEM_TERMINAL } = require('../js/windows/system-terminal');

global.app_path = ipcRenderer.sendSync('sync-message', 'get-app-path');


// Global variables
var language = platform.createLanguage();

var win_terminal = new PRDC_JSLAB_WIN_SYSTEM_TERMINAL(platform);

// When document is ready
// --------------------
ready(function() {
  win_terminal.onReady();
});
