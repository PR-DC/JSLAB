/**
 * @file JSLAB library device submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB device submodule.
 */
class PRDC_JSLAB_LIB_DEVICE {
  
  /**
   * Constructs a device submodule object with access to JSLAB's device functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }

  /**
   * Checks if there is a USB device connected with the specified Vendor ID and Product ID.
   * @param {string} VID - Vendor ID of the USB device.
   * @param {string} PID - Product ID of the USB device.
   * @returns {boolean} True if the device is found, false otherwise.
   */
  checkDeviceUSB(VID, PID){
    var val = this.jsl.env.execSync('wmic path win32_pnpsigneddriver get deviceid, driverversion | find "USB\\VID_' + VID + '&PID_' + PID + '"');
    if(val.state == 'success') {
      if(val.data.length) {
        if(this.jsl.debug) {
          this.jsl.env.disp('@checkDeviceUSB: ' + val.data);
        }
        return true; 
      } else {
        return false; 
      }
    } else {
      if(this.jsl.debug) {
        this.jsl.env.error('@checkDeviceUSB: ' + val.data);
      }
      return false; 
    }
  }

  /**
   * Checks for a connected USB device by STM and an optional Product ID.
   * @param {string} [PID='5740'] - Product ID of the USB device, default is for Virtual COM Port.
   * @returns {boolean} True if the device is found, false otherwise.
   */
  checkDeviceSTM(PID = '5740') {
    return this.checkDeviceUSB('0483', PID);
  }
 
  /**
   * Checks if there is a USB device connected using a CH340 chip.
   * @returns {boolean} True if the device is found, false otherwise.
   */
  checkDeviceCH340() {
    return this.checkDeviceUSB('1A86', '7523');
  }

  /**
   * Checks if a specific driver is installed on the system.
   * @param {string} driver_name - Name of the driver to check.
   * @returns {boolean} True if the driver is found, false otherwise.
   */
  checkDriver(driver_name){
    var val = this.jsl.env.execSync('driverquery');
    if(val.state == 'success') {
      var output = val.data.split(/[\r\n]+/);
      var output_lc = output.map(function(x) { return x.toLowerCase(); })
      if(!Array.isArray(driver_name)) {
       driver_name = [driver_name];
      }
      driver_name = driver_name.map(function(x) { return x.toLowerCase(); })
      var data_out = [];
      for(var i = 0; i < driver_name.length; i++) {
        var idx = output_lc.map(function(x) { return x.startsWith(driver_name[i]); }).findIndex(function(x) { return x == true; });
        if(idx >= 0) {
          data_out[i] = output[idx];
        } else {
          data_out[i] = '';
        }
      }
      if(data_out.every(function(x) { return x.length; })) {
        if(this.jsl.debug) {
          this.jsl.env.disp('@checkDriver: ' + data_out);
        }
        return true; 
      } else {
        return false; 
      }
    } else {
      if(this.jsl.debug) {
        this.jsl.env.error('@checkDriver: ' + val.data);
      }
      return false; 
    }
  }

  /**
   * Checks if the drivers for FTDI devices are installed.
   * @returns {boolean} True if the drivers are found, false otherwise.
   */
  checkDriverFTDI() {
    return this.checkDriver(['FTDIBUS', 'FTSER2K']);
  }
 
  /**
   * Checks if the drivers for Silicon Labs CP210x USB to UART bridge are installed.
   * @returns {boolean} True if the drivers are found, false otherwise.
   */
  checkDriverCP210x() {
    return this.checkDriver('silabser');
  }
 
  /**
   * Checks if the drivers for CH340 USB to serial converter are installed.
   * @returns {boolean} True if the drivers are found, false otherwise.
   */
  checkDriverCH340() {
    return this.checkDriver('CH341SER_A64');
  }
}

exports.PRDC_JSLAB_LIB_DEVICE = PRDC_JSLAB_LIB_DEVICE;