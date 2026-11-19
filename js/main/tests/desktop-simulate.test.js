/**
 * @file Simulate integration through the actual desktop command window and solver
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Shared observations for real Simulate animation checks.
 */
class PRDC_JSLAB_DESKTOP_SIMULATE_TEST_HELPER {
  /**
   * Reads the animation slider in the scientific renderer.
   * @returns {number} Current animation index.
   */
  static animationIndex() {
    var figure = Object.values(jsl.inter.figures.open_figures).find(item =>
      item.dom && item.dom.querySelector('input[type="range"]'));
    return Number(figure.dom.querySelector('input[type="range"]').value);
  }

  /**
   * Samples actual playback ticks so a slow render between samples does not skew timing.
   * @param {number} minimum_ms Minimum elapsed time between samples.
   * @returns {Promise<Object[]>} Simulation and monotonic times for two ticks.
   */
  static playbackSamples(minimum_ms) {
    const figure = Object.values(jsl.inter.figures.open_figures).find(item => item._animation_controls);
    const controls = figure._animation_controls;
    const clock = figure.context.performance;
    const time = jsl.context.simulation.time;
    const duration = time[time.length - 1] - time[0];
    const tick = controls._tick;
    return new Promise((resolve, reject) => {
      let first;
      const timer = setTimeout(() => {
        controls._tick = tick;
        reject(Error('The animation did not produce enough playback samples.'));
      }, 8000);
      controls._tick = function() {
        const wall = clock.now();
        tick.call(this);
        const sample = { time: time[this.index], duration, wall };
        if(!first) first = sample;
        else if(wall - first.wall >= minimum_ms) {
          clearTimeout(timer);
          controls._tick = tick;
          resolve([first, sample]);
        }
      };
    });
  }

  /**
   * Measures native geometry and completed Plotly updates in the actual figure.
   * @returns {Promise<Object>} Frame timings and peak renderer concurrency.
   */
  static async profileAnimation() {
    var figure = Object.values(jsl.inter.figures.open_figures).find(item =>
      item.dom && item.dom.querySelector('.ui-animation-speed'));
    var context = figure.context;
    var clock = context.performance;
    var module = await jsl.inter.env._scene_module;
    var Scene = module.PRDC_OMJSL_SCENE;
    var geometry_method = context.plot.mesh_animation ? 'transforms' : 'frame';
    var frame = Scene.prototype[geometry_method];
    var restyle = context.Plotly.restyle;
    var transform_update = context.plot.updateMeshTransforms;
    var geometry = [];
    var drawing = [];
    var conversion = [];
    var mesh_update = [];
    var mesh_draw = [];
    var gpu_draw = [];
    var restores = [];
    var scene = context.plot.plot_cont._fullLayout.scene._scene;
    var gl = scene.glplot.gl;
    var debug = gl.getExtension('WEBGL_debug_renderer_info');
    var renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    Object.values(scene.traces).forEach(function(trace) {
      for(const [target, method, values] of [[trace, 'update', conversion],
        [trace.mesh, 'update', mesh_update], [trace.mesh, 'draw', mesh_draw]]) {
        const original = target[method];
        target[method] = function(...args) {
          var started = clock.now();
          try {
            return original.apply(this, args);
          } finally {
            values.push(clock.now() - started);
          }
        };
        restores.push(() => { target[method] = original; });
      }
    });
    var active = 0;
    var peak = 0;
    var play = figure.dom.querySelector('input[type="range"]').previousElementSibling;
    Scene.prototype[geometry_method] = function(...args) {
      var started = clock.now();
      try {
        return frame.apply(this, args);
      } finally {
        geometry.push(clock.now() - started);
      }
    };
    context.plot.updateMeshTransforms = function(...args) {
      var started = clock.now();
      try {
        return transform_update.apply(this, args);
      } finally {
        drawing.push(clock.now() - started);
      }
    };
    context.Plotly.restyle = async function(...args) {
      var started = clock.now();
      peak = Math.max(peak, ++active);
      try {
        return await restyle.apply(this, args);
      } finally {
        active--;
        drawing.push(clock.now() - started);
      }
    };
    var slider = figure.dom.querySelector('input[type="range"]');
    var speed = figure.dom.querySelector('.ui-animation-speed');
    speed.value = '1';
    speed.dispatchEvent(new context.Event('change'));
    var started = clock.now();
    try {
      if(play.textContent != '\u25b6') {
        play.click();
      }
      while(context.plot.drawing) {
        await new Promise(resolve => context.setTimeout(resolve, 10));
      }
      for(var index = 0; index < 35; index++) {
        if(index == 5) {
          geometry.length = drawing.length = conversion.length = mesh_update.length = mesh_draw.length = gpu_draw.length = 0;
        }
        var render_started = clock.now();
        slider.value = String(Math.round(index * Number(slider.max) / 35));
        slider.dispatchEvent(new context.Event('input'));
        await context.plot._flushUpdates();
        gl.finish();
        gpu_draw.push(clock.now() - render_started);
      }
    } finally {
      Scene.prototype[geometry_method] = frame;
      context.Plotly.restyle = restyle;
      context.plot.updateMeshTransforms = transform_update;
      restores.forEach(restore => restore());
    }
    var summarize = values => {
      values.sort((a, b) => a - b);
      return { count: values.length, mean_ms: values.reduce((sum, value) => sum + value, 0) / (values.length || 1),
        p95_ms: values[Math.floor((values.length - 1) * .95)] || 0, max_ms: values.at(-1) || 0 };
    };
    return { elapsed_ms: clock.now() - started, geometry: summarize(geometry), drawing: summarize(drawing),
      conversion: summarize(conversion), mesh_update: summarize(mesh_update), renderer: renderer,
      mesh_draw: summarize(mesh_draw),
      gpu_draw: summarize(gpu_draw), rigid: !!context.plot.mesh_animation,
      peak_drawing: peak, traces: context.plot.plot_cont.data.length,
      vertices: context.plot.plot_cont.data.reduce((sum, trace) => sum + trace.x.length, 0),
      triangles: context.plot.plot_cont.data.reduce((sum, trace) => sum + trace.i.length, 0) };
  }
}


const fs = require('fs');
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_GUI_TEST_BROWSER } = require('../../dev/gui-test-browser');
var tests = new PRDC_JSLAB_TESTS();
if(!globalThis.gui_desktop) {
  exports.MODULE_TESTS = tests;
  return;
}

tests.add('desktop Simulate waits for a .jslmo file before creating its window', async function(assert) {
  const targets = async () => (await fetch('http://127.0.0.1:' + gui_desktop_port + '/json/list')).json();
  const simulateTarget = async () => (await targets()).find(item => item.type === 'page' && item.url.endsWith('/simulate.html'));
  assert.equal(await simulateTarget(), undefined);
  const project = path.join(gui_desktop_profile, 'on-demand.jslmo');
  fs.writeFileSync(project, JSON.stringify({ format: 'JSLAB Simulate', version: 1,
    source: 'model OnDemand\nend OnDemand;' }));
  await gui_desktop.main.evaluate(project => {
    const list = document.createElement('ul');
    win_main.file_browser.addFileBrowserItem(project, { isDirectory: () => false }, list);
    document.getElementById('file-browser').append(list);
    list.firstElementChild.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  }, project);
  let target;
  for(let attempt = 0; attempt < 120 && !target; attempt++) {
    target = await simulateTarget();
    if(!target) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(target, 'Simulate opens after the file browser opens a .jslmo file');
  const client = new PRDC_JSLAB_GUI_TEST_BROWSER();
  await client.connect(target.webSocketDebuggerUrl);
  try {
    await client.waitFor(project => typeof win_simulate !== 'undefined' && win_simulate.file_path === project,
      'Simulate opened the selected project', 15000, project);
    assert.ok(await client.evaluate(() => win_simulate.editor.getValue().includes('model OnDemand')));
    await client.evaluate(() => {
      document.getElementById('simulate-stop-time').value = '45';
      document.getElementById('win-close').click();
    });
    await client.waitFor(() => !document.getElementById('close-dialog-cont').hidden, 'Simulate intercepts its window close');
    await client.evaluate(() => document.getElementById('close-dialog-cancel').click());
    await client.waitFor(() => document.getElementById('close-dialog-cont').hidden, 'Simulate cancels window close');
    await gui_desktop.main.evaluate(() => win_main.platform.host.send('MainProcess', 'focus-win'));
    await gui_desktop.main.waitFor(async () => (await win_main.platform.host.invoke('JSLAB_DESKTOP_GUI_TEST_FOREGROUND'))
      .endsWith('/main.html'), 'Command Window activation');
    await gui_desktop.main.evaluate(() => win_main.close());
    await client.waitFor(() => !document.getElementById('close-dialog-cont').hidden, 'Simulate intercepts application close');
    await gui_desktop.main.waitFor(async () => (await win_main.platform.host.invoke('JSLAB_DESKTOP_GUI_TEST_FOREGROUND'))
      .endsWith('/simulate.html'), 'Simulate requests foreground activation');
    await client.evaluate(() => document.getElementById('close-dialog-cancel').click());
    await client.waitFor(() => document.getElementById('close-dialog-cont').hidden, 'Simulate cancels application close');
    assert.equal(await client.evaluate(() => document.getElementById('simulate-stop-time').value), '45');
    await client.evaluate(() => document.getElementById('win-close').click());
    await client.waitFor(() => !document.getElementById('close-dialog-cont').hidden, 'Simulate asks again before discarding edits');
    await client.evaluate(() => setTimeout(() => document.getElementById('close-dialog-discard').click(), 0));
    for(let attempt = 0; attempt < 40 && await simulateTarget(); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.equal(await simulateTarget(), undefined);
  } finally {
    await client.close();
  }
}, { tags: ['gui', 'electron', 'integration'], timeout_ms: 35000 });

tests.add('desktop Simulate runs the shipped 6-DOF model through real windows and publishes workspace signals', async function(assert) {
  var filename = path.join(app_path, 'examples/resources/simulate-6dof.jslmo');
  await gui_desktop.main.evaluate(filename => {
    win_main.command_window.code_input.setValue('await simulate(' + JSON.stringify(filename) + ');');
    document.getElementById('command-window-input-submit-cont').click();
  }, filename);
  var deadline = Date.now() + 30000;
  while(Date.now() < deadline && !gui_desktop.simulate) {
    var targets = await (await fetch('http://127.0.0.1:' + gui_desktop_port + '/json/list')).json();
    var target = targets.find(function(item) {
      return item.type == 'page' && item.url.endsWith('/simulate.html');
    });
    if(target) {
      gui_desktop.simulate = new PRDC_JSLAB_GUI_TEST_BROWSER();
      await gui_desktop.simulate.connect(target.webSocketDebuggerUrl);
    } else {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  assert.ok(gui_desktop.simulate, 'Simulate window did not open.');
  await gui_desktop.simulate.waitFor(() => typeof win_simulate != 'undefined' &&
    win_simulate.model && !win_simulate.busy, 'desktop model loaded', 30000);
  await gui_desktop.main.waitFor(() => !win_main.evaluating, 'model opening command completed');
  assert.equal(await gui_desktop.simulate.evaluate(() => !!win_simulate.compiler.worker), false);
  await gui_desktop.simulate.click('#simulate-simulate');
  await gui_desktop.simulate.waitFor(() => !win_simulate.busy && !!win_simulate.result,
    'desktop 6-DOF solver result', 180000);
  var state = await gui_desktop.sandbox.evaluate(() => {
    var result = jsl.context.simulation;
    var names = ['time',
      ...[1, 2, 3, 4, 5, 6].flatMap(index => ['phi', 'w', 'a'].map(field => 'drive' + index + '.' + field)),
      ...[1, 2, 3, 4, 5, 6].map(index => 'leg' + index + '.revolute.tau'),
      ...['v_0', 'a_0', 'z_a', 'w_a'].flatMap(field => [1, 2, 3].map(index => 'M.' + field + '[' + index + ']'))];
    return { samples: result && result.time.length,
      series: Object.fromEntries(names.map(name => [name, Array.from(result && result.variables[name] || [])])) };
  });
  assert.equal(state.samples, 1007);
  for(const [name, values] of Object.entries(state.series)) {
    assert.equal(values.length, 1007, name);
    assert.ok(values.every(Number.isFinite), name);
  }
  var view = await gui_desktop.simulate.evaluate(() => ({
    variables: win_simulate.result.columns.length,
    messages: win_simulate.output.textContent,
    treeComponents: document.querySelectorAll('.simulate-tree-item[data-component]').length,
    diagramComponents: document.querySelectorAll('.simulate-component[data-component]').length,
    statusLabels: document.querySelectorAll('.simulate-tree-status').length,
    consoleOpen: !document.getElementById('simulate-console').classList.contains('collapsed')
  }));
  assert.ok(view.variables >= 4640);
  assert.equal(view.treeComponents, 50);
  assert.equal(view.diagramComponents, 50);
  assert.equal(view.statusLabels, 0);
  assert.equal(view.consoleOpen, true);
  var screenshot = await gui_desktop.simulate.evaluate(() =>
    require('electron').ipcRenderer.invoke('JSLAB_DESKTOP_GUI_TEST_CAPTURE'));
  fs.writeFileSync(path.join(app_path, 'temp/simulate-desktop-6dof.png'), Buffer.from(screenshot, 'base64'));
  var reference = process.argv.find(value => value.startsWith('--reference='));
  if(reference) {
    const { PRDC_JSLAB_SIMULATE_NATIVE_REFERENCE } = require('../../simulate/tests/simulate-native-reference');
    var project = JSON.parse(fs.readFileSync(filename, 'utf8'));
    var comparison = PRDC_JSLAB_SIMULATE_NATIVE_REFERENCE.compare(
      path.resolve(reference.slice(12)), project.source, state.series, project.simulation);
    assert.ok(comparison.success, JSON.stringify(comparison));
    fs.writeFileSync(path.join(app_path, 'temp/simulate-desktop-native-parity.json'), JSON.stringify(comparison, null, 2));
  }
}, { tags: ['gui', 'electron', 'integration', 'simulate'], timeout_ms: 240000 });

tests.add('desktop Simulate translates dialogs and centers toolbar icons in every interface language', async function(assert) {
  for(const width of [900, 1600]) {
    await gui_desktop.simulate.resizeViewport(width, 900);
    var findings = await gui_desktop.simulate.evaluate(() => {
      var findings = [];
      var previous = language.lang;
      for(const lang of language.langs) {
        language.set(lang);
        for(const element of document.querySelectorAll('str[sid], [title-str]')) {
          if(!element.textContent.trim() && element.matches('str[sid]') ||
              element.hasAttribute('title-str') && !element.title.trim()) {
            findings.push(lang + ': empty ' + (element.id || element.getAttribute('sid')));
          }
        }
        for(const item of document.querySelectorAll('#simulate-menu li')) {
          var icon = item.querySelector('img').getBoundingClientRect();
          var label = item.querySelector('str');
          var bounds = item.getBoundingClientRect();
          var content_right = getComputedStyle(label).display == 'none' ? icon.right : label.getBoundingClientRect().right;
          if(Math.abs((icon.left - bounds.left) - (bounds.right - content_right)) > 1) {
            findings.push(lang + ': unequal toolbar padding ' + item.id);
          }
        }
      }
      language.set(previous);
      return findings;
    });
    assert.deepEqual(findings, [], 'viewport ' + width);
    var capture = await gui_desktop.simulate.evaluate(() =>
      require('electron').ipcRenderer.invoke('JSLAB_DESKTOP_GUI_TEST_CAPTURE'));
    fs.writeFileSync(path.join(app_path, 'temp/simulate-toolbar-' + width + '.png'), Buffer.from(capture, 'base64'));
  }
  await gui_desktop.simulate.restoreViewport();
}, { tags: ['gui', 'electron', 'integration', 'simulate'], timeout_ms: 30000 });

tests.add('desktop 6-DOF example changes mass, plots results and stops looped animation with Ctrl+C', async function(assert) {
  var filename = path.join(app_path, 'examples/simulateMP6DOF.jsl');
  await gui_desktop.sandbox.evaluate(() => {
    const env = jsl.inter.env;
    const openAnimation = env._openSimulateAnimation;
    const gate = jsl.inter.env.desktop_animation_gate = {};
    const ready = new Promise(resolve => { gate.release = resolve; });
    gate.restore = () => { env._openSimulateAnimation = openAnimation; };
    env._openSimulateAnimation = async data => {
      gate.restore();
      gate.requested = true;
      await ready;
      return openAnimation.call(env, data);
    };
  });
  try {
    await gui_desktop.main.evaluate(filename => {
      win_main.command_window.code_input.setValue('await run(' + JSON.stringify(filename) + ', undefined, false, true);');
      document.getElementById('command-window-input-submit-cont').click();
    }, filename);
    await gui_desktop.sandbox.waitFor(() => jsl.inter.env.desktop_animation_gate?.requested,
      'animation request reached the sandbox', 180000);
    assert.equal(await gui_desktop.main.evaluate(() => win_main.evaluating), true,
      'The workspace command must wait while the animation opens.');
  } finally {
    await gui_desktop.sandbox.evaluate(() => {
      const gate = jsl.inter.env.desktop_animation_gate;
      gate?.restore();
      gate?.release();
      delete jsl.inter.env.desktop_animation_gate;
    });
  }
  await gui_desktop.sandbox.waitFor(() => jsl.context.torque_200 &&
    Object.values(jsl.inter.figures.open_figures).some(figure =>
      figure.dom && figure.dom.querySelector('input[type="range"]')),
  'complete 6-DOF example and animation', 180000);
  await gui_desktop.main.waitFor(() => !win_main.evaluating, 'example command completion');
  var result = await gui_desktop.sandbox.evaluate(() => {
    var context = jsl.context;
    var figures = Object.values(jsl.inter.figures.open_figures);
    var figure = figures.find(item => item.dom && item.dom.querySelector('input[type="range"]'));
    return { samples: [context.time_150.length, context.time_200.length],
      torqueDifference: Math.max(...context.torque_200.map((value, index) => Math.abs(value - context.torque_150[index]))),
      angleDifference: Math.max(...context.angle_200.map((value, index) => Math.abs(value - context.angle_150[index]))),
      figures: figures.length, playing: figure.dom.querySelector('input[type="range"]').previousElementSibling.textContent,
      index: Number(figure.dom.querySelector('input[type="range"]').value),
      title: figure.context.document.title };
  });
  assert.deepEqual(result.samples, [1007, 1007]);
  assert.ok(result.torqueDifference > 1);
  assert.ok(result.angleDifference < 1e-8);
  assert.equal(result.figures, 3);
  assert.equal(result.playing, '\u275a\u275a');
  assert.ok(result.title.includes('simulate-6dof.jslmo'));
  await new Promise(resolve => setTimeout(resolve, 160));
  var next = await gui_desktop.sandbox.evaluate(PRDC_JSLAB_DESKTOP_SIMULATE_TEST_HELPER.animationIndex);
  assert.notEqual(next, result.index);
  var [before, after] = await gui_desktop.sandbox.evaluate(PRDC_JSLAB_DESKTOP_SIMULATE_TEST_HELPER.playbackSamples, 1000);
  var elapsed = (after.wall - before.wall) / 1000;
  var simulated = (after.time - before.time + before.duration) % before.duration;
  var difference = Math.abs(simulated - elapsed % before.duration);
  assert.ok(Math.min(difference, before.duration - difference) < .15,
    'Playback advanced ' + simulated + ' simulation seconds in ' + elapsed + ' wall seconds.');
  for(const rate of [2, .5]) {
    var selection = await gui_desktop.sandbox.evaluate(rate => {
      var figure = Object.values(jsl.inter.figures.open_figures).find(item =>
        item.dom && item.dom.querySelector('.ui-animation-speed'));
      var slider = figure.dom.querySelector('input[type="range"]');
      var speed = figure.dom.querySelector('.ui-animation-speed');
      var before = Number(slider.value);
      speed.value = String(rate);
      speed.dispatchEvent(new figure.dom.defaultView.Event('change'));
      return { before: before, after: Number(slider.value), title: speed.title };
    }, rate);
    assert.equal(selection.before, selection.after, 'Changing speed must preserve the current frame.');
    assert.ok(selection.title.trim());
    [before, after] = await gui_desktop.sandbox.evaluate(PRDC_JSLAB_DESKTOP_SIMULATE_TEST_HELPER.playbackSamples,
      rate === 2 ? 500 : 750);
    elapsed = (after.wall - before.wall) / 1000;
    simulated = (after.time - before.time + before.duration) % before.duration;
    difference = Math.abs(simulated - elapsed * rate % before.duration);
    assert.ok(Math.min(difference, before.duration - difference) < .15,
      rate + 'x playback advanced ' + simulated + ' simulation seconds in ' + elapsed + ' wall seconds.');
  }
  var paused = await gui_desktop.sandbox.evaluate(() => {
    var figure = Object.values(jsl.inter.figures.open_figures).find(item =>
      item.dom && item.dom.querySelector('.ui-animation-speed'));
    var slider = figure.dom.querySelector('input[type="range"]');
    slider.previousElementSibling.click();
    var speed = figure.dom.querySelector('.ui-animation-speed');
    speed.value = '4';
    speed.dispatchEvent(new figure.dom.defaultView.Event('change'));
    return Number(slider.value);
  });
  await new Promise(resolve => setTimeout(resolve, 160));
  assert.equal(await gui_desktop.sandbox.evaluate(PRDC_JSLAB_DESKTOP_SIMULATE_TEST_HELPER.animationIndex), paused,
    'Changing speed while paused must not start playback.');
  await gui_desktop.sandbox.evaluate(() => {
    var figure = Object.values(jsl.inter.figures.open_figures).find(item =>
      item.dom && item.dom.querySelector('.ui-animation-speed'));
    figure.dom.querySelector('input[type="range"]').previousElementSibling.click();
  });
  if(process_arguments.includes('--test-profile-simulate')) {
    var profile = await gui_desktop.sandbox.evaluate(PRDC_JSLAB_DESKTOP_SIMULATE_TEST_HELPER.profileAnimation);
    fs.writeFileSync(path.join(app_path, 'temp/simulate-frame-profile.json'), JSON.stringify(profile, null, 2));
    console.log('Simulate frame profile: ' + JSON.stringify(profile));
    assert.equal(profile.gpu_draw.count, 30, 'The profile must include completed GPU frames.');
    assert.ok(profile.mesh_draw.count > 0, 'The profile must draw the actual scene meshes.');
    assert.equal(profile.rigid, true, 'The shipped 6-DOF model must use retained rigid meshes.');
    if(profile.rigid) {
      assert.equal(profile.mesh_update.count, 0, 'Rigid playback must not rebuild mesh buffers.');
      assert.equal(profile.conversion.count, 0, 'Rigid playback must not recalculate Plotly traces.');
    }
    await gui_desktop.sandbox.evaluate(() => {
      var figure = Object.values(jsl.inter.figures.open_figures).find(item =>
        item.dom && item.dom.querySelector('.ui-animation-speed'));
      figure.dom.querySelector('input[type="range"]').previousElementSibling.click();
    });
  }
  await gui_desktop.main.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'c', code: 'KeyC',
    windowsVirtualKeyCode: 67, modifiers: 2 });
  await gui_desktop.main.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'c', code: 'KeyC',
    windowsVirtualKeyCode: 67, modifiers: 2 });
  await gui_desktop.sandbox.waitFor(() => Object.values(jsl.inter.figures.open_figures).some(figure => {
    var slider = figure.dom && figure.dom.querySelector('input[type="range"]');
    return slider && slider.previousElementSibling.textContent == '\u25b6';
  }), 'Ctrl+C stops animation');
  var stopped = await gui_desktop.sandbox.evaluate(PRDC_JSLAB_DESKTOP_SIMULATE_TEST_HELPER.animationIndex);
  await new Promise(resolve => setTimeout(resolve, 160));
  assert.equal(await gui_desktop.sandbox.evaluate(PRDC_JSLAB_DESKTOP_SIMULATE_TEST_HELPER.animationIndex), stopped);
}, { tags: ['gui', 'electron', 'integration', 'simulate'], timeout_ms: 240000 });

tests.add('desktop Simulate resolves inherited components and safely deletes shared local declarations', async function(assert) {
  await gui_desktop.simulate.evaluate(() => {
    globalThis.desktop_inherited_test = { pending: true };
    (async () => {
      const source = 'model ModelName\n model Base\n Modelica.Blocks.Math.Gain inheritedGain annotation(Placement(transformation(extent={{-10,-10},{10,10}})));\n end Base;\n extends Base;\n Modelica.Blocks.Math.Gain a,b;\nend ModelName;';
      win_simulate.editor.setValue(source);
      clearTimeout(win_simulate.parse_timer);
      await win_simulate.parseModel();
      if(!win_simulate.model) {
        throw new Error(win_simulate.output.textContent);
      }
      const inherited = win_simulate.model.components.find(item => item.name == 'inheritedGain');
      win_simulate.selected_components = new Set(['inheritedGain']);
      win_simulate.deleteDiagramSelection();
      const protected_source = win_simulate.editor.getValue() == source;
      win_simulate.selected_components = new Set(['a']);
      win_simulate.deleteDiagramSelection();
      clearTimeout(win_simulate.parse_timer);
      await win_simulate.parseModel();
      desktop_inherited_test = { pending: false, protected_source,
        inherited: inherited && inherited.inherited, x: inherited && inherited.placement.x,
        names: win_simulate.model.components.map(item => item.name),
        treeHasB: !!document.querySelector('.simulate-tree-item[data-component="b"]') };
    })().catch(error => { desktop_inherited_test = { pending: false, error: String(error.stack || error) }; });
  });
  await gui_desktop.simulate.waitFor(() => !desktop_inherited_test.pending, 'desktop inherited diagram', 120000);
  const result = await gui_desktop.simulate.evaluate(() => desktop_inherited_test);
  assert.equal(result.error, undefined, JSON.stringify(result));
  assert.equal(result.inherited, true);
  assert.equal(result.x, 0);
  assert.equal(result.protected_source, true);
  assert.deepEqual(result.names, ['inheritedGain', 'b']);
  assert.equal(result.treeHasB, true);
  await gui_desktop.simulate.evaluate(() => document.getElementById('win-close').click());
  await gui_desktop.simulate.waitFor(() => !document.getElementById('close-dialog-cont').hidden, 'Simulate cleanup prompt');
  await gui_desktop.simulate.evaluate(() => setTimeout(() => document.getElementById('close-dialog-discard').click(), 0));
  await gui_desktop.main.waitFor(async port => {
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    return !targets.some(target => target.url.endsWith('/simulate.html'));
  }, 'Simulate window closed before the next test', 15000, gui_desktop_port);
}, { tags: ['gui', 'electron', 'integration', 'simulate'], timeout_ms: 150000 });

tests.add('desktop Ctrl+C cancels its pending Simulate request before the solver starts', async function(assert) {
  const project = path.join(gui_desktop_profile, 'cancel-automation.jslmo');
  fs.writeFileSync(project, JSON.stringify({ format: 'JSLAB Simulate', version: 1,
    source: 'model CancelAutomation\n Real x(start=1);\n equation\n der(x) = -x;\nend CancelAutomation;' }));
  await gui_desktop.main.evaluate(project => {
    win_main.platform.host.send('MainProcess', 'show-simulate', project);
  }, project);
  await gui_desktop.main.waitFor(async port => (await (await fetch('http://127.0.0.1:' + port + '/json/list')).json())
    .some(item => item.url.endsWith('/simulate.html')), 'Simulate opened', 15000, gui_desktop_port);
  const target = (await (await fetch('http://127.0.0.1:' + gui_desktop_port + '/json/list')).json())
    .find(item => item.url.endsWith('/simulate.html'));
  const client = new PRDC_JSLAB_GUI_TEST_BROWSER();
  await client.connect(target.webSocketDebuggerUrl);
  try {
    await client.waitFor(project => globalThis.win_simulate?.file_path === project, 'cancellation model opened', 15000, project);
    await client.evaluate(() => {
      const controller = win_simulate;
      let resume;
      controller.resolvedCompilerSource = () => new Promise(resolve => { resume = resolve; });
      const cancel = controller.cancelCompiler.bind(controller);
      controller.cancelCompiler = () => {
        globalThis.sandbox_cancel_observed = true;
        cancel();
        resume(controller.editor.getValue());
      };
      const compile = controller.compiler.compile.bind(controller.compiler);
      controller.compiler.compile = request => {
        globalThis.cancelled_solver_started = true;
        return compile(request);
      };
    });
    await gui_desktop.main.evaluate(() => { win_main.eval.evalCommand('await simulate(undefined, {run:true});'); });
    await client.waitFor(() => win_simulate.busy && win_simulate.automation_request?.compiling,
      'sandbox request waiting for Simulate');
    await gui_desktop.main.evaluate(() => win_main.platform.host.send('MainProcess', 'focus-win'));
    await gui_desktop.main.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'c', code: 'KeyC', windowsVirtualKeyCode: 67, modifiers: 2 });
    await gui_desktop.main.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'c', code: 'KeyC', windowsVirtualKeyCode: 67, modifiers: 2 });
    await client.waitFor(() => globalThis.sandbox_cancel_observed && !win_simulate.automation_request && !win_simulate.busy,
      'Simulate settled after sandbox interruption');
    assert.equal(await client.evaluate(() => Boolean(globalThis.cancelled_solver_started)), false);
    await gui_desktop.main.waitFor(() => !win_main.evaluating, 'sandbox idle after cancellation');
  } finally {
    await client.evaluate(() => {
      setTimeout(() => {
        document.getElementById('win-close').click();
        if(!document.getElementById('close-dialog-cont').hidden) document.getElementById('close-dialog-discard').click();
      }, 0);
    });
    await client.close();
  }
}, { tags: ['gui', 'electron', 'integration', 'simulate'], timeout_ms: 55000 });

exports.MODULE_TESTS = tests;
