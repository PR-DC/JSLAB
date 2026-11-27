/**
 * @file Isolated Electron browser driver for application GUI integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for dev gui test browser operations.
 */
class PRDC_JSLAB_DEV_GUI_TEST_BROWSER_HELPER {

  /**
   * Waits for an isolated process's DevTools port file.
   * @param {string} profile Profile folder.
   * @param {ChildProcess} child Browser process.
   * @returns {Promise<number>} Local CDP port.
   */
  static async waitForPort(profile, child) {
    var deadline = Date.now() + 25000;
    while(Date.now() < deadline) {
      if(child.exitCode !== null) {
        throw new Error('Browser exited with ' + child.exitCode);
      }
      var filename = path.join(profile, 'DevToolsActivePort');
      if(fs.existsSync(filename)) {
        try {
          var port = Number(fs.readFileSync(filename, 'utf8').split(/\r?\n/)[0]);
          if(port > 0) {
            return port;
          }
        } catch(error) {
          // Chrome can still hold this file while publishing its port on Windows.
          if(!['EBUSY', 'EACCES', 'ENOENT'].includes(error.code)) {
            throw error;
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Browser did not publish a DevTools port.');
  }

  /**
   * Starts the bundled Electron browser with its own profile and a local build.
   * @param {string} folder Static build folder.
   * @returns {Promise<Object>} Browser and cleanup function.
   */
  static async startBrowser(folder) {
    var profile_root = path.resolve(__dirname, '../../temp');
    fs.mkdirSync(profile_root, { recursive: true });
    var profile = fs.mkdtempSync(path.join(profile_root, 'jslab-browser-tests-'));
    var requests = [];
    var { server, base } = await PRDC_JSLAB_DEV_WEB_SERVER.listen(folder, {
      onRequest: url => requests.push(url)
    });
    var env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    var child = cp.spawn(require('electron'), [path.join(__dirname, 'start-web.js'), '--gui-test-url=' + base,
      '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
      '--disable-background-networking', '--disable-component-update', '--remote-debugging-port=0',
      '--use-angle=swiftshader', '--no-sandbox', '--user-data-dir=' + profile],
    { env, stdio: ['ignore', 'ignore', 'pipe'] });
    var stderr = '';
    child.stderr.on('data', data => {
      stderr = (stderr + data).slice(-5000);
    });
    var browser = new PRDC_JSLAB_GUI_TEST_BROWSER();
    async function cleanup() {
      try {
        await browser.send('Browser.close');
      } catch(error) {}
      await browser.close();
      if(child.exitCode === null) {
        child.kill();
        await new Promise(resolve => {
          child.once('exit', resolve);
          setTimeout(resolve, 3000);
        });
      }
      await new Promise(resolve => server.close(resolve));
      var target = path.resolve(profile);
      if(path.dirname(target) !== profile_root || !path.basename(target).startsWith('jslab-browser-tests-')) {
        throw new Error('Unexpected browser profile path');
      }
      await fs.promises.rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
    }
    try {
      var port = await PRDC_JSLAB_DEV_GUI_TEST_BROWSER_HELPER.waitForPort(profile, child);
      var page = await PRDC_JSLAB_DEV_GUI_TEST_BROWSER_HELPER.waitForPage(port, child);
      await browser.connect(page.webSocketDebuggerUrl);
      await browser.installCoverage();
      return { browser, base, requests, cleanup };
    } catch(err) {
      await cleanup();
      throw new Error(err.message + '\nBrowser: ' + stderr);
    }
  }

  /**
   * Waits for Electron to create the browser window after opening its CDP port.
   * @param {number} port CDP port.
   * @param {ChildProcess} child Electron process.
   * @returns {Promise<Object>} Initial page target.
   */
  static async waitForPage(port, child) {
    const deadline = Date.now() + 15000;
    while(Date.now() < deadline && child.exitCode === null) {
      const response = await fetch('http://127.0.0.1:' + port + '/json/list');
      const targets = await response.json();
      const page = targets.find(target => target.type === 'page');
      if(page) return page;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Electron did not open the GUI test window.');
  }
}

const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { PRDC_JSLAB_DEV_WEB_SERVER } = require('./web-server');

/**
 * Minimal CDP client using Node's standard WebSocket implementation.
 */
class PRDC_JSLAB_GUI_TEST_BROWSER {
  /**
   * Initializes the gui browser instance.
   */
  constructor() {
    this.sequence = 0;
    this.pending = new Map();
    this.events = [];
    this.errors = [];
    this.command_window_errors = [];
  }

  /**
   * Connects.
   * @param {string} url Url.
   */
  async connect(url) {
    this.socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      this.socket.onopen = resolve;
      this.socket.onerror = reject;
    });
    this.socket.onmessage = event => {
      var packet = JSON.parse(event.data);
      if(packet.id && this.pending.has(packet.id)) {
        var request = this.pending.get(packet.id);
        this.pending.delete(packet.id);
        clearTimeout(request.timer);
        if(packet.error) {
          request.reject(new Error(JSON.stringify(packet.error)));
        } else {
          request.resolve(packet.result);
        }
      } else {
        this.events.push(packet);
        if(packet.method === 'Runtime.exceptionThrown') {
          this.errors.push(packet.params.exceptionDetails);
        } else if(packet.method === 'Runtime.bindingCalled' && packet.params.name === '__JSLAB_GUI_COMMAND_ERROR__') {
          this.command_window_errors.push(packet.params.payload);
        }
      }
    };
    this.socket.onclose = event => {
      for(const request of this.pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error('CDP socket closed: ' + event.code));
      }
      this.pending.clear();
    };
    await this.send('Runtime.enable');
    await this.send('Page.enable');
  }

  /**
   * Sends a browser protocol command with a bounded response deadline.
   * @param {string} method Protocol method.
   * @param {Object} [params] Protocol arguments.
   * @param {number} [timeout_ms=10000] Response deadline in milliseconds.
   */
  send(method, params = {}, timeout_ms = 10000) {
    var id = ++this.sequence;
    return new Promise((resolve, reject) => {
      var timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP timeout: ' + method + ' events=' + JSON.stringify(this.events.slice(-30).map(event => event.method))));
      }, timeout_ms);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  /**
   * Evaluates.
   * @param {*} fun Fun.
   * @param {*} args Args.
   */
  async evaluate(fun, ...args) {
    var expression = fun;
    if(typeof fun === 'function') {
      let source = fun.toString();
      if(/^(async\s+)?[\w$]+\s*\(/.test(source) && !/^(async\s+)?function\b/.test(source) && !/^async\s*\(/.test(source)) {
        source = source.replace(/^(async\s+)?/, '$1function ');
      }
      expression = '(' + source + ')(...' + JSON.stringify(args) + ')';
    }
    var result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, 120000);
    if(result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception && result.exceptionDetails.exception.description || result.exceptionDetails.text);
    }
    return result.result.value;
  }

  /**
   * Waits for for.
   * @param {*} fun Fun.
   * @param {*} [description] Description.
   * @param {number} [timeout] Timeout.
   * @param {...*} args Arguments passed to the condition.
   */
  async waitFor(fun, description = 'browser condition', timeout = 20000, ...args) {
    var deadline = Date.now() + timeout;
    while(Date.now() < deadline) {
      if(await this.evaluate(fun, ...args)) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw new Error('Timed out: ' + description + '\n' + JSON.stringify(this.errors));
  }

  /**
   * Resizes the real GUI window and waits for its content viewport.
   * @param {number} width Content width.
   * @param {number} height Content height.
   */
  async resizeViewport(width, height) {
    this.viewport_resized = true;
    await this._setViewport([width, height]);
  }

  /**
   * Restores the real window geometry after a resize scenario.
   */
  async restoreViewport() {
    if(!this.viewport_resized) return;
    this.viewport_resized = false;
    if(this.socket?.readyState === WebSocket.OPEN) await this._setViewport(null);
  }

  /**
   * Waits for the renderer to report the native window's content bounds.
   */
  async _setViewport(size) {
    const viewport = await this.evaluate(size => {
      if(window.__JSLAB_GUI_TEST_VIEWPORT__) return window.__JSLAB_GUI_TEST_VIEWPORT__(size);
      return require('electron').ipcRenderer.invoke('JSLAB_GUI_TEST_VIEWPORT', size);
    }, size);
    await this.waitFor(([width, height]) => innerWidth === width && innerHeight === height,
      'native viewport resize', 10000, viewport);
  }

  /**
   * Navigates to a page.
   * @param {string} url Destination URL.
   */
  async navigate(url) {
    await this.send('Page.navigate', { url });
  }

  /**
   * Clicks a control using the browser's mouse input.
   * @param {string} selector Control selector.
   * @param {string} [frame_selector] Same-origin iframe containing the control.
   */
  async click(selector, frame_selector = null) {
    var rect = await this.evaluate((selector, frame_selector) => {
      var frame = frame_selector ? document.querySelector(frame_selector) : null;
      var scope = frame_selector ? frame?.contentDocument : document;
      var element = scope?.querySelector(selector);
      if(!element) {
        throw new Error('Missing control: ' + selector);
      }
      element.scrollIntoView({ block: 'center' });
      var rect = element.getBoundingClientRect();
      var frame_rect = frame?.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 + (frame_rect ? frame_rect.left + frame.clientLeft : 0),
        y: rect.top + rect.height / 2 + (frame_rect ? frame_rect.top + frame.clientTop : 0),
        width: rect.width, height: rect.height
      };
    }, selector, frame_selector);
    if(!rect.width || !rect.height) {
      throw new Error('Control is hidden: ' + selector);
    }
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  }

  /**
   * Handles install coverage.
   */
  async installCoverage() {
    await this.send('Page.addScriptToEvaluateOnNewDocument', { source: `
      globalThis.__JSLAB_GUI_HITS__ = [];
      globalThis.__JSLAB_GUI_HIT__ = function(id) {
        try { top.__JSLAB_GUI_HITS__.push(id); } catch { globalThis.__JSLAB_GUI_HITS__.push(id); }
      };
    ` });
  }

  /**
   * Collects Command Window errors at emission time, including across page reloads.
   */
  async watchCommandWindowErrors() {
    const install = function() {
      const installed = Symbol.for('jslab.gui.commandWindowErrorMonitor');
      if(window !== window.top || globalThis[installed]) return;
      globalThis[installed] = true;
      const monitor = () => {
        const main = globalThis.jslab_web?.main || (typeof win_main !== 'undefined' && win_main);
        const command_window = main?.command_window;
        if(!command_window) {
          setTimeout(monitor, 10);
          return;
        }
        const report = error => globalThis.__JSLAB_GUI_COMMAND_ERROR__(String(error?.stack || error));
        for(const entry of command_window.log) {
          if(typeof entry.html === 'string' && entry.html.startsWith('<span class="error">')) {
            for(let count = 0; count < (entry.repeat_count || 1); count++) report(entry.data);
          }
        }
        for(const name of ['error', 'errorInternal']) {
          const original = command_window[name];
          command_window[name] = function(error) {
            report(error);
            return original.apply(this, arguments);
          };
        }
      };
      monitor();
    };
    await this.send('Runtime.addBinding', { name: '__JSLAB_GUI_COMMAND_ERROR__' });
    await this.send('Page.addScriptToEvaluateOnNewDocument', { source: '(' + install.toString() + ')()' });
    await this.evaluate(install);
  }

  /**
   * Closes.
   */
  async close() {
    if(this.socket) {
      this.socket.close();
    }
    for(const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Browser closed'));
    }
    this.pending.clear();
  }
}


exports.PRDC_JSLAB_GUI_TEST_BROWSER = PRDC_JSLAB_GUI_TEST_BROWSER;
exports.startBrowser = PRDC_JSLAB_DEV_GUI_TEST_BROWSER_HELPER.startBrowser;
exports.waitForPort = PRDC_JSLAB_DEV_GUI_TEST_BROWSER_HELPER.waitForPort;
