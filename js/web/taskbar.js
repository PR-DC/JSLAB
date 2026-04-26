/**
 * @file Bottom taskbar for in-page JSLAB web windows
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

class PRDC_JSLAB_WEB_TASKBAR {

  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.onActivate = function() {};
  }

  /**
   * Sets the activation callback.
   * @param {Function} callback
   */
  setActivateHandler(callback) {
    if(typeof callback == 'function') {
      this.onActivate = callback;
    }
  }

  /**
   * Renders taskbar items from the current window list.
   * @param {Array<Object>} windows
   */
  render(windows) {
    var obj = this;
    var minimized_windows = windows.filter(function(win) {
      return win.minimized;
    });

    this.container.innerHTML = '';
    document.body.classList.toggle('has-minimized-windows', minimized_windows.length > 0);

    minimized_windows.forEach(function(win) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'taskbar-item';
      button.classList.add('minimized');
      button.textContent = win.title;
      button.addEventListener('click', function() {
        obj.onActivate(win.id);
      });
      obj.container.appendChild(button);
    });
  }
}

exports.PRDC_JSLAB_WEB_TASKBAR = PRDC_JSLAB_WEB_TASKBAR;
