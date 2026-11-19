/**
 * @file JSLAB local web preview launcher
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { spawn } = require('node:child_process');
const { app, BrowserWindow, shell } = require('electron');
const { PRDC_JSLAB_DEV_WEB_SERVER } = require('./web-server');

const root = path.resolve(__dirname, '../..');

/**
 * Builds JSLAB Web and opens the loopback site in a dedicated window.
 */
class PRDC_JSLAB_DEV_WEB_PREVIEW {

  /**
   * Builds the preview from the current sources.
   * @returns {Promise<void>} Completion of the web build.
   */
  static build() {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [path.join(__dirname, 'build-web.js'), '--preview'], {
        cwd: root, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: 'inherit', windowsHide: true
      });
      child.once('error', reject);
      child.once('exit', code => {
        if(code === 0) resolve();
        else reject(new Error('Web build exited with code ' + code));
      });
    });
  }

  /**
   * Starts the HTTP server and loads the preview window.
   */
  static async start() {
    const test_url = process.argv.find(argument => argument.startsWith('--gui-test-url='));
    if(test_url) {
      const url = new URL(test_url.slice('--gui-test-url='.length));
      if(url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new Error('Invalid GUI test URL');
      return this.open(url.origin, 'about:blank', true);
    }
    const port_arg = process.argv.find(argument => argument.startsWith('--port='));
    const port_file = path.join(app.getPath('userData'), 'web-preview-port');
    const previous = Number(await fs.readFile(port_file, 'utf8').catch(() => ''));
    const default_port = Number.isInteger(previous) && previous > 0 && previous <= 65535 ? previous : 4173;
    const port = port_arg ? Number(port_arg.slice('--port='.length)) : default_port;
    if(!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid preview port');
    await this.build();
    const folder = path.join(root, 'temp/web-preview');
    const { server, base } = await PRDC_JSLAB_DEV_WEB_SERVER.listen(folder, { port }).catch(error => {
      if(error.code !== 'EADDRINUSE') throw error;
      return PRDC_JSLAB_DEV_WEB_SERVER.listen(folder);
    });
    app.once('before-quit', () => {
      server.close();
      server.closeAllConnections();
    });
    if(!port_arg) await fs.writeFile(port_file, String(server.address().port)).catch(error => console.error(error.message));
    await this.open(base);
    console.log('JSLAB Web is available at ' + base);
  }

  /**
   * Opens a sandboxed Electron window for the loopback web app.
   * @param {string} base Allowed loopback origin.
   * @param {string} [initial=base] First page to load.
   * @param {boolean} [testing=false] Whether this is an isolated GUI test window.
   */
  static async open(base, initial = base, testing = false) {
    const win = new BrowserWindow({
      title: 'JSLAB Web', icon: path.join(root, process.platform === 'win32' ? 'icons/icon.ico' : 'icons/icon.png'),
      width: 1360, height: 900, minWidth: 760, minHeight: 520, show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false,
        backgroundThrottling: !testing, preload: testing ? path.join(__dirname, 'gui-test-window-preload.js') : undefined }
    });
    if(testing) require('./gui-test-window').PRDC_JSLAB_GUI_TEST_WINDOW.install(target => target === win);
    win.setMenuBarVisibility(false);
    const local = url => new URL(url).origin === base;
    for(const event_name of ['will-navigate', 'will-redirect']) {
      win.webContents.on(event_name, event => {
        if(event.isMainFrame && !local(event.url)) event.preventDefault();
      });
    }
    win.webContents.setWindowOpenHandler(({ url }) => {
      if(local(url)) return { action: 'allow' };
      if(/^https?:\/\//i.test(url)) void shell.openExternal(url).catch(error => console.error(error.message));
      return { action: 'deny' };
    });
    app.on('second-instance', () => {
      const preview = BrowserWindow.getAllWindows()[0];
      if(!preview) return;
      if(preview.isMinimized()) preview.restore();
      preview.maximize();
      preview.focus();
    });
    await win.loadURL(initial);
    win.maximize();
    win.show();
  }
}

app.setName('JSLAB Web');
if(!app.commandLine.hasSwitch('user-data-dir')) {
  app.setPath('userData', path.join(app.getPath('appData'), 'JSLAB Web'));
}
if(app.requestSingleInstanceLock()) {
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(() => PRDC_JSLAB_DEV_WEB_PREVIEW.start()).catch(error => {
    console.error(error);
    app.exit(1);
  });
} else {
  app.quit();
}
