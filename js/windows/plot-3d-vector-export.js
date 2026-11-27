/**
 * @file Vector export for the pinned Plotly 3D renderer
 * @author PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Replaces Plotly's 3D snapshot with projected SVG geometry.
 */
class PRDC_JSLAB_PLOT_3D_VECTOR_EXPORT {
  /**
   * Projects one Plotly scene into its SVG snapshot viewport.
   * @param {Document} document Document containing Plotly's SVG export.
   * @param {Object} scene Live Plotly 3D scene.
   * @param {Object} bounds Scene position and size in export coordinates.
   * @param {Array} traces Visible full traces and their export data.
   * @param {boolean} transformed Whether the export data includes world transforms.
   */
  constructor(document, scene, bounds, traces, transformed) {
    this.document = document;
    this.scene = scene;
    this.axes = scene.glplot.axes;
    this.camera = scene.glplot.cameraParams;
    this.width = bounds.width;
    this.height = bounds.height;
    this.viewport = this._node('svg', {
      x: bounds.x, y: bounds.y,
      width: this.width, height: this.height, overflow: 'hidden',
      'data-jslab-vector-3d': ''
    });
    this.primitives = [];
    this.definitions = this._node('defs', {}, this.viewport);
    this.face_gradients = new Map();
    this.translucent_gradients = new Set();
    this.surface_scales = new WeakMap();
    this.mesh_texels = new WeakMap();
    this.gradient_prefix = 'jslab-vector-' + scene.id + '-';
    this.color_context = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas').getContext('2d');
    this._axes();
    traces.forEach(([trace, world]) => {
      var rendered = scene.traces[trace.uid];
      if(!rendered) {
        throw new Error('Vector export could not find the Plotly 3D trace.');
      }
      if(rendered.mesh) {
        this._mesh(this._withTextureColors(trace), rendered.mesh, transformed && world);
      } else if(rendered.surface) {
        this._surface(this._withTextureColors(trace), rendered.surface);
      } else if(trace.type == 'scatter3d') {
        this._scatter(trace, rendered);
      } else {
        throw new Error('Unsupported Plotly 3D trace: ' + trace.type);
      }
    });
    var geometry = this._node('g', { 'data-jslab-geometry': '' }, this.viewport);
    var layer = geometry;
    var opaque_clipped_layers = [];
    var active_clip;
    var group_opacity;
    var group_mask;
    var group_stroke_width;
    // Wall markers are on the rear planes. Their overlapping colors follow draw order.
    var wall_markers = [], scene_geometry = [];
    for(const item of this.primitives) {
      (item.attrs['data-jslab-scatter-projection'] == null ? scene_geometry : wall_markers).push(item);
    }
    var visible = this._visibilityOrder(scene_geometry);
    var used_face_clips = new Set();
    for(const item of this._mergeContourPaths(this._mergeSolidFaces([...wall_markers, ...visible]))) {
      if(item.mesh_clip !== active_clip || item.group_opacity !== group_opacity || item.group_mask !== group_mask) {
        active_clip = item.mesh_clip;
        if(active_clip) {
          used_face_clips.add(active_clip);
        }
        group_opacity = item.group_opacity;
        group_mask = item.group_mask;
        group_stroke_width = active_clip ? item.attrs['stroke-width'] : null;
        layer = active_clip || group_opacity != null || group_mask
          ? this._node('g', { 'clip-path': active_clip, opacity: group_opacity, mask: group_mask,
            'stroke-width': group_stroke_width }, geometry) : geometry;
        if(active_clip && group_opacity == null && !group_mask && item.seam_underlay) {
          opaque_clipped_layers.push(layer);
        }
      }
      if(item.attrs['clip-path']) {
        used_face_clips.add(item.attrs['clip-path']);
      }
      var attrs = item.attrs;
      if(active_clip) {
        attrs = { ...attrs };
        // The shared clip antialiases the silhouette. Antialiasing each opaque path again exposes seams.
        if(item.tag === 'path' && group_opacity == null && !group_mask && !item.transparent_pass) {
          attrs['shape-rendering'] = 'crispEdges';
        }
        if(attrs.opacity === 1) {
          delete attrs.opacity;
        }
        if(group_stroke_width != null && attrs.stroke) {
          var width = attrs['stroke-width'] ?? 1;
          attrs['stroke-width'] = width === group_stroke_width ? null : width;
        }
        var rgb = attrs.fill === attrs.stroke && /^rgb\((\d+),(\d+),(\d+)\)$/.exec(attrs.fill);
        if(rgb && rgb.slice(1).every(value => Number(value) <= 255)) {
          attrs.fill = attrs.stroke = '#' + rgb.slice(1).map(value => Number(value).toString(16).padStart(2, '0')).join('');
        }
      }
      this._node(item.tag, attrs, layer, item.text);
    }
    for(const [i, clipped] of opaque_clipped_layers.entries()) {
      clipped.id = this.gradient_prefix + 'opaque-layer-' + i;
      var underlay = this._node('use', { href: '#' + clipped.id, transform: 'translate(-.05 -.05)',
        'clip-path': clipped.getAttribute('clip-path'), 'data-jslab-seam-underlay': '' });
      geometry.insertBefore(underlay, clipped);
    }
    // A shared silhouette can replace the clips created for individual lighting facets.
    for(const clip of this.definitions.querySelectorAll('clipPath')) {
      if((clip.id.startsWith(this.gradient_prefix + 'mesh-') || clip.id.startsWith(this.gradient_prefix + 'face-') ||
          clip.id.startsWith(this.gradient_prefix + 'vertex-face-')) &&
          !used_face_clips.has('url(#' + clip.id + ')')) {
        clip.remove();
      }
    }
  }

  /**
   * Resolves the scale Plotly uses when preparing mesh and surface textures.
   * @param {Object} trace Plotly trace options.
   * @returns {Object} Trace options with resolved color-axis settings.
   */
  _withTextureColors(trace) {
    var axis = this.scene.fullLayout[trace.coloraxis];
    if(axis) {
      trace = { ...trace, colorscale: axis.colorscale, cmin: axis.cmin, cmax: axis.cmax,
        reversescale: axis.reversescale };
    }
    if(trace.reversescale && Array.isArray(trace.colorscale)) {
      trace = { ...trace, colorscale: trace.colorscale.slice().reverse().map(([offset, color]) => [1 - offset, color]) };
    }
    return trace;
  }

  /**
   * Creates an SVG element and optionally appends it to a parent.
   * @param {string} tag SVG element name.
   * @param {Object} attrs SVG attributes.
   * @param {Element} [parent] Parent SVG element.
   * @param {*} [text] Text content.
   * @returns {Element} Created SVG element.
   */
  _node(tag, attrs, parent, text) {
    var element = this.document.createElementNS('http://www.w3.org/2000/svg', tag);
    for(const [name, value] of Object.entries(attrs)) {
      if(value != null) {
        element.setAttribute(name, value);
      }
    }
    if(text != null) {
      element.textContent = String(text).replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]*>/g, '');
    }
    parent?.appendChild(element);
    return element;
  }

  /**
   * Multiplies a four-component vector by a column-major matrix.
   * @param {Array|TypedArray} matrix Transformation matrix.
   * @param {Array|TypedArray} vector Input vector.
   * @returns {Array} Transformed vector.
   */
  _multiply(matrix, vector) {
    return [0, 1, 2, 3].map(i => matrix[i] * vector[0] + matrix[i + 4] * vector[1] +
      matrix[i + 8] * vector[2] + matrix[i + 12] * vector[3]);
  }

  /**
   * Projects a data-space point into the SVG viewport.
   * @param {Array} point Data-space point.
   * @param {Array} [offset] Optional world-space offset.
   * @param {Array|TypedArray} [projection_model] Model matrix.
   * @returns {Array|null} Projected point or null when it is not projectable.
   */
  _project(point, offset, projection_model = this.camera.model) {
    return this._projectClip(this._clipCoordinates(point, offset, projection_model));
  }

  /**
   * Converts homogeneous clip coordinates into SVG viewport coordinates.
   * @param {Array} clip Homogeneous clip coordinates.
   * @returns {Array|null} Projected point with depth and reciprocal depth.
   */
  _projectClip(clip) {
    if(!clip || !(clip[3] > 0) || clip.some(value => !Number.isFinite(value))) {
      return null;
    }
    var aspect = this.scene.glplot.canvas.width / this.scene.glplot.canvas.height;
    var ratio = this.width / this.height;
    var scale_x = this.camera._ortho ? 1 : aspect / ratio;
    return [this.width * (1 + scale_x * clip[0] / clip[3]) / 2,
      this.height * (1 - clip[1] / clip[3]) / 2, clip[2] / clip[3], 1 / clip[3]];
  }

  /**
   * Transforms a data-space point into homogeneous clip coordinates.
   * @param {Array} point Data-space point.
   * @param {Array} [offset] Optional world-space offset.
   * @param {Array|TypedArray} [model] Model matrix.
   * @returns {Array|null} Homogeneous clip coordinates.
   */
  _clipCoordinates(point, offset, model = this.camera?.model) {
    if(!point || [0, 1, 2].some(i => !Number.isFinite(point[i]))) {
      return null;
    }
    var { view, projection } = this.camera;
    var world = this._multiply(model, [point[0], point[1], point[2], 1]);
    if(offset) {
      offset.forEach((value, i) => world[i] += value);
    }
    return this._multiply(projection, this._multiply(view, world));
  }

  /**
   * Formats a projected point for an SVG coordinate attribute.
   * @param {Array} point Projected point.
   * @returns {string} Rounded SVG coordinate pair.
   */
  _xy(point) {
    return point[0].toFixed(3) + ',' + point[1].toFixed(3);
  }

  /**
   * Adds a projected drawing primitive to the scene.
   * @param {string} tag SVG element name.
   * @param {Array} points Projected points.
   * @param {Object} attrs SVG attributes.
   * @param {*} [text] Text content.
   */
  _add(tag, points, attrs, text) {
    this.primitives.push({ tag, attrs, text, points,
      depth: points.reduce((sum, point) => sum + point[2], 0) / points.length });
  }

  /**
   * Orders intersecting faces by splitting them on triangle planes.
   * The projected depth coordinate is scaled to the viewport for plane tests.
   * @param {Array} [faces] Drawing primitives.
   * @returns {Array} Back-to-front drawing operations.
   */
  _visibilityOrder(faces = this.primitives) {
    if(faces.length && faces.every(face => face.transparent_pass)) {
      return faces;
    }
    if(faces.every(face => face.tag == 'polygon' && face.points.length == 3 ||
        face.tag == 'path' && face.points.length == 2 &&
        (face.attrs['data-jslab-scatter-line'] != null || face.attrs['data-jslab-error-bar'] != null ||
          face.attrs['data-jslab-surface-contour'] != null) ||
        face.occlusion_glyph)) {
      var opaque = faces.filter(face => face.tag == 'polygon' && !face.transparent_pass);
      var opaque_paths = faces.filter(face => face.tag == 'path' && !face.transparent_pass);
      var transparent = faces.filter(face => face.transparent_pass);
      var crossing_strokes = opaque_paths.length > 1 && opaque_paths.some(face => !face.occlusion_glyph);
      if(opaque.length || crossing_strokes || transparent.length && opaque_paths.length) {
        var clip_overlays = crossing_strokes || opaque.length && opaque_paths.length;
        var draw_order = clip_overlays ? new Map(faces.map((face, i) => [face, i])) : null;
        var overlays = this._depthOrder(opaque_paths).flatMap(face => {
          var pieces = face.occlusion_glyph ? [face] : this._lineFace(face);
          if(draw_order) {
            pieces.forEach(piece => {
              draw_order.set(piece, draw_order.get(face));
              if(piece !== face) { piece.source_line = face; }
            });
          }
          return pieces;
        });
        var path_depth = crossing_strokes || transparent.length ? overlays.flatMap(face =>
          this._pathOccluders(face).map(triangle => ({ ...triangle, owner: face }))) : [];
        var overlay_occluders = crossing_strokes ? [...opaque, ...path_depth] : opaque;
        var visible_paths = clip_overlays && overlays.length
          ? this._visibleTransparentFaces(overlays, overlay_occluders, false, draw_order) : opaque_paths;
        if(!visible_paths && crossing_strokes) {
          visible_paths = opaque.length ? this._visibleTransparentFaces(overlays, opaque, false, draw_order) : opaque_paths;
        }
        var translucent = transparent.flatMap(face =>
          face.tag == 'path' && !face.occlusion_glyph ? this._lineFace(face) : [face]);
        var occluders = translucent.length ? [...opaque, ...path_depth] : opaque;
        var visible = translucent.length ? this._visibleTransparentFaces(translucent, occluders) : [];
        if(visible_paths && visible) {
          return [...this._opaqueDepthOrder(opaque), ...visible_paths, ...visible];
        }
      }
    }
    return this._depthOrder(faces);
  }

  /**
   * Recovers the projected polygons that an opaque scatter path writes to depth.
   * @param {Object} face Projected scatter path.
   * @returns {Array} Triangles representing the path's depth coverage.
   */
  _pathOccluders(face) {
    var triangles = points => {
      var pieces = [];
      for(let i = 1; i < points.length - 1; i++) {
        pieces.push({ points: [points[0], points[i], points[i + 1]] });
      }
      return pieces;
    };
    if(!face.occlusion_glyph) {
      return triangles(face.points);
    }
    return face.attrs.d.split('M').filter(Boolean).flatMap(path => {
      var points = path.replace(/Z$/, '').split('L').map(point => [...point.split(',').map(Number), face.depth]);
      if(points.length == 2) {
        return this._lineFace({ ...face, points }).flatMap(line => triangles(line.points));
      }
      return triangles(points);
    });
  }

  /**
   * Orders opaque faces and removes geometry hidden by nearer faces.
   * @param {Array} faces Opaque projected faces.
   * @returns {Array} Visible faces in back-to-front order.
   */
  _opaqueDepthOrder(faces) {
    if(faces.length > 256) {
      var visible = this._visibleTransparentFaces(faces, faces, true);
      if(visible) {
        return visible;
      }
    }
    return this._depthOrder(faces);
  }

  /**
   * Gives a screen-space line width a projected depth so faces can hide it.
   * @param {Object} line Projected line primitive.
   * @returns {Array} A quadrilateral drawing operation.
   */
  _lineFace(line) {
    var [a, b] = line.points;
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var length = Math.hypot(dx, dy);
    var half = Number(line.attrs['stroke-width'] ?? 1) / 2;
    if(!length || !(half > 0)) {
      return [];
    }
    var offset = [-dy * half / length, dx * half / length];
    var point = (end, sign) => [end[0] + sign * offset[0], end[1] + sign * offset[1], end[2]];
    return [{ ...line, points: [point(a, 1), point(b, 1), point(b, -1), point(a, -1)],
      attrs: { ...line.attrs, fill: line.attrs.stroke, stroke: null, 'stroke-width': null } }];
  }

  /**
   * Joins adjacent opaque paint operations so shared edges rasterize once.
   * Face order has already been resolved at this point.
   * @param {Array} faces Ordered drawing operations.
   * @returns {Array} Drawing operations with compatible faces merged.
   */
  _mergeSolidFaces(faces) {
    var merged = [];
    var run = [];
    var flush = () => {
      if(run.length < 2) {
        merged.push(...run);
      } else {
        var first = run[0];
        var outline = first.surface_fill && run.every(face => face.tag === 'polygon' && face.points.length === 3);
        var d = outline ? this._meshOutline(run) : run.flatMap(face => face.solid_parts ||
          [face.attrs.points.split(' ').map(point => point.split(',').map(Number))]).map(coordinates => {
          var rounded = coordinates.map(([x, y]) => [Number(x.toFixed(3)), Number(y.toFixed(3))]);
          var area = rounded.reduce((sum, [x, y], i) => {
            var [next_x, next_y] = rounded[(i + 1) % rounded.length];
            return sum + x * next_y - y * next_x;
          }, 0);
          if(Math.abs(area) <= .000001) {
            return '';
          }
          var points = rounded.map(point => this._xy(point));
          return 'M' + (area < 0 ? points.reverse() : points).join('L') + 'Z';
        }).join('');
        if(!d) {
          run = [];
          return;
        }
        // Retain the overlap stroke where the shared silhouette clips the merged paint.
        var keep_stroke = first.mesh_clip && !first.surface_fill;
        merged.push({ ...first, tag: 'path', mesh_clip: outline ? null : first.mesh_clip,
          attrs: { ...first.attrs, d,
          points: null, stroke: keep_stroke ? first.attrs.stroke : null,
          'stroke-width': keep_stroke ? first.attrs['stroke-width'] : null, 'data-jslab-solid-faces': '' } });
      }
      run = [];
    };
    for(const face of faces) {
      var fill = face.attrs.fill;
      var shared_opacity = face.mesh_clip && face.group_opacity != null;
      if(face.tag != 'polygon' && !face.solid_parts ||
          !face.surface_fill && !shared_opacity && (face.transparent_pass || face.attrs.opacity !== 1) ||
          face.attrs['clip-path'] || typeof fill != 'string') {
        flush();
        merged.push(face);
        continue;
      }
      if(run.length && (fill !== run[0].attrs.fill || face.mesh_clip !== run[0].mesh_clip ||
          face.surface_fill !== run[0].surface_fill || face.attrs.opacity !== run[0].attrs.opacity ||
          face.group_opacity !== run[0].group_opacity || face.group_mask !== run[0].group_mask ||
          face.mesh_clip && !face.surface_fill && (face.attrs.stroke !== run[0].attrs.stroke ||
            face.attrs['stroke-width'] !== run[0].attrs['stroke-width']))) {
        flush();
      }
      run.push(face);
    }
    flush();
    return merged;
  }

  /**
   * Combines consecutive fixed-color contour segments into one SVG stroke.
   * @param {Array} faces Ordered drawing operations.
   * @returns {Array} Drawing operations with compatible contours merged.
   */
  _mergeContourPaths(faces) {
    var merged = [];
    for(const face of faces) {
      var previous = merged.at(-1);
      var attrs = face.attrs;
      if(face.tag === 'path' && face.contour_surface && attrs.stroke &&
          !attrs.stroke.startsWith('url(') && previous?.tag === 'path' &&
          previous.contour_surface === face.contour_surface &&
          previous.transparent_pass === face.transparent_pass &&
          previous.attrs.stroke === attrs.stroke && previous.attrs.opacity === attrs.opacity &&
          previous.attrs['stroke-width'] === attrs['stroke-width']) {
        previous.attrs.d += attrs.d;
      } else {
        merged.push(face.tag === 'path' && face.contour_surface
          ? { ...face, attrs: { ...attrs } } : face);
      }
    }
    return merged;
  }

  /**
   * Sorts projected faces from back to front and splits intersecting triangles.
   * @param {Array} faces Projected drawing primitives.
   * @returns {Array} Back-to-front drawing operations.
   */
  _depthOrder(faces) {
    if(faces.length > 256 || faces.some(face => face.tag != 'polygon' || face.points.length != 3)) {
      return faces.sort((a, b) => b.depth - a.depth);
    }
    var draw_order = new Map(faces.map((face, index) => [face, index]));
    var sorted = faces.slice().sort((a, b) => b.depth - a.depth);
    var z_scale = Math.max(this.width, this.height) * 100;
    var parts = sorted.map(face => ({ face, points: face.points.map(([x,y,z]) => [x,y,z*z_scale]) }));
    var budget = 8192;
    var order = (polygons, level) => {
      if(!polygons.length) {
        return [];
      }
      if(level == 128 || (budget -= polygons.length) < 0) {
        throw new RangeError('Vector face splitting budget exceeded.');
      }
      var pivot = polygons[Math.floor(polygons.length / 2)];
      var [origin, b, c] = pivot.face.points.map(([x,y,z]) => [x,y,z*z_scale]);
      var [ux, uy, uz] = b.map((value, i) => value - origin[i]);
      var [vx, vy, vz] = c.map((value, i) => value - origin[i]);
      var normal = [uy*vz - uz*vy, uz*vx - ux*vz, ux*vy - uy*vx];
      var length = Math.hypot(...normal);
      if(length < .000001) {
        return order(polygons.filter(item => item !== pivot), level + 1);
      }
      normal = normal.map(value => value / length);
      var positive = [], negative = [], coplanar = [];
      for(const polygon of polygons) {
        var points = polygon.points;
        var distances = points.map(point => normal.reduce((sum, value, i) =>
          sum + value * (point[i] - origin[i]), 0));
        var signs = distances.map(value => Math.abs(value) < .000001 ? 0 : Math.sign(value));
        var has_positive = signs.includes(1);
        var has_negative = signs.includes(-1);
        if(!has_positive || !has_negative) {
          (has_positive ? positive : has_negative ? negative : coplanar).push(polygon);
          continue;
        }
        var sides = [[], []];
        points.forEach((point, i) => {
          var j = (i + 1) % points.length;
          if(signs[i] >= 0) { sides[0].push(point); }
          if(signs[i] <= 0) { sides[1].push(point); }
          if(signs[i] * signs[j] < 0) {
            var ratio = distances[i] / (distances[i] - distances[j]);
            var crossing = point.map((value, k) => value + ratio * (points[j][k] - value));
            sides[0].push(crossing);
            sides[1].push(crossing);
          }
        });
        positive.push({ face: polygon.face, points: sides[0] });
        negative.push({ face: polygon.face, points: sides[1] });
      }
      var [far, near] = normal[2] >= 0 ? [positive, negative] : [negative, positive];
      coplanar.sort((a, b) => draw_order.get(a.face) - draw_order.get(b.face));
      return [...order(far, level + 1), ...coplanar, ...order(near, level + 1)];
    };
    try {
      return order(parts, 0).map(({face, points}) => ({ ...face, attrs: {
        ...face.attrs, points: points.map(point => this._xy(point)).join(' ')
      } }));
    } catch(error) {
      if(!(error instanceof RangeError)) {
        throw error;
      }
      // An unbalanced plane tree can spend its budget on triangles with disjoint screen bounds.
      return faces.every(face => !face.transparent_pass) && this._visibleTransparentFaces(faces, faces, true) || sorted;
    }
  }

  /**
   * Clips transparent faces against the opaque depth buffer's projected faces.
   * Visible pieces retain submission order so transparency composes as in Plotly.
   * @param {Array} transparent Faces to clip.
   * @param {Array} opaque Opaque occluding faces.
   * @param {boolean} [self_depth=false] Whether faces also occlude one another.
   * @param {Map} [draw_order] Submission order for opaque overlays at tied depths.
   * @returns {Array|null} Visible drawing operations or null at the work limit.
   */
  _visibleTransparentFaces(transparent, opaque, self_depth = false, draw_order) {
    var bounds = points => {
      var x = points.map(point => point[0]), y = points.map(point => point[1]);
      return [Math.min(...x), Math.min(...y), Math.max(...x), Math.max(...y)];
    };
    var overlaps = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    var occluders = opaque.flatMap((face, order) => {
      var [a, b, c] = face.points;
      var [ux, uy, uz] = b.map((value, i) => value - a[i]);
      var [vx, vy, vz] = c.map((value, i) => value - a[i]);
      var determinant = ux * vy - uy * vx;
      if(Math.abs(determinant) < .000001) {
        return [];
      }
      var sign = Math.sign(determinant);
      var dx = (uz * vy - uy * vz) / determinant, dy = (ux * vz - uz * vx) / determinant;
      var nearest = Math.min(a[2], b[2], c[2]);
      var edges = face.points.map((p, i) => {
        var q = face.points[(i + 1) % 3];
        return point => sign * ((q[0] - p[0]) * (point[1] - p[1]) - (q[1] - p[1]) * (point[0] - p[0]));
      });
      return [{ face, order, bounds: bounds(face.points), nearest, edges,
        depth: p => p[2] - a[2] - dx * (p[0] - a[0]) - dy * (p[1] - a[1]) }];
    });
    var index = this._occluderIndex(occluders);
    var part_edges = new WeakMap();
    var separated = (part, triangle) => {
      var edges = part_edges.get(part);
      if(!edges) {
        var area = part.reduce((sum, [x, y], i) => {
          var [next_x, next_y] = part[(i + 1) % part.length];
          return sum + x * next_y - y * next_x;
        }, 0);
        var sign = Math.sign(area);
        edges = part.flatMap(([x, y], i) => {
          var [next_x, next_y] = part[(i + 1) % part.length];
          var dx = next_x - x, dy = next_y - y;
          return sign && (dx || dy) ? [point => sign * (dx * (point[1] - y) - dy * (point[0] - x))] : [];
        });
        part_edges.set(part, edges);
      }
      return edges.some(edge => triangle.every(point => edge(point) <= 0));
    };
    var visible = [];
    var budget = self_depth ? 300000 : 65536;
    for(let order = 0; order < transparent.length; order++) {
      var face = transparent[order];
      var parts = [face.points];
      var extent = bounds(face.points);
      var farthest = Math.max(...face.points.map(point => point[2]));
      var candidates = [];
      var search = node => {
        if(!node || !overlaps(extent, node.bounds)) {
          return;
        }
        if(node.faces) {
          node.faces.forEach(occluder => {
            // Interpolation cannot put either face outside its vertex depth range.
            if(farthest >= occluder.nearest - .00000001 && overlaps(extent, occluder.bounds)) {
              candidates.push(occluder);
            }
          });
        } else {
          search(node.left);
          search(node.right);
        }
      };
      search(index);
      for(const occluder of candidates) {
        if(!parts.length) {
          break;
        }
        if(self_depth && occluder.face === face || occluder.face.owner === face ||
            draw_order && face.occlusion_glyph && occluder.face.owner?.occlusion_glyph) {
          continue;
        }
        // Preserve the draw order of coplanar opaque faces without shifting the intersection of crossing faces.
        var drawn_earlier = self_depth ? occluder.order < order :
          draw_order?.get(occluder.face.owner || occluder.face) < draw_order?.get(face);
        var depth_tie = !self_depth || face.points.every(point => Math.abs(occluder.depth(point)) <= .000000000001);
        var bias = depth_tie ? (drawn_earlier ? -.00000001 : .00000001) : 0;
        var depth = p => occluder.depth(p) + bias;
        var planes = [...occluder.edges, depth];
        var next = [];
        for(const part of parts) {
          // A shared edge covers no area, even when the bounding boxes coincide.
          if(!overlaps(bounds(part), occluder.bounds) ||
              occluder.edges.some(edge => part.every(point => edge(point) <= 0)) ||
              part.every(point => depth(point) < 0) || separated(part, occluder.face.points)) {
            next.push(part);
            continue;
          }
          // A fully covered piece needs no splitting and does not consume the splitting budget.
          if(planes.every(plane => part.every(point => plane(point) >= 0))) {
            continue;
          }
          if(--budget < 0) {
            return null;
          }
          var outside = [], inside = part;
          for(const plane of planes) {
            var [inner, outer] = this._splitFace(inside, plane);
            if(outer.length >= 3) {
              outside.push(outer);
            }
            if(inner.length < 3) {
              inside = [];
              break;
            }
            inside = inner;
          }
          next.push(...(inside.length ? outside : [part]));
        }
        parts = next;
      }
      if(parts.length) {
        if((face.occlusion_glyph || self_depth || face.source_line || face.group_opacity != null) &&
            parts.length == 1 && parts[0] === face.points) {
          visible.push(face.source_line || face);
          continue;
        }
        var path = parts.map(points => 'M' + points.map(point => this._xy(point)).join('L') + 'Z');
        if(face.occlusion_glyph) {
          var id = this.gradient_prefix + 'glyph-face-' + this.definitions.childElementCount;
          var clip = this._node('clipPath', { id }, this.definitions);
          this._node('path', { d: path.join('') }, clip);
          visible.push({ ...face, attrs: { ...face.attrs, 'clip-path': 'url(#' + id + ')' } });
        } else {
          var attrs = { ...face.attrs, points: null, d: path.join('') };
          if(self_depth || face.group_opacity != null) {
            attrs.stroke = null;
            attrs['stroke-width'] = null;
          }
          // Translucent cells share paint only when they do not overlap.
          visible.push({ ...face, tag: 'path', attrs, solid_parts: self_depth || face.surface_fill ? parts : null });
        }
      }
    }
    // Clipped opaque pieces should no longer overlap. Keep their depth order for the fractional
    // boundary coverage that remains after numeric clipping.
    return self_depth ? visible.sort((a, b) => b.depth - a.depth) : visible;
  }

  /**
   * Builds a screen-space hierarchy for finding possible opaque occluders.
   * @param {Array} faces Projected opaque face bounds and plane equations.
   * @returns {Object|null} Bounding box tree.
   */
  _occluderIndex(faces) {
    if(!faces.length) {
      return null;
    }
    var box = [Infinity, Infinity, -Infinity, -Infinity];
    for(const face of faces) {
      box[0] = Math.min(box[0], face.bounds[0]);
      box[1] = Math.min(box[1], face.bounds[1]);
      box[2] = Math.max(box[2], face.bounds[2]);
      box[3] = Math.max(box[3], face.bounds[3]);
    }
    if(faces.length <= 8) {
      return { bounds: box, faces };
    }
    var axis = box[2] - box[0] >= box[3] - box[1] ? 0 : 1;
    faces.sort((a, b) => a.bounds[axis] + a.bounds[axis + 2] - b.bounds[axis] - b.bounds[axis + 2]);
    var middle = Math.floor(faces.length / 2);
    return { bounds: box, left: this._occluderIndex(faces.slice(0, middle)),
      right: this._occluderIndex(faces.slice(middle)) };
  }

  /**
   * Splits a polygon by a signed-distance plane.
   * @param {Array} points Polygon vertices.
   * @param {Function} distance Signed-distance callback.
   * @returns {Array} Vertices on the nonnegative and nonpositive sides.
   */
  _splitFace(points, distance) {
    var positive = [], negative = [];
    var distances = points.map(distance);
    points.forEach((point, i) => {
      var j = (i + 1) % points.length;
      var a = distances[i], b = distances[j];
      (a >= 0 ? positive : negative).push(point);
      if((a >= 0) != (b >= 0)) {
        var t = a / (a - b);
        var crossing = point.map((value, k) => value + t * (points[j][k] - value));
        if(a != 0 && b != 0) {
          positive.push(crossing);
        }
        negative.push(crossing);
      }
    });
    return [positive, negative];
  }

  /**
   * Adds a projected line primitive.
   * @param {Array} first First endpoint.
   * @param {Array} second Second endpoint.
   * @param {Object} attrs SVG attributes.
   * @param {Object} [transparent_pass] Plotly transparency pass.
   */
  _line(first, second, attrs, transparent_pass) {
    if(first && second) {
      this._add('path', [first, second], {
        d: 'M' + this._xy(first) + 'L' + this._xy(second), fill: 'none', ...attrs
      });
      this.primitives[this.primitives.length - 1].transparent_pass = transparent_pass;
    }
  }

  /**
   * Reconstructs the scene walls, axes, ticks, labels, and titles.
   */
  _axes() {
    var axes = this.axes;
    if(!axes?.enable) {
      this._sceneBackground([]);
      return;
    }
    var [low, high] = axes.bounds;
    var corners = Array.from({ length: 8 }, (_, bits) =>
      low.map((value, i) => bits & (1 << i) ? high[i] : value));
    var projected = corners.map(point => this._project(point));
    var color = value => Array.isArray(value)
      ? 'rgb(' + value.slice(0, 3).map(part => Math.round(255 * part)).join(',') + ')'
      : value;
    var line = (a, b, stroke, width) => {
      if(a && b) {
        this._node('path', { d: 'M' + this._xy(a) + 'L' + this._xy(b),
          fill: 'none', stroke, 'stroke-width': width }, this.viewport);
      }
    };
    var center = this._project(low.map((value, i) => (value + high[i]) / 2));
    var cube = axes.lastCubeProps;
    var rear = cube.axis.reduce((bits, side, i) => side > 0 ? bits | (1 << i) : bits, 0);
    var { native_text, commands } = this._captureAxisDraws();
    var planes = [];
    for(let axis = 0; axis < 3; axis++) {
      var other = [0, 1, 2].filter(i => i != axis);
      if(axes.backgroundEnable?.[axis]) {
        var wall = [rear, rear ^ (1 << other[0]), rear ^ (1 << other[0]) ^ (1 << other[1]),
          rear ^ (1 << other[1])].map(i => corners[i]);
        var face = this._projectWallGeometry(wall, this.camera.model, false);
        if(face.length >= 3 && face.every(Boolean)) {
          planes.push({ points: face, rgba: axes.backgroundColor[axis] });
        }
      }
    }
    var lines = commands.length ? this._axisLines(commands) : null;
    this._sceneBackground(planes, lines, native_text);
    if(lines) {
      this._maskEarlierAxisPaths(lines, 'axis-line-mask-');
      var translucent_labels = [...(native_text?.children || [])]
        .filter(path => Number(path.getAttribute('fill-opacity')) < 1);
      if(translucent_labels.length) {
        lines.setAttribute('mask', this._axisMask('axis-label-mask', translucent_labels));
      }
      this.viewport.appendChild(lines);
    }
    for(let axis = 0; axis < 3; axis++) {
      var bit = 1 << axis;
      var other = [0, 1, 2].filter(i => i != axis);
      var edge = cube.cubeEdges[axis] & ~bit;
      if(!projected[edge] || !projected[edge | bit]) {
        continue;
      }
      var first = projected[edge];
      var second = projected[edge | bit];
      var middle = corners[edge].map((value, i) => i == axis ? (low[i] + high[i]) / 2 : value);
      var outside = middle.slice();
      for(const i of other) {
        if(Boolean(edge & (1 << i)) == (cube.axis[i] <= 0)) {
          outside[i] += (cube.axis[i] > 0 ? -1 : 1) * .01 / this.camera.model[i * 5];
        }
      }
      var from = this._project(middle);
      if(!from) {
        continue;
      }
      var to = this._project(outside) || from;
      var dx = to[0] - from[0];
      var dy = to[1] - from[1];
      if(center && !Math.hypot(dx, dy)) {
        dx = from[0] - center[0];
        dy = from[1] - center[1];
      }
      var length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
      if(!commands.length && axes.lineEnable?.[axis]) {
        line(first, second, color(axes.lineColor[axis]), axes.lineWidth[axis]);
      }
      for(const tick of axes.ticks?.[axis] || []) {
        if(tick.x < low[axis] || tick.x > high[axis]) {
          continue;
        }
        var point = corners[edge].slice();
        point[axis] = tick.x;
        var p = this._project(point);
        if(!commands.length && axes.gridEnable?.[axis]) {
          var start = corners[rear].slice();
          start[axis] = tick.x;
          for(const other_axis of other) {
            var end = start.slice();
            end[other_axis] = end[other_axis] == low[other_axis] ? high[other_axis] : low[other_axis];
            line(this._project(start), this._project(end), color(axes.gridColor[axis]), axes.gridWidth[axis]);
          }
        }
        if(!native_text && p && axes.tickEnable?.[axis]) {
          var offset = (tick.fontSize || 12) * .8;
          this._node('text', { x: p[0] + dx * offset, y: p[1] + dy * offset,
            'text-anchor': 'middle', 'dominant-baseline': 'central',
            'font-size': tick.fontSize, 'font-family': tick.font, fill: tick.fontColor },
          this.viewport, tick.text);
        }
      }
      if(!native_text && axes.labelEnable?.[axis]) {
        var size = axes.labelSize[axis];
        this._node('text', { x: (first[0] + second[0]) / 2 + dx * (size + 17),
          y: (first[1] + second[1]) / 2 + dy * (size + 17),
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          'font-size': size, 'font-family': axes.labelFont[axis], fill: color(axes.labelColor[axis]) },
        this.viewport, axes.labels[axis]);
      }
    }
    if(native_text) {
      this._maskEarlierAxisPaths(native_text, 'axis-glyph-mask-');
      this.viewport.appendChild(native_text);
    }
  }

  /**
   * Reproduces the WebGL clear color and the three replacement wall colors.
   * Plotly's snapshot interprets their raw framebuffer channels as premultiplied.
   * @param {Array} planes Scene wall planes.
   * @param {...Element} axis_layers Axis layers drawn above the background.
   */
  _sceneBackground(planes, ...axis_layers) {
    var [r, g, b, alpha] = this.scene.glplot.clearColor;
    var color = [r * 255, g * 255, b * 255, alpha];
    var [width, height] = [this.width, this.height];
    var layer = this.viewport;
    var translucent = axis_layers.flatMap(layer => [...(layer?.children || [])])
      .filter(path => Number(path.getAttribute('fill-opacity')) < 1);
    if(translucent.length && (planes.length || alpha > 0)) {
      // Plotly writes translucent axis fragments into the framebuffer over the wall.
      layer = this._node('g', { mask: this._axisMask('axis-wall-mask', translucent) }, this.viewport);
    }
    if(alpha > 0) {
      var path = 'M0,0H' + width + 'V' + height + 'H0Z';
      for(const { points } of planes) {
        path += 'M' + points.map(point => this._xy(point)).join('L') + 'Z';
      }
      this._node('path', { d: path, 'fill-rule': 'evenodd', ...this._framebufferPaint(color),
        'data-jslab-scene-background': '' }, layer);
    }
    for(const { points, rgba } of planes) {
      var channels = rgba.slice(0, 3).map(value => value * 255);
      this._node('polygon', { points: points.map(point => this._xy(point)).join(' '),
        ...this._framebufferPaint([...channels, rgba[3]]), 'data-jslab-axis-background': '' }, layer);
    }
  }

  /**
   * Creates a vector mask that removes the area covered by axis paths.
   * @param {string} name Mask name suffix.
   * @param {Array} paths SVG path elements defining the masked area.
   * @returns {string} SVG mask paint.
   */
  _axisMask(name, paths) {
    var { width, height } = this;
    var id = this.gradient_prefix + name;
    var mask = this._node('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width, height },
      this.definitions);
    this._node('rect', { width, height, fill: '#fff' }, mask);
    for(const path of paths) {
      this._node('path', { d: path.getAttribute('d'), fill: '#000' }, mask);
    }
    return 'url(#' + id + ')';
  }

  /**
   * Replays replacement of earlier axis fragments by later translucent paths.
   * @param {Element} layer Axis SVG layer.
   * @param {string} name Mask name suffix.
   */
  _maskEarlierAxisPaths(layer, name) {
    var paths = [...layer.children];
    if(!paths.slice(1).some(path => Number(path.getAttribute('fill-opacity')) < 1)) {
      return;
    }
    layer.replaceChildren();
    for(const [i, path] of paths.entries()) {
      if(i && Number(path.getAttribute('fill-opacity')) < 1) {
        var covered = this._node('g', { mask: this._axisMask(name + i, [path]) });
        covered.append(...layer.children);
        layer.appendChild(covered);
      }
      layer.appendChild(path);
    }
  }

  /**
   * Converts framebuffer bytes that Plotly reads as premultiplied into SVG paint.
   * @param {Array} color Framebuffer RGBA channels.
   * @returns {Object} SVG fill and opacity attributes.
   */
  _framebufferPaint([r, g, b, alpha = 1]) {
    return {
      fill: alpha ? 'rgb(' + [r, g, b].map(value => Math.min(255, Math.round(value / alpha))).join(',') + ')' : 'none',
      'fill-opacity': alpha
    };
  }

  /**
   * Reads the axis line shader inputs during the glyph renderer's redraw.
   * @returns {Object} The glyph layer and native line commands.
   */
  _captureAxisDraws() {
    var lines = this.axes._lines;
    var commands = [];
    if(!lines?.vao) {
      return { native_text: this._axisText(), commands };
    }
    var { gl, vao, shader } = lines;
    var original = vao.draw;
    var own = Object.hasOwn(vao, 'draw');
    var locations;
    var uniforms = ['screenAxis', 'majorAxis', 'minorAxis', 'offset', 'color', 'lineWidth', 'screenShape'];
    var ticks = [...lines.tickOffset, ...lines.gridOffset];
    vao.draw = function(mode, count, first = 0) {
      locations ??= uniforms.map(name => gl.getUniformLocation(shader.program, name));
      var values = locations.map(location => gl.getUniform(shader.program, location));
      commands.push({ values, count, axis: first ? ticks.indexOf(first) % 3 : -1 });
      original.call(vao, mode, count, first);
    };
    try {
      return { native_text: this._axisText(), commands };
    } finally {
      if(own) {
        vao.draw = original;
      } else {
        delete vao.draw;
      }
    }
  }

  /**
   * Projects the same line quads used by the live WebGL axes.
   * @param {Array} commands Captured shader inputs and tick ranges.
   * @returns {Element} SVG axis-line layer.
   */
  _axisLines(commands) {
    var layer = this._node('g', { 'data-jslab-axis-lines': '' });
    for(const { values, count, axis } of commands) {
      var [screen_axis, major, minor, offset, color, width, shape] = values;
      // A zero-alpha stroke still clears the wall pixels in Plotly's axis pass.
      if(!width) {
        continue;
      }
      var path = [];
      for(let i = 0; i < count / 6; i++) {
        var distance = axis < 0 ? 0 : Math.fround(this.axes.ticks[axis][i].x);
        var from = Array.from(offset, (value, k) => value + major[k] * distance);
        var to = from.map((value, k) => value + minor[k]);
        var quad = [[from, 1], [to, 1], [to, -1], [from, -1]].map(([point, sign]) => {
          var p = this._axisClipCoordinates(point);
          var q = this._axisClipCoordinates(point.map((value, k) => value + screen_axis[k] * sign));
          if(!p || !q) {
            return null;
          }
          // The axis shader normalizes the perpendicular in framebuffer pixels.
          var dx = (q[0] - p[0]) * shape[0];
          var dy = (q[1] - p[1]) * shape[1];
          var length = Math.hypot(dx, dy);
          if(length) {
            // SVG coverage is slightly wider than the multisampled WebGL line quad.
            var vector_width = .925 * width;
            p[0] += vector_width * dx / (2 * length * shape[0]);
            p[1] += vector_width * dy / (2 * length * shape[1]);
          }
          return p;
        });
        var face = this._projectDepthClippedPolygon(quad);
        if(face.length >= 3 && face.every(Boolean)) {
          path.push('M' + face.map(point => this._xy(point)).join('L') + 'Z');
        }
      }
      var channels = Array.from(color.subarray(0, 3), value => value * 255);
      this._node('path', { d: path.join(''), ...this._framebufferPaint([...channels, color[3]]) }, layer);
    }
    return layer;
  }

  /**
   * Captures the glyph triangles and placement used by Plotly's axis renderer.
   * @returns {Element|null} Projected vector glyphs.
   */
  _axisText() {
    var axes = this.axes;
    var text = axes._text;
    if(!text?.buffer || !this.scene.glplot.canvas.height) {
      return null;
    }
    var vertices;
    var buffer_update = text.buffer.update;
    var buffer_own = Object.hasOwn(text.buffer, 'update');
    var ranges = ['tickOffset', 'tickCount', 'labelOffset', 'labelCount'];
    var previous_ranges = ranges.map(key => text[key]);
    var glyph_ranges;
    var fonts = prefix => [0, 1, 2].map(i => ({
      family: axes[prefix + 'Font'][i], style: axes[prefix + 'FontStyle'][i],
      weight: axes[prefix + 'FontWeight'][i], variant: axes[prefix + 'FontVariant'][i]
    }));
    try {
      text.buffer.update = data => { vertices = data; };
      text.update(axes.bounds, axes.labels, fonts('label'), axes.ticks, fonts('tick'));
      glyph_ranges = Object.fromEntries(ranges.map(key => [key, text[key]]));
    } finally {
      if(buffer_own) {
        text.buffer.update = buffer_update;
      } else {
        delete text.buffer.update;
      }
      ranges.forEach((key, i) => { text[key] = previous_ranges[i]; });
    }
    if(!vertices) {
      return null;
    }
    var commands = [];
    var methods = ['drawTicks', 'drawLabel'];
    var own = methods.map(method => Object.hasOwn(text, method));
    var originals = methods.map(method => text[method]);
    methods.forEach((method, i) => {
      text[method] = (...args) => {
        commands.push({ kind: i ? 'label' : 'tick', args: args.map(arg => Array.isArray(arg) ? arg.slice() : arg) });
        originals[i].apply(text, args);
      };
    });
    try {
      this.scene.glplot.redraw();
    } finally {
      methods.forEach((method, i) => {
        if(own[i]) {
          text[method] = originals[i];
        } else {
          delete text[method];
        }
      });
    }
    if(!commands.length && (axes.tickEnable.some(Boolean) || axes.labelEnable.some(Boolean))) {
      return null;
    }
    var layer = this._node('g', { 'data-jslab-axis-text': '' });
    var canvas = this.scene.glplot.canvas;
    var ratio_y = this.height / canvas.height * axes.pixelRatio;
    var ratio_x = this.camera._ortho ? this.width / canvas.width * axes.pixelRatio : ratio_y;
    for(const { kind, args } of commands) {
      var [index, scale, angle, offset, color, axis, align, options] = args;
      var first = glyph_ranges[kind + 'Offset'][index] * 3;
      var end = first + glyph_ranges[kind + 'Count'][index] * 3;
      var projected = new Map();
      var faces = [];
      for(let i = first; i < end; i += 9) {
        var triangle = [];
        for(let j = i; j < i + 9; j += 3) {
          var distance = vertices[j + 2];
          if(!projected.has(distance)) {
            var point = offset.map((value, k) => value + distance * axis[k]);
            var clip = this._axisClipCoordinates(point);
            var anchor = clip && Math.abs(clip[2]) <= 1 ? this._projectClip(clip) : null;
            var beta = anchor ? this._axisTextAngle(point, anchor, axis, align, options, angle) : 0;
            projected.set(distance, { anchor, cos: Math.cos(beta) * scale, sin: Math.sin(beta) * scale });
          }
          var { anchor, cos, sin } = projected.get(distance);
          if(anchor) {
            var x = vertices[j], y = vertices[j + 1];
            triangle.push([anchor[0] + ratio_x * (x * cos - y * sin),
              anchor[1] - ratio_y * (x * sin + y * cos)]);
          }
        }
        if(triangle.length == 3) {
          faces.push({ points: triangle });
        }
      }
      if(faces.length) {
        var channels = color.slice(0, 3).map(channel => channel * 255);
        this._node('path', { d: this._meshOutline(faces), ...this._framebufferPaint([...channels, color[3]]) }, layer);
      }
    }
    return layer;
  }

  /**
   * Projects an axis shader position using its clamped homogeneous divisor.
   * @param {Array} point Axis shader position.
   * @returns {Array|null} Projected SVG point.
   */
  _axisClipCoordinates(point) {
    var clip = this._clipCoordinates(point);
    if(!clip) {
      return null;
    }
    var w = Math.max(clip[3], .0001);
    return [clip[0] / w, clip[1] / w, clip[2] / w, 1];
  }

  /**
   * Recovers Plotly's screen-space rotation for an axis glyph.
   * @param {Array} point Glyph anchor point.
   * @param {Array} anchor Glyph layout anchor.
   * @param {number} axis Axis index.
   * @param {Array} align Text alignment vector.
   * @param {Object} options Glyph renderer options.
   * @param {number} angle Configured text angle.
   * @returns {number} Screen-space angle in degrees.
   */
  _axisTextAngle(point, anchor, axis, align, options, angle) {
    if(!options[2]) {
      return angle;
    }
    var direction = vector => {
      var end = this._projectClip(this._axisClipCoordinates(point.map((value, i) => value + vector[i])));
      return end ? Math.atan2(anchor[1] - end[1], end[0] - anchor[0]) : 0;
    };
    var axis_angle = axis.some(Boolean) ? direction(axis) : Math.PI / 2;
    var clip = direction(align);
    axis_angle += Math.sin(axis_angle) < 0 ? Math.PI : 0;
    clip += Math.sin(clip) < 0 ? Math.PI : 0;
    var option = Math.floor(options[0] + .001);
    var flip = Math.sin(clip - axis_angle) > 0 ? Math.PI : 0;
    var upright = value => {
      var rotated = ((value % Math.PI) + Math.PI) % Math.PI;
      return rotated > Math.PI / 2 ? rotated - Math.PI : rotated;
    };
    if(option > 2) {
      var step = 2 * Math.PI / option;
      return angle + upright(Math.round(upright(clip + flip) / step) * step);
    }
    if(option == 2) {
      return angle + (Math.abs(upright(clip + flip)) >= options[1] * Math.PI / 2 ? -Math.PI / 2 : 0);
    }
    return angle + (option == 1 ? clip + flip : option == 0 ? upright(clip) : option == -1 ? 0 : clip);
  }

  /**
   * Reads a scalar or indexed Plotly buffer value.
   * @param {*} value Scalar or array-like value.
   * @param {number} index Buffer index.
   * @returns {*} Selected value.
   */
  _value(value, index) {
    return Array.isArray(value) || ArrayBuffer.isView(value) ? value[index] : value;
  }

  /**
   * Resolves finite scalar bounds from trace values and optional limits.
   * @param {Array|TypedArray} values Scalar values.
   * @param {number} [min] Explicit lower bound.
   * @param {number} [max] Explicit upper bound.
   * @returns {Array} Lower and upper scalar bounds.
   */
  _range(values, min, max) {
    if(min == null || max == null) {
      var low = Infinity;
      var high = -Infinity;
      var samples = Array.isArray(values) || ArrayBuffer.isView(values) ? values : [values];
      for(const value of samples) {
        if(Number.isFinite(value)) {
          low = Math.min(low, value);
          high = Math.max(high, value);
        }
      }
      min ??= low;
      max ??= high;
    }
    return [min, max];
  }

  /**
   * Samples a Plotly colorscale at a scalar value.
   * @param {Object} options Plotly color options.
   * @param {Array} range Scalar bounds.
   * @param {number} value Scalar value.
   * @param {string} fallback Fallback paint.
   * @returns {string} CSS color.
   */
  _color(options, range, value, fallback) {
    if(typeof value == 'string') {
      return value;
    }
    var scale = options?.colorscale;
    if(!Number.isFinite(value) || !scale?.length || !Array.isArray(scale)) {
      return fallback;
    }
    var [min, max] = range;
    var ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : .5;
    var index = scale.findIndex(pair => pair[0] >= ratio);
    index = index < 0 ? scale.length - 1 : index;
    var [high, end] = scale[index];
    var [low, start] = scale[Math.max(0, index - 1)];
    if(high == low) {
      return end;
    }
    var from = this._rgb(start);
    var to = this._rgb(end);
    var fraction = (ratio - low) / (high - low);
    var rgb = from.slice(0, 3).map((channel, i) => Math.round(channel + (to[i] - channel) * fraction));
    var alpha = (from[3] ?? 1) * (1 - fraction) + (to[3] ?? 1) * fraction;
    return alpha < 1 ? 'rgba(' + [...rgb, alpha].join(',') + ')' : 'rgb(' + rgb.join(',') + ')';
  }

  /**
   * Parses a CSS color into numeric channels.
   * @param {string} value CSS color.
   * @returns {Array} Red, green, blue, and optional alpha channels.
   */
  _rgb(value) {
    if(Array.isArray(value) || ArrayBuffer.isView(value)) {
      var [r, g, b, a] = value;
      var bytes = value instanceof Uint8Array || value instanceof Uint8ClampedArray ||
        [r, g, b].every(channel => channel > 1 || channel === 0) && (!a || a > 1);
      return bytes ? [r, g, b, (a ?? 255) / 255] : [r * 255, g * 255, b * 255, a ?? 1];
    }
    this.color_context.fillStyle = '#000';
    this.color_context.fillStyle = value;
    var css = this.color_context.fillStyle;
    return css.startsWith('#') ? [1, 3, 5].map(i => parseInt(css.slice(i, i + 2), 16))
      : css.match(/[\d.]+/g).map(Number);
  }

  /**
   * Reconstructs a Plotly scatter3d trace as SVG geometry.
   * @param {Object} trace Plotly trace options.
   * @param {Object} rendered Live Plotly trace renderer.
   */
  _scatter(trace, rendered) {
    var glyphs = ['scatterPlot', 'textMarkers'];
    if(rendered.linePlot || glyphs.some(name => rendered[name]) || rendered.errorBars || rendered.delaunayMesh) {
      // Re-run Plotly's trace conversion on a receiver whose children only
      // capture their options. The live WebGL trace and buffers stay intact.
      var converted = {};
      var shadow = Object.create(rendered);
      for(const name of ['linePlot', ...glyphs, 'errorBars', 'delaunayMesh']) {
        shadow[name] = { update: options => { converted[name] = options; }, dispose() {} };
      }
      shadow.scene = { ...rendered.scene, glplot: { gl: rendered.scene.glplot.gl, remove() {} } };
      rendered.update.call(shadow, trace);
      if(rendered.linePlot && converted.linePlot) {
        this._scatterLine(rendered.linePlot, converted.linePlot);
      }
      for(const name of glyphs) {
        if(rendered[name] && converted[name]) {
          this._scatterGlyphs(rendered[name], converted[name], name);
        }
      }
      if(rendered.errorBars && converted.errorBars) {
        this._scatterErrorBars(rendered.errorBars, converted.errorBars);
      }
      if(rendered.delaunayMesh && converted.delaunayMesh) {
        this._mesh({ type: 'mesh3d', color: trace.surfacecolor, opacity: trace.opacity, flatshading: true },
          rendered.delaunayMesh, null);
      }
    }
  }

  /**
   * Emits the visible intervals of the line shader's repeating dash texture.
   * Dash phase is in cumulative data distance, including at clipped edges.
   * @param {Object} renderer Live Plotly scatter renderer.
   * @param {Object} options Scatter line options.
   */
  _scatterLine(renderer, options) {
    var bounds = this._clipBounds(renderer.gl, renderer.shader);
    var total = renderer.arcLength.at(-1);
    var cycles = options.dashScale || 0;
    var texture_length = options.dashes.reduce((sum, value) => sum + value, 0);
    var pattern = [];
    if(cycles > 0 && texture_length > 0 && total > 0) {
      var sum = 0;
      var edges = options.dashes.map(value => {
        sum += value;
        return Math.ceil(255 * sum / texture_length) / 256;
      });
      for(let i = 0; i < edges.length; i += 2) {
        pattern.push([i ? edges[i - 1] : 0, edges[i]]);
      }
    }
    var fixed_color = typeof options.color?.[0] == 'number';
    var uniform_alpha = Array.isArray(options.color?.[0]) &&
      options.color.every(color => (color[3] ?? 1) === (options.color[0][3] ?? 1));
    if((fixed_color || uniform_alpha) &&
        this._scatterStrip(renderer, options, bounds, pattern, cycles / total)) {
      return;
    }
    var colors = options.color;
    var color_at = index => {
      var color = Array.isArray(colors?.[0]) ? colors[Math.min(index, colors.length - 1)] : colors;
      return color || [0, 0, 0, 1];
    };
    var previous;
    renderer.points.forEach((point, i) => {
      if(!point || [0, 1, 2].some(axis => !Number.isFinite(point[axis]))) {
        if(!options.connectGaps) {
          previous = null;
        }
        return;
      }
      if(previous) {
        var from = renderer.points[previous.index];
        var first = color_at(previous.index);
        var last = color_at(i);
        var arc_start = renderer.arcLength[previous.index] * cycles / total;
        var arc_end = renderer.arcLength[i] * cycles / total;
        var length = arc_end - arc_start;
        var intervals = pattern.length && length > 0
          ? this._dashIntervals(arc_start, arc_end, pattern).map(pair => pair.map(value => (value - arc_start) / length))
          : [[0, 1]];
        for(const [start, end] of intervals) {
          var world = [start, end].map(t => from.map((value, k) => value + t * (point[k] - value)));
          var ends = this._clipSegment(world[0], world[1], bounds);
          if(!ends[0] || !ends[1]) {
            continue;
          }
          var a = start + (end - start) * ends[2];
          var b = start + (end - start) * ends[3];
          var paint = this._scatterLinePaint(ends, first, last, a, b);
          this._line(ends[0], ends[1], { stroke: paint.color,
            'stroke-width': .5 * (this._value(options.lineWidth, previous.index) || 2),
            opacity: paint.alpha * (options.opacity ?? 1), 'data-jslab-scatter-line': '' }, renderer.hasAlpha);
        }
      }
      previous = { index: i };
    });
  }

  /**
   * Returns the visible part of an arc range in units of dash texture cycles.
   * @param {number} first First texture coordinate.
   * @param {number} last Last texture coordinate.
   * @param {Array} pattern Alternating dash and gap lengths.
   * @returns {Array} Visible dash intervals.
   */
  _dashIntervals(first, last, pattern) {
    var intervals = [];
    if(!Number.isFinite(first) || !Number.isFinite(last)) {
      return intervals;
    }
    for(let cycle = Math.floor(first); cycle <= Math.floor(last); cycle++) {
      for(const [low, high] of pattern) {
        var start = Math.max(first, cycle + low);
        var end = Math.min(last, cycle + high);
        if(start < end || first === last && first >= cycle + low && first < cycle + high) {
          intervals.push([start, end]);
        }
      }
    }
    return intervals;
  }

  /**
   * Projects Plotly's line strip directly, including its per-vertex colors and joins.
   * Clips the expanded triangles using the centerline positions passed to the fragment shader.
   * @param {Object} renderer Live Plotly scatter renderer.
   * @param {Object} options Scatter line options.
   * @param {Array} bounds Data-space clipping bounds.
   * @param {Array} pattern Dash pattern.
   * @param {number} dash_scale Dash texture scale.
   * @returns {boolean} Whether the complete strip was emitted.
   */
  _scatterStrip(renderer, options, bounds, pattern, dash_scale) {
    var vertices;
    var shadow = Object.create(renderer);
    shadow.buffer = { update: data => { vertices = data; } };
    shadow.texture = { setPixels() {} };
    renderer.update.call(shadow, options);
    if(!vertices?.length) {
      return true;
    }
    var gl = renderer.gl;
    var width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    var strip = [];
    var vertex_colors = Array.isArray(options.color?.[0]);
    for(let i = 0; i < vertices.length; i += 12) {
      var point = vertices.slice(i, i + 3);
      var a = this._clipCoordinates(point);
      var b = this._clipCoordinates(vertices.slice(i + 3, i + 6));
      if(!a || !b || !a[3] || !b[3]) {
        return false;
      }
      var dx = (b[0] / b[3] - a[0] / a[3]) * width;
      var dy = (b[1] / b[3] - a[1] / a[3]) * height;
      var length = Math.hypot(dx, dy) || 1;
      var offset = .5 * renderer.pixelRatio * vertices[i + 7] * a[3] / length;
      a[0] += offset * dy / width;
      a[1] -= offset * dx / height;
      if(a.some(value => !Number.isFinite(value))) {
        return false;
      }
      var color = vertex_colors ? vertices.slice(i + 8, i + 12) : [];
      strip.push([...a, ...point, pattern.length ? Math.fround(vertices[i + 6]) * Math.fround(dash_scale) : 0, ...color]);
    }
    var planes = [0, 1, 2].flatMap(axis => [point => point[3] + point[axis], point => point[3] - point[axis]]);
    if(bounds) {
      planes.push(...[0, 1, 2].flatMap(axis => [point => point[axis + 4] - bounds[0][axis],
        point => bounds[1][axis] - point[axis + 4]]));
    }
    var paint = vertex_colors ? null : this._framebufferPaint([
      ...options.color.slice(0, 3).map(value => value * 255), options.color[3] ?? 1
    ]);
    var trace_opacity = options.opacity ?? 1;
    var alpha = vertex_colors ? options.color[0][3] ?? 1 : paint['fill-opacity'];
    if(alpha * trace_opacity <= 0) {
      return true;
    }
    var shade = vertex_colors && alpha !== 1 ? color =>
      this._framebufferPaint([...this._rgb(color).slice(0, 3), alpha]).fill : null;
    var first_face = this.primitives.length;
    for(let i = 2; i < strip.length; i++) {
      var polygon = strip.slice(i - 2, i + 1);
      for(const plane of planes) {
        if(polygon.some(point => plane(point) < 0)) {
          [polygon] = this._splitFace(polygon, plane);
        }
        if(polygon.length < 3) {
          break;
        }
      }
      if(polygon.length < 3) {
        continue;
      }
      var parts = [polygon];
      if(pattern.length) {
        var arc = polygon.map(point => point[7]);
        parts = this._dashIntervals(Math.min(...arc), Math.max(...arc), pattern).map(([start, end]) => {
          var [visible] = this._splitFace(polygon, point => point[7] - start);
          return this._splitFace(visible, point => end - point[7])[0];
        });
      }
      for(const part of parts) {
        var projected = part.map(point => this._projectClip(point.slice(0, 4)));
        if(!projected.every(Boolean)) {
          continue;
        }
        var a = projected[0];
        for(let j = 2; j < projected.length; j++) {
          var [b, c] = [projected[j - 1], projected[j]];
          var area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
          if(Math.abs(area) <= .000001) {
            continue;
          }
          if(vertex_colors) {
            var colors = [part[0], part[j - 1], part[j]]
              .map(point => point.slice(8).map(value => Math.min(255, Math.max(0, value * 255))));
            this._vertexColorTriangle([a, b, c], colors, trace_opacity, renderer.hasAlpha, shade);
          } else {
            this._add('polygon', [a, b, c], { fill: paint.fill, opacity: alpha * trace_opacity,
              points: [a, b, c].map(point => this._xy(point)).join(' '), 'data-jslab-scatter-line': '' });
            this.primitives.at(-1).transparent_pass = renderer.hasAlpha;
          }
        }
      }
    }
    if(vertex_colors) {
      var faces = this.primitives.slice(first_face);
      for(const face of faces) {
        face.attrs['data-jslab-scatter-line'] = '';
        // The strip already contains its joins and width. An extra stroke expands the silhouette.
        face.attrs.stroke = null;
        face.attrs['stroke-width'] = null;
      }
    }
    return true;
  }

  /**
   * Creates the SVG paint used by a clipped scatter line interval.
   * @param {Array} ends Projected line endpoints.
   * @param {Array} first First endpoint RGBA channels.
   * @param {Array} last Last endpoint RGBA channels.
   * @param {number} start Visible interval start ratio.
   * @param {number} end Visible interval end ratio.
   * @returns {Object} SVG stroke attributes.
   */
  _scatterLinePaint(ends, first, last, start, end) {
    var first_alpha = first[3] ?? 1;
    var last_alpha = last[3] ?? 1;
    if(!first_alpha && !last_alpha) {
      return { color: 'none', alpha: 0 };
    }
    var alpha = t => first_alpha * (1 - t) + last_alpha * t;
    var color = t => {
      var value = alpha(t);
      var rgb = [0, 1, 2].map(i => first[i] + t * (last[i] - first[i]));
      if(!value && first_alpha !== last_alpha) {
        // Use the limiting color at the transparent endpoint for gradient interpolation.
        var other = first_alpha ? first : last;
        rgb = rgb.map((channel, i) => channel > 0 ? 1 : other[i] / (other[3] ?? 1));
        value = 1;
      }
      return this._framebufferPaint([...rgb.map(channel => channel * 255), value]).fill;
    };
    if(first === last || first.every((value, i) => value == last[i])) {
      return { color: color(start), alpha: alpha(start) };
    }
    var [a, b] = ends;
    var id = this.gradient_prefix + 'line-' + this.definitions.childElementCount;
    var gradient = this._node('linearGradient', { id, gradientUnits: 'userSpaceOnUse',
      x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, this.definitions);
    var samples = [0, .25, .5, .75, 1];
    if(first_alpha !== last_alpha) {
      // Dividing by alpha is nonlinear. Include each point where a channel saturates.
      samples = Array.from({ length: 17 }, (_, i) => i / 16);
      for(let i = 0; i < 3; i++) {
        var from = first[i] - first_alpha;
        var to = last[i] - last_alpha;
        var t = (from / (from - to) - start) / (end - start);
        if(t > 0 && t < 1 && !samples.includes(t)) {
          samples.push(t);
        }
      }
      samples.sort((a, b) => a - b);
    }
    for(const t of samples) {
      var ratio = t * a[3] / ((1 - t) * b[3] + t * a[3]);
      var value = start + (end - start) * t;
      this._node('stop', { offset: ratio, 'stop-color': color(value), 'stop-opacity': alpha(value) }, gradient);
    }
    return { color: 'url(#' + id + ')', alpha: 1 };
  }

  /**
   * Replays the live scatter error-bar buffer as SVG line segments.
   * @param {Object} renderer Live Plotly scatter renderer.
   * @param {Object} options Scatter trace options.
   */
  _scatterErrorBars(renderer, options) {
    var vertices;
    var shadow = Object.create(renderer);
    shadow.lineOffset = [0, 0, 0];
    shadow.buffer = { update: data => { vertices = data; } };
    renderer.update.call(shadow, options);
    if(!vertices) {
      return;
    }
    var gl = renderer.gl;
    var [min, max] = this._clipBounds(gl, renderer.shader) || [null, null];
    var { view, projection, _ortho } = this.camera;
    var eye = this._multiply(projection, view.slice(12, 16));
    var scale = (_ortho ? 2 : 1) * renderer.pixelRatio * eye[3] / gl.drawingBufferHeight;
    for(let axis = 0; axis < 3; axis++) {
      var width = this._webglLineWidth(gl, renderer.pixelRatio, renderer.lineWidth[axis]);
      var cap = renderer.capSize[axis] * scale;
      var start = shadow.lineOffset[axis] * 10;
      var end = start + shadow.lineCount[axis] * 10;
      for(let i = start; i < end; i += 20) {
        var a = vertices.slice(i, i + 3);
        var b = vertices.slice(i + 10, i + 13);
        var rgba = vertices.slice(i + 3, i + 7);
        var offset = vertices.slice(i + 7, i + 10);
        var ends;
        if(offset.some(Boolean)) {
          if(min && a.some((value, k) => value < min[k] || value > max[k])) {
            continue;
          }
          ends = [this._project(a, offset.map(value => value * cap)),
            this._project(b, vertices.slice(i + 17, i + 20).map(value => value * cap))];
        } else {
          ends = this._clipSegment(a, b, min ? [min, max] : null);
        }
        var { fill: stroke, 'fill-opacity': alpha } = this._framebufferPaint([
          ...Array.from(rgba.slice(0, 3), value => value * 255), rgba[3]
        ]);
        this._line(ends[0], ends[1], { stroke, opacity: alpha * renderer.opacity,
          'stroke-width': width, 'data-jslab-error-bar': 'xyz'[axis] }, renderer.hasAlpha);
      }
    }
  }

  /**
   * Converts a requested WebGL line width into its displayed CSS pixel width.
   * @param {WebGLRenderingContext} gl WebGL context.
   * @param {number} pixel_ratio Plotly pixel ratio.
   * @param {number} width Requested WebGL line width.
   * @returns {number} Displayed CSS pixel width.
   */
  _webglLineWidth(gl, pixel_ratio, width) {
    var [min, max] = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE);
    return Math.min(max, Math.max(min, width * pixel_ratio)) / pixel_ratio;
  }

  /**
   * Projects Plotly's marker or text glyph triangles using its orthographic
   * glyph shader offsets. Buffer capture runs on a separate receiver.
   * @param {Object} renderer Live Plotly scatter renderer.
   * @param {Object} options Scatter trace options.
   * @param {string} name Glyph buffer name.
   */
  _scatterGlyphs(renderer, options, name) {
    var buffers = {};
    var shadow = Object.create(renderer);
    shadow.projectOpacity = renderer.projectOpacity.slice();
    for(const key of ['point', 'color', 'glyph', 'id']) {
      shadow[key + 'Buffer'] = { update: values => { buffers[key] = values.slice(); } };
    }
    renderer.update.call(shadow, options);
    var projections = this._scatterProjectionDraws(renderer);
    for(const projection of [...projections, null]) {
      this._scatterGlyphPaths(renderer, shadow, buffers, name, projection);
    }
  }

  /**
   * Captures the matrix, basis, and paint for each projected marker pass.
   * @param {Object} renderer Live Plotly scatter renderer.
   * @returns {Array} Projected marker pass settings from Plotly.
   */
  _scatterProjectionDraws(renderer) {
    var commands = [];
    if(!renderer.axesProject?.some(Boolean) || !renderer.projectShader?.program || !renderer.vao) {
      return commands;
    }
    var { gl, vao, projectShader } = renderer;
    var original = vao.draw;
    var own = Object.hasOwn(vao, 'draw');
    var names = ['model', 'axes[0]', 'axes[1]', 'scale', 'opacity', 'pixelRatio', 'screenSize'];
    var locations = names.map(name => gl.getUniformLocation(projectShader.program, name));
    var clip_bounds = name => this._clipBounds(gl, projectShader, name);
    vao.draw = function(mode, count, first) {
      if(mode == gl.TRIANGLES && gl.getParameter(gl.CURRENT_PROGRAM) == projectShader.program) {
        var [model, x, y, scale, opacity, pixel_ratio, screen] =
          locations.map(location => gl.getUniform(projectShader.program, location));
        if(model && x && y && screen) {
          commands.push({ model, x, y, opacity, scale: .5 * pixel_ratio * scale * screen[1],
            anchor_bounds: clip_bounds('clipBounds'), wall_bounds: clip_bounds('fragClipBounds') });
        }
      }
      return original.call(vao, mode, count, first);
    };
    try {
      this.scene.glplot.redraw();
    } finally {
      if(own) {
        vao.draw = original;
      } else {
        delete vao.draw;
      }
    }
    return commands;
  }

  /**
   * Converts captured Plotly glyph buffers into SVG paths.
   * @param {Object} renderer Live Plotly scatter renderer.
   * @param {Object} shadow Captured renderer state.
   * @param {Object} buffers Captured glyph buffers.
   * @param {string} name Glyph buffer name.
   * @param {Object} [projection] Projected-marker pass settings.
   * @returns {Array} Projected glyph drawing operations.
   */
  _scatterGlyphPaths(renderer, shadow, buffers, name, projection) {
    var groups = new Map();
    var outline_width = shadow.lineWidth > 0
      ? this._webglLineWidth(renderer.gl, renderer.pixelRatio, shadow.lineWidth) : 0;
    var canvas = this.scene.glplot.canvas;
    var scale_y = this.height / canvas.height * renderer.pixelRatio;
    var scale_x = this.camera._ortho ? this.width / canvas.width * renderer.pixelRatio : scale_y;
    var highlighted_id = renderer.highlightId[3] === 0 ? renderer.highlightId.slice(0, 3)
      .reduce((id, byte, i) => id + (Math.round(byte * 255) << (i * 8)), 0) : -1;
    var [a, b] = renderer.axes.bounds;
    var low = a.map((value, i) => Math.min(value, b[i]));
    var high = a.map((value, i) => Math.max(value, b[i]));
    var [anchor_low, anchor_high] = projection?.anchor_bounds || [low, high];
    var [wall_low, wall_high] = projection?.wall_bounds || [low, high];
    var wall_clip;
    if(projection && outline_width) {
      // The fragment shader clips the entire outline stroke at the wall edge.
      var axes = low.map((_, i) => i).filter(i => projection.x[i] || projection.y[i]);
      var corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(bits => {
        var corner = low.slice();
        axes.forEach((axis, i) => { corner[axis] = bits[i] ? wall_high[axis] : wall_low[axis]; });
        return corner;
      });
      var wall = axes.length === 2 ? this._projectWallGeometry(corners, projection.model, false) : [];
      if(wall.length >= 3 && wall.every(Boolean)) {
        var id = this.gradient_prefix + 'marker-wall-' + this.definitions.childElementCount;
        var clip = this._node('clipPath', { id }, this.definitions);
        this._node('polygon', { points: wall.map(point => this._xy(point)).join(' ') }, clip);
        wall_clip = 'url(#' + id + ')';
      }
    }
    for(let index = 0; index < shadow.vertexCount + shadow.lineVertexCount;) {
      var outline = index >= shadow.vertexCount;
      var count = outline ? 2 : 3;
      var start = index;
      index += count;
      if(outline && !(shadow.lineWidth > 0)) {
        break;
      }
      var point = buffers.point.subarray(start * 3, start * 3 + 3);
      if(point.some((value, axis) => value < anchor_low[axis] || value > anchor_high[axis])) {
        continue;
      }
      var rgba = buffers.color.subarray(start * 4, start * 4 + 4);
      var opacity = rgba[3] * (projection?.opacity ?? shadow.opacity);
      if(!opacity) {
        continue;
      }
      var key = buffers.id[start] + ':' + Number(outline);
      if(!groups.has(key)) {
        var anchor = this._project(point, null, projection?.model);
        if(!anchor || !projection && (anchor[2] < -1 || anchor[2] > 1)) {
          continue;
        }
        var { fill: color } = this._framebufferPaint([
          ...Array.from(rgba.subarray(0, 3), channel => channel * 255), rgba[3]
        ]);
        var view_point;
        if(!projection && !renderer.useOrtho) {
          var model_point = this._multiply(this.camera.model, [...point, 1]);
          view_point = this._multiply(this.camera.view, model_point);
          view_point = view_point.map(value => value / view_point[3]);
        }
        groups.set(key, { anchor, view_point, outline, color, opacity, path: [],
          bounds: [Infinity, Infinity, -Infinity, -Infinity] });
      }
      var glyph = groups.get(key);
      var glyph_scale = buffers.id[start] === highlighted_id ? renderer.highlightScale : 1;
      var points = [];
      var world = [];
      for(let i = start; i < index; i++) {
        var x = buffers.glyph[i * 2] * glyph_scale, y = buffers.glyph[i * 2 + 1] * glyph_scale;
        if(projection) {
          world.push(point.map((value, k) => value + projection.scale / glyph.anchor[3] *
            (projection.x[k] * x + projection.y[k] * y)));
        } else if(glyph.view_point) {
          // The perspective glyph shader offsets the marker in view space before projection.
          var [vx, vy, vz, vw] = glyph.view_point;
          points.push(this._projectClip(this._multiply(this.camera.projection, [vx + x, vy - y, vz, vw])));
        } else {
          points.push([glyph.anchor[0] + x * scale_x, glyph.anchor[1] + y * scale_y]);
        }
      }
      if(projection) {
        points = this._projectWallGeometry(world, projection.model, outline, [wall_low, wall_high]);
      }
      if(points.length >= count && points.every(Boolean)) {
        for(const [x, y] of points) {
          glyph.bounds[0] = Math.min(glyph.bounds[0], x);
          glyph.bounds[1] = Math.min(glyph.bounds[1], y);
          glyph.bounds[2] = Math.max(glyph.bounds[2], x);
          glyph.bounds[3] = Math.max(glyph.bounds[3], y);
        }
        glyph.path.push('M' + points.map(point => this._xy(point)).join('L') + (outline ? '' : 'Z'));
      }
    }
    for(const { anchor, outline, color, opacity, path, bounds } of groups.values()) {
      if(!path.length) {
        continue;
      }
      var [x0, y0, x1, y1] = bounds;
      var pad = outline ? outline_width / 2 : 0;
      var z = anchor[2];
      var points = projection ? [anchor] : [[x0-pad,y0-pad,z], [x1+pad,y0-pad,z],
        [x1+pad,y1+pad,z], [x0-pad,y1+pad,z]];
      this._add('path', points, {
        d: path.join(''), fill: outline ? 'none' : color, stroke: outline ? color : null,
        'stroke-width': outline ? outline_width : null, 'clip-path': outline ? wall_clip : null,
        opacity, 'data-jslab-scatter-glyph': name,
        'data-jslab-scatter-projection': projection ? '' : null
      });
      this.primitives[this.primitives.length - 1].occlusion_glyph = !projection;
      this.primitives[this.primitives.length - 1].transparent_pass = projection
        ? projection.opacity < 1 || renderer.projectHasAlpha : renderer.hasAlpha;
    }
  }

  /**
   * Projects wall geometry after clipping to its data bounds and camera depth range.
   * @param {Array} world World-space polygon vertices.
   * @param {Array|TypedArray} model Model matrix.
   * @param {boolean} outline Whether the geometry represents an open outline.
   * @param {Array} [bounds] Data-space clipping bounds.
   * @returns {Array} Projected polygon vertices.
   */
  _projectWallGeometry(world, model, outline, bounds) {
    var clip = point => this._clipCoordinates(point, null, model);
    var inside_wall = !bounds || world.every(point => point.every((value, i) =>
      value >= bounds[0][i] && value <= bounds[1][i]));
    if(!inside_wall) {
      if(outline) {
        return this._clipSegment(world[0], world[1], bounds, clip).slice(0, 2);
      }
      for(let axis = 0; axis < 3; axis++) {
        [world] = this._splitFace(world, point => point[axis] - bounds[0][axis]);
        [world] = this._splitFace(world, point => bounds[1][axis] - point[axis]);
      }
    }
    var points = world.map(clip);
    if(!points.every(Boolean)) {
      return [];
    }
    if(outline && points.some(([, , z, w]) => w <= 0 || Math.abs(z) > w)) {
      return this._clipSegment(world[0], world[1], null, clip).slice(0, 2);
    }
    return this._projectDepthClippedPolygon(points);
  }

  /**
   * Clips homogeneous vertices before projecting through the camera's depth range.
   * @param {Array} points Homogeneous clip-space vertices.
   * @returns {Array} Projected polygon vertices.
   */
  _projectDepthClippedPolygon(points) {
    if(!points.every(Boolean)) {
      return [];
    }
    for(const sign of [-1, 1]) {
      var distance = ([, , z, w]) => w + sign * z;
      if(points.some(point => distance(point) < 0)) {
        [points] = this._splitFace(points, distance);
      }
    }
    return points.map(point => this._projectClip(point));
  }

  /**
   * Reconstructs a cone or streamtube vertex and its world-space offset.
   * @param {Object} mesh Live Plotly vector-field mesh.
   * @param {Array} position Base vertex position.
   * @param {number} index Vertex index.
   * @returns {Object} Transformed position, normal, and offset information.
   */
  _vectorVertex(mesh, position, index) {
    // Plotly expands each cone and streamtube vertex in its vertex shader.
    // Reproduce the eight-sided cross section in model coordinates.
    var vector = Array.from(mesh.vectors[index]);
    var [x, y, z] = vector;
    var cone = mesh.traceType == 'cone';
    var magnitude = cone ? mesh.vectorScale * mesh.coneScale :
      mesh.tubeScale * vector[3] / (Math.hypot(x, y, z) || 1);
    var direction = this._multiply(this.camera.model, [x * magnitude, y * magnitude, z * magnitude, 0]).slice(0, 3);
    var [a, b, c] = direction;
    var normalize = v => {
      var length = Math.hypot(...v) || 1;
      return v.map(value => value / length);
    };
    var u = normalize(a*a > c*c || b*b > c*c ? [-b,a,0] : [0,c,-b]);
    var v = normalize([u[1]*c-u[2]*b, u[2]*a-u[0]*c, u[0]*b-u[1]*a]);
    var segment = position[3];
    var factor = 0;
    var radius = Math.hypot(...direction);
    var vertex;
    if(cone) {
      vertex = segment % 6;
      segment = Math.floor((segment % 48) / 6) + Number(vertex == 1 || vertex == 5);
      factor = (vertex == 0 ? 1 : 0) - mesh.coneOffset;
      radius *= .25;
    }
    var angle = Math.PI * segment / 4;
    var radial = u.map((component, i) => component * Math.cos(angle) + v[i] * Math.sin(angle));
    var normal = radial;
    if(cone) {
      if(vertex < 3) {
        var slope = radial.map((component, i) => component * radius - direction[i]);
        var tangent = u.map((component, i) => component * Math.sin(angle) - v[i] * Math.cos(angle));
        normal = normalize(slope.map((_, i) => slope[(i + 1) % 3] * tangent[(i + 2) % 3] -
          slope[(i + 2) % 3] * tangent[(i + 1) % 3]));
      } else {
        normal = normalize(direction.map(value => -value));
      }
      if(vertex == 0 || vertex == 3) {
        radius = 0;
      }
    }
    return { offset: direction.map((component, i) => component * factor + radius * radial[i]), normal };
  }

  /**
   * Adds a flat-painted projected triangle.
   * @param {Array} points Projected triangle vertices.
   * @param {string} fill SVG paint.
   * @param {number} opacity Face opacity.
   * @param {Object} [transparent_pass] Plotly transparency pass.
   * @param {string} [clip_path] SVG clipping path.
   */
  _triangle(points, fill, opacity, transparent_pass, clip_path) {
    if(points.every(Boolean)) {
      var [a, b, c] = points;
      var area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if(Math.abs(area) < 1e-8) {
        return;
      }
      var opaque = opacity === 1 && !this.translucent_gradients?.has(fill) &&
        (!fill.startsWith('rgba(') || (this._rgb(fill)[3] ?? 1) === 1);
      this._add('polygon', points, { points: points.map(p => this._xy(p)).join(' '),
        fill, opacity, stroke: opaque ? fill : null, 'stroke-width': clip_path ? .8 : .12,
        'clip-path': clip_path });
      this.primitives[this.primitives.length - 1].transparent_pass = transparent_pass;
    }
  }

  /**
   * Creates a gradient along a triangle's projected scalar field.
   * @param {Array} points Projected vertices.
   * @param {Array} values Scalar values at the vertices.
   * @param {Object} trace Plotly color options.
   * @param {Array} range Scalar bounds.
   * @param {string} fallback Flat fill for constant or degenerate triangles.
   * @param {Function|string} [shade] Lighting transform or fixed paint.
   * @param {Function} [alpha] Scalar-to-opacity mapping.
   * @returns {string} SVG paint.
   */
  _triangleGradient(points, values, trace, range, fallback, shade, alpha) {
    if(!points.every(Boolean) || !values.every(Number.isFinite) || !trace.colorscale?.length) {
      return shade ? shade(fallback) : fallback;
    }
    var [a, b, c] = points;
    var [va, vb, vc] = values;
    var min = Math.min(...values);
    var max = Math.max(...values);
    var dx1 = b[0] - a[0], dy1 = b[1] - a[1];
    var dx2 = c[0] - a[0], dy2 = c[1] - a[1];
    var determinant = dx1 * dy2 - dy1 * dx2;
    if(Math.abs(determinant) < .000001 || max == min) {
      return shade ? shade(fallback) : fallback;
    }
    var gx = ((vb - va) * dy2 - (vc - va) * dy1) / determinant;
    var gy = (dx1 * (vc - va) - dx2 * (vb - va)) / determinant;
    var norm = gx * gx + gy * gy;
    var coordinates = {
      x1: a[0] + gx * (min - va) / norm, y1: a[1] + gy * (min - va) / norm,
      x2: a[0] + gx * (max - va) / norm, y2: a[1] + gy * (max - va) / norm
    };
    var [low, high] = range;
    // Both texture coordinates are the scalar, and derivatives are per WebGL framebuffer pixel.
    var pixel_ratio = this.scene.pixelRatio;
    var slope = Math.sqrt(2 * norm) / ((high - low) * pixel_ratio);
    // At magnification, the snapshot still averages adjacent framebuffer samples.
    var sample_offsets = pixel_ratio == 2 && slope * 256 <= 1
      ? [-1, 1].flatMap(x => [-1, 1].map(y => (x * gx + y * gy) / (4 * (high - low))))
      : [0];
    var filtered;
    if(trace.type === 'volume' || !alpha && (trace.type === 'mesh3d' || trace.type === 'isosurface' ||
        trace.type === 'cone' || trace.type === 'streamtube')) {
      filtered = this._filteredMeshTextureScale(trace.colorscale, slope, sample_offsets);
    } else if(trace.type == 'surface') {
      filtered = this.surface_scales.get(trace.colorscale);
    }
    var color_stops = [];
    for(const [ratio, color] of filtered?.stops || trace.colorscale) {
      var value = low + (high - low) * ratio;
      if(value >= min && value <= max) {
        color_stops.push({ value, color });
      }
    }
    var stops = color_stops.filter(stop => stop.value > min && stop.value < max);
    var ratios = [];
    if(alpha && (trace.type === 'volume' || !filtered)) {
      ratios.push(...trace.opacityscale.map(([ratio]) => +ratio));
      if(trace.type == 'volume') {
        for(let i = 1; i < 16; i++) {
          ratios.push(i / 16);
        }
      }
    }
    for(const value of new Set(ratios.map(ratio => low + (high - low) * ratio))) {
      if(value > min && value < max && !stops.some(stop => stop.value == value)) {
        stops.push({ value });
      }
    }
    stops.sort((a, b) => a.value - b.value);
    var first = color_stops.findLast(stop => stop.value == min);
    var last = color_stops.find(stop => stop.value == max);
    var paint = [first || { value: min }, ...stops, last || { value: max }].map(({ value, color: explicit }) => {
      var color = explicit || (filtered
        ? filtered.color((value - low) / (high - low))
        : this._color(trace, range, value, fallback));
      return { offset: (value - min) / (max - min),
        'stop-color': shade ? shade(color) : color, 'stop-opacity': alpha?.(value) };
    });
    // Coplanar triangles can calculate the same screen-space gradient with different rounding.
    // Keep translucent paints separate so each face still blends independently.
    var opaque = paint.every(stop => (stop['stop-opacity'] ?? 1) === 1 &&
      (this._rgb(stop['stop-color'])[3] ?? 1) === 1);
    if(opaque && paint.every(stop => stop['stop-color'] === paint[0]['stop-color'])) {
      return paint[0]['stop-color'];
    }
    // Moving both gradient endpoints along an isocontour leaves the paint unchanged.
    var origin = gx * coordinates.x1 + gy * coordinates.y1;
    var key = opaque ? JSON.stringify([[gx / (max - min), gy / (max - min), origin / (max - min)]
      .map(value => Number(value.toFixed(12))), paint]) : null;
    var id = this.face_gradients.get(key);
    if(!id) {
      id = this.gradient_prefix + this.definitions.childElementCount;
      if(key !== null) {
        this.face_gradients.set(key, id);
      } else {
        this.translucent_gradients.add('url(#' + id + ')');
      }
      var gradient = this._node('linearGradient', { id, gradientUnits: 'userSpaceOnUse', ...coordinates }, this.definitions);
      for(const stop of paint) {
        this._node('stop', stop, gradient);
      }
    }
    return 'url(#' + id + ')';
  }

  /**
   * Approximates Plotly's texture filtering for opaque colorscales.
   * Each mip level contributes texel centers around changes in the colorscale.
   * @param {Array} scale Plotly colorscale.
   * @param {number} slope Projected scalar gradient.
   * @param {Array} [offsets] Additional sample offsets.
   * @returns {Object|null} Sampled texture colors and stops.
   */
  _filteredMeshTextureScale(scale, slope, offsets = [0]) {
    if(!(slope >= 0) || scale.length < 3 || scale[0][0] !== 0 || scale.at(-1)[0] !== 1) {
      return null;
    }
    var stepped = scale.some(([ratio, color], i) => i > 0 && ratio === scale[i - 1][0] && color !== scale[i - 1][1]) &&
      scale.every(([ratio, color], i) => i === 0 || ratio === scale[i - 1][0] || color === scale[i - 1][1]);
    var narrow_ramp = scale.some(([ratio, color], i) => i > 0 &&
      ratio > scale[i - 1][0] && ratio - scale[i - 1][0] <= 1 / 256 && color !== scale[i - 1][1]);
    var colors = scale.map(([, color]) => this._rgb(color));
    if(colors.some(color => (color[3] ?? 1) !== 1)) {
      return null;
    }
    var texture = this.mesh_texels.get(scale);
    if(!texture) {
      var options = { colorscale: scale };
      texture = {
        boundaries: scale.map(([ratio]) => Math.round(ratio * 255)),
        base: stepped ? null : Array.from({ length: 256 }, (_, i) =>
          this._rgb(this._color(options, [0, 1], i / 255, scale[0][1]))),
        levels: new Map()
      };
      this.mesh_texels.set(scale, texture);
    }
    var { boundaries, base } = texture;
    var lod = Math.min(8, Math.max(0, Math.log2(256 * slope)));
    var step = 2 ** Math.floor(lod);
    var mix = lod % 1;
    var sizes = mix ? [step, 2 * step] : [step];
    var knots = new Set([0, 1]);
    var levels = sizes.map(size => {
      var texels = texture.levels.get(size);
      if(!texels) {
        texels = [];
        for(let start = 0; start < 256; start += size) {
          var sums = [0, 0, 0];
          if(base) {
            for(let i = start; i < start + size; i++) {
              sums = sums.map((sum, channel) => sum + base[i][channel]);
            }
          } else {
            for(let i = 0; i < colors.length; i++) {
              var count = Math.max(0, Math.min(start + size, boundaries[i + 1] ?? 256) -
                Math.max(start, boundaries[i]));
              sums = sums.map((sum, channel) => sum + count * colors[i][channel]);
            }
          }
          texels.push(sums.map(sum => Math.round(sum / size)));
        }
        texture.levels.set(size, texels);
      }
      var indices = texels.keys();
      if(!stepped && !narrow_ramp) {
        // Smooth ramps need extra stops only near their control points.
        indices = new Set(scale.flatMap(([ratio]) => {
          var center = Math.round(ratio * texels.length - .5);
          return [center - 1, center, center + 1].filter(i => i >= 0 && i < texels.length &&
            Math.abs(i + .5 - ratio * texels.length) <= 1);
        }));
      }
      for(const i of indices) {
        var color = texels[i];
        if([texels[i - 1], texels[i + 1]].some(neighbor =>
          neighbor?.some((channel, k) => channel !== color[k]))) {
          for(const offset of offsets) {
            var knot = (i + .5) / texels.length - offset;
            if(knot > 0 && knot < 1) {
              knots.add(knot);
            }
          }
        }
      }
      return texels;
    });
    var sample = ratio => {
      var samples = levels.map(texels => {
        var index = Math.min(texels.length - 1, Math.max(0, ratio * texels.length - .5));
        var left = texels[Math.floor(index)], right = texels[Math.ceil(index)];
        return left.map((channel, i) => channel + (right[i] - channel) * (index % 1));
      });
      var [first, second = first] = samples;
      return first.map((channel, i) => channel + (second[i] - channel) * mix);
    };
    var color = ratio => {
      var sum = [0, 0, 0];
      for(const offset of offsets) {
        sample(ratio + offset).forEach((channel, i) => { sum[i] += channel; });
      }
      return 'rgb(' + sum.map(channel => Math.round(channel / offsets.length)).join(',') + ')';
    };
    return { color, stops: [...knots].sort((a, b) => a - b).map(ratio => [ratio, color(ratio)]) };
  }

  /**
   * Uses reciprocal clip-space depth to interpolate colors as WebGL does.
   * SVG gradients are affine, so a face is subdivided where the midpoint
   * color differs appreciably from its perspective-correct value.
   * @param {Array} points Projected triangle vertices.
   * @param {Array} values Scalar values at the vertices.
   * @param {Object} trace Plotly color options.
   * @param {Array} range Scalar bounds.
   * @param {string} fallback Fallback paint.
   * @param {number} opacity Face opacity.
   * @param {Object} [transparent_pass] Plotly transparency pass.
   * @param {number} [level=0] Subdivision level.
   * @param {string} [clip_path] SVG clipping path.
   * @param {Function|string} [shade] Lighting transform or fixed paint.
   * @param {Function} [alpha] Scalar-to-opacity mapping.
   */
  _coloredTriangle(points, values, trace, range, fallback, opacity, transparent_pass, level = 0, clip_path, shade, alpha) {
    // Keep facets whose antialiasing stroke can extend into the viewport.
    if(!points.every(Boolean) || !this._triangleInViewport(points, 4)) {
      return;
    }
    var span = range[1] - range[0];
    var split;
    var worst = Math.max(span / 512, 0);
    if(level < 6 && span > 0 && values.every(Number.isFinite)) {
      for(let i = 0; i < 3; i++) {
        var j = (i + 1) % 3;
        var a = points[i], b = points[j];
        var corrected = (values[i] * a[3] + values[j] * b[3]) / (a[3] + b[3]);
        var error = Math.abs(corrected - (values[i] + values[j]) / 2);
        if(error > worst && Math.hypot(a[0] - b[0], a[1] - b[1]) > 3) {
          worst = error;
          split = { i, j, corrected };
        }
      }
    }
    if(split) {
      if(!clip_path && opacity == 1 && !alpha) {
        var id = this.gradient_prefix + 'face-' + this.definitions.childElementCount;
        var clip = this._node('clipPath', { id }, this.definitions);
        this._node('polygon', { points: points.map(point => this._xy(point)).join(' ') }, clip);
        clip_path = 'url(#' + id + ')';
      }
      var { i, j, corrected } = split;
      var k = (j + 1) % 3;
      var midpoint = points[i].map((value, axis) => (value + points[j][axis]) / 2);
      this._coloredTriangle([points[i], midpoint, points[k]], [values[i], corrected, values[k]],
        trace, range, fallback, opacity, transparent_pass, level + 1, clip_path, shade, alpha);
      this._coloredTriangle([midpoint, points[j], points[k]], [corrected, values[j], values[k]],
        trace, range, fallback, opacity, transparent_pass, level + 1, clip_path, shade, alpha);
      return;
    }
    var fill = this._triangleGradient(points, values, trace, range, fallback, shade, alpha);
    if(alpha && !fill.startsWith('url(')) {
      opacity *= alpha(values.reduce((sum, value) => sum + value, 0) / values.length);
    }
    this._triangle(points, fill, opacity, transparent_pass, clip_path);
  }

  /**
   * Returns the scalar-to-opacity mapping used by the trace's color texture.
   * @param {Object} trace Plotly trace options.
   * @param {Array} range Scalar bounds.
   * @returns {Function|null} Scalar-to-opacity mapping.
   */
  _opacityScale(trace, range) {
    var stops = trace.opacityscale;
    if(!Array.isArray(stops) || stops.length < 2 || !(range[1] > range[0])) {
      return null;
    }
    var sample = fraction => {
      var upper = stops.findIndex(stop => +stop[0] >= fraction);
      if(upper < 0 || !Number.isFinite(fraction)) {
        return 1;
      }
      var [a, alpha] = stops[Math.max(0, upper - 1)].map(Number);
      var [b, beta] = stops[upper].map(Number);
      return a == b ? beta : alpha + (beta - alpha) * (fraction - a) / (b - a);
    };
    var volume = trace.type === 'volume';
    // A discontinuity is filtered across neighboring texels by the volume renderer.
    var texels = volume && stops.some(([offset], i) => i > 0 && +offset === +stops[i - 1][0])
      ? Array.from({ length: 256 }, (_, i) => Math.floor(255 * sample(i / 255))) : null;
    return value => {
      var fraction = Math.max(0, Math.min(1, (value - range[0]) / (range[1] - range[0])));
      if(!texels || !Number.isFinite(fraction)) {
        var opacity = sample(fraction);
        return volume ? opacity * opacity : opacity;
      }
      var texel = Math.max(0, Math.min(255, 256 * fraction - .5));
      var i = Math.floor(texel), j = Math.ceil(texel);
      var first = texels[i], last = texels[j];
      opacity = (first + (last - first) * (texel - i)) / 255;
      return opacity * opacity;
    };
  }

  /**
   * Evaluates Plotly's mesh or surface lighting at the center of each SVG face.
   * @param {Object} trace Plotly trace options.
   * @param {Object} mesh Live Plotly mesh or surface renderer.
   * @param {Array} positions World-space vertex positions.
   * @param {boolean} [surface=false] Whether the renderer is a surface.
   * @param {Array} [vector_vertices] Expanded vector-field vertices.
   * @returns {Function|null} A function returning the face's color transform.
   */
  _faceLighting(trace, mesh, positions, surface = false, vector_vertices) {
    var gl = mesh.gl;
    var triShader = surface ? mesh._shader : mesh.triShader;
    if(!triShader?.program || mesh.ambientLight >= 1 && !mesh.specularLight) {
      return null;
    }
    var uniform = name => {
      var location = gl.getUniformLocation(triShader.program, name);
      return location ? gl.getUniform(triShader.program, location) : null;
    };
    var inverse = uniform('inverseModel');
    var light = uniform('lightPosition');
    var eye = uniform('eyePosition');
    if(!inverse || !light || !eye) {
      return null;
    }
    var dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
    var subtract = (a, b) => Array.from(a, (value, i) => value - b[i]);
    var cross = (a, b) => a.map((_, i) => a[(i + 1) % 3] * b[(i + 2) % 3] -
      a[(i + 2) % 3] * b[(i + 1) % 3]);
    var normalize = a => {
      var length = Math.hypot(...a);
      return length ? a.map(value => value / length) : a;
    };
    var epsilon = trace.lighting?.vertexnormalsepsilon ?? .000001;
    var face_normal = world => {
      var [a, b, c] = world;
      var normal = cross(subtract(b, a), subtract(c, a));
      return dot(normal, normal) > (trace.lighting?.facenormalsepsilon ?? .000001)
        ? normalize(normal) : [0, 0, 0];
    };
    var normals;
    if(!surface && !vector_vertices && !trace.flatshading) {
      normals = positions.map(() => [0, 0, 0]);
      for(const cell of mesh.cells) {
        cell.forEach((index, i) => {
          var a = subtract(positions[cell[(i + 1) % 3]], positions[index]);
          var b = subtract(positions[cell[(i + 2) % 3]], positions[index]);
          var product = dot(a, a) * dot(b, b);
          if(product > epsilon) {
            var weight = Math.sqrt(product);
            cross(a, b).forEach((value, k) => { normals[index][k] += value / weight; });
          }
        });
      }
      normals = normals.map(normal => dot(normal, normal) > epsilon ? normalize(normal) : [0, 0, 0]);
    }
    return (cell, points, world = cell.map(index => positions[index]), surface_normals) => {
      if(!points.every(Boolean)) {
        return null;
      }
      var [a, b, c] = points;
      var positive = (b[0] - a[0]) * (c[1] - a[1]) > (b[1] - a[1]) * (c[0] - a[0]);
      // The surface normals come from the grid and have the opposite winding from its faces.
      var flip = (positive ? -1 : 1) * (surface_normals ? -1 : 1);
      var transform_normal = normal => normalize([0, 1, 2].map(i =>
        flip * dot(normal, inverse.subarray(i * 4, i * 4 + 3))));
      var vertex_normals = surface_normals || (vector_vertices ? cell.map(index => vector_vertices[index].normal)
        : normals ? cell.map(index => normals[index]) : null);
      var transformed = vertex_normals?.map(transform_normal);
      var center_normal = transformed ? normalize([0, 1, 2].map(i =>
        transformed.reduce((sum, normal) => sum + normal[i], 0))) : transform_normal(face_normal(world));
      var normal_at = () => center_normal;
      if(transformed && !vector_vertices) {
        var u = subtract(world[1], world[0]), v = subtract(world[2], world[0]);
        var uu = dot(u, u), uv = dot(u, v), vv = dot(v, v);
        var determinant = uu * vv - uv * uv;
        if(determinant > 0) {
          normal_at = sample => {
            var offset = subtract(sample, world[0]);
            var su = dot(offset, u), sv = dot(offset, v);
            var second = (vv * su - uv * sv) / determinant;
            var third = (uu * sv - uv * su) / determinant;
            // GLSL interpolates vertex normals first, then normalizes the fragment normal.
            return normalize(transformed[0].map((value, i) =>
              value * (1 - second - third) + transformed[1][i] * second + transformed[2][i] * third));
          };
        }
      }
      var coordinates = vector_vertices ? world.map((point, i) => {
        var transformed = this._multiply(this.camera.model, [point[0], point[1], point[2], 1]);
        return vector_vertices[cell[i]].offset.map((offset, k) => offset + transformed[k]);
      }) : world;
      var center = [0, 1, 2].map(i => coordinates.reduce((sum, point) => sum + point[i], 0) / 3);
      var paint_at = sample => {
        var n = normal_at(sample);
        var camera_point = surface ? this._multiply(this.camera.model, [...sample, 1]) : [...sample, 1];
        var camera = this._multiply(this.camera.view, camera_point).slice(0, 3);
        var l = normalize(subtract(light, camera));
        var v = normalize(subtract(eye, camera));
        var nl = Math.max(0, dot(n, l));
        var nv = Math.max(0, dot(n, v));
        var diffuse = Math.min(1, mesh.ambientLight + mesh.diffuseLight * nl);
        var specular = 0;
        if(mesh.specularLight && mesh.roughness > 0 && (surface || nv > 0 && nl > 0)) {
          var h = normalize(l.map((value, i) => value + v[i]));
          var nh = Math.max(0, dot(n, h));
          var g = Math.min(1, 2 * nh * nv / Math.max(.000001, dot(v, h)),
            2 * nh * nl / Math.max(.000001, dot(l, h)));
          var cos2 = Math.max(nh, .0001) ** 2;
          var roughness2 = mesh.roughness ** 2;
          var d = Math.exp((cos2 - 1) / (cos2 * roughness2)) /
            (Math.PI * roughness2 * cos2 ** 2);
          var f = Math.max(0, 1 - nv) ** mesh.fresnel;
          specular = mesh.specularLight * (surface ? d : Math.min(1, g * f * d / Math.max(Math.PI * nv, .000001)));
        }
        return color => {
          var channels = this._rgb(color);
          var lit = channels.slice(0, 3).map(value => Math.min(255, Math.round(value * diffuse + 255 * specular)));
          return channels.length == 4 ? 'rgba(' + [...lit, channels[3]].join(',') + ')' : 'rgb(' + lit.join(',') + ')';
        };
      };
      var paint = paint_at(center);
      if(!vector_vertices) {
        paint_at.specular_roughness = mesh.specularLight > 0 ? mesh.roughness : 0;
        paint.at = paint_at;
      }
      return paint;
    };
  }

  /**
   * Reads the data-space clipping box used by a live trace shader.
   * @param {WebGLRenderingContext} gl Plotly's WebGL context.
   * @param {Object} shader Plotly's shader wrapper.
   * @param {string} name Name of the clipping uniform.
   * @returns {Array|null} Axis-aligned bounds.
   */
  _clipBounds(gl, shader, name = 'clipBounds') {
    if(!shader?.program) {
      return null;
    }
    var bounds = [0, 1].map(index => {
      var location = gl.getUniformLocation(shader.program, name + '[' + index + ']');
      return location ? gl.getUniform(shader.program, location) : null;
    });
    if(!bounds.every(Boolean)) {
      return null;
    }
    return [Array.from(bounds[0], (value, i) => Math.min(value, bounds[1][i])),
      Array.from(bounds[0], (value, i) => Math.max(value, bounds[1][i]))];
  }

  /**
   * Clips a triangle and its attributes against the data box and camera frustum.
   * @param {Array} world World-space triangle vertices.
   * @param {Array} projected Projected triangle vertices.
   * @param {Array} scalars Per-vertex attributes.
   * @param {Array} bounds Data-space clipping bounds.
   * @param {Array} [offsets] Optional world-space offsets.
   * @returns {Array} Projected triangles, interpolated scalar values, and world coordinates.
   */
  _clipTriangle(world, projected, scalars, bounds, offsets) {
    if(world.some(point => !point || [0, 1, 2].some(i => !Number.isFinite(point[i])))) {
      return [];
    }
    var inside_data = !bounds || world.every(point =>
      bounds[0].every((value, i) => point[i] >= value && point[i] <= bounds[1][i]));
    var inside_depth = !this.camera || projected.every(point => point && point[2] >= -1 && point[2] <= 1);
    if(inside_data && inside_depth) {
      return [[projected, scalars, world]];
    }
    var vertices = world.map((point, i) => ({ point: point.slice(0, 3), scalar: scalars[i],
      offset: offsets?.[i], distances: this._clipDistances(point, inside_data ? null : bounds,
        !inside_depth, offsets?.[i]) }));
    for(let plane = 0; plane < vertices[0].distances.length; plane++) {
      var clipped = [];
      for(let i = 0; i < vertices.length; i++) {
        var a = vertices[i], b = vertices[(i + 1) % vertices.length];
        var first = a.distances[plane], last = b.distances[plane];
        if(first >= 0) {
          clipped.push(a);
        }
        if(first * last < 0) {
          var t = first / (first - last);
          var interpolate = (a, b) => a.map((value, k) => value + t * (b[k] - value));
          var scalar = Array.isArray(a.scalar) ? interpolate(a.scalar, b.scalar)
            : a.scalar + t * (b.scalar - a.scalar);
          clipped.push({ point: interpolate(a.point, b.point), scalar,
            offset: a.offset && interpolate(a.offset, b.offset),
            distances: interpolate(a.distances, b.distances) });
        }
      }
      vertices = clipped;
      if(vertices.length < 3) {
        return [];
      }
    }
    var points = vertices.map(vertex => this._project(vertex.point, vertex.offset));
    var values = vertices.map(vertex => vertex.scalar);
    var triangles = [];
    for(let i = 1; i < points.length - 1; i++) {
      triangles.push([[points[0], points[i], points[i + 1]], [values[0], values[i], values[i + 1]],
        [vertices[0].point, vertices[i].point, vertices[i + 1].point]]);
    }
    return triangles;
  }

  /**
   * Creates the clipping-plane distances for a world-space point.
   * @param {Array} point World-space point.
   * @param {Array} [bounds] Data-space clipping bounds.
   * @param {Array} camera Homogeneous camera coordinates.
   * @param {Array} [offset] Optional world-space offset.
   * @param {Function} project_clip Clip-coordinate projection callback.
   * @returns {Array} Signed clipping-plane distances.
   */
  _clipDistances(point, bounds, camera, offset, project_clip) {
    var distances = [];
    if(bounds) {
      for(let i = 0; i < 3; i++) {
        distances.push(point[i] - bounds[0][i], bounds[1][i] - point[i]);
      }
    }
    if(camera && this.camera) {
      var [x, y, z, w] = project_clip ? project_clip(point) : this._clipCoordinates(point, offset);
      distances.push(w + x, w - x, w + y, w - y, w + z, w - z);
    }
    return distances;
  }

  /**
   * Projects the portion of a segment inside the renderer's data box.
   * @param {Array} a First world-space endpoint.
   * @param {Array} b Second world-space endpoint.
   * @param {Array} [bounds] Data-space clipping bounds.
   * @param {Function} [project_clip] Clip-coordinate projection callback.
   * @returns {Array} Up to two projected endpoints.
   */
  _clipSegment(a, b, bounds, project_clip) {
    var first = this._clipDistances(a, bounds, true, null, project_clip);
    var last = this._clipDistances(b, bounds, true, null, project_clip);
    var start = 0, end = 1;
    for(let i = 0; i < first.length; i++) {
      if(first[i] < 0 && last[i] < 0) {
        return [];
      }
      if(first[i] < 0) {
        start = Math.max(start, first[i] / (first[i] - last[i]));
      } else if(last[i] < 0) {
        end = Math.min(end, first[i] / (first[i] - last[i]));
      }
      if(start > end) {
        return [];
      }
    }
    var points = [start, end].map(t => {
      var point = a.map((value, i) => value + t * (b[i] - value));
      return project_clip ? this._projectClip(project_clip(point)) : this._project(point);
    });
    return [...points, start, end];
  }

  /**
   * Draws a face with independently varying RGB and alpha as vector facets.
   * @param {Array} points Projected triangle vertices.
   * @param {Array} colors Per-vertex RGBA colors.
   * @param {number} opacity Face opacity.
   * @param {Object} [transparent_pass] Plotly transparency pass.
   * @param {Function|string} [shade] Lighting transform or fixed paint.
   * @param {number} [level=0] Subdivision level.
   * @param {string} [clip_path] SVG clipping path.
   */
  _vertexColorTriangle(points, colors, opacity, transparent_pass, shade, level = 0, clip_path) {
    if(!points.every(Boolean) || !this._triangleInViewport(points, 3)) {
      return;
    }
    if(level === 0 && colors.every(color => color.every(channel => channel >= 0 && channel <= 255))) {
      var ramp = this._vertexColorRamp(colors);
      var perspective_trace = ramp && this._perspectiveVertexRamp(points, ramp);
      if(perspective_trace) {
        var perspective_alpha = this._opacityScale(perspective_trace, [0, 1]);
        var fill = this._triangleGradient(points, perspective_trace.values, perspective_trace, [0, 1],
          ramp.colorscale[0][1], shade, perspective_alpha);
        var face_opacity = perspective_alpha ? opacity : opacity * colors[0][3] / 255;
        if(perspective_alpha && !fill.startsWith('url(')) {
          var [a, b, c] = perspective_trace.values;
          face_opacity *= perspective_alpha((a + b + c) / 3);
        }
        this._triangle(points, fill, face_opacity, transparent_pass, clip_path);
        return;
      }
      if(ramp && (!ramp.opacityscale || points.every(point => point[3] === points[0][3]))) {
        var { values, colorscale, opacityscale } = ramp;
        var trace = { colorscale, opacityscale };
        var alpha = opacityscale ? this._opacityScale(trace, [0, 1]) : null;
        this._coloredTriangle(points, values, trace, [0, 1], colorscale[0][1],
          alpha ? opacity : opacity * colors[0][3] / 255, transparent_pass, 0, clip_path, shade, alpha);
        return;
      }
    }
    var width = Math.max(...points.map((point, i) =>
      Math.hypot(point[0] - points[(i + 1) % 3][0], point[1] - points[(i + 1) % 3][1])));
    var variation = Math.max(...[0, 1, 2, 3].map(k =>
      Math.max(...colors.map(color => color[k])) - Math.min(...colors.map(color => color[k]))));
    if(level < 6 && width > 2.5 && variation > 5) {
      if(!clip_path && opacity == 1 && !transparent_pass && colors.every(color => color[3] == 255)) {
        var id = this.gradient_prefix + 'vertex-face-' + this.definitions.childElementCount;
        var clip = this._node('clipPath', { id }, this.definitions);
        this._node('polygon', { points: points.map(point => this._xy(point)).join(' ') }, clip);
        clip_path = 'url(#' + id + ')';
      }
      var mids = points.map((point, i) => point.map((value, k) => (value + points[(i + 1) % 3][k]) / 2));
      var mid_colors = colors.map((color, i) => {
        var j = (i + 1) % 3;
        return color.map((value, k) => value === colors[j][k] ? value :
          (value * points[i][3] + colors[j][k] * points[j][3]) / (points[i][3] + points[j][3]));
      });
      for(let i = 0; i < 3; i++) {
        var previous = (i + 2) % 3;
        this._vertexColorTriangle([points[i], mids[i], mids[previous]],
          [colors[i], mid_colors[i], mid_colors[previous]], opacity, transparent_pass, shade, level + 1, clip_path);
      }
      this._vertexColorTriangle(mids, mid_colors, opacity, transparent_pass, shade, level + 1, clip_path);
      return;
    }
    var weight = points.reduce((sum, point) => sum + point[3], 0);
    var color = colors[0].map((value, k) =>
      value === colors[1][k] && value === colors[2][k] ? value :
        colors.reduce((sum, vertex, i) => sum + vertex[k] * points[i][3], 0) / weight);
    var fill = 'rgb(' + color.slice(0, 3).map(Math.round).join(',') + ')';
    this._triangle(points, shade ? shade(fill) : fill, opacity * color[3] / 255, transparent_pass, clip_path);
  }

  /**
   * Builds a single gradient when both the weighted ramp value and reciprocal depth
   * vary along the same screen-space axis.
   * @param {Array} points Projected triangle vertices.
   * @param {Object} ramp Scalar values and color or opacity scales.
   * @returns {Object|null} Perspective ramp definition.
   */
  _perspectiveVertexRamp(points, { values, colorscale, opacityscale }) {
    var first = points[values.indexOf(0)][3];
    var last = points[values.indexOf(1)][3];
    if(first === last) {
      return null;
    }
    var projected_values = values.map(value => value * first / ((1 - value) * last + value * first));
    if(!projected_values.every((value, i) =>
      Math.abs(points[i][3] - (first + (last - first) * value)) <= 1e-7 * Math.max(first, last))) {
      return null;
    }
    var trace = { values: projected_values, colorscale: [], opacityscale: opacityscale ? [] : null };
    var alpha = this._opacityScale({ opacityscale }, [0, 1]);
    for(let i = 0; i <= 16; i++) {
      var offset = i / 16;
      var fraction = offset * last / ((1 - offset) * first + offset * last);
      trace.colorscale.push([offset, this._color({ colorscale }, [0, 1], fraction, colorscale[0][1])]);
      if(alpha) {
        trace.opacityscale.push([offset, alpha(fraction)]);
      }
    }
    return trace;
  }

  /**
   * Finds a scalar interpolation axis for vertex colors on one RGBA ramp.
   * @param {Array} colors Per-vertex RGBA colors.
   * @returns {Object|null} Scalar values and color or opacity scales.
   */
  _vertexColorRamp(colors) {
    var fixed_alpha = colors.every(color => color[3] === colors[0][3]);
    var channels = fixed_alpha ? [0, 1, 2] : [0, 1, 2, 3];
    var range = channels.map(channel => {
      var ordered = colors.slice().sort((a, b) => a[channel] - b[channel]);
      var [from, , to] = ordered;
      return { channel, from, to, span: to[channel] - from[channel] };
    }).sort((a, b) => b.span - a.span)[0];
    if(!range.span) {
      return null;
    }
    var { channel, from, to, span } = range;
    var values = colors.map(color => (color[channel] - from[channel]) / span);
    if(!colors.every((color, i) => channels.every(k =>
      Math.abs(color[k] - (from[k] + values[i] * (to[k] - from[k]))) < .000001))) {
      return null;
    }
    var colorscale = [from, to].map((color, i) => [i, 'rgb(' + color.slice(0, 3).map(Math.round).join(',') + ')']);
    var opacityscale = fixed_alpha ? null : [[0, from[3] / 255], [1, to[3] / 255]];
    return { values, colorscale, opacityscale };
  }

  /**
   * Reconstructs a Plotly mesh3d, cone, streamtube, volume, or isosurface mesh.
   * @param {Object} trace Plotly trace options.
   * @param {Object} mesh Live Plotly mesh renderer.
   * @param {Object} [world] Current animated world coordinates.
   */
  _mesh(trace, mesh, world) {
    var positions = world
      ? Array.from(world.x, (_, i) => ['x', 'y', 'z'].map((axis, k) => world[axis][i] * this.scene.dataScale[k]))
      : mesh.positions;
    var vector_vertices = mesh.vectors ? positions.map((point, i) => this._vectorVertex(mesh, point, i)) : null;
    var offsets = vector_vertices?.map(vertex => vertex.offset);
    var points = positions.map((point, i) => this._project(point, offsets?.[i]));
    var bounds = this._clipBounds(mesh.gl, mesh.triShader);
    // Plotly stores vector magnitudes in units of the trace's maximum norm.
    var norm = mesh.vectors && trace._normMax > 0 ? trace._normMax : 1;
    var range = this._range(mesh.intensity, trace.cmin == null ? undefined : trace.cmin / norm,
      trace.cmax == null ? undefined : trace.cmax / norm);
    var fallback = trace.color || '#1f77b4';
    var has_intensity = trace.type != 'mesh3d' || trace.intensity;
    var vertex_colors = !has_intensity && trace.vertexcolor?.map(value => {
      var color = this._rgb(value);
      return [color[0], color[1], color[2], 255 * (color[3] ?? 1)];
    });
    var face_colors = !has_intensity && !vertex_colors && trace.facecolor?.map(value => {
      var [r, g, b, a = 1] = this._rgb(value);
      return 'rgba(' + [r, g, b, a].join(',') + ')';
    });
    var gradient_color = has_intensity && trace.intensitymode != 'cell';
    var lighting = this._faceLighting(trace, mesh, positions, false, vector_vertices);
    var alpha = this._opacityScale(trace, range);
    var constant_texture = has_intensity && (!alpha || trace.type === 'volume') && Array.isArray(trace.colorscale)
      ? this._filteredMeshTextureScale(trace.colorscale, 0) : null;
    var opacity = mesh.opacity ?? trace.opacity ?? 1;
    var transparent_pass = mesh.hasAlpha || mesh.isTransparent?.() ? mesh : null;
    var transparency = opacity > 0 && opacity < 1 ? { opacity, pass: transparent_pass } : null;
    var opaque_vertices = vertex_colors && vertex_colors.every(color => color[3] === 255);
    var opaque_scale = transparency && gradient_color && !alpha && Array.isArray(trace.colorscale) &&
      trace.colorscale.every(([, color]) => (this._rgb(color)[3] ?? 1) === 1);
    var opaque_faces = transparency && !lighting && !vertex_colors && !face_colors && !has_intensity && !alpha &&
      (this._rgb(fallback)[3] ?? 1) === 1;
    var vertex_alpha = vertex_colors?.[0]?.[3];
    var complete_vertex_alpha = transparent_pass && vertex_colors && !opaque_vertices && opacity > 0 &&
      positions.every((_, i) => vertex_colors[i]?.[3] >= 0 && vertex_colors[i][3] <= 255);
    var uniform_vertex_alpha = complete_vertex_alpha &&
      vertex_alpha > 0 && vertex_alpha < 255 && vertex_colors.every(color => color[3] === vertex_alpha);
    var shared_transparency = (transparency && (opaque_vertices || opaque_scale || opaque_faces) ||
      complete_vertex_alpha) && this._meshIsNonoverlapping(mesh.cells, points);
    var shared_mask;
    var shared_mask_element;
    if(shared_transparency && complete_vertex_alpha && !uniform_vertex_alpha) {
      var gradient = this._surfaceGradient([points], [vertex_colors.map(color => color[3] / 255)], {}, [0, 1],
        value => value, true);
      var box = { x: 0, y: 0, width: this.width, height: this.height };
      if(gradient?.startsWith('url(')) {
        shared_mask = this._surfaceMask(gradient, box);
      } else {
        shared_mask_element = this._opacityMask(box);
        shared_mask = 'url(#' + shared_mask_element.id + ')';
      }
    }
    var face_opacity = shared_transparency ? 1 : opacity;
    var face_pass = shared_transparency ? null : transparent_pass;
    var first_face = this.primitives.length;
    mesh.cells.forEach((cell, i) => {
      var projected = cell.map(index => points[index]);
      var scalars = cell.map(index => mesh.intensity?.[index]);
      var value = trace.intensitymode == 'cell' ? trace.intensity?.[i] :
        scalars.reduce((sum, scalar) => sum + scalar, 0) / cell.length;
      var fill = face_colors?.[i] || (has_intensity ? this._color(trace, range, value, fallback) : fallback);
      if(constant_texture && Number.isFinite(value) &&
          (!gradient_color || scalars.every(scalar => scalar === scalars[0]))) {
        fill = constant_texture.color(range[1] > range[0] ? (value - range[0]) / (range[1] - range[0]) : .5);
      }
      var attributes = vertex_colors ? cell.map(index => vertex_colors[index] || [127.5, 127.5, 127.5, 255])
        : scalars;
      var triangles = this._clipTriangle(cell.map(index => positions[index]), projected, attributes,
        bounds, offsets && cell.map(index => offsets[index]));
      var shade = triangles.length ? lighting?.(cell, projected.every(Boolean) ? projected : triangles[0][0]) : null;
      for(const [points, values, world] of triangles) {
        var colors = values;
        if(shared_transparency && complete_vertex_alpha) {
          if(shared_mask_element) {
            this._subdividedOpacityMask(points, values.map(color => color[3] / 255), [0, 1],
              null, null, shared_mask_element);
          }
          colors = values.map(([r, g, b]) => [r, g, b, 255]);
        }
        var opaque_light = shade?.at && face_opacity === 1 && !face_pass;
        var sample_light = shade?.at && (opaque_light || transparency) && this._triangleSpan(points) > 7;
        if(sample_light && vertex_colors && colors.every(color => color[3] === 255)) {
          var representative = 'rgb(' + colors[0].slice(0, 3).join(',') + ')';
          this._litFace(points, world, representative, shade.at, colors, (triangle, colors, paint) =>
            this._vertexColorTriangle(triangle, colors, 1, null, paint), shared_transparency ? null : transparency);
        } else if(sample_light && gradient_color && !alpha) {
          this._litFace(points, world, fill, shade.at, values, (triangle, scalars, paint) =>
            this._coloredTriangle(triangle, scalars, trace, range, fill, 1, null, 0, null, paint),
            shared_transparency ? null : transparency);
        } else if(vertex_colors && transparency && !shared_transparency && values.every(color => color[3] === 255)) {
          var first_facet = this.primitives.length;
          this._vertexColorTriangle(points, values, 1, null, shade);
          this._finishFace(this.primitives.slice(first_facet), points, transparency, true);
        } else if(vertex_colors) {
          if(transparent_pass && !shared_transparency && opacity > 0 && this._triangleInViewport(points, 3) &&
              values.every(color => color[3] >= 0 && color[3] <= 255)) {
            var vertex_opacities = values.map(color => color[3] / 255);
            var mask = this._surfaceOpacityMask(points, vertex_opacities, [0, 1], value => value) ||
              this._subdividedOpacityMask(points, vertex_opacities);
            if(mask) {
              var first_facet = this.primitives.length;
              this._vertexColorTriangle(points, values.map(([r, g, b]) => [r, g, b, 255]), 1, null, shade);
              this._finishFace(this.primitives.slice(first_facet), points, { opacity, pass: transparent_pass, mask }, true);
              continue;
            }
          }
          this._vertexColorTriangle(points, colors, face_opacity, face_pass, shade);
        } else if(gradient_color) {
          this._coloredTriangle(points, values, trace, range, fill, face_opacity, face_pass, 0, null, shade, alpha);
        } else if(opaque_light) {
          this._litFace(points, world, fill, shade.at);
        } else if(shade?.at && transparency && !alpha && (this._rgb(fill)[3] ?? 1) === 1) {
          this._litFace(points, world, fill, shade.at, null, null, transparency);
        } else {
          this._triangle(points, shade ? shade(fill) : fill, face_opacity * (alpha?.(value) ?? 1), face_pass);
        }
      }
    });
    var faces = this.primitives.slice(first_face);
    if(mesh.cells.length >= 4096) {
      for(const face of faces) {
        face.seam_underlay = true;
      }
    }
    if(shared_transparency) {
      this._sealGradientFaces(faces, null, opaque_faces ? .5 : 1.5, true);
      for(const face of faces) {
        face.group_opacity = uniform_vertex_alpha ? opacity * vertex_alpha / 255 : opacity;
        face.group_mask = shared_mask;
        face.transparent_pass = transparent_pass;
      }
    } else if(opacity === 1 && !transparent_pass &&
        (mesh.cells.length > 256 && gradient_color && !alpha ||
          opaque_vertices && faces.some(face => face.attrs['clip-path']))) {
      // Cover seams between clipped facets while keeping the original mesh silhouette.
      this._sealGradientFaces(faces, null, gradient_color ? 1.8 : 1.5, true);
    }
  }

  /**
   * Checks whether sharing one opacity would change the stacking of projected mesh faces.
   * @param {Array} cells Mesh triangle indices.
   * @param {Array} projected Projected mesh vertices.
   * @returns {boolean} Whether the projected faces do not overlap.
   */
  _meshIsNonoverlapping(cells, projected) {
    var faces = cells.map(cell => ({ points: cell.map(index => projected[index]) }));
    if(faces.some(face => face.points.length !== 3 || !face.points.every(Boolean))) {
      return false;
    }
    var visible = this._visibleTransparentFaces(faces, faces, true);
    return visible?.length === faces.length && visible.every((face, i) => face === faces[i]);
  }

  /**
   * Paints a face with a vector approximation of spatially varying lighting.
   * @param {Array} points Projected triangle vertices.
   * @param {Array} world World-space triangle vertices.
   * @param {string} fill Base paint.
   * @param {Function} paint_at Lighting sampler.
   * @param {Array} [attributes] Per-vertex scalar or color attributes.
   * @param {Function} [draw] Facet drawing callback.
   * @param {Object} [transparency] Shared transparency settings.
   */
  _litFace(points, world, fill, paint_at, attributes, draw, transparency) {
    var first_facet = this.primitives.length;
    this._litTriangle(points, world, fill, paint_at, attributes, draw);
    if(!transparency && this.primitives.length <= first_facet + 1) {
      return;
    }
    this._finishFace(this.primitives.slice(first_facet), points, transparency);
  }

  /**
   * Clips a face's facets and applies their shared transparency.
   * @param {Array} facets Generated face facets.
   * @param {Array} points Original projected face vertices.
   * @param {Object} transparency Shared transparency settings.
   * @param {boolean} [share_subdivision_clip=false] Whether facets share one clipping path.
   */
  _finishFace(facets, points, transparency, share_subdivision_clip = false) {
    // Overlapping strokes would blend twice when the paint itself carries opacity.
    if(facets.length > 1 && !transparency?.varying) {
      this._sealGradientFaces(facets, points, 1, share_subdivision_clip);
    }
    if(transparency) {
      for(const facet of facets) {
        facet.transparent_pass = transparency.pass;
        facet.group_mask = transparency.mask;
        if(facets.length > 1 && !transparency.varying) {
          facet.group_opacity = transparency.opacity;
        } else {
          facet.attrs.opacity *= transparency.opacity;
          facet.attrs.stroke = null;
        }
      }
    }
  }

  /**
   * Recursively subdivides a face until its sampled lighting is visually smooth.
   * @param {Array} points Projected triangle vertices.
   * @param {Array} world World-space triangle vertices.
   * @param {string} fill Base paint.
   * @param {Function} paint_at Lighting sampler.
   * @param {Array} [attributes] Per-vertex scalar or color attributes.
   * @param {Function} [draw] Facet drawing callback.
   * @param {number} [level=0] Subdivision level.
   */
  _litTriangle(points, world, fill, paint_at, attributes, draw, level = 0) {
    if(!this._triangleInViewport(points)) {
      return;
    }
    var center = world[0].map((value, axis) => (value + world[1][axis] + world[2][axis]) / 3);
    var shade = paint_at(center);
    var paint = shade(fill);
    var span = this._triangleSpan(points);
    var roughness = paint_at.specular_roughness;
    var sharp_highlight = roughness > 0 && roughness < .06;
    if(level < (sharp_highlight ? 8 : 5) && span > (sharp_highlight ? 1 : 7)) {
      var world_mid = world.map((point, i) => point.map((value, axis) => (value + world[(i + 1) % 3][axis]) / 2));
      // A narrow specular lobe can sit inside one child without touching an edge sample.
      var locations = roughness ? [...world, ...world_mid, ...world.map((point, i) =>
        point.map((value, axis) => (value + world_mid[i][axis] + world_mid[(i + 2) % 3][axis]) / 3))] : world;
      var samples = [...locations.map(point => paint_at(point)(fill)), paint].map(color => this._rgb(color));
      var variation = Math.max(...[0, 1, 2].map(axis =>
        Math.max(...samples.map(color => color[axis])) - Math.min(...samples.map(color => color[axis]))));
      if(variation > (sharp_highlight ? 4 : 8)) {
        var middle = world_mid.map(point => this._project(point));
        var attribute_mid = attributes?.map((value, i) => {
          var next = attributes[(i + 1) % 3];
          return Array.isArray(value) ? value.map((channel, j) => (channel + next[j]) / 2) : (value + next) / 2;
        });
        for(let i = 0; i < 3; i++) {
          var previous = (i + 2) % 3;
          this._litTriangle([points[i], middle[i], middle[previous]],
            [world[i], world_mid[i], world_mid[previous]], fill, paint_at,
            attributes && [attributes[i], attribute_mid[i], attribute_mid[previous]], draw, level + 1);
        }
        this._litTriangle(middle, world_mid, fill, paint_at, attribute_mid, draw, level + 1);
        return;
      }
    }
    if(draw) {
      draw(points, attributes, shade);
    } else {
      this._triangle(points, paint, 1, null);
    }
  }

  /**
   * Tests whether a triangle intersects the viewport with edge padding.
   * @param {Array} points Projected triangle vertices.
   * @param {number} [padding=1] Viewport padding.
   * @returns {boolean} Whether the triangle can affect the viewport.
   */
  _triangleInViewport(points, padding = 1) {
    return !(points.every(([x]) => x < -padding) || points.every(([x]) => x > this.width + padding) ||
      points.every(([, y]) => y < -padding) || points.every(([, y]) => y > this.height + padding));
  }

  /**
   * Returns the longest projected edge of a triangle.
   * @param {Array} points Projected triangle vertices.
   * @returns {number} Longest edge in SVG pixels.
   */
  _triangleSpan(points) {
    return Math.max(...points.map((point, i) =>
      Math.hypot(point[0] - points[(i + 1) % 3][0], point[1] - points[(i + 1) % 3][1])));
  }

  /**
   * Applies one silhouette clip to related gradient facets and seals their shared edges.
   * @param {Array} faces Gradient face primitives.
   * @param {Array} [outline] Explicit silhouette vertices.
   * @param {number} [overlap=1] Shared-edge overlap multiplier.
   * @param {boolean} [share_subdivision_clip=false] Whether subdivision facets share the clip.
   */
  _sealGradientFaces(faces, outline, overlap = 1, share_subdivision_clip = false) {
    // Overlap neighboring opaque gradient faces to cover gaps from antialiasing.
    if(faces.length) {
      var id = this.gradient_prefix + 'mesh-' + this.definitions.childElementCount;
      for(const face of faces) {
        var { attrs } = face;
        if(share_subdivision_clip && attrs['clip-path']) {
          // The shared silhouette bounds the overlap between subdivided faces.
          attrs['clip-path'] = null;
          attrs['stroke-width'] = 1;
        }
        if(attrs.stroke && !attrs['clip-path']) {
          // Limit overlap on the smallest lighting facets so they retain their brightness profile.
          var width = face.mesh_clip ? attrs['stroke-width'] :
            outline ? Math.min(1, Math.max(.35, this._triangleSpan(face.points) / 2)) : 1;
          attrs['stroke-width'] = width * overlap;
        }
        face.mesh_clip = 'url(#' + id + ')';
      }
      var clip = this._node('clipPath', { id }, this.definitions);
      if(outline) {
        this._node('polygon', { points: outline.map(point => this._xy(point)).join(' ') }, clip);
      } else {
        this._node('path', { d: this._meshOutline(faces) }, clip);
      }
    }
  }

  /**
   * Cancels opposing edges before writing the mesh's nonzero-winding clip path.
   * The remaining cycles retain the winding of all the projected triangles.
   * @param {Array} faces Projected mesh faces.
   * @returns {string} SVG silhouette path.
   */
  _meshOutline(faces) {
    var outgoing = new Map();
    var remove = (start, end, edges) => {
      var count = edges.get(end);
      if(count > 1) {
        edges.set(end, count - 1);
      } else {
        edges.delete(end);
        if(!edges.size) {
          outgoing.delete(start);
        }
      }
    };
    for(const { points } of faces) {
      var [a, b, c] = points;
      var area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      var corners = (area < 0 ? [a, c, b] : points).map(point => this._xy(point));
      for(let i = 0; i < corners.length; i++) {
        var start = corners[i];
        var end = corners[(i + 1) % corners.length];
        if(start === end) {
          continue;
        }
        var reverse = outgoing.get(end);
        if(reverse?.has(start)) {
          remove(end, start, reverse);
        } else {
          var forward = outgoing.get(start) || new Map();
          forward.set(end, (forward.get(end) || 0) + 1);
          outgoing.set(start, forward);
        }
      }
    }
    var paths = [];
    while(outgoing.size) {
      var first = outgoing.keys().next().value;
      var vertex = first;
      var cycle = [];
      do {
        cycle.push(vertex);
        var edges = outgoing.get(vertex);
        var next = edges.keys().next().value;
        remove(vertex, next, edges);
        vertex = next;
      } while(vertex !== first);
      paths.push('M' + cycle.join('L') + 'Z');
    }
    return paths.join('');
  }

  /**
   * Reconstructs a Plotly surface trace as projected SVG facets and contours.
   * @param {Object} trace Plotly trace options.
   * @param {Object} surface Live Plotly surface renderer.
   */
  _surface(trace, surface) {
    // Plotly stores the padded grid after axis conversion, gap filling and refinement.
    var [columns, rows] = surface.shape;
    var coordinates = Array.from({ length: rows }, (_, j) => Array.from({ length: columns }, (_, i) => {
      var point = surface._field.map((field, axis) => field.get(i + 1, j + 1) + surface.objectOffset[axis]);
      return point.every(Number.isFinite) ? point : null;
    }));
    var scalar = coordinates.map((row, j) => row.map((point, i) =>
      trace.surfacecolor ? surface.intensity.get(i, j) : point?.[2]));
    var projected = coordinates.map(row => row.map(point => this._project(point)));
    var range = surface.intensityBounds;
    var lighting = this._faceLighting(trace, surface, null, true);
    var normals = lighting ? coordinates.map((row, j) => row.map((point, i) =>
      point && this._surfaceNormal(surface._field, i + 1, j + 1))) : null;
    var alpha = this._opacityScale(trace, range);
    var vertex_colors;
    if(Array.isArray(trace.colorscale)) {
      var texture_scale = this._surfaceTextureScale(trace, surface);
      var [low, high] = range;
      var ratio = value => Number.isFinite(value) && high > low ? (value - low) / (high - low) : .5;
      if(surface.vertexColor) {
        vertex_colors = scalar.map(row => row.map(value => texture_scale.sample(ratio(value))));
      } else {
        this.surface_scales.set(trace.colorscale, texture_scale);
      }
      if(texture_scale?.alpha) {
        alpha = value => texture_scale.alpha(ratio(value));
      }
    }
    var transparent_surface = surface.isTransparent() ? surface : null;
    var opacity = surface.opacity ?? trace.opacity ?? 1;
    var transparency = transparent_surface && opacity > 0 && opacity < 1
      ? { opacity, pass: transparent_surface } : null;
    var varying_transparency = alpha && transparent_surface && opacity > 0
      ? { opacity, pass: transparent_surface, varying: true } : null;
    var sample_lighting = !transparent_surface || transparency;
    // Paint a nonoverlapping grid before applying a shared opacity or mask.
    var shared_opacity = null;
    var shared_mask;
    var shared_mask_element;
    if(transparent_surface && opacity > 0 && lighting && !vertex_colors &&
        (this._surfaceGridIsNonoverlapping(projected) ||
          !this.camera._ortho && this._surfaceGridIsNonoverlapping(projected, true))) {
      if(!alpha) {
        shared_opacity = opacity;
      } else if(texture_scale?.alpha) {
        var samples = scalar.flat();
        var [min, max] = this._range(samples);
        var start = ratio(min), end = ratio(max);
        var sampled_alpha = texture_scale.alpha(start);
        if(samples.every(Number.isFinite) && texture_scale.alpha(end) === sampled_alpha &&
            texture_scale.stops.every(([stop]) =>
              stop <= start || stop >= end || texture_scale.alpha(stop) === sampled_alpha)) {
          shared_opacity = opacity * sampled_alpha;
        } else if(samples.every(Number.isFinite)) {
          var gradient = this._surfaceGradient(projected, scalar, trace, range, alpha, true);
          var box = { x: 0, y: 0, width: this.width, height: this.height };
          if(gradient?.startsWith('url(')) {
            shared_mask = this._surfaceMask(gradient, box);
          } else {
            shared_mask_element = this._opacityMask(box);
            shared_mask = 'url(#' + shared_mask_element.id + ')';
          }
          shared_opacity = opacity;
        }
      }
    }
    var shared_fill = !lighting && texture_scale && !vertex_colors &&
      (!transparent_surface || this._surfaceGridIsNonoverlapping(projected.map(row => row.map(point =>
        point && (this.camera._ortho ? point : [point[0] / point[3], point[1] / point[3]])))))
      ? this._surfaceGradient(projected, scalar, trace, range, alpha) : null;
    var bounds = this._clipBounds(surface.gl, surface._shader);
    var first_face = this.primitives.length;
    var attributes = vertex_colors || scalar;
    for(let i = 1; i < columns; i++) {
      for(let j = 1; j < rows; j++) {
        var world = [coordinates[j-1][i-1], coordinates[j-1][i], coordinates[j][i], coordinates[j][i-1]];
        if(!world.every(Boolean)) {
          continue;
        }
        var values = [attributes[j-1][i-1], attributes[j-1][i], attributes[j][i], attributes[j][i-1]];
        var points = [projected[j-1][i-1], projected[j-1][i], projected[j][i], projected[j][i-1]];
        for(const indices of [[0,3,1],[2,1,3]]) {
          var world_triangle = indices.map(index => world[index]);
          if(surface.showSurface) {
            var triangle = indices.map(index => points[index]);
            var vertex_values = indices.map(index => values[index]);
            var world_normals = normals && [normals[j-1][i-1], normals[j-1][i], normals[j][i], normals[j][i-1]];
            var visible = this._clipTriangle(world_triangle, triangle, vertex_values, bounds);
            var shade = visible.length ? lighting?.(indices, triangle.every(Boolean) ? triangle : visible[0][0], world_triangle,
              world_normals && indices.map(index => world_normals[index])) : null;
            for(const [clipped, scalars, clipped_world] of visible) {
              var large_lit_face = shade?.at && this._triangleSpan(clipped) > 7;
              if(shared_fill) {
                this._triangle(clipped, shared_fill, opacity, transparent_surface);
              } else if(vertex_colors) {
                var first = scalars[0];
                var flat_color = scalars.every(color => color.every((channel, i) => channel === first[i]));
                if(shade?.at && sample_lighting && scalars.every(color => color[3] === 255) &&
                    (flat_color || large_lit_face)) {
                  this._litFace(clipped, clipped_world, 'rgb(' + first.slice(0, 3).join(',') + ')', shade.at,
                    flat_color ? null : scalars, flat_color ? null : (points, colors, lighting) =>
                      this._vertexColorTriangle(points, colors, 1, null, lighting), transparency);
                } else {
                  this._vertexColorTriangle(clipped, scalars, opacity, transparent_surface, shade);
                }
              } else {
                var value = scalars.reduce((sum, scalar) => sum + scalar, 0) / 3;
                var fill = texture_scale?.color(ratio(value)) || this._color(trace, range, value, '#1f77b4');
                if(shared_opacity != null) {
                  if(shared_opacity > 0) {
                    if(shared_mask_element) {
                      this._subdividedOpacityMask(clipped, scalars, range, alpha, texture_scale.stops, shared_mask_element);
                    }
                    if(shade?.at && scalars.every(scalar => scalar === scalars[0])) {
                      this._litFace(clipped, clipped_world, fill, shade.at);
                    } else if(large_lit_face) {
                      this._litFace(clipped, clipped_world, fill, shade.at, scalars, (points, values, lighting) =>
                        this._coloredTriangle(points, values, trace, range, fill, 1, null, 0, null, lighting));
                    } else {
                      this._coloredTriangle(clipped, scalars, trace, range, fill, 1, null, 0, null, shade);
                    }
                  }
                  continue;
                }
                if(shade?.at && sample_lighting && !alpha &&
                    scalars.every(scalar => scalar === scalars[0])) {
                  this._litFace(clipped, clipped_world, fill, shade.at, null, null, transparency);
                  continue;
                }
                if(large_lit_face && (alpha ? varying_transparency : sample_lighting)) {
                  if(!this._triangleInViewport(clipped)) {
                    continue;
                  }
                  var stops = texture_scale?.stops || trace.opacityscale;
                  var mask = varying_transparency && (this._surfaceOpacityMask(clipped, scalars, range, alpha, stops) ||
                    this._subdividedOpacityMask(clipped, scalars, range, alpha, stops));
                  var paint_alpha = mask ? null : alpha;
                  var face_alpha = mask ? { ...varying_transparency, mask, varying: false } : varying_transparency || transparency;
                  this._litFace(clipped, clipped_world, fill, shade.at, scalars, (points, values, lighting) =>
                    this._coloredTriangle(points, values, trace, range, fill, 1, null, 0, null, lighting, paint_alpha), face_alpha);
                  continue;
                }
                this._coloredTriangle(clipped, scalars, trace, range, fill, opacity,
                  transparent_surface, 0, null, shade, alpha);
              }
            }
          }
        }
      }
    }
    if(shared_opacity > 0) {
      var shared_faces = this.primitives.slice(first_face);
      this._sealGradientFaces(shared_faces, null, 1.5, true);
      for(const face of shared_faces) {
        face.transparent_pass = transparent_surface;
        face.group_opacity = shared_opacity;
        face.group_mask = shared_mask;
      }
    }
    if(columns * rows > 256 && !transparent_surface && !alpha) {
      this._sealGradientFaces(this.primitives.slice(first_face).filter(face => face.tag === 'polygon'), null, 1.25);
    }
    if(columns * rows >= 4096) {
      for(let i = first_face; i < this.primitives.length; i++) {
        this.primitives[i].seam_underlay = true;
      }
    }
    if(shared_fill) {
      for(let i = first_face; i < this.primitives.length; i++) {
        this.primitives[i].surface_fill = surface;
      }
    }
    this._surfaceContours(trace, surface, alpha);
  }

  /**
   * Creates a projected opacity mask for a surface face.
   * @param {Array} points Projected triangle vertices.
   * @param {Array} values Scalar values at the vertices.
   * @param {Array} range Scalar bounds.
   * @param {Function} alpha Scalar-to-opacity mapping.
   * @param {Array} [stops] Opacity texture stops.
   * @returns {string|null} SVG mask paint.
   */
  _surfaceOpacityMask(points, values, range, alpha, stops) {
    if(!values.every(Number.isFinite) || values.every(value => value === values[0])) {
      return null;
    }
    if(!points.every(point => point[3] === points[0][3])) {
      var low = Math.min(...values);
      var high = Math.max(...values);
      var first = points[values.indexOf(low)][3];
      var last = points[values.indexOf(high)][3];
      var fractions = values.map(value => (value - low) / (high - low));
      var project = fraction => fraction * first / ((1 - fraction) * last + fraction * first);
      var projected_values = fractions.map(project);
      if(!projected_values.every((fraction, i) =>
        Math.abs(points[i][3] - (first + (last - first) * fraction)) <= 1e-7 * Math.max(first, last))) {
        return null;
      }
      var sample = alpha;
      alpha = offset => sample(low + (high - low) * offset * last / ((1 - offset) * first + offset * last));
      stops = (stops || []).map(([offset]) => range[0] + offset * (range[1] - range[0]))
        .filter(value => value > low && value < high)
        .map(value => [project((value - low) / (high - low))]);
      for(let i = 1; i < 16; i++) {
        stops.push([i / 16]);
      }
      values = projected_values;
      range = [0, 1];
    }
    var paint = this._triangleGradient(points, values, { colorscale: [[0, '#fff'], [1, '#fff']],
      opacityscale: stops || [] }, range, '#fff', null, alpha);
    if(!paint.startsWith('url(')) {
      return null;
    }
    var x = points.map(point => point[0]);
    var y = points.map(point => point[1]);
    var box = { x: Math.min(...x) - 1, y: Math.min(...y) - 1,
      width: Math.max(...x) - Math.min(...x) + 2, height: Math.max(...y) - Math.min(...y) + 2 };
    return this._surfaceMask(paint, box);
  }

  /**
   * Wraps a paint field in a luminance mask.
   * @param {string} paint SVG grayscale paint.
   * @param {Object} box Mask bounds.
   * @returns {string} SVG mask paint.
   */
  _surfaceMask(paint, box) {
    // Encode luminance directly so PDF export needs only the surface soft mask.
    var gradient = this.definitions.querySelector(paint.slice(4, -1));
    for(const stop of gradient?.children || []) {
      var gray = Math.round(255 * Number(stop.getAttribute('stop-opacity') ?? 1));
      stop.setAttribute('stop-color', 'rgb(' + [gray, gray, gray].join(',') + ')');
      stop.removeAttribute('stop-opacity');
    }
    var mask = this._opacityMask(box);
    this._node('rect', { ...box, fill: paint }, mask);
    return 'url(#' + mask.id + ')';
  }

  /**
   * Creates a reusable opacity-mask container.
   * @param {Object} box Mask bounds.
   * @returns {Element} SVG mask element.
   */
  _opacityMask(box) {
    var id = this.gradient_prefix + 'surface-opacity-' + this.definitions.childElementCount;
    return this._node('mask', { id, maskUnits: 'userSpaceOnUse', ...box }, this.definitions);
  }

  /**
   * Paints a perspective opacity field as grayscale vector facets.
   * @param {Array} points Projected triangle vertices.
   * @param {Array} values Scalar values at the vertices.
   * @param {Array} [range] Scalar bounds.
   * @param {Function} [alpha] Scalar-to-opacity mapping.
   * @param {Array} [stops] Opacity texture stops.
   * @param {Element} [mask] Existing SVG mask element.
   * @returns {string|null} SVG mask paint.
   */
  _subdividedOpacityMask(points, values, range = [0, 1], alpha, stops, mask) {
    if(!values.every(Number.isFinite) || !mask && values.every(value => value === values[0])) {
      return null;
    }
    var colorscale = [[0, '#000'], [1, '#fff']];
    if(alpha) {
      var [min, max] = range;
      colorscale = (stops || colorscale).map(([offset]) => {
        var gray = Math.round(255 * alpha(min + (max - min) * offset));
        return [offset, 'rgb(' + [gray, gray, gray].join(',') + ')'];
      });
    }
    var first = this.primitives.length;
    var trace = { colorscale };
    var fill = this._color(trace, range, values[0], colorscale[0][1]);
    this._coloredTriangle(points, values, trace, range, fill, 1, null);
    var facets = this.primitives.splice(first);
    if(!facets.length) {
      return null;
    }
    mask ||= this._opacityMask({ x: 0, y: 0, width: this.width, height: this.height });
    for(const { attrs } of facets) {
      this._node('polygon', { ...attrs, 'clip-path': null, 'stroke-width': alpha ? 2.5 : 1.5 }, mask);
    }
    return 'url(#' + mask.id + ')';
  }

  /**
   * Shares one gradient when the surface's scalar and depth fields use the same projected axis.
   * @param {Array} projected Projected surface grid.
   * @param {Array} scalar Surface scalar grid.
   * @param {Object} trace Plotly color options.
   * @param {Array} range Scalar bounds.
   * @param {Function} [alpha] Scalar-to-opacity mapping.
   * @param {boolean} [mask=false] Whether to generate grayscale mask paint.
   * @returns {string|null} SVG gradient paint.
   */
  _surfaceGradient(projected, scalar, trace, range, alpha, mask = false) {
    if(projected.some((row, j) => row.some((point, i) => !point && Number.isFinite(scalar[j][i])))) {
      return null;
    }
    var samples = projected.flatMap((row, j) => row.flatMap((point, i) =>
      point && Number.isFinite(scalar[j][i]) ? [{ point, value: scalar[j][i] }] : []));
    if(samples.length < 3) {
      return null;
    }
    var low = samples.reduce((a, b) => a.value <= b.value ? a : b);
    var high = samples.reduce((a, b) => a.value >= b.value ? a : b);
    var [x, y] = low.point;
    var dx = high.point[0] - x, dy = high.point[1] - y;
    var area = point => dx * (point[1] - y) - dy * (point[0] - x);
    var far = samples.reduce((a, b) => Math.abs(area(a.point)) >= Math.abs(area(b.point)) ? a : b);
    var divisor = area(far.point);
    var span = high.value - low.value;
    if(!(span > 0) || Math.abs(divisor) < .000001) {
      return null;
    }
    var first = low.point[3], last = high.point[3];
    var to_screen = value => {
      var t = (value - low.value) / span;
      return t * first / ((1 - t) * last + t * first);
    };
    var far_value = to_screen(far.value);
    var gx = (far.point[1] - y - far_value * dy) / divisor;
    var gy = (dx * far_value - far.point[0] + x) / divisor;
    if(samples.some(({ point, value }) => {
      var t = to_screen(value);
      return Math.abs(t - gx * (point[0] - x) - gy * (point[1] - y)) > 1 / 65536 ||
        Math.abs(point[3] - (first + (last - first) * t)) > 1e-7 * Math.max(first, last);
    })) {
      return null;
    }
    var points = [low.point, high.point, far.point];
    var texture = this.surface_scales.get(trace.colorscale);
    var fallback = mask ? '#fff' : this._color(trace, range, low.value, '#1f77b4');
    if(first === last) {
      var paint_trace = mask ? { colorscale: [[0, '#fff'], [1, '#fff']], opacityscale: texture?.stops || [] } : trace;
      return this._triangleGradient(points, [low.value, high.value, far.value], paint_trace, range, fallback, null, alpha);
    }
    var [min, max] = range;
    var scalar_at = offset => low.value + span * offset * last / ((1 - offset) * first + offset * last);
    var offsets = new Set(Array.from({ length: 17 }, (_, i) => i / 16));
    for(const [ratio] of texture?.stops || []) {
      var value = min + (max - min) * ratio;
      if(value > low.value && value < high.value) {
        offsets.add(to_screen(value));
      }
    }
    var colorscale = [...offsets].sort((a, b) => a - b).map(offset =>
      [offset, mask ? '#fff' : texture.color(max > min ? (scalar_at(offset) - min) / (max - min) : .5)]);
    return this._triangleGradient(points, [0, 1, far_value], { colorscale, opacityscale: [] },
      [0, 1], fallback, null, alpha && (offset => alpha(scalar_at(offset))));
  }

  /**
   * Checks that projected rows and columns form a monotonic grid with disjoint cells.
   * @param {Array} grid Projected surface grid.
   * @param {boolean} [perspective=false] Whether perspective depth is significant.
   * @returns {boolean} Whether surface cells do not overlap.
   */
  _surfaceGridIsNonoverlapping(grid, perspective = false) {
    if(perspective) {
      grid = grid.map(row => row.map(point => point && [point[0] / point[3], point[1] / point[3], 1 / point[3]]));
    }
    var top = grid[0], bottom = grid.at(-1);
    var origin = top?.[0], right = top?.at(-1), down = bottom?.[0];
    if(!origin || !right || !down) {
      return false;
    }
    var [x, y] = origin;
    var dx = right[0] - x, dy = right[1] - y;
    var ex = down[0] - x, ey = down[1] - y;
    var area = dx * ey - dy * ex;
    if(Math.abs(area) < .000001) {
      return false;
    }
    var u = point => ((point[0] - x) * ey - (point[1] - y) * ex) / area;
    var v = point => (dx * (point[1] - y) - dy * (point[0] - x)) / area;
    var columns = top.map(point => point ? u(point) : NaN);
    var rows = grid.map(row => row[0] ? v(row[0]) : NaN);
    // A projective transform of an affine grid preserves its topology when every clip w is positive.
    var base_w = origin[2], column_w = right[2] - base_w, row_w = down[2] - base_w;
    var monotonic = values => values.every((value, i) =>
      Number.isFinite(value) && (i === 0 || value >= values[i - 1]));
    return monotonic(columns) && monotonic(rows) && grid.every((row, j) => row.every((point, i) =>
      point && Math.abs(u(point) - columns[i]) < 1e-6 && Math.abs(v(point) - rows[j]) < 1e-6 &&
      (!perspective || point[2] > 0 &&
        Math.abs(point[2] - (base_w + column_w * columns[i] + row_w * rows[j])) < 1e-6 * point[2])));
  }

  /**
   * Converts the surface texture's linearly filtered texels into SVG color and opacity stops.
   * @param {Object} trace Plotly surface options.
   * @param {Object} surface Live Plotly surface renderer.
   * @returns {Object} Texture color sampler and opacity stops.
   */
  _surfaceTextureScale(trace, surface) {
    var stops = trace.colorscale.map(([index, color]) => {
      var [r, g, b, a = 1] = this._rgb(color);
      return { index, rgb: [r, g, b, a] };
    });
    var texture = surface.genColormap.call(Object.create(surface), stops, surface.opacityscale);
    var size = texture.shape[1];
    var texels = Array.from({ length: size }, (_, i) =>
      [0, 1, 2, 3].map(k => Math.round(texture.get(0, i, k) * 255)));
    var sample = ratio => {
      var coordinate = Math.max(0, Math.min(size - 1, ratio * size - .5));
      var left = texels[Math.floor(coordinate)], right = texels[Math.ceil(coordinate)];
      return left.map((value, i) => value + (right[i] - value) * (coordinate % 1));
    };
    var color = ratio => 'rgb(' + sample(ratio).slice(0, 3).map(Math.round).join(',') + ')';
    var alpha = texels.some(texel => texel[3] !== 255) ? ratio => sample(ratio)[3] / 255 : null;
    var ratios = [0];
    texels.forEach((current, i) => {
      var before = texels[Math.max(0, i - 1)];
      var after = texels[Math.min(size - 1, i + 1)];
      if(current.some((value, k) => 2 * value !== before[k] + after[k])) {
        ratios.push((i + .5) / size);
      }
    });
    ratios.push(1);
    return { color, alpha, sample, stops: ratios.map(ratio => [ratio, color(ratio)]) };
  }

  /**
   * Reconstructs a surface vertex normal from Plotly's padded coordinate fields.
   * @param {Object} fields Padded surface coordinate fields.
   * @param {number} i Row index.
   * @param {number} j Column index.
   * @returns {Array} Surface normal.
   */
  _surfaceNormal(fields, i, j) {
    var dx = fields.map(field => (field.get(i + 1, j) - field.get(i - 1, j)) / 2);
    var dy = fields.map(field => (field.get(i, j + 1) - field.get(i, j - 1)) / 2);
    var normal = [dx[1] * dy[2] - dx[2] * dy[1], dx[2] * dy[0] - dx[0] * dy[2],
      dx[0] * dy[1] - dx[1] * dy[0]];
    return Math.hypot(...normal) > 0 ? normal : [0, 0, 1];
  }

  /**
   * Replays Plotly's native contour segments and wall projections as SVG strokes.
   * @param {Object} trace Plotly surface options.
   * @param {Object} surface Live Plotly surface renderer.
   * @param {Function} [alpha] Scalar-to-opacity mapping.
   */
  _surfaceContours(trace, surface, alpha) {
    var active_dynamic = surface._dynamicCounts.some(Boolean);
    if(!active_dynamic && !surface.contourLevels.some(levels => levels.length)) {
      return;
    }
    var vertices;
    var shadow = Object.create(surface);
    shadow.contourLevels = [[], [], []];
    shadow._contourOffsets = [[], [], []];
    shadow._contourCounts = [[], [], []];
    shadow._contourBuffer = { update: data => { vertices = Float32Array.from(data); } };
    var levels = surface.contourLevels.map((values, axis) =>
      values.map(value => value + surface.objectOffset[axis]));
    surface.update.call(shadow, { levels });
    var dynamic_vertices;
    if(active_dynamic) {
      shadow.dynamicLevel = [NaN, NaN, NaN];
      shadow.highlightLevel = surface.highlightLevel.slice();
      shadow._dynamicOffsets = [0, 0, 0];
      shadow._dynamicCounts = [0, 0, 0];
      shadow._dynamicBuffer = { update: data => { dynamic_vertices = Float32Array.from(data); } };
      var position = surface.dynamicLevel.map((value, axis) => value + surface.objectOffset[axis]);
      surface.highlight.call(shadow, { level: surface.highlightLevel, position, dataCoordinate: position });
    }
    if(!vertices?.length && !dynamic_vertices?.length) {
      return;
    }
    var gl = surface.gl;
    var shader = surface._contourShader;
    var commands = [];
    var uniforms = ['model', 'permutation', 'height', 'zOffset', 'contourColor', 'contourTint'];
    var locations;
    var restore = [];
    for(const [vao, buffer, stride] of [[surface._contourVAO, vertices, 5],
      [surface._dynamicVAO, dynamic_vertices, 2]]) {
      if(!buffer?.length) {
        continue;
      }
      var draw = vao.draw;
      var own = Object.hasOwn(vao, 'draw');
      restore.push(() => {
        if(own) { vao.draw = draw; } else { delete vao.draw; }
      });
      vao.draw = (mode, count, first = 0) => {
        locations ??= uniforms.map(name => gl.getUniformLocation(shader.program, name));
        commands.push({ first, count, buffer, stride, values: locations.map(location => gl.getUniform(shader.program, location)),
          bounds: this._clipBounds(gl, shader), width: gl.getParameter(gl.LINE_WIDTH) });
        draw.call(vao, mode, count, first);
      };
    }
    try {
      this.scene.glplot.redraw();
    } finally {
      restore.forEach(reset => reset());
    }
    var [low, high] = surface.intensityBounds;
    var transparent_pass = surface.isTransparent() ? surface : null;
    for(const { first, count, buffer, stride, values, bounds, width } of commands) {
      var [model, permutation, level, z_offset, rgba, tint] = values;
      var stroke_width = this._webglLineWidth(gl, surface.pixelRatio, width / surface.pixelRatio);
      var project_clip = point => {
        var clip = this._clipCoordinates(point, null, model);
        clip[2] += z_offset;
        return clip;
      };
      var world = i => surface.objectOffset.map((offset, axis) =>
        offset + permutation[axis] * buffer[i] + permutation[axis + 3] * buffer[i + 1] + permutation[axis + 6] * level);
      var channels = Array.from(rgba, (value, k) => k === 3 ? value : value * 255);
      var fixed = this._framebufferPaint(channels);
      var color_at = i => {
        var value = low + (high - low) * ((stride === 5 ? buffer[i + 4] : 0) + surface.objectOffset[2]);
        var [r, g, b, a = 1] = this._rgb(this._color(trace, surface.intensityBounds, value, '#444'));
        a *= alpha?.(value) ?? 1;
        // Plotly's contour pass uses full ambient light and does not inherit surface opacity.
        return [r, g, b].map(channel => a * channel / 255).concat(a);
      };
      for(let i = first * stride; i < (first + count) * stride; i += 2 * stride) {
        var ends = this._clipSegment(world(i), world(i + stride), bounds, project_clip);
        if(!ends[0] || !ends[1]) {
          continue;
        }
        var paint = tint ? { color: fixed.fill, alpha: fixed['fill-opacity'] }
          : this._scatterLinePaint(ends, color_at(i), color_at(i + stride), ends[2], ends[3]);
        this._line(ends[0], ends[1], { stroke: paint.color, opacity: paint.alpha,
          'stroke-width': stroke_width, 'data-jslab-surface-contour': '' }, transparent_pass);
        this.primitives.at(-1).contour_surface = surface;
      }
    }
  }

  /**
   * Preserves Plotly's SVG overlays while replacing each 3D scene.
   * @param {Object} source Live Plotly graph element.
   * @param {Object} export_source Plotly export input.
   * @param {number} width Output width.
   * @param {number} height Output height.
   * @returns {Promise<string>} SVG data URL.
   */
  static async export(source, export_source, width, height) {
    if(Plotly.version != '3.3.0') {
      throw new Error('Vector 3D export requires the supported Plotly renderer.');
    }
    var layout = source._fullLayout;
    var scene_ids = layout?._subplots?.gl3d || [];
    // Relayout can update the camera before the normal draw loop refreshes its matrices.
    scene_ids.forEach(id => layout[id]._scene.glplot.redraw());
    var resized = width != layout.width || height != layout.height;
    var vector_types = new Map([['scattergl', 'scatter'], ['scatterpolargl', 'scatterpolar']]);
    var mixed_webgl = export_source.data.some(trace => vector_types.has(trace.type) &&
      trace.visible !== false && trace.visible !== 'legendonly');
    // Switching camera projections can recreate the GL scene before its trace buffers return.
    var rebuilding_scene = source._fullData.some(trace => scene_ids.includes(trace.scene) &&
      (trace.visible === true || trace.visible == null) && !layout[trace.scene]._scene.traces[trace.uid]);
    if((resized || mixed_webgl || rebuilding_scene) && scene_ids.length) {
      var data = structuredClone(export_source.data);
      var line_periods = new Map();
      var legend_markers = new Map();
      var live_legend = [...source.querySelectorAll('.legend path.scatterpts')];
      var gl_dashes = { dot: [1, 1], dash: [4, 1], longdash: [8, 1],
        dashdot: [4, 1, 1, 1], longdashdot: [8, 1, 1, 1] };
      for(const [index, trace] of data.entries()) {
        var vector_type = vector_types.get(trace.type);
        if(vector_type) {
          line_periods.set(index, null);
          trace.type = vector_type;
          if(vector_type == 'scatter') {
            trace.line = { ...trace.line, simplify: false };
          }
          var marker = source._fullData[index]?.marker;
          if((Array.isArray(marker?.size) || ArrayBuffer.isView(marker?.size)) &&
              (marker.sizemode === 'area' || marker.sizemin > 0)) {
            var ref = marker.sizeref || 1;
            // WebGL applies the area conversion and minimum to the diameter.
            var size = Array.from(marker.size, value => {
              var diameter = marker.sizemode === 'area' ? Math.sqrt(value / ref) : value / ref;
              return Number.isFinite(diameter) && diameter > 0 ? Math.max(diameter, marker.sizemin || 0) : 0;
            });
            trace.marker = { ...trace.marker, size, sizemode: 'diameter', sizeref: 1, sizemin: 0 };
            var legend_marker = live_legend.find(node => node.__data__?.trace?.index === index);
            if(legend_marker) {
              legend_markers.set(index, legend_marker.getAttribute('d'));
            }
          }
          var line = source._fullData[index]?.line;
          if(line?.width > 0 && Object.hasOwn(gl_dashes, line.dash)) {
            var dashes = gl_dashes[line.dash].map(length => length * line.width);
            trace.line = { ...trace.line, dash: dashes.join(',') };
            line_periods.set(index, dashes.reduce((sum, length) => sum + length, 0));
          } else if(line?.width > 0 && line.dash === 'solid') {
            line_periods.set(index, 0);
          }
        }
      }
      return await this._renderSnapshot({ data, layout: this.snapshotLayout(source, export_source.layout),
        config: export_source._context || export_source.config, line_periods, legend_markers },
      width, height, this._sceneRenderState(source));
    }
    return await this._exportSnapshot(source, export_source, width, height);
  }

  /**
   * Draws the captured figure at its export size before projecting scene geometry.
   * @param {Object} snapshot_source Captured figure inputs and overlay metadata.
   * @param {number} width Output width.
   * @param {number} height Output height.
   * @param {Array} scene_state Captured live scene state.
   * @param {boolean} [raster=false] Whether to produce a PNG snapshot.
   * @returns {Promise<string>} SVG or PNG data URL.
   */
  static async _renderSnapshot({ data, layout, config, line_periods, legend_markers }, width, height, scene_state, raster = false) {
    var snapshot = document.createElement('div');
    snapshot.style.cssText = 'position:absolute;left:-5000px;top:0';
    document.body.appendChild(snapshot);
    try {
      await Plotly.newPlot(snapshot, data, { ...layout, width, height },
        { ...config, staticPlot: false, _exportedPlot: true });
      for(const { index, level, position, glyphs } of scene_state || []) {
        var trace = snapshot._fullData[index];
        var rendered = snapshot._fullLayout[trace?.scene]?._scene?.traces[trace.uid];
        if(rendered?.surface && level) {
          var surface = rendered.surface;
          if(position) {
            surface.highlight({ level, position: position.slice(), dataCoordinate: position.slice() });
          } else {
            surface.highlightLevel = level.slice();
          }
        }
        for(const { name, id, scale, use_ortho } of glyphs) {
          if(rendered?.[name]) {
            rendered[name].highlightId = id;
            rendered[name].highlightScale = scale;
            rendered[name].useOrtho = use_ortho;
          }
        }
      }
      if(raster) {
        return await this._rasterSceneSnapshot(snapshot, width, height);
      }
      for(const id of snapshot._fullLayout._subplots.gl3d) {
        var glplot = snapshot._fullLayout[id]._scene.glplot;
        // Use the final camera state already queued for this hidden scene.
        var view = glplot.camera.view;
        view.recalcMatrix(view.lastT());
        glplot.camera.tick = () => false;
        glplot.redraw();
      }
      return await this._exportSnapshot(snapshot, snapshot, width, height, false, line_periods, legend_markers);
    } finally {
      try {
        Plotly.purge(snapshot);
      } finally {
        snapshot.remove();
      }
    }
  }

  /**
   * Captures live scene state that is not stored in the input trace data.
   * @param {Object} graph Live Plotly graph element.
   * @returns {Array} Highlight and projection state for live 3D traces.
   */
  static _sceneRenderState(graph) {
    return graph._fullData.flatMap((trace, index) => {
      var rendered = graph._fullLayout[trace.scene]?._scene?.traces[trace.uid];
      var surface = rendered?.surface;
      var glyphs = ['scatterPlot', 'textMarkers'].flatMap(name => {
        var glyph = rendered?.[name];
        var highlighted = glyph?.highlightId[3] === 0 && glyph.highlightScale !== 1;
        return highlighted || glyph?.useOrtho === false
          ? [{ name, id: glyph.highlightId.slice(), scale: glyph.highlightScale, use_ortho: glyph.useOrtho }] : [];
      });
      var dynamic = surface?._dynamicCounts.some(Boolean);
      var level = surface && (dynamic || surface.highlightLevel.some(value => value >= 0))
        ? surface.highlightLevel.slice() : null;
      if(!level && !glyphs.length) {
        return [];
      }
      var position = dynamic
        ? surface.dynamicLevel.map((value, axis) => value + surface.objectOffset[axis]) : null;
      return [{ index, level, position, glyphs }];
    });
  }

  /**
   * Uses native scene images so the raster export includes captured live state.
   * @param {Object} graph Rendered Plotly graph element.
   * @param {number} width Output width.
   * @param {number} height Output height.
   * @param {Object} [source] Plotly export source.
   * @param {Function} [rebuild] Callback for rebuilding at another size.
   * @returns {Promise<string>} PNG data URL.
   */
  static async _rasterSceneSnapshot(graph, width, height, source = graph, rebuild) {
    var scene_images = graph._fullLayout._subplots.gl3d.map(id => graph._fullLayout[id]._scene.toImage('png'));
    var svg = await Plotly.toImage(source, { format: 'svg', width, height });
    var doc = new DOMParser().parseFromString(decodeURIComponent(svg.slice(svg.indexOf(',') + 1)), 'image/svg+xml');
    // Cartesian WebGL snapshots cover the full figure and use CSS pixel units.
    // Plotly writes scene dimensions as numbers in the SVG coordinate system.
    var images = [...doc.querySelectorAll('g.glimages image')].filter(image =>
      ['width', 'height'].every(attribute => Number.isFinite(Number(image.getAttribute(attribute)))));
    if(images.length !== scene_images.length || doc.querySelector('parsererror')) {
      throw new Error('Raster export could not identify each live Plotly 3D scene.');
    }
    if(rebuild) {
      var layout = graph._fullLayout;
      var resized = layout._subplots.gl3d.some((id, i) => {
        var { domain } = layout[id];
        var { w, h } = layout._size;
        return Math.abs(w * (domain.x[1] - domain.x[0]) - Number(images[i].getAttribute('width'))) > .001 ||
          Math.abs(h * (domain.y[1] - domain.y[0]) - Number(images[i].getAttribute('height'))) > .001;
      });
      if(resized) {
        return await rebuild();
      }
    }
    images.forEach((image, i) => image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', scene_images[i]));
    var image = new Image();
    image.src = 'data:image/svg+xml,' + encodeURIComponent(new XMLSerializer().serializeToString(doc));
    await image.decode();
    var canvas = graph.ownerDocument.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  }

  /**
   * Exports PNG with live scene state at the requested size when needed.
   * @param {Object} graph Live Plotly graph element.
   * @param {Object} source Plotly export source.
   * @param {number} width Output width.
   * @param {number} height Output height.
   * @returns {Promise<string>|null} PNG data URL or null when no live state exists.
   */
  static livePng(graph, source, width, height) {
    var scene_state = this._sceneRenderState(graph);
    if(!scene_state.length) {
      return null;
    }
    var rebuild = () => this._renderSnapshot(source, width, height, scene_state, true);
    if(width === graph._fullLayout.width && height === graph._fullLayout.height) {
      return this._rasterSceneSnapshot(graph, width, height, source, rebuild);
    }
    return rebuild();
  }

  /**
   * Captures the current camera without modifying the graph's input layout.
   * @param {Object} graph Live Plotly graph element.
   * @param {Object} layout Input layout.
   * @returns {Object} Cloned layout with current scene cameras.
   */
  static snapshotLayout(graph, layout) {
    var snapshot = structuredClone(layout);
    var full_layout = graph._fullLayout;
    for(const id of full_layout?._subplots?.gl3d || []) {
      var { _scene: scene, aspectmode } = full_layout[id];
      snapshot[id] = { ...snapshot[id], camera: scene.getCamera() };
      if(aspectmode == 'manual') {
        snapshot[id].aspectratio = scene.glplot.getAspectratio();
      }
    }
    return snapshot;
  }

  /**
   * Replaces Plotly's raster 3D scene images with reconstructed SVG viewports.
   * @param {Object} source Rendered Plotly graph element.
   * @param {Object} export_source Plotly export source.
   * @param {number} width Output width.
   * @param {number} height Output height.
   * @param {boolean} [retry_layout=true] Whether to rebuild after a layout-size mismatch.
   * @param {Map} [line_periods] Converted WebGL line dash periods.
   * @param {Map} [legend_markers] Captured WebGL legend marker paths.
   * @returns {Promise<string>} SVG data URL.
   */
  static async _exportSnapshot(source, export_source, width, height, retry_layout = true, line_periods, legend_markers) {
    var layout = source._fullLayout;
    var scene_ids = layout?._subplots?.gl3d || [];
    var svg_source = scene_ids.length ? { data: structuredClone(export_source.data),
      layout: this.snapshotLayout(source, export_source.layout),
      config: export_source._context || export_source.config } : export_source;
    for(const [index] of line_periods || []) {
      svg_source.data[index].uid = source._fullData[index].uid;
    }
    // Capture the scene before Plotly yields while rendering its SVG overlays.
    var viewports = scene_ids.map(id => {
      var { domain, _scene: scene } = layout[id];
      var { l, t, w, h } = layout._size;
      var bounds = { x: l + w * domain.x[0], y: t + h * (1 - domain.y[1]),
        width: w * (domain.x[1] - domain.x[0]), height: h * (domain.y[1] - domain.y[0]) };
      var traces = source._fullData.flatMap((trace, j) =>
        trace.scene == id && (trace.visible === true || trace.visible == null)
          ? [[trace, svg_source.data[j]]] : []);
      return new PRDC_JSLAB_PLOT_3D_VECTOR_EXPORT(source.ownerDocument, scene, bounds, traces,
        source !== export_source).viewport;
    });
    var svg = await Plotly.toImage(svg_source, { format: 'svg', width, height });
    if(!scene_ids.length) {
      return svg;
    }
    var comma = svg.indexOf(',');
    var document = new DOMParser().parseFromString(decodeURIComponent(svg.slice(comma + 1)), 'image/svg+xml');
    if(line_periods?.size) {
      this._matchWebGLTraces(document, source, line_periods, height);
    }
    if(legend_markers?.size) {
      // The legend uses the original size values even when WebGL scales the plotted bubbles.
      var live_markers = source.querySelectorAll('.legend path.scatterpts');
      var exported_markers = document.querySelectorAll('.legend path.scatterpts');
      if(live_markers.length === exported_markers.length) {
        for(const [index, marker] of live_markers.entries()) {
          var exported = exported_markers[index];
          var geometry = legend_markers.get(marker.__data__?.trace?.index);
          if(geometry && marker.getAttribute('d') === exported.getAttribute('d')) {
            exported.setAttribute('d', geometry);
          }
        }
      }
    }
    var images = [...document.querySelectorAll('g.glimages image')];
    if(images.length != scene_ids.length || document.querySelector('parsererror')) {
      throw new Error('Vector export could not identify each Plotly 3D scene.');
    }
    var size_changed = (image, i) => ['width', 'height'].some(attribute =>
      Math.abs(Number(viewports[i].getAttribute(attribute)) - Number(image.getAttribute(attribute))) > .001);
    if(retry_layout && images.some(size_changed)) {
      return await this._renderSnapshot(svg_source, width, height, this._sceneRenderState(source));
    }
    images.forEach((image, i) => {
      var viewport = viewports[i];
      var width = viewport.getAttribute('width');
      var height = viewport.getAttribute('height');
      if(Number(width) > 0 && Number(height) > 0 && size_changed(image, i)) {
        // Keep the captured scene's local coordinates if the snapshot changes its allocated size.
        viewport.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        viewport.setAttribute('preserveAspectRatio', 'none');
      }
      for(const attribute of ['x', 'y', 'width', 'height']) {
        viewport.setAttribute(attribute, image.getAttribute(attribute));
      }
      image.replaceWith(viewport);
    });
    if(document.querySelector('image, foreignObject')) {
      throw new Error('The figure contains an image or another raster layer.');
    }
    return 'data:image/svg+xml,' + encodeURIComponent(new XMLSerializer().serializeToString(document));
  }

  /**
   * Preserves marker outlines, line caps, and screen-space dashes in converted WebGL traces.
   * @param {Document} document Exported SVG document.
   * @param {Object} source Live Plotly graph element.
   * @param {Map} periods Converted line dash periods.
   * @param {number} height Output height.
   */
  static _matchWebGLTraces(document, source, periods, height) {
    for(const [index, period] of periods) {
      var trace = source._fullData[index];
      var layout = source._fullLayout;
      var x_offset = layout['xaxis' + (trace.xaxis || 'x').slice(1)]?._offset;
      var y_offset = layout['yaxis' + (trace.yaxis || 'y').slice(1)]?._offset;
      var group = [...document.querySelectorAll('g.trace.scatter')].find(node =>
        node.classList.contains('trace' + trace.uid));
      if(trace.type === 'scatterpolar') {
        var translate = group?.closest('g.frontplot')?.getAttribute('transform')
          ?.match(/^translate\(([^,]+),\s*([^)]+)\)$/);
        [x_offset, y_offset] = translate ? translate.slice(1).map(Number) : [NaN, NaN];
      }
      if(!group || !Number.isFinite(x_offset) || !Number.isFinite(y_offset)) {
        continue;
      }
      var live_group = [...source.querySelectorAll('g.trace.scatter')].find(node =>
        node.classList.contains('trace' + trace.uid));
      var live_points = live_group?.querySelectorAll('g.points path.point');
      var points = group.querySelectorAll('g.points path.point');
      for(const [index, point] of points.entries()) {
        point.style.strokeLinejoin = 'round';
        point.style.strokeLinecap = 'round';
        var live = live_points?.length === points.length ? live_points[index] : null;
        var radius = live?.getAttribute('d') === point.getAttribute('d') &&
          live.getAttribute('transform') === point.getAttribute('transform') ? live.__data__?.mrc : null;
        this._matchWebGLDot(point, radius, trace.marker);
      }
      if(period == null) {
        continue;
      }
      for(const path of group.querySelectorAll('path.js-line')) {
        var commands = path.getAttribute('d');
        if(!/^M[-\d.]+,[-\d.]+(?:L[-\d.]+,[-\d.]+|[HV][-\d.]+)+$/.test(commands)) {
          continue;
        }
        var points = [];
        for(const [, command, coordinates] of commands.matchAll(/([MLHV])([-\d.,]+)/g)) {
          var [x, y] = coordinates.split(',').map(Number);
          var previous = points.at(-1);
          points.push(command === 'H' ? [x, previous[1]] : command === 'V' ? [previous[0], x] : [x, y]);
        }
        var cap = Number.parseFloat(path.style.strokeWidth) / 2;
        if(cap > 0) {
          var [x, y] = points[0], [next_x, next_y] = points[1];
          var [end_x, end_y] = points.at(-1), [previous_x, previous_y] = points.at(-2);
          var first_length = Math.hypot(x - next_x, y - next_y);
          var last_length = Math.hypot(end_x - previous_x, end_y - previous_y);
          if(first_length) {
            points[0] = [x + cap * (x - next_x) / first_length, y + cap * (y - next_y) / first_length];
          }
          if(last_length) {
            points[points.length - 1] = [end_x + cap * (end_x - previous_x) / last_length,
              end_y + cap * (end_y - previous_y) / last_length];
          }
        }
        if(!period) {
          path.setAttribute('d', 'M' + points.map(point => point.join(',')).join('L'));
          continue;
        }
        var runs = [];
        var start = 0;
        for(let i = 2; i < points.length; i++) {
          var [x, y] = points[start], [last_x, last_y] = points[i - 1], [px, py] = points[i];
          var dx = last_x - x, dy = last_y - y;
          if(Math.abs(dx * (py - y) - dy * (px - x)) > .01 * Math.hypot(dx, dy) ||
              dx * (px - last_x) + dy * (py - last_y) < 0) {
            runs.push(points.slice(start, i));
            start = i - 1;
          }
        }
        runs.push(points.slice(start));
        for(const run of runs) {
          var [x, y] = run[0], [end_x, end_y] = run.at(-1);
          var dx = end_x - x, dy = end_y - y;
          var length = Math.hypot(dx, dy);
          if(!length) {
            continue;
          }
          var line = runs.length === 1 ? path : path.cloneNode(false);
          var phase = ((x_offset + x) * dx - (height - y_offset - y) * dy) / length - period / 2;
          line.style.strokeDashoffset = phase % period + 'px';
          line.setAttribute('d', 'M' + run.map(point => point.join(',')).join('L'));
          if(line !== path) {
            path.before(line);
          }
        }
        if(runs.length > 1) {
          path.remove();
        }
      }
    }
  }

  /**
   * Reproduces the scale and center dot used by WebGL marker glyphs.
   * @param {Element} point Exported SVG marker path.
   * @param {number} radius Live marker radius.
   * @param {Object} marker Plotly marker options.
   */
  static _matchWebGLDot(point, radius, marker) {
    var d = point.getAttribute('d');
    var dot = 'M0,0.5L0.5,0L0,-0.5L-0.5,0Z';
    if(!d?.endsWith(dot)) {
      return;
    }
    var outline = d.slice(0, -dot.length);
    var circle = radius => {
      var r = Number(radius.toFixed(6));
      return 'M' + r + ',0A' + r + ',' + r + ' 0 1,1 0,-' + r +
        'A' + r + ',' + r + ' 0 0,1 ' + r + ',0Z';
    };
    var round = outline.match(/^M([\d.]+),0A\1,\1 0 1,1 0,-\1A\1,\1 0 0,1 \1,0Z$/);
    if(round) {
      radius = +round[1];
      point.setAttribute('d', circle(radius * 1.1) + circle(radius * .05));
    } else if(/^[MLHVZ\d., -]+$/.test(outline)) {
      var enlarged = outline.replace(/-?\d+(?:\.\d+)?/g, value => Number((1.1 * value).toFixed(3)));
      if(!Number.isFinite(radius) && Number.isFinite(marker?.size) &&
          (marker.sizeref ?? 1) === 1 && marker.sizemode !== 'area') {
        radius = marker.size / 2;
      }
      var center = Number.isFinite(radius) && radius > 0 ? circle(radius * .05) : dot;
      point.setAttribute('d', enlarged + center);
    }
  }
}
