/**
 * @file JSLAB help module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB help.
 */
class PRDC_JSLAB_HELP {

  /**
   * Initializes the help functionality, setting up event listeners for help menu actions and dialog interactions.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    // Help logic
    $('#help-menu').click(function() { obj.win.gui.help(); });
    
    $('#help-close').click(function() { obj.win.gui.closeHelp(); });
    
    $('#help-container').on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.win.gui.closeHelp();
        e.stopPropagation();
        e.preventDefault();
      }
    });
  }

}

exports.PRDC_JSLAB_HELP = PRDC_JSLAB_HELP