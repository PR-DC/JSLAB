/**
 * @file Browser language module for JSLAB web
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var strings = require('../../config/lang.json');

var LANGS = ['en', 'rs', 'rsc'];

class PRDC_JSLAB_WEB_LANGUAGE {

  /**
   * @param {Object} metadata
   */
  constructor(metadata) {
    this.metadata = metadata;
    this.s = strings;
    this.onLanguageChange = function() {};

    var stored_index = Number(this.metadata && this.metadata.get('lang_index', 0));
    if(!Number.isInteger(stored_index) || stored_index < 0 || stored_index >= LANGS.length) {
      stored_index = 0;
    }

    this.lang_index = stored_index;
    this.lang = LANGS[this.lang_index];
  }

  /**
   * Sets the active language.
   * @param {string} lang
   */
  set(lang) {
    var next_index = LANGS.indexOf(lang);
    if(next_index < 0) {
      return;
    }

    this.lang = lang;
    this.lang_index = next_index;
    if(this.metadata) {
      this.metadata.set('lang_index', this.lang_index);
    }

    this.update('html');
    this.onLanguageChange(lang);
  }

  /**
   * Updates translated DOM content inside a container.
   * @param {string} [cont='html']
   */
  update(cont = 'html') {
    var obj = this;

    document.querySelectorAll(cont + ' str').forEach(function(el) {
      var id = el.getAttribute('sid');
      el.textContent = obj.currentString(id);
    });

    document.querySelectorAll(cont + ' textarea[str]').forEach(function(el) {
      el.setAttribute('placeholder', obj.currentString(el.getAttribute('str')));
    });

    document.querySelectorAll(cont + ' input[str]').forEach(function(el) {
      el.setAttribute('placeholder', obj.currentString(el.getAttribute('str')));
    });

    document.querySelectorAll(cont + ' option[str]').forEach(function(el) {
      el.textContent = obj.currentString(el.getAttribute('str'));
    });

    document.querySelectorAll(cont + ' [title-str]').forEach(function(el) {
      el.setAttribute('title', obj.currentString(el.getAttribute('title-str')));
    });

    document.querySelectorAll(cont + ' title[str]').forEach(function(el) {
      el.textContent = obj.currentString(el.getAttribute('str'));
    });
  }

  /**
   * Gets the current language string.
   * @param {string|number} id
   * @returns {string}
   */
  currentString(id) {
    var key = String(id);
    if(!(key in this.s)) {
      return '';
    }

    if(!(this.lang in this.s[key])) {
      return '';
    }

    return this.s[key][this.lang];
  }

  /**
   * Desktop-compatible alias for currentString.
   * @param {string|number} id
   * @returns {string}
   */
  string(id) {
    return this.currentString(id);
  }

  /**
   * Formats a localized string with named placeholders.
   * @param {string|number} id
   * @param {Object} [values]
   * @returns {string}
   */
  formatLang(id, values) {
    var text = this.currentString(id);
    if(values && typeof values == 'object') {
      Object.keys(values).forEach(function(key) {
        text = text.replaceAll('{' + key + '}', String(values[key]));
      });
    }
    return text;
  }

  /**
   * Sets a callback for language changes.
   * @param {Function} callback
   */
  setOnLanguageChange(callback) {
    if(typeof callback == 'function') {
      this.onLanguageChange = callback;
    }
  }
}

exports.PRDC_JSLAB_WEB_LANGUAGE = PRDC_JSLAB_WEB_LANGUAGE;
