/**
 * @file Browser window/taskbar/panel integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { webTest } = require('./browser-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) {
  exports.MODULE_TESTS = tests;
  return;
}

webTest(tests, 'web managed window minimizes, restores from taskbar, maximizes and closes', async function() {
  var t = GUI, manager = t.app.window_manager;
  var win = manager.createWindow({ id: 'gui-window-test', title: 'GUI test', srcdoc: '<p>Real iframe</p>' });
  await t.wait(() => win.iframe.contentDocument && win.iframe.contentDocument.querySelector('p'));
  win.element.querySelector('button[title="Minimize"]').click();
  t.ok(win.minimized);
  [...document.querySelectorAll('#taskbar button')].find(button => button.textContent === 'GUI test').click();
  t.eq(win.minimized, false);
  win.element.querySelector('button[title="Maximize"]').click();
  t.eq(win.maximized, true);
  win.element.querySelector('.web-window-actions button:nth-child(2)').click();
  t.eq(win.maximized, false);
  win.element.querySelector('button.close').click();
  t.eq(manager.windows.has(win.id), false);
});

webTest(tests, 'web managed window drag, all resize handles and cancellation clean up interactions', async function() {
  var t = GUI, manager = t.app.window_manager;
  var win = manager.createWindow({ id: 'gui-drag-test', title: 'Drag test', width: 500, height: 400 });
  function pointer(target, type, x, y) {
    target.dispatchEvent(new PointerEvent(type, { pointerId: 77, pointerType: 'mouse', button: 0, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }
  for(var end of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    var before = win.element.style.left;
    pointer(win.header, 'pointerdown', 100, 100);
    pointer(win.header, 'pointermove', 130, 120);
    pointer(win.header, end, 130, 120);
    t.ok(win.element.style.left !== before);
    t.eq(document.body.classList.contains('web-window-interacting'), false);
  }
  for(var handle of win.resize_handles) {
    var rect = win.element.getBoundingClientRect();
    pointer(handle, 'pointerdown', rect.right, rect.bottom);
    pointer(handle, 'pointermove', rect.right + 30, rect.bottom + 25);
    pointer(handle, 'pointerup', rect.right + 30, rect.bottom + 25);
    t.ok(parseFloat(win.element.style.width) >= 250);
    t.ok(parseFloat(win.element.style.height) >= 50);
    for(var end of ['pointercancel', 'lostpointercapture']) {
      pointer(handle, 'pointerdown', 50, 50);
      pointer(handle, end, 50, 50);
    }
  }
  manager.close(win.id);
  t.eq(manager.windows.has(win.id), false);
});

webTest(tests, 'web every main panel divider resizes and persists with mouseup cleanup', async function() {
  var t = GUI;
  for(var resizer of document.querySelectorAll('#panels-container .vertical-resizer, #panels-container .horizontal-resizer')) {
    var rect = resizer.getBoundingClientRect(), vertical = resizer.classList.contains('vertical-resizer');
    var before = resizer.style.cssText;
    resizer.dispatchEvent(new MouseEvent('mousedown', { clientX: rect.left + 2, clientY: rect.top + 2, bubbles: true, cancelable: true }));
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.left + (vertical ? 25 : 2), clientY: rect.top + (vertical ? 2 : 25), bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    t.ok(resizer.style.cssText !== before);
    t.eq(document.body.classList.contains('dragging'), false);
  }
  window.dispatchEvent(new Event('resize'));
  t.ok(Object.keys(localStorage).some(key => key.includes('panel-')));
});

webTest(tests, 'web Command Window panel fills the space below its title', function() {
  const command = GUI.q('#command-window');
  const frame = command.closest('.panel-container');
  GUI.eq(getComputedStyle(command).position, 'absolute');
  GUI.eq(command.offsetTop, 23);
  GUI.eq(command.offsetHeight, frame.clientHeight - 23);
});

if(globalThis.gui_browser) {
  tests.add('Closing a script window after its sandbox worker stops produces no unhandled rejection', async function(assert) {
    const errors = gui_browser.errors.length;
    const state = await gui_browser.evaluate(async () => {
      const app = jslab_web;
      const worker = await app.runtime._startWorkerDebugger();
      const opened = await worker.evaluate('var closed_worker_window = openWindow("blank.html"); closed_worker_window;');
      const wid = opened.value;
      const notification = app.sandbox_api.notifyWindowClosed(wid);
      worker.dispose();
      const closed = app.window_manager.close(String(wid));
      const pending = await notification;
      const late = await app.sandbox_api.notifyWindowClosed(wid);
      await app.runtime._startWorkerDebugger();
      return { closed, pending, late };
    });
    assert.deepEqual(state, { closed: true, pending: false, late: false });
    assert.equal(gui_browser.errors.length, errors);
  }, { tags: ['gui', 'web', 'integration'] });

  tests.add('Web closeWindows all closes script windows and keeps the Editor open', async function(assert) {
    const editor_id = await gui_browser.evaluate(async () => {
      await jslab_web.windows._openEditorWindow();
      return jslab_web.editor_window_id;
    });
    const before = await gui_browser.evaluate(() => [...jslab_web.window_manager.windows.keys()]);
    try {
      const opened = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate(
        'var window_close_probe = openWindow("blank.html"); await getWindow(window_close_probe).ready; true;'));
      assert.equal(opened.ok, true);
      const child_id = await gui_browser.evaluate(previous =>
        [...jslab_web.window_manager.windows.keys()].find(id => !previous.includes(id)), before);
      assert.ok(child_id);
      const closed = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('closeWindows("all");'));
      assert.equal(closed.ok, true);
      const state = await gui_browser.evaluate((editor, child) => {
        const windows = jslab_web.window_manager.windows;
        return { editor: windows.has(editor), child: windows.has(child) };
      }, editor_id, child_id);
      assert.deepEqual(state, { editor: true, child: false });
      const runtime = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('getWindow(window_close_probe) === false'));
      assert.equal(runtime.value, true);
    } finally {
      await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('closeWindow(window_close_probe);'));
    }
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 20000 });

  tests.add('A maximized Web window follows viewport and taskbar size changes', async function(assert) {
    try {
      await gui_browser.resizeViewport(760, 520);
      await gui_browser.evaluate(() => {
        const manager = jslab_web.window_manager;
        manager.createWindow({ id: 'maximized-fill-probe', width: 500, height: 350 });
        manager.toggleMaximize('maximized-fill-probe');
      });
      await gui_browser.resizeViewport(1400, 900);
      const state = await gui_browser.evaluate(() => {
        const manager = jslab_web.window_manager;
        const fills = () => manager.getSize('maximized-fill-probe').every((size, index) =>
          size === [manager.container.clientWidth, manager.container.clientHeight][index]);
        const resized = fills();
        manager.createWindow({ id: 'taskbar-fill-probe' });
        manager.minimize('taskbar-fill-probe');
        const taskbar = fills();
        manager.close('taskbar-fill-probe');
        const expanded = fills();
        manager.toggleMaximize('maximized-fill-probe');
        return { resized, taskbar, expanded, restored: manager.getSize('maximized-fill-probe') };
      });
      assert.deepEqual(state, { resized: true, taskbar: true, expanded: true, restored: [500, 350] });
    } finally {
      await gui_browser.evaluate(() => {
        for(const id of ['maximized-fill-probe', 'taskbar-fill-probe']) jslab_web.window_manager.close(id);
      });
      await gui_browser.restoreViewport();
    }
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 30000 });

  tests.add('Web main layout fills narrow and wide viewports with or without a taskbar', async function(assert) {
    try {
      for(const [width, height] of [[1400, 900], [1024, 720], [760, 520], [540, 600]]) {
        await gui_browser.resizeViewport(width, height);
        const layout = await gui_browser.evaluate(() => {
          const bounds = id => document.getElementById(id).getBoundingClientRect();
          const panels = bounds('panels-container');
          const status = bounds('status-container');
          const header = document.querySelector('#main-menu-container > div').getBoundingClientRect();
          const logo = bounds('app-logo');
          const logo_style = getComputedStyle(document.getElementById('app-logo'));
          const logo_center = logo.top + (logo.height + parseFloat(logo_style.paddingTop) - parseFloat(logo_style.paddingBottom)) / 2;
          const manager = jslab_web.window_manager;
          const probe = manager.createWindow({ id: 'viewport-layout-probe' });
          manager.minimize(probe.id);
          const taskbar = bounds('taskbar-container');
          const with_taskbar = bounds('panels-container').bottom === taskbar.top && taskbar.bottom === status.top;
          manager.close(probe.id);
          return { width: innerWidth, scroll_width: document.documentElement.scrollWidth,
            header: bounds('main-menu-container').right, footer: status.right, bottom: status.bottom,
            logo_centered: Math.abs(logo_center - (header.top + header.height / 2)) < 1,
            download: bounds('download-button').right <= innerWidth,
            stacked: bounds('folder-navigation-container').bottom === panels.top && panels.bottom === status.top,
            with_taskbar };
        });
        assert.deepEqual(layout, { width, scroll_width: width, header: width, footer: width, bottom: height,
          logo_centered: true, download: true, stacked: true, with_taskbar: true });
      }
    } finally {
      await gui_browser.restoreViewport();
    }
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 30000 });
}

exports.MODULE_TESTS = tests;
