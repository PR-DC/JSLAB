/**
 * @file Shared SVG-to-PDF conversion
 * @author PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Converts SVG data with host-provided PDFKit and SVG-to-PDFKit implementations.
 */
class PRDC_JSLAB_SVG_TO_PDF {

  /**
   * Converts SVG markup into PDF bytes.
   * @param {Function} PDFDocument PDFKit document constructor.
   * @param {Function} SVGtoPDF SVG-to-PDFKit conversion function.
   * @param {string} svg_data SVG markup.
   * @param {number} width Output width.
   * @param {number} height Output height.
   * @param {Object} [fonts={}] Registered font data keyed by PDF font name.
   * @returns {Promise<Buffer|Uint8Array>} Generated PDF bytes.
   */
  static convert(PDFDocument, SVGtoPDF, svg_data, width, height, fonts = {}) {
    return new Promise(function(resolve, reject) {
      try {
        var doc = new PDFDocument({ size: [width, height] });
        for(const [name, font] of Object.entries(fonts)) {
          doc.registerFont(name, font);
        }
        var chunks = [];
        doc.on('data', function(chunk) {
          chunks.push(chunk);
        });
        doc.on('end', function() {
          resolve(PRDC_JSLAB_SVG_TO_PDF.mergeChunks(chunks));
        });
        SVGtoPDF(doc, svg_data, 0, 0, {
          width: width,
          height: height,
          assumePt: true,
          fontCallback: PRDC_JSLAB_SVG_TO_PDF._fontCallback(fonts)
        });
        doc.end();
      } catch(err) {
        reject(err);
      }
    });
  }

  /**
   * Creates the font selector used by SVG-to-PDFKit.
   * @param {Object} fonts Registered font data keyed by PDF font name.
   * @returns {Function} SVG-to-PDFKit font selector.
   */
  static _fontCallback(fonts) {
    var registered = new Map(Object.keys(fonts).map(name => [name.toLowerCase(), name]));
    var standard = new Map([
      ['serif', ['Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic']],
      ['monospace', ['Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique']],
      ['sans-serif', ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique']]
    ]);
    return function(families, bold, italic, options) {
      var style = Number(bold) + 2 * Number(italic);
      for(const item of families.split(',')) {
        var family = item.trim().replace(/^(['"])(.*)\1$/, '$2').toLowerCase();
        if(family == 'latinmodernmath' && !registered.has(family)) {
          family = 'latinmodern';
        }
        if(standard.has(family)) {
          return standard.get(family)[style];
        }
        var variants = [[bold, italic], [false, italic], [bold, false], [false, false]];
        for(const [font_bold, font_italic] of variants) {
          var suffix = (font_bold ? 'bold' : '') + (font_italic ? 'italic' : '');
          var name = registered.get(family + (suffix ? '-' + suffix : ''));
          if(name) {
            options.fauxBold = bold && !font_bold;
            options.fauxItalic = italic && !font_italic;
            return name;
          }
        }
      }
      return standard.get('sans-serif')[style];
    };
  }

  /**
   * Joins PDFKit output chunks without assuming Node.js Buffer availability.
   * @param {Array} chunks PDFKit output chunks.
   * @returns {Buffer|Uint8Array} Contiguous PDF bytes.
   */
  static mergeChunks(chunks) {
    if(typeof Buffer != 'undefined' && typeof Buffer.concat == 'function' &&
        chunks.every(chunk => Buffer.isBuffer(chunk))) {
      return Buffer.concat(chunks);
    }
    var normalized = (chunks || []).map(function(chunk) {
      if(chunk instanceof Uint8Array) {
        return chunk;
      }
      if(typeof ArrayBuffer != 'undefined' && chunk instanceof ArrayBuffer) {
        return new Uint8Array(chunk);
      }
      if(typeof ArrayBuffer != 'undefined' && ArrayBuffer.isView(chunk)) {
        return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      }
      return new Uint8Array(0);
    });
    var data = new Uint8Array(normalized.reduce((sum, chunk) => sum + chunk.byteLength, 0));
    var offset = 0;
    for(const chunk of normalized) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return data;
  }
}

exports.PRDC_JSLAB_SVG_TO_PDF = PRDC_JSLAB_SVG_TO_PDF;
