/**
 * @file Shared debugger command parsing for desktop and browser consoles
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const parser = require('@babel/parser');
const { isInternalDebugFrame } = require('./debugger-frames');

/** Parses debugger commands without evaluating user expressions in the UI. */
function parseDebuggerCommand(text) {
  const source = String(text).trim().replace(/;\s*$/, '');
  const match = source.match(/^(dbstop|dbclear|dbstatus|dbcont|dbstep|dbstack|dbup|dbdown|dbquit)(?:\b)([\s\S]*)$/);
  if(!match) return null;
  const name = match[1];
  let tail = match[2].trim();
  let args = [];
  if(tail.startsWith('(')) {
    let expression;
    try { expression = parser.parseExpression(source); } catch(error) { return null; }
    if(expression.type !== 'CallExpression') return null;
    for(const argument of expression.arguments) {
      if(!['StringLiteral', 'NumericLiteral', 'BooleanLiteral'].includes(argument.type)) return null;
      args.push(argument.value);
    }
    tail = '';
  }
  if(['dbstop', 'dbclear'].includes(name) && args.length === 1 && ['error', 'caught error'].includes(args[0])) {
    return { name, exceptions: name === 'dbclear' ? 'none' : args[0] === 'error' ? 'uncaught' : 'all' };
  }
  if(name === 'dbclear' && args.length === 1 && args[0] === 'all') return { name, all: true };
  if(name === 'dbstop' && args.length === 1) args.push(1);
  if(name === 'dbcont' || name === 'dbquit' || name === 'dbstatus' || name === 'dbstack' || name === 'dbup' || name === 'dbdown') {
    if(tail || args.length) throw Error('This debugger command takes no arguments.');
    return { name };
  }
  if(name === 'dbstep') {
    const action = args[0] || tail || 'over';
    if(!['in', 'into', 'out', 'over'].includes(action)) throw Error('Expected dbstep in, out, or over.');
    return { name, action: action === 'out' ? 'stepOut' : ['in', 'into'].includes(action) ? 'stepInto' : 'stepOver' };
  }
  if(/^if (?:caught )?error$/.test(tail)) return { name, exceptions: name === 'dbclear' ? 'none' : tail === 'if error' ? 'uncaught' : 'all' };
  if(name === 'dbclear' && (!tail && !args.length || tail === 'all')) return { name, all: true };
  if(tail) {
    if(name === 'dbstop' && /^in\s+/.test(tail) && !/\s+(?:at\s+)?\d+/.test(tail)) tail += ' at 1';
    const location = tail.match(/^(?:in\s+)?("(?:[^"\\]|\\.)*"|.+?)\s+(?:at\s+)?(\d+)(?:\s+if\s+([\s\S]+))?$/);
    if(!location) throw Error('Expected dbstop in "file.jsl" at line [if expression].');
    args = [location[1].startsWith('"') ? JSON.parse(location[1]) : location[1], Number(location[2]), location[3] || ''];
  }
  if(typeof args[0] !== 'string' || !Number.isInteger(args[1]) || args[1] < 1) throw Error('Expected a script path and positive line number.');
  return { name, path: args[0], line: args[1], condition: args[2] || '', enabled: args[3] !== false };
}

/** Dispatches common console syntax through the selected host debugger adapter. */
async function executeDebuggerCommand(command, adapter) {
  const parsed = typeof command === 'string' ? parseDebuggerCommand(command) : command;
  if(!parsed) return { handled: false };
  let value;
  if(parsed.name === 'dbcont') value = await adapter.request('resume_execution', { action: 'continue' });
  else if(parsed.name === 'dbstep') value = await adapter.request('resume_execution', { action: parsed.action });
  else if(parsed.name === 'dbquit') value = await adapter.request('interrupt_execution', {});
  else if(parsed.exceptions) value = await adapter.request('set_exception_pause', { state: parsed.exceptions });
  else if(parsed.name === 'dbstop') value = await adapter.request('set_breakpoint', parsed);
  else if(parsed.name === 'dbclear') value = await adapter.request(parsed.all ? 'clear_breakpoints' : 'remove_breakpoint', { id: parsed.path + ':' + parsed.line });
  else {
    const state = await adapter.request('get_debug_state', {});
    if(parsed.name === 'dbstatus') value = { breakpoints: state.breakpoints || [], pause_on_exceptions: state.pause_on_exceptions };
    else if(parsed.name === 'dbstack') value = state.frames || [];
    else {
      const direction = parsed.name === 'dbup' ? 1 : -1;
      let index = adapter.frameIndex() + direction;
      const frames = state.frames || [];
      while(index >= 0 && index < frames.length && isInternalDebugFrame(frames[index])) index += direction;
      if(state.state !== 'paused' || index < 0 || index >= frames.length) throw Error('No further paused user frame.');
      value = await adapter.selectFrame(index);
    }
  }
  return { handled: true, value };
}
exports.parseDebuggerCommand = parseDebuggerCommand;
exports.executeDebuggerCommand = executeDebuggerCommand;
