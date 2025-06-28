/**
 * @file JSLAB library gui submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB gui submodule.
 */
class PRDC_JSLAB_LIB_GUI {
  
  /**
   * Initializes the gui submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    
    this.escape_html_map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
  }
  
  /**
   * Escapes reserved HTML characters in a string to prevent injection or XSS.
   * @param {string} string The raw text whose special characters should be converted to HTML entities.
   * @returns {string} The sanitized string safe for insertion into the DOM.
   */
  escapeHTML(string) {
    return String(string).replace(/[&<>"'`=\/]/g, s => this.escape_html_map[s]);
  }
  
  /**
   * Reports whether an element participates in layout flow (i.e., is not `display:none`).
   * @param {HTMLElement|null} el The element to test for visibility in normal document flow.
   * @returns {boolean} `true` if the element has a non-null `offsetParent`; otherwise `false`.
   */
  isVisible(el) {
    return !!el && el.offsetParent !== null;
  }

  /**
   * Reads an input-like element’s value, escapes it for HTML, and returns the result.
   * @param {string|HTMLElement} el_or_sel The element itself or a selector/ID string used to locate it.
   * @returns {string} The escaped string value, or an empty string if the element is not found.
   */
  getElVal(el_or_sel) {
    return this.escapeHTML(this._readVal(this._resolveEl(el_or_sel)));
  }
  
  /**
   * Reads an input-like element’s value, converts it to a number, and returns the result.
   * @param {string|HTMLElement} el_or_sel The element itself or a selector/ID string used to locate it.
   * @returns {number} The numeric value or `NaN` if conversion fails.
   */
  getElValNum(el_or_sel) {
    return Number(this._readVal(this._resolveEl(el_or_sel)));
  }

  /**
   * Attaches `input` and `change` listeners to a slider and forwards events to a callback.
   * @param {string|HTMLElement} el The slider element or a selector for delegated listening.
   * @param {Function} fun The function to invoke each time the slider emits `input` or `change`.
   */
  onSliderInput(el, fun) {
    var handler = function (e) { fun.call(this, e); };

    if(typeof el === 'string') {
      var doc = this._resolveDoc(el);
      this._delegate(doc, 'input', el, () => true, handler);
      this._delegate(doc, 'change', el, () => true, handler);
    } else {
      var n = el;
      n.addEventListener('input', handler);
      n.addEventListener('change', handler);
    }
  }
  
  /**
   * Fires a callback when an input loses focus or the user presses Enter, with optional delegation.
   * @param {string|HTMLElement} el Target element or CSS selector for delegation.
   * @param {Function} fun Callback executed with `this` bound to the element that triggered the event.
   * @param {Function} [validator] Optional predicate that must return `true` for the callback to fire.
   */
  onInput(el, fun, validator) {
    if(typeof el === 'string') {
      var doc = this._resolveDoc(el);
      this._delegate(doc, 'focusout', el, () => true, fun, true);
      this._delegate(doc, 'keyup', el, e => e.keyCode === this._ENTER, fun);
    } else {
      var nodes = this._resolveEls(el);
      nodes.forEach(n => {
        n.addEventListener('blur', e => fun.call(n, e));
        n.addEventListener('keyup', e => {
          if(e.keyCode === this._ENTER) fun.call(n, e);
        });
      });
    }
  }

  /**
   * Detects actual value changes in an input and invokes a callback after validation.
   * @param {string|HTMLElement} el Target element or selector for delegated listening.
   * @param {Function} fun Callback executed when the value truly changes.
   * @param {Function} [validator] Optional predicate to approve or reject the change.
   */
  onInputChange(el, fun, validator) {
    var initLastVal = n =>
      n.setAttribute('last-val', this.escapeHTML(this._readVal(n)));

    var hasChanged = n =>
      this.escapeHTML(this._readVal(n)) !== n.getAttribute('last-val');

    var maybeFire = (n, e) => {
      if(!hasChanged(n)) return;

      if(typeof validator === 'function' && !validator.call(this, n, e)) {
        n.value = n.getAttribute('last-val');
        n.focus();
        this.addClassMs(n, 'error', 400); 
        return;
      }

      initLastVal(n);
      fun.call(n, e); 
    };

    this._resolveEls(el).forEach(initLastVal);

    if(typeof el === 'string') {
      var always = () => true;
      var doc = this._resolveDoc(el);
      this._delegate(doc, 'focusout', el, always, e => maybeFire(e.target, e), true);
      this._delegate(doc, 'keyup', el, e => e.keyCode === this._ENTER, e => maybeFire(e.target, e));
      this._delegate(doc, 'change', el, always, e => maybeFire(e.target, e));
    } else {
      var n = el;
      ['blur', 'change'].forEach(t => n.addEventListener(t, e => maybeFire(n, e)));
      n.addEventListener('keyup', e => {
        if(e.keyCode === this._ENTER) maybeFire(n, e);
      });
    }
  }

  /**
   * Like `onInputChange` but triggers only while the element remains focused (active input).
   * @param {string|HTMLElement} el Target element or selector for delegated listening.
   * @param {Function} fun Callback executed when the value changes during active editing.
   * @param {Function} [validator] Optional predicate to approve or reject the change.
   */
  onActiveInputChange(el, fun, validator) {
    var initLastVal = n =>
      n.setAttribute('last-val', this.escapeHTML(this._readVal(n)));

    var maybeFire = (n, e) => {
      if(!hasChanged(n)) return;

      if(typeof validator === 'function' && !validator.call(this, n, e)) {
        n.value = n.getAttribute('last-val');
        n.focus();
        this.addClassMs(n, 'error', 400); 
        return;
      }

      initLastVal(n);
      fun.call(n, e); 
    };

    this._resolveEls(el).forEach(initLastVal);

    if(typeof el === 'string') {
      var doc = this._resolveDoc(el);
      this._delegate(doc, 'focusout', el, () => true, e => maybeFire(e.target, e), true);
      this._delegate(doc, 'keyup', el, e => e.keyCode === this._ENTER, e => maybeFire(e.target, e));
    } else {
      var n = el;
      n.addEventListener('blur', e => maybeFire(n, e));
      n.addEventListener('keyup', e => {
        if(e.keyCode === this._ENTER) maybeFire(n, e);
      });
    }
  }
  
  /**
   * Programmatically sets an input’s value and records it as the baseline for change tracking.
   * @param {string|HTMLElement} el_or_sel The input element or selector identifying it.
   * @param {string|number} val The value to assign and remember as the “set” value.
   */
  setInputValue(el_or_sel, val) {
    var n = this._resolveEl(el_or_sel);
    if(!n) return;
    n.value = val;
    n.setAttribute('last-val', String(val));
    n.setAttribute('set-val',  String(val));
  }

  /**
   * Updates an input’s value only if it is different from the current content, and records it.
   * @param {string|HTMLElement} el_or_sel The input element or selector identifying it.
   * @param {string|number} val The new value to write and store as the baseline.
   */
  updateInputValue(el_or_sel, val) {
    var n = this._resolveEl(el_or_sel);
    if(!n) return;
    if(n.value != val) {
      n.value = val;
      n.setAttribute('last-val', String(val));
      n.setAttribute('set-val',  String(val));
    }
  }
  
  /**
   * Restores an input to the value previously stored with `setInputValue`.
   * @param {string|HTMLElement} el_or_sel The input element or selector identifying it.
   */
  resetInputValue(el_or_sel) {
    var n = this._resolveEl(el_or_sel);
    if(!n) return;
    var v = n.getAttribute('set-val');
    if(v !== null) n.value = v;
  }

  /**
   * Adds or removes the `changed` CSS class based on whether the current value differs from the stored baseline.
   * @param {string|HTMLElement} el_or_sel The input element or selector identifying it.
   */
  showInputChanged(el_or_sel) {
    var n = this._resolveEl(el_or_sel);
    if(!n) return;
    var set_val = n.getAttribute('set-val') ?? '';
    n.classList.toggle('changed', String(n.value) !== set_val);
  }

  /**
   * Validates that an input contains a numeric value and briefly highlights errors.
   * @param {string|HTMLElement} el_or_sel The input element or selector identifying it.
   * @returns {Array} Tuple of the parsed number and a validity flag.
   */
  validateInputNumber(el_or_sel) {
    var n = this._resolveEl(el_or_sel);
    if(!n) return [NaN, false];
    var str = this._readVal(n).trim();
    var num = Number(str);
    if(str === '' || Number.isNaN(num)) {
      n.focus();
      this.addClassMs(n, 'error', 400);
      return [num, false];
    }
    return [num, true];
  }
  
  /**
   * Sets an input’s value and temporarily applies a `warning` class for visual feedback.
   * @param {string|HTMLElement} el_or_sel The input element or selector identifying it.
   * @param {string|number} val The value to assign before flashing the warning.
   */
  setInputWithWarning(el_or_sel, val) {
    var n = this._resolveEl(el_or_sel);
    if(!n) return;
    n.value = val;
    this.addClassMs(n, 'warning', 400);
  }

  /**
   * Adds a CSS class to an element for a specified duration, then removes it.
   * @param {HTMLElement} node The element to which the class will be applied.
   * @param {string} cls The CSS class name to toggle.
   * @param {number} ms The number of milliseconds to keep the class before removal.
   */
  addClassMs(node, cls, ms) {
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), ms);
  }

  /**
   * Observes an element’s size changes and reports each new `contentRect` to a callback.
   * @param {string|HTMLElement} el_or_sel The element or selector to observe.
   * @param {Function} cb Callback that receives the `ResizeObserverEntry.contentRect` whenever the element resizes.
   * @returns {ResizeObserver|undefined} The observer instance, or `undefined` if the element is not found.
   */
  onResize(el_or_sel, cb) {
    var el = this._resolveEl(el_or_sel);
    if(!el) return;
    var ro = new ResizeObserver(ent => cb(ent[0].contentRect));
    ro.observe(el);
    return ro;
  }

  /**
   * Converts various inputs into an array of HTMLElements.
   * @param {string|HTMLElement|NodeList|Iterable<HTMLElement>} el_or_sel Element, selector, or collection to resolve.
   * @returns {HTMLElement[]} An array of resolved elements (possibly empty).
   */
  _resolveEls(el_or_sel) {
    if(!el_or_sel) return [];
    if(typeof el_or_sel === 'string') {
      return Array.from(document.querySelectorAll(el_or_sel));
    }
    if(el_or_sel.nodeType === 1) {
      return [el_or_sel];
    }
    if(typeof el_or_sel[Symbol.iterator] === 'function') {
      return Array.from(el_or_sel).filter(n => n?.nodeType === 1);
    }
    return [];
  }

  /**
   * Resolves and returns the first HTMLElement that matches the input reference.
   * @param {string|HTMLElement} el_or_sel Element or selector used to locate one element.
   * @returns {HTMLElement|null} The matched element or `null` if none found.
   */
  _resolveEl(el_or_sel) {
    return this._resolveEls(el_or_sel)[0] ?? null;
  }
  
  /**
   * Retrieves the textual value from an input-type or content-editable element.
   * @param {HTMLElement} el The element whose value or text content should be read.
   * @returns {string} The raw string content of the element.
   */
  _readVal(el) {
    return el.matches('[contenteditable]') ? el.textContent : el.value;
  }
  
  /**
   * Determines the appropriate `Document` context for a given element or selector.
   * @param {string|Node} el_or_sel Element, node list, or selector used to infer a document.
   * @returns {Document} The resolved document object.
   */
  _resolveDoc(el_or_sel) {
    if(typeof el_or_sel !== 'string' && el_or_sel?.ownerDocument)
      return el_or_sel.ownerDocument;
    return document;
  }

  /**
   * Registers a delegated event listener that triggers a handler when the target matches a selector and passes an optional filter.
   * @param {Document|ShadowRoot} doc The root node on which to listen for the event.
   * @param {string} type The event type to listen for (e.g., `"keyup"`).
   * @param {string} selector The CSS selector that qualifying targets must match.
   * @param {Function} filter Predicate that further filters qualifying events.
   * @param {Function} handler Function executed with `this` bound to the event target.
   * @param {boolean} [useCapture=false] Whether to attach the listener in the capture phase.
   */
  _delegate(doc, type, selector, filter, handler, useCapture = false) {
    doc.addEventListener(
      type,
      e => {
        const t = e.target;
        if(t && t.matches(selector) && filter(e)) handler.call(t, e);
      },
      useCapture
    );
  }
}

exports.PRDC_JSLAB_LIB_GUI = PRDC_JSLAB_LIB_GUI;