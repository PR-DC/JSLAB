/**
 * @file JSLAB info module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB info.
 */
class PRDC_JSLAB_INFO {

  /**
   * Initializes the information display functionality, setting up event listeners for information menu actions and dialog interactions.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    // Info logic
    $('#info-container .app-version').text('version ' + this.win.app.version);
    $('#info-menu').click(function() { obj.win.gui.info(); });
    $('#info-close').click(function() { obj.win.gui.closeInfo(); });
    $('#info-container').on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.win.gui.closeInfo();
        e.stopPropagation();
        e.preventDefault();
      }
    });
  }

}

exports.PRDC_JSLAB_INFO = PRDC_JSLAB_INFO