/**
 * @file JSLAB browser windows services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WINDOW_MANAGER } = require('../windows/window-manager');
const { PRDC_JSLAB_SIMULATE_ASSETS } = require('./simulate-assets');
var { PRDC_APP_CONFIG } = require('../../config/config');
var app_config = new PRDC_APP_CONFIG();

/**
 * Manages in-page feature windows and scientific document surfaces.
 */
class PRDC_JSLAB_WEB_WINDOW_MANAGER extends PRDC_JSLAB_WINDOW_MANAGER {

  /**
   * Initializes the web window manager instance.
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {HTMLElement} options.taskbar Minimized-window button container.
   * @param {Function} [options.onStateChange]
   */
  constructor(options) {
    super(options.application, id => options.application.language.currentString(id));
    this.container = options.container;
    this.taskbar = options.taskbar;
    this.onStateChange = typeof options.onStateChange == 'function'
      ? options.onStateChange
      : function() {};
    this.windows = new Map();
    this._counter = 0;
    this._z = 20;

  }

  /**
   * Creates a new managed window.
   * @param {Object} options
   * @returns {Object}
   */
  createWindow(options) {
    var obj = this;
    this._counter += 1;
    var id = options.id || ('web-window-' + this._counter);

    if(this.windows.has(id)) {
      this.focus(id);
      return this.windows.get(id);
    }

    var element = document.createElement('div');
    element.className = 'web-window';
    element.dataset.windowId = id;
    var min_width = Math.max(1, Number(options.minWidth) || 250);
    var min_height = Math.max(1, Number(options.minHeight) || 50);
    var initial_width = Math.max(min_width, Number(options.width) || 520);
    var initial_height = Math.max(min_height, Number(options.height) || 360);
    element.style.left = (options.left || 40 + (this._counter % 4) * 24) + 'px';
    element.style.top = (options.top || 30 + (this._counter % 5) * 22) + 'px';
    element.style.width = initial_width + 'px';
    element.style.height = initial_height + 'px';
    element.style.zIndex = String(++this._z);
    element.style.opacity = typeof options.opacity == 'number' ? String(options.opacity) : '1';

    var header = document.createElement('div');
    header.className = 'web-window-header';

    var title = document.createElement('div');
    title.className = 'web-window-title';
    title.textContent = options.title || id;
    header.appendChild(title);

    var actions = document.createElement('div');
    actions.className = 'web-window-actions';

    var minimize = document.createElement('button');
    minimize.type = 'button';
    minimize.className = 'web-window-action web-window-system-action';
    minimize.setAttribute('title-str', 603);
    minimize.title = language.currentString(603);
    minimize.innerHTML = '<img src="./img/win-minimize.svg" alt="">';
    minimize.addEventListener('click', function(event) {
      event.stopPropagation();
      obj.minimize(id);
    });
    actions.appendChild(minimize);

    var maximize = document.createElement('button');
    maximize.type = 'button';
    maximize.className = 'web-window-action web-window-system-action';
    maximize.setAttribute('title-str', 604);
    maximize.title = language.currentString(604);
    maximize.innerHTML = '<img src="./img/win-maximize.svg" alt="">';
    maximize.addEventListener('click', function(event) {
      event.stopPropagation();
      obj.toggleMaximize(id);
    });
    actions.appendChild(maximize);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'web-window-action web-window-system-action close';
    close.setAttribute('title-str', 605);
    close.title = language.currentString(605);
    close.innerHTML = '<img src="./img/win-close.svg" alt="">';
    close.addEventListener('click', function(event) {
      event.stopPropagation();
      obj.close(id);
    });
    actions.appendChild(close);

    header.appendChild(actions);
    element.appendChild(header);

    var iframe = document.createElement('iframe');
    iframe.className = 'web-window-frame';
    if(typeof options.src == 'string' && options.src.length) {
      iframe.src = options.src;
    } else {
      iframe.srcdoc = options.srcdoc || '';
    }
    element.appendChild(iframe);

    var ready = new Promise(function(resolve) {
      iframe.addEventListener('load', function() {
        resolve(iframe.contentWindow);
      }, { once: true });
    });

    this.container.appendChild(element);

    var win = {
      id: id,
      title: options.title || id,
      minimized: false,
      hidden: false,
      focused: false,
      maximized: false,
      movable: options.movable !== false,
      resizable: options.resizable !== false,
      min_width: min_width,
      min_height: min_height,
      aspect_ratio: typeof options.aspect_ratio == 'number' ? options.aspect_ratio : null,
      opacity: typeof options.opacity == 'number' ? options.opacity : 1,
      iframe: iframe,
      element: element,
      header: header,
      ready: ready,
      restore_bounds: null,
      onClose: typeof options.onClose == 'function' ? options.onClose : function() {},
      setTitle: function(new_title) {
        win.title = new_title;
        title.textContent = new_title;
        obj._syncTaskbar();
      }
    };

    this._createResizeHandles(win);
    this._applyResizableState(win);
    this._applyMovableState(win);
    this._attachWindowInteractions(win);
    this.windows.set(id, win);
    this.focus(id);
    this._syncTaskbar();
    this.onStateChange(this.snapshot());
    return win;
  }

  /**
   * Focuses.
   * @param {*} id Id.
   */
  focus(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }

    this.windows.forEach(function(win) {
      win.focused = false;
      win.element.classList.remove('focused');
    });

    target.focused = true;
    target.minimized = false;
    target.hidden = false;
    target.element.classList.add('focused');
    target.element.classList.remove('minimized');
    target.element.classList.remove('hidden');
    target.element.style.zIndex = String(++this._z);
    this._syncTaskbar();
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Shows.
   * @param {*} id Id.
   */
  show(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.hidden = false;
    target.element.classList.remove('hidden');
    return this.focus(id);
  }

  /**
   * Hides.
   * @param {*} id Id.
   */
  hide(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.hidden = true;
    target.focused = false;
    target.element.classList.add('hidden');
    target.element.classList.remove('focused');
    this._syncTaskbar();
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Handles minimize.
   * @param {*} id Id.
   */
  minimize(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.minimized = true;
    target.focused = false;
    target.hidden = false;
    target.element.classList.add('minimized');
    target.element.classList.remove('focused');
    this._syncTaskbar();
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Restores.
   * @param {*} id Id.
   */
  restore(id) {
    if(!this.windows.has(id)) {
      return false;
    }
    return this.focus(id);
  }

  /**
   * Handles center.
   * @param {*} id Id.
   */
  center(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    var size = this.getSize(id);
    target.element.style.left = Math.max(0, (this.container.clientWidth - size[0]) / 2) + 'px';
    target.element.style.top = Math.max(0, (this.container.clientHeight - size[1]) / 2) + 'px';
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Moves top.
   * @param {*} id Id.
   */
  moveTop(id) {
    return this.focus(id);
  }

  /**
   * Sets size.
   * @param {*} id Id.
   * @param {number} width Width.
   * @param {number} height Height.
   */
  setSize(id, width, height) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.element.style.width = Math.max(target.min_width, Number(width) || target.min_width) + 'px';
    target.element.style.height = Math.max(target.min_height, Number(height) || target.min_height) + 'px';
    this._applyAspectRatio(target);
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Sets pos.
   * @param {*} id Id.
   * @param {*} left Left.
   * @param {*} top Top.
   */
  setPos(id, left, top) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.element.style.left = Math.max(0, Number(left) || 0) + 'px';
    target.element.style.top = Math.max(0, Number(top) || 0) + 'px';
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Sets resizable.
   * @param {*} id Id.
   * @param {*} state State.
   */
  setResizable(id, state) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.resizable = !!state;
    this._applyResizableState(target);
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Sets movable.
   * @param {*} id Id.
   * @param {*} state State.
   */
  setMovable(id, state) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.movable = !!state;
    this._applyMovableState(target);
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Sets aspect ratio.
   * @param {*} id Id.
   * @param {*} aspect_ratio Aspect ratio.
   */
  setAspectRatio(id, aspect_ratio) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.aspect_ratio = typeof aspect_ratio == 'number' && isFinite(aspect_ratio) && aspect_ratio > 0
      ? aspect_ratio
      : null;
    this._applyAspectRatio(target);
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Sets opacity.
   * @param {*} id Id.
   * @param {*} opacity Opacity.
   */
  setOpacity(id, opacity) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    var safe_opacity = Math.max(0.15, Math.min(1, Number(opacity) || 1));
    target.opacity = safe_opacity;
    target.element.style.opacity = String(safe_opacity);
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Sets fullscreen.
   * @param {*} id Id.
   * @param {*} state State.
   */
  setFullscreen(id, state) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    if(state) {
      this._maximizeWindow(target);
    } else {
      this._restoreWindow(target);
    }
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Sets title.
   * @param {*} id Id.
   * @param {string} title Title.
   */
  setTitle(id, title) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.setTitle(String(title || ''));
    return true;
  }

  /**
   * Returns size.
   * @param {*} id Id.
   */
  getSize(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    return [
      Math.round(target.element.getBoundingClientRect().width),
      Math.round(target.element.getBoundingClientRect().height)
    ];
  }

  /**
   * Returns pos.
   * @param {*} id Id.
   */
  getPos(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    return [
      parseFloat(target.element.style.left) || 0,
      parseFloat(target.element.style.top) || 0
    ];
  }

  /**
   * Toggles maximize.
   * @param {*} id Id.
   */
  toggleMaximize(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    if(target.maximized) {
      this._restoreWindow(target);
    } else {
      this._maximizeWindow(target);
    }
    this.focus(id);
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Closes.
   * @param {*} id Id.
   */
  close(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    try {
      var before_close = target.iframe &&
        target.iframe.contentWindow &&
        target.iframe.contentWindow.__JSLAB_WEB_BEFORE_CLOSE__;
      if(typeof before_close == 'function' && before_close() === false) {
        return false;
      }
    } catch(err) {
      console.error(err);
    }
    target.element.remove();
    this.windows.delete(id);
    try {
      target.onClose(target);
    } catch(err) {
      console.error(err);
    }
    this._syncTaskbar();
    this.onStateChange(this.snapshot());
    return true;
  }

  /**
   * Returns a snapshot of the current state.
   */
  snapshot() {
    return [...this.windows.values()].map(function(win) {
      return {
        id: win.id,
        title: win.title,
        minimized: win.minimized,
        hidden: win.hidden,
        focused: win.focused,
        maximized: win.maximized
      };
    });
  }

  /**
   * Attaches window interactions.
   * @param {*} win Win.
   */
  _attachWindowInteractions(win) {
    var obj = this;
    var drag_state = null;
    var resize_state = null;
    var interaction_pointer_id = null;
    var interaction_target = null;

    function beginInteraction(target, pointer_id) {
      interaction_pointer_id = pointer_id;
      interaction_target = target;
      if(win.iframe) {
        win.iframe.style.pointerEvents = 'none';
      }
      document.body.classList.add('web-window-interacting');
      if(target && typeof target.setPointerCapture == 'function') {
        try {
          target.setPointerCapture(pointer_id);
        } catch{}
      }
    }

    function endInteraction(target) {
      var pointer_id = interaction_pointer_id;
      interaction_pointer_id = null;
      interaction_target = null;
      if(target && pointer_id !== null &&
          typeof target.releasePointerCapture == 'function') {
        try {
          if(typeof target.hasPointerCapture != 'function' || target.hasPointerCapture(pointer_id)) {
            target.releasePointerCapture(pointer_id);
          }
        } catch{}
      }
      if(drag_state || resize_state) {
        obj.onStateChange(obj.snapshot());
      }
      drag_state = null;
      resize_state = null;
      if(win.iframe) {
        win.iframe.style.pointerEvents = '';
      }
      document.body.classList.remove('web-window-interacting');
    }

    win.element.addEventListener('pointerdown', function() {
      obj.focus(win.id);
    });

    win.header.addEventListener('pointerdown', function(event) {
      if(!win.movable || win.maximized || event.target.closest('.web-window-actions')) {
        return;
      }
      obj.focus(win.id);
      drag_state = {
        start_x: event.clientX,
        start_y: event.clientY,
        left: parseFloat(win.element.style.left) || 0,
        top: parseFloat(win.element.style.top) || 0
      };
      beginInteraction(win.header, event.pointerId);
      event.preventDefault();
    });

    win.header.addEventListener('pointermove', function(event) {
      if(!drag_state || interaction_pointer_id !== event.pointerId) {
        return;
      }
      var next_left = drag_state.left + (event.clientX - drag_state.start_x);
      var next_top = drag_state.top + (event.clientY - drag_state.start_y);
      win.element.style.left = Math.max(0, next_left) + 'px';
      win.element.style.top = Math.max(0, next_top) + 'px';
      event.preventDefault();
    });

    win.header.addEventListener('pointerup', function(event) {
      if(interaction_pointer_id === event.pointerId) {
        endInteraction(win.header);
      }
    });

    win.header.addEventListener('pointercancel', function(event) {
      if(interaction_pointer_id === event.pointerId) {
        endInteraction(win.header);
      }
    });

    win.header.addEventListener('lostpointercapture', function() {
      if(interaction_target === win.header) {
        endInteraction(win.header);
      }
    });

    if(Array.isArray(win.resize_handles)) {
      win.resize_handles.forEach(function(handle) {
        handle.addEventListener('pointerdown', function(event) {
          if(!win.resizable || win.maximized) {
            return;
          }
          obj.focus(win.id);
          resize_state = {
            direction: handle.dataset.direction,
            start_x: event.clientX,
            start_y: event.clientY,
            left: parseFloat(win.element.style.left) || 0,
            top: parseFloat(win.element.style.top) || 0,
            width: win.element.getBoundingClientRect().width,
            height: win.element.getBoundingClientRect().height
          };
          beginInteraction(handle, event.pointerId);
          event.preventDefault();
          event.stopPropagation();
        });

        handle.addEventListener('pointermove', function(event) {
          if(!resize_state || interaction_pointer_id !== event.pointerId) {
            return;
          }
          obj._resizeWindow(win, resize_state, event);
          event.preventDefault();
        });

        handle.addEventListener('pointerup', function(event) {
          if(interaction_pointer_id === event.pointerId) {
            endInteraction(handle);
          }
        });

        handle.addEventListener('pointercancel', function(event) {
          if(interaction_pointer_id === event.pointerId) {
            endInteraction(handle);
          }
        });

        handle.addEventListener('lostpointercapture', function() {
          if(interaction_target === handle) {
            endInteraction(handle);
          }
        });
      });
    }
  }

  /**
   * Applies resizable state.
   * @param {*} win Win.
   */
  _applyResizableState(win) {
    win.element.style.minWidth = win.min_width + 'px';
    win.element.style.minHeight = win.min_height + 'px';
    if(Array.isArray(win.resize_handles)) {
      win.resize_handles.forEach(function(handle) {
        handle.style.display = win.resizable ? 'block' : 'none';
      });
    }
  }

  /**
   * Applies movable state.
   * @param {*} win Win.
   */
  _applyMovableState(win) {
    win.header.classList.toggle('static', !win.movable);
  }

  /**
   * Applies aspect ratio.
   * @param {*} win Win.
   */
  _applyAspectRatio(win) {
    if(!win.aspect_ratio) {
      win.element.style.aspectRatio = '';
      return;
    }
    win.element.style.aspectRatio = String(win.aspect_ratio);
  }

  /**
   * Creates resize handles.
   * @param {*} win Win.
   */
  _createResizeHandles(win) {
    var directions = ['n', 'e', 's', 'w', 'nw', 'ne', 'sw', 'se'];
    win.resize_handles = directions.map(function(direction) {
      var handle = document.createElement('div');
      handle.className = 'web-window-resize-handle ' + direction;
      handle.dataset.direction = direction;
      win.element.appendChild(handle);
      return handle;
    });
  }

  /**
   * Resizes window.
   * @param {*} win Win.
   * @param {*} resize_state Resize state.
   * @param {Object} event Event.
   */
  _resizeWindow(win, resize_state, event) {
    var min_width = win.min_width;
    var min_height = win.min_height;
    var container_width = this.container.clientWidth;
    var container_height = this.container.clientHeight;
    var dx = event.clientX - resize_state.start_x;
    var dy = event.clientY - resize_state.start_y;
    var left = resize_state.left;
    var top = resize_state.top;
    var right = resize_state.left + resize_state.width;
    var bottom = resize_state.top + resize_state.height;
    var dir = resize_state.direction;

    if(dir.includes('e')) {
      right = resize_state.left + resize_state.width + dx;
    }
    if(dir.includes('s')) {
      bottom = resize_state.top + resize_state.height + dy;
    }
    if(dir.includes('w')) {
      left = resize_state.left + dx;
    }
    if(dir.includes('n')) {
      top = resize_state.top + dy;
    }

    left = Math.max(0, Math.min(left, container_width - min_width));
    top = Math.max(0, Math.min(top, container_height - min_height));
    right = Math.max(left + min_width, Math.min(right, container_width));
    bottom = Math.max(top + min_height, Math.min(bottom, container_height));

    var width = right - left;
    var height = bottom - top;

    if(win.aspect_ratio) {
      var aspect = win.aspect_ratio;
      if(dir == 'n' || dir == 's') {
        width = height * aspect;
      } else if(dir == 'e' || dir == 'w') {
        height = width / aspect;
      } else {
        if(Math.abs(dx) >= Math.abs(dy * aspect)) {
          height = width / aspect;
        } else {
          width = height * aspect;
        }
      }

      width = Math.max(min_width, width);
      height = Math.max(min_height, height);

      if(dir.includes('w')) {
        left = right - width;
      } else {
        right = left + width;
      }

      if(dir.includes('n')) {
        top = bottom - height;
      } else {
        bottom = top + height;
      }

      if(left < 0) {
        left = 0;
        right = width;
      }
      if(top < 0) {
        top = 0;
        bottom = height;
      }
      if(right > container_width) {
        right = container_width;
        left = right - width;
      }
      if(bottom > container_height) {
        bottom = container_height;
        top = bottom - height;
      }

      width = right - left;
      height = bottom - top;
    }

    win.element.style.left = left + 'px';
    win.element.style.top = top + 'px';
    win.element.style.width = width + 'px';
    win.element.style.height = height + 'px';
  }

  /**
   * Handles maximize window.
   * @param {*} win Win.
   */
  _maximizeWindow(win) {
    if(win.maximized) {
      return;
    }
    win.restore_bounds = {
      left: win.element.style.left,
      top: win.element.style.top,
      width: win.element.style.width,
      height: win.element.style.height
    };
    win.maximized = true;
    win.element.classList.add('maximized');
    win.element.style.left = '0px';
    win.element.style.top = '0px';
    win.element.style.width = this.container.clientWidth + 'px';
    win.element.style.height = this.container.clientHeight + 'px';
  }

  /**
   * Restores window.
   * @param {*} win Win.
   */
  _restoreWindow(win) {
    if(!win.maximized) {
      return;
    }
    win.maximized = false;
    win.element.classList.remove('maximized');
    if(win.restore_bounds) {
      win.element.style.left = win.restore_bounds.left;
      win.element.style.top = win.restore_bounds.top;
      win.element.style.width = win.restore_bounds.width;
      win.element.style.height = win.restore_bounds.height;
    }
  }

  /**
   * Handles sync taskbar.
   */
  _syncTaskbar() {

    var obj = this;
    var minimized_windows = this.snapshot().filter(function(win) {
      return win.minimized;
    });

    this.taskbar.innerHTML = '';
    document.body.classList.toggle('has-minimized-windows', minimized_windows.length > 0);

    minimized_windows.forEach(function(win) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'taskbar-item';
      button.classList.add('minimized');
      button.textContent = win.title;
      button.addEventListener('click', function() {
        obj.restore(win.id);
      });
      obj.taskbar.appendChild(button);
    });
  }

  /**
   * Resolves a versioned compiler API URL without downloading its solver.
   * @returns {Promise<string>} Browser compiler integration URL.
   */
  async _getSimulateLibraryURL() {
    return PRDC_JSLAB_SIMULATE_ASSETS.getLibraryURL();
  }

  /**
   * Opens the shared Simulate model editor and optionally performs a script request.
   * @param {string} filepath Optional project path.
   * @param {Object} options Simulation and animation options.
   * @param {string} request_id Owning script request identity.
   * @returns {Promise<Object>} Completed operation response.
   */
  async _openSimulateWindow(filepath, options, request_id) {
    const definition = this.getFeatureDefinition('simulate');
    const id = 'simulate-window';
    let win = this.application.window_manager.windows.get(id);
    if(!win) {
      let closed;
      const closed_result = new Promise(resolve => {
        closed = resolve;
      });
      const available_width = this.application.window_manager.container.clientWidth;
      const available_height = this.application.window_manager.container.clientHeight;
      const width = Math.min(1100, Math.max(1, available_width - 24));
      const height = Math.min(720, Math.max(1, available_height - 24));
      win = this.application.window_manager.createWindow({ id, title: definition.title,
        width, height, minWidth: Math.min(640, width), minHeight: Math.min(420, height),
        left: Math.max(0, Math.min(12, (available_width - width) / 2)),
        top: Math.max(0, Math.min(12, (available_height - height) / 2)),
        src: new URL('./html/simulate-web.html', document.baseURI).href,
        onClose: () => closed({ success: false, error: this.application.language.currentString(675) }) });
      win.simulate_closed = closed_result;
    }
    this.focusFeatureWindow(win);
    return Promise.race([win.simulate_closed, (async () => {
      await win.ready;
      const api = await win.iframe.contentWindow.__JSLAB_WEB_SIMULATE_READY__;
      if(this.application.window_manager.windows.get(id) !== win) {
        return { success: false, error: this.application.language.currentString(675) };
      }
      if(!api) {
        throw new Error('The Simulate window is unavailable.');
      }
      if(filepath || options) {
        return api.host.run(filepath, options || {}, request_id || '');
      }
      return { success: true };
    })()]);
  }

  /**
   * Opens a new untitled editor file and window.
   */
  async _openNewEditorWindow() {
    var index = 1;
    var file_path;
    do {
      file_path = '/workspace/Untitled-' + index + '.jsl';
      index += 1;
    } while(await this.application.fs.existsFile(file_path));

    await this.application.fs.writeTextFile(file_path, '');
    await this.application._refreshWorkspaceList();
    await this._openEditorWindow(file_path);
  }

  /**
   * Opens an editor window for a workspace file.
   * @param {string} file_path
   * @param {number} [lineno]
   */
  async _openEditorWindow(file_path, lineno) {
    var win = this._ensureEditorWindow();
    this.application.window_manager.show(this.application.editor_window_id);
    this.application.window_manager.focus(this.application.editor_window_id);

    if(typeof file_path == 'string' && file_path.length) {
      var editor_api = await this._getEditorWindowApi(win);
      await editor_api.openFile(String(file_path), Number.isFinite(lineno) ? Number(lineno) : 0);
    }
    return win;
  }

  /**
   * Opens the editor from sandbox code.
   * @param {string} file_path
   * @param {number} [lineno]
   */
  async openEditorFromSandbox(file_path, lineno) {
    if(typeof file_path == 'string' && file_path.length) {
      await this._openEditorWindow(file_path, lineno);
      return true;
    }
    await this._openNewEditorWindow();
    return true;
  }

  /**
   * Returns the shared editor window, creating it if needed.
   * @returns {Object}
   */
  _ensureEditorWindow() {
    const definition = this.getFeatureDefinition('editor');
    var existing = this.application.window_manager.windows.get(this.application.editor_window_id);
    if(existing) {
      return existing;
    }

    return this.application.window_manager.createWindow({
      id: this.application.editor_window_id,
      ...definition,
      srcdoc: this._renderWindowTemplate('editor-web.html', {
        '%WEB_EDITOR_FILE%': '""',
        '%WEB_EDITOR_LINE%': '0'
      }),
      onClose: () => {}
    });
  }

  /**
   * Waits for the shared editor window API.
   * @param {Object} win
   * @returns {Promise<Object>}
   */
  async _getEditorWindowApi(win) {
    await win.ready;
    for(var i = 0; i < 20; i++) {
      try {
        var api = win.iframe.contentWindow && win.iframe.contentWindow.__JSLAB_WEB_EDITOR__;
        if(api && typeof api.openFile == 'function') {
          return api;
        }
      } catch{}
      await new Promise(function(resolve) {
        setTimeout(resolve, 50);
      });
    }
    throw new Error('Editor window API is not available.');
  }

  /**
   * Finds a managed window by its iframe contentWindow.
   * @param {Window} content_window
   * @returns {Object|false}
   */
  _findManagedWindowByContentWindow(content_window) {
    if(!this.application.window_manager || !content_window) {
      return false;
    }
    for(var win of this.application.window_manager.windows.values()) {
      if(win.iframe && win.iframe.contentWindow === content_window) {
        return win;
      }
    }
    return false;
  }

  /**
   * Returns a built-in app asset from the generated web asset map.
   * @param {string} asset_path
   * @returns {string|false}
   */
  getAppAssetSync(asset_path) {
    var normalized = String(asset_path || '').replace(/\\/g, '/').replace(/\/+/g, '/');
    var assets = globalThis.__JSLAB_WEB_APP_ASSETS__ || {};
    if(!Object.prototype.hasOwnProperty.call(assets, normalized)) {
      return false;
    }
    return String(assets[normalized]).split('%WEB_HTML_BASE%').join(this._getWindowHtmlBaseHref());
  }

  /**
   * Opens a managed JSLAB window for the sandbox env.
   * @param {number|string} wid
   * @param {string} file
   * @returns {Object|false}
   */
  openManagedWindow(wid, file) {
    var file_name = this._getWindowTemplateName(file);
    if(!file_name) {
      return false;
    }

    if(file_name == 'editor-web.html') {
      var editor_win = this._ensureEditorWindow();
      this.application.window_manager.show(this.application.editor_window_id);
      this.application.window_manager.focus(this.application.editor_window_id);
      return {
        win: editor_win,
        context: editor_win.iframe.contentWindow,
        ready: editor_win.ready.then(function() {
          return editor_win.iframe.contentWindow;
        })
      };
    }

    var template = this._renderWindowTemplate(file_name, file_name == 'editor-web.html' ? {
      '%WEB_EDITOR_FILE%': '""',
      '%WEB_EDITOR_LINE%': '0'
    } : undefined);
    if(!template) {
      return false;
    }

    var defaults = this._getWindowDefaults(file_name);
    var id = String(wid);
    var win = this.application.window_manager.createWindow({
      id: id,
      title: defaults.title,
      width: defaults.width,
      height: defaults.height,
      minWidth: defaults.minWidth,
      minHeight: defaults.minHeight,
      srcdoc: template,
      onClose: () => {
        if(this.application.sandbox_api && typeof this.application.sandbox_api.notifyWindowClosed == 'function') {
          this.application.sandbox_api.notifyWindowClosed(wid);
        }
      }
    });

    win.ready.then(() => {
      try {
        var content_title = win.iframe.contentDocument && win.iframe.contentDocument.title;
        if(content_title) {
          win.setTitle(content_title);
        }
      } catch{}
      return win.iframe.contentWindow;
    });

    return {
      win: win,
      context: win.iframe.contentWindow,
      ready: win.ready.then(function() {
        return win.iframe.contentWindow;
      })
    };
  }

  /**
   * Closes a managed JSLAB window.
   * @param {number|string} wid
   * @param {Object} [options]
   * @returns {boolean}
   */
  closeManagedWindow(wid, options) {
    var opts = options || {};
    if(wid == 'all') {
      var ids = [...this.application.window_manager.windows.keys()];
      ids.forEach((id) => {
        this.closeManagedWindow(id, opts);
      });
      return true;
    }

    var target = this.application.window_manager.windows.get(String(wid));
    if(!target) {
      return false;
    }
    if(opts.notifySandbox === false) {
      target.onClose = function() {};
    }
    return this.application.window_manager.close(String(wid));
  }

  /**
   * Resolves the browser template name for a requested window file.
   * @param {string} file
   * @returns {string|false}
   */
  _getWindowTemplateName(file) {
    var normalized = String(file || '').replace(/\\/g, '/');
    if(/^https?:\/\//i.test(normalized)) {
      globalThis.open(normalized, '_blank', 'noopener');
      return false;
    }

    var base_name = normalized.split('/').pop();
    if(base_name == 'editor.html') {
      return 'editor-web.html';
    }
    var templates = globalThis.__JSLAB_WEB_WINDOW_TEMPLATES__ || {};
    return Object.prototype.hasOwnProperty.call(templates, base_name) ? base_name : false;
  }

  /**
   * Returns default managed-window dimensions for a template.
   * @param {string} file_name
   * @returns {Object}
   */
  _getWindowDefaults(file_name) {
    var defaults = {
      'blank.html': { title: this.application.language.currentString(607), width: 720, height: 520, minWidth: 250, minHeight: 50 },
      'plotlyjs.html': { title: this.application.language.currentString(608), width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'd3.html': { title: this.application.language.currentString(609), width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'leaflet.html': { title: this.application.language.currentString(610), width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'cesium.html': { title: this.application.language.currentString(611), width: 980, height: 720, minWidth: 250, minHeight: 50 },
      'three.html': { title: /* lang-fixed */ 'THREE', width: 980, height: 720, minWidth: 250, minHeight: 50 },
      'figure.html': { title: this.application.language.currentString(612), width: 900, height: 640, minWidth: 250, minHeight: 50 },
      'mermaid_graph.html': { title: this.application.language.currentString(613), width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'serial_terminal.html': { title: this.application.language.currentString(519), width: 860, height: 620, minWidth: 250, minHeight: 50 },
      'url.html': { title: /* lang-fixed */ 'URL', width: 980, height: 720, minWidth: 250, minHeight: 50 },
      'documentation.html': { title: this.application.language.currentString(252), width: 1120, height: 760, minWidth: 250, minHeight: 50 },
      'presentation-editor.html': { title: this.application.language.currentString(614), width: 920, height: 640, minWidth: 720, minHeight: 500 },
      'editor-web.html': { title: this.application.language.currentString(1), width: 920, height: 640, minWidth: 720, minHeight: 500 }
    };
    return defaults[file_name] || { title: this.application.language.currentString(607), width: 720, height: 520, minWidth: 250, minHeight: 50 };
  }

  /**
   * Renders a generated window template.
   * @param {string} template_name
   * @param {Object} [replacements]
   * @returns {string}
   */
  _renderWindowTemplate(template_name, replacements) {
    var templates = globalThis.__JSLAB_WEB_WINDOW_TEMPLATES__ || {};
    var html = Object.prototype.hasOwnProperty.call(templates, template_name)
      ? templates[template_name]
      : '';
    if(!html) {
      return '';
    }
    html = html.split('%WEB_HTML_BASE%').join(this._getWindowHtmlBaseHref());
    html = html.split('%WEB_DOCS_BASE%').join(this._getDocsBaseHref());
    Object.keys(replacements || {}).forEach(function(key) {
      html = html.split(key).join(replacements[key]);
    });
    return html;
  }

  /**
   * Returns the absolute base href used by srcdoc subwindows.
   * @returns {string}
   */
  _getWindowHtmlBaseHref() {
    try {
      return new URL('./html/', globalThis.location.href).href;
    } catch{
      return './html/';
    }
  }

  /**
   * Returns the absolute base href used by documentation srcdoc windows.
   * @returns {string}
   */
  _getDocsBaseHref() {
    try {
      return new URL('./docs/', globalThis.location.href).href;
    } catch{
      return './docs/';
    }
  }

  /**
   * Brings the existing Editor forward and opens its bottom debugger area.
   */
  async _openEditorDebugger() {
    const win = this._ensureEditorWindow();
    this.application.window_manager.show(this.application.editor_window_id);
    this.application.window_manager.focus(this.application.editor_window_id);
    const api = await this._getEditorWindowApi(win);
    api.updateDebugState(this.application.runtime._workerDebugState());
    api.showDebugger();
    return win;
  }

  /**
 * Opens the common Assistant controller inside a managed browser window.
 */
  async _openAssistantWindow() {
    const definition = this.getFeatureDefinition('assistant');
    const id = 'assistant-window';
    const win = this.windows.get(id) || this.createWindow({ id,
      title: definition.title, width: 520, height: 640,
      minWidth: 360, minHeight: 300, srcdoc: this._renderWindowTemplate('assistant-web.html'),
      onClose: () => {
        this.application.assistant.request('JSLAB_ASSISTANT_CANCEL');
      }
    });
    this.focusFeatureWindow(win);
    await win.ready;
    return win;
  }

  /**
 * Checks whether a managed surface still belongs to the window manager.
 */
  _isWindowClosed(win) {
    return this.windows.get(win.id) !== win;
  }

  /**
 * Shows and focuses a feature's in-page window surface.
 */
  _showWindowSurface(win) {
    this.show(win.id);
    this.focus(win.id);
  }
}

exports.PRDC_JSLAB_WEB_WINDOW_MANAGER = PRDC_JSLAB_WEB_WINDOW_MANAGER;
