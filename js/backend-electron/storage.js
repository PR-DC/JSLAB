/**
 * @file JSLAB Electron application storage
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const Store = require('electron-store');
const { PRDC_JSLAB_STORAGE } = require('../other-shared/storage');
const { safeStorage } = require('electron');

/**
 * Stores application settings and encrypts secrets with operating-system storage.
 */
class PRDC_JSLAB_ELECTRON_STORAGE extends PRDC_JSLAB_STORAGE {
  /**
   * Connects native settings and optional older renderer storage.
   * @param {Object} [options] Native settings options.
   */
  constructor(options) {
    super();
    this._settings = new Store(options);
    try {
      this._legacy = globalThis.localStorage;
    } catch{}
  }

  /**
   * Reads a value from native application settings.
   * @param {string} key Setting name.
   * @returns {*} Stored value.
   */
  _read(key) {
    return this._settings.get(key);
  }

  /**
   * Writes a value to native application settings.
   * @param {string} key Setting name.
   * @param {*} value Setting value.
   */
  _write(key, value) {
    this._settings.set(key, value);
  }

  /**
   * Removes a native application setting.
   * @param {string} key Setting name.
   */
  _remove(key) {
    this._settings.delete(key);
  }

  /**
   * Lists all native application setting names.
   * @returns {Array<string>} Stored setting names.
   */
  _keys() {
    return Object.keys(this._settings.store);
  }


  /**
   * Reports whether an encrypted secret is present without decrypting it.
   * @param {string} key Secret name.
   * @returns {boolean} Whether the secret is stored.
   */
  hasSecret(key) {
    return !!this.get(key + '-encrypted');
  }

  /**
   * Decrypts a stored secret for its caller.
   * @param {string} key Secret name.
   * @returns {string} Secret value, or an empty string when absent.
   */
  getSecret(key) {
    const encoded = this.get(key + '-encrypted');
    return encoded ? this._secureStorage().decryptString(Buffer.from(encoded, 'base64')) : '';
  }

  /**
   * Encrypts a secret before writing application storage.
   * @param {string} key Secret name.
   * @param {string} value Secret value.
   */
  setSecret(key, value) {
    this.set(key + '-encrypted', this._secureStorage().encryptString(value).toString('base64'));
  }

  /**
   * Removes a secret from application storage.
   * @param {string} key Secret name.
   */
  deleteSecret(key) {
    this.delete(key + '-encrypted');
  }

  /**
   * Requires operating-system encryption before accessing secret contents.
   * @returns {Object} Electron secure-storage service.
   */
  _secureStorage() {
    if(!safeStorage || !safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure credential storage is unavailable on this system.');
    }
    return safeStorage;
  }
}

exports.PRDC_JSLAB_ELECTRON_STORAGE = PRDC_JSLAB_ELECTRON_STORAGE;
