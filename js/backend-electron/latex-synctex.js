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

/**
 * Indexes nearby text nodes when SyncTeX reports a broad box for a PDF click.
 */
class PRDC_JSLAB_LATEX_SYNCTEX {

  /**
   * Reads text nodes from a version 1 map written directly for PDF output.
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
    const inputs = new Map();
    const pages = new Map();
    let header = {};
    let content = false;
    let postscript = false;
    let points;
    let previous;
    let scale;
    let offset_x;
    let offset_y;
    try {
      for await(const line of lines) {
        const input = /^Input:(\d+):(.+)$/.exec(line);
        if(input) {
          const file = path.relative(root, path.resolve(root, input[2]));
          if(file && !path.isAbsolute(file) && file.split(path.sep)[0] !== '..') inputs.set(Number(input[1]), input[2]);
          continue;
        }
        if(!content) {
          if(line === 'Content:') {
            if(header['SyncTeX Version'] !== '1' || header.Output !== 'pdf') return null;
            // TeX scaled points to PDF points, using the recorded unit and magnification.
            scale = Number(header.Unit) * Number(header.Magnification) * 72 / (1000 * 65536 * 72.27);
            offset_x = Number(header['X Offset']) * scale;
            offset_y = Number(header['Y Offset']) * scale;
            if(!(scale > 0) || ![offset_x, offset_y].every(Number.isFinite)) return null;
            content = true;
            header = null;
          } else {
            const field = /^([^:]+):(.*)$/.exec(line);
            if(field) header[field[1]] = field[2];
          }
          continue;
        }
        if(line === 'Post scriptum:') postscript = true;
        if(postscript) {
          if(/^(?:Magnification|X Offset|Y Offset):/.test(line)) return null;
          continue;
        }
        const page = /^\{(\d+)$/.exec(line);
        if(page) {
          points = [];
          pages.set(Number(page[1]), points);
          previous = null;
          continue;
        }
        if(line.startsWith('}')) {
          points = null;
          continue;
        }
        if(!points) continue;
        const node = /^([xghkr(])(\d+),(\d+)(?:,(-?\d+))?:(-?\d+),(-?\d+)/.exec(line);
        if(!node) continue;
        const [, type, tag, source_line, column, x, y] = node;
        const current = { x: Number(x), y: Number(y) };
        if(type === 'x' && Number(source_line) > 0) {
          const start = previous?.y === current.y && previous.x <= current.x ? previous.x : current.x;
          points.push({
            tag: Number(tag), line: Number(source_line), column: Number(column ?? -1),
            left: offset_x + scale * start, right: offset_x + scale * current.x,
            baseline: offset_y + scale * current.y
          });
        }
        previous = current;
      }
      if(await reading === false || !content) return null;
      for(const [page, points] of pages) {
        pages.set(page, points.filter(point => inputs.has(point.tag)));
        for(const point of pages.get(page)) point.file = inputs.get(point.tag);
      }
      return pages;
    } finally {
      lines.close();
      source.destroy();
      unzipped.destroy();
    }
  }

  /**
   * Finds a text span under or immediately around the click.
   * @param {Object[]} [points] Text positions on the selected page.
   * @param {number} x Horizontal PDF coordinate.
   * @param {number} y Vertical PDF coordinate.
   * @returns {Object|null} Nearest text source position.
   */
  static nearest(points, x, y) {
    if(!points) return null;
    let nearest = null;
    let score = Infinity;
    for(const point of points) {
      const vertical = Math.abs(point.baseline - y - 3);
      const horizontal = Math.max(point.left - x, x - point.right, 0);
      if(vertical > 7 || horizontal > 7) continue;
      const distance = vertical + horizontal;
      if(distance < score) {
        nearest = point;
        score = distance;
      }
    }
    return nearest;
  }
}

exports.PRDC_JSLAB_LATEX_SYNCTEX = PRDC_JSLAB_LATEX_SYNCTEX;
