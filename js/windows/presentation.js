/**
 * @file JSLAB library presentation script
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

window.file_buffers = {};
var has_node = typeof window.process === 'object' &&
   !!(window.process.versions && window.process.versions.electron);
if(has_node) {
  var { ipcRenderer } = require('electron');
}

var is_iframe = window.parent != window;
var is_lazy = new URLSearchParams(window.location.search).has('lazy');

/**
 * Stores file buffer.
 * @param {string} file_path The key for the file.
 * @param {ArrayBuffer} data The file contents.
 */
window.registerFile = function(file_path, data) {
  window.file_buffers[file_path] = atob(data);
}

/**
 * Class for JSLAB presentation.
 */
class PRDC_JSLAB_PRESENTATION {
  
  /**
   * Initializes an instance of the PRDC_JSLAB_PRESENTATION class.
   */
  constructor() {
    var obj = this;
    
    this.config = %presentation_config%;
    this.slides_cont = document.getElementById('slides-cont');
    this._normalizeLayoutHelpers(this.slides_cont);
    this.slides = document.querySelectorAll('slide');
    this.current_slide = -1;
    this.total_slides = this.slides.length;
    this._interpolated = new WeakSet();
    this._animating = false;
    this._resource_promises = {};
    this._failed_resources = new Set();
    this._next_slide_preload_token = 0;
    this._next_slide_preload_job = undefined;

    const style = document.createElement('style');
    style.textContent = `
    @media print {
      slide {
        display: block !important;
        width : ${this.config.slide_width}px;
        height: ${this.config.slide_height}px;
      }
    }`;
    document.head.appendChild(style);
    
    this._buildSlideNav();
    this.stopwatch = new PRDC_JSLAB_PRESENTATION_STOPWATCH();
    
    this._validTransitions = new Set([
      'none', 'fade', 'zoom', 
      'cover', 'uncover',
      'flip', 'flip-x', 'flip-y',
      'slide', 'slide-left','slide-right','slide-up','slide-down',
      'cube', 'cube-left','cube-right','cube-up','cube-down',
      'push', 'push-left','push-right','push-up','push-down',
      
    ]);
    this.transition = this.slides_cont.getAttribute('transition') || 'fade';
    if(!this._validTransitions.has(this.transition)) this.transition = 'fade';
    
    document.addEventListener('keydown', (event) => {
      var key = event.key ? event.key.toLowerCase() : '';
      if(!event.ctrlKey && !event.altKey && !event.shiftKey &&
          event.key == 'F9') {
        event.preventDefault();
        this.stopwatch.toggle();
        return;
      }
      if(event.ctrlKey && key === 's'){
        event.preventDefault();
        this._toggleSlideNav();
      }
      switch(event.key) {
        case 'ArrowRight':
        case 'PageDown':
          this._lastNavKey = 'right';
          obj.nextSlide();
          break;

        case 'ArrowLeft':
        case 'PageUp':
          this._lastNavKey = 'left';
          obj.prevSlide();
          break;

        case 'ArrowDown':
          this._lastNavKey = 'down';
          obj.nextSlide();
          break;

        case 'ArrowUp':
          this._lastNavKey = 'up';
          obj.prevSlide();
          break;
        case 'F11':
          if(has_node) {
            ipcRenderer.sendToHost('data', { key: 'F11' });
          }
          if(is_iframe) {
            window.parent.postMessage({ key: 'F11' }, '*');
          }
          break;
      }
    });
    
    const WHEEL_DEBOUNCE = 250;
    var wheelGuard = false;
    document.addEventListener('wheel', (event) => {
      if(event.target.closest('.js-plotly-plot') ||
        event.target.closest('input.ui') ||
        event.target.closest('scene-3d-json')) return;
      if(Math.abs(event.deltaY) < 10 || wheelGuard) {
        return;
      }

      if(event.deltaY > 0) {
        this._lastNavKey = 'down';
        obj.nextSlide();
      } else {
        this._lastNavKey = 'up';
        obj.prevSlide();
      }

      wheelGuard = true;
      setTimeout(() => (wheelGuard = false), WHEEL_DEBOUNCE);
    }, { passive: true });

    var init_slide = () => {
      var m = window.location.hash.match(/^#s(\d+)$/);
      var wanted = m ? parseInt(m[1], 10) - 1 : 
        this.current_slide > -1 ? this.current_slide : 0;
      this.setSlide(wanted);
    };
    if(document.readyState == 'loading') {
      window.addEventListener('DOMContentLoaded', init_slide, { once: true });
    } else {
      init_slide();
    }

    window.addEventListener('hashchange', () => {
      const m = location.hash.match(/^#s(\d+)$/);
      if(!m) return;
      const idx = parseInt(m[1], 10) - 1;
      if(idx !== this.current_slide) this.showSlide(idx);
    });
    
    window.addEventListener('beforeprint', () => {
      obj._interpolateAllSlides();
    }) 

    window.addEventListener('message', (e) =>{
      if(typeof e.data.set === 'number'){
        obj.setSlide(e.data.set);
      } else if(typeof e.data.show === 'number'){
        obj.showSlide(e.data.show);
      } else if(e.data.toggle_slide_nav) {
        obj._toggleSlideNav();
      } else if(e.data.toggle_stopwatch) {
        obj.stopwatch.toggle();
      }
    });
    
    if(has_node) {
      ipcRenderer.on('data', (e, data) => {
        if(typeof data.set === 'number'){
          obj.setSlide(data.set);
        } else if(typeof data.show === 'number'){
          obj.showSlide(data.show);
        } else if(data.toggle_slide_nav) {
          obj._toggleSlideNav();
        } else if(data.toggle_stopwatch) {
          obj.stopwatch.toggle();
        }
      });
    
      ipcRenderer.sendToHost('data', { ready: this.total_slides });
    }

    this.slides_cont.style.width = this.config.slide_width + 'px';
    this.slides_cont.style.height = this.config.slide_height + 'px';
    
    function scaleSlides() {
      const scale = Math.min(document.body.clientWidth / obj.config.slide_width, 
        document.body.clientHeight / obj.config.slide_height);
      obj.slides_cont.style.transform = `scale(${scale}) translate(-50%, -50%)`;
    }
    window.addEventListener('resize', function(e) {
      scaleSlides();
    });
    scaleSlides();
    
    if(!window._standalone) {
      const ping = () => fetch('/keepalive', 
        { method: 'HEAD', cache: 'no-store', mode: "no-cors" })
      .then((data) => {}).catch((err) => {
        console.log(err);
      }); 

      ping();
      setInterval(ping, 10_000);
    }
    
    this._attachGestureControl();
  }

  /**
   * Shows the slide at the supplied zero-based index.
   * @param {number} index – Index of the <slide> element to activate.
   */
  setSlide(index) {
    if(this._animating) this._stopAllAnimations();
    if(index == this.current_slide) return;
    if(index < 0 || index >= this.slides.length) return;
    this.slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
      if(i === index) {
        slide.style.display = 'block';
      } else {
        this._pauseVideos(slide);
        slide.style.display = 'none';
      }
    });
    this.current_slide = index;
    
    this._updateSlideNav();
    
    const active = this.slides[index];
    if(!this._interpolated.has(active)) {
      this._interpolateSlide(active);
      this._interpolated.add(active);
    }
    this._ensureSlideMath(active);
    
    this._updateHash(index);
    if(has_node) {
      ipcRenderer.sendToHost('data', { slide: index });
    }
    if(is_iframe) {
      window.parent.postMessage({ slide: index }, '*');
    }
    this._lazyRender(this.slides[index]);
    this._scheduleNextSlidePreload();
  }

  /**
   * Shows the slide at the supplied zero-based index with animation.
   * @param {number} index – Index of the <slide> element to activate.
   */
  showSlide(index) {
    if(this._animating) return;
    if(index === this.current_slide) return;
    if(index < 0 || index >= this.slides.length) return;

    var outgoing = this.slides[this.current_slide];
    var incoming = this.slides[index];
    
    this._pauseVideos(outgoing);
    
    var slideOverride = incoming.getAttribute('transition');
    var base = slideOverride || this.transition;

    var forward = index > this.current_slide;
    var navKey = this._lastNavKey || (forward ? 'right' : 'left');
    var t = this._resolveDir(base, navKey, forward);

    if(t == 'none') {
      if(outgoing) {
        outgoing.classList.remove('active');
        outgoing.style.display = 'none';
      }

      incoming.style.display = 'block';
      incoming.classList.add('active');
    } else {
      this._animating = true;
      
      if(outgoing) {
        outgoing.classList.remove('active');
        outgoing.classList.add('slide-out', `${t}-out`);

        outgoing.addEventListener('animationend', () => {
          outgoing.classList.remove('slide-out', `${t}-out`);
          outgoing.style.display = 'none';
        }, { once: true });
      }
    
      incoming.style.display = 'block';
      incoming.classList.add('slide-in', `${t}-in`, 'active');

      incoming.addEventListener('animationend', () => {
        incoming.classList.remove('slide-in', `${t}-in`);
        this._animating = false;
      }, { once: true });
    }
    
    this.current_slide = index;
    
    this._updateSlideNav();
    
    if(!this._interpolated.has(incoming)) {
      this._interpolateSlide(incoming);
      this._interpolated.add(incoming);
    }
    this._ensureSlideMath(incoming);
    
    this._updateHash(index);
    if(has_node) {
      ipcRenderer.sendToHost('data', { slide: index });
    }
    if(is_iframe) {
      window.parent.postMessage({ slide: index }, '*');
    }
    this._lazyRender(this.slides[index]);
    this._scheduleNextSlidePreload();
  }
  
  /**
   * Advances to the next slide (no-op if already on the last one).
   */
  nextSlide() {
    this.showSlide(this.current_slide + 1);
  }

  /**
   * Goes back to the previous slide (no-op if already on the first one).
   */
  prevSlide() {
    this.showSlide(this.current_slide - 1);
  }

  /**
   * Sets transition animation by name
   * @param {string} name – transition animation name.
   */
  setTransition(name) {
    if(this._validTransitions.has(name)) this.transition = name;
  }
    
  /**
   * Returns the current slide’s position as a human-friendly 1-based index.
   * @returns {number} The 1-based index of the slide that is currently active.
   */
  slideNumber() {
    return this.current_slide + 1;
  }

  /**
   * Returns the total number of slides in the presentation.
   * @returns {number} The total count of <slide> elements detected at startup.
   */
  slideCount() {
    return this.total_slides;
  }

  /**
   * Refreshes cached slide references after editor-side DOM updates.
   */
  _refreshSlides() {
    this.slides = document.querySelectorAll('slide');
    this.total_slides = this.slides.length;
    this._updateSlideNav();
  }

  /**
   * Returns whether a custom slide element should render immediately.
   * @param {HTMLElement} el
   * @returns {Boolean}
   */
  _shouldRenderElementNow(el) {
    var slide = el ? el.closest('slide') : undefined;
    return !slide || slide.classList.contains('active');
  }

  /**
   * Resolves a generated presentation resource URL.
   * @param {String} rel_path
   * @returns {String}
   */
  _resourceUrl(rel_path) {
    return new URL(rel_path, window.location.href).href;
  }

  /**
   * Returns whether a generated presentation resource is available.
   * Older presentations may not define these flags, so they default to true.
   * @param {String} key
   * @returns {Boolean}
   */
  _hasPresentationResource(key) {
    if(window.presentation_resources &&
        Object.prototype.hasOwnProperty.call(window.presentation_resources, key)) {
      return !!window.presentation_resources[key];
    }
    return true;
  }

  /**
   * Loads a script resource once and caches the promise.
   * @param {String} key
   * @param {String} rel_path
   * @returns {Promise<Boolean>}
   */
  async _loadScriptOnce(key, rel_path) {
    if(this._failed_resources.has(key)) {
      return false;
    }
    if(this._resource_promises[key]) {
      return this._resource_promises[key];
    }
    this._resource_promises[key] = new Promise((resolve) => {
      var script = document.createElement('script');
      script.src = this._resourceUrl(rel_path);
      script.async = true;
      script.onload = function() {
        resolve(true);
      };
      script.onerror = () => {
        this._failed_resources.add(key);
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return this._resource_promises[key];
  }

  /**
   * Loads the first available script from the supplied candidate paths.
   * @param {String} key
   * @param {String[]} rel_paths
   * @returns {Promise<Boolean>}
   */
  async _loadScriptCandidatesOnce(key, rel_paths) {
    if(this._failed_resources.has(key)) {
      return false;
    }
    if(this._resource_promises[key]) {
      return this._resource_promises[key];
    }
    this._resource_promises[key] = (async() => {
      for(var rel_path of rel_paths) {
        var loaded = await new Promise((resolve) => {
          var script = document.createElement('script');
          script.src = this._resourceUrl(rel_path);
          script.async = true;
          script.onload = function() {
            resolve(true);
          };
          script.onerror = function() {
            script.remove();
            resolve(false);
          };
          document.head.appendChild(script);
        });
        if(loaded) {
          return true;
        }
      }
      this._failed_resources.add(key);
      return false;
    })();
    return this._resource_promises[key];
  }

  /**
   * Loads PDF.js on demand.
   * @returns {Promise<Boolean>}
   */
  async ensurePdfJs() {
    if(!this._hasPresentationResource('pdfjs')) return false;
    if(window.pdfjsLib) {
      if(pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          this._resourceUrl('./res/pdf.worker.min.js');
      }
      return true;
    }
    var loaded = await this._loadScriptOnce('pdfjs', './res/pdf.min.js');
    if(loaded && window.pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        this._resourceUrl('./res/pdf.worker.min.js');
    }
    return !!window.pdfjsLib;
  }

  /**
   * Loads Plotly on demand.
   * @returns {Promise<Boolean>}
   */
  async ensurePlotly() {
    if(!this._hasPresentationResource('plotly')) return false;
    if(window.Plotly) return true;
    await this._loadScriptCandidatesOnce('plotly', [
      './res/plotly-3.3.0.min.js',
      './res/plotly-2.24.2.min.js'
    ]);
    return !!window.Plotly;
  }

  /**
   * Loads MathJax on demand.
   * @returns {Promise<Boolean>}
   */
  async ensureMathJax() {
    if(!this._hasPresentationResource('mathjax')) return false;
    if(window.MathJax && typeof MathJax.typesetPromise == 'function') {
      if(MathJax.startup && MathJax.startup.promise &&
          typeof MathJax.startup.promise.then == 'function') {
        await MathJax.startup.promise;
      }
      return true;
    }
    var config_loaded = await this._loadScriptOnce('mathjax-config',
      './res/mathjax-config.js');
    if(!config_loaded) return false;
    var mathjax_loaded = await this._loadScriptCandidatesOnce('mathjax-runtime', [
      './res/MathJax-3.2.0/tex-mml-chtml.js',
      './res/tex-mml-chtml-3.2.0/tex-mml-chtml-3.2.0.js'
    ]);
    if(!mathjax_loaded || !window.MathJax) {
      return false;
    }
    if(MathJax.startup && MathJax.startup.promise &&
        typeof MathJax.startup.promise.then == 'function') {
      await MathJax.startup.promise;
    }
    return typeof MathJax.typesetPromise == 'function';
  }

  /**
   * Loads THREE on demand for non-standalone presentations.
   * @returns {Promise<Boolean>}
   */
  async ensureThree() {
    if(!this._hasPresentationResource('three')) return false;
    if(window.THREE) return true;
    if(window._standalone) return false;
    if(this._failed_resources.has('three')) {
      return false;
    }
    if(!this._resource_promises.three) {
      this._resource_promises.three = import(
        this._resourceUrl('./res/three.js-r162/build/three.module.js')
      ).then((THREE) => {
        window.THREE = THREE;
        return true;
      }).catch((err) => {
        this._failed_resources.add('three');
        console.error(language.currentString(360), err);
        return false;
      });
    }
    return this._resource_promises.three;
  }

  /**
   * Returns whether the slide likely contains LaTeX markup.
   * @param {HTMLElement} slide
   * @returns {Boolean}
   */
  _slideMayContainMath(slide) {
    if(!slide) return false;
    var html = slide.innerHTML || '';
    return html.includes('\\(') ||
      html.includes('\\[') ||
      html.includes('$$') ||
      /(^|[^\\])\$[^$\s]/.test(html) ||
      html.includes('\\begin{');
  }

  /**
   * Starts loading regular slide assets in the background.
   * @param {HTMLElement} slide
   */
  _primeSlideAssets(slide) {
    if(!slide) return;
    slide.querySelectorAll('img').forEach((img) => {
      if(img.loading == 'lazy') {
        img.loading = 'eager';
      }
      if(typeof img.decode == 'function' && img.complete && img.naturalWidth !== 0) {
        img.decode().catch(function() {});
      }
    });
    slide.querySelectorAll('video').forEach((video) => {
      if(video.preload == 'none') {
        video.preload = 'auto';
      }
      try {
        video.load();
      } catch(err) {}
    });
  }

  /**
   * Preloads a slide in the background so navigation can be instant later.
   * @param {Number} index
   * @param {Number} token
   * @returns {Promise<Boolean>}
   */
  async _preloadSlide(index, token = this._next_slide_preload_token) {
    if(index < 0 || index >= this.slides.length) return false;
    var slide = this.slides[index];
    if(!slide || slide._preloaded) return true;
    if(slide._preload_promise) return slide._preload_promise;
    slide._preload_promise = (async() => {
      this._primeSlideAssets(slide);
      await this._lazyRender(slide);
      await this._waitForSlideAssets(slide);
      await new Promise(resolve => {
        requestAnimationFrame(function() {
          requestAnimationFrame(resolve);
        });
      });
      slide._preloaded = true;
      return true;
    })().catch(function() {
      return false;
    }).finally(() => {
      slide._preload_promise = null;
    });
    return slide._preload_promise;
  }

  /**
   * Returns the background preload order, starting from the next slide.
   * @returns {Number[]}
   */
  _getPreloadOrder() {
    var order = [];
    if(this.current_slide < 0 || this.total_slides <= 1) {
      return order;
    }
    for(var offset = 1; offset < this.total_slides; offset++) {
      order.push((this.current_slide + offset) % this.total_slides);
    }
    return order;
  }

  /**
   * Cancels any scheduled background preload job.
   */
  _cancelScheduledPreloadJob() {
    if(this._next_slide_preload_job === undefined) {
      return;
    }
    if(typeof cancelIdleCallback == 'function') {
      cancelIdleCallback(this._next_slide_preload_job);
    } else {
      clearTimeout(this._next_slide_preload_job);
    }
    this._next_slide_preload_job = undefined;
  }

  /**
   * Schedules one background preload step without blocking current slide display.
   * @param {Number[]} order
   * @param {Number} token
   * @param {Number} position
   */
  _schedulePreloadStep(order, token, position) {
    if(position >= order.length) {
      return;
    }
    var run = async() => {
      this._next_slide_preload_job = undefined;
      if(token != this._next_slide_preload_token) {
        return;
      }
      await this._preloadSlide(order[position], token);
      if(token != this._next_slide_preload_token) {
        return;
      }
      this._schedulePreloadStep(order, token, position + 1);
    };
    if(typeof requestIdleCallback == 'function') {
      this._next_slide_preload_job = requestIdleCallback(function() {
        void run();
      }, { timeout: position === 0 ? 120 : 250 });
    } else {
      this._next_slide_preload_job = setTimeout(function() {
        void run();
      }, position === 0 ? 60 : 120);
    }
  }

  /**
   * Schedules background preload of the remaining slide deck while the current slide is shown.
   */
  _scheduleNextSlidePreload() {
    if(is_lazy) {
      return;
    }
    this._next_slide_preload_token += 1;
    var token = this._next_slide_preload_token;
    var order = this._getPreloadOrder();
    this._cancelScheduledPreloadJob();
    if(!order.length) {
      return;
    }
    this._schedulePreloadStep(order, token, 0);
  }

  /**
   * Marks legacy HTML layout helpers without affecting SVG <line> elements.
   * @param {HTMLElement} root
   */
  _normalizeLayoutHelpers(root) {
    if(!root || typeof root.querySelectorAll !== 'function') return;
    var html_namespace = 'http://www.w3.org/1999/xhtml';
    root.querySelectorAll('line').forEach(el => {
      if(el.namespaceURI === html_namespace) {
        el.classList.add('presentation-line');
      }
    });
  }

  /**
   * Parses slide HTML into a slide element.
   * @param {String} slide_html
   * @returns {HTMLElement|null}
   */
  _parseSlideHtml(slide_html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = String(slide_html).trim();
    this._normalizeLayoutHelpers(wrap);
    return wrap.querySelector('slide');
  }

  /**
   * Replaces a single slide in-place without reloading the document.
   * @param {Number} index
   * @param {String} slide_html
   * @returns {Number}
   */
  replaceSlide(index, slide_html) {
    if(index < 0 || index >= this.slides.length) return this.current_slide;
    var slide = this._parseSlideHtml(slide_html);
    if(!slide) return this.current_slide;
    if(this._animating) this._stopAllAnimations();
    this.slides[index].replaceWith(slide);
    this._interpolated = new WeakSet();
    this._refreshSlides();
    this.current_slide = -1;
    this.setSlide(Math.max(0, Math.min(index, this.total_slides - 1)));
    return this.current_slide;
  }

  /**
   * Replaces the full slide list in-place without reloading the document.
   * @param {String} slides_html
   * @param {Number} active_index
   * @returns {Number}
   */
  replaceSlides(slides_html, active_index) {
    if(this._animating) this._stopAllAnimations();
    this.slides_cont.innerHTML = String(slides_html);
    this._normalizeLayoutHelpers(this.slides_cont);
    this._interpolated = new WeakSet();
    this._refreshSlides();
    this.current_slide = -1;
    if(this.total_slides) {
      this.setSlide(Math.max(0, Math.min(active_index, this.total_slides - 1)));
    }
    return this.current_slide;
  }
  
  /**
   * Returns size in pixels based on input string
   * @param {string} Size in vw, vh or % format.
   * @returns {number} Size in pixels.
   */
  toPixels(str, ref) {
    if(!str) return 0;
    if(str.endsWith('vw')) return this.config.slide_width * parseFloat(str) / 100;
    if(str.endsWith('vh')) return this.config.slide_height * parseFloat(str) / 100;
    if(str.endsWith('%')) {
      if(ref == 'width') {
         return this.config.slide_width * parseFloat(str) / 100;
      } else if(ref == 'height') {
        return this.config.slide_height * parseFloat(str) / 100;
      }
    }
    return parseFloat(str);
  }
  
  /**
   * Returns when global variable becomes defined
   * @param {string} prop - Name of variable
   */
  async waitForGlobal(prop) {
    if(!window[prop]) {
      await new Promise(resolve => {
        const check = () => {
          if(window[prop]) return resolve();
          requestAnimationFrame(check);
        };
        check();
      });
    }
  }
  
  /**
   * Builds slides navigation.
   */
  _buildSlideNav() {
    var html = `
      <div id="first-slide" class="button" title="${language.currentString(315)}">|⏴</div>
      <div id="prev-slide" class="button" title="${language.currentString(316)}">⏴</div>
      <input id="set-slide" type="number" min="1" step="1">
      <span id="total-slides">/ 0</span>
      <div id="next-slide" class="button" title="${language.currentString(317)}">⏵</div>
      <div id="last-slide" class="button" title="${language.currentString(318)}">⏵|</div>`;
    
    this.slide_nav = document.createElement('div');
    this.slide_nav.id = 'slide-controls';
    this.slide_nav.innerHTML = html;
    this.slide_nav.hidden = true;
    document.body.appendChild(this.slide_nav);

    this.slide_nav.querySelector('#first-slide').onclick = ()=> this.setSlide(0);
    this.slide_nav.querySelector('#prev-slide').onclick = ()=> this.prevSlide();
    this.slide_nav.querySelector('#next-slide').onclick = ()=> this.nextSlide();
    this.slide_nav.querySelector('#last-slide').onclick = ()=> this.setSlide(this.total_slides - 1);

    this.slide_nav_input = this.slide_nav.querySelector('input');
    this.slide_nav_input.onchange = e => {
      this.setSlide((+this.slide_nav_input.value || 1) - 1);
    };
    this.slide_nav_total = this.slide_nav.querySelector('#total-slides');
  
    this._updateSlideNav();
  }
  
  /**
   * Builds slides navigation.
   */
  _toggleSlideNav(){
    this.slide_nav.hidden = !this.slide_nav.hidden;
    if(!this.slide_nav.hidden){
      this.slide_nav_input.focus(); 
      this.slide_nav_input.select();
    }
  }
  
  /**
   * Builds slides navigation.
   */
  _updateSlideNav(){
    this.slide_nav_input.value = this.slideNumber();
    this.slide_nav_total.textContent = `/ ${this.total_slides}`;
  }

  /**
   * Synchronises the URL hash with the currently visible slide.
   * Uses history.replaceState so it never clutters the browser history.
   * @param {number} idx – zero-based slide index.
   */
  _updateHash(idx) {
    const newHash = `#s${idx + 1}`;
    if(location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }
  }

  /**
   * Ensures LaTeX on the supplied slide is typeset once.
   * @param {HTMLElement} slide
   * @returns {Promise<void>}
   */
  async _ensureSlideMath(slide) {
    if(!slide || slide._math_typeset) return;
    if(slide._math_typeset_promise) return slide._math_typeset_promise;
    slide._math_typeset_promise = this.ensureMathJax()
      .then((ready) => {
        if(ready) {
          return this._typesetMath(slide);
        }
      })
      .then(() => {
        slide._math_typeset = true;
      })
      .finally(() => {
        slide._math_typeset_promise = null;
      });
    return slide._math_typeset_promise;
  }

  /**
   * Typesets LaTeX with the generated MathJax 3 runtime.
   * @param {HTMLElement} root
   * @returns {Promise<void>}
   */
  async _typesetMath(root) {
    if(!window.MathJax || typeof MathJax.typesetPromise !== 'function') return;
    if(MathJax.startup && MathJax.startup.promise &&
        typeof MathJax.startup.promise.then === 'function') {
      await MathJax.startup.promise;
    }
    await MathJax.typesetPromise(root ? [root] : undefined);
  }

  /**
   * Lazy-render MathJax, <img-pdf> and <plot-json> elements that
   * live inside the currently visible slide.
   * @param {HTMLElement} slide – the active <slide> element
   */
  async _lazyRender(slide) {
    if(!slide) return;
    var tasks = [];
    slide.querySelectorAll('img-pdf, plot-json, scene-3d-json').forEach(el => {
      if(typeof el._render !== 'function') return;
      el._lazyRendered = true;
      if(el._render_promise) {
        tasks.push(Promise.resolve(el._render_promise));
      } else if(!el._finished_loading) {
        tasks.push(Promise.resolve(el._render()));
      }
    });
    tasks.push(this._ensureSlideMath(slide));
    await Promise.allSettled(tasks);
  }

  /**
   * Waits for regular slide assets such as images, fonts, and videos.
   * @param {HTMLElement} slide
   * @returns {Promise<void>}
   */
  async _waitForSlideAssets(slide) {
    if(!slide) return;

    var tasks = [];

    if(document.fonts && typeof document.fonts.ready == 'object') {
      tasks.push(document.fonts.ready);
    }

    slide.querySelectorAll('img').forEach((img) => {
      if(img.complete && img.naturalWidth !== 0) {
        return;
      }
      tasks.push(new Promise((resolve) => {
        var done = function() {
          img.removeEventListener('load', done);
          img.removeEventListener('error', done);
          resolve();
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }));
    });

    slide.querySelectorAll('video').forEach((video) => {
      if(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }
      tasks.push(new Promise((resolve) => {
        var done = function() {
          video.removeEventListener('loadeddata', done);
          video.removeEventListener('error', done);
          resolve();
        };
        video.addEventListener('loadeddata', done, { once: true });
        video.addEventListener('error', done, { once: true });
      }));
    });

    if(tasks.length) {
      await Promise.allSettled(tasks);
    }
  }

  /**
   * Returns whether the slide still has pending async render work.
   * @param {HTMLElement} slide
   * @returns {Boolean}
   */
  _isSlideReadyForCapture(slide) {
    if(!slide) return false;

    if(document.fonts && document.fonts.status &&
        document.fonts.status != 'loaded') {
      return false;
    }

    for(var el of slide.querySelectorAll('img-pdf, plot-json, scene-3d-json')) {
      if(el._render_promise || !el._finished_loading) {
        return false;
      }
    }

    for(var img of slide.querySelectorAll('img')) {
      if(!img.complete || img.naturalWidth === 0) {
        return false;
      }
    }

    for(var video of slide.querySelectorAll('video')) {
      if(video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return false;
      }
    }

    return true;
  }

  /**
   * Waits until the slide and its async content are stable enough to capture.
   * @param {HTMLElement} slide
   * @param {Number} timeout_ms
   * @returns {Promise<Boolean>}
   */
  async waitForSlideReadyForCapture(slide, timeout_ms = 5000) {
    if(!slide) return false;
    var start = Date.now();
    while(true) {
      await this._lazyRender(slide);
      await this._waitForSlideAssets(slide);
      await new Promise(resolve => {
        requestAnimationFrame(function() {
          requestAnimationFrame(resolve);
        });
      });
      if(this._isSlideReadyForCapture(slide)) {
        return true;
      }
      if(Date.now() - start >= timeout_ms) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  /**
   * Prepares a slide for thumbnail capture.
   * @param {Number} index
   * @returns {Promise<number>}
   */
  async prepareSlideForCapture(index) {
    if(index < 0 || index >= this.slides.length) {
      return { current_slide: this.current_slide, ready: false };
    }
    if(index != this.current_slide) {
      this.setSlide(index);
    }
    var slide = this.slides[index];
    var ready = await this.waitForSlideReadyForCapture(slide, 8000);
    return { current_slide: this.current_slide, ready: ready };
  }
  
  /**
   * Pauses every <video> element inside the given slide.
   * @param {HTMLElement} slide
   */
  _pauseVideos(slide) {
    if (!slide) return;
    slide.querySelectorAll('video').forEach(v => {
      try {
        v.pause();
      } catch (_) {}
    });
  }
  
  /**
   * Replaces every ${expr} text placeholder inside *root*
   * with the evaluated value of *expr* in the window scope.
   * @param {HTMLElement} root – Slide element to interpolate.
   */
  _interpolateSlide(root) {
    const AVOID = new Set(['SCRIPT', 'STYLE']);
    const re = /\$\{([^}]+)\}/g;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: n =>
          AVOID.has(n.parentNode.tagName)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT
      }
    );

    for(let node; (node = walker.nextNode()); ) {
      const src = node.nodeValue;
      if(!re.test(src)) continue;
      re.lastIndex = 0;

      const out = src.replace(re, (_, expr) => {
        try {
          const fn  = new Function(`with (window) { return (${expr}); }`);
          const val = fn.call(window);
          return val == null ? '' : String(val);
        } catch (err) {
          return `\${${expr}}`;
        }
      });

      if(out !== src) node.nodeValue = out;
    }
  }
  
  /**
   * Calls _interpolateSlide method for each slide
   */
  _interpolateAllSlides() {
    var current_slide = this.current_slide;
    for(var i = 0; i < this.slideCount(); i++) {
      this.setSlide(i);
    };
    this.setSlide(current_slide);
  }

  /**
   * Removes all “-in/-out” classes from slide and hard-stops its animation.
   * @param {HTMLElement} el – slide element.
   */
  _clearAnimClasses(el) {
    el.classList.forEach(c => {
      if(c.endsWith('-in') || c.endsWith('-out')) el.classList.remove(c);
    });
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  /**
   * Stops all slides that may be mid-transition.
   */
  _stopAllAnimations() {
    this.slides.forEach(s => this._clearAnimClasses(s));
    this._animating = false;
  }

  /**
   * Expands a base transition into a direction-specific variant.
   * @param base    {string}  e.g. "slide", "flip", "cover"
   * @param navKey  {string}  "left" | "right" | "up" | "down"
   * @param forward {boolean} true when index grows
   */
  _resolveDir(base, navKey, forward) {
    if(/-(left|right|up|down)$/.test(base)) return base;
    if(base === 'flip') {
      return (navKey === 'up' || navKey === 'down') ? 'flip-x' : 'flip-y';
    }
    if(base === 'slide' || base === 'cube' || base === 'push') {
      if(navKey === 'up')   return `${base}-down`; 
      if(navKey === 'down') return `${base}-up`;
      return `${base}-${forward ? 'left' : 'right'}`;
    }
    if(base === 'cover' || base === 'uncover') {
      if(navKey === 'up')   return `${base}-up`;
      if(navKey === 'down') return `${base}-down`;
      return `${base}-${forward ? 'left' : 'right'}`;
    }
    return base;
  }
  
  /**
   * Attaches gesture control
   */
  _attachGestureControl() {
    let startX = 0, startY = 0, tracking = false;
    const PX_THRESHOLD = 40;
    const slidesArea = this.slides_cont;

    slidesArea.addEventListener('pointerdown', e => {
      if(e.target.closest('.js-plotly-plot') ||
        e.target.closest('input.ui') ||
        e.target.closest('scene-3d-json')) return;
      if(e.pointerType !== 'mouse' || e.buttons === 1) {
        tracking = true;
        startX = e.clientX;
        startY = e.clientY;
      }
    }, { passive: true });

    slidesArea.addEventListener('pointerup', e => {
      if(e.target.closest('.js-plotly-plot') ||
        e.target.closest('input.ui') ||
        e.target.closest('scene-3d-json')) return;
      if(!tracking) return;
      tracking = false;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > PX_THRESHOLD) {
        if(dx < 0) {
          this._lastNavKey = 'right';
          this.nextSlide();
        } else {
          this._lastNavKey = 'left';
          this.prevSlide();
        }
      } else if(Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > PX_THRESHOLD) {
        if(dy < 0) {
          this._lastNavKey = 'up';
          this.prevSlide();
        } else {
          this._lastNavKey = 'down';
          this.nextSlide();
        }
      }
    }, { passive: true });
    slidesArea.addEventListener('pointercancel', () => { tracking = false; });
  }
}

/**
 * Class for presentation stopwatch overlay.
 */
class PRDC_JSLAB_PRESENTATION_STOPWATCH {
  
  /**
   * Initializes a stopwatch overlay.
   */
  constructor() {
    this.elapsed_ms = 0;
    this.started_at = 0;
    this.interval = null;
    this.min_width = 80;
    this.min_height = 36;
    
    this._build();
    this._update();
  }
  
  /**
   * Starts counting elapsed time.
   */
  start() {
    if(this.interval) return;
    this.started_at = Date.now();
    this.interval = setInterval(() => this._update(), 250);
    this._update();
  }
  
  /**
   * Stops counting elapsed time.
   */
  stop() {
    if(!this.interval) return;
    this.elapsed_ms += Date.now() - this.started_at;
    clearInterval(this.interval);
    this.interval = null;
    this._update();
  }
  
  /**
   * Resets elapsed time.
   */
  reset() {
    this.elapsed_ms = 0;
    if(this.interval) {
      this.started_at = Date.now();
    }
    this._update();
  }
  
  /**
   * Shows stopwatch.
   */
  show() {
    this.el.hidden = false;
    this._fitText();
  }
  
  /**
   * Hides stopwatch.
   */
  hide() {
    this.el.hidden = true;
    this._hideMenu();
  }
  
  /**
   * Toggles stopwatch visibility.
   */
  toggle() {
    if(this.el.hidden) {
      this.show();
    } else {
      this.hide();
    }
  }
  
  /**
   * Builds stopwatch DOM and events.
   */
  _build() {
    var style = document.createElement('style');
    style.textContent = `
      #presentation-stopwatch {
        position: fixed;
        top: 10px;
        left: 10px;
        width: 116px;
        height: 50px;
        min-width: 80px;
        min-height: 36px;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        background: rgba(0, 0, 0, .72);
        border: 1px solid rgba(255, 255, 255, .35);
        border-radius: 4px;
        box-sizing: border-box;
        box-shadow: 0 6px 18px rgba(0, 0, 0, .28);
        cursor: move;
        user-select: none;
        font-family: Arial, sans-serif;
        font-variant-numeric: tabular-nums;
      }
      #presentation-stopwatch[hidden] {
        display: none;
      }
      #presentation-stopwatch .time {
        pointer-events: none;
      }
      #presentation-stopwatch .resize-handle {
        position: absolute;
        width: 14px;
        height: 14px;
      }
      #presentation-stopwatch .resize-handle.nw {
        top: -2px;
        left: -2px;
        cursor: nwse-resize;
      }
      #presentation-stopwatch .resize-handle.ne {
        top: -2px;
        right: -2px;
        cursor: nesw-resize;
      }
      #presentation-stopwatch .resize-handle.sw {
        bottom: -2px;
        left: -2px;
        cursor: nesw-resize;
      }
      #presentation-stopwatch .resize-handle.se {
        right: -2px;
        bottom: -2px;
        cursor: nwse-resize;
      }
      #presentation-stopwatch-menu {
        position: fixed;
        z-index: 10001;
        display: none;
        min-width: 120px;
        padding: 4px;
        color: #1f1f1f;
        background: #fdfdfd;
        border: 1px solid #cfcfcf;
        border-radius: 6px;
        font: 13px "Segoe UI", Arial, sans-serif;
        box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
        user-select: none;
      }
      #presentation-stopwatch-menu .item {
        padding: 5px 26px 5px 12px;
        border: 1px solid transparent;
        border-radius: 3px;
        cursor: pointer;
        white-space: nowrap;
      }
      #presentation-stopwatch-menu .item:hover {
        background: #e5f3ff;
        border-color: #c7e2ff;
      }`;
    document.head.appendChild(style);
    
    this.el = document.createElement('div');
    this.el.id = 'presentation-stopwatch';
    this.el.hidden = true;
    this.el.innerHTML = `
      <span class="time"></span>
      <span class="resize-handle nw" data-corner="nw"></span>
      <span class="resize-handle ne" data-corner="ne"></span>
      <span class="resize-handle sw" data-corner="sw"></span>
      <span class="resize-handle se" data-corner="se"></span>`;
    this.time_el = this.el.querySelector('.time');
    document.body.appendChild(this.el);
    
    this.menu = document.createElement('div');
    this.menu.id = 'presentation-stopwatch-menu';
    this.menu.innerHTML = `
      <div class="item" data-action="start">Start</div>
      <div class="item" data-action="stop">Stop</div>
      <div class="item" data-action="reset">Reset</div>`;
    document.body.appendChild(this.menu);
    
    this.el.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._showMenu(e.clientX, e.clientY);
    });
    this.menu.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.menu.addEventListener('click', (e) => {
      var item = e.target.closest('.item');
      if(!item) return;
      if(item.dataset.action == 'start') {
        this.start();
      } else if(item.dataset.action == 'stop') {
        this.stop();
      } else if(item.dataset.action == 'reset') {
        this.reset();
      }
      this._hideMenu();
    });
    document.addEventListener('pointerdown', (e) => {
      if(!this.menu.contains(e.target)) {
        this._hideMenu();
      }
    });
    document.addEventListener('keydown', (e) => {
      if(e.key == 'Escape') {
        this._hideMenu();
      }
    });
    
    this._fitText();
  }
  
  /**
   * Handles pointer down for drag or resize.
   * @param {PointerEvent} e
   */
  _onPointerDown(e) {
    if(e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this._hideMenu();
    
    var corner = e.target.dataset ? e.target.dataset.corner : '';
    if(corner) {
      this._startResize(e, corner);
    } else {
      this._startDrag(e);
    }
  }
  
  /**
   * Starts moving stopwatch.
   * @param {PointerEvent} e
   */
  _startDrag(e) {
    var rect = this.el.getBoundingClientRect();
    var start_x = e.clientX;
    var start_y = e.clientY;
    
    var move = (event) => {
      this._applyBox(
        rect.left + event.clientX - start_x,
        rect.top + event.clientY - start_y,
        rect.width,
        rect.height
      );
    };
    var up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }
  
  /**
   * Starts resizing stopwatch.
   * @param {PointerEvent} e
   * @param {String} corner
   */
  _startResize(e, corner) {
    var rect = this.el.getBoundingClientRect();
    var start_x = e.clientX;
    var start_y = e.clientY;
    
    var move = (event) => {
      var dx = event.clientX - start_x;
      var dy = event.clientY - start_y;
      var left = rect.left;
      var top = rect.top;
      var width = rect.width;
      var height = rect.height;
      
      if(corner.includes('e')) {
        width = rect.width + dx;
      }
      if(corner.includes('s')) {
        height = rect.height + dy;
      }
      if(corner.includes('w')) {
        width = rect.width - dx;
        left = rect.right - Math.max(width, this.min_width);
      }
      if(corner.includes('n')) {
        height = rect.height - dy;
        top = rect.bottom - Math.max(height, this.min_height);
      }
      
      this._applyBox(left, top, width, height);
    };
    var up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }
  
  /**
   * Applies clamped stopwatch box.
   * @param {Number} left
   * @param {Number} top
   * @param {Number} width
   * @param {Number} height
   */
  _applyBox(left, top, width, height) {
    width = Math.max(this.min_width, Math.min(width, window.innerWidth));
    height = Math.max(this.min_height, Math.min(height, window.innerHeight));
    left = Math.max(0, Math.min(left, window.innerWidth - width));
    top = Math.max(0, Math.min(top, window.innerHeight - height));
    
    this.el.style.left = left + 'px';
    this.el.style.top = top + 'px';
    this.el.style.width = width + 'px';
    this.el.style.height = height + 'px';
    this._fitText();
  }
  
  /**
   * Fits time text into current box.
   */
  _fitText() {
    var rect = this.el.getBoundingClientRect();
    var size = Math.floor(Math.min(rect.height * .62, rect.width * .22));
    this.time_el.style.fontSize = Math.max(16, size) + 'px';
  }
  
  /**
   * Shows stopwatch context menu.
   * @param {Number} x
   * @param {Number} y
   */
  _showMenu(x, y) {
    this.menu.style.display = 'block';
    var rect = this.menu.getBoundingClientRect();
    var left = Math.min(x, window.innerWidth - rect.width - 4);
    var top = Math.min(y, window.innerHeight - rect.height - 4);
    this.menu.style.left = Math.max(4, left) + 'px';
    this.menu.style.top = Math.max(4, top) + 'px';
  }
  
  /**
   * Hides stopwatch context menu.
   */
  _hideMenu() {
    this.menu.style.display = 'none';
  }
  
  /**
   * Updates displayed time.
   */
  _update() {
    var elapsed = this.elapsed_ms;
    if(this.interval) {
      elapsed += Date.now() - this.started_at;
    }
    var total_seconds = Math.floor(elapsed / 1000);
    var minutes = Math.floor(total_seconds / 60);
    var seconds = total_seconds % 60;
    this.time_el.textContent = String(minutes).padStart(2, '0') + ':' +
      String(seconds).padStart(2, '0');
  }
}

var presentation = new PRDC_JSLAB_PRESENTATION();

/**
 * Loads file from buffer
 * @param {string} buf_url – URL to buffered file.
 */
async function loadFileBuf(buf_url) {
  var name = encodeURIComponent(buf_url);
  if(window.file_buffers[name]) return Promise.resolve(window.file_buffers[name]);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = buf_url + '.buf.js';
    s.onload = () => {
      resolve(window.file_buffers[name]);
    }
    document.head.appendChild(s);
  });
}

/**
 * Class for ImagePDF HTML element
 */
class ImagePDF extends HTMLElement {

  static observedAttributes = ['src', 'page', 'width', 'height'];
  
  /**
   * Initializes an instance of the ImagePDF class.
   */
  constructor() {
    super();
    this._canvas = document.createElement('canvas');
    this._context = this._canvas.getContext('2d');
    this.appendChild(this._canvas);
  }
  
  /**
   * Callback called when element is added to page
   */
  connectedCallback() {
    if(presentation._shouldRenderElementNow(this)) this._render();
    this.is_connected = true;
  }
  
  /**
   * Callback called when element's attribute is changed
   */
  attributeChangedCallback() { 
    if(!this.is_connected) return;
    if(presentation._shouldRenderElementNow(this)) {
      this._render();
    }
  }
  
  /**
   * Renders element
   */
  async _render() {
    if(this._render_promise) return this._render_promise;
    this._render_promise = this._renderImpl();
    try {
      await this._render_promise;
    } finally {
      this._render_promise = null;
    }
    return this._finished_loading;
  }

  /**
   * Renders element internals.
   */
  async _renderImpl() {
    var src_attr = this.getAttribute('src');
    if(!src_attr) return;
    if(!await presentation.ensurePdfJs()) return;
    
    let loadingTask;
    try {
      if(this.src != src_attr) {
        if(window._standalone){
          var buf = await loadFileBuf(src_attr);
          loadingTask = pdfjsLib.getDocument({ data: buf });
        } else {
          loadingTask = pdfjsLib.getDocument(src_attr);
        }
        this.src = src_attr;
        this.pdf = await loadingTask.promise;;
      }
      
      var page_n = parseInt(this.getAttribute('page') || '1', 10) || 1;
      var page = await this.pdf.getPage(page_n);
      
      var vp0  = page.getViewport({ scale: 1 });
      var wanted_w = presentation.toPixels(this.getAttribute('width'), 'width') || vp0.width;
      var wanted_h = presentation.toPixels(this.getAttribute('height'), 'height') || vp0.height;

      var scale = wanted_w ? wanted_w / vp0.width : wanted_h ? wanted_h / vp0.height : 1;
      var vps = page.getViewport({ scale });
      
      this._canvas.style.display = 'block';
      this._canvas.width = vps.width;
      this._canvas.height = vps.height;

      await page.render({ canvasContext: this._context, viewport: vps }).promise;
      this._finished_loading = true;
    } catch(err){
      console.error('img-pdf:', err);
    }
  }
}

customElements.define('img-pdf', ImagePDF);

/**
 * Class for PlotJSON HTML element
 */
class PlotJSON extends HTMLElement {

  static observedAttributes = ['src', 'width', 'height'];
  
  /**
   * Initializes an instance of the PlotJSON class.
   */
  constructor() {
    super();
    this._cont = this.appendChild(document.createElement('div'));
  }
  
  /**
   * Callback called when element is added to page
   */
  connectedCallback() {
    if(presentation._shouldRenderElementNow(this)) this._render();
    this.is_connected = true;
  }
  
  /**
   * Callback called when element's attribute is changed
   */
  attributeChangedCallback() { 
    if(!this.is_connected) return;
    if(presentation._shouldRenderElementNow(this)) {
      this._render();
    }
  }
  
  /**
   * Renders element
   */
  async _render() {
    if(this._render_promise) return this._render_promise;
    this._render_promise = this._renderImpl();
    try {
      await this._render_promise;
    } finally {
      this._render_promise = null;
    }
    return this._finished_loading;
  }

  /**
   * Renders element internals.
   */
  async _renderImpl() {
    var src_attr = this.getAttribute('src');
    if(!src_attr) return;
    if(!await presentation.ensurePlotly()) return;
    
    try {
      if(this.src != src_attr) {
        if(window._standalone){
          const buf = await loadFileBuf(src_attr);
          this.data = JSON.parse(buf);
        } else {
          var resp = await fetch(src_attr, { cache: 'no-store' });
          this.data = await resp.json();
        }
        this.src = src_attr;
      }
      
      var w = presentation.toPixels(this.getAttribute('width'), 'width') || 0;
      var h = presentation.toPixels(this.getAttribute('height'), 'height') || 0;
      if(w) this.data.layout.width = w;
      if(h) this.data.layout.height = h;

      await Plotly.newPlot(this._cont, this.data);
      this._finished_loading = true;
    } catch(err){
      console.error('plot-json:', err);
    }
  }
}

customElements.define('plot-json', PlotJSON);

/**
 * Class for Scene3dJSON HTML element
 */
class Scene3dJSON extends HTMLElement {
  
  static observedAttributes = ['src', 'width', 'height'];
  
  /**
   * Initializes an instance of the Scene3dJSON class.
   */
  constructor() {
    super();
    this._canvas = document.createElement('canvas');
    this.appendChild(this._canvas);
  }
  
  /**
   * Callback called when element is added to page
   */
  connectedCallback() {
    if(presentation._shouldRenderElementNow(this)) this._render();
    this.is_connected = true;
  }
  
  /**
   * Callback called when element's attribute is changed
   */
  attributeChangedCallback() {
    if(!this.is_connected) return;
    if(presentation._shouldRenderElementNow(this)) {
      this._render();
    }
  }

  /**
   * Renders element
   */
  async _render() {
    if(this._render_promise) return this._render_promise;
    this._render_promise = this._renderImpl();
    try {
      await this._render_promise;
    } finally {
      this._render_promise = null;
    }
    return this._finished_loading;
  }

  /**
   * Renders element internals.
   */
  async _renderImpl() {
    var src_attr = this.getAttribute('src');
    if(!src_attr) return;

    try {
      if(this.src !== src_attr) {
        if(window._standalone) {
          var buf  = await loadFileBuf(src_attr);
          this.data  = JSON.parse(buf);
        } else {
          var resp = await fetch(src_attr, { cache: 'no-store' });
          this.data  = await resp.json();
        }
        this.src = src_attr;
      }

      var w = presentation.toPixels(this.getAttribute('width') , 'width')  || 640;
      var h = presentation.toPixels(this.getAttribute('height'), 'height') || 480;

      if(!window._standalone){
        if(!await presentation.ensureThree()) return;

        var loader = new window.THREE.ObjectLoader();
        this.scene = loader.parse(this.data);
        this.camera = new window.THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
        this.renderer = new window.THREE.WebGLRenderer({ canvas: this._canvas, alpha: true, antialias: true });
        this.renderer.setSize(w, h);
        this.renderer.setAnimationLoop(() => { 
          this.renderer.render(this.scene, this.camera) 
        });

        var script = this.querySelector('script[type="x-scene-setup"]');
        if(script) {
          var AsyncFunction = Object.getPrototypeOf(
            async function () {}).constructor;
          var fn = new AsyncFunction(
            'presentation',
            script.textContent
          ).bind(this);
          await fn(presentation);
        }

        this.renderer.render(this.scene, this.camera);
        this._finished_loading = true;
      } else {
        var ph = document.createElement('div');
        ph.className = 'error-element scene-3d-error';
        this.appendChild(ph);
        this._canvas.width = 0;
        this._canvas.height = 0;
        Object.assign(ph.style, {
          width:  w + 'px',
          height: h + 'px'
        });
        var txt_ph = document.createElement('div');
          txt_ph.innerHTML = language.currentString(363);
          ph.appendChild(txt_ph);
          this._finished_loading = true;
          console.error('scene-3d-json:', language.currentString(363));
        }
    } catch(err) {
      console.error('scene-3d-json:', err);
    }
  }
}

customElements.define('scene-3d-json', Scene3dJSON);
