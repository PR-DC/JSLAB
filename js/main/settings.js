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
    
    $('#settings-container .set-language').on('change', function() {
      obj.win.gui.changeLangauge($(this).val());
    });
    $("#settings-container .set-language").val(language.lang);

    this.refreshAssistantSettings();

    $('#settings-container .clear-openai-api-key').on('click', async function() {
      await obj._setAssistantSettings({ clear: true });
      $('#settings-container .openai-api-key').val('');
      obj.refreshAssistantSettings();
    });
    
    $('#settings-container .change-settings').on('click', async function() {
      obj.win.command_history.setMaxSize($('#settings-container .N-history-max').val());
      var token = $('#settings-container .openai-api-key').val().trim();
      if(token) {
        await obj._setAssistantSettings({ api_key: token });
        $('#settings-container .openai-api-key').val('');
      }
      obj.win.gui.closeSettings();
      await obj.refreshAssistantSettings();
    });
  }

  /** Reads only whether a token is saved; plaintext never returns to the renderer. */
  async refreshAssistantSettings() {
    try {
      var settings = await this._getAssistantSettings();
      $('#openai-api-key-status').toggle(!!settings.has_api_key);
      $('#settings-container .clear-openai-api-key').toggle(!!settings.has_api_key);
    } catch(error) {
      $('#openai-api-key-status').hide();
      $('#settings-container .clear-openai-api-key').hide();
    }
  }

  /** Invokes the desktop settings handler when available. */
  _getAssistantSettings() {
    try {
      var ipc = require('electron').ipcRenderer;
      if(ipc && typeof ipc.invoke == 'function') return ipc.invoke('JSLAB_ASSISTANT_SETTINGS_GET');
    } catch(error) {}
    return Promise.resolve({ has_api_key: false });
  }

  /** Saves or clears the encrypted desktop token. */
  _setAssistantSettings(settings) {
    try {
      var ipc = require('electron').ipcRenderer;
      if(ipc && typeof ipc.invoke == 'function') return ipc.invoke('JSLAB_ASSISTANT_SETTINGS_SET', settings);
    } catch(error) {}
    return Promise.reject(new Error('Assistant settings are unavailable.'));
  }
}

exports.PRDC_JSLAB_SETTINGS = PRDC_JSLAB_SETTINGS
