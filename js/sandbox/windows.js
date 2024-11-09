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
    
    this._bridge_code = this.jsl.env.readFileSync(app_path+'/js/windows/jsl-bridge.js').toString();
  }

  /**
   * Opens a new window with the specified file.
   * @param {string} file - The path to the HTML file to open in the new window.
   * @returns {number} The identifier (wid) of the newly opened window.
   */
  openWindow(file) {
    if(!this.jsl.env.isAbsolutePath(file)) {
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
   * Closes the specified window.
   * @param {number} wid - Identifier for the window to close.
   */
  closeWindows(wid) {
    this.jsl.env.closeWindow(wid);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Opens a new 3D window and imports specified modules.
   * @param {Array<Object>} [imports=[]] - An array of import objects specifying modules to import.
   * @returns {Promise<Object>} A promise that resolves to the window object once imports are ready.
   */
  async openWindow3D(imports = []) {
    var wid = this.openWindow('three.html');
    await this.open_windows[wid].ready;
    var win = this.open_windows[wid].win;
    var script = win.document.createElement('script');
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
    
    win.imports_ready = false;
    win.document.body.appendChild(script);
    while(!win.imports_ready) {
      await this.jsl.non_blocking.waitMSeconds(1);
    }
    return win;
  }

/**
   * Opens a Plotly.js window and initializes the plot container.
   * @returns {Promise<Window>} The window object where Plotly.js is loaded and the plot container is available.
   */
  async openPlotlyjs() {
    var wid = this.openWindow('plotlyjs.html');
    await this.open_windows[wid].ready;
    var win = this.open_windows[wid].win;
    win.imports_ready = false;
    while(!win.imports_ready) {
      if(typeof win.Plotly != undefined) {
        win.imports_ready = true;
      }
      await this.jsl.non_blocking.waitMSeconds(1);
    }
    win.plot_cont = win.document.getElementById('plot-cont');
    win.plot_cont.style = 'position: absolute;top:0;left:0;right:0;bottom:0;';
    return win;
  }
  
  /**
   * Opens a new blank window.
   * @returns {Promise<Object>} A promise that resolves to the window object once it is ready.
   */
  async openWindowBlank() {
    var wid = this.openWindow('blank.html');
    await this.open_windows[wid].ready;
    return this.open_windows[wid].win;
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

    this.win;
    this.win_id;
    this.dom;
    
    this.opened = false;
    this.ready = new Promise((resolve, reject) => {
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
      this.opened = true;
      var [win, win_id, ready] = this.#jsl.env.openWindow(this.wid, file);
      this.win = win;
      this.win_id = win_id;
      await ready;
      this.dom = this.win.document;
      this._onReady();
    }
  }
  
  /**
   * Brings focus to the window.
   * @returns {void}
   */
  focus() {
    this.#jsl.env.focusWindow(this.wid);
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
    
    this._readyResolve();
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
  }
}
