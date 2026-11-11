/**
 * @file JSLAB debugger controller tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { EventEmitter } = require('events');
const { SourceMapGenerator } = require('source-map');
const { PRDC_JSLAB_DEBUGGER } = require('../debugger');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

async function harness() {
  const commands = [];
  const states = [];
  const errors = [];
  const completions = [];
  const settings = [];
  const transport = new EventEmitter();
  transport.isAttached = () => true;
  transport.sendCommand = async (method, args, session) => {
    commands.push({ method: method, args: args, session: session });
    if(method === 'Debugger.pause') queueMicrotask(() => controller._message('Debugger.paused', pauseFrames()));
    if(method === 'Runtime.evaluate') return { result: { value: { success: true, cleanup_errors: [] } } };
    if(method === 'Debugger.setBreakpointByUrl') return { breakpointId: 'binding-' + commands.length };
    return {};
  };
  const contents = new EventEmitter();
  contents.debugger = transport;
  const controller = new PRDC_JSLAB_DEBUGGER(contents, {
    state: state => states.push(state), error: error => errors.push(error),
    settings: value => settings.push(value),
    interrupted: (id, result) => completions.push({ id: id, result: result })
  });
  await controller.ready;
  return { controller, transport, contents, commands, states, errors, completions, settings };
}

function pauseFrames() {
  return { reason: 'other', callFrames: [{ callFrameId: 'frame-1', functionName: 'calculate',
    url: 'jslab://test.js', location: { scriptId: '1', lineNumber: 2, columnNumber: 0 },
    scopeChain: [{ type: 'local', object: { objectId: 'locals-1' } }] }] };
}

tests.add('controller enables debugger before work and ignores stale completion', async function(assert) {
  const h = await harness();
  assert.deepEqual(h.commands.slice(0, 5).map(command => command.method),
    ['Runtime.enable', 'Debugger.enable', 'Debugger.setAsyncCallStackDepth', 'Debugger.setBlackboxPatterns', 'Target.setAutoAttach']);
  h.controller.begin('a');
  h.controller.finish('old');
  assert.equal(h.controller.state, 'running');
  h.controller.finish('a');
  assert.equal(h.controller.state, 'idle');
  h.controller.dispose();
}, { tags: ['unit', 'debugger'] });

tests.add('Ctrl+C coalesces repeated requests, consumes idle termination and waits for cleanup acknowledgement', async function(assert) {
  const h = await harness();
  h.controller.begin('a');
  const command_start = h.commands.length;
  const first = h.controller.interrupt();
  const second = h.controller.interrupt();
  assert.equal(first, second);
  await first;
  const operations = h.commands.slice(command_start);
  assert.deepEqual(operations.map(command => command.method),
    ['Debugger.pause', 'Runtime.evaluate', 'Runtime.evaluate', 'Debugger.resume', 'Target.setAutoAttach',
      'Runtime.evaluate', 'Target.setAutoAttach', 'Runtime.releaseObjectGroup']);
  assert.equal(operations[1].args.expression, 'void 0');
  assert.ok(operations[2].args.expression.includes('cancel("a")'));
  assert.equal(operations[3].args.terminateOnResume, true);
  assert.ok(operations[5].args.expression.includes('interrupt("a")'));
  assert.equal(h.completions.length, 1);
  assert.equal(h.controller.state, 'idle');
  h.controller.dispose();
}, { tags: ['unit', 'debugger'] });

tests.add('failed interruption does not falsely mark sandbox ready or release its execution', async function(assert) {
  const h = await harness();
  h.controller.begin('a');
  await h.controller._message('Debugger.paused', pauseFrames());
  h.transport.sendCommand = async (method, args) => {
    if(method === 'Runtime.evaluate' && args.expression.includes('.interrupt(')) return { exceptionDetails: { exception: { description: 'cleanup failed' } } };
    return {};
  };
  await assert.rejects(h.controller.interrupt(), /cleanup failed/);
  assert.equal(h.controller.state, 'stopping');
  assert.equal(h.controller.execution_id, 'a');
  assert.equal(h.completions.length, 0);
  assert.throws(() => h.controller.begin('b'), /stopping/);
  h.controller.dispose();
}, { tags: ['unit', 'debugger'] });

tests.add('paused stop uses terminateOnResume; frame inspection requires a live pause', async function(assert) {
  const h = await harness();
  h.controller.begin('a');
  await h.controller._message('Debugger.paused', pauseFrames());
  assert.equal(h.controller.state, 'paused');
  h.transport.sendCommand = async (method, args) => {
    h.commands.push({ method: method, args: args });
    if(method === 'Debugger.evaluateOnCallFrame') return { result: { type: 'number', value: 42 } };
    if(method === 'Runtime.evaluate') return { result: { value: { success: true } } };
    return {};
  };
  const value = await h.controller.evaluate('answer');
  assert.equal(value.value.value, 42);
  const evaluate = h.commands.find(command => command.method === 'Debugger.evaluateOnCallFrame');
  assert.equal(evaluate.args.throwOnSideEffect, true);
  await h.controller.interrupt();
  assert.ok(h.commands.some(command => command.method === 'Debugger.resume' && command.args.terminateOnResume));
  await assert.rejects(h.controller.evaluate('answer'), /not paused/);
  h.controller.dispose();
}, { tags: ['unit', 'debugger'] });

tests.add('inspection rejects a response from a frame resumed during the request', async function(assert) {
  const h = await harness();
  await h.controller._message('Debugger.paused', pauseFrames());
  let release;
  h.transport.sendCommand = () => new Promise(resolve => { release = resolve; });
  const pending = h.controller.properties('locals-1');
  await h.controller._message('Debugger.resumed', {});
  release({ result: [] });
  await assert.rejects(pending, /not paused|expired/);
  h.controller.dispose();
}, { tags: ['unit', 'debugger'] });

tests.add('original source breakpoints bind to generated positions and are removable', async function(assert) {
  const h = await harness();
  const map = new SourceMapGenerator();
  map.addMapping({ source: 'test.jsl', original: { line: 5, column: 0 }, generated: { line: 8, column: 2 } });
  const breakpoint = await h.controller.setBreakpoint('test.jsl', 5);
  await h.controller.registerSource({ url: 'jslab://test.js', path: 'test.jsl', map: map.toJSON() });
  const binding = h.commands.find(command => command.method === 'Debugger.setBreakpointByUrl');
  assert.equal(binding.args.lineNumber, 7);
  assert.equal(binding.args.columnNumber, 0);
  await h.controller.removeBreakpoint(breakpoint.id);
  assert.ok(h.commands.some(command => command.method === 'Debugger.removeBreakpoint'));
  await assert.rejects(h.controller.setBreakpoint('test.jsl', 0), /positive/);
  h.controller.dispose();
}, { tags: ['unit', 'debugger'] });

tests.add('worker pauses and resumes are coordinated while UI remains outside the target', async function(assert) {
  const h = await harness();
  await h.controller._message('Target.attachedToTarget', { sessionId: 'worker-1', targetInfo: { type: 'worker', url: 'worker.js' } });
  await h.controller._message('Debugger.paused', pauseFrames());
  assert.ok(h.commands.some(command => command.method === 'Debugger.pause' && command.session === 'worker-1'));
  await h.controller._message('Debugger.paused', {}, 'worker-1');
  assert.equal(h.controller.status().workers[0].paused, true);
  await h.controller.resume();
  assert.ok(h.commands.some(command => command.method === 'Debugger.resume' && command.session === 'worker-1'));
  h.transport.emit('detach', {}, 'DevTools opened');
  assert.equal(h.controller.state, 'unavailable');
  assert.equal(h.controller.frames.length, 0);
  h.contents.emit('destroyed');
  assert.equal(h.controller.state, 'closed');
}, { tags: ['unit', 'debugger'] });

tests.add('conditional and disabled breakpoints update bindings and configuration', async assert => {
  const h = await harness();
  const map = new SourceMapGenerator({ file: 'generated.js' });
  map.addMapping({ source: 'condition.jsl', original: { line: 2, column: 0 }, generated: { line: 2, column: 0 } });
  await h.controller.registerSource({ url: 'jslab://conditional', path: 'condition.jsl', map: map.toJSON() });
  const point = await h.controller.setBreakpoint('condition.jsl', 2, 'x > 3');
  assert.equal(h.commands.find(command => command.method === 'Debugger.setBreakpointByUrl').args.condition, 'x > 3');
  await h.controller.setBreakpoint('condition.jsl', 2, '', false);
  assert.equal(h.controller.status().breakpoints[0].enabled, false);
  assert.equal(h.commands.filter(command => command.method === 'Debugger.setBreakpointByUrl').length, 1);
  await assert.rejects(() => h.controller.setBreakpoint('condition.jsl', 2, 1));
  await assert.rejects(() => h.controller.setBreakpoint('condition.jsl', 2, 'invalid +'));
  assert.equal(h.settings.at(-1).breakpoints[0].enabled, false);
  await h.controller.setExceptionPause('uncaught');
  assert.equal(h.controller.status().pause_on_exceptions, 'uncaught');
  assert.equal(h.commands.filter(command => command.method === 'Debugger.setPauseOnExceptions').at(-1).args.state, 'all');
  await assert.rejects(() => h.controller.setExceptionPause('invalid'));
  await h.controller.clearBreakpoints();
  assert.equal(h.controller.status().breakpoints.length, 0);
  assert.equal(h.controller.status().pause_on_exceptions, 'none');
  h.controller.dispose();
}, { tags: ['unit', 'debugger'] });

tests.add('module wrapper positions wait for script registration and map compiled first-line columns', async assert => {
  const h = await harness();
  assert.equal((await h.controller.originalModulePosition({ path: 'relative.js', line: 1, column: 9 })).column, 9);
  assert.equal((await h.controller.originalModulePosition({ path: 'relative.js', line: 2, column: 9 })).column, 9);
  h.controller.dispose();
}, { tags: ['unit', 'debugger'] });

exports.MODULE_TESTS = tests;

tests.add('stepping skips runtime helpers and resumes when only internal frames remain', async assert => {
  const h = await harness(); h.controller.begin('step-navigation');
  await h.controller._message('Debugger.paused', pauseFrames());
  await h.controller.resume('stepInto');
  const internal = { ...pauseFrames().callFrames[0], url: 'C:/github/JSLAB/js/sandbox/basic.js' };
  await h.controller._message('Debugger.paused', {reason:'other',callFrames:[internal,...pauseFrames().callFrames]});
  assert.equal(h.commands.at(-1).method, 'Debugger.stepOut');
  await h.controller._message('Debugger.paused', {reason:'other',callFrames:[internal]});
  assert.equal(h.commands.at(-1).method, 'Debugger.resume');
  assert.equal(h.controller.step_action, null); h.controller.dispose();
}, {tags:['unit','debugger']});

tests.add('a late internal pause after completion resumes without exposing runtime source', async assert => {
  const h = await harness(); h.controller.begin('finished-step'); h.controller.step_action = 'stepOver';
  h.controller.finish('finished-step');
  const internal = {...pauseFrames().callFrames[0], url:'C:/github/JSLAB/js/sandbox/basic.js'};
  await h.controller._message('Debugger.paused',{reason:'other',callFrames:[internal]});
  assert.equal(h.commands.at(-1).method,'Debugger.resume'); assert.equal(h.controller.state,'idle');
  assert.equal(h.controller.frames.length,0); h.controller.dispose();
}, {tags:['unit','debugger']});
