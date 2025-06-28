/**
 * @file JSLAB ploter plotly based
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB ploter plotly based.
 */
class PRDC_JSLAB_PLOTER {
  
  /**
   * Initializes the plotter object, setting Plotly as the underlying library for plotting operations.
 * @param {Object} jsl - Reference to the JSLAB environment.
   */
  constructor(jsl) {
    this.jsl = jsl;
    this.library = 'plotly';
    
  }
  
  /**
   * Sets the plot for the given figure identifier, displaying data and configuration.
   * @param {number} fid - The identifier for the figure to update.
   */
  async plot(fid) {
    if(!this.jsl.figures.open_figures.hasOwnProperty(fid)) {
      this.jsl.env.error('@ploter/plot: '+language.string(172));
      return;
    }
    
    var obj = this;
    var figure = this.jsl.figures.open_figures[fid];
    var plot = figure.plot;
    var context_plot = figure.context.plot;
    
    var plot_cont = figure.dom.querySelector('#figure-content .plot-cont');
    if(!plot_cont) {
      context_plot.setCont();
      plot_cont = context_plot.plot_cont;
    }
    
    // Plot traces
    var traces = [];
    var plot_traces = structuredClone(plot.traces);
    if(!Array.isArray(plot_traces)) {
      plot_traces = [plot_traces];
    }
    var ci = 0;
    figure.layout_3d = false;
    
    plot_traces.forEach(function(trace_options) {
      if(!figure.layout_3d && (trace_options.hasOwnProperty('z') && 
          (trace_options.hasOwnProperty('type') && trace_options.type != 'heatmap'))) {
        figure.layout_3d = true; // It is 3D plot
      }
      
      var type;
      if(trace_options.hasOwnProperty('type')) {
        type = trace_options.type;
      }
      if(type != 'pie') {
        var trace = {};
        trace.type = type;
        
        Object.keys(trace_options).forEach(function(key) {
          if(['x', 'y', 'z'].includes(key) && !Array.isArray(trace_options[key])) {
            trace[key] = [trace_options[key]];
          } else if((!['mesh3d'].includes(type) && key == 'color') || key == 'width') {
            if(!trace.hasOwnProperty('line')) {
              trace.line = {};
            }
            trace.line[key] = trace_options[key];
          } else {
            var key_lc = key.toLowerCase();
            if(trace.hasOwnProperty(key_lc) && typeof trace[key_lc] == 'object') {
              Object.assign(trace[key_lc], trace_options[key]);
            } else {
              trace[key_lc] = trace_options[key];
            }
          }
        });
        
        if(!['mesh3d'].includes(type) && (!trace.hasOwnProperty('line') || !trace.line.hasOwnProperty('color'))) {
         if(!trace.hasOwnProperty('line')) {
            trace.line = {};
          }
          trace.line.color = obj.jsl.color.colororder[ci];
          ci += 1;
          trace.cliponaxis = false;
        }
        traces.push(trace);
      } else {
        traces.push(trace_options);
      }
    });
    
    if(figure.layout_3d) {
      figure.dom.getElementById('figure-menu').className = 'figure-3d';
      if(!plot.axis_style_val) {
        plot.axis_style_val = 'equal';
      }
    } else {
      figure.dom.getElementById('figure-menu').className =  'figure-2d';
      if(!plot.axis_style_val) {
        plot.axis_style_val = 'normal';
      }
    }
      
    // Plot config
    var config = {
      responsive: true,
      scrollZoom: true
    };

    var layout = {};
    
    await context_plot.newPlot(plot, traces, layout, config);
    figure.dom.getElementById('rotate-menu').style.display = "none";
  }
  
  /**
   * Updates the layout for the plot associated with the specified figure identifier.
   * @param {number} fid - The identifier for the figure whose layout is to be updated.
   */
  updatePlotLayout(fid) {
    if(!this.jsl.figures.open_figures.hasOwnProperty(fid)) {
      this.jsl.env.error('@ploter/updatePlotLayout: '+language.string(172));
      return;
    }
    var figure = this.jsl.figures.open_figures[fid];
    var plot = figure.plot;
    var context_plot = figure.context.plot;
    var plot_cont = context_plot.plot_cont;
    
    // Plot layout
    var layout = {
      title: {},
      autosize: true,
      plot_bgcolor: "#fff",
      paper_bgcolor: "#fff",
      showlegend: plot.traces.length > 1,
      legend: {
        x: 0.98,
        xanchor: 'right',
        y: 0.98,
        bgcolor: '#fff',
        bordercolor: '#000',
        borderwidth: 1,
        borderpad: 10
      },
      font: {
        family: 'Roboto',
        size: 18
      }
    };
    
    if(figure.layout_3d) {
      Object.assign(layout, 
        {
          margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 0,
            pad: 0
          },
          scene: {
            xaxis: {
              showgrid: true,
              zeroline: false,
              showline: true,
              ticks: 'inside',
              ticklen: 8,
              linewidth: 1,
              tickwidth: 1,
              gridwidth: 0.5,
              tickcolor: '#000',
              linecolor: '#000',
              gridcolor: '#999',
              mirror: 'ticks',
              autorange: true,
              title: {
                text: 'x [m]'
              },
              tickangle: 0
            },
            yaxis: {
              showgrid: true,
              zeroline: false,
              showline: true,
              ticks: 'inside',
              ticklen: 8,
              linewidth: 1,
              tickwidth: 1,
              gridwidth: 0.5,
              tickcolor: '#000',
              linecolor: '#000',
              gridcolor: '#999',
              mirror: 'ticks',
              autorange: true,
              title: {
                text: 'y [m]'
              },
              tickangle: 0
            },
            zaxis: {
              showgrid: true,
              zeroline: false,
              showline: true,
              ticks: 'inside',
              ticklen: 8,
              linewidth: 1,
              tickwidth: 1,
              gridwidth: 0.5,
              tickcolor: '#000',
              linecolor: '#000',
              gridcolor: '#999',
              mirror: 'ticks',
              autorange: true,
              title: {
                text: 'z [m]'
              },
              tickangle: 0
            },
            aspectratio: {
              x: 1, y: 1, z: 1
            },
            camera: {
              projection: { type: 'orthographic' }
            },
            dragmode: 'orbit' // "zoom" | "pan" | "orbit"
          }
        }
      );
    } else {
      Object.assign(layout, 
        {
          margin: {
            l: 60,
            r: 15,
            b: 60,
            t: 15,
            pad: 0
          },
          xaxis: {
            showgrid: true,
            zeroline: false,
            showline: true,
            automargin: true,
            mirror: 'ticks',
            ticks: 'inside',
            ticklen: 8,
            tickwidth: 0.5,
            tickcolor: '#000',
            linecolor: '#000',
            linewidth: 0.5,
            exponentformat: 'power'
          },
          yaxis: {
            showgrid: true,
            zeroline: false,
            showline: true,
            automargin: true,
            mirror: 'ticks',
            ticks: 'inside',
            ticklen: 8,
            tickwidth: 0.5,
            tickcolor: '#000',
            linecolor: '#000',
            linewidth: 0.5,
            exponentformat: 'power'
          }
        }
      );
    }

    // Options    
    if(plot.options.hasOwnProperty('legend')) {
      Object.assign(layout.legend, plot.options.legend);
    }
    if(plot.options.hasOwnProperty('showLegend')) {
      layout.showlegend = plot.options.showLegend;
    }
    if(plot.options.hasOwnProperty('legendLocation')) {
      switch(plot.options.legendLocation.toLowerCase()) {
        case 'north':
          layout.legend.xanchor = 'center',
          layout.legend.yanchor = 'top',
          layout.legend.x = 0.5,
          layout.legend.y = 0.98;
          break;
        case 'south':
          layout.legend.xanchor = 'center',
          layout.legend.yanchor = 'bottom',
          layout.legend.x = 0.5,
          layout.legend.y = 0.02;
          break;
        case 'east':
          layout.legend.xanchor = 'right',
          layout.legend.yanchor = 'center',
          layout.legend.x = 0.98,
          layout.legend.y = 0.5;
          break;
        case 'west':
          layout.legend.xanchor = 'left',
          layout.legend.yanchor = 'center',
          layout.legend.x = 0.02,
          layout.legend.y = 0.5;
          break;
        case 'northeast':
          layout.legend.xanchor = 'right',
          layout.legend.yanchor = 'top',
          layout.legend.x = 0.98,
          layout.legend.y = 0.98;
          break;
        case 'northwest':
          layout.legend.xanchor = 'left',
          layout.legend.yanchor = 'top',
          layout.legend.x = 0.02,
          layout.legend.y = 0.98;
          break;
        case 'southeast':
          layout.legend.xanchor = 'right',
          layout.legend.yanchor = 'bottom',
          layout.legend.x = 0.98,
          layout.legend.y = 0.02;
          break;
        case 'southwest':
          layout.legend.xanchor = 'left',
          layout.legend.yanchor = 'bottom',
          layout.legend.x = 0.02,
          layout.legend.y = 0.02;
          break;
        case 'northoutside':
          layout.legend.xanchor = 'center',
          layout.legend.yanchor = 'bottom',
          layout.legend.x = 0.5,
          layout.legend.y = 1.02;
          break;
        case 'southoutside':
          layout.legend.xanchor = 'center',
          layout.legend.yanchor = 'top',
          layout.legend.x = 0.5,
          layout.legend.y = -0.02;
          break;
        case 'eastoutside':
          layout.legend.xanchor = 'left',
          layout.legend.yanchor = 'center',
          layout.legend.x = 1.02,
          layout.legend.y = 0.5;
          break;
        case 'westoutside':
          layout.legend.xanchor = 'right',
          layout.legend.yanchor = 'center',
          layout.legend.x = -0.02,
          layout.legend.y = 0.5;
          break;
        case 'northeastoutside':
          layout.legend.xanchor = 'left',
          layout.legend.yanchor = 'bottom',
          layout.legend.x = 1.02,
          layout.legend.y = 1.02;
          break;
        case 'northwestoutside':
          layout.legend.xanchor = 'right',
          layout.legend.yanchor = 'bottom',
          layout.legend.x = -0.02,
          layout.legend.y = 1.02;
          break;
        case 'southeastoutside':
          layout.legend.xanchor = 'left',
          layout.legend.yanchor = 'top',
          layout.legend.x = 1.02,
          layout.legend.y = -0.02;
          break;
        case 'southwestoutside':
          layout.legend.xanchor = 'right',
          layout.legend.yanchor = 'top',
          layout.legend.x = -0.02,
          layout.legend.y = -0.02;
          break;
      }
    }
    if(plot.options.hasOwnProperty('legendOrientation')) {
      if(plot.options.legendOrientation == 'horizontal' ||
          plot.options.legendOrientation == 'h') {
        layout.legend.orientation = 'h';
      } else {
        layout.legend.orientation = 'v';
      }
    }
    
    if(figure.layout_3d) {
      if(plot.options.hasOwnProperty('xlim')) {
        layout.scene.xaxis.range = plot.options.xlim;
      }
      if(plot.options.hasOwnProperty('ylim')) {
        layout.scene.yaxis.range = plot.options.ylim;
      }
      if(plot.options.hasOwnProperty('zlim')) {
        layout.scene.zaxis.range = plot.options.zlim;
      }
    } else {
      if(plot.options.hasOwnProperty('xlim')) {
        layout.xaxis.range = plot.options.xlim;
      }
      if(plot.options.hasOwnProperty('ylim')) {
        layout.yaxis.range = plot.options.ylim;
      }
    }
    
    if(plot.options.hasOwnProperty('font')) {
      layout.font = plot.options.font;
    }
    if(plot.options.hasOwnProperty('margin')) {
      var margin = plot.options.margin;
      if(margin.hasOwnProperty('top')) {
        layout.margin.t = margin.top;
      }
      if(margin.hasOwnProperty('bottom')) {
        layout.margin.b = margin.bottom;
      }
      if(margin.hasOwnProperty('left')) {
        layout.margin.l = margin.left;
      }
      if(margin.hasOwnProperty('right')) {
        layout.margin.r = margin.right;
      }
    }

    if(plot.hasOwnProperty('title_val')) {
      layout.title.text = plot.title_val;
      layout.title.font = {
        size: 18
      };
      layout.margin.t = 40;
    }
    
    if(plot.hasOwnProperty('legend_state_val') && 
        ['on', 'off', 1, 0].includes(plot.legend_state_val)) {
      layout.showlegend = plot.legend_state_val == 'on' || plot.legend_state_val;
    }
    
    if(figure.layout_3d) {
      if(plot.hasOwnProperty('xlabel_val')) {
        layout.scene.xaxis.title = plot.xlabel_val;
        layout.scene.xaxis.automargin = true;
        layout.scene.xaxis.standoff = 20;
      }
      if(plot.hasOwnProperty('ylabel_val')) {
        layout.scene.yaxis.title = plot.ylabel_val;
        layout.scene.yaxis.automargin = true;
        layout.scene.yaxis.standoff = 20;
      }
      if(plot.hasOwnProperty('zlabel_val')) {
        layout.scene.zaxis.title = plot.zlabel_val;
        layout.scene.zaxis.automargin = true;
        layout.scene.zaxis.standoff = 20;
      }
    } else {
      if(plot.hasOwnProperty('xlabel_val')) {
        layout.xaxis.title = plot.xlabel_val;
        layout.xaxis.automargin = true;
        layout.xaxis.standoff = 20;
      }
      if(plot.hasOwnProperty('ylabel_val')) {
        layout.yaxis.title = plot.ylabel_val;
        layout.yaxis.automargin = true;
        layout.yaxis.standoff = 20;
      }
      if(plot.axis_style_val == 'equal') {
        layout.yaxis.scaleanchor = "x";
      } else {
        layout.yaxis.scaleanchor = false;
      }
    }
    
    context_plot.relayout(layout);
    context_plot.resize();
    
    if(plot.lim_update) {
      plot.lim_update = false;
      var layout2 = {};
      if(figure.layout_3d) {
        if(plot.hasOwnProperty('xlim_val')) {
          if(plot.xlim_val[0] == 'auto') {
            plot.xlim_val[0] = plot_cont._fullLayout.scene.xaxis.range[0];
          } 
          if(plot.xlim_val[1] == 'auto') {
            plot.xlim_val[1] = plot_cont._fullLayout.scene.xaxis.range[1];
          } 
          layout2['scene.xaxis.range'] = plot.xlim_val;
        }
        if(plot.hasOwnProperty('ylim_val')) {
          if(plot.ylim_val[0] == 'auto') {
            plot.ylim_val[0] = plot_cont._fullLayout.scene.yaxis.range[0];
          } 
          if(plot.ylim_val[1] == 'auto') {
            plot.ylim_val[1] = plot_cont._fullLayout.scene.yaxis.range[1];
          } 
          layout2['scene.yaxis.range'] = plot.ylim_val;
        }
        if(plot.hasOwnProperty('zlim_val')) {
          if(plot.zlim_val[0] == 'auto') {
            plot.zlim_val[0] = plot_cont._fullLayout.scene.zaxis.range[0];
          } 
          if(plot.zlim_val[1] == 'auto') {
            plot.zlim_val[1] = plot_cont._fullLayout.scene.zaxis.range[1];
          } 
          layout2['scene.zaxis.range'] = plot.zlim_val;
        }
      } else {
        if(plot.hasOwnProperty('xlim_val')) {
          if(plot.xlim_val[0] == 'auto') {
            plot.xlim_val[0] = plot_cont._fullLayout.xaxis.range[0];
          } 
          if(plot.xlim_val[1] == 'auto') {
            plot.xlim_val[1] = plot_cont._fullLayout.xaxis.range[1];
          } 
          layout2['xaxis.range'] = plot.xlim_val;
        }
        if(plot.hasOwnProperty('ylim_val')) {
          if(plot.ylim_val[0] == 'auto') {
            plot.ylim_val[0] = plot_cont._fullLayout.yaxis.range[0];
          } 
          if(plot.ylim_val[1] == 'auto') {
            plot.ylim_val[1] = plot_cont._fullLayout.yaxis.range[1];
          } 
          layout2['yaxis.range'] = plot.ylim_val;
        }
      }
      context_plot.relayout(layout2);
      context_plot.resize();
    }
    
    if(figure.layout_3d) {
      var layout3 = {};
      
      // Equal axes
      var xRange = plot_cont._fullLayout.scene.xaxis.range;
      if(plot.hasOwnProperty('xlim_val')) {
        xRange = plot.xlim_val;
        layout3['scene.xaxis.range'] = plot.xlim_val;
      }
      var yRange = plot_cont._fullLayout.scene.yaxis.range;
      if(plot.hasOwnProperty('ylim_val')) {
        yRange = plot.ylim_val;
        layout3['scene.yaxis.range'] = plot.ylim_val;
      }
      var zRange = plot_cont._fullLayout.scene.zaxis.range;
      if(plot.hasOwnProperty('zlim_val')) {
        zRange = plot.zlim_val;
        layout3['scene.zaxis.range'] = plot.zlim_val;
      }

      var zoom = 1;
      if(typeof plot.zoom_val != 'undefined') {
        zoom = plot.zoom_val;
      }
      
      if(plot.axis_style_val == 'equal') {
        var xRangeSize = Math.abs(xRange[1] - xRange[0]);
        var yRangeSize = Math.abs(yRange[1] - yRange[0]);
        var zRangeSize = Math.abs(zRange[1] - zRange[0]);
        var maxRange = Math.max(xRangeSize, yRangeSize, zRangeSize);
        
        layout3["scene.aspectratio"] =  {
          x: xRangeSize / maxRange * zoom,
          y: yRangeSize / maxRange * zoom,
          z: zRangeSize / maxRange * zoom
        };
      } else {
        layout3["scene.aspectratio"] =  {
          x: zoom,
          y: zoom,
          z: zoom
        };
      }
     
      var radius = maxRange/2;
      var azimuthRad = plot.view_val[0] * Math.PI / 180;
      var elevationRad = plot.view_val[1] * Math.PI / 180;

      var eye = {
        x: radius * Math.cos(elevationRad) * Math.cos(azimuthRad),
        y: radius * Math.cos(elevationRad) * Math.sin(azimuthRad),
        z: radius * Math.sin(elevationRad)
      };
      
      var up = { x: 0, y: 0, z: 1 };

      layout3['scene.camera.eye'] = eye;
      layout3['scene.camera.up'] = up;
      
      context_plot.relayout(layout3);
      context_plot.resize();
    }
  }

  /**
   * Updates plot data for a specified figure.
   * @param {string} fid - The identifier of the figure to update.
   * @param {Object} traces - The trace data to be updated in the plot.
   * @param {number} N - The new data length or index for updating the plot.
   */
  updateData(fid, traces, N) {
    if(!this.jsl.figures.open_figures.hasOwnProperty(fid)) {
      this.jsl.env.error('@ploter/updateData: '+language.string(172));
      return;
    }
    var figure = this.jsl.figures.open_figures[fid];
    figure.context.plot.updateData(traces, N);
  }
  
  /**
   * Updates plot data for a specified figure.
   * @param {string} fid - Identifier of the figure to update.
   * @param {Object|Object[]} data - Single trace or array of traces, each with an `id` and properties to restyle.
   */
  updateDataById(fid, data) {
    if(!this.jsl.figures.open_figures.hasOwnProperty(fid)) {
      this.jsl.env.error('@ploter/updateDataById: '+language.string(172));
      return;
    }
    var figure = this.jsl.figures.open_figures[fid];
    figure.context.plot.updateDataById(data);
  }
  
  /**
   * Handles plot resizing for a specified figure identifier.
   * @param {number} fid - The identifier for the figure to resize.
   */
  onResize(fid) {
    if(!this.jsl.figures.open_figures.hasOwnProperty(fid)) {
      this.jsl.env.error('@ploter/onResize: '+language.string(172));
      return;
    }
    var figure = this.jsl.figures.open_figures[fid];
    figure.context.plot.resize();
  }
  
  /**
   * Removes the plot container for a specified figure identifier.
   * @param {number} fid - The identifier for the figure from which to remove the plot container.
   */
  remove(fid) {
    if(!this.jsl.figures.open_figures.hasOwnProperty(fid)) {
      this.jsl.env.error('@ploter/remove: '+language.string(172));
      return;
    }
    var figure = this.jsl.figures.open_figures[fid];
    var plot_cont = figure.context.plot.plot_cont;
    if(plot_cont) {
      plot_cont.remove();
    }
  }
  
  /**
   * Sets the plot data from JSON.
   * @param {number} fid - The identifier for the figure to update.
   * @param {Array} data Data for the plot.
   */
  async fromJSON(fid, data) {
    var figure = this.jsl.figures.open_figures[fid];
    var plot = figure.plot;
    var context_plot = figure.context.plot;
    
    var plot_cont = figure.dom.querySelector('#figure-content .plot-cont');
    if(!plot_cont) {
      context_plot.setCont();
    }

    plot.traces = data.data;
    this._JsonToOptions(figure, data);
    await context_plot.fromJSON(data);
  }
  
  /**
   * Sets the plot data from JSON.
   * @param {Array} fig Data for the plot.
   * @returns {Boolean} - Returns true if the figure is 3D.
   */
  _is3DFigure(fig) {
    var types_3d = new Set([
      'scatter3d', 'surface', 'mesh3d',
      'cone', 'streamtube', 'volume', 'isosurface'
    ]);
    var trace_is_3d = fig.data?.some(t => types_3d.has(t.type));
    var layout_has_scene = Object.keys(fig.layout || {})
                                 .some(k => k.startsWith('scene'));
    return trace_is_3d || layout_has_scene;
  }
  
  /**
   * Re-creates plot.options and the extra “synthetic” fields
   * (title_val, xlim_val, …) from a saved Plotly figure JSON.
   *
   * @param {Object} figure  – runtime figure wrapper (has .plot, .dom, …)
   * @param {Object} data    – JSON produced by Plotly.toJSON / graphJson
   */
  _JsonToOptions(figure, data) {
    var plot = figure.plot;
    var layout = data.layout ?? {};

    figure.layout_3d = this._is3DFigure(data);

    figure.dom.getElementById('figure-menu').className =
        figure.layout_3d ? 'figure-3d' : 'figure-2d';

    if(!plot.axis_style_val) {
      plot.axis_style_val = figure.layout_3d ? 'equal' : 'normal';
    }

    var options = {};

    if(typeof layout.showlegend === 'boolean') {
      options.showLegend      = layout.showlegend;
      plot.legend_state_val   = layout.showlegend ? 'on' : 'off';
    }

    if(layout.legend && Object.keys(layout.legend).length) {
      var lg = JSON.parse(JSON.stringify(layout.legend));
      options.legend = lg;

      if(lg.orientation)
        options.legendOrientation =
          lg.orientation === 'h' ? 'horizontal' : 'vertical';

      {
        var { x=0, y=0 } = lg;
        var outsideX = x < 0 || x > 1;
        var outsideY = y < 0 || y > 1;

        var dirNS = y <= (outsideY ? -0.02 : 0.02) ? 'south'
                    : y >= (outsideY ? 1.02 : 0.98) ? 'north' : '';
        var dirEW = x <= (outsideX ? -0.02 : 0.02) ? 'west'
                    : x >= (outsideX ? 1.02 : 0.98) ? 'east' : '';

        let loc = (dirNS + dirEW) || 'north';
        if (outsideX || outsideY) loc += 'outside';
        options.legendLocation = loc.toLowerCase();
      }
    }

    if(figure.layout_3d) {
      var sc = layout.scene ?? {};
      if(sc.xaxis?.range) options.xlim = plot.xlim_val = [...sc.xaxis.range];
      if(sc.yaxis?.range) options.ylim = plot.ylim_val = [...sc.yaxis.range];
      if(sc.zaxis?.range) options.zlim = plot.zlim_val = [...sc.zaxis.range];
    } else {
      if(layout.xaxis?.range) options.xlim = plot.xlim_val = [...layout.xaxis.range];
      if(layout.yaxis?.range) options.ylim = plot.ylim_val = [...layout.yaxis.range];
    }

    if(layout.font)   options.font   = JSON.parse(JSON.stringify(layout.font));
    if(layout.margin) {
      var {t, b, l, r} = layout.margin;
      options.margin = {
        ...(t != null && { top: t }),
        ...(b != null && { bottom: b }),
        ...(l != null && { left: l }),
        ...(r != null && { right: r })
      };
    }

    if(layout.title?.text) plot.title_val  = layout.title.text;

    if(figure.layout_3d) {
      var sc = layout.scene ?? {};
      if(sc.xaxis?.title?.text) plot.xlabel_val = sc.xaxis.title.text;
      if(sc.yaxis?.title?.text) plot.ylabel_val = sc.yaxis.title.text;
      if(sc.zaxis?.title?.text) plot.zlabel_val = sc.zaxis.title.text;
    } else {
      if(layout.xaxis?.title?.text) plot.xlabel_val = layout.xaxis.title.text;
      if(layout.yaxis?.title?.text) plot.ylabel_val = layout.yaxis.title.text;
    }

    if(figure.layout_3d) {
      var sc = layout.scene ?? {};

      if(sc.aspectratio) {
        var {x = 1, y = 1, z = 1} = sc.aspectratio;
        var minAR = Math.min(x,y,z), maxAR = Math.max(x,y,z);
        var approxEqual = (maxAR - minAR) < 1e-6;
        plot.axis_style_val = approxEqual ? 'equal' : 'normal';
      }

      if(sc.camera?.eye) {
        var {x: ex = 1, y: ey = 1, z: ez = 1} = sc.camera.eye;
        var radius = Math.hypot(ex, ey, ez);
        var azimuth = (Math.atan2(ey, ex) * 180 / Math.PI + 360) % 360;
        var elevation = Math.asin(ez / radius) * 180 / Math.PI;
        plot.view_val = [azimuth, elevation];

        if(sc.aspectratio && plot.xlim_val && plot.ylim_val && plot.zlim_val) {
          var dx = Math.abs(plot.xlim_val[1] - plot.xlim_val[0]);
          var dy = Math.abs(plot.ylim_val[1] - plot.ylim_val[0]);
          var dz = Math.abs(plot.zlim_val[1] - plot.zlim_val[0]);
          var maxRange = Math.max(dx, dy, dz);
          var intrinsicAR = { x: dx/maxRange, y: dy/maxRange, z: dz/maxRange };
          var {x: ax = 1, y: ay = 1, z: az = 1} = sc.aspectratio;
          var zoom = (ax/(intrinsicAR.x || 1) +
                        ay/(intrinsicAR.y || 1) +
                        az/(intrinsicAR.z || 1)) / 3;
          plot.zoom_val = zoom;
        }
      }
    } else {
      plot.axis_style_val =
        layout.yaxis?.scaleanchor === 'x' ? 'equal' : 'normal';
    }
    figure.plot.options = options;
  }
}

exports.PRDC_JSLAB_PLOTER = PRDC_JSLAB_PLOTER;