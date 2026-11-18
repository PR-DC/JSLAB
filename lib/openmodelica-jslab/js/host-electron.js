/**
 * @file Node host operations for the shared compiler client
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const {
  pathToFileURL
} = require('url');
/**
 * Class for native compiler worker and resource operations.
 */
class PRDC_OMJSL_HOST_ELECTRON {

  /**
   * Resolves the installed compiler worker to a file URL.
   */
  static workerURL() {
    return pathToFileURL(path.join(__dirname, 'worker.js')).href;
  }

  /**
   * Decodes a project resource from base64 into its original bytes.
   * @param {*} value Value to inspect or convert.
   */
  static decodeLibraryFile(value) {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }

}
exports.workerURL = PRDC_OMJSL_HOST_ELECTRON.workerURL;
exports.decodeLibraryFile = PRDC_OMJSL_HOST_ELECTRON.decodeLibraryFile;
