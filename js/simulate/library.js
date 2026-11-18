/**
 * @file Simulate block library browsing and imports
 * @author Milos Petrasinovic <mpetrasinovic@pr-dc.com>
 * PR-DC, Republic of Serbia
 * info@pr-dc.com
 */

const { PRDC_JSLAB_SIMULATE_COMPILER } = require('./compiler');
const {
  renderBlockIcon,
  readMetadata,
  insertModelComponent,
  translatedLibraryText,
  translatedTypeLabel,
  translatedClassDescription,
  isBundledLibraryType,
  PRDC_OMJSL_CLIENT
} = PRDC_JSLAB_SIMULATE_COMPILER.getLibrary();

/**
 * Implements block library browsing and imports against the owning Simulate window state.
 */
class PRDC_JSLAB_SIMULATE_LIBRARY {

  /**
   * Connects controls for block library browsing and imports.
   */
  _bindLibraryEvents() {

    var obj = this;
    document.getElementById('simulate-library-open').addEventListener('click', () => obj.showBlockLibrary());

    document.getElementById('simulate-library-close').addEventListener('click', obj.hideBlockLibrary.bind(obj));

    document.getElementById('simulate-library-dialog').addEventListener('click', function(event) {
      if(event.target === this) {
        obj.hideBlockLibrary();
      }
    });

    document.getElementById('simulate-library-entry-cancel').addEventListener('click', function() {
      obj.clearLibraryImport();
      obj.renderBlockLibrary();
    });

    document.getElementById('simulate-library-entry-import').addEventListener('click', function() {
      if(obj.pending_library_import) {
        obj.importLibraryFiles(obj.pending_library_import,
          document.getElementById('simulate-library-entry').value);
      }
    });

    document.getElementById('simulate-library-search').addEventListener('input', function() {
      obj.library_revision++;
      obj.renderBlockLibrary();
    });

    document.getElementById('simulate-library-import-file').addEventListener('click', function() {
      document.getElementById('simulate-library-file').click();
    });

    document.getElementById('simulate-library-import-folder').addEventListener('click', function() {
      document.getElementById('simulate-library-folder').click();
    });

    ['file', 'folder'].forEach(function(kind) {
      document.getElementById('simulate-library-' + kind).addEventListener('change', async function() {
        await obj.importProjectLibrary(Array.from(this.files), kind == 'folder');
        this.value = '';
      });
    });

  }

  /**
   * Opens the block browser and retains an optional diagram insertion position.
   * @param {Object} [point] Model coordinates chosen from the diagram context menu.
   */
  showBlockLibrary(point) {
    if(this.busy) {
      return;
    }
    this.closeSimulateDialogs();
    this._library_insert_point = point || null;
    document.getElementById('simulate-library-dialog').hidden = false;
    this.renderBlockLibrary();
    if(this.project_libraries.length) {
      this.loadImportedLibraryIndex();
    }
    document.getElementById('simulate-library-search').focus();
  }

  /**
   * Renders the package hierarchy independently of the available block cards.
   */
  renderLibraryCategories() {
    var obj = this;
    var tree = document.getElementById('simulate-library-categories');
    var scroll = tree.scrollTop;
    var focused_type = tree.contains(document.activeElement) ? document.activeElement.dataset.libraryType : undefined;
    tree.replaceChildren();
    obj._library_expanded = obj._library_expanded || new Set(['Modelica']);
    var selected = obj.library_classes ? obj.library_parent : '';
    var catalog = readMetadata('library-catalog.json').classes;
    var definitions = obj.insertableLibraryClasses();
    var imported = new Map(obj.imported_library_classes.map(item => [item.type, item]));
    var categories = new Map();
    definitions.forEach(function(item) {
      for(var parent = item.type; parent.includes('.');) {
        parent = parent.slice(0, parent.lastIndexOf('.'));
        if(!categories.has(parent)) {
          categories.set(parent, imported.get(parent) || catalog[parent] || { type: parent, description: '', restriction: 'package' });
        }
      }
    });
    var children = new Map();
    categories.forEach(function(item) {
      var parent = item.type.includes('.') ? item.type.slice(0, item.type.lastIndexOf('.')) : '';
      if(!categories.has(parent)) {
        parent = '';
      }
      if(!children.has(parent)) {
        children.set(parent, []);
      }
      children.get(parent).push(item);
    });
    var recommended = document.createElement('button');
    recommended.type = 'button';
    recommended.dataset.libraryType = '';
    recommended.className = 'simulate-library-category' + (!selected ? ' selected' : '');
    recommended.textContent = language.currentString(682);
    recommended.setAttribute('role', 'treeitem');
    recommended.setAttribute('aria-selected', String(!selected));
    recommended.addEventListener('click', function() {
      obj.browseLibrary('');
    });
    tree.appendChild(recommended);
    var append = function(parent, depth) {
      (children.get(parent) || []).sort((a, b) => obj.simulateTypeLabel(a.type).localeCompare(obj.simulateTypeLabel(b.type)))
        .forEach(function(item) {
          var row = document.createElement('div');
          row.className = 'simulate-library-category-row';
          row.style.paddingLeft = depth * 12 + 'px';
          var toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'simulate-library-category-toggle';
          toggle.textContent = obj._library_expanded.has(item.type) ? '\u25be' : '\u25b8';
          toggle.setAttribute('aria-label', obj.simulateTypeLabel(item.type));
          toggle.disabled = !children.has(item.type);
          toggle.addEventListener('click', function() {
            if(!obj._library_expanded.delete(item.type)) {
              obj._library_expanded.add(item.type);
            }
            obj.renderLibraryCategories();
          });
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'simulate-library-category' + (item.type == selected ? ' selected' : '');
          button.dataset.libraryType = item.type;
          button.setAttribute('role', 'treeitem');
          button.setAttribute('aria-level', String(depth + 1));
          button.setAttribute('aria-selected', String(item.type == selected));
          if(children.has(item.type)) {
            button.setAttribute('aria-expanded', String(obj._library_expanded.has(item.type)));
          }
          button.textContent = item.type == 'Modelica' ? language.currentString(690) : obj.simulateTypeLabel(item.type);
          button.title = obj.simulateClassDescription(item.type, item.description);
          button.addEventListener('click', () => obj.browseLibrary(item.type));
          row.append(toggle, button);
          tree.appendChild(row);
          if(obj._library_expanded.has(item.type)) {
            append(item.type, depth + 1);
          }
        });
    };
    append('', 0);
    tree.scrollTop = scroll;
    if(focused_type !== undefined) {
      Array.from(tree.querySelectorAll('[data-library-type]')).find(button => button.dataset.libraryType == focused_type)?.focus({ preventScroll: true });
    }
    tree.onkeydown = function(event) {
      var buttons = Array.from(tree.querySelectorAll('.simulate-library-category'));
      var index = buttons.indexOf(document.activeElement);
      var type = document.activeElement.dataset.libraryType;
      if(event.key == 'ArrowDown' || event.key == 'ArrowUp') {
        event.preventDefault();
        buttons[Math.max(0, Math.min(buttons.length - 1, index + (event.key == 'ArrowDown' ? 1 : -1)))].focus();
      } else if(type && (event.key == 'ArrowRight' || event.key == 'ArrowLeft')) {
        event.preventDefault();
        if(event.key == 'ArrowRight') {
          obj._library_expanded.add(type);
        } else {
          obj._library_expanded.delete(type);
        }
        obj.renderLibraryCategories();
        Array.from(tree.querySelectorAll('[data-library-type]')).find(button => button.dataset.libraryType == type)?.focus();
      }
    };
  }

  /**
   * Returns public concrete blocks and models, excluding standard-library implementation classes.
   * @returns {Object[]} Definitions that can be inserted into the diagram.
   */
  insertableLibraryClasses() {
    if(!this._library_blocks) {
      this._library_blocks = Object.values(readMetadata('library-catalog.json').classes).filter(item =>
        !item.partial && ['model', 'block'].includes(item.restriction));
    }
    return this._library_blocks.concat(this.imported_library_classes.filter(item =>
      !item.partial && ['model', 'block'].includes(item.restriction)));
  }

  /**
   * Displays the full category path with links to each ancestor.
   * @param {boolean} searching Whether the cards show global search results.
   */
  renderLibraryPath(searching) {
    var obj = this;
    var heading = document.getElementById('simulate-library-category-name');
    heading.replaceChildren();
    var path = [{ type: '', label: language.currentString(681) }];
    if(searching) {
      path.push({ type: null, label: language.currentString(692) });
    } else if(obj.library_classes && obj.library_parent) {
      var parts = obj.library_parent.split('.');
      parts.forEach(function(part, index) {
        var type = parts.slice(0, index + 1).join('.');
        path.push({ type: type, label: type == 'Modelica' ? language.currentString(690) : obj.simulateTypeLabel(type) });
      });
    } else {
      path[0].label = language.currentString(682);
    }
    path.forEach(function(item, index) {
      if(index) {
        var separator = document.createElement('span');
        separator.textContent = '\u203a';
        separator.setAttribute('aria-hidden', 'true');
        heading.appendChild(separator);
      }
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label;
      button.dataset.categoryPath = item.type || '';
      if(index == path.length - 1) {
        button.setAttribute('aria-current', 'page');
        button.disabled = true;
      } else {
        button.addEventListener('click', () => obj.browseLibrary(item.type));
      }
      heading.appendChild(button);
    });
  }

  /**
   * Load compiler graphics once per type.
   */
  loadComponentGraphics(type) {
    var obj = this;
    if(obj.component_graphics.has(type)) {
      return Promise.resolve(obj.component_graphics.get(type));
    }
    if(obj.component_graphics_pending.has(type)) {
      return obj.component_graphics_pending.get(type);
    }
    var pending = obj.compiler.componentGraphics(type).then(function(metadata) {
      if(obj.component_graphics_pending.get(type) === pending) {
        obj.component_graphics.set(type, metadata);
      }
      return metadata;
    }).finally(function() {
      if(obj.component_graphics_pending.get(type) === pending) {
        obj.component_graphics_pending.delete(type);
      }
    });
    obj.component_graphics_pending.set(type, pending);
    return pending;
  }

  /**
   * Return a readable label without exposing solver namespaces.
   */
  simulateString(id) {
    return translatedLibraryText(id, language.lang) || language.currentString(id);
  }

  /**
   * Returns the translated type name while preserving imported library names.
   */
  simulateTypeLabel(type, standard_context = false) {
    return translatedTypeLabel(type, language.lang, standard_context);
  }

  /**
   * Translate pinned standard-library descriptions while preserving external text.
   */
  simulateClassDescription(type, source) {
    return translatedClassDescription(type, source, language.lang);
  }

  /**
   * Displays the current library folder or filtered block search results.
   */
  renderBlockLibrary(limit = 150) {
    var obj = this;
    obj.renderLibraryCategories();
    var container = document.getElementById('simulate-library-items');
    container.replaceChildren();
    var query = document.getElementById('simulate-library-search').value.trim().toLowerCase();
    var visible_classes = obj.library_classes;
    obj.renderLibraryPath(!!query);
    if(query) {
      var all_classes = obj.insertableLibraryClasses();
      var exact = all_classes.filter(function(item) {
        return item.type.split('.').pop().toLowerCase() == query;
      });
      visible_classes = exact.length ? exact : all_classes.filter(function(item) {
        return (obj.simulateTypeLabel(item.type) + ' ' + item.type + ' ' + item.description + ' ' +
          obj.simulateClassDescription(item.type, item.description)).toLowerCase().includes(query);
      });
    }
    if(visible_classes) {
      visible_classes = visible_classes.filter(item => !item.partial && ['model', 'block'].includes(item.restriction));
      if(!visible_classes.length) {
        container.textContent = language.currentString(693);
      }
      visible_classes.slice(0, limit).forEach(function(item) {
        var label = item.standard ? obj.simulateTypeLabel(item.type) : item.type.split('.').pop();
        var button = document.createElement('button');
        button.type = 'button';
        button.dataset.libraryType = item.type;
        button.textContent = label;
        button.title = obj.simulateClassDescription(item.type, item.description);
        button.disabled = item.partial && !item.package;
        button.addEventListener('click', function() {
          obj.addLibraryBlock([item.type, 0, []]);
        });
        container.appendChild(button);
        if(!item.package) {
          obj.loadComponentGraphics(item.type).then(function(metadata) {
            if(!button.isConnected) {
              return;
            }
            var svg = obj.svgElement('svg', { viewBox: '-14 -14 28 28', width: 48, height: 48 });
            renderBlockIcon(svg, { type: item.type, name: '', modifiers: [], language: language.lang }, 20, 20, metadata);
            // Abstract interfaces can intentionally contain no drawing primitives.
            if(!item.partial || svg.querySelector('path, rect, circle, ellipse, polygon, polyline, line, text, image')) {
              button.prepend(svg);
            }
          }).catch(function(error) {
            button.title = obj.simpleCompilerError(error);
          });
        }
      });
      if(visible_classes.length > limit) {
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'simulate-library-more';
        more.textContent = language.currentString(632).replace('{count}', visible_classes.length - limit);
        more.addEventListener('click', function() {
          var scroll = container.scrollTop;
          obj.renderBlockLibrary(limit + 150);
          container.scrollTop = scroll;
        });
        container.appendChild(more);
      }
      return;
    }
    obj.project_libraries.forEach(function(library) {
      (library.roots || []).forEach(function(root) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = root;
        var definition = obj.imported_library_classes.find(function(item) {
          return item.type == root;
        });
        if(!definition || definition.package || definition.restriction == 'package') {
          return;
        }
        button.disabled = definition.partial;
        button.dataset.libraryType = root;
        button.addEventListener('click', function() {
          if(definition.package) {
            obj.browseLibrary(root);
          } else if(!definition.partial && ['model', 'block'].includes(definition.restriction)) {
            obj.addLibraryBlock([root, 0, []]);
          }
        });
        container.appendChild(button);
      });
    });
    obj.block_catalog.forEach(function(item) {
      var label = obj.simulateTypeLabel(item[0]);
      if(query && !(label + ' ' + item[0].split('.').pop()).toLowerCase().includes(query)) {
        return;
      }
      var button = document.createElement('button');
      button.type = 'button';
      var svg = obj.svgElement('svg', { viewBox: '-14 -14 28 28', width: 48, height: 48 });
      obj.drawComponentIcon(svg, { type: item[0] }, 20, 20);
      var text = document.createElement('span');
      text.textContent = label;
      button.append(svg, text);
      button.addEventListener('click', function() {
        obj.addLibraryBlock(item);
      });
      container.appendChild(button);
    });
  }

  /**
   * Refresh imported class metadata without translating it or querying on each keystroke.
   */
  loadImportedLibraryIndex() {
    var obj = this;
    if(obj.imported_library_index) {
      return obj.imported_library_index;
    }
    var revision = obj.imported_library_revision;
    obj.imported_library_index = obj.compiler.importedClasses().then(function(classes) {
      if(revision != obj.imported_library_revision) {
        return;
      }
      obj.imported_library_classes = classes.filter(function(item) {
        return item.package || !item.partial && ['model', 'block'].includes(item.restriction);
      });
      if(!document.getElementById('simulate-library-dialog').hidden) {
        obj.renderBlockLibrary();
      }
    }).catch(function(error) {
      if(revision != obj.imported_library_revision) {
        return;
      }
      obj.imported_library_index = null;
      obj.setOutput(obj.simpleCompilerError(error), true);
    });
    return obj.imported_library_index;
  }

  /**
   * Invalidates imported class metadata after the project libraries change.
   */
  resetImportedLibraryIndex() {
    var obj = this;
    obj.imported_library_revision++;
    obj.imported_library_classes = [];
    obj.imported_library_index = null;
    for(const type of obj.component_graphics.keys()) {
      if(!isBundledLibraryType(type)) {
        obj.component_graphics.delete(type);
      }
    }
    for(const type of obj.component_graphics_pending.keys()) {
      if(!isBundledLibraryType(type)) {
        obj.component_graphics_pending.delete(type);
      }
    }
  }

  /**
   * Browse compiler-owned packages without restricting the available block types.
   */
  async browseLibrary(parent) {
    var obj = this;
    var revision = ++obj.library_revision;
    if(!parent) {
      obj.library_parent = '';
      obj.library_classes = null;
      document.getElementById('simulate-library-search').value = '';
      obj.renderBlockLibrary();
      return;
    }
    obj._library_expanded = obj._library_expanded || new Set();
    for(var type = parent; type; type = type.includes('.') ? type.slice(0, type.lastIndexOf('.')) : '') {
      obj._library_expanded.add(type);
    }
    var container = document.getElementById('simulate-library-items');
    container.textContent = language.currentString("omjsl-8463");
    try {
      await obj.compiler.libraryClasses(parent);
      if(revision != obj.library_revision) {
        return;
      }
      obj.library_parent = parent;
      obj.library_classes = obj.insertableLibraryClasses().filter(item => item.type.startsWith(parent + '.'));
      document.getElementById('simulate-library-search').value = '';
      obj.renderBlockLibrary();
      var tree = document.getElementById('simulate-library-categories');
      var selected = tree.querySelector('[aria-selected="true"]');
      if(selected) {
        var bounds = selected.getBoundingClientRect();
        var viewport = tree.getBoundingClientRect();
        if(bounds.top < viewport.top) {
          tree.scrollTop += bounds.top - viewport.top;
        } else if(bounds.bottom > viewport.bottom) {
          tree.scrollTop += bounds.bottom - viewport.bottom;
        }
      }
    } catch(error) {
      if(revision == obj.library_revision) {
        container.textContent = obj.simpleCompilerError(error);
      }
    }
  }

  /**
   * Import sources and resources together and retain them in the portable project.
   */
  async importProjectLibrary(selected_files, folder) {
    var obj = this;
    if(obj.busy || !selected_files.length) {
      return;
    }
    obj.clearLibraryImport();
    var revision = obj.library_import_revision;
    var container = document.getElementById('simulate-library-items');
    container.textContent = language.currentString("omjsl-8463");
    var files = [];
    var choices;
    obj.setBusy(true);
    try {
      for(const file of selected_files) {
        var relative = folder ? file.webkitRelativePath.split('/').slice(1).join('/') : file.name;
        files.push({ path: relative, data: Buffer.from(await file.arrayBuffer()).toString('base64') });
      }
      if(revision != obj.library_import_revision) {
        return;
      }
      choices = PRDC_OMJSL_CLIENT.libraryEntries(files);
      if(!choices.entries.length) {
        throw new Error(language.currentString("omjsl-8479"));
      }
    } catch(error) {
      if(revision == obj.library_import_revision) {
        container.textContent = obj.simpleCompilerError(error);
      }
      return;
    } finally {
      obj.setBusy(false);
    }
    if(revision != obj.library_import_revision) {
      return;
    }
    if(choices.preferred) {
      return obj.importLibraryFiles(files, choices.preferred);
    }
    obj.pending_library_import = files;
    var select = document.getElementById('simulate-library-entry');
    choices.entries.forEach(function(entry) {
      var option = document.createElement('option');
      option.value = entry;
      option.textContent = entry;
      select.appendChild(option);
    });
    container.hidden = true;
    document.getElementById('simulate-library-entry-choice').hidden = false;
    select.focus();
  }

  /**
   * Imports the selected source entry while keeping every accompanying resource.
   * @param {Object[]} files Portable source and resource records.
   * @param {string} entry Relative source filename chosen by the user.
   */
  async importLibraryFiles(files, entry) {
    var obj = this;
    if(obj.busy || !PRDC_OMJSL_CLIENT.libraryEntries(files).entries.includes(entry)) {
      return;
    }
    obj.clearLibraryImport();
    var container = document.getElementById('simulate-library-items');
    container.textContent = language.currentString("omjsl-8463");
    obj.setBusy(true);
    try {
      var library = { id: 'library_' + Date.now(), entry: entry, files: files, roots: [] };
      library.roots = await obj.compiler.importLibrary({ id: library.id, entry: entry,
        files: files.map(function(file) {
          return { path: file.path,
            data: new Uint8Array(Buffer.from(file.data, 'base64')) };
        }) });
      obj.project_libraries = PRDC_OMJSL_CLIENT.updatedLibraries(obj.project_libraries, library);
      obj.compiler.setLibraries(obj.project_libraries);
      obj.resetImportedLibraryIndex();
      await obj.loadImportedLibraryIndex();
      obj.library_classes = null;
      obj.library_parent = '';
      obj.renderBlockLibrary();
      obj.renderDiagram();
    } catch(error) {
      container.textContent = obj.simpleCompilerError(error);
    } finally {
      obj.setBusy(false);
    }
  }

  /**
   * Releases unconfirmed source files when the entry picker is canceled or closed.
   */
  clearLibraryImport() {
    var obj = this;
    obj.library_import_revision++;
    obj.pending_library_import = null;
    document.getElementById('simulate-library-entry-choice').hidden = true;
    document.getElementById('simulate-library-entry').replaceChildren();
    document.getElementById('simulate-library-items').hidden = false;
  }

  /**
   * Closes the library overlay and discards any unconfirmed import selection.
   */
  hideBlockLibrary() {
    this.library_revision++;
    this.clearLibraryImport();
    this._library_insert_point = null;
    document.getElementById('simulate-library-dialog').hidden = true;
  }

  /**
   * Finds nearby free space for a toolbar insertion without moving existing blocks or wires.
   * @param {Object} point Preferred diagram coordinates, with downward-positive y.
   * @param {string} type Selected block type.
   * @returns {Object} Free diagram coordinates.
   */
  _freeBlockPosition(point, type) {
    var obj = this;
    var half_width = Math.max(16, type.split('.').pop().length * .9 + 3);
    var half_height = 16;
    var obstacles = [];
    for(const node of obj.diagram_nodes.values()) {
      var bounds = node.visual_bounds;
      obstacles.push({ left: node.component.placement.x + bounds.left,
        right: node.component.placement.x + bounds.right,
        top: -node.component.placement.y + bounds.top,
        bottom: -node.component.placement.y + bounds.bottom });
      if(node.label_bounds) {
        obstacles.push(node.label_bounds);
      }
    }
    var wires = [];
    (obj.model.connections || []).forEach(function(connection) {
      var from = obj.portPosition(connection.from), to = obj.portPosition(connection.to);
      if(from && to) {
        wires.push(obj.connectionWirePoints(connection, from, to));
      }
    });
    var step = Math.ceil(Math.max(32, half_width * 2 + 6) / 2) * 2;
    var reach = Math.max(step, ...obstacles.flatMap(box => [Math.abs(box.left - point.x),
      Math.abs(box.right - point.x), Math.abs(box.top - point.y), Math.abs(box.bottom - point.y)]),
      ...wires.flatMap(points => points.flatMap(value => [Math.abs(value.x - point.x), Math.abs(value.y - point.y)])));
    var limit = Math.ceil((reach + half_width + half_height) / step) + 1;
    for(var radius = 0; radius <= limit; radius++) {
      for(var row = -radius; row <= radius; row++) {
        for(var column = -radius; column <= radius; column++) {
          if(Math.max(Math.abs(row), Math.abs(column)) !== radius) {
            continue;
          }
          var candidate = { x: Math.round((point.x + column * step) / 2) * 2,
            y: Math.round((point.y + row * step) / 2) * 2 };
          var box = { left: candidate.x - half_width, right: candidate.x + half_width,
            top: candidate.y - half_height, bottom: candidate.y + half_height };
          if(obstacles.some(obstacle => obj.boxesOverlap(box, obstacle, 2))) {
            continue;
          }
          if(wires.some(points => points.some((value, index) => index &&
            obj.segmentIntersectsBox(points[index - 1], value, box, 2)))) {
            continue;
          }
          return candidate;
        }
      }
    }
    return { x: point.x + (limit + 1) * step, y: point.y };
  }

  /**
   * Inserts the selected library block with its connector and placement metadata.
   */
  addLibraryBlock(item) {
    var obj = this;
    if(!obj.model || obj.busy) {
      return;
    }
    var viewport = document.getElementById('simulate-diagram-svg').getBoundingClientRect();
    var point = obj._library_insert_point || obj._freeBlockPosition({
      x: (viewport.width / 2 - obj.diagram_view.x) / obj.diagram_view.scale,
      y: (viewport.height / 2 - obj.diagram_view.y) / obj.diagram_view.scale
    }, item[0]);
    var edit = insertModelComponent(obj.editor.getValue(), obj.model, item[0], [point.x, -point.y]);
    if(!edit) {
      return;
    }
    obj.editor.setValue(edit.source);
    obj.hideBlockLibrary();
  }
}

exports.PRDC_JSLAB_SIMULATE_LIBRARY = PRDC_JSLAB_SIMULATE_LIBRARY;
