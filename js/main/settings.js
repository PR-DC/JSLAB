/**
 * @file JSLAB settings module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB settings.
 */
class PRDC_JSLAB_SETTINGS {

  /**
   * Initializes the settings management functionality, setting up event listeners for settings menu actions and dialog interactions.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    // Settings logic
    $('#settings-menu').click(function() { obj.win.gui.settings(); });
    $('#settings-close').click(function() { obj.win.gui.closeSettings(); });
    $('#settings-container').on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.win.gui.closeSettings();
        e.stopPropagation();
        e.preventDefault();
      }
    });
    
    $('#settings-container .set-langauge').on('change', function() {
      obj.win.gui.changeLangauge($(this).val());
    });
    $("#settings-container .set-langauge").val(language.lang);
  }
}

exports.PRDC_JSLAB_SETTINGS = PRDC_JSLAB_SETTINGS