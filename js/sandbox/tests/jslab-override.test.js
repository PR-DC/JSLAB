/**
 * @file JSLAB override submodule scheduling tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_OVERRIDE } = require('../jslab-override');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function removeElementByValue(arr, value) {
  var index = arr.indexOf(value);
  if(index >= 0) {
    arr.splice(index, 1);
  }
}

function createOverrideHarness() {
  var captured = {
    raf_callback: null,
    idle_callback: null,
    interval_clear_id: null,
    timeout_clear_id: null,
    immediate_clear_id: null,
    cancel_raf_id: null,
    cancel_idle_id: null
  };
  var stats_change_count = 0;

  var jsl = {
    started_animation_frames: [],
    started_idle_callbacks: [],
    started_intervals: [],
    started_timeouts: [],
    started_immediates: [],
    inter: {
      array: {
        removeElementByValue: removeElementByValue
      }
    },
    onStatsChange: function() {
      stats_change_count += 1;
    },
    _requestAnimationFrame: function(callback) {
      captured.raf_callback = callback;
      return 11;
    },
    _cancelAnimationFrame: function(request_id) {
      captured.cancel_raf_id = request_id;
    },
    requestIdleCallback: function(callback) {
      captured.idle_callback = callback;
      return 12;
    },
    _cancelIdleCallback: function(request_id) {
      captured.cancel_idle_id = request_id;
    },
    _setInterval: function() {
      return 13;
    },
    _clearInterval: function(request_id) {
      captured.interval_clear_id = request_id;
    },
    _setTimeout: function(callback) {
      captured.timeout_callback = callback;
      return 14;
    },
    _clearTimeout: function(request_id) {
      captured.timeout_clear_id = request_id;
    },
    _setImmediate: function(callback) {
      captured.immediate_callback = callback;
      return 15;
    },
    _clearImmediate: function(request_id) {
      captured.immediate_clear_id = request_id;
    }
  };

  var override = Object.create(PRDC_JSLAB_OVERRIDE.prototype);
  override.jsl = jsl;

  return {
    override,
    jsl,
    captured,
    stats_change_count_ref: function() { return stats_change_count; }
  };
}

tests.add('requestAnimationFrame registers, executes and clears request id', function(assert) {
  var harness = createOverrideHarness();
  var called = false;
  var request_id = harness.override.requestAnimationFrame(function() {
    called = true;
  });

  assert.equal(request_id, 11);
  assert.deepEqual(harness.jsl.started_animation_frames, [11]);
  harness.captured.raf_callback();
  assert.equal(called, true);
  assert.deepEqual(harness.jsl.started_animation_frames, []);
}, { tags: ['unit', 'override'] });

tests.add('cancelAnimationFrame delegates cancellation and removes tracking', function(assert) {
  var harness = createOverrideHarness();
  harness.jsl.started_animation_frames = [11, 99];
  harness.override.cancelAnimationFrame(11);

  assert.equal(harness.captured.cancel_raf_id, 11);
  assert.deepEqual(harness.jsl.started_animation_frames, [99]);
}, { tags: ['unit', 'override'] });

tests.add('requestIdleCallback and cancelIdleCallback manage idle queue', function(assert) {
  var harness = createOverrideHarness();
  var seen = null;
  var request_id = harness.override.requestIdleCallback(function(options) {
    seen = options;
  }, { timeout: 5 });

  assert.equal(request_id, 12);
  assert.deepEqual(harness.jsl.started_idle_callbacks, [12]);
  harness.captured.idle_callback();
  assert.deepEqual(seen, { timeout: 5 });
  assert.deepEqual(harness.jsl.started_idle_callbacks, []);

  harness.jsl.started_idle_callbacks = [12];
  harness.override.cancelIdleCallback(12);
  assert.equal(harness.captured.cancel_idle_id, 12);
  assert.deepEqual(harness.jsl.started_idle_callbacks, []);
}, { tags: ['unit', 'override'] });

tests.add('setInterval and clearInterval track interval ids', function(assert) {
  var harness = createOverrideHarness();
  var request_id = harness.override.setInterval(function() {}, 100);
  assert.equal(request_id, 13);
  assert.deepEqual(harness.jsl.started_intervals, [13]);

  harness.override.clearInterval(13);
  assert.equal(harness.captured.interval_clear_id, 13);
  assert.deepEqual(harness.jsl.started_intervals, []);
}, { tags: ['unit', 'override'] });

tests.add('setTimeout executes callback with args and clears tracking', function(assert) {
  var harness = createOverrideHarness();
  var observed = null;
  var request_id = harness.override.setTimeout(function(a, b) {
    observed = [a, b];
  }, 10, 'x', 'y');

  assert.equal(request_id, 14);
  assert.deepEqual(harness.jsl.started_timeouts, [14]);
  harness.captured.timeout_callback();
  assert.deepEqual(observed, ['x', 'y']);
  assert.deepEqual(harness.jsl.started_timeouts, []);

  harness.jsl.started_timeouts = [14];
  harness.override.clearTimeout(14);
  assert.equal(harness.captured.timeout_clear_id, 14);
  assert.deepEqual(harness.jsl.started_timeouts, []);
}, { tags: ['unit', 'override'] });

tests.add('setImmediate executes callback and clearImmediate removes tracking', function(assert) {
  var harness = createOverrideHarness();
  var calls = 0;
  var request_id = harness.override.setImmediate(function() {
    calls += 1;
  });

  assert.equal(request_id, 15);
  assert.deepEqual(harness.jsl.started_immediates, [15]);
  harness.captured.immediate_callback();
  assert.equal(calls, 1);
  assert.deepEqual(harness.jsl.started_immediates, []);

  harness.jsl.started_immediates = [15];
  harness.override.clearImmediate(15);
  assert.equal(harness.captured.immediate_clear_id, 15);
  assert.deepEqual(harness.jsl.started_immediates, []);
  assert.ok(harness.stats_change_count_ref() > 0);
}, { tags: ['unit', 'override'] });

exports.MODULE_TESTS = tests;
