/**
 * @file JSLAB library terminal script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB ui.
 */
var PRDC_TERMINAL_BUFFER_CLASS = window.PRDC_TERMINAL_BUFFER;
if(!PRDC_TERMINAL_BUFFER_CLASS && typeof require !== 'undefined') {
  try {
    PRDC_TERMINAL_BUFFER_CLASS = require('../shared/terminal-buffer').PRDC_TERMINAL_BUFFER;
  } catch(err) {
    console.error(err);
  }
}

class PRDC_JSLAB_TERMINAL {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_TERMINAL class.
   */
  constructor() {
    var obj = this;
    var terminalBufferMissingMsg = '';
    if(typeof language !== 'undefined' && language.currentString) {
      terminalBufferMissingMsg = language.currentString(511);
    }
    
    this.messages = document.getElementById('messages-container');
    this.message_input = document.getElementById('message-input');
    this.autoscroll = true;
    this.show_timestamp = true;
    this.write_timestamps = true;
    this.log_dialog = document.getElementById('log-dialog');
    this.settings_dialog = document.getElementById('settings-dialog');
    this.dialogs = [this.log_dialog, this.settings_dialog]
    this.N_messages = 0;
    this.N_messages_max = Infinity;
    this.min_messages_max = 5;
    this.last_class = undefined;
    this.last_tic = undefined;
    if(!PRDC_TERMINAL_BUFFER_CLASS) {
      throw new Error(terminalBufferMissingMsg);
    }
    var dom_messages_hard_cap = 500;
    var render_chunk_size = 50;
    var render_scroll_threshold = 150;
    var merge_interval_ms = 5;
    if(typeof config !== 'undefined') {
      var config_min_messages_max = Number(config.TERMINAL_MIN_MESSAGES_MAX);
      if(isFinite(config_min_messages_max) && config_min_messages_max >= 1) {
        this.min_messages_max = config_min_messages_max;
      }
      var config_cap = Number(config.TERMINAL_DOM_MESSAGES_HARD_CAP);
      if(isFinite(config_cap) && config_cap >= this.min_messages_max) {
        dom_messages_hard_cap = config_cap;
      }
      var config_chunk_size = Number(config.TERMINAL_RENDER_CHUNK_SIZE);
      if(isFinite(config_chunk_size) && config_chunk_size >= 1) {
        render_chunk_size = config_chunk_size;
      }
      var config_scroll_threshold = Number(config.TERMINAL_RENDER_SCROLL_THRESHOLD);
      if(isFinite(config_scroll_threshold) && config_scroll_threshold >= 0) {
        render_scroll_threshold = config_scroll_threshold;
      }
      var config_merge_interval = Number(config.TERMINAL_MERGE_INTERVAL_MS_SERIAL);
      if(isFinite(config_merge_interval) && config_merge_interval >= 0) {
        merge_interval_ms = config_merge_interval;
      }
    }
    this.message_merge_interval_ms = merge_interval_ms;
    this.message_buffer = new PRDC_TERMINAL_BUFFER_CLASS({
      messages_container: this.messages,
      scroll_container: this.messages,
      get_timestamp: () => this.getTimestamp(),
      is_autoscroll: () => this.autoscroll,
      get_max_messages: () => this.N_messages_max,
      render_chunk_size: render_chunk_size,
      render_scroll_threshold: render_scroll_threshold,
      dom_messages_hard_cap: dom_messages_hard_cap
    });
    this.log = this.message_buffer.log;
    this.last_class = this.message_buffer.last_class;
    this.last_tic = this.message_buffer.last_tic;
    this.N_messages = this.message_buffer.N_messages;

    for(var dialog of this.dialogs) {
      dialog.addEventListener('input', function(e) {
        if(e.key == 'Escape') {
          // ESC
          obj.closeDialog(dialog);
          e.stopPropagation();
          e.preventDefault();
        }
      });
    }
    
    // Terminal settings button click
    document.getElementById('settings').addEventListener('click', () => {
      this.openDialog(this.settings_dialog);
    });
    
    // Terminal timestamp button click
    document.getElementById('timestamp').addEventListener('click', () => {
      this.setTimestamp(!this.show_timestamp);
    });
    this.setTimestamp(this.show_timestamp);
    
    // Terminal auto scroll button click
    document.getElementById('autoscroll').addEventListener('click', () => {
      this.setAutoscroll(!this.autoscroll);
    });
    this.setAutoscroll(this.autoscroll);
    
    // Terminal clear button click
    document.getElementById('clear').addEventListener('click', () => {
      this.clear();
    });
    
    // Terminal save log button click
    document.getElementById('log').addEventListener('click', () => {
      this.openDialog(this.log_dialog);
    });
    
    // Terminal scroll to bottom button click
    document.getElementById('to-bottom').addEventListener('click', () => {
      this.scrollToBottom();
      this.message_input.focus();
      const len = this.message_input.value.length;
      this.message_input.setSelectionRange(len, len);
    });
    
    document.querySelector('#settings-dialog .options-close').addEventListener('click', () => {
      this.closeDialog(this.settings_dialog);
    });
    
    document.getElementById('N-messages-max').value = this.N_messages_max;
    document.querySelector('#settings-dialog .change-settings').addEventListener('click', () => {
      obj.closeDialog(obj.settings_dialog);
      obj.setNMessagesMax(Number(document.getElementById('N-messages-max').value));
    });
    this.setNMessagesMax(this.N_messages_max);
    
    document.querySelector('#log-dialog .options-close').addEventListener('click', () => {
      this.closeDialog(this.log_dialog);
    });
    document.getElementById('write-timestamps').addEventListener('click', function() {
      obj.setWriteTimestamps(this.checked);
    });
    this.setWriteTimestamps(this.write_timestamps);
    
    this.autoResizeInput();
    this.message_input.addEventListener('keydown', () => {
      this.autoResizeInput();
    });
  }
  
  /**
   * Sets options.
   */
  setOptions(opts) {
    if(opts.hasOwnProperty('show_timestamp')) {
      this.setTimestamp(opts.show_timestamp);
    }
    
    if(opts.hasOwnProperty('autoscroll')) {
      this.setAutoscroll(opts.autoscroll);
    }
    
    if(opts.hasOwnProperty('N_messages_max')) {
      this.setNMessagesMax(opts.N_messages_max);
    }
    
    if(opts.hasOwnProperty('write_timestamps')) {
      this.setWriteTimestamps(opts.write_timestamps);
    }
  }
  
  /**
   * Auto resizes input
   */
  autoResizeInput() {
    this.message_input.style.height = 'auto';
    this.message_input.style.height = this.message_input.scrollHeight + 'px';
  }
  
  /**
   * Clears all messages from the command window.
   */
  clear() {
    this.message_buffer.clear();
    this.log = this.message_buffer.log;
    this.last_class = this.message_buffer.last_class;
    this.last_tic = this.message_buffer.last_tic;
    this.N_messages = this.message_buffer.N_messages;
  }
  
  /**
   * Scrolls the command window to the bottom.
   */
  scrollToBottom(show_latest = false) {
    this.message_buffer.scrollToBottom(show_latest);
  }
  
  /**
   * Returns a formatted timestamp string.
   */
  getTimestamp() {
    const date = new Date();
    const pad = (num, size) => ('000' + num).slice(size * -1);
    const time = parseFloat(date.getTime() / 1000).toFixed(3);
    const hours = date.getHours();
    const minutes = Math.floor(time / 60) % 60;
    const seconds = Math.floor(time - minutes * 60);
    const milliseconds = time.slice(-3);
    return pad(hours, 2) + ':' + pad(minutes, 2) + ':' +
           pad(seconds, 2) + '.' + pad(milliseconds, 3);
  }
  
  /**
   * Toggles the visibility of timestamps in the command window.
   */
  setTimestamp(show_timestamp) {
    this.show_timestamp = show_timestamp;
    const timestampButton = document.getElementById('timestamp');
    if(this.show_timestamp) {
      if(this.messages.classList.contains('no-timestamp')) {
        this.messages.classList.remove('no-timestamp');
        timestampButton.classList.add('active');
        timestampButton.setAttribute('title-str', 41);
      }
    } else {
      if(!this.messages.classList.contains('no-timestamp')) {
        this.messages.classList.add('no-timestamp');
        timestampButton.classList.remove('active');
        timestampButton.setAttribute('title-str', 166);
      }
    }
  }
  
  /**
   * Toggles the autoscroll feature.
   */
  setAutoscroll(autoscroll) {
    this.autoscroll = autoscroll;
    const autoscrollButton = document.getElementById('autoscroll');
    if(this.autoscroll) {
      if(!autoscrollButton.classList.contains('active')) {
        autoscrollButton.classList.add('active');
        autoscrollButton.setAttribute('title-str', 42);
      }
    } else {
      if(autoscrollButton.classList.contains('active')) {
        autoscrollButton.classList.remove('active');
        autoscrollButton.setAttribute('title-str', 167);
      }
    }
  }
  
  /**
   * Sets the maximum number of messages to display.
   */
  setNMessagesMax(N_messages_max) {
    if(!N_messages_max) return;
    this.N_messages_max = N_messages_max;
    const nMessagesMaxInput = document.getElementById('N-messages-max');
    if(this.N_messages_max < this.min_messages_max) {
      this.N_messages_max = this.min_messages_max;
    }
    this.message_buffer.enforceRenderedMessagesLimit();
    this.N_messages = this.message_buffer.N_messages;
    if(nMessagesMaxInput.value != this.N_messages_max) {
      nMessagesMaxInput.value = this.N_messages_max;
    }
  }
  
  /**
   * Toggles whether timestamps are written to the log file.
   */
  setWriteTimestamps(write_timestamps) {
    this.write_timestamps = write_timestamps;
    const writeTimestampsInput = document.getElementById('write-timestamps');
    if(this.write_timestamps) {
      if(!writeTimestampsInput.checked) {
        writeTimestampsInput.checked = true;
      }
    } else {
      if(writeTimestampsInput.checked) {
        writeTimestampsInput.checked = false;
      }
    }
  }
  
  /**
   * Adds a message to the terminal output.
   * @param {string} msg_class - The CSS class for the message.
   * @param {string} data - The HTML content of the message.
   * @param {string} [raw] - The raw text data (defaults to data if undefined).
   * @param {boolean} [merge_messages=true] - Whether to merge with the previous message.
   * @returns {HTMLElement} The created message element.
   */
  addMessage(msg_class, data, raw, merge_messages = true) {
    const el = this.message_buffer.addMessage(msg_class, data, raw, {
      merge_messages: merge_messages,
      merge_interval_ms: this.message_merge_interval_ms
    });
    this.log = this.message_buffer.log;
    this.last_class = this.message_buffer.last_class;
    this.last_tic = this.message_buffer.last_tic;
    this.N_messages = this.message_buffer.N_messages;
    return el;
  }
  
  /**
   * Gets the current log of the command window to a file.
   */
  getLog() {
    var obj = this;
    var data = '';
    this.log.forEach(function(x) {
      if(x.class) {
        data += x.class + ' ';
      }
      if(obj.write_timestamps) {
        data += '[' + x.timestamp + '] ';
      }
      data += x.data + '\r\n';
    });
    return data;
  }
  
  /**
   * Opens a specified dialog (e.g., settings or log).
   * For simplicity, fade animations are replaced by immediate show/hide.
   * @param {HTMLElement} dialog - The dialog element to show.
   */
  openDialog(dialog) {
    if(window.getComputedStyle(dialog).display === 'none') {
      document.querySelectorAll('.terminal-dialog').forEach(el => {
        el.style.display = 'none';
      });
      dialog.style.display = 'block';
      dialog.focus();
    }
  }
  
  /**
   * Closes a specified dialog.
   * @param {HTMLElement} dialog - The dialog element to hide.
   */
  closeDialog(dialog) {
    dialog.style.display = 'none';
    this.message_input.focus();
    const len = this.message_input.value.length;
    this.message_input.setSelectionRange(len, len);
  }
}

var terminal = new PRDC_JSLAB_TERMINAL();
