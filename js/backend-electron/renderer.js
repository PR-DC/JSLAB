/**
 * @file JSLAB Electron renderer adapter services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { ipcRenderer, clipboard, webUtils, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { PRDC_JSLAB_ELECTRON_STORAGE: Store } = require('./storage');
const { pathEqual } = require('path-equal');

const { PRDC_JSLAB_ELECTRON_RENDERER_STARTUP } = require('./renderer-startup');
const { PRDC_JSLAB_LANGUAGE } = require('../other-shared/language');

/**
 * Class for adapting Electron window services to feature controllers.
 */
class PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER {

  /**
   * Captures services for one desktop window.
   */
  constructor() {
    this.kind = 'electron';
    this.host = ipcRenderer;
    this.clipboard = clipboard;
    this.shell = shell;
    this.webUtils = webUtils;
    this.fs = fs;
    this.path = path;
    this.pathEqual = pathEqual;
    this.store = new Store();
    this.panel_store = this.store;

  }

  /**
   * Connects the common language service to desktop settings and diagnostics.
   * @param {Object} [logger] Application logger for the owning window.
   * @param {Object} [additional_strings={}] Feature-specific translation catalog.
   * @returns {PRDC_JSLAB_LANGUAGE} Initialized renderer language service.
   */
  createLanguage(logger, additional_strings = {}) {
    return new PRDC_JSLAB_LANGUAGE(this.store, additional_strings, { html_strings: true, langs: config.langs,
      log: message => logger ? logger.logMessage(true, true, 0, 'Language', message) : console.error(message) });
  }


  /**
   * Opens external links through Electron instead of replacing the window.
   */
  preventRedirect() {
    PRDC_JSLAB_ELECTRON_RENDERER_STARTUP.preventRedirect();
  }

  /**
   * Connects the desktop title bar to native window operations.
   * @param {Object} controller Editor window presentation controller.
   * @param {Function} [on_close] Application-specific close operation.
   */
  bindWindowControls(controller, on_close) {
    const host = this.host;
    $('#win-close').click(() => on_close ? on_close() : host.send('MainProcess', 'close-editor'));
    $('#win-restore').click(() => {
      controller.toggleFullscreen(false);
      controller.maximized = !controller.maximized;
      host.send('MainProcess', controller.maximized ? 'maximize-win' : 'restore-win');
    });
    $('#win-minimize').click(() => {
      controller.toggleFullscreen(false);
      host.send('MainProcess', 'minimize-win');
    });
    window.addEventListener('resize', () => {
      controller.maximized = host.sendSync('sync-message', 'is-maximized-win');
      $('#win-restore img').attr('src', controller.maximized ? '../img/win-restore.svg' : '../img/win-maximize.svg');
    }, true);
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * Leaves new desktop scripts unnamed until the user chooses a save path.
   * @returns {undefined} No initial file path.
   */
  createScriptPath() {
    return undefined;
  }

  /**
   * Selects a filesystem destination through the owning Electron window.
   * @param {Object} options Save-dialog options.
   * @returns {Object|false} Selected path or cancellation.
   */
  chooseSaveTarget(options) {
    const filename = this.host.sendSync('dialog', 'showSaveDialogSync', options);
    return filename ? { path: filename } : false;
  }

  /**
   * Writes script text to a selected filesystem destination.
   * @param {Object} target Selected path.
   * @param {string} code Script text.
   */
  writeSaveTarget(target, code) {
    this.fs.writeFileSync(target.path, code);
  }

  /**
   * Returns an existing Electron presentation preview surface.
   * @param {string} id Preview element identifier.
   * @returns {HTMLElement} Preview surface.
   */
  getPresentationView(id) {
    return document.getElementById(id);
  }

  /**
   * Creates a hidden Electron preview used for slide-thumbnail capture.
   * @param {string} id Preview element identifier.
   * @returns {HTMLElement} Configured preview surface.
   */
  createPresentationView(id) {
    const view = document.createElement('webview');
    view.id = id;
    view.setAttribute('useragent', 'presentation-editor-thumbnail');
    view.setAttribute('nodeintegration', '');
    view.setAttribute('webpreferences', 'backgroundThrottling=no, contextIsolation=no');
    return view;
  }

  /**
   * Reads the documentation index from the desktop installation.
   * @returns {Object|false} Documentation index or an unavailable index.
   */
  getDocumentation() {
    const root = this.host.sendSync('sync-message', 'get-app-path');
    const filename = this.path.join(root || process.cwd(), 'docs', 'documentation.json');
    try {
      return JSON.parse(this.fs.readFileSync(filename, 'utf8'));
    } catch(error) {
      return false;
    }
  }

  /**
   * Resolves a packaged application asset from a renderer document.
   * @param {string} relative_path Asset path within the application.
   * @returns {string} Renderer-relative asset URL.
   */
  getAssetURL(relative_path) {
    return '../' + relative_path;
  }

  /**
   * Returns the desktop process's startup arguments.
   * @returns {string[]} Startup arguments.
   */
  getArguments() {
    return this.host.sendSync('sync-message', 'get-process-arguments');
  }

  /**
   * Renders math with the renderer provided by the desktop document.
   * @param {HTMLElement[]} elements Console output nodes.
   * @returns {*} Renderer completion when asynchronous.
   */
  typesetMath(elements) {
    return globalThis.MathJax?.typeset?.(elements);
  }

  /**
   * Reads application and operating-system metadata for the main-window UI.
   * @returns {Object} Application identity and standard paths.
   */
  getApplicationInfo() {
    const os = require('os');
    let computer_name = os.hostname();
    if(process.platform == 'win32') {
      computer_name = process.env.COMPUTERNAME;
    } else if(process.platform == 'darwin') {
      computer_name = require('child_process').execSync('scutil --get ComputerName').toString().trim();
    }
    return {
      computer_name,
      user: os.userInfo().username + '@' + computer_name,
      version: this.host.sendSync('sync-message', 'get-app-version'),
      documents_path: this.host.sendSync('sync-message', 'get-path', 'documents'),
      exe_path: this.host.sendSync('sync-message', 'get-path', 'exe')
    };
  }

  /**
   * Removes the filesystem entry selected in the common file browser.
   * @param {string} filename Selected entry path.
   * @returns {Promise<void>} Completion of filesystem removal.
   */
  removePath(filename) {
    return this.fs.promises.rm(filename, { recursive: true });
  }

}

exports.PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER = PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER;
