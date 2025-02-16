/**
 * @file JSLAB library networking video call submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
  
/**
 * Class representing a video call.
 */
class PRDC_JSLAB_VIDEOCALL {
  
  /**
   * Creates a new video call instance.
   * @param {string} type - The call type ('server' or 'client').
   * @param {string} video_source_type - The video source type ('webcam' or 'desktop').
   * @param {string} video_id - The video device or source ID.
   * @param {string} mic_id - The microphone device ID.
   * @param {string} tcp_host - The TCP host address.
   * @param {number} tcp_port - The TCP port number.
   * @param {object} opts - Additional configuration options.
   */
  constructor(jsl, type, video_source_type, video_id, mic_id, tcp_host, tcp_port, opts) {
    var obj = this;
    this.jsl = jsl;
    this.type = type;
    this.video_source_type = video_source_type;
    this.video_id = video_id;
    this.mic_id = mic_id;
    this.host = tcp_host;
    this.port = tcp_port;
    this.opts = opts || {};
    this.timeout = this.opts.timeout || 15000;
    
    this.is_initiator = (this.type == 'server');
    this.peer_connection;
    this.local_stream;
    this.remote_stream;
    this.incoming_buffer = '';
    
    this.jsl.addForCleanup(this, function() {
      obj.endCall();
    });
    
    this._init();
  }

  /**
   * Attempt to connect the client socket
   */
  _connectClient() {
    var obj = this;
    this.tcp_client = this.jsl.networking.tcp(this.host, this.port, function() {
      obj._setupClientHandlers();
    });
  }

  /**
   * Start a timeout waiting for signaling messages.
   */
  _startConnectionTimeout() {
    var obj = this;

    clearTimeoutIf(this.connection_timeout);
    this.connection_timeout = setTimeout(function() {
      obj._reconnectClient();
    }, this.timeout);
  }

  /**
   * Attempt to reconnect the client by closing the current connection and starting a new one.
   */
  _reconnectClient() {
    if(this.tcp_client) {
      try {
        this.tcp_client.close();
      } catch { }
    }
    this._connectClient();
  }
  
  /**
   * Initializes the video call by opening a window, setting up the UI, obtaining media, and creating the peer connection.
   */
  async _init() {
    var obj = this;
    
    this.win = await openWindowBlank();
    this.win.setTitle('Video call');
    this.win.document.body.innerHTML += '<video id="video"></video>';
    this.dom = this.win.document.getElementById('video');
    Object.assign(this.dom.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      background: 'url("../img/no-video.svg") center / 30% no-repeat',
    });
    await this._getLocalMedia();
    this._createPeerConnection();
    
    if(this.is_initiator) {
      this.tcp_server = this.jsl.networking.tcpServer(this.host, this.port, function(socket) {
        obj._setupServerSocketHandlers(socket);
      });
    } else {
      this._connectClient();
    }
  }
  
  /**
   * Sets up handlers for the server-side socket once a client connects.
   * @param {Object} socket - The connected socket.
   */
  _setupServerSocketHandlers(socket) {
    var obj = this;
    this.server_socket = socket;
    this.tcp_server.setOnData(function(socket, data) {
      if(socket.sid == obj.server_socket.sid) {
        obj._processIncomingData(data);
      }
    });
  }

  /**
   * Set up handlers for the client side once connected to server.
   */
  _setupClientHandlers() {
    var obj = this;
    this.tcp_client.setOnData(function(data) {
      obj._processIncomingData(data);
    });

    this._sendSignalingMessage({ type: 'request-offer' });
    this._startConnectionTimeout();
  }

  /**
   * Processes incoming data over TCP.
   * @param {string} data - The incoming data as a string.
   */
  _processIncomingData(data) {
    this.incoming_buffer += data.toString('utf8');
    let lines = this.incoming_buffer.split('\0');
    while(lines.length > 1) {
      let line = lines.shift().trim();
      if(line) {
        try {
          let msg = JSON.parse(line);
          this._handleSignalingMessage(msg);
        } catch { }
      }
    }
    
    this.incoming_buffer = lines[0];
  }

  /**
   * Sends a signaling message as JSON via TCP.
   * @param {Object} msg - The signaling message to send.
   */
  _sendSignalingMessage(msg) {
    const json_str = JSON.stringify(msg) + '\0';
    if(this.is_initiator) {
      if(this.server_socket) {
        this.tcp_server.write(this.server_socket, json_str);
      }
    } else {
      this.tcp_client.write(json_str);
    }
  }

  /**
   * Creates the PeerConnection and sets up handlers.
   */
  _createPeerConnection() {
    var obj = this;
    this.peer_connection = new RTCPeerConnection({});

    if(this.local_stream) {
      this.local_stream.getTracks().forEach(function(track) {
        obj.peer_connection.addTrack(track, obj.local_stream);
      });
    }

    this.peer_connection.ontrack = function(e) {
      obj.dom.srcObject = e.streams[0]; 
      obj.dom.play();
    };
    
    this.peer_connection.onicecandidate = function(e) {
      if(e.candidate) {
        obj._sendSignalingMessage({ type: 'candidate', candidate: e.candidate});
      }
    };
  }

  /**
   * Obtains the local media stream (video/audio) based on the provided options.
   */
  async _getLocalMedia() {
    var video_opts = this.opts.video || {};
    var mic_opts = this.opts.mic || {};
    
    var constraints = {};
    
    if(!this.video_source_type || !this.video_id) {
      constraints.video = false;
    } else if(this.video_source_type === 'webcam') {
      constraints.video = { 
        deviceId: { exact: this.video_id },
        ...video_opts
      };
    } else if(this.video_source_type === 'desktop') {
      constraints.video = {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: this.video_id,
          ...video_opts
        }
      };
    }
   
    if(!this.mic_id) {
      constraints.audio = false;
    } else {
      constraints.audio = {
        deviceId: { exact: this.mic_id },
        ...mic_opts
      };
    }
    
    try {
      if(constraints.audio || constraints.video) {
        this.local_stream = await this.jsl.env.navigator.mediaDevices.getUserMedia(constraints);
      } else {
        this.local_stream = new MediaStream();
      }
    } catch {
      this.jsl.env.error('@videocall: '+language.string(222));
    }
  }

  /**
   * Starts the call by creating and sending an offer if the instance is the initiator.
   */
  async _startCall() {
    if(!this.is_initiator) return;
    const offer = await this.peer_connection.createOffer({offerToReceiveVideo: true, offerToReceiveAudio: true});
    await this.peer_connection.setLocalDescription(offer);
    this._sendSignalingMessage({ type: 'offer', sdp: this.peer_connection.localDescription });
  }

  /**
   * Answers an incoming offer by creating and sending an answer if the instance is not the initiator.
   */
  async _answerCall() {
    const answer = await this.peer_connection.createAnswer();
    await this.peer_connection.setLocalDescription(answer);
    this._sendSignalingMessage({ type: 'answer', sdp: this.peer_connection.localDescription });
  }

  /**
   * Handles incoming signaling messages based on their type.
   * @param {Object} message - The signaling message received.
   */
  async _handleSignalingMessage(message) {
    if(!this.is_initiator) {
      this.connection_timeout = clearTimeoutIf(this.connection_timeout);
    }
    
    switch(message.type) {
      case 'request-offer':
        if(this.is_initiator) {
          await this._startCall();
        }
        break;
      case 'offer':
        if(!this.is_initiator) {
          await this.peer_connection.setRemoteDescription(message.sdp);
          await this._answerCall();
        }
        break;
      case 'answer':
        if(this.is_initiator) {
          await this.peer_connection.setRemoteDescription(message.sdp);
        }
        break;
      case 'candidate':
        this.peer_connection.addIceCandidate(message.candidate);
        break;
      case 'message':
        if(typeof this._onMessage == 'function') {
          this._onMessage(message.data);
        } else {
          disp(message.data);
        }
        break;
    }
  }
  
  /**
   * Sets a callback function to handle incoming messages.
   * @param {Function} callback - The function to call when a message is received.
   */
  setOnMessage(callback) {
    if(typeof callback == 'function') {
      this._onMessage = callback;
    }
  }
  
  /**
   * Sends a message to the connected peer.
   * @param {any} data - The data to send.
   */
  sendMessage(data) {
    this._sendSignalingMessage({ type: 'message', data: data });
  }
  
  /**
   * Toggles the local audio track on or off.
   * @param {boolean} mute - If true, mutes the audio; otherwise, unmutes.
   */
  toggleAudio(mute) {
    if(this.local_stream) {
      this.local_stream.getAudioTracks().forEach((track) => track.enabled = !mute);
    }
  }

  /**
   * Toggles the local video track on or off.
   * @param {boolean} disable - If true, disables the video; otherwise, enables it.
   */
  toggleVideo(disable) {
    if(this.local_stream) {
      this.local_stream.getVideoTracks().forEach((track) => track.enabled = !disable);
    }
  }

  /**
   * Ends the call by closing peer connections and media streams.
   */
  endCall() {
    if(!this.is_initiator) {
      this.connection_timeout = clearTimeoutIf(this.connection_timeout);
    }
    
    if(this.peer_connection) {
      this.peer_connection.close();
    }
    if(this.local_stream) {
      this.local_stream.getTracks().forEach((track) => track.stop());
    }
    if(this.remote_stream) {
      this.remote_stream.getTracks().forEach((track) => track.stop());
    }

    if(this.tcp_server) {
      this.tcp_server.close();
    }
    if(this.tcp_client) {
      this.tcp_client.close();
    }
  }
}

exports.PRDC_JSLAB_VIDEOCALL = PRDC_JSLAB_VIDEOCALL;