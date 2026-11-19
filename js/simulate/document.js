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
      obj.saved_project_state = JSON.stringify(obj.projectState());
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
    obj.saved_project_state = JSON.stringify(obj.projectState());
    await obj.parseModel();
    obj.showDiagram();
    return true;
  }

  /**
   * Captures the editable fields written to a Simulate project.
   * @returns {Object} Source, libraries, bindings, visualization and simulation options.
   */
  projectState() {
    return {
      libraries: this.project_libraries,
      source: this.editor.getValue(),
      component_bindings: Array.from(this.component_bindings),
      parameter_bindings: Array.from(this.parameter_bindings),
      visualization: this.visualization,
      simulation: {
        start_time: document.getElementById('simulate-start-time').value,
        stop_time: document.getElementById('simulate-stop-time').value,
        intervals: document.getElementById('simulate-intervals').value,
        tolerance: document.getElementById('simulate-tolerance').value,
        solver: document.getElementById('simulate-solver').value
      }
    };
  }

  /**
   * Saves the project and records the contents sent to the host.
   */
  async saveModel(save_as) {
    const state = this.projectState();
    const saved_state = JSON.stringify(state);
    const response = await this.platform.host.invoke('JSLAB_SIMULATE_SAVE', {
      ...state,
      file_path: save_as ? '' : this.file_path,
      suggested_file_path: this.suggested_file_path
    });
    if(response && !response.canceled && !response.error) {
      this.saved_project_state = saved_state;
      this.suggested_file_path = response.file_path;
      this.setFilePath(response.file_path);
    }
    return response;
  }

  /**
   * Checks whether the project differs from its last saved state.
   * @returns {boolean} Whether there are unsaved changes.
   */
  hasUnsavedProjectChanges() {
    return JSON.stringify(this.projectState()) !== this.saved_project_state;
  }

  /**
   * Protects unsaved project changes before closing the window.
   * @returns {Promise<boolean>} Whether the project can be closed.
   */
  async confirmProjectClose() {
    if(!this.hasUnsavedProjectChanges()) return true;
    this.platform.host.send('MainProcess', 'focus-win');
    let choice;
    try {
      choice = await new Promise(resolve => {
        this.close_answer = resolve;
        this.close_dialog.show(this.projectFileName());
      });
    } finally {
      this.close_answer = null;
      this.close_dialog.hide();
    }
    if(choice === 'discard') return true;
    if(choice !== 'save') return false;
    try {
      const response = await this.saveModel(false);
      if(response?.error) this.setOutput(response.error, true);
      return Boolean(response && !response.canceled && !response.error && !this.hasUnsavedProjectChanges());
    } catch(error) {
      this.setOutput(error.message, true);
      return false;
    }
  }
}

exports.PRDC_JSLAB_SIMULATE_DOCUMENT = PRDC_JSLAB_SIMULATE_DOCUMENT;
