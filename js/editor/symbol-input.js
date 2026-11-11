/**
 * @file JSLAB editor symbol input module
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
 * Class for editor symbol input keyboard.
 */
class PRDC_JSLAB_EDITOR_SYMBOL_INPUT {

  /**
   * Create symbol input keyboard.
   * @param {object} win Editor window object.
   */
  constructor(win) {
    this.win = win;
    this.container = document.getElementById('editor-symbol-groups');
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
      title.innerHTML = obj.getGroupTitle(group);
      groupEl.appendChild(title);

      var grid = document.createElement('div');
      grid.className = 'editor-symbol-grid';

      group.symbols.forEach(function(symbol) {
        var key = document.createElement('button');
        key.type = 'button';
        key.className = 'editor-symbol-key';
        key.textContent = symbol;
        key.setAttribute('data-symbol', symbol);
        key.setAttribute('title', /* lang-fixed */ 'U+' + symbol.codePointAt(0).toString(16).toUpperCase());
        grid.appendChild(key);
      });

      groupEl.appendChild(grid);
      fragment.appendChild(groupEl);
    });

    this.container.appendChild(fragment);
  }
  
  /**
   * Gets translated group title text.
   * @param {object} group Group descriptor.
   * @returns {string}
   */
  getGroupTitle(group) {
    if(group && isFinite(group.title_sid) && typeof language !== 'undefined') {
      var text = language.currentString(group.title_sid);
      if(typeof text === 'string' && text.length) {
        return text;
      }
    }
    if(group && typeof group.fallback_title === 'string') {
      return group.fallback_title;
    }
    return '';
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
      var symbol = e.target.getAttribute('data-symbol');
      obj.insertSymbol(symbol);
    });
  }

  /**
   * Insert symbol in active script editor.
   * @param {string} symbol Symbol to insert.
   */
  insertSymbol(symbol) {
    if(typeof symbol !== 'string' || !symbol.length) {
      return;
    }
    this.win.script_manager.insertTextInActiveScript(symbol);
  }
}

exports.PRDC_JSLAB_EDITOR_SYMBOL_INPUT = PRDC_JSLAB_EDITOR_SYMBOL_INPUT;
