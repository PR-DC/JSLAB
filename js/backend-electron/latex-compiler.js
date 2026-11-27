/**
 * @file JSLAB Electron transport for standalone LaTeX WebAssembly builds
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { BrowserWindow, ipcMain } = require('electron');
const { PRDC_JSLAB_LATEX_COMPILER } = require('../other-shared/latex-compiler');

/**
 * Runs workspace builds in an isolated Chromium renderer.
 */
class PRDC_JSLAB_ELECTRON_LATEX_COMPILER {

  /**
   * Receives compiler results from registered workers.
   */
  constructor() {
    this.workers = new WeakMap();
    ipcMain.on('JSLAB_LATEX_WASM_RESULT', (event, data) => {
      const worker = this.workers.get(event.sender);
      if(worker && event.senderFrame === event.sender.mainFrame) worker.onmessage?.({ data });
    });
  }

  /**
   * Compiles a saved project through the shared WebAssembly compiler.
   * @param {Object} project Local LaTeX project.
   * @param {string} main Project-relative main source.
   * @returns {Promise<Object>} Workspace build result.
   */
  compile(project, main) {
    return PRDC_JSLAB_LATEX_COMPILER.compileWasmFile(main, {
      createWorker: () => this.createWorker(),
      snapshot: file => project.snapshot(file),
      publish: (snapshot, output) => project.publish(snapshot.target, output)
    });
  }

  /**
   * Adapts an isolated renderer to the shared compiler's Worker interface.
   * @returns {Object} Worker transport.
   */
  createWorker() {
    // The scientific sandbox enables Node integration in its workers.
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true, contextIsolation: true, backgroundThrottling: false,
        preload: path.join(__dirname, 'init-latex-compiler.js')
      }
    });
    const contents = win.webContents;
    const compiler_file = path.join(__dirname, '../../html/latex-compiler.html');
    const compiler_url = pathToFileURL(compiler_file).href;
    const worker = {
      postMessage: job => {
        void win.loadFile(compiler_file).then(() => {
          if(!win.isDestroyed()) contents.send('JSLAB_LATEX_WASM_JOB', job);
        }).catch(error => worker.onerror?.(error));
      },
      terminate: () => {
        this.workers.delete(contents);
        if(!win.isDestroyed()) win.destroy();
      }
    };
    this.workers.set(contents, worker);
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (event, url) => {
      if(url.replace(/\\/g, '/') !== compiler_url) event.preventDefault();
    });
    contents.on('render-process-gone', (_event, details) => worker.onerror?.({ message: details.reason }));
    win.on('closed', () => {
      if(this.workers.delete(contents)) worker.onerror?.({ message: 'LaTeX compiler closed' });
    });
    return worker;
  }
}

exports.PRDC_JSLAB_ELECTRON_LATEX_COMPILER = PRDC_JSLAB_ELECTRON_LATEX_COMPILER;
