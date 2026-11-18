/**
 * @file Common feature-window definitions and focus policy
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Defines feature windows while hosts provide native or in-page surfaces.
 */
class PRDC_JSLAB_WINDOW_MANAGER {
  /**
   * Connects application state and its translation service.
   * @param {Object} application Application controller.
   * @param {Function} current_string Returns the translated window title.
   */
  constructor(application, current_string) {
    this.application = application;
    this._currentString = current_string;
  }

  /**
   * Returns a fresh feature definition so host layout adjustments stay local.
   * @param {string} feature Feature name.
   * @returns {Object} Document, title, bounds key and default dimensions.
   */
  getFeatureDefinition(feature) {
    const definitions = {
      main: { title_id: 511, file: 'main.html', bounds_key: 'mainWinBounds', minWidth: 720, minHeight: 500 },
      editor: { title_id: 513, file: 'editor.html', bounds_key: 'editorWinBounds', width: 920, height: 640, minWidth: 720, minHeight: 500 },
      assistant: { title_id: 650, file: 'assistant.html', bounds_key: 'assistantWinBounds', width: 760, height: 680, minWidth: 520, minHeight: 420 },
      simulate: { title_id: 673, file: 'simulate.html', bounds_key: 'simulateWinBounds', width: 1180, height: 760, minWidth: 760, minHeight: 500 }
    };
    const definition = definitions[feature];
    if(!definition) {
      throw Error('Unknown feature window: ' + feature);
    }
    return Object.assign({ title: this._currentString(definition.title_id) }, definition);
  }

  /**
   * Applies the same CLI-isolation and closed-window checks on either host.
   * @param {Object} win Host window surface.
   * @returns {boolean} Whether the feature window was shown and focused.
   */
  focusFeatureWindow(win) {
    if(this.application.cli_mode || !win || this._isWindowClosed(win)) {
      return false;
    }
    this._showWindowSurface(win);
    return true;
  }
}

exports.PRDC_JSLAB_WINDOW_MANAGER = PRDC_JSLAB_WINDOW_MANAGER;
