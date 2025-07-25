/**
 * @file JSLAB library device submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


var { PRDC_JSLAB_DEVICE_GAMEPAD } = require('./device-gamepad');
 
/**
 * Class for JSLAB device submodule.
 */
class PRDC_JSLAB_LIB_DEVICE {
  
  /**
   * Constructs a device submodule object with access to JSLAB's device functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    
    this._camera_resolutions = [
      { "label": "4K (UHD)", "width": 3840, "height": 2160, "ratio": "16:9" },
      { "label": "1080p (FHD)", "width": 1920, "height": 1080, "ratio": "16:9" },
      { "label": "720p (HD)", "width": 1280, "height": 720, "ratio": "16:9" },
      { "label": "480p (VGA)", "width": 640, "height": 480, "ratio": "4:3" },
      { "label": "360p (nHD)", "width": 640, "height": 360, " ratio": "16:9" },
      { "label": "240p (QVGA)", "width": 320, "height": 240, "ratio": "4:3" },
      { "label": "144p (QCIF)", "width": 176, "height": 144, "ratio": "4:3" },
    ];
  }

  /**
   * Checks if a specific driver is installed on the system.
   * @param {string} driver_name - Name of the driver to check.
   * @returns {boolean} True if the driver is found, false otherwise.
   */
  checkDriver(driver_name){
    var val = this.jsl.env.execSync('driverquery');
    if(val.state == 'success') {
      var output = val.data.split(/[\r\n]+/);
      var output_lc = output.map(function(x) { return x.toLowerCase(); });
      if(!Array.isArray(driver_name)) {
       driver_name = [driver_name];
      }
      driver_name = driver_name.map(function(x) { return x.toLowerCase(); });
      var data_out = [];
      for(var i = 0; i < driver_name.length; i++) {
        var idx = output_lc.map(function(x) { return x.startsWith(driver_name[i]); }).findIndex(function(x) { return x == true; });
        if(idx >= 0) {
          data_out[i] = output[idx];
        } else {
          data_out[i] = '';
        }
      }
      if(data_out.every(function(x) { return x.length; })) {
        if(this.jsl.debug) {
          this.jsl.env.disp('@checkDriver: ' + data_out);
        }
        return true; 
      } else {
        return false; 
      }
    } else {
      if(this.jsl.debug) {
        this.jsl.env.error('@checkDriver: ' + val.data);
      }
      return false; 
    }
  }

  /**
   * Checks if the drivers for FTDI devices are installed.
   * @returns {boolean} True if the drivers are found, false otherwise.
   */
  checkDriverFTDI() {
    return this.checkDriver(['FTDIBUS', 'FTSER2K']);
  }
 
  /**
   * Checks if the drivers for Silicon Labs CP210x USB to UART bridge are installed.
   * @returns {boolean} True if the drivers are found, false otherwise.
   */
  checkDriverCP210x() {
    return this.checkDriver('silabser');
  }
 
  /**
   * Checks if the drivers for CH340 USB to serial converter are installed.
   * @returns {boolean} True if the drivers are found, false otherwise.
   */
  checkDriverCH340() {
    return this.checkDriver('CH341SER_A64');
  }

  /**
   * Check if Arduino CLI is available.
   * @returns {boolean} True if available.
   */
  checkArduino() {
    try {
      var output = this.jsl.env.execSync('arduino-cli -h', { stdio: 'pipe' });
      return true;
    } catch(err) {
      this.jsl.env.error('@checkArduino: '+language.string(224));
    }
  }
  
  /**
   * Compile Arduino project.
   * @param {string} dir - Project directory.
   * @returns {Object|boolean} Compilation result or false on error.
   */
  compileArduino(dir) {
    var config_file = this.jsl.env.pathJoin(dir, 'config.json');
    if(!this.jsl.env.checkFile(config_file)) {
      this.jsl.env.error('@compileArduino: '+language.string(225));
      return false;
    }
    
    this.checkArduino();
    try {
      var config = JSON.parse(this.jsl.env.readFileSync(config_file))
      var build_property_str = '';
      if(config.build_property) {
        build_property_str = `--build-property "${config.build_property}"`;
      }
      var output = this.jsl.env.spawnSync(`arduino-cli compile --json -b "${config.b}" ${build_property_str} "${dir}"`, {
        shell: true,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return this.parseArduinoOtuput(output);
    } catch(err) {
      this.jsl.env.error('@compileArduino: Error: '+err.toString());
    }
  }
 
  /**
   * Upload Arduino project.
   * @param {string} dir - Project directory.
   * @param {string} [port] - Optional port.
   * @returns {Object|boolean} Upload result or false on error.
   */
  uploadArduino(dir, port) {
    var config_file = this.jsl.env.pathJoin(dir, 'config.json');
    if(!this.jsl.env.checkFile(config_file)) {
      this.jsl.env.error('@uploadArduino: '+language.string(225));
      return false;
    }
    
    this.checkArduino();
    try {
      var config = JSON.parse(this.jsl.env.readFileSync(config_file));
      var build_property_str = '';
      if(config.build_property) {
        build_property_str = `--build-property "${config.build_property}"`;
      }
      var port_str = '';
      if(port) {
        port_str = `-p "${port}"`;
      } else if(config.port) {
        port_str = `-p "${config.port}"`;
      }
      var output = this.jsl.env.spawnSync(`arduino-cli compile --json -u -t -b "${config.b}" ${build_property_str} ${port_str} "${dir}"`, {
        shell: true,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return this.parseArduinoOtuput(output);
    } catch(err) {
      this.jsl.env.error('@uploadArduino: Error: '+err.toString());
    }
  }
  
  /**
   * Parses Arduino output from stdout or stderr.
   * @param {object} output
   * @returns {object}
   */
  parseArduinoOtuput(output) {
    var data_string;
    if(output.stdout) {
      data_string = output.stdout;
    } else if(output.stderr) {
      data_string = output.stderr;
    }
    
    var data = JSON.parse(data_string);
    if(!data.success) {
      this.jsl.env.warn('@parseArduinoOtuput: Compile failed!');
      this.jsl.env.disp(`@parseArduinoOtuput: Compiler error:
${this.jsl.format.replaceEditorLinks(data.compiler_err)}`);
    }
    return data;
  }
  
  /**
   * Retrieves the current state of all connected gamepads.
   * @returns {Object[]} An array of connected gamepad objects.
   */
  getGamepads() {
    return this.jsl.env.navigator.getGamepads()
      .filter((g) => !isNull(g))
      .map(g => g.toJSON());
  }
 
  /**
   * Registers a callback function to be called when a gamepad is connected.
   * @param {Function} callback - The function to execute when a gamepad connects.
   */
  onGamepadConnected(callback) {
    var obj = this;
    var listener = function(e) {
      if(e.gamepad) {
        e.gamepad = e.gamepad.map(g => g.toJSON());
      }
      callback(e);
    };
    this.jsl.env.context.addEventListener("gamepadconnected", listener);
    this.jsl.addForCleanup(this, function() {
      obj.jsl.env.context.removeEventListener("gamepadconnected", listener);
    });
  }
 
  /**
   * Registers a callback function to be called when a gamepad is disconnected.
   * @param {Function} callback - The function to execute when a gamepad disconnects.
   */
  onGamepadDisconnected(callback) {
    var obj = this;
    var listener = function(e) {
      if(e.gamepad) {
        e.gamepad = e.gamepad.map(g => g.toJSON());
      }
      callback(e);
    };
    this.jsl.env.context.addEventListener("gamepaddisconnected", listener);
    this.jsl.addForCleanup(this, function() {
      obj.jsl.env.context.removeEventListener("gamepaddisconnected", listener);
    });
  }
 
  /**
   * Retrieves a specific gamepad by its ID.
   * @param {number} id - The index of the gamepad to retrieve.
   * @param {number} dt - Data reading interval in milliseconds.
   * @returns {PRDC_JSLAB_DEVICE_GAMEPAD} The corresponding gamepad object.
   */
  getGamepad(id, dt) {
    return new PRDC_JSLAB_DEVICE_GAMEPAD(this.jsl, id, dt);
  }
   
  /**
   * Retrieves a list of available webcam (video input) devices.
   * @returns {Object[]} A promise that resolves to an array of video input devices.
   */
  async getWebcams() {
    var devices = await this.jsl.env.navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'videoinput')
      .map(device => device.toJSON());
  }

  /**
   * Retrieves a list of available microphone (audio input) devices.
   * @returns {Object[]} A promise that resolves to an array of audio input devices.
   */
  async getMicrophones() {
    var devices = await this.jsl.env.navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'audioinput')
      .map(device => device.toJSON());
  }
 
  /**
   * Retrieves a list of available audio output devices.
   * @returns {Object[]} A promise that resolves to an array of audio output devices.
   */
  async getAudioOutputs() {
    var devices = await this.jsl.env.navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'audiooutput')
      .map(device => device.toJSON());
  }
 
  /**
   * Opens a new window to display the webcam feed from the specified device.
   * @param {string} device_id - The unique identifier of the webcam device to use.
   * @returns {Promise<WebcamResult>} An object containing the window instance, video element, and media stream.
   */
  async webcam(device_id) {
    var win = await openWindowBlank();
    win.setTitle('Webcam');
    win.document.body.innerHTML += '<video id="video"></video>';
    var dom = win.document.getElementById('video');
    Object.assign(dom.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '100%',
      height: '100%',
      objectFit: 'contain'
    });
    try {
      var constraints = {
        video: { deviceId: { exact: device_id } },
        audio: false
      };
      var stream = await this.jsl.env.navigator.mediaDevices.getUserMedia(constraints);
    } catch(err) {
      this.jsl._console.log(err, constraints);
      this.jsl.env.error('@capture: '+language.string(222));
    }
    dom.srcObject = stream;
    dom.play();
    this.jsl.addForCleanup(this, function() {
      stream.getTracks().forEach(track => track.stop());
      dom.srcObject = null;
    });
    return { win, dom, stream };
  }
  
   
  /**
   * Initiates webcam video capture.
   * @param {Object} opts - Configuration options for webcam capture.
   * @param {function} frameCallback - Callback invoked with each frame's image data buffer.
   * @param {function} [editCallback] - Optional callback to edit each frame before processing.
   */
  webcamCapture(opts, frameCallback, editCallback) {
    opts.type = 'webcam';
    this.capture(opts, frameCallback, editCallback);
  }
   
  /**
   * Retrieves desktop sources from the current environment.
   * @returns {DesktopSource[]} An array of desktop sources.
   */
  getDesktopSources() {
    return this.jsl.env.getDesktopSources();
  }
   
  /**
   * Displays the available desktop sources by generating and injecting HTML elements for each source.
   * @returns {void}
   */
  showDesktopSources() {
    var html = '';
    var sources = this.jsl.env.getDesktopSources();
    for(source of sources) {
      var { width, height } = source.thumbnail.getSize();
      html += '<div style="padding:10px; margin: 10px; border: #ccc 1px solid; border-radius: 5px;"><div><b>Name:</b> '+source.name+'</div><div><b>Id:</b> '+source.id+'</div><div><b>DisplayId:</b> '+source.display_id+'</div><img style="padding-top: 10px; width:'+width+'px; height:'+height+'px;" src="'+source.thumbnail.toDataURL()+'"></img></div>';
    }
    this.jsl.env.disp(html);
  }
  
  /**
   * Initiates desktop screen capture.
   * @param {Object} opts - Configuration options for desktop capture.
   * @param {function} frameCallback - Callback invoked with each frame's image data buffer.
   * @param {function} [editCallback] - Optional callback to edit each frame before processing.
   */
  desktopCapture(opts, frameCallback, editCallback) {
    opts.type = 'desktop';
    this.capture(opts, frameCallback, editCallback);
  }
  
  /**
   * Captures media frames based on the provided options.
   * @param {Object} opts - Configuration options for capturing.
   * @param {string} opts.id - The ID of the media source.
   * @param {string} opts.type - Type of capture ('webcam' or 'desktop').
   * @param {function} frameCallback - Callback invoked with each frame's image data buffer.
   * @param {function} [editCallback] - Optional callback to edit each frame before processing.
   * @returns {Object} An object containing control functions and resources for the capture session.
   * @returns {function} return.stop - Function to stop the capture.
   * @returns {CanvasRenderingContext2D} return.ctx - The 2D rendering context of the OffscreenCanvas.
   * @returns {OffscreenCanvas} return.offscreenCanvas - The OffscreenCanvas used for rendering frames.
   * @returns {MediaStreamTrack} return.videoTrack - The video track being captured.
   * @returns {MediaStreamTrackProcessor} return.trackProcessor - The processor for the video track.
   * @returns {ReadableStreamDefaultReader} return.reader - Reader for the media stream.
   */
  async capture(opts, frameCallback, editCallback) {
    var { id, type, ...otherOpts } = opts;

    var active = true;
    var constraints;

    // Define media constraints based on capture type
    if(type === 'webcam') {
      constraints = {
        video: { 
          deviceId: { exact: id },
          ...otherOpts
        },
        audio: false
      };
    } else if(type === 'desktop') {
      constraints = {
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: id,
            ...otherOpts
          }
        },
        audio: false
      };
    }

    // Obtain media stream
    if(isEmptyString(id)) {
      this.jsl.env.error('@capture: '+language.string(222));
    }
    
    try {
      var stream = await this.jsl.env.navigator.mediaDevices.getUserMedia(constraints);
    } catch(err) {
      this.jsl._console.log(err);
      this.jsl._console.log(constraints);
      this.jsl.env.error('@capture: '+language.string(222));
    }

    var videoTrack = stream.getVideoTracks()[0];
    var settings = videoTrack.getSettings();

    var width = settings.width || 1280;
    var height = settings.height || 720;

    // Initialize OffscreenCanvas with retrieved width and height
    var offscreenCanvas = new OffscreenCanvas(width, height);
    var ctx = offscreenCanvas.getContext('2d', {willReadFrequently: true});

    /**
     * Stops the frame capture by setting active to false.
     */
    function stop() {
      active = false;
    }

    /**
     * Continuously reads frames from the media stream, processes them, and invokes callbacks.
     */
    async function getFrames() {
      while(active) {
        var { value, done } = await reader.read();
        if(done) {
          break;
        }

        var frame = value;
        ctx.drawImage(frame, 0, 0, width, height);

        if(typeof editCallback === 'function') {
          editCallback(frame, width, height);
        }

        var imageData = ctx.getImageData(0, 0, width, height);
        frameCallback(imageData.data.buffer, width, height, frame);
        frame.close();
      }

      // Cleanup after capturing frames
      videoTrack.stop();
      reader.releaseLock();
      stream.getTracks().forEach(track => track.stop());
    }

    // Initialize MediaStreamTrackProcessor and reader
    var trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
    var reader = trackProcessor.readable.getReader();

    this.jsl.addForCleanup(this, stop);

    // Start processing frames
    getFrames();

    // Return control functions and resources
    return { stop, ctx, offscreenCanvas, videoTrack, trackProcessor, reader };
  }
  
  /**
   * Gets supported camera resolutions for a specific device.
   * @param {string} device_id - The camera device ID.
   * @returns {Promise<Array<Object>>} Supported resolutions.
   */
  async getCameraResolutions(device_id) {
    const resolutions = [];
    for(const resolution of this._camera_resolutions) {
      var constraints = {
        audio: false,
        video: {
          deviceId: { exact: device_id },
          width: { exact: resolution.width },
          height: { exact: resolution.height }
        }
      };
      try {
        const stream = await this.jsl.env.navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach(track => track.stop());
        resolutions.push(resolution);
      } catch(err) {
        this.jsl._console.log(err);
      };
    }
    return resolutions;
  }
  
  /**
   * Displays an audio waveform on the canvas.
   * @param {string} device_id - The microphone device ID.
   * @param {number} [fftSize=2048] - FFT size for analysis.
   * @returns {Object} Controls to stop or reset the waveform.
   */
  async showAudioWaveform(device_id, fftSize =  2048) {
    var obj = this;

    var win = await openCanvas();
    win.setTitle('Audio Waveform');
    var draw_loop;
    var audio_ctx = new AudioContext();
    var analyser = audio_ctx.createAnalyser();
    analyser.fftSize = fftSize;
    var buffer_length = analyser.frequencyBinCount;
    var data = new Uint8Array(buffer_length);

    var canvas = win.canvas;
    var canvas_ctx = canvas.getContext("2d");
    var canvas_width = 1000;
    var canvas_height = 500;
    canvas.width = canvas_width;
    canvas.height = canvas_height;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    
    canvas_ctx.lineWidth = 1;
    canvas_ctx.strokeStyle = "#000";
    var slice_width = canvas_width / buffer_length;
    reset();
    
    var constraints = {
      audio: {
        deviceId: { exact: device_id }
      }
    };
    var stream = await this.jsl.env.navigator.mediaDevices.getUserMedia(constraints);
    var source = audio_ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    
    _update();

    function _update() {
      draw_loop = obj.jsl.context.requestAnimationFrame(function() {
        _update();
      });

      analyser.getByteTimeDomainData(data);

      canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
      canvas_ctx.beginPath();

      let x = 0;
      for(let i = 0; i < buffer_length; i++) {
        const v = data[i] / 128.0;
        const y = v * (canvas_height / 2);

        if(i === 0) {
          canvas_ctx.moveTo(x, y);
        } else {
          canvas_ctx.lineTo(x, y);
        }

        x += slice_width;
      }
      
      canvas_ctx.lineTo(canvas_width, canvas_height / 2);
      canvas_ctx.stroke();
    }

    function stop() {
      obj.jsl.context.cancelAnimationFrame(draw_loop);
      reset();
    }

    function reset() {
      canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
      canvas_ctx.beginPath();
      canvas_ctx.moveTo(0, canvas_height/2);
      canvas_ctx.lineTo(canvas_width, canvas_height / 2);
      canvas_ctx.stroke();
    }
    
    this.jsl.addForCleanup(this, stop);
    
    return { win, stop, reset };
  }
  
  /**
   * Records video from the specified canvas element, webcam deviceId, or desktop sourceId and returns a MediaRecorder augmented with an async stopRecording() that finalizes and saves the file. 
   * @param {(HTMLCanvasElement|string)} source - Canvas element, webcam deviceId, or desktop sourceId to capture. 
   * @param {Object} [opts={}] - Optional settings: type ('canvas' | 'webcam' | 'desktop'), fps, mimeType, and videoBitsPerSecond. 
   * @returns {MediaRecorder} - MediaRecorder that streams the capture and provides a helper to stop and save.
   */
  async startVideoRecording(source, opts = {}) {
    var obj = this;
    var preferredMime = 'video/mp4;codecs="avc1.640028"';
    var fallbackMime  = 'video/webm;codecs=vp9,opus';

    var standardMimeType = MediaRecorder.isTypeSupported(preferredMime) ? 
      preferredMime : fallbackMime;
    
    var stream;
    if(opts.type == 'canvas') {
      stream = source.captureStream(opts.fps);
    } else {
      var constraints;
      if(opts.type === 'webcam') {
        constraints = {
          video: { 
            deviceId: { exact: source },
            ...opts.constrains_opts
          },
          audio: false
        };
      } else {
        constraints = {
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source
            },
            ...opts.constrains_opts
          },
          audio: false
        };
      }
      try {
        stream = await this.jsl.env.navigator.mediaDevices.getUserMedia(constraints);
      } catch(err) {
        this.jsl._console.log(err);
        this.jsl._console.log(constraints);
        this.jsl.env.error('@startVideoRecording: '+language.string(222));
      }
    }

    var mimeType = opts.mimeType || standardMimeType;
    var ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
    var recorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: opts.videoBitsPerSecond || 8_000_000
    });
    
    var chunks = [];
    recorder.ondataavailable = function(e) {
      chunks.push(e.data)
    }
    
    recorder.onstop = async function() {
      var blob = new Blob(chunks, { type: mimeType });
      var buffer = Buffer.from(await blob.arrayBuffer());

      var options = {
       title: language.currentString(236),
       buttonLabel: language.currentString(236),
       filters :[
        {name: ext, extensions: [ext]},
       ]
      };
      var video_path = obj.jsl.env.showSaveDialogSync(options);
      if(video_path) {
        obj.jsl.env.writeFileSync(video_path, buffer);
      }
    }
    
    var recording = true;
    recorder.start(1000);
    
    recorder.stopRecording = async function() {
      if(recording) {
        recording = false;
        recorder.stop();
      }
    }
    return recorder;
  }
}

exports.PRDC_JSLAB_LIB_DEVICE = PRDC_JSLAB_LIB_DEVICE;