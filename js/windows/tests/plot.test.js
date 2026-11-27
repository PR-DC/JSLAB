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
  const context = vm.createContext({ document: { getElementById: () => ({}) },
    Plotly: { version: '3.3.0' } });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../plot.js'), 'utf8') +
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

tests.add('vector faces split across intersecting depth planes', function(assert) {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../plot-3d-vector-export.js'), 'utf8') +
    '\nglobalThis.VectorPlot = PRDC_JSLAB_PLOT_3D_VECTOR_EXPORT;', context);
  const renderer = Object.create(context.VectorPlot.prototype);
  renderer.width = renderer.height = 100;
  const translucentPaint = renderer._scatterLinePaint([[0, 0], [1, 1]],
    [35 / 255, 82 / 255, 160 / 255, .35], [35 / 255, 82 / 255, 160 / 255, .35], 0, 1);
  assert.equal(translucentPaint.color, 'rgb(100,234,255)');
  assert.equal(translucentPaint.alpha, .35);
  renderer._rgb = color => color === '#143c96' ? [20, 60, 150] : [220, 70, 20, .5];
  const scale = { colorscale: [[0, '#143c96'], [1, 'rgba(220,70,20,.5)']] };
  assert.equal(renderer._color(scale, [0, 1], .5, '#000'), 'rgba(120,65,85,0.75)');
  renderer.translucent_gradients = new Set(['url(#translucent)']);
  renderer.primitives = [];
  const triangle = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
  for(const paint of ['rgba(220,70,20,.5)', 'url(#translucent)', '#143c96']) {
    renderer._triangle(triangle, paint, 1, null);
  }
  renderer._triangle([[0, 0, 0], [1, 1, .2], [2, 2, .4]], '#143c96', 1, null);
  assert.deepEqual(Array.from(renderer.primitives, face => face.attrs.stroke), [null, null, '#143c96']);
  const clippedFace = { ...renderer.primitives[2], mesh_clip: 'url(#shared-silhouette)' };
  const mergedFaces = renderer._mergeSolidFaces([clippedFace, clippedFace]);
  assert.equal(mergedFaces.length, 1);
  assert.equal(mergedFaces[0].tag, 'path');
  assert.equal(mergedFaces[0].attrs.stroke, '#143c96');
  assert.equal(mergedFaces[0].attrs['stroke-width'], .12);
  assert.equal(renderer._mergeSolidFaces([clippedFace,
    { ...clippedFace, attrs: { ...clippedFace.attrs, 'stroke-width': .5 } }]).length, 2);
  const opaqueColors = [[220, 68, 32, 255], [12, 191, 34, 255], [41, 82, 248, 255]];
  const colorPoints = [[0, 0, 0, .42], [4, 0, 0, .42], [0, 4, 0, .42]];
  renderer._vertexColorTriangle(colorPoints, opaqueColors, 1, null, null, 6);
  assert.equal(renderer.primitives.at(-1).attrs.opacity, 1);
  assert.ok(renderer.primitives.at(-1).attrs.stroke);
  const faceCount = renderer.primitives.length;
  renderer._vertexColorTriangle(colorPoints.map(([x, y, z, w]) => [x + 110, y, z, w]), opaqueColors, 1, null);
  assert.equal(renderer.primitives.length, faceCount);
  assert.equal(renderer._meshIsNonoverlapping([[0, 1, 2], [1, 3, 2]],
    [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]]), true);
  assert.equal(renderer._meshIsNonoverlapping([[0, 1, 2], [3, 4, 5]],
    [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, .1], [1, 0, .1], [0, 1, .1]]), false);
  const opacityRamp = renderer._vertexColorRamp([[20, 60, 150, 0], [20, 60, 150, 127.5], [20, 60, 150, 255]]);
  assert.deepEqual(Array.from(opacityRamp.values), [0, .5, 1]);
  assert.deepEqual(Array.from(opacityRamp.opacityscale, stop => stop[1]), [0, 1]);
  const rgbaRamp = renderer._vertexColorRamp([[20, 60, 150, 51], [120, 65, 85, 127.5], [220, 70, 20, 204]]);
  assert.deepEqual(Array.from(rgbaRamp.values), [0, .5, 1]);
  assert.deepEqual(Array.from(rgbaRamp.opacityscale, stop => stop[1]), [.2, .8]);
  assert.equal(renderer._vertexColorRamp([[20, 60, 150, 51], [120, 65, 85, 90], [220, 70, 20, 204]]), null);
  const depthColors = { values: [0, 0, 1], colorscale: scale.colorscale, opacityscale: [[0, 0], [1, 1]] };
  const depthRamp = renderer._perspectiveVertexRamp([[0, 0, 0, 1], [1, 0, 0, 1], [0, 1, 0, 2]], depthColors);
  assert.deepEqual(Array.from(depthRamp.opacityscale[8]), [.5, 2 / 3]);
  assert.equal(depthRamp.colorscale[8][1], renderer._color(scale, [0, 1], 2 / 3, '#000'));
  assert.equal(renderer._perspectiveVertexRamp([[0, 0, 0, 1], [1, 0, 0, 1.5], [0, 1, 0, 2]], depthColors), null);
  const threeDepths = renderer._perspectiveVertexRamp([[0, 0, 0, 1], [1, 0, 0, 4 / 3], [0, 1, 0, 2]],
    { ...depthColors, values: [0, .5, 1] });
  assert.deepEqual(Array.from(threeDepths.values), [0, 1 / 3, 1]);
  const maskRenderer = Object.create(renderer);
  let projectedMaskValues;
  maskRenderer.definitions = { childElementCount: 0, querySelector: () => null };
  maskRenderer._node = (tag, attrs) => ({ ...attrs });
  maskRenderer._triangleGradient = (points, values) => {
    projectedMaskValues = Array.from(values);
    return 'url(#gradient)';
  };
  assert.ok(maskRenderer._surfaceOpacityMask([[0, 0, 0, 1], [1, 0, 0, 4 / 3], [0, 1, 0, 2]],
    [0, .5, 1], [0, 1], value => value, [[0, 0], [1, 1]]).includes('surface-opacity-'));
  assert.deepEqual(projectedMaskValues, [0, 1 / 3, 1]);
  const fields = [(i, j) => i, (i, j) => j, (i, j) => 2 * i + 3 * j].map(get => ({ get }));
  assert.deepEqual(Array.from(renderer._surfaceNormal(fields, 2, 2)), [-2, -3, 1]);
  assert.equal(renderer._surfaceGridIsNonoverlapping([
    [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]]
  ]), true);
  assert.equal(renderer._surfaceGridIsNonoverlapping([
    [[0, 0], [2, 0], [1, 0]], [[0, 1], [2, 1], [1, 1]]
  ]), false);
  const projectiveGrid = [0, 1].map(v => [0, 1].map(u => {
    const inverseW = 1 / (1 + u);
    return [2 * u * inverseW, 3 * v * inverseW, 0, inverseW];
  }));
  assert.equal(renderer._surfaceGridIsNonoverlapping(projectiveGrid), false);
  assert.equal(renderer._surfaceGridIsNonoverlapping(projectiveGrid, true), true);
  projectiveGrid[1][1] = [.8, 1.2, 0, .4];
  assert.equal(renderer._surfaceGridIsNonoverlapping(projectiveGrid, true), false);
  renderer.primitives = [
    { tag: 'polygon', points: [[0, 0, .2], [100, 0, .2], [0, 100, .2]], attrs: { fill: 'red' } },
    { tag: 'polygon', points: [[0, 0, .1], [100, 0, .3], [0, 100, .1]], attrs: { fill: 'blue' } }
  ];
  const ordered = renderer._visibilityOrder();
  assert.equal(ordered.length, 3);
  assert.equal(ordered[0].attrs.fill, ordered[2].attrs.fill);
  assert.notEqual(ordered[0].attrs.fill, ordered[1].attrs.fill);
  assert.ok(ordered[0].attrs.points.includes('50.000'));
  assert.ok(ordered[2].attrs.points.includes('50.000'));
  const slopedA = { tag: 'polygon', depth: .2, points: [[0, 0, .1], [100, 0, .4], [0, 100, .1]],
    attrs: { fill: 'red' } };
  const slopedB = { tag: 'polygon', depth: .25, points: [[25, 0, .175], [100, 0, .4], [25, 75, .175]],
    attrs: { fill: 'blue' } };
  const sloped = renderer._depthOrder([slopedA, slopedB]);
  assert.equal(sloped[0].attrs.fill, 'red');
  assert.equal(sloped[1].attrs.fill, 'blue');
  const transparent_pass = {};
  renderer.primitives[0].transparent_pass = transparent_pass;
  renderer.primitives[1].transparent_pass = transparent_pass;
  assert.equal(renderer._visibilityOrder()[0], renderer.primitives[0]);
  const opaque = { tag: 'polygon', points: [[0, 0, .2], [100, 0, .2], [0, 100, .2]],
    depth: .2, attrs: { fill: 'red' } };
  const shallow = { ...opaque, points: [[0, 0, .199999], [100, 0, .200001], [0, 100, .199999]],
    attrs: { fill: 'blue' } };
  const crossingFaces = [opaque, shallow];
  const clippedFaces = renderer._visibleTransparentFaces(crossingFaces, crossingFaces, true);
  assert.equal(clippedFaces.length, 2);
  assert.ok(clippedFaces.every(face => face.attrs.d.includes('50.000,0.000')));
  const tiedFaces = [opaque, { ...opaque, attrs: { fill: 'blue' } }];
  assert.equal(renderer._visibleTransparentFaces(tiedFaces, tiedFaces, true)[0], tiedFaces[1]);
  const rear = { tag: 'polygon', points: opaque.points.map(([x, y]) => [x, y, .3]),
    depth: .3, attrs: { fill: 'green' }, transparent_pass };
  const front = { tag: 'polygon', points: opaque.points.map(([x, y]) => [x, y, .1]),
    depth: .1, attrs: { fill: 'blue' }, transparent_pass };
  renderer.primitives = [rear, front, opaque];
  const visible = renderer._visibilityOrder();
  assert.equal(visible.length, 2);
  assert.equal(visible[0].attrs.fill, 'red');
  assert.equal(visible[1].attrs.fill, 'blue');
  const coplanar = { tag: 'path', points: [[10, 10, .2], [40, 10, .2]], depth: .2,
    attrs: { stroke: 'purple', 'stroke-width': 2, 'data-jslab-error-bar': '' } };
  assert.equal(renderer._visibilityOrder([opaque, coplanar]).length, 2);
  assert.equal(renderer._visibilityOrder([coplanar, opaque]).length, 1);
  assert.equal(renderer._visibilityOrder([opaque, { ...coplanar, transparent_pass }]).length, 1);
  const horizontal = { ...coplanar, points: [[0, 50, .1], [100, 50, .3]] };
  const vertical = { ...coplanar, points: [[10, 0, .18], [10, 100, .18]], depth: .18,
    attrs: { ...coplanar.attrs, stroke: 'orange' } };
  const crossing = renderer._visibilityOrder([horizontal, vertical]);
  assert.equal(crossing[0], horizontal);
  assert.equal(crossing[1].attrs.fill, 'orange');
  assert.ok(crossing[1].attrs.d.includes('49.000'));
  assert.ok(crossing[1].attrs.d.includes('51.000'));
  // Overlapping screen bounds entirely behind the foreground must leave room for real depth tests.
  const foreground = Array.from({ length: 260 }, () => ({ ...front }));
  const background = Array.from({ length: 260 }, () => ({ ...opaque }));
  const hidden = renderer._visibleTransparentFaces([...foreground, rear], background);
  assert.equal(hidden.length, foreground.length);
  assert.ok(hidden.every(face => face.attrs.fill === 'blue'));
  const adjacent = { ...rear, points: [[100, 0, .3], [100, 100, .3], [0, 100, .3]] };
  const adjacentFaces = Array.from({ length: 260 }, () => ({ ...adjacent }));
  const edgeOnly = renderer._visibleTransparentFaces([...adjacentFaces, rear], background);
  assert.equal(edgeOnly.length, adjacentFaces.length);
  assert.ok(edgeOnly.every(face => face.points === adjacent.points));
  // These bounding boxes overlap, but only an edge of the transparent triangle separates the faces.
  const disjoint = { ...rear, points: [[130, 40, .3], [90, 70, .3], [120, -30, .3]] };
  const disjointFaces = Array.from({ length: 260 }, () => ({ ...disjoint }));
  const separated = renderer._visibleTransparentFaces([...disjointFaces, rear], background);
  assert.equal(separated.length, disjointFaces.length);
  assert.ok(separated.every(face => face.points === disjoint.points));
  const glyphRenderer = Object.create(renderer);
  glyphRenderer.camera = {};
  glyphRenderer._clipCoordinates = ([x, y, z]) => [x, y, z, 1];
  glyphRenderer._projectClip = point => point;
  const wallGlyph = [[0, 0, -2], [1, 0, 0], [0, 1, 0]];
  const wallFill = glyphRenderer._projectWallGeometry(wallGlyph, null, false);
  assert.equal(wallFill.length, 4);
  assert.equal(wallFill.filter(point => point[2] === -1).length, 2);
  const wallOutline = glyphRenderer._projectWallGeometry(wallGlyph.slice(0, 2), null, true);
  assert.equal(wallOutline.length, 2);
  assert.equal(wallOutline[0][2], -1);
  const wallBounds = [[0, 0, -1], [1, 1, 1]];
  const wideGlyph = [[-2, .25, 0], [.75, .25, 0], [.75, .75, 0]];
  const clippedGlyph = glyphRenderer._projectWallGeometry(wideGlyph, null, false, wallBounds);
  assert.equal(clippedGlyph.length, 4);
  assert.equal(clippedGlyph.filter(point => point[0] === 0).length, 2);
  const clippedLine = glyphRenderer._projectDepthClippedPolygon([
    [0, 0, -2, 1], [2, 0, 0, 1], [2, 1, 0, 1], [0, 1, -2, 1]
  ]);
  assert.equal(clippedLine.length, 4);
  assert.ok(clippedLine.every(([x]) => x >= 1));
  assert.equal(clippedLine.filter(point => point[2] === -1).length, 2);
  glyphRenderer._clipCoordinates = () => [.0001, -.0002, .00005, -.25];
  assert.deepEqual(Array.from(glyphRenderer._axisClipCoordinates([0, 0, 0])), [1, -2, .5, 1]);
  for(const kind of ['data-jslab-scatter-line', 'data-jslab-surface-contour']) {
    renderer.primitives = [opaque, { tag: 'path', points: [[10, 10, .3], [60, 10, .1]],
      depth: .2, attrs: { stroke: 'purple', 'stroke-width': 2, [kind]: '' } }];
    const line = renderer._visibilityOrder()[1];
    assert.equal(line.attrs.fill, 'purple');
    assert.ok(line.attrs.d.includes('35.000'));
    assert.ok(!line.attrs.d.includes('10.000,9.000'));
  }
  const samePaint = Array.from({ length: 300 }, (_, i) => ({
    ...opaque, attrs: { fill: 'red', opacity: 1, points: i % 2 ? '0,0 1,1 1,0' : '0,0 1,0 1,1' }
  }));
  renderer.primitives = [...samePaint, renderer.primitives[1]];
  const dense = renderer._visibilityOrder();
  assert.equal(dense.at(-1).attrs.fill, 'purple');
  assert.ok(dense.at(-1).attrs.d.includes('35.000'));
  const merged = renderer._mergeSolidFaces(samePaint);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].tag, 'path');
  assert.equal(merged[0].attrs.stroke, null);
  const meshOutline = renderer._meshOutline([
    { points: [[0, 0], [4, 0], [4, 4]] },
    { points: [[0, 0], [0, 4], [4, 4]] }
  ]);
  assert.equal(meshOutline, 'M0.000,0.000L4.000,0.000L4.000,4.000L0.000,4.000Z');
  const outer = [[0, 0], [4, 0], [4, 4], [0, 4]];
  const inner = [[1, 1], [3, 1], [3, 3], [1, 3]];
  const ring = outer.flatMap((corner, i) => {
    const next = (i + 1) % outer.length;
    return [{ points: [corner, outer[next], inner[next]] },
      { points: [corner, inner[next], inner[i]] }];
  });
  assert.equal(renderer._meshOutline(ring),
    'M0.000,0.000L4.000,0.000L4.000,4.000L0.000,4.000Z' +
    'M3.000,1.000L1.000,1.000L1.000,3.000L3.000,3.000Z');
  const intersecting = { ...opaque, points: [[0, 0, .1], [100, 0, .3], [0, 100, .1]],
    attrs: { fill: 'blue', opacity: 1 } };
  renderer.primitives = [...samePaint, intersecting];
  const opaqueVisible = renderer._visibilityOrder();
  assert.equal(opaqueVisible.length, 2);
  assert.ok(opaqueVisible.every(face => face.attrs.d.includes('50.000')));
  const colors = [];
  renderer._triangleGradient = (_points, values) => colors.push(values);
  renderer._triangle = () => {};
  renderer._coloredTriangle([[0, 0, 0, 1], [100, 0, 0, .5], [0, 100, 0, .5]],
    [0, 1, 1], {}, [0, 1], '#000', .5, null, 5);
  assert.equal(colors.length, 2);
  assert.equal(colors[0][1], 1 / 3);
  assert.equal(colors[1][0], 1 / 3);
  renderer._project = point => point;
  const bounds = [[0, -1, -1], [1, 1, 1]];
  const world = [[-1, 0, 0], [.5, -.5, 0], [.5, .5, 0]];
  const triangles = renderer._clipTriangle(world, world, [-1, .5, .5], bounds);
  assert.equal(triangles.length, 2);
  for(const [points, values] of triangles) {
    assert.ok(points.every((point, i) => point[0] >= 0 && point[0] == values[i]));
  }
  const ends = renderer._clipSegment([2, 0, 0], [-2, 0, 0], bounds);
  assert.equal(ends[0][0], 1);
  assert.equal(ends[1][0], 0);
  renderer.camera = {};
  renderer._clipCoordinates = point => [...point, 1];
  const close = [[0, .5, -2], [-.5, 0, 0], [.5, 0, 0]];
  const near = renderer._clipTriangle(close, close, [-2, 0, 0], null);
  assert.equal(near.length, 2);
  assert.ok(near.flatMap(([points]) => points).every(point => point[2] >= -1));
  assert.equal(renderer._clipSegment([0, 0, -2], [0, 0, 0], null)[0][2], -1);
}, { tags: ['unit', 'windows', 'plot'] });

exports.MODULE_TESTS = tests;
