/**
 * @file JSLAB basic submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('path');
const { PRDC_JSLAB_LIB_BASIC } = require('../basic');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createBasicDiaryHarness(current_path = path.join('C:', 'work', 'jslab')) {
  var diary_calls = [];
  var error_calls = [];

  var jsl = {
    app_path: path.join('C:', 'Electron', 'JSLAB'),
    current_path: current_path,
    no_ans: false,
    ignore_output: false,
    context: {},
    inter: {
      env: {
        readFileSync: function() {
          return '{}';
        },
        pathIsAbsolute: function(file_path) {
          return path.isAbsolute(file_path);
        },
        pathResolve: function(file_path) {
          return path.resolve(file_path);
        },
        pathJoin: function() {
          return path.join.apply(path, arguments);
        },
        pathNormalize: function(file_path) {
          return path.normalize(file_path);
        },
        diary: function(action, file_path) {
          diary_calls.push({
            action: action,
            file_path: file_path
          });
        },
        error: function(msg) {
          error_calls.push(msg);
        }
      }
    }
  };

  // Getter-based command aliases execute with context as receiver.
  jsl.context.jsl = jsl;

  var basic = new PRDC_JSLAB_LIB_BASIC(jsl);
  return { basic, jsl, diary_calls, error_calls };
}

tests.add('diary without args toggles logging through environment bridge', function(assert) {
  var harness = createBasicDiaryHarness();
  var ok = harness.basic.diary();

  assert.equal(ok, true);
  assert.equal(harness.diary_calls.length, 1);
  assert.equal(harness.diary_calls[0].action, 'toggle');
  assert.equal(typeof harness.diary_calls[0].file_path, 'undefined');
  assert.equal(harness.jsl.no_ans, true);
  assert.equal(harness.jsl.ignore_output, true);
}, { tags: ['unit', 'basic'] });

tests.add('diary accepts explicit on/off tokens', function(assert) {
  var harness = createBasicDiaryHarness();
  harness.basic.diary('on');
  harness.basic.diary('off');

  assert.equal(harness.diary_calls.length, 2);
  assert.equal(harness.diary_calls[0].action, 'on');
  assert.equal(harness.diary_calls[1].action, 'off');
}, { tags: ['unit', 'basic'] });

tests.add('diary path argument resolves relative path against current path', function(assert) {
  var current_path = path.join('C:', 'workspace', 'project');
  var harness = createBasicDiaryHarness(current_path);
  harness.basic.diary(path.join('logs', 'session.log'));

  assert.equal(harness.diary_calls.length, 1);
  assert.equal(harness.diary_calls[0].action, 'on');
  assert.equal(
    harness.diary_calls[0].file_path,
    path.normalize(path.join(current_path, path.join('logs', 'session.log')))
  );
}, { tags: ['unit', 'basic'] });

tests.add('diary rejects invalid argument type and reports error', function(assert) {
  var harness = createBasicDiaryHarness();
  var ok = harness.basic.diary(123);

  assert.equal(ok, false);
  assert.equal(harness.diary_calls.length, 0);
  assert.equal(harness.error_calls.length, 1);
  assert.ok(harness.error_calls[0].includes('@diary:'));
  assert.equal(harness.jsl.no_ans, true);
  assert.equal(harness.jsl.ignore_output, true);
}, { tags: ['unit', 'basic'] });

function createBasicInstallModuleHarness(system_output = 'install ok') {
  var errors = [];
  var disp_calls = [];
  var system_calls = [];

  var jsl = {
    app_path: path.join('C:', 'Electron', 'JSLAB'),
    pathResolve: function(file_path) {
      return file_path;
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
      env: {
        showOpenDialogSync: function() {
          return undefined;
        },
        error: function(msg) {
          errors.push(msg);
        },
        addPathSep: function(input_path) {
          if(input_path.endsWith('\\') || input_path.endsWith('/')) {
            return input_path;
          }
          return input_path + '\\';
        },
        exe_path: 'C:\\node.exe',
        pathJoin: function() {
          return path.join.apply(path, arguments);
        },
        disp: function(msg) {
          disp_calls.push(msg);
        }
      }
    }
  };

  var basic = Object.create(PRDC_JSLAB_LIB_BASIC.prototype);
  basic.jsl = jsl;
  basic.system = function(command, options) {
    system_calls.push({
      command: command,
      options: options
    });
    return system_output;
  };

  return { basic, errors, disp_calls, system_calls };
}

tests.add('installModule in basic runs npm install and can show output', function(assert) {
  var harness = createBasicInstallModuleHarness('install done');

  harness.basic.installModule('C:\\work\\module', true);

  assert.equal(harness.system_calls.length, 1);
  assert.ok(harness.system_calls[0].command.includes('npm-cli.js'));
  assert.ok(harness.system_calls[0].command.includes(' install '));
  assert.deepEqual(harness.disp_calls, ['install done']);
}, { tags: ['unit', 'basic'] });

tests.add('installModule in basic reports npm errors', function(assert) {
  var harness = createBasicInstallModuleHarness('...\nnpm error broken');

  harness.basic.installModule('C:\\work\\module');

  assert.equal(harness.errors.length, 1);
  assert.ok(harness.errors[0].includes('@installModule:'));
}, { tags: ['unit', 'basic'] });

function createBasicCompletionsHarness() {
  var jsl = {
    context: {}
  };
  var basic = Object.create(PRDC_JSLAB_LIB_BASIC.prototype);
  basic.jsl = jsl;
  return { basic, jsl };
}

tests.add('getCompletions prioritizes exact match and includes context symbols', function(assert) {
  var harness = createBasicCompletionsHarness();
  harness.jsl.context.customKeyword2 = true;
  harness.jsl.context.customAction = function() {};

  var completions = harness.basic.getCompletions([
    'customKeyword',
    '',
    ['customKeyword']
  ]);

  assert.equal(completions[0], 'customKeyword');
  assert.ok(completions.includes('customKeyword2'));
}, { tags: ['unit', 'basic'] });

function createBasicMatlabPathHarness() {
  var save_path_calls = [];
  var remove_path_calls = [];
  var disp_calls = [];
  var disp_monospaced_calls = [];
  var error_calls = [];
  var path_resolve_calls = [];
  var resolved_paths = {};
  var workspace_properties = ['alpha', 'beta'];
  var workspace_rows = [
    ['alpha', 'number', 'Number'],
    ['beta', 'object', 'Array']
  ];
  var files = new Set();
  var directories = new Set();
  var directory_entries = {};
  var docs_map = {};
  var lookfor_results = {};

  function normalizeFsPath(path_in) {
    return path.normalize(path_in);
  }

  function normalizeDirPath(path_in) {
    var normalized = normalizeFsPath(path_in);
    if(normalized.length > 1 &&
        (normalized.endsWith('\\') || normalized.endsWith('/'))) {
      return normalized.slice(0, -1);
    }
    return normalized;
  }

  function ensureDirectory(path_in) {
    var normalized = normalizeDirPath(path_in);
    directories.add(normalized);
    if(!directory_entries.hasOwnProperty(normalized)) {
      directory_entries[normalized] = [];
    }
  }

  var jsl = {
    app_path: path.join('C:', 'Electron', 'JSLAB'),
    current_path: path.join('C:', 'workspace', 'project') + path.sep,
    includes_path: path.join('C:', 'Electron', 'JSLAB', 'includes') + path.sep,
    saved_paths: [],
    initial_workspace: [],
    no_ans: false,
    ignore_output: false,
    context: {},
    pathResolve: function(file_path) {
      path_resolve_calls.push(file_path);
      if(Object.prototype.hasOwnProperty.call(resolved_paths, file_path)) {
        return resolved_paths[file_path];
      }
      return false;
    },
    getWorkspaceProperties: function() {
      return workspace_properties.slice();
    },
    getWorkspace: function() {
      return workspace_rows.map(function(row) {
        return row.slice();
      });
    },
    inter: {
      fs: {
        lstatSync: function(path_in) {
          var file_key = normalizeFsPath(path_in);
          var dir_key = normalizeDirPath(path_in);
          if(files.has(file_key)) {
            return {
              size: 128,
              mtime: new Date('2026-02-22T00:00:00Z'),
              isDirectory: function() { return false; },
              isFile: function() { return true; }
            };
          }
          if(directories.has(dir_key)) {
            return {
              size: 0,
              mtime: new Date('2026-02-22T00:00:00Z'),
              isDirectory: function() { return true; },
              isFile: function() { return false; }
            };
          }
          return undefined;
        }
      },
      docs: {
        helpToJSON: function(name) {
          if(Object.prototype.hasOwnProperty.call(docs_map, name)) {
            return JSON.stringify(docs_map[name]);
          }
          return false;
        },
        documentationSearch: function() {
          return Object.assign({}, lookfor_results);
        }
      },
      env: {
        readFileSync: function() {
          return '{}';
        },
        pathIsAbsolute: function(path_in) {
          return path.isAbsolute(path_in);
        },
        pathJoin: function() {
          return path.join.apply(path, arguments);
        },
        pathNormalize: function(path_in) {
          return path.normalize(path_in);
        },
        pathDirName: function(path_in) {
          return path.dirname(path_in);
        },
        pathBaseName: function(path_in) {
          return path.basename(path_in);
        },
        checkFile: function(path_in) {
          return files.has(normalizeFsPath(path_in));
        },
        checkDirectory: function(path_in) {
          return directories.has(normalizeDirPath(path_in));
        },
        readDir: function(path_in) {
          var key = normalizeDirPath(path_in);
          if(Object.prototype.hasOwnProperty.call(directory_entries, key)) {
            return directory_entries[key].slice();
          }
          return [];
        },
        listFolderContents: function() {
          var key = normalizeDirPath(jsl.current_path);
          if(Object.prototype.hasOwnProperty.call(directory_entries, key)) {
            return directory_entries[key].slice();
          }
          return [];
        },
        addPathSep: function(path_in) {
          if(path_in && path_in[path_in.length - 1] !== path.sep) {
            return path_in + path.sep;
          }
          return path_in;
        },
        savePath: function(path_in) {
          save_path_calls.push(path_in);
        },
        removePath: function(path_in) {
          remove_path_calls.push(path_in);
        },
        pathSep: function() {
          return path.sep;
        },
        disp: function(msg) {
          disp_calls.push(msg);
        },
        dispMonospaced: function(msg) {
          disp_monospaced_calls.push(msg);
        },
        error: function(msg) {
          error_calls.push(msg);
        }
      }
    }
  };

  ensureDirectory(jsl.current_path);
  ensureDirectory(jsl.includes_path);

  // Getter-based command aliases execute with jsl.context as receiver.
  jsl.context.jsl = jsl;

  var basic = new PRDC_JSLAB_LIB_BASIC(jsl);
  jsl.basic = basic;
  return {
    basic,
    jsl,
    save_path_calls,
    remove_path_calls,
    disp_calls,
    disp_monospaced_calls,
    error_calls,
    path_resolve_calls,
    resolved_paths,
    setWorkspaceProperties: function(values) {
      workspace_properties = values.slice();
    },
    setWorkspaceRows: function(values) {
      workspace_rows = values.map(function(row) {
        return row.slice();
      });
    },
    setFiles: function(values) {
      files = new Set(values.map(normalizeFsPath));
    },
    setDirectories: function(values) {
      directories = new Set(values.map(normalizeDirPath));
      directories.add(normalizeDirPath(jsl.current_path));
      directories.add(normalizeDirPath(jsl.includes_path));
    },
    setDirectoryEntries: function(directory, entries) {
      var key = normalizeDirPath(directory);
      ensureDirectory(key);
      directory_entries[key] = entries.slice();
    }
  };
}

function normalizePathCommandOutput(out) {
  if(Array.isArray(out)) {
    return out.map(function(entry) {
      return String(entry);
    });
  }

  if(typeof out === 'string') {
    var trimmed = out.trim();
    if(!trimmed.length) {
      return [];
    }
    if(trimmed.includes(path.delimiter)) {
      return trimmed.split(path.delimiter).map(function(entry) {
        return entry.trim();
      }).filter(function(entry) {
        return entry.length > 0;
      });
    }
    return trimmed.split(/\r?\n/).map(function(entry) {
      return entry.trim();
    }).filter(function(entry) {
      return entry.length > 0;
    });
  }

  return [];
}

function extractWhoNames(out) {
  if(Array.isArray(out)) {
    return out.map(function(entry) {
      if(Array.isArray(entry)) {
        return String(entry[0]);
      }
      return String(entry);
    });
  }

  if(typeof out === 'string') {
    return out.split(/[\s,\r\n]+/).map(function(entry) {
      return entry.trim();
    }).filter(function(entry) {
      return entry.length > 0;
    });
  }

  return [];
}

tests.add('addpath normalizes path separator and deduplicates saved paths', function(assert) {
  var harness = createBasicMatlabPathHarness();
  var new_path = path.join('C:', 'workspace', 'libs');

  if(typeof harness.basic.addpath !== 'function') {
    assert.fail('addpath is not implemented on PRDC_JSLAB_LIB_BASIC.');
  }

  harness.basic.addpath(new_path);
  harness.basic.addpath(new_path + path.sep);

  assert.equal(harness.jsl.saved_paths.length, 1);
  assert.equal(harness.jsl.saved_paths[0], new_path + path.sep);
  assert.ok(harness.save_path_calls.length >= 1);
  assert.equal(harness.save_path_calls[harness.save_path_calls.length - 1], new_path + path.sep);
}, { tags: ['unit', 'basic'] });

tests.add('rmpath removes normalized path and forwards call to environment', function(assert) {
  var harness = createBasicMatlabPathHarness();
  var new_path = path.join('C:', 'workspace', 'libs') + path.sep;

  if(typeof harness.basic.rmpath !== 'function') {
    assert.fail('rmpath is not implemented on PRDC_JSLAB_LIB_BASIC.');
  }

  harness.jsl.saved_paths = [new_path];
  harness.basic.rmpath(path.join('C:', 'workspace', 'libs'));

  assert.equal(harness.jsl.saved_paths.length, 0);
  assert.equal(harness.remove_path_calls.length, 1);
  assert.equal(harness.remove_path_calls[0], new_path);
}, { tags: ['unit', 'basic'] });

tests.add('path exposes current/includes/saved search paths', function(assert) {
  var harness = createBasicMatlabPathHarness();

  if(typeof harness.basic.path !== 'function') {
    assert.fail('path is not implemented on PRDC_JSLAB_LIB_BASIC.');
  }

  harness.jsl.saved_paths = [
    path.join('C:', 'workspace', 'libA') + path.sep,
    path.join('C:', 'workspace', 'libB') + path.sep
  ];

  var out = harness.basic.path();
  if(typeof out === 'undefined' && harness.disp_calls.length) {
    out = harness.disp_calls[harness.disp_calls.length - 1];
  }
  var entries = normalizePathCommandOutput(out);

  assert.ok(entries.includes(harness.jsl.current_path));
  assert.ok(entries.includes(harness.jsl.includes_path));
  assert.ok(entries.includes(harness.jsl.saved_paths[0]));
  assert.ok(entries.includes(harness.jsl.saved_paths[1]));
}, { tags: ['unit', 'basic'] });

tests.add('which delegates file resolution to jsl.pathResolve', function(assert) {
  var harness = createBasicMatlabPathHarness();

  if(typeof harness.basic.which !== 'function') {
    assert.fail('which is not implemented on PRDC_JSLAB_LIB_BASIC.');
  }

  harness.resolved_paths['demo-file.jsl'] = path.join('C:', 'workspace', 'project', 'demo-file.jsl');
  var out = harness.basic.which('demo-file.jsl');

  assert.equal(out, harness.resolved_paths['demo-file.jsl']);
  assert.equal(harness.path_resolve_calls.length, 1);
  assert.equal(harness.path_resolve_calls[0], 'demo-file.jsl');
}, { tags: ['unit', 'basic'] });

tests.add('who returns workspace variable names', function(assert) {
  var harness = createBasicMatlabPathHarness();

  if(typeof harness.basic.who !== 'function') {
    assert.fail('who is not implemented on PRDC_JSLAB_LIB_BASIC.');
  }

  harness.setWorkspaceProperties(['alpha', 'beta', 'gamma']);
  var out = harness.basic.who();
  var names = extractWhoNames(out);

  assert.ok(names.includes('alpha'));
  assert.ok(names.includes('beta'));
  assert.ok(names.includes('gamma'));
}, { tags: ['unit', 'basic'] });

tests.add('who supports wildcard filters', function(assert) {
  var harness = createBasicMatlabPathHarness();
  harness.setWorkspaceProperties(['alpha', 'beta', 'gamma1', 'delta']);

  var out = harness.basic.who('a*', '*1');
  var names = extractWhoNames(out);

  assert.equal(names.includes('alpha'), true);
  assert.equal(names.includes('gamma1'), true);
  assert.equal(names.includes('beta'), false);
}, { tags: ['unit', 'basic'] });

tests.add('whos exposes workspace rows with type details', function(assert) {
  var harness = createBasicMatlabPathHarness();

  if(typeof harness.basic.whos !== 'function') {
    assert.fail('whos is not implemented on PRDC_JSLAB_LIB_BASIC.');
  }

  harness.setWorkspaceRows([
    ['mass', 'number', 'Number'],
    ['samples', 'object', 'Array']
  ]);

  var out = harness.basic.whos();
  if(Array.isArray(out)) {
    assert.equal(out.length, 2);
    assert.equal(out[0][0], 'mass');
    assert.equal(out[0][1], 'number');
    assert.equal(out[1][0], 'samples');
    assert.equal(out[1][2], 'Array');
    return;
  }

  var rendered = String(out);
  assert.ok(rendered.includes('mass'));
  assert.ok(rendered.includes('samples'));
  assert.ok(rendered.includes('number'));
}, { tags: ['unit', 'basic'] });

tests.add('whos supports wildcard filters', function(assert) {
  var harness = createBasicMatlabPathHarness();
  harness.setWorkspaceRows([
    ['alpha', 'number', 'Number'],
    ['beta', 'object', 'Array'],
    ['gamma1', 'number', 'Number']
  ]);

  var out = harness.basic.whos('*1', 'a*');
  assert.equal(out.length, 2);
  assert.equal(out[0][0], 'alpha');
  assert.equal(out[1][0], 'gamma1');
}, { tags: ['unit', 'basic'] });

tests.add('which supports -all option and returns all matches from search paths', function(assert) {
  var harness = createBasicMatlabPathHarness();
  var shared_name = 'demo-file.jsl';
  var saved = path.join('C:', 'workspace', 'saved') + path.sep;
  harness.jsl.saved_paths = [saved];
  harness.setDirectories([
    harness.jsl.current_path,
    harness.jsl.includes_path,
    saved
  ]);
  harness.setFiles([
    path.join(harness.jsl.current_path, shared_name),
    path.join(harness.jsl.includes_path, shared_name),
    path.join(saved, shared_name)
  ]);

  var out = harness.basic.which(shared_name, '-all');
  assert.ok(Array.isArray(out));
  assert.equal(out.length, 3);
  assert.ok(out.includes(path.normalize(path.join(harness.jsl.current_path, shared_name))));
  assert.ok(out.includes(path.normalize(path.join(harness.jsl.includes_path, shared_name))));
  assert.ok(out.includes(path.normalize(path.join(saved, shared_name))));
}, { tags: ['unit', 'basic'] });

tests.add('isfile and isfolder detect entries through relative inputs', function(assert) {
  var harness = createBasicMatlabPathHarness();
  var folder = path.join(harness.jsl.current_path, 'logs');
  var file = path.join(folder, 'run.log');

  harness.setDirectories([
    harness.jsl.current_path,
    harness.jsl.includes_path,
    folder
  ]);
  harness.setFiles([file]);

  assert.equal(harness.basic.isfolder('logs'), true);
  assert.equal(harness.basic.isfile(path.join('logs', 'run.log')), true);
  assert.equal(harness.basic.isfile('missing.log'), false);
  assert.equal(harness.basic.isfolder('missing-folder'), false);
}, { tags: ['unit', 'basic'] });

tests.add('dir and ls list directory contents and wildcard matches', function(assert) {
  var harness = createBasicMatlabPathHarness();
  var folder = path.join(harness.jsl.current_path, 'logs');
  var txt_file = path.join(folder, 'a.txt');
  var bin_file = path.join(folder, 'b.bin');

  harness.setDirectories([
    harness.jsl.current_path,
    harness.jsl.includes_path,
    folder
  ]);
  harness.setDirectoryEntries(harness.jsl.current_path, ['logs']);
  harness.setDirectoryEntries(folder, ['a.txt', 'b.bin']);
  harness.setFiles([txt_file, bin_file]);

  var ls_out = harness.basic.ls('logs');
  assert.deepEqual(ls_out, ['a.txt', 'b.bin']);

  var dir_out = harness.basic.dir(path.join('logs', '*.txt'));
  assert.equal(dir_out.length, 1);
  assert.equal(dir_out[0].name, 'a.txt');
  assert.equal(dir_out[0].isdir, false);
}, { tags: ['unit', 'basic'] });

tests.add('exist returns MATLAB-like codes and supports typed checks', function(assert) {
  var harness = createBasicMatlabPathHarness();
  var folder = path.join(harness.jsl.current_path, 'data');
  var file = path.join(harness.jsl.current_path, 'data.txt');

  harness.jsl.context.mass = 10;
  harness.jsl.context.sin = function() {};
  harness.jsl.initial_workspace = ['sin'];
  harness.setDirectories([
    harness.jsl.current_path,
    harness.jsl.includes_path,
    folder
  ]);
  harness.setFiles([file]);

  assert.equal(harness.basic.exist('mass'), 1);
  assert.equal(harness.basic.exist('data.txt'), 2);
  assert.equal(harness.basic.exist('data'), 7);
  assert.equal(harness.basic.exist('sin', 'builtin'), 5);
  assert.equal(harness.basic.exist('mass', 'var'), 1);
  assert.equal(harness.basic.exist('data.txt', 'file'), 2);
  assert.equal(harness.basic.exist('data', 'dir'), 7);
  assert.equal(harness.basic.exist('missing'), 0);
}, { tags: ['unit', 'basic'] });

exports.MODULE_TESTS = tests;
