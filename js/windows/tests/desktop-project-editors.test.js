/**
 * @file Real desktop integration for Presentation and LaTeX project editors
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_GUI_TEST_BROWSER } = require('../../dev/gui-test-browser');
const tests = new PRDC_JSLAB_TESTS();

/**
 * Opens project editors through the sandbox and observes their desktop windows.
 */
class PRDC_JSLAB_DESKTOP_PROJECT_EDITORS_TEST_HELPER {

  /**
   * Connects to a project editor's actual Electron renderer.
   * @param {string} name Window HTML basename.
   * @returns {Promise<Object>} Connected browser client.
   */
  static async connect(name) {
    for(let attempt = 0; attempt < 120; attempt++) {
      const targets = await (await fetch('http://127.0.0.1:' + gui_desktop_port + '/json/list')).json();
      const target = targets.find(entry => entry.type === 'page' && entry.url.endsWith('/' + name + '.html'));
      if(target) {
        const client = new PRDC_JSLAB_GUI_TEST_BROWSER();
        await client.connect(target.webSocketDebuggerUrl);
        return client;
      }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    throw new Error('The ' + name + ' desktop window did not open.');
  }

  /**
   * Copies the example into the isolated profile and opens it through editLatex.
   * @param {string} name Test project folder name.
   * @returns {Promise<Object>} Paths and connected editor.
   */
  static async openLatex(name) {
    const root = path.join(gui_desktop_profile, name);
    await fs.cp(path.join(app_path, 'examples', 'resources', 'latex-project'), root, { recursive: true });
    await fs.writeFile(path.join(root, 'main.log'), 'Desktop log preview');
    if(!await gui_desktop.sandbox.evaluate(async root => Boolean(await editLatex(root)), root)) {
      throw new Error('editLatex rejected the example project.');
    }
    const editor = await this.connect('latex-editor');
    await editor.waitFor(name => document.querySelector('#project-tree summary span')?.textContent === name &&
      document.querySelector('#source-title')?.textContent === 'main.tex' &&
      !document.getElementById('compile').disabled, 'LaTeX project and source ready', 20000, name);
    return { root, editor };
  }
}

if(globalThis.gui_desktop) {
  const tags = ['gui', 'electron', 'integration'];

  tests.add('Command Window finds presentation commands and clears the argument hint after input is cleared', async function(assert) {
    const main = gui_desktop.main;
    await main.evaluate(() => {
      const input = win_main.command_window.code_input;
      input.setValue('presentation');
      input.setCursor(0, 'presentation'.length);
      input.focus();
      CodeMirror.commands.autocomplete(input, null, { completeSingle: false });
    });
    await main.waitFor(() => [...document.querySelectorAll('.CodeMirror-hint')]
      .some(hint => hint.textContent === 'makeOnlinePresentation'), 'autocomplete includes makeOnlinePresentation');
    await main.evaluate(() => {
      const input = win_main.command_window.code_input;
      input.closeHint();
      input.setValue('Math.unc');
      input.setCursor(0, 'Math.unc'.length);
      CodeMirror.commands.autocomplete(input, null, { completeSingle: false });
    });
    await main.waitFor(() => [...document.querySelectorAll('.CodeMirror-hint')]
      .some(hint => hint.textContent === 'trunc'), 'property autocomplete finds Math.trunc');
    await main.evaluate(() => {
      const input = win_main.command_window.code_input;
      input.closeHint();
      input.setValue('makeOnlinePresentation(');
      input.setCursor(0, 'makeOnlinePresentation('.length);
      CodeMirror.commands.autocomplete(input, null, { completeSingle: false });
    });
    await main.waitFor(() => document.querySelector('.jslab-argument-hint')?.textContent.includes('makeOnlinePresentation'),
      'argument signature displayed');
    await main.evaluate(() => {
      win_main.command_window.code_input.setValue('');
    });
    assert.equal(await main.evaluate(() => document.querySelector('.jslab-argument-hint') === null), true);
  }, { tags, timeout_ms: 50000 });

  tests.add('Presentation Editor opens a new project and renders the slides with empty CSS and JavaScript', async function(assert) {
    const project = path.join(gui_desktop_profile, 'desktop-presentation-project');
    assert.equal(await gui_desktop.sandbox.evaluate(async root => Boolean(await createPresentation(root)), project), true);
    const editor = await PRDC_JSLAB_DESKTOP_PROJECT_EDITORS_TEST_HELPER.connect('presentation-editor');
    try {
      await editor.waitFor(() => typeof presentation_editor !== 'undefined' &&
        presentation_editor.total_slides === 3, 'Presentation Editor rendered the default slides', 30000);
      const preview_url = await editor.evaluate(() => presentation_editor.webview.src);
      for(const name of ['main.js', 'main.css']) {
        const response = await fetch(new URL(name, preview_url));
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-length'), '0');
        assert.equal(await response.text(), '');
      }
      await editor.waitFor(() => presentation_editor.webview.executeJavaScript(
        'typeof presentation !== "undefined" && presentation.current_slide === 0 && !presentation._animating'
      ), 'Presentation preview settled on slide 1');
      await editor.evaluate(() => document.getElementById('next-slide').click());
      await editor.waitFor(() => presentation_editor.current_slide === 1, 'Presentation Editor navigated to slide 2');
      assert.equal(await editor.evaluate(() => presentation_editor.html_editor.code_editor.getValue().includes('<slide>')), true);
      const suggestions = await editor.evaluate(async () => {
        presentation_editor.js_editor.show();
        const source = presentation_editor.js_editor.code_editor;
        source.setValue('document.lector');
        source.setCursor(0, 'document.lector'.length);
        const hints = await CodeMirror.hint.javascript(source, source.getOption('hintOptions'));
        CodeMirror.commands.autocomplete(source, null, { completeSingle: false });
        return { items: hints?.list, options: source.getOption('hintOptions') };
      });
      assert.ok(suggestions.items?.includes('querySelector'), JSON.stringify(suggestions));
      await editor.waitFor(() => [...document.querySelectorAll('.CodeMirror-hint')]
        .some(hint => hint.textContent === 'querySelector'), 'Presentation Editor finds DOM properties by substring');
      await gui_desktop.main.evaluate(() => win_main.platform.host.send('MainProcess', 'focus-win'));
      await gui_desktop.main.waitFor(async () => (await win_main.platform.host.invoke('JSLAB_DESKTOP_GUI_TEST_FOREGROUND'))
        .endsWith('/main.html'), 'Command Window activation');
      await gui_desktop.main.evaluate(() => win_main.close());
      await editor.waitFor(() => presentation_editor.close_requested, 'Presentation Editor intercepts application close');
      await gui_desktop.main.waitFor(async () => (await win_main.platform.host.invoke('JSLAB_DESKTOP_GUI_TEST_FOREGROUND'))
        .endsWith('/presentation-editor.html'), 'Presentation Editor requests foreground activation');
      await editor.evaluate(() => document.getElementById('close-dialog-cancel').click());
      await editor.waitFor(() => !presentation_editor.close_requested, 'Presentation Editor cancels application close');
      await editor.evaluate(() => presentation_editor.js_editor.code_editor.setValue(''));
    } finally {
      await editor.close();
    }
  }, { tags, timeout_ms: 50000 });

  tests.add('LaTeX Editor opens a real project, inserts TeX symbols and previews project assets and logs', async function(assert) {
    const { editor } = await PRDC_JSLAB_DESKTOP_PROJECT_EDITORS_TEST_HELPER.openLatex('desktop-latex-assets');
    try {
      await editor.evaluate(() => {
        const source = document.querySelector('#code .CodeMirror').CodeMirror;
        source.setSelection({ line: 9, ch: 0 }, { line: 9, ch: 4 });
        source.focus();
      });
      await editor.send('Input.dispatchKeyEvent', {
        type: 'rawKeyDown', key: 'b', code: 'KeyB', modifiers: 2, windowsVirtualKeyCode: 66
      });
      await editor.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'b', code: 'KeyB', modifiers: 2, windowsVirtualKeyCode: 66 });
      await editor.waitFor(() => document.querySelector('#code .CodeMirror').CodeMirror.getLine(9).startsWith('\\textbf{This}'),
        'Ctrl+B formats the selected LaTeX source');
      await editor.evaluate(() => document.getElementById('undo-source').click());
      await editor.waitFor(() => document.getElementById('source-dirty').hidden &&
        document.querySelector('#code .CodeMirror').CodeMirror.getLine(9).startsWith('This'),
      'Undo restores the saved source and clears the dot');
      await editor.evaluate(() => document.getElementById('redo-source').click());
      await editor.waitFor(() => !document.getElementById('source-dirty').hidden,
        'Redo reapplies the edit and restores the dot');
      await editor.evaluate(() => document.getElementById('undo-source').click());
      await editor.evaluate(() => {
        const source = document.querySelector('#code .CodeMirror').CodeMirror;
        source.replaceRange('\\fra', { line: 8, ch: 0 });
        source.setCursor(8, 4);
      });
      await editor.send('Input.dispatchKeyEvent', {
        type: 'rawKeyDown', key: ' ', code: 'Space', modifiers: 2, windowsVirtualKeyCode: 32
      });
      await editor.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', modifiers: 2, windowsVirtualKeyCode: 32 });
      await editor.waitFor(() => [...document.querySelectorAll('.CodeMirror-hint')].some(hint => hint.textContent === '\\frac'),
        'Ctrl+Space opens LaTeX command completion');
      await editor.evaluate(() => {
        const source = document.querySelector('#code .CodeMirror').CodeMirror;
        source.closeHint();
        source.undo();
      });
      const inserted = await editor.evaluate(() => {
        const source = document.querySelector('#code .CodeMirror').CodeMirror;
        document.getElementById('symbol-input').click();
        document.querySelector('#latex-symbol-popup [data-symbol="α"]').click();
        const value = source.getValue();
        source.undo();
        return value;
      });
      assert.ok(inserted.includes('\\alpha'));
      assert.equal(inserted.includes('\\ensuremath'), false);
      for(const [filename, preview] of [['example.png', '#asset-image'], ['example.pdf', '#asset-pdf canvas'], ['main.log', '#asset-text']]) {
        await editor.evaluate(filename => {
          const row = [...document.querySelectorAll('#project-tree button[data-file]')]
            .find(button => button.dataset.file.split(/[\\/]/).pop() === filename);
          for(let folder = row.closest('details'); folder; folder = folder.parentElement.closest('details')) folder.open = true;
          row.click();
        }, filename);
        await editor.waitFor((filename, selector) => {
          const element = document.querySelector(selector);
          return document.getElementById('source-title').textContent === filename &&
            element?.getBoundingClientRect().height > 0 &&
            (element.tagName !== 'IMG' || element.naturalWidth > 0);
        }, filename + ' preview rendered', 15000, filename, preview);
      }
      assert.equal(await editor.evaluate(() => document.getElementById('asset-text').textContent), 'Desktop log preview');
      await editor.evaluate(() => document.querySelector('#project-tree button[data-file="main.tex"]').click());
      await editor.waitFor(() => document.getElementById('source-title').textContent === 'main.tex', 'source reopened');
      await editor.evaluate(() => {
        const source = document.querySelector('#code .CodeMirror').CodeMirror;
        source.replaceRange('% Unsaved\n', { line: 0, ch: 0 });
      });
      await gui_desktop.main.evaluate(() => win_main.platform.host.send('MainProcess', 'focus-win'));
      await gui_desktop.main.waitFor(async () => (await win_main.platform.host.invoke('JSLAB_DESKTOP_GUI_TEST_FOREGROUND'))
        .endsWith('/main.html'), 'Command Window activation');
      await gui_desktop.main.evaluate(() => win_main.close());
      await editor.waitFor(() => !document.getElementById('close-dialog-cont').hidden, 'LaTeX Editor intercepts application close');
      await gui_desktop.main.waitFor(async () => (await win_main.platform.host.invoke('JSLAB_DESKTOP_GUI_TEST_FOREGROUND'))
        .endsWith('/latex-editor.html'), 'LaTeX Editor requests foreground activation');
      await editor.evaluate(() => document.getElementById('close-dialog-cancel').click());
      await editor.waitFor(() => document.getElementById('close-dialog-cont').hidden, 'close cancelled');
      await editor.evaluate(() => document.querySelector('#code .CodeMirror').CodeMirror.undo());
    } finally {
      await editor.close();
    }
  }, { tags, timeout_ms: 45000 });

  tests.add('LaTeX Editor compiles through the installed toolchain and synchronizes the real source and PDF', async function(assert) {
    const { root, editor } = await PRDC_JSLAB_DESKTOP_PROJECT_EDITORS_TEST_HELPER.openLatex('desktop-latex-build');
    try {
      const tools = await editor.evaluate(() => latexHost.request('detect', 'pdflatex'));
      if(tools.missing.length) assert.skip('Install a desktop TeX toolchain for this test: ' + tools.missing.join(', '));
      await editor.evaluate(() => document.getElementById('compile').click());
      await editor.waitFor(() => !document.getElementById('compile').disabled &&
        !!document.querySelector('#pdf-scroll .textLayer span'), 'TeX build and PDF.js text layer', 60000);
      const pdf = await fs.readFile(path.join(root, 'main.pdf'));
      assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
      assert.ok((await fs.readFile(path.join(root, 'main.log'), 'utf8')).includes('Output written'));

      for(const [words, file, line] of [['Open any file', 'figures.tex', 3], ['This project demonstrates', 'main.tex', 9]]) {
        await editor.evaluate(words => {
          const text = [...document.querySelectorAll('#pdf-scroll .textLayer span')].find(span => span.textContent.includes(words));
          const bounds = text.getBoundingClientRect();
          text.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true,
            clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 }));
          document.getElementById('reverse').click();
        }, words);
        await editor.waitFor((file, line) => document.getElementById('source-title').textContent === file &&
          document.querySelector('#code .CodeMirror').CodeMirror.getCursor().line === line,
        'SyncTeX landed on ' + file, 12000, file, line);
      }
      await editor.evaluate(() => document.getElementById('forward').click());
      await editor.waitFor(() => !!document.querySelector('#pdf-scroll .latex-pdf-hit'), 'source position highlighted in PDF');
      await editor.evaluate(() => {
        document.querySelector('#code .CodeMirror').CodeMirror.replaceRange('\\UnknownDesktopTexCommand\n', { line: 0, ch: 0 });
        document.querySelector('#project-tree button[data-file="main.log"]').click();
      });
      await editor.waitFor(() => document.getElementById('asset-text').textContent.includes('Output written'),
        'successful build log shown as text');
      await editor.evaluate(() => document.getElementById('compile').click());
      await editor.waitFor(() => !document.getElementById('compile').disabled &&
        !document.getElementById('compiler-messages').hidden &&
        document.getElementById('latex-errors').textContent.includes('Undefined control sequence'),
      'real compiler failure shown in diagnostics', 60000);
      assert.deepEqual(await fs.readFile(path.join(root, 'main.pdf')), pdf);
      assert.ok((await fs.readFile(path.join(root, 'main.log'), 'utf8')).includes('Undefined control sequence'));
      assert.ok(await editor.evaluate(() => document.getElementById('asset-text').textContent.includes('Undefined control sequence')));
      await editor.evaluate(() => document.querySelector('#latex-errors li button').click());
      await editor.waitFor(() => document.getElementById('source-title').textContent === 'main.tex' &&
        document.querySelector('#code .CodeMirror').CodeMirror.getCursor().line === 0, 'compiler error links to source');
    } finally {
      await editor.close();
    }
  }, { tags, timeout_ms: 160000 });
}

exports.MODULE_TESTS = tests;
