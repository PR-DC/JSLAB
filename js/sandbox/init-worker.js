/**
 * @file Init worker
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
"use strict";

global.fs = require('fs');
global.path = require('path');
global.app_path = process.argv.find(e => e.startsWith('--app-path=')).split('=')[1].replace(/\\js\\?$/, '');

// Global variables
global.win = self;
global.worker_module;

/**
 * Handle messages
 */
self.addEventListener("message", function(e) {
  if(e.data.type == 'configureWorker') {
    var { PRDC_WORKER } = require(e.data.module_path);
    global.worker_module = new PRDC_WORKER();
  } else if(global.worker_module && e.data.hasOwnProperty('method')) {
    global.worker_module[e.data.method](e.data);
  }
});