/**
 * @file Shared presentation content policy tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { PRDC_JSLAB_PRESENTATION_CONTENT } = require('../presentation-content');
var tests = new PRDC_JSLAB_TESTS();

tests.add('presentation resource MIME types are shared by native and browser transports', function(assert) {
  assert.equal(PRDC_JSLAB_PRESENTATION_CONTENT.mimeType('slides/theme.CSS?version=1'),
    'text/css; charset=utf-8');
  assert.equal(PRDC_JSLAB_PRESENTATION_CONTENT.mimeType('figures/result.webp'), 'image/webp');
  assert.equal(PRDC_JSLAB_PRESENTATION_CONTENT.mimeType('runtime/module.wasm'), 'application/wasm');
  assert.equal(PRDC_JSLAB_PRESENTATION_CONTENT.mimeType('unknown.data'), 'application/octet-stream');
}, { tags: ['unit', 'windows', 'presentation'] });

exports.MODULE_TESTS = tests;
