/**
 * @file Panel divider dragging, constraints, persistence and resize propagation
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest } = require('../../dev/gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }

for(const name of ['columns', 'left_rows', 'workspace_columns']) {
  for(const divider of (name === 'columns' ? [0] : [0, 1])) {
    guiTest(tests, 'main', name + ' divider ' + divider + ' drags, persists, clamps and stops on mouseup', [], function(assert, f, c) {
      var panel = c.panels[name];
      var resizer = [...panel.container.children].find(element => element.getAttribute('index') === String(divider));
      assert.ok(resizer, 'Missing panel divider');
      var original = [...panel.cells_size];
      var rect = panel.container.getBoundingClientRect();
      var vertical = panel.orientation === 'vertical';
      var start = original.slice(0, divider).reduce((sum, value) => sum + value, 0);
      var total = original[divider] + original[divider + 1];
      function drag(percent) {
        var x = vertical ? rect.left + panel.container.clientWidth * percent / 100 : rect.left + 5;
        var y = vertical ? rect.top + 5 : rect.top + panel.container.clientHeight * percent / 100;
        f.mouse(f.document, 'mousemove', x, y);
      }
      f.mouse(resizer, 'mousedown', rect.left + 1, rect.top + 1);
      assert.equal(f.document.body.classList.contains('dragging'), true);
      drag(start + total * 0.6);
      assert.ok(Math.abs(panel.cells_size[divider] - total * 0.6) < 100 / panel.container[panel.attr_cont_size] + 0.01);
      assert.ok(Math.abs(panel.cells_size.reduce((sum, value) => sum + value, 0) - 100) < 0.01);
      assert.deepEqual(f.data.get('panel-' + panel.id), Array.from(panel.cells_size));
      for(var i = 0; i < original.length; i++) {
        if(i !== divider && i !== divider + 1) assert.equal(panel.cells_size[i], original[i]);
      }
      drag(-100); assert.ok(Math.abs(panel.cells_size[divider] - f.window.config.PANEL_MIN_SIZE) < 0.001);
      drag(200); assert.ok(Math.abs(panel.cells_size[divider + 1] - f.window.config.PANEL_MIN_SIZE) < 0.001);
      f.mouse(f.document, 'mouseup', 0, 0);
      assert.equal(f.document.body.classList.contains('dragging'), false);
      var stopped = [...panel.cells_size]; drag(50);
      assert.deepEqual(Array.from(panel.cells_size), stopped);
      var element = typeof panel.elements[divider] === 'string' ? f.query(panel.elements[divider]) : panel.elements[divider];
      assert.ok(Math.abs(parseFloat(element.style[panel.attr_size]) - panel.cells_size[divider]) < 0.001);
    });
  }
}

guiTest(tests, 'main', 'window resizing refreshes nested panel bounds', [], function(assert, f, c) {
  c.panels.left_rows.container_bcr = null;
  c.panels.workspace_columns.container_bcr = null;
  f.window.dispatchEvent(new f.window.Event('resize'));
  assert.ok(c.panels.left_rows.container_bcr.width > 0);
  assert.ok(c.panels.workspace_columns.container_bcr.width > 0);
});

guiTest(tests, 'editor', 'search panel resize persists its height and enforces limits', ['#editor-search-all-resizer'], function(assert, f, c) {
  var search = c.editor_search_all; search.open();
  var resizer = f.query('#editor-search-all-resizer');
  var initial = search.panel_height;
  f.mouse(resizer, 'mousedown', 300, 500);
  f.mouse(f.document, 'mousemove', 300, 450);
  assert.ok(search.panel_height > initial);
  f.mouse(f.document, 'mousemove', 300, 10000);
  assert.ok(search.panel_height >= search.min_panel_height);
  f.mouse(f.document, 'mousemove', 300, -10000);
  assert.ok(search.panel_height <= f.window.innerHeight - search.min_code_height);
  f.mouse(f.document, 'mouseup', 300, 200);
  assert.equal(f.document.body.classList.contains('dragging'), false);
  var stopped = search.panel_height;
  f.mouse(f.document, 'mousemove', 300, 0);
  assert.equal(search.panel_height, stopped);
  assert.ok(f.window.localStorage.getItem(search.storage_height_percent_key));
});

exports.MODULE_TESTS = tests;
