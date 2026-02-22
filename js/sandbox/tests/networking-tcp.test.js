/**
 * @file JSLAB networking TCP submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TCP_CLIENT, PRDC_JSLAB_TCP_SERVER } = require('../networking-tcp');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createMockSocket() {
  var handlers = {};
  return {
    handlers: handlers,
    write_calls: [],
    set_timeout_calls: [],
    keep_alive_calls: [],
    no_delay_calls: [],
    destroyed: false,
    sid: undefined,

    on: function(name, handler) {
      handlers[name] = handler;
      return this;
    },
    emit: function(name, value) {
      if(typeof handlers[name] === 'function') {
        handlers[name](value);
      }
    },
    write: function(value) {
      this.write_calls.push(value);
    },
    setTimeout: function() {
      this.set_timeout_calls.push(Array.from(arguments));
    },
    setKeepAlive: function() {
      this.keep_alive_calls.push(Array.from(arguments));
    },
    setNoDelay: function() {
      this.no_delay_calls.push(Array.from(arguments));
    },
    destroy: function() {
      this.destroyed = true;
    }
  };
}

function createClientHarness() {
  var cleanup_callbacks = [];
  var socket = createMockSocket();

  var jsl = {
    inter: {
      format: {
        isFunction: function(value) {
          return typeof value === 'function';
        }
      },
      env: {
        net: {
          createConnection: function() {
            return socket;
          }
        }
      }
    },
    addForCleanup: function(_target, callback) {
      cleanup_callbacks.push(callback);
    }
  };

  var connect_events = 0;
  var client = new PRDC_JSLAB_TCP_CLIENT(jsl, '127.0.0.1', 9000, function() {
    connect_events += 1;
  });

  return { client, socket, cleanup_callbacks, connect_events_ref: function() { return connect_events; } };
}

function createServerHarness() {
  var cleanup_callbacks = [];
  var connection_handler = null;
  var server_object = {
    close_called: false,
    listen_args: null,
    listen: function(port, host, callback) {
      this.listen_args = [port, host];
      if(typeof callback === 'function') {
        callback();
      }
    },
    close: function() {
      this.close_called = true;
    }
  };

  var jsl = {
    inter: {
      format: {
        isFunction: function(value) {
          return typeof value === 'function';
        }
      },
      env: {
        net: {
          createServer: function(handler) {
            connection_handler = handler;
            return server_object;
          }
        }
      }
    },
    addForCleanup: function(_target, callback) {
      cleanup_callbacks.push(callback);
    }
  };

  var connected_sockets = [];
  var server = new PRDC_JSLAB_TCP_SERVER(jsl, '127.0.0.1', 9100, function(socket) {
    connected_sockets.push(socket);
  });

  return { server, connection_handler_ref: function() { return connection_handler; }, server_object, cleanup_callbacks, connected_sockets };
}

tests.add('TCP client buffers incoming data and supports callback mode', function(assert) {
  var harness = createClientHarness();
  var client = harness.client;
  var socket = harness.socket;

  assert.equal(socket.set_timeout_calls.length, 1);
  assert.equal(socket.set_timeout_calls[0][0], 0);

  socket.emit('connect');
  assert.equal(client.active, true);
  assert.equal(harness.connect_events_ref(), 1);

  socket.emit('data', Buffer.from([10, 20, 30]));
  assert.equal(client.availableBytes(), 3);
  assert.deepEqual(client.read(2), [10, 20]);
  assert.deepEqual(client.read(), [30]);

  var callback_data = null;
  client.setOnData(function(data) {
    callback_data = Array.from(data);
  });
  socket.emit('data', Buffer.from([1, 2]));
  assert.deepEqual(callback_data, [1, 2]);
  assert.equal(client.availableBytes(), 0);
}, { tags: ['unit', 'networking', 'tcp'] });

tests.add('TCP client delegates socket options, errors, writes and close', function(assert) {
  var harness = createClientHarness();
  var client = harness.client;
  var socket = harness.socket;

  var captured_error = null;
  client.setOnError(function(err) {
    captured_error = err;
  });

  socket.emit('connect');
  client.setKeepAlive(true, 1000);
  client.setNoDelay(true);
  client.setTimeout(250);
  client.write('hello');

  assert.equal(socket.keep_alive_calls.length, 1);
  assert.equal(socket.no_delay_calls.length, 1);
  assert.equal(socket.set_timeout_calls.length, 2);
  assert.deepEqual(socket.write_calls, ['hello']);

  var err = new Error('tcp error');
  socket.emit('error', err);
  assert.equal(client.active, false);
  assert.equal(captured_error, err);

  client.close();
  assert.equal(socket.destroyed, true);

  // cleanup callback should be wired to close as well
  assert.equal(harness.cleanup_callbacks.length, 1);
  harness.cleanup_callbacks[0]();
  assert.equal(socket.destroyed, true);
}, { tags: ['unit', 'networking', 'tcp'] });

tests.add('TCP server handles connection lifecycle and socket routing', function(assert) {
  var harness = createServerHarness();
  var server = harness.server;
  var connection_handler = harness.connection_handler_ref();
  var socket = createMockSocket();

  assert.ok(typeof connection_handler === 'function');
  assert.equal(server.active, true);
  assert.deepEqual(harness.server_object.listen_args, [9100, '127.0.0.1']);

  var seen_data = null;
  var seen_error = null;
  var seen_disconnect = null;
  server.setOnData(function(sock, data) {
    seen_data = { sid: sock.sid, data: Array.from(data) };
  });
  server.setOnError(function(sock, err) {
    seen_error = { sid: sock.sid, message: err.message };
  });
  server.setOnDisconnect(function(sock) {
    seen_disconnect = sock.sid;
  });

  connection_handler(socket);
  assert.equal(socket.sid, 1);
  assert.equal(harness.connected_sockets.length, 1);

  socket.emit('data', Buffer.from([7, 8]));
  socket.emit('error', new Error('server socket err'));
  socket.emit('end');

  assert.deepEqual(seen_data, { sid: 1, data: [7, 8] });
  assert.deepEqual(seen_error, { sid: 1, message: 'server socket err' });
  assert.equal(seen_disconnect, 1);

  server.write(socket, 'payload');
  assert.deepEqual(socket.write_calls, ['payload']);

  server.close();
  assert.equal(harness.server_object.close_called, true);
  assert.equal(socket.destroyed, true);
  assert.deepEqual(server.sockets, {});

  assert.equal(harness.cleanup_callbacks.length, 1);
}, { tags: ['unit', 'networking', 'tcp'] });

exports.MODULE_TESTS = tests;
