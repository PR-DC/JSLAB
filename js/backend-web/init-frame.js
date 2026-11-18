/**
 * @file JSLAB browser managed iframe initialization
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WEB_BROWSER } = require('./browser');

const { PRDC_JSLAB_LANGUAGE } = require('../other-shared/language');

(function() {

  /**
   * Prepares managed renderer documents and updates their translated text.
   */
  class PRDC_JSLAB_WEB_INIT_FRAME {

    /**
     * Returns bridge.
     */
    static getBridge() {
      return PRDC_JSLAB_WEB_BROWSER.getBridge();
    }

    /**
     * Returns language.
     */
    static getLanguage() {
      var bridge = PRDC_JSLAB_WEB_INIT_FRAME.getBridge();
      return bridge && typeof bridge.getLanguage == 'function'
        ? bridge.getLanguage()
        : null;
    }

    /**
     * Sets frame title.
     * @param {string} title Title.
     */
    static setFrameTitle(title) {
      var bridge = PRDC_JSLAB_WEB_INIT_FRAME.getBridge();
      if(bridge && typeof bridge.setFrameWindowTitle == 'function') {
        bridge.setFrameWindowTitle(globalThis, title);
      }
    }

    /**
     * Applies language.
     */
    static applyLanguage() {
      frame_language.set(PRDC_JSLAB_WEB_INIT_FRAME.getLanguage()?.lang || 'en');
    }
  }

  if(typeof globalThis.setImmediate != 'function') {
    globalThis.setImmediate = function(callback) {
      var args = Array.prototype.slice.call(arguments, 1);
      return globalThis.setTimeout(function() {
        callback.apply(globalThis, args);
      }, 0);
    };
  }

  globalThis.__JSLAB_WEB_BRIDGE__ = PRDC_JSLAB_WEB_INIT_FRAME.getBridge();
  globalThis.__JSLAB_WEB_getBridge = PRDC_JSLAB_WEB_INIT_FRAME.getBridge;
  globalThis.__JSLAB_WEB_applyFrameLanguage = PRDC_JSLAB_WEB_INIT_FRAME.applyLanguage;
  globalThis.__JSLAB_WEB_setFrameTitle = PRDC_JSLAB_WEB_INIT_FRAME.setFrameTitle;
  globalThis.__JSLAB_WEB_FRAME_onLanguageChange = PRDC_JSLAB_WEB_INIT_FRAME.applyLanguage;
  const frame_language = PRDC_JSLAB_LANGUAGE.fromPreference(PRDC_JSLAB_WEB_INIT_FRAME.getLanguage);
  globalThis.language = frame_language;

  document.addEventListener('DOMContentLoaded', function() {
    PRDC_JSLAB_WEB_INIT_FRAME.applyLanguage();
  });
})();
