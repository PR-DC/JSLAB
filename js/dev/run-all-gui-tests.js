/**
 * @file Runs component, real browser and native desktop GUI checks
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const path = require('path');
const { spawnSync } = require('child_process');
for(const runner of ['run-gui-tests.js', 'run-web-gui-tests.js', 'run-desktop-gui-tests.js']) {
  var result = spawnSync(process.execPath, [path.join(__dirname, runner), ...process.argv.slice(2)], {
    cwd: path.resolve(__dirname, '..', '..'), stdio: 'inherit', windowsHide: true
  });
  if(result.error) console.error(result.error);
  if(result.error || result.status !== 0) process.exitCode = 1;
}
