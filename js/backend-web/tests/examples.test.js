/**
 * @file JSLAB Web examples folder integration
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { win32 } = require('node:path');
const tests = new PRDC_JSLAB_TESTS();

if(globalThis.gui_browser) {
  tests.add('Web JSON scene example attaches its mesh and animates without a late error', async function(assert) {
    const opened = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate(
      'var example_root = await getExamplesFolder(); cd(example_root); await run("window3DFromJson.jsl"); true;'));
    assert.equal(opened.value, true);
    try {
      await gui_browser.waitFor(() => {
        const figure = [...jslab_web.window_manager.windows.values()].find(window =>
          window.iframe.contentWindow.scene?.children?.length);
        const cube = figure?.iframe.contentWindow.scene?.children[0];
        if(!cube) return false;
        if(figure.json_scene_initial_angle === undefined) figure.json_scene_initial_angle = cube.rotation.y;
        return cube.rotation.y !== figure.json_scene_initial_angle;
      }, 'the loaded cube changes rotation', 10000);
    } catch(error) {
      const state = await gui_browser.evaluate(() => ({
        figures: [...jslab_web.window_manager.windows.values()].map(({ iframe }) => ({
          title: iframe.contentDocument.title, scene: iframe.contentWindow.scene?.type,
          rotation: iframe.contentWindow.scene?.children?.[0]?.rotation.y
        })), messages: jslab_web.main.command_window.log.slice(-8).map(entry => entry.data)
      }));
      throw Error(error.message + ' ' + JSON.stringify(state));
    } finally {
      await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('closeWindows("all");'));
    }
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 25000 });

  tests.add('Web path commands match desktop for names, extensions and identical paths', async function(assert) {
    const files = ['project/chapter.tex', '/workspace/photos/archive.tar.gz', '/workspace/.gitignore', 'file.', 'folder/..'];
    const result = await gui_browser.evaluate(paths => jslab_web.sandbox_api.evaluate(
      'JSON.stringify({ files: ' + JSON.stringify(paths) + '.map(file => [pathBaseName(file), pathFileName(file), pathExtName(file)]), ' +
      'relative: pathRelative("/workspace/figures", "/workspace/./figures") })'), files);
    assert.equal(result.ok, true);
    assert.deepEqual(JSON.parse(result.value), {
      files: files.map(file => [win32.basename(file), win32.parse(file).name, win32.extname(file)]),
      relative: win32.relative('/workspace/figures', '/workspace/./figures')
    });
  }, { tags: ['gui', 'web', 'integration'] });

  tests.add('Web examples open from the Command Window and launch LaTeX Editor and Simulate', async function(assert) {
    const root = '/workspace/examples';
    const legacy = await gui_browser.evaluate(() => {
      jslab_web._setCurrentPath('/workspace');
      return jslab_web.sandbox_api.evaluate('await editLatex("resources/latex-project")');
    });
    assert.equal(legacy.value, true);
    const opened = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('await openExamplesFolder()'));
    assert.equal(opened.value, root);
    const state = await gui_browser.evaluate(async root => {
      const fs = jslab_web.fs;
      const project = root + '/resources/latex-project/';
      const pdf_image = await fs.readBytes(project + 'images/example.pdf');
      return {
        directory: jslab_web.current_path,
        latex: fs.existsFileSync(project + 'sections/figures.tex'),
        images: fs.readDirSync(project + 'images').sort(),
        pdf_image: new TextDecoder().decode(pdf_image.slice(0, 5)),
        generated: ['main.pdf', 'main.log'].some(file => fs.existsFileSync(project + file)),
        simulation: fs.existsFileSync(root + '/resources/simulate-6dof.jslmo')
      };
    }, root);
    assert.deepEqual(state, { directory: root + '/', latex: true,
      images: ['example.jpg', 'example.pdf', 'example.png'], pdf_image: '%PDF-', generated: false, simulation: true });

    const relative = await gui_browser.evaluate(() =>
      jslab_web.sandbox_api.evaluate('await editLatex("resources/latex-project")'));
    assert.equal(relative.value, true, JSON.stringify(relative));
    const launch = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate(
      'await run("openLatexEditor.jsl"); await run("openSimulateExample.jsl"); true;'));
    assert.equal(launch.ok, true, JSON.stringify(launch));
    await gui_browser.waitFor(() => {
      const windows = jslab_web.window_manager.windows;
      const latex_window = windows.get('latex-editor-window');
      const simulate_window = windows.get('simulate-window');
      const latex = latex_window?.iframe.contentDocument;
      const simulate = simulate_window?.iframe.contentWindow.win_simulate;
      return latex?.getElementById('source-title').textContent === 'main.tex' &&
        simulate?.file_path?.endsWith('/examples/resources/simulate-6dof.jslmo') &&
        [latex_window, simulate_window].every(win => win.element.querySelector('.web-window-icon')?.naturalWidth > 0);
    }, 'both bundled example projects are open', 30000);
    const snippet = await gui_browser.evaluate(async () => {
      jslab_web._setCurrentPath('/workspace');
      const code = jslab_web.fs.readTextFileSync('/workspace/examples/openLatexEditor.jsl');
      return jslab_web.sandbox_api.evaluate(code);
    });
    assert.equal(snippet.ok, true, JSON.stringify(snippet));
    const invalid = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate(
      'JSON.stringify([await compileLatex("missing-project/main.tex"), await editLatex("missing-project")])'));
    assert.deepEqual(JSON.parse(invalid.value), [false, false]);

    const preserved = await gui_browser.evaluate(async root => {
      const filename = root + '/animation-controls.jsl';
      const original = jslab_web.fs.readTextFileSync(filename);
      const edited = original + '\n// Workspace edit.\n';
      await jslab_web.fs.writeTextFile(filename, edited);
      try {
        const listing = await jslab_web.sandbox_api.evaluate('JSON.stringify(await getExamples())');
        return { files: listing.ok ? JSON.parse(listing.value) : listing,
          edited: jslab_web.fs.readTextFileSync(filename) === edited };
      } finally {
        await jslab_web.fs.writeTextFile(filename, original);
      }
    }, root);
    if(Array.isArray(preserved.files)) preserved.files.sort();
    assert.deepEqual(preserved, { edited: true, files: ['plot2D.jsl', 'plot3D.jsl', 'plotPlotlyjs.jsl',
      'basicVectorMatrixMath.jsl', 'animation-controls.jsl', 'animateSimulateExample.jsl',
      'exampleDebugger.jsl', 'openLatexEditor.jsl', 'openSimulateExample.jsl', 'animPlot2D.jsl', 'animPlotById2D.jsl',
      'exampleParallel.jsl', 'exampleWorkspaceSaveLoad.jsl', 'showGridData.jsl', 'plotVectors3D.jsl',
      'exampleVectorMatrixMath.jsl', 'exampleSymMath.jsl', 'showAvailablePorts.jsl', 'window3D.jsl',
      'window3DFromJson.jsl', 'codebaseMerge.jsl', 'compileLaTeX.jsl', 'sanitizeLatexUnicode.jsl',
      'simulateMP6DOF.jsl', 'showGamepad.jsl'].sort().map(file => root + '/' + file) });
    const simulate_window = '[data-window-id="simulate-window"]';
    const simulate_frame = simulate_window + ' iframe';
    await gui_browser.evaluate(() => {
      jslab_web.window_manager.focus('simulate-window');
      const frame = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
      frame.getElementById('simulate-stop-time').value = '123';
    });
    const close_button = simulate_window + ' .web-window-action.close';
    await gui_browser.click(close_button);
    await gui_browser.waitFor(selector => !document.querySelector(selector).contentDocument
      .getElementById('close-dialog-cont').hidden, 'modified Simulate project prompt', 5000, simulate_frame);
    const layout = await gui_browser.evaluate(selector => {
      const frame = document.querySelector(selector);
      const doc = frame.contentDocument;
      const overlay = doc.getElementById('close-dialog-cont');
      const bounds = overlay.getBoundingClientRect();
      const window = frame.parentElement;
      const content_height = window.clientHeight - window.querySelector('.web-window-header').offsetHeight;
      return {
        dialog: overlay.tagName,
        filename: doc.getElementById('close-file').textContent,
        viewport: Math.abs(bounds.left) < 1 && Math.abs(bounds.top) < 1 &&
          Math.abs(bounds.width - frame.contentWindow.innerWidth) < 1 &&
          Math.abs(bounds.height - frame.contentWindow.innerHeight) < 1,
        document: Math.abs(frame.getBoundingClientRect().height - content_height) < 1 &&
          doc.getElementById('simulate-diagram').clientHeight === doc.getElementById('simulate-workspace').clientHeight,
        inert: doc.getElementById('simulate-workspace').inert,
        dimensions: [bounds.left, bounds.top, bounds.width, bounds.height,
          frame.contentWindow.innerWidth, frame.contentWindow.innerHeight]
      };
    }, simulate_frame);
    const { dimensions, ...dialog } = layout;
    assert.ok(dialog.viewport, JSON.stringify(dimensions));
    assert.deepEqual(dialog, { dialog: 'DIV', filename: 'simulate-6dof.jslmo', viewport: true, document: true, inert: true });
    await gui_browser.click('#close-dialog-cancel', simulate_frame);
    await gui_browser.waitFor(selector => document.querySelector(selector)?.contentDocument
      .getElementById('close-dialog-cont').hidden, 'cancel keeps Simulate open', 5000, simulate_frame);
    await gui_browser.click(close_button);
    await gui_browser.waitFor(selector => !document.querySelector(selector).contentDocument
      .getElementById('close-dialog-cont').hidden, 'second modified project prompt', 5000, simulate_frame);
    await gui_browser.click('#close-dialog-discard', simulate_frame);
    await gui_browser.evaluate(() => {
      const manager = jslab_web.window_manager;
      manager.close('latex-editor-window');
      jslab_web._setCurrentPath('/workspace');
    });
    await gui_browser.waitFor(() => !jslab_web.window_manager.windows.has('latex-editor-window') &&
      !jslab_web.window_manager.windows.has('simulate-window'), 'the example editors closed');
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 45000 });

  tests.add('Web examples render live plots and round-trip parallel and workspace data', async function(assert) {
    const evaluate = code => gui_browser.evaluate(code => jslab_web.sandbox_api.evaluate(code), code);
    const run = (file, expression) => evaluate('await run(' + JSON.stringify(file) + '); ' + expression);
    await evaluate('await openExamplesFolder()');
    try {
      for(const file of ['animPlot2D.jsl', 'animPlotById2D.jsl']) {
        assert.equal((await run(file, 'true;')).value, true);
        await gui_browser.waitFor(() => jslab_web.sandbox_api.evaluate('Number.isFinite(x.at(-1)) && x.at(-1) > t')
          .then(result => result.value === true), 'animated data updates');
        await evaluate('clearInterval(plot_timer); close("all");');
      }
      assert.equal((await run('showGridData.jsl', 'zi.some(row => row.some(Number.isFinite));')).value, true);
      await gui_browser.waitFor(() => [...jslab_web.window_manager.windows.values()].some(win =>
        win.iframe.contentWindow.plot?.plot_cont?.data?.some(trace => trace.type === 'heatmap')), 'grid heatmap renders');
      assert.equal((await run('exampleParallel.jsl', 'results.length === 21 && results[20] === 400;')).value, true);
      assert.equal((await run('exampleWorkspaceSaveLoad.jsl',
        'restored_object.peer.peer === restored_object && restored_object.tags.includes("seed");')).value, true);
    } finally {
      await evaluate('parallel.terminate(); close("all"); cd("/workspace");');
    }
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 90000 });

  tests.add('Web runs the bundled plotting and vector examples', async function(assert) {
    const run = code => gui_browser.evaluate(code => jslab_web.sandbox_api.evaluate(code), code);
    const plot2d = await run('await openExamplesFolder(); await run("plot2D.jsl"); true;');
    assert.equal(plot2d.ok, true, JSON.stringify(plot2d));
    const exports = await gui_browser.evaluate(async () => {
      const root = '/workspace/examples/out/plot2D';
      const png = await jslab_web.fs.readBytes(root + '.png');
      const pdf = await jslab_web.fs.readBytes(root + '.pdf');
      return { png: Array.from(png.slice(0, 4)), pdf: new TextDecoder().decode(pdf.slice(0, 5)) };
    });
    assert.deepEqual(exports, { png: [137, 80, 78, 71], pdf: '%PDF-' });
    const plot3d = await run('await run("/workspace/examples/plot3D.jsl"); true;');
    assert.equal(plot3d.ok, true, JSON.stringify(plot3d));
    await gui_browser.waitFor(() => Array.from(jslab_web.window_manager.windows.values()).some(win =>
      win.iframe.contentWindow.plot?.plot_cont?.data?.some(trace => trace.type === 'scatter3d' && trace.z?.length > 0)),
    'The 3D helix was rendered');
    const plotly = await run('await run("/workspace/examples/plotPlotlyjs.jsl"); true;');
    assert.equal(plotly.ok, true, JSON.stringify(plotly));
    await gui_browser.waitFor(() => Array.from(jslab_web.window_manager.windows.values()).some(win => {
      const plot = win.iframe.contentDocument?.getElementById('plot-cont');
      return plot?.layout?.title?.text === 'Example plot' && plot.data?.some(trace => trace.yaxis === 'y2');
    }), 'dual-axis Plotly figure rendered');
    const vectors = await run('await run("/workspace/examples/basicVectorMatrixMath.jsl"); JSON.stringify([vector_dot, matrix_sum.toArray()]);');
    assert.equal(vectors.ok, true, JSON.stringify(vectors));
    assert.deepEqual(JSON.parse(vectors.value), [38, [[6, 8], [10, 12]]]);
    await run('cd("/workspace")');
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 45000 });

  tests.add('Web uses desktop math libraries and resolves CommonJS modules from the script and saved paths', async function(assert) {
    const result = await gui_browser.evaluate(async () => {
      const app = jslab_web;
      const root = '/workspace/example-modules';
      await app.fs.writeTextFile(root + '/helpers/local.jsl', 'module.exports = [__filename, __dirname];');
      await app.fs.writeTextFile(root + '/helpers/saved.jsl', 'module.exports = 42;');
      await app.fs.writeTextFile(root + '/scripts/main.jsl',
        'var moduleAudit = [...require("../helpers/local.jsl"), require("saved.jsl"), ' +
        'mat.new([[1, 2], [3, 4]]).det(), optimNelderMead(x => x[0] * x[0], [2]).x[0]]; ' +
        'unrequire("saved.jsl");');
      try {
        app.main.folder_navigation.savePath(root + '/helpers');
        return (await app.sandbox_api.evaluate('await run("' + root + '/scripts/main.jsl", undefined, false, true); JSON.stringify(moduleAudit);')).value;
      } finally {
        app.main.folder_navigation.removePath(root + '/helpers');
      }
    });
    const [filename, dirname, saved, determinant, minimum] = JSON.parse(result);
    assert.equal(filename, '/workspace/example-modules/helpers/local.jsl');
    assert.equal(dirname, '/workspace/example-modules/helpers');
    assert.equal(saved, 42);
    assert.equal(determinant, -2);
    assert.ok(Math.abs(minimum) < 1e-4);
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 45000 });

  tests.add('Web scripts can read a newly selected file before the command completes', async function(assert) {
    const value = await gui_browser.evaluate(async () => {
      const app = jslab_web;
      const picker = window.showOpenFilePicker;
      const support = app.runtime_info.supports_open_picker;
      try {
        app.runtime_info.supports_open_picker = true;
        window.showOpenFilePicker = async () => [{ name: 'script-picker.txt', kind: 'file',
          getFile: async () => new File(['picker data'], 'script-picker.txt') }];
        return (await app.sandbox_api.evaluate('var [scriptPickerPath] = await chooseFile(); readFile(scriptPickerPath, { encoding: "utf8" });')).value;
      } finally {
        window.showOpenFilePicker = picker;
        app.runtime_info.supports_open_picker = support;
      }
    });
    assert.equal(value, 'picker data');
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 45000 });
}

exports.MODULE_TESTS = tests;
