/**
 * @file JSLAB library ui script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for JSLAB ui.
 */
class PRDC_JSLAB_UI {

  /**
   * Initializes an instance of the PRDC_JSLAB_UI class.
   */
  constructor(doc = document) {
    this.document = doc;
    // Connect existing tabs in the owning document.
    var container = doc.querySelector('.ui.tabs-cont');
    if(container) {
      var headers = [...container.querySelectorAll('.ui.tab-name')];
      var panels  = [...container.querySelectorAll('.ui.tab')];

      function showTab(idx) {
        headers.forEach((h, i) => h.classList.toggle('active', i === idx));
        panels.forEach((p, i) => p.style.display = i === idx ? 'block' : 'none');
      }

      var start_idx = headers.findIndex(h => h.classList.contains('active'));
      if(start_idx === -1) {
        start_idx = 0;
      }
      showTab(start_idx);
      headers.forEach((h, i) => h.addEventListener('click', () => showTab(i)));
    }
  }
  /**
   * Adds reusable timestamp-based playback controls to this window.
   * @param {Object} options Timestamps, frame callback and playback options.
   * @returns {PRDC_JSLAB_UI_ANIMATION} Playback controller.
   */
  animation(options) {
    return new PRDC_JSLAB_UI_ANIMATION(this.document, options);
  }

}


/**
 * Controls timestamp-based animation independently of the rendered content.
 */
class PRDC_JSLAB_UI_ANIMATION {

  /**
   * Creates playback controls and renders the initial sample.
   * @param {Document} doc Owning window document.
   * @param {Object} options Time, onFrame, speed, speeds, loop, play and placement.
   */
  constructor(doc, options = {}) {
    this._document = doc;
    this._view = doc.defaultView;
    this._options = options;
    this._time = Array.from(options.time || [], Number);
    if(!this._time.length || this._time.some((value, index) => !Number.isFinite(value) ||
        index && value < this._time[index - 1])) {
      throw new TypeError('Animation timestamps must be finite and ordered.');
    }
    if(options.speed != null && (!Number.isFinite(Number(options.speed)) || Number(options.speed) <= 0) ||
        options.index != null && !Number.isFinite(Number(options.index))) {
      throw new TypeError('Animation speed and index must be finite; speed must be positive.');
    }
    if(options.onFrame != null && typeof options.onFrame != 'function') {
      throw new TypeError('Animation onFrame must be a function.');
    }
    this._index = 0;
    this._speed = 1;
    this._loop = !!options.loop;
    this._disposed = false;
    this._rendering = false;
    this._render_epoch = 0;
    this._pending_index = null;
    this._listeners = [];
    this._clock = options.clock || this._view.performance;
    this._anchor_clock = this._clock.now();
    this._anchor_time = this._time[0];
    this.element = doc.createElement('div');
    this.element.className = 'ui-animation ui-animation-' +
      (['top', 'inline'].includes(options.position) ? options.position : 'bottom');
    if(options.width != null) {
      this.element.style.width = typeof options.width == 'number' ? options.width + 'px' : options.width;
    }
    this._slider = doc.createElement('input');
    this._slider.type = 'range';
    this._slider.className = 'ui-animation-slider';
    this._slider.min = '0';
    this._slider.max = String(this._time.length - 1);
    this._slider.step = '1';
    this._play = doc.createElement('button');
    this._play.type = 'button';
    this._play.className = 'ui-animation-play';
    this._speed_select = doc.createElement('select');
    this._speed_select.className = 'ui-animation-speed';
    for(const rate of options.speeds || [.25, .5, 1, 1.5, 2, 4]) {
      if(Number.isFinite(Number(rate)) && Number(rate) > 0) {
        this._addSpeed(Number(rate));
      }
    }
    this._label = doc.createElement('span');
    this._label.className = 'ui-animation-time';
    this.element.append(this._speed_select, this._play, this._slider, this._label);
    var parent = typeof options.parent == 'string' ? doc.querySelector(options.parent) : options.parent;
    (parent || doc.body).appendChild(this.element);
    this._timer = options.createTimer ? options.createTimer(() => this._tick(),
      Math.max(16, Number(options.interval_ms) || 16), () => {
        this._render_epoch++;
        this._rendering = false;
        this._pending_index = null;
        if(options.defer) {
          options.defer(() => this._updatePlayButton());
        } else {
          this._updatePlayButton();
        }
      }) : this._createTimer();
    this._listen(this._slider, 'input', () => this.seek(Number(this._slider.value)));
    this._listen(this._play, 'click', () => this.playing ? this.pause() : this.play());
    this._listen(this._speed_select, 'change', () => this.setSpeed(Number(this._speed_select.value)));
    this._on_unload = () => this.dispose();
    this._listen(this._view, 'beforeunload', this._on_unload, { once: true });
    this._translate();
    this.setSpeed(options.speed == null ? 1 : options.speed);
    this.seek(options.index == null ? 0 : options.index);
    if(options.play) {
      this.play();
    }
  }

  /**
   * Returns whether the animation is currently playing.
   */
  get playing() {
    return !this._disposed && !!this._timer && this._timer.isRunning();
  }

  /**
   * Returns the selected sample index.
   */
  get index() {
    return this._index;
  }

  /**
   * Returns the current playback speed multiplier.
   */
  get speed() {
    return this._speed;
  }

  /**
   * Returns whether playback repeats at the end.
   */
  get loop() {
    return this._loop;
  }

  /**
   * Selects the latest timestamp due after elapsed playback time.
   * @param {Array<number>} time Ordered timestamps in seconds.
   * @param {number} start_time Playback anchor in seconds.
   * @param {number} elapsed_ms Elapsed monotonic time in milliseconds.
   * @param {boolean} loop Whether playback repeats.
   * @returns {Object} Sample index and end state.
   */
  static frameAt(time, start_time, elapsed_ms, loop) {
    var first = Number(time[0]), last = Number(time[time.length - 1]);
    var target = start_time + Math.max(0, elapsed_ms) / 1000;
    var finished = target >= last;
    if(loop && last > first) {
      target = first + ((target - first) % (last - first));
      finished = false;
    }
    var low = 0, high = time.length;
    while(low < high) {
      var middle = Math.floor((low + high) / 2);
      if(Number(time[middle]) <= target) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return { index: Math.max(0, low - 1), finished: finished };
  }

  /**
   * Starts or resumes playback from the selected sample.
   * @returns {PRDC_JSLAB_UI_ANIMATION} This controller.
   */
  play() {
    if(this._disposed || this.playing || this._time.length < 2) {
      return this;
    }
    if(this._index >= this._time.length - 1) {
      this.seek(0);
    }
    this._anchor_clock = this._clock.now();
    this._anchor_time = this._time[this._index];
    this._timer.start();
    this._updatePlayButton();
    return this;
  }

  /**
   * Pauses playback without removing the controls or rendered content.
   * @returns {PRDC_JSLAB_UI_ANIMATION} This controller.
   */
  pause() {
    this._timer.stop();
    this._updatePlayButton();
    return this;
  }

  /**
   * Selects and renders a sample, preserving the playing or paused state.
   * @param {number} index Zero-based sample index.
   * @returns {PRDC_JSLAB_UI_ANIMATION} This controller.
   */
  seek(index) {
    if(this._disposed) {
      return this;
    }
    if(!Number.isFinite(Number(index))) {
      throw new TypeError('Animation index must be finite.');
    }
    this._anchor_clock = this._clock.now();
    this._index = Math.max(0, Math.min(this._time.length - 1, Math.round(Number(index))));
    this._anchor_time = this._time[this._index];
    this._render(this._index);
    return this;
  }

  /**
   * Changes speed without jumping back to the preceding sample timestamp.
   * @param {number} speed Positive playback multiplier.
   * @returns {PRDC_JSLAB_UI_ANIMATION} This controller.
   */
  setSpeed(speed) {
    speed = Number(speed);
    if(!Number.isFinite(speed) || speed <= 0) {
      throw new TypeError('Animation speed must be positive and finite.');
    }
    var now = this._clock.now();
    if(this.playing) {
      this._anchor_time += (now - this._anchor_clock) * this._speed / 1000;
    }
    this._anchor_clock = now;
    this._speed = speed;
    if(!Array.from(this._speed_select.options).some(option => Number(option.value) == speed)) {
      this._addSpeed(speed);
    }
    this._speed_select.value = String(speed);
    return this;
  }

  /**
   * Enables or disables repeating playback.
   * @param {boolean} loop Whether playback repeats.
   * @returns {PRDC_JSLAB_UI_ANIMATION} This controller.
   */
  setLoop(loop) {
    this._loop = !!loop;
    return this;
  }

  /**
   * Stops playback and removes its controls and window listener.
   */
  dispose() {
    if(this._disposed) {
      return;
    }
    this.pause();
    this._disposed = true;
    this._pending_index = null;
    this._listeners.splice(0).forEach(release => release());
    this.element.remove();
  }

  /**
   * Registers component-owned listeners and retains their explicit disposal functions.
   */
  _listen(target, type, callback, options) {
    var release = this._options.listen && this._options.listen(target, type, callback, options);
    if(!release) {
      target.addEventListener(type, callback, options);
      release = () => target.removeEventListener(type, callback, options);
    }
    this._listeners.push(release);
  }

  /**
   * Creates a window-owned timer when no workspace lifecycle adapter is supplied.
   */
  _createTimer() {
    var id = null;
    return { start: () => {
      if(id !== null) {
        return false;
      }
      id = this._view.setInterval(() => this._tick(), Math.max(16, Number(this._options.interval_ms) || 16));
      return true;
    }, stop: () => {
      if(id !== null) {
        this._view.clearInterval(id);
        id = null;
      }
    }, isRunning: () => id !== null };
  }

  /**
   * Advances playback using timestamps rather than a fixed sample increment.
   */
  _tick() {
    var frame = PRDC_JSLAB_UI_ANIMATION.frameAt(this._time, this._anchor_time,
      (this._clock.now() - this._anchor_clock) * this._speed, this._loop);
    if(frame.index !== this._index) {
      this._index = frame.index;
      this._render(frame.index);
    }
    if(frame.finished) {
      this.pause();
    }
  }

  /**
   * Updates controls and renders samples without overlapping asynchronous frame callbacks.
   */
  _render(index) {
    this._slider.value = String(index);
    var time = this._time[index];
    var label = this._options.formatTime ? this._options.formatTime(time, index) : 't = ' + time.toPrecision(6) + ' ' + (this._options.unit || 's'); /* lang-fixed */
    this._label.textContent = label;
    if(this._rendering) {
      this._pending_index = index;
      return;
    }
    try {
      var result = this._options.onFrame && this._options.onFrame(index, time, this);
      if(result && typeof result.then == 'function') {
        this._rendering = true;
        var epoch = this._render_epoch;
        Promise.resolve(result).catch(error => {
          if(epoch == this._render_epoch) {
            this._error(error);
          }
        }).finally(() => {
          if(epoch != this._render_epoch) {
            return;
          }
          this._rendering = false;
          var pending = this._pending_index;
          this._pending_index = null;
          if(!this._disposed && pending !== null) {
            this._render(pending);
          }
        });
      }
    } catch(error) {
      this._error(error);
    }
  }

  /**
   * Pauses a failed callback and reports its error to the owning application.
   */
  _error(error) {
    this.pause();
    this._pending_index = null;
    if(this._options.onError) {
      this._options.onError(error);
    } else {
      this._view.console.error(error);
    }
  }

  /**
   * Adds a numeric speed choice to the selector.
   */
  _addSpeed(rate) {
    var option = this._document.createElement('option');
    option.value = String(rate);
    option.textContent = rate + '\u00d7'; /* lang-fixed */
    this._speed_select.appendChild(option);
  }

  /**
   * Applies translated control names supplied by the owning application.
   */
  _translate() {
    var language = this._options.language || this._view.language;
    if(language && typeof language.currentString == 'function') {
      this._speed_select.setAttribute('title-str', '679');
      this._speed_select.setAttribute('aria-label-str', '679');
      this._speed_select.title = language.currentString(679);
      this._speed_select.setAttribute('aria-label', this._speed_select.title);
      this._slider.setAttribute('aria-label-str', '696');
      this._slider.setAttribute('aria-label', language.currentString(696));
    }
    this._updatePlayButton();
  }

  /**
   * Reflects playback state in the button glyph and accessible name.
   */
  _updatePlayButton() {
    var playing = this._timer && this._timer.isRunning();
    this._play.textContent = playing ? '\u275a\u275a' : '\u25b6';
    var language = this._options.language || this._view.language;
    if(language && typeof language.currentString == 'function') {
      var id = playing ? 695 : 694;
      this._play.setAttribute('title-str', String(id));
      this._play.setAttribute('aria-label-str', String(id));
      this._play.title = language.currentString(id);
      this._play.setAttribute('aria-label', this._play.title);
    }
  }
}

var ui = typeof document == 'undefined' ? null : new PRDC_JSLAB_UI();
if(typeof module != 'undefined' && module.exports) {
  module.exports.PRDC_JSLAB_UI = PRDC_JSLAB_UI;
  module.exports.PRDC_JSLAB_UI_ANIMATION = PRDC_JSLAB_UI_ANIMATION;
}
