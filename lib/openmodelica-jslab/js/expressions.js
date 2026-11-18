/**
 * @file Source expressions displayed as workspace values
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  parser
} = require('./parser');
const {
  componentModifiers
} = require('./modifiers');
const {
  propertyChoice
} = require('./choices');
/**
 * Class for converting compiler literals to workspace expressions.
 */
class PRDC_OMJSL_EXPRESSIONS {

  /**
   * Decodes a compiler string literal without evaluating source code.
   * @param {*} source Original compiler source text.
   */
  static stringValue(source) {
    const escapes = {
      a: '\x07',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
      v: '\v',
      '"': '"',
      "'": "'",
      '\\': '\\',
      '?': '?'
    };
    return source.slice(1, -1).replace(/\\(.)/gs, function(_, escape) {
      if(!Object.hasOwn(escapes, escape)) {
        throw new Error('Unsupported string escape.');
      }
      return escapes[escape];
    });
  }

  /**
   * Converts supported compiler literals into workspace expressions.
   * @param {*} value Value to inspect or convert.
   * @param {*} initialization Initialization.
   */
  static parseValue(value, initialization) {
    if(initialization && value.startsWith('(')) {
      var modifier = componentModifiers('Value item' + value + ';', 'item').modifiers.find(item => item.name == 'start');
      if(modifier) {
        value = modifier.value;
      }
    }
    var ast = parser.parse('model JSLABValue parameter Real value = ' + value + '; end JSLABValue;');
    return ast.classDefinitionList[0].componentClauseList[0].componentList[0].modification.expression;
  }

  /**
   * Only literal bindings can be removed without changing workspace-reference semantics.
   * @param {*} value Value to inspect or convert.
   * @param {*} initialization Initialization.
   */
  static isLiteralModelicaValue(value, initialization = false) {
    try {
      function literal(node) {
        if(!node || typeof node != 'object' || node.name || node.forIndices) {
          return false;
        }
        if(node.operator) {
          return [node.expression, node.expression2, node.expression3].filter(Boolean).every(literal);
        }
        if(typeof node.value == 'string') {
          return /^(?:"|true$|false$|\d|\.\d)/.test(node.value);
        }
        if(node.value && node.value.positionalArgumentList) {
          return node.value.positionalArgumentList.every(literal);
        }
        if(node.value && node.value.length !== undefined) {
          return Array.from({
            length: node.value.length
          }, (_, index) => node.value[index]).every(item => item.length !== undefined ? Array.from({
            length: item.length
          }, (_, index) => item[index]).every(literal) : literal(item));
        }
        return false;
      }
      return literal(PRDC_OMJSL_EXPRESSIONS.parseValue(String(value === undefined || value === null ? '' : value).trim(), initialization));
    } catch(error) {
      return false;
    }
  }

  /**
   * Translate source AST nodes without evaluating or rewriting quoted contents.
   * @param {*} value Value to inspect or convert.
   * @param {*} initialization Initialization.
   * @param {*} options Host services and operation options.
   */
  static modelicaValueToJSLAB(value, initialization = false, options = {}) {
    value = String(value === undefined || value === null ? '' : value).trim();
    if(!value) {
      return '';
    }
    try {
      var root = PRDC_OMJSL_EXPRESSIONS.parseValue(value, initialization);
      function list(value) {
        return Array.from({
          length: Number(value.length || 0)
        }, (_, index) => value[index]);
      }
      function recordSchema(type) {
        if(options.schema && (type == options.type || type == String(options.type).split('.').pop())) {
          return options.schema;
        }
        return require('./assets').readMetadata('record-schema.json')[type];
      }
      function reference(node, definition) {
        var name = node.identList.join('.');
        if(definition && definition.choices && definition.choices.length) {
          var choice = propertyChoice(Object.assign({}, definition, {
            dimensions: []
          }), name);
          if(choice) {
            return JSON.stringify(choice.replace(/^'|'$/g, ''));
          }
        }
        if(name == 'Modelica.Constants.pi' || name == 'pi') {
          return 'pi';
        }
        if(name.startsWith('Modelica.')) {
          throw new Error('Unresolved library reference.');
        }
        var result = '';
        node.identList.forEach(function(identifier, index) {
          if(!/^[A-Za-z_]\w*$/.test(identifier)) {
            throw new Error('Unsupported identifier.');
          }
          result += (index ? '.' : '') + identifier;
          var subscripts = node.arraySubscriptsList && node.arraySubscriptsList[index];
          if(subscripts) {
            list(subscripts).forEach(function(subscript) {
              var index_value = subscript.value;
              if(index_value == ':' || index_value.value == 'end' || index_value.operator == ':') {
                throw new Error('Array slices need a workspace selection.');
              }
              var expression = render(index_value);
              result += '[' + (/^\d+$/.test(expression) ? Number(expression) - 1 : '(' + expression + ') - 1') + ']';
            });
          }
        });
        return result;
      }
      function arrayNode(node) {
        if(!node || typeof node != 'object') {
          return false;
        }
        if(node.constructor && node.constructor.name == 'PrimaryArray') {
          return true;
        }
        if(node.operator == ':' || node.value && node.value.positionalArgumentList) {
          return true;
        }
        if(node.value && typeof node.value == 'object' && node.value.length !== undefined) {
          return list(node.value).every(row => row && row.length !== undefined) || node.value.length == 1 && arrayNode(node.value[0]);
        }
        if(node.value && node.value.identList && options.references) {
          var name = node.value.identList.join('.');
          var subscripts = node.value.arraySubscriptsList || [];
          return Object.hasOwn(options.references, name) && options.references[name].length > subscripts.reduce((count, indices) => count + Number(indices && indices.length || 0), 0);
        }
        return !!(node.name && /^(?:zeros|ones|fill|transpose|identity|linspace)$/.test(node.name.identList.join('.')));
      }
      function render(node, definition = options) {
        if(!node || typeof node != 'object') {
          throw new Error('Unsupported expression.');
        }
        if(node.operator == 'if' || node.operator == 'elseif') {
          return '(' + render(node.expression, {}) + ' ? ' + render(node.expression2, definition) + ' : ' + render(node.expression3, definition) + ')';
        }
        if(node.operator == 'else') {
          return render(node.expression, definition);
        }
        if(node.operator == ':') {
          return 'range(' + render(node.expression, {}) + ', ' + render(node.expression3 || node.expression2, {}) + (node.expression3 ? ', ' + render(node.expression2, {}) : '') + ')';
        }
        if(node.operator) {
          var left_array = arrayNode(node.expression),
            right_array = arrayNode(node.expression2);
          var array_result = left_array || right_array || definition.dimensions && definition.dimensions.length;
          if(array_result && ['+', '-', '.+', '.-'].includes(node.operator)) {
            if(!node.expression2) {
              return node.operator == '+' ? render(node.expression, definition) : 'scale(' + render(node.expression, definition) + ', -1)';
            }
            return (node.operator.endsWith('+') ? 'plus' : 'minus') + '(' + render(node.expression, {}) + ', ' + render(node.expression2, {}) + ')';
          }
          if(array_result && ['*', '/', '^'].includes(node.operator)) {
            throw new Error('Array algebra needs a workspace expression.');
          }
          if(['.*', './', '.^'].includes(node.operator)) {
            return {
              '.*': 'dotMultiply',
              './': 'dotDivide',
              '.^': 'dotPow'
            }[node.operator] + '(' + render(node.expression, {}) + ', ' + render(node.expression2, {}) + ')';
          }
          var operators = {
            and: '&&',
            or: '||',
            not: '!',
            '<>': '!==',
            '==': '===',
            '^': '**',
            '+': '+',
            '-': '-',
            '*': '*',
            '/': '/',
            '<': '<',
            '>': '>',
            '<=': '<=',
            '>=': '>='
          };
          var operator = operators[node.operator];
          if(!operator) {
            throw new Error('Unsupported operator.');
          }
          if(!node.expression2) {
            return '(' + operator + render(node.expression, definition) + ')';
          }
          return '(' + render(node.expression, definition) + ' ' + operator + ' ' + render(node.expression2, definition) + ')';
        }
        if(node.name && node.functionCallArgs) {
          var name = node.name.identList.join('.'),
            args = node.functionCallArgs;
          if(args.forIndices) {
            throw new Error('Array comprehensions need a workspace expression.');
          }
          var schema = recordSchema(name);
          var record = !!schema || name == definition.type || name == String(definition.type).split('.').pop();
          if(record && !args.positionalArgumentList) {
            return '{' + (args.namedArgumentList || []).map(function(argument) {
              var field = schema && schema.properties.find(property => property.name == argument.ident);
              return JSON.stringify(argument.ident) + ': ' + render(argument.functionArgument, field || {});
            }).join(', ') + '}';
          }
          if(args.namedArgumentList && args.namedArgumentList.length) {
            throw new Error('Named function arguments need a workspace expression.');
          }
          var arguments_js = (args.positionalArgumentList || []).map(argument => render(argument, {}));
          if(name == 'fill' && arguments_js.length >= 2) {
            return 'createFilledArray(' + arguments_js.slice(1).concat(arguments_js[0]).join(', ') + ')';
          }
          if(/^(?:(?:Modelica\.)?SIunits\.Conversions\.|Modelica\.Units\.Conversions\.)?(?:from_deg|deg2rad)$/.test(name)) {
            if(arguments_js.length != 1) {
              throw new Error('Invalid angle conversion.');
            }
            if(arrayNode(args.positionalArgumentList[0])) {
              throw new Error('Array angle conversion needs a workspace expression.');
            }
            return '((' + arguments_js[0] + ') * pi / 180)';
          }
          if(/^(?:Modelica\.Math\.)/.test(name)) {
            name = name.slice('Modelica.Math.'.length);
          }
          if(!/^[A-Za-z_]\w*$/.test(name)) {
            throw new Error('Unresolved library function.');
          }
          return name + '(' + arguments_js.join(', ') + ')';
        }
        var source = node.value;
        if(node.constructor && node.constructor.name == 'PrimaryArray' && !source) {
          return '[]';
        }
        if(typeof source == 'string') {
          if(source.startsWith('"')) {
            return JSON.stringify(PRDC_OMJSL_EXPRESSIONS.stringValue(source));
          }
          if(/^(?:true|false|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/.test(source)) {
            return source.replace(/^0+(?=\d)/, '');
          }
          throw new Error('Unsupported literal.');
        }
        if(source && source.identList) {
          return reference(source, definition);
        }
        if(source && source.positionalArgumentList) {
          return '[' + source.positionalArgumentList.map(argument => render(argument, Object.assign({}, definition, {
            dimensions: (definition.dimensions || []).slice(1)
          }))).join(', ') + ']';
        }
        if(source && source.forIndices) {
          throw new Error('Array comprehensions need a workspace expression.');
        }
        if(source && source.length !== undefined) {
          var values = list(source);
          var matrix = values.every(row => row && row.length !== undefined && !row.value);
          if(matrix) {
            return '[' + values.map(row => '[' + list(row).map(item => render(item, Object.assign({}, definition, {
              dimensions: (definition.dimensions || []).slice(2)
            }))).join(', ') + ']').join(', ') + ']';
          }
          if(values.length == 1) {
            return '(' + render(values[0], definition) + ')';
          }
        }
        throw new Error('Unsupported source expression.');
      }
      return render(root);
    } catch(error) {
      return '';
    }
  }

  /**
   * Normalize legacy angle calls in saved JavaScript without changing strings or comments.
   * @param {*} source Original compiler source text.
   */
  static normalizeWorkspaceExpression(source) {
    source = String(source || '');
    function skip(index) {
      var quote = source[index];
      if(['"', "'", '`'].includes(quote)) {
        for(index++; index < source.length; index++) {
          if(source[index] == '\\') {
            index++;
          } else if(source[index] == quote) {
            return index + 1;
          }
        }
        return source.length;
      }
      if(source.slice(index, index + 2) == '//') {
        var end = source.indexOf('\n', index + 2);
        return end < 0 ? source.length : end;
      }
      if(source.slice(index, index + 2) == '/*') {
        var end = source.indexOf('*/', index + 2);
        return end < 0 ? source.length : end + 2;
      }
      if(source[index] == '/') {
        var prefix = source.slice(0, index).trimEnd();
        if(!prefix || /[([{:,;=!?&|+*%~<>-]$/.test(prefix) || /\b(?:return|case|yield|await|typeof|void|delete|in|instanceof)$/.test(prefix)) {
          var bracket = false;
          for(var cursor = index + 1; cursor < source.length && source[cursor] != '\n'; cursor++) {
            if(source[cursor] == '\\') {
              cursor++;
            } else if(source[cursor] == '[') {
              bracket = true;
            } else if(source[cursor] == ']') {
              bracket = false;
            } else if(source[cursor] == '/' && !bracket) {
              while(/[a-z]/i.test(source[cursor + 1] || '') && cursor + 1 < source.length) {
                cursor++;
              }
              return cursor + 1;
            }
          }
        }
      }
      return index;
    }
    var output = '',
      start = 0;
    for(var index = 0; index < source.length;) {
      var skipped = skip(index);
      if(skipped != index) {
        index = skipped;
        continue;
      }
      var match = /^(?:from_deg|deg2rad)\s*\(/.exec(source.slice(index));
      if(!match || index && /[\w$.]/.test(source[index - 1])) {
        index++;
        continue;
      }
      var open = index + match[0].lastIndexOf('('),
        depth = 1,
        cursor = open + 1,
        comma = false;
      for(; cursor < source.length; cursor++) {
        var next = skip(cursor);
        if(next != cursor) {
          cursor = next - 1;
          continue;
        }
        if(source[cursor] == '(') {
          depth++;
        } else if(source[cursor] == ')' && ! --depth) {
          break;
        } else if(source[cursor] == ',' && depth == 1) {
          comma = true;
        }
      }
      if(depth || comma) {
        index = open + 1;
        continue;
      }
      output += source.slice(start, index) + '((' + PRDC_OMJSL_EXPRESSIONS.normalizeWorkspaceExpression(source.slice(open + 1, cursor)) + ') * pi / 180)';
      index = start = cursor + 1;
    }
    return output + source.slice(start);
  }

}
exports.modelicaValueToJSLAB = PRDC_OMJSL_EXPRESSIONS.modelicaValueToJSLAB;
exports.normalizeWorkspaceExpression = PRDC_OMJSL_EXPRESSIONS.normalizeWorkspaceExpression;
exports.isLiteralModelicaValue = PRDC_OMJSL_EXPRESSIONS.isLiteralModelicaValue;
exports.modelicaStringValue = PRDC_OMJSL_EXPRESSIONS.stringValue;
