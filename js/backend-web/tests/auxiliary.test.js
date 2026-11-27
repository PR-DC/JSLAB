/**
 * @file Real browser figure and serial window component startup
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { webTest, webTestWithTimeout } = require('./browser-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) {
  exports.MODULE_TESTS = tests;
  return;
}
webTest(tests, 'web figure frame initializes Plotly and its menu toggles', async function() {
  var t = GUI, opened = t.app.windows.openManagedWindow('gui-figure', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow, doc = w.document;
  await new Promise((resolve, reject) => {
    var script = doc.createElement('script');
    script.src = location.origin + '/js/init-figure.js';
    script.onload = resolve;
    script.onerror = reject;
    doc.head.appendChild(script);
  });
  doc.dispatchEvent(new w.Event('DOMContentLoaded'));
  await t.wait(() => !!doc.querySelector('.plot-cont.js-plotly-plot'), 'real Plotly plot; Plotly=' + typeof w.Plotly + '; plot=' + typeof w.plot + '; html=' + doc.getElementById('figure-content').innerHTML.slice(0, 100));
  var menu = doc.getElementById('figure-menu-container'), before = menu.classList.contains('collapsed');
  doc.getElementById('figure-menu-button').click();
  t.eq(menu.classList.contains('collapsed'), !before);
  t.app.window_manager.close('gui-figure');
});

webTest(tests, 'Plotly legend fits Latin Modern text at different font sizes', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-figure-font', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  var doc = w.document;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  cont.style.cssText = 'width:720px;height:420px';
  var label = 'Aerodynamic moment coefficient WMWMWM';
  var sizes = [12, 18, 28, 40];

  await w.plot.newPlot({}, [
    { x: [0, 1], y: [0, 1], name: label, mode: 'lines' },
    { x: [0, 1], y: [1, 0], name: 'Reference response', mode: 'lines' }
  ], {
    width: 720,
    height: 420,
    showlegend: true,
    font: { family: 'LatinModern', size: sizes[0] },
    legend: {
      font: { family: 'LatinModern', size: sizes[0] },
      borderwidth: 1,
      borderpad: 4
    }
  }, { staticPlot: true });

  if(doc.fonts && doc.fonts.ready) {
    await doc.fonts.ready;
  }

  for(var size of sizes) {
    await w.plot.relayout({
      'font.family': 'LatinModern',
      'font.size': size,
      'legend.font.family': 'LatinModern',
      'legend.font.size': size
    });
    await new Promise(resolve => w.requestAnimationFrame(() =>
      w.requestAnimationFrame(resolve)));
    var background = cont.querySelector('g.legend rect.bg');
    var texts = Array.from(cont.querySelectorAll('g.legend text.legendtext'));
    t.ok(background && texts.length, 'legend geometry exists at ' + size + 'px');
    var backgroundBox = background.getBBox();
    var textRight = Math.max(...texts.map(text => {
      var box = text.getBBox();
      return box.x + box.width;
    }));
    var backgroundRight = backgroundBox.x + backgroundBox.width;
    t.ok(textRight <= backgroundRight + 0.5,
      'Latin Modern legend text is cropped at ' + size + 'px: text right ' +
      textRight + ', background right ' + backgroundRight);
  }

  t.app.window_manager.close('gui-figure-font');
});

webTestWithTimeout(tests, 'Plotly meshes, scatter and field traces export vector geometry', 40000, async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-figure-vector', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  var x = [0,0,0,0,1,1,1,1], y = [0,0,1,1,0,0,1,1], z = [0,1,0,1,0,1,0,1];
  var directions = { x, y, z, u: x.map(() => 1), v: y.map(() => 0), w: z.map(() => 0) };
  var field = { x, y, z, value: x.map((value, i) => value + y[i] + z[i]), isomin: .5, isomax: 2.5 };
  var cases = [
    [{ type: 'scatter3d', x, y, z, mode: 'lines+markers+text',
      text: x.map(String), textposition: 'top center',
      textfont: { color: 'rgba(35,82,160,.35)' },
      line: { dash: 'longdashdot', width: 6, color: z.map((value, i) => value + .1 * i) },
      marker: { line: { color: '#083875', width: 10 } },
      projection: { x: { show: true, scale: 1.4, opacity: .65 } },
      error_x: { type: 'constant', value: .15, visible: true },
      error_y: { type: 'constant', value: .1, visible: true, color: 'rgba(35,82,160,.35)' },
      error_z: { type: 'constant', value: .2, visible: true } }, 'path'],
    [{ type: 'mesh3d', x, y, z, i: [0], j: [1], k: [2] }, 'polygon'],
    [{ type: 'cone', ...directions, u: x.map((_, i) => i + 1), cmin: 1, cmax: 5,
      colorscale: [[0, '#123456'], [1, '#e51738']], lighting: { ambient: 1, diffuse: 0, specular: 0 } }, 'polygon'],
    [{ type: 'streamtube', ...directions }, 'polygon'],
    [{ type: 'isosurface', ...field }, 'polygon'],
    [{ type: 'volume', ...field, surface: { count: 3 }, opacityscale: [[0, 0], [.5, .25], [1, 1]] }, 'polygon']
  ];
  var readSvg = async (size = [500, 400]) => {
    var url = await w.plot.toImage('svg', size);
    return new w.DOMParser().parseFromString(decodeURIComponent(url.slice(url.indexOf(',') + 1)), 'image/svg+xml');
  };
  try {
    for(const [trace, tag] of cases) {
      await w.Plotly.newPlot(cont, [trace], { width: 500, height: 400,
        scene: { xaxis: { ticks: 'outside', showline: true, zeroline: true } } });
      var svg = await readSvg();
      t.ok(!svg.querySelector('image, foreignObject, parsererror'), trace.type + ' emits a raster-free SVG');
      var geometry = svg.querySelector('[data-jslab-geometry]');
      t.ok(geometry.querySelector(tag) || tag == 'polygon' && geometry.querySelector('[data-jslab-solid-faces]'),
        trace.type + ' emits vector geometry');
      t.ok(svg.querySelector('[data-jslab-axis-text] path'), trace.type + ' exports the live axis glyphs');
      t.ok(svg.querySelector('[data-jslab-axis-lines] path'), trace.type + ' exports the live axis lines');
      if(trace.type == 'cone') {
        t.ok(geometry.querySelector('[fill="rgb(229,23,56)"]'),
          'cone color reaches the upper bound on the unnormalized magnitude scale');
      }
      if(trace.type == 'volume') {
        t.ok(svg.querySelector('[data-jslab-vector-3d] linearGradient stop'),
          trace.type + ' interpolates its color scale as a vector gradient');
        t.ok(svg.querySelector('[data-jslab-vector-3d] linearGradient stop[stop-opacity]'),
          trace.type + ' retains its opacity scale in the vector gradient');
      }
      if(['mesh3d', 'cone', 'streamtube'].includes(trace.type)) {
        var paint = '[data-jslab-geometry] polygon, [data-jslab-geometry] [data-jslab-solid-faces]';
        var attribute = 'fill';
        var beforeLight = svg.querySelector(paint).getAttribute(attribute);
        await w.Plotly.restyle(cont, { 'lighting.ambient': 0, 'lighting.diffuse': 0, 'lighting.specular': 0 });
        svg = await readSvg();
        t.ok(['rgb(0,0,0)', '#000000'].includes(svg.querySelector(paint).getAttribute(attribute)));
        t.ok(beforeLight != 'rgb(0,0,0)', trace.type + ' export reflects the live lighting settings');
      }
      if(trace.type == 'scatter3d') {
        t.ok(svg.querySelector('[data-jslab-scatter-glyph="scatterPlot"]'), 'scatter markers use Plotly glyphs');
        var marker = cont._fullLayout.scene._scene.traces[cont._fullData[0].uid].scatterPlot;
        var [minWidth, maxWidth] = marker.gl.getParameter(marker.gl.ALIASED_LINE_WIDTH_RANGE);
        var outline = svg.querySelector('[data-jslab-scatter-glyph="scatterPlot"][stroke-width]');
        t.eq(Number(outline.getAttribute('stroke-width')),
          Math.min(maxWidth, Math.max(minWidth, marker.lineWidth * marker.pixelRatio)) / marker.pixelRatio);
        t.ok(svg.querySelector('[data-jslab-scatter-glyph="textMarkers"][fill="rgb(100,234,255)"]'),
          'scatter labels use Plotly glyphs and preserve their translucent color');
        t.ok(svg.querySelector('[data-jslab-scatter-projection]'), 'scatter exports wall projections');
        t.ok(svg.querySelector('[data-jslab-scatter-line]:is([stroke^="url("], [fill^="url("])'),
          'scatter emits colored dash segments with vector gradients');
        for(const axis of 'xyz') {
          t.ok(svg.querySelector('[data-jslab-error-bar="' + axis + '"]'), 'scatter exports ' + axis + ' error bars');
        }
        t.ok(svg.querySelector('[data-jslab-error-bar="y"]:is([stroke="rgb(100,234,255)"], [fill="rgb(100,234,255)"])'),
          'translucent error bars preserve their premultiplied framebuffer color');
        var before = svg.querySelector('[data-jslab-geometry] path').getAttribute('d');
        await w.Plotly.relayout(cont, { 'scene.camera.eye': { x: -1.5, y: 1, z: .8 } });
        svg = await readSvg();
        t.ok(svg.querySelector('[data-jslab-geometry] path').getAttribute('d') != before,
          'vector geometry follows the live camera');
      }
      w.Plotly.purge(cont);
    }
    await w.Plotly.newPlot(cont, [{
      type: 'mesh3d', x: [-.9, .9, 0], y: [-.6, -.6, .9], z: [0, .2, .65],
      i: [0], j: [1], k: [2], vertexcolor: ['#e71722', 'rgb(40,240,55)', [0, 0, 255]],
      lighting: { ambient: 1, diffuse: 0, specular: 0 }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube' } });
    var colored = await readSvg();
    var colors = [...colored.querySelectorAll('[data-jslab-geometry] polygon')].map(node => node.getAttribute('fill'));
    t.ok(new Set(colors).size > 10, 'mesh interpolates independent vertex colors');
    t.ok(!colored.querySelector('image, foreignObject, parsererror'), 'vertex colors remain raster-free');
    await w.Plotly.restyle(cont, {
      x: [[-.9, .9, 0]], y: [[-.7, -.7, .85]], z: [[0, .4, .2]],
      vertexcolor: [[[231, 0, 34], [11, 80, 254], [121, 40, 144]]]
    });
    var axis = { range: [-1, 1], visible: false };
    await w.Plotly.relayout(cont, { 'scene.xaxis': axis, 'scene.yaxis': axis, 'scene.zaxis': axis,
      'scene.camera': { eye: { x: 1.2, y: 0, z: 1.55 }, up: { x: 0, y: 1, z: 0 } } });
    var perspectiveUri = await t.comparePlotExports(w, 'Perspective mesh vertex ramp', 500, 400, .06, .002, 3);
    var perspectiveColors = new w.DOMParser().parseFromString(
      decodeURIComponent(perspectiveUri.slice(perspectiveUri.indexOf(',') + 1)), 'image/svg+xml');
    t.ok(perspectiveColors.querySelector('[data-jslab-geometry] polygon[fill^="url("]'),
      'perspective vertex ramps use vector gradients');
    await w.Plotly.relayout(cont, { 'scene.camera.projection.type': 'orthographic' });
    var rampColors = await readSvg();
    t.eq(rampColors.querySelectorAll('[data-jslab-geometry] polygon[fill^="url("]').length, 1);
    await w.Plotly.newPlot(cont, [
      { type: 'mesh3d', x: [-.82, .82, 0], y: [-.65, -.65, .72], z: [-.95, .95, 0],
        i: [0], j: [1], k: [2], color: '#067037' },
      { type: 'scatter3d', mode: 'markers+text', x: [.28, -.25], y: [-.3, -.55], z: [.28, -.3],
        text: ['A', 'B'], textposition: 'top center', marker: { size: 25 } }
    ], { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { projection: { type: 'orthographic' }, eye: { x: .1, y: .15, z: 2.75 },
        up: { x: 0, y: 1, z: 0 } }, xaxis: { range: [-1, 1] },
      yaxis: { range: [-1, 1] }, zaxis: { range: [-1, 1] } } });
    var clipped = await readSvg();
    t.ok(clipped.querySelector('[data-jslab-scatter-glyph][clip-path*="glyph-face-"]'),
      'opaque mesh clips overlapping marker and text outlines');
    await w.Plotly.restyle(cont, { opacity: .8, 'marker.opacity': .55 }, [1]);
    var clippedTranslucent = await readSvg();
    t.ok(clippedTranslucent.querySelector('[data-jslab-scatter-glyph][clip-path*="glyph-face-"]'),
      'opaque mesh also clips translucent markers and text');
    await w.Plotly.restyle(cont, { opacity: 1, 'marker.opacity': 1 }, [1]);
    await w.Plotly.restyle(cont, { opacity: .65 }, [0]);
    var translucentMesh = await readSvg();
    var mixedDepth = translucentMesh.querySelector('[data-jslab-geometry]');
    t.ok(mixedDepth.firstElementChild.matches('[data-jslab-scatter-glyph]'));
    t.eq(mixedDepth.lastElementChild.getAttribute('opacity'), '0.65');
    var clippedMesh = mixedDepth.lastElementChild;
    t.ok((clippedMesh.getAttribute('d') || clippedMesh.querySelector('path')?.getAttribute('d'))?.includes('Z'),
      'mesh is clipped by opaque glyph triangles before blending');
    await w.Plotly.relayout(cont, {
      'scene.bgcolor': 'rgba(27,49,88,.72)',
      'scene.xaxis.showbackground': true,
      'scene.xaxis.backgroundcolor': 'rgba(205,247,188,.45)',
      'scene.xaxis.showgrid': true,
      'scene.xaxis.gridcolor': 'rgba(35,82,160,.35)',
      'scene.xaxis.showticklabels': true,
      'scene.xaxis.tickfont.color': 'rgba(35,82,160,.35)',
      'scene.yaxis.showticklabels': true,
      'scene.yaxis.tickfont.color': 'rgba(90,39,24,.55)'
    });
    var background = await readSvg();
    t.eq(background.querySelector('[data-jslab-scene-background]').getAttribute('fill-opacity'), '0.72');
    t.ok(background.querySelector('[data-jslab-axis-background][fill-opacity="0.45"]'),
      'scene walls preserve their framebuffer opacity in SVG');
    t.ok(background.querySelector('[data-jslab-axis-lines] [fill="rgb(100,234,255)"]'),
      'translucent grid lines preserve their premultiplied framebuffer color');
    t.ok(background.querySelector('mask[id$="-axis-wall-mask"] path') &&
      background.querySelector('g[mask] [data-jslab-axis-background]'),
      'translucent grid lines replace the covered wall pixels');
    t.ok(background.querySelector('[data-jslab-axis-lines] g[mask*="axis-line-mask-"] path'),
      'later translucent grid lines replace covered portions of earlier axis lines');
    t.ok(background.querySelector('[data-jslab-axis-lines][mask*="axis-label-mask"]') &&
      background.querySelector('[data-jslab-axis-text] g[mask*="axis-glyph-mask-"] path'),
      'translucent axis text replaces covered grid lines and earlier glyphs');
    var translucentLabel = background.querySelector('[data-jslab-axis-text] [fill="rgb(100,234,255)"]');
    t.ok(translucentLabel,
      'translucent axis glyphs preserve their premultiplied framebuffer color');
    t.ok([...background.querySelectorAll('mask[id$="-axis-wall-mask"] path')].some(path =>
      path.getAttribute('d') === translucentLabel.getAttribute('d')),
    'the wall mask follows the translucent label outline');
    await w.Plotly.newPlot(cont, [{
      type: 'scatter3d', mode: 'lines', x: [-.9, -.7, -.3, null, 0, .25, .53],
      y: [-.6, .5, -.3, null, -.58, .55, -.3], z: [-.4, -.2, 0, null, .2, .4, -.3],
      connectgaps: true, line: { color: '#115781', width: 26 }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube' } });
    var thick = await readSvg();
    var strip = thick.querySelector('[data-jslab-scatter-line][data-jslab-solid-faces]');
    t.ok(strip && strip.getAttribute('fill') == 'rgb(17,87,129)', 'opaque line joins use the native triangle strip');
    await w.Plotly.newPlot(cont, [
      { type: 'scatter3d', mode: 'markers', x: [-.04], y: [0], z: [.45],
        marker: { size: 55, color: '#e62f50', opacity: .5 } },
      { type: 'scatter3d', mode: 'markers', x: [.04], y: [0], z: [-.45],
        marker: { size: 55, color: '#206aab', opacity: .55 } }
    ], { width: 500, height: 400, showlegend: false, scene: { aspectmode: 'cube',
      camera: { projection: { type: 'orthographic' }, eye: { x: .01, y: .01, z: 2.75 },
        up: { x: 0, y: 1, z: 0 } } } });
    var translucent = await readSvg();
    var markers = [...translucent.querySelectorAll('[data-jslab-scatter-glyph="scatterPlot"]')];
    t.eq(markers.length, 2);
    t.eq(markers[0].getAttribute('fill'), 'rgb(230,47,80)');
    t.eq(markers[1].getAttribute('fill'), 'rgb(32,106,171)');
    await w.Plotly.newPlot(cont, [{
      type: 'mesh3d', x: [-.95, .95, .95, -.95], y: [-.95, -.95, .95, .95], z: [0, 0, 0, 0],
      i: [0, 2], j: [1, 3], k: [2, 0], intensity: [0, 1, 1, 0], coloraxis: 'coloraxis2',
      lighting: { ambient: 1, diffuse: 0, specular: 0 }
    }], { width: 500, height: 400, coloraxis2: {
      cmin: .1, cmax: .9, reversescale: true,
      colorscale: [[0, '#02438c'], [.45, '#02438c'], [.45, '#ec501e'], [1, '#ec501e']]
    }, scene: { aspectmode: 'cube',
      camera: { projection: { type: 'orthographic' }, eye: { x: .13, y: .24, z: 2.75 },
        up: { x: 0, y: 1, z: 0 } },
      xaxis: { range: [-1, 1] }, yaxis: { range: [-1, 1] }, zaxis: { range: [-1, 1] } } });
    var stepped = await readSvg();
    var stops = [...stepped.querySelectorAll('linearGradient[id^="jslab-vector-"] > stop')];
    t.eq(stops[0].getAttribute('stop-color'), 'rgb(236,80,30)');
    var transition = stops.filter(stop => Math.abs(Number(stop.getAttribute('offset')) - .54) < .02);
    t.ok(transition.length >= 2 &&
      transition.every((stop, i) => i == 0 || Number(stop.getAttribute('offset')) >
        Number(transition[i - 1].getAttribute('offset'))),
    'mesh gradient reproduces the narrow texture filtering across a stepped scale boundary');
    t.ok(stepped.querySelector('[data-jslab-solid-faces][fill^="url(#jslab-vector-"]'),
      'coplanar mesh faces share one gradient path even with different starting vertices');
  } finally {
    t.app.window_manager.close('gui-figure-vector');
  }
});

webTest(tests, 'Field trace colors and volume opacity retain filtered steps in SVG', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-volume-opacity-step', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  try {
    var field = {
      x: [0, 1, 0, 1, 0, 1, 0, 1], y: [0, 0, 1, 1, 0, 0, 1, 1], z: [0, 0, 0, 0, 1, 1, 1, 1],
      value: [0, 1, 1, 2, 1, 2, 2, 3], cmin: 0, cmax: 3, showscale: false
    };
    var layout = { width: 500, height: 400 };
    await w.Plotly.newPlot(w.plot.plot_cont, [{ ...field, type: 'volume', isomin: .5, isomax: 2.5,
      surface: { count: 3 }, opacity: .9, opacityscale: [[0, .02], [.5, .02], [.5, .95], [1, .95]]
    }], layout);
    var svg = await t.comparePlotExports(w, 'Volume at a sharp opacity transition', 500, 400, 1.4, .045);
    var doc = new w.DOMParser().parseFromString(decodeURIComponent(svg.slice(svg.indexOf(',') + 1)), 'image/svg+xml');
    t.ok(!doc.querySelector('image, foreignObject, parsererror'), 'the volume opacity transition remains vector');
    var colorscale = [[0, '#0033ff'], [.5, '#0033ff'], [.5, '#ff6600'], [1, '#ff6600']];
    await w.Plotly.restyle(w.plot.plot_cont, { colorscale: [colorscale], opacityscale: [[[0, .25], [1, .85]]] });
    var colorSvg = await t.comparePlotExports(w, 'Volume at a sharp colorscale transition', 500, 400, .4, .004);
    var colorDoc = new w.DOMParser().parseFromString(decodeURIComponent(colorSvg.slice(colorSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(colorDoc.querySelector('linearGradient stop[stop-opacity]') && !colorDoc.querySelector('image'),
      'the volume keeps vector opacity stops alongside the filtered colors');
    await w.Plotly.newPlot(w.plot.plot_cont, [{ ...field, type: 'isosurface', isomin: 1.5, isomax: 1.5,
      surface: { count: 1 }, caps: { x: { show: false }, y: { show: false }, z: { show: false } },
      colorscale,
      lighting: { ambient: 1, diffuse: 0, specular: 0 }
    }], layout);
    var isoSvg = await t.comparePlotExports(w, 'Isosurface at a sharp colorscale transition', 500, 400, .3, .004);
    var isoDoc = new w.DOMParser().parseFromString(decodeURIComponent(isoSvg.slice(isoSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(!isoDoc.querySelector('image, foreignObject, parsererror'), 'the isosurface stays raster-free');
    await w.Plotly.restyle(w.plot.plot_cont, { colorscale: [[[0, '#0033ff'], [.5006, '#0033ff'],
      [.501, '#ff6600'], [1, '#ff6600']]] });
    await t.comparePlotExports(w, 'Isosurface at a sub-texel colorscale ramp', 500, 400, .3, .004);
    var directions = { x: field.x, y: field.y, z: field.z, u: field.x.map(() => 1),
      v: field.y.map(() => 0), w: field.z.map(() => 0), cmin: 0, cmax: 2, colorscale, showscale: false,
      lighting: { ambient: 1, diffuse: 0, specular: 0 } };
    await w.Plotly.newPlot(w.plot.plot_cont, [{ ...directions, type: 'cone', sizemode: 'absolute', sizeref: .5 }], layout);
    await t.comparePlotExports(w, 'Cones at a sharp colorscale transition', 500, 400, .3, .006);
    await w.Plotly.newPlot(w.plot.plot_cont, [{ ...directions, type: 'streamtube', sizeref: .4,
      starts: { x: [0], y: [.5], z: [.5] }
    }], layout);
    await t.comparePlotExports(w, 'Streamtube at a sharp colorscale transition', 500, 400, .3, .006);
  } finally {
    t.app.window_manager.close('gui-volume-opacity-step');
  }
});

webTest(tests, 'Subdivided vertex colors share a mesh silhouette', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-vertex-color-silhouette', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  try {
    var grid = [-.95, -.3, .3, .95];
    var colors = ['#dc4420', '#0cbf22', '#2952f8'];
    var mesh = { type: 'mesh3d', x: [], y: [], z: [], i: [], j: [], k: [], vertexcolor: [],
      lighting: { ambient: 1, diffuse: 0, specular: 0 } };
    for(let row = 0; row < grid.length; row++) {
      for(let col = 0; col < grid.length; col++) {
        mesh.x.push(grid[col]);
        mesh.y.push(grid[row]);
        mesh.z.push(0);
        mesh.vertexcolor.push(colors[(row + 2 * col) % colors.length]);
        if(row < grid.length - 1 && col < grid.length - 1) {
          var index = row * grid.length + col;
          var next_row = index + grid.length;
          mesh.i.push(index, next_row + 1);
          mesh.j.push(next_row, index + 1);
          mesh.k.push(index + 1, next_row);
        }
      }
    }
    var axis = { range: [-1, 1], visible: false };
    await w.Plotly.newPlot(w.plot.plot_cont, [mesh], { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { eye: { x: 0, y: 0, z: .35 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } });
    var svg = await t.comparePlotExports(w, 'Subdivided vertex-colored faces', 500, 400, .37, .002);
    var doc = new w.DOMParser().parseFromString(decodeURIComponent(svg.slice(svg.indexOf(',') + 1)), 'image/svg+xml');
    var groups = doc.querySelectorAll('[data-jslab-geometry] g[clip-path*="-mesh-"]');
    t.eq(groups.length, 1);
    t.eq(groups[0].getAttribute('stroke-width'), '1.5');
    t.ok(groups[0].querySelector('polygon[stroke^="#"]:not([stroke-width])'),
      'subdivided faces inherit the silhouette stroke width');
    t.ok(!doc.querySelector('clipPath[id*="-vertex-face-"], image'), 'the mesh uses only the shared vector silhouette');
    await w.Plotly.restyle(w.plot.plot_cont, { opacity: .55 });
    var translucent = await t.comparePlotExports(w, 'Translucent subdivided vertex-colored faces', 500, 400, .4, .001);
    var translucentDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(translucent.slice(translucent.indexOf(',') + 1)), 'image/svg+xml');
    t.eq(translucentDoc.querySelectorAll('[data-jslab-geometry] g[opacity="0.55"][clip-path]').length, 1);
    var rgba = ['rgba(220,68,32,.55)', 'rgba(12,191,34,.55)', 'rgba(41,82,248,.55)'];
    var uniformRgba = mesh.vertexcolor.map(color => rgba[colors.indexOf(color)]);
    var varyingRgba = uniformRgba.map((color, i) => color.replace('.55)', (.5 + .32 * mesh.x[i]) + ')'));
    await w.Plotly.restyle(w.plot.plot_cont, { opacity: 1, vertexcolor: [uniformRgba] });
    var vertexAlphaSvg = await t.comparePlotExports(w, 'Mesh with uniform vertex alpha', 500, 400, .4, .001);
    var vertexAlphaDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(vertexAlphaSvg.slice(vertexAlphaSvg.indexOf(',') + 1)), 'image/svg+xml');
    t.eq(vertexAlphaDoc.querySelectorAll('[data-jslab-geometry] g[opacity="0.55"][clip-path]').length, 1);
    await w.Plotly.restyle(w.plot.plot_cont, { vertexcolor: [varyingRgba] });
    var varyingAlphaSvg = await t.comparePlotExports(w, 'Mesh with varying vertex alpha', 500, 400, .6, .001, 5);
    var varyingAlphaDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(varyingAlphaSvg.slice(varyingAlphaSvg.indexOf(',') + 1)), 'image/svg+xml');
    t.eq(varyingAlphaDoc.querySelectorAll('[data-jslab-geometry] g[mask*="surface-opacity-"]').length, 1);
    await w.Plotly.restyle(w.plot.plot_cont, { z: [mesh.y.map(y => .18 * y)] });
    await w.Plotly.relayout(w.plot.plot_cont, { 'scene.camera.eye.z': .55 });
    var perspectiveAlphaSvg = await t.comparePlotExports(w, 'Perspective mesh with varying vertex alpha',
      500, 400, .55, .003);
    var perspectiveAlphaDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(perspectiveAlphaSvg.slice(perspectiveAlphaSvg.indexOf(',') + 1)), 'image/svg+xml');
    t.ok(perspectiveAlphaDoc.querySelector('mask[id*="surface-opacity-"] polygon[fill^="url("]'),
      'independent depth and alpha use a mask made of vector gradients');
    t.eq(perspectiveAlphaDoc.querySelectorAll('[data-jslab-geometry] g[mask*="surface-opacity-"]').length, 1);
    await w.Plotly.restyle(w.plot.plot_cont, {
      opacity: .55, z: [mesh.x.map(x => .18 * x)], intensity: [mesh.x.map((x, i) => (x + 1.5 + .5 * mesh.y[i]) / 3)],
      colorscale: 'Viridis', cmin: 0, cmax: 1, showscale: false
    });
    await w.Plotly.relayout(w.plot.plot_cont, { 'scene.camera.eye': { x: .1, y: 0, z: .55 } });
    var intensitySvg = await t.comparePlotExports(w, 'Nonoverlapping translucent intensity mesh', 500, 400, .25, .001);
    var intensityDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(intensitySvg.slice(intensitySvg.indexOf(',') + 1)), 'image/svg+xml');
    var intensityGroups = intensityDoc.querySelectorAll('[data-jslab-geometry] g[opacity="0.55"][clip-path]');
    t.eq(intensityGroups.length, 1);
    t.ok(intensityGroups[0].querySelector('[fill^="url("]'), 'the shared opacity group retains vector gradients');
    await w.Plotly.restyle(w.plot.plot_cont, { z: [mesh.z], vertexcolor: null, intensity: null, color: '#dc4420' });
    await w.Plotly.relayout(w.plot.plot_cont, { 'scene.camera.eye': { x: 0, y: 0, z: .35 } });
    var solidSvg = await t.comparePlotExports(w, 'Solid translucent mesh', 500, 400, .2, .001);
    var solidDoc = new w.DOMParser().parseFromString(decodeURIComponent(solidSvg.slice(solidSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.eq(solidDoc.querySelectorAll('[data-jslab-geometry] g[opacity="0.55"] path[data-jslab-solid-faces]').length, 1);
  } finally {
    t.app.window_manager.close('gui-vertex-color-silhouette');
  }
});

webTestWithTimeout(tests, 'Plotly surfaces export the refined grid with vector lighting and opacity', 40000, async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-figure-surface', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  var readSvg = async () => {
    var url = await w.plot.toImage('svg', [500, 400]);
    return new w.DOMParser().parseFromString(decodeURIComponent(url.slice(url.indexOf(',') + 1)), 'image/svg+xml');
  };
  try {
    await w.Plotly.newPlot(cont, [{ type: 'surface', z: [[1, 10], [100, 20]],
      opacityscale: [[0, 0], [.5, .25], [1, 1]] }],
    { width: 500, height: 400, scene: { zaxis: { type: 'log' } } });
    var svg = await readSvg();
    t.ok(!svg.querySelector('image, foreignObject, parsererror'));
    t.ok(svg.querySelectorAll('[data-jslab-geometry] polygon').length > 2);
    t.ok(svg.querySelector('linearGradient[id^="jslab-vector-"] stop[stop-opacity]'));
    var selector = 'linearGradient[id^="jslab-vector-"] stop';
    t.ok(svg.querySelector(selector).getAttribute('stop-color') !== 'rgb(0,0,0)');
    await w.Plotly.restyle(cont, { 'lighting.ambient': 0, 'lighting.diffuse': 0, 'lighting.specular': 0 });
    svg = await readSvg();
    t.eq(svg.querySelector(selector).getAttribute('stop-color'), 'rgb(0,0,0)');
    await w.Plotly.newPlot(cont, [{
      type: 'surface', z: [[0, 1, 2, 3], [1, null, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]]
    }], { width: 500, height: 400 });
    var open = await readSvg();
    await w.Plotly.restyle(cont, { connectgaps: true });
    var filled = await readSvg();
    t.ok(filled.querySelectorAll('[data-jslab-geometry] polygon').length >
      open.querySelectorAll('[data-jslab-geometry] polygon').length, 'surface gap interpolation exports additional faces');
    t.ok(!filled.querySelector('image, foreignObject, parsererror'), 'interpolated surfaces remain raster-free');
    await w.Plotly.newPlot(cont, [{ type: 'surface', z: [[.95, -.95], [-.95, .95]],
      hidesurface: true, contours: { z: { show: true, start: -.8, end: .8, size: .4,
        color: 'rgba(35,82,160,.35)', project: { z: true } } } }],
    { width: 500, height: 400 });
    var projected = await readSvg();
    var contour = '[data-jslab-surface-contour][stroke="rgb(100,234,255)"]';
    await w.Plotly.restyle(cont, { 'contours.z.project.z': false });
    var unprojected = await readSvg();
    t.ok(unprojected.querySelector(contour));
    var segmentCount = svg => [...svg.querySelectorAll(contour)].reduce((count, path) =>
      count + (path.getAttribute('d').match(/M/g) || []).length, 0);
    t.ok(segmentCount(projected) > segmentCount(unprojected));
    await w.Plotly.newPlot(cont, [{ type: 'surface', z: [[0, 0], [0, 0]],
      surfacecolor: [[0, 1], [0, 1]],
      colorscale: [[0, '#02438c'], [.45, '#02438c'], [.45, '#ec501e'], [1, '#ec501e']],
      lighting: { ambient: 1, diffuse: 0, specular: 0 } }],
    { width: 500, height: 400, scene: { camera: { projection: { type: 'orthographic' } } } });
    var stepped = await readSvg();
    var gradient = 'linearGradient[id^="jslab-vector-"]';
    t.eq(stepped.querySelectorAll(gradient).length, 1);
    t.ok(stepped.querySelector(gradient + ' [stop-color="rgb(2,67,140)"]'));
    t.ok(stepped.querySelector('[data-jslab-geometry] [data-jslab-solid-faces][fill^="url(#jslab-vector-"]'),
      'surface steps share the filtered gradient across the refined grid');
    await w.Plotly.restyle(cont, { colorscale: 'Viridis' });
    var continuous = await readSvg();
    t.eq(continuous.querySelectorAll(gradient).length, 1);
    t.ok(continuous.querySelectorAll(gradient + ' > stop').length > 10,
      'continuous surfaces preserve the texture samples in one shared gradient');
    var continuousPath = continuous.querySelector('[data-jslab-geometry] [data-jslab-solid-faces]');
    t.ok(!continuousPath.parentElement.hasAttribute('clip-path'),
      'a merged surface outline does not also clip its own edge');
    await w.Plotly.restyle(cont, { opacityscale: [[[0, .1], [.45, .2], [.55, .92], [1, .98]]] });
    var translucent = await readSvg();
    t.eq(translucent.querySelectorAll(gradient).length, 1);
    t.ok(translucent.querySelector(gradient + ' > stop[stop-opacity]'));
    t.ok(translucent.querySelector('[data-jslab-geometry] [data-jslab-solid-faces][fill^="url(#jslab-vector-"]'),
      'a nonoverlapping translucent grid shares a sampled opacity gradient');
    await w.Plotly.relayout(cont, { 'scene.camera': {
      projection: { type: 'perspective' }, eye: { x: 1.4, y: 0, z: 2.1 }, up: { x: 0, y: 1, z: 0 }
    } });
    var perspective = await readSvg();
    t.eq(perspective.querySelectorAll(gradient).length, 1);
    t.ok(perspective.querySelector(gradient + ' > stop[stop-opacity]'),
      'a perspective grid with depth aligned to the colorscale shares opacity stops');
    var outline = perspective.querySelector('[data-jslab-geometry] [data-jslab-solid-faces]');
    t.eq(outline.getAttribute('d').match(/M/g).length, 1, 'the shared gradient uses only the outside boundary');
    await w.Plotly.newPlot(cont, [{ type: 'surface', z: [[0, 0], [0, 0]],
      surfacecolor: [[0, 1], [0, 1]],
      colorscale: [[0, '#02438c'], [.35, '#02438c'], [.35, '#ec501e'],
        [.65, '#ec501e'], [.65, '#02438c'], [1, '#02438c']],
      lighting: { ambient: 1, diffuse: 0, specular: 0 } }],
    { width: 500, height: 400 });
    var cyclic = await readSvg();
    t.ok(cyclic.querySelector('[data-jslab-geometry] :is([fill="rgb(2,67,140)"], [fill="#02438c"])'));
    t.ok(cyclic.querySelector('[data-jslab-geometry] :is([fill="rgb(236,80,30)"], [fill="#ec501e"])'));
    t.ok(!cyclic.querySelector('image, foreignObject, parsererror'));
  } finally {
    t.app.window_manager.close('gui-figure-surface');
  }
});

webTest(tests, '3D surface, contour and projected scatter SVGs stay close to the Plotly PNG', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-surface-pixel-comparison', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  var pixels = (url, width, height) => t.plotImagePixels(w, url, width, height);
  var compare = (label, width, height, limit) => t.comparePlotExports(w, label, width, height, limit);
  try {
    await w.Plotly.newPlot(cont, [{ type: 'surface', x: [-1, 1], y: [-1, 1], z: [[0, 0], [0, 0]],
      surfacecolor: [[0, 1], [0, 1]], colorscale: 'Viridis',
      opacityscale: [[0, .1], [.45, .2], [.55, .92], [1, .98]],
      lighting: { ambient: 1, diffuse: 0, specular: 0 }, showscale: false
    }], { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { eye: { x: 1.4, y: 0, z: 2.1 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: { range: [-1, 1] }, yaxis: { range: [-1, 1] }, zaxis: { range: [-1, 1] }
    } });
    await compare('Surface', 500, 400);
    await compare('Resized surface', 650, 510);
    var oldWidth = cont.style.width;
    cont.style.width = '620px';
    t.eq(cont.clientWidth, 620);
    for(const format of ['png', 'svg']) {
      var original = new w.Image();
      original.src = await w.plot.toImage(format);
      await original.decode();
      t.eq(original.naturalWidth, 500);
      t.eq(original.naturalHeight, 400);
    }
    cont.style.width = oldWidth;
    var axis = { visible: false, range: [-1, 1] };
    await w.Plotly.newPlot(cont, [{ type: 'scatter3d', mode: 'markers',
      x: [-.8, .6, .1], y: [-.5, .3, .6], z: [-.85, .8, .3],
      marker: { size: 26, color: ['#0039ce', '#ef1000', '#05a524'], line: { width: 2, color: '#202020' } },
      projection: { x: { show: true, opacity: .85, scale: 5 }, y: { show: true, opacity: .65, scale: 5 } }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { eye: { x: -.35, y: -.4, z: 1.45 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } });
    var projectedUrl = await compare('Projected scatter', 500, 400);
    var projectedDoc = new w.DOMParser().parseFromString(decodeURIComponent(projectedUrl.slice(projectedUrl.indexOf(',') + 1)),
      'image/svg+xml');
    var projectedStroke = projectedDoc.querySelector('[data-jslab-scatter-projection][stroke-width]');
    var wallClipId = projectedStroke?.getAttribute('clip-path')?.match(/^url\(#(.+)\)$/)?.[1];
    t.ok(wallClipId && projectedDoc.getElementById(wallClipId)?.querySelector('polygon'),
      'projected marker outlines are clipped to the axis wall');
    var glyphRenderer = cont._fullLayout.scene._scene.traces[cont._fullData[0].uid].scatterPlot;
    var drawTransparent = glyphRenderer.drawTransparent;
    var ownDraw = Object.hasOwn(glyphRenderer, 'drawTransparent');
    try {
      glyphRenderer.drawTransparent = function(...args) {
        this.clipBounds = [[-.3, -.4, -.5], [.4, .65, .5]];
        return drawTransparent.apply(this, args);
      };
      var limitedUrl = await w.plot.toImage('svg', [500, 400]);
      var limitedDoc = new w.DOMParser().parseFromString(decodeURIComponent(limitedUrl.slice(limitedUrl.indexOf(',') + 1)),
        'image/svg+xml');
      var projectionSelector = '[data-jslab-scatter-projection]';
      t.ok(limitedDoc.querySelectorAll(projectionSelector).length < projectedDoc.querySelectorAll(projectionSelector).length,
        'wall markers follow the projection shader bounds');
    } finally {
      if(ownDraw) {
        glyphRenderer.drawTransparent = drawTransparent;
      } else {
        delete glyphRenderer.drawTransparent;
      }
    }
    await w.Plotly.newPlot(cont, [{ type: 'surface', x: [-1, 1], y: [-1, 1],
      z: [[.95, -.95], [-.95, .95]], hidesurface: true, opacity: .25,
      surfacecolor: [[0, 1], [0, 1]],
      opacityscale: [[0, .1], [.36, .15], [.38, 1], [1, 1]],
      colorscale: [[0, '#02438c'], [.37, '#02438c'], [.37, '#ec501e'], [1, '#ec501e']],
      lighting: { ambient: .3, diffuse: 0, specular: 0 },
      contours: { z: { show: true, color: '#1b348a', highlightcolor: '#ed0934',
        start: -.8, end: .8, size: .4, width: 12,
        project: { z: true } } }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube', camera: { eye: { x: 1.25, y: 1.05, z: .85 } } } });
    var svgUrl = await compare('Contours on a translucent surface', 500, 400, .5);
    var svgDoc = new w.DOMParser().parseFromString(decodeURIComponent(svgUrl.slice(svgUrl.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(svgDoc.querySelector('[data-jslab-surface-contour][opacity="1"]'),
      'fixed contour paint retains its own opacity');
    var unhighlighted = await pixels(await w.plot.toImage('png', [650, 510]), 650, 510);
    var scene = cont._fullLayout.scene._scene;
    var surface = scene.traces[cont._fullData[0].uid].surface;
    surface.highlight({ level: [-1, -1, 1], position: [0, 0, .13], dataCoordinate: [0, 0, .13] });
    var viewport = cont._fullLayout._size;
    var live = await pixels(scene.toImage('png'), viewport.w, viewport.h);
    var directPng = await pixels(await w.plot.toImage('png', [500, 400]), 500, 400);
    var delta = live.reduce((sum, value, index) => {
      var x = index % (viewport.w * 4);
      var y = Math.floor(index / (viewport.w * 4));
      return sum + Math.abs(value - directPng[((viewport.t + y) * 500 + viewport.l) * 4 + x]);
    }, 0) / live.length;
    t.ok(delta < .5, 'PNG at the original size reproduces the live highlighted viewport, mean error ' + delta);
    var highlightedSvg = await compare('Highlighted contours', 650, 510);
    var highlightedPng = await pixels(await w.plot.toImage('png', [650, 510]), 650, 510);
    var countRed = data => {
      var count = 0;
      for(let i = 0; i < data.length; i += 4) {
        count += Number(data[i] > 180 && data[i + 1] < 100 && data[i + 2] < 130);
      }
      return count;
    };
    t.ok(countRed(highlightedPng) > countRed(unhighlighted), 'PNG preserves the live highlight after resizing');
    t.ok(countRed(await pixels(highlightedSvg, 650, 510)) > countRed(unhighlighted),
      'SVG preserves the live highlight after resizing');
    await w.Plotly.addTraces(cont, { type: 'scattergl', x: [0, 1], y: [0, 1], mode: 'markers',
      marker: { color: '#00df00', size: 15 }, showlegend: false });
    await w.Plotly.relayout(cont, { 'scene.domain.x': [.52, 1], 'xaxis.domain': [0, .38] });
    surface = cont._fullLayout.scene._scene.traces[cont._fullData[0].uid].surface;
    surface.highlight({ level: [-1, -1, 1], position: [0, 0, .13], dataCoordinate: [0, 0, .13] });
    var mixedPng = await pixels(await w.plot.toImage('png', [500, 400]), 500, 400);
    t.ok(countRed(mixedPng) > 0, 'mixed PNG retains the highlighted surface');
    t.ok(mixedPng.some((value, i) => i % 4 === 1 && value > 190 && mixedPng[i - 1] < 20 && mixedPng[i + 1] < 20),
      'mixed PNG retains the 2D WebGL markers');
    var mixedSvg = await w.plot.toImage('svg', [500, 400]);
    t.ok(countRed(await pixels(mixedSvg, 500, 400)) > 0, 'mixed SVG retains the highlighted surface');
  } finally {
    t.app.window_manager.close('gui-surface-pixel-comparison');
  }
});

webTestWithTimeout(tests,
  '3D meshes and surfaces retain spatially varying light in SVG', 40000, async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-mesh-point-light', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  try {
    var axis = { range: [-1, 1], visible: false };
    var mesh = { type: 'mesh3d', x: [-.95, .95, -.95], y: [-.85, -.85, .9], z: [0, 0, 0],
      i: [0], j: [1], k: [2], color: '#d5aa86', flatshading: true,
      lightposition: { x: -.3995588, y: -.39375, z: -.9921699 },
      lighting: { ambient: .2, diffuse: 1, specular: 0 }
    };
    var layout = { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { projection: { type: 'orthographic' }, eye: { x: 0, y: 0, z: 2.75 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } };
    await w.Plotly.newPlot(cont, [mesh], layout);
    await t.comparePlotExports(w, 'Mesh lit by a nearby point light', 500, 400, .15, .008);
    var smoothMesh = { ...mesh, flatshading: false,
      x: [-.95, .95, -.95, .95], y: [-.85, -.85, .9, .9], z: [0, 0, 0, .9],
      i: [0, 1], j: [1, 3], k: [2, 2]
    };
    await w.Plotly.newPlot(cont, [smoothMesh], layout);
    await t.comparePlotExports(w, 'Smooth normals across adjacent faces', 500, 400, .25);
    await w.Plotly.newPlot(cont, [{ ...smoothMesh, opacity: .55 }, { type: 'mesh3d',
      x: [-.2, .75, .3], y: [-.7, -.5, .5], z: [.35, .35, .35], i: [0], j: [1], k: [2],
      color: '#145193', lighting: { ambient: 1, diffuse: 0, specular: 0 }
    }], { ...layout, showlegend: false });
    var translucent = await t.comparePlotExports(w, 'Lit translucent mesh behind an opaque face', 500, 400, .19);
    var translucentDoc = new w.DOMParser().parseFromString(decodeURIComponent(translucent.slice(translucent.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(translucentDoc.querySelector('[data-jslab-geometry] g[opacity="0.55"][clip-path]'),
      'lighting facets share the opacity of their original face');
    await w.Plotly.newPlot(cont, [{ ...smoothMesh, intensity: [0, .55, .3, 1], colorscale: 'Viridis',
      cmin: 0, cmax: 1, showscale: false
    }], layout);
    await t.comparePlotExports(w, 'Lit mesh with an intensity scale', 500, 400, .3);
    await w.Plotly.restyle(cont, { opacity: .55 });
    var alphaScaleSvg = await t.comparePlotExports(w, 'Lit translucent mesh with an intensity scale', 500, 400, .2);
    var alphaScaleDoc = new w.DOMParser().parseFromString(decodeURIComponent(alphaScaleSvg.slice(alphaScaleSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(alphaScaleDoc.querySelector('[data-jslab-geometry] g[opacity="0.55"] [fill^="url("]'),
      'the translucent face retains its vector gradient');
    await w.Plotly.newPlot(cont, [{ ...smoothMesh, color: undefined,
      vertexcolor: ['#642ca9', '#157aaf', '#217c68', '#dae55d']
    }], layout);
    await t.comparePlotExports(w, 'Lit mesh with vertex colors', 500, 400, .56, .014);
    var specularLayout = { ...layout, scene: { ...layout.scene,
      camera: { ...layout.scene.camera, projection: { type: 'perspective' } }
    } };
    await w.Plotly.newPlot(cont, [{ ...mesh, lightposition: { x: 0, y: -.276241744, z: .994891744 },
      lighting: { ambient: .12, diffuse: 0, specular: 1, roughness: .12, fresnel: 0 }
    }], specularLayout);
    await t.comparePlotExports(w, 'Narrow specular highlight near a mesh edge', 500, 400, .2);
    await w.Plotly.newPlot(cont, [{ ...mesh, lightposition: { x: -.133791128, y: -.182265386, z: .994891744 },
      lighting: { ambient: .12, diffuse: 0, specular: 1, roughness: .045, fresnel: 0 }
    }], specularLayout);
    await t.comparePlotExports(w, 'Narrow specular highlight inside a mesh face', 500, 400, .16);
    var surface = { type: 'surface', x: [-.95, .95], y: [-.85, .9], z: [[0, 0], [0, 0]],
      surfacecolor: [[0, 0], [0, 0]], colorscale: [[0, '#d5aa86'], [1, '#d5aa86']],
      showscale: false, cmin: 0, cmax: 1, lightposition: { x: -.1978708, y: -.2112437, z: .3333467 },
      lighting: { ambient: .2, diffuse: .85, specular: 0 } };
    var surfaceLayout = { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { eye: { x: 0, y: 0, z: .025 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } };
    await w.Plotly.newPlot(cont, [surface], surfaceLayout);
    await t.comparePlotExports(w, 'Close-up surface with a nearby light', 500, 400, .9);
    await w.Plotly.newPlot(cont, [{ ...surface, surfacecolor: [[0, 1], [0, 1]],
      colorscale: [[0, '#d5aa86'], [1, '#478aa6']]
    }], surfaceLayout);
    await t.comparePlotExports(w, 'Close-up colorscale surface with a nearby light', 500, 400, .9);
  } finally {
    t.app.window_manager.close('gui-mesh-point-light');
  }
});

webTest(tests, 'Constant 3D faces at a colorscale step match their sampled texture', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-surface-constant-color', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  try {
    var axis = { range: [-1, 1], visible: false };
    var colorscale = [[0, '#0033ff'], [.5, '#0033ff'], [.5, '#ff6600'], [1, '#ff6600']];
    var lighting = { ambient: 1, diffuse: 0, specular: 0 };
    var layout = { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { eye: { x: .55, y: 0, z: 1.5 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } };
    await w.Plotly.newPlot(w.plot.plot_cont, [{ type: 'surface', x: [-.98, .98], y: [-.98, .98],
      z: [[0, 0], [0, 0]], surfacecolor: [[.5, .5], [.5, .5]], cmin: 0, cmax: 1,
      colorscale, lighting, showscale: false
    }], layout);
    await t.comparePlotExports(w, 'Constant surface at a colorscale step', 500, 400, .15, .003);
    await w.Plotly.restyle(w.plot.plot_cont, {
      opacityscale: [[[0, .2], [.48, .2], [.52, .9], [1, .9]]],
      lighting: { ambient: .2, diffuse: .85, specular: 0 },
      lightposition: { x: -.1978708, y: -.2112437, z: .3333467 }
    });
    await w.Plotly.relayout(w.plot.plot_cont, { 'scene.camera.eye': { x: 0, y: 0, z: .025 } });
    var alphaSvg = await t.comparePlotExports(w, 'Lit surface at a constant sampled opacity', 500, 400, .4, .001);
    var alphaDoc = new w.DOMParser().parseFromString(decodeURIComponent(alphaSvg.slice(alphaSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.eq(alphaDoc.querySelectorAll('[data-jslab-geometry] g[opacity][clip-path]').length, 1);
    await w.Plotly.relayout(w.plot.plot_cont, { 'scene.camera.eye.x': .001 });
    var tiltedAlphaSvg = await t.comparePlotExports(w, 'Tilted lit surface at constant opacity', 500, 400, .45, .001);
    var tiltedAlphaDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(tiltedAlphaSvg.slice(tiltedAlphaSvg.indexOf(',') + 1)), 'image/svg+xml');
    t.eq(tiltedAlphaDoc.querySelectorAll('[data-jslab-geometry] g[opacity][clip-path]').length, 1);
    await w.Plotly.restyle(w.plot.plot_cont, { opacityscale: null, opacity: .55 });
    var traceAlphaSvg = await t.comparePlotExports(w, 'Tilted lit surface with trace opacity', 500, 400, .35, .001);
    var traceAlphaDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(traceAlphaSvg.slice(traceAlphaSvg.indexOf(',') + 1)), 'image/svg+xml');
    t.eq(traceAlphaDoc.querySelectorAll('[data-jslab-geometry] g[opacity="0.55"][clip-path]').length, 1);
    var mesh = { type: 'mesh3d', x: [-.98, .98, .98, -.98], y: [-.98, -.98, .98, .98], z: [0, 0, 0, 0],
      i: [0, 0], j: [1, 2], k: [2, 3], cmin: 0, cmax: 1, colorscale, lighting, showscale: false };
    await w.Plotly.newPlot(w.plot.plot_cont, [{ ...mesh, intensity: [.5, .5, .5, .5] }], layout);
    await t.comparePlotExports(w, 'Constant vertex intensity at a colorscale step', 500, 400, .15, .003);
    await w.Plotly.newPlot(w.plot.plot_cont, [{ ...mesh, intensity: [.5, .5], intensitymode: 'cell' }], layout);
    await t.comparePlotExports(w, 'Constant cell intensity at a colorscale step', 500, 400, .15, .003);
  } finally {
    t.app.window_manager.close('gui-surface-constant-color');
  }
});

webTest(tests, 'Uneven lit surface grid shares a vector clip', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-surface-grid-light', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  try {
    var axis = { range: [-1, 1], visible: false };
    var grid = Array.from({ length: 18 }, (_, i) => i < 9 ? -.98 + i * .07 : .42 + (i - 9) * .07);
    await w.Plotly.newPlot(cont, [{ type: 'surface', x: grid, y: grid, z: grid.map(() => grid.map(() => 0)),
      surfacecolor: grid.map(() => grid), colorscale: 'Viridis', showscale: false,
      lightposition: { x: -.1978708, y: -.2112437, z: .3333467 },
      lighting: { ambient: .25, diffuse: .85, specular: 0 }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { eye: { x: 0, y: 0, z: .028 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } });
    var svg = await t.comparePlotExports(w, 'Uneven lit surface grid with shared clipping', 500, 400, .27, .0015, 5);
    var doc = new w.DOMParser().parseFromString(decodeURIComponent(svg.slice(svg.indexOf(',') + 1)), 'image/svg+xml');
    var clips = [...doc.querySelectorAll('clipPath[id*="-mesh-"]')];
    var references = new Set([...doc.querySelectorAll('[clip-path]')].map(node => node.getAttribute('clip-path')));
    t.eq(clips.length, 1);
    t.ok(references.has('url(#' + clips[0].id + ')'), 'the shared clip is referenced by the exported surface');
    await w.Plotly.restyle(cont, {
      surfacecolor: [grid.map(y => grid.map(x => x + .7 * y))],
      lighting: { ambient: 1, diffuse: 0, specular: 0 }
    });
    await w.Plotly.relayout(cont, { 'scene.camera.eye': { x: .012, y: 0, z: .065 } });
    var close = await t.comparePlotExports(w, 'Camera-clipped colorscale surface', 500, 400, .15);
    t.ok(close.length < 150000, 'gradient subdivision is limited to faces near the viewport');
  } finally {
    t.app.window_manager.close('gui-surface-grid-light');
  }
});

webTestWithTimeout(tests, 'occluded translucent surfaces retain seamless SVG gradients', 40000, async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-occluded-surface', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  try {
    var axis = { range: [-1, 1], visible: false };
    var coordinates = Array.from({ length: 13 }, (_, i) => -1 + i / 6);
    var lighting = { ambient: 1, diffuse: 0, specular: 0 };
    await w.Plotly.newPlot(cont, [{ type: 'surface', x: coordinates, y: coordinates,
      z: coordinates.map(() => coordinates.map(() => 0)), surfacecolor: coordinates.map(() => coordinates),
      colorscale: 'Viridis', opacity: .62, showscale: false, lighting
    }, { type: 'mesh3d', x: [-.5, .85, -.1], y: [-.65, -.55, .7], z: [.3, .3, .3],
      i: [0], j: [1], k: [2], color: '#c52940', lighting
    }], { width: 500, height: 400, showlegend: false, scene: { aspectmode: 'cube',
      camera: { projection: { type: 'orthographic' }, eye: { x: 0, y: 0, z: 2.75 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } });
    var svg = await t.comparePlotExports(w, 'Occluded translucent surface', 500, 400, .2);
    var doc = new w.DOMParser().parseFromString(decodeURIComponent(svg.slice(svg.indexOf(',') + 1)), 'image/svg+xml');
    t.ok(doc.querySelector('path[data-jslab-solid-faces][opacity="0.62"][fill^="url("]'),
      'the visible translucent cells share one vector paint');
    await w.Plotly.newPlot(cont, [{ type: 'surface', x: [-.95, .95], y: [-.85, .9], z: [[0, 0], [0, 0]],
      surfacecolor: [[0, 1], [0, 1]], colorscale: [[0, '#d5aa86'], [1, '#478aa6']], opacity: .55,
      showscale: false, cmin: 0, cmax: 1, lightposition: { x: -.1978708, y: -.2112437, z: .3333467 },
      lighting: { ambient: .2, diffuse: .85, specular: 0 }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { eye: { x: 0, y: 0, z: .025 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } });
    var litSvg = await t.comparePlotExports(w, 'Close-up lit translucent surface', 500, 400, .5, .002);
    var litDoc = new w.DOMParser().parseFromString(decodeURIComponent(litSvg.slice(litSvg.indexOf(',') + 1)), 'image/svg+xml');
    var litGroups = litDoc.querySelectorAll('[data-jslab-geometry] g[opacity="0.55"][clip-path]');
    t.eq(litGroups.length, 1);
    t.ok(litGroups[0].querySelector('[fill^="url("]'), 'the shared opacity group retains its vector gradients');
    await w.Plotly.restyle(cont, { opacity: 1, surfacecolor: [[[0, .4], [0, .4]]],
      opacityscale: [[[0, .55], [.6, .55], [.8, .9], [1, .9]]] });
    var plateauSvg = await t.comparePlotExports(w, 'Lit surface on an opacity plateau', 500, 400, .4, .002);
    var plateauDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(plateauSvg.slice(plateauSvg.indexOf(',') + 1)), 'image/svg+xml');
    t.eq(plateauDoc.querySelectorAll('[data-jslab-geometry] g[opacity][clip-path]').length, 1);
    await w.Plotly.restyle(cont, { surfacecolor: [[[0, 1], [0, 1]]],
      opacityscale: [[[0, .08], [.48, .12], [.52, .88], [1, .99]]] });
    var rampSvg = await t.comparePlotExports(w, 'Close-up lit surface with an opacity scale', 500, 400, .5);
    var rampDoc = new w.DOMParser().parseFromString(decodeURIComponent(rampSvg.slice(rampSvg.indexOf(',') + 1)), 'image/svg+xml');
    var maskPaint = rampDoc.querySelector('mask[id*="surface-opacity-"] rect').getAttribute('fill');
    var maskStops = [...rampDoc.querySelector(maskPaint.slice(4, -1)).querySelectorAll('stop')];
    t.ok(new Set(maskStops.map(stop => stop.getAttribute('stop-color'))).size > 1,
      'the surface mask retains varying luminance stops');
    t.eq(rampDoc.querySelectorAll('[data-jslab-geometry] g[mask*="surface-opacity-"]').length, 1);
    await w.Plotly.restyle(cont, { z: [[[-.012, .012], [-.012, .012]]],
      lightposition: { x: -.2363107, y: -.2522815, z: .2038337 } });
    var tiltedSvg = await t.comparePlotExports(w, 'Tilted lit surface with an opacity scale', 500, 400, .4);
    var tiltedDoc = new w.DOMParser().parseFromString(decodeURIComponent(tiltedSvg.slice(tiltedSvg.indexOf(',') + 1)), 'image/svg+xml');
    t.ok(tiltedDoc.querySelector('[data-jslab-geometry] g[mask*="surface-opacity-"]'),
      'the tilted surface uses a vector opacity mask in perspective');
    await w.Plotly.relayout(cont, { paper_bgcolor: 'rgba(0,0,0,0)' });
    var transparentPng = await w.plot.toImage('png', [500, 400]);
    var transparentSvg = await w.plot.toImage('svg', [500, 400]);
    var [pngPixels, svgPixels] = await Promise.all([transparentPng, transparentSvg]
      .map(url => t.plotImagePixels(w, url, 500, 400, null)));
    t.eq(pngPixels[3], 0);
    t.eq(svgPixels[3], 0);
    var alphaDifferences = [100, 175, 250, 325, 400].map(x => {
      var index = 4 * (200 * 500 + x) + 3;
      t.ok(pngPixels[index] > 0 && pngPixels[index] < 255, 'the PNG samples lie inside the opacity ramp');
      return Math.abs(pngPixels[index] - svgPixels[index]);
    });
    t.ok(Math.max(...alphaDifferences) <= 3,
      'PNG and SVG alpha differences are ' + alphaDifferences.join(', ') + ' across ' +
      tiltedDoc.querySelectorAll('[data-jslab-geometry] g[mask*="surface-opacity-"]').length + ' masked groups');
    await w.Plotly.relayout(cont, { paper_bgcolor: '#fff' });
    await w.Plotly.restyle(cont, {
      z: [[[-.012, -.012], [.012, .012]]], surfacecolor: [[[0, .7], [.3, 1]]],
      opacityscale: [[[0, .08], [.498, .12], [.502, .88], [1, .99]]],
      lightposition: { x: -.1978708, y: -.2112437, z: .3333467 }
    });
    var crossSvg = await t.comparePlotExports(w, 'Lit surface with independent depth and opacity', 500, 400, .4, .002);
    var crossDoc = new w.DOMParser().parseFromString(decodeURIComponent(crossSvg.slice(crossSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(crossDoc.querySelector('mask[id*="surface-opacity-"] polygon[fill^="url("]'),
      'independent surface depth and opacity use subdivided vector masks');
    t.eq(crossDoc.querySelectorAll('[data-jslab-geometry] g[mask*="surface-opacity-"]').length, 1);
  } finally {
    t.app.window_manager.close('gui-occluded-surface');
  }
});

webTest(tests, '3D axis walls survive camera clipping in SVG export', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-near-axis-walls', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  try {
    var wall = backgroundcolor => ({ range: [-1, 1], showbackground: true, backgroundcolor });
    await w.Plotly.newPlot(cont, [{ type: 'mesh3d', x: [-.56, .56, 0], y: [-.42, -.42, .6], z: [-.65, -.4, .92],
      i: [0], j: [1], k: [2], color: '#116b76', lighting: { ambient: 1, diffuse: 0, specular: 0 }
    }, { type: 'scatter3d', mode: 'lines', x: [-.3, .4, -.1], y: [-.1, -.15, .2], z: [-.7, -.5, .95],
      line: { width: 9, color: '#da233d' }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube', camera: {
      eye: { x: .06, y: .14, z: .24 }, center: { x: .2, y: .2, z: .2 }, up: { x: 0, y: 1, z: 0 }
    }, xaxis: wall('#efaaaa'), yaxis: wall('#aaddef'), zaxis: wall('#ddeebb') } });
    var svg = await t.comparePlotExports(w, 'Clipped axis walls', 500, 400);
    var doc = new w.DOMParser().parseFromString(decodeURIComponent(svg.slice(svg.indexOf(',') + 1)), 'image/svg+xml');
    t.ok(doc.querySelector('[data-jslab-axis-background]'), 'visible wall is retained as a polygon');
    var clearGrid = { showbackground: true, backgroundcolor: '#32acdb', showgrid: true,
      gridwidth: 6, gridcolor: 'rgba(0,0,0,0)', zeroline: false };
    await w.Plotly.newPlot(cont, [{ type: 'scatter3d', mode: 'markers',
      x: [0, 1, 0], y: [0, 1, 1], z: [0, 1, 1], marker: { size: 0 }
    }], { width: 500, height: 400, paper_bgcolor: '#eee', scene: {
      bgcolor: '#556677', xaxis: clearGrid, yaxis: clearGrid, zaxis: clearGrid
    } });
    var gridUrl = await t.comparePlotExports(w, 'Transparent grid strokes', 500, 400, 1.25, .025);
    var gridDoc = new w.DOMParser().parseFromString(decodeURIComponent(gridUrl.slice(gridUrl.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(gridDoc.querySelector('[data-jslab-axis-lines] path[fill-opacity="0"]'),
      'zero-alpha grid strokes are retained for the wall mask');
    await w.Plotly.newPlot(cont, [{ type: 'scatter3d', mode: 'markers',
      x: [0, 1, 0], y: [0, 1, 1], z: [0, 1, 1], marker: { color: '#e84963', size: 8 }
    }], { width: 500, height: 400, paper_bgcolor: '#dde9c8', scene: {
      bgcolor: 'rgba(27,49,88,.72)',
      xaxis: { showbackground: true, backgroundcolor: 'rgba(205,247,188,.45)' },
      yaxis: { showbackground: true, backgroundcolor: 'rgba(156,84,240,.55)' },
      zaxis: { showbackground: true, backgroundcolor: 'rgba(243,184,51,.62)' }
    } });
    var backgroundUri = await t.comparePlotExports(w, 'Translucent scene and walls over colored paper',
      500, 400, .6, .013, 15);
    var backgroundDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(backgroundUri.slice(backgroundUri.indexOf(',') + 1)), 'image/svg+xml');
    t.ok(backgroundDoc.querySelector('[data-jslab-scene-background][fill-opacity="0.72"]'),
      'the scene background uses the WebGL clear alpha');
    t.eq(backgroundDoc.querySelectorAll('[data-jslab-axis-background]').length, 3);
    t.ok(!backgroundDoc.querySelector('image'), 'the scene and its walls remain vector geometry');
    var nearAxis = { range: [-1, 1] };
    await w.Plotly.newPlot(cont, [{ type: 'mesh3d', x: [-.56, .56, 0], y: [-.42, -.42, .6], z: [-.65, -.4, .92],
      i: [0], j: [1], k: [2], color: '#116b76', lighting: { ambient: .22, diffuse: 0, specular: 0 }
    }, { type: 'scatter3d', mode: 'lines', x: [-.3, .4, -.1], y: [-.1, -.15, .2], z: [-.7, -.5, .95],
      line: { width: 9, color: '#da233d' }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { eye: { x: .02, y: .02, z: .36 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: nearAxis, yaxis: nearAxis, zaxis: nearAxis
    } });
    await t.comparePlotExports(w, 'Lighting on a camera-clipped mesh', 500, 400, .4);
  } finally {
    t.app.window_manager.close('gui-near-axis-walls');
  }
});

webTest(tests, '3D marker highlights and perspective scaling survive PNG and SVG export', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-marker-highlight', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  var red = async (url, width, height) => {
    var data = await t.plotImagePixels(w, url, width, height);
    var count = 0;
    for(let i = 0; i < data.length; i += 4) {
      count += Number(data[i] > 200 && data[i + 1] < 40 && data[i + 2] < 40);
    }
    return count;
  };
  try {
    var axis = { visible: false, range: [-1, 1] };
    await w.Plotly.newPlot(cont, [{ type: 'scatter3d', mode: 'markers',
      x: [-.45, .34], y: [-.4, .5], z: [-.3, .25], marker: { size: 18, color: ['#0000ff', '#ff0000'] }
    }], { width: 500, height: 400, scene: { xaxis: axis, yaxis: axis, zaxis: axis } });
    var marker = cont._fullLayout.scene._scene.traces[cont._fullData[0].uid].scatterPlot;
    marker.highlightScale = 2.4;
    for(const [width, height] of [[500, 400], [650, 510]]) {
      marker.highlight(null);
      var baseline = await red(await w.plot.toImage('png', [width, height]), width, height);
      marker.highlight({ index: 1 });
      var svg = await t.comparePlotExports(w, 'Highlighted marker', width, height, .1);
      t.ok(await red(svg, width, height) > 2 * baseline, 'SVG includes the enlarged marker');
    }
    await w.Plotly.restyle(cont, { 'marker.size': .3 });
    marker = cont._fullLayout.scene._scene.traces[cont._fullData[0].uid].scatterPlot;
    marker.highlight(null);
    marker.useOrtho = false;
    for(const [width, height] of [[500, 400], [650, 510]]) {
      var perspectiveSvg = await t.comparePlotExports(w, 'Depth-scaled marker', width, height, .1);
      t.ok(await red(perspectiveSvg, width, height) > 1000, 'SVG includes the depth-scaled marker');
    }
    await w.Plotly.newPlot(cont, [{ type: 'mesh3d', x: [-.9, .9, 0], y: [-.8, -.8, .9], z: [0, 0, 0],
      i: [0], j: [1], k: [2], color: '#15629a', lighting: { ambient: 1, diffuse: 0, specular: 0 }
    }, { type: 'scatter3d', mode: 'markers', x: [0], y: [0], z: [0], marker: { size: 25, color: '#ee240c' }
    }], { width: 500, height: 400, showlegend: false, scene: { aspectmode: 'cube',
      camera: { projection: { type: 'orthographic' }, eye: { x: 0, y: 0, z: 2.75 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } });
    var coplanarSvg = await t.comparePlotExports(w, 'Coplanar opaque marker', 500, 400, .2);
    t.ok(await red(coplanarSvg, 500, 400) > 1000, 'later opaque marker remains visible at the same depth');
    var tiltedMesh = (x, y, color) => ({ type: 'mesh3d', x, y, z: x.map(value => value * -.5),
      i: [0], j: [1], k: [2], color, lighting: { ambient: 1, diffuse: 0, specular: 0 } });
    await w.Plotly.newPlot(cont, [
      tiltedMesh([-.875, .875, -.875], [-.875, -.875, .875], '#15629a'),
      tiltedMesh([-.25, .875, -.25], [-.875, -.875, .25], '#ee240c')
    ], { width: 500, height: 400, showlegend: false, scene: { aspectmode: 'cube',
      camera: { projection: { type: 'orthographic' }, eye: { x: 0, y: 0, z: 2.75 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: axis, yaxis: axis, zaxis: axis
    } });
    await t.comparePlotExports(w, 'Coplanar tilted meshes', 500, 400, .2);
    var lighting = { ambient: 1, diffuse: 0, specular: 0 };
    var patches = { type: 'mesh3d', x: [], y: [], z: [], i: [], j: [], k: [], color: '#454545', lighting };
    for(let i = 0; i < 180; i++) {
      var x = -.95 + i * .01;
      var z = .35 * x * x;
      patches.x.push(x, x + .003, x);
      patches.y.push(-.78, -.78, -.74);
      patches.z.push(z, z + .0021 * x, z);
      patches.i.push(3 * i);
      patches.j.push(3 * i + 1);
      patches.k.push(3 * i + 2);
    }
    var plane = { type: 'mesh3d', x: [-.75, .8, -.75], y: [-.25, -.25, .85], z: [.2, .2, .2],
      i: [0], j: [1], k: [2], color: '#15629a', lighting };
    await w.Plotly.newPlot(cont, [patches, plane, { ...plane, z: [-.8, .8, -.8], color: '#ee240c' }],
      { width: 500, height: 400, showlegend: false, scene: { aspectmode: 'cube',
        camera: { projection: { type: 'orthographic' }, eye: { x: 0, y: 0, z: 2.75 }, up: { x: 0, y: 1, z: 0 } },
        xaxis: axis, yaxis: axis, zaxis: axis
      } });
    await t.comparePlotExports(w, 'Intersecting meshes with an unbalanced plane tree', 500, 400, .12);
  } finally {
    t.app.window_manager.close('gui-marker-highlight');
  }
});

webTest(tests, 'clipped solid and dashed 3D lines preserve their SVG geometry', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-line-pixel-comparison', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  var compare = (label, width, height, limit) => t.comparePlotExports(w, label, width, height, limit);
  try {
    await w.Plotly.newPlot(cont, [{ type: 'scatter3d', mode: 'lines', connectgaps: true,
      x: [-2.9, -.7, -.3, -.5, null, 0, .25, .53, .7, .9],
      y: [-.6, .5, -.3, .8, null, -.58, .55, -.3, .8, -.55],
      z: [-.4, -.2, 0, .3, null, .2, .4, -.3, .05, .6], line: { color: '#115781', width: 26 }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube',
      xaxis: { range: [-1, 1] }, yaxis: { range: [-1, 1] }, zaxis: { range: [-1, 1] }
    } });
    var stripUrl = await compare('Clipped thick line', 500, 400);
    var stripDoc = new w.DOMParser().parseFromString(decodeURIComponent(stripUrl.slice(stripUrl.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(stripDoc.querySelector('[data-jslab-solid-faces][data-jslab-scatter-line]'),
      'clipped line keeps the projected strip geometry and joins');
    await w.Plotly.newPlot(cont, [{ type: 'scatter3d', mode: 'lines',
      x: [-2.9, -.55, -.3, .1, .4, .8], y: [-.7, .65, -.4, .6, -.55, .65], z: [-.4, .5, .3, -.7, .5, .1],
      line: { width: 28, color: [0, .4, .1, .8, .5, 1], coloraxis: 'coloraxis' }
    }], { width: 500, height: 400, coloraxis: { colorscale: 'Portland', reversescale: true, showscale: false },
      scene: { aspectmode: 'cube', camera: { eye: { x: .3, y: .4, z: 2.2 }, up: { x: 0, y: 1, z: 0 } },
        xaxis: { range: [-1, 1] }, yaxis: { range: [-1, 1] }, zaxis: { range: [-1, 1] } }
    });
    var coloredUrl = await compare('Clipped thick line with per-point colors', 500, 400);
    var coloredDoc = new w.DOMParser().parseFromString(decodeURIComponent(coloredUrl.slice(coloredUrl.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(coloredDoc.querySelector('[data-jslab-scatter-line][fill^="url("]'),
      'per-point color gradients fill the clipped line geometry');
    await w.Plotly.restyle(cont, { 'line.dash': 'longdashdot' });
    var dashedUrl = await compare('Clipped dashed line with per-point colors', 500, 400);
    var dashedDoc = new w.DOMParser().parseFromString(decodeURIComponent(dashedUrl.slice(dashedUrl.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(dashedDoc.querySelector('[data-jslab-scatter-line][fill^="url("]'),
      'dash intervals retain the clipped strip geometry and its color gradients');
    await w.Plotly.restyle(cont, { opacity: .4 });
    var alphaUrl = await compare('Clipped translucent dashed line with per-point colors', 500, 400);
    var alphaDoc = new w.DOMParser().parseFromString(decodeURIComponent(alphaUrl.slice(alphaUrl.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(alphaDoc.querySelector('[data-jslab-scatter-line][fill^="url("][opacity="0.4"]'),
      'the clipped strip retains both color gradients and trace opacity');
    await w.Plotly.restyle(cont, { opacity: 1, 'line.color': 'rgba(35,82,160,.35)', 'line.width': 40 });
    var translucentUrl = await compare('Clipped translucent dashed line', 500, 400);
    var translucentDoc = new w.DOMParser().parseFromString(
      decodeURIComponent(translucentUrl.slice(translucentUrl.indexOf(',') + 1)), 'image/svg+xml');
    t.ok(translucentDoc.querySelector('polygon[data-jslab-scatter-line][fill="rgb(100,234,255)"]'),
      'translucent dashes retain the projected strip geometry and framebuffer color');
    await w.Plotly.newPlot(cont, [{ type: 'scatter3d', mode: 'lines', x: [-.95, .95], y: [-.15, .25], z: [-.3, .2],
      line: { width: 55, color: ['rgba(0,0,0,0)', 'rgba(40,110,162,.8)'] }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube',
      camera: { eye: { x: .3, y: .4, z: 2.2 }, up: { x: 0, y: 1, z: 0 } },
      xaxis: { range: [-1, 1] }, yaxis: { range: [-1, 1] }, zaxis: { range: [-1, 1] }
    } });
    var fadeUrl = await compare('Line with a fully transparent endpoint', 500, 400);
    var fadeDoc = new w.DOMParser().parseFromString(decodeURIComponent(fadeUrl.slice(fadeUrl.indexOf(',') + 1)),
      'image/svg+xml');
    t.ok(fadeDoc.querySelector('linearGradient stop[stop-opacity="0"][stop-color^="rgb("]'),
      'fully transparent endpoint uses a valid color on the gradient');
    await w.Plotly.newPlot(cont, [{ type: 'scatter3d', mode: 'markers', x: [-.6, .5], y: [.35, .7], z: [.3, .6],
      error_x: { type: 'data', array: [.45, .3], arrayminus: [.2, .4], symmetric: false,
        color: '#d11b42', width: 12, copy_zstyle: false },
      error_y: { type: 'constant', value: .25, color: '#ab6600', width: 10, copy_zstyle: false },
      error_z: { type: 'constant', value: .2, color: '#007a55', width: 12 }
    }], { width: 500, height: 400, scene: { aspectmode: 'cube',
      xaxis: { range: [-1, 1] }, yaxis: { range: [0, 1] }, zaxis: { range: [0, 1] }
    } });
    await t.comparePlotExports(w, 'Asymmetric 3D error bars and caps', 500, 400);
  } finally {
    t.app.window_manager.close('gui-line-pixel-comparison');
  }
});

webTest(tests, 'mixed Plotly figures retain vector traces when resized', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-figure-mixed', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  var readSvg = async (size = [500, 400]) => {
    var url = await w.plot.toImage('svg', size);
    return new w.DOMParser().parseFromString(decodeURIComponent(url.slice(url.indexOf(',') + 1)), 'image/svg+xml');
  };
  try {
    await w.Plotly.newPlot(cont, [{ type: 'scatter3d', mode: 'lines+markers', x: [0, 1], y: [0, 1], z: [0, 1] },
      { type: 'mesh3d', x: [0, 1, 0], y: [0, 0, 1], z: [0, 0, 0], i: [0], j: [1], k: [2], scene: 'scene2' },
      { x: [0, 1], y: [0, 1], mode: 'lines', type: 'scattergl', line: { width: 4 } },
      { theta: [5, 80, 200], r: [.65, .7, .55], mode: 'markers', type: 'scatterpolargl' }], {
      width: 500, height: 400, scene: { domain: { x: [0, .48], y: [.5, 1] } },
      scene2: { domain: { x: [.52, 1], y: [.5, 1] } },
      xaxis: { domain: [0, .48] }, yaxis: { domain: [0, .4] },
      polar: { domain: { x: [.52, 1], y: [0, .4] } }
    });
    var mixed = await readSvg();
    t.eq(mixed.querySelectorAll('[data-jslab-vector-3d]').length, 2);
    t.ok(mixed.querySelector('.scatterlayer path'), 'mixed figure retains its 2D trace');
    var line = mixed.querySelector('.scatterlayer path.js-line').getAttribute('d');
    var [line_x, line_y] = line.match(/^M([^,]+),([^L]+)/).slice(1).map(Number);
    var { xaxis, yaxis } = cont._fullLayout;
    t.ok(Math.abs(Math.hypot(line_x - xaxis.d2p(0), line_y - yaxis.d2p(0)) - 2) < .02,
      'the solid WebGL line retains its endpoint cap');
    t.ok(mixed.querySelector('.polarlayer .scatterlayer path'), 'mixed figure retains its polar trace');
    t.ok(!mixed.querySelector('image, foreignObject, parsererror'), 'mixed figure is raster-free');
    var scatter = cont._fullLayout.scene._scene.traces[cont._fullData[0].uid].scatterPlot;
    scatter.highlightScale = 2.4;
    scatter.highlight({ index: 1 });
    var resizedUri = await t.comparePlotExports(w, 'Resized mixed figure with a highlighted 3D marker', 640, 520, .9, .02);
    var resized = new w.DOMParser().parseFromString(decodeURIComponent(resizedUri.slice(resizedUri.indexOf(',') + 1)),
      'image/svg+xml');
    t.eq(resized.documentElement.getAttribute('viewBox'), '0 0 640 520');
    t.eq(resized.querySelectorAll('[data-jslab-vector-3d]').length, 2);
    t.ok(!resized.querySelector('image, foreignObject, parsererror'), 'resized scenes remain raster-free');
    await w.Plotly.restyle(cont, { visible: 'legendonly' }, [1]);
    var hidden = await readSvg();
    var viewports = hidden.querySelectorAll('[data-jslab-vector-3d]');
    t.eq(viewports.length, 2);
    t.eq(viewports[1].querySelector('[data-jslab-geometry]').childElementCount, 0);
    t.eq(cont._fullLayout.width, 500);
    t.eq(cont._fullLayout.height, 400);
    t.eq(cont.data[2].type, 'scattergl');
    t.eq(cont.data[3].type, 'scatterpolargl');
  } finally {
    t.app.window_manager.close('gui-figure-mixed');
  }
});

webTest(tests, 'Mixed 3D figures preserve WebGL dash lengths in SVG', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-mixed-gl-dashes', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  try {
    var data = [{ type: 'scatter3d', mode: 'markers', x: [0, 1], y: [0, 1], z: [0, 1] }];
    for(const [index, dash] of ['dot', 'dash', 'dashdot', 'longdash'].entries()) {
      data.push({ type: 'scattergl', mode: 'lines', x: [0, 1], y: [index, index],
        line: { color: '#ff0000', width: 4, dash } });
    }
    await w.Plotly.newPlot(w.plot.plot_cont, data, { width: 680, height: 480,
      margin: { t: 40, b: 40, l: 30, r: 30 }, showlegend: false,
      scene: { domain: { x: [0, .25], y: [0, 1] } },
      xaxis: { domain: [.3, 1], range: [-.1, 1.1], visible: false },
      yaxis: { range: [-.5, 3.5], visible: false }
    });
    var svg = await t.comparePlotExports(w, 'Mixed figure with horizontal WebGL dashes', 680, 480, .35, .008);
    var doc = new w.DOMParser().parseFromString(decodeURIComponent(svg.slice(svg.indexOf(',') + 1)), 'image/svg+xml');
    var patterns = [...doc.querySelectorAll('path.js-line')].map(path => path.style.strokeDasharray.match(/[\d.]+/g).join(','));
    t.eq(patterns.join('|'), '4,4|16,4|16,4,4,4|32,4');
    t.ok([...doc.querySelectorAll('path.js-line')].every(path => path.style.strokeDashoffset),
      'each straight line retains its screen-space dash phase');
    var start = Number(doc.querySelector('path.js-line').getAttribute('d').match(/^M([^,]+),/)[1]);
    var x_axis = w.plot.plot_cont._fullLayout.xaxis;
    t.ok(Math.abs(start - (x_axis.d2p(0) - 2)) < .02, 'the export preserves the WebGL half-width endpoint cap');
    await w.Plotly.restyle(w.plot.plot_cont, {
      x: [[0, 1], [1, 0], [0, 1], [1, 0]], y: [[-.2, .2], [.8, 1.2], [1.8, 2.2], [2.8, 3.2]]
    }, [1, 2, 3, 4]);
    await t.comparePlotExports(w, 'Mixed figure with diagonal WebGL dashes', 680, 480, .45, .01);
    await w.Plotly.restyle(w.plot.plot_cont, {
      x: [[0, .5, 1], [1, .5, 0], [0, .5, 1], [1, .5, 0]],
      y: [0, 1, 2, 3].map(index => [index - .2, index + .22, index - .08])
    }, [1, 2, 3, 4]);
    var bentSvg = await t.comparePlotExports(w, 'Mixed figure with bent WebGL dashes', 680, 480, .45, .01);
    var bentDoc = new w.DOMParser().parseFromString(decodeURIComponent(bentSvg.slice(bentSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.eq(bentDoc.querySelectorAll('path.js-line').length, 8);
    await w.Plotly.restyle(w.plot.plot_cont, { 'line.shape': ['hv', 'vh', 'hvh', 'vhv'] }, [1, 2, 3, 4]);
    var stepSvg = await t.comparePlotExports(w, 'Mixed figure with stepped WebGL dashes', 680, 480, .4, .01);
    var stepDoc = new w.DOMParser().parseFromString(decodeURIComponent(stepSvg.slice(stepSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.eq(stepDoc.querySelectorAll('path.js-line').length, 19);
    var polar = ['dot', 'dash', 'dashdot', 'longdash'].map((dash, index) => ({
      type: 'scatterpolargl', mode: 'lines', theta: [45, 70, 95],
      r: [.9 - index * .15, .85 - index * .15, .9 - index * .15],
      line: { color: '#ff0000', width: 4, dash }
    }));
    await w.Plotly.newPlot(w.plot.plot_cont, [data[0], ...polar], { width: 680, height: 480,
      margin: { t: 40, b: 40, l: 30, r: 30 }, showlegend: false,
      scene: { domain: { x: [0, .25], y: [0, 1] } },
      polar: { domain: { x: [.3, 1], y: [0, 1] }, radialaxis: { range: [0, 1], visible: false },
        angularaxis: { visible: false } }
    });
    var polarSvg = await t.comparePlotExports(w, 'Mixed figure with polar WebGL dashes', 680, 480, .4, .01);
    var polarDoc = new w.DOMParser().parseFromString(decodeURIComponent(polarSvg.slice(polarSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.eq(polarDoc.querySelectorAll('.polarlayer path.js-line').length, 8);
  } finally {
    t.app.window_manager.close('gui-mixed-gl-dashes');
  }
});

webTest(tests, 'Mixed 3D figures retain dotted WebGL markers in SVG', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-mixed-gl-glyphs', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  try {
    await w.Plotly.newPlot(w.plot.plot_cont, [
      { type: 'scatter3d', mode: 'markers', x: [0, 1], y: [0, 1], z: [0, 1] },
      { type: 'scattergl', mode: 'markers', x: [0, 1], y: [0, 0], marker: {
        symbol: ['circle-dot', 'circle-open-dot'], color: '#d13b56', size: 31, line: { color: '#192c90', width: 3 }
      } }
    ], { width: 680, height: 480, showlegend: false, scene: { domain: { x: [0, .25], y: [0, 1] } },
      xaxis: { domain: [.3, 1], range: [-.3, 1.3] }, yaxis: { range: [-.5, .5] }
    });
    var svg = await t.comparePlotExports(w, 'Mixed figure with dotted WebGL markers', 680, 480, .4, .006);
    var doc = new w.DOMParser().parseFromString(decodeURIComponent(svg.slice(svg.indexOf(',') + 1)), 'image/svg+xml');
    var markers = [...doc.querySelectorAll('g.points path.point')];
    t.eq(markers.length, 2);
    t.ok(markers.every(marker => marker.getAttribute('d').startsWith('M17.05,0A') &&
      marker.getAttribute('d').includes('M0.775,0A')), 'both markers use the WebGL outer and inner radii');
    await w.Plotly.restyle(w.plot.plot_cont, { 'marker.symbol': [['square-dot', 'diamond-open-dot']] }, [1]);
    var polygons = await t.comparePlotExports(w, 'Mixed figure with dotted WebGL polygons', 680, 480, .4, .006);
    var polygonDoc = new w.DOMParser().parseFromString(decodeURIComponent(polygons.slice(polygons.indexOf(',') + 1)),
      'image/svg+xml');
    var paths = [...polygonDoc.querySelectorAll('g.points path.point')].map(marker => marker.getAttribute('d'));
    t.eq(paths.length, 2);
    t.ok(paths[0].startsWith('M17.05,17.05H') && paths[1].startsWith('M22.165,0L') &&
      paths.every(path => path.includes('M0.775,0A')), 'polygon markers use the enlarged outline and circular center');
    await w.Plotly.restyle(w.plot.plot_cont, { 'marker.size': [[14, 46]] }, [1]);
    var sizes = await t.comparePlotExports(w, 'Mixed figure with variable-sized dotted markers', 680, 480, .4, .006);
    var sizesDoc = new w.DOMParser().parseFromString(decodeURIComponent(sizes.slice(sizes.indexOf(',') + 1)),
      'image/svg+xml');
    var sizedPaths = [...sizesDoc.querySelectorAll('g.points path.point')].map(marker => marker.getAttribute('d'));
    t.eq(sizedPaths.length, 2);
    t.ok(sizedPaths[0].includes('M0.35,0A') && sizedPaths[1].includes('M1.15,0A'),
      'each circular dot scales with its own marker');
    await w.Plotly.restyle(w.plot.plot_cont, { 'marker.size': [[100, 900]],
      'marker.sizemode': 'area', 'marker.sizeref': 1, 'marker.sizemin': 15 }, [1]);
    var bubbles = await t.comparePlotExports(w, 'Mixed figure with area-scaled WebGL bubbles', 680, 480, .4, .006);
    var bubblesDoc = new w.DOMParser().parseFromString(decodeURIComponent(bubbles.slice(bubbles.indexOf(',') + 1)),
      'image/svg+xml');
    var bubblePaths = [...bubblesDoc.querySelectorAll('g.points path.point')].map(marker => marker.getAttribute('d'));
    t.eq(bubblePaths.length, 2);
    t.ok(bubblePaths[0].includes('M0.375,0A') && bubblePaths[1].includes('M0.75,0A'),
      'bubble diameters preserve both the WebGL area conversion and the minimum size');
    await w.Plotly.restyle(w.plot.plot_cont, { 'marker.size': [[9, 49]], 'marker.sizemin': 0 }, [1]);
    await w.Plotly.relayout(w.plot.plot_cont, { showlegend: true });
    var legend = [...w.plot.plot_cont.querySelectorAll('.legend path.scatterpts')]
      .find(marker => marker.__data__?.trace?.index === 1);
    var legendSvg = await t.comparePlotExports(w, 'Mixed figure with small bubbles and a legend', 680, 480, .4, .006);
    var legendDoc = new w.DOMParser().parseFromString(decodeURIComponent(legendSvg.slice(legendSvg.indexOf(',') + 1)),
      'image/svg+xml');
    t.eq([...legendDoc.querySelectorAll('.legend path.scatterpts')].at(-1).getAttribute('d'), legend.getAttribute('d'));
  } finally {
    t.app.window_manager.close('gui-mixed-gl-glyphs');
  }
});

webTest(tests, 'overlapping Plotly 3D scenes use separate vector gradients', async function() {
  var t = GUI;
  var opened = t.app.windows.openManagedWindow('gui-figure-overlap', 'figure.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow;
  w.plot.setCont();
  var cont = w.plot.plot_cont;
  try {
    var gradientMesh = {
      type: 'mesh3d', i: [0], j: [1], k: [2], x: [-1, 1, 0], y: [-1, -1, 1], z: [0, 0, 0],
      intensity: [0, 1, .5], colorscale: [[0, '#18447a'], [1, '#3aa9f2']]
    };
    await w.Plotly.newPlot(cont, [gradientMesh, { ...gradientMesh, scene: 'scene2',
      colorscale: [[0, '#a82513'], [1, '#f9be56']] }], {
      width: 500, height: 400,
      scene: { domain: { x: [0, 1], y: [0, 1] } },
      scene2: { domain: { x: [0, .5], y: [.5, 1] } }
    });
    var url = await w.plot.toImage('svg', [500, 400]);
    var overlapping = new w.DOMParser().parseFromString(decodeURIComponent(url.slice(url.indexOf(',') + 1)), 'image/svg+xml');
    var sceneGradients = [...overlapping.querySelectorAll('[data-jslab-vector-3d] linearGradient[id]')];
    var gradientIds = sceneGradients.map(gradient => gradient.id);
    t.ok(gradientIds.some(id => id.startsWith('jslab-vector-scene-')));
    t.ok(gradientIds.some(id => id.startsWith('jslab-vector-scene2-')));
    t.eq(new Set(gradientIds).size, gradientIds.length, 'overlapping scenes have independent gradient references');
    var scene = cont._fullLayout.scene2._scene;
    scene.setViewport({ camera: { ...scene.getCamera(), eye: { x: 2, y: .4, z: 1 } },
      aspectratio: scene.glplot.getAspectratio() });
    var scene_layout = { ...cont.layout.scene2, camera: scene.getCamera() };
    t.ok(cont.layout.scene2.camera?.eye?.x !== scene_layout.camera.eye.x);
    var png = await w.plot.toImage('png', [640, 520]);
    var expected = await w.Plotly.toImage({ data: cont.data, config: cont._context,
      layout: { ...cont.layout, scene: { ...cont.layout.scene, camera: cont._fullLayout.scene._scene.getCamera() },
        scene2: scene_layout } }, { format: 'png', width: 640, height: 520 });
    t.ok(png === expected, 'resized PNG captures the live camera before Plotly writes it to the input layout');
    var resizedBefore = await w.plot.toImage('svg', [640, 520]);
    var before = await w.plot.toImage('svg', [500, 400]);
    var resizedAfter = await w.plot.toImage('svg', [640, 520]);
    var nativeToImage = w.Plotly.toImage;
    var during;
    try {
      w.Plotly.toImage = async (...args) => {
        var svg = await nativeToImage(...args);
        scene.setViewport({ camera: { ...scene.getCamera(), eye: { x: .2, y: 2, z: 1 } },
          aspectratio: scene.glplot.getAspectratio() });
        scene.glplot.redraw();
        return svg;
      };
      during = await w.plot.toImage('svg', [500, 400]);
    } finally {
      w.Plotly.toImage = nativeToImage;
    }
    var geometry = url => {
      var svg = new w.DOMParser().parseFromString(decodeURIComponent(url.slice(url.indexOf(',') + 1)), 'image/svg+xml');
      return svg.querySelector('[data-jslab-vector-3d] + [data-jslab-vector-3d]').outerHTML;
    };
    t.ok(geometry(resizedBefore) === geometry(resizedAfter),
      'resized exports use the same projected camera after exporting another size');
    t.ok(geometry(during) === geometry(before), 'SVG geometry is captured before the asynchronous native snapshot');
    var liveWidth = cont._fullLayout._size.w;
    cont.layout.margin = { l: 130, r: 105, t: 142, b: 85 };
    var remargined = await w.plot.toImage('svg', [500, 400]);
    var remarginedSvg = new w.DOMParser().parseFromString(
      decodeURIComponent(remargined.slice(remargined.indexOf(',') + 1)), 'image/svg+xml');
    var viewport = remarginedSvg.querySelector('[data-jslab-vector-3d]');
    t.ok(Number(viewport.getAttribute('width')) < liveWidth && !viewport.hasAttribute('viewBox'),
      'changed export margins reproject the scene at the allocated dimensions');
    t.eq(cont._fullLayout._size.w, liveWidth);
  } finally {
    t.app.window_manager.close('gui-figure-overlap');
  }
});

webTest(tests, 'web serial terminal dialogs, settings, toggles and generated UI tabs work', async function() {
  var t = GUI, opened = t.app.windows.openManagedWindow('gui-serial', 'serial_terminal.html');
  await opened.ready;
  var w = opened.win.iframe.contentWindow, doc = w.document;
  async function script(src) {
    await new Promise((resolve, reject) => {
      var el = doc.createElement('script');
      el.src = src;
      el.onload = resolve;
      el.onerror = reject;
      doc.head.appendChild(el);
    });
  }
  await script(location.origin + '/js/other-shared/terminal-buffer.js');
  await script(location.origin + '/js/windows/serial-terminal.js');
  var terminal = w.terminal;
  t.ok(terminal);
  for(var selector of ['#timestamp', '#autoscroll']) {
    var before = doc.querySelector(selector).className;
    t.click(selector, doc);
    t.ok(doc.querySelector(selector).className !== before);
  }
  for(var name of ['settings', 'log']) {
    t.click('#' + name, doc);
    t.eq(t.visible('#' + name + '-dialog', doc), true);
    t.click('#' + name + '-dialog .options-close', doc);
    t.eq(t.visible('#' + name + '-dialog', doc), false);
    t.click('#' + name, doc);
    t.key(doc.getElementById(name + '-dialog'), 'Escape');
    t.eq(t.visible('#' + name + '-dialog', doc), false);
  }
  t.input('#N-messages-max', '2', doc);
  t.click('#settings-dialog .change-settings', doc);
  t.eq(terminal.N_messages_max, 5);
  t.click('#write-timestamps', doc);
  t.eq(terminal.write_timestamps, false);
  terminal.addMessage('', 'temporary');
  t.click('#clear', doc);
  t.eq(doc.getElementById('messages-container').textContent.includes('temporary'), false);
  t.click('#to-bottom', doc);
  t.eq(doc.activeElement, doc.getElementById('message-input'));
  t.key(doc.getElementById('message-input'), 'x');
  var group = doc.createElement('div');
  group.className = 'ui tabs-cont';
  group.innerHTML = '<button class="ui tab-name">One</button><button class="ui tab-name">Two</button><div class="ui tab">First</div><div class="ui tab">Second</div>';
  doc.body.appendChild(group);
  await script(location.origin + '/js/windows/ui.js');
  group.querySelectorAll('button')[1].click();
  t.eq(group.querySelectorAll('.tab')[1].style.display, 'block');
  t.app.window_manager.close('gui-serial');
});
webTest(tests, 'Web prints a managed window to real PDF bytes', async () => {
  const output = await GUI.app.sandbox_api.evaluate(`var print_window = openWindow('blank.html');
    await getWindow(print_window).ready;
    getWindow(print_window).context.document.body.innerHTML = '<h1>JSLAB window PDF</h1><p>Browser print integration</p>';
    var window_pdf = await printWindowToPdf(print_window, { pageSize: 'A4' });
    var signature = new TextDecoder().decode(window_pdf.slice(0, 5));
    closeWindow(print_window);
    signature;`);
  GUI.eq(output.value, '%PDF-');
});

webTest(tests, 'Web sandbox uses the browser microphone and camera', async () => {
  const app = GUI.app;
  const source = `var camera = (await getWebcams())[0]; var microphone = (await getMicrophones())[0];
    var preview = await webcam(camera.deviceId); await showAudioWaveform(microphone.deviceId, 512);
    var sample = await new Promise(async resolve => {
      var capture = await webcamCapture({ id: camera.deviceId }, (bytes, width, height) => {
        resolve(bytes.byteLength === width * height * 4);
        capture.stop();
      });
    });
    JSON.stringify([camera.kind, microphone.kind, preview.dom.readyState >= 2, sample]);`;
  const output = await app.sandbox_api.evaluate(source);
  GUI.eq(output.value, '["videoinput","audioinput",true,true]');
  const client = app.worker_debugger;
  const tracks = [...client.media.streams].flatMap(stream => stream.getTracks());
  GUI.ok(tracks.some(track => track.kind === 'video' && track.readyState === 'live'));
  GUI.ok(tracks.some(track => track.kind === 'audio' && track.readyState === 'live'));
  const choose = app.files._showSaveDialog;
  const save = app.files._saveLocalFile;
  let recording;
  try {
    app.files._showSaveDialog = async () => ({ filePath: 'capture.webm' });
    app.files._saveLocalFile = async (_target, blob) => {
      recording = new Uint8Array(await blob.arrayBuffer());
      return true;
    };
    const started = await app.sandbox_api.evaluate(`var recording_test = await startVideoRecording(camera.deviceId,
      { type: 'webcam', mimeType: 'video/webm' }); recording_test.state;`);
    GUI.eq(started.value, 'recording');
    await GUI.wait(() => [...client.media.recordings.values()].some(item => item.chunks.some(chunk => chunk.size > 0)),
      'the camera recorder produces video');
    const stopped = await app.sandbox_api.evaluate('await recording_test.stopRecording(); recording_test.state;');
    GUI.eq(stopped.value, 'inactive');
    GUI.ok(recording?.length > 4, 'the saved recording contains video');
    GUI.eq(Array.from(recording.slice(0, 4)).join(','), '26,69,223,163');
  } finally {
    app.files._showSaveDialog = choose;
    app.files._saveLocalFile = save;
  }
  await app.sandbox_api.evaluate('resetSandbox();');
  GUI.ok(tracks.every(track => track.readyState === 'ended'));
});

exports.MODULE_TESTS = tests;
