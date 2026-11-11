/**
 * @file Shared debugger source classification
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/** Runtime frames remain available through debugger APIs, outside user navigation. */
function isInternalDebugFrame(frame) {
  const path = String(frame?.path || '').replace(/\\/g, '/');
  return !path || frame?.internal === true || /^(?:node:|electron:)/i.test(path) ||
    /\/js\/(?:sandbox|shared|backend|web)\//i.test(path);
}
exports.isInternalDebugFrame = isInternalDebugFrame;
