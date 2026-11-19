/**
 * @file Integration tests against actual isolated Electron windows and IPC
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for dev run desktop gui tests operations.
 */
class PRDC_JSLAB_DEV_RUN_DESKTOP_GUI_TESTS_HELPER {

  /**
   * Terminates the isolated Electron host and all Chromium child processes.
   */
  static terminateProcessTree(child) {
    if(!child || !Number.isInteger(child.pid) || child.pid <= 0) {
      return;
    }
    if(process.platform === 'win32') {
      cp.spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true, stdio: 'ignore'
      });
      try {
        child.kill('SIGKILL');
      } catch(error) {}
    } else if(child.exitCode === null) {
      child.kill('SIGTERM');
    }
  }

  /**
   * Runs.
   */
  static async run() {
    var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-desktop-gui-'));
    var env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    var gpu_arguments = process.argv.includes('--test-hardware-gpu') ? [] : ['--in-process-gpu', '--disable-gpu'];
    var child = cp.spawn(require('electron'), [path.join(root, 'js/main/tests/desktop-gui-host.js'), '--gui-parent-pid=' + process.pid,
      '--user-data-dir=' + profile, '--remote-debugging-port=0', ...gpu_arguments],
    { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    var diagnostics = '';
    [child.stdout, child.stderr].forEach(stream => stream.on('data', data => {
      diagnostics = (diagnostics + data).slice(-4000);
    }));
    var clients = {};
    var stage = 'connecting desktop windows';
    try {
      var port = await waitForPort(profile, child);
      var deadline = Date.now() + 30000;
      while(Date.now() < deadline && Object.keys(clients).length < 4) {
        var targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
        for(var name of ['main', 'editor', 'assistant', 'sandbox']) {
          var target = targets.find(target => target.type === 'page' && target.url.endsWith('/' + name + '.html'));
          if(target && !clients[name]) {
            clients[name] = new PRDC_JSLAB_GUI_TEST_BROWSER();
            await clients[name].connect(target.webSocketDebuggerUrl);
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if(Object.keys(clients).length !== 4) {
        throw new Error('Desktop windows did not initialize.');
      }
      stage = 'initializing main window';
      await clients.main.waitFor(() => !!(typeof win_main !== 'undefined' && win_main.command_window && win_main.folder_navigation), 'main window');
      stage = 'initializing editor window';
      await clients.editor.waitFor(() => !!(typeof win_editor !== 'undefined' && win_editor.script_manager), 'editor window');
      stage = 'initializing Assistant window';
      await clients.assistant.waitFor(() => !!document.getElementById('assistant-input'), 'Assistant window');
      stage = 'initializing sandbox';
      await clients.sandbox.waitFor(() => typeof jsl !== 'undefined' && jsl.ready, 'sandbox initialization', 60000);
      stage = 'opening terminal';
      deadline = Date.now() + 30000;
      await clients.sandbox.evaluate(() => {
        globalThis.gui_primary_terminal = terminal();
        return gui_primary_terminal.id;
      });
      while(Date.now() < deadline && !clients.terminal) {
        var terminal_targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
        var terminal_target = terminal_targets.find(function(target) {
          return target.type === 'page' && target.url.endsWith('/terminal.html');
        });
        if(terminal_target) {
          clients.terminal = new PRDC_JSLAB_GUI_TEST_BROWSER();
          await clients.terminal.connect(terminal_target.webSocketDebuggerUrl);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if(!clients.terminal) {
        throw new Error('Terminal window did not initialize.');
      }
      await clients.terminal.waitFor(() => typeof win_terminal !== 'undefined', 'Terminal window');
      await clients.terminal.waitFor(() => win_terminal.pty_id !== null, 'Terminal PTY');
      stage = 'running desktop scenarios';
      global.gui_desktop = clients;
      global.gui_desktop_port = port;
      global.gui_desktop_profile = profile;
      global.app_path = root;
      global.process_arguments = ['desktop-gui-tests', ...process.argv.slice(2).filter(arg => arg.startsWith('--test-'))];
      const { PRDC_JSLAB_TESTER } = require('../other-shared/tester');
      /**
       * Class for desktop gui tester.
       */
      class PRDC_JSLAB_DESKTOP_GUI_TESTER extends PRDC_JSLAB_TESTER {
        /**
         * Handles scan for test modules.
         * @param {*} folder Folder.
         */
        _scanForTestModules(folder) {
          return super._scanForTestModules(folder).filter(filename =>
            ['desktop-gui-integration.test.js', 'desktop-simulate.test.js', 'desktop-project-editors.test.js'].includes(path.basename(filename)));
        }
      }
      var summary = await new PRDC_JSLAB_DESKTOP_GUI_TESTER('', { include_tags: ['integration'] }).runTests();
      if(!summary.total || summary.failed) {
        process.exitCode = 1;
        if(diagnostics.trim()) {
          console.error('Desktop diagnostics:\n' + diagnostics);
        }
      }
      if(diagnostics.includes("Error occurred in handler for 'JSLAB_ASSISTANT_CHAT'")) {
        throw new Error('Assistant emitted an expected chat error to stderr.');
      }
    } catch(err) {
      throw new Error(stage + ': ' + err.message + '\n' + diagnostics);
    } finally {
      try {
        if(clients.terminal && child.exitCode === null) {
          await clients.terminal.evaluate(function() {
            return ipcRenderer.sendSync('sync-message', 'pty', {
              action: 'killAll', data: { tree: false }
            });
          });
        }
        if(clients.main && child.exitCode === null) {
          await clients.main.evaluate(function() {
            require('electron').ipcRenderer.send('JSLAB_DESKTOP_GUI_TEST_EXIT');
            return true;
          });
          await new Promise(function(resolve) {
            if(child.exitCode !== null) {
              return resolve();
            }
            child.once('exit', resolve);
            setTimeout(resolve, 5000);
          });
        }
      } catch(error) {}
      PRDC_JSLAB_DEV_RUN_DESKTOP_GUI_TESTS_HELPER.terminateProcessTree(child);
      if(child.exitCode === null) {
        await new Promise(resolve => {
          child.once('exit', resolve);
          setTimeout(resolve, 5000);
        });
      }
      for(var client of Object.values(clients)) {
        await client.close();
      }
      var process_owner = new PRDC_JSLAB_SIMULATE_RUNTIME_TEST();
      process_owner._profile = profile;
      await process_owner._stopRemainingChildren();
      var target = path.resolve(profile);
      if(path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('jslab-desktop-gui-')) {
        throw new Error('Unexpected desktop profile path');
      }
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 40, retryDelay: 250 });
    }
  }
}

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const { PRDC_JSLAB_GUI_TEST_BROWSER, waitForPort } = require('./gui-test-browser');
const { PRDC_JSLAB_SIMULATE_RUNTIME_TEST } = require('./run-simulate-runtime-test');
const root = path.resolve(__dirname, '..', '..');


PRDC_JSLAB_DEV_RUN_DESKTOP_GUI_TESTS_HELPER.run().catch(err => {
  console.error(err.stack || err);
  process.exitCode = 1;
});

exports.terminateProcessTree = PRDC_JSLAB_DEV_RUN_DESKTOP_GUI_TESTS_HELPER.terminateProcessTree;
