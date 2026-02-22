/**
 * @file JSLAB device gamepad submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_DEVICE_GAMEPAD } = require('../device-gamepad');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createGamepadHarness() {
  var listeners = {};
  var removed_listeners = [];
  var cleanup_callbacks = [];
  var clear_interval_args = [];
  var gamepads = [];

  var jsl = {
    context: {
      addEventListener: function(name, handler) {
        listeners[name] = handler;
      },
      removeEventListener: function(name, handler) {
        removed_listeners.push([name, handler]);
      }
    },
    inter: {
      env: {
        navigator: {
          getGamepads: function() {
            return gamepads;
          }
        }
      },
      format: {
        isFunction: function(value) {
          return typeof value === 'function';
        }
      },
      clearIntervalIf: function(interval_id) {
        clear_interval_args.push(interval_id);
        return undefined;
      }
    },
    addForCleanup: function(_target, callback) {
      cleanup_callbacks.push(callback);
    }
  };

  var gamepad = new PRDC_JSLAB_DEVICE_GAMEPAD(jsl, 'pad-1', 10);
  return {
    gamepad,
    listeners,
    removed_listeners,
    cleanup_callbacks,
    clear_interval_args,
    setGamepads: function(next_gamepads) {
      gamepads = next_gamepads;
    }
  };
}

tests.add('getGamepad finds matching id and returns serialized object', function(assert) {
  var harness = createGamepadHarness();
  harness.setGamepads([
    null,
    {
      id: 'pad-1',
      toJSON: function() {
        return { id: 'pad-1', connected: true };
      }
    }
  ]);

  assert.deepEqual(harness.gamepad._getGamepad(), { id: 'pad-1', connected: true });
  harness.setGamepads([]);
  assert.equal(harness.gamepad._getGamepad(), false);
}, { tags: ['unit', 'device', 'gamepad'] });

tests.add('data/connect/disconnect callbacks are invoked when configured', function(assert) {
  var harness = createGamepadHarness();
  var connected = 0;
  var disconnected = 0;
  var last_data = null;

  harness.gamepad.setOnConnect(function() { connected += 1; });
  harness.gamepad.setOnDisconnect(function() { disconnected += 1; });
  harness.gamepad.setOnData(function(data) { last_data = data; });

  harness.gamepad._onConnect();
  assert.equal(harness.gamepad.active, true);
  assert.equal(connected, 1);

  harness.gamepad._onData({ axes: [0, 1] });
  assert.deepEqual(last_data, { axes: [0, 1] });
  assert.deepEqual(harness.gamepad.data, { axes: [0, 1] });

  harness.gamepad._onDisconnect();
  assert.equal(harness.gamepad.active, false);
  assert.equal(disconnected, 1);
}, { tags: ['unit', 'device', 'gamepad'] });

tests.add('close removes listener and cleanup callback is registered', function(assert) {
  var harness = createGamepadHarness();
  assert.equal(typeof harness.listeners.gamepadconnected, 'function');
  assert.equal(harness.cleanup_callbacks.length, 1);

  harness.gamepad.close();
  assert.equal(harness.gamepad.active, false);
  assert.equal(harness.removed_listeners.length, 1);
  assert.equal(harness.removed_listeners[0][0], 'gamepadconnected');
}, { tags: ['unit', 'device', 'gamepad'] });

exports.MODULE_TESTS = tests;
