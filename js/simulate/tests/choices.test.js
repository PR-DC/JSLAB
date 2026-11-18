/**
 * @file Scalar and array property-choice conversion tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { propertyChoices, propertyChoice, choiceModelicaValue, resolvedChoiceValue } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
const schemas = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('component-schema.json');
const labels = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('choice-labels.json');
const strings = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('lang.json');
var tests = new PRDC_JSLAB_TESTS();

tests.add('Property choices preserve Booleans, external enums, ordinals and quoted logic literals', function(assert) {
  var bool = { type: 'Boolean', dimensions: [] };
  assert.equal(propertyChoice(bool, false), 'false');
  assert.equal(resolvedChoiceValue(bool, 'false'), 'false');
  assert.equal(resolvedChoiceValue(bool, '{true, false}'), '{true, false}');
  var mode = { type: 'External.Mode', choices: ['Slow', 'Fast'], dimensions: [] };
  assert.equal(resolvedChoiceValue(mode, '"Fast"'), 'External.Mode.Fast');
  assert.equal(resolvedChoiceValue(mode, '1'), 'External.Mode.Slow');
  assert.equal(resolvedChoiceValue(mode, '{{"Fast"}, {"Slow"}}'), '{{External.Mode.Fast}, {External.Mode.Slow}}');
  assert.equal(propertyChoice(mode, 'External.Mode.Fast'), 'Fast');
  assert.deepEqual(propertyChoices(Object.assign({}, mode, { dimensions: [2] })), []);
  assert.throws(function() {
    resolvedChoiceValue(mode, '0');
  });
  assert.throws(function() {
    resolvedChoiceValue(mode, '3');
  });
  assert.throws(function() {
    choiceModelicaValue(mode, 'Invalid');
  });
  var logic = { type: 'Modelica.Electrical.Digital.Interfaces.Logic', choices: ["'U'", "'X'", "'0'", "'1'"] };
  assert.equal(resolvedChoiceValue(logic, '"0"'), "Modelica.Electrical.Digital.Interfaces.Logic.'0'");
  assert.equal(resolvedChoiceValue(logic, '3'), "Modelica.Electrical.Digital.Interfaces.Logic.'0'");
}, { tags: ['unit', 'simulate', 'choices'] });

tests.add('Every bundled enumeration literal has a localized label', function(assert) {
  var types = new Set();
  Object.values(schemas).forEach(function(schema) {
    schema.properties.forEach(function(property) {
      if(!property.choices) {
        return;
      }
      var type = property.type.replace(/^\./, '');
      if(type != 'Boolean') {
        types.add(type);
      }
      property.choices.forEach(function(choice) {
        var id = labels[type + '.' + choice];
        assert.ok(id, 'Missing choice label: ' + type + '.' + choice);
        ['en', 'rs', 'rsc'].forEach(function(language) {
          assert.ok(strings[id][language].trim());
        });
      });
    });
  });
  assert.equal(types.size, 25);
}, { tags: ['unit', 'simulate', 'choices', 'translations'] });

exports.MODULE_TESTS = tests;
