/**
 * @file JSLAB plot viewer controller and rigid mesh animation
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Retains Plotly mesh buffers and applies native rigid transforms when drawing.
 */
class PRDC_JSLAB_PLOT_MESH_ANIMATION {

  /**
   * Connects rigid meshes to the pinned Plotly renderer.
   * @param {Object} viewer Figure plot viewer.
   * @param {Function} snapshot Current world meshes for exports.
   */
  constructor(viewer, snapshot) {
    this.viewer = viewer;
    this.snapshot = snapshot;
    this.entries = [];
    var plot = viewer.plot_cont;
    var scene = plot._fullLayout?.scene?._scene;
    if(!scene || Plotly.version != '3.3.0' ||
        ['xaxis', 'yaxis', 'zaxis'].some(axis => scene.fullSceneLayout[axis].type != 'linear')) {
      throw new Error('Rigid mesh playback requires the supported linear Plotly scene.');
    }
    this.scene = scene;
    var traces = plot._fullData.map(data => scene.traces[data.uid]);
    if(traces.some(trace => !trace?.mesh ||
        ['draw', 'drawTransparent', 'drawPick'].some(method => typeof trace.mesh[method] != 'function'))) {
      throw new Error('The plot does not contain supported rigid meshes.');
    }
    traces.forEach(trace => {
      var mesh = trace.mesh;
      var entry = { mesh, matrix: null, methods: {} };
      for(const method of ['draw', 'drawTransparent', 'drawPick']) {
        var original = mesh[method];
        entry.methods[method] = original;
        mesh[method] = parameters => original.call(mesh, this._drawParameters(parameters, entry.matrix));
      }
      this.entries.push(entry);
    });
  }

  /**
   * Composes the native world matrix with Plotly's normalization and camera.
   * @param {Object} parameters Plotly draw parameters.
   * @param {Float32Array} matrix Native column-major transform.
   * @returns {Object} Parameters for the retained mesh.
   */
  _drawParameters(parameters, matrix) {
    if(!matrix) {
      return parameters;
    }
    var scale = [...this.scene.dataScale, 1];
    var model = parameters.model;
    var result = new Float32Array(16);
    for(let column = 0; column < 4; column++) {
      for(let row = 0; row < 4; row++) {
        for(let k = 0; k < 4; k++) {
          result[column * 4 + row] += model[k * 4 + row] * matrix[column * 4 + k] * scale[k] / scale[column];
        }
      }
    }
    return { ...parameters, model: result };
  }

  /**
   * Changes shader matrices and requests an existing-scene redraw.
   * @param {Float32Array[]} matrices Native transforms in mesh order.
   */
  update(matrices) {
    if(matrices.length != this.entries.length) {
      throw new Error('Rigid scene mesh count changed during playback.');
    }
    matrices.forEach((matrix, index) => {
      this.entries[index].matrix = matrix;
      this.entries[index].mesh.dirty = true;
    });
    this.scene.glplot.redraw();
  }

  /**
   * Returns current world coordinates together with existing trace options.
   * @returns {Object[]} Plotly export traces.
   */
  exportData() {
    var meshes = this.snapshot();
    return this.viewer.plot_cont.data.map((trace, index) => ({ ...trace, ...meshes[index] }));
  }

  /**
   * Releases renderer hooks before replacing the plot.
   */
  dispose() {
    this.entries.forEach(entry => Object.assign(entry.mesh, entry.methods));
    this.entries = [];
    this.snapshot = null;
  }
}

/**
 * Controls the plot viewer inside a figure window.
 */
class PRDC_JSLAB_PLOT_VIEWER {

  /**
   * Initializes an instance of the PRDC_JSLAB_PLOT_VIEWER class.
   */
  constructor() {
    var obj = this;
    this.figure_content = document.getElementById('figure-content');
    this.plot_cont;

    this.update_queue = new Map();
    this.frame_requested = false;
    this.drawing = false;
  }

  /**
   * Loads fonts referenced by a Plotly layout before Plotly measures text.
   * @param {Object} layout - Full or flattened Plotly layout update.
   * @returns {Promise<void>}
   */
  async _loadLayoutFonts(layout) {
    if(!document.fonts || typeof document.fonts.load != 'function' ||
        !layout || typeof layout != 'object') {
      return;
    }

    var full_layout = this.plot_cont && this.plot_cont._fullLayout
      ? this.plot_cont._fullLayout
      : {};
    var font_specs = [];

    var addFont = function(font, fallback) {
      font = font && typeof font == 'object' ? font : {};
      fallback = fallback && typeof fallback == 'object' ? fallback : {};
      var family = font.family || fallback.family;
      var size = Number(font.size || fallback.size || 12);
      if(typeof family == 'string' && family.trim().length) {
        font_specs.push(size + 'px ' + family);
      }
    };

    var layout_font = layout.font && typeof layout.font == 'object'
      ? layout.font
      : {};
    if(layout.hasOwnProperty('font.family')) {
      layout_font = Object.assign({}, layout_font, {
        family: layout['font.family']
      });
    }
    if(layout.hasOwnProperty('font.size')) {
      layout_font = Object.assign({}, layout_font, {
        size: layout['font.size']
      });
    }
    addFont(layout_font, full_layout.font);

    var legend = layout.legend && typeof layout.legend == 'object'
      ? layout.legend
      : {};
    var legend_font = legend.font && typeof legend.font == 'object'
      ? legend.font
      : {};
    if(layout.hasOwnProperty('legend.font.family')) {
      legend_font = Object.assign({}, legend_font, {
        family: layout['legend.font.family']
      });
    }
    if(layout.hasOwnProperty('legend.font.size')) {
      legend_font = Object.assign({}, legend_font, {
        size: layout['legend.font.size']
      });
    }
    var current_legend_font = full_layout.legend && full_layout.legend.font;
    addFont(legend_font, current_legend_font || layout_font || full_layout.font);

    await Promise.all(Array.from(new Set(font_specs)).map(function(font_spec) {
      return document.fonts.load(font_spec).catch(function() {
        // Plotly will use the browser fallback for an unavailable font.
      });
    }));
  }

  /**
   * Set a new plot container to the figure content.
   */
  setCont() {
    this.plot_cont = document.createElement('div');
    this.plot_cont.className = 'plot-cont';
    this.figure_content.appendChild(this.plot_cont);
  }

  /**
   * Creates a new plot using Plotly in the plot container.
   * @param {Object} plot_in - An object containing plot initial settings.
   * @param {Array} traces - Data traces for the plot.
   * @param {Object} layout - Layout configuration for the plot.
   * @param {Object} config - Additional configuration settings for the plot.
   */
  async newPlot(plot_in, traces, layout, config) {
    if(this.mesh_animation) {
      this.mesh_animation.dispose();
      this.mesh_animation = null;
    }
    await this._loadLayoutFonts(layout);
    await Plotly.newPlot(this.plot_cont, traces, layout, config);
  }

  /**
   * Enables retained rigid meshes when the pinned renderer supports them.
   * @param {Function} snapshot Current world meshes for image and data exports.
   * @returns {boolean} Whether shader-based rigid playback is available.
   */
  initMeshAnimation(snapshot) {
    try {
      this.mesh_animation = new PRDC_JSLAB_PLOT_MESH_ANIMATION(this, snapshot);
      window.addEventListener('beforeunload', () => this.mesh_animation?.dispose(), { once: true });
      return true;
    } catch(error) {
      return false;
    }
  }

  /**
   * Applies native rigid transforms without recalculating Plotly traces.
   * @param {Float32Array[]} matrices World transforms in initial mesh order.
   */
  updateMeshTransforms(matrices) {
    this.mesh_animation.update(matrices);
  }

  /**
   * Queues trace-update objects for the next animation-frame batch flush.
   * @param {Object} traces - The trace data to apply styling changes to.
   * @param {number} N - The index or length of data for styling adjustments.
   */
  updateData(traces, N) {
    var obj = this;
    traces = Array.isArray(traces) ? traces : [traces];
    var idxs = typeof N === 'undefined'
      ? this.plot_cont.data.map((_, i) => i)
      : (Array.isArray(N) ? N : [N]);

    idxs.forEach(function(idx, k) {
      if(idx == null || Number.isNaN(idx)) {
        return;
      }
      var update = (traces.length === idxs.length) ? traces[k] : traces[0];
      obj.update_queue.set(idx, { ...obj.update_queue.get(idx), ...update });
    });

    this._scheduleUpdate();
  }

  /**
   * Queues trace-update objects for the next animation-frame batch flush.
   * @param {Object|Object[]} data - Single trace or array of traces, each with an `id` and properties to restyle.
   */
  updateDataById(data) {
    var obj = this;
    var list = Array.isArray(data) ? data : [data];

    list.forEach(function(item) {
      if(!item || !item.id) {
        return;
      }
      obj.update_queue.set(item.id, { ...obj.update_queue.get(item.id), ...item });
    });

    this._scheduleUpdate();
  }

  /**
   * Schedules the latest queued data after the current Plotly draw completes.
   */
  _scheduleUpdate() {
    if(this.frame_requested || this.drawing || !this.update_queue.size) {
      return;
    }
    this.frame_requested = true;
    requestAnimationFrame(() => this._flushUpdates());
  }

  /**
   * Flushes all queued updates (internal).
   */
  async _flushUpdates() {
    var obj = this;
    this.frame_requested = false;
    if(this.drawing || !this.update_queue.size) {
      return;
    }
    var updates = this.update_queue;
    this.update_queue = new Map();

    var restyle_indices = [];
    var restyle_props = {};

    updates.forEach((update, key) => {
      var idx = (typeof key === 'number')
        ? key
        : obj.plot_cont.data.findIndex(t => t.id === key);

      var flat = {};
      for(var prop in update) {
        if(prop === 'id') {
          continue;
        }
        var val = update[prop];

        if(val && typeof val === 'object' && !Array.isArray(val) && !ArrayBuffer.isView(val)) {
          for(var sub in val) {
            flat[`${prop}.${sub}`] = val[sub];
          }
        } else {
          flat[prop] = val;
        }
      }

      if(idx !== -1 && obj.plot_cont.data[idx]) {
        var slot = restyle_indices.push(idx) - 1;
        for(var prop in flat) {
          if(!restyle_props[prop]) {
            restyle_props[prop] = [];
          }
          var v = flat[prop];
          restyle_props[prop][slot] =
            Array.isArray(v) && v.length === 1 && Array.isArray(v[0]) ? v[0] : v;
        }
      }
    });

    if(restyle_indices.length) {
      this.drawing = true;
      try {
        await Plotly.restyle(this.plot_cont, restyle_props, restyle_indices);
      } finally {
        this.drawing = false;
        this._scheduleUpdate();
      }
    }
  }

  /**
   * Updates the layout of the existing plot.
   * @param {Object} layout - Layout configuration to apply to the plot.
   */
  async relayout(layout) {
    await this._loadLayoutFonts(layout);
    await Plotly.relayout(this.plot_cont, layout);
  }

  /**
   * Restyles the plot with updated trace data.
   * @param {Object} traces - The trace data to apply styling changes to.
   * @param {number} N - The index or length of data for styling adjustments.
   */
  restyle(traces, N) {
    Plotly.restyle(this.plot_cont, traces, N);
  }

  /**
   * Resizes the plot to fit its container.
   */
  resize() {
    Plotly.Plots.resize(this.plot_cont);
  }

  /**
   * Converts the plot to an image.
   * @param {string} ext - The image format extension (e.g., 'png', 'jpeg').
   * @param {Array} size - Optional size of image.
   * @param {boolean} [vector_3d=true] Export 3D geometry as SVG paths when requested.
   * @returns {String} Image of the plot.
   */
  async toImage(ext, size, vector_3d = true) {
    var layout = this.plot_cont._fullLayout;
    var has_3d = layout?._subplots?.gl3d?.length;
    var width = has_3d ? layout.width : this.plot_cont.clientWidth;
    var height = has_3d ? layout.height : this.plot_cont.clientHeight;
    if(typeof size != 'undefined') {
      width = size[0];
      height = size[1];
    }
    var source = this.mesh_animation ? { data: this.mesh_animation.exportData(),
      layout: this.plot_cont.layout, config: this.plot_cont._context } : this.plot_cont;
    if(has_3d) {
      if(vector_3d && ext == 'svg') {
        return await PRDC_JSLAB_PLOT_3D_VECTOR_EXPORT.export(this.plot_cont, source, width, height);
      }
      source = { data: structuredClone(source.data),
        layout: PRDC_JSLAB_PLOT_3D_VECTOR_EXPORT.snapshotLayout(this.plot_cont, source.layout),
        config: source._context || source.config };
      if(ext === 'png') {
        var live = PRDC_JSLAB_PLOT_3D_VECTOR_EXPORT.livePng(this.plot_cont, source, width, height);
        if(live) {
          return await live;
        }
      }
    }
    return await Plotly.toImage(source, {format: ext,
      width: width,
      height: height
    });
  }

  /**
   * Converts the plot to an json object.
   * @param {Function} callback - Callback function that handles the image URL.
   * @returns {Object} JSON of the plot.
   */
  toJSON() {
    var json = Plotly.Plots.graphJson(this.plot_cont,
      undefined, undefined, undefined, true);
    if(!this.mesh_animation) {
      return json;
    }
    var data = typeof json == 'string' ? JSON.parse(json) : json;
    data.data = this.mesh_animation.exportData().map(trace => Object.fromEntries(
      Object.entries(trace).map(([key, value]) => [key, ArrayBuffer.isView(value) ? Array.from(value) : value])));
    return typeof json == 'string' ? JSON.stringify(data) : data;
  }

  /**
   * Sets the plot data from JSON.
   * @param {Array} data Data for the plot.
   */
  async fromJSON(data) {
    if(this.mesh_animation) {
      this.mesh_animation.dispose();
      this.mesh_animation = null;
    }
    await this._loadLayoutFonts(data && data.layout ? data.layout : {});
    await Plotly.newPlot(this.plot_cont, data);
  }
}

var plot = new PRDC_JSLAB_PLOT_VIEWER();
