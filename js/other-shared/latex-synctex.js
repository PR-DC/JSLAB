/**
 * @file JSLAB LaTeX SyncTeX text positions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Indexes text nodes from a compiled SyncTeX map.
 */
class PRDC_JSLAB_LATEX_SYNCTEX {

  /**
   * Reads text positions from SyncTeX records.
   * @param {Iterable|AsyncIterable} lines SyncTeX records.
   * @param {Function} resolve Maps compiler paths to eligible project files.
   * @returns {Promise<Map|null>} Text positions by PDF page.
   */
  static async parse(lines, resolve) {
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
    let xdv;
    for await(const line of lines) {
      const input = /^Input:(\d+):(.+)$/.exec(line);
      if(input) {
        const file = resolve(input[2]);
        if(file) inputs.set(Number(input[1]), file);
        continue;
      }
      if(!content) {
        if(line === 'Content:') {
          if(header['SyncTeX Version'] !== '1' || !['pdf', 'xdv'].includes(header.Output)) return null;
          xdv = header.Output === 'xdv';
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
      // LuaTeX glyph records can inherit the baseline from the preceding node.
      const current = { x: Number(x), y: type === 'x' && y === '0' && previous ? previous.y : Number(y) };
      // XeTeX emits word boundaries as glue records in its XDV output.
      if((type === 'x' || (xdv && type === 'g')) && Number(source_line) > 0) {
        const start = previous?.y === current.y && previous.x <= current.x ? previous.x : current.x;
        points.push({
          tag: Number(tag), line: Number(source_line), column: Number(column ?? -1),
          left: offset_x + scale * start, right: offset_x + scale * current.x,
          baseline: offset_y + scale * current.y
        });
      }
      previous = current;
    }
    if(!content) return null;
    for(const [page, points] of pages) {
      pages.set(page, points.filter(point => inputs.has(point.tag)));
      for(const point of pages.get(page)) point.file = inputs.get(point.tag);
    }
    return pages;
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
