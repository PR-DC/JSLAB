/**
 * @file Structured source modifiers for scalar and record-valued settings
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  _sourceTokens,
  isModelicaIdentifier
} = require('./editing');
/**
 * Class for editing nested component field modifiers.
 */
class PRDC_OMJSL_MODIFIERS {

  /**
   * Splits modifier arguments without separating nested records or quoted text.
   * @param {*} source Original compiler source text.
   */
  static argumentParts(source) {
    var tokens = _sourceTokens(source);
    var parts = [],
      start = 0,
      depth = 0;
    for(const token of tokens) {
      if(token.kind == ',' && !depth) {
        parts.push(source.slice(start, token.offset));
        start = token.offset + 1;
      }
      if(['(', '[', '{'].includes(token.kind)) {
        depth++;
      }
      if([')', ']', '}'].includes(token.kind)) {
        depth--;
      }
    }
    if(source.slice(start).trim()) {
      parts.push(source.slice(start));
    }
    return parts;
  }

  /**
   * Reads modifier names, qualifiers and value ranges from a parsed argument.
   * @param {*} source Original compiler source text.
   */
  static argumentInfo(source) {
    var tokens = _sourceTokens(source),
      depth = 0,
      open = -1,
      close = -1,
      equal = -1;
    var names = [];
    for(const token of tokens) {
      if(!depth && token.kind == '=') {
        equal = token.offset;
        break;
      }
      if(!depth && token.kind == '(') {
        open = token.offset;
      }
      if(open < 0 && (token.kind == 'IDENT' || token.kind == '.')) {
        names.push(token.text);
      }
      if(['(', '[', '{'].includes(token.kind)) {
        depth++;
      }
      if([')', ']', '}'].includes(token.kind)) {
        depth--;
        if(!depth && open >= 0) {
          close = token.offset;
        }
      }
    }
    return {
      name: names.join(''),
      open: open,
      close: close,
      equal: equal,
      tokens: tokens
    };
  }

  /**
   * Read instance modifiers after array dimensions, keeping compiler prefixes separate.
   * @param {*} source Original compiler source text.
   * @param {*} name Catalog, class or resource name.
   */
  static componentModifiers(source, name) {
    var tokens = _sourceTokens(source),
      depth = 0,
      instance = null,
      open = null,
      close = null;
    for(const token of tokens) {
      if(!depth && ['ANNOTATION', '=', ';'].includes(token.kind)) {
        break;
      }
      if(!depth && token.kind == '(') {
        if(instance) {
          open = token;
        }
        break;
      }
      if(!depth && token.kind == 'IDENT' && token.text == name) {
        instance = token;
      }
      if(['[', '{', '('].includes(token.kind)) {
        depth++;
      }
      if([']', '}', ')'].includes(token.kind)) {
        depth--;
      }
    }
    if(!open) {
      return {
        modifiers: [],
        start: -1,
        end: -1
      };
    }
    depth = 0;
    for(const token of tokens.filter(token => token.offset >= open.offset)) {
      if(token.kind == '(') {
        depth++;
      }
      if(token.kind == ')' && ! --depth) {
        close = token;
        break;
      }
    }
    if(!close) {
      return {
        modifiers: [],
        start: -1,
        end: -1
      };
    }
    var start = open.offset + 1,
      modifiers = [],
      offset = start;
    for(const part of PRDC_OMJSL_MODIFIERS.argumentParts(source.slice(start, close.offset))) {
      var leading = part.search(/\S/),
        item = part.trim(),
        info = PRDC_OMJSL_MODIFIERS.argumentInfo(item);
      var item_start = offset + Math.max(0, leading);
      offset += part.length + 1;
      if(!info.name || info.equal < 0 && info.open < 0) {
        continue;
      }
      var value_start = info.equal >= 0 ? info.equal + 1 : info.open;
      value_start += item.slice(value_start).search(/\S/) < 0 ? 0 : item.slice(value_start).search(/\S/);
      modifiers.push({
        name: info.name,
        value: item.slice(value_start),
        assignment: info.equal >= 0,
        each: info.tokens.some(token => token.kind == 'EACH' && token.offset < (info.open >= 0 ? info.open : value_start)),
        final: info.tokens.some(token => token.kind == 'FINAL' && token.offset < (info.open >= 0 ? info.open : value_start)),
        source_start: item_start,
        source_end: item_start + item.length,
        value_start: item_start + value_start,
        value_end: item_start + item.length
      });
    }
    return {
      modifiers: modifiers,
      start: start,
      end: close.offset
    };
  }

  /**
   * Apply one field edit while retaining unrelated fields and initialization attributes.
   * @param {*} source Original compiler source text.
   * @param {*} path Path.
   * @param {*} change Change.
   */
  static updateArguments(source, path, change) {
    var parts = PRDC_OMJSL_MODIFIERS.argumentParts(source);
    var exact = parts.findIndex(part => PRDC_OMJSL_MODIFIERS.argumentInfo(part).name == path.join('.'));
    if(exact >= 0) {
      if(change.remove) {
        parts.splice(exact, 1);
      } else {
        var part = parts[exact],
          info = PRDC_OMJSL_MODIFIERS.argumentInfo(part);
        if(change.nested && info.open >= 0) {
          var children = part.slice(info.open + 1, info.close);
          for(const child of PRDC_OMJSL_MODIFIERS.argumentParts(change.value.slice(1, -1))) {
            var childInfo = PRDC_OMJSL_MODIFIERS.argumentInfo(child);
            children = PRDC_OMJSL_MODIFIERS.updateArguments(children, childInfo.name.split('.'), {
              value: childInfo.equal >= 0 ? child.slice(childInfo.equal + 1).trim() : child.slice(childInfo.open).trim(),
              nested: childInfo.equal < 0
            });
          }
          parts[exact] = part.slice(0, info.open + 1) + children + part.slice(info.close);
        } else if(change.nested) {
          parts[exact] = part.slice(0, info.equal >= 0 ? info.equal : part.length).trimEnd() + change.value;
        } else if(info.equal >= 0) {
          var last = info.tokens[info.tokens.length - 1];
          parts[exact] = part.slice(0, info.equal + 1) + ' ' + change.value + part.slice(last.offset + last.text.length);
        } else {
          parts[exact] = part + ' = ' + change.value;
        }
      }
      return parts.join(',');
    }
    if(path.length > 1) {
      var parent = parts.findIndex(part => PRDC_OMJSL_MODIFIERS.argumentInfo(part).name == path[0]);
      if(parent >= 0) {
        var part = parts[parent],
          info = PRDC_OMJSL_MODIFIERS.argumentInfo(part);
        if(info.open < 0 || info.close < 0) {
          if(change.remove) {
            return source;
          }
          throw new Error('A field cannot override a record expression. Reset the record value first.');
        }
        var updated = PRDC_OMJSL_MODIFIERS.updateArguments(part.slice(info.open + 1, info.close), path.slice(1), change);
        if(!updated.trim() && info.equal >= 0) {
          parts[parent] = part.slice(0, info.open) + part.slice(info.close + 1);
        } else if(!updated.trim()) {
          parts.splice(parent, 1);
        } else {
          parts[parent] = part.slice(0, info.open + 1) + updated + part.slice(info.close);
        }
      } else if(!change.remove) {
        parts.push(path[0] + '(' + PRDC_OMJSL_MODIFIERS.updateArguments('', path.slice(1), change) + ')');
      }
    } else if(!change.remove) {
      parts.push(path[0] + (change.nested ? change.value : ' = ' + change.value));
    }
    return parts.join(',');
  }

  /**
   * Return source patches for a component's complete modifier list.
   * @param {*} component Component declaration and property bindings.
   * @param {*} changes Changes.
   */
  static componentModifierPatches(component, changes) {
    if(!changes.length) {
      return [];
    }
    var declaration = component.declaration;
    var start = component.modifier_start,
      end = component.modifier_end;
    var existing = start >= 0 ? declaration.slice(start, end) : '';
    var updated = existing;
    for(const change of changes) {
      var path = change.name.split('.');
      if(!path.every(isModelicaIdentifier)) {
        throw new Error('Invalid property name.');
      }
      updated = PRDC_OMJSL_MODIFIERS.updateArguments(updated, path, change);
    }
    if(start >= 0) {
      return [{
        start: component.source_start + start,
        end: component.source_start + end,
        value: updated
      }];
    }
    if(!updated.trim()) {
      return [];
    }
    var instance_start = Number.isInteger(component.instance_start) ? component.instance_start - component.source_start : 0;
    var instance_end = Number.isInteger(component.instance_end) ? component.instance_end - component.source_start : declaration.length;
    var tokens = _sourceTokens(declaration.slice(instance_start, instance_end)),
      name = null,
      depth = 0,
      position = -1;
    for(const token of tokens) {
      if(!depth && ['(', '=', 'ANNOTATION', ';'].includes(token.kind)) {
        break;
      }
      if(!depth && token.kind == 'IDENT' && token.text == component.name) {
        name = token;
        position = instance_start + token.offset + token.text.length;
      }
      if(token.kind == '[') {
        depth++;
      }
      if(token.kind == ']') {
        depth--;
        if(!depth && name) {
          position = instance_start + token.offset + 1;
        }
      }
    }
    if(!name || position < 0) {
      throw new Error('Component declaration was not found.');
    }
    return [{
      start: component.source_start + position,
      end: component.source_start + position,
      value: '(' + updated + ')'
    }];
  }

  /**
   * Read an existing nested field value without evaluating source code.
   * @param {*} component Component declaration and property bindings.
   * @param {*} path Path.
   */
  static componentFieldModifier(component, path) {
    var source = component.modifier_start >= 0 ? component.declaration.slice(component.modifier_start, component.modifier_end) : '';
    var names = String(path).split('.');
    var final = false;
    while(names.length) {
      var parts = PRDC_OMJSL_MODIFIERS.argumentParts(source);
      var exact = parts.find(part => PRDC_OMJSL_MODIFIERS.argumentInfo(part).name == names.join('.'));
      if(exact !== undefined) {
        var info = PRDC_OMJSL_MODIFIERS.argumentInfo(exact);
        var result = {
          value: info.equal >= 0 ? exact.slice(info.equal + 1).trim() : exact.slice(info.open).trim(),
          assignment: info.equal >= 0
        };
        if(final || info.tokens.some(token => token.kind == 'FINAL' && token.offset < (info.open >= 0 ? info.open : info.equal))) {
          result.final = true;
        }
        return result;
      }
      var parent = parts.find(part => PRDC_OMJSL_MODIFIERS.argumentInfo(part).name == names[0]);
      if(parent === undefined) {
        return null;
      }
      var info = PRDC_OMJSL_MODIFIERS.argumentInfo(parent);
      if(info.open < 0) {
        return null;
      }
      if(info.tokens.some(token => token.kind == 'FINAL' && token.offset < info.open)) {
        final = true;
      }
      source = parent.slice(info.open + 1, info.close);
      names.shift();
    }
    return null;
  }

}
exports.componentModifierPatches = PRDC_OMJSL_MODIFIERS.componentModifierPatches;
exports.componentFieldModifier = PRDC_OMJSL_MODIFIERS.componentFieldModifier;
exports.componentModifiers = PRDC_OMJSL_MODIFIERS.componentModifiers;
