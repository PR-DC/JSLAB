/**
 * @file Browser reference transport and cleanup tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for remote ui test fixtures.
 */
class PRDC_JSLAB_WEB_TESTS_REMOTE_UI_HELPER {

  /**
   * Handles bridge.
   * @param {*} root Root.
   */
  static bridge(root) {
    let client;
    const host = new Host({ window: root }, message => queueMicrotask(() => client.message(message)));
    client = new Client(message => host.handle(message), new Int32Array(new SharedArrayBuffer(32)));
    return { host, client, root: client.root('window') };
  }
}

const { PRDC_JSLAB_TESTS } = require("../../other-shared/tester");
const { PRDC_JSLAB_REMOTE_UI_HOST: Host, PRDC_JSLAB_REMOTE_UI_CLIENT: Client, encodeLocal } = require("../remote-ui");
const tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;


tests.add('remote references preserve receivers identity constructors data cycles and large strings', assert => {
  const original = { value: 3, add(n) {
    return this.value + n;
  }, C: /**
 * Class for anonymous fixture.
 */
class { /**
 * Initializes the instance.
 * @param {*} n N.
 */
  constructor(n) {
    this.n = n;
  }
},
  text: '\u20ac'.repeat(40000), echo(value) {
    return value;
  } };
  original.self = original;
  const h = PRDC_JSLAB_WEB_TESTS_REMOTE_UI_HELPER.bridge(original);
  assert.equal(h.root.self, h.root);
  assert.equal(h.root.add(4), 7);
  h.root.value = 10;
  assert.equal(original.value, 10);
  assert.equal(new h.root.C(42).n, 42);
  assert.equal(h.root.text, original.text);
  assert.ok(Object.keys(h.root).includes('value'));
  assert.equal('value' in h.root, true);
  delete h.root.value;
  assert.equal('value' in h.root, false);
  const data = { bytes: new Float64Array([1, 2]), missing: undefined, n: NaN, big: 42n };
  data.self = data;
  const decoded = h.host.decode(encodeLocal(data, () => 'unused'));
  assert.equal(decoded.self, decoded);
  assert.equal(decoded.bytes[1], 2);
  assert.equal(decoded.big, 42n);
  assert.ok(Number.isNaN(decoded.n));
  assert.throws(() => encodeLocal(Symbol('private')), /well-known/);
  h.host.dispose();
  assert.throws(() => h.root.text, /closed/);
}, { tags: ['unit', 'web', 'debugger'] });

tests.add('remote callbacks promises errors and interruption release owned listeners only', async assert => {
  const events = new EventTarget();
  const h = PRDC_JSLAB_WEB_TESTS_REMOTE_UI_HELPER.bridge({ events, promised: Promise.resolve(42), rejected: Promise.reject(Error('promise failure')),
    fail() {
      throw Error('native failure');
    } });
  assert.equal(await h.root.promised, 42);
  await assert.rejects(h.root.rejected, /promise failure/);
  assert.throws(() => h.root.fail(), /native failure/);
  let calls = 0, host_calls = 0;
  events.addEventListener('test', () => host_calls++);
  const callback = () => calls++;
  h.root.events.addEventListener('test', callback);
  events.dispatchEvent(new Event('test'));
  await Promise.resolve();
  assert.equal(calls, 1);
  h.root.events.removeEventListener('test', callback);
  events.dispatchEvent(new Event('test'));
  await Promise.resolve();
  assert.equal(calls, 1);
  h.root.events.addEventListener('test', callback);
  h.client.clearListeners();
  events.dispatchEvent(new Event('test'));
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(host_calls, 3);
  assert.equal(h.client.callbacks.size, 0);
  const cancelled = new Client(() => {}, new Int32Array(new SharedArrayBuffer(32)));
  Atomics.store(cancelled.control, 0, 4);
  assert.throws(() => cancelled.root('window'), /interrupted/);
  h.host.dispose();
}, { tags: ['unit', 'web', 'debugger'] });

tests.add('Component listeners survive interruption while user callbacks are removed and dispose explicitly', async function(assert) {
  const events = new EventTarget();
  const h = PRDC_JSLAB_WEB_TESTS_REMOTE_UI_HELPER.bridge({ events });
  var component_calls = 0, user_calls = 0;
  h.root.events.addEventListener('test', () => user_calls++);
  const release = h.client.listenPersistent(h.root.events, 'test', () => component_calls++);
  h.client.clearListeners();
  events.dispatchEvent(new Event('test'));
  await Promise.resolve();
  assert.equal(user_calls, 0);
  assert.equal(component_calls, 1);
  assert.equal(h.client.component_callbacks.size, 1);
  release();
  events.dispatchEvent(new Event('test'));
  await Promise.resolve();
  assert.equal(component_calls, 1);
  assert.equal(h.client.component_callbacks.size, 0);
  assert.equal(h.host.listeners.length, 0);
  h.client.listenPersistent(h.root.events, 'test', () => component_calls++);
  h.host.dispose();
  events.dispatchEvent(new Event('test'));
  await Promise.resolve();
  assert.equal(component_calls, 1);
}, { tags: ['unit', 'web', 'animation'] });
