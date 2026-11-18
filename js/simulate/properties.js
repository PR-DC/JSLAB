/**
 * @file Simulate component property editing
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_DOM } = require('../other-shared/dom');

const { PRDC_JSLAB_SIMULATE_COMPILER } = require('./compiler');
const {
  isModelicaIdentifier,
  componentModifierPatches,
  componentFieldModifier,
  translatedPropertyDescription,
  isBundledLibraryType,
  unitOptions,
  convertUnitExpression,
  propertyChoices,
  propertyChoice,
  choiceModelicaValue,
  workspaceValueExpression,
  modelicaValueToJSLAB: compilerValueToWorkspace,
  readMetadata
} = PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
const choice_labels = readMetadata('choice-labels.json');

/**
 * Implements component property editing against the owning Simulate window state.
 */
class PRDC_JSLAB_SIMULATE_PROPERTIES {

  /**
   * Connects controls for component property editing.
   */
  _bindPropertiesEvents() {

    var obj = this;
    document.getElementById('simulate-simulation-settings').addEventListener('click', obj.showSimulationSettings.bind(obj));

    document.getElementById('simulate-component-close').addEventListener('click', obj.hideComponentProperties.bind(obj));

    document.getElementById('simulate-component-cancel').addEventListener('click', obj.hideComponentProperties.bind(obj));

    document.getElementById('simulate-component-apply').addEventListener('click', obj.applyComponentProperties.bind(obj));

    document.getElementById('simulate-component-dialog').addEventListener('click', function(event) {
      if(event.target === this) {
        obj.hideComponentProperties();
      }
    });

    document.getElementById('simulate-properties-basic').addEventListener('click', function() {
      obj.property_advanced = false;
      this.classList.add('active');
      document.getElementById('simulate-properties-advanced').classList.remove('active');
      obj.renderComponentProperties();
    });

    document.getElementById('simulate-properties-advanced').addEventListener('click', function() {
      obj.property_advanced = true;
      this.classList.add('active');
      document.getElementById('simulate-properties-basic').classList.remove('active');
      obj.renderComponentProperties();
    });

    document.getElementById('simulate-property-search').addEventListener('input', obj.renderComponentProperties.bind(obj));

    document.getElementById('simulate-simulation-close').addEventListener('click', obj.hideSimulationSettings.bind(obj));

    document.getElementById('simulate-simulation-done').addEventListener('click', obj.hideSimulationSettings.bind(obj));

    document.getElementById('simulate-simulation-dialog').addEventListener('click', function(event) {
      if(event.target === this) {
        obj.hideSimulationSettings();
      }
    });
  }

  /**
   * Translate property help by its source meaning rather than ambiguous field names.
   */
  propertyLabel(property) {
    return translatedPropertyDescription(property, language.lang);
  }

  /**
   * Keep imported enumeration labels in their original language.
   */
  propertyChoiceLabel(property, choice) {
    var obj = this;
    var type = String(property.type || '').replace(/^\./, '');
    var id = (type == 'Boolean' || type == 'StateSelect' || obj.property_component &&
      isBundledLibraryType(obj.property_component.type) && isBundledLibraryType(type)) &&
      choice_labels[type + '.' + choice];
    return id ? obj.simulateString(id) : choice;
  }

  /**
   * Builds an unambiguous key for a block property binding.
   */
  componentBindingKey(component, property) {
    return component + '\u0000' + property;
  }

  /**
   * Restores stored block property expressions into the binding map.
   */
  loadComponentBindings(source) {
    var obj = this;
    var match = /^\s*\/\/ JSLAB component bindings: ([A-Za-z0-9+/=]+)\s*$/m.exec(String(source || ''));
    if(!match) {
      return;
    }
    try {
      var saved = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
      obj.component_bindings = new Map(Array.isArray(saved) ? saved : []);
    } catch(_error) {}
  }

  /**
   * Collects explicit block property expressions for project persistence.
   */
  storeComponentBindings(source) {
    var obj = this;
    source = String(source || '').replace(/^\s*\/\/ JSLAB component bindings: [A-Za-z0-9+/=]+\s*\r?\n?/m, '');
    if(!obj.component_bindings.size) {
      return source;
    }
    var encoded = Buffer.from(JSON.stringify(Array.from(obj.component_bindings)), 'utf8').toString('base64');
    var end = /(^\s*end\s+[A-Za-z_]\w*\s*;)/m.exec(source);
    if(!end) {
      return source;
    }
    return source.slice(0, end.index) + '  // JSLAB component bindings: ' + encoded + '\n' + source.slice(end.index);
  }

  /**
   * Closes the block properties dialog and clears its draft.
   */
  hideComponentProperties() {
    var obj = this;
    document.getElementById('simulate-component-dialog').hidden = true;
    obj.property_component = null;
    obj.property_schema = null;
    obj.property_draft = [];
  }

  /**
   * Converts a compiler value to the expression displayed in a property control.
   */
  modelicaValueToJSLAB(value, initialization, property) {
    var obj = this;
    return compilerValueToWorkspace(value, initialization, property ? {
      type: property.type, dimensions: property.dimensions, choices: property.choices, schema: property.record_schema || property.value_schema,
      references: Object.fromEntries((obj.model && obj.model.parameters || []).map(parameter => [parameter.name, parameter.dimensions || []]))
    } : {});
  }

  /**
   * Converts a resolved workspace value to an editable expression.
   */
  valueToJSLABExpression(value) {
    return workspaceValueExpression(value);
  }

  /**
   * Renders filtered block properties, choices, units and record fields.
   */
  renderComponentProperties() {
    var obj = this;
    var container = document.getElementById('simulate-component-properties');
    container.replaceChildren();
    if(!obj.property_schema) {
      var loading = document.createElement('div');
      loading.className = 'simulate-property-loading';
      loading.textContent = language.currentString("omjsl-8463");
      container.appendChild(loading);
      return;
    }
    var head = document.createElement('div');
    head.className = 'simulate-property-head';
    PRDC_JSLAB_DOM.appendLabels(head, ["omjsl-8456", "omjsl-8473", "omjsl-8459"], language);
    head.appendChild(document.createElement('span'));
    container.appendChild(head);
    var query = document.getElementById('simulate-property-search').value.trim().toLowerCase();
    var visible = obj.property_draft.filter(function(property, index) {
      var translated = obj.property_component && isBundledLibraryType(obj.property_component.type) ? obj.propertyLabel(property) : '';
      if(query) {
        return (property.name + ' ' + property.type + ' ' + property.description + ' ' + translated).toLowerCase().includes(query);
      }
      var root = property;
      while(root.record_parent) {
        root = root.record_parent;
      }
      var basic = root.tab == 'General' || (!root.tab && root.root_index < 12);
      if(!obj.property_advanced && !basic && !root.overridden && !root.binding) {
        return false;
      }
      if(property.record_parent) {
        var parent = property.record_parent;
        while(parent) {
          if(!parent.fields_open) {
            return false;
          }
          parent = parent.record_parent;
        }
        return obj.property_advanced || !property.final;
      }
      return true;
    });
    if(!visible.length) {
      var empty = document.createElement('div');
      empty.className = 'simulate-property-empty';
      empty.textContent = language.currentString("omjsl-8465");
      container.appendChild(empty);
      return;
    }
    visible.forEach(function(property) {
      var row = document.createElement('div');
      row.className = 'simulate-property-row';
      row.dataset.property = property.name;
      if(property.record_parent) {
        row.classList.add('simulate-record-field');
      }
      var name = document.createElement('div');
      name.className = 'simulate-property-name';
      var strong = document.createElement('strong');
      strong.textContent = property.record_parent && !query ? property.display_name : property.name;
      if(property.record_parent) {
        name.style.paddingLeft = (property.record_depth * 12) + 'px';
      }
      var description = document.createElement('span');
      description.textContent = language.lang == 'en' || !obj.property_component || !isBundledLibraryType(obj.property_component.type) ? property.description || '' :
        obj.propertyLabel(property) || property.description || '';
      description.title = description.textContent;
      name.append(strong, description);
      var type = document.createElement('div');
      type.className = 'simulate-property-type';
      type.textContent = obj.simulateTypeLabel(property.type, obj.property_component && isBundledLibraryType(obj.property_component.type)) + (property.dimensions && property.dimensions.length ?
        '[' + property.dimensions.join(', ') + ']' : '');
      type.title = type.textContent;
      var units = unitOptions(property.type, property);
      if(units.length && property.display_unit === undefined) {
        var preferred = units.find(function(item) {
          return item.symbol == property.preferred_unit;
        }) || units[0];
        property.display_unit = preferred.symbol;
        if(property.display_expression === undefined && property.expression) {
          property.display_expression = convertUnitExpression(property.expression, units[0], preferred, property.dimensions);
        }
      }
      var value = document.createElement('input');
      value.value = property.display_expression === undefined ? property.expression : property.display_expression;
      value.className = 'jslab-binding';
      value.placeholder = obj.modelicaValueToJSLAB(property.default_value, property.initialization, property) ||
        language.currentString(property.overridden && !property.expression ? "omjsl-8468" : "omjsl-8467");
      value.addEventListener('input', function() {
        var selected = units.find(function(item) {
          return item.symbol == property.display_unit;
        }) || units[0];
        property.display_expression = value.value;
        property.expression = selected ? convertUnitExpression(value.value, selected, units[0], property.dimensions) : value.value;
        property.dirty = true;
        property.reset = false;
      });
      if(units.length) {
        var unit = document.createElement('select');
        unit.setAttribute('aria-label', language.currentString("omjsl-8473"));
        units.forEach(function(item) {
          var option = document.createElement('option');
          option.textContent = item.symbol;
          option.value = item.symbol;
          unit.appendChild(option);
        });
        unit.value = property.display_unit || units[0].symbol;
        var update_unit_placeholder = function() {
          var selected = units.find(function(item) {
            return item.symbol == unit.value;
          });
          var default_expression = obj.modelicaValueToJSLAB(property.default_value, property.initialization, property);
          value.placeholder = default_expression ? convertUnitExpression(default_expression, units[0], selected, property.dimensions) :
            language.currentString(property.overridden && !property.expression ? "omjsl-8468" : "omjsl-8467");
        };
        update_unit_placeholder();
        unit.addEventListener('change', function() {
          property.display_unit = unit.value;
          var selected = units.find(function(item) {
            return item.symbol == unit.value;
          });
          property.display_expression = convertUnitExpression(property.expression, units[0], selected, property.dimensions);
          value.value = property.display_expression;
          update_unit_placeholder();
        });
        type.replaceChildren(unit);
      }
      var value_control = value;
      var choices = propertyChoices(property);
      if(choices.length) {
        value_control = document.createElement('div');
        value_control.className = 'simulate-property-value';
        var choice_input = document.createElement('select');
        choice_input.className = 'simulate-property-choice';
        var default_choice = propertyChoice(property, property.default_value);
        var default_option = document.createElement('option');
        default_option.value = '';
        default_option.textContent = language.currentString("omjsl-8467") +
          (default_choice ? ' (' + obj.propertyChoiceLabel(property, default_choice) + ')' : '');
        choice_input.appendChild(default_option);
        choices.forEach(function(choice) {
          var option = document.createElement('option');
          option.value = choice;
          option.textContent = obj.propertyChoiceLabel(property, choice);
          choice_input.appendChild(option);
        });
        var expression_option = document.createElement('option');
        expression_option.value = '__expression__';
        expression_option.textContent = language.currentString("omjsl-8459");
        choice_input.appendChild(expression_option);
        if(property.choice_mode === undefined) {
          property.choice_mode = property.binding ? '__expression__' :
            property.overridden ? propertyChoice(property, property.value) || '__expression__' : '';
        }
        choice_input.value = property.choice_mode;
        value.hidden = property.choice_mode != '__expression__';
        choice_input.addEventListener('change', function() {
          property.choice_mode = choice_input.value;
          if(property.choice_mode == '__expression__') {
            var prior_choice = property.enum_value || propertyChoice(property, property.value) || default_choice;
            if(!property.expression && prior_choice) {
              property.expression = property.type == 'Boolean' ? prior_choice : JSON.stringify(prior_choice);
            }
            delete property.display_expression;
            property.enum_value = null;
            property.reset = false;
          } else {
            property.enum_value = property.choice_mode;
            property.expression = '';
            delete property.display_expression;
            property.reset = !property.choice_mode;
            property.dirty = true;
          }
          obj.renderComponentProperties();
        });
        value_control.append(choice_input, value);
      }
      var reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'simulate-property-reset';
      reset.title = language.currentString("omjsl-8464");
      reset.textContent = '\u21ba';
      reset.addEventListener('click', function() {
        property.expression = '';
        property.display_expression = '';
        property.choice_mode = '';
        property.enum_value = null;
        property.reset = true;
        property.overridden = false;
        if(property.record_schema) {
          obj.property_draft.forEach(function(child) {
            if(!child.name.startsWith(property.name + '.')) {
              return;
            }
            child.expression = '';
            child.display_expression = '';
            child.choice_mode = '';
            child.enum_value = null;
            child.reset = true;
            child.overridden = false;
          });
        }
        obj.renderComponentProperties();
      });
      if(property.record_schema && !property.dimensions.length && !property.initialization) {
        var fields = document.createElement('button');
        fields.type = 'button';
        fields.className = 'simulate-property-fields';
        fields.textContent = language.currentString("omjsl-8480");
        fields.setAttribute('aria-expanded', String(!!property.fields_open));
        fields.addEventListener('click', function() {
          property.fields_open = !property.fields_open;
          obj.renderComponentProperties();
        });
        var controls = document.createElement('div');
        controls.className = 'simulate-property-value';
        controls.append(value_control, fields);
        value_control = controls;
      }
      var blocked = !!property.final;
      var ancestor = property.record_parent;
      while(ancestor) {
        if(!ancestor.reset && (ancestor.expression.trim() || ancestor.modifier && ancestor.modifier.assignment)) {
          blocked = true;
        }
        ancestor = ancestor.record_parent;
      }
      if(blocked) {
        value_control.querySelectorAll('input, select').forEach(function(control) {
          control.disabled = true;
        });
        if(value_control.matches('input, select')) {
          value_control.disabled = true;
        }
        reset.disabled = true;
        if(!property.final) {
          value_control.title = language.currentString("omjsl-8481");
        }
      }
      row.append(name, type, value_control, reset);
      container.appendChild(row);
    });
  }

  /**
   * Add typed record fields while keeping one binding path per editable leaf.
   */
  async expandRecordProperties(properties, component, explicit, parent = null, ancestry = []) {
    var obj = this;
    var result = [];
    for(const property of properties) {
      property.dimensions = property.dimensions || [];
      property.record_parent = parent;
      property.record_depth = parent ? parent.record_depth + 1 : 0;
      result.push(property);
      var schema = await obj.compiler.recordSchema(property.type);
      if(obj.property_component !== component) {
        return [];
      }
      if(!schema) {
        continue;
      }
      property.value_schema = schema;
      if(!property.binding && property.modifier && property.modifier.assignment) {
        property.expression = obj.modelicaValueToJSLAB(property.modifier.value, property.initialization, property);
        property.initial_expression = property.expression;
      }
      if(property.dimensions.length || property.initialization || ancestry.includes(property.type)) {
        continue;
      }
      property.record_schema = schema;
      property.fields_open = false;
      var children = schema.properties.map(function(field) {
        var path = property.name + '.' + field.name;
        explicit.delete(path);
        var modifier = componentFieldModifier(component, path);
        var saved = obj.component_bindings.get(obj.componentBindingKey(component.name, path));
        var expression = saved || obj.modelicaValueToJSLAB(modifier && modifier.value, false, field);
        return Object.assign({}, field, { name: path, display_name: field.name,
          final: !!(field.final || property.final || modifier && modifier.final),
          default_value: '',
          value: modifier ? modifier.value : field.default_value, overridden: !!modifier,
          modifier: modifier, binding: saved || '', expression: expression, initial_expression: expression,
          dirty: false, reset: false, raw: modifier ? !modifier.assignment : false });
      });
      result.push.apply(result, await obj.expandRecordProperties(children, component, explicit, property, ancestry.concat(property.type)));
    }
    return result;
  }

  /**
   * Loads the selected block schema and opens its translated properties dialog.
   */
  async showComponentProperties(component) {
    var obj = this;
    if(!component || obj.busy) {
      return;
    }
    obj.closeSimulateDialogs('component');
    obj.property_component = component;
    document.getElementById('simulate-component-apply').disabled = !!component.inherited;
    obj.property_schema = null;
    obj.property_draft = [];
    obj.property_advanced = false;
    document.getElementById('simulate-properties-basic').classList.add('active');
    document.getElementById('simulate-properties-advanced').classList.remove('active');
    document.getElementById('simulate-property-search').value = '';
    document.getElementById('simulate-component-title').textContent = component.name;
    document.getElementById('simulate-component-summary').replaceChildren();
    document.getElementById('simulate-component-dialog').hidden = false;
    obj.renderComponentProperties();
    try {
      var schema = await obj.compiler.componentSchema({
        source: obj.editor.getValue(), type: component.type, model_name: obj.model && obj.model.name
      });
      if(obj.property_component !== component) {
        return;
      }
      obj.property_schema = schema;
      var explicit = new Map((component.modifiers || []).map(function(item) {
        return [item.name, item];
      }));
      obj.property_draft = (schema.properties || []).map(function(property, index) {
        var modifier = explicit.get(property.name);
        explicit.delete(property.name);
        var binding_name = property.initialization ? property.name + '.start' : property.name;
        var saved = obj.component_bindings.get(obj.componentBindingKey(component.name, binding_name));
        var start_modifier = property.initialization ? componentFieldModifier(component, property.name + '.start') : null;
        var expression = saved || obj.modelicaValueToJSLAB(start_modifier ? start_modifier.value : modifier && modifier.value, property.initialization, property);
        return Object.assign({}, property, {
          final: !!(component.inherited || property.final || modifier && modifier.final),
          root_index: index,
          value: modifier ? modifier.value : property.default_value,
          overridden: !!modifier,
          modifier: modifier || null,
          binding: saved || '', expression: expression, initial_expression: expression,
          dirty: false, reset: false, raw: modifier ? !modifier.assignment : false
        });
      });
      obj.property_draft = await obj.expandRecordProperties(obj.property_draft, component, explicit);
      if(obj.property_component !== component) {
        return;
      }
      explicit.forEach(function(modifier) {
        var saved = obj.component_bindings.get(obj.componentBindingKey(component.name, modifier.name));
        var expression = saved || obj.modelicaValueToJSLAB(modifier.value, !modifier.assignment);
        obj.property_draft.push({ name: modifier.name, type: '', description: '', dimensions: [],
          final: !!(component.inherited || modifier.final),
          default_value: '', value: modifier.value, overridden: true, modifier: modifier,
          binding: saved || '', expression: expression, initial_expression: expression,
          dirty: false, reset: false,
          raw: !modifier.assignment });
      });
      var summary = document.getElementById('simulate-component-summary');
      var name_input = document.createElement('input');
      name_input.id = 'simulate-component-name';
      name_input.value = component.name;
      name_input.disabled = !!component.inherited;
      name_input.setAttribute('aria-label', language.currentString("omjsl-8448"));
      var type = document.createElement('strong');
      type.textContent = obj.simulateTypeLabel(component.type);
      summary.append(name_input, type);
      if(schema.description) {
        summary.append(document.createTextNode(' — ' +
        obj.simulateClassDescription(component.type, schema.description)));
      }
      obj.renderComponentProperties();
    } catch(error) {
      if(obj.property_component !== component) {
        return;
      }
      obj.property_schema = { properties: [] };
      obj.setOutput(obj.simpleCompilerError(error), true);
      obj.renderComponentProperties();
    }
  }

  /**
   * Creates source edits for changed block property modifiers.
   */
  componentSourcePatches(component, changes) {
    return componentModifierPatches(component, changes.map(function(change) {
      if(!change.initialization) {
        return change;
      }
      var value = /^\(\s*start\s*=\s*([\s\S]*)\)$/.exec(change.value || '');
      return Object.assign({}, change, { name: change.name + '.start', nested: false,
        value: value ? value[1].trim() : change.value });
    }));
  }

  /**
   * Applies source edits in reverse order to preserve their offsets.
   */
  applySourcePatches(source, patches) {
    patches.sort(function(a, b) {
      return b.start - a.start || b.end - a.end;
    }).forEach(function(patch) {
      source = source.slice(0, patch.start) + patch.value + source.slice(patch.end);
    });
    return source;
  }

  /**
   * Validates and saves the block name, property values and bindings.
   */
  applyComponentProperties() {
    var obj = this;
    if(!obj.property_component || obj.property_component.inherited || !obj.property_schema) {
      return;
    }
    var old_name = obj.property_component.name;
    var name_input = document.getElementById('simulate-component-name');
    var new_name = String(name_input && name_input.value || old_name).trim();
    if(!isModelicaIdentifier(new_name) || obj.model.parameters.some(function(parameter) {
      return parameter.name == new_name;
    }) || obj.model.components.some(function(component) {
      return component !== obj.property_component && component.name == new_name;
    })) {
      obj.setOutput(language.currentString("omjsl-8470"), true);
      return;
    }
    var changes = [];
    obj.property_draft.forEach(function(property) {
      if(property.final) {
        return;
      }
      var binding_name = property.initialization ? property.name + '.start' : property.name;
      var key = obj.componentBindingKey(obj.property_component.name, binding_name);
      if(property.reset) {
        obj.component_bindings.delete(key);
        changes.push({ name: property.name, modifier: property.modifier, remove: true,
          nested: property.initialization, initialization: property.initialization });
      } else if(property.dirty && property.enum_value) {
        obj.component_bindings.delete(key);
        var choice_value = choiceModelicaValue(property, property.enum_value);
        changes.push({ name: property.name, value: property.initialization ? '(start = ' + choice_value + ')' : choice_value,
          modifier: property.modifier, nested: property.initialization, initialization: property.initialization });
      } else if(property.dirty) {
        if(property.expression.trim()) {
          obj.component_bindings.set(key, property.expression.trim());
        } else {
          obj.component_bindings.delete(key);
          changes.push({ name: property.name, modifier: property.modifier, remove: true,
            nested: property.initialization, initialization: property.initialization });
        }
      }
    });
    var source = obj.applySourcePatches(obj.editor.getValue(), obj.componentSourcePatches(obj.property_component, changes));
    if(new_name != old_name) {
      source = obj.replaceModelicaIdentifier(source, old_name, new_name);
      var renamed_bindings = [];
      obj.component_bindings.forEach(function(expression, key) {
        renamed_bindings.push([key.startsWith(old_name + '\u0000') ? new_name + key.slice(old_name.length) : key,
          expression]);
      });
      obj.component_bindings.clear();
      renamed_bindings.forEach(function(entry) {
        obj.component_bindings.set(entry[0], entry[1]);
      });
      if(obj.selected_components.delete(old_name)) {
        obj.selected_components.add(new_name);
      }
    }
    obj.hideComponentProperties();
    obj.editor.setValue(source);
  }

  /**
   * Renames an identifier without changing comments or string literals.
   */
  replaceModelicaIdentifier(source, old_name, new_name) {
    var output = '';
    var index = 0;
    var state = 'code';
    while(index < source.length) {
      var entering_string = false;
      if(state == 'code' && source.slice(index, index + 2) == '//') {
        state = 'line-comment';
      } else if(state == 'code' && source.slice(index, index + 2) == '/*') {
        state = 'block-comment';
      } else if(state == 'code' && source[index] == '"') {
        state = 'string';
        entering_string = true;
      }
      if(state == 'code' && /[A-Za-z_]/.test(source[index])) {
        var end = index + 1;
        while(/[A-Za-z0-9_]/.test(source[end] || '')) {
          end++;
        }
        var token = source.slice(index, end);
        output += token == old_name ? new_name : token;
        index = end;
        continue;
      }
      var character = source[index];
      output += character;
      if(state == 'line-comment' && character == '\n') {
        state = 'code';
      } else if(state == 'block-comment' && source.slice(index - 1, index + 1) == '*/') {
        state = 'code';
      } else if(state == 'string' && !entering_string && character == '"' && source[index - 1] != '\\') {
        state = 'code';
      }
      index++;
    }
    return output;
  }

  /**
   * Opens the simulation settings overlay after closing other dialogs.
   */
  showSimulationSettings() {
    var obj = this;
    obj.closeSimulateDialogs('simulation');
    document.getElementById('simulate-simulation-dialog').hidden = false;
    document.getElementById('simulate-start-time').focus();
  }

  /**
   * Closes the simulation settings overlay.
   */
  hideSimulationSettings() {
    document.getElementById('simulate-simulation-dialog').hidden = true;
  }
}

exports.PRDC_JSLAB_SIMULATE_PROPERTIES = PRDC_JSLAB_SIMULATE_PROPERTIES;
