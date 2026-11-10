/**
 * @file JSLAB shared WebAssembly initialization
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var initialized_modules = null;
var initialization = null;

/**
 * Initializes one numerical and geometry backend per sandbox or worker.
 * @param {Function} native_factory Numerical module factory.
 * @param {Function} alpha_factory Geometry module factory.
 * @returns {Promise<Object>} Initialized modules.
 */
function initializeWasm(native_factory, alpha_factory) {
  if(initialization) return initialization;
  if(typeof native_factory !== 'function' || typeof alpha_factory !== 'function') {
    return Promise.reject(new Error('Required WebAssembly bundles are missing. Run npm run build-native-wasm.'));
  }
  initialization = Promise.all([
    Promise.resolve().then(function() { return native_factory(); }),
    Promise.resolve().then(function() { return alpha_factory(); })
  ]).then(function(modules) {
    initialized_modules = { native: modules[0], alpha: modules[1] };
    return initialized_modules;
  }).catch(function(err) {
    initialization = null;
    throw err;
  });
  return initialization;
}

/**
 * Returns the initialized backends used by environment constructors.
 * @returns {Object} Initialized modules.
 */
function getWasmModules() {
  if(!initialized_modules) throw new Error('Initialize WebAssembly before constructing the JSLAB environment.');
  return initialized_modules;
}

exports.initializeWasm = initializeWasm;
exports.getWasmModules = getWasmModules;
