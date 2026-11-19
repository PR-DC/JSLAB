/**
 * @file JSLAB Editor symbol input
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_CODE_SYMBOL_INPUT } = require('../code/symbol-input');

/**
 * Connects the symbol picker to the active script.
 */
class PRDC_JSLAB_EDITOR_SYMBOL_INPUT extends PRDC_JSLAB_CODE_SYMBOL_INPUT {

  /**
   * Creates the Editor's Unicode symbol picker.
   * @param {Object} win Editor window.
   */
  constructor(win) {
    super(document.getElementById('editor-symbol-groups'),
      id => typeof language === 'undefined' ? undefined : language.currentString(id),
      text => win.script_manager.insertTextInActiveScript(text));
  }
}

exports.PRDC_JSLAB_EDITOR_SYMBOL_INPUT = PRDC_JSLAB_EDITOR_SYMBOL_INPUT;
