/**
 * @file JSLAB optim submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_OPTIM } = require('../optim');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createOptimHarness() {
  var calls = [];
  var fmin = {
    nelderMead: function() {
      calls.push(['nelderMead', Array.from(arguments)]);
      return { method: 'nelderMead', args: Array.from(arguments) };
    },
    conjugateGradient: function() {
      calls.push(['conjugateGradient', Array.from(arguments)]);
      return { method: 'conjugateGradient', args: Array.from(arguments) };
    },
    gradientDescent: function() {
      calls.push(['gradientDescent', Array.from(arguments)]);
      return { method: 'gradientDescent', args: Array.from(arguments) };
    },
    gradientDescentLineSearch: function() {
      calls.push(['gradientDescentLineSearch', Array.from(arguments)]);
      return { method: 'gradientDescentLineSearch', args: Array.from(arguments) };
    },
    bisect: function() {
      calls.push(['bisect', Array.from(arguments)]);
      return { method: 'bisect', args: Array.from(arguments) };
    }
  };

  var jsl = {
    inter: {
      array: {
        shuffleIndices: function(arr) {
          return arr.map(function(_value, i) { return i; });
        }
      },
      env: {
        fmin: fmin,
        disp: function() {}
      }
    }
  };

  var optim = new PRDC_JSLAB_LIB_OPTIM(jsl);
  return { optim, calls };
}

tests.add('optimPowell reduces value of a smooth convex objective', function(assert) {
  var harness = createOptimHarness();
  var objective = function(x) {
    return Math.pow(x[0] - 3, 2) + Math.pow(x[1] + 2, 2);
  };

  var start = [0, 0];
  var start_value = objective(start);
  var result = harness.optim.optimPowell(objective, start, {
    eps: 1e-8,
    alpha: 0.1,
    stepSize: 1e-4,
    maxIterations: 200
  });

  assert.ok(isFinite(result.fx));
  assert.ok(result.fx < start_value);
  assert.ok(Math.abs(result.x[0] - 3) < 0.25);
  assert.ok(Math.abs(result.x[1] + 2) < 0.25);
}, { tags: ['unit', 'optim'] });

tests.add('fminbnd locates minimum in 1D interval', function(assert) {
  var harness = createOptimHarness();
  var result = harness.optim.fminbnd(function(x) {
    return Math.pow(x - 2, 2) + 1;
  }, -4, 6, 1e-6);

  assert.approx(result.x, 2, 1e-3);
  assert.approx(result.fx, 1, 1e-6);
}, { tags: ['unit', 'optim'] });

tests.add('fmin wrappers forward to underlying fmin implementations', function(assert) {
  var harness = createOptimHarness();
  var sample_fn = function() { return 0; };
  var sample_x = [1, 2];

  assert.equal(harness.optim.optimNelderMead(sample_fn, sample_x).method, 'nelderMead');
  assert.equal(harness.optim.optimConjugateGradient(sample_fn, sample_x).method, 'conjugateGradient');
  assert.equal(harness.optim.optimGradientDescent(sample_fn, sample_x).method, 'gradientDescent');
  assert.equal(
    harness.optim.optimGradientDescentLineSearch(sample_fn, sample_x).method,
    'gradientDescentLineSearch'
  );
  assert.equal(harness.optim.optimBisect(sample_fn, -1, 1).method, 'bisect');
  assert.equal(harness.optim.fminsearch(sample_fn, sample_x).method, 'nelderMead');

  assert.ok(harness.calls.length >= 6);
}, { tags: ['unit', 'optim'] });

exports.MODULE_TESTS = tests;
