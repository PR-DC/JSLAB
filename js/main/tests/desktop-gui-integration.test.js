/**
 * @file Actual Electron renderer/IPC/settings/file integration scenarios
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const fs = require('fs');
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_desktop) { exports.MODULE_TESTS = tests; return; }

tests.add('desktop command button updates actual sandbox workspace and history via IPC', async function(assert) {
  await gui_desktop.main.evaluate(() => {
    win_main.command_window.code_input.setValue('var gui_desktop_value = 31;');
    document.getElementById('command-window-input-submit-cont').click();
  });
  await gui_desktop.main.waitFor(() => !win_main.evaluating && document.getElementById('workspace').textContent.includes('gui_desktop_value'), 'sandbox IPC result');
  assert.equal(await gui_desktop.main.evaluate(() => win_main.command_history.history.includes('var gui_desktop_value = 31;')), true);
}, { tags: ['gui', 'electron', 'integration'] });

tests.add('desktop editor opens through IPC, saves to disk and runs through the sandbox', async function(assert) {
  var filename = path.join(gui_desktop_profile, 'gui-integration.jsl'); fs.writeFileSync(filename, '');
  await gui_desktop.main.evaluate(filename => { ipcRenderer.send('EditorWindow', 'open-script', [filename]); }, filename);
  await gui_desktop.editor.waitFor(() => win_editor.script_manager.scripts.some(script => script.path && script.path.endsWith('gui-integration.jsl')), 'editor IPC file opening');
  await gui_desktop.editor.evaluate(() => {
    var script = win_editor.script_manager.getScriptByTab(win_editor.script_manager.active_tab)[0];
    script.code_editor.setValue('var gui_desktop_file_value = 47;'); document.getElementById('save-menu').click();
  });
  assert.equal(fs.readFileSync(filename, 'utf8'), 'var gui_desktop_file_value = 47;');
  await gui_desktop.editor.evaluate(() => { document.getElementById('run-menu').click(); });
  await gui_desktop.main.waitFor(() => $('#script-path-container').is(':visible') || document.getElementById('workspace').textContent.includes('gui_desktop_file_value'), 'script directory prompt or result');
  await gui_desktop.main.evaluate(() => { if($('#script-path-container').is(':visible')) document.getElementById('script-path-dialog-run').click(); });
  await gui_desktop.main.waitFor(() => !win_main.evaluating && document.getElementById('workspace').textContent.includes('gui_desktop_file_value'), 'file run IPC result');
}, { tags: ['gui', 'electron', 'integration'], timeout_ms: 30000 });

tests.add('desktop settings persist to the isolated native electron-store', async function(assert) {
  await gui_desktop.main.evaluate(() => {
    document.getElementById('settings-menu').click();
    document.querySelector('#settings-container .N-history-max').value = '37';
    document.querySelector('#settings-container .change-settings').click();
  });
  var config = JSON.parse(fs.readFileSync(path.join(gui_desktop_profile, 'config.json'), 'utf8'));
  assert.equal(Number(config.N_history_max), 37);
}, { tags: ['gui', 'electron', 'integration'] });

tests.add('desktop language selector updates actual editor and sandbox through IPC', async function(assert) {
  await gui_desktop.main.evaluate(() => { $('#settings-container .set-language').val('rs').trigger('change'); });
  await gui_desktop.editor.waitFor(() => language.lang === 'rs', 'editor translation');
  await gui_desktop.sandbox.waitFor(() => jsl.inter.lang.lang === 'rs', 'sandbox translation');
  assert.equal(await gui_desktop.main.evaluate(() => language.lang), 'rs');
  await gui_desktop.main.evaluate(() => { $('#settings-container .set-language').val('en').trigger('change'); });
}, { tags: ['gui', 'electron', 'integration'] });
exports.MODULE_TESTS = tests;
