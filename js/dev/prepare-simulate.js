/**
 * @file Selects the Simulate solver bundle for desktop packaging
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const fs = require('fs');
const path = require('path');

/**
 * Class for selecting solver assets during desktop packaging.
 */
class PRDC_JSLAB_PREPARE_SIMULATE {

  /**
   * Excludes inactive solver versions without modifying installed libraries.
   * @param {Object} context Electron Builder packaging context.
   */
  static beforePack(context) {
    const root = context.packager.info.appDir;
    const { PRDC_APP_CONFIG } = require(path.join(root, 'config/config.js'));
    const selected = new PRDC_APP_CONFIG().SIMULATE_BUNDLE;
    if(typeof selected != 'string' || !/^openmodelica-[a-zA-Z0-9._-]+$/.test(selected)) {
      throw new Error('Invalid Simulate solver bundle selection.');
    }
    const library = path.join(root, 'lib');
    if(!fs.existsSync(path.join(library, selected, 'manifest.json'))) {
      throw new Error('The selected Simulate solver bundle is not installed: ' + selected);
    }
    const files = context.packager.config.files;
    if(!Array.isArray(files)) {
      throw new Error('Desktop packaging requires explicit file patterns.');
    }
    for(const entry of fs.readdirSync(library, { withFileTypes: true })) {
      if(entry.isDirectory() && entry.name.startsWith('openmodelica-') && entry.name != selected) {
        const pattern = '!lib/' + entry.name + '{,/**/*}';
        if(!files.includes(pattern)) {
          files.push(pattern);
        }
      }
    }
  }
}

exports.PRDC_JSLAB_PREPARE_SIMULATE = PRDC_JSLAB_PREPARE_SIMULATE;
exports.beforePack = PRDC_JSLAB_PREPARE_SIMULATE.beforePack;
