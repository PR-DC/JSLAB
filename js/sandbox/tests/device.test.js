/**
 * @file JSLAB device submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_DEVICE } = require('../device');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createDeviceHarness() {
  var listeners = {};
  var removed = [];
  var cleanup_callbacks = [];
  var warnings = [];
  var displays = [];
  var errors = [];
  var exec_result = { state: 'success', data: '' };
  var gamepads = [];

  var jsl = {
    debug: false,
    inter: {
      isNull: function(value) {
        return value === null || typeof value === 'undefined';
      },
      env: {
        execSync: function() {
          return exec_result;
        },
        warn: function(message) {
          warnings.push(message);
        },
        disp: function(message) {
          displays.push(message);
        },
        error: function(message) {
          errors.push(message);
        },
        navigator: {
          getGamepads: function() {
            return gamepads;
          }
        },
        context: {
          addEventListener: function(name, handler) {
            listeners[name] = handler;
          },
          removeEventListener: function(name, handler) {
            removed.push([name, handler]);
          }
        }
      },
      format: {
        replaceEditorLinks: function(text) {
          return 'REPLACED:' + text;
        }
      },
      lang: {
        string: function(id) {
          return 'LANG_' + id;
        },
        currentString: function(id) {
          return 'LANG_' + id;
        }
      },
      windows: {
        openCanvas: async function() {
          return false;
        }
      }
    },
    addForCleanup: function(_target, callback) {
      cleanup_callbacks.push(callback);
    }
  };

  var device = new PRDC_JSLAB_LIB_DEVICE(jsl);
  return {
    device,
    listeners,
    removed,
    cleanup_callbacks,
    warnings,
    displays,
    errors,
    setExecResult: function(next_result) {
      exec_result = next_result;
    },
    setGamepads: function(next_gamepads) {
      gamepads = next_gamepads;
    }
  };
}

tests.add('checkDriver parses driverquery output for single and multi-driver checks', function(assert) {
  var harness = createDeviceHarness();
  harness.setExecResult({
    state: 'success',
    data: 'FTDIBUS   1\nFTSER2K   1\nSILABSER  1\n'
  });

  assert.equal(harness.device.checkDriver('FTDIBUS'), true);
  assert.equal(harness.device.checkDriver(['FTDIBUS', 'FTSER2K']), true);
  assert.equal(harness.device.checkDriver('MISSING_DRIVER'), false);
  assert.equal(harness.device.checkDriverFTDI(), true);
  assert.equal(harness.device.checkDriverCP210x(), true);
  assert.equal(harness.device.checkDriverCH340(), false);
}, { tags: ['unit', 'device'] });

tests.add('checkDriver returns false when command execution fails', function(assert) {
  var harness = createDeviceHarness();
  harness.setExecResult({ state: 'error', data: 'driverquery failed' });
  assert.equal(harness.device.checkDriver('FTDIBUS'), false);
}, { tags: ['unit', 'device'] });

tests.add('parseArduinoOutput returns parsed payload and reports compiler errors', function(assert) {
  var harness = createDeviceHarness();
  var ok = harness.device.parseArduinoOutput({
    stdout: JSON.stringify({ success: true, message: 'ok' })
  });
  assert.deepEqual(ok, { success: true, message: 'ok' });

  var fail = harness.device.parseArduinoOutput({
    stdout: JSON.stringify({ success: false, compiler_err: 'line 1 error' })
  });
  assert.equal(fail.success, false);
  assert.ok(harness.warnings.length > 0);
  assert.ok(harness.displays.some(function(message) {
    return String(message).includes('REPLACED:line 1 error');
  }));
}, { tags: ['unit', 'device'] });

tests.add('getGamepads filters null entries and serializes gamepads', function(assert) {
  var harness = createDeviceHarness();
  harness.setGamepads([
    null,
    {
      toJSON: function() {
        return { id: 'A' };
      }
    },
    {
      toJSON: function() {
        return { id: 'B' };
      }
    }
  ]);

  assert.deepEqual(harness.device.getGamepads(), [{ id: 'A' }, { id: 'B' }]);
}, { tags: ['unit', 'device'] });

tests.add('gamepad connect/disconnect listeners are wired and cleaned up', function(assert) {
  var harness = createDeviceHarness();
  var seen_connected = null;
  var seen_disconnected = null;

  harness.device.onGamepadConnected(function(event) {
    seen_connected = event;
  });
  harness.device.onGamepadDisconnected(function(event) {
    seen_disconnected = event;
  });

  assert.equal(typeof harness.listeners.gamepadconnected, 'function');
  assert.equal(typeof harness.listeners.gamepaddisconnected, 'function');
  assert.equal(harness.cleanup_callbacks.length, 2);

  harness.listeners.gamepadconnected({
    gamepad: [
      {
        toJSON: function() {
          return { id: 'g1' };
        }
      }
    ]
  });
  harness.listeners.gamepaddisconnected({
    gamepad: [
      {
        toJSON: function() {
          return { id: 'g2' };
        }
      }
    ]
  });

  assert.deepEqual(seen_connected.gamepad, [{ id: 'g1' }]);
  assert.deepEqual(seen_disconnected.gamepad, [{ id: 'g2' }]);

  harness.cleanup_callbacks[0]();
  harness.cleanup_callbacks[1]();
  assert.equal(harness.removed.length, 2);
}, { tags: ['unit', 'device'] });

tests.add('showAudioWaveform returns false when canvas window init is interrupted', async function(assert) {
  var harness = createDeviceHarness();
  var out = await harness.device.showAudioWaveform('mic-id');
  assert.equal(out, false);
}, { tags: ['unit', 'device', 'async'] });

exports.MODULE_TESTS = tests;
