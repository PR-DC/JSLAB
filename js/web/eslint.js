/**
 * @file Browser ESLint helpers for JSLAB web CodeMirror instances
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

if(typeof globalThis.process == 'undefined') {
  globalThis.process = {
    env: {},
    cwd: function() {
      return '/';
    }
  };
} else if(typeof globalThis.process.cwd != 'function') {
  globalThis.process.cwd = function() {
    return '/';
  };
}

var { Linter } = require('eslint/universal');
var { PRDC_APP_CONFIG } = require('../../config/config');

var app_config = new PRDC_APP_CONFIG();
var javascript_linter = new Linter({ configType: 'flat' });
var javascript_lint_config = {
  languageOptions: Object.assign({}, app_config.LINT_OPTIONS.overrideConfig.languageOptions),
  rules: Object.assign({}, app_config.LINT_OPTIONS.overrideConfig.rules)
};

/**
 * Converts an ESLint message to a CodeMirror lint annotation.
 * @param {Object} message
 * @param {Object} CodeMirror
 * @returns {Object}
 */
function toCodeMirrorAnnotation(message, CodeMirror) {
  return {
    from: CodeMirror.Pos(message.line - 1, message.column - 1),
    to: CodeMirror.Pos(
      message.endLine ? message.endLine - 1 : message.line - 1,
      message.endColumn ? message.endColumn - 1 : message.column
    ),
    severity: message.severity === 2 ? 'error' : 'warning',
    message: message.message
  };
}

/**
 * Runs browser-side ESLint on JavaScript text.
 * @param {string} text
 * @returns {Object[]}
 */
function lintJavascript(text) {
  try {
    return javascript_linter.verify(String(text || ''), javascript_lint_config);
  } catch {
    return [];
  }
}

/**
 * Creates CodeMirror lint options matching the Electron shape.
 * @param {Object} CodeMirror
 * @returns {Object}
 */
function createCodeMirrorLintOptions(CodeMirror) {
  return {
    getAnnotations: function(text, callback) {
      Promise.resolve().then(function() {
        callback(lintJavascript(text).map(function(message) {
          return toCodeMirrorAnnotation(message, CodeMirror);
        }));
      });
    },
    async: true
  };
}

exports.lintJavascript = lintJavascript;
exports.createCodeMirrorLintOptions = createCodeMirrorLintOptions;
