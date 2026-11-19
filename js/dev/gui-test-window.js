/**
 * @file Native window sizing for isolated GUI tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { BrowserWindow, ipcMain } = require('electron');

/**
 * Resizes the actual window while preserving its original geometry for teardown.
 */
class PRDC_JSLAB_GUI_TEST_WINDOW {

  /**
   * Registers the sizing request for the isolated test application.
   * @param {Function} accept Checks that the requester owns the target window.
   */
  static install(accept) {
    const originals = new WeakMap();
    ipcMain.handle('JSLAB_GUI_TEST_VIEWPORT', async (event, size) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if(!win || event.senderFrame !== event.sender.mainFrame || !accept(win)) throw Error('Invalid GUI test window.');
      if(size === null) {
        const original = originals.get(win);
        if(original) {
          originals.delete(win);
          win.setBounds(original.bounds);
          win.setMinimumSize(...original.minimum);
          if(original.maximized) {
            await new Promise(resolve => {
              win.once('maximize', resolve);
              win.maximize();
            });
          }
        }
      } else {
        if(!Array.isArray(size) || size.length !== 2 ||
            !size.every(value => Number.isInteger(value) && value > 0 && value <= 4000)) throw Error('Invalid GUI test viewport.');
        if(!originals.has(win)) originals.set(win, { bounds: win.getNormalBounds(), minimum: win.getMinimumSize(),
          maximized: win.isMaximized() });
        if(win.isMaximized()) {
          await new Promise(resolve => {
            win.once('unmaximize', resolve);
            win.unmaximize();
          });
        }
        win.setMinimumSize(1, 1);
        win.setContentSize(...size);
      }
      return win.getContentSize();
    });
  }
}

exports.PRDC_JSLAB_GUI_TEST_WINDOW = PRDC_JSLAB_GUI_TEST_WINDOW;
