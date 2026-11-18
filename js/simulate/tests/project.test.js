/**
 * @file JSLAB Modelica backend tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
require('./compiler-fixture');
const { PRDC_JSLAB_SIMULATE_PROJECT } = require('../project');
const { PRDC_OMJSL_CLIENT } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
var tests = new PRDC_JSLAB_TESTS();

tests.add('Bundled class browsing and all standard block graphics do not start the compiler', async function(assert) {
  var client = new PRDC_OMJSL_CLIENT('unused');
  client._start = function() {
    throw new Error('Unexpected solver startup.');
  };
  var packages = await client.libraryClasses('Modelica');
  assert.ok(packages.some(function(item) {
    return item.type == 'Modelica.Blocks';
  }));
  var graphics = await client.componentGraphics('Modelica.Blocks.Math.Gain');
  assert.ok(graphics.icons.length);
  var bitmap = await client.componentGraphics('Modelica.Mechanics.Rotational.Examples.Utilities.SpringDamper');
  assert.ok(Object.keys(bitmap.assets).length > 0);
}, { tags: ['unit', 'simulate'] });

tests.add('Simulate projects preserve portable external libraries and reject unsafe file paths', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var library = { id: 'test_library', entry: 'package.mo', roots: ['External'], files: [
    { path: 'package.mo', data: Buffer.from('package External end External;').toString('base64') },
    { path: 'Resources/data.txt', data: Buffer.from('sample').toString('base64') }
  ] };
  var source = backend.serializeProject({ source: 'model Plant end Plant;', libraries: [library] });
  var restored = backend.parseProject(source);
  assert.equal(restored.success, true);
  assert.deepEqual(restored.libraries, [library]);
  library.files[1].path = '../escape.txt';
  assert.throws(function() {
    backend.serializeProject({ libraries: [library] });
  });
}, { tags: ['unit', 'simulate'] });

tests.add('Modelica parser extracts parameters, placements and connections', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = [
    'model Plant',
    '  parameter Real gain(min = 0) = 2 "Gain";',
    '  Modelica.Blocks.Sources.Constant source(k = gain) annotation(',
    '    Placement(transformation(origin = {-40, 10}, extent = {{-10, -10}, {10, 10}})));',
    '  Modelica.Blocks.Math.Gain gainBlock(k = gain) annotation(',
    '    Placement(transformation(origin = {20, 10}, extent = {{-10, -10}, {10, 10}})));',
    'equation',
    '  connect(source.y, gainBlock.u) annotation(',
    '    Line(points = {{-30, 10}, {10, 10}}));',
    'end Plant;'
  ].join('\n');
  var result = backend.parse(source);
  assert.equal(result.success, true);
  assert.equal(result.model.name, 'Plant');
  assert.equal(result.model.parameters[0].value, '2');
  assert.equal(result.model.parameters[0].declaration,
    '  parameter Real gain(min = 0) = 2 "Gain";');
  assert.equal(result.model.parameters[0].source_start, source.indexOf('  parameter'));
  assert.equal(result.model.components.filter(component => component.placement).length, 2);
  assert.deepEqual(result.model.connections[0].points, [[-30, 10], [10, 10]]);
  assert.equal(result.model.components.find(component => component.placement).placement.rotation, 0);
  assert.deepEqual(result.model.connections[0].color, [0, 0, 0]);
  var source_component = result.model.components.find(component => component.name == 'source');
  assert.equal(source_component.modifiers[0].name, 'k');
  assert.equal(source_component.modifiers[0].value, 'gain');
  assert.equal(source_component.modifiers[0].assignment, true);
  assert.equal(source_component.declaration.slice(source_component.modifiers[0].value_start,
    source_component.modifiers[0].value_end), 'gain');
}, { tags: ['unit', 'backend', 'modelica'] });

tests.add('Modelica parser preserves nested component modifiers for property editing', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = 'model Plant\n  Joint joint(phi(start = 0), n = {0, 1, 0});\nend Plant;';
  var result = backend.parse(source);
  assert.equal(result.success, true);
  var component = result.model.components[0];
  assert.equal(component.modifiers.length, 2);
  assert.equal(component.modifiers[0].name, 'phi');
  assert.equal(component.modifiers[0].value, '(start = 0)');
  assert.equal(component.modifiers[0].assignment, false);
  assert.equal(component.modifiers[1].name, 'n');
  assert.equal(component.modifiers[1].value, '{0, 1, 0}');
}, { tags: ['unit', 'backend', 'modelica'] });

tests.add('Array dimensions and indexed connector endpoints survive model import', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = 'model ArrayPlant\n parameter Real[2] data[3]=ones(3,2);\n Block a;\n Block b;\nequation\n connect(a.ports[1],b.ports[2]);\nend ArrayPlant;';
  var parsed = backend.parse(source);
  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.model.parameters[0].dimensions, ['3', '2']);
  assert.deepEqual(parsed.model.components[0].dimensions, ['3', '2']);
  assert.equal(parsed.model.connections[0].from, 'a.ports[1]');
  assert.equal(parsed.model.connections[0].to, 'b.ports[2]');
  assert.equal(backend.modelicaValueToJSLAB('"literal {x}; from_deg(30)"'), '"literal {x}; from_deg(30)"');
  var project = backend.serializeProject({ source: source, parameter_bindings: [
    ['label', '"literal from_deg(30); {x}"']
  ] });
  assert.equal(backend.parseProject(project).parameter_bindings[0][1], '"literal from_deg(30); {x}"');
}, { tags: ['unit', 'backend', 'modelica'] });

tests.add('Explicit workspace bindings survive project save even when a Modelica reference has the same name', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = 'model Bindings\n parameter Real sourceGain=2;\n parameter Real targetGain=sourceGain;\n Block item(k=sourceGain);\nend Bindings;';
  var project = backend.parseProject(backend.serializeProject({ source: source,
    parameter_bindings: [['targetGain', 'sourceGain']], component_bindings: [['item\u0000k', 'sourceGain']] }));
  assert.equal(project.success, true);
  assert.deepEqual(project.parameter_bindings, [['targetGain', 'sourceGain']]);
  assert.deepEqual(project.component_bindings, [['item\u0000k', 'sourceGain']]);
}, { tags: ['unit', 'backend', 'modelica'] });

tests.add('Modelica parser reports exact source offsets with CRLF newlines', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = [
    'model Plant',
    '  parameter Real mass(unit = "kg", min = 0) = 150;',
    '  Real value;',
    'end Plant;'
  ].join('\r\n');
  var result = backend.parse(source);
  assert.equal(result.success, true);
  var parameter = result.model.parameters[0];
  assert.equal(parameter.value, '150');
  assert.equal(parameter.source_start, source.indexOf('  parameter'));
  assert.equal(source.slice(parameter.source_start, parameter.source_end), parameter.declaration);
  assert.equal(source.slice(parameter.value_start, parameter.value_end), '150');
}, { tags: ['unit', 'backend', 'modelica', 'crlf'] });

tests.add('String defaults and descriptions remain distinct and retain their source ranges', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = 'model Strings\n parameter String label="value; {x}" "description\\\"";\nend Strings;';
  var parsed = backend.parse(source);
  assert.equal(parsed.success, true);
  var parameter = parsed.model.parameters[0];
  assert.equal(parameter.value, '"value; {x}"');
  assert.equal(parameter.description, 'description"');
  assert.equal(source.slice(parameter.value_start, parameter.value_end), parameter.value);
  assert.equal(source.slice(parameter.description_range.start, parameter.description_range.end), '"description\\\""');
}, { tags: ['unit', 'backend', 'modelica'] });

tests.add('Modelica imports preserve the complete source and translate editable values to JSLAB', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = [
    'model Imported',
    '  parameter Real gain = 2;',
    '  TestBlock item(k = {1, 2}, reference = gain, phi(start = from_deg(30)));',
    'end Imported;'
  ].join('\n');
  var imported = backend.importModelica(source);
  assert.equal(imported.success, true);
  assert.equal(imported.source, source);
  assert.deepEqual(imported.component_bindings, []);
  assert.deepEqual(imported.parameter_bindings, []);
  assert.equal(backend.modelicaValueToJSLAB('from_deg(30)'), '((30) * pi / 180)');
  var serialized = backend.serializeProject(imported);
  var project = backend.parseProject(serialized);
  assert.equal(project.success, true);
  assert.equal(project.source, source);
  assert.deepEqual(project.component_bindings, []);
  assert.deepEqual(project.parameter_bindings, []);
  var legacy = JSON.parse(serialized);
  legacy.component_bindings = [
    ['item\u0000phi.start', 'deg2rad(15)'], ['item\u0000reference', 'gain']
  ];
  var migrated = backend.parseProject(JSON.stringify(legacy)).component_bindings;
  assert.equal(migrated.length, 2);
  assert.equal(migrated[0][1],
    '((15) * pi / 180)');
  assert.equal(migrated[1][1], 'gain');
}, { tags: ['unit', 'backend', 'modelica', 'jslmo'] });

tests.add('Simulate projects preserve JSLAB visualization metadata', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var serialized = backend.serializeProject({
    source: 'model Plant\n  Real x;\nend Plant;',
    visualization: { platform: { color: [0, 128, 255], thickness: 0.04 } }
  });
  var project = backend.parseProject(serialized);
  assert.deepEqual(project.visualization,
    { platform: { color: [0, 128, 255], thickness: 0.04 } });
}, { tags: ['unit', 'backend', 'modelica', 'jslmo'] });

tests.add('Modelica parser reports syntax errors', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var parsed = backend.parse('model Broken');
  assert.equal(parsed.success, false);
}, { tags: ['unit', 'backend', 'modelica'] });

tests.add('Component settings normalize modifier prefixes and preserve combined initial values and bindings', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var result = backend.parse('model Plant\n Block b[size({1,2},1)](each phi(start=0,fixed=true)=2, final k=3);\nend Plant;');
  assert.equal(result.success, true);
  var component = result.model.components[0];
  assert.equal(component.modifiers[0].name, 'phi');
  assert.equal(component.modifiers[0].value, '2');
  assert.equal(component.modifiers[0].each, true);
  assert.equal(component.modifiers[1].name, 'k');
  assert.equal(component.modifiers[1].final, true);
  assert.equal(component.declaration.slice(component.modifier_start, component.modifier_end), 'each phi(start=0,fixed=true)=2, final k=3');
}, { tags: ['unit', 'backend', 'modelica'] });

tests.add('Embedded OpenModelica runtime contains only the pinned simulation files', function(assert) {
  var root = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getBundleRoot();
  var manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.name, 'OpenModelicaJSLAB');
  assert.equal(manifest.bridge_abi, 1);
  assert.equal(manifest.commit, 'dc37f33f4ba739b8e4f145dfcb9a4f40791e804d');
  assert.equal(manifest.files['omc/OpenModelicaCompiler_bg.wasm'],
    'a2912ee6949cf18dedd6321c05ef583f257e0caa6b4e60fffdeb435e2b335732');
  assert.equal(Object.keys(manifest.files).filter(function(name) {
    return ['omc/', 'animation/', 'licenses/', 'packages/', 'wasm-blobs/'].some(prefix => name.startsWith(prefix));
  }).length, 11);
  assert.ok(manifest.files['animation/scene-core.js']);
  assert.ok(manifest.files['animation/scene-core_bg.wasm']);
  assert.ok(manifest.files['licenses/OSMC-License.txt']);
  assert.ok(manifest.files['licenses/OSMC-Runtime-License.txt']);
  assert.equal(manifest.integration.version, 1);
  assert.ok(manifest.files['js/client.js']);
  assert.ok(manifest.files['js/worker.js']);
  assert.ok(manifest.files['config/lang.json']);
  assert.equal(Object.keys(manifest.files).some(function(filename) {
    return filename == 'packages/efd981a1176f124938d6d6759f7c09e0fbf55ddf.zip';
  }), true);
  for(const [filename, expected_hash] of Object.entries(manifest.files)) {
    var bytes = fs.readFileSync(path.join(root, filename));
    var actual_hash = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(actual_hash, expected_hash);
  }
  var files = [];
  var walk = function(folder) {
    fs.readdirSync(folder, { withFileTypes: true }).forEach(function(entry) {
      var entry_path = path.join(folder, entry.name);
      if(entry.isDirectory()) {
        walk(entry_path);
      } else {
        files.push(path.relative(root, entry_path).replace(/\\/g, '/'));
      }
    });
  };
  walk(root);
  assert.deepEqual(files.filter(function(filename) {
    return filename != 'manifest.json';
  }).sort(),
  Object.keys(manifest.files).sort());
  assert.equal(files.some(function(filename) {
    return /OMEdit|OMNotebook|OMPlot|OMShell|symbols|\.d\.ts$|fmu-(aot|loaders)/i.test(filename);
  }), false);
}, { tags: ['unit', 'backend', 'modelica', 'wasm'] });

tests.add('Common block property metadata stays lazy and does not start the solver', async function(assert) {
  var client = new PRDC_OMJSL_CLIENT(global.app_path);
  var schema = await client.componentSchema({ type: 'Modelica.Mechanics.MultiBody.Joints.Revolute' });
  assert.equal(client.worker, null);
  assert.equal(schema.properties.some(function(property) {
    return property.name == 'n';
  }), true);
  assert.equal(schema.properties.some(function(property) {
    return property.name == 'animation';
  }), true);
}, { tags: ['unit', 'backend', 'modelica', 'lazy'] });

tests.add('Hidden native visual components retain their settings and connections without a visible placement', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var parsed = backend.parse('model Plant\n' +
    ' Block shown annotation(Placement(transformation(origin={10,20},extent={{-5,-5},{5,5}})));\n' +
    ' Block hidden(k=3) annotation(Placement(visible=false,transformation(origin={0,0},extent={{-5,-5},{5,5}})));\n' +
    'equation connect(shown.port,hidden.port);\nend Plant;');
  assert.equal(parsed.success, true);
  assert.equal(parsed.model.components.find(item => item.name == 'shown').placement.visible, true);
  var hidden = parsed.model.components.find(item => item.name == 'hidden');
  assert.equal(hidden.placement.visible, false);
  assert.equal(hidden.modifiers.find(item => item.name == 'k').value, '3');
  assert.equal(parsed.model.connections.length, 1);
}, { tags: ['unit', 'simulate', 'annotations'] });

tests.add('Placement parsing uses annotation fields and preserves exact drag coordinates', function(assert) {
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = 'model ModelName\n Part a(origin={8,9}) annotation(Placement(transformation(extent={{-20,-5},{20,5}}), visible=false));\n Part b(origin={4,6});\nend ModelName;';
  var parsed = backend.parse(source);
  assert.equal(parsed.success, true);
  var a = parsed.model.components[0];
  assert.equal(a.placement.x, 0);
  assert.equal(a.placement.y, 0);
  assert.equal(a.placement.visible, false);
  assert.equal(parsed.model.components[1].placement, null);
  a.placement.x = 25;
  a.placement.y = -12;
  var { PRDC_JSLAB_SIMULATE_INTERACTION } = require('../interaction');
  var { PRDC_JSLAB_SIMULATE_PROPERTIES } = require('../properties');
  PRDC_JSLAB_SIMULATE_INTERACTION.prototype.updatePlacementSource.call({
    editor: { getValue: () => source, setValue: value => { source = value; } },
    applySourcePatches: PRDC_JSLAB_SIMULATE_PROPERTIES.prototype.applySourcePatches
  }, a);
  assert.ok(source.includes('a(origin={8,9})'));
  var updated = backend.parse(source);
  assert.equal(updated.success, true);
  assert.equal(updated.model.components[0].placement.x, 25);
  assert.equal(updated.model.components[0].placement.y, -12);
}, { tags: ['unit', 'simulate'] });

tests.add('Deleting shared declaration members preserves siblings and adjacent same-line connections', function(assert) {
  var { PRDC_JSLAB_SIMULATE_INTERACTION } = require('../interaction');
  var { PRDC_JSLAB_SIMULATE_PROPERTIES } = require('../properties');
  var { PRDC_JSLAB_SIMULATE_WIRES } = require('../wires');
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  for(const names of [['a'], ['b'], ['c'], ['a', 'c'], ['a', 'b'], ['b', 'c'], ['a', 'b', 'c']]) {
    var source = 'model ModelName\n Gain a[2](k=1), b, c; Gain keep;\nequation\n connect(a[1].y,b.u); connect(c.y,keep.u);\nend ModelName;';
    var parsed = backend.parse(source);
    assert.equal(parsed.success, true);
    var controller = { model: parsed.model, selected_components: new Set(names), busy: false,
      component_bindings: new Map(),
      editor: { getValue: () => source, setValue: value => { source = value; } },
      connectionSourceRange: () => ({ start: 3, end: 3 }),
      applySourcePatches: PRDC_JSLAB_SIMULATE_PROPERTIES.prototype.applySourcePatches };
    PRDC_JSLAB_SIMULATE_INTERACTION.prototype.deleteDiagramSelection.call(controller);
    var updated = backend.parse(source);
    assert.equal(updated.success, true, source);
    assert.deepEqual(updated.model.components.map(item => item.name),
      ['a', 'b', 'c', 'keep'].filter(name => !names.includes(name)));
    assert.equal(updated.model.connections.length, Number(!names.includes('a') && !names.includes('b')) + Number(!names.includes('c')));
  }
  var source = 'model ModelName Real a,b,c; equation connect(a,b); connect(b,c); end ModelName;';
  var parsed = backend.parse(source);
  PRDC_JSLAB_SIMULATE_WIRES.prototype.removeConnectionSource.call({
    editor: { getValue: () => source, setValue: value => { source = value; } },
    connectionSourceRange: () => ({ start: 0, end: 0 }), connectionKey: () => 'a:b',
    applySourcePatches: PRDC_JSLAB_SIMULATE_PROPERTIES.prototype.applySourcePatches
  }, parsed.model.connections[0]);
  assert.equal(backend.parse(source).model.connections.length, 1);
  assert.ok(source.includes('connect(b,c);'));
}, { tags: ['unit', 'simulate'] });

tests.add('Property insertion targets the selected shared declaration member', function(assert) {
  var { componentModifierPatches } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
  var { PRDC_JSLAB_SIMULATE_PROPERTIES } = require('../properties');
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = 'model ModelName\n Gain a(k=1), b[2]; Gain keep(k=9);\nend ModelName;';
  var b = backend.parse(source).model.components.find(item => item.name == 'b');
  source = PRDC_JSLAB_SIMULATE_PROPERTIES.prototype.applySourcePatches(source,
    componentModifierPatches(b, [{ name: 'k', value: '4' }]));
  var updated = backend.parse(source);
  assert.equal(updated.success, true, source);
  assert.equal(updated.model.components[0].modifiers[0].value, '1');
  assert.equal(updated.model.components[1].modifiers[0].value, '4');
  assert.equal(updated.model.components[2].modifiers[0].value, '9');
}, { tags: ['unit', 'simulate'] });

tests.add('Binding an unassigned shared parameter inserts its value beside the selected member', function(assert) {
  var { parameterValuePatches } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
  var { PRDC_JSLAB_SIMULATE_PROPERTIES } = require('../properties');
  var backend = new PRDC_JSLAB_SIMULATE_PROJECT();
  var source = 'model ModelName\n parameter Real a, b "B"; Real keep;\nend ModelName;';
  var b = backend.parse(source).model.parameters[1];
  source = PRDC_JSLAB_SIMULATE_PROPERTIES.prototype.applySourcePatches(source, parameterValuePatches(b, '5'));
  var parsed = backend.parse(source);
  assert.equal(parsed.success, true, source);
  assert.equal(parsed.model.parameters[0].value, '');
  assert.equal(parsed.model.parameters[1].value, '5');
  assert.equal(parsed.model.parameters[1].description, 'B');
  assert.equal(parsed.model.components[2].name, 'keep');
}, { tags: ['unit', 'simulate'] });

tests.add('The shipped 6-DOF model places every non-parameter component visibly at a distinct diagram position', function(assert) {
  var project = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../examples/resources/simulate-6dof.jslmo'), 'utf8'));
  var parsed = new PRDC_JSLAB_SIMULATE_PROJECT().parse(project.source);
  assert.equal(parsed.success, true);
  var components = parsed.model.components.filter(item => !item.parameter);
  assert.equal(components.length, 50);
  assert.ok(parsed.model.connections.every(connection => connection.points && connection.points.length >= 2));
  assert.ok(parsed.model.connections.every(connection => connection.points.every((point, index, points) =>
    !index || point[0] == points[index - 1][0] || point[1] == points[index - 1][1])));
  assert.equal(components.filter(item => /Visualizers\./.test(item.type)).length, 0);
  var rods = components.filter(item => /^(motorHousing|platformEdge)\d$/.test(item.name));
  assert.equal(rods.length, 12);
  assert.ok(rods.every(item => item.type == 'Modelica.Mechanics.MultiBody.Parts.FixedTranslation'));
  var joints = components.filter(item => /^leg\d$/.test(item.name));
  for(var index = 1; index <= 6; index++) {
    var joint = components.find(item => item.name == 'leg' + index);
    var rod = components.find(item => item.name == 'lowerRod' + index);
    var clearance = (joint.placement.y + joint.placement.extent[1]) -
      (rod.placement.y + rod.placement.extent[3]);
    assert.ok(clearance >= 16, 'Lower rod must leave room for the joint and both labels.');
    if(index < 6) {
      var next = components.find(item => item.name == 'leg' + (index + 1));
      assert.ok(joint.placement.y - next.placement.y >= 60);
    }
  }
  assert.ok(joints.every(item => item.modifiers.some(modifier => modifier.name == 'sphereDiameter' && modifier.value == 'D_A')));
  for(var index = 1; index <= 6; index++) {
    assert.ok(parsed.model.connections.some(item => item.from == 'base' + index + '.frame_b' && item.to == 'motorHousing' + index + '.frame_a'));
  }
  assert.ok(parsed.model.connections.some(item => item.from == 'platformPoint6.frame_a' && item.to == 'platformEdge6.frame_a'));
  for(const [from, to] of [[6, 1], [1, 2], [2, 3], [3, 4], [4, 5]]) {
    assert.ok(parsed.model.connections.some(item => item.from == 'platformEdge' + from + '.frame_b' && item.to == 'platformEdge' + to + '.frame_a'));
  }
  assert.ok(components.every(item => item.placement && item.placement.visible !== false));
  assert.equal(new Set(components.map(item => item.placement.x + ':' + item.placement.y)).size, 50);
}, { tags: ['unit', 'simulate'] });

exports.MODULE_TESTS = tests;
