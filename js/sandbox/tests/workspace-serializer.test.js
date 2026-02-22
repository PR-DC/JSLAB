/**
 * @file JSLAB workspace serializer tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function getSerializer() {
  return jsl.basic.workspace_serializer;
}

tests.add('serializeObject creates valid payload format', function(assert) {
  var serializer = getSerializer();
  var payload = serializer.serializeObject({ a: 1 });
  assert.equal(serializer.isSerializedPayload(payload), true);
  assert.equal(payload.scope, 'object');
  assert.ok(typeof payload.created_at === 'string');
}, { tags: ['unit', 'serializer'] });

tests.add('deserializeObject roundtrip keeps basic structures', async function(assert) {
  var serializer = getSerializer();
  var source = {
    n: 42,
    s: 'abc',
    b: true,
    nil: null,
    arr: [1, 2, 3],
    when: new Date('2024-01-01T00:00:00.000Z'),
    map: new Map([['k', 7]]),
    set: new Set([1, 2]),
    typed: Uint8Array.from([1, 2, 3])
  };
  var payload = serializer.serializeObject(source);
  var out = await serializer.deserializeObject(payload);
  var value = out.value;
  assert.equal(value.n, 42);
  assert.equal(value.s, 'abc');
  assert.deepEqual(value.arr, [1, 2, 3]);
  assert.ok(value.when instanceof Date);
  assert.equal(value.when.toISOString(), '2024-01-01T00:00:00.000Z');
  assert.ok(value.map instanceof Map);
  assert.equal(value.map.get('k'), 7);
  assert.ok(value.set instanceof Set);
  assert.equal(value.set.has(2), true);
  assert.ok(value.typed instanceof Uint8Array);
  assert.deepEqual(Array.from(value.typed), [1, 2, 3]);
}, { tags: ['unit', 'serializer'], timeout_ms: 10000 });

tests.add('serializeObject preserves cyclic references', async function(assert) {
  var serializer = getSerializer();
  var source = { name: 'root' };
  source.self = source;
  source.child = { parent: source };

  var payload = serializer.serializeObject(source);
  var out = await serializer.deserializeObject(payload);
  assert.equal(out.value, out.value.self);
  assert.equal(out.value, out.value.child.parent);
}, { tags: ['unit', 'serializer'], timeout_ms: 10000 });

tests.add('deserializeWorkspace handles plain object payload fallback', async function(assert) {
  var serializer = getSerializer();
  var out = await serializer.deserializeWorkspace({ a: 1, b: 2 });
  assert.deepEqual(out.workspace, { a: 1, b: 2 });
  assert.deepEqual(out.warnings, []);
}, { tags: ['unit', 'serializer'] });

tests.add('serializeWorkspace and deserializeWorkspace roundtrip', async function(assert) {
  var serializer = getSerializer();
  var workspace = {
    alpha: 11,
    beta: [1, 2, 3],
    gamma: { x: true }
  };
  var payload = serializer.serializeWorkspace(workspace);
  var out = await serializer.deserializeWorkspace(payload);
  assert.deepEqual(out.workspace.alpha, 11);
  assert.deepEqual(out.workspace.beta, [1, 2, 3]);
  assert.deepEqual(out.workspace.gamma, { x: true });
}, { tags: ['unit', 'serializer'], timeout_ms: 10000 });

tests.add('deserializeObject returns input for non-serialized payload', async function(assert) {
  var serializer = getSerializer();
  var source = { x: 5 };
  var out = await serializer.deserializeObject(source);
  assert.equal(out.value, source);
}, { tags: ['unit', 'serializer'] });

exports.MODULE_TESTS = tests;
