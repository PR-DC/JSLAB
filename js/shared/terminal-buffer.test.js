/**
 * @file JSLAB shared terminal buffer tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_TERMINAL_BUFFER } = require('./terminal-buffer');
const { PRDC_JSLAB_TESTS } = require('./tester');
var tests = new PRDC_JSLAB_TESTS();

tests.add('getEffectiveDomLimit enforces minimum and hard cap', function(assert) {
  var low = new PRDC_TERMINAL_BUFFER({
    get_max_messages: function() { return 2; },
    dom_messages_hard_cap: 100
  });
  assert.equal(low.getEffectiveDomLimit(), 5);

  var capped = new PRDC_TERMINAL_BUFFER({
    get_max_messages: function() { return 1000; },
    dom_messages_hard_cap: 120
  });
  assert.equal(capped.getEffectiveDomLimit(), 120);
}, { tags: ['unit', 'shared', 'terminal-buffer'] });

tests.add('addMessage merges consecutive messages when merge options allow it', function(assert) {
  var prev_performance = global.performance;
  try {
    var tick = 0;
    global.performance = {
      now: function() {
        tick += 1;
        return tick;
      }
    };
    var buffer = new PRDC_TERMINAL_BUFFER({
      get_timestamp: function() { return '00:00:00'; },
      is_autoscroll: function() { return false; }
    });

    buffer.addMessage('info', '<b>a</b>', 'a', {
      merge_messages: true,
      merge_interval_ms: 1000
    });
    buffer.addMessage('info', '<i>b</i>', 'b', {
      merge_messages: true,
      merge_interval_ms: 1000
    });

    assert.equal(buffer.log.length, 1);
    assert.equal(buffer.log[0].html, '<b>a</b><i>b</i>');
    assert.equal(buffer.log[0].data, 'ab');
  } finally {
    global.performance = prev_performance;
  }
}, { tags: ['unit', 'shared', 'terminal-buffer'] });

tests.add('clear resets log and rendered state counters', function(assert) {
  var buffer = new PRDC_TERMINAL_BUFFER({
    get_timestamp: function() { return '00:00:00'; }
  });
  buffer.addMessage('info', 'x', 'x');
  assert.equal(buffer.log.length, 1);
  assert.equal(buffer.render_window_end > 0, true);

  buffer.clear();
  assert.equal(buffer.log.length, 0);
  assert.equal(buffer.render_window_start, 0);
  assert.equal(buffer.render_window_end, 0);
  assert.equal(buffer.N_messages, 0);
}, { tags: ['unit', 'shared', 'terminal-buffer'] });

tests.add('destroy removes scroll listener when scroll container is provided', function(assert) {
  var add_calls = 0;
  var remove_calls = 0;
  var scroll_container = {
    addEventListener: function(name, cb) {
      if(name === 'scroll' && typeof cb === 'function') {
        add_calls += 1;
      }
    },
    removeEventListener: function(name, cb) {
      if(name === 'scroll' && typeof cb === 'function') {
        remove_calls += 1;
      }
    }
  };

  var buffer = new PRDC_TERMINAL_BUFFER({
    scroll_container: scroll_container
  });
  assert.equal(add_calls, 1);
  buffer.destroy();
  assert.equal(remove_calls, 1);
}, { tags: ['unit', 'shared', 'terminal-buffer'] });

exports.MODULE_TESTS = tests;
