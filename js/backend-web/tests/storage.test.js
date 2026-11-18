/**
 * @file Browser application storage tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WEB_STORAGE } = require('../storage');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('browser storage persists settings while secrets remain scoped to the application instance', function(assert) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key), setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key), key: index => Array.from(values.keys())[index],
    get length() {
      return values.size;
    }
  } });
  try {
    const storage = new PRDC_JSLAB_WEB_STORAGE('test');
    storage.set('language', 'en');
    storage.setSecret('openai-api-key', 'sk-test');
    assert.equal(storage.hasSecret('openai-api-key'), true);
    assert.equal(storage.getSecret('openai-api-key'), 'sk-test');
    assert.equal(values.size, 1);
    const reloaded = new PRDC_JSLAB_WEB_STORAGE('test');
    assert.equal(reloaded.get('language'), 'en');
    assert.equal(reloaded.hasSecret('openai-api-key'), false);
    assert.equal(reloaded.getSecret('openai-api-key'), '');
    storage.deleteSecret('openai-api-key');
    assert.equal(storage.hasSecret('openai-api-key'), false);
    storage.delete('language');
    assert.equal(reloaded.get('language', 'rs'), 'rs');
    values.set('editor_search_history', JSON.stringify(['old search']));
    values.set('editor-search-all-panel-height-percent', '35');
    assert.deepEqual(storage.get('editor_search_history'), ['old search']);
    assert.equal(storage.get('editor-search-all-panel-height-percent'), 35);
    assert.equal(values.has('editor_search_history'), false);
    values.set('editor_search_history', JSON.stringify(['stale search']));
    assert.deepEqual(storage.get('editor_search_history'), ['old search']);
    values.set('another-namespace:language', JSON.stringify('rs'));
    storage.setSecret('secret', 'temporary');
    assert.equal(storage.has('editor_search_history'), true);
    storage.clear();
    assert.equal(storage.has('editor-search-all-panel-height-percent'), false);
    assert.equal(storage.has('editor_search_history'), false);
    assert.equal(storage.hasSecret('secret'), false);
    assert.equal(values.get('another-namespace:language'), JSON.stringify('rs'));
    values.set('legacy-only', JSON.stringify('old value'));
    storage.delete('legacy-only');
    assert.equal(storage.has('legacy-only'), false);
  } finally {
    if(previous) {
      Object.defineProperty(globalThis, 'localStorage', previous);
    } else {
      delete globalThis.localStorage;
    }
  }
}, { tags: ['unit', 'storage'] });

exports.MODULE_TESTS = tests;
