/**
 * @file CommonJS source modules for the isolated web debugger workspace
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { instrumentWebDebug } = require('../sandbox/jslab-web-debug-instrument');

/** Loads workspace modules with source maps and the same automatic checkpoints. */
class PRDC_JSLAB_WEB_WORKER_MODULES {
  /** @param {Object} jsl Runtime. @param {Map} files Virtual workspace sources. */
  constructor(jsl, files) {
    this.jsl = jsl;
    this.files = files;
    this.cache = new Map();
    this.sequence = 0;
  }

  /** @param {string} request Module path. @param {string} [parent='/workspace/'] Parent directory. */
  require(request, parent = '/workspace/') {
    const env = this.jsl.inter.env;
    let path = env.pathNormalize(request.startsWith('/') ? request : env.pathJoin(parent, request));
    if(!this.files.has(path) && this.files.has(path + '.js')) path += '.js';
    if(!this.files.has(path) && this.files.has(path + '/index.js')) path += '/index.js';
    if(!this.files.has(path)) throw Error('Module not found in worker workspace: ' + path);
    if(this.cache.has(path)) return this.cache.get(path).exports;
    const module = { exports: {}, filename: path, loaded: false };
    this.cache.set(path, module);
    try {
      const code = this.files.get(path);
      if(path.endsWith('.json')) module.exports = JSON.parse(code);
      else {
        let ast;
        try {
          ast = env.recast.parse(code, { sourceFileName: path, parser: {
            parse: source => env.babel_parser.parse(source, { sourceType: 'script', allowReturnOutsideFunction: true })
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
        const wrapper = this.jsl._eval('(function(module, exports, require) {\n' + printed.code +
          '\n})\n//# sourceURL=' + url);
        wrapper.call(module.exports, module, module.exports, request => this.require(request, env.pathDirName(path)));
      }
      module.loaded = true;
      return module.exports;
    } catch(error) {
      this.cache.delete(path);
      throw error;
    }
  }

  /** Invalidates cached modules when the source snapshot changes. */
  clear() { this.cache.clear(); }
}
exports.PRDC_JSLAB_WEB_WORKER_MODULES = PRDC_JSLAB_WEB_WORKER_MODULES;
