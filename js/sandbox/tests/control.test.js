/**
 * @file JSLAB control submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_CONTROL } = require('../control');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function linspace(start, end, count) {
  if(count <= 1) {
    return [start];
  }
  var step = (end - start) / (count - 1);
  var out = [];
  for(var i = 0; i < count; i++) {
    out.push(start + i * step);
  }
  return out;
}

function createControlHarness(inter_overrides = {}) {
  var inter = {
    zeros: function(n) {
      return Array(Math.max(0, Number(n) || 0)).fill(0);
    },
    ones: function(n) {
      return Array(Math.max(0, Number(n) || 0)).fill(1);
    },
    fliplr: function(values) {
      return values.slice().reverse();
    },
    linspace: linspace
  };
  Object.assign(inter, inter_overrides);

  var jsl = { inter: inter };
  var control = new PRDC_JSLAB_LIB_CONTROL(jsl);
  return { control, jsl };
}

tests.add('tf and ss constructors return expected system records', function(assert) {
  var harness = createControlHarness();
  var tf = harness.control.tf([1, 2], [1, 3, 2], 0.1);
  var ss = harness.control.ss([[0, 1], [-2, -3]], [0, 1], [1, 0], 0, 0.1);

  assert.deepEqual(tf, { num: [1, 2], den: [1, 3, 2], Ts: 0.1 });
  assert.deepEqual(ss, {
    A: [[0, 1], [-2, -3]],
    B: [0, 1],
    C: [1, 0],
    D: 0,
    Ts: 0.1
  });
}, { tags: ['unit', 'control'] });

tests.add('tf2ss builds canonical companion-form state-space model', function(assert) {
  var harness = createControlHarness();
  var sys = harness.control.tf2ss([1], [1, 3, 2]);

  assert.deepEqual(sys.A, [[0, 1], [-2, -3]]);
  assert.deepEqual(sys.B, [0, 1]);
  assert.deepEqual(sys.C, [1, 0]);
  assert.equal(sys.D, 0);
}, { tags: ['unit', 'control'] });

tests.add('lsim computes difference-equation response with internal normalization', function(assert) {
  var harness = createControlHarness();
  var sys = { num: [1], den: [1, -0.5], Ts: 1 };
  var u = [1, 1, 1, 1];
  var t = [0, 1, 2, 3];
  var response = harness.control.lsim(sys, u, t, 1);

  assert.deepEqual(response.t, t);
  assert.deepEqual(response.y, [0, 1, 1.5, 1.75]);
}, { tags: ['unit', 'control'] });

tests.add('step builds default unit input/time vectors and delegates to lsim', function(assert) {
  var harness = createControlHarness();
  var captured = null;
  harness.control.lsim = function(sys, u, t, Ts) {
    captured = { sys: sys, u: u, t: t, Ts: Ts };
    return { y: [42], t: [0] };
  };

  var sys = { num: [1], den: [1, 1] };
  var out = harness.control.step(sys, 2.5);

  assert.deepEqual(out, { y: [42], t: [0] });
  assert.ok(captured !== null);
  assert.equal(captured.u.length, 101);
  assert.equal(captured.t.length, 101);
  assert.equal(captured.Ts, 0.025);
  assert.equal(captured.t[0], 0);
  assert.equal(captured.t[captured.t.length - 1], 2.5);
}, { tags: ['unit', 'control'] });

tests.add('c2d delegates through tf2ss, _c2dZOH, and ss2tf in order', function(assert) {
  var harness = createControlHarness();
  var calls = [];
  var sysc = { A: [[0]], B: [1], C: [1], D: 0 };
  var sysd = { A: [[1]], B: [1], C: [1], D: 0, Ts: 0.1 };

  harness.control.tf2ss = function(num, den) {
    calls.push(['tf2ss', num, den]);
    return sysc;
  };
  harness.control._c2dZOH = function(input_sys, Ts) {
    calls.push(['_c2dZOH', input_sys, Ts]);
    return sysd;
  };
  harness.control.ss2tf = function(input_sys) {
    calls.push(['ss2tf', input_sys]);
    return { num: [0.1, 0.2], den: [1, -0.9] };
  };

  var result = harness.control.c2d([1], [1, 1], 0.1);
  assert.deepEqual(result, { num: [0.1, 0.2], den: [1, -0.9] });
  assert.equal(calls.length, 3);
  assert.equal(calls[0][0], 'tf2ss');
  assert.equal(calls[1][0], '_c2dZOH');
  assert.equal(calls[2][0], 'ss2tf');
}, { tags: ['unit', 'control'] });

exports.MODULE_TESTS = tests;
