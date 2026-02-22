/**
 * @file JSLAB optim RCMIGA tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_OPTIM_RCMIGA } = require('../optim-rcmiga');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function elementWise(fn) {
  var arrays = Array.prototype.slice.call(arguments, 1);
  var length = arrays[0].length;
  var out = new Array(length);
  for(var i = 0; i < length; i++) {
    var args = arrays.map(function(arr) { return arr[i]; });
    out[i] = fn.apply(null, args);
  }
  return out;
}

function createAlgorithm(problem, opts, toc_value = 0) {
  var alg = Object.create(PRDC_JSLAB_OPTIM_RCMIGA.prototype);
  alg.problem = problem;
  alg.opts = opts;
  alg.constrained = !!problem.constrained;
  alg.stoped = 0;
  alg.state = {};
  alg.selection = {};
  alg.solution = {};
  alg.lang = {
    string: function(id) {
      return 'LANG_' + id;
    },
    currentString: function(id) {
      return 'LANG_' + id;
    }
  };
  alg.inter = {
    createFilledArray: function(n, value) {
      return Array(Math.max(0, n)).fill(value);
    },
    disp: function() {},
    elementWise: elementWise,
    min: function(values) {
      return Math.min.apply(Math, values);
    },
    max: function(values) {
      return Math.max.apply(Math, values);
    },
    toc: function() {
      return toc_value;
    },
    tic: 0
  };
  return alg;
}

tests.add('checkInputs initializes unbounded defaults and integer constraints', function(assert) {
  var problem = { nvars: 3 };
  var opts = { UseParallel: false };
  var alg = createAlgorithm(problem, opts);

  alg.checkInputs();
  assert.equal(alg.bounded, false);
  assert.deepEqual(problem.IntCon, []);
  assert.equal(opts.InitalUnboundedRange.length, 3);
  assert.deepEqual(opts.InitalUnboundedRange[0], [0, 1]);
}, { tags: ['unit', 'optim', 'rcmiga'] });

tests.add('checkInputs rejects invalid UseParallel option in non-vectorized mode', function(assert) {
  var problem = { nvars: 1 };
  var opts = { UseVectorized: false, UseParallel: 'invalid' };
  var alg = createAlgorithm(problem, opts);

  assert.throws(function() {
    alg.checkInputs();
  }, function(err) {
    return String(err.message).includes('LANG_273');
  });
}, { tags: ['unit', 'optim', 'rcmiga'] });

tests.add('checkBounds clamps population values between lower and upper bounds', function(assert) {
  var alg = createAlgorithm({ nvars: 3 }, {
    lbm: [0, 0, 0],
    ubm: [1, 1, 1]
  });
  alg.state.Population = [-2, 0.5, 5];

  alg.checkBounds();
  assert.deepEqual(alg.state.Population, [0, 0.5, 1]);
}, { tags: ['unit', 'optim', 'rcmiga'] });

tests.add('stoppingCriteria returns expected stop codes for generation, fitness and user stop', function(assert) {
  var common_opts = {
    MaxGenerations: 10,
    MaxTime: 1000,
    FitnessLimit: 0.1,
    MaxStallGenerations: 5,
    FunctionTolerance: 1e-6,
    MaxStallTime: 1000
  };

  var by_generation = createAlgorithm({ nvars: 1 }, Object.assign({}, common_opts), 0);
  by_generation.state = {
    Generation: 9,
    Best: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    Feasible: Array(10).fill(1),
    StallTime: 0,
    StallGenerations: 1,
    StartTime: 0
  };
  assert.equal(by_generation.stoppingCriteria(), 1);

  var by_fitness = createAlgorithm({ nvars: 1 }, Object.assign({}, common_opts), 0);
  by_fitness.state = {
    Generation: 2,
    Best: [1, 0.5, 0.05],
    Feasible: [1, 1, 1],
    StallTime: 0,
    StallGenerations: 1,
    StartTime: 0
  };
  assert.equal(by_fitness.stoppingCriteria(), 3);

  var by_user = createAlgorithm({ nvars: 1 }, Object.assign({}, common_opts), 0);
  by_user.stoped = 1;
  by_user.state = {
    Generation: 1,
    Best: [10, 9],
    Feasible: [1, 1],
    StallTime: 0,
    StallGenerations: 1,
    StartTime: 0
  };
  assert.equal(by_user.stoppingCriteria(), 7);
}, { tags: ['unit', 'optim', 'rcmiga'] });

tests.add('buttonCallback and outputFcn update state/dispatch correctly', function(assert) {
  var alg = createAlgorithm({ nvars: 1 }, { Display: 'iter' }, 0);
  var display_calls = 0;
  alg.displayOutput = function() {
    display_calls += 1;
  };

  alg.outputFcn();
  assert.equal(display_calls, 1);

  alg.opts.Display = 'off';
  alg.outputFcn();
  assert.equal(display_calls, 1);

  alg.buttonCallback();
  assert.equal(alg.stoped, 1);
}, { tags: ['unit', 'optim', 'rcmiga'] });

exports.MODULE_TESTS = tests;
