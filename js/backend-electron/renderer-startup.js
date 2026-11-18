/**
 * @file JSLAB Electron renderer startup
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TEXT } = require('../other-shared/text');

const { shell, ipcRenderer } = require('electron');

/**
 * Utilities for Electron renderer startup, diagnostics and external links.
 */
class PRDC_JSLAB_ELECTRON_RENDERER_STARTUP {

  /**
   * Formats local time for timestamped messages in application windows.
   * @returns {string} Local time with millisecond precision.
   */
  static getTimestamp() {
    return PRDC_JSLAB_TEXT.getTimestamp();
  }

  /**
   * Calls a function when the document is ready.
   * @param {Function} fn Function called when the document is ready.
   */
  static ready(fn) {
    if(document.readyState != 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  /**
   * Opens application links in the system browser instead of navigating the window.
   */
  static preventRedirect() {
    var links = $('a');
    links.each(function() {
      var a = this;
      if(!$(a).hasClass('external-link')) {
        $(a).addClass('external-link');
        $(a).click(function(event) {
          event.preventDefault();
          shell.openExternal(a.href);
          return false;
        });
      }
    });
  }

  /**
   * Sends renderer test-suite completion to the main process.
   * @param {string} folder Name of the completed test folder.
   * @param {Object|null} summary Test-suite summary, when available.
   * @param {*} error Test-suite execution error, when present.
   */
  static reportTestSuiteResult(folder, summary, error) {
    try {
      ipcRenderer.send('JSLAB_TEST_RESULT', {
        folder: folder,
        summary: summary || null,
        error: error ? String(error && error.stack ? error.stack : error) : ''
      });
    } catch(send_error) {
      console.error(send_error && send_error.stack ? send_error.stack : send_error);
    }
  }
}

global.ready = PRDC_JSLAB_ELECTRON_RENDERER_STARTUP.ready;
global.preventRedirect = PRDC_JSLAB_ELECTRON_RENDERER_STARTUP.preventRedirect;
exports.PRDC_JSLAB_ELECTRON_RENDERER_STARTUP = PRDC_JSLAB_ELECTRON_RENDERER_STARTUP;

/**
 * Get process arguments
 */
if(process.type == 'browser' || global.is_worker) {
  global.process_arguments = process.argv;
} else {
  global.process_arguments =
    ipcRenderer.sendSync("sync-message", "get-process-arguments");
}
