/**
 * @file Produces the browser compiler library from a versioned desktop compiler bundle
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const esbuild = require('esbuild');
const { PRDC_OMJSL_LIBRARY_PACKAGER } = require('./pack-library');
/**
 * Class for build web in the compiler library.
 */
class PRDC_OMJSL_BROWSER_PACKAGER {



  /**
   * * * * Calculates the SHA-256 fingerprint used by compiler manifests and caches.
   * @param {*} value Value to inspect or convert.
   */
  static hash(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * * * * Creates browser-ready code, compressed catalogs and their integrity manifest.
   * @param {*} source Original compiler source text.
   * @param {*} destination Destination.
   */
  static async pack(source, destination) {
    source = path.resolve(source);
    destination = path.resolve(destination);
    if(source === destination || source.startsWith(destination + path.sep) || destination.startsWith(source + path.sep)) {
      throw new Error('The browser bundle must be separate from the compiler source bundle.');
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
    const folders = ['js/', 'config/', 'metadata/', 'css/', 'vendor/', 'dev/'];
    for(const [name, expected] of Object.entries(manifest.files)) {
      if(folders.some(folder => name.startsWith(folder)) && this.hash(fs.readFileSync(path.join(source, name))) != expected) {
        throw new Error('The source compiler library file has changed: ' + name);
      }
    }
    fs.cpSync(source, destination, {
      recursive: true,
      filter: file => file != path.join(source, 'dev')
    });
    const code = path.join(source, 'js');
    const output = path.join(destination, 'js');
    const metadata = {};
    for(const name of ['lang.json', ...PRDC_OMJSL_LIBRARY_PACKAGER.files(path.join(source, 'metadata'))]) {
      const relative = name == 'lang.json' ? 'config/' + name : 'metadata/' + name;
      const content = fs.readFileSync(path.join(source, relative));
      fs.writeFileSync(path.join(destination, relative + '.gz'), zlib.gzipSync(content, {
        level: 9
      }));
      fs.unlinkSync(path.join(destination, relative));
      metadata[name] = {
        file: relative + '.gz',
        sha256: this.hash(content)
      };
    }
    await esbuild.build({
      entryPoints: [path.join(code, 'browser-entry.js')],
      outfile: path.join(output, 'browser.js'),
      bundle: true,
      minify: true,
      platform: 'browser',
      format: 'esm',
      target: ['es2022'],
      legalComments: 'eof',
      plugins: [
        {
          name: 'openmodelica-browser-host',
          setup(build) {
            build.onLoad({
              filter: /[\\/]vendor[\\/]moijs[\\/]moparser\.js$/
            }, args => {
              const contents = fs.readFileSync(args.path, 'utf8');
              const trailer = "if (typeof require !== 'undefined' && typeof exports !== 'undefined') {";
              const start = contents.lastIndexOf(trailer);
              if(start < 0 || !contents.slice(start).includes('exports.main = function commonjsMain(args)')) {
                throw new Error('Review the vendor parser browser export before upgrading it.');
              }
              // Replace the generated parser's Node CLI wrapper only in browser output.
              return {
                contents: contents.slice(0, start) + '\nmodule.exports = { parser: moparser, Parser: moparser.Parser, ' + 'parse: function() { return moparser.parse.apply(moparser, arguments); } };\n',
                loader: 'js'
              };
            });
            build.onResolve({
              filter: /^\.\/(assets|host-electron)(?:\.js)?$/
            }, args => {
              if(path.resolve(args.resolveDir) == code) {
                return {
                  path: path.join(code, args.path.includes('assets') ? 'assets-web.js' : 'host-web.js')
                };
              }
            });
          }
        }
      ]
    });
    const keep = new Set(['browser.js', 'worker.js', 'resource-cache.js', 'scene.js']);
    for(const name of PRDC_OMJSL_LIBRARY_PACKAGER.files(output)) {
      if(!keep.has(name)) {
        fs.unlinkSync(path.join(output, name));
      }
    }
    fs.unlinkSync(path.join(destination, 'vendor/moijs/moparser.js'));
    const hashes = {};
    manifest.files = {};
    for(const name of PRDC_OMJSL_LIBRARY_PACKAGER.files(destination)) {
      if(name == 'manifest.json') {
        continue;
      }
      const key = name.replace(/\\/g, '/');
      manifest.files[key] = this.hash(fs.readFileSync(path.join(destination, name)));
      if(folders.some(folder => key.startsWith(folder))) {
        hashes[key] = manifest.files[key];
      }
    }
    manifest.integration = {
      version: 1,
      content_sha256: this.hash(JSON.stringify(hashes)),
      web: {
        entry: 'js/browser.js',
        metadata: metadata
      }
    };
    fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    return {
      metadata: Object.keys(metadata).length,
      library_files: Object.keys(hashes).length
    };
  }

}
exports.PRDC_OMJSL_BROWSER_PACKAGER = PRDC_OMJSL_BROWSER_PACKAGER;
exports.packWebLibrary = PRDC_OMJSL_BROWSER_PACKAGER.pack.bind(PRDC_OMJSL_BROWSER_PACKAGER);
if(require.main === module) {
  if(!process.argv[2] || !process.argv[3]) {
    throw new Error('Provide source and browser bundle directories.');
  }
  PRDC_OMJSL_BROWSER_PACKAGER.pack(process.argv[2], process.argv[3]).then(result => console.log(JSON.stringify(result))).catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}
