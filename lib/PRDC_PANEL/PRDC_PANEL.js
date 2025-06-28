/**
 * @file PRDC_PANEL module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */

const Store = require('electron-store');

const store = new Store();

/**
 * Class for panel.
 */
class PRDC_PANEL {
  
  /**
   * Initializes a panel with configurable orientation and resizable sections.
   * @param {string} id - Identifier for the panel, used for saving state.
   * @param {string} orientation - 'vertical' or 'horizontal' layout.
   * @param {HTMLElement} container - The container element for the panel.
   * @param {HTMLElement[]|string[]} elements - Elements or selectors for panel sections.
   * @param {number[]} default_size - Default sizes (in percentages) of the sections.
   * @param {Function} resizeCallback - Resize callback.
   */
  constructor(id, orientation, container, elements, default_size, resizeCallback) {
    let obj = this;
    this.id = id;
    this.orientation = orientation;
    this.container = container;
    this.elements = elements;
    this.default_size = default_size;
    this.resizeCallback = resizeCallback;
    
    this.container_bcr;
    this.cells = elements.length;
    this.cells_size = [];
    this.sub_panels = [];
    
    this.setContainerBCR();
    
    if(orientation == 'vertical') {
      this.attr_pos = 'left';
      this.attr_size = 'width';
      this.attr_axis = 'X';
      this.attr_cont_size = 'clientWidth';
    } else if(orientation == 'horizontal') {
      this.attr_pos = 'top';
      this.attr_size = 'height';
      this.attr_axis = 'Y';
      this.attr_cont_size = 'clientHeight';
    }
        
    // Get cell sizes in %
    this.cells_size = store.get('panel-' + this.id);
    if(!this.cells_size) {
      this.cells_size = this.default_size;
    }

    var pos_resizer = 0;
    var pos_cell = 0;
    for(let i = 0; i < this.cells; i++) {
      // Create resizer element
      if(i < this.cells-1) {
        let resizer = document.createElement('div');
        resizer.classList.add(orientation + '-resizer');
        pos_resizer += this.cells_size[i];
        resizer.style[this.attr_pos] = 'calc('+pos_resizer+'% - '+config.PANEL_RESIZER_WIDTH/2+'px)';
        resizer.style[this.attr_size] = config.PANEL_RESIZER_WIDTH+'px';
        resizer.setAttribute('index', i);
        this.container.appendChild(resizer);
        
        // Create onDrag listener
        resizer.addEventListener('mousedown', (e) => {
          document.body.classList.add('dragging');

          const onMove = (ev) => obj.onResizerDrag(ev, resizer);
          const onUp = () => {
            document.body.classList.remove('dragging');
            document.removeEventListener('mousemove', onMove,  false);
            document.removeEventListener('mouseup',   onUp,    false);
          };

          document.addEventListener('mousemove', onMove, false);
          document.addEventListener('mouseup',   onUp,   false);
        }, false);
      }
      
      // Set cells size and position
      if(typeof this.elements[i] === 'string') {
        document.querySelectorAll(this.elements[i]).forEach(function(element) {
          element.style[obj.attr_pos] = pos_cell+'%';
          element.style[obj.attr_size] = obj.cells_size[i]+'%';
        });
      } else {
        this.elements[i].style[this.attr_pos] = pos_cell+'%';
        this.elements[i].style[this.attr_size] = this.cells_size[i]+'%';
      }
      pos_cell += obj.cells_size[i];
    }
  }
  
  /**
   * Handles window resize events to adjust panel layout.
   */
  onResize() {
    this.setContainerBCR();
    this.sub_panels.forEach(function(sub_panel) {
      sub_panel.onResize();
    });
    if(typeof this.resizeCallback == 'function') {
      this.resizeCallback();
    }
  }
  
  /**
   * Adds a sub-panel for nested panel management.
   * @param {PRDC_PANEL} panel - The sub-panel to add.
   */
  addSubPanel(panel) {
    this.sub_panels.push(panel);
  }
    
  /**
   * Manages drag actions on resizers to adjust panel sections' sizes.
   * @param {MouseEvent} e - The mouse event.
   * @param {HTMLElement} resizer - The resizer element being dragged.
   */
  onResizerDrag(e, resizer) {
    var obj = this;
    var i = Number(resizer.getAttribute('index'));

    var pos = (e['page'+this.attr_axis]-this.container_bcr[this.attr_pos])/this.container[this.attr_cont_size]*100;
    var total_size = this.cells_size[i]+this.cells_size[i+1];
    var size_pre = this.cells_size.slice(0, i).reduce(function(sum, num) { return sum + num; }, 0);
    if(pos < size_pre+config.PANEL_MIN_SIZE) {
      pos = size_pre+config.PANEL_MIN_SIZE;
    } else if(pos > size_pre+total_size-config.PANEL_MIN_SIZE) {
      pos = size_pre+total_size-config.PANEL_MIN_SIZE;
    }
    this.cells_size[i] = pos-size_pre;
    this.cells_size[i+1] = total_size-this.cells_size[i];
    
    // Set resizer position
    resizer.style[this.attr_pos] = 'calc('+pos+'% - '+config.PANEL_RESIZER_WIDTH/2+'px)';
    
     // Set first cell size and position
    if(typeof this.elements[i] === 'string') {
      document.querySelectorAll(this.elements[i]).forEach(function(element) {
        element.style[obj.attr_size] = obj.cells_size[i]+'%';
      });
    } else {
      this.elements[i].style[this.attr_size] = this.cells_size[i]+'%';
    }
    
    // Set second cell size and position
    if(typeof this.elements[i+1] === 'string') {
      document.querySelectorAll(this.elements[i+1]).forEach(function(element) {
        element.style[obj.attr_pos] = pos+'%';
        element.style[obj.attr_size] = obj.cells_size[i+1]+'%';
      });
    } else {
      this.elements[i+1].style[this.attr_pos] = pos+'%';
      this.elements[i+1].style[this.attr_size] = this.cells_size[i+1]+'%';
    }
      
    this.sub_panels.forEach(function(sub_panel) {
      sub_panel.onResize();
    });
    if(typeof this.resizeCallback == 'function') {
      this.resizeCallback();
    }
    store.set('panel-' + this.id, this.cells_size);
  }
  
  /**
   * Updates the container's bounding client rectangle (BCR) for layout calculations.
   */
  setContainerBCR() {
    this.container_bcr = this.container.getBoundingClientRect();
  }
  
  /**
   * Updates the sizes and positions of the panel's sections.
   */
  updateCells() {
    var pos_cell = 0;
    for(let i = 0; i < this.cells; i++) {
      // Set cells size and position
      if(typeof this.elements[i] === 'string') {
        document.querySelectorAll(this.elements[i]).forEach(function(element) {
          element.style[obj.attr_pos] = pos_cell+'%';
          element.style[obj.attr_size] = obj.cells_size[i]+'%';
        });
      } else {
        this.elements[i].style[this.attr_pos] = pos_cell+'%';
        this.elements[i].style[this.attr_size] = this.cells_size[i]+'%';
      }
      pos_cell += obj.cells_size[i];
    }
  }
}

exports.PRDC_PANEL = PRDC_PANEL;