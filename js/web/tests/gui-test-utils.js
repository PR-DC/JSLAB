/**
 * @file Real web GUI scenario helpers and behavioral assertions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
function webTest(tests, name, fun, ...args) {
  tests.add(name, async function(assert) {
    await gui_browser.evaluate(() => {
      globalThis.GUI = {
        app: jslab_web,
        q(selector, doc = document) { var el = doc.querySelector(selector); if(!el) throw new Error('Missing: ' + selector); return el; },
        eq(actual, expected, label = '') { if(actual !== expected) throw new Error(label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); },
        ok(value, label = '') { if(!value) throw new Error(label || 'Expected truthy'); },
        click(selector, doc = document) { this.q(selector, doc).click(); },
        key(target, key, options = {}) {
          if(target.focus) target.focus();
          var win = target.ownerDocument ? target.ownerDocument.defaultView : target.defaultView;
          var e = new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }); target.dispatchEvent(e); return e;
        },
        input(selector, value, doc = document, event = 'input') {
          var el = this.q(selector, doc); el.focus(); el.value = value; el.dispatchEvent(new doc.defaultView.Event(event, { bubbles: true }));
        },
        visible(selector, doc = document) { var el = this.q(selector, doc); return !el.hidden && doc.defaultView.getComputedStyle(el).display !== 'none'; },
        async wait(fun, label = 'UI change') {
          var deadline = Date.now() + 5000;
          while(!fun()) { if(Date.now() > deadline) throw new Error('Timeout: ' + label); await new Promise(resolve => setTimeout(resolve, 20)); }
        },
        async editor() {
          var managed = this.app.window_manager.windows.get(this.app.editor_window_id);
          if(!managed) { this.click('#editor-menu'); await this.wait(() => this.app.window_manager.windows.has(this.app.editor_window_id)); managed = this.app.window_manager.windows.get(this.app.editor_window_id); }
          await this.wait(() => managed.iframe.contentWindow.__JSLAB_WEB_EDITOR__);
          return managed.iframe.contentWindow;
        },
        async presentation() {
          var managed = this.app.window_manager.windows.get('gui-presentation');
          if(!managed) {
            var opened = this.app.openManagedWindow('gui-presentation', 'presentation-editor.html'); await opened.ready;
            managed = this.app.window_manager.windows.get('gui-presentation');
          }
          var win = managed.iframe.contentWindow;
          await this.wait(() => win.presentation_editor);
          var root = '/workspace/gui-presentation';
          this.app.fs.writeTextFileSync(root + '/index.html', '<html><body><slides><slide><p>First</p><notes>First notes</notes></slide><slide><p>Second</p><notes>Second notes</notes></slide></slides></body></html>');
          this.app.fs.writeTextFileSync(root + '/main.js', ''); this.app.fs.writeTextFileSync(root + '/main.css', '');
          this.app.fs.writeTextFileSync(root + '/res/internal/config.json', JSON.stringify({ slide_width: 1280, slide_height: 720, presentation_mode: 'offline' }));
          win.presentation_editor.setPath(root);
          return win;
        }
      };
    });
    var result = await gui_browser.evaluate(fun, ...args);
    assert.ok(result !== false, name);
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 20000 });
}
exports.webTest = webTest;
