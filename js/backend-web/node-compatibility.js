/**
 * @file JSLAB browser Node compatibility services
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for path operations supported by the browser workspace.
 */
class PRDC_JSLAB_WEB_NODE_PATH {

  /**
   * Resolves dot segments while preserving an absolute browser workspace root.
   * @param {*} value Input path.
   * @returns {string} Normalized path.
   */
  static normalize(value) {
    var input = PRDC_JSLAB_WEB_NODE_PATH.normalizeSlashes(value);
    var parts = [];
    for(var part of input.split('/')) {
      if(!part || part == '.') {
        continue;
      }
      if(part == '..' && parts.length && parts[parts.length - 1] != '..') {
        parts.pop();
      } else if(part != '..' || !input.startsWith('/')) {
        parts.push(part);
      }
    }
    return (input.startsWith('/') ? '/' : '') + parts.join('/') || '.';
  }

  /**
   * Returns the directory containing a browser workspace path.
   * @param {*} value Input path.
   * @returns {string} Parent directory.
   */
  static dirname(value) {
    var input = PRDC_JSLAB_WEB_NODE_PATH.normalize(value);
    var slash = input.lastIndexOf('/');
    return slash < 0 ? '.' : slash == 0 ? '/' : input.slice(0, slash);
  }

  /**
   * Converts platform separators to browser workspace separators.
   * @param {*} value Path value.
   * @returns {string} Normalized separators.
   */
  static normalizeSlashes(value) {
    return String(value || '').replace(/\\/g, '/');
  }

  /**
   * Splits a path into its nonempty components.
   * @param {*} value Path value.
   * @returns {string[]} Path components.
   */
  static splitPath(value) {
    return PRDC_JSLAB_WEB_NODE_PATH.normalizeSlashes(value).split('/').filter(Boolean);
  }

  /**
   * Joins path components while preserving an initial root separator.
   * @param {...string} values Path components.
   * @returns {string} Joined path.
   */
  static join(...values) {
    var parts = values.map(PRDC_JSLAB_WEB_NODE_PATH.splitPath).flat();
    return (PRDC_JSLAB_WEB_NODE_PATH.normalizeSlashes(values[0] || '').startsWith('/') ? '/' : '') + parts.join('/');
  }

  /**
   * Returns a path's final component, optionally removing its exact suffix.
   * @param {string} value Path value.
   * @param {string} [suffix] Optional filename suffix.
   * @returns {string} Filename.
   */
  static basename(value, suffix = '') {
    var base = PRDC_JSLAB_WEB_NODE_PATH.splitPath(value).pop() || '';
    return suffix && base.endsWith(suffix) ? base.slice(0, -suffix.length) : base;
  }

  /**
   * Returns the final filename extension, excluding leading-dot filenames.
   * @param {string} value Path value.
   * @returns {string} Extension including its dot.
   */
  static extname(value) {
    var base = PRDC_JSLAB_WEB_NODE_PATH.basename(value);
    var index = base.lastIndexOf('.');
    return index <= 0 ? '' : base.slice(index);
  }

  /**
   * Returns the relative path between two workspace locations.
   * @param {string} from_path Starting path.
   * @param {string} to_path Destination path.
   * @returns {string} Relative path.
   */
  static relative(from_path, to_path) {
    var from_parts = PRDC_JSLAB_WEB_NODE_PATH.splitPath(from_path);
    var to_parts = PRDC_JSLAB_WEB_NODE_PATH.splitPath(to_path);
    var index = 0;
    while(index < from_parts.length && index < to_parts.length && from_parts[index] == to_parts[index]) {
      index++;
    }
    return new Array(Math.max(0, from_parts.length - index)).fill('..').concat(to_parts.slice(index)).join('/');
  }
}

exports.PRDC_JSLAB_WEB_NODE_PATH = PRDC_JSLAB_WEB_NODE_PATH;
exports.sep = '/';
exports.join = PRDC_JSLAB_WEB_NODE_PATH.join;
exports.basename = PRDC_JSLAB_WEB_NODE_PATH.basename;
exports.extname = PRDC_JSLAB_WEB_NODE_PATH.extname;
exports.relative = PRDC_JSLAB_WEB_NODE_PATH.relative;
exports.normalize = PRDC_JSLAB_WEB_NODE_PATH.normalize;
exports.dirname = PRDC_JSLAB_WEB_NODE_PATH.dirname;

/**
 * Supplies process metadata and inspection for Node-compatible browser libraries.
 */
class PRDC_JSLAB_WEB_NODE_COMPATIBILITY {

  /**
   * Supplies process metadata without replacing an existing host configuration.
   * @returns {Object} Browser process adapter.
   */
  static ensure() {
    if(globalThis.process?.versions?.node) {
      return globalThis.process;
    }
    if(!globalThis.process) {
      globalThis.process = {};
    }
    const process = globalThis.process;
    if(!process.env) {
      process.env = {};
    }
    if(!Array.isArray(process.argv)) {
      process.argv = [];
    }
    if(typeof process.cwd != 'function') {
      process.cwd = function() {
        return '/';
      };
    }
    for(const name of ['type', 'platform', 'arch']) {
      if(process[name] === undefined) {
        process[name] = 'browser';
      }
    }
    return process;
  }

  /**
   * Inspects.
   * @param {*} value Value.
   * @param {Object} [options] Options.
   */
  static inspect(value, options = {}) {
    var settings = options && typeof options === 'object' ? options : {};
    var depth = typeof options === 'number' ? options : settings.depth;
    return safeStringify(value, {
      max_depth: isFinite(depth) && depth >= 0 ? depth : 3,
      max_properties: 1000,
      max_array_length: Number(settings.maxArrayLength) > 0 ? Number(settings.maxArrayLength) : 1000,
      max_string_length: Number(settings.maxStringLength) > 0 ? Number(settings.maxStringLength) : 10000,
      escape_html: false,
      indent: settings.compact ? 0 : 2
    });
  }
}

exports.PRDC_JSLAB_WEB_NODE_COMPATIBILITY = PRDC_JSLAB_WEB_NODE_COMPATIBILITY;

const { safeStringify } = require('../other-shared/value-serializer');
exports.inspect = PRDC_JSLAB_WEB_NODE_COMPATIBILITY.inspect;
exports.EOL = '\n';
