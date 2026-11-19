/**
 * @file JSLAB LaTeX Editor compiler coordination
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LATEX_COMPILER } = require('../other-shared/latex-compiler');
const { PRDC_JSLAB_LATEX_WASM_COMPILER } = require('../other-shared/latex-wasm-compiler');

/**
 * Connects editor requests to the selected compiler and its SyncTeX map.
 */
class PRDC_JSLAB_LATEX_EDITOR_COMPILER {

  /**
   * Adds WebAssembly compilation to an editor host.
   * @param {Object} host Project and native compiler adapter.
   * @param {boolean} browser Whether WebAssembly is the primary compiler.
   * @param {Function} createWorker Host worker factory.
   * @returns {Object} Editor request and event adapter.
   */
  static attach(host, browser, createWorker) {
    const compiler = new PRDC_JSLAB_LATEX_WASM_COMPILER({
      createWorker,
      snapshot: file => host.request('wasm-files', file),
      publish: (snapshot, output) => host.request('wasm-output', snapshot.token, output),
      sync: true
    });
    let use_wasm = browser;
    let wasm_preview = false;
    return {
      onOpen: listener => host.onOpen(listener),
      onClose: listener => host.onClose(listener),
      async request(action, ...args) {
        switch(action) {
          case 'detect':
          case 'locate':
          case 'toolchain': {
            const native = browser ? null : await host.request(action, ...args);
            if(action === 'locate' && !native) return null;
            const selected = PRDC_JSLAB_LATEX_COMPILER.lookup(native, args[0]);
            if(action === 'detect') use_wasm = selected.wasm === true;
            return selected;
          }
          case 'compile': {
            const result = use_wasm ? await compiler.compile(...args) : await host.request(action, ...args);
            if(result?.ok) wasm_preview = use_wasm;
            return result;
          }
          case 'cancel': return compiler.cancel() || host.request(action, ...args);
          case 'forward': if(wasm_preview) return compiler.forward(...args); break;
          case 'reverse': if(wasm_preview) return compiler.reverse(...args); break;
          case 'close': compiler.cancel(); compiler.stopWorker(); break;
        }
        return host.request(action, ...args);
      }
    };
  }

}

/**
 * Accepts compiler output only for the current project and snapshot.
 */
class PRDC_JSLAB_LATEX_EDITOR_BUILD {
  /**
   * Creates a tracker for a single editor window.
   * @param {Function} generateToken Creates an opaque build token.
   */
  constructor(generateToken = () => crypto.randomUUID()) {
    this.generateToken = generateToken;
  }

  /**
   * Invalidates any outstanding snapshot when the editor switches projects.
   */
  clear() {
    this.current = null;
  }

  /**
   * Reads a build snapshot or publishes the matching compiler output.
   * @param {Object} project Active project adapter.
   * @param {string} action Snapshot or publish request.
   * @param {string} first Source path for a snapshot or token for a publish request.
   * @param {Object} [second] Compiler output to publish.
   * @returns {Promise<Object|null>} Snapshot, publish result, or null for a stale build.
   */
  async request(project, action, first, second) {
    if(action === 'wasm-files') {
      const build = this.current = { token: this.generateToken(), project };
      const snapshot = await project.snapshot(first);
      if(!snapshot || this.current !== build) return null;
      const { target, ...files } = snapshot;
      build.target = target;
      return { token: build.token, ...files };
    }
    const build = this.current;
    if(!build?.target || build.token !== first || build.project !== project) return null;
    this.clear();
    return project.publish(build.target, second, true);
  }
}

exports.PRDC_JSLAB_LATEX_EDITOR_BUILD = PRDC_JSLAB_LATEX_EDITOR_BUILD;
exports.PRDC_JSLAB_LATEX_EDITOR_COMPILER = PRDC_JSLAB_LATEX_EDITOR_COMPILER;
