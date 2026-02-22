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
   * Retrieves the MIME type based on the file extension.
   * @param {string} filePath - The path to the file.
   * @returns {string} The corresponding MIME type.
   */
  getContentType(file_path) {
    const mime_types = {
      // Text files
      '.html': 'text/html',
      '.htm': 'text/html',
      '.js': 'text/javascript',
      '.mjs': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.xml': 'application/xml',

      // Image files
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',

      // Audio files
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',

      // Video files
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',

      // Application files
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      '.exe': 'application/vnd.microsoft.portable-executable',
      '.msi': 'application/x-msdownload',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.eot': 'application/vnd.ms-fontobject',
      '.ttf': 'font/ttf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',

      // Model files
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
      '.obj': 'application/octet-stream', // Common for OBJ, but can vary
      '.fbx': 'application/octet-stream',

      // Others
      '.csv': 'text/csv',
      '.md': 'text/markdown',
      '.apk': 'application/vnd.android.package-archive',
      '.iso': 'application/x-iso9660-image',
      '.sh': 'application/x-sh',
      '.bat': 'application/x-msdownload',
      '.php': 'application/x-httpd-php',
      '.asp': 'application/x-aspx',
      '.aspx': 'application/x-aspx',
      '.jsp': 'application/java-archive',
      '.rb': 'application/x-ruby',
      '.py': 'application/x-python-code',
      '.swift': 'application/x-swift',
      '.lua': 'application/x-lua',
    };

    const ext = String(this.jsl.inter.env.pathExtName(file_path)).toLowerCase();
    return mime_types[ext] || 'application/octet-stream';
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
   * Formats a floating-point number to a fixed number of significant digits,
   * automatically adjusting decimal places depending on the integer part length.
   *
   * @param {number} number - The number to format.
   * @param {number} [digits=1] - The number of significant digits to produce.
   * @returns {string} A string containing the formatted number.
   */
  formatFloatDigits(number, digits = 1) {
    var precision = digits-(number.toString().split(".")[0]).length;
    if(precision < 0) {
      precision = 0;
    }
    return this.jsl.inter.round(number, precision, true);
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
    if(this.jsl.inter.isArray(value)) {
      return this.jsl.inter.mathjs_isNaN(value);
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
   * Determines if the provided value is a plain object.
   * @param {*} value - The value to check.
   * @returns {boolean} True if the value is a plain object, false otherwise.
   */
  isPlainObject(value) {
    if(value === null || typeof value !== 'object') {
      return false;
    }
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  /**
   * Determines if the provided value is a typed array.
   * @param {*} value - The value to check.
   * @returns {boolean} True if the value is a typed array, false otherwise.
   */
  isTypedArray(value) {
    return ArrayBuffer.isView(value) && !(value instanceof DataView);
  }

  /**
   * Determines if the provided value is array-like for column-style input.
   * @param {*} value - The value to check.
   * @returns {boolean} True if the value is an array or typed array.
   */
  isColumnLike(value) {
    return Array.isArray(value) || this.isTypedArray(value);
  }

  /**
   * Ensures that name list contains unique values.
   * Throws when a duplicate name is found.
   * @param {Array<string>} names - Name list.
   * @param {Function} [error_factory] - Optional function that returns an Error for a duplicate name.
   * @returns {boolean} True when all names are unique.
   */
  ensureUniqueNames(names, error_factory) {
    var seen = new Set();
    names.forEach(function(name) {
      if(seen.has(name)) {
        if(typeof error_factory === 'function') {
          throw error_factory(name);
        }
        throw new Error('Duplicate name: ' + String(name));
      }
      seen.add(name);
    });
    return true;
  }

  /**
   * Compares mixed values for stable sorting.
   * @param {*} a - First value.
   * @param {*} b - Second value.
   * @returns {number} Comparison result.
   */
  compareMixedValues(a, b) {
    if(a === b) {
      return 0;
    }

    if(a === null || typeof a === 'undefined') {
      return -1;
    }
    if(b === null || typeof b === 'undefined') {
      return 1;
    }

    if(a instanceof Date) {
      a = a.getTime();
    }
    if(b instanceof Date) {
      b = b.getTime();
    }

    if(typeof a === 'number' && typeof b === 'number') {
      if(Number.isNaN(a) && Number.isNaN(b)) {
        return 0;
      }
      if(Number.isNaN(a)) {
        return 1;
      }
      if(Number.isNaN(b)) {
        return -1;
      }
      return a - b;
    }

    if(typeof a === 'boolean' && typeof b === 'boolean') {
      return Number(a) - Number(b);
    }

    var a_str = String(a).toLowerCase();
    var b_str = String(b).toLowerCase();
    if(a_str < b_str) {
      return -1;
    }
    if(a_str > b_str) {
      return 1;
    }
    return 0;
  }

  /**
   * Builds stable sorted index order.
   * @param {number} length - Number of rows/items.
   * @param {Function} getter - Getter by index.
   * @param {string} [direction='asc'] - Sort direction.
   * @returns {Array<number>} Sorted indices.
   */
  buildSortedIndices(length, getter, direction = 'asc') {
    var factor = direction === 'desc' ? -1 : 1;
    var indices = Array.from({ length: length }, function(_, i) {
      return i;
    });

    indices.sort((i, j) => {
      var cmp = this.compareMixedValues(getter(i), getter(j));
      if(cmp === 0) {
        cmp = i - j;
      }
      return cmp * factor;
    });
    return indices;
  }

  /**
   * Creates [0, ..., n - 1].
   * @param {number} n - Length.
   * @returns {Array<number>} Range indices.
   */
  rangeIndices(n) {
    return Array.from({ length: n }, function(_, i) {
      return i;
    });
  }

  /**
   * Checks if value should be treated as missing.
   * @param {*} value - Candidate value.
   * @returns {boolean} True when value is missing.
   */
  isMissingValue(value) {
    return value === null ||
      typeof value === 'undefined' ||
      (typeof value === 'number' && Number.isNaN(value)) ||
      value === '';
  }

  /**
   * Resolves type label for table-like display.
   * @param {*} value - Candidate value.
   * @returns {string} Type label.
   */
  valueTypeLabel(value) {
    if(value === null) return 'null';
    if(typeof value === 'undefined') return 'undefined';
    if(value instanceof Date) return 'datetime';
    if(Array.isArray(value)) return 'array';
    if(this.isTypedArray(value)) return value.constructor ? value.constructor.name : 'typedarray';
    return typeof value;
  }

  /**
   * Escapes CSV cell text.
   * @param {*} value - Cell value.
   * @param {string} [delimiter=','] - Delimiter.
   * @returns {string} Escaped CSV token.
   */
  csvEscapeCell(value, delimiter = ',') {
    var text = '';
    if(value !== null && typeof value !== 'undefined') {
      if(value instanceof Date) {
        text = value.toISOString();
      } else {
        text = String(value);
      }
    }
    var must_quote = text.includes('"') || text.includes('\n') ||
      text.includes('\r') || text.includes(delimiter);
    if(text.includes('"')) {
      text = text.replace(/"/g, '""');
    }
    return must_quote ? '"' + text + '"' : text;
  }

  /**
   * Parses a CSV line with quoted fields support.
   * @param {string} line - Input line.
   * @param {string} [delimiter=','] - Delimiter.
   * @returns {Array<string>} Parsed fields.
   */
  parseCsvLine(line, delimiter = ',') {
    var out = [];
    var current = '';
    var in_quotes = false;

    for(var i = 0; i < line.length; i++) {
      var ch = line[i];
      if(ch === '"') {
        if(in_quotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          in_quotes = !in_quotes;
        }
      } else if(ch === delimiter && !in_quotes) {
        out.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current);
    return out;
  }

  /**
   * Parses CSV-like text into rows.
   * @param {string} text - CSV text.
   * @param {string} [delimiter=','] - Delimiter.
   * @returns {Array<Array<string>>} Parsed rows.
   */
  parseCsvText(text, delimiter = ',') {
    var rows = [];
    var buffer = '';
    var in_quotes = false;

    for(var i = 0; i < text.length; i++) {
      var ch = text[i];
      var next = text[i + 1];
      buffer += ch;

      if(ch === '"') {
        if(in_quotes && next === '"') {
          buffer += next;
          i += 1;
        } else {
          in_quotes = !in_quotes;
        }
      }

      if(!in_quotes && (ch === '\n' || ch === '\r')) {
        if(ch === '\r' && next === '\n') {
          i += 1;
        }
        var line = buffer.trimEnd();
        if(line.length) {
          if(line.endsWith('\n') || line.endsWith('\r')) {
            line = line.slice(0, -1);
          }
          rows.push(this.parseCsvLine(line, delimiter));
        }
        buffer = '';
      }
    }

    if(buffer.trim().length) {
      rows.push(this.parseCsvLine(buffer.trimEnd(), delimiter));
    }
    return rows;
  }

  /**
   * Detects CSV delimiter from the first non-empty line.
   * @param {string} text - Input text.
   * @param {string} [fallback=','] - Fallback delimiter.
   * @returns {string} Detected delimiter.
   */
  detectDelimiter(text, fallback = ',') {
    var line = String(text || '')
      .split(/\r?\n/)
      .find(function(item) {
        return item.trim().length > 0;
      });
    if(!line) {
      return fallback;
    }

    var candidates = [',', ';', '\t', '|'];
    var best = fallback;
    var best_count = -1;
    candidates.forEach((candidate) => {
      var count = this.parseCsvLine(line, candidate).length;
      if(count > best_count) {
        best_count = count;
        best = candidate;
      }
    });
    return best;
  }

  /**
   * Converts textual CSV token into a typed scalar.
   * @param {string} text - Raw text.
   * @param {Object} [options={}] - Parse options.
   * @returns {*} Parsed scalar value.
   */
  parseCsvScalar(text, options = {}) {
    var raw = String(text);
    var trimmed = raw.trim();

    var missing_tokens = Array.isArray(options.missing_tokens) ?
      options.missing_tokens : ['', 'NA', 'N/A', 'null', 'NaN'];
    if(missing_tokens.includes(trimmed)) {
      return null;
    }

    if(options.convert === false) {
      return raw;
    }

    if(trimmed === 'true') {
      return true;
    }
    if(trimmed === 'false') {
      return false;
    }

    if(/^[-+]?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(trimmed)) {
      var num = Number(trimmed);
      if(!Number.isNaN(num)) {
        return num;
      }
    }

    if(options.parse_dates !== false) {
      var date = new Date(trimmed);
      if(!Number.isNaN(date.getTime()) &&
        /[-T:/]/.test(trimmed)) {
        return date;
      }
    }

    return raw;
  }

  /**
   * Aggregates values using the selected method.
   * @param {Array} values - Input values.
   * @param {string} method - Aggregation method.
   * @returns {*} Aggregated result.
   */
  aggregateValues(values, method) {
    var valid = values.filter((value) => {
      return !this.isMissingValue(value);
    });
    var m = String(method || '').toLowerCase();
    if(m === 'count') {
      return valid.length;
    }
    if(!valid.length) {
      return null;
    }
    if(m === 'first') {
      return valid[0];
    }
    if(m === 'last') {
      return valid[valid.length - 1];
    }

    var numeric = valid.filter(function(value) {
      return typeof value === 'number' && !Number.isNaN(value);
    });
    if(['sum', 'mean', 'min', 'max'].includes(m)) {
      if(!numeric.length) {
        return null;
      }
      if(m === 'sum') {
        return numeric.reduce(function(acc, value) {
          return acc + value;
        }, 0);
      }
      if(m === 'mean') {
        return numeric.reduce(function(acc, value) {
          return acc + value;
        }, 0) / numeric.length;
      }
      if(m === 'min') {
        return numeric.reduce(function(acc, value) {
          return Math.min(acc, value);
        }, numeric[0]);
      }
      if(m === 'max') {
        return numeric.reduce(function(acc, value) {
          return Math.max(acc, value);
        }, numeric[0]);
      }
    }

    return valid[0];
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
   * Checks if a string is empty or contains only whitespace.
   * @param {string} str - The string to check.
   * @returns {boolean} - True if the string is empty or contains only whitespace, otherwise false.
   */
  isEmptyString(str) {
    return typeof str === 'string' && str.trim().length === 0;
  }
  
  /**
   * Checks if a object is empty.
   * @param {string} obj - The object to check.
   * @returns {boolean} - True if the object is empty, otherwise false.
   */
  isEmptyObject(obj) {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
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
   * Checks if a string is a valid UUID.
   * @param {string} str The string to check.
   * @returns {boolean} True if the string is a valid UUID, false otherwise.
   */
  isUUID(str) {
    var uuid_pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuid_pattern.test(str);
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
    return this.jsl.inter.round(Math.max(-90, Math.min(90, latitude)), precision);
  }

  /**
   * Normalizes longitude to the range of -180 to 180 degrees with specified precision.
   * @param {number} longitude - The longitude to normalize.
   * @param {number} precision - The precision of the normalization.
   * @returns {number} The normalized longitude.
   */
  normalizeLon(longitude, precision) {
    return this.jsl.inter.round(this.normalizeAngle(longitude), precision);
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
    if(typeof object.toPrettyString === 'function') {
      return object.toPrettyString();
    }
    return JSON.stringify(object);
  }
  
  /**
   * Safely serializes an object into a JSON string, handling circular references and deep structures, with depth control.
   * It also escapes strings to prevent HTML injection.
   * @param {Object} data - The object to stringify.
   * @param {number} [depth_limit=3] - The maximum depth to traverse in the object, beyond which the traversal is stopped.
   * @returns {string} A JSON string representation of the object, with special handling for deep objects, circular references, and HTML escaping of strings.
   */
  safeStringify(data, depth_limit = 3) {
    if(data == null || typeof data != 'object') {
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
          } catch(err) {
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
  
  /**
   * Escapes special HTML characters in a string to prevent HTML injection.
   * @param {string} string - The string to escape.
   * @returns {string} - The escaped string with HTML characters replaced.
   */
  escapeHTML(string) {
    var escapeHtmlMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    return String(string).replace(/[&<>"'`=\/]/g, function(s) {
      return escapeHtmlMap[s];
    });
  }

  /**
   * Escapes text for use in HTML attributes.
   * @param {*} value - The value to escape.
   * @returns {string} Escaped attribute-safe text.
   */
  escapeHTMLAttr(value) {
    return this.escapeHTML(value).replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
  }

  /**
   * Escapes special LaTeX characters in a string to prevent LaTeX injection.
   * @param {string} string - The string to escape.
   * @returns {string} - The escaped string with LaTeX characters replaced.
   */
  escapeLatex(string) {
    if(typeof string !== 'string') {
      return string;
    }
    return string
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/~/g, '\\textasciitilde{}')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/`/g, '\\textasciigrave{}');
  }
  
  /**
   * Produces a unique key name inside an object. If `key` already exists,
   * numerical suffixes are appended until uniqueness is achieved.
   *
   * @param {Object} object - The object to test for key collisions.
   * @param {string} key - The proposed key name.
   * @returns {string} A unique key string not present in the object.
   */
  getUniqueKey(object, key) {
    var i = 0;
    var unique_key = key;
    while(this.hasKey(object, unique_key)) {
      i = i+1;
      unique_key = key+i;
    }
    return unique_key;
  }
    
  /**
   * Generates a random string of the specified length.
   * @param {number} num - The desired length of the random string.
   * @returns {string} A random string.
   */
  randomString(num) {
    return Math.random().toString(36).substr(2, num);
  }
  
  /**
   * Calculates the number of decimal places in a number.
   * @param {number} num - The number to evaluate.
   * @returns {number} The count of decimal places.
   */
  countDecimalPlaces(num) {
    return num > 1 ? 0 : (num.toString().split('.')[1] || '').match(/^0*/)[0].length+1;
  }
  
  /**
   * Replaces file links in a text with HTML span elements.
   * @param {string} text - The multiline error log text.
   * @returns {string} The updated text with file links replaced by HTML spans.
   */
  replaceEditorLinks(text) {
    var regex = /(.+?):(\d+):(\d+):/g;
    
    return text.replace(regex, (match, filePath, lineNumber, charPos) => {
      return `<span class="open-editor" file_path="${filePath}" line_number="${lineNumber}" char_pos="${charPos}">${match}</span>`;
    });
  }
  
  /**
   * Checks that an input contains a finite number
   * @param {HTMLInputElement} n  Target input element.
   * @returns {boolean} True when the value is valid.
   */
  numberValidator(n) {
    var str = n.value.trim();
    var num = Number(str);
    return str !== '' && Number.isFinite(num);
  }
  
  /**
   * Checks that an input contains a finite number
   * and—if supplied—is within the inclusive range [min, max].
   * @param {HTMLInputElement} n  Target input element.
   * @param {number} [min]        Minimum allowed value (optional).
   * @param {number} [max]        Maximum allowed value (optional).
   * @returns {boolean}           True when the value is valid.
   */
  limitedNumberValidator(n, min, max) {
    var str = n.value.trim();
    var num = Number(str);
    if(str === '' || !Number.isFinite(num)) return false;
    if(min !== undefined && num < min) return false;
    if(max !== undefined && num > max) return false;
    return true;
  }

  /**
   * Wraps a string with an HTML <b> tag for bold formatting.
   * @param {string} s - The string to wrap.
   * @returns {string} The bold-formatted HTML string.
   */
  bold(s) {
    return `<b>${s}</b>`;
  }

  /**
   * Wraps a string with an HTML <i> tag for italic formatting.
   * @param {string} s - The string to wrap.
   * @returns {string} The italic-formatted HTML string.
   */
  italic(s) {
    return `<i>${s}</i>`;
  }

  /**
   * Wraps a string with an HTML <u> tag for underline formatting.
   * @param {string} s - The string to wrap.
   * @returns {string} The underline-formatted HTML string.
   */
  underline(s) {
    return `<u>${s}</u>`;
  }

  /**
   * Wraps a string with an HTML <s> tag for strikethrough formatting.
   * @param {string} s - The string to wrap.
   * @returns {string} The strikethrough HTML string.
   */
  strike(s) {
    return `<s>${s}</s>`;
  }

  /**
   * Wraps a string in an HTML <sub> element (subscript).
   * @param {string} s - The string to wrap.
   * @returns {string} The subscript HTML string.
   */
  sub(s) {
    return `<sub>${s}</sub>`;
  }

  /**
   * Wraps a string in an HTML <sup> element (superscript).
   * @param {string} s - The string to wrap.
   * @returns {string} The superscript HTML string.
   */
  sup(s) {
    return `<sup>${s}</sup>`;
  }

  /**
   * Prints a formatted plain-text table and optionally exports a LaTeX table.
   *
   * Columns are Arrays/TypedArrays (all same length). Options can be passed as parameter/value
   * pairs or as a final options object.
   *
   * Options: VariableNames, RowNames, Format, Save ("no"|"plain"|"tex"), File, rlines, clines,
   * align, float, caption, label, escapeTeX.
   *
   * @param {...(Array|TypedArray|Object|string)} args Table columns followed by options.
   * @returns {Object} Result object with `plain` and `tex` strings.
   */
  tableprint(...args) {
    const allowedKeys = new Set([
      "VariableNames", "RowNames", "Format", "Save", "File",
      "BrakeLine", "rlines", "clines", "align", "float", "caption", "label",
      "escapeTeX",
    ]);

    const toArray = (x) => (ArrayBuffer.isView(x) ? Array.from(x) : x);

    const padLeft = (s, w) => (s.length >= w ? s : " ".repeat(w - s.length) + s);
    const padRight = (s, w) => (s.length >= w ? s : s + " ".repeat(w - s.length));
    const centerPad = (s, w) => {
      if(s.length >= w) return s;
      const left = Math.floor((w - s.length) / 2);
      const right = w - s.length - left;
      return " ".repeat(left) + s + " ".repeat(right);
    };

    function normalizeAlign(align, nCol) {
      if(Array.isArray(align)) {
        if(align.length !== nCol) throw new Error(this.jsl.inter.lang.string(285));
        return align.map(String);
      }
      if(typeof align === "string") {
        // if "lcr" and matches nCol, split; else repeat first char
        if(align.length === nCol) return align.split("");
        return Array.from({ length: nCol }, () => align[0] || "c");
      }
      return Array.from({ length: nCol }, () => "c");
    }

    let optPos = args.length; // index where options start
    for(let i = 0; i < args.length; i++) {
      if(typeof args[i] === "string" && allowedKeys.has(args[i])) {
        optPos = i;
        break;
      }
    }

    let cols = [];
    let opts = {};

    if(optPos < args.length) {
      // parameter/value pairs
      cols = args.slice(0, optPos);
      const rest = args.slice(optPos);
      if(rest.length % 2 !== 0) throw new Error(this.jsl.inter.lang.string(286));
      for(let i = 0; i < rest.length; i += 2) {
        const k = rest[i];
        const v = rest[i + 1];
        if(!allowedKeys.has(k)) throw new Error(this.jsl.inter.lang.string(287).replace(/\{option\}/g, k));
        opts[k] = v;
      }
    } else {
      // maybe last arg is an options object
      if(args.length >= 1 && this.isPlainObject(args[args.length - 1])) {
        const last = args[args.length - 1];
        const hasAnyKnownKey = Object.keys(last).some((k) => allowedKeys.has(k));
        if(hasAnyKnownKey) {
          opts = { ...last };
          cols = args.slice(0, -1);
        } else {
          cols = args;
        }
      } else {
        cols = args;
      }
    }

    // Defaults
    const VariableNames = opts.VariableNames ?? [];
    const RowNames = opts.RowNames ?? [];
    const Format = opts.Format ?? [];
    const Save = String(opts.Save ?? "no");
    const File = String(opts.File ?? "table.tex");
    const BrakeLine = String(opts.BrakeLine ?? "no");
    const rlines = String(opts.rlines ?? "yes");
    const clines = String(opts.clines ?? "yes");
    const alignOpt = opts.align ?? "c";
    const float = String(opts.float ?? "H");
    const caption = String(opts.caption ?? "Table 1");
    const label = String(opts.label ?? "table-1");
    const escapeTeX = Boolean(opts.escapeTeX ?? false);

    if(BrakeLine.toLowerCase() === "yes") {
      throw new Error(this.jsl.inter.lang.string(288));
    }

    const N_col = cols.length;
    if(N_col <= 0) throw new Error(this.jsl.inter.lang.string(289));

    cols = cols.map((c, idx) => {
      const arr = toArray(c);
      if(!Array.isArray(arr)) throw new Error(this.jsl.inter.lang.string(290).replace(/\{index\}/g, idx + 1));
      // disallow multi-column style like [[a,b],[c,d]]
      if(arr.length > 0 && Array.isArray(arr[0])) {
        const ok = arr.every((x) => Array.isArray(x) && x.length === 1);
        if(!ok) throw new Error(this.jsl.inter.lang.string(291));
        return arr.map((x) => x[0]);
      }
      return arr;
    });

    const N_rows = cols[0].length;
    for(let j = 1; j < N_col; j++) {
      if(cols[j].length !== N_rows) throw new Error(this.jsl.inter.lang.string(292));
    }

    // VariableNames
    let varNames;
    if(Array.isArray(VariableNames) && VariableNames.length) {
      if(VariableNames.length !== N_col) throw new Error(this.jsl.inter.lang.string(293));
      varNames = VariableNames.map(String);
    } else if(typeof VariableNames === "string" && VariableNames.length) {
      // allow CSV-like "A,B,C"
      varNames = VariableNames.split(",").map((s) => s.trim());
      if(varNames.length !== N_col) throw new Error(this.jsl.inter.lang.string(293));
    } else {
      varNames = Array.from({ length: N_col }, (_, i) => `Col${i + 1}`);
    }

    // RowNames
    let rowNames;
    let rn_tab = 0;
    if(Array.isArray(RowNames) && RowNames.length) {
      if(RowNames.length !== N_rows) throw new Error(this.jsl.inter.lang.string(294));
      rowNames = RowNames.map(String);
      rn_tab = 1;
    } else {
      rowNames = Array.from({ length: N_rows }, () => "");
      rn_tab = 0;
    }

    const cells = Array.from({ length: N_rows }, () => Array(N_col).fill(""));
    const cellIsNumeric = Array.from({ length: N_rows }, () => Array(N_col).fill(false));

    for(let j = 0; j < N_col; j++) {
      const fmt = Array.isArray(Format) ? Format[j] : undefined;
      for(let i = 0; i < N_rows; i++) {
        const v = cols[j][i];

        let s;
        if(fmt != null && fmt !== "") {
          s = this.jsl.inter.sprintf(String(fmt), v);
          cellIsNumeric[i][j] = !(typeof v === "string" || typeof v === "boolean");
        } else {
          if(typeof v === "string") {
            s = v;
          } else if(typeof v === "boolean") {
            s = v ? "true" : "false";
          } else if(typeof v === "bigint") {
            s = v.toString();
            cellIsNumeric[i][j] = true;
          } else if(typeof v === "number") {
            if(Number.isInteger(v)) s = v.toString();
            else s = Number.isFinite(v) ? v.toFixed(6) : String(v);
            cellIsNumeric[i][j] = true;
          } else if(v == null) {
            s = "";
          } else {
            s = String(v);
          }
        }

        cells[i][j] = s;
      }
    }

    // widths
    const vnWidth = varNames.map((x) => x.length);
    const rnWidth = rowNames.map((x) => x.length);
    const maxRnWidth = rn_tab ? Math.max(...rnWidth, 0) : 0;

    const colDataWidth = Array(N_col).fill(0);
    for(let j = 0; j < N_col; j++) {
      let mx = 0;
      for(let i = 0; i < N_rows; i++) mx = Math.max(mx, cells[i][j].length);
      colDataWidth[j] = mx;
    }
    const colWidth = colDataWidth.map((w, j) => Math.max(w, vnWidth[j]));

    const gap = 4;
    const leftPad = " ".repeat(maxRnWidth + rn_tab * gap);

    let plain = "";
    // header
    plain += "\n" + leftPad;
    for(let j = 0; j < N_col; j++) {
      plain += " ".repeat(gap) + centerPad(varNames[j], colWidth[j]);
    }
    plain += "\n" + leftPad;
    for(let j = 0; j < N_col; j++) {
      plain += " ".repeat(gap) + "_".repeat(colWidth[j]);
    }
    plain += "\n\n";

    // rows
    for(let i = 0; i < N_rows; i++) {
      if(rn_tab) {
        plain += " ".repeat(gap) + padRight(rowNames[i], maxRnWidth);
      }
      for(let j = 0; j < N_col; j++) {
        const s = cells[i][j];
        const seg = cellIsNumeric[i][j] ? padLeft(s, colWidth[j]) : centerPad(s, colWidth[j]);
        plain += " ".repeat(gap) + seg;
      }
      plain += "\n";
    }
    plain += "\n";

    // TeX table
    const rl = rlines.toLowerCase() === "yes" ? "\\hline" : "";
    const cl = clines.toLowerCase() === "yes" ? "|" : "";
    const al = normalizeAlign(alignOpt, N_col);

    const texCell = (s) => (escapeTeX ? this.escapeLatex(s) : s);

    let tex = "";
    tex += `\n\\begin{table}[${float}]\n`;
    tex += `  \\centering\n`;
    tex += `  \\captionof{table}{${texCell(caption)}}\n`;
    tex += `  \\label{${texCell(label)}}\n`;
    tex += `  \\begin{tabular}[H]{`;

    if(rn_tab) tex += `${cl}l${cl}`;
    for(let j = 0; j < N_col; j++) tex += `${cl}${al[j]}`;
    tex += `${cl}}\n`;

    // header row
    tex += `    ${rl}\n    `;
    for(let j = 0; j < N_col; j++) {
      const h = `\\textbf{${texCell(varNames[j])}}`;
      if(j === 0 && !rn_tab) tex += h;
      else tex += ` & ${h}`;
    }
    tex += ` \\\\ \\hline\n`;

    // data rows
    for(let i = 0; i < N_rows; i++) {
      if(rowNames[i]) tex += `    \\textbf{${texCell(rowNames[i])}}`;
      else tex += "    ";

      for(let j = 0; j < N_col; j++) {
        const v = texCell(cells[i][j]);
        if(j === 0 && !rn_tab) tex += `${v}`;
        else tex += ` & ${v}`;
      }
      tex += ` \\\\ ${rl}\n`;
    }

    tex += `  \\end{tabular}\n`;
    tex += `\\end{table}\n`;

    // Save / print behavior
    const saveMode = Save.toLowerCase();
    if(saveMode !== "no") {
      if(saveMode === "plain") {
        this.jsl.inter.writeFile(File, plain, "utf8");
        this.jsl.inter.dispMonospaced(plain);
      } else if(saveMode === "tex") {
        this.jsl.inter.writeFile(File, tex, "utf8");
      } else {
        throw new Error(this.jsl.inter.lang.string(266));
      }
    } else {
      this.jsl.inter.dispMonospaced(plain);
    }

    return { plain, tex };
  }
}

exports.PRDC_JSLAB_LIB_FORMAT = PRDC_JSLAB_LIB_FORMAT;
