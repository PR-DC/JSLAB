/**
 * @file JSLAB LaTeX WebAssembly compiler
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LATEX_SYNCTEX } = require('./latex-synctex');
const wasm_project = '/home/web_user/project_dir/';

/**
 * Runs TeX Live in a cancellable worker and retains its latest SyncTeX map.
 */
class PRDC_JSLAB_LATEX_WASM_COMPILER {

  /**
   * Creates the compiler without loading TeX Live.
   * @param {Object} host Worker factory and project I/O callbacks.
   */
  constructor(host) {
    this.host = host;
  }

  /**
   * Compiles a snapshot and writes its PDF and log through the host.
   * @param {string} main Project-relative main document.
   * @param {Object} settings Compiler preferences.
   * @returns {Promise<Object|null>} Build result.
   */
  async compile(main, settings) {
    if(this.job) return null;
    const job = this.job = {};
    try {
      const snapshot = await this.host.snapshot(main);
      if(job.cancelled) return { cancelled: true };
      if(!snapshot) return null;
      const source_files = [...snapshot.files];
      const source_paths = new Map(source_files.map(file => [file.path, file]));
      // BusyTeX looks for a lowercase .tex suffix when naming its build artifacts.
      const virtual_stem = snapshot.main.slice(0, -4);
      const slash = virtual_stem.lastIndexOf('/') + 1;
      const stem = virtual_stem.slice(0, slash) + virtual_stem.slice(slash).replaceAll('.tex', '.TEX');
      let virtual_main = stem + '.tex';
      if(virtual_main !== snapshot.main) {
        for(let suffix = 1; source_paths.has(virtual_main); suffix++) {
          virtual_main = stem + '-' + suffix + '.tex';
        }
        source_files.push({ path: virtual_main, contents: source_paths.get(snapshot.main).contents });
      }
      const worker = this.worker ||= this.host.createWorker();
      const result = await new Promise((resolve, reject) => {
        job.finish = resolve;
        worker.onmessage = ({ data }) => resolve(data);
        worker.onerror = event => reject(new Error(event.message));
        worker.onmessageerror = () => reject(new Error('BusyTeX'));
        worker.postMessage({ project: snapshot.project, main: virtual_main, files: source_files, settings });
      });
      if(job.cancelled) return { cancelled: true };
      if(result.error) throw new Error(result.error);
      let pages;
      if(this.host.sync && result.ok && result.synctex?.length) {
        try {
          const stream = new Blob([result.synctex]).stream().pipeThrough(new DecompressionStream('gzip'));
          const text = await new Response(stream).text();
          const paths = new Map(Array.from(source_paths.keys(), path => [path, path.replaceAll('/', snapshot.separator)]));
          paths.set(virtual_main, paths.get(snapshot.main));
          const directory = snapshot.main.slice(0, snapshot.main.lastIndexOf('/') + 1);
          const normalize = path => {
            const parts = [];
            for(const part of path.split('/')) {
              if(part === '..') {
                if(!parts.length) return null;
                parts.pop();
              } else if(part && part !== '.') {
                parts.push(part);
              }
            }
            return parts.join('/');
          };
          pages = await PRDC_JSLAB_LATEX_SYNCTEX.parse(text.split(/\r?\n/), path => {
            if(path.startsWith(wasm_project)) return paths.get(normalize(path.slice(wasm_project.length)));
            if(path.startsWith('/')) return;
            return paths.get(normalize(directory + path)) || paths.get(normalize(path));
          });
        } catch(error) {
          console.error(error);
        }
      }
      if(job.cancelled) return { cancelled: true };
      job.committing = true;
      const { synctex, ...build } = result;
      const published = await this.host.publish(snapshot, {
        log: result.log, pdf: result.ok ? result.data : null
      });
      Object.assign(build, published);
      if(result.ok && !published?.pdf) build.ok = false;
      if(build.ok) this.pages = pages;
      // TeX may print absolute paths in its isolated filesystem in diagnostics.
      build.log = build.log.replaceAll(wasm_project, '');
      build.output = build.output.replaceAll(wasm_project, '');
      return build;
    } catch(error) {
      this.stopWorker();
      return { ok: false, output: '! ' + error.message };
    } finally {
      this.job = null;
    }
  }

  /**
   * Terminates the worker, including in-progress downloads and TeX execution.
   */
  stopWorker() {
    this.worker?.terminate();
    this.worker = null;
  }

  /**
   * Cancels the current build, if there is one.
   * @returns {boolean} Whether a build was cancelled.
   */
  cancel() {
    if(!this.job || this.job.committing) return false;
    this.job.cancelled = true;
    this.stopWorker();
    this.job.finish?.(null);
    return true;
  }

  /**
   * Finds the nearest compiled line in the requested source file.
   * @param {string} file Project source path.
   * @param {number} line Source line.
   * @param {number} column Source column.
   * @returns {Object|null} PDF position.
   */
  forward(file, line, column) {
    let nearest = null;
    let distance = Infinity;
    for(const [page, points] of this.pages || []) {
      for(const point of points) {
        if(point.file !== file) continue;
        const score = Math.abs(line - point.line) + (point.column > 0 ? Math.min(0.9, Math.abs(column - point.column) / 100) : 0);
        if(score >= distance) continue;
        distance = score;
        nearest = { page, x: point.left, y: point.baseline, h: point.left, v: point.baseline,
          width: Math.max(1, point.right - point.left), height: point.height || 8 };
      }
    }
    return nearest;
  }

  /**
   * Finds the source corresponding to a point on the rendered PDF.
   * @param {number} page Selected PDF page.
   * @param {number} x Horizontal PDF coordinate.
   * @param {number} y Vertical PDF coordinate.
   * @returns {Object|null} Source position.
   */
  reverse(page, x, y) {
    const points = this.pages?.get(page);
    const text = PRDC_JSLAB_LATEX_SYNCTEX.nearest(points, x, y);
    if(text || !points) return text;
    let nearest = null;
    let distance = Infinity;
    for(const point of points) {
      const score = Math.abs(point.baseline - y) + Math.max(point.left - x, x - point.right, 0);
      if(score < distance) {
        nearest = point;
        distance = score;
      }
    }
    return nearest;
  }
}

exports.PRDC_JSLAB_LATEX_WASM_COMPILER = PRDC_JSLAB_LATEX_WASM_COMPILER;
