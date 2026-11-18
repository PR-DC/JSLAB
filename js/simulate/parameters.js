/**
 * @file Simulate model parameter editing
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_DOM } = require('../other-shared/dom');

const { PRDC_JSLAB_SIMULATE_COMPILER } = require('./compiler');
const {
  isModelicaIdentifier
} = PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();

/**
 * Implements model parameter editing against the owning Simulate window state.
 */
class PRDC_JSLAB_SIMULATE_PARAMETERS {

  /**
   * Connects controls for model parameter editing.
   */
  _bindParametersEvents() {

    var obj = this;
    document.getElementById('simulate-parameters-menu').addEventListener('click', obj.showParameters.bind(obj));

    document.getElementById('simulate-parameters-close').addEventListener('click', obj.hideParameters.bind(obj));

    document.getElementById('simulate-parameters-cancel').addEventListener('click', obj.hideParameters.bind(obj));

    document.getElementById('simulate-parameters-apply').addEventListener('click', obj.applyParameters.bind(obj));

    document.getElementById('simulate-parameter-add').addEventListener('click', obj.addParameter.bind(obj));

    document.getElementById('simulate-parameters-dialog').addEventListener('click', function(event) {
      if(event.target === this) {
        obj.hideParameters();
      }
    });
  }

  /**
   * Displays editable project parameters and their workspace bindings.
   */
  renderParameters() {
    var obj = this;
    var container = document.getElementById('simulate-parameters');
    container.replaceChildren();
    var head = document.createElement('div');
    head.className = 'simulate-parameter simulate-parameter-head';
    PRDC_JSLAB_DOM.appendLabels(head, ["omjsl-8448", "omjsl-8449", "omjsl-8450", "omjsl-8454"], language);
    head.appendChild(document.createElement('span'));
    container.appendChild(head);
    obj.parameter_draft.forEach(function(parameter, index) {
      var row = document.createElement('div');
      row.className = 'simulate-parameter';
      ['name', 'type', 'value', 'description'].forEach(function(field) {
        var input = document.createElement(field == 'type' ? 'select' : 'input');
        if(field == 'type') {
          var choices = obj.parameter_types.slice();
          if(!choices.some(function(item) {
            return item[0] == parameter.type;
          })) {
            choices.push([parameter.type]);
          }
          choices.forEach(function(item) {
            var option = document.createElement('option');
            option.value = item[0];
            option.textContent = obj.simulateTypeLabel(item[0]);
            input.appendChild(option);
          });
        }
        input.value = parameter[field] || '';
        input.disabled = !!parameter.inherited;
        if(field == 'value' && !parameter.added) {
          input.placeholder = language.currentString("omjsl-8467");
        }
        input.dataset.field = field;
        input.setAttribute('aria-label', language.currentString(field == 'name' ? "omjsl-8448" :
          field == 'type' ? "omjsl-8449" : field == 'value' ? "omjsl-8450" : "omjsl-8454"));
        input.addEventListener('input', function() {
          parameter[field] = input.value;
        });
        row.appendChild(input);
      });
      var remove = document.createElement('button');
      remove.type = 'button';
      remove.disabled = !!parameter.inherited;
      remove.className = 'simulate-parameter-remove';
      remove.title = language.currentString("omjsl-8451");
      remove.textContent = '\u00d7';
      remove.addEventListener('click', function() {
        obj.parameter_draft.splice(index, 1);
        obj.renderParameters();
      });
      row.appendChild(remove);
      container.appendChild(row);
    });
  }

  /**
   * Opens the project parameter dialog after closing other overlays.
   */
  showParameters() {
    var obj = this;
    obj.closeSimulateDialogs('parameters');
    obj.parameter_draft = obj.model ? obj.model.parameters.map(obj._parameterDraft.bind(obj)) : [];
    obj.renderParameters();
    document.getElementById('simulate-parameters-dialog').hidden = false;
    var input = document.querySelector('#simulate-parameters input');
    if(input) {
      input.focus();
    }
  }

  /**
   * Closes the project parameter dialog.
   */
  hideParameters() {
    document.getElementById('simulate-parameters-dialog').hidden = true;
  }

  /**
   * Validates parameter definitions and applies their source and binding changes.
   */
  applyParameters() {
    var obj = this;
    if(!obj.model) {
      return obj.hideParameters();
    }
    var invalid = obj.parameter_draft.find(function(parameter) {
      return !parameter.inherited && (!isModelicaIdentifier(parameter.name) || !parameter.type.trim() ||
        !parameter.value.trim() && (parameter.added || String(parameter.original_expression || '').trim() !== parameter.value.trim()));
    });
    if(invalid) {
      obj.setOutput(language.currentString("omjsl-8452"), true);
      return;
    }
    var names = new Set(obj.model.components.filter(component => !component.parameter).map(function(component) {
      return component.name;
    }));
    if(obj.parameter_draft.some(function(parameter) {
      if(names.has(parameter.name)) {
        return true;
      }
      names.add(parameter.name);
      return false;
    })) {
      obj.setOutput(language.currentString("omjsl-8453"), true);
      return;
    }
    var source = obj.editor.getValue();
    var renames = [];
    var clauses = new Map();
    obj.model.parameters.map(function(parameter, index) {
      return { parameter: parameter, draft: obj.parameter_draft.find(function(item) {
        return item.original_index === index;
      }) };
    }).sort(function(a, b) {
      return b.parameter.source_start - a.parameter.source_start;
    }).forEach(function(item) {
      if(item.parameter.inherited) {
        return;
      }
      var replacement = '';
      var declaration_start = item.parameter.declaration_start == null ? item.parameter.source_start : item.parameter.declaration_start;
      if(item.draft) {
        var has_binding = obj.parameter_bindings.has(item.parameter.name);
        obj.parameter_bindings.delete(item.parameter.name);
        if(item.draft.value.trim() && (has_binding || item.draft.value.trim() !== String(item.draft.original_expression || '').trim())) {
          obj.parameter_bindings.set(item.draft.name, item.draft.value.trim());
        }
        replacement = item.parameter.declaration;
        if(item.draft.name !== item.parameter.name) {
          renames.push([item.parameter.name, item.draft.name.trim()]);
        }
        if(item.draft.description !== item.parameter.description) {
          var escaped_description = String(item.draft.description || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          var description_range = item.parameter.description_range;
          var old_description = description_range ? replacement.slice(description_range.start - declaration_start,
            description_range.end - declaration_start) : item.parameter.description ? '"' + item.parameter.description + '"' : '';
          var description_index = old_description ? replacement.lastIndexOf(old_description) : -1;
          if(description_index >= 0) {
            replacement = replacement.slice(0, description_index) +
              (escaped_description ? '"' + escaped_description + '"' : '') +
              replacement.slice(description_index + old_description.length);
          } else if(escaped_description) {
            var annotation_index = replacement.search(/\s+annotation\s*\(/i);
            var insert_description = annotation_index >= 0 ? annotation_index : replacement.lastIndexOf(';');
            replacement = replacement.slice(0, insert_description) + ' "' + escaped_description + '"' +
              replacement.slice(insert_description);
          }
        }
        if(item.draft.type !== item.parameter.type) {
          var type_index = replacement.indexOf(item.parameter.type);
          if(type_index >= 0) {
            replacement = replacement.slice(0, type_index) + item.draft.type.trim() +
            replacement.slice(type_index + item.parameter.type.length);
          }
        }
      } else {
        obj.parameter_bindings.delete(item.parameter.name);
      }
      var key = item.parameter.source_start;
      if(!clauses.has(key)) {
        clauses.set(key, { start: key, end: item.parameter.source_end, declarations: [] });
      }
      if(replacement) {
        clauses.get(key).declarations.push(replacement);
      }
    });
    source = obj.applySourcePatches(source, Array.from(clauses.values()).map(function(clause) {
      return { start: clause.start, end: clause.end, value: clause.declarations.join('\n') };
    }));
    var added = obj.parameter_draft.filter(function(parameter) {
      return parameter.added;
    });
    if(added.length) {
      var insertion = source.indexOf('\n') + 1;
      var declarations = added.map(function(parameter) {
        var description = String(parameter.description || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        obj.parameter_bindings.set(parameter.name.trim(), parameter.value.trim());
        var default_value = /^Boolean\b/.test(parameter.type.trim()) ? 'false' :
          /^String\b/.test(parameter.type.trim()) ? '""' : '0';
        return '  parameter ' + parameter.type.trim() + ' ' + parameter.name.trim() + ' = ' +
          default_value + (description ? ' "' + description + '"' : '') + ';\n';
      }).join('');
      source = source.slice(0, insertion) + declarations + source.slice(insertion);
    }
    renames.forEach(function(rename) {
      source = obj.replaceModelicaIdentifier(source, rename[0], rename[1]);
    });
    obj.editor.setValue(source);
    obj.hideParameters();
  }

  /**
   * Adds an editable parameter draft with a unique name.
   */
  addParameter() {
    var obj = this;
    var index = 1;
    var names = new Set(obj.parameter_draft.map(function(parameter) {
      return parameter.name;
    }));
    while(names.has('parameter' + index)) {
      index++;
    }
    obj.parameter_draft.push({ name: 'parameter' + index, type: 'Real', value: '0', description: '', added: true });
    obj.renderParameters();
    var inputs = document.querySelectorAll('#simulate-parameters input[data-field="name"]');
    if(inputs.length) {
      inputs[inputs.length - 1].focus();
    }
  }

  /**
   * Builds a parameter draft preserving workspace expressions and source positions.
   * @param {Object} parameter Parsed parameter.
   * @param {number} index Source index.
   * @returns {Object} Editable draft.
   */
  _parameterDraft(parameter, index) {
    var expression = this.parameter_bindings.get(parameter.name) || this.modelicaValueToJSLAB(parameter.value, false, parameter);
    return Object.assign({}, parameter, { original_index: index, added: false,
      value: expression, original_expression: expression });
  }

}

exports.PRDC_JSLAB_SIMULATE_PARAMETERS = PRDC_JSLAB_SIMULATE_PARAMETERS;
