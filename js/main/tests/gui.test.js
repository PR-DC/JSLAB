/**
 * @file JSLAB main GUI tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_GUI } = require('../gui');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createClassListRecorder() {
  var classes = [];
  return {
    classes: classes,
    add: function(cls) {
      classes.push(cls);
    }
  };
}

tests.add('setStatsIcon switches icon class by state and async counters', function(assert) {
  var gui = Object.create(PRDC_JSLAB_GUI.prototype);
  var class_list = createClassListRecorder();
  gui.sandbox_stats_icon = { className: 'prev', classList: class_list };

  gui.state = 'ready';
  gui.stats_num = 0;
  gui.setStatsIcon();
  assert.equal(class_list.classes[class_list.classes.length - 1], 'ready');

  gui.state = 'ready';
  gui.stats_num = 3;
  gui.setStatsIcon();
  assert.equal(class_list.classes[class_list.classes.length - 1], 'async-busy');

  gui.state = 'busy';
  gui.stats_num = 0;
  gui.setStatsIcon();
  assert.equal(class_list.classes[class_list.classes.length - 1], 'busy');
}, { tags: ['unit', 'main', 'gui'] });

tests.add('toggleFullscreen and changeLangauge dispatch ipc messages', function(assert) {
  var sent = [];
  global.ipcRenderer = {
    send: function(channel, action, data) {
      sent.push({ channel, action, data });
    }
  };
  var lang_set = null;
  global.language = {
    set: function(id) {
      lang_set = id;
    }
  };

  var gui = Object.create(PRDC_JSLAB_GUI.prototype);
  gui.fullscreen = false;

  gui.toggleFullscreen(true);
  assert.equal(gui.fullscreen, true);
  assert.equal(sent[0].channel, 'MainProcess');
  assert.equal(sent[0].action, 'set-fullscreen');
  assert.equal(sent[0].data, true);

  gui.changeLangauge(2);
  assert.equal(lang_set, 2);
  assert.equal(sent[1].channel, 'EditorWindow');
  assert.equal(sent[2].channel, 'SandboxWindow');
}, { tags: ['unit', 'main', 'gui'] });

exports.MODULE_TESTS = tests;

