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
var is_lazy = new URLSearchParams(location.search).has('lazy');

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
    this.slides = document.querySelectorAll('slide');
    this.slides_cont = document.getElementById('slides-cont');
    this.current_slide = -1;
    this.total_slides = this.slides.length;
    this._interpolated = new WeakSet();
    this._standalone = window.location.protocol == 'file:'
    this._animating = false;

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
      if(event.ctrlKey && event.key.toLowerCase() === 's'){
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

    window.addEventListener('DOMContentLoaded', () => {
      var m = window.location.hash.match(/^#s(\d+)$/);
      var wanted = m ? parseInt(m[1], 10) - 1 : 
        this.current_slide > -1 ? this.current_slide : 0;
      this.setSlide(wanted);
    })

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
      }
    });
    
    if(has_node) {
      ipcRenderer.on('data', (e, data) => {
        if(typeof data.set === 'number'){
          obj.setSlide(data.set);
        } else if(typeof data.show === 'number'){
          obj.showSlide(data.show);
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
    
    if(!this._standalone) {
      const ping = () => fetch('/keepalive', 
        { method: 'HEAD', cache: 'no-store', mode: "no-cors" })
      .then((data) => {}).catch((err) => {
        console.log(err);
      }); 

      ping();
      setInterval(ping, 10_000);
    }
    
    this._attachGestureControl();
    if(!is_lazy && window.MathJax && typeof MathJax.typesetPromise === 'function') {
      MathJax.typesetPromise();
    }
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
    
    this._updateHash(index);
    if(has_node) {
      ipcRenderer.sendToHost('data', { slide: index });
    }
    if(is_iframe) {
      window.parent.postMessage({ slide: index }, '*');
    }
    if(is_lazy) {
      this._lazyRender(this.slides[index]);
    }
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
    
    this._updateHash(index);
    if(has_node) {
      ipcRenderer.sendToHost('data', { slide: index });
    }
    if(is_iframe) {
      window.parent.postMessage({ slide: index }, '*');
    }
    if(is_lazy) {
      this._lazyRender(this.slides[index]);
    }
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
      <div id="first-slide" class="button" title="First slide">⏮</div>
      <div id="prev-slide" class="button" title="Previous">⏴</div>
      <input id="set-slide" type="number" min="1" step="1">
      <span id="total-slides">/ 0</span>
      <div id="next-slide" class="button" title="Next">⏵</div>
      <div id="last-slide" class="button" title="Last slide">⏭</div>`;
    
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
   * Lazy-render MathJax, <img-pdf> and <plot-json> elements that
   * live inside the currently visible slide.
   * @param {HTMLElement} slide – the active <slide> element
   */
  _lazyRender(slide) {
    if(!slide) return;
    slide.querySelectorAll('img-pdf, plot-json, scene-3d-json').forEach(el => {
      if (el._lazyRendered) return;
      if (typeof el._render === 'function') {
        el._lazyRendered = true;
        el._render();
      }
    });

    if(window.MathJax && typeof MathJax.typesetPromise === 'function') {
      MathJax.typesetPromise([slide]).catch(err => console.error(err));
    }
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
    if(!is_lazy) this._render();
    this.is_connected = true;
  }
  
  /**
   * Callback called when element's attribute is changed
   */
  attributeChangedCallback() { 
    if(!this.is_connected) return;
    if(!is_lazy || this.closest('slide')?.classList.contains('active')) {
      this._render();
    }
  }
  
  /**
   * Renders element
   */
  async _render() {
    var src_attr = this.getAttribute('src');
    if(!src_attr) return;
    
    let loadingTask;
    try {
      if(this.src != src_attr) {
        if(presentation._standalone){
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
    if(!is_lazy) this._render();
    this.is_connected = true;
  }
  
  /**
   * Callback called when element's attribute is changed
   */
  attributeChangedCallback() { 
    if(!this.is_connected) return;
    if(!is_lazy || this.closest('slide')?.classList.contains('active')) {
      this._render();
    }
  }
  
  /**
   * Renders element
   */
  async _render() {
    var src_attr = this.getAttribute('src');
    if(!src_attr) return;
    
    try {
      if(this.src != src_attr) {
        if(presentation._standalone){
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
    if(!is_lazy) this._render();
    this.is_connected = true;
  }
  
  /**
   * Callback called when element's attribute is changed
   */
  attributeChangedCallback() {
    if(!this.is_connected) return;
    if(!is_lazy || this.closest('slide')?.classList.contains('active')) {
      this._render();
    }
  }

  /**
   * Renders element
   */
  async _render() {
    var src_attr = this.getAttribute('src');
    if(!src_attr) return;

    try {
      if(this.src !== src_attr) {
        if(presentation._standalone) {
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
      
      await presentation.waitForGlobal('THREE');

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
    } catch(err) {
      console.error('scene-3d-json:', err);
    }
  }
}

customElements.define('scene-3d-json', Scene3dJSON);