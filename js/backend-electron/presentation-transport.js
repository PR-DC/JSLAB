/**
 * @file JSLAB Electron presentation file serving and bundle transport
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const cp = require('child_process');

/**
 * Adapts native files, HTTP previews and the standalone module compiler.
 */
class PRDC_JSLAB_ELECTRON_PRESENTATION_TRANSPORT {
  /**
   * Connects the presentation controller to native resources.
   * @param {Object} presentation Shared presentation controller.
   */
  constructor(presentation) {
    this.presentation = presentation;
    this.jsl = presentation.jsl;
    this.files = fs;
    this.paths = path;
    this.presentation_servers = new Map();
    this.embedded_preview = false;
    this.standalone_bundles = true;
  }

  /**
   * Creates a temporary native directory for standalone module compilation.
   * @returns {string} Temporary directory.
   */
  createTempDirectory() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-presentation-esbuild-'));
  }

  /**
   * Runs the standalone module compiler with the prepared shared arguments.
   * @param {Array<string>} args Compiler arguments.
   */
  bundle(args) {
    cp.execFileSync(this._getEsbuildExecutable(), args, { windowsHide: true });
  }

  /**
   * Starts or reuses the internal HTTP server that serves the presentation.
   * @param {String} file_path - Absolute path to the presentation directory.
   * @returns {Promise<String>} Resolves to the presentation URL.
   */
  _startPresentation(file_path) {
    var key = path.resolve(file_path);
    var cached = this.presentation_servers.get(key);
    if(cached) {
      if(cached.url) {
        return Promise.resolve(cached.url);
      }
      if(cached.promise) {
        return cached.promise;
      }
    }

    var promise = new Promise((resolve, reject) => {
      var server = http.createServer(this._handlePresentationRequest.bind(this, key));
      server.once('error', (err) => {
        this.presentation_servers.delete(key);
        reject(err);
      });
      server.listen(0, '127.0.0.1', () => {
        var address = server.address();
        var url = 'http://127.0.0.1:' + address.port + '/';
        this.presentation_servers.set(key, {
          root_path: key,
          server: server,
          url: url
        });
        resolve(url);
      });
    });

    this.presentation_servers.set(key, { promise: promise });
    return promise;
  }

  /**
   * Stops the internal HTTP server for one presentation.
   * @param {String} file_path - Absolute or relative path to the presentation directory.
   */
  _stopPresentationServer(file_path) {
    var key = path.resolve(file_path);
    var cached = this.presentation_servers.get(key);
    if(cached && cached.server) {
      cached.server.close();
    }
    this.presentation_servers.delete(key);
  }

  /**
   * Handles one internal presentation HTTP request.
   * @param {String} root_path - Absolute path to the presentation directory.
   * @param {Object} req
   * @param {Object} res
   */
  _handlePresentationRequest(root_path, req, res) {
    if(req.method != 'GET' && req.method != 'HEAD') {
      res.writeHead(405, { 'Allow': 'GET, HEAD' });
      res.end();
      return;
    }

    var req_url;
    try {
      req_url = new URL(req.url, 'http://127.0.0.1');
    } catch(err) {
      res.writeHead(400);
      res.end();
      return;
    }

    if(req_url.pathname == '/keepalive') {
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      res.end();
      return;
    }

    var rel_path = req_url.pathname == '/' ? '/index.html' : req_url.pathname;
    var file_path;
    try {
      file_path = path.resolve(root_path, '.' + decodeURIComponent(rel_path));
    } catch(err) {
      res.writeHead(400);
      res.end();
      return;
    }

    var root_norm = path.resolve(root_path);
    var file_norm = path.resolve(file_path);
    if(file_norm != root_norm &&
        !file_norm.toLowerCase().startsWith((root_norm + path.sep).toLowerCase())) {
      res.writeHead(403);
      res.end();
      return;
    }

    this._servePresentationPath(req, res, root_norm, file_norm);
  }

  /**
   * Serves one static file from the internal presentation HTTP server.
   * @param {Object} req
   * @param {Object} res
   * @param {String} root_path
   * @param {String} file_path
   */
  _servePresentationPath(req, res, root_path, file_path) {
    fs.stat(file_path, (err, stats) => {
      if(err) {
        res.writeHead(404);
        res.end();
        return;
      }

      if(stats.isDirectory()) {
        this._servePresentationPath(req, res, root_path,
          path.join(file_path, 'index.html'));
        return;
      }

      var headers = {
        'Content-Type': this._getPresentationContentType(file_path),
        'Cache-Control': 'no-store',
        'Accept-Ranges': 'bytes'
      };

      var start = 0;
      var end = stats.size - 1;
      var status = 200;
      var range = req.headers.range;
      if(typeof range == 'string') {
        var match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if(match) {
          if(match[1]) {
            start = parseInt(match[1], 10);
          } else if(match[2]) {
            start = Math.max(0, stats.size - parseInt(match[2], 10));
          }
          if(match[2]) {
            end = parseInt(match[2], 10);
          }
          if(!match[1]) {
            end = stats.size - 1;
          }
          if(start > end || start >= stats.size) {
            res.writeHead(416, {
              'Content-Range': 'bytes */' + stats.size,
              'Cache-Control': 'no-store'
            });
            res.end();
            return;
          }
          end = Math.min(end, stats.size - 1);
          status = 206;
          headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stats.size;
        }
      }

      headers['Content-Length'] = String(end - start + 1);
      res.writeHead(status, headers);
      if(req.method == 'HEAD') {
        res.end();
        return;
      }

      var stream = fs.createReadStream(file_path, { start: start, end: end });
      stream.on('error', function() {
        if(!res.headersSent) {
          res.writeHead(500);
        }
        res.end();
      });
      stream.pipe(res);
    });
  }

  /**
   * Returns the HTTP content type for one served presentation asset.
   * @param {String} file_path
   * @returns {String}
   */
  _getPresentationContentType(file_path) {
    var ext = path.extname(file_path).toLowerCase();
    var types = {
      '.css': 'text/css; charset=utf-8',
      '.gif': 'image/gif',
      '.htm': 'text/html; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.map': 'application/json; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.ogg': 'audio/ogg',
      '.otf': 'font/otf',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain; charset=utf-8',
      '.ttf': 'font/ttf',
      '.wasm': 'application/wasm',
      '.webm': 'video/webm',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2'
    };
    return types[ext] || 'application/octet-stream';
  }

  /**
   * Returns the esbuild executable path for the current platform.
   * @returns {String}
   */
  _getEsbuildExecutable() {
    var pkg_dir = path.dirname(require.resolve(
      '@esbuild/' + process.platform + '-' + process.arch + '/package.json'));
    if(process.platform == 'win32') {
      return path.join(pkg_dir, 'esbuild.exe');
    }
    return path.join(pkg_dir, 'bin', 'esbuild');
  }
  /**
   * Opens a native file preview or a served presentation in its managed window.
   * @param {string} file_path Presentation directory.
   * @param {string} type Optional mode override.
   * @returns {Promise<Window>} Preview context.
   */
  async open(file_path, type) {
    var obj = this;
    var presentation_type = type || this.presentation._getPresentationMode(file_path);
    if(presentation_type == 'standalone') {
      var url = this.jsl.inter.env.pathJoin(file_path, 'index.html');
      var wid = this.jsl.inter.windows.openWindow(url);
    } else {
      var url = await this.presentation._startPresentation(file_path);
      var wid = this.jsl.inter.windows.openWindow('url.html');
    }
    await this.jsl.inter.windows.open_windows[wid].ready;
    var context = this.jsl.inter.windows.open_windows[wid].context;
    var fullscreen = false;
    if(presentation_type == 'standalone') {
      while(typeof context.presentation == 'undefined') {
        await this.jsl.inter.non_blocking.waitMSeconds(1);
      }
      context.document.addEventListener('keydown', (event) => {
        if(event.key == 'F11') {
          fullscreen = !fullscreen;
          obj.jsl.inter.windows.open_windows[wid].setFullscreen(fullscreen);
        }
      });
    } else {
      context.document.getElementById('webview').src = url;
      context.document.addEventListener('keydown', function(event) {
        var key = event.key ? event.key.toLowerCase() : '';
        if(event.ctrlKey && !event.altKey && !event.shiftKey &&
            key === 's') {
          event.preventDefault();
          context.webview.send('data', { toggle_slide_nav: true });
        } else if(!event.ctrlKey && !event.altKey && !event.shiftKey &&
            event.key == 'F9') {
          event.preventDefault();
          context.webview.send('data', { toggle_stopwatch: true });
        }
      });
      context.webview.addEventListener('ipc-message', (e) => {
        if(e.args[0].key !== undefined) {
          if(e.args[0].key == 'F11') {
            fullscreen = !fullscreen;
            obj.jsl.inter.windows.open_windows[wid].setFullscreen(fullscreen);
          }
        }
      });
    }
    var presentation_title = this.jsl.inter.lang.currentString(514);
    this.jsl.inter.windows.open_windows[wid].setTitle(file_path + ' - ' + presentation_title);
    return context;
}

  /**
   * Resolves the URL accepted by the native editor preview element.
   * @param {string} file_path Presentation directory.
   * @param {string} type Optional mode override.
   * @returns {Promise<string>} File path or loopback URL.
   */
  async editorLocation(file_path, type) {
    return (type || this.presentation._getPresentationMode(file_path)) === 'standalone'
      ? this.jsl.inter.env.pathJoin(file_path, 'index.html')
      : this.presentation._startPresentation(file_path);
  }

  /**
   * Relays fullscreen requests from the native embedded preview.
   * @param {Window} context Editor context.
   * @param {Function} toggle Toggle fullscreen.
   */
  bindEditor(context, toggle) {
    context.preview.addEventListener('ipc-message', event => {
      if(event.args[0].key === 'F11') {
        toggle();
      }
    });
  }

}

exports.PRDC_JSLAB_ELECTRON_PRESENTATION_TRANSPORT = PRDC_JSLAB_ELECTRON_PRESENTATION_TRANSPORT;
