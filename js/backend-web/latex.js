/**
 * @file JSLAB browser LaTeX workspace project adapter
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LATEX_PROJECT_FILES } = require('../other-shared/latex-project-files');
const { PRDC_JSLAB_LATEX_COMPILER } = require('../other-shared/latex-compiler');
const { PRDC_JSLAB_LATEX_EDITOR_SETTINGS } = require('../latex-editor/latex-editor-settings');

/**
 * Provides local project files and compilation outputs in the browser workspace.
 */
class PRDC_JSLAB_WEB_LATEX {

  /**
   * Connects to the browser workspace and its settings.
   * @param {Object} app Browser application.
   */
  constructor(app) {
    this.app = app;
    this.fs = app.fs;
    this.settings = new PRDC_JSLAB_LATEX_EDITOR_SETTINGS(app.storage, id => app.language.currentString(id));
  }

  /**
   * Creates a worker from the browser application's asset root.
   * @returns {Worker} LaTeX compiler worker.
   */
  createWorker() {
    return this.app.files.createAssetWorker('js/other-shared/latex-wasm-worker.js');
  }

  /**
   * Compiles a workspace document without opening a managed window.
   * @param {Object} app Browser application.
   * @param {string} file Workspace source path.
   * @returns {Promise<Object|boolean>} Compiler result or false for an invalid path.
   */
  static async compileFile(app, file) {
    const latex = new this(app);
    const project = await latex.open(file);
    if(!project) return false;
    return PRDC_JSLAB_LATEX_COMPILER.compileWasmFile(project.main, {
      createWorker: () => latex.createWorker(),
      snapshot: main => latex.snapshot(main),
      publish: (snapshot, output) => latex.publish(snapshot.target, output)
    });
  }

  /**
   * Maps an editor path to a location within the selected workspace project.
   * @param {string} file Project-relative path.
   * @returns {string|null} Valid workspace path.
   */
  resolve(file) {
    if(!this.root || typeof file !== 'string' || file.split(/[\\/]/).includes('..')) return null;
    const path = this.fs.join(this.root, file);
    return path === this.root || path.startsWith(this.root + '/') ? path : null;
  }

  /**
   * Lists the project hierarchy and editable files for the shared editor.
   * @param {string} root Workspace directory.
   * @returns {Promise<Object>} Project tree and source list.
   */
  scan(root = this.root) {
    return PRDC_JSLAB_LATEX_PROJECT_FILES.scan(directory =>
      this.fs.readDirSync(this.fs.join(root, directory), { withFileTypes: true }), '/');
  }

  /**
   * Opens a workspace directory or a TeX file and chooses its main source.
   * @param {string} target Workspace path.
   * @param {string} [source] Requested source path.
   * @returns {Promise<Object|null>} Project selection.
   */
  async open(target, source) {
    if(typeof target !== 'string' || (source != null &&
        (typeof source !== 'string' || source.split(/[\\/]/).includes('..')))) return null;
    const path = this.fs.normalizePath(target);
    const directory = this.fs.existsDirectorySync(path);
    if(!directory && !this.fs.existsFileSync(path)) return null;
    const root = directory ? path : this.fs.dirname(path);
    const listing = await this.scan(root);
    const requested = source ? this.fs.join(root, source).slice(root.length + 1) :
      directory ? null : this.fs.basename(path);
    const main = this.settings.selectMain(root, listing.files, requested);
    if(main === false) return null;
    this.root = root;
    return { root, name: this.fs.basename(root), main, ...listing };
  }

  /**
   * Captures the saved project files for the compiler worker.
   * @param {string} file Project-relative main document.
   * @returns {Promise<Object|null>} Project snapshot.
   */
  async snapshot(file) {
    const root = this.root;
    const target = this.resolve(file);
    if(!target || !this.fs.existsFileSync(target) || !/\.tex$/i.test(file)) return null;
    return PRDC_JSLAB_LATEX_PROJECT_FILES.snapshot(this, { root, target, main: file, separator: '/' },
      name => this.fs.readBytes(this.fs.join(root, name)));
  }

  /**
   * Saves the artifacts beside the main document.
   * @param {string} target Workspace main source path from the snapshot.
   * @param {Object} output Compiler log and optional PDF bytes.
   * @param {boolean} [list] Whether to return the refreshed editor project tree.
   * @returns {Promise<Object|null>} Published PDF path and optional project listing.
   */
  async publish(target, output, list = false) {
    if(!this.root || !target?.startsWith(this.root + '/') || !this.fs.existsFileSync(target)) return null;
    const result = await PRDC_JSLAB_LATEX_PROJECT_FILES.publish(target, output, (file, data) =>
      typeof data === 'string' ? this.fs.writeTextFile(file, data) : this.fs.writeBytes(file, data));
    if(!result) return null;
    await this.app._refreshWorkspaceList();
    return { ...result, project: list ? await this.scan() : undefined };
  }
}

exports.PRDC_JSLAB_WEB_LATEX = PRDC_JSLAB_WEB_LATEX;
