/**
 * @file Source edits for the visual model editor
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  parser,
  sourceNodeRange
} = require('./parser');
/**
 * Class for source edits that retain compiler declarations and bindings.
 */
class PRDC_OMJSL_EDITING {

  /**
   * Finds source token ranges while retaining comments and quoted identifiers.
   * @param {*} source Original compiler source text.
   */
  static sourceTokens(source) {
    var starts = [0];
    var newline = /\r\n|\r|\n/g;
    var match;
    while(match = newline.exec(source)) {
      starts.push(match.index + match[0].length);
    }
    var lexer = Object.create(parser.lexer);
    lexer.setInput(source);
    var tokens = [];
    for(;;) {
      var symbol = lexer.lex();
      var kind = parser.terminals_[symbol] || symbol;
      if(kind == 'EOF' || symbol === 1) {
        return tokens;
      }
      tokens.push({
        kind: kind,
        text: lexer.yytext,
        offset: starts[lexer.yylloc.first_line - 1] + lexer.yylloc.first_column
      });
    }
  }

  /**
   * Find the declaration section using tokens so comments and nested classes remain intact.
   * @param {*} source Original compiler source text.
   * @param {*} modelName ModelName.
   */
  static declarationInsertion(source, modelName) {
    var tokens = PRDC_OMJSL_EDITING.sourceTokens(source);
    var classKinds = new Set(['MODEL', 'BLOCK', 'CLASS', 'PACKAGE', 'FUNCTION', 'RECORD', 'CONNECTOR', 'TYPE']);
    var root = tokens.findIndex(function(token, index) {
      return classKinds.has(token.kind) && tokens[index + 1] && tokens[index + 1].text == modelName;
    });
    if(root < 0) {
      return -1;
    }
    var level = 1;
    var grouping = 0;
    var elementStart = true;
    var header = true;
    for(var index = root + 2; index < tokens.length; index++) {
      var token = tokens[index];
      if(header && (token.kind == 'STRING' || token.kind == '+')) {
        continue;
      }
      header = false;
      if(!grouping && level == 1) {
        if(['EQUATION', 'ALGORITHM', 'INITIAL_EQUATION', 'INITIAL_ALGORITHM', 'END_IDENT'].includes(token.kind) || token.kind == 'INITIAL' && tokens[index + 1] && ['EQUATION', 'ALGORITHM'].includes(tokens[index + 1].kind) || token.kind == 'ANNOTATION' && elementStart) {
          return token.offset;
        }
      }
      if(!grouping && classKinds.has(token.kind)) {
        var shortClass = tokens[index + 2] && tokens[index + 2].kind == '=';
        if(!shortClass) {
          level++;
        }
      } else if(!grouping && token.kind == 'END_IDENT') {
        level--;
      }
      if(['(', '[', '{'].includes(token.kind)) {
        grouping++;
      }
      if([')', ']', '}'].includes(token.kind)) {
        grouping--;
      }
      if(level == 1 && !grouping) {
        elementStart = token.kind == ';';
      }
    }
    return -1;
  }

  /**
   * Use the parser's keyword rules when generating an instance name.
   * @param {*} name Catalog, class or resource name.
   */
  static isModelicaIdentifier(name) {
    if(!/^[A-Za-z_]\w*$/.test(name)) {
      return false;
    }
    var tokens = PRDC_OMJSL_EDITING.sourceTokens(name);
    return tokens.length == 1 && tokens[0].kind == 'IDENT';
  }

  /**
   * Chooses an unused component identifier for a newly inserted block.
   * @param {*} type Declared compiler type.
   * @param {*} occupied Occupied.
   */
  static componentName(type, occupied) {
    var base = type.split('.').pop();
    base = base.charAt(0).toLowerCase() + base.slice(1);
    var name = base;
    var index = 1;
    var names = new Set(occupied);
    for(;;) {
      if(!names.has(name) && PRDC_OMJSL_EDITING.isModelicaIdentifier(name)) {
        return name;
      }
      name = base + index++;
    }
  }

  /**
   * Insert an instance before root equations, algorithms or class annotations.
   * @param {*} source Original compiler source text.
   * @param {*} model Model.
   * @param {*} type Declared compiler type.
   * @param {*} origin Origin.
   */
  static insertModelComponent(source, model, type, origin = [0, 0]) {
    if(!model || !/^\.?[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(type)) {
      return null;
    }
    var insertion = PRDC_OMJSL_EDITING.declarationInsertion(source, model.name);
    if(insertion < 0) {
      return null;
    }
    var occupied = (model.components || []).concat(model.parameters || []).map(function(item) {
      return item.name;
    });
    var name = PRDC_OMJSL_EDITING.componentName(type, occupied);
    var prefix = type.replace(/^\./, '') == 'Modelica.Mechanics.MultiBody.World' ? 'inner ' : '';
    var position = origin.map(value => Math.round(Number(value)));
    if(position.length != 2 || position.some(value => !Number.isFinite(value))) {
      return null;
    }
    var declaration = '  ' + prefix + type + ' ' + name + ' annotation(Placement(transformation(origin={' + position.join(',') + '},extent={{-10,-10},{10,10}})));\n';
    if(insertion && source[insertion - 1] != '\n') {
      declaration = '\n' + declaration;
    }
    return {
      name: name,
      source: source.slice(0, insertion) + declaration + source.slice(insertion)
    };
  }

  /**
   * Replace or add a parameter binding without treating string values as comments.
   * @param {*} parameter Parameter.
   * @param {*} value Value to inspect or convert.
   */
  static parameterValuePatches(parameter, value) {
    if(Number.isInteger(parameter.value_start) && Number.isInteger(parameter.value_end)) {
      return [{
        start: parameter.value_start,
        end: parameter.value_end,
        value: value
      }];
    }
    var prefix = 'model JSLABBinding\n';
    var source = prefix + parameter.declaration + '\nend JSLABBinding;';
    var model = parser.parse(source).classDefinitionList[0];
    var declaration;
    for(const clause of model.componentClauseList || []) {
      for(var index = 0; index < Number(clause.componentList && clause.componentList.length || 0); index++) {
        if(clause.componentList[index].ident == parameter.name) {
          declaration = clause.componentList[index];
        }
      }
    }
    if(!declaration) {
      throw new Error('The parameter declaration was not found.');
    }
    var range = sourceNodeRange(declaration.modification && declaration.modification.expression, source);
    var offset = (Number.isInteger(parameter.declaration_start) ? parameter.declaration_start : parameter.source_start) - prefix.length;
    if(range) {
      return [{
        start: offset + range.start,
        end: offset + range.end,
        value: value
      }];
    }
    var comment = sourceNodeRange(declaration.stringComment, source);
    var annotation = sourceNodeRange(declaration.annotation, source);
    var end = sourceNodeRange(declaration, source).end;
    var insertion = Math.min(end, comment ? comment.start : end, annotation ? annotation.start : end);
    return [{
      start: offset + insertion,
      end: offset + insertion,
      value: ' = ' + value + ' '
    }];
  }

}
exports.insertModelComponent = PRDC_OMJSL_EDITING.insertModelComponent;
exports.isModelicaIdentifier = PRDC_OMJSL_EDITING.isModelicaIdentifier;
exports._sourceTokens = PRDC_OMJSL_EDITING.sourceTokens;
exports.parameterValuePatches = PRDC_OMJSL_EDITING.parameterValuePatches;
