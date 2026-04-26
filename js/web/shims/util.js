function inspect(value) {
  try {
    if(typeof value == 'string') {
      return JSON.stringify(value);
    }
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

exports.inspect = inspect;
