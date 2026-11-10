/**
 * @file Presentation navigation and stopwatch interaction tests
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

/**
 * Substitutes the same presentation config placeholder used by the builder.
 * @param {Object} f Fixture.
 * @returns {Object} Presentation controller.
 */
function setup(f, embedded = true) {
  f.window.__JSLAB_PRESENTATION_EMBEDDED__ = embedded;
  f.query('#slides-cont').setAttribute('transition', 'none');
  var config = { slide_width: 1280, slide_height: 720, presentation_mode: 'offline' };
  var exports = f.load(path.join(root, 'js/windows/presentation.js'), ['presentation', 'loadFileBuf'],
    source => source.replace('%presentation_config%', JSON.stringify(config))
      // The file-backed fixture emulates an HTTP standalone viewer's hash support.
      .replace("window.location.protocol != 'file:' && !is_embedded_web", embedded ? 'false' : 'true'));
  var controller = exports.presentation;
  f.window.loadFileBuf = exports.loadFileBuf;
  f.window.presentation = controller;
  return controller;
}

for(const [selector, start, expected] of [
  ['#first-slide', 1, 0], ['#prev-slide', 1, 0], ['#next-slide', 0, 1], ['#last-slide', 0, 2]
]) {
  guiTest(tests, 'presentation', 'viewer ' + selector + ' changes slide', [selector], async function(assert, f) {
    var c = setup(f); await c.setSlide(start); f.click(selector); await f.tick();
    assert.equal(c.current_slide, expected);
  });
}
guiTest(tests, 'presentation', 'viewer slide input ignores out-of-range values', ['#set-slide'], async function(assert, f) {
  var c = setup(f); f.input('#set-slide', '2', 'change'); await f.tick(); assert.equal(c.current_slide, 1);
  f.input('#set-slide', '999', 'change'); await f.tick(); assert.equal(c.current_slide, 1);
  f.input('#set-slide', '-10', 'change'); await f.tick(); assert.equal(c.current_slide, 1);
});
for(const [key, start, expected] of [['ArrowRight', 0, 1], ['ArrowLeft', 1, 0], ['PageDown', 0, 1], ['PageUp', 1, 0]]) {
  guiTest(tests, 'presentation', 'viewer keyboard navigation ' + key, [], async function(assert, f) {
    var c = setup(f); await c.setSlide(start); f.key(null, key); await f.tick(); assert.equal(c.current_slide, expected);
  });
}
guiTest(tests, 'presentation', 'viewer Ctrl+S toggles navigation and F9 toggles stopwatch', [], function(assert, f) {
  var c = setup(f), original = c.slide_nav.hidden;
  f.key(null, 's', { ctrlKey: true }); assert.equal(c.slide_nav.hidden, !original);
  assert.equal(c.stopwatch.el.hidden, true);
  f.key(null, 'F9'); assert.equal(c.stopwatch.el.hidden, false);
  f.key(null, 'F9'); assert.equal(c.stopwatch.el.hidden, true);
});

guiTest(tests, 'presentation', 'stopwatch context menu starts, stops and resets elapsed time',
  ['#presentation-stopwatch-menu [data-action="start"]', '#presentation-stopwatch-menu [data-action="stop"]', '#presentation-stopwatch-menu [data-action="reset"]'], function(assert, f) {
    var c = setup(f), watch = c.stopwatch; watch.show();
    f.mouse(watch.el, 'contextmenu', 30, 30);
    assert.equal(watch.menu.hidden, false);
    f.click('#presentation-stopwatch-menu [data-action="start"]'); assert.ok(watch.interval);
    f.click('#presentation-stopwatch-menu [data-action="stop"]'); assert.equal(watch.interval, null);
    watch.elapsed_ms = 123000;
    f.click('#presentation-stopwatch-menu [data-action="reset"]'); assert.equal(watch.elapsed_ms, 0);
    assert.equal(watch.time_el.textContent, '00:00');
  });
guiTest(tests, 'presentation', 'stopwatch can be dragged and every resize corner enforces minimum size', ['#presentation-stopwatch'], function(assert, f) {
  var watch = setup(f).stopwatch; watch.show();
  var original = watch.el.getBoundingClientRect();
  f.pointer(watch.el, 'pointerdown', original.left + 10, original.top + 10);
  f.pointer(f.document, 'pointermove', original.left + 80, original.top + 60);
  f.pointer(f.document, 'pointerup', original.left + 80, original.top + 60);
  var moved = watch.el.getBoundingClientRect();
  assert.ok(moved.left !== original.left || moved.top !== original.top);
  for(const handle of watch.el.querySelectorAll('.resize-handle')) {
    var rect = handle.getBoundingClientRect();
    f.pointer(handle, 'pointerdown', rect.left, rect.top);
    f.pointer(f.document, 'pointermove', rect.left + 20, rect.top + 20);
    f.pointer(f.document, 'pointerup', rect.left + 20, rect.top + 20);
    var resized = watch.el.getBoundingClientRect();
    assert.ok(resized.width >= watch.min_width); assert.ok(resized.height >= watch.min_height);
  }
});

exports.MODULE_TESTS = tests;
exports.setup = setup;
