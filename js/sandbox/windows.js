/**
 * @file JSLAB library windows submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB windows submodule.
 */
class PRDC_JSLAB_LIB_WINDOWS {
  
  /**
   * Initializes a new instance of the windows submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    this._wid = 0;

    /**
     * Current active window ID.
     * @type {Number}
     */
    this.active_window;
    
    /**
     * Array of open windows.
     * @type {Array}
     */
    this.open_windows = {};
  }

  /**
   * Opens a new window with the specified file.
   * @param {string} file - The path to the HTML file to open in the new window.
   * @returns {number} The identifier (wid) of the newly opened window.
   */
  openWindow(file) {
    if(!this.jsl.env.pathIsAbsolute(file)) {
      file = app_path + '/html/' + file;
    }
    
    if(!this.jsl.env.checkFile(file)) {
      this.jsl.env.error('@openWindow: '+language.string(199));
    }
    
    this._wid += 1;
    var wid = this._wid;
    this.open_windows[wid] = new PRDC_JSLAB_WINDOW(this.jsl, wid);
    this.open_windows[wid].open(file);
    this._setActiveWindow(wid);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return wid;
  }

  /**
   * Opens the developer tools for a specified window by ID if it exists.
   * @param {string} wid - The window ID.
   * @returns {boolean} True if the developer tools were opened; otherwise, false.
   */
  openWindowDevTools(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].openDevTools();
    } else {
      return false;
    }
  }
  
  /**
   * Closes the specified window.
   * @param {number} wid - Identifier for the window to close.
   */
  closeWindows(wid) {
    this.jsl.env.closeWindow(wid);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Closes the specified window.
   * @param {number} wid - Identifier for the window to close.
   */
  closeWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].close();
    } else {
      return false;
    }
  }
  
  /**
   * Retrieves the window object with the specified ID.
   * @param {number} wid - The ID of the window.
   * @returns {Object|boolean} - The window object if found, otherwise false.
   */
  getWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid];
    } else {
      return false;
    }
  }

  /**
   * Retrieves current active window object.
   * @returns {Object|boolean} - The window object if found, otherwise false.
   */
  getCurrentWindow() {
    if(this.open_windows.hasOwnProperty(this.active_window)) {
      return this.open_windows[this.active_window];
    } else {
      return false;
    }
  }

  /**
   * Retrieves current active window object.
   * @returns {Object|boolean} - The window object if found, otherwise false.
   */
  gcw() {
    return this.getCurrentWindow();
  }

  /**
   * Shows the specified window.
   * @param {number} wid - The ID of the window to show.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid, otherwise the result of the show() method.
   */
  showWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].show();
    } else {
      return false;
    }
  }
  
  /**
   * Hides the specified window.
   * @param {number} wid - The ID of the window to hide.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid, otherwise the result of the hide() method.
   */
  hideWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].hide();
    } else {
      return false;
    }
  }
  
  /**
   * Brings the specified window to the foreground.
   * @param {number} wid - The ID of the window to focus.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  focusWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].focus();
    } else {
      return false;
    }
  }
  
  /**
   * Minimizes the specified window.
   * @param {number} wid - The ID of the window to minimize.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid, otherwise the result of the minimize() method.
   */
  minimizeWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].minimize();
    } else {
      return false;
    }
  }
  
  /**
   * Centers the specified window on the screen.
   * @param {number} wid - The ID of the window to center.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid, otherwise the result of the center() method.
   */
  centerWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].center();
    } else {
      return false;
    }
  }
  
  /**
   * Moves the specified window to the top of the window stack.
   * @param {number} wid - The ID of the window to move to the top.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid, otherwise the result of the moveTop() method.
   */
  moveTopWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].moveTop();
    } else {
      return false;
    }
  }
  
  /**
   * Sets the size of the specified window.
   * @param {number} wid - The ID of the window.
   * @param {number} width - The new width of the window.
   * @param {number} height - The new height of the window.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  setWindowSize(wid, width, height) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].setSize(width, height);
    } else {
      return false;
    }
  }
  
  /**
   * Sets the position of the specified window.
   * @param {number} wid - The ID of the window.
   * @param {number} left - The new left position of the window.
   * @param {number} top - The new top position of the window.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  setWindowPos(wid, left, top) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].setPos(left, top);
    } else {
      return false;
    }
  }

  /**
   * Sets the resizable state of the specified window.
   * @param {number} wid - The ID of the window.
   * @param {boolean} state - Whether the window should be resizable.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid, otherwise the result of the setResizable() method.
   */
  setWindowResizable(wid, state) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].setResizable(state);
    } else {
      return false;
    }
  }
  
  /**
   * Sets the movable state of the specified window.
   * @param {number} wid - The ID of the window.
   * @param {boolean} state - Whether the window should be movable.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid, otherwise the result of the setMovable() method.
   */
  setWindowMovable(wid, state) {
    if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].setMovable(state);
    } else {
      return false;
    }
  }
  
  /**
   * Sets the aspect ratio of the specified window.
   * @param {number} wid - The ID of the window.
   * @param {number} aspect_ratio - The desired aspect ratio of the window.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid, otherwise the result of the setAspectRatio() method.
   */
  setWindowAspectRatio(wid, aspect_ratio) {
    if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].setAspectRatio(aspect_ratio);
    } else {
      return false;
    }
  }
  
  /**
   * Sets the opacity of the specified window.
   * @param {number} wid - The ID of the window.
   * @param {number} opacity - The desired opacity level (0 to 1).
   * @returns {boolean|undefined} - Returns false if the window ID is invalid, otherwise the result of the setOpacity() method.
   */
  setWindowOpacity(wid, opacity) {
    if(this.jsl.windows.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].setOpacity(opacity);
    } else {
      return false;
    }
  }
  
  /**
   * Sets the position of the specified window.
   * @param {number} wid - The ID of the window.
   * @param {number} left - The new left position of the window.
   * @param {number} top - The new top position of the window.
   * @returns {boolean|undefined} - Returns false if the window ID is invalid.
   */
  setWindowTitle(wid, title) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].setTitle(title);
    } else {
      return false;
    }
  }
  
  /**
   * Retrieves the size of the specified window.
   * @param {number} wid - The ID of the window.
   * @returns {Array|boolean} - An array [width, height] if the window exists, otherwise false.
   */
  getWindowSize(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].getSize();
    } else {
      return false;
    }
  }
  
  /**
   * Retrieves the position of the specified window.
   * @param {number} wid - The ID of the window.
   * @returns {Array|boolean} - An array [left, top] if the window exists, otherwise false.
   */
  getWindowPos(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      return this.open_windows[wid].getPos();
    } else {
      return false;
    }
  }

  /**
   * Opens window with documentation
   */
  async openDocumentation(query) {
    var wid = this.openWindow('../docs/documentation.html');
    var win = this.open_windows[wid];
    await win.ready;
    if(query) {
      win.context.location.href = '../docs/documentation.html#'+encodeURI(query);
      win.context.location.reload(true);
    }
    win.setTitle('JSLAB / DOCUMENTATION');
  }
  
  /**
   * Opens window with documentation
   */
  async openDoc(query) {
    await this.openDocumentation(query);
  }
  
  /**
   * Opens a new 3D window and imports specified modules.
   * @param {Array<Object>} [imports=[]] - An array of import objects specifying modules to import.
   * @returns {Promise<Object>} A promise that resolves to the window object once imports are ready.
   */
  async openWindow3D(imports = []) {
    var wid = this.openWindow('three.html');
    await this.open_windows[wid].ready;
    var context = this.open_windows[wid].context;
    var script = context.document.createElement('script');
    script.type = 'module';

    const import_statements = [];
    const window_assignments = [];
    var imports_array = [{import: '*', as: 'THREE', from: 'three'}];
    imports_array.push(...imports);
    
    imports_array.forEach((item) => {
      const { import: imported, as, from } = item;

      if(imported === '*') {
        if(!as) {
          this.jsl.env.error('@openWindow3D: '+language.string(200)+from+'.');
        }
        // Namespace import
        import_statements.push(`import * as ${as} from '${from}';`);
        window_assignments.push(`window.${as} = ${as};`);
      } else if(Array.isArray(imported)) {
        // Named imports with multiple specifiers
        const specifiers = imported.join(', ');
        import_statements.push(`import { ${specifiers} } from '${from}';`);
        imported.forEach((spec) => {
          window_assignments.push(`window.${spec} = ${spec};`);
        });
      } else {
        // Single named import
        import_statements.push(`import { ${imported} } from '${from}';`);
        window_assignments.push(`window.${imported} = ${imported};`);
      }
    });
    
    script.textContent = `${import_statements.join('\n')}\n\n${window_assignments.join('\n')}\n window.imports_ready = true;`;
    
    context.imports_ready = false;
    context.document.body.appendChild(script);
    while(!context.imports_ready) {
      await this.jsl.non_blocking.waitMSeconds(1);
    }
    return context;
  }

  /**
   * Opens a Plotly.js window and initializes the plot container.
   * @returns {Promise<Window>} The window object where Plotly.js is loaded and the plot container is available.
   */
  async openPlotlyjs() {
    var wid = this.openWindow('plotlyjs.html');
    await this.open_windows[wid].ready;
    var context = this.open_windows[wid].context;
    context.imports_ready = false;
    while(!context.imports_ready) {
      if(typeof context.Plotly != 'undefined') {
        context.imports_ready = true;
      }
      await this.jsl.non_blocking.waitMSeconds(1);
    }
    context.plot_cont = context.document.getElementById('plot-cont');
    context.plot_cont.style = 'position: absolute;top:0;left:0;right:0;bottom:0;';
    return context;
  }

  /**
   * Opens a window with canvas and D3 and initializes the canvas element.
   * @returns {Promise<Window>} The window object where D3 is loaded and the canvas element is available.
   */
  async openCanvas() {
    var wid = this.openWindow('d3.html');
    await this.open_windows[wid].ready;
    var context = this.open_windows[wid].context;
    context.imports_ready = false;
    while(!context.imports_ready) {
      if(typeof context.d3 != 'undefined') {
        context.imports_ready = true;
      }
      await this.jsl.non_blocking.waitMSeconds(1);
    }
    context.svg = context.document.getElementById('d3-svg');
    context.canvas = context.document.getElementById('d3-canvas');
    context.svg.style = 'position: absolute;top:0;left:0;right:0;bottom:0;';
    context.canvas.style = 'position: absolute;top:0;left:0;right:0;bottom:0;';
    return context;
  }
  
  /**
   * Opens a new blank window.
   * @returns {Promise<Object>} A promise that resolves to the window object once it is ready.
   */
  async openWindowBlank() {
    var wid = this.openWindow('blank.html');
    await this.open_windows[wid].ready;
    var context = this.open_windows[wid].context;
    context.document.custom_style = context.document.getElementById('custom-style');
    return context;
  }
  
  /**
   * Renders a Mermaid diagram in a new window.
   * @param {string} graph_definition - The Mermaid graph definition.
   * @returns {Promise<Object>} A promise that resolves to the window context once the graph is rendered.
   */
  async showMermaidGraph(graph_definition) {
    var wid = this.openWindow('mermaid_graph.html');
    await this.open_windows[wid].ready;
    var context = this.open_windows[wid].context;
    context.document.custom_style = context.document.getElementById('custom-style');
    var graph = context.document.getElementById('graph');
    while(!graph.svg_viewer) {
      await this.jsl.non_blocking.waitMSeconds(1);
    }
    try {
      var res = await context.mermaid.parse(graph_definition);
      if(res) {
        var { svg } = await context.mermaid.render('id1', graph_definition);
        graph.innerHTML = svg;
        graph.svg_viewer.attach();
        graph.style.display = 'block';
      }
    } catch(err) {
      error('@showGraph: '+err);
    }
    return context;
  }
  
  /**
   * Sets the specified window as the active window.
   * @param {number} wid - The identifier of the window to set as active.
   */
  _setActiveWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      this.active_window = wid;
    } else {
      this.active_window = -1;
    }
  }
  
  /**
   * Updates the language of the text elements within all open windows.
   */
  _updateLanguage() {
    Object.values(this.open_windows).forEach(function(win) {
      win._updateLanguage(false);
    });
  }

  /**
   * Closes a window identified by the given ID and updates the active window if necessary.
   * @param {number} wid - The identifier of the window to close.
   */
  _closedWindow(wid) {
    if(this.open_windows.hasOwnProperty(wid)) {
      var new_wid = -1;
      if(this.active_window == wid) {
        var wids = Object.keys(this.open_windows);
        var N = wids.length;
        if(N > 1) {
          if(wids[N-1] !== wid) {
            new_wid = wids[N-1];
          } else {
            new_wid = wids[N-2];
          }
        }
        this._setActiveWindow(new_wid);
      }
      this.open_windows[wid].onClosed();
      delete this.open_windows[wid];
    }
  }
}

exports.PRDC_JSLAB_LIB_WINDOWS = PRDC_JSLAB_LIB_WINDOWS;

/**
 * Class for JSLAB window.
 */
class PRDC_JSLAB_WINDOW {
  
  #jsl;
  
  /**
   * Initializes a new instance of the JSLAB window.
   * @param {Object} jsl - Reference to the main JSLAB object.
   * @param {number} wid - Identifier for the window.
   */
  constructor(jsl, wid) {
    var obj = this;
    
    this.#jsl = jsl;
    this.wid = wid;

    this.context;
    this.dom;
    
    this.opened = false;
    this.ready = new Promise((resolve) => {
      obj._readyResolve = resolve;
    });
    
    this.onClosed = function() {};
  }

  /**
   * Opens the window with the specified file.
   * @param {string} file - The path to the HTML file to open in the window.
   * @returns {Promise<void>} A promise that resolves when the window is opened and ready.
   */
  async open(file) {
    if(!this.opened) {
      var obj = this;
      this.opened = true;
      var [context, ready] = this.#jsl.env.openWindow(this.wid, file);
      this.context = context;
      this.context.getWindow = function() {
        return obj;
      }
      await ready;
      this.dom = this.context.document;
      this._onReady();
    }
  }

  /**
   * Shows the window.
   * @returns {Promise<boolean|undefined>} - Resolves to `true` if the window was shown successfully, or `false` if the window ID is invalid.
   */
  async show() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.showWindow(this.wid);
  }

  /**
   * Hides the window.
   * @returns {Promise<boolean|undefined>} - Resolves to `true` if the window was hidden successfully, or `false` if the window ID is invalid.
   */
  async hide() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.hideWindow(this.wid);
  }
  
  /**
   * Brings focus to the window.
   * @returns {Promise} - Resolves when the window size is focused.
   */
  async focus() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.focusWindow(this.wid);
  }

  /**
   * Minimizes the window.
   * @returns {Promise<boolean|undefined>} - Resolves to `true` if the window was minimized successfully, or `false` if the window ID is invalid.
   */
  async minimize() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.minimizeWindow(this.wid);
  }

/**
 * Centers the window on the screen.
 * @returns {Promise<boolean|undefined>} - Resolves to `true` if the window was centered successfully, or `false` if the window ID is invalid.
 */
  async center() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.centerWindow(this.wid);
  }

  /**
   * Moves the window to the top of the window stack.
   * @returns {Promise<boolean|undefined>} - Resolves to `true` if the window was moved to the top successfully, or `false` if the window ID is invalid.
   */
  async moveTop() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.moveTopWindow(this.wid);
  }
  
  /**
   * Sets the size of the current window.
   * @param {number} width - The desired width of the window.
   * @param {number} height - The desired height of the window.
   * @returns {Promise} - Resolves when the window size is set.
   */
  async setSize(width, height) {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.setWindowSize(this.wid, width, height);
  }
  
  /**
   * Sets the position of the current window.
   * @param {number} left - The desired left position of the window.
   * @param {number} top - The desired top position of the window.
   * @returns {Promise} - Resolves when the window position is set.
   */
  async setPos(left, top) {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.setWindowPos(this.wid, left, top);
  }

  /**
   * Sets the resizable state of the window.
   * @param {boolean} state - Whether the window should be resizable (`true`) or not (`false`).
   * @returns {Promise<boolean|undefined>} - Resolves to `true` if the resizable state was set successfully, or `false` if the window ID is invalid.
   */
  async setResizable(state) {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.setWindowResizable(this.wid, state);
  }

  /**
   * Sets the movable state of the window.
   * @param {boolean} state - Whether the window should be movable (`true`) or not (`false`).
   * @returns {Promise<boolean|undefined>} - Resolves to `true` if the movable state was set successfully, or `false` if the window ID is invalid.
   */
  async setMovable(state) {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.setWindowMovable(this.wid, state);
  }

  /**
   * Sets the aspect ratio of the window.
   * @param {number} aspect_ratio - The desired aspect ratio (width divided by height) for the window.
   * @returns {Promise<boolean|undefined>} - Resolves to `true` if the aspect ratio was set successfully, or `false` if the window ID is invalid.
   */
  async setAspectRatio(aspect_ratio) {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.setWindowAspectRatio(this.wid, aspect_ratio);
  }

  /**
   * Sets the opacity of the window.
   * @param {number} opacity - The desired opacity level of the window (ranging from `0` for fully transparent to `1` for fully opaque).
   * @returns {Promise<boolean|undefined>} - Resolves to `true` if the opacity was set successfully, or `false` if the window ID is invalid.
   */
  async setOpacity(opacity) {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.setWindowOpacity(this.wid, opacity);
  }
  
  /**
   * Sets the title of the current window.
   * @param {string} title - The new title for the window.
   * @returns {Promise<*>} A promise that resolves when the title is set.
   */
  async setTitle(title) {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.setWindowTitle(this.wid, title);
  }
  
  /**
   * Retrieves the size of the current window.
   * @returns {Promise<Array>} - Resolves with an array [width, height].
   */
  async getSize() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.getWindowSize(this.wid);
  }
  
  /**
   * Retrieves the position of the current window.
   * @returns {Promise<Array>} - Resolves with an array [left, top].
   */
  async getPos() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.getWindowPos(this.wid);
  }
  
  /**
   * Closes the current window.
   * @returns {Promise} - Resolves when the window is closed.
   */
  async close() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.closeWindows(this.wid);
  }
  
  /**
   * Opens the developer tools for the current window asynchronously.
   * @returns {Promise<boolean>} A promise that resolves to true when dev tools are opened.
   */
  async openDevTools() {
    await this.#jsl.promiseOrStoped(this.ready);
    return this.#jsl.env.openWindowDevTools(this.wid);
  }

  /**
   * Appends a script to the document head.
   * @param {string} script_path The script's URL.
   */
  addScript(script_path) {
    const script = this.context.document.createElement("script");
    script.src = script_path;
    this.context.document.head.appendChild(script);
  }

  /**
   * Appends a stylesheet link to the document head.
   * @param {string} stylesheet_path The stylesheet's URL.
   */
  addLinkStylesheet(stylesheet_path) {
    const link = this.context.document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylesheet_path;
    this.context.document.head.appendChild(link);
  }
  
  /**
   * Loads the UI script.
   */
  addUI() {
    this.addScript("../js/windows/ui.js");
    this.addLinkStylesheet("../css/ui.css");
  }
  
  /**
   * Handles actions to perform when the window is ready.
   * @returns {void}
   */
  _onReady() {
    var style = this.dom.createElement('style');
    this.dom.head.appendChild(style);
    this.lang_styles = style.sheet;
    this.lang_styles.insertRule("lang { display: none; }", 0);
    this._updateLanguage();
    this._readyResolve(true);
  }
  
  /**
   * Updates the language of the text elements within the DOM.
   * @param {boolean} [flag=true] - Whether to update the language.
   * @returns {void}
   */
  _updateLanguage(flag = true) {
    if(flag) {
      this.dom.querySelectorAll('str').forEach(function(el) {
        var id = el.getAttribute('sid');
        el.innerHTML = language.string(id);
      });
    }

    if(this.lang_styles.cssRules.length > 1) {
      this.lang_styles.deleteRule(1);
    }
    this.lang_styles.insertRule("lang."+language.lang+" { display: initial }", 1);
      
    this.dom.querySelectorAll('[title-str]').forEach(function(el) {
      var id = el.getAttribute('title-str');
      if(id in language.s) {
        el.setAttribute('title', language.s[id][language.lang]);
      }
    });
    
    this.dom.querySelectorAll('textarea[str]').forEach(function(el) {
      var id = el.getAttribute('str');
      if(id in language.s) {
        el.setAttribute('placeholder', language.s[id][language.lang]);
      }
    });
    
    this.dom.querySelectorAll('input[str]').forEach(function(el) {
      var id = el.getAttribute('str');
      if(id in language.s) {
        el.setAttribute('placeholder', language.s[id][language.lang]);
      }
    });

    this.dom.querySelectorAll('option[str]').forEach(function(el) {
      var id = el.getAttribute('str');
      if(id in language.s) {
        el.textContent = language.s[id][language.lang];
      }
    });
  }
}
