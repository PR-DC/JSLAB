/**
 * @file JSLAB native Windows installer PATH integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const crypto = require('crypto');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('NSIS PATH handling preserves entries, separates scopes and refuses truncation', function(assert) {
  if(process.platform !== 'win32') assert.skip('Windows installer integration test.');
  var cache = path.join(process.env.ELECTRON_BUILDER_CACHE ||
    path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache'), 'nsis');
  var compiler = fs.existsSync(cache) && fs.readdirSync(cache).map(function(name) {
    return path.join(cache, name, 'makensis.exe');
  }).find(function(filename) { return fs.existsSync(filename); });
  if(!compiler) assert.skip('Build the Windows installer to install its NSIS compiler.');
  var folder = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-installer-test-'));
  var key = 'Software\\JSLAB\\InstallerTest-' + crypto.randomUUID();
  var executable = path.join(folder, 'installer-test.exe');
  var result_file = path.join(folder, 'result.txt');
  var source = [
    'Unicode true',
    'RequestExecutionLevel user',
    'SilentInstall silent',
    'OutFile "' + executable + '"',
    '!define JSLAB_CLI_USER_KEY "' + key + '\\User"',
    '!define JSLAB_CLI_MACHINE_KEY "' + key + '\\Machine"',
    '!define JSLAB_CLI_MACHINE_ROOT HKCU',
    '!define JSLAB_CLI_MACHINE_HKEY 0x80000001',
    '!include "' + path.resolve(__dirname, '../../../config/installer.nsh') + '"',
    'Var installMode',
    '!insertmacro customHeader',
    '!macro CheckPath KEY EXPECTED',
    '  ReadRegStr $0 HKCU "${KEY}" "Path"',
    '  ${If} $0 != "${EXPECTED}"',
    '    FileOpen $1 "$EXEDIR\\result.txt" w',
    '    FileWrite $1 "Unexpected PATH: $0"',
    '    FileClose $1',
    '    SetErrorLevel 1',
    '    Quit',
    '  ${EndIf}',
    '!macroend',
    'Section',
    '  SetRegView 64',
    '  StrCpy $INSTDIR "C:\\JS LAB"',
    '  StrCpy $installMode "current"',
    '  IfFileExists "$EXEDIR\\guard.marker" guard normal',
    '  normal:',
    '  WriteRegExpandStr HKCU "${JSLAB_CLI_USER_KEY}" "Path" "%SystemRoot%\\System32;C:\\JS LAB\\;c:\\js lab;C:\\Keep;C:\\JS LAB tools"',
    '  Push "add"',
    '  Call JslabUpdatePath',
    '  !insertmacro CheckPath "${JSLAB_CLI_USER_KEY}" "%SystemRoot%\\System32;C:\\Keep;C:\\JS LAB tools;C:\\JS LAB"',
    '  Push "add"',
    '  Call JslabUpdatePath',
    '  !insertmacro CheckPath "${JSLAB_CLI_USER_KEY}" "%SystemRoot%\\System32;C:\\Keep;C:\\JS LAB tools;C:\\JS LAB"',
    '  Push "remove"',
    '  Call JslabUpdatePath',
    '  !insertmacro CheckPath "${JSLAB_CLI_USER_KEY}" "%SystemRoot%\\System32;C:\\Keep;C:\\JS LAB tools"',
    '  WriteRegExpandStr HKCU "${JSLAB_CLI_MACHINE_KEY}" "Path" "%TEMP%\\Machine"',
    '  StrCpy $installMode "all"',
    '  Push "add"',
    '  Call JslabUpdatePath',
    '  !insertmacro CheckPath "${JSLAB_CLI_MACHINE_KEY}" "%TEMP%\\Machine;C:\\JS LAB"',
    '  !insertmacro CheckPath "${JSLAB_CLI_USER_KEY}" "%SystemRoot%\\System32;C:\\Keep;C:\\JS LAB tools"',
    '  Push "remove"',
    '  Call JslabUpdatePath',
    '  !insertmacro CheckPath "${JSLAB_CLI_MACHINE_KEY}" "%TEMP%\\Machine"',
    '  StrCpy $installMode "current"',
    '  WriteRegExpandStr HKCU "${JSLAB_CLI_USER_KEY}" "Path" \'C:\\Keep;;$\\"C:\\JS LAB\\$\\";C:\\Other;\'',
    '  Push "remove"',
    '  Call JslabUpdatePath',
    '  !insertmacro CheckPath "${JSLAB_CLI_USER_KEY}" "C:\\Keep;;C:\\Other;"',
    '  DeleteRegValue HKCU "${JSLAB_CLI_USER_KEY}" "Path"',
    '  Push "add"',
    '  Call JslabUpdatePath',
    '  !insertmacro CheckPath "${JSLAB_CLI_USER_KEY}" "C:\\JS LAB"',
    '  Goto complete',
    '  guard:',
    '  Push "add"',
    '  Call JslabUpdatePath',
    '  complete:',
    '  FileOpen $1 "$EXEDIR\\result.txt" w',
    '  FileWrite $1 "passed"',
    '  FileClose $1',
    '  SetErrorLevel 0',
    'SectionEnd'
  ].join('\n');
  try {
    var filename = path.join(folder, 'installer-test.nsi');
    fs.writeFileSync(filename, source);
    cp.execFileSync(compiler, ['/V2', filename], { windowsHide: true, timeout: 30000 });
    var run = cp.spawnSync(executable, [], { windowsHide: true, timeout: 15000 });
    assert.equal(run.status, 0, fs.existsSync(result_file) ? fs.readFileSync(result_file, 'utf8') : String(run.error));
    var info = cp.execFileSync(compiler, ['/HDRINFO'], { encoding: 'utf8', windowsHide: true });
    var limit = Number(/NSIS_MAX_STRLEN=(\d+)/.exec(info)[1]);
    fs.writeFileSync(path.join(folder, 'guard.marker'), '');
    for(var length of [limit - 4, limit + 4]) {
      var value = 'X'.repeat(length);
      cp.execFileSync('reg.exe', ['ADD', 'HKCU\\' + key + '\\User', '/v', 'Path', '/t', 'REG_EXPAND_SZ', '/d', value, '/f', '/reg:64'], { windowsHide: true });
      run = cp.spawnSync(executable, [], { windowsHide: true, timeout: 15000 });
      assert.equal(run.status, 0);
      var actual = cp.execFileSync('reg.exe', ['QUERY', 'HKCU\\' + key + '\\User', '/v', 'Path', '/reg:64'], { encoding: 'utf8', windowsHide: true });
      assert.ok(actual.includes(value), 'Installer must leave a PATH unchanged when it cannot safely append.');
      assert.ok(!actual.includes('C:\\JS LAB'));
    }
  } finally {
    cp.spawnSync('reg.exe', ['DELETE', 'HKCU\\' + key, '/f', '/reg:64'], { windowsHide: true, stdio: 'ignore' });
    fs.rmSync(folder, { recursive: true, force: true });
  }
}, { tags: ['integration', 'cli', 'windows'], timeout_ms: 60000 });

exports.MODULE_TESTS = tests;
