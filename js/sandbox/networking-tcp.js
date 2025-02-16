/**
 * @file JSLAB library networking TCP submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class representing a TCP client for handling network communications.
 */
class PRDC_JSLAB_TCP_CLIENT {
  
  /**
   * Creates an instance of the TCP client.
   * @param {Object} jsl Reference to the main JSLAB object.
   * @param {string} host - The host IP address or hostname to connect to.
   * @param {number} port - The port number to connect to.
   * @param {function} onConnectCallback - A callback to execute upon successful connection.
   */
  constructor(jsl, host, port, onConnectCallback) {
    var obj = this;
    this.jsl = jsl;
    this.host = host;
    this.port = port;
    this.onConnectCallback = onConnectCallback;
    this.onDataCallback;
    this.onErrorCallback;
    
    this.buffer = [];
    this.active = false;
    
    this._data_callback = false;
    
    this.com = this.jsl.env.net.createConnection(port, host);
    this.com.setTimeout(0);
    this.com.on('connect', function() {
      obj._onConnect();
    });
    this.com.on('data', function(data) {
      obj._onData(data);
    });
    this.com.on('error', function(err) {
      obj._onError(err);
    });
    this.com.on('close', function(err) {
      if(err) {
        obj._onError(err);
      }
    });
    this.com.on('end', function() {
      obj.active = false;
    });
    
    this.jsl.addForCleanup(this, function() {
      obj.close();
    });
  }
  
  /**
   * Handles successful connection establishment by setting the client's active status to true.
   */
  _onConnect() {
    this.active = true;
    if(this.jsl.format.isFunction(this.onConnectCallback)) {
      this.onConnectCallback();
    }
  }
  
  /**
   * Handles errors by setting the client's active status to false and possibly logging the error.
   * @param {Error} err - The error object that was thrown.
   */
  _onError(err) {
    this.active = false;
    if(this.jsl.format.isFunction(this.onErrorCallback)) {
      this.onErrorCallback(err);
    }
  }
  
  /**
   * Handles incoming data by appending it to the buffer.
   * @param {Buffer} data - The incoming data buffer.
   */
  _onData(data) {
    if(this._data_callback) {
      this.onDataCallback(data);
    } else {
      this.buffer.push(...data);
    }
  }
  
  /**
   * Sets the callback function to handle incoming data events.
   * @param {Function} callback - The function to be called when data is received.
   */
  setOnData(callback) {
    if(this.jsl.format.isFunction(callback)) {
      this.buffer = [];
      this.onDataCallback = callback;
      this._data_callback = true;
    }
  }
  
  /**
   * Sets the callback function to handle error events.
   * @param {Function} callback - The function to be called when an error occurs.
   */
  setOnError(callback) {
    if(this.jsl.format.isFunction(callback)) {
      this.onErrorCallback = callback;
    }
  }

  /**
   * Enables or disables keep-alive functionality on the underlying socket.
   * @param {boolean} [enable=true] - Whether to enable keep-alive.
   * @param {number} [initialDelay=0] - Delay in milliseconds before the first keep-alive probe is sent.
   */
  setKeepAlive(...args) {
    this.com.setKeepAlive(...args);
  }

  /**
   * Disables the Nagle algorithm, allowing data to be sent immediately.
   * @param {boolean} [noDelay=true] - Whether to disable the Nagle algorithm.
   */
  setNoDelay(...args) {
    this.com.setNoDelay(...args);
  }

  /**
   * Sets the socket timeout for inactivity.
   * @param {number} timeout - Timeout in milliseconds.
   * @param {Function} [callback] - Optional callback triggered on timeout.
   */
  setTimeout(...args) {
    this.com.setTimeout(...args);
  }

  /**
   * Reads a specified number of bytes from the buffer.
   * @param {number} [N=Infinity] - The number of bytes to read. Reads all available bytes if not specified.
   * @returns {Buffer} The data read from the buffer.
   */
  read(N = Infinity) {
    N = Math.min(N, this.buffer.length);
    return this.buffer.splice(0, N);
  }
  
  /**
   * Writes data to the TCP connection if the client is active.
   * @param {Buffer|string} data - The data to send over the TCP connection.
   */
  write(data) {
    if(this.active) {
      this.com.write(data);
    }
  }
  
  /**
   * Returns the number of bytes available in the buffer.
   * @returns {number} The number of available bytes.
   */
  availableBytes() {
    return this.buffer.length;
  }
  
  /**
   * Closes the TCP connection and cleans up resources.
   */
  close() {
    this.active = false;
    if(this.com) {
      this.com.destroy();
    }
  }
}

exports.PRDC_JSLAB_TCP_CLIENT = PRDC_JSLAB_TCP_CLIENT;

/**
 * Class representing a TCP server for handling network communications.
 */
class PRDC_JSLAB_TCP_SERVER {
  
  /**
   * Creates an instance of the TCP server.
   * @param {Object} jsl - Reference to the main JSLAB object.
   * @param {string} host - The host IP address or hostname to connect to.
   * @param {number} port - The port number to connect to.
   * @param {Function} onConnectCallback - Callback executed upon successful connection.
   */
  constructor(jsl, host, port, onConnectCallback) {
    const obj = this;
    this.jsl = jsl;
    this.host = host;
    this.port = port;
    this.sockets = {};
    this.sid = 0;
    
    this.onConnectCallback = onConnectCallback;
    this.onDataCallback = null;
    this.onErrorCallback = null;
    this.onDisconnectCallback = null;
    
    this.buffer = [];
    this.active = false;
    
    this._data_callback = false;
    
    this.server = this.jsl.env.net.createServer(function(socket) {
      obj._onConnect(socket);
      
      socket.on('data', function(data) {
        obj._onData(socket, data);
      });

      socket.on('end', function() {
        obj._onDisconnect(socket);
      });

      socket.on('error', function(err) {
        obj._onError(socket, err);
      });
    });
    
    this.server.listen(this.port, this.host, function() { 
      obj.active = true;
    });

    this.jsl.addForCleanup(this, function() {
      obj.close();
    });
  }
  
  /**
   * Handles new client connections.
   * @param {Object} socket - The connected socket.
   */
  _onConnect(socket) {
    this.sid += 1;
    this.sockets[this.sid] = socket;
    socket.sid = this.sid;

    if(this.jsl.format.isFunction(this.onConnectCallback)) {
      this.onConnectCallback(socket);
    }
  }
  
  /**
   * Handles socket errors.
   * @param {Object} socket - The socket that encountered an error.
   * @param {Error} err - The error object.
   */
  _onError(socket, err) {
    if(this.jsl.format.isFunction(this.onErrorCallback)) {
      this.onErrorCallback(socket, err);
    }
  }
  
  /**
   * Handles incoming data from sockets.
   * @param {Object} socket - The socket that received data.
   * @param {Buffer|string} data - The received data.
   */
  _onData(socket, data) {
    if(this.jsl.format.isFunction(this.onDataCallback)) {
      this.onDataCallback(socket, data);
    }
  }
  
  /**
   * Handles socket disconnections.
   * @param {Object} socket - The socket that disconnected.
   */
  _onDisconnect(socket) {
    if(this.jsl.format.isFunction(this.onDisconnectCallback)) {
      this.onDisconnectCallback(socket);
    }
  }
  
  /**
   * Sets the callback function to handle incoming data events.
   * @param {Function} callback - Function called when data is received.
   */
  setOnData(callback) {
    if(this.jsl.format.isFunction(callback)) {
      this.onDataCallback = callback;
    }
  }
  
  /**
   * Sets the callback function to handle error events.
   * @param {Function} callback - Function called when an error occurs.
   */
  setOnError(callback) {
    if(this.jsl.format.isFunction(callback)) {
      this.onErrorCallback = callback;
    }
  }
  
  /**
   * Sets the callback function to handle disconnection events.
   * @param {Function} callback - Function called when a socket disconnects.
   */
  setOnDisconnect(callback) {
    if(this.jsl.format.isFunction(callback)) {
      this.onDisconnectCallback = callback;
    }
  }
  
  /**
   * Writes data to a specific TCP connection.
   * @param {Object} socket - The socket to write data to.
   * @param {Buffer|string} data - The data to send over the TCP connection.
   */
  write(socket, data) {
    if(this.active && this.sockets[socket.sid]) {
      this.sockets[socket.sid].write(data);
    }
  }
  
  /**
   * Closes the TCP server and all active connections.
   */
  close() {
    this.active = false;
    if(this.server) {
      this.server.close();
    }
    for(const sid in this.sockets) {
      this.sockets[sid].destroy();
    }
    this.sockets = {};
  }
}

exports.PRDC_JSLAB_TCP_SERVER = PRDC_JSLAB_TCP_SERVER;