/**
 * @file JSLAB mathjs-doc tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('mathjs-doc source defines PRDC_JSLAB_MATHJS_DOC class', function(assert) {
  var source = fs.readFileSync(path.join(__dirname, '..', 'mathjs-doc.js'), 'utf8');
  var context = {
    globalThis: {}
  };

  vm.runInNewContext(
    source + '\n;globalThis.__doc_class = PRDC_JSLAB_MATHJS_DOC;',
    context,
    { filename: 'mathjs-doc.js' }
  );

  assert.equal(typeof context.globalThis.__doc_class, 'function');
  assert.ok(new context.globalThis.__doc_class());
}, { tags: ['unit', 'mathjs-doc'] });

exports.MODULE_TESTS = tests;

