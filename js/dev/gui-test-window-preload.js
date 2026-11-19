/**
 * @file Resizing bridge for the isolated Web GUI test window
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('__JSLAB_GUI_TEST_VIEWPORT__', size => ipcRenderer.invoke('JSLAB_GUI_TEST_VIEWPORT', size));
