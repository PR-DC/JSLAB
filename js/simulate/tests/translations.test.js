/**
 * @file Pinned standard-library translation coverage tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const catalog = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('library-catalog.json');
const descriptions = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('description-labels.json');
const labels = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('class-labels.json');
const strings = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().readMetadata('lang.json');
var tests = new PRDC_JSLAB_TESTS();

tests.add('Simulate window labels belong to the library and preserve its class identifiers', function(assert) {
  var application_strings = require('../../../config/lang.json');
  var window_strings = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLanguageStrings();
  assert.ok(Object.keys(window_strings).length >= 65);
  Object.entries(window_strings).forEach(function([id, entry]) {
    assert.ok(id.startsWith('omjsl-'));
    assert.equal(application_strings[id], undefined, 'Library label remains in application catalog: ' + id);
    ['en', 'rs', 'rsc'].forEach(function(lang) {
      assert.equal(entry[lang], strings[id][lang]);
      assert.ok(entry[lang].trim());
    });
  });
  assert.equal(window_strings["omjsl-8480"].en, 'Fields');
  assert.equal(strings["omjsl-80"].en, 'Gain');
  assert.equal(application_strings[672].en, 'Simulate');
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('Every concrete signal block and example has localized names and source-matched descriptions', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Blocks.') && !item.partial && ['block', 'model'].includes(item.restriction);
  });
  assert.ok(classes.length > 200);
  classes.forEach(function(item) {
    var short_name = item.type.split('.').pop();
    var name_id = labels[item.type] || labels[short_name] || labels[short_name.replace(/\d+$/, '')];
    var description_id = descriptions[item.type];
    assert.ok(name_id, 'Missing block label: ' + item.type);
    assert.ok(description_id, 'Missing block description: ' + item.type);
    assert.equal(strings[description_id].en, item.description, 'Stale source description: ' + item.type);
    [name_id, description_id].forEach(function(id) {
      ['en', 'rs', 'rsc'].forEach(function(lang) {
        assert.ok(typeof strings[id][lang] == 'string' && strings[id][lang].trim().length > 0,
          'Missing ' + lang + ': ' + item.type);
      });
    });
  });
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('Every concrete multibody component outside examples has class-specific localized text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Mechanics.MultiBody.') && !item.type.includes('.Examples.') &&
      !item.partial && ['block', 'model'].includes(item.restriction);
  });
  assert.ok(classes.length > 100);
  classes.forEach(function(item) {
    assert.ok(labels[item.type], 'Missing class-specific name: ' + item.type);
    var id = descriptions[item.type];
    assert.ok(id, 'Missing multibody description: ' + item.type);
    assert.equal(strings[id].en, item.description, 'Stale description: ' + item.type);
    ['rs', 'rsc'].forEach(function(lang) {
      assert.ok(strings[id][lang].trim(), 'Missing ' + lang + ': ' + item.type);
      assert.ok(strings[labels[item.type]][lang].trim());
    });
  });
  assert.ok(strings[descriptions['Modelica.Mechanics.MultiBody.Parts.BevelGear1D']].rsc
    .includes('world.driveTrainMechanics3D=true'));
  assert.ok(strings[descriptions['Modelica.Mechanics.MultiBody.Sensors.Power']].rsc.includes('frame_a'));
}, { tags: ['unit', 'simulate', 'translations'] });

exports.MODULE_TESTS = tests;

tests.add('All SPICE classes and numerical utility examples have localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return ['Modelica.Electrical.Spice3.', 'Modelica.Math.', 'Modelica.Utilities.'].some(function(prefix) {
      return item.type.startsWith(prefix);
    }) && !item.partial && ['model', 'block'].includes(item.restriction);
  });
  assert.equal(classes.length, 71);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing SPICE or utility name: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[name][lang].trim()); });
    if(!item.description) {
      assert.equal(description, null, 'Missing empty-description marker: ' + item.type);
      return;
    }
    assert.ok(description, 'Missing SPICE or utility description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale SPICE or utility description: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[description][lang].trim()); });
  });
  assert.ok(strings[descriptions['Modelica.Electrical.Spice3.Examples.Spice3BenchmarkFourBitBinaryAdder.FOURBIT']].rsc
    .includes('FOURBIT'));
  assert.ok(strings[descriptions['Modelica.Utilities.Examples.WriteRealMatrixToFile']].rsc.includes('Streams.writeRealMatrix'));
  assert.ok(strings[labels['Modelica.Electrical.Spice3.Semiconductors.Q_NPNBJT']].rsc.startsWith('NPN'));
  assert.ok(strings[labels['Modelica.Electrical.Spice3.Semiconductors.Q_PNPBJT']].rsc.startsWith('PNP'));
  assert.notEqual(strings[labels['Modelica.Electrical.Spice3.Additionals.E_VCV_POLY']].rs,
    strings[labels['Modelica.Electrical.Spice3.Additionals.G_VCC_POLY']].rs);
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All quasi-stationary electrical classes have localized names and descriptions', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Electrical.QuasiStationary.') && !item.partial && ['model', 'block'].includes(item.restriction);
  });
  assert.equal(classes.length, 137);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing quasi-stationary name: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[name][lang].trim()); });
    if(!item.description) {
      assert.equal(description, null, 'Missing empty-description marker: ' + item.type);
      return;
    }
    assert.ok(description, 'Missing quasi-stationary description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale quasi-stationary description: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[description][lang].trim()); });
  });
  assert.ok(strings[descriptions['Modelica.Electrical.QuasiStationary.MultiPhase.Blocks.SingleToMultiPhase']].rsc
    .includes('symmetricOrientation'));
  assert.ok(strings[descriptions['Modelica.Electrical.QuasiStationary.MultiPhase.Blocks.ToSpacePhasor']].rsc.includes('m-фазних'));
  assert.notEqual(strings[labels['Modelica.Electrical.QuasiStationary.SinglePhase.Basic.Admittance']].rs,
    strings[labels['Modelica.Electrical.QuasiStationary.SinglePhase.Basic.Impedance']].rs);
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All electrical machines, transformer connections, thermal models and examples have localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Electrical.Machines.') && !item.partial && ['model', 'block'].includes(item.restriction);
  });
  assert.equal(classes.length, 148);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing electrical-machine name: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[name][lang].trim()); });
    if(!item.description) {
      assert.equal(description, null, 'Missing empty-description marker: ' + item.type);
      return;
    }
    assert.ok(description, 'Missing electrical-machine description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale electrical-machine description: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[description][lang].trim()); });
    if(item.type.includes('.BasicMachines.Transformers.')) {
      var connection = item.description.replace('Transformer ', '');
      ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[description][lang].includes(connection)); });
    }
  });
  assert.ok(strings[descriptions['Modelica.Electrical.Machines.Examples.ControlledDCDrives.Utilities.LimitedPI']].rsc.includes('PI'));
  assert.notEqual(strings[labels['Modelica.Electrical.Machines.BasicMachines.DCMachines.DC_SeriesExcited']].rs,
    strings[labels['Modelica.Electrical.Machines.BasicMachines.QuasiStationaryDCMachines.DC_SeriesExcited']].rs);
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All quasi-static magnetic classes have localized names and source-matched descriptions', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Magnetic.QuasiStatic.') && !item.partial &&
      ['model', 'block'].includes(item.restriction);
  });
  assert.equal(classes.length, 92);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing quasi-static name: ' + item.type);
    assert.ok(description, 'Missing quasi-static description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale quasi-static description: ' + item.type);
    PRDC_JSLAB_TESTS.assertTranslations(assert, strings, [name, description]);
  });
  assert.ok(strings[descriptions['Modelica.Magnetic.QuasiStatic.FundamentalWave.Components.QuasiStaticAnalogElectroMagneticConverter']].rs
    .includes('zanemarenim indukovanim naponom'));
  assert.ok(strings[descriptions['Modelica.Magnetic.QuasiStatic.FluxTubes.Sensors.ReferenceSensor']].rsc.includes('gamma'));
  assert.equal(descriptions['Modelica.Magnetic.QuasiStatic.FluxTubes.Basic.ConstantPermeance'],
    descriptions['Modelica.Magnetic.FluxTubes.Basic.ConstantPermeance']);
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All fundamental-wave machines, converters and examples have localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Magnetic.FundamentalWave.') && !item.partial &&
      ['model', 'block'].includes(item.restriction);
  });
  assert.equal(classes.length, 58);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing fundamental-wave name: ' + item.type);
    assert.ok(description, 'Missing fundamental-wave description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale fundamental-wave description: ' + item.type);
    PRDC_JSLAB_TESTS.assertTranslations(assert, strings, [name, description]);
  });
  assert.ok(strings[descriptions['Modelica.Magnetic.FundamentalWave.BasicMachines.Components.SaliencyCageWinding']].rsc
    .includes('d и q'));
  assert.notEqual(strings[labels['Modelica.Magnetic.FundamentalWave.BasicMachines.AsynchronousInductionMachines.AIM_SlipRing']].rs,
    strings[labels['Modelica.Magnetic.FundamentalWave.BasicMachines.AsynchronousInductionMachines.AIM_SquirrelCage']].rs);
  assert.ok(strings[labels['Modelica.Magnetic.FundamentalWave.BasicMachines.Components.SaliencyCageWinding_obsolete']].rs
    .startsWith('Zastareli'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('Every concrete magnetic flux-tube class has localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Magnetic.FluxTubes.') && !item.partial && ['model', 'block'].includes(item.restriction);
  });
  assert.equal(classes.length, 59);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing flux-tube name: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[name][lang].trim()); });
    if(!item.description) {
      assert.equal(description, null, 'Missing empty-description marker: ' + item.type);
      return;
    }
    assert.ok(description, 'Missing flux-tube description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale flux-tube description: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[description][lang].trim()); });
  });
  assert.ok(strings[descriptions['Modelica.Magnetic.FluxTubes.Examples.MovingCoilActuator.ArmatureStroke']].rsc.includes('t=0'));
  assert.ok(strings[descriptions['Modelica.Magnetic.FluxTubes.Shapes.HysteresisAndMagnets.GenericHystTellinenHard']].rsc.includes('tanh()'));
  assert.notEqual(strings[labels['Modelica.Magnetic.FluxTubes.Basic.ConstantPermeance']].rs,
    strings[labels['Modelica.Magnetic.FluxTubes.Basic.ConstantReluctance']].rs);
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('Every concrete medium-property class and example has localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Media.') && !item.partial && ['model', 'block'].includes(item.restriction);
  });
  assert.equal(classes.length, 63);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing medium name: ' + item.type);
    assert.ok(description, 'Missing medium description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale medium description: ' + item.type);
    PRDC_JSLAB_TESTS.assertTranslations(assert, strings, [name, description]);
  });
  assert.ok(strings[descriptions['Modelica.Media.Examples.ReferenceAir.Inverse_sh_T']].rsc.includes('h_pT(p, T)'));
  assert.ok(strings[descriptions['Modelica.Media.Examples.ReferenceAir.Inverse_sh_TX']].rsc.includes('s_pTX(p, T, X)'));
  assert.ok(strings[descriptions['Modelica.Media.Examples.SolveOneNonlinearEquation.Inverse_sine']].rsc.includes('A*sin(w*x)'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All concrete fluid classes including examples have localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Fluid.') && !item.partial && ['model', 'block'].includes(item.restriction);
  });
  assert.ok(classes.length >= 107);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing fluid name: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[name][lang].trim()); });
    if(!item.description) {
      assert.equal(description, null, 'Missing explicit empty-description marker: ' + item.type);
      return;
    }
    assert.ok(description, 'Missing fluid description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale fluid source: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[description][lang].trim()); });
  });
  var orifice = strings[descriptions['Modelica.Fluid.Fittings.SimpleGenericOrifice']].rsc;
  assert.ok(orifice.includes('port_a') && orifice.includes('port_b'));
  assert.notEqual(strings[labels['Modelica.Fluid.Sensors.MassFlowRate']].rs,
    strings[labels['Modelica.Fluid.Sensors.VolumeFlowRate']].rs);
  assert.ok(strings[descriptions['Modelica.Fluid.Valves.ValveCompressible']].rs.includes('kritičnog'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('Every concrete power-converter class has localized text including examples and controls', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Electrical.PowerConverters.') && !item.partial &&
      ['model', 'block'].includes(item.restriction);
  });
  assert.ok(classes.length >= 70);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing converter name: ' + item.type);
    assert.ok(description, 'Missing converter description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale converter source: ' + item.type);
    PRDC_JSLAB_TESTS.assertTranslations(assert, strings, [name, description]);
  });
  assert.ok(strings[descriptions['Modelica.Electrical.PowerConverters.ACDC.DiodeCenterTapmPulse']].rsc.includes('и m'));
  assert.ok(strings[descriptions['Modelica.Electrical.PowerConverters.ACDC.DiodeCenterTap2mPulse']].rsc.includes('2*m'));
  assert.ok(strings[descriptions['Modelica.Electrical.PowerConverters.DCDC.HBridge']].rs.includes('četvorokvadrantni'));
  assert.ok(strings[descriptions['Modelica.Electrical.PowerConverters.DCAC.Control.SVPWM']].rsc.includes('векторска'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All concrete multiphase classes have localized names and source-matched descriptions', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Electrical.MultiPhase.') && !item.partial &&
      ['model', 'block'].includes(item.restriction);
  });
  assert.ok(classes.length >= 55);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing multiphase name: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[name][lang].trim()); });
    if(!item.description) {
      assert.equal(description, null, 'Empty source description must have an explicit empty marker: ' + item.type);
      return;
    }
    assert.ok(description, 'Missing multiphase description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale multiphase source: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[description][lang].trim()); });
  });
  assert.notEqual(strings[labels['Modelica.Electrical.MultiPhase.Basic.Star']].rs,
    strings[labels['Modelica.Electrical.MultiPhase.Basic.Delta']].rs);
  assert.ok(strings[descriptions['Modelica.Electrical.MultiPhase.Sensors.ReactivePowerSensor']].rs.includes('reaktivne'));
  assert.ok(strings[descriptions['Modelica.Electrical.MultiPhase.Sensors.PowerSensor']].rs.includes('trenutne'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All concrete digital classes have localized text including polarity and logic alphabets', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Electrical.Digital.') && !item.partial &&
      ['model', 'block'].includes(item.restriction);
  });
  assert.ok(classes.length >= 90);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing digital name: ' + item.type);
    assert.ok(description, 'Missing digital description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale digital source: ' + item.type);
    PRDC_JSLAB_TESTS.assertTranslations(assert, strings, [name, description]);
  });
  assert.ok(strings[descriptions['Modelica.Electrical.Digital.Registers.DFFREG']].rsc.includes('високом'));
  assert.ok(strings[descriptions['Modelica.Electrical.Digital.Registers.DFFREGL']].rsc.includes('ниском'));
  assert.ok(strings[descriptions['Modelica.Electrical.Digital.Converters.LogicToX01Z']].rsc.includes('X01Z'));
  assert.ok(strings[descriptions['Modelica.Electrical.Digital.Converters.LogicToXO1']].rsc.includes('LogicToX01'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All concrete analog electrical classes including examples have localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Electrical.Analog.') && !item.partial &&
      ['model', 'block'].includes(item.restriction);
  });
  assert.ok(classes.length > 150);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing analog class name: ' + item.type);
    assert.ok(description, 'Missing analog class description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale analog source text: ' + item.type);
    PRDC_JSLAB_TESTS.assertTranslations(assert, strings, [name, description]);
  });
  var transmission_line = strings[descriptions['Modelica.Electrical.Analog.Lines.TLine2']].rsc;
  ['Z0', 'F', 'NL'].forEach(function(symbol) { assert.ok(transmission_line.includes(symbol)); });
  assert.ok(strings[descriptions['Modelica.Electrical.Analog.Semiconductors.HeatingNMOS']].rsc.includes('MOS'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('Analog basic, ideal, source and sensor classes have complete localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return /^Modelica\.Electrical\.Analog\.(Basic|Ideal|Sources|Sensors)\./.test(item.type) &&
      !item.partial && ['model', 'block'].includes(item.restriction);
  });
  assert.ok(classes.length > 80);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing analog name: ' + item.type);
    assert.ok(description, 'Missing analog description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale analog source: ' + item.type);
    PRDC_JSLAB_TESTS.assertTranslations(assert, strings, [name, description]);
  });
  assert.notEqual(strings[labels['Modelica.Electrical.Analog.Sensors.PotentialSensor']].rs,
    strings[labels['Modelica.Electrical.Analog.Sensors.VoltageSensor']].rs);
  assert.ok(strings[descriptions['Modelica.Electrical.Analog.Basic.CCV']].rs.includes('naponski'));
  assert.ok(strings[descriptions['Modelica.Electrical.Analog.Basic.VCC']].rs.includes('strujni'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All complex-signal and state-graph classes have localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return /^Modelica\.(ComplexBlocks|StateGraph)\./.test(item.type) &&
      !item.partial && ['block', 'model'].includes(item.restriction);
  });
  assert.ok(classes.length > 60);
  classes.forEach(function(item) {
    var name = labels[item.type], description = descriptions[item.type];
    assert.ok(name, 'Missing complex/state name: ' + item.type);
    assert.ok(description, 'Missing complex/state description: ' + item.type);
    assert.equal(strings[description].en, item.description, 'Stale source text: ' + item.type);
    PRDC_JSLAB_TESTS.assertTranslations(assert, strings, [name, description]);
  });
  assert.notEqual(strings[descriptions['Modelica.ComplexBlocks.ComplexMath.Log']].rs,
    strings[descriptions['Modelica.Blocks.Math.Log']].rs);
  assert.ok(strings[descriptions['Modelica.StateGraph.Transition']].rsc.includes('condition'));
  assert.ok(strings[descriptions['Modelica.StateGraph.InitialStepWithSignal']].rsc.includes('active'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('Library translations resolve independently of application UI identifiers', function(assert) {
  var application_strings = require('../../../config/lang.json');
  var translatedLibraryText = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary().translatedLibraryText;
  Object.keys(strings).forEach(function(id) {
    ['en', 'rs', 'rsc'].forEach(function(language) {
      assert.equal(translatedLibraryText(id, language), strings[id][language]);
    });
    if(application_strings[id] && application_strings[id].en != strings[id].en) {
      assert.notEqual(translatedLibraryText(id, 'en'), application_strings[id].en);
    }
  });
  Object.values(labels).forEach(function(id) { assert.ok(strings[id], 'Missing library name translation: ' + id); });
  Object.values(descriptions).filter(function(id) { return id !== null; }).forEach(function(id) {
    assert.ok(strings[id], 'Missing library description translation: ' + id);
  });
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('Every concrete thermal class has localized names and source-matched descriptions', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Thermal.') && !item.partial && ['block', 'model'].includes(item.restriction);
  });
  assert.ok(classes.length > 70);
  classes.forEach(function(item) {
    assert.ok(labels[item.type], 'Missing thermal name: ' + item.type);
    var id = descriptions[item.type];
    assert.ok(id, 'Missing thermal description: ' + item.type);
    assert.equal(strings[id].en, item.description, 'Stale thermal source: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) {
      assert.ok(strings[id][lang].trim(), 'Missing thermal description: ' + lang + ', ' + item.type);
      assert.ok(strings[labels[item.type]][lang].trim());
    });
  });
  assert.ok(strings[descriptions['Modelica.Thermal.HeatTransfer.Components.Convection']].rsc.includes('Q_flow = Gc*dT'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('All concrete mechanical classes including nested examples have localized class text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return item.type.startsWith('Modelica.Mechanics.') && !item.partial && ['block', 'model'].includes(item.restriction);
  });
  assert.ok(classes.length > 300);
  classes.forEach(function(item) {
    var name_id = labels[item.type], description_id = descriptions[item.type];
    assert.ok(name_id, 'Missing mechanical class name: ' + item.type);
    if(!item.description) {
      assert.equal(description_id, null, 'Empty source must have an explicit empty-description marker.');
      ['en', 'rs', 'rsc'].forEach(function(lang) { assert.ok(strings[name_id][lang].trim()); });
      return;
    }
    assert.ok(description_id, 'Missing mechanical class description: ' + item.type);
    assert.equal(strings[description_id].en, item.description, 'Stale source text: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) {
      assert.ok(strings[name_id][lang].trim(), 'Missing name: ' + lang + ', ' + item.type);
      if(item.description) assert.ok(strings[description_id][lang].trim(), 'Missing description: ' + lang + ', ' + item.type);
      else assert.equal(strings[description_id][lang], '', 'Unexpected invented description: ' + item.type);
    });
  });
  assert.ok(strings[descriptions['Modelica.Mechanics.MultiBody.Examples.Loops.Fourbar_analytic']].rsc.includes('JointSSP'));
}, { tags: ['unit', 'simulate', 'translations'] });

tests.add('Every concrete rotational and translational component outside examples has localized text', function(assert) {
  var classes = Object.values(catalog.classes).filter(function(item) {
    return /^Modelica\.Mechanics\.(Rotational|Translational)\./.test(item.type) &&
      !item.type.includes('.Examples.') && !item.partial && ['block', 'model'].includes(item.restriction);
  });
  assert.ok(classes.length > 80);
  classes.forEach(function(item) {
    var name_id = labels[item.type];
    var description_id = descriptions[item.type];
    assert.ok(name_id, 'Missing mechanical name: ' + item.type);
    assert.ok(description_id, 'Missing mechanical description: ' + item.type);
    assert.equal(strings[description_id].en, item.description, 'Stale mechanical description: ' + item.type);
    ['en', 'rs', 'rsc'].forEach(function(lang) {
      assert.ok(strings[name_id][lang].trim(), 'Missing name ' + lang + ': ' + item.type);
      assert.ok(strings[description_id][lang].trim(), 'Missing description ' + lang + ': ' + item.type);
    });
  });
  var rotational = strings[descriptions['Modelica.Mechanics.Rotational.Sensors.PowerSensor']].rsc;
  var translational = strings[descriptions['Modelica.Mechanics.Translational.Sensors.PowerSensor']].rsc;
  assert.ok(rotational.includes('flange_a.tau*der(flange_a.phi)'));
  assert.ok(translational.includes('flange_a.f*der(flange_a.s)'));
  assert.notEqual(strings[labels['Modelica.Mechanics.Rotational.Sources.Position']].rs,
    strings[labels['Modelica.Mechanics.Translational.Sources.Position']].rs);
}, { tags: ['unit', 'simulate', 'translations'] });
