/**
 * @file JSLAB MCP desktop bridge client
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

/**
 * Discovers and connects to explicitly shared desktop sessions.
 */
class PRDC_JSLAB_BRIDGE_CLIENT {

  /**
   * @param {Object} [options={}] Session selection options.
   * @param {string} [options.session_file] Explicit descriptor path.
   * @param {number} [options.pid] Desktop process ID.
   */
  constructor(options = {}) {
    this.session_file = options.session_file;
    this.pid = options.pid;
  }

  /**
   * Reads and validates a session descriptor without exposing its token.
   * @param {string} filename Descriptor path.
   * @returns {Object} Descriptor.
   */
  readSession(filename) {
    var state = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if(state.version !== 1 || !Number.isInteger(state.pid) || state.pid <= 0 ||
        !Number.isInteger(state.port) || state.port < 1 || state.port > 65535 ||
        typeof state.token !== 'string' || !/^[a-f0-9]{64}$/.test(state.token)) {
      throw new Error('Invalid JSLAB session descriptor.');
    }
    return state;
  }

  /**
   * Sends a bounded authenticated request to a local session.
   * @param {Object} state Session descriptor.
   * @param {string} method Operation name.
   * @param {Object} args Operation arguments.
   * @returns {Promise<Object>} Operation response.
   */
  request(state, method, args = {}) {
    return new Promise(function(resolve, reject) {
      var body = JSON.stringify({ method: method, args: args });
      var req = http.request({ hostname: '127.0.0.1', port: state.port,
        method: 'POST', path: '/request', headers: {
          Authorization: 'Bearer ' + state.token,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        } }, function(res) {
        var chunks = [];
        var size = 0;
        res.on('data', function(chunk) {
          size += chunk.length;
          if(size > 2 * 1024 * 1024) {
            res.destroy(new Error('Automation response exceeded 2 MiB.'));
          } else {
            chunks.push(chunk);
          }
        });
        res.on('error', reject);
        res.on('end', function() {
          try {
            var data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if(res.statusCode !== 200) throw new Error(data.error || 'Automation request failed.');
            resolve(data);
          } catch(err) { reject(err); }
        });
      });
      req.setTimeout(3000, function() { req.destroy(new Error('JSLAB bridge did not respond.')); });
      req.on('error', reject);
      req.end(body);
    });
  }

  /**
   * Lists live shared sessions, ignoring stale files left after a crash.
   * @returns {Promise<Array<Object>>} Public session descriptions.
   */
  async listSessions() {
    var obj = this;
    var filenames = this.session_file ? [this.session_file] :
      fs.readdirSync(os.tmpdir()).filter(function(name) {
        return /^jslab-mcp-\d+\.json$/.test(name);
      }).map(function(name) { return path.join(os.tmpdir(), name); });
    var sessions = await Promise.all(filenames.map(async function(filename) {
      try {
        var state = obj.readSession(filename);
        var status = await obj.request(state, 'get_session_status');
        return Object.assign({ session_file: filename }, status);
      } catch(err) { return null; }
    }));
    return sessions.filter(Boolean);
  }

  /**
   * Selects the requested session, requiring an explicit choice when ambiguous.
   * @returns {Promise<Object>} Selected private descriptor.
   */
  async selectSession() {
    if(this.session_file) return this.readSession(this.session_file);
    if(this.pid) return this.readSession(path.join(os.tmpdir(), 'jslab-mcp-' + this.pid + '.json'));
    var sessions = await this.listSessions();
    if(sessions.length === 0) throw new Error('No shared JSLAB session. Start JSLAB with --mcp.');
    if(sessions.length > 1) throw new Error('Multiple JSLAB sessions. Configure --pid or --session-file.');
    return this.readSession(sessions[0].session_file);
  }

  /**
   * Calls an operation and polls short executions to completion.
   * @param {string} method Operation name.
   * @param {Object} [args={}] Operation arguments.
   * @returns {Promise<Object>} Result or running execution record.
   */
  async call(method, args = {}) {
    if(method === 'list_sessions') return { sessions: await this.listSessions() };
    var state = await this.selectSession();
    var result = await this.request(state, method, args);
    var wait_ms = args.wait_ms === undefined ? 10000 : args.wait_ms;
    var deadline = Date.now() + Math.max(0, Math.min(10000, Number(wait_ms) || 0));
    while(result.status === 'running' && Date.now() < deadline) {
      await new Promise(function(resolve) { setTimeout(resolve, 100); });
      result = await this.request(state, 'get_execution', { execution_id: result.execution_id });
    }
    return result;
  }
}

exports.PRDC_JSLAB_BRIDGE_CLIENT = PRDC_JSLAB_BRIDGE_CLIENT;
