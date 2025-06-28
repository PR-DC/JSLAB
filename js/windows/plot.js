/**
 * @file JSLAB library plot script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB plot.
 */
class PRDC_JSLAB_PLOT {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_PLOT class.
   */
  constructor() {
    var obj = this;
    this.figure_content = document.getElementById('figure-content');
    this.plot_cont;
    
    this.update_queue = new Map();
    this.frame_requested = false;
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
    await Plotly.newPlot(this.plot_cont, traces, layout, config);
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
      if(idx == null || Number.isNaN(idx)) return;
      var update = (traces.length === idxs.length) ? traces[k] : traces[0];
      obj.update_queue.set(idx, { ...obj.update_queue.get(idx), ...update });
    });
    
    if(!this.frame_requested) {
      this.frame_requested = true;
      requestAnimationFrame(function() {
        obj._flushUpdates();
      });
    }
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

    if(!this.frame_requested) {
      this.frame_requested = true;
      requestAnimationFrame(function() {
        obj._flushUpdates();
      });
    }
  }
  
  /**
   * Flushes all queued updates (internal).
   */
  _flushUpdates() {
    var obj = this;
    this.frame_requested = false;

    var restyle_indices = [];
    var restyle_props = {};

    this.update_queue.forEach((update, key) => {
      var idx = (typeof key === 'number')
        ? key
        : obj.plot_cont.data.findIndex(t => t.id === key);

      var flat = {};
      for(var prop in update) {
        if(prop === 'id') continue;
        var val = update[prop];

        if(val && typeof val === 'object' && !Array.isArray(val)) {
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
          if(!restyle_props[prop]) restyle_props[prop] = [];
          var v = flat[prop];
          restyle_props[prop][slot] =
            Array.isArray(v) && v.length === 1 && Array.isArray(v[0]) ? v[0] : v;
        }
      }
     });
    
    if(restyle_indices.length) {
      Plotly.restyle(this.plot_cont, restyle_props, restyle_indices);
    }
    this.update_queue.clear();
  }
  
  /**
   * Updates the layout of the existing plot.
   * @param {Object} layout - Layout configuration to apply to the plot.
   */
  relayout(layout) {
    Plotly.relayout(this.plot_cont, layout);
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
   * @returns {String} Image of the plot.
   */
  async toImage(ext, size) {
    var width = this.plot_cont.clientWidth;
    var height =  this.plot_cont.clientHeight;
    if(typeof size != 'undefined') {
      width = size[0];
      height = size[1];
    }
    return await Plotly.toImage(this.plot_cont, {format: ext,
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
    return Plotly.Plots.graphJson(this.plot_cont, 
      undefined, undefined, undefined, true);
  }
  
  /**
   * Sets the plot data from JSON.
   * @param {Array} data Data for the plot.
   */
  async fromJSON(data) {
    await Plotly.newPlot(this.plot_cont, data);
  }
}

var plot = new PRDC_JSLAB_PLOT();