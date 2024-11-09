/**
 * @file JSLAB GUI module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB GUI.
 */
class PRDC_JSLAB_GUI {

  /**
   * Initializes the GUI, setting up event listeners for window controls, menu actions, and dialog interactions.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    this.state = 'ready';
    this.stats = {};
    this.stats_num = 0;
    this.fullscreen = false;
    
    this.last_focus = document.activeElement;
    this.status_cont = document.getElementById('status');
    this.sandbox_stats_icon = document.getElementById('sandbox-stats-icon');
    
    document.addEventListener("keydown", function(e) {
      if(e.key == 'F11') {
        obj.toggleFullscreen();
      }
    });
        
    // On devtools-menu click
    $('#devtools-menu').click(function() {
      ipcRenderer.send('MainProcess', 'show-dev-tools');
    });

    // On editor-menu click
    $('#editor-menu').click(function() {
      ipcRenderer.send('MainProcess', 'show-editor');
    });
            
    $("#script-path-dialog-change-dir").click(function() { obj.win.eval.scriptDirDialogButton(2) });
    $("#script-path-dialog-save").click(function() { obj.win.eval.scriptDirDialogButton(1) });
    $("#script-path-dialog-run").click(function() { obj.win.eval.scriptDirDialogButton(0) });
    
    // Window controls    
    window.addEventListener('resize', function() {
      // Detect change of maximize
      obj.maximized = ipcRenderer.sendSync('sync-message', 'is-maximized-win');
      if(obj.maximized) {
       $("#win-restore img").attr('src', '../img/win-restore.svg');
      } else {
       $("#win-restore img").attr('src', '../img/win-maximize.svg');
      }
    }, true);
    
    $("#win-close").click(function() {
      obj.win.close();
    });
    
    $("#win-restore").click(function() {
      obj.toggleFullscreen(false);
      obj.maximized = !obj.maximized;
      if(obj.maximized) {
       ipcRenderer.send('MainProcess', 'maximize-win');
      } else {
       ipcRenderer.send('MainProcess', 'restore-win');
      }
    });
    
    $("#win-minimize").click(function() {
      obj.toggleFullscreen(false);
      ipcRenderer.send('MainProcess', 'minimize-win');
    });
    window.dispatchEvent(new Event('resize'));
  }

  /**
   * Invoked when the GUI is ready, performing initial UI setup tasks such as fading in the window.
   */
  onReady() {
    // Fade in window
    ipcRenderer.send('MainProcess', 'fade-in-win');
  }

  /**
   * Toggles the fullscreen state of the application window.
   * @param {boolean} [fullscreen] Optional. Specifies the fullscreen state. If not provided, the state is toggled based on the current state.
   */
  toggleFullscreen(fullscreen) {
    if(fullscreen == null) {
      fullscreen = !this.fullscreen;
    }
    if(fullscreen) {
      ipcRenderer.send('MainProcess', 'set-fullscreen', true);
    } else {
      ipcRenderer.send('MainProcess', 'set-fullscreen', false);
    }
    this.fullscreen = fullscreen;
  }
  
  /**
   * Updates the status displayed in the status bar of the application.
   * @param {string} state The current state to display.
   * @param {string} txt The text to display in the status bar.
   */
  setStatus(state, txt) {
    this.state = state;
    $(this.status_cont).html(txt);
    this.setStatsIcon();
  }
  
  /**
   * Resets the stats data to initial values.
   */
  resetStats() {
    this.setStatus('ready', language.string(87));
    var stats = {
      'required_modules': 0,
      'promises': 0,
      'timeouts': 0,
      'immediates': 0,
      'intervals': 0,
      'animation_frames': 0,
      'idle_callbacks': 0
    }
    this.setStats(stats);
  }
  
  /**
   * Updates the statistics displayed in the GUI, such as the number of active promises, timeouts, and intervals.
   * @param {object} stats An object containing statistical information to display.
   */
  setStats(stats) {
    this.stats = stats;
    $('#sandbox-required-modules-num').text(stats['required_modules']);
    $('#sandbox-promises-num').text(stats['promises']);
    $('#sandbox-timeouts-num').text(stats['timeouts']);
    $('#sandbox-immediates-num').text(stats['immediates']);
    $('#sandbox-intervals-num').text(stats['intervals']);
    $('#sandbox-animation-frames-num').text(stats['animation_frames']);
    $('#sandbox-idle-callbacks-num').text(stats['idle_callbacks']);
    this.stats_num = stats['promises']+stats['timeouts']+stats['immediates']+
      stats['intervals']+stats['animation_frames']+stats['idle_callbacks'];
    this.setStatsIcon();
  }

  /**
   * Updates the visibility and appearance of the statistics icon based on the current application state and stats.
   */
  setStatsIcon() {
    this.sandbox_stats_icon.className = '';
    if(this.state == 'ready') {
      if(this.stats_num > 0) {
        this.sandbox_stats_icon.classList.add('async-busy');
      } else {
        this.sandbox_stats_icon.classList.add('ready');
      }
    } else {
      this.sandbox_stats_icon.classList.add('busy');
    }
  }
  
  /**
   * Opens a specified dialog within the application.
   * @param {jQuery} e The jQuery object representing the dialog to open.
   */
  openDialog(e) {
    if(!e.is(':visible')) {
      this.last_focus = document.activeElement;
      $('.main-dialog').fadeOut(300, 'linear');
      e.fadeIn(300, 'linear', function() {
        e.focus();
      });
    }
  }
 
  /**
   * Closes a specified dialog within the application.
   * @param {jQuery} e The jQuery object representing the dialog to close.
   */
  closeDialog(e) {
    e.fadeOut(300, 'linear');
    $(this.last_focus).focus();
  } 

  /**
   * Opens the paths menu dialog, providing quick access to saved and frequently used paths.
   */
  openPathsMenu() {
    this.openDialog($('#paths-container'));
  }
  
  /**
   * Closes the paths menu dialog.
   */
  closePathsMenu() {
    this.closeDialog($('#paths-container'));
  }

  /**
   * Opens the help dialog, providing access to application documentation or assistance.
   */
  help() {
    this.openDialog($('#help-container'));
  }

  /**
   * Closes the help dialog.
   */
  closeHelp() {
    this.closeDialog($('#help-container'));
  }

  /**
   * Opens the application info dialog, displaying information about the application.
   */
  info() {
    this.openDialog($('#info-container'));
  }

  /**
   * Closes the application info dialog.
   */
  closeInfo() {
    this.closeDialog($('#info-container'));
  }

  /**
   * Opens the settings dialog, allowing the user to configure application settings.
   */
  settings() {
    this.openDialog($('#settings-container'));
  }

  /**
   * Closes the settings dialog.
   */
  closeSettings() {
    this.closeDialog($('#settings-container'));
  }
  
  /**
   * Changes the application language to the specified language ID.
   * @param {number} id The ID of the language to switch to.
   */
  changeLangauge(id) {
    language.set(id);
    ipcRenderer.send('EditorWindow', 'set-language', id);
    ipcRenderer.send('SandboxWindow', 'set-language', id);
  }
}

exports.PRDC_JSLAB_GUI = PRDC_JSLAB_GUI;