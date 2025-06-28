/**
 * @file JSLAB sandbox window init file
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
// Modules
// --------------------
const helper = require("../js/helper.js");
require("../js/init-config.js");
const { PRDC_JSLAB_LANGUAGE } = require('../js/language');

global.app_path = process.argv.find(e => e.startsWith('--app-path=')).split('=')[1].replace(/\\js\\?$/, '');

const { PRDC_JSLAB_LIB } = require('../js/sandbox/jslab');

// Global variables
global.language = new PRDC_JSLAB_LANGUAGE();
var jsl = new PRDC_JSLAB_LIB();

if(config.TEST) {
  const { PRDC_JSLAB_TESTER } = require("../js/tester.js");
  tester = new PRDC_JSLAB_TESTER('sandbox');
  tester.runTests();
}