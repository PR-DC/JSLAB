/**
 * @file JSLAB networking videocall submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_VIDEOCALL } = require('../networking-videocall');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createVideocallHarness() {
  var clear_timeout_calls = [];
  var disp_calls = [];

  var jsl = {
    inter: {
      clearTimeoutIf: function(value) {
        clear_timeout_calls.push(value);
        return undefined;
      },
      disp: function(message) {
        disp_calls.push(message);
      }
    }
  };

  var call = Object.create(PRDC_JSLAB_VIDEOCALL.prototype);
  call.jsl = jsl;
  call.incoming_buffer = '';
  call.is_initiator = false;
  call.connection_timeout = 42;

  return { call, clear_timeout_calls, disp_calls };
}

tests.add('_processIncomingData parses framed JSON messages across chunks', function(assert) {
  var harness = createVideocallHarness();
  var messages = [];
  harness.call._handleSignalingMessage = function(msg) {
    messages.push(msg);
  };

  harness.call._processIncomingData(Buffer.from('{"type":"message","data":"A"}\0{"type":"candidate","candidate":'));
  harness.call._processIncomingData(Buffer.from('7}\0'));

  assert.equal(messages.length, 2);
  assert.equal(messages[0].type, 'message');
  assert.equal(messages[0].data, 'A');
  assert.equal(messages[1].type, 'candidate');
  assert.equal(messages[1].candidate, 7);
  assert.equal(harness.call.incoming_buffer, '');
}, { tags: ['unit', 'networking', 'videocall'] });

tests.add('_sendSignalingMessage routes signaling payload to server/client transport', function(assert) {
  var harness = createVideocallHarness();
  var server_writes = [];
  var client_writes = [];

  harness.call.is_initiator = true;
  harness.call.server_socket = { sid: 1 };
  harness.call.tcp_server = {
    write: function(socket, payload) {
      server_writes.push([socket, payload]);
    }
  };
  harness.call._sendSignalingMessage({ type: 'ping' });
  assert.equal(server_writes.length, 1);
  assert.equal(server_writes[0][0].sid, 1);
  assert.ok(server_writes[0][1].endsWith('\0'));

  harness.call.is_initiator = false;
  harness.call.tcp_client = {
    write: function(payload) {
      client_writes.push(payload);
    }
  };
  harness.call._sendSignalingMessage({ type: 'pong' });
  assert.equal(client_writes.length, 1);
  assert.ok(client_writes[0].includes('"type":"pong"'));
}, { tags: ['unit', 'networking', 'videocall'] });

tests.add('_handleSignalingMessage executes expected signaling actions', async function(assert) {
  var harness = createVideocallHarness();
  var started = 0;
  var answered = 0;
  var remote_set = [];
  var candidates = [];
  var on_message = [];

  harness.call._startCall = async function() {
    started += 1;
  };
  harness.call._answerCall = async function() {
    answered += 1;
  };
  harness.call.peer_connection = {
    setRemoteDescription: async function(sdp) {
      remote_set.push(sdp);
    },
    addIceCandidate: function(candidate) {
      candidates.push(candidate);
    }
  };

  harness.call.is_initiator = true;
  await harness.call._handleSignalingMessage({ type: 'request-offer' });
  assert.equal(started, 1);

  harness.call.is_initiator = false;
  harness.call.connection_timeout = 77;
  await harness.call._handleSignalingMessage({ type: 'offer', sdp: { sdp: 'offer' } });
  assert.equal(answered, 1);
  assert.equal(remote_set.length, 1);
  assert.equal(harness.clear_timeout_calls.length > 0, true);

  harness.call.is_initiator = true;
  await harness.call._handleSignalingMessage({ type: 'answer', sdp: { sdp: 'answer' } });
  assert.equal(remote_set.length, 2);

  await harness.call._handleSignalingMessage({ type: 'candidate', candidate: { c: 1 } });
  assert.deepEqual(candidates, [{ c: 1 }]);

  harness.call._onMessage = function(data) {
    on_message.push(data);
  };
  await harness.call._handleSignalingMessage({ type: 'message', data: 'hello' });
  assert.deepEqual(on_message, ['hello']);

  delete harness.call._onMessage;
  await harness.call._handleSignalingMessage({ type: 'message', data: 'fallback' });
  assert.deepEqual(harness.disp_calls, ['fallback']);
}, { tags: ['unit', 'networking', 'videocall'] });

tests.add('toggleAudio/toggleVideo and endCall manage streams and transports', function(assert) {
  var harness = createVideocallHarness();
  var audio_track = { enabled: true, stop_calls: 0, stop: function() { this.stop_calls += 1; } };
  var video_track = { enabled: true, stop_calls: 0, stop: function() { this.stop_calls += 1; } };
  var peer_closed = 0;
  var server_closed = 0;
  var client_closed = 0;

  harness.call.local_stream = {
    getAudioTracks: function() { return [audio_track]; },
    getVideoTracks: function() { return [video_track]; },
    getTracks: function() { return [audio_track, video_track]; }
  };
  harness.call.remote_stream = {
    getTracks: function() {
      return [{ stop_calls: 0, stop: function() { this.stop_calls += 1; } }];
    }
  };
  harness.call.peer_connection = {
    close: function() {
      peer_closed += 1;
    }
  };
  harness.call.tcp_server = { close: function() { server_closed += 1; } };
  harness.call.tcp_client = { close: function() { client_closed += 1; } };

  harness.call.toggleAudio(true);
  assert.equal(audio_track.enabled, false);
  harness.call.toggleVideo(true);
  assert.equal(video_track.enabled, false);

  harness.call.is_initiator = false;
  harness.call.connection_timeout = 99;
  harness.call.endCall();
  assert.equal(peer_closed, 1);
  assert.equal(server_closed, 1);
  assert.equal(client_closed, 1);
  assert.ok(audio_track.stop_calls > 0);
  assert.ok(video_track.stop_calls > 0);
}, { tags: ['unit', 'networking', 'videocall'] });

exports.MODULE_TESTS = tests;
