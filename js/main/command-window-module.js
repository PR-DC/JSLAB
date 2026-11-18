/**
 * @file JSLAB Command Window submodule lifecycle
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Binds a Command Window submodule's methods to its owning window.
 */
class PRDC_JSLAB_COMMAND_WINDOW_MODULE {
  /**
   * Connects a submodule to its Command Window.
   * @param {Object} command_window Owning Command Window.
   */
  constructor(command_window) {
    this.command_window = command_window;
    this._bindToCommandWindow();
  }

  /**
   * Exposes each submodule method with the Command Window as its receiver.
   */
  _bindToCommandWindow() {
    for(const name of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
      if(name !== 'constructor' && typeof this[name] === 'function') {
        const bound = this[name].bind(this.command_window);
        this[name] = bound;
        this.command_window[name] = bound;
      }
    }
  }
}

exports.PRDC_JSLAB_COMMAND_WINDOW_MODULE = PRDC_JSLAB_COMMAND_WINDOW_MODULE;
