/**
 * @file Real DOM GUI fixture checks
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
const { createFixture } = require('../../dev/gui-test-fixture');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.__JSLAB_GUI_COMPONENT__) { exports.MODULE_TESTS = tests; return; }
for(const type of ['main', 'editor']) {
  tests.add(type + ' GUI initializes with the real markup and controllers', async function(assert) {
    var fixture = await createFixture(type);
    try { assert.ok(fixture.controller); assert.deepEqual(fixture.errors, []); }
    finally { fixture.dispose(); }
  }, { tags: ['gui', type] });
}
exports.MODULE_TESTS = tests;
