/**
 * @file JSLAB shared editor symbol picker
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const SYMBOL_GROUPS = [
  {
    title_sid: 365,
    fallback_title: 'Math',
    symbols: ['+', '-', '×', '÷', '±', '≈', '≠', '<', '>', '≤', '≥', '∞', '√', '∛', '∜', '∑', '∏', '∫', '∂', '∇', '∝', '°', '′', '″']
  },
  {
    title_sid: 366,
    fallback_title: 'Greek Lower',
    symbols: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω']
  },
  {
    title_sid: 367,
    fallback_title: 'Greek Upper',
    symbols: ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ', 'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω']
  },
  {
    title_sid: 368,
    fallback_title: 'Logic / Sets',
    symbols: ['∀', '∃', '¬', '∧', '∨', '⊕', '∈', '∉', '∋', '∩', '∪', '⊂', '⊃', '⊆', '⊇', '⊄', '⊈', '⊊', '⊋', '∅']
  },
  {
    title_sid: 369,
    fallback_title: 'Arrows',
    symbols: ['←', '↑', '→', '↓', '↔', '↕', '↖', '↗', '↘', '↙', '⇒', '⇐', '⇔', '⇑', '⇓', '⟵', '⟶', '↦']
  },
  {
    title_sid: 370,
    fallback_title: 'Superscript',
    symbols: ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁺', '⁻', '⁼', '⁽', '⁾']
  },
  {
    title_sid: 371,
    fallback_title: 'Subscript',
    symbols: ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', '₊', '₋', '₌', '₍', '₎']
  },
  {
    title_sid: 372,
    fallback_title: 'Other',
    symbols: ['∠', '⊥', '∥', '∴', '∵', '…', '·', '∘', '⊗', '⊙', '⌈', '⌉', '⌊', '⌋']
  }
];

/**
 * Renders a symbol keyboard with editor-specific insertion values.
 */
class PRDC_JSLAB_CODE_SYMBOL_INPUT {

  /**
   * Creates the symbol keyboard.
   * @param {HTMLElement} container Symbol groups container.
   * @param {Function} currentString Resolves a translated group name.
   * @param {Function} insert Inserts text at the current selection.
   * @param {Function} [getKey] Provides the text and tooltip for each key.
   */
  constructor(container, currentString, insert, getKey = symbol => ({
    text: symbol, title: /* lang-fixed */ 'U+' + symbol.codePointAt(0).toString(16).toUpperCase()
  })) {
    this.container = container;
    this.currentString = currentString;
    this.insert = insert;
    this.getKey = getKey;
    if(!this.container) {
      return;
    }

    this.render();
    this.bindEvents();
  }

  /**
   * Render all symbol groups and keys.
   */
  render() {
    this.container.innerHTML = '';
    var fragment = document.createDocumentFragment();
    var obj = this;

    SYMBOL_GROUPS.forEach(function(group) {
      var groupEl = document.createElement('div');
      groupEl.className = 'editor-symbol-group';

      var title = document.createElement('div');
      title.className = 'editor-symbol-group-title';
      title.textContent = obj.currentString(group.title_sid) || group.fallback_title;
      groupEl.appendChild(title);

      var grid = document.createElement('div');
      grid.className = 'editor-symbol-grid';

      group.symbols.forEach(function(symbol) {
        const value = obj.getKey(symbol, group.title_sid);
        if(!value) return;
        var key = document.createElement('button');
        key.type = 'button';
        key.className = 'editor-symbol-key';
        key.textContent = symbol;
        key.dataset.symbol = symbol;
        key.dataset.value = value.text;
        key.title = value.title;
        grid.appendChild(key);
      });

      groupEl.appendChild(grid);
      fragment.appendChild(groupEl);
    });

    this.container.appendChild(fragment);
  }

  /**
   * Bind keyboard click handlers.
   */
  bindEvents() {
    var obj = this;

    this.container.addEventListener('mousedown', function(e) {
      if(e.target && e.target.classList.contains('editor-symbol-key')) {
        // Keep editor cursor in place.
        e.preventDefault();
      }
    });

    this.container.addEventListener('click', function(e) {
      if(!e.target || !e.target.classList.contains('editor-symbol-key')) {
        return;
      }
      obj.insert(e.target.dataset.value);
    });
  }

}

exports.PRDC_JSLAB_CODE_SYMBOL_INPUT = PRDC_JSLAB_CODE_SYMBOL_INPUT;
