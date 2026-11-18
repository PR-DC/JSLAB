/**
 * @file Text escaping and display helpers used across JSLAB modules
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for encoding text without depending on a window or platform.
 */
class PRDC_JSLAB_TEXT {

  /**
   * Encodes HTML entities for HTML, plain terminal text, or legacy attributes.
   * @param {*} value Text to encode.
   * @param {string} [mode="html"] Entity set: html, text, or attribute.
   * @returns {string} Encoded text.
   */
  static escapeHTML(value, mode = 'html') {
    var entities = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
      "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
    };
    var pattern = mode == 'attribute' ? /[&<>"'`=\/]/g :
      mode == 'html' ? /[&<>"']/g : /[&<>]/g;
    return String(value).replace(pattern, function(character) {
      return entities[character];
    });
  }

  /**
   * Quotes regular-expression metacharacters in a literal search string.
   * @param {*} value Literal text.
   * @returns {string} Escaped regular-expression source.
   */
  static escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Encodes the text characters used by JSLAB LaTeX exports.
   * @param {*} string Text to encode; nonstrings pass through unchanged.
   * @returns {*} Encoded text.
   */
  static escapeLatex(string) {
    if(typeof string !== 'string') {
      return string;
    }
    return string
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/`/g, '\\textasciigrave{}');
  }

  /**
   * Formats local time for command-window and chat message timestamps.
   * @returns {string} Local time with millisecond precision.
   */
  static getTimestamp() {
    var date = new Date();
    return String(date.getHours()).padStart(2, "0") + ":" +
      String(date.getMinutes()).padStart(2, "0") + ":" +
      String(date.getSeconds()).padStart(2, "0") + "." +
      String(date.getMilliseconds()).padStart(3, "0");
  }
}

exports.PRDC_JSLAB_TEXT = PRDC_JSLAB_TEXT;
