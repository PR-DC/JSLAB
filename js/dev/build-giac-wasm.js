/**
 * @file Builds the Giac WebAssembly backend
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const run = promisify(execFile);
const revision = '19a710aea9d528afa272ea582f3283f242e17af3';
const root = path.resolve(__dirname, '../..');

/** Builds Giac with the pinned upstream configuration. */
class PRDC_JSLAB_DEV_BUILD_GIAC_WASM {

  /**
   * Compiles the pinned GeoGebra Giac sources into a lazy runtime factory.
   * Run from a shell with the Emscripten SDK activated.
   */
  static async build() {
    const source = path.resolve(process.argv[2] || path.join(root, 'build', 'giac-source'));
    if(!process.argv[2] && !fs.existsSync(path.join(source, 'src', 'giac', 'cpp', 'gen.cc'))) {
      fs.mkdirSync(source, { recursive: true });
      await run('git', ['init', source]);
      await run('git', ['fetch', '--depth', '1', 'https://github.com/geogebra/giac.git', revision], { cwd: source });
      await run('git', ['checkout', '--detach', 'FETCH_HEAD'], { cwd: source });
    }
    const head = await run('git', ['rev-parse', 'HEAD'], { cwd: source });
    if(head.stdout.trim() !== revision) {
      throw new Error('Expected Giac source revision ' + revision);
    }

    const emsdk = [process.env.EMSDK, path.join(root, 'bin', 'emsdk'), 'C:/github/emsdk']
      .find(folder => folder && fs.existsSync(path.join(folder, 'upstream', 'emscripten', 'em++.py')));
    const emscript = emsdk && path.join(emsdk, 'upstream', 'emscripten', 'em++.py');
    const use_sdk = !process.env.EMXX && process.platform === 'win32' && emscript;
    const compiler = process.env.EMXX || (use_sdk ? 'python' : 'em++');
    const compiler_args = use_sdk ? [emscript] : [];
    const env = { ...process.env };
    if(use_sdk) {
      env.EM_CONFIG ||= path.join(emsdk, '.emscripten');
    }
    const compile = args => run(compiler, compiler_args.concat(args), {
      env,
      maxBuffer: 8 * 1024 * 1024
    });
    const build = path.join(root, 'build');
    fs.mkdirSync(build, { recursive: true });
    const objects = fs.mkdtempSync(path.join(build, 'giac-objects-'));
    const cpp = path.join(source, 'src', 'giac', 'cpp');
    const js = path.join(source, 'src', 'giac.js');
    const options = [
      '-DIN_GIAC', '-DGIAC_GENERIC_CONSTANTS', '-DHAVE_CONFIG_H', '-fwasm-exceptions',
      '-DVERSION="1.23.69823"', '-Dgammaf=tgammaf', '-Oz', '-DHAVE_UNISTD_H',
      '-DGIAC_GGB', '-DTIMEOUT', '-DEMCC2', '-I' + path.join(source, 'src', 'giac', 'headers')
    ];
    const files = fs.readdirSync(cpp).filter(file => file.endsWith('.cc'));
    const output = path.join(build, 'wasm', 'giac');
    const inputs = files.map(file => path.join(objects, file + '.o'));
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(5, os.availableParallelism()) }, async () => {
      while(next < files.length) {
        const index = next++;
        await compile([...options, '-c', path.join(cpp, files[index]), '-o', inputs[index]]);
      }
    }));
    await compile([
      ...inputs, path.join(js, 'prebuilt', 'libmpfr.a'), path.join(js, 'prebuilt', 'libgmp.a'),
      '--js-library', path.join(js, 'js', 'time.js'), '-Oz', '-fwasm-exceptions',
      '-sMODULARIZE=1', '-sEXPORT_NAME=createJslabGiac', '-sENVIRONMENT=web,worker',
      '-sEXPORTED_FUNCTIONS=_caseval', '-sEXPORTED_RUNTIME_METHODS=cwrap',
      '-sALLOW_MEMORY_GROWTH=1', '-sINITIAL_MEMORY=67108864',
      '-o', path.join(objects, 'giac.js')
    ]);
    fs.mkdirSync(output, { recursive: true });
    for(const file of ['giac.js', 'giac.wasm']) {
      fs.copyFileSync(path.join(objects, file), path.join(output, file));
    }
    console.log('Built Giac WebAssembly in ' + output);
  }
}

PRDC_JSLAB_DEV_BUILD_GIAC_WASM.build().catch(error => {
  console.error(error.stderr || error.message);
  process.exitCode = 1;
});
