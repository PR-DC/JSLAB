/**
 * @file Browser sandbox media acquisition and cleanup
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_LIB_DEVICE } = require('../sandbox/device');

/**
 * Owns browser media resources for one sandbox worker.
 */
class PRDC_JSLAB_WEB_MEDIA {

  /**
   * Creates a media service scoped to the current sandbox.
   * @param {Function} saveLocalFile Writes a finished recording to the workspace.
   */
  constructor(saveLocalFile) {
    this.saveLocalFile = saveLocalFile;
    this.streams = new Set();
    this.contexts = new Set();
    this.samples = new WeakMap();
    this.readers = new Map();
    this.next_reader = 0;
    this.recordings = new Map();
    this.next_recording = 0;
    this.closed = false;
  }

  /**
   * Enumerates devices using the browser's permission and labels.
   * @returns {Promise<string>} Serializable device information.
   */
  async enumerateDevices() {
    return JSON.stringify(await navigator.mediaDevices.enumerateDevices());
  }

  /**
   * Acquires a real browser media stream for the sandbox.
   * @param {MediaStreamConstraints} constraints Browser capture constraints.
   * @returns {Promise<MediaStream>} Live media stream reference.
   */
  async getUserMedia(constraints) {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if(this.closed) {
      for(const track of stream.getTracks()) track.stop();
      throw Error('The sandbox was closed before media capture started.');
    }
    for(const previous of this.streams) {
      if(!previous.active) this.streams.delete(previous);
    }
    this.streams.add(stream);
    return stream;
  }

  /**
   * Creates an audio context in the same realm as the captured stream.
   * @returns {AudioContext} Browser audio context.
   */
  createAudioContext() {
    for(const previous of this.contexts) {
      if(previous.state === 'closed') this.contexts.delete(previous);
    }
    const context = new AudioContext();
    this.contexts.add(context);
    return context;
  }

  /**
   * Samples and draws the waveform with a single worker request.
   */
  drawWaveform(analyser, context, width, height) {
    let data = this.samples.get(analyser);
    if(!data || data.length !== analyser.frequencyBinCount) {
      data = new Uint8Array(analyser.frequencyBinCount);
      this.samples.set(analyser, data);
    }
    PRDC_JSLAB_LIB_DEVICE.drawAudioWaveform(analyser, data, context, width, height);
  }

  /**
   * Starts a video element backed by the selected track for frame capture.
   * @param {MediaStreamTrack} track Live camera track.
   * @returns {Promise<number>} Frame reader handle.
   */
  async openVideoReader(track) {
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = new MediaStream([track]);
    const id = ++this.next_reader;
    this.readers.set(id, { video, track });
    try {
      await video.play();
      return id;
    } catch(error) {
      this.closeVideoReader(id);
      throw error;
    }
  }

  /**
   * Returns the next decoded camera frame for worker-side processing.
   * @param {number} id Frame reader handle.
   */
  readVideoFrame(id) {
    const reader = this.readers.get(id);
    if(!reader || reader.track.readyState === 'ended') return { done: true };
    return new Promise((resolve, reject) => {
      reader.resolve = resolve;
      reader.timer = setTimeout(async () => {
        try {
          const frame = await createImageBitmap(reader.video);
          if(this.readers.has(id)) resolve({ value: frame, done: false });
          else frame.close();
        } catch(error) {
          reject(error);
        }
      }, 1000 / (reader.track.getSettings().frameRate || 30));
    });
  }

  /**
   * Stops a frame reader and settles any request that was waiting for video.
   * @param {number} id Frame reader handle.
   */
  closeVideoReader(id) {
    const reader = this.readers.get(id);
    if(!reader) return;
    this.readers.delete(id);
    clearTimeout(reader.timer);
    reader.video.srcObject = null;
    reader.track.stop();
    reader.resolve?.({ done: true });
  }

  /**
   * Checks a recording format in the realm that owns the media recorder.
   */
  isRecordingTypeSupported(type) {
    return MediaRecorder.isTypeSupported(type);
  }

  /**
   * Creates a recorder and keeps its captured data on the browser thread.
   */
  createRecorder(stream, options) {
    const recorder = new MediaRecorder(stream, options);
    const recording = { recorder, chunks: [] };
    recorder.jslab_recording_id = ++this.next_recording;
    this.recordings.set(recorder.jslab_recording_id, recording);
    recorder.addEventListener('dataavailable', event => recording.chunks.push(event.data));
    recording.stopped = new Promise(resolve => recorder.addEventListener('stop', resolve, { once: true }));
    return recorder;
  }

  /**
   * Stops capture and waits for the browser to emit its final chunk.
   */
  async stopRecorder(id) {
    const recording = this.recordings.get(id);
    if(!recording) return false;
    if(recording.recorder.state !== 'inactive') recording.recorder.stop();
    await recording.stopped;
    return true;
  }

  /**
   * Saves the recording directly from the browser and discards its captured chunks.
   */
  async saveRecording(id, target, options) {
    const recording = this.recordings.get(id);
    if(!recording) throw Error('The recording is no longer available.');
    this.recordings.delete(id);
    if(!target) return false;
    const blob = new Blob(recording.chunks, { type: options.mimeType });
    return this.saveLocalFile(target, blob, options);
  }

  /**
   * Releases resources even when a sandbox worker was hard-stopped.
   */
  dispose() {
    this.closed = true;
    for(const id of this.readers.keys()) this.closeVideoReader(id);
    for(const { recorder } of this.recordings.values()) {
      if(recorder.state !== 'inactive') recorder.stop();
    }
    this.recordings.clear();
    for(const stream of this.streams) {
      for(const track of stream.getTracks()) track.stop();
    }
    this.streams.clear();
    for(const context of this.contexts) {
      if(context.state !== 'closed') void context.close().catch(() => {});
    }
    this.contexts.clear();
  }
}

exports.PRDC_JSLAB_WEB_MEDIA = PRDC_JSLAB_WEB_MEDIA;
