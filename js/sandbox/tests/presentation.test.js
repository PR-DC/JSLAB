/**
 * @file JSLAB presentation submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { PRDC_JSLAB_LIB_PRESENTATION } = require('../presentation');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function withTempDir(fn) {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-presentation-test-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createPresentationHarness() {
  var errors = [];
  var write_calls = [];
  var spawn_calls = [];
  var existing_files = new Set();
  var last_child = null;

  var env = {
    showOpenDialogSync: function() {
      return undefined;
    },
    error: function(message) {
      errors.push(message);
    },
    pathJoin: function() {
      return path.join.apply(path, arguments);
    },
    pathBaseName: function(value) {
      return path.basename(value);
    },
    pathResolve: function(value) {
      return path.resolve(value);
    },
    makeDirectory: function() {
      return true;
    },
    readFileSync: function(file_path) {
      return fs.readFileSync(file_path);
    },
    spawn: function(exe_file, args, opts) {
      spawn_calls.push({ exe_file: exe_file, args: args, opts: opts });
      var child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stdout.setEncoding = function() {};
      last_child = child;
      return child;
    }
  };

  var jsl = {
    inter: {
      lang: {
        currentString: function(id) {
          return 'LANG_' + id;
        },
        string: function(id) {
          return 'LANG_' + id;
        }
      },
      env: env,
      file_system: {
        existFile: function(file_path) {
          return existing_files.has(file_path);
        },
        writeFile: function(file_path, content) {
          write_calls.push({ file_path: file_path, content: content });
          return true;
        },
        copyFile: function() {
          return true;
        },
        copyFolder: function() {
          return true;
        }
      }
    },
    context: { version: 'test-version' },
    app_path: path.resolve(__dirname, '..', '..', '..')
  };

  var presentation = new PRDC_JSLAB_LIB_PRESENTATION(jsl);
  return {
    presentation,
    errors,
    write_calls,
    spawn_calls,
    setExistingFiles: function(list) {
      existing_files = new Set(list);
    },
    getLastChild: function() {
      return last_child;
    },
    setShowOpenDialogResult: function(value) {
      env.showOpenDialogSync = function() {
        return value;
      };
    }
  };
}

tests.add('_getPath returns provided path and reports cancel when no selection', function(assert) {
  var harness = createPresentationHarness();
  var out_direct = harness.presentation._getPath('openPresentation', 'C:/tmp/pres');
  assert.equal(out_direct, 'C:/tmp/pres');

  harness.setShowOpenDialogResult(undefined);
  var out_cancel = harness.presentation._getPath('openPresentation');
  assert.equal(out_cancel, false);
  assert.ok(harness.errors.length > 0);
}, { tags: ['unit', 'presentation'] });

tests.add('_checkPresentation validates existence of index.html', function(assert) {
  var harness = createPresentationHarness();
  var pres_path = 'C:/tmp/presentation';
  var index_path = path.join(pres_path, 'index.html');

  harness.setExistingFiles([]);
  assert.equal(harness.presentation._checkPresentation('openPresentation', pres_path), false);

  harness.setExistingFiles([index_path]);
  assert.equal(harness.presentation._checkPresentation('openPresentation', pres_path), true);
}, { tags: ['unit', 'presentation'] });

tests.add('_startPresentation resolves URL parsed from server stdout line', async function(assert) {
  var harness = createPresentationHarness();
  var promise = harness.presentation._startPresentation('C:/server.exe');

  var child = harness.getLastChild();
  assert.ok(child);
  process.nextTick(function() {
    child.stdout.emit('data', 'url:http://127.0.0.1:1234\n');
  });

  var url = await promise;
  assert.equal(url, 'http://127.0.0.1:1234');
  assert.equal(harness.spawn_calls.length, 1);
  assert.equal(harness.spawn_calls[0].exe_file, 'C:/server.exe');
}, { tags: ['unit', 'presentation'] });

tests.add('_fileToBuffer writes JS wrapper with encoded path and base64 payload', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var rel = path.join('assets', 'sample.bin');
    var abs = path.join(tmp_dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, Buffer.from([1, 2, 3, 4]));

    harness.presentation._fileToBuffer(tmp_dir, rel);

    assert.equal(harness.write_calls.length, 1);
    assert.equal(harness.write_calls[0].file_path, abs + '.buf.js');
    assert.ok(harness.write_calls[0].content.includes('registerFile("assets%2Fsample.bin"'));
    assert.ok(harness.write_calls[0].content.includes('AQIDBA=='));
  });
}, { tags: ['unit', 'presentation'] });

tests.add('createPresentation writes globals.js with language provider for window scripts', function(assert) {
  withTempDir(function(tmp_dir) {
    var harness = createPresentationHarness();
    var pres_path = path.join(tmp_dir, 'language-pres');

    harness.presentation.createPresentation(pres_path, {}, false);

    var globals_path = path.join(pres_path, 'res', 'internal', 'globals.js');
    var globals_write = harness.write_calls.find(function(entry) {
      return entry.file_path === globals_path;
    });

    assert.ok(!!globals_write);
    assert.ok(globals_write.content.includes('window.language'));
    assert.ok(globals_write.content.includes('"315":"LANG_315"'));
    assert.ok(globals_write.content.includes('"316":"LANG_316"'));
    assert.ok(globals_write.content.includes('"317":"LANG_317"'));
    assert.ok(globals_write.content.includes('"318":"LANG_318"'));
    assert.ok(globals_write.content.includes('"363":"LANG_363"'));
  });
}, { tags: ['unit', 'presentation'] });

exports.MODULE_TESTS = tests;
