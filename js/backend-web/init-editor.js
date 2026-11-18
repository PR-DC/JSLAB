/**
 * @file JSLAB browser init-editor services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_APP_CONFIG } = require('../../config/config');
const { PRDC_JSLAB_LANGUAGE } = require('../other-shared/language');
const { PRDC_JSLAB_WEB_RENDERER_ADAPTER } = require('./renderer');
const { PRDC_JSLAB_WIN_EDITOR } = require('../editor/win-editor');

document.addEventListener('DOMContentLoaded', function() {
  const bridge = globalThis.__JSLAB_WEB_getBridge();
  globalThis.global = globalThis;
  globalThis.config = new PRDC_APP_CONFIG();
  globalThis.language = PRDC_JSLAB_LANGUAGE.fromPreference(() => bridge.getLanguage());
  language.update();
  const platform = new PRDC_JSLAB_WEB_RENDERER_ADAPTER(bridge, 'editor');
  const editor = new PRDC_JSLAB_WIN_EDITOR(platform);
  globalThis.win_editor = editor;
  editor.onReady();
  globalThis.__JSLAB_WEB_EDITOR__ = {
    openFile: (filename, line, column) => editor.script_manager.openScript([filename, line, column]),
    updateDebugState: (state, frame) => {
      editor.debugger_toolbar.update(state);
      editor.debugger_pane.update(state);
      for(const script of editor.script_manager.scripts) {
        script.debugger.update(state, frame);
      }
    },
    showDebugger: () => editor.debugger_pane.show(),
    hideDebugger: () => editor.debugger_pane.hide(),
    debuggerPane: editor.debugger_pane,
    saveActiveTab: () => editor.script_manager.saveScript(),
    closeActiveTab: () => editor.script_manager.removeScriptByTab(editor.script_manager.active_tab),
    hasDirtyTabs: () => editor.script_manager.scripts.some(script => script.code_editor.getValue() != script.saved_code)
  };
  globalThis.__JSLAB_WEB_FRAME_onLanguageChange = function() {
    platform.host.emit('EditorWindow', 'set-language', bridge.getLanguage().lang);
  };
  const filename = globalThis.__JSLAB_WEB_EDITOR_FILE__;
  if(filename) {
    editor.script_manager.openScript([filename, globalThis.__JSLAB_WEB_EDITOR_LINE__, 1]);
  }

});
