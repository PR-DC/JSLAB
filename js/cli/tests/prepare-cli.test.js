/**
 * @file JSLAB packaged Windows console host tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const prepareCLI = require('../../dev/prepare-cli');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('Windows console packaging preserves the GUI host and records its runtime name', async function(assert) {
  var folder = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-console-test-'));
  try {
    for(var magic of [0x10b, 0x20b]) {
      var original = Buffer.alloc(512);
      var pe = 128;
      var optional = pe + 24;
      var certificate = optional + (magic === 0x20b ? 112 : 96) + 32;
      original.writeUInt16LE(0x5a4d, 0);
      original.writeUInt32LE(pe, 0x3c);
      original.writeUInt32LE(0x4550, pe);
      original.writeUInt16LE(magic, optional);
      original.writeUInt16LE(2, optional + 68);
      original.writeUInt32LE(1234, optional + 64);
      original.writeUInt32LE(400, certificate);
      original.writeUInt32LE(64, certificate + 4);
      var desktop = path.join(folder, 'Test Desktop.exe');
      fs.writeFileSync(desktop, original);
      await prepareCLI({ electronPlatformName: 'win32', appOutDir: folder,
        packager: { appInfo: { productFilename: 'Test Desktop' } } });
      var console_host = fs.readFileSync(path.join(folder, 'jslab-console.exe'));
      assert.equal(console_host.readUInt16LE(optional + 68), 3);
      assert.equal(console_host.readUInt32LE(optional + 64), 0);
      assert.equal(console_host.readUInt32LE(certificate), 0);
      assert.equal(console_host.readUInt32LE(certificate + 4), 0);
      assert.ok(fs.readFileSync(desktop).equals(original));
      assert.equal(JSON.parse(fs.readFileSync(path.join(folder, 'jslab-cli.json'), 'utf8')).runtime, 'Test Desktop.exe');
      var launcher = fs.readFileSync(path.join(folder, 'jslab.cmd'), 'utf8');
      assert.ok(launcher.includes('set ELECTRON_RUN_AS_NODE=1\r\n'));
      assert.ok(launcher.includes('"%~dp0jslab-console.exe" "%~dp0resources\\app\\js\\cli\\main.js" %*'));
    }
    await prepareCLI({ electronPlatformName: 'linux' });
  } finally { fs.rmSync(folder, { recursive: true, force: true }); }
}, { tags: ['unit', 'cli', 'packaging'] });

exports.MODULE_TESTS = tests;
