/**
 * @file JSLAB main folder navigation tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
function ensureWritableAppData() {
  var appdata = process.env.APPDATA || '';
  try {
    if(!appdata.length) {
      throw new Error('missing APPDATA');
    }
    fs.mkdirSync(path.join(appdata, 'electron-store-nodejs', 'Config'), { recursive: true });
  } catch(err) {
    appdata = path.join(process.cwd(), 'temp', 'test-appdata-main');
    try {
      fs.mkdirSync(appdata, { recursive: true });
    } catch(err2) {
      appdata = path.join(os.tmpdir(), 'jslab-test-appdata-main');
      fs.mkdirSync(appdata, { recursive: true });
    }
    process.env.APPDATA = appdata;
  }
}
ensureWritableAppData();

const { PRDC_JSLAB_FOLDER_NAVIGATION } = require('../folder-navigation');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('addPathSep appends separator only when needed', function(assert) {
  var nav = Object.create(PRDC_JSLAB_FOLDER_NAVIGATION.prototype);
  var out1 = nav.addPathSep('C:\\A');
  var out2 = nav.addPathSep('C:\\A\\');
  assert.equal(out1.endsWith(path.sep), true);
  assert.equal(out2, 'C:\\A\\');
}, { tags: ['unit', 'main', 'folder-navigation'] });

tests.add('checkDirectory and checkFile validate filesystem paths', function(assert) {
  var nav = Object.create(PRDC_JSLAB_FOLDER_NAVIGATION.prototype);
  var temp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-folder-nav-'));
  var temp_file = path.join(temp_dir, 'a.jsl');
  fs.writeFileSync(temp_file, 'x');
  try {
    assert.equal(nav.checkDirectory(temp_dir), true);
    assert.equal(nav.checkFile(temp_file), true);
    assert.equal(nav.checkDirectory(temp_file), false);
    assert.equal(nav.checkFile(path.join(temp_dir, 'missing.jsl')), false);
  } finally {
    fs.rmSync(temp_dir, { recursive: true, force: true });
  }
}, { tags: ['unit', 'main', 'folder-navigation'] });

tests.add('unknownScriptDir returns false when last script path is missing', function(assert) {
  var nav = Object.create(PRDC_JSLAB_FOLDER_NAVIGATION.prototype);
  var opened = false;
  nav.win = {
    eval: {
      last_script_path: undefined
    },
    gui: {
      openDialog: function() {
        opened = true;
      }
    }
  };
  var out = nav.unknownScriptDir();
  assert.equal(out, false);
  assert.equal(opened, false);
}, { tags: ['unit', 'main', 'folder-navigation'] });

exports.MODULE_TESTS = tests;
