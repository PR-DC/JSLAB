/**
 * @file Isolated Chromium driver for application GUI integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const http = require('http');

/**
 * Minimal CDP client using Node's standard WebSocket implementation.
 */
class PRDC_JSLAB_GUI_BROWSER {
  constructor() { this.sequence = 0; this.pending = new Map(); this.events = []; this.errors = []; }

  async connect(url) {
    this.socket = new WebSocket(url);
    await new Promise((resolve, reject) => { this.socket.onopen = resolve; this.socket.onerror = reject; });
    this.socket.onmessage = event => {
      var packet = JSON.parse(event.data);
      if(packet.id && this.pending.has(packet.id)) {
        var request = this.pending.get(packet.id); this.pending.delete(packet.id); clearTimeout(request.timer);
        if(packet.error) request.reject(new Error(JSON.stringify(packet.error))); else request.resolve(packet.result);
      } else {
        this.events.push(packet);
        if(packet.method === 'Runtime.exceptionThrown') this.errors.push(packet.params.exceptionDetails);
      }
    };
    this.socket.onclose = event => {
      for(const request of this.pending.values()) { clearTimeout(request.timer); request.reject(new Error('CDP socket closed: ' + event.code)); }
      this.pending.clear();
    };
    await this.send('Runtime.enable'); await this.send('Page.enable');
  }

  send(method, params = {}) {
    var id = ++this.sequence;
    return new Promise((resolve, reject) => {
      var timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method + ' events=' + JSON.stringify(this.events.map(event => event.method)))); }, 10000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(fun, ...args) {
    var expression = typeof fun === 'function' ? '(' + fun.toString() + ')(...' + JSON.stringify(args) + ')' : fun;
    var result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception && result.exceptionDetails.exception.description || result.exceptionDetails.text);
    return result.result.value;
  }

  async waitFor(fun, description = 'browser condition', timeout = 20000) {
    var deadline = Date.now() + timeout;
    while(Date.now() < deadline) {
      if(await this.evaluate(fun)) return;
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    throw new Error('Timed out: ' + description + '\n' + JSON.stringify(this.errors));
  }

  async navigate(url) { await this.send('Page.navigate', { url }); }

  async click(selector) {
    var rect = await this.evaluate(selector => {
      var element = document.querySelector(selector);
      if(!element) throw new Error('Missing control: ' + selector);
      element.scrollIntoView({ block: 'center' });
      var rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height };
    }, selector);
    if(!rect.width || !rect.height) throw new Error('Control is hidden: ' + selector);
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
  }

  async installCoverage() {
    await this.send('Page.addScriptToEvaluateOnNewDocument', { source: `
      globalThis.__JSLAB_GUI_HITS__ = [];
      globalThis.__JSLAB_GUI_HIT__ = function(id) {
        try { top.__JSLAB_GUI_HITS__.push(id); } catch { globalThis.__JSLAB_GUI_HITS__.push(id); }
      };
    ` });
  }

  async close() {
    if(this.socket) this.socket.close();
    for(const request of this.pending.values()) { clearTimeout(request.timer); request.reject(new Error('Browser closed')); }
    this.pending.clear();
  }
}

/**
 * Waits for an isolated process's DevTools port file.
 * @param {string} profile Profile folder.
 * @param {ChildProcess} child Browser process.
 * @returns {Promise<number>} Local CDP port.
 */
async function waitForPort(profile, child) {
  var deadline = Date.now() + 25000;
  while(Date.now() < deadline) {
    if(child.exitCode !== null) throw new Error('Browser exited with ' + child.exitCode);
    var filename = path.join(profile, 'DevToolsActivePort');
    if(fs.existsSync(filename)) {
      var port = Number(fs.readFileSync(filename, 'utf8').split(/\r?\n/)[0]);
      if(port > 0) return port;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Browser did not publish a DevTools port.');
}

/**
 * Starts a genuine browser with its own profile and serves only a local build.
 * @param {string} folder Static build folder.
 * @returns {Promise<Object>} Browser and cleanup function.
 */
async function startBrowser(folder) {
  var choices = [process.env.JSLAB_GUI_BROWSER,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  var executable = choices.find(filename => fs.existsSync(filename));
  if(!executable) throw new Error('Chrome/Chromium is required; set JSLAB_GUI_BROWSER to its executable.');
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-browser-tests-'));
  var server = http.createServer(function(request, response) {
    var url = new URL(request.url, 'http://localhost');
    var relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    var filename = path.resolve(folder, '.' + relative);
    if(!filename.startsWith(path.resolve(folder) + path.sep)) { response.writeHead(403); response.end(); return; }
    if(!fs.existsSync(filename) || !fs.statSync(filename).isFile()) { response.writeHead(404); response.end(); return; }
    var types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
    response.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream');
    fs.createReadStream(filename).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  var base = 'http://127.0.0.1:' + server.address().port;
  var child = cp.spawn(executable, ['--headless=new', '--disable-gpu', '--in-process-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'],
  { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  var stderr = '';
  child.stderr.on('data', data => { stderr = (stderr + data).slice(-5000); });
  var browser = new PRDC_JSLAB_GUI_BROWSER();
  async function cleanup() {
    await browser.close();
    if(child.exitCode === null) { child.kill(); await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 3000); }); }
    await new Promise(resolve => server.close(resolve));
    var target = path.resolve(profile);
    if(path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('jslab-browser-tests-')) throw new Error('Unexpected browser profile path');
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
  try {
    var port = await waitForPort(profile, child);
    var targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    await browser.connect(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await browser.installCoverage();
    return { browser, base, cleanup };
  } catch(err) { await cleanup(); throw new Error(err.message + '\nBrowser: ' + stderr); }
}

exports.PRDC_JSLAB_GUI_BROWSER = PRDC_JSLAB_GUI_BROWSER;
exports.startBrowser = startBrowser;
exports.waitForPort = waitForPort;
