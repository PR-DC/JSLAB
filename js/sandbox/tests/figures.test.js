/**
 * @file JSLAB figures submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_FIGURES } = require('../figures');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createFiguresHarness() {
  var file_reads = [];
  var jsl = {
    app_path: '/app',
    no_ans: false,
    ignore_output: false,
    inter: {
      env: {
        readFileSync: function(file_path) {
          file_reads.push(file_path);
          return Buffer.from('<html></html>');
        },
        error: function() {}
      }
    }
  };
  var figures = new PRDC_JSLAB_LIB_FIGURES(jsl);
  return { figures, jsl, file_reads };
}

tests.add('constructor loads figure templates and initializes default state', function(assert) {
  var harness = createFiguresHarness();
  assert.equal(harness.file_reads.length, 3);
  assert.ok(harness.file_reads[0].endsWith('/html/html_figure.html'));
  assert.ok(harness.file_reads[1].endsWith('/html/i_html_figure.html'));
  assert.ok(harness.file_reads[2].endsWith('/html/io_html_figure.html'));
  assert.equal(harness.figures.active_figure, -1);
  assert.deepEqual(harness.figures.open_figures, {});
}, { tags: ['unit', 'figures'] });

tests.add('figure getters and active/close bookkeeping operate on stored entries', function(assert) {
  var harness = createFiguresHarness();
  harness.figures.open_figures = {
    '1': { win: 'window-1', plot: { id: 'plot-1' } },
    '2': { win: 'window-2' }
  };

  harness.figures._setActiveFigure('1');
  assert.equal(harness.figures.active_figure, '1');
  assert.equal(harness.figures.getFigure('1').win, 'window-1');
  assert.equal(harness.figures.getFigureWindow('2'), 'window-2');
  assert.equal(harness.figures.getFigure('9'), false);
  assert.equal(harness.figures.getPlot('2'), false);
  assert.equal(harness.figures.getAxes('1').id, 'plot-1');
  assert.equal(harness.figures.gcf().win, 'window-1');
  assert.equal(harness.figures.gcp().id, 'plot-1');
  assert.equal(harness.figures.gca().id, 'plot-1');

  harness.figures._setActiveFigure('2');
  harness.figures._closedFigure('2');
  assert.equal(harness.figures.active_figure, '1');
  assert.equal(harness.figures.getFigure('2'), false);
}, { tags: ['unit', 'figures'] });

exports.MODULE_TESTS = tests;

