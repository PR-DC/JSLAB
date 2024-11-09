/**
 * @file JSLAB window bridge script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB window bridge.
 */
class PRDC_JSLAB_BRIDGE {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_PLOT class.
   */
  constructor() {
    var obj = this;
    this.requested_close = false;
    
    window.onbeforeunload = function(e) {
      window.onbeforeunload = function() {};
      if(!obj.requested_close) {
        window.opener.jsl.windows._closedWindow(window.wid);
      }
    };
  }
  
  /**
   * Closes the current window or ends the session, setting a flag to indicate that a close was requested.
   */
  close() {
    this.requested_close = true;
    window.close();
  }
}

window.jsl_brdige = new PRDC_JSLAB_BRIDGE();