/**
 * @file JSLAB browser LaTeX Editor workspace and window adapter
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { latex_source, latex_asset_types, latex_document } = require('../other-shared/latex-project-files');
const { PRDC_JSLAB_WEB_LATEX } = require('./latex');
const { PRDC_JSLAB_LATEX_EDITOR_BUILD } = require('../latex-editor/compiler');

/**
 * Opens and saves LaTeX projects in the browser workspace.
 */
class PRDC_JSLAB_WEB_LATEX_EDITOR_HOST extends PRDC_JSLAB_WEB_LATEX {

  /**
   * Binds the editor to its owning browser window and workspace.
   * @param {Object} app Browser application.
   * @param {Object} win Managed editor window.
   */
  constructor(app, win) {
    super(app);
    this.win = win;
    this.wasm_build = new PRDC_JSLAB_LATEX_EDITOR_BUILD();
  }

  /**
   * Delivers an open request after the editor has installed its event handler.
   * @param {Object} project Project path and optional main document.
   */
  queue(project) {
    this.pending = project;
    if(this.open_listener) {
      this.pending = null;
      this.open_listener(project);
    }
  }

  /**
   * Registers the controller's project-open listener.
   * @param {Function} listener Project open callback.
   */
  onOpen(listener) {
    this.open_listener = listener;
    if(this.pending) this.queue(this.pending);
  }

  /**
   * Registers the controller's unsaved-changes close listener.
   * @param {Function} listener Close callback.
   */
  onClose(listener) {
    this.close_listener = listener;
  }

  /**
   * Lets the controller resolve unsaved changes before removing the frame.
   * @returns {boolean} Whether the window can close immediately.
   */
  beforeClose() {
    if(this.allow_close || !this.close_listener) return true;
    if(!this.closing) {
      this.closing = true;
      this.close_listener();
    }
    return false;
  }

  /**
   * Invalidates the old build after a project is opened successfully.
   */
  async open(target, source) {
    const project = await super.open(target, source);
    if(project) this.wasm_build.clear();
    return project;
  }

  /**
   * Fulfills file, setting and lifecycle requests from the editor controller.
   * @param {string} action Request name.
   * @param {*} first First request argument.
   * @param {*} second Second request argument.
   * @returns {Promise<*>} Request result.
   */
  async request(action, first, second) {
    const path = this.resolve(first);
    const exists = path && this.fs.existsFileSync(path);
    switch(action) {
      case 'settings': return { ...this.settings.request(action), browser: true };
      case 'panel':
      case 'preferences':
      case 'search-history': return this.settings.request(action, first, second);
      case 'open': {
        const selected = await this.app.files._showOpenDialog({ properties: ['openDirectory'] });
        return selected?.[0] ? this.open(selected[0]) : undefined;
      }
      case 'open-path': return this.open(first, second);
      case 'scan': return this.scan();
      case 'read': return exists && latex_source.test(first) ? this.fs.readTextFile(path) : null;
      case 'read-asset': {
        const type = exists && latex_asset_types[first.slice(first.lastIndexOf('.')).toLowerCase()];
        return type ? { type, data: await this.fs.readBytes(path) } : null;
      }
      case 'wasm-files':
      case 'wasm-output': return this.wasm_build.request(this, action, first, second);
      case 'save':
        if(!exists || !latex_source.test(first) || typeof second !== 'string') return false;
        await this.fs.writeTextFile(path, second);
        return true;
      case 'new': {
        if(!this.root) return;
        const name = this.win.iframe.contentWindow.prompt(this.app.language.currentString(733), 'main.tex');
        if(!name) return;
        const file = /\.tex$/i.test(name) ? name : name + '.tex';
        const target = this.resolve(file);
        if(!target || this.fs.existsFileSync(target) || !this.fs.existsDirectorySync(this.fs.dirname(target))) return null;
        await this.fs.writeTextFile(target, latex_document);
        await this.app._refreshWorkspaceList();
        return { ...await this.scan(), file: target.slice(this.root.length + 1) };
      }
      case 'file-menu': return false;
      case 'choose-main': return Boolean(exists) && this.settings.saveMain(this.root, first);
      case 'reveal-folder':
        if(!path || !this.fs.existsDirectorySync(path)) return false;
        this.app.main.folder_navigation.setPath(path);
        return true;
      case 'focus': return this.app.window_manager.focus(this.win.id);
      case 'close':
        this.allow_close = true;
        return this.app.window_manager.close(this.win.id);
      case 'keep-open': this.closing = false; return;
    }
  }
}

exports.PRDC_JSLAB_WEB_LATEX_EDITOR_HOST = PRDC_JSLAB_WEB_LATEX_EDITOR_HOST;
