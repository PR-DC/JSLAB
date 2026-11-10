/**
 * @file JSLAB shared AlphaShape WebAssembly bindings
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Creates an environment-bound AlphaShape class with explicit resource ownership.
 * @param {Object} wasm Initialized Emscripten module.
 * @param {Object} env Environment providing file writes.
 * @returns {Function} AlphaShape constructor.
 */
function createAlphaShape3DClass(wasm, env) {
  if(!wasm || typeof wasm.AlphaShape3D !== 'function') {
    throw new Error('AlphaShape WebAssembly module is unavailable. Run npm run build-native-wasm.');
  }
  var required_methods = ['newShape', 'getAlpha', 'setAlpha', 'getNumRegions',
    'getAlphaSpectrum', 'getCriticalAlpha', 'getSurfaceArea', 'getVolume',
    'getBoundaryFacets', 'getPoints', 'checkInShape', 'getTriangulation',
    'getNearestNeighbor', 'getSimplifiedShape', 'removeUnusedPoints', 'delete'];
  if(required_methods.some(function(method) {
    return typeof wasm.AlphaShape3D.prototype[method] !== 'function';
  })) {
    throw new Error('AlphaShape WebAssembly module is incompatible. Run npm run build-native-wasm.');
  }
  var finalizer = typeof FinalizationRegistry === 'function'
    ? new FinalizationRegistry(function(native) { native.delete(); })
    : null;

  /**
   * Validates finite three-coordinate rows before crossing the WASM boundary.
   * @param {*} rows Input rows.
   * @param {boolean} [indices=false] Whether rows contain vertex indices.
   * @param {number} [point_count=0] Number of referenced points.
   */
  function validateRows(rows, indices = false, point_count = 0) {
    if(!Array.isArray(rows)) throw new TypeError('An array of three-coordinate rows is required.');
    rows.forEach(function(row) {
      if(!Array.isArray(row) || row.length !== 3) throw new TypeError('Each row must have exactly three coordinates.');
      row.forEach(function(value) {
        if(typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Coordinates must be finite numbers.');
        if(indices && (!Number.isInteger(value) || value < 0 || value >= point_count)) {
          throw new RangeError('Facet indices must reference existing points.');
        }
      });
    });
  }

  /**
   * Writes OFF data through the host environment rather than the WASM filesystem.
   * @param {string} filename Destination path.
   * @param {Array<Array<number>>} points Points.
   * @param {Array<Array<number>>} facets Triangular facets.
   * @returns {*} Host write result.
   */
  function writeOff(filename, points, facets) {
    if(typeof filename !== 'string' || !filename.length) throw new TypeError('A destination filename is required.');
    validateRows(points);
    validateRows(facets, true, points.length);
    var lines = ['OFF', points.length + ' ' + facets.length + ' 0'];
    points.forEach(function(row) { lines.push(row.join(' ')); });
    facets.forEach(function(row) { lines.push('3 ' + row.join(' ')); });
    if(env.writeFileSync(filename, lines.join('\n') + '\n') === false) {
      throw new Error('Unable to write OFF file: ' + filename);
    }
  }

  /**
   * AlphaShape instance backed by the shared compiled implementation.
   */
  class PRDC_JSLAB_WASM_ALPHA_SHAPE_3D {
    /**
     * Creates one owned WASM object.
     */
    constructor() {
      this._native = new wasm.AlphaShape3D();
      if(finalizer) finalizer.register(this, this._native, this);
    }

    /**
     * Calls a live native instance and converts compiled exceptions to errors.
     * @param {string} method Native method name.
     * @param {Array} [args=[]] Arguments.
     * @returns {*} Native result.
     */
    _call(method, args = []) {
      if(!this._native) throw new Error('AlphaShape3D instance has been released.');
      try {
        return this._native[method](...args);
      } catch(err) {
        if((typeof err === 'number' || err && typeof err.excPtr === 'number' ||
            typeof WebAssembly.Exception === 'function' && err instanceof WebAssembly.Exception) &&
            typeof wasm.getExceptionMessage === 'function') {
          var message = wasm.getExceptionMessage(err);
          if(typeof wasm.decrementExceptionRefcount === 'function') wasm.decrementExceptionRefcount(err);
          throw new Error(message[1] || message[0]);
        }
        throw err;
      }
    }

    /**
     * Releases the WASM object. Repeated disposal is harmless.
     */
    dispose() {
      if(this._native) {
        if(finalizer) finalizer.unregister(this);
        this._native.delete();
        this._native = null;
      }
    }

    /**
     * Releases the WASM object using the existing shape API.
     */
    delete() {
      this.dispose();
    }

    /**
     * Builds a three-dimensional shape.
     * @param {Array<Array<number>>} points Input coordinates.
     */
    newShape(points) {
      validateRows(points);
      if(points.length < 4) throw new RangeError('At least four noncoplanar points are required.');
      this._call('newShape', [points]);
    }

    /**
     * Sets the squared alpha radius.
     * @param {number} alpha Alpha value.
     */
    setAlpha(alpha) {
      if(typeof alpha !== 'number' || !Number.isFinite(alpha) || alpha < 0) throw new RangeError('Alpha must be finite and nonnegative.');
      this._call('setAlpha', [alpha]);
    }

    /**
     * Finds the requested critical alpha.
     * @param {string} type Critical-alpha mode.
     * @returns {number} Alpha value.
     */
    getCriticalAlpha(type) {
      if(!['all-points', 'one-region'].includes(type)) throw new TypeError('Unknown critical-alpha mode.');
      return this._call('getCriticalAlpha', [type]);
    }

    /**
     * Classifies query points against the shape.
     * @param {Array<Array<number>>} points Query coordinates.
     * @returns {Array<boolean>} Inclusion flags.
     */
    checkInShape(points) {
      validateRows(points);
      return this._call('checkInShape', [points]);
    }

    /**
     * Finds the closest boundary vertices.
     * @param {Array<Array<number>>} points Query coordinates.
     * @returns {Object} Indices and distances.
     */
    getNearestNeighbor(points) {
      validateRows(points);
      return this._call('getNearestNeighbor', [points]);
    }

    /**
     * Simplifies the boundary and optionally exports it.
     * @param {number|string} [ratio=0.05] Remaining-edge ratio or filename.
     * @param {string} [filename] Optional output path.
     * @returns {Object} Points and facets.
     */
    getSimplifiedShape(ratio = 0.05, filename) {
      if(typeof ratio === 'string' && filename === undefined) {
        filename = ratio;
        ratio = 0.05;
      }
      if(typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
        throw new RangeError('Simplification ratio must be between zero and one.');
      }
      var result = this._call('getSimplifiedShape', [ratio]);
      if(filename !== undefined) writeOff(filename, result.points, result.facets);
      return result;
    }

    /**
     * Removes unused points and remaps facets.
     * @param {Array<Array<number>>} points Coordinates.
     * @param {Array<Array<number>>} facets Triangular indices.
     * @returns {Object} Compacted points and facets.
     */
    removeUnusedPoints(points, facets) {
      validateRows(points);
      validateRows(facets, true, points.length);
      return this._call('removeUnusedPoints', [points, facets]);
    }

    /**
     * Exports supplied points and facets through the environment.
     * @param {string} filename Output path.
     * @param {Array<Array<number>>} points Coordinates.
     * @param {Array<Array<number>>} facets Triangular indices.
     */
    writeOff(filename, points, facets) {
      writeOff(filename, points, facets);
    }

    /**
     * Exports the current boundary with its input points.
     * @param {string} filename Output path.
     */
    writeBoundaryFacets(filename) {
      writeOff(filename, this._call('getPoints'), this._call('getBoundaryFacets'));
    }
  }

  ['getAlpha', 'getNumRegions', 'getAlphaSpectrum', 'getSurfaceArea',
    'getVolume', 'getBoundaryFacets', 'getTriangulation'].forEach(function(method) {
    PRDC_JSLAB_WASM_ALPHA_SHAPE_3D.prototype[method] = function() { return this._call(method); };
  });
  PRDC_JSLAB_WASM_ALPHA_SHAPE_3D.available = true;
  return PRDC_JSLAB_WASM_ALPHA_SHAPE_3D;
}

exports.createAlphaShape3DClass = createAlphaShape3DClass;
