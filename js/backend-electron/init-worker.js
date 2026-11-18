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
const { PRDC_JSLAB_EXECUTION } = require('../sandbox/jslab-execution');
PRDC_JSLAB_EXECUTION.initializeModuleWorker(worker_scope, require, self);
