/**
 * @file Workspace values and typed record modifiers for compiler clients
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  resolvedChoiceValue
} = require('./choices');
/**
 * Class for validating and transporting workspace values.
 */
class PRDC_OMJSL_VALUES {

  /**
   * Creates a value-conversion error with a stable code and the failing property path.
   * @param {*} code Code.
   * @param {*} location Location.
   */
  static valueError(code, location) {
    var error = new Error(messages[code].replace('{path}', location));
    error.value_code = code;
    error.value_path = location;
    return error;
  }

  /**
   * Copy data without invoking accessors or sending runtime objects through IPC.
   * @param {*} value Value to inspect or convert.
   * @param {*} location Location.
   * @param {*} ancestors Ancestors.
   */
  static safeWorkspaceValue(value, location = 'value', ancestors = new Set()) {
    if(typeof value == 'number') {
      if(!Number.isFinite(value)) {
        throw PRDC_OMJSL_VALUES.valueError('finite', location);
      }
      return value;
    }
    if(typeof value == 'boolean' || typeof value == 'string') {
      return value;
    }
    if(!value || typeof value != 'object') {
      throw PRDC_OMJSL_VALUES.valueError('unsupported', location);
    }
    if(ancestors.has(value)) {
      throw PRDC_OMJSL_VALUES.valueError('cycle', location);
    }
    if(ancestors.size >= 64) {
      throw PRDC_OMJSL_VALUES.valueError('depth', location);
    }
    var array = Array.isArray(value);
    var typed_length = ArrayBuffer.isView(value) ? typedArrayLength.call(value) : undefined;
    var typed = typeof typed_length == 'number';
    var prototype = Object.getPrototypeOf(value);
    var constructor = prototype && Object.getOwnPropertyDescriptor(prototype, 'constructor');
    var plain = prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null && constructor && typeof constructor.value == 'function' && constructor.value.name == 'Object';
    if(!array && !typed && !plain) {
      throw PRDC_OMJSL_VALUES.valueError('unsupported', location);
    }
    ancestors.add(value);
    try {
      if(typed) {
        var copied = [];
        for(var index = 0; index < typed_length; index++) {
          copied.push(PRDC_OMJSL_VALUES.safeWorkspaceValue(Object.getOwnPropertyDescriptor(value, String(index)).value, location + '[' + index + ']', ancestors));
        }
        return copied;
      }
      var result = array ? [] : Object.create(null);
      var descriptors = Object.getOwnPropertyDescriptors(value);
      var keys = array ? Array.from({
        length: value.length
      }, (_, index) => String(index)) : Object.keys(value);
      for(const key of keys) {
        var descriptor = descriptors[key];
        var field = array ? location + '[' + key + ']' : location + '.' + key;
        if(!descriptor) {
          throw PRDC_OMJSL_VALUES.valueError('unsupported', field);
        }
        if(!Object.hasOwn(descriptor, 'value')) {
          throw PRDC_OMJSL_VALUES.valueError('accessor', field);
        }
        Object.defineProperty(result, key, {
          value: PRDC_OMJSL_VALUES.safeWorkspaceValue(descriptor.value, field, ancestors),
          enumerable: true,
          writable: true,
          configurable: true
        });
      }
      return result;
    } finally {
      ancestors.delete(value);
    }
  }

  /**
   * Generate expressions solely from copied data, never from object source methods.
   * @param {*} value Value to inspect or convert.
   */
  static workspaceValueExpression(value) {
    function expression(item) {
      if(Array.isArray(item)) {
        return '[' + item.map(expression).join(',') + ']';
      }
      if(item && typeof item == 'object') {
        return '{' + Object.entries(item).map(([name, field]) => (name == '__proto__' ? '["__proto__"]' : JSON.stringify(name)) + ':' + expression(field)).join(',') + '}';
      }
      return JSON.stringify(item);
    }
    return expression(PRDC_OMJSL_VALUES.safeWorkspaceValue(value));
  }

  /**
   * Scalar/array literals do not require a compiler schema.
   * @param {*} value Value to inspect or convert.
   * @param {*} location Location.
   */
  static modelicaLiteral(value, location = 'value') {
    value = PRDC_OMJSL_VALUES.safeWorkspaceValue(value, location);
    function literal(item) {
      if(Array.isArray(item)) {
        return '{' + item.map(literal).join(', ') + '}';
      }
      if(typeof item == 'object') {
        throw PRDC_OMJSL_VALUES.valueError('record', location);
      }
      if(typeof item != 'string') {
        return String(item);
      }
      return '"' + item.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\f/g, '\\f').replace(/\x08/g, '\\b') + '"';
    }
    return literal(value);
  }

  /**
   * Partial record modifiers preserve the owning block's inherited field defaults.
   * @param {*} property Component property definition.
   * @param {*} value Value to inspect or convert.
   * @param {*} recordSchema RecordSchema.
   * @param {*} options Host services and operation options.
   */
  static async resolvePropertyValue(property, value, recordSchema, options = {}) {
    var copied = PRDC_OMJSL_VALUES.safeWorkspaceValue(value, options.path || property.name || 'value');
    async function resolve(item, definition, location, modifier) {
      if(Array.isArray(item)) {
        var scalar = Object.assign({}, definition, {
          dimensions: (definition.dimensions || []).slice(1)
        });
        var parts = [];
        for(var index = 0; index < item.length; index++) {
          parts.push((await resolve(item[index], scalar, location + '[' + index + ']', false)).value);
        }
        return {
          value: '{' + parts.join(', ') + '}',
          nested: false
        };
      }
      if(item && typeof item == 'object') {
        var type = String(definition.type || '').replace(/^\./, '');
        if(!/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(type) || (definition.dimensions || []).length) {
          throw PRDC_OMJSL_VALUES.valueError('record', location);
        }
        var schema = await recordSchema(type);
        if(!schema || !Array.isArray(schema.properties)) {
          throw PRDC_OMJSL_VALUES.valueError('record', location);
        }
        var parts = [];
        for(const [name, fieldValue] of Object.entries(item)) {
          var field = schema.properties.find(field => field.name == name);
          if(!field || !/^[A-Za-z_]\w*$/.test(name)) {
            throw PRDC_OMJSL_VALUES.valueError('field', location + '.' + name);
          }
          if(field.final) {
            throw PRDC_OMJSL_VALUES.valueError('final', location + '.' + name);
          }
          var resolved = await resolve(fieldValue, field, location + '.' + name, modifier);
          parts.push(name + (resolved.nested ? '' : ' = ') + resolved.value);
        }
        return {
          value: (modifier ? '' : type) + '(' + parts.join(', ') + ')',
          nested: !!modifier
        };
      }
      var literal = PRDC_OMJSL_VALUES.modelicaLiteral(item, location);
      if(definition.type == 'Boolean' || definition.choices && definition.choices.length) {
        try {
          literal = resolvedChoiceValue(Object.assign({}, definition, {
            dimensions: []
          }), literal);
        } catch(error) {
          throw PRDC_OMJSL_VALUES.valueError('choice', location);
        }
      }
      return {
        value: literal,
        nested: false
      };
    }
    return resolve(copied, property, options.path || property.name || 'value', options.modifier === true);
  }

  /**
   * Keep compiler value diagnostics in the library's own language catalog.
   * @param {*} error Error.
   * @param {*} language Selected interface language.
   */
  static localizedValueError(error, language = 'en') {
    if(!error || !error.value_code) {
      return error && error.message || String(error);
    }
    var {
      readMetadata
    } = require('./assets');
    var {
      translatedLibraryText
    } = require('./localization');
    var id = readMetadata('value-labels.json')[error.value_code];
    return (translatedLibraryText(id, language) || messages[error.value_code]).replace('{path}', error.value_path || 'value');
  }

}
const typedArrayLength = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'length').get;
const messages = {
  finite: 'Use finite numbers at {path}.',
  cycle: 'The value at {path} contains a circular reference.',
  unsupported: 'Use a number, Boolean, string, array or plain object at {path}.',
  accessor: 'The value at {path} must not contain getters or setters.',
  depth: 'The value at {path} is nested too deeply.',
  record: 'The property at {path} does not accept an object.',
  field: 'The record has no editable field named {path}.',
  final: 'The field at {path} is read-only.',
  choice: 'The value at {path} is not one of the available choices.'
};
exports.safeWorkspaceValue = PRDC_OMJSL_VALUES.safeWorkspaceValue;
exports.workspaceValueExpression = PRDC_OMJSL_VALUES.workspaceValueExpression;
exports.modelicaLiteral = PRDC_OMJSL_VALUES.modelicaLiteral;
exports.resolvePropertyValue = PRDC_OMJSL_VALUES.resolvePropertyValue;
exports.localizedValueError = PRDC_OMJSL_VALUES.localizedValueError;
