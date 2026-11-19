/**
 * @file JSLAB backend main-process tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for main test fixtures.
 */
class PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER {

  /**
   * Loads main class.
   * @param {*} screen_area Screen area.
   * @param {*} out Out.
   */
  static loadMainClass(screen_area, out, module_name = 'main-process', shared_electron) {
    var source = fs.readFileSync(path.join(__dirname, '..', module_name + '.js'), 'utf8');
    var electron_stub = shared_electron || {
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
      module: { exports: {}, parent: {} },
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
        if(out) {
          (out.requires || (out.requires = [])).push(module_path);
        }
        if(module_path === '../other-shared/init-config') {
          context.config = { TEST: !!out.test_mode };
          return {};
        }
        if(module_path === './latex-assets') {
          return { PRDC_JSLAB_ELECTRON_LATEX_ASSETS: { register() {} } };
        }
        if(module_path === '../dev/run-app-tests') {
          return { PRDC_JSLAB_DEV_APP_TEST_RUNNER: class {
            /**
             * Records test coordination started through the application entry.
             */
            start() {
              out.test_runner_starts = (out.test_runner_starts || 0) + 1;
            }
          } };
        }
        if(module_path === '../simulate/compiler') {
          return { PRDC_JSLAB_SIMULATE_COMPILER: {
            configure(adapter) {
              out.simulate_adapter = adapter;
            }
          } };
        }
        if(['./files', './window-manager', './sandbox-host'].includes(module_path)) {
          const name = module_path.slice(2);
          return { ['PRDC_JSLAB_ELECTRON_' + name.toUpperCase().replaceAll('-', '_')]:
            PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass(screen_area, out, name, electron_stub) };
        }
        if(module_path === './isolated-tasks') {
          return { PRDC_JSLAB_ISOLATED_TASKS: class {} };
        }
        if(module_path === './debugger') {
          return require('../chromium-debugger');
        }
        if(module_path === 'electron') {
          return electron_stub;
        }
        if(module_path === 'electron-context-menu') {
          return function() {};
        }
        if(module_path === 'fs') {
          return require('fs');
        }
        if(module_path === 'os') {
          return require('os');
        }
        if(module_path === 'path') {
          return require('path');
        }
        if(module_path === './storage') {
          return { PRDC_JSLAB_ELECTRON_STORAGE: class {
            /**
             * Returns the current value.
             */
            get() {
              return undefined;
            }
            /**
             * Updates the current value.
             */
            set() {}
          } };
        }
        if(module_path === '../../lib/PRDC_APP_LOGGER/PRDC_APP_LOGGER') {
          return { PRDC_APP_LOGGER: class {} };
        }
        if(module_path === './pty.js') {
          return { PRDC_JSLAB_PTY: class {} };
        }
        if(module_path === './instance-router') {
          return { PRDC_JSLAB_INSTANCE_ROUTER: class {} };
        }
        if(module_path === './automation') {
          return { PRDC_JSLAB_AUTOMATION: class {} };
        }
        if(module_path === '../simulate/project') {
          return { PRDC_JSLAB_SIMULATE_PROJECT: class {
            /**
             * Records the adapters passed to the deferred project workflow.
             * @param {Object} options Project services.
             */
            constructor(options) {
              this.options = options;
            }
          } };
        }
        if(module_path === '@bugsnag/electron') {
          return { start: function() {} };
        }
        if(module_path.startsWith('.')) {
          return require(path.resolve(__dirname, '..', module_path));
        }
        return require(module_path);
      }
    };
    context.exports = context.module.exports;
    context.global = context;
    vm.runInNewContext(source, context, { filename: 'main.js' });
    return Object.values(context.module.exports).find(value => typeof value === 'function');
  }

  /**
 * Creates application services against the same mocked Electron transport.
 */
  static createMain(screen_area, out = {}) {
    const Main = this.loadMainClass(screen_area, out, 'main-process', out.electron);
    const main = Object.create(Main.prototype);
    main.language = new (require('../../other-shared/language').PRDC_JSLAB_LANGUAGE)({ get: () => 0 });
    for(const [name, module_name] of [['files', 'files'], ['windows', 'window-manager'], ['runtime', 'sandbox-host']]) {
      const Service = this.loadMainClass(screen_area, out, module_name, out.electron);
      main[name] = new Service(main);
    }
    return main;
  }
}


/**
 * @file JSLAB backend script opener tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for script opener test fixtures.
 */
class PRDC_JSLAB_BACKEND_TESTS_SCRIPT_OPENER_TEST_HELPER {

  /**
   * Creates temp scripts.
   */
  static createTempScripts() {
    var base = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-script-opener-'));
    var valid = path.join(base, 'a.jsl');
    var invalid = path.join(base, 'a.txt');
    fs.writeFileSync(valid, '// ok');
    fs.writeFileSync(invalid, 'no');
    return { base, valid, invalid };
  }

  /**
   * Creates main harness.
   * @param {*} loading Loading.
   */
  static createMainHarness(loading) {
    var records = {
      editor_messages: [],
      main_messages: [],
      show_editor_calls: 0,
      mark_calls: 0
    };
    var main = {
      showEditor: function() {
        records.show_editor_calls += 1;
      },
      win_editor: {
        isDestroyed: function() {
          return false;
        },
        webContents: {
          isLoading: function() {
            return !!loading;
          }
        },
        send: function(channel, action, data) {
          records.editor_messages.push({ channel, action, data });
        }
      },
      win_main: {
        isDestroyed: function() {
          return false;
        },
        send: function(channel, action, data) {
          records.main_messages.push({ channel, action, data });
        }
      },
      instance_router: {
        markAsLastActive: function() {
          records.mark_calls += 1;
        }
      }
    };
    return { main, records };
  }
}

const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('application startup initializes process configuration without renderer or test dependencies', function(assert) {
  const records = {};
  const Main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass(undefined, records);
  records.electron.app.getAppPath = () => path.join(process.cwd(), 'js');
  let constructions = 0;
  const StartupMain = class {
    /**
     * Counts construction after the static entry point initializes configuration.
     */
    constructor() {
      constructions++;
    }
  };
  const instance = Main.start.call(StartupMain);
  assert.ok(instance instanceof StartupMain);
  assert.equal(constructions, 1);
  assert.ok(records.requires.includes('../other-shared/init-config'));
  assert.equal(records.requires.includes('../dev/run-app-tests'), false);
  assert.equal(records.requires.some(name => /renderer-startup|simulate\/(compiler|project)/.test(name)), false);
}, { tags: ['unit', 'backend', 'startup'] });

tests.add('application test startup invokes its development coordinator only in test mode', function(assert) {
  const records = { test_mode: true };
  const Main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass(undefined, records);
  records.electron.app.getAppPath = () => process.cwd();
  Main.start.call(class {});
  assert.equal(records.test_runner_starts, 1);
}, { tags: ['unit', 'backend', 'startup'] });

tests.add('native Simulate project services load on first use and keep the same instance', function(assert) {
  const records = {};
  const main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain(undefined, records);
  assert.equal(records.requires.includes('../simulate/project'), false);
  assert.equal(records.requires.includes('../simulate/compiler'), false);
  const project = main._getSimulateProject();
  assert.ok(records.simulate_adapter);
  assert.equal(project.options.language, main.language);
  assert.equal(typeof project.options.files.read, 'function');
  assert.equal(main._getSimulateProject(), project);
  assert.equal(records.requires.filter(name => name === '../simulate/project').length, 1);
  assert.ok(records.requires.indexOf('../simulate/compiler') < records.requires.indexOf('../simulate/project'));
}, { tags: ['unit', 'backend', 'simulate'] });


tests.add('getWindowBounds applies stored bounds only when visible in work area', function(assert) {
  var PRDC_JSLAB_ELECTRON_MAIN_PROCESS = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass({ x: 0, y: 0, width: 1000, height: 800 });
  var main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();
  main.store = {
    get: function() {
      return {
        maximize: true,
        bounds: { x: 100, y: 120, width: 600, height: 500 }
      };
    }
  };

  var out = main.windows.getWindowBounds('window-main', { width: 300, height: 200 });
  assert.equal(out.maximize, true);
  assert.equal(out.x, 100);
  assert.equal(out.y, 120);
  assert.equal(out.width, 600);
  assert.equal(out.height, 500);
}, { tags: ['unit', 'backend', 'main'] });

tests.add('saveWindowBounds debounces and writes bounds/maximize values to store', function(assert) {
  var PRDC_JSLAB_ELECTRON_MAIN_PROCESS = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass();
  var main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();
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

  main.windows.saveWindowBounds(win, 'window-editor');
  assert.equal(stored.key, 'window-editor');
  assert.deepEqual(stored.value.bounds, { x: 5, y: 6, width: 700, height: 500 });
  assert.equal(stored.value.maximize, false);
}, { tags: ['unit', 'backend', 'main'] });

tests.add('setHandlers configures permissive session callbacks', function(assert) {
  var PRDC_JSLAB_ELECTRON_MAIN_PROCESS = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass();
  var main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();
  var hooks = {};
  main.win_main = {
    webContents: {
      session: {
        setCertificateVerifyProc: function(fn) {
          hooks.cert = fn;
        },
        setPermissionCheckHandler: function(fn) {
          hooks.perm = fn;
        },
        setDevicePermissionHandler: function(fn) {
          hooks.dev = fn;
        },
        setUSBProtectedClassesHandler: function(fn) {
          hooks.usb = fn;
        }
      }
    }
  };

  main.windows.setHandlers();
  assert.equal(typeof hooks.cert, 'function');
  assert.equal(typeof hooks.perm, 'function');
  assert.equal(typeof hooks.dev, 'function');
  assert.equal(typeof hooks.usb, 'function');
}, { tags: ['unit', 'backend', 'main'] });

tests.add('handleMessages binds dialog handlers to sender BrowserWindow', function(assert) {
  var state = {};
  var PRDC_JSLAB_ELECTRON_MAIN_PROCESS = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass(undefined, state);
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

  var main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain(undefined, state);
  main.app_icon = 'app-icon.ico';
  main.win_sandbox = { send: function() {} };
  main.sandbox_sub_wins = {};
  main.debugger = { state: 'idle', reserve: function() {}, finish: function() {} };
  main.pty = {};
  main.win_main = {
    isDestroyed: function() {
      return false;
    },
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

tests.add('handleMessages requests taskbar attention after top-level script completion', function(assert) {
  var state = {};
  var PRDC_JSLAB_ELECTRON_MAIN_PROCESS = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass(undefined, state);
  var ipc_handlers = { handle: {}, on: {} };
  var attention_requests = 0;

  state.electron.ipcMain.handle = function(channel, fn) {
    ipc_handlers.handle[channel] = fn;
  };
  state.electron.ipcMain.on = function(channel, fn) {
    ipc_handlers.on[channel] = fn;
  };

  var main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain(undefined, state);
  main.app_icon = 'app-icon.ico';
  main.win_sandbox = { send: function() {} };
  main.sandbox_sub_wins = {};
  main.debugger = { state: 'idle', reserve: function() {}, finish: function() {} };
  main.pty = {};
  main.win_main = {
    isDestroyed: function() {
      return false;
    },
    send: function() {},
    webContents: {}
  };
  main.win_editor = { send: function() {} };
  main.windows.requestScriptFinishedAttention = function() {
    attention_requests += 1;
    return true;
  };

  main.handleMessages();

  ipc_handlers.on.MainProcess(
    { sender: {}, returnValue: undefined },
    'code-evaluated',
    { top_level_script_finished: true }
  );

  assert.equal(attention_requests, 1);
}, { tags: ['unit', 'backend', 'main'] });

tests.add('presentation editor thumbnail context menu includes go-to-code action', function(assert) {
  var source = ['main-process', 'window-manager', 'sandbox-host'].map(name => fs.readFileSync(path.join(__dirname, '..', name + '.js'), 'utf8')).join('\n');

  assert.ok(source.includes("case 'show-presentation-editor-slide-context-menu':"));
  assert.ok(source.includes("'go-to-code', { source: 'thumbnail', index: data.index }"));
  assert.ok(source.includes("'delete-slide', { source: 'thumbnail', index: data.index }"));
  assert.ok(source.includes("'delete-slide', { source: 'preview' }"));
  assert.ok(source.includes("'delete-slide',"));
}, { tags: ['unit', 'backend', 'main'] });

tests.add('requestScriptFinishedAttention flashes main window only when app is unfocused on Windows', function(assert) {
  var PRDC_JSLAB_ELECTRON_MAIN_PROCESS = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass();
  var main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();
  var flash_calls = [];

  main.sandbox_sub_wins = {};
  main.win_main = {
    isDestroyed: function() {
      return false;
    },
    isFocused: function() {
      return false;
    },
    flashFrame: function(flag) {
      flash_calls.push(flag);
    }
  };
  main.win_editor = {
    isDestroyed: function() {
      return false;
    },
    isFocused: function() {
      return false;
    }
  };
  main.win_sandbox = {
    isDestroyed: function() {
      return false;
    },
    isFocused: function() {
      return false;
    }
  };

  var out = main.windows.requestScriptFinishedAttention();

  if(process.platform === 'win32') {
    assert.equal(out, true);
    assert.deepEqual(flash_calls, [true]);
    assert.equal(main.attention_flash_active, true);
  } else {
    assert.equal(out, false);
    assert.deepEqual(flash_calls, []);
  }
}, { tags: ['unit', 'backend', 'main'] });

tests.add('automation blocks overlapping GUI commands and accepts replies only from the sandbox', function(assert) {
  var state = {};
  var MainClass = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass(undefined, state);
  var handlers = {};
  state.electron.ipcMain.handle = function() {};
  state.electron.ipcMain.on = function(channel, callback) {
    handlers[channel] = callback;
  };
  var forwarded = [];
  var main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain(undefined, state);
  main.win_sandbox = { webContents: {}, send: function(...args) {
    forwarded.push(args);
  } };
  main.win_main = { isDestroyed: function() {
    return false;
  }, send: function() {} };
  main.win_editor = { send: function() {} };
  main.debugger = { state: 'idle', reserve: function() {}, finish: function() {} };
  main.pty = {};
  main.sandbox_sub_wins = {};
  var replies = [];
  main.automation = { busy: true, active_id: 'agent', complete: function(data) {
    replies.push(data);
  } };
  main.automation_external = true;
  main.handleMessages();
  handlers.SandboxWindow({}, 'eval-code', ['1']);
  assert.equal(forwarded.length, 0);
  handlers.MainWindow({ sender: main.win_sandbox.webContents }, 'code-evaluated', {});
  assert.equal(main.automation.busy, true);
  handlers.JSLAB_AUTOMATION_RESULT({ sender: {} }, { id: 'agent' });
  assert.equal(replies.length, 0);
  handlers.JSLAB_AUTOMATION_RESULT({ sender: main.win_sandbox.webContents }, { id: 'agent' });
  assert.equal(replies.length, 1);
  main.automation.active_id = null;
  main.automation.busy = false;
  handlers.SandboxWindow({}, 'eval-code', ['2']);
  assert.equal(forwarded.length, 1);
  assert.equal(main.automation.busy, true);
}, { tags: ['unit', 'backend', 'automation'] });

tests.add('closed sandbox windows are released once without deleting replacements', function(assert) {
  const MainClass = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass();
  const main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();
  let destroyed = false;
  let calls = 0;
  const old_window = { forClose: true, isDestroyed: () => destroyed,
    destroy: () => {
      destroyed = true;
      calls++;
    } };
  const replacement = {};
  main.sandbox_sub_wins = { 1: replacement };
  main.runtime._destroyClosedSandboxWindow(1, old_window);
  main.runtime._destroyClosedSandboxWindow(1, old_window);
  assert.equal(calls, 1);
  assert.equal(main.sandbox_sub_wins[1], replacement);
  main.sandbox_sub_wins[2] = old_window;
  main.runtime._destroyClosedSandboxWindow(2, old_window);
  assert.equal(main.sandbox_sub_wins[2], undefined);
}, { tags: ['unit', 'backend', 'windows'] });

tests.add('Terminal windows are independently named, controlled and closed', function(assert) {
  var MainClass = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass();
  var main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();
  var sent = [];
  var destroyed = false;
  var win = {
    isDestroyed: function() {
      return destroyed;
    },
    send: function() {
      sent.push(Array.from(arguments));
    },
    setTitle: function(name) {
      this.title = name;
    },
    show: function() {},
    focus: function() {},
    destroy: function() {
      destroyed = true;
    }
  };
  main.terminal_windows = new Map([[4, {
    id: 4, name: 'First', win: win, ready: true, pending: []
  }]]);
  assert.equal(main.windows.controlTerminalWindow('write', { id: 4, value: 'echo ok\r' }), true);
  assert.equal(main.windows.controlTerminalWindow('set-name', { id: 4, name: 'Build' }), true);
  assert.deepEqual(main.windows.controlTerminalWindow('list'), [{ id: 4, name: 'Build' }]);
  assert.deepEqual(sent, [
    ['TerminalWindow', 'write', 'echo ok\r'],
    ['TerminalWindow', 'set-name', 'Build']
  ]);
  assert.equal(win.title, 'Build');
  assert.equal(main.windows.controlTerminalWindow('is-open', { id: 4 }), true);
  assert.equal(main.windows.controlTerminalWindow('close', { id: 4 }), true);
  assert.equal(destroyed, true);
}, { tags: ['unit', 'backend', 'terminal'] });

tests.add('Editor call-stack selection validates pause revisions and updates the existing console frame', async function(assert) {
  const MainClass = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass();
  const main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();
  const calls = [];
  let state = { state: 'paused', revision: 9, frames: [{ name: 'callee' }, { name: 'caller' }] };
  main.debugger = { status: () => state };
  main.win_main = { send: (...args) => calls.push(args) };
  main.win_editor = { isDestroyed: () => false, send: (...args) => calls.push(args) };
  const selected = await main.runtime.debugCommand('select_debug_frame', { frame_index: 1, revision: 9 });
  assert.equal(selected.frame_index, 1);
  assert.equal(calls[0][1], 'debugger-select-frame');
  assert.equal(calls[1][2].frame_index, 1);
  await assert.rejects(() => main.runtime.debugCommand('select_debug_frame', { frame_index: 0, revision: 8 }), /Expired/);
  await assert.rejects(() => main.runtime.debugCommand('select_debug_frame', { frame_index: 99 }), /Expired/);
  await assert.rejects(() => main.runtime.debugCommand('select_debug_frame', { frame_index: '1' }), /Expired/);
  state = { state: 'running', revision: 10, frames: [] };
  await assert.rejects(() => main.runtime.debugCommand('select_debug_frame', { frame_index: 1 }), /Expired/);
  assert.equal(calls.length, 2);
}, { tags: ['unit', 'backend', 'debugger'] });

tests.add('main currentString returns values from the configured catalog', function(assert) {
  var lang = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();

  var out = lang.currentString(87);
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 0);
}, { tags: ['unit', 'backend', 'language'] });

tests.add('formatLang substitutes placeholders and falls back to currentString', function(assert) {
  var lang = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();

  lang.language.s = {
    1: { en: 'Hello {name} from {place}' }
  };

  assert.equal(lang.formatLang(1), 'Hello {name} from {place}');
  assert.equal(lang.formatLang(1, { name: 'A', place: 'B' }), 'Hello A from B');
  assert.equal(lang.currentString(99999), '');
}, { tags: ['unit', 'backend', 'language'] });


tests.add('isJslScriptPath accepts existing .jsl files only', function(assert) {
  var temp = PRDC_JSLAB_BACKEND_TESTS_SCRIPT_OPENER_TEST_HELPER.createTempScripts();
  try {
    var opener = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain();
    assert.equal(opener.files.isJslScriptPath(temp.valid), true);
    assert.equal(opener.files.isJslScriptPath(temp.invalid), false);
    assert.equal(opener.files.isJslScriptPath(path.join(temp.base, 'missing.jsl')), false);
    assert.equal(opener.files.isJslScriptPath(''), false);
  } finally {
    fs.rmSync(temp.base, { recursive: true, force: true });
  }
}, { tags: ['unit', 'backend', 'script-opener'] });

tests.add('openScriptsInEditor queues files when editor is unavailable and flush opens later', function(assert) {
  var temp = PRDC_JSLAB_BACKEND_TESTS_SCRIPT_OPENER_TEST_HELPER.createTempScripts();
  try {
    var queued = PRDC_JSLAB_BACKEND_TESTS_SCRIPT_OPENER_TEST_HELPER.createMainHarness(true);
    var opener = Object.assign(PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.createMain(), queued.main, { pending_open_scripts: [] });
    opener.windows.showEditor = queued.main.showEditor;

    assert.equal(opener.files.openScriptsInEditor([temp.valid, temp.invalid]), false);
    assert.deepEqual(opener.pending_open_scripts, [temp.valid]);
    assert.equal(opener.files.openScriptsInEditor([temp.valid]), false);
    assert.deepEqual(opener.pending_open_scripts, [temp.valid]);

    queued.main.win_editor.webContents.isLoading = function() {
      return false;
    };
    opener.files.flushPendingOpenScripts();

    assert.equal(opener.pending_open_scripts.length, 0);
    assert.equal(queued.records.show_editor_calls, 1);
    assert.equal(queued.records.editor_messages.length, 1);
    assert.equal(queued.records.editor_messages[0].action, 'open-script');
    assert.equal(queued.records.main_messages[0].action, 'set-current-path');
    assert.equal(queued.records.mark_calls, 1);
  } finally {
    fs.rmSync(temp.base, { recursive: true, force: true });
  }
}, { tags: ['unit', 'backend', 'script-opener'] });


tests.add('Electron restart waits for document approvals and honors cancellation', async function(assert) {
  const fixture = {};
  const Main = PRDC_JSLAB_ELECTRON_TESTS_MAIN_PROCESS_HELPER.loadMainClass(undefined, fixture);
  const instance = Object.create(Main.prototype);
  const actions = [];
  let approve_editor = false;
  instance.win_editor = { isDestroyed: () => false, webContents: { executeJavaScript: async source => {
    assert.ok(source.includes('confirmReload'));
    actions.push('editor');
    return approve_editor;
  } } };
  instance.windows = { confirmSimulateClose: async () => { actions.push('simulate'); return true; },
    latex_window: { confirmReload: async () => { actions.push('latex'); return true; } } };
  instance.runtime = { confirmPresentationReload: async () => { actions.push('presentation'); return true; } };
  fixture.electron.app.relaunch = () => actions.push('relaunch');
  fixture.electron.app.exit = () => actions.push('exit');
  await instance._restartApplication();
  assert.deepEqual(actions, ['editor']);
  approve_editor = true;
  await instance._restartApplication();
  assert.deepEqual(actions, ['editor', 'editor', 'simulate', 'latex', 'presentation', 'relaunch', 'exit']);
});

exports.MODULE_TESTS = tests;
