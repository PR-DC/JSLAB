/**
 * @file Runs debugger integration tests against an isolated Electron JSLAB session
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');

if(process.versions.electron) {
  const { app, session, ipcMain } = require('electron');
  const profile = process.argv.find(arg => arg.startsWith('--debugger-profile=')).slice('--debugger-profile='.length);
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('in-process-gpu');
  app.setPath('userData', profile);
  const documents = path.join(profile, 'documents');
  fs.mkdirSync(documents, { recursive: true });
  app.setPath('documents', documents);
  app.on('web-contents-created', (_event, contents) => {
    contents.on('console-message', (_event, _level, message, line, source) => console.error('[test renderer] ' + source + ':' + line + ' ' + message));
    contents.debugger.on('message', (_event, method, params, session_id) => {
      if(method === 'Runtime.exceptionThrown') console.error('[test exception] ' + JSON.stringify(params.exceptionDetails));
    });
    contents.on('did-fail-load', (_event, code, message) => console.error('[test load] ' + code + ': ' + message));
  });
  const preload = path.join(profile, 'test-preload.cjs');
  fs.writeFileSync(preload, 'process.argv = process.argv.map(arg => arg.startsWith("--app-path=") ? ' +
    JSON.stringify('--app-path=' + root) + ' : arg);');
  app.whenReady().then(() => session.defaultSession.setPreloads([preload]));
  // Test-only access verifies the native DevTools REPL independently of the
  // JSLAB rewriter, including its global lexical-binding lifecycle.
  ipcMain.handle('JSLAB_TEST_NATIVE_REPL', async (event, source) => {
    return event.sender.debugger.sendCommand('Runtime.evaluate', {
      expression: source, replMode: true, awaitPromise: true, returnByValue: true
    });
  });
  // Exercise the real application bootstrap, using only this test's data paths.
  app.getAppPath = () => root;
  process.argv.push('--cli-runtime', '--mcp');
  require('../init');
} else {
  const { spawn } = require('child_process');
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  const { PRDC_JSLAB_BRIDGE_CLIENT } = require('../mcp/bridge-client');
  const { PRDC_JSLAB_TESTER } = require('../shared/tester');
  (async () => {
    const temp_root = path.join(root, 'temp');
    fs.mkdirSync(temp_root, { recursive: true });
    const profile = fs.mkdtempSync(path.join(temp_root, 'jslab-debugger-tests-'));
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(require('electron'), [__filename, '--debugger-profile=' + profile, '--cli-parent-pid=' + process.pid], {
      cwd: root, env: env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']
    });
    let diagnostics = '';
    for(const stream of [child.stdout, child.stderr]) {
      stream.on('data', data => { diagnostics = (diagnostics + data).slice(-16000); });
    }
    let spawn_error;
    child.on('error', error => { spawn_error = error; });
    const bridge = new PRDC_JSLAB_BRIDGE_CLIENT({ pid: child.pid });
    const client = new Client({ name: 'jslab-debugger-tests', version: '1' });
    let connected = false;
    try {
      const deadline = Date.now() + 45000;
      let ready = false;
      while(Date.now() < deadline) {
        if(spawn_error) throw spawn_error;
        if(child.exitCode !== null) throw new Error('Test runtime exited.\n' + diagnostics);
        const sessions = await bridge.call('list_sessions');
        if(sessions.sessions.some(session => session.pid === child.pid && session.ready)) {
          const status = await bridge.call('get_session_status');
          if(status.ready) { ready = true; break; }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if(!ready) {
        let status;
        try { status = await bridge.call('get_debug_state'); } catch(error) { status = error.message; }
        throw new Error('Test runtime did not become ready. ' + JSON.stringify(status) + '\n' + diagnostics);
      }
      await client.connect(new StdioClientTransport({ command: process.execPath,
        args: [path.join(root, 'js/mcp/server.js'), '--pid', String(child.pid)] }));
      connected = true;
      global.app_path = root;
      global.process_arguments = ['node', '--test-module=debugger.integration', ...process.argv.slice(2).filter(arg => arg.startsWith('--test-'))];
      global.__JSLAB_DEBUGGER_TEST__ = { client: client, folder: profile, sandbox_suite: process.argv.includes('--sandbox-suite') };
      const summary = await new PRDC_JSLAB_TESTER('backend').runTests();
      process.exitCode = summary.failed ? 1 : 0;
      if(summary.failed) console.error(diagnostics);
    } finally {
      // Stop the complete owned tree while its parent still exists. Electron's
      // immediate app.exit can otherwise leave Windows children holding files.
      if(process.platform === 'win32' && child.exitCode === null) {
        await new Promise(resolve => require('child_process').execFile('taskkill',
          ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => resolve()));
      } else {
        try { await bridge.call('close_cli_session'); } catch(error) {}
      }
      if(child.exitCode === null) {
        child.stdin.end();
        await new Promise(resolve => {
          const timer = setTimeout(() => { child.kill(); resolve(); }, 5000);
          child.once('exit', () => { clearTimeout(timer); resolve(); });
        });
      }
      // Release the owned runtime before closing the adapter, so outstanding
      // bridge reads cannot keep SDK transport shutdown waiting on Electron.
      if(connected) await client.close();
      const target = path.resolve(profile);
      if(path.dirname(target) !== temp_root || !path.basename(target).startsWith('jslab-debugger-tests-')) {
        throw new Error('Unexpected debugger test directory.');
      }
      await fs.promises.rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
