/**
 * @file Shared Simulate workspace results and figure playback
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for Simulate data and animation within a JSLAB sandbox.
 */
class PRDC_JSLAB_SANDBOX_SIMULATE {

  /**
   * Copies a script's simulation options and converts workspace parameters for transport.
   * @param {Object} [options] Script options.
   * @param {Function} sanitize Converts evaluated workspace values to portable values.
   * @returns {Promise<Object>} Host request options.
   */
  static async _requestOptions(options, sanitize) {
    const request = { ...options };
    if(request.parameters && typeof request.parameters === 'object') {
      request.parameters = await sanitize(request.parameters);
    }
    return request;
  }

  /**
   * Binds an outstanding simulation request to sandbox interruption.
   * @param {Object} jsl Active JSLAB runtime.
   * @param {Object} options Script options.
   * @param {Function} sanitize Converts parameters for the receiving host.
   * @param {Function} run Starts the host request with an identifier.
   * @param {Function} cancel Cancels the identified host request.
   * @returns {Promise<*>} Host response or false if interrupted before sending.
   */
  static async _runRequest(jsl, options, sanitize, run, cancel) {
    const id = crypto.randomUUID();
    const owner = {};
    let cancelled = false;
    let sent = false;
    jsl.addForCleanup(owner, () => {
      cancelled = true;
      if(sent) return cancel(id);
    });
    try {
      const request = await this._requestOptions(options, sanitize);
      if(cancelled) return false;
      sent = true;
      return await run(request, id);
    } finally {
      const index = jsl.cleanup_registry.findIndex(entry => entry.obj === owner);
      if(index >= 0) jsl.cleanup_registry.splice(index, 1);
    }
  }

  /**
   * Evaluates a model binding in the active workspace and converts the result for transport.
   * @param {Object} jsl Active JSLAB runtime.
   * @param {string} expression Workspace expression.
   * @param {Function} getSanitizer Loads the host value conversion function.
   * @returns {Promise<Object>} Safe value or structured error.
   */
  static async _resolveWorkspaceValue(jsl, expression, getSanitizer) {
    try {
      const sanitize = await getSanitizer();
      const value = await jsl.inter.eval.evalString('(' + String(expression || '') + ')');
      return { success: true, js_value: sanitize(value) };
    } catch(error) {
      return { success: false, error: String(error?.message || error),
        value_code: error?.value_code, value_path: error?.value_path };
    }
  }

  /**
   * Creates shared simulation services for the owning environment.
   * @param {Object} env Sandbox platform environment.
   */
  constructor(env) {
    this._env = env;
    this.jsl = env.jsl;
    this.context = env.context;
  }

  /**
   * Publishes a complete simulation result as one lossless workspace value.
   */
  _publishSimulateResult(data) {
    var result = data && data.result || {};
    var columns = Array.isArray(result.columns) ? result.columns.map(String) : [];
    if(!columns.length) {
      return false;
    }
    var variables = Object.create(null);
    columns.forEach(function(name, index) {
      var values = result.data && result.data[name] ? Array.from(result.data[name], Number) :
        (result.rows || []).map(function(row) {
          return Number(row[index]);
        });
      variables[name] = values;
    });
    var simulation = {
      model: String(data.model_name || ''),
      names: columns.slice(),
      time: variables.time || [],
      variables: variables,
      units: result.units || {},
      parameters: result.parameters || [],
      info: result.info || {},
      scene: result.scene || null,
      get: function(name) {
        return this.variables[String(name)];
      }
    };
    columns.forEach(function(name) {
      if(!Object.prototype.hasOwnProperty.call(simulation, name)) {
        simulation[name] = variables[name];
      }
    });
    this.context.simulation = simulation;
    this._simulate_diagram = {
      file_name: String(data.file_name || ''),
      components: Array.isArray(data.components) ? data.components : [],
      connections: Array.isArray(data.connections) ? data.connections : [],
      visualization: data.visualization && typeof data.visualization == 'object' ?
        data.visualization : {}
    };
    this._env.setWorkspace();
    return simulation;
  }

  /**
   * Extracts moving MultiBody frame coordinates from the last simulation.
   */
  _simulateAnimationData(diagram) {
    var simulation = this.context.simulation;
    if(!simulation || !simulation.scene || !simulation.scene.xml || !simulation.time.length) {
      return null;
    }
    if(simulation.scene.error) {
      throw new Error(simulation.scene.error);
    }
    return { xml: simulation.scene.xml, resources: simulation.scene.resources || {}, variables: simulation.variables, time: simulation.time,
      length: simulation.time.length };
  }

  /**
   * Copies only serializable numeric fields from Plotly's managed camera object.
   */
  _simulateCameraSnapshot(camera) {
    if(!camera || typeof camera != 'object') {
      return null;
    }
    var vector = function(value, fallback) {
      value = value && typeof value == 'object' ? value : fallback;
      return { x: Number(value.x), y: Number(value.y), z: Number(value.z) };
    };
    return {
      eye: vector(camera.eye, { x: 1.25, y: 1.25, z: 1.25 }),
      up: vector(camera.up, { x: 0, y: 0, z: 1 }),
      center: vector(camera.center, { x: 0, y: 0, z: 0 }),
      projection: { type: camera.projection && camera.projection.type || 'orthographic' }
    };
  }

  /**
   * Calculates a bounded orthographic scene scale for wheel zoom.
   */
  _simulateZoomScale(scale, delta) {
    scale = Number(scale);
    delta = Math.max(-240, Math.min(240, Number(delta) || 0));
    if(!Number.isFinite(scale) || scale <= 0) {
      return null;
    }
    var zoom = scale * Math.exp(-delta * .00075);
    return Number.isFinite(zoom) && zoom > 0 ? zoom : scale;
  }

  /**
   * Opens a shared JSLAB 3D mechanism figure with a time slider.
   */
  async _openSimulateAnimation(diagram = {}) {
    var animation_options = diagram.options || {};
    var animation = this._simulateAnimationData(diagram);
    if(!animation || !animation.length) {
      this._env.error(this.jsl.inter.lang.string(677), false);
      return false;
    }
    var scene = await this._env._createSimulateScene(animation.xml, animation.time, animation.variables, animation.resources);
    var maximum_span = Math.max(...scene.bounds.map(function(range) {
      return range[1] - range[0];
    }), 1e-6);
    var ranges = scene.bounds.map(function(range) {
      var center = (range[0] + range[1]) / 2;
      return [center - maximum_span * 0.62, center + maximum_span * 0.62];
    });
    var geometry = function(index) {
      return scene.rigid ? scene.partFrame(index) : scene.frame(index);
    };
    var initial = geometry(0);
    var materials = new Map(initial.map(batch => [batch.id, {
      color: batch.color, facecolor: batch.facecolor, lighting: batch.lighting
    }]));
    var used_figure_ids = Object.keys(this.jsl.inter.figures.open_figures).map(Number)
      .filter(Number.isFinite);
    var animation_figure_id = used_figure_ids.length ? Math.max.apply(null, used_figure_ids) + 1 : 1;
    this.jsl.inter.figures.figure(animation_figure_id);
    var plot = this.jsl.inter.figures.plot(initial.map(function(batch) {
      return Object.assign({ type: 'mesh3d', opacity: 1, hoverinfo: 'skip', flatShading: false,
        showLegend: false, lightposition: { x: -120, y: 180, z: 260 } }, batch);
    }), { showLegend: false, xlim: ranges[0], ylim: ranges[1], zlim: ranges[2],
      uirevision: 'simulate-animation-camera',
      font: { family: 'Roboto, Arial, sans-serif', size: 11, color: '#333' },
      margin: { left: 0, right: 0, top: 0, bottom: 0, autoexpand: false } });
    plot.xlabel('x'); /* lang-fixed */
    plot.ylabel('y'); /* lang-fixed */
    plot.zlabel('z'); /* lang-fixed */
    plot.axis('equal');
    try {
      await plot.ready;
    } catch(error) {
      scene.dispose();
      throw error;
    }
    if(diagram.file_name) {
      await this.jsl.inter.figures.setFigureTitle(plot.fid, String(diagram.file_name));
    }
    var figure = this.jsl.inter.figures.open_figures[plot.fid];
    var doc = figure && figure.dom;
    if(!doc || !doc.body) {
      scene.dispose();
      return plot.fid;
    }
    if(doc.defaultView) {
      doc.defaultView.addEventListener('beforeunload', function() {
        scene.dispose();
      }, { once: true });
    }
    var plot_context = figure.context && figure.context.plot;
    var animation_index = 0;
    var rigid_playback = scene.rigid && plot_context &&
      plot_context.initMeshAnimation(() => geometry(animation_index));
    var plot_container = plot_context && plot_context.plot_cont;
    var camera_zoom = 1.35;
    var base_aspect = null;
    var camera_drag = null;
    var cameraSnapshot = this._simulateCameraSnapshot.bind(this);
    var zoomScale = this._simulateZoomScale.bind(this);
    var applyCameraZoom = function() {
      var scene = plot_container && plot_container._fullLayout &&
        plot_container._fullLayout.scene && plot_container._fullLayout.scene._scene;
      var glplot = scene && scene.glplot;
      if(!glplot || typeof glplot.getAspectratio != 'function' ||
          !plot_context || typeof plot_context.relayout != 'function') {
        return Promise.resolve();
      }
      glplot.clipToBounds = false;
      if(!base_aspect) {
        base_aspect = Object.assign({}, glplot.getAspectratio());
      }
      var aspect = {
        x: base_aspect.x * camera_zoom,
        y: base_aspect.y * camera_zoom,
        z: base_aspect.z * camera_zoom
      };
      var layout = plot_container._fullLayout.scene;
      if(layout.aspectmode == 'manual' && layout.aspectratio &&
          Math.abs(layout.aspectratio.x - aspect.x) < 1e-9 &&
          Math.abs(layout.aspectratio.y - aspect.y) < 1e-9 &&
          Math.abs(layout.aspectratio.z - aspect.z) < 1e-9) {
        return Promise.resolve();
      }
      return plot_context.relayout({
        'scene.aspectmode': 'manual',
        'scene.aspectratio': aspect
      });
    };
    applyCameraZoom();
    var zoom_pending = false;
    var layout_frame = null;
    var layout_busy = false;
    var queueZoomLayout = function() {
      zoom_pending = true;
      if(layout_frame !== null || layout_busy || !doc.defaultView) {
        return;
      }
      layout_frame = doc.defaultView.requestAnimationFrame(function() {
        layout_frame = null;
        zoom_pending = false;
        layout_busy = true;
        applyCameraZoom().catch(function() {}).finally(function() {
          layout_busy = false;
          if(zoom_pending) {
            queueZoomLayout();
          }
        });
      });
    };
    var updateCameraView = function(camera) {
      var scene_layout = plot_container && plot_container._fullLayout &&
        plot_container._fullLayout.scene;
      var scene = scene_layout && scene_layout._scene;
      if(!scene || !scene.camera || typeof scene.camera.lookAt != 'function') {
        return;
      }
      scene.camera.lookAt([camera.eye.x, camera.eye.y, camera.eye.z],
        [camera.center.x, camera.center.y, camera.center.z],
        [camera.up.x, camera.up.y, camera.up.z]);
      scene_layout.camera.eye = Object.assign({}, camera.eye);
      scene_layout.camera.center = Object.assign({}, camera.center);
      scene_layout.camera.up = Object.assign({}, camera.up);
      if(plot_container.layout) {
        if(!plot_container.layout.scene) {
          plot_container.layout.scene = {};
        }
        plot_container.layout.scene.camera = {
          eye: Object.assign({}, camera.eye),
          center: Object.assign({}, camera.center),
          up: Object.assign({}, camera.up),
          projection: Object.assign({}, camera.projection)
        };
      }
      if(scene.glplot && typeof scene.glplot.redraw == 'function') {
        scene.glplot.redraw();
      }
    };
    var beginCameraInteraction = function(event) {
      if(!plot_container || event.target !== plot_container &&
          !plot_container.contains(event.target) || ![0, 1, 2].includes(event.button)) {
        return;
      }
      var camera = cameraSnapshot(plot_container._fullLayout.scene.camera);
      if(!camera) {
        return;
      }
      var mode = plot_container._fullLayout.scene.dragmode;
      if(mode === false) {
        return;
      }
      if(event.button != 0 || event.shiftKey) {
        mode = 'pan';
      }
      var direction = { x: camera.eye.x - camera.center.x,
        y: camera.eye.y - camera.center.y, z: camera.eye.z - camera.center.z };
      var radius = Math.hypot(direction.x, direction.y, direction.z) || 1;
      camera_drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY,
        radius: radius, azimuth: Math.atan2(direction.y, direction.x),
        elevation: Math.asin(Math.max(-1, Math.min(1, direction.z / radius))),
        mode: mode || 'orbit', direction: direction, zoom: camera_zoom,
        initial: cameraSnapshot(camera), camera: camera, target: event.target };
      if(typeof event.target.setPointerCapture == 'function') {
        try {
          event.target.setPointerCapture(event.pointerId);
        } catch(error) {}
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    var moveCameraInteraction = function(event) {
      if(!camera_drag || event.pointerId != null && event.pointerId !== camera_drag.pointer) {
        return;
      }
      var dx = event.clientX - camera_drag.x;
      var dy = event.clientY - camera_drag.y;
      var normalize = function(vector) {
        var length = Math.hypot(vector.x, vector.y, vector.z) || 1;
        return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
      };
      var cross = function(a, b) {
        return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
      };
      var rotate = function(vector, axis, angle) {
        axis = normalize(axis);
        var sine = Math.sin(angle), cosine = Math.cos(angle);
        var dot = axis.x * vector.x + axis.y * vector.y + axis.z * vector.z;
        var perpendicular = cross(axis, vector);
        return Object.fromEntries(['x', 'y', 'z'].map(function(key) {
          return [key, vector[key] * cosine + perpendicular[key] * sine + axis[key] * dot * (1 - cosine)];
        }));
      };
      if(camera_drag.mode == 'zoom') {
        camera_zoom = zoomScale(camera_drag.zoom, -dy * 3) || camera_drag.zoom;
        queueZoomLayout();
      } else if(camera_drag.mode == 'pan') {
        var right = normalize(cross(camera_drag.initial.up, camera_drag.direction));
        var up = normalize(cross(camera_drag.direction, right));
        var units = camera_drag.radius * 2 / Math.max(1, plot_container.clientHeight);
        var offset = Object.fromEntries(['x', 'y', 'z'].map(function(key) {
          return [key, (-dx * right[key] + dy * up[key]) * units];
        }));
        for(const field of ['eye', 'center']) {
          for(const key of ['x', 'y', 'z']) {
            camera_drag.camera[field][key] = camera_drag.initial[field][key] + offset[key];
          }
        }
      } else {
        var direction;
        if(camera_drag.mode == 'turntable') {
          var azimuth = camera_drag.azimuth - dx * .006;
          var elevation = Math.max(-Math.PI / 2 + .04, Math.min(Math.PI / 2 - .04, camera_drag.elevation + dy * .006));
          direction = { x: camera_drag.radius * Math.cos(elevation) * Math.cos(azimuth),
            y: camera_drag.radius * Math.cos(elevation) * Math.sin(azimuth), z: camera_drag.radius * Math.sin(elevation) };
        } else {
          direction = rotate(camera_drag.direction, camera_drag.initial.up, -dx * .006);
          var right = cross(camera_drag.initial.up, direction);
          direction = rotate(direction, right, -dy * .006);
          camera_drag.camera.up = rotate(camera_drag.initial.up, right, -dy * .006);
        }
        for(const key of ['x', 'y', 'z']) {
          camera_drag.camera.eye[key] = camera_drag.initial.center[key] + direction[key];
        }
      }
      updateCameraView(camera_drag.camera);
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    var endCameraInteraction = function(event) {
      if(!camera_drag || event.pointerId != null && event.pointerId !== camera_drag.pointer) {
        return;
      }
      var camera = camera_drag.camera;
      var target = camera_drag.target;
      if(typeof target.hasPointerCapture == 'function' && target.hasPointerCapture(camera_drag.pointer)) {
        target.releasePointerCapture(camera_drag.pointer);
      }
      camera_drag = null;
      updateCameraView(camera);
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    var blockNativeCameraMouse = function(event) {
      if(!plot_container || event.type != 'mousedown' && !camera_drag ||
          event.target !== plot_container && !plot_container.contains(event.target) && !camera_drag) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    var zoomCameraInteraction = function(event) {
      if(!plot_container || !plot_container._fullLayout || event.target !== plot_container &&
          !plot_container.contains(event.target)) {
        return;
      }
      var delta = Number(event.deltaY) || 0;
      if(event.deltaMode == 1) {
        delta *= 16;
      } else if(event.deltaMode == 2) {
        delta *= doc.defaultView.innerHeight || 600;
      }
      var zoom = zoomScale(camera_zoom, delta);
      if(zoom === null || zoom == camera_zoom) {
        return;
      }
      camera_zoom = zoom;
      queueZoomLayout();
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    if(plot_container && doc) {
      var preserveZoomAfterClick = function(event) {
        if(event.target !== plot_container && !plot_container.contains(event.target) ||
            !doc.defaultView) {
          return;
        }
        doc.defaultView.requestAnimationFrame(function() {
          doc.defaultView.requestAnimationFrame(queueZoomLayout);
        });
      };
      doc.addEventListener('pointerdown', beginCameraInteraction, true);
      doc.addEventListener('pointermove', moveCameraInteraction, true);
      doc.addEventListener('pointerup', endCameraInteraction, true);
      doc.addEventListener('pointercancel', endCameraInteraction, true);
      doc.addEventListener('mousedown', blockNativeCameraMouse, true);
      doc.addEventListener('mousemove', blockNativeCameraMouse, true);
      doc.addEventListener('mouseup', blockNativeCameraMouse, true);
      doc.addEventListener('wheel', zoomCameraInteraction,
        { capture: true, passive: false });
      doc.addEventListener('click', preserveZoomAfterClick, true);
      doc.addEventListener('contextmenu', function(event) {
        if(event.target === plot_container || plot_container.contains(event.target)) {
          event.preventDefault();
        }
      }, true);
      doc.addEventListener('dblclick', preserveZoomAfterClick, true);
    }
    if(plot_container && typeof plot_container.on == 'function') {
      plot_container.on('plotly_relayout', function() {
        if(camera_zoom != 1) {
          queueZoomLayout();
        }
      });
    }
    if(doc.defaultView) {
      doc.defaultView.addEventListener('resize', function() {
        queueZoomLayout();
      });
    }
    await this.jsl.inter.gui.animationControls(plot.fid, Object.assign({}, animation_options, {
      time: animation.time,
      play: !!(animation_options.play || animation_options.loop),
      onFrame: function(index) {
        animation_index = index;
        if(rigid_playback) {
          plot_context.updateMeshTransforms(scene.transforms(index));
        } else {
          plot.updateById(geometry(index).map(function(batch) {
            if(scene.fixed_topology) {
              delete batch.i;
              delete batch.j;
              delete batch.k;
            }
            var previous = materials.get(batch.id) || {};
            materials.set(batch.id, { color: batch.color, facecolor: batch.facecolor, lighting: batch.lighting });
            if(batch.color === previous.color) {
              delete batch.color;
            }
            if(batch.facecolor && previous.facecolor && batch.facecolor.length === previous.facecolor.length &&
                batch.facecolor.every((color, index) => color === previous.facecolor[index])) {
              delete batch.facecolor;
            }
            if(batch.lighting && previous.lighting &&
                Object.keys(batch.lighting).every(key => batch.lighting[key] === previous.lighting[key])) {
              delete batch.lighting;
            }
            delete batch.specular;
            return batch;
          }));
        }
      }
    }));
    return plot.fid;
  }
}

exports.PRDC_JSLAB_SANDBOX_SIMULATE = PRDC_JSLAB_SANDBOX_SIMULATE;
