/**
 * @file JSLAB assistant window controller
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


const { PRDC_JSLAB_TEXT } = require('../other-shared/text');


/**
 * Class for the JSLAB assistant window.
 */
class PRDC_JSLAB_WIN_ASSISTANT {

  /**
   * Connects the window controller to its host services.
   * @param {Object} platform Window service adapter.
   */
  constructor(platform) {
    this.platform = platform;
  }


  /**
   * Initializes window state, controls and host events after the document loads.
   */
  onReady() {
    const { host, fs, path, store } = this.platform;
    var obj = this;
    obj.messages = document.getElementById('assistant-messages');
    obj.input = document.getElementById('assistant-input');
    obj.send_button = document.getElementById('assistant-send');
    obj.stop_button = document.getElementById('assistant-stop');
    obj.timestamp_button = document.getElementById('assistant-timestamp');
    obj.autoscroll_button = document.getElementById('assistant-autoscroll');
    obj.store = store;
    obj.show_timestamp = obj.store.get('assistant-show-timestamp') === true;
    obj.autoscroll = obj.store.get('assistant-autoscroll') !== false;
    obj.busy = false;

    obj.send_button.addEventListener('click', obj.sendMessage.bind(obj));

    obj.stop_button.addEventListener('click', function() {
      host.send('JSLAB_ASSISTANT_CANCEL');
    });

    document.getElementById('assistant-clear').addEventListener('click', function() {
      obj.messages.innerHTML = '';
      host.send('JSLAB_ASSISTANT_RESET');
      obj.input.focus();
    });

    obj.timestamp_button.addEventListener('click', function() {
      obj.setTimestamp(!obj.show_timestamp);
    });

    obj.autoscroll_button.addEventListener('click', function() {
      obj.setAutoscroll(!obj.autoscroll);
    });

    document.getElementById('assistant-to-bottom').addEventListener('click', function() {
      obj.messages.scrollTop = obj.messages.scrollHeight;
      obj.input.focus();
    });

    document.getElementById('assistant-save').addEventListener('click', async function() {
      var result = await host.invoke('dialog', 'showSaveDialog', {
        title: language.currentString(671),
        defaultPath: path.join(host.sendSync('sync-message', 'get-path', 'documents'),
          'assistant-' + new Date().toISOString().replace(/[:.]/g, '-') + '.txt'),
        filters: [{ name: 'Text', extensions: ['txt'] }]
      });
      if(!result || result.canceled || !result.filePath) {
        return;
      }
      var lines = Array.from(obj.messages.querySelectorAll('.assistant-message:not(.status)')).map(function(message) {
        var role = message.dataset.role === 'user' ? language.currentString(665) : language.currentString(650);
        var text = message.querySelector('.assistant-message-text');
        return '[' + message.dataset.timestamp + '] ' + role + ': ' + (text ? text.textContent : '');
      });
      await fs.writeFileSync(result.filePath, lines.join('\r\n'), 'utf8');
      obj.input.focus();
    });

    obj.input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 160) + 'px';
    });

    obj.input.addEventListener('keydown', function(event) {
      if(event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        obj.sendMessage();
      }
    });

    window.addEventListener('keydown', function(event) {
      if(event.key === 'Escape' && obj.busy) {
        host.send('JSLAB_ASSISTANT_CANCEL');
      }
    });

    host.on('AssistantWindow', function(_event, action, data) {
      if(action === 'set-language') {
        language.set(data);
        document.querySelectorAll('.assistant-message.user').forEach(function(el) {
          el.setAttribute('aria-label', language.currentString(665));
        });
        document.querySelectorAll('.assistant-message:not(.user)').forEach(function(el) {
          el.setAttribute('aria-label', language.currentString(650));
        });
        obj.setTimestamp(obj.show_timestamp);
        obj.setAutoscroll(obj.autoscroll);
      }
      if(action === 'focus-input') {
        obj.input.focus();
      }
    });

    obj.setTimestamp(obj.show_timestamp);

    obj.setAutoscroll(obj.autoscroll);

    obj.input.focus();
  }


  /**
   * Updates timestamp visibility and its persisted toolbar state.
   */
  setTimestamp(state) {
    var obj = this;
    obj.show_timestamp = !!state;
    obj.messages.classList.toggle('no-timestamp', !obj.show_timestamp);
    obj.timestamp_button.classList.toggle('active', obj.show_timestamp);
    var string_id = obj.show_timestamp ? 41 : 166;
    obj.timestamp_button.setAttribute('title', language.currentString(string_id));
    obj.timestamp_button.setAttribute('aria-label', language.currentString(string_id));
    obj.store.set('assistant-show-timestamp', obj.show_timestamp);
  }

  /**
   * Updates automatic scrolling and its persisted toolbar state.
   */
  setAutoscroll(state) {
    var obj = this;
    obj.autoscroll = !!state;
    obj.autoscroll_button.classList.toggle('active', obj.autoscroll);
    var string_id = obj.autoscroll ? 42 : 167;
    obj.autoscroll_button.setAttribute('title', language.currentString(string_id));
    obj.autoscroll_button.setAttribute('aria-label', language.currentString(string_id));
    obj.store.set('assistant-autoscroll', obj.autoscroll);
  }

  /**
   * Appends an accessible, timestamped message and follows automatic scrolling.
   */
  appendMessage(role, text, class_name) {
    var obj = this;
    var message = document.createElement('div');
    message.className = 'assistant-message ' + (class_name || role);
    message.setAttribute('aria-label', role === 'user' ? language.currentString(665) : language.currentString(650));
    message.dataset.role = role;
    message.dataset.timestamp = PRDC_JSLAB_TEXT.getTimestamp();
    var timestamp = document.createElement('span');
    timestamp.className = 'assistant-timestamp';
    timestamp.textContent = message.dataset.timestamp;
    var body = document.createElement('span');
    body.className = 'assistant-message-text';
    body.textContent = String(text || '');
    message.appendChild(timestamp);
    message.appendChild(body);
    obj.messages.appendChild(message);
    if(obj.autoscroll) {
      obj.messages.scrollTop = obj.messages.scrollHeight;
    }
    return message;
  }

  /**
   * Updates input and action controls while a request is running.
   */
  setBusy(state) {
    var obj = this;
    obj.busy = state;
    obj.input.disabled = state;
    obj.send_button.disabled = state;
    obj.stop_button.hidden = !state;
    if(!state) {
      obj.input.focus();
    }
  }

  /**
   * Converts host invocation errors to concise, localized chat messages.
   */
  getErrorMessage(error) {
    var text = String(error && error.message ? error.message : error || '');
    text = text.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '');
    if(/Configure an OpenAI API key/i.test(text)) {
      return language.currentString(657);
    }
    return text;
  }

  /**
   * Sends the current prompt and displays its reply or a localized error.
   */
  async sendMessage() {
    const { host } = this.platform;
    var obj = this;
    var text = obj.input.value.trim();
    if(!text || obj.busy) {
      return;
    }
    obj.appendMessage('user', text);
    obj.input.value = '';
    obj.input.style.height = '';
    obj.setBusy(true);
    var status = obj.appendMessage('status', language.currentString(664), 'status');
    try {
      var response = await host.invoke('JSLAB_ASSISTANT_CHAT', text);
      if(response && response.error) {
        throw new Error(response.error);
      }
      var reply = response && response.result;
      status.remove();
      obj.appendMessage('assistant', reply && reply.text);
    } catch(error) {
      status.remove();
      var error_message = obj.getErrorMessage(error);
      if(error_message && !/aborted/i.test(error_message)) {
        obj.appendMessage('error', error_message, 'error');
      }
    } finally {
      obj.setBusy(false);
    }
  }
}

exports.PRDC_JSLAB_WIN_ASSISTANT = PRDC_JSLAB_WIN_ASSISTANT;

/**
 * Owns provider requests, conversation state and JSLAB tool calls for either host.
 */
class PRDC_JSLAB_ASSISTANT {

  /**
   * Initializes the assistant instance.
   * @param {Object} options Service dependencies.
   */
  constructor(options) {
    this.storage = options.storage;
    this._api_key_name = 'openai-api-key';
    this.fetch = options.fetch || globalThis.fetch;
    this._host = options.host;
    this._credential_status = options.credential_status || 663;
    this.call_tool = options.call_tool || this.callTool.bind(this);
    this.model = options.model || 'gpt-6-astra';
    this.previous_response_id = null;
    this.abort_controller = null;
  }

  /**
   * Returns whether the host has an API key available.
   */
  hasApiKey() {
    return this.storage.hasSecret(this._api_key_name);
  }

  /**
   * Validates a new API key and delegates storage to the host.
   */
  setApiKey(token) {
    token = String(token || '').trim();
    if(!token) {
      throw new Error('An OpenAI API key is required.');
    }
    this.storage.setSecret(this._api_key_name, token);
    return true;
  }

  /**
   * Removes the stored API key.
   */
  clearApiKey() {
    this.storage.deleteSecret(this._api_key_name);
    this.resetConversation();
    return true;
  }

  /**
   * Obtains the API key from the host for one provider request.
   */
  _getApiKey() {
    var token = this.storage.getSecret(this._api_key_name);
    if(!token) {
      throw new Error('Configure an OpenAI API key in Settings.');
    }
    return token;
  }

  /**
   * Starts a new API conversation.
   */
  resetConversation() {
    this.previous_response_id = null;
    this.cancel();
  }

  /**
   * Cancels the active HTTP request.
   */
  cancel() {
    if(this.abort_controller) {
      this.abort_controller.abort();
    }
    this.abort_controller = null;
  }

  /**
   * Returns the tools exposed to the model.
   */
  _tools() {
    return [
      {
        type: 'function', name: 'get_application_context',
        description: 'Inspect the current JSLAB path, workspace, command input, active Editor document and selection.',
        parameters: { type: 'object', properties: {}, additionalProperties: false }, strict: true
      },
      {
        type: 'function', name: 'evaluate_code',
        description: 'Evaluate JavaScript in the persistent JSLAB scientific sandbox and return its bounded result.',
        parameters: { type: 'object', properties: {
          code: { type: 'string', description: 'JSLAB code to evaluate.' }
        }, required: ['code'], additionalProperties: false }, strict: true
      },
      {
        type: 'function', name: 'get_help',
        description: 'Read JSLAB documentation for a function, library function or category.',
        parameters: { type: 'object', properties: {
          query: { type: 'string' }, type: { type: 'string', enum: ['function', 'category'] }
        }, required: ['query', 'type'], additionalProperties: false }, strict: true
      },
      {
        type: 'function', name: 'open_editor',
        description: 'Open or focus the JSLAB Editor, optionally opening an existing file.',
        parameters: { type: 'object', properties: {
          path: { type: ['string', 'null'] }
        }, required: ['path'], additionalProperties: false }, strict: true
      },
      {
        type: 'function', name: 'replace_editor_selection',
        description: 'Ask the user to replace the active Editor selection with supplied text.',
        parameters: { type: 'object', properties: {
          text: { type: 'string' }
        }, required: ['text'], additionalProperties: false }, strict: true
      }
    ];
  }

  /**
   * Extracts visible text from a Responses API response.
   */
  _outputText(response) {
    if(typeof response.output_text == 'string') {
      return response.output_text;
    }
    var parts = [];
    for(const item of response.output || []) {
      if(item.type !== 'message') {
        continue;
      }
      for(const content of item.content || []) {
        if(content.type === 'output_text' && typeof content.text == 'string') {
          parts.push(content.text);
        }
      }
    }
    return parts.join('\n');
  }

  /**
   * Executes one declared model tool.
   */
  async _executeTool(call) {
    var args;
    try {
      args = JSON.parse(call.arguments || '{}');
    } catch(error) {
      return JSON.stringify({ success: false, error: 'Invalid tool arguments.' });
    }
    try {
      return JSON.stringify({ success: true, result: await this.call_tool(call.name, args) });
    } catch(error) {
      return JSON.stringify({ success: false, error: String(error.message || error) });
    }
  }

  /**
   * Sends one JSON request to the Responses API.
   */
  async _request(token, body) {
    var response = await this.fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: this.abort_controller.signal
    });
    var data;
    try {
      data = await response.json();
    } catch(error) {
      throw new Error('OpenAI returned an unreadable response.');
    }
    if(!response.ok) {
      throw new Error(data && data.error && data.error.message ||
      'OpenAI request failed with status ' + response.status + '.');
    }
    return data;
  }

  /**
   * Sends a user message and resolves all requested JSLAB tools.
   * @param {string} message User message.
   * @returns {Promise<Object>} Assistant reply.
   */
  async chat(message) {
    message = String(message || '').trim();
    if(!message) {
      throw new Error('Enter a message for Assistant.');
    }
    if(this.abort_controller) {
      throw new Error('Assistant is already responding.');
    }
    var token = this._getApiKey();
    this.abort_controller = new AbortController();
    var instructions = [
      'You are Assistant inside JSLAB, a scientific JavaScript environment.',
      'JSLAB scripts use .jsl and run in a persistent scientific workspace, not ordinary Node.js.',
      'Use JSLAB tools when current application state or numerical validation matters.',
      'Consult get_help instead of guessing unfamiliar JSLAB APIs.',
      'Keep answers concise and explain any application changes you request.'
    ].join(' ');
    try {
      var body = { model: this.model, instructions: instructions,
        input: message, tools: this._tools(), store: true };
      if(this.previous_response_id) {
        body.previous_response_id = this.previous_response_id;
      }
      for(var round = 0; round < 8; round++) {
        var response = await this._request(token, body);
        this.previous_response_id = response.id || this.previous_response_id;
        var calls = (response.output || []).filter(function(item) {
          return item.type === 'function_call';
        });
        if(!calls.length) {
          return { text: this._outputText(response) || 'Assistant returned no text.',
            response_id: response.id, model: response.model || this.model };
        }
        var outputs = [];
        for(const call of calls) {
          outputs.push({ type: 'function_call_output', call_id: call.call_id,
            output: await this._executeTool(call) });
        }
        body = { model: this.model, instructions: instructions, input: outputs,
          tools: this._tools(), previous_response_id: response.id, store: true };
      }
      throw new Error('Assistant exceeded the tool-call limit.');
    } finally {
      this.abort_controller = null;
    }
  }

  /**
 * Returns the bounded main-window context exposed to Assistant tools.
 */
  static mainContext(controller) {
    return { current_path: controller.folder_navigation.current_path,
      command_input: controller.command_window.code_input.getValue().slice(0, 8000),
      workspace: controller.workspace.data.slice(0, 200) };
  }

  /**
 * Returns the bounded active-document context exposed to Assistant tools.
 */
  static editorContext(controller) {
    const manager = controller.script_manager;
    const script = manager.getScriptByTab(manager.active_tab)?.[0];
    if(!script) {
      return null;
    }
    return { path: script.path || null, selection: script.code_editor.getSelection().slice(0, 16000),
      code: script.code_editor.getValue().slice(0, 32000), cursor: script.code_editor.getCursor() };
  }

  /**
 * Replaces the active selection after the host obtains user approval.
 */
  static replaceSelection(controller, text) {
    const manager = controller.script_manager;
    const script = manager.getScriptByTab(manager.active_tab)?.[0];
    if(!script) {
      throw Error('No active Editor document.');
    }
    script.code_editor.replaceSelection(text, 'around', '+assistant');
    script.code_editor.focus();
  }

  /**
   * Handles the Assistant protocol shared by renderer and browser requests.
   * @param {string} channel Assistant operation.
   * @param {*} data Operation arguments.
   * @returns {Promise<*>} Feature response.
   */
  async request(channel, data) {
    switch(channel) {
      case 'JSLAB_ASSISTANT_SETTINGS_GET':
        return { has_api_key: this.hasApiKey(), status_string: this._credential_status };
      case 'JSLAB_ASSISTANT_SETTINGS_SET':
        return data?.clear ? this.clearApiKey() : this.setApiKey(data?.api_key);
      case 'JSLAB_ASSISTANT_CHAT':
        try {
          return { result: await this.chat(data) };
        } catch(error) {
          return { error: String(error.message || error) };
        }
      case 'JSLAB_ASSISTANT_CANCEL':
        this.cancel();
        await this._host?._interruptAssistantExecution?.();
        return true;
      case 'JSLAB_ASSISTANT_RESET': this.resetConversation(); return true;
      default: throw Error('Unsupported Assistant request.');
    }
  }

  /**
   * Routes declared Assistant tools to host operations without duplicating policy.
   * @param {string} name Declared tool name.
   * @param {Object} args Validated tool arguments.
   * @returns {Promise<*>} Host operation result.
   */
  async callTool(name, args) {
    switch(name) {
      case 'get_application_context': return this.getApplicationContext();
      case 'evaluate_code': return this._host._evaluateAssistantCode(args.code);
      case 'get_help': return this._host._readAssistantHelp(args.query, args.type === 'category' ? 'category' : undefined);
      case 'open_editor': return this._host._openAssistantEditor(args.path);
      case 'replace_editor_selection': return this._host._replaceAssistantSelection(String(args.text || ''));
      default: throw Error('Unknown Assistant tool.');
    }
  }

  /**
   * Collects the same bounded context from the common feature controllers.
   * @returns {Promise<Object>} Main and Editor context snapshots.
   */
  async getApplicationContext() {
    const [main, editor] = await Promise.all([
      this._host._readMainAssistantContext(), this._host._readEditorAssistantContext()
    ]);
    return { main, editor };
  }
}

exports.PRDC_JSLAB_ASSISTANT = PRDC_JSLAB_ASSISTANT;
