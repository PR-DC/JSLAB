/**
 * @file JSLAB library presentation submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const cp = require('child_process');
const recast = require('recast');
const recast_babel_parser = require('recast/parsers/babel');

const auto_global_modules = Object.freeze({
  THREE: './res/three.js-r162/build/three.module.js',
  OrbitControls: './res/three.js-r162/examples/jsm/controls/OrbitControls.js',
  MapControls: './res/three.js-r162/examples/jsm/controls/OrbitControls.js',
  ArcballControls: './res/three.js-r162/examples/jsm/controls/ArcballControls.js',
  DragControls: './res/three.js-r162/examples/jsm/controls/DragControls.js',
  FirstPersonControls: './res/three.js-r162/examples/jsm/controls/FirstPersonControls.js',
  FlyControls: './res/three.js-r162/examples/jsm/controls/FlyControls.js',
  PointerLockControls: './res/three.js-r162/examples/jsm/controls/PointerLockControls.js',
  TrackballControls: './res/three.js-r162/examples/jsm/controls/TrackballControls.js',
  TransformControls: './res/three.js-r162/examples/jsm/controls/TransformControls.js',
  FBXLoader: './res/three.js-r162/examples/jsm/loaders/FBXLoader.js',
  GLTFLoader: './res/three.js-r162/examples/jsm/loaders/GLTFLoader.js',
  MTLLoader: './res/three.js-r162/examples/jsm/loaders/MTLLoader.js',
  OBJLoader: './res/three.js-r162/examples/jsm/loaders/OBJLoader.js',
  RGBELoader: './res/three.js-r162/examples/jsm/loaders/RGBELoader.js',
  STLLoader: './res/three.js-r162/examples/jsm/loaders/STLLoader.js'
});

/**
 * Class for JSLAB presentation submodule.
 */
class PRDC_JSLAB_LIB_PRESENTATION {
  
  /**
   * Constructs a presentation submodule object with access to JSLAB's functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    this.presentation_servers = new Map();
    this.three_export_cache = new Map();
  }

  /**
   * Opens an existing presentation in a new window and returns its context.
   * In the opened presentation, press Ctrl+S to toggle the slide controls.
   * Press F9 to toggle the stopwatch overlay.
   * When the stopwatch is visible, right-click it for Start, Stop, and Reset,
   * drag it to move it, and drag any corner to resize it.
   * @param {String} file_path - Absolute or relative path to the presentation directory.
   * @param {String} type - Type of presentation.
   * @returns {Promise<Window>} Resolves to the window context of the opened presentation.
   */
  async openPresentation(file_path, type) {
    file_path = this._getPath('openPresentation', file_path);
    if(this._checkPresentation('openPresentation', file_path)) {
      var obj = this;
      var presentation_type = type || this._getPresentationMode(file_path);
      if(presentation_type == 'standalone') {
        var url = this.jsl.inter.env.pathJoin(file_path, 'index.html')
        var wid = this.jsl.inter.windows.openWindow(url);
      } else {
        var url = await this._startPresentation(file_path);
        var wid = this.jsl.inter.windows.openWindow('url.html');
      }
      await this.jsl.inter.windows.open_windows[wid].ready;
      var context = this.jsl.inter.windows.open_windows[wid].context;
      var fullscreen = false;
      if(presentation_type == 'standalone') {
        while(typeof context.presentation == 'undefined') {
          await this.jsl.inter.non_blocking.waitMSeconds(1);
        }
        context.document.addEventListener('keydown', (event) => {
          if(event.key == 'F11') {
            fullscreen = !fullscreen;
            obj.jsl.inter.windows.open_windows[wid].setFullscreen(fullscreen);
          }
        });
      } else {
        context.document.getElementById('webview').src = url;
        context.document.addEventListener('keydown', function(event) {
          var key = event.key ? event.key.toLowerCase() : '';
          if(event.ctrlKey && !event.altKey && !event.shiftKey &&
              key === 's') {
            event.preventDefault();
            context.webview.send('data', { toggle_slide_nav: true });
          } else if(!event.ctrlKey && !event.altKey && !event.shiftKey &&
              event.key == 'F9') {
            event.preventDefault();
            context.webview.send('data', { toggle_stopwatch: true });
          }
        });
        context.webview.addEventListener('ipc-message', (e) => {
          if(e.args[0].key !== undefined) {
            if(e.args[0].key == 'F11') {
              fullscreen = !fullscreen;
              obj.jsl.inter.windows.open_windows[wid].setFullscreen(fullscreen);
            }
          }
        });
      }
      var presentation_title = this.jsl.inter.lang.currentString(515);
      this.jsl.inter.windows.open_windows[wid].setTitle(file_path + ' - ' + presentation_title);
      return context;
    }
  }
  
  /**
   * Opens the presentation editor for the specified project and returns its context.
   * The preview uses the same runtime controls as openPresentation,
   * including Ctrl+S for slide controls and F9 for the stopwatch.
   * @async
   * @param {String} file_path - Absolute or relative path to the presentation directory.
   * @param {String} type - Type of presentation.
   * @returns {Promise<Window>} Resolves to the window context of the editor window.
   */
  async editPresentation(file_path, type) {
    file_path = this._getPath('editPresentation', file_path);
    if(this._checkPresentation('editPresentation', file_path)) {
      var presentation_type = type || this._getPresentationMode(file_path);
      if(presentation_type == 'standalone') {
        var url = this.jsl.inter.env.pathJoin(file_path, 'index.html')
      } else {
        var url = await this._startPresentation(file_path);
      }
      var wid = this.jsl.inter.windows.openWindow('presentation-editor.html');
      await this.jsl.inter.windows.open_windows[wid].ready;
      var context = this.jsl.inter.windows.open_windows[wid].context;
      while(typeof context.presentation_editor == 'undefined') {
        await this.jsl.inter.non_blocking.waitMSeconds(1);
      }
      var fullscreen = false;
      var toggleFullscreen = () => {
        fullscreen = !fullscreen;
        context.fullscreen = fullscreen;
        this.jsl.inter.windows.open_windows[wid].setFullscreen(fullscreen);
        if(fullscreen) {
          context.document.body.classList.add('fullscreen');
        } else {
          context.document.body.classList.remove('fullscreen');
        }
      }
      context.preview.addEventListener('ipc-message', (e) => {
        if(e.args[0].key !== undefined) {
          if(e.args[0].key == 'F11') {
            toggleFullscreen();
          }
        }
      });
      context.document.addEventListener('keydown', (event) => {
        if(event.key == 'F11') {
           toggleFullscreen();
        }
      });
      context.presentation_editor.setPath(file_path, url);
      var presentation_editor_title = this.jsl.inter.lang.currentString(516);
      this.jsl.inter.windows.open_windows[wid].setTitle(file_path + ' - ' + presentation_editor_title);
      return context;
    }
  }

  /**
   * Updates generated presentation internal files to the latest JSLAB runtime.
   * @param {String} file_path - Absolute or relative path to the presentation directory.
   */
  updatePresentation(file_path) {
    file_path = this._getPath('updatePresentation', file_path);
    if(this._checkPresentation('updatePresentation', file_path)) {
      var mode = this._getPresentationMode(file_path);
      this._updatePresentationBackend(file_path);
      this._setPresentationMode(file_path, mode);
      if(mode == 'standalone') {
        this._applyStandalonePresentationState(file_path);
      } else {
        this._applyOnlinePresentationState(file_path);
      }
    }
  }
  
  /**
   * Creates a new presentation project on disk and optionally opens it in the editor.
   * @param {String} file_path - Target directory where the presentation project will be created.
   * @param {Object} [opts_in] Extra options
   * @param {Boolean} [open_editor=true] - If true, automatically opens the new project in the editor.
   */
  createPresentation(file_path, opts_in = {}, open_editor = true) {
    file_path = this._getPath('createPresentation', file_path);
    var presentation_config = {
      "jslab_version": this.jsl.context.version,
      "slide_width": 1920,
      "slide_height": 1080,
      "presentation_mode": "online",
      ...opts_in
    }
    this.jsl.inter.env.makeDirectory(file_path);
    this.jsl.inter.env.makeDirectory(this.jsl.inter.env.pathJoin(file_path, 'res/'));
    this.jsl.inter.env.makeDirectory(this.jsl.inter.env.pathJoin(file_path, 'res/internal/'));

    var js = this.jsl.inter.env.readFileSync(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'js/windows/presentation.js')).toString();
    js = js.replace('%presentation_config%', JSON.stringify(presentation_config, false, 2));
    this.jsl.inter.file_system.writeFile(this.jsl.inter.env.pathJoin(file_path, 'res/internal/presentation.js'), js);
    this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'css/presentation.css'),
      this.jsl.inter.env.pathJoin(file_path, 'res/internal/presentation.css'));
    
    this.jsl.inter.file_system.writeFile(this.jsl.inter.env.pathJoin(file_path, 'main.css'), '');
    this.jsl.inter.file_system.writeFile(this.jsl.inter.env.pathJoin(file_path, 'main.js'), '');
    this.jsl.inter.file_system.writeFile(this.jsl.inter.env.pathJoin(file_path, 'res/internal/config.json'), JSON.stringify(presentation_config, false, 2));
    
    var presentation_scripts = '';
    var presentation_stylesheets = '';
    if(opts_in.hasOwnProperty('modules')) {
      var handled = new Set();
      for(var module of opts_in.modules) {
        var module = (module === 'plot-json') ? 'plot' : module;
        if(handled.has(module)) continue;
        handled.add(module);
    
        if(module == 'img-pdf') {
          this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/pdfjs-dist-3.11.174/pdf.min.js'), this.jsl.inter.env.pathJoin(file_path, 'res/pdf.min.js'));
          this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/pdfjs-dist-3.11.174/pdf.worker.min.js'), this.jsl.inter.env.pathJoin(file_path, 'res/pdf.worker.min.js'));
        } else if(module == 'plot') {
          this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/plotly-3.3.0/plotly-3.3.0.min.js'), this.jsl.inter.env.pathJoin(file_path, 'res/plotly-3.3.0.min.js'));
        } else if(module == 'ui') {
          this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'css/ui.css'), this.jsl.inter.env.pathJoin(file_path, 'res/ui.css'));
          this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'js/windows/ui.js'), this.jsl.inter.env.pathJoin(file_path, 'res/ui.js'));
          presentation_stylesheets += `
  <link rel="stylesheet" type="text/css" href="./res/ui.css" />
`;
          presentation_scripts += `
  <script type="text/javascript" src="./res/ui.js"></script>
`;
        } else if(module == 'latex') {
          this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'js/windows/mathjax-config.js'), this.jsl.inter.env.pathJoin(file_path, 'res/mathjax-config.js'));
          this.jsl.inter.file_system.copyFolder(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/MathJax-3.2.0'), this.jsl.inter.env.pathJoin(file_path, 'res/MathJax-3.2.0'));
        } else if(module == 'scene-3d-json') {
          this.jsl.inter.file_system.copyFolder(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/three.js-r162'), this.jsl.inter.env.pathJoin(file_path, 'res/three.js-r162'));
        }
      }        
    }
    var html = this.jsl.inter.env.readFileSync(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'html/presentation.html')).toString();
    html = html.replace('%presentation_scripts%', presentation_scripts);
    html = html.replace('%presentation_stylesheets%', presentation_stylesheets);
    this._writePresentationGlobals(file_path, opts_in.modules);
    this.jsl.inter.file_system.writeFile(this.jsl.inter.env.pathJoin(file_path, 'index.html'), html);
    
    if(open_editor) {
      this.editPresentation(file_path);
    }
  }

  /**
   * Packages an existing presentation directory into a ZIP archive beside it.
   * @param {String} file_path - Path to the presentation directory to be archived.
   */
  packPresentation(file_path) {
    file_path = this._getPath('packPresentation', file_path);
    if(this._checkPresentation('packPresentation', file_path)) {
      var dest = this.jsl.inter.env.pathResolve(this.jsl.inter.env.pathJoin(file_path, '..', this.jsl.inter.env.pathBaseName(file_path) + '.zip'));
      this.jsl.inter.env.execSync(`"${this.jsl.inter.env.bin7zip}" a -tzip "${dest}" "${this.jsl.inter.env.pathJoin(file_path, '*')}"`);
      this.jsl.inter.env.disp('@packPresentation: ' + this.jsl.inter.lang.string(241) + dest);
    }
  }

  /**
   * Converts an existing presentation to standalone presentation.
   * @param {String} file_path - Path to the presentation directory to be archived.
   */
  makeStandalonePresentation(file_path) {
    file_path = this._getPath('makeStandalonePresentation', file_path);
    if(this._checkPresentation('makeStandalonePresentation', file_path)) {
      this._setPresentationMode(file_path, 'standalone');
      this._applyStandalonePresentationState(file_path);
    }
  }

  /**
   * Restores a standalone-cleaned presentation back to the normal server-backed form.
   * @param {String} file_path - Path to the presentation directory.
   */
  makeOnlinePresentation(file_path) {
    file_path = this._getPath('makeOnlinePresentation', file_path);
    if(this._checkPresentation('makeOnlinePresentation', file_path)) {
      var resources = this._readPresentationResourceFlags(file_path);
      this._restoreStandaloneBufferedAssets(file_path);
      this._restorePresentationModuleResources(file_path, resources);
      this._updatePresentationBackend(file_path);
      this._setPresentationMode(file_path, 'online');
      this._applyOnlinePresentationState(file_path);
    }
  }

  /**
   * Converts an presentation to PDF format.
   * @param {String} file_path - Path to the presentation directory.
   * @param {Boolean} run_make_standalone - Whether to run makeStandalonePresentation method or not.
   */
  async presentationToPdf(file_path, run_make_standalone = true) {
    file_path = this._getPath('presentationToPdf', file_path);
    if(this._checkPresentation('presentationToPdf', file_path)) {
      if(run_make_standalone) {
        this.makeStandalonePresentation(file_path);
      }
      var win = await this.openPresentation(file_path, 'standalone');
      var p = win.presentation;
      p._interpolateAllSlides();
      win.setSize(p.config.slide_width, p.config.slide_height);
      await this.jsl.inter.waitMSeconds(200);
      while(typeof win.presentation == 'undefined') {
        await this.jsl.inter.non_blocking.waitMSeconds(1);
      }
      win.setOpacity(0);
      for(var i = 0; i < win.presentation.total_slides; i++) {
        win.presentation.setSlide(i);
        await this._waitForSlide(win, win.presentation.slides[i]);
        await this.jsl.inter.waitMSeconds(1);
      }
      win.presentation.setSlide(0);
      var pdf = await this.jsl.inter.windows.printWindowToPdf(win.wid, {
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        printBackground: true,
        landscape: false,
        pageSize: {
          width: p.config.slide_width / 96, 
          height: p.config.slide_height / 96
        }
      });
      var name = this.jsl.inter.env.pathBaseName(file_path);
      var dest = this.jsl.inter.env.pathJoin(file_path, name + '.pdf');
      this.jsl.inter.file_system.writeFile(dest, pdf);
      win.close();
      this.jsl.inter.env.disp('@presentationToPdf: ' + this.jsl.inter.lang.string(244) + dest);
    }
  }
  
  /**
   * Waits for slide elements to be loaded
   * @param {Window} win - Window context with presentation.
   * @param {HTMLElement} slide - HTML element of slide.
   */
  async _waitForSlide(win, slide) {
    var img_pdfs = Array.from(slide.querySelectorAll('img-pdf'));
    var plot_jsons = Array.from(slide.querySelectorAll('plot-json'));
    var scene_3d_jsons = Array.from(slide.querySelectorAll('scene-3d-json'));
    for(var e of [...img_pdfs, ...plot_jsons]) {
      while(!e._finished_loading) {
        await this.jsl.inter.waitMSeconds(1);
      }
    }
    var videos = Array.from(slide.querySelectorAll('video'));
    for(var v of videos) {
      await this._waitForVideo(v);
    }
    
    await this._replaceCanvases(win, slide);
  }
  
  /**
   * Waits for video elements to be loaded
   * @param {HTMLElement} slide - HTML element of video.
   */
  async _waitForVideo(video) {
    if(video.preload === 'none') {
      video.preload = 'auto';
      video.load();
    }

    await new Promise(resolve => {
      if(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        resolve();
      } else {
        video.addEventListener('loadeddata', resolve, { once: true });
      }
    });
    
    video.controls = false;
    video.muted = true;
    try { await video.play(); } catch { }
    video.pause();

    if('requestVideoFrameCallback' in video) {
      await new Promise(res => video.requestVideoFrameCallback(() => res()));
    } else {
      if(video.currentTime === 0) {
        video.currentTime = 0.05;
        video.currentTime = 0;
      }
    }
  }
  
  /**
   * Replaces all canvases with static images.
   * @param {Window} win - Window context with presentation.
   * @param {HTMLElement} slide - HTML element of slide.
   */
  async _replaceCanvases(win, slide) {
    var plot_divs = Array.from(slide.querySelectorAll('.js-plotly-plot'))
                         .filter(div => div.querySelector('canvas'));
    for(var plot_div of plot_divs) {
      var data_url;
      try {
        data_url = await win.Plotly.toImage(plot_div, {
          format : 'png',
          width  : plot_div.clientWidth  * win.devicePixelRatio,
          height : plot_div.clientHeight * win.devicePixelRatio
        });
      } catch(err) {}
      
      var img = new win.Image();
      img.src = data_url;
      img.style.width  = (plot_div.style.width  || plot_div.width  + 'px');
      img.style.height = (plot_div.style.height || plot_div.height + 'px');
      img.style.maxWidth  = '100%';
      img.style.maxHeight = '100%';
      plot_div.parentNode.replaceChild(img, plot_div);
      await this.jsl.inter.waitMSeconds(1);
    }
  }

  /**
   * Rewrites generated presentation include blocks while preserving slide content.
   * @param {String} file_path - Path to presentation directory.
   */
  _refreshPresentationHtmlIncludes(file_path) {
    var html_file = this.jsl.inter.env.pathJoin(file_path, 'index.html');
    if(!this.jsl.inter.file_system.existFile(html_file)) {
      return;
    }

    var html = this.jsl.inter.env.readFileSync(html_file).toString();
    var styles = '';
    var scripts = '';
    if(this.jsl.inter.file_system.existFile(
        this.jsl.inter.env.pathJoin(file_path, 'res', 'ui.css'))) {
      styles += '  <link rel="stylesheet" type="text/css" href="./res/ui.css" />\n';
    }
    if(this.jsl.inter.file_system.existFile(
        this.jsl.inter.env.pathJoin(file_path, 'res', 'ui.js'))) {
      scripts += '  <script type="text/javascript" src="./res/ui.js"></script>\n';
    }

    var css_block = `<!-- CSS files begin -->
${styles}  <link rel="stylesheet" type="text/css" href="./res/internal/presentation.css" />
  <link rel="stylesheet" type="text/css" href="./main.css" />
<!-- CSS files end -->`;
    var js_block = `<!-- JS files begin -->
  <script type="text/javascript" src="./res/internal/globals.js"></script>

${scripts}  <script type="text/javascript" src="./res/internal/presentation.js"></script>
  <script type="text/javascript" src="./main.js"></script>
<!-- JS files end -->`;

    html = html.replace(/<!-- CSS files begin -->[\s\S]*?<!-- CSS files end -->/,
      css_block);
    html = html.replace(/<!-- JS files begin -->[\s\S]*?<!-- JS files end -->/,
      js_block);
    this.jsl.inter.file_system.writeFile(html_file, html);
  }

  /**
   * Updates generated presentation backend files in an existing presentation.
   * @param {String} file_path - Path to presentation directory.
   */
  _updatePresentationBackend(file_path) {
    var config_file = this.jsl.inter.env.pathJoin(file_path, 'res/internal/config.json');
    var presentation_config = {
      "jslab_version": this.jsl.context.version,
      "slide_width": 1920,
      "slide_height": 1080,
    };
    
    this.jsl.inter.env.makeDirectory(this.jsl.inter.env.pathJoin(file_path, 'res/'));
    this.jsl.inter.env.makeDirectory(this.jsl.inter.env.pathJoin(file_path, 'res/internal/'));
    
    if(this.jsl.inter.file_system.existFile(config_file)) {
      presentation_config = JSON.parse(this.jsl.inter.env.readFileSync(config_file).toString());
      presentation_config.jslab_version = this.jsl.context.version;
    }
    
    var js = this.jsl.inter.env.readFileSync(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'js/windows/presentation.js')).toString();
    js = js.replace('%presentation_config%', JSON.stringify(presentation_config, false, 2));
    this.jsl.inter.file_system.writeFile(this.jsl.inter.env.pathJoin(file_path, 'res/internal/presentation.js'), js);
    this.jsl.inter.file_system.writeFile(config_file, JSON.stringify(presentation_config, false, 2));
    this._refreshPresentationModuleResources(file_path);
    this._writePresentationGlobals(file_path);
    this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'css/presentation.css'),
      this.jsl.inter.env.pathJoin(file_path, 'res/internal/presentation.css'));
    this._refreshPresentationHtmlIncludes(file_path);
    this._removePresentationServerExecutable(file_path);
  }

  /**
   * Returns whether a file contains the supplied text fragment.
   * @param {String} file_path
   * @param {String} marker
   * @returns {Boolean}
   */
  _fileContains(file_path, marker) {
    if(!this.jsl.inter.file_system.existFile(file_path)) {
      return false;
    }
    try {
      return this.jsl.inter.env.readFileSync(file_path).toString().includes(marker);
    } catch(err) {
      return false;
    }
  }

  /**
   * Refreshes generated presentation module resources when embedded versions differ.
   * @param {String} file_path - Path to presentation directory.
   */
  _refreshPresentationModuleResources(file_path) {
    var res_path = this.jsl.inter.env.pathJoin(file_path, 'res');
    var plotly_current = this.jsl.inter.env.pathJoin(res_path, 'plotly-3.3.0.min.js');
    var plotly_legacy = this.jsl.inter.env.pathJoin(res_path, 'plotly-2.24.2.min.js');
    var pdf_min = this.jsl.inter.env.pathJoin(res_path, 'pdf.min.js');
    var pdf_worker = this.jsl.inter.env.pathJoin(res_path, 'pdf.worker.min.js');
    var mathjax_current = this.jsl.inter.env.pathJoin(res_path, 'MathJax-3.2.0', 'tex-mml-chtml.js');
    var mathjax_legacy = this.jsl.inter.env.pathJoin(res_path, 'tex-mml-chtml-3.2.0', 'tex-mml-chtml-3.2.0.js');
    var three_current = this.jsl.inter.env.pathJoin(res_path, 'three.js-r162', 'build', 'three.module.js');
    var three_root = this.jsl.inter.env.pathJoin(res_path, 'three.js-r162');
    var ui_css = this.jsl.inter.env.pathJoin(res_path, 'ui.css');
    var ui_js = this.jsl.inter.env.pathJoin(res_path, 'ui.js');
    var mathjax_config = this.jsl.inter.env.pathJoin(res_path, 'mathjax-config.js');

    var has_pdf = this.jsl.inter.file_system.existFile(pdf_min) ||
      this.jsl.inter.file_system.existFile(pdf_worker);
    if(has_pdf && !this._fileContains(pdf_min, 'apiVersion:"3.11.174"')) {
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/pdfjs-dist-3.11.174/pdf.min.js'),
        pdf_min);
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/pdfjs-dist-3.11.174/pdf.worker.min.js'),
        pdf_worker);
    }

    var has_plotly = this.jsl.inter.file_system.existFile(plotly_current) ||
      this.jsl.inter.file_system.existFile(plotly_legacy);
    if(has_plotly && !this.jsl.inter.file_system.existFile(plotly_current)) {
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/plotly-3.3.0/plotly-3.3.0.min.js'),
        plotly_current);
    }

    var has_mathjax = this.jsl.inter.file_system.existFile(mathjax_config) ||
      this.jsl.inter.file_system.existFile(mathjax_current) ||
      this.jsl.inter.file_system.existFile(mathjax_legacy);
    if(has_mathjax) {
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'js/windows/mathjax-config.js'),
        mathjax_config);
      if(!this.jsl.inter.file_system.existFile(mathjax_current) &&
          !this.jsl.inter.file_system.existFile(mathjax_legacy)) {
        this.jsl.inter.file_system.copyFolder(
          this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/MathJax-3.2.0'),
          this.jsl.inter.env.pathJoin(res_path, 'MathJax-3.2.0'));
      }
    }

    if(this.jsl.inter.file_system.existFile(three_current) ||
        this.jsl.inter.env.checkDirectory(three_root)) {
      if(!this.jsl.inter.file_system.existFile(three_current)) {
        this.jsl.inter.file_system.copyFolder(
          this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/three.js-r162'),
          three_root);
      }
    }

    if(this.jsl.inter.file_system.existFile(ui_css) ||
        this.jsl.inter.file_system.existFile(ui_js)) {
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'css/ui.css'),
        ui_css);
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'js/windows/ui.js'),
        ui_js);
    }

    if(this._hasStandaloneModuleBundles(file_path)) {
      this._bundleStandaloneModuleResources(file_path);
    }
  }

  /**
   * Returns exported resource module entry points that should be bundled for standalone mode.
   * @param {String} file_path - Path to presentation directory.
   * @returns {String[]}
   */
  _getStandaloneModuleEntries(file_path) {
    var modules = new Set();
    var obj = this;

    function addModule(specifier, source_file) {
      var module_path = obj._normalizeStandaloneModuleSpecifier(
        file_path, source_file, specifier);
      if(module_path) {
        modules.add(module_path);
      }
    }

    for(var js_file of this._getStandaloneRewriteJsFiles(file_path)) {
      var source = fs.readFileSync(js_file, 'utf8');
      var ast;
      try {
        ast = recast.parse(source, { parser: recast_babel_parser });
      } catch(err) {
        continue;
      }

      recast.types.visit(ast, {
        visitImportExpression(path_obj) {
          addModule(obj._getStandaloneModuleStringLiteral(path_obj.node.source), js_file);
          this.traverse(path_obj);
        },
        visitCallExpression(path_obj) {
          var callee = path_obj.node.callee;
          var name = '';
          if(callee && callee.type == 'Import') {
            addModule(obj._getStandaloneModuleStringLiteral(path_obj.node.arguments[0]), js_file);
          } else if(callee && callee.type == 'Identifier') {
            name = callee.name;
          } else if(callee && callee.type == 'MemberExpression' &&
              !callee.computed && callee.property &&
              callee.property.type == 'Identifier') {
            name = callee.property.name;
          }
          if(name == '__importPresentationModule' ||
              name == '_importResourceModule') {
            addModule(obj._getStandaloneModuleStringLiteral(path_obj.node.arguments[0]), js_file);
          }
          this.traverse(path_obj);
        }
      });
    }

    for(var module_path of this._getAutoGlobalModuleEntries(file_path)) {
      modules.add(module_path);
    }

    return Array.from(modules).sort();
  }

  /**
   * Returns standalone module entries needed by auto-loaded runtime globals used in presentation code.
   * @param {String} file_path - Path to presentation directory.
   * @returns {String[]}
   */
  _getAutoGlobalModuleEntries(file_path) {
    var modules = new Set();
    var sources = [];
    var index_file = path.join(file_path, 'index.html');

    if(fs.existsSync(index_file)) {
      sources.push(fs.readFileSync(index_file, 'utf8'));
    }
    for(var js_file of this._getStandaloneRewriteJsFiles(file_path)) {
      try {
        sources.push(fs.readFileSync(js_file, 'utf8'));
      } catch(err) {}
    }

    function escapeRegExp(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    for(var source of sources) {
      for(var [name, module_path] of Object.entries(auto_global_modules)) {
        var escaped = escapeRegExp(name);
        if(new RegExp("waitForGlobal\\(\\s*['\"]" + escaped + "['\"]\\s*\\)").test(source) ||
            new RegExp("\\bnew\\s+" + escaped + "\\s*\\(").test(source)) {
          modules.add(module_path);
        }
      }
    }

    return Array.from(modules).sort();
  }

  /**
   * Returns a static string literal value from a JS AST node when possible.
   * @param {Object} node - Babel/recast AST node.
   * @returns {(String|null)}
   */
  _getStandaloneModuleStringLiteral(node) {
    if(!node) {
      return null;
    }
    if(node.type == 'Literal' && typeof node.value == 'string') {
      return node.value;
    }
    if(node.type == 'StringLiteral') {
      return node.value;
    }
    if(node.type == 'TemplateLiteral' && node.expressions.length === 0 &&
        node.quasis.length === 1) {
      return node.quasis[0].value.cooked;
    }
    return null;
  }

  /**
   * Normalizes a referenced module specifier to a project-relative module path.
   * @param {String} file_path - Path to presentation directory.
   * @param {String} source_file - JavaScript file containing the reference.
   * @param {String} specifier - Referenced module path.
   * @returns {(String|null)}
   */
  _normalizeStandaloneModuleSpecifier(file_path, source_file, specifier) {
    if(typeof specifier != 'string' || !specifier) {
      return null;
    }
    if(/^[A-Za-z][A-Za-z0-9+.-]*:/.test(specifier) || specifier.startsWith('//')) {
      return null;
    }

    var abs_path;
    if(specifier.startsWith('./res/') || specifier.startsWith('res/')) {
      abs_path = path.resolve(file_path, specifier.replace(/^\.\//, ''));
    } else if(specifier.startsWith('/res/')) {
      abs_path = path.resolve(file_path, '.' + specifier);
    } else {
      abs_path = path.resolve(path.dirname(source_file), specifier);
    }

    var rel_path = path.relative(file_path, abs_path).replace(/\\/g, '/');
    if(rel_path.startsWith('..') || path.isAbsolute(rel_path)) {
      return null;
    }
    if(!/\.m?js$/i.test(rel_path) ||
        rel_path.endsWith('.standalone.js') ||
        rel_path.endsWith('.buf.js')) {
      return null;
    }
    if(!fs.existsSync(abs_path)) {
      return null;
    }
    return './' + rel_path;
  }

  /**
   * Returns the bundled standalone output path for a resource module.
   * @param {String} module_path - Relative module path as used by the runtime.
   * @returns {String}
   */
  _getStandaloneBundlePath(module_path) {
    if(module_path.endsWith('.module.js')) {
      return module_path.replace(/\.module\.js$/, '.standalone.js');
    }
    if(module_path.endsWith('.js')) {
      return module_path.replace(/\.js$/, '.standalone.js');
    }
    if(module_path.endsWith('.mjs')) {
      return module_path.replace(/\.mjs$/, '.standalone.mjs');
    }
    return module_path + '.standalone.js';
  }

  /**
   * Returns whether standalone bundles already exist in the exported presentation.
   * @param {String} file_path - Path to presentation directory.
   * @returns {Boolean}
   */
  _hasStandaloneModuleBundles(file_path) {
    return this._getStandaloneModuleEntries(file_path).some((module_path) => {
      return fs.existsSync(path.resolve(file_path,
        this._getStandaloneBundlePath(module_path)));
    });
  }

  /**
   * Builds a stable global name for a bundled standalone module.
   * @param {String} module_path - Relative module path as used by the runtime.
   * @returns {String}
   */
  _getStandaloneModuleGlobalName(module_path) {
    return 'JSLAB_STANDALONE_MODULE_' +
      module_path.replace(/[^A-Za-z0-9_$]+/g, '_');
  }

  /**
   * Returns whether a standalone module should reuse the shared THREE global.
   * @param {String} module_path - Relative module path as used by the runtime.
   * @returns {Boolean}
   */
  _usesSharedThreeBundle(module_path) {
    return module_path != './res/three.js-r162/build/three.module.js' &&
      module_path.startsWith('./res/three.js-r162/');
  }

  /**
   * Returns exported names from the embedded Three.js module.
   * @param {String} file_path - Path to presentation directory.
   * @returns {String[]}
   */
  _getStandaloneThreeExportNames(file_path) {
    var three_module_path = path.resolve(
      file_path,
      'res',
      'three.js-r162',
      'build',
      'three.module.js'
    );
    if(!fs.existsSync(three_module_path)) {
      return [];
    }

    var stats = fs.statSync(three_module_path);
    var cache_key = three_module_path + ':' + stats.size + ':' + stats.mtimeMs;
    if(this.three_export_cache.has(cache_key)) {
      return this.three_export_cache.get(cache_key);
    }

    var source = fs.readFileSync(three_module_path, 'utf8');
    var ast = recast.parse(source, { parser: recast_babel_parser });
    var names = new Set();
    var obj = this;

    recast.types.visit(ast, {
      visitExportNamedDeclaration(path_obj) {
        var node = path_obj.node;
        if(node.declaration) {
          obj._collectExportedDeclarationNames(node.declaration, names);
        }
        node.specifiers.forEach(function(specifier) {
          var exported = specifier.exported || specifier.local;
          var name = obj._getExportedIdentifierName(exported);
          if(name) {
            names.add(name);
          }
        });
        return false;
      }
    });

    var exported_names = Array.from(names).filter(function(name) {
      return name != 'default';
    }).sort();
    this.three_export_cache.clear();
    this.three_export_cache.set(cache_key, exported_names);
    return exported_names;
  }

  /**
   * Collects exported names from an export declaration node.
   * @param {Object} declaration
   * @param {Set<String>} names
   */
  _collectExportedDeclarationNames(declaration, names) {
    if(!declaration) {
      return;
    }

    switch(declaration.type) {
      case 'ClassDeclaration':
      case 'FunctionDeclaration':
      case 'TSDeclareFunction':
        if(declaration.id && declaration.id.name) {
          names.add(declaration.id.name);
        }
        break;
      case 'VariableDeclaration':
        declaration.declarations.forEach((declarator) => {
          this._collectPatternNames(declarator.id, names);
        });
        break;
    }
  }

  /**
   * Collects identifier names from a binding pattern.
   * @param {Object} pattern
   * @param {Set<String>} names
   */
  _collectPatternNames(pattern, names) {
    if(!pattern) {
      return;
    }

    switch(pattern.type) {
      case 'Identifier':
        names.add(pattern.name);
        break;
      case 'ObjectPattern':
        pattern.properties.forEach((prop) => {
          if(prop.type == 'RestElement') {
            this._collectPatternNames(prop.argument, names);
          } else {
            this._collectPatternNames(prop.value || prop.argument, names);
          }
        });
        break;
      case 'ArrayPattern':
        pattern.elements.forEach((element) => {
          this._collectPatternNames(element, names);
        });
        break;
      case 'AssignmentPattern':
        this._collectPatternNames(pattern.left, names);
        break;
      case 'RestElement':
        this._collectPatternNames(pattern.argument, names);
        break;
    }
  }

  /**
   * Returns an exported identifier name from an AST node when possible.
   * @param {Object} node
   * @returns {(String|null)}
   */
  _getExportedIdentifierName(node) {
    if(!node) {
      return null;
    }
    if(node.type == 'Identifier') {
      return node.name;
    }
    if(node.type == 'StringLiteral' || node.type == 'Literal') {
      return typeof node.value == 'string' ? node.value : null;
    }
    return null;
  }

  /**
   * Writes a temporary ES module shim that maps bare `three` imports to the
   * shared runtime THREE global.
   * @param {String} file_path - Path to presentation directory.
   * @param {String} temp_dir - Temporary directory for standalone build files.
   * @returns {(String|null)}
   */
  _writeStandaloneThreeShim(file_path, temp_dir) {
    var export_names = this._getStandaloneThreeExportNames(file_path);
    if(!export_names.length) {
      return null;
    }

    var shim_path = path.join(temp_dir, 'three-global-shim.js');
    var lines = [
      'var __three = globalThis.THREE || (globalThis.window && globalThis.window.THREE);',
      'if(!__three) {',
      '  throw new Error("THREE global is not loaded");',
      '}',
      'export default __three;'
    ];

    export_names.forEach(function(name) {
      if(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
        lines.push('export const ' + name + ' = __three.' + name + ';');
      }
    });

    fs.writeFileSync(shim_path, lines.join('\n') + '\n', 'utf8');
    return shim_path;
  }

  /**
   * Bundles exported resource modules for standalone presentation mode.
   * @param {String} file_path - Path to presentation directory.
   */
  _bundleStandaloneModuleResources(file_path, modules = this._getStandaloneModuleEntries(file_path)) {
    var wanted_bundles = new Set();
    if(!modules.length) {
      this._removeStaleStandaloneBundles(file_path, wanted_bundles);
      return;
    }

    var esbuild_exe = this._getEsbuildExecutable();
    var temp_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jslab-presentation-esbuild-'));
    try {
      var shared_three_shim = this._writeStandaloneThreeShim(file_path, temp_dir);
      for(var module_path of modules) {
        var entry_path = path.resolve(file_path, module_path);
        var bundle_path = path.resolve(file_path,
          this._getStandaloneBundlePath(module_path));
        var global_name = this._getStandaloneModuleGlobalName(module_path);
        wanted_bundles.add(bundle_path);

        var args = [
          entry_path,
          '--allow-overwrite',
          '--bundle',
          '--format=iife',
          '--global-name=' + global_name,
          '--log-level=silent',
          '--outfile=' + bundle_path,
          '--platform=browser',
          '--target=es2020',
          '--banner:js=window.__standalone_modules = window.__standalone_modules || {};',
          '--footer:js=window.__standalone_modules[' + JSON.stringify(module_path) +
            '] = ' + global_name + ';'
        ];
        if(shared_three_shim && this._usesSharedThreeBundle(module_path)) {
          args.push('--alias:three=' + shared_three_shim.replace(/\\/g, '/'));
        }
        cp.execFileSync(esbuild_exe, args, {
          windowsHide: true
        });
      }
    } finally {
      fs.rmSync(temp_dir, { recursive: true, force: true });
    }

    this._removeStaleStandaloneBundles(file_path, wanted_bundles);
  }

  /**
   * Returns the esbuild executable path for the current platform.
   * @returns {String}
   */
  _getEsbuildExecutable() {
    var pkg_dir = path.dirname(require.resolve(
      '@esbuild/' + process.platform + '-' + process.arch + '/package.json'));
    if(process.platform == 'win32') {
      return path.join(pkg_dir, 'esbuild.exe');
    }
    return path.join(pkg_dir, 'bin', 'esbuild');
  }

  /**
   * Returns asset paths that require .buf.js files in standalone mode.
   * @param {String} html
   * @returns {Set<String>}
   */
  _collectStandaloneBufferedAssets(html) {
    var reImagePdf = /<img-pdf\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    var rePlotJson = /<plot-json\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    var reScene3dJson = /<scene-3d-json\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

    var assets = new Set();
    for(var re of [reImagePdf, rePlotJson, reScene3dJson]) {
      let m;
      while((m = re.exec(html)) !== null) {
        var rel = m[1].trim();
        if(rel) {
          assets.add(rel);
        }
      }
    }
    return assets;
  }

  /**
   * Removes stale .buf.js files and regenerates the currently needed ones.
   * @param {String} file_path - Path to presentation directory.
   * @param {Iterable<String>} assets - Asset paths referenced by standalone-only elements.
   */
  _syncStandaloneBufferedAssets(file_path, assets) {
    var wanted = new Set();
    for(var rel of assets) {
      var abs = path.resolve(file_path, rel);
      var buf_file = abs + '.buf.js';
      wanted.add(buf_file);
      if(fs.existsSync(abs)) {
        this._fileToBuffer(file_path, rel);
        fs.rmSync(abs, { force: true });
      }
    }

    function walk(dir_path) {
      if(!fs.existsSync(dir_path)) {
        return;
      }
      for(var entry of fs.readdirSync(dir_path, { withFileTypes: true })) {
        var entry_path = path.join(dir_path, entry.name);
        if(entry.isDirectory()) {
          walk(entry_path);
        } else if(entry.isFile() && entry.name.endsWith('.buf.js') &&
            !wanted.has(entry_path)) {
          fs.rmSync(entry_path, { force: true });
        }
      }
    }

    walk(file_path);
  }

  /**
   * Removes stale standalone module bundles.
   * @param {String} file_path - Path to presentation directory.
   * @param {Set<String>} wanted_bundles - Bundle files that must remain.
   */
  _removeStaleStandaloneBundles(file_path, wanted_bundles) {
    function walk(dir_path) {
      if(!fs.existsSync(dir_path)) {
        return;
      }
      for(var entry of fs.readdirSync(dir_path, { withFileTypes: true })) {
        var entry_path = path.join(dir_path, entry.name);
        if(entry.isDirectory()) {
          walk(entry_path);
        } else if(entry.isFile() && entry.name.endsWith('.standalone.js') &&
            !wanted_bundles.has(entry_path)) {
          fs.rmSync(entry_path, { force: true });
        }
      }
    }

    walk(path.join(file_path, 'res'));
  }

  /**
   * Removes the standalone-unneeded portable server executable.
   * @param {String} file_path - Path to presentation directory.
   */
  _removePresentationServerExecutable(file_path) {
    var exe_file = path.join(file_path,
      this.jsl.inter.env.pathBaseName(file_path) + '.exe');
    if(fs.existsSync(exe_file)) {
      fs.rmSync(exe_file, { force: true });
    }
  }

  /**
   * Detects the current presentation mode.
   * @param {String} file_path - Path to presentation directory.
   * @returns {String}
   */
  _getPresentationMode(file_path) {
    var config = this._readPresentationConfig(file_path);
    if(config.presentation_mode == 'standalone' ||
        config.presentation_mode == 'online') {
      return config.presentation_mode;
    }

    var found_standalone_artifact = false;
    function walk(dir_path) {
      if(found_standalone_artifact || !fs.existsSync(dir_path)) {
        return;
      }
      for(var entry of fs.readdirSync(dir_path, { withFileTypes: true })) {
        var entry_path = path.join(dir_path, entry.name);
        if(entry.isDirectory()) {
          walk(entry_path);
          if(found_standalone_artifact) {
            return;
          }
        } else if(entry.isFile() &&
            (entry.name.endsWith('.buf.js') ||
            entry.name.endsWith('.standalone.js'))) {
          found_standalone_artifact = true;
          return;
        }
      }
    }
    walk(file_path);
    if(found_standalone_artifact) {
      return 'standalone';
    }

    return 'online';
  }

  /**
   * Persists the current presentation mode into config.json.
   * @param {String} file_path - Path to presentation directory.
   * @param {String} mode - Presentation mode.
   */
  _setPresentationMode(file_path, mode) {
    var config_file = path.join(file_path, 'res', 'internal', 'config.json');
    var config = this._readPresentationConfig(file_path);
    config.presentation_mode = mode;
    fs.mkdirSync(path.dirname(config_file), { recursive: true });
    fs.writeFileSync(config_file, JSON.stringify(config, false, 2), 'utf8');
  }

  /**
   * Reads generated presentation config.json.
   * @param {String} file_path - Path to presentation directory.
   * @returns {Object}
   */
  _readPresentationConfig(file_path) {
    var config_file = path.join(file_path, 'res', 'internal', 'config.json');
    if(!fs.existsSync(config_file)) {
      return {};
    }
    try {
      return JSON.parse(fs.readFileSync(config_file, 'utf8'));
    } catch(err) {
      return {};
    }
  }

  /**
   * Applies standalone-only generated state after backend refresh.
   * @param {String} file_path - Path to presentation directory.
   */
  _applyStandalonePresentationState(file_path) {
    this._bundleStandaloneModuleResources(file_path);
    this._rewriteStandaloneImports(file_path);
    var html_file = this.jsl.inter.env.pathJoin(file_path, 'index.html');
    var html = this.jsl.inter.env.readFileSync(html_file).toString();

    this._syncStandaloneBufferedAssets(
      file_path,
      this._collectStandaloneBufferedAssets(html)
    );
    this._removePresentationServerExecutable(file_path);
  }

  /**
   * Applies online-only generated state after backend refresh.
   * @param {String} file_path - Path to presentation directory.
   */
  _applyOnlinePresentationState(file_path) {
    this._bundleStandaloneModuleResources(
      file_path,
      this._getAutoGlobalModuleEntries(file_path)
    );
    this._syncStandaloneBufferedAssets(file_path, []);
    this._removePresentationServerExecutable(file_path);
  }

  /**
   * Reads persisted presentation resource flags from generated globals.
   * @param {String} file_path - Path to presentation directory.
   * @returns {Object}
   */
  _readPresentationResourceFlags(file_path) {
    var globals_file = path.join(file_path, 'res', 'internal', 'globals.js');
    if(!fs.existsSync(globals_file)) {
      return {};
    }
    var source = fs.readFileSync(globals_file, 'utf8');
    var match = source.match(/window\.presentation_resources\s*=\s*(\{[\s\S]*?\});/);
    if(!match) {
      return {};
    }
    try {
      return JSON.parse(match[1]);
    } catch(err) {
      return {};
    }
  }

  /**
   * Restores raw asset files from standalone .buf.js wrappers.
   * @param {String} file_path - Path to presentation directory.
   */
  _restoreStandaloneBufferedAssets(file_path) {
    function walk(dir_path) {
      if(!fs.existsSync(dir_path)) {
        return;
      }
      for(var entry of fs.readdirSync(dir_path, { withFileTypes: true })) {
        var entry_path = path.join(dir_path, entry.name);
        if(entry.isDirectory()) {
          walk(entry_path);
        } else if(entry.isFile() && entry.name.endsWith('.buf.js')) {
          var source = fs.readFileSync(entry_path, 'utf8');
          var match = source.match(/registerFile\("([^"]+)",\s*"([^"]*)"\);?/);
          if(!match) {
            continue;
          }
          var rel = decodeURIComponent(match[1]);
          var asset_path = path.resolve(file_path, rel);
          fs.mkdirSync(path.dirname(asset_path), { recursive: true });
          fs.writeFileSync(asset_path, Buffer.from(match[2], 'base64'));
        }
      }
    }

    walk(file_path);
  }

  /**
   * Restores presentation module resources from persisted flags.
   * @param {String} file_path - Path to presentation directory.
   * @param {Object} resources - Persisted presentation resource flags.
   */
  _restorePresentationModuleResources(file_path, resources = {}) {
    var res_path = this.jsl.inter.env.pathJoin(file_path, 'res');
    if(resources.pdfjs) {
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/pdfjs-dist-3.11.174/pdf.min.js'),
        this.jsl.inter.env.pathJoin(res_path, 'pdf.min.js'));
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/pdfjs-dist-3.11.174/pdf.worker.min.js'),
        this.jsl.inter.env.pathJoin(res_path, 'pdf.worker.min.js'));
    }
    if(resources.plotly) {
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/plotly-3.3.0/plotly-3.3.0.min.js'),
        this.jsl.inter.env.pathJoin(res_path, 'plotly-3.3.0.min.js'));
    }
    if(resources.mathjax) {
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'js/windows/mathjax-config.js'),
        this.jsl.inter.env.pathJoin(res_path, 'mathjax-config.js'));
      this.jsl.inter.file_system.copyFolder(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/MathJax-3.2.0'),
        this.jsl.inter.env.pathJoin(res_path, 'MathJax-3.2.0'));
    }
    if(resources.three) {
      this.jsl.inter.file_system.copyFolder(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/three.js-r162'),
        this.jsl.inter.env.pathJoin(res_path, 'three.js-r162'));
    }
    if(resources.ui) {
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'css/ui.css'),
        this.jsl.inter.env.pathJoin(res_path, 'ui.css'));
      this.jsl.inter.file_system.copyFile(
        this.jsl.inter.env.pathJoin(this.jsl.app_path, 'js/windows/ui.js'),
        this.jsl.inter.env.pathJoin(res_path, 'ui.js'));
    }
  }

  /**
   * Removes standalone-only generated artifacts after restoring the online version.
   * @param {String} file_path - Path to presentation directory.
   */
  _removeStandaloneGeneratedArtifacts(file_path) {
    this._removeStaleStandaloneBundles(file_path, new Set());
    this._syncStandaloneBufferedAssets(file_path, []);
  }

  /**
   * Returns JavaScript files that should have dynamic imports rewritten for standalone mode.
   * @param {String} file_path - Path to presentation directory.
   * @returns {String[]}
   */
  _getStandaloneRewriteJsFiles(file_path) {
    var skip_dirs = new Set([
      path.resolve(file_path, 'res', 'MathJax-3.2.0'),
      path.resolve(file_path, 'res', 'tex-mml-chtml-3.2.0'),
      path.resolve(file_path, 'res', 'three.js-r162'),
    ]);
    var files = [];

    function walk(dir_path) {
      if(skip_dirs.has(dir_path)) {
        return;
      }
      for(var entry of fs.readdirSync(dir_path, { withFileTypes: true })) {
        var entry_path = path.join(dir_path, entry.name);
        if(entry.isDirectory()) {
          walk(entry_path);
        } else if(entry.isFile() && entry.name.endsWith('.js') &&
            entry_path != path.join(file_path, 'res', 'internal', 'globals.js') &&
            !entry.name.endsWith('.min.js') &&
            !entry.name.endsWith('.standalone.js') &&
            !entry.name.endsWith('.module.js') &&
            !entry.name.endsWith('.buf.js')) {
          files.push(entry_path);
        }
      }
    }

    walk(file_path);
    files.sort();
    return files;
  }

  /**
   * Rewrites dynamic imports in exported presentation scripts to standalone-aware loader calls.
   * @param {String} file_path - Path to presentation directory.
   */
  _rewriteStandaloneImports(file_path) {
    var js_files = this._getStandaloneRewriteJsFiles(file_path);
    var b = recast.types.builders;

    for(var js_file of js_files) {
      var source = fs.readFileSync(js_file, 'utf8');
      var ast;
      try {
        ast = recast.parse(source, { parser: recast_babel_parser });
      } catch(err) {
        continue;
      }

      var changed = false;
      recast.types.visit(ast, {
        visitImportExpression(path_obj) {
          changed = true;
          path_obj.replace(
            b.callExpression(
              b.memberExpression(
                b.identifier('window'),
                b.identifier('__importPresentationModule'),
                false
              ),
              [path_obj.node.source]
            )
          );
          return false;
        },
        visitCallExpression(path_obj) {
          if(path_obj.node.callee &&
              path_obj.node.callee.type === 'Import') {
            changed = true;
            path_obj.replace(
              b.callExpression(
                b.memberExpression(
                  b.identifier('window'),
                  b.identifier('__importPresentationModule'),
                  false
                ),
                path_obj.node.arguments
              )
            );
            return false;
          }
          this.traverse(path_obj);
        }
      });

      if(changed) {
        fs.writeFileSync(js_file, recast.print(ast).code, 'utf8');
      }
    }
  }
  
  /**
   * Writes globals required by generated presentation runtime files.
   * @param {String} file_path - Path to presentation directory.
   */
  _writePresentationGlobals(file_path, modules) {
    var handled = new Set((Array.isArray(modules) ? modules : []).map(function(module) {
      return module === 'plot-json' ? 'plot' : module;
    }));
    var resources = {
      pdfjs: handled.size ? handled.has('img-pdf') :
        this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'res', 'pdf.min.js')),
      plotly: handled.size ? handled.has('plot') :
        this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'res', 'plotly-3.3.0.min.js')) ||
        this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'res', 'plotly-2.24.2.min.js')),
      mathjax: handled.size ? handled.has('latex') :
        this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'res', 'mathjax-config.js')) ||
        this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'res', 'MathJax-3.2.0', 'tex-mml-chtml.js')) ||
        this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'res', 'tex-mml-chtml-3.2.0', 'tex-mml-chtml-3.2.0.js')),
      three: handled.size ? handled.has('scene-3d-json') :
        this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'res', 'three.js-r162', 'build', 'three.module.js')),
      ui: handled.size ? handled.has('ui') :
        this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'res', 'ui.js'))
    };
    var presentation_language_strings = {
      "315": this.jsl.inter.lang.currentString(315),
      "316": this.jsl.inter.lang.currentString(316),
      "317": this.jsl.inter.lang.currentString(317),
      "318": this.jsl.inter.lang.currentString(318),
      "363": this.jsl.inter.lang.currentString(363),
    };
    this.jsl.inter.file_system.writeFile(this.jsl.inter.env.pathJoin(file_path, 'res/internal/globals.js'), `
window._standalone = window.location.protocol == 'file:';
window.presentation_resources = ${JSON.stringify(resources)};
window.__standalone_modules = window.__standalone_modules || {};
window.__presentation_script_promises = window.__presentation_script_promises || {};
window.__getPresentationStandaloneModulePath = function(module_path) {
  if(module_path.endsWith('.module.js')) {
    return module_path.replace(/\\.module\\.js$/, '.standalone.js');
  }
  if(module_path.endsWith('.js')) {
    return module_path.replace(/\\.js$/, '.standalone.js');
  }
  if(module_path.endsWith('.mjs')) {
    return module_path.replace(/\\.mjs$/, '.standalone.mjs');
  }
  return module_path + '.standalone.js';
};
window.__loadPresentationScript = function(script_path) {
  if(typeof script_path != 'string' ||
      !/\\.(?:js|mjs)(?:[?#].*)?$/i.test(script_path)) {
    return Promise.reject(new Error('Invalid presentation script path: ' + script_path));
  }
  var resolved = new URL(script_path, window.location.href).href;
  if(/\\/index\\.html?(?:[#?].*)?$/i.test(resolved.replace(/\\\\/g, '/'))) {
    return Promise.reject(new Error('Refusing to load presentation page as script: ' + resolved));
  }
  if(window.__presentation_script_promises[resolved]) {
    return window.__presentation_script_promises[resolved];
  }
  window.__presentation_script_promises[resolved] = new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = resolved;
    script.onload = function() {
      resolve(true);
    };
    script.onerror = function() {
      reject(new Error('Failed to load script: ' + resolved));
    };
    document.head.appendChild(script);
  });
  return window.__presentation_script_promises[resolved];
};
window.__importPresentationModule = async function(module_path) {
  if(window._standalone) {
    if(Object.prototype.hasOwnProperty.call(window.__standalone_modules, module_path)) {
      return window.__standalone_modules[module_path];
    }
    var standalone_path = window.__getPresentationStandaloneModulePath(module_path);
    await window.__loadPresentationScript(standalone_path);
    return window.__standalone_modules[module_path];
  }
  return import(new URL(module_path, window.location.href).href);
};
window.language = {
  currentString: function(id) {
    var strings = ${JSON.stringify(presentation_language_strings)};
    var key = String(id);
    if(Object.prototype.hasOwnProperty.call(strings, key)) {
      return strings[key];
    }
    return '';
  }
};
    `);
  }
  
  /**
   * Resolves and returns a presentation directory path, prompting the user if necessary.
   * @param {String} method - Name of the calling method for error reporting.
   * @param {String} [file_path] - Candidate path supplied by the caller.
   * @returns {(String|false)} Resolved presentation directory path or false if cancelled.
   */
  _getPath(method, file_path) {
    if(!file_path) {
      var options = {
        title: this.jsl.inter.lang.currentString(239),
        buttonLabel: this.jsl.inter.lang.currentString(231),
        properties: ['openDirectory'],
      };
      file_path = this.jsl.inter.env.showOpenDialogSync(options);
      if(file_path === undefined) {
        this.jsl.inter.env.error('@' + method + ': '+this.jsl.inter.lang.string(119)+'.');
        return false;
      } else {
        file_path = file_path[0];
      }
    }    
    return file_path;
  }
  
  /**
   * Checks whether the supplied directory contains a valid presentation structure.
   * @param {String} method - Name of the calling method for error reporting.
   * @param {String} file_path - Path to the presentation directory to validate.
   * @returns {Boolean} True if the directory contains a `index.html` file, otherwise false.
   */
  _checkPresentation(method, file_path) {
    if(!this.jsl.inter.file_system.existFile(this.jsl.inter.env.pathJoin(file_path, 'index.html'))) {
      this.jsl.inter.env.error('@' + method + ': '+this.jsl.inter.lang.string(240));
      return false;
    }
    return true;
  }
  
  /**
   * Starts or reuses the internal HTTP server that serves the presentation.
   * @param {String} file_path - Absolute path to the presentation directory.
   * @returns {Promise<String>} Resolves to the presentation URL.
   */
  _startPresentation(file_path) {
    var key = path.resolve(file_path);
    var cached = this.presentation_servers.get(key);
    if(cached) {
      if(cached.url) {
        return Promise.resolve(cached.url);
      }
      if(cached.promise) {
        return cached.promise;
      }
    }

    var promise = new Promise((resolve, reject) => {
      var server = http.createServer(this._handlePresentationRequest.bind(this, key));
      server.once('error', (err) => {
        this.presentation_servers.delete(key);
        reject(err);
      });
      server.listen(0, '127.0.0.1', () => {
        var address = server.address();
        var url = 'http://127.0.0.1:' + address.port + '/';
        this.presentation_servers.set(key, {
          root_path: key,
          server: server,
          url: url
        });
        resolve(url);
      });
    });

    this.presentation_servers.set(key, { promise: promise });
    return promise;
  }

  /**
   * Stops the internal HTTP server for one presentation.
   * @param {String} file_path - Absolute or relative path to the presentation directory.
   */
  _stopPresentationServer(file_path) {
    var key = path.resolve(file_path);
    var cached = this.presentation_servers.get(key);
    if(cached && cached.server) {
      cached.server.close();
    }
    this.presentation_servers.delete(key);
  }

  /**
   * Handles one internal presentation HTTP request.
   * @param {String} root_path - Absolute path to the presentation directory.
   * @param {import('http').IncomingMessage} req
   * @param {import('http').ServerResponse} res
   */
  _handlePresentationRequest(root_path, req, res) {
    if(req.method != 'GET' && req.method != 'HEAD') {
      res.writeHead(405, { 'Allow': 'GET, HEAD' });
      res.end();
      return;
    }

    var req_url;
    try {
      req_url = new URL(req.url, 'http://127.0.0.1');
    } catch(err) {
      res.writeHead(400);
      res.end();
      return;
    }

    if(req_url.pathname == '/keepalive') {
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      res.end();
      return;
    }

    var rel_path = req_url.pathname == '/' ? '/index.html' : req_url.pathname;
    var file_path;
    try {
      file_path = path.resolve(root_path, '.' + decodeURIComponent(rel_path));
    } catch(err) {
      res.writeHead(400);
      res.end();
      return;
    }

    var root_norm = path.resolve(root_path);
    var file_norm = path.resolve(file_path);
    if(file_norm != root_norm &&
        !file_norm.toLowerCase().startsWith((root_norm + path.sep).toLowerCase())) {
      res.writeHead(403);
      res.end();
      return;
    }

    this._servePresentationPath(req, res, root_norm, file_norm);
  }

  /**
   * Serves one static file from the internal presentation HTTP server.
   * @param {import('http').IncomingMessage} req
   * @param {import('http').ServerResponse} res
   * @param {String} root_path
   * @param {String} file_path
   */
  _servePresentationPath(req, res, root_path, file_path) {
    fs.stat(file_path, (err, stats) => {
      if(err) {
        res.writeHead(404);
        res.end();
        return;
      }

      if(stats.isDirectory()) {
        this._servePresentationPath(req, res, root_path,
          path.join(file_path, 'index.html'));
        return;
      }

      var headers = {
        'Content-Type': this._getPresentationContentType(file_path),
        'Cache-Control': 'no-store',
        'Accept-Ranges': 'bytes'
      };

      var start = 0;
      var end = stats.size - 1;
      var status = 200;
      var range = req.headers.range;
      if(typeof range == 'string') {
        var match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if(match) {
          if(match[1]) {
            start = parseInt(match[1], 10);
          } else if(match[2]) {
            start = Math.max(0, stats.size - parseInt(match[2], 10));
          }
          if(match[2]) {
            end = parseInt(match[2], 10);
          }
          if(!match[1]) {
            end = stats.size - 1;
          }
          if(start > end || start >= stats.size) {
            res.writeHead(416, {
              'Content-Range': 'bytes */' + stats.size,
              'Cache-Control': 'no-store'
            });
            res.end();
            return;
          }
          end = Math.min(end, stats.size - 1);
          status = 206;
          headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stats.size;
        }
      }

      headers['Content-Length'] = String(end - start + 1);
      res.writeHead(status, headers);
      if(req.method == 'HEAD') {
        res.end();
        return;
      }

      var stream = fs.createReadStream(file_path, { start: start, end: end });
      stream.on('error', function() {
        if(!res.headersSent) {
          res.writeHead(500);
        }
        res.end();
      });
      stream.pipe(res);
    });
  }

  /**
   * Returns the HTTP content type for one served presentation asset.
   * @param {String} file_path
   * @returns {String}
   */
  _getPresentationContentType(file_path) {
    var ext = path.extname(file_path).toLowerCase();
    var types = {
      '.css': 'text/css; charset=utf-8',
      '.gif': 'image/gif',
      '.htm': 'text/html; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.map': 'application/json; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.ogg': 'audio/ogg',
      '.otf': 'font/otf',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain; charset=utf-8',
      '.ttf': 'font/ttf',
      '.wasm': 'application/wasm',
      '.webm': 'video/webm',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2'
    };
    return types[ext] || 'application/octet-stream';
  }
  
  /**
   * Convert file to JavaScript base64 buffer.
   * @param {String} file_path - Path to presentation.
   * @param {String} rel - Path to file.
   */
  _fileToBuffer(file_path, rel) {
    var abs = this.jsl.inter.env.pathResolve(this.jsl.inter.env.pathJoin(file_path, rel));
    var bin = this.jsl.inter.env.readFileSync(abs);
    var b64  = bin.toString('base64');
    var name = encodeURIComponent(rel.replace(/\\/g, "/"));
    this.jsl.inter.file_system.writeFile(abs + '.buf.js',
      'registerFile("'+name+'", "'+b64+'");');
  }
}

exports.PRDC_JSLAB_LIB_PRESENTATION = PRDC_JSLAB_LIB_PRESENTATION;
