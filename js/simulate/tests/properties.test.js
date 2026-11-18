/**
 * @file Complete block-property metadata and translation contracts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const catalog = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('library-catalog.json');
const schemas = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('component-schema.json');
const graphics = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('library-graphics.json');
const labels = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('property-labels.json');
const strings = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('lang.json');
var tests = new PRDC_JSLAB_TESTS();

tests.add('Every concrete bundled class has offline property metadata including inherited fields', function(assert) {
  var types = Object.values(catalog.classes).filter(function(item) {
    return !item.partial && ['model', 'block'].includes(item.restriction);
  }).map(function(item) {
    return item.type;
  }).sort();
  assert.deepEqual(Object.keys(schemas).sort(), types);
  var resistor = schemas['Modelica.Electrical.Analog.Basic.Resistor'];
  assert.equal(resistor.properties.find(function(item) {
    return item.name == 'useHeatPort';
  }).default_value, 'false');
  assert.equal(new Set(resistor.properties.map(function(item) {
    return item.name;
  })).size, resistor.properties.length);
  assert.ok(graphics[resistor.type].ports.some(function(item) {
    return item.name == 'p';
  }));
  assert.ok(graphics[resistor.type].ports.some(function(item) {
    return item.name == 'n';
  }));
}, { tags: ['unit', 'simulate', 'properties'] });

tests.add('Property translations match source descriptions and preserve technical symbols', function(assert) {
  var descriptions = new Set(Object.values(Object.assign({}, schemas, require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('record-schema.json'))).filter(Boolean).flatMap(function(schema) {
    return schema.properties.map(function(property) {
      return property.description;
    });
  }));
  Object.entries(labels).forEach(function([source, id]) {
    var retired = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('metadata-version.json').retiredPropertyDescriptions || [];
    assert.ok(descriptions.has(source) || retired.includes(source), 'Untracked property description: ' + source);
    assert.equal(strings[id].en, source);
    ['en', 'rs', 'rsc'].forEach(function(language) {
      assert.ok(strings[id][language].trim());
    });
  });
  assert.ok(strings[labels['Number of phases']].rs.includes('faza'));
  assert.ok(strings[labels['Guess value of dp = port_a.p - port_b.p']].rsc.includes('dp = port_a.p - port_b.p'));
}, { tags: ['unit', 'simulate', 'properties', 'translations'] });

exports.MODULE_TESTS = tests;

tests.add('Every record field referenced by built-in blocks has source-matched translated help', function(assert) {
  var records = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('record-schema.json');
  var types = new Set(Object.values(schemas).flatMap(function(schema) {
    return schema.properties.map(property => property.type.replace(/^\./, ''));
  }));
  var count = 0;
  for(const type of types) {
    var record = records[type];
    if(!record) {
      continue;
    }
    count++;
    record.properties.forEach(function(property) {
      types.add(property.type.replace(/^\./, ''));
      if(!property.description) {
        return;
      }
      var id = labels[property.description];
      assert.ok(id, 'Missing record help: ' + type + '.' + property.name);
      assert.equal(strings[id].en, property.description);
      ['en', 'rs', 'rsc'].forEach(function(language) {
        assert.ok(strings[id][language].trim());
      });
    });
  }
  assert.equal(count, 75);
  assert.ok(strings[labels['dp = zeta1*(if zeta1_at_a then rho_a*v_a^2/2 else rho_b*v_b^2/2)']].rs.includes('zeta1_at_a ? rho_a*v_a**2/2'));
}, { tags: ['unit', 'simulate', 'properties', 'translations', 'records'] });

tests.add('Every bundled property description has source-matched English and both Serbian translations', function(assert) {
  var descriptions = new Set();
  Object.entries(schemas).forEach(function([type, schema]) {
    schema.properties.forEach(function(property) {
      if(!property.description) {
        return;
      }
      descriptions.add(property.description);
      var id = labels[property.description];
      assert.ok(id, 'Missing library property help: ' + type + '.' + property.name);
      assert.equal(strings[id].en, property.description);
      ['en', 'rs', 'rsc'].forEach(function(language) {
        assert.ok(typeof strings[id][language] == 'string' && strings[id][language].trim(),
          'Missing ' + language + ' property help: ' + type + '.' + property.name);
      });
    });
  });
  assert.equal(descriptions.size, 2646);
}, { tags: ['unit', 'simulate', 'properties', 'translations', 'coverage'] });

[
  ['Modelica.Thermal.', 71],
  ['Modelica.Electrical.Analog.', 155],
  ['Modelica.Electrical.Digital.', 90],
  ['Modelica.Electrical.', 719],
  ['Modelica.ComplexBlocks.', 38],
  ['Modelica.Math.', 4],
  ['Modelica.StateGraph.', 29],
  ['Modelica.Utilities.', 3]
].forEach(function([prefix, count]) {
  tests.add('Every property description in ' + prefix + ' is translated', function(assert) {
    var components = Object.entries(schemas).filter(function([type]) {
      return type.startsWith(prefix);
    });
    assert.equal(components.length, count);
    components.forEach(function([type, schema]) {
      schema.properties.forEach(function(property) {
        if(!property.description) {
          return;
        }
        var id = labels[property.description];
        assert.ok(id, 'Missing property help: ' + type + '.' + property.name);
        assert.equal(strings[id].en, property.description);
        ['en', 'rs', 'rsc'].forEach(function(language) {
          assert.ok(strings[id][language].trim());
        });
      });
    });
  }, { tags: ['unit', 'simulate', 'properties', 'translations'] });
});

tests.add('Thermal, electrical and digital help preserves formulas and logic states', function(assert) {
  assert.ok(strings[labels['Time derivative of temperature (= der(T))']].rsc.includes('der(T)'));
  assert.ok(strings[labels['Temperature coefficient of conductance (G_actual = G_ref/(1 + alpha*(T_heatPort - T_ref))']].rsc.includes('G_actual = G_ref/(1 + alpha*(T_heatPort - T_ref))'));
  assert.ok(strings[labels['value for digital Z (High Impedance)']].rsc.includes('Z'));
  assert.ok(strings[labels['value for digital Z (High Impedance)']].rsc.includes('импеданса'));
  assert.ok(strings[labels['if x < EMin, the exp(x) function is linearized']].rsc.includes('x < EMin'));
  assert.ok(strings[labels['Boolean start value of variable thyristor_p[:].off']].rsc.includes('thyristor_p[:].off'));
  assert.ok(strings[labels['Reference conductances at T_ref']].rsc.includes('T_ref'));
  assert.ok(strings[labels['Type of transistor (NPN=1, PNP=-1)']].rsc.includes('NPN=1'));
}, { tags: ['unit', 'simulate', 'properties', 'translations'] });

tests.add('Every rotational and translational property description is translated including examples and friction modes', function(assert) {
  var components = Object.entries(schemas).filter(function([type]) {
    return type.startsWith('Modelica.Mechanics.Rotational.') || type.startsWith('Modelica.Mechanics.Translational.');
  });
  assert.equal(components.length, 128);
  components.forEach(function([type, schema]) {
    schema.properties.forEach(function(property) {
      if(!property.description) {
        return;
      }
      var id = labels[property.description];
      assert.ok(id, 'Missing mechanical property help: ' + type + '.' + property.name);
      assert.equal(strings[id].en, property.description);
      ['en', 'rs', 'rsc'].forEach(function(language) {
        assert.ok(strings[id][language].trim());
      });
    });
  });
  var friction = strings[labels['true, if w_rel=0 and start of forward sliding or w_rel > w_small']];
  assert.ok(friction.rsc.includes('w_rel=0'));
  assert.ok(friction.rsc.includes('w_rel > w_small'));
  assert.ok(friction.rsc.includes('клизање'));
  assert.ok(strings[labels['Transmission ratio (flange_a.phi/flange_b.s)']].rsc.includes('flange_a.phi/flange_b.s'));
}, { tags: ['unit', 'simulate', 'properties', 'translations'] });

tests.add('Every multibody property description is translated including sensors, assemblies and visual geometry', function(assert) {
  var components = Object.entries(schemas).filter(function([type]) {
    return type.startsWith('Modelica.Mechanics.MultiBody.');
  });
  assert.equal(components.length, 174);
  components.forEach(function([type, schema]) {
    schema.properties.forEach(function(property) {
      if(!property.description) {
        return;
      }
      var id = labels[property.description];
      assert.ok(id, 'Missing multibody property help: ' + type + '.' + property.name);
      assert.equal(strings[id].en, property.description);
      ['en', 'rs', 'rsc'].forEach(function(language) {
        assert.ok(strings[id][language].trim());
      });
    });
  });
  var selection = strings[labels['Select angles[1] such that abs(angles[1] - guessAngle1) is a minimum']];
  assert.ok(selection.rsc.includes('abs(angles[1] - guessAngle1)'));
  var points = strings[labels['List of start and end points of cylinders resolved in an x-y frame defined by n_x, n_y, e.g., {[0,0;1,1], [0,1;1,0], [2,0; 3,1]}']];
  assert.ok(points.rs.includes('[[[0,0],[1,1]], [[0,1],[1,0]], [[2,0],[3,1]]]'));
  assert.ok(points.rsc.includes('n_x'));
}, { tags: ['unit', 'simulate', 'properties', 'translations'] });

tests.add('Every signal-block property description is translated including inherited fields and examples', function(assert) {
  var blocks = Object.entries(schemas).filter(function([type]) {
    return type.startsWith('Modelica.Blocks.');
  });
  assert.equal(blocks.length, 249);
  blocks.forEach(function([type, schema]) {
    schema.properties.forEach(function(property) {
      if(!property.description) {
        return;
      }
      var id = labels[property.description];
      assert.ok(id, 'Missing signal-block help: ' + type + '.' + property.name);
      assert.equal(strings[id].en, property.description);
      ['en', 'rs', 'rsc'].forEach(function(language) {
        assert.ok(strings[id][language].trim());
      });
    });
  });
  assert.ok(strings[labels['false, if limits are ignored during initialization (i.e., der(y)=k*u)']].rsc.includes('der(y)=k*u'));
  assert.ok(strings[labels['Numerator coefficients of transfer function (e.g., 2*s+3 is specified as {2,3})']].rs.includes('[2, 3]'));
  assert.ok(strings[labels['y = y_off if enableNoise=false (or time<startTime, see below)']].rsc.includes('enableNoise=false'));
  assert.ok(strings[labels['true, if amplitude at f_cut is 3 dB, otherwise unmodified filter']].rsc.includes('3 dB'));
}, { tags: ['unit', 'simulate', 'properties', 'translations'] });

tests.add('Every standard SI quantity used by block properties has a localized type label', function(assert) {
  var names = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('class-labels.json');
  var types = new Set(Object.values(schemas).flatMap(function(schema) {
    return schema.properties.map(function(property) {
      return property.type;
    });
  }).filter(function(type) {
    return type.startsWith('Modelica.SIunits.');
  }));
  assert.equal(types.size, 90);
  types.forEach(function(type) {
    assert.ok(names[type], 'Missing physical quantity label: ' + type);
    ['en', 'rs', 'rsc'].forEach(function(language) {
      assert.ok(strings[names[type]][language].trim());
    });
  });
  assert.notEqual(strings[names['Modelica.SIunits.MassFlowRate']].rs,
    strings[names['Modelica.SIunits.VolumeFlowRate']].rs);
  assert.notEqual(strings[names['Modelica.SIunits.ThermalConductance']].rs,
    strings[names['Modelica.SIunits.ThermalConductivity']].rs);
}, { tags: ['unit', 'simulate', 'properties', 'translations'] });

tests.add('Every property description of the shipped 6-DOF block types is translated', function(assert) {
  var types = [
    'Modelica.Blocks.Sources.TimeTable', 'Modelica.Mechanics.Rotational.Sources.Position',
    'Modelica.Mechanics.MultiBody.World', 'Modelica.Mechanics.MultiBody.Parts.Fixed',
    'Modelica.Mechanics.MultiBody.Parts.Body', 'Modelica.Mechanics.MultiBody.Parts.BodyShape',
    'Modelica.Mechanics.MultiBody.Parts.FixedTranslation', 'Modelica.Mechanics.MultiBody.Joints.Revolute',
    'Modelica.Mechanics.MultiBody.Joints.Spherical', 'Modelica.Mechanics.MultiBody.Joints.Assemblies.JointSSR'
  ];
  var type_labels = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('class-labels.json');
  types.forEach(function(type) {
    schemas[type].properties.forEach(function(property) {
      if(!['Real', 'Integer', 'Boolean', 'String'].includes(property.type)) {
        assert.ok(type_labels[property.type], 'Missing 6-DOF property type: ' + property.type);
      }
      if(!property.description) {
        return;
      }
      var id = labels[property.description];
      assert.ok(id, 'Missing property description: ' + type + '.' + property.name);
      assert.equal(strings[id].en, property.description);
      ['en', 'rs', 'rsc'].forEach(function(language) {
        assert.ok(strings[id][language].trim());
      });
    });
  });
  assert.ok(strings[labels['Relative angle offset (angle = phi_offset + phi)']].rsc.includes('angle = phi_offset + phi'));
  assert.ok(strings[labels['Direction of gravity resolved in world frame (gravity = g*n/length(n))']].rsc
    .includes('gravity = g*n/length(n)'));
  assert.ok(strings[labels['Initial values of angular acceleration z_rel_a = der(w_rel_a)']].rsc
    .includes('z_rel_a = der(w_rel_a)'));
}, { tags: ['unit', 'simulate', 'properties', 'translations'] });
