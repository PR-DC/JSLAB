/**
 * @file Browser entrypoint for the JSLAB web shell
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var { PRDC_JSLAB_WEB_APP_SHELL } = require('./app-shell');

/**
 * Boots the browser shell when the DOM is ready.
 */
async function bootWebShell() {
  var shell = new PRDC_JSLAB_WEB_APP_SHELL();
  globalThis.jslab_web = shell;
  await shell.start();
  if(document && document.body) {
    document.body.dataset.jslabWebReady = 'true';
  }
}

if(document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    bootWebShell().catch(function(err) {
      if(document && document.body) {
        document.body.dataset.jslabWebReady = 'false';
        document.body.dataset.jslabWebError = err && err.message
          ? String(err.message)
          : String(err);
      }
      console.error(err && err.stack ? err.stack : err);
    });
  });
} else {
  bootWebShell().catch(function(err) {
    if(document && document.body) {
      document.body.dataset.jslabWebReady = 'false';
      document.body.dataset.jslabWebError = err && err.message
        ? String(err.message)
        : String(err);
    }
    console.error(err && err.stack ? err.stack : err);
  });
}
