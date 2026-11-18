/**
 * @file Minimal OpenModelica WebAssembly worker for Simulate
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

import init, {
  jslab_bridge_enable,
  jslab_bridge_version,
  jslab_eval,
  jslab_init,
  jslab_set_env,
  jslab_set_inwasm_driver,
  jslab_set_sim_bench,
  jslab_sim_column,
  jslab_sim_info,
  jslab_sim_parameters,
  jslab_sim_series,
  jslab_sim_time,
  jslab_sim_units,
  jslab_simulate,
  jslab_take_pending_downloads,
  jslab_vfs_load_zip,
  jslab_write_file
} from "../omc/OpenModelicaCompiler.js";
import * as omc_module from '../omc/OpenModelicaCompiler.js';
import { openStore } from '../vendor/omc-store.js';
import { readVerifiedResource } from './resource-cache.js';
import { PRDC_OMJSL_SCENE } from './scene.js';
const JSLAB_MODELICA_BRIDGE_ABI = 1;
const BLOBS = new URL('../wasm-blobs/', import.meta.url).href;
/**
 * Class for compiler execution and worker resource ownership.
 */
class PRDC_OMJSL_WORKER {

  /**
   * Escapes a string for use in a compiler scripting expression.
   * @param {*} value Value to inspect or convert.
   */
  static escapeModelica(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  }

  /**
   * Decodes a quoted compiler scripting result.
   * @param {*} value Value to inspect or convert.
   */
  static unquote(value) {
    value = String(value || '').trim();
    if(value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1).replace(/\\(.)/g, function(_match, character) {
        if(character == 'n') {
          return '\n';
        }
        if(character == 't') {
          return '\t';
        }
        return character;
      });
    }
    return value;
  }

  /**
   * Reads an installed compiler binary through a local resource request.
   * @param {*} url Url.
   * @param {*} progress Progress.
   * @param {*} progress_events Progress events.
   */
  static readLocalBinary(url, progress, progress_events = ['loading-solver-progress', 'loading-solver-bytes']) {
    var request = new XMLHttpRequest();
    request.open('GET', url, false);
    request.responseType = 'arraybuffer';
    request.onprogress = function(event) {
      var loaded = event.loaded / 1024 / 1024;
      var total = event.lengthComputable && event.total ? event.total / 1024 / 1024 : 0;
      progress({
        event: total ? progress_events[0] : progress_events[1],
        loaded: loaded.toFixed(1),
        total: total ? total.toFixed(1) : '',
        progress: total ? loaded / total * 100 : 0
      });
    };
    request.send();
    if(request.status !== 0 && request.status !== 200) {
      throw new Error('Unable to load ' + url + ' (' + request.status + ').');
    }
    return new Uint8Array(request.response);
  }

  /**
   * Reads the requested compiler binary from its installed or browser URL.
   * @param {*} url Url.
   * @param {*} progress Progress.
   * @param {*} progress_events Progress events.
   */
  static async readBinary(url, progress, progress_events = ['downloading-solver-progress', 'downloading-solver-bytes']) {
    if(url.startsWith('file:')) {
      return PRDC_OMJSL_WORKER.readLocalBinary(url, progress, progress_events[0] == 'downloading-solver-progress' ? ['loading-solver-progress', 'loading-solver-bytes'] : progress_events);
    }
    var response = await fetch(url);
    if(!response.ok) {
      throw new Error('Unable to load ' + url + ' (' + response.status + ').');
    }
    var encoding = response.headers.get('content-encoding');
    var total = encoding && encoding != 'identity' ? 0 : Number(response.headers.get('content-length') || 0);
    if(!response.body || !response.body.getReader) {
      var buffered = new Uint8Array(await response.arrayBuffer());
      progress({
        event: progress_events[0],
        loaded: (buffered.length / 1024 / 1024).toFixed(1),
        total: (buffered.length / 1024 / 1024).toFixed(1),
        progress: 100
      });
      return buffered;
    }
    var reader = response.body.getReader();
    var bytes = total ? new Uint8Array(total) : null;
    var chunks = total ? null : [];
    var loaded = 0;
    for(;;) {
      var part = await reader.read();
      if(part.done) {
        break;
      }
      if(bytes && loaded + part.value.length <= bytes.length) {
        bytes.set(part.value, loaded);
      } else {
        if(!chunks) {
          chunks = [bytes.subarray(0, loaded)];
          bytes = null;
        }
        chunks.push(part.value);
      }
      loaded += part.value.length;
      progress({
        event: total ? progress_events[0] : progress_events[1],
        loaded: (loaded / 1024 / 1024).toFixed(1),
        total: total ? (total / 1024 / 1024).toFixed(1) : '',
        progress: total ? loaded / total * 100 : 0
      });
    }
    if(bytes) {
      return loaded == bytes.length ? bytes : bytes.slice(0, loaded);
    }
    bytes = new Uint8Array(loaded);
    var offset = 0;
    for(const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  }

  /**
   * Downloads resource bytes and reports transfer progress.
   * @param {*} urls Urls.
   */
  static async fetchBytes(urls) {
    for(const url of urls || []) {
      try {
        var response = await fetch(url);
        if(response.ok) {
          return new Uint8Array(await response.arrayBuffer());
        }
      } catch(_error) {}
    }
    return null;
  }

  /**
   * Evaluates compiler commands and services their pending resource requests.
   * @param {*} source Original compiler source text.
   * @param {*} status Status.
   */
  static async evaluateWithDownloads(source, status) {
    var attempted = new Set();
    for(;;) {
      var result = jslab_eval(source);
      var pending = (jslab_take_pending_downloads() || []).filter(function(item) {
        return !attempted.has(item.filename);
      });
      if(!pending.length) {
        return result;
      }
      jslab_eval('getErrorString()');
      for(const item of pending) {
        attempted.add(item.filename);
        status({
          event: 'retrieving-resource',
          file: item.filename.split('/').pop() || item.filename
        });
        var bytes = await PRDC_OMJSL_WORKER.fetchBytes(item.urls);
        if(!bytes) {
          throw new Error('Unable to download solver resources.');
        }
        jslab_write_file(item.filename, bytes);
      }
    }
  }

  /**
   * Converts worker failures into a serializable error message.
   * @param {*} fallback Fallback.
   */
  static errorString(fallback) {
    return PRDC_OMJSL_WORKER.unquote(jslab_eval('getErrorString()')) || fallback;
  }

  /**
   * Collects the compiler error buffer after a scripting request.
   * @param {*} text Text.
   */
  static diagnostics(text) {
    var items = [];
    String(text || '').split(/\r?\n/).forEach(function(line) {
      line = line.trim();
      if(!line) {
        return;
      }
      var location = /^\[.*?:(\d+):(\d+)(?:-\d+:\d+)?:[^\]]*\]\s*/.exec(line);
      if(location) {
        line = line.slice(location[0].length);
      }
      var severity = /^(Error|Warning|Notification):\s*/i.exec(line);
      if(!severity) {
        return;
      }
      items.push({
        severity: severity[1].toLowerCase() == 'notification' ? 'info' : severity[1].toLowerCase(),
        message: line.slice(severity[0].length).replace(/\s+/g, ' ').trim(),
        line: location ? Number(location[1]) : 0,
        column: location ? Number(location[2]) : 0
      });
    });
    return items;
  }

  /**
   * Decodes compiler scripting arrays, booleans and scalar values.
   * @param {*} source Original compiler source text.
   */
  static parseScriptingValue(source) {
    var index = 0;
    var skip = function() {
      while(/\s/.test(source[index] || '')) {
        index++;
      }
    };
    var read = function() {
      skip();
      if(source[index] == '{' || source[index] == '(') {
        var closing = source[index] == '{' ? '}' : ')';
        index++;
        var values = [];
        skip();
        while(index < source.length && source[index] != closing) {
          values.push(read());
          skip();
          if(source[index] == ',') {
            index++;
          } else {
            break;
          }
        }
        if(source[index] == closing) {
          index++;
        }
        return values;
      }
      if(source[index] == '"') {
        index++;
        var value = '';
        var escaped = false;
        while(index < source.length) {
          var character = source[index++];
          if(escaped) {
            value += character == 'n' ? '\n' : character == 't' ? '\t' : character;
            escaped = false;
          } else if(character == '\\') {
            escaped = true;
          } else if(character == '"') {
            break;
          } else {
            value += character;
          }
        }
        return value;
      }
      var start = index;
      while(index < source.length && !/[{}(),]/.test(source[index])) {
        index++;
      }
      var token = source.slice(start, index).trim();
      if(token == 'true') {
        return true;
      }
      if(token == 'false') {
        return false;
      }
      if(/^[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(token)) {
        return Number(token);
      }
      return token;
    };
    return read();
  }

  /**
   * Checks class and component names before constructing scripting commands.
   * @param {*} value Value to inspect or convert.
   */
  static validModelicaName(value) {
    return /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(value);
  }

  /**
   * Splits scripting lists while retaining nested expressions and quoted strings.
   * @param {*} source Original compiler source text.
   */
  static splitScriptingList(source) {
    source = String(source || '').trim();
    if(source[0] == '{' && source[source.length - 1] == '}') {
      source = source.slice(1, -1);
    }
    var values = [],
      start = 0,
      round = 0,
      square = 0,
      curly = 0,
      quoted = false,
      escaped = false;
    for(var index = 0; index < source.length; index++) {
      var character = source[index];
      if(quoted) {
        if(escaped) {
          escaped = false;
        } else if(character == '\\') {
          escaped = true;
        } else if(character == '"') {
          quoted = false;
        }
      } else if(character == '"') {
        quoted = true;
      } else if(character == '(') {
        round++;
      } else if(character == ')') {
        round--;
      } else if(character == '[') {
        square++;
      } else if(character == ']') {
        square--;
      } else if(character == '{') {
        curly++;
      } else if(character == '}') {
        curly--;
      } else if(character == ',' && round === 0 && square === 0 && curly === 0) {
        values.push(source.slice(start, index).trim());
        start = index + 1;
      }
    }
    values.push(source.slice(start).trim());
    return values;
  }

  /**
   * Reads component dialog annotations from the active compiler.
   * @param {*} source Original compiler source text.
   */
  static dialogAnnotation(source) {
    var match = /Dialog\("((?:[^"\\]|\\.)*)","((?:[^"\\]|\\.)*)",(?:true|false),(true|false)/.exec(String(source || ''));
    return match ? {
      tab: match[1],
      group: match[2],
      show_start: match[3] == 'true'
    } : {
      tab: '',
      group: '',
      show_start: false
    };
  }

  /**
   * Reads inherited component declarations and source defaults.
   * @param {*} type Declared compiler type.
   */
  static componentDeclarations(type) {
    var declarations = new Map();
    var visited = new Set();
    function collect(name) {
      if(visited.has(name)) {
        return;
      }
      visited.add(name);
      var count = Number(jslab_eval('getInheritanceCount(' + name + ')')) || 0;
      for(var index = 1; index <= count; index++) {
        var base = String(jslab_eval('getNthInheritedClass(' + name + ',' + index + ')')).trim();
        if(PRDC_OMJSL_WORKER.validModelicaName(base)) {
          collect(base);
        }
      }
      var rows = PRDC_OMJSL_WORKER.parseScriptingValue(String(jslab_eval('getComponents(' + name + ')')));
      var annotations = PRDC_OMJSL_WORKER.splitScriptingList(jslab_eval('getComponentAnnotations(' + name + ')'));
      (Array.isArray(rows) ? rows : []).forEach(function(row, index) {
        if(Array.isArray(row) && row.length >= 12) {
          declarations.set(String(row[1]), {
            row: row,
            annotation: annotations[index] || '',
            owner: name
          });
        }
      });
    }
    collect(type);
    return Array.from(declarations.values());
  }

  /**
   * Reads the declared enumeration choices for a component property.
   * @param {*} type Declared compiler type.
   */
  static componentChoices(type) {
    type = String(type || '').replace(/^\./, '');
    if(type == 'Boolean') {
      return ['false', 'true'];
    }
    if(!PRDC_OMJSL_WORKER.validModelicaName(type)) {
      return [];
    }
    if(enumeration_choices.has(type)) {
      return enumeration_choices.get(type);
    }
    var choices = [];
    if(String(jslab_eval('isEnumeration(' + type + ')')).trim() == 'true') {
      var values = PRDC_OMJSL_WORKER.parseScriptingValue(jslab_eval('getEnumerationLiterals(' + type + ')'));
      if(Array.isArray(values)) {
        choices = values.map(String);
      }
    }
    enumeration_choices.set(type, choices);
    return choices;
  }

  /**
   * Resolves the effective default of an inherited property.
   * @param {*} type Declared compiler type.
   * @param {*} name Catalog, class or resource name.
   * @param {*} parameter Parameter.
   * @param {*} visited Visited.
   */
  static componentDefault(type, name, parameter, visited = new Set()) {
    if(visited.has(type)) {
      return '';
    }
    visited.add(type);
    var command = parameter ? 'getParameterValue(' + type + ',"' + name + '")' : 'getComponentModifierValue(' + type + ',' + name + ')';
    var value = PRDC_OMJSL_WORKER.unquote(jslab_eval(command));
    if(value && value != 'Error') {
      return value;
    }
    var count = Number(jslab_eval('getInheritanceCount(' + type + ')')) || 0;
    for(var index = 1; index <= count; index++) {
      var base = String(jslab_eval('getNthInheritedClass(' + type + ',' + index + ')')).trim();
      if(!PRDC_OMJSL_WORKER.validModelicaName(base)) {
        continue;
      }
      var modifier = PRDC_OMJSL_WORKER.unquote(jslab_eval('getExtendsModifierValue(' + type + ',' + base + ',' + name + ')')).replace(/^=\s*/, '');
      if(modifier && modifier != 'Error') {
        return modifier;
      }
      value = PRDC_OMJSL_WORKER.componentDefault(base, name, parameter, visited);
      if(value) {
        return value;
      }
    }
    return '';
  }

  /**
   * Reads a named string attribute from a component declaration.
   * @param {*} type Declared compiler type.
   * @param {*} name Catalog, class or resource name.
   * @param {*} attribute Attribute.
   */
  static componentStringAttribute(type, name, attribute) {
    var value = PRDC_OMJSL_WORKER.componentDefault(type, name + '.' + attribute, false).trim();
    return value.startsWith('"') && value.endsWith('"') ? PRDC_OMJSL_WORKER.unquote(value) : '';
  }

  /**
   * Returns base sources in inheritance order and their resolved component types.
   * @param {Object} request Model source and class name.
   * @param {Function} status Compiler progress callback.
   */
  static async modelSources(request, status) {
    await PRDC_OMJSL_WORKER.loadModel(request, status);
    var sources = [], visited = new Set();
    var collect = function(type) {
      if(visited.has(type) || !PRDC_OMJSL_WORKER.validModelicaName(type)) {
        return;
      }
      visited.add(type);
      var count = Number(jslab_eval('getInheritanceCount(' + type + ')')) || 0;
      for(var index = 1; index <= count; index++) {
        collect(String(jslab_eval('getNthInheritedClass(' + type + ',' + index + ')')).trim());
      }
      if(type !== request.type) {
        sources.push({ type: type,
          source: PRDC_OMJSL_WORKER.unquote(jslab_eval('list(' + type + ')')),
          components: PRDC_OMJSL_WORKER.componentDeclarations(type).map(item => ({
            name: String(item.row[1]), type: String(item.row[0]),
            value: item.row[8] == 'parameter' ? PRDC_OMJSL_WORKER.componentDefault(request.type, String(item.row[1]), true) : null
          })) });
      }
    };
    collect(request.type);
    return sources;
  }

  /**
   * Loads a model and its referenced standard library before semantic queries.
   * @param {Object} request Source and class type.
   * @param {Function} status Compiler progress callback.
   */
  static async loadModel(request, status) {
    var source = String(request.source || '');
    var type = String(request.type || '');
    if(!PRDC_OMJSL_WORKER.validModelicaName(type)) {
      throw new Error('Invalid component type.');
    }
    if(/\bModelica\s*\./.test(type) || /\bModelica\s*\./.test(source)) {
      status({
        event: 'loading-library'
      });
      await PRDC_OMJSL_WORKER.loadStandardLibrary(status);
    }
    if(source) {
      enumeration_choices.clear();
      var loaded = String(await PRDC_OMJSL_WORKER.evaluateWithDownloads('loadString("' + PRDC_OMJSL_WORKER.escapeModelica(source) + '")', status)).trim();
      if(loaded != 'true') {
        throw new Error(PRDC_OMJSL_WORKER.errorString('Could not parse the model.'));
      }
    }
  }

  /**
   * Builds an editable property schema for an imported component.
   * @param {Object} request Component source and type.
   * @param {Function} status Compiler progress callback.
   */
  static async componentSchema(request, status) {
    await PRDC_OMJSL_WORKER.loadModel(request, status);
    var type = String(request.type || '');
    var all_fields = request.all_fields === true;
    if(all_fields && !/record/.test(PRDC_OMJSL_WORKER.unquote(jslab_eval('getClassRestriction(' + type + ')')))) {
      return null;
    }
    var properties = [];
    for(const declaration of PRDC_OMJSL_WORKER.componentDeclarations(type)) {
      var row = declaration.row;
      if(!Array.isArray(row) || row.length < 12 || row[3] != 'public') {
        continue;
      }
      var variability = String(row[8] || '');
      var input_output = String(row[10] || '');
      var dialog = PRDC_OMJSL_WORKER.dialogAnnotation(declaration.annotation);
      var regular = variability == 'parameter' || variability == 'constant' || input_output == 'input';
      var start_value = '';
      if(!regular && !all_fields) {
        start_value = PRDC_OMJSL_WORKER.componentDefault(type, String(row[1] || '') + '.start', false);
      }
      var initialization = !all_fields && !regular && (dialog.show_start || !!start_value);
      if(!all_fields && !initialization && variability != 'parameter' && variability != 'constant' && input_output != 'input') {
        continue;
      }
      var name = String(row[1] || '');
      if(!/^[A-Za-z_]\w*$/.test(name)) {
        continue;
      }
      var default_value = initialization ? start_value : PRDC_OMJSL_WORKER.componentDefault(type, name, variability == 'parameter');
      if(initialization) {
        default_value = '(start = ' + (default_value || '0') + ')';
      }
      var property = {
        name: name,
        type: String(row[0] || ''),
        description: String(row[2] || '').replace(/^=\s*/, ''),
        variability: variability,
        input: input_output == 'input',
        initialization: initialization,
        final: !!row[4],
        dimensions: Array.isArray(row[11]) ? row[11] : [],
        default_value: default_value,
        tab: initialization ? dialog.tab || 'Initialization' : dialog.tab,
        group: initialization ? dialog.group || 'Parameters' : dialog.group
      };
      var choices = PRDC_OMJSL_WORKER.componentChoices(property.type);
      if(choices.length) {
        property.choices = choices;
      }
      if(property.type == 'Real' || property.type == 'Integer') {
        var unit = PRDC_OMJSL_WORKER.componentStringAttribute(type, name, 'unit');
        if(unit) {
          property.unit = unit;
          property.quantity = PRDC_OMJSL_WORKER.componentStringAttribute(type, name, 'quantity');
          property.preferred_unit = PRDC_OMJSL_WORKER.componentStringAttribute(type, name, 'displayUnit');
          property.relative_quantity = PRDC_OMJSL_WORKER.componentDefault(type, name + '.relativeQuantity', false).trim() == 'true';
        }
      }
      properties.push(property);
    }
    return {
      type: type,
      description: PRDC_OMJSL_WORKER.unquote(jslab_eval('getClassComment(' + type + ')')),
      properties: properties
    };
  }

  /**
   * Lists classes in a package without installing unrequested libraries.
   * @param {*} request Request.
   * @param {*} status Status.
   */
  static async libraryClasses(request, status) {
    var parent = String(request.parent || 'Modelica');
    if(!PRDC_OMJSL_WORKER.validModelicaName(parent)) {
      throw new Error('Invalid library name.');
    }
    await PRDC_OMJSL_WORKER.loadStandardLibrary(status);
    var names = PRDC_OMJSL_WORKER.parseScriptingValue(jslab_eval('getClassNames(' + parent + ',recursive=' + (request.recursive === true ? 'true' : 'false') + ',qualified=true,sort=true)'));
    if(request.include_root === true && Array.isArray(names)) {
      names.unshift(parent);
    }
    var classes = [];
    for(const name of Array.isArray(names) ? names : []) {
      if(!PRDC_OMJSL_WORKER.validModelicaName(String(name))) {
        continue;
      }
      var info = PRDC_OMJSL_WORKER.parseScriptingValue(jslab_eval('getClassInformation(' + name + ')'));
      if(!Array.isArray(info)) {
        continue;
      }
      classes.push({
        type: String(name),
        restriction: String(info[0] || ''),
        description: String(info[1] || ''),
        partial: !!info[2],
        standard: /^Modelica\./.test(String(name)),
        package: info[0] == 'package'
      });
    }
    return classes;
  }

  /**
   * Reads inherited diagram annotations and referenced graphic resources.
   * @param {*} request Request.
   * @param {*} status Status.
   */
  static async componentGraphics(request, status) {
    var type = String(request.type || '');
    if(!PRDC_OMJSL_WORKER.validModelicaName(type)) {
      throw new Error('Invalid component type.');
    }
    await PRDC_OMJSL_WORKER.loadStandardLibrary(status);
    var ports = [];
    for(const declaration of PRDC_OMJSL_WORKER.componentDeclarations(type)) {
      var row = declaration.row;
      if(!Array.isArray(row) || row[3] != 'public' || !PRDC_OMJSL_WORKER.validModelicaName(String(row[0]))) {
        continue;
      }
      var restriction = PRDC_OMJSL_WORKER.unquote(jslab_eval('getClassRestriction(' + row[0] + ')'));
      if(!/connector/.test(restriction)) {
        continue;
      }
      ports.push({
        name: String(row[1]),
        type: String(row[0]),
        direction: String(row[10] || ''),
        annotation: declaration.annotation
      });
    }
    var icons = [];
    var visited = new Set();
    var collect = function(name) {
      if(visited.has(name)) {
        return;
      }
      visited.add(name);
      var count = Number(jslab_eval('getInheritanceCount(' + name + ')')) || 0;
      for(var index = 1; index <= count; index++) {
        var base = String(jslab_eval('getNthInheritedClass(' + name + ',' + index + ')')).trim();
        if(PRDC_OMJSL_WORKER.validModelicaName(base)) {
          collect(base);
        }
      }
      icons.push({
        type: name,
        annotation: String(jslab_eval('getIconAnnotation(' + name + ')'))
      });
    };
    collect(type);
    return {
      type: type,
      ports: ports,
      icons: icons
    };
  }

  /**
   * Writes an explicitly selected library entry and its resource tree into the compiler.
   * @param {*} request Request.
   * @param {*} status Status.
   */
  static async importLibrary(request, status) {
    await PRDC_OMJSL_WORKER.loadStandardLibrary(status);
    var files = Array.isArray(request.files) ? request.files : [];
    var root = '/usr/lib/jslab-imports/' + String(request.id || 'library');
    if(!/^[A-Za-z0-9_-]+$/.test(String(request.id || 'library'))) {
      throw new Error('Invalid library identifier.');
    }
    var entry = String(request.entry || '');
    var entry_file = files.find(function(file) {
      return file.path == entry;
    });
    if(!entry_file) {
      throw new Error('Library entry file is missing.');
    }
    var roots = PRDC_OMJSL_WORKER.parseScriptingValue(jslab_eval('parseString("' + PRDC_OMJSL_WORKER.escapeModelica(new TextDecoder().decode(new Uint8Array(entry_file.data))) + '","' + PRDC_OMJSL_WORKER.escapeModelica(entry) + '")'));
    if(!Array.isArray(roots) || !roots.length || roots.some(function(name) {
      return !PRDC_OMJSL_WORKER.validModelicaName(String(name));
    })) {
      throw new Error(PRDC_OMJSL_WORKER.errorString('Could not parse the library entry.'));
    }
    if(entry == 'package.mo') {
      if(roots.length != 1) {
        throw new Error('The library entry must declare one package.');
      }
      root += '/' + String(roots[0]).split('.').pop();
    }
    for(const file of files) {
      var relative = String(file.path || '').replace(/\\/g, '/');
      if(!relative || relative.startsWith('/') || relative.split('/').some(function(part) {
        return part == '..' || part == '.' || !part;
      })) {
        throw new Error('Invalid library file path.');
      }
      jslab_write_file(root + '/' + relative, new Uint8Array(file.data));
    }
    var loaded = String(await PRDC_OMJSL_WORKER.evaluateWithDownloads('loadFile("' + PRDC_OMJSL_WORKER.escapeModelica(root + '/' + entry) + '")', status)).trim();
    if(loaded != 'true') {
      throw new Error(PRDC_OMJSL_WORKER.errorString('Could not load the library.'));
    }
    enumeration_choices.clear();
    return roots.map(String);
  }

  /**
   * Copies complete result columns, units, parameters and scene data for the host.
   */
  static resultSnapshot() {
    var info = jslab_sim_info();
    var series = jslab_sim_series() || [];
    var columns = ['time'];
    var data = {
      time: jslab_sim_time() || new Float64Array(0)
    };
    var transferred = new Set([data.time.buffer]);
    var transfer = [data.time.buffer];
    series.forEach(function(item, index) {
      var name = item && item.name || String(item);
      var values = jslab_sim_column(index);
      if(!name || !values) {
        return;
      }
      if(name == 'time' || Object.prototype.hasOwnProperty.call(data, name)) {
        return;
      }
      columns.push(name);
      data[name] = values;
      if(!transferred.has(values.buffer)) {
        transferred.add(values.buffer);
        transfer.push(values.buffer);
      }
    });
    return {
      result: {
        columns: columns,
        data: data,
        info: info,
        parameters: jslab_sim_parameters() || [],
        units: jslab_sim_units() || {}
      },
      transfer: transfer
    };
  }

  /**
   * Initializes the compiler and its persistent resource store once per worker.
   * @param {*} status Status.
   */
  static async initialize(status) {
    if(initialized) {
      return;
    }
    await init({
      module_or_path: await PRDC_OMJSL_WORKER.readBundledResource('omc/OpenModelicaCompiler_bg.wasm', status)
    });
    if(jslab_bridge_version() != JSLAB_MODELICA_BRIDGE_ABI || jslab_bridge_enable() != JSLAB_MODELICA_BRIDGE_ABI) {
      throw new Error('Incompatible JSLAB solver bridge.');
    }
    jslab_set_env('OPENMODELICAHOME', '/usr');
    store = await openStore(omc_module);
    if(!jslab_init()) {
      throw new Error('Solver initialization failed.');
    }
    if(String(jslab_eval('setCommandLineOptions("--loadMissingLibraries=false -d=visxml")')).trim() != 'true') {
      throw new Error('Could not configure explicit solver library loading.');
    }
    jslab_set_inwasm_driver(1);
    jslab_set_sim_bench(true);
    initialized = true;
  }

  /**
   * Loads the installed runtime manifest used for binary and library verification.
   */
  static async getManifest() {
    if(!bundle_manifest) {
      var url = new URL('../manifest.json', import.meta.url);
      var version = new URL(import.meta.url).searchParams.get('js');
      if(version) {
        url.searchParams.set('js', version);
      }
      var manifest = JSON.parse(new TextDecoder().decode(await PRDC_OMJSL_WORKER.readBinary(url.href, function() {})));
      if(manifest.bridge_abi != JSLAB_MODELICA_BRIDGE_ABI) {
        throw new Error('Incompatible JSLAB solver bridge.');
      }
      bundle_manifest = manifest;
    }
    return bundle_manifest;
  }

  /**
   * Reads and verifies a resource named in the installed compiler manifest.
   * @param {*} name Catalog, class or resource name.
   * @param {*} status Status.
   * @param {*} events Events.
   */
  static async readBundledResource(name, status, events = ['downloading-solver-progress', 'downloading-solver-bytes']) {
    var manifest = await PRDC_OMJSL_WORKER.getManifest();
    return readVerifiedResource(new URL('../' + name, import.meta.url).href, manifest.files && manifest.files[name], url => PRDC_OMJSL_WORKER.readBinary(url, status, events), {
      onCacheHit: function(bytes) {
        var amount = (bytes.byteLength / 1024 / 1024).toFixed(1);
        status({
          event: events[0] == 'downloading-solver-progress' ? 'loading-solver-progress' : events[0],
          loaded: amount,
          total: amount,
          progress: 100
        });
      }
    });
  }

  /**
   * Loads the pinned standard-library archive supplied with the compiler bundle.
   * @param {*} status Status.
   */
  static async loadStandardLibrary(status) {
    if(standard_library_loaded) {
      return;
    }
    var library = (await PRDC_OMJSL_WORKER.getManifest()).standard_library;
    if(!library || typeof library.archive != 'string' || typeof library.root != 'string' || !/^[A-Za-z0-9_.+ -]+$/.test(library.archive) || !/^[A-Za-z0-9_.+ -]+$/.test(library.root) || ['.', '..'].includes(library.archive) || ['.', '..'].includes(library.root)) {
      throw new Error('The bundled standard library is not configured.');
    }
    var library_root = '/usr/lib/omlibrary/' + library.root;
    var archive = await PRDC_OMJSL_WORKER.readBundledResource('packages/' + library.archive, status, ['loading-library-progress', 'loading-library-bytes']);
    var files = jslab_vfs_load_zip('/usr/lib/omlibrary', archive);
    if(!files) {
      throw new Error('Could not load the bundled Modelica Standard Library.');
    }
    jslab_set_env('MODELICAPATH', library_root);
    var libraries = ['Complex.mo', 'ModelicaServices/package.mo', 'Modelica/package.mo'];
    for(const filename of libraries) {
      var loaded = String(jslab_eval('loadFile("' + library_root + '/' + filename + '")')).trim();
      if(loaded != 'true') {
        throw new Error(PRDC_OMJSL_WORKER.errorString('Could not load the bundled Modelica Standard Library.'));
      }
    }
    standard_library_loaded = true;
  }

  /**
   * Checks, builds or simulates the requested source and returns its complete result.
   * @param {*} request Request.
   * @param {*} status Status.
   */
  static async compile(request, status) {
    var source = String(request.source || '');
    var name = String(request.model_name || '');
    if(/\bModelica\s*\./.test(source)) {
      status({
        event: 'loading-library'
      });
      await PRDC_OMJSL_WORKER.loadStandardLibrary(status);
    }
    if(PRDC_OMJSL_WORKER.validModelicaName(name)) {
      jslab_eval('deleteClass(' + name + ')');
      jslab_eval('getErrorString()');
    }
    var loaded = String(await PRDC_OMJSL_WORKER.evaluateWithDownloads('loadString("' + PRDC_OMJSL_WORKER.escapeModelica(source) + '")', status)).trim();
    if(loaded != 'true') {
      throw new Error(PRDC_OMJSL_WORKER.errorString('Could not parse the model.'));
    }
    if(!name) {
      var classes = String(jslab_eval('getClassNames()')).replace(/^\{|\}$/g, '').split(',');
      name = String(classes.pop() || '').trim();
    }
    if(!/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(name)) {
      throw new Error('Invalid Modelica class name.');
    }
    if(request.action == 'check') {
      var report = PRDC_OMJSL_WORKER.unquote(await PRDC_OMJSL_WORKER.evaluateWithDownloads('checkModel(' + name + ')', status));
      var check_errors = PRDC_OMJSL_WORKER.errorString('');
      var check_text = [report, check_errors].filter(Boolean).join('\n');
      return {
        success: !/\bError:/i.test(check_errors),
        stdout: check_text,
        diagnostics: PRDC_OMJSL_WORKER.diagnostics(check_text)
      };
    }
    if(request.action == 'build') {
      status({
        event: 'building'
      });
      var built = String(await PRDC_OMJSL_WORKER.evaluateWithDownloads('translateModelFMU(' + name + ', version="3.0", fmuType="me_cs", platforms={"wasm"})', status)).trim();
      var build_errors = PRDC_OMJSL_WORKER.errorString('');
      return {
        success: built == 'true' && !/\bError:/i.test(build_errors),
        stdout: build_errors || (built == 'true' ? 'Model built successfully.' : built),
        error: built == 'true' ? '' : build_errors || 'Build failed.',
        diagnostics: PRDC_OMJSL_WORKER.diagnostics(build_errors)
      };
    }
    var options = request.options || {};
    var number = function(value, fallback) {
      value = Number(value);
      return Number.isFinite(value) ? value : fallback;
    };
    var stop_time = number(options.stop_time, 1);
    var intervals = Math.max(1, Math.round(number(options.intervals, 500)));
    var tolerance = number(options.tolerance, 1e-6);
    var solver = /^[A-Za-z0-9_-]+$/.test(options.solver || '') ? options.solver : 'dassl';
    for(const [parameter, value] of Object.entries(request.parameters || {})) {
      if(/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(parameter) && String(value).length) {
        var parameter_value = String(value).replace(/[\r\n]/g, '');
        var assigned = String(jslab_eval('setParameterValue(' + name + ',' + parameter + ',' + parameter_value + ')')).trim();
        if(assigned != 'true') {
          throw new Error(PRDC_OMJSL_WORKER.errorString('Could not assign parameter ' + parameter + '.'));
        }
      }
    }
    var start_time = number(options.start_time, 0);
    var flags = ['-startTime=' + start_time, '-stepSize=' + (stop_time - start_time) / intervals];
    var simulation = jslab_simulate(name, stop_time, intervals, tolerance, solver, flags.join(' '));
    var simulation_errors = PRDC_OMJSL_WORKER.errorString('');
    var simulation_text = PRDC_OMJSL_WORKER.unquote(simulation);
    if(!simulation || /\bError:/i.test(simulation_errors) || /Simulation execution failed|LOG_ERROR/i.test(simulation_text)) {
      throw new Error(simulation_errors || simulation_text || 'Simulation failed.');
    }
    var snapshot = PRDC_OMJSL_WORKER.resultSnapshot();
    var scene_file = '/' + name + '_visual.xml';
    var scene_fd = omc_module.wasi_path_open(scene_file);
    if(scene_fd >= 0) {
      try {
        snapshot.result.scene = {
          xml: new TextDecoder().decode(omc_module.wasi_fd_read(scene_fd))
        };
      } finally {
        omc_module.wasi_fd_close(scene_fd);
      }
      try {
        snapshot.result.scene.resources = await PRDC_OMJSL_SCENE.collectResources(snapshot.result.scene.xml, async function(uri) {
          var filename = uri;
          if(/^\d+$/.test(filename)) {
            filename += '.dxf';
          }
          if(filename.startsWith('modelica://')) {
            filename = PRDC_OMJSL_WORKER.unquote(jslab_eval('uriToFilename("' + PRDC_OMJSL_WORKER.escapeModelica(filename) + '")'));
            jslab_eval('getErrorString()');
          }
          if(filename.startsWith('file:')) {
            filename = decodeURIComponent(new URL(filename).pathname);
          }
          var fd = omc_module.wasi_path_open(filename);
          if(fd >= 0) {
            try {
              return new Uint8Array(omc_module.wasi_fd_read(fd));
            } finally {
              omc_module.wasi_fd_close(fd);
            }
          }
          // Desktop files are read by the host, not by the numerical core. A
          // browser only has the files explicitly imported into its project.
          if(import.meta.url.startsWith('file:') && !uri.startsWith('modelica://')) {
            var file_url = uri;
            if(!file_url.startsWith('file:') && request.file_path) {
              var project_path = String(request.file_path).replace(/\\/g, '/');
              if(/^[A-Za-z]:\//.test(project_path)) {
                project_path = '/' + project_path;
              }
              file_url = new URL(/^\d+$/.test(uri) ? uri + '.dxf' : uri, 'file://' + project_path).href;
            }
            if(file_url.startsWith('file:')) {
              return PRDC_OMJSL_WORKER.readLocalBinary(file_url, function() {});
            }
          }
          throw new Error('Missing CAD resource: ' + uri);
        });
        for(const bytes of Object.values(snapshot.result.scene.resources)) {
          snapshot.transfer.push(bytes.buffer);
        }
      } catch(error) {
        // Numerical results remain useful if a separately referenced CAD file is
        // missing. Opening its animation reports this exact resource error.
        snapshot.result.scene.error = String(error.message || error);
      }
    }
    return {
      success: true,
      stdout: [simulation_text, simulation_errors].filter(Boolean).join('\n'),
      diagnostics: PRDC_OMJSL_WORKER.diagnostics(simulation_errors),
      result: snapshot.result,
      transfer: snapshot.transfer
    };
  }

  /**
   * * Connects compiler cancellation, progress and binary requests to the host.
   * @param {*} options Host services and operation options.
   */
  static installJSLABModelicaBridge(options = {}) {
    globalThis.__jslabModelicaPollCancel = options.pollCancel || (() => 0);
    globalThis.__jslabModelicaReportProgress = options.reportProgress || (() => {});
    if(options.readWasmBlob) {
      globalThis.__jslabModelicaWasmBlob = options.readWasmBlob;
    }
  }

  /**
   * * Reads an installed simulation side module without starting another download.
   * @param {*} url Url.
   */
  static readSync(url) {
    const request = new XMLHttpRequest();
    request.open('GET', url, false);
    try {
      request.responseType = 'arraybuffer';
      request.send();
    } catch {
      return null;
    }
    if(request.status !== 0 && request.status !== 200) {
      return null;
    }
    return request.response ? new Uint8Array(request.response) : null;
  }

  /**
   * * Resolves a side module in the installed wasm-blobs directory.
   * @param {*} file File.
   */
  static readJSLABModelicaWasmBlob(file) {
    return PRDC_OMJSL_WORKER.readSync(BLOBS + file);
  }

}
var store = null;
var initialized = false;
var standard_library_loaded = false;
var bundle_manifest = null;
var progress_control = null;
var fallback_progress_phase = 0;
var fallback_progress_permille = -1;
PRDC_OMJSL_WORKER.installJSLABModelicaBridge({
  pollCancel: function() {
    return progress_control ? Atomics.load(progress_control, 0) : 0;
  },
  reportProgress: function(permille, phase) {
    permille = Number(permille);
    phase = Number(phase) || 0;
    if(progress_control) {
      Atomics.store(progress_control, 1, Number.isFinite(permille) ? permille : -1);
      Atomics.store(progress_control, 2, phase);
      return;
    }
    var phase_changed = phase != fallback_progress_phase;
    if(!phase_changed && Number.isFinite(permille) && fallback_progress_permille >= 0 && Math.abs(permille - fallback_progress_permille) < 10) {
      return;
    }
    fallback_progress_phase = phase;
    fallback_progress_permille = Number.isFinite(permille) ? permille : -1;
    var phase_events = {
      1: 'retrieving-resource',
      2: 'parsing',
      3: 'instantiating',
      4: 'compiling',
      5: 'simulating'
    };
    if(!phase_events[phase]) {
      return;
    }
    var status = {
      event: phase_events[phase]
    };
    if(fallback_progress_permille >= 0) {
      status.progress = Math.max(0, Math.min(100, fallback_progress_permille / 10));
    }
    self.postMessage({
      type: 'status',
      text: status
    });
  },
  readWasmBlob: PRDC_OMJSL_WORKER.readJSLABModelicaWasmBlob
});
var enumeration_choices = new Map();
self.onmessage = async function(event) {
  var message = event.data || {};
  if(message.command == 'control') {
    progress_control = message.buffer ? new Int32Array(message.buffer) : null;
    return;
  }
  fallback_progress_phase = 0;
  fallback_progress_permille = -1;
  var status = function(text) {
    self.postMessage({
      type: 'status',
      id: message.id,
      text: text
    });
  };
  try {
    await PRDC_OMJSL_WORKER.initialize(status);
    if(message.command == 'status') {
      self.postMessage({
        type: 'reply',
        id: message.id,
        success: true,
        result: {
          available: true,
          version: PRDC_OMJSL_WORKER.unquote(jslab_eval('getVersion()'))
        }
      });
    } else if(message.command == 'compile') {
      var response = await PRDC_OMJSL_WORKER.compile(message.request || {}, status);
      var transfer = response.transfer || [];
      delete response.transfer;
      self.postMessage({
        type: 'reply',
        id: message.id,
        success: true,
        result: response
      }, transfer);
    } else if(message.command == 'model-sources') {
      self.postMessage({ type: 'reply', id: message.id, success: true,
        result: await PRDC_OMJSL_WORKER.modelSources(message.request || {}, status) });
    } else if(message.command == 'component-schema') {
      self.postMessage({
        type: 'reply',
        id: message.id,
        success: true,
        result: await PRDC_OMJSL_WORKER.componentSchema(message.request || {}, status)
      });
    } else if(message.command == 'type-choices') {
      var type = String(message.request && message.request.type || '').replace(/^\./, '');
      if(type.startsWith('Modelica.')) {
        await PRDC_OMJSL_WORKER.loadStandardLibrary(status);
      }
      self.postMessage({
        type: 'reply',
        id: message.id,
        success: true,
        result: PRDC_OMJSL_WORKER.componentChoices(type)
      });
    } else if(message.command == 'library-classes') {
      self.postMessage({
        type: 'reply',
        id: message.id,
        success: true,
        result: await PRDC_OMJSL_WORKER.libraryClasses(message.request || {}, status)
      });
    } else if(message.command == 'component-graphics') {
      self.postMessage({
        type: 'reply',
        id: message.id,
        success: true,
        result: await PRDC_OMJSL_WORKER.componentGraphics(message.request || {}, status)
      });
    } else if(message.command == 'import-library') {
      self.postMessage({
        type: 'reply',
        id: message.id,
        success: true,
        result: await PRDC_OMJSL_WORKER.importLibrary(message.request || {}, status)
      });
    } else {
      throw new Error('Unknown solver command.');
    }
  } catch(error) {
    self.postMessage({
      type: 'reply',
      id: message.id,
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  } finally {
    if(store) {
      await store.flush();
    }
  }
};
