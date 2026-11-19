/**
 * @file JSLAB LaTeX Editor settings and saved project choices
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LATEX_COMPILER } = require('../other-shared/latex-compiler');
const { PRDC_JSLAB_LATEX_PROJECT_FILES } = require('../other-shared/latex-project-files');

const panel_keys = ['panel-latex-editor-columns', 'panel-latex-editor-source', 'panel-latex-editor-sidebar'];

/**
 * Reads and validates persistent LaTeX Editor settings for both hosts.
 */
class PRDC_JSLAB_LATEX_EDITOR_SETTINGS {
  /**
   * Connects settings to application storage and translations.
   * @param {Object} store Application storage service.
   * @param {Function} currentString Translation lookup for the active language.
   */
  constructor(store, currentString) {
    this.store = store;
    this.currentString = currentString;
  }

  /**
   * Reads or updates settings requested by the editor.
   * @param {string} action Settings operation.
   * @param {*} [first] Preference value, search history or panel key.
   * @param {number[]} [second] Panel sizes when storing a panel layout.
   * @returns {Object|undefined} Initial editor settings for a settings request.
   */
  request(action, first, second) {
    switch(action) {
      case 'settings': {
        const strings = {};
        for(const [start, end] of [[336, 344], [364, 372], [697, 777]]) {
          for(let id = start; id <= end; id++) strings[id] = this.currentString(id);
        }
        for(const id of [47, 48, 49, 50, 51, 52, 168, 331, 376, 381, 382, 643, 644]) {
          strings[id] = this.currentString(id);
        }
        const panels = Object.fromEntries(panel_keys.map(key => [key, this.store.get(key)]));
        return { strings, panels, search_history: this.store.get('editor_search_history'),
          preferences: PRDC_JSLAB_LATEX_COMPILER.preferences(this.store.get('latex-editor-preferences')) };
      }
      case 'panel':
        if(panel_keys.includes(first) && Array.isArray(second) && second.length === 2 &&
            second.every(size => Number.isFinite(size) && size > 0 && size < 100)) this.store.set(first, second);
        return;
      case 'preferences':
        this.store.set('latex-editor-preferences', PRDC_JSLAB_LATEX_COMPILER.preferences(first));
        return;
      case 'search-history':
        if(Array.isArray(first) && first.length <= 100 && first.every(item => typeof item === 'string')) {
          this.store.set('editor_search_history', first);
        }
    }
  }

  /**
   * Chooses a main document from the project's current source files.
   * @param {string} root Project directory.
   * @param {string[]} files Editable source paths.
   * @param {string} [requested] Explicit main document path.
   * @returns {string|null|false} Main document, empty project, or invalid selection.
   */
  selectMain(root, files, requested) {
    const saved = this.store.get('latex-editor-main-files', {})?.[root];
    return PRDC_JSLAB_LATEX_PROJECT_FILES.chooseMain(files, requested, saved);
  }

  /**
   * Persists a main document after the host confirms the file belongs to the project.
   * @param {string} root Project directory.
   * @param {string} file Project-relative main document.
   * @returns {boolean} Whether the selection was stored.
   */
  saveMain(root, file) {
    if(typeof file !== 'string' || !/\.tex$/i.test(file)) return false;
    this.store.set('latex-editor-main-files', { ...this.store.get('latex-editor-main-files', {}), [root]: file });
    return true;
  }
}

exports.PRDC_JSLAB_LATEX_EDITOR_SETTINGS = PRDC_JSLAB_LATEX_EDITOR_SETTINGS;
