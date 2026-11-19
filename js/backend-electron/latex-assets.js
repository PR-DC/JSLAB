/**
 * @file Serves the packaged TeX Live files to Electron compiler workers
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { app, net, protocol } = require('electron');
const { folder } = require('../../config/texlive.json');

/**
 * Exposes only the bundled TeX Live directory through a local URL scheme.
 */
class PRDC_JSLAB_ELECTRON_LATEX_ASSETS {
  /**
   * Registers the scheme before Electron creates any renderer.
   */
  static register() {
    protocol.registerSchemesAsPrivileged([{ scheme: 'jslab-tex', privileges: {
      standard: true, secure: true, supportFetchAPI: true, corsEnabled: true
    } }]);
    app.whenReady().then(() => protocol.handle('jslab-tex', request => this.read(request)));
  }

  /**
   * Resolves a request inside the bundled asset tree and streams the local file.
   * @param {Request} request Electron protocol request.
   * @returns {Promise<Response>} Local asset response or a 404.
   */
  static async read(request) {
    const headers = { 'Access-Control-Allow-Origin': '*' };
    const missing = () => new Response(null, { status: 404, headers });
    if(request.method !== 'GET') return missing();
    const url = new URL(request.url);
    if(url.host !== 'assets') return missing();
    const root = await fs.realpath(path.join(app.getAppPath(), 'lib', folder)).catch(() => null);
    if(!root) return missing();
    let name;
    try {
      name = decodeURIComponent(url.pathname);
    } catch {
      return missing();
    }
    if(name.includes('\\') || name.includes('\0') ||
        !/^\/(?:engine\/[^/]+$|manifest\.json$)/.test(name)) return missing();
    const file = await fs.realpath(path.resolve(root, '.' + name)).catch(() => null);
    if(!file) return missing();
    const relative = path.relative(root, file);
    if(path.isAbsolute(relative) || relative.split(path.sep)[0] === '..' ||
        !(await fs.stat(file).catch(() => null))?.isFile()) return missing();
    const response = await net.fetch(pathToFileURL(file).href);
    for(const [name, value] of response.headers) headers[name] = value;
    return new Response(response.body, { status: response.status, headers });
  }
}

exports.PRDC_JSLAB_ELECTRON_LATEX_ASSETS = PRDC_JSLAB_ELECTRON_LATEX_ASSETS;
