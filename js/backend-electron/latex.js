/**
 * @file JSLAB local LaTeX toolchain and project files
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { PRDC_JSLAB_LATEX_NATIVE_SYNCTEX } = require('./latex-synctex');
const { latex_source: source, latex_asset_types: asset_types, PRDC_JSLAB_LATEX_PROJECT_FILES } = require('../other-shared/latex-project-files');
const { PRDC_JSLAB_LATEX_COMPILER } = require('../other-shared/latex-compiler');

const engines = { pdflatex: '-pdf', xelatex: '-xelatex', lualatex: '-lualatex' };

/**
 * Owns the local project and its compiler processes.
 */
class PRDC_JSLAB_LATEX {

  /**
   * Initializes the compiler service.
   * @param {Function} [onLog] Receives compiler log output.
   */
  constructor(onLog = () => {}) {
    this.onLog = onLog;
  }

  /**
   * Compiles a document for the workspace and saves its PDF beside the source.
   * @param {string} file Absolute TeX source path.
   * @param {string} [configured] User-selected toolchain directory.
   * @param {Function} [fallback] Prepares a WebAssembly build if native TeX is unavailable.
   * @returns {Promise<Object>} Build outcome, log and PDF path on success.
   */
  static async compileFile(file, configured, fallback) {
    let log = '';
    const latex = new PRDC_JSLAB_LATEX(value => { log = (log + value).slice(-1000000); });
    const project = await latex.open(file);
    if(!project) return { ok: false, missing: [], log };
    const target = await latex.resolve(project.main);
    if(!target) return { ok: false, missing: [], log };
    const native = await latex.detect(configured);
    const { missing } = native;
    if(PRDC_JSLAB_LATEX_COMPILER.lookup(native, native.engine).wasm) {
      return fallback ? fallback(latex, project.main) : { ok: false, missing, log };
    }
    try {
      const result = await latex.compile(project.main, undefined, true);
      if(!result?.ok) return { ok: false, missing, log: result?.log || log };
      const pdf = target.slice(0, -4) + '.pdf';
      return { ok: true, pdf, missing, log: result.log || log };
    } finally {
      await latex.clearPreview();
    }
  }

  /**
   * Reads a project's saved files for the WebAssembly compiler.
   * @param {string} file Main source relative to the project.
   * @returns {Promise<Object|null>} Project snapshot.
   */
  async snapshot(file) {
    const root = this.root;
    const target = await this.resolve(file);
    if(!target || !/\.tex$/i.test(target) || this.root !== root) return null;
    const relative = path.relative(root, target);
    return PRDC_JSLAB_LATEX_PROJECT_FILES.snapshot(this, { root, target, main: relative, separator: path.sep }, async name => {
      const candidate = path.join(root, name);
      if(this.root !== root || !(await fs.lstat(candidate).catch(() => null))?.isFile()) return null;
      const absolute = await this.resolvePath(candidate);
      return absolute ? new Uint8Array(await fs.readFile(absolute)) : null;
    });
  }

  /**
   * Publishes WebAssembly output beside the selected TeX source.
   * @param {string} target Canonical main source path from the snapshot.
   * @param {Object} output Compiler log and optional PDF bytes.
   * @param {boolean} [list] Whether to return the editor project listing.
   * @returns {Promise<Object|null>} PDF path and optional refreshed listing.
   */
  async publish(target, output, list = false) {
    if(!target || await this.resolve(target) !== target) return null;
    const result = await PRDC_JSLAB_LATEX_PROJECT_FILES.publish(target, output, async (file, data) => {
      const temporary = path.join(path.dirname(file), '.jslab-latex-' + randomUUID());
      try {
        await fs.writeFile(temporary, data, { flag: 'wx' });
        await fs.rename(temporary, file);
      } finally {
        await fs.rm(temporary, { force: true });
      }
    });
    return result && { ...result, project: list ? await this.scan() : undefined };
  }

  /**
   * Copies a completed build artifact with an atomic destination update.
   * @param {string} source Absolute path to the artifact in the build directory.
   * @param {string} destination Absolute output path.
   */
  async copyOutput(source, destination) {
    const temporary = path.join(path.dirname(destination), '.jslab-latex-' + randomUUID());
    try {
      await fs.copyFile(source, temporary);
      await fs.rename(temporary, destination);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  /**
   * Opens a project directory and selects its main TeX document if present.
   * @param {string} target Project directory or main source file.
   * @param {string} [main_file] Main source path inside the project.
   * @returns {Promise<Object|null>} Project files, directory tree and main document.
   */
  async open(target, main_file) {
    const stat = await fs.stat(target).catch(() => null);
    if(!stat || (!stat.isDirectory() && !stat.isFile())) return null;
    const folder = stat.isDirectory();
    const root = await fs.realpath(folder ? target : path.dirname(target));
    const { tree, files } = await this.scan(root);
    const requested = main_file ? path.relative(root, path.resolve(root, main_file)) : !folder ? path.basename(target) : null;
    const main = PRDC_JSLAB_LATEX_PROJECT_FILES.chooseMain(files, requested);
    if(main === false) return null;
    await this.clearPreview();
    this.root = root;
    this.main = main;
    return { root, name: path.basename(root) || root, files, main, tree };
  }

  /**
   * Lists folders, editable sources, previewable assets and other project files.
   * @param {string} root Project directory.
   * @returns {Promise<Object>} File tree and editable paths.
   */
  scan(root = this.root) {
    return PRDC_JSLAB_LATEX_PROJECT_FILES.scan(directory =>
      fs.readdir(path.join(root, directory), { withFileTypes: true }), path.sep);
  }

  /**
   * Resolves a path and rejects paths outside the selected project.
   * @param {string} file Relative or absolute project path.
   * @returns {Promise<string|null>} Canonical path.
   */
  async resolvePath(file) {
    if(!this.root || typeof file !== 'string') return null;
    const absolute = await fs.realpath(path.resolve(this.root, file)).catch(() => null);
    if(!absolute) return null;
    const relative = path.relative(this.root, absolute);
    if(path.isAbsolute(relative) || relative.split(path.sep)[0] === '..') return null;
    return absolute;
  }

  /**
   * Resolves an editable TeX project file.
   * @param {string} file Project source path.
   * @returns {Promise<string|null>} Canonical source path.
   */
  async resolve(file) {
    if(!source.test(file)) return null;
    const absolute = await this.resolvePath(file);
    return absolute && (await fs.stat(absolute).catch(() => null))?.isFile() ? absolute : null;
  }

  /**
   * Reads a supported project asset for the editor preview.
   * @param {string} file Project-relative asset path.
   * @returns {Promise<Object|null>} File type and bytes.
   */
  async readAsset(file) {
    const absolute = await this.resolvePath(file);
    const type = absolute && asset_types[path.extname(absolute).toLowerCase()];
    if(!type || !(await fs.stat(absolute).catch(() => null))?.isFile()) return null;
    return { type, data: new Uint8Array(await fs.readFile(absolute)) };
  }

  /**
   * Reads a project source file as UTF-8.
   * @param {string} file Project-relative source path.
   * @returns {Promise<string|null>} Source contents.
   */
  async read(file) {
    const absolute = await this.resolve(file);
    return absolute ? fs.readFile(absolute, 'utf8') : null;
  }

  /**
   * Saves a source document in the current project.
   * @param {string} file Project-relative source path.
   * @param {string} value Source contents.
   * @returns {Promise<boolean>} Whether the source was saved.
   */
  async save(file, value) {
    const absolute = await this.resolve(file);
    if(!absolute) return false;
    const temporary = path.join(path.dirname(absolute), '.jslab-latex-' + randomUUID());
    const { mode } = await fs.stat(absolute);
    try {
      await fs.writeFile(temporary, value, { encoding: 'utf8', flag: 'wx', mode });
      await fs.rename(temporary, absolute);
    } finally {
      await fs.rm(temporary, { force: true });
    }
    return true;
  }

  /**
   * Builds the ordered native toolchain search path from configured, inherited
   * and standard Windows installation directories.
   * @param {string} [configured] User-selected toolchain directory.
   * @param {Object} [environment=process.env] Process environment.
   * @returns {Object} Environment PATH key and unique absolute directories.
   */
  toolchainDirectories(configured, environment = process.env) {
    const windows = process.platform === 'win32';
    const path_key = Object.keys(environment).find(key => key.toUpperCase() === 'PATH') || 'PATH';
    const local = environment.LOCALAPPDATA;
    const program = environment.ProgramFiles;
    const program_x86 = environment['ProgramFiles(x86)'];
    const discovered = windows ? [
      local && path.join(local, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64'),
      local && path.join(local, 'Programs', 'MiKTeX', 'miktex', 'bin'),
      local && path.join(local, 'MiKTeX', 'miktex', 'bin', 'x64'),
      program && path.join(program, 'MiKTeX', 'miktex', 'bin', 'x64'),
      program && path.join(program, 'MiKTeX', 'miktex', 'bin'),
      program_x86 && path.join(program_x86, 'MiKTeX', 'miktex', 'bin'),
      local && path.join(local, 'Programs', 'Git', 'usr', 'bin'),
      program && path.join(program, 'Git', 'usr', 'bin'),
      program_x86 && path.join(program_x86, 'Git', 'usr', 'bin')
    ] : [];
    const seen = new Set();
    const dirs = [configured, ...(environment[path_key] || '').split(path.delimiter), ...discovered]
      .filter(dir => {
        if(!dir || !path.isAbsolute(dir)) return false;
        const key = windows ? path.normalize(dir).toLowerCase() : path.normalize(dir);
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return { path_key, dirs };
  }

  /**
   * Probes the TeX executables and the latexmk launcher's Perl support.
   * @param {string} [configured] User-selected toolchain directory.
   * @param {string} [engine_name] Requested TeX engine.
   * @returns {Promise<Object>} Engine version and missing or unusable tools.
   */
  async detect(configured, engine_name = 'pdflatex') {
    const { engine } = PRDC_JSLAB_LATEX_COMPILER.preferences({ engine: engine_name });
    const tools = { latexmk: ['-v'], [engine]: ['--version'], synctex: ['help', 'edit'] };
    const windows = process.platform === 'win32';
    const { path_key, dirs } = this.toolchainDirectories(configured);
    const env = { ...process.env, [path_key]: dirs.join(path.delimiter), NoDefaultCurrentDirectoryInExePath: '1' };
    for(const key of Object.keys(env)) {
      if(/^(SYNCTEX_EDITOR|SYNCTEX_VIEWER|LATEXMKRC)$/i.test(key)) delete env[key];
    }
    const bin = {};
    let miktex = false;
    let version = '';
    const available = await Promise.all(Object.entries(tools).map(async ([name, args]) => {
      for(const dir of new Set(dirs)) {
        const filename = path.join(dir, name + (windows ? '.exe' : ''));
        if(!(await fs.stat(filename).catch(() => null))?.isFile()) continue;
        const result = await this.run(filename, args, { env, cwd: os.tmpdir() }, 5000);
        if(result.code === 0 || (name === 'synctex' && /synctex edit:/i.test(result.output))) {
          bin[name] = filename;
          if(name === engine) {
            version = result.output.split(/\r?\n/).find(line => /(?:pdfTeX|XeTeX|Lua(?:HB)?TeX)/i.test(line)) || '';
            miktex = /MiKTeX/i.test(version);
          }
          return true;
        }
      }
      return false;
    }));
    this.toolchain = available.every(Boolean) ? { bin, env, miktex } : null;
    return { engine, version, missing: Object.keys(tools).filter((name, i) => !available[i]) };
  }

  /**
   * Runs a tool with a bounded log and optional streamed output.
   * @param {string} filename Executable path.
   * @param {string[]} args Executable arguments.
   * @param {Object} options Child process options.
   * @param {number} timeout Process deadline in milliseconds.
   * @param {boolean} stream Whether to stream the active build log.
   * @returns {Promise<Object>} Exit code and captured output.
   */
  run(filename, args, options, timeout, stream = false) {
    return new Promise(resolve => {
      const child = spawn(filename, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
      if(stream) this.child = child;
      let output = '';
      let drain;
      const append = data => {
        const value = data.toString();
        output = (output + value).slice(-1000000);
        if(stream) this.onLog(value);
      };
      const timer = setTimeout(() => this.terminate(child), timeout);
      const finish = code => {
        clearTimeout(timer);
        clearTimeout(drain);
        if(this.child === child) this.child = null;
        resolve({ code, output });
      };
      child.stdout.setEncoding('utf8').on('data', append);
      child.stderr.setEncoding('utf8').on('data', append);
      child.on('error', append);
      child.once('close', finish);
      if(stream) child.once('exit', code => {
        // A tool may leave a helper holding a pipe handle after it has exited.
        drain = setTimeout(() => {
          child.stdout.destroy();
          child.stderr.destroy();
          finish(code);
        }, 250);
      });
    });
  }

  /**
   * Terminates the build process and its descendants.
   * @param {Object} child Compiler child process.
   */
  terminate(child) {
    if(!child?.pid || child.exitCode !== null) return;
    if(process.platform === 'win32') {
      child.kill();
    } else {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill(); }
    }
  }

  /**
   * Requests cancellation of the current build.
   */
  cancel() {
    if(!this.building) return;
    this.cancelled = true;
    this.terminate(this.child);
  }

  /**
   * Builds a saved project and publishes its matching PDF and SyncTeX files.
   * @param {string} file Project-relative main document.
   * @param {Object} [options] Engine, draft mode and build preferences.
   * @param {boolean} [save_outputs=false] Save the PDF and log beside the main document.
   * @returns {Promise<Object|null>} Build result and PDF bytes on success.
   */
  async compile(file, options, save_outputs = false) {
    if(this.building || !this.toolchain) return null;
    this.building = true;
    this.cancelled = false;
    let dir;
    let published;
    let succeeded = false;
    try {
      const main = await this.resolve(file);
      if(this.cancelled) return { ok: false, cancelled: true };
      if(!main || !/\.tex$/i.test(main)) return null;
      const { bin, env, miktex } = this.toolchain;
      const settings = PRDC_JSLAB_LATEX_COMPILER.preferences(options);
      const build_env = { ...env };
      if(process.platform === 'win32') {
        // Keep native paths available to MiKTeX's bibliography tools when
        // latexmk runs under Git Perl and changes to the auxiliary directory.
        const root = this.root.replaceAll('\\', '/');
        for(const key of ['BIBINPUTS', 'BSTINPUTS']) {
          build_env[key] = root + ';' + (env[key] || '');
        }
      }
      const no_installer = miktex ? ' --disable-installer' : '';
      const engine = bin[settings.engine]?.replaceAll('\\', '/');
      if(!engine || /["%\x60$\r\n]/.test(engine)) return null;
      const key = JSON.stringify([main, engine, settings.draft, settings.halt]);
      if(this.build_cache && (!settings.reuse || this.build_cache.key !== key)) {
        await this.removeBuild(this.build_cache.dir);
        this.build_cache = null;
      }
      dir = this.build_cache?.dir || await fs.mkdtemp(path.join(os.tmpdir(), 'jslab-latex-'));
      const rc = path.join(dir, 'jslab-build.rc');
      // latexmk's Windows launcher reparses quotes in -pdflatex arguments.
      const command = '"' + engine + '"' + no_installer + ' -no-shell-escape %O ' + (settings.draft ? '%P' : '%S');
      const preamble = settings.draft ?
        "$pre_tex_code = '\\AtBeginDocument{\\ifcsname Gin@drafttrue\\endcsname\\setkeys{Gin}{draft}\\fi}';\n" : '';
      await fs.writeFile(rc, '$' + settings.engine + " = '" + command.replaceAll("'", "\\'") + "';\n" + preamble);
      if(this.cancelled) return { ok: false, cancelled: true };
      const result = await this.build(bin.latexmk, [
        '-norc', '-r', rc, engines[settings.engine], '-synctex=1', '-interaction=nonstopmode', '-file-line-error',
        ...(settings.halt ? ['-halt-on-error'] : []),
        '-outdir=' + dir, './' + path.relative(this.root, main).split(path.sep).join('/')
      ], { cwd: this.root, env: build_env, detached: process.platform !== 'win32' }, dir);
      const stem = path.join(dir, path.basename(main, path.extname(main)));
      const pdf = stem + '.pdf';
      const sync = stem + '.synctex.gz';
      if(this.cancelled) return { ok: false, cancelled: true };
      const log_file = stem + '.log';
      const transcript = await fs.open(log_file, 'r').catch(() => null);
      let log = '';
      if(transcript) {
        try {
          const { size } = await transcript.stat();
          const tail = Buffer.alloc(Math.min(size, 1000000));
          const { bytesRead } = await transcript.read(tail, 0, tail.length, size - tail.length);
          log = tail.toString('utf8', 0, bytesRead);
        } finally {
          await transcript.close();
        }
      }
      if(this.cancelled) return { ok: false, cancelled: true };
      const output_stem = main.slice(0, -path.extname(main).length);
      if(save_outputs && transcript) await this.copyOutput(log_file, output_stem + '.log');
      if(this.cancelled) return { ok: false, cancelled: true };
      if(result.code !== 0) return { ok: false, log, output: result.output };
      const [data] = await Promise.all([fs.readFile(pdf), fs.access(sync)]);
      if(this.cancelled) return { ok: false, cancelled: true };
      const previous = this.preview;
      let preview_pdf = pdf;
      if(settings.reuse) {
        published = await fs.mkdtemp(path.join(os.tmpdir(), 'jslab-latex-'));
        preview_pdf = path.join(published, path.basename(pdf));
        await Promise.all([fs.writeFile(preview_pdf, data), fs.copyFile(sync, preview_pdf.slice(0, -4) + '.synctex.gz')]);
        if(this.cancelled) return { ok: false, cancelled: true };
      }
      if(save_outputs) await this.copyOutput(pdf, output_stem + '.pdf');
      if(settings.reuse) this.build_cache = { key, dir };
      this.preview = { dir: published || dir, pdf: preview_pdf };
      succeeded = true;
      if(previous) void this.removeBuild(previous.dir);
      return { ok: true, data: new Uint8Array(data), log, output: result.output };
    } finally {
      this.building = false;
      if(!succeeded && this.build_cache?.dir === dir) this.build_cache = null;
      if(dir && this.preview?.dir !== dir && this.build_cache?.dir !== dir) await this.removeBuild(dir);
      if(published && !succeeded) await this.removeBuild(published);
    }
  }

  /**
   * Starts latexmk in a cancellable process group.
   * @param {string} executable latexmk path.
   * @param {string[]} args Compiler arguments.
   * @param {Object} options Child process options.
   * @param {string} dir Build directory.
   * @returns {Promise<Object>} Exit code and output.
   */
  async build(executable, args, options, dir) {
    if(process.platform === 'win32') {
      const request = path.join(dir, 'jslab-build.json');
      await fs.writeFile(request, JSON.stringify({ executable, args }));
      if(this.cancelled) return { code: null };
      executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
        path.join(__dirname, 'latex-build.ps1'), '-Request', request];
    }
    return this.run(executable, args, options, 120000, true);
  }

  /**
   * Removes a temporary build directory created by this service.
   * @param {string} dir Temporary build directory.
   */
  async removeBuild(dir) {
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }

  /**
   * Releases the current preview and its auxiliary files.
   */
  async clearPreview() {
    const previous = this.preview;
    const cache = this.build_cache;
    this.preview = null;
    this.build_cache = null;
    await Promise.all([previous, cache].filter(Boolean).map(item => this.removeBuild(item.dir)));
  }

  /**
   * Finds a project source position in the compiled PDF.
   * @param {string} file Project-relative source path.
   * @param {number} line One-based line.
   * @param {number} column One-based column.
   * @returns {Promise<Object|null>} Page and box coordinates.
   */
  async forward(file, line, column) {
    const input = await this.resolve(file);
    if(!input || !Number.isInteger(line) || !Number.isInteger(column)) return null;
    const result = await this.query('view', '-i', line + ':' + column + ':' + input);
    if(!result) return null;
    const page = Number(result.Page);
    const [x, y, h, v, width, height] = ['x', 'y', 'h', 'v', 'W', 'H'].map(key => Number(result[key]));
    if(!Number.isInteger(page) || ![x, y].every(Number.isFinite)) return null;
    return { page, x, y, h, v, width, height };
  }

  /**
   * Finds the editable source nearest to a point on a PDF page.
   * @param {number} page One-based page.
   * @param {number} x Horizontal coordinate in PDF points.
   * @param {number} y Vertical coordinate in PDF points.
   * @returns {Promise<Object|null>} Source file, line and column.
   */
  async reverse(page, x, y) {
    if(!Number.isInteger(page) || page < 1 || ![x, y].every(Number.isFinite)) return null;
    const preview = this.preview;
    if(!preview || this.building) return null;
    preview.text_positions ||= PRDC_JSLAB_LATEX_NATIVE_SYNCTEX.read(preview.pdf.slice(0, -4) + '.synctex.gz', this.root)
      .catch(() => null);
    const pages = await preview.text_positions;
    if(this.preview !== preview || this.building) return null;
    const text = PRDC_JSLAB_LATEX_NATIVE_SYNCTEX.nearest(pages?.get(page), x, y);
    if(text) {
      const input = await this.resolve(text.file);
      if(input) return { file: path.relative(this.root, input), line: text.line, column: text.column };
    }
    const result = await this.query('edit', '-o', [page, x.toFixed(3), y.toFixed(3), this.preview?.pdf].join(':'));
    if(!result?.Input) return null;
    const input = await this.resolve(result.Input);
    const line = Number(result.Line);
    if(!input || !Number.isInteger(line) || line < 1) return null;
    return { file: path.relative(this.root, input), line, column: Number(result.Column) };
  }

  /**
   * Runs a SyncTeX query against the current preview.
   * @param {string} command SyncTeX subcommand.
   * @param {string} flag Query argument flag.
   * @param {string} value Encoded query argument.
   * @returns {Promise<Object|null>} First reported match.
   */
  async query(command, flag, value) {
    if(!this.preview || this.building || !this.toolchain) return null;
    const { bin, env } = this.toolchain;
    const args = [command, flag, value];
    if(command === 'view') args.push('-o', this.preview.pdf);
    const { output } = await this.run(bin.synctex, args, { env, cwd: this.root }, 5000);
    const block = /SyncTeX result begin\s*([\s\S]*?)SyncTeX result end/.exec(output)?.[1];
    if(!block) return null;
    const result = {};
    for(const [, key, value] of block.matchAll(/^([A-Za-z]+):(.*)$/gm)) {
      if(key === 'Output' && result.Output) break;
      result[key] = value.trim();
    }
    return result;
  }
}

exports.PRDC_JSLAB_LATEX = PRDC_JSLAB_LATEX;
