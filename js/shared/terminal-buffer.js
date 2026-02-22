/**
 * @file JSLAB shared terminal buffer and virtualized renderer
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

(function(root, factory) {
  var api = factory();
  if(typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if(root) {
    root.PRDC_TERMINAL_BUFFER = api.PRDC_TERMINAL_BUFFER;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  /**
   * Shared terminal log buffer with windowed DOM rendering.
   */
  class PRDC_TERMINAL_BUFFER {
    /**
     * @param {Object} opts
     * @param {HTMLElement} opts.messages_container
     * @param {HTMLElement} [opts.scroll_container]
     * @param {Function} [opts.get_timestamp]
     * @param {Function} [opts.is_autoscroll]
     * @param {Function} [opts.get_max_messages]
     * @param {Function} [opts.create_entry_element]
     * @param {Function} [opts.after_render]
     * @param {number} [opts.render_chunk_size]
     * @param {number} [opts.render_scroll_threshold]
     * @param {number} [opts.dom_messages_hard_cap]
     */
    constructor(opts = {}) {
      this.messages_container = opts.messages_container;
      this.scroll_container = opts.scroll_container || this.messages_container;
      this.get_timestamp =
        typeof opts.get_timestamp === 'function' ? opts.get_timestamp : function() {
          return '';
        };
      this.is_autoscroll =
        typeof opts.is_autoscroll === 'function' ? opts.is_autoscroll : function() {
          return true;
        };
      this.get_max_messages =
        typeof opts.get_max_messages === 'function' ? opts.get_max_messages : function() {
          return Infinity;
        };
      this.create_entry_element =
        typeof opts.create_entry_element === 'function' ? opts.create_entry_element : null;
      this.after_render =
        typeof opts.after_render === 'function' ? opts.after_render : null;

      this.render_window_start = 0;
      this.render_window_end = 0;
      this.render_chunk_size = Number(opts.render_chunk_size);
      if(!isFinite(this.render_chunk_size) || this.render_chunk_size < 1) {
        this.render_chunk_size = 50;
      }
      this.render_scroll_threshold = Number(opts.render_scroll_threshold);
      if(!isFinite(this.render_scroll_threshold) || this.render_scroll_threshold < 0) {
        this.render_scroll_threshold = 150;
      }
      this.dom_messages_hard_cap = Number(opts.dom_messages_hard_cap);
      if(!isFinite(this.dom_messages_hard_cap) || this.dom_messages_hard_cap < 5) {
        this.dom_messages_hard_cap = 500;
      }
      this.scroll_render_scheduled = false;

      this.log = [];
      this.last_class = undefined;
      this.last_tic = undefined;
      this.N_messages = 0;

      this._on_scroll = this.handleMessagesScroll.bind(this);
      if(this.scroll_container && this.scroll_container.addEventListener) {
        this.scroll_container.addEventListener('scroll', this._on_scroll);
      }
    }

    /**
     * Removes listeners attached by the buffer.
     */
    destroy() {
      if(this.scroll_container && this.scroll_container.removeEventListener &&
          this._on_scroll) {
        this.scroll_container.removeEventListener('scroll', this._on_scroll);
      }
    }

    /**
     * Clears all buffered messages and rendered elements.
     */
    clear() {
      this.log.length = 0;
      this.last_class = undefined;
      this.last_tic = undefined;
      this.render_window_start = 0;
      this.render_window_end = 0;
      this.N_messages = 0;
      if(this.messages_container) {
        this.messages_container.innerHTML = '';
      }
    }

    /**
     * Returns effective max number of rendered message nodes.
     * @returns {number}
     */
    getEffectiveDomLimit() {
      var limit = Number(this.get_max_messages());
      if(!isFinite(limit) || limit <= 0) {
        limit = this.dom_messages_hard_cap;
      }
      limit = Math.floor(limit);
      if(limit < 5) {
        limit = 5;
      }
      return Math.min(limit, this.dom_messages_hard_cap);
    }

    /**
     * Returns currently rendered virtualized message nodes.
     * @returns {Array<HTMLElement>}
     */
    getRenderedMessageNodes() {
      if(!this.messages_container) {
        return [];
      }
      return Array.from(this.messages_container.querySelectorAll('div[data-log-index]'));
    }

    /**
     * Returns number of currently rendered buffered messages.
     * @returns {number}
     */
    getRenderedMessagesCount() {
      return this.render_window_end - this.render_window_start;
    }

    /**
     * Captures a scroll anchor for stable viewport restoration after rerender.
     * @returns {Object|undefined}
     */
    captureScrollAnchor() {
      if(!this.scroll_container) {
        return undefined;
      }
      var nodes = this.getRenderedMessageNodes();
      if(!nodes.length) {
        return undefined;
      }
      var scroll_top = this.scroll_container.scrollTop;
      var anchor_node = nodes[nodes.length - 1];
      for(var i = 0; i < nodes.length; i++) {
        if(nodes[i].offsetTop + nodes[i].offsetHeight > scroll_top) {
          anchor_node = nodes[i];
          break;
        }
      }
      return {
        index: Number(anchor_node.getAttribute('data-log-index')),
        offset: anchor_node.offsetTop - scroll_top
      };
    }

    /**
     * Creates a default message element for a log entry.
     * @param {Object} entry
     * @param {number} index
     * @returns {HTMLElement}
     */
    defaultCreateEntryElement(entry, index) {
      var el = document.createElement('div');
      el.className = entry.class;
      el.setAttribute('data-log-index', String(index));
      el.innerHTML = '<span class="timestamp">' + entry.timestamp + '</span>' + entry.html;
      return el;
    }

    /**
     * Creates a message element for a log entry.
     * @param {Object} entry
     * @param {number} index
     * @returns {HTMLElement}
     */
    createLogEntryElement(entry, index) {
      var el;
      if(this.create_entry_element) {
        el = this.create_entry_element(entry, index);
      }
      if(!el) {
        el = this.defaultCreateEntryElement(entry, index);
      }
      if(!el.getAttribute('data-log-index')) {
        el.setAttribute('data-log-index', String(index));
      }
      return el;
    }

    /**
     * Re-renders the current virtualized window.
     * @param {Object} [anchor]
     */
    renderMessageWindow(anchor) {
      if(!this.messages_container) {
        return;
      }
      this.messages_container.querySelectorAll('div[data-log-index]').forEach(function(node) {
        node.remove();
      });

      if(this.render_window_end <= this.render_window_start) {
        this.N_messages = 0;
        if(this.after_render) {
          this.after_render({
            entries: [],
            elements: [],
            start: this.render_window_start,
            end: this.render_window_end
          });
        }
        return;
      }

      var fragment = document.createDocumentFragment();
      var rendered_entries = [];
      var rendered_elements = [];
      for(var i = this.render_window_start; i < this.render_window_end; i++) {
        var entry = this.log[i];
        if(!entry) {
          continue;
        }
        var el = this.createLogEntryElement(entry, i);
        fragment.appendChild(el);
        rendered_entries.push(entry);
        rendered_elements.push(el);
      }
      this.messages_container.appendChild(fragment);
      this.N_messages = this.getRenderedMessagesCount();

      if(anchor && isFinite(anchor.index) && this.scroll_container) {
        var anchor_el = this.getRenderedElementByIndex(anchor.index);
        if(anchor_el) {
          this.scroll_container.scrollTop = anchor_el.offsetTop - anchor.offset;
        }
      }

      if(this.after_render) {
        this.after_render({
          entries: rendered_entries,
          elements: rendered_elements,
          start: this.render_window_start,
          end: this.render_window_end
        });
      }
    }

    /**
     * Returns rendered element for a specific log index.
     * @param {number} index
     * @returns {HTMLElement|null}
     */
    getRenderedElementByIndex(index) {
      if(!this.messages_container) {
        return null;
      }
      return this.messages_container.querySelector('div[data-log-index="' + index + '"]');
    }

    /**
     * Syncs rendered element HTML back to log entry HTML.
     * @param {HTMLElement|Object} el
     */
    syncLogEntryHtmlFromElement(el) {
      if(!el) {
        return;
      }
      if(el.jquery && el.length) {
        el = el[0];
      }
      if(!el || !el.getAttribute) {
        return;
      }
      var index = Number(el.getAttribute('data-log-index'));
      if(!isFinite(index) || !this.log[index]) {
        return;
      }

      var clone = el.cloneNode(true);
      var ts = clone.querySelector('span.timestamp');
      if(ts) {
        ts.remove();
      }
      this.log[index].html = clone.innerHTML;
    }

    /**
     * Enforces configured rendered message limit.
     */
    enforceRenderedMessagesLimit() {
      var limit = this.getEffectiveDomLimit();
      if(this.getRenderedMessagesCount() <= limit) {
        return;
      }

      if(this.render_window_end >= this.log.length) {
        this.render_window_start = Math.max(0, this.render_window_end - limit);
      } else {
        this.render_window_end = this.render_window_start + limit;
      }
      this.renderMessageWindow();
    }

    /**
     * Scroll handler that loads older/newer chunks.
     */
    handleMessagesScroll() {
      if(this.scroll_render_scheduled) {
        return;
      }

      this.scroll_render_scheduled = true;
      var obj = this;
      var schedule = typeof window !== 'undefined' &&
        typeof window.requestAnimationFrame === 'function' ?
        window.requestAnimationFrame.bind(window) :
        function(fn) { setTimeout(fn, 0); };

      schedule(function() {
        obj.scroll_render_scheduled = false;
        if(!obj.log.length || !obj.scroll_container) {
          return;
        }
        if(obj.getRenderedMessagesCount() === 0) {
          obj.render_window_end = obj.log.length;
          obj.render_window_start = Math.max(0, obj.render_window_end - obj.getEffectiveDomLimit());
          obj.renderMessageWindow();
          return;
        }

        var container = obj.scroll_container;
        var near_top = container.scrollTop <= obj.render_scroll_threshold;
        var near_bottom =
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - obj.render_scroll_threshold;
        var limit = obj.getEffectiveDomLimit();
        var anchor = obj.captureScrollAnchor();

        if(near_top && obj.render_window_start > 0) {
          obj.render_window_start = Math.max(0, obj.render_window_start - obj.render_chunk_size);
          obj.render_window_end = Math.min(obj.log.length, obj.render_window_start + limit);
          obj.renderMessageWindow(anchor);
        } else if(near_bottom && obj.render_window_end < obj.log.length) {
          obj.render_window_end = Math.min(obj.log.length, obj.render_window_end + obj.render_chunk_size);
          obj.render_window_start = Math.max(0, obj.render_window_end - limit);
          obj.renderMessageWindow(anchor);
        }
      });
    }

    /**
     * Adds message into memory log and updates rendered window.
     * @param {string} msg_class
     * @param {string} data
     * @param {string} raw
     * @param {Object} [opts]
     * @returns {HTMLElement|null}
     */
    addMessage(msg_class, data, raw, opts = {}) {
      if(typeof raw === 'undefined') {
        raw = data;
      }
      var merge_messages = Boolean(opts.merge_messages);
      var merge_interval_ms = Number(opts.merge_interval_ms);
      if(!isFinite(merge_interval_ms) || merge_interval_ms < 0) {
        merge_interval_ms = 1;
      }
      var t = typeof performance !== 'undefined' && performance.now ?
        performance.now() : Date.now();
      var el = null;
      var can_merge =
        this.log.length > 0 &&
        msg_class === this.last_class &&
        merge_messages &&
        (t - this.last_tic) <= merge_interval_ms;

      if(can_merge) {
        var last_index = this.log.length - 1;
        this.last_tic = t;
        this.log[last_index].html += data;
        this.log[last_index].data += raw;

        el = this.getRenderedElementByIndex(last_index);
        if(el) {
          el.insertAdjacentHTML('beforeend', data);
        }
      } else {
        var prev_len = this.log.length;
        var ts = this.get_timestamp();
        this.last_class = msg_class;
        this.last_tic = t;
        this.log.push({
          'class': msg_class,
          'timestamp': ts,
          'data': raw,
          'html': data
        });

        var new_index = this.log.length - 1;
        var follow_tail =
          this.is_autoscroll() ||
          this.getRenderedMessagesCount() === 0 ||
          this.render_window_end >= prev_len;

        if(follow_tail) {
          var limit = this.getEffectiveDomLimit();
          this.render_window_end = this.log.length;
          this.render_window_start = Math.max(0, this.render_window_end - limit);
          this.renderMessageWindow();
          el = this.getRenderedElementByIndex(new_index);
        }
      }

      this.N_messages = this.getRenderedMessagesCount();
      if(this.is_autoscroll()) {
        this.scrollToBottom();
      }
      return el;
    }

    /**
     * Scrolls to bottom; optionally forces newest window first.
     * @param {boolean} [show_latest=false]
     */
    scrollToBottom(show_latest = false) {
      if(!this.scroll_container) {
        return;
      }
      if(show_latest && this.log.length && this.render_window_end < this.log.length) {
        var limit = this.getEffectiveDomLimit();
        this.render_window_end = this.log.length;
        this.render_window_start = Math.max(0, this.render_window_end - limit);
        this.renderMessageWindow();
      }
      this.scroll_container.scrollTop = this.scroll_container.scrollHeight;
    }
  }

  return { PRDC_TERMINAL_BUFFER: PRDC_TERMINAL_BUFFER };
});
