/**
 * @file JSLAB pty class
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const pty = require('@lydell/node-pty');
const { webContents } = require("electron");
const { execSync } = require("child_process");
/**
 * Class for flight control app.
 */
class PRDC_JSLAB_PTY {

  /**
   * Creates the PTY manager instance.
   */
  constructor() {
    var obj = this;
    this.sessions = new Map();
    this.s_id = 0;
  }

  /**
   * Creates a new PTY session bound to the calling renderer.
   * @param {Object} event - IPC invoke event.
   * @param {Array} args - Arguments forwarded to pty.spawn(...).
   * @returns {Object} Result object: { id, pid }.
   */
  create(event, args) {
    const wc = event.sender;
    this.s_id += 1;
    const id = this.s_id;

    const term = pty.spawn(...args);

    const session = {
      id,
      pid: term.pid,
      term,
      ownerWcId: wc.id,
    };

    this.sessions.set(id, session);

    const onData = (data) => {
      const owner = webContents.fromId(session.ownerWcId);
      if(!owner) return;
      owner.send('pty', { type: 'data', id, buffer: Buffer.from(data, "utf8").toString("base64") });
    };

    if(typeof term.onData === "function") {
      term.onData(onData);
    } else {
      term.on("data", onData);
    }

    const onExit = (e) => {
      const owner = webContents.fromId(session.ownerWcId);
      if(owner) owner.send('pty', { type: 'exit', id, ...e });
      this._dispose(undefined, { id: id });
    };

    if(typeof term.onExit === "function") {
      term.onExit(onExit);
    } else {
      term.on("exit", onExit);
    }

    wc.once("destroyed", () => {
      this.kill(event, {id: id});
    });

    return id;
  }

  /**
   * Writes input to an existing PTY session (as if typed in terminal).
   * @param {string} id - Session id returned by {@link create}.
   * @param {string} data - Text to write to the PTY stdin.
   * @returns {boolean} True if the session existed and the write was issued.
   */
  write(event, data) {
    const s = this.sessions.get(data.id);
    if(!s) return false;
    var str = Buffer.from(data.buffer, "base64").toString("utf8");
    s.term.write(str);
    return true;
  }

  /**
   * Resizes the PTY terminal dimensions.
   * @param {string} id - Session id returned by {@link create}.
   * @param {number} cols - Terminal column count.
   * @param {number} rows - Terminal row count.
   * @returns {boolean} True if the session existed and resize succeeded.
   */
  resize(event, data) {
    const s = this.sessions.get(data.id);
    if(!s) return false;
    try {
      s.term.resize(data.cols | 0, data.rows | 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lists currently active PTY sessions.
   * @returns {Array} Array of objects: [{ id, pid }, ...]
   */
  listSessions(event, data) {
    return Array.from(this.sessions.values()).map((s) => ({ id: s.id, pid: s.pid }));
  }

  /**
   * Terminates a PTY session and removes it from the registry.
   * @param {string} id - Session id returned by {@link create}.
   * @returns {boolean} True if a session existed and was disposed.
   */
  kill(event, data) {
    const s = this.sessions.get(data.id);
    if(!s) return false;
    try { s.term.kill(); } catch {}
    this._dispose(undefined, {id: data.id});
    return true;
  }

  /**
   * Terminates all PTY sessions and clears the registry.
   * @param {Object} event - IPC invoke event.
   * @param {Object} data - Optional data (unused).
   * @returns {number} Number of sessions that were disposed.
   */
  killAll(event, data) {
    const ids = Array.from(this.sessions.keys());
    let killed = 0;

    for(const id of ids) {
      const s = this.sessions.get(id);
      if(!s) continue;
      
      execSync('taskkill /pid ' + s.pid + ' /T /F');
      
      try { s.term.kill(); } catch {}
      this._dispose(undefined, { id });
      killed++;
    }
    
    this.s_id = 0;
    return killed;
  }
  
  /**
   * Disposes session resources without throwing.
   * @param {string} id - Session id to dispose.
   * @returns {void}
   */
  _dispose(event, data) {
    const s = this.sessions.get(data.id);
    if(!s) return;
    try { s.term.removeAllListeners(); } catch {}
    this.sessions.delete(data.id);
  }
}

exports.PRDC_JSLAB_PTY = PRDC_JSLAB_PTY;
