/**
 * @file Javascript tester module
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

if(typeof jsl !== 'undefined' && jsl) {
  require = jsl._require;
}

const fs = require('fs');
const path = require('path');

/**
 * Resolves application root path for test discovery/report writing.
 * Falls back to repository root when global path is not available.
 * @returns {string}
 */
function resolveAppPath() {
  if(typeof app_path !== 'undefined' &&
      typeof app_path === 'string' &&
      app_path.length) {
    return app_path;
  }

  if(typeof globalThis !== 'undefined' &&
      typeof globalThis.app_path === 'string' &&
      globalThis.app_path.length) {
    return globalThis.app_path;
  }

  if(typeof process !== 'undefined' && Array.isArray(process.argv)) {
    var app_arg = process.argv.find(function(arg) {
      return String(arg).startsWith('--app-path=');
    });
    if(app_arg) {
      var parsed = String(app_arg)
        .slice('--app-path='.length)
        .replace(/[\\\/]js[\\\/]?$/, '');
      if(parsed.length) {
        return parsed;
      }
    }
  }

  return path.resolve(__dirname, '..', '..');
}

/**
 * Internal error used for explicit test skips.
 */
class PRDC_JSLAB_TEST_SKIP extends Error {

  /**
   * @param {string} [message='Skipped']
   */
  constructor(message = 'Skipped') {
    super(message);
    this.name = 'PRDC_JSLAB_TEST_SKIP';
    this.is_skip = true;
  }
}

/**
 * Assertion helpers for tests.
 */
class PRDC_TEST_ASSERT {

  /**
   * Forces test failure.
   * @param {string} [message]
   */
  static fail(message) {
    throw new Error(message || 'Assertion failed.');
  }

  /**
   * Asserts that value is truthy.
   * @param {*} value
   * @param {string} [message]
   */
  static ok(value, message) {
    if(!value) {
      this.fail(message || 'Expected value to be truthy.');
    }
    return true;
  }

  /**
   * Asserts strict equality.
   * @param {*} actual
   * @param {*} expected
   * @param {string} [message]
   */
  static equal(actual, expected, message) {
    if(actual !== expected) {
      this.fail(
        message ||
        ('Expected ' + this._formatValue(expected) + ', got ' + this._formatValue(actual) + '.')
      );
    }
    return true;
  }

  /**
   * Asserts strict inequality.
   * @param {*} actual
   * @param {*} expected
   * @param {string} [message]
   */
  static notEqual(actual, expected, message) {
    if(actual === expected) {
      this.fail(message || ('Did not expect ' + this._formatValue(actual) + '.'));
    }
    return true;
  }

  /**
   * Asserts deep structural equality.
   * @param {*} actual
   * @param {*} expected
   * @param {string} [message]
   */
  static deepEqual(actual, expected, message) {
    if(!this._deepEqual(actual, expected, new WeakMap())) {
      this.fail(
        message ||
        ('Expected deep equality between ' + this._formatValue(expected) +
        ' and ' + this._formatValue(actual) + '.')
      );
    }
    return true;
  }

  /**
   * Asserts numeric closeness.
   * @param {number} actual
   * @param {number} expected
   * @param {number} [epsilon=1e-9]
   * @param {string} [message]
   */
  static approx(actual, expected, epsilon = 1e-9, message) {
    if(typeof actual !== 'number' || typeof expected !== 'number') {
      this.fail(message || 'Approx assertion requires numeric values.');
    }
    if(!isFinite(actual) || !isFinite(expected)) {
      this.fail(message || 'Approx assertion requires finite numeric values.');
    }
    if(Math.abs(actual - expected) > Math.abs(epsilon)) {
      this.fail(
        message ||
        ('Expected ' + this._formatValue(actual) + ' to be within ' +
          this._formatValue(epsilon) + ' of ' + this._formatValue(expected) + '.')
      );
    }
    return true;
  }

  /**
   * Asserts that function throws.
   * @param {Function} fn
   * @param {(RegExp|string|Function)} [matcher]
   * @param {string} [message]
   */
  static throws(fn, matcher, message) {
    if(typeof fn !== 'function') {
      this.fail(message || 'throws() expects a function.');
    }
    try {
      fn();
    } catch(err) {
      if(this._errorMatches(err, matcher)) {
        return true;
      }
      this.fail(message || ('Thrown error did not match matcher: ' + this._formatError(err)));
    }
    this.fail(message || 'Expected function to throw.');
  }

  /**
   * Asserts that promise/function rejects.
   * @param {(Promise|Function)} input
   * @param {(RegExp|string|Function)} [matcher]
   * @param {string} [message]
   */
  static async rejects(input, matcher, message) {
    var promise = input;
    if(typeof input === 'function') {
      try {
        promise = input();
      } catch(err) {
        if(this._errorMatches(err, matcher)) {
          return true;
        }
        this.fail(message || ('Thrown error did not match matcher: ' + this._formatError(err)));
      }
    }
    if(!promise || typeof promise.then !== 'function') {
      this.fail(message || 'rejects() expects a Promise or function returning a Promise.');
    }
    try {
      await promise;
    } catch(err) {
      if(this._errorMatches(err, matcher)) {
        return true;
      }
      this.fail(message || ('Rejected error did not match matcher: ' + this._formatError(err)));
    }
    this.fail(message || 'Expected promise to reject.');
  }

  /**
   * Skips the current test.
   * @param {string} [message]
   */
  static skip(message) {
    throw new PRDC_JSLAB_TEST_SKIP(message || 'Skipped.');
  }

  /**
   * Formats values for assertion messages.
   * @param {*} value
   * @returns {string}
   */
  static _formatValue(value) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Formats error for assertion messages.
   * @param {*} err
   * @returns {string}
   */
  static _formatError(err) {
    if(!err) {
      return 'Unknown error.';
    }
    if(err.stack) {
      return err.stack;
    }
    if(err.message) {
      return err.message;
    }
    return String(err);
  }

  /**
   * Checks whether error matches matcher.
   * @param {*} err
   * @param {(RegExp|string|Function)} matcher
   * @returns {boolean}
   */
  static _errorMatches(err, matcher) {
    if(typeof matcher === 'undefined' || matcher === null) {
      return true;
    }
    if(typeof matcher === 'function') {
      return !!matcher(err);
    }
    var message = err && err.message ? err.message : String(err);
    if(matcher instanceof RegExp) {
      return matcher.test(message);
    }
    if(typeof matcher === 'string') {
      return message.includes(matcher);
    }
    return false;
  }

  /**
   * Deep-comparison helper.
   * @param {*} a
   * @param {*} b
   * @param {WeakMap} seen
   * @returns {boolean}
   */
  static _deepEqual(a, b, seen) {
    if(Object.is(a, b)) {
      return true;
    }

    if(a === null || b === null) {
      return false;
    }

    if(typeof a !== 'object' || typeof b !== 'object') {
      return false;
    }

    var seen_for_a = seen.get(a);
    if(seen_for_a && seen_for_a.has(b)) {
      return true;
    }
    if(!seen_for_a) {
      seen_for_a = new WeakSet();
      seen.set(a, seen_for_a);
    }
    seen_for_a.add(b);

    if(Array.isArray(a) || Array.isArray(b)) {
      if(!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        return false;
      }
      for(var i = 0; i < a.length; i++) {
        if(!this._deepEqual(a[i], b[i], seen)) {
          return false;
        }
      }
      return true;
    }

    if(ArrayBuffer.isView(a) || ArrayBuffer.isView(b)) {
      if(!ArrayBuffer.isView(a) || !ArrayBuffer.isView(b)) {
        return false;
      }
      if(a.constructor !== b.constructor || a.length !== b.length) {
        return false;
      }
      for(var j = 0; j < a.length; j++) {
        if(a[j] !== b[j]) {
          return false;
        }
      }
      return true;
    }

    if(a instanceof Date || b instanceof Date) {
      return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
    }

    if(a instanceof RegExp || b instanceof RegExp) {
      return a instanceof RegExp && b instanceof RegExp &&
        a.source === b.source && a.flags === b.flags;
    }

    if(a instanceof Map || b instanceof Map) {
      if(!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) {
        return false;
      }
      var a_entries = Array.from(a.entries());
      var b_entries = Array.from(b.entries());
      for(var m = 0; m < a_entries.length; m++) {
        if(!this._deepEqual(a_entries[m][0], b_entries[m][0], seen) ||
            !this._deepEqual(a_entries[m][1], b_entries[m][1], seen)) {
          return false;
        }
      }
      return true;
    }

    if(a instanceof Set || b instanceof Set) {
      if(!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size) {
        return false;
      }
      var a_values = Array.from(a.values());
      var b_values = Array.from(b.values());
      for(var s = 0; s < a_values.length; s++) {
        if(!this._deepEqual(a_values[s], b_values[s], seen)) {
          return false;
        }
      }
      return true;
    }

    var a_keys = Object.keys(a);
    var b_keys = Object.keys(b);
    if(a_keys.length !== b_keys.length) {
      return false;
    }
    a_keys.sort();
    b_keys.sort();
    for(var k = 0; k < a_keys.length; k++) {
      if(a_keys[k] !== b_keys[k]) {
        return false;
      }
    }
    for(var n = 0; n < a_keys.length; n++) {
      var key = a_keys[n];
      if(!this._deepEqual(a[key], b[key], seen)) {
        return false;
      }
    }
    return true;
  }
}

/**
 * Class for application testing.
 */
class PRDC_JSLAB_TESTER {

  /**
   * Initializes the tester with the specified folder containing test modules.
   * Loads all test modules and prepares them for execution.
   * @param {string} folder The folder relative to the project directory where test modules are located.
   * @param {Object} [options={}] Tester options.
  */
  constructor(folder, options = {}) {
    this.app_path = resolveAppPath();
    this._provided_options = Object.assign({}, options);
    this.folder = String(folder || '');
    this.path = path.join(this.app_path, 'js', folder);
    this.modules = [];
    this.tests = [];
    this.total_tests = 0;
    this.module_load_errors = [];

    // Define function for data display
    if(typeof jsl !== 'undefined' && jsl && jsl._console) {
      this.disp = jsl._console.log;
    } else {
      this.disp = console.log;
    }

    this.options = Object.assign({
      recursive: true,
      include_tags: [],
      exclude_tags: [],
      name_filter: '',
      module_filter: '',
      list_only: false,
      default_timeout_ms: 5000,
      write_report: true,
      write_report_history: true,
      report_dir: path.join(this.app_path, 'temp')
    }, options);

    this._applyProcessArgs();
    this._normalizeOptions();
    this._collectModules();
    this._collectTests();
  }

  /**
   * Returns localized text with fallback.
   * @param {number} id Language id.
   * @param {string} fallback Fallback text.
   * @returns {string}
   */
  _txt(id, fallback) {
    if(typeof language !== 'undefined' && language && typeof language.currentString === 'function') {
      var out = language.currentString(id);
      if(typeof out === 'string' && out.length) {
        return out;
      }
    }
    return fallback;
  }

  /**
   * Applies tester options from process arguments.
   */
  _applyProcessArgs() {
    if(typeof process_arguments === 'undefined' || !Array.isArray(process_arguments)) {
      return;
    }

    var tag_list = [];
    var skip_tag_list = [];
    var has_test_app = process_arguments.some(function(arg_raw) {
      var arg = String(arg_raw || '').toLowerCase();
      return arg === '--test-app' || arg === '--auto-test-app';
    });

    // In Electron app test mode keep deterministic report filenames for automation.
    if(has_test_app) {
      if(!Object.prototype.hasOwnProperty.call(this._provided_options, 'write_report')) {
        this.options.write_report = true;
      }
      if(!Object.prototype.hasOwnProperty.call(this._provided_options, 'write_report_history')) {
        this.options.write_report_history = false;
      }
      if(!Object.prototype.hasOwnProperty.call(this._provided_options, 'report_dir')) {
        this.options.report_dir = path.join(this.app_path, 'temp');
      }
    }

    process_arguments.forEach((arg_raw) => {
      var arg = String(arg_raw || '');
      if(arg === '--test-list') {
        this.options.list_only = true;
      } else if(arg.startsWith('--test-tag=')) {
        tag_list.push(...arg.slice('--test-tag='.length).split(','));
      } else if(arg.startsWith('--test-skip-tag=')) {
        skip_tag_list.push(...arg.slice('--test-skip-tag='.length).split(','));
      } else if(arg.startsWith('--test-name=')) {
        this.options.name_filter = arg.slice('--test-name='.length);
      } else if(arg.startsWith('--test-module=')) {
        this.options.module_filter = arg.slice('--test-module='.length);
      } else if(arg.startsWith('--test-timeout=')) {
        this.options.default_timeout_ms = Number(arg.slice('--test-timeout='.length));
      } else if(arg.startsWith('--test-recursive=')) {
        var recursive_value = arg.slice('--test-recursive='.length).toLowerCase();
        this.options.recursive = recursive_value !== 'false' && recursive_value !== '0';
      } else if(arg.startsWith('--test-write-report=')) {
        this.options.write_report = this._parseBooleanArg(
          arg.slice('--test-write-report='.length),
          this.options.write_report
        );
      } else if(arg.startsWith('--test-report-history=')) {
        this.options.write_report_history = this._parseBooleanArg(
          arg.slice('--test-report-history='.length),
          this.options.write_report_history
        );
      } else if(arg.startsWith('--test-report-dir=')) {
        this.options.report_dir = arg.slice('--test-report-dir='.length);
      }
    });

    if(tag_list.length) {
      this.options.include_tags = (Array.isArray(this.options.include_tags) ? this.options.include_tags : [])
        .concat(tag_list);
    }
    if(skip_tag_list.length) {
      this.options.exclude_tags = (Array.isArray(this.options.exclude_tags) ? this.options.exclude_tags : [])
        .concat(skip_tag_list);
    }
  }

  /**
   * Normalizes option types.
   */
  _normalizeOptions() {
    var normalize_tag_list = function(value) {
      if(!Array.isArray(value)) {
        return [];
      }
      return Array.from(new Set(value
        .map(function(tag) { return String(tag || '').trim(); })
        .filter(function(tag) { return tag.length > 0; })));
    };

    this.options.include_tags = normalize_tag_list(this.options.include_tags);
    this.options.exclude_tags = normalize_tag_list(this.options.exclude_tags);
    this.options.name_filter = String(this.options.name_filter || '').toLowerCase();
    this.options.module_filter = String(this.options.module_filter || '').toLowerCase();

    var timeout = Number(this.options.default_timeout_ms);
    if(!isFinite(timeout) || timeout <= 0) {
      timeout = 5000;
    }
    this.options.default_timeout_ms = timeout;
    this.options.write_report = this.options.write_report !== false;
    this.options.write_report_history = this.options.write_report_history !== false;
    this.options.report_dir = this._normalizeReportDir(this.options.report_dir);
  }

  /**
   * Parses boolean-like process argument values.
   * @param {*} value
   * @param {boolean} fallback
   * @returns {boolean}
   */
  _parseBooleanArg(value, fallback) {
    var normalized = String(value || '').trim().toLowerCase();
    if(['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if(['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
    return fallback !== false;
  }

  /**
   * Resolves report directory into an absolute path.
   * @param {*} dir_value
   * @returns {string}
   */
  _normalizeReportDir(dir_value) {
    var report_dir = String(dir_value || '').trim();
    if(!report_dir.length) {
      report_dir = path.join(this.app_path, 'temp');
    }
    if(!path.isAbsolute(report_dir)) {
      report_dir = path.resolve(this.app_path, report_dir);
    }
    return report_dir;
  }

  /**
   * Collects test module files.
   */
  _collectModules() {
    try {
      this.modules = this._scanForTestModules(this.path);
    } catch(err) {
      this.disp(this._txt(92, 'Error') + ': ' + err);
      this.modules = [];
    }
  }

  /**
   * Recursively scans for *.test.js modules.
   * @param {string} root_path
   * @returns {Array<string>}
   */
  _scanForTestModules(root_path) {
    var out = [];
    var recurse = (dir_path) => {
      var entries = fs.readdirSync(dir_path, { withFileTypes: true });
      entries.forEach((entry) => {
        var full_path = path.join(dir_path, entry.name);
        if(entry.isDirectory()) {
          if(this.options.recursive) {
            recurse(full_path);
          }
          return;
        }
        if(entry.isFile() && entry.name.endsWith('.test.js')) {
          out.push(full_path);
        }
      });
    };
    recurse(root_path);
    out.sort();
    return out;
  }

  /**
   * Loads tests from discovered modules.
   */
  _collectTests() {
    this.total_tests = 0;
    this.tests = [];
    this.module_load_errors = [];

    this.modules.forEach((module_path) => {
      try {
        var loaded_module = require(module_path);
        var module_tests = this._extractModuleTests(loaded_module, module_path);
        module_tests.forEach((test) => {
          this.tests.push(test);
          this.total_tests += 1;
        });
      } catch(err) {
        this.module_load_errors.push({ module: module_path, error: err });
      }
    });
  }

  /**
   * Extracts normalized tests from a loaded module.
   * @param {*} loaded_module
   * @param {string} module_path
   * @returns {Array<PRDC_JSLAB_TEST>}
   */
  _extractModuleTests(loaded_module, module_path) {
    var raw = [];

    if(loaded_module && loaded_module.MODULE_TESTS) {
      if(typeof loaded_module.MODULE_TESTS.get === 'function') {
        raw = loaded_module.MODULE_TESTS.get();
      } else if(Array.isArray(loaded_module.MODULE_TESTS.tests)) {
        raw = loaded_module.MODULE_TESTS.tests;
      } else if(Array.isArray(loaded_module.MODULE_TESTS)) {
        raw = loaded_module.MODULE_TESTS;
      }
    } else if(Array.isArray(loaded_module)) {
      raw = loaded_module;
    }

    if(!Array.isArray(raw)) {
      return [];
    }

    var out = [];
    raw.forEach((entry, index) => {
      var test = undefined;
      if(entry instanceof PRDC_JSLAB_TEST) {
        test = entry;
      } else if(typeof entry === 'function') {
        test = new PRDC_JSLAB_TEST(entry.name || ('test_' + (index + 1)), entry);
      } else if(entry && typeof entry === 'object') {
        var test_name = typeof entry.name === 'string' && entry.name.length ?
          entry.name :
          ('test_' + (index + 1));
        var test_fun = entry.fun || entry.fn;
        if(typeof test_fun === 'function') {
          test = new PRDC_JSLAB_TEST(test_name, test_fun, entry.options || entry);
        }
      }

      if(test) {
        test.module_path = module_path;
        out.push(test);
      }
    });

    return out;
  }

  /**
   * Builds active test list based on filters.
   * @returns {Array<PRDC_JSLAB_TEST>}
   */
  _getActiveTests() {
    var tests = this.tests.slice();
    var only_tests = tests.filter(function(test) {
      return !!test.only;
    });
    if(only_tests.length) {
      tests = only_tests;
    }

    if(this.options.include_tags.length) {
      tests = tests.filter((test) => {
        if(!test.tags.length) {
          return false;
        }
        return test.tags.some((tag) => this.options.include_tags.includes(tag));
      });
    }

    if(this.options.exclude_tags.length) {
      tests = tests.filter((test) => {
        return !test.tags.some((tag) => this.options.exclude_tags.includes(tag));
      });
    }

    if(this.options.name_filter.length) {
      tests = tests.filter((test) => {
        return test.name.toLowerCase().includes(this.options.name_filter);
      });
    }

    if(this.options.module_filter.length) {
      tests = tests.filter((test) => {
        return String(test.module_path || '').toLowerCase().includes(this.options.module_filter);
      });
    }

    return tests;
  }

  /**
   * Executes promise with timeout.
   * @param {Promise} promise
   * @param {number} timeout_ms
   * @returns {Promise<*>}
   */
  _awaitWithTimeout(promise, timeout_ms) {
    if(!isFinite(timeout_ms) || timeout_ms <= 0) {
      return promise;
    }
    return new Promise((resolve, reject) => {
      var done = false;
      var timer = setTimeout(function() {
        if(done) return;
        done = true;
        reject(new Error('Timeout after ' + timeout_ms + ' ms.'));
      }, timeout_ms);

      promise.then(function(value) {
        if(done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      }).catch(function(err) {
        if(done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Runs a single test.
   * @param {PRDC_JSLAB_TEST} test
   * @returns {Promise<Object>}
   */
  async _runSingleTest(test) {
    if(test.skip) {
      return { status: 'skipped', reason: test.skip_reason || 'Skipped by flag.' };
    }

    var timeout_ms = isFinite(test.timeout_ms) && test.timeout_ms > 0 ?
      test.timeout_ms :
      this.options.default_timeout_ms;
    var started_at = Date.now();

    try {
      var result = await this._awaitWithTimeout(
        Promise.resolve().then(() => {
          return test.run(PRDC_TEST_ASSERT);
        }),
        timeout_ms
      );
      var duration_ms = Date.now() - started_at;
      if(result === false) {
        return {
          status: 'failed',
          error: new Error('Test returned false.'),
          duration_ms: duration_ms
        };
      }
      return { status: 'passed', duration_ms: duration_ms };
    } catch(err) {
      var duration = Date.now() - started_at;
      if(err && (err instanceof PRDC_JSLAB_TEST_SKIP || err.is_skip)) {
        return {
          status: 'skipped',
          reason: err.message || 'Skipped.',
          duration_ms: duration
        };
      }
      return { status: 'failed', error: err, duration_ms: duration };
    }
  }

  /**
   * Serializes an error object into a JSON-safe payload.
   * @param {*} err
   * @returns {Object|undefined}
   */
  _serializeError(err) {
    if(!err) {
      return undefined;
    }
    return {
      name: err.name || 'Error',
      message: err.message || String(err),
      stack: err.stack || ''
    };
  }

  /**
   * Builds safe text for report filenames.
   * @param {string} value
   * @returns {string}
   */
  _sanitizeFilePart(value) {
    return String(value || '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'tests';
  }

  /**
   * Generates compact timestamp string.
   * @returns {string}
   */
  _reportTimestamp() {
    var d = new Date();
    var pad2 = function(v) { return String(v).padStart(2, '0'); };
    var pad3 = function(v) { return String(v).padStart(3, '0'); };
    return d.getFullYear() +
      pad2(d.getMonth() + 1) +
      pad2(d.getDate()) + '_' +
      pad2(d.getHours()) +
      pad2(d.getMinutes()) +
      pad2(d.getSeconds()) + '_' +
      pad3(d.getMilliseconds());
  }

  /**
   * Writes report JSON files under project temp folder.
   * @param {Object} report
   * @returns {(Object|false)} Written paths or false.
   */
  _writeReport(report) {
    if(!this.options.write_report) {
      return false;
    }

    try {
      var report_dir = this.options.report_dir;
      fs.mkdirSync(report_dir, { recursive: true });
      var file_part = this._sanitizeFilePart(this.folder);
      var latest_path = path.join(report_dir, 'test-report-' + file_part + '.json');
      var history_path = '';
      var payload = JSON.stringify(report, null, 2);
      fs.writeFileSync(latest_path, payload, 'utf8');
      if(this.options.write_report_history) {
        var ts = this._reportTimestamp();
        history_path = path.join(report_dir, 'test-report-' + file_part + '-' + ts + '.json');
        fs.writeFileSync(history_path, payload, 'utf8');
      }
      return {
        latest: latest_path,
        history: history_path
      };
    } catch(err) {
      this.disp('[tester] [test-report-error] ' + PRDC_TEST_ASSERT._formatError(err));
      return false;
    }
  }

  /**
   * Executes all loaded tests, reports successes and failures, and logs the results.
   * @returns {Promise<Object>} Summary object.
   */
  async runTests() {
    var run_started_ms = Date.now();
    var tests = this._getActiveTests();
    var test_outcomes = [];
    var finalize = (summary, listed_tests) => {
      var module_load_errors = this.module_load_errors.map((entry) => {
        return {
          module: entry.module,
          error: this._serializeError(entry.error)
        };
      });

      var report = {
        runner: 'PRDC_JSLAB_TESTER',
        folder: this.folder,
        app_path: this.app_path,
        generated_at: new Date().toISOString(),
        started_at_ms: run_started_ms,
        ended_at_ms: Date.now(),
        duration_ms: Date.now() - run_started_ms,
        options: {
          recursive: this.options.recursive,
          include_tags: this.options.include_tags.slice(),
          exclude_tags: this.options.exclude_tags.slice(),
          name_filter: this.options.name_filter,
          module_filter: this.options.module_filter,
          list_only: this.options.list_only,
          default_timeout_ms: this.options.default_timeout_ms,
          write_report: this.options.write_report,
          write_report_history: this.options.write_report_history,
          report_dir: this.options.report_dir
        },
        modules: this.modules.slice(),
        module_load_errors: module_load_errors,
        summary: Object.assign({}, summary),
        tests: test_outcomes.slice(),
        listed_tests: Array.isArray(listed_tests) ? listed_tests : []
      };

      var report_paths = this._writeReport(report);
      if(report_paths) {
        summary.report_latest = report_paths.latest;
        if(report_paths.history) {
          summary.report_history = report_paths.history;
        }
      }
      return summary;
    };

    if(this.module_load_errors.length) {
      this.module_load_errors.forEach((entry) => {
        this.disp('[tester] [module-load-error] ' + entry.module + ': ' + PRDC_TEST_ASSERT._formatError(entry.error));
      });
    }

    if(this.options.list_only) {
      var listed_tests = [];
      tests.forEach((test, i) => {
        listed_tests.push({
          name: test.name,
          tags: test.tags.slice(),
          module_path: test.module_path
        });
        this.disp(
          ' [' + (i + 1) + '/' + tests.length + '] ' +
          test.name +
          ' [' + (test.tags.join(',') || '-') + '] ' +
          '(' + test.module_path + ')'
        );
      });
      return finalize({
        total: tests.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        listed_only: true
      }, listed_tests);
    }

    if(tests.length === 0) {
      this.disp(this._txt(102, 'No tests found.'));
      return finalize({
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      });
    }

    this.disp(this._txt(93, 'Running') + ' ' + tests.length + ' ' + this._txt(94, 'tests') + '.');

    var passed = 0;
    var failed = 0;
    var skipped = 0;

    for(var i = 0; i < tests.length; i++) {
      var test = tests[i];
      var outcome = await this._runSingleTest(test);
      var prefix = ' [' + (i + 1) + '/' + tests.length + '] ' + this._txt(95, 'Test') + ' "' + test.name + '" - ';
      var outcome_entry = {
        name: test.name,
        module_path: test.module_path,
        tags: test.tags.slice(),
        status: outcome.status,
        duration_ms: isFinite(outcome.duration_ms) ? outcome.duration_ms : 0
      };

      if(outcome.status === 'passed') {
        passed += 1;
        this.disp(prefix + this._txt(98, 'passed') + ' (' + outcome.duration_ms + ' ms).');
      } else if(outcome.status === 'skipped') {
        skipped += 1;
        outcome_entry.reason = outcome.reason || '';
        this.disp(prefix + 'skipped' + (outcome.reason ? ': ' + outcome.reason : '') + '.');
      } else {
        failed += 1;
        outcome_entry.error = this._serializeError(outcome.error);
        this.disp(prefix + this._txt(97, 'failed') + '.');
        if(outcome.error) {
          this.disp('  ' + this._txt(96, 'error') + ': ' + PRDC_TEST_ASSERT._formatError(outcome.error));
        }
      }
      test_outcomes.push(outcome_entry);
    }

    this.disp(this._txt(99, 'Summary') + ':');
    this.disp(' ' + this._txt(100, 'Passed') + ': ' + passed);
    this.disp(' ' + this._txt(101, 'Failed') + ': ' + failed);
    this.disp(' Skipped: ' + skipped);

    return finalize({
      total: tests.length,
      passed: passed,
      failed: failed,
      skipped: skipped
    });
  }
}

exports.PRDC_JSLAB_TESTER = PRDC_JSLAB_TESTER;
exports.PRDC_TEST_ASSERT = PRDC_TEST_ASSERT;
exports.PRDC_JSLAB_TEST_SKIP = PRDC_JSLAB_TEST_SKIP;

/**
 * Represents a collection of tests for a specific module or functionality within the JSLAB application.
 */
class PRDC_JSLAB_TESTS {

  /**
   * Creates an instance to manage and store individual tests.
   */
  constructor() {
    this.tests = [];
  }

  /**
   * Adds a new test to the collection.
   * @param {string} name The name of the test.
   * @param {Function} fun The test function to execute.
   * @param {Object} [options={}] Test options.
   * @returns {PRDC_JSLAB_TESTS}
   */
  add(name, fun, options = {}) {
    this.tests.push(new PRDC_JSLAB_TEST(name, fun, options));
    return this;
  }

  /**
   * Adds a test marked as "only".
   * @param {string} name
   * @param {Function} fun
   * @param {Object} [options={}]
   * @returns {PRDC_JSLAB_TESTS}
   */
  addOnly(name, fun, options = {}) {
    var opts = Object.assign({}, options, { only: true });
    return this.add(name, fun, opts);
  }

  /**
   * Adds a test marked as skipped.
   * @param {string} name
   * @param {Function} fun
   * @param {Object} [options={}]
   * @returns {PRDC_JSLAB_TESTS}
   */
  addSkip(name, fun, options = {}) {
    var opts = Object.assign({}, options, { skip: true });
    return this.add(name, fun, opts);
  }

  /**
   * Returns all tests added to this collection.
   * @returns {Array} An array of all tests within this collection.
   */
  get() {
    return this.tests;
  }

  /**
   * Returns the number of tests in the collection.
   * @returns {number} The total number of tests.
   */
  testsNumber() {
    return this.tests.length;
  }
}

exports.PRDC_JSLAB_TESTS = PRDC_JSLAB_TESTS;

/**
 * Represents an individual test within a test suite.
 */
class PRDC_JSLAB_TEST {

  /**
   * Initializes a new test with a name and a test function.
   * @param {string} name The name of the test.
   * @param {Function} fun The function to execute as the test.
   * @param {Object} [options={}] Test options.
   */
  constructor(name, fun, options = {}) {
    this.name = String(name || 'unnamed test');
    this.fun = fun;
    this.only = !!options.only;
    this.skip = !!options.skip;
    this.skip_reason = String(options.skip_reason || '');
    this.timeout_ms = Number(options.timeout_ms);
    if(!isFinite(this.timeout_ms) || this.timeout_ms <= 0) {
      this.timeout_ms = undefined;
    }
    if(Array.isArray(options.tags)) {
      this.tags = options.tags.map(function(tag) {
        return String(tag).trim();
      }).filter(function(tag) {
        return tag.length > 0;
      });
    } else if(typeof options.tags === 'string' && options.tags.trim().length) {
      this.tags = [options.tags.trim()];
    } else {
      this.tags = [];
    }
    this.module_path = options.module_path || '';
  }

  /**
   * Executes the test function and returns the result.
   * @param {Object} [assert_api] - Assertion helpers.
   * @returns {*}
   */
  run(assert_api) {
    if(typeof this.fun !== 'function') {
      return true;
    }
    return this.fun(assert_api || PRDC_TEST_ASSERT);
  }
}

exports.PRDC_JSLAB_TEST = PRDC_JSLAB_TEST;
