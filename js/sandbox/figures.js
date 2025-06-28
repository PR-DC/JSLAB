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
    this._html_figure = this.jsl.env.readFileSync(app_path + '/html/html_figure.html').toString();
    this._i_html_figure = this.jsl.env.readFileSync(app_path + '/html/i_html_figure.html').toString();
    this._io_html_figure = this.jsl.env.readFileSync(app_path + '/html/io_html_figure.html').toString();

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
      this.open_figures[fid].init();
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
   * Retrieves the window of the figure object associated with the specified figure ID.
   * @param {string} fid - The identifier of the figure to retrieve.
   * @returns {(Object|boolean)} The figure object if found, otherwise `false`.
   */
  getFigureWindow(fid) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].win;
    } else {
      return false;
    }
  }
  
  /**
   * Retrieves current active figure object.
   * @returns {(Object|boolean)} The figure object if found, otherwise `false`.
   */
  getCurrentFigure() {
    if(this.open_figures.hasOwnProperty(this.active_figure)) {
      return this.open_figures[this.active_figure];
    } else {
      return false;
    }
  }

  /**
   * Retrieves current active figure object.
   * @returns {(Object|boolean)} The figure object if found, otherwise `false`.
   */
  gcf() {
    return this.getCurrentFigure();
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
   * Retrieves the plot object for a specified figure ID.
   * @param {string} fid - The identifier of the figure to retrieve the plot for.
   * @returns {(Object|boolean)} The plot object if it exists, otherwise `false`.
   */
  getAxes(fid) {
    return this.getPlot(fid);
  }
  
  /**
   * Retrieves plot from current active figure object.
   * @returns {(Object|boolean)} The figure object if found, otherwise `false`.
   */
  getCurrentPlot() {
    if(this.open_figures.hasOwnProperty(this.active_figure)) {
      return this.open_figures[this.active_figure].plot;
    } else {
      return false;
    }
  }

  /**
   * Retrieves plot from current active figure object.
   * @returns {(Object|boolean)} The figure object if found, otherwise `false`.
   */
  gcp() {
    return this.getCurrentPlot();
  }
  
  /**
   * Retrieves plot from current active figure object.
   * @returns {(Object|boolean)} The figure object if found, otherwise `false`.
   */
  getCurrentAxes() {
    return this.getCurrentPlot();
  }

  /**
   * Retrieves plot from current active figure object.
   * @returns {(Object|boolean)} The figure object if found, otherwise `false`.
   */
  gca() {
    return this.getCurrentPlot();
  }
  
  /**
   * Brings the specified figure to the foreground.
   * @param {number} fid - The ID of the figure to focus.
   * @returns {boolean|undefined} - Returns false if the figure ID is invalid.
   */
  focusFigure(fid) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].focus();
    } else {
      return false;
    }
  }
  
  /**
   * Sets the size of a specified figure.
   * @param {number} fid - The ID of the figure.
   * @param {number} width - The new width of the figure.
   * @param {number} height - The new height of the figure.
   * @returns {boolean|undefined} - Returns false if the figure ID is invalid.
   */
  setFigureSize(fid, width, height) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].setSize(width, height);
    } else {
      return false;
    }
  }
  
  /**
   * Sets the position of a specified figure.
   * @param {number} fid - The ID of the figure.
   * @param {number} left - The new left position of the figure.
   * @param {number} top - The new top position of the figure.
   * @returns {boolean|undefined} - Returns false if the figure ID is invalid.
   */
  setFigurePos(fid, left, top) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].setPos(left, top);
    } else {
      return false;
    }
  }
  
  /**
   * Sets the title of the specified figure.
   * @param {string} fid - The figure ID.
   * @param {string} title - The new title for the figure.
   * @returns {boolean|*} The result of setting the title, or false if the figure does not exist.
   */
  setFigureTitle(fid, title) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].setTitle(title);
    } else {
      return false;
    }
  }
  
  /**
   * Retrieves the size of a specified figure.
   * @param {number} fid - The ID of the figure.
   * @returns {Array|boolean} - Returns an array [width, height] or false if the figure ID is invalid.
   */
  getFigureSize(fid) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].getSize();
    } else {
      return false;
    }
  }
  
  /**
   * Retrieves the position of a specified figure.
   * @param {number} fid - The ID of the figure.
   * @returns {Array|boolean} - Returns an array [left, top] or false if the figure ID is invalid.
   */
  getFigurePos(fid) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].getPos();
    } else {
      return false;
    }
  }
  
  /**
   * Retrieves the media source id of a specified figure.
   * @param {number} fid - The ID of the figure.
   * @returns {String|boolean} - Returns Media soruce id or false if the figure ID is invalid.
   */
  getFigureMediaSourceId(fid) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].getMediaSourceId();
    } else {
      return false;
    }
  }

  /**
   * Starts video recording of a specified figure.
   * @param {number} fid - The ID of the figure.
   * @param {Object} - Optional settings. 
   * @returns {Object|boolean} - Returns recorder object or false if the figure ID is invalid.
   */
  startFigureVideoRecording(fid, opts) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].startVideoRecording(opts);
    } else {
      return false;
    }
  }
  
  /**
   * Closes a specified figure.
   * @param {number} fid - The ID of the figure to close.
   * @returns {boolean|undefined} - Returns false if the figure ID is invalid.
   */
  closeFigure(fid) {
    if(this.open_figures.hasOwnProperty(fid)) {
      return this.open_figures[fid].close();
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
      {name: 'json', extensions: ['json']},
      {name: 'static html', extensions: ['html']},
      {name: 'interactive html', extensions: ['i.html']},
      {name: 'interactive offline html', extensions: ['io.html']}
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
    if(['svg', 'pdf', 'png', 'jpg', 'jpeg', 'webp', 'html', 'json'].includes(ext)) {
      if(ext == 'json' || figure_path.endsWith('.i.html') || figure_path.endsWith('.io.html')) {
        var data = this.open_figures[fid].context.plot.toJSON();
        if(figure_path.endsWith('.i.html')) {
          var html = this._i_html_figure.replaceAll('%title%', this.open_figures[fid].dom.title);
          data = html.replace('%figure_data%', data);
        } else if(figure_path.endsWith('.io.html')) {
          var html = this._io_html_figure.replaceAll('%title%', this.open_figures[fid].dom.title);
          data = html.replace('%figure_data%', data);
        }
        this.jsl.env.writeFileSync(figure_path, data);
        return;
      } else if(ext == 'jpg') {
        ext = 'jpeg';
      } else if(ext == 'pdf') {
        pdf_flag = true;
        ext = 'svg';
      } else if(ext == 'html') {
        html_flag = true;
        ext = 'svg';
      }
      
      var data_url = await this.open_figures[fid].context.plot.toImage(ext, size);
      var data;
      if(ext == 'svg') {
        if(html_flag) {
          var html = this._html_figure.replaceAll('%title%', this.open_figures[fid].dom.title);
          data = html.replace('%image_source%', data_url);
        } else {
          data = decodeURIComponent(data_url.replace('data:image/svg+xml,',''));
        }
        data = data.replace(/\bLatinModern\b/g, "LatinModernMath");
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
   * Adjusts the zoom based on zoom factor.
   * @param {number} factor - The zoom factor.
   */
  zoom(factor) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.zoom(factor);
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
   * Updates plot data by delegating to the `update` method.
   * @param {Object} traces - The trace data to be updated in the plot.
   * @param {number} N - The data length or index for updating the plot.
   */
  updatePlot(traces, N) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.update(data);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Updates plot data by id by delegating to the `updateById` method.
   * @param {Object|Object[]} data - Trace update object(s) to apply to the active plot.
   */
  updatePlotById(data) {
    if(this.active_figure >= 0 && this.open_figures[this.active_figure].plot) {
      this.open_figures[this.active_figure].plot.updateById(data);
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Hides figure menu.
   */
  hideFigureMenu() {
    if(this.active_figure >= 0) {
      this.open_figures[this.active_figure].hideMenu();
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  
  /**
   * Shows figure menu.
   */
  showFigureMenu() {
    if(this.active_figure >= 0) {
      this.open_figures[this.active_figure].showMenu();
    }
    this.jsl.no_ans = true;
    this.jsl.ignore_output = true;
  }
  
  /**
   * Loads figure from JSON file
   * @param {String} file_path - Absolute or relative path to the JSON file of figure.
   * @param {Number} id Identifier for the figure.
   * @returns {Number} The identifier of the opened or updated figure.
   */
  loadJsonFigure(fid, file_path) {
    if(!file_path) {
      var options = {
        title: language.currentString(247),
        buttonLabel: language.currentString(231)
      };
      file_path = this.jsl.env.showOpenDialogSync(options);
      if(file_path === undefined) {
        this.jsl.env.error('loadJsonFigure: '+language.string(132)+'.');
        return false;
      } else {
        file_path = file_path[0];
      }
    }    
    if(!this.jsl.file_system.existFile(file_path)) {
      this.jsl.env.error('@loadJsonFigure: '+language.string(248));
      return false;
    }
    var data = JSON.parse(this.jsl.env.readFileSync(file_path).toString());

    this._pid += 1;

    fid = this.figure(fid);
    this.open_figures[fid]._fromJSON(this._pid, data);
    return fid;
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
        this._setActiveFigure(new_fid);
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
    return false;
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
    
    return new Promise(function(resolve) {
      var doc = new obj.jsl.env.PDFDocument({
        size: [width, height]
      });
      doc.registerFont('Roboto', obj._fonts[0]);
      doc.registerFont('LatinModernMath', obj._fonts[1]);
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
    
    this.context;
    this.dom;
    this.fig_ready = false;
    this.opened = false;
    
    this.plot = undefined;

    this.ready = new Promise((resolve) => {
      obj._readyResolve = resolve;
    });
    
    this.wid = this.#jsl.windows.openWindow('figure.html');
    this.#jsl.windows.open_windows[this.wid].onClosed = function() {
      obj.#jsl.figures._closedFigure(obj.fid);
    }
  }
  
  /**
   * Initializes figure.
   */
  async init() {
    if(!this.opened) {
      await this.#jsl.windows.open_windows[this.wid].ready;
      await this._onReady();
      this.opened = true;
    }
  }
  
  /**
   * Brings the figure window to the foreground.
   */
  async focus() {
    await this.#jsl.promiseOrStoped(this.ready);
    return await this.#jsl.windows.open_windows[this.wid].focus();
  }

  /**
   * Sets the size of the window.
   * @param {number} width - The desired width of the window.
   * @param {number} height - The desired height of the window.
   * @returns {Promise} - Resolves when the window size is set.
   */
  async setSize(width, height) {
    await this.#jsl.promiseOrStoped(this.ready);
    return await this.#jsl.windows.open_windows[this.wid].setSize(width, height);
  }
  
  /**
   * Sets the position of the window.
   * @param {number} left - The desired left position of the window.
   * @param {number} top - The desired top position of the window.
   * @returns {Promise} - Resolves when the window position is set.
   */
  async setPos(left, top) {
    await this.#jsl.promiseOrStoped(this.ready);
    return await this.#jsl.windows.open_windows[this.wid].setPos(left, top);
  }
  
  /**
   * Sets the title of the current window.
   * @param {string} title - The new title for the window.
   * @returns {Promise<*>} A promise that resolves when the title is set.
   */
  async setTitle(title) {
    await this.#jsl.promiseOrStoped(this.ready);
    return await this.#jsl.windows.open_windows[this.wid].setTitle(title);
  }
  
  /**
   * Retrieves the size of the window.
   * @returns {Promise<Array>} - Resolves with an array [width, height].
   */
  async getSize() {
    await this.#jsl.promiseOrStoped(this.ready);
    return await this.#jsl.windows.open_windows[this.wid].getSize();
  }
  
  /**
   * Retrieves the position of the window.
   * @returns {Promise<Array>} - Resolves with an array [left, top].
   */
  async getPos() {
    await this.#jsl.promiseOrStoped(this.ready);
    return await this.#jsl.windows.open_windows[this.wid].getPos();
  }

  /**
   * Retrieves the media source id of the figure.
   * @returns {String} - Media source id.
   */
  async getMediaSourceId() {
    await this.#jsl.promiseOrStoped(this.ready);
    return await this.#jsl.windows.open_windows[this.wid].getMediaSourceId();
  }

  /**
   * Starts video recording of the figure.
   * @param {Object} - Optional settings. 
   * @returns {Object|boolean} - Returns recorder object.
   */
  async startVideoRecording(opts) {
    await this.#jsl.promiseOrStoped(this.ready);
    return await this.#jsl.windows.open_windows[this.wid].startVideoRecording(opts);
  }
  
  /**
   * Closes the window.
   * @returns {Promise} - Resolves when the window is closed.
   */
  async close() {
    await this.#jsl.promiseOrStoped(this.ready);
    return await this.#jsl.windows.open_windows[this.wid].close();
  }
  
  /**
   * Hides figure menu.
   */
  hideMenu() {
    if(this.dom) {
      this.dom.getElementById('figure-menu-button').style.display = 'none';
      this.dom.getElementById('figure-menu-container').style.display = 'none';
    }
  }
  
  /**
   * Shows figure menu.
   */
  showMenu() {
    if(this.dom) {
      this.dom.getElementById('figure-menu-button').style.display = ''; 
      this.dom.getElementById('figure-menu-container').style.display = ''; 
    }
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
   * Creates a new plot in the figure based on JSON file data.
   * @param {Number} id Identifier for the new plot.
   * @param {Array} data Data for the plot.
   */
  async _fromJSON(id, data) {
    if(this.plot) {
      this.plot.remove();
    }
    this.plot = new PRDC_JSLAB_PLOT(this.#jsl, this.fid, id);
    this.plot.fromJSON(data);
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
    this.win = this.#jsl.windows.open_windows[this.wid];
    this.context = this.win.context;
    
    this.dom = this.context.document;
    
    this.context.addEventListener("resize", function() {
      if(obj.#jsl.figures.open_figures.hasOwnProperty(obj.fid)) {
        obj._onResize();
      }
    });
    
    this.dom.title = "Figure " + this.fid + " - JSLAB | PR-DC";

    // Menu showing
    var menu_button = this.dom.getElementById('figure-menu-button');
    var menu = this.dom.getElementById('figure-menu-container');

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
    this.dom.getElementById('reset-menu')
        .addEventListener('click', function() {
      obj.#jsl.ploter.updatePlotLayout(obj.plot.fid);
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
    this.dom.getElementById('reset-menu-3d')
        .addEventListener('click', function() {
      obj.#jsl.ploter.updatePlotLayout(obj.plot.fid);
    });
    
    this._readyResolve(true);
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
  constructor(jsl, fid, id, traces = [], options = []) {
    var obj = this;
    
    this.#jsl = jsl;
    this.fid = fid;
    this.id = id;
    this.traces = traces;
    this.options = options;
    
    this.title_val;
    this.xlabel_val;
    this.ylabel_val;
    this.zlabel_val;
    this.xlim_val;
    this.ylim_val;
    this.zlim_val;
    this.view_val = [37.5+180, 30];
    this.zoom_val = 1;
    this.axis_style_val;
    this.json_val;
    this.legend_state_val;
    
    this.plot_ready = false;
    this.lim_update = false;
    
    this.ready = new Promise((resolve) => {
      obj._readyResolve = resolve;
    });
  }

  /**
   * Sets the label for the x-axis of the plot.
   * @param {String} label Label text for the x-axis.
   */
  legend(state) {
    this.legend_state_val = state;
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
   * Adjusts the zoom based on factor.
   * @param {number} factor - The zoom factor.
   */
  zoom(factor) {
    this.zoom_val = factor;
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
   * Sets the plot data from JSON.
   * @param {Array} data Data for the plot.
   */
  fromJSON(data) {
    this.json_val = data;
    if(this.plot_ready) {
      this.#jsl.ploter.fromJSON(data);
    }
  }
  
  /**
   * Adds a print job to the queue and prints it if the system is ready.
   * @param {String} filename - The filename for the print job.
   * @param {Object} options - Options for the print job.
   */
  async print(filename, options) {
    await this.#jsl.promiseOrStoped(this.ready);
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
   * Updates plot data by delegating to the `updateDataById` method.
   * @param {Object|Object[]} data - Trace update object(s) addressed by `id`.
   */
  updateById(data) {
    this.#jsl.ploter.updateDataById(this.fid, data);
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
    if(this.json_val) {
      await this.#jsl.ploter.fromJSON(this.fid, this.json_val);
      this.plot_ready = true;
      this._readyResolve(true);
    } else {
      await this.#jsl.ploter.plot(this.fid);
      this.plot_ready = true;
      this.#jsl.ploter.updatePlotLayout(this.fid);
      this._readyResolve(true);
    }
  }
  
  /**
   * Handles plot resize events, updating the plot layout to accommodate new dimensions.
   */
  _onResize() {
    this.#jsl.ploter.onResize(this.fid);
  }
}