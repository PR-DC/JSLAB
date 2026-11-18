/**
 * @file JSLAB GUI submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for gui test fixtures.
 */
class PRDC_JSLAB_SANDBOX_TESTS_GUI_TEST_HELPER {

  /**
   * Creates element.
   * @param {*} initial_value Initial value.
   * @param {Object} options Options.
   */
  static createElement(initial_value, options) {
    var opts = options || {};
    var attrs = {};
    var classes = new Set();
    return {
      nodeType: 1,
      value: initial_value,
      textContent: initial_value,
      ownerDocument: opts.ownerDocument || null,
      matches: function(selector) {
        if(selector === '[contenteditable]') {
          return !!opts.contenteditable;
        }
        return selector === opts.selector;
      },
      setAttribute: function(key, value) {
        attrs[key] = String(value);
      },
      getAttribute: function(key) {
        if(Object.prototype.hasOwnProperty.call(attrs, key)) {
          return attrs[key];
        }
        return null;
      },
      classList: {
        add: function(cls) {
          classes.add(cls);
        },
        remove: function(cls) {
          classes.delete(cls);
        },
        toggle: function(cls, state) {
          if(state) {
            classes.add(cls);
          } else {
            classes.delete(cls);
          }
        },
        contains: function(cls) {
          return classes.has(cls);
        }
      },
      focus: function() {
        this.focused = true;
      }
    };
  }

  /**
   * Creates gui harness.
   */
  static createGuiHarness() {
    var jsl = {
      inter: {
        format: {
          escapeHTML: function(value) {
            return 'ESC(' + value + ')';
          }
        }
      }
    };
    return new PRDC_JSLAB_LIB_GUI(jsl);
  }
}


const { PRDC_JSLAB_LIB_GUI } = require('../gui');
const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
var tests = new PRDC_JSLAB_TESTS();


tests.add('value helpers convert escaped or numeric values for element inputs', function(assert) {
  var gui = PRDC_JSLAB_SANDBOX_TESTS_GUI_TEST_HELPER.createGuiHarness();
  var element = PRDC_JSLAB_SANDBOX_TESTS_GUI_TEST_HELPER.createElement('42');
  assert.equal(gui.getElVal(element), 'ESC(42)');
  assert.equal(gui.getElValNum(element), 42);
}, { tags: ['unit', 'gui'] });

tests.add('input state helpers update, reset and validate values', function(assert) {
  var gui = PRDC_JSLAB_SANDBOX_TESTS_GUI_TEST_HELPER.createGuiHarness();
  var element = PRDC_JSLAB_SANDBOX_TESTS_GUI_TEST_HELPER.createElement('1');
  gui.addClassMs = function(node, cls) {
    node.classList.add(cls);
  };

  gui.setInputValue(element, 10);
  assert.equal(element.value, 10);
  assert.equal(element.getAttribute('set-val'), '10');

  gui.updateInputValue(element, 11);
  assert.equal(element.value, 11);
  element.value = 12;
  gui.showInputChanged(element);
  assert.equal(element.classList.contains('changed'), true);

  gui.resetInputValue(element);
  assert.equal(element.value, '11');

  var invalid = PRDC_JSLAB_SANDBOX_TESTS_GUI_TEST_HELPER.createElement('abc');
  var out = gui.validateInputNumber(invalid);
  assert.equal(out[1], false);
  assert.equal(invalid.focused, true);
  assert.equal(invalid.classList.contains('error'), true);
}, { tags: ['unit', 'gui'] });

tests.add('delegate helper triggers handler only for matching targets', function(assert) {
  var gui = PRDC_JSLAB_SANDBOX_TESTS_GUI_TEST_HELPER.createGuiHarness();
  var called = 0;
  var listener = null;
  var doc = {
    addEventListener: function(type, fn) {
      if(type === 'input') {
        listener = fn;
      }
    }
  };

  gui._delegate(doc, 'input', '.match', function() {
    return true;
  }, function() {
    called += 1;
  });

  listener({
    target: {
      matches: function(selector) {
        return selector === '.match';
      }
    }
  });
  listener({
    target: {
      matches: function() {
        return false;
      }
    }
  });

  assert.equal(called, 1);
}, { tags: ['unit', 'gui'] });

tests.add('Animation timers stop on interruption and can restart without leaking cleanup entries', function(assert) {
  var callback, cleared = [], ticks = 0, notified = 0, next_id = 0;
  var jsl = { cleanup_registry: [], inter: { execution: { wrap: value => value } },
    addForCleanup: function(obj, fun) { this.cleanup_registry.push({ obj: obj, fun: fun }); } };
  var gui = new PRDC_JSLAB_LIB_GUI(jsl, { setInterval: fun => { callback = fun; return ++next_id; },
    clearInterval: id => cleared.push(id) });
  var timer = gui._createAnimationTimer(() => { ticks++; }, 16, () => { notified++; });
  assert.equal(timer.start(), true);
  assert.equal(timer.start(), false);
  callback();
  assert.equal(ticks, 1);
  assert.equal(jsl.cleanup_registry.length, 1);
  var cleanup = jsl.cleanup_registry.splice(0)[0];
  cleanup.fun();
  assert.equal(timer.isRunning(), false);
  assert.equal(notified, 1);
  assert.equal(timer.start(), true);
  timer.stop();
  assert.equal(jsl.cleanup_registry.length, 0);
  timer.start();
  gui._stopAnimations();
  assert.equal(timer.isRunning(), false);
  assert.equal(notified, 2);
  assert.equal(jsl.cleanup_registry.length, 0);
  assert.deepEqual(cleared, [1, 2, 3]);
}, { tags: ['unit', 'gui', 'animation'] });

exports.MODULE_TESTS = tests;
