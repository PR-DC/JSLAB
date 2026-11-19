/**
 * @file JSLAB Simulate script request ownership and cancellation
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Tracks requests while the picker, window or compiler is pending.
 */
class PRDC_JSLAB_SIMULATE_AUTOMATION {
  /**
   * Initializes the active requests for one host.
   */
  constructor() {
    this.requests = new Map();
  }

  /**
   * Keeps a request cancellable until its result settles.
   * @param {string} [id] Workspace request identifier.
   * @param {*} owner Caller that can cancel the request.
   * @param {Function} operation Runs the request and can supply a stop callback.
   * @returns {Promise<*>} Operation result.
   */
  async run(id, owner, operation) {
    if(this.requests.has(id)) throw Error('Duplicate Simulate request ID.');
    const request = { cancelled: false, owner };
    if(id) this.requests.set(id, request);
    try {
      return await operation(request);
    } finally {
      if(this.requests.get(id) === request) this.requests.delete(id);
    }
  }

  /**
   * Cancels only the matching request from its original caller.
   * @param {string} id Workspace request identifier.
   * @param {*} owner Caller requesting cancellation.
   * @returns {boolean} Whether cancellation was requested.
   */
  cancel(id, owner) {
    const request = this.requests.get(id);
    if(!request || request.owner !== owner || request.cancelled) return false;
    request.cancelled = true;
    request.stop?.();
    return true;
  }
}

exports.PRDC_JSLAB_SIMULATE_AUTOMATION = PRDC_JSLAB_SIMULATE_AUTOMATION;
