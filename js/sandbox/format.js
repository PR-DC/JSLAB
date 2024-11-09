/**
 * @file JSLAB library format submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB format submodule.
 */
class PRDC_JSLAB_LIB_FORMAT {
  
  /**
   * Initializes a new instance of the format submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }
  
  /**
   * Formats the given byte count into a readable string.
   * @param {Number} bytes Number of bytes.
   * @param {Number} [decimals=2] Number of decimal places to include in the formatted string.
   * @returns {String} Formatted bytes string with appropriate unit.
   */
  formatBytes(bytes, decimals = 2) {
    if(!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const units = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${units[i]}`;
  }

  /**
   * Formats the given bits per second (bps) into a readable string.
   * @param {Number} bps Number of bits per second.
   * @param {Number} [decimals=2] Number of decimal places to include in the formatted string.
   * @returns {String} Formatted bits per second string with appropriate unit.
   */
  formatBPS(bps, decimals = 2) {
    if(!+bps) return '0 bps';

    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const units = ["bps","kbps", "Mbps", "Gbps", "Tbps", "Pbps", "Ebps", "Zbps", "Ybps"];
    
    const i = Math.floor(Math.log(bps) / Math.log(k));

    return `${parseFloat((bps / Math.pow(k, i)).toFixed(dm))} ${units[i]}`;
  }

  /**
   * Formats a number with metric prefixes (k, M, G, etc.) based on its value.
   * @param {Number} number The number to format.
   * @param {Number} [decimals=2] Number of decimal places to include in the formatted string.
   * @returns {String} Formatted number string with metric prefix.
   */
  formatPrefix(number, decimals = 2) {
    if(!+number) return '0 ';

    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const units = ["","k", "M", "G", "T", "P", "E", "Z", "Y"];
    
    const i = Math.floor(Math.log(number) / Math.log(k));

    return `${parseFloat((number / Math.pow(k, i)).toFixed(dm))} ${units[i]}`;
  }
  /**
   * Formats a number to a specified number of decimal places.
   * @param {Number} number The number to format.
   * @param {Number} [decimals=2] The number of decimal places.
   * @returns {String} The formatted number as a string.
   */
  formatNum(number, decimals = 2) {
    return Number(number).toFixed(decimals);
  }

  /**
   * Formats a floating-point number to have a fixed number of significant digits.
   * @param {number} number - The number to format.
   * @param {number} [digits=1] - The number of significant digits.
   * @returns {string} The formatted number as a string.
   */
  formatFloatDigits(number, digits = 1) {
    var precision = digits-(number.toString().split(".")[0]).length;
    if(precision < 0) {
      precision = 0;
    }
    return round(number, precision, true);
  }

  /**
   * Clips a number to a specified value based on a condition.
   * @param {number} number - The number to clip.
   * @param {number} control_number - The reference number for the clipping condition.
   * @param {number} clip_value - The value to clip to.
   * @param {boolean} [direction=true] - The direction of clipping (true for max, false for min).
   * @returns {number} The clipped number.
   */
  clip(number, control_number, clip_value, direction = true) {
    if((direction && number >= control_number) || (!direction && number <= control_number)) {
      number = clip_value;
    }
    return number;
  }

  /**
   * Clips a height value to a specified range.
   * @param {number} value - The value to clip.
   * @param {number} [min=0] - The minimum value of the range.
   * @param {number} [max=100] - The maximum value of the range.
   * @returns {number} The clipped height value.
   */
  clipHeight(value, min = 0, max = 100) {
    value = Number(value);
    if(isNaN(value)) {
      value = min;
    } else if(value > max) {
      value = max;
    } else if(value < min) {
      value = min;
    }
    return value;
  }

  /**
   * Retrieves the field names (keys) of the given object.
   * @param {Object} obj - The object from which to extract keys.
   * @returns {string[]} An array containing the keys of the object.
   */
  fieldnames(obj) {
    return Object.keys(obj);
  }

  /**
   * Replaces all occurrences of a specified substring within a string.
   * @param {string} str - The original string.
   * @param {string} old_string - The substring to be replaced.
   * @param {string} new_string - The substring to replace with.
   * @returns {string} The resulting string after replacements.
   */
  strrep(str, old_string, new_string) {
    return str.replaceAll(old_string, new_string);
  }  

  /**
   * Clips a value to a specified range.
   * @param {number} value - The value to clip.
   * @param {number} [min=0] - The minimum value of the range.
   * @param {number} [max=100] - The maximum value of the range.
   * @returns {number} The clipped value.
   */
  clipVal(value, min = 0, max = 100) {
    value = Number(value);
    if(isNaN(value)) {
      value = min;
    } else if(value > max) {
      value = max;
    } else if(value < min) {
      value = min;
    }
    return value;
  }

  /**
   * Rounds a number to a fixed number of decimal places, but only if it's a floating point number.
   * @param {Number} value The value to round.
   * @param {Number} p The number of decimal places to round to.
   * @returns {Number} The rounded number, or the original number if it wasn't a float.
   */
  toFixedIf(value, p) {
    return +parseFloat(value).toFixed(p);
  }

  /**
   * Provides a replacer function for JSON.stringify() to prevent circular references.
   * @returns {Function} A replacer function that can be used with JSON.stringify to handle circular references.
   */
  getCircularReplacer() {
    const seen = new WeakSet();
    return function(key, value) {
      if(typeof value === 'object' && value !== null) {
        if(seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    };
  }

  /**
   * Determines if the provided value is NaN.
   * @param {*} value - The value to check.
   * @returns {boolean} True if the value is NaN, false otherwise.
   */
  isNaN(value) {
    if(isArray(value)) {
      return mathjs_isNaN(value);
    } else {
      return this.jsl._isNaN(value);
    }
  }
  
  /**
   * Determines if the provided value is an object.
   * @param {*} value - The value to check.
   * @param {boolean} [ignore_array=false] - Whether to consider arrays as not objects.
   * @returns {boolean} True if the value is an object, false otherwise.
   */
  isObject(value, ignore_array) {
    if(ignore_array && Array.isArray(value)) {
      return false;
    }
    return typeof value === 'object' && value !== null;
  }
  
  /**
   * Determines if the provided value is a number.
   * @param {*} value - The value to check.
   * @returns {boolean} True if the value is a number, false otherwise.
   */
  isNumber(value) {
    return typeof value === 'number';
  }
  
  /**
   * Determines if the provided value is a string.
   * @param {*} value - The value to check.
   * @returns {boolean} True if the value is a string, false otherwise.
   */
  isString(value) {
    return typeof value === 'string';
  }
  
  /**
   * Determines if the provided value is a function.
   * @param {*} value - The value to check 
   * @returns {boolean} True if the value is a function, false otherwise.
   */
  isFunction(value) {
    return typeof value === 'function';
  }
  
  /**
   * Determines if the provided value is an array.
   * @param {*} value - The value to check.
   * @returns {boolean} True if the value is an array, false otherwise.
   */
  isArray(value) {
    return Object.prototype.toString.call(value) === '[object Array]';
  }
  
  /**
   * Determines if the provided value is null.
   * @param {*} value - The value to check.
   * @returns {boolean} True if the value is null, false otherwise.
   */
  isNull(value) {
    return value === null;
  }

  /**
   * Checks if an array is empty.
   * @param {Array} array - The array to check.
   * @returns {boolean} True if the array is empty, false otherwise.
   */
  isEmpty(array) {
    return !(typeof array == 'object' && array.length != 0);
  }

  /**
   * Checks if the given value(s) are infinite.
   * @param {number|number[]} value - The value or array of values to check.
   * @returns {boolean|boolean[]} - Returns true if infinite, otherwise false. Returns an array of booleans if input is an array.
   */
  isInfinity(value) {
    if(Array.isArray(value)) {
      return value.map((v) => v === Infinity || v === -Infinity);
    } else {
      return value === Infinity || value === -Infinity;
    }
  }
  
  /**
   * Checks if a variable is numeric.
   * @param {*} variable - The variable to check.
   * @returns {boolean} True if the variable is numeric, false otherwise.
   */
  isNumeric(variable) {
    return !isNaN(parseFloat(variable)) && isFinite(variable);
  }

  /**
   * Checks if the specified object has the given key.
   * @param {Object} object - The object to check for the presence of the key.
   * @param {string} key - The key to check for in the object.
   * @returns {boolean} - True if the object has the key, false otherwise.
   */
  hasKey(object, key) {
    return object.hasOwnProperty(key);
  }

  /**
   * Determines if the provided value is undefined.
   * @param {*} value - The value to check.
   * @returns {boolean} True if the value is undefined, false otherwise.
   */
  isUndefined(value) {
    return typeof value === 'undefined';
  }

  /**
   * Normalizes an angle to the range of -180 to 180 degrees.
   * @param {number} angle - The angle to normalize.
   * @returns {number} The normalized angle.
   */
  normalizeAngle(angle) {
    return ((angle + 180) % 360 + 360) % 360 - 180;
  }

  /**
   * Normalizes an angle to the range of 0 to 360 degrees.
   * @param {number} angle - The angle to normalize.
   * @returns {number} The normalized angle.
   */
  normalizeAngle360(angle) {
     return (angle % 360 + 360) % 360;
  }

  /**
   * Normalizes latitude to the range of -90 to 90 degrees with specified precision.
   * @param {number} latitude - The latitude to normalize.
   * @param {number} precision - The precision of the normalization.
   * @returns {number} The normalized latitude.
   */
  normalizeLat(latitude, precision) {
    return round(Math.max(-90, Math.min(90, latitude)), precision);
  }

  /**
   * Normalizes longitude to the range of -180 to 180 degrees with specified precision.
   * @param {number} longitude - The longitude to normalize.
   * @param {number} precision - The precision of the normalization.
   * @returns {number} The normalized longitude.
   */
  normalizeLon(longitude, precision) {
    return round(normalizeAngle(longitude), precision);
  }

  /**
   * Checks a value for undefined and returns an empty string if it is undefined, otherwise returns the value.
   * @param {*} val - The value to check.
   * @returns {*} The original value if not undefined, otherwise an empty string.
   */
  checkUndefined(val) {
    if(val == undefined) {
      return '';
    } else {
      return val;
    }
  }
  
  /**
   * Pretty-prints data, converting it into a more readable format for display. Handles strings, objects, and other data types.
   * @param {*} data The data to pretty-print.
   * @returns {Array} An array containing the pretty-printed data as a string and a boolean indicating if the data was an object.
   */
  prettyPrint(data) {
    if(Array.isArray(data)) {
      return [this.safeStringify(data, 5), true];
    } else if(typeof data == 'object' && typeof data.toPrettyString == 'function') {
      return [data.toPrettyString(), false];
    } else if(typeof data == 'object' && typeof data.toSafeJSON == 'function') {
      return [this.safeStringify(data), true];
    } else if(typeof data == 'string') {
      return ["'"+data.replace(/\n/g, '<br/>')+"'", false];
    } else if(typeof data == 'object') {
      return [this.safeStringify(data), true];
    } else {
      return [String(data), false];
    }
  }


  /**
   * Converts an object to a JSON string if it is an object, otherwise returns the object as is.
   * @param {*} object - The object to stringify.
   * @returns {string|*} The JSON string representation of the object or the object itself if not an object.
   */
  stringify(object) {
    if(typeof object === 'object') {
      if(typeof object.toPrettyString === 'function') {
        return object.toPrettyString();
      }
      return JSON.stringify(object);
    } else {
      return object;
    }
  }
  
  /**
   * Safely serializes an object into a JSON string, handling circular references and deep structures, with depth control.
   * It also escapes strings to prevent HTML injection.
   * @param {Object} data - The object to stringify.
   * @param {number} [depth_limit=3] - The maximum depth to traverse in the object, beyond which the traversal is stopped.
   * @returns {string} A JSON string representation of the object, with special handling for deep objects, circular references, and HTML escaping of strings.
   */
  safeStringify(data, depth_limit = 3) {
    if(typeof data != 'object') {
      return data;
    }
    if(typeof data.toPrettyString === 'function') {
      return data.toPrettyString();
    }
    if(typeof data.toSafeJSON === 'function') {
      return data.toSafeJSON();
    }
    if(data.hasOwnProperty('_safeStringifyDepth')) {
      depth_limit = data._safeStringifyDepth;
      delete data._safeStringifyDepth;
    }
    
    const seen = new WeakSet();

    function escapeString(str) {
      return str.replace(/[&<>"'`=\/]/g, function (s) {
        return ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
          '`': '&#x60;',
          '=': '&#x3D;',
          '/': '&#x2F;'
        })[s];
      });
    }

    function formatPath(path) {
      return path
        .map(key => (typeof key === 'symbol' ? `['${key.toString()}']` : `['${key}']`))
        .join('');
    }

    function helper(value, depth, path) {
      if(depth > depth_limit) {
        return '{...}';
      }

      if(value !== null && typeof value === 'object') {
        if(seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);

        // Handle arrays separately
        if(Array.isArray(value)) {
          return value.map((item, index) => helper(item, depth + 1, path.concat(index)));
        }

        const result = {};

        // Retrieve property descriptors without invoking getters
        const descriptors = Object.getOwnPropertyDescriptors(value);
        const keys = Reflect.ownKeys(descriptors); // Includes symbol properties

        for(const key of keys) {
          const descriptor = descriptors[key];
          const newPath = path.concat(key); // Build the full path

          try {
            if('value' in descriptor) {
              // Data property; process the value
              result[key] = helper(descriptor.value, depth + 1, newPath);
            } else if(typeof descriptor.get === 'function') {
              // Accessor property with a getter
              result[key] = '[Getter]';
            } else {
              result[key] = '[Unknown Property]';
            }
          } catch (err) {
            result[key] = `[Error: ${escapeString(err.message)}]`;
          }
        }
        return result;
      } else if(typeof value === 'string') {
        // Escape strings to prevent HTML injection
        return escapeString(value);
      }
      return value;
    }

    return JSON.stringify(helper(data, 0, []), null, 2);
  }
}

exports.PRDC_JSLAB_LIB_FORMAT = PRDC_JSLAB_LIB_FORMAT;