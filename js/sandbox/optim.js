/**
 * @file JSLAB library optim submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
var { PRDC_JSLAB_OPTIM_RCMIGA } = require('./optim-rcmiga');

/**
 * Class for JSLAB optim submodule.
 */
class PRDC_JSLAB_LIB_OPTIM {
  
  /**
   * Initializes the optim submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }
  
  /**
   * Minimizes an unconstrained function using a coordinate descent-like Powell algorithm.
   * @param {function} fnc Function to be minimized. Accepts an array of size N and returns a scalar.
   * @param {Array} x0 Initial guess for the parameters as an array of size N.
   * @param {Object} [options] Optional parameters:
   *   - eps: Convergence threshold (default: 1e-6)
   *   - alpha: Initial step size scaling factor (default: 0.001)
   *   - stepSize: Finite difference step size for gradient estimation (default: 1e-6)
   *   - maxIterations: Maximum number of iterations to prevent infinite loops (default: 1000)
   * @return {Object} An object with two fields:
   *   - argument: The parameter array that minimizes the function.
   *   - fncvalue: The function value at the minimized parameters.
   */
  optimPowell(fnc, x0, options = {}) {
    const {
      eps = 1e-6,
      alpha = 0.001,
      stepSize = 1e-6,
      maxIterations = 1000
    } = options;

    let convergence = false;
    let x = x0.slice(); // Create a copy of the initial guess
    let currentAlpha = alpha; // Current step size scaling factor

    let pfx = Infinity; // Previous function value initialized to Infinity
    let fx = fnc(x); // Current function value

    let iteration = 0;
    let dx;
    
    while(!convergence && iteration < maxIterations) {
      iteration++;
      const indices = shuffleIndices(x);
      convergence = true; // Assume convergence until a significant update is found

      // Iterate over each variable in shuffled order
      for(let i = 0; i < indices.length; i++) {
        const idx = indices[i];

        // Estimate the derivative (gradient) using finite differences
        x[idx] += stepSize;
        const fxi = fnc(x);
        x[idx] -= stepSize;
        dx = (fxi - fx) / stepSize;

        // Check convergence based on the derivative
        if(Math.abs(dx) > eps) {
          convergence = false;
        }

        // Update the parameter by moving against the gradient
        x[idx] -= currentAlpha * dx;

        // Update the function value after the parameter change
        fx = fnc(x);
      }

      // Adaptive step size adjustment
      if(fx < pfx) {
        currentAlpha *= 1.1; // Increase step size if improvement
      } else {
        currentAlpha *= 0.7; // Decrease step size if no improvement
      }
      pfx = fx;

      // Optional: Log progress every 100 iterations
      if(options.disp && iteration % 100 === 0) {
        this.jsl.env.disp(`Iteration ${iteration}: f(x) = ${fx}`);
      }
    }

    return { x, fx };
  }
  
  /**
   * Performs optimization using the Nelder-Mead algorithm.
   * @param {Function} f - The objective function to minimize. It should accept an array of numbers and return a scalar value.
   * @param {number[]} x0 - An initial guess for the parameters as an array of numbers.
   * @param {Object} [parameters] - Optional parameters to control the optimization process.
   * @param {number} [parameters.maxIterations=x0.length * 200] - Maximum number of iterations to perform.
   * @param {number} [parameters.nonZeroDelta=1.05] - Scaling factor for non-zero initial steps in the simplex.
   * @param {number} [parameters.zeroDelta=0.001] - Initial step size for parameters that are initially zero.
   * @param {number} [parameters.minErrorDelta=1e-6] - Minimum change in function value to continue iterations.
   * @param {number} [parameters.minTolerance=1e-5] - Minimum change in parameters to continue iterations.
   * @param {number} [parameters.rho=1] - Reflection coefficient.
   * @param {number} [parameters.chi=2] - Expansion coefficient.
   * @param {number} [parameters.psi=-0.5] - Contraction coefficient.
   * @param {number} [parameters.sigma=0.5] - Reduction coefficient.
   * @param {Array<Object>} [parameters.history] - Optional array to store the history of simplex states for analysis.
   *
   * @returns {{ fx: number, x: number[] }} An object containing:
   *   - `fx`: The minimum function value found.
   *   - `x`: The parameters corresponding to the minimum function value.
   */
  optimNelderMead(...args) {
    return this.jsl.env.fmin.nelderMead(...args);
  }
  
  /**
   * Performs optimization using the Conjugate Gradient method.
   * @param {Function} f - The objective function to minimize. It should accept an array of numbers and return a scalar value and its gradient.
   * @param {number[]} initial - An initial guess for the parameters as an array of numbers.
   * @param {Object} [params] - Optional parameters to control the optimization process.
   * @param {number} [params.maxIterations=initial.length * 20] - Maximum number of iterations to perform.
   * @param {Array<Object>} [params.history] - Optional array to store the history of optimization steps for analysis.
   *
   * @returns {{ fx: number, x: number[], fxprime: number[] }} An object containing:
   *   - `fx`: The minimum function value found.
   *   - `x`: The parameters corresponding to the minimum function value.
   *   - `fxprime`: The gradient of the function at the minimum.
   */
  optimConjugateGradient(...args) {
    return this.jsl.env.fmin.conjugateGradient(...args);
  }
  
  /**
   * Performs optimization using the Gradient Descent method.
   * @param {Function} f - The objective function to minimize. It should accept an array of numbers and return a scalar value and its gradient.
   * @param {number[]} initial - An initial guess for the parameters as an array of numbers.
   * @param {Object} [params] - Optional parameters to control the optimization process.
   * @param {number} [params.maxIterations=initial.length * 100] - Maximum number of iterations to perform.
   * @param {number} [params.learnRate=0.001] - Learning rate or step size for each iteration.
   * @param {Array<Object>} [params.history] - Optional array to store the history of optimization steps for analysis.
   *
   * @returns {{ fx: number, x: number[], fxprime: number[] }} An object containing:
   *   - `fx`: The minimum function value found.
   *   - `x`: The parameters corresponding to the minimum function value.
   *   - `fxprime`: The gradient of the function at the minimum.
   */
  optimGradientDescent(...args) {
    return this.jsl.env.fmin.gradientDescent(...args);
  }
  
  /**
   * Performs optimization using the Gradient Descent method with Wolfe Line Search.
   * @param {Function} f - The objective function to minimize. It should accept an array of numbers and return a scalar value and its gradient.
   * @param {number[]} initial - An initial guess for the parameters as an array of numbers.
   * @param {Object} [params] - Optional parameters to control the optimization process.
   * @param {number} [params.maxIterations=initial.length * 100] - Maximum number of iterations to perform.
   * @param {number} [params.learnRate=1] - Initial learning rate or step size for the line search.
   * @param {number} [params.c1=1e-3] - Parameter for the Armijo condition in Wolfe Line Search.
   * @param {number} [params.c2=0.1] - Parameter for the curvature condition in Wolfe Line Search.
   * @param {Array<Object>} [params.history] - Optional array to store the history of optimization steps for analysis, including line search details.
   * @returns {{ fx: number, x: number[], fxprime: number[] }} An object containing:
   *   - `fx`: The minimum function value found.
   *   - `x`: The parameters corresponding to the minimum function value.
   *   - `fxprime`: The gradient of the function at the minimum.
   */
  optimGradientDescentLineSearch(...args) {
    return this.jsl.env.fmin.gradientDescentLineSearch(...args);
  }
    
  /**
   * Performs root finding using the Bisection method.
   * @param {Function} f - The function for which to find a root. It should accept a number and return a number.
   * @param {number} a - The start of the interval. Must satisfy f(a) and f(b) have opposite signs.
   * @param {number} b - The end of the interval. Must satisfy f(a) and f(b) have opposite signs.
   * @param {Object} [parameters] - Optional parameters to control the root-finding process.
   * @param {number} [parameters.maxIterations=100] - Maximum number of iterations to perform.
   * @param {number} [parameters.tolerance=1e-10] - Tolerance for convergence. The method stops when the interval width is below this value.
   * @returns {number} The root found within the interval [a, b].
   */
  optimBisect(...args) {
    return this.jsl.env.fmin.bisect(...args);
  }
  
  /**
   * Performs search using the Nelder-Mead algorithm.
   * @param {Function} f - The objective function to minimize. It should accept an array of numbers and return a scalar value.
   * @param {number[]} x0 - An initial guess for the parameters as an array of numbers.
   * @param {Object} [parameters] - Optional parameters to control the optimization process.
   * @param {number} [parameters.maxIterations=x0.length * 200] - Maximum number of iterations to perform.
   * @param {number} [parameters.nonZeroDelta=1.05] - Scaling factor for non-zero initial steps in the simplex.
   * @param {number} [parameters.zeroDelta=0.001] - Initial step size for parameters that are initially zero.
   * @param {number} [parameters.minErrorDelta=1e-6] - Minimum change in function value to continue iterations.
   * @param {number} [parameters.minTolerance=1e-5] - Minimum change in parameters to continue iterations.
   * @param {number} [parameters.rho=1] - Reflection coefficient.
   * @param {number} [parameters.chi=2] - Expansion coefficient.
   * @param {number} [parameters.psi=-0.5] - Contraction coefficient.
   * @param {number} [parameters.sigma=0.5] - Reduction coefficient.
   * @param {Array<Object>} [parameters.history] - Optional array to store the history of simplex states for analysis.
   *
   * @returns {{ fx: number, x: number[] }} An object containing:
   *   - `fx`: The minimum function value found.
   *   - `x`: The parameters corresponding to the minimum function value.
   */
  fminsearch(...args) {
    return this.jsl.env.fmin.nelderMead(...args);
  }
  
  /**
   * Finds the minimum of a univariate function within a specified interval using a bracketing method.
   * @param {function} func - The function to minimize. Should accept a single number and return a number.
   * @param {number} a - The lower bound of the interval.
   * @param {number} b - The upper bound of the interval.
   * @param {number} [tol=1e-5] - The tolerance for convergence (optional).
   * @returns {{ fx: number, x: number[]}} An object containing:
   *   - `fx`: The minimum function value found.
   *   - `x`: The x-value where the function attains its minimum within [a, b].
   */
  fminbnd(func, a, b, tol = 1e-5) {
    const eps = 1e-10;  // A small value to prevent division by zero or to avoid precision issues.
    const golden_ratio = (3 - Math.sqrt(5)) / 2;

    let x = a + golden_ratio * (b - a);
    let w = x;
    let v = w;
    let fx = func(x);
    let fw = fx;
    let fv = fw;

    let d = 0;
    let e = 0;

    while(Math.abs(b - a) > tol) {
      const m = 0.5 * (a + b);
      const tol1 = tol * Math.abs(x) + eps;
      const tol2 = 2 * tol1;

      // Check for convergence
      if(Math.abs(x - m) <= tol2 - 0.5 * (b - a)) {
        break;
      }

      let u;
      let useGolden = true;

      // Try parabolic interpolation
      if(Math.abs(e) > tol1) {
        const r = (x - w) * (fx - fv);
        const q = (x - v) * (fx - fw);
        const p = (x - v) * q - (x - w) * r;
        const q2 = 2 * (q - r);
        const q2abs = Math.abs(q2);
        if(q2abs > eps) {
          u = x - p / q2;
          if(a + tol1 <= u && u <= b - tol1 && Math.abs(u - x) < 0.5 * Math.abs(e)) {
            useGolden = false;
          }
        }
      }

      // If parabolic interpolation is not used, fall back to golden section
      if(useGolden) {
        if(x < m) {
          u = x + golden_ratio * (b - x);
        } else {
          u = x - golden_ratio * (x - a);
        }
        e = d;
      } else {
        e = d;
      }

      const fu = func(u);

      // Update a, b, v, w, x
      if(fu <= fx) {
        if(u < x) b = x;
        else a = x;
        v = w; fv = fw;
        w = x; fw = fx;
        x = u; fx = fu;
      } else {
        if(u < x) a = u;
        else b = u;
        if(fu <= fw || w === x) {
          v = w; fv = fw;
          w = u; fw = fu;
        } else if(fu <= fv || v === x || v === w) {
          v = u; fv = fu;
        }
      }
    }

    return { x, fx };
  }
  
  /**
   * Creates an instance of PRDC_JSLAB_LIB_OPTIM_RCMIGA.
   * @param {Object} problem - The optimization problem definition.
   * @param {Object} opts - Configuration options for the algorithm.
   */
  rcmiga(...args) {
    return new PRDC_JSLAB_OPTIM_RCMIGA(...args);
  }

}

exports.PRDC_JSLAB_LIB_OPTIM = PRDC_JSLAB_LIB_OPTIM;