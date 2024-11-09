/**
 * @file JSLAB app module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const os = require('os');
const cp = require('child_process');

/**
 * Class for JSLAB app.
 */
class PRDC_JSLAB_APP {

  /**
   * Initializes application properties, fetching system and environment information relevant to the application.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    this.version;
    this.user;
    this.documents_path;
    
    // Platform specific code
    this.computer_name;
    switch(process.platform) {
      case 'win32':
        this.computer_name = process.env.COMPUTERNAME;
        break;
      case 'darwin':
        this.computer_name = cp.execSync('scutil --get ComputerName')
          .toString().trim();
        break;
      default:
        this.computer_name = os.hostname();
        break;
    }
    this.version = ipcRenderer.sendSync('sync-message', 'get-app-version');
    this.documents_path = ipcRenderer.sendSync('sync-message', 
      'get-path', 'documents');
    this.user = os.userInfo().username + '@' + this.computer_name;
  }

  /**
   * Generates a formatted string representing the current date and time, suitable for timestamps and logging.
   * @param {number} [t=Date.now()] Optional timestamp to format, defaults to the current time if not provided.
   * @returns {string} A string formatted to represent a date and time, structured as DD_MM_YYYY. HH_MM_SS_mmm.
   */
  getDateTimeFullStr(t = Date.now()) {
    var d = new Date(t);
    return ('0' + d.getDate()).slice(-2) + "_" + 
      ('0' + (d.getMonth() + 1)).slice(-2) + "_" + 
      d.getFullYear() + '. ' + ('0'+d.getHours()).slice(-2) + "_" +  
      ('0'+d.getMinutes()).slice(-2) + "_" +  
      ('0'+d.getSeconds()).slice(-2) + "_" +
      ('00'+d.getMilliseconds()).slice(-3);
  }
}

exports.PRDC_JSLAB_APP = PRDC_JSLAB_APP