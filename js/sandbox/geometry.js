/**
 * @file JSLAB library geometry submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB geometry submodule.
 */
class PRDC_JSLAB_LIB_GEOMETRY {
  
  /**
   * Initializes a new instance of the geometry submodule, providing access to geometry manipulation utilities.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }

  /**
   * Generates a rotation matrix to rotate from vector a to vector b.
   * @param {number[]} a - The initial unit vector.
   * @param {number[]} b - The target unit vector.
   * @returns {number[][]} - The resulting rotation matrix.
   */
  getrotation_matrix(a, b) {
    // a and b are unit vectors
    var v = this.jsl.array.cross3D(a, b, 1);
    var s = this.jsl.env.math.norm(v);
    var c = this.jsl.array.dotVector(a, b);

    if(c == -1) { // Vectors are opposite
      // Find a vector orthogonal to 'a'
      var orthogonal = [0, 0, 0];
      if(this.jsl.env.math.abs(a[0]) < this.jsl.env.math.abs(a[1]) && 
          this.jsl.env.math.abs(a[0]) < this.jsl.env.math.abs(a[2])) {
        orthogonal = [0, -a[2], a[1]];
      } else if(this.jsl.env.math.abs(a[1]) < this.jsl.env.math.abs(a[2])) {
        orthogonal = [-a[2], 0, a[0]];
      } else {
        orthogonal = [-a[1], a[0], 0];
      }
      orthogonal = this.jsl.array.normalizeVector(orthogonal);

      // Compute rotation matrix using Householder reflection
      var o = orthogonal;
      return [
        [ -1 + 2 * o[0] * o[0],      2 * o[0] * o[1],      2 * o[0] * o[2],
             2 * o[1] * o[0],  -1 + 2 * o[1] * o[1],     2 * o[1] * o[2],
             2 * o[2] * o[0],      2 * o[2] * o[1], -1 + 2 * o[2] * o[2]]
      ];
    } else if(s === 0) { // Vectors are the same
      // Return identity matrix
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    } else {
      // Compute skew-symmetric cross-product matrix of v
      var vx = this.jsl.array.skewVector(v);

      // Compute R = I + vx + vx * vx * ((1 - c) / (s * s))
      var I = [1, 0, 0, 0, 1, 0, 0, 0, 1];

      var vx2 = this.jsl.array.multiply(vx, vx, 3, 3, 3);

      var factor = (1 - c) / (s * s);

      var R = this.jsl.array.plus(this.jsl.array.plus(I, vx), this.jsl.array.scale(vx2, factor));

      return R;
    }
  }

  /**
   * Transforms coordinates by scaling, rotating, and translating them.
   * @param {number[][]} coordinates - Array of coordinate points.
   * @param {number} scale_factor - Factor by which to scale the coordinates.
   * @param {number[][]} rotation_matrix - Matrix used to rotate the coordinates.
   * @param {number[]} translation - Vector used to translate the coordinates.
   * @returns {number[][]} - The transformed coordinates.
   */
  transform(coordinates, scale_factor, rotation_matrix, translation) {
    var obj = this;
    return coordinates.map(function(coordinate) {
      var transformed = obj.jsl.array.plus(translation, obj.jsl.array.multiply(rotation_matrix, obj.jsl.array.scale(coordinate, scale_factor), 3, 3, 1));
      return transformed;
    });
  }
        
  /**
   * Creates 3D vectors for plotting based on provided parameters.
   * @param {number[]} xi - X coordinates of vector origins.
   * @param {number[]} yi - Y coordinates of vector origins.
   * @param {number[]} zi - Z coordinates of vector origins.
   * @param {number[]} ui - X components of vectors.
   * @param {number[]} vi - Y components of vectors.
   * @param {number[]} wi - Z components of vectors.
   * @param {number} scale - Scale factor for the vectors.
   * @param {number} angle_factor - Angle factor for arrowheads.
   * @param {Object} opts - Additional plotting options.
   * @returns {Object} - An object containing line and head trace data for plotting.
   */
  createVectors3D(xi, yi, zi, ui, vi, wi, scale, angle_factor, opts) {
    
    // Define the unit arrow once
    var arrowhead_length = scale * 1;
    var arrowhead_width = arrowhead_length * this.jsl.env.math.tan(angle_factor);

    // Shaft points (unit arrow along x-axis)
    var shaft_start = [0, 0, 0];
    var shaft_end = [1 - arrowhead_length, 0, 0];

    // Arrowhead base points
    var arrow_tip = [1, 0, 0];  // Tip at the end of the shaft
    var arrow_left = [1 - arrowhead_length, arrowhead_width, 0];
    var arrow_right = [1 - arrowhead_length, -arrowhead_width, 0];

    // All points of the unit arrow
    var unit_arrow_points = [shaft_start, shaft_end, arrow_tip, arrow_left, arrow_right];
    
    var vectors = {
      line: {
        x: [],
        y: [],
        z: [],
        type: 'scatter3d', color: '#00f', mode: 'lines', showLegend: false
      },
      head: {
        x: [],
        y: [],
        z: [],
        i: [],
        j: [],
        k: [],
        type: 'mesh3d', color: '#00f', opacity: 1, flatShading: true, 
        showScale: false, showLegend: false, lighting: {ambient: 1}
      }
    }
    
    if(typeof opts == 'object') {
      Object.assign(vectors.line, opts);
      Object.assign(vectors.head, opts);
    }
    
    var vertexIndex = 0;
    var x_axis = [1, 0, 0];
    
    for(var i = 0; i < xi.length; i++) {
        var x0 = xi[i];
        var y0 = yi[i];
        var z0 = zi[i];
        var u = ui[i];
        var v = vi[i];
        var w = wi[i];
        
        var vector = [u, v, w];
        
        // Calculate the length of the vector
        var length = this.jsl.env.math.norm(vector);
        if(length === 0) continue; // Skip zero-length vectors

        // Normalize the direction vector
        var dir = this.jsl.array.normalizeVector(vector);

        // Compute rotation matrix to rotate from x-axis to dir
        var R = this.getrotation_matrix(x_axis, dir);

        // Scale factor is the length of the vector
        var scale_factor = length;

        // Translation vector is the starting point (x0, y0, z0)
        var translation = [x0, y0, z0];

        // Transform the unit arrow points
        var transformed_points = this.transform(unit_arrow_points, scale_factor, R, translation);

        // Extract points
        var shaft_start_rot = transformed_points[0];
        var shaft_end_rot = transformed_points[1];
        var arrow_tip_rot = transformed_points[2];
        var arrow_left_rot = transformed_points[3];
        var arrow_right_rot = transformed_points[4];

        // Add shaft line to lines arrays
        vectors.line.x.push(shaft_start_rot[0], shaft_end_rot[0], null);
        vectors.line.y.push(shaft_start_rot[1], shaft_end_rot[1], null);
        vectors.line.z.push(shaft_start_rot[2], shaft_end_rot[2], null);

        // Add arrowhead edges to lines arrays
        vectors.line.x.push(
            arrow_tip_rot[0], arrow_left_rot[0], null,
            arrow_left_rot[0], arrow_right_rot[0], null,
            arrow_right_rot[0], arrow_tip_rot[0], null
        );
        vectors.line.y.push(
            arrow_tip_rot[1], arrow_left_rot[1], null,
            arrow_left_rot[1], arrow_right_rot[1], null,
            arrow_right_rot[1], arrow_tip_rot[1], null
        );
        vectors.line.z.push(
            arrow_tip_rot[2], arrow_left_rot[2], null,
            arrow_left_rot[2], arrow_right_rot[2], null,
            arrow_right_rot[2], arrow_tip_rot[2], null
        );

        // Add arrowhead vertices to mesh arrays
        vectors.head.x.push(arrow_tip_rot[0], arrow_left_rot[0], arrow_right_rot[0]);
        vectors.head.y.push(arrow_tip_rot[1], arrow_left_rot[1], arrow_right_rot[1]);
        vectors.head.z.push(arrow_tip_rot[2], arrow_left_rot[2], arrow_right_rot[2]);

        // Define the face for the current arrowhead
        vectors.head.i.push(vertexIndex);
        vectors.head.j.push(vertexIndex + 1);
        vectors.head.k.push(vertexIndex + 2);

        // Update vertex index for the next arrow
        vertexIndex += 3;
    }
    return vectors;
  }
        
  /**
   * Creates a symmetrical rectangle in 3D space.
   * @param {number} W - Width of the rectangle.
   * @param {number} H - Height of the rectangle.
   * @param {number} [Z=0] - Z-coordinate for the rectangle plane.
   * @returns {number[]} - Array of vertex coordinates for the rectangle.
   */
  symRectangle(W, H, Z = 0) {
    return [W/2, H/2, Z, 
      -W/2, H/2, Z,
      -W/2, -H/2, Z,
      W/2, -H/2, Z,
      W/2, H/2, Z];
  }
        
  /**
   * Generates the boundary of a 3D shape based on points and a shrink factor.
   * @param {number[][]} points - Array of points defining the shape.
   * @param {number} [shrink=0.5] - Factor by which to shrink the boundary.
   * @returns {Array} - An array containing boundary facets and the volume.
   */
  boundary3D(points, shrink = 0.5) {
    var shp = new this.jsl.env.AlphaShape3D(); 
    shp.newShape(points);
    
    var Acrit = shp.getCriticalAlpha('one-region');
    var spec = shp.getAlphaSpectrum();
    
    var idx = spec.indexOf(Acrit);
    var subspec = spec.slice(idx);
    
    var idx = Math.max(Math.ceil((1 - shrink) * subspec.length) - 1, 0);
    var alphaval = subspec[idx];

    shp.setAlpha(alphaval);
    var V = shp.getVolume();
    var bf = shp.getBoundaryFacets();
    shp = null;
    return [bf, V];
  }
        
  /**
   * Writes geometry data to an OFF file.
   * @param {string} filename - The path to the OFF file.
   * @param {number[][]} vertices - Array of vertex coordinates.
   * @param {number[][]} faces - Array of face indices.
   */
  writeOff(filename, vertices, faces) {
    var shp = new this.jsl.env.AlphaShape3D(); 
    shp.writeOff(filename, vertices, faces);
    shp = null;
  }

  /**
   * Reads an OFF file and returns the vertices and faces.
   * @param {string} filename - The path to the OFF file.
   * @returns {{ vertices: number[][], faces: number[][] }} - An object containing vertices and faces arrays.
   * @throws Will throw an error if the file cannot be read or is not a valid OFF file.
   */
  readOff(filename) {
    var data = this.jsl.env.readFileSync(filename, 'utf8');
    var tokens = data.split(/\s+/).filter(token => token.length > 0);
    if(tokens[0] !== 'OFF') {
      this.jsl.env.error('@readOff: '+language.string(193));
    }
    tokens.shift();
    if(tokens.length < 3) {
      this.jsl.env.error('@readOff: '+language.string(194));
    }
    
    var j = 0;
    tokens = tokens.map(x => parseFloat(x));
    
    var nvert = tokens[j++];
    var nface = tokens[j++];
    if(!isNaN(tokens[j])) {
      j++;
    }
    
    // Read vertex coordinates
    var vertices = createArray(nvert);
    var k = 0;
    for(var i = 0; i < nvert; i++) {
      if(j + 2 >= tokens.length) {
        this.jsl.env.error('@readOff: '+language.string(195));
        break;
      }
      vertices[k++] = [tokens[j++], tokens[j++], tokens[j++]];
    }
    
    // Read face data
    var faces = createArray(nface);
    var k = 0;
    for(let i = 0; i < nface; i++) {
      if(j >= tokens.length) {
        this.jsl.env.error('@readOff: '+language.string(196));
        break;
      }
      var vertices_per_face = tokens[j++];
      var face = [];
      for(let v = 0; v < vertices_per_face; v++) {
        face.push(tokens[j++]);
      }
      faces[k++] = face;
    }
    
    return [ vertices, faces ];
  }
}

exports.PRDC_JSLAB_LIB_GEOMETRY = PRDC_JSLAB_LIB_GEOMETRY;