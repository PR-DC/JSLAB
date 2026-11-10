/**
 * @file GUI instrumentation preserves strict directives and nested callbacks
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createRequire } = require('module');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
tests.add('GUI handler instrumentation preserves strict receivers and nested arrow return values', function(assert) {
  var filename = path.resolve(__dirname, '../../dev/gui-test-coverage.js'), module = { exports: {} };
  vm.runInThisContext('(function(require,module,exports,__dirname){' + fs.readFileSync(filename, 'utf8') + '\n})', { filename })(
    createRequire(filename), module, module.exports, path.dirname(filename));
  var callbacks = [], hits = [], context = {
    el: { addEventListener(event, callback) { callbacks.push(callback); return 7; } },
    __JSLAB_GUI_HIT__: id => hits.push(id)
  };
  var source = "el.addEventListener('click', function() { 'use strict'; return this; });" +
    "el.addEventListener('click', () => el.addEventListener('input', () => 42));";
  vm.runInNewContext(module.exports.instrument(source, path.resolve('temp/gui-instrumentation.js')), context);
  assert.equal(callbacks[0].call(undefined), undefined);
  assert.equal(callbacks[1](), 7);
  assert.equal(callbacks[2](), 42);
  assert.equal(new Set(hits).size, 3);
  assert.equal(module.exports.snapshot().total, 3);
}, { tags: ['gui', 'coverage'] });
exports.MODULE_TESTS = tests;
