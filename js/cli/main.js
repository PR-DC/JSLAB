#!/usr/bin/env node
/**
 * @file JSLAB command-line entry point
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const { parseOptions } = require('./options');
const { PRDC_JSLAB_CLI_SESSION } = require('./session');
const { runTerminal, printResult } = require('./terminal');

/**
 * Runs an interactive session, a script, an expression or standard input.
 * @param {Array<string>} args Command-line arguments.
 * @returns {Promise<number>} Process exit code.
 */
async function run(args) {
  var options = parseOptions(args);
  if(options.help) {
    process.stdout.write('Usage: jslab [options] [script.jsl] [-- arguments...]\n\n' +
      '  -e, --eval <code>       Evaluate code and exit\n' +
      '  -                      Execute code from standard input\n' +
      '  --cwd <directory>      Initial working directory\n' +
      '  --timeout <seconds>    Execution timeout (default: unlimited)\n' +
      '  --json                 Emit a JSON result in batch mode\n' +
      '  --batch                Exit after a script instead of opening the REPL\n' +
      '  --no-history           Disable interactive history\n' +
      '  --history-file <path>  Custom interactive history file\n' +
      '  -v, --version          Show version\n' +
      '  -h, --help             Show this help\n\n' +
      'Opens a REPL when stdin is a terminal, running a supplied script first.\n' +
      '--eval, --batch, --json and redirected stdin finish without a REPL.\n' +
      'Piped input is executed as one script. Script arguments are available as argv.\n');
    return 0;
  }
  if(options.version) { process.stdout.write(require('../../package.json').version + '\n'); return 0; }
  if(!fs.statSync(options.cwd).isDirectory()) throw new Error('Working directory must be a directory.');
  if(options.file && options.file !== '-') {
    if(!options.file.toLowerCase().endsWith('.jsl')) throw new Error('Expected a .jsl script.');
    if(!fs.statSync(options.file).isFile()) throw new Error('Script must be a file.');
  }
  var interactive = !!(process.stdin.isTTY && options.code === undefined &&
    options.file !== '-' && !options.batch && !options.json);
  if(!interactive && options.code === undefined && (!options.file || options.file === '-')) {
    var chunks = [];
    var size = 0;
    for await(var chunk of process.stdin) {
      size += chunk.length;
      if(size > 512000) throw new Error('Standard input exceeds 512000 bytes.');
      chunks.push(chunk);
    }
    options.code = Buffer.concat(chunks).toString('utf8');
  }
  var session = new PRDC_JSLAB_CLI_SESSION(options);
  var interrupted_id = null;
  var exit_code = 0;
  async function interrupt() {
    if(interrupted_id === session.execution_id || !session.execution_id) {
      process.exitCode = 130;
      await session.close();
      process.exit(130);
    }
    interrupted_id = session.execution_id;
    await session.interrupt().catch(function(err) { process.stderr.write(err.message + '\n'); });
  }
  process.on('SIGINT', interrupt);
  process.on('SIGTERM', interrupt);
  try {
    await session.start();
    var initialized = await session.execute('evaluate_code', {
      code: 'var argv = ' + JSON.stringify(options.argv) + '; undefined', cwd: options.cwd
    });
    if(!initialized.success) throw new Error(initialized.error);
    if((options.file && options.file !== '-') || options.code !== undefined) {
      var result = options.file && options.file !== '-'
        ? await session.execute('run_file', { path: options.file })
        : await session.execute('evaluate_code', { code: options.code });
      if(options.json) process.stdout.write(JSON.stringify(result) + '\n');
      else printResult(result);
      exit_code = session.interrupted ? 130 : result.success ? 0 : 1;
      if(result.success && result.value && result.value.cwd) options.cwd = result.value.cwd;
    }
    if(interactive) {
      await runTerminal(session, options, interrupt);
      exit_code = 0;
    }
  } catch(err) {
    exit_code = err.exit_code || 1;
    if(options.json) process.stdout.write(JSON.stringify({ success: false, error: err.message }) + '\n');
    else process.stderr.write(err.message + '\n');
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    await session.close();
  }
  return exit_code;
}

if(require.main === module) {
  run(process.argv.slice(2)).then(function(code) { process.exitCode = code; }).catch(function(err) {
    process.stderr.write(err.message + '\n');
    process.exitCode = 2;
  });
}

exports.run = run;
