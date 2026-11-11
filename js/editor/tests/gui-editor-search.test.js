/**
 * @file Search across tabs and CodeMirror find/replace controls
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { guiTest } = require('../../dev/gui-test-utils');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }

function setup(f, c) {
  var m = c.script_manager;
  m.scripts[0].code_editor.setValue('Alpha alpha\nsecond alpha');
  f.click('#new-tab'); m.scripts[1].code_editor.setValue('alpha elsewhere');
  f.click('#search-all-menu');
  f.input('#editor-search-all-input', 'alpha');
}
for(const method of ['button', 'enter']) {
  guiTest(tests, 'editor', 'search all via ' + method + ' groups results from every tab',
    ['#search-all-menu', '#editor-search-all-input', '#editor-search-all-run'], function(assert, f, c) {
      setup(f, c);
      if(method === 'button') f.click('#editor-search-all-run'); else f.key('#editor-search-all-input', 'Enter');
      assert.equal(f.query('#editor-search-all-summary').textContent, '4 / 2');
      assert.equal(f.document.querySelectorAll('.editor-search-all-file').length, 2);
      assert.equal(f.document.querySelectorAll('.editor-search-all-item').length, 3);
    });
}

guiTest(tests, 'editor', 'search case toggle changes matches and active state', ['#editor-search-all-case-btn'], function(assert, f, c) {
  setup(f, c); f.click('#editor-search-all-run'); f.click('#editor-search-all-case-btn');
  assert.equal(f.query('#editor-search-all-summary').textContent, '3 / 2');
  assert.equal(f.query('#editor-search-all-case-btn').classList.contains('active'), true);
  f.click('#editor-search-all-case-btn');
  assert.equal(f.query('#editor-search-all-summary').textContent, '4 / 2');
});
guiTest(tests, 'editor', 'regex toggle searches expressions and displays invalid regex errors', ['#editor-search-all-regex-btn'], function(assert, f, c) {
  setup(f, c); f.input('#editor-search-all-input', 'a[a-z]+'); f.click('#editor-search-all-regex-btn');
  assert.equal(f.query('#editor-search-all-summary').textContent, '4 / 2');
  f.input('#editor-search-all-input', '['); f.click('#editor-search-all-run');
  assert.equal(f.document.querySelectorAll('.editor-search-all-item').length, 0);
  assert.ok(f.query('#editor-search-all-summary').textContent.length > 0);
  assert.equal(f.query('#editor-search-all-summary').style.color, 'rgb(207, 0, 15)');
});

for(const all of [false, true]) {
  for(const method of ['button', 'enter']) {
    guiTest(tests, 'editor', 'replace ' + (all ? 'all' : 'next') + ' via ' + method + ' edits the correct documents',
      ['#editor-search-all-replace-input', all ? '#editor-search-all-replace-all-btn' : '#editor-search-all-replace-btn'], function(assert, f, c) {
        setup(f, c); f.input('#editor-search-all-replace-input', 'changed');
        if(method === 'button') f.click(all ? '#editor-search-all-replace-all-btn' : '#editor-search-all-replace-btn');
        else f.key('#editor-search-all-replace-input', 'Enter', { shiftKey: all });
        assert.equal(c.script_manager.scripts[0].code_editor.getValue(), all ? 'changed changed\nsecond changed' : 'changed alpha\nsecond alpha');
        assert.equal(c.script_manager.scripts[1].code_editor.getValue(), all ? 'changed elsewhere' : 'alpha elsewhere');
        assert.equal(c.script_manager.scripts[0].tab.classList.contains('changed'), true);
      });
  }
}

for(const method of ['click', 'enter']) {
  guiTest(tests, 'editor', 'search result ' + method + ' activates its document and line', ['.editor-search-all-item'], function(assert, f, c) {
    setup(f, c); f.click('#editor-search-all-run');
    var result = f.document.querySelectorAll('.editor-search-all-item')[1];
    if(method === 'click') result.click();
    else result.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    assert.equal(c.script_manager.active_tab, c.script_manager.scripts[0].tab);
    assert.equal(c.script_manager.scripts[0].code_editor.getCursor().line, 1);
    assert.equal(result.classList.contains('active'), true);
  });
}

for(const method of ['button', 'escape-query', 'escape-replacement', 'keyboard-button']) {
  guiTest(tests, 'editor', 'search all closes with ' + method, ['#editor-search-all-close'], function(assert, f, c) {
    setup(f, c);
    if(method === 'button') f.click('#editor-search-all-close');
    if(method === 'escape-query') f.key('#editor-search-all-input', 'Escape');
    if(method === 'escape-replacement') f.key('#editor-search-all-replace-input', 'Escape');
    if(method === 'keyboard-button') f.key('#editor-search-all-close', 'Enter');
    assert.equal(f.visible('#editor-search-all-panel'), false);
  });
}

guiTest(tests, 'editor', 'Ctrl+Shift+F opens search all using selected text', [], function(assert, f, c) {
  var cm = c.script_manager.scripts[0].code_editor;
  cm.setValue('selection'); cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 9 });
  assert.equal(f.key(null, 'F', { ctrlKey: true, shiftKey: true }).defaultPrevented, true);
  assert.equal(f.query('#editor-search-all-input').value, 'selection');
  assert.equal(f.visible('#editor-search-all-panel'), true);
});

guiTest(tests, 'editor', 'Ctrl+Space requests editor completions without auto-inserting one match', [], function(assert, f, c) {
  var cm = c.script_manager.scripts[0].code_editor;
  var original = f.window.CodeMirror.commands.autocomplete;
  var received;
  f.window.CodeMirror.commands.autocomplete = function(editor, hint, options) {
    received = { editor: editor, hint: hint, options: options };
  };
  try {
    f.window.CodeMirror.keyMap.default['Ctrl-Space'](cm);
    assert.equal(received.editor, cm);
    assert.equal(received.hint, null);
    assert.equal(received.options.completeSingle, false);
  } finally {
    f.window.CodeMirror.commands.autocomplete = original;
  }
});

function findSetup(f, c) {
  var cm = c.script_manager.scripts[0].code_editor;
  cm.setValue('one two one'); cm.setCursor(0, 0);
  f.click('#search-dialog-menu');
  f.input('.CodeMirror-search-find', 'one');
  return cm;
}

guiTest(tests, 'editor', 'find menu opens the active document search dialog', ['#search-dialog-menu', '.CodeMirror-search-find'], function(assert, f, c) {
  findSetup(f, c); assert.equal(f.visible('.CodeMirror-search-dialog'), true);
});
guiTest(tests, 'editor', 'find next and previous navigate matches with wraparound',
  ['.CodeMirror-search-find-next-btn', '.CodeMirror-search-find-prev-btn'], function(assert, f, c) {
    var cm = findSetup(f, c);
    f.click('.CodeMirror-search-find-next-btn'); assert.equal(cm.getSelection(), 'one');
    var first = cm.getCursor('from').ch;
    f.click('.CodeMirror-search-find-next-btn'); assert.ok(cm.getCursor('from').ch !== first);
    f.click('.CodeMirror-search-find-prev-btn'); assert.equal(cm.getCursor('from').ch, first);
  });
for(const all of [false, true]) {
  guiTest(tests, 'editor', 'document replace ' + (all ? 'all' : 'next') + ' edits matching text',
    ['.CodeMirror-search-replace', all ? '.CodeMirror-search-replace-all-btn' : '.CodeMirror-search-replace-btn'], function(assert, f, c) {
      var cm = findSetup(f, c); f.click('.CodeMirror-search-find-next-btn');
      f.input('.CodeMirror-search-replace', 'new');
      f.click(all ? '.CodeMirror-search-replace-all-btn' : '.CodeMirror-search-replace-btn');
      assert.equal(cm.getValue(), all ? 'new two new' : 'one two new');
    });
}
for(const [selector, property] of [['.CodeMirror-search-case-btn', 'search_match_case'], ['.CodeMirror-search-regex-btn', 'search_regex']]) {
  guiTest(tests, 'editor', selector + ' toggles its search option', [selector], function(assert, f, c) {
    var cm = findSetup(f, c); f.click(selector);
    assert.equal(cm[property], true); assert.equal(f.query(selector).classList.contains('active'), true);
    f.click(selector); assert.equal(cm[property], false);
  });
}
guiTest(tests, 'editor', 'find close button and Escape restore editor focus', ['.CodeMirror-search-close-btn'], function(assert, f, c) {
  var cm = findSetup(f, c); f.click('.CodeMirror-search-close-btn');
  assert.equal(f.visible('.CodeMirror-search-dialog'), false); assert.ok(cm.hasFocus());
  f.click('#search-dialog-menu'); f.key('.CodeMirror-search-find', 'Escape');
  assert.equal(f.visible('.CodeMirror-search-dialog'), false);
});

exports.MODULE_TESTS = tests;
