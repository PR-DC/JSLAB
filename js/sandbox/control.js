/**
 * @file JSLAB library control submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Builds, analyzes, and plots linear control models.
 */
class PRDC_JSLAB_LIB_CONTROL {

  /**
   * Initializes the Control module.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    this.jsl = jsl;
  }

  /**
   * Creates a transfer function model.
   * @param {number[]} num Numerator coefficients in descending powers.
   * @param {number[]} den Denominator coefficients in descending powers.
   * @param {number} [Ts=0] Sample time. Zero denotes continuous time.
   * @returns {Object} Transfer function model.
   * @public
   */
  tf(num, den, Ts = 0) {
    return { num, den, Ts };
  }

  /**
   * Creates a state-space model.
   * @param {number|number[][]} A State matrix.
   * @param {number|Array} B Input matrix.
   * @param {number|Array} C Output matrix.
   * @param {number|number[][]} D Feedthrough matrix.
   * @param {number} [Ts=0] Sample time. Zero denotes continuous time.
   * @returns {Object} State-space model.
   * @public
   */
  ss(A, B, C, D, Ts = 0) {
    return { A, B, C, D, Ts };
  }

  /**
   * Converts a proper SISO transfer function to companion-form state space.
   * @param {number[]} num Numerator coefficients.
   * @param {number[]} den Denominator coefficients.
   * @returns {Object} State-space realization.
   * @public
   */
  tf2ss(num, den) {
    const n = den.length - 1;
    if(n < 0 || !den[0] || num.length > n + 1 || ![...num, ...den].every(Number.isFinite)) {
      throw new RangeError('tf2ss requires a proper transfer function with a nonzero leading denominator.');
    }
    num = [...Array(n + 1 - num.length).fill(0), ...Array.from(num, value => value / den[0])];
    den = Array.from(den, value => value / den[0]);
    const A = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => i === n - 1 ? -den[n - j] : Number(j === i + 1)));
    const B = Array.from({ length: n }, (_, i) => Number(i === n - 1));
    const C = num.slice(1).map((value, i) => value - den[i + 1] * num[0]).reverse();
    return this.ss(A, B, C, num[0]);
  }

  /**
   * Converts a SISO state-space model to transfer coefficients.
   * @param {Object} sys State-space model.
   * @returns {{num:number[],den:number[]}} Numerator and denominator coefficients.
   * @public
   */
  ss2tf(sys) {
    const { A, B, C, D, n, m, p } = this._stateSpace(sys);
    if(m !== 1 || p !== 1) throw new RangeError('ss2tf requires a single input and output.');
    const data = this.jsl.inter.env.native_module.control('ss2tf', [A.flat(), B.flat(), C.flat()],
      [n, D[0][0]], 2 * (n + 1));
    return { num: data.slice(n + 1), den: data.slice(0, n + 1) };
  }

  /**
   * Extracts normalized state-space matrices and sample time.
   * @param {Object} sys Transfer function or state-space model.
   * @returns {Object} Matrices A, B, C, D and sample time Ts.
   * @public
   */
  ssdata(sys) {
    const model = this._model(sys);
    const { A, B, C, D } = this._stateSpace(model);
    return this.ss(A, B, C, D, model.Ts ?? 0);
  }

  /**
   * Extracts SISO transfer coefficients and sample time.
   * @param {Object} sys Transfer function or state-space model.
   * @returns {Object} Numerator, denominator, and sample time.
   * @public
   */
  tfdata(sys) {
    const { num, den } = sys.A === undefined ? sys : this.ss2tf(sys);
    return this.tf(Array.from(num), Array.from(den), sys.Ts ?? 0);
  }

  /**
   * Discretizes a continuous-time model using a zero-order hold.
   * @param {number[]|Object} numc Numerator coefficients or a continuous model.
   * @param {number[]|number} denc Denominator coefficients, or sample time when passing a model.
   * @param {number} [Ts] Sample time for the coefficient form.
   * @returns {Object} Discrete model or its transfer coefficients.
   * @public
   */
  c2d(numc, denc, Ts) {
    if(numc?.A !== undefined) return this._c2dZOH(numc, denc);
    if(numc?.num !== undefined) {
      const model = { ...this.tf2ss(numc.num, numc.den), Ts: numc.Ts };
      const { num, den } = this.ss2tf(this._c2dZOH(model, denc));
      return this.tf(num, den, denc);
    }
    return this.ss2tf(this._c2dZOH(this.tf2ss(numc, denc), Ts));
  }

  /**
   * Simulates a discrete model or a continuous model with zero-order-held input.
   * @param {Object} sys Transfer function or state-space model.
   * @param {Array} u Input samples in time order, with one column per input.
   * @param {number[]} [t] Uniform sample times.
   * @param {number} [Ts] Sample interval for a continuous model.
   * @param {number|number[]} [x0] Initial state in the supplied or realized coordinates.
   * @returns {Object} Output samples y, sample times t, and state trajectory x.
   * @public
   */
  lsim(sys, u, t, Ts, x0) {
    let model = this._model(sys);
    const dt = model.Ts || Ts || (t?.length > 1 ? t[1] - t[0] : 1);
    if(!Number.isFinite(dt) || dt <= 0) throw new RangeError('lsim requires a positive sample interval.');
    if(!t?.length) t = Array.from(u, (_, i) => i * dt);
    if(t.length !== u.length || Array.from(t).some((value, i) => !Number.isFinite(value) ||
        (i && Math.abs((value - t[i - 1]) / dt - 1) > 1e-7))) {
      throw new RangeError('lsim requires one sample per time point on a uniform grid.');
    }
    if(!model.Ts) model = this._c2dZOH(model, dt);
    const { A, B, C, D, n, m, p } = this._stateSpace(model);
    const input = Array.from(u, value => typeof value === 'number' ? [value] : value);
    if(input.some(row => row?.length !== m || !Array.from(row).every(Number.isFinite))) {
      throw new RangeError('lsim requires one finite input sample per input channel and time point.');
    }
    const state = typeof x0 === 'number' ? [x0] : x0 ?? Array(n).fill(0);
    if(state.length !== n || !Array.from(state).every(Number.isFinite)) {
      throw new RangeError('Initial state must contain one finite value per state.');
    }
    const coefficients = [...A.flat(), ...B.flat(), ...Array(n * m).fill(0), ...C.flat(), ...D.flat()];
    const response = this.jsl.inter.env.native_module.control('simulate', [coefficients, state, input.flatMap(row => Array.from(row))],
      [n, m, p, u.length], u.length * (p + n));
    const outputs = this._rows(response, u.length, p);
    return { y: p === 1 ? outputs.flat() : outputs, t, x: this._rows(response.slice(u.length * p), u.length, n) };
  }

  /**
   * Simulates the unit step response of a single-input system.
   * @param {Object} sys Transfer function or state-space model.
   * @param {number|number[]} [Tfinal=10] Final time or explicit sample grid.
   * @returns {Object} Output samples, times, and state trajectory.
   * @public
   */
  step(sys, Tfinal = 10) {
    const t = this._responseTimes(sys, Tfinal);
    return this.lsim(sys, Array(t.length).fill(1), t, Array.isArray(Tfinal) ? undefined : sys.Ts || Tfinal / 100);
  }

  /**
   * Simulates the free response from a nonzero initial state.
   * @param {Object} sys State-space model.
   * @param {number|number[]} x0 Initial state.
   * @param {number|number[]} [time=10] Final time or uniform grid.
   * @returns {Object} Output, time, and state samples.
   * @public
   */
  initial(sys, x0, time = 10) {
    const model = this._model(sys);
    const { m } = this._stateSpace(model);
    const t = this._responseTimes(model, time);
    return this.lsim(model, t.map(() => Array(m).fill(0)), t, undefined, x0);
  }

  /**
   * Computes the unit-area impulse response of a single-input system.
   * Continuous-time direct feedthrough is an impulse and is omitted from sampled output.
   * @param {Object} sys Transfer function or state-space model.
   * @param {number|number[]} [time=10] Final time or uniform grid.
   * @returns {Object} Output, time, and state samples.
   * @public
   */
  impulse(sys, time = 10) {
    const model = this._model(sys);
    const { B, m } = this._stateSpace(model);
    if(m !== 1) throw new RangeError('impulse requires a single-input model.');
    const t = this._responseTimes(model, time);
    if(model.Ts) return this.lsim(model, t.map((_, i) => i ? 0 : 1 / model.Ts), t);
    return this.lsim(model, Array(t.length).fill(0), t, undefined, B.map(row => row[0]));
  }

  /**
   * Plots the simulated output using the workspace figure API.
   * @param {Object} sys Transfer function or state-space model.
   * @param {Array} u Input samples.
   * @param {number[]} [t] Sample times.
   * @returns {Object} Plot handle.
   * @public
   */
  lsimplot(sys, u, t) {
    return this._plotResponse(this.lsim(sys, u, t));
  }

  /**
   * Plots the unit step response using the workspace figure API.
   * @param {Object} sys Single-input model.
   * @param {number|number[]} [time=10] Final time or sample grid.
   * @returns {Object} Plot handle.
   * @public
   */
  stepplot(sys, time) {
    return this._plotResponse(this.step(sys, time));
  }

  /**
   * Evaluates the complex frequency response of a SISO model.
   * @param {Object} sys Transfer function or state-space model.
   * @param {number|number[]|Object} [w] Angular frequencies, or bounds { wmin, wmax }.
   * @returns {{w:number[],real:number[],imag:number[]}} Frequencies and response components.
   * @public
   */
  freqresp(sys, w) {
    const { num, den } = sys.A === undefined ? sys : this.ss2tf(sys);
    const period = sys.Ts === -1 ? 1 : sys.Ts ?? 0;
    if(!Number.isFinite(period) || period < 0 || !num?.length || !den?.length || !den.some(value => value !== 0)) {
      throw new RangeError('freqresp requires a valid SISO model.');
    }
    const native = this.jsl.inter.env.native_module;
    if(w === undefined) {
      const scales = [...native.roots(num), ...native.roots(den)]
        .map(root => period ? Math.hypot(Math.log(Math.hypot(root.real ?? root, root.imag ?? 0)),
          Math.atan2(root.imag ?? 0, root.real ?? root)) / period : Math.hypot(root.real ?? root, root.imag ?? 0))
        .filter(value => value > 0 && Number.isFinite(value));
      const high = period ? Math.PI / period : (scales.length ? Math.max(...scales) * 100 : 100);
      w = { wmin: Math.min(high / 100, scales.length ? Math.min(...scales) / 100 : 0.01), wmax: high };
    }
    if(w?.isMatrix === true) w = w.toArray();
    if(w?.constructor === Object) {
      const { wmin, wmax } = w;
      if(!(wmin > 0 && wmax > wmin && Number.isFinite(wmax))) {
        throw new RangeError('Frequency bounds must be positive and increasing.');
      }
      const low = Math.log(wmin), span = Math.log(wmax) - low;
      w = Array.from({ length: 301 }, (_, i) => Math.exp(low + span * i / 300));
      w[0] = wmin;
      w[300] = wmax;
    } else {
      w = typeof w === 'number' ? [w] : Array.from(w).flat();
    }
    if(!w.length || w.some(value => !Number.isFinite(value) || value < 0)) {
      throw new RangeError('Frequencies must be finite and nonnegative.');
    }
    const result = native.control('frequency', [num, den, w], [num.length, den.length, w.length, period], 2 * w.length);
    return { w, real: w.map((_, i) => result[2 * i]), imag: w.map((_, i) => result[2 * i + 1]) };
  }

  /**
   * Computes linear magnitude and unwrapped phase in degrees.
   * @param {Object} sys SISO model.
   * @param {number|number[]|Object} [w] Angular frequencies or bounds.
   * @returns {{w:number[],mag:number[],phase:number[]}} Bode response.
   * @public
   */
  bode(sys, w) {
    const response = this.freqresp(sys, w);
    let previous = NaN;
    const phase = response.real.map((real, i) => {
      const angle = Math.atan2(response.imag[i], real) * 180 / Math.PI;
      previous = Number.isFinite(previous) ? angle + 360 * Math.round((previous - angle) / 360) : angle;
      return previous;
    });
    return { w: response.w, mag: response.real.map((real, i) => Math.hypot(real, response.imag[i])), phase };
  }

  /**
   * Computes SISO gain and phase margins from polynomial crossover equations.
   * @param {Object} sys Continuous or discrete open-loop model.
   * @param {number} [tolerance] Relative tolerance for crossover roots.
   * @returns {{gm:number,pm:number,wcg:number,wcp:number}} Gain factor, principal phase margin in degrees,
   * and the respective angular frequencies. Absent crossover frequencies are NaN.
   * @public
   */
  margin(sys, tolerance = Math.sqrt(Number.EPSILON)) {
    const { num, den } = this.tfdata(sys);
    const period = sys.Ts === -1 ? 1 : sys.Ts ?? 0;
    if(!num.length || !den.some(value => value !== 0) || !Number.isFinite(period) || period < 0 ||
        !Number.isFinite(tolerance) || tolerance <= 0) {
      throw new RangeError('margin requires a valid SISO model and a positive tolerance.');
    }
    const [gm, pm, wcg, wcp] = this.jsl.inter.env.native_module.control('margin', [num, den],
      [num.length, den.length, period, tolerance], 4);
    return { gm, pm, wcg, wcp };
  }

  /**
   * Computes positive-frequency Nyquist response data.
   * @param {Object} sys SISO model.
   * @param {number|number[]|Object} [w] Angular frequencies or bounds.
   * @returns {{w:number[],real:number[],imag:number[]}} Nyquist response.
   * @public
   */
  nyquist(sys, w) {
    return this.freqresp(sys, w);
  }

  /**
   * Plots Bode magnitude and phase on a shared logarithmic frequency axis.
   * @param {Object} sys SISO model.
   * @param {number|number[]|Object} [w] Angular frequencies or bounds.
   * @returns {Object} Plot handle.
   * @public
   */
  bodeplot(sys, w) {
    const { w: frequencies, mag, phase } = this.bode(sys, w);
    const lang = this.jsl.inter.lang;
    return this.jsl.inter.figures._plotJson({
      data: [
        { x: frequencies, y: mag.map(value => value > 0 && Number.isFinite(value) ? 20 * Math.log10(value) : null),
          mode: 'lines', yaxis: 'y' },
        { x: frequencies, y: phase.map(value => Number.isFinite(value) ? value : null), mode: 'lines', yaxis: 'y2' }
      ],
      layout: { showlegend: false, xaxis: { type: 'log', anchor: 'y2', title: /* lang-fixed */ 'ω [rad/s]' },
        yaxis: { domain: [0.57, 1], title: lang.currentString(781) },
        yaxis2: { domain: [0, 0.43], title: lang.currentString(782) } }
    });
  }

  /**
   * Plots the positive-frequency Nyquist branch and its conjugate.
   * @param {Object} sys SISO model.
   * @param {number|number[]|Object} [w] Angular frequencies or bounds.
   * @returns {Object} Plot handle.
   * @public
   */
  nyquistplot(sys, w) {
    const { real, imag } = this.nyquist(sys, w);
    const finite = value => Number.isFinite(value) ? value : null;
    const plot = this.jsl.inter.figures.plot([
      { x: real.map(finite), y: imag.map(finite), mode: 'lines', showlegend: false },
      { x: real.map(finite), y: imag.map(value => finite(-value)), mode: 'lines', line: { dash: 'dot' }, showlegend: false },
      { x: [-1], y: [0], mode: 'markers', marker: { symbol: 'x' }, showlegend: false }
    ]);
    plot.xlabel(/* lang-fixed */ 'Re');
    plot.ylabel(/* lang-fixed */ 'Im');
    plot.axis('equal');
    return plot;
  }

  /**
   * Returns poles of a transfer function or eigenvalues of a state-space model.
   * @param {Object} sys Linear model.
   * @returns {Array} Real numbers or complex values with real and imag fields.
   * @public
   */
  pole(sys) {
    const native = this.jsl.inter.env.native_module;
    if(sys.A === undefined) return native.roots(sys.den);
    const { A, n } = this._stateSpace(sys);
    const result = native.control('poles', [A.flat()], [n], 2 * n);
    return A.map((_, i) => result[2 * i + 1] === 0 ? result[2 * i] :
      { real: result[2 * i], imag: result[2 * i + 1] });
  }

  /**
   * Returns the zeros of a SISO transfer function or state-space model.
   * @param {Object} sys SISO model.
   * @returns {Array} Real or complex zeros.
   * @public
   */
  zero(sys) {
    const { num } = sys.A === undefined ? sys : this.ss2tf(sys);
    return this.jsl.inter.env.native_module.roots(num);
  }

  /**
   * Computes the gain at s=0 or z=1. State-space models require a nonsingular equilibrium.
   * @param {Object} sys Transfer function or state-space model.
   * @returns {number|number[][]} Scalar SISO gain or matrix of gains.
   * @public
   */
  dcgain(sys) {
    if(sys.A === undefined) return this.freqresp(sys, 0).real[0];
    const { A, B, C, D, n, m, p } = this._stateSpace(sys);
    const values = this.jsl.inter.env.native_module.control('dcgain', [A.flat(), B.flat(), C.flat(), D.flat()],
      [n, m, p, Number(Boolean(sys.Ts))], m * p);
    return m === 1 && p === 1 ? values[0] : this._rows(values, p, m);
  }

  /**
   * Tests whether all poles lie in the open left half-plane or inside the unit circle.
   * @param {Object} sys Linear model.
   * @returns {boolean} Stability flag.
   * @public
   */
  isstable(sys) {
    return this.pole(sys).every(value => {
      const real = value.real ?? value;
      return sys.Ts ? Math.hypot(real, value.imag ?? 0) < 1 : real < 0;
    });
  }

  /**
   * Returns the controllability matrix [B, AB, …].
   * @param {Object|Array|number} sys State-space model or state matrix.
   * @param {number|Array|Object} [B] Input matrix when passing A directly.
   * @returns {number[][]} Controllability matrix.
   * @public
   */
  ctrb(sys, B) {
    return this._stateSubspace(sys, B, false, false);
  }

  /**
   * Returns the observability matrix with rows C, CA, and higher powers.
   * @param {Object|Array|number} sys State-space model or state matrix.
   * @param {number|Array|Object} [C] Output matrix when passing A directly.
   * @returns {number[][]} Observability matrix.
   * @public
   */
  obsv(sys, C) {
    return this._stateSubspace(sys, C, true, false);
  }

  /**
   * Tests whether the controllability matrix has full numerical rank.
   * @param {Object|Array|number} sys State-space model or state matrix.
   * @param {number|Array|Object} [B] Input matrix when passing A directly.
   * @returns {boolean} Controllability flag.
   * @public
   */
  isctrb(sys, B) {
    return this._stateSubspace(sys, B, false, true);
  }

  /**
   * Tests whether the observability matrix has full numerical rank.
   * @param {Object|Array|number} sys State-space model or state matrix.
   * @param {number|Array|Object} [C] Output matrix when passing A directly.
   * @returns {boolean} Observability flag.
   * @public
   */
  isobsv(sys, C) {
    return this._stateSubspace(sys, C, true, true);
  }

  /**
   * Returns pole-zero map data for a SISO model.
   * @param {Object} sys SISO model.
   * @returns {{poles:Array,zeros:Array}} Pole and zero locations.
   * @public
   */
  pzmap(sys) {
    return { poles: this.pole(sys), zeros: this.zero(sys) };
  }

  /**
   * Draws a pole-zero map using the shared figure API.
   * @param {Object} sys SISO model.
   * @returns {Object} Plot handle.
   * @public
   */
  pzplot(sys) {
    const { poles, zeros } = this.pzmap(sys);
    const trace = (points, name, symbol) => ({ x: points.map(value => value.real ?? value),
      y: points.map(value => value.imag ?? 0), mode: 'markers', name, marker: { symbol } });
    const lang = this.jsl.inter.lang;
    const traces = [trace(poles, lang.currentString(783), 'x'), trace(zeros, lang.currentString(784), 'circle-open')];
    if(sys.Ts) {
      const angles = Array.from({ length: 129 }, (_, i) => i * Math.PI / 64);
      traces.unshift({ x: angles.map(Math.cos), y: angles.map(Math.sin), mode: 'lines',
        line: { dash: 'dot' }, showlegend: false });
    }
    const plot = this.jsl.inter.figures.plot(traces);
    plot.xlabel(/* lang-fixed */ 'Re');
    plot.ylabel(/* lang-fixed */ 'Im');
    plot.axis('equal');
    return plot;
  }

  /**
   * Computes the negative-feedback closed-loop poles for a sequence of gains.
   * @param {Object} sys SISO open-loop model.
   * @param {number|number[]} [gains] Scalar or vector of gains.
   * @returns {{k:number[],r:Array[]}} Gains and pole trajectories, one trajectory per branch.
   * @public
   */
  rlocus(sys, gains) {
    const leading = values => {
      const start = values.findIndex(value => value !== 0);
      return start < 0 ? [] : values.slice(start);
    };
    const data = this.tfdata(sys);
    const den = leading(data.den), num = leading(data.num);
    if(!den.length || ![...den, ...num].every(Number.isFinite)) {
      throw new RangeError('rlocus requires finite coefficients and a nonzero denominator.');
    }
    if(gains === undefined) {
      const scale = Math.max(...den.map(Math.abs)) / (Math.max(0, ...num.map(Math.abs)) || 1);
      gains = Array.from({ length: 241 }, (_, i) => i ? scale * 10 ** (-4 + 6 * (i - 1) / 239) : 0);
    }
    if(gains?.isMatrix === true) gains = gains.toArray();
    const k = typeof gains === 'number' ? [gains] : Array.from(gains).flat();
    if(!k.length || !k.every(Number.isFinite)) throw new RangeError('rlocus requires finite gains.');
    const length = Math.max(den.length, num.length);
    const r = Array.from({ length: length - 1 }, () => []);
    const real = value => value.real ?? value;
    const imag = value => value.imag ?? 0;
    const roots = this.jsl.inter.env.native_module.roots;
    for(const gain of k) {
      const polynomial = Array.from({ length }, (_, i) =>
        (den[i + den.length - length] ?? 0) + gain * (num[i + num.length - length] ?? 0));
      if(polynomial.every(value => value === 0)) throw new RangeError('The closed-loop characteristic polynomial is identically zero.');
      const poles = roots(polynomial).sort((a, b) => real(a) - real(b) || imag(a) - imag(b));
      const assigned = new Map();
      while(poles.length && assigned.size < r.length) {
        let branch, index, nearest = Infinity;
        for(let i = 0; i < r.length; i++) {
          if(assigned.has(i)) continue;
          const previous = r[i].at(-1);
          for(let j = 0; j < poles.length; j++) {
            const distance = previous == null ? Number.MAX_VALUE :
              Math.hypot(real(previous) - real(poles[j]), imag(previous) - imag(poles[j]));
            if(branch === undefined || distance < nearest) {
              nearest = distance;
              branch = i;
              index = j;
            }
          }
        }
        assigned.set(branch, poles.splice(index, 1)[0]);
      }
      r.forEach((branch, i) => branch.push(assigned.get(i) ?? null));
    }
    return { k, r };
  }

  /**
   * Draws the root locus using the existing figure API.
   * @param {Object} sys SISO open-loop model.
   * @param {number|number[]} [gains] Feedback gains to plot.
   * @returns {Object} Plot handle.
   * @public
   */
  rlocusplot(sys, gains) {
    const { k, r } = this.rlocus(sys, gains);
    const plot = this.jsl.inter.figures.plot(r.map(branch => ({
      x: branch.map(value => value == null ? null : value.real ?? value),
      y: branch.map(value => value == null ? null : value.imag ?? 0),
      customdata: k, mode: k.length === 1 ? 'markers' : 'lines', showlegend: false
    })));
    plot.xlabel(/* lang-fixed */ 'Re');
    plot.ylabel(/* lang-fixed */ 'Im');
    plot.axis('equal');
    return plot;
  }

  /**
   * Builds a parallel-form PID with optional first-order derivative roll-off.
   * @param {number} [Kp=1] Proportional gain.
   * @param {number} [Ki=0] Integral gain.
   * @param {number} [Kd=0] Derivative gain.
   * @param {number} [Tf=0] Derivative filter time constant. Use a positive value for a proper derivative controller.
   * @param {number} [Ts=0] Sample time of the returned transfer function.
   * @returns {Object} Controller transfer function.
   * @public
   */
  pid(Kp = 1, Ki = 0, Kd = 0, Tf = 0, Ts = 0) {
    if(![Kp, Ki, Kd, Tf, Ts].every(Number.isFinite) || Tf < 0 || (Ts < 0 && Ts !== -1)) {
      throw new RangeError('pid requires finite gains, a nonnegative filter constant, and a valid sample time.');
    }
    if(Kd === 0) Tf = 0;
    const num = Ki ? [Kp * Tf + Kd, Kp + Ki * Tf, Ki] : [Kp * Tf + Kd, Kp];
    const den = Ki ? [Tf, 1, 0] : [Tf, 1];
    while(num.length > 1 && num[0] === 0) num.shift();
    if(!Tf) den.shift();
    return this.tf(num, den, Ts);
  }

  /**
   * Assigns the poles of A - B*K for a controllable state-space pair.
   * @param {Object|Array|number} A State matrix or linear model.
   * @param {Array|number} B Input matrix, or desired poles when passing a model.
   * @param {Array} [poles] Desired real or conjugate-paired complex poles.
   * @returns {number[][]} State-feedback gain K.
   * @public
   */
  place(A, B, poles) {
    const model = poles === undefined ? this._model(A) : this.ss(A, B, [], []);
    poles ??= B;
    if(poles?.isMatrix === true) poles = poles.toArray();
    poles = typeof poles === 'number' ? [poles] : Array.from(poles).flat();
    const { A: state, B: input, n, m } = this._stateSpace(model);
    if(!n || !m || poles.length !== n) throw new RangeError('place requires one pole per state and at least one input.');
    let polynomial = [[1, 0]];
    for(const pole of poles) {
      const real = pole?.real ?? pole?.re ?? pole;
      const imag = pole?.imag ?? pole?.im ?? 0;
      if(!Number.isFinite(real) || !Number.isFinite(imag)) throw new RangeError('Desired poles must be finite.');
      const next = [...polynomial.map(value => value.slice()), [0, 0]];
      polynomial.forEach(([r, i], j) => {
        next[j + 1][0] -= r * real - i * imag;
        next[j + 1][1] -= i * real + r * imag;
      });
      polynomial = next;
    }
    if(polynomial.some(([real, imag]) => Math.abs(imag) > 1e-10 * Math.max(1, Math.abs(real)))) {
      throw new RangeError('Complex poles must occur in conjugate pairs.');
    }
    const gain = this.jsl.inter.env.native_module.control('place',
      [state.flat(), input.flat(), polynomial.slice(1).map(([real]) => real)], [n, m], m * n);
    return this._rows(gain, m, n);
  }

  /**
   * Designs a linear-quadratic regulator. A discrete model selects the discrete Riccati equation.
   * @param {Object|Array|number} A State matrix or linear model.
   * @param {...*} args B, Q, R, and optional S for matrices, or Q, R, and optional S for a model.
   * @returns {{K:number[][],X:number[][],poles:Array}} Feedback gain, Riccati solution, and closed-loop poles.
   * @public
   */
  lqr(A, ...args) {
    const is_model = A?.A !== undefined || A?.num !== undefined;
    const model = is_model ? this._model(A) : this.ss(A, args.shift(), [], []);
    let [Q, R, S] = args;
    const { A: state, B: input, n, m } = this._stateSpace(model);
    if(!n || !m) throw new RangeError('lqr requires at least one state and one input.');
    S ??= Array.from({ length: n }, () => Array(m).fill(0));
    const weight = (values, rows, columns, symmetric) => {
      if(values?.isMatrix === true) values = values.toArray();
      if(typeof values === 'number') values = [[values]];
      if(values?.length !== rows || Array.from(values).some((row, i) => row?.length !== columns ||
          Array.from(row).some((value, j) => !Number.isFinite(value) || (symmetric && value !== values[j]?.[i])))) {
        throw new RangeError('lqr requires compatible finite weights and symmetric Q and R.');
      }
      return Array.from(values).flatMap(row => Array.from(row));
    };
    const data = this.jsl.inter.env.native_module.control('lqr',
      [state.flat(), input.flat(), weight(Q, n, n, true), weight(R, m, m, true), weight(S, n, m, false)],
      [n, m, Number(Boolean(model.Ts))], n * (n + m + 2));
    const offset = n * (n + m);
    const poles = Array.from({ length: n }, (_, i) => {
      const [real, imag] = data.slice(offset + 2 * i, offset + 2 * i + 2);
      return imag === 0 ? real : { real, imag };
    });
    return { K: this._rows(data.slice(n * n), m, n), X: this._rows(data, n, n), poles };
  }

  /**
   * Estimates a continuous SISO transfer function using native least squares and a zero-order-held input.
   * @param {number[]} t Uniform sample times.
   * @param {number[]} u Input samples.
   * @param {number[]} y Output samples.
   * @param {number} np Number of poles.
   * @param {number} nz Number of zeros.
   * @param {string} [method='LeastSquares'] Native least squares or the legacy 'Powell' and 'NelderMead' methods.
   * @returns {{sys: Object, error: number}} Estimated model and mean squared error.
   * @public
   */
  tfest(t, u, y, np, nz, method = 'LeastSquares') {
    const dt = t[1] - t[0];
    if(!['LeastSquares', 'Powell', 'NelderMead'].includes(method) ||
        !Number.isSafeInteger(np) || !Number.isSafeInteger(nz) ||
        nz < 0 || np < nz || t.length <= np + nz + 1 || t.length !== u.length || t.length !== y.length ||
        !Number.isFinite(dt) || dt <= 0 || Array.from(t).some((time, i) => !Number.isFinite(time) ||
          (i && Math.abs((time - t[i - 1]) / dt - 1) > 1e-7))) {
      throw new RangeError('tfest requires uniform samples, a proper model order, and a supported estimation method.');
    }
    if(method !== 'LeastSquares') return this._fitTransferLegacy(t, u, y, np, nz, method);
    const fit = this.jsl.inter.env.native_module.control('fit', [u, y],
      [t.length, np, nz, dt * (t.length - 1)], np + nz + 2);
    return { sys: this.tf(fit.slice(np + 1), [1, ...fit.slice(1, np + 1)]), error: fit[0] };
  }

  /**
   * Cascades models so the output of the first drives the second.
   * @param {Object|number} first First model or scalar gain.
   * @param {Object|number} second Second model or scalar gain.
   * @returns {Object} State-space realization of the cascade.
   * @public
   */
  series(first, second) {
    return this._interconnect(first, second, 0, 1);
  }

  /**
   * Adds two models with matching input and output channels.
   * @param {Object|number} first First model or scalar gain.
   * @param {Object|number} second Second model or scalar gain.
   * @returns {Object} State-space realization of the sum.
   * @public
   */
  parallelConnect(first, second) {
    return this._interconnect(first, second, 1, 1);
  }

  /**
   * Closes a feedback loop around a model.
   * @param {Object|number} first Forward model or scalar gain.
   * @param {Object|number} [second=1] Feedback model or scalar gain.
   * @param {number} [sign=-1] Feedback sign, either -1 or 1.
   * @returns {Object} Closed-loop state-space model.
   * @public
   */
  feedback(first, second = 1, sign = -1) {
    if(sign !== -1 && sign !== 1) throw new RangeError('feedback requires a sign of -1 or 1.');
    return this._interconnect(first, second, 2, sign);
  }

  /**
   * Evaluates a state subspace matrix or its rank through the native backend.
   * @param {Object|Array|number} sys Model or state matrix.
   * @param {number|Array|Object} channels Input or output matrix for the raw-matrix form.
   * @param {boolean} observe Select observability.
   * @param {boolean} rank_only Return a full-rank flag.
   * @returns {number[][]|boolean} Matrix or full-rank flag.
   */
  _stateSubspace(sys, channels, observe, rank_only) {
    let model;
    if(channels === undefined) {
      model = this._model(sys);
    } else {
      const A = sys?.isMatrix === true ? sys.toArray() : sys;
      const n = typeof A === 'number' ? 1 : A.length;
      model = observe ? this.ss(A, Array.from({ length: n }, () => []), channels, []) :
        this.ss(A, channels, [], []);
    }
    const { A, B, C, n, m, p } = this._stateSpace(model);
    const ports = observe ? p : m;
    const size = n * ports;
    const data = this.jsl.inter.env.native_module.control('state_subspace', [A.flat(), (observe ? C : B).flat()],
      [n, ports, Number(observe), Number(rank_only)], rank_only ? 1 : n * size);
    return rank_only ? data[0] === n : this._rows(data, observe ? size : n, observe ? n : size);
  }

  /**
   * Fits a model with an explicitly requested legacy optimizer and WASM simulation.
   * @param {number[]} t Sample times.
   * @param {number[]} u Input samples.
   * @param {number[]} y Output samples.
   * @param {number} poles Denominator order.
   * @param {number} zeros Numerator order.
   * @param {string} method Powell or NelderMead.
   * @returns {Object} Estimated model and mean squared error.
   */
  _fitTransferLegacy(t, u, y, poles, zeros, method) {
    const inter = this.jsl.inter;
    const model = values => this.tf(values.slice(poles), [1, ...values.slice(0, poles)]);
    const loss = values => {
      try {
        return inter.math.mse(y, this.lsim(model(values), u, t).y);
      } catch(error) {
        if(error instanceof RangeError || error.message === 'Control calculation failed in discretize.' ||
            error.message === 'Control calculation failed in simulate.') return Infinity;
        throw error;
      }
    };
    const start = Array(poles + zeros + 1).fill(0);
    const result = method === 'Powell' ? inter.optim.optimPowell(loss, start) : inter.optim.optimNelderMead(loss, start);
    return { sys: model(result.x), error: result.fx };
  }

  /**
   * Runs the shared SLICOT interconnection routine with compatible state-space records.
   * @param {Object|number} first First model.
   * @param {Object|number} second Second model.
   * @param {number} mode SLICOT operation selector.
   * @param {number} factor Parallel weight or feedback sign.
   * @returns {Object} Combined state-space realization.
   */
  _interconnect(first, second, mode, factor) {
    const left = this._model(first), right = this._model(second);
    const a = this._stateSpace(left), b = this._stateSpace(right);
    const inputs = a.m, middle = a.p, outputs = mode === 0 ? b.p : middle;
    if(!inputs || !middle || !outputs || b.m !== (mode === 1 ? inputs : middle) ||
        b.p !== (mode === 2 ? inputs : outputs)) {
      throw new RangeError('Control interconnection requires compatible input and output channels.');
    }
    const times = [left, right].filter((model, i) => (i ? b.n : a.n) !== 0 || model.Ts)
      .map(model => model.Ts ?? 0);
    if(times.length === 2 && times[0] !== times[1]) {
      throw new RangeError('Control interconnection requires matching sample times.');
    }
    const n = a.n + b.n;
    const flatten = model => [model.A, model.B, model.C, model.D].flat(2);
    const result = this.jsl.inter.env.native_module.control('interconnect', [flatten(a), flatten(b)],
      [a.n, b.n, inputs, middle, outputs, mode, factor], n * (n + inputs + outputs) + inputs * outputs);
    let offset = 0;
    const matrix = (rows, columns) => {
      const count = rows * columns;
      const values = this._rows(result.slice(offset, offset + count), rows, columns);
      offset += count;
      return values;
    };
    return this.ss(matrix(n, n), matrix(n, inputs), matrix(outputs, n), matrix(outputs, inputs), times[0] ?? 0);
  }

  /**
   * Computes the zero-order-hold discretization of a state-space model.
   * @param {Object} sysc Continuous-time state-space model.
   * @param {number} Ts Sample time.
   * @returns {Object} Discrete-time state-space model.
   */
  _c2dZOH(sysc, Ts) {
    if(sysc.Ts || !Number.isFinite(Ts) || Ts <= 0) throw new RangeError('c2d requires a continuous model and positive sample time.');
    const { A, B, C, D, n, m } = this._stateSpace(sysc);
    if(!n) return this.ss(A, B, C, D, Ts);
    const data = this.jsl.inter.env.native_module.control('discretize', [A.flat(), B.flat()],
      [n, m, Ts, 0], n * (n + 2 * m));
    return this.ss(this._rows(data, n, n), this._rows(data.slice(n * n), n, m), C, D, Ts);
  }

  /**
   * Normalizes a state-space record for the numerical kernels.
   * @param {Object} sys State-space model.
   * @returns {Object} Matrices and dimensions.
   */
  _stateSpace(sys) {
    let { A, B, C, D } = sys;
    [A, B, C, D] = [A, B, C, D].map(value => value?.isMatrix === true ? value.toArray() : value);
    if(typeof A === 'number') A = [[A]];
    const n = A.length;
    if(typeof B === 'number') B = [[B]];
    if(typeof B[0] === 'number') B = n === 1 ? [Array.from(B)] : Array.from(B, value => [value]);
    if(typeof C === 'number') C = [[C]];
    if(typeof C[0] === 'number') C = n === 1 ? Array.from(C, value => [value]) : [Array.from(C)];
    if(typeof D === 'number') D = [[D]];
    if(!n && !C.length) C = D.map(() => []);
    const m = B[0]?.length ?? D[0]?.length ?? 0, p = C.length;
    if(!D.length || (D.length === 1 && D[0].length === 1 && D[0][0] === 0 && (m !== 1 || p !== 1))) {
      D = Array.from({ length: p }, () => Array(m).fill(0));
    }
    for(const [matrix, rows, cols] of [[A, n, n], [B, n, m], [C, p, n], [D, p, m]]) {
      if(matrix.length !== rows || matrix.some(row => row?.length !== cols || !Array.from(row).every(Number.isFinite))) {
        throw new RangeError('Incompatible or nonfinite state-space matrices.');
      }
    }
    [A, B, C, D] = [A, B, C, D].map(matrix => Array.from(matrix, row => Array.from(row)));
    return { A, B, C, D, n, m, p };
  }

  /**
   * Reads a row-major matrix from a flat array.
   * @param {number[]} data Flat values.
   * @param {number} rows Number of rows.
   * @param {number} columns Number of columns.
   * @returns {number[][]} Matrix.
   */
  _rows(data, rows, columns) {
    return Array.from({ length: rows }, (_, i) => data.slice(i * columns, (i + 1) * columns));
  }

  /**
   * Converts a supported model or scalar gain to state-space matrices.
   * @param {Object|number} sys State-space model, transfer function, or gain.
   * @returns {Object} State-space matrices and sample time.
   */
  _model(sys) {
    if(typeof sys === 'number') return this.ss([], [], [], sys);
    return sys.A === undefined ? { ...this.tf2ss(sys.num, sys.den), Ts: sys.Ts ?? 0 } : sys;
  }

  /**
   * Resolves a final time or an explicit time grid for sampled responses.
   * @param {Object} sys Linear model.
   * @param {number|number[]} time Final time or sample times.
   * @returns {number[]} Sample times.
   */
  _responseTimes(sys, time) {
    if(Array.isArray(time)) {
      if(!time.length) throw new RangeError('The response time grid cannot be empty.');
      return time;
    }
    const dt = sys.Ts || time / 100;
    if(!Number.isFinite(time) || time <= 0 || !Number.isFinite(dt) || dt <= 0) {
      throw new RangeError('Response time and sample interval must be positive and finite.');
    }
    return Array.from({ length: Math.floor(time / dt + 1e-10) + 1 }, (_, i) => i * dt);
  }

  /**
   * Draws one trace per output channel.
   * @param {Object} response Simulated times and outputs.
   * @returns {Object} Plot handle.
   */
  _plotResponse({ t, y }) {
    const columns = Array.isArray(y[0]) ? y[0].map((_, j) => y.map(row => row[j])) : [y];
    const figure = this.jsl.inter.figures.plot(columns.map(values => ({ x: t, y: values, mode: 'lines' })));
    figure.xlabel(this.jsl.inter.lang.currentString(503));
    figure.ylabel(this.jsl.inter.lang.currentString(780));
    return figure;
  }
}

exports.PRDC_JSLAB_LIB_CONTROL = PRDC_JSLAB_LIB_CONTROL;
