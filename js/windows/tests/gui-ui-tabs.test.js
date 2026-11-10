/**
 * @file Shared generated-window tab controls
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest } = require('../../dev/gui-test-utils');
const { root } = require('../../dev/gui-test-fixture');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }
for(const active of [-1, 1]) {
  guiTest(tests, 'blank', 'generated UI tabs initialize with ' + (active < 0 ? 'default' : 'selected') + ' tab and switch panels', [], function(assert, f) {
    var container = f.document.createElement('div'); container.className = 'ui tabs-cont';
    container.innerHTML = [0, 1, 2].map(i => '<button class="ui tab-name' + (i === active ? ' active' : '') + '">Tab ' + i + '</button>').join('') +
      [0, 1, 2].map(i => '<div class="ui tab">Panel ' + i + '</div>').join('');
    f.document.body.appendChild(container);
    f.load(path.join(root, 'js/windows/ui.js'));
    var headers = [...container.querySelectorAll('.tab-name')], panels = [...container.querySelectorAll('.tab')];
    assert.equal(panels[Math.max(0, active)].style.display, 'block');
    for(var index = 0; index < headers.length; index++) {
      headers[index].click();
      for(var i = 0; i < headers.length; i++) {
        assert.equal(headers[i].classList.contains('active'), i === index);
        assert.equal(panels[i].style.display, i === index ? 'block' : 'none');
      }
    }
  });
}
exports.MODULE_TESTS = tests;
