/**
 * @file JSLAB browser Simulate compiler adapter
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_APP_CONFIG } = require('../../config/config');

/**
 * Class for loading browser compiler metadata when Simulate is opened.
 */
class PRDC_JSLAB_SIMULATE_ASSETS {

  /**
   * Returns the compiler bundle URL relative to the application root.
   * @returns {string} Absolute bundle URL.
   */
  static getBundleRoot() {
    var owner = globalThis.parent && globalThis.parent.__JSLAB_WEB_BRIDGE__ ? globalThis.parent : globalThis;
    return new URL('./lib/' + new PRDC_APP_CONFIG().SIMULATE_BUNDLE + '/', owner.document.baseURI).href;
  }

  /**
   * Returns the compiler integration URL.
   * @returns {string} Absolute compiler library URL.
   */
  static getCodeRoot() {
    return new URL('js/', this.getBundleRoot()).href;
  }

  /**
   * Reads and validates the manifest shared by browser compiler operations.
   * @returns {Promise<Object>} Verified integration version and resource hashes.
   */
  static async getManifest() {
    if(!this._manifest) {
      this._manifest = (async () => {
        const response = await fetch(new URL('manifest.json', this.getBundleRoot()), { cache: 'no-cache' });
        if(!response.ok) {
          throw new Error('Unable to load the solver manifest: ' + response.status);
        }
        const manifest = await response.json();
        if(!/^[a-f0-9]{64}$/.test(manifest.integration?.content_sha256 || '')) {
          throw new Error('Invalid solver integration version.');
        }
        return manifest;
      })().catch(error => {
        this._manifest = null;
        throw error;
      });
    }
    return this._manifest;
  }

  /**
   * Returns the versioned compiler entry used by windows and workspace requests.
   * @returns {Promise<string>} Browser compiler library URL.
   */
  static async getLibraryURL() {
    const manifest = await this.getManifest();
    return this.getCodeRoot() + 'browser.js?version=' + manifest.integration.content_sha256;
  }

  /**
   * Downloads and validates compiler catalogs without starting the solver.
   * @returns {Promise<Object>} Initialized compiler integration.
   */
  static async initialize() {
    if(!this._ready) {
      this._ready = (async () => {
        const manifest = await this.getManifest();
        const entry = await import(await this.getLibraryURL());
        this._library = await entry.initialize({ baseURL: this.getCodeRoot(), manifest });
        const response = await fetch(new URL('../css/icons.css?content=' + manifest.files['css/icons.css'], this.getCodeRoot()));
        if(!response.ok) {
          throw new Error('Unable to load block icon styles: ' + response.status);
        }
        this._icon_styles = await response.text();
        return this._library;
      })().catch(error => {
        this._ready = null;
        throw error;
      });
    }
    return this._ready;
  }

  /**
   * Returns the initialized compiler exports.
   * @returns {Object} Compiler library exports.
   */
  static getLibrary() {
    if(!this._library) {
      throw new Error('Initialize the Simulate compiler integration first.');
    }
    return this._library;
  }

  /**
   * Returns the initialized value conversion API.
   * @returns {Object} Compiler value helpers.
   */
  static getValues() {
    return this.getLibrary();
  }

  /**
   * Returns the loaded block stylesheet.
   * @returns {string} Icon styles.
   */
  static getIconStyles() {
    if(typeof this._icon_styles != 'string') {
      throw new Error('Block icon styles have not loaded.');
    }
    return this._icon_styles;
  }
}

exports.PRDC_JSLAB_SIMULATE_ASSETS = PRDC_JSLAB_SIMULATE_ASSETS;
