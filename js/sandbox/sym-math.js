/**
 * @file JSLAB library symbolic submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SYMBOLIC_MATH_SYMPY } = require('./sym-math-sympy');
const { PRDC_JSLAB_SYMBOLIC_MATH_GIAC } = require('./sym-math-giac');

/**
 * Selects the symbolic backend for the current workspace. The selected
 * backend initializes its runtime when sym.load() is first called.
 */
class PRDC_JSLAB_SYMBOLIC_MATH {

  /**
   * Creates the configured symbolic-math backend for a workspace.
   * @param {Object} jsl JSLAB workspace.
   * @returns {PRDC_JSLAB_SYMBOLIC_MATH_SYMPY|PRDC_JSLAB_SYMBOLIC_MATH_GIAC} Configured backend.
   */
  constructor(jsl) {
    const backend = jsl.inter.config.SYMBOLIC_MATH_BACKEND;
    if(backend === 'giac') {
      return new PRDC_JSLAB_SYMBOLIC_MATH_GIAC(jsl);
    }
    if(backend === undefined || backend === 'sympy') {
      return new PRDC_JSLAB_SYMBOLIC_MATH_SYMPY(jsl);
    }
    throw new Error('Unknown symbolic math backend: ' + backend);
  }

  static #script_loads = new Map();

  /**
   * Loads a classic CAS runtime script in a document or sandbox worker.
   * @param {URL} url Script URL.
   * @param {string} export_name Runtime factory name.
   * @returns {Promise<Function>} Runtime factory.
   */
  static _loadSymbolicFactory(url, export_name) {
    const key = url.href;
    if(!PRDC_JSLAB_SYMBOLIC_MATH.#script_loads.has(key)) {
      const load = (async () => {
        const previous_export = Object.getOwnPropertyDescriptor(globalThis, export_name);
        if(!previous_export) {
          // Predeclare a configurable property so the classic script's
          // global declaration can be removed before returning to JSLAB.
          Object.defineProperty(globalThis, export_name, { configurable: true, writable: true });
        }
        try {
          if(typeof globalThis.importScripts === 'function') {
            globalThis.importScripts(key);
          } else {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = key;
              script.async = true;
              script.onload = resolve;
              script.onerror = () => reject(new Error('Unable to load symbolic runtime from ' + key));
              document.head.appendChild(script);
            });
          }
          const factory = globalThis[export_name];
          if(typeof factory !== 'function' || factory === previous_export?.value) {
            throw new Error('Missing symbolic runtime factory in ' + key);
          }
          return factory;
        } finally {
          if(previous_export) {
            Object.defineProperty(globalThis, export_name, previous_export);
          } else {
            delete globalThis[export_name];
          }
        }
      })().catch(error => {
        PRDC_JSLAB_SYMBOLIC_MATH.#script_loads.delete(key);
        throw error;
      });
      PRDC_JSLAB_SYMBOLIC_MATH.#script_loads.set(key, load);
    }
    return PRDC_JSLAB_SYMBOLIC_MATH.#script_loads.get(key);
  }
}

exports.PRDC_JSLAB_SYMBOLIC_MATH = PRDC_JSLAB_SYMBOLIC_MATH;
