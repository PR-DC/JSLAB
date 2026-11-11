/**
 * @file Resizable debugger area below the Editor source
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_DEBUGGER_PANE_VIEW } = require('./debugger-pane-view');

/** Reuses the host's panel implementation without moving execution or variables. */
class PRDC_JSLAB_EDITOR_DEBUGGER_PANE {
  constructor(document, host) {
    this.document = document; this.host = host;
    this.element = document.getElementById('editor-debugger-pane');
    this.code = document.getElementById('code');
    this.view = new PRDC_JSLAB_DEBUGGER_PANE_VIEW(document, host);
    this.split = host.createPanel(document.getElementById('editor-workspace'), [this.code, this.element], () => host.refresh());
    const stored_top = this.split.cells_size?.[0];
    const top = Number.isFinite(stored_top) ? Math.max(10,Math.min(90,stored_top)) : 70;
    this.split.cells_size = [top,100-top];
    this.resizer = document.querySelector('#editor-workspace .horizontal-resizer');
    document.getElementById('editor-debugger-close').addEventListener('click', () => this.hide());
    document.defaultView.addEventListener('resize', () => this._layout());
    this.hide(false);
  }

  update(state) {
    const old = this.view.state;
    if(state.revision != null && old.revision != null && state.revision < old.revision && state.selected_target === old.selected_target) return;
    this.view.update(state);
    if(state.state === 'paused' && !this.visible && !this.suppressed) this.show(true);
    if(['idle', 'closed', 'unavailable'].includes(state.state)) {
      if(this.auto_opened) this.hide(false);
      this.suppressed = false;
    }
  }

  show(automatic = false) {
    this.visible = true; this.auto_opened = automatic; this.suppressed = false;
    this._layout();
  }

  hide(manual = true) {
    this.view.menu.close();
    this.visible = false; this.auto_opened = false;
    if(manual) this.suppressed = true;
    this._layout();
  }

  toggle() { if(this.visible) this.hide(); else this.show(); }

  /** Restores source space when hidden and preserves the splitter ratio. */
  _layout() {
    this.element.hidden = !this.visible; this.resizer.hidden = !this.visible;
    const sizes = this.split.cells_size;
    const top = Number.isFinite(sizes?.[0]) ? Math.max(10, Math.min(90, sizes[0])) : 70;
    this.code.style.top = '0'; this.code.style.height = this.visible ? top + '%' : '100%';
    this.element.style.top = top + '%'; this.element.style.height = 100 - top + '%';
    this.resizer.style.top = 'calc(' + top + '% - 5px)';
    this.document.getElementById('editor-debugger-open').setAttribute('aria-expanded', String(!!this.visible));
    this.split.onResize();
  }
}
exports.PRDC_JSLAB_EDITOR_DEBUGGER_PANE = PRDC_JSLAB_EDITOR_DEBUGGER_PANE;
