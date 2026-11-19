/**
 * @file Simulate model editing and real browser solver integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { selectSimulateEntry } = require('./browser-test-utils');

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();
if(!globalThis.gui_browser) {
  exports.MODULE_TESTS = tests;
  return;
}

tests.add('Web Ctrl+C cancels the pending Simulate picker request', async function(assert) {
  await gui_browser.evaluate(() => {
    const app = jslab_web;
    const file = '/workspace/cancelled-picker.jslmo';
    app.fs.writeTextFileSync(file, JSON.stringify({ format: 'JSLAB Simulate', version: 1,
      source: 'model CancelledPicker\nend CancelledPicker;' }));
    const original = app.files._showOpenDialog;
    globalThis.restoreSimulatePicker = () => {
      app.files._showOpenDialog = original;
      delete globalThis.finishSimulatePicker;
      delete globalThis.restoreSimulatePicker;
    };
    app.files._showOpenDialog = () => new Promise(resolve => {
      globalThis.finishSimulatePicker = () => resolve([file]);
    });
    void app.sandbox_api.evaluate('await simulate(undefined, {run:true});').catch(() => {});
  });
  try {
    await gui_browser.waitFor(() => typeof finishSimulatePicker === 'function', 'Simulate picker is waiting');
    await gui_browser.evaluate(() => {
      getSelection().removeAllRanges();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true }));
    });
    await gui_browser.waitFor(() => Array.from(jslab_web.windows._simulate_requests.requests.values())
      .some(request => request.cancelled), 'sandbox cancelled its outstanding picker');
  } finally {
    await gui_browser.evaluate(() => {
      globalThis.finishSimulatePicker?.();
      globalThis.restoreSimulatePicker?.();
    });
  }
  await gui_browser.waitFor(() => !jslab_web.windows._simulate_requests.requests.size && !jslab_web.main.evaluating,
    'cancelled Simulate request settled');
  assert.equal(await gui_browser.evaluate(() => jslab_web.window_manager.windows.has('simulate-window')), false);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 25000 });

tests.add('Web Simulate opens the shared editor without downloading the solver or standard library', async function(assert) {
  const canceled = await gui_browser.evaluate(async () => {
    const files = jslab_web.files;
    const pick = files._showOpenDialog;
    files._showOpenDialog = async () => false;
    try {
      await jslab_web.platform.host.send('MainProcess', 'show-simulate');
      return jslab_web.window_manager.windows.has('simulate-window');
    } finally {
      files._showOpenDialog = pick;
    }
  });
  assert.equal(canceled, false);
  await gui_browser.evaluate(async () => {
    const files = jslab_web.files;
    const pick = files._showOpenDialog;
    const project = '/workspace/on-demand.jslmo';
    jslab_web.fs.writeTextFileSync(project, JSON.stringify({ format: 'JSLAB Simulate', version: 1,
      source: 'model OnDemand\nend OnDemand;' }));
    files._showOpenDialog = async () => [project];
    try {
      await jslab_web.platform.host.send('MainProcess', 'show-simulate');
    } finally {
      files._showOpenDialog = pick;
    }
  });
  await gui_browser.waitFor(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentWindow;
    return !!frame?.win_simulate && !frame.win_simulate.busy;
  }, 'Simulate model editor', 30000);
  const state = await gui_browser.evaluate(async () => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const api = await frame.__JSLAB_WEB_SIMULATE_READY__;
    return { controller: api.controller.constructor.name, filepath: api.controller.file_path,
      workersStarted: !!api.controller.compiler.worker,
      caches: await caches.keys(),
      title: frame.document.title,
      blocks: frame.document.querySelectorAll('#simulate-library-items button').length };
  });
  assert.equal(state.controller, 'PRDC_JSLAB_WIN_SIMULATE');
  assert.equal(state.filepath, '/workspace/on-demand.jslmo');
  assert.equal(state.workersStarted, false);
  assert.equal(state.caches.includes('openmodelica-jslab-binary-v1'), false);
  assert.equal(state.title, 'JSLAB / SIMULATE');
  await gui_browser.evaluate(() => {
    const win = jslab_web.window_manager.windows.get('simulate-window');
    win.iframe.contentDocument.getElementById('simulate-stop-time').value = '45';
    win.header.querySelector('button.close').click();
  });
  await gui_browser.waitFor(() => {
    const doc = jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentDocument;
    return doc?.getElementById('close-dialog-cont').hidden === false;
  }, 'Simulate prompts before closing its managed window');
  await gui_browser.evaluate(() => {
    const doc = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
    doc.getElementById('close-dialog-cancel').click();
  });
  await gui_browser.waitFor(() => jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
    .getElementById('close-dialog-cont').hidden, 'Simulate stays open after Cancel');
  await gui_browser.evaluate(() => {
    const win = jslab_web.window_manager.windows.get('simulate-window');
    win.header.querySelector('button.close').click();
    win.iframe.contentDocument.getElementById('close-dialog-discard').click();
  });
  await gui_browser.waitFor(() => !jslab_web.window_manager.windows.has('simulate-window'),
    'Discard closes the Simulate frame');
  await gui_browser.evaluate(() => jslab_web.windows._openSimulateWindow());
  assert.equal(await gui_browser.evaluate(() => {
    jslab_web.window_manager.windows.get('simulate-window').header.querySelector('button.close').click();
    return jslab_web.window_manager.windows.has('simulate-window');
  }), false);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 45000 });

tests.add('Web Simulate browses concrete nested blocks and hides implementation categories without starting the solver', async function(assert) {
  await gui_browser.evaluate(() => void jslab_web.windows._openSimulateWindow());
  await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentWindow.win_simulate,
    'base-class browser', 30000);
  await gui_browser.evaluate(() => {
    const doc = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
    doc.getElementById('simulate-library-open').click();
  });
  for(const type of ['Modelica.Blocks', 'Modelica.Blocks.Sources']) {
    await gui_browser.evaluate(type => {
      globalThis.web_base_class_folder = type;
    }, type);
    await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
      .querySelector('[data-library-type="' + globalThis.web_base_class_folder + '"]'), 'library folder');
    await gui_browser.evaluate(type => jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
      .querySelector('[data-library-type="' + type + '"]').click(), type);
  }
  await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
    .querySelector('[data-library-type="Modelica.Blocks.Sources.BooleanConstant"] svg'), 'offline concrete block drawing');
  const states = await gui_browser.evaluate(async () => {
    const result = [];
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    for(const [lang, label] of [['en', 'Boolean constant'], ['rs', 'Logička konstanta'], ['rsc', 'Логичка константа']]) {
      jslab_web.changeLanguage(lang);
      await Promise.resolve();
      const button = frame.document.querySelector('#simulate-library-items [data-library-type="Modelica.Blocks.Sources.BooleanConstant"]');
      result.push({ lang, label, text: button.textContent, description: button.title, disabled: button.disabled,
        worker: !!frame.win_simulate.compiler.worker });
    }
    jslab_web.changeLanguage('en');
    frame.document.getElementById('simulate-library-close').click();
    return result;
  });
  for(const state of states) {
    assert.ok(state.text.includes(state.label), JSON.stringify(state));
    assert.equal(state.disabled, false);
    assert.equal(state.worker, false);
    assert.ok(state.description.length > 10);
  }
  const layout = await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    frame.document.getElementById('simulate-library-open').click();
    const tree = frame.document.getElementById('simulate-library-categories');
    const results = frame.document.getElementById('simulate-library-items');
    const left = tree.getBoundingClientRect();
    const right = results.getBoundingClientRect();
    const state = { left: left.left, left_end: left.right, right: right.left,
      height: right.height, categories: tree.querySelectorAll('[role="treeitem"]').length,
      folders_on_right: results.querySelectorAll('[data-library-type="Modelica.Blocks.Interfaces"]').length };
    frame.document.getElementById('simulate-library-close').click();
    return state;
  });
  assert.ok(layout.categories > 15, JSON.stringify(layout));
  assert.ok(layout.right > layout.left_end && layout.height > 100, JSON.stringify(layout));
  assert.equal(layout.folders_on_right, 0);
  assert.equal(gui_requests.filter(url => /OpenModelicaCompiler_bg\.wasm|\/packages\/[^/?]+\.zip/.test(url)).length, 0);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 45000 });

tests.add('Web Simulate resolves live workspace expressions and publishes a real solver result before the script continues', async function(assert) {
  await gui_browser.evaluate(() => {
    const project = { format: 'JSLAB Simulate', version: 1,
      source: 'model BrowserDecay\n parameter Real gain = 1;\n Real x(start=1, fixed=true);\nequation\n der(x) = -gain*x;\nend BrowserDecay;',
      parameter_bindings: [['gain', 'web_sim_gain']],
      simulation: { start_time: 0, stop_time: 1, intervals: 20, tolerance: 1e-7, solver: 'dassl' } };
    jslab_web.fs.writeTextFileSync('/workspace/browser-decay.jslmo', JSON.stringify(project));
    globalThis.web_simulation_check = { running: true };
    jslab_web.sandbox_api.evaluate('var web_sim_gain = 2; await simulate("/workspace/browser-decay.jslmo", {run:true}); ' +
      'var web_sim_result = simulation.get("x").at(-1); web_sim_result;')
      .then(result => {
        globalThis.web_simulation_check = { running: false, result };
      },
      error => {
        globalThis.web_simulation_check = { running: false, error: String(error.stack || error) };
      });
  });
  await gui_browser.waitFor(() => !globalThis.web_simulation_check.running, 'real browser simulation', 120000);
  const state = await gui_browser.evaluate(async () => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const binary = await caches.open('openmodelica-jslab-binary-v1');
    return { ...globalThis.web_simulation_check,
      compiled: frame.win_simulate.result?.success,
      dataLength: frame.win_simulate.result?.data?.x?.length,
      cacheFiles: (await binary.keys()).length,
      messages: frame.document.getElementById('simulate-output').textContent };
  });
  assert.equal(state.error, undefined);
  assert.equal(state.result.ok, true);
  assert.ok(Math.abs(state.result.value - Math.exp(-2)) < 1e-5);
  assert.equal(state.cacheFiles, 1, 'A model without standard-library classes needs only the solver binary');
  assert.ok(state.dataLength >= 21);
  assert.ok(!state.messages.includes('WebAssembly'));
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 150000 });

tests.add('Web Simulate loads the pinned standard library only when library blocks are simulated', async function(assert) {
  await gui_browser.evaluate(() => {
    const project = { format: 'JSLAB Simulate', version: 1,
      source: 'model BrowserLibrary\n Modelica.Blocks.Sources.Constant inputSignal(k=3);\n' +
        ' Modelica.Blocks.Math.Gain gain(k=2);\nequation\n connect(inputSignal.y,gain.u);\nend BrowserLibrary;',
      simulation: { start_time: 0, stop_time: 1, intervals: 10, tolerance: 1e-8, solver: 'dassl' } };
    jslab_web.fs.writeTextFileSync('/workspace/browser-library.jslmo', JSON.stringify(project));
    globalThis.web_simulation_check = { running: true };
    jslab_web.sandbox_api.evaluate('await simulate("/workspace/browser-library.jslmo", {run:true}); simulation.get("gain.y").at(-1);')
      .then(result => {
        globalThis.web_simulation_check = { running: false, result };
      },
      error => {
        globalThis.web_simulation_check = { running: false, error: String(error.stack || error) };
      });
  });
  await gui_browser.waitFor(() => !globalThis.web_simulation_check.running, 'standard-library browser simulation', 120000);
  const result = await gui_browser.evaluate(() => globalThis.web_simulation_check);
  assert.equal(result.error, undefined);
  assert.equal(result.result.value, 6);
  assert.equal(gui_requests.filter(url => url.includes('OpenModelicaCompiler_bg.wasm')).length, 1);
  assert.equal(gui_requests.filter(url => /\/packages\/[^/?]+\.zip/.test(url)).length, 1);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 150000 });

tests.add('Web Simulate reuses solver and library downloads after its window and compiler worker are recreated', async function(assert) {
  const before = gui_requests.filter(url => /OpenModelicaCompiler_bg\.wasm|\/packages\/[^/?]+\.zip/.test(url)).length;
  await gui_browser.evaluate(() => {
    jslab_web.window_manager.close('simulate-window');
    globalThis.web_simulation_check = { running: true };
    jslab_web.sandbox_api.evaluate('await simulate("/workspace/browser-library.jslmo", {run:true}); simulation.get("gain.y").at(-1);')
      .then(result => {
        globalThis.web_simulation_check = { running: false, result };
      },
      error => {
        globalThis.web_simulation_check = { running: false, error: String(error.stack || error) };
      });
  });
  await gui_browser.waitFor(() => !globalThis.web_simulation_check.running, 'recreated cached browser compiler', 120000);
  const result = await gui_browser.evaluate(() => globalThis.web_simulation_check);
  assert.equal(result.error, undefined);
  assert.equal(result.result.value, 6);
  assert.equal(gui_requests.filter(url => /OpenModelicaCompiler_bg\.wasm|\/packages\/[^/?]+\.zip/.test(url)).length, before);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 150000 });

tests.add('Web Simulate runs the shipped 6-DOF project through its GUI and exports finite mechanism signals', async function(assert) {
  const fs = require('fs');
  const path = require('path');
  const project = JSON.parse(fs.readFileSync(path.join(app_path, 'examples/resources/simulate-6dof.jslmo'), 'utf8'));
  await gui_browser.evaluate(() => {
    globalThis.web_simulation_check = { running: true };
    jslab_web.sandbox_api.evaluate('await getExamples(); await simulate("/workspace/examples/resources/simulate-6dof.jslmo", {run:true}); simulation.time.length;')
      .then(result => {
        globalThis.web_simulation_check = { running: false, result };
      },
      error => {
        globalThis.web_simulation_check = { running: false, error: String(error.stack || error) };
      });
  });
  await gui_browser.waitFor(() => !globalThis.web_simulation_check.running, 'browser 6-DOF simulation', 180000);
  const state = await gui_browser.evaluate(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    const names = ['time',
      ...[1, 2, 3, 4, 5, 6].flatMap(index => ['phi', 'w', 'a'].map(field => 'drive' + index + '.' + field)),
      ...[1, 2, 3, 4, 5, 6].map(index => 'leg' + index + '.revolute.tau'),
      ...['v_0', 'a_0', 'z_a', 'w_a'].flatMap(field => [1, 2, 3].map(index => 'M.' + field + '[' + index + ']'))];
    return { ...globalThis.web_simulation_check,
      variables: controller.result?.columns?.length,
      selected: Object.fromEntries(names.map(name => [name, Array.from(controller.result?.data?.[name] || [])])),
      messages: controller.output.textContent };
  });
  assert.equal(state.error, undefined);
  assert.equal(state.result.value, 1007);
  assert.ok(state.variables >= 4640);
  for(const [name, series] of Object.entries(state.selected)) {
    assert.equal(series.length, 1007, name);
    assert.ok(series.every(Number.isFinite), name);
  }
  const reference = process.argv.find(value => value.startsWith('--reference='));
  if(reference) {
    const { PRDC_JSLAB_SIMULATE_NATIVE_REFERENCE } = require('../../simulate/tests/simulate-native-reference');
    const comparison = PRDC_JSLAB_SIMULATE_NATIVE_REFERENCE.compare(
      path.resolve(reference.slice(12)), project.source, state.selected, project.simulation);
    fs.writeFileSync(path.join(app_path, 'temp/simulate-browser-native-parity.json'), JSON.stringify(comparison, null, 2));
    assert.ok(comparison.success, JSON.stringify(comparison.differences.filter(item => item.failures)));
    console.log('Browser/native 6-DOF maximum difference: ' + comparison.maximum_absolute_difference);
  }
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 210000 });

tests.add('Web 6-DOF playback preserves camera zoom and panning during live rotation and restarts from the end', async function(assert) {
  await gui_browser.resizeViewport(1440, 1000);
  await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    frame.document.getElementById('simulate-animation').click();
  });
  await gui_browser.waitFor(() => Array.from(jslab_web.window_manager.windows.values()).some(win =>
    win.title === 'simulate-6dof.jslmo' && win.iframe.contentDocument?.querySelector('input[type=range]')),
    '6-DOF figure playback controls', 45000);
  const before = await gui_browser.evaluate(() => {
    const managed = Array.from(jslab_web.window_manager.windows.values()).find(win =>
      win.title === 'simulate-6dof.jslmo' && win.iframe.contentDocument?.querySelector('input[type=range]'));
    globalThis.web_animation_window_id = managed.id;
    jslab_web.window_manager.focus(managed.id);
    const frame = managed.iframe.contentWindow, slider = frame.document.querySelector('input[type=range]');
    slider.value = slider.max;
    slider.dispatchEvent(new frame.Event('input', { bubbles: true }));
    const speed = frame.document.querySelector('.ui-animation-speed');
    speed.value = '0.25';
    speed.dispatchEvent(new frame.Event('change'));
    slider.parentElement.querySelector('button').click();
    const plot = frame.plot.plot_cont;
    const rect = plot.getBoundingClientRect(), outer = managed.iframe.getBoundingClientRect();
    return { title: managed.title, max: Number(slider.max), meshes: plot.data.filter(trace => trace.type == 'mesh3d').length,
      triangles: plot.data.reduce((count, trace) => count + (trace.i?.length || 0), 0),
      x: outer.left + rect.left + rect.width * .5, y: outer.top + rect.top + rect.height * .5,
      ranges: JSON.stringify(['xaxis', 'yaxis', 'zaxis'].map(key => plot._fullLayout.scene[key].range)) };
  });
  assert.equal(before.max, 1006);
  assert.equal(before.title, 'simulate-6dof.jslmo');
  assert.ok(before.meshes > 0);
  assert.ok(before.triangles >= 1000);
  await gui_browser.waitFor(() => {
    const slider = jslab_web.window_manager.windows.get(web_animation_window_id).iframe.contentDocument.querySelector('input[type=range]');
    return Number(slider.value) > 1 && Number(slider.value) < Number(slider.max);
  }, 'playback restart from the beginning');
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: before.x, y: before.y, deltaY: -120, deltaX: 0 });
  await gui_browser.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));
  const zoom = await gui_browser.evaluate(() => {
    const plot = jslab_web.window_manager.windows.get(web_animation_window_id).iframe.contentWindow.plot.plot_cont;
    return plot._fullLayout.scene.aspectratio.x;
  });
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: before.x, y: before.y, button: 'left', buttons: 1, clickCount: 1 });
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: before.x + 70, y: before.y + 30, button: 'left', buttons: 1 });
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: before.x + 70, y: before.y + 30, button: 'left', buttons: 0, clickCount: 1 });
  const rotated = await gui_browser.evaluate(() => {
    const plot = jslab_web.window_manager.windows.get(web_animation_window_id).iframe.contentWindow.plot.plot_cont;
    return { eye: { ...plot._fullLayout.scene.camera.eye }, center: { ...plot._fullLayout.scene.camera.center } };
  });
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: before.x, y: before.y, button: 'left', buttons: 1, modifiers: 8, clickCount: 1 });
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: before.x + 45, y: before.y + 15, button: 'left', buttons: 1, modifiers: 8 });
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: before.x + 45, y: before.y + 15, button: 'left', buttons: 0, modifiers: 8, clickCount: 1 });
  await gui_browser.evaluate(() => new Promise(resolve => setTimeout(resolve, 200)));
  const after = await gui_browser.evaluate(() => {
    const managed = jslab_web.window_manager.windows.get(web_animation_window_id);
    const plot = managed.iframe.contentWindow.plot.plot_cont;
    const scene = plot._fullLayout.scene;
    return { zoom: scene.aspectratio.x, center: { ...scene.camera.center },
      eye: { ...scene.camera.eye }, frame: Number(managed.iframe.contentDocument.querySelector('input[type=range]').value),
      ranges: JSON.stringify(['xaxis', 'yaxis', 'zaxis'].map(key => scene[key].range)) };
  });
  assert.ok(Math.abs(after.zoom - zoom) < 1e-9);
  assert.ok(['x', 'y', 'z'].some(key => Math.abs(after.center[key] - rotated.center[key]) > 1e-3));
  JSON.parse(after.ranges).forEach(function(range, axis) {
    range.forEach(function(value, end) {
      assert.ok(Math.abs(value - JSON.parse(before.ranges)[axis][end]) < 1e-12);
    });
  });
  assert.ok(after.frame > 1 && after.frame < 1006);
  const capture = await gui_browser.send('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync(require('path').join(app_path, 'temp/simulate-browser-6dof.png'), Buffer.from(capture.data, 'base64'));
  await gui_browser.evaluate(() => jslab_web.worker_debugger.interrupt());
  const stopped = await gui_browser.evaluate(() => {
    const slider = jslab_web.window_manager.windows.get(web_animation_window_id).iframe.contentDocument.querySelector('input[type=range]');
    return Number(slider.value);
  });
  await gui_browser.evaluate(() => new Promise(resolve => setTimeout(resolve, 200)));
  const final = await gui_browser.evaluate(() => Number(jslab_web.window_manager.windows.get(web_animation_window_id).iframe.contentDocument.querySelector('input[type=range]').value));
  assert.equal(final, stopped);
  const exported = await gui_browser.evaluate(async () => {
    const viewer = jslab_web.window_manager.windows.get(web_animation_window_id).iframe.contentWindow.plot;
    const mesh = viewer.mesh_animation?.entries[0].mesh;
    const serialized = viewer.toJSON();
    const json = typeof serialized == 'string' ? JSON.parse(serialized) : serialized;
    const png = await viewer.toImage('png', [640, 480]);
    return { png, rigid: !!mesh, retained: viewer.mesh_animation?.entries[0].mesh === mesh,
      vertices: json.data.reduce((sum, trace) => sum + (Array.isArray(trace.x) ? trace.x.length : 0), 0) };
  });
  assert.ok(exported.rigid && exported.retained && exported.vertices > 1000);
  assert.ok(exported.png.startsWith('data:image/png;base64,') && exported.png.length > 3000);
  require('fs').writeFileSync(require('path').join(app_path, 'temp/simulate-rigid-6dof-export.png'),
    Buffer.from(exported.png.split(',')[1], 'base64'));
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 90000 });

tests.add('Web Simulate translates controls in every language and fits its header at narrow widths', async function(assert) {
  const results = await gui_browser.evaluate(async () => {
    const results = [];
    const managed = jslab_web.window_manager.windows.get('simulate-window');
    for(const lang of ['en', 'rs', 'rsc']) {
      jslab_web.changeLanguage(lang);
      for(const width of [640, 900, 1400]) {
        jslab_web.window_manager.setSize('simulate-window', width, 650);
        await new Promise(resolve => setTimeout(resolve, 50));
        const frame = managed.iframe.contentWindow, doc = frame.document;
        const menu = doc.getElementById('simulate-menu-container');
        results.push({ lang, width, fits: menu.scrollWidth <= menu.clientWidth,
          label: doc.getElementById('simulate-simulate').title,
          expected: { en: 'Simulate', rs: 'Simuliraj', rsc: 'Симулирај' }[lang],
          markup: doc.body.textContent.includes('<lang class=') });
      }
    }
    jslab_web.changeLanguage('en');
    return results;
  });
  for(const result of results) {
    assert.equal(result.label, result.expected);
    assert.equal(result.fits, true, JSON.stringify(result));
    assert.equal(result.markup, false);
  }
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 20000 });

tests.add('Closing Web Simulate during initialization settles the owning request', async function(assert) {
  await gui_browser.evaluate(() => {
    jslab_web.window_manager.close('simulate-window');
    globalThis.web_simulate_closed_check = { pending: true };
    jslab_web.windows._openSimulateWindow('/workspace/browser-library.jslmo', { run: true }).then(result => {
      globalThis.web_simulate_closed_check = { pending: false, result };
    }, error => {
      globalThis.web_simulate_closed_check = { pending: false, error: String(error.message || error) };
    });
    jslab_web.window_manager.close('simulate-window');
  });
  await gui_browser.waitFor(() => !globalThis.web_simulate_closed_check.pending, 'closed Simulate request');
  const state = await gui_browser.evaluate(() => globalThis.web_simulate_closed_check);
  assert.equal(state.error, undefined);
  assert.equal(state.result.success, false);
  assert.equal(state.result.error, 'Simulation stopped by user.');
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 15000 });

tests.add('Web Simulate imports an external block, preserves its labels and saves a portable executable project', async function(assert) {
  await gui_browser.evaluate(() => void jslab_web.windows._openSimulateWindow());
  await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentWindow.win_simulate,
    'external block editor', 30000);
  await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const doc = frame.document;
    doc.getElementById('simulate-new').click();
    doc.getElementById('simulate-library-open').click();
    const source = 'block BrowserExternal "External block description"\n' +
      ' parameter Real gain(unit="mm",displayUnit="m")=2000 "External gain";\n output Real y;\nequation\n y=gain;\n' +
      ' annotation(Icon(graphics={Rectangle(extent={{-100,100},{100,-100}},' +
      'fillColor={0,128,255},fillPattern=FillPattern.Solid),' +
      'Text(extent={{-90,40},{90,-40}},textString="Custom label")}));\nend BrowserExternal;';
    const transfer = new frame.DataTransfer();
    transfer.items.add(new frame.File([source], 'BrowserExternal.mo', { type: 'text/plain' }));
    const input = doc.getElementById('simulate-library-file');
    input.files = transfer.files;
    input.dispatchEvent(new frame.Event('change'));
  });
  await gui_browser.waitFor(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    return !frame.win_simulate.busy && frame.win_simulate.imported_library_classes.some(item => item.type == 'BrowserExternal');
  }, 'real external library import', 120000);
  const labels = await gui_browser.evaluate(() => {
    jslab_web.changeLanguage('rsc');
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const doc = frame.document;
    const search = doc.getElementById('simulate-library-search');
    search.value = 'BrowserExternal';
    search.dispatchEvent(new frame.Event('input'));
    const button = doc.querySelector('[data-library-type="BrowserExternal"]');
    const labels = { name: button.textContent, description: button.title };
    button.click();
    return labels;
  });
  assert.equal(labels.name, 'BrowserExternal');
  assert.equal(labels.description, 'External block description');
  await gui_browser.waitFor(() => {
    const doc = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
    return doc.querySelector('.simulate-component')?.textContent.includes('Custom label');
  }, 'external block custom icon', 30000);
  await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    frame.document.querySelector('.simulate-component').dispatchEvent(new frame.MouseEvent('dblclick', { bubbles: true }));
  });
  await gui_browser.waitFor(() => {
    const doc = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
    return doc.querySelector('[data-property="gain"] .simulate-property-name span')?.textContent == 'External gain';
  }, 'external property help', 30000);
  const unit = await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const row = frame.document.querySelector('[data-property="gain"]');
    const unit = row.querySelector('select');
    const input = row.querySelector('input');
    const state = { unit: unit.value, defaultValue: input.placeholder };
    input.value = '3';
    input.dispatchEvent(new frame.Event('input'));
    frame.document.getElementById('simulate-component-apply').click();
    return state;
  });
  assert.equal(unit.unit, 'm');
  assert.equal(unit.defaultValue, '2');
  await gui_browser.waitFor(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    return frame.document.getElementById('simulate-component-dialog').hidden;
  }, 'external property change');
  await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    frame.win_simulate.setFilePath('/workspace/browser-external.jslmo');
    globalThis.web_external_save = { pending: true };
    frame.win_simulate.saveModel(false).then(() => {
      globalThis.web_external_save.pending = false;
    },
    error => {
      globalThis.web_external_save = { pending: false, error: String(error) };
    });
  });
  await gui_browser.waitFor(() => !globalThis.web_external_save.pending, 'portable external project save');
  const saved = await gui_browser.evaluate(() => {
    const project = JSON.parse(jslab_web.fs.readTextFileSync('/workspace/browser-external.jslmo'));
    return { error: globalThis.web_external_save.error, count: project.libraries.length,
      entry: project.libraries[0].entry, source: project.source };
  });
  assert.equal(saved.error, undefined);
  assert.equal(saved.count, 1);
  assert.equal(saved.entry, 'BrowserExternal.mo');
  assert.ok(saved.source.includes('BrowserExternal browserExternal '), saved.source);
  await gui_browser.evaluate(() => {
    jslab_web.changeLanguage('en');
    jslab_web.window_manager.close('simulate-window');
    globalThis.web_simulation_check = { running: true };
    jslab_web.sandbox_api.evaluate('await simulate("/workspace/browser-external.jslmo", {run:true}); simulation.get("browserExternal.y").at(-1);')
      .then(result => {
        globalThis.web_simulation_check = { running: false, result };
      },
      error => {
        globalThis.web_simulation_check = { running: false, error: String(error.stack || error) };
      });
  });
  await gui_browser.waitFor(() => !globalThis.web_simulation_check.running, 'restored external block simulation', 120000);
  const result = await gui_browser.evaluate(() => globalThis.web_simulation_check);
  assert.equal(result.error, undefined);
  assert.equal(result.result.ok, true);
  assert.equal(result.result.value, 3000);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 240000 });

tests.add('Web Simulate imports external folders with inherited blocks and preserves their binary icon resources after reopening', async function(assert) {
  await gui_browser.evaluate(() => void jslab_web.windows._openSimulateWindow());
  await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentWindow.win_simulate,
    'external folder editor', 30000);
  await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const doc = frame.document;
    doc.getElementById('simulate-new').click();
    doc.getElementById('simulate-library-open').click();
    const source = 'package BrowserPackage "External package description"\n' +
      ' partial block Base\n parameter Real gain=4 "Inherited external gain";\nend Base;\n' +
      ' block Probe "External probe description"\n extends Base;\n output Real y;\nequation\n y=gain;\n' +
      ' annotation(Icon(graphics={Bitmap(extent={{-100,-100},{100,100}},' +
      'fileName="modelica://BrowserPackage/Resources/icon.svg")}));\nend Probe;\nend BrowserPackage;';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
      '<rect width="64" height="64" fill="#128ac4"/><text x="5" y="32">External</text></svg>';
    const transfer = new frame.DataTransfer();
    for(const [path, data] of [['package.mo', source], ['Resources/icon.svg', svg],
      ['Resources/data.bin', new Uint8Array(Array.from({ length: 256 }, (_, index) => index))]]) {
      const file = new frame.File([data], path.split('/').at(-1));
      Object.defineProperty(file, 'webkitRelativePath', { value: 'BrowserPackage/' + path });
      transfer.items.add(file);
    }
    const input = doc.getElementById('simulate-library-folder');
    input.files = transfer.files;
    input.dispatchEvent(new frame.Event('change'));
  });
  await gui_browser.waitFor(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    return !frame.win_simulate.busy && frame.win_simulate.imported_library_classes.some(item => item.type == 'BrowserPackage.Probe');
  }, 'external folder import', 120000);
  const labels = await gui_browser.evaluate(() => {
    jslab_web.changeLanguage('rs');
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const doc = frame.document;
    const search = doc.getElementById('simulate-library-search');
    search.value = 'BrowserPackage.Probe';
    search.dispatchEvent(new frame.Event('input'));
    const button = doc.querySelector('[data-library-type="BrowserPackage.Probe"]');
    const labels = { name: button.textContent, description: button.title };
    button.click();
    return labels;
  });
  assert.equal(labels.name, 'Probe');
  assert.equal(labels.description, 'External probe description');
  await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument.querySelector('.simulate-component image'),
    'imported SVG block icon', 30000);
  await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    frame.win_simulate.setFilePath('/workspace/browser-folder.jslmo');
    globalThis.web_folder_save = { pending: true };
    frame.win_simulate.saveModel(false).then(() => {
      globalThis.web_folder_save.pending = false;
    },
    error => {
      globalThis.web_folder_save = { pending: false, error: String(error) };
    });
  });
  await gui_browser.waitFor(() => !globalThis.web_folder_save.pending, 'external folder project save');
  const saved = await gui_browser.evaluate(() => {
    const project = JSON.parse(jslab_web.fs.readTextFileSync('/workspace/browser-folder.jslmo'));
    const files = project.libraries[0].files;
    const bytes = atob(files.find(file => file.path == 'Resources/data.bin').data);
    return { error: globalThis.web_folder_save.error, files: files.length,
      allBytes: bytes.length == 256 && Array.from(bytes).every((value, index) => value.charCodeAt(0) == index) };
  });
  assert.equal(saved.error, undefined);
  assert.equal(saved.files, 3);
  assert.equal(saved.allBytes, true);
  await gui_browser.evaluate(() => {
    jslab_web.changeLanguage('en');
    jslab_web.window_manager.close('simulate-window');
    globalThis.web_simulation_check = { running: true };
    jslab_web.sandbox_api.evaluate('await simulate("/workspace/browser-folder.jslmo", {run:true}); simulation.get("probe.y").at(-1);')
      .then(result => {
        globalThis.web_simulation_check = { running: false, result };
      },
      error => {
        globalThis.web_simulation_check = { running: false, error: String(error.stack || error) };
      });
  });
  await gui_browser.waitFor(() => !globalThis.web_simulation_check.running, 'restored external folder simulation', 120000);
  const result = await gui_browser.evaluate(() => ({ ...globalThis.web_simulation_check,
    icon: !!jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument.querySelector('.simulate-component image') }));
  assert.equal(result.error, undefined);
  assert.equal(result.result.ok, true);
  assert.equal(result.result.value, 4);
  assert.equal(result.icon, true);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 240000 });

tests.add('Web Simulate reports a real compiler diagnostic with localized severity', async function(assert) {
  await gui_browser.evaluate(() => {
    const project = { format: 'JSLAB Simulate', version: 1,
      source: 'model BrowserDiagnostic\n Real x;\nequation\n x = missingValue;\nend BrowserDiagnostic;' };
    jslab_web.fs.writeTextFileSync('/workspace/browser-diagnostic.jslmo', JSON.stringify(project));
    globalThis.web_diagnostic_check = { pending: true };
    jslab_web.sandbox_api.evaluate('await simulate("/workspace/browser-diagnostic.jslmo");')
      .then(result => {
        globalThis.web_diagnostic_check = { pending: false, result };
      },
      error => {
        globalThis.web_diagnostic_check = { pending: false, error: String(error.stack || error) };
      });
  });
  await gui_browser.waitFor(() => !globalThis.web_diagnostic_check.pending, 'diagnostic model editor', 30000);
  await gui_browser.evaluate(() => {
    jslab_web.changeLanguage('rsc');
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const doc = frame.document;
    const callback = frame.win_simulate.compiler.status_callback;
    frame.web_diagnostic_statuses = [];
    frame.win_simulate.compiler.status_callback = function(status) {
      frame.web_diagnostic_statuses.push(status);
      if(callback) {
        callback(status);
      }
    };
    doc.getElementById('simulate-check').click();
  });
  await gui_browser.waitFor(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    return !frame.win_simulate.busy && frame.document.querySelector('#simulate-output .error');
  }, 'real compiler diagnostic', 120000);
  const state = await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const doc = frame.document;
    const text = doc.querySelector('#simulate-output .error .simulate-output-text').textContent;
    jslab_web.changeLanguage('en');
    return { text, statuses: frame.web_diagnostic_statuses.filter(status => status.file),
      messagesOpen: !doc.getElementById('simulate-console').classList.contains('collapsed') };
  });
  assert.ok(state.text.includes('Грешка'), JSON.stringify(state));
  assert.ok(state.text.includes('missingValue'), state.text);
  assert.equal(state.statuses.some(status => status.file == 'index.json'), false);
  assert.equal(state.messagesOpen, true);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 150000 });

tests.add('Web Simulate creates, wires and runs a model entirely through graphical controls', async function(assert) {
  await gui_browser.resizeViewport(1440, 1000);
  await gui_browser.evaluate(() => void jslab_web.windows._openSimulateWindow());
  await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentWindow.win_simulate,
    'graphical model editor', 30000);
  await gui_browser.evaluate(() => {
    jslab_web.changeLanguage('en');
    jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument.getElementById('simulate-new').click();
  });
  await gui_browser.waitFor(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    return controller.model?.name == 'ModelName' && controller.model.components.length == 0;
  }, 'new graphical model');
  for(const [type, name, value, movement] of [
    ['Modelica.Blocks.Sources.Constant', 'constant1', '3', -220],
    ['Modelica.Blocks.Math.Gain', 'gain', '2', 140]
  ]) {
    await gui_browser.evaluate(({ type, name }) => {
      globalThis.web_created_component = name;
      const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
      const doc = frame.document;
      doc.getElementById('simulate-library-open').click();
      const search = doc.getElementById('simulate-library-search');
      search.value = type;
      search.dispatchEvent(new frame.Event('input'));
      doc.querySelector('[data-library-type="' + type + '"]').click();
    }, { type, name });
    await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
      .querySelector('[data-component="' + globalThis.web_created_component + '"] .component-icon'), 'inserted ' + name, 30000);
    const point = await gui_browser.evaluate(name => {
      const managed = jslab_web.window_manager.windows.get('simulate-window');
      const offset = managed.iframe.getBoundingClientRect();
      const box = managed.iframe.contentDocument.querySelector('[data-component="' + name + '"] .component-icon').getBoundingClientRect();
      return { x: offset.x + box.x + box.width / 2, y: offset.y + box.y + box.height / 2, width: box.width };
    }, name);
    assert.ok(point.width >= 60, 'New diagram blocks must be readable at their initial zoom');
    await gui_browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1,
      x: point.x, y: point.y });
    await gui_browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', buttons: 1, x: point.x + movement, y: point.y });
    await gui_browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1,
      x: point.x + movement, y: point.y });
    await gui_browser.evaluate(name => {
      const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
      frame.document.querySelector('[data-component="' + name + '"]').dispatchEvent(new frame.MouseEvent('dblclick', { bubbles: true }));
    }, name);
    await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
      .querySelector('[data-property="k"] input'), 'editable block gain', 30000);
    await gui_browser.evaluate(value => {
      const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
      const input = frame.document.querySelector('[data-property="k"] input');
      input.value = value;
      input.dispatchEvent(new frame.Event('input'));
      frame.document.getElementById('simulate-component-apply').click();
    }, value);
    await gui_browser.waitFor(() => jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
      .getElementById('simulate-component-dialog').hidden, 'applied block gain');
  }
  await gui_browser.waitFor(() => {
    const doc = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
    return Array.from(doc.querySelectorAll('.simulate-component[data-component="gain"] .component-icon text'))
      .some(text => text.textContent == 'k=2');
  }, 'updated block annotation value');
  const ports = await gui_browser.evaluate(() => {
    const managed = jslab_web.window_manager.windows.get('simulate-window');
    const offset = managed.iframe.getBoundingClientRect();
    return ['constant1.y', 'gain.u'].map(reference => {
      const port = managed.iframe.contentDocument.querySelector('.simulate-port[data-reference="' + reference + '"]');
      const box = port.getBoundingClientRect();
      const hit = managed.iframe.contentDocument.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return { x: offset.x + box.x + box.width / 2, y: offset.y + box.y + box.height / 2,
        reference, hit: hit && hit.outerHTML.slice(0, 300) };
    });
  });
  const captions = await gui_browser.evaluate(() => {
    const doc = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
    const block = doc.querySelector('.simulate-component[data-component="gain"]');
    const name = block.querySelector('.component-name').getBoundingClientRect();
    return Array.from(block.querySelectorAll('.component-icon text')).filter(text => text.textContent.trim()).map(text => {
      const bounds = text.getBoundingClientRect();
      return { text: text.textContent,
        overlaps: name.left < bounds.right && name.right > bounds.left && name.top < bounds.bottom && name.bottom > bounds.top };
    });
  });
  assert.ok(captions.some(caption => caption.text == 'k=2'), JSON.stringify(captions));
  assert.ok(captions.every(caption => !caption.overlaps), JSON.stringify(captions));
  const capture = await gui_browser.send('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync(require('path').join(app_path, 'temp/simulate-created-model-before-wire.png'), Buffer.from(capture.data, 'base64'));
  assert.ok(ports.every(port => String(port.hit).includes('simulate-port')), JSON.stringify(ports));
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1,
    x: ports[0].x, y: ports[0].y });
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', buttons: 1, x: ports[1].x, y: ports[1].y });
  await gui_browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1,
    x: ports[1].x, y: ports[1].y });
  const drawn = await gui_browser.evaluate(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    return { source: controller.editor.getValue(), connecting: !!controller.connection_drag, dragging: !!controller.diagram_drag };
  });
  assert.ok(drawn.source.includes('connect(constant1.y, gain.u)'), JSON.stringify(drawn));
  await gui_browser.waitFor(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    return controller.model.connections.some(connection => connection.from == 'constant1.y' && connection.to == 'gain.u');
  }, 'graphically drawn connection');
  await gui_browser.evaluate(() => {
    jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument.getElementById('simulate-simulate').click();
  });
  await gui_browser.waitFor(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    return !controller.busy && (!!controller.result || controller.output.querySelector('.error'));
  }, 'GUI-created model simulation', 120000);
  const result = await gui_browser.evaluate(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    return { values: Array.from(controller.result?.data['gain.y'] || []),
      source: controller.editor.getValue(), messages: controller.output.textContent };
  });
  assert.ok(result.values.length > 1, result.messages);
  assert.ok(Object.values(result.values).every(value => value == 6), result.messages);
  assert.ok(result.source.includes('connect(constant1.y, gain.u)'));
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 180000 });

tests.add('Web Simulate opens inside a small viewport in every language', async function(assert) {
  await gui_browser.resizeViewport(800, 650);
  for(const lang of ['en', 'rs', 'rsc']) {
    await gui_browser.evaluate(() => {
      if(!jslab_web.window_manager.close('simulate-window')) {
        jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentDocument
          .getElementById('close-dialog-discard')?.click();
      }
    });
    await gui_browser.waitFor(() => !jslab_web.window_manager.windows.has('simulate-window'),
      'previous Simulate window closed');
    await gui_browser.evaluate(lang => {
      jslab_web.changeLanguage(lang);
      void jslab_web.windows._openSimulateWindow();
    }, lang);
    await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentWindow.win_simulate,
      'small Simulate window', 30000);
    const state = await gui_browser.evaluate(() => {
      const managed = jslab_web.window_manager.windows.get('simulate-window');
      const bounds = managed.element.getBoundingClientRect();
      const area = jslab_web.window_manager.container.getBoundingClientRect();
      const menu = managed.iframe.contentDocument.getElementById('simulate-menu-container');
      return { left: bounds.left >= area.left, right: bounds.right <= area.right,
        top: bounds.top >= area.top, bottom: bounds.bottom <= area.bottom,
        menuFits: menu.scrollWidth <= menu.clientWidth };
    });
    assert.ok(Object.values(state).every(Boolean), lang + ': ' + JSON.stringify(state));
  }
  await gui_browser.evaluate(() => jslab_web.changeLanguage('en'));
  await gui_browser.resizeViewport(1440, 1000);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 90000 });

tests.add('Web native scenes follow arbitrary block dimensions and colors after parameter changes', async function(assert) {
  await gui_browser.evaluate(() => {
    for(const win of jslab_web.window_manager.windows.values()) {
      if(win.iframe.contentDocument?.getElementById('figure-content')) {
        jslab_web.window_manager.close(win.id);
      }
    }
  });
  const source = 'model NativeScenePlant\n' +
    ' parameter Real beamWidth=0.1; parameter Integer red=11;\n' +
    ' inner Modelica.Mechanics.MultiBody.World world;\n' +
    ' Modelica.Mechanics.MultiBody.Joints.Revolute pivot(phi(start=0.3,fixed=true),w(start=0,fixed=true));\n' +
    ' Modelica.Mechanics.MultiBody.Parts.BodyShape payload(r={1,0,0},m=1,r_CM={0.5,0,0},' +
    'I_11=0.1,I_22=0.1,I_33=0.1,shapeType="box",width=beamWidth,height=0.2,color={red,22,33});\n' +
    'equation connect(world.frame_b,pivot.frame_a); connect(pivot.frame_b,payload.frame_a);\nend NativeScenePlant;';
  for(const [index, width, red] of [[0, 0.1, 11], [1, 0.25, 77]]) {
    await gui_browser.evaluate(({ source, index, width, red }) => {
      if(index == 0) {
        jslab_web.fs.writeTextFileSync('/workspace/native-scene.mo', source);
      }
      globalThis.native_scene_previous_windows = new Set(jslab_web.window_manager.windows.values());
      globalThis.native_scene_check = { running: true };
      const options = { run: true, parameters: { beamWidth: width, red },
        simulation: { stop_time: 0.1, intervals: 10 }, animation: { play: false } };
      const code = 'await simulate(' + JSON.stringify(index == 0 ? '/workspace/native-scene.mo' : '') + ',' + JSON.stringify(options) + ');';
      jslab_web.sandbox_api.evaluate(code).then(result => {
        native_scene_check = { running: false, result };
      }, error => {
        native_scene_check = { running: false, error: String(error.stack || error) };
      });
    }, { source, index, width, red });
    await gui_browser.waitFor(() => !native_scene_check.running, 'native model geometry', 90000);
    const execution = await gui_browser.evaluate(() => native_scene_check);
    assert.equal(execution.error, undefined);
    assert.equal(execution.result.success, true);
    const state = await gui_browser.evaluate(red => {
      const figures = Array.from(jslab_web.window_manager.windows.values()).filter(win =>
        !native_scene_previous_windows.has(win) && win.iframe.contentDocument?.querySelector('input[type=range]'));
      const managed = figures.find(win => win.title === 'native-scene.jslmo');
      const traces = managed?.iframe.contentWindow.plot.plot_cont.data.filter(trace => trace.color == 'rgb(' + red + ',22,33)') || [];
      const edges = [];
      for(const trace of traces) {
        const distance = (a, b) => Math.hypot(...['x', 'y', 'z'].map(axis => trace[axis][a] - trace[axis][b]));
        for(let i = 0; i + 3 < trace.x.length; i++) {
          edges.push([distance(i, i + 3), distance(i, i + 1)]);
        }
      }
      const model = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
      return { edges, specular: traces[0]?.lighting.specular, figures: figures.map(win => win.title),
        output: model.output.textContent, model: model.projectFileName() };
    }, red);
    assert.ok(state.edges.some(pair => Math.abs(pair[0] - width) < 2e-6 && Math.abs(pair[1] - 0.2) < 2e-6),
      JSON.stringify({ ...state, index, width, edges: state.edges.filter(pair => pair[0] || pair[1]).slice(-28) }));
    assert.ok(Math.abs(state.specular - 0.7) < 1e-6);
  }
  assert.equal(gui_requests.filter(url => url.includes('/animation/scene-core_bg.wasm')).length, 1,
    JSON.stringify(gui_requests.filter(url => url.includes('/animation/scene-core_bg.wasm'))));
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 180000 });

tests.add('Web CAD animation loads portable library meshes and materials and survives worker closure', async function(assert) {
  await gui_browser.resizeViewport(1440, 1000);
  const result = await gui_browser.evaluate(async () => {
    const dxf = '0\nSECTION\n2\nENTITIES\n0\n3DFACE\n62\n1\n10\n0\n20\n0\n30\n0\n11\n1\n21\n0\n31\n0\n12\n0\n22\n1\n32\n0\n13\n0\n23\n1\n33\n0\n0\nENDSEC\n0\nEOF\n';
    const obj = 'mtllib colors.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl yellow\nf 1 2 3\n';
    const stl = new Uint8Array(134);
    const view = new DataView(stl.buffer);
    view.setUint32(80, 1, true);
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((value, index) => view.setFloat32(84 + index * 4, value, true));
    const chunk = (id, data) => {
      const bytes = new Uint8Array(6 + data.length);
      const view = new DataView(bytes.buffer);
      view.setUint16(0, id, true);
      view.setUint32(2, bytes.length, true);
      bytes.set(data, 6);
      return Array.from(bytes);
    };
    const name = new TextEncoder().encode('paint\0');
    const vertices = new Uint8Array(38);
    const vertexView = new DataView(vertices.buffer);
    vertexView.setUint16(0, 3, true);
    [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((value, index) => vertexView.setFloat32(2 + index * 4, value, true));
    const faces = [1, 0, 0, 0, 1, 0, 2, 0, 0, 0, ...chunk(0x4130, [...name, 1, 0, 0, 0])];
    const mesh = chunk(0x4000, [...new TextEncoder().encode('part\0'), ...chunk(0x4100,
      [...chunk(0x4110, vertices), ...chunk(0x4120, faces)])]);
    const material = chunk(0xafff, [...chunk(0xa000, name), ...chunk(0xa020, chunk(0x0011, [0, 0, 255]))]);
    const threeDS = new Uint8Array(chunk(0x4d4d, chunk(0x3d3d, [...mesh, ...material])));
    const source = 'model CadPlant\n' +
      ' inner Modelica.Mechanics.MultiBody.World world(animateWorld=false,animateGravity=false);\n' +
      ' Real clock(start=0,fixed=true);\n' +
      ['dxf', 'stl', 'obj', '3ds'].map((extension, index) => ' Modelica.Mechanics.MultiBody.Visualizers.FixedShape mesh' + index +
        '(shapeType="modelica://MeshLibrary/Resources/part.' + extension + '",r_shape={' + index * 4 + ',clock,0},length=2,width=3,height=4,extra=1,color={11,22,33});\n').join('') +
      'equation der(clock)=1;\n' + ['0', '1', '2', '3'].map(index => ' connect(world.frame_b,mesh' + index + '.frame_a);\n').join('') +
      'end CadPlant;';
    const files = [['package.mo', 'package MeshLibrary "Original external label"\nend MeshLibrary;'],
      ['Resources/part.dxf', dxf], ['Resources/part.stl', stl], ['Resources/part.obj', obj], ['Resources/part.3ds', threeDS],
      ['Resources/colors.mtl', 'newmtl yellow\nKd 1 1 0\n']].map(([path, bytes]) => {
      if(typeof bytes == 'string') {
        bytes = new TextEncoder().encode(bytes);
      }
      return { path, data: btoa(Array.from(bytes, value => String.fromCharCode(value)).join('')) };
    });
    jslab_web.fs.writeTextFileSync('/workspace/cad-plant.jslmo', JSON.stringify({ format: 'JSLAB Simulate', version: 1,
      source, libraries: [{ id: 'cad_fixture', entry: 'package.mo', roots: ['MeshLibrary'], files }] }));
    globalThis.web_cad_check = { running: true };
    jslab_web.sandbox_api.evaluate('await simulate("/workspace/cad-plant.jslmo",{run:true,simulation:{stop_time:0.1,intervals:2},animation:{play:false}});')
      .then(result => {
        web_cad_check = { running: false, result };
      },
      error => {
        web_cad_check = { running: false, error: String(error.stack || error) };
      });
    return true;
  });
  assert.equal(result, true);
  await gui_browser.waitFor(() => !web_cad_check.running, 'portable CAD animation', 120000);
  const state = await gui_browser.evaluate(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    const figure = Array.from(jslab_web.window_manager.windows.values()).filter(win => win.iframe.contentDocument?.querySelector('input[type=range]')).pop();
    const plot = figure?.iframe.contentWindow.plot.plot_cont;
    const traces = plot?.data || [];
    const vertices = traces.flatMap(trace => Array.from(trace.x, (x, index) => [x, trace.y[index], trace.z[index]]));
    const colors = traces.flatMap(trace => trace.facecolor || [trace.color]);
    const keys = Object.keys(controller.result?.scene?.resources || {});
    const errors = controller.result?.scene?.error;
    controller.compiler.close();
    const slider = figure?.iframe.contentDocument.querySelector('input[type=range]');
    if(slider) {
      slider.value = slider.max;
      slider.dispatchEvent(new figure.iframe.contentWindow.Event('input'));
    }
    return { ...web_cad_check, vertices, colors, keys, errors };
  });
  assert.equal(state.error, undefined);
  assert.equal(state.result.success, true, JSON.stringify(state));
  assert.equal(state.errors, undefined);
  assert.equal(state.keys.length, 5);
  assert.ok(state.keys.includes('modelica://MeshLibrary/Resources/colors.mtl'));
  for(const color of ['rgb(255,0,0)', 'rgb(11,22,33)', 'rgb(255,255,0)', 'rgb(0,0,255)']) {
    assert.ok(state.colors.includes(color), JSON.stringify(state));
  }
  for(const point of [[2, 0, 0], [0, 3, 0], [6, 0, 0], [4, 3, 0], [10, 0, 0], [8, 3, 0], [14, 0, 0], [12, 3, 0]]) {
    assert.ok(state.vertices.some(value => value.every((coordinate, index) => Math.abs(coordinate - point[index]) < 1e-6)), JSON.stringify({ point, state }));
  }
  await gui_browser.waitFor(() => {
    const figure = Array.from(jslab_web.window_manager.windows.values()).filter(win => win.iframe.contentDocument?.querySelector('input[type=range]')).pop();
    const viewer = figure?.iframe.contentWindow.plot;
    const traces = viewer?.mesh_animation ? viewer.mesh_animation.exportData() : viewer?.plot_cont.data;
    return traces?.some(trace => Array.from(trace.y).some(value => Math.abs(value - 3.1) < 1e-5));
  }, 'CAD frame after solver worker closure');
  const exported = await gui_browser.evaluate(async () => {
    const figure = Array.from(jslab_web.window_manager.windows.values()).filter(win => win.iframe.contentDocument?.querySelector('input[type=range]')).pop();
    const viewer = figure.iframe.contentWindow.plot;
    const mesh = viewer.mesh_animation?.entries[0].mesh;
    const serialized = viewer.toJSON();
    const json = typeof serialized == 'string' ? JSON.parse(serialized) : serialized;
    const png = await viewer.toImage('png', [480, 360]);
    return { png, array: Array.isArray(json.data[0].x),
      current: json.data.some(trace => trace.y.some(value => Math.abs(value - 3.1) < 1e-5)),
      retained: !viewer.mesh_animation || viewer.mesh_animation.entries[0].mesh === mesh };
  });
  assert.ok(exported.array && exported.current && exported.retained,
    JSON.stringify({ array: exported.array, current: exported.current, retained: exported.retained }));
  assert.ok(exported.png.startsWith('data:image/png;base64,') && exported.png.length > 3000);
  require('fs').writeFileSync(require('path').join(app_path, 'temp/simulate-rigid-export.png'),
    Buffer.from(exported.png.split(',')[1], 'base64'));
  const capture = await gui_browser.send('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync(require('path').join(app_path, 'temp/simulate-cad-meshes.png'), Buffer.from(capture.data, 'base64'));
  assert.equal(gui_requests.filter(url => url.includes('/animation/scene-core_bg.wasm')).length, 1,
    JSON.stringify(gui_requests.filter(url => url.includes('/animation/scene-core_bg.wasm'))));
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 180000 });

tests.add('Web Simulate imports a standalone source folder with icons and CAD resources through an entry selector', async function(assert) {
  await gui_browser.resizeViewport(1440, 1000);
  await gui_browser.evaluate(() => void jslab_web.windows._openSimulateWindow());
  await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentWindow.win_simulate,
    'standalone folder editor', 30000);
  await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const doc = frame.document;
    doc.getElementById('simulate-new').click();
    doc.getElementById('simulate-library-open').click();
    const source = 'model ZAsset "Original external model description"\n' +
      ' inner Modelica.Mechanics.MultiBody.World world(animateWorld=false,animateGravity=false);\n' +
      ' output Real y; Real clock(start=0,fixed=true);\n' +
      ' Modelica.Mechanics.MultiBody.Visualizers.FixedShape shape(shapeType="modelica://ZAsset/Resources/body.obj",length=1,width=1,height=1,r_shape={clock,0,0});\n' +
      'equation der(clock)=1; y=5; connect(world.frame_b,shape.frame_a);\n' +
      ' annotation(Icon(graphics={Bitmap(extent={{-100,-100},{100,100}},fileName="modelica://ZAsset/Resources/icon.svg")}));\nend ZAsset;';
    const transfer = new frame.DataTransfer();
    for(const [path, data] of [['ZAsset.mo', source], ['AUnused.mo', 'block AUnused\noutput Real y;\nequation y=999;\nend AUnused;'],
      ['Resources/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#19a461"/></svg>'],
      ['Resources/body.obj', 'mtllib colors.mtl\nv 0 0 0\nv 1 0 0\nv 0 1 0\nusemtl pink\nf 1 2 3\n'],
      ['Resources/colors.mtl', 'newmtl pink\nKd 1 0.2 0.5\n']]) {
      const file = new frame.File([data], path.split('/').at(-1));
      Object.defineProperty(file, 'webkitRelativePath', { value: 'LooseParts/' + path });
      transfer.items.add(file);
    }
    const input = doc.getElementById('simulate-library-folder');
    input.files = transfer.files;
    input.dispatchEvent(new frame.Event('change'));
  });
  await gui_browser.waitFor(() => !jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
    .getElementById('simulate-library-entry-choice').hidden, 'source entry selector', 30000);
  const choices = await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    return { entries: Array.from(frame.document.getElementById('simulate-library-entry').options, option => option.value),
      count: frame.win_simulate.project_libraries.length };
  });
  assert.deepEqual(choices.entries, ['AUnused.mo', 'ZAsset.mo']);
  assert.equal(choices.count, 0);
  for(const [lang, expected] of [['en', 'Source file'], ['rs', 'Izvorna datoteka'], ['rsc', 'Изворна датотека']]) {
    const label = await gui_browser.evaluate(lang => {
      jslab_web.changeLanguage(lang);
      return jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
        .querySelector('label[for="simulate-library-entry"]').textContent;
    }, lang);
    assert.equal(label, expected);
  }
  await gui_browser.evaluate(selectSimulateEntry, 'ZAsset.mo');
  await gui_browser.waitFor(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    return !controller.busy && controller.imported_library_classes.some(item => item.type == 'ZAsset');
  }, 'standalone source folder import', 120000);
  for(const lang of ['en', 'rs', 'rsc']) {
    const label = await gui_browser.evaluate(lang => {
      jslab_web.changeLanguage(lang);
      const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
      const search = frame.document.getElementById('simulate-library-search');
      search.value = 'ZAsset';
      search.dispatchEvent(new frame.Event('input'));
      const button = frame.document.querySelector('[data-library-type="ZAsset"]');
      return { name: button?.textContent, description: button?.title };
    }, lang);
    assert.equal(label.name, 'ZAsset');
    assert.equal(label.description, 'Original external model description');
  }
  await gui_browser.evaluate(() => {
    jslab_web.changeLanguage('en');
    jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument.querySelector('[data-library-type="ZAsset"]').click();
  });
  await gui_browser.waitFor(() => !!jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument.querySelector('.simulate-component image'),
    'standalone source icon', 30000);
  await gui_browser.evaluate(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    controller.setFilePath('/workspace/standalone-assets.jslmo');
    globalThis.web_standalone_assets = { pending: true };
    controller.saveModel(false).then(() => {
      web_standalone_assets.pending = false;
    },
    error => {
      web_standalone_assets = { pending: false, error: String(error) };
    });
  });
  await gui_browser.waitFor(() => !web_standalone_assets.pending, 'portable standalone resource save');
  const saved = await gui_browser.evaluate(() => {
    const project = JSON.parse(jslab_web.fs.readTextFileSync('/workspace/standalone-assets.jslmo'));
    return { ...web_standalone_assets, entry: project.libraries[0].entry,
      roots: project.libraries[0].roots, files: project.libraries[0].files.length,
      component: jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate.model.components.find(item => item.type == 'ZAsset').name };
  });
  assert.equal(saved.error, undefined);
  assert.equal(saved.entry, 'ZAsset.mo');
  assert.equal(saved.files, 5);
  assert.deepEqual(saved.roots, ['ZAsset']);
  await gui_browser.evaluate(component => {
    jslab_web.window_manager.close('simulate-window');
    globalThis.web_standalone_assets = { pending: true };
    jslab_web.sandbox_api.evaluate('await simulate("/workspace/standalone-assets.jslmo",{run:true,simulation:{stop_time:0.1,intervals:2},animation:{play:false}});' +
      'simulation.get(' + JSON.stringify(component + '.y') + ').at(-1);').then(result => {
      web_standalone_assets = { pending: false, result };
    }, error => {
      web_standalone_assets = { pending: false, error: String(error.stack || error) };
    });
  }, saved.component);
  await gui_browser.waitFor(() => !web_standalone_assets.pending, 'restored standalone model with CAD', 120000);
  const final = await gui_browser.evaluate(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    const figure = Array.from(jslab_web.window_manager.windows.values()).filter(win => win.iframe.contentDocument?.querySelector('input[type=range]')).pop();
    return { ...web_standalone_assets, errorDetails: controller.result?.scene?.error,
      resources: Object.keys(controller.result?.scene?.resources || {}),
      colors: figure?.iframe.contentWindow.plot.plot_cont.data.flatMap(trace => trace.facecolor || [trace.color]) };
  });
  assert.equal(final.error, undefined);
  assert.equal(final.errorDetails, undefined);
  assert.equal(final.result.ok, true);
  assert.equal(final.result.value, 5);
  assert.deepEqual(final.resources.sort(), ['modelica://ZAsset/Resources/body.obj', 'modelica://ZAsset/Resources/colors.mtl']);
  assert.ok(final.colors.includes('rgb(255,51,128)'), JSON.stringify(final));
  await gui_browser.evaluate(() => {
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    frame.document.getElementById('simulate-library-open').click();
    const project = JSON.parse(jslab_web.fs.readTextFileSync('/workspace/standalone-assets.jslmo'));
    const transfer = new frame.DataTransfer();
    for(const entry of project.libraries[0].files) {
      let source = atob(entry.data);
      if(entry.path == 'ZAsset.mo') {
        source = source.replace('y=5;', 'y=7;').replace('Original external model description', 'Updated external model description');
      }
      if(entry.path.endsWith('icon.svg')) {
        source = source.replace('#19a461', '#dc2392');
      }
      if(entry.path.endsWith('body.obj')) {
        source = source.replace('v 1 0 0', 'v 2 0 0');
      }
      if(entry.path.endsWith('colors.mtl')) {
        source = source.replace('Kd 1 0.2 0.5', 'Kd 0.1 0.8 0.2');
      }
      const file = new frame.File([source], entry.path.split('/').at(-1));
      Object.defineProperty(file, 'webkitRelativePath', { value: 'UpdatedParts/' + entry.path });
      transfer.items.add(file);
    }
    const input = frame.document.getElementById('simulate-library-folder');
    input.files = transfer.files;
    input.dispatchEvent(new frame.Event('change'));
  });
  await gui_browser.waitFor(() => !jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument
    .getElementById('simulate-library-entry-choice').hidden, 'updated source selection', 30000);
  await gui_browser.evaluate(selectSimulateEntry, 'ZAsset.mo');
  await gui_browser.waitFor(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
    return !controller.busy && controller.imported_library_classes.some(item => item.type == 'ZAsset' && item.description == 'Updated external model description');
  }, 'updated external class metadata', 90000);
  await gui_browser.waitFor(() => {
    const doc = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
    return Array.from(doc.querySelectorAll('.simulate-component image')).some(image => {
      const url = image.getAttribute('href') || '';
      return url.startsWith('data:') && atob(url.split(',')[1]).includes('#dc2392');
    });
  }, 'updated external block icon', 30000);
  for(const reopen of [false, true]) {
    await gui_browser.evaluate(async ({ component, reopen }) => {
      const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
      if(reopen) {
        await frame.win_simulate.saveModel(false);
        jslab_web.window_manager.close('simulate-window');
      } else {
        frame.document.getElementById('simulate-library-close').click();
      }
      globalThis.web_standalone_assets = { pending: true };
      jslab_web.sandbox_api.evaluate('await simulate(' + JSON.stringify(reopen ? '/workspace/standalone-assets.jslmo' : '') +
        ',{run:true,simulation:{stop_time:0.1,intervals:2},animation:{play:false}}); simulation.get(' + JSON.stringify(component + '.y') + ').at(-1);')
        .then(result => {
          web_standalone_assets = { pending: false, result };
        },
        error => {
          web_standalone_assets = { pending: false, error: String(error.stack || error) };
        });
    }, { component: saved.component, reopen });
    await gui_browser.waitFor(() => !web_standalone_assets.pending, 'updated standalone simulation', 120000);
    const updated = await gui_browser.evaluate(() => {
      const controller = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow.win_simulate;
      const figure = Array.from(jslab_web.window_manager.windows.values()).filter(win => win.iframe.contentDocument?.querySelector('input[type=range]')).pop();
      return { ...web_standalone_assets, libraries: controller.project_libraries.length, roots: controller.project_libraries[0].roots,
        colors: figure?.iframe.contentWindow.plot.plot_cont.data.flatMap(trace => trace.facecolor || [trace.color]),
        vertices: figure?.iframe.contentWindow.plot.plot_cont.data.flatMap(trace => Array.from(trace.x)) };
    });
    assert.equal(updated.error, undefined);
    assert.equal(updated.result.ok, true);
    assert.equal(updated.result.value, 7);
    assert.equal(updated.libraries, 1);
    assert.deepEqual(updated.roots, ['ZAsset']);
    assert.ok(updated.colors.includes('rgb(26,204,51)'), JSON.stringify(updated));
    assert.ok(updated.vertices.some(value => Math.abs(value - 2) < 1e-6), JSON.stringify(updated));
  }
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 240000 });

tests.add('Web Simulate resolves inherited diagrams with the real compiler and keeps unplaced components in the tree', async function(assert) {
  await gui_browser.evaluate(() => {
    globalThis.inherited_diagram_test = { pending: true };
    (async () => {
      await jslab_web.windows._openSimulateWindow();
      const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
      const controller = frame.win_simulate;
      controller.editor.setValue('model ModelName\n model Base\n parameter Real scale=2;\n Modelica.Blocks.Math.Gain gain(k=scale) annotation(Placement(transformation(extent={{-10,-10},{10,10}})));\n end Base;\n extends Base(scale=3);\n Modelica.Blocks.Math.Gain unplaced;\nend ModelName;');
      clearTimeout(controller.parse_timer);
      await controller.parseModel();
      const gain = controller.model && controller.model.components.find(item => item.name == 'gain');
      inherited_diagram_test = { pending: false, error: controller.model ? null : controller.output.textContent,
        inherited: gain && gain.inherited, type: gain && gain.type, x: gain && gain.placement.x,
        tree: !!frame.document.querySelector('.simulate-tree-item[data-component="unplaced"]'),
        parameter: controller.model && controller.model.parameters.some(item => item.name == 'scale' && item.inherited && item.value == '3') };
    })().catch(error => { inherited_diagram_test = { pending: false, error: String(error.stack || error) }; });
  });
  await gui_browser.waitFor(() => !inherited_diagram_test.pending, 'inherited compiler diagram', 120000);
  const result = await gui_browser.evaluate(() => inherited_diagram_test);
  assert.equal(result.error, null, JSON.stringify(result));
  assert.equal(result.inherited, true);
  assert.equal(result.type, 'Modelica.Blocks.Math.Gain');
  assert.equal(result.x, 0);
  assert.equal(result.tree, true);
  assert.equal(result.parameter, true);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 150000 });

tests.add('Bundled 6-DOF animation opens its graphical playback controls', async function(assert) {
  const previous = await gui_browser.evaluate(() => Array.from(jslab_web.window_manager.windows.keys()));
  const result = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate(
    'await getExamples(); await run("/workspace/examples/animateSimulateExample.jsl", undefined, false, true); true;'));
  assert.equal(result.ok, true, JSON.stringify(result));
  await gui_browser.waitFor(previous => Array.from(jslab_web.window_manager.windows.values()).some(win => {
    const controls = win.iframe.contentDocument?.querySelector('.ui-animation');
    return !previous.includes(win.id) && win.title === 'simulate-6dof.jslmo' &&
      controls?.getBoundingClientRect().height > 0 && controls.querySelector('.ui-animation-slider');
  }), '6-DOF playback controls are visible', 30000, previous);
  const animation = await gui_browser.evaluate(previous => Array.from(jslab_web.window_manager.windows.values())
    .find(win => !previous.includes(win.id) && win.title === 'simulate-6dof.jslmo' &&
      win.iframe.contentDocument?.querySelector('.ui-animation-slider')).id, previous);
  await gui_browser.click('.ui-animation-play', '[data-window-id=' + JSON.stringify(animation) + '] iframe');
  await gui_browser.evaluate(async id => {
    await jslab_web.sandbox_api.evaluate('await close(' + JSON.stringify(Number(id)) + ');');
    jslab_web.window_manager.close('simulate-window');
  }, animation);
}, { tags: ['gui', 'web', 'simulate'], timeout_ms: 120000 });

tests.add('Web Simulate unload settles pending requests and removes host listeners', async function(assert) {
  const result = await gui_browser.evaluate(async () => {
    await jslab_web.windows._openSimulateWindow();
    const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentWindow;
    const { host } = await frame.__JSLAB_WEB_SIMULATE_READY__;
    const settled = new Promise(resolve => {
      host._automation = { resolve };
    });
    frame.dispatchEvent(new frame.Event('beforeunload'));
    const response = await settled;
    const state = { success: response.success, listeners: host._listeners.size, pending: host._automation };
    jslab_web.window_manager.close('simulate-window');
    return state;
  });
  assert.deepEqual(result, { success: false, listeners: 0, pending: null });
}, { tags: ['gui', 'web', 'integration'] });

exports.MODULE_TESTS = tests;
