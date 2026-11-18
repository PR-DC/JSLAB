/**
 * @file JSLAB GUI module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


/**
 * Class for JSLAB GUI.
 */
class PRDC_JSLAB_MAIN_WINDOW_UI {

  /**
   * Initializes the GUI, setting up event listeners for window controls, menu actions, and dialog interactions.
   * @param {object} win The window object representing the owning window controller.
   */
  constructor(win) {
    const host = win.platform.host;
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

    for(const [selector, action] of Object.entries({
      '#devtools-menu': 'show-dev-tools', '#editor-menu': 'show-editor',
      '#simulate-menu': 'show-simulate', '#assistant-menu': 'show-assistant'
    })) {
      $(selector).click(() => host.send('MainProcess', action));
    }

    $("#script-path-dialog-change-dir").click(function() {
      obj.win.eval.scriptDirDialogButton(2);
    });
    $("#script-path-dialog-save").click(function() {
      obj.win.eval.scriptDirDialogButton(1);
    });
    $("#script-path-dialog-run").click(function() {
      obj.win.eval.scriptDirDialogButton(0);
    });


    // Help logic
    $('#help-menu').click(function() {
      obj.help();
    });

    $('#help-close').click(function() {
      obj.closeHelp();
    });

    $('#help-container').on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.closeHelp();
        e.stopPropagation();
        e.preventDefault();
      }
    });


    // Info logic
    $('#info-container .app-version').html('<span lang-str="8">' + language.currentString(8) + '</span> ' + this.win.app.version);
    $('#info-menu').click(function() {
      obj.info();
    });
    $('#info-close').click(function() {
      obj.closeInfo();
    });
    $('#info-container').on('keydown', function(e) {
      if(e.key == 'Escape') {
        // ESC
        obj.closeInfo();
        e.stopPropagation();
        e.preventDefault();
      }
    });

    this.win.platform.bindWindowControls(this, () => this.win.close());
  }

  /**
   * Invoked when the GUI is ready, performing initial UI setup tasks such as fading in the window.
   */
  onReady() {
    const host = this.win.platform.host;
    // Fade in window
    var ipc = host;
    if(ipc && typeof ipc.send === 'function') {
      ipc.send('MainProcess', 'fade-in-win');
    }
  }

  /**
   * Toggles the fullscreen state of the application window.
   * @param {boolean} [fullscreen] Optional. Specifies the fullscreen state. If not provided, the state is toggled based on the current state.
   */
  toggleFullscreen(fullscreen) {
    const host = this.win.platform.host;
    if(fullscreen == null) {
      fullscreen = !this.fullscreen;
    }
    var ipc = host;
    if(fullscreen) {
      if(ipc && typeof ipc.send === 'function') {
        ipc.send('MainProcess', 'set-fullscreen', true);
      }
    } else {
      if(ipc && typeof ipc.send === 'function') {
        ipc.send('MainProcess', 'set-fullscreen', false);
      }
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
    };
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
    this.stats_num = stats['promises'] + stats['timeouts'] + stats['immediates'] +
      stats['intervals'] + stats['animation_frames'] + stats['idle_callbacks'];
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
      $('.main-dialog').fadeOut(this.win.platform.animation_duration ?? 300, 'linear');
      for(const button of document.querySelectorAll('[aria-controls]')) {
        if(document.getElementById(button.getAttribute('aria-controls'))?.classList.contains('main-dialog')) {
          button.setAttribute('aria-expanded', String(button.getAttribute('aria-controls') === e[0].id));
        }
      }
      e.fadeIn(this.win.platform.animation_duration ?? 300, 'linear', function() {
        e.focus();
      });
    }
  }

  /**
   * Closes a specified dialog within the application.
   * @param {jQuery} e The jQuery object representing the dialog to close.
   */
  closeDialog(e) {
    e.fadeOut(this.win.platform.animation_duration ?? 300, 'linear');
    for(const button of document.querySelectorAll('[aria-controls]')) {
      if(button.getAttribute('aria-controls') === e[0].id) {
        button.setAttribute('aria-expanded', 'false');
      }
    }
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
    const host = this.win.platform.host;
    language.set(id);
    var ipc = host;
    if(ipc && typeof ipc.send === 'function') {
      ipc.send('EditorWindow', 'set-language', id);
      ipc.send('SandboxWindow', 'set-language', id);
      ipc.send('AssistantWindow', 'set-language', id);
      ipc.send('SimulateWindow', 'set-language', id);
      ipc.send('TerminalWindow', 'set-language', id);
    }
  }
}

exports.PRDC_JSLAB_MAIN_WINDOW_UI = PRDC_JSLAB_MAIN_WINDOW_UI;
