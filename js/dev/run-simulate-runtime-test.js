/**
 * @file Runs the isolated Electron Simulate runtime integration test
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Class for an isolated Simulate compiler integration test.
 */
class PRDC_JSLAB_SIMULATE_RUNTIME_TEST {

  /**
   * Validates test options and starts the owned test process or renderer.
   */
  run() {
    var obj = this;
    obj._result_code = null;
    obj._bundle_argument = process.argv.find(function(value) {
      return value.startsWith('--bundle=');
    });

    obj._result_argument = process.argv.find(function(value) {
      return value.startsWith('--result=');
    });

    obj._reference_argument = process.argv.find(function(value) {
      return value.startsWith('--reference=');
    });

    if(obj._bundle_argument) {
      var candidate_root = path.resolve(obj._bundle_argument.slice(9));
      var valid_bundle = false;
      if(path.extname(candidate_root).toLowerCase() == '.asar' && fs.existsSync(candidate_root)) {
        try {
          const asar = require('@electron/asar');
          valid_bundle = asar.statFile(candidate_root, 'js/index.js').size > 0 &&
            asar.statFile(candidate_root, 'manifest.json').size > 0;
        } catch(error) {
          valid_bundle = false;
        }
      } else {
        valid_bundle = fs.existsSync(path.join(candidate_root, 'js/index.js')) && fs.existsSync(path.join(candidate_root, 'manifest.json'));
      }
      if(!valid_bundle) {
        throw new Error('The candidate solver bundle requires an compiler library entry point and manifest.');
      }
    }

    if(obj._result_argument && !fs.statSync(path.dirname(path.resolve(obj._result_argument.slice(9)))).isDirectory()) {
      throw new Error('The simulation-result destination directory does not exist.');
    }

    if(obj._reference_argument && !fs.statSync(path.resolve(obj._reference_argument.slice(12))).isFile()) {
      throw new Error('The native simulation reference does not exist.');
    }

    obj._profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-simulate-runtime-'));

    var env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    obj._child = cp.spawn(require('electron'), [
      __filename,
      '--user-data-dir=' + obj._profile,
      '--disable-gpu',
      ...(obj._bundle_argument ? ['--bundle=' + path.resolve(obj._bundle_argument.slice(9))] : []),
      ...(obj._result_argument ? ['--result=' + path.resolve(obj._result_argument.slice(9))] : []),
      ...(obj._reference_argument ? ['--reference=' + path.resolve(obj._reference_argument.slice(12))] : [])
    ], { cwd: path.resolve(__dirname, '..', '..'), windowsHide: true,
      env: env, detached: process.platform != 'win32', stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });

    obj._child.on('message', function(message) {
      if(!message || message.type != 'simulate-test-finished') {
        return;
      }
      if(obj._result_code === null) {
        obj._result_code = message.code === 0 ? 0 : 1;
      }
      obj._terminate();
    });

    obj._child.on('error', function(error) {
      console.error(error.stack || error);
      obj._result_code = 1;
      process.exitCode = 1;
    });

    obj._child.on('close', async function() {
      try {
        await obj._stopRemainingChildren();
        await obj._removeProfile();
      } catch(error) {
        console.error(error.stack || error);
        obj._result_code = 1;
      }
      process.exitCode = obj._result_code === 0 ? 0 : 1;
    });

    ['SIGINT', 'SIGTERM'].forEach(function(signal) {
      process.on(signal, function() {
        obj._terminate();
        obj._result_code = 1;
        process.exitCode = 1;
      });
    });
  }

  /**
   * Stops only the process tree created for this test run.
   */
  _terminate() {
    var obj = this;
    if(obj._terminating || !obj._child || obj._child.exitCode !== null) {
      return;
    }
    obj._terminating = true;
    if(process.platform == 'win32') {
      const stopped = cp.spawnSync('taskkill', ['/PID', String(obj._child.pid), '/T', '/F'], {
        windowsHide: true, stdio: 'ignore'
      });
      if(stopped.status !== 0 && obj._child.exitCode === null) {
        console.error('Could not terminate the owned Simulate test process tree.');
        obj._result_code = 1;
        obj._child.kill('SIGKILL');
      }
    } else {
      try {
        process.kill(-obj._child.pid, 'SIGKILL');
      } catch(error) {
        obj._result_code = 1;
        obj._child.kill('SIGKILL');
      }
    }
  }

  /**
   * Stops late Windows children identified by this run's unique profile path.
   * @returns {Promise<void>} Resolves after no matching test processes remain.
   */
  async _stopRemainingChildren() {
    if(process.platform != 'win32') {
      return;
    }
    const profile = path.resolve(this._profile).replace(/'/g, "''");
    const script = "$ErrorActionPreference = 'Stop'; $profile = '" + profile + "'; " +
      'for($attempt = 0; $attempt -lt 20; $attempt++) { ' +
      "$owned = @(Get-CimInstance Win32_Process -Filter \"Name = 'electron.exe'\" | " +
      'Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profile) }); ' +
      'if($owned.Count -eq 0) { exit 0 }; ' +
      'foreach($ownedProcess in $owned) { & taskkill /PID $ownedProcess.ProcessId /T /F 2>$null | Out-Null }; ' +
      'Start-Sleep -Milliseconds 100 }; exit 1';
    await new Promise(function(resolve, reject) {
      cp.execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        windowsHide: true
      }, function(error) {
        if(error) {
          reject(new Error('Could not verify Simulate test process cleanup: ' + error.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Verifies and removes this test run's temporary profile directory.
   * @returns {Promise<void>} Resolves after the test profile is removed.
   */
  async _removeProfile() {
    var obj = this;
    var temp_root = path.resolve(os.tmpdir()) + path.sep;
    var target = path.resolve(obj._profile);
    if(!target.startsWith(temp_root) || !path.basename(target).startsWith('jslab-simulate-runtime-')) {
      throw new Error('Unexpected Simulate test profile path.');
    }
    await fs.promises.rm(target, { recursive: true, force: true, maxRetries: 40,
      retryDelay: 100 });
  }
}

exports.PRDC_JSLAB_SIMULATE_RUNTIME_TEST = PRDC_JSLAB_SIMULATE_RUNTIME_TEST;


/**
 * Class for an isolated Simulate compiler integration test.
 */
class PRDC_JSLAB_SIMULATE_RUNTIME_TEST_HOST {

  /**
   * Stores the Electron services used by the isolated host process.
   * @param {Object} electron Electron main-process APIs.
   */
  constructor(electron) {
    this._electron = electron;
  }

  /**
   * Validates test options and starts the owned test process or renderer.
   */
  run() {
    var obj = this;
    const { app, BrowserWindow, ipcMain } = obj._electron;
    obj._win = null;

    obj._completed = false;

    if(typeof process.send != 'function') {
      console.error('Start the Simulate runtime test through its isolated launcher.');
      app.exit(1);
      return;
    }

    app.whenReady().then(async function() {
      obj._win = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
      });
      ipcMain.once('JSLAB_SIMULATE_RUNTIME_TEST', function(_event, response) {
        if(response && response.success) {
          console.log(JSON.stringify(response));
          obj._finish(0);
        } else {
          console.error(response && response.error || 'Simulate runtime test failed.');
          obj._finish(1);
        }
      });
      obj._win.webContents.on('render-process-gone', function(_event, details) {
        if(obj._completed) {
          return;
        }
        console.error('Simulate test renderer stopped: ' + details.reason + '.');
        obj._finish(1);
      });
      await obj._win.loadFile(path.join(__dirname, '..', 'simulate', 'tests',
        'simulate-runtime.html'), { query: {
        bundle: (process.argv.find(function(value) {
          return value.startsWith('--bundle=');
        }) || '').slice(9),
        result: (process.argv.find(function(value) {
          return value.startsWith('--result=');
        }) || '').slice(9),
        reference: (process.argv.find(function(value) {
          return value.startsWith('--reference=');
        }) || '').slice(12)
      } });
    }).catch(function(error) {
      console.error(error.stack || error);
      obj._finish(1);
    });

    app.on('window-all-closed', function() {
      if(!obj._completed) {
        obj._finish(1);
      }
    });
  }

  /**
   * Asks the launcher to terminate this host and its complete live process tree.
   */
  _finish(code) {
    var obj = this;
    if(obj._completed) {
      return;
    }
    obj._completed = true;
    process.send({ type: 'simulate-test-finished', code: code });
  }
}


if(process.versions.electron && process.type == 'browser') {
  const { app, BrowserWindow, ipcMain } = require('electron');
  // The host runs in a separate Electron process using this same entry point.
  new PRDC_JSLAB_SIMULATE_RUNTIME_TEST_HOST({ app, BrowserWindow, ipcMain }).run();
} else if(require.main === module) {
  new PRDC_JSLAB_SIMULATE_RUNTIME_TEST().run();
}
