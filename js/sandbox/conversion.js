/**
 * @file JSLAB library conversion submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB conversion submodule.
 */
class PRDC_JSLAB_LIB_CONVERSION {
  
  /**
   * Constructs a conversion submodule object with access to JSLAB's conversion functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
    
    this.speech = this.jsl.env.speech;
    
    /**
     * Serializes BigInt values to JSON by converting them to strings.
     */
    BigInt.prototype.toJSON = function() { return this.toString(); };
  }

  /**
   * Converts text to speech using the Web Speech API.
   * @param {string} msg - The text message to be spoken.
   */
  speak(msg) {
    if(!global.is_worker) {
      this.speech.text = msg;
      speechSynthesis.speak(this.speech);
    }
  }
  
  /**
   * Converts a number to a string with specified precision.
   * @param {number} num - The number to convert.
   * @param {number} precision - The number of digits after the decimal point.
   * @returns {string} The formatted string.
   */
  num2str(num, precision = 2) {
    if(isNumber(precision)) {
      return num.toFixed(precision);
    } else {
      return sprintf(precision, num);
    }
  }

  /**
   * Changes the extension of a file path.
   * @param {string} path - The original file path.
   * @param {string} ext_new - The new extension without the dot.
   * @returns {string} The file path with the new extension.
   */
  changeExtension(path, ext_new) {
    var pos = path.lastIndexOf('.');
    return path.substr(0, pos < 0 ? path.length : pos) + '.' + ext_new;
  }

  /**
   * Remove the extension of a file path.
   * @param {string} path - The original file path.
   * @returns {string} The file path without extension.
   */
  removeExtension(path) {
    var pos = path.lastIndexOf('.');
    return path.substr(0, pos < 0 ? path.length : pos);
  }
  
  /**
   * Transforms coordinates from NED (North, East, Down) frame to RPY (Roll, Pitch, Yaw) frame.
   * @param {number} roll - The roll angle in radians.
   * @param {number} pitch - The pitch angle in radians.
   * @param {number} yaw - The yaw angle in radians.
   * @param {Array<number>} [A] - Optional matrix to apply transformation to.
   * @returns {Array<Array<number>>} The transformation matrix.
   */
  ned2rpy(roll, pitch, yaw, A) {
    T = [
      [Math.cos(yaw)*Math.cos(pitch), 
        Math.sin(yaw)*Math.cos(pitch), 
        -Math.sin(pitch)], 
      [Math.cos(yaw)*Math.sin(pitch)*Math.sin(roll)-Math.sin(yaw)*Math.cos(roll), 
        Math.sin(yaw)*Math.sin(pitch)*Math.sin(roll)+Math.cos(yaw)*Math.cos(roll), 
        Math.cos(pitch)*Math.sin(roll)],
      [Math.cos(yaw)*Math.sin(pitch)*Math.cos(roll)+Math.sin(yaw)*Math.sin(roll), 
        Math.sin(yaw)*Math.sin(pitch)*Math.cos(roll)-Math.cos(yaw)*Math.sin(roll), 
        Math.cos(pitch)*Math.cos(roll)]
    ];

    if(A != undefined) {
      return this.jsl.env.math.multiply(T, A);
    } else {
      return T;
    }
  }

  /**
   * Converts an array of uint8 numbers to a string.
   * @param {Uint8Array} data - The array of uint8 numbers.
   * @returns {string} The converted string.
   */
  uint8ToString(data) {
    return String.fromCharCode(...data);
  }

  /**
   * Converts an array of hexadecimal strings to an array of decimal numbers.
   * @param {Array<string>} hex - The array of hexadecimal strings.
   * @returns {Array<number>} The array of decimal numbers.
   */
  hex2dec(hex) {
    return hex.map(function(e) { 
      return parseInt(e, 16); 
    });  
  }

  /**
   * Converts a number to its ASCII character equivalent.
   * @param {number} num - The number to convert.
   * @returns {string} The ASCII character.
   */
  numToASCII(num) {
    return (''+num).charCodeAt(0);
  }

  /**
   * Converts a number to a hexadecimal string with a fixed number of digits.
   * @param {number} num - The number to convert.
   * @param {number} dig - The number of digits in the resulting string.
   * @param {boolean} prefix - Whether to add a '0x' prefix.
   * @returns {string} The hexadecimal string.
   */
  numToHexStr(num, dig = 4, prefix = false) {
    var str = ('0000'.repeat(dig) + num.toString(16).toUpperCase()).slice(-dig);
    if(prefix) {
      return '0x'+str;
    } 
    return str;
  }

  /**
   * Converts an int8 number to two ASCII characters.
   * @param {number} num - The int8 number.
   * @returns {string} The two ASCII characters.
   */
  int8To2ASCII(num) {
    var data = ("0" + (Uint8Array.from([num])[0]).toString(16)).substr(-2);
    return [data[0].charCodeAt(0), data[1].charCodeAt(0)];
  }

  /**
   * Converts an int16 number to four ASCII characters representing its hexadecimal value.
   * @param {number} num - The int16 number to convert.
   * @returns {string} A string of four ASCII characters.
   */
  int16To4ASCII(num) {
    var data = ("000" + (Uint16Array.from([num])[0]).toString(16).toUpperCase()).substr(-4);
    return [data[0].charCodeAt(0), data[1].charCodeAt(0), data[2].charCodeAt(0), data[3].charCodeAt(0)];
  }

  /**
   * Combines two uint8 values into an int16 value.
   * @param {number} part1 - The first uint8 value.
   * @param {number} part2 - The second uint8 value.
   * @returns {number} The combined int16 value.
   */
  uint8sToInt16(part1, part2) {
      part1 &= 0xFF;
      part2 &= 0xFF;
      
      let result = (part1 << 8) | part2;
      return (result & 0x8000) ? -((result ^ 0xFFFF) + 1) : result;
  }

  /**
   * Combines four uint8 values into an int32 value.
   * @param {number} part1 - The first uint8 value.
   * @param {number} part2 - The second uint8 value.
   * @param {number} part3 - The third uint8 value.
   * @param {number} part4 - The fourth uint8 value.
   * @returns {number} The combined int32 value.
   */
  uint8sToInt32(part1, part2, part3, part4) {
      part1 &= 0xFF;
      part2 &= 0xFF;
      part3 &= 0xFF;
      part4 &= 0xFF;
      
      let result = (part1 << 24) | (part2 << 16) | (part3 << 8) | part4;
      return (result & 0x80000000) ? -((result ^ 0xFFFFFFFF) + 1) : result;
  }

  /**
   * Converts four uint8 values into a floating-point number.
   * @param {number} part1 - The first uint8 value.
   * @param {number} part2 - The second uint8 value.
   * @param {number} part3 - The third uint8 value.
   * @param {number} part4 - The fourth uint8 value.
   * @returns {number} The floating-point number.
   */
  uint8sToFloat(part1, part2, part3, part4) {
    // Combine the Uint8 values into a 32-bit integer
    let combinedValue = (part4 << 24) | (part3 << 16) | (part2 << 8) | part1;

    // Interpret the integer as a float without using Math.pow
    let sign = (combinedValue & 0x80000000) ? -1 : 1;
    let exponent = ((combinedValue >> 23) & 0xFF) - 127;
    let mantissa = (combinedValue & 0x7FFFFF | 0x800000) / (1 << 23); 

    return sign * mantissa * (2 ** exponent);
  }

  /**
   * Converts a uint16 value to an int16 value.
   * @param {number} num - The uint16 value to convert.
   * @returns {number} The converted int16 value.
   */
  uint16ToInt16(num) {
      return (num & 0x8000) ? -((num ^ 0xFFFF) + 1) : num;
  }

  /**
   * Converts a uint8 number to two ASCII characters.
   * @param {number} num - The uint8 number to convert.
   * @returns {string} A string containing two ASCII characters representing the hexadecimal value.
   */
  uint8To2ASCII(num) {
    var data = ("0" + (num % 256).toString(16).toUpperCase()).substr(-2);
    return [data[0].charCodeAt(0), data[1].charCodeAt(0)];
  }

  /**
   * Converts milliseconds to a time string in mm:ss format.
   * @param {number} ms - The time in milliseconds.
   * @returns {string} The time string.
   */
  ms2time(ms){
    min = Math.floor((ms/1000/60) << 0),
    sec = Math.floor((ms/1000) % 60);
    return ('0' + min).slice(-2) + ':' + ('0' + sec).slice(-2);
  }
  
  /**
   * Converts a decimal number to a binary string.
   * @param {number} x - The decimal number.
   * @returns {string} The binary string.
   */
  dec2bin(x) {
    return this.jsl.env.math.bin(x);
  }
  
  /**
   * Converts a decimal number to a hexadecimal string.
   * @param {number} x - The decimal number.
   * @returns {string} The hexadecimal string.
   */
  dec2hex(x) {
    return this.jsl.env.math.hex(x);
  }
  
  /**
   * Converts a decimal number to an octal string.
   * @param {number} x - The decimal number.
   * @returns {string} The octal string.
   */
  dec2oct(x) {
    return this.jsl.env.math.oct(x);
  }
  
  /**
   * Rounds a number to a specified number of decimal places.
   * @param {number} number - The number to round.
   * @param {number} [decimals=2] - The number of decimal places.
   * @param {boolean} [string=false] - Whether to return the result as a string.
   * @returns {number|string} The rounded number.
   */
  round(number, decimals = 2, string = false) {
    var result;
    if(typeof value === 'number') {
      result = number.toFixed(decimals);
    } else {
      result = Number(number).toFixed(decimals);
    }
    if(result == 0) {
      result = '0'; // removes -0
    }   
    if(string) {
      return result;
    } else {
      return Number(result);
    }
  }

  /**
   * Rounds a number to a fixed number of decimal places if it is a number.
   * @param {number} value - The value to round.
   * @param {number} p - The number of digits after the decimal point.
   * @returns {number} The rounded number with a fixed number of decimal places, or the original value if it is not a number.
   */
  roundIf(value, p) {
    if(typeof value === 'number') {
      return Number(value.toFixed(p));
    } else {
      return value;
    }
  }

  /**
   * Converts a uint8_t number to a bit string.
   * @param {number} n - The number to convert.
   * @returns {string} A bit string representing the number.
   */
  bitString(n) {
    return ("000000000" + n.toString(2)).substr(-8);
  }

  /**
   * Generates a set of flags from a bitfield based on a mapping.
   * @param {Object} map - The mapping of bit positions to flag names.
   * @param {string} name_column - The column name in the mapping that contains the flag names.
   * @param {number} val - The bitfield value.
   * @returns {Object} An object with keys as flag names and values indicating the presence (1) or absence (0) of each flag.
   */
  getBitFlags(map, name_column, val) {
    var flags = {};
    var keys = Object.keys(map);
    var bits = [...Array(keys.length)].map(function(x, i) {
      return val >> i & 1;
    });
    keys.forEach(function(key) {
      flags[map[key][name_column]] = bits[key];
    });
    return flags;
  }

  /**
   * Retrieves the enumeration value based on a property match.
   * @param {Object} enum_object - The enumeration object to search.
   * @param {string} prop - The property name to match.
   * @param {*} val - The property value to match.
   * @returns {number} The enumeration key as a number, or the index if not found.
   */
  getEnumVal(enum_object, prop, val) {
    var enteries = Object.entries(enum_object);
    var idx = enteries.findIndex(function(f) {
        return f[1][prop] == val;
    });
    if(idx > 0) {
      return Number(enteries[idx][0]);
    }
    return idx;
  }

  /**
   * Inverts an enumeration, swapping keys and values, optionally based on a specific property of the enumeration values.
   * @param {Object} enum_object - The enumeration object to invert.
   * @param {string} [prop] - An optional property name to use from the enumeration values.
   * @returns {Object} The inverted enumeration object.
   */
  invertEnum(enum_object, prop) {
    var enum_object_inv = {};
    Object.entries(enum_object).forEach(function([key, value]) {
      var ind = value;
      if(prop) {
        ind = value[prop];
      }
      var num_key = Number(key);
      if(num_key == key) {
        enum_object_inv[ind] = num_key;
      } else {
        enum_object_inv[ind] = key;
      }
    });
    return enum_object_inv;
  }
  
  /**
   * Converts an array of numbers to a string of hexadecimal values, optionally prefixed with "0x".
   * @param {Array<number>} A - The array to convert.
   * @param {boolean} [prefix=true] - Whether to add a "0x" prefix to each hex value.
   * @returns {string} A string of hexadecimal values.
   */
  arrayToHexStr(A, prefix = true) {
    var A_uint8 = new Uint8Array(A);
    var len = A.length;
    var A_hex = Array(len);
    for(let i = 0; i < len; i++) {
      A_hex[i] = A_uint8[i].toString(16).toUpperCase().padStart(2, '0');
    }
    if(prefix) {
      return '0x' + A_hex.join(' 0x');
    } else {
      return A_hex.join(' ');
    }
    return str;
  }

  /**
   * Converts an array of numbers to an ASCII string.
   * @param {Array<number>} array - The array of numbers to convert.
   * @returns {string} The ASCII string representation of the array.
   */
  arrayToASCII(A) {
    return String.fromCharCode(...A);
  }

  /**
   * Extends an object with properties from additional objects.
   * @param {...Object} objects - The objects to merge into the target object.
   * @returns {Object} The extended object.
   */
  extend() {
    var target = arguments[0] || {}, o, p;

    for(var i = 1, len = arguments.length; i < len; i++) {
      o = arguments[i];

      if(!this.isObject(o)) continue;

      for(p in o) {
        target[p] = o[p];
      }
    }

    return target;
  }
  
  /**
   * Normalizes the value of a radio control (RC) input.
   * @param {number} rc - The RC input value.
   * @param {number} [deadzone=0] - The deadzone value below which the output is set to zero.
   * @returns {number} The normalized value.
   */
  normalizeRC(rc, deadzone = 0) {
    var val = rc-1500;
    if(Math.abs(val) < deadzone) {
      return 0;
    }
    return (val-Math.sign(val)*deadzone)/(500-deadzone);
  }

  /**
   * Checks if a value has been updated and updates the last value if it has.
   * @param {Object} data - An object containing the current value and the last value.
   * @returns {boolean} True if the value has been updated; false otherwise.
   */
  checkValueUpdate(data) {
    if(data.value != data.last_value) {
      data.last_value = data.value;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Resets the value and last value properties of an object.
   * @param {Object} data - The object whose value and last value properties will be reset.
   */
  resetValue(data) {
    data.last_value = undefined;
    data.value = undefined;
  }
}

exports.PRDC_JSLAB_LIB_CONVERSION = PRDC_JSLAB_LIB_CONVERSION;