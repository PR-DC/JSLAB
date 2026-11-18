/**
 * @file OpenModelica WebAssembly worker client
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const {
  workerURL,
  decodeLibraryFile
} = require('./host-electron');
const {
  readMetadata
} = require('./assets');
const {
  PRDC_OMJSL_DIAGNOSTICS
} = require('./diagnostics');
var type_choices = null;
/**
 * Class for compiler worker requests and project library ownership.
 */
class PRDC_OMJSL_CLIENT {

  /**
   * Find source entry points without starting the compiler or discarding assets.
   * @param {*} files Files.
   */
  static libraryEntries(files) {
    var entries = Array.from(new Set((files || []).map(function(file) {
      return String(file.path || '');
    }).filter(function(name) {
      return /\.mo$/i.test(name) && !name.startsWith('/') && !/[\\:]/.test(name) && !name.split('/').some(part => !part || part == '.' || part == '..');
    }))).sort();
    return {
      entries: entries,
      preferred: entries.includes('package.mo') ? 'package.mo' : entries.length == 1 ? entries[0] : ''
    };
  }

  /**
   * Replace covered libraries while preserving any unrelated source roots.
   * @param {*} libraries Libraries.
   * @param {*} imported Imported.
   */
  static updatedLibraries(libraries, imported) {
    var roots = imported.roots || [];
    return (libraries || []).filter(function(library) {
      return !library.roots || !library.roots.length || !library.roots.every(function(root) {
        return roots.some(name => root == name || root.startsWith(name + '.'));
      });
    }).concat([imported]);
  }

  /**
   * Initializes the compiler client without starting a worker or downloading the solver.
   * @param {*} app_path App path.
   * @param {*} status_callback Status callback.
   */
  constructor(app_path, status_callback) {
    this.app_path = app_path;
    this.status_callback = status_callback;
    this.worker = null;
    this.next_id = 1;
    this.pending = new Map();
    this.control = null;
    this.progress_timer = null;
    this.progress_phase = 0;
    this.progress_value = -1;
    this.libraries = [];
    this.libraries_loaded = null;
    this.library_index = null;
    this.record_schemas = new Map();
  }

  /**
   * Starts the module worker and connects message, error and progress handlers.
   */
  _start() {
    if(this.worker) {
      return;
    }
    var worker_url = workerURL();
    this.worker = new Worker(worker_url, {
      type: 'module',
      name: 'JSLAB OpenModelica'
    });
    this.worker.addEventListener('message', this._onMessage.bind(this));
    this.worker.addEventListener('error', this._onError.bind(this));
    if(typeof SharedArrayBuffer != 'undefined') {
      this.control = new Int32Array(new SharedArrayBuffer(16));
      Atomics.store(this.control, 1, -1);
      this.worker.postMessage({
        command: 'control',
        buffer: this.control.buffer
      });
      this.progress_timer = setInterval(this._readProgress.bind(this), 200);
    }
  }

  /**
   * Publishes changed compiler progress from the shared control buffer.
   */
  _readProgress() {
    if(!this.control) {
      return;
    }
    var phase = Atomics.load(this.control, 2);
    var permille = Atomics.load(this.control, 1);
    if(!phase || phase == this.progress_phase && permille == this.progress_value) {
      return;
    }
    this.progress_phase = phase;
    this.progress_value = permille;
    var phase_events = {
      1: 'retrieving-resource',
      2: 'parsing',
      3: 'instantiating',
      4: 'compiling',
      5: 'simulating'
    };
    if(typeof this.status_callback == 'function' && phase_events[phase]) {
      var status = {
        event: phase_events[phase]
      };
      if(permille >= 0) {
        status.progress = Math.max(0, Math.min(100, permille / 10));
      }
      this.status_callback(status);
    }
  }

  /**
   * Resolves the matching request or forwards a worker status notification.
   * @param {*} event Event.
   */
  _onMessage(event) {
    var message = event.data || {};
    if(message.type == 'status') {
      if(typeof this.status_callback == 'function') {
        this.status_callback(message.text);
      }
      return;
    }
    var pending = this.pending.get(message.id);
    if(!pending) {
      return;
    }
    this.pending.delete(message.id);
    if(message.success) {
      pending.resolve(message.result);
    } else {
      pending.reject(new Error(message.error || 'Solver failed.'));
    }
  }

  /**
   * Rejects pending requests and releases resources after a worker failure.
   * @param {*} event Event.
   */
  _onError(event) {
    var error = new Error(event.message || 'Solver failed.');
    this.close(error);
  }

  /**
   * Sends a uniquely identified compiler request and tracks its completion.
   * @param {*} command Command.
   * @param {*} data Data.
   */
  request(command, data = {}) {
    try {
      this._start();
    } catch(error) {
      this.close(error);
      return Promise.reject(error);
    }
    var id = this.next_id++;
    if(this.control) {
      Atomics.store(this.control, 0, 0);
      Atomics.store(this.control, 1, -1);
      Atomics.store(this.control, 2, 0);
      Atomics.add(this.control, 3, 1);
      this.progress_phase = 0;
      this.progress_value = -1;
    }
    var client = this;
    return new Promise(function(resolve, reject) {
      client.pending.set(id, {
        resolve: resolve,
        reject: reject
      });
      try {
        client.worker.postMessage(Object.assign({
          id: id,
          command: command
        }, data));
      } catch(error) {
        client.pending.delete(id);
        reject(error);
      }
    });
  }

  /**
   * Publishes a compiler status notification to the owning host.
   */
  status() {
    return this.request('status');
  }

  /**
   * Restores project libraries and submits a check, build or simulation request.
   * @param {*} request Request.
   */
  compile(request) {
    return this._loadLibraries().then(() => this.request('compile', {
      request: request
    })).then(function(response) {
      const diagnostics = PRDC_OMJSL_DIAGNOSTICS.parse(response.stdout || response.error);
      if(diagnostics.length) {
        response.diagnostics = diagnostics;
      }
      return response;
    });
  }

  /**
   * Resolves inherited class sources through the compiler without flattening their diagrams.
   * @param {Object} request Model source and class name.
   */
  modelSources(request) {
    return this._loadLibraries().then(() => this.request('model-sources', { request: request }));
  }

  /**
   * Returns a cached standard-library schema or requests an imported component schema.
   * @param {*} request Request.
   */
  componentSchema(request) {
    var cached = request && readMetadata('component-schema.json')[request.type];
    if(cached) {
      return Promise.resolve(cached);
    }
    return this._loadLibraries().then(() => this.request('component-schema', {
      request: request
    }));
  }

  /**
   * Resolves a record type while preserving inherited property definitions.
   * @param {*} type Declared compiler type.
   */
  recordSchema(type) {
    type = String(type || '').replace(/^\./, '');
    var records = readMetadata('record-schema.json');
    if(Object.hasOwn(records, type)) {
      return Promise.resolve(records[type]);
    }
    if(['Real', 'Integer', 'Boolean', 'String'].includes(type) || readMetadata('component-schema.json')[type]) {
      return Promise.resolve(null);
    }
    if(this.record_schemas.has(type)) {
      return this.record_schemas.get(type);
    }
    var pending = this._loadLibraries().then(() => this.request('component-schema', {
      request: {
        type: type,
        all_fields: true
      }
    }));
    this.record_schemas.set(type, pending);
    pending.catch(() => {
      this.record_schemas.delete(type);
    });
    return pending;
  }

  /**
   * Resolves enumeration choices from built-in metadata or the active compiler.
   * @param {*} type Declared compiler type.
   */
  typeChoices(type) {
    type = String(type || '').replace(/^\./, '');
    if(!type_choices) {
      type_choices = new Map();
      Object.values(readMetadata('component-schema.json')).forEach(function(schema) {
        (schema.properties || []).forEach(function(property) {
          type_choices.set(String(property.type).replace(/^\./, ''), property.choices || []);
        });
      });
    }
    if(type_choices.has(type)) {
      return Promise.resolve(type_choices.get(type));
    }
    if(['Real', 'Integer', 'Boolean', 'String'].includes(type)) {
      return Promise.resolve(type == 'Boolean' ? ['false', 'true'] : []);
    }
    return this._loadLibraries().then(() => this.request('type-choices', {
      request: {
        type: type
      }
    }));
  }

  /**
   * Lists standard-library classes or queries the selected imported package.
   * @param {*} parent Parent.
   * @param {*} recursive Recursive.
   * @param {*} includeRoot IncludeRoot.
   */
  libraryClasses(parent = 'Modelica', recursive = false, includeRoot = false) {
    var classes = readMetadata('library-catalog.json').classes;
    if(Object.hasOwn(classes, parent)) {
      return Promise.resolve(Object.values(classes).filter(function(item) {
        return includeRoot && item.type == parent || (recursive ? item.type.startsWith(parent + '.') : item.type.slice(0, item.type.lastIndexOf('.')) == parent);
      }));
    }
    return this._loadLibraries().then(() => this.request('library-classes', {
      request: {
        parent: parent,
        recursive: recursive,
        include_root: includeRoot
      }
    }));
  }

  /**
   * Lists classes belonging to explicitly imported project libraries.
   */
  importedClasses() {
    if(!this.library_index) {
      this.library_index = (async () => {
        await this._loadLibraries();
        var classes = new Map();
        for(const library of this.libraries) {
          for(const root of library.roots || []) {
            for(const item of await this.libraryClasses(root, true, true)) {
              classes.set(item.type, item);
            }
          }
        }
        return Array.from(classes.values());
      })().catch(error => {
        this.library_index = null;
        throw error;
      });
    }
    return this.library_index;
  }

  /**
   * Returns reviewed standard-library graphics or requests an imported class drawing.
   * @param {*} type Declared compiler type.
   */
  componentGraphics(type) {
    var cached = readMetadata('library-graphics.json')[type];
    if(cached) {
      if(cached.icons.some(function(icon) {
        return icon.annotation.includes('Bitmap(');
      })) {
        return Promise.resolve(Object.assign({}, cached, {
          assets: readMetadata('library-assets.json')
        }));
      }
      return Promise.resolve(cached);
    }
    return this._loadLibraries().then(() => this.request('component-graphics', {
      request: {
        type: type
      }
    })).then(metadata => {
      var assets = {};
      for(const library of this.libraries) {
        var prefix = library.entry.includes('/') ? library.entry.slice(0, library.entry.lastIndexOf('/') + 1) : '';
        for(const file of library.files) {
          var extension = file.path.split('.').pop().toLowerCase();
          var mime = {
            png: 'png',
            jpg: 'jpeg',
            jpeg: 'jpeg',
            gif: 'gif',
            webp: 'webp',
            svg: 'svg+xml',
            bmp: 'bmp'
          }[extension];
          if(!mime || !file.path.startsWith(prefix)) {
            continue;
          }
          for(const root of library.roots || []) {
            assets['modelica://' + root + '/' + file.path.slice(prefix.length)] = 'data:image/' + mime + ';base64,' + file.data;
          }
        }
      }
      return Object.assign({}, metadata, {
        assets: assets
      });
    });
  }

  /**
   * Stores the project library definitions to restore before the next compiler operation.
   * @param {*} libraries Libraries.
   */
  setLibraries(libraries) {
    this.libraries = Array.isArray(libraries) ? libraries : [];
    this.libraries_loaded = null;
    this.library_index = null;
    this.record_schemas.clear();
  }

  /**
   * Restores project imports into the current compiler worker when needed.
   */
  _loadLibraries() {
    if(!this.libraries_loaded) {
      this.libraries_loaded = (async () => {
        for(const library of this.libraries) {
          var roots = await this.importLibrary({
            id: library.id,
            entry: library.entry,
            files: library.files.map(file => ({
              path: file.path,
              data: decodeLibraryFile(file.data)
            }))
          });
          if(!Array.isArray(roots) || !roots.length) {
            throw new Error('The imported library returned no classes.');
          }
          library.roots = roots;
        }
      })().catch(error => {
        this.libraries_loaded = null;
        throw error;
      });
    }
    return this.libraries_loaded;
  }

  /**
   * Imports a source entry and its resource files into the compiler worker.
   * @param {*} request Request.
   */
  importLibrary(request) {
    return this.request('import-library', {
      request: request
    });
  }

  /**
   * Terminates the worker, stops progress polling and rejects unfinished requests.
   * @param {*} error Error.
   */
  close(error) {
    this.libraries_loaded = null;
    if(this.control) {
      Atomics.store(this.control, 0, 1);
    }
    error = error || new Error('Solver stopped.');
    for(const pending of this.pending.values()) {
      pending.reject(error);
    }
    if(this.worker) {
      this.worker.terminate();
    }
    this.worker = null;
    if(this.progress_timer) {
      clearInterval(this.progress_timer);
    }
    this.progress_timer = null;
    this.control = null;
    this.pending.clear();
  }

}
exports.PRDC_OMJSL_CLIENT = PRDC_OMJSL_CLIENT;
