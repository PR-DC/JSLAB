/**
 * @file Small request/response RPC helper for the JSLAB web shell
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

class PRDC_JSLAB_WEB_RPC {

  /**
   * Creates an RPC bridge around a message endpoint.
   * @param {Worker|DedicatedWorkerGlobalScope|Window} endpoint
   */
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.pending = new Map();
    this.handlers = new Map();
    this.event_handlers = new Map();
    this._message_counter = 0;

    this._onMessage = this._onMessage.bind(this);
    if(this.endpoint && typeof this.endpoint.addEventListener === 'function') {
      this.endpoint.addEventListener('message', this._onMessage);
    }
  }

  /**
   * Registers a request handler.
   * @param {string} method
   * @param {Function} handler
   */
  register(method, handler) {
    this.handlers.set(method, handler);
  }

  /**
   * Calls a remote method.
   * @param {string} method
   * @param {*} params
   * @returns {Promise<*>}
   */
  call(method, params) {
    var obj = this;
    var id = 'rpc-' + (++this._message_counter);

    return new Promise(function(resolve, reject) {
      obj.pending.set(id, { resolve: resolve, reject: reject });
      obj._post({
        __jslab_web_rpc__: true,
        kind: 'request',
        id: id,
        method: method,
        params: params
      });
    });
  }

  /**
   * Sends an event-style notification without awaiting a response.
   * @param {string} event_name
   * @param {*} data
   */
  notify(event_name, data) {
    this._post({
      __jslab_web_rpc__: true,
      kind: 'event',
      event: event_name,
      data: data
    });
  }

  /**
   * Adds an event listener.
   * @param {string} event_name
   * @param {Function} handler
   */
  on(event_name, handler) {
    if(!this.event_handlers.has(event_name)) {
      this.event_handlers.set(event_name, []);
    }
    this.event_handlers.get(event_name).push(handler);
  }

  /**
   * Handles incoming messages.
   * @param {MessageEvent} event
   */
  async _onMessage(event) {
    var data = event && event.data;
    if(!data || data.__jslab_web_rpc__ !== true) {
      return;
    }

    if(data.kind == 'response') {
      var pending = this.pending.get(data.id);
      if(!pending) {
        return;
      }
      this.pending.delete(data.id);
      if(data.ok) {
        pending.resolve(data.result);
      } else {
        pending.reject(new Error(data.error || 'Unknown RPC error'));
      }
      return;
    }

    if(data.kind == 'event') {
      var handlers = this.event_handlers.get(data.event) || [];
      handlers.forEach(function(handler) {
        handler(data.data);
      });
      return;
    }

    if(data.kind == 'request') {
      var handler = this.handlers.get(data.method);
      if(typeof handler != 'function') {
        this._post({
          __jslab_web_rpc__: true,
          kind: 'response',
          id: data.id,
          ok: false,
          error: 'No handler for RPC method ' + data.method
        });
        return;
      }

      try {
        var result = await handler(data.params, event);
        this._post({
          __jslab_web_rpc__: true,
          kind: 'response',
          id: data.id,
          ok: true,
          result: result
        });
      } catch(err) {
        this._post({
          __jslab_web_rpc__: true,
          kind: 'response',
          id: data.id,
          ok: false,
          error: err && err.stack ? err.stack : String(err)
        });
      }
    }
  }

  /**
   * Posts a message through the configured endpoint.
   * @param {Object} payload
   */
  _post(payload) {
    if(!this.endpoint || typeof this.endpoint.postMessage != 'function') {
      throw new Error('RPC endpoint is not available');
    }
    this.endpoint.postMessage(payload);
  }
}

exports.PRDC_JSLAB_WEB_RPC = PRDC_JSLAB_WEB_RPC;
