/**
 * @file JSLAB conversion submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('changeExtension and removeExtension manipulate paths', function(assert) {
  assert.equal(jsl.conversion.changeExtension('file.txt', 'jsl'), 'file.jsl');
  assert.equal(jsl.conversion.removeExtension('archive.tar.gz'), 'archive.tar');
}, { tags: ['unit', 'conversion'] });

tests.add('num2str respects precision', function(assert) {
  assert.equal(jsl.conversion.num2str(3.14159, 2), '3.14');
}, { tags: ['unit', 'conversion'] });

tests.add('numToHexStr builds uppercase padded hex', function(assert) {
  assert.equal(jsl.conversion.numToHexStr(255, 4, false), '00FF');
  assert.equal(jsl.conversion.numToHexStr(255, 4, true), '0x00FF');
}, { tags: ['unit', 'conversion'] });

tests.add('uint8 conversion helpers decode signed integers', function(assert) {
  assert.equal(jsl.conversion.uint8sToInt16(0x7F, 0xFF), 32767);
  assert.equal(jsl.conversion.uint8sToInt16(0xFF, 0xFF), -1);
  assert.equal(jsl.conversion.uint8sToInt32(0x00, 0x00, 0x00, 0x2A), 42);
}, { tags: ['unit', 'conversion'] });

tests.add('uint8sToFloat decodes IEEE754 float bytes', function(assert) {
  // 1.0f little-endian bytes
  assert.approx(jsl.conversion.uint8sToFloat(0x00, 0x00, 0x80, 0x3F), 1, 1e-6);
}, { tags: ['unit', 'conversion'] });

tests.add('round and roundIf provide deterministic rounding', function(assert) {
  assert.equal(jsl.conversion.round(3.14159, 3), 3.142);
  assert.equal(jsl.conversion.roundIf(2.5, 0), 3);
}, { tags: ['unit', 'conversion'] });

tests.add('arrayToHexStr and uint8ToString serialize bytes', function(assert) {
  assert.equal(jsl.conversion.arrayToHexStr([0, 255], true), '0x00 0xFF');
  assert.equal(jsl.conversion.uint8ToString(Uint8Array.from([65, 66, 67])), 'ABC');
}, { tags: ['unit', 'conversion'] });

tests.add('CSV conversion helpers return delimited text', function(assert) {
  var obj_csv = jsl.conversion.simpleObj2Csv({
    a: [1, 2],
    b: [3, 4]
  });
  assert.ok(obj_csv.includes('a,b'));
  assert.ok(obj_csv.includes('1,3'));

  var arr_csv = jsl.conversion.simpleArray2Csv([[1, 2], [3, 4]]);
  assert.ok(arr_csv.includes('1,2'));
  assert.ok(arr_csv.includes('3,4'));
}, { tags: ['unit', 'conversion'] });

exports.MODULE_TESTS = tests;
