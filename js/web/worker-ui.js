/**
 * @file Numerical worker bridge for browser figures and workspace file writes
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const FIGURE_COMMANDS = ['legend', 'xlabel', 'ylabel', 'zlabel', 'title', 'xlim', 'ylim', 'zlim', 'view', 'zoom', 'axis', 'print', 'saveFigure', 'updatePlot'];
const PLOT_COMMANDS = ['legend', 'xlabel', 'ylabel', 'zlabel', 'title', 'xlim', 'ylim', 'zlim', 'view', 'zoom', 'axis', 'print', 'update', 'remove'];

/** Keeps computation and user variables in the Worker while the iframe owns DOM figures. */
class PRDC_JSLAB_WEB_WORKER_UI {
  constructor(jsl, files, send) {
    this.jsl = jsl; this.files = files; this.send = send;
    this.sequence = 0; this.pending = new Map(); this.tasks = [];
    this.fid = 0; this.active_figure = null; this.figures = new Map();
  }

  /** Installs synchronous figure facades with explicit asynchronous ready promises. */
  install() {
    const expose = (name, callback) => {
      this.jsl.context[name] = callback;
      this.jsl.inter.figures[name] = callback;
    };
    expose('figure', fid => {
      if(!Number.isInteger(fid) || fid < 0) fid = ++this.fid;
      this.fid = Math.max(this.fid, fid); this.active_figure = fid;
      const ready = this.request({ kind: 'figure', fid });
      this.figures.set(fid, { ...this.figures.get(fid), fid, ready });
      return fid;
    });
    expose('plot', (traces, options = {}) => {
      const fid = Number.isInteger(options.fid) ? options.fid : this.active_figure ?? this.jsl.context.figure();
      this.active_figure = fid;
      const handle = 'plot-' + (++this.sequence);
      const plot = { fid, ready: this.request({ kind: 'plot', fid, handle, args: [traces, options] }) };
      for(const method of PLOT_COMMANDS) plot[method] = (...args) => this.request({ kind: 'plot-method', handle, method, args });
      this.figures.set(fid, { fid, ready: plot.ready, plot });
      return plot;
    });
    expose('getFigure', fid => this.figures.get(fid ?? this.active_figure) || false);
    expose('getPlot', fid => this.figures.get(fid ?? this.active_figure)?.plot || false);
    for(const method of FIGURE_COMMANDS) expose(method, (...args) => this.request({ kind: 'figure-method', fid: this.active_figure, method, args }));
    expose('close', (id = this.active_figure, type = 'figure') => {
      if(type !== 'figure') throw Error('Only figure windows are supported by the numerical worker UI bridge.');
      if(id === 'all') { this.figures.clear(); this.active_figure = null; this.fid = 0; }
      else {
        this.figures.delete(id);
        if(id === this.active_figure) this.active_figure = Array.from(this.figures.keys()).at(-1) ?? null;
      }
      return this.request({ kind: 'close', fid: id });
    });
  }

  /** Enqueues a structured operation, retaining its original caller stack for failures. */
  request(operation) {
    const id = ++this.sequence;
    const origin = new Error();
    const NativePromise = this.jsl._Promise || Promise;
    const pending = new NativePromise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, origin });
      try { this.send({ type: 'ui-request', id, operation }); }
      catch(error) { this.pending.delete(id); reject(error); }
    });
    // Attach a rejection handler immediately: flush reports failures through the
    // normal evaluator even when a script does not explicitly await a setter.
    const task = pending.then(value => ({ value }), error => ({ error }));
    this.tasks.push(task);
    return pending;
  }

  /** Resolves a UI response without exposing DOM references to the Worker. */
  response(message) {
    const pending = this.pending.get(message.id);
    if(!pending) return;
    this.pending.delete(message.id);
    if(message.error) {
      const error = pending.origin;
      error.message = message.error;
      error.stack = 'Error: ' + message.error + '\n' + String(error.stack).split('\n').slice(1).join('\n');
      pending.reject(error);
    } else pending.resolve(message.value);
  }

  /** Awaits queued rendering/persistence so evaluation success includes its side effects. */
  async flush() {
    const tasks = this.tasks.splice(0);
    const results = await (this.jsl._Promise || Promise).all(tasks);
    const failure = results.find(result => result.error);
    if(failure) throw failure.error;
  }
}
exports.PRDC_JSLAB_WEB_WORKER_UI = PRDC_JSLAB_WEB_WORKER_UI;
exports.FIGURE_COMMANDS = FIGURE_COMMANDS;
exports.PLOT_COMMANDS = PLOT_COMMANDS;
