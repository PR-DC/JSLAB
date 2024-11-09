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
  }

  /**
   * Executes a system command and returns the output.
   * @param {...*} args Command arguments.
   * @returns {string|boolean} The output of the command as a string, or false if an error occurred.
   */
  system(...args) {
    try {
      return this.jsl.env.execSync(...args).toString();
    } catch (err) {
      this.jsl.env.error('@system: '+err);
      return false;
    }
  }

  /**
   * Executes a system command.
   * @param {...*} args Command arguments.
   */
  exec(...args) {
    try {
      return this.jsl.env.exec(...args);
    } catch (err) {
      this.jsl.env.error('@exec: '+err);
      return false;
    }
  }

  /**
   * Executes a system command.
   * @param {...*} args Command arguments.
   */
  spawn(...args) {
    try {
      return this.jsl.env.spawn(...args);
    } catch (err) {
      this.jsl.env.error('@spawn: '+err);
      return false;
    }
  }
  
  /**
   * Retrieves a list of all running tasks on the system.
   * @returns {Array} An array containing the tasklist output or [false, []] if an error occurred.
   */
  getTaskList() {
    try {
      return this.jsl.env.execSync('tasklist').toString();
    } catch (err) {
      this.jsl.env.error('@getTaskList: '+err);
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
      const output = this.jsl.env.execSync('tasklist').toString();
      
      // Convert the output to lowercase for case-insensitive comparison
      const output_lower = output.toLowerCase();
      const program_nameLower = program_name.toLowerCase();

      // Split the output into lines and filter the ones containing the program name
      const lines = output_lower.split('\n');
      const matching_lines = lines.filter(function(line) {
        return line.includes(program_nameLower)
      });

      // Extract PIDs from the matching lines
      const pids = matching_lines.map(line => {
        // Split the line by spaces and filter out empty elements
        const columns = line.trim().split(/\s+/);
        return parseInt(columns[1], 10); // PID is the second column
      }).filter(function(pid) { 
        return !isNaN(pid)
      }); // Filter out NaN values (if any)

      const is_running = pids.length > 0;
      return [is_running, pids];
    } catch (err) {
      this.jsl.env.error('@isProgramRunning: '+err);
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
      return this.jsl.env.execSync('taskkill /pid '+pid+' /T /F').toString();
    } catch (err) {
      this.jsl.env.error('@killProcess: '+err);
      return false;
    }
  }
}

exports.PRDC_JSLAB_LIB_SYSTEM = PRDC_JSLAB_LIB_SYSTEM;