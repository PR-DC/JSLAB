/**
 * @file JSLAB FreeCADLink submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB FreeCADLink.
 */
class PRDC_JSLAB_FREECAD_LINK {
  
  /**
   * Initializes a new instance of the FreeCADLink.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    this.jsl = jsl;
  }
  
  /**
   * Starts the FreeCAD application and establishes a TCP connection for remote procedure calls.
   * Attempts to start FreeCAD if it's not running and connects to its TCP server.
   * @param {string} exe - The executable path of FreeCAD.
   * @param {Object} options - Configuration options such as port and host.
   */
  async start(exe, options) {
    this.exe = exe;
    
    this.port = 11077;
    this.host = 'localhost';
    this.timeout = 3000; // [ms]
    this.script_timeout = 30000; // [ms]
    this.startup_timeout = 10000; // [ms]
    
    this.loaded = false;
    
    if(options.hasOwnProperty('port')) {
      this.port = options.port;
    }
    if(options.hasOwnProperty('host')) {
      this.host = options.host;
    }
    if(options.hasOwnProperty('timeout')) {
      this.timeout = options.timeout;
    }
    if(options.hasOwnProperty('script_timeout')) {
      this.script_timeout = options.script_timeout;
    }
    if(options.hasOwnProperty('startup_timeout')) {
      this.startup_timeout = options.startup_timeout;
    }
    
    var [flag, pids] = this.jsl.system.isProgramRunning('FreeCAD.exe');
    if(flag) {
      this.loaded = true;
      this.jsl.env.disp('@FreeCADLink: '+language.string(179));
      await this.findServer();
    } else {
      this.jsl.system.exec('"' + this.exe + '" --single-instance');
      var [flag, pids] = this.jsl.system.isProgramRunning('FreeCAD.exe');
      if(flag) {
        this.loaded = true;
        await this.findServer();
      } else {
        this.jsl.env.disp('@FreeCADLink: '+language.string(180));
      }
    }
  }
  
  /**
   * Attempts to locate the FreeCAD TCP server within the network, respecting the startup timeout.
   * Checks if the TCP server is reachable by sending a 'PING' command.
   */
  async findServer() {
    var t = tic;
    while(true) {
      if(await this.send('PING|', 1000)) {
        break;
      } else if(toc(t) > this.startup_timeout/1000) {
        this.loaded = false;
        this.jsl.env.disp('@FreeCADLink: '+language.string(181));
        break;
      }
      await waitSeconds(0.5);
    }
  }
  
  /**
   * Sends a message to the FreeCAD TCP server and waits for a response.
   * Manages the TCP communication by ensuring message integrity and handling timeouts.
   * @param {string} message - The message to send.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   * @returns {Buffer|boolean} - The response from the server or false if the request times out.
   */
  async send(message, timeout) {
    var obj = this;
    var buf_in = [];
    var N_in;
    var got_header = false;

    if(this.jsl.format.isUndefined(timeout)) {
      timeout = this.timeout;
    } 
    if(this.loaded) {
      var t = tic;

      this.tcp_com = this.jsl.networking.tcp(host, port, function() {
        var length = message.length;
        var buf_out = Buffer.alloc(2 + length);
        buf_out.writeUInt16BE(length, 0);
        buf_out.write(message, 2, 'utf8');
        obj.tcp_com.write(buf_out);
      });
      while(true) {
        await waitMSeconds(1);
        if(toc(t) < timeout/1000) {
          if(!got_header && this.tcp_com.availableBytes() > 2) {
            got_header = true;
            var data = this.tcp_com.read();
            var header = data.splice(0, 2);
            N_in = (header[0] << 8) | header[1];
            buf_in.push(...data);
            if(buf_in.length == N_in) {
              break;
            }
          } else if(got_header && this.tcp_com.availableBytes() > 0) {
            var data = this.tcp_com.read();
            if(data.length) {
              buf_in.push(...data);
              if(buf_in.length >= N_in) {
                buf_in = buf_in.slice(0, N_in);
                break; 
              }
            }
          }
        } else {
          break;
        }
      }

      this.tcp_com.close();
      if(buf_in.length) {
        return Buffer.from(buf_in).toString();
      }
    }
    return false;
  }
  
  /**
   * Parses the input from FreeCAD responses to identify errors and data.
   * Splits the message by '|' and checks for error or data messages.
   * @param {string} message - The message received from FreeCAD.
   * @returns {Array} - An array of parsed message components.
   */
  inputPraser(message) {
    var params = [];
    var str = message.toString();
    
    if(str.length) {
      params = str.split('|');
      if(params.length && params[0] == 'ERR') {
        disp('@FreeCADLink: Error = ' + params[1]);
      }
    }
    return params;
  }
  
  /**
   * Displays a message from FreeCAD in the JSLAB interface.
   * Parses and displays messages specifically tagged as 'MSG' from FreeCAD.
   * @param {string} message - The message received from FreeCAD.
   */
  showMessage(message) {
    var params = this.inputPraser(message);
    if(params.length && params[0] == 'MSG') {
      this.jsl.env.disp('@FreeCADLink: Message = ' + params[1]);
    }
  }
  
  /**
   * Closes the FreeCAD application gracefully.
   * Sends a quit command and handles the termination of the TCP connection.
   */
  async quit() {
    if(this.loaded) {
      var response = await this.send('CMD|QUIT', 1000);
      return this.inputPraser(response);
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Opens a specified file in FreeCAD.
   * Sends a command to open a file and handles responses to confirm file access.
   * @param {string} filePath - The path to the file to be opened.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async open(filePath, timeout) {
    if(this.loaded) {
      if(exist(filePath)) {
        var response = await this.send('CMD|OPEN|' + filePath, timeout);
        return this.inputPraser(response);
      } else {
        this.jsl.env.disp('@FreeCADLink: '+language.string(183));
      }
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Imports a file into the current FreeCAD document.
   * Sends an import command and handles responses to confirm the import operation.
   * @param {string} filePath - The path of the file to be imported.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async importFile(filePath, timeout) {
    if(this.loaded) {
      if(exist(filePath)) {
        var response = await this.send('CMD|IMPORT|' + filePath, timeout);
        return this.inputPraser(response);
      } else {
        this.jsl.env.disp('@FreeCADLink: '+language.string(183));
      }
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Creates a new document in FreeCAD, optionally specifying a filename.
   * Sends a command to create a new document and handles the document creation response.
   * @param {string} filename - Optional filename for the new document.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async newDocument(filename, timeout) {
    if(this.loaded) {
      var cmd = 'CMD|NEW';
      if(!this.jsl.format.isUndefined(filename)) {
        cmd = cmd+"|"+filename;
      }
      var response = await this.send(cmd, timeout);
      var params = this.inputPraser(response);
      var name = "";
      if(params.length && params[0] == 'DAT') {
        name = params[1];
      }
      return name;
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Saves the current document in FreeCAD.
   * Sends a save command and handles responses to confirm the save operation.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async save(timeout) {
    if(this.loaded) {
      var response = await this.send('CMD|SAVE', timeout);
      return this.inputPraser(response);
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Saves the current document in FreeCAD under a new filename.
   * Sends a save as command and handles responses to confirm the operation.
   * @param {string} filePath - The new file path for the document.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async saveAs(filePath, timeout) {
    if(this.loaded) {
      var response = await this.send('CMD|SAVEAS|' + filePath, timeout);
      return this.inputPraser(response);
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Closes the current document in FreeCAD.
   * Sends a close command and handles responses to confirm the document closure.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async close(timeout) {
    if(this.loaded) {
      var response = await this.send('CMD|CLOSE', timeout);
      return this.inputPraser(response);
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Executes a command in FreeCAD and returns the evaluation result.
   * Sends an evaluate command with the specified command string.
   * @param {string} command - The command to be evaluated in FreeCAD.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async evaluate(command, timeout) {
    if(this.loaded) {
      var response = await this.send('EVAL|' + command, timeout);
      return this.inputPraser(response);
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Runs a script in FreeCAD with optional parameters.
   * Sends a script command along with parameters and handles the script execution response.
   * @param {string} script - The script to run.
   * @param {string|array} param - Parameters to pass to the script.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async callScript(script, param, timeout) {
    if(this.loaded) {
      if(this.jsl.format.isUndefined(timeout)) {
        timeout = this.script_timeout;
      }
      if(this.jsl.format.isUndefined(param)){
        param = '';
      } else if(isArray(param)){
        param = param.join('|');
      }
      var response = await this.send('SCRIPT|' + script + '|' + param, timeout);
      return this.inputPraser(response);
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Retrieves the area of the selected object in FreeCAD.
   * Sends a measure area command and parses the response to extract the area value.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async getArea(timeout) {
    if(this.loaded) {
      var response = await this.send('MSR|A', timeout);
      var params = this.inputPraser(response);
      var area = "";
      if(params.length && params[0] == 'DAT') {
        area = params[1];
      }
      return area;
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
  
  /**
   * Retrieves the volume of the selected object in FreeCAD.
   * Sends a measure volume command and parses the response to extract the volume value.
   * @param {number} timeout - Timeout in milliseconds to wait for a response.
   */
  async getVolume(timeout) {    
    if(this.loaded) {
      var response = await this.send('MSR|V', timeout);
      var params = this.inputPraser(response);
      var vol = "";
      if(params.length && params[0] == 'DAT') {
        vol = params[1];
      }
      return vol;
    } else {
      this.jsl.env.disp('@FreeCADLink: '+language.string(182));
    }
    return false;
  }
}

exports.PRDC_JSLAB_FREECAD_LINK = PRDC_JSLAB_FREECAD_LINK;