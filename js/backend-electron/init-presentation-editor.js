/**
 * @file JSLAB Electron init-presentation-editor services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

require('../js/other-shared/init-config.js');

var language = window.opener.jsl.inter.lang;


const { PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER } = require('../js/backend-electron/renderer');
const { PRDC_JSLAB_PRESENTATION_EDITOR } = require('../js/windows/presentation-editor');
var presentation_editor = new PRDC_JSLAB_PRESENTATION_EDITOR(new PRDC_JSLAB_ELECTRON_RENDERER_ADAPTER());
