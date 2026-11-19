/**
 * @file Simulate compiler execution, output and results
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_TEXT } = require('../other-shared/text');
const { PRDC_JSLAB_SIMULATE_COMPILER } = require('./compiler');
const {
  parameterValuePatches,
  translatedLibraryText,
  resolvedChoiceValue,
  resolvePropertyValue,
  localizedValueError,
  PRDC_OMJSL_DIAGNOSTICS,
  readMetadata
} = PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();
const choice_labels = readMetadata('choice-labels.json');

/**
 * Implements compiler execution, output and results against the owning Simulate window state.
 */
class PRDC_JSLAB_SIMULATE_COMPILATION {

  /**
   * Connects controls for compiler execution, output and results.
   */
  _bindCompilationEvents() {

    var obj = this;
    document.getElementById('simulate-check').addEventListener('click', function() {
      obj.runCompiler('check');
    });

    document.getElementById('simulate-build').addEventListener('click', function() {
      obj.runCompiler('build');
    });

    document.getElementById('simulate-simulate').addEventListener('click', function() {
      if(obj.busy) {
        obj.cancelCompiler();
      } else {
        obj.runCompiler('simulate');
      }
    });

    document.getElementById('simulate-animation').addEventListener('click', function() {
      obj.openAnimation().catch(error => obj.appendOutput(obj.simpleCompilerError(error), true));
    });

    document.getElementById('simulate-output-clear').addEventListener('click', function() {
      obj.setOutput('');
    });

    document.getElementById('simulate-output-toggle').addEventListener('click', function() {
      obj.setConsoleExpanded(document.getElementById('simulate-console').classList.contains('collapsed'));
    });
  }

  /**
   * Expands or collapses the Messages panel.
   */
  setConsoleExpanded(expanded) {
    document.getElementById('simulate-console').classList.toggle('collapsed', !expanded);
  }

  /**
   * Replaces the Messages contents with a timestamped diagnostic.
   */
  setOutput(text, error) {
    var obj = this;
    obj.output.replaceChildren();
    if(text) {
      obj.appendOutput(text, error);
    }
    obj.output.scrollTop = obj.output.scrollHeight;
  }

  /**
   * Appends a timestamped message and reveals the latest output.
   */
  appendOutput(text, error) {
    var obj = this;
    var message = document.createElement('div');
    message.className = 'simulate-output-message' + (error ? ' error' : '');
    var timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = PRDC_JSLAB_TEXT.getTimestamp();
    var content = document.createElement('span');
    content.className = 'simulate-output-text';
    content.textContent = String(text || '');
    message.append(timestamp, content);
    obj.output.appendChild(message);
    obj.output.scrollTop = obj.output.scrollHeight;
    if(error) {
      obj.setConsoleExpanded(true);
      var dialog = document.querySelector('.simulate-dialog:not([hidden])');
      if(dialog) {
        obj.showDialogError(dialog, text);
      }
    }
    return message;
  }

  /**
   * Displays an accessible failure inside its owning dialog without discarding edits.
   * @param {HTMLElement} dialog Active operation dialog.
   * @param {string} text Diagnostic text already translated by its owner.
   */
  showDialogError(dialog, text) {
    var message = dialog.querySelector('.simulate-dialog-error');
    if(!message) {
      message = document.createElement('div');
      message.className = 'simulate-dialog-error';
      message.setAttribute('role', 'alert');
      message.tabIndex = -1;
      dialog.querySelector('.simulate-dialog-header').after(message);
    }
    message.textContent = String(text || '');
    message.hidden = false;
    message.focus({ preventScroll: true });
  }

  /**
   * Clears stale dialog failures when an operation is reopened or corrected.
   * @param {HTMLElement} dialog Owning operation dialog.
   */
  clearDialogError(dialog) {
    var message = dialog.querySelector('.simulate-dialog-error');
    if(message) {
      message.remove();
    }
  }

  /**
   * Formats compiler diagnostics with localized severity and source positions.
   */
  diagnosticOutput(response) {
    var diagnostics = response && Array.isArray(response.diagnostics) ? response.diagnostics : [];
    return PRDC_OMJSL_DIAGNOSTICS.format(diagnostics, language.lang);
  }

  /**
   * Converts a compiler failure to a concise message for the user.
   */
  simpleCompilerError(error) {
    return PRDC_OMJSL_DIAGNOSTICS.error(error, language.lang);
  }

  /**
   * Refreshes the visible operation status and elapsed time.
   */
  renderCompilerStatus() {
    var obj = this;
    var text = obj.compiler_status_text;
    if(text && obj.compiler_activity_started) {
      var seconds = Math.max(0, Math.floor((Date.now() - obj.compiler_activity_started) / 1000));
      text += ' · ' + seconds + ' s';
    }
    obj.compiler_status.textContent = text;
    obj.compiler_status.classList.toggle('active', !!text);
  }

  /**
   * Displays translated solver progress and appends changed operation messages.
   */
  setCompilerStatus(text) {
    var obj = this;
    var has_progress = false;
    var status_key = typeof text == 'object' && text ? 'id:' + text.id : 'text:' + String(text || '');
    if(text && typeof text == 'object' && text.id) {
      var status = text;
      var translated = translatedLibraryText(status.id, language.lang);
      text = translated.replace('{file}', status.file || '')
        .replace('{loaded}', status.loaded || '').replace('{total}', status.total || '');
      if(Number.isFinite(Number(status.progress))) {
        if(!['omjsl-12', 'omjsl-14', 'omjsl-17'].includes(status.id)) {
          obj.compiler_progress.value = Math.max(0, Math.min(100, Number(status.progress)));
          obj.compiler_progress.hidden = false;
          has_progress = true;
        }
      }
    }
    if(!has_progress) {
      obj.compiler_progress.hidden = true;
    }
    text = String(text || '');
    if(obj.compiler_activity_started && text) {
      if(status_key != obj.compiler_status_key || !obj.compiler_status_message) {
        obj.compiler_status_message = obj.appendOutput(text, false);
        obj.compiler_status_key = status_key;
      } else {
        obj.compiler_status_message.querySelector('.simulate-output-text').textContent = text;
      }
    }
    obj.compiler_status_text = text;
    obj.renderCompilerStatus();
  }

  /**
   * Starts the elapsed-time display for a compiler operation.
   */
  startCompilerActivity(action) {
    var obj = this;
    obj.stopCompilerActivity();
    obj.compiler_status_key = '';
    obj.compiler_status_message = null;
    obj.compiler_activity_started = Date.now();
    obj.setCompilerStatus({ id: action == 'simulate' ? 'omjsl-8' : 'omjsl-9' });
    obj.compiler_activity_timer = setInterval(obj.renderCompilerStatus.bind(obj), 1000);
  }

  /**
   * Stops the operation timer and clears its progress state.
   */
  stopCompilerActivity() {
    var obj = this;
    if(obj.compiler_activity_timer) {
      clearInterval(obj.compiler_activity_timer);
    }
    obj.compiler_activity_timer = null;
    obj.compiler_activity_started = 0;
    obj.setCompilerStatus('');
  }

  /**
   * Updates input and action controls while a request is running.
   */
  setBusy(state) {
    var obj = this;
    obj.busy = !!state;
    document.querySelectorAll('#simulate-menu li').forEach(function(item) {
      var disabled = (obj.busy && item.id != 'simulate-simulate') ||
        (!obj.busy && item.id == 'simulate-animation' && !obj.animation_available);
      item.classList.toggle('disabled', disabled);
      item.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    });
    var simulate = document.getElementById('simulate-simulate');
    simulate.classList.toggle('running', obj.busy);
    simulate.querySelector('img').src = obj.busy ? '../img/debug-stop.svg' : '../img/run.svg';
    simulate.querySelector('str').textContent = language.currentString(obj.busy ? 654 : "omjsl-8419");
    simulate.title = language.currentString(obj.busy ? 654 : "omjsl-8419");
  }

  /**
   * Interrupts the active compiler request and restores the window controls.
   */
  cancelCompiler() {
    var obj = this;
    if(!obj.busy) {
      return;
    }
    if(obj.compiler_request) obj.compiler_request.cancelled = true;
    var error = new Error(language.currentString(675));
    obj.compiler.close(error);
    obj.compiler_ready = null;
  }

  /**
   * Publishes the completed simulation data to the persistent workspace.
   */
  async publishResult() {
    const { host } = this.platform;
    var obj = this;
    if(!obj.result) {
      return;
    }
    const published = await host.invoke('JSLAB_SIMULATE_RESULT', {
      file_name: obj.projectFileName(),
      model_name: obj.model ? obj.model.name : '',
      result: obj.result,
      components: obj.model ? obj.model.components : [],
      connections: obj.model ? obj.model.connections : [],
      visualization: obj.visualization
    });
    if(!published) throw new Error(language.currentString('omjsl-19'));
    obj.setBusy(obj.busy);
  }

  /**
   * Checks that simulation results contain the mechanism coordinates.
   */
  hasAnimationData(value) {
    return !!(value && value.scene && /<shape>/.test(value.scene.xml || ''));
  }

  /**
   * Opens the mechanism animation with the current simulation results.
   * @param {Object} [options] Playback settings.
   * @returns {Promise<number|false|undefined>} Figure ID when the host opens the animation.
   */
  async openAnimation(options) {
    const { host } = this.platform;
    var obj = this;
    if(!obj.result || !obj.animation_available || obj.busy) {
      return;
    }
    return host.invoke('JSLAB_SIMULATE_ANIMATION', {
      file_name: obj.projectFileName(),
      model_name: obj.model ? obj.model.name : '',
      components: obj.model ? obj.model.components : [],
      connections: obj.model ? obj.model.connections : [],
      visualization: obj.visualization,
      options
    });
  }

  /**
   * Resolves workspace expressions and translates values for compilation.
   */
  async resolvedCompilerSource() {
    const { host } = this.platform;
    var obj = this;
    var source = obj.editor.getValue();
    if(!obj.component_bindings.size && !obj.parameter_bindings.size) {
      return source;
    }
    var parsed = await host.invoke('JSLAB_SIMULATE_PARSE', source);
    if(!parsed || !parsed.success) {
      throw new Error(parsed && parsed.error || 'Invalid model.');
    } /* lang-fixed */
    var patches = [];
    for(const [name, expression] of obj.parameter_bindings) {
      var parameter = (parsed.model.parameters || []).find(function(item) {
        return item.name == name;
      });
      if(!parameter) {
        continue;
      }
      var parameter_response = obj.automation_parameter_values.has(name) ?
        { success: true, js_value: obj.automation_parameter_values.get(name) } :
        await host.invoke('JSLAB_SIMULATE_RESOLVE', expression);
      if(!parameter_response || !parameter_response.success) {
        throw new Error(language.currentString("omjsl-8469")
          .replace('{parameter}', name).replace('{error}',
            parameter_response && (parameter_response.value_code ? localizedValueError(parameter_response, language.lang) :
              parameter_response.error) || 'Unknown error'));
      } /* lang-fixed */
      var parameter_choices = await obj.compiler.typeChoices(parameter.type);
      if(Object.hasOwn(parameter_response, 'js_value')) {
        try {
          parameter_response.value = (await resolvePropertyValue(Object.assign({}, parameter, { choices: parameter_choices }),
            parameter_response.js_value, type => obj.compiler.recordSchema(type), { path: name })).value;
        } catch(error) {
          throw new Error(localizedValueError(error, language.lang));
        }
      } else if(parameter_choices.length) {
        try {
          parameter_response.value = resolvedChoiceValue({ type: parameter.type,
            choices: parameter_choices, dimensions: parameter.dimensions || [] }, parameter_response.value);
        } catch(error) {
          throw new Error(obj.simulateString(choice_labels.invalidValue).replace('{property}', name));
        }
      }
      patches.push.apply(patches, parameterValuePatches(parameter, parameter_response.value));
    }
    var components = new Map((parsed.model.components || []).map(function(component) {
      return [component.name, component];
    }));
    var grouped = new Map();
    var schemas = new Map();
    for(const [key, expression] of obj.component_bindings) {
      var separator = key.indexOf('\u0000');
      var component_name = key.slice(0, separator);
      var property_name = key.slice(separator + 1);
      var initialization = property_name.endsWith('.start');
      var modifier_name = initialization ? property_name.slice(0, -6) : property_name;
      var component = components.get(component_name);
      if(!component) {
        continue;
      }
      var response = await host.invoke('JSLAB_SIMULATE_RESOLVE', expression);
      if(!response || !response.success) {
        throw new Error(language.currentString("omjsl-8466").replace('{block}', component_name)
          .replace('{property}', property_name)
          .replace('{error}', response && (response.value_code ? localizedValueError(response, language.lang) :
            response.error) || 'Unknown error')); /* lang-fixed */
      }
      if(!schemas.has(component.type)) {
        schemas.set(component.type, await obj.compiler.componentSchema({
          source: source, type: component.type, model_name: parsed.model.name }));
      }
      var property_path = modifier_name.split('.');
      var property = (schemas.get(component.type).properties || []).find(function(item) {
        return item.name == property_path[0];
      });
      for(var field_index = 1; property && field_index < property_path.length; field_index++) {
        var record_schema = await obj.compiler.recordSchema(property.type);
        property = record_schema && record_schema.properties.find(function(item) {
          return item.name == property_path[field_index];
        });
      }
      var resolved_nested = false;
      if(Object.hasOwn(response, 'js_value')) {
        try {
          var resolved = await resolvePropertyValue(property || { name: property_name }, response.js_value,
            type => obj.compiler.recordSchema(type), { path: component_name + '.' + property_name, modifier: !initialization });
          response.value = resolved.value;
          resolved_nested = resolved.nested;
        } catch(error) {
          throw new Error(localizedValueError(error, language.lang));
        }
      } else if(property && (property.type == 'Boolean' || property.choices && property.choices.length)) {
        try {
          response.value = resolvedChoiceValue(property, response.value);
        } catch(error) {
          throw new Error(obj.simulateString(choice_labels.invalidValue).replace('{property}', component_name + '.' + property_name));
        }
      }
      if(!grouped.has(component_name)) {
        grouped.set(component_name, []);
      }
      grouped.get(component_name).push({
        name: modifier_name,
        value: initialization ? '(start = ' + response.value + ')' : response.value,
        nested: initialization || resolved_nested,
        initialization: initialization,
        modifier: (component.modifiers || []).find(function(item) {
          return item.name == modifier_name && (initialization || item.assignment);
        }) || null
      });
    }
    grouped.forEach(function(changes, name) {
      patches.push.apply(patches, obj.componentSourcePatches(components.get(name), changes));
    });
    return obj.applySourcePatches(source, patches);
  }

  /**
   * Checks, builds or simulates the model while reporting progress and results.
   */
  async runCompiler(action) {
    var obj = this;
    if(obj.busy) {
      return;
    }
    const job = obj.compiler_request = {};
    const ensureActive = () => {
      if(job.cancelled) throw Error(language.currentString(675));
    };
    obj.setBusy(true);
    obj.setConsoleExpanded(true);
    obj.setOutput('');
    obj.startCompilerActivity(action);
    var outcome = { success: false };
    try {
      if(action != 'check') {
        var start_time = Number(document.getElementById('simulate-start-time').value);
        var stop_time = Number(document.getElementById('simulate-stop-time').value);
        var intervals = Number(document.getElementById('simulate-intervals').value);
        var tolerance = Number(document.getElementById('simulate-tolerance').value);
        if(!Number.isFinite(start_time) || !Number.isFinite(stop_time) || stop_time <= start_time ||
            !Number.isInteger(intervals) || intervals <= 0 || !Number.isFinite(tolerance) || tolerance <= 0) {
          throw new Error(language.currentString("omjsl-8474"));
        }
      }
      var compiler_source = await obj.resolvedCompilerSource();
      ensureActive();
      var request = {
        action: action,
        source: compiler_source,
        file_path: obj.file_path,
        model_name: obj.model && obj.model.name,
        parameters: {},
        options: {
          start_time: document.getElementById('simulate-start-time').value,
          stop_time: document.getElementById('simulate-stop-time').value,
          intervals: document.getElementById('simulate-intervals').value,
          tolerance: document.getElementById('simulate-tolerance').value,
          solver: document.getElementById('simulate-solver').value
        }
      };
      if(!obj.compiler_ready) {
        obj.compiler_ready = obj.compiler.status().then(function() {
          return true;
        });
      }
      await obj.compiler_ready;
      ensureActive();
      var response = await obj.compiler.compile(request);
      ensureActive();
      outcome = response;
      if(response.result) {
        obj.result = response.result;
        obj.animation_available = obj.hasAnimationData(obj.result);
        await obj.publishResult();
        ensureActive();
        var time = obj.result.data && obj.result.data.time ? obj.result.data.time :
          (obj.result.rows || []).map(function(row) {
            return Number(row[0]);
          });
        var summary = language.currentString(676)
          .replace('{model}', obj.projectFileName())
          .replace('{samples}', String(time.length || 0))
          .replace('{variables}', String(obj.result.columns ? obj.result.columns.length : 0));
        obj.appendOutput(summary, false);
      } else {
        var messages = obj.diagnosticOutput(response);
        if(!messages && response.success) {
          messages = translatedLibraryText(action == 'check' ? "omjsl-24" : "omjsl-18", language.lang);
        }
        if(!messages) {
          messages = obj.simpleCompilerError(response.error || response.stdout || translatedLibraryText("omjsl-19", language.lang));
        }
        obj.appendOutput(messages, !response.success);
      }
    } catch(error) {
      obj.appendOutput(obj.simpleCompilerError(error), true);
      outcome = { success: false, error: obj.simpleCompilerError(error) };
    } finally {
      obj.compiler_request = null;
      obj.stopCompilerActivity();
      obj.setBusy(false);
    }
    return outcome;
  }
}

exports.PRDC_JSLAB_SIMULATE_COMPILATION = PRDC_JSLAB_SIMULATE_COMPILATION;
