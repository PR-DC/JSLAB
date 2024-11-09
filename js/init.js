/**
 * @file JSLAB init app
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
"use strict";

const { app } = require('electron');
global.app_path = app.getAppPath().replace(/\\js\\?$/, '');

const helper = require("./helper.js");
const { PRDC_APP_CONFIG } = require('./../config/config');

const config = new PRDC_APP_CONFIG();
global.config = config;

const { PRDC_JSLAB_MAIN } = require("./main");

// Start main
const main = new PRDC_JSLAB_MAIN();