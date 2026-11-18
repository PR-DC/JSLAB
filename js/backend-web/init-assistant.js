/**
 * @file Browser initialization for the common Assistant window
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_APP_CONFIG } = require('../../config/config');
const { PRDC_JSLAB_LANGUAGE } = require('../other-shared/language');
const { PRDC_JSLAB_WEB_RENDERER_ADAPTER } = require('./renderer');
const { PRDC_JSLAB_WIN_ASSISTANT } = require('../windows/assistant');

document.addEventListener('DOMContentLoaded', function() {
  const bridge = globalThis.__JSLAB_WEB_getBridge();
  globalThis.config = new PRDC_APP_CONFIG();
  globalThis.language = PRDC_JSLAB_LANGUAGE.fromPreference(() => bridge.getLanguage());
  const platform = new PRDC_JSLAB_WEB_RENDERER_ADAPTER(bridge, 'assistant');
  globalThis.win_assistant = new PRDC_JSLAB_WIN_ASSISTANT(platform);
  language.update();
  win_assistant.onReady();
  globalThis.__JSLAB_WEB_FRAME_onLanguageChange = () => platform.host.emit('AssistantWindow', 'set-language', bridge.getLanguage().lang);
});
