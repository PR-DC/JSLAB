/**
 * @file Prepares the Windows console host for the packaged JSLAB CLI
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');

/**
 * Copies the bundled Electron host with the Windows console subsystem enabled.
 * Runs before executable signing; the desktop executable remains the GUI host.
 * @param {Object} context Electron Builder packaging context.
 */
module.exports = async function(context) {
  if(context.electronPlatformName !== 'win32') return;
  var executable = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.exe');
  var binary = fs.readFileSync(executable);
  if(binary.readUInt16LE(0) !== 0x5a4d) throw new Error('Invalid Windows CLI host executable.');
  var pe = binary.readUInt32LE(0x3c);
  if(binary.readUInt32LE(pe) !== 0x4550) throw new Error('Invalid Windows CLI host PE header.');
  var optional = pe + 24;
  var magic = binary.readUInt16LE(optional);
  if(magic !== 0x10b && magic !== 0x20b) throw new Error('Unsupported Windows CLI host format.');
  binary.writeUInt16LE(3, optional + 68);
  binary.writeUInt32LE(0, optional + 64);
  var certificate = optional + (magic === 0x20b ? 112 : 96) + 32;
  binary.writeUInt32LE(0, certificate);
  binary.writeUInt32LE(0, certificate + 4);
  fs.writeFileSync(path.join(context.appOutDir, 'jslab-console.exe'), binary);
  fs.writeFileSync(path.join(context.appOutDir, 'jslab-cli.json'), JSON.stringify({
    runtime: context.packager.appInfo.productFilename + '.exe'
  }, null, 2));
  fs.writeFileSync(path.join(context.appOutDir, 'jslab.cmd'), [
    '@echo off',
    'setlocal',
    'set ELECTRON_RUN_AS_NODE=1',
    '"%~dp0jslab-console.exe" "%~dp0resources\\app\\js\\cli\\main.js" %*',
    'exit /b %errorlevel%',
    ''
  ].join('\r\n'));
};
