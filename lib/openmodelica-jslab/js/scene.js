/**
 * @file Lazy native visualization scenes for scientific figure hosts
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

import { readVerifiedResource } from './resource-cache.js';
var initialized;
/**
 * Class for native geometry used by JSLAB figure playback.
 */
export class PRDC_OMJSL_SCENE {

  /**
   * Extracts external geometry resource names from the compiler scene description.
   * @param {*} xml Compiler-produced scene description.
   */
  static resourceNames(xml) {
    var primitives = new Set(['box', 'sphere', 'cylinder', 'cone', 'pipecylinder', 'pipe', 'beam', 'gearwheel', 'spring']);
    var entities = {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'"
    };
    var names = [];
    for(const match of String(xml).matchAll(/<type\s*>([^<]*)<\/type\s*>/g)) {
      var name = match[1].trim().replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, function(_match, value) {
        if(value.startsWith('#')) {
          return String.fromCodePoint(parseInt(value.slice(value[1] == 'x' ? 2 : 1), value[1] == 'x' ? 16 : 10));
        }
        return entities[value];
      });
      if(name && !primitives.has(name) && !names.includes(name)) {
        names.push(name);
      }
    }
    return names;
  }

  /**
   * Copies CAD resources and their dependencies out of the compiler filesystem.
   * @param {*} xml Compiler-produced scene description.
   * @param {*} read Read.
   */
  static async collectResources(xml, read) {
    if(!this.resourceNames(xml).length) {
      return {};
    }
    var module = await PRDC_OMJSL_SCENE.initialize();
    var resources = {};
    var pending = module.JslabScene.resources(xml);
    for(var index = 0; index < pending.length; index++) {
      var name = pending[index];
      if(Object.hasOwn(resources, name)) {
        continue;
      }
      var bytes = await read(name);
      if(!(bytes instanceof Uint8Array) || !bytes.length) {
        throw new Error('Missing CAD resource: ' + name);
      }
      Object.defineProperty(resources, name, {
        value: bytes,
        enumerable: true
      });
      for(const dependency of module.JslabScene.dependencies(name, bytes)) {
        if(!pending.includes(dependency)) {
          pending.push(dependency);
        }
      }
    }
    return resources;
  }

  /**
   * Constructs native geometry from the compiler scene and referenced simulation columns.
   * @param {*} xml Compiler-produced scene description.
   * @param {*} time Simulation timestamps in seconds.
   * @param {*} variables Result columns indexed by compiler variable name.
   * @param {*} resources Referenced geometry resource bytes.
   * @param {*} options Host services and operation options.
   */
  static async create(xml, time, variables, resources = {}, options = {}) {
    var module = await PRDC_OMJSL_SCENE.initialize(options);
    var columns = {};
    for(const name of module.JslabScene.references(xml)) {
      if(!variables[name] || !variables[name].length) {
        throw new Error('Missing scene result: ' + name);
      }
      columns[name] = Float64Array.from(variables[name]);
    }
    var scene = new this();
    scene._native = new module.JslabScene(xml, Float64Array.from(time), columns, resources);
    scene.length = scene._native.length();
    scene.fixed_topology = scene._native.fixed_topology();
    scene.rigid = scene._native.rigid();
    try {
      scene.bounds = scene._native.bounds().map(function(range) {
        return Array.from(range);
      });
    } catch(error) {
      scene.dispose();
      throw error;
    }
    return scene;
  }

  /**
   * Returns the mesh coordinates and materials for the selected simulation sample.
   * @param {*} index Simulation sample index.
   */
  frame(index) {
    return this._formatMeshes(this._native.frame(index));
  }

  /**
   * Returns individual rigid meshes at startup or for a current-frame export.
   * @param {number} index Simulation sample index.
   */
  partFrame(index) {
    return this._formatMeshes(this._native.part_frame(index));
  }

  /**
   * Returns GPU transforms relative to the initial rigid meshes.
   * @param {number} index Simulation sample index.
   */
  transforms(index) {
    return this._native.rigid_transforms(index);
  }

  /**
   * Converts native material records to the existing plot trace format.
   * @param {Object[]} meshes Native geometry batches.
   */
  _formatMeshes(meshes) {
    return meshes.map(function(batch) {
      var rgb = function(values) {
        return 'rgb(' + Array.from(values, function(value) {
          return Math.max(0, Math.min(255, Math.round(value)));
        }).join(',') + ')';
      };
      var color = rgb(batch.color);
      if(batch.face_colors) {
        batch.facecolor = [];
        for(var i = 0; i < batch.face_colors.length; i += 3) {
          batch.facecolor.push(rgb(batch.face_colors.subarray(i, i + 3)));
        }
        delete batch.face_colors;
      }
      return Object.assign(batch, {
        color: color,
        lighting: {
          ambient: 0.46,
          diffuse: 0.82,
          specular: Math.max(0, Math.min(1, batch.specular)),
          roughness: 0.28,
          fresnel: 0.08
        }
      });
    });
  }

  /**
   * Releases the native scene allocation when its figure is closed.
   */
  dispose() {
    if(this._native) {
      this._native.free();
      this._native = null;
    }
  }

  /**
   * Reads scene resources through browser APIs for both file and HTTP URLs.
   * @param {*} url Url.
   */
  static async readBytes(url) {
    if(new URL(url).protocol != 'file:') {
      var response = await fetch(url);
      if(!response.ok) {
        throw new Error('Unable to load the scene resource: ' + response.status);
      }
      return new Uint8Array(await response.arrayBuffer());
    }
    return new Promise(function(resolve, reject) {
      var request = new XMLHttpRequest();
      request.open('GET', url, true);
      request.responseType = 'arraybuffer';
      request.onload = function() {
        if(request.status != 0 && request.status != 200) {
          reject(new Error('Unable to read the scene resource.'));
        } else {
          resolve(new Uint8Array(request.response));
        }
      };
      request.onerror = function() {
        reject(new Error('Unable to read the scene resource.'));
      };
      request.send();
    });
  }

  /**
   * Loads and verifies the native geometry core without starting the compiler.
   * @param {*} options Host services and operation options.
   */
  static async initialize(options = {}) {
    if(!initialized) {
      initialized = async function() {
        var root = new URL('../', import.meta.url);
        var manifest = JSON.parse(new TextDecoder().decode(await PRDC_OMJSL_SCENE.readBytes(new URL('manifest.json', root).href)));
        var name = 'animation/scene-core_bg.wasm';
        var entry = await import(new URL('animation/scene-core.js?content=' + manifest.files['animation/scene-core.js'], root).href);
        var bytes = await readVerifiedResource(new URL(name, root).href, manifest.files[name], PRDC_OMJSL_SCENE.readBytes, options);
        await entry.default({
          module_or_path: bytes
        });
        return entry;
      }().catch(function(error) {
        initialized = null;
        throw error;
      });
    }
    return initialized;
  }

}
