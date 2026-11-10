/**
 * @file Integration tests against actual isolated Electron windows and IPC
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const { PRDC_JSLAB_GUI_BROWSER, waitForPort } = require('./gui-test-browser');
const root = path.resolve(__dirname, '..', '..');

async function run() {
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-desktop-gui-'));
  var env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  var child = cp.spawn(require('electron'), [path.join(root, 'js/main/tests/desktop-gui-host.js'), '--gui-parent-pid=' + process.pid,
    '--user-data-dir=' + profile, '--remote-debugging-port=0', '--in-process-gpu', '--disable-gpu'],
  { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  var diagnostics = '';
  [child.stdout, child.stderr].forEach(stream => stream.on('data', data => { diagnostics = (diagnostics + data).slice(-4000); }));
  var clients = {};
  try {
    var port = await waitForPort(profile, child);
    var deadline = Date.now() + 30000;
    while(Date.now() < deadline && Object.keys(clients).length < 3) {
      var targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
      for(var name of ['main', 'editor', 'sandbox']) {
        var target = targets.find(target => target.type === 'page' && target.url.endsWith('/' + name + '.html'));
        if(target && !clients[name]) { clients[name] = new PRDC_JSLAB_GUI_BROWSER(); await clients[name].connect(target.webSocketDebuggerUrl); }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if(Object.keys(clients).length !== 3) throw new Error('Desktop windows did not initialize.');
    await clients.main.waitFor(() => !!(typeof win_main !== 'undefined' && win_main.command_window && win_main.folder_navigation), 'main window');
    await clients.editor.waitFor(() => !!(typeof win_editor !== 'undefined' && win_editor.script_manager), 'editor window');
    await clients.sandbox.waitFor(() => typeof jsl !== 'undefined' && jsl.ready, 'sandbox initialization');
    global.gui_desktop = clients;
    global.gui_desktop_profile = profile;
    global.app_path = root;
    global.process_arguments = ['desktop-gui-tests', ...process.argv.slice(2).filter(arg => arg.startsWith('--test-'))];
    const { PRDC_JSLAB_TESTER } = require('../shared/tester');
    class PRDC_JSLAB_DESKTOP_GUI_TESTER extends PRDC_JSLAB_TESTER {
      _scanForTestModules(folder) {
        return super._scanForTestModules(folder).filter(filename => path.basename(filename) === 'desktop-gui-integration.test.js');
      }
    }
    var summary = await new PRDC_JSLAB_DESKTOP_GUI_TESTER('main/tests', { include_tags: ['integration'] }).runTests();
    if(!summary.total || summary.failed) process.exitCode = 1;
  } catch(err) { throw new Error(err.message + '\n' + diagnostics); }
  finally {
    for(var client of Object.values(clients)) await client.close();
    if(child.exitCode === null) { child.kill(); await new Promise(resolve => { child.once('exit', resolve); setTimeout(resolve, 3000); }); }
    var target = path.resolve(profile);
    if(path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('jslab-desktop-gui-')) throw new Error('Unexpected desktop profile path');
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}
run().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
