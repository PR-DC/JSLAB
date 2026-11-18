/**
 * @file JSLAB shared language tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Fixtures for shared renderer translation tests.
 */
class PRDC_JSLAB_LANGUAGE_TEST_HELPER {

  /**
   * Creates language harness.
   */
  static createLanguageHarness() {
    var logs = [];
    var lang = Object.create(PRDC_JSLAB_LANGUAGE.prototype);
    lang.s = {
      1: { en: 'Hello {name}', sr: 'Zdravo {name}' },
      2: { en: 'Only EN' }
    };
    lang.lang = 'en';
    lang.langs = ['en', 'sr'];
    lang._html_strings = true;
    lang._log = function(kind, message) {
      logs.push({ kind: kind, message: message });
    };
    return { lang: lang, logs: logs };
  }
}


const { PRDC_JSLAB_TESTS } = require('../tester');
var tests = new PRDC_JSLAB_TESTS();


const { PRDC_JSLAB_LANGUAGE } = require('../language');


tests.add('currentString and formatLang return expected localized values', function(assert) {
  var prev_config = global.config;
  try {
    global.config = { langs: ['en', 'sr'] };
    var harness = PRDC_JSLAB_LANGUAGE_TEST_HELPER.createLanguageHarness();
    var lang = harness.lang;

    assert.equal(lang.currentString(1), 'Hello {name}');
    assert.equal(lang.formatLang(1, { name: 'JSLAB' }), 'Hello JSLAB');
    assert.equal(lang.formatLang(1), 'Hello {name}');
  } finally {
    global.config = prev_config;
  }
}, { tags: ['unit', 'shared', 'language'] });

tests.add('currentString logs and returns empty text for missing ids/languages', function(assert) {
  var prev_config = global.config;
  try {
    global.config = { langs: ['en', 'sr'] };
    var harness = PRDC_JSLAB_LANGUAGE_TEST_HELPER.createLanguageHarness();
    var lang = harness.lang;

    assert.equal(lang.currentString(999), '');
    assert.ok(harness.logs.some(function(entry) {
      return entry.message.includes("unknown string id '999'");
    }));

    lang.lang = 'sr';
    assert.equal(lang.currentString(2), '');
    assert.ok(harness.logs.some(function(entry) {
      return entry.message.includes("missing language 'sr' for string id '2'");
    }));
  } finally {
    global.config = prev_config;
  }
}, { tags: ['unit', 'shared', 'language'] });

tests.add('string emits per-language tags and empty fallback for missing language text', function(assert) {
  var prev_config = global.config;
  try {
    global.config = { langs: ['en', 'sr'] };
    var harness = PRDC_JSLAB_LANGUAGE_TEST_HELPER.createLanguageHarness();
    var lang = harness.lang;
    var out = lang.string(2);

    assert.ok(out.includes('<lang class="en">Only EN</lang>'));
    assert.ok(out.includes('<lang class="sr"></lang>'));
    assert.ok(harness.logs.some(function(entry) {
      return entry.message.includes("missing language 'sr' for string id '2'");
    }));
  } finally {
    global.config = prev_config;
  }
}, { tags: ['unit', 'shared', 'language'] });

tests.add('process-host language selection persists and formats messages without a renderer document', function(assert) {
  const values = new Map();
  const language = new PRDC_JSLAB_LANGUAGE({ get: key => values.get(key), set: (key, value) => values.set(key, value) },
    { example: { en: 'Hello {name}', rs: 'Zdravo {name}' } }, { langs: ['en', 'rs'] });
  language.set('rs');
  assert.equal(values.get('lang_index'), 1);
  assert.equal(language.formatLang('example', { name: 'JSLAB' }), 'Zdravo JSLAB');
}, { tags: ['unit', 'language'] });


tests.add('window language preferences follow host changes without writing host settings', function(assert) {
  let selected = { lang_index: 0 };
  const language = PRDC_JSLAB_LANGUAGE.fromPreference(() => selected, { example: { en: 'Hello', rs: 'Zdravo' } });
  assert.equal(language.currentString('example'), 'Hello');
  selected = { lang_index: 1 };
  language.set('rs');
  assert.equal(language.currentString('example'), 'Zdravo');
  assert.equal(selected.lang_index, 1);
}, { tags: ['unit', 'language'] });

exports.MODULE_TESTS = tests;
