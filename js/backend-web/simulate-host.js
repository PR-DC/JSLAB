/**
 * @file JSLAB browser Simulate window bridge
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_WEB_RENDERER_HOST } = require('./renderer');

const path = require('./node-compatibility');
const { PRDC_JSLAB_SIMULATE_COMPILER } = require('../simulate/compiler');

/**
 * Class for project storage, workspace requests and managed window events.
 */
class PRDC_JSLAB_WEB_SIMULATE_HOST extends PRDC_JSLAB_WEB_RENDERER_HOST {

  /**
   * Creates host services for a same-origin managed Simulate frame.
   */
  constructor(bridge) {
    super({ bridge });
    this.bridge = bridge;
    this._sequence = 0;
    this._tasks = [];
    this._automation = null;
  }

  /**
   * Returns the shared project codec after the compiler metadata has loaded.
   * @returns {Object} Project codec.
   */
  _getCodec() {
    if(!this._codec) {
      const { PRDC_JSLAB_SIMULATE_PROJECT } = require('../simulate/project');
      this._codec = new PRDC_JSLAB_SIMULATE_PROJECT({ language: globalThis.language,
        files: { path, normalizePath: file => String(file), read: file => this.bridge.readWorkspaceText(file),
          write: (file, text) => this.bridge.writeWorkspaceTextSync(file, text),
          showOpenDialog: options => this.bridge.showOpenDialog(options),
          showSaveDialog: options => this.bridge.showSaveDialog(options) } });
    }
    return this._codec;
  }





  /**
   * Supplies the shared renderer helper's process argument query.
   * @param {string} channel Request channel.
   * @param {string} action Request action.
   * @returns {*} Synchronous host response.
   */
  sendSync(channel, action) {
    if(channel == 'sync-message' && action == 'get-process-arguments') {
      return [];
    }
    throw new Error('Unsupported Simulate synchronous host request: ' + action);
  }

  /**
   * Runs a supported parser, file or workspace operation.
   * @param {string} channel Operation name.
   * @param {*} data Operation arguments.
   * @returns {Promise<Object>} Operation response.
   */
  async invoke(channel, data) {
    if(channel == 'JSLAB_SIMULATE_PARSE') {
      return this._getCodec().parse(data);
    }
    if(channel == 'JSLAB_SIMULATE_RESOLVE') {
      return this.bridge.resolveSimulateValue(data);
    }
    if(channel == 'JSLAB_SIMULATE_OPEN') {
      return this._openProject(data);
    }
    if(channel == 'JSLAB_SIMULATE_SAVE') {
      return this._saveProject(data);
    }
    throw new Error('Unsupported Simulate host operation: ' + channel);
  }

  /**
   * Opens a workspace project or imports a source selected in the file picker.
   * @param {string} file_path Optional workspace path.
   * @returns {Promise<Object>} Loaded source, bindings and model settings.
   */
  async _openProject(file_path) {
    return this._getCodec().openFile(file_path);
  }

  /**
   * Saves a portable project through the browser workspace storage service.
   * @param {Object} request Source and project metadata.
   * @returns {Promise<Object>} Saved workspace path.
   */
  async _saveProject(request) {
    return this._getCodec().saveFile(request);
  }

  /**
   * Tracks workspace publishing and animation before completing script automation.
   * @param {Promise<*>} task Asynchronous host operation.
   */
  _track(task) {
    const pending = Promise.resolve(task);
    if(this._automation) {
      this._tasks.push(pending);
    }
    pending.catch(error => globalThis.win_simulate?.appendOutput(String(error.message || error), true));
  }

  /**
   * Handles result delivery and the shared controller's window actions.
   * @param {string} channel Host event channel.
   * @param {*} data Host event data.
   */
  send(channel, data) {
    if(channel == 'JSLAB_SIMULATE_RESULT') {
      this._track(this.bridge.publishSimulation(data));
    } else if(channel == 'JSLAB_SIMULATE_ANIMATION') {
      this._track(this.bridge.openSimulationAnimation(data));
    } else if(channel == 'JSLAB_SIMULATE_AUTOMATION_RESULT') {
      const request = this._automation;
      const tasks = this._tasks.splice(0);
      Promise.all(tasks).then(() => {
        if(request && request.id == data.id) {
          request.resolve(data);
        }
      }, error => {
        if(request) {
          request.resolve({ success: false, error: String(error.message || error) });
        }
      }).finally(() => {
        if(this._automation === request) {
          this._automation = null;
        }
      });
    } else if(channel == 'MainProcess') {
      if(data == 'close-simulate') {
        this.bridge.closeFrameWindow(globalThis);
      } else if(data == 'focus-win') {
        this.bridge.focusWindow('simulate-window');
      } else if(data == 'minimize-win') {
        this.bridge.minimizeWindow('simulate-window');
      } else if(data == 'toggle-maximize-win') {
        this.bridge.toggleSimulateMaximize();
      }
    }
  }

  /**
   * Runs the controller's ordinary script workflow and waits for workspace updates.
   * @param {string} filepath Optional project path.
   * @param {Object} options Script simulation options.
   * @param {string} request_id Owning workspace request identity.
   * @returns {Promise<Object>} Script operation result.
   */
  run(filepath, options = {}, request_id = '') {
    if(this._automation || globalThis.win_simulate.busy) {
      return Promise.resolve({ success: false, error: PRDC_JSLAB_SIMULATE_COMPILER.getText("omjsl-10", language.lang) });
    }
    const id = ++this._sequence;
    return new Promise(resolve => {
      this._automation = { id, request_id, resolve };
      this.emit('SimulateWindow', 'automation', { id, filepath, options });
    });
  }

  /**
   * Cancels only the script request that owns the active compiler operation.
   * @param {string} request_id Workspace request identity.
   * @returns {boolean} Whether the matching operation was cancelled.
   */
  cancel(request_id) {
    if(!this._automation || this._automation.request_id != request_id) {
      return false;
    }
    globalThis.win_simulate.cancelCompiler();
    return true;
  }

  /**
   * Settles pending script requests when the managed frame is destroyed.
   */
  dispose() {
    if(this._automation) {
      this._automation.resolve({ success: false, error: language.currentString(675) });
    }
    this._automation = null;
    this._listeners.clear();
  }
}

exports.PRDC_JSLAB_WEB_SIMULATE_HOST = PRDC_JSLAB_WEB_SIMULATE_HOST;
