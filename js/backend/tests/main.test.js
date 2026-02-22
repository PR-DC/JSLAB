/**
 * @file JSLAB backend main-process tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function loadMainClass(screen_area, out) {
  var source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  var electron_stub = {
    app: {},
    BrowserWindow: function() {},
    ipcMain: { on: function() {}, handle: function() {} },
    dialog: {},
    powerSaveBlocker: {},
    shell: {},
    MenuItem: function() {},
    desktopCapturer: {},
    screen: {
      getDisplayMatching: function() {
        return { workArea: screen_area || { x: 0, y: 0, width: 1920, height: 1080 } };
      }
    },
    webContents: {}
  };
  if(out) {
    out.electron = electron_stub;
  }
  var context = {
    module: { exports: {} },
    exports: null,
    process: process,
    config: {},
    app_path: process.cwd(),
    setTimeout: function(cb) {
      cb();
      return 1;
    },
    clearTimeout: function() {},
    require: function(module_path) {
      if(module_path === 'electron') {
        return electron_stub;
      }
      if(module_path === 'electron-context-menu') {
        return function() {};
      }
      if(module_path === 'fs') return require('fs');
      if(module_path === 'os') return require('os');
      if(module_path === 'electron-store') {
        return class {
          get() { return undefined; }
          set() {}
        };
      }
      if(module_path === './../../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER') {
        return { PRDC_APP_LOGGER: class {} };
      }
      if(module_path === './pty.js') {
        return { PRDC_JSLAB_PTY: class {} };
      }
      if(module_path === './backend-language') {
        return { PRDC_JSLAB_BACKEND_LANGUAGE: class {} };
      }
      if(module_path === './script-opener') {
        return { PRDC_JSLAB_SCRIPT_OPENER: class {} };
      }
      if(module_path === './instance-router') {
        return { PRDC_JSLAB_INSTANCE_ROUTER: class {} };
      }
      if(module_path === '@bugsnag/electron') {
        return { start: function() {} };
      }
      throw new Error('Unexpected require path: ' + module_path);
    }
  };
  context.exports = context.module.exports;
  vm.runInNewContext(source, context, { filename: 'main.js' });
  return context.module.exports.PRDC_JSLAB_MAIN;
}

tests.add('getWindowBounds applies stored bounds only when visible in work area', function(assert) {
  var PRDC_JSLAB_MAIN = loadMainClass({ x: 0, y: 0, width: 1000, height: 800 });
  var main = Object.create(PRDC_JSLAB_MAIN.prototype);
  main.store = {
    get: function() {
      return {
        maximize: true,
        bounds: { x: 100, y: 120, width: 600, height: 500 }
      };
    }
  };

  var out = main.getWindowBounds('window-main', { width: 300, height: 200 });
  assert.equal(out.maximize, true);
  assert.equal(out.x, 100);
  assert.equal(out.y, 120);
  assert.equal(out.width, 600);
  assert.equal(out.height, 500);
}, { tags: ['unit', 'backend', 'main'] });

tests.add('saveWindowBounds debounces and writes bounds/maximize values to store', function(assert) {
  var PRDC_JSLAB_MAIN = loadMainClass();
  var main = Object.create(PRDC_JSLAB_MAIN.prototype);
  var stored = null;
  main.debounce_save_win_time = 0;
  main.debounce_save_win_bounds = {};
  main.store = {
    set: function(key, value) {
      stored = { key: key, value: value };
    }
  };

  var win = {
    getNormalBounds: function() {
      return { x: 5, y: 6, width: 700, height: 500 };
    },
    isMaximized: function() {
      return false;
    }
  };

  main.saveWindowBounds(win, 'window-editor');
  assert.equal(stored.key, 'window-editor');
  assert.deepEqual(stored.value.bounds, { x: 5, y: 6, width: 700, height: 500 });
  assert.equal(stored.value.maximize, false);
}, { tags: ['unit', 'backend', 'main'] });

tests.add('setHandlers configures permissive session callbacks', function(assert) {
  var PRDC_JSLAB_MAIN = loadMainClass();
  var main = Object.create(PRDC_JSLAB_MAIN.prototype);
  var hooks = {};
  main.win_main = {
    webContents: {
      session: {
        setCertificateVerifyProc: function(fn) { hooks.cert = fn; },
        setPermissionCheckHandler: function(fn) { hooks.perm = fn; },
        setDevicePermissionHandler: function(fn) { hooks.dev = fn; },
        setUSBProtectedClassesHandler: function(fn) { hooks.usb = fn; }
      }
    }
  };

  main.setHandlers();
  assert.equal(typeof hooks.cert, 'function');
  assert.equal(typeof hooks.perm, 'function');
  assert.equal(typeof hooks.dev, 'function');
  assert.equal(typeof hooks.usb, 'function');
}, { tags: ['unit', 'backend', 'main'] });

tests.add('handleMessages binds dialog handlers to sender BrowserWindow', function(assert) {
  var state = {};
  var PRDC_JSLAB_MAIN = loadMainClass(undefined, state);
  var ipc_handlers = { handle: {}, on: {} };
  var sender_win = { id: 11 };
  var async_dialog_call = null;
  var sync_dialog_call = null;

  state.electron.ipcMain.handle = function(channel, fn) {
    ipc_handlers.handle[channel] = fn;
  };
  state.electron.ipcMain.on = function(channel, fn) {
    ipc_handlers.on[channel] = fn;
  };
  state.electron.BrowserWindow.fromWebContents = function(sender) {
    assert.equal(sender, 'sender-web-contents');
    return sender_win;
  };
  state.electron.dialog.showOpenDialog = function(win, params) {
    async_dialog_call = { win: win, params: params };
    return 'async-dialog-result';
  };
  state.electron.dialog.showOpenDialogSync = function(win, params) {
    sync_dialog_call = { win: win, params: params };
    return 'sync-dialog-result';
  };

  var main = Object.create(PRDC_JSLAB_MAIN.prototype);
  main.app_icon = 'app-icon.ico';
  main.win_sandbox = { send: function() {} };
  main.sandbox_sub_wins = {};
  main.pty = {};
  main.win_main = {
    isDestroyed: function() { return false; },
    send: function() {},
    webContents: {}
  };
  main.win_editor = { send: function() {} };

  main.handleMessages();

  var async_out = ipc_handlers.handle.dialog(
    { sender: 'sender-web-contents' },
    'showOpenDialog',
    { properties: ['openFile'] }
  );
  assert.equal(async_out, 'async-dialog-result');
  assert.equal(async_dialog_call.win, sender_win);
  assert.equal(async_dialog_call.params.icon, 'app-icon.ico');
  assert.equal(async_dialog_call.params.properties[0], 'openFile');

  var sync_event = { sender: 'sender-web-contents', returnValue: undefined };
  ipc_handlers.on.dialog(sync_event, 'showOpenDialogSync', { properties: ['openFile'] });
  assert.equal(sync_event.returnValue, 'sync-dialog-result');
  assert.equal(sync_dialog_call.win, sender_win);
  assert.equal(sync_dialog_call.params.icon, 'app-icon.ico');
  assert.equal(sync_dialog_call.params.properties[0], 'openFile');
}, { tags: ['unit', 'backend', 'main'] });

exports.MODULE_TESTS = tests;
