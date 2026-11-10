/**
 * @file Runs real JSLAB command-line integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const assert = require('assert/strict');

var root = path.resolve(__dirname, '..', '..');
var entry = path.join(root, 'js/cli/main.js');
var executable = process.execPath;
var cli_env = Object.assign({}, process.env);
var launcher = null;
var packaged_arg = process.argv.find(function(arg) { return arg.startsWith('--packaged='); });
if(packaged_arg) {
  var packaged_root = path.resolve(packaged_arg.slice('--packaged='.length));
  entry = path.join(packaged_root, 'resources/app/js/cli/main.js');
  executable = path.join(packaged_root, 'jslab-console.exe');
  launcher = path.join(packaged_root, 'jslab.cmd');
  cli_env.ELECTRON_RUN_AS_NODE = '1';
}

/**
 * Starts the CLI with literal arguments and optional piped input.
 * @param {Array<string>} args Arguments.
 * @param {string} [input=''] Standard input.
 * @returns {Promise<Object>} Process output and exit code.
 */
function runCLI(args, input = '') {
  return new Promise(function(resolve, reject) {
    var child = cp.spawn(executable, [entry].concat(args), {
      cwd: root, env: cli_env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
    });
    var stdout = '';
    var stderr = '';
    var timer = setTimeout(function() { child.kill(); reject(new Error('CLI test timed out.')); }, 60000);
    child.stdout.on('data', function(data) { stdout += data; });
    child.stderr.on('data', function(data) { stderr += data; });
    child.on('error', reject);
    child.on('exit', function(code) { clearTimeout(timer); resolve({ code, stdout, stderr }); });
    child.stdin.end(input);
  });
}

/**
 * Exercises a real Windows terminal, including multiline input and Ctrl+C.
 */
async function testTerminal(folder) {
  var pty = require('@lydell/node-pty');
  var existing_sessions = new Set(fs.readdirSync(os.tmpdir()));
  var history_file = path.join(folder, 'terminal history.json');
  var loaded_script = path.join(folder, 'interactive script.jsl');
  var startup_script = path.join(folder, 'startup plot.jsl');
  fs.writeFileSync(loaded_script, 'var cli_loaded = 99;');
  fs.writeFileSync(startup_script, "if(argv[0] !== 'script arg') throw Error('Script arguments lost'); var cli_answer = 6; plot([0,1,2], [0,1,4]); await jsl.inter.figures.getCurrentFigure().ready;");
  var terminal = pty.spawn(executable, [entry, '--history-file', history_file,
    '--cwd', folder, startup_script, '--', 'script arg'], {
    name: 'xterm-color', cols: 120, rows: 30, cwd: root, env: cli_env
  });
  var output = '';
  terminal.onData(function(data) { output += data; });
  var terminal_exited = false;
  var exited = new Promise(function(resolve) {
    terminal.onExit(function(status) { terminal_exited = true; resolve(status); });
  });
  async function waitFor(text) {
    var deadline = Date.now() + 45000;
    while(Date.now() < deadline) {
      if(output.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').includes(text.trimEnd())) { output = ''; return; }
      await new Promise(function(resolve) { setTimeout(resolve, 50); });
    }
    throw new Error('Missing terminal output ' + text + ': ' + output);
  }
  try {
    await waitFor('jslab>');
    var session_files = fs.readdirSync(os.tmpdir()).filter(function(name) {
      return /^jslab-mcp-\d+\.json$/.test(name) && !existing_sessions.has(name);
    });
    assert.equal(session_files.length, 1, 'Expected one owned CLI session.');
    var Bridge = require('../mcp/bridge-client').PRDC_JSLAB_BRIDGE_CLIENT;
    var bridge = new Bridge({ session_file: path.join(os.tmpdir(), session_files[0]) });
    var figures = await bridge.call('list_figures');
    assert.equal(figures.result.value.ids.length, 1);
    var visible;
    for(var attempt = 0; attempt < 50; attempt++) {
      visible = await bridge.call('evaluate_code', { code:
        'require("electron").ipcRenderer.sendSync("sync-message", "call-sub-win-method", [jsl.inter.figures.getCurrentFigure().wid, "isVisible"])' });
      if(visible.result.value && visible.result.value.preview === 'true') break;
      await new Promise(function(resolve) { setTimeout(resolve, 100); });
    }
    assert.equal(visible.result.success, true, JSON.stringify(visible));
    assert.equal(visible.result.value.preview, 'true', 'CLI plot must be a visible native figure window.');
    var png = path.join(folder, 'cli-figure.png');
    var exported = await bridge.call('export_figure', { figure_id: Number(figures.result.value.ids[0]), path: png });
    assert.equal(exported.result.success, true, JSON.stringify(exported));
    assert.ok(fs.statSync(png).size > 1000, 'CLI figure must render actual plot content.');
    terminal.write("disp('START=' + cli_answer);\r");
    await waitFor('START=6');
    terminal.write('if(true) {\r');
    await waitFor('... ');
    terminal.write('cli_answer *= 7;\r}\r');
    await waitFor('jslab>');
    terminal.write("disp('VALUE=' + cli_answer);\r");
    await waitFor('VALUE=42');
    terminal.write('while(true) { checkStop; }\r');
    await new Promise(function(resolve) { setTimeout(resolve, 500); });
    terminal.write('\x03');
    await waitFor('jslab>');
    terminal.write("disp('AFTER=' + cli_answer);\r");
    await waitFor('AFTER=42');
    terminal.write('.cd "' + folder + '"\r');
    await waitFor('jslab>');
    terminal.write('.load "' + loaded_script + '"\r');
    await waitFor('jslab>');
    terminal.write("disp('LOADED=' + cli_loaded);\r");
    await waitFor('LOADED=99');
    terminal.write('.clear\r');
    await waitFor('jslab>');
    terminal.write("disp('CLEARED=' + typeof cli_answer);\r");
    await waitFor('CLEARED=undefined');
    terminal.write('.exit\r');
    var status = await Promise.race([exited, new Promise(function(resolve, reject) {
      var timer = setTimeout(function() { reject(new Error('Terminal did not exit.')); }, 10000);
      timer.unref();
    })]);
    assert.equal(status.exitCode, 0);
    assert.ok(JSON.parse(fs.readFileSync(history_file, 'utf8')).some(function(line) {
      return line.includes('cli_answer');
    }));
  } finally {
    if(bridge) { try { await bridge.call('close_cli_session'); } catch(err) {} }
    if(!terminal_exited) {
      terminal.kill();
      await Promise.race([exited, new Promise(function(resolve) { setTimeout(resolve, 6000); })]);
    }
  }
}

/**
 * Checks the bare REPL and explicit batch behavior in a real terminal.
 * @param {string} folder Temporary test directory.
 */
async function testTerminalModes(folder) {
  var pty = require('@lydell/node-pty');
  var script = path.join(folder, 'batch script.jsl');
  fs.writeFileSync(script, "disp('BATCH_FINISHED');");
  for(var batch of [false, true]) {
    await new Promise(function(resolve, reject) {
      var output = '';
      var sent_exit = false;
      var terminal = pty.spawn(executable, [entry].concat(batch ? ['--batch', script] : ['--no-history']), {
        name: 'xterm-color', cols: 120, rows: 30, cwd: root, env: cli_env
      });
      var timer = setTimeout(function() { terminal.kill(); reject(new Error('Terminal mode test timed out.')); }, 45000);
      terminal.onData(function(data) {
        output += data;
        if(!batch && !sent_exit && output.includes('jslab>')) {
          sent_exit = true;
          terminal.write('.exit\r');
        }
      });
      terminal.onExit(function(status) {
        clearTimeout(timer);
        try {
          assert.equal(status.exitCode, 0, output);
          if(batch) {
            assert.ok(output.includes('BATCH_FINISHED'));
            assert.ok(!output.includes('jslab>'), 'Batch mode must finish without a REPL.');
          } else assert.ok(sent_exit, 'Bare CLI must open the REPL.');
          resolve();
        } catch(err) { reject(err); }
      });
    });
  }
}

/**
 * Checks batch execution, error codes and interactive runtime behavior.
 */
async function main() {
  var folder = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-cli-tests-'));
  var failure;
  try {
    var evaluated = await runCLI(['--json', '-e', "disp('hello'); trapz([0,1,2])"]);
    assert.equal(evaluated.code, 0, evaluated.stderr);
    var result = JSON.parse(evaluated.stdout);
    assert.equal(result.value.preview, '2');
    assert.ok(result.output.some(function(entry) { return entry.text === 'hello'; }));
    var script = path.join(folder, 'test script.jsl');
    fs.writeFileSync(script, "if(argv[0] !== 'two words') throw Error('Arguments lost'); disp('CWD=' + jsl.current_path); roots([1,0,-1]);");
    var file = await runCLI(['--json', '--cwd', folder, script, '--', 'two words']);
    assert.equal(file.code, 0, file.stdout + file.stderr);
    assert.equal(path.normalize(JSON.parse(file.stdout).value.cwd), path.normalize(folder + path.sep));
    var piped = await runCLI(['--json', '-'], 'var cli_pipe = 7;\ncli_pipe * 6');
    assert.equal(piped.code, 0, piped.stdout);
    assert.equal(JSON.parse(piped.stdout).value.preview, '42');
    var failed = await runCLI(['--json', '-e', "throw Error('CLI failure')"]);
    assert.equal(failed.code, 1);
    assert.equal(JSON.parse(failed.stdout).success, false);
    var invalid = await runCLI(['--unknown']);
    assert.equal(invalid.code, 2);
    var timeout = await runCLI(['--json', '--timeout', '0.1', '-e', 'while(true) { checkStop; }']);
    assert.equal(timeout.code, 124, timeout.stdout + timeout.stderr);
    console.log('CLI batch execution, scripts, arguments, cwd, stdin, errors and timeout passed.');
    if(process.platform === 'win32') {
      var command = launcher ? '& $env:JSLAB_TEST_LAUNCHER' : '& $env:JSLAB_TEST_EXECUTABLE $env:JSLAB_TEST_ENTRY';
      var source = [
        "$ErrorActionPreference = 'Stop'",
        "$cliSingle = " + command + " --json -e 'trapz([0,1,2])'",
        "if($LASTEXITCODE -ne 0 -or ($cliSingle | ConvertFrom-Json).value.preview -ne '2') { throw 'Single-quoted expression failed.' }",
        '$cliDouble = ' + command + ' --json -e "trapz([0, 1, 2])"',
        "if($LASTEXITCODE -ne 0 -or ($cliDouble | ConvertFrom-Json).value.preview -ne '2') { throw 'Double-quoted expression failed.' }"
      ].join('\n');
      cp.execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand',
        Buffer.from(source, 'utf16le').toString('base64')], { windowsHide: true, timeout: 60000,
        env: Object.assign({}, process.env, { JSLAB_TEST_LAUNCHER: launcher || '',
          JSLAB_TEST_EXECUTABLE: executable, JSLAB_TEST_ENTRY: entry }) });
      console.log('Windows launcher accepts single- and double-quoted PowerShell expressions.');
      await testTerminal(folder);
      console.log('Windows script-to-REPL, visible native figures, plot rendering, workspace, interruption, history and exit passed.');
      await testTerminalModes(folder);
      console.log('Bare CLI opens the REPL; --batch runs a script and exits.');
    }
  } catch(err) {
    failure = err;
    throw err;
  } finally {
    try {
      await fs.promises.rm(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
    } catch(err) { if(!failure) throw err; }
  }
}

main().then(function() { process.exit(0); }).catch(function(err) {
  console.error(err);
  process.exit(1);
});
