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
   * @param {object} win The window object representing the owning window controller.
   */
  constructor(win) {
    var obj = this;
    this.win = win;

    // Settings logic
    $('#settings-menu').click(function() {
      obj.win.gui.settings();
    });
    $('#settings-close').click(function() {
      obj.win.gui.closeSettings();
    });
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
      var requests = [];
      var token = $('#settings-container .openai-api-key').val().trim();
      if(token) {
        requests.push(obj._setAssistantSettings({ api_key: token }));
        $('#settings-container .openai-api-key').val('');
      }
      obj.win.gui.closeSettings();
      await Promise.all(requests);
      await obj.refreshAssistantSettings();
    });
  }

  /**
   * Reads only whether a token is saved; plaintext never returns to the renderer.
   */
  async refreshAssistantSettings() {
    try {
      var settings = await this._getAssistantSettings();
      const status_id = settings.status_string || 663;
      $('#openai-api-key-status str').attr('sid', status_id).text(language.currentString(status_id));
      $('#openai-api-key-status').toggle(!!settings.has_api_key);
      $('#settings-container .clear-openai-api-key').toggle(!!settings.has_api_key);
    } catch(error) {
      $('#openai-api-key-status').hide();
      $('#settings-container .clear-openai-api-key').hide();
    }
  }

  /**
   * Invokes the host settings handler when available.
   */
  _getAssistantSettings() {
    try {
      var ipc = this.win.platform.host;
      if(ipc && typeof ipc.invoke == 'function') {
        return ipc.invoke('JSLAB_ASSISTANT_SETTINGS_GET');
      }
    } catch(error) {}
    return Promise.resolve({ has_api_key: false });
  }

  /**
   * Saves or clears the token through the host credential adapter.
   */
  _setAssistantSettings(settings) {
    try {
      var ipc = this.win.platform.host;
      if(ipc && typeof ipc.invoke == 'function') {
        return ipc.invoke('JSLAB_ASSISTANT_SETTINGS_SET', settings);
      }
    } catch(error) {}
    return Promise.reject(new Error('Assistant settings are unavailable.'));
  }

}

exports.PRDC_JSLAB_SETTINGS = PRDC_JSLAB_SETTINGS;
