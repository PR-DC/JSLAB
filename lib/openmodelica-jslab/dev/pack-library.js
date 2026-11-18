/**
 * @file OpenModelicaJSLAB pack library integration
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Copies reviewed compiler integration sources into an installed runtime bundle.
 */
class PRDC_OMJSL_LIBRARY_PACKAGER {
  /**
   * Lists regular files beneath one owned library directory.
   * @param {string} directory Directory to inspect.
   * @param {string} [prefix=''] Relative path accumulated during traversal.
   * @returns {Array<string>} Relative file paths.
   */
  static files(directory, prefix = '') {
    return fs.readdirSync(directory, {
      withFileTypes: true
    }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
      const relative = path.join(prefix, entry.name);
      return entry.isDirectory() ? this.files(path.join(directory, entry.name), relative) : [relative];
    });
  }

  /**
   * Copies code, catalogs, styles and vendor dependencies, then refreshes hashes.
   * @param {string} bundle Installed compiler bundle directory.
   * @param {string} [source=__dirname] Editable compiler library root.
   * @returns {Object} Copied file and byte counts.
   */
  static pack(bundle, source = path.resolve(__dirname, '..')) {
    source = path.resolve(source);
    bundle = path.resolve(bundle);
    if(source === bundle || source.startsWith(bundle + path.sep) || bundle.startsWith(source + path.sep)) {
      throw new Error('The compiler library bundle must be separate from its source.');
    }
    const owned = ['js', 'config', 'metadata', 'css', 'vendor', 'dev'];
    const hashes = {};
    let bytes = 0;
    for(const folder of owned) {
      const input = path.join(source, folder);
      const output = path.join(bundle, folder);
      fs.mkdirSync(output, {
        recursive: true
      });
      const names = fs.existsSync(input) ? this.files(input) : [];
      const retained = new Set();
      for(const name of names) {
        if(folder == 'dev' && !['build-web.js', 'pack-library.js'].includes(name)) {
          continue;
        }
        if(!/\.(js|mjs|json|css)$/.test(name) && path.basename(name) != 'LICENSE') {
          continue;
        }
        retained.add(name);
        const content = fs.readFileSync(path.join(input, name));
        const target = path.join(output, name);
        fs.mkdirSync(path.dirname(target), {
          recursive: true
        });
        fs.writeFileSync(target, content);
        bytes += content.length;
      }
      // These directories are packager-owned; remove retired files individually.
      for(const name of this.files(output)) {
        if(!retained.has(name) && !['scene-core.js', 'scene-core.wasm'].includes(name)) {
          fs.unlinkSync(path.join(output, name));
        }
      }
    }
    fs.copyFileSync(path.join(source, 'README.md'), path.join(bundle, 'README.md'));
    const manifest_path = path.join(bundle, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifest_path, 'utf8'));
    manifest.files = {};
    for(const name of this.files(bundle)) {
      if(name == 'manifest.json') {
        continue;
      }
      const key = name.replace(/\\/g, '/');
      const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(bundle, name))).digest('hex');
      manifest.files[key] = hash;
      if(owned.some(folder => key.startsWith(folder + '/'))) {
        hashes[key] = hash;
      }
    }
    manifest.integration = {
      version: 1,
      content_sha256: crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex')
    };
    fs.writeFileSync(manifest_path, JSON.stringify(manifest, null, 2) + '\n');
    return {
      files: Object.keys(hashes).length,
      bytes: bytes
    };
  }
}
exports.PRDC_OMJSL_LIBRARY_PACKAGER = PRDC_OMJSL_LIBRARY_PACKAGER;
exports.packLibrary = PRDC_OMJSL_LIBRARY_PACKAGER.pack.bind(PRDC_OMJSL_LIBRARY_PACKAGER);
if(require.main === module) {
  if(!process.argv[2]) {
    throw new Error('Provide the compiler bundle directory.');
  }
  console.log(JSON.stringify(PRDC_OMJSL_LIBRARY_PACKAGER.pack(process.argv[2])));
}
