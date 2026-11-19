/**
 * @file JSLAB browser LaTeX Editor startup
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LATEX_EDITOR } = require('../latex-editor/latex-editor');

globalThis.__JSLAB_WEB_LATEX_READY__ = (async function() {
  const host = parent.__JSLAB_WEB_BRIDGE__.getLatexEditorHost(globalThis);
  const settings = await host.request('settings');
  const pdfjs = await import(new URL('../lib/pdfjs/pdf.mjs', document.baseURI).href);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../lib/pdfjs/pdf.worker.mjs', document.baseURI).href;
  const editor = new PRDC_JSLAB_LATEX_EDITOR(host, settings, pdfjs, () => host.createWorker());
  globalThis.__JSLAB_WEB_CONFIRM_RELOAD__ = focus => editor.confirmReload(focus);
  return editor;
})().catch(error => {
  const status = document.getElementById('status');
  status.textContent = error.message;
  status.hidden = false;
  throw error;
});
