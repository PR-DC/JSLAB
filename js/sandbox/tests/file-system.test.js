/**
 * @file JSLAB file-system submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { PRDC_JSLAB_LIB_FILE_SYSTEM } = require('../file-system');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function withTempDir(fn) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-fs-test-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createFsHarness(overrides = {}) {
  var errors = [];

  var env = {
    readFileSync: function() {
      return fs.readFileSync.apply(fs, arguments);
    },
    writeFileSync: function() {
      return fs.writeFileSync.apply(fs, arguments);
    },
    rmSync: function() {
      return fs.rmSync.apply(fs, arguments);
    },
    readDir: function() {
      return fs.readdirSync.apply(fs, arguments);
    },
    copyFileSync: function() {
      return fs.copyFileSync.apply(fs, arguments);
    },
    pathJoin: function() {
      return path.join.apply(path, arguments);
    },
    checkDirectory: function(target_path) {
      return fs.existsSync(target_path) && fs.statSync(target_path).isDirectory();
    },
    checkFile: function(target_path) {
      return fs.existsSync(target_path) && fs.statSync(target_path).isFile();
    },
    makeDirectory: function(dir_path) {
      fs.mkdirSync(dir_path, { recursive: true });
      return true;
    },
    showOpenDialogSync: function() {
      return undefined;
    },
    getDefaultPath: function(type) {
      return type === 'root' ? '/root' : '/tmp';
    },
    openFolder: function() {},
    openDir: function() {},
    showFileInFolder: function() {},
    showFileInDir: function() {},
    execSync: function() {},
    bin7zip: '7z',
    error: function(message) {
      errors.push(message);
    }
  };

  var path_api = {
    comparePaths: function(a, b) {
      return path.resolve(a) === path.resolve(b);
    },
    pathFileName: function(target_path) {
      return path.basename(target_path, path.extname(target_path));
    },
    pathExtName: function(target_path) {
      return path.extname(target_path);
    }
  };

  var jsl = {
    inter: {
      env: env,
      path: path_api,
      lang: {
        string: function(id) {
          return 'LANG_' + id;
        }
      }
    },
    error: function(message) {
      errors.push(message);
    }
  };

  if(overrides.env) {
    Object.assign(env, overrides.env);
  }
  if(overrides.path) {
    Object.assign(path_api, overrides.path);
  }
  if(overrides.jsl) {
    Object.assign(jsl, overrides.jsl);
  }

  var file_system = new PRDC_JSLAB_LIB_FILE_SYSTEM(jsl);
  return { file_system, jsl, env, errors };
}

tests.add('getContentFromCharRange reads and slices file text', function(assert) {
  var harness = createFsHarness({
    env: {
      readFileSync: function() {
        return 'abcdef';
      }
    }
  });

  var out = harness.file_system.getContentFromCharRange('dummy.txt', [1, 4]);
  assert.equal(out, 'bcd');
}, { tags: ['unit', 'file-system'] });

tests.add('moveFile short-circuits when source and destination are equal', function(assert) {
  var copied = 0;
  var removed = 0;
  var harness = createFsHarness({
    env: {
      copyFileSync: function() {
        copied += 1;
      },
      rmSync: function() {
        removed += 1;
      }
    },
    path: {
      comparePaths: function() {
        return true;
      }
    }
  });

  var ok = harness.file_system.moveFile('a', 'a');
  assert.equal(ok, true);
  assert.equal(copied, 0);
  assert.equal(removed, 0);
}, { tags: ['unit', 'file-system'] });

tests.add('moveFile copies and removes source when paths differ', function(assert) {
  withTempDir(function(temp_dir) {
    var harness = createFsHarness();
    var src = path.join(temp_dir, 'src.txt');
    var dest = path.join(temp_dir, 'dest.txt');
    fs.writeFileSync(src, 'hello');

    var ok = harness.file_system.moveFile(src, dest);
    assert.equal(ok, true);
    assert.equal(fs.existsSync(src), false);
    assert.equal(fs.readFileSync(dest, 'utf8'), 'hello');
  });
}, { tags: ['unit', 'file-system'] });

tests.add('filesInFolder filters by extension and returns joined paths', function(assert) {
  var harness = createFsHarness({
    env: {
      readDir: function() {
        return ['a.txt', 'b.js', 'notes', 'c.js'];
      },
      pathJoin: function(folder, file) {
        return folder + '/' + file;
      }
    }
  });

  var js_files = harness.file_system.filesInFolder('root', 'js');
  var all_files = harness.file_system.filesInFolder('root');

  assert.deepEqual(js_files, ['root/b.js', 'root/c.js']);
  assert.deepEqual(all_files, ['root/a.txt', 'root/b.js', 'root/c.js']);
}, { tags: ['unit', 'file-system'] });

tests.add('allFilesInFolder recursively flattens nested filenames', function(assert) {
  withTempDir(function(temp_dir) {
    var src = path.join(temp_dir, 'src');
    fs.mkdirSync(path.join(src, 'inner'), { recursive: true });
    fs.writeFileSync(path.join(src, 'a.txt'), 'a');
    fs.writeFileSync(path.join(src, 'inner', 'b.txt'), 'b');
    fs.writeFileSync(path.join(src, 'inner', 'c.js'), 'c');

    var harness = createFsHarness();
    var files = harness.file_system.allFilesInFolder(src).slice().sort();
    assert.deepEqual(files, ['a.txt', 'b.txt', 'c.js']);
  });
}, { tags: ['unit', 'file-system'] });

tests.add('copyDir recursively copies nested directory structure', function(assert) {
  withTempDir(function(temp_dir) {
    var src = path.join(temp_dir, 'src');
    var dest = path.join(temp_dir, 'dest');
    fs.mkdirSync(path.join(src, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(src, 'root.txt'), 'root');
    fs.writeFileSync(path.join(src, 'nested', 'child.txt'), 'child');

    var harness = createFsHarness();
    harness.file_system.copyDir(src, dest);

    assert.equal(fs.readFileSync(path.join(dest, 'root.txt'), 'utf8'), 'root');
    assert.equal(fs.readFileSync(path.join(dest, 'nested', 'child.txt'), 'utf8'), 'child');
  });
}, { tags: ['unit', 'file-system'] });

tests.add('readcsv parses both header and non-header content', function(assert) {
  withTempDir(function(temp_dir) {
    var file = path.join(temp_dir, 'data.csv');
    fs.writeFileSync(file, 'name,age\nAna,30\nBob,25\n');
    var harness = createFsHarness();

    var with_header = harness.file_system.readcsv(file, ',', true);
    var without_header = harness.file_system.readcsv(file, ',', false);

    assert.deepEqual(with_header, [
      { name: 'Ana', age: '30' },
      { name: 'Bob', age: '25' }
    ]);
    assert.deepEqual(without_header, [
      ['name', 'age'],
      ['Ana', '30'],
      ['Bob', '25']
    ]);
  });
}, { tags: ['unit', 'file-system'] });

tests.add('chooseFile returns empty array and reports when user cancels', function(assert) {
  var harness = createFsHarness({
    env: {
      showOpenDialogSync: function() {
        return undefined;
      }
    }
  });

  var out = harness.file_system.chooseFile({ title: 'Pick a file' });
  assert.deepEqual(out, []);
  assert.ok(harness.errors.length > 0);
}, { tags: ['unit', 'file-system'] });

tests.add('chooseFolder merges directory property and returns selected path list', function(assert) {
  var harness = createFsHarness({
    env: {
      showOpenDialogSync: function(options) {
        return options.properties.includes('openDirectory') ? ['C:/tmp'] : [];
      }
    }
  });

  var out = harness.file_system.chooseFolder({ title: 'Pick a folder' });
  assert.deepEqual(out, ['C:/tmp']);
}, { tags: ['unit', 'file-system'] });

exports.MODULE_TESTS = tests;
