/**
 * @file Isolated host for actual desktop GUI integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const argument = process.argv.find(arg => arg.startsWith('--user-data-dir='));
if(!argument) {
  throw new Error('Desktop GUI tests require an isolated profile.');
}
const profile = argument.slice('--user-data-dir='.length);
const documents = path.join(profile, 'documents');
fs.mkdirSync(documents, { recursive: true });
app.setPath('documents', documents);
app.setPath('userData', profile);
app.setAppPath(root);
fs.writeFileSync(path.join(profile, 'config.json'), JSON.stringify({ 'shown-getting-started': 1 }));

// Isolate the test application's instance routing without depending on CLI runtime support.
const { PRDC_JSLAB_INSTANCE_ROUTER } = require('../../backend-electron/instance-router');
for(const method of ['start', 'markAsLastActive', 'trackWindowActivity']) {
  PRDC_JSLAB_INSTANCE_ROUTER.prototype[method] = function() {};
}
PRDC_JSLAB_INSTANCE_ROUTER.prototype.forwardScriptsToLastActive = async function() {
  return false;
};
let focused_window;
app.on('browser-window-created', function(_event, win) {
  win.on('focus', () => { focused_window = win; });
});
require('../../dev/gui-test-window').PRDC_JSLAB_GUI_TEST_WINDOW.install(() => true);
var parent_arg = process.argv.find(arg => arg.startsWith('--gui-parent-pid='));
var parent_pid = Number(parent_arg && parent_arg.split('=')[1]);
if(!Number.isInteger(parent_pid) || parent_pid <= 0) {
  throw new Error('GUI tests require an owning process.');
}
var parent_timer = setInterval(function() {
  try {
    process.kill(parent_pid, 0);
  } catch(err) {
    app.exit(0);
  }
}, 1000);
parent_timer.unref();
ipcMain.on('JSLAB_DESKTOP_GUI_TEST_EXIT', function() {
  process.exit(0);
});
ipcMain.handle('JSLAB_DESKTOP_GUI_TEST_CAPTURE', async function(event) {
  var image = await event.sender.capturePage(undefined, { stayHidden: true, stayAwake: true });
  return image.toPNG().toString('base64');
});
ipcMain.handle('JSLAB_DESKTOP_GUI_TEST_FOREGROUND', function() {
  return focused_window && !focused_window.isDestroyed() ? focused_window.webContents.getURL() : '';
});
ipcMain.handle('JSLAB_DESKTOP_GUI_TEST_FINISH', async function(event) {
  if(!event.sender.getURL().endsWith('/main.html')) throw Error('Expected the test main window.');
  const outputs = BrowserWindow.getAllWindows().filter(win => !win.isDestroyed() &&
    /\/(?:figure|plotlyjs|three|d3|leaflet|cesium|mermaid_graph|blank)\.html(?:\?|$)/.test(win.webContents.getURL()));
  for(const win of outputs) {
    await new Promise(resolve => {
      win.once('closed', resolve);
      win.close();
    });
  }
  for(const win of BrowserWindow.getAllWindows()) {
    if(/\/(?:editor|assistant|terminal)\.html(?:\?|$)/.test(win.webContents.getURL())) win.hide();
  }
  return outputs.length;
});
if(process.env.JSLAB_TEST_TEXLIVE === '1') {
  const { PRDC_JSLAB_LATEX } = require('../../backend-electron/latex');
  PRDC_JSLAB_LATEX.prototype.detect = async function(_configured, engine) {
    return { engine, missing: ['latexmk', engine, 'synctex'] };
  };
}
require('../../backend-electron/main-process').PRDC_JSLAB_ELECTRON_MAIN_PROCESS.start();
