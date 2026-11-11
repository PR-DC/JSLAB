/**
 * @file Owned process isolation for interruptible scientific native tasks
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const v8 = require('v8');
const cp = require('child_process');
const { PRDC_JSLAB_CLI_SESSION } = require('../cli/session');

/** Keeps cancellable native jobs outside the persistent desktop sandbox process. */
class PRDC_JSLAB_TASKS {
  constructor() { this.jobs = new Map(); this.owners = new WeakSet(); }

  /** Starts a fresh scientific runtime and returns structured-cloneable task data. */
  async run(owner, request) {
    if(typeof request.id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(request.id) || this.jobs.has(request.id)) throw Error('Invalid isolated task identity.');
    if(typeof request.source !== 'string' || Buffer.byteLength(request.source) > 512000 || !Array.isArray(request.args)) throw Error('Invalid isolated task source or arguments.');
    if(this.jobs.size >= 4) throw Error('At most four isolated native tasks may run at once.');
    const input = v8.serialize(request.args);
    const session = new PRDC_JSLAB_CLI_SESSION({ cwd: request.cwd, timeout: 0, detached: process.platform !== 'win32', headless: true });
    const job = { session, owner: owner.id, cancelled: false, stopping: null };
    this.jobs.set(request.id, job);
    if(!this.owners.has(owner)) {
      this.owners.add(owner);
      owner.once('destroyed', () => this.cancelOwner(owner.id));
    }
    try {
      await session.start();
      if(job.cancelled) throw Error('Isolated task interrupted.');
      const input_file = path.join(session.profile, 'native-task-input.bin');
      const output_file = path.join(session.profile, 'native-task-output.bin');
      fs.writeFileSync(input_file, input);
      const source = 'var isolated_args = require("v8").deserialize(require("fs").readFileSync(' + JSON.stringify(input_file) + '));\n' +
        'var isolated_result = await (' + request.source + ')(...isolated_args);\n' +
        'require("fs").writeFileSync(' + JSON.stringify(output_file) + ', require("v8").serialize(isolated_result));';
      const result = await session.execute('evaluate_code', { code: source });
      if(job.cancelled) throw Error('Isolated task interrupted.');
      if(!result.success) return { success: false, error: result.error, error_details: result.error_details };
      return { success: true, value: v8.deserialize(fs.readFileSync(output_file)) };
    } catch(error) {
      return { success: false, error: job.cancelled ? 'Isolated task interrupted.' : String(error.message || error), interrupted: job.cancelled };
    } finally {
      if(job.stopping) await job.stopping;
      await session.close();
      this.jobs.delete(request.id);
    }
  }

  /** Force-stops only the process tree belonging to the requesting sandbox's job. */
  async cancel(owner_id, id) {
    const job = this.jobs.get(id);
    if(!job || job.owner !== owner_id) return { stopped: false };
    job.cancelled = true;
    if(job.stopping) return job.stopping;
    job.stopping = (async () => {
      const child = job.session.child;
      if(child && child.exitCode === null && child.signalCode === null) {
        if(process.platform === 'win32') await new Promise(resolve => cp.execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => resolve()));
        else { try { process.kill(-child.pid, 'SIGKILL'); } catch(error) { child.kill('SIGKILL'); } }
        if(child.exitCode === null && child.signalCode === null) await new Promise(resolve => {
          const timer = setTimeout(resolve, 5000);
          child.once('exit', () => { clearTimeout(timer); resolve(); });
        });
      }
      return { stopped: true };
    })();
    return job.stopping;
  }

  /** Stops isolated jobs when their owning sandbox is reset or closed. */
  cancelOwner(owner_id) {
    return Promise.all(Array.from(this.jobs).filter(([, job]) => job.owner === owner_id).map(([id]) => this.cancel(owner_id, id)));
  }
}
exports.PRDC_JSLAB_TASKS = PRDC_JSLAB_TASKS;
