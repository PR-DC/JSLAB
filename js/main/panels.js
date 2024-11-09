/**
 * @file JSLAB panels module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_PANEL } = require('../../lib/PRDC_PANEL/PRDC_PANEL');
const Store = require('electron-store');

const store = new Store();

/**
 * Class for JSLAB panels.
 */
class PRDC_JSLAB_PANELS {

  /**
   * Initializes main application panels and configures their default sizes and orientations.
   * @param {object} win The window object representing the current Electron window.
   */
  constructor(win) {
    var obj = this;
    this.win = win;
    
    this.columns = new PRDC_PANEL('columns', 'vertical', document.getElementById('panels-container'), [document.getElementById('left-panel'), document.getElementById('right-panel')], config.PANEL_DEFAULT_COLUMNS);
    
    this.left_rows = new PRDC_PANEL('left-rows', 'horizontal', document.getElementById('left-panel'), [document.getElementById('left-top-panel'), document.getElementById('left-middle-panel'), document.getElementById('left-bottom-panel')], config.PANEL_DEFAULT_LEFT_ROWS);
    
    this.workspace_columns = new PRDC_PANEL('workspace-columns', 'vertical', document.getElementById('workspace'), ['#left-middle-panel .col-1', '#left-middle-panel .col-2', '#left-middle-panel .col-3'], config.PANEL_DEFAULT_WORKSPACE_COLUMNS);
    
    this.columns.addSubPanel(this.left_rows);
    this.left_rows.addSubPanel(this.workspace_columns);
    
    // Initialize panels
    window.addEventListener('resize', function() {
      obj.columns.onResize();
    });
  }

  /**
   * Invoked when the application window is ready, triggering an initial resize event to ensure panels are correctly laid out.
   */
  onReady() {
    this.columns.onResize();
  }
}

exports.PRDC_JSLAB_PANELS = PRDC_JSLAB_PANELS

/**
 * Represents a single resizable panel within the application. Supports resizing, orientation configuration, and nesting of sub-panels.
 */
class PRDC_JSLAB_PANEL {
  
  /**
   * Initializes a new panel with specified configuration.
   * @param {string} id Unique identifier for the panel.
   * @param {string} orientation Panel orientation ('vertical' or 'horizontal').
   * @param {HTMLElement} container DOM element serving as the container for this panel.
   * @param {Array<HTMLElement|string>} elements Array of DOM elements or selectors representing the child elements of this panel.
   * @param {Array<number>} default_size Array of numbers representing the default sizes (in percentages) of the panel's child elements.
   */
  constructor(id, orientation, container, elements, default_size) {
    let obj = this;
    this.id = id;
    this.orientation = orientation;
    this.container = container;
    this.elements = elements;
    this.default_size = default_size;
    
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
        resizer.classList.add(orientation + '-resizer')
        pos_resizer += this.cells_size[i];
        resizer.style[this.attr_pos] = 'calc('+pos_resizer+'% - '+config.PANEL_RESIZER_WIDTH/2+'px)';
        resizer.style[this.attr_size] = config.PANEL_RESIZER_WIDTH+'px';
        resizer.setAttribute('index', i);
        this.container.appendChild(resizer);
        
        // Create onDrag listener
        let fun = function(e) {
          obj.onResizerDrag(e, resizer);
        };
        resizer.addEventListener('mousedown', function() {
          document.addEventListener('mousemove', fun, false);
          document.addEventListener('mouseup', function mouseUp() {
            document.removeEventListener('mousemove', fun, false);
            document.removeEventListener('mousemove', mouseUp, false);
          }, false);
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
   * Handles resizing of the panel, adjusting child elements and sub-panels as necessary.
   */
  onResize() {
    this.setContainerBCR();
    this.sub_panels.forEach(function(sub_panel) {
      sub_panel.onResize();
    });
  }
  
  /**
   * Adds a sub-panel to the current panel, establishing a parent-child relationship for nested panel layouts.
   * @param {PRDC_JSLAB_PANEL} panel The sub-panel to add.
   */
  addSubPanel(panel) {
    this.sub_panels.push(panel);
  }
    
  /**
   * Handles drag events for resizing the panel, updating sizes and positions of child elements and persisting changes.
   * @param {Event} e The mouse event associated with the drag.
   * @param {HTMLElement} resizer The resizer element being dragged.
   */
  onResizerDrag(e, resizer) {
    var obj = this;
    var i = Number(resizer.getAttribute('index'));

    var pos = (e['page'+this.attr_axis]-this.container_bcr[this.attr_pos])/this.container[this.attr_cont_size]*100;
    var total_size = this.cells_size[i]+this.cells_size[i+1];
    var size_pre = this.cells_size.slice(0, i).reduce(function(sum, num) { return sum + num; }, 0)
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
    store.set('panel-' + this.id, this.cells_size);
  }
  
  /**
   * Updates the bounding client rectangle (BCR) of the panel container, used in calculating sizes and positions.
   */
  setContainerBCR() {
    this.container_bcr = this.container.getBoundingClientRect();
  }
  
  /**
   * Updates the sizes and positions of the panel's child elements based on the current panel configuration.
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
