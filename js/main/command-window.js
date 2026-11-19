/**
 * @file JSLAB command window module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_CODE_LINT } = require('../code/lint');


const { PRDC_JSLAB_TERMINAL_BUFFER } = require('../other-shared/terminal-buffer');
const { PRDC_JSLAB_COMMAND_WINDOW_MESSAGES } = require('./command-window-messages');
const { PRDC_JSLAB_COMMAND_WINDOW_SETTINGS } = require('./command-window-settings');
const { PRDC_JSLAB_COMMAND_WINDOW_INPUT } = require('./command-window-input');
const { PRDC_JSLAB_COMMAND_WINDOW_INSPECTOR } = require('./command-window-inspector');
const { PRDC_JSLAB_COMMAND_WINDOW_DIARY } = require('./command-window-diary');


/**
 * Class for JSLAB command window.
 */
class PRDC_JSLAB_COMMAND_WINDOW {

  /**
   * Initializes the command window, setting up the UI components, event listeners, and loading settings from storage.
   * @param {object} win The window object representing the owning window controller.
   */
  constructor(win) {
    const { store } = win.platform;
    var obj = this;
    this.win = win;

    this.terminal_cont = document.getElementById('right-panel');

    this.terminal_history_cont;
    this.terminal_options_cont;
    this.messages;
    this.autoscroll = true;
    this.show_timestamp = false;
    this.write_timestamps = true;
    this.log = [];
    this.log_dialog;
    this.settings_dialog;
    this.inspector_input_dialog;
    this.inspector_input_title;
    this.inspector_input_message;
    this.inspector_input_label_1;
    this.inspector_input_label_2;
    this.inspector_input_field_1;
    this.inspector_input_field_2;
    this.inspector_input_row_2;
    this.inspector_input_submit;
    this.inspector_dialog_resolver;
    this.N_messages = 1;
    this.N_messages_max = Infinity;
    this.min_messages_max = 5;
    this.code_input;
    this.code_doc_hover;
    this.textarea;
    this.ignore_output = false;
    this.no_ans = false;
    this.i_history = -1;
    this.diary_enabled = false;
    this.diary_path = undefined;
    this.diary_stream = undefined;
    this.messages_submodule;
    this.settings_submodule;
    this.input_submodule;
    this.inspector;
    this.diary_submodule;

    this.message_buffer;

    this.last_class;
    this.last_tic;

    this.eslint = new PRDC_JSLAB_CODE_LINT();

    // Command window submodules
    this.messages_submodule = new PRDC_JSLAB_COMMAND_WINDOW_MESSAGES(this);
    this.settings_submodule = new PRDC_JSLAB_COMMAND_WINDOW_SETTINGS(this);
    this.input_submodule = new PRDC_JSLAB_COMMAND_WINDOW_INPUT(this);
    this.inspector = new PRDC_JSLAB_COMMAND_WINDOW_INSPECTOR(this);
    this.diary_submodule = new PRDC_JSLAB_COMMAND_WINDOW_DIARY(this);

    // Load settings
    this.autoscroll = store.get('autoscroll') !== false;
    this.show_timestamp = store.get('show_timestamp') === true;
    this.N_messages_max = Number(store.get('N_messages_max'));
    if(!isFinite(this.N_messages_max) || this.N_messages_max == 0) {
      this.N_messages_max = Infinity;
    }
    this.write_timestamps = store.get('write_timestamps') !== false;
    this.min_messages_max = Number(config.TERMINAL_MIN_MESSAGES_MAX);
    if(!isFinite(this.min_messages_max) || this.min_messages_max < 1) {
      this.min_messages_max = 5;
    }

    // Create terminal DOM
    this.messages = $('#right-panel .messages');
    this.messages_scroll_container = $(this.messages).parent()[0];
    var dom_messages_hard_cap = Number(config.TERMINAL_DOM_MESSAGES_HARD_CAP);
    if(!isFinite(dom_messages_hard_cap) || dom_messages_hard_cap < this.min_messages_max) {
      dom_messages_hard_cap = 500;
    }
    var render_chunk_size = Number(config.TERMINAL_RENDER_CHUNK_SIZE);
    if(!isFinite(render_chunk_size) || render_chunk_size < 1) {
      render_chunk_size = 50;
    }
    var render_scroll_threshold = Number(config.TERMINAL_RENDER_SCROLL_THRESHOLD);
    if(!isFinite(render_scroll_threshold) || render_scroll_threshold < 0) {
      render_scroll_threshold = 150;
    }
    this.message_buffer = new PRDC_JSLAB_TERMINAL_BUFFER({
      messages_container: this.messages[0],
      scroll_container: this.messages_scroll_container,
      get_timestamp: function() {
        return obj.getTimestamp();
      },
      is_autoscroll: function() {
        return obj.autoscroll;
      },
      get_max_messages: function() {
        return obj.N_messages_max;
      },
      render_chunk_size: render_chunk_size,
      render_scroll_threshold: render_scroll_threshold,
      dom_messages_hard_cap: dom_messages_hard_cap,
      after_render: function(ctx) {
        var mathjax_nodes = [];
        for(var i = 0; i < ctx.entries.length; i++) {
          if(ctx.entries[i] && ctx.entries[i].needs_mathjax && ctx.elements[i]) {
            mathjax_nodes.push(ctx.elements[i]);
          }
        }
        if(mathjax_nodes.length) {
          Promise.resolve(obj.typesetMath(mathjax_nodes)).catch(error => console.warn(error));
        }
      }
    });
    this.log = this.message_buffer.log;
    this.last_class = this.message_buffer.last_class;
    this.last_tic = this.message_buffer.last_tic;
    this.N_messages = this.message_buffer.N_messages;

    this.messages_submodule.renderWelcomeMessage();
    this.messages_submodule.initConsoleValueHandlers();
    this.input_submodule.initHistoryDialog();
    this.input_submodule.initSettingsDialog();
    this.input_submodule.initLogDialog();
    this.inspector.initInspectorDialog();
    this.input_submodule.bindDocumentShortcuts();
    this.input_submodule.initCodeInput();
    this.input_submodule.bindFocusHandlers();
    this.input_submodule.bindTerminalOptionHandlers();
    this.input_submodule.bindMessageInteractionHandlers();
  }
}

exports.PRDC_JSLAB_COMMAND_WINDOW = PRDC_JSLAB_COMMAND_WINDOW;
