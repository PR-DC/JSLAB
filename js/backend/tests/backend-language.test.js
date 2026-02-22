/**
 * @file JSLAB backend language tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_BACKEND_LANGUAGE } = require('../backend-language');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('constructor loads language catalog and currentString returns known value', function(assert) {
  var lang = new PRDC_JSLAB_BACKEND_LANGUAGE({
    app_path: process.cwd(),
    lang: 'en'
  });

  var out = lang.currentString(87);
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 0);
}, { tags: ['unit', 'backend', 'language'] });

tests.add('formatLang substitutes placeholders and falls back to currentString', function(assert) {
  var lang = new PRDC_JSLAB_BACKEND_LANGUAGE({
    app_path: process.cwd(),
    lang: 'en'
  });

  lang.lang_strings = {
    1: { en: 'Hello {name} from {place}' }
  };

  assert.equal(lang.formatLang(1), 'Hello {name} from {place}');
  assert.equal(lang.formatLang(1, { name: 'A', place: 'B' }), 'Hello A from B');
  assert.equal(lang.currentString(99999), '');
}, { tags: ['unit', 'backend', 'language'] });

exports.MODULE_TESTS = tests;

