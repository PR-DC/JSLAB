/**
 * @file Browser entrypoint for the JSLAB web shell
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var { PRDC_JSLAB_WEB_APP_SHELL } = require('./app-shell');

/** Registers persistent caching for versioned browser libraries. */
async function registerLibraryCache() {
  if(!globalThis.navigator || !globalThis.navigator.serviceWorker ||
      !globalThis.location || !/^https?:$/.test(globalThis.location.protocol)) {
    return false;
  }
  try {
    await globalThis.navigator.serviceWorker.register('./service-worker.js', { scope: './' });
    await globalThis.navigator.serviceWorker.ready;
    return true;
  } catch(error) {
    console.warn('Unable to enable the JSLAB web library cache.', error);
    return false;
  }
}

/**
 * Boots the browser shell when the DOM is ready.
 */
async function bootWebShell() {
  await registerLibraryCache();
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
