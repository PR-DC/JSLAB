/**
 * @file Shared bootstrap for in-page web window documents
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

(function() {
  if(typeof globalThis.setImmediate != 'function') {
    globalThis.setImmediate = function(callback) {
      var args = Array.prototype.slice.call(arguments, 1);
      return globalThis.setTimeout(function() {
        callback.apply(globalThis, args);
      }, 0);
    };
  }

  function getBridge() {
    try {
      if(globalThis.parent && globalThis.parent.__JSLAB_WEB_BRIDGE__) {
        return globalThis.parent.__JSLAB_WEB_BRIDGE__;
      }
    } catch {}
    return null;
  }

  function getLanguage() {
    var bridge = getBridge();
    return bridge && typeof bridge.getLanguage == 'function'
      ? bridge.getLanguage()
      : null;
  }

  function currentString(id) {
    var bridge = getBridge();
    if(bridge && typeof bridge.currentString == 'function') {
      return bridge.currentString(id);
    }
    return '';
  }

  function setFrameTitle(title) {
    var bridge = getBridge();
    if(bridge && typeof bridge.setFrameWindowTitle == 'function') {
      bridge.setFrameWindowTitle(globalThis, title);
    }
  }

  function applyLanguage() {
    document.querySelectorAll('str').forEach(function(el) {
      el.textContent = currentString(el.getAttribute('sid'));
    });

    document.querySelectorAll('textarea[str]').forEach(function(el) {
      el.setAttribute('placeholder', currentString(el.getAttribute('str')));
    });

    document.querySelectorAll('input[str]').forEach(function(el) {
      el.setAttribute('placeholder', currentString(el.getAttribute('str')));
    });

    document.querySelectorAll('option[str]').forEach(function(el) {
      el.textContent = currentString(el.getAttribute('str'));
    });

    document.querySelectorAll('[title-str]').forEach(function(el) {
      el.setAttribute('title', currentString(el.getAttribute('title-str')));
    });

    document.querySelectorAll('title[str]').forEach(function(el) {
      el.textContent = currentString(el.getAttribute('str'));
    });
  }

  globalThis.__JSLAB_WEB_BRIDGE__ = getBridge();
  globalThis.__JSLAB_WEB_getBridge = getBridge;
  globalThis.__JSLAB_WEB_applyFrameLanguage = applyLanguage;
  globalThis.__JSLAB_WEB_setFrameTitle = setFrameTitle;
  globalThis.__JSLAB_WEB_FRAME_onLanguageChange = applyLanguage;
  globalThis.language = {
    currentString: function(id) {
      return currentString(id);
    },
    string: function(id) {
      return currentString(id);
    },
    formatLang: function(id, values) {
      var text = currentString(id);
      if(values && typeof values == 'object') {
        Object.keys(values).forEach(function(key) {
          text = text.replaceAll('{' + key + '}', String(values[key]));
        });
      }
      return text;
    }
  };

  document.addEventListener('DOMContentLoaded', function() {
    applyLanguage();
  });
})();
