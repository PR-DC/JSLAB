/**
 * @file Compiler-source parser with retained array-subscript metadata
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for retaining source ranges from the vendor compiler parser.
 */
class PRDC_OMJSL_PARSER {

  /**
   * Locates a parsed node in the original source while preserving quotes and separators.
   * @param {*} node Node.
   * @param {*} source Original compiler source text.
   * @param {*} lineStarts LineStarts.
   */
  static sourceNodeRange(node, source, lineStarts) {
    var location = node && node.track && (node.track.location || node.track);
    if(!location || !location.first_line || !location.last_line) {
      return null;
    }
    if(!lineStarts) {
      lineStarts = [0];
      var newline = /\r\n|\r|\n/g,
        match;
      while(match = newline.exec(source)) {
        lineStarts.push(match.index + match[0].length);
      }
    }
    return {
      start: lineStarts[location.first_line - 1] + location.first_column,
      end: lineStarts[location.last_line - 1] + location.last_column
    };
  }

  /**
   * Returns the original source text covered by a parsed node.
   * @param {*} node Node.
   * @param {*} source Original compiler source text.
   * @param {*} lineStarts LineStarts.
   */
  static sourceNodeText(node, source, lineStarts) {
    var range = PRDC_OMJSL_PARSER.sourceNodeRange(node, source, lineStarts);
    return range ? source.slice(range.start, range.end) : '';
  }

}
const upstream = require('../vendor/moijs/moparser').parser;
const parser = Object.create(upstream);
const array_production = upstream.productions_.findIndex(production => production && production[0] == upstream.symbols_.array_subscripts && production[1] == 3);
if(array_production < 0) {
  throw new Error('The source parser array-subscript production changed.');
}
const string_productions = new Set(upstream.productions_.map((production, index) => production && production[0] == upstream.symbols_.string_comment && production[1] > 0 ? index : -1).filter(index => index >= 0));
if(string_productions.size != 1) {
  throw new Error('The source parser string-comment productions changed.');
}
parser.performAction = function(text, length, line, state, production, values, locations) {
  if(production == array_production) {
    // The vendor action otherwise defaults to the opening bracket token.
    this.$ = values[values.length - 2];
    return;
  }
  var result = upstream.performAction.apply(this, arguments);
  if(string_productions.has(production) && this.$) {
    this.$.track = {
      location: Object.assign({}, this._$)
    };
  }
  return result;
};
exports.parser = parser;
exports.sourceNodeRange = PRDC_OMJSL_PARSER.sourceNodeRange;
exports.sourceNodeText = PRDC_OMJSL_PARSER.sourceNodeText;
