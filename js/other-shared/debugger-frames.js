/**
 * @file Shared debugger source classification
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for shared debugger frames operations.
 */
class PRDC_JSLAB_SHARED_DEBUGGER_FRAMES_HELPER {

  /**
   * Runtime frames remain available through debugger APIs, outside user navigation.
   */
  static isInternalDebugFrame(frame) {
    const path = String(frame?.path || '').replace(/\\/g, '/');
    return !path || frame?.internal === true || /^(?:node:|electron:)/i.test(path) ||
      /\/js\/(?:sandbox|shared|backend|web)\//i.test(path);
  }
}


exports.isInternalDebugFrame = PRDC_JSLAB_SHARED_DEBUGGER_FRAMES_HELPER.isInternalDebugFrame;
