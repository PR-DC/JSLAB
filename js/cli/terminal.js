/**
 * @file JSLAB interactive terminal
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const parser = require('@babel/parser');

/**
 * Detects unfinished JavaScript so a terminal command can span several lines.
 * @param {string} code Source text.
 * @returns {boolean} Whether another line is needed.
 */
function isIncomplete(code) {
  try {
    parser.parse(code, { sourceType: 'script', allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true });
    return false;
  } catch(err) {
    return err.pos >= code.trimEnd().length ||
      ['UnterminatedTemplate', 'UnterminatedComment'].includes(err.reasonCode);
  }
}

/**
 * Prints terminal output and a returned value without HTML presentation markup.
 * @param {Object} result Sandbox operation result.
 */
function printResult(result) {
  for(var entry of result.output || []) {
    var stream = ['error', 'errorInternal', 'warn'].includes(entry.type) ? process.stderr : process.stdout;
    stream.write(formatText(entry.text) + '\n');
  }
  if(result.output_truncated) process.stderr.write('[JSLAB output was truncated.]\n');
  if(!result.success) {
    if(result.error && !(result.output || []).some(function(entry) { return ['error', 'errorInternal'].includes(entry.type); })) {
      process.stderr.write(formatText(result.error) + '\n');
    }
  } else if(result.value && typeof result.value.preview === 'string' && result.value.preview !== 'undefined') {
    process.stdout.write(result.value.preview + '\n');
  }
}

/**
 * Converts localized command-window labels to plain terminal text.
 * @param {string} text Captured output.
 * @returns {string} Plain text.
 */
function formatText(text) {
  return text.replace(/<lang class="([^"]+)">([\s\S]*?)<\/lang>/g, function(match, lang, value) {
    return lang === 'en' ? value : '';
  });
}

/**
 * Runs the persistent prompt with history and terminal commands.
 * @param {Object} session Owned runtime.
 * @param {Object} options CLI options.
 * @param {Function} interrupt Interrupt callback.
 */
async function runTerminal(session, options, interrupt) {
  var history_file = options.history_file || path.join(process.env.APPDATA || require('os').homedir(), 'JSLAB', 'cli-history.json');
  var history = [];
  if(options.history) {
    try {
      var saved = JSON.parse(fs.readFileSync(history_file, 'utf8'));
      if(Array.isArray(saved)) history = saved.filter(function(line) { return typeof line === 'string'; }).slice(0, 1000);
    } catch(err) {}
  }
  var rl = readline.createInterface({ input: process.stdin, output: process.stdout,
    terminal: true, history: history, historySize: 1000, removeHistoryDuplicates: true });
  var buffer = '';
  var busy = false;
  rl.on('SIGINT', function() {
    if(busy) { interrupt(); return; }
    if(buffer || rl.line) {
      buffer = '';
      rl.write(null, { ctrl: true, name: 'u' });
      process.stdout.write('\n');
      prompt();
    } else rl.close();
  });
  function prompt() {
    rl.setPrompt(buffer ? '... ' : 'jslab> ');
    rl.prompt();
  }
  process.stdout.write('JSLAB ' + require('../../package.json').version + ' CLI\nType .help for terminal commands; Ctrl+C interrupts running code.\n');
  prompt();
  try {
    for await(var line of rl) {
      if(!buffer && !line.trim()) { prompt(); continue; }
      if(!buffer && ['.exit', '.quit'].includes(line.trim())) break;
      if(!buffer && line.trim() === '.help') {
        process.stdout.write('.help             Show terminal commands\n.exit             Exit JSLAB\n.clear            Clear the workspace\n.workspace        List workspace variables\n.load <path>      Run a .jsl script\n.cd <directory>   Change working directory\n.pwd              Show working directory\nUse JavaScript and JSLAB functions directly; await is supported.\n');
        prompt();
        continue;
      }
      var command = !buffer && /^\.(load|cd)\s+(.+)$/.exec(line.trim());
      var method = 'evaluate_code';
      var args;
      if(command) {
        var target = command[2].replace(/^(["'])(.*)\1$/, '$2');
        if(command[1] === 'load') {
          method = 'run_file';
          args = { path: path.resolve(options.cwd, target) };
        } else {
          args = { code: 'undefined', cwd: path.resolve(options.cwd, target) };
        }
      } else if(!buffer && line.trim() === '.workspace') {
        args = { code: 'jsl.getWorkspace()' };
      } else if(!buffer && line.trim() === '.pwd') {
        args = { code: 'jsl.current_path' };
      } else if(!buffer && line.trim() === '.clear') {
        args = { code: 'clear' };
      } else {
        buffer += line + '\n';
        if(isIncomplete(buffer)) { prompt(); continue; }
        args = { code: buffer };
        buffer = '';
      }
      busy = true;
      try {
        var result = await session.execute(method, args);
        printResult(result);
        if(result.success && result.value && result.value.cwd) options.cwd = result.value.cwd;
      } catch(err) {
        process.stderr.write(err.message + '\n');
        if(err.exit_code) throw err;
      } finally { busy = false; }
      prompt();
    }
  } finally {
    if(options.history) {
      try {
        fs.mkdirSync(path.dirname(history_file), { recursive: true });
        fs.writeFileSync(history_file, JSON.stringify(rl.history), { mode: 0o600 });
      } catch(err) { process.stderr.write('Unable to save CLI history: ' + err.message + '\n'); }
    }
    rl.close();
  }
}

exports.isIncomplete = isIncomplete;
exports.printResult = printResult;
exports.runTerminal = runTerminal;
