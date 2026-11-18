/**
 * @file Typed property choices and workspace-expression conversion
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

/**
 * Class for converting typed property selections and literal values.
 */
class PRDC_OMJSL_CHOICES {

  /**
   * Scalar choices never replace an array-valued expression editor.
   * @param {*} property Component property definition.
   */
  static propertyChoices(property) {
    if(property.dimensions && property.dimensions.length) {
      return [];
    }
    return property.type == 'Boolean' ? ['false', 'true'] : Array.isArray(property.choices) ? property.choices : [];
  }

  /**
   * Match a literal without exposing its compiler namespace in the editor.
   * @param {*} property Component property definition.
   * @param {*} value Value to inspect or convert.
   */
  static propertyChoice(property, value) {
    value = (value === undefined || value === null ? '' : String(value)).replace(/^\./, '').trim();
    var choices = PRDC_OMJSL_CHOICES.propertyChoices(property);
    if(choices.includes(value)) {
      return value;
    }
    if(choices.includes("'" + value + "'")) {
      return "'" + value + "'";
    }
    var short_name = value.slice(value.lastIndexOf('.') + 1);
    return choices.includes(short_name) ? short_name : '';
  }

  /**
   * Validate selections before generating a compiler literal.
   * @param {*} property Component property definition.
   * @param {*} choice Choice.
   */
  static choiceModelicaValue(property, choice) {
    if(!PRDC_OMJSL_CHOICES.propertyChoices(property).includes(choice)) {
      throw new Error('Invalid property choice.');
    }
    if(property.type == 'Boolean') {
      return choice;
    }
    var type = String(property.type || '').replace(/^\./, '');
    if(!/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(type) || !/^(?:[A-Za-z_]\w*|'(?:[^'\\]|\\.)*')$/.test(choice)) {
      throw new Error('Invalid property choice.');
    }
    return type + '.' + choice;
  }

  /**
   * Convert a resolved string, Boolean or enumeration ordinal to its declared type.
   * @param {*} property Component property definition.
   * @param {*} literal Literal.
   */
  static resolvedChoiceValue(property, literal) {
    var value;
    var quoted = false,
      escaped = false;
    var json = Array.from(String(literal)).map(function(character) {
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
      } else if(character == '{') {
        return '[';
      } else if(character == '}') {
        return ']';
      }
      return character;
    }).join('');
    try {
      value = JSON.parse(json);
    } catch(error) {
      value = literal;
    }
    var scalar = Object.assign({}, property, {
      dimensions: []
    });
    if(Array.isArray(value)) {
      return '{' + value.map(function(item) {
        return PRDC_OMJSL_CHOICES.resolvedChoiceValue(scalar, JSON.stringify(item));
      }).join(', ') + '}';
    }
    var choices = PRDC_OMJSL_CHOICES.propertyChoices(scalar);
    if(property.type != 'Boolean' && typeof value == 'number' && Number.isInteger(value)) {
      value = choices[value - 1];
    }
    var choice = PRDC_OMJSL_CHOICES.propertyChoice(scalar, value);
    return PRDC_OMJSL_CHOICES.choiceModelicaValue(scalar, choice);
  }

}
exports.propertyChoices = PRDC_OMJSL_CHOICES.propertyChoices;
exports.propertyChoice = PRDC_OMJSL_CHOICES.propertyChoice;
exports.choiceModelicaValue = PRDC_OMJSL_CHOICES.choiceModelicaValue;
exports.resolvedChoiceValue = PRDC_OMJSL_CHOICES.resolvedChoiceValue;
