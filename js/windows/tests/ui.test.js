/**
 * @file Reusable UI playback timing regression tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_UI_ANIMATION } = require('../ui');
const tests = new PRDC_JSLAB_TESTS();

tests.add('UI playback follows timestamps and catches up after delayed rendering', function(assert) {
  const time = [5, 5.01, 5.01, 5.08, 5.5, 6];
  assert.deepEqual(PRDC_JSLAB_UI_ANIMATION.frameAt(time, 5, 10, false), { index: 2, finished: false });
  assert.deepEqual(PRDC_JSLAB_UI_ANIMATION.frameAt(time, 5, 520, false), { index: 4, finished: false });
  assert.deepEqual(PRDC_JSLAB_UI_ANIMATION.frameAt(time, 5, 1500, false), { index: 5, finished: true });
}, { tags: ['unit', 'simulate', 'playback'] });

tests.add('UI playback loops by duration and resumes from the selected timestamp', function(assert) {
  const time = [5, 5.25, 5.5, 5.75, 6];
  assert.deepEqual(PRDC_JSLAB_UI_ANIMATION.frameAt(time, 5, 2250, true), { index: 1, finished: false });
  assert.deepEqual(PRDC_JSLAB_UI_ANIMATION.frameAt(time, 5.5, 250, false), { index: 3, finished: false });
  assert.deepEqual(PRDC_JSLAB_UI_ANIMATION.frameAt([5, 5], 5, 40, true), { index: 1, finished: true });
}, { tags: ['unit', 'simulate', 'playback'] });

tests.add('UI loads in an Electron window with module but without an exports global', function(assert) {
  const fs = require('fs'), path = require('path'), vm = require('vm');
  var context = { module: { exports: {} }, document: { querySelector: () => null } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../ui.js'), 'utf8'), context);
  assert.equal(typeof context.ui.animation, 'function');
  assert.equal(typeof context.module.exports.PRDC_JSLAB_UI_ANIMATION, 'function');
  assert.equal(context.exports, undefined);
}, { tags: ['unit', 'ui', 'electron'] });

exports.MODULE_TESTS = tests;
