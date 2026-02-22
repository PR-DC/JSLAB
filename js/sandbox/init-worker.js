/**
 * @file Init worker
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.1
 */
"use strict";

const worker_scope = globalThis;
worker_scope.fs = require('fs');
worker_scope.path = require('path');

// Global variables
worker_scope.win = self;
worker_scope.worker_module = undefined;

/**
 * Handle messages
 */
self.addEventListener("message", function(e) {
  if(e.data.type == 'configureWorker') {
    var { PRDC_WORKER } = require(e.data.module_path);
    worker_scope.worker_module = new PRDC_WORKER();
  } else if(worker_scope.worker_module && e.data.hasOwnProperty('method')) {
    worker_scope.worker_module[e.data.method](e.data);
  }
});
