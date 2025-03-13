/**
 * @file JSLAB library serial device submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB serial device submodule.
 */
class PRDC_JSLAB_LIB_SERIAL_DEVICE {
  
  /**
   * Constructs a serial device submodule object with access to JSLAB's device functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }
  
  /**
   * Retrieves all available serial ports.
   * @returns {Promise<Array>} Resolves with an array of serial port info.
   */
  async listSerialPorts() {
    return await this.jsl.env.SerialPort.list();
  }
  
  /**
   * Checks if there is a USB device connected with the specified Vendor ID and Product ID.
   * @param {string} VID - Vendor ID of the USB device.
   * @param {string} PID - Product ID of the USB device.
   * @returns {boolean} True if the device is found, false otherwise.
   */
  async checkDeviceUSB(VID, PID){
    var devices = await this.listSerialPorts();
    if(Array.isArray(devices)) {
      if(this.jsl.debug) {
        this.jsl.env.disp('@checkDeviceUSB: ' + JSON.stringify(devices));
      }
      return devices.some(device => device.vendorId === VID && device.productId === PID);
    }
    return false; 
  }

  /**
   * Checks for a connected USB device by STM and an optional Product ID.
   * @param {string} [PID='5740'] - Product ID of the USB device, default is for Virtual COM Port.
   * @returns {boolean} True if the device is found, false otherwise.
   */
  async checkDeviceSTM(PID = '5740') {
    return await this.checkDeviceUSB('0483', PID);
  }
 
  /**
   * Checks if there is a USB device connected using a CH340 chip.
   * @returns {boolean} True if the device is found, false otherwise.
   */
  async checkDeviceCH340() {
    return await this.checkDeviceUSB('1A86', '7523');
  }
  
  /**
   * Opens a serial port.
   * @param {string} port - Port path.
   * @param {number} [baudrate=9600] - Baud rate.
   * @param {object} [opts={}] - Additional options.
   * @returns {SerialPort} The opened SerialPort instance.
   */
  connectSerialPorts(port_path, baudrate = 9600, opts_in = {}) {
    var opts = { 
      dataBits: 8, 
      parity: 'none', 
      stopBits: 1, 
      flowControl: false,
      ...opts_in
    }
    var port = new this.jsl.env.SerialPort({
      path: port_path,
      baudRate: baudrate,
      ...opts
    });
    port.on('open', function() {
      try {
        port.set({
          dtr: true,
          rts: false
        });
      } catch(err) {}
    });
    
    this.jsl.addForCleanup(this, function() {
      if(port && port.isOpen) {
        port.close();
      }
    });
    
    return port;
  }
  
  /**
   * Opens a window to choose a serial port.
   * @returns {Promise<string|false>}
   */
  async chooseSerialPort() {
    var context = await this.jsl.windows.openWindowBlank();
    context.setTitle('Choose serial port');
    var ports = await this.listSerialPorts();
    var ports_list = '';
    if(ports.length > 0) {
      for(var port of ports) {
        ports_list += `<li class="ui" port='${port.path}'>${port.friendlyName}</li>`;
      }
    } else {
      ports_list += '<li class="ui"><str sid="230"></str></li>'
    }
    context.document.body.innerHTML = `<ul class="ui">${ports_list}</ul>`;
    var win = this.jsl.windows.open_windows[context.wid];
    win._updateLanguage();
    win.addUI();
    context.setSize(300, 100);
    await this.jsl.non_blocking.waitMSeconds(30);
    var win_height = context.document.body.offsetHeight;
    context.setSize(300, (win_height > 500 ? 500 : win_height));
    
    
    if(ports.length == 0) {
      return false;
    } else {
      var returned = false;
      var p = new Promise((resolve, reject) => {
        context.document.querySelectorAll('li').forEach(function(li) {
          li.addEventListener('click', function(e) {
            if(!returned) {
              returned = true;
              resolve(this.getAttribute('port'));
              context.close();
            }
          });
        });
        win.onClosed = function() {
          if(!returned) {
            returned = true;
            resolve(false);
          }
        }
      });
      return await p;
    }
  }
  

  /**
   * Opens a window to choose serial options.
   * @returns {Promise<string|false>}
   */
  async chooseSerialOptions() {
    var context = await this.jsl.windows.openWindowBlank();
    context.setTitle('Choose serial options');
    var ports = await this.listSerialPorts();
    var ports_list = '';
    if(ports.length > 0) {
      for(var port of ports) {
        ports_list += `<option value='${port.path}'>${port.friendlyName}</option>`;
      }
    } else {
      ports_list += "<option value='' str='230'></option>"
    }
    context.document.body.innerHTML = `
    <label class="ui"><str sid="232"></str>:</label>
    <select class="ui" id="port">${ports_list}</select>
    <label class="ui"><str sid="233"></str>:</label>
    <input  class="ui"type="text" id="baudrate" str="233"></input>
    <button class="ui blue" id="choose"><str sid="231"></str></button>`;
    var win = this.jsl.windows.open_windows[context.wid];
    win._updateLanguage();
    win.addUI();
    context.setSize(400, 100);
    await this.jsl.non_blocking.waitMSeconds(30);
    var win_height = context.document.body.offsetHeight;
    context.setSize(400, (win_height > 500 ? 500 : win_height));
    
    if(ports.length == 0) {
      warn('@chooseSerialOptions: '+language.currentString(230));
      context.close();
      return [false, false];
    } else {
      var returned = false;
      var p = new Promise((resolve, reject) => {
        context.document.getElementById('choose').
            addEventListener('click', function(e) {
          if(!returned) {
            returned = true;
            resolve([context.document.getElementById('port').value, 
              Number(context.document.getElementById('baudrate').value)]);
            context.close();
          }
        });
        win.onClosed = function() {
          if(!returned) {
            returned = true;
            resolve([false, false]);
          }
        }
      });
      return await p;
    }
  }
  
  /**
   * Opens a serial terminal.
   * @param {string} port_path - The identifier or path of the serial port to connect to.
   * @param {number} [baudrate] - The communication speed in bits per second.
   * @param {Object} [opts={}] - An optional configuration object for additional settings.
   * @returns {Promise<Object>} A promise that resolves with the terminal context.
   */
  async openSerialTerminal(port_path, baudrate = 9600, opts = {}) {
    var obj = this;
    
    if(!baudrate) {
      baudrate = 9600;
    }
    
    this.port_path = port_path;
    this.baudrate = baudrate;
    this.opts = opts;
    
    var wid = this.jsl.windows.openWindow('serial_terminal.html');
    var win = this.jsl.windows.open_windows[wid];
    await win.ready;
    win.addUI();
    win.addScript("../js/windows/terminal.js");
    var context = win.context;
    context.setTitle(port_path + ' (' + baudrate + ') | Serial Terminal');
    context.setSize(500, 500);
    context.document.getElementById('terminal-title').innerText = 
      port_path + ' (' + baudrate + ')';
    win._updateLanguage();
    
    // Wait for terminal
    while(!context.terminal) {
      await waitMSeconds(1);
    }
    
    context.terminal.setOptions(opts);
    
    win.onClosed = function() {
      if(obj.port && obj.port.isOpen) {
        obj.port.close();
      }
      delete obj.port;
    }

    this.port = this.connectSerialPorts(port_path, baudrate);
    
    this.port.on('data', (data) => {
      var data_in = data;
      if(obj.opts && typeof obj.opts.decodeData == 'function') {
        data_in = obj.opts.decodeData(data);
      } else {
        data_in = data.toString('utf8');
      }
      if(data_in !== false) {
        if(Array.isArray(data_in) && data_in.length) {
          for(var message of data_in) {
            context.terminal.addMessage('', message);
          }
        } else {
          context.terminal.addMessage('', data_in);
        }
      }
    });
    
    function sendMessage() {
      var data_out_raw = context.terminal.message_input.value;
      var data_out;
      if(obj.opts && typeof obj.opts.encodeData == 'function') {
        data_out = obj.opts.encodeData(data_out_raw);
      } else {
        data_out = data_out_raw;
      }
      if(data_out !== false) {
        obj.port.write(data_out);
        context.terminal.message_input.value = '';
        context.terminal.autoResizeInput();
      }
    }
    
    context.terminal.message_input.addEventListener('keydown', function(e) {
      if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    context.document.getElementById('send-button')
        .addEventListener('click', function(e) {
      sendMessage();
    });
    
    context.document.getElementById('timestamp').addEventListener('click', () => {
      setTimeout(function() {
        win._updateLanguage();
      }, 30);
    });
    context.document.getElementById('autoscroll').addEventListener('click', () => {
      setTimeout(function() {
        win._updateLanguage();
      }, 30);
    });
    
    function saveLog() {
      let options = {
       title: language.currentString(58),
       defaultPath: 'terminal_'+ obj.jsl.time.getDateTimeStr() + '.log',
       buttonLabel: language.currentString(58),
       filters :[
        {name: 'Log', extensions: ['log', 'txt']},
        {name: 'All Files', extensions: ['*']}
       ]
      };
      var log_path = obj.jsl.env.showSaveDialogSync(options);
      if(log_path) {
        var data = context.terminal.getLog();
        obj.jsl.env.writeFileSync(log_path, data);
      }
    }
    context.document.getElementById('save-log').addEventListener('click', () => {
      saveLog();
    });
    
    return context;
  }
  
  /**
   * Prompts the user to choose serial options and opens a serial terminal if a valid port is selected.
   * @param {Object} [opts={}] - An optional configuration object for additional settings.
   * @returns {Promise<Object|undefined>} A promise that resolves with the terminal context if a serial port is chosen.
   */
  async chooseSerialTerminal(opts) {
    var [port, baudrate] = await this.chooseSerialOptions();
    if(port) {
      return await this.openSerialTerminal(port, baudrate, opts);
    }
  }
}

exports.PRDC_JSLAB_LIB_SERIAL_DEVICE = PRDC_JSLAB_LIB_SERIAL_DEVICE;