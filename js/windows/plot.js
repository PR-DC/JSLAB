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
   * @param {Function} callback - Callback function that handles the image URL.
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
    })
  }
}

var plot = new PRDC_JSLAB_PLOT();