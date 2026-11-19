/**
 * @file JSLAB browser init-simulate services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { Buffer } = require('buffer');
const { PRDC_JSLAB_WEB_NODE_COMPATIBILITY } = require('./node-compatibility');
const { PRDC_JSLAB_LANGUAGE } = require('../other-shared/language');
const { PRDC_JSLAB_SIMULATE_ASSETS } = require('./simulate-assets');
const { PRDC_JSLAB_SIMULATE_COMPILER } = require('../simulate/compiler');

globalThis.__JSLAB_WEB_SIMULATE_READY__ = (async function() {
  globalThis.global = globalThis;
  globalThis.Buffer = Buffer;
  PRDC_JSLAB_WEB_NODE_COMPATIBILITY.ensure();
  globalThis.app_path = new URL('../', location.href).href;
  const bridge = parent.__JSLAB_WEB_BRIDGE__;
  PRDC_JSLAB_SIMULATE_COMPILER.configure(PRDC_JSLAB_SIMULATE_ASSETS);
  await PRDC_JSLAB_SIMULATE_ASSETS.initialize();
  PRDC_JSLAB_SIMULATE_COMPILER.configure(PRDC_JSLAB_SIMULATE_ASSETS);
  globalThis.language = PRDC_JSLAB_LANGUAGE.fromPreference(() => bridge.getLanguage(), PRDC_JSLAB_SIMULATE_COMPILER.getLanguageStrings());
  language.update();
  const { PRDC_JSLAB_WEB_SIMULATE_HOST } = require('./simulate-host');
  const ipcRenderer = new PRDC_JSLAB_WEB_SIMULATE_HOST(bridge);
  const { PRDC_JSLAB_WIN_SIMULATE } = require('../simulate/simulate');
  globalThis.win_simulate = new PRDC_JSLAB_WIN_SIMULATE({ host: ipcRenderer, path: require('./node-compatibility') });
  win_simulate.onReady();
  let close_approved = false;
  let close_pending = false;
  globalThis.__JSLAB_WEB_CONFIRM_RELOAD__ = focus => {
    if(close_pending || win_simulate.close_answer) return false;
    if(win_simulate.hasUnsavedProjectChanges()) focus();
    return win_simulate.confirmProjectClose();
  };
  globalThis.__JSLAB_WEB_BEFORE_CLOSE__ = () => {
    if(close_approved || !win_simulate.hasUnsavedProjectChanges()) return true;
    if(!close_pending) {
      close_pending = true;
      void win_simulate.confirmProjectClose().then(approved => {
        if(approved) {
          close_approved = true;
          bridge.closeFrameWindow(globalThis);
        }
      }).catch(console.error).finally(() => {
        close_pending = false;
      });
    }
    return false;
  };
  globalThis.__JSLAB_WEB_FRAME_onLanguageChange = function() {
    ipcRenderer.emit('SimulateWindow', 'set-language', bridge.getLanguage().lang);
  };
  window.addEventListener('beforeunload', () => ipcRenderer.dispose(), { once: true });
  return { controller: win_simulate, host: ipcRenderer };

})().catch(error => {
  document.getElementById('simulate-console').classList.remove('collapsed');
  document.getElementById('simulate-output').textContent = String(error.message || error);
  throw error;
});
