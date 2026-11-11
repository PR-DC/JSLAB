/**
 * @file Shared CodeMirror breakpoint gutter and paused source decoration
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/** Keeps editor markers synchronized with host debugger settings. */
class PRDC_JSLAB_CODE_DEBUGGER {
  /** @param {Object} editor CodeMirror. @param {Object} host Path and command callbacks. */
  constructor(editor, host) {
    this.editor = editor; this.host = host; this.state = {};
    editor.on('gutterClick', (_editor, line, gutter, event) => {
      if(!['CodeMirror-linenumbers', 'jslab-breakpoints'].includes(gutter)) return;
      this.toggle(line, !!event?.shiftKey).catch(error => host.error?.(error.message));
    });
  }

  /** Adds/removes a breakpoint; Shift-click opens its condition and enabled state. */
  async toggle(line, edit = false) {
    const path = this.host.path();
    if(!path) throw Error(this.editor.getWrapperElement().ownerDocument.defaultView.language.currentString(586));
    const point = (this.state.breakpoints || []).find(point => point.path === path && point.line === line + 1);
    if(edit) return this.editCondition(path, line + 1, point);
    await this.host.request(point ? 'remove_breakpoint' : 'set_breakpoint', point ? { id: point.id || path + ':' + (line + 1) } : { path, line: line + 1 });
  }

  /** Displays a small condition editor supported by Electron and ordinary browsers. */
  editCondition(path, line, point = {}) {
    this.dialog?.remove();
    const document = this.editor.getWrapperElement().ownerDocument;
    const dialog = document.createElement('div');
    dialog.setAttribute('aria-label-str', '587');
    dialog.className = 'jslab-breakpoint-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-label', this.editor.getWrapperElement().ownerDocument.defaultView.language.currentString(587));
    const condition = document.createElement('input'); condition.type = 'text'; condition.placeholder = this.editor.getWrapperElement().ownerDocument.defaultView.language.currentString(588); condition.value = point.condition || '';
    condition.setAttribute('str', '588');
    const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = point.enabled !== false;
    const label = document.createElement('label');
    const enabled_text = document.createElement('span'); enabled_text.setAttribute('lang-str', '589');
    enabled_text.textContent = this.editor.getWrapperElement().ownerDocument.defaultView.language.currentString(589);
    label.append(enabled, enabled_text);
    const save = document.createElement('button'); save.textContent = this.editor.getWrapperElement().ownerDocument.defaultView.language.currentString(590);
    const cancel = document.createElement('button'); cancel.textContent = this.editor.getWrapperElement().ownerDocument.defaultView.language.currentString(52);
    save.setAttribute('lang-str', '590'); cancel.setAttribute('lang-str', '52');
    save.addEventListener('click', async () => {
      try {
        await this.host.request('set_breakpoint', { path, line, condition: condition.value, enabled: enabled.checked });
        dialog.remove();
      } catch(error) { this.host.error?.(error.message); }
    });
    cancel.addEventListener('click', () => dialog.remove());
    dialog.append(condition, label, save, cancel); document.body.appendChild(dialog);
    this.dialog = dialog; condition.focus();
  }

  /** Renders original-source breakpoints and the selected paused source line. */
  update(state, selected) {
    this.state = state || {};
    this.selected_frame = selected;
    const editor = this.editor;
    const points = (this.state.breakpoints || []).filter(point => point.path === this.host.path() && point.line > 0 && point.line <= editor.lineCount());
    const gutters = editor.getOption('gutters') || [];
    const other_gutters = gutters.filter(gutter => gutter !== 'jslab-breakpoints');
    const next_gutters = points.length ? ['jslab-breakpoints', ...other_gutters] : other_gutters;
    if(gutters.join('|') !== next_gutters.join('|')) editor.setOption('gutters', next_gutters);
    editor.clearGutter('jslab-breakpoints');
    for(const point of points) {
      const marker = editor.getWrapperElement().ownerDocument.createElement('span');
      marker.className = 'jslab-breakpoint-marker';
      marker.classList.toggle('disabled', point.enabled === false);
      marker.title = (point.enabled === false ? this.editor.getWrapperElement().ownerDocument.defaultView.language.currentString(592) : '') + (point.condition || this.editor.getWrapperElement().ownerDocument.defaultView.language.currentString(591)) + this.editor.getWrapperElement().ownerDocument.defaultView.language.currentString(593);
      marker.setAttribute('aria-label', marker.title);
      editor.setGutterMarker(point.line - 1, 'jslab-breakpoints', marker);
    }
    if(this.execution_line != null) editor.removeLineClass(this.execution_line, 'background', 'jslab-debug-line');
    this.execution_line = null;
    const frame = selected || this.state.frames?.[this.state.frame_index ?? 0];
    if(this.state.state === 'paused' && frame?.path === this.host.path() && frame.line > 0 && frame.line <= editor.lineCount()) {
      this.execution_line = editor.getLineHandle(frame.line - 1);
      editor.addLineClass(this.execution_line, 'background', 'jslab-debug-line');
      editor.scrollIntoView({ line: frame.line - 1, ch: Math.max(0, (frame.column || 1) - 1) }, 60);
    }
  }
}
exports.PRDC_JSLAB_CODE_DEBUGGER = PRDC_JSLAB_CODE_DEBUGGER;
