/**
 * @file JSLAB application settings and storage migration
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Owns setting operations while backend adapters implement persistence.
 */
class PRDC_JSLAB_STORAGE {
  /**
   * Reads a setting, migrating older renderer values when necessary.
   * @param {string} key Setting name.
   * @param {*} fallback Value returned when no setting is available.
   * @returns {*} Stored value or fallback.
   */
  get(key, fallback) {
    const value = this._read(key);
    if(value !== undefined) {
      return value;
    }
    try {
      const raw = this._legacy?.getItem(key);
      if(typeof raw === 'string') {
        const migrated = JSON.parse(raw);
        this.set(key, migrated);
        this._legacy.removeItem(key);
        return migrated;
      }
    } catch{}
    return fallback;
  }

  /**
   * Persists an application setting through the owning backend.
   * @param {string} key Setting name.
   * @param {*} value Setting value.
   */
  set(key, value) {
    this._write(key, value);
  }

  /**
   * Reports whether a setting exists, including values awaiting migration.
   * @param {string} key Setting name.
   * @returns {boolean} Whether a value is available.
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Removes a setting and its older renderer-storage value.
   * @param {string} key Setting name.
   */
  delete(key) {
    this._remove(key);
    try {
      this._legacy?.removeItem(key);
    } catch{}
  }

  /**
   * Clears settings owned by this storage instance.
   */
  clear() {
    this._keys().forEach(key => this.delete(key));
  }
}

exports.PRDC_JSLAB_STORAGE = PRDC_JSLAB_STORAGE;
