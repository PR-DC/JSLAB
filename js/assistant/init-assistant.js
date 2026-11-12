/**
 * @file JSLAB Assistant window
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const Store = require('electron-store');
require('../js/shared/init-config.js');
const { PRDC_JSLAB_LANGUAGE } = require('../js/shared/language');
global.app_path = ipcRenderer.sendSync('sync-message', 'get-app-path');
var language = new PRDC_JSLAB_LANGUAGE();
var messages = document.getElementById('assistant-messages');
var input = document.getElementById('assistant-input');
var send_button = document.getElementById('assistant-send');
var stop_button = document.getElementById('assistant-stop');
var timestamp_button = document.getElementById('assistant-timestamp');
var autoscroll_button = document.getElementById('assistant-autoscroll');
var store = new Store();
var show_timestamp = store.get('assistant-show-timestamp') === true;
var autoscroll = store.get('assistant-autoscroll') !== false;
var busy = false;

/** Returns the local time in the same format used by the Command Window. */
function getTimestamp() {
  var date = new Date();
  var pad = function(value, size) { return String(value).padStart(size, '0'); };
  return pad(date.getHours(), 2) + ':' + pad(date.getMinutes(), 2) + ':' +
    pad(date.getSeconds(), 2) + '.' + pad(date.getMilliseconds(), 3);
}

/** Updates timestamp visibility and its persisted toolbar state. */
function setTimestamp(state) {
  show_timestamp = !!state;
  messages.classList.toggle('no-timestamp', !show_timestamp);
  timestamp_button.classList.toggle('active', show_timestamp);
  var string_id = show_timestamp ? 41 : 166;
  timestamp_button.setAttribute('title', language.currentString(string_id));
  timestamp_button.setAttribute('aria-label', language.currentString(string_id));
  store.set('assistant-show-timestamp', show_timestamp);
}

/** Updates automatic scrolling and its persisted toolbar state. */
function setAutoscroll(state) {
  autoscroll = !!state;
  autoscroll_button.classList.toggle('active', autoscroll);
  var string_id = autoscroll ? 42 : 167;
  autoscroll_button.setAttribute('title', language.currentString(string_id));
  autoscroll_button.setAttribute('aria-label', language.currentString(string_id));
  store.set('assistant-autoscroll', autoscroll);
}

function appendMessage(role, text, class_name) {
  var message = document.createElement('div');
  message.className = 'assistant-message '+(class_name || role);
  message.setAttribute('aria-label', role === 'user' ? language.currentString(666) : language.currentString(651));
  message.dataset.role = role;
  message.dataset.timestamp = getTimestamp();
  var timestamp = document.createElement('span');
  timestamp.className = 'assistant-timestamp';
  timestamp.textContent = message.dataset.timestamp;
  var body = document.createElement('span');
  body.className = 'assistant-message-text';
  body.textContent = String(text || '');
  message.appendChild(timestamp);
  message.appendChild(body);
  messages.appendChild(message);
  if(autoscroll) messages.scrollTop = messages.scrollHeight;
  return message;
}

function setBusy(state) {
  busy = state;
  input.disabled = state;
  send_button.disabled = state;
  stop_button.hidden = !state;
  if(!state) input.focus();
}

/** Converts Electron invocation errors to concise, localized chat messages. */
function getErrorMessage(error) {
  var text = String(error && error.message ? error.message : error || '');
  text = text.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '');
  if(/Configure an OpenAI API key/i.test(text)) return language.currentString(658);
  return text;
}

async function sendMessage() {
  var text = input.value.trim();
  if(!text || busy) return;
  appendMessage('user', text);
  input.value = '';
  input.style.height = '';
  setBusy(true);
  var status = appendMessage('status', language.currentString(665), 'status');
  try {
    var response = await ipcRenderer.invoke('JSLAB_ASSISTANT_CHAT', text);
    if(response && response.error) throw new Error(response.error);
    var reply = response && response.result;
    status.remove();
    appendMessage('assistant', reply && reply.text);
  } catch(error) {
    status.remove();
    var error_message = getErrorMessage(error);
    if(error_message && !/aborted/i.test(error_message)) appendMessage('error', error_message, 'error');
  } finally {
    setBusy(false);
  }
}

send_button.addEventListener('click', sendMessage);
stop_button.addEventListener('click', function() { ipcRenderer.send('JSLAB_ASSISTANT_CANCEL'); });
document.getElementById('assistant-clear').addEventListener('click', function() {
  messages.innerHTML = '';
  ipcRenderer.send('JSLAB_ASSISTANT_RESET');
  input.focus();
});
timestamp_button.addEventListener('click', function() {
  setTimestamp(!show_timestamp);
});
autoscroll_button.addEventListener('click', function() {
  setAutoscroll(!autoscroll);
});
document.getElementById('assistant-to-bottom').addEventListener('click', function() {
  messages.scrollTop = messages.scrollHeight;
  input.focus();
});
document.getElementById('assistant-save').addEventListener('click', async function() {
  var result = await ipcRenderer.invoke('dialog', 'showSaveDialog', {
    title: language.currentString(672),
    defaultPath: path.join(ipcRenderer.sendSync('sync-message', 'get-path', 'documents'),
      'assistant-' + new Date().toISOString().replace(/[:.]/g, '-') + '.txt'),
    filters: [{ name: 'Text', extensions: ['txt'] }]
  });
  if(!result || result.canceled || !result.filePath) return;
  var lines = Array.from(messages.querySelectorAll('.assistant-message:not(.status)')).map(function(message) {
    var role = message.dataset.role === 'user' ? language.currentString(666) : language.currentString(651);
    var text = message.querySelector('.assistant-message-text');
    return '[' + message.dataset.timestamp + '] ' + role + ': ' + (text ? text.textContent : '');
  });
  fs.writeFileSync(result.filePath, lines.join('\r\n'), 'utf8');
  input.focus();
});
input.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 160)+'px';
});
input.addEventListener('keydown', function(event) {
  if(event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
window.addEventListener('keydown', function(event) {
  if(event.key === 'Escape' && busy) ipcRenderer.send('JSLAB_ASSISTANT_CANCEL');
});
ipcRenderer.on('AssistantWindow', function(_event, action, data) {
  if(action === 'set-language') {
    language.set(data);
    document.querySelectorAll('.assistant-message.user').forEach(function(el) {
      el.setAttribute('aria-label', language.currentString(666));
    });
    document.querySelectorAll('.assistant-message:not(.user)').forEach(function(el) {
      el.setAttribute('aria-label', language.currentString(651));
    });
    setTimestamp(show_timestamp);
    setAutoscroll(autoscroll);
  }
  if(action === 'focus-input') input.focus();
});
setTimestamp(show_timestamp);
setAutoscroll(autoscroll);
input.focus();
