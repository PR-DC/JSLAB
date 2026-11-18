/**
 * @file JSLAB browser presentation resource and preview transport
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_PRESENTATION_CONTENT } = require('../windows/presentation-content');

/**
 * Adapts workspace storage and blob resources to embedded presentation previews.
 */
class PRDC_JSLAB_WEB_PRESENTATION_TRANSPORT {
  /**
   * Connects a shared presentation controller to browser host services.
   * @param {Object} presentation Shared presentation controller.
   */
  constructor(presentation) {
    this.presentation = presentation;
    this.jsl = presentation.jsl;
    const env = this.jsl.inter.env;
    this.embedded_preview = true;
    this.standalone_bundles = false;
    this.files = {
      existsSync: path => env.checkFile(path) || env.checkDirectory(path),
      readFileSync: (...args) => env.readFileSync(...args),
      writeFileSync: (...args) => env.writeFileSync(...args),
      readdirSync: (...args) => env.readDir(...args),
      mkdirSync: path => env.makeDirectory(path),
      rmSync: (...args) => env.rmSync(...args),
      statSync: path => ({ isDirectory: () => env.checkDirectory(path), isFile: () => env.checkFile(path) })
    };
    this.paths = {
      join: (...args) => env.pathJoin(...args),
      resolve: (...args) => env.pathResolve(env.pathJoin(...args)),
      dirname: path => env.pathDirName(path),
      extname: path => env.pathExtName(path),
      relative: (from, to) => env.pathRelative(from, to),
      isAbsolute: path => env.pathIsAbsolute(path),
      sep: '/'
    };
  }

  /**
   * Opens one presentation preview window in web mode.
   */
  async open(file_path) {
    var wid;
    var win;
    var context;
    var iframe;
    var root_name;
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
   * Builds a browser preview document for one workspace presentation.
   * @param {string} root_path
   * @returns {string}
   */
  _buildPresentationDocument(root_path) {
    if(this.jsl.inter.env.is_worker) {
      return this.jsl.inter.env.bridge.buildPresentationDocument(root_path);
    }
    var normalized_root_path = this.jsl.inter.env.pathNormalize(root_path);
    var html_text = this.jsl.inter.file_system.readFile(
      this.jsl.inter.env.pathJoin(normalized_root_path, 'index.html'), 'utf8');
    var config = this.presentation._readPresentationConfig(normalized_root_path);
    var parser = new DOMParser();
    var doc = parser.parseFromString(String(html_text || ''), 'text/html');
    var obj = this;
    var resource_urls = {};
    var workspace_files = [];
    var standalone_mode = config.presentation_mode == 'standalone';
    var embedded_loader_override = PRDC_JSLAB_PRESENTATION_CONTENT.embeddedLoaderSource(standalone_mode);
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
      return PRDC_JSLAB_PRESENTATION_CONTENT.isLocalReference(url_text);
    }

    function getMimeType(file_path) {
      var ext = String(file_path || '').toLowerCase();
      if(ext.endsWith('.html') || ext.endsWith('.htm')) {
        return 'text/html;charset=utf-8';
      }
      if(ext.endsWith('.css')) {
        return 'text/css;charset=utf-8';
      }
      if(ext.endsWith('.js')) {
        return 'text/javascript;charset=utf-8';
      }
      if(ext.endsWith('.json')) {
        return 'application/json;charset=utf-8';
      }
      if(ext.endsWith('.svg')) {
        return 'image/svg+xml';
      }
      if(ext.endsWith('.png')) {
        return 'image/png';
      }
      if(ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
        return 'image/jpeg';
      }
      if(ext.endsWith('.webp')) {
        return 'image/webp';
      }
      if(ext.endsWith('.gif')) {
        return 'image/gif';
      }
      if(ext.endsWith('.pdf')) {
        return 'application/pdf';
      }
      if(ext.endsWith('.woff')) {
        return 'font/woff';
      }
      if(ext.endsWith('.woff2')) {
        return 'font/woff2';
      }
      if(ext.endsWith('.ttf')) {
        return 'font/ttf';
      }
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
        js_value = obj.presentation._buildPresentationRuntimeSource(config);
      } else if(/\/res\/internal\/globals\.js$/i.test(resolved_path)) {
        js_value = obj.presentation._buildPresentationGlobalsSource();
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

exports.PRDC_JSLAB_WEB_PRESENTATION_TRANSPORT = PRDC_JSLAB_WEB_PRESENTATION_TRANSPORT;
