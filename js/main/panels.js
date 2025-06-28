/**
 * @file JSLAB panels module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_PANEL } = require('../../lib/PRDC_PANEL/PRDC_PANEL');

/**
 * Class for JSLAB panels.
 */
class PRDC_JSLAB_PANELS {

  /**
   * Initializes main application panels and configures their default sizes and orientations.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    this.columns = new PRDC_PANEL('columns', 'vertical', document.getElementById('panels-container'), [document.getElementById('left-panel'), document.getElementById('right-panel')], config.PANEL_DEFAULT_COLUMNS);
    
    this.left_rows = new PRDC_PANEL('left-rows', 'horizontal', document.getElementById('left-panel'), [document.getElementById('left-top-panel'), document.getElementById('left-middle-panel'), document.getElementById('left-bottom-panel')], config.PANEL_DEFAULT_LEFT_ROWS);
    
    this.workspace_columns = new PRDC_PANEL('workspace-columns', 'vertical', document.getElementById('workspace'), ['#left-middle-panel .col-1', '#left-middle-panel .col-2', '#left-middle-panel .col-3'], config.PANEL_DEFAULT_WORKSPACE_COLUMNS);
    
    this.columns.addSubPanel(this.left_rows);
    this.left_rows.addSubPanel(this.workspace_columns);
    
    // Initialize panels
    window.addEventListener('resize', function() {
      obj.columns.onResize();
    });
  }

  /**
   * Invoked when the application window is ready, triggering an initial resize event to ensure panels are correctly laid out.
   */
  onReady() {
    this.columns.onResize();
  }
}

exports.PRDC_JSLAB_PANELS = PRDC_JSLAB_PANELS;
