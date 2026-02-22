/**
 * @file JSLAB internal protected module constants tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  CORE_INTERNAL_MODULE_NAMES,
  CHECKER_PROTECTED_SLOT_NAMES
} = require('../internal-protected-modules');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('core internal module names include required protected slots', function(assert) {
  assert.ok(Array.isArray(CORE_INTERNAL_MODULE_NAMES));
  assert.ok(CORE_INTERNAL_MODULE_NAMES.includes('env'));
  assert.ok(CORE_INTERNAL_MODULE_NAMES.includes('eval'));
  assert.ok(CORE_INTERNAL_MODULE_NAMES.includes('override'));
  assert.ok(CORE_INTERNAL_MODULE_NAMES.includes('plotter'));
  assert.ok(CORE_INTERNAL_MODULE_NAMES.includes('context'));
}, { tags: ['unit', 'internal'] });

tests.add('checker protected slots include lang and config', function(assert) {
  assert.ok(Array.isArray(CHECKER_PROTECTED_SLOT_NAMES));
  assert.deepEqual(CHECKER_PROTECTED_SLOT_NAMES.slice().sort(), ['config', 'lang']);
}, { tags: ['unit', 'internal'] });

tests.add('protected module arrays are frozen and keep unique entries', function(assert) {
  var core_len = CORE_INTERNAL_MODULE_NAMES.length;
  var checker_len = CHECKER_PROTECTED_SLOT_NAMES.length;
  try {
    CORE_INTERNAL_MODULE_NAMES.push('new-slot');
  } catch(_err) {}
  try {
    CHECKER_PROTECTED_SLOT_NAMES.push('new-slot');
  } catch(_err) {}

  assert.equal(Object.isFrozen(CORE_INTERNAL_MODULE_NAMES), true);
  assert.equal(Object.isFrozen(CHECKER_PROTECTED_SLOT_NAMES), true);
  assert.equal(CORE_INTERNAL_MODULE_NAMES.length, core_len);
  assert.equal(CHECKER_PROTECTED_SLOT_NAMES.length, checker_len);
  assert.equal(new Set(CORE_INTERNAL_MODULE_NAMES).size, CORE_INTERNAL_MODULE_NAMES.length);
  assert.equal(new Set(CHECKER_PROTECTED_SLOT_NAMES).size, CHECKER_PROTECTED_SLOT_NAMES.length);
}, { tags: ['unit', 'internal'] });

exports.MODULE_TESTS = tests;
