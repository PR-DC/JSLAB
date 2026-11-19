/**
 * @file JSLAB simulate window controller
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SIMULATE_COMPILER } = require('./compiler');
const { PRDC_JSLAB_SIMULATE_LIBRARY } = require('./library');
const { PRDC_JSLAB_SIMULATE_PARAMETERS } = require('./parameters');
const { PRDC_JSLAB_SIMULATE_PROPERTIES } = require('./properties');
const { PRDC_JSLAB_SIMULATE_DIAGRAM } = require('./diagram');
const { PRDC_JSLAB_SIMULATE_WIRES } = require('./wires');
const { PRDC_JSLAB_SIMULATE_INTERACTION } = require('./interaction');
const { PRDC_JSLAB_SIMULATE_CONTEXT_MENU } = require('./context-menu');
const { PRDC_JSLAB_SIMULATE_COMPILATION } = require('./compilation');
const { PRDC_JSLAB_SIMULATE_DOCUMENT } = require('./document');
const { PRDC_JSLAB_UI_CLOSE_DIALOG } = require('../windows/ui');

/**
 * Coordinates the Simulate feature controllers and their shared window state.
 */
class PRDC_JSLAB_WIN_SIMULATE {

  /**
   * Connects feature controllers to the injected host services.
   * @param {Object} platform Desktop or browser service adapter.
   */
  constructor(platform) {
    this.platform = platform;
    this.library = this._attachController(PRDC_JSLAB_SIMULATE_LIBRARY);
    this.parameters = this._attachController(PRDC_JSLAB_SIMULATE_PARAMETERS);
    this.properties = this._attachController(PRDC_JSLAB_SIMULATE_PROPERTIES);
    this.diagram = this._attachController(PRDC_JSLAB_SIMULATE_DIAGRAM);
    this.wires = this._attachController(PRDC_JSLAB_SIMULATE_WIRES);
    this.interaction = this._attachController(PRDC_JSLAB_SIMULATE_INTERACTION);
    this.context_actions = this._attachController(PRDC_JSLAB_SIMULATE_CONTEXT_MENU);
    this.compilation = this._attachController(PRDC_JSLAB_SIMULATE_COMPILATION);
    this.document = this._attachController(PRDC_JSLAB_SIMULATE_DOCUMENT);
  }

  /**
   * Binds a feature controller to this window, following the common submodule pattern.
   * @param {Function} Controller Feature controller class.
   * @returns {Object} Controller facade sharing the owning window's state.
   */
  _attachController(Controller) {
    const controller = new Controller();
    for(const name of Object.getOwnPropertyNames(Controller.prototype)) {
      if(name == 'constructor') {
        continue;
      }
      if(typeof this[name] == 'function') {
        throw new Error('Duplicate Simulate controller method: ' + name);
      }
      const method = controller[name].bind(this);
      controller[name] = method;
      this[name] = method;
    }
    return controller;
  }

  /**
   * Initializes state, connects controls and starts the compiler bridge.
   */
  onReady() {
    this._initializeWindowState();
    this._bindWindowEvents();
    this._bindLibraryEvents();
    this._bindParametersEvents();
    this._bindPropertiesEvents();
    this._bindDiagramEvents();
    this._bindWiresEvents();
    this._bindInteractionEvents();
    this._bindContextMenuEvents();
    this._bindCompilationEvents();
    this._bindDocumentEvents();
    document.querySelectorAll('.simulate-dialog').forEach(dialog => {
      dialog.addEventListener('input', () => this.clearDialogError(dialog));
    });
    this._bindAutomationEvents();
    this.compiler = PRDC_JSLAB_SIMULATE_COMPILER.createClient(app_path, status => this.setCompilerStatus(status));
    this.setCompilerStatus('');
    this.setFilePath('');
    this.saved_project_state = JSON.stringify(this.projectState());
    this.parseModel();
    this.showDiagram();
  }

  /**
   * Connects controls for window state and lifecycle.
   */
  _bindWindowEvents() {
    const { host } = this.platform;
    var obj = this;
    this.close_dialog = new PRDC_JSLAB_UI_CLOSE_DIALOG(document, choice => this.close_answer?.(choice));
    document.getElementById('simulate-menu').addEventListener('click', function(event) {
      if(event.target.closest('li.disabled')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    document.getElementById('win-minimize').addEventListener('click', function() {
      host.send('MainProcess', 'minimize-win');
    });

    document.getElementById('win-restore').addEventListener('click', function() {
      host.send('MainProcess', 'toggle-maximize-win');
    });

    document.getElementById('win-close').addEventListener('click', function() {
      host.send('MainProcess', 'close-simulate');
    });

    window.addEventListener('beforeunload', function() {
      obj.diagram_resize_observer.disconnect();
      if(obj.diagram_resize_frame) {
        cancelAnimationFrame(obj.diagram_resize_frame);
      }
      obj.stopCompilerActivity();
      obj.compiler.close();
    });
  }

  /**
   * Initializes model, compiler and view state before binding controls.
   */
  _initializeWindowState() {
    var obj = this;
    document.getElementById('simulate-icon-style').textContent = PRDC_JSLAB_SIMULATE_COMPILER.getIconStyles();
    obj.file_path = '';
    obj.suggested_file_path = '';
    obj.model = null;
    obj.result = null;
    obj.animation_available = false;
    obj.visualization = {};
    obj.parse_timer = null;
    obj.parse_revision = 0;
    obj.busy = false;
    obj.library_import_revision = 0;
    obj.pending_library_import = null;
    obj.parameter_draft = [];
    obj.component_bindings = new Map();
    obj.parameter_bindings = new Map();
    obj.property_component = null;
    obj.property_schema = null;
    obj.property_draft = [];
    obj.property_advanced = false;
    obj.diagram_view = { x: 0, y: 0, scale: 4 };
    obj.diagram_viewport = null;
    obj.diagram_resize_frame = null;
    obj.diagram_fitted = false;
    obj.diagram_drag = null;
    obj.connection_drag = null;
    obj.wire_drag = null;
    obj.diagram_space_pressed = false;
    obj.selected_components = new Set();
    obj.selected_connection = '';
    obj.diagram_nodes = new Map();
    obj.compiler = null;
    obj.compiler_ready = null;
    obj.automation_request = null;
    obj.compiler_activity_started = 0;
    obj.compiler_activity_timer = null;
    obj.compiler_status_text = '';
    obj.compiler_status_key = '';
    obj.compiler_status_message = null;
    obj.library_parent = '';
    obj.library_classes = null;
    obj.library_revision = 0;
    obj.project_libraries = [];
    obj.imported_library_classes = [];
    obj.imported_library_index = null;
    obj.imported_library_revision = 0;
    obj.component_graphics = new Map();
    obj.component_graphics_pending = new Map();
    obj.block_catalog = [
      ['Modelica.Blocks.Sources.TimeTable', "omjsl-45", ['y']],
      ['Modelica.Mechanics.Rotational.Sources.Position', "omjsl-44", ['phi_ref', 'flange', 'support']],
      ['Modelica.Mechanics.MultiBody.World', "omjsl-36", ['frame_b']],
      ['Modelica.Mechanics.MultiBody.Parts.Fixed', "omjsl-37", ['frame_b']],
      ['Modelica.Mechanics.MultiBody.Parts.Body', "omjsl-38", ['frame_a']],
      ['Modelica.Mechanics.MultiBody.Parts.BodyShape', "omjsl-39", ['frame_a', 'frame_b']],
      ['Modelica.Mechanics.MultiBody.Parts.FixedTranslation', "omjsl-40", ['frame_a', 'frame_b']],
      ['Modelica.Mechanics.MultiBody.Joints.Revolute', "omjsl-41", ['frame_a', 'frame_b', 'axis', 'support']],
      ['Modelica.Mechanics.MultiBody.Joints.Spherical', "omjsl-42", ['frame_a', 'frame_b']],
      ['Modelica.Mechanics.MultiBody.Joints.Assemblies.JointSSR', "omjsl-43",
        ['frame_a', 'frame_b', 'frame_ib', 'axis']]
    ];
    obj.parameter_types = [
      ['Real', "omjsl-28"], ['Integer', "omjsl-29"], ['Boolean', "omjsl-30"], ['String', "omjsl-31"],
      ['Modelica.SIunits.Length', "omjsl-32", 'm'], ['Modelica.SIunits.Mass', "omjsl-33", 'kg'],
      ['Modelica.SIunits.Time', "omjsl-34", 's'], ['Modelica.SIunits.Angle', "omjsl-35", 'rad']
    ];
    obj.model_source = 'model FirstModel\n  parameter Real gain = 1 "Example parameter";\n' +
      '  Real x(start = 1);\nequation\n  der(x) = -gain*x;\n' +
      '  annotation(experiment(StopTime = 5));\nend FirstModel;\n';
    obj.editor_change = null;
    obj.editor = {
      getValue: function() {
        return obj.model_source;
      },
      setValue: function(value) {
        obj.model_source = String(value || '');
        if(obj.editor_change) {
          obj.editor_change();
        }
      },
      lineCount: function() {
        return obj.model_source.split('\n').length;
      },
      getLine: function(line) {
        return obj.model_source.split('\n')[line] || '';
      },
      getRange: function(start, end) {
        return obj.model_source.slice(obj.sourceOffset(start), obj.sourceOffset(end));
      },
      replaceRange: function(value, start, end) {
        var from = obj.sourceOffset(start);
        var to = end == null ? from : obj.sourceOffset(end);
        obj.model_source = obj.model_source.slice(0, from) + String(value || '') + obj.model_source.slice(to);
        if(obj.editor_change) {
          obj.editor_change();
        }
      },
      clearHistory: function() {},
      on: function(event, callback) {
        if(event == 'change') {
          obj.editor_change = callback;
        }
      }
    };
    obj.output = document.getElementById('simulate-output');
    obj.compiler_status = document.getElementById('simulate-compiler-status');
    obj.compiler_progress = document.getElementById('simulate-compiler-progress');
    obj.automation_parameter_values = new Map();
    obj.diagram_svg = document.getElementById('simulate-diagram-svg');
  }

  /**
   * Closes all model overlays except the requested dialog.
   */
  closeSimulateDialogs(except) {
    this.hideContextMenu();
    var obj = this;
    document.querySelectorAll('.simulate-dialog').forEach(dialog => obj.clearDialogError(dialog));
    obj.hideBlockLibrary();
    if(except != 'simulation') {
      document.getElementById('simulate-simulation-dialog').hidden = true;
    }
    if(except != 'parameters') {
      document.getElementById('simulate-parameters-dialog').hidden = true;
    }
    if(except != 'component') {
      document.getElementById('simulate-component-dialog').hidden = true;
      obj.property_component = null;
      obj.property_schema = null;
      obj.property_draft = [];
    }
  }

  /**
   * Connects controls for host messages and scripted simulation requests.
   */
  _bindAutomationEvents() {
    const { host } = this.platform;
    var obj = this;
    host.on('SimulateWindow', function(_event, action, data) {
      if(action === 'set-language') {
        language.set(data);
        obj.setBusy(obj.busy);
        obj.renderTree();
        obj.renderParameters();
        obj.renderDiagram();
        if(!document.getElementById('simulate-library-dialog').hidden) {
          obj.renderBlockLibrary();
        }
        if(obj.property_schema) {
          obj.renderComponentProperties();
        }
      }
      if(action === 'open-file') {
        obj.openModel(data);
      }
      if(action === 'focus') {
        document.getElementById('simulate-diagram-svg').focus();
      }
      if(action === 'automation-cancel' && obj.automation_request?.id === Number(data?.id)) {
        obj.automation_request.cancelled = true;
        if(obj.automation_request.compiling) obj.cancelCompiler();
      }
      if(action === 'automation') {
        if(obj.automation_request || obj.busy) {
          host.send('JSLAB_SIMULATE_AUTOMATION_RESULT', { id: data.id, success: false, error: language.currentString('omjsl-10') });
          return;
        }
        (async function() {
          const request = obj.automation_request = { id: Number(data.id) };
          const ensureActive = () => {
            if(request.cancelled) throw Error(language.currentString(675));
          };
          try {
            var options = data.options || {};
            if(data.filepath && !await obj.openModel(data.filepath)) {
              throw new Error(obj.output.textContent || 'Could not open project.');
            }
            ensureActive();
            Object.entries(options.parameters || {}).forEach(function(entry) {
              obj.parameter_bindings.set(entry[0], obj.valueToJSLABExpression(entry[1]));
            });
            obj.automation_parameter_values = new Map(Object.entries(options.parameters || {}));
            var settings = options.simulation || {};
            if(settings.start_time != null) {
              document.getElementById('simulate-start-time').value = settings.start_time;
            }
            if(settings.stop_time != null) {
              document.getElementById('simulate-stop-time').value = settings.stop_time;
            }
            if(settings.intervals != null) {
              document.getElementById('simulate-intervals').value = settings.intervals;
            }
            if(settings.tolerance != null) {
              document.getElementById('simulate-tolerance').value = settings.tolerance;
            }
            if(settings.solver) {
              document.getElementById('simulate-solver').value = settings.solver;
            }
            var response = { success: true, model: obj.model && obj.model.name };
            if(options.run) {
              request.compiling = true;
              var compiled = await obj.runCompiler('simulate');
              ensureActive();
              if(!compiled || !compiled.success) {
                throw new Error(compiled && compiled.error || obj.output.textContent);
              }
              response.samples = obj.result && obj.result.data && obj.result.data.time ? obj.result.data.time.length : 0;
            }
            if(options.animation) {
              const animation_options = typeof options.animation == 'object' ? options.animation : { loop: true };
              const figure = await obj.openAnimation(animation_options);
              ensureActive();
              if(!figure) throw new Error(language.currentString(677));
            }
            host.send('JSLAB_SIMULATE_AUTOMATION_RESULT', Object.assign({ id: data.id }, response));
          } catch(error) {
            host.send('JSLAB_SIMULATE_AUTOMATION_RESULT', {
              id: data.id, success: false, error: obj.simpleCompilerError(error)
            });
          } finally {
            obj.automation_parameter_values.clear();
            obj.automation_request = null;
          }
        })();
      }
    });
  }
}

exports.PRDC_JSLAB_WIN_SIMULATE = PRDC_JSLAB_WIN_SIMULATE;
