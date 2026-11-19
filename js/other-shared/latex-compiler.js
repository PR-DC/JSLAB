/**
 * @file JSLAB LaTeX backend selection and workspace build results
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LATEX_WASM_COMPILER } = require('./latex-wasm-compiler');

/**
 * Coordinates LaTeX compilation in the editor and workspace commands.
 */
class PRDC_JSLAB_LATEX_COMPILER {

  /**
   * Normalizes compiler and source preferences received from the editor or storage.
   * @param {Object} [options] Requested preferences.
   * @returns {Object} Validated preferences.
   */
  static preferences(options) {
    return {
      engine: ['pdflatex', 'xelatex', 'lualatex'].includes(options?.engine) ? options.engine : 'pdflatex',
      draft: options?.draft === true,
      reuse: options?.reuse === true,
      halt: options?.halt !== false,
      wrap: options?.wrap !== false
    };
  }

  /**
   * Selects native TeX when all required tools are available.
   * @param {Object|null} native Native probe result, if the host has one.
   * @param {string} [engine] Requested TeX engine.
   * @returns {Object} Selected compiler information.
   */
  static lookup(native, engine) {
    if(native && !native.missing.length) return native;
    return { engine, missing: [], version: /* lang-fixed */ 'TeX Live 2026 (WebAssembly)', wasm: true };
  }

  /**
   * Compiles one workspace document using WebAssembly and releases the worker.
   * @param {string} file Project-relative TeX source.
   * @param {Object} host Worker factory and project I/O callbacks.
   * @returns {Promise<Object>} Build status, log and PDF path on success.
   */
  static async compileWasmFile(file, host) {
    const compiler = new PRDC_JSLAB_LATEX_WASM_COMPILER(host);
    try {
      const result = await compiler.compile(file, { engine: 'pdflatex' });
      const log = result?.log || result?.output || '';
      if(result?.ok && result.pdf) return { ok: true, pdf: result.pdf, missing: [], log };
      return { ok: false, missing: [], log };
    } finally {
      compiler.stopWorker();
    }
  }
}

exports.PRDC_JSLAB_LATEX_COMPILER = PRDC_JSLAB_LATEX_COMPILER;
