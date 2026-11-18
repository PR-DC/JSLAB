/**
 * @file JSLAB browser init-main services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WEB_APP_HOST } = require('./app-host');

const startup = {
  /**
   * Starts the application and exposes startup failures to the browser host.
   */
  async handleEvent() {
    try {
      const shell = new PRDC_JSLAB_WEB_APP_HOST();
      globalThis.jslab_web = shell;
      await shell.start();
      document.body.dataset.jslabWebReady = 'true';
    } catch(error) {
      document.body.dataset.jslabWebReady = 'false';
      document.body.dataset.jslabWebError = String(error && error.message || error);
      console.error(error && error.stack || error);
    }
  }
};

if(document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', startup, { once: true });
} else {
  startup.handleEvent();
}
