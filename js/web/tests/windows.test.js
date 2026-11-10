/**
 * @file Browser window/taskbar/panel integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { webTest } = require('./gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) { exports.MODULE_TESTS = tests; return; }

webTest(tests, 'web managed window minimizes, restores from taskbar, maximizes and closes', async function() {
  var t = GUI, manager = t.app.window_manager;
  var win = manager.createWindow({ id: 'gui-window-test', title: 'GUI test', srcdoc: '<p>Real iframe</p>' });
  await t.wait(() => win.iframe.contentDocument && win.iframe.contentDocument.querySelector('p'));
  win.element.querySelector('button[title="Minimize"]').click(); t.ok(win.minimized);
  [...document.querySelectorAll('#taskbar button')].find(button => button.textContent === 'GUI test').click(); t.eq(win.minimized, false);
  win.element.querySelector('button[title="Maximize"]').click(); t.eq(win.maximized, true);
  win.element.querySelector('.web-window-actions button:nth-child(2)').click(); t.eq(win.maximized, false);
  win.element.querySelector('button.close').click(); t.eq(manager.windows.has(win.id), false);
});

webTest(tests, 'web managed window drag, all resize handles and cancellation clean up interactions', async function() {
  var t = GUI, manager = t.app.window_manager;
  var win = manager.createWindow({ id: 'gui-drag-test', title: 'Drag test', width: 500, height: 400 });
  function pointer(target, type, x, y) { target.dispatchEvent(new PointerEvent(type, { pointerId: 77, pointerType: 'mouse', button: 0, clientX: x, clientY: y, bubbles: true, cancelable: true })); }
  for(var end of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    var before = win.element.style.left;
    pointer(win.header, 'pointerdown', 100, 100); pointer(win.header, 'pointermove', 130, 120); pointer(win.header, end, 130, 120);
    t.ok(win.element.style.left !== before); t.eq(document.body.classList.contains('web-window-interacting'), false);
  }
  for(var handle of win.resize_handles) {
    var rect = win.element.getBoundingClientRect();
    pointer(handle, 'pointerdown', rect.right, rect.bottom); pointer(handle, 'pointermove', rect.right + 30, rect.bottom + 25); pointer(handle, 'pointerup', rect.right + 30, rect.bottom + 25);
    t.ok(parseFloat(win.element.style.width) >= 250); t.ok(parseFloat(win.element.style.height) >= 50);
    for(var end of ['pointercancel', 'lostpointercapture']) { pointer(handle, 'pointerdown', 50, 50); pointer(handle, end, 50, 50); }
  }
  manager.close(win.id); t.eq(manager.windows.has(win.id), false);
});

webTest(tests, 'web every main panel divider resizes and persists with mouseup cleanup', async function() {
  var t = GUI;
  for(var resizer of document.querySelectorAll('#panels-container .vertical-resizer, #panels-container .horizontal-resizer')) {
    var rect = resizer.getBoundingClientRect(), vertical = resizer.classList.contains('vertical-resizer');
    var before = resizer.style.cssText;
    resizer.dispatchEvent(new MouseEvent('mousedown', { clientX: rect.left + 2, clientY: rect.top + 2, bubbles: true, cancelable: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + (vertical ? 25 : 2), clientY: rect.top + (vertical ? 2 : 25), bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    t.ok(resizer.style.cssText !== before); t.eq(document.body.classList.contains('dragging'), false);
  }
  window.dispatchEvent(new Event('resize'));
  t.ok(Object.keys(localStorage).some(key => key.includes('panel-')));
});
exports.MODULE_TESTS = tests;
