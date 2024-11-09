/**
 * @file JSLAB library networking submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB networking submodule.
 */
class PRDC_JSLAB_LIB_NETWORKING {
  
  /**
   * Create submodule object.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;

    /**
     * XMODEM CRC table
     * @type {Array}
     */
    this.CRC_TABLE_XMODEM = [
      0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7, 
      0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 
      0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
      0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
      0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
      0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
      0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
      0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
      0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
      0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
      0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
      0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
      0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
      0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
      0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
      0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
      0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
      0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
      0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
      0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
      0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
      0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
      0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
      0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
      0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
      0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
      0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
      0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
      0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
      0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
      0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
      0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
    ];
  }
  
  /**
   * Calculates the CRC-16/XMODEM checksum of a byte array.
   * @param {Uint8Array} byte_array - The input data as a byte array.
   * @returns {number} The CRC-16/XMODEM checksum as a numeric value.
   */
  crc16xmodem(byte_array) {
    let crc = 0x0000;
    for(let i = 0; i < byte_array.length; i++) {
      crc = (crc << 8) ^ this.CRC_TABLE_XMODEM[((crc >> 8) ^ byte_array[i]) & 0xFF];
    }
    return crc & 0xFFFF;
  }

  /**
   * Retrieves the primary IPv4 address of the current machine.
   * @returns {string} The IP address if found, otherwise an empty string.
   */
  getIP() {
    return Object.values(this.jsl.env.os.networkInterfaces())
      .reduce(function(r, list) { return r.concat(
      list.reduce(function(rr, i) { return rr.concat(
      i.family === 'IPv4' && !i.internal && i.address || []); }, []));}, [])[0];    
  }

  /**
   * Attempts to establish a TCP connection to the specified host and port to check reachability.
   * @param {string} host - The IP address or hostname to ping.
   * @param {number} port - The port number to use for the connection.
   * @param {number} [timeout=1000] - The timeout in milliseconds before the attempt is considered failed.
   * @returns {Promise<boolean>} A promise that resolves to `true` if the connection is successful, `false` otherwise.
   */
  async pingAddressTCP(host, port, timeout = 1000) {
    var obj = this;
    return new Promise(function(resolve, reject) {
      const socket = obj.jsl.env.net.createConnection(port, host);
      socket.setTimeout(timeout);
      socket.on('connect', function() {
         socket.end();
         resolve(true);
      });
      socket.on('timeout', function() {
         socket.destroy();
         resolve(false);
      });
      socket.on('error', function() {
         socket.destroy();
         resolve(false);
      });
    });
  }

  /**
   * Executes a ping command to check if an IP address is reachable.
   * @param {string} host - The IP address or hostname to ping.
   * @param {number} timeout - The timeout in milliseconds for the ping command.
   */
  async pingAddress(host, timeout) {
    return new Promise((resolve) => {
      exec('ping -n 1 -w '+timeout+' '+host, function(error, stdout, stderr) {
        if(error || stderr) {
          resolve(false);
        } else {
          resolve(stdout.includes('Reply from'));
        }
      });
    });
  }

  /**
   * Executes a ping command synchronized to check if an IP address is reachable.
   * @param {string} host - The IP address or hostname to ping.
   * @param {number} timeout - The timeout in milliseconds for the ping command.
   */
  pingAddressSync(host, timeout) {
    try {
      var stdout = execSync('ping -n 1 -w '+timeout+' '+host);
      return stdout.includes('Reply from');
    } catch {
      return false;
    }
  }

  /**
   * Finds the first unused port within a specified range, checking sequentially from `port` to `max_port`.
   * @param {number} port - The starting port number to check.
   * @param {number} min_port - The minimum port number in the range.
   * @param {number} max_port - The maximum port number in the range.
   */
  async findFirstUnusedPort(port, min_port, max_port) {
    let currentPort = port;

    while(true) {
      const inUse = await this.jsl.env.tcpPortUsed.check(port);
      if(!inUse) {
        return currentPort;
      }

      currentPort++;
      if(currentPort > max_port) {
        currentPort = min_port;
      }
    }
  }

  /**
   * Converts an IPv4 address to its decimal equivalent.
   * @param {string} ip - The IPv4 address in dot-decimal notation.
   * @param {number} [subnets=4] - The number of subnets in the IP address, default is 4.
   * @returns {number} The decimal equivalent of the IPv4 address.
   */
  ip2dec(ip, subnets = 4) {
    const octets = ip.split('.').map(Number).reverse();
    let value = 0;
    for(let i = 0; i < subnets; i++) {
      value += octets[i]*Math.pow(256,i);
    }
    return value;
  }
  
  /**
   * Creates a TCP client for communication with a specified host and port.
   * @param {string} host - The hostname or IP address to connect to.
   * @param {number} port - The port number on the host to connect to.
   * @param {function} onConnectCallback - A callback function that is called when the connection is successfully established.
   * @returns {PRDC_JSLAB_TCP_CLIENT} An instance of the TCP client with event handlers set up.
   */
  tcp(host, port, onConnectCallback) {
    return new PRDC_JSLAB_TCP_CLIENT(this.jsl, host, port, onConnectCallback);
  }
   
  /**
   * Creates a UDP client for sending data to a specified host and port.
   * @param {string} host - The hostname or IP address to connect to.
   * @param {number} port - The port number to connect to.
   * @returns {PRDC_JSLAB_UDP} An instance of the UDP client.
   */
  udp(host, port) {
    return new PRDC_JSLAB_UDP(this.jsl, host, port);
  }
   
  /**
   * Creates a UDP server to listen on a specified port.
   * @param {number} port - The port number to listen on.
   * @returns {PRDC_JSLAB_UDP_SERVER} An instance of the UDP server.
   */
  udpServer(port) {
    return new PRDC_JSLAB_UDP_SERVER(this.jsl, port);
  }
}

exports.PRDC_JSLAB_LIB_NETWORKING = PRDC_JSLAB_LIB_NETWORKING;

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
    
    this.buffer = [];
    this.active = false;
    
    this.com = this.jsl.env.net.createConnection(port, host);
    this.com.setTimeout(0);
    this.com.on('connect', function() {
      obj.onConnect();
    });
    this.com.on('data', function(data) {
      obj.onData(data);
    });
    this.com.on('error', function(err) {
      obj.onError(err);
    });
    this.com.on('close', function(err) {
      if(err) {
        obj.onError(err);
      }
    });
    this.com.on('end', function() {
      obj.active = false;
    });
  }
  
  /**
   * Handles successful connection establishment by setting the client's active status to true.
   */
  onConnect() {
    this.active = true;
    if(this.jsl.format.isFunction(this.onConnectCallback)) {
      this.onConnectCallback();
    }
  }
  
  /**
   * Handles errors by setting the client's active status to false and possibly logging the error.
   * @param {Error} err - The error object that was thrown.
   */
  onError(err) {
    this.active = false;
  }
  
  /**
   * Handles incoming data by appending it to the buffer.
   * @param {Buffer} data - The incoming data buffer.
   */
  onData(data) {
    this.buffer.push(...data);
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

/**
 * Class representing a UDP client for handling network communications.
 */
class PRDC_JSLAB_UDP {
  
  /**
   * Creates an instance of the UDP client.
   * @param {Object} jsl Reference to the main JSLAB object.
   * @param {string} host - The host IP address or hostname to connect to.
   * @param {number} port - The port number to connect to.
   */
  constructor(jsl, host, port) {
    var obj = this;
    this.jsl = jsl;
    this.host = host;
    this.port = port;
    
    this.active = false;
    
    this.com = this.jsl.env.udp.createSocket('udp4');
    this.com.connect(port, host, function(err) {
      if(err) {
        obj.onError(err);
      } else {
        obj.onConnect();
      }
    });
  }

  /**
   * Handles successful connection establishment by setting the client's active status to true.
   */
  onConnect() {
    this.active = true;
  }
  
  /**
   * Handles errors by setting the client's active status to false and possibly logging the error.
   * @param {Error} err - The error object that was thrown.
   */
  onError(err) {
    this.active = false;
  }
  
  /**
   * Sends data over the UDP connection if the client is active.
   * @param {Buffer|string} data - The data to send over the UDP connection.
   */
  write(data) {
    if(this.active) {
      this.com.write(data);
    }
  }
  
  /**
   * Closes the UDP connection and cleans up resources.
   */
  close() {
    var obj = this;
    this.active = false;
    this.com.close(function() {
      delete obj.com;
    });
  }
}

/**
 * Represents a UDP server that listens on a specific port.
 */
class PRDC_JSLAB_UDP_SERVER {
  
  /**
   * Initializes a UDP server that binds to the specified port and listens for incoming messages.
   * @param {Object} jsl Reference to the main JSLAB object.
   * @param {number} port - The port number on which the server will listen for incoming UDP packets.
   */
  constructor(jsl, port) {
    var obj = this;
    this.jsl = jsl;
    this.port = port;
    
    this.buffer = [];
    
    this.com = this.jsl.env.udp.createSocket('udp4');
    
    this.com.on('message', function(msg, rinfo) {
      obj.onData(msg);
    });
    
    this.com.bind(port);
  }
  
  /**
   * Called when data is received. Buffers the incoming data for later retrieval.
   * @param {Buffer} data - The received data buffer.
   */
  onData(data) {
    this.buffer.push(...data);
  }
  
  /**
   * Reads a specified number of bytes from the buffer.
   * @param {number} [N=Infinity] - The maximum number of bytes to read. Reads all available bytes by default.
   * @returns {Array} An array containing the first N bytes of buffered data.
   */
  read(N = Infinity) {
    N = Math.min(N, this.buffer.length);
    return this.buffer.splice(0, n);
  }
  
  /**
   * Returns the number of bytes available in the buffer.
   * @returns {number} The number of bytes currently stored in the buffer.
   */
  availableBytes() {
    return this.buffer.length;
  }
  
  /**
   * Closes the UDP server and releases any resources.
   */
  close() {
    var obj = this;
    this.com.close(function() {
      delete obj.com;
    });
  }
}