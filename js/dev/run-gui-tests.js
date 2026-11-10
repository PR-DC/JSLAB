/**
 * @file Runs isolated GUI interaction tests in a hidden Electron renderer
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');

if(!process.versions.electron) {
  const { spawn } = require('child_process');
  const fs = require('fs');
  const os = require('os');
  const temp_root = path.resolve(os.tmpdir());
  const profile = fs.mkdtempSync(path.join(temp_root, 'jslab-gui-tests-'));
  function cleanup() {
    const target = path.resolve(profile);
    if(path.dirname(target) !== temp_root || !path.basename(target).startsWith('jslab-gui-tests-')) {
      throw new Error('Unexpected GUI test profile path.');
    }
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(require('electron'), [__filename, '--gui-profile=' + profile, ...process.argv.slice(2)], {
    env, stdio: 'inherit', windowsHide: true
  });
  child.on('error', function(err) { console.error(err); cleanup(); process.exitCode = 1; });
  child.on('exit', function(code) { cleanup(); process.exit(code === null ? 1 : code); });
} else {
  const { app, BrowserWindow, ipcMain } = require('electron');
  const fs = require('fs');
  const os = require('os');
  const root = path.resolve(__dirname, '..', '..');
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('in-process-gpu');
  const profile_arg = process.argv.find(arg => arg.startsWith('--gui-profile='));
  app.setPath('userData', profile_arg ? profile_arg.slice('--gui-profile='.length) :
    fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-gui-tests-')));
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  var finished = false;
  function finish(code) {
    if(finished) return;
    finished = true;
    app.exit(code);
  }
  const watchdog = setTimeout(function() {
    console.error('GUI suite timed out.');
    finish(1);
  }, 180000);
  ipcMain.on('gui-test-result', function(_event, result) {
    clearTimeout(watchdog);
    console.log(result.output);
    finish(result.failed || result.error ? 1 : 0);
  });
  app.whenReady().then(async function() {
    const win = new BrowserWindow({
      show: false, width: 1280, height: 900,
      webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false, offscreen: true }
    });
    win.webContents.on('render-process-gone', function(_event, details) {
      console.error(details); finish(1);
    });
    await win.loadFile(path.join(root, 'html', 'blank.html'));
    await win.webContents.executeJavaScript(`
      require(${JSON.stringify(path.join(root, 'js', 'dev', 'run-gui-tests-renderer.js'))}).run(
        ${JSON.stringify(process.argv.filter(arg => arg.startsWith('--test-')))})
    `);
  }).catch(function(err) { console.error(err); finish(1); });
}
