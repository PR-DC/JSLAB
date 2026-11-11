/**
 * @file Persistent Windows Script Host bridge for spreadsheet COM automation
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

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

/** Returns whether a value is an array. */
function isArray(value) {
  return Object.prototype.toString.call(value) == '[object Array]';
}

/** Parses a JSON request in legacy Windows JScript. */
function parseJson(value) {
  return eval('('+value+')');
}

/** Quotes a string for the newline-delimited JSON protocol. */
function quoteJsonString(value) {
  return '"'+String(value).replace(/[\\"\u0000-\u001f]/g, function(character) {
    if(character == '"') return '\\"';
    if(character == '\\') return '\\\\';
    if(character == '\b') return '\\b';
    if(character == '\f') return '\\f';
    if(character == '\n') return '\\n';
    if(character == '\r') return '\\r';
    if(character == '\t') return '\\t';
    var code = character.charCodeAt(0).toString(16);
    while(code.length < 4) code = '0'+code;
    return '\\u'+code;
  })+'"';
}

/** Serializes protocol values without requiring the unavailable JSON object. */
function stringifyJson(value) {
  if(value === null || value === undefined) return 'null';
  if(typeof value == 'string') return quoteJsonString(value);
  if(typeof value == 'number') return isFinite(value) ? String(value) : 'null';
  if(typeof value == 'boolean') return value ? 'true' : 'false';
  if(isArray(value)) {
    var items = [];
    for(var i = 0; i < value.length; i++) items.push(stringifyJson(value[i]));
    return '['+items.join(',')+']';
  }
  if(typeof value == 'object') {
    var properties = [];
    for(var key in value) {
      if(Object.prototype.hasOwnProperty.call(value, key) &&
          typeof value[key] != 'undefined' && typeof value[key] != 'function') {
        properties.push(quoteJsonString(key)+':'+stringifyJson(value[key]));
      }
    }
    return '{'+properties.join(',')+'}';
  }
  return 'null';
}

/** Creates a LibreOffice UNO value object. */
function unoValue(type, value) {
  var result = service.Bridge_GetValueObject();
  result.Set(type, value);
  return result;
}

/** Creates a LibreOffice property value. */
function unoProperty(name, type, value) {
  var result = service.Bridge_GetStruct('com.sun.star.beans.PropertyValue');
  result.Name = unoValue('string', name);
  result.Value = unoValue(type, value);
  return result;
}

/** Converts a Windows path to a file URL understood by LibreOffice. */
function pathToUrl(filePath) {
  var normalized = String(filePath).replace(/\\/g, '/');
  var parts = normalized.split('/');
  for(var i = 0; i < parts.length; i++) {
    if(i == 0 && /^[A-Za-z]:$/.test(parts[i])) continue;
    parts[i] = encodeURIComponent(parts[i]);
  }
  return 'file:///'+parts.join('/');
}

/** Removes an existing save target to match the original Octave links. */
function deleteExistingFile(filePath) {
  var fileSystem = new ActiveXObject('Scripting.FileSystemObject');
  if(fileSystem.FileExists(filePath)) fileSystem.DeleteFile(filePath, true);
}

/** Converts an RGB triplet to an Excel or LibreOffice color integer. */
function colorValue(rgb) {
  if(TYPE == 'excel') return rgb[0]+rgb[1]*256+rgb[2]*65536;
  return rgb[2]+rgb[1]*256+rgb[0]*65536;
}

/** Converts a one-based column number to an Excel column label. */
function columnName(column) {
  var result = '';
  while(column > 0) {
    column--;
    result = String.fromCharCode(65+(column % 26))+result;
    column = Math.floor(column/26);
  }
  return result;
}

/** Returns a one-based sheet selected by the public API. */
function getSheet(index) {
  if(TYPE == 'excel') return sheets.Item(index);
  return sheets.getByIndex(index-1);
}

/** Returns one spreadsheet cell. */
function getCell(sheet, column, row) {
  if(TYPE == 'excel') return sheet.Range(columnName(column)+String(row));
  return sheet.getCellByPosition(column-1, row-1);
}

/** Updates cached document and sheet references. */
function setDocument(value) {
  document = value;
  sheets = TYPE == 'excel' ? document.Worksheets : document.getSheets();
}

/** Returns the current number of sheets. */
function sheetCount() {
  return TYPE == 'excel' ? sheets.Count : sheets.getCount();
}

/** Starts the requested COM automation application. */
function startApplication(visible) {
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
}

/** Changes application visibility. */
function setVisible(visible) {
  visibleState = visible;
  if(TYPE == 'excel') {
    application.Visible = visible;
  } else if(document) {
    document.getCurrentController().getFrame().getContainerWindow().setVisible(visible);
  }
  return true;
}

/** Opens an existing spreadsheet document. */
function openDocument(filePath) {
  if(TYPE == 'excel') {
    setDocument(application.Workbooks.Open(filePath));
  } else {
    var hidden = unoProperty('Hidden', 'boolean', !visibleState);
    setDocument(desktop.loadComponentFromURL(pathToUrl(filePath), '_blank', 0, [hidden]));
  }
  return { sheet_count: sheetCount() };
}

/** Creates a new spreadsheet document. */
function newDocument() {
  if(TYPE == 'excel') {
    setDocument(application.Workbooks.Add());
  } else {
    var hidden = unoProperty('Hidden', 'boolean', !visibleState);
    setDocument(desktop.loadComponentFromURL('private:factory/scalc', '_blank', 0, [hidden]));
  }
  return { sheet_count: sheetCount() };
}

/** Closes the current document. */
function closeDocument(save) {
  if(!document) return true;
  if(TYPE == 'excel') {
    if(save && !document.Path) {
      throw Error('The workbook has no file path. Call saveAs() before saving it.');
    }
    document.Close(save);
  } else {
    if(save && document.hasLocation()) document.store();
    document.close(true);
  }
  document = null;
  sheets = null;
  return true;
}

/** Quits the application. */
function quitApplication(save) {
  closeDocument(save);
  if(TYPE == 'excel' && application) application.Quit();
  if(TYPE == 'calc' && desktop) desktop.terminate();
  application = null;
  service = null;
  desktop = null;
  stopping = true;
  return true;
}

/** Adds a sheet. */
function addSheet(name) {
  var sheet;
  if(TYPE == 'excel') {
    sheet = sheets.Add(null, sheets.Item(sheets.Count));
    sheet.Name = name;
    return { sheet: sheet.Index, sheet_count: sheetCount() };
  }
  sheets.insertNewByName(name, sheetCount());
  return { sheet: sheetCount(), sheet_count: sheetCount() };
}

/** Removes a sheet. */
function removeSheet(index) {
  if(TYPE == 'excel') {
    var oldAlerts = application.DisplayAlerts;
    application.DisplayAlerts = false;
    try {
      getSheet(index).Delete();
    } finally {
      application.DisplayAlerts = oldAlerts;
    }
  } else {
    sheets.removeByName(getSheet(index).getName());
  }
  return { sheet_count: sheetCount() };
}

/** Sets a sheet name. */
function setSheetName(index, name) {
  if(TYPE == 'excel') getSheet(index).Name = name;
  else getSheet(index).setName(name);
  return true;
}

/** Writes one or more cells. */
function writeCells(sheetIndex, columns, rows, values) {
  var sheet = getSheet(sheetIndex);
  for(var i = 0; i < columns.length; i++) {
    var cell = getCell(sheet, columns[i], rows[i]);
    if(TYPE == 'excel') cell.Value2 = values[i];
    else cell.setFormula(String(values[i]));
  }
  return true;
}

/** Reads one or more cells. */
function readCells(sheetIndex, columns, rows) {
  var sheet = getSheet(sheetIndex);
  var result = [];
  for(var i = 0; i < columns.length; i++) {
    var cell = getCell(sheet, columns[i], rows[i]);
    if(TYPE == 'excel') {
      result.push({ Value: cell.Value2, Formula: cell.Formula });
    } else {
      result.push({ Value: cell.getValue(), String: cell.getString(),
        Formula: cell.getFormula() });
    }
  }
  return result.length == 1 ? result[0] : result;
}

/** Changes column widths or row heights. */
function setSize(kind, sheetIndex, indexes, sizes) {
  var sheet = getSheet(sheetIndex);
  for(var i = 0; i < indexes.length; i++) {
    if(TYPE == 'excel') {
      if(kind == 'column') sheet.Columns.Item(indexes[i]).ColumnWidth = sizes[i];
      else sheet.Rows.Item(indexes[i]).RowHeight = sizes[i];
    } else {
      if(kind == 'column') sheet.getColumns().getByIndex(indexes[i]-1).Width = sizes[i]*100;
      else sheet.getRows().getByIndex(indexes[i]-1).Height = sizes[i]*100;
    }
  }
  return true;
}

/** Applies one Excel border specification. */
function applyExcelBorder(cell, index, spec) {
  var border = cell.Borders.Item(index);
  if(spec[0] !== null) border.Weight = spec[0];
  if(spec[1] !== null) border.Color = colorValue(spec[1]);
  if(spec[2] !== null) border.LineStyle = spec[2];
}

/** Applies one LibreOffice border specification. */
function applyCalcBorder(cell, propertyName, spec) {
  var border = cell[propertyName];
  border.InnerLineWidth = spec[0]*100;
  border.Color = colorValue([spec[1], spec[2], spec[3]]);
  cell[propertyName] = border;
}

/** Applies formatting to one or more cells. */
function formatCells(sheetIndex, columns, rows, options) {
  var sheet = getSheet(sheetIndex);
  for(var i = 0; i < columns.length; i++) {
    var cell = getCell(sheet, columns[i], rows[i]);
    for(var key in options) {
      if(!Object.prototype.hasOwnProperty.call(options, key)) continue;
      var value = options[key];
      if(TYPE == 'excel') {
        if(key == 'CellInteriorColor') cell.Interior.Color = colorValue(value);
        else if(key == 'CharBold') cell.Font.Bold = value;
        else if(key == 'CharItalic') cell.Font.Italic = value;
        else if(key == 'CharUnderline') cell.Font.Underline = value;
        else if(key == 'CharStrikethrough') cell.Font.Strikethrough = value;
        else if(key == 'CharFontName') cell.Font.Name = value;
        else if(key == 'CharFontSize') cell.Font.Size = value;
        else if(key == 'CharColor') cell.Font.Color = colorValue(value);
        else if(key == 'HorizontalAlignment') cell.HorizontalAlignment = value;
        else if(key == 'VerticalAlignment') cell.VerticalAlignment = value;
        else if(key == 'OrientationAngle' || key == 'Orientation') cell.Orientation = value;
        else if(key == 'Borders') {
          cell.Borders.Weight = value[0];
          cell.Borders.Color = colorValue(value[1]);
          cell.Borders.LineStyle = value[2];
        } else if(key == 'TopBorder') applyExcelBorder(cell, 8, value);
        else if(key == 'BottomBorder') applyExcelBorder(cell, 9, value);
        else if(key == 'LeftBorder') applyExcelBorder(cell, 7, value);
        else if(key == 'RightBorder') applyExcelBorder(cell, 10, value);
      } else {
        if(key == 'CellBackColor' || key == 'CharColor') cell[key] = colorValue(value);
        else if(key == 'Borders') {
          applyCalcBorder(cell, 'TopBorder', value);
          applyCalcBorder(cell, 'BottomBorder', value);
          applyCalcBorder(cell, 'LeftBorder', value);
          applyCalcBorder(cell, 'RightBorder', value);
        } else if(key == 'TopBorder' || key == 'BottomBorder' ||
            key == 'LeftBorder' || key == 'RightBorder') {
          applyCalcBorder(cell, key, value);
        } else {
          cell[key] = value;
        }
      }
    }
  }
  return true;
}

/** Saves the current document. */
function saveDocument() {
  if(TYPE == 'excel') {
    if(!document.Path) {
      throw Error('The workbook has no file path. Call saveAs() before saving it.');
    }
    document.Save();
  }
  else document.store();
  return true;
}

/** Saves the current document to a new file. */
function saveDocumentAs(filePath) {
  deleteExistingFile(filePath);
  if(TYPE == 'excel') {
    document.SaveAs(filePath);
  } else {
    var filter = unoProperty('FilterName', 'string', 'calc8');
    document.storeAsURL(pathToUrl(filePath), [filter]);
  }
  return true;
}

/** Dispatches a transport request. */
function dispatch(method, args) {
  if(method == 'start') return startApplication(args[0]);
  if(method == 'visible') return setVisible(args[0]);
  if(method == 'open') return openDocument(args[0]);
  if(method == 'newDocument') return newDocument();
  if(method == 'close') return closeDocument(args[0]);
  if(method == 'quit' || method == 'shutdown') return quitApplication(args.length ? args[0] : false);
  if(method == 'addSheet') return addSheet(args[0]);
  if(method == 'removeSheet') return removeSheet(args[0]);
  if(method == 'setSheetName') return setSheetName(args[0], args[1]);
  if(method == 'write') return writeCells(args[0], args[1], args[2], args[3]);
  if(method == 'read') return readCells(args[0], args[1], args[2]);
  if(method == 'setColumnWidth') return setSize('column', args[0], args[1], args[2]);
  if(method == 'setRowHeight') return setSize('row', args[0], args[1], args[2]);
  if(method == 'format') return formatCells(args[0], args[1], args[2], args[3]);
  if(method == 'save') return saveDocument();
  if(method == 'saveAs') return saveDocumentAs(args[0]);
  throw Error('Unknown COM host method: '+method);
}

while(!stopping && !input.AtEndOfStream) {
  var line = input.ReadLine();
  if(!line) continue;
  var request = null;
  var response;
  try {
    request = parseJson(line);
    response = { id: request.id, ok: true,
      result: dispatch(request.method, request.args || []) };
  } catch(error) {
    response = { id: request ? request.id : null, ok: false,
      error: error && error.message ? String(error.message) : String(error) };
  }
  output.WriteLine(stringifyJson(response));
}
