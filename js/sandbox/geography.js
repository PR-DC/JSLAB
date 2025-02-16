/**
 * @file JSLAB library geography submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var { PRDC_JSLAB_GEOGRAPHY_MAP } = require('./geography-map');
var { PRDC_JSLAB_GEOGRAPHY_MAP_3D } = require('./geography-map-3d');

/**
 * Class for JSLAB geography submodule.
 */
class PRDC_JSLAB_LIB_GEOGRAPHY {
  
  /**
   * Initializes the geography submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }
  
  /**
   * Initializes and returns a new 2D web map instance.
   * @param {...*} args - Arguments for configuring the web map.
   * @returns {Promise<PRDC_JSLAB_GEOGRAPHY_MAP>} The initialized 2D web map instance.
   */
  async webmap(...args) {
    var map = new PRDC_JSLAB_GEOGRAPHY_MAP(this.jsl, ...args);
    await map.createWindow();
    return map;
  }
  
  /**
   * Initializes and returns a new 3D geoglobe instance.
   * @param {...*} args - Arguments for configuring the 3D geoglobe.
   * @returns {Promise<PRDC_JSLAB_GEOGRAPHY_MAP_3D>} The initialized 3D geoglobe instance.
   */
  async geoglobe(...args) {
    var map_3d = new PRDC_JSLAB_GEOGRAPHY_MAP_3D(this.jsl, ...args);
    await map_3d.createWindow();
    return map_3d;
  }
  
  /**
   * Calculates the bounding box and center from an array of tile coordinates.
   * @param {Array<Object>} tile_coordinates - An array of objects with tile coordinates, each having properties `x`, `y`, and `z` for tile X and Y coordinates and zoom level, respectively.
   * @returns {Object} An object containing the bounds as an array of `[min_lat, min_lng]` and `[max_lat, max_lng]`, and the center as `[latitude, longitude]`.
   */
  calculateTilesBoundingBox(tile_coordinates) {
    var min_lat = Number.MAX_VALUE,
        max_lat = -Number.MAX_VALUE,
        min_lng = Number.MAX_VALUE,
        max_lng = -Number.MAX_VALUE;

    tile_coordinates.forEach(function(coord) {
        var n = Math.pow(2, coord.z);
        var tileBounds = {
            min_lat: (2 * Math.atan(Math.exp(Math.PI - (2 * Math.PI * coord.y) / n)) - Math.PI / 2) * (180 / Math.PI),
            max_lat: (2 * Math.atan(Math.exp(Math.PI - (2 * Math.PI * (coord.y + 1)) / n)) - Math.PI / 2) * (180 / Math.PI),
            min_lng: ((coord.x) / n) * 360 - 180,
            max_lng: ((coord.x + 1) / n) * 360 - 180
        };

        min_lat = Math.min(min_lat, tileBounds.min_lat);
        max_lat = Math.max(max_lat, tileBounds.max_lat);
        min_lng = Math.min(min_lng, tileBounds.min_lng);
        max_lng = Math.max(max_lng, tileBounds.max_lng);
    });

    var center = [(min_lat + max_lat) / 2, (min_lng + max_lng) / 2];
    var bounds = [[min_lat, min_lng], [max_lat, max_lng]];

    return { bounds, center };
  }

  /**
   * Calculates a new latitude and longitude based on a starting point, distance, and bearing using the Haversine formula.
   * @param {number} lat - The latitude of the starting point.
   * @param {number} lon - The longitude of the starting point.
   * @param {number} distance - The distance from the starting point in meters.
   * @param {number} bearing - The bearing in degrees from north.
   * @returns {Array<number>} An array containing the latitude and longitude of the calculated point.
   */
  offsetLatLon(lat, lon, distance, bearing) {
    var dist_rad = distance / 6371000;
    var bearing_rad = (bearing * Math.PI) / 180;
    var lat_rad = (lat * Math.PI) / 180;
    var lng_rad = (lon * Math.PI) / 180;
    var new_lat_rad = Math.asin(Math.sin(lat_rad) * Math.cos(dist_rad) +
        Math.cos(lat_rad) * Math.sin(dist_rad) * Math.cos(bearing_rad));
    var new_lng_rad = lng_rad + Math.atan2(Math.sin(bearing_rad) * Math.sin(dist_rad) * Math.cos(lat_rad),
        Math.cos(dist_rad) - Math.sin(lat_rad) * Math.sin(new_lat_rad));
    return [(new_lat_rad * 180) / Math.PI, (new_lng_rad * 180) / Math.PI];
  }

  /**
   * Calculates the distance between two points on Earth using the Haversine formula.
   * @param {number} lat1 - The latitude of the first point.
   * @param {number} lon1 - The longitude of the first point.
   * @param {number} lat2 - The latitude of the second point.
   * @param {number} lon2 - The longitude of the second point.
   * @returns {number} The distance between the two points in meters.
   */
  latLonDistance(lat1, lon1, lat2, lon2) {
    var dLat = (lat2-lat1) * Math.PI / 180;
    var dLon = (lon2-lon1) * Math.PI / 180;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180 ) * Math.cos(lat2 * Math.PI / 180 ) *
      Math.sin(dLon/2) * Math.sin(dLon/2))); // [m]
  }

  /**
   * Calculates the distance between two points on Earth including altitude difference using the Haversine formula.
   * @param {number} lat1 - The latitude of the first point.
   * @param {number} lon1 - The longitude of the first point.
   * @param {number} alt1 - The altitude of the first point in meters.
   * @param {number} lat2 - The latitude of the second point.
   * @param {number} lon2 - The longitude of the second point.
   * @param {number} alt2 - The altitude of the second point in meters.
   * @returns {number} The 3D distance between the two points in meters.
   */
  latLonAltDistance(lat1, lon1, alt1, lat2, lon2, alt2) {
    var L = latLonDistance(lat1, lon1, lat2, lon2);
    return Math.sqrt(Math.pow(L, 2)+Math.pow(alt1-alt2, 2));
  }

  /**
   * Checks if the latitude and longitude values have been updated.
   * @param {Object} latlon - An object containing the current and last values of latitude and longitude.
   * @returns {boolean} True if the latitude and/or longitude values have been updated; false otherwise.
   */
  checkNewLatLon(latlon) {
    if(this.jsl.format.isUndefined(latlon.value)) {
      return false;
    } else if(this.jsl.format.isUndefined(latlon.last_value)) {
      return true;
    } else {
      return (latlon.value[0] != latlon.last_value[0]) || (latlon.value[1] != latlon.last_value[1]);
    }
  }

  /**
   * Converts latitude, longitude, and altitude to Cartesian coordinates.
   * @param {number|number[]} lat - Latitude in degrees or array of latitudes.
   * @param {number|number[]} lon - Longitude in degrees or array of longitudes.
   * @param {number|number[]} alt - Altitude in meters or array of altitudes.
   * @returns {Cesium.Cartesian3|Cesium.Cartesian3[]} Cartesian coordinate(s).
   */
  latLonAlt2cartesian(lat, lon, alt) {
    var isArray = Array.isArray(lat) && Array.isArray(lon) && Array.isArray(alt);

    if(isArray) {
      return lat.map((latitude, index) =>
        this.jsl.env.Cesium.Cartesian3.fromDegrees(lon[index], latitude, alt[index])
      );
    } else {
      return this.jsl.env.Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    }
  }
}

exports.PRDC_JSLAB_LIB_GEOGRAPHY = PRDC_JSLAB_LIB_GEOGRAPHY;