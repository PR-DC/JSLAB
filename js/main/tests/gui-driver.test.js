/**
 * @file Renderer test driver callback serialization checks
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_GUI_TEST_BROWSER } = require('../../dev/gui-test-browser');
var tests = new PRDC_JSLAB_TESTS();

tests.add('GUI driver serializes ordinary, async and method callbacks without changing their syntax', async function(assert) {
  const browser = new PRDC_JSLAB_GUI_TEST_BROWSER();
  browser.send = async (_method, payload) => ({ result: { value: await vm.runInNewContext(payload.expression) } });
  const fixture = {
    /**
     * Supplies an ordinary method-shaped callback.
     * @param {number} value Input value.
     * @returns {number} Input value.
     */
    method(value) {
      return value;
    },
    /**
     * Supplies an asynchronous method-shaped callback.
     * @param {number} value Input value.
     * @returns {Promise<number>} Input value.
     */
    async asyncMethod(value) {
      return value;
    }
  };
  assert.equal(await browser.evaluate(value => value + 1, 2), 3);
  assert.equal(await browser.evaluate(async(value) => value + 2, 3), 5);
  assert.equal(await browser.evaluate(async (value) => value + 3, 4), 7);
  assert.equal(await browser.evaluate(fixture.method, 11), 11);
  assert.equal(await browser.evaluate(fixture.asyncMethod, 13), 13);
  assert.equal(await browser.evaluate('17'), 17);
}, { tags: ['unit', 'gui-driver'] });

exports.MODULE_TESTS = tests;
