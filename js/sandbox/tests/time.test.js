/**
 * @file JSLAB time submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_TIME } = require('../time');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createTimeHarness(millis_value = 1700000000000) {
  var format_calls = [];

  var jsl = {
    context: {},
    inter: {
      luxon: {
        DateTime: {
          now: function() {
            return {
              zone: '',
              setZone: function(zone) {
                this.zone = zone;
                return this;
              },
              toMillis: function() {
                return millis_value;
              },
              toFormat: function(format) {
                format_calls.push({ zone: this.zone, format: format });
                return this.zone + '|' + format;
              }
            };
          }
        }
      }
    }
  };

  // tic getter executes with jsl.context as this, so attach jsl for method access.
  jsl.context.jsl = jsl;

  var time = new PRDC_JSLAB_LIB_TIME(jsl);
  return { time, jsl, format_calls };
}

tests.add('tic getter stores last_tic on context', function(assert) {
  var harness = createTimeHarness();
  var tic_value = harness.jsl.context.tic;

  assert.ok(typeof tic_value === 'number');
  assert.equal(harness.jsl.context.last_tic, tic_value);
}, { tags: ['unit', 'time'] });

tests.add('toc and tocms return non-negative elapsed durations', function(assert) {
  var harness = createTimeHarness();
  var start = harness.jsl.context.tic;
  var elapsed_s = harness.time.toc(start);
  var elapsed_ms = harness.time.tocms(start);

  assert.ok(elapsed_s >= 0);
  assert.ok(elapsed_ms >= 0);
}, { tags: ['unit', 'time'] });

tests.add('timezone-aware date/time formatting delegates expected format strings', function(assert) {
  var harness = createTimeHarness();
  harness.time.setTimezone('UTC');

  assert.equal(harness.time.getTime(), 'UTC|HH:mm:ss');
  assert.equal(harness.time.getFullTime(), 'UTC|HH:mm:ss.SSS');
  assert.equal(harness.time.getDate(), 'UTC|dd.MM.yyyy.');
  assert.equal(harness.time.getDateTime(), 'UTC|dd.MM.yyyy. HH:mm:ss');
  assert.equal(harness.time.getDateTimeFull(), 'UTC|dd.MM.yyyy. HH:mm:ss.SSS');
  assert.equal(harness.time.getDateTimeStr(), 'UTC|ddMMyyyy_HHmmss');
}, { tags: ['unit', 'time'] });

tests.add('getTimestamp uses configured timezone and returns milliseconds', function(assert) {
  var harness = createTimeHarness(123456789);
  harness.time.setTimezone('Europe/Belgrade');
  var ts = harness.time.getTimestamp();

  assert.equal(ts, 123456789);
}, { tags: ['unit', 'time'] });

exports.MODULE_TESTS = tests;
