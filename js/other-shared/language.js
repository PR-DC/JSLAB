/**
 * @file JSLAB application language service
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const strings = require('../../config/lang.json');
const { PRDC_APP_CONFIG } = require('../../config/config');

/**
 * Translates application messages and feature windows using injected settings.
 */
class PRDC_JSLAB_LANGUAGE {
  /**
   * Creates a window language service following the host's current preference.
   * @param {Function} read_language Returns the current host language state.
   * @param {Object} [additional_strings={}] Feature-specific catalog entries.
   * @returns {PRDC_JSLAB_LANGUAGE} Language service with host-owned preferences.
   */
  static fromPreference(read_language, additional_strings = {}) {
    return new PRDC_JSLAB_LANGUAGE({
      get: (key, fallback) => key === 'lang_index' ? read_language()?.lang_index || 0 : fallback,
      set: function() {}
    }, additional_strings);
  }

  /**
   * Connects language preferences, catalogs and the owning renderer document.
   * @param {Object} store Application settings service.
   * @param {Object} [additional_strings={}] Feature-specific catalog entries.
   * @param {Object} [options={}] Document, language list, HTML rendering and logger.
   */
  constructor(store, additional_strings = {}, options = {}) {
    this.store = store;
    this.s = Object.assign({}, strings, additional_strings);
    this.langs = options.langs || new PRDC_APP_CONFIG().langs;
    this._document = options.document === undefined ? globalThis.document : options.document;
    this._html_strings = options.html_strings === true;
    this._logger = options.log;
    this.onLanguageChange = function() {};
    const index = Number(store?.get('lang_index', 0));
    this.lang_index = Number.isInteger(index) && index >= 0 && index < this.langs.length ? index : 0;
    this.lang = this.langs[this.lang_index];
    if(this._html_strings) {
      const style = this._document.createElement('style');
      this._document.head.appendChild(style);
      this.lang_styles = style.sheet;
      this.update();
      this.set(this.lang);
    }
  }

  /**
   * Selects a supported language, persists its index and updates the document.
   * @param {string} lang Language code.
   */
  set(lang) {
    const index = this.langs.indexOf(lang);
    if(index < 0) {
      this._log('set', "unknown language '" + lang + "'");
      return;
    }
    this.lang = lang;
    this.lang_index = index;
    if(this.lang_styles) {
      if(this.lang_styles.cssRules.length) {
        this.lang_styles.deleteRule(0);
      }
      this.lang_styles.insertRule('lang.' + lang + ' { display: initial }', 0);
    }
    this.store?.set('lang_index', index);
    if(this._document) {
      this.update('html', !this._html_strings);
    }
    this.onLanguageChange(lang);
  }

  /**
   * Updates translated text, accessibility labels, titles and input placeholders.
   * @param {string} [cont='html'] Container selector.
   * @param {boolean} [flag=true] Whether to rebuild language string elements.
   */
  update(cont = 'html', flag = true) {
    PRDC_JSLAB_LANGUAGE.updateDocument(this, this._document, cont, flag, this._html_strings);
  }

  /**
   * Returns a string in the document's rendering format.
   * @param {number|string} id Translation identifier.
   * @returns {string} Plain text or language-tagged HTML.
   */
  string(id) {
    if(!this._html_strings) {
      return this.currentString(id);
    }
    if(!(id in this.s)) {
      this._log('get', "unknown string id '" + id + "'");
    }
    return this.langs.map(lang => {
      const text = this.s[id]?.[lang];
      if(text === undefined && id in this.s) {
        this._log('get', "missing language '" + lang + "' for string id '" + id + "'");
      }
      return '<lang class="' + lang + '">' + (text === undefined ? '' : text) + '</lang>';
    }).join('');
  }

  /**
   * Returns the selected language's text and reports missing catalog entries.
   * @param {number|string} id Translation identifier.
   * @returns {string} Localized text or an empty string.
   */
  currentString(id) {
    if(!(id in this.s)) {
      this._log('get', "unknown string id '" + id + "'");
      return '';
    }
    if(!(this.lang in this.s[id])) {
      this._log('get', "missing language '" + this.lang + "' for string id '" + id + "'");
      return '';
    }
    return this.s[id][this.lang];
  }

  /**
   * Replaces named placeholders in localized text.
   * @param {number|string} id Translation identifier.
   * @param {Object} [values] Placeholder values.
   * @returns {string} Formatted text.
   */
  formatLang(id, values) {
    var text = this.currentString(id);
    if(values && typeof values === 'object') {
      Object.keys(values).forEach(key => {
        text = text.replaceAll('{' + key + '}', String(values[key]));
      });
    }
    return text;
  }

  /**
   * Registers the host's language-change callback.
   * @param {Function} callback Language-change handler.
   */
  setOnLanguageChange(callback) {
    if(typeof callback === 'function') {
      this.onLanguageChange = callback;
    }
  }

  /**
   * Reports translation diagnostics through the injected logger.
   * @param {string} kind Translation operation.
   * @param {string} message Diagnostic details.
   */
  _log(kind, message) {
    this._logger?.('Attempted to ' + kind.toUpperCase() + ' ' + message);
  }

  /**
   * Translates an owning document using an existing language service.
   * @param {Object} language Translation service.
   * @param {Document} document Target renderer document.
   * @param {string} [cont='html'] Container selector.
   * @param {boolean} [flag=true] Whether to rebuild string elements.
   * @param {boolean} [html_strings=false] Whether strings contain language tags.
   */
  static updateDocument(language, document, cont = 'html', flag = true, html_strings = false) {
    const targets = [
      ['[lang-str]', 'lang-str', null], ['[aria-label-str]', 'aria-label-str', 'aria-label'],
      ['[alt-str]', 'alt-str', 'alt'], ['textarea[str], input[str]', 'str', 'placeholder'],
      ['option[str], title[str]', 'str', null], ['[title-str]', 'title-str', 'title']
    ];
    for(const [selector, key, attribute] of targets) {
      const query = selector.split(', ').map(item => cont + ' ' + item).join(', ');
      document.querySelectorAll(query).forEach(element => {
        const text = language.currentString(element.getAttribute(key));
        if(attribute) {
          element.setAttribute(attribute, text);
        } else {
          element.textContent = text;
        }
      });
    }
    if(flag) {
      document.querySelectorAll(cont + ' str').forEach(element => {
        const id = element.getAttribute('sid');
        if(html_strings) {
          element.innerHTML = language.string(id);
        } else {
          element.textContent = language.currentString(id);
        }
      });
    }
  }

}

exports.PRDC_JSLAB_LANGUAGE = PRDC_JSLAB_LANGUAGE;
