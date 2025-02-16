/**
 * @file JSLAB folder navigation module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { pathEqual } = require('path-equal');
const Store = require('electron-store');

const store = new Store();

/**
 * Class for JSLAB folder navigation.
 */
class PRDC_JSLAB_FOLDER_NAVIGATION {

  /**
   * Initializes folder navigation, setting up UI components and event listeners for folder navigation actions.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    this.current_path = undefined;
    this.saved_paths = [];
    this.path_history = [];
    this.i_path_history = 0;
    
    this.folder_navigation_cont = document.getElementById('folder-navigation-container');
    
    // Folder navigation
    $('#folder-navigation-container .address-line').blur(function() {
      obj.onPathInput(this);
    });
    $('#folder-navigation-container .address-line').on('keydown', function(e) {
      if(e.key == 'Enter' && !e.shiftKey) {
        // Enter
        e.stopPropagation();
        e.preventDefault();
        obj.onPathInput(this);
      }
    });
    $('#folder-navigation-container .address-line').focus(function() {
      this.setSelectionRange(0, this.value.length);
    });
    $('#folder-navigation-container .open-folder').click(function() {
      let options = {
       title: language.currentString(148),
       defaultPath: obj.current_path,
       buttonLabel: language.currentString(149),
       properties: ['openDirectory']
      };
      ipcRenderer.invoke('dialog', 'showOpenDialog', options).then(function(result) {
        if(!result.canceled) {
          obj.setPath(result.filePaths[0]);
        }
      }).catch(function(err) {
        obj.win.command_window.errorInternal(err);
      });
    });
    $('#folder-navigation-container .up-folder').click(function() {
      var folders = obj.current_path.split(path.sep);
      folders = folders.filter(function(el) { return el != ''; });
      folders.pop();
      if(folders.length == 1) {
        obj.setPath(folders);
      } else {
        obj.setPath(path.join(...folders));
      }
    });
    $('#folder-navigation-container .previous-folder').click(function() {
      obj.setPath(obj.current_path, obj.i_path_history+1);
    });
    $('#folder-navigation-container .next-folder').click(function() {
      obj.setPath(obj.current_path, obj.i_path_history-1);
    });
    
    // Paths logic
    $('#paths-menu').click(function() {
      obj.updatePathsList();
      obj.win.gui.openPathsMenu();
    });
    $('#paths-close').click(function() {
      obj.win.gui.closePathsMenu();
    });
    $('#paths-container').on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.win.gui.closePathsMenu();
        e.stopPropagation();
        e.preventDefault();
      }
    });
    $('#save-path').click(function() {
      obj.toggleSavePath();
    });
    
    // Script path logic
    $('#script-path-close').click(function() {
      obj.win.gui.closeDialog($('#script-path-container'));
    });
    $('#script-path-container').on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.win.gui.closeDialog($('#script-path-container'));
        e.stopPropagation();
        e.preventDefault();
      }
    });
    
    // Saved paths
    this.saved_paths = store.get('saved_paths');
    if(!this.saved_paths) {
      this.saved_paths = [];
    }
    ipcRenderer.send('SandboxWindow', 'set-saved-paths', this.saved_paths);
    
    // Set path
    var current_path = store.get('current_path');
    if(!current_path || !(fs.existsSync(current_path) && 
        fs.lstatSync(current_path, {throwIfNoEntry: false}).isDirectory())) {
      current_path = this.win.app.documents_path;
    }
    this.setPath(current_path);
  }
 
  /**
   * Processes the input from the address line, navigating to the specified path if it is different from the current path.
   * @param {HTMLElement} e The HTML input element containing the path.
   */
  onPathInput(e) {
    var new_path = $(e).val();
    new_path = this.addPathSep(new_path);
    if(!pathEqual(new_path, this.current_path)) {
      $(e).val(new_path);
      this.setPath(new_path);
    }
  }

  /**
   * Sets the current path for navigation, updating the UI and internal state accordingly. Supports navigation through history via index.
   * @param {string} new_path The new path to set as the current directory.
   * @param {number} [i=undefined] Optional index for navigation through the path history.
   * @param {boolean} [inform_sandbox=true] Whether to inform the sandbox process of the path change.
   */
  setPath(new_path, i = undefined, inform_sandbox = true) {
    new_path = this.addPathSep(new_path);
    if(this.checkDirectory(new_path)) {
      if(!pathEqual(new_path, this.current_path) && i === undefined) {
        this.path_history.unshift(new_path);
        if(this.path_history.length > 1) {
          $('#folder-navigation-container .previous-folder').removeClass('disabled');
          $('#folder-navigation-container .next-folder').addClass('disabled');
          this.i_path_history = 0;
        }
      } else if(i !== undefined && i >= 0 &&
          i < this.path_history.length) {
        this.i_path_history = i;
        new_path = this.path_history[i];
        if(i == 0) {
          $('#folder-navigation-container .next-folder').addClass('disabled'); 
        } else {
          $('#folder-navigation-container .next-folder').removeClass('disabled'); 
        }
        if(i == (this.path_history.length-1)) {
          $('#folder-navigation-container .previous-folder').addClass('disabled'); 
        } else {
          $('#folder-navigation-container .previous-folder').removeClass('disabled'); 
        }
      }

      this.current_path = new_path;
      if(inform_sandbox) {
        ipcRenderer.send('SandboxWindow', 'set-current-path', new_path);
      }
      if(this.saved_paths.indexOf(this.current_path) >= 0) {
        $('#save-path').addClass('saved');
      } else {
        $('#save-path').removeClass('saved');
      }
      this.win.file_browser.showFolderContent(this.current_path, undefined, true);
    } else {
      this.setPath(this.win.app.documents_path);
    }
   this.showCurrentPath();
  }

  /**
   * Saves the current path to the list of saved paths for quick access.
   * @param {string} new_path The path to save.
   * @param {boolean} [inform_sandbox=true] Whether to inform the sandbox process of the update.
   */
  savePath(new_path, inform_sandbox = true) {
    new_path = this.addPathSep(new_path);
    var i = this.saved_paths.indexOf(new_path);
    if(i < 0) {
      this.saved_paths.push(new_path);
    }
    if(inform_sandbox) {
      ipcRenderer.send('SandboxWindow', 'set-saved-paths', this.saved_paths);
    }
  }

  /**
   * Removes a path from the list of saved paths.
   * @param {string} saved_path The path to remove.
   * @param {boolean} [inform_sandbox=true] Whether to inform the sandbox process of the update.
   */
  removePath(saved_path, inform_sandbox = true) {
    saved_path = this.addPathSep(saved_path);
    var i = this.saved_paths.indexOf(saved_path);
    if(i >= 0) {
      this.saved_paths.splice(i, 1);
    }
    if(inform_sandbox) {
      ipcRenderer.send('SandboxWindow', 'set-saved-paths', this.saved_paths);
    }
  }
 
  /**
   * Toggles the current path between being saved and not saved, updating the UI and stored paths accordingly.
   */
  toggleSavePath() {
    var i = this.saved_paths.indexOf(this.current_path);
    if(i >= 0) {
      this.removePath(this.current_path);
      $('#save-path').removeClass('saved');
    } else {
      this.savePath(this.current_path);
      $('#save-path').addClass('saved');
    }
    this.updatePathsList();
  }

  /**
   * Updates the UI to display the current path in the address line and navigation breadcrumbs.
   */
  showCurrentPath() {
    var obj = this;
    $('#folder-navigation-container .address-line').val(this.current_path);
    var folders = this.current_path.split(path.sep);
    folders = folders.filter(function(el) { return el != ''; });
    var address = $('#folder-navigation-container .current-address')[0];
    address.innerHTML = '';
    var full_path = folders[0];
    if(folders.length == 1) {
      $('#folder-navigation-container .up-folder').addClass('disabled');
    } else {
      $('#folder-navigation-container .up-folder').removeClass('disabled');
    }      
    for(var i = 0; i < folders.length; i++) {
      if(i > 0) {
        full_path += path.sep;
        full_path += folders[i];
      }
      if(folders[i] != '') {
        var span = document.createElement('span');
        span.className = 'folder';
        span.title = full_path;
        if(i == 0) {
          span.title += path.sep;
        }
        span.textContent = folders[i];
        span.onclick = function() {
          obj.setPath(this.title);
        };
        address.appendChild(span);
        if(i != (folders.length-1)) {
          $(address).append('<i class="i-next-folder"></i>');
        }
      }
    }
  }
   
  /**
   * Updates the list of saved paths in the UI, allowing users to quickly navigate to frequently accessed directories.
   */
  updatePathsList() {
    var obj = this;
    var cont = $('#paths-container .page-panel ul');
    if(this.saved_paths.length > 0) {
      $(cont).html('');
      this.saved_paths.forEach(function(saved_path) {
        var row = document.createElement('li');
        row.textContent = saved_path;
        row.onclick = function() {
          obj.win.gui.closePathsMenu();
          obj.setPath(saved_path);
        };
        if(!obj.checkDirectory(saved_path)) {
          row.className = 'inactive';
        }
        var btn = document.createElement('img');
        btn.src = '../img/close.svg';
        btn.className = 'remove-path';
        btn.onclick = function(event) {
          event.preventDefault();
          event.stopPropagation();
          if(pathEqual(saved_path, obj.current_path)) {
            $('#save-path').removeClass('saved');
          }
          obj.removePath(saved_path);
          $(this).parent().remove();
          if(obj.saved_paths.length == 0) {
            $(cont).html('<li class="no-paths">'+language.string(140)+'</li>');
          }
        };
        row.appendChild(btn);
        $(cont).append(row);
      });
    } else {
      $(cont).html('<li class="no-paths">'+language.string(140)+'</li>');
    }
  }
  
  /**
   * Handles UI and state updates when a script directory is unknown, prompting the user for action.
   */
  unknownScriptDir() {
    var script_dir = this.addPathSep(path.dirname(this.win.eval.last_script_path));
    $('#script-path').text(script_dir);
    this.win.gui.openDialog($('#script-path-container'));
    return true;
  }
  
  /**
   * Appends a path separator to the end of a path string if it is not already present.
   * @param {string} path_str The path string to modify.
   * @return {string} The modified path string with a trailing separator.
   */
  addPathSep(path_str) {
    if(path_str && path_str[path_str.length-1] != path.sep) {
      path_str += path.sep;
    }
    return path_str;
  }
  
  /**
   * Checks if the specified directory exists and is a directory.
   * @param {string} directory The path to check.
   * @return {boolean} True if the directory exists and is a directory, false otherwise.
   */
  checkDirectory(directory) {
    var lstat = fs.lstatSync(directory, {throwIfNoEntry: false});
    if(lstat != undefined && lstat.isDirectory()) {
      return true;        
    } else {
      return false;
    }
  }
  
  /**
   * Checks if the specified file exists and is a file.
   * @param {string} file_path The path to the file to check.
   * @return {boolean} True if the file exists and is a file, false otherwise.
   */
  checkFile(file_path) {
    var lstat = fs.lstatSync(file_path, {throwIfNoEntry: false});
    if(lstat != undefined && lstat.isFile()) {
      return true;        
    } else {
      return false;
    }
  }
}

exports.PRDC_JSLAB_FOLDER_NAVIGATION = PRDC_JSLAB_FOLDER_NAVIGATION;