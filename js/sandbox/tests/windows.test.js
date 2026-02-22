/**
 * @file JSLAB windows submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_WINDOWS } = require('../windows');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createWindowStub(id, log) {
  return {
    openDevTools: function() { return 'devtools-' + id; },
    getMediaSourceId: function() { return 'media-' + id; },
    startVideoRecording: function(opts) { return { id: id, opts: opts }; },
    close: function() { return 'close-' + id; },
    show: function() { return 'show-' + id; },
    hide: function() { return 'hide-' + id; },
    focus: function() { return 'focus-' + id; },
    minimize: function() { return 'minimize-' + id; },
    center: function() { return 'center-' + id; },
    moveTop: function() { return 'movetop-' + id; },
    setSize: function(w, h) { return [w, h]; },
    setPos: function(x, y) { return [x, y]; },
    setResizable: function(state) { return state; },
    setMovable: function(state) { return state; },
    setAspectRatio: function(value) { return value; },
    setOpacity: function(value) { return value; },
    setFullscreen: function(state) { return state; },
    setTitle: function(title) { return title; },
    getSize: function() { return [800, 600]; },
    getPos: function() { return [10, 20]; },
    printToPdf: function(options) { return { pdf: id, options: options }; },
    _updateLanguage: function(flag) { log.push(['lang', id, flag]); },
    onClosed: function() { log.push(['closed', id]); }
  };
}

function createWindowsHarness() {
  var close_window_calls = [];
  var log = [];
  var jsl = {
    no_ans: false,
    ignore_output: false,
    inter: {
      env: {
        closeWindow: function(wid) {
          close_window_calls.push(wid);
        }
      },
      windows: null
    }
  };

  var windows = new PRDC_JSLAB_LIB_WINDOWS(jsl);
  jsl.inter.windows = windows;
  windows.open_windows = {
    1: createWindowStub(1, log),
    2: createWindowStub(2, log)
  };
  windows.active_window = 1;

  return { windows, jsl, close_window_calls, log };
}

tests.add('window proxy methods delegate to targeted window objects', function(assert) {
  var harness = createWindowsHarness();
  var windows = harness.windows;

  assert.equal(windows.openWindowDevTools(1), 'devtools-1');
  assert.equal(windows.getWindowMediaSourceId(1), 'media-1');
  assert.deepEqual(windows.startWindowVideoRecording(1, { fps: 30 }), { id: 1, opts: { fps: 30 } });
  assert.equal(windows.showWindow(1), 'show-1');
  assert.equal(windows.hideWindow(1), 'hide-1');
  assert.equal(windows.focusWindow(1), 'focus-1');
  assert.equal(windows.minimizeWindow(1), 'minimize-1');
  assert.equal(windows.centerWindow(1), 'center-1');
  assert.equal(windows.moveTopWindow(1), 'movetop-1');
  assert.deepEqual(windows.setWindowSize(1, 1024, 768), [1024, 768]);
  assert.deepEqual(windows.setWindowPos(1, 50, 60), [50, 60]);
  assert.equal(windows.setWindowResizable(1, true), true);
  assert.equal(windows.setWindowMovable(1, false), false);
  assert.equal(windows.setWindowAspectRatio(1, 1.6), 1.6);
  assert.equal(windows.setWindowOpacity(1, 0.8), 0.8);
  assert.equal(windows.setWindowFullscreen(1, true), true);
  assert.equal(windows.setWindowTitle(1, 'Title'), 'Title');
  assert.deepEqual(windows.getWindowSize(1), [800, 600]);
  assert.deepEqual(windows.getWindowPos(1), [10, 20]);
  assert.deepEqual(windows.printWindowToPdf(1, { pageSize: 'A4' }), { pdf: 1, options: { pageSize: 'A4' } });
  assert.equal(windows.closeWindow(1), 'close-1');
}, { tags: ['unit', 'windows'] });

tests.add('window helpers return false for unknown IDs', function(assert) {
  var harness = createWindowsHarness();
  var windows = harness.windows;

  assert.equal(windows.openWindowDevTools(99), false);
  assert.equal(windows.getWindowMediaSourceId(99), false);
  assert.equal(windows.startWindowVideoRecording(99), false);
  assert.equal(windows.closeWindow(99), false);
  assert.equal(windows.getWindow(99), false);
  assert.equal(windows.showWindow(99), false);
  assert.equal(windows.hideWindow(99), false);
  assert.equal(windows.focusWindow(99), false);
  assert.equal(windows.minimizeWindow(99), false);
  assert.equal(windows.centerWindow(99), false);
  assert.equal(windows.moveTopWindow(99), false);
  assert.equal(windows.setWindowSize(99, 1, 2), false);
  assert.equal(windows.setWindowPos(99, 1, 2), false);
  assert.equal(windows.setWindowResizable(99, true), false);
  assert.equal(windows.setWindowMovable(99, true), false);
  assert.equal(windows.setWindowAspectRatio(99, 2), false);
  assert.equal(windows.setWindowOpacity(99, 0.5), false);
  assert.equal(windows.setWindowFullscreen(99, true), false);
  assert.equal(windows.setWindowTitle(99, 'x'), false);
  assert.equal(windows.getWindowSize(99), false);
  assert.equal(windows.getWindowPos(99), false);
  assert.equal(windows.printWindowToPdf(99, {}), false);
}, { tags: ['unit', 'windows'] });

tests.add('active window helpers and closeWindows side effects work', function(assert) {
  var harness = createWindowsHarness();
  var windows = harness.windows;

  assert.equal(windows.getWindow(1), windows.open_windows[1]);
  assert.equal(windows.getCurrentWindow(), windows.open_windows[1]);
  assert.equal(windows.gcw(), windows.open_windows[1]);

  windows.closeWindows(2);
  assert.deepEqual(harness.close_window_calls, [2]);
  assert.equal(harness.jsl.no_ans, true);
  assert.equal(harness.jsl.ignore_output, true);
}, { tags: ['unit', 'windows'] });

tests.add('internal active-window bookkeeping updates language and closed windows', function(assert) {
  var harness = createWindowsHarness();
  var windows = harness.windows;

  windows._setActiveWindow(2);
  assert.equal(windows.active_window, 2);
  windows._setActiveWindow(99);
  assert.equal(windows.active_window, -1);

  windows._updateLanguage();
  assert.ok(harness.log.some(function(entry) {
    return entry[0] === 'lang' && entry[1] === 1 && entry[2] === false;
  }));
  assert.ok(harness.log.some(function(entry) {
    return entry[0] === 'lang' && entry[1] === 2 && entry[2] === false;
  }));

  windows.active_window = 1;
  windows._closedWindow(1);
  assert.equal(windows.getWindow(1), false);
  assert.ok(harness.log.some(function(entry) {
    return entry[0] === 'closed' && entry[1] === 1;
  }));
}, { tags: ['unit', 'windows'] });

tests.add('openCanvas returns false immediately when stop loop is active', async function(assert) {
  var wait_calls = 0;
  var jsl = {
    inter: {
      env: {},
      basic: {
        checkStopLoop: function() {
          return true;
        }
      },
      non_blocking: {
        waitMSeconds: async function() {
          wait_calls += 1;
        }
      }
    }
  };
  var windows = new PRDC_JSLAB_LIB_WINDOWS(jsl);
  windows.openWindow = function() {
    return 1;
  };
  windows.open_windows[1] = {
    ready: Promise.resolve(),
    context: {}
  };

  var out = await windows.openCanvas();
  assert.equal(out, false);
  assert.equal(wait_calls, 0);
}, { tags: ['unit', 'windows', 'async'] });

exports.MODULE_TESTS = tests;
