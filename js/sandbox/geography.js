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
            min_lat: (2 * Math.atan(Math.exp(Math.PI - (2 * Math.PI * (coord.y + 1)) / n)) - Math.PI / 2) * (180 / Math.PI),
            max_lat: (2 * Math.atan(Math.exp(Math.PI - (2 * Math.PI * coord.y) / n)) - Math.PI / 2) * (180 / Math.PI),
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
   * Calculates a new latitude and longitude based on east and north offsets.
   * @param {number} lat - The latitude of the starting point.
   * @param {number} lon - The longitude of the starting point.
   * @param {number} east - The east offset in meters.
   * @param {number} north - The north offset in meters.
   * @returns {Array<number>} An array containing the latitude and longitude of the calculated point.
   */
  offsetLatLonEastNorth(lat, lon, east, north) {
    var distance = Math.sqrt(Math.pow(east, 2)+Math.pow(north, 2)); // [m]
    var bearing = Math.atan2(east, north)*180/Math.PI; // [deg]
    return this.offsetLatLon(lat, lon, distance, bearing);
  };

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
    var L = this.latLonDistance(lat1, lon1, lat2, lon2);
    return Math.sqrt(Math.pow(L, 2)+Math.pow(alt1-alt2, 2));
  }

  /**
   * Checks if the latitude and longitude values have been updated.
   * @param {Object} latlon - An object containing the current and last values of latitude and longitude.
   * @returns {boolean} True if the latitude and/or longitude values have been updated; false otherwise.
   */
  checkNewLatLon(latlon) {
    if(this.jsl.inter.format.isUndefined(latlon.value)) {
      return false;
    } else if(this.jsl.inter.format.isUndefined(latlon.last_value)) {
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
        this.jsl.inter.env.Cesium.Cartesian3.fromDegrees(lon[index], latitude, alt[index])
      );
    } else {
      return this.jsl.inter.env.Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    }
  }

  /**
   * Transforms a local offset (dx, dy, dz) relative to a specified latitude, longitude, and altitude to a new latitude, longitude, and altitude.
   * @param {number} lat - Latitude in degrees.
   * @param {number} lon - Longitude in degrees.
   * @param {number} alt - Altitude in meters.
   * @param {number} dx - Local x offset in meters.
   * @param {number} dy - Local y offset in meters.
   * @param {number} dz - Local z offset in meters.
   * @returns {Object} Object containing the transformed latitude, longitude, and altitude.
   */
  latLonAltTransform(lat, lon, alt, dx, dy, dz) {
    var center = this.jsl.inter.env.Cesium.Cartesian3.fromDegrees(lon, lat, alt);
    return this.eastNorthUpTransform(center, dx, dy, dz);
  };

  /**
   * Transforms a local offset (dx, dy, dz) relative to a specified East, North, Up position to a new latitude, longitude, and altitude.
   * @param {Cesium.Cartesian3} position - East, North, Up position.
   * @param {number} dx - Local x offset in meters.
   * @param {number} dy - Local y offset in meters.
   * @param {number} dz - Local z offset in meters.
   * @returns {Object} Object containing the transformed latitude, longitude, and altitude.
   */
  eastNorthUpTransform(pos, dx, dy, dz) {
    var transform = this.jsl.inter.env.Cesium.Transforms.eastNorthUpToFixedFrame(pos);
    var point = this.jsl.inter.env.Cesium.Matrix4.multiplyByPoint(transform,
      new this.jsl.inter.env.Cesium.Cartesian3(dx, dy, dz), new this.jsl.inter.env.Cesium.Cartesian3());
    var carto = this.jsl.inter.env.Cesium.Ellipsoid.WGS84.cartesianToCartographic(point);
    
    return {lat: this.jsl.inter.env.Cesium.Math.toDegrees(carto.latitude), lon: this.jsl.inter.env.Cesium.Math.toDegrees(carto.longitude), height: carto.height};
  };

  /**
   * Calculates the heading (yaw) and pitch angles from a starting Cartesian point to a target Cartesian point.
   * The angles are calculated in the local East-North-Up (ENU) frame of the starting point.
   * @param {Cesium.Cartesian3} from_cartesian - The Cartesian coordinates of the starting point.
   * @param {Cesium.Cartesian3} to_cartesian - The Cartesian coordinates of the target point.
   * @returns {{heading: number, pitch: number}} An object containing the calculated heading (in radians from North, positive East) and pitch (in radians from the local horizontal, positive Up).
   */
  computeHeadingPitchFromTo(from_cartesian, to_cartesian) {
    var enu = this.jsl.inter.env.Cesium.Transforms.eastNorthUpToFixedFrame(from_cartesian);
    var inv_enu = this.jsl.inter.env.Cesium.Matrix4.inverse(enu, new this.jsl.inter.env.Cesium.Matrix4());
    
    var local_target = this.jsl.inter.env.Cesium.Matrix4.multiplyByPoint(
      inv_enu,
      to_cartesian,
      new this.jsl.inter.env.Cesium.Cartesian3()
    );

    var dir = this.jsl.inter.env.Cesium.Cartesian3.normalize(local_target, new this.jsl.inter.env.Cesium.Cartesian3());

    var east = dir.x;
    var north = dir.y;
    var up = dir.z;

    var heading = Math.atan2(east, north);
    var pitch = Math.asin(up);

    return { heading, pitch };
  }

  /**
   * Converts altitude from Mean Sea Level (MSL) height to Ellipsoid height using the EGM96 geoid model.
   * The conversion can handle single values or arrays of values.
   * @param {number|number[]} lat_deg - Latitude(s) in degrees.
   * @param {number|number[]} lon_deg - Longitude(s) in degrees.
   * @param {number|number[]} h_msl_meters - Altitude(s) in meters above MSL.
   * @returns {number|number[]} Ellipsoid altitude(s) in meters.
   */
  mslToEllipsoidAlt(lat_deg, lon_deg, h_msl_meters) {
    var isArray = Array.isArray(lat_deg) && Array.isArray(lon_deg) && Array.isArray(h_msl_meters);

    if(isArray) {
      return lat_deg.map((latitude, index) => {
        var lon = this.jsl.inter.format.normalizeAngle(lon_deg[index]);
        if(!Number.isFinite(h_msl_meters[index])) throw new TypeError(this.jsl.inter.lang.currentString(358));
        return this.jsl.inter.env.egm96.egm96ToEllipsoid(lat_deg[index], lon, h_msl_meters[index]);
      });
    } else {
      var lon = this.jsl.inter.format.normalizeAngle(lon_deg);
      if(!Number.isFinite(h_msl_meters)) throw new TypeError(this.jsl.inter.lang.currentString(358));
      return this.jsl.inter.env.egm96.egm96ToEllipsoid(lat_deg, lon, h_msl_meters);
    }
  }

  /**
   * Converts altitude from Ellipsoid height to Mean Sea Level (MSL) height using the EGM96 geoid model.
   * The conversion can handle single values or arrays of values.
   * @param {number|number[]} lat_deg - Latitude(s) in degrees.
   * @param {number|number[]} lon_deg - Longitude(s) in degrees.
   * @param {number|number[]} h_ellipsoid_meters - Altitude(s) in meters above the Ellipsoid.
   * @returns {number|number[]} MSL altitude(s) in meters.
   */
  ellipsoidToMslAlt(lat_deg, lon_deg, h_ellipsoid_meters) {
    var isArray = Array.isArray(lat_deg) && Array.isArray(lon_deg) && Array.isArray(h_ellipsoid_meters);

    if(isArray) {
      return lat_deg.map((latitude, index) => {
        var lon = this.jsl.inter.format.normalizeAngle(lon_deg[index]);
        if(!Number.isFinite(h_ellipsoid_meters[index])) throw new TypeError(this.jsl.inter.lang.currentString(358));
        return this.jsl.inter.env.egm96.ellipsoidToEgm96(lat_deg[index], lon, h_ellipsoid_meters[index]);
      });
    } else {
      var lon = this.jsl.inter.format.normalizeAngle(lon_deg);
      if(!Number.isFinite(h_ellipsoid_meters)) throw new TypeError(this.jsl.inter.lang.currentString(358));
      return this.jsl.inter.env.egm96.ellipsoidToEgm96(lat_deg, lon, h_ellipsoid_meters);
    }
  }

/**
   * Converts a position (latitude, longitude, and MSL altitude) into a Cesium Cartesian3 coordinate using Ellipsoid height.
   * The MSL altitude is first converted to Ellipsoid altitude using the EGM96 geoid model.
   * @param {number|number[]} lat_deg - Latitude(s) in degrees.
   * @param {number|number[]} lon_deg - Longitude(s) in degrees.
   * @param {number|number[]} h_msl_meters - Altitude(s) in meters above MSL.
   * @returns {Cesium.Cartesian3|Cesium.Cartesian3[]} Cartesian coordinate(s) in the WGS84 system.
   */
  positionToEllipsoid(lat_deg, lon_deg, h_msl_meters) {
    var isArray = Array.isArray(lat_deg) && Array.isArray(lon_deg) && Array.isArray(h_msl_meters);

    if(isArray) {
      return lat_deg.map((latitude, index) => {
        var alt = this.mslToEllipsoidAlt(lat_deg[index], lon_deg[index], h_msl_meters[index]);
        return this.jsl.inter.env.Cesium.Cartesian3.fromDegrees(lon_deg[index], lat_deg[index], alt);
      });
    } else {
      var alt = this.mslToEllipsoidAlt(lat_deg, lon_deg, h_msl_meters);
      return this.jsl.inter.env.Cesium.Cartesian3.fromDegrees(lon_deg, lat_deg, alt);
    }
  }
}

exports.PRDC_JSLAB_LIB_GEOGRAPHY = PRDC_JSLAB_LIB_GEOGRAPHY;
