/**
 * @file Assistant window controller interaction tests
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TESTS } = require('../../other-shared/tester');
const { guiTest } = require('../../dev/component-test-utils');
var tests = new PRDC_JSLAB_TESTS();
if(!globalThis.__JSLAB_GUI_COMPONENT__) {
  exports.MODULE_TESTS = tests;
  return;
}

guiTest(tests, 'assistant', 'Assistant controls retain timestamps, language and conversation state',
  ['#assistant-timestamp', '#assistant-autoscroll', '#assistant-clear'], function(assert, fixture, controller) {
    controller.appendMessage('user', 'Keep this conversation');
    fixture.click('#assistant-timestamp');
    assert.equal(controller.show_timestamp, true);
    assert.equal(fixture.data.get('assistant-show-timestamp'), true);
    assert.ok(/^\d{2}:\d{2}:\d{2}\.\d{3}$/.test(fixture.query('.assistant-message').dataset.timestamp));
    fixture.click('#assistant-autoscroll');
    assert.equal(controller.autoscroll, false);
    fixture.emit('AssistantWindow', 'set-language', 'rs');
    assert.equal(fixture.query('.assistant-message').getAttribute('aria-label'), 'Vi');
    assert.equal(fixture.query('.assistant-message-text').textContent, 'Keep this conversation');
    fixture.click('#assistant-clear');
    assert.equal(fixture.document.querySelectorAll('.assistant-message').length, 0);
    assert.ok(fixture.calls.some(call => call[0] == 'JSLAB_ASSISTANT_RESET'));
  });

guiTest(tests, 'assistant', 'Assistant sends prompts and displays a concise localized missing-key error',
  ['#assistant-send'], async function(assert, fixture, controller) {
    fixture.setDialogResult({ error: 'Configure an OpenAI API key in Settings.' });
    fixture.input('#assistant-input', 'Help me');
    fixture.click('#assistant-send');
    await fixture.waitFor(function() {
      return !controller.busy;
    }, 'assistant response');
    assert.equal(fixture.query('.assistant-message.user .assistant-message-text').textContent, 'Help me');
    assert.equal(fixture.query('.assistant-message.error .assistant-message-text').textContent,
      'Configure an OpenAI API key in Settings.');
    assert.equal(fixture.query('#assistant-input').disabled, false);
    assert.equal(fixture.document.querySelectorAll('.assistant-message.status').length, 0);
    assert.ok(fixture.calls.some(call => call[0] == 'JSLAB_ASSISTANT_CHAT' && call[1] == 'Help me'));
  });

guiTest(tests, 'assistant', 'Assistant exports the conversation and routes keyboard and stop controls',
  ['#assistant-stop', '#assistant-save', '#assistant-to-bottom'], async function(assert, fixture, controller) {
    controller.appendMessage('user', 'Export this conversation');
    fixture.setDialogResult({ canceled: false, filePath: 'assistant-export.txt' });
    fixture.click('#assistant-save');
    await fixture.waitFor(() => fixture.files.has('assistant-export.txt'), 'conversation export');
    assert.ok(fixture.files.get('assistant-export.txt').includes('Export this conversation'));
    fixture.click('#assistant-to-bottom');
    assert.equal(fixture.document.activeElement, controller.input);
    fixture.click('#assistant-stop');
    controller.busy = true;
    fixture.window.dispatchEvent(new fixture.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(fixture.calls.filter(call => call[0] == 'JSLAB_ASSISTANT_CANCEL').length, 2);
    controller.busy = false;
    fixture.setDialogResult({ error: 'Configure an OpenAI API key in Settings.' });
    fixture.input('#assistant-input', 'Keyboard prompt');
    controller.input.dispatchEvent(new fixture.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await fixture.waitFor(() => !controller.busy, 'keyboard response');
    assert.ok(fixture.calls.some(call => call[0] == 'JSLAB_ASSISTANT_CHAT' && call[1] == 'Keyboard prompt'));
  });

exports.MODULE_TESTS = tests;
