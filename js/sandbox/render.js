/**
 * @file JSLAB library render submodule
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */
 
/**
 * Class for JSLAB render submodule.
 */
class PRDC_JSLAB_LIB_RENDER {
  
  /**
   * Initializes a new instance of the render submodule.
   * @param {Object} jsl Reference to the main JSLAB object.
   */
  constructor(jsl) {
    var obj = this;
    this.jsl = jsl;
  }
  
  /**
   * Debounces a function, ensuring it's only invoked once at the beginning of consecutive calls during the wait period.
   * @param {Function} func - The function to debounce.
   * @param {number} wait - The period to wait before allowing another call, in milliseconds.
   * @returns {Function} The debounced function.
   */
  debounceIn(func, wait) {
    var timeout;
    let last_args;
    
    return function(...args) {
      var context = this;
      last_args = args;
      var later = function() {
        timeout = null;
      };
      if(!timeout) {
        timeout = setTimeout(later, wait);
        func.apply(context, last_args);
      }
    };
  }

  /**
   * Debounces a function, calling it at the first and last of consecutive calls during the wait period.
   * @param {Function} func - The function to debounce.
   * @param {number} wait - The period to wait before allowing another call, in milliseconds.
   * @returns {Function} The debounced function.
   */
  debounceInOut(func, wait) {
    var timeout;
    var hit = false;
    let last_args;
    
    return function(...args) {
      var context = this;
      last_args = args;
      var later = function() {
        if(hit) {
          hit = false;
          func.apply(context, last_args);
          setTimeout(later, wait);
        } else {
          timeout = null;
        }
      };
      if(!timeout) {
        timeout = setTimeout(later, wait);
        func.apply(context, last_args);
      } else {
        hit = true;
      }
    };
  }

  /**
   * Debounces a function, ensuring it's only invoked once at the end of consecutive calls during the wait period.
   * @param {Function} func - The function to debounce.
   * @param {number} wait - The period to wait before allowing another call, in milliseconds.
   * @returns {Function} The debounced function.
   */
  debounceOut(func, wait) {
    var timeout;
    let last_args;
    
    return function(...args) {
      var context = this;
      last_args = args;
      var later = function() {
        timeout = null;
        func.apply(context, last_args);
      };
      if(!timeout) {
        timeout = setTimeout(later, wait);
      }
    };
  }
}

exports.PRDC_JSLAB_LIB_RENDER = PRDC_JSLAB_LIB_RENDER;