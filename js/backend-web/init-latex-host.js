/**
 * @file Loads the JSLAB Web LaTeX host on demand
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WEB_LATEX } = require('./latex');
const { PRDC_JSLAB_WEB_LATEX_EDITOR_HOST } = require('./latex-editor-host');

globalThis.__JSLAB_WEB_LATEX__ = { PRDC_JSLAB_WEB_LATEX, PRDC_JSLAB_WEB_LATEX_EDITOR_HOST };
