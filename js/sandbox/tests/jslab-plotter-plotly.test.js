/**
 * @file JSLAB plotly plotter tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_PLOTTER } = require('../jslab-plotter-plotly');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createPlotterHarness() {
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

tests.add('plot reports missing figure id and does not throw', async function(assert) {
  var harness = createPlotterHarness();
  await harness.plotter.plot(123);
  assert.ok(harness.errors[0].includes('LANG_172'));
}, { tags: ['unit', 'plotter'] });

tests.add('_is3DFigure detects 3D traces or scene layout keys', function(assert) {
  var harness = createPlotterHarness();
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
  var harness = createPlotterHarness();
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

exports.MODULE_TESTS = tests;

