/**
 * @file JSLAB internal sandbox automation operations
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const { Linter } = require('eslint');

/**
 * Executes agent requests through the existing JSLAB environment.
 */
class PRDC_JSLAB_SANDBOX_AUTOMATION {

  /**
   * @param {Object} jsl JSLAB instance.
   */
  constructor(jsl) {
    this.jsl = jsl;
  }

  /**
   * Creates a bounded preview without invoking custom inspection or getters.
   * @param {*} value Value to inspect.
   * @returns {string} Preview text.
   */
  preview(value) {
    return util.inspect(value, { depth: 3, maxArrayLength: 50,
      maxStringLength: 2000, customInspect: false, getters: false }).slice(0, 16000);
  }

  /**
   * Executes an operation and captures command-window output for its duration.
   * @param {string} method Operation name.
   * @param {Object} args Operation arguments.
   * @returns {Promise<Object>} Structured operation result.
   */
  async execute(method, args) {
    var obj = this;
    var env = this.jsl.inter.env;
    var previous_capture = env._automation_output;
    var output = [];
    var output_size = 0;
    var output_truncated = false;
    var reported_error = null;
    env._automation_output = function(name, values) {
      var text = values.map(function(value) {
        if(typeof value === 'string' && value.length > 16000) output_truncated = true;
        return typeof value === 'string' ? value.slice(0, 16000) : obj.preview(value);
      }).join(' ');
      if(name === 'error' || name === 'errorInternal') reported_error = text;
      if(output_size < 64000 && output.length < 200) {
        if(text.length > 64000 - output_size) output_truncated = true;
        text = text.slice(0, 64000 - output_size);
        output.push({ type: name, text: text });
        output_size += text.length;
      } else {
        output_truncated = true;
      }
    };
    try {
      if(!this.jsl.ready) throw new Error('Sandbox is not ready.');
      var value = await this.dispatch(method, args);
      return { success: !reported_error, value: value, output: output,
        output_truncated: output_truncated, error: reported_error };
    } catch(err) {
      return { success: false, error: this.preview(err), output: output,
        output_truncated: output_truncated };
    } finally {
      env._automation_output = previous_capture;
    }
  }

  /**
   * Dispatches a sandbox operation with explicit argument validation.
   * @param {string} method Operation name.
   * @param {Object} args Operation arguments.
   * @returns {Promise<*>} Operation value.
   */
  async dispatch(method, args) {
    var jsl = this.jsl;
    switch(method) {
      case 'get_runtime_info':
        return { version: jsl.inter.env.version, platform: process.platform,
          node_version: process.versions.node, cwd: jsl.current_path,
          modules: Object.keys(jsl.inter.config.SUBMODULES).reduce(function(result, group) {
            result[group] = jsl.inter.config.SUBMODULES[group].map(function(item) { return item.name; });
            return result;
          }, {}) };
      case 'evaluate_code':
      case 'run_file':
      case 'run_test_file': {
        if(args.cwd !== undefined) {
          if(typeof args.cwd !== 'string' || !path.isAbsolute(args.cwd) ||
              !fs.statSync(args.cwd).isDirectory()) throw new Error('cwd must be an absolute directory.');
          jsl.setPath(args.cwd);
          jsl.inter.env.cd(args.cwd);
        }
        var code = args.code;
        var filename = 'jslagent';
        if(method !== 'evaluate_code') {
          filename = this.filePath(args.path);
          if(path.extname(filename).toLowerCase() !== '.jsl') throw new Error('Expected a .jsl script.');
          if(fs.statSync(filename).size > 512000) throw new Error('Script is too large.');
          code = fs.readFileSync(filename, 'utf8');
        }
        if(typeof code !== 'string' || code.length > 512000) throw new Error('Expected code up to 512000 characters.');
        var result = await jsl.inter.eval.evalCodeFromMain(code, false, filename);
        if(!result || !result.success) throw new Error(result && result.error || 'Evaluation failed.');
        return { preview: this.preview(result.value), cwd: jsl.current_path };
      }
      case 'list_workspace':
        return jsl.getWorkspace().slice(0, 1000);
      case 'read_variable': {
        if(typeof args.name !== 'string' || !jsl.getWorkspaceProperties().includes(args.name)) {
          throw new Error('Unknown workspace variable.');
        }
        var descriptor = Object.getOwnPropertyDescriptor(jsl.context, args.name);
        if(!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error('Accessor variables cannot be inspected.');
        return { name: args.name, preview: this.preview(descriptor.value) };
      }
      case 'list_figures':
        return { ids: Object.keys(jsl.inter.figures.open_figures),
          active_id: jsl.inter.figures.active_figure };
      case 'export_figure': {
        var target = this.filePath(args.path);
        if(!jsl.inter.figures.getFigure(args.figure_id)) throw new Error('Unknown figure ID.');
        if(!['.png', '.svg', '.pdf', '.jpg', '.jpeg', '.webp', '.html', '.json'].includes(path.extname(target))) {
          throw new Error('Unsupported figure export extension.');
        }
        await jsl.inter.figures.saveFigure(args.figure_id, target);
        var mime_types = { '.png': 'image/png', '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
        return { path: target, mime_type: mime_types[path.extname(target)] };
      }
      case 'get_help':
        if(typeof args.name !== 'string' || !args.name.length) throw new Error('Expected a function or category name.');
        return String(jsl.inter.docs.helpToJSON(args.name, args.type)).slice(0, 64000);
      case 'check_code': {
        var source_path = this.filePath(args.path);
        if(fs.statSync(source_path).size > 512000) throw new Error('Script is too large for code analysis.');
        var source = fs.readFileSync(source_path, 'utf8');
        if(source.length > 512000) throw new Error('Script is too large for code analysis.');
        var linter = new Linter();
        var diagnostics = linter.verify(source, { languageOptions: {
          ecmaVersion: 'latest', sourceType: 'module'
        }, rules: { 'no-unreachable': 'error', 'no-debugger': 'warn',
          'constructor-super': 'error', 'no-dupe-args': 'error',
          'no-constant-condition': 'warn' } });
        return { diagnostics: diagnostics.slice(0, 200).map(function(item) {
          return Object.assign({}, item, { message: item.message.slice(0, 2000) });
        }), diagnostics_truncated: diagnostics.length > 200 };
      }
      default:
        throw new Error('Unknown automation operation.');
    }
  }

  /**
   * Validates an absolute local file path.
   * @param {string} value File path.
   * @returns {string} Normalized path.
   */
  filePath(value) {
    if(typeof value !== 'string' || !path.isAbsolute(value)) throw new Error('Expected an absolute file path.');
    return path.normalize(value);
  }
}

exports.PRDC_JSLAB_SANDBOX_AUTOMATION = PRDC_JSLAB_SANDBOX_AUTOMATION;
