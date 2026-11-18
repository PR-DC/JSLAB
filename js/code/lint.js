/**
 * @file Common ESLint service and CodeMirror diagnostics for JSLAB editors
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_APP_CONFIG } = require('../../config/config');

/**
 * Uses ESLint's portable engine with the same application rules in every host.
 */
class PRDC_JSLAB_CODE_LINT {

  /**
   * Creates an in-memory linter without filesystem configuration discovery.
   * @param {Object} [options] Application lint configuration.
   */
  constructor(options = new PRDC_APP_CONFIG().LINT_OPTIONS) {
    const { Linter } = require('eslint/universal');
    const configuration = options.overrideConfig || options;
    this._linter = new Linter({ configType: 'flat' });
    this._configuration = {
      languageOptions: Object.assign({}, configuration.languageOptions),
      rules: Object.assign({}, configuration.rules)
    };
  }

  /**
   * Returns ESLint diagnostics in the result format used by the editors.
   * @param {string} text JavaScript source.
   * @returns {Promise<Array<Object>>} Lint results with their diagnostic messages.
   */
  async lintText(text) {
    return [{ messages: this._linter.verify(String(text || ''), this._configuration) }];
  }

  /**
   * Converts a diagnostic into a CodeMirror source annotation.
   * @param {Object} message ESLint diagnostic.
   * @param {Object} CodeMirror Editor source-position factory.
   * @returns {Object} Editor annotation.
   */
  static toAnnotation(message, CodeMirror) {
    const line = Math.max(0, (message.line || 1) - 1);
    const column = Math.max(0, (message.column || 1) - 1);
    return {
      from: CodeMirror.Pos(line, column),
      to: CodeMirror.Pos(message.endLine ? message.endLine - 1 : line,
        message.endColumn ? message.endColumn - 1 : column + 1),
      severity: message.severity === 2 ? 'error' : 'warning',
      message: message.message
    };
  }

  /**
   * Creates the shared asynchronous CodeMirror lint provider.
   * @param {Object} CodeMirror Editor library.
   * @param {Object} [linter] Existing application linter instance.
   * @returns {Object} CodeMirror lint options.
   */
  static createCodeMirrorLintOptions(CodeMirror, linter = new PRDC_JSLAB_CODE_LINT()) {
    return {
      async: true,
      getAnnotations: async function(text, callback) {
        try {
          const results = await linter.lintText(text);
          callback(results[0].messages.map(message => PRDC_JSLAB_CODE_LINT.toAnnotation(message, CodeMirror)));
        } catch(error) {
          callback([PRDC_JSLAB_CODE_LINT.toAnnotation({ severity: 2, message: String(error.message || error) }, CodeMirror)]);
        }
      }
    };
  }
}

exports.PRDC_JSLAB_CODE_LINT = PRDC_JSLAB_CODE_LINT;
exports.createCodeMirrorLintOptions = PRDC_JSLAB_CODE_LINT.createCodeMirrorLintOptions;
