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
}, { tags: ['gui', 'electron', 'integration'], timeout_ms: 30000 });

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

tests.add('desktop Assistant window, encrypted token setting and terminal command integrate', async function(assert) {
  var ui = await gui_desktop.assistant.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('#assistant-options-title lang.en').textContent.trim(),
    input: !!document.getElementById('assistant-input'),
    send: !!document.getElementById('assistant-send')
  }));
  assert.equal(ui.heading, 'Assistant');
  assert.equal(ui.input, true);
  assert.equal(ui.send, true);
  assert.equal(await gui_desktop.assistant.evaluate(() =>
    !document.getElementById('app-menu-container') && !!document.getElementById('assistant-options')), true);
  await gui_desktop.main.evaluate(() => {
    document.getElementById('settings-menu').click();
    document.querySelector('#settings-container .openai-api-key').value = 'sk-gui-secret';
    document.querySelector('#settings-container .change-settings').click();
  });
  await gui_desktop.main.waitFor(() =>
    document.querySelector('#settings-container .openai-api-key').value === '', 'Assistant token clearing');
  var config = JSON.parse(fs.readFileSync(path.join(gui_desktop_profile, 'config.json'), 'utf8'));
  assert.equal(typeof config['openai-api-key-encrypted'], 'string');
  assert.equal(config['openai-api-key-encrypted'].includes('sk-gui-secret'), false);
  var command = await gui_desktop.sandbox.evaluate(() => {
    assistant();
    return { no_ans: jsl.no_ans, ignore_output: jsl.ignore_output };
  });
  assert.equal(command.no_ans, true);
  assert.equal(command.ignore_output, true);
  await gui_desktop.main.evaluate(async () => {
    await ipcRenderer.invoke('JSLAB_ASSISTANT_SETTINGS_SET', { clear: true });
  });
  await gui_desktop.assistant.evaluate(() => {
    document.getElementById('assistant-input').value = 'Hello';
    document.getElementById('assistant-send').click();
  });
  await gui_desktop.assistant.waitFor(() =>
    document.querySelector('.assistant-message.error'), 'Assistant missing-key error');
  assert.equal(await gui_desktop.assistant.evaluate(() =>
    document.querySelector('.assistant-message.error').textContent.includes('OpenAI API key')), true);
  assert.equal(await gui_desktop.assistant.evaluate(() =>
    document.querySelector('.assistant-message.error').textContent.includes('<lang')), false);
  assert.equal(await gui_desktop.assistant.evaluate(() =>
    document.querySelector('.assistant-message.error').textContent.includes('Error invoking remote method')), false);
  await gui_desktop.assistant.click('#assistant-timestamp');
  assert.equal(await gui_desktop.assistant.evaluate(() =>
    !document.getElementById('assistant-messages').classList.contains('no-timestamp')), true);
  await gui_desktop.assistant.click('#assistant-autoscroll');
  assert.equal(await gui_desktop.assistant.evaluate(() =>
    !document.getElementById('assistant-autoscroll').classList.contains('active')), true);
  await gui_desktop.assistant.click('#assistant-to-bottom');
  await gui_desktop.assistant.evaluate(() => document.getElementById('assistant-clear').click());
  assert.equal(await gui_desktop.assistant.evaluate(() =>
    document.getElementById('assistant-messages').children.length), 0);
}, { tags: ['gui', 'electron', 'integration'], timeout_ms: 30000 });

tests.add('desktop Terminal opens from its command and runs a real CMD command', async function(assert) {
  var command = await gui_desktop.sandbox.evaluate(() => {
    globalThis.gui_controlled_terminal = terminal('Controlled Terminal');
    gui_controlled_terminal.writeln('echo CONTROLLED_TERMINAL').setName('Renamed Terminal');
    return {
      id: gui_controlled_terminal.id,
      open: gui_controlled_terminal.isOpen(),
      no_ans: jsl.no_ans,
      ignore_output: jsl.ignore_output
    };
  });
  assert.equal(Number.isInteger(command.id), true);
  assert.equal(command.open, true);
  assert.equal(command.no_ans, true);
  assert.equal(command.ignore_output, true);
  await gui_desktop.terminal.waitFor(() => document.visibilityState === 'visible', 'visible Terminal window');
  await gui_desktop.sandbox.evaluate(() => {
    gui_primary_terminal.writeln('echo JSLAB_TERMINAL_OK');
    return true;
  });
  await gui_desktop.terminal.waitFor(() => {
    for(var i = 0; i < terminal.buffer.active.length; i++) {
      var line = terminal.buffer.active.getLine(i);
      if(line && line.translateToString(true).includes('JSLAB_TERMINAL_OK')) return true;
    }
    return false;
  }, 'CMD output in Terminal');
  var captured = await gui_desktop.sandbox.evaluate(() => ({
    full: gui_primary_terminal.read(),
    fresh: gui_primary_terminal.readNew(),
    empty: gui_primary_terminal.readNew(),
    status: gui_primary_terminal.status()
  }));
  assert.equal(captured.full.includes('JSLAB_TERMINAL_OK'), true);
  assert.equal(captured.fresh.includes('JSLAB_TERMINAL_OK'), true);
  assert.equal(captured.empty, '');
  assert.equal(captured.status.open, true);
  assert.equal(captured.status.running, true);
  assert.equal(await gui_desktop.sandbox.evaluate(async () => {
    gui_primary_terminal.writeln('echo TERMINAL_WAIT_OK');
    return (await gui_primary_terminal.waitFor('TERMINAL_WAIT_OK', 5000)).includes('TERMINAL_WAIT_OK');
  }), true);
  assert.equal(await gui_desktop.sandbox.evaluate(async () => {
    var exit_terminal = terminal('Exit test', { args: ['/d', '/c', 'exit 7'] });
    var event = await exit_terminal.waitForExit(5000);
    var code = event.exitCode;
    exit_terminal.close();
    return code;
  }), 7);
  assert.equal(await gui_desktop.terminal.evaluate(() => pty_id !== null && terminal.cols > 0 && terminal.rows > 0), true);
  assert.deepEqual(await gui_desktop.terminal.evaluate(() => ({
    title: document.title.trim(),
    new_button: !!document.getElementById('terminal-new'),
    clear_button: !!document.getElementById('terminal-clear')
  })), { title: 'Terminal', new_button: false, clear_button: false });
  var terminal_windows = await gui_desktop.main.evaluate(() =>
    ipcRenderer.sendSync('sync-message', 'terminal-window', { action: 'list', data: {} }));
  assert.equal(terminal_windows.length >= 2, true);
  assert.equal(terminal_windows.some(function(entry) { return entry.name === 'Renamed Terminal'; }), true);
  assert.equal(await gui_desktop.sandbox.evaluate(() => gui_controlled_terminal.close()), true);
}, { tags: ['gui', 'electron', 'integration'], timeout_ms: 30000 });

tests.add('desktop language selector updates actual editor and sandbox through IPC', async function(assert) {
  await gui_desktop.main.evaluate(() => { $('#settings-container .set-language').val('rs').trigger('change'); });
  await gui_desktop.editor.waitFor(() => language.lang === 'rs', 'editor translation');
  await gui_desktop.sandbox.waitFor(() => jsl.inter.lang.lang === 'rs', 'sandbox translation');
  assert.equal(await gui_desktop.main.evaluate(() => language.lang), 'rs');
  await gui_desktop.main.evaluate(() => { $('#settings-container .set-language').val('en').trigger('change'); });
}, { tags: ['gui', 'electron', 'integration'] });
async function openDebuggerPane() {
  await gui_desktop.editor.evaluate(() => { if(!win_editor.debugger_pane.visible) document.getElementById('editor-debugger-open').click(); });
  await gui_desktop.editor.waitFor(() => !!globalThis.win_editor?.debugger_pane?.visible,'Editor debugger pane');
  return gui_desktop.editor;
}

tests.add('Editor debugger pane and open breakpoint dialog switch between every supported language', async function(assert) {
  const strings = require('../../../config/lang.json'); const editor = await openDebuggerPane();
  await editor.evaluate(() => win_editor.script_manager.scripts[0].debugger.editCondition('translation-test.jsl',1));
  try {
    for(const lang of ['en','rs','rsc']) {
      await editor.evaluate(lang => {globalThis.expected_debug_language=lang;},lang);
      await gui_desktop.main.evaluate(lang => {$('#settings-container .set-language').val(lang).trigger('change');},lang);
      await editor.waitFor(() => language.lang === expected_debug_language,'Editor debugger language');
      const ui = await editor.evaluate(() => ({
        heading:document.querySelector('.editor-debugger-title').innerText,
        step:document.querySelector('[data-editor-debug-action="stepOver"]').getAttribute('aria-label'),
        exceptions:document.querySelector('#debugger-exceptions option[value="all"]').textContent,
        save:document.querySelector('.jslab-breakpoint-dialog button').textContent,
        inputs:document.querySelectorAll('#editor-debugger-pane input').length
      }));
      assert.equal(ui.heading,strings[555][lang].toUpperCase()); assert.equal(ui.step,strings[564][lang]);
      assert.equal(ui.exceptions,strings[561][lang]); assert.equal(ui.save,strings[590][lang]); assert.equal(ui.inputs,0);
    }
  } finally {
    await editor.evaluate(() => document.querySelector('.jslab-breakpoint-dialog button:last-child')?.click());
    await gui_desktop.main.evaluate(() => {$('#settings-container .set-language').val('en').trigger('change');});
  }
}, {tags:['gui','electron','integration'],timeout_ms:30000});

tests.add('Editor bottom split shares locals with Command Window and closing it preserves the pause', async function(assert) {
  const editor = await openDebuggerPane();
  await gui_desktop.main.evaluate(() => win_main.eval.evalCommand('function windowCaller() { let callerLocal = 12; return windowCallee(); } function windowCallee() { let local = 1; const data = {answer:42}; debugger; return local; } var windowDebugResult = windowCaller();'));
  await gui_desktop.main.waitFor(() => win_main.debug_paused,'callee pause');
  await editor.waitFor(() => win_editor.debugger_pane.view.state.state === 'paused','Editor receives pause');
  await gui_desktop.main.waitFor(() => win_main.workspace.data.some(row => row[0] === 'local' && row[2] === '1'),'Workspace locals');
  await gui_desktop.main.evaluate(async () => {
    await win_main.debugger.evaluate('inspectVariable("data")');
    globalThis.pausedInspectorCell=[...document.querySelectorAll('.jslab-inspector')].at(-1)?.querySelector('.jslab-inspector-cell-editable');
    if(!pausedInspectorCell) throw Error('Local object missing from existing inspector');
    const original=win_main.command_window.openInspectorInputDialog;
    try {
      win_main.command_window.openInspectorInputDialog=async () => ({values:['43']});
      await win_main.command_window.editInspectorCell(pausedInspectorCell);
    } finally {win_main.command_window.openInspectorInputDialog=original;}
  });
  await gui_desktop.main.waitFor(() => document.getElementById('command-window-messages').textContent.includes('43'),'inspector edit');
  await editor.evaluate(() => {
    const frames=document.getElementById('debugger-frames');
    frames.value=String(win_editor.debugger_pane.view.state.frames.findIndex(frame => frame.name === 'windowCaller'));
    frames.dispatchEvent(new Event('change'));
  });
  await gui_desktop.main.waitFor(() => win_main.workspace.data.some(row => row[0] === 'callerLocal' && row[2] === '12'),'caller Workspace');
  assert.equal(await gui_desktop.main.evaluate(async () => {
    let rejected=false;try {await win_main.command_window.editInspectorCell(pausedInspectorCell);} catch(error) {rejected=true;}
    if(!rejected) throw Error('Stale inspector edited a different frame');
    return (await win_main.debugger.command('evaluate_debug_expression',{expression:'callerLocal',frame_index:win_main.debugger.frame_index})).value.value.value;
  }),12);
  await gui_desktop.main.evaluate(async () => {await win_main.debugger.executeCommand('dbdown');await win_main.debugger.evaluate('local = 42');});
  await editor.evaluate(() => document.getElementById('editor-debugger-close').click());
  await editor.waitFor(() => !win_editor.debugger_pane.visible,'pane hidden');
  assert.equal(await gui_desktop.main.evaluate(() => win_main.debug_paused),true);
  await openDebuggerPane();
  assert.equal(await editor.evaluate(() => win_editor.debugger_pane.view.state.state),'paused');
  await editor.evaluate(() => document.getElementById('run-menu').click());
  await gui_desktop.main.waitFor(() => !win_main.evaluating && !win_main.debug_paused,'continue');
  assert.equal(await gui_desktop.sandbox.evaluate(() => jsl.context.windowDebugResult),42);
  await gui_desktop.main.evaluate(() => win_main.eval.evalCommand('var afterWindowStop = 3; disp("debug-window-loop-started"); while(true) {}'));
  await gui_desktop.main.waitFor(() => [...document.querySelectorAll('#command-window-messages .data-in')].some(node => node.textContent.includes('debug-window-loop-started')),'loop assignment');
  assert.equal(await editor.evaluate(() => {
    const event=new KeyboardEvent('keydown',{key:'c',ctrlKey:true,bubbles:true,cancelable:true});document.dispatchEvent(event);return event.defaultPrevented;
  }),true);
  await gui_desktop.main.waitFor(() => !win_main.evaluating,'Editor Ctrl+C');
  assert.equal(await gui_desktop.sandbox.evaluate(() => jsl.context.afterWindowStop),3);
}, {tags:['gui','electron','integration'],timeout_ms:30000});

tests.add('stepping past the last user line never opens internal basic.js or blocks later inspection', async function(assert) {
  const editor=await openDebuggerPane();
  await gui_desktop.main.evaluate(() => win_main.eval.evalCommand('function navigationUser() { let value = 1; breakpoint; disp(value); return value + 1; } var navigation_result = navigationUser();'));
  await gui_desktop.main.waitFor(() => win_main.debug_paused,'pause alias');
  for(let step=0;step<12;step++) {
    const state=await gui_desktop.main.evaluate(() => ({evaluating:win_main.evaluating,paused:win_main.debug_paused,path:win_main.debugger.state.frames[win_main.debugger.frame_index]?.path,revision:win_main.debugger.state.revision}));
    if(!state.evaluating) break;
    assert.equal(state.paused,true);assert.ok(state.path && !state.path.replaceAll('\\','/').includes('/js/sandbox/'));
    await gui_desktop.main.evaluate(async revision => {
      globalThis.navigation_revision=revision;
      const reply=await win_main.debugger.command('resume_execution',{action:'stepOver'});if(!reply.success) throw Error(reply.error);
    },state.revision);
    await gui_desktop.main.waitFor(() => !win_main.evaluating || win_main.debug_paused && win_main.debugger.state.revision !== navigation_revision,'next user line');
  }
  assert.equal(await gui_desktop.main.evaluate(() => win_main.evaluating),false);
  assert.equal(await gui_desktop.sandbox.evaluate(() => jsl.context.navigation_result),2);
  assert.equal(await editor.evaluate(() => win_editor.script_manager.scripts.some(script => script.path?.replaceAll('\\','/').includes('/js/sandbox/'))),false);
  assert.equal(await editor.evaluate(() => document.getElementById('debugger-history').textContent),'');
}, {tags:['gui','electron','integration'],timeout_ms:30000});
tests.add('Editor step icons enter a user function and return to its caller', async function(assert) {
  const editor=await openDebuggerPane();
  const code='function editorStepChild() {\n  let nestedLocal = 2;\n  return nestedLocal;\n}\nfunction editorStepParent() {\n  debugger;\n  const answer = editorStepChild();\n  return answer + 1;\n}\nvar editor_step_result = editorStepParent();';
  await gui_desktop.main.evaluate(code => win_main.eval.evalCommand(code),code);
  await gui_desktop.main.waitFor(() => win_main.debug_paused,'Editor step pause');
  async function step(action) {
    await gui_desktop.main.evaluate(() => {globalThis.editor_step_revision=win_main.debugger.state.revision;});
    await editor.waitFor(() => !win_editor.debugger_toolbar.busy,'Editor control ready');
    await editor.evaluate(action => document.querySelector('[data-editor-debug-action="'+action+'"]').click(),action);
    await gui_desktop.main.waitFor(() => win_main.debug_paused && win_main.debugger.state.revision !== editor_step_revision,'next Editor step');
  }
  await step('stepOver');
  await step('stepInto');
  assert.equal(await gui_desktop.main.evaluate(() => win_main.debugger.state.frames[win_main.debugger.frame_index].name),'editorStepChild');
  await step('stepOut');
  assert.equal(await gui_desktop.main.evaluate(() => win_main.debugger.state.frames[win_main.debugger.frame_index].name),'editorStepParent');
  await editor.waitFor(() => !win_editor.debugger_toolbar.busy,'Editor continue ready');
  await editor.evaluate(() => document.getElementById('run-menu').click());
  await gui_desktop.main.waitFor(() => !win_main.evaluating && !win_main.debug_paused,'Editor step completion');
  assert.equal(await gui_desktop.sandbox.evaluate(() => jsl.context.editor_step_result),3);
}, {tags:['gui','electron','integration'],timeout_ms:30000});
exports.MODULE_TESTS=tests;
