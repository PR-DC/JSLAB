/**
 * @file JSLAB Electron LaTeX Editor renderer startup
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

import * as pdfjs from '../../node_modules/pdfjs-dist/build/pdf.mjs';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href;

const host = window.latexHost;
const settings = await host.request('settings');
let url;
try {
  const bundle = await host.request('bundle');
  url = URL.createObjectURL(new Blob([bundle], { type: 'text/javascript' }));
  const { default: { PRDC_JSLAB_LATEX_EDITOR } } = await import(url);
  const editor = new PRDC_JSLAB_LATEX_EDITOR(host, settings, pdfjs,
    () => new Worker(new URL('../other-shared/latex-wasm-worker.js', import.meta.url)));
  window.confirmLatexReload = () => editor.confirmReload(() => host.request('focus'));
  await host.request('ready');
} catch(error) {
  document.getElementById('status').textContent = settings.strings[721];
  console.error(error);
} finally {
  if(url) URL.revokeObjectURL(url);
}
