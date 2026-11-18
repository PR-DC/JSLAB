/**
 * @file Native compiler platform fixture for Simulate unit tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_SIMULATE_COMPILER } = require('../compiler');
const { PRDC_JSLAB_SIMULATE_ASSETS } = require('../../backend-electron/simulate-assets');
PRDC_JSLAB_SIMULATE_COMPILER.configure(PRDC_JSLAB_SIMULATE_ASSETS);
exports.PRDC_JSLAB_SIMULATE_COMPILER = PRDC_JSLAB_SIMULATE_COMPILER;
