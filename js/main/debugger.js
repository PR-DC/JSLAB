/**
 * @file JSLAB desktop debugger controls
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { isInternalDebugFrame } = require('../shared/debugger-frames');
const { PRDC_JSLAB_DEBUGGER_INSPECTOR } = require('../shared/debugger-inspector');
const { parseDebuggerCommand, executeDebuggerCommand } = require('../shared/debugger-commands');

/** Owns Command Window debugging while the Editor renders controls and the call stack. */
class PRDC_JSLAB_DEBUGGER_UI {
  constructor(win, ipc) {
    this.win = win; this.ipc = ipc; this.state = { state: 'idle', frames: [] }; this.frame_index = 0;
    this.inspector = new PRDC_JSLAB_DEBUGGER_INSPECTOR({
      currentString: id => language.currentString(id), token: () => this.scopeToken(),
      request: async (method, args) => {
        const reply = await this.command(method, { frame_index: this.frame_index, ...args });
        if(!reply.success) throw Error(reply.error);
        return reply.value;
      }, showInspector: model => win.command_window.showInspector(model)
    });

  }

  update(state) {
    const old = this.state; this.state = state; this.win.debug_paused = state.state === 'paused';
    if(state.state === 'paused' && (old.state !== 'paused' || old.revision !== state.revision || old.selected_target !== state.selected_target)) {
      this.frame_index = state.frames.findIndex(frame => !isInternalDebugFrame(frame));
      this.win.command_window.messageInternal(language.string(582));
      if(state.frames[this.frame_index] && !isInternalDebugFrame(state.frames[this.frame_index])) this.ipc.send('EditorWindow', 'debug-location', state.frames[this.frame_index]);
    }
    if(state.state !== 'paused') this.frame_index = 0;
    this._publish();
    this.refreshWorkspace();
    if(state.error) this.win.command_window.warn(state.error);
  }

  /** Shares the selected paused frame with the tool window and existing editor. */
  selectFrame(index, revision = this.state.revision) {
    if(this.state.state !== 'paused' || revision !== this.state.revision || !this.state.frames[index] || isInternalDebugFrame(this.state.frames[index])) return;
    this.frame_index = index;
    const frame = this.state.frames[index];
    this.ipc.send('EditorWindow', 'debug-location', frame);
    this._publish();
    this.refreshWorkspace();
    return frame;
  }

  /** Identifies the live selected frame; empty when its lexical scope has expired. */
  scopeToken() {
    return this.win.debug_paused && this.frame_index >= 0 ? JSON.stringify([this.state.revision, this.state.selected_target || '', this.frame_index]) : '';
  }

  /** Uses existing Workspace rows and restores the global view on resume. */
  async refreshWorkspace() {
    const token = this.scopeToken();
    const serial = this.workspace_serial = (this.workspace_serial || 0) + 1;
    if(!token) {
      if(this.global_workspace) { this.win.workspace.setWorkspace(this.global_workspace); this.global_workspace = null; }
      return;
    }
    if(!this.global_workspace) this.global_workspace = this.win.workspace.data;
    try {
      const variables = new Map();
      for(const scope of this.state.frames[this.frame_index]?.scopes || []) {
        if(['global', 'with'].includes(scope.type) || !scope.object_id) continue;
        const result = await this.inspector.request('inspect_debug_object', { object_id: scope.object_id }, token);
        for(const item of result.properties || []) if(!variables.has(item.name)) variables.set(item.name, item);
      }
      if(serial === this.workspace_serial && token === this.scopeToken()) this.win.workspace.setWorkspace(this.inspector.rows([...variables.values()]));
    } catch(error) { /* A resumed or superseded frame must not overwrite the Workspace. */ }
  }

  _publish() {
    this.ipc.send('DebuggerPane', 'state', { ...this.state, frame_index: this.frame_index });
  }

  async command(method, args = {}) {
    const result = await this.ipc.invoke('JSLAB_DEBUGGER', method, args);
    if(!result.success) this.win.command_window.error(result.error);
    return result;
  }

  async evaluate(expression) {
    if(this.frame_index < 0) { this.win.command_window.error(language.currentString(620)); return; }
    try {
      if(await this.inspector.handle(expression)) { await this.refreshWorkspace(); return; }
    } catch(error) { this.win.command_window.error(error.message); return; }
    const result = await this.command('evaluate_debug_expression', { expression, frame_index: this.frame_index, allow_side_effects: true });
    if(result.success) {
      if(result.value.error) this.win.command_window.error(result.value.error);
      else {
        const value = result.value.value;
        this.win.command_window.message(value?.value !== undefined ? JSON.stringify(value.value) : value?.unserializable_value || value?.description || value?.type);
      }
    }
    await this.refreshWorkspace();
  }

  async executeCommand(text) {
    try {
      const result = await executeDebuggerCommand(text, {
        frameIndex: () => this.frame_index,
        selectFrame: index => this.selectFrame(index),
        request: async (method, args) => {
          if(method === 'interrupt_execution') { this.ipc.send('SandboxWindow', 'interrupt-execution'); return { requested: true }; }
          const result = await this.command(method, args);
          if(!result.success) throw Error(result.error);
          return result.value;
        }
      });
      if(result.value !== undefined) this.win.command_window.message(JSON.stringify(result.value));
    } catch(error) { this.win.command_window.error(error.message); }
  }

  isCommand(text) { return !!parseDebuggerCommand(text); }
}
exports.PRDC_JSLAB_DEBUGGER_UI = PRDC_JSLAB_DEBUGGER_UI;
