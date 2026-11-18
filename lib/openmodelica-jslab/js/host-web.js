/**
 * @file Browser host operations for the shared compiler client
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for browser compiler worker and resource operations.
 */
class PRDC_OMJSL_HOST_WEB {

  /**
   * Stores the browser library URL and content version used for new workers.
   * @param {*} base_url Base url.
   * @param {*} version Version.
   */
  static setWorkerRoot(base_url, version) {
    worker_root = new URL(base_url).href;
    library_version = String(version);
  }

  /**
   * Returns the configured compiler worker URL with its content version.
   */
  static workerURL() {
    if(!worker_root) {
      throw new Error('Initialize the browser compiler library before starting the solver.');
    }
    var url = new URL('worker.js', worker_root);
    url.searchParams.set('version', library_version);
    return url.href;
  }

  /**
   * Decodes a project resource with browser base64 APIs.
   * @param {*} value Value to inspect or convert.
   */
  static decodeLibraryFile(value) {
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
  }

}
var worker_root = null;
var library_version = '';
exports.setWorkerRoot = PRDC_OMJSL_HOST_WEB.setWorkerRoot;
exports.workerURL = PRDC_OMJSL_HOST_WEB.workerURL;
exports.decodeLibraryFile = PRDC_OMJSL_HOST_WEB.decodeLibraryFile;
