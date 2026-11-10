/**
 * @file Isolated real-DOM fixtures for desktop GUI tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { createRequire } = require('module');
const { PRDC_APP_CONFIG } = require('../../config/config');
const root = path.resolve(__dirname, '..', '..');
const handler_coverage = require('./gui-test-coverage');

/**
 * Loads actual window markup, libraries and controllers in a disposable iframe.
 * OS services are captured in memory; application bootstraps never run.
 * @param {string} type Window HTML basename.
 * @returns {Promise<Object>} Fixture with event helpers and captured host calls.
 */
async function createFixture(type) {
  var frame = document.createElement('iframe');
  frame.style.cssText = 'width:1200px;height:800px;border:0';
  var loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
  frame.src = 'about:blank';
  document.body.appendChild(frame);
  try {
    var load_timer;
    try {
      await Promise.race([loaded, new Promise((_resolve, reject) => {
        load_timer = setTimeout(() => reject(new Error('GUI fixture frame did not load')), 10000);
      })]);
    } finally { clearTimeout(load_timer); }
    return await initializeFixture(type, frame);
  } catch(err) {
    frame.remove();
    throw err;
  }
}

/**
 * Initializes libraries and services inside a new iframe.
 * @param {string} type Window HTML basename.
 * @param {HTMLIFrameElement} frame Disposable iframe.
 * @returns {Promise<Object>} Initialized fixture.
 */
async function initializeFixture(type, frame) {
  var win = frame.contentWindow;
  win.__JSLAB_GUI_HIT__ = handler_coverage.hit;
  var html = fs.readFileSync(path.join(root, 'html', type + '.html'), 'utf8');
  var scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace('<head>', '<head><base href="' + pathToFileURL(path.join(root, 'html') + path.sep).href + '">');
  win.document.open(); win.document.write(html); win.document.close();
  var errors = [];
  win.addEventListener('error', e => { errors.push(String(e.error && e.error.stack || e.message)); e.preventDefault(); });
  win.addEventListener('unhandledrejection', e => { errors.push(String(e.reason && e.reason.stack || e.reason)); e.preventDefault(); });
  var data = new Map();
  var local_data = new Map();
  Object.defineProperty(win, 'localStorage', { value: {
    getItem(key) { return local_data.has(key) ? local_data.get(key) : null; },
    setItem(key, value) { local_data.set(key, String(value)); },
    removeItem(key) { local_data.delete(key); }, clear() { local_data.clear(); }
  } });
  var files = new Map();
  var calls = [];
  var listeners = new Map();
  var dialog_result = { canceled: true, filePaths: [] };
  var sync_results = new Map();
  var clipboard_text = '';
  class MemoryStore {
    get(key, fallback) { return data.has(key) ? data.get(key) : fallback; }
    set(key, value) { data.set(key, structuredClone(value)); }
    delete(key) { data.delete(key); }
  }
  var ipc = {
    send(...args) { calls.push(args); },
    sendSync(channel, action, ...args) {
      calls.push([channel, action, ...args]);
      if(sync_results.has(action)) return sync_results.get(action);
      if(action === 'showSaveDialogSync') return undefined;
      if(action === 'get-process-arguments') return [];
      if(action === 'get-path') return root;
      if(action === 'is-maximized-win') return false;
      return 'test';
    },
    async invoke(...args) { calls.push(args); return dialog_result; },
    on(channel, listener) { listeners.set(channel, listener); },
    removeListener() {}
  };
  var safe_fs = Object.create(fs);
  safe_fs.writeFileSync = function(file, value) { files.set(String(file), String(value)); };
  safe_fs.writeFile = function(file, value, callback) { files.set(String(file), String(value)); callback(null); };
  for(const name of ['appendFile', 'appendFileSync', 'unlink', 'unlinkSync', 'rename', 'renameSync',
    'mkdir', 'mkdirSync', 'rmdir', 'rmdirSync', 'rm', 'rmSync', 'truncate', 'truncateSync',
    'copyFile', 'copyFileSync', 'write', 'writeSync', 'createWriteStream']) {
    safe_fs[name] = function() { throw new Error('Unexpected filesystem mutation in GUI fixture: ' + name); };
  }
  var safe_promises = {
    async writeFile(file, value) { files.set(String(file), String(value)); }
  };
  for(const name of ['appendFile', 'unlink', 'rename', 'mkdir', 'rmdir', 'rm', 'truncate', 'copyFile', 'open']) {
    safe_promises[name] = async function() { throw new Error('Unexpected filesystem mutation in GUI fixture: ' + name); };
  }
  Object.defineProperty(safe_fs, 'promises', { value: {
    ...fs.promises,
    ...safe_promises
  } });
  safe_fs.readFileSync = function(file, options) {
    if(files.has(String(file))) return options ? files.get(String(file)) : Buffer.from(files.get(String(file)));
    return fs.readFileSync(file, options);
  };
  safe_fs.lstatSync = function(file, options) {
    if(files.has(String(file))) return { isFile: () => true, isDirectory: () => false };
    return fs.lstatSync(file, options);
  };
  safe_fs.readdir = function(_dir, _options, callback) { callback(null, []); };
  safe_fs.createWriteStream = function() { throw new Error('Unexpected stream write in GUI fixture'); };
  var mocks = {
    electron: { ipcRenderer: ipc,
      clipboard: { readText: () => clipboard_text, writeText: value => { clipboard_text = value; } },
      shell: { openExternal: value => { calls.push(['external', value]); } },
      webUtils: { getPathForFile: file => file.path } },
    'electron-store': MemoryStore,
    eslint: { ESLint: class { async lintText() { return [{ messages: [] }]; } } },
    fs: safe_fs,
    child_process: { execSync: () => Buffer.from('GUI test host') }
  };
  Object.assign(win, {
    ipcRenderer: ipc, app_path: root, config: new PRDC_APP_CONFIG(),
    process: { platform: process.platform, env: {}, argv: [] }, Buffer: Buffer,
    preventRedirect: function() {},
    language: { lang: 'en', set(value) { this.lang = value; },
      string: id => String(id), currentString: id => String(id),
      formatLang: id => String(id), update: function() {} }
  });
  win.global = win;
  win.setImmediate = function(callback) { return win.setTimeout(callback, 0); };
  var cache = new Map();
  function load(filename, expose = [], transform = source => source) {
    filename = path.resolve(filename);
    if(cache.has(filename)) return cache.get(filename).exports;
    var module = { exports: {} };
    cache.set(filename, module);
    var native_require = createRequire(filename);
    function localRequire(name) {
      if(Object.hasOwn(mocks, name)) return mocks[name];
      if(name === '../js/shared/init-config.js') return {};
      if(name.startsWith('../js/') || name.startsWith('../lib/')) return load(path.resolve(root, name.slice(3)) + (path.extname(name) ? '' : '.js'));
      var resolved = native_require.resolve(name);
      if(resolved.startsWith(root + path.sep) && !resolved.includes(path.sep + 'node_modules' + path.sep) && resolved.endsWith('.js')) return load(resolved);
      return native_require(name);
    }
    new win.Function('require', 'module', 'exports', '__filename', '__dirname',
      handler_coverage.instrument(transform(fs.readFileSync(filename, 'utf8')), filename) + '\n' + expose.map(name => 'exports.' + name + ' = ' + name + ';').join('\n') + '\n//# sourceURL=' + pathToFileURL(filename).href)(
        localRequire, module, module.exports, filename, path.dirname(filename));
    return module.exports;
  }
  for(const script of scripts) {
    // Presentation templates reference generated res/ assets; its controller is loaded explicitly.
    if(type === 'presentation') continue;
    if(/init-main|init-editor|MathJax|mathjax-config|js\/windows\/|plotly-/.test(script)) continue;
    var filename = path.resolve(root, 'html', script);
    var script_source = fs.readFileSync(filename, 'utf8');
    if(filename.includes(path.sep + 'js' + path.sep) || filename.includes(path.sep + 'PRDC_TABS' + path.sep)) script_source = handler_coverage.instrument(script_source, filename);
    win.eval(script_source + '\n//# sourceURL=' + pathToFileURL(filename).href);
  }
  if(!win.$) win.eval(fs.readFileSync(path.join(root, 'lib/jquery-3.7.0/jquery-3.7.0.min.js'), 'utf8'));
  win.$.fx.off = true;
  load(path.join(root, 'js/shared/helper.js'));
  await new Promise(resolve => setTimeout(resolve, 30));
  var fixture = {
    window: win, document: win.document, frame, calls, data, files, errors, load, type, fs: safe_fs,
    setSyncResult(action, value) { sync_results.set(action, value); },
    setDialogResult(value) { dialog_result = value; },
    setClipboard(value) { clipboard_text = value; },
    getClipboard() { return clipboard_text; },
    query(selector) {
      var element = win.document.querySelector(selector);
      if(!element) throw new Error('Missing GUI element: ' + selector);
      return element;
    },
    click(selector) { this.query(selector).click(); },
    input(selector, value, event_type = 'input') {
      var element = this.query(selector);
      element.value = value;
      element.dispatchEvent(new win.Event(event_type, { bubbles: true }));
    },
    visible(selector) { return win.$(this.query(selector)).is(':visible'); },
    key(selector, key, options = {}) {
      var target = selector ? this.query(selector) : win.document;
      var event = new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
      target.dispatchEvent(event); return event;
    },
    mouse(target, type, x, y, options = {}) {
      target.dispatchEvent(new win.MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, ...options }));
    },
    pointer(target, type, x, y) {
      target.dispatchEvent(new win.PointerEvent(type, { clientX: x, clientY: y,
        pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
        buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true }));
    },
    async frames(count = 3) {
      for(var i = 0; i < count; i++) await new Promise(resolve => win.requestAnimationFrame(resolve));
    },
    async waitFor(predicate, description) {
      var deadline = Date.now() + 1500;
      while(!predicate()) {
        if(Date.now() > deadline) throw new Error('Timed out waiting for ' + description);
        await this.tick();
      }
    },
    emit(channel, action, value) { listeners.get(channel)({}, action, value); },
    async tick() { await new Promise(resolve => setTimeout(resolve, 30)); },
    dispose() { frame.remove(); }
  };
  try {
    if(type === 'editor') {
      var { PRDC_JSLAB_WIN_EDITOR } = load(path.join(root, 'js/editor/win-editor.js'));
      fixture.controller = new PRDC_JSLAB_WIN_EDITOR();
    } else if(type === 'main') {
      var { PRDC_JSLAB_WIN_MAIN } = load(path.join(root, 'js/main/win-main.js'));
      fixture.controller = new PRDC_JSLAB_WIN_MAIN();
    }
    if(fixture.controller) fixture.controller.onReady();
    return fixture;
  } catch(err) { frame.remove(); throw err; }
}

exports.createFixture = createFixture;
exports.root = root;
