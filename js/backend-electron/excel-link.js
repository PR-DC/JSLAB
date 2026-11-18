/**
 * @file JSLAB ExcelLink submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SPREADSHEET_LINK } = require("./spreadsheet-link");

/**
 * Class for automating Microsoft Excel through its Windows COM interface.
 * @extends PRDC_JSLAB_SPREADSHEET_LINK
 */
class PRDC_JSLAB_EXCEL_LINK extends PRDC_JSLAB_SPREADSHEET_LINK {

  /**
   * Initializes a new ExcelLink instance.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    super(jsl, 'excel', 'ExcelLink');
    this.XlBordersIndex = Object.freeze({
      DiagonalDown: 5, DiagonalUp: 6, EdgeBottom: 9, EdgeLeft: 7,
      EdgeRight: 10, EdgeTop: 8, InsideHorizontal: 12, InsideVertical: 11
    });
    this.XlBorderWeight = Object.freeze({
      Hairline: 1, Medium: -4138, Thick: 4, Thin: 2
    });
    this.XlLineStyle = Object.freeze({
      Continuous: 1, Dash: -4115, DashDot: 4, DashDotDot: 5,
      Dot: -4142, Double: -4119, LineStyleNone: -4118, SlantDashDot: 13
    });
    this.XlHAlign = Object.freeze({
      Center: -4108, CenterAcrossSelection: 7, Distributed: -4117,
      Fill: 5, General: 1, Justify: -4130, Left: -4131, Right: -4152
    });
    this.XlVAlign = Object.freeze({
      Bottom: -4107, Center: -4108, Distributed: -4117,
      Justify: -4130, Top: -4160
    });
    this.XlOrientation = Object.freeze({
      Downward: -4170, Horizontal: -4128, Upward: -4171, Vertical: -4166
    });
  }

  /**
   * Validates Excel formatting properties.
   */
  _formatOptions(options) {
    if(!options || typeof options != 'object' || Array.isArray(options)) {
      throw this._error('options must be an object.');
    }
    var result = {};
    var booleans = ['CharBold', 'CharItalic', 'CharUnderline', 'CharStrikethrough'];
    var colors = ['CellInteriorColor', 'CharColor'];
    var borders = ['Borders', 'TopBorder', 'BottomBorder', 'LeftBorder', 'RightBorder'];
    Object.keys(options).forEach((key) => {
      var value = options[key];
      if(booleans.includes(key)) {
        result[key] = this._boolean(value, key);
      } else if(colors.includes(key)) {
        result[key] = this._rgb(value, key);
      } else if(key == 'CharFontName') {
        if(typeof value != 'string' || !value) {
          throw this._error(key + ' must be a string.');
        }
        result[key] = value;
      } else if(key == 'CharFontSize') {
        result[key] = this._positiveNumber(value, key);
      } else if(key == 'HorizontalAlignment') {
        result[key] = this._enum(value, this.XlHAlign, key);
      } else if(key == 'VerticalAlignment') {
        result[key] = this._enum(value, this.XlVAlign, key);
      } else if(key == 'Orientation') {
        result[key] = this._enum(value, this.XlOrientation, key);
      } else if(key == 'OrientationAngle') {
        value = Number(value);
        if(!Number.isFinite(value) || value < -90 || value > 90) {
          throw this._error(key + ' must be between -90 and 90 degrees.');
        }
        result[key] = value;
      } else if(borders.includes(key)) {
        if(!Array.isArray(value) || value.length != 3) {
          throw this._error(key + ' must be [weight, RGB color, line style].');
        }
        result[key] = [
          value[0] === null || value[0] === undefined ? null :
            this._enum(value[0], this.XlBorderWeight, key + ' weight'),
          value[1] === null || value[1] === undefined ? [0, 0, 0] :
            this._rgb(value[1], key + ' color'),
          value[2] === null || value[2] === undefined ? null :
            this._enum(value[2], this.XlLineStyle, key + ' line style')
        ];
        if(result[key][0] === null) {
          result[key][0] = this.XlBorderWeight.Thin;
        }
        if(result[key][2] === null) {
          result[key][2] = this.XlLineStyle.Continuous;
        }
      } else {
        throw this._error('Unknown formatting option: ' + key + '.');
      }
    });
    return result;
  }
}

exports.PRDC_JSLAB_EXCEL_LINK = PRDC_JSLAB_EXCEL_LINK;
