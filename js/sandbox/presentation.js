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
   * @param {String} file_path - Absolute or relative path to the presentation directory.
   * @param {String} type - Type of presentation.
   * @returns {Promise<Window>} Resolves to the window context of the opened presentation.
   */
  async openPresentation(file_path, type) {
    file_path = this._getPath('openPresentation', file_path);
    if(this._checkPresentation('editPresentation', file_path)) {
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
    var presentation_language_strings = {
      "315": this.jsl.inter.lang.currentString(315),
      "316": this.jsl.inter.lang.currentString(316),
      "317": this.jsl.inter.lang.currentString(317),
      "318": this.jsl.inter.lang.currentString(318),
      "363": this.jsl.inter.lang.currentString(363),
    };
    this.jsl.inter.file_system.writeFile(this.jsl.inter.env.pathJoin(file_path, 'res/internal/globals.js'), `
window._standalone = window.location.protocol == 'file:';
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
    
    var presentation_scripts = '';
    var presentation_stylesheets = '';
    var threeLoadFailMsg = JSON.stringify(this.jsl.inter.lang.currentString(360));
    if(opts_in.hasOwnProperty('modules')) {
      var handled = new Set();
      for(var module of opts_in.modules) {
        var module = (module === 'plot-json') ? 'plot' : module;
        if(handled.has(module)) continue;
        handled.add(module);
    
        if(module == 'img-pdf') {
          this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/pdfjs-dist-3.11.174/pdf.min.js'), this.jsl.inter.env.pathJoin(file_path, 'res/pdf.min.js'));
          this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/pdfjs-dist-3.11.174/pdf.worker.min.js'), this.jsl.inter.env.pathJoin(file_path, 'res/pdf.worker.min.js'));
          presentation_scripts += `
  <script type="text/javascript" src="./res/pdf.min.js"></script>
  <script type="text/javascript" src="./res/pdf.worker.min.js"></script>
`;
        } else if(module == 'plot') {
          this.jsl.inter.file_system.copyFile(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/plotly-3.3.0/plotly-3.3.0.min.js'), this.jsl.inter.env.pathJoin(file_path, 'res/plotly-3.3.0.min.js'));
          presentation_scripts += `
  <script type="text/javascript" src="./res/plotly-3.3.0.min.js"></script>
`;
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
          presentation_scripts += `
  <script type="text/javascript" src="./res/mathjax-config.js"></script>        
  <script type="text/javascript" src="./res/MathJax-3.2.0/tex-mml-chtml.js"></script>
`;
        } else if(module == 'scene-3d-json') {
          this.jsl.inter.file_system.copyFolder(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'lib/three.js-r162'), this.jsl.inter.env.pathJoin(file_path, 'res/three.js-r162'));
          presentation_scripts += `
  <script type="importmap">
    {
      "imports": {
        "three": "./res/three.js-r162/build/three.module.js",
        "three/addons/": "./res/three.js-r162/examples/jsm/"
      }
    }
  </script>
  <script type="module">
    if(!window._standalone) {
      try {
        const THREE = await import('three');

        window.THREE = THREE;
      } catch(err) {
        console.error(${threeLoadFailMsg}, err);
      }
    }
  </script>
`;
        }
      }        
    }
    var html = this.jsl.inter.env.readFileSync(this.jsl.inter.env.pathJoin(this.jsl.app_path, 'html/presentation.html')).toString();
    html = html.replace('%presentation_scripts%', presentation_scripts);
    html = html.replace('%presentation_stylesheets%', presentation_stylesheets);
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
