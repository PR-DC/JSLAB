/**
 * @file JSLAB TeX Live 2026 WebAssembly compiler worker
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

// TeXlyre BusyTeX assets-v1.4.1 (AGPL-3.0-or-later).
// https://github.com/TeXlyre/texlyre-busytex/releases/tag/assets-v1.4.1
const library = self.location.protocol === 'file:' ? 'jslab-tex://assets/' :
  new URL('../../lib/texlive-2026-1.4.1/', self.location.href).href;
const assets = library + 'engine/';
let hashes = {};

const networkFetch = self.fetch.bind(self);
const project_root = '/home/web_user/project_dir';
let database;
let pipeline;
let previous_build;

/**
 * Loads the pinned compiler and executes TeX projects in the worker.
 */
class PRDC_JSLAB_LATEX_WASM_WORKER {

  /**
   * Opens the versioned engine asset cache.
   * @returns {Promise<IDBDatabase>} Cache database.
   */
  static openCache() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('jslab-texlive-2026-1.4.1-local', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('assets');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Runs one IndexedDB operation and waits for its transaction to commit.
   * @param {string} store Object store name.
   * @param {string} mode Transaction mode.
   * @param {Function} operation Store operation.
   * @returns {Promise<*>} Operation result.
   */
  static cache(store, mode, operation) {
    if(!database) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(store, mode);
      const result = operation(transaction.objectStore(store));
      transaction.oncomplete = () => resolve(result?.result);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  /**
   * Fetches a compiler asset and verifies its pinned release checksum.
   * @param {string} name Release filename.
   * @returns {Promise<ArrayBuffer>} Asset contents.
   */
  static async loadAsset(name) {
    const stored = await this.cache('assets', 'readonly', store => store.get(name)).catch(() => null);
    if(stored) return stored;
    const response = await networkFetch(assets + name, { credentials: 'omit' });
    if(!response.ok) throw new Error(name + ' (HTTP ' + response.status + ')');
    const bytes = await response.arrayBuffer();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const hex = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
    if(hex !== hashes[name]) throw new Error(name + ' (SHA-256)');
    // The Emscripten package loader persists its preloaded data in IndexedDB.
    if(name !== 'texlive-basic.data') {
      await this.cache('assets', 'readwrite', store => store.put(bytes, name)).catch(() => {});
    }
    return bytes;
  }

  /**
   * Loads a verified release script in the isolated compiler worker.
   * @param {string} name Release filename.
   */
  static async loadScript(name) {
    const url = URL.createObjectURL(new Blob([await this.loadAsset(name)], { type: 'text/javascript' }));
    try {
      importScripts(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Initializes BusyTeX with the basic TeX Live files included with the engine.
   */
  static async initialize() {
    database = await this.openCache().catch(() => null);
    const read = async name => {
      const stored = await this.cache('assets', 'readonly', store => store.get(name)).catch(() => null);
      if(stored) return stored;
      const response = await networkFetch(library + name);
      if(!response.ok) throw Error(name + ' (HTTP ' + response.status + ')');
      const value = await response.json();
      await this.cache('assets', 'readwrite', store => store.put(value, name)).catch(() => {});
      return value;
    };
    hashes = (await read('manifest.json')).engine;
    await this.loadScript('busytex_biber.js');
    await this.loadScript('busytex_pipeline.js');
    const { BusytexPipeline } = self;
    const load = async url => this.loadScript(url.slice(assets.length));
    // The upstream module factory is looked up synchronously by the pipeline.
    await this.loadScript('busytex.js');
    pipeline = new BusytexPipeline(assets + 'busytex.js', assets + 'busytex.wasm', [],
      [assets + 'texlive-basic.js'], [], () => {}, () => {}, true,
      url => url === assets + 'busytex.js' ? Promise.resolve() : load(url),
      assets + 'biber.js', assets + 'biber.wasm', assets + 'biber.data');
    // Emscripten snapshots the environment when the runtime initializes.
    for(const variable of ['TEXINPUTS', 'BIBINPUTS', 'BSTINPUTS']) {
      pipeline.env[variable] = '.:' + project_root + ':';
    }
    await pipeline.Module;
  }

  /**
   * Compiles the saved project and returns the final PDF, log and SyncTeX map.
   * @param {Object} job Project files and compiler settings.
   * @returns {Promise<Object>} Compilation artifacts.
   */
  static async compile({ files: source, project, main, settings }) {
    if(!pipeline) await this.initialize();
    const module = await pipeline.Module;
    const key = JSON.stringify([project, main, settings.engine, Boolean(settings.draft)]);
    const authored = new Set(source.map(file => file.path));
    if(settings.reuse && previous_build?.key === key) {
      source.push(...previous_build.files.filter(file => !authored.has(file.path)));
    }
    previous_build = null;
    const call = module.callMainWithRedirects;
    module.callMainWithRedirects = function(args, verbose) {
      const [command, ...flags] = args;
      if(['pdflatex', 'xelatex', 'luahblatex'].includes(command)) {
        const halt = flags.indexOf('--halt-on-error');
        if(settings.halt === false && halt !== -1) flags.splice(halt, 1);
        flags.unshift('-file-line-error');
        if(settings.draft) {
          const input = flags.pop();
          flags.push('\\AtBeginDocument{\\ifcsname Gin@drafttrue\\endcsname\\setkeys{Gin}{draft}\\fi}\\input{' + input + '}');
          flags.unshift('-jobname=' + input.slice(0, -4));
        }
      }
      return call.call(this, [command, ...flags], verbose);
    };
    const driver = { pdflatex: 'pdftex_bibtex8', xelatex: 'xetex_bibtex8_dvipdfmx', lualatex: 'luahbtex_bibtex8' };
    const engine = Object.hasOwn(driver, settings.engine) ? driver[settings.engine] : driver.pdflatex;
    try {
      const result = await pipeline.compile(source, main, null, null, null, true, 'silent',
        engine, [], null, false);
      if(settings.reuse && result.exit_code === 0) {
        const stem = main.replace(/\.tex$/i, '');
        const files = [];
        for(const extension of ['.aux', '.toc', '.out', '.lof', '.lot', '.bbl']) {
          const path = stem + extension;
          const absolute = project_root + '/' + path;
          if(!authored.has(path) && module.FS.analyzePath(absolute).exists) {
            files.push({ path, contents: module.FS.readFile(absolute) });
          }
        }
        previous_build = { key, files };
      }
      return result;
    } finally {
      module.callMainWithRedirects = call;
    }
  }
}

self.fetch = async (input, options) => {
  const url = String(input);
  const name = url.startsWith(assets) ? url.slice(assets.length) : '';
  if(!Object.hasOwn(hashes, name)) return networkFetch(input, options);
  return new Response(await PRDC_JSLAB_LATEX_WASM_WORKER.loadAsset(name), { headers: {
    'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'
  } });
};

const replyError = error => self.postMessage({ error: String(error?.message || error) });
self.addEventListener('unhandledrejection', event => replyError(event.reason));
self.onmessage = async ({ data }) => {
  try {
    const { pdf, synctex, log, logs, exit_code } = await PRDC_JSLAB_LATEX_WASM_WORKER.compile(data);
    self.postMessage({
      ok: exit_code === 0 && Boolean(pdf?.length), data: pdf, synctex,
      log: logs.findLast(entry => entry.log)?.log || log, output: log
    });
  } catch(error) {
    replyError(error);
  }
};
