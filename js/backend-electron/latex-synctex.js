/**
 * @file JSLAB LaTeX SyncTeX text positions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { createReadStream } = require('node:fs');
const { createGunzip } = require('node:zlib');
const { createInterface } = require('node:readline');
const { pipeline } = require('node:stream/promises');
const path = require('node:path');

const { PRDC_JSLAB_LATEX_SYNCTEX } = require('../other-shared/latex-synctex');

/**
 * Reads compressed SyncTeX maps from the native compiler.
 */
class PRDC_JSLAB_LATEX_NATIVE_SYNCTEX extends PRDC_JSLAB_LATEX_SYNCTEX {

  /**
   * Reads text nodes from a compressed SyncTeX map.
   * @param {string} file Compressed SyncTeX file.
   * @param {string} root Project root.
   * @returns {Promise<Map|null>} Text positions by PDF page.
   */
  static async read(file, root) {
    const source = createReadStream(file);
    const unzipped = createGunzip();
    const lines = createInterface({ input: unzipped, crlfDelay: Infinity });
    // pipeline forwards file and decompression errors to the reader.
    const reading = pipeline(source, unzipped).catch(() => false);
    try {
      const pages = await this.parse(lines, input => {
        const file = path.relative(root, path.resolve(root, input));
        if(file && !path.isAbsolute(file) && file.split(path.sep)[0] !== '..') return input;
      });
      return pages && await reading !== false ? pages : null;
    } finally {
      lines.close();
      source.destroy();
      unzipped.destroy();
    }
  }

}

exports.PRDC_JSLAB_LATEX_NATIVE_SYNCTEX = PRDC_JSLAB_LATEX_NATIVE_SYNCTEX;
