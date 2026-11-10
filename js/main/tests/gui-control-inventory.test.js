/**
 * @file Fails when an application control has no registered behavioral test
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { createFixture } = require('../../dev/gui-test-fixture');
const { coverage } = require('../../dev/gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }

// Load registrations even when this module is selected on its own.
for(const name of ['main-controls', 'main-data', 'inspector', 'terminal-history', 'panels']) require('./gui-' + name + '.test');
for(const name of ['editor-controls', 'editor-tabs', 'editor-search']) require('../../editor/tests/gui-' + name + '.test');
for(const name of ['auxiliary-windows', 'presentation-editor', 'presentation-viewer']) require('../../windows/tests/gui-' + name + '.test');

for(const type of ['main', 'editor', 'figure', 'serial_terminal', 'presentation-editor', 'presentation']) {
  tests.add(type + ' interactive controls have registered behavior coverage', async function(assert) {
    var f = await createFixture(type);
    try {
      if(type === 'presentation-editor') require('../../windows/tests/gui-presentation-editor.test').setup(f);
      if(type === 'presentation') require('../../windows/tests/gui-presentation-viewer.test').setup(f);
      var candidates = f.document.querySelectorAll('button,input,select,textarea,a[href],[title-str],#main-menu>li,#editor-menu>li,#window-controls>li,#new-tab,#editor-more-icon,#save-path,#paths-menu,#sandbox-stats-icon,#command-window-input-submit-cont,#figure-menu-button,#fold-slides,#unfold-slides,[contenteditable="true"]');
      var uncovered = [];
      for(const element of candidates) {
        // Tooltip wrappers describe their tested input rather than a separate action.
        if(element.matches('div[title-str]') && element.querySelector('input,select')) continue;
        if([...coverage[type]].some(selector => element.matches(selector) || element.closest(selector))) continue;
        // CodeMirror's vendored input is exercised through real document editing tests.
        if(element.matches('.CodeMirror textarea')) continue;
        uncovered.push(element.outerHTML.slice(0, 200));
      }
      assert.deepEqual(uncovered, [], 'Controls need behavior tests:\n' + uncovered.join('\n'));
    } finally { f.dispose(); }
  }, { tags: ['gui', type, 'coverage'] });
}

exports.MODULE_TESTS = tests;
