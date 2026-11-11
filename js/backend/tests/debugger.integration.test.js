/**
 * @file JSLAB real Electron debugger integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;
// The dedicated runner supplies an explicitly owned session through MCP.
if(!global.__JSLAB_DEBUGGER_TEST__) return;
const { client, folder } = global.__JSLAB_DEBUGGER_TEST__;
const add = tests.add.bind(tests);
tests.add = (name, fun, options) => add(name, async assert => {
  try { await fun(assert); }
  finally {
    const state = await call('get_debug_state');
    if(state.state === 'paused' || state.state === 'running') {
      await call('interrupt_execution');
      await until(async () => (await call('get_debug_state')).state === 'idle', 'Test cleanup did not finish.');
    }
  }
}, options);


async function call(name, args = {}) {
  const reply = await client.callTool({ name: name, arguments: args });
  const text = reply.content.find(content => content.type === 'text').text;
  let result;
  try { result = JSON.parse(text); } catch(error) { throw new Error(text); }
  return result;
}

async function until(predicate, message, timeout_ms = 10000) {
  const deadline = Date.now() + timeout_ms;
  while(Date.now() < deadline) {
    const result = await predicate();
    if(result) return result;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error(message);
}

async function evaluated(code) {
  let job = await call('evaluate_code', { code: code });
  if(job.status === 'running') job = await until(async () => {
    const result = await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 });
    return result.status === 'completed' && result;
  }, 'Evaluation did not finish.', 180000);
  if(!job.result?.success) throw new Error(JSON.stringify(job));
  return job.result;
}

async function stop(job) {
  await call('interrupt_execution');
  return until(async () => {
    const result = await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 });
    return result.status === 'completed' && result;
  }, 'Interrupted execution did not complete.');
}

tests.add('conditional breakpoints, disabled points and script debugger functions share settings', async function(assert) {
  const script = path.join(folder, 'conditional breakpoints.jsl');
  fs.writeFileSync(script, 'function conditionalLoop() {\n  let sum = 0;\n  for(let index = 0; index < 5; index++) {\n    sum += index;\n  }\n  return sum;\n}\nconditionalLoop();');
  try {
    await call('set_breakpoint', { path: script, line: 4, condition: 'index === 3' });
    const job = await call('run_file', { path: script, wait_ms: 0 });
    await until(async () => (await call('get_debug_state')).state === 'paused', 'Conditional breakpoint did not pause.');
    const local = await call('evaluate_debug_expression', { expression: 'index' });
    assert.equal(local.value.value, 3);
    await call('set_breakpoint', { path: script, line: 4, condition: 'true', enabled: false });
    await call('resume_execution');
    const done = await until(async () => { const result = await call('get_execution', { execution_id: job.execution_id }); return result.status === 'completed' && result; }, 'Conditional script did not finish.');
    assert.equal(done.result.success, true);
    assert.equal((await call('get_debug_state')).breakpoints[0].enabled, false);
    await evaluated('await dbclear(); await dbstop(' + JSON.stringify(script) + ', 4, "index === 4", false);');
    assert.equal((await call('get_debug_state')).breakpoints[0].condition, 'index === 4');
    assert.equal((await evaluated('(await dbstatus()).breakpoints.length')).value.preview, '1');
  } finally { await call('clear_breakpoints'); }
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('exception stops retain locals before unwinding and distinguish user catches', async function(assert) {
  const script = path.join(folder, 'exception pause.jsl');
  fs.writeFileSync(script, 'function failingCalculation() {\n  let preserved_local = 17;\n  return null.missing;\n}\nfailingCalculation();');
  try {
    await call('set_exception_pause', { state: 'uncaught' });
    const job = await call('run_file', { path: script, wait_ms: 0 });
    await until(async () => (await call('get_debug_state')).state === 'paused', 'Error did not pause before unwinding.');
    const local = await call('evaluate_debug_expression', { expression: 'preserved_local' });
    assert.equal(local.value.value, 17);
    await call('resume_execution');
    await until(async () => (await call('get_execution', { execution_id: job.execution_id })).status === 'completed', 'Error evaluation did not complete.');
    const caught = await evaluated('try { throw new Error("caught sentinel"); } catch(error) { var caught_result = true; } caught_result;');
    assert.equal(caught.value.preview, 'true');
    await call('set_exception_pause', { state: 'all' });
    const caught_job = await call('evaluate_code', { code: 'try { throw new Error("pause caught"); } catch(error) { var caught_again = true; }', wait_ms: 0 });
    await until(async () => (await call('get_debug_state')).state === 'paused', 'Caught exception did not pause.');
    await call('set_exception_pause', { state: 'none' });
    await call('resume_execution');
    await until(async () => (await call('get_execution', { execution_id: caught_job.execution_id })).status === 'completed', 'Caught evaluation did not finish.');
  } finally { await call('set_exception_pause', { state: 'none' }); }
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('error stops distinguish CommonJS catches and expose module locals by default', async function(assert) {
  const module_path = path.join(folder, 'debug exception module.js');
  fs.writeFileSync(module_path, 'exports.caught = function() { try { null.missing; } catch(error) { return true; } };\nexports.fail = function() { let module_local = 31; return null.missing; };');
  try {
    await call('set_exception_pause', { state: 'uncaught' });
    const caught_job = await call('evaluate_code', { code: 'require(' + JSON.stringify(module_path) + ').caught();', wait_ms: 0 });
    const caught = await until(async () => {
      const state = await call('get_debug_state');
      if(state.state === 'paused') throw Error('Caught module error paused: ' + JSON.stringify(state.frames));
      const result = await call('get_execution', { execution_id: caught_job.execution_id, wait_ms: 0 });
      return result.status === 'completed' && result;
    }, 'Caught module command did not finish.');
    assert.equal(caught.result.value.preview, 'true');
    const job = await call('evaluate_code', { code: 'require(' + JSON.stringify(module_path) + ').fail();', wait_ms: 0 });
    await until(async () => (await call('get_debug_state')).state === 'paused', 'Module exception did not pause.');
    const state = await call('get_debug_state');
    assert.equal(state.frames[0].path, module_path);
    assert.equal((await call('evaluate_debug_expression', { expression: 'module_local' })).value.value, 31);
    await call('set_exception_pause', { state: 'none' }); await call('resume_execution');
    await until(async () => (await call('get_execution', { execution_id: job.execution_id })).status === 'completed', 'Module exception did not finish.');
  } finally { await call('set_exception_pause', { state: 'none' }); }
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('first-line CommonJS runtime error columns exclude Electron wrapper source', async function(assert) {
  const module_path = path.join(folder, 'first line runtime.js');
  const source = 'module.exports = function firstLineFailure() { return null.missing; };';
  fs.writeFileSync(module_path, source);
  const result = await call('evaluate_code', { code: 'require(' + JSON.stringify(module_path) + ')();' });
  assert.equal(result.result.success, false);
  assert.equal(result.result.error_details.location.path, module_path);
  assert.equal(result.result.error_details.location.line, 1);
  assert.equal(result.result.error_details.location.column, source.indexOf('missing') + 1);
  const retained = path.join(folder, 'retained edited module.js');
  fs.writeFileSync(retained, source);
  await evaluated('var retained_module_function = require(' + JSON.stringify(retained) + ');');
  fs.writeFileSync(retained, '// file changed after loading\nmodule.exports = () => 42;');
  const older = await call('evaluate_code', { code: 'retained_module_function();' });
  assert.equal(older.result.error_details.location.path, retained);
  assert.equal(older.result.error_details.location.column, source.indexOf('missing') + 1);
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('relative breakpoint names resolve against the persistent working directory and can be cleared', async function(assert) {
  const script = path.join(folder, 'relative breakpoint.jsl');
  fs.writeFileSync(script, 'var relative_point = 9;\nrelative_point;');
  const info = await call('get_runtime_info');
  const cwd = info.result.value.cwd;
  let job;
  try {
    await call('evaluate_code', { code: 'void 0', cwd: folder });
    const point = await call('set_breakpoint', { path: 'relative breakpoint.jsl', line: 1 });
    assert.equal(point.id, script + ':1');
    job = await call('run_file', { path: script, wait_ms: 0 });
    await until(async () => (await call('get_debug_state')).state === 'paused', 'Relative breakpoint did not pause.');
    await call('remove_breakpoint', { id: 'relative breakpoint.jsl:1' });
    await call('resume_execution');
    await until(async () => (await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 })).status === 'completed', 'Relative script did not finish.');
  } finally {
    if((await call('get_debug_state')).state === 'paused' && job) await stop(job);
    await call('clear_breakpoints');
    await call('evaluate_code', { code: 'void 0', cwd });
  }
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('native live editing validates syntax, patches future calls and keeps paused locals', async function(assert) {
  const script = path.join(folder, 'live edit source.jsl');
  const original = 'function liveEdited(value) { return value + 1; }';
  const edited = 'function liveEdited(value) { return value + 20; }';
  fs.writeFileSync(script, original);
  await call('run_file', { path: script });
  const job = await call('evaluate_code', { code: 'function holdEdit() { let preserved = 42; debugger; return liveEdited(preserved); } holdEdit();', wait_ms: 0 });
  try {
    await until(async () => (await call('get_debug_state')).state === 'paused', 'Live edit test did not pause.');
    const invalid = await client.callTool({ name: 'update_debug_script', arguments: { path: script, code: 'function invalid(' } });
    assert.equal(invalid.isError, true);
    assert.equal((await call('evaluate_debug_expression', { expression: 'preserved' })).value.value, 42);
    const dry = await call('update_debug_script', { path: script, code: edited, dry_run: true });
    assert.equal(dry.status, 'Validated');
    assert.equal((await call('evaluate_debug_expression', { expression: 'liveEdited(1)', allow_side_effects: true })).value.value, 2);
    const applied = await call('update_debug_script', { path: script, code: edited });
    assert.equal(applied.applied, true, JSON.stringify(applied));
    assert.equal((await call('evaluate_debug_expression', { expression: 'preserved' })).value.value, 42);
    await call('resume_execution');
    const result = await until(async () => { const result = await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 }); return result.status === 'completed' && result; }, 'Edited code did not finish.');
    assert.equal(result.result.value.preview, '62');
  } finally { if((await call('get_debug_state')).state === 'paused') await stop(job); }
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('native async ancestry exposes callback scheduling locations without inventing historical scopes', async function(assert) {
  const script = path.join(folder, 'async ancestry.jsl');
  fs.writeFileSync(script, 'await new Promise(resolve => {\n  setTimeout(function scheduledCallback() { let callback_local = 7; debugger; resolve(callback_local); }, 10);\n});');
  const job = await call('run_file', { path: script, wait_ms: 0 });
  await until(async () => (await call('get_debug_state')).state === 'paused', 'Async callback did not pause.');
  const state = await call('get_debug_state');
  assert.ok(state.async_stack.some(entry => entry.frames.some(frame => frame.path === script)), JSON.stringify(state.async_stack));
  assert.equal(state.async_stack.every(entry => entry.frames.every(frame => frame.inspectable === false)), true);
  await stop(job);
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('isolated native tasks copy results and can be killed without clearing parent variables', async function(assert) {
  const result = await evaluated('var native_parent_value = 42; await runInterruptible(values => new Float64Array(Array.from(values, value => value * 2)), [new Float64Array([1, 2, 3])]);');
  assert.ok(result.value.preview.includes('6'), JSON.stringify(result));
  const error = await call('evaluate_code', { code: 'await runInterruptible(() => { throw new TypeError("isolated task failure"); });' });
  assert.equal(error.result.success, false);
  assert.ok(error.result.error.includes('isolated task failure'));
  const bytes = [0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,7,8,1,4,115,112,105,110,0,0,10,9,1,7,0,3,64,12,0,11,11];
  const started = path.join(folder, 'native-task-started');
  const job = await call('evaluate_code', { code: 'await runInterruptible((bytes, started) => { const spin = new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(bytes))).exports.spin; require("fs").writeFileSync(started, "ready"); spin(); }, [' + JSON.stringify(bytes) + ',' + JSON.stringify(started) + ']);', wait_ms: 0 });
  await until(() => fs.existsSync(started), 'Isolated runtime did not enter native work.', 30000);
  const interrupted = await stop(job);
  assert.equal(interrupted.result.interrupted, true);
  assert.equal((await evaluated('native_parent_value')).value.preview, '42');
}, { tags: ['integration', 'native'], timeout_ms: 90000 });

tests.add('desktop frame restart re-enters the selected function and reports invalid requests', async function(assert) {
  await evaluated('var restart_entries = 0;');
  const job = await call('evaluate_code', { code: 'function restartable() { restart_entries++; debugger; return restart_entries; } restartable();', wait_ms: 0 });
  await until(async () => (await call('get_debug_state')).state === 'paused', 'Restart test did not pause.');
  const response = await call('restart_debug_frame', { frame_index: 0 });
  assert.ok(response.success !== false, JSON.stringify(response));
  await until(async () => (await call('get_debug_state')).state === 'paused', 'Restart did not pause at function entry.');
  await call('resume_execution');
  await until(async () => (await call('get_debug_state')).state === 'paused', 'Restarted function did not reach its debugger statement.');
  const inspected = await call('evaluate_debug_expression', { expression: 'restart_entries', frame_index: 0 });
  assert.equal(inspected.value.value, 2);
  await stop(job);
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('Ctrl+C interrupts an uninstrumented loop, bypasses catch and preserves workspace', async function(assert) {
  await evaluated('var interrupt_value = 42; var interrupt_caught = false;');
  const job = await call('evaluate_code', { code: 'try { while(true) {} } catch(e) { interrupt_caught = true; }', wait_ms: 0 });
  await until(async () => (await call('get_debug_state')).state === 'running', 'Loop did not start.');
  const result = await stop(job);
  assert.equal(result.result.interrupted, true);
  assert.equal(result.result.success, false);
  assert.equal((await evaluated('interrupt_value')).value.preview, '42');
  assert.equal((await evaluated('interrupt_caught')).value.preview, 'false');
  assert.equal((await call('get_debug_state')).state, 'idle');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('pause inspects live function locals, expands objects and blocks inspection side effects', async function(assert) {
  const job = await call('evaluate_code', { code: `function debuggerLoop() {
    let counter = 0;
    let live = { value: 7, get bad() { throw Error('Getter must not run'); } };
    while(true) { counter++; live.value = counter; }
  }
  debuggerLoop();`, wait_ms: 0 });
  await new Promise(resolve => setTimeout(resolve, 150));
  await call('pause_execution');
  const state = await until(async () => {
    const state = await call('get_debug_state');
    return state.state === 'paused' && state;
  }, 'Loop did not pause.');
  const index = state.frames.findIndex(frame => frame.name === 'debuggerLoop');
  assert.ok(index >= 0, JSON.stringify(state.frames));
  const value = await call('evaluate_debug_expression', { expression: 'counter', frame_index: index });
  assert.ok(value.value.value > 0);
  const denied = await call('evaluate_debug_expression', { expression: 'counter = 0', frame_index: index });
  assert.ok(denied.error);
  const scope = state.frames[index].scopes.find(scope => scope.type === 'local');
  const properties = await call('inspect_debug_object', { object_id: scope.object_id });
  const live = properties.properties.find(property => property.name === 'live');
  assert.ok(live.value.object_id);
  const nested = await call('inspect_debug_object', { object_id: live.value.object_id });
  assert.equal(nested.properties.find(property => property.name === 'bad').accessor, true);
  await stop(job);
  assert.equal((await evaluated('2 + 3')).value.preview, '5');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('debugger statement supports modification, stepping and continuation', async function(assert) {
  const job = await call('evaluate_code', { code: 'var step_value = 1;\ndebugger;\nstep_value += 2;\nstep_value *= 3;', wait_ms: 0 });
  const state = await until(async () => {
    const state = await call('get_debug_state');
    return state.state === 'paused' && state;
  }, 'Debugger statement did not pause.');
  const changed = await call('evaluate_debug_expression', { expression: 'step_value = 5', allow_side_effects: true });
  assert.equal(changed.error, null);
  await call('resume_execution', { action: 'stepOver' });
  await until(async () => {
    const next = await call('get_debug_state');
    return next.state === 'paused' && next.revision !== state.revision;
  }, 'Step did not pause again.');
  await call('resume_execution');
  await until(async () => (await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 })).status === 'completed', 'Continue did not finish.');
  assert.equal((await evaluated('step_value')).value.preview, '21');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('interrupt awaited work cancels timers, prevents late writes and runs all registered cleanup once', async function(assert) {
  const job = await call('evaluate_code', { code: `var cleanup_count = 0; var late_write = false;
    jsl.addForCleanup({}, async () => { await jsl._Promise.resolve(); cleanup_count++; });
    jsl.addForCleanup({}, () => { throw Error('Expected cleanup error'); });
    jsl.addForCleanup({}, () => { cleanup_count++; });
    setTimeout(() => { late_write = true; }, 300);
    jsl._console.log('test-await-ready');
    await waitSeconds(60);
    late_write = true;`, wait_ms: 0 });
  await until(async () => {
    const current = await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 });
    return current.console_output?.some(entry => entry.text.includes('test-await-ready'));
  }, 'Await did not start.');
  const result = await stop(job);
  assert.equal(result.result.cleanup_errors.length, 1, JSON.stringify(result.result.cleanup_errors));
  assert.equal((await evaluated('cleanup_count')).value.preview, '2');
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.equal((await evaluated('late_write')).value.preview, 'false');
  await call('interrupt_execution');
  await until(async () => (await call('get_debug_state')).state === 'idle', 'Idle cleanup failed.');
  assert.equal((await evaluated('cleanup_count')).value.preview, '2');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('original .jsl line breakpoints bind before first execution', async function(assert) {
  const filename = path.join(folder, 'debug-breakpoint.jsl');
  fs.writeFileSync(filename, 'var file_value = 10;\nfile_value += 5;\nfile_value *= 2;\n');
  const breakpoint = await call('set_breakpoint', { path: filename, line: 2 });
  const job = await call('run_file', { path: filename, wait_ms: 0 });
  const state = await until(async () => {
    const state = await call('get_debug_state');
    return state.state === 'paused' && state;
  }, 'File breakpoint was not hit.');
  assert.equal(state.frames[0].path, filename);
  assert.equal(state.frames[0].line, 2, JSON.stringify(state.frames[0]));
  await call('remove_breakpoint', { id: breakpoint.id });
  await call('resume_execution');
  await until(async () => (await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 })).status === 'completed', 'File did not continue.');
  assert.equal((await evaluated('file_value')).value.preview, '30');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('legacy pause aliases use debugger scopes and stoppoint aborts remaining statements', async function(assert) {
  for(const alias of ['pause', 'breakpoint', 'debug']) {
    const job = await call('evaluate_code', { code: 'var alias_value = 1; ' + alias + '; alias_value = 2;', wait_ms: 0 });
    await until(async () => (await call('get_debug_state')).state === 'paused', alias + ' did not pause.');
    assert.equal((await call('evaluate_debug_expression', { expression: 'alias_value' })).value.value, 1);
    await call('resume_execution');
    await until(async () => (await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 })).status === 'completed', alias + ' did not continue.');
    assert.equal((await evaluated('alias_value')).value.preview, '2');
  }
  const job = await call('evaluate_code', { code: 'var stopped_value = 1; stoppoint; stopped_value = 2;', wait_ms: 0 });
  const result = await until(async () => {
    const result = await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 });
    return result.status === 'completed' && result;
  }, 'stoppoint did not interrupt.');
  assert.equal(result.result.interrupted, true);
  assert.equal((await evaluated('stopped_value')).value.preview, '1');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('interruption terminates an owned subprocess without scanning OS processes', async function(assert) {
  await evaluated('var owned_process = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }, windowsHide: true, stdio: "ignore" });');
  assert.ok(Number((await evaluated('owned_process.pid')).value.preview) > 0);
  await call('interrupt_execution');
  await until(async () => (await call('get_debug_state')).state === 'idle', 'Process cleanup did not finish.');
  assert.equal((await evaluated('jsl.listSubprocesses().length')).value.preview, '0');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('workers pause independently and interruption terminates the tracked worker', async function(assert) {
  await evaluated(`var worker_source = URL.createObjectURL(new Blob(['let count = 0; while(true) { count++; }'], { type: 'application/javascript' }));
    var debug_worker = new Worker(worker_source);`);
  const workers = await until(async () => {
    const state = await call('get_debug_state');
    return state.workers.length && state.workers;
  }, 'Worker target was not attached.');
  assert.ok(workers.length > 0);
  const job = await call('evaluate_code', { code: 'debugger; var worker_pause_result = 1;', wait_ms: 0 });
  await until(async () => {
    const state = await call('get_debug_state');
    return state.state === 'paused' && state.workers.every(worker => worker.paused);
  }, 'Worker did not acknowledge pause.');
  await stop(job);
  await until(async () => (await call('get_debug_state')).workers.length === 0, 'Worker was not terminated.');
  assert.equal((await evaluated('2 + 2')).value.preview, '4');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('paused worker selection inspects and edits worker locals and steps its actual target', async function(assert) {
  const code = 'self.onmessage = function workerCalculation() { let worker_local = 7; let payload = { answer: 42 }; debugger; worker_local++; self.postMessage(worker_local); };';
  await evaluated('var selectable_worker = new Worker(URL.createObjectURL(new Blob([' + JSON.stringify(code) + '], { type: "application/javascript" })));');
  const job = await call('evaluate_code', { code: 'var worker_result = await new Promise(resolve => { selectable_worker.onmessage = event => resolve(event.data); selectable_worker.postMessage(1); }); worker_result;', wait_ms: 0 });
  try {
    const state = await until(async () => { const state = await call('get_debug_state'); return state.state === 'paused' && state.workers.some(worker => worker.paused) && state; }, 'Worker did not pause.');
    const target = state.workers.find(worker => worker.paused).session_id;
    await call('select_debug_target', { session_id: target });
    assert.equal((await call('evaluate_debug_expression', { expression: 'worker_local' })).value.value, 7);
    const payload = await call('evaluate_debug_expression', { expression: 'payload' });
    const properties = await call('inspect_debug_object', { object_id: payload.value.object_id });
    assert.equal(properties.properties.find(property => property.name === 'answer').value.value, 42);
    await call('evaluate_debug_expression', { expression: 'worker_local = 20', allow_side_effects: true });
    const before = (await call('get_debug_state')).revision;
    await call('resume_execution', { action: 'stepOver' });
    await until(async () => { const state = await call('get_debug_state'); return state.state === 'paused' && state.revision > before; }, 'Worker step did not pause.');
    await call('resume_execution');
    const result = await until(async () => { const result = await call('get_execution', { execution_id: job.execution_id }); return result.status === 'completed' && result; }, 'Worker command did not finish.');
    assert.equal(result.result.value.preview, '21');
  } finally {
    const state = await call('get_debug_state');
    if(state.state === 'paused' || state.state === 'running') await stop(job);
    await evaluated('selectable_worker.terminate();');
  }
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('stale promise continuations cannot run after interruption and new promises still work', async function(assert) {
  await evaluated(`var late_promise_write = false; var resolve_old;
    var old_promise = new Promise(resolve => { resolve_old = resolve; });
    old_promise.then(() => { late_promise_write = true; }); void 0;`);
  await call('interrupt_execution');
  await until(async () => (await call('get_debug_state')).state === 'idle', 'Promise cleanup did not finish.');
  await evaluated('resolve_old(1);');
  assert.equal((await evaluated('late_promise_write')).value.preview, 'false');
  assert.equal((await evaluated('await Promise.all([Promise.resolve(2), Promise.resolve(3)]).then(values => values[0] + values[1])')).value.preview, '5');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('rapid repeated Ctrl+C does not strand startup or cancel a subsequent command', async function(assert) {
  for(let index = 0; index < 5; index++) {
    const job = await call('evaluate_code', { code: 'while(true) {}', wait_ms: 0 });
    await Promise.all([call('interrupt_execution'), call('interrupt_execution')]);
    await until(async () => (await call('get_execution', { execution_id: job.execution_id, wait_ms: 0 })).status === 'completed', 'Rapid interruption stranded execution.');
    assert.equal((await evaluated('6 * 7')).value.preview, '42');
  }
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('WebAssembly CPU loops can be interrupted without losing the JavaScript workspace', async function(assert) {
  const bytes = [0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,7,8,1,4,115,112,105,110,0,0,10,9,1,7,0,3,64,12,0,11,11];
  const job = await call('evaluate_code', { code: 'var wasm_saved = 42; new WebAssembly.Instance(new WebAssembly.Module(new Uint8Array(' + JSON.stringify(bytes) + '))).exports.spin();', wait_ms: 0 });
  await new Promise(resolve => setTimeout(resolve, 150));
  const result = await stop(job);
  assert.equal(result.result.interrupted, true);
  assert.equal((await evaluated('wasm_saved')).value.preview, '42');
}, { tags: ['integration', 'debugger'], timeout_ms: 30000 });

tests.add('nested script failures report child and caller paths after script contexts unwind', async function(assert) {
  const parent = path.join(folder, 'error parent.jsl');
  const child = path.join(folder, 'error child.jsl');
  fs.writeFileSync(child, "function childFailure() {\n  throw new Error('nested script failure');\n}\nchildFailure();");
  fs.writeFileSync(parent, 'var parent_error_value = 1;\nawait run(' + JSON.stringify(child) + ', undefined, true, true);\nparent_error_value = 2;');
  const job = await call('run_file', { path: parent });
  const details = job.result.error_details;
  assert.equal(job.result.success, false);
  assert.equal(details.location.path, child);
  assert.equal(details.location.line, 2);
  assert.ok(details.frames.some(frame => frame.path === parent && frame.line === 2), JSON.stringify(details));
  assert.equal(job.result.error.includes('jslab://scripts/'), false);
  assert.equal((await evaluated('parent_error_value')).value.preview, '1');
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('nested module failures preserve module and script caller locations', async function(assert) {
  const script = path.join(folder, 'module caller.jsl');
  const outer = path.join(folder, 'outer.js');
  const inner = path.join(folder, 'inner.js');
  fs.writeFileSync(inner, "module.exports = function moduleFailure() {\n  throw new TypeError('nested module failure');\n};");
  fs.writeFileSync(outer, "const fail = require('./inner.js');\nmodule.exports = () => fail();");
  fs.writeFileSync(script, 'var invoke_module = require(' + JSON.stringify(outer) + ');\ninvoke_module();');
  const job = await call('run_file', { path: script });
  const details = job.result.error_details;
  assert.equal(details.name, 'TypeError');
  assert.equal(details.message, 'nested module failure');
  assert.equal(details.location.path, inner);
  assert.equal(details.location.line, 2);
  assert.ok(details.frames.some(frame => frame.path === outer));
  assert.ok(details.frames.some(frame => frame.path === script && frame.line === 2), JSON.stringify(details));
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('syntax failures in nested scripts, selected lines and modules retain original coordinates', async function(assert) {
  const child = path.join(folder, 'syntax child.jsl');
  const parent = path.join(folder, 'syntax parent.jsl');
  fs.writeFileSync(child, '// first\n// second\nvar broken = ;');
  fs.writeFileSync(parent, 'await run(' + JSON.stringify(child) + ', [3, 3], true, true);');
  let job = await call('run_file', { path: parent });
  assert.equal(job.result.error_details.kind, 'syntax');
  assert.equal(job.result.error_details.location.path, child);
  assert.equal(job.result.error_details.location.line, 3);
  assert.equal(job.result.error_details.location.column, 14);
  const module = path.join(folder, 'syntax module.js');
  fs.writeFileSync(module, '// first\nmodule.exports = ;');
  job = await call('evaluate_code', { code: 'require(' + JSON.stringify(module) + ')' });
  assert.equal(job.result.error_details.name, 'SyntaxError');
  assert.equal(job.result.error_details.location.path, module);
  assert.equal(job.result.error_details.location.line, 2);
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('async rejection and primitive throws return structured original-source errors', async function(assert) {
  for(const value of ['undefined', 'null', '0', 'false', "'primitive failure'"]) {
    const job = await call('evaluate_code', { code: '\nthrow ' + value + ';' });
    assert.equal(job.result.success, false);
    assert.equal(job.result.error_details.name, 'ThrownValue');
    assert.equal(job.result.error_details.location.line, 2);
    assert.equal(job.result.error_details.location.column, 1);
  }
  const job = await call('evaluate_code', { code: '\nawait Promise.reject(new Error("async failure"));' });
  assert.equal(job.result.error_details.message, 'async failure');
  assert.equal(job.result.error_details.location.line, 2);
  assert.equal((await evaluated('1 + 1')).value.preview, '2');
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('errors survive a parent script calling a child script which awaits a failing module', async function(assert) {
  const parent = path.join(folder, 'async parent.jsl');
  const child = path.join(folder, 'async child.jsl');
  const module = path.join(folder, 'async module.js');
  fs.writeFileSync(module, "module.exports = async function asyncModuleFailure() {\n  await Promise.resolve();\n  throw new RangeError('async module failure');\n};");
  fs.writeFileSync(child, 'var async_invoke = require(' + JSON.stringify(module) + ');\nawait async_invoke();');
  fs.writeFileSync(parent, '\nawait run(' + JSON.stringify(child) + ', undefined, true, true);');
  const result = await call('run_file', { path: parent });
  const details = result.result.error_details;
  assert.equal(details.name, 'RangeError');
  assert.equal(details.location.path, module);
  assert.equal(details.location.line, 3);
  assert.ok(details.frames.some(frame => frame.path === child && frame.line === 2), JSON.stringify(details));
  assert.ok(details.frames.some(frame => frame.path === parent && frame.line === 2), JSON.stringify(details));
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('module initialization failures and missing modules identify the script call site', async function(assert) {
  const module = path.join(folder, 'initialization failure.js');
  fs.writeFileSync(module, "\nthrow new Error('module initialization failed');");
  let result = await call('evaluate_code', { code: 'require(' + JSON.stringify(module) + ');' });
  assert.equal(result.result.error_details.location.path, module);
  assert.equal(result.result.error_details.location.line, 2);
  result = await call('evaluate_code', { code: '\nrequire(' + JSON.stringify(path.join(folder, 'missing.js')) + ');' });
  assert.equal(result.result.success, false);
  assert.ok(result.result.error.includes('missing.js'));
  assert.equal(result.result.error_details.location.path, 'jslagent');
  assert.equal(result.result.error_details.location.line, 2);
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('runtime failures clean resources and return one parsed error without contaminating the next result', async function(assert) {
  const result = await call('evaluate_code', { code: `var error_cleanup_count = 0; var error_late_write = false;
    jsl.addForCleanup({}, () => { error_cleanup_count++; });
    setTimeout(() => { error_late_write = true; }, 200);
    throw new Error('one parsed failure');` });
  assert.equal(result.result.error_details.message, 'one parsed failure');
  assert.equal(result.result.output.filter(entry => entry.type === 'error').length, 1);
  assert.equal((await evaluated('error_cleanup_count')).value.preview, '1');
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal((await evaluated('error_late_write')).value.preview, 'false');
  const next = await evaluated('console.log("new output"); 42;');
  assert.equal(next.output.some(entry => entry.type === 'error'), false);
  assert.equal(next.value.preview, '42');
  const reported = await call('evaluate_code', { code: 'jsl.inter.env.error("reported failure", false);' });
  assert.equal(reported.result.error_details.message, 'reported failure');
  assert.equal(reported.result.output.filter(entry => entry.type === 'error').length, 1);
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('DevTools native REPL has await and persistent let, but its lexical bindings are not workspace properties', async function(assert) {
  const native = async source => {
    const code = 'await require("electron").ipcRenderer.invoke("JSLAB_TEST_NATIVE_REPL", ' + JSON.stringify(source) + ')';
    const result = await evaluated(code + ';');
    return result.value.preview;
  };
  assert.ok((await native('let native_repl_probe = await Promise.resolve(41); native_repl_probe + 1')).includes('42'));
  assert.ok((await native('let native_repl_probe = 7; native_repl_probe')).includes('7'));
  assert.ok((await native('Object.hasOwn(globalThis, "native_repl_probe")')).includes('false'));
  assert.ok((await native('delete globalThis.native_repl_probe; native_repl_probe')).includes('7'));
}, { tags: ['integration', 'eval'], timeout_ms: 30000 });

tests.add('object literals and blocks preserve source columns and do not require artificial parentheses', async function(assert) {
  assert.ok((await evaluated('{ value: 42 }')).value.preview.includes('42'));
  assert.equal((await evaluated('{ let block_local = 7; } typeof block_local;')).value.preview, "'undefined'");
  const result = await call('evaluate_code', { code: '{ value: missing_object_value }' });
  assert.equal(result.result.error_details.location.line, 1);
  assert.equal(result.result.error_details.location.column, 10);
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('first-line module syntax, unsupported script syntax and primitive rejections retain original coordinates', async function(assert) {
  const module = path.join(folder, 'first line syntax.js');
  fs.writeFileSync(module, 'module.exports = ;');
  let result = await call('evaluate_code', { code: 'require(' + JSON.stringify(module) + ');' });
  assert.equal(result.result.error_details.location.path, module);
  assert.equal(result.result.error_details.location.line, 1);
  assert.equal(result.result.error_details.location.column, 18);
  for(const code of ['\nconst typed: number = 1;', '\nexport const x = 1;', '\nconst node = <div/>;']) {
    result = await call('evaluate_code', { code });
    assert.equal(result.result.error_details.kind, 'syntax');
    assert.equal(result.result.error_details.location.line, 2);
  }
  result = await call('evaluate_code', { code: '\nawait Promise.reject(0);' });
  assert.equal(result.result.error_details.message, '0');
  assert.equal(result.result.error_details.location.line, 2);
  assert.equal(result.result.error_details.location.column, 7);
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('detached errors retain their original script without failing a different active request', async function(assert) {
  const script = path.join(folder, 'detached callback.jsl');
  fs.writeFileSync(script, 'setTimeout(function detachedFailure() {\n  throw new Error("detached sentinel");\n}, 500);');
  const setup = await call('run_file', { path: script });
  assert.equal(setup.result.success, true);
  const result = await evaluated('await waitSeconds(1); 42;');
  assert.equal(result.value.preview, '42');
  assert.equal(result.output.some(item => item.type === 'error'), false);
  const original = await evaluated('jsl.last_error_details.location.path === ' + JSON.stringify(script) +
    ' && jsl.last_error_details.location.line === 2 && jsl.last_error_details.message === "detached sentinel"');
  assert.equal(original.value.preview, 'true');
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('rewritten imports preserve nested module errors and import-site failures', async function(assert) {
  const script = path.join(folder, 'import caller.jsl');
  const module_path = path.join(folder, 'import module.js');
  fs.writeFileSync(module_path, "exports.fail = function importedFailure() {\n  throw new RangeError('imported failure');\n};");
  fs.writeFileSync(script, 'import { fail } from ' + JSON.stringify(module_path) + ';\nfail();');
  let job = await call('run_file', { path: script });
  assert.equal(job.result.error_details.location.path, module_path);
  assert.equal(job.result.error_details.location.line, 2);
  assert.ok(job.result.error_details.frames.some(frame => frame.path === script && frame.line === 2));
  fs.writeFileSync(script, '// original first line\nimport { missing } from ' + JSON.stringify(path.join(folder, 'absent import.js')) + ';');
  job = await call('run_file', { path: script });
  assert.equal(job.result.success, false);
  assert.equal(job.result.error_details.location.path, script);
  assert.equal(job.result.error_details.location.line, 2);
}, { tags: ['integration', 'errors'], timeout_ms: 30000 });

tests.add('functions defined in older scripts keep their source locations after more than 100 commands', async function(assert) {
  const file = path.join(folder, 'retained function.jsl');
  fs.writeFileSync(file, 'function retainedFailure() {\n  throw new Error("retained source");\n}');
  const defined = await call('run_file', { path: file });
  assert.equal(defined.result.success, true);
  for(let index = 0; index < 105; index++) await evaluated('void ' + index + ';');
  const result = await call('evaluate_code', { code: 'retainedFailure();' });
  assert.equal(result.result.error_details.location.path, file);
  assert.equal(result.result.error_details.location.line, 2);
}, { tags: ['integration', 'errors'], timeout_ms: 60000 });

if(global.__JSLAB_DEBUGGER_TEST__.sandbox_suite) {
  tests.add('existing sandbox suite passes inside the real JSLAB runtime', async function(assert) {
    const result = await evaluated(`globalThis.process_arguments = ['node'];
      var sandbox_tester = new (jsl._require(jsl.app_path + '/js/shared/tester').PRDC_JSLAB_TESTER)('sandbox');
      var sandbox_summary = await sandbox_tester.runTests();
      [sandbox_summary.passed, sandbox_summary.failed, sandbox_summary.total];`);
    const [passed, failed, total] = JSON.parse(result.value.preview);
    if(failed) {
      const report = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../temp/test-report-sandbox.json'), 'utf8'));
      console.error(report.tests.filter(test => test.status === 'failed'));
    }
    assert.equal(failed, 0);
    console.log('Sandbox suite:', { passed, failed, total });
  }, { tags: ['integration', 'debugger'], timeout_ms: 180000 });
}
