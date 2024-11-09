/**
 * @file Application logger
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */

const fs = require('fs');

/**
 * Class for application logging.
 */
class PRDC_APP_LOGGER {
  
  /**
   * Initializes the logger with a specified log file, or defaults to 'app_log' if not specified.
   * Sets up global error and rejection handlers to log such events.
   * @param {string} [file='app_log'] - The path to the log file where messages will be written.
   */
  constructor(file = false) {
    var obj = this;
    
    if(file) {
      this.file = file;
    } else {
      this.file = 'app_log';
    }
    this.fd = fs.openSync(this.file, 'a');
    
    // Log errors
    if(typeof window !== 'undefined') {
      window.onerror = function(msg, source, lineNo, columnNo, error) {
        obj.logError(msg, source, lineNo, columnNo, error.stack);
        return true;
      };
      window.onunhandledrejection = function(e) {
        var [source, lineNo, columnNo] = obj.getPosition(e.reason.stack, e.promise);
        obj.logError(e.reason, source, lineNo, columnNo, e.reason.stack);
        return true;
      };
    } else if(typeof process !== 'undefined') {
      process.on('unhandledRejection', 
        function(reason, promise) {
          var [source, lineNo, columnNo] = obj.getPosition(reason.stack, promise);
          obj.logError(reason.message, source, lineNo, columnNo, reason.stack);
      });
      process.on('uncaughtException', 
        function(err, origin) {
          var [source, lineNo, columnNo] = obj.getPosition(err.stack, origin);
          obj.logError(err.message, source, lineNo, columnNo, err.stack);
      });
    }
    
    // On close
    // --------------------
    if(typeof window != 'undefined') {
      window.addEventListener('beforeunload', function() {
        obj.closeLog();
        return true;
      });
    }
    
    /**
     * BigInt serilization fix
     */
    BigInt.prototype.toJSON = function() { return this.toString(); };
  }
  
  /**
   * Logs an error with detailed information including message, source file, line number, column number, and stack trace.
   * @param {string} msg - The error message.
   * @param {string} source - The source file where the error occurred.
   * @param {number} lineNo - The line number of the error.
   * @param {number} columnNo - The column number of the error.
   * @param {string} [stack] - The stack trace of the error.
   */
  logError(msg, source, lineNo, columnNo, stack) {
    var full_msg = "[" + this.getDateTimeFull() + "][CODE-0] Error: " + msg + 
      "\nSource: " + source + 
      "\nLine: " + lineNo + 
      "\nColumn: " + columnNo;
    if(stack) {
      full_msg += "\nStackTrace: " + this.getStackLines(stack).join(", ") + '\n\n';
    } else {
      full_msg += '\n\n';
    }
    fs.write(this.fd, full_msg, function() {});
    console.log('[CODE-0]' + full_msg);
    if(typeof window !== 'undefined') {
      ipcRenderer.send('MainProcess', 'fade-in-win');
    }
  }
  
  /**
   * Logs arbitrary data to the log file, capturing the current stack trace to provide context.
   * @param {string} [code=''] - An optional code to categorize the log message.
   * @param {*} [data=''] - The data to log. Can be any type; objects will be stringified.
   */
  logData(code = '', data = '') {
    var err = new Error();
    if(code) {
      code = '[CODE-'+code+']';
    }
    Error.captureStackTrace(err);
    var stackLines = this.getStackLines(err.stack);
    var filteredStackLines = stackLines.filter(function(e) {
      return !e.startsWith("PRDC_APP_LOGGER.");
    });
    var full_msg = "[" + this.getDateTimeFull() + "]"+ code+" Data: " + this.stringify(data) + "\n Stack: " + filteredStackLines.join(", ") + '\n\n';
    fs.write(this.fd, full_msg, function() {});
  }

  /**
   * Logs a message to the console and/or to the log file based on DEBUG and LOG flags.
   * @param {boolean} DEBUG - Flag indicating if the message should be logged to the console.
   * @param {boolean} LOG - Flag indicating if the message should be logged to the file.
   * @param {string} code - A code representing the type or category of the message.
   * @param {string} header - A brief header or title for the log message.
   * @param {*} message - The message content. Objects will be stringified.
   */
  logMessage(DEBUG, LOG, code, header, message) {
    if(typeof DEBUG == 'undefined' || typeof DEBUG == 'undefined') {
      this.logData(0, 'DEBUG or LOG flag not defined!');
    }
    
    if(DEBUG || LOG) {
      if(typeof message == 'function') {
        message = message();
      }
      var message_str = this.stringify(message);
      if(DEBUG) {
        console.log('[CODE-'+code+'] ' + header + ': ' + message_str);
      }
      if(LOG) {
        this.logData(code, message_str);
      }
    }
  }

  /**
   * Generates a timestamp in 'DD.MM.YYYY. HH:MM:SS.mmm' format for log entries.
   * @returns {string} The formatted date-time string.
   */
  getDateTimeFull() {
    var d = new Date();
    return ('0' + d.getDate()).slice(-2) + "." + 
      ('0' + (d.getMonth() + 1)).slice(-2) + "." + 
      d.getFullYear() + '. ' + ('0'+d.getHours()).slice(-2) + ":" +  
      ('0'+d.getMinutes()).slice(-2) + ":" +  
      ('0'+d.getSeconds()).slice(-2) + "." +
      ('0'+d.getMilliseconds()).slice(-3);
  }
  
  /**
   * Converts a TypeError object into a string containing detailed error information.
   * This includes the error message, source file location, line and column numbers, and the stack trace.
   * It is specifically tailored for handling TypeError objects, which are common in JavaScript for errors
   * related to operations on the wrong type of object.
   * 
   * @param {TypeError} e - The TypeError object to stringify.
   * @returns {string} A formatted string containing detailed information about the TypeError,
   *                   suitable for logging or display in debugging tools. This includes the error's
   *                   message, source, line and column numbers, and a formatted stack trace.
   */
  stringifyTypeError(e) {
    var [source, lineNo, columnNo] = this.getPosition(e.stack, e.message);
    var full_msg = e.message + 
      "\nSource: " + source + 
      "\nLine: " + lineNo + 
      "\nColumn: " + columnNo;
    if(e.stack) {
      full_msg += "\nStackTrace: " + this.getStackLines(e.stack).join(", ") + '\n\n';
    } else {
      full_msg += '\n\n';
    }
    
    return full_msg;
  }
  
  /**
   * Helper method to stringify errors and other objects for logging.
   * @param {*} object - The object or error to stringify.
   * @returns {string} The stringified representation of the object.
   */
  stringify(object) {
    if(object instanceof TypeError) {
      return this.stringifyTypeError(object);
    } else if(object instanceof Error) {
      return object.message;
    } else if(typeof object == 'object') {
      return JSON.stringify(object);
    } else {
      return object;
    }
  }

  /**
   * Extracts the source file, line number, and column number from a stack trace.
   * @param {string} stack - The stack trace from which to extract the position.
   * @param {*} origin - The origin of the error for context.
   * @returns {Array} An array containing the source file, line number, and column number.
   */
  getPosition(stack, origin) {
    if(stack) {
      var match = stack.match(/at.*\((.*):(\d+):(\d+)\)/);
      if(match && match.length === 4) {
        return [match[1] + " ("+origin+")", match[2], match[3]];
      }
    }
    return ["unknown ("+origin+")", "unknown", "unknown"] ;
  }

  /**
   * Extracts and formats stack trace lines for easier reading in log entries.
   * @param {string} stack - The stack trace to process.
   * @returns {Array<string>} An array of formatted stack trace lines.
   */
  getStackLines(stack) {
    var lines = stack.split(/\r?\n/);
    return lines.reduce(function(filtered, line) {
      if(line.startsWith("    at ")) {
        filtered.push(line.slice(7));
      }
      return filtered;
    }, []);
  }

  /**
   * Closes the log file descriptor when the logger is no longer needed or before the application exits.
   */
  closeLog() {
    if(this.fd) {
      try {
        fs.closeSync(this.fd);
      } catch(err) {
        console.log('Failed to close log', err);
      }
    }
  }
}

exports.PRDC_APP_LOGGER = PRDC_APP_LOGGER;