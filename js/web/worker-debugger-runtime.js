/**
 * @file Synchronous worker debugger using an out-of-band shared control channel
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { TraceMap, originalPositionFor } = require('@jridgewell/trace-mapping');

/** Keeps the worker stack alive while the browser UI inspects its current scope. */
class PRDC_JSLAB_WEB_WORKER_DEBUGGER {
  /** @param {Object} jsl Runtime. @param {SharedArrayBuffer} buffer Control channel. */
  constructor(jsl, buffer) {
    this.jsl = jsl;
    this._send = jsl.inter.execution?._send || (typeof globalThis.postMessage === 'function' ? globalThis.postMessage.bind(globalThis) : () => {});
    this.control = new Int32Array(buffer, 0, 8);
    this.payload = new Uint8Array(buffer, 32);
    this.enabled = true;
    this.active = false;
    this.breakpoints = new Map();
    this.step = null;
    this.revision = 0;
    this.metadata = new Map();
    this.live = new Map();
    this.programs = new Map();
    this.sequence = 0;
    this.handles = new Map();
    this.pause_on_exceptions = 'none';
    this.async_parent = [];
    this.function_sources = new WeakMap();
  }

  /** Preserves source for isolated execution without copying generated debugger closures. */
  rememberFunction(fn, source, inferred_name = '') {
    this.function_sources.set(fn, source);
    if(!fn.name && inferred_name) Object.defineProperty(fn, 'name', { value: inferred_name, configurable: true });
    return fn;
  }

  /** Returns the original function body before automatic debugger instrumentation. */
  originalFunctionSource(fn) { return this.function_sources.get(fn); }

  /** Initializes a new top-level execution without retaining dead scope closures. */
  begin(settings = {}) {
    this.live.clear(); this.programs.clear(); this.handles.clear();
    this.last_exception = null; this.previous_location = null; this.step = null; this.last_point = null;
    this.configure(settings);
  }

  /** Applies debugger settings without rewriting or restarting user code. */
  configure(settings) {
    this.breakpoints = new Map((settings.breakpoints || []).map(point => typeof point === 'string' ?
      [point, { enabled: true, condition: '' }] : [point.path + ':' + point.line, point]));
    this.pause_on_exceptions = settings.pause_on_exceptions || 'none';
  }

  /** Requests a source-level pause without entering browser DevTools. */
  pause() { Atomics.store(this.control, 0, 1); }

  /** Requests interruption through the raw shared control buffer. */
  interrupt() { Atomics.store(this.control, 0, 4); }

  /** Clears a completed background interruption's control command. */
  resetControl() { Atomics.store(this.control, 0, 0); }

  /** Retains a live lexical function scope without changing its call convention. */
  enter(serialized, evaluate) {
    const id = ++this.sequence;
    this.live.set(id, { id, location: this._metadata(serialized), evaluate, parent: this.last_point, async_parent: this.async_parent });
    return id;
  }

  /** Captures scheduling ancestry as read-only locations, without retaining user values. */
  captureAsync() {
    const frames = this._frames(new Error().stack).slice(0, 64).map(frame => ({ ...frame, inspectable: false }));
    if(!frames.length) return this.async_parent;
    return [{ description: 'Scheduled callback', frames }, ...(this.async_parent || [])].slice(0, 32);
  }

  /** Executes a scheduled callback without passing mutable history through internal proxies. */
  withAsync(history, callback, receiver, args) {
    const previous = this.async_parent;
    this.async_parent = history;
    try { return callback.apply(receiver, args); }
    finally { this.async_parent = previous; }
  }

  /** Releases a function scope on return, rejection, or generator completion. */
  leave(id) { this.live.delete(id); }

  /** Pauses an explicit throw before user catch/finally clauses unwind it. */
  raise(value, serialized, evaluate, id) {
    const location = this._metadata(serialized);
    this.exception(value, id, { location, evaluate, id });
    return value;
  }

  /** A user catch handler only stops when caught-error debugging is enabled. */
  caught(value) {
    if(this.pause_on_exceptions === 'all') this.exception(value);
  }

  /** Pauses implicit function failures before their lexical scopes disappear. */
  exception(value, id, point) {
    if(!this.enabled || this.pause_on_exceptions === 'none') return;
    try { if(value && Object.getOwnPropertyDescriptor(value, 'name')?.value === 'JslabInterrupted') return; } catch(error) {}
    if(this.last_exception && Object.is(this.last_exception.value, value)) return;
    const owner = this.live.get(id);
    const record = point || owner?.last || owner || this.last_point;
    if(!record) return;
    const frames = this._boundFrames(value?.stack || new Error().stack, record);
    if(this.pause_on_exceptions === 'uncaught' && frames.some(frame => frame.binding?.location.caught)) return;
    this.last_exception = { value };
    this._pause(record, frames, 'exception', this._preview(value));
  }

  /** Called automatically by rewritten JavaScript, including otherwise empty loops. */
  checkpoint(serialized, evaluate, id) {
    if(!this.enabled) return;
    const location = this._metadata(serialized);
    this.last_exception = null;
    const record = { location, evaluate, id };
    this.last_point = record;
    const live = this.live.get(id);
    if(live) live.last = record;
    else this.programs.set(location.path, record);
    if(location.stop) Atomics.store(this.control, 0, 4);
    let command = Atomics.load(this.control, 0);
    if(command === 6) {
      const request = this._read();
      this.configure(request.settings);
      Atomics.store(this.control, 0, 0);
      this._send({ type: 'debug-result', id: request.id, result: { success: true } });
      command = 0;
    }
    if(command === 4) return this._stop();
    if(command !== 1 && !this.step && !this.breakpoints.size && !location.force) return;
    const frames = this._boundFrames(new Error().stack, record);
    const depth = frames.length;
    const step = this.step && (this.step.action === 'stepInto' ||
      this.step.action === 'stepOver' && depth <= this.step.depth || this.step.action === 'stepOut' && depth < this.step.depth);
    const breakpoint = this.breakpoints.get(location.path + ':' + location.line);
    let hit = !!breakpoint && breakpoint.enabled !== false;
    if(hit && breakpoint.condition) {
      try { hit = !!evaluate(breakpoint.condition); }
      catch(error) { hit = false; }
    }
    if(this.skip_breakpoint === serialized) hit = false;
    this.skip_breakpoint = null;
    if(command !== 1 && !location.force && !step && !hit) return;
    this._pause(record, frames, hit ? 'breakpoint' : 'pause');
    this.skip_breakpoint = serialized;
  }

  /** @private */
  _stop() {
    this.jsl.inter.execution.cancel(this.jsl.inter.execution.current?.id || null);
    throw Object.assign(new Error('Execution interrupted.'), { name: 'JslabInterrupted' });
  }

  /** @private */
  _metadata(serialized) {
    if(!this.metadata.has(serialized)) this.metadata.set(serialized, JSON.parse(serialized));
    return this.metadata.get(serialized);
  }

  /** Keeps all inspectable frame closures alive while Atomics suspends execution. */
  _pause(record, frames, reason, exception) {
    this.step = null; this.handles.clear();
    this.paused_frames = frames;
    this.selected_frame = 0;
    Atomics.store(this.control, 0, 2);
    this.revision++;
    const variables = this._variables(record.location.names, record.evaluate);
    this._send({ type: 'debug-paused', state: 'paused', revision: this.revision,
      location: record.location, reason, exception,
      async_stack: this.live.get(record.id)?.async_parent || this.async_parent || [],
      frames: frames.map(({ binding, ...frame }) => ({ ...frame, inspectable: !!binding })), variables });
    while(true) {
      const action = Atomics.load(this.control, 0);
      if(action === 4) return this._stop();
      if(action === 3) {
        this.step = this._read();
        if(this.step.action === 'continue') this.step = null;
        else this.step.depth = frames.length;
        this.handles.clear(); this.paused_frames = null;
        Atomics.store(this.control, 0, 0);
        this._send({ type: 'debug-state', state: 'running', revision: ++this.revision });
        return;
      }
      if(action === 5 || action === 6) {
        const request = this._read();
        let result;
        try {
          if(request.kind === 'edit') result = this.jsl.inter.eval._applyFunctionEdits(request.code, request.path, request.dry_run);
          else if(request.kind === 'settings') { this.configure(request.settings); result = { success: true }; }
          else if(request.kind === 'properties') result = this.properties(request.object_id);
          else {
            const index = request.frame_index ?? this.selected_frame;
            const frame = frames[index];
            if(!frame?.binding) throw Error('This frame has no retained lexical scope.');
            this.selected_frame = index;
            result = request.kind === 'frame' ? { success: true } :
              this._evaluate(frame.binding, request.expression);
          }
        } catch(error) { result = { success: false, error: String(error.message || error) }; }
        Atomics.store(this.control, 0, 2);
        const selected = frames[this.selected_frame]?.binding || record;
        this._send({ type: 'debug-result', id: request.id, result,
          variables: this._variables(selected.location.names, selected.evaluate) });
      }
      Atomics.wait(this.control, 0, 2);
    }
  }

  /** @private */
  _evaluate(binding, expression) {
    const value = binding.evaluate(expression);
    return { success: true, preview: this._preview(value), value: this._value(value) };
  }

  /** Returns bounded own descriptors; reading a getter requires an explicit expression. */
  properties(id) {
    if(!this.handles.has(id)) throw Error('Paused object handle has expired.');
    const object = this.handles.get(id);
    const length = Array.isArray(object) ? Object.getOwnPropertyDescriptor(object, 'length')?.value : 0;
    const names = length > 1000 ? Array.from({ length: 1000 }, (_, index) => String(index)) : Object.getOwnPropertyNames(object);
    return { success: true, truncated: length > 1000 || names.length > 1000, properties: names.slice(0, 1000).flatMap(name => {
      const descriptor = Object.getOwnPropertyDescriptor(object, name);
      if(!descriptor) return [];
      return [{ name, accessor: !Object.hasOwn(descriptor, 'value'), writable: descriptor.writable,
        value: Object.hasOwn(descriptor, 'value') ? this._value(descriptor.value) : undefined }];
    }) };
  }

  /** @private */
  _value(value) {
    const preview = this._preview(value);
    if(value !== null && (typeof value === 'object' || typeof value === 'function')) {
      const id = this.revision + ':' + (++this.sequence);
      this.handles.set(id, value);
      return { type: typeof value, preview, object_id: id };
    }
    return { type: typeof value, preview };
  }

  /** Matches actual synchronous/async stack frames to their retained scope closures. */
  _boundFrames(stack, record) {
    const frames = this._frames(stack);
    const used = new Set();
    const chain = [];
    for(let parent = this.live.get(record.id)?.parent; parent; parent = this.live.get(parent.id)?.parent) {
      if(chain.some(item => item === parent)) break;
      chain.push(parent);
    }
    frames.forEach((frame, index) => {
      if(index === 0) {
        frame.path = record.location.path;
        frame.line = record.location.line;
        frame.column = record.location.column;
        frame.internal = false;
        frame.binding = record;
        const owner = Array.from(this.live.entries()).reverse().find(([id, item]) => item.last === record || item === record);
        if(owner) used.add(owner[0]);
        return;
      }
      const parent = chain.find(item => !used.has(item.id) && item.location.path === frame.path);
      if(parent) { used.add(parent.id); frame.binding = parent; return; }
      const candidate = Array.from(this.live.entries()).reverse().find(([id, item]) => !used.has(id) &&
        item.location.path === frame.path && frame.line >= item.location.line && frame.line <= item.location.end_line);
      if(candidate) { used.add(candidate[0]); frame.binding = candidate[1].last || candidate[1]; }
      else frame.binding = this.programs.get(frame.path);
    });
    if(!frames.length) frames.push({ name: '(script)', path: record.location.path,
      line: record.location.line, column: record.location.column, binding: record });
    return frames;
  }

  /** @private */
  _read() {
    return JSON.parse(new TextDecoder().decode(this.payload.slice(0, Atomics.load(this.control, 1))));
  }

  /** @private */
  _preview(value) {
    if(value === null) return 'null';
    if(typeof value === 'string') return JSON.stringify(value.slice(0, 2000));
    if(typeof value === 'function') return '[Function]';
    if(Array.isArray(value)) return 'Array(' + value.length + ')';
    if(typeof value === 'object') return '[Object]';
    return String(value);
  }

  /** @private */
  _variables(names, evaluate) {
    return names.slice(0, 1000).map(name => {
      try { return { name, ...this._value(evaluate(name)) }; }
      catch(error) { return { name: name, preview: '[unavailable]' }; }
    });
  }

  /** @private */
  _frames(stack) {
    const frames = [];
    for(const line of String(stack).split('\n')) {
      const frame = this.jsl.inter.eval.source_errors.parseFrame(line);
      const source = frame && this.jsl.inter.eval.debug_sources.get(frame.path);
      if(!source) continue;
      const mapped = originalPositionFor(new TraceMap(source.map), { line: frame.line, column: frame.column - 1 });
      frames.push({ name: frame.function_name, path: source.path, line: mapped.line || frame.line,
        internal: !mapped.line,
        column: mapped.column == null ? frame.column : mapped.column + 1 });
    }
    return frames;
  }
}
exports.PRDC_JSLAB_WEB_WORKER_DEBUGGER = PRDC_JSLAB_WEB_WORKER_DEBUGGER;
