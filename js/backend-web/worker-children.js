/**
 * @file Browser child-worker ownership and scientific task proxy
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for web worker children operations.
 */
class PRDC_JSLAB_WEB_WORKER_CHILDREN_HELPER {

  /**
   * Creates Worker-compatible endpoints whose actual runtimes are owned by the UI host.
   */
  static createWorkerClass(getRuntime, files, send) {
    const endpoints = new Map();
    let sequence = 0;
    /**
     * Class for child worker.
     */
    class PRDC_JSLAB_CHILD_WORKER extends EventTarget {
      /**
       * Initializes the child worker instance.
       * @param {string} url Url.
       * @param {Object} [options] Options.
       */
      constructor(url, options = {}) {
        super();
        this.id = 'child-' + (++sequence);
        this.name = options.name || this.id;
        this.queue = [];
        this.ready = false;
        this.closed = false;
        endpoints.set(this.id, this);
        const request = String(url);
        const path = request.startsWith('/workspace/') ? request : '/workspace/' + request.replace(/^\.\//, '');
        const source = files.has(path) ? Promise.resolve(files.get(path)) : fetch(request).then(response => {
          if(!response.ok) {
            throw Error('Could not load worker source: ' + request);
          }
          return response.text();
        });
        source.then(code => {
          if(this.closed) {
            return;
          }
          send({ type: 'target-create', id: this.id, source: String(code), path: files.has(path) ? path : request,
            name: this.name, files: Object.fromEntries(files), cwd: getRuntime()?.current_path || '/workspace/' });
        }).catch(error => this._event('error', { message: error.message }));
      }

      /**
       * Sends a message to the endpoint.
       * @param {*} data Data.
       * @param {*} [transfer] Transfer.
       */
      postMessage(data, transfer = []) {
        if(this.closed) {
          throw Error('Child worker has been terminated.');
        }
        if(!this.ready) {
          this.queue.push([data, transfer]);
          return;
        }
        send({ type: 'target-post', id: this.id, data, transfer }, transfer);
      }

      /**
       * Terminates.
       */
      terminate() {
        if(this.closed) {
          return;
        }
        this.closed = true;
        endpoints.delete(this.id);
        this.queue = [];
        send({ type: 'target-terminate', id: this.id });
      }

      /**
       * Dispatches an event for.
       * @param {*} type Type.
       * @param {*} payload Payload.
       */
      _event(type, payload) {
        if(this.closed) {
          return;
        }
        if(type === 'ready') {
          this.ready = true;
          for(const [data, transfer] of this.queue.splice(0)) {
            this.postMessage(data, transfer);
          }
          return;
        }
        const event = type === 'message' ? new MessageEvent('message', { data: payload }) :
          new ErrorEvent('error', { message: payload.message || String(payload), filename: payload.location?.path || '',
            lineno: payload.location?.line || 0, colno: payload.location?.column || 0,
            error: Object.assign(Error(payload.message || String(payload)), { jslab_error_details: payload }) });
        this.dispatchEvent(event);
        if(typeof this['on' + type] === 'function') {
          this['on' + type](event);
        }
      }
    }
    PRDC_JSLAB_CHILD_WORKER.deliver = message => endpoints.get(message.id)?._event(message.event, message.data);
    return PRDC_JSLAB_CHILD_WORKER;
  }
}


exports.createWorkerClass = PRDC_JSLAB_WEB_WORKER_CHILDREN_HELPER.createWorkerClass;
