/**
 * @file Common debugger state, settings and command validation
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Owns debugger policy independently of the Chromium or worker transport.
 */
class PRDC_JSLAB_DEBUGGER_STATE {
  /**
   * Initializes the state and settings shared by host debugger adapters.
   * @param {Object} [callbacks={}] Host state and settings notifications.
   */
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.state = 'idle';
    this.frames = [];
    this.breakpoints = new Map();
    this.pause_on_exceptions = 'none';
    this.selected_target = null;
    this.revision = 0;
  }

  /**
   * Returns portable settings without transport-specific breakpoint bindings.
   * @returns {Object} Persistable debugger settings.
   */
  settings() {
    return { breakpoints: Array.from(this.breakpoints.values(), ({ bindings, ...point }) => point),
      pause_on_exceptions: this.pause_on_exceptions };
  }

  /**
   * Validates source coordinates, conditions and enabled state before host work.
   * @param {string} path Script path.
   * @param {number} line One-based line number.
   * @param {string} condition Optional JavaScript condition.
   * @param {boolean} enabled Whether the breakpoint is enabled.
   */
  _validateBreakpoint(path, line, condition, enabled) {
    if(typeof path !== 'string' || !path.length || !Number.isInteger(line) || line < 1) {
      throw Error('Expected a script path and positive line number.');
    }
    if(typeof condition !== 'string' || condition.length > 16000 || typeof enabled !== 'boolean') {
      throw Error('Invalid breakpoint condition or enabled state.');
    }
    if(condition.trim()) {
      require('@babel/parser').parseExpression(condition);
    }
  }

  /**
   * Validates the common exception-pause setting.
   * @param {string} state Requested exception policy.
   */
  _validateExceptionPause(state) {
    if(!['none', 'uncaught', 'all'].includes(state)) {
      throw Error('Invalid exception pause mode.');
    }
  }

  /**
   * Validates the step operation before sending it to a host transport.
   * @param {string} action Continue or a supported step operation.
   */
  _validateResumeAction(action) {
    if(!['continue', 'stepInto', 'stepOver', 'stepOut'].includes(action)) {
      throw Error('Unknown debugger action.');
    }
  }

  /**
 * Requires a paused execution before inspecting its frames or objects.
 */
  _requirePaused() {
    if(this.state !== 'paused') {
      throw new Error('Debugger is not paused.');
    }
  }

  /**
   * Rejects handles captured before execution resumed or the target changed.
   * @param {number} revision Revision captured when the request started.
   */
  _checkRevision(revision) {
    this._requirePaused();
    if(revision !== this.revision) {
      throw new Error('Paused frame has expired.');
    }
  }

  /**
   * Validates a selected frame against the currently published pause.
   * @param {Object} state Current debugger snapshot.
   * @param {Object} args Frame index and optional pause revision.
   */
  static validateFrameSelection(state, args) {
    if(state.state !== 'paused' || !Number.isInteger(args.frame_index) || !state.frames?.[args.frame_index] ||
        args.revision !== undefined && args.revision !== state.revision) {
      throw Error('Expired debugger frame.');
    }
  }
}

exports.PRDC_JSLAB_DEBUGGER_STATE = PRDC_JSLAB_DEBUGGER_STATE;
