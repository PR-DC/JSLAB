/**
 * @file JSLAB workspace serializer
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Serializer for workspace/object save-load with reference preservation.
 */
class PRDC_JSLAB_WORKSPACE_SERIALIZER {
  
  /**
   * @constructor
   * @param {Object} jsl - JSLAB instance.
   */
  constructor(jsl) {
    this.jsl = jsl;
    this.format_name = 'jslab-workspace';
    this.format_version = 2;
    this.builtin_class_names = [
      'PRDC_JSLAB_MATRIX',
      'PRDC_JSLAB_VECTOR',
      'PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL',
      'PRDC_JSLAB_TABLE',
      'PRDC_JSLAB_TIMETABLE'
    ];
  }
  
  /**
   * Checks whether the provided payload uses the current serializer format.
   * @param {*} payload - Potential serialized payload.
   * @returns {boolean}
   */
  isSerializedPayload(payload) {
    return !!(
      payload &&
      typeof payload === 'object' &&
      payload.__jslab_format__ === this.format_name &&
      payload.__jslab_version__ === this.format_version
    );
  }
  
  /**
   * Serializes a workspace map.
   * @param {Object<string, *>} workspace - Variables to save.
   * @param {Object} [options={}] - Serialization options.
   * @returns {Object}
   */
  serializeWorkspace(workspace, options = {}) {
    var ctx = this._createSerializeContext(options);
    var root = {};
    if(workspace && typeof workspace === 'object') {
      Object.keys(workspace).forEach((key) => {
        root[key] = this._encodeValue(workspace[key], ctx);
      });
    }
    return {
      __jslab_format__: this.format_name,
      __jslab_version__: this.format_version,
      scope: 'workspace',
      created_at: new Date().toISOString(),
      root: root,
      nodes: ctx.nodes,
      warnings: ctx.warnings
    };
  }
  
  /**
   * Deserializes a workspace payload.
   * @param {Object} payload - Serialized payload.
   * @param {Object} [options={}] - Deserialization options.
   * @returns {Promise<{workspace: Object, warnings: string[]}>}
   */
  async deserializeWorkspace(payload, options = {}) {
    if(!this.isSerializedPayload(payload)) {
      if(payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return { workspace: payload, warnings: [] };
      }
      return { workspace: {}, warnings: ['Invalid workspace payload.'] };
    }
    
    if(payload.scope !== 'workspace') {
      return { workspace: {}, warnings: ['Payload is not a workspace payload.'] };
    }
    
    var ctx = this._createDeserializeContext(payload, options);
    var workspace = {};
    var root = payload.root || {};
    var keys = Object.keys(root);
    for(var i = 0; i < keys.length; i++) {
      var key = keys[i];
      workspace[key] = await this._decodeValue(root[key], ctx);
    }
    return { workspace: workspace, warnings: ctx.warnings };
  }
  
  /**
   * Serializes a single object/value.
   * @param {*} value - Value to serialize.
   * @param {Object} [options={}] - Serialization options.
   * @returns {Object}
   */
  serializeObject(value, options = {}) {
    var ctx = this._createSerializeContext(options);
    return {
      __jslab_format__: this.format_name,
      __jslab_version__: this.format_version,
      scope: 'object',
      created_at: new Date().toISOString(),
      root: this._encodeValue(value, ctx),
      nodes: ctx.nodes,
      warnings: ctx.warnings
    };
  }
  
  /**
   * Deserializes a single object/value payload.
   * @param {Object} payload - Serialized payload.
   * @param {Object} [options={}] - Deserialization options.
   * @returns {Promise<{value: *, warnings: string[]}>}
   */
  async deserializeObject(payload, options = {}) {
    if(!this.isSerializedPayload(payload)) {
      return { value: payload, warnings: [] };
    }
    
    if(payload.scope !== 'object') {
      return { value: undefined, warnings: ['Payload is not an object payload.'] };
    }
    
    var ctx = this._createDeserializeContext(payload, options);
    var value = await this._decodeValue(payload.root, ctx);
    return { value: value, warnings: ctx.warnings };
  }
  
  /**
   * Attempts to load a class definition by name and path.
   * @param {string} class_name - Constructor/class name.
   * @param {string} class_path - Class file path (absolute or relative).
   * @param {Object} [options={}] - Additional options.
   * @returns {Promise<boolean>}
   */
  async loadClass(class_name, class_path, options = {}) {
    if(typeof class_name !== 'string' || !class_name.length) {
      return false;
    }
    
    if(typeof this.jsl.context[class_name] === 'function') {
      return true;
    }
    
    var resolved_path = this._resolveClassPath(class_path, this._getSaveDir(options));
    if(!resolved_path) {
      return false;
    }
    
    var loaded = false;
    var ext = String(this.jsl.inter.env.pathExtName(resolved_path) || '').toLowerCase();
    
    // First try CommonJS exports for .js module-like class definitions.
    if(ext === '.js' || ext === '.cjs' || ext === '.mjs') {
      try {
        var exp = require(resolved_path);
        var ctor;
        if(typeof exp === 'function') {
          ctor = exp;
        } else if(exp && typeof exp[class_name] === 'function') {
          ctor = exp[class_name];
        } else if(exp && exp.default && typeof exp.default === 'function') {
          ctor = exp.default;
        }
        if(typeof ctor === 'function') {
          this.jsl.context[class_name] = ctor;
          this.jsl.registerClassDefinition(class_name, ctor, resolved_path);
          loaded = true;
        }
      } catch {}
    }
    
    if(!loaded) {
      try {
        await this.jsl.inter.eval.runScript(resolved_path, undefined, true);
        loaded = typeof this.jsl.context[class_name] === 'function';
      } catch {}
    }
    
    if(loaded) {
      this.jsl.registerClassDefinition(class_name, this.jsl.context[class_name], resolved_path);
    }
    return loaded;
  }
  
  /**
   * Creates serializer context.
   * @param {Object} options - Options.
   * @returns {Object}
   */
  _createSerializeContext(options) {
    return {
      seen: new WeakMap(),
      next_id: 1,
      nodes: {},
      warnings: [],
      warning_set: new Set(),
      save_dir: this._getSaveDir(options)
    };
  }
  
  /**
   * Creates deserializer context.
   * @param {Object} payload - Serialized payload.
   * @param {Object} options - Options.
   * @returns {Object}
   */
  _createDeserializeContext(payload, options) {
    return {
      nodes: payload.nodes || {},
      refs: {},
      loading: {},
      warnings: [],
      warning_set: new Set(),
      save_dir: this._getSaveDir(options),
      class_load_cache: {}
    };
  }
  
  /**
   * Resolves base directory used for relative class paths.
   * @param {Object} [options={}] - Options object.
   * @returns {(string|undefined)}
   */
  _getSaveDir(options = {}) {
    if(options && typeof options.save_dir === 'string' && options.save_dir.length) {
      return options.save_dir;
    }
    if(options && typeof options.save_file_path === 'string' && options.save_file_path.length) {
      return this.jsl.inter.env.pathDirName(options.save_file_path);
    }
    return undefined;
  }
  
  /**
   * Adds a warning once.
   * @param {Object} ctx - Serialization context.
   * @param {string} message - Warning text.
   */
  _warnOnce(ctx, message) {
    if(!message) return;
    if(!ctx.warning_set.has(message)) {
      ctx.warning_set.add(message);
      ctx.warnings.push(message);
    }
  }
  
  /**
   * Encodes value recursively.
   * @param {*} value - Value.
   * @param {Object} ctx - Serialize context.
   * @returns {*}
   */
  _encodeValue(value, ctx) {
    if(value === undefined) {
      return { $type: 'Undefined' };
    }
    if(typeof value === 'number') {
      if(Number.isNaN(value)) return { $type: 'Number', value: 'NaN' };
      if(value === Infinity) return { $type: 'Number', value: 'Infinity' };
      if(value === -Infinity) return { $type: 'Number', value: '-Infinity' };
      return value;
    }
    if(typeof value === 'bigint') {
      return { $type: 'BigInt', value: value.toString() };
    }
    if(typeof value === 'function') {
      return { $type: 'Function', name: value.name || '' };
    }
    if(typeof value === 'symbol') {
      return { $type: 'Symbol', description: value.description || '' };
    }
    if(value === null || typeof value !== 'object') {
      return value;
    }
    
    if(ctx.seen.has(value)) {
      return { $ref: ctx.seen.get(value) };
    }
    
    var node_id = ctx.next_id++;
    ctx.seen.set(value, node_id);
    try {
      ctx.nodes[node_id] = this._encodeNode(value, ctx);
    } catch(err) {
      this._warnOnce(
        ctx,
        'Failed to serialize object of type "' +
        this._getConstructorName(value) +
        '": ' + (err && err.message ? err.message : String(err))
      );
      ctx.nodes[node_id] = { kind: 'Object', properties: {} };
    }
    return { $ref: node_id };
  }
  
  /**
   * Encodes object node.
   * @param {Object} value - Object.
   * @param {Object} ctx - Serialize context.
   * @returns {Object}
   */
  _encodeNode(value, ctx) {
    if(Array.isArray(value)) {
      return {
        kind: 'Array',
        items: value.map((item) => this._encodeValue(item, ctx))
      };
    }
    
    if(value instanceof Date) {
      var t = value.getTime();
      return {
        kind: 'Date',
        value: isFinite(t) ? t : NaN
      };
    }
    
    if(value instanceof RegExp) {
      return {
        kind: 'RegExp',
        source: value.source,
        flags: value.flags
      };
    }
    
    if(value instanceof Map) {
      var map_entries = [];
      value.forEach((map_value, map_key) => {
        map_entries.push([
          this._encodeValue(map_key, ctx),
          this._encodeValue(map_value, ctx)
        ]);
      });
      return {
        kind: 'Map',
        entries: map_entries
      };
    }
    
    if(value instanceof Set) {
      var set_entries = [];
      value.forEach((set_value) => {
        set_entries.push(this._encodeValue(set_value, ctx));
      });
      return {
        kind: 'Set',
        entries: set_entries
      };
    }
    
    if(this.jsl.inter.format.isTypedArray(value)) {
      return {
        kind: 'TypedArray',
        ctor: value.constructor ? value.constructor.name : 'Uint8Array',
        values: this._encodeValue(Array.from(value), ctx)
      };
    }
    
    if(value instanceof ArrayBuffer) {
      return {
        kind: 'ArrayBuffer',
        values: this._encodeValue(Array.from(new Uint8Array(value)), ctx)
      };
    }
    
    if(value instanceof Error) {
      return {
        kind: 'Error',
        name: value.name,
        message: value.message,
        stack: value.stack,
        properties: this._encodeProperties(value, ctx)
      };
    }
    
    var class_name = this._getConstructorName(value);
    if(this._isBuiltinClassName(class_name)) {
      var builtin_state = this._extractBuiltinState(value, class_name);
      if(builtin_state !== false) {
        return {
          kind: 'BuiltinClass',
          class_name: class_name,
          state: this._encodeValue(builtin_state, ctx),
          properties: this._encodeProperties(value, ctx)
        };
      }
    }
    
    if(class_name && class_name !== 'Object') {
      var class_meta = this._resolveClassMeta(value, class_name, ctx.save_dir);
      return {
        kind: 'ClassInstance',
        class_name: class_name,
        class_builtin: !!class_meta.class_builtin,
        class_path: class_meta.class_path,
        class_path_relative: class_meta.class_path_relative,
        properties: this._encodeProperties(value, ctx)
      };
    }
    
    return {
      kind: 'Object',
      properties: this._encodeProperties(value, ctx)
    };
  }
  
  /**
   * Encodes own data properties.
   * @param {Object} value - Object to encode.
   * @param {Object} ctx - Serialize context.
   * @returns {Object}
   */
  _encodeProperties(value, ctx) {
    var properties = {};
    var descriptors;
    try {
      descriptors = Object.getOwnPropertyDescriptors(value);
    } catch(err) {
      this._warnOnce(ctx, 'Failed reading object properties while saving workspace.');
      return properties;
    }
    var keys = Reflect.ownKeys(descriptors);
    
    for(var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if(typeof key !== 'string') {
        this._warnOnce(ctx, 'Skipped symbol property while saving workspace.');
        continue;
      }
      var descriptor = descriptors[key];
      if(!descriptor) continue;
      if(descriptor.get || descriptor.set) {
        this._warnOnce(ctx, 'Skipped accessor property while saving workspace: ' + key + '.');
        continue;
      }
      if(Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        try {
          properties[key] = this._encodeValue(descriptor.value, ctx);
        } catch(err) {
          this._warnOnce(ctx, 'Failed serializing property "' + key + '".');
        }
      }
    }
    return properties;
  }
  
  /**
   * Gets constructor/class name for an object.
   * @param {*} value - Candidate value.
   * @returns {string}
   */
  _getConstructorName(value) {
    if(!value || typeof value !== 'object') return '';
    if(value.constructor && typeof value.constructor.name === 'string') {
      return value.constructor.name;
    }
    return '';
  }
  
  /**
   * Checks whether class name is treated as built-in for restoration.
   * @param {string} class_name - Constructor name.
   * @returns {boolean}
   */
  _isBuiltinClassName(class_name) {
    return this.builtin_class_names.includes(class_name);
  }
  
  /**
   * Resolves class metadata for serialization.
   * @param {Object} value - Class instance.
   * @param {string} class_name - Constructor name.
   * @param {string} [save_dir] - Save directory for relative path.
   * @returns {Object}
   */
  _resolveClassMeta(value, class_name, save_dir) {
    var class_path;
    var ctor = value && value.constructor;
    
    if(ctor && typeof ctor.__jslab_class_path === 'string') {
      class_path = ctor.__jslab_class_path;
    }
    if(typeof class_path !== 'string' || !class_path.length) {
      class_path = this.jsl.getClassDefinitionPath(class_name);
    }
    if(typeof class_path === 'string' && class_path.length) {
      class_path = this.jsl.inter.env.pathNormalize(class_path);
    } else {
      class_path = undefined;
    }
    
    var class_path_relative;
    if(
      typeof class_path === 'string' &&
      class_path.length &&
      typeof save_dir === 'string' &&
      save_dir.length &&
      this.jsl.inter.env.pathIsAbsolute(class_path)
    ) {
      class_path_relative = this.jsl.inter.env.pathRelative(save_dir, class_path);
    }
    
    return {
      class_builtin: this._isBuiltinClassName(class_name),
      class_path: class_path,
      class_path_relative: class_path_relative
    };
  }
  
  /**
   * Extracts state for built-in class restoration.
   * @param {Object} value - Instance.
   * @param {string} class_name - Constructor name.
   * @returns {(Object|false)}
   */
  _extractBuiltinState(value, class_name) {
    if(class_name === 'PRDC_JSLAB_MATRIX') {
      return {
        rows: value.rows,
        cols: value.cols,
        data: Array.isArray(value.data) ? value.data.slice() : []
      };
    }
    if(class_name === 'PRDC_JSLAB_VECTOR') {
      return {
        x: value.x,
        y: value.y,
        z: value.z
      };
    }
    if(class_name === 'PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL') {
      return {
        name: value.name,
        value: value.value,
        parsed_value: value.parsed_value
      };
    }
    if(class_name === 'PRDC_JSLAB_TABLE') {
      var table_columns = {};
      if(value && typeof value.toColumns === 'function') {
        table_columns = value.toColumns();
      } else if(value && value._columns && typeof value._columns === 'object') {
        Object.keys(value._columns).forEach(function(key) {
          var col = value._columns[key];
          table_columns[key] = Array.isArray(col) ? col.slice() : [];
        });
      }
      return {
        variable_names: Array.isArray(value.VariableNames) ? value.VariableNames.slice() : [],
        row_names: Array.isArray(value.RowNames) ? value.RowNames.slice() : [],
        columns: table_columns
      };
    }
    if(class_name === 'PRDC_JSLAB_TIMETABLE') {
      var timetable_columns = {};
      if(value && typeof value.toColumns === 'function') {
        timetable_columns = value.toColumns();
      } else if(value && value._columns && typeof value._columns === 'object') {
        Object.keys(value._columns).forEach(function(key) {
          var col = value._columns[key];
          timetable_columns[key] = Array.isArray(col) ? col.slice() : [];
        });
      }
      return {
        variable_names: Array.isArray(value.VariableNames) ? value.VariableNames.slice() : [],
        row_names: Array.isArray(value.RowNames) ? value.RowNames.slice() : [],
        row_times: Array.isArray(value.RowTimes) ? value.RowTimes.slice() : [],
        row_times_name: typeof value.RowTimesName === 'string' ? value.RowTimesName : 'Time',
        columns: timetable_columns
      };
    }
    return false;
  }
  
  /**
   * Decodes value recursively.
   * @param {*} encoded - Encoded value.
   * @param {Object} ctx - Deserialize context.
   * @returns {Promise<*>}
   */
  async _decodeValue(encoded, ctx) {
    if(encoded && typeof encoded === 'object') {
      if(Object.prototype.hasOwnProperty.call(encoded, '$ref')) {
        return await this._decodeRef(encoded.$ref, ctx);
      }
      if(Object.prototype.hasOwnProperty.call(encoded, '$type')) {
        return this._decodeSpecial(encoded, ctx);
      }
    }
    return encoded;
  }
  
  /**
   * Decodes primitive wrappers.
   * @param {Object} encoded - Encoded marker.
   * @param {Object} ctx - Deserialize context.
   * @returns {*}
   */
  _decodeSpecial(encoded, ctx) {
    switch(encoded.$type) {
      case 'Undefined':
        return undefined;
      case 'Number':
        if(encoded.value === 'NaN') return NaN;
        if(encoded.value === 'Infinity') return Infinity;
        if(encoded.value === '-Infinity') return -Infinity;
        return Number(encoded.value);
      case 'BigInt':
        try {
          return BigInt(encoded.value);
        } catch {
          this._warnOnce(ctx, 'Failed to restore BigInt value.');
          return undefined;
        }
      case 'Function':
        this._warnOnce(ctx, 'Functions are not restored when loading workspace.');
        return undefined;
      case 'Symbol':
        return Symbol(encoded.description || '');
      default:
        return undefined;
    }
  }
  
  /**
   * Decodes node reference.
   * @param {(string|number)} ref_id - Node ID.
   * @param {Object} ctx - Deserialize context.
   * @returns {Promise<*>}
   */
  async _decodeRef(ref_id, ctx) {
    var id = String(ref_id);
    if(Object.prototype.hasOwnProperty.call(ctx.refs, id)) {
      return ctx.refs[id];
    }
    if(Object.prototype.hasOwnProperty.call(ctx.loading, id)) {
      return await ctx.loading[id];
    }
    
    var loading = this._decodeNode(id, ctx);
    ctx.loading[id] = loading;
    try {
      return await loading;
    } finally {
      delete ctx.loading[id];
    }
  }
  
  /**
   * Decodes node by ID.
   * @param {string} id - Node ID.
   * @param {Object} ctx - Deserialize context.
   * @returns {Promise<*>}
   */
  async _decodeNode(id, ctx) {
    var node = ctx.nodes[id];
    if(!node) {
      this._warnOnce(ctx, 'Missing serialized node: ' + id + '.');
      return undefined;
    }
    
    var target = await this._createNodeTarget(node, ctx);
    ctx.refs[id] = target;
    await this._fillNodeTarget(target, node, ctx);
    return target;
  }
  
  /**
   * Creates target instance for decoded node.
   * @param {Object} node - Serialized node.
   * @param {Object} ctx - Deserialize context.
   * @returns {Promise<*>}
   */
  async _createNodeTarget(node, ctx) {
    switch(node.kind) {
      case 'Array':
        return [];
      case 'Date':
        return new Date(node.value);
      case 'RegExp':
        return new RegExp(node.source || '', node.flags || '');
      case 'Map':
        return new Map();
      case 'Set':
        return new Set();
      case 'TypedArray': {
        var values = await this._decodeValue(node.values, ctx);
        if(!Array.isArray(values)) values = [];
        var typed_ctor = this.jsl.context[node.ctor];
        if(typeof typed_ctor === 'function') {
          return new typed_ctor(values.length);
        }
        this._warnOnce(ctx, 'Unknown typed array constructor: ' + node.ctor + '.');
        return values.slice();
      }
      case 'ArrayBuffer': {
        var buffer_values = await this._decodeValue(node.values, ctx);
        if(!Array.isArray(buffer_values)) buffer_values = [];
        return new ArrayBuffer(buffer_values.length);
      }
      case 'Error': {
        var error_obj = new Error(node.message || '');
        error_obj.name = node.name || 'Error';
        if(node.stack) {
          error_obj.stack = node.stack;
        }
        return error_obj;
      }
      case 'BuiltinClass': {
        var state = await this._decodeValue(node.state, ctx);
        var restored = this._restoreBuiltinClass(node.class_name, state);
        if(restored !== false) {
          return restored;
        }
        this._warnOnce(ctx, 'Failed to restore built-in class: ' + node.class_name + '.');
        return {};
      }
      case 'ClassInstance': {
        var class_target = await this._createClassInstance(node, ctx);
        return class_target;
      }
      case 'Object':
      default:
        return {};
    }
  }
  
  /**
   * Populates decoded node target with values.
   * @param {*} target - Target object.
   * @param {Object} node - Serialized node.
   * @param {Object} ctx - Deserialize context.
   */
  async _fillNodeTarget(target, node, ctx) {
    switch(node.kind) {
      case 'Array': {
        var items = node.items || [];
        for(var i = 0; i < items.length; i++) {
          target[i] = await this._decodeValue(items[i], ctx);
        }
        break;
      }
      case 'Map': {
        var entries = node.entries || [];
        for(var j = 0; j < entries.length; j++) {
          var entry = entries[j];
          if(!Array.isArray(entry) || entry.length < 2) continue;
          var key = await this._decodeValue(entry[0], ctx);
          var value = await this._decodeValue(entry[1], ctx);
          target.set(key, value);
        }
        break;
      }
      case 'Set': {
        var set_entries = node.entries || [];
        for(var k = 0; k < set_entries.length; k++) {
          target.add(await this._decodeValue(set_entries[k], ctx));
        }
        break;
      }
      case 'TypedArray': {
        var typed_values = await this._decodeValue(node.values, ctx);
        if(Array.isArray(typed_values) && target && typeof target.length === 'number') {
          var typed_len = Math.min(target.length, typed_values.length);
          for(var ti = 0; ti < typed_len; ti++) {
            target[ti] = typed_values[ti];
          }
        }
        break;
      }
      case 'ArrayBuffer': {
        var byte_values = await this._decodeValue(node.values, ctx);
        if(Array.isArray(byte_values) && target instanceof ArrayBuffer) {
          var view = new Uint8Array(target);
          var byte_len = Math.min(view.length, byte_values.length);
          for(var bi = 0; bi < byte_len; bi++) {
            view[bi] = byte_values[bi];
          }
        }
        break;
      }
      default:
        break;
    }
    
    if(node.properties && typeof node.properties === 'object') {
      var prop_keys = Object.keys(node.properties);
      for(var p = 0; p < prop_keys.length; p++) {
        var prop_key = prop_keys[p];
        if(prop_key === '__proto__' || prop_key === 'prototype') {
          this._warnOnce(ctx, 'Skipped unsafe property while loading workspace: ' + prop_key + '.');
          continue;
        }
        target[prop_key] = await this._decodeValue(node.properties[prop_key], ctx);
      }
    }
  }
  
  /**
   * Creates class instance target (without invoking constructor arguments).
   * @param {Object} node - Serialized class node.
   * @param {Object} ctx - Deserialize context.
   * @returns {Promise<Object>}
   */
  async _createClassInstance(node, ctx) {
    var class_name = node.class_name;
    if(typeof class_name !== 'string' || !class_name.length) {
      return {};
    }
    
    var ctor = this.jsl.context[class_name];
    if(typeof ctor !== 'function') {
      var class_path = this._resolveClassPathFromNode(node, ctx.save_dir);
      if(!class_path) {
        var known_path = this.jsl.getClassDefinitionPath(class_name);
        class_path = this._resolveClassPath(known_path, ctx.save_dir);
      }
      if(class_path) {
        var cache_key = class_name + '|' + class_path;
        if(!Object.prototype.hasOwnProperty.call(ctx.class_load_cache, cache_key)) {
          ctx.class_load_cache[cache_key] = await this.loadClass(class_name, class_path, { save_dir: ctx.save_dir });
        }
        ctor = this.jsl.context[class_name];
      }
    }
    
    if(typeof ctor === 'function') {
      try {
        return Object.create(ctor.prototype);
      } catch {}
    }
    
    this._warnOnce(ctx, 'Class not found while loading: ' + class_name + '.');
    var fallback = {};
    fallback.__jslab_class_name = class_name;
    if(node.class_path) fallback.__jslab_class_path = node.class_path;
    if(node.class_path_relative) fallback.__jslab_class_path_relative = node.class_path_relative;
    return fallback;
  }
  
  /**
   * Resolves class path from node metadata.
   * @param {Object} node - Serialized node.
   * @param {string} [save_dir] - Base dir.
   * @returns {(string|false)}
   */
  _resolveClassPathFromNode(node, save_dir) {
    if(typeof node.class_path === 'string' && node.class_path.length) {
      var p = this._resolveClassPath(node.class_path, save_dir);
      if(p) return p;
    }
    if(typeof node.class_path_relative === 'string' && node.class_path_relative.length) {
      var r = this._resolveClassPath(node.class_path_relative, save_dir);
      if(r) return r;
    }
    return false;
  }
  
  /**
   * Resolves class path against known locations.
   * @param {string} class_path - Input path.
   * @param {string} [save_dir] - Optional base dir.
   * @returns {(string|false)}
   */
  _resolveClassPath(class_path, save_dir) {
    if(typeof class_path !== 'string' || !class_path.length) {
      return false;
    }
    
    var candidates = [];
    if(this.jsl.inter.env.pathIsAbsolute(class_path)) {
      candidates.push(class_path);
    } else {
      if(typeof save_dir === 'string' && save_dir.length) {
        candidates.push(this.jsl.inter.env.pathJoin(save_dir, class_path));
      }
      if(typeof this.jsl.current_path === 'string' && this.jsl.current_path.length) {
        candidates.push(this.jsl.inter.env.pathJoin(this.jsl.current_path, class_path));
      }
      if(typeof this.jsl.includes_path === 'string' && this.jsl.includes_path.length) {
        candidates.push(this.jsl.inter.env.pathJoin(this.jsl.includes_path, class_path));
      }
      if(Array.isArray(this.jsl.saved_paths)) {
        for(var si = 0; si < this.jsl.saved_paths.length; si++) {
          candidates.push(this.jsl.inter.env.pathJoin(this.jsl.saved_paths[si], class_path));
        }
      }
      candidates.push(this.jsl.inter.env.pathResolve(class_path));
    }
    
    for(var i = 0; i < candidates.length; i++) {
      var candidate = this.jsl.inter.env.pathNormalize(candidates[i]);
      if(this.jsl.inter.env.checkFile(candidate)) {
        return candidate;
      }
    }
    return false;
  }
  
  /**
   * Restores built-in class instance from serialized state.
   * @param {string} class_name - Class name.
   * @param {Object} state - Serialized state.
   * @returns {(Object|false)}
   */
  _restoreBuiltinClass(class_name, state) {
    if(class_name === 'PRDC_JSLAB_MATRIX') {
      if(!state) {
        return false;
      }
      return this.jsl.inter.mat.new(state.data || [], state.rows, state.cols);
    }
    
    if(class_name === 'PRDC_JSLAB_VECTOR') {
      if(!state) {
        return false;
      }
      return this.jsl.inter.vec.new(state.x, state.y, state.z);
    }
    
    if(class_name === 'PRDC_JSLAB_SYMBOLIC_MATH_SYMBOL') {
      if(!state) {
        return false;
      }
      var symbol = this.jsl.inter.sym._newSymbol(state.name, state.value);
      if(Object.prototype.hasOwnProperty.call(state, 'parsed_value')) {
        symbol.parsed_value = state.parsed_value;
      }
      return symbol;
    }

    if(class_name === 'PRDC_JSLAB_TABLE') {
      if(state) {
        var table_options = {
          VariableNames: state.variable_names || []
        };
        if(Array.isArray(state.row_names) && state.row_names.length) {
          table_options.RowNames = state.row_names;
        }
        return new this.jsl.context.PRDC_JSLAB_TABLE(this.jsl, state.columns || {}, table_options);
      }
      return false;
    }

    if(class_name === 'PRDC_JSLAB_TIMETABLE') {
      if(state) {
        var timetable_options = {
          VariableNames: state.variable_names || [],
          RowTimesName: state.row_times_name || 'Time'
        };
        if(Array.isArray(state.row_names) && state.row_names.length) {
          timetable_options.RowNames = state.row_names;
        }
        return new this.jsl.context.PRDC_JSLAB_TIMETABLE(this.jsl, state.row_times || [], state.columns || {}, timetable_options);
      }
      return false;
    }
    
    return false;
  }
}

exports.PRDC_JSLAB_WORKSPACE_SERIALIZER = PRDC_JSLAB_WORKSPACE_SERIALIZER;
