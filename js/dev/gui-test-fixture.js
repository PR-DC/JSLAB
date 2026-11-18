/**
 * @file Isolated real-DOM fixtures for desktop GUI tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.configure(
  require('../backend-electron/simulate-assets').PRDC_JSLAB_SIMULATE_ASSETS);

/**
 * Class for dev gui test fixture operations.
 */
class PRDC_JSLAB_DEV_GUI_TEST_FIXTURE_HELPER {

  /**
   * Loads actual window markup, libraries and controllers in a disposable iframe.
   * OS services are captured in memory; application bootstraps never run.
   * @param {string} type Window HTML basename.
   * @returns {Promise<Object>} Fixture with event helpers and captured host calls.
   */
  static async createFixture(type) {
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
      } finally {
        clearTimeout(load_timer);
      }
      return await PRDC_JSLAB_DEV_GUI_TEST_FIXTURE_HELPER.initializeFixture(type, frame);
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
  static async initializeFixture(type, frame) {
    var win = frame.contentWindow;
    win.__JSLAB_GUI_HIT__ = handler_coverage.hit;
    var html = fs.readFileSync(path.join(root, 'html', type + '.html'), 'utf8');
    var scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    // The disposable fixture evaluates instrumented sources instead of loading scripts.
    html = html.replace(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi, '');
    html = html.replace('<head>', '<head><base href="' + pathToFileURL(path.join(root, 'html') + path.sep).href + '">');
    // Finish the replacement document's load before exposing its DOM. Otherwise a
    // late about:blank/document navigation can replace markup during fixture setup.
    win.document.open();
    var markup_loaded = new Promise(resolve => win.addEventListener('load', resolve, { once: true }));
    win.document.write(html);
    win.document.close();
    await markup_loaded;
    var errors = [];
    win.addEventListener('error', e => {
      errors.push(String(e.error && e.error.stack || e.message));
      e.preventDefault();
    });
    win.addEventListener('unhandledrejection', e => {
      errors.push(String(e.reason && e.reason.stack || e.reason));
      e.preventDefault();
    });
    var data = new Map();
    var local_data = new Map();
    Object.defineProperty(win, 'localStorage', { value: {
      getItem(key) {
        return local_data.has(key) ? local_data.get(key) : null;
      },
      setItem(key, value) {
        local_data.set(key, String(value));
      },
      removeItem(key) {
        local_data.delete(key);
      }, clear() {
        local_data.clear();
      }
    } });
    var files = new Map();
    var calls = [];
    var listeners = new Map();
    var dialog_result = { canceled: true, filePaths: [] };
    var sync_results = new Map();
    var clipboard_text = '';
    /**
     * Class for memory store.
     */
    class MemoryStore {
      /**
       * Returns the current value.
       * @param {string} key Key.
       * @param {*} fallback Fallback.
       */
      get(key, fallback) {
        return data.has(key) ? data.get(key) : fallback;
      }
      /**
       * Updates the current value.
       * @param {string} key Key.
       * @param {*} value Value.
       */
      set(key, value) {
        data.set(key, structuredClone(value));
      }
      /**
       * Deletes.
       * @param {string} key Key.
       */
      delete(key) {
        data.delete(key);
      }
    }
    var ipc = {
      send(...args) {
        calls.push(args);
      },
      sendSync(channel, action, ...args) {
        calls.push([channel, action, ...args]);
        if(sync_results.has(action)) {
          return sync_results.get(action);
        }
        if(action === 'showSaveDialogSync') {
          return undefined;
        }
        if(action === 'get-process-arguments') {
          return [];
        }
        if(action === 'get-path' || action === 'get-app-path') {
          return root;
        }
        if(action === 'is-maximized-win') {
          return false;
        }
        return 'test';
      },
      async invoke(...args) {
        calls.push(args);
        if(args[0] === 'JSLAB_SIMULATE_SETTINGS_GET') {
          return { compiler_path: '', compiler: 'omc-test' };
        }
        if(args[0] === 'JSLAB_SIMULATE_PARSE') {
          var modelica_source = String(args[1] || '');
          if(/^model ModelName\b/.test(modelica_source)) {
            const { PRDC_JSLAB_SIMULATE_PROJECT } = require('../simulate/project');
            return new PRDC_JSLAB_SIMULATE_PROJECT().parse(modelica_source);
          }
          var parameter_match = /^\s*parameter\s+Real\s+gain\s*=\s*([^;]+);/m.exec(modelica_source);
          var declaration = parameter_match ? parameter_match[0] : '  parameter Real gain = 2;';
          var parameter_start = parameter_match ? parameter_match.index : modelica_source.indexOf('\n') + 1;
          return { success: true, model: {
            name: 'GuiModel', parameters: [{ name: 'gain', type: 'Real',
              value: parameter_match ? parameter_match[1].replace(/\s*"[\s\S]*$/, '').trim() : '2',
              description: '', line: 2, declaration: declaration,
              source_start: parameter_start, source_end: parameter_start + declaration.length }],
            components: [
              { name: 'source', type: 'Modelica.Blocks.Sources.TimeTable', line: 3, placement: { x: -30, y: 20, extent: [-10, -10, 10, 10], rotation: 0 } },
              { name: 'sink', type: 'Modelica.Mechanics.Rotational.Sources.Position', line: 5, placement: { x: 30, y: 20, extent: [-10, -10, 10, 10], rotation: 90 } },
              { name: 'source2', type: 'Modelica.Blocks.Sources.TimeTable', line: 7, placement: { x: -30, y: -20, extent: [-10, -10, 10, 10], rotation: 0 } },
              { name: 'sink2', type: 'Modelica.Mechanics.Rotational.Sources.Position', line: 9, placement: { x: 30, y: -20, extent: [-10, -10, 10, 10], rotation: 90 } }
            ],
            connections: [
              { from: 'source.y', to: 'sink.u', points: [[-20, 20], [20, 20]], color: [0, 0, 127], line: 11 },
              { from: 'source2.y', to: 'sink2.u', points: [[-20, -20], [20, -20]], color: [0, 0, 127], line: 12 }
            ]
          } };
        }
        if(args[0] === 'JSLAB_SIMULATE_RESOLVE') {
          return data.has('simulate-value:' + args[1]) ?
            { success: true, js_value: data.get('simulate-value:' + args[1]) } : { success: true,
              value: data.has('simulate-resolve:' + args[1]) ? data.get('simulate-resolve:' + args[1]) : '42' };
        }
        if(args[0] === 'JSLAB_SIMULATE_COMPILE') {
          if(args[1] && args[1].action === 'simulate') {
            return { success: true, stdout: 'Compiler test response',
              result: { columns: ['time', 'x', 'y', 'z'], rows: [['0', '1', '2', '3'], ['1', '2', '3', '4']] } };
          }
          return { success: false, error: 'Compiler test response' };
        }
        return dialog_result;
      },
      on(channel, listener) {
        listeners.set(channel, listener);
      },
      removeListener() {}
    };
    var safe_fs = Object.create(fs);
    safe_fs.writeFileSync = function(file, value) {
      files.set(String(file), String(value));
    };
    safe_fs.writeFile = function(file, value, callback) {
      files.set(String(file), String(value));
      callback(null);
    };
    for(const name of ['appendFile', 'appendFileSync', 'unlink', 'unlinkSync', 'rename', 'renameSync',
      'mkdir', 'mkdirSync', 'rmdir', 'rmdirSync', 'rm', 'rmSync', 'truncate', 'truncateSync',
      'copyFile', 'copyFileSync', 'write', 'writeSync', 'createWriteStream']) {
      safe_fs[name] = function() {
        throw new Error('Unexpected filesystem mutation in GUI fixture: ' + name);
      };
    }
    var safe_promises = {
      async writeFile(file, value) {
        files.set(String(file), String(value));
      }
    };
    for(const name of ['appendFile', 'unlink', 'rename', 'mkdir', 'rmdir', 'rm', 'truncate', 'copyFile', 'open']) {
      safe_promises[name] = async function() {
        throw new Error('Unexpected filesystem mutation in GUI fixture: ' + name);
      };
    }
    Object.defineProperty(safe_fs, 'promises', { value: {
      ...fs.promises,
      ...safe_promises
    } });
    safe_fs.readFileSync = function(file, options) {
      if(files.has(String(file))) {
        return options ? files.get(String(file)) : Buffer.from(files.get(String(file)));
      }
      return fs.readFileSync(file, options);
    };
    safe_fs.lstatSync = function(file, options) {
      if(files.has(String(file))) {
        return { isFile: () => true, isDirectory: () => false };
      }
      return fs.lstatSync(file, options);
    };
    safe_fs.readdir = function(_dir, _options, callback) {
      callback(null, []);
    };
    safe_fs.createWriteStream = function() {
      throw new Error('Unexpected stream write in GUI fixture');
    };
    var mocks = {
      electron: { ipcRenderer: ipc,
        clipboard: { readText: () => clipboard_text, writeText: value => {
          clipboard_text = value;
        } },
        shell: { openExternal: value => {
          calls.push(['external', value]);
        } },
        webUtils: { getPathForFile: file => file.path } },
      'electron-store': MemoryStore,

      fs: safe_fs,
      child_process: { execSync: () => Buffer.from('GUI test host') }
    };
    if(type === 'simulate') {
      const compiler_library = {
        ...require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary(),
        PRDC_OMJSL_CLIENT: /**
 * Class for anonymous fixture.
 */
class {
  /**
   * Handles library entries.
   * @param {*} files Files.
   */
  static libraryEntries(files) {
    return require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary()
      .PRDC_OMJSL_CLIENT.libraryEntries(files);
  }
  /**
   * Handles updated libraries.
   * @param {*} libraries Libraries.
   * @param {*} imported Imported.
   */
  static updatedLibraries(libraries, imported) {
    return require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary()
      .PRDC_OMJSL_CLIENT.updatedLibraries(libraries, imported);
  }
  /**
   * Sets libraries.
   * @param {*} libraries Libraries.
   */
  setLibraries(libraries) {
    this.libraries = libraries;
  }
  /**
   * Handles component graphics.
   * @param {*} type Type.
   */
  componentGraphics(type) {
    return Promise.resolve(require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('library-graphics.json')[type] || { icons: [], ports: [] });
  }
  /**
   * Handles library classes.
   * @param {*} parent Parent.
   */
  libraryClasses(parent) {
    return Promise.resolve(Object.values(require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('library-catalog.json').classes)
      .filter(function(item) {
        return item.type.slice(0, item.type.lastIndexOf('.')) == parent;
      }));
  }
  /**
   * Imports library.
   * @param {Object} request Request.
   */
  importLibrary(request) {
    calls.push(['JSLAB_IMPORT_LIBRARY', request]);
    return Promise.resolve(['External']);
  }
  /**
   * Handles imported classes.
   */
  importedClasses() {
    return Promise.resolve((this.libraries || []).flatMap(function(library) {
      var source = Buffer.from(library.files.find(function(file) {
        return file.path == library.entry;
      }).data, 'base64').toString();
      return (library.roots || []).map(function(root) {
        var is_package = source.includes('package ' + root);
        return { type: root, restriction: is_package ? 'package' : 'block',
          package: is_package, standard: false, partial: false, description: 'External description' };
      });
    }));
  }
  /**
   * Handles status.
   */
  status() {
    return Promise.resolve({ available: true, version: 'test' });
  }
  /**
   * Handles component schema.
   * @param {Object} request Request.
   */
  componentSchema(request) {
    if(request.type == 'External.UnitGain') {
      return Promise.resolve({ properties: [
        { name: 'distance', type: 'Real', description: 'Distance', dimensions: [], default_value: '1000',
          unit: 'mm', quantity: 'Length', preferred_unit: 'm' },
        { name: 'fixedGain', type: 'Real', description: 'Fixed gain', dimensions: [], default_value: '2', final: true }
      ] });
    }
    if(['Modelica.Mechanics.MultiBody.World', 'Modelica.Fluid.Pipes.DynamicPipe',
      'Modelica.Electrical.Machines.BasicMachines.AsynchronousInductionMachines.AIM_SquirrelCage'].includes(request.type)) {
      return Promise.resolve(require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('component-schema.json')[request.type]);
    }
    if(/\.BodyShape$/.test(request.type)) {
      return Promise.resolve({ properties: [
        { name: 'length', type: 'Modelica.SIunits.Length', description: 'Length of shape', tab: 'General', default_value: '1' }
      ] });
    }
    return Promise.resolve({ type: request.type, description: 'Test block', properties: [
      { name: 'gain', type: 'Real', description: 'Block gain', variability: 'parameter',
        input: false, dimensions: [], default_value: '1' },
      { name: 'enabled', type: 'Boolean', description: 'Enable block', variability: 'parameter',
        input: false, dimensions: [], default_value: 'true' }
    ] });
  }
  /**
   * Handles type choices.
   * @param {*} type Type.
   */
  typeChoices(type) {
    for(const schema of Object.values(require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('component-schema.json'))) {
      var property = schema.properties.find(function(item) {
        return item.type == type;
      });
      if(property) {
        return Promise.resolve(property.choices || []);
      }
    }
    return Promise.resolve([]);
  }
  /**
   * Handles record schema.
   * @param {*} type Type.
   */
  recordSchema(type) {
    return Promise.resolve(require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('record-schema.json')[String(type).replace(/^\./, '')] || null);
  }
  /**
   * Handles compile.
   * @param {Object} request Request.
   */
  compile(request) {
    calls.push(['JSLAB_OPENMODELICA_WASM_COMPILE', request]);
    if(request && request.action === 'simulate') {
      return Promise.resolve({
        success: true, stdout: 'Compiler test response',
        result: { columns: ['time', 'body.frame_a.r_0[1]', 'body.frame_a.r_0[2]', 'body.frame_a.r_0[3]'],
          rows: [['0', '1', '2', '3'], ['1', '2', '3', '4']],
          scene: { xml: '<visualization><shape></shape></visualization>' } }
      });
    }
    return Promise.resolve({ success: false, error: 'Compiler test response' });
  }
  /**
   * Closes.
   */
  close() {
    calls.push(['JSLAB_OPENMODELICA_WASM_CLOSE']);
  }
}
      };
      const { PRDC_JSLAB_SIMULATE_COMPILER } = require('../simulate/compiler');
      mocks['./compiler'] = {
        PRDC_JSLAB_SIMULATE_COMPILER: /**
 * Class for anonymous fixture.
 */
class extends PRDC_JSLAB_SIMULATE_COMPILER {
  /**
   * Returns the compiler library exports used by the isolated Simulate fixture.
   */
  static getLibrary() {
    return compiler_library;
  }
}
      };
    }
    Object.assign(win, {
      ipcRenderer: ipc, app_path: root, config: new PRDC_APP_CONFIG(),
      process: { platform: process.platform, env: {}, argv: [], cwd: function() {
        return root;
      } }, Buffer: Buffer,
      preventRedirect: function() {},
      language: { lang: 'en', set(value) {
        this.lang = value;
      },
      string: id => String(id), currentString: id => String(id),
      formatLang: id => String(id), update: function() {} }
    });
    win.global = win;
    win.setImmediate = function(callback) {
      return win.setTimeout(callback, 0);
    };
    var cache = new Map();
    function load(filename, expose = [], transform = source => source) {
      filename = path.resolve(filename);
      if(path.extname(filename) == '.json') {
        return JSON.parse(fs.readFileSync(filename, 'utf8'));
      }
      if(cache.has(filename)) {
        return cache.get(filename).exports;
      }
      var module = { exports: {} };
      cache.set(filename, module);
      var native_require = createRequire(filename);
      function localRequire(name) {
        if(Object.hasOwn(mocks, name)) {
          return mocks[name];
        }
        if(name === '../js/other-shared/init-config.js') {
          return {};
        }
        if(name.startsWith('../js/') || name.startsWith('../lib/')) {
          return load(path.resolve(root, name.slice(3)) + (path.extname(name) ? '' : '.js'));
        }
        var resolved = native_require.resolve(name);
        if(resolved.startsWith(root + path.sep) && !resolved.includes(path.sep + 'node_modules' + path.sep) && resolved.endsWith('.js')) {
          return load(resolved);
        }
        return native_require(name);
      }
      new win.Function('require', 'module', 'exports', '__filename', '__dirname',
        handler_coverage.instrument(transform(fs.readFileSync(filename, 'utf8')), filename) + '\n' + expose.map(name => 'exports.' + name + ' = ' + name + ';').join('\n') + '\n//# sourceURL=' + pathToFileURL(filename).href)(
        localRequire, module, module.exports, filename, path.dirname(filename));
      return module.exports;
    }
    for(const script of scripts) {
      // Presentation templates reference generated res/ assets; its controller is loaded explicitly.
      if(type === 'presentation') {
        continue;
      }
      if(/init-main|init-editor|init-simulate|init-assistant|init-terminal|init-presentation-editor|MathJax|mathjax-config|js\/windows\/|plotly-/.test(script)) {
        continue;
      }
      var filename = path.resolve(root, 'html', script);
      var script_source = fs.readFileSync(filename, 'utf8');
      if(filename.includes(path.sep + 'js' + path.sep) || filename.includes(path.sep + 'PRDC_TABS' + path.sep)) {
        script_source = handler_coverage.instrument(script_source, filename);
      }
      win.eval(script_source + '\n//# sourceURL=' + pathToFileURL(filename).href);
    }
    if(!win.$) {
      win.eval(fs.readFileSync(path.join(root, 'lib/jquery-3.7.0/jquery-3.7.0.min.js'), 'utf8'));
    }
    win.$.fx.off = true;
    load(path.join(root, 'js/backend-electron/renderer-startup.js'));
    var { PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER } = load(path.join(root, 'js/backend-electron/renderer.js'));
    var platform = type == 'terminal' ? new (load(path.join(root, 'js/backend-electron/terminal-shell.js')).PRDC_JSLAB_ELECTRON_TERMINAL_SHELL)() : new PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER();
    if(['simulate', 'assistant', 'terminal'].includes(type)) {
      var { PRDC_JSLAB_LANGUAGE } = load(path.join(root, 'js/other-shared/language.js'));
      var additional_strings = type === 'simulate' ?
        require('../simulate/compiler').PRDC_JSLAB_SIMULATE_COMPILER.getLanguageStrings() : {};
      win.language = new PRDC_JSLAB_LANGUAGE(platform.store, additional_strings, { html_strings: true });
    }
    if(type === 'simulate') {
      var { PRDC_JSLAB_WIN_SIMULATE } = load(path.join(root, 'js/simulate/simulate.js'));
      win.win_simulate = new PRDC_JSLAB_WIN_SIMULATE(platform);
      win.win_simulate.onReady();
      // Preserve the fixture's inspection API while state belongs to the controller.
      for(const name of ['editor', 'model', 'fitDiagram', 'setCompilerStatus', 'startCompilerActivity',
        'stopCompilerActivity', 'setBusy', 'cancelCompiler', 'busy',
        'adaptDiagramView', 'drawComponentIcon', 'componentPortLocal',
        'segmentIntersectsBox',
        'modelicaValueToJSLAB', 'replaceModelicaIdentifier', 'storeComponentBindings',
        'simulateTypeLabel', 'simulateClassDescription', 'propertyLabel', 'propertyChoiceLabel',
        'loadComponentBindings', 'component_bindings', 'parameter_bindings']) {
        Object.defineProperty(win, name, { configurable: true,
          get: function() {
            var value = win.win_simulate[name];
            return typeof value == 'function' ? value.bind(win.win_simulate) : value;
          },
          set: function(value) {
            win.win_simulate[name] = value;
          }
        });
      }
    }
    await new Promise(resolve => setTimeout(resolve, 30));
    var fixture = {
      window: win, document: win.document, frame, calls, data, files, errors, load, type, fs: safe_fs,
      setSyncResult(action, value) {
        sync_results.set(action, value);
      },
      setDialogResult(value) {
        dialog_result = value;
      },
      setClipboard(value) {
        clipboard_text = value;
      },
      getClipboard() {
        return clipboard_text;
      },
      query(selector) {
        var element = win.document.querySelector(selector);
        if(!element) {
          throw new Error('Missing GUI element: ' + selector);
        }
        return element;
      },
      click(selector) {
        this.query(selector).click();
      },
      input(selector, value, event_type = 'input') {
        var element = this.query(selector);
        element.value = value;
        element.dispatchEvent(new win.Event(event_type, { bubbles: true }));
      },
      visible(selector) {
        return win.$(this.query(selector)).is(':visible');
      },
      key(selector, key, options = {}) {
        var target = selector ? this.query(selector) : win.document;
        var event = new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
        target.dispatchEvent(event);
        return event;
      },
      mouse(target, type, x, y, options = {}) {
        target.dispatchEvent(new win.MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, ...options }));
      },
      pointer(target, type, x, y, options = {}) {
        target.dispatchEvent(new win.PointerEvent(type, { clientX: x, clientY: y,
          pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0,
          buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true, ...options }));
      },
      async frames(count = 3) {
        for(var i = 0; i < count; i++) {
          await new Promise(resolve => win.requestAnimationFrame(resolve));
        }
      },
      async waitFor(predicate, description) {
        var deadline = Date.now() + 1500;
        while(!predicate()) {
          if(Date.now() > deadline) {
            throw new Error('Timed out waiting for ' + description);
          }
          await this.tick();
        }
      },
      emit(channel, action, value) {
        listeners.get(channel)({}, action, value);
      },
      async tick() {
        await new Promise(resolve => setTimeout(resolve, 30));
      },
      dispose() {
        frame.remove();
      }
    };
    try {
      if(type === 'editor') {
        var { PRDC_JSLAB_WIN_EDITOR } = load(path.join(root, 'js/editor/win-editor.js'));
        fixture.controller = new PRDC_JSLAB_WIN_EDITOR(platform);
      } else if(type === 'main') {
        var { PRDC_JSLAB_MAIN } = load(path.join(root, 'js/main/main.js'));
        fixture.controller = new PRDC_JSLAB_MAIN(platform);
      } else if(type === 'assistant') {
        var { PRDC_JSLAB_WIN_ASSISTANT } = load(path.join(root, 'js/windows/assistant.js'));
        fixture.controller = new PRDC_JSLAB_WIN_ASSISTANT(platform);
      } else if(type === 'terminal') {
        var { PRDC_JSLAB_WIN_SYSTEM_TERMINAL } = load(path.join(root, 'js/windows/system-terminal.js'));
        fixture.controller = new PRDC_JSLAB_WIN_SYSTEM_TERMINAL(platform);
      }
      if(fixture.controller) {
        fixture.controller.onReady();
      }
      return fixture;
    } catch(err) {
      frame.remove();
      throw err;
    }
  }
}


const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { createRequire } = require('module');
const { PRDC_APP_CONFIG } = require('../../config/config');
const root = path.resolve(__dirname, '..', '..');
const handler_coverage = require('./gui-test-coverage');


exports.createFixture = PRDC_JSLAB_DEV_GUI_TEST_FIXTURE_HELPER.createFixture;
exports.root = root;
