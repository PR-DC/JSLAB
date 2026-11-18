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
    }, { tags: ['gui', 'web', 'integration'], timeout_ms: 20000 });
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

exports.selectSimulateEntry = PRDC_JSLAB_WEB_TESTS_BROWSER_UTILS.selectSimulateEntry;
