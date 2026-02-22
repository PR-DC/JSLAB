/**
 * @file JSLAB language module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
const fs = require('fs');
const Store = require('electron-store');

const store = new Store();

/**
 * Class for JSLAB language.
 */
class PRDC_JSLAB_LANGUAGE {

  /**
   * Create JSLAB language object.
   * @param {string} [app_path_in] - Absolute application root path.
   */
  constructor(app_path_in) {
    // Variables
    var obj = this;
    this.app_path = app_path_in || globalThis.app_path;
    if(typeof this.app_path !== 'string' || !this.app_path.length) {
      throw new ReferenceError('app_path is not defined');
    }
    
    this.lang_index = store.get('lang_index');
    if (this.lang_index === undefined || this.lang_index === null) {
      this.lang_index = 0;
    }
    
    this.onLanguageChange = function() {};
    
    var style = document.createElement('style');
    document.head.appendChild(style);
    this.lang_styles = style.sheet;
    
    // Get language strings
    this.s = JSON.parse(fs.readFileSync(this.app_path + '/config/lang.json'));
    
    document.querySelectorAll('str').forEach(function(el) {
      var id = el.getAttribute('sid');
      el.innerHTML = obj.string(id);
    });
    
    this.lang = config.langs[this.lang_index];
    this.set(this.lang);
  }

  /**
   * Sets the application's current language and updates the UI accordingly.
   * Saves the new language preference for future sessions.
   * @param {string} lang The language code to set as the current language.
   */
  set(lang) {
    var idx = config.langs.findIndex(function(e) { 
      return e == lang;
    });
    if(idx >= 0) {
      this.lang = lang;
      this.lang_index = idx;
      if(this.lang_styles.cssRules.length) {
        this.lang_styles.deleteRule(0);
      }
      this.lang_styles.insertRule("lang."+lang+" { display: initial }", 0);
      this.update('html', false);
      
      // Save langugae
      store.set('lang_index', this.lang_index);
      this.onLanguageChange(lang);
    } else {
      // Unknown language code
      this._log('set', `unknown language '${lang}'`);
    }
  }
  
  /**
   * Dynamically updates text strings within the specified HTML container to the current language.
   * Can optionally update placeholders and titles for input and option elements.
   * @param {String} cont The selector for the container whose text strings will be updated. Defaults to 'html'.
   * @param {boolean} flag If true, updates the container and child elements with dynamic language strings.
   */
  update(cont = 'html', flag = true) {
    var obj = this;

    if(flag) {
      document.querySelectorAll(cont + ' str').forEach(function(el) {
        var id = el.getAttribute('sid');
        el.innerHTML = obj.string(id);
      });
    }

    document.querySelectorAll(cont + ' textarea[str]').forEach(function(el) {
      var id = el.getAttribute('str');
      if(id in obj.s) {
        if(obj.lang in obj.s[id]) {
          el.setAttribute('placeholder', obj.s[id][obj.lang]);
        } else {
          obj._log('get', `missing language '${obj.lang}' for string id '${id}'`);
          el.setAttribute('placeholder', '');
        }
      } else {
        obj._log('get', `unknown string id '${id}'`);
        el.setAttribute('placeholder', '');
      }
    });
    
    document.querySelectorAll(cont + ' input[str]').forEach(function(el) {
      var id = el.getAttribute('str');
      if(id in obj.s) {
        if(obj.lang in obj.s[id]) {
          el.setAttribute('placeholder', obj.s[id][obj.lang]);
        } else {
          obj._log('get', `missing language '${obj.lang}' for string id '${id}'`);
          el.setAttribute('placeholder', '');
        }
      } else {
        obj._log('get', `unknown string id '${id}'`);
        el.setAttribute('placeholder', '');
      }
    });

    document.querySelectorAll(cont + ' option[str]').forEach(function(el) {
      var id = el.getAttribute('str');
      if(id in obj.s) {
        if(obj.lang in obj.s[id]) {
          el.textContent = obj.s[id][obj.lang];
        } else {
          obj._log('get', `missing language '${obj.lang}' for string id '${id}'`);
          el.textContent = '';
        }
      } else {
        obj._log('get', `unknown string id '${id}'`);
        el.textContent = '';
      }
    });

    document.querySelectorAll(cont + ' [title-str]').forEach(function(el) {
      var id = el.getAttribute('title-str');
      if(id in obj.s) {
        if(obj.lang in obj.s[id]) {
          el.setAttribute('title', obj.s[id][obj.lang]);
        } else {
          obj._log('get', `missing language '${obj.lang}' for string id '${id}'`);
          el.setAttribute('title', '');
        }
      } else {
        obj._log('get', `unknown string id '${id}'`);
        el.setAttribute('title', '');
      }
    });

    document.querySelectorAll(cont + ' title[str]').forEach(function(el) {
      var id = el.getAttribute('str');
      if(id in obj.s) {
        if(obj.lang in obj.s[id]) {
          el.textContent = obj.s[id][obj.lang];
        } else {
          obj._log('get', `missing language '${obj.lang}' for string id '${id}'`);
          el.textContent = '';
        }
      } else {
        obj._log('get', `unknown string id '${id}'`);
        el.textContent = '';
      }
    });
  }
  
  /**
   * Retrieves the specified language string in all available languages, wrapped in language-specific <lang> tags.
   * @param {number} id The identifier of the string to retrieve.
   * @returns {HTML} HTML string containing the text in all available languages.
   */
  string(id) {
    var obj = this;
    var msg = '';

    if(!(id in this.s)) {
      // Unknown key in DB
      this._log('get', `unknown string id '${id}'`);
      config.langs.forEach(function(lang) {
        msg += '<lang class="'+lang+'"></lang>';
      });
      return msg;
    }

    config.langs.forEach(function(lang) {
      if(!(lang in obj.s[id])) {
        obj._log('get', `missing language '${lang}' for string id '${id}'`);
        msg += '<lang class="'+lang+'"></lang>';
      } else {
        msg += '<lang class="'+lang+'">'+obj.s[id][lang]+'</lang>';
      }
    });

    return msg;
  }

  /**
   * Retrieves the current language string for the specified identifier.
   * @param {number} id The identifier of the string to retrieve.
   * @returns {String} The string corresponding to the current language.
   */
  currentString(id) {
    if(!(id in this.s)) {
      this._log('get', `unknown string id '${id}'`);
      return '';
    }

    if(!(this.lang in this.s[id])) {
      this._log('get', `missing language '${this.lang}' for string id '${id}'`);
      return '';
    }

    return this.s[id][this.lang];
  }

  /**
   * Retrieves and formats the current language string using placeholder values.
   * @param {number} id The identifier of the string to retrieve.
   * @param {Object} [values={}] Placeholder values mapped by key.
   * @returns {String} Formatted string in the current language.
   */
  formatLang(id, values) {
    var text = this.currentString(id);
    if(typeof values === 'undefined' || values === null || typeof values !== 'object') {
      return text;
    }
    var keys = Object.keys(values);
    keys.forEach(function(key) {
      text = text.replaceAll('{' + key + '}', String(values[key]));
    });
    return text;
  }

  /**
   * Sets a callback function to be executed when the language is changed.
   * @param {Function} callback The callback function to be executed on language change.
   */
  setOnLanguageChange(callback) {
    if(typeof callback == 'function') {
      this.onLanguageChange = callback;
    }
  }

  /**
   * Internal logger for language-related issues.
   * @param {string} kind - Operation kind (e.g., 'get', 'set').
   * @param {string} message - Additional message details.
   */
  _log(kind, message) {
    const msgBase = `Attempted to ${kind.toUpperCase()} ${message}`;
    if (typeof app_logger != 'undefined') {
      app_logger.logMessage(true, true, 0, 'Language', msgBase);
    } else {
      console.error(msgBase);
    }
  }
}

exports.PRDC_JSLAB_LANGUAGE = PRDC_JSLAB_LANGUAGE;
