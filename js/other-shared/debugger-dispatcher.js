/**
 * @file Shared dispatch for structured debugger requests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_DEBUGGER_STATE } = require("./debugger-state");

/**
 * Routes debugger requests through explicit host operations.
 */
class PRDC_JSLAB_DEBUGGER_DISPATCHER {
  /**
   * Converts a debugger operation into the response used by renderer clients.
   * @param {Function} operation Host debugger operation.
   * @returns {Promise<Object>} Successful value or normalized error.
   */
  static async request(operation) {
    try {
      return { success: true, value: await operation() };
    } catch(error) {
      return { success: false, error: String(error?.message || error) };
    }
  }

  /**
   * Connects debugger targets, view updates and host method names.
   * @param {Object} operations Host operations and state readers.
   * @param {Object} [methods={}] Names used by the host debugger transport.
   */
  constructor(operations, methods = {}) {
    this._operations = operations;
    this._methods = Object.assign({ inspect: 'inspectObject', evaluate: 'evaluatePaused', resume: 'resumeTargets' }, methods);
  }

  /**
   * Dispatches the debugger API used by GUI and automation clients.
   * @param {string} method Requested debugger operation.
   * @param {Object} [args={}] Operation arguments.
   * @returns {*} Host result or pending operation.
   */
  dispatch(method, args = {}) {
    const target = this._operations.getDebugger();
    const root = this._operations.getRootDebugger?.() || target;
    switch(method) {
      case 'get_debug_state': return this._operations.getState?.() || target.status();
      case 'select_debug_frame': {
        const state = this._operations.getState?.() || target.status();
        PRDC_JSLAB_DEBUGGER_STATE.validateFrameSelection(state, args);
        return this._operations.selectFrame(args, state);
      }
      case 'select_debug_target':
        return this._operations.selectTarget ? this._operations.selectTarget(args.session_id || null) : root.selectTarget(args.session_id || null);
      case 'interrupt_execution': return root.interrupt();
      case 'pause_execution': return target.pause();
      case 'resume_execution': return root[this._methods.resume](args.action);
      case 'inspect_debug_object': return target[this._methods.inspect](args.object_id);
      case 'evaluate_debug_expression': return target[this._methods.evaluate](args.expression, args.frame_index, args.allow_side_effects === true);
      case 'set_breakpoint': return target.setBreakpoint(args.path, args.line, args.condition, args.enabled);
      case 'remove_breakpoint': return target.removeBreakpoint(args.id);
      case 'clear_breakpoints': return target.clearBreakpoints();
      case 'set_exception_pause': return target.setExceptionPause(args.state);
      case 'update_debug_script': return target.updateScript(args.path, args.code, args);
      case 'restart_debug_frame':
        if(typeof target.restartFrame === 'function') {
          return target.restartFrame(args.frame_index);
        }
        break;
      case 'reset_debugger':
        if(this._operations.reset) {
          return this._operations.reset();
        }
    }
    throw Error('Unknown debugger command.');
  }

  /**
   * Calls a renderer debugger transport and unwraps its common response.
   * @param {Object} host Renderer transport.
   * @param {string} method Debugger operation.
   * @param {Object} args Operation arguments.
   * @returns {Promise<*>} Debugger result.
   */
  static async invoke(host, method, args) {
    const result = await host.invoke('JSLAB_DEBUGGER', method, args);
    if(!result.success) {
      throw Error(result.error);
    }
    return result.value;
  }

}

exports.PRDC_JSLAB_DEBUGGER_DISPATCHER = PRDC_JSLAB_DEBUGGER_DISPATCHER;
