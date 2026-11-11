/**
 * @file JSLAB CalcLink submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SPREADSHEET_LINK } = require('./jslab-spreadsheet-link');

/**
 * Class for automating LibreOffice Calc through its Windows COM interface.
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
   * Starts LibreOffice Calc.
   * @param {boolean} [visible=true] Whether the application window is visible.
   */
  async start(visible = true) { return await this._start(visible); }

  /**
   * Changes LibreOffice Calc visibility.
   * @param {boolean} visible Whether the application window is visible.
   */
  async visible(visible) { return await this._visible(visible); }

  /**
   * Closes the current spreadsheet.
   * @param {boolean} [save=true] Whether to save changes before closing.
   */
  async close(save = true) { return await this._close(save); }

  /**
   * Quits LibreOffice Calc and closes the link.
   * @param {boolean} [save=true] Whether to save changes before quitting.
   */
  async quit(save = true) { return await this._quit(save); }

  /**
   * Opens an existing spreadsheet.
   * @param {string} file_path Absolute or workspace-relative spreadsheet path.
   * @returns {Promise<number>} Number of sheets in the spreadsheet.
   */
  async open(file_path) { return await this._open(file_path); }

  /**
   * Creates a new spreadsheet.
   * @returns {Promise<number>} Number of sheets in the new spreadsheet.
   */
  async new() { return await this._newDocument(); }

  /**
   * Adds a sheet and returns its one-based index.
   * @param {string} name Sheet name.
   * @returns {Promise<number>} One-based index of the new sheet.
   */
  async addSheet(name) { return await this._addSheet(name); }

  /**
   * Removes a sheet selected by its one-based index.
   * @param {number} sheet One-based sheet index.
   */
  async removeSheet(sheet) { return await this._removeSheet(sheet); }

  /**
   * Changes a sheet name.
   * @param {number} sheet One-based sheet index.
   * @param {string} name New sheet name.
   */
  async setSheetName(sheet, name) { return await this._setSheetName(sheet, name); }

  /**
   * Writes data to one or more spreadsheet cells.
   * @param {number} sheet One-based sheet index.
   * @param {number|Array<number>} column One-based column index or indexes.
   * @param {number|Array<number>} row One-based row index or indexes.
   * @param {*|Array<*>} data One value, a broadcast value, or one value per cell.
   */
  async write(sheet, column, row, data) {
    return await this._write(sheet, column, row, data);
  }

  /**
   * Reads one or more spreadsheet cells.
   * @param {number} sheet One-based sheet index.
   * @param {number|Array<number>} column One-based column index or indexes.
   * @param {number|Array<number>} row One-based row index or indexes.
   * @returns {Promise<Object|Array<Object>>} Cell value, string and formula records.
   */
  async read(sheet, column, row) { return await this._read(sheet, column, row); }

  /**
   * Changes one or more column widths in millimetres.
   * @param {number} sheet One-based sheet index.
   * @param {number|Array<number>} column One-based column index or indexes.
   * @param {number|Array<number>} width Width value or values in millimetres.
   */
  async setColumnWidth(sheet, column, width) {
    return await this._setSize('setColumnWidth', sheet, column, width);
  }

  /**
   * Changes one or more row heights in millimetres.
   * @param {number} sheet One-based sheet index.
   * @param {number|Array<number>} row One-based row index or indexes.
   * @param {number|Array<number>} height Height value or values in millimetres.
   */
  async setRowHeight(sheet, row, height) {
    return await this._setSize('setRowHeight', sheet, row, height);
  }

  /**
   * Formats one or more spreadsheet cells.
   * @param {number} sheet One-based sheet index.
   * @param {number|Array<number>} column One-based column index or indexes.
   * @param {number|Array<number>} row One-based row index or indexes.
   * @param {Object} options LibreOffice formatting properties.
   */
  async format(sheet, column, row, options = {}) {
    this._requireOpened();
    sheet = this._sheet(sheet);
    var cells = this._cells(column, row);
    var normalized = this._formatOptions(options);
    await this._request('format', [sheet, cells.columns, cells.rows, normalized]);
    return true;
  }

  /** Saves the current spreadsheet. */
  async save() { return await this._save(); }

  /**
   * Saves the current spreadsheet to a new file.
   * @param {string} file_path Absolute or workspace-relative spreadsheet path.
   */
  async saveAs(file_path) { return await this._saveAs(file_path); }

  /** Validates LibreOffice formatting properties. */
  _formatOptions(options) {
    if(!options || typeof options != 'object' || Array.isArray(options)) {
      throw this._error('options must be an object.');
    }
    var result = {};
    var colors = ['CellBackColor', 'CharColor'];
    var borders = ['Borders', 'TopBorder', 'BottomBorder', 'LeftBorder', 'RightBorder'];
    Object.keys(options).forEach((key) => {
      var value = options[key];
      if(colors.includes(key)) result[key] = this._rgb(value, key);
      else if(key == 'CharWeight') result[key] = this._enum(value, this.FontWeight, key);
      else if(key == 'CharPosture') result[key] = this._enum(value, this.FontSlant, key);
      else if(key == 'CharFontName') {
        if(typeof value != 'string' || !value) throw this._error(key+' must be a string.');
        result[key] = value;
      } else if(key == 'CharHeight') result[key] = this._positiveNumber(value, key);
      else if(key == 'HoriJustify') {
        result[key] = this._enum(value, this.CellHoriJustify, key);
      } else if(key == 'VertJustify') {
        result[key] = this._enum(value, this.CellVertJustify, key);
      } else if(key == 'Orientation') {
        result[key] = this._enum(value, this.CellOrientation, key);
      } else if(key == 'RotateAngle') {
        value = Number(value);
        if(!Number.isFinite(value)) throw this._error(key+' must be a finite number.');
        result[key] = value;
      } else if(borders.includes(key)) {
        if(!Array.isArray(value) || value.length != 4) {
          throw this._error(key+' must be [width, red, green, blue].');
        }
        result[key] = [this._nonnegativeNumber(value[0], key+' width')].concat(
          this._rgb(value.slice(1), key+' color'));
      } else {
        throw this._error('Unknown formatting option: '+key+'.');
      }
    });
    return result;
  }
}

exports.PRDC_JSLAB_CALC_LINK = PRDC_JSLAB_CALC_LINK;
