/**
 * @file JSLAB ExcelLink submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SPREADSHEET_LINK } = require('./jslab-spreadsheet-link');

/**
 * Class for automating Microsoft Excel through its Windows COM interface.
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
   * Starts Microsoft Excel.
   * @param {boolean} visible Whether the application window is visible.
   * @returns {Promise<boolean>} True after Excel starts.
   */
  async start(visible = true) { return await this._start(visible); }

  /**
   * Changes Microsoft Excel visibility.
   * @param {boolean} visible Whether the application window is visible.
   */
  async visible(visible) { return await this._visible(visible); }

  /**
   * Closes the current workbook.
   * @param {boolean} [save=true] Whether to save changes before closing.
   */
  async close(save = true) { return await this._close(save); }

  /**
   * Quits Microsoft Excel and closes the link.
   * @param {boolean} [save=true] Whether to save changes before quitting.
   */
  async quit(save = true) { return await this._quit(save); }

  /**
   * Opens an existing workbook.
   * @param {string} file_path Absolute or workspace-relative workbook path.
   * @returns {Promise<number>} Number of worksheets in the workbook.
   */
  async open(file_path) { return await this._open(file_path); }

  /**
   * Creates a new workbook.
   * @returns {Promise<number>} Number of worksheets in the new workbook.
   */
  async new() { return await this._newDocument(); }

  /**
   * Adds a worksheet and returns its one-based index.
   * @param {string} name Worksheet name.
   * @returns {Promise<number>} One-based index of the new worksheet.
   */
  async addSheet(name) { return await this._addSheet(name); }

  /**
   * Removes a worksheet selected by its one-based index.
   * @param {number} sheet One-based worksheet index.
   */
  async removeSheet(sheet) { return await this._removeSheet(sheet); }

  /**
   * Changes a worksheet name.
   * @param {number} sheet One-based worksheet index.
   * @param {string} name New worksheet name.
   */
  async setSheetName(sheet, name) { return await this._setSheetName(sheet, name); }

  /**
   * Writes data to one or more worksheet cells.
   * @param {number} sheet One-based worksheet index.
   * @param {number|Array<number>} column One-based column index or indexes.
   * @param {number|Array<number>} row One-based row index or indexes.
   * @param {*|Array<*>} data One value, a broadcast value, or one value per cell.
   */
  async write(sheet, column, row, data) {
    return await this._write(sheet, column, row, data);
  }

  /**
   * Reads one or more worksheet cells.
   * @param {number} sheet One-based worksheet index.
   * @param {number|Array<number>} column One-based column index or indexes.
   * @param {number|Array<number>} row One-based row index or indexes.
   * @returns {Promise<Object|Array<Object>>} Cell value and formula records.
   */
  async read(sheet, column, row) { return await this._read(sheet, column, row); }

  /**
   * Changes one or more worksheet column widths.
   * @param {number} sheet One-based worksheet index.
   * @param {number|Array<number>} column One-based column index or indexes.
   * @param {number|Array<number>} width Width value or values.
   */
  async setColumnWidth(sheet, column, width) {
    return await this._setSize('setColumnWidth', sheet, column, width);
  }

  /**
   * Changes one or more worksheet row heights.
   * @param {number} sheet One-based worksheet index.
   * @param {number|Array<number>} row One-based row index or indexes.
   * @param {number|Array<number>} height Height value or values.
   */
  async setRowHeight(sheet, row, height) {
    return await this._setSize('setRowHeight', sheet, row, height);
  }

  /**
   * Formats one or more worksheet cells.
   * @param {number} sheet One-based worksheet index.
   * @param {number|Array<number>} column One-based column index or indexes.
   * @param {number|Array<number>} row One-based row index or indexes.
   * @param {Object} options Excel formatting properties.
   */
  async format(sheet, column, row, options = {}) {
    this._requireOpened();
    sheet = this._sheet(sheet);
    var cells = this._cells(column, row);
    var normalized = this._formatOptions(options);
    await this._request('format', [sheet, cells.columns, cells.rows, normalized]);
    return true;
  }

  /** Saves the current workbook. */
  async save() { return await this._save(); }

  /**
   * Saves the current workbook to a new file.
   * @param {string} file_path Absolute or workspace-relative workbook path.
   */
  async saveAs(file_path) { return await this._saveAs(file_path); }

  /** Validates Excel formatting properties. */
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
      if(booleans.includes(key)) result[key] = this._boolean(value, key);
      else if(colors.includes(key)) result[key] = this._rgb(value, key);
      else if(key == 'CharFontName') {
        if(typeof value != 'string' || !value) throw this._error(key+' must be a string.');
        result[key] = value;
      } else if(key == 'CharFontSize') result[key] = this._positiveNumber(value, key);
      else if(key == 'HorizontalAlignment') {
        result[key] = this._enum(value, this.XlHAlign, key);
      } else if(key == 'VerticalAlignment') {
        result[key] = this._enum(value, this.XlVAlign, key);
      } else if(key == 'Orientation') {
        result[key] = this._enum(value, this.XlOrientation, key);
      } else if(key == 'OrientationAngle') {
        value = Number(value);
        if(!Number.isFinite(value) || value < -90 || value > 90) {
          throw this._error(key+' must be between -90 and 90 degrees.');
        }
        result[key] = value;
      } else if(borders.includes(key)) {
        if(!Array.isArray(value) || value.length != 3) {
          throw this._error(key+' must be [weight, RGB color, line style].');
        }
        result[key] = [
          value[0] === null || value[0] === undefined ? null :
            this._enum(value[0], this.XlBorderWeight, key+' weight'),
          value[1] === null || value[1] === undefined ? [0, 0, 0] :
            this._rgb(value[1], key+' color'),
          value[2] === null || value[2] === undefined ? null :
            this._enum(value[2], this.XlLineStyle, key+' line style')
        ];
        if(result[key][0] === null) result[key][0] = this.XlBorderWeight.Thin;
        if(result[key][2] === null) result[key][2] = this.XlLineStyle.Continuous;
      } else {
        throw this._error('Unknown formatting option: '+key+'.');
      }
    });
    return result;
  }
}

exports.PRDC_JSLAB_EXCEL_LINK = PRDC_JSLAB_EXCEL_LINK;
