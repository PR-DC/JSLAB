/**
 * @file Compact Editor execution controls
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { isInternalDebugFrame } = require('../shared/debugger-frames');

/** Keeps execution controls beside the source and reuses the Editor Run action. */
class PRDC_JSLAB_DEBUGGER_TOOLBAR {
  constructor(document, host) {
    this.document = document; this.host = host; this.state = {};
    this.element = document.getElementById('editor-debugger-controls');
    for(const button of this.element.querySelectorAll('[data-editor-debug-action]')) {
      button.addEventListener('click', () => this._run(button.dataset.editorDebugAction));
    }
    document.getElementById('editor-debugger-open').addEventListener('click', () => {
      Promise.resolve().then(() => { host.closeMenu?.(); return host.open(); }).catch(error => host.error(error.message));
    });
    document.addEventListener('keydown', event => {
      if(event.defaultPrevented) return;
      if(host.platform === 'web' && event.ctrlKey && event.key.toLowerCase() === 'c' &&
          ['running', 'paused'].includes(this.state.state) && !host.hasSelection()) {
        event.preventDefault(); this._run('stop');
      } else if(this.state.state === 'paused' && ['F10', 'F11'].includes(event.key)) {
        event.preventDefault(); this._run(event.key === 'F10' ? 'stepOver' : event.shiftKey ? 'stepOut' : 'stepInto');
      }
    });
    this.update({state:'idle'});
  }

  /** Returns true when the existing Run menu was used to pause or continue. */
  handleRun() {
    if(!['running', 'paused'].includes(this.state.state)) return false;
    this._run(this.state.state === 'paused' ? 'continue' : 'pause');
    return true;
  }

  update(state = {}) {
    this.state = state;
    const paused = state.state === 'paused';
    const active = paused || state.state === 'running';
    this.document.getElementById('editor-debugger-actions').hidden = !active;
    this.element.hidden = !active;
    for(const button of this.element.querySelectorAll('[data-editor-debug-action]')) {
      button.disabled = button.dataset.editorDebugAction === 'stop' ? !active : !paused ||
        !(state.frames || []).some(frame => !isInternalDebugFrame(frame));
    }
    const run = this.document.getElementById('run-menu');
    const label = paused ? 563 : state.state === 'running' ? 562 : 14;
    const title = paused ? 626 : state.state === 'running' ? 575 : 30;
    const text = run.querySelector('str');
    text.setAttribute('sid', String(label)); text.setAttribute('lang-str', String(label));
    text.textContent = this.host.currentString(label);
    run.setAttribute('title-str', String(title)); run.title = this.host.currentString(title);
    run.querySelector('img').src = paused ? '../img/debug-continue.svg' : state.state === 'running' ? '../img/debug-pause.svg' : '../img/run.svg';
  }

  async _run(action) {
    if(this.busy && action !== 'stop') return;
    if(action.startsWith('step') && this.element.querySelector('[data-editor-debug-action="' + action + '"]').disabled) return;
    this.busy = true;
    try {
      await this.host.request(action === 'stop' ? 'interrupt_execution' : action === 'pause' ? 'pause_execution' : 'resume_execution',
        ['continue', 'stepOver', 'stepInto', 'stepOut'].includes(action) ? {action} : {});
    } catch(error) { this.host.error(error.message); }
    finally { this.busy = false; }
  }
}
exports.PRDC_JSLAB_DEBUGGER_TOOLBAR = PRDC_JSLAB_DEBUGGER_TOOLBAR;
