/**
 * @file JSLAB Electron LaTeX compiler preload
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('latexCompilerHost', {
  onCompile: listener => { ipcRenderer.once('JSLAB_LATEX_WASM_JOB', (_event, job) => listener(job)); },
  complete: result => ipcRenderer.send('JSLAB_LATEX_WASM_RESULT', result)
});
