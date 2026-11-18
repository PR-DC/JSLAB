/**
 * @file JSLAB Simulate compiler library integration
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


/**
 * Class for accessing the selected compiler library from JSLAB.
 */
class PRDC_JSLAB_SIMULATE_COMPILER {

  /**
   * Connects compiler operations to the active platform backend.
   * @param {Object} platform Desktop or browser compiler adapter.
   */
  static configure(platform) {
    this._platform = platform;
  }


  /**
   * Returns the installed directory of the configured compiler bundle.
   * @returns {string} Absolute bundle directory.
   */
  static getBundleRoot() {
    return this._platform.getBundleRoot();
  }

  /**
   * Returns the compiler library's host integration directory.
   * @returns {string} Absolute compiler library directory.
   */
  static getCodeRoot() {
    return this._platform.getCodeRoot();
  }

  /**
   * Loads compiler-owned APIs and catalogs without starting the solver.
   * @returns {Object} Compiler library exports.
   */
  static getLibrary() {
    return this._platform.getLibrary();
  }

  /**
   * Reads a compiler-owned message from the selected library catalog.
   * @param {number|string} id Library translation identifier.
   * @param {string} language Selected interface language.
   * @returns {string} Translated library message.
   */
  static getText(id, language = 'en') {
    return this.getLibrary().translatedLibraryText(id, language);
  }

  /**
   * Returns the compiler catalog under its ordered omjsl-* identifiers.
   * @returns {Object} Namespaced translation identifiers and language entries.
   */
  static getLanguageStrings() {
    return this.getLibrary().readMetadata('lang.json');
  }

  /**
   * Loads value conversion helpers without loading compiler catalogs.
   * @returns {Object} Compiler value conversion exports.
   */
  static getValues() {
    return this._platform.getValues();
  }

  /**
   * Reads compiler-owned icon styling for the model viewer.
   * @returns {string} Block icon stylesheet.
   */
  static getIconStyles() {
    return this._platform.getIconStyles();
  }

  /**
   * Creates a solver client and translates progress events for the window.
   * @param {string} app_path Application directory.
   * @param {Function} status_callback Receives translated progress events.
   * @returns {Object} Compiler library client.
   */
  static createClient(app_path, status_callback) {
    const { PRDC_OMJSL_CLIENT } = this.getLibrary();
    const status_ids = {
      'retrieving-resource': "omjsl-6", building: "omjsl-9", simulating: "omjsl-10",
      'loading-solver-progress': "omjsl-11", 'loading-solver-bytes': "omjsl-12",
      'downloading-solver-progress': "omjsl-13", 'downloading-solver-bytes': "omjsl-14",
      'loading-library': "omjsl-15", 'loading-library-progress': "omjsl-16", 'loading-library-bytes': "omjsl-17",
      parsing: "omjsl-25", instantiating: "omjsl-26", compiling: "omjsl-27"
    };
    return new PRDC_OMJSL_CLIENT(app_path, function(status) {
      if(typeof status_callback == 'function') {
        status_callback(status && status.event ?
          Object.assign({}, status, { id: status_ids[status.event] }) : status);
      }
    });
  }
}

exports.PRDC_JSLAB_SIMULATE_COMPILER = PRDC_JSLAB_SIMULATE_COMPILER;
