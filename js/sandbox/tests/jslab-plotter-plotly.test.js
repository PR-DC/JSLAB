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

exports.MODULE_TESTS = tests;

