/**
 * @file JSLAB shared language tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const { PRDC_JSLAB_TESTS } = require('./tester');
var tests = new PRDC_JSLAB_TESTS();

var test_appdata = path.join(process.cwd(), 'temp', 'test-appdata-shared-language');
fs.mkdirSync(path.join(test_appdata, 'electron-store-nodejs', 'Config'), { recursive: true });
process.env.APPDATA = test_appdata;

const { PRDC_JSLAB_LANGUAGE } = require('./language');

function createLanguageHarness() {
  var logs = [];
  var lang = Object.create(PRDC_JSLAB_LANGUAGE.prototype);
  lang.s = {
    1: { en: 'Hello {name}', sr: 'Zdravo {name}' },
    2: { en: 'Only EN' }
  };
  lang.lang = 'en';
  lang._log = function(kind, message) {
    logs.push({ kind: kind, message: message });
  };
  return { lang: lang, logs: logs };
}

tests.add('currentString and formatLang return expected localized values', function(assert) {
  var prev_config = global.config;
  try {
    global.config = { langs: ['en', 'sr'] };
    var harness = createLanguageHarness();
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
    var harness = createLanguageHarness();
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
    var harness = createLanguageHarness();
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

exports.MODULE_TESTS = tests;
