/**
 * @file JSLAB serial device submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for serial device test fixtures.
 */
class PRDC_JSLAB_SANDBOX_TESTS_SERIAL_DEVICE_TEST_HELPER {

  /**
   * Creates serial harness.
   */
  static createSerialHarness() {
    MockSerialPort.instances = [];
    var cleanup_callbacks = [];

    var jsl = {
      debug: false,
      inter: {
        env: {
          SerialPort: MockSerialPort
        }
      },
      addForCleanup: function(_target, callback) {
        cleanup_callbacks.push(callback);
      }
    };

    var serial = new PRDC_JSLAB_LIB_SERIAL_DEVICE(jsl);
    return { serial, cleanup_callbacks };
  }
}


const { PRDC_JSLAB_LIB_SERIAL_DEVICE } = require('../serial-device');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();

/**
 * Class for mock serial port.
 */
class MockSerialPort {
  /**
   * Lists.
   */
  static async list() {
    return MockSerialPort._list_result;
  }

  /**
   * Initializes mock serial port.
   * @param {Object} options Options.
   */
  constructor(options) {
    this.options = options;
    this.handlers = {};
    this.isOpen = true;
    this.set_calls = [];
    this.closed = false;
    MockSerialPort.instances.push(this);
  }

  /**
   * Handles the incoming event.
   * @param {string} name Name.
   * @param {Function} handler Handler.
   */
  on(name, handler) {
    this.handlers[name] = handler;
  }

  /**
   * Updates the current value.
   * @param {Object} options Options.
   */
  set(options) {
    this.set_calls.push(options);
  }

  /**
   * Closes.
   */
  close() {
    this.closed = true;
    this.isOpen = false;
  }
}

MockSerialPort.instances = [];
MockSerialPort._list_result = [];


tests.add('listSerialPorts proxies SerialPort.list()', async function(assert) {
  MockSerialPort._list_result = [{ path: 'COM1' }, { path: 'COM2' }];
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SERIAL_DEVICE_TEST_HELPER.createSerialHarness();
  var ports = await harness.serial.listSerialPorts();
  assert.deepEqual(ports, [{ path: 'COM1' }, { path: 'COM2' }]);
}, { tags: ['unit', 'serial'] });

tests.add('USB device checks match vendor/product pairs', async function(assert) {
  MockSerialPort._list_result = [
    { path: 'COM3', vendorId: '0483', productId: '5740' },
    { path: 'COM4', vendorId: '1A86', productId: '7523' }
  ];
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SERIAL_DEVICE_TEST_HELPER.createSerialHarness();

  assert.equal(await harness.serial.checkDeviceUSB('0483', '5740'), true);
  assert.equal(await harness.serial.checkDeviceUSB('0483', '0000'), false);
  assert.equal(await harness.serial.checkDeviceSTM(), true);
  assert.equal(await harness.serial.checkDeviceCH340(), true);
}, { tags: ['unit', 'serial'] });

tests.add('connectSerialPorts opens port with merged options and cleanup closes it', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_SERIAL_DEVICE_TEST_HELPER.createSerialHarness();
  var port = harness.serial.connectSerialPorts('COM8', 115200, { parity: 'odd', flowControl: true });

  assert.equal(port.options.path, 'COM8');
  assert.equal(port.options.baudRate, 115200);
  assert.equal(port.options.dataBits, 8);
  assert.equal(port.options.parity, 'odd');
  assert.equal(port.options.stopBits, 1);
  assert.equal(port.options.flowControl, true);

  // Simulate open event to verify DTR/RTS setup.
  port.handlers.open();
  assert.deepEqual(port.set_calls[0], { dtr: true, rts: false });

  assert.equal(harness.cleanup_callbacks.length, 1);
  harness.cleanup_callbacks[0]();
  assert.equal(port.closed, true);
}, { tags: ['unit', 'serial'] });

exports.MODULE_TESTS = tests;
