/**
 * @file Runs all headless JSLAB unit test suites and exits with aggregate status
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

"use strict";

const path = require('path');
const cp = require('child_process');

const app_root = path.resolve(__dirname, '..', '..');
const suite_runner = path.join(app_root, 'js', 'dev', 'run-test-suite.js');
const supported_suites = ['backend', 'main', 'editor', 'shared', 'code'];

function getArgValue(name, fallback) {
  var prefix = '--' + name + '=';
  var found = process.argv.find(function(arg) {
    return String(arg).startsWith(prefix);
  });
  if(!found) {
    return fallback;
  }
  return found.slice(prefix.length);
}

function runSuite(folder, extra_args) {
  var args = [suite_runner, '--folder=' + folder].concat(extra_args || []);
  console.log('\n=== Running suite: ' + folder + ' ===');
  var out = cp.spawnSync(process.execPath, args, {
    cwd: app_root,
    stdio: 'inherit'
  });
  return out.status === 0;
}

function main() {
  var only_suite = getArgValue('suite', '');
  var passthrough = process.argv.slice(2).filter(function(arg) {
    return String(arg).startsWith('--test-');
  });

  var suites = supported_suites.slice();
  if(only_suite.length) {
    suites = suites.filter(function(name) {
      return name === only_suite;
    });
    if(!suites.length) {
      console.error('Unknown suite "' + only_suite + '". Supported: ' + supported_suites.join(', '));
      process.exit(1);
      return;
    }
  }

  var failed = [];
  suites.forEach(function(folder) {
    var ok = runSuite(folder, passthrough);
    if(!ok) {
      failed.push(folder);
    }
  });

  console.log('\n=== Test run summary ===');
  if(failed.length) {
    console.log('Failed suites: ' + failed.join(', '));
    process.exit(1);
    return;
  }
  console.log('All suites passed: ' + suites.join(', '));
  process.exit(0);
}

main();
