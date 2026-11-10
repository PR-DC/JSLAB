/**
 * @file JSLAB shared WebAssembly initialization tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

/**
 * Creates an isolated loader with the same lifetime as one sandbox.
 * @returns {Object} Loader exports.
 */
function createLoader() {
  var context = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'jslab-wasm-loader.js'), 'utf8'), context);
  return context.exports;
}

tests.add('WASM initialization waits for both backends and shares concurrent requests', async function(assert) {
  var loader = createLoader();
  var resolve_native;
  var native = { name: 'numerical' };
  var alpha = { name: 'geometry' };
  var calls = 0;
  assert.throws(function() { loader.getWasmModules(); }, /Initialize WebAssembly/);
  var pending = loader.initializeWasm(function() {
    calls++;
    return new Promise(function(resolve) { resolve_native = resolve; });
  }, function() { calls++; return Promise.resolve(alpha); });
  var second = loader.initializeWasm(function() { throw new Error('Duplicate initialization'); }, function() {});
  assert.equal(pending, second);
  await Promise.resolve();
  assert.equal(calls, 2);
  assert.throws(function() { loader.getWasmModules(); }, /Initialize WebAssembly/);
  resolve_native(native);
  var initialized = await pending;
  assert.equal(initialized.native, native);
  assert.equal(initialized.alpha, alpha);
  assert.equal(loader.getWasmModules(), initialized);
}, { tags: ['unit', 'wasm'] });

tests.add('WASM initialization reports missing bundles and permits retry after failure', async function(assert) {
  var loader = createLoader();
  var failure;
  try { await loader.initializeWasm(null, null); } catch(err) { failure = err; }
  assert.ok(/bundles are missing/.test(failure.message));
  failure = null;
  try {
    await loader.initializeWasm(function() { throw new Error('Compilation failed'); }, function() { return {}; });
  } catch(err) { failure = err; }
  assert.equal(failure.message, 'Compilation failed');
  assert.throws(function() { loader.getWasmModules(); }, /Initialize WebAssembly/);
  var initialized = await loader.initializeWasm(function() { return {}; }, function() { return {}; });
  assert.equal(loader.getWasmModules(), initialized);
}, { tags: ['unit', 'wasm'] });

exports.MODULE_TESTS = tests;
