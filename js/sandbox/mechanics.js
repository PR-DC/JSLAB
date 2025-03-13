/**
 * @file JSLAB library mechanics submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB mechanics submodule.
 */
class PRDC_JSLAB_LIB_MECHANICS {
  
  /**
   * Constructs a mechanics submodule object with access to JSLAB's device functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }
  
  /**
   * Plots beam diagrams.
   * @param {Array} data Array of objects with x, y, title, xlabel, ylabel
   * @param {Object} [opts_in] Extra plotting options
   * @returns {Promise<{extrems: String[], context: Object}>}
   */
  async plotBeamDiagrams(data, opts_in = {}) {
    var context = await this.jsl.windows.openPlotlyjs();
    context.setTitle('Beam Diagrams');
    var plot_config = {
      responsive: true,
      scrollZoom: true,
      modeBarButtonsToAdd: [{
        name: 'Download plot as a svg',
        icon: context.Plotly.Icons.camera,
        click: function(gd) {
          context.Plotly.downloadImage(gd, {format: 'svg'});
        }
      }]
    };
    
    var opts = {
      n: 50,
      digits: 2,
      font: {
        family: 'Roboto',
        size: 18
      },
      ...opts_in
    };
    var extrems = [];
    
    var n = data.length;
    var traces = [];
    for(var i = 0; i < n; i++) {
      var [y_max, I_max] = maxi(data[i].y);
      extrems.push(`${data[i].title}: ${data[i].ylabel[0]}_max = ${y_max.toFixed(opts.digits)} ${data[i].ylabel[1]}, ${data[i].xlabel[0]} = ${data[i].x[I_max].toFixed(opts.digits)} ${data[i].xlabel[1]}`);
      
      var trace = {
        x: data[i].x,
        y: data[i].y,
        cliponaxis: false,
        mode: 'lines+markers',
        line: { 
          color: "#000", 
          width: 2 
        },
        xaxis: 'x' + (i > 0  ? (i+1) : ''),
        yaxis: 'y' + (i > 0  ? (i+1) : ''),
        showlegend: false
      };
      traces.push(trace);

      var xq = this.jsl.array.linspace(data[i].x[0], end(data[i].x), opts.n);
      var yq = this.jsl.math.interp(data[i].x, data[i].y, xq);
      var stem_trace = {
        x: xq.flatMap(x => [x, x, null]),
        y: yq.flatMap(y => [0, y, null]),
        cliponaxis: false,
        mode: 'lines',
        line: { 
          color: "#000", 
          width: 1 
        },
        xaxis: 'x' + (i > 0  ? (i+1) : ''),
        yaxis: 'y' + (i > 0  ? (i+1) : ''),
        showlegend: false
      };
      traces.push(stem_trace);
    }
    
    var plot_layout = {
      grid: { 
        rows: n, 
        columns: 1, 
        pattern: 'independent',
        ygap: 0.25
      },
      title: {},
      autosize: true,
      plot_bgcolor: "#fff",
      paper_bgcolor: "#fff",
      showlegend: false,
      font: opts.font,
      margin: {
        l: 60,
        r: 15,
        b: 60,
        t: 15,
        pad: 0
      }
    };
    
    for(var i = 0; i < n; i++) {
      plot_layout['xaxis' + (i > 0  ? (i+1) : '')] = {
        showgrid: true,
        zeroline: true,
        showline: true,
        automargin: true,
        mirror: 'ticks',
        ticks: 'inside',
        ticklen: 8,
        tickwidth: 0.5,
        tickcolor: '#000',
        linecolor: '#000',
        linewidth: 0.5,
        layer: "below traces",
        exponentformat: 'power'
      };
      if(i == (n-1)) {
        plot_layout['xaxis' + (i > 0  ? (i+1) : '')].title = {
          text: `${data[i].xlabel[0]} [${data[i].xlabel[1]}]`, 
          standoff: 0
        };
      }
      
      plot_layout['yaxis' + (i > 0 ? (i+1) : '')] = {
        showgrid: true,
        zeroline: true,
        showline: true,
        automargin: true,
        mirror: 'ticks',
        ticks: 'inside',
        ticklen: 8,
        tickwidth: 0.5,
        tickcolor: '#000',
        linecolor: '#000',
        linewidth: 0.5,
        layer: "below traces",
        title: {
          text: `${data[i].ylabel[0]} [${data[i].ylabel[1]}]`,
        },
        exponentformat: 'power'
      };
    }
    context.Plotly.newPlot(context.plot_cont, traces, plot_layout, plot_config);
    return { extrems, context };
  }
}

exports.PRDC_JSLAB_LIB_MECHANICS = PRDC_JSLAB_LIB_MECHANICS;