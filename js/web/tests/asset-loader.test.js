/**
 * @file Browser asset loader unit tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createLoader() {
  var scripts = [];
  var context = {
    exports: {},
    URL: URL,
    Map: Map,
    Error: Error,
    location: { href: 'https://example.test/jslab/' },
    document: {
      baseURI: 'https://example.test/jslab/',
      createElement: function() { return { dataset: {} }; },
      head: {
        appendChild: function(script) {
          scripts.push(script);
          Promise.resolve().then(function() { script.onload(); });
        }
      }
    }
  };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'asset-loader.js'), 'utf8'), context);
  return { loader: context.exports, scripts: scripts, context: context };
}

tests.add('lazy asset loader deduplicates concurrent script requests', async function(assert) {
  var harness = createLoader();
  var first = harness.loader.loadScript('./lib/example-1.0/example.js');
  var second = harness.loader.loadScript('./lib/example-1.0/example.js');
  assert.equal(first, second);
  assert.equal(await first, 'https://example.test/jslab/lib/example-1.0/example.js');
  assert.equal(harness.scripts.length, 1);
}, { tags: ['unit', 'web', 'lazy-assets'] });

tests.add('lazy asset loader respects loaded predicates and dependency order', async function(assert) {
  var harness = createLoader();
  harness.context.ready = true;
  await harness.loader.loadScript('./already.js', function() { return harness.context.ready; });
  assert.equal(harness.scripts.length, 0);
  await harness.loader.loadScripts(['./first.js', './second.js']);
  assert.deepEqual(harness.scripts.map(function(script) { return script.src; }), [
    'https://example.test/jslab/first.js',
    'https://example.test/jslab/second.js'
  ]);
}, { tags: ['unit', 'web', 'lazy-assets'] });

exports.MODULE_TESTS = tests;
