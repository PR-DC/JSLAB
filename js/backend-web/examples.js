/**
 * @file JSLAB Web bundled examples workspace
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WEB_FILES } = require('./files');

/**
 * Makes the curated examples editable through the browser workspace.
 */
class PRDC_JSLAB_WEB_EXAMPLES {

  /**
   * Connects to the browser workspace.
   * @param {Object} fs Browser workspace filesystem.
   */
  constructor(fs) {
    this.fs = fs;
  }

  /**
   * Creates one copy of each missing example and preserves workspace edits.
   * @returns {Promise<string>} Virtual examples folder.
   */
  prepare() {
    this.pending ||= this.install().finally(() => { this.pending = null; });
    return this.pending;
  }

  /**
   * Downloads the examples listed in the web build manifest.
   * @returns {Promise<string>} Virtual examples folder.
   */
  async install() {
    const root = '/workspace/examples';
    const assets = PRDC_JSLAB_WEB_FILES.resolveAssetUrl('examples/');
    const manifest = await this.fetch(assets + 'manifest.json');
    const files = await manifest.json();
    if(!Array.isArray(files) || !files.every(file => typeof file === 'string' &&
        file.split('/').every(part => /^[\w.-]+$/.test(part) && part !== '.' && part !== '..'))) {
      throw new Error('Invalid web examples manifest');
    }
    await Promise.all(files.map(async file => {
      const target = this.fs.join(root, file);
      if(this.fs.existsFileSync(target)) return;
      const response = await this.fetch(new URL(file, assets));
      const bytes = new Uint8Array(await response.arrayBuffer());
      if(!this.fs.existsFileSync(target)) await this.fs.writeBytes(target, bytes);
    }));
    return root;
  }

  /**
   * Loads a bundled examples resource.
   * @param {URL|string} url Resource URL.
   * @returns {Promise<Response>} Resource response.
   */
  async fetch(url) {
    const response = await fetch(url);
    if(!response.ok) throw new Error('Unable to load web example ' + url + ' (HTTP ' + response.status + ')');
    return response;
  }
}

exports.PRDC_JSLAB_WEB_EXAMPLES = PRDC_JSLAB_WEB_EXAMPLES;
