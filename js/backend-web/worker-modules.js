/**
 * @file CommonJS source modules for the isolated web debugger workspace
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { instrumentWebDebug } = require("./debug-instrument");

/**
 * Loads workspace modules with source maps and the same automatic checkpoints.
 */
class PRDC_JSLAB_WEB_WORKER_MODULES {
  /**
   * Initializes the web worker modules instance.
   * @param {Object} jsl Runtime.
   * @param {Map} files Virtual workspace sources.
   */
  constructor(jsl, files) {
    this.jsl = jsl;
    this.files = files;
    this.cache = new Map();
    this.sequence = 0;
  }

  /**
   * Handles require.
   * @param {string} request Module path.
   * @param {string} [parent] Parent directory or the calling script's directory.
   */
  require(request, parent) {
    const env = this.jsl.inter.env;
    if(!parent) {
      const script = this.jsl.current_script;
      parent = typeof script === 'string' && env.pathIsAbsolute(script) ? env.pathDirName(script) : this.jsl.current_path;
    }
    const path = this.resolve(request, parent);
    if(this.cache.has(path)) {
      return this.cache.get(path).exports;
    }
    const module = { exports: {}, filename: path, loaded: false };
    this.cache.set(path, module);
    try {
      const code = this.files.get(path);
      if(path.endsWith('.json')) {
        module.exports = JSON.parse(code);
      } else {
        let ast;
        try {
          ast = env.recast.parse(code, { sourceFileName: path, parser: {
            parse: source => env.babel_parser.parse(source, { sourceType: 'script', allowReturnOutsideFunction: true, tokens: true })
          } });
        } catch(error) {
          throw Object.assign(new SyntaxError(error.message), { jslab_location: {
            path, line: error.loc?.line || 1, column: (error.loc?.column || 0) + 1
          } });
        }
        instrumentWebDebug(ast, env.recast, this.jsl.internal_jsl_identifier, path);
        this.jsl.inter.eval.source_errors.instrument(ast, env.recast, this.jsl.internal_jsl_identifier, path);
        const printed = env.recast.print(ast, { sourceMapName: path + '.map' });
        const map = Object.assign({}, printed.map, { mappings: ';' + printed.map.mappings });
        const url = 'jslab://modules/' + (++this.sequence) + '.js';
        this.jsl.inter.eval.debug_sources.set(url, { path, map });
        const wrapper = this.jsl._eval('(function(eval) { return function(module, exports, require, __filename, __dirname) {\n' + printed.code +
          '\n}; })(' + this.jsl.internal_jsl_identifier + '._eval)\n//# sourceURL=' + url);
        const dirname = env.pathDirName(path);
        wrapper.call(module.exports, module, module.exports, request => this.require(request, dirname), path, dirname);
      }
      module.loaded = true;
      return module.exports;
    } catch(error) {
      this.cache.delete(path);
      throw error;
    }
  }

  /**
   * Finds a workspace module using script-relative paths and the shared search paths.
   * @param {string} request Module path.
   * @param {string} parent Calling directory.
   * @returns {string} Resolved workspace path.
   */
  resolve(request, parent) {
    const env = this.jsl.inter.env;
    const candidate = env.pathNormalize(env.pathIsAbsolute(request) ? request : env.pathJoin(parent, request));
    const direct = [candidate, candidate + '.js', candidate + '/index.js'].find(file => this.files.has(file));
    if(direct) return direct;
    const resolved = this.jsl.pathResolve(request);
    if(this.files.has(resolved)) return resolved;
    throw Error('Module not found in worker workspace: ' + candidate);
  }

  /**
   * Evicts a workspace module so a subsequent require reloads it.
   * @param {string} request Module path.
   */
  unrequire(request) {
    const env = this.jsl.inter.env;
    const script = this.jsl.current_script;
    const parent = typeof script === 'string' && env.pathIsAbsolute(script) ? env.pathDirName(script) : this.jsl.current_path;
    this.cache.delete(this.resolve(request, parent));
  }

  /**
   * Invalidates cached modules when the source snapshot changes.
   */
  clear() {
    this.cache.clear();
  }
}
exports.PRDC_JSLAB_WEB_WORKER_MODULES = PRDC_JSLAB_WEB_WORKER_MODULES;
