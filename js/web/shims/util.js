const { safeStringify } = require('../../shared/value-serializer');

function inspect(value, options = {}) {
  var settings = options && typeof options === 'object' ? options : {};
  var depth = typeof options === 'number' ? options : settings.depth;
  return safeStringify(value, {
    max_depth: isFinite(depth) && depth >= 0 ? depth : 3,
    max_properties: 1000,
    max_array_length: Number(settings.maxArrayLength) > 0 ? Number(settings.maxArrayLength) : 1000,
    max_string_length: Number(settings.maxStringLength) > 0 ? Number(settings.maxStringLength) : 10000,
    escape_html: false,
    indent: settings.compact ? 0 : 2
  });
}

exports.inspect = inspect;
