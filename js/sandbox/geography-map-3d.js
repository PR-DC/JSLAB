/**
 * @file JSLAB library geography map 3D submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for map 3D.
 */
class PRDC_JSLAB_GEOGRAPHY_MAP_3D {
  
  /**
   * Creates a new 3D map instance.
   * @param {Object} jsl - The JSLAB instance or environment reference.
   */
  constructor(jsl, token) {
    this.jsl = jsl;
    this.token = token;
    
    // Default camera parameters
    this.latitude = 44.8768331;
    this.longitude = 20.112352;
    this.height = 1000; // meters
    this.heading = 0; // degrees
    this.pitch = -30; // degrees
    
    this.wid;
    this.ready = false;
  }
  
  /**
   * Opens a window with Cesium and initializes 3D map.
   * @returns {Promise<void>}
   */
  async createWindow() {
    var wid = this.jsl.windows.openWindow('cesium.html');
    this.wid = wid;
    this.win = this.jsl.windows.open_windows[wid];
    await this.jsl.windows.open_windows[wid].ready;
    var context = this.jsl.windows.open_windows[wid].context;
    context.imports_ready = false;
    while(!context.imports_ready) {
      if(typeof context.Cesium != 'undefined') {
        context.imports_ready = true;
      }
      await this.jsl.non_blocking.waitMSeconds(1);
    }
    context.map_3d_cont = context.document.getElementById('map-3d-cont');
    context.map_3d_cont.style = 'position: absolute;top:0;left:0;right:0;bottom:0;';
    
    // Initialize Cesium Viewer
    context.Cesium.Ion.defaultAccessToken = this.token;
    this.viewer = new context.Cesium.Viewer(context.map_3d_cont, {
      terrainProvider: await context.Cesium.CesiumTerrainProvider.fromIonAssetId(1),
      timeline: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      geocoder: false,
      infoBox: false,
      selectionIndicator: false
    });
    
    this.context = context;
    this.Cesium = context.Cesium;
    this.ready = true;
  }
  
  /**
   * Sets the camera view to the specified latitude, longitude, and height.
   * @param {number} lat - Latitude.
   * @param {number} lon - Longitude.
   * @param {number} height - Height in meters.
   * @param {number} [heading=0] - Heading in degrees.
   * @param {number} [pitch=-30] - Pitch in degrees.
   */
  setView(lat, lon, height, heading = 0, pitch = -30) {
    this.latitude = lat;
    this.longitude = lon;
    this.height = height;
    this.heading = heading;
    this.pitch = pitch;
    
    if(this.ready && this.viewer) {
      this.viewer.camera.flyTo({
        destination: this.context.Cesium.Cartesian3.fromDegrees(lon, lat, height),
        orientation: {
          heading: this.context.Cesium.Math.toRadians(heading),
          pitch: this.context.Cesium.Math.toRadians(pitch),
          roll: 0.0
        }
      });
    }
  }
  
  /**
   * Adds a new entity to the 3D map.
   * @param {Object} data - The data representing the entity to add.
   * @returns {PRDC_JSLAB_GEOGRAPHY_MAP_3D_ENTITY} The newly created map entity.
   */
  addEntity(data) {
    return new PRDC_JSLAB_GEOGRAPHY_MAP_3D_ENTITY(this.jsl, this, data);
  }
  
  /**
   * Removes all entities from the 3D map viewer.
   */
  removeAllEntities() {
    this.viewer.entities.removeAll();
  }
  
  /**
   * Animates the camera to fly to the specified entity.
   * @param {Object} entity - The entity to fly to.
   */
  flyTo(entity) {
    if(hasKey(entity, 'entity')) {
      this.viewer.flyTo(entity.entity);
    }
  }
}

exports.PRDC_JSLAB_GEOGRAPHY_MAP_3D = PRDC_JSLAB_GEOGRAPHY_MAP_3D;

class PRDC_JSLAB_GEOGRAPHY_MAP_3D_ENTITY {
  
  /**
   * Creates a new 3D map entity and adds it to the viewer.
   * @param {Object} jsl - The JSL environment object.
   * @param {Object} map_3d - The 3D map instance where the entity will be added.
   * @param {Object} data - The data representing the entity.
   */
  constructor(jsl, map_3d, data) {
    this.jsl = jsl;
    this.map_3d = map_3d;
    this.data = data;
    
    this.entity = this.map_3d.viewer.entities.add(data);
  }
  
  /**
   * Animates the camera to fly to this entity.
   */
  flyTo() {
    this.map_3d.viewer.flyTo(this.entity);
  }
}
