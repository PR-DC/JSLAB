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
    this.search = '';
    this.workspace_cont = document.getElementById('workspace');
    this.search_input = document.getElementById('workspace-search');
    this.context_menu = document.getElementById('workspace-context-menu');
    this.context_menu_inspect = document.getElementById('workspace-context-inspect');
    this.context_variable = undefined;
    
    // Workspace clear button click
    $('#workspace-options .clear').click(function(){
      obj.win.eval.evalCommand('clear');
    });
    
    // Workspace search input
    if(this.search_input) {
      this.search_input.addEventListener('input', function() {
        obj.search = this.value.trim().toLowerCase();
        obj.updateWorkspace();
      });

      this.search_input.addEventListener('keydown', function(e) {
        if(e.key === 'Escape') {
          if(this.value.length) {
            this.value = '';
            obj.search = '';
            obj.updateWorkspace();
            e.preventDefault();
          }
        }
      });
    }

    if(this.context_menu_inspect) {
      this.context_menu_inspect.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        obj.inspectSelectedVariable();
      });
    }

    document.addEventListener('click', function(e) {
      if(!obj.context_menu || obj.context_menu.style.display === 'none') {
        return;
      }
      if(!obj.context_menu.contains(e.target)) {
        obj.hideContextMenu();
      }
    });

    document.addEventListener('keydown', function(e) {
      if(e.key === 'Escape') {
        obj.hideContextMenu();
      }
    });

    if(this.workspace_cont) {
      this.workspace_cont.addEventListener('scroll', function() {
        obj.hideContextMenu();
      });
    }
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
    var search = this.search;
    this.hideContextMenu();
    
    var workspace_table = $('#workspace .table')[0];
    workspace_table.innerHTML = '';
    var cells_size = this.win.panels.workspace_columns.cells_size;
    this.data.forEach(function(v) {
      var variable = (v[0] === undefined || v[0] === null) ? '' : String(v[0]);
      var type = (v[1] === undefined || v[1] === null) ? '' : String(v[1]);
      var value = (v[2] === undefined || v[2] === null) ? '' : String(v[2]);

      if(search.length > 0) {
        var filter_text = (variable + ' ' + type + ' ' + value).toLowerCase();
        if(filter_text.indexOf(search) < 0) {
          return;
        }
      }

      var row = document.createElement('div');
      row.onclick = function() {
        obj.win.command_window.code_input.setValue(this.getAttribute('variable'));
        obj.win.command_window.code_input.focus();
        obj.win.command_window.code_input.setCursor(obj.win.command_window.code_input.lineCount(), 0);
      };
      row.ondblclick = function() {
        obj.win.eval.evalCommand(this.getAttribute('variable'));
      };
      row.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        obj.openContextMenu(this.getAttribute('variable'), e.clientX, e.clientY);
      };
      row.setAttribute('variable', variable);
      row.className = 'row';
      row.innerHTML = '<div class="col col-1" style="width:'+cells_size[0]+'%">' + variable +
        '</div><div class="col col-2" style="width:'+cells_size[1]+'%">' + type +
        '</div><div class="col col-3" style="width:'+cells_size[2]+'%">' + value + '</div>';
      workspace_table.appendChild(row);
    });
  }

  /**
   * Opens workspace row context menu at cursor position.
   * @param {string} variable Variable name.
   * @param {number} left Cursor X in viewport.
   * @param {number} top Cursor Y in viewport.
   */
  openContextMenu(variable, left, top) {
    if(!this.context_menu || !variable) {
      return;
    }

    this.context_variable = variable;
    this.context_menu.style.display = 'block';
    this.context_menu.style.left = '0px';
    this.context_menu.style.top = '0px';

    var rect = this.context_menu.getBoundingClientRect();
    var x = left;
    var y = top;
    var margin = 4;

    if((x + rect.width) > window.innerWidth - margin) {
      x = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if((y + rect.height) > window.innerHeight - margin) {
      y = Math.max(margin, window.innerHeight - rect.height - margin);
    }

    this.context_menu.style.left = x + 'px';
    this.context_menu.style.top = y + 'px';
  }

  /**
   * Hides workspace row context menu.
   */
  hideContextMenu() {
    if(this.context_menu) {
      this.context_menu.style.display = 'none';
    }
    this.context_variable = undefined;
  }

  /**
   * Runs variable inspection command for selected workspace variable.
   */
  inspectSelectedVariable() {
    if(!this.context_variable) {
      this.hideContextMenu();
      return;
    }

    var cmd = 'inspectVariable(' + JSON.stringify(this.context_variable) + ')';
    this.hideContextMenu();

    if(this.win.command_window &&
      typeof this.win.command_window.evalCommandPreserveInput === 'function') {
      this.win.command_window.evalCommandPreserveInput(cmd);
    } else {
      this.win.eval.evalCommand(cmd);
    }
  }
}

exports.PRDC_JSLAB_WORKSPACE = PRDC_JSLAB_WORKSPACE;
