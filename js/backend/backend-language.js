/**
 * @file JSLAB main process language helpers
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');

/**
 * Language catalog helper for the Electron main process.
 */
class PRDC_JSLAB_BACKEND_LANGUAGE {

  /**
   * Creates a main-process language helper.
   * @param {Object} options Constructor options.
   * @param {string} options.app_path Absolute application root path.
   * @param {string} options.lang Active language code.
   */
  constructor(options) {
    var opts = options || {};
    this.app_path = opts.app_path || globalThis.app_path;
    this.lang = opts.lang || 'en';
    this.lang_strings = JSON.parse(fs.readFileSync(this.app_path + '/config/lang.json'));
  }

  /**
   * Returns the current localized string from the language catalog.
   * @param {number|string} id The string ID.
   * @returns {string} The localized string.
   */
  currentString(id) {
    if(this.lang_strings && this.lang_strings[id]) {
      var entry = this.lang_strings[id];
      if(this.lang && entry[this.lang]) {
        return entry[this.lang];
      }
    }
    return '';
  }

  /**
   * Returns a localized string from the language catalog with placeholder formatting.
   * If called with one argument, this is equivalent to currentString(id).
   * @param {number|string} id The string ID.
   * @param {Object} [values={}] Placeholder values.
   * @returns {string} The localized string.
   */
  formatLang(id, values) {
    if(arguments.length <= 1) {
      return this.currentString(id);
    }
    var text = this.currentString(id);
    if(!values || typeof values !== 'object') {
      return text;
    }
    Object.keys(values).forEach(function(key) {
      text = text.replaceAll('{' + key + '}', String(values[key]));
    });
    return text;
  }
}

exports.PRDC_JSLAB_BACKEND_LANGUAGE = PRDC_JSLAB_BACKEND_LANGUAGE;
