/**
 * @file Electron application storage tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('application storage encrypts secrets and preserves the existing credential key', function(assert) {
  const secure = { isEncryptionAvailable: () => true,
    encryptString: value => Buffer.from('encrypted:' + value),
    decryptString: value => value.toString().replace(/^encrypted:/, '') };
  const context = { exports: {}, Buffer,
    require: name => name === 'electron-store' ? Map : name === '../other-shared/storage' ?
      require('../../other-shared/storage') : { safeStorage: secure } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../storage.js'), 'utf8'), context);
  const storage = new context.exports.PRDC_JSLAB_ELECTRON_STORAGE();
  Object.defineProperty(storage._settings, 'store', { get: () => Object.fromEntries(storage._settings) });
  storage.set('lang_index', 1);
  assert.equal(storage.get('lang_index'), 1);
  assert.equal(storage.get('missing', false), false);
  const legacy = new Map([['editor_search_history', JSON.stringify(['old search'])]]);
  context.localStorage = { getItem: key => legacy.get(key), removeItem: key => legacy.delete(key) };
  storage._legacy = context.localStorage;
  assert.equal(JSON.stringify(storage.get('editor_search_history')), JSON.stringify(['old search']));
  assert.equal(legacy.has('editor_search_history'), false);
  legacy.set('editor_search_history', JSON.stringify(['stale search']));
  assert.equal(JSON.stringify(storage.get('editor_search_history')), JSON.stringify(['old search']));
  legacy.set('legacy-only', JSON.stringify(false));
  assert.equal(storage.has('legacy-only'), true);
  assert.equal(storage.get('legacy-only'), false);
  legacy.set('legacy-only', JSON.stringify('stale value'));
  storage.delete('legacy-only');
  assert.equal(storage.has('legacy-only'), false);
  assert.equal(storage.hasSecret('openai-api-key'), false);
  storage.setSecret('openai-api-key', 'sk-test');
  assert.equal(storage.get('openai-api-key-encrypted'), Buffer.from('encrypted:sk-test').toString('base64'));
  assert.equal(storage.getSecret('openai-api-key'), 'sk-test');
  assert.equal(storage.hasSecret('openai-api-key'), true);
  secure.isEncryptionAvailable = () => false;
  assert.throws(() => storage.setSecret('another-key', 'sk-new'), /unavailable/);
  assert.throws(() => storage.getSecret('openai-api-key'), /unavailable/);
  assert.equal(storage.getSecret('missing'), '');
  storage.deleteSecret('openai-api-key');
  assert.equal(storage.hasSecret('openai-api-key'), false);
  secure.isEncryptionAvailable = () => true;
  storage.setSecret('openai-api-key', 'sk-test');
  storage.clear();
  assert.equal(storage.has('lang_index'), false);
  assert.equal(storage.hasSecret('openai-api-key'), false);
}, { tags: ['unit', 'storage'] });

exports.MODULE_TESTS = tests;
