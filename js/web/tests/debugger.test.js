/**
 * @file Real-browser worker debugging and source-error scenarios
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { webTest } = require('./gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;
if(!global.gui_browser) return;

webTest(tests, 'debugger and open breakpoint dialog translate live in all supported browser languages', async () => {
  const language = GUI.app.language;
  const original = language.lang;
  const doc = await GUI.debuggerPane();
  let frame;
  try {
    frame = await GUI.editor();
    GUI.app.fs.writeTextFileSync('/workspace/translation-test.jsl', 'var translated_value = 1;');
    await frame.__JSLAB_WEB_EDITOR__.openFile('/workspace/translation-test.jsl', 0, 0);
    const wrapper = [...frame.document.querySelectorAll('.CodeMirror')].find(el => frame.getComputedStyle(el).display !== 'none');
    const editor = wrapper.CodeMirror;
    frame.CodeMirror.signal(editor, 'gutterClick', editor, 0, 'jslab-breakpoints', { shiftKey: true });
    await GUI.wait(() => frame.document.querySelector('.jslab-breakpoint-dialog'), 'breakpoint condition dialog');
    GUI.app.worker_debugger.callbacks.targets([], null);
    for(const lang of ['en', 'rs', 'rsc']) {
      GUI.app.changeLanguage(lang);
      GUI.eq(GUI.q('.editor-debugger-title str',doc).textContent, language.s[555][lang]);
      GUI.eq(GUI.q('#editor-debugger-open', doc).title, language.s[555][lang]);
      GUI.eq(GUI.q('#editor-debugger-open str', doc).textContent, language.s[555][lang]);
      GUI.eq(frame.document.querySelector('[data-editor-debug-action="stepOver"]').getAttribute('aria-label'), language.s[564][lang]);
      GUI.eq(GUI.q('#debugger-exceptions option[value="all"]', doc).textContent, language.s[561][lang]);
      GUI.eq(GUI.q('#debugger-targets option[value=""]', doc).textContent, language.s[574][lang]);
      GUI.eq(frame.document.querySelector('.jslab-breakpoint-dialog button').textContent, language.s[590][lang]);
      GUI.eq(frame.document.querySelector('.jslab-breakpoint-dialog input[type="text"]').placeholder, language.s[588][lang]);
    }
  } finally {
    frame?.document.querySelector('.jslab-breakpoint-dialog button:last-child')?.click();
    GUI.app.changeLanguage(original);
    GUI.hideDebugger();
  }
  return true;
});

webTest(tests, 'debugger uses the existing Editor bottom split while leaving the Command Window usable', async () => {
  GUI.eq(document.querySelector('#web-debugger-toggle'), null);
  const doc = await GUI.debuggerPane();
  GUI.eq(document.querySelector('#web-debugger-panel'), null);
  GUI.eq(document.querySelector('[data-debug-action]'), null);
  GUI.eq(doc.querySelector('#editor-debugger-pane input'), null);
  GUI.eq(doc.querySelector('#debugger-values'), null);
  const icon = GUI.q('#editor-debugger-open', doc);
  GUI.eq(icon.getAttribute('aria-expanded'), 'true');
  const client = GUI.app.worker_debugger;
  GUI.hideDebugger();
  GUI.eq(icon.getAttribute('aria-expanded'), 'false');
  GUI.eq(GUI.app.worker_debugger, client);
  GUI.eq(doc.querySelector('#editor-debugger-controls #editor-debugger-open'), null);
  GUI.ok(doc.querySelector('#editor-more-popup #editor-debugger-open'));
  const frame = doc.defaultView;
  doc.querySelector('#editor-more-icon').click();
  await GUI.wait(() => frame.getComputedStyle(doc.querySelector('#editor-more-popup')).display !== 'none', 'More menu opens');
  doc.querySelector('#editor-debugger-open').click();
  await GUI.wait(() => icon.getAttribute('aria-expanded') === 'true', 'Debugger menu opens split');
  await GUI.wait(() => frame.getComputedStyle(doc.querySelector('#editor-more-popup')).display === 'none', 'More menu closes');
  GUI.eq(frame.getComputedStyle(doc.querySelector('#editor-debugger-open img')).opacity, '0.3');
  GUI.eq(frame.getComputedStyle(doc.querySelector('#editor-debugger-header')).fontSize, '14px');
  GUI.eq(frame.getComputedStyle(doc.querySelector('#editor-debugger-close img')).filter, 'none');
  GUI.eq(doc.querySelector('.tabs [data-editor-debug-action]'), null);
  const header = doc.querySelector('#editor-debugger-header-controls');
  GUI.eq(header.children[0].id, 'editor-debugger-controls');
  GUI.eq(header.children[1].id, 'debugger-menu-toggle');
  GUI.eq(header.children[2].id, 'editor-debugger-close');
  GUI.click('#debugger-menu-toggle', doc);
  await GUI.wait(() => GUI.visible('#debugger-menu', doc), 'Debugger options popup');
  GUI.eq(frame.getComputedStyle(doc.querySelector('#debugger-menu')).borderRadius, frame.getComputedStyle(doc.querySelector('#editor-more-popup')).borderRadius);
  GUI.key(doc, 'Escape');
  await GUI.wait(() => !GUI.visible('#debugger-menu', doc), 'Escape closes options');
  GUI.click('#debugger-menu-toggle', doc);
  await GUI.wait(() => GUI.visible('#debugger-menu', doc), 'Debugger options reopen');
  doc.body.click();
  await GUI.wait(() => !GUI.visible('#debugger-menu', doc), 'Outside click closes options');
  const reopened = await GUI.debuggerPane(); GUI.eq(reopened, doc);
  GUI.eq(GUI.app.window_manager.windows.has('jslab-debugger'),false);
  GUI.hideDebugger();
  return true;
});

webTest(tests, 'worker debugger preserves synchronous function semantics and workspace assignments', async () => {
  await GUI.app._startWorkerDebugger();
  const debuggerClient = GUI.app.worker_debugger;
  try {
    const result = await debuggerClient.evaluate('function twice(x) { return 2 * x; } var web_saved = twice(7); web_saved;');
    GUI.eq(result.success, true, result.error);
    GUI.eq(result.preview, '14');
    GUI.eq((await debuggerClient.evaluate('web_saved + 1')).preview, '15');
  } finally { debuggerClient.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'worker pause retains function locals, allows edits and stops an empty-checkpoint-free loop', async () => {
  await GUI.app._startWorkerDebugger();
  const debuggerClient = GUI.app.worker_debugger;
  try {
    globalThis.debug_test_stage = 'start-loop';
    const pending = debuggerClient.evaluate('var web_saved = 42; function spin() { let counter = 0; debugger; while(true) { counter++; } } spin();');
    pending.catch(() => {});
    // Synchronize with the function itself; compilation can exceed a fixed delay.
    await GUI.wait(() => debuggerClient.state === 'paused', 'local initialization');
    debuggerClient.resume();
    await GUI.wait(() => debuggerClient.state === 'running', 'loop execution');
    globalThis.debug_test_stage = 'pause-request';
    debuggerClient.pause();
    await GUI.wait(() => debuggerClient.state === 'paused', 'worker pause');
    globalThis.debug_test_stage = 'read-local';
    const value = await debuggerClient.evaluatePaused('counter');
    GUI.eq(value.success, true, value.error);
    GUI.ok(Number(value.preview) >= 0);
    globalThis.debug_test_stage = 'edit-local';
    GUI.eq((await debuggerClient.evaluatePaused('counter = 123')).preview, '123');
    globalThis.debug_test_stage = 'step';
    debuggerClient.resume('stepOver');
    await new Promise(resolve => setTimeout(resolve, 50));
    await GUI.wait(() => debuggerClient.state === 'paused', 'worker step');
    globalThis.debug_test_stage = 'interrupt';
    debuggerClient.interrupt();
    globalThis.debug_test_stage = 'await-interruption';
    const result = await pending;
    GUI.eq(result.interrupted, true);
    globalThis.debug_test_stage = 'read-workspace';
    GUI.eq((await debuggerClient.evaluate('web_saved')).preview, '42');
  } finally { debuggerClient.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'worker breakpoints and nested script errors use original file coordinates', async () => {
  await GUI.app._startWorkerDebugger();
  const debuggerClient = GUI.app.worker_debugger;
  try {
    debuggerClient.setBreakpoint('/workspace/web-test.jsl', 2);
    const pending = debuggerClient.evaluate('var web_break = 1;\nweb_break += 2;\nweb_break;', { path: '/workspace/web-test.jsl' });
    pending.catch(() => {});
    await GUI.wait(() => debuggerClient.state === 'paused', 'source breakpoint');
    GUI.eq((await debuggerClient.evaluatePaused('web_break')).preview, '1');
    debuggerClient.removeBreakpoint('/workspace/web-test.jsl', 2);
    debuggerClient.resume();
    GUI.eq((await pending).preview, '3');
    const error = await debuggerClient.evaluate('await run("/workspace/child.jsl", undefined, true, true);', {
      path: '/workspace/parent.jsl', files: { '/workspace/child.jsl': '\nthrow new Error("web child failure");' }
    });
    GUI.eq(error.success, false);
    GUI.eq(error.error_details.location.path, '/workspace/child.jsl');
    GUI.eq(error.error_details.location.line, 2);
  } finally { debuggerClient.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'worker scripts and CommonJS module chains retain original runtime and syntax errors', async () => {
  await GUI.app._startWorkerDebugger();
  const debuggerClient = GUI.app.worker_debugger;
  try {
    const files = {
      '/workspace/outer.js': 'const inner = require("./inner.js");\nmodule.exports = () => inner();',
      '/workspace/inner.js': 'module.exports = function leaf() {\nthrow new TypeError("web module failure");\n};',
      '/workspace/caller.jsl': 'var moduleFn = require("/workspace/outer.js");\nmoduleFn();'
    };
    let result = await debuggerClient.evaluate('await run("/workspace/caller.jsl", undefined, true, true);', { files });
    GUI.eq(result.success, false);
    GUI.eq(result.error_details.location.path, '/workspace/inner.js');
    GUI.eq(result.error_details.location.line, 2);
    GUI.ok(result.error_details.frames.some(frame => frame.path === '/workspace/caller.jsl' && frame.line === 2));
    result = await debuggerClient.evaluate('require("/workspace/bad.js");', { files: { '/workspace/bad.js': '\nmodule.exports = ;' } });
    GUI.eq(result.error_details.kind, 'syntax');
    GUI.eq(result.error_details.location.path, '/workspace/bad.js');
    GUI.eq(result.error_details.location.line, 2);
    result = await debuggerClient.evaluate('await run("/workspace/parent-async.jsl", undefined, true, true);', { files: {
      '/workspace/parent-async.jsl': 'await run("/workspace/child-async.jsl", undefined, true, true);',
      '/workspace/child-async.jsl': 'import { fail } from "/workspace/async-module.js";\nawait fail();',
      '/workspace/async-module.js': 'exports.fail = async function() {\n  await Promise.resolve();\n  throw new RangeError("web async module failure");\n};'
    } });
    GUI.eq(result.error_details.name, 'RangeError');
    GUI.eq(result.error_details.location.path, '/workspace/async-module.js');
    GUI.eq(result.error_details.location.line, 3);
    GUI.ok(result.error_details.frames.some(frame => frame.path === '/workspace/child-async.jsl' && frame.line === 2));
    GUI.ok(result.error_details.frames.some(frame => frame.path === '/workspace/parent-async.jsl'));
    result = await debuggerClient.evaluate('await run("/workspace/selected.jsl", [3, 3], true, true);', { files: {
      '/workspace/selected.jsl': '// first\n// second\nvar invalid = ;'
    } });
    GUI.eq(result.error_details.kind, 'syntax');
    GUI.eq(result.error_details.location.path, '/workspace/selected.jsl');
    GUI.eq(result.error_details.location.line, 3);
    GUI.eq(result.error_details.location.column, 15);
  } finally { debuggerClient.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'web debugger toolbar, paused console, Ctrl+C and reset operate on the worker workspace', async () => {
  const doc = await GUI.debuggerPane();
  const editorDocument = (await GUI.editor()).document;
  await GUI.app._startWorkerDebugger();
  await GUI.wait(() => GUI.app.worker_debugger?.worker && GUI.app.worker_debugger.state === 'idle', 'worker startup');
  const debuggerClient = GUI.app.worker_debugger;
  try {
    const operation = GUI.app._evaluateCommand('var ui_saved = 1; function inner() { debugger; let local = 1; return local; } inner(); while(true) {}');
    operation.catch(() => {});
    await GUI.wait(() => debuggerClient.state === 'paused', 'initial pause');
    for(const action of ['stepOver', 'stepInto', 'stepOut']) {
      GUI.click('[data-editor-debug-action="' + action + '"]', editorDocument);
      await new Promise(resolve => setTimeout(resolve, 40));
      await GUI.wait(() => debuggerClient.state === 'paused', action);
    }
    await GUI.app._evaluateCommand('ui_saved = 42');
    GUI.click('#run-menu', editorDocument);
    await GUI.wait(() => debuggerClient.state === 'running', 'continue');
    GUI.click('#run-menu', editorDocument);
    await GUI.wait(() => debuggerClient.state === 'paused', 'toolbar pause');
    const stopEvent = GUI.key(doc, 'c', {ctrlKey:true});
    GUI.eq(stopEvent.defaultPrevented, true);
    await operation;
    GUI.eq((await debuggerClient.evaluate('ui_saved')).preview, '42');
    const second = debuggerClient.evaluate('while(true) {}');
    second.catch(() => {});
    window.getSelection().removeAllRanges();
    GUI.key(document, 'c', { ctrlKey: true });
    GUI.eq((await second).interrupted, true);
    GUI.click('#debugger-menu-toggle', doc);
    await GUI.wait(() => GUI.visible('#debugger-menu', doc), 'Debugger options popup');
    GUI.click('[data-debug-action="reset"]', doc);
    await GUI.wait(() => GUI.app.worker_debugger !== debuggerClient && GUI.app.worker_debugger.state === 'idle', 'reset');
    GUI.eq((await GUI.app.worker_debugger.evaluate('typeof ui_saved')).preview, '"undefined"');
  } finally {
    GUI.app.worker_debugger?.dispose();
    GUI.app.worker_debugger = null;
  }
  return true;
});

webTest(tests, 'web caller scopes, object descriptors, mutations and expired handles work', async () => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  try {
    const pending = client.evaluate('var getter_calls = 0; function caller() { let caller_value = 10; const data = { answer: 42, get unsafe() { getter_calls++; return 9; } }; return callee(); } function callee() { let local = 1; debugger; return local; } caller();');
    pending.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'callee pause');
    const index = client.frames.findIndex(frame => frame.name.includes('caller'));
    GUI.ok(index >= 0, JSON.stringify(client.frames));
    GUI.eq((await client.selectFrame(index)).success, true);
    GUI.eq((await client.evaluatePaused('caller_value')).preview, '10');
    GUI.eq((await client.evaluatePaused('caller_value = 20')).preview, '20');
    const data = await client.evaluatePaused('data');
    const object_id = data.value.object_id;
    const properties = await client.inspectObject(object_id);
    GUI.eq(properties.properties.find(item => item.name === 'answer').value.preview, '42');
    GUI.eq(properties.properties.find(item => item.name === 'unsafe').accessor, true);
    GUI.eq((await client.evaluatePaused('getter_calls')).preview, '0');
    await client.selectFrame(0);
    GUI.eq((await client.evaluatePaused('local = 3')).preview, '3');
    await client.resume();
    GUI.eq((await pending).preview, '3');
    let rejected = false; try { await client.inspectObject(object_id); } catch(error) { rejected = true; }
    GUI.eq(rejected, true);
  } finally { client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'web conditional and disabled breakpoints and error stops retain source locals', async () => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  try {
    const path = '/workspace/conditions.jsl';
    client.setBreakpoint(path, 4, 'index === 2');
    const pending = client.evaluate('function conditional() {\n  let sum = 0;\n  for(let index = 0; index < 4; index++) {\n    sum += index;\n  }\n  return sum;\n}\nconditional();', { path });
    pending.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'conditional stop');
    GUI.eq((await client.evaluatePaused('index')).preview, '2');
    client.setBreakpoint(path, 4, '', false);
    await client.resume(); GUI.eq((await pending).preview, '6');
    await client.clearBreakpoints();
    await client.setExceptionPause('uncaught');
    const failed = client.evaluate('function broken() { let preserved = 17; return null.missing; } broken();');
    failed.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'implicit error stop');
    GUI.eq((await client.evaluatePaused('preserved')).preview, '17');
    await client.resume(); GUI.eq((await failed).success, false);
    GUI.eq((await client.evaluate('try { throw new Error("caught"); } catch(error) { var handled = true; } handled;')).preview, 'true');
    await client.setExceptionPause('all');
    const caught = client.evaluate('let caught_local = 9; try { throw new Error("caught stop"); } catch(error) { caught_local++; } caught_local;');
    caught.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'caught error stop');
    GUI.eq((await client.evaluatePaused('caught_local')).preview, '9');
    await client.setExceptionPause('none'); await client.resume(); GUI.eq((await caught).preview, '10');
  } finally { client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'web interruption cancels awaited timers and idle background infinite callbacks', async () => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  try {
    const pending = client.evaluate('var survived_wait = 42; await waitSeconds(60); survived_wait = 0;');
    pending.catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 100));
    client.interrupt();
    GUI.eq((await pending).interrupted, true);
    GUI.eq((await client.evaluate('survived_wait')).preview, '42');
    let entered = false;
    const original = client.callbacks.log;
    client.callbacks.log = message => { if(message.message.includes('background loop entered')) entered = true; original?.(message); };
    await client.evaluate('setTimeout(() => { disp("background loop entered"); while(true) {} }, 20);');
    await GUI.wait(() => entered, 'background loop');
    client.interrupt();
    await GUI.wait(() => client.state === 'idle', 'background interruption');
    GUI.eq((await client.evaluate('survived_wait + 1')).preview, '43');
    await client.setExceptionPause('all');
    const caught = client.evaluate('function implicitCaught() { let retained = 11; try { null.missing; } catch(error) { return retained; } } implicitCaught();');
    caught.catch(() => {});
    try { await GUI.wait(() => client.state === 'paused', 'implicit caught exception'); }
    catch(error) { throw Error(error.message + ' ' + JSON.stringify({ state: client.state, mode: client.pause_on_exceptions, last: client.last_state, result: client.last_result })); }
    GUI.eq((await client.evaluatePaused('retained')).preview, '11');
    await client.setExceptionPause('none'); await client.resume(); GUI.eq((await caught).preview, '11');
  } finally { client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'worker workspace renders real browser figures and persists text without moving variables', async () => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  const originalLog = client.callbacks.log;
  const errors = [];
  client.callbacks.log = message => { if(message.level === 'error') errors.push(message.message); originalLog?.(message); };
  try {
    globalThis.debug_test_stage = 'figure-create';
    const result = await client.evaluate('var worker_data = [1, 4, 9]; var worker_plot = plot([{ x: [1,2,3], y: worker_data, type: "scatter" }]); title("Worker figure"); xlabel("sample"); await worker_plot.ready; jsl.inter.env.writeFileSync("/workspace/worker-produced.txt", "worker persistence"); worker_plot.fid;');
    GUI.eq(result.success, true, result.error);
    GUI.eq(GUI.app.fs.readTextFileSync('/workspace/worker-produced.txt'), 'worker persistence');
    GUI.eq((await client.evaluate('worker_data[2]')).preview, '9');
    const window_id = (await client.evaluate('getFigure(worker_plot.fid).wid')).value;
    const figure_window = GUI.app.window_manager.windows.get(String(window_id));
    GUI.ok(figure_window);
    const graph = figure_window.iframe.contentWindow.document.querySelector('.js-plotly-plot');
    GUI.ok(graph, 'real Plotly graph');
    GUI.ok(!figure_window.title.includes('<str'), 'title contains translated text');
    GUI.eq(graph.data[0].y[2], 9);
    for(const lang of ['en', 'rs', 'rsc']) {
      GUI.app.changeLanguage(lang);
      await client.operation('language', {lang});
      GUI.eq((await client.evaluate('jsl.inter.lang.currentString(522)')).value, GUI.app.language.s[522][lang]);
      GUI.eq(figure_window.title, GUI.app.language.s[522][lang]);
    }
    GUI.app.changeLanguage('en');
    await client.operation('language', {lang:'en'});
    globalThis.debug_test_stage = 'figure-update';
    await client.evaluate('await worker_plot.update([{ y: [2, 8, 18] }]);');
    await GUI.wait(() => graph.data[0].y[2] === 18, 'plot update');
    globalThis.debug_test_stage = 'figure-save';
    await client.evaluate('await saveFigure(worker_plot.fid, "/workspace/worker-figure.svg"); jsl.inter.env.writeFileSync("/workspace/worker-bytes.bin", new Uint8Array([0, 127, 255]));');
    GUI.ok(GUI.app.fs.readTextFileSync('/workspace/worker-figure.svg').includes('<svg'));
    GUI.eq(Array.from(GUI.app.fs.readBytesSync('/workspace/worker-bytes.bin')).join(','), '0,127,255');
    globalThis.debug_test_stage = 'figure-close';
    await client.evaluate('await close(worker_plot.fid);');
    GUI.eq(GUI.app.window_manager.windows.has(String(window_id)), false);
    GUI.eq(errors.length, 0, JSON.stringify(errors));
    const failure = await client.evaluate('// original first line\ndocument.createElement("invalid name");', { path: '/workspace/worker-ui-error.jsl' });
    GUI.eq(failure.success, false);
    GUI.eq(failure.error_details.location.path, '/workspace/worker-ui-error.jsl');
    GUI.eq(failure.error_details.location.line, 2);
    GUI.eq(failure.error_details.cleanup_errors.length, 0);
    GUI.eq((await client.evaluate('worker_data[2]')).preview, '9');
    GUI.ok(!errors.some(message => message.includes("Cannot use 'in' operator")), JSON.stringify(errors));
  } finally { client.callbacks.log = originalLog; client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'web recursive and interleaved async callers keep distinct lexical scopes', async () => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  try {
    const recursive = client.evaluate('function recursive(depth) { let own_value = depth; if(depth === 0) { debugger; return own_value; } return recursive(depth - 1); } recursive(3);');
    recursive.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'recursive pause');
    const recursive_frames = client.frames.map((frame, index) => ({ frame, index })).filter(item => item.frame.name.includes('recursive'));
    GUI.ok(recursive_frames.length >= 4, JSON.stringify(client.frames));
    for(let value = 0; value < 4; value++) {
      await client.selectFrame(recursive_frames[value].index);
      GUI.eq((await client.evaluatePaused('own_value')).preview, String(value));
    }
    await client.resume(); await recursive;
    const interleaved = client.evaluate('let release; const gate = new Promise(resolve => { release = resolve; }); async function asyncCaller(value, waiting) { let caller_local = value; await waiting; return asyncCallee(); } function asyncCallee() { debugger; return 7; } const first = asyncCaller(11, gate); const second = asyncCaller(22, new Promise(() => {})); release(); await first;');
    interleaved.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'async caller pause');
    const caller = client.frames.findIndex(frame => frame.name.includes('asyncCaller'));
    GUI.ok(caller >= 0, JSON.stringify(client.frames));
    await client.selectFrame(caller);
    GUI.eq((await client.evaluatePaused('caller_local')).preview, '11');
    await client.resume(); GUI.eq((await interleaved).preview, '7');
  } finally { client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'web debugger console and editor integrate breakpoints conditions source selection and scope navigation', async () => {
  const doc = await GUI.debuggerPane();
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  try {
    const path = '/workspace/editor-debugger.jsl';
    const code = 'function outerEditor() { let parent_value = 12; return innerEditor(); }\nfunction innerEditor() { let value = 2; value++; return value; }\nouterEditor();';
    GUI.app.fs.writeTextFileSync(path, code);
    await GUI.app._openEditorWindow(path);
    const win = await GUI.editor();
    const cm = [...win.document.querySelectorAll('.CodeMirror')].find(element => win.getComputedStyle(element).display !== 'none').CodeMirror;
    win.CodeMirror.signal(cm, 'gutterClick', cm, 1, 'jslab-breakpoints', { shiftKey: true });
    const dialog = win.document.querySelector('.jslab-breakpoint-dialog');
    GUI.ok(dialog);
    dialog.querySelector('input[type=text]').value = 'true'; dialog.querySelector('button').click();
    await GUI.wait(() => client.breakpoints.size === 1, 'editor breakpoint');
    win.CodeMirror.signal(cm, 'gutterClick', cm, 1, 'jslab-breakpoints', { shiftKey: true });
    win.document.querySelector('.jslab-breakpoint-dialog button:last-child').click();
    GUI.eq(win.document.querySelector('.jslab-breakpoint-dialog'), null);
    const pending = client.evaluate('await run(' + JSON.stringify(path) + ', undefined, true, true);', { files: GUI.app._workerDebugFiles() });
    pending.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'editor pause');
    await GUI.wait(() => cm.lineInfo(1).bgClass?.includes('jslab-debug-line'), 'execution highlight');
    const parent = client.frames.findIndex(frame => frame.name.includes('outerEditor'));
    GUI.q('#debugger-frames', doc).value = String(parent);
    GUI.q('#debugger-frames', doc).dispatchEvent(new Event('change'));
    await GUI.wait(() => client.frame_index === parent, 'caller selection');
    await GUI.app._evaluateCommand('dbstack');
    await GUI.app._evaluateCommand('dbdown');
    GUI.eq(client.frame_index, 0);
    await GUI.app._evaluateCommand('dbup');
    GUI.eq(client.frame_index, parent);
    await GUI.app._evaluateCommand('dbclear all');
    await GUI.app._evaluateCommand('dbcont');
    await pending;
    GUI.q('#debugger-exceptions', doc).value = 'all';
    GUI.q('#debugger-exceptions', doc).dispatchEvent(new Event('change'));
    await GUI.wait(() => client.pause_on_exceptions === 'all', 'error selector');
    await GUI.app._evaluateCommand('dbclear if error');
    GUI.eq(client.pause_on_exceptions, 'none');
  } finally { client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'web breakpoint conditions enabled state and exception preferences survive debugger restart', async () => {
  await GUI.app._startWorkerDebugger();
  let client = GUI.app.worker_debugger;
  try {
    client.setBreakpoint('/workspace/persisted-point.jsl', 3, 'count > 2', false);
    await client.setExceptionPause('all');
    client.dispose();
    await GUI.app._startWorkerDebugger(); client = GUI.app.worker_debugger;
    const point = client.breakpoints.get('/workspace/persisted-point.jsl:3');
    GUI.eq(point.condition, 'count > 2'); GUI.eq(point.enabled, false);
    GUI.eq(client.pause_on_exceptions, 'all');
    await client.clearBreakpoints();
  } finally { client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'worker DOM references callbacks constructors and native promises share scientific variables', async () => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  try {
    let result = await client.evaluate('var clicks = 0; var node = document.createElement("button"); node.id = "worker-dom-test"; node.textContent = "Worker button"; document.body.appendChild(node); var onClick = () => { clicks++; node.textContent = String(clicks); }; node.addEventListener("click", onClick); node === document.getElementById("worker-dom-test");');
    GUI.eq(result.success, true, result.error); GUI.eq(result.value, true);
    GUI.q('#worker-dom-test').click();
    await GUI.wait(() => GUI.q('#worker-dom-test').textContent === '1', 'worker event callback');
    GUI.eq((await client.evaluate('clicks')).value, 1);
    result = await client.evaluate('node.removeEventListener("click", onClick); node.remove(); new window.URL("https://example.com/path").pathname;');
    GUI.eq(result.value, '/path');
    GUI.eq(GUI.q('body').querySelector('#worker-dom-test'), null);
    GUI.eq((await client.evaluate('await window.Promise.resolve(42);')).value, 42);
  } finally { client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'unified workspace survives debugging and browser function edits affect future calls only', async () => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  try {
    GUI.eq(GUI.app.sandbox_api.handshake().runtime, 'scientific-worker');
    const original = 'var initialized_once = 1;\nfunction webEdit(value) { return value + 1; }';
    const edited = 'var initialized_once = 999;\nfunction webEdit(value) { return value + 20; }';
    await client.evaluate(original, { path: '/workspace/live-edit.jsl' });
    const pending = client.evaluate('function hold() { let own_local = 42; debugger; return webEdit(own_local); } hold();');
    pending.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'edit pause');
    GUI.eq((await client.updateScript('/workspace/live-edit.jsl', edited, { dry_run: true })).status, 'Validated');
    GUI.eq((await client.evaluatePaused('webEdit(1)')).preview, '2');
    const invalid = await client.updateScript('/workspace/live-edit.jsl', 'function invalid(');
    GUI.eq(invalid.success, false);
    GUI.eq((await client.updateScript('/workspace/live-edit.jsl', edited)).applied, true);
    GUI.eq((await client.evaluatePaused('own_local')).preview, '42');
    GUI.eq((await client.evaluatePaused('initialized_once')).preview, '1');
    await client.resume(); GUI.eq((await pending).value, 62);
    GUI.eq((await GUI.app.sandbox_api.evaluate('webEdit(2)')).value, 22);
    const scheduled = client.evaluate('await new Promise(resolve => { setTimeout(function workerScheduled() { debugger; resolve(7); }, 10); });');
    scheduled.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'async scheduling pause');
    GUI.ok(client.last_state.async_stack.some(entry => entry.frames.length));
    await client.resume(); GUI.eq((await scheduled).value, 7);
  } finally { client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'browser child workers pause independently expose locals and return results to the shared workspace', async () => {
  await GUI.app._startWorkerDebugger();
  const root = GUI.app.worker_debugger;
  try {
    const pending = root.evaluate('var child = new Worker("/workspace/debug-child.jsl", { name: "debug child" }); var child_answer = await new Promise((resolve, reject) => { child.onerror = event => reject(Error(event.message)); child.onmessage = event => resolve(event.data); child.postMessage(21); }); child_answer;', { files: {
      '/workspace/debug-child.jsl': 'self.onmessage = function childHandler(event) { let worker_local = event.data; debugger; postMessage(worker_local * 2); };'
    } });
    pending.catch(() => {});
    try { await GUI.wait(() => root.targets.size === 1 && root.selectedClient().state === 'paused', 'child worker pause'); }
    catch(error) { throw Error(error.message + ' ' + JSON.stringify({ result: root.last_result, targets: [...root.targets].map(([id, target]) => ({ id, state: target.state, last: target.last_state })) })); }
    const child = root.selectedClient();
    GUI.ok(child !== root);
    GUI.eq((await child.evaluatePaused('worker_local')).preview, '21');
    GUI.eq((await child.evaluatePaused('worker_local = 22')).preview, '22');
    const doc = await GUI.debuggerPane();
    GUI.click('#debugger-menu-toggle', doc);
    await GUI.wait(() => GUI.visible('#debugger-menu', doc), 'Debugger options popup');
    const select = GUI.q('#debugger-targets', doc);
    GUI.ok(select.options.length >= 2);
    const selectedChild = root.selected_target;
    GUI.input('#debugger-targets', '', doc, 'change');
    await GUI.wait(() => root.selected_target === null, 'main target selection');
    GUI.eq(select.disabled, false);
    await new Promise(resolve => setTimeout(resolve, 0));
    GUI.input('#debugger-targets', selectedChild, doc, 'change');
    await GUI.wait(() => root.selected_target === selectedChild, 'child target selection');
    await root.resumeTargets();
    GUI.eq((await pending).value, 44);
    GUI.eq((await GUI.app.sandbox_api.evaluate('child_answer')).value, 44);
    await root.evaluate('child.terminate();');
    await GUI.wait(() => root.targets.size === 0, 'child termination');
    const failed = await root.evaluate('var failed_child = new Worker("/workspace/error-child.jsl"); await new Promise((resolve, reject) => { failed_child.onerror = event => reject(event.error); failed_child.postMessage(1); });', { files: {
      '/workspace/error-child.jsl': 'self.onmessage = function() {\n  throw new TypeError("child callback failure");\n};'
    } });
    GUI.eq(failed.success, false);
    GUI.eq(failed.error_details.name, 'TypeError');
    GUI.eq(failed.error_details.location.path, '/workspace/error-child.jsl');
    GUI.eq(failed.error_details.location.line, 2);
  } finally { root.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'isolated browser native jobs preserve the parent workspace on hard cancellation', async () => {
  await GUI.app._startWorkerDebugger();
  const root = GUI.app.worker_debugger;
  const previous_log = root.callbacks.log;
  let entered_native = false;
  root.callbacks.log = message => { if(message.message === 'native-work-entered') entered_native = true; previous_log?.(message); };
  try {
    let result = await root.evaluate('var isolated_parent = 42; await runInterruptible(values => Array.from(values, value => value * 2), [[1, 2, 3]]);');
    GUI.eq(result.success, true, result.error);
    const bytes = [0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,7,8,1,4,115,112,105,110,0,0,10,9,1,7,0,3,64,12,0,11,11];
    const pending = root.evaluate('await runInterruptible(bytes => { const spin = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(bytes))).exports.spin; disp("native-work-entered"); spin(); }, [' + JSON.stringify(bytes) + ']);');
    pending.catch(() => {});
    await GUI.wait(() => entered_native, 'isolated runtime entering native work');
    root.interrupt();
    GUI.eq((await pending).interrupted, true);
    await GUI.wait(() => root.targets.size === 0, 'native target released');
    GUI.eq((await root.evaluate('isolated_parent')).value, 42);
    result = await root.evaluate('await runInterruptible(() => { throw new TypeError("isolated failure"); });');
    GUI.eq(result.success, false); GUI.ok(result.error.includes('isolated failure'));
  } finally { root.callbacks.log = previous_log; root.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'worker failure rejects its pending operation and marks the debugger unavailable', async () => {
  await GUI.app._startWorkerDebugger();
  const debuggerClient = GUI.app.worker_debugger;
  try {
    const pending = debuggerClient.evaluate('await waitSeconds(60);');
    const failed = pending.catch(error => error.message);
    debuggerClient.worker.dispatchEvent(new ErrorEvent('error', { message: 'Expected worker failure' }));
    GUI.eq(await failed, 'Expected worker failure');
    GUI.eq(debuggerClient.state, 'unavailable');
  } finally { debuggerClient.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'existing Workspace and inspector follow selected paused locals and reject stale edits', async () => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  const originalPrompt = GUI.app.openInspectorInputDialog;
  try {
    const pending = client.evaluate('var globalSaved = 90; var getterCalls = 0; function parentInspector() { let callerLocal = 12; return childInspector(); } function childInspector() { let ownLocal = 1; const data = {answer:42, get unsafe(){getterCalls++;return 9;}}; debugger; return ownLocal; } parentInspector();');
    pending.catch(() => {});
    await GUI.wait(() => client.state === 'paused');
    await GUI.wait(() => GUI.app.workspace_state.some(row => row[0] === 'ownLocal' && row[2] === '1'), 'Workspace local');
    await GUI.app._evaluateCommand('inspectVariable("data")');
    const inspector = [...document.querySelectorAll('.jslab-inspector')].at(-1);
    GUI.ok(inspector.textContent.includes('answer')); GUI.ok(inspector.textContent.includes('42'));
    GUI.eq((await client.evaluatePaused('getterCalls')).preview, '0');
    const cell = inspector.querySelector('.jslab-inspector-cell-editable'); GUI.ok(cell);
    GUI.app.openInspectorInputDialog = async () => ({values:['43']});
    await GUI.app.editInspectorCell(cell);
    GUI.eq((await client.evaluatePaused('data.answer')).preview, '43');
    const parent = client.frames.findIndex(frame => frame.name.includes('parentInspector'));
    await GUI.app._debugCommand('select_debug_frame', { frame_index: parent });
    GUI.ok(GUI.app.workspace_state.some(row => row[0] === 'callerLocal' && row[2] === '12'));
    let stale = false; try { await GUI.app.editInspectorCell(cell); } catch(error) { stale = true; } GUI.eq(stale, true);
    await GUI.app._debugCommand('select_debug_frame', { frame_index: 0 });
    await GUI.app._evaluateCommand('ownLocal = 7');
    GUI.ok(GUI.app.workspace_state.some(row => row[0] === 'ownLocal' && row[2] === '7'));
    await client.resume(); GUI.eq((await pending).value, 7);
    GUI.ok(GUI.app.workspace_state.some(row => row[0] === 'globalSaved'));
    GUI.eq(GUI.app.workspace_state.some(row => row[0] === 'ownLocal'), false);
  } finally { GUI.app.openInspectorInputDialog = originalPrompt; client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'web breakpoint gutter appears left of line numbers only while this script has breakpoints', async () => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  try {
    await client.clearBreakpoints();
    const path = '/workspace/compact-breakpoints.jsl';
    GUI.app.fs.writeTextFileSync(path, 'var compact_value = 1;\ncompact_value++;\ncompact_value;');
    const frame = await GUI.editor();
    await frame.__JSLAB_WEB_EDITOR__.openFile(path, 0, 0);
    const wrapper = [...frame.document.querySelectorAll('.CodeMirror')].find(node => frame.getComputedStyle(node).display !== 'none');
    const editor = wrapper.CodeMirror;
    GUI.eq(editor.getOption('gutters').includes('jslab-breakpoints'), false);
    const original = wrapper.querySelector('.CodeMirror-gutters').getBoundingClientRect().width;
    frame.CodeMirror.signal(editor, 'gutterClick', editor, 1, 'CodeMirror-linenumbers', {});
    await GUI.wait(() => editor.getOption('gutters')[0] === 'jslab-breakpoints', 'first breakpoint gutter');
    const marker = editor.lineInfo(1).gutterMarkers['jslab-breakpoints'];
    GUI.eq(marker.textContent, '');
    GUI.ok(marker.getBoundingClientRect().left < wrapper.querySelector('.CodeMirror-linenumber').getBoundingClientRect().left);
    const width = wrapper.querySelector('.CodeMirror-gutters').getBoundingClientRect().width;
    GUI.ok(width > original && width <= original + 15);
    frame.CodeMirror.signal(editor, 'gutterClick', editor, 1, 'jslab-breakpoints', {});
    await GUI.wait(() => !editor.getOption('gutters').includes('jslab-breakpoints'), 'last breakpoint removed');
    GUI.eq(wrapper.querySelector('.CodeMirror-gutters').getBoundingClientRect().width, original);
  } finally { await client.clearBreakpoints(); client.dispose(); GUI.app.worker_debugger = null; }
  return true;
});

webTest(tests, 'debugger example walkthrough edits selected locals and produces the documented result', async code => {
  await GUI.app._startWorkerDebugger();
  const client = GUI.app.worker_debugger;
  try {
    await client.clearBreakpoints();
    const doc = await GUI.debuggerPane();
    GUI.app.fs.writeTextFileSync('/workspace/exampleDebugger.jsl', code);
    const pending = client.evaluate(code, {path:'/workspace/exampleDebugger.jsl'});
    pending.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'example debugger statement');
    GUI.ok([...GUI.q('#debugger-frames',doc).options].every(option => Number(option.title.match(/:(\d+)$/)?.[1]) <= code.split('\n').length),'generated wrapper frames must stay hidden');
    GUI.ok(GUI.app.workspace_state.some(row => row[0] === 'local_value' && row[2] === '6'));
    await GUI.app._evaluateCommand('inspectVariable("details")');
    GUI.ok([...document.querySelectorAll('.jslab-inspector')].at(-1).textContent.includes('squared'));
    await GUI.app._evaluateCommand('local_value = 10');
    const caller = client.frames.findIndex(frame => frame.name.includes('debugWorkflow'));
    GUI.ok(caller >= 0);
    GUI.input('#debugger-frames', String(caller), doc, 'change');
    await GUI.wait(() => client.frame_index === caller, 'example caller selected');
    GUI.ok(GUI.app.workspace_state.some(row => row[0] === 'offset' && row[2] === '5'));
    await GUI.app._evaluateCommand('offset = 100');
    GUI.hideDebugger();
    const reopened = await GUI.debuggerPane();
    GUI.eq(client.frame_index, caller);
    const child = client.frames.findIndex(frame => frame.name.includes('debugCalculation'));
    GUI.input('#debugger-frames', String(child), reopened, 'change');
    await GUI.wait(() => client.frame_index === child, 'example calculation selected');
    await new Promise(resolve => setTimeout(resolve, 0));
    GUI.click('#run-menu', (await GUI.editor()).document);
    GUI.eq((await pending).success, true);
    GUI.eq((await client.evaluate('debug_result')).value, 119);
    const baseline = client.evaluate(code, {path:'/workspace/exampleDebugger.jsl'});
    baseline.catch(() => {});
    await GUI.wait(() => client.state === 'paused', 'unmodified example');
    await client.resume(); GUI.eq((await baseline).success, true);
    GUI.eq((await client.evaluate('debug_result')).value, 20);
  } finally { client.dispose(); GUI.app.worker_debugger = null; GUI.hideDebugger(); }
  return true;
}, require('fs').readFileSync(require('path').join(__dirname, '../../../examples/exampleDebugger.jsl'), 'utf8'));

webTest(tests, 'Editor opens the call stack and Ctrl+C preserves selected text before stopping execution', async () => {
  await GUI.app._startWorkerDebugger(); const client = GUI.app.worker_debugger;
  try {
    await client.clearBreakpoints();
    const frame = await GUI.editor(); const doc = frame.document;
    const editor = [...doc.querySelectorAll('.CodeMirror')].find(node => frame.getComputedStyle(node).display !== 'none').CodeMirror;
    const pending = client.evaluate('var toolbar_saved = 42; function holdToolbar() { debugger; while(true) {} } holdToolbar();');
    pending.catch(() => {}); await GUI.wait(() => client.state === 'paused');
    GUI.click('#editor-debugger-open',doc);
    await GUI.wait(() => !doc.getElementById('editor-debugger-pane').hidden, 'Editor debugger pane');
    const debugDoc = await GUI.debuggerPane();
    GUI.eq(debugDoc.querySelector('[data-debug-action="continue"]'),null);
    editor.setSelection({line:0,ch:0},{line:0,ch:1});
    const copied = GUI.key(doc,'c',{ctrlKey:true});
    GUI.eq(copied.defaultPrevented,false); GUI.eq(client.state,'paused');
    editor.setSelection({line:0,ch:0}); frame.getSelection().removeAllRanges();
    const interrupted = GUI.key(doc,'c',{ctrlKey:true}); GUI.eq(interrupted.defaultPrevented,true);
    GUI.eq((await pending).interrupted,true);
    GUI.eq((await client.evaluate('toolbar_saved')).value,42);
    GUI.eq(doc.querySelector('#editor-debugger-actions').hidden,true);
    GUI.eq(doc.querySelector('#run-menu str').getAttribute('sid'),'14');
  } finally {client.dispose();GUI.app.worker_debugger=null;}
  return true;
});

webTest(tests, 'Editor debugger split uses the standard resizer and preserves its saved height', async () => {
  const doc=await GUI.debuggerPane(); const api=doc.defaultView.__JSLAB_WEB_EDITOR__;
  const pane=api.debuggerPane; const old=pane.split.cells_size[0];
  const rect=pane.resizer.getBoundingClientRect();
  pane.resizer.dispatchEvent(new doc.defaultView.MouseEvent('mousedown',{clientX:rect.left+5,clientY:rect.top+5,bubbles:true,cancelable:true}));
  doc.dispatchEvent(new doc.defaultView.MouseEvent('mousemove',{clientX:rect.left+5,clientY:rect.top-40,bubbles:true}));
  doc.dispatchEvent(new doc.defaultView.MouseEvent('mouseup',{bubbles:true}));
  GUI.ok(pane.split.cells_size[0] < old);
  const saved=JSON.parse(doc.defaultView.localStorage.getItem('jslab-web:panel-editor-debugger'));
  GUI.eq(saved[0],pane.split.cells_size[0]);
  GUI.click('#editor-debugger-close',doc); GUI.eq(pane.visible,false); GUI.eq(pane.code.style.height,'100%');
  GUI.click('#editor-debugger-open',doc); await GUI.wait(() => pane.visible,'pane reopened');
  GUI.ok(Math.abs(parseFloat(pane.code.style.height)-saved[0]) < .001,'restored splitter height');
  GUI.eq(doc.body.classList.contains('dragging'),false);
  GUI.eq(GUI.app.window_manager.windows.has('jslab-debugger'),false);
  return true;
});
