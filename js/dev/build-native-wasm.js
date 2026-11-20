/**
 * @file Builds the shared JSLAB numerical and geometry WebAssembly backend
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for dev build native wasm operations.
 */
class PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER {

  /**
   * Ensures a directory exists.
   * @param {string} dir_path
   */
  static ensureDirectory(dir_path) {
    fs.mkdirSync(dir_path, { recursive: true });
  }

  /**
   * Copies a file while creating parent directories.
   * @param {string} from_path
   * @param {string} to_path
   */
  static copyFile(from_path, to_path) {
    PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.ensureDirectory(path.dirname(to_path));
    fs.copyFileSync(from_path, to_path);
  }

  /**
   * Reads a command line flag value.
   * @param {string} flag_name
   * @returns {(string|boolean|undefined)}
   */
  static getArgValue(flag_name) {
    var index = process.argv.indexOf(flag_name);
    if(index < 0) {
      return undefined;
    }
    if(index == process.argv.length - 1) {
      return true;
    }
    var next = process.argv[index + 1];
    if(typeof next == 'string' && next.startsWith('--')) {
      return true;
    }
    return next;
  }

  /**
   * Resolves the default emsdk root.
   * @returns {(string|false)}
   */
  static getEmsdkRoot() {
    var candidates = [
      process.env.EMSDK,
      path.join(app_root, 'bin', 'emsdk'),
      'C:\\github\\emsdk'
    ];
    var i;

    for(i = 0; i < candidates.length; i++) {
      if(typeof candidates[i] == 'string' && candidates[i].length &&
          fs.existsSync(path.join(candidates[i], '.emscripten'))) {
        return candidates[i];
      }
    }
    return false;
  }

  /**
   * Resolves an Emscripten compiler command.
   * @param {string} tool_name
   * @param {string} env_name
   * @returns {Object}
   */
  static getEmscriptenTool(tool_name, env_name) {
    var emsdk_root;
    var tool_path;

    if(typeof process.env[env_name] == 'string' && process.env[env_name].length) {
      return {
        command: process.env[env_name],
        args_prefix: [],
        env: Object.assign({}, process.env)
      };
    }

    emsdk_root = PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.getEmsdkRoot();
    if(emsdk_root) {
      tool_path = path.join(emsdk_root, 'upstream', 'emscripten', tool_name + '.py');
      if(fs.existsSync(tool_path)) {
        return {
          command: 'python',
          args_prefix: [tool_path],
          env: Object.assign({}, process.env, {
            EM_CONFIG: path.join(emsdk_root, '.emscripten'),
            PYTHONPATH: path.join(emsdk_root, 'upstream', 'emscripten')
          })
        };
      }
    }

    return {
      command: tool_name,
      args_prefix: [],
      env: Object.assign({}, process.env)
    };
  }

  /**
   * Runs an Emscripten compiler command.
   * @param {string} tool_name
   * @param {string} env_name
   * @param {Array<string>} args
   * @returns {Object}
   */
  static runEmscripten(tool_name, env_name, args) {
    var tool = PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.getEmscriptenTool(tool_name, env_name);
    return cp.spawnSync(tool.command, tool.args_prefix.concat(args), {
      cwd: app_root,
      encoding: 'utf8',
      stdio: 'pipe',
      env: tool.env
    });
  }

  /**
   * Checks whether emcc is available.
   * @returns {boolean}
   */
  static hasEmcc() {
    var result = PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.runEmscripten('emcc', 'EMCC', ['--version']);
    return !!(result && result.status === 0);
  }

  /**
   * Compiles the native_module wasm bundle.
   */
  static buildNativeModuleWasm() {
    var source_file = path.join(app_root, 'cpp', 'native-module-wasm.cpp');
    var output_file = path.join(build_root, 'native_module.js');
    var args = [
      source_file,
      '-O3',
      '-msimd128',
      '-std=c++17',
      '-I' + path.join(app_root, 'lib', 'eigen-3.4.0'),
      '-s', 'WASM=1',
      '-s', 'ALLOW_MEMORY_GROWTH=1',
      '-s', 'MODULARIZE=1',
      '-s', 'SINGLE_FILE=1',
      '-s', 'WASM_ASYNC_COMPILATION=0',
      '-s', 'EXPORT_NAME=PRDC_JSLAB_NATIVE_MODULE_FACTORY',
      '-s', 'EXPORTED_RUNTIME_METHODS=["HEAPF64"]',
      '-s', 'EXPORTED_FUNCTIONS=["_malloc","_free","_nm_roots","_nm_cumtrapz","_nm_trapz"]',
      '-o', output_file
    ];
    PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.buildBundle(args, output_file, 'native_module');
  }

  /**
   * Compiles the alpha_shape_3d wasm bundle.
   */
  static buildAlphaShape3DWasm() {
    var source_file = path.join(app_root, 'cpp', 'alpha-shape-3d-wasm.cpp');
    var output_file = path.join(build_root, 'alpha_shape_3d.js');
    var args = [
      source_file,
      '-O3',
      '-msimd128',
      '-std=c++17',
      '-frounding-math',
      '-Wno-deprecated-literal-operator',
      '-I' + path.join(app_root, 'lib', 'cgal-6.0.1', 'include'),
      '-I' + path.join(app_root, 'lib', 'boost-1.86.0'),
      '-DCGAL_NO_GMP=1',
      '-DCGAL_NO_MPFR=1',
      '-DCGAL_NO_CORE=1',
      '-DCGAL_ALWAYS_ROUND_TO_NEAREST=1',
      '-s', 'WASM=1',
      '-s', 'ALLOW_MEMORY_GROWTH=1',
      '-s', 'MODULARIZE=1',
      '-s', 'SINGLE_FILE=1',
      '-s', 'WASM_ASYNC_COMPILATION=0',
      '-s', 'EXPORT_NAME=PRDC_JSLAB_ALPHA_SHAPE_3D_FACTORY',
      '-s', 'DISABLE_EXCEPTION_CATCHING=0',
      '-s', 'EXPORT_EXCEPTION_HANDLING_HELPERS=1',
      '-s', 'EXPORTED_RUNTIME_METHODS=["getExceptionMessage","decrementExceptionRefcount"]',
      '-lembind',
      '-o', output_file
    ];
    PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.buildBundle(args, output_file, 'alpha_shape_3d');
  }

  /**
   * Writes the generated manifest.
   */
  static writeManifest() {
    var manifest = {
      version: String(package_json.version || ''),
      generated_at: new Date().toISOString(),
      targets: {
        native_module: {
          available: fs.existsSync(path.join(bundle_root, 'native_module.js')),
          entry: 'native_module.js',
          format: 'emscripten-single-file'
        },
        alpha_shape_3d: {
          available: fs.existsSync(path.join(bundle_root, 'alpha_shape_3d.js')),
          entry: 'alpha_shape_3d.js',
          format: 'emscripten-single-file'
        }
      }
    };

    PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.ensureDirectory(bundle_root);
    fs.writeFileSync(
      path.join(bundle_root, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
  }

  /**
   * Main entry point.
   */
  static main() {
    var skip_if_missing = process.argv.includes('--if-available');
    var target = PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.getArgValue('--target');

    if(target && target !== true &&
        target !== 'native_module' &&
        target !== 'alpha_shape_3d' &&
        target !== 'all') {
      throw new Error('Unsupported wasm native addon target: ' + target);
    }

    if(!PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.hasEmcc()) {
      if(skip_if_missing) {
        console.log('Skipping native wasm build because emcc is not available.');
        return;
      }
      throw new Error('emcc is not available. Install Emscripten or set EMCC.');
    }

    PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.ensureDirectory(build_root);
    PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.ensureDirectory(bundle_root);

    if(!target || target === true || target === 'all' || target === 'native_module') {
      PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.buildNativeModuleWasm();
    }
    if(!target || target === true || target === 'all' || target === 'alpha_shape_3d') {
      PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.buildAlphaShape3DWasm();
    }
    PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.writeManifest();

    console.log('Built native wasm bundles in ' + bundle_root);
  }

  /**
   * Compiles a configured WebAssembly target and copies its successful output.
   * @param {Array<string>} args Compiler arguments.
   * @param {string} output_file Generated bundle path.
   * @param {string} bundle_name Destination bundle name.
   */
  static buildBundle(args, output_file, bundle_name) {
    var result = PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.runEmscripten('em++', 'EMXX', args);

    if(!result || result.status !== 0) {
      var err_msg = '';
      if(result) {
        err_msg = String(result.stdout || '') + String(result.stderr || '');
        if(result.error && result.error.message) {
          err_msg += '\n' + result.error.message;
        }
      }
      throw new Error('Failed to build ' + bundle_name + ' wasm bundle.\n' + err_msg.trim());
    }

    PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.copyFile(output_file, path.join(bundle_root, bundle_name + '.js'));
  }

}


var fs = require('fs');
var path = require('path');
var cp = require('child_process');

var app_root = path.resolve(__dirname, '..', '..');
var build_root = path.join(app_root, 'build', 'native-wasm');
var bundle_root = path.join(app_root, 'build', 'wasm', 'native');
var package_json = JSON.parse(fs.readFileSync(path.join(app_root, 'package.json'), 'utf8'));


try {
  PRDC_JSLAB_DEV_BUILD_NATIVE_WASM_HELPER.main();
} catch(err) {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
}
