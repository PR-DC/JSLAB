/**
 * @file JSLAB control submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for control test fixtures.
 */
class PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER {

  /**
   * Handles linspace.
   * @param {*} start Start.
   * @param {*} end End.
   * @param {number} count Count.
   */
  static linspace(start, end, count) {
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

  /**
   * Creates control harness.
   * @param {*} [inter_overrides] Inter overrides.
   */
  static createControlHarness(inter_overrides = {}) {
    var inter = {
      lang: { currentString: id => require('../../../config/lang.json')[id].en },
      zeros: function(n) {
        return Array(Math.max(0, Number(n) || 0)).fill(0);
      },
      ones: function(n) {
        return Array(Math.max(0, Number(n) || 0)).fill(1);
      },
      fliplr: function(values) {
        return values.slice().reverse();
      },
      linspace: PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.linspace
    };
    Object.assign(inter, inter_overrides);

    var jsl = { inter: inter };
    var control = new PRDC_JSLAB_LIB_CONTROL(jsl);
    return { control, jsl };
  }
}


const { PRDC_JSLAB_LIB_CONTROL } = require('../control');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { createNativeModule } = require('../jslab-wasm-native');
const { PRDC_JSLAB_LIB_MATH } = require('../math');
const { PRDC_JSLAB_LIB_OPTIM } = require('../optim');
const { PRDC_JSLAB_LIB_ARRAY } = require('../array');
var tests = new PRDC_JSLAB_TESTS();


tests.add('tf and ss constructors return expected system records', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.createControlHarness();
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
  var harness = PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.createControlHarness();
  var sys = harness.control.tf2ss([1], [1, 3, 2]);

  assert.deepEqual(sys.A, [[0, 1], [-2, -3]]);
  assert.deepEqual(sys.B, [0, 1]);
  assert.deepEqual(sys.C, [1, 0]);
  assert.equal(sys.D, 0);
}, { tags: ['unit', 'control'] });

tests.add('lsim computes discrete and continuous responses with native WASM', async function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.createControlHarness();
  const factory = require('../../../build/wasm/native/native_module.js');
  harness.jsl.inter.env = { native_module: createNativeModule(await factory()) };
  var sys = { num: [2], den: [2, -1], Ts: 1 };
  var u = [1, 1, 1, 1];
  var t = [0, 1, 2, 3];
  var response = harness.control.lsim(sys, u, t, 1);

  assert.deepEqual(response.t, t);
  assert.deepEqual(response.y, [0, 1, 1.5, 1.75]);
  assert.deepEqual(sys.den, [2, -1]);
  const continuous = harness.control.lsim(harness.control.ss(-1, 1, 1, 0), u, t);
  continuous.y.forEach((value, i) => assert.ok(Math.abs(value - (1 - Math.exp(-t[i]))) < 1e-12));
  const discrete = harness.control.c2d(harness.control.ss(-1, 1, 1, 0), 1);
  assert.ok(Math.abs(discrete.A[0][0] - Math.exp(-1)) < 1e-12);
  assert.ok(Math.abs(discrete.B[0][0] - (1 - Math.exp(-1))) < 1e-12);
  let traces;
  harness.jsl.inter.figures = { plot: data => {
    traces = data;
    return { xlabel() {}, ylabel() {} };
  } };
  harness.control.stepplot(sys, 3);
  assert.deepEqual(traces[0].y, response.y);
}, { tags: ['unit', 'control'] });

tests.add('step builds default unit input/time vectors and delegates to lsim', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.createControlHarness();
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

tests.add('SLICOT interconnections and Eigen fitting use the same WASM backend', async function(assert) {
  const { control, jsl } = PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.createControlHarness();
  const factory = require('../../../build/wasm/native/native_module.js');
  jsl.inter.env = { native_module: createNativeModule(await factory()) };
  const plant = control.tf([1], [1, 2]);
  const time = Array.from({ length: 101 }, (_, i) => i / 20);
  const input = time.map(() => 1);
  const output = control.lsim(plant, input, time).y;
  const { sys, error } = control.tfest(time, input, output, 1, 0);
  assert.ok(error < 1e-12);
  assert.ok(Math.abs(sys.den[1] - 2) < 1e-6);
  assert.ok(Math.abs(sys.num[0] - 1) < 1e-6);
  jsl.inter.math = new PRDC_JSLAB_LIB_MATH(jsl);
  jsl.inter.array = new PRDC_JSLAB_LIB_ARRAY(jsl);
  jsl.inter.optim = new PRDC_JSLAB_LIB_OPTIM(jsl);
  const powell = control.tfest(time, input, output, 1, 0, 'Powell');
  assert.ok(powell.error < 1e-8);
  const cascade = control.ss2tf(control.series(plant, control.tf([1], [1, 3])));
  assert.deepEqual(cascade, { num: [0, 0, 1], den: [1, 5, 6] });
  assert.deepEqual(control.ss2tf(control.parallelConnect(plant, 2)), { num: [2, 5], den: [1, 2] });
  assert.deepEqual(control.ss2tf(control.feedback(plant)), { num: [0, 1], den: [1, 3] });
  assert.deepEqual(control.ss2tf(control.feedback(plant, 1, 1)), { num: [0, 1], den: [1, 1] });
  assert.deepEqual(control.feedback(2, 0.5).D, [[1]]);
  const input_gains = control.ss([], [], [], [[1], [2]]);
  const output_gains = control.ss([], [], [], [[1, 2], [3, 4]]);
  assert.deepEqual(control.series(input_gains, output_gains).D, [[5], [11]]);
  assert.throws(() => control.series(plant, control.tf([1], [1, -0.5], 1)), /sample times/);
}, { tags: ['unit', 'control'] });

tests.add('c2d delegates through tf2ss, _c2dZOH, and ss2tf in order', function(assert) {
  var harness = PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.createControlHarness();
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

tests.add('Bode and Nyquist share the native SISO frequency response', async function(assert) {
  const { control, jsl } = PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.createControlHarness();
  const factory = require('../../../build/wasm/native/native_module.js');
  jsl.inter.env = { native_module: createNativeModule(await factory()) };
  jsl.inter.figures = {
    _plotJson: spec => spec,
    plot: traces => ({ traces, xlabel() {}, ylabel() {}, axis() {} })
  };
  const plant = control.tf([1], [1, 1]);
  const { mag, phase } = control.bode(plant, [1]);
  assert.ok(Math.abs(mag[0] - Math.SQRT1_2) < 1e-14);
  assert.deepEqual(phase, [-45]);
  assert.deepEqual(control.nyquist(control.ss(-1, 1, 1, 0), 1), { w: [1], real: [0.5], imag: [-0.5] });
  assert.deepEqual(control.freqresp(control.tf([1], [1, 0], 1), 0), { w: [0], real: [1], imag: [0] });
  assert.equal(control.bode(plant).w.length, 301);
  const bodePlot = control.bodeplot(plant, [1, 10]);
  assert.equal(bodePlot.layout.xaxis.type, 'log');
  assert.equal(bodePlot.data[1].yaxis, 'y2');
  const nyquistPlot = control.nyquistplot(plant, [1]);
  assert.deepEqual(nyquistPlot.traces.slice(0, 2).map(trace => trace.y), [[-0.5], [0.5]]);
}, { tags: ['unit', 'control'] });

tests.add('basic analysis and responses handle continuous and discrete models', async function(assert) {
  const { control, jsl } = PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.createControlHarness();
  const factory = require('../../../build/wasm/native/native_module.js');
  jsl.inter.env = { native_module: createNativeModule(await factory()) };
  const plant = control.ss(-2, 1, 1, 0);
  const t = [0, 0.5, 1];
  assert.deepEqual(control.pzmap(plant), { poles: [-2], zeros: [] });
  assert.deepEqual(control.zero(control.tf([1, 3], [1, 4, 4])), [-3]);
  assert.equal(control.dcgain(plant), 0.5);
  assert.deepEqual(control.dcgain(control.ss(-2, [1, 2], [2, 4], 0)), [[1, 2], [2, 4]]);
  assert.ok(control.isstable(plant));
  assert.equal(control.isstable(control.tf([1], [1, -1], 0.5)), false);
  assert.deepEqual(control.impulse(plant, t), control.initial(plant, [1], t));
  assert.ok(Math.abs(control.initial(plant, [2], t).y[1] - 2 * Math.exp(-1)) < 1e-14);
  const discrete = control.ss(0.5, 1, 1, 1, 0.5);
  assert.equal(control.dcgain(discrete), 3);
  assert.deepEqual(control.ssdata(discrete), control.ss([[0.5]], [[1]], [[1]], [[1]], 0.5));
  assert.deepEqual(control.tfdata(discrete), control.tf([1, 0.5], [1, -0.5], 0.5));
  assert.deepEqual(control.impulse(discrete, t).y, [2, 2, 1]);
  jsl.inter.figures = { plot: traces => ({ traces, xlabel() {}, ylabel() {}, axis() {} }) };
  assert.equal(control.pzplot(discrete).traces[0].x.length, 129);
  const A = [[0, 1], [-2, -3]], B = [[0], [1]], C = [[1, 0]];
  const model = control.ss(A, B, C, 0);
  assert.deepEqual(control.ctrb(model), [[0, 1], [1, -3]]);
  assert.deepEqual(control.obsv(A, C), [[1, 0], [0, 1]]);
  assert.ok(control.isctrb(A, B));
  assert.ok(control.isobsv(model));
  const identity = [[1, 0], [0, 1]];
  assert.deepEqual(control.ctrb(A, identity), [[1, 0, 0, 1], [0, 1, -2, -3]]);
  assert.deepEqual(control.obsv(A, identity), [...identity, ...A]);
  const diagonal = [[-1, 0], [0, -2]];
  assert.equal(control.isctrb(diagonal, B), false);
  assert.equal(control.isobsv(diagonal, C), false);
}, { tags: ['unit', 'control'] });

tests.add('loop design computes margins, root locus, and PID coefficients', async function(assert) {
  const { control, jsl } = PRDC_JSLAB_SANDBOX_TESTS_CONTROL_TEST_HELPER.createControlHarness();
  const factory = require('../../../build/wasm/native/native_module.js');
  jsl.inter.env = { native_module: createNativeModule(await factory()) };
  const plant = control.tf([24], [1, 6, 11, 6]);
  const continuous = control.margin(plant), discrete = control.margin(control.c2d(plant, 0.3));
  assert.ok(Math.abs(continuous.gm - 2.5) < 1e-10);
  assert.ok(Math.abs(continuous.wcg - Math.sqrt(11)) < 1e-10);
  assert.ok(Math.abs(continuous.pm - 35.43) < 0.01);
  assert.ok(Math.abs(discrete.gm - 1.41) < 0.01);
  assert.ok(Math.abs(discrete.pm - 18.60) < 0.02);
  const absent = control.margin(control.tf([0.5], [1, 1]));
  assert.equal(absent.gm, Infinity);
  assert.equal(absent.pm, 180);
  assert.ok(Number.isNaN(absent.wcg) && Number.isNaN(absent.wcp));
  assert.deepEqual(control.pid(2, 3), control.tf([2, 3], [1, 0]));
  assert.deepEqual(control.pid(2, 3, 4, 0.25, 0.1), control.tf([4.5, 2.75, 3], [0.25, 1, 0], 0.1));
  const first_order = control.tf([1], [1, 2]);
  assert.deepEqual(control.rlocus(first_order, [2, 0, 1]), { k: [2, 0, 1], r: [[-4, -2, -3]] });
  jsl.inter.figures = { plot: traces => ({ traces, xlabel() {}, ylabel() {}, axis() {} }) };
  assert.deepEqual(control.rlocusplot(first_order, [0, 1]).traces[0].x, [-2, -3]);
  const A = [[0, 1], [-2, -3]], B = [[0], [1]];
  assert.deepEqual(control.place(A, B, [-2, -4]), [[6, 3]]);
  assert.deepEqual(control.place(A, B, [{ real: -1, imag: 1 }, { real: -1, imag: -1 }]), [[0, -1]]);
  assert.throws(() => control.place(A, B, [-1, { real: -1, imag: 1 }]), /conjugate/);
  const regulator = control.lqr(0, 1, 1, 1);
  assert.ok(Math.abs(regulator.K[0][0] - 1) < 1e-12);
  assert.ok(Math.abs(regulator.X[0][0] - 1) < 1e-12);
  assert.ok(Math.abs(regulator.poles[0] + 1) < 1e-12);
  const sampled = control.lqr(control.ss(0.5, 1, 1, 0, 0.2), 1, 1);
  assert.ok(sampled.poles[0] > 0 && sampled.poles[0] < 0.5);
}, { tags: ['unit', 'control'] });

exports.MODULE_TESTS = tests;
