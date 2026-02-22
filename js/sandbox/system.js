/**
 * @file JSLAB library system submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB system submodule.
 */
class PRDC_JSLAB_LIB_SYSTEM {
  
  /**
   * Initializes a new instance of the system submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    
    /**
     * Array of open terminals.
     * @type {Array}
     */
    this.open_terminals = {};
  }

  /**
   * Executes a system command and returns the output.
   * @param {...*} args Command arguments.
   * @returns {string|boolean} The output of the command as a string, or false if an error occurred.
   */
  system(...args) {
    try {
      return this.jsl.inter.env.execSync(...args).toString();
    } catch(err) {
      this.jsl.inter.env.error('@system: '+err);
      return false;
    }
  }

  /**
   * Executes a system command.
   * @param {...*} args Command arguments.
   */
  exec(...args) {
    try {
      return this.jsl.inter.env.exec(...args);
    } catch(err) {
      this.jsl.inter.env.error('@exec: '+err);
      return false;
    }
  }

  /**
   * Executes a system command.
   * @param {...*} args Command arguments.
   */
  spawn(...args) {
    try {
      return this.jsl.inter.env.spawn(...args);
    } catch(err) {
      this.jsl.inter.env.error('@spawn: '+err);
      return false;
    }
  }

  /**
   * Spawns a new PTY-backed terminal session and registers it locally.
   * @param {Array} args - Arguments forwarded to PTY spawn (e.g. [file, argv, options]).
   * @param {Function} onData - Callback invoked on terminal output (string).
   * @param {Function} onExit - Callback invoked when the terminal exits.
   * @returns {PRDC_JSLAB_SYSTEM_TERMINAL} Terminal wrapper instance.
   */
  spawnTerminal(args, onData, onExit) {
    var id = this.jsl.inter.env.sendPty('create', args);
    var terminal = new PRDC_JSLAB_SYSTEM_TERMINAL(this.jsl, id, onData, onExit);
    this.open_terminals[id] = terminal;
    return terminal; 
  }
  
  /**
   * Retrieves a list of all running tasks on the system.
   * @returns {Array} An array containing the tasklist output or [false, []] if an error occurred.
   */
  getTaskList() {
    try {
      return this.jsl.inter.env.execSync('tasklist').toString();
    } catch(err) {
      this.jsl.inter.env.error('@getTaskList: '+err);
      return false;
    }
  }

  /**
   * Checks if a specific program is running and retrieves its process IDs.
   * @param {string} program_name - The name of the program to check.
   * @returns {Array} An array where the first element is a boolean indicating if the program is running, 
   *                  and the second element is an array of process IDs if the program is running.
   */
  isProgramRunning(program_name) {
    try {
      // Execute the tasklist command and get the output
      const output = this.jsl.inter.env.execSync('tasklist').toString();
      
      // Convert the output to lowercase for case-insensitive comparison
      const output_lower = output.toLowerCase();
      const program_nameLower = program_name.toLowerCase();

      // Split the output into lines and filter the ones containing the program name
      const lines = output_lower.split('\n');
      const matching_lines = lines.filter(function(line) {
        return line.includes(program_nameLower);
      });

      // Extract PIDs from the matching lines
      const pids = matching_lines.map(line => {
        // Split the line by spaces and filter out empty elements
        const columns = line.trim().split(/\s+/);
        return parseInt(columns[1], 10); // PID is the second column
      }).filter(function(pid) { 
        return !isNaN(pid);
      }); // Filter out NaN values (if any)

      const is_running = pids.length > 0;
      return [is_running, pids];
    } catch(err) {
      this.jsl.inter.env.error('@isProgramRunning: '+err);
      return [false, []];
    }
  }
  
  /**
   * Attempts to kill a process by its process ID.
   * @param {number} pid - The process ID of the process to kill.
   * @returns {string|boolean} The output of the kill command as a string, or false if an error occurred.
   */
  killProcess(pid) {
    try {
      // Execute the tasklist command and get the output
      return this.jsl.inter.env.execSync('taskkill /pid '+pid+' /T /F').toString();
    } catch(err) {
      this.jsl.inter.env.error('@killProcess: '+err);
      return false;
    }
  }
  
  /**
   * Callback called on new pty data
   * @param {Object} data - Data from pty.
   */
  _onPtyData(data) {
    if(data.type == 'exit') {
      this.open_terminals[data.id].onExit();
      delete this.open_terminals[data.id];
    } else if(data.type == 'data') {
      this.open_terminals[data.id].onData(data.buffer);
    }
  }
  
  /**
   * Closes all terminals
   */
  _clear() {
    this.open_terminals = {};
    this.jsl.inter.env.sendPty('killAll');
  }
}

exports.PRDC_JSLAB_LIB_SYSTEM = PRDC_JSLAB_LIB_SYSTEM;

/**
 * Class for JSLAB system terminal.
 */
class PRDC_JSLAB_SYSTEM_TERMINAL {
  
  /**
   * Creates a terminal wrapper instance.
   * @param {Object} jsl Reference to the main JSLAB object.
   * @param {string} id - PTY session id.
   * @param {Function} onData - Callback invoked on terminal output (string).
   * @param {Function} onExit - Callback invoked when the terminal exits.
   */
  constructor(jsl, id, onData, onExit) {
    this.jsl = jsl;
    this.id = id;
    this._onData = onData;
    this._onExit = onExit;
  }
  
  /**
   * Writes text to the terminal (encoded as base64 for transport).
   * @param {string} str - Text to write to the PTY stdin.
   * @returns {*} Synchronous IPC result from the main process.
   */
  write(str) {
    var buf = Buffer.from(str, "utf8").toString("base64");
    return this.jsl.inter.env.sendPty('write', {id: this.id, buffer: buf});
  }
  
  /**
   * Handles a PTY output chunk received from the main process.
   * @param {string} buffer - Base64-encoded output data.
   * @returns {void}
   */
  onData(buffer) {
    if(this.jsl.inter.format.isFunction(this._onData)) {
      var str = Buffer.from(buffer, "base64").toString("utf8");
      this._onData(str);
    }
  }
  
  /**
   * Handles PTY exit notification received from the main process.
   * @returns {void}
   */
  onExit() {
    if(this.jsl.inter.format.isFunction(this._onExit)) {
      this._onExit();
    }
  }

  /**
   * Terminates the terminal session.
   * @returns {*} Synchronous IPC result from the main process.
   */
  kill() {
    return this.jsl.inter.env.sendPty('kill', {id: this.id});
  }
}