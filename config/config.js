/**
 * @file JSLAB global configuration
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for application configuration.
 */
class PRDC_APP_CONFIG {

  /**
   * Create JSLAB configuration object.
   */
  constructor() {
    this.PRODUCTION = false;
    this.DEBUG = false;
    this.TEST = false;
    this.SIGN_BUILD = false;
    
    this.GROUP_RAF = true;
    this.OUTPUT_COMPLETE_JSDOC = false;
    
    this.DEBUG_FUN_SHADOW = false;
    this.DEBUG_NEW_FUN = false;
    this.DEBUG_RENDER_GONE_ERROR = true;
    this.DEBUG_SYM_PYTHON_EVAL_CODE = false;
    this.DEBUG_PRE_TRANSFORMED_CODE = false;
    this.DEBUG_TRANSFORMED_CODE = false;
    this.DEBUG_PARALLEL_WORKER_SETUP_FUN = false;
    this.DEBUG_PARALLEL_WORKER_WORK_FUN = false;
    
    this.LOG_RENDER_GONE_ERROR = true;
    
    // Log codes
    this.LOG_CODES = {
      'other': 0,
      'render-gone-error': 1,
    };
    
    // JSLAB settings
    this.FORBIDDEN_NAMES = ['jsl', 'config', 'language', 'app_path', 'packed'];
    this.MATHJS_PREVENT_OVERRIDE = ['config', 'print', 'Infinity', 'NaN', 'isNaN', 'Node'];
    this.SUBMODULES = {
      'builtin': [
        {name: 'basic', file: 'basic', class_name: 'PRDC_JSLAB_LIB_BASIC'},
        {name: 'math', file: 'math', class_name: 'PRDC_JSLAB_LIB_MATH'},
        {name: 'non_blocking', file: 'non-blocking', class_name: 'PRDC_JSLAB_LIB_NON_BLOCKING'},
        {name: 'path', file: 'path', class_name: 'PRDC_JSLAB_LIB_PATH'},
        {name: 'windows', file: 'windows', class_name: 'PRDC_JSLAB_LIB_WINDOWS'},
        {name: 'figures', file: 'figures', class_name: 'PRDC_JSLAB_LIB_FIGURES'},
        {name: 'time', file: 'time', class_name: 'PRDC_JSLAB_LIB_TIME'},
        {name: 'array', file: 'array', class_name: 'PRDC_JSLAB_LIB_ARRAY'},
        {name: 'color', file: 'color', class_name: 'PRDC_JSLAB_LIB_COLOR'},
        {name: 'conversion', file: 'conversion', class_name: 'PRDC_JSLAB_LIB_CONVERSION'},
        {name: 'device', file: 'device', class_name: 'PRDC_JSLAB_LIB_DEVICE'},
        {name: 'serial_device', file: 'serial-device', class_name: 'PRDC_JSLAB_LIB_SERIAL_DEVICE'},
        {name: 'file_system', file: 'file-system', class_name: 'PRDC_JSLAB_LIB_FILE_SYSTEM'},
        {name: 'system', file: 'system', class_name: 'PRDC_JSLAB_LIB_SYSTEM'},
        {name: 'geography', file: 'geography', class_name: 'PRDC_JSLAB_LIB_GEOGRAPHY'},
        {name: 'networking', file: 'networking', class_name: 'PRDC_JSLAB_LIB_NETWORKING'},
        {name: 'format', file: 'format', class_name: 'PRDC_JSLAB_LIB_FORMAT'},
        {name: 'render', file: 'render', class_name: 'PRDC_JSLAB_LIB_RENDER'},
        {name: 'geometry', file: 'geometry', class_name: 'PRDC_JSLAB_LIB_GEOMETRY'},
        {name: 'control', file: 'control', class_name: 'PRDC_JSLAB_LIB_CONTROL'},
        {name: 'optim', file: 'optim', class_name: 'PRDC_JSLAB_LIB_OPTIM'},
        {name: 'presentation', file: 'presentation', class_name: 'PRDC_JSLAB_LIB_PRESENTATION'},
        {name: 'mechanics', file: 'mechanics', class_name: 'PRDC_JSLAB_LIB_MECHANICS'},
      ],
      'lib': [
        {name: 'parallel', file: 'parallel', class_name: 'PRDC_JSLAB_PARALLEL'},
        {name: 'mat', file: 'matrix-math', class_name: 'PRDC_JSLAB_MATRIX_MATH'},
        {name: 'vec', file: 'vector-math', class_name: 'PRDC_JSLAB_VECTOR_MATH'},
        {name: 'sym', file: 'sym-math', class_name: 'PRDC_JSLAB_SYMBOLIC_MATH'},
      ]
    };
    
    this.DOC_SUBMODULES_ADDITIONAL = [
      {name: 'Matrix', file: 'matrix-math', class_name: 'PRDC_JSLAB_MATRIX'},
      {name: 'Vector', file: 'vector-math', class_name: 'PRDC_JSLAB_VECTOR'},
      {name: 'Symbolic', file: 'sym-math', class_name: 'PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL'},
      {name: 'Window', file: 'windows', class_name: 'PRDC_JSLAB_WINDOW'},
      {name: 'Figure', file: 'figures', class_name: 'PRDC_JSLAB_FIGURE'},
      {name: 'Plot', file: 'figures', class_name: 'PRDC_JSLAB_PLOT'},
      {name: 'freecad_link', file: 'freecad-link', class_name: 'PRDC_JSLAB_FREECAD_LINK'},
      {name: 'om_link', file: 'om-link', class_name: 'PRDC_JSLAB_OPENMODELICA_LINK'},
      {name: 'tcp_client', file: 'networking-tcp', class_name: 'PRDC_JSLAB_TCP_CLIENT'},
      {name: 'tcp_server', file: 'networking-tcp', class_name: 'PRDC_JSLAB_TCP_SERVER'},
      {name: 'udp_client', file: 'networking-udp', class_name: 'PRDC_JSLAB_UDP'},
      {name: 'udp_server', file: 'networking-udp', class_name: 'PRDC_JSLAB_UDP_SERVER'},
      {name: 'video_call', file: 'networking-videocall', class_name: 'PRDC_JSLAB_VIDEOCALL'},
      {name: 'mathjs', file: 'mathjs-doc', class_name: 'PRDC_JSLAB_MATHJS_DOC'},
      {name: 'rcmiga', file: 'optim-rcmiga', class_name: 'PRDC_JSLAB_OPTIM_RCMIGA'},
      {name: 'space_search', file: 'geometry-spacesearch', class_name: 'PRDC_JSLAB_GEOMETRY_SPACE_SERACH'},
      {name: 'map', file: 'geography-map', class_name: 'PRDC_JSLAB_GEOGRAPHY_MAP'},
      {name: 'map_3d', file: 'geography-map-3d', class_name: 'PRDC_JSLAB_GEOGRAPHY_MAP_3D'},
      {name: 'Gamepad', file: 'device-gamepad', class_name: 'PRDC_JSLAB_DEVICE_GAMEPAD'},
    ];

    this.SOURCE_CODE_BOOK_FILES = [
      'package.json',
      'binding.gyp',
      'config',
      'cpp',
      'css',
      'html',
      'js'
    ];
    
    this.LINT_OPTIONS = {
      overrideConfigFile: true,
      overrideConfig: {
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: "module"
        },
        rules: {
          "no-unused-vars": "warn",
          "semi": ["warn", "always"],
          "no-extra-semi": "warn",
          "no-unreachable": "warn",
          "consistent-return": "warn",
          "no-shadow": "warn",
          "no-use-before-define": "warn"
        }
      }
    };

    this.COMPRESSED_LIBS = [
      'leaflet-1.9.4',
      'sympy-0.26.2',
      'cgal-6.0.1', 
      'boost-1.86.0', 
      'codemirror-5.49.2', 
      'eigen-3.4.0',
      'three.js-r162',
      'Cesium-1.124',
    ];
    this.COMPILE_LIBS = [];
    
    // Language 
    this.langs = ["en", "rs", "rsc"];
    
    // Windows
    this.WIN_SAVE_DEBOUNCE_TIME = 50; // [ms]
    
    // Other
    this.PLOTER = ['plotly', 'echarts'][0];
    this.DOC_LATEX_RERUNS_NUMBER = 3;
    this.SOURCE_CODE_BOOK_LATEX_RERUNS_NUMBER = 3;
    this.MAX_ACTIVE_WEBGL_CONTEXTS = '128';
    this.MAX_JSON_STRING_LENGTH = 1000;
    
    // Build sign
    this.COMPANY_NAME = process.env.COMPANY_NAME;
    this.TIMESTAMP_SERVER = process.env.TIMESTAMP_SERVER;
    this.SIGN_TOOL_PATH = process.env.SIGN_TOOL_PATH;
    
    // Upload and download libs from server
    this.SERVER_SOURCE_PATH = process.env.SERVER_PATH + "JSLAB/";
    this.SOURCE_UPLOAD_EXCLUDE = ['/bin', '/build', '/dist', '/node_modules', '/package-lock.json', '/binding.gyp', '/lib'];
    this.SERVER_LIBS_PATH = process.env.SERVER_LIBS_PATH;

    this.USED_LIBS = [
      'sprintf-1.1.3',
      'sympy-0.26.2',
      'cgal-6.0.1', 
      'boost-1.86.0', 
      'codemirror-5.49.2', 
      'complete.ly.1.0.1', 
      'd3-7.8.5', 
      'draggabilly-2.3.0',
      'eigen-3.4.0',
      'highlight-11.0.1',
      'jquery-3.7.0',
      'jshint-2.13.0',
      'math-11.8.2', 
      'tex-mml-chtml-3.2.0',
      'luxon-3.4.4',
      'plotly-2.24.2',
      'three.js-r162',
      'inflate-0.3.1',
      'hammer-2.0.8',
      'anime-3.2.1',
      'tween.js-23.1.1',
      'leaflet-1.9.4',
      'leaflet.rotatedMarker-0.2.0',
      'Cesium-1.124',
      'mermaid-11.4.1',
      'jstree-3.3.17',
      'PRDC_APP_LOGGER',  
      'PRDC_PANEL', 
      'PRDC_TABS', 
      'PRDC_POPUP',
      'PRDC_SVG_VIEWER'
    ];
    
    this.UPLOAD_COMPARE_SIZE = false;
    this.UPLOAD_COMPARE_CONTENT = true;
    this.UPLOAD_COMPARE_DATE = false;
    this.UPLOAD_COMPARE_SIZE_ON_DISTINCT = false;
    
    // Conditional variables
    if(typeof process_arguments != 'undefined') {
      var args = process_arguments.map(function(e) { return e.toLowerCase(); });
      if(args.includes("--debug-app")) {
        this.DEBUG = true;
      }
      if(args.includes("--test-app")) {
        this.TEST = true;
      }
      if(args.includes("--sign-build")) {
        this.SIGN_BUILD = true;
      }
    }
    
    this.PANEL_RESIZER_WIDTH = 10;
    this.PANEL_MIN_SIZE = 10;
    this.PANEL_DEFAULT_COLUMNS = [20, 80];
    this.PANEL_DEFAULT_LEFT_ROWS = [100/3, 100/3, 100/3];
    this.PANEL_DEFAULT_WORKSPACE_COLUMNS = [50, 25, 25];
  }
}

exports.PRDC_APP_CONFIG = PRDC_APP_CONFIG;