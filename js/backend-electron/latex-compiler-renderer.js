/**
 * @file JSLAB Electron LaTeX compiler worker startup
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const host = window.latexCompilerHost;
host.onCompile(job => {
  try {
    const worker = new Worker(new URL('../other-shared/latex-wasm-worker.js', import.meta.url));
    worker.onmessage = ({ data }) => host.complete(data);
    worker.onerror = event => host.complete({ error: event.message });
    worker.onmessageerror = () => host.complete({ error: 'BusyTeX' });
    worker.postMessage(job);
  } catch(error) {
    host.complete({ error: error.message });
  }
});
