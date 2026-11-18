/**
 * @file Lazy Simulate metadata loading for development and compressed distributions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
/**
 * Class for reading installed compiler catalogs.
 */
class PRDC_OMJSL_ASSETS {

  /**
   * Reads compiler translations and catalogs from their owning directories.
   * @param {*} name Catalog, class or resource name.
   * @param {*} directory Owning library or review directory.
   */
  static readMetadata(name, directory = path.resolve(__dirname, '..')) {
    if(!/^[a-z][a-z-]*\.json$/.test(name)) {
      throw new Error('Invalid Simulate metadata name.');
    }
    var filename = path.join(directory, name == 'lang.json' ? 'config/' + name : 'metadata/' + name);
    if(cache.has(filename)) {
      return cache.get(filename);
    }
    var value = JSON.parse(fs.readFileSync(filename, 'utf8'));
    cache.set(filename, value);
    return value;
  }

}
var cache = new Map();
exports.readMetadata = PRDC_OMJSL_ASSETS.readMetadata;
