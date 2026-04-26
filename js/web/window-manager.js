/**
 * @file In-page window manager for JSLAB web
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

class PRDC_JSLAB_WEB_WINDOW_MANAGER {

  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {Object} options.taskbar
   * @param {Function} [options.onStateChange]
   */
  constructor(options) {
    var obj = this;
    this.container = options.container;
    this.taskbar = options.taskbar;
    this.onStateChange = typeof options.onStateChange == 'function'
      ? options.onStateChange
      : function() {};
    this.windows = new Map();
    this._counter = 0;
    this._z = 20;

    this.taskbar.setActivateHandler(function(window_id) {
      obj.restore(window_id);
    });
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
    minimize.title = 'Minimize';
    minimize.innerHTML = '<img src="./img/win-minimize.svg" alt="">';
    minimize.addEventListener('click', function(event) {
      event.stopPropagation();
      obj.minimize(id);
    });
    actions.appendChild(minimize);

    var maximize = document.createElement('button');
    maximize.type = 'button';
    maximize.className = 'web-window-action web-window-system-action';
    maximize.title = 'Maximize';
    maximize.innerHTML = '<img src="./img/win-maximize.svg" alt="">';
    maximize.addEventListener('click', function(event) {
      event.stopPropagation();
      obj.toggleMaximize(id);
    });
    actions.appendChild(maximize);

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'web-window-action web-window-system-action close';
    close.title = 'Close';
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

  show(id) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.hidden = false;
    target.element.classList.remove('hidden');
    return this.focus(id);
  }

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

  restore(id) {
    if(!this.windows.has(id)) {
      return false;
    }
    return this.focus(id);
  }

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

  moveTop(id) {
    return this.focus(id);
  }

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

  setTitle(id, title) {
    var target = this.windows.get(id);
    if(!target) {
      return false;
    }
    target.setTitle(String(title || ''));
    return true;
  }

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
        } catch {}
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
        } catch {}
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

  _applyResizableState(win) {
    win.element.style.minWidth = win.min_width + 'px';
    win.element.style.minHeight = win.min_height + 'px';
    if(Array.isArray(win.resize_handles)) {
      win.resize_handles.forEach(function(handle) {
        handle.style.display = win.resizable ? 'block' : 'none';
      });
    }
  }

  _applyMovableState(win) {
    win.header.classList.toggle('static', !win.movable);
  }

  _applyAspectRatio(win) {
    if(!win.aspect_ratio) {
      win.element.style.aspectRatio = '';
      return;
    }
    win.element.style.aspectRatio = String(win.aspect_ratio);
  }

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

  _syncTaskbar() {
    this.taskbar.render(this.snapshot());
  }
}

exports.PRDC_JSLAB_WEB_WINDOW_MANAGER = PRDC_JSLAB_WEB_WINDOW_MANAGER;
