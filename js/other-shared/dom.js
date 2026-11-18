/**
 * @file JSLAB common DOM interactions and translated labels
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Shares small DOM behaviors between independent feature controllers.
 */
class PRDC_JSLAB_DOM {
  /**
   * Dismisses a controller's visible context menu after an outside click.
   * @param {Object} controller Menu owner.
   * @param {Event} event Click event.
   */
  static dismissContextMenu(controller, event) {
    const menu = controller.context_menu;
    if(menu && menu.style.display !== 'none' && !menu.contains(event.target)) {
      controller.hideContextMenu();
    }
  }

  /**
   * Appends translated column labels using the parent's owning document.
   * @param {HTMLElement} parent Heading row.
   * @param {Array<number>} ids Translation identifiers.
   * @param {Object} language Translation service.
   */
  static appendLabels(parent, ids, language) {
    for(const id of ids) {
      const cell = parent.ownerDocument.createElement('span');
      cell.textContent = language.currentString(id);
      parent.appendChild(cell);
    }
  }
  /**
   * Shows a context menu within the viewport at the requested cursor position.
   * @param {HTMLElement} menu Context menu.
   * @param {number} left Cursor X.
   * @param {number} top Cursor Y.
   */
  static openContextMenu(menu, left, top) {
    menu.style.display = 'block';
    menu.style.left = '0px';
    menu.style.top = '0px';

    var rect = menu.getBoundingClientRect();
    var x = left;
    var y = top;
    var margin = 4;

    if((x + rect.width) > window.innerWidth - margin) {
      x = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if((y + rect.height) > window.innerHeight - margin) {
      y = Math.max(margin, window.innerHeight - rect.height - margin);
    }

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
  }

}

exports.PRDC_JSLAB_DOM = PRDC_JSLAB_DOM;
