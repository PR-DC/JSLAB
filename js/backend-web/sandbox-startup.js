/**
 * @file Browser sandbox startup and bounded workspace previews
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WEB_NODE_COMPATIBILITY } = require("./node-compatibility");


/**
 * Class for web sandbox startup.
 */
class PRDC_JSLAB_WEB_SANDBOX_STARTUP {

  /**
   * Ensures browser process.
   */
  static ensureBrowserProcess() {
    return PRDC_JSLAB_WEB_NODE_COMPATIBILITY.ensure();
  }

  /**
   * Returns a bounded workspace preview for the host interface.
   * @param {*} value Value.
   */
  static previewValue(value) {
    if(value === undefined) {
      return 'undefined';
    }
    if(value === null) {
      return 'null';
    }
    if(typeof value == 'string') {
      return JSON.stringify(value.length > 200 ? value.slice(0, 197) + '...' : value);
    }
    if(typeof value == 'number' || typeof value == 'boolean' || typeof value == 'bigint') {
      return String(value);
    }
    if(typeof value == 'function') {
      return '[Function ' + (value.name || 'anonymous') + ']';
    }
    if(Array.isArray(value)) {
      return 'Array(' + value.length + ')';
    }
    if(value instanceof Promise) {
      return '[Promise]';
    }
    var ctor = value && value.constructor && value.constructor.name
      ? value.constructor.name
      : 'Object';
    var keys = Object.keys(value || {});
    return ctor + (keys.length ? ' {' + keys.slice(0, 5).join(', ') + (keys.length > 5 ? ', ...' : '') + '}' : '');
  }
}

exports.PRDC_JSLAB_WEB_SANDBOX_STARTUP = PRDC_JSLAB_WEB_SANDBOX_STARTUP;
