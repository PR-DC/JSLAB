/**
 * @file JSLAB networking UDP submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_UDP, PRDC_JSLAB_UDP_SERVER } = require('../networking-udp');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createMockUdpSocket(auto_connect_error = null) {
  var handlers = {};
  return {
    handlers: handlers,
    write_calls: [],
    bind_calls: [],
    connect_args: null,
    closed: false,

    on: function(name, handler) {
      handlers[name] = handler;
      return this;
    },
    connect: function(port, host, callback) {
      this.connect_args = [port, host];
      if(typeof callback === 'function') {
        callback(auto_connect_error);
      }
    },
    bind: function(port) {
      this.bind_calls.push(port);
    },
    write: function(data) {
      this.write_calls.push(data);
    },
    close: function(callback) {
      this.closed = true;
      if(typeof callback === 'function') {
        callback();
      }
    },
    emitMessage: function(data) {
      if(typeof handlers.message === 'function') {
        handlers.message(data);
      }
    }
  };
}

function createUdpClientHarness(connect_error = null) {
  var socket = createMockUdpSocket(connect_error);
  var jsl = {
    inter: {
      env: {
        udp: {
          createSocket: function() {
            return socket;
          }
        }
      }
    }
  };

  var client = new PRDC_JSLAB_UDP(jsl, '127.0.0.1', 9200);
  return { client, socket };
}

function createUdpServerHarness() {
  var cleanup_callbacks = [];
  var socket = createMockUdpSocket(null);
  var jsl = {
    inter: {
      format: {
        isFunction: function(value) {
          return typeof value === 'function';
        }
      },
      env: {
        udp: {
          createSocket: function() {
            return socket;
          }
        }
      }
    },
    addForCleanup: function(_target, callback) {
      cleanup_callbacks.push(callback);
    }
  };

  var server = new PRDC_JSLAB_UDP_SERVER(jsl, 9300);
  return { server, socket, cleanup_callbacks };
}

tests.add('UDP client toggles active state based on connect result', function(assert) {
  var ok_harness = createUdpClientHarness(null);
  assert.equal(ok_harness.client.active, true);
  assert.deepEqual(ok_harness.socket.connect_args, [9200, '127.0.0.1']);

  var err_harness = createUdpClientHarness(new Error('connect failed'));
  assert.equal(err_harness.client.active, false);
}, { tags: ['unit', 'networking', 'udp'] });

tests.add('UDP client writes only when active and deletes socket on close', function(assert) {
  var harness = createUdpClientHarness(null);

  harness.client.write('abc');
  assert.deepEqual(harness.socket.write_calls, ['abc']);

  harness.client.active = false;
  harness.client.write('ignored');
  assert.deepEqual(harness.socket.write_calls, ['abc']);

  harness.client.close();
  assert.equal(harness.client.active, false);
  assert.equal(typeof harness.client.com, 'undefined');
}, { tags: ['unit', 'networking', 'udp'] });

tests.add('UDP server buffers messages and supports callback mode', function(assert) {
  var harness = createUdpServerHarness();
  var server = harness.server;
  var socket = harness.socket;

  assert.deepEqual(socket.bind_calls, [9300]);

  socket.emitMessage(Buffer.from([1, 2, 3]));
  assert.equal(server.availableBytes(), 3);
  assert.deepEqual(server.read(2), [1, 2]);
  assert.deepEqual(server.read(), [3]);

  var callback_data = null;
  server.setOnData(function(data) {
    callback_data = Array.from(data);
  });
  socket.emitMessage(Buffer.from([9, 8]));
  assert.deepEqual(callback_data, [9, 8]);
  assert.equal(server.availableBytes(), 0);
}, { tags: ['unit', 'networking', 'udp'] });

tests.add('UDP server close releases socket and cleanup callback is registered', function(assert) {
  var harness = createUdpServerHarness();
  var server = harness.server;
  var socket = harness.socket;

  assert.equal(harness.cleanup_callbacks.length, 1);
  harness.cleanup_callbacks[0]();
  assert.equal(socket.closed, true);
  assert.equal(typeof server.com, 'undefined');
}, { tags: ['unit', 'networking', 'udp'] });

exports.MODULE_TESTS = tests;
