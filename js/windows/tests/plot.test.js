/**
 * @file Plot viewer animation update regression tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('plot updates preserve typed coordinate buffers and coalesce changes until the current draw finishes', async function(assert) {
  const frames = [];
  const draws = [];
  const context = vm.createContext({
    document: { getElementById: () => ({}) },
    requestAnimationFrame: callback => frames.push(callback),
    Plotly: { restyle: (plot, properties, indices) => new Promise((resolve, reject) => {
      draws.push({ properties, indices, resolve, reject });
    }) }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../plot.js'), 'utf8'), context);
  const viewer = context.plot;
  viewer.plot_cont = { data: [{ id: 'body' }, { id: 'joint' }] };
  const coordinates = new Float32Array([1, 2, 3]);
  viewer.updateDataById({ id: 'body', x: coordinates, lighting: { specular: 0.3 } });
  viewer.updateData({ y: coordinates }, 1);
  assert.equal(frames.length, 1);
  const pending = frames.shift()();
  assert.equal(draws.length, 1);
  assert.equal(draws[0].properties.x[0], coordinates);
  assert.equal(draws[0].properties.y[1], coordinates);
  assert.equal(draws[0].properties['lighting.specular'][0], 0.3);
  assert.equal(Object.keys(draws[0].properties).some(key => /^x\.\d/.test(key)), false);
  viewer.updateDataById({ id: 'body', x: new Float32Array([4, 5, 6]) });
  viewer.updateDataById({ id: 'body', x: new Float32Array([7, 8, 9]) });
  assert.equal(frames.length, 0);
  assert.equal(draws.length, 1);
  draws[0].resolve();
  await pending;
  assert.equal(frames.length, 1);
  const next = frames.shift()();
  assert.deepEqual(Array.from(draws[1].properties.x[0]), [7, 8, 9]);
  assert.equal(draws[1].indices.length, 1);
  viewer.updateDataById({ id: 'body', x: coordinates });
  draws[1].reject(new Error('Drawing failed'));
  await assert.rejects(next, /Drawing failed/);
  assert.equal(viewer.drawing, false);
  assert.equal(frames.length, 1);
  const recovered = frames.shift()();
  draws[2].resolve();
  await recovered;
  assert.equal(viewer.update_queue.size, 0);
  assert.equal(frames.length, 0);
}, { tags: ['unit', 'windows', 'plot'] });

tests.add('rigid mesh playback retains buffers, composes normalized transforms and exports current world meshes', function(assert) {
  const draws = [];
  let redraws = 0;
  const original = function(parameters) { draws.push(parameters); };
  const mesh = { draw: original, drawTransparent: original, drawPick: original };
  const scene = { dataScale: [2, 3, 4],
    fullSceneLayout: { xaxis: { type: 'linear' }, yaxis: { type: 'linear' }, zaxis: { type: 'linear' } },
    traces: { body: { mesh } }, glplot: { redraw: () => redraws++ } };
  const viewer = { plot_cont: { _fullLayout: { scene: { _scene: scene } },
    _fullData: [{ uid: 'body' }], data: [{ id: 'body', x: [0], y: [0], z: [0], color: 'blue' }] } };
  const context = vm.createContext({ Plotly: { version: '3.3.0' } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../plot-mesh-animation.js'), 'utf8') +
    '\nglobalThis.Animation = PRDC_JSLAB_PLOT_MESH_ANIMATION;', context);
  const animation = new context.Animation(viewer, () => [{ x: new Float32Array([5]), y: [6], z: [7] }]);
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const rotation = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 5, 6, 7, 1];
  animation.update([rotation]);
  assert.equal(redraws, 1);
  mesh.draw({ model: identity, view: identity });
  assert.ok(Math.abs(draws[0].model[1] - 1.5) < 1e-6);
  assert.ok(Math.abs(draws[0].model[4] + 2 / 3) < 1e-6);
  assert.deepEqual(Array.from(draws[0].model.slice(12)), [10, 18, 28, 1]);
  assert.equal(draws[0].view, identity);
  mesh.drawPick({ model: identity });
  assert.deepEqual(Array.from(draws[1].model), Array.from(draws[0].model));
  assert.equal(animation.exportData()[0].x[0], 5);
  assert.equal(animation.exportData()[0].color, 'blue');
  assert.equal(viewer.plot_cont.data[0].x[0], 0);
  assert.throws(() => animation.update([]), /mesh count/);
  animation.dispose();
  assert.equal(mesh.draw, original);
  assert.equal(mesh.drawPick, original);
}, { tags: ['unit', 'windows', 'plot'] });

tests.add('animated plot exports use current world coordinates and release hooks when loading JSON', async function(assert) {
  let image_source;
  let disposed = false;
  const context = vm.createContext({ document: { getElementById: () => ({}) },
    Plotly: { toImage: async source => { image_source = source; return 'image'; },
      newPlot: async () => {}, Plots: { graphJson: () => JSON.stringify({ data: [{ x: [0] }], layout: {} }) } } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../plot.js'), 'utf8'), context);
  const viewer = context.plot;
  viewer.plot_cont = { clientWidth: 640, clientHeight: 480, layout: { scene: {} }, data: [{ x: [0] }] };
  viewer.mesh_animation = { exportData: () => [{ x: new Float32Array([5]), y: [6], z: [7] }],
    dispose: () => { disposed = true; } };
  assert.deepEqual(JSON.parse(viewer.toJSON()).data[0].x, [5]);
  assert.equal(await viewer.toImage('png'), 'image');
  assert.equal(image_source.data[0].x[0], 5);
  assert.equal(image_source.layout, viewer.plot_cont.layout);
  await viewer.fromJSON({ data: [] });
  assert.equal(disposed, true);
  assert.equal(viewer.mesh_animation, null);
}, { tags: ['unit', 'windows', 'plot'] });

exports.MODULE_TESTS = tests;
