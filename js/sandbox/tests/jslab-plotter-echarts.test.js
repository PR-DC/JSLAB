/**
 * @file JSLAB echarts plotter tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_PLOTTER } = require('../jslab-plotter-echarts');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('constructor sets echarts as selected library', function(assert) {
  var plotter = new PRDC_JSLAB_PLOTTER();
  assert.equal(plotter.library, 'echarts');
}, { tags: ['unit', 'plotter'] });

exports.MODULE_TESTS = tests;

