/**
 * @file Presentation editor navigation, source tabs, notes and document actions
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

/**
 * Loads the presentation editor with an isolated preview/webview boundary.
 * @param {Object} f Fixture.
 * @returns {Object} Presentation editor controller.
 */
function setup(f) {
  Object.defineProperty(f.window, 'opener', { value: { jsl: { inter: { lang: f.window.language } } } });
  f.window.HTMLElement.prototype.send = function(channel, payload) { f.calls.push(['preview', channel, payload]); };
  f.window.HTMLElement.prototype.executeJavaScript = async function(code) { f.calls.push(['preview-js', code]); return true; };
  f.window.HTMLElement.prototype.reload = function() { f.calls.push(['preview-reload']); };
  var controller = f.load(path.join(root, 'js/windows/presentation-editor.js'), ['presentation_editor']).presentation_editor;
  var folder = path.join(root, 'gui-presentation-fixture');
  f.files.set(path.join(folder, 'index.html'), '<slides>\n<slide><p>First</p><notes>First notes</notes></slide>\n<slide><p>Second</p><notes>Second notes</notes></slide>\n</slides>');
  f.files.set(path.join(folder, 'main.js'), '// source');
  f.files.set(path.join(folder, 'main.css'), 'slide { color: red; }');
  f.files.set(path.join(folder, 'res/internal/config.json'), JSON.stringify({ slide_width: 1280, slide_height: 720 }));
  controller.setPath(folder, 'about:blank');
  controller.total_slides = 2;
  return controller;
}

for(const [selector, current, expected] of [
  ['#first-slide', 1, 0], ['#prev-slide', 1, 0], ['#next-slide', 0, 1], ['#last-slide', 0, 1]
]) {
  guiTest(tests, 'presentation-editor', 'presentation ' + selector + ' navigates preview', [selector], function(assert, f) {
    var c = setup(f); c.current_slide = current; f.click(selector);
    assert.equal(f.calls.at(-1)[0], 'preview'); assert.equal(f.calls.at(-1)[2].show, expected);
  });
}
guiTest(tests, 'presentation-editor', 'presentation slide selector uses one-based input', ['#set-slide'], function(assert, f) {
  setup(f); f.input('#set-slide', '2', 'change'); assert.equal(f.calls.at(-1)[2].show, 1);
});
guiTest(tests, 'presentation-editor', 'presentation code tabs retain HTML, JS and CSS independently', ['.tab-drag-handle'], function(assert, f) {
  var c = setup(f);
  for(const tab of [c.js_editor, c.css_editor, c.html_editor]) {
    var handle = tab.tab.querySelector('.tab-drag-handle'), rect = handle.getBoundingClientRect();
    f.pointer(handle, 'pointerdown', rect.left + 3, rect.top + 3);
    f.pointer(f.document, 'pointerup', rect.left + 3, rect.top + 3);
    assert.equal(c.active_tab, tab.tab);
    assert.equal(f.window.$(tab.code_editor.getWrapperElement()).is(':visible'), true);
  }
});
guiTest(tests, 'presentation-editor', 'presentation save writes changed code and clears dirty state', ['#tab-save'], async function(assert, f) {
  var c = setup(f); c.js_editor.code_editor.setValue('// updated');
  assert.equal(c.js_editor.tab.classList.contains('changed'), true);
  f.click('#tab-save'); await f.tick();
  assert.equal(f.files.get(c.js_editor.file_path), '// updated');
  assert.equal(c.js_editor.tab.classList.contains('changed'), false);
});
for(const choice of ['save', 'discard', 'cancel']) {
  guiTest(tests, 'presentation-editor', 'presentation unsaved close ' + choice, ['#close-dialog-' + choice], async function(assert, f) {
    var c = setup(f); c.js_editor.code_editor.setValue('// unsaved'); c.requestClose();
    assert.equal(f.visible('#close-dialog-cont'), true); f.click('#close-dialog-' + choice); await f.tick();
    assert.equal(f.visible('#close-dialog-cont'), false);
    if(choice !== 'cancel') sent(assert, f, 'MainProcess', 'close-presentation-editor');
    assert.equal(f.files.get(c.js_editor.file_path), choice === 'save' ? '// unsaved' : '// source');
  });
}
guiTest(tests, 'presentation-editor', 'slide notes edit updates the corresponding HTML notes', ['#slide-notes-body'], function(assert, f) {
  var c = setup(f); c.current_slide = 0; c.updateSlideNotes();
  f.input('#slide-notes-body', 'Edited notes');
  assert.ok(c.html_editor.code_editor.getValue().includes('Edited notes'));
  assert.equal(c.html_editor.tab.classList.contains('changed'), true);
});
for(const [selector, count] of [['#fold-slides', 2], ['#unfold-slides', 0]]) {
  guiTest(tests, 'presentation-editor', 'presentation ' + selector + ' controls slide folds', [selector], function(assert, f) {
    var c = setup(f);
    if(selector === '#unfold-slides') f.click('#fold-slides');
    f.click(selector);
    var folds = c.html_editor.code_editor.getAllMarks().filter(mark => mark.collapsed);
    assert.equal(folds.length, count);
  });
}
guiTest(tests, 'presentation-editor', 'presentation more popup and find/search-all menus open',
  ['#editor-more-icon', '#search-dialog-menu', '#search-all-menu'], async function(assert, f) {
    var c = setup(f); f.click('#editor-more-icon'); await f.waitFor(() => f.visible('#editor-more-popup'), 'presentation popup');
    f.click('#search-dialog-menu'); assert.equal(f.window.$(c.active_tab.tab_obj.code_editor.getWrapperElement()).find('.CodeMirror-search-dialog').is(':visible'), true);
    f.click('#search-all-menu'); assert.equal(f.visible('#editor-search-all-panel'), true);
  });

guiTest(tests, 'presentation-editor', 'presentation search-all controls find, replace, toggle options and close',
  ['#editor-search-all-input', '#editor-search-all-replace-input', '#editor-search-all-case-btn', '#editor-search-all-regex-btn',
    '#editor-search-all-run', '#editor-search-all-close', '#editor-search-all-replace-btn', '#editor-search-all-replace-all-btn'], function(assert, f) {
    var c = setup(f); f.click('#search-all-menu');
    f.input('#editor-search-all-input', 'First'); f.click('#editor-search-all-run');
    assert.ok(f.query('#editor-search-all-summary').textContent.startsWith('2 /'));
    f.click('#editor-search-all-case-btn'); assert.equal(c.editor_search_all.case_sensitive, true);
    f.click('#editor-search-all-regex-btn'); assert.equal(c.editor_search_all.use_regex, true);
    f.input('#editor-search-all-replace-input', 'Replaced'); f.click('#editor-search-all-replace-btn');
    assert.ok(c.html_editor.code_editor.getValue().includes('Replaced'));
    f.click('#editor-search-all-replace-all-btn');
    assert.equal(c.html_editor.code_editor.getValue().includes('First'), false);
    f.click('#editor-search-all-close'); assert.equal(f.visible('#editor-search-all-panel'), false);
  });

guiTest(tests, 'presentation-editor', 'presentation document find controls navigate, replace and close',
  ['.CodeMirror-search-find', '.CodeMirror-search-replace', '.CodeMirror-search-find-next-btn', '.CodeMirror-search-find-prev-btn',
    '.CodeMirror-search-replace-btn', '.CodeMirror-search-replace-all-btn', '.CodeMirror-search-case-btn', '.CodeMirror-search-regex-btn', '.CodeMirror-search-close-btn'], function(assert, f) {
    var c = setup(f), cm = c.html_editor.code_editor; cm.setValue('word word'); cm.setCursor(0, 0);
    f.click('#search-dialog-menu'); f.input('.CodeMirror-search-find', 'word');
    f.click('.CodeMirror-search-find-next-btn'); assert.equal(cm.getSelection(), 'word');
    var first = cm.getCursor('from').ch;
    f.click('.CodeMirror-search-find-next-btn'); assert.ok(cm.getCursor('from').ch !== first);
    f.click('.CodeMirror-search-find-prev-btn'); assert.equal(cm.getCursor('from').ch, first);
    f.click('.CodeMirror-search-case-btn'); assert.equal(cm.search_match_case, true);
    f.click('.CodeMirror-search-regex-btn'); assert.equal(cm.search_regex, true);
    f.input('.CodeMirror-search-replace', 'new'); f.click('.CodeMirror-search-replace-btn');
    assert.ok(cm.getValue().includes('new'));
    f.click('.CodeMirror-search-replace-all-btn'); assert.equal(cm.getValue().includes('word'), false);
    f.click('.CodeMirror-search-close-btn'); assert.equal(f.visible('.CodeMirror-search-dialog'), false);
  });

for(const [action, expected] of [['insert-slide-after', 3], ['duplicate-slide', 3], ['delete-slide', 1]]) {
  guiTest(tests, 'presentation-editor', 'presentation thumbnail menu ' + action + ' edits slide source', [], async function(assert, f) {
    var c = setup(f); f.emit('PresentationEditorWindow', action, { index: 0 }); await f.tick();
    assert.equal(c.getSlideSourceData().blocks.length, expected);
  });
}

guiTest(tests, 'presentation-editor', 'presentation divider and search resizer resize their panels', ['#editor-search-all-resizer'], function(assert, f) {
  var c = setup(f); c.columns.onResize();
  var divider = f.query('body > .vertical-resizer'), before = c.columns.cells_size[0];
  f.mouse(divider, 'mousedown', 300, 100); f.mouse(f.document, 'mousemove', 700, 100); f.mouse(f.document, 'mouseup', 700, 100);
  assert.ok(c.columns.cells_size[0] !== before);
  c.editor_search_all.open(); var height = c.editor_search_all.panel_height;
  f.mouse(f.query('#editor-search-all-resizer'), 'mousedown', 300, 500);
  f.mouse(f.document, 'mousemove', 300, 450); f.mouse(f.document, 'mouseup', 300, 450);
  assert.ok(c.editor_search_all.panel_height > height);
});

exports.MODULE_TESTS = tests;
exports.setup = setup;
