/**
 * @file Shared Simulate project file workflow tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
require('./compiler-fixture');
const { PRDC_JSLAB_SIMULATE_PROJECT } = require('../project');
var tests = new PRDC_JSLAB_TESTS();

tests.add('project opening shares validation and source import metadata across host file adapters', async function(assert) {
  const reads = [];
  const codec = new PRDC_JSLAB_SIMULATE_PROJECT({ language: { currentString: id => 'message-' + id },
    files: { path, normalizePath: String, read: async file => { reads.push(file); return 'source'; },
      showOpenDialog: async () => ({ canceled: false, filePaths: ['/workspace/model.mo'] }) } });
  codec.importModelica = source => ({ success: true, source });
  codec.parseProject = source => ({ success: true, source });
  const imported = await codec.openFile();
  assert.equal(imported.imported, true);
  assert.equal(imported.file_path, '');
  assert.equal(imported.imported_file_path, '/workspace/model.mo');
  assert.equal(imported.suggested_file_path, '/workspace/model.jslmo');
  const opened = await codec.openFile('/workspace/model.jslmo');
  assert.equal(opened.imported, false);
  assert.equal(opened.file_path, '/workspace/model.jslmo');
  assert.equal((await codec.openFile('/workspace/model.txt')).error, "message-674");
  assert.equal(reads.length, 2);
  codec.parseProject = () => ({ success: false, error: 'Invalid project' });
  assert.equal((await codec.openFile('/workspace/broken.jslmo')).error, 'Invalid project');
}, { tags: ['unit', 'simulate', 'files'] });

tests.add('project picker cancellation prevents host reads and writes', async function(assert) {
  const codec = new PRDC_JSLAB_SIMULATE_PROJECT({ language: { currentString: String },
    files: { showOpenDialog: async () => ({ canceled: true }), showSaveDialog: async () => ({ canceled: true }),
      read: () => assert.fail('Canceled open read a file'), write: () => assert.fail('Canceled save wrote a file') } });
  assert.equal((await codec.openFile()).canceled, true);
  assert.equal((await codec.saveFile({})).canceled, true);
}, { tags: ['unit', 'simulate', 'files'] });

tests.add('project saving appends the portable extension and awaits the host write', async function(assert) {
  const writes = [];
  const codec = new PRDC_JSLAB_SIMULATE_PROJECT({ language: { currentString: String },
    files: { path, normalizePath: String, showSaveDialog: async () => ({ filePath: '/workspace/saved' }),
      write: async (file, text) => { await Promise.resolve(); writes.push([file, text]); } } });
  codec.serializeProject = request => request.source;
  const saved = await codec.saveFile({ source: 'portable project' });
  assert.equal(saved.file_path, '/workspace/saved.jslmo');
  assert.deepEqual(writes, [['/workspace/saved.jslmo', 'portable project']]);
}, { tags: ['unit', 'simulate', 'files'] });

exports.MODULE_TESTS = tests;
