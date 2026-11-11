/**
 * @file Main window menus, dialogs, terminal controls and shortcuts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest, sent } = require('../../dev/gui-test-utils');
const { root } = require('../../dev/gui-test-fixture');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }

for(const [selector, action] of [
  ['#editor-menu', 'show-editor'], ['#win-close', 'close-app'], ['#win-minimize', 'minimize-win']
]) {
  guiTest(tests, 'main', selector + ' sends ' + action, [selector], function(assert, f) {
    f.click(selector); sent(assert, f, 'MainProcess', action);
  });
}

guiTest(tests, 'main', 'maximize and restore update state and resize icon', ['#win-restore'], function(assert, f, c) {
  f.click('#win-restore'); sent(assert, f, 'MainProcess', 'maximize-win');
  assert.equal(c.gui.maximized, true);
  f.click('#win-restore'); sent(assert, f, 'MainProcess', 'restore-win');
  assert.equal(c.gui.maximized, false);
  f.setSyncResult('is-maximized-win', true);
  f.window.dispatchEvent(new f.window.Event('resize'));
  assert.ok(f.query('#win-restore img').src.endsWith('win-restore.svg'));
});

for(const name of ['help', 'info', 'settings', 'paths']) {
  for(const close of ['button', 'escape']) {
    guiTest(tests, 'main', name + ' dialog opens and closes with ' + close,
      ['#' + name + '-menu', '#' + name + '-close'], function(assert, f, c) {
        c.command_window.code_input.focus();
        f.click('#' + name + '-menu');
        assert.equal(f.visible('#' + name + '-container'), true);
        if(close === 'button') f.click('#' + name + '-close');
        else f.key('#' + name + '-container', 'Escape');
        assert.equal(f.visible('#' + name + '-container'), false);
        assert.ok(c.command_window.code_input.hasFocus());
      });
  }
}

guiTest(tests, 'main', 'opening another dialog closes the previous dialog', ['#help-menu', '#settings-menu'], function(assert, f) {
  f.click('#help-menu'); f.click('#settings-menu');
  assert.equal(f.visible('#help-container'), false);
  assert.equal(f.visible('#settings-container'), true);
});

guiTest(tests, 'main', 'language selector broadcasts the selected language', ['#settings-container .set-language'], function(assert, f) {
  f.input('#settings-container .set-language', 'rs', 'change');
  assert.equal(f.window.language.lang, 'rs');
  assert.equal(sent(assert, f, 'EditorWindow', 'set-language'), 'rs');
  assert.equal(sent(assert, f, 'SandboxWindow', 'set-language'), 'rs');
});

guiTest(tests, 'main', 'history limit setting clamps low values and persists',
  ['#settings-container .N-history-max', '#settings-container .change-settings'], function(assert, f, c) {
    f.click('#settings-menu'); f.input('#settings-container .N-history-max', '2');
    f.click('#settings-container .change-settings');
    assert.equal(Number(c.command_history.N_history_max), 5);
    assert.equal(Number(f.data.get('N_history_max')), 5);
    assert.equal(f.visible('#settings-container'), false);
  });

for(const [suffix, expected] of [['change-dir', 'set-current-path'], ['save', 'set-saved-paths'], ['run', null]]) {
  guiTest(tests, 'main', 'script directory dialog ' + suffix + ' resumes script', ['#script-path-dialog-' + suffix], function(assert, f, c) {
    c.eval.last_script_path = path.join(root, 'js', 'fixture.jsl');
    c.gui.openDialog(f.window.$('#script-path-container'));
    f.calls.length = 0;
    f.click('#script-path-dialog-' + suffix);
    if(expected) sent(assert, f, 'SandboxWindow', expected);
    sent(assert, f, 'SandboxWindow', 'run-last-script');
    assert.equal(f.visible('#script-path-container'), false);
  });
}
for(const close of ['button', 'escape']) {
  guiTest(tests, 'main', 'script directory dialog dismisses with ' + close, ['#script-path-close'], function(assert, f, c) {
    c.gui.openDialog(f.window.$('#script-path-container'));
    if(close === 'button') f.click('#script-path-close'); else f.key('#script-path-container', 'Escape');
    assert.equal(f.visible('#script-path-container'), false);
  });
}

for(const [name, property, store_key] of [['timestamp', 'show_timestamp', 'show_timestamp'], ['autoscroll', 'autoscroll', 'autoscroll']]) {
  var selector = '#command-window-options .' + name;
  guiTest(tests, 'main', name + ' button toggles and persists both states', [selector], function(assert, f, c) {
    var original = c.command_window[property];
    f.click('#command-window-options .' + name);
    assert.equal(c.command_window[property], !original);
    assert.equal(f.data.get(store_key), !original);
    f.click('#command-window-options .' + name);
    assert.equal(c.command_window[property], original);
    assert.equal(f.query('#command-window-options .' + name).classList.contains('active'), original);
  });
}

for(const [name, container] of [['settings', 'settings'], ['log', 'log']]) {
  guiTest(tests, 'main', 'terminal ' + name + ' opens and closes',
    ['#command-window-options .' + name, '#command-window-' + container + ' .options-close'], function(assert, f) {
      f.click('#command-window-options .' + name);
      assert.equal(f.visible('#command-window-' + container), true);
      f.click('#command-window-' + container + ' .options-close');
      assert.equal(f.visible('#command-window-' + container), false);
      f.click('#command-window-options .' + name);
      f.key('#command-window-' + container, 'Escape');
      assert.equal(f.visible('#command-window-' + container), false);
    });
}

guiTest(tests, 'main', 'terminal message limit applies and clamps to the minimum',
  ['#command-window-settings .N-messages-max', '#command-window-settings .change-settings'], function(assert, f, c) {
    f.click('#command-window-options .settings');
    f.input('#command-window-settings .N-messages-max', '1');
    f.click('#command-window-settings .change-settings');
    assert.equal(c.command_window.N_messages_max, c.command_window.min_messages_max);
    assert.equal(f.data.get('N_messages_max'), c.command_window.min_messages_max);
    assert.equal(f.visible('#command-window-settings'), false);
  });

guiTest(tests, 'main', 'log timestamp checkbox and save button affect the exported log',
  ['#command-window-log .write-timestamps', '#command-window-log .save-log'], async function(assert, f, c) {
    c.command_window.message('GUI log sample');
    f.click('#command-window-options .log');
    f.click('#command-window-log .write-timestamps');
    assert.equal(c.command_window.write_timestamps, false);
    assert.equal(f.data.get('write_timestamps'), false);
    f.setDialogResult({ canceled: false, filePath: 'gui-test.log' });
    f.click('#command-window-log .save-log'); await f.tick();
    assert.ok(f.files.get('gui-test.log').includes('GUI log sample'));
    assert.equal(f.visible('#command-window-log'), false);
  });

guiTest(tests, 'main', 'terminal clear removes rendered messages', ['#command-window-options .clear'], function(assert, f, c) {
  c.command_window.message('transient message'); f.click('#command-window-options .clear');
  assert.equal(f.query('#command-window-messages').textContent.includes('transient message'), false);
});
guiTest(tests, 'main', 'scroll to bottom restores command input focus', ['#command-window-options .to-bottom'], function(assert, f, c) {
  f.click('#command-window-options .to-bottom'); assert.ok(c.command_window.code_input.hasFocus());
});

for(const submit of ['button', 'enter']) {
  guiTest(tests, 'main', 'command input submits with ' + submit,
    ['#command-window-input', '#command-window-input-submit-cont'], async function(assert, f, c) {
      c.command_window.code_input.setValue('2 + 3');
      if(submit === 'button') f.click('#command-window-input-submit-cont');
      else c.command_window.code_input.getOption('extraKeys').Enter(c.command_window.code_input);
      await f.tick();
      assert.equal(sent(assert, f, 'SandboxWindow', 'eval-code')[0], '2 + 3');
      assert.equal(c.command_window.code_input.getValue(), '');
      assert.equal(c.command_history.history[0], '2 + 3');
    });
}

guiTest(tests, 'main', 'stats popup opens and closes outside', ['#sandbox-stats-icon'], async function(assert, f, c) {
  c.gui.setStats({ required_modules: 1, promises: 2, timeouts: 3, immediates: 0, intervals: 0, animation_frames: 0, idle_callbacks: 0 });
  assert.equal(f.query('#sandbox-promises-num').textContent, '2');
  assert.ok(f.query('#sandbox-stats-icon').classList.contains('async-busy'));
  f.click('#sandbox-stats-icon'); await f.waitFor(() => f.visible('#sandbox-stats-popup'), 'stats popup');
  await f.tick();
  assert.equal(f.visible('#sandbox-stats-popup'), true);
  f.document.body.click(); await f.waitFor(() => !f.visible('#sandbox-stats-popup'), 'stats popup dismissal');
  assert.equal(f.visible('#sandbox-stats-popup'), false);
});

for(const [key, options, action] of [
  ['F11', {}, 'set-fullscreen'], ['F12', {}, 'show-dev-tools'],
  ['c', { ctrlKey: true }, 'interrupt-execution']
]) {
  guiTest(tests, 'main', 'main keyboard shortcut ' + key, [], function(assert, f) {
    f.key(null, key, options);
    sent(assert, f, action === 'interrupt-execution' ? 'SandboxWindow' : 'MainProcess', action);
  });
}
for(const [key, dialog] of [['h', 'help'], ['i', 'info'], ['s', 'settings']]) {
  guiTest(tests, 'main', 'Ctrl+' + key + ' opens ' + dialog, [], function(assert, f) {
    assert.equal(f.key(null, key, { ctrlKey: true }).defaultPrevented, true);
    assert.equal(f.visible('#' + dialog + '-container'), true);
  });
}

guiTest(tests, 'main', 'main window links open externally without navigating the window', ['a[href]'], function(assert, f) {
  var links = [...f.document.querySelectorAll('a[href]')];
  for(const link of links) {
    link.click(); assert.equal(f.calls.at(-1)[0], 'external'); assert.equal(f.calls.at(-1)[1], link.href);
  }
});

exports.MODULE_TESTS = tests;
