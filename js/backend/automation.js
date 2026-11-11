/**
 * @file JSLAB local automation bridge
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');

/**
 * Provides authenticated access to one desktop sandbox.
 */
class PRDC_JSLAB_AUTOMATION {

  /**
   * @param {Object} main Main process instance.
   */
  constructor(main) {
    this.main = main;
    this.server = null;
    this.ready = false;
    this.busy = false;
    this.active_id = null;
    this.jobs = new Map();
    this.token = crypto.randomBytes(32).toString('hex');
    this.session_file = path.join(os.tmpdir(), 'jslab-mcp-' + process.pid + '.json');
  }

  /**
   * Starts a loopback-only bridge and writes its private session descriptor.
   * @returns {Promise<void>}
   */
  async start() {
    var obj = this;
    this.server = http.createServer(function(req, res) {
      obj.handleRequest(req, res);
    });
    await new Promise(function(resolve, reject) {
      obj.server.once('error', reject);
      obj.server.listen(0, '127.0.0.1', resolve);
    });
    var pending_file = this.session_file + '.' + crypto.randomUUID() + '.tmp';
    try {
      fs.writeFileSync(pending_file, JSON.stringify({
        pid: process.pid,
        port: this.server.address().port,
        token: this.token,
        version: 1
      }), { mode: 0o600, flag: 'wx' });
      fs.renameSync(pending_file, this.session_file);
    } catch(err) {
      try { fs.unlinkSync(pending_file); } catch(cleanup_error) {}
      this.server.close();
      throw err;
    }
    this.server.on('error', function(err) {
      console.error('[automation] ' + err.message);
    });
    console.log('[automation] Session file: ' + this.session_file);
  }

  /**
   * Closes the bridge and removes its session descriptor.
   */
  stop() {
    this.reset();
    if(this.server) {
      this.server.close();
      this.server.closeAllConnections();
      this.server = null;
    }
    try {
      var state = JSON.parse(fs.readFileSync(this.session_file, 'utf8'));
      if(state.token === this.token) fs.unlinkSync(this.session_file);
    } catch(err) {}
  }

  /**
   * Invalidates active work when the sandbox is replaced or closed.
   */
  reset() {
    if(this.active_id) {
      this.complete({ id: this.active_id, result: {
        success: false, error: 'Sandbox was closed or reset.'
      } });
    }
    this.ready = false;
    this.busy = false;
  }

  /**
   * Records a sandbox reply without releasing unrelated executions.
   * @param {Object} data Execution reply.
   */
  complete(data) {
    if(!data || data.id !== this.active_id) return;
    var job = this.jobs.get(data.id);
    if(job.console_output && data.result) {
      var output = [];
      var size = 0;
      var truncated = !!(data.result.output_truncated || job.console_truncated);
      (data.result.output || []).concat(job.console_output).forEach(function(entry) {
        if(output.length >= 200 || size >= 64000) {
          truncated = true;
          return;
        }
        var text = entry.text.slice(0, 64000 - size);
        if(text.length < entry.text.length) truncated = true;
        output.push({ type: entry.type, text: text });
        size += text.length;
      });
      data.result.output = output;
      data.result.output_truncated = truncated;
      delete job.console_output;
      delete job.console_size;
      delete job.console_truncated;
    }
    job.status = 'completed';
    job.result = data.result;
    job.duration_ms = Date.now() - job.started_at;
    this.active_id = null;
    this.busy = false;
    if(this.main.win_main && !this.main.win_main.isDestroyed()) {
      this.main.win_main.send('MainWindow', 'code-evaluated', {});
    }
  }

  /**
   * Dispatches a validated bridge operation.
   * @param {string} method Operation name.
   * @param {Object} args Operation arguments.
   * @returns {Object} Status or execution record.
   */
  dispatch(method, args = {}) {
    if(method === 'close_cli_session' && this.main.cli_mode) {
      var main = this.main;
      setTimeout(function() { main.closeCLI(); }, 50);
      return { closing: true };
    }
    if(method === 'get_session_status') {
      return { pid: process.pid, ready: this.ready, busy: this.busy,
        execution_id: this.active_id, debugger_state: this.main.debugger?.state, version: this.main.automation_version };
    }
    if(method === 'get_execution') {
      var job = this.jobs.get(args.execution_id);
      if(!job) throw new Error('Unknown or expired execution ID.');
      return job;
    }
    if(method === 'interrupt_execution') {
      if(!this.ready) throw new Error('Sandbox is not ready.');
      this.main.debugger.interrupt().catch(() => {});
      return { requested: true, execution_id: this.active_id };
    }
    if(['get_debug_state', 'pause_execution', 'resume_execution', 'inspect_debug_object',
        'evaluate_debug_expression', 'set_breakpoint', 'remove_breakpoint', 'clear_breakpoints',
        'set_exception_pause', 'select_debug_target', 'update_debug_script', 'restart_debug_frame'].includes(method)) {
      return this.main.debugCommand(method, args);
    }
    if(this.main.debugger && ['paused', 'stopping', 'unavailable'].includes(this.main.debugger.state)) {
      throw new Error('Sandbox debugger is ' + this.main.debugger.state + '.');
    }
    var methods = ['get_runtime_info', 'evaluate_code', 'run_file', 'run_test_file', 'check_code',
      'list_workspace', 'read_variable', 'list_figures', 'export_figure', 'get_help'];
    if(!methods.includes(method)) throw new Error('Unknown automation operation.');
    if(!this.ready) throw new Error('Sandbox is not ready.');
    if(this.busy || this.active_id) throw new Error('Sandbox is busy. Check status before retrying.');
    while(this.jobs.size >= 20) this.jobs.delete(this.jobs.keys().next().value);
    var id = crypto.randomUUID();
    var job = { execution_id: id, status: 'running', started_at: Date.now() };
    this.jobs.set(id, job);
    this.active_id = id;
    this.busy = true;
    try {
      if(['evaluate_code', 'run_file', 'run_test_file'].includes(method)) this.main.debugger.reserve();
      this.main.win_main.send('MainWindow', 'code-evaluating');
      this.main.win_sandbox.send('SandboxWindow', 'automation-request',
        { id: id, method: method, args: args });
    } catch(err) {
      this.complete({ id: id, result: { success: false, error: err.message } });
    }
    return job;
  }

  /**
   * Captures native renderer console messages during agent operations.
   * @param {number} level Console severity.
   * @param {string} message Console message.
   */
  captureConsole(level, message) {
    if(!this.active_id) return;
    var job = this.jobs.get(this.active_id);
    if(!job.console_output) {
      job.console_output = [];
      job.console_size = 0;
    }
    if(job.console_size >= 32000 || job.console_output.length >= 100) {
      job.console_truncated = true;
      return;
    }
    var text = String(message).slice(0, 32000 - job.console_size);
    if(text.length < String(message).length) job.console_truncated = true;
    job.console_output.push({ type: ['debug', 'info', 'warn', 'error'][level] || 'info', text: text });
    job.console_size += text.length;
  }

  /**
   * Handles one bounded authenticated JSON request.
   * @param {Object} req HTTP request.
   * @param {Object} res HTTP response.
   */
  handleRequest(req, res) {
    var obj = this;
    var reply = function(status, data) {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    if(req.method !== 'POST' || req.url !== '/request' ||
        req.headers.origin || req.headers.authorization !== 'Bearer ' + this.token) {
      req.resume();
      reply(403, { error: 'Unauthorized automation request.' });
      return;
    }
    var chunks = [];
    var size = 0;
    req.setTimeout(10000, function() { req.destroy(); });
    req.on('data', function(chunk) {
      size += chunk.length;
      if(size > 4 * 1024 * 1024) {
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('error', function() {});
    req.on('end', async function() {
      try {
        var data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(!data || typeof data.method !== 'string' || !data.args ||
            typeof data.args !== 'object' || Array.isArray(data.args)) {
          throw new Error('Expected method and argument object.');
        }
        reply(200, await obj.dispatch(data.method, data.args));
      } catch(err) {
        reply(400, { error: err.message });
      }
    });
  }
}

exports.PRDC_JSLAB_AUTOMATION = PRDC_JSLAB_AUTOMATION;
