/**
 * @file JSLAB common CodeMirror editor configuration
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Provides consistent code editing defaults for script and presentation tabs.
 */
class PRDC_JSLAB_CODE_EDITOR {
  /**
   * Returns fresh editor options, including mutable nested gutter settings.
   * @param {Object} [overrides={}] Feature-specific options.
   * @returns {Object} CodeMirror options.
   */
  static options(overrides = {}) {
    return {
      theme: 'notepadpp',
      rulers: [{ color: '#aff', column: 75, lineStyle: 'solid' }],
      indentUnit: 2,
      tabSize: 2,
      lineNumbers: true,
      lineWrapping: true,
      styleActiveLine: true,
      matchBrackets: true,
      gutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'CodeMirror-lint-markers'],
      foldGutter: true,
      searchDialog: true,
      highlightSelectionMatches: { annotateScrollbar: true },
      ...overrides
    };
  }

  /**
   * Installs the editing shortcuts used by every code tab.
   * @param {Object} CodeMirror Editor library.
   */
  static bindShortcuts(CodeMirror) {
    Object.assign(CodeMirror.keyMap.default, {
      'Shift-Tab': 'indentLess',
      'Tab': 'indentMore',
      'Ctrl-F': 'showSearchDialog',
      'Ctrl-G': 'findNext',
      'Shift-Ctrl-G': 'findPrev',
      'Shift-Ctrl-F': 'replace',
      'Shift-Ctrl-R': 'replaceAll',
      'Ctrl-/': 'toggleComment'
    });
  }

  /**
   * Inserts text at the active cursor or replaces the current selection.
   * @param {Object} editor CodeMirror instance.
   * @param {string} text Text to insert.
   */
  static insertText(editor, text) {
    if(typeof text !== 'string' || !text.length) return;
    editor.replaceSelection(text, 'end', '+input');
    editor.focus();
  }

  /**
   * Enables completion while typing in presentation source tabs.
   * @param {Object} CodeMirror Editor library.
   * @param {Object} editor CodeMirror instance.
   */
  static bindCompletion(CodeMirror, editor) {
    editor.on('keypress', function(cm, event) {
      if(!cm.state.completionActive && !event.ctrlKey &&
          !['Enter', ';', ' ', '{', '}'].includes(event.key) &&
          typeof CodeMirror.commands.autocomplete == 'function') {
        CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
      }
    });
  }
}

exports.PRDC_JSLAB_CODE_EDITOR = PRDC_JSLAB_CODE_EDITOR;
