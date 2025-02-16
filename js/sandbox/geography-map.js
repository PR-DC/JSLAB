/**
 * @file JSLAB library geography map submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for map.
 */
class PRDC_JSLAB_GEOGRAPHY_MAP {
  
  /**
   * Creates a new map instance.
   * @param {Object} jsl - The JSLAB instance or environment reference.
   * @param {string} [tileset='OpenStreetMap'] - The name of the tileset to use.
   */
  constructor(jsl, tileset = 'OpenStreetMap') {
    this.jsl = jsl;
    
    // Default map parameters
    this.lat = 44.8768331;
    this.lon = 20.112352;
    this.zoom = 12;
    this.tileset = tileset;
    this.tileset_url;
    
    this.tilesets = {
      // OpenStreetMap Standard
      'OpenStreetMap': 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',

      // Stamen Design
      'Stamen Toner': 'https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png',
      'Stamen Watercolor': 'https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
      'Stamen Terrain': 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',

      // CartoDB (CARTO)
      'Carto Positron': 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      'Carto DarkMatter': 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',

      // OpenTopoMap
      'OpenTopoMap': 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',

      // Esri
      'Esri WorldStreetMap': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      'Esri WorldImagery': 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      'Esri DarkGrayCanvas': 'https://server.arcgisonline.com/ArcGIS/rest/services/Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',

      // Wikimedia Maps
      'Wikimedia Standard': 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',
      'Wikimedia Cycle Map': 'https://maps.wikimedia.org/osm-intl-cycle/{z}/{x}/{y}.png',
      'Wikimedia Transport Map': 'https://maps.wikimedia.org/osm-intl-transport/{z}/{x}/{y}.png',
    };
    
    if(hasKey(this.tilesets, this.tileset)) {
      this.tileset_url = this.tilesets[this.tileset];
    } else {
      this.tileset_url = this.tileset;
    }
    
    this.wid;
    this.ready = false;
  }
  
  /**
   * Opens a window with Leaflet and initializes the map.
   * @returns {Promise<void>}
   */
  async createWindow() {
    var wid = this.jsl.windows.openWindow('leaflet.html');
    this.wid = wid;
    this.win = this.jsl.windows.open_windows[wid];
    await this.jsl.windows.open_windows[wid].ready;
    var context = this.jsl.windows.open_windows[wid].context;
    context.imports_ready = false;
    while(!context.imports_ready) {
      if(typeof context.L != 'undefined') {
        context.imports_ready = true;
      }
      await this.jsl.non_blocking.waitMSeconds(1);
    }
    this.context = context;
    context.map_cont = context.document.getElementById('map-cont');
    context.map_cont.style = 'position: absolute;top:0;left:0;right:0;bottom:0;';
    this.leaflet_obj = context.L.map('map-cont', 
      { attributionControl: false }
    ).setView([this.lat, this.lon], this.zoom);
    context.L.tileLayer(this.tileset_url).addTo(this.leaflet_obj);
    this.ready = true;
  }
  
  /**
   * Sets the center of the map to the specified latitude and longitude.
   * This will update the internal state and move the Leaflet map if it is ready.
   * @param {number} lat - Latitude.
   * @param {number} lon - Longitude.
   */
  setCenter(lat, lon) {
    this.lat = lat;
    this.lon = lon;
    if(this.ready && this.leaflet_obj) {
      this.leaflet_obj.setView([lat, lon], this.zoom);
    }
  }
  
  /**
   * Sets the zoom level of the map.
   * This will update the internal state and adjust the Leaflet map if it is ready.
   * @param {number} zoom - The zoom level.
   */
  setZoom(zoom) {
    this.zoom = zoom;
    if(this.ready && this.leaflet_obj) {
      this.leaflet_obj.setZoom(zoom);
    }
  }
  
  /**
   * Adds a marker to the map at the specified latitude and longitude.
   * @param {number} lat - Latitude.
   * @param {number} lon - Longitude.
   * @returns {PRDC_JSLAB_GEOGRAPHY_MAP_MARKER|null} - The marker instance or null if map is not ready.
   */
  addMarker(lat, lon) {
    return new PRDC_JSLAB_GEOGRAPHY_MAP_MARKER(this.jsl, this, lat, lon);
  }
}

exports.PRDC_JSLAB_GEOGRAPHY_MAP = PRDC_JSLAB_GEOGRAPHY_MAP;

class PRDC_JSLAB_GEOGRAPHY_MAP_MARKER {
  
  /**
   * Creates a new marker and adds it to the map.
   * @param {Object} jsl - The JSLAB instance or environment reference.
   * @param {PRDC_JSLAB_GEOGRAPHY_MAP} map - The map instance.
   * @param {number} lat - Latitude.
   * @param {number} lon - Longitude.
   */
  constructor(jsl, map, lat, lon) {
    this.jsl = jsl;
    this.map = map;
    
    this.leaflet_obj = this.map.context.L.marker([lat, lon]).addTo(this.map.leaflet_obj);
    this.lat = lat;
    this.lon = lon;
  }
  
  /**
   * Sets a custom icon for the marker.
   * @param {Object} iconOptions - Leaflet icon options: { iconUrl: '...', iconSize: [...], iconAnchor: [...], etc. }
   */
  setIcon(iconOptions) {
    if(this.leaflet_obj && this.map.ready) {
      let customIcon = this.map.context.L.icon(iconOptions);
      this.leaflet_obj.setIcon(customIcon);
      this.leaflet_obj.setRotationOrigin('center center');
    }
  }

  /**
   * Sets a custom icon for the marker.
   * @param {Object} iconOptions - Leaflet divIcon options: { iconUrl: '...', iconSize: [...], iconAnchor: [...], etc. }
   */
  setDivIcon(iconOptions) {
    if(this.leaflet_obj && this.map.ready) {
      let customIcon = this.map.context.L.divIcon(iconOptions);
      this.leaflet_obj.setIcon(customIcon);
      this.leaflet_obj.setRotationOrigin('center center');
    }
  }
  
  /**
   * Sets the position of the marker.
   * @param {number} lat - New latitude.
   * @param {number} lon - New longitude.
   */
  setPosition(lat, lon) {
    this.lat = lat;
    this.lon = lon;
    if(this.leaflet_obj && this.map.ready) {
      this.leaflet_obj.setLatLng([lat, lon]);
    }
  }
  
  /**
   * Sets the rotation (in degrees) of the marker.
   * Leaflet markers can be rotated via CSS transform if using a DivIcon or a custom class.
   * This example uses a simple inline style transform if the marker's icon supports it.
   * @param {number} rotation - Rotation angle in degrees.
   */
  setRotation(rotation) {
    if(this.leaflet_obj && this.map.ready) {
      this.leaflet_obj.setRotationAngle(rotation);
    }
  }
}
