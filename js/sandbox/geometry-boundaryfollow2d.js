/**
 * @file JSLAB library geometry Boundary Follow 2D submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.2
 */

const OPPOSITE_EDGE = [2, 3, 0, 1];

// Marching-squares segment tables (edges: 0=L,1=T,2=R,3=B)
const SEG_TABLE_A = [
  [],                 // 0
  [[0, 3]],           // 1
  [[3, 2]],           // 2
  [[0, 2]],           // 3
  [[2, 1]],           // 4
  [[0, 3], [2, 1]],   // 5 (ambiguous A)
  [[3, 1]],           // 6
  [[0, 1]],           // 7
  [[0, 1]],           // 8
  [[3, 1]],           // 9
  [[0, 1], [3, 2]],   // 10 (ambiguous A)
  [[1, 2]],           // 11
  [[0, 2]],           // 12
  [[3, 2]],           // 13
  [[0, 3]],           // 14
  []                  // 15
];

const SEG_TABLE_B = [
  [],                 // 0
  [[0, 3]],           // 1
  [[3, 2]],           // 2
  [[0, 2]],           // 3
  [[2, 1]],           // 4
  [[0, 1], [3, 2]],   // 5 (ambiguous B)
  [[3, 1]],           // 6
  [[0, 1]],           // 7
  [[0, 1]],           // 8
  [[3, 1]],           // 9
  [[0, 3], [2, 1]],   // 10 (ambiguous B)
  [[1, 2]],           // 11
  [[0, 2]],           // 12
  [[3, 2]],           // 13
  [[0, 3]],           // 14
  []                  // 15
];

class PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D {
  
  /**
   * Boundary follower (2D).
   *
   * It:
   * - searches from opts.origin on a coarse grid until it finds a feasibility “flip edge”
   * - builds a fine grid with spacing dx/dy
   * - refines the coarse flip edge to a fine flip bracket
   * - performs a marching-squares walk to decide if the boundary is closed (within bbox)
   *
   * @param {Object} jsl - Reference to main JSLAB object.
   * @param {Function} feasibleFn - Function(x,y)->boolean
   * @param {Object} opts
   * @param {Object} opts.bbox - {xmin,xmax,ymin,ymax}
   * @param {Object} [opts.origin={x:0,y:0}] - {x,y}
   * @param {number} [opts.seedNx=25]
   * @param {number} [opts.seedNy=25]
   * @param {number} [opts.seedRefine=0.5] - Must be in (0,1)
   * @param {number} [opts.snapBand=2]
   * @param {number} [opts.maxTraceSteps=200000]
   * @param {string} [opts.ambiguous="A"] - "A" or "B" for ambiguous marching-squares cases (5 and 10)
   * @param {string} [opts.logMode="unique"] - "unique"|"all"|"off"
   * @param {number} [opts.logKeyDecimals=12]
   * @param {number} [opts.maxEval=5000000]
   */
  constructor(jsl, feasibleFn, opts) {
    this.jsl = jsl;

    if(!opts || !opts.bbox) throw new Error(this.jsl.inter.lang.string(274));
    this._fUser = feasibleFn;

    this.opts = {
      origin: { x: 0, y: 0 },

      seedNx: 25,
      seedNy: 25,
      seedRefine: 0.5,

      snapBand: 2,

      maxTraceSteps: 200000,
      ambiguous: "A",

      logMode: "unique",
      logKeyDecimals: 12,

      maxEval: 5_000_000,

      ...opts,
    };

    const b = opts.bbox;
    const has_x = Number.isFinite(b.xmin) && Number.isFinite(b.xmax);
    const has_y = Number.isFinite(b.ymin) && Number.isFinite(b.ymax);
    if(!(has_x && has_y)) throw new Error(this.jsl.inter.lang.string(284));

    this._bbox = {
      xmin: Math.min(b.xmin, b.xmax),
      xmax: Math.max(b.xmin, b.xmax),
      ymin: Math.min(b.ymin, b.ymax),
      ymax: Math.max(b.ymin, b.ymax),
    };

    this.evalCount = 0;

    // Cache: Map<x, Map<y, boolean>>
    this._cache = new Map();

    this._loggedKeys = new Set();
    this.N = [[], []];
  }

  /**
   * Resets logging and optionally clears the feasibility cache.
   * @param {boolean} [keepCache=false]
   */
  resetLogs(keepCache = false) {
    this.evalCount = 0;
    if(!keepCache) this._cache.clear();
    this._loggedKeys.clear();
    this.N[0].length = 0;
    this.N[1].length = 0;
  }

  /**
   * Logs an evaluated point (depending on opts.logMode).
   * @param {number} x
   * @param {number} y
   * @param {boolean} ok
   */
  _logPoint(x, y, ok) {
    const log_mode = this.opts.logMode;
    if(log_mode === "off") return;

    if(log_mode === "unique") {
      const d = this.opts.logKeyDecimals;
      const key = x.toFixed(d) + "," + y.toFixed(d);
      if(this._loggedKeys.has(key)) return;
      this._loggedKeys.add(key);
    }

    (ok ? this.N[0] : this.N[1]).push([x, y]);
  }

  /**
   * Feasibility wrapper with cache + evaluation limit.
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  _feasibleXY(x, y) {
    let y_map = this._cache.get(x);
    if(y_map) {
      if(y_map.has(y)) {
        const cached = y_map.get(y);
        if(this.opts.logMode === "all") this._logPoint(x, y, cached);
        return cached;
      }
    } else {
      y_map = new Map();
      this._cache.set(x, y_map);
    }

    this.evalCount++;
    if(this.evalCount > this.opts.maxEval) {
      throw new Error(this.jsl.inter.lang.string(276).replace(/\{max\}/g, this.opts.maxEval));
    }

    const ok = !!this._fUser(x, y);
    y_map.set(y, ok);
    this._logPoint(x, y, ok);
    return ok;
  }
  
  /**
   * Builds axis array min..max inclusive; last item is exactly max.
   * @param {number} min
   * @param {number} max
   * @param {number} d
   * @returns {number[]}
   */
  _buildAxis(min, max, d) {
    const span = max - min;
    if(span <= 0) return [min];
    const n = Math.ceil(span / d);
    const out = new Array(n + 1);
    for(let i = 0; i <= n; i++) {
      const v = min + i * d;
      out[i] = (i === n) ? max : v;
    }
    return out;
  }

  /**
   * Nearest node index to v on a uniform axis described by (min, step, n).
   * @param {number} min
   * @param {number} step
   * @param {number} n
   * @param {number} v
   * @returns {number}
   */
  _closestNodeIndex(min, step, n, v) {
    if(n <= 0) return 0;
    const i = Math.round((v - min) / step);
    return this.jsl.inter.math.clamp(i, 0, n);
  }

  /**
   * Coarse search from origin to find the first feasibility flip edge.
   * Flip edge is an axis-aligned grid edge with different feasibility at endpoints.
   * @param {number} step_x
   * @param {number} step_y
   * @returns {Object|null} - {orient:"H"|"V", a:{x,y}, b:{x,y}, sa:boolean, sb:boolean, d:number} or null
   */
  _findFirstFlipFromOrigin2D(step_x, step_y) {
    const box = this._bbox;
    const origin = this.opts.origin;

    const X = this._buildAxis(box.xmin, box.xmax, step_x);
    const Y = this._buildAxis(box.ymin, box.ymax, step_y);

    const nx = X.length - 1;
    const ny = Y.length - 1;
    const nx1 = nx + 1;

    const ox = this.jsl.inter.math.clamp(origin.x, box.xmin, box.xmax);
    const oy = this.jsl.inter.math.clamp(origin.y, box.ymin, box.ymax);

    const i0 = this._closestNodeIndex(box.xmin, step_x, nx, ox);
    const j0 = this._closestNodeIndex(box.ymin, step_y, ny, oy);

    // -1 unknown, 0 out, 1 in
    const node_state = new Int8Array(nx1 * (ny + 1));
    node_state.fill(-1);

    const idx = (i, j) => j * nx1 + i;

    const eval_node = (i, j) => {
      const k = idx(i, j);
      const s = node_state[k];
      if(s !== -1) return s;
      const ok = this._feasibleXY(X[i], Y[j]) ? 1 : 0;
      node_state[k] = ok;
      return ok;
    };

    const flip_if_known = (i, j, ii, jj) => {
      if(ii < 0 || ii > nx || jj < 0 || jj > ny) return null;
      const k1 = idx(i, j);
      const k2 = idx(ii, jj);
      const s1 = node_state[k1];
      const s2 = node_state[k2];
      if(s1 === -1 || s2 === -1) return null;
      if(s1 === s2) return null;

      const a = { x: X[i], y: Y[j] };
      const b = { x: X[ii], y: Y[jj] };
      const orient = (jj === j) ? "H" : "V";
      return { orient, a, b, sa: !!s1, sb: !!s2, d: this.jsl.inter.geometry.pointSegmentDistance(origin, a, b) };
    };

    const visit = (i, j) => {
      eval_node(i, j);

      const di = i - i0;
      const dj = j - j0;

      if(di !== 0) {
        const ii = i - (di > 0 ? 1 : -1);
        const hit = flip_if_known(i, j, ii, j);
        if(hit) return hit;
      }
      if(dj !== 0) {
        const jj = j - (dj > 0 ? 1 : -1);
        const hit = flip_if_known(i, j, i, jj);
        if(hit) return hit;
      }

      let hit = flip_if_known(i, j, i - 1, j);
      if(hit) return hit;
      hit = flip_if_known(i, j, i, j - 1);
      if(hit) return hit;

      return null;
    };

    let hit = visit(i0, j0);
    if(hit) return hit;

    const max_r = Math.max(i0, nx - i0, j0, ny - j0);

    for(let r = 1; r <= max_r; r++) {
      const i_min = Math.max(0, i0 - r);
      const i_max = Math.min(nx, i0 + r);
      const j_min = Math.max(0, j0 - r);
      const j_max = Math.min(ny, j0 + r);

      for(let i = i_min; i <= i_max; i++) { hit = visit(i, j_max); if(hit) return hit; }
      if(j_min !== j_max) {
        for(let i = i_min; i <= i_max; i++) { hit = visit(i, j_min); if(hit) return hit; }
      }
      for(let j = j_min; j <= j_max; j++) { hit = visit(i_max, j); if(hit) return hit; }
      if(i_min !== i_max) {
        for(let j = j_min; j <= j_max; j++) { hit = visit(i_min, j); if(hit) return hit; }
      }
    }

    return null;
  }

  /**
   * Adaptive seed edge finder: coarse->refine until a flip is found or dx/dy reached.
   * @param {number} dx_target
   * @param {number} dy_target
   * @returns {Object} - {edge, usedStepX, usedStepY}
   */
  _findSeedEdgeAdaptive(dx_target, dy_target) {
    const box = this._bbox;
    const w = box.xmax - box.xmin;
    const h = box.ymax - box.ymin;

    const seed_nx = Math.max(1, this.opts.seedNx | 0);
    const seed_ny = Math.max(1, this.opts.seedNy | 0);
    const refine = this.opts.seedRefine;
    if(!(refine > 0 && refine < 1)) throw new Error(this.jsl.inter.lang.string(277));

    let step_x = Math.max(dx_target, w > 0 ? (w / seed_nx) : dx_target);
    let step_y = Math.max(dy_target, h > 0 ? (h / seed_ny) : dy_target);

    for(let iter = 0; iter < 64; iter++) {
      const edge = this._findFirstFlipFromOrigin2D(step_x, step_y);
      if(edge) return { edge, usedStepX: step_x, usedStepY: step_y };

      if(step_x <= dx_target + 1e-15 && step_y <= dy_target + 1e-15) break;
      step_x = Math.max(dx_target, step_x * refine);
      step_y = Math.max(dy_target, step_y * refine);
    }

    throw new Error(this.jsl.inter.lang.string(278));
  }

  /**
   * Builds fine-grid context: axes, cached node feasibility, cached cell codes.
   * @param {number} dx
   * @param {number} dy
   * @returns {Object}
   */
  _makeFineContext(dx, dy) {
    const box = this._bbox;

    const X = this._buildAxis(box.xmin, box.xmax, dx);
    const Y = this._buildAxis(box.ymin, box.ymax, dy);

    const nx = X.length - 1;
    const ny = Y.length - 1;
    const nx1 = nx + 1;

    // Node cache: -1 unknown, 0 out, 1 in
    const node_state = new Int8Array(nx1 * (ny + 1));
    node_state.fill(-1);

    // Cell cache: -1 unknown, else 0..15
    const cell_state = new Int8Array(nx * ny);
    cell_state.fill(-1);

    const getS = (i, j) => {
      const k = j * nx1 + i;
      const s = node_state[k];
      if(s !== -1) return s === 1;
      const ok = this._feasibleXY(X[i], Y[j]);
      node_state[k] = ok ? 1 : 0;
      return ok;
    };

    const cellCode = (i, j) => {
      const k = j * nx + i;
      const cached = cell_state[k];
      if(cached !== -1) return cached;

      const bl = getS(i, j) ? 1 : 0;
      const br = getS(i + 1, j) ? 2 : 0;
      const tr = getS(i + 1, j + 1) ? 4 : 0;
      const tl = getS(i, j + 1) ? 8 : 0;

      const code = bl | br | tr | tl;
      cell_state[k] = code;
      return code;
    };

    return { X, Y, nx, ny, getS, cellCode };
  }

  /**
   * Refines a coarse flip edge into a fine bracket on the fine grid.
   * @param {Object} ctx
   * @param {Object} coarse_edge
   * @returns {Object} - Fine bracket object.
   */
  _refineEdgeToFineBracket(ctx, coarse_edge) {
    const box = this._bbox;
    const X = ctx.X;
    const Y = ctx.Y;
    const nx = ctx.nx;
    const ny = ctx.ny;
    const getS = ctx.getS;

    const snap_band = Math.max(0, Math.floor(this.opts.snapBand));

    const push_uniq = (arr, seen, v) => {
      if(!seen.has(v)) { seen.add(v); arr.push(v); }
    };

    const nearest_index = (A, v, max_i) => {
      if(max_i <= 0) return 0;
      const d = (A[max_i] - A[0]) / max_i;
      const i = Math.round((v - A[0]) / d);
      return this.jsl.inter.math.clamp(i, 0, max_i);
    };

    if(coarse_edge.orient === "H") {
      const y_edge = coarse_edge.a.y;
      const j0 = nearest_index(Y, y_edge, ny);

      const j_seen = new Set();
      const j_candidates = [];
      push_uniq(j_candidates, j_seen, this.jsl.inter.math.clamp(j0, 0, ny));
      push_uniq(j_candidates, j_seen, this.jsl.inter.math.clamp(Math.floor(j0), 0, ny));
      push_uniq(j_candidates, j_seen, this.jsl.inter.math.clamp(Math.ceil(j0), 0, ny));
      for(let k = -snap_band; k <= snap_band; k++) push_uniq(j_candidates, j_seen, this.jsl.inter.math.clamp(j0 + k, 0, ny));

      const dx0 = (X[nx] - X[0]) / nx;
      const i_a0 = this.jsl.inter.math.clamp(Math.round((coarse_edge.a.x - box.xmin) / dx0), 0, nx);
      const i_b0 = this.jsl.inter.math.clamp(Math.round((coarse_edge.b.x - box.xmin) / dx0), 0, nx);
      const i_min0 = Math.min(i_a0, i_b0);
      const i_max0 = Math.max(i_a0, i_b0);

      for(let c_i = 0; c_i < j_candidates.length; c_i++) {
        const jn = j_candidates[c_i];

        let lo = i_min0;
        let hi = i_max0;
        if(hi - lo < 1) continue;

        let s_lo = getS(lo, jn);
        let s_hi = getS(hi, jn);

        if(s_lo === s_hi) {
          let prev = s_lo;
          let found = false;
          for(let ii = lo + 1; ii <= hi; ii++) {
            const s_i = getS(ii, jn);
            if(s_i !== prev) { lo = ii - 1; hi = ii; s_lo = prev; s_hi = s_i; found = true; break; }
            prev = s_i;
          }
          if(!found) continue;
        }

        while(hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          const s_mid = getS(mid, jn);
          if(s_mid === s_lo) { lo = mid; s_lo = s_mid; } else { hi = mid; s_hi = s_mid; }
        }

        return { orient: "H", i: lo, jNode: jn, s0: s_lo, s1: s_hi };
      }

      throw new Error(this.jsl.inter.lang.string(296));
    }

    // Vertical
    {
      const x_edge = coarse_edge.a.x;
      const i0 = nearest_index(X, x_edge, nx);

      const i_seen = new Set();
      const i_candidates = [];
      push_uniq(i_candidates, i_seen, this.jsl.inter.math.clamp(i0, 0, nx));
      push_uniq(i_candidates, i_seen, this.jsl.inter.math.clamp(Math.floor(i0), 0, nx));
      push_uniq(i_candidates, i_seen, this.jsl.inter.math.clamp(Math.ceil(i0), 0, nx));
      for(let k = -snap_band; k <= snap_band; k++) push_uniq(i_candidates, i_seen, this.jsl.inter.math.clamp(i0 + k, 0, nx));

      const dy0 = (Y[ny] - Y[0]) / ny;
      const j_a0 = this.jsl.inter.math.clamp(Math.round((coarse_edge.a.y - box.ymin) / dy0), 0, ny);
      const j_b0 = this.jsl.inter.math.clamp(Math.round((coarse_edge.b.y - box.ymin) / dy0), 0, ny);
      const j_min0 = Math.min(j_a0, j_b0);
      const j_max0 = Math.max(j_a0, j_b0);

      for(let c_i = 0; c_i < i_candidates.length; c_i++) {
        const in0 = i_candidates[c_i];

        let lo = j_min0;
        let hi = j_max0;
        if(hi - lo < 1) continue;

        let s_lo = getS(in0, lo);
        let s_hi = getS(in0, hi);

        if(s_lo === s_hi) {
          let prev = s_lo;
          let found = false;
          for(let jj = lo + 1; jj <= hi; jj++) {
            const s_j = getS(in0, jj);
            if(s_j !== prev) { lo = jj - 1; hi = jj; s_lo = prev; s_hi = s_j; found = true; break; }
            prev = s_j;
          }
          if(!found) continue;
        }

        while(hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          const s_mid = getS(in0, mid);
          if(s_mid === s_lo) { lo = mid; s_lo = s_mid; } else { hi = mid; s_hi = s_mid; }
        }

        return { orient: "V", iNode: in0, j: lo, s0: s_lo, s1: s_hi };
      }

      throw new Error(this.jsl.inter.lang.string(297));
    }
  }

  /**
   * Returns marching-squares segments for the given code, using the requested ambiguity resolver.
   * @param {number} code
   * @param {string} ambiguous
   * @returns {Array<Array<number>>}
   */
  _cellSegmentsFromCode(code, ambiguous) {
    return ambiguous === "A" ? SEG_TABLE_A[code] : SEG_TABLE_B[code];
  }

  /**
   * Checks whether a cell (given code) has a segment incident to an edge.
   * @param {number} code
   * @param {number} edge
   * @param {string} ambiguous
   * @returns {boolean}
   */
  _cellHasEdge(code, edge, ambiguous) {
    const segs = this._cellSegmentsFromCode(code, ambiguous);
    for(let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if(s[0] === edge || s[1] === edge) return true;
    }
    return false;
  }

  /**
   * Determines the starting cell and entry edge for marching, from a fine bracket.
   * @param {Object} ctx
   * @param {Object} br
   * @param {string} ambiguous
   * @returns {Object} - {i, j, entryEdge}
   */
  _startFromFineBracket(ctx, br, ambiguous) {
    const nx = ctx.nx;
    const ny = ctx.ny;
    const cellCode = ctx.cellCode;

    if(br.orient === "H") {
      const i = br.i;
      const jn = br.jNode;

      // Candidates: cell below edge (entry B=3) or above edge (entry T=1)
      const c0 = { iCell: i, jCell: jn, entryEdge: 3 };
      const c1 = { iCell: i, jCell: jn - 1, entryEdge: 1 };

      for(const c of [c0, c1]) {
        if(c.iCell < 0 || c.iCell >= nx || c.jCell < 0 || c.jCell >= ny) continue;
        const code = cellCode(c.iCell, c.jCell);
        if(code === 0 || code === 15) continue;
        if(this._cellHasEdge(code, c.entryEdge, ambiguous)) return { i: c.iCell, j: c.jCell, entryEdge: c.entryEdge };
      }

      for(const c of [c0, c1]) {
        if(c.iCell < 0 || c.iCell >= nx || c.jCell < 0 || c.jCell >= ny) continue;
        const code = cellCode(c.iCell, c.jCell);
        if(code !== 0 && code !== 15) return { i: c.iCell, j: c.jCell, entryEdge: c.entryEdge };
      }

      throw new Error(this.jsl.inter.lang.string(298));
    }

    // Vertical
    {
      const in0 = br.iNode;
      const j = br.j;

      // Candidates: cell right of edge (entry L=0) or left of edge (entry R=2)
      const c0 = { iCell: in0, jCell: j, entryEdge: 0 };
      const c1 = { iCell: in0 - 1, jCell: j, entryEdge: 2 };

      for(const c of [c0, c1]) {
        if(c.iCell < 0 || c.iCell >= nx || c.jCell < 0 || c.jCell >= ny) continue;
        const code = cellCode(c.iCell, c.jCell);
        if(code === 0 || code === 15) continue;
        if(this._cellHasEdge(code, c.entryEdge, ambiguous)) return { i: c.iCell, j: c.jCell, entryEdge: c.entryEdge };
      }

      for(const c of [c0, c1]) {
        if(c.iCell < 0 || c.iCell >= nx || c.jCell < 0 || c.jCell >= ny) continue;
        const code = cellCode(c.iCell, c.jCell);
        if(code !== 0 && code !== 15) return { i: c.iCell, j: c.jCell, entryEdge: c.entryEdge };
      }

      throw new Error(this.jsl.inter.lang.string(299));
    }
  }


  /**
   * Walks the contour as a state machine over (cell i,j, entryEdge).
   * @param {Object} ctx
   * @param {Object} start
   * @param {string} ambiguous
   * @returns {Object} - {closed:boolean}
   */
  _walkFineContour(ctx, start, ambiguous) {
    const nx = ctx.nx;
    const ny = ctx.ny;
    const cellCode = ctx.cellCode;

    let i = start.i;
    let j = start.j;
    let e_in = start.entryEdge;

    const pack_key = (ii, jj, ee) => ((jj * nx + ii) * 4 + ee);

    const start_key = pack_key(i, j, e_in);

    const visited = new Set();
    visited.add(start_key);

    const max_steps = this.opts.maxTraceSteps | 0;

    for(let step = 0; step < max_steps; step++) {
      if(i < 0 || i >= nx || j < 0 || j >= ny) return { closed: false };

      const code = cellCode(i, j);
      if(code === 0 || code === 15) return { closed: false };

      const segs = this._cellSegmentsFromCode(code, ambiguous);

      let e_out = -1;
      for(let s = 0; s < segs.length; s++) {
        const seg = segs[s];
        if(seg[0] === e_in) { e_out = seg[1]; break; }
        if(seg[1] === e_in) { e_out = seg[0]; break; }
      }
      if(e_out < 0) return { closed: false };

      if(e_out === 0) i--;
      else if(e_out === 2) i++;
      else if(e_out === 3) j--;
      else j++;

      e_in = OPPOSITE_EDGE[e_out];

      const key = pack_key(i, j, e_in);
      if(key === start_key) return { closed: true };
      if(visited.has(key)) return { closed: false };
      visited.add(key);
    }

    return { closed: false };
  }

  /**
   * Main entry (2D).
   *
   * @param {number} dx
   * @param {number} dy
   * @param {string} [ambiguous=this.opts.ambiguous]
   * @returns {Object} - Result object (diagnostics + closed flag).
   */
  trace(dx, dy, ambiguous = this.opts.ambiguous) {
    this.resetLogs();
    if(!(dx > 0) || !(dy > 0)) throw new Error(this.jsl.inter.lang.string(283));

    const seed = this._findSeedEdgeAdaptive(dx, dy);
    const coarse_edge = seed.edge;

    const ctx = this._makeFineContext(dx, dy);
    const fine_br = this._refineEdgeToFineBracket(ctx, coarse_edge);

    const start = this._startFromFineBracket(ctx, fine_br, ambiguous);
    const walk = this._walkFineContour(ctx, start, ambiguous);

    return {
      dim: 2,
      closed: walk.closed,
      evalCount: this.evalCount,
      N: this.N,
      grid: { dx, dy, nx: ctx.nx, ny: ctx.ny },
      seed: {
        usedStepX: seed.usedStepX,
        usedStepY: seed.usedStepY,
        orient: coarse_edge.orient,
        ax: coarse_edge.a.x, ay: coarse_edge.a.y,
        bx: coarse_edge.b.x, by: coarse_edge.b.y,
      },
      fineBracket: fine_br,
    };
  }
}

exports.PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D = PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D;

