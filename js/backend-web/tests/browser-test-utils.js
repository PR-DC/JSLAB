/**
 * @file Real web GUI scenario helpers and behavioral assertions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');

/**
 * Class for gui test utils test fixtures.
 */
class PRDC_JSLAB_WEB_TESTS_BROWSER_UTILS {

  /**
   * Handles web test.
   * @param {*} tests Tests.
   * @param {string} name Name.
   * @param {*} fun Fun.
   * @param {*} args Args.
   */
  static webTest(tests, name, fun, ...args) {
    return PRDC_JSLAB_WEB_TESTS_BROWSER_UTILS.webTestWithCommandErrors(tests, name, [], fun, ...args);
  }

  /**
   * Registers a browser test whose expected work needs a longer timeout.
   * @param {PRDC_JSLAB_TESTS} tests Test collection.
   * @param {string} name Test name.
   * @param {number} timeout_ms Timeout in milliseconds.
   * @param {Function} fun Browser scenario.
   * @param {...*} args Browser scenario arguments.
   */
  static webTestWithTimeout(tests, name, timeout_ms, fun, ...args) {
    fun._jslab_test_timeout_ms = timeout_ms;
    return PRDC_JSLAB_WEB_TESTS_BROWSER_UTILS.webTest(tests, name, fun, ...args);
  }

  /**
   * Registers a browser test with exactly the Command Window errors it intentionally produces.
   * @param {PRDC_JSLAB_TESTS} tests Test collection.
   * @param {string} name Test name.
   * @param {Array<string|RegExp>} expected_command_errors Expected error messages.
   * @param {Function} fun Browser scenario.
   * @param {...*} args Browser scenario arguments.
   */
  static webTestWithCommandErrors(tests, name, expected_command_errors, fun, ...args) {
    tests.add(name, async function(assert) {
      await gui_browser.evaluate(() => {
        globalThis.GUI = {
          app: jslab_web,
          q(selector, doc = document) {
            var el = doc.querySelector(selector);
            if(!el) {
              throw new Error('Missing: ' + selector);
            }
            return el;
          },
          eq(actual, expected, label = '') {
            if(actual !== expected) {
              throw new Error(label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
            }
          },
          ok(value, label = '') {
            if(!value) {
              throw new Error(label || 'Expected truthy');
            }
          },
          async plotImagePixels(w, url, width, height, background = '#fff') {
            var image = new w.Image();
            image.src = url;
            await image.decode();
            var canvas = w.document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var context = canvas.getContext('2d');
            if(background) {
              context.fillStyle = background;
              context.fillRect(0, 0, width, height);
            }
            context.drawImage(image, 0, 0, width, height);
            return context.getImageData(0, 0, width, height).data;
          },
          async comparePlotExports(w, label, width, height, meanLimit = 1, fractionLimit = .01, localLimit = Infinity) {
            var png = await w.plot.toImage('png', [width, height]);
            var svg = await w.plot.toImage('svg', [width, height]);
            var [reference, vector] = await Promise.all([this.plotImagePixels(w, png, width, height), this.plotImagePixels(w, svg, width, height)]);
            var total = 0;
            var noticeable = 0;
            var blockSize = 16;
            var columns = Math.ceil(width / blockSize);
            var rows = Math.ceil(height / blockSize);
            var blockErrors = new Float64Array(columns * rows);
            for(let i = 0; i < reference.length; i += 4) {
              var r = Math.abs(reference[i] - vector[i]);
              var g = Math.abs(reference[i + 1] - vector[i + 1]);
              var b = Math.abs(reference[i + 2] - vector[i + 2]);
              total += r + g + b;
              var pixel = i / 4;
              var column = Math.floor((pixel % width) / blockSize);
              var row = Math.floor(pixel / (width * blockSize));
              blockErrors[row * columns + column] += r + g + b;
              noticeable += Number(Math.max(r, g, b) > 16);
            }
            var mean = total / (3 * width * height);
            var fraction = noticeable / (width * height);
            var worst = { mean: 0, x: 0, y: 0 };
            for(let i = 0; i < blockErrors.length; i++) {
              var x = (i % columns) * blockSize;
              var y = Math.floor(i / columns) * blockSize;
              var area = Math.min(blockSize, width - x) * Math.min(blockSize, height - y);
              var localMean = blockErrors[i] / (3 * area);
              if(localMean > worst.mean) {
                worst = { mean: localMean, x, y };
              }
            }
            this.ok(mean < meanLimit && fraction < fractionLimit && worst.mean < localLimit,
              label + ' PNG and SVG at ' + width + '×' + height + ' differ by ' + mean.toFixed(3) +
              ' on average, with ' + (100 * fraction).toFixed(2) + '% above 16. Peak block mean is ' +
              worst.mean.toFixed(3) + ' at (' + worst.x + ', ' + worst.y + ')');
            return svg;
          },
          click(selector, doc = document) {
            this.q(selector, doc).click();
          },
          key(target, key, options = {}) {
            if(target.focus) {
              target.focus();
            }
            var win = target.ownerDocument ? target.ownerDocument.defaultView : target.defaultView;
            var e = new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
            target.dispatchEvent(e);
            return e;
          },
          input(selector, value, doc = document, event = 'input') {
            var el = this.q(selector, doc);
            el.focus();
            el.value = value;
            el.dispatchEvent(new doc.defaultView.Event(event, { bubbles: true }));
          },
          visible(selector, doc = document) {
            var el = this.q(selector, doc);
            return !el.hidden && doc.defaultView.getComputedStyle(el).display !== 'none';
          },
          async wait(fun, label = 'UI change') {
            var deadline = Date.now() + 5000;
            while(!fun()) {
              if(Date.now() > deadline) {
                throw new Error('Timeout: ' + label);
              }
              await new Promise(resolve => setTimeout(resolve, 20));
            }
          },
          async debuggerPane() {
            const managed = await this.app.windows._openEditorDebugger();
            await this.wait(() => managed.iframe.contentWindow.__JSLAB_WEB_EDITOR__);
            return managed.iframe.contentDocument;
          },
          hideDebugger() {
            this.app.window_manager.windows.get(this.app.editor_window_id)?.iframe.contentDocument.getElementById('editor-debugger-close')?.click();
          },
          async editor() {
            var managed = this.app.window_manager.windows.get(this.app.editor_window_id);
            if(!managed) {
              this.click('#editor-menu');
              await this.wait(() => this.app.window_manager.windows.has(this.app.editor_window_id));
              managed = this.app.window_manager.windows.get(this.app.editor_window_id);
            }
            await this.wait(() => managed.iframe.contentWindow.__JSLAB_WEB_EDITOR__);
            this.app.window_manager.focus(managed.id);
            return managed.iframe.contentWindow;
          },
          async presentation() {
            var managed = this.app.window_manager.windows.get('gui-presentation');
            if(!managed) {
              var opened = this.app.windows.openManagedWindow('gui-presentation', 'presentation-editor.html');
              await opened.ready;
              managed = this.app.window_manager.windows.get('gui-presentation');
            }
            var win = managed.iframe.contentWindow;
            await this.wait(() => win.presentation_editor);
            var root = '/workspace/gui-presentation';
            this.app.fs.writeTextFileSync(root + '/index.html', '<html><body><slides><slide><p>First</p><notes>First notes</notes></slide><slide><p>Second</p><notes>Second notes</notes></slide></slides></body></html>');
            this.app.fs.writeTextFileSync(root + '/main.js', '');
            this.app.fs.writeTextFileSync(root + '/main.css', '');
            this.app.fs.writeTextFileSync(root + '/res/internal/config.json', JSON.stringify({ slide_width: 1280, slide_height: 720, presentation_mode: 'offline' }));
            win.presentation_editor.setPath(root);
            return win;
          }
        };
      });
      await gui_browser.evaluate('GUI.responseFetch = function ' + PRDC_JSLAB_TESTS.responseFetch.toString());
      var result;
      try {
        result = await gui_browser.evaluate(fun, ...args);
      } catch(error) {
        const state = await gui_browser.evaluate(() => {
          const state = { stage: globalThis.debug_test_stage, details: globalThis.debug_test_info, debugger_state: globalThis.jslab_web?.worker_debugger?.state, last_result: globalThis.jslab_web?.worker_debugger?.last_result,
            console: document.getElementById('command-window-messages')?.textContent.slice(-2000) };
          globalThis.jslab_web?.worker_debugger?.dispose();
          return state;
        });
        throw new Error(error.message + ' ' + JSON.stringify(state));
      }
      assert.ok(result !== false, name);
    }, { tags: ['gui', 'web', 'integration'], timeout_ms: fun._jslab_test_timeout_ms || 20000,
      expected_command_errors });
  }

  /**
   * Imports a chosen entry in the active browser Simulate library dialog.
   * @param {string} name Source filename.
   */
  static selectSimulateEntry(name) {
    const doc = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
    doc.getElementById('simulate-library-entry').value = name;
    doc.getElementById('simulate-library-entry-import').click();
  }

}


exports.webTest = PRDC_JSLAB_WEB_TESTS_BROWSER_UTILS.webTest;
exports.webTestWithTimeout = PRDC_JSLAB_WEB_TESTS_BROWSER_UTILS.webTestWithTimeout;
exports.webTestWithCommandErrors = PRDC_JSLAB_WEB_TESTS_BROWSER_UTILS.webTestWithCommandErrors;

exports.selectSimulateEntry = PRDC_JSLAB_WEB_TESTS_BROWSER_UTILS.selectSimulateEntry;
