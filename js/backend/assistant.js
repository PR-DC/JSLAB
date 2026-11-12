/**
 * @file JSLAB OpenAI Assistant service
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Owns encrypted credentials, OpenAI Responses API calls and JSLAB tool calls.
 */
class PRDC_JSLAB_ASSISTANT {

  /**
   * @param {Object} options Service dependencies.
   */
  constructor(options) {
    this.store = options.store;
    this.safe_storage = options.safe_storage;
    this.fetch = options.fetch || globalThis.fetch;
    this.call_tool = options.call_tool;
    this.model = options.model || 'gpt-6-astra';
    this.previous_response_id = null;
    this.abort_controller = null;
    this.storage_key = 'openai-api-key-encrypted';
  }

  /** Returns whether an encrypted API key exists. */
  hasApiKey() {
    return !!this.store.get(this.storage_key);
  }

  /** Encrypts and stores a new API key without retaining plaintext. */
  setApiKey(token) {
    token = String(token || '').trim();
    if(!token) throw new Error('An OpenAI API key is required.');
    if(!this.safe_storage || !this.safe_storage.isEncryptionAvailable()) {
      throw new Error('Secure credential storage is unavailable on this system.');
    }
    var encrypted = this.safe_storage.encryptString(token).toString('base64');
    this.store.set(this.storage_key, encrypted);
    return true;
  }

  /** Removes the stored API key. */
  clearApiKey() {
    this.store.delete(this.storage_key);
    this.resetConversation();
    return true;
  }

  /** Decrypts the API key only for one main-process request. */
  _getApiKey() {
    var encoded = this.store.get(this.storage_key);
    if(!encoded) throw new Error('Configure an OpenAI API key in Settings.');
    if(!this.safe_storage || !this.safe_storage.isEncryptionAvailable()) {
      throw new Error('Secure credential storage is unavailable on this system.');
    }
    return this.safe_storage.decryptString(Buffer.from(encoded, 'base64'));
  }

  /** Starts a new API conversation. */
  resetConversation() {
    this.previous_response_id = null;
    this.cancel();
  }

  /** Cancels the active HTTP request. */
  cancel() {
    if(this.abort_controller) this.abort_controller.abort();
    this.abort_controller = null;
  }

  /** Returns the tools exposed to the model. */
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

  /** Extracts visible text from a Responses API response. */
  _outputText(response) {
    if(typeof response.output_text == 'string') return response.output_text;
    var parts = [];
    for(const item of response.output || []) {
      if(item.type !== 'message') continue;
      for(const content of item.content || []) {
        if(content.type === 'output_text' && typeof content.text == 'string') parts.push(content.text);
      }
    }
    return parts.join('\n');
  }

  /** Executes one declared model tool. */
  async _executeTool(call) {
    var args;
    try { args = JSON.parse(call.arguments || '{}'); }
    catch(error) { return JSON.stringify({ success: false, error: 'Invalid tool arguments.' }); }
    try {
      return JSON.stringify({ success: true, result: await this.call_tool(call.name, args) });
    } catch(error) {
      return JSON.stringify({ success: false, error: String(error.message || error) });
    }
  }

  /** Sends one JSON request to the Responses API. */
  async _request(token, body) {
    var response = await this.fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer '+token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: this.abort_controller.signal
    });
    var data;
    try { data = await response.json(); }
    catch(error) { throw new Error('OpenAI returned an unreadable response.'); }
    if(!response.ok) throw new Error(data && data.error && data.error.message ||
      'OpenAI request failed with status '+response.status+'.');
    return data;
  }

  /**
   * Sends a user message and resolves all requested JSLAB tools.
   * @param {string} message User message.
   * @returns {Promise<Object>} Assistant reply.
   */
  async chat(message) {
    message = String(message || '').trim();
    if(!message) throw new Error('Enter a message for Assistant.');
    if(this.abort_controller) throw new Error('Assistant is already responding.');
    var token = this._getApiKey();
    this.abort_controller = new AbortController();
    var instructions = [
      'You are Assistant inside JSLAB, a scientific JavaScript desktop environment.',
      'JSLAB scripts use .jsl and run in a persistent scientific workspace, not ordinary Node.js.',
      'Use JSLAB tools when current application state or numerical validation matters.',
      'Consult get_help instead of guessing unfamiliar JSLAB APIs.',
      'Keep answers concise and explain any application changes you request.'
    ].join(' ');
    try {
      var body = { model: this.model, instructions: instructions,
        input: message, tools: this._tools(), store: true };
      if(this.previous_response_id) body.previous_response_id = this.previous_response_id;
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
}

exports.PRDC_JSLAB_ASSISTANT = PRDC_JSLAB_ASSISTANT;
