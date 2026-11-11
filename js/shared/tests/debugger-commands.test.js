/**
 * @file Debugger configuration and console command regression tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../tester');
const { parseDebuggerCommand, executeDebuggerCommand } = require('../debugger-commands');
const tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;

tests.add('debugger parser accepts command and literal function syntax without executing expressions', assert => {
  assert.equal(parseDebuggerCommand('2 + 2'), null);
  assert.deepEqual(parseDebuggerCommand('dbstop in "C:/folder with spaces/a.jsl" at 7 if count > 2'),
    { name: 'dbstop', path: 'C:/folder with spaces/a.jsl', line: 7, condition: 'count > 2', enabled: true });
  assert.equal(parseDebuggerCommand("dbstop('a.jsl', 3, 'i === 2', false)").enabled, false);
  assert.equal(parseDebuggerCommand('dbstop(userPath, 3)'), null);
  assert.equal(parseDebuggerCommand('dbstop if error').exceptions, 'uncaught');
  assert.equal(parseDebuggerCommand('dbstop if caught error').exceptions, 'all');
  assert.equal(parseDebuggerCommand('dbclear if error').exceptions, 'none');
  assert.equal(parseDebuggerCommand('dbclear all').all, true);
  assert.equal(parseDebuggerCommand("dbclear('all')").all, true);
  assert.equal(parseDebuggerCommand("dbstop('error')").exceptions, 'uncaught');
  assert.equal(parseDebuggerCommand("dbstop('file.jsl')").line, 1);
  assert.equal(parseDebuggerCommand('dbstop in file.jsl').line, 1);
  assert.equal(parseDebuggerCommand('dbstep in').action, 'stepInto');
  assert.equal(parseDebuggerCommand('dbstep out').action, 'stepOut');
  assert.equal(parseDebuggerCommand('dbstep').action, 'stepOver');
  assert.throws(() => parseDebuggerCommand('dbstep unknown'));
  assert.throws(() => parseDebuggerCommand('dbstop("a", 0)'));
  assert.throws(() => parseDebuggerCommand('dbcont extra'));
}, { tags: ['unit', 'debugger'] });

for(const [text, method] of [
  ['dbcont', 'resume_execution'], ['dbstep in', 'resume_execution'], ['dbstep out', 'resume_execution'],
  ['dbstep over', 'resume_execution'], ['dbquit', 'interrupt_execution'],
  ['dbstop if error', 'set_exception_pause'], ['dbclear if error', 'set_exception_pause'],
  ['dbstop("a.jsl", 2)', 'set_breakpoint'], ['dbclear("a.jsl", 2)', 'remove_breakpoint'],
  ['dbclear all', 'clear_breakpoints'], ['dbstatus', 'get_debug_state'], ['dbstack', 'get_debug_state']
]) tests.add('console ' + text + ' uses its host debugger operation', async assert => {
  const calls = [];
  const result = await executeDebuggerCommand(text, { request: async (name, args) => {
    calls.push({ name, args }); return { frames: [], breakpoints: [] };
  } });
  assert.equal(result.handled, true); assert.equal(calls[0].name, method);
}, { tags: ['unit', 'debugger'] });

tests.add('dbup and dbdown select user callers and reject invalid or running frames', async assert => {
  let index = 0;
  let state = { state: 'paused', frames: [{ path: 'child.jsl' }, { path: 'node:internal' }, { path: 'parent.jsl' }] };
  const adapter = { request: async () => state, frameIndex: () => index, selectFrame: next => { index = next; return state.frames[next]; } };
  await executeDebuggerCommand('dbup', adapter); assert.equal(index, 2);
  await executeDebuggerCommand('dbdown', adapter); assert.equal(index, 0);
  await assert.rejects(() => executeDebuggerCommand('dbdown', adapter));
  state.state = 'running'; await assert.rejects(() => executeDebuggerCommand('dbup', adapter));
  assert.equal((await executeDebuggerCommand('42', adapter)).handled, false);
}, { tags: ['unit', 'debugger'] });
