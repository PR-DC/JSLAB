/**
 * @file JSLAB workspace module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB workspace.
 */
class PRDC_JSLAB_WORKSPACE {

  /**
   * Initializes the workspace, setting up the UI component and event listeners for workspace interactions.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    this.data = [];
    this.workspace_cont = document.getElementById('workspace');
    
    // Workspace clear button click
    $('#workspace-options .clear').click(function(e){
      obj.win.eval.evalCommand('clear');
    });
  }

  /**
   * Updates the workspace with new data, refreshing the display of variables and their values.
   * @param {Array} data The data to be displayed in the workspace, typically an array of variable information.
   */
  setWorkspace(data) {
    this.data = data;
    this.updateWorkspace();
  }
  
  /**
   * Refreshes the workspace display based on the current data, updating the layout and content of the workspace area.
   */
  updateWorkspace() {
    var obj = this;
    
    var workspace_table = $('#workspace .table')[0];
    workspace_table.innerHTML = '';
    var cells_size = this.win.panels.workspace_columns.cells_size;
    this.data.forEach(function(v) {
      var row = document.createElement('div');
      row.onclick = function() {
        obj.win.command_window.code_input.setValue(this.getAttribute('variable'));
        obj.win.command_window.code_input.focus();
        obj.win.command_window.code_input.setCursor(obj.win.command_window.code_input.lineCount(), 0);
      };
      row.ondblclick = function() {
        obj.win.eval.evalCommand(this.getAttribute('variable'));
      };
      row.setAttribute('variable', v[0]);
      row.className = 'row';
      row.innerHTML = '<div class="col col-1" style="width:'+cells_size[0]+'%">' + v[0] +
        '</div><div class="col col-2" style="width:'+cells_size[1]+'%">' + v[1] +
        '</div><div class="col col-3" style="width:'+cells_size[2]+'%">' + v[2] + '</div>';
      workspace_table.appendChild(row);
    });
  }
}

exports.PRDC_JSLAB_WORKSPACE = PRDC_JSLAB_WORKSPACE