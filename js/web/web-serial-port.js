/**
 * @file Browser Web Serial adapter for JSLAB
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var WEB_SERIAL_PORT_REGISTRY = new Map();

/**
 * Formats a USB identifier as upper-case 4-digit hex.
 * @param {number} value
 * @returns {string}
 */
function formatUsbHex(value) {
  if(!Number.isFinite(value)) {
    return '';
  }
  return String(Math.max(0, value >>> 0).toString(16)).toUpperCase().padStart(4, '0');
}

/**
 * Decorates a binary chunk with Buffer-like toString support.
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
function decorateChunk(bytes) {
  if(bytes && typeof bytes == 'object') {
    Object.defineProperty(bytes, 'toString', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function(encoding) {
        var decoder = new TextDecoder(encoding || 'utf-8');
        return decoder.decode(bytes);
      }
    });
  }
  return bytes;
}

/**
 * Builds a stable browser-side port descriptor.
 * @param {SerialPort} port
 * @param {number} index
 * @returns {Object}
 */
function buildPortDescriptor(port, index) {
  var info = typeof port.getInfo == 'function' ? (port.getInfo() || {}) : {};
  var vendor_id = formatUsbHex(info.usbVendorId);
  var product_id = formatUsbHex(info.usbProductId);
  var path = 'webserial:' + (vendor_id || 'unknown') + ':' + (product_id || 'unknown') + ':' + index;
  var suffix = vendor_id && product_id ? ' (' + vendor_id + ':' + product_id + ')' : '';
  return {
    path: path,
    friendlyName: 'Serial Port ' + (index + 1) + suffix,
    vendorId: vendor_id,
    productId: product_id,
    _port: port
  };
}

/**
 * Lists browser-authorized serial ports and refreshes the registry.
 * @returns {Promise<Array<Object>>}
 */
async function listBrowserSerialPorts() {
  if(!(globalThis.navigator &&
      globalThis.navigator.serial &&
      typeof globalThis.navigator.serial.getPorts == 'function')) {
    return [];
  }

  var ports = await globalThis.navigator.serial.getPorts();
  WEB_SERIAL_PORT_REGISTRY.clear();
  return ports.map(function(port, index) {
    var descriptor = buildPortDescriptor(port, index);
    WEB_SERIAL_PORT_REGISTRY.set(descriptor.path, port);
    return descriptor;
  });
}

class PRDC_JSLAB_WEB_SERIAL_PORT {

  /**
   * @param {Object} options
   */
  constructor(options) {
    this.options = Object.assign({}, options || {});
    this.path = this.options.path || '';
    this.baudRate = Number(this.options.baudRate) || 9600;
    this.dataBits = this.options.dataBits || 8;
    this.parity = this.options.parity || 'none';
    this.stopBits = this.options.stopBits || 1;
    this.flowControl = !!this.options.flowControl;
    this.handlers = {
      open: [],
      data: [],
      close: [],
      error: []
    };
    this.port = null;
    this.reader = null;
    this.isOpen = false;
    this.closed = false;
    this.opening = this._open();
  }

  /**
   * @returns {Promise<Array<Object>>}
   */
  static async list() {
    return await listBrowserSerialPorts();
  }

  /**
   * Prompts the user for a serial port and returns the descriptor.
   * @param {Object} [options]
   * @returns {Promise<Object|false>}
   */
  static async requestPort(options) {
    if(!(globalThis.navigator &&
        globalThis.navigator.serial &&
        typeof globalThis.navigator.serial.requestPort == 'function')) {
      return false;
    }

    var port = await globalThis.navigator.serial.requestPort(options || {});
    var descriptors = await listBrowserSerialPorts();
    return descriptors.find(function(entry) {
      return entry._port === port;
    }) || false;
  }

  /**
   * @param {string} event_name
   * @param {Function} handler
   * @returns {PRDC_JSLAB_WEB_SERIAL_PORT}
   */
  on(event_name, handler) {
    if(this.handlers[event_name] && typeof handler == 'function') {
      this.handlers[event_name].push(handler);
    }
    return this;
  }

  /**
   * Emits a port event to listeners.
   * @param {string} event_name
   * @param {...*} args
   */
  _emit(event_name, ...args) {
    if(!Array.isArray(this.handlers[event_name])) {
      return;
    }
    this.handlers[event_name].forEach(function(handler) {
      try {
        handler(...args);
      } catch {}
    });
  }

  /**
   * Resolves the selected browser serial port and opens it.
   * @returns {Promise<void>}
   */
  async _open() {
    try {
      if(!WEB_SERIAL_PORT_REGISTRY.size) {
        await listBrowserSerialPorts();
      }

      this.port = WEB_SERIAL_PORT_REGISTRY.get(this.path) || null;
      if(!this.port) {
        throw new Error('Serial port "' + this.path + '" is not available.');
      }

      await this.port.open({
        baudRate: this.baudRate,
        dataBits: this.dataBits,
        parity: this.parity,
        stopBits: this.stopBits,
        flowControl: this.flowControl ? 'hardware' : 'none'
      });

      this.isOpen = true;
      this._emit('open');
      this._startReadLoop();
    } catch(err) {
      this._emit('error', err);
    }
  }

  /**
   * Starts forwarding readable chunks as Node-like data events.
   */
  async _startReadLoop() {
    if(!this.port || !this.port.readable) {
      return;
    }

    try {
      this.reader = this.port.readable.getReader();
      while(!this.closed) {
        var read_result = await this.reader.read();
        if(!read_result || read_result.done) {
          break;
        }
        if(read_result.value) {
          this._emit('data', decorateChunk(read_result.value));
        }
      }
    } catch(err) {
      if(!this.closed) {
        this._emit('error', err);
      }
    } finally {
      if(this.reader) {
        try {
          this.reader.releaseLock();
        } catch {}
        this.reader = null;
      }
    }
  }

  /**
   * @param {Object} _state
   * @returns {Promise<boolean>}
   */
  async set(_state) {
    return true;
  }

  /**
   * @param {string|Uint8Array|ArrayBuffer|Array<number>} data
   * @returns {Promise<boolean>}
   */
  async write(data) {
    await this.opening;
    if(!this.port || !this.port.writable) {
      return false;
    }

    var bytes;
    if(typeof data == 'string') {
      bytes = new TextEncoder().encode(data);
    } else if(data instanceof Uint8Array) {
      bytes = data;
    } else if(data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if(Array.isArray(data)) {
      bytes = Uint8Array.from(data);
    } else if(data && typeof data.buffer != 'undefined') {
      bytes = new Uint8Array(data.buffer, data.byteOffset || 0, data.byteLength || data.length || 0);
    } else {
      bytes = new TextEncoder().encode(String(data));
    }

    var writer = this.port.writable.getWriter();
    try {
      await writer.write(bytes);
      return true;
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Closes the browser serial port.
   * @returns {Promise<boolean>}
   */
  async close() {
    this.closed = true;
    await this.opening;

    if(this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
      try {
        this.reader.releaseLock();
      } catch {}
      this.reader = null;
    }

    if(this.port && this.isOpen) {
      try {
        await this.port.close();
      } catch {}
    }

    this.isOpen = false;
    this._emit('close');
    return true;
  }
}

exports.PRDC_JSLAB_WEB_SERIAL_PORT = PRDC_JSLAB_WEB_SERIAL_PORT;
