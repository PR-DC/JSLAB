/**
 * @file JSLAB web native-module bridge
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Validates and normalizes a numeric array input.
 * @param {string} name
 * @param {*} value
 * @returns {Array<number>}
 */
function toNumericArray(name, value) {
  if(!Array.isArray(value)) {
    throw new TypeError(name + ' must be an array');
  }

  return value.map(function(entry) {
    if(typeof entry != 'number' || !isFinite(entry)) {
      throw new TypeError(name + ' array must contain only numbers');
    }
    return entry;
  });
}

/**
 * Converts a root pair into a desktop-compatible return value.
 * @param {number} real_part
 * @param {number} imag_part
 * @returns {(number|Object)}
 */
function formatRoot(real_part, imag_part) {
  if(Math.abs(imag_part) < 1e-10 || isNaN(imag_part)) {
    return real_part;
  }
  return {
    real: real_part,
    imag: imag_part
  };
}

/**
 * Evaluates a polynomial at a complex point using Horner's method.
 * @param {Array<number>} coefficients
 * @param {Object} z
 * @returns {Object}
 */
function evalPolynomialComplex(coefficients, z) {
  var value = {
    real: coefficients[0],
    imag: 0
  };

  for(var i = 1; i < coefficients.length; i++) {
    var current_real = value.real;
    var current_imag = value.imag;
    value = {
      real: current_real * z.real - current_imag * z.imag + coefficients[i],
      imag: current_real * z.imag + current_imag * z.real
    };
  }

  return value;
}

/**
 * Divides two complex values.
 * @param {Object} a
 * @param {Object} b
 * @returns {Object}
 */
function divComplex(a, b) {
  var denom = b.real * b.real + b.imag * b.imag;
  if(denom <= 1e-30) {
    return { real: 0, imag: 0 };
  }
  return {
    real: (a.real * b.real + a.imag * b.imag) / denom,
    imag: (a.imag * b.real - a.real * b.imag) / denom
  };
}

/**
 * Solves polynomial roots with a JS fallback when wasm is unavailable.
 * @param {Array<number>} coefficients
 * @returns {Array<(number|Object)>}
 */
function rootsFallback(coefficients) {
  var normalized = coefficients.slice();

  while(normalized.length > 1 && Math.abs(normalized[0]) <= 1e-20) {
    normalized.shift();
  }

  if(normalized.length <= 1) {
    return [];
  }

  var degree = normalized.length - 1;
  var lead = normalized[0];
  normalized = normalized.map(function(value) {
    return value / lead;
  });

  if(degree == 1) {
    return [-normalized[1]];
  }

  var radius = 1;
  for(var i = 1; i < normalized.length; i++) {
    radius = Math.max(radius, 1 + Math.abs(normalized[i]));
  }

  var roots = [];
  for(var k = 0; k < degree; k++) {
    var angle = 2 * Math.PI * k / degree;
    roots.push({
      real: radius * Math.cos(angle),
      imag: radius * Math.sin(angle)
    });
  }

  for(var iter = 0; iter < 200; iter++) {
    var max_delta = 0;

    for(var root_index = 0; root_index < degree; root_index++) {
      var root = roots[root_index];
      var numerator = evalPolynomialComplex(normalized, root);
      var denominator = { real: 1, imag: 0 };

      for(var other_index = 0; other_index < degree; other_index++) {
        if(other_index == root_index) {
          continue;
        }
        var other = roots[other_index];
        var diff = {
          real: root.real - other.real,
          imag: root.imag - other.imag
        };
        var next_denom = {
          real: denominator.real * diff.real - denominator.imag * diff.imag,
          imag: denominator.real * diff.imag + denominator.imag * diff.real
        };
        denominator = next_denom;
      }

      if(Math.abs(denominator.real) + Math.abs(denominator.imag) <= 1e-20) {
        denominator.real += 1e-12;
      }

      var correction = divComplex(numerator, denominator);
      root.real -= correction.real;
      root.imag -= correction.imag;
      max_delta = Math.max(max_delta,
        Math.hypot(correction.real, correction.imag));
    }

    if(max_delta < 1e-12) {
      break;
    }
  }

  return roots.map(function(root) {
    return formatRoot(root.real, root.imag);
  });
}

/**
 * Creates a JS fallback implementation for the native module surface.
 * @returns {Object}
 */
function createFallbackNativeModule() {
  return {
    wasm: false,
    roots: function(coefficients) {
      if(!Array.isArray(coefficients)) {
        throw new TypeError('Expected an array of coefficients');
      }
      return rootsFallback(toNumericArray('Coefficient', coefficients));
    },
    cumtrapz: function(y_values, x_values) {
      if(!Array.isArray(y_values)) {
        throw new TypeError('First argument must be an array');
      }
      var y = toNumericArray('y', y_values);
      var x = undefined;
      var result = [];
      var i;

      if(arguments.length > 1 && typeof x_values != 'undefined') {
        if(!Array.isArray(x_values)) {
          throw new TypeError('Second argument must be an array');
        }
        x = toNumericArray('x', x_values);
        if(x.length != y.length) {
          throw new RangeError('x and y arrays must have the same length');
        }
      }

      if(y.length == 0) {
        return [];
      }

      result[0] = 0;
      for(i = 1; i < y.length; i++) {
        var x0 = x ? x[i - 1] : i - 1;
        var x1 = x ? x[i] : i;
        result[i] = result[i - 1] + (x1 - x0) * 0.5 * (y[i] + y[i - 1]);
      }

      return result;
    },
    trapz: function(y_values, x_values) {
      if(!Array.isArray(y_values)) {
        throw new TypeError('First argument must be an array');
      }
      var y = toNumericArray('y', y_values);
      var x = undefined;
      var total = 0;
      var i;

      if(arguments.length > 1 && typeof x_values != 'undefined') {
        if(!Array.isArray(x_values)) {
          throw new TypeError('Second argument must be an array');
        }
        x = toNumericArray('x', x_values);
        if(x.length != y.length) {
          throw new RangeError('x and y arrays must have the same length');
        }
      }

      if(y.length < 2) {
        throw new RangeError('trapz requires at least two data points');
      }

      for(i = 1; i < y.length; i++) {
        var x0 = x ? x[i - 1] : i - 1;
        var x1 = x ? x[i] : i;
        total += (x1 - x0) * 0.5 * (y[i] + y[i - 1]);
      }

      return total;
    },
    listSubprocesses: function() {
      return [];
    }
  };
}

/**
 * Creates a wasm-backed implementation for the native module surface.
 * @param {Object} wasm_module
 * @returns {Object}
 */
function createWasmNativeModule(wasm_module) {
  return {
    wasm: true,
    roots: function(coefficients) {
      if(!Array.isArray(coefficients)) {
        throw new TypeError('Expected an array of coefficients');
      }
      var values = toNumericArray('Coefficient', coefficients);
      var degree = Math.max(values.length - 1, 0);
      var coeff_ptr = 0;
      var real_ptr = 0;
      var imag_ptr = 0;
      var i;

      if(degree == 0) {
        return [];
      }

      coeff_ptr = wasm_module._malloc(values.length * Float64Array.BYTES_PER_ELEMENT);
      real_ptr = wasm_module._malloc(degree * Float64Array.BYTES_PER_ELEMENT);
      imag_ptr = wasm_module._malloc(degree * Float64Array.BYTES_PER_ELEMENT);

      try {
        wasm_module.HEAPF64.set(values, coeff_ptr / Float64Array.BYTES_PER_ELEMENT);
        wasm_module._nm_roots(coeff_ptr, values.length, real_ptr, imag_ptr);

        var real_values = wasm_module.HEAPF64.slice(
          real_ptr / Float64Array.BYTES_PER_ELEMENT,
          real_ptr / Float64Array.BYTES_PER_ELEMENT + degree
        );
        var imag_values = wasm_module.HEAPF64.slice(
          imag_ptr / Float64Array.BYTES_PER_ELEMENT,
          imag_ptr / Float64Array.BYTES_PER_ELEMENT + degree
        );

        var result = [];
        for(i = 0; i < degree; i++) {
          result.push(formatRoot(real_values[i], imag_values[i]));
        }
        return result;
      } finally {
        if(coeff_ptr) {
          wasm_module._free(coeff_ptr);
        }
        if(real_ptr) {
          wasm_module._free(real_ptr);
        }
        if(imag_ptr) {
          wasm_module._free(imag_ptr);
        }
      }
    },
    cumtrapz: function(y_values, x_values) {
      if(!Array.isArray(y_values)) {
        throw new TypeError('First argument must be an array');
      }
      var y = toNumericArray('y', y_values);
      var x = undefined;
      var y_ptr = 0;
      var x_ptr = 0;
      var out_ptr = 0;

      if(arguments.length > 1 && typeof x_values != 'undefined') {
        if(!Array.isArray(x_values)) {
          throw new TypeError('Second argument must be an array');
        }
        x = toNumericArray('x', x_values);
        if(x.length != y.length) {
          throw new RangeError('x and y arrays must have the same length');
        }
      }

      if(y.length == 0) {
        return [];
      }

      y_ptr = wasm_module._malloc(y.length * Float64Array.BYTES_PER_ELEMENT);
      out_ptr = wasm_module._malloc(y.length * Float64Array.BYTES_PER_ELEMENT);

      try {
        wasm_module.HEAPF64.set(y, y_ptr / Float64Array.BYTES_PER_ELEMENT);
        if(x) {
          x_ptr = wasm_module._malloc(x.length * Float64Array.BYTES_PER_ELEMENT);
          wasm_module.HEAPF64.set(x, x_ptr / Float64Array.BYTES_PER_ELEMENT);
        }

        wasm_module._nm_cumtrapz(y_ptr, y.length, x_ptr, x ? 1 : 0, out_ptr);
        return Array.from(wasm_module.HEAPF64.slice(
          out_ptr / Float64Array.BYTES_PER_ELEMENT,
          out_ptr / Float64Array.BYTES_PER_ELEMENT + y.length
        ));
      } finally {
        if(y_ptr) {
          wasm_module._free(y_ptr);
        }
        if(x_ptr) {
          wasm_module._free(x_ptr);
        }
        if(out_ptr) {
          wasm_module._free(out_ptr);
        }
      }
    },
    trapz: function(y_values, x_values) {
      if(!Array.isArray(y_values)) {
        throw new TypeError('First argument must be an array');
      }
      var y = toNumericArray('y', y_values);
      var x = undefined;
      var y_ptr = 0;
      var x_ptr = 0;

      if(arguments.length > 1 && typeof x_values != 'undefined') {
        if(!Array.isArray(x_values)) {
          throw new TypeError('Second argument must be an array');
        }
        x = toNumericArray('x', x_values);
        if(x.length != y.length) {
          throw new RangeError('x and y arrays must have the same length');
        }
      }

      if(y.length < 2) {
        throw new RangeError('trapz requires at least two data points');
      }

      y_ptr = wasm_module._malloc(y.length * Float64Array.BYTES_PER_ELEMENT);

      try {
        wasm_module.HEAPF64.set(y, y_ptr / Float64Array.BYTES_PER_ELEMENT);
        if(x) {
          x_ptr = wasm_module._malloc(x.length * Float64Array.BYTES_PER_ELEMENT);
          wasm_module.HEAPF64.set(x, x_ptr / Float64Array.BYTES_PER_ELEMENT);
        }

        return wasm_module._nm_trapz(y_ptr, y.length, x_ptr, x ? 1 : 0);
      } finally {
        if(y_ptr) {
          wasm_module._free(y_ptr);
        }
        if(x_ptr) {
          wasm_module._free(x_ptr);
        }
      }
    },
    listSubprocesses: function() {
      return [];
    }
  };
}

/**
 * Creates a native-module bridge for the web runtime.
 * @param {Object} env
 * @returns {Object}
 */
function createWebNativeModule(env) {
  var wasm_module = globalThis.__JSLAB_NATIVE_MODULE_WASM_INSTANCE__;

  if(wasm_module &&
      typeof wasm_module._malloc == 'function' &&
      wasm_module.HEAPF64) {
    return createWasmNativeModule(wasm_module);
  }

  if(env && env.jsl && env.jsl._console &&
      typeof env.jsl._console.warn == 'function' &&
      globalThis.__JSLAB_WEB_NATIVE_WASM__ &&
      globalThis.__JSLAB_WEB_NATIVE_WASM__.native_module &&
      globalThis.__JSLAB_WEB_NATIVE_WASM__.native_module.available) {
    env.jsl._console.warn('Falling back to JS native_module implementation because wasm module is not initialized.');
  }

  return createFallbackNativeModule();
}

/**
 * Builds OFF text content.
 * @param {Array<Array<number>>} vertices
 * @param {Array<Array<number>>} faces
 * @returns {string}
 */
function buildOffText(vertices, faces) {
  var vertex_lines = [];
  var face_lines = [];
  var i;
  var j;

  if(!Array.isArray(vertices)) {
    throw new TypeError('Vertices must be an array');
  }
  if(!Array.isArray(faces)) {
    throw new TypeError('Faces must be an array');
  }

  for(i = 0; i < vertices.length; i++) {
    if(!Array.isArray(vertices[i]) || vertices[i].length != 3) {
      throw new TypeError('Each vertex must contain exactly 3 coordinates');
    }
    vertex_lines.push([
      Number(vertices[i][0]),
      Number(vertices[i][1]),
      Number(vertices[i][2])
    ].join(' '));
  }

  for(i = 0; i < faces.length; i++) {
    if(!Array.isArray(faces[i]) || faces[i].length != 3) {
      throw new TypeError('Each face must contain exactly 3 indices');
    }
    for(j = 0; j < 3; j++) {
      if(!Number.isFinite(Number(faces[i][j]))) {
        throw new TypeError('Face indices must be numeric');
      }
    }
    face_lines.push([
      '3',
      String(Math.trunc(Number(faces[i][0]))),
      String(Math.trunc(Number(faces[i][1]))),
      String(Math.trunc(Number(faces[i][2])))
    ].join(' '));
  }

  return [
    'OFF',
    vertices.length + ' ' + faces.length + ' 0',
    vertex_lines.join('\n'),
    face_lines.join('\n')
  ].filter(function(part) {
    return part.length;
  }).join('\n') + '\n';
}

/**
 * Returns a web AlphaShape3D class.
 * @param {Object} env
 * @returns {Function}
 */
function createWebAlphaShape3DClass(env) {
  var wasm_module = globalThis.__JSLAB_ALPHA_SHAPE_3D_WASM_INSTANCE__;
  var NativeAlphaShape3D = wasm_module && wasm_module.AlphaShape3D;
  var alpha_shape_info = globalThis.__JSLAB_WEB_NATIVE_WASM__ &&
    globalThis.__JSLAB_WEB_NATIVE_WASM__.alpha_shape_3d;
  var finalizer = typeof FinalizationRegistry == 'function'
    ? new FinalizationRegistry(function(native_instance) {
      if(native_instance && typeof native_instance.delete == 'function') {
        native_instance.delete();
      }
    })
    : null;

  if(typeof NativeAlphaShape3D == 'function') {
    class PRDC_JSLAB_WEB_ALPHA_SHAPE_3D {

      constructor() {
        this._native = new NativeAlphaShape3D();
        if(finalizer) {
          finalizer.register(this, this._native, this);
        }
      }

      _ensureNative() {
        if(!this._native) {
          throw new Error('AlphaShape3D instance has been released');
        }
      }

      dispose() {
        if(this._native) {
          if(finalizer) {
            finalizer.unregister(this);
          }
          if(typeof this._native.delete == 'function') {
            this._native.delete();
          }
          this._native = null;
        }
      }

      delete() {
        this.dispose();
      }

      newShape(points) {
        this._ensureNative();
        return this._native.newShape(points);
      }

      getAlpha() {
        this._ensureNative();
        return this._native.getAlpha();
      }

      setAlpha(alpha) {
        this._ensureNative();
        return this._native.setAlpha(alpha);
      }

      getNumRegions() {
        this._ensureNative();
        return this._native.getNumRegions();
      }

      getAlphaSpectrum() {
        this._ensureNative();
        return this._native.getAlphaSpectrum();
      }

      getCriticalAlpha(type) {
        this._ensureNative();
        return this._native.getCriticalAlpha(type);
      }

      getSurfaceArea() {
        this._ensureNative();
        return this._native.getSurfaceArea();
      }

      getVolume() {
        this._ensureNative();
        return this._native.getVolume();
      }

      getBoundaryFacets() {
        this._ensureNative();
        return this._native.getBoundaryFacets();
      }

      writeOff(filename, vertices, faces) {
        if(!env || typeof env.writeFileSync != 'function') {
          throw new Error('AlphaShape3D OFF export is not available in this runtime');
        }
        return env.writeFileSync(filename, buildOffText(vertices, faces));
      }
    }

    PRDC_JSLAB_WEB_ALPHA_SHAPE_3D.available = true;
    return PRDC_JSLAB_WEB_ALPHA_SHAPE_3D;
  }

  class PRDC_JSLAB_WEB_ALPHA_SHAPE_3D {

    constructor() {
      var err_msg = 'AlphaShape3D wasm module is not available in this web build.';
      if(alpha_shape_info && alpha_shape_info.available) {
        err_msg = 'AlphaShape3D wasm module is available but was not initialized.';
      } else if(alpha_shape_info && alpha_shape_info.reason) {
        err_msg = String(alpha_shape_info.reason);
      }
      throw new Error(err_msg);
    }
  }

  PRDC_JSLAB_WEB_ALPHA_SHAPE_3D.available = false;
  return PRDC_JSLAB_WEB_ALPHA_SHAPE_3D;
}

exports.createWebNativeModule = createWebNativeModule;
exports.createWebAlphaShape3DClass = createWebAlphaShape3DClass;
exports.PRDC_JSLAB_WEB_ALPHA_SHAPE_3D = createWebAlphaShape3DClass(null);
