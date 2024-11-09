/**
 * @file JSLAB library vector math submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB vector math submodule.
 */
class PRDC_JSLAB_VECTOR_MATH {

  /**
   * Constructs vector math submodule object with access to JSLAB's vector functions.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   */
  constructor(jsl) {
    this.jsl = jsl;
  }
  
  /**
   * Creates a new vector with specified x, y, z components.
   * @param {number} x - The x-component of the vector.
   * @param {number} y - The y-component of the vector.
   * @param {number} z - The z-component of the vector.
   * @returns {PRDC_JSLAB_VECTOR} A new vector instance.
   */
  new(x, y, z) {
    return new PRDC_JSLAB_VECTOR(this.jsl, x, y, z);
  }
  
  /**
   * Creates a vector from polar coordinates.
   * @param {number} length - The length of the vector.
   * @param {number} radian - The angle in radians.
   * @returns {PRDC_JSLAB_VECTOR} The resulting vector.
   */
  polar(length, radian) {
    const x = length * Math.cos(radian);
    const y = length * Math.sin(radian);
    const z = 0;
    return new PRDC_JSLAB_VECTOR(this.jsl, x, y, z);
  }
  
  /**
   * Creates a vector from spherical coordinates.
   * @param {number} length - The length (magnitude) of the vector.
   * @param {number} azimuth - The azimuth angle in radians (angle from the X-axis in the XY plane).
   * @param {number} elevation - The elevation angle in radians (angle from the XY plane towards Z).
   * @returns {PRDC_JSLAB_VECTOR} The resulting vector.
   */
  spherical(length, azimuth, elevation) {
    const x = length * Math.cos(elevation) * Math.cos(azimuth);
    const y = length * Math.cos(elevation) * Math.sin(azimuth);
    const z = length * Math.sin(elevation);
    return new PRDC_JSLAB_VECTOR(this.jsl, x, y, z);
  }
}

exports.PRDC_JSLAB_VECTOR_MATH = PRDC_JSLAB_VECTOR_MATH;

/**
 * Class for JSLAB vector.
 */
class PRDC_JSLAB_VECTOR {
  
  #jsl;
  
  /**
   * Creates a new vector instance.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   * @param {number|Object} x - The x-component or an object with x, y, z properties.
   * @param {number} [y=0] - The y-component of the vector.
   * @param {number} [z=0] - The z-component of the vector.
   */
  constructor(jsl, x, y, z) {
    this.#jsl = jsl;
    this._set(x, y, z);
  }
  
  /**
   * Sets the components of the vector.
   * @param {number|Object} x - The x-component or an object with x, y, z properties.
   * @param {number} [y=0] - The y-component of the vector.
   * @param {number} [z=0] - The z-component of the vector.
   * @returns {PRDC_JSLAB_VECTOR} The updated vector instance.
   */
  _set(x, y, z) {
    if(Array.isArray(x)) {
      z = x[2];
      y = x[1];
      x = x[0];
    } else if(isObject(x)) {
      z = x.z;
      y = x.y;
      x = x.x;
    }
    
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
  }

  /**
   * Calculates the length (magnitude) of the vector.
   * @returns {number} The length of the vector.
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Calculates the length (magnitude) of the vector.
   * @returns {number} The length of the vector.
   */
  norm() {
    return this.length();
  }
  
  /**
   * Adds two vectors and returns the result.
   * @param {PRDC_JSLAB_VECTOR} v - The second vector.
   * @returns {PRDC_JSLAB_VECTOR} The resulting vector after addition.
   */
  add(v) {
    return this.#jsl.vec.new(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  /**
   * Adds two vectors and returns the result.
   * @param {PRDC_JSLAB_VECTOR} v - The second vector.
   * @returns {PRDC_JSLAB_VECTOR} The resulting vector after addition.
   */
  plus(v) {
    return this.add(v);
  }
  
  /**
   * Subtracts the second vector from the first and returns the result.
   * @param {PRDC_JSLAB_VECTOR} v - The vector to subtract.
   * @returns {PRDC_JSLAB_VECTOR} The resulting vector after subtraction.
   */
  subtract(v) {
    return this.#jsl.vec.new(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  /**
   * Subtracts the second vector from the first and returns the result.
   * @param {PRDC_JSLAB_VECTOR} v - The vector to subtract.
   * @returns {PRDC_JSLAB_VECTOR} The resulting vector after subtraction.
   */
  minus(v) {
    return this.subtract(v);
  }
  
  /**
   * Scales a vector by the given factors.
   * @param {number|Object} scale_x - The scale factor for the x-component or an object with x, y, z properties.
   * @param {number} [scale_y] - The scale factor for the y-component.
   * @param {number} [scale_z] - The scale factor for the z-component.
   * @returns {PRDC_JSLAB_VECTOR} The scaled vector.
   */
  scale(scale_x, scale_y, scale_z) {
    if(isObject(scale_x)) {
      scale_x = scale_x.x;
      scale_y = scale_x.y;
      scale_z = scale_x.z;
    } else if(!isNumber(scale_y)) {
      scale_y = scale_x;
      scale_z = scale_x;
    }
    return this.#jsl.vec.new(this.x * scale_x, this.y * scale_y, this.z * scale_z);
  }
  
  /**
   * Scales a vector by the given factor.
   * @param {number} s - The scale factor.
   * @returns {PRDC_JSLAB_VECTOR} The scaled vector.
   */
  multiply(s) {
    return this.scale(s);
  }
  
  /**
   * Scales a vector by dividing each element by given factor.
   * @param {number} s - The scale factor.
   * @returns {PRDC_JSLAB_VECTOR} The scaled vector.
   */
  divide(s) {
    return this.scale(1 / s);
  }
  
  /**
   * Checks if two vectors are equal.
   * @param {PRDC_JSLAB_VECTOR} v - The second vector.
   * @returns {boolean} True if vectors are equal, false otherwise.
   */
  equals(v) {
    return this.x == v.x && this.y == v.y && this.z == v.z;
  }

  /**
   * Calculates the angle of a vector.
   * @param {PRDC_JSLAB_VECTOR} v - The vector.
   * @returns {number} The angle in degrees.
   */
  angleTo(v) {
    let cos_theta = this.dot(v) / (this.norm() * v.norm());
    return Math.acos(cos_theta) * (180 / Math.PI);
  }

  /**
   * Projects vector to given vector.
   * @param {PRDC_JSLAB_VECTOR} v - The vector.
   * @returns {PRDC_JSLAB_VECTOR} The projected vector.
   */
  projectTo(v) {
    return v.multiply(this.dot(v) / Math.pow(v.norm(), 2));
  }
  
  /**
   * Calculates the angles of a vector.
   * @param {PRDC_JSLAB_VECTOR} v - The vector.
   * @returns {Array} The angles azimuth and elevation in degrees.
   */
  angles() {
    const length_xy = Math.sqrt(this.x * this.x + this.y * this.y);
    const azimuth = Math.atan2(this.y, this.x) * (180 / Math.PI);
    const elevation = Math.atan2(this.z, length_xy) * (180 / Math.PI);
    return [ azimuth, elevation ];
  }
  
  /**
   * Calculates the distance between two vectors.
   * @param {PRDC_JSLAB_VECTOR} v - The second vector.
   * @returns {number} The distance between the two vectors.
   */
  distance(v) {
    var a = this.x - v.x;
    var b = this.y - v.y;
    var c = this.z - v.z;
    return Math.sqrt(a * a + b * b + c * c);
  }
  
  /**
   * Calculates the dot product of two vectors.
   * @param {PRDC_JSLAB_VECTOR} v - The second vector.
   * @returns {number} The dot product.
   */
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  
  /**
   * Calculates the cross product of two vectors.
   * @param {PRDC_JSLAB_VECTOR} v - The second vector.
   * @returns {PRDC_JSLAB_VECTOR} The cross product vector.
   */
  cross(v) {
    var cross_x = this.y * v.z - this.z * v.y;
    var cross_y = this.z * v.x - this.x * v.z;
    var cross_z = this.x * v.y - this.y * v.x;
    return this.#jsl.vec.new(cross_x, cross_y, cross_z);
  }
  
  /**
   * Interpolates between two vectors by a factor.
   * @param {PRDC_JSLAB_VECTOR} v - The ending vector.
   * @param {number} f - The interpolation factor.
   * @returns {PRDC_JSLAB_VECTOR} The interpolated vector.
   */
  interpolate(v, f) {
    var dx = v.x - this.x;
    var dy = v.y - this.y;
    var dz = v.y - this.y;
    return this.#jsl.vec.new(this.x + dx * f, this.y + dy * f, this.z + dz * f);
  }
  
  /**
   * Offsets the vector by the given amounts.
   * @param {number|Object} x - The amount to offset in the x-direction or an object with x, y, z properties.
   * @param {number} [y=0] - The amount to offset in the y-direction.
   * @param {number} [z=0] - The amount to offset in the z-direction.
   * @returns {PRDC_JSLAB_VECTOR} The updated vector instance.
   */
  offset(x, y, z) {
    if(isObject(x)) {
      x = x.x;
      z = x.z;
      y = x.y;
    }
    
    x = this.x + x || 0;
    y = this.y + y || 0;
    z = this.z + z || 0;
    
    return this.#jsl.vec.new(x, y, z);
  }
  
  /**
   * Normalizes the vector to have a length of 1.
   * @returns {PRDC_JSLAB_VECTOR} The normalized vector.
   */
  normalize() {
    var length = this.length();
    
    if(length > 0) {
      var x = this.x / length;
      var y = this.y / length;
      var z = this.z / length;
      return this.#jsl.vec.new(x, y, z);
    }
    return this.clone();
  }
  
  /**
   * Negates the vector components.
   * @returns {PRDC_JSLAB_VECTOR} The negated vector.
   */
  negate() {
    var x = this.x * -1;
    var y = this.y * -1;
    var z = this.z * -1;
    
    return this.#jsl.vec.new(x, y, z);
  }
  
  /**
   * Creates a clone of this vector.
   * @returns {PRDC_JSLAB_VECTOR} A new vector instance with the same components.
   */
  clone() {
    return this.#jsl.vec.new(this.x, this.y, this.z);
  }
  
  /**
   * Converts the vector to an array.
   * @returns {number[]} An array containing the x, y, z components of the vector.
   */
  toArray() {
    return [this.x, this.y, this.z];
  }

  /**
   * Converts the vector to a matrix.
   * @returns {Object} A matrix representation of the vector.
   */
  toMatrix() {
    return this.#jsl.mat.new([this.x, this.y, this.z], 3, 1);
  }

  /**
   * Converts the vector to a column matrix.
   * @returns {Object} A column matrix representation of the vector.
   */
  toColMatrix() {
    return this.#jsl.mat.new([this.x, this.y, this.z], 1, 3);
  }

  /**
   * Converts the vector to a row matrix.
   * @returns {Object} A row matrix representation of the vector.
   */
  toRowMatrix() {
    return this.toMatrix();
  }
  
  /**
   * Returns a string representation of the vector.
   * @returns {string} The string representation in the format 'Vector(x:, y:, z:)'.
   */
  toString() {
    return 'Vector([' + this.x + ', ' + this.y + ', ' + this.z + '])';
  }
  
  /**
   * Returns a string representation of the vector.
   * @returns {string} The string representation in the format 'Vector(x:, y:, z:)'.
   */
  toJSON() {
    return { x: this.x, y: this.y, z: this.z };
  }
  
  /**
   * Returns a string representation of the vector.
   * @returns {string} The string representation in the format 'Vector(x:, y:, z:)'.
   */
  toSafeJSON() {
    return this.toJSON();
  }
  
  /**
   * Converts the object to a pretty string representation.
   * @returns {string} The pretty string representation of the object.
   */
  toPrettyString() {
    return this.toString();
  }
}
