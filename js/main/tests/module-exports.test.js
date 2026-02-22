/**
 * @file JSLAB main module export tests
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

var MODULE_EXPORTS = [
  ['../app', 'PRDC_JSLAB_APP'],
  ['../command-history', 'PRDC_JSLAB_COMMAND_HISTORY'],
  ['../command-window-diary', 'PRDC_JSLAB_COMMAND_WINDOW_DIARY'],
  ['../command-window-input', 'PRDC_JSLAB_COMMAND_WINDOW_INPUT'],
  ['../command-window-inspector', 'PRDC_JSLAB_COMMAND_WINDOW_INSPECTOR'],
  ['../command-window-messages', 'PRDC_JSLAB_COMMAND_WINDOW_MESSAGES'],
  ['../command-window-settings', 'PRDC_JSLAB_COMMAND_WINDOW_SETTINGS'],
  ['../command-window', 'PRDC_JSLAB_COMMAND_WINDOW'],
  ['../eval', 'PRDC_JSLAB_EVAL'],
  ['../file-browser', 'PRDC_JSLAB_FILE_BROWSER'],
  ['../folder-navigation', 'PRDC_JSLAB_FOLDER_NAVIGATION'],
  ['../gui', 'PRDC_JSLAB_GUI'],
  ['../help', 'PRDC_JSLAB_HELP'],
  ['../info', 'PRDC_JSLAB_INFO'],
  ['../panels', 'PRDC_JSLAB_PANELS'],
  ['../settings', 'PRDC_JSLAB_SETTINGS'],
  ['../win-main', 'PRDC_JSLAB_WIN_MAIN'],
  ['../workspace', 'PRDC_JSLAB_WORKSPACE']
];

tests.add('all main modules export their expected classes', function(assert) {
  setWritableAppData();
  MODULE_EXPORTS.forEach(function(entry) {
    var module_path = entry[0];
    var export_name = entry[1];
    var loaded = require(module_path);
    assert.equal(typeof loaded[export_name], 'function', module_path + ' -> ' + export_name);
  });
}, { tags: ['unit', 'main', 'smoke'] });

exports.MODULE_TESTS = tests;
