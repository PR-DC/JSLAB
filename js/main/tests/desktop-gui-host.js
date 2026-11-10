/**
 * @file Isolated host for actual desktop GUI integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..', '..');
const argument = process.argv.find(arg => arg.startsWith('--user-data-dir='));
if(!argument) throw new Error('Desktop GUI tests require an isolated profile.');
const profile = argument.slice('--user-data-dir='.length);
const documents = path.join(profile, 'documents');
fs.mkdirSync(documents, { recursive: true });
app.setPath('documents', documents);
app.setPath('userData', profile);
app.setAppPath(root);
fs.writeFileSync(path.join(profile, 'config.json'), JSON.stringify({ 'shown-getting-started': 1 }));

// Isolate the test application's instance routing without depending on CLI runtime support.
const { PRDC_JSLAB_INSTANCE_ROUTER } = require('../../backend/instance-router');
for(const method of ['start', 'markAsLastActive', 'trackWindowActivity']) {
  PRDC_JSLAB_INSTANCE_ROUTER.prototype[method] = function() {};
}
PRDC_JSLAB_INSTANCE_ROUTER.prototype.forwardScriptsToLastActive = async function() { return false; };
app.on('browser-window-created', function(_event, win) {
  win.show = function() {};
  win.showInactive = function() {};
  win.focus = function() {};
});
var parent_arg = process.argv.find(arg => arg.startsWith('--gui-parent-pid='));
var parent_pid = Number(parent_arg && parent_arg.split('=')[1]);
if(!Number.isInteger(parent_pid) || parent_pid <= 0) throw new Error('GUI tests require an owning process.');
var parent_timer = setInterval(function() {
  try { process.kill(parent_pid, 0); } catch(err) { app.exit(0); }
}, 1000);
parent_timer.unref();
require('../../init');
