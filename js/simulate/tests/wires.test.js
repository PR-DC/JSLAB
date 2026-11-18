/**
 * @file Simulate wire route persistence tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
require('./compiler-fixture');
const { PRDC_JSLAB_SIMULATE_PROJECT } = require('../project');
const { PRDC_JSLAB_SIMULATE_WIRES } = require('../wires');
const { PRDC_JSLAB_SIMULATE_PROPERTIES } = require('../properties');
var tests = new PRDC_JSLAB_TESTS();

tests.add('Saved wire bends are rendered exactly without rerouting or moving endpoints', function(assert) {
  var connection = { points: [[0, 0], [15, 0], [15, 30], [40, 30]] };
  var points = PRDC_JSLAB_SIMULATE_WIRES.prototype.connectionWirePoints.call({}, connection,
    { x: -20, y: 40 }, { x: 60, y: -90 });
  assert.equal(JSON.stringify(points), JSON.stringify([{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: -30 }, { x: 40, y: -30 }]));
  assert.deepEqual(connection.points, [[0, 0], [15, 0], [15, 30], [40, 30]]);
}, { tags: ['unit', 'simulate'] });

tests.add('Wire edits create or update annotations and survive project save and reopen', function(assert) {
  var codec = new PRDC_JSLAB_SIMULATE_PROJECT();
  for(const annotation of ['', ' annotation(Line(color={0,0,127}))',
    ' annotation(__Test=3)', ' annotation(Line(points={{1,2},{3,4}}, color={0,0,127}))']) {
    var source = 'model ModelName Real a,b,c; equation connect(a,b)' + annotation + '; connect(b,c); end ModelName;';
    var parsed = codec.parse(source);
    assert.equal(parsed.success, true, source);
    var connection = parsed.model.connections[0];
    connection.points = [[0, 0], [10, 0], [10, 15], [20, 15]];
    var controller = { editor: { getValue: () => source, setValue: value => { source = value; } },
      connectionSourcePatch: PRDC_JSLAB_SIMULATE_WIRES.prototype.connectionSourcePatch,
      applySourcePatches: PRDC_JSLAB_SIMULATE_PROPERTIES.prototype.applySourcePatches };
    PRDC_JSLAB_SIMULATE_WIRES.prototype.updateConnectionSource.call(controller, connection);
    var restored = codec.parseProject(codec.serializeProject({ source: source }));
    assert.equal(restored.success, true, source);
    assert.deepEqual(restored.model.connections[0].points, connection.points);
    assert.equal(restored.model.connections[1].from, 'b');
    assert.equal(restored.model.connections[1].to, 'c');
    assert.ok(source.includes('connect(b,c);'));
    if(annotation.includes('color=')) {
      assert.ok(source.includes('color={0,0,127}'));
    }
    if(annotation.includes('__Test')) {
      assert.ok(source.includes('__Test=3'));
    }
  }
}, { tags: ['unit', 'simulate'] });

tests.add('Loading compiler metadata preserves connector locations on the reviewed built-in icons', async function(assert) {
  var { PRDC_JSLAB_SIMULATE_DIAGRAM } = require('../diagram');
  var { PRDC_OMJSL_CLIENT } = require('./compiler-fixture').PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
  var type = 'Modelica.Mechanics.MultiBody.Joints.Assemblies.JointSSR';
  var context = { component_graphics: new Map() };
  var component = { type: type, name: 'leg1' };
  var ports = ['frame_a', 'frame_b', 'frame_ib', 'axis'].map(label => ({ label: label }));
  var before = ports.map(port => PRDC_JSLAB_SIMULATE_DIAGRAM.prototype.componentPortLocal.call(context, port, 18, 18, ports, component));
  context.component_graphics.set(type, await new PRDC_OMJSL_CLIENT('unused').componentGraphics(type));
  var after = ports.map(port => PRDC_JSLAB_SIMULATE_DIAGRAM.prototype.componentPortLocal.call(context, port, 18, 18, ports, component));
  assert.deepEqual(after, before);
}, { tags: ['unit', 'simulate'] });

tests.add('Wire collision checks include diagonal imported connections', function(assert) {
  var intersects = PRDC_JSLAB_SIMULATE_WIRES.prototype.segmentIntersectsBox;
  assert.equal(intersects({ x: 0, y: 0 }, { x: 20, y: 20 },
    { left: 8, right: 12, top: 8, bottom: 12 }, 0), true);
  assert.equal(intersects({ x: 0, y: 0 }, { x: 20, y: 20 },
    { left: 1, right: 3, top: 15, bottom: 18 }, 0), false);
}, { tags: ['unit', 'simulate'] });

exports.MODULE_TESTS = tests;
