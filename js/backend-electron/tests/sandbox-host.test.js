/**
 * @file Isolated task ownership and validation tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { EventEmitter } = require('events');
const { PRDC_JSLAB_ELECTRON_SANDBOX_HOST } = require('../sandbox-host');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const tests = new PRDC_JSLAB_TESTS();
exports.MODULE_TESTS = tests;

tests.add('isolated native job validation prevents invalid identities sources and excess processes', async assert => {
  const tasks = new PRDC_JSLAB_ELECTRON_SANDBOX_HOST();
  const owner = Object.assign(new EventEmitter(), { id: 1 });
  const valid = { id: 'valid-task', source: '() => 42', args: [] };
  await assert.rejects(tasks.runTask(owner, { ...valid, id: '../another' }), /identity/);
  await assert.rejects(tasks.runTask(owner, { ...valid, source: 'x'.repeat(512001) }), /source/);
  await assert.rejects(tasks.runTask(owner, { ...valid, args: {} }), /arguments/);
  tasks.jobs.set('valid-task', {});
  await assert.rejects(tasks.runTask(owner, valid), /identity/);
  for(let i = 0; i < 4; i++) {
    tasks.jobs.set('occupied-' + i, {});
  }
  await assert.rejects(tasks.runTask(owner, { ...valid, id: 'next-task' }), /four/);
}, { tags: ['unit', 'native'] });

tests.add('native task cancellation respects ownership and coalesces requests', async assert => {
  const tasks = new PRDC_JSLAB_ELECTRON_SANDBOX_HOST();
  const first = { owner: 1, session: {}, cancelled: false };
  const other = { owner: 2, session: {}, cancelled: false };
  tasks.jobs.set('first', first);
  tasks.jobs.set('other', other);
  assert.equal((await tasks.cancelTask(2, 'first')).stopped, false);
  assert.equal(first.cancelled, false);
  assert.equal((await tasks.cancelTask(1, 'missing')).stopped, false);
  await tasks.cancelOwnerTasks(1);
  assert.equal(first.cancelled, true);
  assert.equal(other.cancelled, false);
  assert.equal((await tasks.cancelTask(1, 'first')).stopped, true);
}, { tags: ['unit', 'native'] });
