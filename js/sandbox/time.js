/**
 * @file JSLAB library time submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB time submodule.
 */
class PRDC_JSLAB_LIB_TIME {
  
  /**
   * Initializes the time submodule, setting up properties for time tracking and exposing time measurement utilities.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;

    /**
     * Current timezone string.
     * @type {string}
     */
    this.timezone = 'Europe/Belgrade';
    
    /**
     * Last tic timestamp.
     * @type {number}
     */
    this.last_tic = 0;
    
    /**
     * Starts a timer for measuring elapsed time. To be used with `toc` to measure time intervals.
     * @name tic
     * @kind function
     * @memberof PRDC_JSLAB_LIB_TIME
     */
    Object.defineProperty(this.jsl.context, 'tic', {configurable: true, get: this._tic });
  }
  
  /**
   * Records the current wall-clock time to measure elapsed time.
   * @returns {number} The current wall-clock time in milliseconds.
   */
  _tic() {
    this.jsl.context.last_tic = performance.now()/1000; // [s]
    return this.jsl.context.last_tic;
  }

  /**
   * Calculates the wall-clock time elapsed since a specified start time or the last call to `tic()`, in seconds.
   * @param {number} [tic] - The start time in milliseconds from which to calculate elapsed time. If omitted, uses the last time recorded by `tic()`.
   * @returns {number} The elapsed time in seconds.
   */
  toc(tic) {
    var dt = performance.now()/1000;
    if(arguments.length < 1) {
      return dt-this.jsl.context.last_tic;
    } else {
      return dt-tic;
    } 
  }

  /**
   * Calculates the wall-clock time elapsed since a specified start time or the last call to `tic()`, in seconds.
   * @param {number} [tic] - The start time in milliseconds from which to calculate elapsed time. If omitted, uses the last time recorded by `tic()`.
   * @returns {number} The elapsed time in milliseconds.
   */
  tocms(tic) {
    if(!tic) {
      tic = global.last_tic;
    }
    return (performance.now()-tic*1000);
  }

  /**
   * Gets the current Unix timestamp adjusted for a specified timezone.
   * @returns {number} The current Unix timestamp as an integer.
   */
  getTimestamp() {
    return luxon.DateTime.now().setZone(this.timezone).toMillis();
  }

  /**
   * Gets the current time as a string adjusted for a specified timezone.
   * @returns {string} The current time in 'HH:mm:ss' format.
   */
  getTime() {
    return luxon.DateTime.now().setZone(this.timezone).toFormat('HH:mm:ss');
  }

  /**
   * Gets the current time with milliseconds as a string adjusted for a specified timezone.
   * @returns {string} The current time in 'HH:mm:ss.SSS' format.
   */
  getFullTime() {
    return luxon.DateTime.now().setZone(this.timezone).toFormat('HH:mm:ss.SSS');
  }

  /**
   * Gets the current date as a string adjusted for a specified timezone.
   * @returns {string} The current date in 'dd.MM.yyyy.' format.
   */
  getDate() {
    return luxon.DateTime.now().setZone(this.timezone).toFormat('dd.MM.yyyy.');
  }

  /**
   * Gets the current date and time as a string adjusted for a specified timezone.
   * @returns {string} The current date and time in 'dd.MM.yyyy. HH:mm:ss' format.
   */
  getDateTime() {
    return luxon.DateTime.now().setZone(this.timezone).toFormat('dd.MM.yyyy. HH:mm:ss');
  }

  /**
   * Gets the current date and time with milliseconds as a string adjusted for a specified timezone.
   * @returns {string} The current date and time in 'dd.MM.yyyy. HH:mm:ss.SSS' format.
   */
  getDateTimeFull() {
    return luxon.DateTime.now().setZone(this.timezone).toFormat('dd.MM.yyyy. HH:mm:ss.SSS');
  }

  /**
   * Gets the current date and time as a string suitable for filenames, adjusted for a specified timezone.
   * @returns {string} The current date and time in 'ddMMyyyy_HHmmss' format for use in filenames.
   */
  getDateTimeStr() {
    return luxon.DateTime.now().setZone(this.timezone).toFormat('ddMMyyyy_HHmmss');
  }
  
  /**
   * Sets the timezone to be used for time calculations and formatting. This method allows the application to adjust displayed times according to a specific timezone.
   * @param {String} tz The timezone identifier (e.g., "America/New_York", "Europe/Paris") to be set for all time-related operations.
   */
  setTimezone(tz) {
    this.timezone = tz;
  }
}

exports.PRDC_JSLAB_LIB_TIME = PRDC_JSLAB_LIB_TIME;