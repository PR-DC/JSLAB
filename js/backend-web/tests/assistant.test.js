/**
 * @file Browser Assistant integration with the common feature controller and service
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { webTest } = require('./browser-test-utils');
var tests = new PRDC_JSLAB_TESTS();
if(!globalThis.gui_browser) {
  exports.MODULE_TESTS = tests;
  return;
}

webTest(tests, 'browser Assistant uses the common chat service, scientific tools and session credentials', async function() {
  const t = GUI;
  const service = t.app.assistant;
  const fetch = service.fetch;
  const requests = [];
  const responses = [
    { id: 'assistant-tool', output: [{ type: 'function_call', call_id: 'calculate',
      name: 'evaluate_code', arguments: '{"code":"assistant_test_value = 2 + 3;"}' }] },
    { id: 'assistant-reply', output_text: 'The result is 5.', output: [] }
  ];
  try {
    t.click('#settings-menu');
    t.input('#settings-container .openai-api-key', 'sk-browser-test');
    t.click('#settings-container .change-settings');
    await t.wait(() => service.hasApiKey());
    t.eq(t.q('#settings-container .openai-api-key').value, '');
    t.ok(!JSON.stringify(localStorage).includes('sk-browser-test'));
    service.fetch = t.responseFetch(responses, requests);
    t.click('#assistant-menu');
    await t.wait(() => !!t.app.window_manager.windows.get('assistant-window')?.iframe.contentWindow.win_assistant);
    const win = t.app.window_manager.windows.get('assistant-window').iframe.contentWindow;
    t.input('#assistant-input', 'Calculate 2+3.', win.document);
    t.click('#assistant-send', win.document);
    await t.wait(() => !win.win_assistant.busy && !!win.document.querySelector('.assistant-message.assistant'));
    t.eq(win.document.querySelector('.assistant-message.assistant .assistant-message-text').textContent, 'The result is 5.');
    t.eq(requests.length, 2);
    t.eq(requests[1].previous_response_id, 'assistant-tool');
    t.eq(JSON.parse(requests[1].input[0].output).success, true);
    const context = await t.app.assistant.callTool('get_application_context', {});
    t.eq(context.main.current_path, t.app.current_path);
    t.ok(Array.isArray(context.main.workspace));
    t.ok(t.app.main.workspace.data.some(row => row[0] === 'assistant_test_value'));
    t.click('#assistant-timestamp', win.document);
    t.click('#assistant-autoscroll', win.document);
    t.click('#assistant-to-bottom', win.document);
    t.click('#assistant-clear', win.document);
    t.eq(service.previous_response_id, null);
    t.eq(win.document.querySelectorAll('.assistant-message').length, 0);
  } finally {
    service.fetch = fetch;
    service.clearApiKey();
    t.app.window_manager.close('assistant-window');
  }
});

webTest(tests, 'browser Assistant cancellation and transcript export use host adapters', async function() {
  const t = GUI;
  const service = t.app.assistant;
  const fetch = service.fetch;
  const showSaveDialog = t.app.bridge.showSaveDialog;
  const saveLocalFile = t.app.bridge.saveLocalFile;
  let saved;
  try {
    service.setApiKey('sk-browser-test');
    service.fetch = async function(_url, options) {
      return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    };
    const managed = await t.app.windows._openAssistantWindow();
    await t.wait(() => !!managed.iframe.contentWindow.win_assistant);
    const win = managed.iframe.contentWindow;
    t.input('#assistant-input', 'Wait for cancellation.', win.document);
    t.key(win.document.getElementById('assistant-input'), 'Enter');
    await t.wait(() => !!service.abort_controller);
    t.click('#assistant-stop', win.document);
    await t.wait(() => !win.win_assistant.busy);
    t.eq(win.document.querySelectorAll('.assistant-message.error').length, 0);
    t.app.bridge.showSaveDialog = async () => ({ name: 'assistant.txt' });
    t.app.bridge.saveLocalFile = async (_target, text) => { saved = text; return true; };
    t.click('#assistant-save', win.document);
    await t.wait(() => typeof saved === 'string');
    t.ok(saved.includes('Wait for cancellation.'));
  } finally {
    service.fetch = fetch;
    service.clearApiKey();
    t.app.bridge.showSaveDialog = showSaveDialog;
    t.app.bridge.saveLocalFile = saveLocalFile;
    t.app.window_manager.close('assistant-window');
  }
});

exports.MODULE_TESTS = tests;
