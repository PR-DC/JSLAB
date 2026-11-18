/**
 * @file JSLAB browser application storage
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_STORAGE } = require('../other-shared/storage');

/**
 * Persists application settings and keeps secrets in page memory.
 */
class PRDC_JSLAB_WEB_STORAGE extends PRDC_JSLAB_STORAGE {

  /**
   * Creates application storage backed by localStorage when available.
   * @param {string} namespace
   */
  constructor(namespace) {
    super();
    this.namespace = namespace || 'jslab-web';
    this.storage = null;
    this._secrets = new Map();

    try {
      this.storage = globalThis.localStorage || null;
      this._legacy = this.storage;
    } catch{
      this.storage = null;
    }
  }


  /**
   * Reads and decodes a namespaced browser setting.
   * @param {string} key Setting name.
   * @returns {*} Stored value or undefined.
   */
  _read(key) {
    const raw = this.storage?.getItem(this._key(key));
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : undefined;
    } catch{
      return undefined;
    }
  }

  /**
   * Encodes and writes a namespaced browser setting.
   * @param {string} key Setting name.
   * @param {*} value Setting value.
   */
  _write(key, value) {
    this.storage?.setItem(this._key(key), JSON.stringify(value));
  }

  /**
   * Removes a namespaced browser setting.
   * @param {string} key Setting name.
   */
  _remove(key) {
    this.storage?.removeItem(this._key(key));
  }

  /**
   * Lists setting names belonging to this browser namespace.
   * @returns {Array<string>} Stored setting names.
   */
  _keys() {
    const prefix = this._key('');
    const keys = [];
    for(let index = 0; index < (this.storage?.length || 0); index++) {
      const key = this.storage.key(index);
      if(key?.startsWith(prefix)) {
        keys.push(key.slice(prefix.length));
      }
    }
    return keys;
  }

  /**
   * Clears this namespace's settings and its in-memory secrets.
   */
  clear() {
    super.clear();
    this._secrets.clear();
  }

  /**
   * Reports whether a secret is available in this page.
   * @param {string} key Secret name.
   * @returns {boolean} Whether the secret is present.
   */
  hasSecret(key) {
    return this._secrets.has(key);
  }

  /**
   * Reads a secret without accessing persistent browser storage.
   * @param {string} key Secret name.
   * @returns {string} Secret value, or an empty string when absent.
   */
  getSecret(key) {
    return this._secrets.get(key) || '';
  }

  /**
   * Keeps a secret for this application page's lifetime.
   * @param {string} key Secret name.
   * @param {string} value Secret value.
   */
  setSecret(key, value) {
    this._secrets.set(key, value);
  }

  /**
   * Discards a secret from page memory.
   * @param {string} key Secret name.
   */
  deleteSecret(key) {
    this._secrets.delete(key);
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

exports.PRDC_JSLAB_WEB_STORAGE = PRDC_JSLAB_WEB_STORAGE;
