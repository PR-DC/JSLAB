/**
 * @file Simulate diagram context actions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_DOM } = require('../other-shared/dom');

/**
 * Connects diagram context menus to the existing model editing controllers.
 */
class PRDC_JSLAB_SIMULATE_CONTEXT_MENU {

  /**
   * Connects diagram and model-tree context actions and dismissal events.
   */
  _bindContextMenuEvents() {
    this.context_menu = document.createElement('ul');
    this.context_menu.id = 'simulate-context-menu';
    this.context_menu.setAttribute('role', 'menu');
    this.context_menu.style.display = 'none';
    document.body.appendChild(this.context_menu);
    document.addEventListener('pointerdown', event => PRDC_JSLAB_DOM.dismissContextMenu(this, event));
    window.addEventListener('blur', () => this.hideContextMenu());
    window.addEventListener('resize', () => this.hideContextMenu());
    this.diagram_svg.addEventListener('wheel', () => this.hideContextMenu(), { passive: true });
    for(const target of [this.diagram_svg, document.getElementById('simulate-tree')]) {
      target.addEventListener('contextmenu', event => this.showContextMenu(event));
    }
    this.context_menu.addEventListener('keydown', event => {
      const buttons = Array.from(this.context_menu.querySelectorAll('button:not(:disabled)'));
      const index = buttons.indexOf(document.activeElement);
      if(event.key == 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.hideContextMenu();
        this.diagram_svg.focus();
      } else if(event.key == 'ArrowDown' || event.key == 'ArrowUp') {
        event.preventDefault();
        buttons[(index + (event.key == 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
      }
    });
  }

  /**
   * Shows actions for the block, connection or empty diagram under the pointer.
   * @param {MouseEvent} event Diagram or model-tree context event.
   */
  showContextMenu(event) {
    event.preventDefault();
    this.hideContextMenu();
    if(this.busy || !this.model || document.querySelector('.simulate-dialog:not([hidden])')) {
      return;
    }
    this.context_menu.replaceChildren();
    const target = event.target.closest('[data-component]');
    const component = target && this.model.components.find(item => item.name == target.dataset.component);
    const wire_target = event.target.closest('[data-connection]');
    const connection = wire_target && this.model.connections.find(item => this.connectionKey(item) == wire_target.dataset.connection);
    if(component) {
      if(!this.selected_components.has(component.name)) {
        this.selectComponent(component.name, false, false);
      }
      this._appendContextAction('properties', 683, () => this.showComponentProperties(component));
      this._appendContextAction('delete', 387, () => this.deleteDiagramSelection(), !!component.inherited);
      if(component.type.includes('.')) {
        this._appendContextAction('library', 691, () => {
          this.showBlockLibrary();
          this.browseLibrary(component.type.slice(0, component.type.lastIndexOf('.')));
        });
      }
    } else if(connection) {
      this.selected_components.clear();
      this.selected_connection = this.connectionKey(connection);
      this.updateComponentSelection();
      this.drawDiagramWires();
      this._appendContextAction('delete', 387, () => this.removeConnectionSource(connection), !!connection.inherited);
    } else {
      const point = event.currentTarget === this.diagram_svg ? this.diagramPoint(event.clientX, event.clientY) : null;
      this._appendContextAction('add-block', 680, () => this.showBlockLibrary(point));
      this._appendContextAction('parameters', 601, () => this.showParameters());
      this._appendContextAction('settings', 9, () => this.showSimulationSettings());
    }
    this._appendContextAction('select-all', 323, () => {
      this.selected_connection = '';
      this.selected_components = new Set(this.model.components.filter(item => item.placement && item.placement.visible !== false).map(item => item.name));
      this.updateComponentSelection();
      this.drawDiagramWires();
    }, !this.model.components.length);
    this._appendContextAction('fit', 'omjsl-8434', () => this.fitDiagram());
    PRDC_JSLAB_DOM.openContextMenu(this.context_menu, event.clientX, event.clientY);
    this.context_menu.querySelector('button:not(:disabled)')?.focus();
  }

  /**
   * Appends a translated menu item backed by an existing controller operation.
   * @param {string} action Stable action name.
   * @param {number|string} id Translation identifier.
   * @param {Function} callback Controller operation.
   * @param {boolean} [disabled] Whether the operation is unavailable.
   */
  _appendContextAction(action, id, callback, disabled = false) {
    const item = document.createElement('li');
    item.setAttribute('role', 'none');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.setAttribute('role', 'menuitem');
    button.textContent = language.currentString(id);
    button.disabled = disabled;
    button.addEventListener('click', () => {
      this.hideContextMenu();
      if(!this.busy) {
        callback();
      }
    });
    item.appendChild(button);
    this.context_menu.appendChild(item);
  }

  /**
   * Closes the diagram menu before another interaction starts.
   */
  hideContextMenu() {
    this.context_menu.style.display = 'none';
  }
}

exports.PRDC_JSLAB_SIMULATE_CONTEXT_MENU = PRDC_JSLAB_SIMULATE_CONTEXT_MENU;
