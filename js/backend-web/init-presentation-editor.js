/**
 * @file Browser adapter bootstrap for the common inline Presentation Editor
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { PRDC_JSLAB_WEB_RENDERER_ADAPTER } = require('./renderer');
const { PRDC_JSLAB_PRESENTATION_EDITOR_INLINE } = require('../windows/presentation-editor-inline');

document.addEventListener('DOMContentLoaded', function() {
  const platform = new PRDC_JSLAB_WEB_RENDERER_ADAPTER(globalThis.__JSLAB_WEB_getBridge(), 'presentation-editor');
  globalThis.presentation_editor = new PRDC_JSLAB_PRESENTATION_EDITOR_INLINE(platform);
  globalThis.__JSLAB_WEB_PRESENTATION_EDITOR__ = presentation_editor;
  globalThis.__JSLAB_WEB_BEFORE_CLOSE__ = () => presentation_editor.beforeClose();
});
