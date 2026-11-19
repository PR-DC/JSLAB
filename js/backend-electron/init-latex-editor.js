/**
 * @file JSLAB Electron LaTeX Editor preload
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('latexHost', {
  request: (action, ...args) => ipcRenderer.invoke('JSLAB_LATEX', action, ...args),
  onOpen: listener => { ipcRenderer.on('JSLAB_LATEX_OPEN', (_, file) => listener(file)); },
  onClose: listener => { ipcRenderer.on('JSLAB_LATEX_CLOSE', () => listener()); }
});
