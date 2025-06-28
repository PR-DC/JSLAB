/**
 * @file JSLAB library geometry submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
var { PRDC_JSLAB_GEOMETRY_SPACE_SERACH } = require('./geometry-spacesearch');
 
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
   * Creates an instance of PRDC_JSLAB_LIB_OPTIM_SPACE_SERACH.
   */
  spaceSearch(...args) {
    return new PRDC_JSLAB_GEOMETRY_SPACE_SERACH(...args);
  }
    
  /**
   * Finds the nearest points in points2 for each point in points1.
   * @param {Array[]} points1 - Array of points.
   * @param {Array[]} points2 - Reference points.
   * @returns {number[]} Array of indices for nearest points.
   */
  findNearestPoints(points1, points2) {
    var L;
    var id = this.jsl.array.createFilledArray(points1.length, -1);
    for(var i = 0; i < points1.length; i++) {
      var L_min;
      for(var j = 0; j < points2.length; j++) {
        if(points1[0].length == 3) {
          L = Math.sqrt(Math.pow(points1[i][0] - points2[j][0], 2) + 
                        Math.pow(points1[i][1] - points2[j][1], 2) + 
                        Math.pow(points1[i][2] - points2[j][2], 2));
        } else {
          L = Math.sqrt(Math.pow(points1[i][0] - points2[j][0], 2) + 
                        Math.pow(points1[i][1] - points2[j][1], 2));
        }
        if(j == 0 || L < L_min){
          L_min = L;
          id[i] = j;
        }
      }
    }
    return id;
  }
  
  /**
   * Returns the shortest distance from point P to the line defined by (A, i)
   * and the closest point (P1) on that line.
   * @param {number[]} P  - point [Px, Py, Pz]
   * @param {number[]} A  - a point on the line
   * @param {number[]} i  - a unit direction vector of the line
   * @returns {{ d: number, P1: number[] }}
   *   d   - shortest distance
   *   P1  - point on the line with the smallest distance to P
   */
  pointLineDistance(P, A, i) {
    // P1 = A + dot(P - A, i) * i
    const PA = minus(P, A);
    const distAlongI = dot(PA, i);
    const P1 = plus(A, scale(i, distAlongI));

    // Distance = || P - P1 ||
    const d = norm(minus(P, P1));

    return { d, P1 };
  }
  /**
   * Returns the intersection points of a circle (center O, radius r) 
   * in a plane with a line passing through point P with direction i.
   * @param {number[]} P - point on the line
   * @param {number[]} i - direction vector of the line (unit)
   * @param {number[]} O - center of the circle
   * @param {number} r   - circle radius
   * @returns {{ P1: number[]|null, P2: number[]|null, flag: number }}
   *   flag = 0 -> intersection (two points)
   *   flag = 1 -> tangent (one point)
   *   flag = 2 -> no intersection
   */
  lineCircleIntersection(P, i, O, r) {
    let P1 = null;
    let P2 = null;
    let flag = 0;

    // Distance from O to line & the closest point A
    const { d, P1: A } = this.pointLineDistance(O, P, i);

    if(d < r) {
      // Two intersection points
      const h = Math.sqrt(r * r - d * d); // half of the chord length
      P1 = plus(A, scale(i, h));
      P2 = plus(A, scale(i, -h));
      flag = 0; // intersection
    } else if(Math.abs(d - r) <= EPS) {
      // Tangent
      P1 = A;
      flag = 1;
    } else {
      // No intersection
      flag = 2;
    }

    return { P1, P2, flag };
  }
  
  /**
   * Returns the line (point P, direction i) that is the intersection 
   * of two planes, or indicates if they are the same or parallel.
   * @param {number[]} P1 - a point in plane 1
   * @param {number[]} n1 - normal to plane 1
   * @param {number[]} P2 - a point in plane 2
   * @param {number[]} n2 - normal to plane 2
   * @returns {{ P: number[]|null, i: number[]|null, flag: number }}
   *   flag = 0 -> planes intersect
   *   flag = 1 -> planes are the same
   *   flag = 2 -> planes are parallel (no intersection)
   */
  planesIntersection(P1, n1, P2, n2) {
    let P = null;
    let i = null;
    let flag = 0;

    const V = cross3D(n1, n2, 1);

    const V_norm = norm(V);
    if(V_norm > EPS) {
      // planes intersect
      i = scale(V, 1.0 / V_norm); // unit direction

      // Solve for a point on the intersection line:
      // We want to solve the system:
      //   dot(n1, X) = dot(n1, P1)
      //   dot(n2, X) = dot(n2, P2)
      //
      // We'll attempt x=0, y=0, z=0 approach or check sub-determinants.
      const A = [
        [n1[0], n1[1], n1[2]],
        [n2[0], n2[1], n2[2]],
      ];
      const B = [dot(n1, P1), dot(n2, P2)];

      // We try ignoring one coordinate at a time (k=1 to 3):
      let solved = false;
      for(let k = 0; k < 3; k++) {
        // Indices [0,1,2], skip k => j
        const j = [0, 1, 2].filter(idx => idx !== k);

        // Build a 2x2 submatrix from A, using columns j[0], j[1]
        const subA = [
          [A[0][j[0]], A[0][j[1]]],
          [A[1][j[0]], A[1][j[1]]],
        ];
        const detSubA = subA[0][0] * subA[1][1] - subA[0][1] * subA[1][0];

        if(Math.abs(detSubA) > EPS) {
          // We can solve
          // subA * C = B
          // C is 2x1 => we solve by 2x2 inverse
          const invDet = 1.0 / detSubA;
          const C0 = invDet * ( B[0]*subA[1][1] - B[1]*subA[0][1] );
          const C1 = invDet * (-B[0]*subA[1][0] + B[1]*subA[0][0]);

          // Build full solution X
          const X = [0, 0, 0];
          X[j[0]] = C0;
          X[j[1]] = C1;
          P = X;
          solved = true;
          break;
        }
      }
      if(!solved) {
        // fallback: planes might be very close, etc.
        P = [0, 0, 0]; 
      }
    } else {
      // Check if they are the same plane
      // We test if P2 satisfies plane 1 => dot(n1, P1-P2)=0 (within EPS).
      const diff = minus(P1, P2);
      if(Math.abs(dot(n1, diff)) <= EPS) {
        // same plane
        flag = 1;
      } else {
        // parallel planes
        flag = 2;
      }
    }

    return { P, i, flag };
  }

  /**
   * Checks if point P lies on the line segment A-B.
   * Returns 1 if on segment, 0 otherwise.
   * @param {number[]} P 
   * @param {number[]} A 
   * @param {number[]} B 
   * @returns {number} 1 (on segment), 0 (not on segment)
   */
  isPointOnLine(P, A, B) {
    // i = (B - A) / ||B - A||
    const AB = minus(B, A);
    const i = scale(AB, 1.0 / norm(AB));

    // dot(A - P, i) and dot(B - P, i)
    const d1 = dot(minus(A, P), i);
    const d2 = dot(minus(B, P), i);

    // If both dot products have the same sign, P is outside the segment
    if((d1 > 0 && d2 > 0) || (d1 < 0 && d2 < 0)) {
      return 0;
    }
    return 1;
  }

  /**
   * Returns the overlapping segment (if any) between two segments P1-P2 and P3-P4,
   * or indicates no overlap.
   * @param {number[]} P1
   * @param {number[]} P2
   * @param {number[]} P3
   * @param {number[]} P4
   * @returns {{ A: number[]|null, B: number[]|null, flag: number, id1: number|null, id2: number|null }}
   */
  linesOverlap(P1, P2, P3, P4) {
    let A = null;
    let B = null;
    let id1 = null;
    let id2 = null;
    let flag = 0;

    // i = (P2 - P1) / ||P2 - P1||
    const v = minus(P2, P1);
    const len = norm(v);
    const i = scale(v, 1.0 / len);

    const P = [P1, P2, P3, P4];

    const tArr = [];
    tArr.push([0, 1, 1]);
    tArr.push([dot(minus(P2, P1), i), 2, 1]);
    tArr.push([dot(minus(P3, P1), i), 3, 2]);
    tArr.push([dot(minus(P4, P1), i), 4, 2]);

    // Sort rows by the first column
    tArr.sort((a, b) => a[0] - b[0]);

    if(Math.abs(tArr[0][2] - tArr[1][2]) <= EPS) {
      // no overlap
      flag = 1;
    } else {
      id1 = tArr[1][1];
      id2 = tArr[2][1];
      A = P[id1 - 1];
      B = P[id2 - 1];
      flag = 0;
    }

    return { A, B, flag, id1, id2 };
  }

  /**
   * Finds the minimal 3D distance between all pairs of points in two arrays.
   *
   * @param {number[][]} P1i - Array of 3D points (e.g. [[x1, y1, z1], [x2, y2, z2], ...]).
   * @param {number[][]} P2i - Another array of 3D points.
   * @returns {{ L: number, P1: number[], P2: number[] }}
   *   L  - The minimal distance found.
   *   P1 - The point in P1i corresponding to the minimal distance.
   *   P2 - The point in P2i corresponding to the minimal distance.
   */
  minPointsDistance3D(P1i, P2i) {
    var P1ia = P1i.flat();
    var P2ia = P2i.flat();
    
    let L = Infinity;
    let I = -1;
    let J = -1;

    for(let i = 0; i < P1ia.length; i += 3) {
      for(let j = 0; j < P2ia.length; j += 3) {
        const dx = P1ia[i]   - P2ia[j];
        const dy = P1ia[i+1] - P2ia[j+1];
        const dz = P1ia[i+2] - P2ia[j+2];

        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        if (dist < L) {
          L = dist;
          I = i;
          J = j;
        }
      }
    }

    const closestP1 = [P1ia[I], P1ia[I + 1], P1ia[I + 2]];
    const closestP2 = [P2ia[J], P2ia[J + 1], P2ia[J + 2]];

    return {
      L,
      P1: closestP1,
      P2: closestP2
    };
  }
  
  /**
   * Creates a new triangle instance.
   * @param {Array} p1 - First vertex.
   * @param {Array} p2 - Second vertex.
   * @param {Array} p3 - Third vertex.
   * @returns {PRDC_JSLAB_TRIANGLE} Triangle instance.
   */
  triangle(p1, p2, p3) {
    return new PRDC_JSLAB_TRIANGLE(this.jsl, p1, p2, p3);
  }
  
  /**
   * Performs Delaunay triangulation on a set of points.
   * @param {Array[]} points - Array of points.
   * @returns {PRDC_JSLAB_TRIANGLE[]} Array of triangles.
   */
  delaunayTriangulation(points) {
    var min_x = Math.min(...points.map(p => p[0]));
    var min_y = Math.min(...points.map(p => p[1]));
    var max_x = Math.max(...points.map(p => p[0]));
    var max_y = Math.max(...points.map(p => p[1]));

    var dx = max_x - min_x, dy = max_y - min_y;
    var delta_max = Math.max(dx, dy) * 2;
    var p1 = [min_x - delta_max, min_y - delta_max, 0];
    var p2 = [min_x + delta_max * 2, min_y - delta_max, 0];
    var p3 = [min_x + dx / 2, min_y + delta_max * 2, 0];

    var triangles = [this.triangle(p1, p2, p3)];
    
    for(var point of points) {
      var bad_triangles = triangles.filter(tri => tri.circumcircleContains(point));

      var edges = [];
      for(var tri of bad_triangles) {
        edges.push(...tri.edges);
      }

      var unique_edges = edges.filter((edge, index, arr) =>
        arr.filter(e => (e[0] === edge[1] && e[1] === edge[0]) || 
                        (e[0] === edge[0] && e[1] === edge[1])).length === 1
      );

      triangles = triangles.filter(tri => !bad_triangles.includes(tri));

      for(var edge of unique_edges) {
        triangles.push(this.triangle(edge[0], edge[1], point));
      }
    }

    var final_triangles = [];
    for(var tri of triangles){
      if(tri.p1 == p1 || tri.p2 == p1 || tri.p3 == p1) continue;
      if(tri.p1 == p2 || tri.p2 == p2 || tri.p3 == p2) continue;
      if(tri.p1 == p3 || tri.p2 == p3 || tri.p3 == p3) continue;
      final_triangles.push(tri);
    }
    return final_triangles;
  }
  
  /**
   * Generates a rotation matrix to rotate from vector a to vector b.
   * @param {number[]} a - The initial unit vector.
   * @param {number[]} b - The target unit vector.
   * @returns {number[][]} - The resulting rotation matrix.
   */
  getRotationMatrix(a, b) {
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
  createVectors3D(xi, yi, zi, ui, vi, wi, scale = 0.3, angle_factor = 0.4, opts) {
    if(!Array.isArray(xi)) xi = [xi];
    if(!Array.isArray(yi)) yi = [yi];
    if(!Array.isArray(zi)) zi = [zi];
    if(!Array.isArray(ui)) ui = [ui];
    if(!Array.isArray(vi)) vi = [vi];
    if(!Array.isArray(wi)) wi = [wi];
    
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
    };
    
    if(typeof opts == 'object') {
      Object.assign(vectors.line, opts);
      Object.assign(vectors.head, opts);
      if(opts.hasOwnProperty('id')) {
        vectors.line.id = opts.id + '-line';
        vectors.head.id = opts.id + '-head';
      }
    }
    
    var vertex_index = 0;
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
      var R = this.getRotationMatrix(x_axis, dir);

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
      vectors.head.i.push(vertex_index);
      vectors.head.j.push(vertex_index + 1);
      vectors.head.k.push(vertex_index + 2);

      // Update vertex index for the next arrow
      vertex_index += 3;
    }
    return vectors;
  }
  
  /**
   * Creates 3D disks for plotting based on provided parameters.
   * @param {number[]} xi - X coordinates of disk centers.
   * @param {number[]} yi - Y coordinates of disk centers.
   * @param {number[]} zi - Z coordinates of disk centers.
   * @param {number[]} ri - Radii of the disks.
   * @param {number[]} ui - X components of normal vectors (for disk orientation).
   * @param {number[]} vi - Y components of normal vectors (for disk orientation).
   * @param {number[]} wi - Z components of normal vectors (for disk orientation).
   * @param {Object} opts - Additional plotting options.
   * @returns {Object} - An object containing line and area trace data for plotting.
   */
  createDisks3D(xi, yi, zi, ri, ui, vi, wi, opts = {}) {
    if(!Array.isArray(xi)) xi = [xi];
    if(!Array.isArray(yi)) yi = [yi];
    if(!Array.isArray(zi)) zi = [zi];
    if(!Array.isArray(ri)) ri = [ri];
    if(!Array.isArray(ui)) ui = [ui];
    if(!Array.isArray(vi)) vi = [vi];
    if(!Array.isArray(wi)) wi = [wi];
    if(ri.length === 1 && xi.length > 1) ri = new Array(xi.length).fill(ri[0]);
    
    var segments = opts.segments || 32;
    delete opts.segments;
    
    var disks = {
      line: {
        x: [],
        y: [],
        z: [],
        type: 'scatter3d', color: '#00f', mode: 'lines', showLegend: false
      },
      area: {
        x: [],
        y: [],
        z: [],
        i: [],
        j: [],
        k: [],
        type: 'mesh3d', color: '#00f', opacity: 1, flatShading: true, 
        showScale: false, showLegend: false, lighting: {ambient: 1}
      }
    };
    
    if(typeof opts == 'object') {
      Object.assign(disks.line, opts);
      Object.assign(disks.area, opts);
      if(opts.hasOwnProperty('id')) {
        disks.line.id = opts.id + '-line';
        disks.area.id = opts.id + '-area';
      }
    }
    
    var vertex_index = 0;
    var z_axis = [0, 0, 1]; // Assuming disk normal initially aligns with x-axis

    // Create a unit circle in the XY plane for the disk
    var points = [...this.circle(1, segments)];

    for(var i = 0; i < xi.length; i++) {
      var x0 = xi[i];
      var y0 = yi[i];
      var z0 = zi[i];
      var radius = ri[i];
      var normal = [ui[i], vi[i], wi[i]];

      if(radius === 0) continue; // Skip zero-radius disks

      // Normalize the normal vector to ensure it's a unit vector
      var dir = this.jsl.array.normalizeVector(normal);

      // Compute rotation matrix to rotate from x-axis to the normal vector
      var R = this.getRotationMatrix(z_axis, dir);

      // Translation vector is the disk center point
      var translation = [x0, y0, z0];

      var circle = [...points];
      
      // Transform the circle points to the correct position and orientation
      var transformed_points = this.transform(circle, radius, R, translation);

      // Add circle outline to line data for edges
      for(var j = 0; j < transformed_points.length; j++) {
        var point = transformed_points[j];
        disks.line.x.push(point[0]);
        disks.line.y.push(point[1]);
        disks.line.z.push(point[2]);
        if(j === transformed_points.length - 1) {
          disks.line.x.push(transformed_points[0][0], null); // Connect last to first point
          disks.line.y.push(transformed_points[0][1], null);
          disks.line.z.push(transformed_points[0][2], null);
        }
      }
      disks.line.x.push(null);
      disks.line.y.push(null);
      disks.line.z.push(null);
          
      // Add all points for mesh (area) data
      for(var j = 0; j < transformed_points.length; j++) {
        var point = transformed_points[j];
        disks.area.x.push(point[0]);
        disks.area.y.push(point[1]);
        disks.area.z.push(point[2]);
      }

      // Triangulation for mesh
      for(var j = 1; j < transformed_points.length - 1; j++) {
        disks.area.i.push(vertex_index);
        disks.area.j.push(vertex_index + j);
        disks.area.k.push(vertex_index + j + 1);
      }

      vertex_index += transformed_points.length;
    }
    return disks;
  }
  
  /**
   * Creates a rectangular planes in 3D space, oriented by a normal vector [u, v, w].
   * @param {number[]} xi - X coordinates of planes centers.
   * @param {number[]} yi - Y coordinates of planes centers.
   * @param {number[]} zi - Z coordinates of planes centers.
   * @param {number[]} width_i    - Width of the rectangle.
   * @param {number[]} height_i   - Height of the rectangle.
   * @param {number[]} ui        - X component of the plane's normal vector.
   * @param {number[]} vi        - Y component of the plane's normal vector.
   * @param {number[]} wi        - Z component of the plane's normal vector.
   * @param {Object} opts     - Additional plotting options (color, opacity, etc.).
   * @returns {Object}        - An object containing line and area trace data for plotting.
   */
  createPlanes3D(xi, yi, zi, width_i, height_i, ui, vi, wi, opts) {
    if(!Array.isArray(xi)) xi = [xi];
    if(!Array.isArray(yi)) yi = [yi];
    if(!Array.isArray(zi)) zi = [zi];
    if(!Array.isArray(width_i)) width_i = [width_i];
    if(!Array.isArray(height_i)) height_i = [height_i];
    if(!Array.isArray(ui)) ui = [ui];
    if(!Array.isArray(vi)) vi = [vi];
    if(!Array.isArray(wi)) wi = [wi];
    if(width_i.length === 1 && xi.length > 1) width_i = new Array(xi.length).fill(width_i[0]);
    if(height_i.length === 1 && xi.length > 1) height_i = new Array(xi.length).fill(height_i[0]);
    
    const planes = {
      line: {
        x: [],
        y: [],
        z: [],
        type: 'scatter3d',
        color: '#00f',
        mode: 'lines',
        showLegend: false
      },
      area: {
        x: [],
        y: [],
        z: [],
        i: [],
        j: [],
        k: [],
        type: 'mesh3d',
        color: '#00f',
        opacity: 1,
        flatShading: true,
        showScale: false,
        showLegend: false,
        lighting: { ambient: 1 }
      }
    };

    // Merge any provided opts into our line & area objects
    if(typeof opts === 'object') {
      Object.assign(planes.line, opts);
      Object.assign(planes.area, opts);
      if(opts.hasOwnProperty('id')) {
        planes.line.id = opts.id + '-line';
        planes.area.id = opts.id + '-area';
      }
    }

    // Reference axis (z-axis) that our rectangle initially lies in (XY-plane).
    // We will rotate from z-axis to our normal.
    const z_axis = [0, 0, 1];
    
    for(var i = 0; i < ui.length; i++) {
      // Create a symmetrical rectangle in the XY-plane, centered at (0,0,0)
      const rect_coords = this.symRectangle(width_i[i], height_i[i], 0);

      // Convert that flat array into point-triplets:
      var rectangle_points = [];
      for(let i = 0; i < rect_coords.length; i += 3) {
        rectangle_points.push([rect_coords[i], rect_coords[i + 1], rect_coords[i + 2]]);
      }
    
      // Normal vector
      const normal = [ui[i], vi[i], wi[i]];
      
      // Normalize the plane normal
      const dir = this.jsl.array.normalizeVector(normal);

      // Compute rotation matrix to rotate a plane (lying in XY-plane) so its normal aligns with 'dir'
      const R = this.getRotationMatrix(z_axis, dir);
      
      // Rotate these points according to R
      // No scaling or translation is applied here. If you want to shift it to [x0,y0,z0], just add that translation.
      rectangle_points = this.transform(rectangle_points, 1.0, R, [xi[i], yi[i], zi[i]]);

      // Build the line trace: push each consecutive segment plus a null to break the stroke
      for(let j = 0; j < rectangle_points.length; j++) {
        var [x, y, z] = rectangle_points[j];
        planes.line.x.push(x);
        planes.line.y.push(y);
        planes.line.z.push(z);
      }
      // Insert null to break the line
      planes.line.x.push(null);
      planes.line.y.push(null);
      planes.line.z.push(null);

      // Build the mesh: we only need the first 4 unique corners for a rectangle
      // (the 5th is a repeat of the 1st).
      // Triangulate the rectangle as two triangles: (0,1,2) and (0,2,3)
      const n = 4; // We only take indices 0..3
      const base_index = 0;

      for(let j = 0; j < n; j++) {
        planes.area.x.push(rectangle_points[j][0]);
        planes.area.y.push(rectangle_points[j][1]);
        planes.area.z.push(rectangle_points[j][2]);
      }
      // Two triangles to form the quad
      planes.area.i.push(base_index, base_index);
      planes.area.j.push(base_index + 1, base_index + 2);
      planes.area.k.push(base_index + 2, base_index + 3);
    }
    return planes;
  }

  /**
   * Creates a lines in 3D space.
   * @param {number[]} x1i - X1 coordinates of lines.
   * @param {number[]} y1i - Y1 coordinates of lines.
   * @param {number[]} z1i - Z1 coordinates of lines.
   * @param {number[]} x2i - X2 coordinates of lines.
   * @param {number[]} y2i - Y2 coordinates of lines.
   * @param {number[]} z2i - Z2 coordinates of lines.
   * @returns {Object} - lines object.
   */
  createLines3D(x1i, y1i, z1i, x2i, y2i, z2i, opts) {
    if(!Array.isArray(x1i)) x1i = [x1i];
    if(!Array.isArray(y1i)) y1i = [y1i];
    if(!Array.isArray(z1i)) z1i = [z1i];
    if(!Array.isArray(x2i)) x2i = [x2i];
    if(!Array.isArray(y2i)) y2i = [y2i];
    if(!Array.isArray(z2i)) z2i = [z2i];
    
    const lines = {
      x: [],
      y: [],
      z: [],
      type: 'scatter3d',
      color: '#00f',
      mode: 'lines',
      showLegend: false
    };

    // Merge any provided opts into our line & area objects
    if(typeof opts === 'object') {
      Object.assign(lines, opts);
    }
    
    for(var i = 0; i < x1i.length; i++) {
      lines.x.push(x1i[i], x2i[i], null);
      lines.y.push(y1i[i], y2i[i], null);
      lines.z.push(z1i[i], z2i[i], null);
    }
    return lines;
  }

  /**
   * Creates a points in 3D space.
   * @param {number[]} xi - X coordinates of points.
   * @param {number[]} yi - Y coordinates of points.
   * @param {number[]} zi - Z coordinates of points.
   * @returns {Object} - points object.
   */
  createPoints3D(xi, yi, zi, opts) {
    if(!Array.isArray(xi)) xi = [xi];
    if(!Array.isArray(yi)) yi = [yi];
    if(!Array.isArray(zi)) zi = [zi];
    
    const points = {
      x: [],
      y: [],
      z: [],
      type: 'scatter3d',
      color: '#00f',
      mode: 'markers',
      showLegend: false
    };

    // Merge any provided opts into our line & area objects
    if(typeof opts === 'object') {
      Object.assign(points, opts);
    }
    
    for(var i = 0; i < xi.length; i++) {
      points.x.push(xi[i], null);
      points.y.push(yi[i], null);
      points.z.push(zi[i], null);
    }
    return points;
  }

  /**
   * Creates a points in 3D space.
   * @param {number[]} xi - X coordinates of points.
   * @param {number[]} yi - Y coordinates of points.
   * @param {number[]} zi - Z coordinates of points.
   * @returns {Object} - points object.
   */
  createText3D(xi, yi, zi, texti, dxi, dyi, dzi, opts) {
    if(!Array.isArray(xi)) xi = [xi];
    if(!Array.isArray(yi)) yi = [yi];
    if(!Array.isArray(zi)) zi = [zi];
    if(!Array.isArray(texti)) texti = [texti];
    if(!Array.isArray(dxi)) dxi = [dxi];
    if(!Array.isArray(dyi)) dyi = [dyi];
    if(!Array.isArray(dzi)) dzi = [dzi];
    if(dxi.length === 1 && xi.length > 1) dxi = new Array(xi.length).fill(dxi[0]);
    if(dyi.length === 1 && yi.length > 1) dyi = new Array(yi.length).fill(dyi[0]);
    if(dzi.length === 1 && zi.length > 1) dzi = new Array(zi.length).fill(dzi[0]);
    
    const texts = {
      x: [],
      y: [],
      z: [],
      text: [],
      type: 'scatter3d',
      textposition: 'center middle',
      textfont: {
        size: 18,
        color: '#f00'
      },
      mode: 'text',
      showLegend: false
    };

    // Merge any provided opts into our line & area objects
    if(typeof opts === 'object') {
      Object.assign(texts, opts);
    }
    
    for(var i = 0; i < xi.length; i++) {
      texts.x.push(plus(xi[i], dxi[i]));
      texts.y.push(plus(yi[i], dyi[i]));
      texts.z.push(plus(zi[i], dzi[i]));
      texts.text.push(texti[i]);
    }
    return texts;
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
   * Helper method to generate points for a circle in the XY plane.
   * @param {number} radius - Radius of the circle.
   * @param {number} segments - Number of segments for the circle.
   * @returns {number[][]} - Array of points forming the circle.
   */
  circle(radius, segments) {
    var points = [];
    for(var i = 0; i < segments; i++) {
      var angle = 2 * Math.PI * i / segments;
      points.push([radius * Math.cos(angle), radius * Math.sin(angle), 0]);
    }
    return points;
  }

  /**
   * Helper method to generate points for a disk in the XY plane.
   * @param {number} radius - Radius of the disk.
   * @param {number} segments_a - Number of angular segments for the disk.
   * @param {number} segments_r - Number of radial segments for the disk.
   * @returns {number[][]} - Array of points forming the disk.
   */
  disk(radius, segments_a, segments_r) {
    var points = [];
    points.push([0, 0, 0]);
    for(var j = 1; j <= segments_r; j++) {
      var r = radius * j / segments_r;
      for(var i = 1; i <= segments_a; i++) {
        var angle = 2 * Math.PI * i / segments_a;
        points.push([r * Math.cos(angle), r * Math.sin(angle), 0]);
      }
    }
    return points;
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

/**
 * Class for JSLAB triangle.
 */
class PRDC_JSLAB_TRIANGLE {
  
  #jsl;
  
  /**
   * Creates a new triangle instance.
   * @constructor
   * @param {Object} jsl - Reference to the main JSLAB object.
   * @param {Array} p1 - First vertex.
   * @param {Array} p2 - Second vertex.
   * @param {Array} p3 - Third vertex.
   */
  constructor(jsl, v1, v2, v3) {
    this.#jsl = jsl;
    this._set(v1, v2, v3);
  }
  
  /**
   * Sets the triangle vertices and edges.
   * @param {Array} v1 - First vertex.
   * @param {Array} v2 - Second vertex.
   * @param {Array} v3 - Third vertex.
   */
  _set(v1, v2, v3) {
    if(Array.isArray(v1[0])) {
      v3 = v1[2];
      v2 = v1[1];
      v1 = v1[0];
    }
    
    this.v1 = v1 || [];
    this.v2 = v2 || [];
    this.v3 = v3 || [];
    this.edges = [
      [v1, v2], [v2, v3], [v3, v1]
    ];
  }
  
  /**
   * Checks if the triangle's circumcircle contains a point.
   * @param {Array} point - The point to test.
   * @returns {boolean} True if inside the circumcircle.
   */
  circumcircleContains(point) {
    var ax = this.v1[0], ay = this.v1[1];
    var bx = this.v2[0], by = this.v2[1];
    var cx = this.v3[0], cy = this.v3[1];
    var dx = point[0], dy = point[1];

    var ax_ = ax - dx, ay_ = ay - dy;
    var bx_ = bx - dx, by_ = by - dy;
    var cx_ = cx - dx, cy_ = cy - dy;

    var det = (ax_ * ax_ + ay_ * ay_) * (bx_ * cy_ - cx_ * by_) -
              (bx_ * bx_ + by_ * by_) * (ax_ * cy_ - cx_ * ay_) +
              (cx_ * cx_ + cy_ * cy_) * (ax_ * by_ - bx_ * ay_);

    return det > 0;
  }
  
  /**
   * Determines if a point is inside the triangle.
   * @param {Array} point - The point to check.
   * @returns {boolean} True if the point is inside.
   */
  contains(point) {
    var sign = (v1, v2, v3) =>
      (v1[0] - v3[0]) * (v2[1] - v3[1]) - (v2[0] - v3[0]) * (v1[1] - v3[1]);

    var d1 = sign(point, this.v1, this.v2);
    var d2 = sign(point, this.v2, this.v3);
    var d3 = sign(point, this.v3, this.v1);

    return (d1 >= 0 && d2 >= 0 && d3 >= 0) 
      || (d1 <= 0 && d2 <= 0 && d3 <= 0);
  }
  
  /**
   * Computes the interpolated value at a point using barycentric coordinates.
   * @param {Array} point - The query point.
   * @returns {number} Interpolated value.
   */
  valueAt(point) {
    const denom = ((this.v2[1] - this.v3[1]) * (this.v1[0] - this.v3[0]) +
                   (this.v3[0] - this.v2[0]) * (this.v1[1] - this.v3[1]));
    
    // Compute barycentric coordinates
    const alpha = ((this.v2[1] - this.v3[1]) * (point[0] - this.v3[0]) +
                   (this.v3[0] - this.v2[0]) * (point[1] - this.v3[1])) / denom;
    const beta = ((this.v3[1] - this.v1[1]) * (point[0] - this.v3[0]) +
                  (this.v1[0] - this.v3[0]) * (point[1] - this.v3[1])) / denom;
    const gamma = 1 - alpha - beta;
    
    return alpha * this.v1[2] + beta * this.v2[2] + gamma * this.v3[2];
  }
}