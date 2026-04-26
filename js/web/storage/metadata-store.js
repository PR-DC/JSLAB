/**
 * @file Small metadata store for browser-only JSLAB state
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

class PRDC_JSLAB_WEB_METADATA_STORE {

  /**
   * Creates a metadata store backed by localStorage when available.
   * @param {string} namespace
   */
  constructor(namespace) {
    this.namespace = namespace || 'jslab-web';
    this.storage = null;

    try {
      this.storage = globalThis.localStorage || null;
    } catch {
      this.storage = null;
    }
  }

  /**
   * Reads a JSON value from the store.
   * @param {string} key
   * @param {*} fallback
   * @returns {*}
   */
  get(key, fallback) {
    if(!this.storage) {
      return fallback;
    }
    var raw = this.storage.getItem(this._key(key));
    if(typeof raw != 'string') {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /**
   * Writes a JSON value to the store.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if(!this.storage) {
      return;
    }
    this.storage.setItem(this._key(key), JSON.stringify(value));
  }

  /**
   * Removes a value from the store.
   * @param {string} key
   */
  remove(key) {
    if(!this.storage) {
      return;
    }
    this.storage.removeItem(this._key(key));
  }

  /**
   * Builds a namespaced key.
   * @param {string} key
   * @returns {string}
   */
  _key(key) {
    return this.namespace + ':' + key;
  }
}

exports.PRDC_JSLAB_WEB_METADATA_STORE = PRDC_JSLAB_WEB_METADATA_STORE;
