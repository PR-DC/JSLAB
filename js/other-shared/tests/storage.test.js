/**
 * @file Shared settings migration failure and recovery tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_STORAGE } = require('../storage');
const { PRDC_JSLAB_TESTS } = require('../tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('failed settings migration preserves the original value for a later successful read', function(assert) {
  const legacy = new Map([['history', JSON.stringify(['saved search'])]]);
  const values = new Map();
  const storage = Object.assign(new PRDC_JSLAB_STORAGE(), {
    _legacy: { getItem: key => legacy.get(key), removeItem: key => legacy.delete(key) },
    _read: key => values.get(key),
    _write: () => {
      throw Error('Storage unavailable');
    },
    _remove: key => values.delete(key), _keys: () => Array.from(values.keys())
  });
  assert.equal(storage.get('history', 'fallback'), 'fallback');
  assert.equal(legacy.has('history'), true);
  storage._write = (key, value) => values.set(key, value);
  assert.deepEqual(storage.get('history'), ['saved search']);
  assert.equal(legacy.has('history'), false);
  assert.deepEqual(values.get('history'), ['saved search']);
  storage.clear();
  assert.equal(storage.has('history'), false);
}, { tags: ['unit', 'storage'] });

exports.MODULE_TESTS = tests;
