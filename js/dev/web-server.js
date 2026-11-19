/**
 * @file JSLAB loopback server for local web builds
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');

const content_types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain'
};

/**
 * Serves a JSLAB web build with the isolation headers required by the sandbox worker.
 */
class PRDC_JSLAB_DEV_WEB_SERVER {

  /**
   * Starts a server bound to the IPv4 loopback address.
   * @param {string} folder Build directory.
   * @param {Object} [options] Listener options.
   * @param {number} [options.port=0] Local port, or zero to allocate one.
   * @param {Function} [options.onRequest] Records an incoming request.
   * @returns {Promise<Object>} HTTP server and its base URL.
   */
  static async listen(folder, { port = 0, onRequest } = {}) {
    const root = await fs.promises.realpath(folder);
    const server = http.createServer((request, response) => {
      onRequest?.(request.url);
      void this.serve(root, request, response).catch(() => {
        if(!response.headersSent) response.writeHead(500).end();
        else response.destroy();
      });
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', reject);
        resolve();
      });
    });
    return { server, base: 'http://127.0.0.1:' + server.address().port };
  }

  /**
   * Sends a static asset within the selected build directory.
   * @param {string} root Canonical build directory.
   * @param {Object} request HTTP request.
   * @param {Object} response HTTP response.
   */
  static async serve(root, request, response) {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    response.setHeader('Cache-Control', 'no-cache');
    if(request.method !== 'GET' && request.method !== 'HEAD') {
      return response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    }
    let requested;
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      requested = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    } catch(error) {
      return response.writeHead(400).end();
    }
    const filename = await fs.promises.realpath(requested).catch(() => null);
    if(!filename) return response.writeHead(404).end();
    const relative = path.relative(root, filename);
    if(path.isAbsolute(relative) || relative.split(path.sep)[0] === '..') {
      return response.writeHead(403).end();
    }
    const stat = await fs.promises.stat(filename).catch(() => null);
    if(!stat?.isFile()) return response.writeHead(404).end();
    response.writeHead(200, {
      'Content-Type': content_types[path.extname(filename).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size
    });
    if(request.method === 'HEAD') return response.end();
    await pipeline(fs.createReadStream(filename), response);
  }
}

exports.PRDC_JSLAB_DEV_WEB_SERVER = PRDC_JSLAB_DEV_WEB_SERVER;
