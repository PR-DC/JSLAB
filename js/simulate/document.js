/**
 * @file Simulate project opening, saving and parsing
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */


/**
 * Implements project opening, saving and parsing against the owning Simulate window state.
 */
class PRDC_JSLAB_SIMULATE_DOCUMENT {

  /**
   * Connects controls for project opening, saving and parsing.
   */
  _bindDocumentEvents() {

    var obj = this;
    document.getElementById('simulate-new').addEventListener('click', function() {
      if(obj.busy) {
        return;
      }
      obj.closeSimulateDialogs('');
      obj.project_libraries = [];
      obj.resetImportedLibraryIndex();
      obj.library_classes = null;
      obj.compiler.close();
      obj.compiler.setLibraries(obj.project_libraries);
      obj.compiler_ready = null;
      obj.suggested_file_path = '';
      obj.setFilePath('');
      obj.result = null;
      obj.animation_available = false;
      obj.selected_components.clear();
      obj.selected_connection = '';
      obj.component_bindings.clear();
      obj.parameter_bindings.clear();
      obj.visualization = {};
      obj.diagram_fitted = false;
      obj.editor.setValue('model ModelName\nequation\nend ModelName;\n');
      obj.editor.clearHistory();
    });

    document.getElementById('simulate-open').addEventListener('click', function() {
      obj.openModel();
    });

    document.getElementById('simulate-save').addEventListener('click', function() {
      obj.saveModel(false);
    });

    obj.editor.on('change', obj.scheduleParse.bind(obj));
  }

  /**
   * Updates the current project path and the displayed filename.
   */
  setFilePath(value) {
    var obj = this;
    obj.file_path = value || '';
    if(obj.model) {
      obj.renderTree();
    }
  }

  /**
   * Returns the current project filename without exposing its internal class name.
   */
  projectFileName() {
    const { path } = this.platform;
    var obj = this;
    return obj.file_path ? path.basename(obj.file_path) :
      (obj.suggested_file_path ? path.basename(obj.suggested_file_path) : 'Untitled.jslmo'); /* lang-fixed */
  }

  /**
   * Parses the current source and refreshes model controls and graphics.
   */
  async parseModel() {
    const { host } = this.platform;
    var obj = this;
    var revision = ++obj.parse_revision;
    var source = obj.editor.getValue();
    var parsed = await host.invoke('JSLAB_SIMULATE_PARSE', source);
    if(parsed.success && parsed.model.inheritance && parsed.model.inheritance.length) {
      try {
        var bases = await obj.compiler.modelSources({ source: source, type: parsed.model.name });
        var components = new Map(), parameters = new Map(), connections = new Map();
        for(const base of bases) {
          var inherited = await host.invoke('JSLAB_SIMULATE_PARSE', base.source);
          if(!inherited.success) {
            throw new Error(inherited.error);
          }
          var declarations = new Map(base.components.map(item => [item.name, item]));
          inherited.model.components.forEach(function(item) {
            components.set(item.name, Object.assign({}, item, { inherited: true, owner: base.type,
              type: declarations.get(item.name)?.type || item.type }));
          });
          inherited.model.parameters.forEach(item => parameters.set(item.name,
            Object.assign({}, item, { inherited: true, owner: base.type,
              type: declarations.get(item.name)?.type || item.type,
              value: declarations.get(item.name)?.value || item.value })));
          inherited.model.connections.forEach(item => connections.set(obj.connectionKey(item),
            Object.assign({}, item, { inherited: true, owner: base.type })));
        }
        parsed.model.components.forEach(item => { components.set(item.name, item); parameters.delete(item.name); });
        parsed.model.parameters.forEach(item => parameters.set(item.name, item));
        parsed.model.connections.forEach(item => connections.set(obj.connectionKey(item), item));
        parsed.model.components = Array.from(components.values());
        parsed.model.parameters = Array.from(parameters.values());
        parsed.model.connections = Array.from(connections.values());
      } catch(error) {
        parsed = { success: false, error: obj.simpleCompilerError(error) };
      }
    }
    if(revision !== obj.parse_revision || source !== obj.editor.getValue()) {
      return;
    }
    if(parsed.success) {
      obj.loadComponentBindings(obj.editor.getValue());
      obj.model = parsed.model;
      obj.output.classList.remove('error');
      if(document.getElementById('simulate-parameters-dialog').hidden) {
        obj.parameter_draft = obj.model.parameters.map(obj._parameterDraft.bind(obj));
      }
      obj.renderTree();
      obj.renderParameters();
      obj.renderDiagram();
    } else {
      obj.model = null;
      obj.setOutput(parsed.error, true);
    }
  }

  /**
   * Schedules parsing after source edits and discards superseded requests.
   */
  scheduleParse() {
    var obj = this;
    obj.result = null;
    obj.animation_available = false;
    obj.setBusy(obj.busy);
    clearTimeout(obj.parse_timer);
    obj.parse_timer = setTimeout(obj.parseModel.bind(obj), 250);
  }

  /**
   * Loads a project or imports a Modelica file and restores its settings.
   */
  async openModel(file) {
    const { host } = this.platform;
    var obj = this;
    obj.closeSimulateDialogs('');
    var response = await host.invoke('JSLAB_SIMULATE_OPEN', file || '');
    if(!response || response.canceled) {
      return false;
    }
    if(response.error) {
      obj.setOutput(response.error, true);
      return false;
    }
    obj.suggested_file_path = response.suggested_file_path || '';
    obj.project_libraries = Array.isArray(response.libraries) ? response.libraries : [];
    obj.resetImportedLibraryIndex();
    obj.compiler.close();
    obj.compiler.setLibraries(obj.project_libraries);
    obj.compiler_ready = null;
    obj.setFilePath(response.file_path);
    obj.result = null;
    obj.animation_available = false;
    obj.selected_components.clear();
    obj.selected_connection = '';
    obj.component_bindings.clear();
    (Array.isArray(response.component_bindings) ? response.component_bindings : []).forEach(function(entry) {
      obj.component_bindings.set(entry[0], entry[1]);
    });
    obj.parameter_bindings.clear();
    (Array.isArray(response.parameter_bindings) ? response.parameter_bindings : []).forEach(function(entry) {
      obj.parameter_bindings.set(entry[0], entry[1]);
    });
    if(!obj.component_bindings.size) {
      obj.loadComponentBindings(response.source);
    }
    obj.visualization = response.visualization && typeof response.visualization == 'object' ?
      response.visualization : {};
    var simulation = response.simulation || {};
    if(simulation.start_time != null) {
      document.getElementById('simulate-start-time').value = simulation.start_time;
    }
    if(simulation.stop_time != null) {
      document.getElementById('simulate-stop-time').value = simulation.stop_time;
    }
    if(simulation.intervals != null) {
      document.getElementById('simulate-intervals').value = simulation.intervals;
    }
    if(simulation.tolerance != null) {
      document.getElementById('simulate-tolerance').value = simulation.tolerance;
    }
    if(simulation.solver) {
      document.getElementById('simulate-solver').value = simulation.solver;
    }
    obj.diagram_fitted = false;
    obj.editor.setValue(response.source);
    obj.editor.clearHistory();
    clearTimeout(obj.parse_timer);
    await obj.parseModel();
    obj.showDiagram();
    return true;
  }

  /**
   * Saves the project source, workspace bindings and imported libraries.
   */
  async saveModel(save_as) {
    const { host } = this.platform;
    var obj = this;
    var response = await host.invoke('JSLAB_SIMULATE_SAVE', {
      file_path: save_as ? '' : obj.file_path,
      suggested_file_path: obj.suggested_file_path,
      libraries: obj.project_libraries,
      source: obj.editor.getValue(),
      component_bindings: Array.from(obj.component_bindings),
      parameter_bindings: Array.from(obj.parameter_bindings),
      visualization: obj.visualization,
      simulation: {
        start_time: document.getElementById('simulate-start-time').value,
        stop_time: document.getElementById('simulate-stop-time').value,
        intervals: document.getElementById('simulate-intervals').value,
        tolerance: document.getElementById('simulate-tolerance').value,
        solver: document.getElementById('simulate-solver').value
      }
    });
    if(response && !response.canceled) {
      obj.suggested_file_path = response.file_path;
      obj.setFilePath(response.file_path);
    }
    return response;
  }
}

exports.PRDC_JSLAB_SIMULATE_DOCUMENT = PRDC_JSLAB_SIMULATE_DOCUMENT;
