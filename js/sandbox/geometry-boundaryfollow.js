/**
 * @file JSLAB boundary follower grid and log bookkeeping
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Shares grid indexing and evaluation log state between boundary followers.
 */
class PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW {
  /**
   * Connects shared mathematical and environment services.
   * @param {Object} jsl Scientific runtime.
   */
  constructor(jsl) {
    this.jsl = jsl;
  }

  /**
   * Clears evaluation logs and optionally their feasibility cache.
   * @param {boolean} [keepCache=false] Whether cached evaluations are retained.
   */
  resetLogs(keepCache = false) {
    this.evalCount = 0;
    if(!keepCache) {
      this._cache.clear();
    }
    this._loggedKeys.clear();
    this.N[0].length = 0;
    this.N[1].length = 0;
  }

  /**
   * Finds the nearest node on a uniform grid axis.
   * @param {number} min Axis origin.
   * @param {number} step Node spacing.
   * @param {number} n Last node index.
   * @param {number} v Coordinate.
   * @returns {number} Bounded node index.
   */
  _closestNodeIndex(min, step, n, v) {
    if(n <= 0) {
      return 0;
    }
    const i = Math.round((v - min) / step);
    return this.jsl.inter.math.clamp(i, 0, n);
  }

  /**
   * Finds the nearest index in an explicitly stored uniform axis.
   * @param {Array<number>} A Axis coordinates.
   * @param {number} v Coordinate.
   * @param {number} max_i Last axis index.
   * @returns {number} Bounded axis index.
   */
  _nearestAxisIndex(A, v, max_i) {
      if(max_i <= 0) {
        return 0;
      }
      const d = (A[max_i] - A[0]) / max_i;
      const i = Math.round((v - A[0]) / d);
      return this.jsl.inter.math.clamp(i, 0, max_i);
    }
}

exports.PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW = PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW;
