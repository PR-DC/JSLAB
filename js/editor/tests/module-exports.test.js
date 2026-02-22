/**
 * @file JSLAB editor module export tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function setWritableAppData() {
  var appdata = process.env.APPDATA || '';
  try {
    if(!appdata.length) {
      throw new Error('missing APPDATA');
    }
    fs.mkdirSync(path.join(appdata, 'electron-store-nodejs', 'Config'), { recursive: true });
  } catch(err) {
    appdata = path.join(process.cwd(), 'temp', 'test-appdata-editor');
    try {
      fs.mkdirSync(appdata, { recursive: true });
    } catch(err2) {
      appdata = path.join(os.tmpdir(), 'jslab-test-appdata-editor');
      fs.mkdirSync(appdata, { recursive: true });
    }
    process.env.APPDATA = appdata;
  }
}

var MODULE_EXPORTS = [
  ['../editor', 'PRDC_JSLAB_EDITOR'],
  ['../script-manager', 'PRDC_JSLAB_EDITOR_SCRIPT_MANAGER'],
  ['../script', 'PRDC_JSLAB_EDITOR_SCRIPT'],
  ['../search-all', 'PRDC_JSLAB_EDITOR_SEARCH_ALL'],
  ['../symbol-input', 'PRDC_JSLAB_EDITOR_SYMBOL_INPUT'],
  ['../win-editor', 'PRDC_JSLAB_WIN_EDITOR']
];

tests.add('all editor modules export their expected classes', function(assert) {
  setWritableAppData();
  MODULE_EXPORTS.forEach(function(entry) {
    var module_path = entry[0];
    var export_name = entry[1];
    var loaded = require(module_path);
    assert.equal(typeof loaded[export_name], 'function', module_path + ' -> ' + export_name);
  });
}, { tags: ['unit', 'editor', 'smoke'] });

exports.MODULE_TESTS = tests;
