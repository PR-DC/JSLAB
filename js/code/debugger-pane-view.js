/**
 * @file Shared Editor debugger controls and call stack
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_POPUP } = require('../../lib/PRDC_POPUP/PRDC_POPUP');
const { isInternalDebugFrame } = require('../shared/debugger-frames');
class PRDC_JSLAB_DEBUGGER_PANE_VIEW {
  constructor(document, host) {
    this.document = document; this.host = host; this.state = {}; this.sequence = 0;
    this.menu_button = document.getElementById('debugger-menu-toggle');
    this.menu_element = document.getElementById('debugger-menu');
    this.menu = new PRDC_POPUP(this.menu_button, this.menu_element, () => {
      const rect = this.menu_button.getBoundingClientRect();
      const viewport = document.defaultView;
      const max_height = viewport.innerHeight - 20;
      this.menu_element.style.maxHeight = max_height + 'px';
      const display = this.menu_element.style.display;
      this.menu_element.style.display = 'block';
      const height = this.menu_element.getBoundingClientRect().height;
      this.menu_element.style.display = display;
      const above = rect.bottom + height + 10 > viewport.innerHeight;
      this.menu_element.dataset.above = String(above);
      this.menu_element.style.right = Math.max(10, viewport.innerWidth - rect.right) + 'px';
      this.menu_element.style.top = Math.max(10, above ? rect.top - height - 10 : rect.bottom + 10) + 'px';
      this.menu_button.setAttribute('aria-expanded', 'true');
    }, () => this.menu_button.setAttribute('aria-expanded', 'false'));
    document.addEventListener('keydown', event => {
      if(event.key === 'Escape' && this.menu.visible) {
        this.menu.close(); this.menu_button.focus(); event.preventDefault();
      }
    });
    this.frames = document.getElementById('debugger-frames');
    this.targets = document.getElementById('debugger-targets');
    this.exceptions = document.getElementById('debugger-exceptions');
    this.message = document.getElementById('debugger-message');
    for(const button of document.querySelectorAll('[data-debug-action]')) {
      const action = button.dataset.debugAction;
      button.hidden = action === 'restart' && host.platform === 'web' || action === 'reset' && host.platform !== 'web';
      if(action === 'apply' && host.platform === 'web') {
        button.setAttribute('lang-str', '568'); button.setAttribute('title-str', '579');
      }
      button.addEventListener('click', () => this._run(async () => {
        this.menu.close();
        if(action === 'reset') return host.request('reset_debugger');
        if(action === 'restart') return host.request('restart_debug_frame', { frame_index: Number(this.frames.value) });
        if(action === 'apply') return host.request('update_debug_script', { path: this.state.frames?.[Number(this.frames.value)]?.path });
      }));
    }
    this.frames.addEventListener('change', () => this._run(() => host.request('select_debug_frame', {
      frame_index: Number(this.frames.value), revision: this.state.revision
    })));
    this.targets.addEventListener('change', () => this._run(() => host.request('select_debug_target', { session_id: this.targets.value || null })));
    this.exceptions.addEventListener('change', () => this._run(() => host.request('set_exception_pause', { state: this.exceptions.value })));
    this.update({ state: 'starting', frames: [] });
  }

  /** Updates live controls without evaluating code or retaining scope handles. */
  update(state) {
    state = state || { state: 'unavailable' };
    this.state = state;
    const paused = state.state === 'paused';
    const frames = paused ? (state.frames || []).map((frame, index) => ({frame, index})).filter(item => !isInternalDebugFrame(item.frame)) : [];
    const status = this.document.getElementById('debugger-state');
    const status_id = paused ? 583 : ['running', 'starting', 'stopping'].includes(state.state) ? 622 : ['unavailable', 'closed'].includes(state.state) ? 581 : 87;
    status.setAttribute('lang-str', String(status_id)); status.textContent = this.host.currentString(status_id);
    this.exceptions.value = state.pause_on_exceptions || 'none';
    this.exceptions.disabled = ['closed', 'unavailable', 'starting'].includes(state.state);
    for(const button of this.document.querySelectorAll('[data-debug-action]')) {
      const action = button.dataset.debugAction;
      button.hidden = action === 'restart' && this.host.platform === 'web' || action === 'reset' && this.host.platform !== 'web';
      button.disabled = action === 'reset' ? ['starting', 'stopping'].includes(state.state) : !paused || !frames.length;
    }
    this._options(this.targets, [{ value: '', text: this.host.currentString(574), str: 574 }, ...(state.workers || []).map(worker => ({
      value: worker.session_id, text: worker.name || worker.url || worker.session_id, disabled: !worker.paused
    }))]);
    this.targets.value = state.selected_target || ''; this.targets.disabled = !paused && !(state.workers || []).some(worker => worker.paused);
    this.document.getElementById('debugger-target-row').hidden = !(state.workers || []).length;
    this._options(this.frames, frames.map(({frame, index}) => ({ value: String(index),
      text: frame.name + ' (' + String(frame.path).replace(/\\/g, '/').split('/').pop() + ':' + frame.line + ')',
      title: frame.path + ':' + frame.line, disabled: frame.inspectable === false })));
    const selected = frames.some(item => item.index === state.frame_index) ? state.frame_index : frames[0]?.index ?? -1;
    this.frames.value = String(selected); this.frames.disabled = !paused;
    this.frames.hidden = !frames.length;
    this.document.getElementById('debugger-empty').hidden = !!frames.length;
    const history = paused ? (state.async_stack || []).map(entry => ({ ...entry,
      frames: (entry.frames || []).filter(frame => !isInternalDebugFrame(frame)) })).filter(entry => entry.frames.length) : [];
    const history_details = this.document.getElementById('debugger-history-details');
    history_details.hidden = !history.length;
    this.document.getElementById('debugger-history-row').hidden = !history.length;
    if(!paused) history_details.open = false;
    this.document.getElementById('debugger-history').textContent = history.map(entry => '[' + entry.description + ']\n' +
      entry.frames.map(frame => frame.name + ' (' + frame.path + ':' + frame.line + ')').join('\n')).join('\n');
    if(state.error) this.message.textContent = state.error;
  }

  /** Serializes actions and displays transport/engine errors in the existing pane. */
  async _run(operation) {
    if(this.busy) return;
    this.busy = true;
    const sequence = ++this.sequence;
    this.message.textContent = '';
    try {
      const result = await operation();
      if(result?.applied === false) this.message.textContent = this.host.currentString(584) + result.status;
    } catch(error) { if(sequence === this.sequence) this.message.textContent = error.message; }
    finally { this.busy = false; }
  }

  _options(select, items) {
    select.replaceChildren();
    for(const item of items) {
      const option = this.document.createElement('option'); option.value = item.value; option.textContent = item.text;
      option.disabled = !!item.disabled; if(item.title) option.title = item.title; if(item.str) option.setAttribute('str', String(item.str));
      select.appendChild(option);
    }
  }
}
exports.PRDC_JSLAB_DEBUGGER_PANE_VIEW = PRDC_JSLAB_DEBUGGER_PANE_VIEW;
