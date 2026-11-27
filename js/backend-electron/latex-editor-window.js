/**
 * @file JSLAB Electron LaTeX Editor window and desktop adapter
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const { PRDC_JSLAB_LATEX } = require('./latex');
const { PRDC_JSLAB_LATEX_EDITOR_SETTINGS } = require('../latex-editor/latex-editor-settings');
const { PRDC_JSLAB_LATEX_EDITOR_BUILD } = require('../latex-editor/compiler');
const { latex_document } = require('../other-shared/latex-project-files');

/**
 * Owns the isolated LaTeX Editor window and its desktop requests.
 */
class PRDC_JSLAB_LATEX_EDITOR_WINDOW {
  /**
   * Connects the window to the desktop host.
   * @param {Object} application Owning Electron application controller.
   */
  constructor(application) {
    this.application = application;
    this.store = application.store;
    this.settings = new PRDC_JSLAB_LATEX_EDITOR_SETTINGS(this.store, id => application.currentString(id));
    this.wasm_build = new PRDC_JSLAB_LATEX_EDITOR_BUILD(randomUUID);
    ipcMain.handle('JSLAB_LATEX', async (event, action, ...args) => {
      if(event.sender !== this.window?.webContents || event.senderFrame !== event.sender.mainFrame) return null;
      return this.request(action, args);
    });
  }

  /**
   * Opens or focuses the editor and queues an optional project.
   * @param {string} [file] Project folder or TeX source path.
   * @param {string} [main] Main source file under the project folder.
   */
  show(file, main) {
    if(file) this.pending_file = { file, main };
    if(this.window) {
      this.window.focus();
      this.notifyOpen();
      return;
    }
    const win = new BrowserWindow({
      title: this.application.currentString(697), width: 1280, height: 820, minWidth: 760, minHeight: 460,
      icon: this.application.app_icon, show: false,
      webPreferences: { preload: path.join(__dirname, 'init-latex-editor.js'), contextIsolation: true, sandbox: true }
    });
    this.window = win;
    this.ready = false;
    this.allow_close = false;
    this.wasm_build.clear();
    const project = new PRDC_JSLAB_LATEX();
    const editor_file = path.join(__dirname, '../../html/latex-editor.html');
    const editor_url = pathToFileURL(editor_file).href;
    this.project = project;
    win.setMenu(null);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event, url) => {
      const normalized_url = url.replace(/\\/g, '/');
      if(normalized_url !== editor_url) event.preventDefault();
    });
    win.once('ready-to-show', () => win.show());
    win.on('close', event => {
      if(this.allow_close || !this.ready) return;
      event.preventDefault();
      win.webContents.send('JSLAB_LATEX_CLOSE');
    });
    win.on('closed', () => {
      this.window = null;
      this.pending_file = null;
      project.cancel();
      void project.clearPreview();
      this.finishClose(true);
    });
    void win.loadFile(editor_file).catch(error => {
      console.error('LaTeX Editor failed to load:', error);
      win.destroy();
    });
  }

  /**
   * Delivers a project request when the renderer is ready.
   */
  notifyOpen() {
    if(!this.ready || !this.pending_file) return;
    this.window.webContents.send('JSLAB_LATEX_OPEN', this.pending_file);
    this.pending_file = null;
  }

  /**
   * Finishes project cleanup before the application closes its windows.
   * @returns {Promise<boolean>} Whether the editor was closed.
   */
  close() {
    if(!this.window) return Promise.resolve(true);
    if(!this.closing) {
      const closing = this.closing = new Promise(resolve => { this.resolve_close = resolve; });
      this.window.close();
      return closing;
    }
    return this.closing;
  }

  /**
   * Resolves any application request to close the editor.
   * @param {boolean} closed Whether the window closed.
   */
  finishClose(closed) {
    this.resolve_close?.(closed);
    this.resolve_close = null;
    this.closing = null;
  }

  /**
   * Confirms relaunch while keeping the editor available if another window cancels.
   * @returns {Promise<boolean>} Whether reloading is approved.
   */
  async confirmReload() {
    if(!this.window || this.window.isDestroyed()) return true;
    return this.window.webContents.executeJavaScript('window.confirmLatexReload?.() ?? true', true);
  }

  /**
   * Restores the project's saved main source when no source was specified.
   * @param {Object|null} project Project opened by the host.
   * @returns {Object|null} Project selection.
   */
  restoreMain(project) {
    if(!project) return null;
    project.main = this.settings.selectMain(project.root, project.files);
    return project;
  }

  /**
   * Shows a native context action in the editor.
   * @param {number} label Translation ID for the primary action.
   * @param {string[]} [roles] Standard Electron clipboard commands.
   * @returns {Promise<boolean>} Whether the primary action was chosen.
   */
  showActionMenu(label, roles = []) {
    return new Promise(resolve => {
      const items = [{ label: this.application.currentString(label), click: () => resolve(true) }];
      if(roles.length) items.push({ type: 'separator' }, ...roles.map(role => ({ role })));
      const menu = Menu.buildFromTemplate(items);
      menu.popup({ window: this.window, callback: () => resolve(false) });
    });
  }

  /**
   * Handles a renderer request for documents, settings or the compiler.
   * @param {string} action Renderer request name.
   * @param {Array} args Request arguments.
   * @returns {Promise<*>} Action result.
   */
  async request(action, args) {
    const [first, second, third] = args;
    switch(action) {
      case 'ready':
        this.ready = true;
        this.notifyOpen();
        return;
      case 'settings':
      case 'panel':
      case 'preferences':
      case 'search-history': return this.settings.request(action, first, second);
      case 'bundle':
        this.bundle ||= require('esbuild').build({
          entryPoints: [path.join(__dirname, '../latex-editor/latex-editor.js')],
          platform: 'browser', format: 'esm', bundle: true, write: false
        }).then(result => result.outputFiles[0].text).catch(error => {
          this.bundle = null;
          throw error;
        });
        return this.bundle;
      case 'open': {
        const { canceled, filePaths } = await dialog.showOpenDialog(this.window, { properties: ['openDirectory'] });
        if(canceled) return;
        this.wasm_build.clear();
        return this.restoreMain(await this.project.open(filePaths[0]));
      }
      case 'open-path': {
        if(typeof first !== 'string' || !path.isAbsolute(first) || (second != null && typeof second !== 'string')) return null;
        this.wasm_build.clear();
        const project = await this.project.open(first, second);
        return !second && (await fs.stat(first).catch(() => null))?.isDirectory() ? this.restoreMain(project) : project;
      }
      case 'choose-main': {
        const file = await this.project.resolve(first);
        return Boolean(file) && this.settings.saveMain(this.project.root, first);
      }
      case 'file-menu': {
        const file = await this.project.resolve(first);
        if(!file || !/\.tex$/i.test(file)) return false;
        return this.showActionMenu(754);
      }
      case 'jump-menu':
        if(first === 'forward') return this.showActionMenu(704, ['cut', 'copy', 'paste']);
        if(first === 'reverse') return this.showActionMenu(705, ['copy']);
        return false;
      case 'new': {
        if(!this.project.root) return;
        const { canceled, filePath } = await dialog.showSaveDialog(this.window, {
          defaultPath: path.join(this.project.root, 'main.tex'),
          filters: [{ name: this.application.currentString(730), extensions: ['tex'] }]
        });
        if(canceled) return;
        const filename = /\.tex$/i.test(filePath) ? filePath : filePath + '.tex';
        const directory = await this.project.resolvePath(path.dirname(filename));
        if(!directory) return null;
        await fs.writeFile(path.join(directory, path.basename(filename)), latex_document, { flag: 'wx' });
        return { ...await this.project.scan(), file: path.relative(this.project.root, filename) };
      }
      case 'scan': return this.project.scan();
      case 'read': return this.project.read(first);
      case 'read-asset': return this.project.readAsset(first);
      case 'reveal-folder': {
        const directory = await this.project.resolvePath(first);
        if(!directory || !(await fs.stat(directory).catch(() => null))?.isDirectory()) return false;
        return await shell.openPath(directory) === '';
      }
      case 'save': return this.project.save(first, second);
      case 'wasm-files':
      case 'wasm-output': return this.wasm_build.request(this.project, action, first, second);
      case 'detect': return this.project.detect(this.store.get('latex-toolchain-bin'), first);
      case 'toolchain': return new PRDC_JSLAB_LATEX().detect(this.store.get('latex-toolchain-bin'), first);
      case 'locate': {
        const { canceled, filePaths } = await dialog.showOpenDialog(this.window, { properties: ['openDirectory'] });
        if(canceled) return null;
        this.store.set('latex-toolchain-bin', filePaths[0]);
        return this.project.detect(filePaths[0], first);
      }
      case 'install': return shell.openExternal('https://miktex.org/download');
      case 'compile': {
        const compilation = this.project.compile(first, second, true);
        this.compilation = compilation;
        try {
          const result = await compilation;
          if(result && !result.cancelled) result.project = await this.project.scan();
          return result;
        } finally {
          if(this.compilation === compilation) this.compilation = null;
        }
      }
      case 'cancel': return this.project.cancel();
      case 'forward': return this.project.forward(first, second, third);
      case 'reverse': return this.project.reverse(first, second, third);
      case 'focus': return this.application.windows.focusFeatureWindow(this.window);
      case 'close':
        this.project.cancel();
        await this.compilation?.catch(() => {});
        await this.project.clearPreview();
        this.allow_close = true;
        this.window.close();
        return;
      case 'keep-open': return this.finishClose(false);
    }
  }
}

exports.PRDC_JSLAB_LATEX_EDITOR_WINDOW = PRDC_JSLAB_LATEX_EDITOR_WINDOW;
