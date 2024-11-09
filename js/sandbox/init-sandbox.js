/**
 * @file JSLAB sandbox window init file
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
// Modules
// --------------------
const helper = require("../js/helper.js");
const { PRDC_APP_CONFIG } = require('../config/config');
const { PRDC_JSLAB_LANGUAGE } = require('../js/language');

global.app_path = process.argv.find(e => e.startsWith('--app-path=')).split('=')[1].replace(/\\js\\?$/, '');
global.packed = app_path.endsWith("\\app.asar");

const { PRDC_JSLAB_LIB } = require('../js/sandbox/jslab');

// Global variables
var config = new PRDC_APP_CONFIG();
global.language = new PRDC_JSLAB_LANGUAGE();
var jsl = new PRDC_JSLAB_LIB(config);

if(config.TEST) {
  const { PRDC_JSLAB_TESTER } = jsl._require("../js/tester.js");
  tester = new PRDC_JSLAB_TESTER('sandbox');
  tester.runTests();
}