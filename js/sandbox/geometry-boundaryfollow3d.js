/**
 * @file JSLAB library geometry Boundary Follow 3D submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 * @version 0.0.2
 */

class PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D {

  /**
   * Boundary follower (3D).
   *
   * It:
   * - searches from opts.origin on a coarse grid until it finds a feasibility “flip edge”
   * - builds a fine grid with spacing dx/dy/dz
   * - refines the coarse flip edge to a fine flip bracket
   * - starts from a nearby mixed voxel and flood-fills the mixed-voxel component
   *   to decide if the boundary is closed (does not touch bbox boundary)
   *
   * @param {Object} jsl - Reference to main JSLAB object.
   * @param {Function} feasibleFn - Feasibility oracle called as feasibleFn(x,y,z) returning true (inside) or false (outside).
   * @param {Object} opts - Options object controlling bbox, seeding, refinement and flood limits.
   * @param {Object} opts.bbox - Bounding box that limits the search: {xmin,xmax,ymin,ymax,zmin,zmax}.
   * @param {Object} [opts.origin={x:0,y:0,z:0}] - Start point for the coarse search: {x,y,z}.
   * @param {number} [opts.seedNx=20] - Coarse seed grid resolution in X (bbox width / seedNx).
   * @param {number} [opts.seedNy=20] - Coarse seed grid resolution in Y (bbox height / seedNy).
   * @param {number} [opts.seedNz=20] - Coarse seed grid resolution in Z (bbox depth / seedNz).
   * @param {number} [opts.seedRefine=0.5] - Seed step refinement factor per iteration (must be in (0,1)).
   * @param {number} [opts.snapBand=2] - How many neighboring fine rows/cols/slabs to try when snapping the coarse edge to the fine grid.
   * @param {number} [opts.maxFloodCells=2000000] - Maximum number of mixed voxels to process during flood-fill (prevents runaway).
   * @param {string} [opts.logMode="unique"] - Logging mode for evaluations: "unique" logs unique points, "all" logs every call, "off" disables logging.
   * @param {number} [opts.logKeyDecimals=12] - Decimal rounding used to de-duplicate points when logMode="unique".
   * @param {number} [opts.maxEval=10000000] - Hard limit for total feasibleFn evaluations (prevents runaway searches).
   * @param {number} [opts.maxVisitedArrayCells=50000000] - Threshold on voxel count to choose dense visited array vs Set in flood-fill.
   */
  constructor(jsl, feasibleFn, opts) {
    this.jsl = jsl;

    if(!opts || !opts.bbox) throw new Error(this.jsl.inter.lang.string(274));
    this._fUser = feasibleFn;

    this.opts = {
      origin: { x: 0, y: 0, z: 0 },

      seedNx: 20,
      seedNy: 20,
      seedNz: 20,
      seedRefine: 0.5,

      snapBand: 2,
      maxFloodCells: 2000000,

      logMode: "unique",
      logKeyDecimals: 12,

      maxEval: 10000000,

      maxVisitedArrayCells: 50000000,
      ...opts,
    };

    const b = opts.bbox;
    const ok =
      Number.isFinite(b.xmin) && Number.isFinite(b.xmax) &&
      Number.isFinite(b.ymin) && Number.isFinite(b.ymax) &&
      Number.isFinite(b.zmin) && Number.isFinite(b.zmax);
    if(!ok) throw new Error(this.jsl.inter.lang.string(275));

    this._bbox = {
      xmin: Math.min(b.xmin, b.xmax),
      xmax: Math.max(b.xmin, b.xmax),
      ymin: Math.min(b.ymin, b.ymax),
      ymax: Math.max(b.ymin, b.ymax),
      zmin: Math.min(b.zmin, b.zmax),
      zmax: Math.max(b.zmin, b.zmax),
    };

    this.evalCount = 0;

    // Cache: Map<x, Map<y, Map<z, boolean>>>
    this._cache = new Map();

    this._loggedKeys = new Set();

    // N[0] -> feasible points, N[1] -> infeasible points; each point is [x,y,z]
    this.N = [[], []];
  }

  /**
   * Resets logging and optionally clears the feasibility cache.
   * @param {boolean} [keepCache=false] - If true, keeps the feasibility cache; otherwise cache is cleared.
   * @returns {void} No return value.
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

   * @param {number} x - X coordinate being evaluated.
   * @param {number} y - Y coordinate being evaluated.
   * @param {number} z - Z coordinate being evaluated.
   * @param {boolean} ok - Feasibility result at (x,y,z).
   * @returns {void} No return value.
   */
  _logPoint(x, y, z, ok) {
    const log_mode = this.opts.logMode;
    if(log_mode === "off") return;

    if(log_mode === "unique") {
      const d = this.opts.logKeyDecimals;
      const key = x.toFixed(d) + "," + y.toFixed(d) + "," + z.toFixed(d);
      if(this._loggedKeys.has(key)) return;
      this._loggedKeys.add(key);
    }

    (ok ? this.N[0] : this.N[1]).push([x, y, z]);
  }

  /**
   * Feasibility wrapper with cache + evaluation limit.
   * @param {number} x - X coordinate to evaluate.
   * @param {number} y - Y coordinate to evaluate.
   * @param {number} z - Z coordinate to evaluate.
   * @returns {boolean} True if feasibleFn(x,y,z) is true; otherwise false.
   */
  _feasibleXYZ(x, y, z) {
    let y_map = this._cache.get(x);
    if(!y_map) {
      y_map = new Map();
      this._cache.set(x, y_map);
    }

    let z_map = y_map.get(y);
    if(!z_map) {
      z_map = new Map();
      y_map.set(y, z_map);
    }

    if(z_map.has(z)) {
      const cached = z_map.get(z);
      if(this.opts.logMode === "all") this._logPoint(x, y, z, cached);
      return cached;
    }

    this.evalCount++;
    if(this.evalCount > this.opts.maxEval) {
      throw new Error(this.jsl.inter.lang.string(276).replace('{max}', this.opts.maxEval));
    }

    const ok = !!this._fUser(x, y, z);
    z_map.set(z, ok);
    this._logPoint(x, y, z, ok);
    return ok;
  }

  /**
   * Builds axis typed array min..max inclusive; last item is exactly max.
   * @param {number} min - Axis minimum value.
   * @param {number} max - Axis maximum value.
   * @param {number} d - Desired step size (spacing).
   * @returns {Float64Array} Axis samples from min to max inclusive.
   */
  _buildAxis(min, max, d) {
    const span = max - min;
    if(span <= 0) return new Float64Array([min]);
    const n = Math.ceil(span / d);
    const A = new Float64Array(n + 1);
    for(let i = 0; i <= n; i++) {
      const v = min + i * d;
      A[i] = (i === n) ? max : v;
    }
    return A;
  }

  /**
   * Nearest node index to v on a uniform axis described by (min, step, n).
   * @param {number} min - Axis minimum (origin) value.
   * @param {number} step - Axis step size.
   * @param {number} n - Maximum node index (axis has n+1 nodes).
   * @param {number} v - Value to locate on the axis.
   * @returns {number} Clamped nearest node index in [0,n].
   */
  _closestNodeIndex(min, step, n, v) {
    if(n <= 0) return 0;
    const i = Math.round((v - min) / step);
    return this.jsl.inter.math.clamp(i, 0, n);
  }

  /**
   * Coarse search from origin to find the first feasibility flip edge (3D).
   * Returns null if no flip edge was found.
   * @param {number} step_x - Coarse grid spacing in X.
   * @param {number} step_y - Coarse grid spacing in Y.
   * @param {number} step_z - Coarse grid spacing in Z.
   * @returns {Object|null} Null if none found; otherwise {hit, usedAxes} where:
   *   hit: {orient:"X"|"Y"|"Z", a:{x,y,z}, b:{x,y,z}, sa:boolean, sb:boolean}
   *   usedAxes: {X:Float64Array, Y:Float64Array, Z:Float64Array}
   */
  _findFirstFlipFromOrigin3D(step_x, step_y, step_z) {
    const box = this._bbox;
    const o = this.opts.origin;

    const X = this._buildAxis(box.xmin, box.xmax, step_x);
    const Y = this._buildAxis(box.ymin, box.ymax, step_y);
    const Z = this._buildAxis(box.zmin, box.zmax, step_z);

    const nx = X.length - 1;
    const ny = Y.length - 1;
    const nz = Z.length - 1;

    const nx1 = nx + 1;
    const ny1 = ny + 1;
    const nz1 = nz + 1;

    const ox = this.jsl.inter.math.clamp(o.x, box.xmin, box.xmax);
    const oy = this.jsl.inter.math.clamp(o.y, box.ymin, box.ymax);
    const oz = this.jsl.inter.math.clamp(o.z, box.zmin, box.zmax);

    const i0 = this._closestNodeIndex(box.xmin, step_x, nx, ox);
    const j0 = this._closestNodeIndex(box.ymin, step_y, ny, oy);
    const k0 = this._closestNodeIndex(box.zmin, step_z, nz, oz);

    const pack = (i, j, k)=>(k * ny1 + j) * nx1 + i;
    const node_state = new Int8Array(nx1 * ny1 * nz1);
    node_state.fill(-1);

    const eval_node = (i, j, k)=>{
      const p = pack(i, j, k);
      const s = node_state[p];
      if(s !== -1) return s;
      const ok = this._feasibleXYZ(X[i], Y[j], Z[k]) ? 1 : 0;
      node_state[p] = ok;
      return ok;
    };

    const get_state = (i, j, k)=>node_state[pack(i, j, k)];

    const flip_if_known = (i, j, k, ii, jj, kk)=>{
      if(ii < 0 || ii > nx || jj < 0 || jj > ny || kk < 0 || kk > nz) return null;

      const s1 = get_state(i, j, k);
      const s2 = get_state(ii, jj, kk);

      if(s1 === -1 || s2 === -1) return null;
      if(s1 === s2) return null;

      let orient = "X";
      if(ii === i && jj !== j && kk === k) orient = "Y";
      else if(ii === i && jj === j && kk !== k) orient = "Z";

      return {
        orient,
        a: { x: X[i], y: Y[j], z: Z[k] },
        b: { x: X[ii], y: Y[jj], z: Z[kk] },
        sa: !!s1,
        sb: !!s2,
      };
    };

    const visit = (i, j, k)=>{
      eval_node(i, j, k);

      const di = i - i0;
      const dj = j - j0;
      const dk = k - k0;

      if(di !== 0) {
        const ii = i - (di > 0 ? 1 : -1);
        const hit = flip_if_known(i, j, k, ii, j, k);
        if(hit) return hit;
      }
      if(dj !== 0) {
        const jj = j - (dj > 0 ? 1 : -1);
        const hit = flip_if_known(i, j, k, i, jj, k);
        if(hit) return hit;
      }
      if(dk !== 0) {
        const kk = k - (dk > 0 ? 1 : -1);
        const hit = flip_if_known(i, j, k, i, j, kk);
        if(hit) return hit;
      }

      let hit = flip_if_known(i, j, k, i - 1, j, k); if(hit) return hit;
      hit = flip_if_known(i, j, k, i, j - 1, k);     if(hit) return hit;
      hit = flip_if_known(i, j, k, i, j, k - 1);     if(hit) return hit;

      return null;
    };

    let hit = visit(i0, j0, k0);
    if(hit) return { hit, usedAxes: { X, Y, Z } };

    const max_r = Math.max(i0, nx - i0, j0, ny - j0, k0, nz - k0);

    for(let r = 1; r <= max_r; r++) {
      const i_min = Math.max(0, i0 - r);
      const i_max = Math.min(nx, i0 + r);
      const j_min = Math.max(0, j0 - r);
      const j_max = Math.min(ny, j0 + r);
      const k_min = Math.max(0, k0 - r);
      const k_max = Math.min(nz, k0 + r);

      for(let j = j_min; j <= j_max; j++) for(let k = k_min; k <= k_max; k++) {
        hit = visit(i_min, j, k); if(hit) return { hit, usedAxes: { X, Y, Z } };
        if(i_max !== i_min) { hit = visit(i_max, j, k); if(hit) return { hit, usedAxes: { X, Y, Z } }; }
      }

      if(j_max !== j_min) {
        const ii0 = i_min + 1;
        const ii1 = i_max - 1;
        if(ii0 <= ii1) {
          for(let i = ii0; i <= ii1; i++) for(let k = k_min; k <= k_max; k++) {
            hit = visit(i, j_min, k); if(hit) return { hit, usedAxes: { X, Y, Z } };
            hit = visit(i, j_max, k); if(hit) return { hit, usedAxes: { X, Y, Z } };
          }
        }
      }

      if(k_max !== k_min) {
        const ii0 = i_min + 1;
        const ii1 = i_max - 1;
        const jj0 = j_min + 1;
        const jj1 = j_max - 1;
        if(ii0 <= ii1 && jj0 <= jj1) {
          for(let i = ii0; i <= ii1; i++) for(let j = jj0; j <= jj1; j++) {
            hit = visit(i, j, k_min); if(hit) return { hit, usedAxes: { X, Y, Z } };
            hit = visit(i, j, k_max); if(hit) return { hit, usedAxes: { X, Y, Z } };
          }
        }
      }
    }

    return null;
  }

  /**
   * Adaptive seed edge finder (3D): coarse->refine until a flip is found or dx/dy/dz reached.
   * @param {number} dx_target - Target fine-grid spacing in X (minimum step).
   * @param {number} dy_target - Target fine-grid spacing in Y (minimum step).
   * @param {number} dz_target - Target fine-grid spacing in Z (minimum step).
   * @returns {Object} Seed result: {edge, usedStepX, usedStepY, usedStepZ}.
   */
  _findSeedEdgeAdaptive(dx_target, dy_target, dz_target) {
    const box = this._bbox;
    const wx = box.xmax - box.xmin;
    const wy = box.ymax - box.ymin;
    const wz = box.zmax - box.zmin;

    const seed_nx = Math.max(1, this.opts.seedNx | 0);
    const seed_ny = Math.max(1, this.opts.seedNy | 0);
    const seed_nz = Math.max(1, this.opts.seedNz | 0);

    const refine = this.opts.seedRefine;
    if(!(refine > 0 && refine < 1)) throw new Error(this.jsl.inter.lang.string(277));

    let step_x = Math.max(dx_target, wx > 0 ? (wx / seed_nx) : dx_target);
    let step_y = Math.max(dy_target, wy > 0 ? (wy / seed_ny) : dy_target);
    let step_z = Math.max(dz_target, wz > 0 ? (wz / seed_nz) : dz_target);

    for(let iter = 0; iter < 64; iter++) {
      const r = this._findFirstFlipFromOrigin3D(step_x, step_y, step_z);
      if(r && r.hit) return { edge: r.hit, usedStepX: step_x, usedStepY: step_y, usedStepZ: step_z };

      if(step_x <= dx_target + 1e-15 && step_y <= dy_target + 1e-15 && step_z <= dz_target + 1e-15) break;
      step_x = Math.max(dx_target, step_x * refine);
      step_y = Math.max(dy_target, step_y * refine);
      step_z = Math.max(dz_target, step_z * refine);
    }

    throw new Error(this.jsl.inter.lang.string(278));
  }

  /**
   * Builds fine-grid context (3D): axes, cached node feasibility, cached mixed-voxel predicate.
   * @param {number} dx - Fine grid spacing in X.
   * @param {number} dy - Fine grid spacing in Y.
   * @param {number} dz - Fine grid spacing in Z.
   * @returns {Object} Fine context with:
   *   {X,Y,Z,nx,ny,nz,getS(i,j,k),cellMixed(i,j,k),pack_voxel(i,j,k)}.
   */
  _makeFineContext(dx, dy, dz) {
    const box = this._bbox;

    const X = this._buildAxis(box.xmin, box.xmax, dx);
    const Y = this._buildAxis(box.ymin, box.ymax, dy);
    const Z = this._buildAxis(box.zmin, box.zmax, dz);

    const nx = X.length - 1;
    const ny = Y.length - 1;
    const nz = Z.length - 1;

    const nx1 = nx + 1;
    const ny1 = ny + 1;

    const node_count = (nx + 1) * (ny + 1) * (nz + 1);
    const voxel_count = nx * ny * nz;

    // Node cache: -1 unknown, 0 out, 1 in
    const node_state = new Int8Array(node_count);
    node_state.fill(-1);

    // Voxel mixed cache: -1 unknown, 0 false, 1 true
    const voxel_mixed = new Int8Array(voxel_count);
    voxel_mixed.fill(-1);

    const pack_node = (i, j, k)=>(k * ny1 + j) * nx1 + i;
    const pack_voxel = (i, j, k)=>(k * ny + j) * nx + i;

    const getS = (i, j, k)=>{
      const p = pack_node(i, j, k);
      const s = node_state[p];
      if(s !== -1) return s === 1;
      const ok = this._feasibleXYZ(X[i], Y[j], Z[k]);
      node_state[p] = ok ? 1 : 0;
      return ok;
    };

    const cellMixed = (i, j, k)=>{
      const p = pack_voxel(i, j, k);
      const cm = voxel_mixed[p];
      if(cm !== -1) return cm === 1;

      const s000 = getS(i, j, k) ? 1 : 0;
      const s100 = getS(i + 1, j, k) ? 1 : 0;
      const s010 = getS(i, j + 1, k) ? 1 : 0;
      const s110 = getS(i + 1, j + 1, k) ? 1 : 0;
      const s001 = getS(i, j, k + 1) ? 1 : 0;
      const s101 = getS(i + 1, j, k + 1) ? 1 : 0;
      const s011 = getS(i, j + 1, k + 1) ? 1 : 0;
      const s111 = getS(i + 1, j + 1, k + 1) ? 1 : 0;

      const sum = s000 + s100 + s010 + s110 + s001 + s101 + s011 + s111;
      const mixed = (sum !== 0 && sum !== 8);

      voxel_mixed[p] = mixed ? 1 : 0;
      return mixed;
    };

    return { X, Y, Z, nx, ny, nz, getS, cellMixed, pack_voxel };
  }

  /**
   * Refines a coarse flip edge into a fine bracket on the fine grid (3D).
   * @param {Object} ctx - Fine context returned by _makeFineContext(dx,dy,dz).
   * @param {Object} coarse_edge - Coarse flip edge returned by _findFirstFlipFromOrigin3D(...).hit.
   * @returns {Object} Fine bracket describing the refined flip location:
   *   X-edge: {orient:"X", i:number, jNode:number, kNode:number, s0:boolean, s1:boolean}
   *   Y-edge: {orient:"Y", iNode:number, j:number, kNode:number, s0:boolean, s1:boolean}
   *   Z-edge: {orient:"Z", iNode:number, jNode:number, k:number, s0:boolean, s1:boolean}.
   */
  _refineEdgeToFineBracket(ctx, coarse_edge) {
    const X = ctx.X;
    const Y = ctx.Y;
    const Z = ctx.Z;
    const nx = ctx.nx;
    const ny = ctx.ny;
    const nz = ctx.nz;
    const getS = ctx.getS;

    const snap_band = Math.max(0, Math.floor(this.opts.snapBand));

    const nearest_index = (A, v, max_i)=>{
      if(max_i <= 0) return 0;
      const d = (A[max_i] - A[0]) / max_i;
      const i = Math.round((v - A[0]) / d);
      return this.jsl.inter.math.clamp(i, 0, max_i);
    };

    const build_candidates = (i0, max_i)=>{
      const out = [];
      const seen = new Set();
      const push = (v)=>{
        v = this.jsl.inter.math.clamp(v, 0, max_i);
        if(seen.has(v)) return;
        seen.add(v);
        out.push(v);
      };

      push(i0);
      push(Math.floor(i0));
      push(Math.ceil(i0));
      for(let k = -snap_band; k <= snap_band; k++) push(i0 + k);

      return out;
    };

    const scan_flip_x = (lo, hi, j, k)=>{
      let prev = getS(lo, j, k);
      for(let i = lo + 1; i <= hi; i++) {
        const si = getS(i, j, k);
        if(si !== prev) return { lo: i - 1, hi: i, sLo: prev, sHi: si };
        prev = si;
      }
      return null;
    };

    const scan_flip_y = (lo, hi, i, k)=>{
      let prev = getS(i, lo, k);
      for(let j = lo + 1; j <= hi; j++) {
        const sj = getS(i, j, k);
        if(sj !== prev) return { lo: j - 1, hi: j, sLo: prev, sHi: sj };
        prev = sj;
      }
      return null;
    };

    const scan_flip_z = (lo, hi, i, j)=>{
      let prev = getS(i, j, lo);
      for(let k = lo + 1; k <= hi; k++) {
        const sk = getS(i, j, k);
        if(sk !== prev) return { lo: k - 1, hi: k, sLo: prev, sHi: sk };
        prev = sk;
      }
      return null;
    };

    if(coarse_edge.orient === "X") {
      const j0 = nearest_index(Y, coarse_edge.a.y, ny);
      const k0 = nearest_index(Z, coarse_edge.a.z, nz);
      const j_cand = build_candidates(j0, ny);
      const k_cand = build_candidates(k0, nz);

      const i_a = nearest_index(X, coarse_edge.a.x, nx);
      const i_b = nearest_index(X, coarse_edge.b.x, nx);
      let lo0 = this.jsl.inter.math.clamp(Math.min(i_a, i_b), 0, nx);
      let hi0 = this.jsl.inter.math.clamp(Math.max(i_a, i_b), 0, nx);
      if(hi0 - lo0 < 1) { lo0 = Math.max(0, lo0 - 1); hi0 = Math.min(nx, hi0 + 1); }

      for(let jj = 0; jj < j_cand.length; jj++) for(let kk = 0; kk < k_cand.length; kk++) {
        const j = j_cand[jj];
        const k = k_cand[kk];

        const flip = scan_flip_x(lo0, hi0, j, k);
        if(!flip) continue;

        let lo = flip.lo;
        let hi = flip.hi;
        let s_lo = flip.sLo;
        let s_hi = flip.sHi;

        while(hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          const s_mid = getS(mid, j, k);
          if(s_mid === s_lo) { lo = mid; s_lo = s_mid; } else { hi = mid; s_hi = s_mid; }
        }

        return { orient: "X", i: lo, jNode: j, kNode: k, s0: s_lo, s1: s_hi };
      }

      throw new Error(this.jsl.inter.lang.string(279));
    }

    if(coarse_edge.orient === "Y") {
      const i0 = nearest_index(X, coarse_edge.a.x, nx);
      const k0 = nearest_index(Z, coarse_edge.a.z, nz);
      const i_cand = build_candidates(i0, nx);
      const k_cand = build_candidates(k0, nz);

      const j_a = nearest_index(Y, coarse_edge.a.y, ny);
      const j_b = nearest_index(Y, coarse_edge.b.y, ny);
      let lo0 = this.jsl.inter.math.clamp(Math.min(j_a, j_b), 0, ny);
      let hi0 = this.jsl.inter.math.clamp(Math.max(j_a, j_b), 0, ny);
      if(hi0 - lo0 < 1) { lo0 = Math.max(0, lo0 - 1); hi0 = Math.min(ny, hi0 + 1); }

      for(let ii = 0; ii < i_cand.length; ii++) for(let kk = 0; kk < k_cand.length; kk++) {
        const i = i_cand[ii];
        const k = k_cand[kk];

        const flip = scan_flip_y(lo0, hi0, i, k);
        if(!flip) continue;

        let lo = flip.lo;
        let hi = flip.hi;
        let s_lo = flip.sLo;
        let s_hi = flip.sHi;

        while(hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          const s_mid = getS(i, mid, k);
          if(s_mid === s_lo) { lo = mid; s_lo = s_mid; } else { hi = mid; s_hi = s_mid; }
        }

        return { orient: "Y", iNode: i, j: lo, kNode: k, s0: s_lo, s1: s_hi };
      }

      throw new Error(this.jsl.inter.lang.string(280));
    }

    // Z
    {
      const i0 = nearest_index(X, coarse_edge.a.x, nx);
      const j0 = nearest_index(Y, coarse_edge.a.y, ny);
      const i_cand = build_candidates(i0, nx);
      const j_cand = build_candidates(j0, ny);

      const k_a = nearest_index(Z, coarse_edge.a.z, nz);
      const k_b = nearest_index(Z, coarse_edge.b.z, nz);
      let lo0 = this.jsl.inter.math.clamp(Math.min(k_a, k_b), 0, nz);
      let hi0 = this.jsl.inter.math.clamp(Math.max(k_a, k_b), 0, nz);
      if(hi0 - lo0 < 1) { lo0 = Math.max(0, lo0 - 1); hi0 = Math.min(nz, hi0 + 1); }

      for(let ii = 0; ii < i_cand.length; ii++) for(let jj = 0; jj < j_cand.length; jj++) {
        const i = i_cand[ii];
        const j = j_cand[jj];

        const flip = scan_flip_z(lo0, hi0, i, j);
        if(!flip) continue;

        let lo = flip.lo;
        let hi = flip.hi;
        let s_lo = flip.sLo;
        let s_hi = flip.sHi;

        while(hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          const s_mid = getS(i, j, mid);
          if(s_mid === s_lo) { lo = mid; s_lo = s_mid; } else { hi = mid; s_hi = s_mid; }
        }

        return { orient: "Z", iNode: i, jNode: j, k: lo, s0: s_lo, s1: s_hi };
      }

      throw new Error(this.jsl.inter.lang.string(281));
    }
  }

  /**
   * Picks a starting voxel near the fine bracket.
   * Prefers a mixed voxel (surface voxel). Falls back to any valid voxel nearby.
   * @param {Object} ctx - Fine context returned by _makeFineContext(dx,dy,dz).
   * @param {Object} br - Fine bracket returned by _refineEdgeToFineBracket(...).
   * @returns {Object} Start voxel indices: {i:number, j:number, k:number}.
   */
  _startVoxelFromFineBracket(ctx, br) {
    const nx = ctx.nx;
    const ny = ctx.ny;
    const nz = ctx.nz;
    const cellMixed = ctx.cellMixed;

    const try_voxel = (ic, jc, kc)=>{
      if(ic < 0 || ic >= nx || jc < 0 || jc >= ny || kc < 0 || kc >= nz) return null;
      if(cellMixed(ic, jc, kc)) return { i: ic, j: jc, k: kc };
      return null;
    };

    let v = null;

    if(br.orient === "X") {
      const i = br.i, j = br.jNode, k = br.kNode;
      v = try_voxel(i, j - 1, k - 1); if(v) return v;
      v = try_voxel(i, j, k - 1);     if(v) return v;
      v = try_voxel(i, j - 1, k);     if(v) return v;
      v = try_voxel(i, j, k);         if(v) return v;
    } else if(br.orient === "Y") {
      const i = br.iNode, j = br.j, k = br.kNode;
      v = try_voxel(i - 1, j, k - 1); if(v) return v;
      v = try_voxel(i, j, k - 1);     if(v) return v;
      v = try_voxel(i - 1, j, k);     if(v) return v;
      v = try_voxel(i, j, k);         if(v) return v;
    } else {
      const i = br.iNode, j = br.jNode, k = br.k;
      v = try_voxel(i - 1, j - 1, k); if(v) return v;
      v = try_voxel(i, j - 1, k);     if(v) return v;
      v = try_voxel(i - 1, j, k);     if(v) return v;
      v = try_voxel(i, j, k);         if(v) return v;
    }

    const take_first_valid = (ic, jc, kc)=>{
      if(ic < 0 || ic >= nx || jc < 0 || jc >= ny || kc < 0 || kc >= nz) return null;
      return { i: ic, j: jc, k: kc };
    };

    if(br.orient === "X") {
      const i = br.i, j = br.jNode, k = br.kNode;
      return take_first_valid(i, j, k) || take_first_valid(i, j - 1, k) || take_first_valid(i, j, k - 1) || take_first_valid(i, j - 1, k - 1);
    }
    if(br.orient === "Y") {
      const i = br.iNode, j = br.j, k = br.kNode;
      return take_first_valid(i, j, k) || take_first_valid(i - 1, j, k) || take_first_valid(i, j, k - 1) || take_first_valid(i - 1, j, k - 1);
    }
    {
      const i = br.iNode, j = br.jNode, k = br.k;
      return take_first_valid(i, j, k) || take_first_valid(i - 1, j, k) || take_first_valid(i, j - 1, k) || take_first_valid(i - 1, j - 1, k);
    }
  }

  /**
   * Flood-fills the connected component of mixed voxels (6-neighborhood).
   * If it touches the bbox boundary, surface is considered open.
   * @param {Object} ctx - Fine context returned by _makeFineContext(dx,dy,dz).
   * @param {Object} start_voxel - Start voxel indices {i,j,k}.
   * @returns {Object} Flood result:
   *   - closed:boolean (true if component does NOT touch bbox boundary)
   *   - surfaceCells:number (count of mixed voxels reached)
   *   - touchesBoundary:boolean (true if any visited mixed voxel is on voxel-grid boundary)
   */
  _floodMixedComponent(ctx, start_voxel) {
    const nx = ctx.nx;
    const ny = ctx.ny;
    const nz = ctx.nz;
    const cellMixed = ctx.cellMixed;
    const pack_voxel = ctx.pack_voxel;

    const voxel_count = nx * ny * nz;

    const use_dense = voxel_count <= (this.opts.maxVisitedArrayCells | 0);

    let visited_arr = null;
    let visited_set = null;

    if(use_dense) visited_arr = new Uint8Array(voxel_count);
    else visited_set = new Set();

    const push_mark = (p)=>{
      if(use_dense) {
        if(visited_arr[p]) return false;
        visited_arr[p] = 1;
        return true;
      }
      if(visited_set.has(p)) return false;
      visited_set.add(p);
      return true;
    };

    const stack = [];
    const start_p = pack_voxel(start_voxel.i, start_voxel.j, start_voxel.k);
    push_mark(start_p);
    stack.push(start_p);

    let touches_boundary = false;
    let count = 0;

    const slice = nx * ny;

    while(stack.length) {
      const p = stack.pop();

      const i = p % nx;
      const t = (p - i) / nx;
      const j = t % ny;
      const k = (t - j) / ny;

      if(!cellMixed(i, j, k)) continue;

      count++;
      if(count > this.opts.maxFloodCells) throw new Error(this.jsl.inter.lang.string(282).replace('{max}', this.opts.maxFloodCells));

      if(i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) touches_boundary = true;

      if(i > 0) { const pp = p - 1; if(push_mark(pp)) stack.push(pp); }
      if(i + 1 < nx) { const pp = p + 1; if(push_mark(pp)) stack.push(pp); }

      if(j > 0) { const pp = p - nx; if(push_mark(pp)) stack.push(pp); }
      if(j + 1 < ny) { const pp = p + nx; if(push_mark(pp)) stack.push(pp); }

      if(k > 0) { const pp = p - slice; if(push_mark(pp)) stack.push(pp); }
      if(k + 1 < nz) { const pp = p + slice; if(push_mark(pp)) stack.push(pp); }
    }

    return { closed: !touches_boundary, surfaceCells: count, touchesBoundary: touches_boundary };
  }

  /**
   * Main entry (3D).
   *
   * @param {number} dx - Fine grid spacing in X (must be >0).
   * @param {number} dy - Fine grid spacing in Y (must be >0).
   * @param {number} dz - Fine grid spacing in Z (must be >0).
   * @returns {Object} Result object:
   *   - dim: 3
   *   - closed: true if the mixed-voxel component does not touch bbox boundary; false otherwise
   *   - touchesBoundary: true if flood-fill hit voxel-grid boundary; false otherwise
   *   - surfaceCells: number of mixed voxels visited (surface voxel count)
   *   - evalCount: total feasibility evaluations performed
   *   - N: [feasible_points,infeasible_points], each is an array of [x,y,z]
   *   - grid: {dx,dy,dz,nx,ny,nz} fine grid diagnostics
   *   - seed: coarse seed edge diagnostics (used steps + endpoints + orientation)
   *   - fineBracket: refined fine flip bracket used to start flood-fill
   *   - startVoxel: voxel indices used as flood-fill start
   */
  trace(dx, dy, dz) {
    this.resetLogs();
    if(!(dx > 0) || !(dy > 0) || !(dz > 0)) throw new Error(this.jsl.inter.lang.string(283));

    const seed = this._findSeedEdgeAdaptive(dx, dy, dz);
    const coarse_edge = seed.edge;

    const ctx = this._makeFineContext(dx, dy, dz);
    const fine_br = this._refineEdgeToFineBracket(ctx, coarse_edge);

    const start_voxel = this._startVoxelFromFineBracket(ctx, fine_br);
    const flood = this._floodMixedComponent(ctx, start_voxel);

    return {
      dim: 3,
      closed: flood.closed,
      touchesBoundary: flood.touchesBoundary,
      surfaceCells: flood.surfaceCells,
      evalCount: this.evalCount,
      N: this.N,
      grid: { dx, dy, dz, nx: ctx.nx, ny: ctx.ny, nz: ctx.nz },
      seed: {
        usedStepX: seed.usedStepX,
        usedStepY: seed.usedStepY,
        usedStepZ: seed.usedStepZ,
        orient: coarse_edge.orient,
        a: coarse_edge.a,
        b: coarse_edge.b,
      },
      fineBracket: fine_br,
      startVoxel: start_voxel,
    };
  }
}

exports.PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D = PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D;

