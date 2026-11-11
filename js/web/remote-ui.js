/**
 * @file Shared-memory browser object and callback bridge for the scientific worker
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const REMOTE = Symbol('jslab.remote.reference');
const TYPED_ARRAYS = { Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array };

/** Encodes local structured data and callbacks; remote references keep their identity. */
function encodeLocal(value, callback, seen = new Map()) {
  if(value === undefined) return { t: 'undefined' };
  if(typeof value === 'number' && !Number.isFinite(value)) return { t: 'number', v: String(value) };
  if(typeof value === 'bigint') return { t: 'bigint', v: String(value) };
  if(value === null || !['object', 'function', 'symbol'].includes(typeof value)) return value;
  if(typeof value === 'symbol') {
    const name = Object.getOwnPropertyNames(Symbol).find(name => Symbol[name] === value);
    if(!name) throw Error('Only well-known symbols can cross the browser bridge.');
    return { t: 'symbol', v: name };
  }
  if(value[REMOTE]) return { t: 'reference', id: value[REMOTE].id };
  if(typeof value === 'function') return { t: 'callback', id: callback(value) };
  if(seen.has(value)) return { t: 'cycle', id: seen.get(value) };
  const id = seen.size + 1; seen.set(value, id);
  if(ArrayBuffer.isView(value) && !(value instanceof DataView)) return { t: 'typed', id, name: value.constructor.name, v: Array.from(value) };
  if(value instanceof ArrayBuffer) return { t: 'buffer', id, v: Array.from(new Uint8Array(value)) };
  if(Array.isArray(value)) return { t: 'array', id, v: value.map(item => encodeLocal(item, callback, seen)) };
  const entries = Object.keys(value).map(key => [key, encodeLocal(value[key], callback, seen)]);
  return { t: 'object', id, v: entries };
}

/** Owns native browser objects, listeners and promises on the responsive UI thread. */
class PRDC_JSLAB_REMOTE_UI_HOST {
  constructor(roots, send) {
    this.roots = roots; this.send = send; this.objects = new Map(); this.ids = new WeakMap();
    this.callbacks = new Map(); this.listeners = []; this.promise_ids = new Set(); this.sequence = 0; this.closed = false;
  }

  /** Encodes a browser result without copying a DOM node or a live object. */
  encode(value) {
    if(typeof value === 'string' && value.length > 8192) {
      const id = String(++this.sequence); this.objects.set(id, value);
      return { t: 'string', id, length: value.length };
    }
    if(value === undefined) return { t: 'undefined' };
    if(typeof value === 'number' && !Number.isFinite(value)) return { t: 'number', v: String(value) };
    if(typeof value === 'bigint') return { t: 'bigint', v: String(value) };
    if(value === null || !['object', 'function'].includes(typeof value)) return value;
    if(this.ids.has(value)) {
      const id = this.ids.get(value);
      return { t: this.promise_ids.has(id) ? 'promise' : 'reference', id, callable: typeof value === 'function' };
    }
    const id = String(++this.sequence); this.ids.set(value, id); this.objects.set(id, value);
    if(value instanceof Promise || Object.prototype.toString.call(value) === '[object Promise]') {
      this.promise_ids.add(id);
      Promise.resolve(value).then(result => {
        if(!this.closed) this.send({ type: 'remote-promise', id, value: this.encode(result) });
      }, error => {
        if(!this.closed) this.send({ type: 'remote-promise', id, error: String(error?.message || error) });
      });
      return { t: 'promise', id };
    }
    return { t: 'reference', id, callable: typeof value === 'function' };
  }

  /** Decodes cloned input data and maps worker callbacks to asynchronous browser callbacks. */
  decode(value, seen = new Map()) {
    if(value === null || typeof value !== 'object' || !value.t) return value;
    if(value.t === 'undefined') return undefined;
    if(value.t === 'number') return Number(value.v);
    if(value.t === 'bigint') return BigInt(value.v);
    if(value.t === 'symbol') return Symbol[value.v];
    if(value.t === 'reference') {
      if(!this.objects.has(value.id)) throw Error('Browser object reference has expired.');
      return this.objects.get(value.id);
    }
    if(value.t === 'callback') {
      if(!this.callbacks.has(value.id)) {
        const host = this;
        this.callbacks.set(value.id, function(...args) {
          if(!host.closed) host.send({ type: 'remote-callback', id: value.id,
            receiver: host.encode(this), args: args.map(argument => host.encode(argument)) });
        });
      }
      return this.callbacks.get(value.id);
    }
    if(value.t === 'cycle') return seen.get(value.id);
    let result;
    if(value.t === 'array') result = [];
    else if(value.t === 'typed') result = new (TYPED_ARRAYS[value.name] || Uint8Array)(value.v);
    else if(value.t === 'buffer') result = new Uint8Array(value.v).buffer;
    else result = {};
    seen.set(value.id, result);
    if(value.t === 'array') value.v.forEach(item => result.push(this.decode(item, seen)));
    if(value.t === 'object') value.v.forEach(([key, item]) => Object.defineProperty(result, key,
      { value: this.decode(item, seen), writable: true, enumerable: true, configurable: true }));
    return result;
  }

  /** Handles one synchronous request and wakes the worker even when the operation throws. */
  handle(message) {
    const control = new Int32Array(message.buffer, 0, 4);
    const payload = new Uint8Array(message.buffer, 16);
    let response;
    try {
      if(this.closed) throw Error('Browser object bridge is closed.');
      const operation = message.operation;
      let result;
      if(operation.action === 'cleanup') { this.clearListeners(); result = true; }
      else if(operation.action === 'root') result = this.roots[operation.name];
      else {
        const target = this.objects.get(operation.target);
        if(target === undefined) throw Error('Browser object reference has expired.');
        const key = this.decode(operation.key);
        if(operation.action === 'slice') result = target.slice(operation.start, operation.start + operation.length);
        else if(operation.action === 'get') result = Reflect.get(target, key, target);
        else if(operation.action === 'set') result = Reflect.set(target, key, this.decode(operation.value), target);
        else if(operation.action === 'delete') result = Reflect.deleteProperty(target, key);
        else if(operation.action === 'has') result = Reflect.has(target, key);
        else if(operation.action === 'keys') result = Object.getOwnPropertyNames(target);
        else if(operation.action === 'call' || operation.action === 'construct') {
          const args = this.decode(operation.args);
          const receiver = operation.receiver ? this.objects.get(operation.receiver) : undefined;
          if(operation.action === 'construct') result = Reflect.construct(target, args);
          else {
            result = Reflect.apply(target, receiver, args);
            if(receiver?.addEventListener === target && args[1]) this.listeners.push([receiver, args[0], args[1], args[2]]);
          }
        } else if(operation.action === 'release') { this.objects.delete(operation.target); result = true; }
        else throw Error('Unknown browser bridge operation.');
      }
      response = { value: message.operation.action === 'keys' ? { t: 'keys', v: result } : this.encode(result) };
    } catch(error) { response = { error: String(error?.message || error) }; }
    let bytes = new TextEncoder().encode(JSON.stringify(response));
    if(bytes.length > payload.length) bytes = new TextEncoder().encode(JSON.stringify({ error: 'Browser bridge response exceeds its limit.' }));
    payload.set(bytes); Atomics.store(control, 1, bytes.length); Atomics.store(control, 0, 1); Atomics.notify(control, 0);
  }

  /** Releases owned callbacks and references when the scientific session is reset. */
  dispose() {
    this.closed = true;
    this.clearListeners();
    this.callbacks.clear(); this.objects.clear();
  }

  /** Removes only this worker's registered listeners, preserving the application UI. */
  clearListeners() {
    for(const [target, type, callback, options] of this.listeners) target.removeEventListener(type, callback, options);
    this.listeners = [];
  }
}

/** Presents synchronous DOM references and asynchronous callbacks inside a Worker. */
class PRDC_JSLAB_REMOTE_UI_CLIENT {
  constructor(send, control, NativePromise = Promise) {
    this.send = send; this.control = control; this.NativePromise = NativePromise;
    this.proxies = new Map(); this.callbacks = new Map(); this.callback_ids = new WeakMap(); this.sequence = 0;
    this.promises = new Map();
  }

  /** Binds root window/document/bridge objects without moving user variables. */
  root(name) { return this.request({ action: 'root', name }); }

  /** Releases this worker's event listeners without replacing the host document. */
  clearListeners() {
    const result = this.request({ action: 'cleanup' });
    this.callbacks.clear(); this.callback_ids = new WeakMap();
    return result;
  }

  /** Registers a local closure; its identity is reused for removeEventListener. */
  _callback(value) {
    if(!this.callback_ids.has(value)) { const id = String(++this.sequence); this.callback_ids.set(value, id); this.callbacks.set(id, this.guard ? this.guard(value) : value); }
    return this.callback_ids.get(value);
  }

  /** Performs an interruptible synchronous request while the browser remains responsive. */
  request(operation) {
    const buffer = new SharedArrayBuffer(65536);
    const result = new Int32Array(buffer, 0, 4);
    const origin = new Error();
    this.send({ type: 'remote-request', operation, buffer });
    const deadline = Date.now() + 30000;
    while(Atomics.load(result, 0) === 0) {
      if(operation.action !== 'cleanup' && this.control && Atomics.load(this.control, 0) === 4) throw Object.assign(new Error('Execution interrupted.'), { name: 'JslabInterrupted' });
      if(Date.now() >= deadline) throw Error('Browser object request timed out.');
      Atomics.wait(result, 0, 0, 50);
    }
    const response = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 16, Atomics.load(result, 1)).slice()));
    if(response.error) { origin.message = response.error; origin.stack = 'Error: ' + response.error + '\n' + origin.stack.split('\n').slice(1).join('\n'); throw origin; }
    return this.decode(response.value, operation.action === 'get' ? operation.target : undefined);
  }

  /** Reconstructs live references, preserving identity across repeated property reads. */
  decode(value, receiver) {
    if(value === null || typeof value !== 'object' || !value.t) return value;
    if(value.t === 'undefined') return undefined;
    if(value.t === 'number') return Number(value.v);
    if(value.t === 'bigint') return BigInt(value.v);
    if(value.t === 'keys') return value.v;
    if(value.t === 'string') {
      let text = '';
      for(let start = 0; start < value.length; start += 8192) text += this.request({ action: 'slice', target: value.id, start, length: 8192 });
      this.request({ action: 'release', target: value.id });
      return text;
    }
    if(value.t === 'promise') {
      if(!this.promises.has(value.id)) {
        const promise = new this.NativePromise((resolve, reject) => { this.promises.set(value.id, { resolve, reject }); });
        this.promises.get(value.id).promise = promise;
      }
      return this.promises.get(value.id).promise;
    }
    if(value.t !== 'reference') throw Error('Invalid browser reference.');
    if(this.proxies.has(value.id)) return this.proxies.get(value.id);
    const client = this;
    const target = value.callable ? function() {} : {};
    const proxy = new Proxy(target, {
      get(_target, key) {
        if(key === REMOTE) return { id: value.id };
        if(key === Symbol.toStringTag) return 'RemoteBrowserObject';
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        if(descriptor && !descriptor.configurable && !descriptor.writable) return descriptor.value;
        return client.request({ action: 'get', target: value.id, key: encodeLocal(key, callback => client._callback(callback)) });
      },
      set(_target, key, item) { return client.request({ action: 'set', target: value.id,
        key: encodeLocal(key, callback => client._callback(callback)), value: encodeLocal(item, callback => client._callback(callback)) }); },
      deleteProperty(_target, key) { return client.request({ action: 'delete', target: value.id, key: encodeLocal(key, callback => client._callback(callback)) }); },
      has(_target, key) { return client.request({ action: 'has', target: value.id, key: encodeLocal(key, callback => client._callback(callback)) }); },
      ownKeys() { return [...new Set([...Reflect.ownKeys(target), ...client.request({ action: 'keys', target: value.id })])]; },
      getOwnPropertyDescriptor(_target, key) { return Reflect.getOwnPropertyDescriptor(target, key) || { enumerable: true, configurable: true }; },
      apply(_target, this_value, args) { return client.request({ action: 'call', target: value.id,
        receiver: this_value?.[REMOTE]?.id || receiver, args: encodeLocal(args, callback => client._callback(callback)) }); },
      construct(_target, args) { return client.request({ action: 'construct', target: value.id, args: encodeLocal(args, callback => client._callback(callback)) }); }
    });
    this.proxies.set(value.id, proxy);
    return proxy;
  }

  /** Delivers native promise results and browser callbacks to their original worker closures. */
  message(message) {
    if(message.type === 'remote-promise') {
      const pending = this.promises.get(message.id);
      if(pending) { if(message.error) pending.reject(Error(message.error)); else pending.resolve(this.decode(message.value)); }
      return true;
    }
    if(message.type === 'remote-callback') {
      const callback = this.callbacks.get(message.id);
      if(callback) callback.apply(this.decode(message.receiver), message.args.map(value => this.decode(value)));
      return true;
    }
    return false;
  }
}
exports.PRDC_JSLAB_REMOTE_UI_HOST = PRDC_JSLAB_REMOTE_UI_HOST;
exports.PRDC_JSLAB_REMOTE_UI_CLIENT = PRDC_JSLAB_REMOTE_UI_CLIENT;
exports.encodeLocal = encodeLocal;
