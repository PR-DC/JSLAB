/**
 * @file JSLAB library presentation submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

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
      var name = this.jsl.inter.env.pathBaseName(file_path);
      if(type == 'standalone') {
        var url = this.jsl.inter.env.pathJoin(file_path, 'index.html')
        var wid = this.jsl.inter.windows.openWindow(url);
      } else {
        var url = await this._startPresentation(this.jsl.inter.env.pathJoin(file_path, name + '.exe'));
        var wid = this.jsl.inter.windows.openWindow('url.html');
      }
      await this.jsl.inter.windows.open_windows[wid].ready;
      var context = this.jsl.inter.windows.open_windows[wid].context;
      var fullscreen = false;
      if(type == 'standalone') {
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
      var name = this.jsl.inter.env.pathBaseName(file_path);
      if(type == 'standalone') {
        var url = this.jsl.inter.env.pathJoin(file_path, 'index.html')
      } else {
        var url = await this._startPresentation(this.jsl.inter.env.pathJoin(file_path, name + '.exe'));
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
      this._updatePresentationBackend(file_path);
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
    var name = this.jsl.inter.env.pathBaseName(file_path);
    var presentation_config = {
      "jslab_version": this.jsl.context.version,
      "slide_width": 1920,
      "slide_height": 1080,
      ...opts_in
    }
    this.jsl.inter.env.makeDirectory(file_path);
    this.jsl.inter.env.makeDirectory(this.jsl.inter.env.pathJoin(file_path, 'res/'));
    this.jsl.inter.env.makeDirectory(this.jsl.inter.env.pathJoin(file_path, 'res/internal/'));

    var js = this.jsl.inter.env.readFileSync(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'js/windows/presentation.js')).toString();
    js = js.replace('%presentation_config%', JSON.stringify(presentation_config, false, 2));
    this.jsl.inter.file_system.writeFile(this.jsl.inter.env.pathJoin(file_path, 'res/internal/presentation.js'), js);
    
    this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/portable_server/portable_server.exe'),
      this.jsl.inter.env.pathJoin(file_path, name + '.exe'));
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
      var html_file = this.jsl.inter.env.pathJoin(file_path, 'index.html');
      var html = this.jsl.inter.env.readFileSync(html_file).toString();
      
      var reImagePdf = /<img-pdf\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
      var rePlotJson = /<plot-json\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
      var reScene3dJson = /<scene-3d-json\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
      
      var assets = new Set();
      for(var re of [reImagePdf, rePlotJson, reScene3dJson]) {
        let m;
        while((m = re.exec(html)) !== null) {
          var rel = m[1].trim();
          if(!rel) continue;
          assets.add(rel);
        }
      }

      for(var file of [...assets]) {
        this._fileToBuffer(file_path, file);
      }
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
    var name = this.jsl.inter.env.pathBaseName(file_path);
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
    
    this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/portable_server/portable_server.exe'),
      this.jsl.inter.env.pathJoin(file_path, name + '.exe'));
    this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'css/presentation.css'),
      this.jsl.inter.env.pathJoin(file_path, 'res/internal/presentation.css'));
    this._refreshPresentationHtmlIncludes(file_path);
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
   * Starts the portable HTTP server that serves the presentation and
   * resolves once the server prints the listening URL.
   * @param {String} exe_file - Absolute path to the portable server executable.
   * @returns {Promise<String>} Resolves to the presentation URL.
   */
  _startPresentation(exe_file) {
    var obj = this;
    return new Promise((resolve, reject) => {
      const child = obj.jsl.inter.env.spawn(exe_file, ['--prog'], {
        stdio: ['ignore', 'pipe', 'inherit'],
        windowsHide: true
      });
      
      let buffer = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', chunk => {
        buffer += chunk;
        const nl = buffer.indexOf('\n');
        if(nl !== -1) {
          let line = buffer.slice(0, nl).replace(/\r$/, '').trim();
          child.stdout.removeAllListeners('data');
          let url = line.replace(/^\s*url:/i, '');
          resolve(url);
        }
      });

      child.once('error', reject);
      child.once('exit', code => {
        reject(`Server exited early with code ${code}`);
      });
    });
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
