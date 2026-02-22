/**
 * @file JSLAB compile submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const { PRDC_JSLAB_LIB_COMPILE } = require('../compile');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');

var tests = new PRDC_JSLAB_TESTS();

function createCompileHarness(overrides = {}) {
  var errors = [];
  var disp_calls = [];
  var system_calls = [];
  var spawn_calls = [];

  var env = {
    addPathSep: function(input_path) {
      var p = String(input_path || '');
      if(p.endsWith('\\') || p.endsWith('/')) {
        return p;
      }
      return p + '\\';
    },
    showOpenDialogSync: function() {
      return undefined;
    },
    error: function(msg) {
      errors.push(msg);
    },
    disp: function(msg) {
      disp_calls.push(msg);
    },
    rmSync: function() {
      return true;
    },
    checkFile: function() {
      return false;
    },
    readFileSync: function() {
      return '';
    },
    exe_path: 'C:\\node.exe',
    pathJoin: function() {
      return path.join.apply(path, arguments);
    },
    checkDirectory: function() {
      return false;
    },
    pathExtName: function(p) {
      return path.extname(p);
    },
    pathDirName: function(p) {
      return path.dirname(p);
    },
    pathBaseName: function(p) {
      return path.parse(p).name;
    },
    readDir: function() {
      return [];
    },
    spawnSync: function(command, args, options) {
      spawn_calls.push({
        command: command,
        args: args,
        options: options
      });
      return {
        status: 0,
        stdout: Buffer.from('ok'),
        stderr: Buffer.from('')
      };
    }
  };

  if(overrides.env && typeof overrides.env === 'object') {
    Object.keys(overrides.env).forEach(function(key) {
      env[key] = overrides.env[key];
    });
  }

  var jsl = {
    app_path: path.join('C:', 'Electron', 'JSLAB'),
    pathResolve: function(input_path) {
      return input_path;
    },
    inter: {
      lang: {
        currentString: function() {
          return '';
        },
        string: function(id) {
          return 'LANG_' + id;
        }
      },
      basic: {
        system: function(command, options) {
          system_calls.push({
            command: command,
            options: options
          });
          if(typeof overrides.system_return === 'string') {
            return overrides.system_return;
          }
          return 'ok';
        }
      },
      env: env
    }
  };

  var compile = new PRDC_JSLAB_LIB_COMPILE(jsl);
  return {
    compile: compile,
    errors: errors,
    disp_calls: disp_calls,
    system_calls: system_calls,
    spawn_calls: spawn_calls
  };
}

tests.add('compileNapi compiles binding target and returns generated .node path list', function(assert) {
  var harness = createCompileHarness({
    system_return: 'gyp info ok \n',
    env: {
      checkFile: function(file_path) {
        return file_path.endsWith('binding.gyp');
      },
      readFileSync: function() {
        return JSON.stringify({
          targets: [{ target_name: 'addon' }]
        });
      }
    }
  });

  var out = harness.compile.compileNapi('C:\\work\\module');
  assert.equal(out[0], true);
  assert.equal(out[1].length, 1);
  assert.ok(out[1][0].includes('build/Release/addon.node'));
  assert.equal(harness.system_calls.length, 1);
  assert.ok(harness.system_calls[0].command.includes('node-gyp'));
}, { tags: ['unit', 'compile'] });

tests.add('compileWasm with C source invokes emcc and returns wasm output path', function(assert) {
  var source_file = 'C:\\work\\native\\main.c';
  var harness = createCompileHarness({
    env: {
      checkFile: function(file_path) {
        return path.normalize(file_path) === path.normalize(source_file);
      }
    }
  });

  var out = harness.compile.compileWasm(source_file);
  assert.equal(out[0], true);
  assert.equal(path.normalize(out[1]), path.normalize(path.join(path.dirname(source_file), 'main.wasm')));
  assert.equal(harness.spawn_calls.length, 1);
  assert.equal(harness.spawn_calls[0].command, 'emcc');
}, { tags: ['unit', 'compile'] });

exports.MODULE_TESTS = tests;
