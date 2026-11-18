/**
 * @file JSLAB web sandbox submodule map
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Resolves scientific module constructors and their availability in browser runtimes.
 */
class PRDC_JSLAB_WEB_SANDBOX_MODULES {

  /**
   * Returns the web constructor for a configured submodule.
   * @param {Object} module_data
   * @returns {Function|undefined}
   */
  static getWebSubmoduleConstructor(module_data) {
    if(module_data && Object.prototype.hasOwnProperty.call(WEB_SUBMODULE_CONSTRUCTORS, module_data.file)) {
      return WEB_SUBMODULE_CONSTRUCTORS[module_data.file];
    }
  }

  /**
   * Returns the unavailable-module descriptor for a configured submodule.
   * @param {Object} module_data
   * @returns {Object|undefined}
   */
  static getWebUnavailableSubmodule(module_data) {
    if(module_data && Object.prototype.hasOwnProperty.call(WEB_UNAVAILABLE_SUBMODULES, module_data.name)) {
      return WEB_UNAVAILABLE_SUBMODULES[module_data.name];
    }
  }
}


var { PRDC_JSLAB_LIB_BASIC } = require("../sandbox/basic");
var { PRDC_JSLAB_LIB_COMPILE } = require("../sandbox/compile");
var { PRDC_JSLAB_LIB_DOCS } = require("../sandbox/docs");
var { PRDC_JSLAB_LIB_INSPECTOR } = require("../sandbox/inspector");
var { PRDC_JSLAB_LIB_MATH } = require("../sandbox/math");
var { PRDC_JSLAB_LIB_NON_BLOCKING } = require("../sandbox/non-blocking");
var { PRDC_JSLAB_LIB_PATH } = require("../sandbox/path");
var { PRDC_JSLAB_LIB_WINDOWS } = require("../sandbox/windows");
var { PRDC_JSLAB_LIB_FIGURES } = require("../sandbox/figures");
var { PRDC_JSLAB_LIB_TIME } = require("../sandbox/time");
var { PRDC_JSLAB_LIB_ARRAY } = require("../sandbox/array");
var { PRDC_JSLAB_LIB_COLOR } = require("../sandbox/color");
var { PRDC_JSLAB_LIB_CONVERSION } = require("../sandbox/conversion");
var { PRDC_JSLAB_LIB_DEVICE } = require("../sandbox/device");
var { PRDC_JSLAB_LIB_SERIAL_DEVICE } = require("../sandbox/serial-device");
var { PRDC_JSLAB_LIB_FILE_SYSTEM } = require("../sandbox/file-system");
var { PRDC_JSLAB_LIB_SYSTEM } = require("../sandbox/system");
var { PRDC_JSLAB_LIB_GEOGRAPHY } = require("../sandbox/geography");
var { PRDC_JSLAB_LIB_NETWORKING } = require("../sandbox/networking");
var { PRDC_JSLAB_LIB_FORMAT } = require("../sandbox/format");
var { PRDC_JSLAB_LIB_TABLE } = require("../sandbox/table");
var { PRDC_JSLAB_LIB_RENDER } = require("../sandbox/render");
var { PRDC_JSLAB_LIB_GEOMETRY } = require("../sandbox/geometry");
var { PRDC_JSLAB_LIB_CONTROL } = require("../sandbox/control");
var { PRDC_JSLAB_LIB_OPTIM } = require("../sandbox/optim");
var { PRDC_JSLAB_LIB_PRESENTATION } = require("../sandbox/presentation");
var { PRDC_JSLAB_LIB_MECHANICS } = require("../sandbox/mechanics");
var { PRDC_JSLAB_LIB_GUI } = require("../sandbox/gui");
var { PRDC_JSLAB_PARALLEL } = require("../sandbox/parallel");
var { PRDC_JSLAB_MATRIX_MATH } = require("../sandbox/matrix-math");
var { PRDC_JSLAB_VECTOR_MATH } = require("../sandbox/vector-math");
var { PRDC_JSLAB_SYMBOLIC_MATH } = require("../sandbox/sym-math");

var WEB_SUBMODULE_CONSTRUCTORS = {
  'basic': PRDC_JSLAB_LIB_BASIC,
  'compile': PRDC_JSLAB_LIB_COMPILE,
  'docs': PRDC_JSLAB_LIB_DOCS,
  'inspector': PRDC_JSLAB_LIB_INSPECTOR,
  'math': PRDC_JSLAB_LIB_MATH,
  'non-blocking': PRDC_JSLAB_LIB_NON_BLOCKING,
  'path': PRDC_JSLAB_LIB_PATH,
  'windows': PRDC_JSLAB_LIB_WINDOWS,
  'figures': PRDC_JSLAB_LIB_FIGURES,
  'time': PRDC_JSLAB_LIB_TIME,
  'array': PRDC_JSLAB_LIB_ARRAY,
  'color': PRDC_JSLAB_LIB_COLOR,
  'conversion': PRDC_JSLAB_LIB_CONVERSION,
  'device': PRDC_JSLAB_LIB_DEVICE,
  'serial-device': PRDC_JSLAB_LIB_SERIAL_DEVICE,
  'file-system': PRDC_JSLAB_LIB_FILE_SYSTEM,
  'system': PRDC_JSLAB_LIB_SYSTEM,
  'geography': PRDC_JSLAB_LIB_GEOGRAPHY,
  'networking': PRDC_JSLAB_LIB_NETWORKING,
  'format': PRDC_JSLAB_LIB_FORMAT,
  'table': PRDC_JSLAB_LIB_TABLE,
  'render': PRDC_JSLAB_LIB_RENDER,
  'geometry': PRDC_JSLAB_LIB_GEOMETRY,
  'control': PRDC_JSLAB_LIB_CONTROL,
  'optim': PRDC_JSLAB_LIB_OPTIM,
  'presentation': PRDC_JSLAB_LIB_PRESENTATION,
  'mechanics': PRDC_JSLAB_LIB_MECHANICS,
  'gui': PRDC_JSLAB_LIB_GUI,
  'parallel': PRDC_JSLAB_PARALLEL,
  'matrix-math': PRDC_JSLAB_MATRIX_MATH,
  'vector-math': PRDC_JSLAB_VECTOR_MATH,
  'sym-math': PRDC_JSLAB_SYMBOLIC_MATH
};

var WEB_UNAVAILABLE_SUBMODULES = {};


exports.getWebSubmoduleConstructor = PRDC_JSLAB_WEB_SANDBOX_MODULES.getWebSubmoduleConstructor;
exports.getWebUnavailableSubmodule = PRDC_JSLAB_WEB_SANDBOX_MODULES.getWebUnavailableSubmodule;
