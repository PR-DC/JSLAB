/**
 * @file Compatible display units for Simulate property expressions
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for converting declared compiler property units.
 */
class PRDC_OMJSL_UNITS {

  /**
   * Express compatible display units relative to the actual declared unit.
   * @param {*} group Group.
   * @param {*} base Base.
   */
  static relativeUnits(group, base) {
    return [base].concat(group[1].filter(function(item) {
      return item !== base;
    })).map(function(item) {
      return {
        symbol: item[0],
        factor: item[1] / base[1],
        offset: ((item[2] || 0) - (base[2] || 0)) / base[1]
      };
    });
  }

  /**
   * Use declared unit attributes for plain numeric fields and known SI type definitions.
   * @param {*} type Declared compiler type.
   * @param {*} definition Definition.
   */
  static unitOptions(type, definition = {}) {
    if(definition.unit) {
      var symbol = String(definition.unit);
      var quantity = definition.relative_quantity && ['K', 'degC', 'degF', 'degRk'].includes(symbol) ? 'TemperatureDifference' : String(definition.quantity || '');
      var declared_group = quantity && groups.find(function(item) {
        return item[0].split(' ').includes(quantity);
      });
      if(!declared_group) {
        declared_group = groups.find(function(item) {
          return item[1].some(unit => unit[0] == symbol);
        });
      }
      var declared_base = declared_group && declared_group[1].find(unit => unit[0] == symbol);
      return declared_base ? PRDC_OMJSL_UNITS.relativeUnits(declared_group, declared_base) : [{
        symbol: symbol,
        factor: 1,
        offset: 0
      }];
    }
    type = String(type || '').replace(/^\.Modelica\./, 'Modelica.');
    var non_si = /^Modelica\.(?:SIunits\.Conversions\.NonSIunits|Units\.NonSI)\.([A-Za-z_]\w*)$/.exec(type);
    var aliases = {
      Angle_deg: ['Angle', 'deg'],
      AngularVelocity_rpm: ['AngularVelocity', 'rpm'],
      Temperature_degC: ['Temperature', 'degC'],
      Temperature_degF: ['Temperature', 'degF'],
      Temperature_degRk: ['Temperature', 'degRk'],
      Temp_C: ['Temperature', 'degC']
    };
    var match = /^Modelica\.(?:SIunits|Units\.SI)\.([A-Za-z_]\w*)$/.exec(type);
    var alias = aliases[non_si ? non_si[1] : match && match[1]];
    if(non_si && !alias) {
      return [];
    }
    if(alias) {
      match = ['', alias[0]];
    }
    if(!match) {
      return [];
    }
    var group = groups.find(function(item) {
      return item[0].split(' ').includes(match[1]);
    });
    if(!group) {
      return [];
    }
    var base = alias ? group[1].find(function(item) {
      return item[0] == alias[1];
    }) : group[1][0];
    return PRDC_OMJSL_UNITS.relativeUnits(group, base);
  }

  /**
   * Convert a scalar or array expression between compatible display units.
   * @param {*} expression Expression.
   * @param {*} from From.
   * @param {*} to To.
   * @param {*} dimensions Dimensions.
   */
  static convertUnitExpression(expression, from, to, dimensions = []) {
    expression = String(expression || '').trim();
    if(!expression) {
      return '';
    }
    var factor = from.factor / to.factor;
    var offset = ((from.offset || 0) - (to.offset || 0)) / to.factor;
    if(!dimensions.length && (factor != 1 || offset) && /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(expression)) {
      var converted = Number(expression) * factor + offset;
      if(Number.isFinite(converted)) {
        return String(converted);
      }
    }
    if(factor != 1) {
      expression = dimensions.length ? 'scale((' + expression + '), ' + factor + ')' : '((' + expression + ') * ' + factor + ')';
    }
    if(offset) {
      expression = dimensions.length ? 'plus((' + expression + '), ' + offset + ')' : '((' + expression + ') + ' + offset + ')';
    }
    return expression;
  }

}
// Each value converts a display unit to the declared SI unit: value * factor + offset.
const groups = [
  [
    'Length Position Distance Diameter Radius PathLength Breadth Height Thickness Wavelength',
    [['m', 1], ['mm', .001], ['cm', .01], ['km', 1000], ['in', .0254]]
  ],
  ['Mass', [['kg', 1], ['g', .001], ['mg', .000001], ['t', 1000]]],
  ['Time Duration Period', [['s', 1], ['ms', .001], ['min', 60], ['h', 3600]]],
  ['Angle', [['rad', 1], ['deg', Math.PI / 180]]],
  [
    'AngularVelocity AngularFrequency',
    [['rad/s', 1], ['rpm', Math.PI / 30], ['deg/s', Math.PI / 180]]
  ],
  ['AngularAcceleration', [['rad/s2', 1], ['deg/s2', Math.PI / 180]]],
  ['Velocity', [['m/s', 1], ['mm/s', .001], ['km/h', 1 / 3.6]]],
  ['Acceleration', [['m/s2', 1], ['mm/s2', .001]]],
  ['Area CrossSection', [['m2', 1], ['cm2', .0001], ['mm2', .000001]]],
  ['Volume', [['m3', 1], ['L', .001], ['mL', .000001]]],
  ['Frequency', [['Hz', 1], ['kHz', 1000], ['MHz', 1000000]]],
  ['Force Weight', [['N', 1], ['kN', 1000], ['mN', .001]]],
  ['Torque MomentOfForce', [['N.m', 1], ['N.mm', .001], ['kN.m', 1000]]],
  ['MomentOfInertia Inertia', [['kg.m2', 1], ['kg.mm2', .000001]]],
  [
    'Pressure AbsolutePressure PressureDifference BulkModulus Stress NormalStress ShearStress',
    [['Pa', 1], ['kPa', 1000], ['MPa', 1000000], ['bar', 100000]]
  ],
  [
    'Temperature ThermodynamicTemperature Temp_K',
    [['K', 1], ['degC', 1, 273.15], ['degF', 5 / 9, 273.15 - 32 * 5 / 9], ['degRk', 5 / 9]]
  ],
  ['TemperatureDifference', [['K', 1], ['degC', 1], ['degF', 5 / 9], ['degRk', 5 / 9]]],
  ['Voltage ElectricPotential ElectromotiveForce', [['V', 1], ['mV', .001], ['kV', 1000]]],
  ['Current ElectricCurrent', [['A', 1], ['mA', .001], ['uA', .000001], ['kA', 1000]]],
  ['Resistance', [['Ohm', 1], ['mOhm', .001], ['kOhm', 1000], ['MOhm', 1000000]]],
  ['Conductance', [['S', 1], ['mS', .001], ['uS', .000001]]],
  ['Capacitance', [['F', 1], ['mF', .001], ['uF', .000001], ['nF', 1e-9], ['pF', 1e-12]]],
  ['Inductance', [['H', 1], ['mH', .001], ['uH', .000001]]],
  ['Power ActivePower', [['W', 1], ['kW', 1000], ['MW', 1000000]]],
  ['ReactivePower', [['var', 1], ['kvar', 1000], ['Mvar', 1000000]]],
  ['ApparentPower', [['VA', 1], ['kVA', 1000], ['MVA', 1000000]]],
  [
    'Energy Work PotentialEnergy KineticEnergy',
    [['J', 1], ['kJ', 1000], ['Wh', 3600], ['kWh', 3600000]]
  ],
  ['Density', [['kg/m3', 1], ['g/cm3', 1000]]],
  ['MassFlowRate', [['kg/s', 1], ['g/s', .001], ['kg/h', 1 / 3600]]],
  ['VolumeFlowRate', [['m3/s', 1], ['L/s', .001], ['L/min', .001 / 60]]],
  ['SpecificEnthalpy SpecificEnergy', [['J/kg', 1], ['kJ/kg', 1000]]]
];
exports.unitOptions = PRDC_OMJSL_UNITS.unitOptions;
exports.convertUnitExpression = PRDC_OMJSL_UNITS.convertUnitExpression;
