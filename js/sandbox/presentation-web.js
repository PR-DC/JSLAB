/**
 * @file JSLAB web presentation submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for the browser presentation submodule.
 */
class PRDC_JSLAB_LIB_PRESENTATION_WEB {

  /**
   * @param {Object} jsl
   */
  constructor(jsl) {
    this.jsl = jsl;
  }

  /**
   * Opens the browser presentation editor for one workspace presentation.
   * @param {string} file_path
   * @returns {Promise<Window|boolean>}
   */
  async editPresentation(file_path) {
    var wid;
    var context;
    file_path = await this._getPath('editPresentation', file_path);
    if(!file_path || !this._checkPresentation('editPresentation', file_path)) {
      return false;
    }

    wid = this.jsl.inter.windows.openWindow('presentation-editor.html');
    await this.jsl.inter.windows.open_windows[wid].ready;
    context = this.jsl.inter.windows.open_windows[wid].context;
    while(typeof context.presentation_editor == 'undefined') {
      await this.jsl.inter.non_blocking.waitMSeconds(1);
    }
    context.presentation_editor.setPath(file_path);
    this.jsl.inter.windows.open_windows[wid].setTitle(
      file_path + ' - ' + this.jsl.inter.lang.currentString(516)
    );
    return context;
  }

  /**
   * Opens one presentation preview window in web mode.
   */
  async openPresentation(file_path) {
    var wid;
    var win;
    var context;
    var iframe;
    var root_name;
    file_path = await this._getPath('openPresentation', file_path);
    if(!file_path || !this._checkPresentation('openPresentation', file_path)) {
      return false;
    }

    wid = this.jsl.inter.windows.openWindow('blank.html');
    win = this.jsl.inter.windows.open_windows[wid];
    await win.ready;
    context = win.context;
    root_name = this.jsl.inter.env.pathBaseName(file_path) || 'Presentation';

    context.document.title = root_name;
    context.document.body.innerHTML = '';
    context.document.documentElement.style.height = '100%';
    context.document.body.style.margin = '0';
    context.document.body.style.padding = '0';
    context.document.body.style.overflow = 'hidden';
    context.document.body.style.height = '100%';
    context.document.body.style.display = 'flex';

    iframe = context.document.createElement('iframe');
    iframe.style.border = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.flex = '1 1 auto';
    iframe.style.display = 'block';
    iframe.srcdoc = this._buildPresentationDocument(file_path);
    context.document.body.appendChild(iframe);

    await win.setTitle(root_name);
    return context;
  }

  /**
   * Refreshes generated internal presentation files for a workspace presentation.
   */
  async updatePresentation(file_path) {
    var config;
    file_path = await this._getPath('updatePresentation', file_path);
    if(!file_path || !this._checkPresentation('updatePresentation', file_path)) {
      return false;
    }
    config = this._readPresentationConfig(file_path);
    this._writePresentationFiles(file_path, config);
    return true;
  }

  /**
   * Creates one workspace presentation project in browser storage.
   */
  async createPresentation(file_path, opts_in, open_editor) {
    var config = {
      jslab_version: this.jsl.context && this.jsl.context.version ? this.jsl.context.version : '',
      slide_width: 1920,
      slide_height: 1080,
      presentation_mode: 'online'
    };
    var should_open_editor = open_editor !== false;

    if(!file_path) {
      file_path = await this._getPath('createPresentation', file_path);
    }
    if(!file_path) {
      return false;
    }
    if(opts_in && typeof opts_in == 'object') {
      config = Object.assign(config, opts_in);
    }

    this._ensureDirectory(file_path);
    this._writePresentationFiles(file_path, config);
    if(should_open_editor) {
      return this.editPresentation(file_path);
    }
    return true;
  }

  /**
   * Not yet supported in web mode.
   */
  packPresentation() {
    return this.jsl.inter.env.reportUnavailable('Presentation packaging');
  }

  /**
   * Not yet supported in web mode.
   */
  async makeStandalonePresentation() {
    var file_path = arguments[0];
    return this._setPresentationMode(file_path, 'standalone');
  }

  /**
   * Not yet supported in web mode.
   */
  async makeOnlinePresentation() {
    var file_path = arguments[0];
    return this._setPresentationMode(file_path, 'online');
  }

  /**
   * Not yet supported in web mode.
   */
  presentationToPdf() {
    return this.jsl.inter.env.reportUnavailable('Presentation PDF export');
  }

  /**
   * Builds the current presentation runtime source with embedded config.
   * @param {Object} config
   * @returns {string|false}
   */
  _buildPresentationRuntimeSource(config) {
    var js_template = String(this.jsl.inter.env.readFileSync('/js/windows/presentation.js', 'utf8') || '');
    if(!js_template.length) {
      this.jsl.inter.env.error('@presentation: bundled presentation runtime is missing.');
      return false;
    }
    return js_template.replace('%presentation_config%', JSON.stringify(config, false, 2));
  }

  /**
   * Builds globals.js for one browser presentation project.
   * @returns {string}
   */
  _buildPresentationGlobalsSource() {
    var strings = {
      '315': this.jsl.inter.lang.currentString(315),
      '316': this.jsl.inter.lang.currentString(316),
      '317': this.jsl.inter.lang.currentString(317),
      '318': this.jsl.inter.lang.currentString(318),
      '363': this.jsl.inter.lang.currentString(363),
      '542': this.jsl.inter.lang.currentString(542)
    };
    return [
      'window._standalone = window.location.protocol == "file:";',
      'window.presentation_resources = {"pdfjs":false,"plotly":false,"mathjax":false,"three":false,"ui":false};',
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
   * Writes all browser-feasible presentation project files.
   * @param {string} file_path
   * @param {Object} config
   */
  _writePresentationFiles(file_path, config) {
    var css_template = String(this.jsl.inter.env.readFileSync('/css/presentation.css', 'utf8') || '');
    var html_template = String(this.jsl.inter.env.readFileSync('/html/presentation.html', 'utf8') || '');
    var presentation_js;

    if(!css_template.length || !html_template.length) {
      this.jsl.inter.env.error('@presentation: bundled presentation assets are missing.');
      return false;
    }

    this._ensureDirectory(file_path);
    this._ensureDirectory(this.jsl.inter.env.pathJoin(file_path, 'res'));
    this._ensureDirectory(this.jsl.inter.env.pathJoin(file_path, 'res/internal'));

    presentation_js = this._buildPresentationRuntimeSource(config);
    if(presentation_js === false) {
      return false;
    }
    this.jsl.inter.env.writeFileSync(this.jsl.inter.env.pathJoin(file_path, 'res/internal/presentation.js'), presentation_js);
    this.jsl.inter.env.writeFileSync(this.jsl.inter.env.pathJoin(file_path, 'res/internal/presentation.css'), css_template);
    this.jsl.inter.env.writeFileSync(this.jsl.inter.env.pathJoin(file_path, 'res/internal/config.json'), JSON.stringify(config, false, 2));
    this.jsl.inter.env.writeFileSync(this.jsl.inter.env.pathJoin(file_path, 'main.css'),
      this._readWorkspaceTextOrDefault(this.jsl.inter.env.pathJoin(file_path, 'main.css'), ''));
    this.jsl.inter.env.writeFileSync(this.jsl.inter.env.pathJoin(file_path, 'main.js'),
      this._readWorkspaceTextOrDefault(this.jsl.inter.env.pathJoin(file_path, 'main.js'), ''));
    this.jsl.inter.env.writeFileSync(this.jsl.inter.env.pathJoin(file_path, 'index.html'),
      this._readWorkspaceTextOrDefault(
        this.jsl.inter.env.pathJoin(file_path, 'index.html'),
        html_template
          .replace('%presentation_scripts%', '')
          .replace('%presentation_stylesheets%', '')
      )
    );
    this._writePresentationGlobals(file_path);
    return true;
  }

  /**
   * Writes globals.js for one browser presentation project.
   * @param {string} file_path
   */
  _writePresentationGlobals(file_path) {
    this.jsl.inter.env.writeFileSync(
      this.jsl.inter.env.pathJoin(file_path, 'res/internal/globals.js'),
      this._buildPresentationGlobalsSource()
    );
  }

  /**
   * Reads config.json when present and falls back to defaults.
   * @param {string} file_path
   * @returns {Object}
   */
  _readPresentationConfig(file_path) {
    var config_path = this.jsl.inter.env.pathJoin(file_path, 'res/internal/config.json');
    var source = this.jsl.inter.env.readFileSync(config_path, 'utf8');
    var config = {
      jslab_version: this.jsl.context && this.jsl.context.version ? this.jsl.context.version : '',
      slide_width: 1920,
      slide_height: 1080,
      presentation_mode: 'online'
    };
    if(typeof source == 'string' && source.length) {
      try {
        config = Object.assign(config, JSON.parse(source));
      } catch {}
    }
    return config;
  }

  /**
   * Updates presentation mode in config and internal runtime.
   * @param {string} file_path
   * @param {string} mode
   * @returns {Promise<boolean>}
   */
  async _setPresentationMode(file_path, mode) {
    var config;
    file_path = await this._getPath(mode == 'online' ? 'makeOnlinePresentation' : 'makeStandalonePresentation', file_path);
    if(!file_path || !this._checkPresentation(mode == 'online' ? 'makeOnlinePresentation' : 'makeStandalonePresentation', file_path)) {
      return false;
    }
    config = this._readPresentationConfig(file_path);
    config.presentation_mode = mode;
    this._writePresentationFiles(file_path, config);
    return true;
  }

  /**
   * Ensures one workspace directory exists.
   * @param {string} dir_path
   */
  _ensureDirectory(dir_path) {
    this.jsl.inter.env.makeDirectory(dir_path);
  }

  /**
   * Reads workspace text when present, otherwise returns fallback.
   * @param {string} file_path
   * @param {string} fallback
   * @returns {string}
   */
  _readWorkspaceTextOrDefault(file_path, fallback) {
    var value = this.jsl.inter.env.readFileSync(file_path, 'utf8');
    return typeof value == 'string' && value.length ? value : fallback;
  }

  /**
   * Resolves a presentation root path.
   * @param {string} method
   * @param {string} file_path
   * @returns {Promise<string|false>}
   */
  async _getPath(method, file_path) {
    var picked;
    if(file_path) {
      return file_path;
    }
    if(typeof this.jsl.inter.env.showOpenDialog == 'function') {
      picked = await this.jsl.inter.env.showOpenDialog({
        title: this.jsl.inter.lang.currentString(239),
        buttonLabel: this.jsl.inter.lang.currentString(231),
        properties: ['openDirectory']
      });
      if(Array.isArray(picked) && picked.length) {
        return picked[0];
      }
    }
    this.jsl.inter.env.error('@' + method + ': ' + this.jsl.inter.lang.string(119) + '.');
    return false;
  }

  /**
   * Verifies that the workspace path looks like a presentation.
   * @param {string} method
   * @param {string} file_path
   * @returns {boolean}
   */
  _checkPresentation(method, file_path) {
    if(!this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'index.html'))) {
      this.jsl.inter.env.error('@' + method + ': ' + this.jsl.inter.lang.string(240));
      return false;
    }
    return true;
  }

  /**
   * Builds a browser preview document for one workspace presentation.
   * @param {string} root_path
   * @returns {string}
   */
  _buildPresentationDocument(root_path) {
    var normalized_root_path = this.jsl.inter.env.pathNormalize(root_path);
    var html_text = this.jsl.inter.file_system.readFile(
      this.jsl.inter.env.pathJoin(normalized_root_path, 'index.html'), 'utf8');
    var config = this._readPresentationConfig(normalized_root_path);
    var parser = new DOMParser();
    var doc = parser.parseFromString(String(html_text || ''), 'text/html');
    var obj = this;
    var resource_urls = {};
    var workspace_files = [];
    var standalone_mode = config.presentation_mode == 'standalone';
    var embedded_loader_override = [
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
    var csp_meta;

    function normalizePath(file_path) {
      return String(file_path || '').replace(/\\/g, '/').replace(/\/+/g, '/');
    }

    function joinPath(base_path, relative_path) {
      var rel = String(relative_path || '').replace(/\\/g, '/').trim();
      var parts;
      if(!rel.length) {
        return normalizePath(base_path);
      }
      if(rel.startsWith('/')) {
        return normalizePath(rel);
      }
      parts = normalizePath(base_path).split('/');
      rel.split('/').forEach(function(part) {
        if(!part.length || part == '.') {
          return;
        }
        if(part == '..') {
          if(parts.length > 1) {
            parts.pop();
          }
          return;
        }
        parts.push(part);
      });
      return normalizePath(parts.join('/'));
    }

    function toRelativePath(file_path) {
      var normalized = normalizePath(file_path);
      var prefix = normalized_root_path + '/';
      if(normalized == normalized_root_path) {
        return '';
      }
      if(normalized.startsWith(prefix)) {
        return normalized.slice(prefix.length);
      }
      return normalized.replace(/^\/+/, '');
    }

    function isLocalReference(url_text) {
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

    function getMimeType(file_path) {
      var ext = String(file_path || '').toLowerCase();
      if(ext.endsWith('.html') || ext.endsWith('.htm')) return 'text/html;charset=utf-8';
      if(ext.endsWith('.css')) return 'text/css;charset=utf-8';
      if(ext.endsWith('.js')) return 'text/javascript;charset=utf-8';
      if(ext.endsWith('.json')) return 'application/json;charset=utf-8';
      if(ext.endsWith('.svg')) return 'image/svg+xml';
      if(ext.endsWith('.png')) return 'image/png';
      if(ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'image/jpeg';
      if(ext.endsWith('.webp')) return 'image/webp';
      if(ext.endsWith('.gif')) return 'image/gif';
      if(ext.endsWith('.pdf')) return 'application/pdf';
      if(ext.endsWith('.woff')) return 'font/woff';
      if(ext.endsWith('.woff2')) return 'font/woff2';
      if(ext.endsWith('.ttf')) return 'font/ttf';
      return 'application/octet-stream';
    }

    function patchContentSecurityPolicy() {
      var content;
      if(!csp_meta) {
        return;
      }
      content = String(csp_meta.getAttribute('content') || '');
      if(/\bscript-src\b/i.test(content)) {
        content = content.replace(/script-src([^;]*)/i, function(match) {
          return /\bblob:\b/i.test(match) ? match : match + ' blob:';
        });
      } else {
        content = "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;" +
          (content.length ? ' ' + content : '');
      }
      csp_meta.setAttribute('content', content);
    }

    function storeResourceUrl(key, value) {
      var lower_key = String(key || '').toLowerCase();
      resource_urls[key] = value;
      if(lower_key && lower_key != key) {
        resource_urls[lower_key] = value;
      }
    }

    function shouldKeepStandaloneBufferedSrc(element, attribute) {
      var tag_name;
      if(!standalone_mode || attribute != 'src' || !element || !element.tagName) {
        return false;
      }
      tag_name = String(element.tagName || '').toLowerCase();
      return tag_name == 'img-pdf' || tag_name == 'plot-json' || tag_name == 'scene-3d-json';
    }

    function getResourceUrl(relative_path) {
      var file_path = normalizePath(this.jsl.inter.env.pathJoin(normalized_root_path, relative_path));
      var key = normalizePath(relative_path).replace(/^\/+/, '');
      var lower_key = key.toLowerCase();
      var bytes;
      var blob;
      if(resource_urls.hasOwnProperty(key)) {
        return resource_urls[key];
      }
      if(resource_urls.hasOwnProperty(lower_key)) {
        return resource_urls[lower_key];
      }
      if(standalone_mode &&
          /\.(?:pdf|json)$/i.test(file_path) &&
          this.jsl.inter.file_system.existFile(file_path + '.buf.js')) {
        return '';
      }
      if(!this.jsl.inter.file_system.existFile(file_path)) {
        return '';
      }
      bytes = this.jsl.inter.env.readFileSync(file_path);
      if(bytes === false || typeof bytes == 'undefined' || bytes === null) {
        return '';
      }
      blob = new Blob([bytes], { type: getMimeType(file_path) });
      storeResourceUrl(key, URL.createObjectURL(blob));
      return resource_urls[key];
    }

    function collectFilePaths(current_path) {
      var entries = obj.jsl.inter.file_system.readDir(current_path, { withFileTypes: true }) || [];
      entries.forEach(function(entry) {
        var child_path = obj.jsl.inter.env.pathJoin(current_path, entry.name);
        if(entry.isDirectory()) {
          collectFilePaths(child_path);
        } else if(entry.isFile()) {
          workspace_files.push(child_path);
        }
      });
    }

    function rewriteCssText(css_text, base_dir) {
      return String(css_text || '').replace(/url\((['"]?)([^'")]+)\1\)/gi, function(match, quote, value) {
        var resolved;
        if(!isLocalReference(value)) {
          return match;
        }
      resolved = getResourceUrl.call(obj, toRelativePath(joinPath(base_dir, value)));
      if(!resolved.length) {
        return match;
      }
        return 'url("' + resolved + '")';
      });
    }

    function rewriteElementResource(element, attribute, base_dir) {
      var value = element.getAttribute(attribute);
      var resolved;
      if(!value || !isLocalReference(value)) {
        return;
      }
      if(shouldKeepStandaloneBufferedSrc(element, attribute)) {
        return;
      }
      resolved = getResourceUrl.call(obj, toRelativePath(joinPath(base_dir, value)));
      if(resolved.length) {
        element.setAttribute(attribute, resolved);
      }
    }

    doc.head.querySelectorAll('link[rel="stylesheet"][href]').forEach(function(link) {
      var href = link.getAttribute('href');
      var resolved_path;
      var style;
      var css_value;
      if(!isLocalReference(href)) {
        return;
      }
      resolved_path = obj.jsl.inter.env.pathJoin(normalized_root_path, href);
      css_value = obj.jsl.inter.env.readFileSync(resolved_path, 'utf8');
      if(typeof css_value != 'string') {
        rewriteElementResource(link, 'href', normalized_root_path);
        return;
      }
      style = doc.createElement('style');
      style.textContent = rewriteCssText(css_value, obj.jsl.inter.env.pathDirName(resolved_path));
      link.replaceWith(style);
    });

    doc.querySelectorAll('script[src]').forEach(function(script) {
      var src = script.getAttribute('src');
      var resolved_path;
      var js_value;
      var inline_script;
      if(!isLocalReference(src)) {
        return;
      }
      resolved_path = obj.jsl.inter.env.pathJoin(normalized_root_path, src);
      resolved_path = normalizePath(resolved_path);
      if(/\/res\/internal\/presentation\.js$/i.test(resolved_path)) {
        js_value = obj._buildPresentationRuntimeSource(config);
      } else if(/\/res\/internal\/globals\.js$/i.test(resolved_path)) {
        js_value = obj._buildPresentationGlobalsSource();
      } else {
        js_value = obj.jsl.inter.env.readFileSync(resolved_path, 'utf8');
      }
      if(js_value === false || typeof js_value != 'string') {
        rewriteElementResource(script, 'src', normalized_root_path);
        return;
      }
      if(/\/res\/internal\/globals\.js$/i.test(resolved_path.replace(/\\/g, '/'))) {
        js_value += '\n' + embedded_loader_override;
      }
      inline_script = doc.createElement('script');
      inline_script.textContent = String(js_value || '');
      script.replaceWith(inline_script);
    });

    doc.querySelectorAll('[src]').forEach(function(node) {
      rewriteElementResource(node, 'src', normalized_root_path);
    });
    doc.querySelectorAll('[href]').forEach(function(node) {
      if(node.tagName && node.tagName.toLowerCase() == 'a') {
        return;
      }
      rewriteElementResource(node, 'href', normalized_root_path);
    });

    collectFilePaths(normalized_root_path);
    workspace_files.forEach(function(file_path) {
      getResourceUrl.call(obj, toRelativePath(file_path));
    });

    csp_meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
    patchContentSecurityPolicy();
    var icon_link = doc.createElement('link');
    icon_link.rel = 'icon';
    icon_link.href = 'data:,';
    doc.head.appendChild(icon_link);

    doc.head.appendChild(doc.createElement('style')).textContent = [
      'html, body {',
      '  width: 100%;',
      '  height: 100%;',
      '  margin: 0;',
      '  padding: 0;',
      '  overflow: hidden;',
      '}'
    ].join('\n');

    var bootstrap_script = doc.createElement('script');
    bootstrap_script.textContent = [
      '(function(){',
      '  window.__JSLAB_PRESENTATION_RESOURCE_MAP__ = ' + JSON.stringify(resource_urls) + ';',
      '  window.__JSLAB_PRESENTATION_EMBEDDED__ = true;',
      '  window.__JSLAB_PRESENTATION_BASE_URL__ = "";',
      '  var original_fetch = typeof window.fetch == "function" ? window.fetch.bind(window) : null;',
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
      '  if(original_fetch){',
      '    window.fetch = function(resource, init){',
      '      if(typeof resource == "string"){ return original_fetch(resolve(resource), init); }',
      '      if(resource && typeof resource.url == "string"){ return original_fetch(new Request(resolve(resource.url), resource), init); }',
      '      return original_fetch(resource, init);',
      '    };',
      '  }',
      '})();'
    ].join('\n');
    doc.head.insertBefore(bootstrap_script, doc.head.firstChild);

    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }
}

exports.PRDC_JSLAB_LIB_PRESENTATION_WEB = PRDC_JSLAB_LIB_PRESENTATION_WEB;
