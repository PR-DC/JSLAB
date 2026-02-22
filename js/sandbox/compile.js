/**
 * @file JSLAB library compile submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB compile submodule.
 */
class PRDC_JSLAB_LIB_COMPILE {
  
  /**
   * Initializes a new instance of the PRDC_JSLAB_LIB_COMPILE class.
   * @param {Object} jsl The JSLAB application instance this submodule is part of.
   */
  constructor(jsl) {
    this.jsl = jsl;
  }

  /**
   * Compiles a N-API module located at the specified path.
   * @param {string} path - The path to the N-API module.
   * @param {boolean} [show_output=true] - Whether to show output in the command window.
   * @return {Array} An array containing the result of the compilation and targets.
   */
  compileNapi(path, show_output = false) {
    var result = false;
    var obj = this;
    if(typeof path == 'string') {
      path = this.jsl.pathResolve(path);
    }
    if(!path) {
      var options = {
        title: this.jsl.inter.lang.currentString(141),
        buttonLabel: this.jsl.inter.lang.currentString(142),
        properties: ['openDirectory'],
      };
      path = this.jsl.inter.env.showOpenDialogSync(options);
      if(path === undefined) {
        this.jsl.inter.env.error('@compileNapi: '+this.jsl.inter.lang.string(119)+'.');
        return false;
      } else {
        path = path[0];
      }
    }
    path = this.jsl.inter.env.addPathSep(path);
 
    if(this.jsl.inter.env.rmSync(path+'build/Release/', false) === false) {
      this.jsl.inter.env.error('@compileNapi: '+this.jsl.inter.lang.string(171));
    }
    
    var binding_file_path = path + 'binding.gyp';
    if(this.jsl.inter.env.checkFile(binding_file_path)) {
      var targets = [];
      try {
        var binding_file_data = JSON.parse(this.jsl.inter.env.readFileSync(binding_file_path).toString());
      } catch(err) {
        this.jsl.inter.env.error('@compileNapi: '+this.jsl.inter.lang.string(120)+'.');
        return false;
      }
      binding_file_data.targets.forEach(function(target) {
        targets.push(path + 'build/Release/' + target.target_name + '.node');
      });
      if(targets.length > 0) {
        var exe = this.jsl.inter.env.exe_path;
        var node_gyp_path = this.jsl.app_path + '/node_modules/node-gyp/bin/node-gyp.js';
        var npm_path = this.jsl.inter.env.pathJoin(this.jsl.app_path, 'node_modules', 'npm', 'bin', 'npm-cli.js');
        var msg = this.jsl.inter.basic.system('set ELECTRON_RUN_AS_NODE=1 & "' + exe + '" "' + npm_path + '" cache clean --force & "' + exe + '" "' + npm_path + '" install --build-from-source=false & "' + exe + '" "' + node_gyp_path + '" rebuild --target='+process.version+' 2>&1', {cwd: path, shell: false});
        
        if(msg.endsWith('gyp info ok \n')) {
          if(show_output) {
            this.jsl.inter.env.disp(msg.replaceAll('\n', '<br>'));
          }
          result = true;
        } else if(!msg.endsWith('gyp ERR! not ok \n')) {
          this.jsl.inter.env.error('@compileNapi: '+this.jsl.inter.lang.string(121)+'. '+msg.replaceAll('\n', '<br>'));
        } else {
          this.jsl.inter.env.error('@compileNapi: '+this.jsl.inter.lang.string(170)+'. '+msg.replaceAll('\n', '<br>'));
        }

        if(result) {
          return [result, targets];
        } else {
          return [result, undefined];
        }
      } else {
        this.jsl.inter.env.error('@compileNapi: '+this.jsl.inter.lang.string(122)+'. '+msg.replaceAll('\n', '<br>'));
        return [result, undefined];
      }
    } else {
      this.jsl.inter.env.error('@compileNapi: '+this.jsl.inter.lang.string(123)+'. '+msg.replaceAll('\n', '<br>'));
      return [result, undefined];
    }
  }

  /**
   * Compiles a WebAssembly module from C/C++ or Rust sources using the available toolchain.
   * The method automatically selects `emcc` for native sources and `wasm-pack` when a Cargo.toml is present.
   * @param {string} path - Path to a source file or directory containing sources.
   * @param {boolean} [show_output=false] - Whether to display the compiler output.
   * @returns {Array} Tuple `[success, wasm_path|undefined]`.
   */
  compileWasm(path, show_output = false) {
    var result = false;
    if(typeof path == 'string') {
      path = this.jsl.pathResolve(path);
    }
    if(!path) {
      var options = {
        title: this.jsl.inter.lang.currentString(141),
        buttonLabel: this.jsl.inter.lang.currentString(142),
        properties: ['openFile', 'openDirectory'],
        filters: [
          {
            name: 'Sources',
            extensions: ['c', 'cpp', 'cc', 'cxx', 'rs']
          }
        ]
      };
      path = this.jsl.inter.env.showOpenDialogSync(options);
      if(path === undefined || path.length === 0) {
        this.jsl.inter.env.error('@compileWasm: ' + this.jsl.inter.lang.string(256));
        return [result, undefined];
      }
      path = path[0];
    }

    var is_file = this.jsl.inter.env.checkFile(path);
    var is_dir = this.jsl.inter.env.checkDirectory(path);
    if(!is_file && !is_dir) {
      this.jsl.inter.env.error('@compileWasm: ' + this.jsl.inter.lang.string(257));
      return [result, undefined];
    }

    var ext = this.jsl.inter.env.pathExtName(path).toLowerCase();
    var rust_candidate = false;
    var rust_dir = false;
    if(is_file && ext === '.rs') {
      var parent_dir = this.jsl.inter.env.pathDirName(path);
      var candidate = this.jsl.inter.env.pathJoin(parent_dir, 'Cargo.toml');
      if(this.jsl.inter.env.checkFile(candidate)) {
        rust_candidate = true;
        rust_dir = parent_dir;
      }
    }
    if(!rust_candidate && is_dir) {
      var candidate = this.jsl.inter.env.pathJoin(path, 'Cargo.toml');
      if(this.jsl.inter.env.checkFile(candidate)) {
        rust_candidate = true;
        rust_dir = path;
      }
    }

    if(rust_candidate) {
      var pkg_dir = this.jsl.inter.env.pathJoin(rust_dir, 'pkg');
      var spawn_result = this.jsl.inter.env.spawnSync('wasm-pack', ['build', '--release', '--target', 'web', '--out-dir', 'pkg'], {cwd: rust_dir});
      var stdout = spawn_result && spawn_result.stdout ? spawn_result.stdout.toString() : '';
      var stderr = spawn_result && spawn_result.stderr ? spawn_result.stderr.toString() : '';
      var output = [stdout, stderr].filter(function(part) { return part && part.length; }).join('\n');
      if(show_output && output.length) {
        this.jsl.inter.env.disp(output.replaceAll('\n', '<br>'));
      }
      if(!spawn_result || spawn_result.status !== 0) {
        var err_msg = spawn_result && spawn_result.error ? spawn_result.error.message : (stderr || stdout);
        this.jsl.inter.env.error('@compileWasm (Rust): ' + this.jsl.inter.lang.string(261) + ' ' + err_msg.replaceAll('\n', '<br>'));
        return [result, undefined];
      }
      if(!this.jsl.inter.env.checkDirectory(pkg_dir)) {
        this.jsl.inter.env.error('@compileWasm: ' + this.jsl.inter.lang.string(262));
        return [result, undefined];
      }
      var pkg_entries = this.jsl.inter.env.readDir(pkg_dir);
      if(pkg_entries === false) {
        this.jsl.inter.env.error('@compileWasm: ' + this.jsl.inter.lang.string(263));
        return [result, undefined];
      }
      var wasm_candidates = [];
      pkg_entries.forEach(function(entry) {
        if(entry.toLowerCase().endsWith('.wasm')) {
          wasm_candidates.push(entry);
        }
      });
      if(wasm_candidates.length === 0) {
        this.jsl.inter.env.error('@compileWasm: ' + this.jsl.inter.lang.string(264));
        return [result, undefined];
      }
      var wasm_file = wasm_candidates.find(function(entry) {
        return entry.toLowerCase().endsWith('_bg.wasm');
      }) || wasm_candidates[0];
      var wasm_path = this.jsl.inter.env.pathJoin(pkg_dir, wasm_file);
      if(!this.jsl.inter.env.checkFile(wasm_path)) {
        this.jsl.inter.env.error('@compileWasm: ' + this.jsl.inter.lang.string(265));
        return [result, undefined];
      }
      return [true, wasm_path];
    }

    var sources = [];
    var workdir = false;
    if(is_file) {
      if(['.c', '.cpp', '.cc', '.cxx'].includes(ext)) {
        sources.push(path);
        workdir = this.jsl.inter.env.pathDirName(path);
      } else {
        this.jsl.inter.env.error('@compileWasm: ' + this.jsl.inter.lang.string(258));
        return [result, undefined];
      }
    } else {
      workdir = path;
      var entries = this.jsl.inter.env.readDir(path);
      if(entries === false) {
        this.jsl.inter.env.error('@compileWasm: ' + this.jsl.inter.lang.string(260));
        return [result, undefined];
      }
      entries.forEach((entry) => {
        var full_path = this.jsl.inter.env.pathJoin(path, entry);
        if(this.jsl.inter.env.checkFile(full_path)) {
          var entry_ext = this.jsl.inter.env.pathExtName(full_path).toLowerCase();
          if(['.c', '.cpp', '.cc', '.cxx'].includes(entry_ext)) {
            sources.push(full_path);
          }
        }
      });
    }
    if(sources.length === 0) {
      this.jsl.inter.env.error('@compileWasm: ' + this.jsl.inter.lang.string(259));
      return [result, undefined];
    }
    var output_base = this.jsl.inter.env.pathBaseName(sources[0]);
    var wasm_path = this.jsl.inter.env.pathJoin(workdir, output_base + '.wasm');
    var args = [].concat(sources, ['-O3', '-s', 'WASM=1', '-o', wasm_path]);
    var spawn_result = this.jsl.inter.env.spawnSync('emcc', args, {cwd: workdir});
    var stdout = spawn_result && spawn_result.stdout ? spawn_result.stdout.toString() : '';
    var stderr = spawn_result && spawn_result.stderr ? spawn_result.stderr.toString() : '';
    var output = [stdout, stderr].filter(function(part) { return part && part.length; }).join('\n');
    if(show_output && output.length) {
      this.jsl.inter.env.disp(output.replaceAll('\n', '<br>'));
    }
    if(!spawn_result || spawn_result.status !== 0) {
      var err_msg = spawn_result && spawn_result.error ? spawn_result.error.message : (stderr || stdout);
      this.jsl.inter.env.error('@compileWasm: ' + err_msg.replaceAll('\n', '<br>'));
      return [result, undefined];
    }
    return [true, wasm_path];
  }

}

exports.PRDC_JSLAB_LIB_COMPILE = PRDC_JSLAB_LIB_COMPILE;
