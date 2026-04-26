/**
 * @file Shared browser sandbox session backed by the real JSLAB runtime
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

globalThis.global = globalThis;

function ensureBrowserProcess() {
  if(typeof globalThis.process == 'undefined' || !globalThis.process) {
    globalThis.process = {};
  }
  if(typeof globalThis.process.env == 'undefined' || !globalThis.process.env) {
    globalThis.process.env = {};
  }
  if(!Array.isArray(globalThis.process.argv)) {
    globalThis.process.argv = [];
  }
  if(typeof globalThis.process.cwd != 'function') {
    globalThis.process.cwd = function() {
      return '/';
    };
  }
  if(typeof globalThis.process.type == 'undefined') {
    globalThis.process.type = 'browser';
  }
  if(typeof globalThis.process.platform == 'undefined') {
    globalThis.process.platform = 'browser';
  }
  if(typeof globalThis.process.arch == 'undefined') {
    globalThis.process.arch = 'browser';
  }
}

ensureBrowserProcess();

if(typeof globalThis.process_arguments == 'undefined') {
  globalThis.process_arguments = [];
}
globalThis.process.argv = globalThis.process_arguments.slice();
globalThis.__JSLAB_RUNTIME__ = 'web';

require('../shared/init-config');

var strings = require('../../config/lang.json');
var { PRDC_JSLAB_LIB } = require('../sandbox/jslab');

function previewValue(value) {
  if(value === undefined) {
    return 'undefined';
  }
  if(value === null) {
    return 'null';
  }
  if(typeof value == 'string') {
    return JSON.stringify(value.length > 200 ? value.slice(0, 197) + '...' : value);
  }
  if(typeof value == 'number' || typeof value == 'boolean' || typeof value == 'bigint') {
    return String(value);
  }
  if(typeof value == 'function') {
    return '[Function ' + (value.name || 'anonymous') + ']';
  }
  if(Array.isArray(value)) {
    return 'Array(' + value.length + ')';
  }
  if(value instanceof Promise) {
    return '[Promise]';
  }
  var ctor = value && value.constructor && value.constructor.name
    ? value.constructor.name
    : 'Object';
  var keys = Object.keys(value || {});
  return ctor + (keys.length ? ' {' + keys.slice(0, 5).join(', ') + (keys.length > 5 ? ', ...' : '') + '}' : '');
}

class PRDC_JSLAB_WEB_WORKER_LANGUAGE {

  constructor(lang) {
    this.s = strings;
    this.lang = ['en', 'rs', 'rsc'].includes(lang) ? lang : 'en';
  }

  set(lang) {
    if(['en', 'rs', 'rsc'].includes(lang)) {
      this.lang = lang;
    }
  }

  currentString(id) {
    var key = String(id);
    if(!(key in this.s) || !(this.lang in this.s[key])) {
      return '';
    }
    return this.s[key][this.lang];
  }

  string(id) {
    return this.currentString(id);
  }

  formatLang(id, values) {
    var text = this.currentString(id);
    if(!values || typeof values != 'object') {
      return text;
    }
    Object.keys(values).forEach(function(key) {
      text = text.replaceAll('{' + key + '}', String(values[key]));
    });
    return text;
  }
}

class PRDC_JSLAB_WEB_SHARED_SANDBOX_SESSION {

  /**
   * @param {Object} rpc
   */
  constructor(rpc) {
    this.rpc = rpc;
    this.lang = new PRDC_JSLAB_WEB_WORKER_LANGUAGE('en');
    this.language = this.lang;
    this.inter = {
      prettyPrint: previewValue
    };

    globalThis.language = this.lang;

    this.jsl = new PRDC_JSLAB_LIB('/', false);
    this.jsl.current_path = '/workspace/';
    this.jsl.includes_path = '/includes/';
    this.jsl.saved_paths = ['/workspace/'];

    this.jsl.emitRuntimeMessage = this.emitRuntimeMessage.bind(this);
    this.jsl.emitUnavailable = this.emitUnavailable.bind(this);
    this.jsl.onWorkspaceUpdated = this.onWorkspaceUpdated.bind(this);
    this.jsl.onStatsUpdated = this.onStatsUpdated.bind(this);
    this.jsl.onStatusUpdated = this.onStatusUpdated.bind(this);

    this.ready = true;
  }

  emitRuntimeMessage(message, level) {
    if(this.rpc) {
      this.rpc.notify('runtime-log', {
        level: level || 'info',
        message: message
      });
    }
  }

  emitUnavailable(message) {
    this.emitRuntimeMessage(message, 'warn');
  }

  onWorkspaceUpdated() {
    if(this.rpc) {
      this.rpc.notify('workspace-updated', this.snapshotWorkspace());
    }
  }

  onStatsUpdated(stats) {
    if(this.rpc) {
      this.rpc.notify('stats-updated', stats || {});
    }
  }

  onStatusUpdated(state, text) {
    if(this.rpc) {
      this.rpc.notify('status-updated', {
        state: state,
        text: text
      });
    }
  }

  snapshotWorkspace() {
    var snapshot = {};
    this.jsl.getWorkspaceProperties().sort().forEach((name) => {
      snapshot[name] = previewValue(this.jsl.context[name]);
    });
    return snapshot;
  }

  async evaluate(code) {
    var eval_runtime = this.jsl.eval;
    this.jsl.onEvaluating();
    this.jsl.jsl_file_name = 'jslcmdwindow';
    this.jsl.current_script = 'jslcmdwindow';

    eval_runtime.source_codes = [];
    eval_runtime.transformed_codes = [];
    eval_runtime.source_maps = [];
    eval_runtime.source_map_scripts = [];
    eval_runtime.current_source_code = undefined;
    eval_runtime.current_source_map = undefined;
    eval_runtime.current_source_script = undefined;

    this.jsl.savePreviousWorkspace();
    this.jsl.loadPreviousWorkspace();

    try {
      var value = await this.jsl.eval.evalString(String(code || ''));
      if(this.jsl.no_ans === false) {
        this.jsl.context.ans = value;
      }
      if(this.jsl.ignore_output === false) {
        this.jsl.inter.env.showAns(this.jsl.inter.prettyPrint(value));
      }
      this.jsl.onEvaluated();
      return value;
    } catch(err) {
      this.jsl.eval.onEvalError(err);
      throw err;
    }
  }

  setLanguage(lang) {
    this.lang.set(lang);
    this.jsl.onStatusUpdated('ready', this.lang.currentString(87));
  }

  handshake() {
    return {
      runtime: 'shared-web-sandbox',
      note: 'Web worker uses PRDC_JSLAB_LIB with a web-safe module registry. Unsupported desktop-only features are reported when called.',
      workspace: this.snapshotWorkspace(),
      capabilities: this.jsl.env.getCapabilities(),
      runtime_info: typeof this.jsl.env.getRuntimeInfo == 'function'
        ? this.jsl.env.getRuntimeInfo()
        : {}
    };
  }
}

exports.PRDC_JSLAB_WEB_SHARED_SANDBOX_SESSION = PRDC_JSLAB_WEB_SHARED_SANDBOX_SESSION;
