/**
 * @file JSLAB CalcLink submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SPREADSHEET_LINK } = require("./spreadsheet-link");

/**
 * Class for automating LibreOffice Calc through its Windows COM interface.
 * @extends PRDC_JSLAB_SPREADSHEET_LINK
 */
class PRDC_JSLAB_CALC_LINK extends PRDC_JSLAB_SPREADSHEET_LINK {

  /**
   * Initializes a new CalcLink instance.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    super(jsl, 'calc', 'CalcLink');
    this.FontWeight = Object.freeze({
      DONTKNOW: 0, THIN: 50, ULTRALIGHT: 60, LIGHT: 75, SEMILIGHT: 90,
      NORMAL: 100, MEDIUM: 105, SEMIBOLD: 110, BOLD: 150,
      ULTRABOLD: 175, BLACK: 200
    });
    this.FontSlant = Object.freeze({
      NONE: 0, OBLIQUE: 1, ITALIC: 2, DONTKNOW: 3,
      REVERSE_OBLIQUE: 4, REVERSE_ITALIC: 5
    });
    this.CellHoriJustify = Object.freeze({
      STANDARD: 0, LEFT: 1, CENTER: 2, RIGHT: 3, BLOCK: 4, REPEAT: 5
    });
    this.CellVertJustify = Object.freeze({
      STANDARD: 0, TOP: 1, CENTER: 2, BOTTOM: 3
    });
    this.CellOrientation = Object.freeze({
      STANDARD: 0, TOPBOTTOM: 1, BOTTOMTOP: 2, STACKED: 3
    });
  }

  /**
   * Validates LibreOffice formatting properties.
   */
  _formatOptions(options) {
    if(!options || typeof options != 'object' || Array.isArray(options)) {
      throw this._error('options must be an object.');
    }
    var result = {};
    var colors = ['CellBackColor', 'CharColor'];
    var borders = ['Borders', 'TopBorder', 'BottomBorder', 'LeftBorder', 'RightBorder'];
    Object.keys(options).forEach((key) => {
      var value = options[key];
      if(colors.includes(key)) {
        result[key] = this._rgb(value, key);
      } else if(key == 'CharWeight') {
        result[key] = this._enum(value, this.FontWeight, key);
      } else if(key == 'CharPosture') {
        result[key] = this._enum(value, this.FontSlant, key);
      } else if(key == 'CharFontName') {
        if(typeof value != 'string' || !value) {
          throw this._error(key + ' must be a string.');
        }
        result[key] = value;
      } else if(key == 'CharHeight') {
        result[key] = this._positiveNumber(value, key);
      } else if(key == 'HoriJustify') {
        result[key] = this._enum(value, this.CellHoriJustify, key);
      } else if(key == 'VertJustify') {
        result[key] = this._enum(value, this.CellVertJustify, key);
      } else if(key == 'Orientation') {
        result[key] = this._enum(value, this.CellOrientation, key);
      } else if(key == 'RotateAngle') {
        value = Number(value);
        if(!Number.isFinite(value)) {
          throw this._error(key + ' must be a finite number.');
        }
        result[key] = value;
      } else if(borders.includes(key)) {
        if(!Array.isArray(value) || value.length != 4) {
          throw this._error(key + ' must be [width, red, green, blue].');
        }
        result[key] = [this._nonnegativeNumber(value[0], key + ' width')].concat(
          this._rgb(value.slice(1), key + ' color'));
      } else {
        throw this._error('Unknown formatting option: ' + key + '.');
      }
    });
    return result;
  }
}

exports.PRDC_JSLAB_CALC_LINK = PRDC_JSLAB_CALC_LINK;
