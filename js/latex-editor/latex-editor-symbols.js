/**
 * @file JSLAB LaTeX Editor symbol insertion
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const commands = {
  '+': '+', '-': '-', '×': '\\times', '÷': '\\div', '±': '\\pm', '≈': '\\approx', '≠': '\\neq',
  '<': '<', '>': '>', '≤': '\\leq', '≥': '\\geq', '∞': '\\infty', '√': '\\surd', '∛': '\\sqrt[3]{}',
  '∜': '\\sqrt[4]{}', '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∂': '\\partial', '∇': '\\nabla',
  '∝': '\\propto', '°': '{}^{\\circ}', '′': '\\prime', '″': '\\prime\\prime',
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\epsilon', 'ζ': '\\zeta',
  'η': '\\eta', 'θ': '\\theta', 'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
  'ν': '\\nu', 'ξ': '\\xi', 'ο': 'o', 'π': '\\pi', 'ρ': '\\rho', 'σ': '\\sigma', 'τ': '\\tau',
  'υ': '\\upsilon', 'φ': '\\phi', 'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Α': '\\mathrm{A}', 'Β': '\\mathrm{B}', 'Γ': '\\Gamma', 'Δ': '\\Delta', 'Ε': '\\mathrm{E}',
  'Ζ': '\\mathrm{Z}', 'Η': '\\mathrm{H}', 'Θ': '\\Theta', 'Ι': '\\mathrm{I}', 'Κ': '\\mathrm{K}',
  'Λ': '\\Lambda', 'Μ': '\\mathrm{M}', 'Ν': '\\mathrm{N}', 'Ξ': '\\Xi', 'Ο': '\\mathrm{O}',
  'Π': '\\Pi', 'Ρ': '\\mathrm{P}', 'Σ': '\\Sigma', 'Τ': '\\mathrm{T}', 'Υ': '\\Upsilon',
  'Φ': '\\Phi', 'Χ': '\\mathrm{X}', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  '∀': '\\forall', '∃': '\\exists', '¬': '\\neg', '∧': '\\land', '∨': '\\lor', '⊕': '\\oplus',
  '∈': '\\in', '∉': '\\notin', '∋': '\\ni', '∩': '\\cap', '∪': '\\cup', '⊂': '\\subset',
  '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq', '⊄': '\\not\\subset', '⊈': '\\not\\subseteq',
  '⊊': '\\subsetneq', '⊋': '\\supsetneq', '∅': '\\emptyset',
  '←': '\\leftarrow', '↑': '\\uparrow', '→': '\\rightarrow', '↓': '\\downarrow', '↔': '\\leftrightarrow',
  '↕': '\\updownarrow', '↖': '\\nwarrow', '↗': '\\nearrow', '↘': '\\searrow', '↙': '\\swarrow',
  '⇒': '\\Rightarrow', '⇐': '\\Leftarrow', '⇔': '\\Leftrightarrow', '⇑': '\\Uparrow', '⇓': '\\Downarrow',
  '⟵': '\\longleftarrow', '⟶': '\\longrightarrow', '↦': '\\mapsto',
  '∠': '\\angle', '⊥': '\\perp', '∥': '\\parallel', '∴': '\\therefore', '∵': '\\because',
  '…': '\\ldots', '·': '\\cdot', '∘': '\\circ', '⊗': '\\otimes', '⊙': '\\odot',
  '⌈': '\\lceil', '⌉': '\\rceil', '⌊': '\\lfloor', '⌋': '\\rfloor'
};
const amssymb = new Set(['⊊', '⊋', '∴', '∵']);

/**
 * Supplies LaTeX text and a tooltip for a shared symbol key.
 */
class PRDC_JSLAB_LATEX_EDITOR_SYMBOLS {

  /**
   * Returns the raw TeX command for the selected symbol.
   * @param {string} symbol Displayed glyph.
   * @param {number} group Translation ID of the symbol group.
   * @returns {Object|null} The command and its tooltip.
   */
  static key(symbol, group) {
    let command = commands[symbol];
    if(group === 370 || group === 371) {
      const index = symbol.normalize('NFKC').replace('−', '-');
      command = (group === 370 ? '^' : '_') + '{' + index + '}';
    }
    if(!command) return null;
    return { text: command, title: amssymb.has(symbol) ? command + /* lang-fixed */ ' (\\usepackage{amssymb})' : command };
  }
}

exports.PRDC_JSLAB_LATEX_EDITOR_SYMBOLS = PRDC_JSLAB_LATEX_EDITOR_SYMBOLS;
