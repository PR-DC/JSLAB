/**
 * @file Common feature-window policy tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_WINDOW_MANAGER } = require('../window-manager');
var tests = new PRDC_JSLAB_TESTS();

tests.add('window definitions remain independent and translate when requested', function(assert) {
  let language = 'en';
  const manager = new PRDC_JSLAB_WINDOW_MANAGER({}, id => language + ':' + id);
  const definition = manager.getFeatureDefinition('assistant');
  assert.equal(definition.file, 'assistant.html');
  assert.equal(definition.title, 'en:650');
  definition.width = 1;
  language = 'rs';
  assert.equal(manager.getFeatureDefinition('assistant').width, 760);
  assert.equal(manager.getFeatureDefinition('assistant').title, 'rs:650');
  assert.throws(() => manager.getFeatureDefinition('missing'), /Unknown/);
}, { tags: ['unit', 'windows'] });

tests.add('window focus policy isolates CLI sessions and rejects closed surfaces', function(assert) {
  const application = {};
  const manager = new PRDC_JSLAB_WINDOW_MANAGER(application, () => '');
  const calls = [];
  manager._isWindowClosed = win => win.closed;
  manager._showWindowSurface = win => calls.push(win.id);
  assert.equal(manager.focusFeatureWindow(null), false);
  assert.equal(manager.focusFeatureWindow({ id: 1, closed: true }), false);
  application.cli_mode = true;
  assert.equal(manager.focusFeatureWindow({ id: 2 }), false);
  application.cli_mode = false;
  assert.equal(manager.focusFeatureWindow({ id: 3 }), true);
  assert.deepEqual(calls, [3]);
}, { tags: ['unit', 'windows'] });

exports.MODULE_TESTS = tests;
