/**
 * @file Rigid mesh animation in existing Plotly figure scenes
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Retains Plotly mesh buffers and applies native rigid transforms when drawing.
 */
class PRDC_JSLAB_PLOT_MESH_ANIMATION {

  /**
   * Connects rigid meshes to the pinned Plotly renderer.
   * @param {Object} viewer Figure plot viewer.
   * @param {Function} snapshot Current world meshes for exports.
   */
  constructor(viewer, snapshot) {
    this.viewer = viewer;
    this.snapshot = snapshot;
    this.entries = [];
    const plot = viewer.plot_cont;
    const scene = plot._fullLayout?.scene?._scene;
    if(!scene || Plotly.version != '3.3.0' ||
        ['xaxis', 'yaxis', 'zaxis'].some(axis => scene.fullSceneLayout[axis].type != 'linear')) {
      throw new Error('Rigid mesh playback requires the supported linear Plotly scene.');
    }
    this.scene = scene;
    const traces = plot._fullData.map(data => scene.traces[data.uid]);
    if(traces.some(trace => !trace?.mesh ||
        ['draw', 'drawTransparent', 'drawPick'].some(method => typeof trace.mesh[method] != 'function'))) {
      throw new Error('The plot does not contain supported rigid meshes.');
    }
    traces.forEach(trace => {
      const mesh = trace.mesh;
      const entry = { mesh, matrix: null, methods: {} };
      for(const method of ['draw', 'drawTransparent', 'drawPick']) {
        const original = mesh[method];
        entry.methods[method] = original;
        mesh[method] = parameters => original.call(mesh, this._drawParameters(parameters, entry.matrix));
      }
      this.entries.push(entry);
    });
  }

  /**
   * Composes the native world matrix with Plotly's normalization and camera.
   * @param {Object} parameters Plotly draw parameters.
   * @param {Float32Array} matrix Native column-major transform.
   * @returns {Object} Parameters for the retained mesh.
   */
  _drawParameters(parameters, matrix) {
    if(!matrix) {
      return parameters;
    }
    const scale = [...this.scene.dataScale, 1];
    const model = parameters.model;
    const result = new Float32Array(16);
    for(let column = 0; column < 4; column++) {
      for(let row = 0; row < 4; row++) {
        for(let k = 0; k < 4; k++) {
          result[column * 4 + row] += model[k * 4 + row] * matrix[column * 4 + k] * scale[k] / scale[column];
        }
      }
    }
    return { ...parameters, model: result };
  }

  /**
   * Changes shader matrices and requests an existing-scene redraw.
   * @param {Float32Array[]} matrices Native transforms in mesh order.
   */
  update(matrices) {
    if(matrices.length != this.entries.length) {
      throw new Error('Rigid scene mesh count changed during playback.');
    }
    matrices.forEach((matrix, index) => {
      this.entries[index].matrix = matrix;
      this.entries[index].mesh.dirty = true;
    });
    this.scene.glplot.redraw();
  }

  /**
   * Returns current world coordinates together with existing trace options.
   * @returns {Object[]} Plotly export traces.
   */
  exportData() {
    const meshes = this.snapshot();
    return this.viewer.plot_cont.data.map((trace, index) => ({ ...trace, ...meshes[index] }));
  }

  /**
   * Releases renderer hooks before replacing the plot.
   */
  dispose() {
    this.entries.forEach(entry => Object.assign(entry.mesh, entry.methods));
    this.entries = [];
    this.snapshot = null;
  }
}
