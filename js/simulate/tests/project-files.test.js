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
const { PRDC_JSLAB_SIMULATE_AUTOMATION } = require('../automation');
var tests = new PRDC_JSLAB_TESTS();

tests.add('Simulate automation cancellation is scoped to a request and caller', async function(assert) {
  const requests = new PRDC_JSLAB_SIMULATE_AUTOMATION();
  const owner = {};
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const pending = requests.run('pending', owner, async request => {
    await wait;
    return request.cancelled;
  });
  assert.equal(requests.cancel('pending', {}), false);
  assert.equal(requests.cancel('pending', owner), true);
  assert.equal(requests.cancel('pending', owner), false);
  release();
  assert.equal(await pending, true);
  let stopped = false;
  const active = requests.run('active', owner, request => new Promise(resolve => {
    request.stop = () => { stopped = true; resolve(request.cancelled); };
  }));
  assert.equal(requests.cancel('active', owner), true);
  assert.equal(await active, true);
  assert.equal(stopped, true);
  assert.equal(requests.requests.size, 0);
}, { tags: ['unit', 'simulate', 'files'] });

tests.add('opening Simulate shares picker cancellation, supported paths and reuse rules', async function(assert) {
  const selection = PRDC_JSLAB_SIMULATE_PROJECT;
  let choice;
  const dialogs = [];
  const host = {
    currentString: String,
    choose: async options => { dialogs.push(options); return choice; },
    existsFile: async file => ['/project/model.JSLMO', '/project/model.mo'].includes(file)
  };
  assert.deepEqual(await selection.resolveProject(undefined, host, { reuse: true }), { success: true });
  assert.equal(dialogs.length, 0);
  assert.deepEqual(await selection.resolveProject(undefined, host), { success: false, error: '776' });
  choice = '/project/model.JSLMO';
  assert.deepEqual(await selection.resolveProject(undefined, host), { success: true, file: choice });
  assert.deepEqual(dialogs[0], { title: '775', properties: ['openFile'], filters: [{ name: '672', extensions: ['jslmo'] }] });
  assert.deepEqual(await selection.resolveProject('/project/model.mo', host), { success: false, error: '674' });
  assert.deepEqual(await selection.resolveProject('/project/model.mo', host, { allow_modelica: true }),
    { success: true, file: '/project/model.mo' });
  assert.deepEqual(await selection.resolveProject('/missing.jslmo', host, { reuse: true }), { success: false, error: '674' });
  assert.equal(dialogs.length, 2);
}, { tags: ['unit', 'simulate', 'files'] });

tests.add('project opening shares validation and source import metadata across host file adapters', async function(assert) {
  const reads = [];
  const codec = new PRDC_JSLAB_SIMULATE_PROJECT({ language: { currentString: id => 'message-' + id },
    files: { path, normalizePath: String, exists: file => !file.endsWith('/missing.jslmo'),
      read: async file => { reads.push(file); return 'source'; },
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
  assert.equal((await codec.openFile('/workspace/missing.jslmo')).error, 'message-674');
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
