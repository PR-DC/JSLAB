/**
 * @file JSLAB path submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const node_path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');

var tests = new PRDC_JSLAB_TESTS();

tests.add('pathSep matches environment separator', function(assert) {
  assert.equal(jsl.path.pathSep(), jsl.inter.env.pathSep());
}, { tags: ['unit', 'path'] });

tests.add('pathJoin combines segments', function(assert) {
  var joined = jsl.path.pathJoin('a', 'b', 'c');
  assert.ok(joined.includes('a'));
  assert.ok(joined.includes('b'));
  assert.ok(joined.includes('c'));
}, { tags: ['unit', 'path'] });

tests.add('getDirName extracts directory name', function(assert) {
  assert.equal(jsl.path.getDirName('C:\\\\folder\\\\child\\\\'), 'child');
  assert.equal(jsl.path.getDirName('/tmp/demo/file.txt'), 'file.txt');
}, { tags: ['unit', 'path'] });

tests.add('path extension helpers return extension', function(assert) {
  assert.equal(jsl.path.pathExtName('file.tar.gz'), '.gz');
  assert.equal(jsl.path.pathFileExt('file.tar.gz'), '.gz');
}, { tags: ['unit', 'path'] });

tests.add('pathNormalize removes redundant segments', function(assert) {
  var normalized = jsl.path.pathNormalize('a' + jsl.path.pathSep() + 'b' + jsl.path.pathSep() + '..' + jsl.path.pathSep() + 'c');
  assert.ok(normalized.endsWith('a' + jsl.path.pathSep() + 'c'));
}, { tags: ['unit', 'path'] });

tests.add('comparePaths compares normalized absolute paths', function(assert) {
  var temp = os.tmpdir();
  var p1 = node_path.join(temp, 'jslab-test', '..', 'jslab-test', 'file.txt');
  var p2 = node_path.join(temp, 'jslab-test', 'file.txt');
  assert.equal(jsl.path.comparePaths(p1, p2), true);
}, { tags: ['unit', 'path'] });

tests.add('getUniquePath appends index when path exists', function(assert) {
  var base_dir = fs.mkdtempSync(node_path.join(os.tmpdir(), 'jslab-path-test-'));
  var base_path = node_path.join(base_dir, 'folder');
  fs.mkdirSync(base_path);
  var out = jsl.path.getUniquePath(base_path);
  assert.ok(out !== base_path);
  assert.equal(out.startsWith(base_path), true);
  fs.rmSync(base_dir, { recursive: true, force: true });
}, { tags: ['unit', 'path'] });

tests.add('getUniqueFilename appends index when filename exists', function(assert) {
  var base_dir = fs.mkdtempSync(node_path.join(os.tmpdir(), 'jslab-file-test-'));
  var file_without_ext = node_path.join(base_dir, 'report');
  var ext = 'txt';
  fs.writeFileSync(file_without_ext + '.' + ext, 'x');
  var out = jsl.path.getUniqueFilename(file_without_ext, ext);
  assert.ok(out !== file_without_ext + '.' + ext);
  assert.ok(out.endsWith('.' + ext));
  fs.rmSync(base_dir, { recursive: true, force: true });
}, { tags: ['unit', 'path'] });

exports.MODULE_TESTS = tests;
