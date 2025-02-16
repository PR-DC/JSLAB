/**
 * @file JSLAB library control submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB control submodule.
 */
class PRDC_JSLAB_LIB_CONTROL {
  
  /**
   * Initializes the control submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }

  /**
   * Create a transfer function representation.
   * @param {number[]} num - Numerator coefficients of the transfer function.
   * @param {number[]} den - Denominator coefficients of the transfer function.
   * @param {number} [Ts=0] - Sampling time, defaults to 0 for continuous-time systems.
   * @returns {object} An object representing the transfer function { num, den, Ts }.
   */
  tf(num, den, Ts = 0) {
    return { num, den, Ts };
  }

  /**
   * Create a state-space representation.
   * @param {number[][]} A - System matrix.
   * @param {number[][]} B - Input matrix.
   * @param {number[][]} C - Output matrix.
   * @param {number[][]} D - Feedthrough matrix.
   * @param {number} [Ts=0] - Sampling time, defaults to 0 for continuous-time systems.
   * @returns {object} An object representing the state-space system { A, B, C, D, Ts }.
   */
  ss(A, B, C, D, Ts = 0) {
    return { A, B, C, D, Ts };
  }

  /**
   * Convert a transfer function to a state-space representation.
   * @param {number[]} num - Numerator coefficients of the transfer function.
   * @param {number[]} den - Denominator coefficients of the transfer function.
   * @returns {object} State-space representation of the system.
   */
  tf2ss(num, den) {
    const n = den.length;
    num = [...zeros(n - num.length), ...num];

    let A = zeros(n-1).map(() => zeros(n-1));
    for(let i = 1; i < n - 1; i++) A[i-1][i] = 1;
    A[n - 2] = fliplr(den.slice(1).map(d => -d));

    const C = fliplr(num.map((c, i) => c - den[i] * num[0]).slice(1));
    const B = zeros(n - 2).concat([1]);
    const D = num[0];

    return this.ss(A, B, C, D);
  }

  /**
   * Convert a state-space representation to a transfer function.
   * @param {object} sys - State-space system { A, B, C, D }.
   * @returns {object} Transfer function representation { num, den }.
   */
  ss2tf(sys) {
    const { A, B, C, D } = sys;
  
    const den = charpoly(A);
    const num = plus(charpoly(minus(A, this.jsl.env.math.multiply(B, [C]))),
      scale(den, D-1));

    var p = den.length - num.length;
    if(p > 0) {
      num = [...zeros(p), ...num];
    }
    return { num, den };
  }

  /**
   * Convert a continuous-time transfer function to discrete-time.
   * @param {number[]} numc - Continuous-time numerator coefficients.
   * @param {number[]} denc - Continuous-time denominator coefficients.
   * @param {number} Ts - Sampling time.
   * @returns {object} Discrete-time transfer function representation { num, den }.
   */
  c2d(numc, denc, Ts) {
    const sysc = this.tf2ss(numc, denc);
    const sysd = this._c2dZOH(sysc, Ts);
    return this.ss2tf(sysd);
  }

  /**
   * Convert a continuous-time state-space system to discrete-time using Zero-Order Hold.
   * @param {object} sysc - Continuous-time state-space system { A, B, C, D }.
   * @param {number} Ts - Sampling time.
   * @returns {object} Discrete-time state-space system { A, B, C, D, Ts }.
   */
  _c2dZOH(sysc, Ts) {
    const { A, B, C, D } = sysc;
    const n = A.length;

    const M = A.map((row, i) => [...row, B[i]]);
    M.push(zeros(n + 1));
    const M_exp = jsl.env.math.expm(jsl.env.math.multiply(M, Ts))._data.slice(0, n);

    const Ad = M_exp.map(row => row.slice(0, n));
    const Bd = M_exp.map(row => row.slice(n));

    return this.ss(Ad, Bd, C, D, Ts);
  }
  
  /**
   * Simulate the time response of a discrete-time linear system.
   * @param {number[]} sys - transfer function of system.
   * @param {number[]} u - Input signal array.
   * @param {number[]} t - Time vector array.
   * @returns {object} An object containing the response:
   *                   - y: Output signal array.
   *                   - t: Time vector array (same as input).
   */
  lsim(sys, u, t, Ts) {
    var sysd = sys;
    if(!sys.Ts && Ts) {
      sysd = this.c2d(sys.num, sys.den, Ts);
    }
    var num = sysd.num;
    var den = sysd.den;

    // Normalize the denominator coefficients so that den[0] = 1
    if(den[0] !== 1) {
      const den0 = den[0];
      for(let i = 0; i < den.length; i++) {
        den[i] /= den0;
      }
      for(let i = 0; i < num.length; i++) {
        num[i] /= den0;
      }
    }

    const N = u.length;
    var y = zeros(N); // Initialize output array with zeros

    // Iterate over each time step starting from n=1
    for(let n = 0; n < N; n++) {
      // Compute feedforward terms: sum(num[k] * u[n - k}) for k =0 to M
      for(let k = 0; k < num.length; k++) {
        const idx = n - k;
        if(idx >= 0) {
          y[n] += num[k] * u[idx];
        }
      }

      // Compute feedback terms: sum(den[k} * y[n - k}) for k =1 to N
      for(let k = 1; k < den.length; k++) {
        const idx = n - k;
        if(idx >= 0) {
          y[n] -= den[k] * y[idx];
        }
      }
    }
    
    if(num.length < den.length) {
      var n = den.length - num.length;
      y = [...zeros(n), ...y.slice(0, y.length - n)];
    }
    
    return { y, t };
  }
  
  /**
   * Simulates the system response over a specified time period.
   * @param {Object} sys - The system to simulate.
   * @param {number} Tfinal - The final time for the simulation.
   * @returns {Object} The simulation result.
   */
  step(sys, Tfinal) {
    var u = ones(101);
    var t = linspace(0, Tfinal, 101);
    var Ts = Tfinal/100;
    return this.lsim(sys, u, t, Ts);
  }
  
  /**
   * Estimates a transfer function model using numerical optimization.
   * @param {Array<number>} t - Time vector.
   * @param {Array<number>} u - Input signal vector.
   * @param {Array<number>} y - Output signal vector.
   * @param {number} np - Number of poles.
   * @param {number} nz - Number of zeros.
   * @param {string} [method='NelderMead'] - Optimization method ('NelderMead' or 'Powell').
   * @returns {{sys: object, error: number}} Estimated transfer function and mean squared error.
   */
  tfest(t, u, y, np, nz, method = 'NelderMead') {
    var obj = this;
    var Ts = mean(diff(t));
    var N = np+nz+1;
    var f = (x) => { // funkcija prilagodjenosti
      try {
        var den = [1, ...x.slice(0, np)];
        var num = x.slice(np);
        var sys = tf(num, den);
        var r = obj.lsim(sys, u, t, Ts);
        var mse = obj.jsl.math.mse(y, r.y);
        return mse;
      } catch(err) {
        return Infinity;
      }
    };
    var r;
    if(method == 'NelderMead') {
      r = this.jsl.optim.optimNelderMead(f, zeros(N));
    } else if(method == 'Powell') {
      r = this.jsl.optim.optimPowell(f, zeros(N));
    }
    var den = [1, ...r.x.slice(0, np)];
    var num = r.x.slice(np);
    return {sys: tf(num, den), error: r.fx};
  }
}

exports.PRDC_JSLAB_LIB_CONTROL = PRDC_JSLAB_LIB_CONTROL;