/**
 * @file JSLAB library figures submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB figures submodule.
 */
class PRDC_JSLAB_LIB_FIGURES {
  
  /**
   * Initializes a new instance of the figures submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    
    this._fonts_registred = false;
    this._fonts = [];
    this._fid = 0;
    this._pid = 0;
    this._html_figure = this.jsl.env.readFileSync(app_path+'/html/html_figure.html').toString();

    /**
     * Array of open figures.
     * @type {Array}
     */    
    this.open_figures = {};
    
    /**
     * Current active figure ID.
     * @type {Number}
     */
    this.active_figure = -1;
  }

  /**
   * Opens or updates a figure with specified options.
   * @param {Number} id Identifier for the figure.
   * @returns {Number} The identifier of the opened or updated figure.
   */
  figure(fid) {
    if(!(fid >= 0) || !this.open_figures.hasOwnProperty(fid)) {
      if(!(fid >= 0)) {
        this._fid += 1;
        fid = this._fid;
      }
      this.open_figures[fid] = new PRDC_JSLAB_FIGURE(this.jsl, fid);
      this.open_figures[fid].open();
    } else {
      this.open_figures[fid].focus();
    }
    this._setActiveFigure(fid);
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return fid;
  }
  
  /**
   * Retrieves the figure object associated with the specified figure ID.
   * @param {string} fid - The identifier of the figure to retrieve.
   * @returns {(Object|boolean)} The figure object if found, otherwise `false`.
   */
  getFigure(fid) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid];
    } else {
      return false;
    }
  }

  /**
   * Retrieves the plot object for a specified figure ID.
   * @param {string} fid - The identifier of the figure to retrieve the plot for.
   * @returns {(Object|boolean)} The plot object if it exists, otherwise `false`.
   */
  getPlot(fid) {
    if(this.open_figures.hasOwnProperty(fid) && this.open_figures[fid].plot) {
      return this.open_figures[fid].plot;
    } else {
      return false;
    }
  }
  
  /**
   * Closes a figure or window by its identifier.
   * @param {number|string} id - The identifier of the figure or window to close. Use "all" to close all.
   * @param {string} [type='figure'] - The type of object to close ('figure' or 'window').
   */
  close(id, type = 'figure') {
    if(id == "all") {
      this.jsl.env.closeWindow(id);
    } else {
      if(type == 'window') {
        this.jsl.env.closeWindow(id);
      } else if(type == 'figure') {
        this.jsl.env.closeFigure(id);
      } 
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Opens a dialog for saving a figure in various formats.
   * @param {String} fid - The figure identifier.
   */
  async saveFigureDialog(fid) {
    let options = {
     title: language.currentString(143),
     defaultPath: fid + '.svg',
     buttonLabel: language.currentString(143),
     filters :[
      {name: 'svg', extensions: ['svg']},
      {name: 'pdf', extensions: ['pdf']},
      {name: 'png', extensions: ['png']},
      {name: 'jpg', extensions: ['jpg', 'jpeg']},
      {name: 'webp', extensions: ['webp']},
      {name: 'html', extensions: ['html']}
     ]
    };
    var figure_path = this.jsl.env.showSaveDialogSync(options);
    if(figure_path) {
      await this.saveFigure(fid, figure_path);
    }
  }
  
  /**
   * Saves a figure to a specified path in various formats.
   * @param {String} fid - The figure identifier.
   * @param {String} figure_path - The path where the figure should be saved.
   * @param {Array} size - Optional dimensions [width, height] to use if saving as a PDF.
   */
  async saveFigure(fid, figure_path, size) {
    var pdf_flag = false;
    var html_flag = false;
    var ext = figure_path.split('.').pop();
    if(['svg', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'html'].includes(ext)) {
      if(ext == 'jpg') {
        ext = 'jpeg';
      } else if(ext == 'pdf') {
        pdf_flag = true;
        ext = 'svg';
      } else if(ext == 'html') {
        html_flag = true;
        ext = 'svg';
      }
      
      var data_url = await this.open_figures[fid].win.plot.toImage(ext, size);
      var data;
      if(ext == 'svg') {
        if(html_flag) {
          data = this._makeFigureHTML(fid, data_url);
        } else {
          data = decodeURIComponent(data_url.replace('data:image/svg+xml,',''));
        }
      } else {
        data_url = data_url.replace('data:image/png;base64,','');
        data_url = data_url.replace('data:image/jpeg;base64,','');
        data_url = data_url.replace('data:image/webp;base64,','');
        data = new Buffer(data_url, 'base64');
      }
      if(pdf_flag) {
        var pdf_data = await this._svg2pdf(fid, data, size);
        try {
          this.jsl.env.writeFileSync(figure_path, pdf_data);
        } catch(err) {
          this.jsl.env.error('@saveFigure: '+err.stack);
        }
      } else {
        try {
          this.jsl.env.writeFileSync(figure_path, data);
        } catch(err) {
          this.jsl.env.error('@saveFigure: '+err.stack);
        }
      }
    } else {
      this.jsl.env.error('@saveFigure: '+language.string(124));
    }
  }
  
  /**
   * Sets the label for the x-axis of the active figure.
   * @param {String} label - The label for the x-axis.
   */
  legend(state) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.legend(state);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Sets the label for the x-axis of the active figure.
   * @param {String} label - The label for the x-axis.
   */
  xlabel(label) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.xlabel(label);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Sets the label for the y-axis of the active figure.
   * @param {String} label - The label for the y-axis.
   */
  ylabel(label) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.ylabel(label);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Sets the label for the z-axis of the active figure.
   * @param {String} label - The label for the z-axis.
   */
  zlabel(label) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.zlabel(label);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Sets the title of the active figure.
   * @param {String} label - The title text.
   */
  title(label) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.title(label);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Sets the xlim of the active figure.
   * @param {String} lim - x limits.
   */
  xlim(lim) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.xlim(lim);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Sets the ylim of the active figure.
   * @param {String} lim - y limits.
   */
  ylim(lim) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.ylim(lim);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Sets the zlim of the active figure.
   * @param {String} lim - z limits.
   */
  zlim(lim) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.zlim(lim);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Adjusts the view based on azimuth and elevation angles.
   * @param {number} azimuth - The azimuth angle.
   * @param {number} elevation - The elevation angle.
   */
  view(azimuth, elevation) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.view(azimuth, elevation);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }

  /**
   * Applies the specified style to the active figure's plot axis.
   * @param {Object} style - The style configuration to apply to the axis.
   */
  axis(style) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.axis(style);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Prints the currently active figure to a file.
   * @param {String} filename - The name of the file where the figure should be printed.
   * @param {Object} options - Printing options.
   */
  async printFigure(filename, options) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      await this.open_figures[this.active_figure].plot.print(filename, options);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Plots data on the active figure.
   * @param {Array} traces - Data traces to plot.
   * @param {Object} options - Configuration options for plotting.
   * @returns {Number} The plot identifier.
   */
  plot(traces, options) {
    var fid = this.active_figure;
    if(options == undefined) {
      options = {};
    } else {
      if(options.hasOwnProperty(fid)) {
        fid = options.fid;
      }
    }
    this._pid += 1;
    var id = this._pid;
    
    fid = this.figure(fid);
    this.open_figures[fid]._newPlot(id, traces, options);
    
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
    return this.open_figures[fid].plot;
  }
  
  /**
   * Updates the language of the text elements within all open figures.
   */
  _updateLanguage() {
    Object.values(this.open_figures).forEach(function(figure) {
      figure._updateLanguage(false);
    });
  }
  
  /**
   * Sets the specified figure as the active figure.
   * @param {string} fid - The identifier of the figure to set as active.
   */
  _setActiveFigure(fid) {
    if(this.open_figures.hasOwnProperty(fid)) {
      this.active_figure = fid;
    } else {
      this.active_figure = -1;
    }
  }

  /**
   * Closes a figure identified by the given ID and updates the active figure if needed.
   * @param {string} id - The identifier of the figure to close.
   */
  _closedFigure(fid) {
    if(this.open_figures.hasOwnProperty(fid)) {
      var new_fid = -1;
      if(this.active_figure == fid) {
        var fids = Object.keys(this.open_figures);
        var N = fids.length;
        if(N > 1) {
          if(fids[N-1] !== fid) {
            new_fid = fids[N-1];
          } else {
            new_fid = fids[N-2];
          }
        }
        this._setActiveFigure(fid);
      }
      delete this.open_figures[fid];
    }
  }
  
  /**
   * Reads and returns font data from a specified path.
   * @param {String} font_path Path to the font file.
   * @returns {Buffer} The font data.
   */
  _getFontData(font_path) {
    try {
      return this.jsl.env.readFileSync(font_path);
    } catch(err) {
      this.jsl.env.error('@getFontData: '+err.stack);
    }
  }
  /**
   * Registers fonts for use in figures.
   */
  _registerFonts() {
    if(!this._fonts_registred) {
      this._fonts.push(this._getFontData(
        app_path+'/font/roboto-v20-latin-ext_latin_greek-ext_greek_cyrillic-ext_cyrillic-regular.ttf'
      ));
      this._fonts.push(this._getFontData(
        app_path+'/font/latinmodern-math.otf'
      ));
      this._fonts_registred = true;
    }
  }

  /**
   * Converts SVG data to PDF format.
   * @param {String} fid - The figure identifier.
   * @param {String} data - The SVG data to convert.
   * @param {Array} size - The dimensions [width, height] to use for the PDF.
   * @returns {Promise<Buffer>} A promise that resolves with the generated PDF data.
   */
  _svg2pdf(fid, data, size) {
    var obj = this;
    this._registerFonts();
    var plot_cont = this.open_figures[fid].dom.querySelector('#figure-content .plot-cont');
    var width = plot_cont.clientWidth;
    var height = plot_cont.clientHeight;
    if(typeof size != 'undefined') {
      width = size[0];
      height = size[1];
    }
    
    return new Promise(function(resolve, reject) {
      var doc = new obj.jsl.env.PDFDocument({
        size: [width, height]
      });
      doc.registerFont('Roboto', obj._fonts[0]);
      doc.registerFont('LatinModern', obj._fonts[1]);
      obj.jsl.env.SVGtoPDF(doc, data, 0, 0, {
        width: width,
        height: height,
        assumePt: true
      });
      var buf = [];
      doc.on('data', buf.push.bind(buf));
      doc.on('end', function() {
        var pdfData = Buffer.concat(buf);
        resolve(pdfData);
      });
      doc.end();
    });
  }
  
  /**
   * Generates HTML content for a figure.
   * @param {String} fid - The figure identifier.
   * @param {String} data - The data used to generate the HTML.
   * @returns {String} Generated HTML content.
   */
  _makeFigureHTML(fid, data) {
    var html = this._html_figure.replaceAll('%title%', this.open_figures[fid].dom.title);
    return html.replace('%image_source%', data);
  }
}

exports.PRDC_JSLAB_LIB_FIGURES = PRDC_JSLAB_LIB_FIGURES;

/**
 * Represents an individual figure within the JSLAB environment, providing detailed configuration and interaction capabilities.
 */
class PRDC_JSLAB_FIGURE {
  
  #jsl;
  
  /**
   * Initializes a new instance of a JSLAB figure.
   * @param {Object} jsl Reference to the main JSLAB object.
   * @param {Number} id Identifier for the figure.
   * @param {Object} options Configuration options for the figure.
   */
  constructor(jsl, fid) {
    var obj = this;
    
    this.#jsl = jsl;
    this.fid = fid;
    
    this.wid;
    
    this.win;
    this.dom;
    this.name;
    this.size;
    this.position;
    this.grid = 'on';
    this.box = 'on';
    this.hold = 'off';
    this.zeroline = 'off';
    this.fig_ready = false;
    this.opened = false;
    
    this.plot = undefined;

    this.ready = new Promise((resolve, reject) => {
      obj._readyResolve = resolve;
    });
  }
  
  /**
   * Opens the figure window if it is not already open.
   */
  async open() {
    if(!this.opened) {
      this.opened = true;
      this.wid = this.#jsl.windows.openWindow('figure.html');
      await this.#jsl.windows.open_windows[this.wid].ready;
      await this._onReady();
    }
  }
  
  /**
   * Brings the figure window to the foreground.
   */
  focus() {
    this.#jsl.windows.open_windows[this.wid].focus();
  }

  /**
   * Creates a new plot in the figure.
   * @param {Number} id Identifier for the new plot.
   * @param {Array} traces Data traces for the plot.
   * @param {Object} options Plot configuration options.
   */
  _newPlot(id, traces, options) {
    if(this.plot) {
      this.plot.remove();
    }
    this.plot = new PRDC_JSLAB_PLOT(this.#jsl, this.fid, id, traces, options);
    if(this.fig_ready) {
      this.plot._onFigureReady();
    }
  }
  
  /**
   * Method called when the figure is ready. Initializes interactive elements within the figure's DOM.
   * @param {Element} dom The DOM element associated with the figure.
   */
  async _onReady() {
    var obj = this;
    this.fig_ready = true;
    this.win = this.#jsl.windows.open_windows[this.wid].win;
    this.#jsl.windows.open_windows[this.wid].onClosed = function() {
      obj.#jsl.figures._closedFigure(obj.fid);
    }
    
    this.dom = this.win.document;
    
    this.win.addEventListener("resize", function() {
      if(obj.#jsl.figures.open_figures.hasOwnProperty(obj.fid)) {
        obj._onResize();
      }
    });
    
    this.dom.title = "Figure " + this.fid + " - JSLAB | PR-DC";

    // Menu showing
    var menu_button = this.dom.getElementById('figure-menu-button');
    var menu = this.dom.getElementById('figure-menu-container')

    menu_button.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('active');
      menu_button.classList.toggle('active');
    });

    this.dom.addEventListener('click', function (e) {
      if(!menu.contains(e.target) && !menu_button.contains(e.target)) {
        menu.classList.remove('active');
        menu_button.classList.remove('active');
      }
    });
  
    var interval;
    menu.addEventListener('mouseenter', function() {
      clearInterval(interval);
      menu.classList.add('hovered');
      menu_button.classList.add('hovered');
    });

    menu.addEventListener('mouseleave', function() {
      interval = setTimeout(function() {
        menu.classList.remove('hovered');
        menu_button.classList.remove('hovered');
      }, 300);
    });

    // Menu buttons
    this.dom.getElementById('save-as-menu')
        .addEventListener('click', function() {
      obj.#jsl.figures.saveFigureDialog(obj.fid);
    });
    this.dom.getElementById('zoom-menu')
        .addEventListener('click', function() {
      var btn = obj.dom.querySelector('a[data-attr="dragmode"][data-val="zoom"]');
      if(btn) {
        btn.click();
      }
    });
    this.dom.getElementById('zoom-in-menu')
        .addEventListener('click', function() {
      var btn = obj.dom.querySelector('a[data-attr="zoom"][data-val="in"]');
      if(btn) {
        btn.click();
      }
    });
    this.dom.getElementById('zoom-out-menu')
        .addEventListener('click', function() {
      var btn = obj.dom.querySelector('a[data-attr="zoom"][data-val="out"]');
      if(btn) {
        btn.click();
      }
    });
    this.dom.getElementById('pan-menu')
        .addEventListener('click', function() {
      var btn = obj.dom.querySelector('a[data-attr="dragmode"][data-val="pan"]');
      if(btn) {
        btn.click();
      }
    });
    this.dom.getElementById('rotate-menu')
        .addEventListener('click', function() {
      var btn = obj.dom.querySelector('a[data-attr="dragmode"][data-val="orbit"]');
      if(btn) {
        btn.click();
      }
    });
    this.dom.getElementById('fit-menu')
        .addEventListener('click', function() {
      var btn = obj.dom.querySelector('a[data-attr="zoom"][data-val="auto"]');
      if(btn) {
        btn.click();
      }
    });
    this.dom.getElementById('pan-menu-3d')
        .addEventListener('click', function() {
      var btn = obj.dom.querySelector('a[data-attr="scene.dragmode"][data-val="pan"]');
      if(btn) {
        btn.click();
      }
    });
    this.dom.getElementById('rotate-menu-3d')
        .addEventListener('click', function() {
      var btn = obj.dom.querySelector('a[data-attr="scene.dragmode"][data-val="orbit"]');
      if(btn) {
        btn.click();
      }
    });
    this.dom.getElementById('fit-menu-3d')
        .addEventListener('click', function() {
      var btn = obj.dom.querySelector('a[data-attr="resetDefault"]');
      if(btn) {
        btn.click();
      }
    });
    
    if(this.plot) {
      await this.plot._onFigureReady();   
    }
  }
 
  /**
   * Handles figure resize events by updating the plot layout to fit the new dimensions.
   */
  _onResize() {
    if(this.plot) {
      this.plot._onResize();
    }
  }
}

/**
 * Represents an individual plot within the JSLAB environment, holding configuration details and facilitating interaction with the plot.
 */
class PRDC_JSLAB_PLOT {
  
  #jsl;
  
  /**
   * Constructs a PRDC_JSLAB_PLOT instance with specified plot data and configuration.
   * @param {Object} jsl Reference to the main JSLAB object.
   * @param {Number} fid Identifier for the figure containing this plot.
   * @param {Number} id Unique identifier for this plot.
   * @param {Array} traces Data traces to be displayed in the plot.
   * @param {Object} options Configuration options for the plot.
   */
  constructor(jsl, fid, id, traces, options) {
    var obj = this;
    
    this.#jsl = jsl;
    this.fid = fid;
    this.id = id;
    this.traces = traces;
    this.options = options;
    
    this.size;
    this.position;
    
    this.title_val;
    this.xlabel_val;
    this.ylabel_val;
    this.zlabel_val;
    this.xlim_val;
    this.ylim_val;
    this.zlim_val;
    this.view_val = [37.5+180, 30];
    this.axis_style_val;
    this.legend_state;
    
    this.plot_ready = false;
    this.lim_update = false;
    
    this.ready = new Promise((resolve, reject) => {
      obj._readyResolve = resolve;
    });
  }

  /**
   * Sets the label for the x-axis of the plot.
   * @param {String} label Label text for the x-axis.
   */
  legend(state) {
    this.legend_state = state;
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }
  
  /**
   * Sets the label for the x-axis of the plot.
   * @param {String} label Label text for the x-axis.
   */
  xlabel(label) {
    this.xlabel_val = label;
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }

  /**
   * Sets the label for the y-axis of the plot.
   * @param {String} label Label text for the y-axis.
   */
  ylabel(label) {
    this.ylabel_val = label;
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }

  /**
   * Sets the label for the z-axis of the plot.
   * @param {String} label Label text for the z-axis.
   */
  zlabel(label) {
    this.zlabel_val = label;
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }
  
  /**
   * Sets the title of the plot.
   * @param {String} label Title text for the plot.
   */
  title(label) {
    this.title_val = label;
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }
  
  /**
   * Sets the limits for the x-axis of the plot.
   * @param {String} lim Limits for the x-axis.
   */
  xlim(lim) {
    this.lim_update = true;
    this.xlim_val = lim;
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }
  
  /**
   * Sets the limits for the y-axis of the plot.
   * @param {String} lim Limits for the y-axis.
   */
  ylim(lim) {
    this.lim_update = true;
    this.ylim_val = lim;
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }
  
  /**
   * Sets the limits for the z-axis of the plot.
   * @param {String} lim Limits for the z-axis.
   */
  zlim(lim) {
    this.lim_update = true;
    this.zlim_val = lim;
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }
  
  /**
   * Adjusts the view based on azimuth and elevation angles.
   * @param {number} azimuth - The azimuth angle.
   * @param {number} elevation - The elevation angle.
   */
  view(azimuth, elevation) {
    this.view_val = [azimuth, elevation];
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }
  
  /**
   * Sets the axis style value and updates the plot layout if the plot is ready.
   * @param {Object} style - The style configuration to set for the axis.
   */
  axis(style) {
    this.axis_style_val = style;
    if(this.plot_ready) {
      this.#jsl.ploter.updatePlotLayout(this.fid);
    }
  }
  
  /**
   * Adds a print job to the queue and prints it if the system is ready.
   * @param {String} filename - The filename for the print job.
   * @param {Object} options - Options for the print job.
   */
  async print(filename, options) {
    await this.ready;
    var type = 'png';
    var size;
    if(options) {
      if(options.type) {
        type = options.type;
      }
      if(options.size) {
        size = options.size;
      }
    }
    await this.#jsl.figures.saveFigure(this.fid, filename+'.'+type, size);
  }
  
  /**
   * Updates plot data by delegating to the `updateData` method.
   * @param {Object} traces - The trace data to be updated in the plot.
   * @param {number} N - The data length or index for updating the plot.
   */
  update(traces, N) {
    this.#jsl.ploter.updateData(this.fid, traces, N);
  }
  
  /**
   * Removes the plot from the figure, cleaning up any resources associated with it.
   */
  remove() {
    if(this.plot_ready) {
      this.#jsl.ploter.remove(this.fid);
    }
  }
  
  /**
   * Called when the figure containing this plot is ready, allowing for final adjustments or updates before displaying.
   */
  async _onFigureReady() {
    await this.#jsl.ploter.plot(this.fid);
    this.plot_ready = true;
    this.#jsl.ploter.updatePlotLayout(this.fid);
    await waitMSeconds(30);
    this._readyResolve();
  }
  
  /**
   * Handles plot resize events, updating the plot layout to accommodate new dimensions.
   */
  _onResize() {
    this.#jsl.ploter.onResize(this.fid);
  }
}