/**
 * @file JSLAB library networking UDP submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_NETWORKING_ENDPOINT } = require('./networking-endpoint');

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

    this.com = this.jsl.inter.env.udp.createSocket('udp4');
    this.com.connect(port, host, function(err) {
      if(err) {
        obj._onError(err);
      } else {
        obj._onConnect();
      }
    });
  }

  /**
   * Handles successful connection establishment by setting the client's active status to true.
   */
  _onConnect() {
    this.active = true;
  }

  /**
   * Handles errors by setting the client's active status to false and possibly logging the error.
   * @param {Error} err - The error object that was thrown.
   */
  _onError(err) {
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

exports.PRDC_JSLAB_UDP = PRDC_JSLAB_UDP;

/**
 * Represents a UDP server that listens on a specific port.
 * @extends PRDC_JSLAB_NETWORKING_ENDPOINT
 */
class PRDC_JSLAB_UDP_SERVER extends PRDC_JSLAB_NETWORKING_ENDPOINT {

  /**
   * Initializes a UDP server that binds to the specified port and listens for incoming messages.
   * @param {Object} jsl Reference to the main JSLAB object.
   * @param {number} port - The port number on which the server will listen for incoming UDP packets.
   */
  constructor(jsl, port) {
    super(jsl);
    var obj = this;

    this.port = port;





    this.com = this.jsl.inter.env.udp.createSocket('udp4');

    this.com.on('message', function(msg) {
      obj._onData(msg);
    });

    this.com.bind(port);

    this.jsl.addForCleanup(this, function() {
      obj.close();
    });
  }

  

  

  /**
   * Reads a specified number of bytes from the buffer.
   * @param {number} [N=Infinity] - The maximum number of bytes to read. Reads all available bytes by default.
   * @returns {Array} An array containing the first N bytes of buffered data.
   */
  read(N = Infinity) {
    N = Math.min(N, this.buffer.length);
    return this.buffer.splice(0, N);
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

exports.PRDC_JSLAB_UDP_SERVER = PRDC_JSLAB_UDP_SERVER;
