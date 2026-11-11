/**
 * @file JSLAB command-line runtime ownership
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const { PRDC_JSLAB_BRIDGE_CLIENT } = require('../mcp/bridge-client');

/**
 * Owns one isolated Electron sandbox for a terminal session.
 */
class PRDC_JSLAB_CLI_SESSION {
  /**
   * @param {Object} options CLI options.
   */
  constructor(options) {
    this.options = options;
    this.child = null;
    this.profile = null;
    this.execution_id = null;
    this.interrupted = false;
    this.diagnostics = '';
  }

  /**
   * Starts the actual JSLAB runtime with hidden main and editor windows.
   */
  async start() {
    var obj = this;
    var root = path.resolve(__dirname, '..', '..');
    var packaged = path.basename(path.dirname(root)) === 'resources';
    var cli_config = packaged
      ? JSON.parse(fs.readFileSync(path.resolve(root, '..', '..', 'jslab-cli.json'), 'utf8'))
      : null;
    var executable = packaged
      ? path.resolve(root, '..', '..', cli_config.runtime)
      : process.versions.electron ? process.execPath : require('electron');
    var env = Object.assign({}, process.env);
    delete env.ELECTRON_RUN_AS_NODE;
    this.profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-cli-'));
    var args = (packaged ? [] : [root]).concat(['--cli-runtime', '--cli-parent-pid=' + process.pid,
      '--user-data-dir=' + this.profile]);
    if(this.options.headless) args.push('--disable-gpu', '--in-process-gpu');
    this.child = cp.spawn(executable, args, { env: env, cwd: this.options.cwd,
      windowsHide: true, detached: this.options.detached === true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child.on('error', function(err) { obj.start_error = err; });
    [this.child.stdout, this.child.stderr].forEach(function(stream) {
      stream.on('data', function(data) { obj.diagnostics = (obj.diagnostics + data.toString()).slice(-8000); });
    });
    this.bridge = new PRDC_JSLAB_BRIDGE_CLIENT({ pid: this.child.pid });
    var deadline = Date.now() + 45000;
    while(Date.now() < deadline) {
      if(this.start_error) throw this.start_error;
      if(this.child.exitCode !== null || this.child.signalCode !== null) {
        throw new Error('JSLAB runtime exited during startup.\n' + this.diagnostics);
      }
      try {
        var status = await this.bridge.call('get_session_status');
        if(status.ready) return;
      } catch(err) {}
      await new Promise(function(resolve) { setTimeout(resolve, 100); });
    }
    throw new Error('JSLAB runtime did not become ready within 45 seconds.\n' + this.diagnostics);
  }

  /**
   * Runs one operation, waiting for completion and honoring terminal interruption.
   * @param {string} method Operation name.
   * @param {Object} args Operation arguments.
   * @returns {Promise<Object>} Sandbox result.
   */
  async execute(method, args = {}) {
    this.interrupted = false;
    var started = Date.now();
    var job = await this.bridge.call(method, Object.assign({}, args, { wait_ms: 0 }));
    this.execution_id = job.execution_id;
    try {
      while(job.status === 'running') {
        if(this.options.timeout && Date.now() - started >= this.options.timeout * 1000) {
          await this.interrupt();
          var timeout = new Error('Execution timed out after ' + this.options.timeout + ' seconds.');
          timeout.exit_code = 124;
          throw timeout;
        }
        await new Promise(function(resolve) { setTimeout(resolve, 50); });
        job = await this.bridge.call('get_execution', { execution_id: this.execution_id });
      }
      return job.result;
    } finally {
      this.execution_id = null;
    }
  }

  /**
   * Requests debugger interruption and registered-resource cleanup.
   */
  async interrupt() {
    this.interrupted = true;
    if(this.bridge) await this.bridge.call('interrupt_execution');
  }

  /**
   * Closes the owned runtime and removes its temporary profile.
   */
  async close() {
    if(this.child && this.child.exitCode === null && this.child.signalCode === null) {
      var child = this.child;
      if(this.bridge) {
        try { await this.bridge.call('close_cli_session'); } catch(err) {}
      }
      child.stdin.on('error', function() {});
      child.stdin.end();
      await new Promise(function(resolve) {
        if(child.exitCode !== null || child.signalCode !== null) { resolve(); return; }
        var timer = setTimeout(function() {
          child.kill();
          resolve();
        }, 3000);
        child.once('exit', function() { clearTimeout(timer); resolve(); });
      });
    }
    if(this.profile) {
      const target = path.resolve(this.profile);
      if(path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('jslab-cli-')) throw Error('Unexpected CLI profile cleanup path.');
      try { await fs.promises.rm(this.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch(err) {}
    }
  }
}

exports.PRDC_JSLAB_CLI_SESSION = PRDC_JSLAB_CLI_SESSION;
