/**
 * @file JSLAB spreadsheet COM link shared implementation
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const timers = require('timers');

/**
 * Shared transport and argument validation for spreadsheet COM links.
 */
class PRDC_JSLAB_SPREADSHEET_LINK {

  /**
   * Creates a spreadsheet link.
   * @param {Object} jsl Reference to the main JSLAB object.
   * @param {string} type Spreadsheet host type.
   * @param {string} name User-facing link name.
   */
  constructor(jsl, type, name) {
    this.jsl = jsl;
    this._type = type;
    this._name = name;
    this._host = null;
    this._stdout_buffer = '';
    this._stderr_buffer = '';
    this._pending = new Map();
    this._next_request_id = 1;
    this.active = false;
    this.opened = false;
    this.visible_state = false;
    this.sheet_count = 0;

    if(this.jsl && typeof this.jsl.addForCleanup == 'function') {
      this.jsl.addForCleanup(this, async () => await this._cleanup());
    }
  }

  /** Starts the persistent Windows COM host. */
  async _start(visible = true) {
    visible = this._boolean(visible, 'visible');
    if(this.active) {
      await this._request('visible', [visible]);
      this.visible_state = visible;
      return true;
    }
    var env = this.jsl && this.jsl.inter && this.jsl.inter.env;
    if(!env || env.platform != 'win32' || typeof env.spawn != 'function') {
      throw this._error('This link is available only in JSLAB Desktop on Windows.');
    }
    var host_path = path.join(this.jsl.app_path, 'js', 'sandbox',
      'jslab-spreadsheet-com-host.js');
    this._host = env.spawn('cscript.exe',
      ['//Nologo', '//E:JScript', host_path, this._type], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });
    this._host.stdout.on('data', (data) => this._onStdout(data));
    this._host.stderr.on('data', (data) => {
      this._stderr_buffer += data.toString();
    });
    this._host.on('error', (error) => this._onHostExit(error));
    this._host.on('exit', (code) => {
      if(this._host) this._onHostExit(code === 0 ? null :
        Error('COM host exited with code '+code+'.'));
    });
    this.active = true;
    try {
      await this._request('start', [visible], 30000);
      this.visible_state = visible;
      return true;
    } catch(error) {
      await this._disposeHost();
      throw error;
    }
  }

  /** Sends one command to the persistent COM host. */
  _request(method, args = [], timeout = 15000) {
    if(!this.active || !this._host || !this._host.stdin ||
        this._host.stdin.destroyed) {
      return Promise.reject(this._error('The link is not active. Call start() first.'));
    }
    var id = this._next_request_id++;
    return new Promise((resolve, reject) => {
      var timer = timers.setTimeout(() => {
        this._pending.delete(id);
        reject(this._error('The COM request timed out.'));
      }, timeout);
      this._pending.set(id, { resolve: resolve, reject: reject, timer: timer });
      this._host.stdin.write(JSON.stringify({ id: id, method: method, args: args })+'\n',
        (error) => {
          if(error && this._pending.has(id)) {
            timers.clearTimeout(timer);
            this._pending.delete(id);
            reject(this._error(error.message));
          }
        });
    });
  }

  /** Processes newline-delimited responses from the COM host. */
  _onStdout(data) {
    this._stdout_buffer += data.toString();
    var lines = this._stdout_buffer.split(/\r?\n/);
    this._stdout_buffer = lines.pop();
    lines.forEach((line) => {
      if(!line.trim()) return;
      var response;
      try {
        response = JSON.parse(line);
      } catch(error) {
        this._rejectPending(this._error('Invalid response from the COM host.'));
        return;
      }
      var pending = this._pending.get(response.id);
      if(!pending) return;
      timers.clearTimeout(pending.timer);
      this._pending.delete(response.id);
      if(response.ok) {
        pending.resolve(response.result);
      } else {
        pending.reject(this._error(response.error || 'The COM operation failed.'));
      }
    });
  }

  /** Handles an unexpected COM host exit. */
  _onHostExit(error) {
    var message = error ? error.message : this._stderr_buffer.trim();
    this._rejectPending(this._error(message || 'The COM host stopped unexpectedly.'));
    this.active = false;
    this.opened = false;
    this.sheet_count = 0;
    this._host = null;
  }

  /** Rejects all commands waiting on the COM host. */
  _rejectPending(error) {
    this._pending.forEach((pending) => {
      timers.clearTimeout(pending.timer);
      pending.reject(error);
    });
    this._pending.clear();
  }

  /** Stops and releases the COM host process. */
  async _disposeHost() {
    var host = this._host;
    this._host = null;
    this.active = false;
    this.opened = false;
    this.sheet_count = 0;
    if(!host) return;
    try {
      if(host.stdin && !host.stdin.destroyed) host.stdin.end();
      if(host.exitCode === null && typeof host.kill == 'function') host.kill();
    } catch(error) {
      // The host may already have exited.
    }
    this._rejectPending(this._error('The link was closed.'));
  }

  /** Releases spreadsheet resources during JSLAB cleanup. */
  async _cleanup() {
    if(this.active) {
      try {
        await this._request('shutdown', [], 3000);
      } catch(error) {
        // Continue cleanup when the COM application is already unavailable.
      }
    }
    await this._disposeHost();
  }

  /** Changes application visibility. */
  async _visible(visible) {
    this._requireActive();
    visible = this._boolean(visible, 'visible');
    await this._request('visible', [visible]);
    this.visible_state = visible;
    return true;
  }

  /** Closes the open spreadsheet document. */
  async _close(save = true) {
    this._requireOpened();
    save = this._boolean(save, 'save');
    await this._request('close', [save]);
    this.opened = false;
    this.sheet_count = 0;
    return true;
  }

  /** Quits the spreadsheet application and its link host. */
  async _quit(save = true) {
    this._requireActive();
    save = this._boolean(save, 'save');
    await this._request('quit', [save]);
    await this._disposeHost();
    return true;
  }

  /** Opens an existing spreadsheet document. */
  async _open(file_path) {
    this._requireActive();
    if(this.opened) throw this._error('A spreadsheet document is already open.');
    if(typeof file_path != 'string' || !file_path.trim()) {
      throw this._error('file_path must be a non-empty string.');
    }
    var result = await this._request('open', [this._resolvePath(file_path)]);
    this.opened = true;
    this.sheet_count = result.sheet_count;
    return result.sheet_count;
  }

  /** Creates a new spreadsheet document. */
  async _newDocument() {
    this._requireActive();
    if(this.opened) throw this._error('A spreadsheet document is already open.');
    var result = await this._request('newDocument');
    this.opened = true;
    this.sheet_count = result.sheet_count;
    return result.sheet_count;
  }

  /** Adds a spreadsheet sheet. */
  async _addSheet(name) {
    this._requireOpened();
    if(typeof name != 'string' || !name.trim()) {
      throw this._error('name must be a non-empty string.');
    }
    var result = await this._request('addSheet', [name]);
    this.sheet_count = result.sheet_count;
    return result.sheet;
  }

  /** Removes a spreadsheet sheet. */
  async _removeSheet(sheet) {
    this._requireOpened();
    sheet = this._sheet(sheet);
    var result = await this._request('removeSheet', [sheet]);
    this.sheet_count = result.sheet_count;
    return true;
  }

  /** Changes a spreadsheet sheet name. */
  async _setSheetName(sheet, name) {
    this._requireOpened();
    sheet = this._sheet(sheet);
    if(typeof name != 'string' || !name.trim()) {
      throw this._error('name must be a non-empty string.');
    }
    await this._request('setSheetName', [sheet, name]);
    return true;
  }

  /** Writes one or more cells. */
  async _write(sheet, column, row, data) {
    this._requireOpened();
    sheet = this._sheet(sheet);
    var cells = this._cells(column, row, data, true);
    await this._request('write', [sheet, cells.columns, cells.rows, cells.data]);
    return true;
  }

  /** Reads one or more cells. */
  async _read(sheet, column, row) {
    this._requireOpened();
    sheet = this._sheet(sheet);
    var cells = this._cells(column, row);
    return await this._request('read', [sheet, cells.columns, cells.rows]);
  }

  /** Changes widths or heights for one or more columns or rows. */
  async _setSize(method, sheet, index, size) {
    this._requireOpened();
    sheet = this._sheet(sheet);
    var indexes = this._array(index);
    var sizes = this._array(size);
    if(indexes.length != sizes.length) {
      throw this._error('index and size must contain the same number of values.');
    }
    indexes = indexes.map((value) => this._positiveInteger(value, 'index'));
    sizes = sizes.map((value) => this._positiveNumber(value, 'size'));
    await this._request(method, [sheet, indexes, sizes]);
    return true;
  }

  /** Saves the current document. */
  async _save() {
    this._requireOpened();
    await this._request('save');
    return true;
  }

  /** Saves the current document to a new file. */
  async _saveAs(file_path) {
    this._requireOpened();
    if(typeof file_path != 'string' || !file_path.trim()) {
      throw this._error('file_path must be a non-empty string.');
    }
    await this._request('saveAs', [this._resolvePath(file_path)]);
    return true;
  }

  /** Validates and broadcasts cell coordinates and optional data. */
  _cells(column, row, data, with_data = false) {
    var columns = this._array(column);
    var rows = this._array(row);
    if(columns.length != rows.length || !columns.length) {
      throw this._error('column and row must contain the same number of values.');
    }
    columns = columns.map((value) => this._positiveInteger(value, 'column'));
    rows = rows.map((value) => this._positiveInteger(value, 'row'));
    var values;
    if(with_data) {
      values = this._array(data);
      if(values.length == 1 && columns.length > 1) {
        values = Array(columns.length).fill(values[0]);
      }
      if(values.length != columns.length) {
        throw this._error('data must contain one value or one value per cell.');
      }
    }
    return { columns: columns, rows: rows, data: values };
  }

  /** Converts a scalar or array-like value to an array. */
  _array(value) {
    if(Array.isArray(value)) return value.slice();
    if(ArrayBuffer.isView(value)) return Array.from(value);
    return [value];
  }

  /** Resolves relative paths against the persistent JSLAB workspace. */
  _resolvePath(file_path) {
    var env = this.jsl && this.jsl.inter && this.jsl.inter.env;
    if(env && typeof env._resolveFsPath == 'function') {
      return path.resolve(env._resolveFsPath(file_path));
    }
    if(!path.isAbsolute(file_path) && this.jsl && this.jsl.current_path) {
      return path.resolve(this.jsl.current_path, file_path);
    }
    return path.resolve(file_path);
  }

  /** Validates a boolean option. */
  _boolean(value, name) {
    if(value === true || value === false) return value;
    if(value === 1 || value === '1' || /^true|yes$/i.test(String(value))) return true;
    if(value === 0 || value === '0' || /^false|no$/i.test(String(value))) return false;
    throw this._error(name+' must be a boolean value.');
  }

  /** Validates a positive integer. */
  _positiveInteger(value, name) {
    value = Number(value);
    if(!Number.isInteger(value) || value < 1) {
      throw this._error(name+' must be a positive integer.');
    }
    return value;
  }

  /** Validates a one-based sheet index against the current document. */
  _sheet(value) {
    value = this._positiveInteger(value, 'sheet');
    if(value > this.sheet_count) {
      throw this._error('Sheet '+value+' does not exist.');
    }
    return value;
  }

  /** Validates a positive finite number. */
  _positiveNumber(value, name) {
    value = Number(value);
    if(!Number.isFinite(value) || value <= 0) {
      throw this._error(name+' must be a positive number.');
    }
    return value;
  }

  /** Validates a nonnegative finite number. */
  _nonnegativeNumber(value, name) {
    value = Number(value);
    if(!Number.isFinite(value) || value < 0) {
      throw this._error(name+' must be a nonnegative number.');
    }
    return value;
  }

  /** Validates an RGB color. */
  _rgb(value, name) {
    if(!Array.isArray(value) || value.length != 3 || value.some((component) =>
      !Number.isInteger(Number(component)) || Number(component) < 0 ||
      Number(component) > 255)) {
      throw this._error(name+' must be an RGB array with values from 0 to 255.');
    }
    return value.map(Number);
  }

  /** Resolves an enum name or validates a numeric enum value. */
  _enum(value, enumeration, name) {
    if(typeof value == 'string') {
      var key = Object.keys(enumeration).find((candidate) =>
        candidate.toLowerCase() == value.toLowerCase());
      if(key) return enumeration[key];
    }
    if(Object.values(enumeration).includes(value)) return value;
    throw this._error(name+' is not a valid enumeration value.');
  }

  /** Ensures that the application link is active. */
  _requireActive() {
    if(!this.active) throw this._error('The link is not active. Call start() first.');
  }

  /** Ensures that a spreadsheet document is open. */
  _requireOpened() {
    this._requireActive();
    if(!this.opened) throw this._error('No spreadsheet document is open.');
  }

  /** Creates a consistently prefixed link error. */
  _error(message) {
    return Error('@'+this._name+': '+message);
  }
}

exports.PRDC_JSLAB_SPREADSHEET_LINK = PRDC_JSLAB_SPREADSHEET_LINK;
