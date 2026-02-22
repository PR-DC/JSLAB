/**
 * @file JSLAB inter-instance file-open router
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

/**
 * Routes .jsl open requests to the last active JSLAB instance.
 */
class PRDC_JSLAB_INSTANCE_ROUTER {

  /**
   * @param {object} options - Router options.
   * @param {Function} [options.on_open_scripts] - Callback to open scripts in current instance.
   * @param {Function} [options.is_script_path] - Callback to validate script paths.
   * @param {string} [options.state_filename] - State filename stored in temp directory.
   * @param {string} [options.endpoint_prefix] - IPC endpoint name prefix.
   */
  constructor(options = {}) {
    this.on_open_scripts = typeof options.on_open_scripts === 'function'
      ? options.on_open_scripts
      : function() {};
    this.is_script_path = typeof options.is_script_path === 'function'
      ? options.is_script_path
      : function() { return true; };

    this.state_filename = options.state_filename || 'jslab-last-active-instance.json';
    this.endpoint_prefix = options.endpoint_prefix || 'jslab-open';

    this.last_active_instance_file = path.join(os.tmpdir(), this.state_filename);
    this.instance_endpoint = this._getInstanceEndpoint();
    this.open_request_server = undefined;
  }

  /**
   * Returns all startup .jsl script arguments.
   * @param {Array<string>} [argv=process.argv] - Argument list.
   * @returns {Array<string>} Startup script paths.
   */
  getStartupScriptPaths(argv = process.argv) {
    var obj = this;
    var scripts = [];
    argv.forEach(function(arg) {
      if(obj.is_script_path(arg)) {
        scripts.push(arg);
      }
    });
    return scripts;
  }

  /**
   * Attempts to forward startup scripts to the last active instance.
   * @param {Array<string>} script_paths - Paths to forward.
   * @returns {Promise<boolean>} True if forwarding succeeded.
   */
  async forwardScriptsToLastActive(script_paths) {
    var obj = this;
    if(!Array.isArray(script_paths)) {
      script_paths = [];
    }
    script_paths = script_paths.filter(function(script_path) {
      return obj.is_script_path(script_path);
    });
    if(script_paths.length === 0) {
      return false;
    }

    var state = this._readLastActiveInstance();
    if(!state || !state.endpoint || state.pid === process.pid) {
      return false;
    }

    return await new Promise(function(resolve) {
      var done = false;
      var socket;
      var finish = function(result) {
        if(done) return;
        done = true;
        if(socket && !socket.destroyed) {
          if(result) {
            socket.end();
          } else {
            socket.destroy();
          }
        }
        resolve(result);
      };

      try {
        socket = net.createConnection(state.endpoint, function() {
          var payload = {
            action: 'open-script',
            paths: script_paths
          };
          socket.write(JSON.stringify(payload) + '\n', function() {
            finish(true);
          });
        });
      } catch(err) {
        obj._clearLastActiveInstance(state.endpoint);
        finish(false);
        return;
      }

      socket.setTimeout(900, function() {
        obj._clearLastActiveInstance(state.endpoint);
        finish(false);
      });

      socket.on('error', function() {
        obj._clearLastActiveInstance(state.endpoint);
        finish(false);
      });
    });
  }

  /**
   * Starts local server for receiving file-open requests.
   */
  start() {
    var obj = this;
    if(this.open_request_server) {
      return;
    }

    this.open_request_server = net.createServer(function(socket) {
      var buffer = '';
      socket.setEncoding('utf8');
      socket.on('data', function(chunk) {
        buffer += chunk;
        var lines = buffer.split('\n');
        buffer = lines.pop();
        lines.forEach(function(line) {
          obj._handleOpenRequestMessage(line);
        });
      });
      socket.on('end', function() {
        if(buffer.trim().length) {
          obj._handleOpenRequestMessage(buffer);
        }
      });
      socket.on('error', function() {});
    });

    this.open_request_server.on('error', function() {});
    this.open_request_server.listen(this.instance_endpoint, function() {
      obj.markAsLastActive();
    });
  }

  /**
   * Stops local file-open request server and clears stale state.
   */
  stop() {
    if(this.open_request_server) {
      try {
        this.open_request_server.close();
      } catch(err) {}
      this.open_request_server = undefined;
    }

    if(os.platform() !== 'win32') {
      try {
        fs.unlinkSync(this.instance_endpoint);
      } catch(err) {}
    }

    this._clearLastActiveInstanceIfCurrent();
  }

  /**
   * Writes the current instance as the last active one.
   */
  markAsLastActive() {
    try {
      fs.writeFileSync(this.last_active_instance_file, JSON.stringify({
        pid: process.pid,
        endpoint: this.instance_endpoint,
        ts: Date.now()
      }));
    } catch(err) {}
  }

  /**
   * Tracks focus/show events so this instance becomes the last active one.
   * @param {BrowserWindow} win - Window to track.
   */
  trackWindowActivity(win) {
    var obj = this;
    if(!win) return;
    win.on('focus', function() {
      obj.markAsLastActive();
    });
    win.on('show', function() {
      obj.markAsLastActive();
    });
  }

  /**
   * Handles an incoming file-open message.
   * @param {string} message - JSON message.
   */
  _handleOpenRequestMessage(message) {
    var payload;
    try {
      payload = JSON.parse(message);
    } catch(err) {
      return;
    }
    if(!payload || payload.action !== 'open-script') {
      return;
    }
    var paths = payload.paths;
    if(!Array.isArray(paths)) {
      paths = [];
    }
    this.on_open_scripts(paths);
  }

  /**
   * Reads the last-active instance record.
   * @returns {(object|false)} Instance record or false.
   */
  _readLastActiveInstance() {
    if(!fs.existsSync(this.last_active_instance_file)) {
      return false;
    }
    try {
      return JSON.parse(fs.readFileSync(this.last_active_instance_file, 'utf8'));
    } catch(err) {
      return false;
    }
  }

  /**
   * Clears the last-active record if it targets the specified endpoint.
   * @param {string} endpoint - Endpoint to clear.
   */
  _clearLastActiveInstance(endpoint) {
    var state = this._readLastActiveInstance();
    if(state && state.endpoint === endpoint) {
      try {
        fs.unlinkSync(this.last_active_instance_file);
      } catch(err) {}
    }
  }

  /**
   * Clears the last-active record when it belongs to this process.
   */
  _clearLastActiveInstanceIfCurrent() {
    this._clearLastActiveInstance(this.instance_endpoint);
  }

  /**
   * Builds a unique local endpoint used for inter-instance forwarding.
   * @returns {string} Pipe/socket endpoint.
   */
  _getInstanceEndpoint() {
    var id = process.pid + '-' + Date.now() + '-' +
      Math.floor(Math.random() * 1000000);
    if(os.platform() === 'win32') {
      return '\\\\.\\pipe\\' + this.endpoint_prefix + '-' + id;
    }
    return path.join(os.tmpdir(), this.endpoint_prefix + '-' + id + '.sock');
  }
}

exports.PRDC_JSLAB_INSTANCE_ROUTER = PRDC_JSLAB_INSTANCE_ROUTER;
