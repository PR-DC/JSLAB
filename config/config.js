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
    this.REPORT_CRASH = false;
    
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
    this.MATHJS_PREVENT_OVERRIDE = ['config', 'print', 'Infinity', 'NaN', 'isNaN', 'Node'];
    this.SUBMODULES = {
      'builtin': [
        {name: 'basic', file: 'basic', class_name: 'PRDC_JSLAB_LIB_BASIC'},
        {name: 'compile', file: 'compile', class_name: 'PRDC_JSLAB_LIB_COMPILE'},
        {name: 'docs', file: 'docs', class_name: 'PRDC_JSLAB_LIB_DOCS'},
        {name: 'inspector', file: 'inspector', class_name: 'PRDC_JSLAB_LIB_INSPECTOR'},
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
        {name: 'table', file: 'table', class_name: 'PRDC_JSLAB_LIB_TABLE'},
        {name: 'render', file: 'render', class_name: 'PRDC_JSLAB_LIB_RENDER'},
        {name: 'geometry', file: 'geometry', class_name: 'PRDC_JSLAB_LIB_GEOMETRY'},
        {name: 'control', file: 'control', class_name: 'PRDC_JSLAB_LIB_CONTROL'},
        {name: 'optim', file: 'optim', class_name: 'PRDC_JSLAB_LIB_OPTIM'},
        {name: 'presentation', file: 'presentation', class_name: 'PRDC_JSLAB_LIB_PRESENTATION'},
        {name: 'mechanics', file: 'mechanics', class_name: 'PRDC_JSLAB_LIB_MECHANICS'},
        {name: 'gui', file: 'gui', class_name: 'PRDC_JSLAB_LIB_GUI'},
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
      {name: 'Table', file: 'table', class_name: 'PRDC_JSLAB_TABLE'},
      {name: 'Timetable', file: 'table', class_name: 'PRDC_JSLAB_TIMETABLE'},
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
      {name: 'boundary_follow_2d', file: 'geometry-boundaryfollow2d', class_name: 'PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_2D'},
      {name: 'boundary_follow_3d', file: 'geometry-boundaryfollow3d', class_name: 'PRDC_JSLAB_GEOMETRY_BOUNDARY_FOLLOW_3D'},
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
    
    this.SOURCE_CODE_BOOK_FILES_EXCLUDE = [
      'html/io_html_figure.html'
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
    this.PLOTTER = ['plotly', 'echarts'][0];
    this.DOC_LATEX_RERUNS_NUMBER = 3;
    this.SOURCE_CODE_BOOK_LATEX_RERUNS_NUMBER = 3;
    this.MAX_ACTIVE_WEBGL_CONTEXTS = '128';
    this.MAX_JSON_STRING_LENGTH = 1000;
    this.ANS_VECTOR_HORIZONTAL_MAX_ITEMS = 50;
    this.ANS_MATRIX_PRETTY_MAX_ROWS = 10;
    this.ANS_MATRIX_PRETTY_MAX_COLS = 10;
    this.ANS_MATRIX_PRETTY_MAX_ITEMS = 100;
    this.TERMINAL_MIN_MESSAGES_MAX = 5;
    this.TERMINAL_DOM_MESSAGES_HARD_CAP = 500;
    this.TERMINAL_RENDER_CHUNK_SIZE = 50;
    this.TERMINAL_RENDER_SCROLL_THRESHOLD = 150;
    this.TERMINAL_MERGE_INTERVAL_MS_COMMAND = 1;
    this.TERMINAL_MERGE_INTERVAL_MS_SERIAL = 5;
    this.EDITOR_SEARCH_ALL_DEFAULT_HEIGHT = 240;
    this.EDITOR_SEARCH_ALL_MIN_HEIGHT = 120;
    this.EDITOR_SEARCH_ALL_MIN_CODE_HEIGHT = 120;
    this.EDITOR_SEARCH_ALL_LAYOUT_OFFSET = 91;
    this.EDITOR_SEARCH_ALL_MAX_RENDERED_LINES = 2000;
    
    // Build sign
    this.COMPANY_NAME = process.env.COMPANY_NAME;
    this.TIMESTAMP_SERVER = process.env.TIMESTAMP_SERVER;
    this.SIGN_TOOL_PATH = process.env.SIGN_TOOL_PATH;
    
    this.PANEL_RESIZER_WIDTH = 10;
    this.PANEL_MIN_SIZE = 10;
    this.PANEL_DEFAULT_COLUMNS = [20, 80];
    this.PANEL_DEFAULT_LEFT_ROWS = [100/3, 100/3, 100/3];
    this.PANEL_DEFAULT_WORKSPACE_COLUMNS = [50, 25, 25];
  }
}

exports.PRDC_APP_CONFIG = PRDC_APP_CONFIG;
