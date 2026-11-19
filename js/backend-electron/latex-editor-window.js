/**
 * @file JSLAB Electron LaTeX Editor window and desktop adapter
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const { PRDC_JSLAB_LATEX } = require('./latex');

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
    const project = new PRDC_JSLAB_LATEX();
    this.project = project;
    win.setMenu(null);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', event => event.preventDefault());
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
    void win.loadFile(path.join(__dirname, '../../html/latex-editor.html')).catch(() => win.destroy());
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
   * Restores the project's saved main source when no source was specified.
   * @param {Object|null} project Project opened by the host.
   * @returns {Object|null} Project selection.
   */
  restoreMain(project) {
    if(!project) return null;
    const file = this.store.get('latex-editor-main-files', {})?.[project.root];
    if(project.files.includes(file)) project.main = file;
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
      case 'settings': {
        const strings = {};
        for(let id = 697; id <= 774; id++) strings[id] = this.application.currentString(id);
        for(let id = 336; id <= 344; id++) strings[id] = this.application.currentString(id);
        for(let id = 364; id <= 372; id++) strings[id] = this.application.currentString(id);
        for(const id of [47, 48, 49, 50, 51, 52, 168, 331, 376, 381, 382, 643, 644, 777]) strings[id] = this.application.currentString(id);
        const panel_keys = ['panel-latex-editor-columns', 'panel-latex-editor-source', 'panel-latex-editor-sidebar'];
        const panels = Object.fromEntries(panel_keys.map(key => [key, this.store.get(key)]));
        return { strings, panels, search_history: this.store.get('editor_search_history'),
          preferences: PRDC_JSLAB_LATEX.preferences(this.store.get('latex-editor-preferences')) };
      }
      case 'bundle':
        this.bundle ||= require('esbuild').build({
          entryPoints: [path.join(__dirname, '../latex-editor/latex-editor.js')],
          platform: 'browser', format: 'esm', bundle: true, write: false
        }).then(result => result.outputFiles[0].text).catch(error => {
          this.bundle = null;
          throw error;
        });
        return this.bundle;
      case 'panel':
        if(['panel-latex-editor-columns', 'panel-latex-editor-source', 'panel-latex-editor-sidebar'].includes(first) &&
            Array.isArray(second) && second.length === 2 && second.every(size => Number.isFinite(size) && size > 0 && size < 100)) {
          this.store.set(first, second);
        }
        return;
      case 'preferences':
        this.store.set('latex-editor-preferences', PRDC_JSLAB_LATEX.preferences(first));
        return;
      case 'search-history':
        if(Array.isArray(first) && first.length <= 100 && first.every(item => typeof item === 'string')) {
          this.store.set('editor_search_history', first);
        }
        return;
      case 'open': {
        const { canceled, filePaths } = await dialog.showOpenDialog(this.window, { properties: ['openDirectory'] });
        return canceled ? undefined : this.restoreMain(await this.project.open(filePaths[0]));
      }
      case 'open-path': {
        if(typeof first !== 'string' || !path.isAbsolute(first) || (second != null && typeof second !== 'string')) return null;
        const project = await this.project.open(first, second);
        return !second && (await fs.stat(first).catch(() => null))?.isDirectory() ? this.restoreMain(project) : project;
      }
      case 'choose-main': {
        const file = await this.project.resolve(first);
        if(!file || !/\.tex$/i.test(file)) return false;
        const choices = this.store.get('latex-editor-main-files', {});
        this.store.set('latex-editor-main-files', { ...choices, [this.project.root]: first });
        return true;
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
        await fs.writeFile(path.join(directory, path.basename(filename)), '\\documentclass{article}\n\n\\begin{document}\n\\null\n\\end{document}\n', { flag: 'wx' });
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
