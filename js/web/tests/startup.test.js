/**
 * @file Real browser bootstrap and storage integration checks
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();
// These scenarios require their isolated GUI runner; ordinary module tests stay headless.
if(!globalThis.gui_browser) { exports.MODULE_TESTS = tests; return; }
tests.add('web loads WASM and Pyodide backends only when their APIs are used', async function(assert) {
  if(Array.isArray(globalThis.gui_hit_archive)) {
    gui_hit_archive.push(...await gui_browser.evaluate(function() {
      return globalThis.__JSLAB_GUI_HITS__ || [];
    }));
  }
  await gui_browser.navigate(gui_base);
  await gui_browser.waitFor(function() {
    return document.body.dataset.jslabWebReady == 'true' &&
      globalThis.jslab_web && globalThis.jslab_web.sandbox_api;
  }, 'fresh web shell for lazy backend checks');
  var initial = await gui_browser.evaluate(function() {
    var frame = jslab_web.sandbox_frame.contentWindow;
    return {
      native: typeof frame.PRDC_JSLAB_NATIVE_MODULE_FACTORY,
      alpha: typeof frame.PRDC_JSLAB_ALPHA_SHAPE_3D_FACTORY,
      requests: frame.performance.getEntriesByType('resource').map(function(entry) { return entry.name; }),
      parent_requests: performance.getEntriesByType('resource').map(function(entry) { return entry.name; })
    };
  });
  assert.equal(initial.native, 'undefined');
  assert.equal(initial.alpha, 'undefined');
  assert.equal(initial.requests.some(function(url) { return url.includes('sympy-0.26.2/'); }), false);
  assert.equal(initial.requests.some(function(url) { return url.includes('native_module.js'); }), false);
  assert.equal(initial.requests.some(function(url) { return url.includes('alpha_shape_3d.js'); }), false);
  assert.equal(initial.parent_requests.some(function(url) { return url.includes('/pdfkit-'); }), false);
  assert.equal(initial.parent_requests.some(function(url) { return url.includes('/MathJax-'); }), false);

  var optional = await gui_browser.evaluate(async function() {
    jslab_web._appendLatexMessage('x^2');
    var deadline = Date.now()+10000;
    while((!globalThis.MathJax || typeof globalThis.MathJax.typesetPromise != 'function') &&
        Date.now() < deadline) {
      await new Promise(function(resolve) { setTimeout(resolve, 20); });
    }
    var pdf = await jslab_web._svgToPdf(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><text x="2" y="12">ok</text></svg>',
      40, 20);
    return {
      mathjax: !!globalThis.MathJax && typeof globalThis.MathJax.typesetPromise == 'function',
      pdf_size: pdf && pdf.byteLength || 0,
      requests: performance.getEntriesByType('resource').map(function(entry) { return entry.name; })
    };
  });
  assert.equal(optional.mathjax, true);
  assert.ok(optional.pdf_size > 0);
  assert.equal(optional.requests.some(function(url) { return url.includes('/pdfkit-'); }), true);
  assert.equal(optional.requests.some(function(url) { return url.includes('/MathJax-'); }), true);

  var roots = await gui_browser.evaluate(async function() {
    return await jslab_web.sandbox_api.evaluate('roots([1, -3, 2])');
  });
  assert.equal(typeof roots.preview, 'string');
  var after_native = await gui_browser.evaluate(async function() {
    var native = await jslab_web.sandbox_api.evaluate(
      'typeof globalThis["PRDC_JSLAB_NATIVE_"+"MODULE_FACTORY"]');
    var alpha = await jslab_web.sandbox_api.evaluate(
      'typeof globalThis["PRDC_JSLAB_ALPHA_"+"SHAPE_3D_FACTORY"]');
    return [native.value, alpha.value];
  });
  assert.deepEqual(after_native, ['function', 'undefined']);

  await gui_browser.evaluate(async function() {
    return await jslab_web.sandbox_api.evaluate(
      'boundary3D([[0,0,0],[1,0,0],[0,1,0],[0,0,1]], 0.5)');
  });
  var after_alpha = await gui_browser.evaluate(async function() {
    return (await jslab_web.sandbox_api.evaluate(
      'typeof globalThis["PRDC_JSLAB_ALPHA_"+"SHAPE_3D_FACTORY"]')).value;
  });
  assert.equal(after_alpha, 'function');

  var symbolic = await gui_browser.evaluate(async function() {
    return await jslab_web.sandbox_api.evaluate('await sym.load(); sym.loaded');
  });
  assert.equal(symbolic.value, true);
  var cached = await gui_browser.evaluate(async function() {
    var names = await caches.keys();
    var library_cache = names.find(function(name) {
      return name.startsWith('jslab-web-versioned-libraries-v1:');
    });
    if(!library_cache) return [];
    var requests = await (await caches.open(library_cache)).keys();
    return requests.map(function(request) { return request.url; });
  });
  assert.equal(cached.some(function(url) { return url.includes('sympy-0.26.2/pyodide.js'); }), true);
  assert.equal(cached.some(function(url) { return url.includes('native_module.js'); }), true);
  assert.equal(cached.some(function(url) { return url.includes('alpha_shape_3d.js'); }), true);
}, { tags: ['gui', 'web', 'integration', 'lazy-assets'], timeout_ms: 120000 });

tests.add('web boots without Node integration and uses persistent browser storage', async function(assert) {
  var result = await gui_browser.evaluate(() => ({
    require: typeof require, node: !!(globalThis.process && globalThis.process.versions && globalThis.process.versions.node),
    ready: document.body.dataset.jslabWebReady, mode: jslab_web.fs.mode,
    sandbox: !!jslab_web.sandbox_api, version: jslab_web.getRuntimeInfo()
  }));
  assert.equal(result.require, 'undefined'); assert.equal(result.node, false);
  assert.equal(result.ready, 'true'); assert.equal(result.mode, 'opfs'); assert.equal(result.sandbox, true);
}, { tags: ['gui', 'web', 'integration'] });
exports.MODULE_TESTS = tests;
