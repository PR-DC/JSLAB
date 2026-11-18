/**
 * @file JSLAB Electron Simulate compiler adapter
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const fs = require('fs');
const { PRDC_APP_CONFIG } = require('../../config/config');

/**
 * Class for loading compiler assets from the desktop installation.
 */
class PRDC_JSLAB_SIMULATE_ASSETS {

  /**
   * Returns the configured solver bundle directory.
   * @returns {string} Absolute bundle path.
   */
  static getBundleRoot() {
    return path.resolve(__dirname, '../../lib', new PRDC_APP_CONFIG().SIMULATE_BUNDLE);
  }

  /**
   * Returns the installed compiler integration directory.
   * @returns {string} Absolute compiler library path.
   */
  static getCodeRoot() {
    return path.join(this.getBundleRoot(), 'js');
  }

  /**
   * Loads the compiler library without starting its solver.
   * @returns {Object} Compiler library exports.
   */
  static getLibrary() {
    return require(this.getCodeRoot());
  }

  /**
   * Loads value helpers without loading the full compiler integration.
   * @returns {Object} Value conversion exports.
   */
  static getValues() {
    return require(path.join(this.getCodeRoot(), 'values'));
  }

  /**
   * Reads the compiler-owned block stylesheet.
   * @returns {string} Icon styles.
   */
  static getIconStyles() {
    return fs.readFileSync(path.join(this.getCodeRoot(), '../css/icons.css'), 'utf8');
  }
}

exports.PRDC_JSLAB_SIMULATE_ASSETS = PRDC_JSLAB_SIMULATE_ASSETS;
