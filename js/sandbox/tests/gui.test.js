/**
 * @file JSLAB GUI submodule tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_GUI } = require('../gui');
const { PRDC_JSLAB_TESTS } = require('../../shared/tester');
var tests = new PRDC_JSLAB_TESTS();

function createElement(initial_value, options) {
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

function createGuiHarness() {
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

tests.add('value helpers convert escaped or numeric values for element inputs', function(assert) {
  var gui = createGuiHarness();
  var element = createElement('42');
  assert.equal(gui.getElVal(element), 'ESC(42)');
  assert.equal(gui.getElValNum(element), 42);
}, { tags: ['unit', 'gui'] });

tests.add('input state helpers update, reset and validate values', function(assert) {
  var gui = createGuiHarness();
  var element = createElement('1');
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

  var invalid = createElement('abc');
  var out = gui.validateInputNumber(invalid);
  assert.equal(out[1], false);
  assert.equal(invalid.focused, true);
  assert.equal(invalid.classList.contains('error'), true);
}, { tags: ['unit', 'gui'] });

tests.add('delegate helper triggers handler only for matching targets', function(assert) {
  var gui = createGuiHarness();
  var called = 0;
  var listener = null;
  var doc = {
    addEventListener: function(type, fn) {
      if(type === 'input') {
        listener = fn;
      }
    }
  };

  gui._delegate(doc, 'input', '.match', function() { return true; }, function() {
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

exports.MODULE_TESTS = tests;
