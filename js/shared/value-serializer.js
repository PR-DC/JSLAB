/**
 * @file Shared safe value serializer for terminal and inspector display
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/** Escapes serialized text before insertion into HTML. */
function escapeHTML(value) {
  return String(value).replace(/[&<>]/g, function(character) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;'
    })[character];
  });
}

/** Returns a constructor name from data descriptors without invoking accessors. */
function className(value, fallback) {
  try {
    var prototype = Object.getPrototypeOf(value);
    var constructor = prototype && Object.getOwnPropertyDescriptor(prototype, 'constructor');
    var name = constructor?.value && Object.getOwnPropertyDescriptor(constructor.value, 'name');
    return name?.value || fallback;
  } catch(err) {
    return fallback;
  }
}

/** Returns a short type label without invoking user accessors. */
function typeLabel(value) {
  if(Array.isArray(value)) return 'Array(' + value.length + ')';
  if(ArrayBuffer.isView(value)) return className(value, 'TypedArray') + '(' + value.length + ')';
  if(value instanceof Map) return 'Map(' + value.size + ')';
  if(value instanceof Set) return 'Set(' + value.size + ')';
  return className(value, 'Object');
}

/**
 * Converts an arbitrary runtime value into a bounded JSON-safe tree.
 * Getters and toJSON hooks are never invoked. Only references in the active
 * ancestor chain are circular; repeated sibling references are serialized again.
 * @param {*} value Runtime value.
 * @param {Object} [options={}] Limits and formatting options.
 * @returns {*} JSON-safe value.
 */
function normalizeValue(value, options = {}) {
  var max_depth = Number(options.max_depth);
  if(!isFinite(max_depth) || max_depth < 0) max_depth = 3;
  var max_properties = Number(options.max_properties);
  if(!isFinite(max_properties) || max_properties < 1) max_properties = 1000;
  var max_array_length = Number(options.max_array_length);
  if(!isFinite(max_array_length) || max_array_length < 1) max_array_length = 1000;
  var max_string_length = Number(options.max_string_length);
  if(!isFinite(max_string_length) || max_string_length < 8) max_string_length = 10000;
  var ancestors = new WeakMap();

  function primitive(input) {
    if(input === undefined) return '[undefined]';
    if(typeof input === 'bigint') return String(input) + 'n';
    if(typeof input === 'symbol') return String(input);
    if(typeof input === 'function') {
      var function_name;
      try { function_name = Object.getOwnPropertyDescriptor(input, 'name')?.value; } catch(err) {}
      return '[Function' + (function_name ? ': ' + function_name : '') + ']';
    }
    if(typeof input === 'number') {
      if(Object.is(input, -0)) return '-0';
      if(Number.isNaN(input)) return 'NaN';
      if(input === Infinity) return 'Infinity';
      if(input === -Infinity) return '-Infinity';
    }
    if(typeof input === 'string' && input.length > max_string_length) {
      return input.slice(0, max_string_length) + '… [truncated; ' + input.length + ' characters]';
    }
    return input;
  }

  function visit(input, depth, path) {
    if(input === null || (typeof input !== 'object' && typeof input !== 'function')) return primitive(input);
    if(typeof input === 'function') return primitive(input);
    if(ancestors.has(input)) return '[Circular *' + ancestors.get(input) + ']';
    if(depth > max_depth) return '[' + typeLabel(input) + ']';
    if(input instanceof Date) {
      try { return input.toISOString(); } catch(err) { return String(input); }
    }
    if(input instanceof RegExp) return String(input);
    if(input instanceof Error) {
      var error_descriptors = Object.getOwnPropertyDescriptors(input);
      return {
        name: error_descriptors.name?.value || className(input, 'Error'),
        message: error_descriptors.message?.value || '',
        stack: error_descriptors.stack?.value || ''
      };
    }

    ancestors.set(input, path);
    try {
      if(input instanceof Map) {
        var map_entries = [];
        var map_index = 0;
        for(const [key, entry_value] of Map.prototype.entries.call(input)) {
          if(map_index >= max_properties) break;
          map_entries.push([
            visit(key, depth + 1, path + '.<key:' + map_index + '>'),
            visit(entry_value, depth + 1, path + '.<value:' + map_index + '>')
          ]);
          map_index++;
        }
        var map_result = { type: typeLabel(input), entries: map_entries };
        if(input.size > map_entries.length) map_result.overflow = input.size - map_entries.length;
        return map_result;
      }
      if(input instanceof Set) {
        var set_values = [];
        var set_index = 0;
        for(const entry_value of Set.prototype.values.call(input)) {
          if(set_index >= max_properties) break;
          set_values.push(visit(entry_value, depth + 1, path + '.<entry:' + set_index + '>'));
          set_index++;
        }
        var set_result = { type: typeLabel(input), values: set_values };
        if(input.size > set_values.length) set_result.overflow = input.size - set_values.length;
        return set_result;
      }
      if(Array.isArray(input) || ArrayBuffer.isView(input)) {
        var length = Math.min(input.length, max_array_length);
        var array_result = [];
        for(var index = 0; index < length; index++) {
          var indexed = Object.getOwnPropertyDescriptor(input, String(index));
          array_result.push(indexed && 'value' in indexed ?
            visit(indexed.value, depth + 1, path + '[' + index + ']') : '[empty]');
        }
        if(input.length > length) array_result.push('… ' + (input.length - length) + ' more items');
        return array_result;
      }

      var descriptors = Object.getOwnPropertyDescriptors(input);
      var keys = Reflect.ownKeys(descriptors);
      var result = Object.create(null);
      var shown = Math.min(keys.length, max_properties);
      for(var key_index = 0; key_index < shown; key_index++) {
        var key = keys[key_index];
        var name = typeof key === 'symbol' ? '[' + String(key) + ']' : String(key);
        var descriptor = descriptors[key];
        if('value' in descriptor) {
          result[name] = visit(descriptor.value, depth + 1, path + '.' + name);
        } else if(descriptor.get && descriptor.set) {
          result[name] = '[Getter/Setter]';
        } else if(descriptor.get) {
          result[name] = '[Getter]';
        } else {
          result[name] = '[Setter]';
        }
      }
      if(keys.length > shown) result['…'] = keys.length - shown + ' more properties';
      return result;
    } catch(err) {
      return '[Uninspectable: ' + String(err?.message || err) + ']';
    } finally {
      ancestors.delete(input);
    }
  }

  return visit(value, 0, '$');
}

/**
 * Safely stringifies an arbitrary value for human-readable display.
 * @param {*} value Runtime value.
 * @param {Object} [options={}] Normalization and output options.
 * @returns {string} Bounded serialized text.
 */
function safeStringify(value, options = {}) {
  var normalized = normalizeValue(value, options);
  var indent = options.indent === undefined ? 2 : options.indent;
  var text;
  try {
    text = JSON.stringify(normalized, null, indent);
  } catch(err) {
    text = JSON.stringify('[Unserializable: ' + String(err?.message || err) + ']');
  }
  if(text === undefined) text = String(normalized);
  return options.escape_html ? escapeHTML(text) : text;
}

exports.normalizeValue = normalizeValue;
exports.safeStringify = safeStringify;
