/**
 * @file Isolated numerical JSLAB worker with source debugging
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
globalThis.global = globalThis;
globalThis.__JSLAB_RUNTIME__ = 'web';
globalThis.process_arguments = [];
globalThis.process = { argv: [], env: {}, platform: 'browser', cwd: () => '/workspace/' };
globalThis.requestAnimationFrame = callback => setTimeout(() => callback(performance.now()), 16);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.requestIdleCallback = callback => setTimeout(() => callback({ timeRemaining: () => 5 }), 1);
globalThis.cancelIdleCallback = clearTimeout;
require('../shared/init-config');
const { PRDC_JSLAB_LIB } = require('../sandbox/jslab');
const { initializeWasm } = require('../sandbox/jslab-wasm-loader');
const { PRDC_JSLAB_WEB_WORKER_DEBUGGER } = require('./worker-debugger-runtime');
const { createWorkerClass } = require('./worker-children');
const { PRDC_JSLAB_REMOTE_UI_CLIENT } = require('./remote-ui');
const { PRDC_JSLAB_WEB_WORKER_UI } = require('./worker-ui');
const { PRDC_JSLAB_WEB_WORKER_MODULES } = require('./worker-modules');
const strings = require('../../config/lang.json');
const send = globalThis.postMessage.bind(globalThis);
let jsl;
let debugger_runtime;
let boot;
let modules;
let ui;
let remote;
let ChildWorker;
const files = new Map();

/** Starts the ordinary scientific runtime with an in-memory file snapshot. */
async function initialize(buffer, options = {}) {
  if(options.remote_ui) {
    remote = new PRDC_JSLAB_REMOTE_UI_CLIENT(send, new Int32Array(buffer, 0, 8));
    globalThis.window = remote.root('window');
    globalThis.document = remote.root('document');
  }
  importScripts(new URL('../lib/native-wasm/native_module.js', location.href).href,
    new URL('../lib/native-wasm/alpha_shape_3d.js', location.href).href);
  const locateFile = name => new URL('../lib/native-wasm/' + name, location.href).href;
  await initializeWasm(() => globalThis.PRDC_JSLAB_NATIVE_MODULE_FACTORY({ locateFile }),
    () => globalThis.PRDC_JSLAB_ALPHA_SHAPE_3D_FACTORY({ locateFile }));
  globalThis.language = { s: strings, lang: options.lang || 'en',
    string: id => strings[id]?.[globalThis.language.lang] || strings[id]?.en || String(id),
    currentString: id => globalThis.language.string(id) };
  globalThis.__JSLAB_WEB_BRIDGE__ = {
    readWorkspaceTextSync(path) { if(!files.has(path)) throw Error('File not found: ' + path); const data = files.get(path); return typeof data === 'string' ? data : new TextDecoder().decode(data); },
    readWorkspaceBytesSync(path) { const data = files.get(path); return typeof data === 'string' ? new TextEncoder().encode(data) : data; },
    existsWorkspaceFileSync(path) { return files.has(path); }
  };
  if(remote) {
    const host = remote.root('bridge');
    globalThis.__JSLAB_WEB_BRIDGE__ = new Proxy(globalThis.__JSLAB_WEB_BRIDGE__, {
      get(target, key) { return key in target ? target[key] : host[key]; }
    });
  }
  ChildWorker = createWorkerClass(() => jsl, files, send);
  globalThis.Worker = ChildWorker;
  jsl = new PRDC_JSLAB_LIB('', false);
  jsl.inter.execution._send = send;
  if(remote) {
    jsl.inter.execution.remote_ui = remote;
    remote.guard = callback => jsl.inter.execution.wrap(callback);
  }
  jsl.current_path = '/workspace/';
  jsl.includes_path = '/includes/';
  jsl.saved_paths = ['/workspace/'];
  jsl.emitRuntimeMessage = (message, level) => send({ type: 'runtime-log', message: String(message), level: level || 'info' });
  jsl.emitUnavailable = message => jsl.emitRuntimeMessage(message, 'warn');
  jsl.onWorkspaceUpdated = () => send({ type: 'workspace', workspace: jsl.getWorkspace() });
  debugger_runtime = new PRDC_JSLAB_WEB_WORKER_DEBUGGER(jsl, buffer);
  jsl.inter.execution.web_debugger = debugger_runtime;
  modules = new PRDC_JSLAB_WEB_WORKER_MODULES(jsl, files);
  jsl.context.require = modules.require.bind(modules);
  jsl.inter.execution.web_modules = modules;
  ui = new PRDC_JSLAB_WEB_WORKER_UI(jsl, files, send);
  if(!remote) ui.install();
  jsl.inter.execution.beforeComplete = async () => {
    if(remote) {
      for(const figure of Object.values(jsl.inter.figures.open_figures)) {
        await figure.ready;
        if(figure.plot) await figure.plot.ready;
      }
    }
    await ui.flush();
  };
  const bridge = globalThis.__JSLAB_WEB_BRIDGE__;
  bridge.writeWorkspaceTextSync = (path, value) => {
    if(!String(path).startsWith('/workspace/')) throw Error('Expected a workspace path.');
    files.set(path, String(value));
    ui.request({ kind: 'write-text', path, text: String(value) });
    return true;
  };
  bridge.writeWorkspaceBytesSync = (path, bytes) => {
    if(!String(path).startsWith('/workspace/')) throw Error('Expected a workspace path.');
    const data = new Uint8Array(bytes); files.set(path, data);
    ui.request({ kind: 'write-bytes', path, bytes: data });
    return true;
  };
  for(const [path, value] of Object.entries(options.files || {})) files.set(path, value);
  if(options.cwd) jsl.current_path = options.cwd;
  if(options.child_source !== undefined) {
    jsl.inter.execution.onAsyncError = details => send({ type: 'target-user-error', details });
    globalThis.postMessage = (data, transfer) => send({ type: 'target-user-message', data }, transfer || []);
    debugger_runtime.begin(options);
    debugger_runtime.active = true;
    const result = await jsl.inter.eval.evalCodeFromMain(options.child_source, false, options.path || 'child-worker.jsl');
    debugger_runtime.active = false;
    if(!result.success) throw Object.assign(Error(result.error), { error_details: result.error_details });
  }
  send({ type: 'ready' });
}

addEventListener('message', async event => {
  if(event.__jslab_user_message) return;
  const request = event.data;
  if(!request || typeof request !== 'object') return;
  event.stopImmediatePropagation();
  if(request.type === 'target-user-post') {
    const forwarded = new MessageEvent('message', { data: request.data });
    Object.defineProperty(forwarded, '__jslab_user_message', { value: true });
    dispatchEvent(forwarded);
    if(!debugger_runtime?.active) send({ type: 'debug-state', state: 'idle' });
    return;
  }
  if(request.type === 'target-event') { ChildWorker?.deliver(request); return; }
  if(remote && ['remote-promise', 'remote-callback'].includes(request?.type)) {
    try { remote.message(request); } catch(error) { await jsl.inter.eval.reportAsyncError(error); }
    return;
  }
  if(request.type === 'ui-response') { ui?.response(request); return; }
  if(request.type === 'initialize') {
    boot = initialize(request.buffer, request);
    boot.catch(error => send({ type: 'boot-error', error: String(error.stack || error) }));
    return;
  }
  try {
    await boot;
    if(request.type === 'operation') {
      try {
        let result;
        if(request.method === 'completions') result = jsl.inter.basic.getCompletions(request.args.data);
        else if(request.method === 'language') {
          globalThis.language.lang = request.args.lang;
          jsl.inter.windows._updateLanguage();
          result = true;
        }
        else if(request.method === 'window-closed') { jsl.inter.windows._closedWindow(request.args.wid); result = true; }
        else if(request.method === 'clear') {
          if(debugger_runtime.active) throw Error('Stop execution before clearing its workspace.');
          result = await jsl.inter.eval.evalCodeFromMain('clear;', false);
          if(!result.success) throw Error(result.error);
          result = jsl.getWorkspace();
        } else throw Error('Unknown scientific workspace operation.');
        send({ type: 'operation-result', id: request.id, result });
      } catch(error) { send({ type: 'operation-result', id: request.id, error: String(error.message || error) }); }
      return;
    }
    if(request.type === 'interrupt-background') {
      if(Atomics.load(debugger_runtime.control, 0) === 4) {
        if(debugger_runtime.active) jsl.inter.execution.cancel(jsl.inter.execution.current?.id || null);
        else {
          await jsl.inter.execution.interrupt(null);
          debugger_runtime.resetControl();
          send({ type: 'debug-state', state: 'idle' });
        }
      }
      return;
    }
    if(request.type === 'evaluate') {
      if(debugger_runtime.active) throw Error('Worker debugger is busy.');
      if(request.cwd) jsl.current_path = request.cwd;
      for(const [path, text] of Object.entries(request.files || {})) {
        if(files.get(path) !== text) modules.clear();
        files.set(path, text);
      }
      debugger_runtime.begin({ breakpoints: request.breakpoints, pause_on_exceptions: request.pause_on_exceptions });
      debugger_runtime.active = true;
      ui.tasks = [];
      const result = await jsl.inter.eval.evalCodeFromMain(request.code, true, request.path || 'jslcmdwindow');
      debugger_runtime.active = false;
      if(result.interrupted) {
        Atomics.store(debugger_runtime.control, 0, 0);
        await jsl.inter.execution.interrupt(null);
      }
      send({ type: 'evaluated', id: request.id, result: {
        success: result.success, interrupted: result.interrupted, error: result.error,
        error_details: result.error_details,
        value: result.value === null || ['undefined', 'number', 'string', 'boolean', 'bigint'].includes(typeof result.value) ? result.value : undefined,
        preview: debugger_runtime._preview(result.value), workspace: jsl.getWorkspace()
      } });
    }
  } catch(error) {
    if(debugger_runtime) debugger_runtime.active = false;
    send({ type: 'evaluated', id: request.id, result: { success: false, error: String(error.stack || error) } });
  }
});
