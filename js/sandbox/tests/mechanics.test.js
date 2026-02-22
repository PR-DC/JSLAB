/**
 * @file JSLAB mechanics submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_MECHANICS } = require('../mechanics');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function linspace(start, end, n) {
  if(n <= 1) {
    return [start];
  }
  var out = [];
  var step = (end - start) / (n - 1);
  for(var i = 0; i < n; i++) {
    out.push(start + step * i);
  }
  return out;
}

function interpLinear(x, y, xq) {
  return xq.map(function(q) {
    if(q <= x[0]) return y[0];
    if(q >= x[x.length - 1]) return y[y.length - 1];
    for(var i = 0; i < x.length - 1; i++) {
      if(q >= x[i] && q <= x[i + 1]) {
        var t = (q - x[i]) / (x[i + 1] - x[i]);
        return y[i] * (1 - t) + y[i + 1] * t;
      }
    }
    return y[y.length - 1];
  });
}

function createMechanicsHarness() {
  var plot_calls = [];
  var title_calls = [];

  var context = {
    Plotly: {
      Icons: {
        camera: {}
      },
      downloadImage: function() {},
      newPlot: function(container, traces, layout, config) {
        plot_calls.push({
          container: container,
          traces: traces,
          layout: layout,
          config: config
        });
      }
    },
    plot_cont: { id: 'plot' },
    setTitle: function(title) {
      title_calls.push(title);
    }
  };

  var jsl = {
    inter: {
      lang: {
        currentString: function(id) {
          return 'LANG_' + id;
        }
      },
      windows: {
        openPlotlyjs: async function() {
          return context;
        }
      },
      array: {
        maxi: function(values) {
          var max_value = values[0];
          var max_index = 0;
          for(var i = 1; i < values.length; i++) {
            if(values[i] > max_value) {
              max_value = values[i];
              max_index = i;
            }
          }
          return [max_value, max_index];
        },
        linspace: linspace,
        end: function(values) {
          return values[values.length - 1];
        }
      },
      math: {
        interp: interpLinear
      }
    }
  };

  var mechanics = new PRDC_JSLAB_LIB_MECHANICS(jsl);
  return { mechanics, context, plot_calls, title_calls };
}

tests.add('plotBeamDiagrams creates traces, layout and extremum summaries', async function(assert) {
  var harness = createMechanicsHarness();
  var data = [{
    x: [0, 1, 2],
    y: [0, 5, 2],
    title: 'Shear',
    xlabel: ['x', 'm'],
    ylabel: ['V', 'kN']
  }];

  var out = await harness.mechanics.plotBeamDiagrams(data, {
    n: 5,
    digits: 1
  });

  assert.equal(out.extrems.length, 1);
  assert.ok(out.extrems[0].includes('Shear'));
  assert.ok(out.extrems[0].includes('V_max = 5.0'));
  assert.equal(out.context, harness.context);

  assert.equal(harness.plot_calls.length, 1);
  assert.equal(harness.plot_calls[0].traces.length, 2);
  assert.equal(harness.plot_calls[0].layout.grid.rows, 1);
  assert.equal(harness.plot_calls[0].config.responsive, true);
  assert.equal(harness.title_calls[0], 'LANG_532');
}, { tags: ['unit', 'mechanics'] });

tests.add('plotBeamDiagrams returns false when window initialization is interrupted', async function(assert) {
  var harness = createMechanicsHarness();
  harness.mechanics.jsl.inter.windows.openPlotlyjs = async function() {
    return false;
  };

  var out = await harness.mechanics.plotBeamDiagrams([]);
  assert.equal(out, false);
  assert.equal(harness.plot_calls.length, 0);
}, { tags: ['unit', 'mechanics'] });

exports.MODULE_TESTS = tests;
