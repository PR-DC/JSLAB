/**
 * @file Simulate display-unit expression tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_LIB_ARRAY } = require('../../sandbox/array');
const { unitOptions, convertUnitExpression } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
var tests = new PRDC_JSLAB_TESTS();
var array = new PRDC_JSLAB_LIB_ARRAY({});

/**
 * Class for checking converted expressions in an isolated workspace context.
 */
class PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER {

  /**
   * Evaluates a converted expression using the workspace array API.
   * @param {string} expression Converted expression.
   * @returns {*} Evaluated value.
   */
  static evaluate(expression) {
    return vm.runInNewContext(expression, { scale: array.scale.bind(array), plus: array.plus.bind(array) });
  }
}

tests.add('Unit expressions preserve vectors, matrices and temperature offsets', function(assert) {
  var length = unitOptions('Modelica.SIunits.Position');
  var mm = length.find(function(unit) {
    return unit.symbol == 'mm';
  });
  var converted = convertUnitExpression('[[10, 20], [30, 40]]', mm, length[0], [2, 2]);
  assert.deepEqual(JSON.parse(JSON.stringify(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(converted))), [[.01, .02], [.03, .04]]);
  assert.equal(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(convertUnitExpression('50', mm, length[0])), .05);
  var temperature = unitOptions('Modelica.SIunits.Temperature');
  var celsius = temperature.find(function(unit) {
    return unit.symbol == 'degC';
  });
  var fahrenheit = temperature.find(function(unit) {
    return unit.symbol == 'degF';
  });
  assert.ok(Math.abs(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(convertUnitExpression('32', fahrenheit, temperature[0])) - 273.15) < 1e-10);
  assert.ok(Math.abs(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(convertUnitExpression('273.15', temperature[0], celsius))) < 1e-10);
  assert.deepEqual(JSON.parse(JSON.stringify(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(convertUnitExpression('[0, 100]', celsius, temperature[0], [2])))),
    [273.15, 373.15]);
  var difference = unitOptions('Modelica.SIunits.TemperatureDifference');
  assert.equal(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(convertUnitExpression('100', difference[1], difference[0])), 100);
  var volts = unitOptions('Modelica.Units.SI.Voltage');
  assert.equal(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(convertUnitExpression('2', volts.find(function(unit) {
    return unit.symbol == 'kV';
  }), volts[0])), 2000);
  assert.deepEqual(unitOptions('External.Voltage'), []);
  assert.deepEqual(unitOptions('Real'), []);
  assert.equal(convertUnitExpression('', mm, length[0]), '');
}, { tags: ['unit', 'simulate', 'units'] });

tests.add('Electrical unit menus distinguish active, reactive and apparent power', function(assert) {
  assert.equal(unitOptions('Modelica.SIunits.ActivePower')[0].symbol, 'W');
  assert.equal(unitOptions('Modelica.SIunits.ReactivePower')[0].symbol, 'var');
  assert.equal(unitOptions('Modelica.SIunits.ApparentPower')[0].symbol, 'VA');
}, { tags: ['unit', 'simulate', 'units'] });

exports.MODULE_TESTS = tests;

tests.add('Non-SI types retain their declared base units rather than being treated as SI values', function(assert) {
  var degrees = unitOptions('Modelica.SIunits.Conversions.NonSIunits.Angle_deg');
  assert.equal(degrees[0].symbol, 'deg');
  assert.ok(Math.abs(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(convertUnitExpression('1', degrees.find(function(unit) {
    return unit.symbol == 'rad';
  }), degrees[0])) - 180 / Math.PI) < 1e-10);
  var celsius = unitOptions('Modelica.SIunits.Temp_C');
  assert.equal(celsius[0].symbol, 'degC');
  assert.ok(Math.abs(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(convertUnitExpression('273.15', celsius.find(function(unit) {
    return unit.symbol == 'K';
  }), celsius[0]))) < 1e-10);
  var fahrenheit = unitOptions('Modelica.Units.NonSI.Temperature_degF');
  assert.equal(fahrenheit[0].symbol, 'degF');
  assert.ok(Math.abs(PRDC_JSLAB_SIMULATE_UNIT_TEST_HELPER.evaluate(convertUnitExpression('0', fahrenheit.find(function(unit) {
    return unit.symbol == 'degC';
  }), fahrenheit[0])) - 32) < 1e-10);
  assert.equal(unitOptions('External.Angle_deg').length, 0);
  assert.equal(unitOptions('.Modelica.SIunits.Length')[0].symbol, 'm');
}, { tags: ['unit', 'simulate', 'units'] });
