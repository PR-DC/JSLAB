/**
 * @file JSLAB portable presentation content and element lifecycle
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

(function(root) {
  /**
   * Shares resource naming, notes detection and presentation validation.
   */
  class PRDC_JSLAB_PRESENTATION_CONTENT {
    /**
     * Maps a resource module to its standalone bundle name.
     * @param {string} module_path Original resource path.
     * @returns {string} Standalone resource path.
     */
    static standaloneModulePath(module_path) {
      if(module_path.endsWith('.module.js')) {
        return module_path.replace(/\.module\.js$/, '.standalone.js');
      }
      if(module_path.endsWith('.js')) {
        return module_path.replace(/\.js$/, '.standalone.js');
      }
      if(module_path.endsWith('.mjs')) {
        return module_path.replace(/\.mjs$/, '.standalone.mjs');
      }
      return module_path + '.standalone.js';
    }

    /**
     * Checks whether an element belongs to slide notes.
     * @param {HTMLElement} el Candidate element.
     * @returns {boolean} Whether it is inside slide notes.
     */
    static isInsideNotes(el) {
      if(!el || typeof el.closest !== 'function') {
        return false;
      }
      var notes = el.closest('notes');
      return !!(notes && notes.closest('slide'));
    }

    /**
     * Validates a presentation directory through the scientific environment.
     * @param {Object} jsl Scientific runtime.
     * @param {string} method Calling command name.
     * @param {string} file_path Presentation root.
     * @returns {boolean} Whether the root contains a presentation.
     */
    static checkFolder(jsl, method, file_path) {
      if(!jsl.inter.file_system.existFile(jsl.inter.env.pathJoin(file_path, 'index.html'))) {
        jsl.inter.env.error('@' + method + ': ' + jsl.inter.lang.string(240));
        return false;
      }
      return true;
    }

    /**
     * Builds a self-contained viewer script with its content implementation.
     * @param {string} template Viewer template.
     * @param {string} content Content helper source.
     * @param {Object} config Presentation settings.
     * @returns {string} Portable viewer source.
     */
    static runtimeSource(template, content, config) {
      const placeholder = '%' + 'presentation_config' + '%';
      return content + '\n' + template.replace(placeholder, JSON.stringify(config || {}, false, 2));
    }
      /**
     * Builds portable resource loading and translated viewer globals.
     * @param {Function} current_string Translation lookup.
     * @param {Object} [resources] Enabled presentation resources.
     * @returns {string} Generated globals script.
     */
    static globalsSource(current_string, resources = { pdfjs: false, plotly: false, mathjax: false, three: false, ui: false }) {
        var strings = Object.fromEntries([315, 316, 317, 318, 363, 541].map(id => [id, current_string(id)]));
      return [
        'window._standalone = window.location.protocol == "file:";',
        'window.presentation_resources = ' + JSON.stringify(resources) + ';',
        'window.__standalone_modules = window.__standalone_modules || {};',
        'window.__presentation_script_promises = window.__presentation_script_promises || {};',
        'window.__getPresentationStandaloneModulePath = function(module_path) {',
        '  if(module_path.endsWith(".module.js")) return module_path.replace(/\\.module\\.js$/, ".standalone.js");',
        '  if(module_path.endsWith(".js")) return module_path.replace(/\\.js$/, ".standalone.js");',
        '  if(module_path.endsWith(".mjs")) return module_path.replace(/\\.mjs$/, ".standalone.mjs");',
        '  return module_path + ".standalone.js";',
        '};',
        'window.__loadPresentationScript = function(script_path) {',
        '  if(typeof script_path != "string" || !/\\.(?:js|mjs)(?:[?#].*)?$/i.test(script_path)) {',
        '    return Promise.reject(new Error("Invalid presentation script path: " + script_path));',
        '  }',
        '  var resolved = new URL(script_path, window.location.href).href;',
        '  if(/\\/index\\.html?(?:[#?].*)?$/i.test(resolved.replace(/\\\\/g, "/"))) {',
        '    return Promise.reject(new Error("Refusing to load presentation page as script: " + resolved));',
        '  }',
        '  if(window.__presentation_script_promises[resolved]) return window.__presentation_script_promises[resolved];',
        '  window.__presentation_script_promises[resolved] = new Promise(function(resolve, reject) {',
        '    var script = document.createElement("script");',
        '    script.type = "text/javascript";',
        '    script.src = resolved;',
        '    script.onload = function() { resolve(true); };',
        '    script.onerror = function() { reject(new Error("Failed to load script: " + resolved)); };',
        '    document.head.appendChild(script);',
        '  });',
        '  return window.__presentation_script_promises[resolved];',
        '};',
        'window.__importPresentationModule = async function(module_path) {',
        '  if(window._standalone) {',
        '    if(Object.prototype.hasOwnProperty.call(window.__standalone_modules, module_path)) return window.__standalone_modules[module_path];',
        '    var standalone_path = window.__getPresentationStandaloneModulePath(module_path);',
        '    await window.__loadPresentationScript(standalone_path);',
        '    return window.__standalone_modules[module_path];',
        '  }',
        '  return import(new URL(module_path, window.location.href).href);',
        '};',
        'window.language = {',
        '  currentString: function(id) {',
        '    var strings = ' + JSON.stringify(strings) + ';',
        '    var key = String(id);',
        '    if(Object.prototype.hasOwnProperty.call(strings, key)) return strings[key];',
        '    return "";',
        '  }',
        '};'
      ].join('\n');
    }

    /**
     * Builds resource-map loading for browser previews and inline slides.
     * @param {boolean} standalone_mode Whether standalone bundles are enabled.
     * @returns {string} Preview resource loader.
     */
    static embeddedLoaderSource(standalone_mode) {
        return [
        '(function(){',
        '  var standalone_mode = ' + JSON.stringify(standalone_mode) + ';',
        '  function normalize(p){ return String(p || "").replace(/\\\\/g,"/").replace(/^\\.\\//,"").replace(/^\\//,""); }',
        '  function resolve(resource){',
        '    if(typeof resource != "string"){ return resource; }',
        '    var text = resource.trim();',
        '    var map;',
        '    if(!text.length || /^(?:[a-z]+:)?\\/\\//i.test(text) || text.startsWith("data:") || text.startsWith("blob:")){ return resource; }',
        '    map = window.__JSLAB_PRESENTATION_RESOURCE_MAP__ || {};',
        '    var key = normalize(text);',
        '    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : resource;',
        '  }',
        '  window._standalone = standalone_mode;',
        '  window.__presentation_script_promises = window.__presentation_script_promises || {};',
        '  window.__loadPresentationScript = function(script_path) {',
        '    if(typeof script_path != "string" || !/\\.(?:js|mjs)(?:[?#].*)?$/i.test(script_path)) {',
        '      return Promise.reject(new Error("Invalid presentation script path: " + script_path));',
        '    }',
        '    var resolved = resolve(script_path);',
        '    if(typeof resolved != "string" || !resolved.length) {',
        '      return Promise.reject(new Error("Failed to resolve presentation script: " + script_path));',
        '    }',
        '    if(window.__presentation_script_promises[resolved]) {',
        '      return window.__presentation_script_promises[resolved];',
        '    }',
        '    window.__presentation_script_promises[resolved] = new Promise(function(resolveScript, rejectScript) {',
        '      var script = document.createElement("script");',
        '      script.type = "text/javascript";',
        '      script.src = resolved;',
        '      script.onload = function() { resolveScript(true); };',
        '      script.onerror = function() { rejectScript(new Error("Failed to load script: " + resolved)); };',
        '      document.head.appendChild(script);',
        '    });',
        '    return window.__presentation_script_promises[resolved];',
        '  };',
        '  window.__importPresentationModule = async function(module_path) {',
        '    if(window._standalone) {',
        '      if(Object.prototype.hasOwnProperty.call(window.__standalone_modules, module_path)) {',
        '        return window.__standalone_modules[module_path];',
        '      }',
        '      var standalone_path = window.__getPresentationStandaloneModulePath(module_path);',
        '      await window.__loadPresentationScript(standalone_path);',
        '      return window.__standalone_modules[module_path];',
        '    }',
        '    var resolved = resolve(module_path);',
        '    if(typeof resolved == "string" && /^blob:/i.test(resolved)) {',
        '      return import(resolved);',
        '    }',
        '    if(typeof resolved == "string" && /^(?:[a-z]+:)?\\/\\//i.test(resolved)) {',
        '      return import(resolved);',
        '    }',
        '    return import(new URL(module_path, window.location.href).href);',
        '  };',
        '})();'
      ].join('\n');
    }

    /**
   * Checks whether local reference.
   * @param {*} url_text Url text.
   */
  static isLocalReference(url_text) {
      var value = String(url_text || '').trim();
      if(!value.length || value.startsWith('#')) {
        return false;
      }
      if(/^(?:[a-z]+:)?\/\//i.test(value)) {
        return false;
      }
      if(value.startsWith('data:') || value.startsWith('blob:') ||
          value.startsWith('javascript:') || value.startsWith('mailto:')) {
        return false;
      }
      return true;
    }

}

  /**
   * Shares render scheduling and completion tracking for presentation elements.
   */
  class PRDC_JSLAB_PRESENTATION_ELEMENT extends (root.HTMLElement || Object) {
    /**
     * Renders connected elements after an observed attribute changes.
     */
    attributeChangedCallback() {
      if(!this.is_connected) {
        return;
      }
      if(presentation._shouldRenderElementNow(this)) {
        this._render();
      }
    }

    /**
     * Coalesces overlapping renders and settles loading state.
     * @returns {Promise<boolean>} Loading completion state.
     */
    async _render() {
      if(this._render_promise) {
        return this._render_promise;
      }
      this._render_promise = this._renderImpl();
      try {
        await this._render_promise;
      } finally {
        if(!this._finished_loading) {
          this._finished_loading = true;
        }
        this._render_promise = null;
      }
      return this._finished_loading;
    }
  }

  const api = { PRDC_JSLAB_PRESENTATION_CONTENT, PRDC_JSLAB_PRESENTATION_ELEMENT };
  if(typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
