/**
 * @file JSLAB web sandbox submodule map
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

var { PRDC_JSLAB_LIB_BASIC } = require('./basic');
var { PRDC_JSLAB_LIB_COMPILE } = require('./compile');
var { PRDC_JSLAB_LIB_DOCS } = require('./docs');
var { PRDC_JSLAB_LIB_INSPECTOR } = require('./inspector');
var { PRDC_JSLAB_LIB_MATH } = require('./math');
var { PRDC_JSLAB_LIB_NON_BLOCKING } = require('./non-blocking');
var { PRDC_JSLAB_LIB_PATH } = require('./path');
var { PRDC_JSLAB_LIB_WINDOWS } = require('./windows');
var { PRDC_JSLAB_LIB_FIGURES } = require('./figures');
var { PRDC_JSLAB_LIB_TIME } = require('./time');
var { PRDC_JSLAB_LIB_ARRAY } = require('./array');
var { PRDC_JSLAB_LIB_COLOR } = require('./color');
var { PRDC_JSLAB_LIB_CONVERSION } = require('./conversion');
var { PRDC_JSLAB_LIB_DEVICE } = require('./device');
var { PRDC_JSLAB_LIB_SERIAL_DEVICE } = require('./serial-device');
var { PRDC_JSLAB_LIB_FILE_SYSTEM } = require('./file-system');
var { PRDC_JSLAB_LIB_SYSTEM } = require('./system');
var { PRDC_JSLAB_LIB_GEOGRAPHY } = require('./geography');
var { PRDC_JSLAB_LIB_NETWORKING } = require('./networking');
var { PRDC_JSLAB_LIB_FORMAT } = require('./format');
var { PRDC_JSLAB_LIB_TABLE } = require('./table');
var { PRDC_JSLAB_LIB_RENDER } = require('./render');
var { PRDC_JSLAB_LIB_GEOMETRY } = require('./geometry');
var { PRDC_JSLAB_LIB_CONTROL } = require('./control');
var { PRDC_JSLAB_LIB_OPTIM } = require('./optim');
var { PRDC_JSLAB_LIB_PRESENTATION_WEB } = require('./presentation-web');
var { PRDC_JSLAB_LIB_MECHANICS } = require('./mechanics');
var { PRDC_JSLAB_LIB_GUI } = require('./gui');
var { PRDC_JSLAB_PARALLEL } = require('./parallel');
var { PRDC_JSLAB_MATRIX_MATH } = require('./matrix-math');
var { PRDC_JSLAB_VECTOR_MATH } = require('./vector-math');
var { PRDC_JSLAB_SYMBOLIC_MATH } = require('./sym-math');

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
  'presentation': PRDC_JSLAB_LIB_PRESENTATION_WEB,
  'mechanics': PRDC_JSLAB_LIB_MECHANICS,
  'gui': PRDC_JSLAB_LIB_GUI,
  'parallel': PRDC_JSLAB_PARALLEL,
  'matrix-math': PRDC_JSLAB_MATRIX_MATH,
  'vector-math': PRDC_JSLAB_VECTOR_MATH,
  'sym-math': PRDC_JSLAB_SYMBOLIC_MATH
};

var WEB_UNAVAILABLE_SUBMODULES = {};

/**
 * Returns the web constructor for a configured submodule.
 * @param {Object} module_data
 * @returns {Function|undefined}
 */
function getWebSubmoduleConstructor(module_data) {
  if(module_data && Object.prototype.hasOwnProperty.call(WEB_SUBMODULE_CONSTRUCTORS, module_data.file)) {
    return WEB_SUBMODULE_CONSTRUCTORS[module_data.file];
  }
}

/**
 * Returns the unavailable-module descriptor for a configured submodule.
 * @param {Object} module_data
 * @returns {Object|undefined}
 */
function getWebUnavailableSubmodule(module_data) {
  if(module_data && Object.prototype.hasOwnProperty.call(WEB_UNAVAILABLE_SUBMODULES, module_data.name)) {
    return WEB_UNAVAILABLE_SUBMODULES[module_data.name];
  }
}

exports.getWebSubmoduleConstructor = getWebSubmoduleConstructor;
exports.getWebUnavailableSubmodule = getWebUnavailableSubmodule;
