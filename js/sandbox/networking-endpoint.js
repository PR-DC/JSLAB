/**
 * @file JSLAB buffered networking endpoint
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Shares received-byte buffering between connected and datagram endpoints.
 */
class PRDC_JSLAB_NETWORKING_ENDPOINT {
  /**
   * Initializes incoming byte storage.
   * @param {Object} jsl Scientific runtime.
   */
  constructor(jsl) {
    this.jsl = jsl;
    this.buffer = [];
    this._data_callback = false;
  }

  /**
   * Buffers received bytes or forwards them to the registered callback.
   * @param {Buffer} data Received bytes.
   */
  _onData(data) {
    if(this._data_callback) {
      this.onDataCallback(data);
    } else {
      this.buffer.push(...data);
    }
  }

  /**
   * Changes incoming delivery from buffering to callback mode.
   * @param {Function} callback Incoming data handler.
   */
  setOnData(callback) {
    if(this.jsl.inter.format.isFunction(callback)) {
      this.buffer = [];
      this.onDataCallback = callback;
      this._data_callback = true;
    }
  }
}

exports.PRDC_JSLAB_NETWORKING_ENDPOINT = PRDC_JSLAB_NETWORKING_ENDPOINT;
