/**
 * @file Init config
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
"use strict";

const { PRDC_APP_CONFIG } = require("../config/config.js");

// Global variables
global.config = new PRDC_APP_CONFIG();

// Conditional variables
if(typeof global.process_arguments != 'undefined' && Array.isArray(global.process_arguments)) {
  var args = global.process_arguments.map(function(e) { return e.toLowerCase(); });
  if(args.includes("--debug-app")) {
    global.config.DEBUG = true;
  }
  if(args.includes("--test-app")) {
    global.config.TEST = true;
  }
  if(args.includes("--sign-build")) {
    global.config.SIGN_BUILD = true;
  }
}