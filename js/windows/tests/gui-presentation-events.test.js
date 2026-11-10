/**
 * @file Presentation event lifecycle, resource failures and thumbnail interactions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest } = require('../../dev/gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }

guiTest(tests, 'presentation-editor', 'presentation preview messages and thumbnail clicks update selection', [], async function(assert, f) {
  var c = require('./gui-presentation-editor.test').setup(f);
  function message(target, data) {
    var event = new f.window.Event('ipc-message'); Object.defineProperty(event, 'args', { value: [data] }); target.dispatchEvent(event);
  }
  message(c.webview, { ready: 2 }); message(c.webview, { slide: 1 });
  assert.equal(c.current_slide, 1); assert.equal(f.query('#set-slide').value, '2');
  c.full_thumb_refresh_on_ready = false;
  for(const worker of c.thumb_workers) { message(worker.view, { ready: 2 }); message(worker.view, { slide: 0 }); }
  assert.equal(c.thumb_ready, true);
  f.click('.slide-thumb'); assert.equal(f.calls.at(-1)[2].show, 0);
  f.mouse(f.query('.slide-thumb'), 'contextmenu', 20, 20);
  assert.ok(f.calls.some(call => call[1] === 'show-presentation-editor-slide-context-menu'));
  c.slide_thumbnails.dispatchEvent(new f.window.Event('scroll'));
  f.window.dispatchEvent(new f.window.Event('resize'));
  assert.ok(c.columns.container_bcr.width > 0);
  f.window.CodeMirror.signal(c.html_editor.code_editor, 'keypress', c.html_editor.code_editor, new f.window.KeyboardEvent('keypress', { key: ';' }));
});

guiTest(tests, 'presentation-editor', 'presentation thumbnail drag/drop updates source order and clears drag state', [], async function(assert, f) {
  var c = require('./gui-presentation-editor.test').setup(f);
  c.buildThumbnails();
  var item = f.query('.slide-thumb'), transfer = new f.window.DataTransfer();
  item.dispatchEvent(new f.window.DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
  assert.equal(c.drag_slide_index, 0);
  c.slide_thumbnails.dispatchEvent(new f.window.DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer, clientY: 10000 }));
  c.slide_thumbnails.dispatchEvent(new f.window.DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer, clientY: 10000 }));
  c.slide_thumbnails.dispatchEvent(new f.window.DragEvent('dragend', { bubbles: true }));
  assert.equal(c.drag_slide_index, undefined);
  await f.tick();
  assert.ok(c.html_editor.code_editor.getValue().indexOf('Second') < c.html_editor.code_editor.getValue().indexOf('First'));
});

guiTest(tests, 'presentation-editor', 'presentation keyboard save/search and Escape cancellation work', [], async function(assert, f) {
  var c = require('./gui-presentation-editor.test').setup(f); c.js_editor.code_editor.setValue('// shortcut');
  f.key(null, 's', { ctrlKey: true }); await f.tick(); assert.equal(f.files.get(c.js_editor.file_path), '// shortcut');
  f.key(null, 'F', { ctrlKey: true, shiftKey: true }); assert.equal(f.visible('#editor-search-all-panel'), true);
  c.js_editor.code_editor.setValue('// unsaved'); c.requestClose(); f.key(null, 'Escape');
  assert.equal(c.close_requested, false);
});

guiTest(tests, 'presentation', 'presentation wheel, messages, resize, print and gestures navigate correctly', [], function(assert, f) {
  var c = require('./gui-presentation-viewer.test').setup(f); c.setSlide(0);
  f.query('#slides-cont').dispatchEvent(new f.window.WheelEvent('wheel', { deltaY: 80, bubbles: true }));
  assert.equal(c.current_slide, 1);
  f.window.dispatchEvent(new f.window.MessageEvent('message', { data: { set: 0 } })); assert.equal(c.current_slide, 0);
  f.window.dispatchEvent(new f.window.Event('beforeprint')); f.window.dispatchEvent(new f.window.Event('resize'));
  var area = f.query('#slides-cont');
  area.dispatchEvent(new f.window.PointerEvent('pointerdown', { clientX: 300, clientY: 100, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true }));
  area.dispatchEvent(new f.window.PointerEvent('pointerup', { clientX: 100, clientY: 100, pointerId: 1, pointerType: 'touch', isPrimary: true, bubbles: true }));
  assert.equal(c.current_slide, 1);
  area.dispatchEvent(new f.window.PointerEvent('pointercancel', { bubbles: true }));
  c.stopwatch.show(); c.stopwatch.menu.dispatchEvent(new f.window.PointerEvent('pointerdown', { bubbles: true }));
  f.document.dispatchEvent(new f.window.PointerEvent('pointerdown', { bubbles: true }));
  assert.equal(c.stopwatch.menu.style.display, 'none');
});

guiTest(tests, 'presentation', 'presentation animation completion removes transition state', [], function(assert, f) {
  var c = require('./gui-presentation-viewer.test').setup(f); c.setSlide(0); c.transition = 'fade'; c.showSlide(1);
  assert.equal(c._animating, true);
  for(const slide of f.document.querySelectorAll('slide')) slide.dispatchEvent(new f.window.Event('animationend'));
  assert.equal(c._animating, false);
});

guiTest(tests, 'presentation', 'presentation script loading resolves both success and failure and caches failures', [], async function(assert, f) {
  var c = require('./gui-presentation-viewer.test').setup(f);
  var success = c._loadScriptOnce('test-success', 'not-requested.js');
  var script = f.document.head.querySelector('script:last-of-type'); script.removeAttribute('src'); script.dispatchEvent(new f.window.Event('load'));
  assert.equal(await success, true);
  var failure = c._loadScriptOnce('test-error', 'not-requested.js');
  script = f.document.head.querySelector('script:last-of-type'); script.removeAttribute('src'); script.dispatchEvent(new f.window.Event('error'));
  assert.equal(await failure, false); assert.equal(await c._loadScriptOnce('test-error', 'unused.js'), false);
  var candidate = c._loadScriptCandidatesOnce('candidate-success', ['not-requested.js']);
  script = f.document.head.querySelector('script:last-of-type'); script.removeAttribute('src'); script.dispatchEvent(new f.window.Event('load'));
  assert.equal(await candidate, true);
  candidate = c._loadScriptCandidatesOnce('candidate-error', ['not-requested.js']);
  script = f.document.head.querySelector('script:last-of-type'); script.removeAttribute('src'); script.dispatchEvent(new f.window.Event('error'));
  assert.equal(await candidate, false);
});

guiTest(tests, 'presentation', 'presentation image and video errors resolve resource readiness instead of hanging', [], async function(assert, f) {
  var c = require('./gui-presentation-viewer.test').setup(f);
  var slide = f.query('slide'), image = f.document.createElement('img'), video = f.document.createElement('video');
  Object.defineProperty(image, 'complete', { value: false }); slide.appendChild(image); slide.appendChild(video);
  var ready = c._waitForSlideAssets(slide);
  image.dispatchEvent(new f.window.Event('error')); video.dispatchEvent(new f.window.Event('error'));
  await ready; assert.equal(image.isConnected, true); assert.equal(video.isConnected, true);
});

exports.MODULE_TESTS = tests;
