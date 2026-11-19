/**
 * @file Browser settings and OPFS persistence across a real page reload
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) {
  exports.MODULE_TESTS = tests;
  return;
}
tests.add('web page reload restores settings and actual OPFS document content', async function(assert) {
  await gui_browser.evaluate(async () => {
    document.getElementById('settings-menu').click();
    document.getElementById('history-max-input').value = '41';
    document.getElementById('settings-apply-button').click();
    await jslab_web.fs.writeTextFile('/workspace/gui-persistence.jsl', '// survives browser reload');
  });
  gui_hit_archive.push(...await gui_browser.evaluate(() => globalThis.__JSLAB_GUI_HITS__));
  await gui_browser.send('Page.reload', { ignoreCache: true });
  await gui_browser.waitFor(() => document.body &&
    document.body.dataset.jslabWebReady === 'true', 'reload startup');
  var state = await gui_browser.evaluate(() => ({
    history: jslab_web.history_max,
    text: jslab_web.fs.readTextFileSync('/workspace/gui-persistence.jsl')
  }));
  assert.equal(state.history, 41);
  assert.equal(state.text, '// survives browser reload');
  await assert.rejects(() => gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate(
    'throw Error("sandbox error after reload");')), /sandbox error after reload/);
}, { tags: ['gui', 'web', 'integration'], timeout_ms: 20000,
  expected_command_errors: [/^Error: sandbox error after reload\n/] });
tests.add('Web resetApp honors editor cancel, save and discard before reloading', async function(assert) {
  const editor = '[data-window-id="jslab-web-editor"] iframe';
  const latex = '[data-window-id="latex-editor-window"] iframe';
  const presentation = '[data-window-id="reset-presentation"] iframe';
  const simulate = '[data-window-id="simulate-window"] iframe';
  await gui_browser.evaluate(async () => {
    globalThis.reload_probe = true;
    const app = jslab_web;
    document.getElementById('settings-menu').click();
    document.getElementById('history-max-input').value = '41';
    document.getElementById('settings-apply-button').click();
    await app.fs.writeTextFile('/workspace/reset-script.jsl', '// saved script');
    await app.fs.writeTextFile('/workspace/reset-tex/main.tex', '\\documentclass{article}');
    const editor = await app.windows._openEditorWindow('/workspace/reset-script.jsl');
    const manager = editor.iframe.contentWindow.win_editor.script_manager;
    manager.getScriptByPath('/workspace/reset-script.jsl')[0].code_editor.setValue('// edited script');
    await app.windows._openLatexEditor('/workspace/reset-tex');
  });
  await gui_browser.waitFor(() => jslab_web.window_manager.windows.get('latex-editor-window').iframe.contentDocument
    .getElementById('source-title').textContent === 'main.tex', 'reload LaTeX project ready');
  await gui_browser.evaluate(async () => {
    const app = jslab_web;
    const controller = await app.window_manager.windows.get('latex-editor-window').iframe.contentWindow.__JSLAB_WEB_LATEX_READY__;
    controller.code.setValue('Discard this edit');
    await app.sandbox_api.evaluate('resetApp();');
  });
  const waitForDialog = selector => gui_browser.waitFor(frame => {
    return document.querySelector(frame)?.contentDocument.getElementById('close-dialog-cont')?.hidden === false;
  }, 'unsaved changes before resetApp', 5000, selector);
  await waitForDialog(editor);
  await gui_browser.click('#close-dialog-discard', editor);
  await waitForDialog(latex);
  await gui_browser.click('#close-dialog-cancel', latex);
  await gui_browser.waitFor(() => !jslab_web.runtime.resetting_app, 'reset cancellation');
  assert.equal(await gui_browser.evaluate(() => globalThis.reload_probe), true);
  assert.equal(await gui_browser.evaluate(() => jslab_web.fs.readTextFileSync('/workspace/reset-script.jsl')), '// saved script');

  await gui_browser.evaluate(async () => {
    const app = jslab_web;
    const project = '/workspace/reset-presentation';
    await app.fs.writeTextFile(project + '/index.html', '<html><body><slides><slide>Original</slide></slides></body></html>');
    await app.fs.writeTextFile(project + '/main.js', '// saved presentation');
    await app.fs.writeTextFile(project + '/main.css', '');
    await app.fs.writeTextFile(project + '/res/internal/config.json', '{"slide_width":1280,"slide_height":720}');
    const presentation = await app.windows.openManagedWindow('reset-presentation', 'presentation-editor.html').ready;
    presentation.presentation_editor.setPath(project);
    presentation.presentation_editor.js_editor.code_editor.setValue('// edited presentation');
    const model = '/workspace/reset-model.jslmo';
    await app.fs.writeTextFile(model, JSON.stringify({ format: 'JSLAB Simulate', version: 1,
      source: 'model ResetModel\nend ResetModel;' }));
    await app.windows._openSimulateWindow(model);
  });
  await gui_browser.waitFor(() => {
    const controller = jslab_web.window_manager.windows.get('simulate-window')?.iframe.contentWindow.win_simulate;
    return controller?.file_path === '/workspace/reset-model.jslmo' && !controller.busy;
  }, 'reload Simulate project ready');
  gui_hit_archive.push(...await gui_browser.evaluate(() => globalThis.__JSLAB_GUI_HITS__));
  await gui_browser.evaluate(() => {
    const simulate = jslab_web.window_manager.windows.get('simulate-window').iframe.contentDocument;
    simulate.getElementById('simulate-stop-time').value = '45';
    return jslab_web.sandbox_api.evaluate('resetApp();');
  });
  await waitForDialog(editor);
  await gui_browser.click('#close-dialog-save', editor);
  await waitForDialog(latex);
  await gui_browser.click('#close-dialog-discard', latex);
  await waitForDialog(presentation);
  await gui_browser.click('#close-dialog-save', presentation);
  await waitForDialog(simulate);
  await gui_browser.click('#close-dialog-discard', simulate);
  await gui_browser.waitFor(() => !globalThis.reload_probe &&
    document.body?.dataset.jslabWebReady === 'true', 'resetApp reloaded');
  assert.deepEqual(await gui_browser.evaluate(() => ({
    script: jslab_web.fs.readTextFileSync('/workspace/reset-script.jsl'),
    latex: jslab_web.fs.readTextFileSync('/workspace/reset-tex/main.tex'),
    presentation: jslab_web.fs.readTextFileSync('/workspace/reset-presentation/main.js'),
    simulationSaved: Boolean(JSON.parse(jslab_web.fs.readTextFileSync('/workspace/reset-model.jslmo')).simulation),
    history: jslab_web.history_max
  })), { script: '// edited script', latex: '\\documentclass{article}', presentation: '// edited presentation', simulationSaved: false, history: 41 });
}, { tags: ['gui', 'web', 'integration'], timeout_ms: 45000 });

exports.MODULE_TESTS = tests;
