function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function splitPath(value) {
  return normalizeSlashes(value)
    .split('/')
    .filter(Boolean);
}

function join() {
  var parts = Array.prototype.slice.call(arguments).map(splitPath).flat();
  return (normalizeSlashes(arguments[0] || '').startsWith('/') ? '/' : '') + parts.join('/');
}

function extname(value) {
  var base = splitPath(value).pop() || '';
  var index = base.lastIndexOf('.');
  if(index <= 0) {
    return '';
  }
  return base.slice(index);
}

function relative(from_path, to_path) {
  var from_parts = splitPath(from_path);
  var to_parts = splitPath(to_path);
  var index = 0;
  while(index < from_parts.length && index < to_parts.length && from_parts[index] == to_parts[index]) {
    index += 1;
  }
  var up_parts = new Array(Math.max(0, from_parts.length - index)).fill('..');
  var down_parts = to_parts.slice(index);
  var parts = up_parts.concat(down_parts);
  return parts.length ? parts.join('/') : '';
}

exports.sep = '/';
exports.join = join;
exports.extname = extname;
exports.relative = relative;
