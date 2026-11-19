/**
 * @file LaTeX Editor interactions with a deterministic compiler and PDF transport
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const path = require('node:path');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { guiTest } = require('../../dev/component-test-utils');
const { root } = require('../../dev/gui-test-fixture');
const catalog = require('../../../config/lang.json');
const tests = new PRDC_JSLAB_TESTS();

if(globalThis.__JSLAB_GUI_COMPONENT__) {
  guiTest(tests, 'latex-editor', 'LaTeX Editor opens projects, configures TeX, compiles, and synchronizes both ways', [
    '#new-file', '#open-folder', '#refresh-files', '#save', '#undo-source', '#redo-source', '#source-dirty',
    '#symbol-input', '.editor-symbol-key', '#forward', '#reverse',
    '#main-file', '#compile', '#cancel', '#show-messages', '#message-filters', '#toggle-tree', '#toggle-outline', '#search-source', '#format-source',
    '#locate', '#install', '#project-tree', '#previous', '#page', '#next', '#zoom-out',
    '#zoom-in', '#zoom', '#rotate', '#back-to-pdf', '#asset-previous', '#asset-next', '#settings',
    '#latex-settings', '#close-dialog-cont'
  ], async function(assert, f) {
    const files = ['main.tex', 'chapter.tex', 'sources.bib'];
    const assets = [
      { name: 'figure.pdf', file: 'images/figure.pdf', preview: 'application/pdf' },
      { name: 'figure.png', file: 'images/figure.png', preview: 'image/png' },
      { name: 'figure.jpg', file: 'images/figure.jpg', preview: 'image/jpeg' },
      { name: 'main.log', file: 'main.log', preview: 'text/plain' }
    ];
    const tree = [
      { name: 'images', file: 'images', children: assets.slice(0, 3) },
      ...files.map(file => ({ name: file, file, editable: true })),
      assets[3],
      { name: 'notes.txt', file: 'notes.txt' }
    ];
    const project = { root: path.resolve('example'), name: 'example', files, main: 'main.tex', tree };
    const calls = [];
    let missing = true;
    let complete;
    let close;
    let open;
    const host = {
      onClose(callback) { close = callback; },
      onOpen(callback) { open = callback; },
      async request(action, ...args) {
        calls.push([action, ...args]);
        switch(action) {
          case 'open': return project;
          case 'new': return { tree, files, file: 'chapter.tex' };
          case 'scan': return { tree, files };
          case 'open-path': return { ...project, main: 'chapter.tex' };
          case 'read': return args[0] === 'sources.bib' ? '@article{sample2026, title={Example}}' : '\\section{Title}\nText from ' + args[0];
          case 'read-asset': return { type: assets.find(asset => asset.file === args[0]).preview,
            data: args[0] === 'main.log' ? new TextEncoder().encode('Compiler transcript') : new Uint8Array([1]) };
          case 'reveal-folder': return true;
          case 'file-menu': return true;
          case 'save': return true;
          case 'detect': return { missing: missing ? ['latexmk'] : [] };
          case 'toolchain': return { engine: args[0], version: 'MiKTeX' };
          case 'locate': missing = false; return { missing: [] };
          case 'compile': return new Promise(resolve => { complete = resolve; });
          case 'cancel': return complete({ cancelled: true });
          case 'forward': return { page: 2, x: 42, y: 50 };
          case 'reverse': return { file: 'chapter.tex', line: 2, column: -1 };
          case 'jump-menu': return true;
        }
      }
    };
    const viewport = (scale, rotation) => ({
      scale, rotation, width: scale * 200, height: scale * 300,
      convertToPdfPoint: (x, y) => [x / scale, y / scale],
      convertToViewportPoint: (x, y) => [x * scale, y * scale]
    });
    f.window.TextLayer = class {
      /** Records the HTML container supplied by the PDF preview. */
      constructor({ container }) { this.container = container; }
      /** Adds a selectable text-layer element for interaction checks. */
      async render() { this.container.append(f.document.createElement('span')); }
      /** Provides the PDF.js cleanup hook for this synchronous fixture. */
      cancel() {}
    };
    f.window.getDocument = () => ({
      promise: Promise.resolve({
        numPages: 2,
        async getPage() {
          return {
            rotate: 0, userUnit: 1, getViewport: ({ scale, rotation }) => viewport(scale, rotation),
            streamTextContent() {}, render: () => ({ promise: Promise.resolve(), cancel() {} })
          };
        },
        async destroy() {}
      })
    });
    const { PRDC_JSLAB_LATEX_EDITOR } = f.load(path.join(root, 'js/latex-editor/latex-editor.js'));
    const strings = Object.fromEntries(Object.entries(catalog).map(([id, entry]) => [id, entry.en]));
    const controller = new PRDC_JSLAB_LATEX_EDITOR(host, { strings }, f.window);
    const ready = () => f.waitFor(() => !controller.busy, 'editor idle');
    open({ file: project.root, main: 'chapter.tex' });
    await ready();
    assert.equal(controller.active, 'chapter.tex');
    assert.ok(calls.some(call => call[0] === 'open-path' && call[1] === project.root && call[2] === 'chapter.tex'));
    const source_heading = f.query('#left-panel > .cell-padding > .panel-container > .panel-title');
    assert.equal(f.window.getComputedStyle(source_heading).borderBottomColor, 'rgb(247, 223, 30)');
    assert.equal(f.window.getComputedStyle(source_heading).borderBottomWidth, '1px');
    for(const id of ['tree-pane', 'outline-pane']) {
      const heading = f.window.getComputedStyle(f.query('#' + id + ' .panel-title'));
      assert.equal(heading.borderBottomColor, 'rgb(247, 223, 30)');
      assert.equal(heading.marginBottom, '1px');
    }
    assert.equal(f.window.getComputedStyle(f.query('.latex-source-toolbar')).borderBottomWidth, '0px');
    assert.equal(f.window.getComputedStyle(f.query('.latex-tree-controls')).borderBottomColor, 'rgb(228, 228, 228)');
    const assertInset = (inner, outer) => {
      const a = f.query(inner).getBoundingClientRect();
      const b = f.query(outer).getBoundingClientRect();
      for(const inset of [a.top - b.top, a.left - b.left, b.bottom - a.bottom, b.right - a.right]) {
        assert.ok(Math.abs(inset - 5) < 0.5, inner + ' has a ' + inset + 'px inset');
      }
    };
    for(const id of ['tree-pane', 'outline-pane', 'source-content']) {
      const frame = '#' + id + ' > .panel-container';
      assert.equal(f.window.getComputedStyle(f.query(frame)).borderWidth, '1px');
      assertInset(frame, '#' + id);
    }
    assert.equal(f.window.getComputedStyle(f.query('#code .CodeMirror')).borderTopColor, 'rgb(247, 223, 30)');
    assertInset('#code .CodeMirror', '#code');
    assert.equal(f.window.getComputedStyle(f.query('#right-panel .panel-title')).borderBottomWidth, '1px');
    assert.equal(f.window.getComputedStyle(f.query('#page')).textAlign, 'center');
    f.click('#show-messages');
    assert.equal(f.query('#pdf-heading').hidden, true);
    assert.equal(f.query('#messages-heading').hidden, false);
    assert.equal(f.query('#message-filters').hidden, false);
    assert.equal(f.query('#empty-messages-text').textContent, strings[759]);
    f.click('#back-to-pdf');
    assert.equal(f.query('#pdf-heading').hidden, false);
    f.mouse(f.query('#code .CodeMirror'), 'contextmenu', 0, 0);
    await f.waitFor(() => f.query('#status').textContent === strings[715], 'source menu explains that a compile is needed');
    const original = controller.code.getValue();
    const toolbar = f.query('.latex-source-toolbar');
    assert.ok(toolbar.firstElementChild.contains(f.query('#source-title')));
    const actions = toolbar.lastElementChild;
    assert.equal(actions.firstElementChild.id, 'save');
    assert.equal(actions.lastElementChild.id, 'forward');
    assert.equal(f.query('#undo-source').disabled, true);
    assert.equal(f.query('#redo-source').disabled, true);
    assert.ok(f.query('#save img').src.endsWith('/tab-save.svg'));
    const search_icon = f.query('#search-source svg');
    assert.equal(search_icon.querySelectorAll('circle').length, 1);
    assert.ok(search_icon.querySelector('path'));
    const symbol_icon = f.query('#symbol-input svg');
    assert.ok(symbol_icon.querySelector('path'));
    assert.equal(symbol_icon.querySelector('circle, ellipse'), null);
    const icon_color = f.window.getComputedStyle(search_icon).stroke;
    assert.equal(f.window.getComputedStyle(symbol_icon).fill, icon_color);
    for(const action of actions.children) {
      assert.equal(f.window.getComputedStyle(action).color, icon_color, action.id);
    }
    controller.code.setCursor(1, 0);
    f.click('#symbol-input');
    f.click('#latex-symbol-popup [data-symbol="α"]');
    assert.ok(controller.code.getValue().includes('\\alpha Text'));
    assert.equal(f.query('#source-title').textContent, 'chapter.tex');
    assert.equal(f.query('#source-dirty').hidden, false);
    assert.ok(f.query('#project-tree [data-file="chapter.tex"]').classList.contains('latex-tree-dirty'));
    f.key(null, 'Escape');
    await f.waitFor(() => f.query('#symbol-input').getAttribute('aria-expanded') === 'false', 'symbol picker closes');
    f.click('#undo-source');
    assert.equal(controller.code.getValue(), original);
    assert.equal(f.query('#source-dirty').hidden, true);
    assert.equal(f.query('#redo-source').disabled, false);
    f.click('#redo-source');
    assert.ok(controller.code.getValue().includes('\\alpha Text'));
    assert.equal(f.query('#source-dirty').hidden, false);
    f.click('#undo-source');
    assert.equal(controller.code.getValue(), original);
    f.click('#search-source');
    assert.notEqual(f.query('.CodeMirror-search-dialog').style.display, 'none');
    f.query('.CodeMirror-search-find').value = 'Title';
    f.click('.CodeMirror-search-find-next-btn');
    assert.equal(controller.code.getSelection(), 'Title');
    f.click('.CodeMirror-search-close-btn');
    assert.equal(f.query('#latex-format-menu').querySelectorAll('button').length, 12);
    controller.code.setSelection({ line: 1, ch: 0 }, { line: 1, ch: 4 });
    f.click('#format-source');
    assert.equal(f.query('#latex-format-menu').matches(':popover-open'), true);
    const formatting = [...f.query('#latex-format-menu').querySelectorAll('button')];
    assert.ok(formatting.every(button => button.hasAttribute('aria-label') && !button.textContent.trim()));
    assert.equal(new Set(formatting.map(button => button.getBoundingClientRect().top)).size, 1);
    const bold = f.query('#latex-format-menu [data-format="textbf"]');
    const mouse_down = new f.window.MouseEvent('mousedown', { bubbles: true, cancelable: true });
    assert.equal(bold.dispatchEvent(mouse_down), false, 'Formatting preserves the source selection on mouse down');
    bold.click();
    assert.ok(controller.code.getLine(1).startsWith('\\textbf{Text}'));
    controller.source.format('textbf');
    assert.equal(controller.code.getValue(), original);
    controller.code.setCursor(0, 10);
    controller.source.format('subsection');
    assert.equal(controller.code.getLine(0), '\\subsection{Title}');
    controller.source.format('text');
    assert.equal(controller.code.getLine(0), 'Title');
    controller.code.setCursor(1, 0);
    controller.source.format('itemize');
    assert.ok(controller.code.getValue().includes('\\begin{itemize}\n  \\item Text'));
    controller.source.format('enumerate');
    assert.ok(controller.code.getValue().includes('\\begin{enumerate}\n  \\item Text'));
    const list = '\\begin{itemize}\n  \\item First\n  \\item Second\n\\end{itemize}';
    controller.code.setValue(list);
    controller.code.setCursor(2, 8);
    controller.source.format('indentMore');
    assert.ok(controller.code.getValue().includes('  \\begin{itemize}\n    \\item Second\n  \\end{itemize}'));
    controller.source.format('indentLess');
    assert.equal(controller.code.getValue(), list);
    controller.code.setValue('\\cite{sam');
    controller.code.setCursor(0, 9);
    assert.deepEqual((await controller.source.hints(controller.code)).list, ['sample2026']);
    controller.code.setValue(original);
    controller.source.goToLine();
    const line_input = f.query('#code .CodeMirror-dialog input');
    line_input.value = '2';
    line_input.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    assert.equal(controller.code.getCursor().line, 1);
    controller.docs.get(controller.active).saved = controller.code.changeGeneration();
    const tree_height = f.query('#tree-pane').getBoundingClientRect().height;
    const outline_height = f.query('#outline-pane').getBoundingClientRect().height;
    f.click('#toggle-tree');
    assert.equal(f.query('#tree-content').hidden, true);
    assert.equal(f.window.getComputedStyle(f.query('#tree-pane .panel-title')).borderBottomColor, 'rgba(0, 0, 0, 0)');
    assert.ok(f.query('#outline-pane').getBoundingClientRect().height > outline_height);
    f.click('#toggle-outline');
    assert.equal(f.query('#file-outline').hidden, true);
    assert.equal(f.window.getComputedStyle(f.query('#outline-pane .panel-title')).borderBottomColor, 'rgba(0, 0, 0, 0)');
    assert.equal(f.query('#outline-pane').getBoundingClientRect().height, f.query('#tree-pane').getBoundingClientRect().height);
    f.click('#toggle-tree');
    assert.ok(f.query('#tree-pane').getBoundingClientRect().height > tree_height);
    f.click('#toggle-outline');
    assert.equal(f.query('#tree-pane').getBoundingClientRect().height, tree_height);
    for(const id of ['new-file', 'open-folder', 'refresh-files']) {
      f.click('#' + id);
      await ready();
    }
    assert.equal(controller.active, 'main.tex');
    for(const [selector, dx, dy, key] of [
      ['#source-panel > .vertical-resizer', 30, 0, 'panel-latex-editor-source'],
      ['#project-panel > .horizontal-resizer', 0, -30, 'panel-latex-editor-sidebar']
    ]) {
      const grip = f.query(selector);
      const box = grip.getBoundingClientRect();
      f.mouse(grip, 'mousedown', box.x, box.y);
      f.mouse(f.document, 'mousemove', box.x + dx, box.y + dy);
      f.mouse(f.document, 'mouseup', box.x + dx, box.y + dy);
      assert.ok(calls.some(call => call[0] === 'panel' && call[1] === key));
    }
    f.click('#project-tree details[data-file=""] > summary button');
    f.click('#project-tree details[data-file="images"] > summary button');
    assert.ok(calls.some(call => call[0] === 'reveal-folder' && call[1] === ''));
    assert.ok(calls.some(call => call[0] === 'reveal-folder' && call[1] === 'images'));
    assert.ok(f.query('[data-file="notes.txt"]'));
    for(const asset of assets) {
      f.click('#project-tree button[data-file="' + asset.file + '"]');
      await f.waitFor(() => controller.active === asset.file, 'asset selected');
      assert.equal(f.query('#code').hidden, true);
      if(asset.preview === 'application/pdf') {
        await f.waitFor(() => Boolean(f.document.querySelector('#asset-pdf canvas')), 'asset PDF rendered');
        f.click('#asset-next');
        await f.waitFor(() => controller.asset_pdf.number === 2, 'next asset PDF page');
        f.click('#asset-previous');
        await f.waitFor(() => controller.asset_pdf.number === 1, 'previous asset PDF page');
      } else if(asset.preview === 'text/plain') {
        assert.equal(f.query('#asset-text').hidden, false);
        assert.equal(f.query('#asset-text').textContent, 'Compiler transcript');
        assert.equal(f.query('#symbol-input').disabled, true);
      } else {
        assert.equal(f.query('#asset-image').alt, asset.name);
        assert.ok(f.query('#asset-image').src.startsWith('blob:'));
      }
    }
    assert.equal(f.document.querySelector('.tabs'), null);
    f.click('#project-tree button[data-file="chapter.tex"]');
    await f.waitFor(() => controller.active === 'chapter.tex', 'included source selected');
    f.click('#file-outline button');
    await f.waitFor(() => controller.code.getCursor().line === 0, 'outline navigates to a source heading');
    f.click('#project-tree button[data-file="main.tex"]');
    await f.waitFor(() => controller.active === 'main.tex', 'main source selected from tree');
    const chapter = f.query('#project-tree button[data-file="chapter.tex"]');
    f.mouse(chapter, 'contextmenu', 10, 10);
    await f.waitFor(() => f.query('#main-file').value === 'chapter.tex', 'tree action sets the main document');
    f.click('#settings');
    await f.waitFor(() => f.query('#latex-settings').open, 'settings opens');
    f.input('#main-file', 'chapter.tex', 'change');
    f.input('#engine', 'xelatex', 'change');
    await f.waitFor(() => calls.some(call => call[0] === 'preferences' && call[1].engine === 'xelatex'), 'engine saved');
    f.click('#settings-close');
    assert.equal(f.query('#latex-settings').open, false);
    controller.code.setValue('Changed source');
    controller.code.setCursor(0, 6);
    f.click('#project-tree button[data-file="chapter.tex"]');
    await f.waitFor(() => controller.active === 'chapter.tex', 'second source selected');
    f.click('#project-tree button[data-file="main.tex"]');
    await f.waitFor(() => controller.active === 'main.tex', 'edited source selected again');
    assert.equal(controller.code.getValue(), 'Changed source');
    assert.equal(controller.code.getCursor().ch, 6);
    f.click('#save');
    await ready();
    assert.ok(calls.some(call => call[0] === 'save' && call[2] === 'Changed source'));
    f.click('#compile');
    await ready();
    assert.equal(f.query('#setup').hidden, false);
    f.click('#install');
    f.click('#locate');
    await f.waitFor(() => f.query('#setup').hidden, 'toolchain configured');
    assert.ok(calls.some(call => call[0] === 'install'));
    f.key(null, 'Enter', { ctrlKey: true });
    await f.waitFor(() => complete, 'compilation started');
    assert.equal(f.query('#cancel').hidden, false);
    const reduced_motion = f.window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    assert.equal(f.window.getComputedStyle(f.query('#cancel'), '::before').animationName,
      reduced_motion ? 'none' : 'latex-compile-progress');
    complete({ ok: true, data: new Uint8Array([1]), log: [
      'This is pdfTeX, Version 3.141592653',
      './chapter.tex:2: LaTeX Warning: Sample chapter warning.',
      'Package sample Warning: Sample package warning',
      '(sample)                continued on the next line.',
      'LaTeX Warning: There were undefined references.',
      'Overfull \\hbox (2.0pt too wide) in paragraph at lines 3--4'
    ].join('\n') });
    await ready();
    assert.equal(f.query('#pages').textContent, '/ 2');
    assert.ok(parseFloat(f.window.getComputedStyle(f.query('#pages')).marginInlineStart) > 0);
    assert.ok(f.query('#previous img').classList.contains('latex-arrow-up'));
    assert.ok(f.query('#next img').classList.contains('latex-arrow-down'));
    assert.equal(f.query('#next').nextElementSibling.id, 'page');
    assert.equal(f.document.querySelector('#jump-controls'), null);
    assert.ok(f.query('#right-panel .panel-title #settings'));
    assert.ok(f.query('#right-panel .latex-pdf-toolbar #show-messages'));
    assert.equal(f.query('#message-count').textContent, '4');
    assert.equal(f.document.querySelector('#export'), null);
    const source_height = f.query('#source-content').getBoundingClientRect().height;
    f.click('#show-messages');
    assert.equal(f.query('#right-panel #compiler-messages').hidden, false);
    assert.equal(f.query('#pdf-scroll').hidden, true);
    assert.equal(f.query('#source-content').getBoundingClientRect().height, source_height);
    assert.equal(f.query('#latex-errors').hidden, true);
    assert.ok(f.query('#latex-warnings').textContent.includes('Sample package warning continued on the next line.'));
    assert.ok(!f.query('#compiler-messages').textContent.includes('This is pdfTeX'));
    f.click('[data-message-filter="typesetting"]');
    assert.equal(f.query('#latex-warnings').hidden, true);
    assert.equal(f.query('#latex-typesetting').hidden, false);
    f.click('[data-message-filter="all"]');
    assert.equal(f.query('#latex-warnings').hidden, false);
    f.click('[data-message-filter="warnings"]');
    assert.equal(f.query('#latex-typesetting').hidden, true);
    f.click('#back-to-pdf');
    assert.equal(f.query('#pdf-scroll').hidden, false);
    await f.tick();
    f.click('#show-messages');
    f.click('#latex-warnings button');
    await f.waitFor(() => controller.active === 'chapter.tex', 'diagnostic selects chapter');
    f.mouse(f.query('#code .CodeMirror'), 'contextmenu', 0, 0);
    await f.waitFor(() => calls.some(call => call[0] === 'forward'), 'source context action queries SyncTeX');
    await f.waitFor(() => {
      assert.equal(controller.messages.some(entry => entry.severity === 'errors'), false, JSON.stringify(controller.messages));
      return Boolean(f.document.querySelector('.latex-pdf-hit'));
    }, 'forward highlight visible');
    assert.equal(f.query('#compiler-messages').hidden, true);
    assert.equal(controller.pdf.number, 2);
    const frame = f.query('#pdf-scroll .latex-page');
    f.mouse(frame, 'dblclick', 42, 50);
    await f.waitFor(() => calls.some(call => call[0] === 'reverse'), 'PDF double-click queries SyncTeX');
    assert.equal(controller.code.getCursor().line, 1);
    f.pointer(frame, 'pointerdown', 42, 50);
    f.click('#reverse');
    await f.waitFor(() => calls.filter(call => call[0] === 'reverse').length === 2, 'PDF toolbar jumps to source');
    f.mouse(f.query('#pdf-scroll .latex-page'), 'contextmenu', 42, 50);
    await f.waitFor(() => calls.filter(call => call[0] === 'reverse').length === 3, 'PDF context action jumps to source');
    f.click('#forward');
    await f.waitFor(() => calls.filter(call => call[0] === 'forward').length === 2, 'source toolbar jumps to PDF');
    assert.ok(calls.some(call => call[0] === 'jump-menu' && call[1] === 'forward'));
    assert.ok(calls.some(call => call[0] === 'jump-menu' && call[1] === 'reverse'));
    await f.waitFor(() => f.document.querySelector('.latex-source-hit'), 'source jump highlights the target line');
    controller.code.setCursor(1, 1);
    assert.ok(f.document.querySelector('.latex-source-hit'));
    controller.code.setCursor(0, 1);
    assert.equal(f.document.querySelector('.latex-source-hit'), null);
    controller.code.setCursor(1, 1);
    assert.equal(f.document.querySelector('.latex-source-hit'), null);
    await controller.jump('chapter.tex', 2, 1);
    assert.ok(f.document.querySelector('.latex-source-hit'));
    await controller.select('main.tex');
    await controller.select('chapter.tex');
    assert.equal(f.document.querySelector('.latex-source-hit'), null);
    await f.tick();
    f.click('#previous');
    await f.waitFor(() => controller.pdf.number === 1, 'previous page');
    f.click('#next');
    await f.waitFor(() => controller.pdf.number === 2, 'next page');
    f.input('#page', '1', 'change');
    await f.waitFor(() => controller.pdf.number === 1, 'page number navigation');
    for(const id of ['zoom-in', 'zoom-out', 'rotate']) {
      f.click('#' + id);
      await f.tick();
    }
    f.input('#zoom', 'fit', 'change');
    f.window.dispatchEvent(new f.window.Event('resize'));
    await f.waitFor(() => controller.pdf.page_view.viewport.rotation === 90, 'rotated PDF');
    complete = null;
    f.click('#compile');
    await f.waitFor(() => complete, 'next compilation started');
    f.click('#cancel');
    await ready();
    assert.equal(f.query('#status').textContent, strings[732]);
    assert.equal(controller.pdf.count, 2);
    complete = null;
    f.click('#compile');
    await f.waitFor(() => complete, 'failed compilation started');
    complete({ ok: false, log: path.join(project.root, 'chapter.tex') + ':2: Undefined control sequence.' });
    await ready();
    assert.equal(f.query('#pdf-scroll').hidden, true);
    assert.equal(f.query('#message-count').dataset.severity, 'errors');
    f.click('[data-message-filter="errors"]');
    assert.equal(f.query('[data-message-filter="errors"]').getAttribute('aria-pressed'), 'true');
    assert.equal(f.query('#latex-warnings').hidden, true);
    assert.equal(f.query('#latex-errors button').textContent, 'chapter.tex:2');
    assert.equal(f.query('#latex-errors li p').textContent, 'Undefined control sequence.');
    complete = null;
    f.key(null, 's', { ctrlKey: true });
    await f.waitFor(() => complete, 'Ctrl+S starts compilation');
    complete({ ok: true, data: new Uint8Array([1]) });
    await ready();
    f.click('#show-messages');
    assert.equal(f.query('#messages-ready').hidden, false);
    assert.equal(f.query('#empty-messages-text').textContent, strings[755]);
    assert.equal(f.query('#back-to-pdf').hidden, false);
    controller.code.setValue('save on close');
    assert.equal(f.query('#status').hidden, true);
    assert.equal(f.document.querySelector('footer'), null);
    close();
    await f.waitFor(() => !f.query('#close-dialog-cont').hidden, 'unsaved close dialog shown');
    assert.equal(calls.at(-1)[0], 'focus');
    f.click('#close-dialog-cancel');
    await f.waitFor(() => calls.some(call => call[0] === 'keep-open'), 'cancel keeps the editor open');
    assert.equal(controller.code.getValue(), 'save on close');
    close();
    await f.waitFor(() => !f.query('#close-dialog-cont').hidden, 'unsaved close dialog shown again');
    f.click('#close-dialog-save');
    await f.waitFor(() => calls.some(call => call[0] === 'close'), 'confirmed close');
  });

  guiTest(tests, 'latex-editor', 'LaTeX WebAssembly adapter forwards window events and handles worker results', [],
    async function(assert, fixture) {
      const { PRDC_JSLAB_LATEX_EDITOR_COMPILER } = fixture.load(path.join(root, 'js/latex-editor/compiler.js'));
      const events = [];
      const host = {
        onOpen(listener) { listener('project'); },
        onClose(listener) { listener(); },
        async request(action) {
          if(action === 'wasm-files') return {
            token: 'build', main: 'main.tex', files: [{ path: 'main.tex', contents: 'source' }]
          };
          if(action === 'wasm-output') return { pdf: '/workspace/main.pdf' };
        }
      };
      let reply = 'onmessage';
      const adapter = PRDC_JSLAB_LATEX_EDITOR_COMPILER.attach(host, true, () => ({
        postMessage() {
          this[reply](reply === 'onmessage' ? {
            data: { ok: true, log: '', output: '', data: new Uint8Array([1]) }
          } : { message: 'Worker failed' });
        },
        terminate() {}
      }));
      adapter.onOpen(project => events.push(project));
      adapter.onClose(() => events.push('close'));
      assert.deepEqual(events, ['project', 'close']);
      const settings = { engine: 'pdflatex' };
      assert.equal((await adapter.request('compile', 'main.tex', settings)).pdf, '/workspace/main.pdf');
      reply = 'onerror';
      assert.equal((await adapter.request('compile', 'main.tex', settings)).output, '! Worker failed');
      reply = 'onmessageerror';
      assert.equal((await adapter.request('compile', 'main.tex', settings)).output, '! BusyTeX');
      await adapter.request('close');
    });
}

exports.MODULE_TESTS = tests;
