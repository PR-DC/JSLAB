/**
 * @file JSLAB shared WebAssembly initialization
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var initialized_modules = null;
var initialization = null;
var configured_factories = null;
var module_initializations = { native: null, alpha: null };

/**
 * Registers factories without compiling either backend.
 * @param {Function} native_factory Numerical module factory.
 * @param {Function} alpha_factory Geometry module factory.
 */
function configureWasm(native_factory, alpha_factory) {
  if(typeof native_factory !== 'function' || typeof alpha_factory !== 'function') {
    throw new Error('Required WebAssembly bundles are missing. Run npm run build-native-wasm.');
  }
  configured_factories = { native: native_factory, alpha: alpha_factory };
}

/**
 * Returns one backend, compiling it synchronously on its first use.
 * @param {'native'|'alpha'} name Backend name.
 * @returns {Object} Initialized backend.
 */
function getWasmModule(name) {
  if(name !== 'native' && name !== 'alpha') throw new Error('Unknown WebAssembly backend: '+name);
  if(initialized_modules && initialized_modules[name]) return initialized_modules[name];
  if(!configured_factories) throw new Error('Configure WebAssembly before constructing the JSLAB environment.');
  throw new Error('Prepare the '+name+' WebAssembly backend before using it.');
}

/**
 * Initializes one configured backend at an asynchronous execution boundary.
 * @param {'native'|'alpha'} name Backend name.
 * @returns {Promise<Object>} Initialized backend.
 */
function prepareWasmModule(name) {
  if(name !== 'native' && name !== 'alpha') return Promise.reject(
    new Error('Unknown WebAssembly backend: '+name));
  if(initialized_modules && initialized_modules[name]) {
    return Promise.resolve(initialized_modules[name]);
  }
  if(!configured_factories) return Promise.reject(
    new Error('Configure WebAssembly before constructing the JSLAB environment.'));
  if(module_initializations[name]) return module_initializations[name];
  module_initializations[name] = Promise.resolve().then(function() {
    return configured_factories[name]();
  }).then(function(module) {
    if(!initialized_modules) initialized_modules = { native: null, alpha: null };
    initialized_modules[name] = module;
    return module;
  }).catch(function(error) {
    module_initializations[name] = null;
    throw error;
  });
  return module_initializations[name];
}

/**
 * Prepares only backends referenced by source about to run synchronously.
 * @param {string} code User source.
 * @returns {Promise<void>} Completion promise.
 */
async function prepareWasmForCode(code) {
  var source = String(code || '');
  var requested = [];
  if(/\b(?:roots|cumtrapz|trapz|minDisksDistance3D)\b/.test(source)) requested.push('native');
  if(/\b(?:boundary3D|writeOff|AlphaShape3D)\b/.test(source)) requested.push('alpha');
  await Promise.all(requested.map(prepareWasmModule));
}

/**
 * Initializes one numerical and geometry backend per sandbox or worker.
 * @param {Function} native_factory Numerical module factory.
 * @param {Function} alpha_factory Geometry module factory.
 * @returns {Promise<Object>} Initialized modules.
 */
function initializeWasm(native_factory, alpha_factory) {
  if(initialization) return initialization;
  try {
    configureWasm(native_factory, alpha_factory);
  } catch(error) {
    return Promise.reject(new Error('Required WebAssembly bundles are missing. Run npm run build-native-wasm.'));
  }
  initialization = Promise.all([
    Promise.resolve().then(function() { return configured_factories.native(); }),
    Promise.resolve().then(function() { return configured_factories.alpha(); })
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
  if(!initialized_modules || !initialized_modules.native || !initialized_modules.alpha) {
    throw new Error('Initialize WebAssembly before constructing the JSLAB environment.');
  }
  return initialized_modules;
}

exports.configureWasm = configureWasm;
exports.getWasmModule = getWasmModule;
exports.prepareWasmModule = prepareWasmModule;
exports.prepareWasmForCode = prepareWasmForCode;
exports.initializeWasm = initializeWasm;
exports.getWasmModules = getWasmModules;
