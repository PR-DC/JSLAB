/**
 * @file JSLAB plotly plotter tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for jslab plotter plotly test fixtures.
 */
class PRDC_JSLAB_SANDBOX_TESTS_JSLAB_PLOTTER_PLOTLY_TEST_HELPER {

  /**
   * Creates plotter harness.
   */
  static createPlotterHarness() {
    var errors = [];
    var jsl = {
      inter: {
        figures: {
          open_figures: {}
        },
        env: {
          error: function(message) {
            errors.push(message);
          }
        },
        lang: {
          string: function(id) {
            return 'LANG_' + id;
          }
        }
      }
    };
    return { plotter: new PRDC_JSLAB_PLOTTER(jsl), errors: errors };
  }
}


const { PRDC_JSLAB_PLOTTER } = require('../jslab-plotter-plotly');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();


tests.add('plot reports missing figure id and does not throw', async function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_PLOTTER_PLOTLY_TEST_HELPER.createPlotterHarness();
  await harness.plotter.plot(123);
  assert.ok(harness.errors[0].includes('LANG_172'));
}, { tags: ['unit', 'plotter'] });

tests.add('_is3DFigure detects 3D traces or scene layout keys', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_PLOTTER_PLOTLY_TEST_HELPER.createPlotterHarness();
  assert.equal(
    harness.plotter._is3DFigure({ data: [{ type: 'scatter' }], layout: {} }),
    false
  );
  assert.equal(
    harness.plotter._is3DFigure({ data: [{ type: 'surface' }], layout: {} }),
    true
  );
  assert.equal(
    harness.plotter._is3DFigure({ data: [{ type: 'scatter' }], layout: { scene: {} } }),
    true
  );
}, { tags: ['unit', 'plotter'] });

tests.add('updatePlotLayout waits for font-aware relayout before resizing', async function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_PLOTTER_PLOTLY_TEST_HELPER.createPlotterHarness();
  var events = [];
  var applied_layout;
  harness.plotter.jsl.inter.color = { colororder: ['#000'] };
  harness.plotter.jsl.inter.figures.open_figures[1] = {
    layout_3d: false,
    plot: {
      traces: [{ x: [0, 1], y: [0, 1] }, { x: [0, 1], y: [1, 0] }],
      options: {
        font: { family: 'LatinModern', size: 28 },
        legend: { font: { family: 'LatinModern', size: 28 } }
      },
      axis_style_val: 'normal',
      lim_update: false
    },
    context: {
      plot: {
        plot_cont: {},
        relayout: async function(layout) {
          events.push('relayout-start');
          await Promise.resolve();
          applied_layout = layout;
          events.push('relayout-end');
        },
        resize: function() {
          events.push('resize');
        }
      }
    }
  };

  await harness.plotter.updatePlotLayout(1);
  assert.deepEqual(events, ['relayout-start', 'relayout-end', 'resize']);
  assert.equal(applied_layout.font.family, 'LatinModern');
  assert.equal(applied_layout.font.size, 28);
  assert.equal(applied_layout.legend.font.family, 'LatinModern');
}, { tags: ['unit', 'plotter'] });

tests.add('updatePlotLayout preserves a stable 3D user camera revision', async function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_PLOTTER_PLOTLY_TEST_HELPER.createPlotterHarness();
  var applied_layout;
  harness.plotter.jsl.inter.figures.open_figures[1] = {
    layout_3d: true,
    plot: {
      traces: [{ type: 'mesh3d', x: [0], y: [0], z: [0] }],
      options: { uirevision: 'animation-camera' },
      axis_style_val: 'normal',
      view_val: [45, 30],
      lim_update: false
    },
    context: {
      plot: {
        plot_cont: {
          _fullLayout: {
            scene: {
              xaxis: { range: [-1, 1] },
              yaxis: { range: [-1, 1] },
              zaxis: { range: [-1, 1] }
            }
          }
        },
        relayout: async function(layout) {
          if(layout.uirevision) {
            applied_layout = layout;
          }
        },
        resize: function() {}
      }
    }
  };

  await harness.plotter.updatePlotLayout(1);
  assert.equal(applied_layout.uirevision, 'animation-camera');
  assert.equal(applied_layout.scene.uirevision, 'animation-camera');
}, { tags: ['unit', 'plotter'] });

tests.add('native numeric mesh vectors stay one-dimensional when creating a plot', async function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_JSLAB_PLOTTER_PLOTLY_TEST_HELPER.createPlotterHarness();
  var rendered;
  harness.plotter.jsl.inter.color = { colororder: ['#000'] };
  harness.plotter.jsl.inter.figures.open_figures[1] = {
    plot: { traces: [{ type: 'mesh3d', x: new Float32Array([0, 1, 0]),
      y: new Float64Array([0, 0, 1]), z: new Float32Array([0, 0, 0]),
      i: new Uint32Array([0]), j: new Uint32Array([1]), k: new Uint32Array([2]) }] },
    dom: { querySelector: function() {
      return {};
    }, getElementById: function() {
      return { style: {} };
    } },
    context: { plot: { newPlot: async function(_plot, traces) {
      rendered = traces[0];
    } } }
  };
  await harness.plotter.plot(1);
  assert.equal(rendered.x instanceof Float32Array, true);
  assert.equal(rendered.y instanceof Float64Array, true);
  assert.equal(rendered.x.length, 3);
  assert.deepEqual(Array.from(rendered.x), [0, 1, 0]);
  assert.deepEqual(Array.from(rendered.i), [0]);
}, { tags: ['unit', 'plotter', 'simulate'] });

exports.MODULE_TESTS = tests;
