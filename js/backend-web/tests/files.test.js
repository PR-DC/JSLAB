/**
 * @file Browser file-service asset loading tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for asset loader test fixtures.
 */
class PRDC_JSLAB_WEB_TESTS_FILES_TEST_HELPER {

  /**
   * Creates loader.
   */
  static createLoader() {
    var scripts = [];
    var context = {
      exports: {},
      require: name => {
        if(name === '../other-shared/text') {
          return require('../../other-shared/text');
        }
        throw Error('Unexpected file-service dependency: ' + name);
      },
      URL: URL,
      Map: Map,
      Error: Error,
      location: { href: 'https://example.test/jslab/' },
      document: {
        baseURI: 'https://example.test/jslab/',
        createElement: function() {
          return { dataset: {} };
        },
        head: {
          appendChild: function(script) {
            scripts.push(script);
            Promise.resolve().then(function() {
              script.onload();
            });
          }
        }
      }
    };
    context.globalThis = context;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'files.js'), 'utf8'), context);
    return { loader: context.exports.PRDC_JSLAB_WEB_FILES, scripts: scripts, context: context };
  }
}


const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();


tests.add('lazy asset loader deduplicates concurrent script requests', async function(assert) {
  var harness = PRDC_JSLAB_WEB_TESTS_FILES_TEST_HELPER.createLoader();
  var first = harness.loader.loadScript('./lib/example-1.0/example.js');
  var second = harness.loader.loadScript('./lib/example-1.0/example.js');
  assert.equal(first, second);
  assert.equal(await first, 'https://example.test/jslab/lib/example-1.0/example.js');
  assert.equal(harness.scripts.length, 1);
}, { tags: ['unit', 'web', 'lazy-assets'] });

tests.add('lazy asset loader respects loaded predicates and dependency order', async function(assert) {
  var harness = PRDC_JSLAB_WEB_TESTS_FILES_TEST_HELPER.createLoader();
  harness.context.ready = true;
  await harness.loader.loadScript('./already.js', function() {
    return harness.context.ready;
  });
  assert.equal(harness.scripts.length, 0);
  await harness.loader.loadScripts(['./first.js', './second.js']);
  assert.deepEqual(harness.scripts.map(function(script) {
    return script.src;
  }), [
    'https://example.test/jslab/first.js',
    'https://example.test/jslab/second.js'
  ]);
}, { tags: ['unit', 'web', 'lazy-assets'] });

if(globalThis.gui_browser) {
  const { webTest } = require('./browser-test-utils');
  webTest(tests, 'web file assets report failures and allow failed requests to be retried', async function() {
    const Files = GUI.app.files.constructor;
    const source = new URL('./lib/missing-file-service-asset.js', document.baseURI).href;
    for(let attempt = 0; attempt < 2; attempt++) {
      let failure;
      try {
        await Files.loadScript(source);
      } catch(error) {
        failure = error;
      }
      GUI.ok(failure && failure.message.includes('Unable to load web asset'));
      GUI.eq(Files._asset_requests.has(source), false);
    }
  });
}

exports.MODULE_TESTS = tests;
