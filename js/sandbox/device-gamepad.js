/**
 * @file JSLAB library device gamepad submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for gamepad.
 */
class PRDC_JSLAB_DEVICE_GAMEPAD {
  
  /**
   * Initializes the gamepad device instance.
   * @param {Object} jsl - Reference to the main JSLAB object.
   * @param {string} id - Unique identifier for the gamepad.
   * @param {number} [dt=10] - Data reading interval in milliseconds.
   */
  constructor(jsl, id, dt = 10) {
    var obj = this;
    this.jsl = jsl;
    this.id = id;
    this.active = false;
    this.data;
    
    this.read_gamepad_loop;
    this.read_gamepad_dt = dt;
    
    this._checkGamepadFun = function() {
      obj._checkGamepad();
    };
    this.jsl.context.addEventListener("gamepadconnected", obj._checkGamepadFun);
    
    this.jsl.addForCleanup(this, function() {
      obj.close();
    });
    
    this._checkGamepad();
  }

  /**
   * Checks if the gamepad is connected and updates its state.
   */
  _checkGamepad() {
    var gamepad = this._getGamepad();
    if(gamepad) {
      if(!this.active) {
        this._onConnect();
      }
    }
  }


  /**
   * Retrieves the gamepad object if available.
   * @returns {Gamepad|boolean} The gamepad object if found, otherwise false.
   */
  _getGamepad() {
    var gamepads = this.jsl.env.navigator.getGamepads();
    for(let i = 0; i < gamepads.length; i++) {
      var gamepad = gamepads[i];
      if(gamepad != null) {
        if(gamepad.id == this.id) {
          return gamepad.toJSON();
        }
      }
    }
    return false;
  }
  
  /**
   * Handles gamepad connection events.
   */
  _onConnect() {
    var obj = this;
    
    // Read loop
    this.detect_gamepad_loop = clearIntervalIf(this.detect_gamepad_loop);
    this.active = true;
    clearIntervalIf(this.read_gamepad_loop);
    this.read_gamepad_loop = setInterval(function() {
      var gamepad = obj._getGamepad();
      if(gamepad) {
        if(gamepad.connected) {
          obj._onData(gamepad);
        } else {
          obj._onDisconnect();
        }
      } else {
        obj._onDisconnect();
      }
    }, this.read_gamepad_dt);
    
    if(this.jsl.format.isFunction(this.onConnectCallback)) {
      this.onConnectCallback();
    }
  }

  /**
   * Handles gamepad disconnection events.
   */
  _onDisconnect() {
    this.read_gamepad_loop = clearIntervalIf(this.read_gamepad_loop);
    this.active = false;
    this._checkGamepad();
    if(this.jsl.format.isFunction(this.onDisconnectCallback)) {
      this.onDisconnectCallback();
    }
  }

  /**
   * Handles incoming gamepad data.
   * @param {Gamepad} gamepad - The connected gamepad object.
   */
  _onData(gamepad) {
    this.data = gamepad;
    if(this.jsl.format.isFunction(this.onDataCallback)) {
      this.onDataCallback(gamepad);
    }
  }

  /**
   * Sets the callback function to handle incoming gamepad data.
   * @param {Function} callback - Function to execute when data is received.
   */
  setOnData(callback) {
    if(this.jsl.format.isFunction(callback)) {
      this.onDataCallback = callback;
    }
  }
  
  /**
   * Sets the callback function for gamepad connection events.
   * @param {Function} callback - Function to execute on connection.
   */
  setOnConnect(callback) {
    if(this.jsl.format.isFunction(callback)) {
      this.onConnectCallback = callback;
      if(this.active) {
        this.onConnectCallback();
      }
    }
  }
  
  /**
   * Sets the callback function for gamepad disconnection events.
   * @param {Function} callback - Function to execute on disconnection.
   */
  setOnDisconnect(callback) {
    if(this.jsl.format.isFunction(callback)) {
      this.onDisconnectCallback = callback;
    }
  }

  /**
   * Cleans up the gamepad instance and stops data reading.
   */
  close() {
    this.active = false;
    this.read_gamepad_loop = clearIntervalIf(this.read_gamepad_loop);
    this.jsl.context.removeEventListener("gamepadconnected", this._checkGamepadFun);
  }
}

exports.PRDC_JSLAB_DEVICE_GAMEPAD = PRDC_JSLAB_DEVICE_GAMEPAD;