/**
 * @file JSLAB color submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_COLOR } = require('../color');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createColorHarness() {
  var jsl = {
    inter: {
      isArray: Array.isArray,
      isObject: function(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      },
      isNumber: function(value) {
        return typeof value === 'number' && isFinite(value);
      },
      isNull: function(value) {
        return value === null;
      },
      format: {
        isUndefined: function(value) {
          return typeof value === 'undefined';
        }
      }
    }
  };

  var color = new PRDC_JSLAB_LIB_COLOR(jsl);
  return { color };
}

tests.add('color returns expected defaults for numeric and named inputs', function(assert) {
  var harness = createColorHarness();
  assert.equal(harness.color.color(0), '#0072BD');
  assert.equal(harness.color.color(7), '#0072BD');
  assert.equal(harness.color.color('r'), '#FF0000');
  assert.equal(harness.color.color('blue'), '#0000FF');
}, { tags: ['unit', 'color'] });

tests.add('color accepts RGB arrays through rgb2hex conversion', function(assert) {
  var harness = createColorHarness();
  assert.equal(harness.color.color([1, 0.5, 0]), '#FF8000');
}, { tags: ['unit', 'color'] });

tests.add('rgb2hex clamps values and supports 0..1 channel range', function(assert) {
  var harness = createColorHarness();
  assert.equal(harness.color.rgb2hex(0, 0.5, 1), '#0080FF');
  assert.equal(harness.color.rgb2hex([300, -10, 127]), '#FF007F');
}, { tags: ['unit', 'color'] });

tests.add('rgbToHsl and hslToRgb convert canonical red correctly', function(assert) {
  var harness = createColorHarness();
  var hsl = harness.color.rgbToHsl(255, 0, 0);
  var rgb = harness.color.hslToRgb(hsl[0], hsl[1], hsl[2]);

  assert.approx(hsl[0], 0, 1e-9);
  assert.approx(hsl[1], 100, 1e-9);
  assert.approx(hsl[2], 50, 1e-9);
  assert.deepEqual(rgb, [255, 0, 0]);
}, { tags: ['unit', 'color'] });

tests.add('colourGradientor returns end points for p=0 and p=1', function(assert) {
  var harness = createColorHarness();
  var from = [255, 0, 0];
  var to = [0, 0, 255];

  assert.deepEqual(harness.color.colourGradientor(0, from, to), to);
  assert.deepEqual(harness.color.colourGradientor(1, from, to), from);
}, { tags: ['unit', 'color'] });

tests.add('getColorG2R clamps and scales according to threshold k', function(assert) {
  var harness = createColorHarness();
  assert.equal(harness.color.getColorG2R(-2), 'hsl(0,100%,50%)');
  assert.equal(harness.color.getColorG2R(0.15, 0.3), 'hsl(60,100%,50%)');
  assert.equal(harness.color.getColorG2R(0.6, 0.3), 'hsl(120,100%,50%)');
}, { tags: ['unit', 'color'] });

exports.MODULE_TESTS = tests;
