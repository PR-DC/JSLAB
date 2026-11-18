/**
 * @file Persistent Windows Script Host bridge for spreadsheet COM automation
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Spreadsheet host operations for legacy Windows JScript.
 * Windows Script Host requires ES3 syntax, so this namespace uses function properties.
 */
var PRDC_JSLAB_SPREADSHEET_COM_HOST = {
/**
 * Returns whether a value is an array.
 */
  isArray: function(value) {
    return Object.prototype.toString.call(value) == '[object Array]';
  },

  /**
   * Parses a JSON request in legacy Windows JScript.
   */
  parseJson: function(value) {
    return eval('(' + value + ')');
  },

  /**
   * Quotes a string for the newline-delimited JSON protocol.
   */
  quoteJsonString: function(value) {
    return '"' + String(value).replace(/[\\"\u0000-\u001f]/g, function(character) {
      if(character == '"') {
        return '\\"';
      }
      if(character == '\\') {
        return '\\\\';
      }
      if(character == '\b') {
        return '\\b';
      }
      if(character == '\f') {
        return '\\f';
      }
      if(character == '\n') {
        return '\\n';
      }
      if(character == '\r') {
        return '\\r';
      }
      if(character == '\t') {
        return '\\t';
      }
      var code = character.charCodeAt(0).toString(16);
      while(code.length < 4) {
        code = '0' + code;
      }
      return '\\u' + code;
    }) + '"';
  },

  /**
   * Serializes protocol values without requiring the unavailable JSON object.
   */
  stringifyJson: function(value) {
    if(value === null || value === undefined) {
      return 'null';
    }
    if(typeof value == 'string') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.quoteJsonString(value);
    }
    if(typeof value == 'number') {
      return isFinite(value) ? String(value) : 'null';
    }
    if(typeof value == 'boolean') {
      return value ? 'true' : 'false';
    }
    if(PRDC_JSLAB_SPREADSHEET_COM_HOST.isArray(value)) {
      var items = [];
      for(var i = 0; i < value.length; i++) {
        items.push(PRDC_JSLAB_SPREADSHEET_COM_HOST.stringifyJson(value[i]));
      }
      return '[' + items.join(',') + ']';
    }
    if(typeof value == 'object') {
      var properties = [];
      for(var key in value) {
        if(Object.prototype.hasOwnProperty.call(value, key) &&
          typeof value[key] != 'undefined' && typeof value[key] != 'function') {
          properties.push(PRDC_JSLAB_SPREADSHEET_COM_HOST.quoteJsonString(key) + ':' + PRDC_JSLAB_SPREADSHEET_COM_HOST.stringifyJson(value[key]));
        }
      }
      return '{' + properties.join(',') + '}';
    }
    return 'null';
  },

  /**
   * Creates a LibreOffice UNO value object.
   */
  unoValue: function(type, value) {
    var result = service.Bridge_GetValueObject();
    result.Set(type, value);
    return result;
  },

  /**
   * Creates a LibreOffice property value.
   */
  unoProperty: function(name, type, value) {
    var result = service.Bridge_GetStruct('com.sun.star.beans.PropertyValue');
    result.Name = PRDC_JSLAB_SPREADSHEET_COM_HOST.unoValue('string', name);
    result.Value = PRDC_JSLAB_SPREADSHEET_COM_HOST.unoValue(type, value);
    return result;
  },

  /**
   * Converts a Windows path to a file URL understood by LibreOffice.
   */
  pathToUrl: function(filePath) {
    var normalized = String(filePath).replace(/\\/g, '/');
    var parts = normalized.split('/');
    for(var i = 0; i < parts.length; i++) {
      if(i == 0 && /^[A-Za-z]:$/.test(parts[i])) {
        continue;
      }
      parts[i] = encodeURIComponent(parts[i]);
    }
    return 'file:///' + parts.join('/');
  },

  /**
   * Removes an existing save target to match the original Octave links.
   */
  deleteExistingFile: function(filePath) {
    var fileSystem = new ActiveXObject('Scripting.FileSystemObject');
    if(fileSystem.FileExists(filePath)) {
      fileSystem.DeleteFile(filePath, true);
    }
  },

  /**
   * Converts an RGB triplet to an Excel or LibreOffice color integer.
   */
  colorValue: function(rgb) {
    if(TYPE == 'excel') {
      return rgb[0] + rgb[1] * 256 + rgb[2] * 65536;
    }
    return rgb[2] + rgb[1] * 256 + rgb[0] * 65536;
  },

  /**
   * Converts a one-based column number to an Excel column label.
   */
  columnName: function(column) {
    var result = '';
    while(column > 0) {
      column--;
      result = String.fromCharCode(65 + (column % 26)) + result;
      column = Math.floor(column / 26);
    }
    return result;
  },

  /**
   * Returns a one-based sheet selected by the public API.
   */
  getSheet: function(index) {
    if(TYPE == 'excel') {
      return sheets.Item(index);
    }
    return sheets.getByIndex(index - 1);
  },

  /**
   * Returns one spreadsheet cell.
   */
  getCell: function(sheet, column, row) {
    if(TYPE == 'excel') {
      return sheet.Range(PRDC_JSLAB_SPREADSHEET_COM_HOST.columnName(column) + String(row));
    }
    return sheet.getCellByPosition(column - 1, row - 1);
  },

  /**
   * Updates cached document and sheet references.
   */
  setDocument: function(value) {
    document = value;
    sheets = TYPE == 'excel' ? document.Worksheets : document.getSheets();
  },

  /**
   * Returns the current number of sheets.
   */
  sheetCount: function() {
    return TYPE == 'excel' ? sheets.Count : sheets.getCount();
  },

  /**
   * Starts the requested COM automation application.
   */
  startApplication: function(visible) {
    visibleState = visible;
    if(TYPE == 'excel') {
      application = new ActiveXObject('Excel.Application');
      application.Visible = visible;
    } else if(TYPE == 'calc') {
      service = new ActiveXObject('com.sun.star.ServiceManager');
      desktop = service.createInstance('com.sun.star.frame.Desktop');
    } else {
      throw Error('Unsupported spreadsheet link type.');
    }
    return true;
  },

  /**
   * Changes application visibility.
   */
  setVisible: function(visible) {
    visibleState = visible;
    if(TYPE == 'excel') {
      application.Visible = visible;
    } else if(document) {
      document.getCurrentController().getFrame().getContainerWindow().setVisible(visible);
    }
    return true;
  },

  /**
   * Opens an existing spreadsheet document.
   */
  openDocument: function(filePath) {
    if(TYPE == 'excel') {
      PRDC_JSLAB_SPREADSHEET_COM_HOST.setDocument(application.Workbooks.Open(filePath));
    } else {
      var hidden = PRDC_JSLAB_SPREADSHEET_COM_HOST.unoProperty('Hidden', 'boolean', !visibleState);
      PRDC_JSLAB_SPREADSHEET_COM_HOST.setDocument(desktop.loadComponentFromURL(PRDC_JSLAB_SPREADSHEET_COM_HOST.pathToUrl(filePath), '_blank', 0, [hidden]));
    }
    return { sheet_count: PRDC_JSLAB_SPREADSHEET_COM_HOST.sheetCount() };
  },

  /**
   * Creates a new spreadsheet document.
   */
  newDocument: function() {
    if(TYPE == 'excel') {
      PRDC_JSLAB_SPREADSHEET_COM_HOST.setDocument(application.Workbooks.Add());
    } else {
      var hidden = PRDC_JSLAB_SPREADSHEET_COM_HOST.unoProperty('Hidden', 'boolean', !visibleState);
      PRDC_JSLAB_SPREADSHEET_COM_HOST.setDocument(desktop.loadComponentFromURL('private:factory/scalc', '_blank', 0, [hidden]));
    }
    return { sheet_count: PRDC_JSLAB_SPREADSHEET_COM_HOST.sheetCount() };
  },

  /**
   * Closes the current document.
   */
  closeDocument: function(save) {
    if(!document) {
      return true;
    }
    if(TYPE == 'excel') {
      if(save && !document.Path) {
        throw Error('The workbook has no file path. Call saveAs() before saving it.');
      }
      document.Close(save);
    } else {
      if(save && document.hasLocation()) {
        document.store();
      }
      document.close(true);
    }
    document = null;
    sheets = null;
    return true;
  },

  /**
   * Quits the application.
   */
  quitApplication: function(save) {
    PRDC_JSLAB_SPREADSHEET_COM_HOST.closeDocument(save);
    if(TYPE == 'excel' && application) {
      application.Quit();
    }
    if(TYPE == 'calc' && desktop) {
      desktop.terminate();
    }
    application = null;
    service = null;
    desktop = null;
    stopping = true;
    return true;
  },

  /**
   * Adds a sheet.
   */
  addSheet: function(name) {
    var sheet;
    if(TYPE == 'excel') {
      sheet = sheets.Add(null, sheets.Item(sheets.Count));
      sheet.Name = name;
      return { sheet: sheet.Index, sheet_count: PRDC_JSLAB_SPREADSHEET_COM_HOST.sheetCount() };
    }
    sheets.insertNewByName(name, PRDC_JSLAB_SPREADSHEET_COM_HOST.sheetCount());
    return { sheet: PRDC_JSLAB_SPREADSHEET_COM_HOST.sheetCount(), sheet_count: PRDC_JSLAB_SPREADSHEET_COM_HOST.sheetCount() };
  },

  /**
   * Removes a sheet.
   */
  removeSheet: function(index) {
    if(TYPE == 'excel') {
      var oldAlerts = application.DisplayAlerts;
      application.DisplayAlerts = false;
      try {
        PRDC_JSLAB_SPREADSHEET_COM_HOST.getSheet(index).Delete();
      } finally {
        application.DisplayAlerts = oldAlerts;
      }
    } else {
      sheets.removeByName(PRDC_JSLAB_SPREADSHEET_COM_HOST.getSheet(index).getName());
    }
    return { sheet_count: PRDC_JSLAB_SPREADSHEET_COM_HOST.sheetCount() };
  },

  /**
   * Sets a sheet name.
   */
  setSheetName: function(index, name) {
    if(TYPE == 'excel') {
      PRDC_JSLAB_SPREADSHEET_COM_HOST.getSheet(index).Name = name;
    } else {
      PRDC_JSLAB_SPREADSHEET_COM_HOST.getSheet(index).setName(name);
    }
    return true;
  },

  /**
   * Writes one or more cells.
   */
  writeCells: function(sheetIndex, columns, rows, values) {
    var sheet = PRDC_JSLAB_SPREADSHEET_COM_HOST.getSheet(sheetIndex);
    for(var i = 0; i < columns.length; i++) {
      var cell = PRDC_JSLAB_SPREADSHEET_COM_HOST.getCell(sheet, columns[i], rows[i]);
      if(TYPE == 'excel') {
        cell.Value2 = values[i];
      } else {
        cell.setFormula(String(values[i]));
      }
    }
    return true;
  },

  /**
   * Reads one or more cells.
   */
  readCells: function(sheetIndex, columns, rows) {
    var sheet = PRDC_JSLAB_SPREADSHEET_COM_HOST.getSheet(sheetIndex);
    var result = [];
    for(var i = 0; i < columns.length; i++) {
      var cell = PRDC_JSLAB_SPREADSHEET_COM_HOST.getCell(sheet, columns[i], rows[i]);
      if(TYPE == 'excel') {
        result.push({ Value: cell.Value2, Formula: cell.Formula });
      } else {
        result.push({ Value: cell.getValue(), String: cell.getString(),
          Formula: cell.getFormula() });
      }
    }
    return result.length == 1 ? result[0] : result;
  },

  /**
   * Changes column widths or row heights.
   */
  setSize: function(kind, sheetIndex, indexes, sizes) {
    var sheet = PRDC_JSLAB_SPREADSHEET_COM_HOST.getSheet(sheetIndex);
    for(var i = 0; i < indexes.length; i++) {
      if(TYPE == 'excel') {
        if(kind == 'column') {
          sheet.Columns.Item(indexes[i]).ColumnWidth = sizes[i];
        } else {
          sheet.Rows.Item(indexes[i]).RowHeight = sizes[i];
        }
      } else {
        if(kind == 'column') {
          sheet.getColumns().getByIndex(indexes[i] - 1).Width = sizes[i] * 100;
        } else {
          sheet.getRows().getByIndex(indexes[i] - 1).Height = sizes[i] * 100;
        }
      }
    }
    return true;
  },

  /**
   * Applies one Excel border specification.
   */
  applyExcelBorder: function(cell, index, spec) {
    var border = cell.Borders.Item(index);
    if(spec[0] !== null) {
      border.Weight = spec[0];
    }
    if(spec[1] !== null) {
      border.Color = PRDC_JSLAB_SPREADSHEET_COM_HOST.colorValue(spec[1]);
    }
    if(spec[2] !== null) {
      border.LineStyle = spec[2];
    }
  },

  /**
   * Applies one LibreOffice border specification.
   */
  applyCalcBorder: function(cell, propertyName, spec) {
    var border = cell[propertyName];
    border.InnerLineWidth = spec[0] * 100;
    border.Color = PRDC_JSLAB_SPREADSHEET_COM_HOST.colorValue([spec[1], spec[2], spec[3]]);
    cell[propertyName] = border;
  },

  /**
   * Applies formatting to one or more cells.
   */
  formatCells: function(sheetIndex, columns, rows, options) {
    var sheet = PRDC_JSLAB_SPREADSHEET_COM_HOST.getSheet(sheetIndex);
    for(var i = 0; i < columns.length; i++) {
      var cell = PRDC_JSLAB_SPREADSHEET_COM_HOST.getCell(sheet, columns[i], rows[i]);
      for(var key in options) {
        if(!Object.prototype.hasOwnProperty.call(options, key)) {
          continue;
        }
        var value = options[key];
        if(TYPE == 'excel') {
          if(key == 'CellInteriorColor') {
            cell.Interior.Color = PRDC_JSLAB_SPREADSHEET_COM_HOST.colorValue(value);
          } else if(key == 'CharBold') {
            cell.Font.Bold = value;
          } else if(key == 'CharItalic') {
            cell.Font.Italic = value;
          } else if(key == 'CharUnderline') {
            cell.Font.Underline = value;
          } else if(key == 'CharStrikethrough') {
            cell.Font.Strikethrough = value;
          } else if(key == 'CharFontName') {
            cell.Font.Name = value;
          } else if(key == 'CharFontSize') {
            cell.Font.Size = value;
          } else if(key == 'CharColor') {
            cell.Font.Color = PRDC_JSLAB_SPREADSHEET_COM_HOST.colorValue(value);
          } else if(key == 'HorizontalAlignment') {
            cell.HorizontalAlignment = value;
          } else if(key == 'VerticalAlignment') {
            cell.VerticalAlignment = value;
          } else if(key == 'OrientationAngle' || key == 'Orientation') {
            cell.Orientation = value;
          } else if(key == 'Borders') {
            cell.Borders.Weight = value[0];
            cell.Borders.Color = PRDC_JSLAB_SPREADSHEET_COM_HOST.colorValue(value[1]);
            cell.Borders.LineStyle = value[2];
          } else if(key == 'TopBorder') {
            PRDC_JSLAB_SPREADSHEET_COM_HOST.applyExcelBorder(cell, 8, value);
          } else if(key == 'BottomBorder') {
            PRDC_JSLAB_SPREADSHEET_COM_HOST.applyExcelBorder(cell, 9, value);
          } else if(key == 'LeftBorder') {
            PRDC_JSLAB_SPREADSHEET_COM_HOST.applyExcelBorder(cell, 7, value);
          } else if(key == 'RightBorder') {
            PRDC_JSLAB_SPREADSHEET_COM_HOST.applyExcelBorder(cell, 10, value);
          }
        } else {
          if(key == 'CellBackColor' || key == 'CharColor') {
            cell[key] = PRDC_JSLAB_SPREADSHEET_COM_HOST.colorValue(value);
          } else if(key == 'Borders') {
            PRDC_JSLAB_SPREADSHEET_COM_HOST.applyCalcBorder(cell, 'TopBorder', value);
            PRDC_JSLAB_SPREADSHEET_COM_HOST.applyCalcBorder(cell, 'BottomBorder', value);
            PRDC_JSLAB_SPREADSHEET_COM_HOST.applyCalcBorder(cell, 'LeftBorder', value);
            PRDC_JSLAB_SPREADSHEET_COM_HOST.applyCalcBorder(cell, 'RightBorder', value);
          } else if(key == 'TopBorder' || key == 'BottomBorder' ||
            key == 'LeftBorder' || key == 'RightBorder') {
            PRDC_JSLAB_SPREADSHEET_COM_HOST.applyCalcBorder(cell, key, value);
          } else {
            cell[key] = value;
          }
        }
      }
    }
    return true;
  },

  /**
   * Saves the current document.
   */
  saveDocument: function() {
    if(TYPE == 'excel') {
      if(!document.Path) {
        throw Error('The workbook has no file path. Call saveAs() before saving it.');
      }
      document.Save();
    } else {
      document.store();
    }
    return true;
  },

  /**
   * Saves the current document to a new file.
   */
  saveDocumentAs: function(filePath) {
    PRDC_JSLAB_SPREADSHEET_COM_HOST.deleteExistingFile(filePath);
    if(TYPE == 'excel') {
      document.SaveAs(filePath);
    } else {
      var filter = PRDC_JSLAB_SPREADSHEET_COM_HOST.unoProperty('FilterName', 'string', 'calc8');
      document.storeAsURL(PRDC_JSLAB_SPREADSHEET_COM_HOST.pathToUrl(filePath), [filter]);
    }
    return true;
  },

  /**
   * Dispatches a transport request.
   */
  dispatch: function(method, args) {
    if(method == 'start') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.startApplication(args[0]);
    }
    if(method == 'visible') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.setVisible(args[0]);
    }
    if(method == 'open') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.openDocument(args[0]);
    }
    if(method == 'newDocument') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.newDocument();
    }
    if(method == 'close') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.closeDocument(args[0]);
    }
    if(method == 'quit' || method == 'shutdown') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.quitApplication(args.length ? args[0] : false);
    }
    if(method == 'addSheet') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.addSheet(args[0]);
    }
    if(method == 'removeSheet') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.removeSheet(args[0]);
    }
    if(method == 'setSheetName') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.setSheetName(args[0], args[1]);
    }
    if(method == 'write') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.writeCells(args[0], args[1], args[2], args[3]);
    }
    if(method == 'read') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.readCells(args[0], args[1], args[2]);
    }
    if(method == 'setColumnWidth') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.setSize('column', args[0], args[1], args[2]);
    }
    if(method == 'setRowHeight') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.setSize('row', args[0], args[1], args[2]);
    }
    if(method == 'format') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.formatCells(args[0], args[1], args[2], args[3]);
    }
    if(method == 'save') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.saveDocument();
    }
    if(method == 'saveAs') {
      return PRDC_JSLAB_SPREADSHEET_COM_HOST.saveDocumentAs(args[0]);
    }
    throw Error('Unknown COM host method: ' + method);
  }
};


var TYPE = WScript.Arguments.length ? String(WScript.Arguments.Item(0)) : '';
var input = WScript.StdIn;
var output = WScript.StdOut;
var application = null;
var service = null;
var desktop = null;
var document = null;
var sheets = null;
var stopping = false;
var visibleState = true;


while(!stopping && !input.AtEndOfStream) {
  var line = input.ReadLine();
  if(!line) {
    continue;
  }
  var request = null;
  var response;
  try {
    request = PRDC_JSLAB_SPREADSHEET_COM_HOST.parseJson(line);
    response = { id: request.id, ok: true,
      result: PRDC_JSLAB_SPREADSHEET_COM_HOST.dispatch(request.method, request.args || []) };
  } catch(error) {
    response = { id: request ? request.id : null, ok: false,
      error: error && error.message ? String(error.message) : String(error) };
  }
  output.WriteLine(PRDC_JSLAB_SPREADSHEET_COM_HOST.stringifyJson(response));
}
