/**
 * @file JSLAB backend script opener tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { PRDC_JSLAB_SCRIPT_OPENER } = require('../script-opener');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createTempScripts() {
  var base = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-script-opener-'));
  var valid = path.join(base, 'a.jsl');
  var invalid = path.join(base, 'a.txt');
  fs.writeFileSync(valid, '// ok');
  fs.writeFileSync(invalid, 'no');
  return { base, valid, invalid };
}

function createMainHarness(loading) {
  var records = {
    editor_messages: [],
    main_messages: [],
    show_editor_calls: 0,
    mark_calls: 0
  };
  var main = {
    showEditor: function() {
      records.show_editor_calls += 1;
    },
    win_editor: {
      isDestroyed: function() {
        return false;
      },
      webContents: {
        isLoading: function() {
          return !!loading;
        }
      },
      send: function(channel, action, data) {
        records.editor_messages.push({ channel, action, data });
      }
    },
    win_main: {
      isDestroyed: function() {
        return false;
      },
      send: function(channel, action, data) {
        records.main_messages.push({ channel, action, data });
      }
    },
    instance_router: {
      markAsLastActive: function() {
        records.mark_calls += 1;
      }
    }
  };
  return { main, records };
}

tests.add('isJslScriptPath accepts existing .jsl files only', function(assert) {
  var temp = createTempScripts();
  try {
    var opener = new PRDC_JSLAB_SCRIPT_OPENER({});
    assert.equal(opener.isJslScriptPath(temp.valid), true);
    assert.equal(opener.isJslScriptPath(temp.invalid), false);
    assert.equal(opener.isJslScriptPath(path.join(temp.base, 'missing.jsl')), false);
    assert.equal(opener.isJslScriptPath(''), false);
  } finally {
    fs.rmSync(temp.base, { recursive: true, force: true });
  }
}, { tags: ['unit', 'backend', 'script-opener'] });

tests.add('openScriptsInEditor queues files when editor is unavailable and flush opens later', function(assert) {
  var temp = createTempScripts();
  try {
    var queued = createMainHarness(true);
    var opener = new PRDC_JSLAB_SCRIPT_OPENER(queued.main);

    assert.equal(opener.openScriptsInEditor([temp.valid, temp.invalid]), false);
    assert.deepEqual(opener.pending_open_scripts, [temp.valid]);
    assert.equal(opener.openScriptsInEditor([temp.valid]), false);
    assert.deepEqual(opener.pending_open_scripts, [temp.valid]);

    queued.main.win_editor.webContents.isLoading = function() { return false; };
    opener.flushPendingOpenScripts();

    assert.equal(opener.pending_open_scripts.length, 0);
    assert.equal(queued.records.show_editor_calls, 1);
    assert.equal(queued.records.editor_messages.length, 1);
    assert.equal(queued.records.editor_messages[0].action, 'open-script');
    assert.equal(queued.records.main_messages[0].action, 'set-current-path');
    assert.equal(queued.records.mark_calls, 1);
  } finally {
    fs.rmSync(temp.base, { recursive: true, force: true });
  }
}, { tags: ['unit', 'backend', 'script-opener'] });

exports.MODULE_TESTS = tests;
