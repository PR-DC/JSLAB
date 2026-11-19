/**
 * @file JSLAB browser LaTeX workspace integration tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const fs = require('node:fs');
const path = require('node:path');
const tests = new PRDC_JSLAB_TESTS();
const editor_frame = '[data-window-id="latex-editor-window"] iframe';
const texlive_assets = '/lib/texlive-2026-1.4.1/';

if(globalThis.gui_browser) {
  tests.add('Web LaTeX Editor opens a workspace project and previews assets with unsaved close handling', async function(assert) {
    await gui_browser.waitFor(() => !jslab_web.main.evaluating && jslab_web.worker_debugger?.state !== 'running',
      'the preceding Command Window action completes');
    gui_hit_archive.push(...await gui_browser.evaluate(() => globalThis.__JSLAB_GUI_HITS__));
    const request_start = gui_requests.length;
    await gui_browser.navigate(gui_base);
    await gui_browser.waitFor(() => document.body?.dataset.jslabWebReady === 'true', 'fresh Web shell');
    const missing = await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('await compileLatex("/workspace/missing.tex")'));
    assert.equal(missing.value, false);
    assert.deepEqual(gui_requests.slice(request_start).filter(url => /init-latex-host|latex-wasm-worker/.test(url)), []);
    const sample = fs.readFileSync(path.join(app_path, 'examples/resources/latex-project/images/example.pdf'));
    const opened = await gui_browser.evaluate(async bytes => {
      await jslab_web.fs.writeTextFile('/workspace/latex-check/main.tex', '\\documentclass{article}\n');
      await jslab_web.fs.writeTextFile('/workspace/latex-check/sections/part.tex', '\\section{Workspace chapter}\n');
      await jslab_web.fs.writeTextFile('/workspace/latex-check/main.log', 'Browser transcript');
      await jslab_web.fs.writeBytes('/workspace/latex-check/images/example.pdf', new Uint8Array(bytes));
      return jslab_web.sandbox_api.evaluate('await editLatex("/workspace/latex-check")');
    }, Array.from(sample));
    assert.equal(opened.ok, true);
    assert.equal(opened.value, true);
    await gui_browser.waitFor(() => {
      const win = jslab_web.window_manager.windows.get('latex-editor-window');
      const doc = win.iframe.contentDocument;
      return doc.getElementById('source-title').textContent === 'main.tex';
    }, 'LaTeX project loaded in the browser');
    assert.deepEqual(gui_requests.slice(request_start).filter(url => url.startsWith(texlive_assets) || /init-latex-host|latex-wasm-worker/.test(url)),
      ['/js/init-latex-host.js']);
    const state = await gui_browser.evaluate(async () => {
      const win = jslab_web.window_manager.windows.get('latex-editor-window');
      const controller = await win.iframe.contentWindow.__JSLAB_WEB_LATEX_READY__;
      const host = controller.host;
      const panel = 'panel-latex-editor-sidebar';
      await host.request('panel', panel, [40, 60]);
      await host.request('panel', panel, [0, 100]);
      await host.request('search-history', ['figure']);
      await host.request('search-history', [42]);
      await host.request('preferences', { engine: 'invalid', halt: false });
      const settings = await host.request('settings');
      const saved = await host.request('choose-main', 'sections/part.tex');
      const rejected = await host.request('choose-main', 'main.log');
      const reopened = await host.request('open-path', '/workspace/latex-check');
      await host.request('choose-main', 'main.tex');
      await host.request('preferences', controller.preferences);
      await controller.select('main.log');
      const transcript = win.iframe.contentDocument.getElementById('asset-text').textContent;
      await controller.select('images/example.pdf');
      const pdf_pages = controller.asset_pdf.count;
      await controller.select('sections/part.tex');
      controller.code.setValue('Saved browser source');
      await controller.save();
      controller.code.setValue('Unsaved browser source');
      jslab_web.window_manager.close(win.id);
      return { transcript, pdf_pages, source: jslab_web.fs.readTextFileSync('/workspace/latex-check/sections/part.tex'),
        saved, rejected, main: reopened.main, sizes: settings.panels[panel], history: settings.search_history,
        preferences: settings.preferences };
    });
    assert.deepEqual(state, { transcript: 'Browser transcript', pdf_pages: 1, source: 'Saved browser source',
      saved: true, rejected: false, main: 'sections/part.tex', sizes: [40, 60], history: ['figure'],
      preferences: { engine: 'pdflatex', draft: false, reuse: false, halt: false, wrap: true } });
    await gui_browser.waitFor(() => {
      const win = jslab_web.window_manager.windows.get('latex-editor-window');
      return !win.iframe.contentDocument.getElementById('close-dialog-cont').hidden;
    }, 'unsaved close confirmation');
    await gui_browser.click('#close-dialog-discard', editor_frame);
    await gui_browser.waitFor(() => !jslab_web.window_manager.windows.has('latex-editor-window'), 'LaTeX editor closed');
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 20000 });

  tests.add('Web LaTeX Editor owns the compile shortcut and keeps diagnostics out of the Command Window', async function(assert) {
    const initial = await gui_browser.evaluate(async () => {
      const app = jslab_web;
      const root = '/workspace/latex-shortcut';
      const terminal = app.main.command_window;
      const pending = terminal.code_input.getValue();
      terminal.code_input.setValue('40 + 2');
      terminal.code_input.focus();
      await app.fs.writeTextFile(root + '/main.tex', '\\documentclass{article}');
      await app.windows._openLatexEditor(root);
      const win = app.window_manager.windows.get('latex-editor-window');
      const editor = await win.iframe.contentWindow.__JSLAB_WEB_LATEX_READY__;
      const request = editor.host.request.bind(editor.host);
      editor.host.request = (action, ...args) => {
        if(action === 'detect') return { missing: [] };
        if(action === 'compile') return { ok: false, output: '! Shortcut test compiler failure.' };
        return request(action, ...args);
      };
      return { pending, focused: document.activeElement === win.iframe, history: app.history.length, log: terminal.log.length };
    });
    try {
      assert.equal(initial.focused, true);
      const key = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, modifiers: 2 };
      await gui_browser.waitFor(() => !jslab_web.window_manager.windows.get('latex-editor-window')
        .iframe.contentDocument.getElementById('compile').disabled, 'shortcut project ready');
      await gui_browser.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...key });
      await gui_browser.send('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
      await gui_browser.waitFor(() => jslab_web.window_manager.windows.get('latex-editor-window')
        .iframe.contentDocument.getElementById('latex-errors').textContent.includes('Shortcut test compiler failure'), 'compiler diagnostic stays in the editor');
      const state = await gui_browser.evaluate(() => {
        const app = jslab_web;
        const terminal = app.main.command_window;
        return { input: terminal.code_input.getValue(), history: app.history.length, log: terminal.log.length,
          focused: document.activeElement === app.window_manager.windows.get('latex-editor-window').iframe };
      });
      assert.deepEqual(state, { input: '40 + 2', history: initial.history, log: initial.log, focused: true });
    } finally {
      await gui_browser.evaluate(pending => {
        jslab_web.main.command_window.code_input.setValue(pending);
        jslab_web.window_manager.close('latex-editor-window');
      }, initial.pending);
      await gui_browser.waitFor(() => !jslab_web.window_manager.windows.has('latex-editor-window'), 'shortcut editor closes');
    }
  }, { tags: ['gui', 'web', 'integration'], timeout_ms: 20000 });

  if(process.env.JSLAB_TEST_TEXLIVE === '1') {
    tests.add('Web LaTeX Editor compiles the sample and keeps TeX Live available across a page reload', async function(assert) {
      gui_hit_archive.push(...await gui_browser.evaluate(() => globalThis.__JSLAB_GUI_HITS__));
      const request_start = gui_requests.length;
      await gui_browser.navigate(gui_base);
      await gui_browser.waitFor(() => document.body?.dataset.jslabWebReady === 'true', 'fresh Web shell before compilation');
      const sample = path.join(app_path, 'examples/resources/latex-project');
      const files = ['main.tex', 'sections/figures.tex', 'images/example.pdf', 'images/example.png', 'images/example.jpg']
        .map(file => [file, fs.readFileSync(path.join(sample, file)).toString('base64')]);
      const setup = await gui_browser.evaluate(async files => {
        for(const [file, bytes] of files) {
          await jslab_web.fs.writeBytes('/workspace/latex-build/' + file, Uint8Array.from(atob(bytes), char => char.charCodeAt(0)));
        }
        const compile = await jslab_web.sandbox_api.evaluate(`JSON.stringify(await compileLatex("/workspace/latex-build/main.tex"))`);
        const no_editor = !jslab_web.window_manager.windows.has('latex-editor-window');
        const opened = await jslab_web.sandbox_api.evaluate('await editLatex("/workspace/latex-build")');
        return { compile, no_editor, opened };
      }, files);
      assert.equal(setup.compile.ok, true, JSON.stringify(setup.compile).slice(0, 1400));
      const compiled = JSON.parse(setup.compile.value);
      assert.equal(compiled?.ok, true, compiled?.log?.slice(0, 1400));
      assert.equal(compiled?.pdf, '/workspace/latex-build/main.pdf');
      assert.equal(setup.no_editor, true);
      assert.equal(setup.opened.value, true);
      assert.deepEqual(gui_requests.slice(request_start).filter(url => /init-latex-host|latex-wasm-worker/.test(url)),
        ['/js/init-latex-host.js', '/js/other-shared/latex-wasm-worker.js']);
      const served = gui_requests.slice(request_start).filter(url => url.startsWith(texlive_assets));
      assert.ok(served.includes(texlive_assets + 'engine/busytex.wasm'), JSON.stringify(served));
      assert.ok(served.every(url => url.startsWith(texlive_assets + 'engine/') || url === texlive_assets + 'manifest.json'));
      const run = async (engine = 'pdflatex') => {
        await gui_browser.waitFor(() => jslab_web.window_manager.windows.get('latex-editor-window')?.iframe.contentDocument
          ?.getElementById('source-title')?.textContent === 'main.tex', 'TeX Live project loaded');
        await gui_browser.evaluate(async engine => {
          const win = jslab_web.window_manager.windows.get('latex-editor-window');
          const controller = await win.iframe.contentWindow.__JSLAB_WEB_LATEX_READY__;
          controller.$('engine').value = engine;
          await controller.savePreferences();
        }, engine);
        await gui_browser.click('#compile', editor_frame);
        await gui_browser.waitFor(async () => {
          const win = jslab_web.window_manager.windows.get('latex-editor-window');
          return !(await win.iframe.contentWindow.__JSLAB_WEB_LATEX_READY__).busy;
        }, 'TeX Live 2026 finishes compilation', 180000);
        return gui_browser.evaluate(async () => {
          const win = jslab_web.window_manager.windows.get('latex-editor-window');
          const editor = await win.iframe.contentWindow.__JSLAB_WEB_LATEX_READY__;
          await win.iframe.contentDocument.fonts.ready;
          const main = await editor.host.request('forward', 'main.tex', 10, 1);
          const figure = await editor.host.request('forward', 'sections/figures.tex', 4, 1);
          const findSource = async words => {
            const text = [...editor.$('pdf-scroll').querySelectorAll('.textLayer span:not(.markedContent)')]
              .find(span => span.textContent.includes(words));
            if(!text) return null;
            const bounds = text.getBoundingClientRect();
            const position = editor.pdf.positionAt(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
            return { position, source: await editor.host.request('reverse', editor.pdf.number, ...position) };
          };
          const reverse = await findSource('Open any file');
          const reverse_main = await findSource('This project demonstrates');
          const path = '/workspace/latex-build/main';
          const pdf = jslab_web.fs.existsFileSync(path + '.pdf') && await jslab_web.fs.readBytes(path + '.pdf');
          const cached_engine = await new Promise((resolve, reject) => {
            const request = indexedDB.open('jslab-texlive-2026-1.4.1-local');
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction('assets');
              const engine = transaction.objectStore('assets').get('busytex.wasm');
              transaction.oncomplete = () => { db.close(); resolve(engine.result?.byteLength > 0); };
              transaction.onabort = () => { db.close(); reject(transaction.error); };
            };
            request.onerror = () => reject(request.error);
          });
          return { ok: editor.completed_build, engine: editor.preferences.engine, pages: editor.pdf.count, main, figure, reverse, reverse_main,
            cached_engine,
            pdf: pdf && new TextDecoder().decode(pdf.slice(0, 5)),
            log: jslab_web.fs.existsFileSync(path + '.log') && (await jslab_web.fs.readTextFile(path + '.log')).slice(0, 120),
            messages: win.iframe.contentDocument.getElementById('compiler-messages').textContent.slice(0, 1200) };
        });
      };
      const verify = result => {
        assert.equal(result.ok, true, JSON.stringify(result));
        assert.equal(result.pdf, '%PDF-', JSON.stringify(result));
        assert.equal(result.pages, 1);
        assert.ok(result.main && result.figure, JSON.stringify(result));
        assert.equal(result.reverse?.source?.file, 'sections/figures.tex', JSON.stringify(result));
        assert.equal(result.reverse_main?.source?.file, 'main.tex', JSON.stringify(result));
        assert.equal(result.cached_engine, true);
        assert.ok(result.log.includes('TeX Live 2026'), result.log);
      };
      verify(await run());
      await gui_browser.evaluate(() => {
        const frame = jslab_web.window_manager.windows.get('latex-editor-window').iframe;
        const doc = frame.contentDocument;
        const text = [...doc.querySelectorAll('#pdf-scroll .textLayer span')]
          .find(span => span.textContent.includes('Open any file'));
        text.setAttribute('data-test-pdf-source', '');
      });
      await gui_browser.click('[data-test-pdf-source]', editor_frame);
      const selection = await gui_browser.evaluate(async () => {
        const frame = jslab_web.window_manager.windows.get('latex-editor-window').iframe;
        const editor = await frame.contentWindow.__JSLAB_WEB_LATEX_READY__;
        return { position: editor.pdf.position, disabled: editor.$('reverse').disabled };
      });
      assert.ok(selection.position && !selection.disabled, JSON.stringify(selection));
      await gui_browser.click('#reverse', editor_frame);
      await gui_browser.waitFor(() => {
        const doc = jslab_web.window_manager.windows.get('latex-editor-window').iframe.contentDocument;
        return doc.getElementById('source-title').textContent === 'figures.tex' && !!doc.querySelector('#code .latex-source-hit');
      }, 'PDF-to-source control selects and highlights the included file');
      await gui_browser.click('#forward', editor_frame);
      await gui_browser.waitFor(() =>
        !!jslab_web.window_manager.windows.get('latex-editor-window').iframe.contentDocument.querySelector('#pdf-scroll .latex-pdf-hit'),
      'Source-to-PDF control highlights the corresponding position');

      await gui_browser.send('Network.enable');
      await gui_browser.send('Network.setBlockedURLs', { urls: [gui_base + texlive_assets + '*'] });
      try {
        const cached_requests = gui_requests.length;
        gui_hit_archive.push(...await gui_browser.evaluate(() => globalThis.__JSLAB_GUI_HITS__));
        await gui_browser.navigate(gui_base);
        await gui_browser.waitFor(() => document.body?.dataset.jslabWebReady === 'true', 'browser workspace reopened');
        await gui_browser.evaluate(() => jslab_web.sandbox_api.evaluate('await editLatex("/workspace/latex-build")'));
        verify(await run());
        assert.deepEqual(gui_requests.slice(cached_requests).filter(url => url.startsWith(texlive_assets)), []);
      } finally {
        await gui_browser.send('Network.setBlockedURLs', { urls: [] });
      }
      for(const [engine, marker] of [['xelatex', 'XeTeX'], ['lualatex', 'LuaHBTeX']]) {
        const result = await run(engine);
        verify(result);
        assert.ok(result.log.includes(marker), JSON.stringify(result));
      }
      const nested = await gui_browser.evaluate(async () => {
        const root = '/workspace/latex-nested';
        await jslab_web.fs.writeTextFile(root + '/source/MAIN.TEX',
          '\\documentclass{article}\n\\begin{document}\n\\input{chapter}\n\\end{document}');
        await jslab_web.fs.writeTextFile(root + '/chapter.tex', 'A file at the project root.\n');
        const win = jslab_web.window_manager.windows.get('latex-editor-window');
        const editor = await win.iframe.contentWindow.__JSLAB_WEB_LATEX_READY__;
        await editor.open({ file: root, main: 'source/MAIN.TEX' });
        editor.$('engine').value = 'pdflatex';
        await editor.savePreferences();
        await editor.compile();
        return { ok: editor.completed_build, pdf: jslab_web.fs.existsFileSync(root + '/source/MAIN.pdf'),
          chapter: await editor.host.request('forward', 'chapter.tex', 1, 1),
          messages: editor.$('latex-errors').textContent.trim() };
      });
      assert.ok(nested.ok && nested.pdf && nested.chapter, JSON.stringify(nested));
    }, { tags: ['gui', 'web', 'integration'], timeout_ms: 360000 });
  }
}

exports.MODULE_TESTS = tests;
