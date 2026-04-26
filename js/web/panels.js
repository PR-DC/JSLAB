/**
 * @file Browser-side panel resizer support for JSLAB web
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var PANEL_RESIZER_WIDTH = 10;
var PANEL_MIN_SIZE = 10;

class PRDC_JSLAB_WEB_PANEL_GROUP {

  constructor(storage, id, orientation, container, elements, default_sizes, resize_callback) {
    this.storage = storage;
    this.id = id;
    this.orientation = orientation;
    this.container = container;
    this.elements = elements;
    this.default_sizes = default_sizes.slice();
    this.resize_callback = resize_callback;
    this.sub_panels = [];
    this.cells = elements.length;
    this.container_bcr = null;

    if(orientation == 'vertical') {
      this.attr_pos = 'left';
      this.attr_size = 'width';
      this.attr_axis = 'X';
      this.attr_cont_size = 'clientWidth';
    } else {
      this.attr_pos = 'top';
      this.attr_size = 'height';
      this.attr_axis = 'Y';
      this.attr_cont_size = 'clientHeight';
    }

    this.cells_size = this._loadSizes();
    this._setContainerBCR();
    this._createResizers();
    this._applyLayout();
  }

  addSubPanel(panel) {
    this.sub_panels.push(panel);
  }

  onResize() {
    this._setContainerBCR();
    this.sub_panels.forEach(function(sub_panel) {
      sub_panel.onResize();
    });
    if(typeof this.resize_callback == 'function') {
      this.resize_callback();
    }
  }

  _loadSizes() {
    var stored = this.storage && typeof this.storage.get == 'function'
      ? this.storage.get('panel-' + this.id, null)
      : null;
    if(Array.isArray(stored) && stored.length == this.cells) {
      return stored.slice();
    }
    return this.default_sizes.slice();
  }

  _saveSizes() {
    if(this.storage && typeof this.storage.set == 'function') {
      this.storage.set('panel-' + this.id, this.cells_size.slice());
    }
  }

  _setContainerBCR() {
    this.container_bcr = this.container.getBoundingClientRect();
  }

  _createResizers() {
    var obj = this;
    var pos_resizer = 0;

    for(var i = 0; i < this.cells - 1; i++) {
      var resizer = document.createElement('div');
      resizer.className = this.orientation + '-resizer';
      pos_resizer += this.cells_size[i];
      resizer.style[this.attr_pos] = 'calc(' + pos_resizer + '% - ' + (PANEL_RESIZER_WIDTH / 2) + 'px)';
      resizer.style[this.attr_size] = PANEL_RESIZER_WIDTH + 'px';
      resizer.setAttribute('data-index', String(i));
      this.container.appendChild(resizer);

      resizer.addEventListener('mousedown', function(e) {
        var current_resizer = e.currentTarget;
        document.body.classList.add('dragging');

        var on_move = function(ev) {
          obj._onResizerDrag(ev, current_resizer);
        };
        var on_up = function() {
          document.body.classList.remove('dragging');
          document.removeEventListener('mousemove', on_move, false);
          document.removeEventListener('mouseup', on_up, false);
        };

        document.addEventListener('mousemove', on_move, false);
        document.addEventListener('mouseup', on_up, false);
        e.preventDefault();
      }, false);
    }
  }

  _applyLayout() {
    var obj = this;
    var pos_cell = 0;

    this.elements.forEach(function(element_or_selector, index) {
      var targets = typeof element_or_selector == 'string'
        ? document.querySelectorAll(element_or_selector)
        : [element_or_selector];
      targets.forEach(function(target) {
        target.style[obj.attr_pos] = pos_cell + '%';
        target.style[obj.attr_size] = obj.cells_size[index] + '%';
      });
      pos_cell += obj.cells_size[index];
    });
  }

  _onResizerDrag(e, resizer) {
    var obj = this;
    var index = Number(resizer.getAttribute('data-index'));
    var pos = (e['page' + this.attr_axis] - this.container_bcr[this.attr_pos]) / this.container[this.attr_cont_size] * 100;
    var total_size = this.cells_size[index] + this.cells_size[index + 1];
    var size_pre = this.cells_size.slice(0, index).reduce(function(sum, num) {
      return sum + num;
    }, 0);

    if(pos < size_pre + PANEL_MIN_SIZE) {
      pos = size_pre + PANEL_MIN_SIZE;
    } else if(pos > size_pre + total_size - PANEL_MIN_SIZE) {
      pos = size_pre + total_size - PANEL_MIN_SIZE;
    }

    this.cells_size[index] = pos - size_pre;
    this.cells_size[index + 1] = total_size - this.cells_size[index];
    resizer.style[this.attr_pos] = 'calc(' + pos + '% - ' + (PANEL_RESIZER_WIDTH / 2) + 'px)';

    [index, index + 1].forEach(function(i) {
      var targets = typeof obj.elements[i] == 'string'
        ? document.querySelectorAll(obj.elements[i])
        : [obj.elements[i]];
      targets.forEach(function(target) {
        if(i == index + 1) {
          target.style[obj.attr_pos] = pos + '%';
        }
        target.style[obj.attr_size] = obj.cells_size[i] + '%';
      });
    });

    this.sub_panels.forEach(function(sub_panel) {
      sub_panel.onResize();
    });
    if(typeof this.resize_callback == 'function') {
      this.resize_callback();
    }
    this._saveSizes();
  }
}

class PRDC_JSLAB_WEB_PANELS {

  constructor(storage) {
    this.storage = storage;
    this.columns = null;
    this.left_rows = null;
    this.workspace_columns = null;
  }

  attach() {
    var obj = this;
    this.columns = new PRDC_JSLAB_WEB_PANEL_GROUP(
      this.storage,
      'columns',
      'vertical',
      document.getElementById('panels-container'),
      [document.getElementById('left-panel'), document.getElementById('right-panel')],
      [20, 80]
    );

    this.left_rows = new PRDC_JSLAB_WEB_PANEL_GROUP(
      this.storage,
      'left-rows',
      'horizontal',
      document.getElementById('left-panel'),
      [document.getElementById('left-top-panel'), document.getElementById('left-middle-panel'), document.getElementById('left-bottom-panel')],
      [100 / 3, 100 / 3, 100 / 3]
    );

    this.workspace_columns = new PRDC_JSLAB_WEB_PANEL_GROUP(
      this.storage,
      'workspace-columns',
      'vertical',
      document.getElementById('workspace'),
      ['#left-middle-panel .col-1', '#left-middle-panel .col-2', '#left-middle-panel .col-3'],
      [50, 25, 25]
    );

    this.columns.addSubPanel(this.left_rows);
    this.left_rows.addSubPanel(this.workspace_columns);

    globalThis.addEventListener('resize', function() {
      obj.columns.onResize();
    });
    this.columns.onResize();
  }
}

exports.PRDC_JSLAB_WEB_PANELS = PRDC_JSLAB_WEB_PANELS;
